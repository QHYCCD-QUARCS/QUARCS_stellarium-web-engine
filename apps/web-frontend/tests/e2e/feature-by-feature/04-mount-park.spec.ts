import { test } from '@playwright/test'
import { runFeatureFlow } from './_shared'

test('赤道仪 Park 功能（动作后回归拍摄保存）', async ({ page }, testInfo) => {
  await runFeatureFlow({
    page,
    testInfo,
    minTestTimeoutMs: 10 * 60_000,
    calls: [
      { id: 'device.gotoHome' },
      { id: 'menu.disconnectAll' },
      { id: 'device.ensureDeviceSidebarFor', params: { driverType: 'MainCamera' } },
      { id: 'device.connectIfNeeded', params: { deviceType: 'MainCamera', driverType: 'MainCamera' } },
      { id: 'device.ensureDeviceSidebarFor', params: { driverType: 'Mount' } },
      { id: 'device.connectIfNeeded', params: { deviceType: 'Mount', driverType: 'Mount' } },
      { id: 'mount.ensureParkedForTest' },
      { id: 'device.ensureCapturePanel' },
      { id: 'device.captureOnce' },
      { id: 'device.save' },
    ],
  })
})
