/**
 * QUARCS Stellarium Web Frontend - MCP server (stdio)
 *
 * 目的：把现有的 Playwright E2E（尤其是 goal-driven AI runner）封装成 Cursor 可调用的 MCP Tools。
 *
 * 运行（命令在 Cursor MCP 设置里配置即可）：
 *   node /abs/path/to/apps/web-frontend/scripts/mcp-e2e-server.mjs
 *
 * 可选环境变量（建议在 Cursor 的 MCP server 配置里设置）：
 * - E2E_BASE_URL
 * - E2E_HEADED=1/0：MCP 触发的 playwright test 默认 headed（1）；设 0/false/off 可关闭
 * - E2E_RECORD=1/0：MCP 触发的 playwright test 默认录制（1，video/trace/screenshot）；设 0/false/off 可关闭
 */

import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

// 统一配置入口（所有默认值/环境变量含义都在这里）
import cfg from '../e2e.config.cjs'
const { DEFAULTS, envFlag, envNumber, resolveBoolWithPrecedence } = cfg

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const WEB_FRONTEND_ROOT = path.resolve(__dirname, '..')
// QUARCS 根目录：从 apps/web-frontend 向上到 QUARCS_stellarium-web-engine，再向上到 QUARCS
// 路径结构：QUARCS/QUARCS_stellarium-web-engine/apps/web-frontend
const QUARCS_ROOT = process.env.QUARCS_WORKSPACE_DIR || path.resolve(WEB_FRONTEND_ROOT, '../../..')

// 统一的设备访问 IP / 端口（可通过环境变量覆盖），供 E2E 测试访问前端：
// - 默认设备 IP: 192.168.1.113
// - 默认前端端口: 8000
// E2E 配置会通过 E2E_BASE_URL 作为 page.goto('/') 的基准地址。
const DEFAULT_DEVICE_IP = process.env.QUARCS_DEVICE_IP || '192.168.1.113'
const DEFAULT_E2E_PORT = process.env.QUARCS_E2E_PORT || '8000'

function readTestIdIndex() {
  const p = path.join(WEB_FRONTEND_ROOT, 'docs/e2e/E2E_TEST_IDS_INDEX.json')
  const raw = fs.readFileSync(p, 'utf-8')
  return JSON.parse(raw)
}

function tailLines(text, maxLines = 200) {
  const lines = String(text ?? '').split(/\r?\n/)
  if (lines.length <= maxLines) return lines.join('\n')
  return lines.slice(-maxLines).join('\n')
}

function runCommand({ cmd, args, cwd, env, timeoutMs }) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      cwd,
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (d) => (stdout += d.toString()))
    child.stderr.on('data', (d) => (stderr += d.toString()))

    let killedByTimeout = false
    const timer =
      timeoutMs && timeoutMs > 0
        ? setTimeout(() => {
            killedByTimeout = true
            try {
              child.kill('SIGKILL')
            } catch {
              // ignore
            }
          }, timeoutMs)
        : null

    child.on('close', (code, signal) => {
      if (timer) clearTimeout(timer)
      resolve({
        code: code ?? null,
        signal: signal ?? null,
        killedByTimeout,
        stdout,
        stderr,
      })
    })
  })
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true })
}

function safeTimestamp() {
  // 2026-02-04T15-36-17-123Z
  return new Date().toISOString().replace(/[:.]/g, '-')
}

const mcp = new McpServer({
  name: 'quarcs-web-frontend-e2e',
  version: '0.1.0',
})

/**
 * 工具：搜索/查看 testId 索引（给 LLM 更快定位控件用）
 */
