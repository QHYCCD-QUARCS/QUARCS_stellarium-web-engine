/**
 * AI-Control CLI 流程定义与运行入口。
 *
 * 参考现有 E2E 业务流，提供“命令名 → 步骤序列”的 CLI 式控制：
 * 1) general-settings      - 通用设置（打开 General Settings 对话框）
 * 2) disconnect-all        - 断开全部设备（独立命令）
 * 3) device-disconnect     - 按参数断开单个设备（如 Mount / MainCamera）
 * 4) power-management      - 电源管理（打开电源管理页）
 * 5) guider-connect-capture - 导星镜连接并执行导星专用控制（Guider + QHYCCD）
 * 6) maincamera-connect-capture - 主相机连接，并按参数决定是否拍摄（MainCamera + QHYCCD）
 * 7) mount-connect-control - 赤道仪连接与控制（Mount + EQMod）
 * 8) telescopes-focal-length - 望远镜焦距设置（Telescopes 子菜单 + 焦距 510）
 * 9) focuser-connect-control - 电调连接与控制（Focuser）
 * 10) cfw-capture-config    - 滤镜轮拍摄与配置（主相机连接 + CFW 切换）
 * 11) polar-axis-calibration - 极轴校准（打开极轴校准页面）
 * 12) image-file-manager   - 图像文件管理（打开图像管理面板）
 *
 * 使用方式：runFlowByCommand(ctx, registry, 'general-settings') 或通过 MCP/脚本传入命令名。
 */
import type { FlowContext, FlowRunOptions, FlowStepCall, FlowStepParams, StepRegistry } from '../core/flowTypes'
import { runCommandWithRecovery } from '../core/commandExecutor'
import type { McpInteractParams } from '../device/mountControlSteps'
import type { PowerManagementInteractParams } from '../device/powerManagementSteps'
import type { FocuserInteractParams } from '../device/focuserControlSteps'
import type { CfwInteractParams } from '../device/cfwControlSteps'
import type { PolarAxisInteractParams } from '../device/polarAxisSteps'
import type { GuiderInteractParams } from '../device/guiderControlSteps'
import { createStepError } from '../shared/errors'
import { buildDeviceConnectCaptureFlow } from './businessFlows'

/** CLI 可用命令名。general-settings 不传 generalSettingsInteract 时仅打开对话框，传则按参数执行对话框内各项交互 */
export const CLI_COMMANDS = [
  'general-settings',
  'disconnect-all',
  'device-disconnect',
  'power-management',
  'switch-to-guider-page',
  'guider-connect-capture',
  'maincamera-connect-capture',
  'mount-connect-control',
  'mount-park',
  'mount-panel',
  'telescopes-focal-length',
  'focuser-connect-control',
  'cfw-capture-config',
  'polar-axis-calibration',
  'image-file-manager',
] as const

export type CliCommandName = (typeof CLI_COMMANDS)[number]

/** general-settings 传入 generalSettingsInteract 时每项交互的 key */
export const GENERAL_SETTINGS_INTERACT_KEYS = [
  'displayTab',       // 切换到 Display 页签
  'milkyWay',         // 银河层开关
  'dss',              // DSS 层开关
  'meridian',         // 子午线开关
  'ecliptic',         // 黄道线开关
  'highfps',          // 高帧率开关
  'selectLanguage',   // Display 页签内语言下拉切换（需 generalSettingsLanguageItemText 指定选项文案）
  'versionTab',       // 切换到 Version Info 页签
  'refreshDevices',   // 刷新设备版本
  'memoryTab',        // 切换到 Memory 页签
  'refreshStorage',   // 刷新存储
  'clearLogs',        // 清除日志
  'clearBoxCancel',   // 打开清理盒子缓存弹窗并取消
  'clearBoxConfirm',  // 再次打开清理盒子缓存、至少勾选一项（cache/update-pack/backup）后确认
  'close',            // 关闭总设置对话框
] as const

