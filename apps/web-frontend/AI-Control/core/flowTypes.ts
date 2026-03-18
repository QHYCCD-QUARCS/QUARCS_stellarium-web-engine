/**
 * AI-Control 流程核心类型定义。
 *
 * 定义运行 flow 所需的上下文、步骤参数、步骤调用描述、步骤定义及注册表类型，
 * 与 flowRunner 配合实现“步骤 id + 参数”的声明式流程执行。
 */
import type { Page, TestInfo } from '@playwright/test'

/**
 * 流程运行上下文：Playwright page、testInfo 及超时配置。
 *
 * - **uiTimeoutMs**：供 E2E 设置 page 默认超时（如 page.setDefaultTimeout），步骤内不直接使用。
 * - **stepTimeoutMs**：单步操作与断言的超时，步骤内统一使用此值（或 params.timeoutMs 覆盖）。
 */
export type FlowContext = {
  page: Page
  testInfo: TestInfo
  uiTimeoutMs: number
  stepTimeoutMs: number
}

/** 单步参数，键值对，由调用方与全局参数合并后传入 step.run */
export type FlowStepParams = Record<string, any>

/** 流程中的单步调用：步骤 id + 可选参数 */
export type FlowStepCall = {
  id: string
  params?: FlowStepParams
}

/** runFlow 的全局选项，如步骤间延迟 */
export type FlowRunOptions = {
  stepDelayMs?: number
}

/** 单步定义：可选描述 + 执行函数 */
export type FlowStepDefinition = {
  description?: string
  run: (ctx: FlowContext, params: FlowStepParams) => Promise<void>
}

/** 步骤注册表：step id -> FlowStepDefinition */
export type StepRegistry = Map<string, FlowStepDefinition>
