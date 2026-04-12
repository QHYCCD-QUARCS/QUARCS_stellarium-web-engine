#!/usr/bin/env node
/**
 * AI-Control 会话模式：先打开一个网页并保持打开，之后通过 stdin 或 HTTP 在该页面上执行命令。
 *
 * 用法：在 apps/web-frontend 下执行
 *   npm run e2e:ai-control:session   （推荐，使用本地 tsx 启动更快）
 * 或
 *   npx tsx scripts/ai-control-session.ts
 *
 * 启动后：
 * - 终端输入命令控制当前页（general-settings、power-management、list、exit 等）。
 * - 同时会启动本地 HTTP 服务（默认端口 39281），AI/MCP 可 POST /run 在同一页上执行命令，
 *   实现「AI 使用对话模式」：先启动本会话，再让 Cursor 调用 ai_control_run_command_on_session。
 *
 * HTTP 接口：
 * - GET /health 或 / : 健康检查
 * - GET /status : 读取当前页面状态（通过 page.evaluate 在页面内读取）
 * - GET /status?command=xxx : 读取状态并规划指定命令的执行步骤
 * - POST /run : 执行命令
 *
 * 环境变量：
 * - E2E_AI_CONTROL_SESSION_NO_KILL_STALE=1：不在启动前尝试结束占用会话端口的旧进程（默认会尝试释放端口）。
 */
import { execFile as execFileCb } from 'node:child_process'
import * as http from 'node:http'
import * as net from 'node:net'
import * as readline from 'node:readline'
import { promisify } from 'node:util'
import { chromium } from '@playwright/test'

const execFile = promisify(execFileCb)

const baseURL = process.env.E2E_BASE_URL || 'http://192.168.1.113:8080'

function resolveSessionPort(): number {
  const raw = process.env.E2E_AI_CONTROL_SESSION_PORT
  if (raw === undefined || raw === '') return 39281
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 0 || n > 65535) return 39281
  return n
}
const SESSION_RUN_TIMEOUT_MS = Number(process.env.E2E_AI_CONTROL_RUN_TIMEOUT_MS) || 60_000
const SESSION_PAGE_INIT_TIMEOUT_MS = Number(process.env.E2E_AI_CONTROL_PAGE_INIT_TIMEOUT_MS) || 15_000
const SESSION_MIN_TEST_TIMEOUT_MS = 5 * 60_000

type CliFlowParams = Record<string, unknown>
type UnifiedLogEntry = {
  sequence?: number | null
  source?: string
  level?: string
  message?: string
  timestamp?: string | null
  deviceType?: string | null
  operationKey?: string | null
  rawMessage?: string | null
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function parseInput(line: string): { commandName: string; flowParams?: CliFlowParams } {
  const t = line.trim()
  const firstSpace = t.indexOf(' ')
  if (firstSpace === -1) return { commandName: t.toLowerCase() }
  const commandName = t.slice(0, firstSpace).trim().toLowerCase()
  const rest = t.slice(firstSpace).trim()
  if (!rest) return { commandName }
  try {
    const flowParams = JSON.parse(rest) as CliFlowParams
    return { commandName, flowParams }
  } catch {
    return { commandName }
  }
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')))
    req.on('error', reject)
  })
}

function sendJson(res: http.ServerResponse, status: number, body: object) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(body))
}

function parsePositiveInt(value: string | null, fallback: number, max: number) {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return fallback
  return Math.min(Math.floor(n), max)
}

function parseCsvParam(value: string | null) {
  if (!value) return []
  return value
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
}

function textMatchesAll(text: string, tokens: string[]) {
  if (tokens.length === 0) return true
  const source = text.toLowerCase()
  return tokens.every((token) => source.includes(token))
}

function logMatchesFilters(
  entry: UnifiedLogEntry,
  filters: {
    sources: string[]
    levels: string[]
    deviceTypes: string[]
    keywords: string[]
    sessionId: string | null
    frameId: string | null
    sinceSeq: number | null
    sinceTs: number | null
  },
) {
  const sequence = Number(entry.sequence)
  const source = String(entry.source ?? '').toLowerCase()
  const level = String(entry.level ?? '').toLowerCase()
  const deviceType = String(entry.deviceType ?? '').toLowerCase()
  const message = String(entry.message ?? '')
  const rawMessage = String(entry.rawMessage ?? '')
  const haystack = `${message}\n${rawMessage}`.toLowerCase()
  const timestampMs = entry.timestamp ? Date.parse(entry.timestamp) : NaN

  if (filters.sinceSeq != null && (!Number.isFinite(sequence) || sequence <= filters.sinceSeq)) return false
  if (filters.sinceTs != null && (!Number.isFinite(timestampMs) || timestampMs <= filters.sinceTs)) return false
  if (filters.sources.length > 0 && !filters.sources.includes(source)) return false
  if (filters.levels.length > 0 && !filters.levels.includes(level)) return false
  if (filters.deviceTypes.length > 0 && !filters.deviceTypes.includes(deviceType)) return false
  if (!textMatchesAll(haystack, filters.keywords)) return false
  if (filters.sessionId && !haystack.includes(filters.sessionId.toLowerCase())) return false
  if (filters.frameId && !haystack.includes(filters.frameId.toLowerCase())) return false
  return true
}

