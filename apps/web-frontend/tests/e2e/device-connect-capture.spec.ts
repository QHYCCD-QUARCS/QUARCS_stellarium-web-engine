/**
 * 通用设备（主相机）连接 -> 拍摄一次 -> （可选）保存
 *
 * 前提：
 * - 你已启动前端 dev server，并设置 E2E_BASE_URL
 * - 目标机器的设备/后端环境就绪（能完成连接与拍摄）
 *
 * 运行示例：
 *   E2E_BASE_URL=http://127.0.0.1:8080 \
 *   E2E_DRIVER_TEXT=QHYCCD \
 *   E2E_CONNECTION_MODE_TEXT=SDK \
 *   E2E_DEVICE_TYPE=MainCamera \
 *   npx playwright test tests/e2e/device-connect-capture.spec.ts --headed
 */

import { test } from '@playwright/test'
import { runFlowByIds } from './flows/flowRunner'
import { makeDeviceStepRegistry } from './flows/deviceSteps'

// 统一配置入口（所有默认值/环境变量含义都在这里）
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { DEFAULTS, envFlag, envNumber, envString } = require('../../e2e.config.cjs')

test('Device connect -> capture -> save', async ({ page }) => {
  const UI_TIMEOUT_MS = envNumber(process.env, 'E2E_UI_TIMEOUT_MS', DEFAULTS.flow.uiTimeoutMs)
  const STEP_TIMEOUT_MS = envNumber(process.env, 'E2E_STEP_TIMEOUT_MS', DEFAULTS.flow.stepTimeoutMs)

  page.setDefaultTimeout(UI_TIMEOUT_MS)
  page.setDefaultNavigationTimeout(STEP_TIMEOUT_MS)

  const waitCaptureTimeoutMs = envNumber(
    process.env,
    'E2E_WAIT_CAPTURE_TIMEOUT_MS',
    DEFAULTS.flow.qhyWaitCaptureTimeoutMs,
  )
  test.setTimeout(Math.max(90_000, waitCaptureTimeoutMs + 60_000))

  const registry = makeDeviceStepRegistry()
  await runFlowByIds({
    ctx: { page, testInfo: test.info(), uiTimeoutMs: UI_TIMEOUT_MS, stepTimeoutMs: STEP_TIMEOUT_MS },
    registry,
    stepIds: [
      'device.gotoHome',
      'device.ensureDeviceSidebar',
      'device.connectIfNeeded',
      'device.ensureCapturePanel',
      'device.captureOnce',
      'device.save',
    ],
    params: {
      deviceType: envString(process.env, 'E2E_DEVICE_TYPE', DEFAULTS.flow.deviceType ?? 'MainCamera'),
      driverText: envString(process.env, 'E2E_DRIVER_TEXT', DEFAULTS.flow.qhyDriverText),
      connectionModeText: envString(process.env, 'E2E_CONNECTION_MODE_TEXT', DEFAULTS.flow.qhyConnectionModeText),
      doSave: envFlag(process.env, 'E2E_DO_SAVE', DEFAULTS.flow.qhyDoSave),
      waitCaptureTimeoutMs,
      downloadDir: envString(process.env, 'E2E_DOWNLOAD_DIR', DEFAULTS.flow.downloadDir),
    },
  })
})