mcp.registerTool(
  'e2e_search_testids',
  {
    description:
      '在 docs/e2e/E2E_TEST_IDS_INDEX.json 中按关键词搜索 testId（支持按 id/组件名/前缀匹配）。返回少量高信号信息。',
    inputSchema: z.object({
      query: z.string().describe('搜索关键词，例如 "capture" / "mcp-btn" / "拍摄"'),
      limit: z.number().int().min(1).max(200).optional().describe('返回数量上限，默认 50'),
    }),
  },
  async ({ query, limit }) => {
    const idx = readTestIdIndex()
    const q = query.trim().toLowerCase()
    const out = []
    const max = limit ?? 50

    for (const [id, meta] of Object.entries(idx.testIds ?? {})) {
      if (out.length >= max) break
      const hit =
        String(id).toLowerCase().includes(q) ||
        String(meta?.component ?? '')
          .toLowerCase()
          .includes(q)
      if (!hit) continue
      out.push({
        id,
        component: meta?.component ?? null,
        elementType: meta?.elementType ?? null,
        hasDataState: meta?.hasDataState ?? null,
        dataState: meta?.dataState ?? null,
        line: meta?.line ?? null,
      })
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ query, count: out.length, results: out }, null, 2),
        },
      ],
    }
  },
)

mcp.registerTool(
  'e2e_get_testid_info',
  {
    description: '按 testId 精确查询其在索引中的信息（组件、元素类型、data-state 等）。',
    inputSchema: z.object({
      id: z.string().describe('要查询的 data-testid'),
    }),
  },
  async ({ id }) => {
    const idx = readTestIdIndex()
    const meta = idx.testIds?.[id] ?? null
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ id, meta }, null, 2),
        },
      ],
    }
  },
)



/**
 * 工具：对当前/指定网页截图（PNG）
 *
 * 说明：
 * - 默认 url 使用 E2E_BASE_URL（若未设置则 http://127.0.0.1:8080/）
 * - 默认输出到 test-results/mcp-snapshots/
 * - 同时返回：图片文件路径 + base64 图片内容（Cursor 支持时可直接预览）
 */
