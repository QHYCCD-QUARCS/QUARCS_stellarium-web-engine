/**
 * AI-Control 流程运行器与注册表合并。
 *
 * mergeRegistries：将多个 StepRegistry 合并为一个，重复 id 会抛错。
 * runFlow：按 calls 顺序执行步骤，每步从 registry 取定义并传入合并后的 params，支持步骤间延迟。
 * 步骤执行异常会被包装为 [AI-Control] stepId execute: 步骤执行失败，并保留 cause。
 */
import type { FlowContext, FlowRunOptions, FlowStepCall, FlowStepParams, StepRegistry } from './flowTypes'
import { createStepError, isStepError } from '../shared/errors'

const DEFAULT_STEP_DELAY_MS = 200

/** 合并多个注册表；若存在重复 step id 则抛出错误 */
export function mergeRegistries(...registries: StepRegistry[]): StepRegistry {
  const merged: StepRegistry = new Map()
  for (const registry of registries) {
    for (const [id, def] of registry.entries()) {
      if (merged.has(id)) {
        throw createStepError('mergeRegistries', 'execute', `registry 冲突: ${id}`, { conflictingId: id })
      }
      merged.set(id, def)
    }
  }
  return merged
}

/** 生成可用 step id 列表（排序后拼接），用于未知 step 时的报错信息 */
function listAvailableSteps(registry: StepRegistry): string {
  return Array.from(registry.keys())
    .sort()
    .join(', ')
}

function maybeWait(stepDelayMs: number) {
  if (stepDelayMs <= 0) return Promise.resolve()
  return new Promise((resolve) => setTimeout(resolve, stepDelayMs))
}

/** 将步骤参数格式化为可读字符串，便于终端查看「点了哪个、做了什么」 */
function formatStepParams(params: FlowStepParams | undefined): string {
  if (!params || Object.keys(params).length === 0) return ''
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => {
      if (typeof v === 'string') return `${k}=${v}`
      if (typeof v === 'boolean') return `${k}=${v}`
      if (typeof v === 'number') return `${k}=${v}`
      return `${k}=${JSON.stringify(v)}`
    })
  return parts.length ? '  ' + parts.join(', ') : ''
}

/** 按 calls 顺序执行流程，每步使用 globalParams 与 call.params 合并后的参数 */
export async function runFlow(args: {
  ctx: FlowContext
  registry: StepRegistry
  calls: FlowStepCall[]
  globalParams?: FlowStepParams
  options?: FlowRunOptions
}) {
  const { ctx, registry, calls, globalParams, options } = args
  const stepDelayMs = options?.stepDelayMs ?? DEFAULT_STEP_DELAY_MS

  for (let i = 0; i < calls.length; i += 1) {
    const call = calls[i]
    const step = registry.get(call.id)
    if (!step) {
      throw createStepError(call.id, 'params', '未知 step id', {
        availableSteps: listAvailableSteps(registry),
      })
    }

    const params = {
      ...(globalParams ?? {}),
      ...(call.params ?? {}),
    }

    const paramStr = formatStepParams(call.params)
    const desc = step.description ? `  # ${step.description}` : ''
    console.log(`[ai-control] ${i + 1}/${calls.length} ${call.id}${paramStr}${desc}`)
    try {
      await step.run(ctx, params)
    } catch (e) {
      if (isStepError(e)) throw e
      throw createStepError(
        call.id,
        'execute',
        '步骤执行失败',
        { originalMessage: e instanceof Error ? e.message : String(e) },
        e,
      )
    }
    await maybeWait(stepDelayMs)
  }
}
