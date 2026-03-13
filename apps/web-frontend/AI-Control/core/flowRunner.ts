import type { FlowContext, FlowRunOptions, FlowStepCall, FlowStepParams, StepRegistry } from './flowTypes'

const DEFAULT_STEP_DELAY_MS = 200

export function mergeRegistries(...registries: StepRegistry[]): StepRegistry {
  const merged: StepRegistry = new Map()
  for (const registry of registries) {
    for (const [id, def] of registry.entries()) {
      if (merged.has(id)) {
        throw new Error(`AI-Control registry 冲突: ${id}`)
      }
      merged.set(id, def)
    }
  }
  return merged
}

function listAvailableSteps(registry: StepRegistry): string {
  return Array.from(registry.keys())
    .sort()
    .join(', ')
}

async function maybeWait(stepDelayMs: number) {
  if (stepDelayMs <= 0) return
  await new Promise((resolve) => setTimeout(resolve, stepDelayMs))
}

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
      throw new Error(`未知 step id: ${call.id}\n可用 steps: ${listAvailableSteps(registry)}`)
    }

    const params = {
      ...(globalParams ?? {}),
      ...(call.params ?? {}),
    }

    console.log(`[ai-control] ${i + 1}/${calls.length} ${call.id}`)
    await step.run(ctx, params)
    await maybeWait(stepDelayMs)
  }
}
