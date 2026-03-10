/**
 * 版本验证测试
 * 验证系统总版本号是否为期望值
 *
 * 运行：
 *   cd apps/web-frontend
 *   E2E_EXPECT_TOTAL_VERSION=1.0.2 npx playwright test tests/e2e/verify-version.spec.ts --workers=1
 */

import { test, expect } from '@playwright/test'
import { runFlow } from './flows/flowRunner'
import type { StepRegistry } from './flows/flowTypes'
import { makeUpdateStepRegistry } from './flows/updateSteps'
import { makeUiAtomicStepRegistry } from './flows/uiAtomicSteps'
import { makeDeviceStepRegistry } from './flows/deviceSteps'

// 统一配置入口
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { DEFAULTS, envNumber } = require('../../e2e.config.cjs')

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

test('验证系统版本号', async ({ page }, testInfo) => {
  const uiTimeoutMs = envNumber(process.env, 'E2E_UI_TIMEOUT_MS', DEFAULTS.flow.uiTimeoutMs)
  const stepTimeoutMs = envNumber(process.env, 'E2E_STEP_TIMEOUT_MS', DEFAULTS.flow.stepTimeoutMs)
  page.setDefaultTimeout(uiTimeoutMs)
  page.setDefaultNavigationTimeout(stepTimeoutMs)

  // 设置较长的超时时间，因为更新后可能需要一些时间才能看到新版本
  test.setTimeout(
    Math.max(envNumber(process.env, 'E2E_TEST_TIMEOUT_MS', DEFAULTS.flow.testTimeoutMs), 5 * 60_000),
  )

  const registry = mergeRegistries(
    makeDeviceStepRegistry(),
    makeUpdateStepRegistry(),
    makeUiAtomicStepRegistry(),
  )

  // 判断当前是否为“断言模式”还是“探测模式”：
  // - 若设置了 E2E_EXPECT_TOTAL_VERSION，则运行断言步骤（用于最终验证更新结果）
  // - 若未设置，则仅从 UI 读取版本号并打印 UI_TOTAL_VERSION=...（供 autoTestAndUpdate.sh 解析）
  const hasExpected = !!process.env.E2E_EXPECT_TOTAL_VERSION

  const calls = hasExpected
    ? [
        // 进入应用主页，确保 UI/菜单契约都已加载
        { id: 'device.gotoHome' },
        // 断言总版本号已更新（带重试逻辑）
        { id: 'update.assertTotalVersion' },
      ]
    : [
        // 进入应用主页
        { id: 'device.gotoHome' },
        // 只读取并打印总版本号（不做断言）
        { id: 'update.readTotalVersion' },
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
