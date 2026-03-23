/**
 * QUARCS 自动化测试和更新流程 - MCP server (stdio)
 *
 * 目的：将 autoTestAndUpdate.sh 脚本封装成 Cursor 可调用的 MCP Tool。
 *
 * 运行（命令在 Cursor MCP 设置里配置即可）：
 *   node /home/quarcs/workspace/QUARCS/QUARCS_stellarium-web-engine/apps/web-frontend/scripts/mcp-auto-test-update-server.mjs
 *
 * 可选环境变量（建议在 Cursor 的 MCP server 配置里设置）：
 * - QUARCS_TOTAL_VERSION: 当前版本号（格式: x.y.z）
 * - QUARCS_WORKSPACE_DIR: 工作目录（默认: /home/quarcs/workspace/QUARCS）
 */

import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import * as z from 'zod/v4'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const WEB_FRONTEND_ROOT = path.resolve(__dirname, '..')
// QUARCS 根目录：从 apps/web-frontend 向上到 QUARCS_stellarium-web-engine，再向上到 QUARCS
// 路径结构：QUARCS/QUARCS_stellarium-web-engine/apps/web-frontend
const QUARCS_ROOT = process.env.QUARCS_WORKSPACE_DIR || path.resolve(WEB_FRONTEND_ROOT, '../../..')

// 统一的设备访问 IP / 端口（可通过环境变量覆盖）：
// - 默认设备 IP: 192.168.1.113
// - 默认前端端口: 8000
// Playwright 在 autoTestAndUpdate.sh 里面会通过 E2E_BASE_URL 访问前端，
// 这里统一设置为指向数梅派设备，而不是本机 127.0.0.1:8080。
const DEFAULT_DEVICE_IP = process.env.QUARCS_DEVICE_IP || '192.168.1.113'
const DEFAULT_E2E_PORT = process.env.QUARCS_E2E_PORT || '8000'

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

/**
 * 在运行 autoTestAndUpdate.sh 之前，先编译前端：
 * - 目录：QUARCS_stellarium-web-engine/apps/web-frontend
 * - 命令：npm run build
 *
 * 这样可以确保 dist 目录里的代码（尤其是 FPS / UI 调试相关改动）已经编译完成，
 * createTestProcess.sh 打包出的 dist.zip 就会包含最新前端。
 */
async function buildFrontendIfNeeded() {
  // 允许通过环境变量显式跳过前端构建（例如快速调试线程/后端逻辑）
  if (process.env.QUARCS_SKIP_FRONTEND_BUILD === '1' || process.env.QUARCS_SKIP_FRONTEND_BUILD === 'true') {
    return {
      ok: true,
      skipped: true,
      reason: 'QUARCS_SKIP_FRONTEND_BUILD is set',
    }
  }

  const buildTimeoutMs = 20 * 60 * 1000 // 20 分钟上限，防止异常阻塞
  const res = await runCommand({
    cmd: 'npm',
    args: ['run', 'build'],
    cwd: WEB_FRONTEND_ROOT,
    env: {},
    timeoutMs: buildTimeoutMs,
  })

  const summary = {
    ok: res.code === 0 && !res.killedByTimeout,
    exitCode: res.code,
    signal: res.signal,
    killedByTimeout: res.killedByTimeout,
    cwd: WEB_FRONTEND_ROOT,
    cmd: 'npm run build',
    stdoutTail: tailLines(res.stdout, 200),
    stderrTail: tailLines(res.stderr, 200),
  }

  return summary
}

const mcp = new McpServer({
  name: 'quarcs-auto-test-update',
  version: '0.1.0',
})

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
    inputSchema: {
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
    },
  },
  async ({ skipTest, skipUpload, version, workspaceDir, timeoutSec }) => {
    // 逻辑约束：不允许跳过 E2E 测试（skipTest=true）
    // 原因：如果前端服务未能正常启动并通过 E2E 校验，则认为更新流程不可靠。
    if (skipTest) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                ok: false,
                error: '不允许跳过 E2E 测试（skipTest 必须为 false 或省略）。',
                hint: '请先确保前端服务可访问，并运行完整的 E2E 测试后再打包/上传更新。',
              },
              null,
              2,
            ),
          },
        ],
      }
    }

    // 第一步：先构建前端，确保 dist 是最新的
    const buildSummary = await buildFrontendIfNeeded()
    if (!buildSummary.ok) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                ok: false,
                step: 'frontend-build',
                error: '前端构建失败（npm run build）',
                buildSummary,
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
    if (skipTest) args.push('--skip-test')
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

    // 统一配置前端访问地址：优先使用外部传入的 E2E_BASE_URL，否则使用统一的设备 IP
    // 例如：http://192.168.1.113:8000
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
    inputSchema: {
      workspaceDir: z
        .string()
        .optional()
        .describe(`工作目录（默认: ${QUARCS_ROOT}）`),
    },
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
  // IMPORTANT：不要往 stdout 打任何非协议内容（会干扰 MCP）
  console.error('[mcp] quarcs-auto-test-update server started (stdio)')
}

main().catch((err) => {
  console.error('[mcp] server error:', err)
  process.exit(1)
})