mcp.registerTool(
  'web_screenshot',
  {
    description: '对指定 URL 网页进行截图（PNG），并返回截图文件路径（以及可选的图片内容）。',
    inputSchema: z.object({
      url: z.string().optional().describe('要截图的 URL；不填则使用 E2E_BASE_URL 或 http://127.0.0.1:8080/'),
      fullPage: z.boolean().optional().describe('是否截取整页（默认 false）'),
      waitForSelector: z.string().optional().describe('截图前等待出现的 CSS selector（可选）'),
      waitMs: z.number().int().min(0).max(120_000).optional().describe('截图前等待毫秒数（可选）'),
      viewport: z
        .string()
        .optional()
        .describe('viewport 尺寸，例如 "1280,720"（可选，对应 playwright --viewport-size）'),
      browser: z
        .enum(['cr', 'chromium', 'ff', 'firefox', 'wk', 'webkit'])
        .optional()
        .describe('Playwright browser 类型（默认 chromium）'),
      outputPath: z
        .string()
        .optional()
        .describe('输出文件路径；若为相对路径则相对 WEB_FRONTEND_ROOT（可选）'),
      timeoutSec: z
        .number()
        .int()
        .min(5)
        .max(300)
        .optional()
        .describe(`截图整体超时秒数（默认 ${DEFAULTS.mcp.screenshotTimeoutSec}）`),
      returnImage: z
        .boolean()
        .optional()
        .describe(
          `是否在结果中附带 base64 图片内容（默认 ${DEFAULTS.mcp.screenshotReturnImage ? 'true' : 'false'}）`,
        ),
    }),
  },
  async ({
    url,
    fullPage,
    waitForSelector,
    waitMs,
    viewport,
    browser,
    outputPath,
    timeoutSec,
    returnImage,
  }) => {
    const targetUrl = url ?? process.env.E2E_BASE_URL ?? 'http://127.0.0.1:8080/'
    const shouldReturnImage =
      typeof returnImage === 'boolean' ? returnImage : DEFAULTS.mcp.screenshotReturnImage

    const defaultOutDir = path.join(WEB_FRONTEND_ROOT, 'test-results', 'mcp-snapshots')
    ensureDir(defaultOutDir)

    const outPath = outputPath
      ? path.isAbsolute(outputPath)
        ? outputPath
        : path.join(WEB_FRONTEND_ROOT, outputPath)
      : path.join(defaultOutDir, `screenshot-${safeTimestamp()}.png`)

    ensureDir(path.dirname(outPath))

    const args = ['playwright', 'screenshot']
    if (waitForSelector) args.push('--wait-for-selector', waitForSelector)
    if (typeof waitMs === 'number') args.push('--wait-for-timeout', String(waitMs))
    if (typeof fullPage === 'boolean' ? fullPage : false) args.push('--full-page')
    if (browser) args.push('-b', browser)
    if (viewport) args.push('--viewport-size', viewport)
    // 注意：playwright screenshot 的 --timeout 是 action timeout（ms）
    const screenshotTimeoutSec =
      typeof timeoutSec === 'number'
        ? timeoutSec
        : envNumber(process.env, 'E2E_SCREENSHOT_TIMEOUT_SEC', DEFAULTS.mcp.screenshotTimeoutSec)
    const timeoutMs = screenshotTimeoutSec * 1000
    args.push('--timeout', String(timeoutMs))
    args.push(targetUrl, outPath)

    const res = await runCommand({
      cmd: 'npx',
      args,
      cwd: WEB_FRONTEND_ROOT,
      env: {},
      timeoutMs: timeoutMs + 10_000,
    })

    const summary = {
      ok: res.code === 0 && !res.killedByTimeout,
      exitCode: res.code,
      signal: res.signal,
      killedByTimeout: res.killedByTimeout,
      url: targetUrl,
      screenshotPath: outPath,
      stdoutTail: tailLines(res.stdout, 50),
      stderrTail: tailLines(res.stderr, 200),
    }

    if (!summary.ok) {
      return {
        content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }],
      }
    }

    let imageContent = null
    if (shouldReturnImage) {
      try {
        const buf = fs.readFileSync(outPath)
        imageContent = {
          type: 'image',
          data: buf.toString('base64'),
          mimeType: 'image/png',
        }
      } catch (e) {
        summary.imageReadError = String(e?.message ?? e)
      }
    }

    return {
      content: [
        { type: 'text', text: JSON.stringify(summary, null, 2) },
        ...(imageContent ? [imageContent] : []),
      ],
    }
  },
)


/** AI-Control 命令名列表（与 AI-Control/scenario/cliFlows.ts CLI_COMMANDS 一致） */
const AI_CONTROL_COMMANDS = [
  'general-settings',
  'power-management',
  'guider-connect-capture',
  'maincamera-connect-capture',
  'mount-connect-control',
  'telescopes-focal-length',
  'focuser-connect-control',
  'cfw-capture-config',
  'polar-axis-calibration',
  'image-file-manager',
  'task-schedule',
]

/**
 * 工具：列出 AI-Control 可用命令名（供 AI 选择要执行的动作）
 */
mcp.registerTool(
  'ai_control_list_commands',
  {
    description:
      '列出 AI-Control 全部命令名。用于让 AI 知道可以控制前端的哪些功能（通用设置、电源管理、导星/主相机连接拍摄、赤道仪、焦距、电调、滤镜轮、极轴校准、图像管理、任务计划表等）。',
    inputSchema: z.object({}),
  },
  async () => ({
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            commands: AI_CONTROL_COMMANDS,
            note: '在已打开的会话页上执行请用 ai_control_run_command_on_session（需先 npm run e2e:ai-control:session）；否则用 ai_control_run_command 每次新开浏览器执行。',
          },
          null,
          2,
        ),
      },
    ],
  }),
)

/**
 * 工具：执行一条 AI-Control 命令（在浏览器中打开页面并执行对应业务动作）
 */
