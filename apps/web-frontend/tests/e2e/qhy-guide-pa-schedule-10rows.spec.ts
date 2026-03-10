/**
 * 主相机+导星相机（QHYCCD/SDK）+ 赤道仪（EQMod Mount）
 * -> 开启导星循环曝光
 * -> 进行一次极轴校准（结束后无论成功/失败都继续）
 * -> 写入 10 行任务计划表（尽量覆盖并显式设置所有列参数；尽量使用不同数据）
 *
 * 说明：
 * - baseURL 使用默认 `E2E_BASE_URL`（见 `apps/web-frontend/e2e.config.cjs`，当前默认 http://192.168.1.113:8080）
 * - 本用例只“写计划表并保存为预设”，不主动 Start 执行（避免长时间曝光/硬件差异导致用例过慢或不稳定）
 *
 * 运行：
 *   cd apps/web-frontend
 *   npx playwright test tests/e2e/qhy-guide-pa-schedule-10rows.spec.ts --workers=1
 */

import { test } from '@playwright/test'
import { runFlow } from './flows/flowRunner'
import type { StepRegistry } from './flows/flowTypes'
import { makeDeviceStepRegistry } from './flows/deviceSteps'
import { makeGuiderStepRegistry } from './flows/guiderSteps'
import { makePolarAxisStepRegistry } from './flows/polarAxisSteps'
import { makeScheduleStepRegistry } from './flows/scheduleSteps'
import { makeMenuStepRegistry } from './flows/menuSteps'
import { makeUiAtomicStepRegistry } from './flows/uiAtomicSteps'
import { makeMountStepRegistry } from './flows/mountSteps'

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

