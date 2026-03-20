import { expect } from '@playwright/test'
import type { FlowContext, StepRegistry } from '../core/flowTypes'
import { clickByTestId, clickLocator, sleep } from '../shared/interaction'
import { confirmDialogIfOpen, waitForConfirmDialogOpen } from '../menu/dialogSteps'

export type PowerConfirmMode = boolean | 'confirm' | 'cancel'

export type PowerManagementInteractParams = {
  output1?: boolean
  output2?: boolean
  restart?: PowerConfirmMode
  shutdown?: PowerConfirmMode
  forceUpdate?: PowerConfirmMode
}

function resolveConfirmMode(mode: PowerConfirmMode | undefined) {
  if (mode === 'cancel') return 'cancel' as const
  return 'confirm' as const
}

async function ensurePowerManagerOpen(ctx: FlowContext) {
  await expect(ctx.page.getByTestId('ui-power-manager-root').first()).toHaveAttribute('data-state', 'open', {
    timeout: ctx.stepTimeoutMs,
  })
}

async function currentOutputPowerState(ctx: FlowContext, index: 1 | 2) {
  const text = (await ctx.page.getByTestId(`ui-app-power-page-output-power-${index}`).first().textContent()) ?? ''
  if (/\[ON\]/i.test(text)) return true
  if (/\[OFF\]/i.test(text)) return false
  return null
}

async function setOutputPower(ctx: FlowContext, index: 1 | 2, wanted: boolean) {
  const current = await currentOutputPowerState(ctx, index)
  if (current === wanted) return

  await clickByTestId(ctx.page, `ui-app-power-page-output-power-${index}`, ctx.stepTimeoutMs)
  await sleep(300)
  if (wanted === false) {
    await confirmDialogIfOpen(ctx.page, 'confirm', ctx.stepTimeoutMs, { expectedAction: 'SwitchOutPutPower' })
    await sleep(300)
  }

  await expect
    .poll(() => currentOutputPowerState(ctx, index), { timeout: Math.max(10_000, ctx.stepTimeoutMs) })
    .toBe(wanted)
}

async function runConfirmableAction(
  ctx: FlowContext,
  testId: string,
  expectedAction: string,
  mode: PowerConfirmMode | undefined,
) {
  if (mode == null || mode === false) return
  await ctx.page
    .getByTestId('ui-power-manager-root')
    .first()
    .locator('div[style*="overflow-y: auto"]')
    .first()
    .evaluate((el) => {
      ;(el as HTMLElement).scrollTop = (el as HTMLElement).scrollHeight
    })
    .catch(() => {})
  const button = ctx.page.getByTestId(testId).first()
  await button.scrollIntoViewIfNeeded().catch(() => {})
  await clickLocator(button, ctx.stepTimeoutMs)
  await sleep(250)
  await waitForConfirmDialogOpen(ctx.page, Math.min(5_000, ctx.stepTimeoutMs), { expectedAction }).catch(() => null)
  if (resolveConfirmMode(mode) === 'cancel') {
    await ctx.page.keyboard.press('Escape').catch(() => {})
    await sleep(250)
    await confirmDialogIfOpen(ctx.page, 'cancel', ctx.stepTimeoutMs).catch(() => null)
  } else {
    await confirmDialogIfOpen(ctx.page, 'confirm', ctx.stepTimeoutMs)
  }
  await sleep(250)
}

function hasAnyInteraction(params: PowerManagementInteractParams | undefined) {
  if (!params || typeof params !== 'object') return false
  return (
    typeof params.output1 === 'boolean' ||
    typeof params.output2 === 'boolean' ||
    params.restart != null ||
    params.shutdown != null ||
    params.forceUpdate != null
  )
}

export function makePowerManagementStepRegistry(): StepRegistry {
  const registry: StepRegistry = new Map()

  registry.set('power.applyInteract', {
    async run(ctx, params: PowerManagementInteractParams) {
      if (!hasAnyInteraction(params)) return
      await ensurePowerManagerOpen(ctx)

      if (typeof params.output1 === 'boolean') {
        await setOutputPower(ctx, 1, params.output1)
      }
      if (typeof params.output2 === 'boolean') {
        await setOutputPower(ctx, 2, params.output2)
      }
      await runConfirmableAction(ctx, 'ui-app-power-page-restart', 'RestartRaspberryPi', params.restart)
      await runConfirmableAction(ctx, 'ui-app-power-page-shutdown', 'ShutdownRaspberryPi', params.shutdown)
      await runConfirmableAction(ctx, 'ui-app-power-page-force-update', 'ForceUpdate', params.forceUpdate)
    },
  })

  return registry
}
