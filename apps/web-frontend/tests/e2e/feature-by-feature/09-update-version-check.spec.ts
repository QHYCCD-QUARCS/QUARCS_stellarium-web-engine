import { test } from '@playwright/test'
import { runFeatureFlow } from './_shared'

test('更新版本读取与校验（完成后回归拍摄保存）', async ({ page }, testInfo) => {
  const hasExpectedVersion = Boolean(process.env.E2E_EXPECT_TOTAL_VERSION)

  const calls: Array<{ id: string; params?: Record<string, any> }> = [{ id: 'device.gotoHome' }]
  if (hasExpectedVersion) {
    calls.push({ id: 'update.assertTotalVersion' })
  } else {
    calls.push({ id: 'update.readTotalVersion' })
  }

  // 更新相关动作后，回归拍摄保存
  calls.push({ id: 'menu.disconnectAll' })
  calls.push({ id: 'device.ensureDeviceSidebarFor', params: { driverType: 'MainCamera' } })
  calls.push({ id: 'device.connectIfNeeded', params: { deviceType: 'MainCamera', driverType: 'MainCamera' } })
  calls.push({ id: 'device.ensureCapturePanel' })
  calls.push({ id: 'device.captureOnce' })
  calls.push({ id: 'device.save' })

  await runFeatureFlow({
    page,
    testInfo,
    minTestTimeoutMs: 15 * 60_000,
    calls,
  })
})
