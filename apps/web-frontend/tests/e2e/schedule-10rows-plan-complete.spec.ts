/**
 * Schedule：10 行任务计划表（尽量覆盖所有列参数）-> Start -> 等待执行完成（回到 idle）
 *
 * 约定：
 * - 使用默认 E2E_BASE_URL（不在此处覆写）
 * - 该用例依赖“主相机已可连接并可被绑定”，否则 Schedule 启动会被 UI 阻止
 *
 * 运行（示例）：
 *   cd apps/web-frontend
 *   npx playwright test tests/e2e/schedule-10rows-plan-complete.spec.ts --workers=1
 */

import { test } from '@playwright/test'
import { runFlow } from './flows/flowRunner'
import type { StepRegistry } from './flows/flowTypes'
import { makeDeviceStepRegistry } from './flows/deviceSteps'
import { makeScheduleStepRegistry } from './flows/scheduleSteps'

// 统一配置入口（所有默认值/环境变量含义都在这里）
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

test('Schedule 10 rows plan should complete', async ({ page }, testInfo) => {
  const uiTimeoutMs = envNumber(process.env, 'E2E_UI_TIMEOUT_MS', DEFAULTS.flow.uiTimeoutMs)
  const stepTimeoutMs = envNumber(process.env, 'E2E_STEP_TIMEOUT_MS', DEFAULTS.flow.stepTimeoutMs)
  page.setDefaultTimeout(uiTimeoutMs)
  page.setDefaultNavigationTimeout(stepTimeoutMs)

  // Schedule 真实执行时间依赖设备/后端；这里给一个相对宽松的上限
  test.setTimeout(Math.max(envNumber(process.env, 'E2E_TEST_TIMEOUT_MS', DEFAULTS.flow.testTimeoutMs), 20 * 60_000))

  const registry = mergeRegistries(makeDeviceStepRegistry(), makeScheduleStepRegistry())

  const deviceType = envString(process.env, 'E2E_DEVICE_TYPE', DEFAULTS.flow.deviceType ?? 'MainCamera')
  const driverText = envString(process.env, 'E2E_DRIVER_TEXT', DEFAULTS.flow.qhyDriverText)
  const connectionModeText = envString(process.env, 'E2E_CONNECTION_MODE_TEXT', DEFAULTS.flow.qhyConnectionModeText)

  const calls = [
    // 设备连接前置（Schedule Start 需要 MainCamera 已绑定+已连接）
    { id: 'device.gotoHome' },
    { id: 'device.ensureDeviceSidebar' },
    { id: 'device.connectIfNeeded', params: { deviceType, driverText, connectionModeText } },
    { id: 'device.ensureCapturePanel' },

    // Schedule 基础清理
    { id: 'schedule.openIfClosed' },
    { id: 'schedule.waitRunState', params: { state: 'idle', timeoutMs: 60_000 } },
    { id: 'schedule.trimRows', params: { keepRows: 1 } },

    // Row 1：用“明确时间 -> 再切回 Now”来覆盖 setShootTime 的 hour/minute 参数，但不影响最终执行
    {
      id: 'schedule.setupRowFull',
      params: {
        row: 1,
        targetMode: 'name',
        targetName: 'M42',
        ra: '05h 35m 17s',
        dec: '-05° 23\' 28"',
        shootIsNow: true,
        shootHour: 0,
        shootMinute: 0,
        exposurePreset: '10 ms',
        filterIndex: 0,
        reps: 1,
        frameTypeIndex: 0, // Light
        refocusIndex: 1, // OFF（避免依赖 Focuser）
        expDelaySeconds: 0,
        timeoutMs: 60_000,
      },
    },
    { id: 'schedule.setShootTime', params: { row: 1, isNow: false, hour: 0, minute: 0, timeoutMs: 60_000 } },
    { id: 'schedule.setShootTime', params: { row: 1, isNow: true, timeoutMs: 60_000 } },

    // Row 2：currentPosition + 自定义曝光（ms）
    {
      id: 'schedule.setupRowFull',
      params: {
        row: 2,
        targetMode: 'currentPosition',
        ra: '12h 00m 00s',
        dec: '+00° 00\' 00"',
        shootIsNow: true,
        exposureValue: 5,
        exposureUnit: 'ms',
        filterIndex: 1,
        reps: 1,
        frameTypeIndex: 1, // Dark
        refocusIndex: 1,
        expDelaySeconds: 1,
        timeoutMs: 60_000,
      },
    },

    // Row 3：name + 1 ms + reps=2（覆盖 loop）
    {
      id: 'schedule.setupRowFull',
      params: {
        row: 3,
        targetMode: 'name',
        targetName: 'NGC7000',
        ra: '20h 58m 54s',
        dec: '+44° 19\' 00"',
        shootIsNow: true,
        exposurePreset: '1 ms',
        filterIndex: 2,
        reps: 2,
        frameTypeIndex: 2, // Bias
        refocusIndex: 1,
        expDelaySeconds: 0,
        timeoutMs: 60_000,
      },
    },

    // Row 4：currentPosition + 100 ms + delay=2
    {
      id: 'schedule.setupRowFull',
      params: {
        row: 4,
        targetMode: 'currentPosition',
        ra: '06h 45m 09s',
        dec: '-16° 42\' 58"',
        shootIsNow: true,
        exposurePreset: '100 ms',
        filterIndex: 3,
        reps: 1,
        frameTypeIndex: 3, // Flat
        refocusIndex: 1,
        expDelaySeconds: 2,
        timeoutMs: 60_000,
      },
    },

    // Row 5：自定义曝光（s）
    {
      id: 'schedule.setupRowFull',
      params: {
        row: 5,
        targetMode: 'currentPosition',
        ra: '10h 00m 00s',
        dec: '+10° 00\' 00"',
        shootIsNow: true,
        exposureValue: 1,
        exposureUnit: 's',
        filterIndex: 0,
        reps: 1,
        frameTypeIndex: 0,
        refocusIndex: 1,
        expDelaySeconds: 0,
        timeoutMs: 60_000,
      },
    },

    // Row 6：10 ms + reps=3
    {
      id: 'schedule.setupRowFull',
      params: {
        row: 6,
        targetMode: 'currentPosition',
        ra: '14h 15m 39s',
        dec: '-60° 50\' 02"',
        shootIsNow: true,
        exposurePreset: '10 ms',
        filterIndex: 1,
        reps: 3,
        frameTypeIndex: 1,
        refocusIndex: 1,
        expDelaySeconds: 0,
        timeoutMs: 60_000,
      },
    },

    // Row 7：1 s（略长一点）+ delay=1
    {
      id: 'schedule.setupRowFull',
      params: {
        row: 7,
        targetMode: 'currentPosition',
        ra: '16h 29m 24s',
        dec: '-26° 25\' 55"',
        shootIsNow: true,
        exposurePreset: '1 s',
        filterIndex: 2,
        reps: 1,
        frameTypeIndex: 0,
        refocusIndex: 1,
        expDelaySeconds: 1,
        timeoutMs: 60_000,
      },
    },

    // Row 8：Custom + ms
    {
      id: 'schedule.setupRowFull',
      params: {
        row: 8,
        targetMode: 'currentPosition',
        ra: '18h 36m 56s',
        dec: '+38° 47\' 01"',
        shootIsNow: true,
        exposureValue: 50,
        exposureUnit: 'ms',
        filterIndex: 3,
        reps: 1,
        frameTypeIndex: 2,
        refocusIndex: 1,
        expDelaySeconds: 0,
        timeoutMs: 60_000,
      },
    },

    // Row 9：100 ms + delay=0
    {
      id: 'schedule.setupRowFull',
      params: {
        row: 9,
        targetMode: 'currentPosition',
        ra: '02h 31m 49s',
        dec: '+89° 15\' 51"',
        shootIsNow: true,
        exposurePreset: '100 ms',
        filterIndex: 0,
        reps: 1,
        frameTypeIndex: 3,
        refocusIndex: 1,
        expDelaySeconds: 0,
        timeoutMs: 60_000,
      },
    },

    // Row 10：1 ms + delay=2
    {
      id: 'schedule.setupRowFull',
      params: {
        row: 10,
        targetMode: 'currentPosition',
        ra: '08h 40m 24s',
        dec: '+19° 59\' 18"',
        shootIsNow: true,
        exposurePreset: '1 ms',
        filterIndex: 1,
        reps: 1,
        frameTypeIndex: 1,
        refocusIndex: 1,
        expDelaySeconds: 2,
        timeoutMs: 60_000,
      },
    },

    // 少量断言：确认关键列确实被写入（避免只点击没生效）
    { id: 'schedule.assertCellContainsText', params: { row: 1, col: 1, text: 'M42' } },
    { id: 'schedule.assertCellContainsText', params: { row: 3, col: 6, text: '2' } },
    { id: 'schedule.assertCellContainsText', params: { row: 7, col: 4, text: '1 s' } },

    // 执行并等待完成
    { id: 'schedule.startIfNotRunning' },
    { id: 'schedule.assertUiDisabledWhenRunning' },
    { id: 'schedule.waitRunState', params: { state: 'idle', timeoutMs: 15 * 60_000 } },

    { id: 'schedule.closeIfOpen' },
  ]

  await runFlow({
    ctx: { page, testInfo, uiTimeoutMs, stepTimeoutMs },
    registry,
    calls,
    globalParams: {},
  })
})