mcp.registerTool(
  'ai_control_run_command',
  {
    description:
      '在浏览器中执行一条 AI-Control 命令，控制前端完成对应业务动作（如打开通用设置、电源管理、连接设备并拍摄等）。每次调用会启动一次 Playwright 运行该命令。',
    inputSchema: z.object({
      commandName: z
        .string()
        .refine((c) => AI_CONTROL_COMMANDS.includes(c), {
          message: `commandName 须为: ${AI_CONTROL_COMMANDS.join(', ')}`,
        })
        .describe('命令名，可用 ai_control_list_commands 查看完整列表'),
      flowParams: z.record(z.any()).optional().describe('可选参数，如 general-settings 的 resetBeforeConnect、generalSettingsInteract 等'),
      baseUrl: z.string().optional().describe('覆盖 E2E_BASE_URL'),
      headed: z.boolean().optional().describe('是否显示浏览器窗口，默认 true'),
      timeoutSec: z.number().int().min(30).max(600).optional().describe('本次运行超时秒数，默认 300'),
    }),
  },
  async ({ commandName, flowParams, baseUrl, headed, timeoutSec }) => {
    const timeoutMs = (timeoutSec ?? 300) * 1000
    const env = {
      E2E_AI_CONTROL_COMMAND: commandName,
      ...(flowParams && Object.keys(flowParams).length > 0 ? { E2E_FLOW_PARAMS_JSON: JSON.stringify(flowParams) } : {}),
      ...(baseUrl ? { E2E_BASE_URL: baseUrl } : {}),
      ...(headed !== undefined ? { E2E_HEADED: headed ? '1' : '0' } : {}),
    }

    const args = [
      'playwright',
      'test',
      'AI-Control/e2e/run-one-command.spec.ts',
      '--project=ai-control',
      '--workers=1',
      '--timeout',
      String(Math.min(timeoutMs - 5000, 600_000)),
    ]
    if (env.E2E_HEADED !== '0') args.push('--headed')

    const res = await runCommand({
      cmd: 'npx',
      args,
      cwd: WEB_FRONTEND_ROOT,
      env,
      timeoutMs,
    })

    const summary = {
      ok: res.code === 0 && !res.killedByTimeout,
      commandName,
      exitCode: res.code,
      killedByTimeout: res.killedByTimeout,
      stdoutTail: tailLines(res.stdout, 100),
      stderrTail: tailLines(res.stderr, 100),
    }
    return {
      content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }],
    }
  },
)

/** 会话模式 HTTP 服务默认端口（与 ai-control-session.ts 中 E2E_AI_CONTROL_SESSION_PORT 一致） */
const AI_CONTROL_SESSION_DEFAULT_PORT = 39281

/**
 * 工具：在「已打开的会话页面」上执行一条命令（对话模式，与用户共用同一页）
 * 使用前需先在本机启动会话：cd apps/web-frontend && npm run e2e:ai-control:session
 */
