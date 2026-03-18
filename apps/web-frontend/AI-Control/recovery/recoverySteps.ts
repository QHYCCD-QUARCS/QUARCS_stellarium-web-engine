import { expect } from '@playwright/test'
import type { FlowContext, StepRegistry } from '../core/flowTypes'
import {
  confirmDialogIfOpen,
  disconnectDriverDialogIfOpen,
  imageManagerDialogIfOpen,
} from '../menu/dialogSteps'
import { clickByTestId, clickLocator, sleep, waitForTestIdState } from '../shared/interaction'
import { ensureGuiderUiVisible } from '../shared/navigation'

async function dismissBlockingOverlay(ctx: FlowContext, timeout: number) {
  const overlay = ctx.page.locator('.v-overlay.v-overlay--active').first()
  const overlayVisible = await overlay.isVisible().catch(() => false)
  if (!overlayVisible) return

  for (let i = 0; i < 3; i += 1) {
    await ctx.page.keyboard.press('Escape').catch(() => {})
    await sleep(250)
  }

  const scrim = ctx.page.locator('.v-overlay.v-overlay--active .v-overlay__scrim').first()
  if (await scrim.isVisible().catch(() => false)) {
    await scrim.click({ timeout }).catch(() => {})
    await sleep(300)
  }

  await overlay.waitFor({ state: 'hidden', timeout: Math.min(timeout, 6000) }).catch(() => {})
}

async function escapeCloseIfVisible(ctx: FlowContext, testId: string, timeout: number) {
  const root = ctx.page.getByTestId(testId).first()
  const visible = await root.isVisible().catch(() => false)
  if (!visible) return

  for (let i = 0; i < 3; i += 1) {
    await ctx.page.keyboard.press('Escape').catch(() => {})
    await sleep(250)
    if (!(await root.isVisible().catch(() => false))) return
  }

  await expect(root).not.toBeVisible({ timeout: Math.min(timeout, 5000) })
}

async function stopPolarAxisIfRunning(ctx: FlowContext, timeout: number) {
  const root = ctx.page.getByTestId('pa-root').first()
  const currentState = await root.getAttribute('data-state').catch(() => null)
  if (currentState !== 'running') return

  const minimized = ctx.page.getByTestId('pa-minimized').first()
  if (await minimized.isVisible().catch(() => false)) {
    const expandBtn = ctx.page.getByTestId('pa-btn-expand-from-minimized').first()
    if (await expandBtn.isVisible().catch(() => false)) {
      await clickLocator(expandBtn, timeout)
      await sleep(250)
    }
  }

  const stopBtn = ctx.page.getByTestId('pa-btn-auto-calibration').first()
  if (await stopBtn.isVisible().catch(() => false)) {
    await clickLocator(stopBtn, timeout)
  }

  await expect
    .poll(() => ctx.page.getByTestId('pa-root').first().getAttribute('data-state').catch(() => null), {
      timeout: Math.max(timeout, 15_000),
    })
    .not.toBe('running')
}

