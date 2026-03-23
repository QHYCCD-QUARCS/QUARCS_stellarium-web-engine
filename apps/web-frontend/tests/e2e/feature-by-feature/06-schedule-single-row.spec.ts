import { test } from '@playwright/test'
import { runFeatureFlow } from './_shared'

test('计划任务单行全字段（每次改参后拍摄保存）', async ({ page }, testInfo) => {
  await runFeatureFlow({
    page,
    testInfo,
    minTestTimeoutMs: 20 * 60_000,
    calls: [
      { id: 'device.gotoHome' },
      { id: 'menu.disconnectAll' },
      { id: 'device.ensureDeviceSidebarFor', params: { driverType: 'MainCamera' } },
      { id: 'device.connectIfNeeded', params: { deviceType: 'MainCamera', driverType: 'MainCamera' } },
      { id: 'schedule.openIfClosed' },

      { id: 'schedule.setupRowFull', params: { row: 1, targetMode: 'currentPosition', exposurePreset: '10 s', reps: 3 } },
      { id: 'device.ensureCapturePanel' },
      { id: 'device.captureOnce' },
      { id: 'device.save' },

      { id: 'schedule.setExposureCustom', params: { row: 1, value: 2, unit: 's' } },
      { id: 'device.ensureCapturePanel' },
      { id: 'device.captureOnce' },
      { id: 'device.save' },

      { id: 'schedule.setReps', params: { row: 1, reps: 2 } },
      { id: 'device.ensureCapturePanel' },
      { id: 'device.captureOnce' },
      { id: 'device.save' },

      { id: 'schedule.startIfNotRunning' },
      { id: 'schedule.waitRunState', params: { state: 'running' } },
      { id: 'schedule.pauseIfRunning' },
      { id: 'schedule.waitRunState', params: { state: 'paused' } },
    ],
  })
})