export type GeneralSettingsInteractKey = (typeof GENERAL_SETTINGS_INTERACT_KEYS)[number]

/** 可选参数：部分命令支持覆盖默认（如焦距、驱动、连接模式等） */
export type CliFlowParams = {
  /** 是否先刷新页面（执行 device.gotoHome），默认 false（不刷新，在当前页执行） */
  gotoHome?: boolean
  /** 单设备类命令目标设备，如 MainCamera / Guider / Mount / Focuser / Telescopes / CFW */
  deviceType?: string
  /** 望远镜焦距（mm），默认 510 */
  focalLengthMm?: string
  /** 是否在执行前先断开当前命令目标设备，默认 false（不执行断开） */
  resetBeforeConnect?: boolean
  /** 主相机/导星镜等驱动文案，如 QHYCCD、EQMod */
  driverText?: string
  /** 连接模式，如 SDK、INDI */
  connectionModeText?: string
  /** 是否执行拍摄，默认 true；为 false 时仅连接/配置，不执行拍摄 */
  doCapture?: boolean
  /** 是否保存拍摄结果；仅在 doCapture !== false 时生效 */
  doSave?: boolean
  /** 等待单次拍摄完成的超时（毫秒） */
  waitCaptureTimeoutMs?: number
  /** 连接后是否执行设备分配，默认 true */
  doBindAllocation?: boolean
  /** 设备分配时要优先匹配的设备文案 */
  allocationDeviceMatch?: string
  /** 拍摄次数，默认 1；仅在 doCapture !== false 时生效 */
  captureCount?: number
  /** 主相机拍摄配置：增益（滑块数值） */
  captureGain?: number
  /** 主相机拍摄配置：偏置（滑块数值） */
  captureOffset?: number
  /** 主相机拍摄配置：CFA 模式，可选 'GR'|'GB'|'BG'|'RGGB'|'null' */
  captureCfaMode?: string
  /** 主相机拍摄配置：制冷温度，可选 5|0|-5|-10|-15|-20|-25（或对应字符串） */
  captureTemperature?: number | string
  /** 主相机拍摄配置：是否开启自动保存 */
  captureAutoSave?: boolean
  /** 主相机拍摄配置：是否保存解析失败图片 */
  captureSaveFailedParse?: boolean
  /** 主相机拍摄配置：保存文件夹选项文案（如 'local'），与后端下发的选项一致 */
  captureSaveFolder?: string
  /** 主相机拍摄配置：曝光时间（如 '10ms'、'1s'），需在拍摄面板预设内 */
  captureExposure?: string
  /** 导星菜单配置：焦距（mm） */
  guiderFocalLengthMm?: string
  /** 导星菜单配置：是否开启多星导星 */
  guiderMultiStar?: boolean
  /** 导星菜单配置：增益（滑块数值） */
  guiderGain?: number
  /** 导星菜单配置：偏置（滑块数值） */
  guiderOffset?: number
  /** 导星菜单配置：RA 单步导星方向（AUTO/WEST/EAST） */
  guiderRaDirection?: string
  /** 导星菜单配置：DEC 单步导星方向（AUTO/NORTH/SOUTH） */
  guiderDecDirection?: string
  /** 导星面板配置：导星曝光档位（500ms/1s/2s）；未传时 guider 命令也会兼容读取 captureExposure */
  guiderExposure?: number | string
  /** general-settings：传此项则执行对话框内交互（否则仅打开）；key 见 GENERAL_SETTINGS_INTERACT_KEYS，未传则全部 true */
  generalSettingsInteract?: Partial<Record<GeneralSettingsInteractKey, boolean>>
  /** general-settings：交互后等待多少毫秒再还原（仅对可还原项如复选框生效），默认 1000 */
  generalSettingsRestoreAfterMs?: number
  /** general-settings clearBoxConfirm：只勾选哪一项（cache=缓存文件 / update-pack=更新包 / backup=备份文件），默认 cache */
  clearBoxConfirmOption?: 'cache' | 'update-pack' | 'backup'
  /** general-settings clearBoxConfirm：勾选多项（如 ['cache','update-pack','backup'] 表示清理全部）；若传则优先于 clearBoxConfirmOption */
  clearBoxConfirmOptions?: Array<'cache' | 'update-pack' | 'backup'>
  /** general-settings selectLanguage：切换到的语言选项文案（与下拉列表项一致，如 Simplified Chinese、English），默认 Simplified Chinese */
  generalSettingsLanguageItemText?: string
  /** general-settings selectLanguage：切换后是否再切回该项（还原），不传则不还原 */
  generalSettingsLanguageRestoreItemText?: string
  /** power-management：打开电源管理页后执行的页面内交互；为 true 的 key 会依次执行（output1/output2 为点击对应输出开关，restart 为点击重启按钮） */
  powerManagementInteract?: PowerManagementInteractParams
  /** image-file-manager：打开图像管理面板后执行的面板内交互；为 true 的 key 会依次执行（见 README 图像管理） */
  imageManagerInteract?: Partial<Record<'moveToUsb' | 'delete' | 'download' | 'imageFileSwitch' | 'refresh' | 'panelClose', boolean>>
  /** mount-connect-control：连接完成后在侧栏内执行的控制；solveCurrentPosition/gotoClick 为 true 时点击对应按钮，gotoThenSolve/autoFlip 为布尔值时设置对应开关 */
  mountControlInteract?: Partial<Record<'solveCurrentPosition' | 'gotoClick' | 'gotoThenSolve' | 'autoFlip', boolean>>
  /** mount-connect-control / mount-park：连接并关闭抽屉后是否执行 mount.ensureParkedForTest（确保赤道仪 Park 为 on，参考 04-mount-park.spec.ts） */
  ensurePark?: boolean
  /** 主界面赤道仪面板（mcp）交互：park/track 开关、home/stop 点击、move 方向与时长；用于 mount-connect-control、mount-park、mount-panel */
  mcpInteract?: McpInteractParams
  /** focuser-connect-control：连接后执行的电调面板交互 */
  focuserInteract?: FocuserInteractParams
  /** cfw-capture-config：主相机连接后执行的滤镜轮交互 */
  cfwInteract?: CfwInteractParams
  /** polar-axis-calibration：打开极轴校准组件后执行的页面交互 */
  polarAxisInteract?: PolarAxisInteractParams
  /** guider-connect-capture：连接后执行的导星页交互 */
  guiderInteract?: GuiderInteractParams
}