mcp.registerTool(
  'ai_control_run_command_on_session',
  {
    description:
      '在用户已启动的 AI-Control 会话（同一浏览器页）上执行一条命令。必须先由用户运行 npm run e2e:ai-control:session 启动会话并保持运行，AI 调用本工具时会将命令发送到该会话，在同一页上执行，实现「AI 使用对话模式」。若会话未启动会返回错误提示。',
    inputSchema: z.object({
      commandName: z
        .string()
        .refine((c) => AI_CONTROL_COMMANDS.includes(c), {
          message: `commandName 须为: ${AI_CONTROL_COMMANDS.join(', ')}`,
        })
        .describe('命令名'),
      flowParams: z.record(z.any()).optional().describe('可选参数'),
      sessionPort: z.number().int().min(1).max(65535).optional().describe(`会话 HTTP 端口，默认 ${AI_CONTROL_SESSION_DEFAULT_PORT}`),
    }),
  },
  async ({ commandName, flowParams, sessionPort }) => {
    const port = sessionPort ?? AI_CONTROL_SESSION_DEFAULT_PORT
    const url = `http://127.0.0.1:${port}/run`
    let res
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commandName, flowParams: flowParams ?? {} }),
      })
    } catch (err) {
      const message = err?.message ?? String(err)
      const hint = message.includes('ECONNREFUSED') || message.includes('fetch failed')
        ? '会话未启动。请先在终端执行: cd apps/web-frontend && npm run e2e:ai-control:session'
        : message
      return {
        content: [{ type: 'text', text: JSON.stringify({ ok: false, error: hint }, null, 2) }],
      }
    }
    const text = await res.text()
    let body
    try {
      body = text ? JSON.parse(text) : {}
    } catch {
      body = { ok: false, error: text || 'Invalid response' }
    }
    return {
      content: [{ type: 'text', text: JSON.stringify(body, null, 2) }],
    }
  },
)

/**
 * 工具：运行 QUARCS 自动化测试和更新流程
 *
 * 功能：
 * 1. 运行 E2E 测试
 * 2. 如果测试通过，读取当前版本号并生成新版本号
 * 3. 创建更新包并重命名为版本号.zip
 * 4. 上传更新包到服务器
 * 5. 验证版本号是否正确更新
 */
mcp.registerTool(
  'quarcs_auto_test_and_update',
  {
    description:
      '运行 QUARCS 自动化测试和更新流程：执行 E2E 测试，生成新版本号，创建更新包，上传到服务器，并验证更新。',
    inputSchema: z.object({
      skipTest: z
        .boolean()
        .optional()
        .describe('是否跳过 E2E 测试（默认 false，即运行测试）'),
      skipUpload: z
        .boolean()
        .optional()
        .describe('是否跳过上传步骤（默认 false，即执行上传）'),
      version: z
        .string()
        .regex(/^\d+\.\d+\.\d+$/)
        .optional()
        .describe('指定版本号（格式: x.y.z，例如 "1.2.3"）。如果不指定，将自动递增当前版本号'),
      workspaceDir: z
        .string()
        .optional()
        .describe(`工作目录（默认: ${QUARCS_ROOT}）`),
      timeoutSec: z
        .number()
        .int()
        .min(60)
        .max(7200)
        .optional()
        .describe('整体超时秒数（默认 3600，即 1 小时）'),
    }),
  },
  async ({ skipTest, skipUpload, version, workspaceDir, timeoutSec }) => {
    // 逻辑约束：不允许跳过 E2E 测试（skipTest=true）
    // 这里直接在 MCP 层禁止，确保每次自动化更新前都实际跑过前端 E2E。
    if (skipTest) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                ok: false,
                error: '不允许跳过 E2E 测试（skipTest 必须为 false 或省略）。',
                hint: '请先确保前端服务可访问（例如设备 IP 上的网页已能正常打开），并运行完整的 E2E 测试后再触发自动更新。',
              },
              null,
              2,
            ),
          },
        ],
      }
    }

    const workDir = workspaceDir || process.env.QUARCS_WORKSPACE_DIR || QUARCS_ROOT
    const scriptPath = path.join(workDir, 'autoTestAndUpdate.sh')

    // 检查脚本是否存在
    if (!fs.existsSync(scriptPath)) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                ok: false,
                error: `脚本文件不存在: ${scriptPath}`,
                scriptPath,
                workspaceDir: workDir,
              },
              null,
              2,
            ),
          },
        ],
      }
    }

    // 确保脚本有执行权限
    try {
      fs.chmodSync(scriptPath, 0o755)
    } catch (e) {
      // 忽略权限设置错误
    }

    // 构建命令参数
    const args = []
    // 这里不再允许 --skip-test，由上面的逻辑保证始终运行 E2E
    if (skipUpload) args.push('--skip-upload')
    if (version) {
      args.push('--version', version)
    }

    const timeoutMs = (timeoutSec || 3600) * 1000

    // 准备环境变量
    const env = {}
    if (process.env.QUARCS_TOTAL_VERSION) {
      env.QUARCS_TOTAL_VERSION = process.env.QUARCS_TOTAL_VERSION
    }

    // 统一配置 E2E 访问前端的基准地址：
    // 优先使用外部已设置的 E2E_BASE_URL，否则使用统一的设备 IP / 端口，例如：
    //   http://192.168.1.113:8000
    env.E2E_BASE_URL = process.env.E2E_BASE_URL || `http://${DEFAULT_DEVICE_IP}:${DEFAULT_E2E_PORT}`

    // 运行脚本
    const res = await runCommand({
      cmd: 'bash',
      args: [scriptPath, ...args],
      cwd: workDir,
      env,
      timeoutMs,
    })

    const summary = {
      ok: res.code === 0 && !res.killedByTimeout,
      exitCode: res.code,
      signal: res.signal,
      killedByTimeout: res.killedByTimeout,
      scriptPath,
      workspaceDir: workDir,
      args: args.length > 0 ? args : null,
      envUsed: {
        QUARCS_TOTAL_VERSION: env.QUARCS_TOTAL_VERSION || null,
        E2E_BASE_URL: env.E2E_BASE_URL || null,
        QUARCS_DEVICE_IP: DEFAULT_DEVICE_IP,
        QUARCS_E2E_PORT: DEFAULT_E2E_PORT,
      },
      stdoutTail: tailLines(res.stdout, 500),
      stderrTail: tailLines(res.stderr, 500),
    }

    // 如果成功，尝试从输出中提取版本号信息
    if (summary.ok) {
      const versionMatch = res.stdout.match(/新版本号:\s*(\d+\.\d+\.\d+)/)
      const packageMatch = res.stdout.match(/更新包:\s*(.+\.zip)/)
      if (versionMatch) {
        summary.newVersion = versionMatch[1]
      }
      if (packageMatch) {
        summary.updatePackage = packageMatch[1]
      }
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }],
    }
  },
)

