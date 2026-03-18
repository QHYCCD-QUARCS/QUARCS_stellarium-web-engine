import { expect } from '@playwright/test'
import type { FlowContext, StepRegistry } from '../core/flowTypes'
import { clickByTestId, sleep } from '../shared/interaction'

export type PolarAxisInteractParams = {
  autoCalibration?: boolean
  testSimulation?: boolean
  toggleCollapse?: boolean
  toggleTrajectory?: boolean
  minimize?: boolean
  expandFromMinimized?: boolean
  clearOldTrajectory?: boolean
  switchToWindowed?: boolean
  switchToFullscreen?: boolean
  closeTrajectory?: boolean
  quitPolarAxisMode?: boolean
}

async function ensurePolarWidgetOpen(ctx: FlowContext) {
  const widget = ctx.page.getByTestId('pa-widget').first()
  if (await widget.isVisible().catch(() => false)) return
  const minimized = ctx.page.getByTestId('pa-minimized').first()
  if (await minimized.isVisible().catch(() => false)) {
    await clickByTestId(ctx.page, 'pa-btn-expand-from-minimized', ctx.stepTimeoutMs)
  }
  await expect(widget).toBeVisible({ timeout: ctx.stepTimeoutMs })
}

async function ensureTrajectoryShown(ctx: FlowContext) {
  const btn = ctx.page.getByTestId('pa-btn-toggle-trajectory').first()
  const state = await btn.getAttribute('data-state').catch(() => null)
  if (state !== 'shown') {
    await clickByTestId(ctx.page, 'pa-btn-toggle-trajectory', ctx.stepTimeoutMs)
    await sleep(250)
  }
}

async function waitButtonState(ctx: FlowContext, testId: string, expectedState: string) {
  await expect(ctx.page.getByTestId(testId).first()).toHaveAttribute('data-state', expectedState, {
    timeout: ctx.stepTimeoutMs,
  })
}

function hasAnyInteract(params: PolarAxisInteractParams | undefined) {
  if (!params || typeof params !== 'object') return false
  return Object.values(params).some((value) => value === true)
}

function needsPolarWidgetOpen(params: PolarAxisInteractParams) {
  return (
    params.toggleCollapse === true
    || params.toggleTrajectory === true
    || params.autoCalibration === true
    || params.testSimulation === true
    || params.clearOldTrajectory === true
    || params.switchToWindowed === true
    || params.switchToFullscreen === true
    || params.closeTrajectory === true
    || params.minimize === true
  )
}

export function makePolarAxisStepRegistry(): StepRegistry {
  const registry: StepRegistry = new Map()

  registry.set('polarAxis.applyInteract', {
    async run(ctx, params: PolarAxisInteractParams) {
      if (!hasAnyInteract(params)) return

      if (params.expandFromMinimized === true) {
        const minimized = ctx.page.getByTestId('pa-minimized').first()
        if (await minimized.isVisible().catch(() => false)) {
          await clickByTestId(ctx.page, 'pa-btn-expand-from-minimized', ctx.stepTimeoutMs)
          await sleep(250)
        }
      }

      if (needsPolarWidgetOpen(params)) {
        await ensurePolarWidgetOpen(ctx)
      }

      if (params.toggleCollapse === true) {
        const widget = ctx.page.getByTestId('pa-widget').first()
        const current = await widget.getAttribute('data-state').catch(() => 'expanded')
        const expected = current === 'collapsed' ? 'expanded' : 'collapsed'
        await clickByTestId(ctx.page, 'pa-btn-toggle-collapse', ctx.stepTimeoutMs)
        await expect(widget).toHaveAttribute('data-state', expected, { timeout: ctx.stepTimeoutMs })
      }

      if (params.toggleTrajectory === true) {
        const btn = ctx.page.getByTestId('pa-btn-toggle-trajectory').first()
        const current = await btn.getAttribute('data-state').catch(() => 'hidden')
        const expected = current === 'shown' ? 'hidden' : 'shown'
        await clickByTestId(ctx.page, 'pa-btn-toggle-trajectory', ctx.stepTimeoutMs)
        await waitButtonState(ctx, 'pa-btn-toggle-trajectory', expected)
      }

      if (params.autoCalibration === true) {
        await clickByTestId(ctx.page, 'pa-btn-auto-calibration', ctx.stepTimeoutMs)
        await expect
          .poll(() => ctx.page.getByTestId('pa-root').first().getAttribute('data-state').catch(() => null), {
            timeout: Math.max(15_000, ctx.stepTimeoutMs),
          })
          .toBe('running')
      }

      if (params.testSimulation === true) {
        await clickByTestId(ctx.page, 'pa-btn-test-simulation', ctx.stepTimeoutMs)
        await sleep(250)
      }

      if (params.clearOldTrajectory === true) {
        await ensureTrajectoryShown(ctx)
        if (await ctx.page.getByTestId('pa-btn-clear-old-trajectory').first().isVisible().catch(() => false)) {
          await clickByTestId(ctx.page, 'pa-btn-clear-old-trajectory', ctx.stepTimeoutMs)
        } else {
          await clickByTestId(ctx.page, 'pa-btn-clear-old-trajectory-windowed', ctx.stepTimeoutMs)
        }
        await sleep(250)
      }

      if (params.switchToWindowed === true) {
        await ensureTrajectoryShown(ctx)
        await clickByTestId(ctx.page, 'pa-btn-switch-to-windowed', ctx.stepTimeoutMs)
        await expect(ctx.page.getByTestId('pa-trajectory-overlay-windowed').first()).toBeVisible({
          timeout: ctx.stepTimeoutMs,
        })
      }

      if (params.switchToFullscreen === true) {
        await ensureTrajectoryShown(ctx)
        await clickByTestId(ctx.page, 'pa-btn-switch-to-fullscreen', ctx.stepTimeoutMs)
        await expect(ctx.page.getByTestId('pa-trajectory-overlay-fullscreen').first()).toBeVisible({
          timeout: ctx.stepTimeoutMs,
        })
      }

      if (params.closeTrajectory === true) {
        await ensureTrajectoryShown(ctx)
        if (await ctx.page.getByTestId('pa-btn-trajectory-close').first().isVisible().catch(() => false)) {
          await clickByTestId(ctx.page, 'pa-btn-trajectory-close', ctx.stepTimeoutMs)
        } else {
          await clickByTestId(ctx.page, 'pa-btn-trajectory-close-windowed', ctx.stepTimeoutMs)
        }
        await waitButtonState(ctx, 'pa-btn-toggle-trajectory', 'hidden')
      }

      if (params.minimize === true) {
        await clickByTestId(ctx.page, 'pa-btn-minimize', ctx.stepTimeoutMs)
        await expect(ctx.page.getByTestId('pa-minimized').first()).toHaveAttribute('data-state', 'minimized', {
          timeout: ctx.stepTimeoutMs,
        })
      }

      if (params.quitPolarAxisMode === true) {
        await clickByTestId(ctx.page, 'gui-btn-quit-polar-axis-mode', ctx.stepTimeoutMs)
        await expect(ctx.page.getByTestId('gui-btn-quit-polar-axis-mode').first()).not.toBeVisible({
          timeout: ctx.stepTimeoutMs,
        })
        await expect(ctx.page.getByTestId('pa-widget').first()).not.toBeVisible({
          timeout: ctx.stepTimeoutMs,
        }).catch(() => {})
        await expect(ctx.page.getByTestId('pa-minimized').first()).not.toBeVisible({
          timeout: ctx.stepTimeoutMs,
        }).catch(() => {})
      }
    },
  })

  return registry
}