function hasGuiderConfigParams(p: CliFlowParams): boolean {
  return (
    (p.guiderFocalLengthMm != null && String(p.guiderFocalLengthMm).trim() !== '') ||
    typeof p.guiderMultiStar === 'boolean' ||
    p.guiderGain !== undefined ||
    p.guiderOffset !== undefined ||
    (p.guiderRaDirection != null && String(p.guiderRaDirection).trim() !== '') ||
    (p.guiderDecDirection != null && String(p.guiderDecDirection).trim() !== '')
  )
}

const DEVICE_DISCONNECT_TARGETS = [
  'MainCamera',
  'Guider',
  'Mount',
  'Focuser',
  'Telescopes',
  'CFW',
] as const

function resolveDeviceDisconnectType(params: CliFlowParams): string {
  const raw = String(params.deviceType ?? '').trim()
  if (raw === '') {
    throw createStepError('getFlowCallsByCommand', 'params', 'device-disconnect 缺少 deviceType', {
      commandName: 'device-disconnect',
      supportedDeviceTypes: DEVICE_DISCONNECT_TARGETS.join(', '),
    })
  }

  const matched = DEVICE_DISCONNECT_TARGETS.find((item) => item.toLowerCase() === raw.toLowerCase())
  if (!matched) {
    throw createStepError('getFlowCallsByCommand', 'params', 'device-disconnect 的 deviceType 不受支持', {
      commandName: 'device-disconnect',
      deviceType: raw,
      supportedDeviceTypes: DEVICE_DISCONNECT_TARGETS.join(', '),
    })
  }
  return matched
}

