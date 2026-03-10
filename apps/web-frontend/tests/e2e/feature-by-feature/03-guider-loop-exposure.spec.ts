import { test } from '@playwright/test'
import { runFeatureFlow } from './_shared'

test('导星循环曝光功能（动作后回归拍摄保存）', async ({ page }, testInfo) => {
  await runFeatureFlow({
    page,
    testInfo,
    minTestTimeoutMs: 10 * 60_000,
    calls: [
      { id: 'device.gotoHome' },
      { id: 'menu.disconnectAll' },
      { id: 'device.ensureDeviceSidebarFor', params: { driverType: 'MainCamera' } },
      { id: 'device.connectIfNeeded', params: { deviceType: 'MainCamera', driverType: 'MainCamera' } },
      { id: 'device.ensureDeviceSidebarFor', params: { driverType: 'GuiderCamera' } },
      {
        id: 'device.connectIfNeeded',
        params: { deviceType: 'GuiderCamera', driverType: 'GuiderCamera', allowFailure: true },
      },
      { id: 'guider.openChartPanel' },
      { id: 'guider.loopExposureOn', params: { driverType: 'GuiderCamera', allowDisconnected: true } },
      { id: 'guider.loopExposureOff', params: { driverType: 'GuiderCamera', allowDisconnected: true } },
      { id: 'guider.loopExposureOnAndWaitImage', params: { driverType: 'GuiderCamera', allowDisconnected: true } },
      { id: 'guider.loopExposureOff', params: { driverType: 'GuiderCamera', allowDisconnected: true, bestEffort: true } },

      // 导星功能动作后，回归主相机拍摄保存
      { id: 'device.ensureCapturePanel' },
      { id: 'device.captureOnce' },
      { id: 'device.save' },
    ],
  })
})
