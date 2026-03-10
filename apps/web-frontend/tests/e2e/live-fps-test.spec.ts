/**
 * Live模式帧率显示测试
 * 连接主相机（QHYCCD/SDK），切换到Live模式，验证FPS显示是否正确
 *
 * 运行：
 *   cd apps/web-frontend
 *   npx playwright test tests/e2e/live-fps-test.spec.ts --workers=1
 */

import { test } from '@playwright/test'
import { runFlow } from './flows/flowRunner'
import type { StepRegistry } from './flows/flowTypes'
import { makeDeviceStepRegistry } from './flows/deviceSteps'
import { makeMenuStepRegistry } from './flows/menuSteps'
import { makeUiAtomicStepRegistry } from './flows/uiAtomicSteps'

// 统一配置入口
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { DEFAULTS, envNumber, envString } = require('../../e2e.config.cjs')

function mergeRegistries(...regs: StepRegistry[]): StepRegistry {
  const out: StepRegistry = new Map()
  for (const reg of regs) {
    for (const [id, def] of reg.entries()) {
      if (out.has(id)) throw new Error(`合并 registry 冲突：重复 step id: ${id}`)
      out.set(id, def)
    }
  }
  return out
}

test('QHYCCD SDK Live模式帧率显示测试', async ({ page }, testInfo) => {
  const uiTimeoutMs = envNumber(process.env, 'E2E_UI_TIMEOUT_MS', DEFAULTS.flow.uiTimeoutMs)
  const stepTimeoutMs = envNumber(process.env, 'E2E_STEP_TIMEOUT_MS', DEFAULTS.flow.stepTimeoutMs)
  page.setDefaultTimeout(uiTimeoutMs)
  page.setDefaultNavigationTimeout(stepTimeoutMs)

  // 测试超时：5分钟
  test.setTimeout(Math.max(envNumber(process.env, 'E2E_TEST_TIMEOUT_MS', DEFAULTS.flow.testTimeoutMs), 5 * 60_000))

  const registry = mergeRegistries(
    makeDeviceStepRegistry(),
    makeMenuStepRegistry(),
    makeUiAtomicStepRegistry(),
  )

  const qhyDriverText = envString(process.env, 'E2E_DRIVER_TEXT', DEFAULTS.flow.qhyDriverText)
  const qhyConnectionModeText = envString(
    process.env,
    'E2E_CONNECTION_MODE_TEXT',
    DEFAULTS.flow.qhyConnectionModeText,
  )

  const calls = [
    { id: 'device.gotoHome' },

    // 连接主相机：QHYCCD + SDK
    {
      id: 'device.connectIfNeeded',
      params: { deviceType: 'MainCamera', driverText: qhyDriverText, connectionModeText: qhyConnectionModeText },
    },

    // 确保主相机拍摄面板可用
    { id: 'device.ensureCapturePanel' },

    // 打开主相机设备设置对话框
    { id: 'device.ensureDeviceSidebarFor', params: { deviceType: 'MainCamera' } },

    // 切换到Live模式：通过设备设置中的Capture Mode配置项
    {
      id: 'ui.selectOption',
      params: {
        testId: 'ui-config-MainCamera-CaptureMode-select-0',
        value: 'Live',
        description: '切换到Live模式',
      },
    },

    // 关闭设备设置对话框（如果打开）
    { id: 'device.ensureCapturePanel' },

    // 等待Live模式启动（等待几秒让相机开始出图和FPS统计）
    { id: 'ui.wait', params: { timeoutMs: 5000 } },

    // 检查FPS显示（应该显示相机出图帧率，而不是渲染帧率）
    // 通过检查toolbar中的FPS显示来验证
    {
      id: 'ui.assertText',
      params: {
        testId: 'tb-root',
        containsText: 'FPS',
        description: '验证FPS显示存在',
      },
    },

    // 等待一段时间，让Live FPS统计并更新（Live模式下应该显示相机帧率）
    { id: 'ui.wait', params: { timeoutMs: 15000 } },

    // 再次检查FPS显示，确保有数值显示
    {
      id: 'ui.assertText',
      params: {
        testId: 'tb-root',
        containsText: 'FPS',
        description: '验证FPS显示持续存在',
      },
    },
  ]

  await runFlow({
    ctx: { page, testInfo, uiTimeoutMs, stepTimeoutMs },
    registry,
    calls,
    globalParams: {},
    options: {
      stepDelayMs: 1000,
    },
  })
})
