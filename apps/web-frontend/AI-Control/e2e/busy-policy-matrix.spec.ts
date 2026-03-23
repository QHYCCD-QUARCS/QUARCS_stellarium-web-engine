import { expect, test } from '@playwright/test'
import { planRecoverySteps, type PageStatus } from '..'

const BASE_STATUS: PageStatus = {
  root: true,
  mainPage: 'Stel',
  menuDrawer: 'closed',
  submenuDrawer: 'closed',
  submenuDevicePage: 'closed',
  selectedDevice: null,
  devices: [],
  dialogs: {
    confirm: { visible: false, availableButtons: [] },
    generalSettings: false,
    powerManager: false,
    deviceAllocation: false,
    imageManager: false,
    schedulePanel: false,
    polarAxis: false,
    location: false,
    dataCredits: false,
    debugLog: false,
    disconnectDriver: false,
    usbFiles: false,
    planetsVisibility: false,
    raDec: false,
    settingsMount: false,
    settingsGuider: false,
    settingsMainCamera: false,
    settingsFocuser: false,
    settingsCfw: false,
    settingsPoleCamera: false,
  },
  busyStates: {
    capture: 'idle',
    guiding: 'off',
    polarAxis: 'idle',
    deviceAllocation: 'closed',
  },
  overlays: {
    blocking: false,
    trajectoryFullscreen: false,
    trajectoryWindowed: false,
  },
  surfaces: {
    mainUiHidden: false,
    polarAxisMinimized: false,
  },
  capture: {
    panelVisible: false,
    state: null,
    cfwState: null,
  },
  guider: {
    panelVisible: false,
    expTimeMs: null,
    loopExposure: null,
    guiding: null,
    status: null,
  },
  polarAxis: {
    rootState: null,
    widgetVisible: false,
    widgetState: null,
    minimizedVisible: false,
  },
  mcpPanelVisible: false,
  capturePanelVisible: false,
  guiderPanelVisible: false,
}

type StatusOverrides = Partial<Omit<PageStatus, 'dialogs' | 'busyStates' | 'overlays' | 'surfaces' | 'capture' | 'guider' | 'polarAxis'>> & {
  dialogs?: Partial<Omit<PageStatus['dialogs'], 'confirm'>> & {
    confirm?: Partial<PageStatus['dialogs']['confirm']>
  }
  busyStates?: Partial<PageStatus['busyStates']>
  overlays?: Partial<PageStatus['overlays']>
  surfaces?: Partial<PageStatus['surfaces']>
  capture?: Partial<PageStatus['capture']>
  guider?: Partial<PageStatus['guider']>
  polarAxis?: Partial<PageStatus['polarAxis']>
}

function makeStatus(overrides: StatusOverrides = {}): PageStatus {
  return {
    ...BASE_STATUS,
    ...overrides,
    dialogs: {
      ...BASE_STATUS.dialogs,
      ...(overrides.dialogs ?? {}),
      confirm: {
        ...BASE_STATUS.dialogs.confirm,
        ...(overrides.dialogs?.confirm ?? {}),
      },
    },
    busyStates: {
      ...BASE_STATUS.busyStates,
      ...(overrides.busyStates ?? {}),
    },
    overlays: {
      ...BASE_STATUS.overlays,
      ...(overrides.overlays ?? {}),
    },
    surfaces: {
      ...BASE_STATUS.surfaces,
      ...(overrides.surfaces ?? {}),
    },
    capture: {
      ...BASE_STATUS.capture,
      ...(overrides.capture ?? {}),
    },
    guider: {
      ...BASE_STATUS.guider,
      ...(overrides.guider ?? {}),
    },
    polarAxis: {
      ...BASE_STATUS.polarAxis,
      ...(overrides.polarAxis ?? {}),
    },
  }
}

