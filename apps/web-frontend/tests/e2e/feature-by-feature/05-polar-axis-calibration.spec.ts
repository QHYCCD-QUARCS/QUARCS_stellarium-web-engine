import { test } from '@playwright/test'
import { runFeatureFlow } from './_shared'

test('极轴校准功能（结束后回归拍摄保存）', async ({ page }, testInfo) => {
  await runFeatureFlow({
    page,
    testInfo,
    minTestTimeoutMs: 15 * 60_000,
    calls: [
      { id: 'device.gotoHome' },
      { id: 'menu.disconnectAll' },
      { id: 'device.ensureDeviceSidebarFor', params: { driverType: 'MainCamera' } },
      { id: 'device.connectIfNeeded', params: { deviceType: 'MainCamera', driverType: 'MainCamera' } },
      { id: 'device.ensureDeviceSidebarFor', params: { driverType: 'Mount' } },
      { id: 'device.connectIfNeeded', params: { deviceType: 'Mount', driverType: 'Mount' } },
      { id: 'pa.open' },
      { id: 'pa.runOnce', params: { timeoutMs: Number(process.env.E2E_PA_TIMEOUT_MS || 300000) } },
      { id: 'pa.exitIfOpen' },
      { id: 'device.ensureCapturePanel' },
      { id: 'device.captureOnce' },
      { id: 'device.save' },
    ],
  })
})
