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
 */
import * as http from 'node:http'
import * as readline from 'node:readline'
import { chromium } from '@playwright/test'

const baseURL = process.env.E2E_BASE_URL || 'http://192.168.1.113:8080'
const SESSION_PORT = Number(process.env.E2E_AI_CONTROL_SESSION_PORT) || 39281
const SESSION_RUN_TIMEOUT_MS = Number(process.env.E2E_AI_CONTROL_RUN_TIMEOUT_MS) || 60_000
const SESSION_PAGE_INIT_TIMEOUT_MS = Number(process.env.E2E_AI_CONTROL_PAGE_INIT_TIMEOUT_MS) || 15_000
const SESSION_MIN_TEST_TIMEOUT_MS = 5 * 60_000

type CliFlowParams = Record<string, unknown>

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

async function main() {
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
    })
    runQueue = next.catch(() => {})
    await next
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
        const { evaluatePageStatus } = await import('../AI-Control/status/pageStatus')
        const { getFlowCallsByCommand, CLI_COMMANDS } = await import('../AI-Control/scenario/cliFlows')

        const status = await runQueue.then(() => evaluatePageStatus(page))
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

    if (req.method !== 'POST' || req.url !== '/run') {
      sendJson(res, 404, { ok: false, error: 'GET /status or POST /run only' })
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
    try {
      await runOnPage(commandName, body.flowParams ?? {}, {
        runTimeoutMs: typeof body.runTimeoutMs === 'number' ? body.runTimeoutMs : undefined,
      })
      sendJson(res, 200, { ok: true, commandName })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      sendJson(res, 200, { ok: false, error: message })
    }
  })
  server.listen(SESSION_PORT, '127.0.0.1', () => {
    console.log('Session HTTP server: http://127.0.0.1:' + SESSION_PORT)
    console.log('  GET /status        - 读取当前页面状态')
    console.log('  GET /status?command=xxx - 状态 + 命令执行步骤规划')
    console.log('  POST /run          - 执行命令')
  })

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
