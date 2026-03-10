import { test } from '@playwright/test'
import { runFeatureFlow } from './_shared'

test('设备连接方式切换（已连接先断开）', async ({ page }, testInfo) => {
  const modeA = process.env.E2E_CONNECTION_MODE_A || process.env.E2E_CONNECTION_MODE_TEXT || 'SDK'
  const modeB = process.env.E2E_CONNECTION_MODE_B || modeA

  await runFeatureFlow({
    page,
    testInfo,
    minTestTimeoutMs: 10 * 60_000,
    calls: [
      { id: 'device.gotoHome' },
      { id: 'menu.disconnectAll' },
      { id: 'device.ensureDeviceSidebarFor' },
      { id: 'device.connectIfNeeded', params: { connectionModeText: modeA } },
      { id: 'device.ensureCapturePanel' },
      { id: 'device.captureOnce' },
      { id: 'device.save' },

      // 切换连接方式前，必须先断开
      { id: 'menu.disconnectAll' },
      { id: 'device.ensureDeviceSidebarFor' },
      { id: 'device.connectIfNeeded', params: { connectionModeText: modeB } },
      { id: 'device.ensureCapturePanel' },
      { id: 'device.captureOnce' },
      { id: 'device.save' },
    ],
  })
})