/**
 * 工具：获取 QUARCS 当前版本号
 */
mcp.registerTool(
  'quarcs_get_version',
  {
    description: '获取 QUARCS 当前版本号（从环境变量或版本文件中读取）。',
    inputSchema: z.object({
      workspaceDir: z
        .string()
        .optional()
        .describe(`工作目录（默认: ${QUARCS_ROOT}）`),
    }),
  },
  async ({ workspaceDir }) => {
    const workDir = workspaceDir || process.env.QUARCS_WORKSPACE_DIR || QUARCS_ROOT
    const versionFile = path.join(workDir, '.quarcs_version')

    let version = null
    let source = null

    // 1. 尝试从环境变量读取
    if (process.env.QUARCS_TOTAL_VERSION) {
      version = process.env.QUARCS_TOTAL_VERSION
      source = 'environment'
    }
    // 2. 尝试从版本文件读取
    else if (fs.existsSync(versionFile)) {
      try {
        const content = fs.readFileSync(versionFile, 'utf-8').trim()
        if (/^\d+\.\d+\.\d+$/.test(content)) {
          version = content
          source = 'file'
        }
      } catch (e) {
        // 忽略读取错误
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              version,
              source,
              versionFile: version ? versionFile : null,
              note: version
                ? null
                : '未找到版本号，将使用默认版本 1.0.0',
            },
            null,
            2,
          ),
        },
      ],
    }
  },
)

async function main() {
  const transport = new StdioServerTransport()


  await mcp.connect(transport)

  console.error('[mcp] quarcs-web-frontend-e2e server started (stdio)')
}


main().catch((err) => {
  console.error('[mcp] server error:', err)
  process.exit(1)
})