test('busy 矩阵：guider-connect-capture 会取消已有导星', () => {
  const plan = planRecoverySteps({
    commandName: 'guider-connect-capture',
    status: makeStatus({
      busyStates: { guiding: 'on' },
    }),
  })

  expect(plan.blockers).toContainEqual(
    expect.objectContaining({
      kind: 'guiding',
      resolution: 'cancel',
      stepId: 'app.cancelGuiding',
    }),
  )
  expect(plan.preSteps.map((item) => item.id)).toContain('app.cancelGuiding')
})

test('busy 矩阵：general-settings 对拍摄中保持严格拒绝', () => {
  const plan = planRecoverySteps({
    commandName: 'general-settings',
    status: makeStatus({
      busyStates: { capture: 'busy' },
    }),
  })

  expect(plan.blockers).toContainEqual(
    expect.objectContaining({
      kind: 'capture',
      resolution: 'reject',
    }),
  )
  expect(plan.preSteps.map((item) => item.id)).not.toContain('app.waitForCaptureIdle')
})

test('busy 矩阵：干净状态下 power-management 不应注入恒定恢复步骤', () => {
  const plan = planRecoverySteps({
    commandName: 'power-management',
    status: makeStatus(),
  })

  expect(plan.blockers).toHaveLength(0)
  expect(plan.preSteps).toHaveLength(0)
})

test('busy 矩阵：deviceAllocation 打开时只保留一次关闭步骤', () => {
  const plan = planRecoverySteps({
    commandName: 'image-file-manager',
    status: makeStatus({
      dialogs: { deviceAllocation: true },
      busyStates: { deviceAllocation: 'open' },
    }),
  })

  expect(plan.blockers).toContainEqual(
    expect.objectContaining({
      kind: 'deviceAllocation',
      resolution: 'cancel',
      stepId: 'menu.closeDeviceAllocation',
    }),
  )
  expect(plan.preSteps.filter((item) => item.id === 'menu.closeDeviceAllocation')).toHaveLength(1)
})

test('busy 矩阵：任务计划表打开时非 task-schedule 命令会先关闭面板', () => {
  const plan = planRecoverySteps({
    commandName: 'power-management',
    status: makeStatus({
      dialogs: { schedulePanel: true },
    }),
  })

  expect(plan.preSteps.map((item) => item.id)).toContain('menu.closeSchedulePanel')
})

test('busy 矩阵：USB 文件对话框打开时会先关闭', () => {
  const plan = planRecoverySteps({
    commandName: 'power-management',
    status: makeStatus({
      dialogs: { usbFiles: true },
    }),
  })

  expect(plan.preSteps.map((item) => item.id)).toContain('menu.closeUsbFiles')
})

test('busy 矩阵：确认弹窗打开时会先安排 dismissConfirm', () => {
  const plan = planRecoverySteps({
    commandName: 'power-management',
    status: makeStatus({
      dialogs: {
        confirm: {
          visible: true,
          action: 'Refresh',
        },
      },
    }),
  })

  expect(plan.blockers).toContainEqual(
    expect.objectContaining({
      kind: 'confirm',
      resolution: 'step',
      stepId: 'menu.dialog.dismissConfirm',
    }),
  )
  expect(plan.preSteps.filter((item) => item.id === 'menu.dialog.dismissConfirm')).toHaveLength(1)
})

test('busy 矩阵：极轴运行中会走取消而不是死等', () => {
  const plan = planRecoverySteps({
    commandName: 'power-management',
    status: makeStatus({
      dialogs: { polarAxis: true },
      busyStates: { polarAxis: 'running' },
      polarAxis: { rootState: 'running', widgetVisible: true },
    }),
  })

  expect(plan.blockers).toContainEqual(
    expect.objectContaining({
      kind: 'polarAxis',
      resolution: 'cancel',
      stepId: 'menu.closePolarAxis',
    }),
  )
  expect(plan.preSteps.filter((item) => item.id === 'menu.closePolarAxis')).toHaveLength(1)
})
