import { runFlow } from './flowRunner'
import type { FlowContext, FlowRunOptions, FlowStepCall, FlowStepParams, StepRegistry } from './flowTypes'
import { createStepError } from '../shared/errors'
import { evaluatePageStatus } from '../status/pageStatus'
import type { CliFlowParams } from '../scenario/cliFlows'
import { planRecoverySteps } from '../recovery/recoveryPlanner'

export async function buildCommandExecutionPlan(args: {
  ctx: FlowContext
  commandName: string
  flowParams?: CliFlowParams
  getFlowCallsByCommand: (commandName: string, params?: CliFlowParams) => FlowStepCall[]
}) {
  const { ctx, commandName, flowParams, getFlowCallsByCommand } = args
  const status = await evaluatePageStatus(ctx.page)
  const recoveryPlan = planRecoverySteps({
    commandName,
    status,
    flowParams,
  })
  const coreCalls = getFlowCallsByCommand(commandName, flowParams ?? {})
  return {
    status,
    recoveryPlan,
    coreCalls,
  }
}

export async function runCommandWithRecovery(args: {
  ctx: FlowContext
  registry: StepRegistry
  commandName: string
  flowParams?: CliFlowParams
  globalParams?: FlowStepParams
  options?: FlowRunOptions
  getFlowCallsByCommand: (commandName: string, params?: CliFlowParams) => FlowStepCall[]
}) {
  const { ctx, registry, commandName, flowParams, globalParams, options, getFlowCallsByCommand } = args
  const plan = await buildCommandExecutionPlan({
    ctx,
    commandName,
    flowParams,
    getFlowCallsByCommand,
  })

  const rejectedBlockers = plan.recoveryPlan.blockers.filter((item) => item.resolution === 'reject')
  if (rejectedBlockers.length > 0) {
    throw createStepError('command.recovery', 'precondition', '当前页面状态阻塞命令执行', {
      commandName,
      blockers: rejectedBlockers.map((item) => `${item.kind}:${item.reason}`),
    })
  }

  if (plan.recoveryPlan.preSteps.length > 0) {
    console.log(
      `[ai-control] 恢复层：执行 ${plan.recoveryPlan.preSteps.length} 个前置步骤`,
      plan.recoveryPlan.preSteps.map((s) => s.id).join(', '),
    )
    await runFlow({
      ctx,
      registry,
      calls: plan.recoveryPlan.preSteps,
      globalParams,
      options,
    })
  } else {
    console.log('[ai-control] 恢复层：无前置步骤，直接执行核心流程')
  }

  await runFlow({
    ctx,
    registry,
    calls: plan.coreCalls,
    globalParams,
    options,
  })

  return plan
}