/** 检测本机 host:port 是否已有进程在监听（临时 bind 探测）。 */
function isPortListening(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const s = net.createServer()
    s.once('error', (err: NodeJS.ErrnoException) => {
      s.removeAllListeners()
      if (err.code === 'EADDRINUSE') resolve(true)
      else resolve(false)
    })
    s.once('listening', () => {
      s.close(() => resolve(false))
    })
    s.listen(port, host)
  })
}

async function getPidsListeningOnPort(port: number): Promise<number[]> {
  const dedupe = (pids: number[]) =>
    [...new Set(pids)].filter((n) => Number.isFinite(n) && n > 0 && n !== process.pid)

  const tryLsof = async () => {
    const variants = [
      ['-ti', `TCP:${port}`, '-sTCP:LISTEN', '-n'],
      ['-ti', `TCP:${port}`, '-sTCP:LISTEN'],
      ['-ti', `:${port}`],
    ]
    for (const args of variants) {
      try {
        const { stdout } = await execFile('lsof', args, { encoding: 'utf8' })
        const pids = stdout
          .trim()
          .split('\n')
          .map((s) => parseInt(s, 10))
          .filter((n) => Number.isFinite(n))
        if (pids.length) return dedupe(pids)
      } catch {
        continue
      }
    }
    return []
  }

  const tryFuser = async () => {
    try {
      const { stdout } = await execFile('fuser', ['-n', 'tcp', String(port)], { encoding: 'utf8' })
      const m = stdout.match(/\d+/g)
      if (!m) return []
      return dedupe(m.map((s) => parseInt(s, 10)))
    } catch {
      return []
    }
  }

  let pids = await tryLsof()
  if (pids.length === 0) pids = await tryFuser()
  return pids
}

/** 若会话端口已被占用，先结束占用进程再启动（避免 EADDRINUSE）。 */
async function freeStaleSessionPortIfNeeded(port: number): Promise<void> {
  const skip =
    process.env.E2E_AI_CONTROL_SESSION_NO_KILL_STALE === '1' ||
    process.env.E2E_AI_CONTROL_SESSION_NO_KILL_STALE === 'true' ||
    process.env.E2E_AI_CONTROL_SESSION_NO_KILL_STALE === 'yes'
  if (skip) return

  const host = '127.0.0.1'
  if (!(await isPortListening(host, port))) return

  console.log(`[ai-control] 会话端口 ${port} 已被占用，尝试结束占用进程...`)
  const pids = await getPidsListeningOnPort(port)
  if (pids.length === 0) {
    throw new Error(
      `[ai-control] 无法解析占用端口 ${port} 的进程（请安装 lsof 或 fuser，或手动结束进程 / 设置 E2E_AI_CONTROL_SESSION_PORT）`,
    )
  }

  for (const pid of pids) {
    try {
      process.kill(pid, 'SIGTERM')
      console.log(`[ai-control] 已向 PID ${pid} 发送 SIGTERM`)
    } catch {
      /* 可能已退出或无权限 */
    }
  }
  await sleep(500)
  for (const pid of pids) {
    try {
      process.kill(pid, 0)
      process.kill(pid, 'SIGKILL')
      console.log(`[ai-control] 已向 PID ${pid} 发送 SIGKILL`)
    } catch {
      /* 已退出 */
    }
  }
  await sleep(500)

  if (await isPortListening(host, port)) {
    throw new Error(
      `[ai-control] 端口 ${port} 仍被占用，请手动处理或设置 E2E_AI_CONTROL_SESSION_NO_KILL_STALE=1 后改用其他端口`,
    )
  }
  console.log(`[ai-control] 端口 ${port} 已释放`)
}

