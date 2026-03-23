/// <reference types="node" />
import path from 'path'
import { defineConfig } from '@playwright/test'

// 统一配置入口（所有默认值/环境变量含义都在这里）
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { DEFAULTS, envFlag, envNumber, envString } = require('./e2e.config.cjs')

// 录屏/截图/trace 输出子目录：由各脚本设置 E2E_ARTIFACT_SUBDIR（如 run-test001-sequential.20260311_123456），避免不同脚本互相覆盖
const artifactSubdir = process.env.E2E_ARTIFACT_SUBDIR
const outputDir = artifactSubdir ? path.join('test-results', artifactSubdir) : 'test-results'

/**
 * Playwright 配置（用于 E2E / MCP 动态测试）。
 *
 * 说明：
 * - 默认 baseURL 指向本地 dev server（可通过 E2E_BASE_URL 覆盖）。
 * - 本仓库不自动启动 server（按你的要求由外部启动/连接）。
 * - 脚本可通过 E2E_ARTIFACT_SUBDIR 指定本次运行的录屏/截图目录（如 <脚本名>.<时间戳>），实现按脚本分目录。
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: 'list',
  outputDir,
  projects: [
    { name: 'e2e', testDir: './tests/e2e' },
    // ai-control：单 worker + 各 spec 内可串行共用同一 page，避免每条命令重开网页
    { name: 'ai-control', testDir: './AI-Control/e2e', workers: 1 },
  ],
  // NOTE: Playwright 1.34 的 UseOptions 类型不包含 reducedMotion；这里用 as any 以保留运行时行为
  use: ({
    // 是否显示浏览器界面：
    // - CLI 也可直接用 `--headed`
    // - 这里允许用 E2E_HEADED 作为默认开关（便于 MCP/本地调试）
    headless: !envFlag(process.env, 'E2E_HEADED', DEFAULTS.mcp.headed),
    baseURL: envString(process.env, 'E2E_BASE_URL', DEFAULTS.playwright.baseUrl),
    // 默认仅在失败时保留（节省空间）；如需“可视化回放”，设置 E2E_RECORD=1（可用 0/false/off 显式关闭）
    trace: envFlag(process.env, 'E2E_RECORD', DEFAULTS.playwright.recordArtifacts) ? 'on' : 'retain-on-failure',
    video: envFlag(process.env, 'E2E_RECORD', DEFAULTS.playwright.recordArtifacts) ? 'on' : 'retain-on-failure',
    screenshot: envFlag(process.env, 'E2E_RECORD', DEFAULTS.playwright.recordArtifacts) ? 'on' : 'only-on-failure',
    // 可视化更“顺”：减少动画 + 可选 slowMo（仅在设置环境变量时生效）
    reducedMotion: envFlag(process.env, 'E2E_REDUCED_MOTION', DEFAULTS.playwright.reducedMotion)
      ? 'reduce'
      : 'no-preference',
    launchOptions: (() => {
      const slowMoMs = envNumber(process.env, 'E2E_SLOWMO_MS', DEFAULTS.playwright.slowMoMs)
      if (Number.isFinite(slowMoMs) && slowMoMs > 0) return { slowMo: slowMoMs }
      return undefined
    })(),
  } as any),
})

