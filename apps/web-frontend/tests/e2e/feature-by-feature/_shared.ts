import type { Page, TestInfo } from '@playwright/test'
import { runFlow } from '../flows/flowRunner'
import type { FlowRunOptions, FlowStepCall, StepRegistry } from '../flows/flowTypes'
import { makeUiAtomicStepRegistry } from '../flows/uiAtomicSteps'
import { makeTestIdAliasRegistry } from '../flows/testIdAliasSteps'
import { makeDeviceStepRegistry } from '../flows/deviceSteps'
import { makeQhyccdStepRegistry } from '../flows/qhyccdSteps'
import { makeGuiderStepRegistry } from '../flows/guiderSteps'
import { makeMountStepRegistry } from '../flows/mountSteps'
import { makePolarAxisStepRegistry } from '../flows/polarAxisSteps'
import { makeScheduleStepRegistry } from '../flows/scheduleSteps'
import { makeMenuStepRegistry } from '../flows/menuSteps'
import { makeFileManagerStepRegistry } from '../flows/fileManagerSteps'
import { makeUpdateStepRegistry } from '../flows/updateSteps'
import { loadTestIdIndex } from '../ai/testIdIndex'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { DEFAULTS, envFlag, envNumber, envString } = require('../../../e2e.config.cjs')

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

export function makeFullRegistry(): StepRegistry {
  const index = loadTestIdIndex()
  return mergeRegistries(
    makeUiAtomicStepRegistry(),
    makeTestIdAliasRegistry(index),
    makeDeviceStepRegistry(),
    makeQhyccdStepRegistry(),
    makeGuiderStepRegistry(),
    makeMountStepRegistry(),
    makePolarAxisStepRegistry(),
    makeScheduleStepRegistry(),
    makeMenuStepRegistry(),
    makeFileManagerStepRegistry(),
    makeUpdateStepRegistry(),
  )
}

export function setupTimeouts(page: Page, testInfo: TestInfo, minTestTimeoutMs = 0) {
  const uiTimeoutMs = envNumber(process.env, 'E2E_UI_TIMEOUT_MS', DEFAULTS.flow.uiTimeoutMs)
  const stepTimeoutMs = envNumber(process.env, 'E2E_STEP_TIMEOUT_MS', DEFAULTS.flow.stepTimeoutMs)
  const testTimeoutMs = envNumber(process.env, 'E2E_TEST_TIMEOUT_MS', DEFAULTS.flow.testTimeoutMs)
  page.setDefaultTimeout(uiTimeoutMs)
  page.setDefaultNavigationTimeout(stepTimeoutMs)
  testInfo.setTimeout(Math.max(testTimeoutMs, minTestTimeoutMs))
  return { uiTimeoutMs, stepTimeoutMs }
}

export function baseCaptureParams() {
  return {
    deviceType: envString(process.env, 'E2E_DEVICE_TYPE', DEFAULTS.flow.deviceType ?? 'MainCamera'),
    driverType: envString(process.env, 'E2E_DEVICE_TYPE', DEFAULTS.flow.deviceType ?? 'MainCamera'),
    driverText: envString(process.env, 'E2E_DRIVER_TEXT', DEFAULTS.flow.qhyDriverText),
    connectionModeText: envString(process.env, 'E2E_CONNECTION_MODE_TEXT', DEFAULTS.flow.qhyConnectionModeText),
    doSave: envFlag(process.env, 'E2E_DO_SAVE', DEFAULTS.flow.qhyDoSave),
    waitCaptureTimeoutMs: envNumber(
      process.env,
      'E2E_WAIT_CAPTURE_TIMEOUT_MS',
      DEFAULTS.flow.qhyWaitCaptureTimeoutMs,
    ),
    downloadDir: envString(process.env, 'E2E_DOWNLOAD_DIR', DEFAULTS.flow.downloadDir),
  }
}

export async function runFeatureFlow(args: {
  page: Page
  testInfo: TestInfo
  calls: FlowStepCall[]
  params?: Record<string, any>
  options?: FlowRunOptions
  minTestTimeoutMs?: number
}) {
  const { page, testInfo, calls, params, options, minTestTimeoutMs } = args
  const { uiTimeoutMs, stepTimeoutMs } = setupTimeouts(page, testInfo, minTestTimeoutMs ?? 0)
  const registry = makeFullRegistry()
  await runFlow({
    ctx: { page, testInfo, uiTimeoutMs, stepTimeoutMs },
    registry,
    calls,
    globalParams: {
      ...baseCaptureParams(),
      ...(params ?? {}),
    },
    options,
  })
}