test('QHYCCD SDK + EQMod + guider loop + PA -> write schedule 10 rows', async ({ page }, testInfo) => {
  const uiTimeoutMs = envNumber(process.env, 'E2E_UI_TIMEOUT_MS', DEFAULTS.flow.uiTimeoutMs)
  const stepTimeoutMs = envNumber(process.env, 'E2E_STEP_TIMEOUT_MS', DEFAULTS.flow.stepTimeoutMs)
  page.setDefaultTimeout(uiTimeoutMs)
  page.setDefaultNavigationTimeout(stepTimeoutMs)

  // 该流程涉及连接/校准，给到相对宽松的总超时（仍可通过 E2E_TEST_TIMEOUT_MS 覆盖）
  test.setTimeout(Math.max(envNumber(process.env, 'E2E_TEST_TIMEOUT_MS', DEFAULTS.flow.testTimeoutMs), 25 * 60_000))

  const registry = mergeRegistries(
    makeDeviceStepRegistry(),
    makeGuiderStepRegistry(),
    makePolarAxisStepRegistry(),
    makeScheduleStepRegistry(),
    makeMenuStepRegistry(),
    makeMountStepRegistry(),
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

    // 观测参数：先设置当前位置，再在连接设备后设置望远镜焦距
    { id: 'menu.openLocation' },
    // 1) 当前位置：北京昌平区近似坐标（十进制度）：纬度 ~40.22N，经度 ~116.22E
    { id: 'ui.type', params: { testId: 'ui-location-dialog-input-latitude', text: '40.22', clear: true } },
    { id: 'ui.type', params: { testId: 'ui-location-dialog-input-longitude', text: '116.22', clear: true } },
    // 填完经纬度后必须立即保存
    { id: 'ui.click', params: { testId: 'ui-location-dialog-btn-save-manual-coordinates' } },

    // 连接：主相机 / 导星相机 / 赤道仪
    // - 主相机 / 导星相机：QHYCCD + SDK
    // - 赤道仪：EQMod Mount（与 UI 中手动选择方式一致）
    {
      id: 'device.connectIfNeeded',
      params: { deviceType: 'MainCamera', driverText: qhyDriverText, connectionModeText: qhyConnectionModeText },
    },
    {
      id: 'device.connectIfNeeded',
      params: { deviceType: 'GuiderCamera', driverText: qhyDriverText, connectionModeText: qhyConnectionModeText },
    },
    {
      id: 'device.connectIfNeeded',
      params: { deviceType: 'Mount', driverText: 'EQMod Mount' },
    },
    // 为了测试时保证安全，连接赤道仪后先把当前状态设置为 Park
    { id: 'mount.ensureParkedForTest' },

    // 2) 望远镜焦距：510mm（Telescopes 子菜单中的第一个 number 项，独立于位置保存）
    // 顺序：先通过设备菜单打开望远镜子菜单，再设置焦距
    { id: 'device.ensureDeviceSidebarFor', params: { deviceType: 'Telescopes' } },
    // 对应 App.vue 中基于 driverType/label/index 动态生成的唯一 testId；若不存在则视为契约错误直接失败
    { id: 'ui.typeIfPresent', params: { testId: 'ui-config-Telescopes-FocalLengthmm-number-0', text: '510', clear: true } },

    // 确保主相机拍摄面板可用（会处理 allocation panel）
    { id: 'device.ensureCapturePanel' },

    // 开启导星循环曝光（要求导星相机已连接）
    { id: 'guider.loopExposureOn', params: { driverType: 'GuiderCamera' } },

    // 极轴校准：结束后无论成功/失败都继续（polarAxisSteps.ts 内部会兜底 stop）
    { id: 'pa.runOnce', params: { timeoutMs: 10 * 60_000 } },
    // 极轴模式退出：避免覆盖顶部工具栏/计划表按钮
    { id: 'pa.exitIfOpen' },

    // Schedule：清理 -> 写入 10 行
    { id: 'schedule.openIfClosed' },
    { id: 'schedule.waitRunState', params: { state: 'idle', timeoutMs: 60_000 } },
    { id: 'schedule.trimRows', params: { keepRows: 1 } },

    // Row 1
    {
      id: 'schedule.setupRowFull',
      params: {
        row: 1,
        targetMode: 'name',
        targetName: 'M31-Andromeda',
        ra: '00h 42m 44s',
        dec: '+41° 16\' 09"',
        shootIsNow: false,
        shootHour: 19,
        shootMinute: 30,
        exposurePreset: '10 ms',
        filterIndex: 0,
        reps: 1,
        frameTypeIndex: 0,
        refocusIndex: 1,
        expDelaySeconds: 0,
        timeoutMs: 60_000,
      },
    },
    // Row 2
    {
      id: 'schedule.setupRowFull',
      params: {
        row: 2,
        targetMode: 'currentPosition',
        ra: '05h 55m 10s',
        dec: '+07° 24\' 25"',
        shootIsNow: true,
        shootHour: 0,
        shootMinute: 0,
        exposureValue: 5,
        exposureUnit: 'ms',
        filterIndex: 1,
        reps: 2,
        frameTypeIndex: 1,
        refocusIndex: 1,
        expDelaySeconds: 1,
        timeoutMs: 60_000,
      },
    },
    // Row 3
    {
      id: 'schedule.setupRowFull',
      params: {
        row: 3,
        targetMode: 'name',
        targetName: 'M42-Orion',
        ra: '05h 35m 17s',
        dec: '-05° 23\' 28"',
        shootIsNow: false,
        shootHour: 20,
        shootMinute: 5,
        exposurePreset: '100 ms',
        filterIndex: 2,
        reps: 3,
        frameTypeIndex: 0,
        refocusIndex: 1,
        expDelaySeconds: 0,
        timeoutMs: 60_000,
      },
    },
    // Row 4
    {
      id: 'schedule.setupRowFull',
      params: {
        row: 4,
        targetMode: 'currentPosition',
        ra: '13h 25m 11s',
        dec: '-11° 09\' 41"',
        shootIsNow: true,
        shootHour: 0,
        shootMinute: 0,
        exposureValue: 1,
        exposureUnit: 's',
        filterIndex: 3,
        reps: 1,
        frameTypeIndex: 3,
        refocusIndex: 1,
        expDelaySeconds: 2,
        timeoutMs: 60_000,
      },
    },
    // Row 5
    {
      id: 'schedule.setupRowFull',
      params: {
        row: 5,
        targetMode: 'name',
        targetName: 'NGC7000-NorthAmerica',
        ra: '20h 58m 54s',
        dec: '+44° 19\' 00"',
        shootIsNow: false,
        shootHour: 21,
        shootMinute: 15,
        exposurePreset: '1 ms',
        filterIndex: 0,
        reps: 5,
        frameTypeIndex: 2,
        refocusIndex: 1,
        expDelaySeconds: 0,
        timeoutMs: 60_000,
      },
    },
    // Row 6
    {
      id: 'schedule.setupRowFull',
      params: {
        row: 6,
        targetMode: 'currentPosition',
        ra: '16h 29m 24s',
        dec: '-26° 25\' 55"',
        shootIsNow: true,
        shootHour: 0,
        shootMinute: 0,
        exposureValue: 50,
        exposureUnit: 'ms',
        filterIndex: 1,
        reps: 1,
        frameTypeIndex: 0,
        refocusIndex: 1,
        expDelaySeconds: 3,
        timeoutMs: 60_000,
      },
    },
    // Row 7
    {
      id: 'schedule.setupRowFull',
      params: {
        row: 7,
        targetMode: 'name',
        targetName: 'M13-Hercules',
        ra: '16h 41m 41s',
        dec: '+36° 27\' 37"',
        shootIsNow: false,
        shootHour: 22,
        shootMinute: 0,
        exposurePreset: '1 s',
        filterIndex: 2,
        reps: 2,
        frameTypeIndex: 0,
        refocusIndex: 1,
        expDelaySeconds: 1,
        timeoutMs: 60_000,
      },
    },
    // Row 8
    {
      id: 'schedule.setupRowFull',
      params: {
        row: 8,
        targetMode: 'currentPosition',
        ra: '08h 40m 24s',
        dec: '+19° 59\' 18"',
        shootIsNow: true,
        shootHour: 0,
        shootMinute: 0,
        exposureValue: 2,
        exposureUnit: 's',
        filterIndex: 3,
        reps: 1,
        frameTypeIndex: 1,
        refocusIndex: 1,
        expDelaySeconds: 0,
        timeoutMs: 60_000,
      },
    },
    // Row 9
    {
      id: 'schedule.setupRowFull',
      params: {
        row: 9,
        targetMode: 'name',
        targetName: 'Polaris',
        ra: '02h 31m 49s',
        dec: '+89° 15\' 51"',
        shootIsNow: false,
        shootHour: 23,
        shootMinute: 10,
        exposurePreset: '10 ms',
        filterIndex: 0,
        reps: 1,
        frameTypeIndex: 3,
        refocusIndex: 1,
        expDelaySeconds: 2,
        timeoutMs: 60_000,
      },
    },
    // Row 10
    {
      id: 'schedule.setupRowFull',
      params: {
        row: 10,
        targetMode: 'currentPosition',
        ra: '18h 36m 56s',
        dec: '+38° 47\' 01"',
        shootIsNow: true,
        shootHour: 0,
        shootMinute: 0,
        exposurePreset: '100 ms',
        filterIndex: 1,
        reps: 4,
        frameTypeIndex: 0,
        refocusIndex: 1,
        expDelaySeconds: 4,
        timeoutMs: 60_000,
      },
    },

    // 少量断言：确认关键列确实被写入
    { id: 'schedule.assertCellContainsText', params: { row: 1, col: 1, text: 'M31-Andromeda' } },
    { id: 'schedule.assertCellContainsText', params: { row: 7, col: 4, text: '1 s' } },
    { id: 'schedule.assertCellContainsText', params: { row: 10, col: 6, text: '4' } },

    // 保存为预设：便于后续复用（名称可通过 E2E_* 覆盖的话更复杂，这里固定一个可辨识名字）
    { id: 'schedule.preset.saveAs', params: { name: 'e2e-pa-10rows-plan' } },

    // 收尾
    { id: 'guider.loopExposureOff', params: { driverType: 'GuiderCamera', allowDisconnected: true } },
    { id: 'schedule.closeIfOpen' },
  ]

  await runFlow({
    ctx: { page, testInfo, uiTimeoutMs, stepTimeoutMs },
    registry,
    calls,
    globalParams: {},
  })
})