export function makeRecoveryStepRegistry(): StepRegistry {
  const registry: StepRegistry = new Map()

  registry.set('app.dismissBlockingOverlay', {
    async run(ctx, params) {
      await dismissBlockingOverlay(ctx, params.timeoutMs ?? ctx.stepTimeoutMs)
    },
  })

  registry.set('app.waitForCaptureIdle', {
    async run(ctx, params) {
      await waitForTestIdState(ctx.page, 'cp-status', 'idle', params.timeoutMs ?? ctx.stepTimeoutMs)
    },
  })

  registry.set('app.waitForGuiderIdle', {
    async run(ctx, params) {
      await expect(ctx.page.getByTestId('ui-chart-component-btn-start-press').first()).toHaveAttribute(
        'data-guiding',
        'false',
        { timeout: params.timeoutMs ?? Math.max(ctx.stepTimeoutMs, 15_000) },
      )
    },
  })

  registry.set('app.cancelGuiding', {
    async run(ctx, params) {
      const timeout = params.timeoutMs ?? Math.max(ctx.stepTimeoutMs, 15_000)
      await ensureGuiderUiVisible(ctx.page, timeout)
      const guiderBtn = ctx.page.getByTestId('ui-chart-component-btn-start-press').first()
      const guiding = await guiderBtn.getAttribute('data-guiding').catch(() => null)
      if (guiding === 'false') return
      await clickLocator(guiderBtn, timeout)
      await expect(guiderBtn).toHaveAttribute('data-guiding', 'false', { timeout })
    },
  })

  registry.set('app.waitForPolarAxisIdle', {
    async run(ctx, params) {
      await expect
        .poll(
          () => ctx.page.getByTestId('pa-root').first().getAttribute('data-state').catch(() => null),
          { timeout: params.timeoutMs ?? Math.max(ctx.stepTimeoutMs, 15_000) },
        )
        .not.toBe('running')
    },
  })

  registry.set('app.waitForAllocationClosed', {
    async run(ctx, params) {
      const root = ctx.page.getByTestId('dap-root').first()
      await expect(root).not.toBeVisible({ timeout: params.timeoutMs ?? ctx.stepTimeoutMs }).catch(async () => {
        await expect(root).toHaveAttribute('data-state', 'closed', { timeout: params.timeoutMs ?? ctx.stepTimeoutMs })
      })
    },
  })

  registry.set('menu.dialog.dismissConfirm', {
    async run(ctx, params) {
      await confirmDialogIfOpen(ctx.page, 'cancel', params.timeoutMs ?? ctx.stepTimeoutMs)
    },
  })

  registry.set('menu.dialog.dismissDisconnectDriver', {
    async run(ctx, params) {
      await disconnectDriverDialogIfOpen(ctx.page, 'cancel', params.timeoutMs ?? ctx.stepTimeoutMs)
    },
  })

  registry.set('menu.closePowerManager', {
    async run(ctx, params) {
      const root = ctx.page.getByTestId('ui-power-manager-root').first()
      if (!(await root.isVisible().catch(() => false))) return
      await clickByTestId(ctx.page, 'ui-power-manager-btn-close', params.timeoutMs ?? ctx.stepTimeoutMs)
      await expect(root).not.toBeVisible({ timeout: params.timeoutMs ?? ctx.stepTimeoutMs })
    },
  })

  registry.set('menu.closeImageManager', {
    async run(ctx, params) {
      const timeout = params.timeoutMs ?? ctx.stepTimeoutMs
      const root = ctx.page.getByTestId('imp-root').first()
      if (!(await root.isVisible().catch(() => false))) return

      await imageManagerDialogIfOpen(ctx.page, 'cancel', timeout, { dialog: 'usbConfirm' }).catch(() => null)
      await imageManagerDialogIfOpen(ctx.page, 'cancel', timeout, { dialog: 'deleteConfirm' }).catch(() => null)
      await imageManagerDialogIfOpen(ctx.page, 'cancel', timeout, { dialog: 'downloadConfirm' }).catch(() => null)
      await imageManagerDialogIfOpen(ctx.page, 'cancel', timeout, { dialog: 'downloadLocationReminder' }).catch(() => null)

      if (await root.isVisible().catch(() => false)) {
        await clickByTestId(ctx.page, 'imp-btn-panel-close', timeout)
      }
      await expect(root).not.toBeVisible({ timeout })
    },
  })

  registry.set('menu.closePolarAxis', {
    async run(ctx, params) {
      const timeout = params.timeoutMs ?? ctx.stepTimeoutMs
      const widget = ctx.page.getByTestId('pa-widget').first()
      const minimized = ctx.page.getByTestId('pa-minimized').first()
      const quitModeBtn = ctx.page.getByTestId('gui-btn-quit-polar-axis-mode').first()

      const widgetVisible = await widget.isVisible().catch(() => false)
      const minimizedVisible = await minimized.isVisible().catch(() => false)
      const quitModeVisible = await quitModeBtn.isVisible().catch(() => false)
      if (!widgetVisible && !minimizedVisible && !quitModeVisible) return

      await stopPolarAxisIfRunning(ctx, timeout)

      const fullscreenOverlay = ctx.page.getByTestId('pa-trajectory-overlay-fullscreen').first()
      if (await fullscreenOverlay.isVisible().catch(() => false)) {
        const closeBtn = ctx.page.getByTestId('pa-btn-trajectory-close').first()
        if (await closeBtn.isVisible().catch(() => false)) {
          await clickLocator(closeBtn, timeout)
          await sleep(250)
        }
      }
      const windowedOverlay = ctx.page.getByTestId('pa-trajectory-overlay-windowed').first()
      if (await windowedOverlay.isVisible().catch(() => false)) {
        const closeBtn = ctx.page.getByTestId('pa-btn-trajectory-close-windowed').first()
        if (await closeBtn.isVisible().catch(() => false)) {
          await clickLocator(closeBtn, timeout)
          await sleep(250)
        }
      }

      if (await quitModeBtn.isVisible().catch(() => false)) {
        await clickByTestId(ctx.page, 'gui-btn-quit-polar-axis-mode', timeout)
      } else if (widgetVisible && (await ctx.page.getByTestId('pa-btn-close').first().isVisible().catch(() => false))) {
        await clickByTestId(ctx.page, 'pa-btn-close', timeout)
      } else if (minimizedVisible && (await ctx.page.getByTestId('pa-btn-close-minimized').first().isVisible().catch(() => false))) {
        await clickByTestId(ctx.page, 'pa-btn-close-minimized', timeout)
      }

      await expect(quitModeBtn).not.toBeVisible({ timeout }).catch(() => {})
      await expect(widget).not.toBeVisible({ timeout }).catch(() => {})
      await expect(minimized).not.toBeVisible({ timeout }).catch(() => {})
    },
  })

  registry.set('menu.closeDeviceAllocation', {
    async run(ctx, params) {
      const closeBtn = ctx.page.getByTestId('dap-act-close-panel').first()
      if (await closeBtn.isVisible().catch(() => false)) {
        await clickLocator(closeBtn, params.timeoutMs ?? ctx.stepTimeoutMs)
      }
      const root = ctx.page.getByTestId('dap-root').first()
      await expect(root).not.toBeVisible({ timeout: params.timeoutMs ?? ctx.stepTimeoutMs }).catch(() => {})
    },
  })

  registry.set('menu.closeLocationDialog', {
    async run(ctx, params) {
      await escapeCloseIfVisible(ctx, 'ui-location-dialog-root', params.timeoutMs ?? ctx.stepTimeoutMs)
    },
  })

  registry.set('menu.closeDataCredits', {
    async run(ctx, params) {
      await escapeCloseIfVisible(ctx, 'ui-data-credits-dialog-root', params.timeoutMs ?? ctx.stepTimeoutMs)
    },
  })

  registry.set('menu.closeDebugLog', {
    async run(ctx, params) {
      await escapeCloseIfVisible(ctx, 'ui-indi-debug-dialog-root', params.timeoutMs ?? ctx.stepTimeoutMs)
    },
  })

  return registry
}
