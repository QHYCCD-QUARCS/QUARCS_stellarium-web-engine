import { test } from '@playwright/test'
import { runFeatureFlow } from './_shared'

test('主相机曝光矩阵（每次改参后拍摄保存）', async ({ page }, testInfo) => {
  const exposures = (process.env.E2E_EXPOSURE_MATRIX || '1ms,10ms,100ms,1s,5s,10s')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const calls: Array<{ id: string; params?: Record<string, any> }> = [
    { id: 'device.gotoHome' },
    { id: 'menu.disconnectAll' },
    { id: 'device.ensureDeviceSidebarFor' },
    { id: 'device.connectIfNeeded' },
    { id: 'device.ensureCapturePanel' },
  ]

  for (const exposure of exposures) {
    calls.push({ id: 'device.setExposureTime', params: { exposure } })
    calls.push({ id: 'device.captureOnce' })
    calls.push({ id: 'device.save' })
  }

  await runFeatureFlow({
    page,
    testInfo,
    minTestTimeoutMs: 15 * 60_000,
    calls,
  })
})
