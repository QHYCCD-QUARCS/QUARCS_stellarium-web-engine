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
