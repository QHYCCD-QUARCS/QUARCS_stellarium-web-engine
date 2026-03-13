/**
 * Flow 运行器 (flowRunner)
 *
 * 作用：
 * 从环境变量解析流程调用（E2E_FLOW_JSON / E2E_FLOW_CALLS_JSON / E2E_FLOW_PARAMS_JSON），
 * 按顺序执行 StepRegistry 中注册的步骤，支持步骤间延时与可选忽略失败。
 *
 * 执行过程：
 * 1. parseFlowCallsFromEnv()：从 E2E_FLOW_CALLS_JSON 解析 FlowStepCall[]。
 * 2. parseFlowParamsFromEnv()：从 E2E_FLOW_PARAMS_JSON 解析全局参数。
 * 3. parseFlowFromEnv()：从 E2E_FLOW_JSON（JSON 数组）或 E2E_FLOW（逗号分隔）解析步骤 id 列表。
 * 4. runFlow()：遍历 calls，从 registry 取步骤定义，合并 globalParams 与 call.params 后执行 step.run(ctx, params)；
 *    若 params.allowFailure 或 params.bestEffort 为真则捕获错误并 warn，否则抛出；每步结束后固定等待 STEP_DELAY_MS 再执行下一步。
 * 5. runFlowByIds()：将 stepIds 转为 calls 后调用 runFlow。
 *
 * 规范：各步骤实现禁止使用 force，交互前需做可操作性检查；定位以 data-testid 为准。
 */
import type { FlowContext, FlowRunOptions, FlowStepCall, FlowStepParams, StepRegistry } from './flowTypes'

/** 每一步操作之间的固定延迟（毫秒），可通过 options.stepDelayMs 覆盖 */
const STEP_DELAY_MS = 200

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { DEFAULTS, envFlag } = require('../../../e2e.config.cjs')

function parseJsonEnv<T>(raw: string | undefined, envName: string): T | null {
  if (!raw || !raw.trim()) return null
  try {
    return JSON.parse(raw) as T
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`解析 ${envName} 失败: ${message}`)
  }
}

export function parseFlowCallsFromEnv(): FlowStepCall[] | null {
  return parseJsonEnv<FlowStepCall[]>(process.env.E2E_FLOW_CALLS_JSON, 'E2E_FLOW_CALLS_JSON')
}

export function parseFlowParamsFromEnv(): FlowStepParams {
  return parseJsonEnv<FlowStepParams>(process.env.E2E_FLOW_PARAMS_JSON, 'E2E_FLOW_PARAMS_JSON') ?? {}
}

export function parseFlowFromEnv(): string[] | null {
  const json = parseJsonEnv<string[]>(process.env.E2E_FLOW_JSON, 'E2E_FLOW_JSON')
  if (json?.length) return json

  const csv = String(process.env.E2E_FLOW ?? '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)

  return csv.length ? csv : null
}

async function maybeWait(stepDelayMs?: number) {
  if (!stepDelayMs || stepDelayMs <= 0) return
  await new Promise((resolve) => setTimeout(resolve, stepDelayMs))
}

function listAvailableSteps(registry: StepRegistry): string {
  return Array.from(registry.keys())
    .sort()
    .join(', ')
}

export async function runFlow(args: {
  ctx: FlowContext
  registry: StepRegistry
  calls: FlowStepCall[]
  globalParams?: FlowStepParams
  options?: FlowRunOptions
}) {
  const { ctx, registry, calls, globalParams, options } = args
  const timingEnabled = envFlag(process.env, 'E2E_FLOW_TIMING', DEFAULTS.flow.flowTiming)

  for (let i = 0; i < calls.length; i += 1) {
    const call = calls[i]
    const step = registry.get(call.id)
    if (!step) {
      throw new Error(`未知 step id: ${call.id}\n可用 steps（${registry.size}）: ${listAvailableSteps(registry)}`)
    }

    const params = {
      ...(globalParams ?? {}),
      ...(call.params ?? {}),
    }

    console.log(`[flow] ${i + 1}/${calls.length} ${call.id}`)
    const start = Date.now()
    try {
      await step.run(ctx, params)
      if (timingEnabled) {
        console.log(`[flow] ${i + 1}/${calls.length} ${call.id} ${Date.now() - start}ms`)
      }
    } catch (error) {
      if (params.allowFailure || params.bestEffort) {
        const message = error instanceof Error ? error.message : String(error)
        console.warn(`[flow] ignore failed step ${call.id}: ${message}`)
      } else {
        const message = error instanceof Error ? error.message : String(error)
        const paramsSummary = JSON.stringify(call.params ?? {})
        console.error(`[flow] step failed: id=${call.id} params=${paramsSummary} error=${message}`)
        throw error
      }
    }

    await maybeWait(options?.stepDelayMs ?? STEP_DELAY_MS)
  }
}

export async function runFlowByIds(args: {
  ctx: FlowContext
  registry: StepRegistry
  stepIds: string[]
  params?: FlowStepParams
  options?: FlowRunOptions
}) {
  const calls = args.stepIds.map((id) => ({ id }))
  await runFlow({
    ctx: args.ctx,
    registry: args.registry,
    calls,
    globalParams: args.params ?? {},
    options: args.options,
  })
}
