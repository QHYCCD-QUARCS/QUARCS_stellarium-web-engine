/**
 * Flow 类型定义 (flowTypes)
 *
 * 作用：
 * 本文件定义 E2E 流程运行所需的通用类型，供 flowRunner 与各 step 注册表使用。
 * 不包含具体步骤实现，仅约定上下文、步骤参数、步骤调用与步骤定义的形状。
 *
 * 执行过程：
 * - FlowContext：流程执行上下文，包含 page、testInfo、uiTimeoutMs、stepTimeoutMs。
 * - FlowStepParams / FlowStepCall：步骤参数与单次调用（id + 可选 params）。
 * - FlowRunOptions：运行选项（如 stepDelayMs）。
 * - FlowStepDefinition：步骤定义（可选 description + run 函数）。
 * - StepRegistry：步骤 id 到定义的映射。
 *
 * 规范：所有交互禁止使用 force；定位以全局唯一的 data-testid 为准。
 * 参考：docs/testid-validation-report.md、docs/testid-scan-report.md。
 */
import type { Page, TestInfo } from '@playwright/test'

export type FlowContext = {
  page: Page
  testInfo: TestInfo
  uiTimeoutMs: number
  stepTimeoutMs: number
}

export type FlowStepParams = Record<string, any>

export type FlowStepCall = {
  id: string
  params?: FlowStepParams
}

export type FlowRunOptions = {
  stepDelayMs?: number
}

export type FlowStepDefinition = {
  description?: string
  run: (ctx: FlowContext, params: FlowStepParams) => Promise<void>
}

export type StepRegistry = Map<string, FlowStepDefinition>
