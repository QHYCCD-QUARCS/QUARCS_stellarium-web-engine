/**
 * AI-Control 流程上下文构造（供 CLI / E2E 使用）。
 *
 * 从 e2e.config 与环境变量读取超时，构造 FlowContext，便于在 AI-Control 内部或 E2E 中复用。
 */
import type { FlowContext } from '../core/flowTypes'

declare const require: (id: string) => any
declare const process: { env: Record<string, string | undefined> }

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { DEFAULTS, envNumber } = require('../../e2e.config.cjs')

export type CreateFlowContextOptions = {
  minTestTimeoutMs?: number
}

/** 会话模式下无需 Playwright TestInfo，仅需满足 setTimeout 的占位对象 */
const noopTestInfo = { setTimeout: (_ms: number) => {} }

/**
 * 根据 page、testInfo 与可选配置构造 FlowContext（超时从 e2e.config + 环境变量读取）。
 */
export function createFlowContext(
  page: FlowContext['page'],
  testInfo: FlowContext['testInfo'],
  options: CreateFlowContextOptions = {},
): FlowContext {
  const { minTestTimeoutMs = 0 } = options
  const uiTimeoutMs = envNumber(process.env, 'E2E_UI_TIMEOUT_MS', DEFAULTS.flow.uiTimeoutMs)
  const stepTimeoutMs = envNumber(process.env, 'E2E_STEP_TIMEOUT_MS', DEFAULTS.flow.stepTimeoutMs)
  const testTimeoutMs = envNumber(process.env, 'E2E_TEST_TIMEOUT_MS', DEFAULTS.flow.testTimeoutMs)

  page.setDefaultTimeout(uiTimeoutMs)
  page.setDefaultNavigationTimeout(stepTimeoutMs)
  testInfo.setTimeout(Math.max(testTimeoutMs, minTestTimeoutMs))

  return { page, testInfo, uiTimeoutMs, stepTimeoutMs }
}

/**
 * 会话模式专用：仅凭 page 构造 FlowContext（不依赖 Playwright test，用于先打开一页、再反复执行命令的脚本）。
 */
export function createFlowContextForSession(
  page: FlowContext['page'],
  options: CreateFlowContextOptions = {},
): FlowContext {
  return createFlowContext(page, noopTestInfo as FlowContext['testInfo'], options)
}