function buildDeviceConnectCalls(args: {
  deviceType: string
  driverText: string
  connectionModeText: string
  gotoHome: boolean
  resetBeforeConnect: boolean
  doBindAllocation?: boolean
  allocationDeviceMatch?: string
}): FlowStepCall[] {
  const calls: FlowStepCall[] = []
  if (args.gotoHome) calls.push({ id: 'device.gotoHome' })
  if (args.resetBeforeConnect) {
    calls.push({ id: 'device.disconnectIfNeeded', params: { deviceType: args.deviceType } })
  }
  calls.push({
    id: 'device.connectIfNeeded',
    params: {
      deviceType: args.deviceType,
      driverText: args.driverText,
      connectionModeText: args.connectionModeText,
      doBindAllocation: args.doBindAllocation !== false,
      allocationDeviceMatch: args.allocationDeviceMatch,
      keepDrawerOpen: true,
    },
  })
  return calls
}

function buildGuiderControlFlow(p: CliFlowParams, opts: { gotoHome: boolean; resetBeforeConnect: boolean }): FlowStepCall[] {
  const calls = buildDeviceConnectCalls({
    deviceType: 'Guider',
    driverText: p.driverText ?? 'QHYCCD',
    connectionModeText: p.connectionModeText ?? 'SDK',
    gotoHome: opts.gotoHome,
    resetBeforeConnect: opts.resetBeforeConnect,
    doBindAllocation: p.doBindAllocation,
    allocationDeviceMatch: p.allocationDeviceMatch,
  })

  const unsupportedParams: string[] = []
  if (p.doSave === true) unsupportedParams.push('doSave')
  if ((p.captureCount ?? 1) > 1) unsupportedParams.push('captureCount')
  if (p.waitCaptureTimeoutMs != null) unsupportedParams.push('waitCaptureTimeoutMs')
  if (unsupportedParams.length > 0) {
    throw createStepError('getFlowCallsByCommand', 'params', '导星命令已改为导星专用控制，不再支持主相机拍摄型参数', {
      commandName: 'guider-connect-capture',
      unsupportedParams,
    })
  }

  if (hasGuiderConfigParams(p)) {
    calls.push({
      id: 'device.guider.applyConfig',
      params: {
        focalLengthMm: p.guiderFocalLengthMm,
        multiStar: p.guiderMultiStar,
        gain: p.guiderGain,
        offset: p.guiderOffset,
        raDirection: p.guiderRaDirection,
        decDirection: p.guiderDecDirection,
      },
    })
  }

  calls.push({ id: 'menu.drawer.close' }, { id: 'guider.panel.ensureOpen' })

  const guiderInteract: GuiderInteractParams = { ...(p.guiderInteract ?? {}) }
  if (guiderInteract.expTime == null) {
    guiderInteract.expTime = p.guiderExposure ?? p.captureExposure
  }

  if (
    guiderInteract.expTime != null ||
    typeof guiderInteract.loopExposure === 'boolean' ||
    typeof guiderInteract.guiding === 'boolean' ||
    guiderInteract.dataClear === true ||
    guiderInteract.rangeSwitch === true ||
    guiderInteract.recalibrate === true
  ) {
    calls.push({ id: 'guider.applyInteract', params: guiderInteract })
  }

  return calls
}