async function main() {
  const sessionPort = resolveSessionPort()
  await freeStaleSessionPortIfNeeded(sessionPort)

  const headed = process.env.E2E_HEADED !== '0' && process.env.E2E_HEADED !== 'false' && process.env.E2E_HEADED !== 'off'
  console.log('Launching browser (headed:', headed, '), baseURL:', baseURL)

  // 并行：浏览器启动 + AI-Control 模块加载，减少总启动时间
  const [browser, aiControl] = await Promise.all([
    chromium.launch({ headless: !headed }),
    import('../AI-Control'),
  ])

  const {
    createFlowContextForSession,
    buildCommandExecutionPlan,
    makeAiControlRegistry,
    runFlowByCommand,
    listCliCommands,
    resolveFlowParamsFromEnv,
    CLI_COMMANDS,
  } = aiControl

  const registry = makeAiControlRegistry()
  let context = await browser.newContext({ baseURL })
  let page = await context.newPage()
  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: SESSION_PAGE_INIT_TIMEOUT_MS })
  let ctx = createFlowContextForSession(page, { minTestTimeoutMs: SESSION_MIN_TEST_TIMEOUT_MS })

  async function createSessionPage() {
    const nextContext = await browser.newContext({ baseURL })
    const nextPage = await nextContext.newPage()
    await nextPage.goto('/', { waitUntil: 'domcontentloaded', timeout: SESSION_PAGE_INIT_TIMEOUT_MS })
    const nextCtx = createFlowContextForSession(nextPage, { minTestTimeoutMs: SESSION_MIN_TEST_TIMEOUT_MS })
    return { nextContext, nextPage, nextCtx }
  }

  async function closeContextSilently(targetContext: typeof context) {
    await Promise.race([
      targetContext.close().catch(() => {}),
      sleep(3_000),
    ])
  }

  let resetChain: Promise<void> = Promise.resolve()
  async function resetSessionPage(reason: string) {
    resetChain = resetChain
      .catch(() => {})
      .then(async () => {
        const previousContext = context
        const { nextContext, nextPage, nextCtx } = await createSessionPage()
        context = nextContext
        page = nextPage
        ctx = nextCtx
        console.log(`[ai-control] session page reset: ${reason}`)
        void closeContextSilently(previousContext)
      })
    await resetChain
  }

  // 串行执行：同一时刻只允许一个命令（终端或 HTTP），避免并发操作同一页
  let runQueue: Promise<void> = Promise.resolve()
  const runOnPage = async (
    commandName: string,
    flowParams: CliFlowParams,
    options: { runTimeoutMs?: number } = {},
  ) => {
    const next = runQueue.then(async () => {
      const runTimeoutMs = Math.max(1_000, options.runTimeoutMs ?? SESSION_RUN_TIMEOUT_MS)
      const resolved =
        commandName === 'general-settings' ? resolveFlowParamsFromEnv(flowParams ?? {}) : (flowParams ?? {})
      const runCtx = ctx
      let timeoutHandle: ReturnType<typeof setTimeout> | undefined
      const commandStartedAt = Date.now()
      const runPromise = runFlowByCommand({ ctx: runCtx, registry, commandName, flowParams: resolved })
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          void (async () => {
            try {
              await resetSessionPage(`${commandName} timeout ${runTimeoutMs}ms`)
            } catch (interruptErr) {
              const detail = interruptErr instanceof Error ? interruptErr.message : String(interruptErr)
              reject(new Error(`[AI-Control] ${commandName} 超时 ${runTimeoutMs}ms，且中断失败: ${detail}`))
              return
            }
            reject(new Error(`[AI-Control] ${commandName} 超时 ${runTimeoutMs}ms，已中断当前命令并重建页面`))
          })()
        }, runTimeoutMs)
      })

      try {
        await Promise.race([runPromise, timeoutPromise])
      } finally {
        if (timeoutHandle) clearTimeout(timeoutHandle)
      }
      console.log(
        `[ai-control] commandTiming commandName=${commandName} elapsedMs=${Date.now() - commandStartedAt}`,
      )
    })
    runQueue = next.catch(() => {})
    await next
  }

  async function getStatusSnapshot() {
    const { evaluatePageStatus } = await import('../AI-Control/status/pageStatus')
    return runQueue.then(() => evaluatePageStatus(page))
  }

  async function getRuntimeSnapshot() {
    return runQueue.then(() =>
      page.evaluate(() => {
        const win = window as typeof window & { __QUARCS_UNIFIED_RUNTIME__?: unknown }
        return win.__QUARCS_UNIFIED_RUNTIME__ || null
      }),
    )
  }

  // HTTP 服务：供 MCP/AI 在同一页上执行命令
  const server = http.createServer(async (req, res) => {
    if (req.method === 'GET' && (req.url === '/' || req.url === '/health')) {
      sendJson(res, 200, { ok: true, message: 'AI-Control session is running' })
      return
    }

    // GET /status：通过 page.evaluate 读取当前页面状态；可选 ?command=xxx 规划命令步骤
    if (req.method === 'GET' && req.url?.startsWith('/status')) {
      try {
        const { getFlowCallsByCommand, CLI_COMMANDS } = await import('../AI-Control/scenario/cliFlows')

        const status = await getStatusSnapshot()
        if (!status) {
          sendJson(res, 500, { ok: false, error: 'evaluatePageStatus 返回空，无法获取页面状态' })
          return
        }

        const url = new URL(req.url, 'http://localhost')
        const command = url.searchParams.get('command')?.trim().toLowerCase()
        const flowParamsRaw = url.searchParams.get('flowParams')?.trim()
        let flowParams: CliFlowParams = {}
        if (flowParamsRaw) {
          try {
            flowParams = JSON.parse(flowParamsRaw) as CliFlowParams
          } catch {
            sendJson(res, 400, { ok: false, error: 'Invalid flowParams query JSON' })
            return
          }
        }

        if (command) {
          if (!CLI_COMMANDS.includes(command as (typeof CLI_COMMANDS)[number])) {
            sendJson(res, 400, {
              ok: false,
              error: `Unknown command: ${command}`,
              availableCommands: [...CLI_COMMANDS],
            })
            return
          }
          const resolved =
            command === 'general-settings' ? resolveFlowParamsFromEnv(flowParams ?? {}) : (flowParams ?? {})
          const plan = await buildCommandExecutionPlan({
            ctx,
            commandName: command,
            flowParams: resolved,
            getFlowCallsByCommand,
          })
          sendJson(res, 200, {
            ok: true,
            status: plan.status,
            plan: {
              commandName: command,
              targetSurface: plan.recoveryPlan.targetSurface,
              blockers: plan.recoveryPlan.blockers,
              preSteps: plan.recoveryPlan.preSteps,
              coreStepIds: plan.coreCalls.map((item) => item.id),
              suggestions: plan.recoveryPlan.suggestions,
            },
          })
        } else {
          sendJson(res, 200, { ok: true, status })
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        sendJson(res, 500, { ok: false, error: message })
      }
      return
    }

    // GET /logs：读取统一运行时日志，并支持基础过滤，便于终端/MCP 闭环调试
    if (req.method === 'GET' && req.url?.startsWith('/logs')) {
      try {
        const url = new URL(req.url, 'http://localhost')
        const limit = parsePositiveInt(url.searchParams.get('limit'), 200, 500)
        const sources = parseCsvParam(url.searchParams.get('source'))
        const levels = parseCsvParam(url.searchParams.get('level'))
        const deviceTypes = parseCsvParam(url.searchParams.get('deviceType'))
        const keywords = parseCsvParam(url.searchParams.get('keyword'))
        const sessionId = url.searchParams.get('sessionId')?.trim() || null
        const frameId = url.searchParams.get('frameId')?.trim() || null
        const sinceSeqRaw = url.searchParams.get('sinceSeq')
        const sinceSeq = sinceSeqRaw != null && sinceSeqRaw !== ''
          ? Math.max(0, Math.floor(Number(sinceSeqRaw)))
          : null
        const sinceTsRaw = url.searchParams.get('sinceTs')?.trim() || null
        const parsedSinceTs = sinceTsRaw ? Date.parse(sinceTsRaw) : NaN
        const sinceTs = Number.isFinite(parsedSinceTs) ? parsedSinceTs : null
        const includeStatus = !['0', 'false', 'off', 'no'].includes(
          (url.searchParams.get('includeStatus') || 'true').trim().toLowerCase(),
        )

        const [status, runtime] = await Promise.all([
          includeStatus ? getStatusSnapshot() : Promise.resolve(null),
          getRuntimeSnapshot(),
        ])

        const rawLogs = Array.isArray((runtime as Record<string, unknown> | null)?.logs)
          ? ((runtime as Record<string, unknown>).logs as UnifiedLogEntry[])
          : []

        const filteredLogs = rawLogs
          .filter((entry) =>
            logMatchesFilters(entry, {
              sources,
              levels,
              deviceTypes,
              keywords,
              sessionId,
              frameId,
              sinceSeq: Number.isFinite(sinceSeq) ? sinceSeq : null,
              sinceTs,
            }),
          )
          .slice(0, limit)

        sendJson(res, 200, {
          ok: true,
          filters: {
            source: sources,
            level: levels,
            deviceType: deviceTypes,
            keyword: keywords,
            sessionId,
            frameId,
            sinceSeq: Number.isFinite(sinceSeq) ? sinceSeq : null,
            sinceTs: sinceTs != null ? new Date(sinceTs).toISOString() : null,
            limit,
            includeStatus,
          },
          totalLogsInBuffer: rawLogs.length,
          matchedCount: filteredLogs.length,
          capture: status
            ? {
                state: status.capture.state,
                e2eExposureCompletedSeq: status.capture.e2eExposureCompletedSeq,
                e2eTileGpmSeq: status.capture.e2eTileGpmSeq,
                tileGenerationComplete: status.capture.tileGenerationComplete,
                tileDownloadComplete: status.capture.tileDownloadComplete,
                requiredTileCount: status.capture.requiredTileCount,
                downloadedTileCount: status.capture.downloadedTileCount,
                requiredTileKeys: status.capture.requiredTileKeys,
                downloadedTileKeys: status.capture.downloadedTileKeys,
              }
            : null,
          websocketState:
            runtime && typeof (runtime as Record<string, unknown>).websocketState === 'string'
              ? (runtime as Record<string, unknown>).websocketState
              : 'unknown',
          logs: filteredLogs,
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        sendJson(res, 500, { ok: false, error: message })
      }
      return
    }

    if (req.method !== 'POST' || req.url !== '/run') {
      sendJson(res, 404, { ok: false, error: 'GET /status, GET /logs or POST /run only' })
      return
    }
    let body: { commandName?: string; flowParams?: CliFlowParams; runTimeoutMs?: number }
    try {
      const raw = await readBody(req)
      body = raw ? JSON.parse(raw) : {}
    } catch {
      sendJson(res, 400, { ok: false, error: 'Invalid JSON body' })
      return
    }
    const commandName = String(body?.commandName ?? '').trim().toLowerCase()
    if (!commandName) {
      sendJson(res, 400, { ok: false, error: 'Missing commandName' })
      return
    }
    if (!CLI_COMMANDS.includes(commandName as (typeof CLI_COMMANDS)[number])) {
      sendJson(res, 400, { ok: false, error: `Unknown command: ${commandName}` })
      return
    }
    const httpRunStarted = Date.now()
    try {
      await runOnPage(commandName, body.flowParams ?? {}, {
        runTimeoutMs: typeof body.runTimeoutMs === 'number' ? body.runTimeoutMs : undefined,
      })
      sendJson(res, 200, { ok: true, commandName, elapsedMs: Date.now() - httpRunStarted })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      sendJson(res, 200, { ok: false, error: message, elapsedMs: Date.now() - httpRunStarted })
    }
  })
  await new Promise<void>((resolve, reject) => {
    const onErr = (err: Error) => {
      server.removeListener('error', onErr)
      reject(err)
    }
    server.once('error', onErr)
    server.listen(sessionPort, '127.0.0.1', () => {
      server.removeListener('error', onErr)
      resolve()
    })
  })
  console.log('Session HTTP server: http://127.0.0.1:' + sessionPort)
  console.log('  GET /status        - 读取当前页面状态')
  console.log('  GET /status?command=xxx - 状态 + 命令执行步骤规划')
  console.log('  GET /logs          - 读取并过滤统一运行时日志')
  console.log('  POST /run          - 执行命令')

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  const prompt = () => process.stdout.write('> ')

  console.log('Browser is open. Enter a command to run on this page.')
  console.log('  list              List all commands')
  console.log('  <name>            Run command (e.g. general-settings)')
  console.log('  <name> <json>     Run with params')
  console.log('  exit / quit       Close browser and exit')
  prompt()

  rl.on('line', async (line) => {
    const t = line.trim()
    if (!t) {
      prompt()
      return
    }
    const lower = t.toLowerCase()
    if (lower === 'exit' || lower === 'quit') {
      server.close()
      rl.close()
      return
    }
    if (lower === 'list') {
      console.log(listCliCommands().join(', '))
      prompt()
      return
    }

    const { commandName, flowParams: rawParams } = parseInput(t)
    if (!CLI_COMMANDS.includes(commandName as (typeof CLI_COMMANDS)[number])) {
      console.log('Unknown command:', commandName, '- use "list" to see commands.')
      prompt()
      return
    }

    try {
      await runOnPage(commandName, rawParams ?? {})
      console.log('OK:', commandName)
    } catch (err) {
      console.log('Error:', err instanceof Error ? err.message : String(err))
    }
    prompt()
  })

  rl.on('close', async () => {
    server.close()
    await page.close()
    await context.close()
    await browser.close()
    process.exit(0)
  })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
