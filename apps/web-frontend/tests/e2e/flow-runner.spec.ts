/**
 * 通用可组合 Flow Runner（原子 steps + tid 别名 steps + 业务宏步骤）
 *
 * 运行（推荐新格式）：
 *   E2E_BASE_URL=http://127.0.0.1:8080 \
 *   E2E_FLOW_CALLS_JSON='[{"id":"ui.goto","params":{"url":"/"}},{"id":"tid.cp-btn-save.click"}]' \
 *   E2E_FLOW_PARAMS_JSON='{"waitCaptureTimeoutMs":180000}' \
 *   npx playwright test tests/e2e/flow-runner.spec.ts --headed --workers=1
 *
 * 兼容旧格式：
 *   E2E_FLOW_JSON='["qhy.gotoHome","qhy.captureOnce"]'
 */

import { test, expect } from '@playwright/test'
import { loadTestIdIndex } from './ai/testIdIndex'
import { parseFlowCallsFromEnv, parseFlowParamsFromEnv, runFlow } from './flows/flowRunner'
import type { StepRegistry } from './flows/flowTypes'
import { makeUiAtomicStepRegistry } from './flows/uiAtomicSteps'
import { makeTestIdAliasRegistry } from './flows/testIdAliasSteps'
import { makeQhyccdStepRegistry } from './flows/qhyccdSteps'
import { makeDeviceStepRegistry } from './flows/deviceSteps'
import { makeFileManagerStepRegistry } from './flows/fileManagerSteps'
import { makeMenuStepRegistry } from './flows/menuSteps'
import { makeScheduleStepRegistry } from './flows/scheduleSteps'
import { makeGuiderStepRegistry } from './flows/guiderSteps'
import { makePolarAxisStepRegistry } from './flows/polarAxisSteps'

// 统一配置入口（所有默认值/环境变量含义都在这里）
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

test('Composable flow runner', async ({ page }, testInfo) => {
  const uiTimeoutMs = envNumber(process.env, 'E2E_UI_TIMEOUT_MS', DEFAULTS.flow.uiTimeoutMs)
  const stepTimeoutMs = envNumber(process.env, 'E2E_STEP_TIMEOUT_MS', DEFAULTS.flow.stepTimeoutMs)

  page.setDefaultTimeout(uiTimeoutMs)
  page.setDefaultNavigationTimeout(stepTimeoutMs)

  test.setTimeout(envNumber(process.env, 'E2E_TEST_TIMEOUT_MS', DEFAULTS.flow.testTimeoutMs))

  const calls =
    parseFlowCallsFromEnv() ??
    // 默认：跑一套最小 smoke（只打开首页）
    [{ id: 'ui.goto', params: { url: '/' } }]

  const globalParams = parseFlowParamsFromEnv()

  const index = loadTestIdIndex()
  const registry = mergeRegistries(
    makeUiAtomicStepRegistry(),
    makeTestIdAliasRegistry(index),
    makeQhyccdStepRegistry(),
    makeDeviceStepRegistry(),
    makeFileManagerStepRegistry(),
    makeMenuStepRegistry(),
    makeScheduleStepRegistry(),
    makeGuiderStepRegistry(),
    makePolarAxisStepRegistry(),
  )

  await runFlow({
    ctx: { page, testInfo, uiTimeoutMs, stepTimeoutMs },
    registry,
    calls,
    globalParams,
  })

  expect(page.url()).toBeTruthy()
})

