/**
 * QHYCCD 可组合 Flow Runner（确定性 steps + 自由组合）
 *
 * 使用方式（CLI）：
 *   E2E_BASE_URL=http://127.0.0.1:8080 \
 *   E2E_FLOW_JSON='["qhy.gotoHome","qhy.ensureDeviceSidebar","qhy.connectIfNeeded","qhy.ensureCapturePanel","qhy.captureOnce","qhy.save"]' \
 *   E2E_FLOW_PARAMS_JSON='{"driverText":"QHYCCD","connectionModeText":"SDK","doSave":true,"waitCaptureTimeoutMs":180000,"downloadDir":"./playwright-downloads"}' \
 *   npx playwright test tests/e2e/qhyccd-flow-runner.spec.ts --headed
 *
 * 也支持逗号分隔：
 *   E2E_FLOW="qhy.gotoHome,qhy.connectIfNeeded,qhy.captureOnce"
 */

import { test, expect } from '@playwright/test'
import { makeQhyccdStepRegistry } from './flows/qhyccdSteps'
import { parseFlowFromEnv, parseFlowParamsFromEnv, runFlowByIds } from './flows/flowRunner'

// 统一配置入口（所有默认值/环境变量含义都在这里）
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { DEFAULTS, envNumber } = require('../../e2e.config.cjs')

test('QHYCCD composable flow runner', async ({ page }, testInfo) => {
  // 默认约束：UI 交互不超过 2s；后端相关步骤不超过 30s（可通过 env 覆盖）
  const uiTimeoutMs = envNumber(process.env, 'E2E_UI_TIMEOUT_MS', DEFAULTS.flow.uiTimeoutMs)
  const stepTimeoutMs = envNumber(process.env, 'E2E_STEP_TIMEOUT_MS', DEFAULTS.flow.stepTimeoutMs)

  page.setDefaultTimeout(uiTimeoutMs)
  page.setDefaultNavigationTimeout(stepTimeoutMs)

  // 总超时：给到分钟级（主要为了 capture 等待）；也可由外层 CLI/MCP 用 --timeout 控制
  test.setTimeout(envNumber(process.env, 'E2E_TEST_TIMEOUT_MS', DEFAULTS.flow.testTimeoutMs))

  const registry = makeQhyccdStepRegistry()

  const stepIds =
    parseFlowFromEnv() ??
    // 默认行为：与老的确定性用例一致
    [
      'qhy.gotoHome',
      'qhy.ensureDeviceSidebar',
      'qhy.connectIfNeeded',
      'qhy.ensureCapturePanel',
      'qhy.captureOnce',
      'qhy.save',
    ]

  const params = parseFlowParamsFromEnv()

  await runFlowByIds({
    ctx: { page, testInfo, uiTimeoutMs, stepTimeoutMs },
    registry,
    stepIds,
    params,
  })

  // 最小成功断言：最后页面仍在运行且没有导航崩溃
  expect(page.url()).toBeTruthy()
})

