import { expect } from '@playwright/test'
import type { FlowContext, StepRegistry } from '../core/flowTypes'
import {
  closeStatefulDialogByButtonIfOpen,
  closeStatefulDialogByEscapeIfOpen,
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
      await closeStatefulDialogByEscapeIfOpen(ctx.page, params.timeoutMs ?? ctx.stepTimeoutMs, {
        rootTestId: 'ui-location-dialog-root',
      })
    },
  })

  registry.set('menu.closeDataCredits', {
    async run(ctx, params) {
      await closeStatefulDialogByEscapeIfOpen(ctx.page, params.timeoutMs ?? ctx.stepTimeoutMs, {
        rootTestId: 'ui-data-credits-dialog-root',
      })
    },
  })

  registry.set('menu.closeDebugLog', {
    async run(ctx, params) {
      await closeStatefulDialogByEscapeIfOpen(ctx.page, params.timeoutMs ?? ctx.stepTimeoutMs, {
        rootTestId: 'ui-indi-debug-dialog-root',
      })
    },
  })

  registry.set('menu.closeSchedulePanel', {
    async run(ctx, params) {
      const timeout = params.timeoutMs ?? ctx.stepTimeoutMs
      const root = ctx.page.getByTestId('scp-root').first()
      const state = await root.getAttribute('data-state').catch(() => null)
      if (state !== 'open') return

      const preset = ctx.page.getByTestId('scp-preset-dialog-root').first()
      if (await preset.isVisible().catch(() => false)) {
        await clickByTestId(ctx.page, 'scp-preset-btn-close', timeout)
        await sleep(200)
      }

      await clickByTestId(ctx.page, 'scp-btn-close-panel', timeout)
      await expect(root).toHaveAttribute('data-state', 'closed', { timeout })
    },
  })

  registry.set('menu.closeUsbFiles', {
    async run(ctx, params) {
      await closeStatefulDialogByButtonIfOpen(ctx.page, params.timeoutMs ?? ctx.stepTimeoutMs, {
        rootTestId: 'ui-usbfiles-dialog-root',
        closeButtonTestId: 'ui-usbfiles-dialog-btn-blue-text',
      })
    },
  })

  registry.set('menu.closePlanetsVisibility', {
    async run(ctx, params) {
      await closeStatefulDialogByButtonIfOpen(ctx.page, params.timeoutMs ?? ctx.stepTimeoutMs, {
        rootTestId: 'ui-planets-visibility-root',
        closeButtonTestId: 'ui-planets-visibility-btn-close',
      })
    },
  })

  registry.set('menu.closeRaDecDialog', {
    async run(ctx, params) {
      await closeStatefulDialogByButtonIfOpen(ctx.page, params.timeoutMs ?? ctx.stepTimeoutMs, {
        rootTestId: 'ui-ra-dec-dialog-root',
        closeButtonTestId: 'ui-ra-dec-dialog-btn-on-cancel',
      })
    },
  })

  registry.set('menu.closeSettingsDialogMount', {
    async run(ctx, params) {
      await closeStatefulDialogByButtonIfOpen(ctx.page, params.timeoutMs ?? ctx.stepTimeoutMs, {
        rootTestId: 'ui-settings-dialog-mount-root',
        closeButtonTestId: 'ui-settings-dialog-mount-btn-close-dialog',
      })
    },
  })

  registry.set('menu.closeSettingsDialogGuider', {
    async run(ctx, params) {
      await closeStatefulDialogByButtonIfOpen(ctx.page, params.timeoutMs ?? ctx.stepTimeoutMs, {
        rootTestId: 'ui-settings-dialog-guider-root',
        closeButtonTestId: 'ui-settings-dialog-guider-btn-close-dialog',
      })
    },
  })

  registry.set('menu.closeSettingsDialogMainCamera', {
    async run(ctx, params) {
      await closeStatefulDialogByButtonIfOpen(ctx.page, params.timeoutMs ?? ctx.stepTimeoutMs, {
        rootTestId: 'ui-settings-dialog-main-camera-root',
        closeButtonTestId: 'ui-settings-dialog-main-camera-btn-close-dialog',
      })
    },
  })

  registry.set('menu.closeSettingsDialogFocuser', {
    async run(ctx, params) {
      await closeStatefulDialogByButtonIfOpen(ctx.page, params.timeoutMs ?? ctx.stepTimeoutMs, {
        rootTestId: 'ui-settings-dialog-focuser-root',
        closeButtonTestId: 'ui-settings-dialog-focuser-btn-close-dialog',
      })
    },
  })

  registry.set('menu.closeSettingsDialogCfw', {
    async run(ctx, params) {
      await closeStatefulDialogByButtonIfOpen(ctx.page, params.timeoutMs ?? ctx.stepTimeoutMs, {
        rootTestId: 'ui-settings-dialog-cfw-root',
        closeButtonTestId: 'ui-settings-dialog-cfw-btn-close-dialog',
      })
    },
  })

  registry.set('menu.closeSettingsDialogPoleCamera', {
    async run(ctx, params) {
      await closeStatefulDialogByButtonIfOpen(ctx.page, params.timeoutMs ?? ctx.stepTimeoutMs, {
        rootTestId: 'ui-settings-dialog-pole-camera-root',
        closeButtonTestId: 'ui-settings-dialog-pole-camera-btn-close-dialog',
      })
    },
  })

  return registry
}