/** 根据命令名返回对应的 FlowStepCall 序列 */
export function getFlowCallsByCommand(
  commandName: string,
  params: CliFlowParams = {},
): FlowStepCall[] {
  const p = params
  const reset = p.resetBeforeConnect === true
  const doGotoHome = p.gotoHome === true

  switch (commandName) {
    case 'general-settings': {
      const calls: FlowStepCall[] = []
      if (doGotoHome) calls.push({ id: 'device.gotoHome' })
      if (reset) calls.push({ id: 'menu.disconnectAll' })
      if (p.generalSettingsInteract != null) {
        calls.push({ id: 'menu.ensureGeneralSettingsClosed' })
      }
      calls.push({ id: 'menu.openGeneralSettings' })
      if (p.generalSettingsInteract === undefined) return calls
      const on = p.generalSettingsInteract
      const restoreMs = p.generalSettingsRestoreAfterMs ?? 1000
      const interact = (key: GeneralSettingsInteractKey) => on[key] !== false

      if (interact('displayTab')) {
        calls.push({ id: 'ui.click', params: { testId: 'ui-view-settings-dialog-tab-display-settings' } })
        calls.push({ id: 'ui.sleep', params: { ms: restoreMs } })
      }
      if (interact('milkyWay')) {
        calls.push({ id: 'ui.setCheckbox', params: { testId: 'ui-view-settings-dialog-checkbox-milky-way-on', checked: true } })
        calls.push({ id: 'ui.sleep', params: { ms: restoreMs } })
        calls.push({ id: 'ui.setCheckbox', params: { testId: 'ui-view-settings-dialog-checkbox-milky-way-on', checked: false } })
      }
      if (interact('dss')) {
        calls.push({ id: 'ui.setCheckbox', params: { testId: 'ui-view-settings-dialog-checkbox-dss-on', checked: true } })
        calls.push({ id: 'ui.sleep', params: { ms: restoreMs } })
        calls.push({ id: 'ui.setCheckbox', params: { testId: 'ui-view-settings-dialog-checkbox-dss-on', checked: false } })
      }
      if (interact('meridian')) {
        calls.push({ id: 'ui.setCheckbox', params: { testId: 'ui-view-settings-dialog-checkbox-meridian-on', checked: true } })
        calls.push({ id: 'ui.sleep', params: { ms: restoreMs } })
        calls.push({ id: 'ui.setCheckbox', params: { testId: 'ui-view-settings-dialog-checkbox-meridian-on', checked: false } })
      }
      if (interact('ecliptic')) {
        calls.push({ id: 'ui.setCheckbox', params: { testId: 'ui-view-settings-dialog-checkbox-ecliptic-on', checked: true } })
        calls.push({ id: 'ui.sleep', params: { ms: restoreMs } })
        calls.push({ id: 'ui.setCheckbox', params: { testId: 'ui-view-settings-dialog-checkbox-ecliptic-on', checked: false } })
      }
      if (interact('highfps')) {
        calls.push({ id: 'ui.setCheckbox', params: { testId: 'ui-view-settings-dialog-checkbox-highfps-on', checked: true } })
        calls.push({ id: 'ui.sleep', params: { ms: restoreMs } })
        calls.push({ id: 'ui.setCheckbox', params: { testId: 'ui-view-settings-dialog-checkbox-highfps-on', checked: false } })
      }
      if (interact('selectLanguage')) {
        const langText = p.generalSettingsLanguageItemText ?? 'Simplified Chinese'
        calls.push({
          id: 'ui.selectVSelectItemText',
          params: {
            testId: 'ui-view-settings-dialog-select-switch-language',
            itemText: langText,
          },
        })
        calls.push({ id: 'ui.sleep', params: { ms: restoreMs } })
        if (p.generalSettingsLanguageRestoreItemText) {
          calls.push({
            id: 'ui.selectVSelectItemText',
            params: {
              testId: 'ui-view-settings-dialog-select-switch-language',
              itemText: p.generalSettingsLanguageRestoreItemText,
            },
          })
          calls.push({ id: 'ui.sleep', params: { ms: restoreMs } })
        }
      }
      if (interact('versionTab')) {
        calls.push({ id: 'ui.click', params: { testId: 'ui-view-settings-dialog-tab-version-info' } })
        calls.push({ id: 'ui.sleep', params: { ms: restoreMs } })
      }
      if (interact('refreshDevices')) {
        calls.push({ id: 'ui.click', params: { testId: 'ui-view-settings-dialog-btn-refresh-devices' } })
        calls.push({ id: 'ui.sleep', params: { ms: restoreMs } })
      }
      if (interact('memoryTab')) {
        calls.push({ id: 'ui.click', params: { testId: 'ui-view-settings-dialog-tab-memory-settings' } })
        calls.push({ id: 'ui.sleep', params: { ms: restoreMs } })
      }
      if (interact('refreshStorage')) {
        calls.push({ id: 'ui.click', params: { testId: 'ui-view-settings-dialog-btn-refresh-storage' } })
        calls.push({ id: 'ui.sleep', params: { ms: restoreMs } })
      }
      if (interact('clearLogs')) {
        calls.push({ id: 'ui.click', params: { testId: 'ui-view-settings-dialog-btn-clear-logs' } })
        calls.push({ id: 'ui.sleep', params: { ms: restoreMs } })
      }
      if (interact('clearBoxCancel')) {
        calls.push({ id: 'ui.click', params: { testId: 'ui-view-settings-dialog-btn-open-clear-box-dialog' } })
        calls.push({ id: 'ui.sleep', params: { ms: restoreMs } })
        calls.push({ id: 'ui.click', params: { testId: 'ui-view-settings-dialog-btn-on-cancel-clear-box' } })
      }
      if (interact('clearBoxConfirm')) {
        const options = p.clearBoxConfirmOptions?.length
          ? p.clearBoxConfirmOptions
          : [p.clearBoxConfirmOption ?? 'cache']
        calls.push({ id: 'ui.click', params: { testId: 'ui-view-settings-dialog-btn-open-clear-box-dialog' } })
        for (const opt of options) {
          calls.push({
            id: 'ui.setCheckbox',
            params: { testId: `ui-view-settings-dialog-checkbox-${opt}`, checked: true },
          })
        }
        calls.push({ id: 'ui.waitEnabled', params: { testId: 'ui-view-settings-dialog-btn-on-confirm-clear-box' } })
        calls.push({ id: 'ui.click', params: { testId: 'ui-view-settings-dialog-btn-on-confirm-clear-box' } })
      }
      if (interact('close')) {
        calls.push({ id: 'ui.click', params: { testId: 'ui-view-settings-dialog-btn-blue-text' } })
      }
      return calls
    }

    case 'disconnect-all': {
      const calls: FlowStepCall[] = []
      if (doGotoHome) calls.push({ id: 'device.gotoHome' })
      calls.push({ id: 'menu.disconnectAll' })
      return calls
    }

    case 'device-disconnect': {
      const calls: FlowStepCall[] = []
      if (doGotoHome) calls.push({ id: 'device.gotoHome' })
      calls.push({
        id: 'device.disconnectIfNeeded',
        params: { deviceType: resolveDeviceDisconnectType(p) },
      })
      return calls
    }

    case 'power-management': {
      const calls: FlowStepCall[] = []
      if (doGotoHome) calls.push({ id: 'device.gotoHome' })
      calls.push({ id: 'menu.openPowerManager' })
      if (p.powerManagementInteract && typeof p.powerManagementInteract === 'object') {
        calls.push({ id: 'power.applyInteract', params: p.powerManagementInteract })
      }
      return calls
    }

    case 'switch-to-guider-page': {
      const calls: FlowStepCall[] = []
      if (doGotoHome) calls.push({ id: 'device.gotoHome' })
      calls.push({ id: 'menu.drawer.close' }, { id: 'guider.panel.ensureOpen' })
      return calls
    }

    case 'guider-connect-capture': {
      return buildGuiderControlFlow(p, { gotoHome: doGotoHome, resetBeforeConnect: reset })
    }

    case 'maincamera-connect-capture': {
      return buildDeviceConnectCaptureFlow({
        deviceType: 'MainCamera',
        driverText: p.driverText ?? 'QHYCCD',
        connectionModeText: p.connectionModeText ?? 'SDK',
        doCapture: p.doCapture,
        doSave: p.doSave ?? false,
        waitCaptureTimeoutMs: p.waitCaptureTimeoutMs,
        resetBeforeConnect: reset,
        doBindAllocation: p.doBindAllocation,
        allocationDeviceMatch: p.allocationDeviceMatch,
        gotoHome: doGotoHome,
        captureCount: p.captureCount,
        captureGain: p.captureGain,
        captureOffset: p.captureOffset,
        captureCfaMode: p.captureCfaMode,
        captureTemperature: p.captureTemperature,
        captureAutoSave: p.captureAutoSave,
        captureSaveFailedParse: p.captureSaveFailedParse,
        captureSaveFolder: p.captureSaveFolder,
        captureExposure: p.captureExposure,
      })
    }

    case 'mount-connect-control': {
      const calls = buildDeviceConnectCalls({
        deviceType: 'Mount',
        driverText: p.driverText ?? 'EQMod',
        connectionModeText: p.connectionModeText ?? 'INDI',
        gotoHome: doGotoHome,
        resetBeforeConnect: reset,
        doBindAllocation: p.doBindAllocation,
        allocationDeviceMatch: p.allocationDeviceMatch,
      })
      if (
        p.mountControlInteract &&
        typeof p.mountControlInteract === 'object' &&
        (p.mountControlInteract.solveCurrentPosition === true ||
          p.mountControlInteract.gotoClick === true ||
          typeof p.mountControlInteract.gotoThenSolve === 'boolean' ||
          typeof p.mountControlInteract.autoFlip === 'boolean')
      ) {
        calls.push({ id: 'device.mount.applyControl', params: { ...p.mountControlInteract } })
      }
      calls.push({ id: 'menu.drawer.close' })
      if (p.ensurePark === true) {
        calls.push({ id: 'mount.ensureParkedForTest' })
      }
      if (p.mcpInteract && typeof p.mcpInteract === 'object') {
        calls.push({ id: 'mount.panel.applyMcpInteract', params: p.mcpInteract })
      }
      return calls
    }

    case 'mount-park': {
      const parkCalls = buildDeviceConnectCalls({
        deviceType: 'Mount',
        driverText: p.driverText ?? 'EQMod',
        connectionModeText: p.connectionModeText ?? 'INDI',
        gotoHome: doGotoHome,
        resetBeforeConnect: reset,
        doBindAllocation: p.doBindAllocation,
        allocationDeviceMatch: p.allocationDeviceMatch,
      })
      parkCalls.push({ id: 'menu.drawer.close' }, { id: 'mount.ensureParkedForTest' })
      if (p.mcpInteract && typeof p.mcpInteract === 'object') {
        parkCalls.push({ id: 'mount.panel.applyMcpInteract', params: p.mcpInteract })
      }
      return parkCalls
    }

    case 'mount-panel': {
      const panelCalls: FlowStepCall[] = []
      if (doGotoHome) panelCalls.push({ id: 'device.gotoHome' })
      panelCalls.push({ id: 'mount.ensurePanelOpen' })
      if (p.mcpInteract && typeof p.mcpInteract === 'object') {
        panelCalls.push({ id: 'mount.panel.applyMcpInteract', params: p.mcpInteract })
      }
      return panelCalls
    }

    case 'telescopes-focal-length': {
      const focalMm = p.focalLengthMm ?? '510'
      const telescopeCalls: FlowStepCall[] = []
      if (doGotoHome) telescopeCalls.push({ id: 'device.gotoHome' })
      telescopeCalls.push(
        { id: 'menu.device.open', params: { deviceType: 'Telescopes' } },
        {
          id: 'ui.type',
          params: {
            testId: 'ui-config-Telescopes-FocalLengthmm-number-0',
            text: focalMm,
            clear: true,
          },
        },
      )
      return telescopeCalls
    }

    case 'focuser-connect-control': {
      const calls = buildDeviceConnectCalls({
        deviceType: 'Focuser',
        driverText: p.driverText ?? 'Focuser',
        connectionModeText: p.connectionModeText ?? 'INDI',
        gotoHome: doGotoHome,
        resetBeforeConnect: reset,
        doBindAllocation: p.doBindAllocation,
        allocationDeviceMatch: p.allocationDeviceMatch,
      })
      calls.push({ id: 'menu.drawer.close' })
      if (p.focuserInteract && typeof p.focuserInteract === 'object') {
        calls.push({ id: 'focuser.applyInteract', params: p.focuserInteract })
      }
      return calls
    }

    case 'cfw-capture-config': {
      const calls = buildDeviceConnectCalls({
        deviceType: 'MainCamera',
        driverText: p.driverText ?? 'QHYCCD',
        connectionModeText: p.connectionModeText ?? 'SDK',
        gotoHome: doGotoHome,
        resetBeforeConnect: reset,
        doBindAllocation: p.doBindAllocation,
        allocationDeviceMatch: p.allocationDeviceMatch,
      })
      calls.push({ id: 'capture.panel.ensureOpen', params: { deviceType: 'MainCamera' } })
      calls.push({
        id: 'cfw.applyInteract',
        params: p.cfwInteract ?? { capturePanelPlusCount: 1, capturePanelMinusCount: 1 },
      })
      calls.push({ id: 'menu.drawer.close' })
      return calls
    }

    case 'polar-axis-calibration': {
      const calls: FlowStepCall[] = []
      if (doGotoHome) calls.push({ id: 'device.gotoHome' })
      calls.push({ id: 'menu.openPolarAxisCalibration' })
      if (p.polarAxisInteract && typeof p.polarAxisInteract === 'object') {
        calls.push({ id: 'polarAxis.applyInteract', params: p.polarAxisInteract })
      }
      return calls
    }

    case 'image-file-manager': {
      const calls: FlowStepCall[] = []
      if (doGotoHome) calls.push({ id: 'device.gotoHome' })
      calls.push({ id: 'menu.openImageManager' })
      const im = p.imageManagerInteract
      if (im?.moveToUsb) {
        calls.push({ id: 'ui.click', params: { testId: 'imp-btn-move-file-to-usb' } })
      }
      if (im?.delete) {
        calls.push({ id: 'ui.click', params: { testId: 'imp-btn-delete-btn-click' } })
      }
      if (im?.download) {
        calls.push({ id: 'ui.click', params: { testId: 'imp-btn-download-selected' } })
      }
      if (im?.imageFileSwitch) {
        calls.push({ id: 'ui.click', params: { testId: 'imp-btn-image-file-switch' } })
      }
      if (im?.refresh) {
        calls.push({ id: 'ui.click', params: { testId: 'imp-btn-refresh-current-folder' } })
      }
      if (im?.panelClose) {
        calls.push({ id: 'ui.click', params: { testId: 'imp-btn-panel-close' } })
      }
      return calls
    }

    default:
      throw createStepError('getFlowCallsByCommand', 'params', '未知 CLI 命令', {
        commandName,
        availableCommands: CLI_COMMANDS.join(', '),
      })
  }
}

/** 列出所有 CLI 命令名 */
export function listCliCommands(): string[] {
  return [...CLI_COMMANDS]
}

/** 按命令名执行对应流程（CLI 入口） */
export async function runFlowByCommand(args: {
  ctx: FlowContext
  registry: StepRegistry
  commandName: string
  flowParams?: CliFlowParams
  globalParams?: FlowStepParams
  options?: FlowRunOptions
}): Promise<void> {
  const { ctx, registry, commandName, flowParams, globalParams, options } = args
  const normalized = commandName.trim().toLowerCase()
  if (!CLI_COMMANDS.includes(normalized as CliCommandName)) {
    throw createStepError('runFlowByCommand', 'params', '未知 CLI 命令', {
      commandName,
      availableCommands: CLI_COMMANDS.join(', '),
    })
  }
  await runCommandWithRecovery({
    ctx,
    registry,
    commandName: normalized,
    flowParams: flowParams ?? {},
    globalParams,
    options,
    getFlowCallsByCommand,
  })
}
