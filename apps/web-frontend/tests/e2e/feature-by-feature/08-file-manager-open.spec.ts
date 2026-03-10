import { test } from '@playwright/test'
import { runFeatureFlow } from './_shared'

test('图像管理打开文件（动作后回归拍摄保存）', async ({ page }, testInfo) => {
  await runFeatureFlow({
    page,
    testInfo,
    minTestTimeoutMs: 12 * 60_000,
    calls: [
      { id: 'device.gotoHome' },
      { id: 'menu.disconnectAll' },
      { id: 'device.ensureDeviceSidebarFor', params: { driverType: 'MainCamera' } },
      { id: 'device.connectIfNeeded', params: { deviceType: 'MainCamera', driverType: 'MainCamera' } },

      // 先拍一张并保存，保证文件管理至少有可用图像
      { id: 'device.ensureCapturePanel' },
      { id: 'device.captureOnce' },
      { id: 'device.save' },

      { id: 'fm.open' },
      { id: 'fm.openFolder', params: { folderIndex: Number(process.env.E2E_FM_FOLDER_INDEX || 0) } },
      {
        id: 'fm.openFile',
        params: {
          folderIndex: Number(process.env.E2E_FM_FOLDER_INDEX || 0),
          fileIndex: Number(process.env.E2E_FM_FILE_INDEX || 0),
          waitImageTimeoutMs: Number(process.env.E2E_FM_WAIT_IMAGE_TIMEOUT_MS || 60000),
        },
      },

      // 文件操作后再次回归拍摄保存
      { id: 'device.ensureCapturePanel' },
      { id: 'device.captureOnce' },
      { id: 'device.save' },
    ],
  })
})
