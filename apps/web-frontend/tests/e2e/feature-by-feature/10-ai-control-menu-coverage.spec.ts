import { expect, test } from '@playwright/test'
import { makeAiControlRegistry, runFlow, type FlowContext, type FlowStepCall } from '../../../AI-Control'

declare const require: (id: string) => any
declare const process: { env: Record<string, string | undefined> }

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { DEFAULTS, envFlag, envNumber, envString } = require('../../../e2e.config.cjs')

function setupAiControlContext(args: { page: FlowContext['page']; testInfo: FlowContext['testInfo']; minTestTimeoutMs?: number }) {
  const { page, testInfo, minTestTimeoutMs = 0 } = args
  const uiTimeoutMs = envNumber(process.env, 'E2E_UI_TIMEOUT_MS', DEFAULTS.flow.uiTimeoutMs)
  const stepTimeoutMs = envNumber(process.env, 'E2E_STEP_TIMEOUT_MS', DEFAULTS.flow.stepTimeoutMs)
  const testTimeoutMs = envNumber(process.env, 'E2E_TEST_TIMEOUT_MS', DEFAULTS.flow.testTimeoutMs)

  page.setDefaultTimeout(uiTimeoutMs)
  page.setDefaultNavigationTimeout(stepTimeoutMs)
  testInfo.setTimeout(Math.max(testTimeoutMs, minTestTimeoutMs))

  return { page, testInfo, uiTimeoutMs, stepTimeoutMs }
}

function makeGlobalParams() {
  return {
    deviceType: envString(process.env, 'E2E_DEVICE_TYPE', DEFAULTS.flow.deviceType ?? 'MainCamera'),
    driverType: envString(process.env, 'E2E_DEVICE_TYPE', DEFAULTS.flow.deviceType ?? 'MainCamera'),
    driverText: envString(process.env, 'E2E_DRIVER_TEXT', DEFAULTS.flow.qhyDriverText),
    connectionModeText: envString(process.env, 'E2E_CONNECTION_MODE_TEXT', DEFAULTS.flow.qhyConnectionModeText),
    doSave: envFlag(process.env, 'E2E_DO_SAVE', DEFAULTS.flow.qhyDoSave),
    waitCaptureTimeoutMs: envNumber(
      process.env,
      'E2E_WAIT_CAPTURE_TIMEOUT_MS',
      DEFAULTS.flow.qhyWaitCaptureTimeoutMs,
    ),
    downloadDir: envString(process.env, 'E2E_DOWNLOAD_DIR', DEFAULTS.flow.downloadDir),
  }
}

test('AI-Control 菜单覆盖验证', async ({ page }, testInfo) => {
  const ctx = setupAiControlContext({ page, testInfo, minTestTimeoutMs: 14 * 60_000 })
  const registry = makeAiControlRegistry()
  const globalParams = makeGlobalParams()

  async function runCalls(calls: FlowStepCall[]) {
    await runFlow({
      ctx,
      registry,
      calls,
      globalParams,
    })
  }

  await runCalls([
    { id: 'ui.gotoHome' },
    { id: 'device.connectIfNeeded', params: { deviceType: 'MainCamera', driverType: 'MainCamera' } },
  ])

  await runCalls([{ id: 'menu.openDisconnectAllConfirm' }])
  await expect(page.getByTestId('ui-confirm-dialog-root').first()).toHaveAttribute('data-action', 'disconnectAllDevice')
  await runCalls([{ id: 'menu.confirmDialogCancel' }])

  await runCalls([{ id: 'menu.openPowerManager' }])
  await expect(page.getByTestId('ui-power-manager-root').first()).toHaveAttribute('data-state', 'open')
  await runCalls([{ id: 'capture.panel.ensureOpen', params: { deviceType: 'MainCamera' } }])

  await runCalls([{ id: 'menu.openDebugLog' }])
  await expect(page.getByTestId('ui-indi-debug-dialog-root').first()).toHaveAttribute('data-state', 'open')
  await runCalls([{ id: 'ui.click', params: { testId: 'ui-indi-debug-dialog-btn-close' } }])
  await expect(page.getByTestId('ui-indi-debug-dialog-root').first()).toHaveAttribute('data-state', 'closed')

  await runCalls([{ id: 'menu.openGeneralSettings' }])
  await expect(page.getByTestId('ui-view-settings-dialog-root').first()).toHaveAttribute('data-state', 'open')
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('ui-view-settings-dialog-root').first()).toHaveAttribute('data-state', 'closed')

  await runCalls([{ id: 'menu.openDeviceAllocation' }])
  await expect(page.getByTestId('dap-root').first()).toHaveAttribute('data-state', 'open')
  await runCalls([{ id: 'ui.click', params: { testId: 'dap-act-close-panel' } }])
  await expect(page.getByTestId('dap-root').first()).toHaveAttribute('data-state', 'closed')

  await runCalls([{ id: 'menu.openImageManager' }])
  await expect(page.getByTestId('imp-root').first()).toHaveAttribute('data-state', 'open')
  await runCalls([{ id: 'ui.click', params: { testId: 'imp-btn-panel-close' } }])
  await expect(page.getByTestId('imp-root').first()).toHaveAttribute('data-state', 'closed')

  await runCalls([{ id: 'menu.openLocationDialog' }])
  await expect(page.getByTestId('ui-location-dialog-root').first()).toHaveAttribute('data-state', 'open')
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('ui-location-dialog-root').first()).toHaveAttribute('data-state', 'closed')

  await runCalls([{ id: 'menu.openDataCredits' }])
  await expect(page.getByTestId('ui-data-credits-dialog-root').first()).toHaveAttribute('data-state', 'open')
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('ui-data-credits-dialog-root').first()).toHaveAttribute('data-state', 'closed')

  await runCalls([{ id: 'menu.openRefreshConfirm' }])
  await expect(page.getByTestId('ui-confirm-dialog-root').first()).toHaveAttribute('data-action', 'Refresh')
  await runCalls([{ id: 'menu.confirmDialogCancel' }])

  await runCalls([{ id: 'menu.openPolarAxisCalibration' }])
  await expect(page.getByTestId('pa-widget').first()).toBeVisible()
  await expect(page.getByTestId('gui-btn-quit-polar-axis-mode').first()).toBeVisible()
  await runCalls([{ id: 'ui.click', params: { testId: 'gui-btn-quit-polar-axis-mode' } }])
  await expect(page.getByTestId('gui-btn-quit-polar-axis-mode').first()).not.toBeVisible()
})
