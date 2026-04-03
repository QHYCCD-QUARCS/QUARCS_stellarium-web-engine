/**
 * AI-Control 页面状态读取与命令步骤规划。
 *
 * 通过 Playwright page.evaluate() 在页面内读取当前 UI 状态，并为恢复层/命令执行器提供统一状态。
 */
import type { Page } from '@playwright/test'
import type { CliFlowParams } from '../scenario/cliFlows'
import { planRecoverySteps } from '../recovery/recoveryPlanner'
import {
  getConfirmDialogVariant,
  type ConfirmDialogActionMode,
  type ConfirmDialogVariant,
} from '../shared/dialogConstants'
import {
  DEFAULT_UNIFIED_RUNTIME_STATE,
  normalizeUnifiedRuntimeState,
  type UnifiedLogEntry,
  type UnifiedOperationStatus,
  type UnifiedRuntimeState,
} from './unifiedRuntime'

export type MainPageName = 'Stel' | 'MainCamera' | 'GuiderCamera'
export type DrawerState = 'open' | 'closed'

export interface DeviceRuntimeStatus {
  deviceType: string
  selected: boolean
  connectionState: string | null
  driverName: string | null
  connectionMode: string | null
}

export interface PageStatus {
  root: boolean
  mainPage: MainPageName | null
  menuDrawer: DrawerState | null
  submenuDrawer: DrawerState | null
  submenuDevicePage: DrawerState | null
  selectedDevice: string | null
  devices: DeviceRuntimeStatus[]
  dialogs: {
    confirm: { visible: boolean; action?: string; variant?: ConfirmDialogVariant; availableButtons: ConfirmDialogActionMode[] }
    generalSettings: boolean
    powerManager: boolean
    deviceAllocation: boolean
    imageManager: boolean
    schedulePanel: boolean
    polarAxis: boolean
    location: boolean
    dataCredits: boolean
    debugLog: boolean
    disconnectDriver: boolean
    usbFiles: boolean
    planetsVisibility: boolean
    raDec: boolean
    settingsMount: boolean
    settingsGuider: boolean
    settingsMainCamera: boolean
    settingsFocuser: boolean
    settingsCfw: boolean
    settingsPoleCamera: boolean
  }
  busyStates: {
    capture: 'idle' | 'busy' | 'unknown'
    guiding: 'on' | 'off' | 'unknown'
    polarAxis: 'running' | 'idle' | 'unknown'
    deviceAllocation: 'open' | 'closed' | 'unknown'
  }
  overlays: {
    blocking: boolean
    trajectoryFullscreen: boolean
    trajectoryWindowed: boolean
  }
  surfaces: {
    mainUiHidden: boolean
    polarAxisMinimized: boolean
  }
  capture: {
    panelVisible: boolean
    state: string | null
    cfwState: string | null
    /** Qt ExposureCompleted 探针 `e2e-exposure-completed[data-seq]`，与 AI-Control README 一致 */
    e2eExposureCompletedSeq: string | null
    /** TileGPM 探针 `e2e-tilegpm[data-seq]` */
    e2eTileGpmSeq: string | null
    /** 后端当前帧是否已全部生成完瓦片 */
    tileGenerationComplete: boolean
    /** 前端当前视口所需瓦片是否已全部下载完 */
    tileDownloadComplete: boolean
    /** 当前视口需要下载的瓦片 key 列表（JSON 字符串） */
    requiredTileKeys: string | null
    /** 当前视口已下载完成的瓦片 key 列表（JSON 字符串） */
    downloadedTileKeys: string | null
    requiredTileCount: string | null
    downloadedTileCount: string | null
  }
  guider: {
    panelVisible: boolean
    expTimeMs: string | null
    loopExposure: string | null
    guiding: string | null
    status: string | null
  }
  polarAxis: {
    rootState: string | null
    widgetVisible: boolean
    widgetState: string | null
    minimizedVisible: boolean
  }
  mcpPanelVisible: boolean
  capturePanelVisible: boolean
  guiderPanelVisible: boolean
  operationState: UnifiedRuntimeState
  deviceRuntimeState: Array<{
    deviceType: string
    connectionState: string | null
    activeOperationKey: string | null
    activeOperationType: string | null
    activeStatus: UnifiedOperationStatus | null
    lastError: string | null
  }>
  recentLogs: UnifiedLogEntry[]
}

const PAGE_STATUS_EVALUATE_SCRIPT = `(() => {
  const byId = (id) => document.querySelector('[data-testid="' + id + '"]')
  const visible = (el) => {
    if (!el) return false
    const rect = el.getBoundingClientRect()
    const style = window.getComputedStyle(el)
    return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none'
  }
  const attr = (el, name) => (el ? el.getAttribute(name) : null)
  const deviceTypes = ['MainCamera', 'Guider', 'Mount', 'Focuser', 'Telescopes', 'CFW']
  const dialogVisible = (id) => {
    const el = byId(id)
    if (!el) return false
    const state = attr(el, 'data-state')
    return visible(el) || state === 'open' || state === 'expanded' || state === 'collapsed' || state === 'minimized'
  }

  const root = byId('ui-app-root')
  const switchBtn = byId('gui-btn-switch-main-page')
  const menuDrawer = byId('ui-app-menu-drawer')
  const submenuDrawer = byId('ui-app-submenu-drawer')
  const submenuDevicePage = byId('ui-app-submenu-device-page')
  const mcpPanel = byId('mcp-panel')
  const cpPanel = byId('cp-panel')
  const cpStatus = byId('cp-status')
  const cpCfwDisplay = byId('cp-cfw-display')
  const chartRoot = byId('ui-chart-component-root')
  const paRoot = byId('pa-root')
  const paWidget = byId('pa-widget')
  const paMinimized = byId('pa-minimized')
  const scpRoot = byId('scp-root')
  const dapRoot = byId('dap-root')
  const showUiBtn = byId('gui-btn-show-capture-ui')
  const e2eTilegpm = byId('e2e-tilegpm')
  const e2eExposureCompleted = byId('e2e-exposure-completed')
  const toolbarMainCamera = byId('tb-status-maincamera')
  const toolbarMount = byId('tb-status-mount')
  const toolbarGuider = byId('tb-status-guider')
  const toolbarFocuser = byId('tb-status-focuser')

  const toolbarConnectionState = (el) => {
    const state = attr(el, 'data-state')
    if (!state) return null
    return state === 'disconnected' ? 'disconnected' : 'connected'
  }

  const devices = []
  let selectedDevice = null
  for (const t of deviceTypes) {
    const item = byId('ui-app-menu-device-' + t)
    const probe = byId('e2e-device-' + t + '-conn')
    const toolbarProbe =
      t === 'MainCamera'
        ? toolbarMainCamera
        : t === 'Mount'
          ? toolbarMount
          : t === 'Guider'
            ? toolbarGuider
            : t === 'Focuser'
              ? toolbarFocuser
              : null
    const selected = !!item && attr(item, 'data-selected') === 'true'
    if (selected) selectedDevice = t
    devices.push({
      deviceType: t,
      selected,
      connectionState: probe ? attr(probe, 'data-state') : toolbarConnectionState(toolbarProbe),
      driverName: probe ? attr(probe, 'data-driver-name') : null,
      connectionMode: probe ? attr(probe, 'data-connection-mode') : null,
    })
  }

  const confirmRoot = byId('ui-confirm-dialog-root')
  const confirmState = attr(confirmRoot, 'data-state')
  // gui.vue 的确认弹窗根节点使用 display: contents，不能只靠几何尺寸判断“可见”。
  const confirmVisible = !!confirmRoot && (confirmState === 'open' || visible(confirmRoot))
  const confirmAction = confirmVisible ? attr(confirmRoot, 'data-action') : null
  const confirmVariant = confirmVisible ? (attr(confirmRoot, 'data-variant') || null) : null
  const confirmAvailableButtons = !confirmVisible
    ? []
    : confirmVariant === 'autofocus-mode'
      ? ['cancel', 'coarse', 'fine']
      : ['cancel', 'confirm']

  const overlay = document.querySelector('.v-overlay.v-overlay--active')
  const trajectoryFullscreen = byId('pa-trajectory-overlay-fullscreen')
  const trajectoryWindowed = byId('pa-trajectory-overlay-windowed')

  return {
    root: !!root,
    mainPage: switchBtn ? (attr(switchBtn, 'data-current-main-page') || null) : null,
    menuDrawer: menuDrawer ? (attr(menuDrawer, 'data-state') || null) : null,
    submenuDrawer: submenuDrawer ? (attr(submenuDrawer, 'data-state') || null) : null,
    submenuDevicePage: submenuDevicePage ? (attr(submenuDevicePage, 'data-state') || null) : null,
    selectedDevice,
    devices,
    dialogs: {
      confirm: {
        visible: confirmVisible,
        action: confirmAction,
        variant: confirmVariant,
        availableButtons: confirmAvailableButtons,
      },
      generalSettings: dialogVisible('ui-view-settings-dialog-root'),
      powerManager: dialogVisible('ui-power-manager-root'),
      deviceAllocation: dialogVisible('dap-root'),
      imageManager: dialogVisible('imp-root'),
      schedulePanel: !!scpRoot && attr(scpRoot, 'data-state') === 'open' && visible(scpRoot),
      polarAxis: dialogVisible('pa-widget'),
      location: dialogVisible('ui-location-dialog-root'),
      dataCredits: dialogVisible('ui-data-credits-dialog-root'),
      debugLog: dialogVisible('ui-indi-debug-dialog-root'),
      disconnectDriver: dialogVisible('ui-app-disconnect-driver-dialog-root'),
      usbFiles: dialogVisible('ui-usbfiles-dialog-root'),
      planetsVisibility: dialogVisible('ui-planets-visibility-root'),
      raDec: dialogVisible('ui-ra-dec-dialog-root'),
      settingsMount: dialogVisible('ui-settings-dialog-mount-root'),
      settingsGuider: dialogVisible('ui-settings-dialog-guider-root'),
      settingsMainCamera: dialogVisible('ui-settings-dialog-main-camera-root'),
      settingsFocuser: dialogVisible('ui-settings-dialog-focuser-root'),
      settingsCfw: dialogVisible('ui-settings-dialog-cfw-root'),
      settingsPoleCamera: dialogVisible('ui-settings-dialog-pole-camera-root'),
    },
    busyStates: {
      capture: cpStatus
        ? (attr(cpStatus, 'data-state') || 'unknown')
        : attr(toolbarMainCamera, 'data-state') === 'busy'
          ? 'busy'
          : attr(toolbarMainCamera, 'data-state') === 'connected'
            ? 'idle'
            : 'unknown',
      guiding: chartRoot
        ? (attr(chartRoot, 'data-guiding') === 'true' ? 'on' : 'off')
        : attr(toolbarGuider, 'data-state') === 'busy'
          ? 'on'
          : attr(toolbarGuider, 'data-state') === 'connected'
            ? 'off'
            : 'unknown',
      polarAxis: paRoot ? (attr(paRoot, 'data-state') || 'unknown') : 'unknown',
      deviceAllocation: dapRoot && visible(dapRoot) ? 'open' : 'closed',
    },
    overlays: {
      blocking: !!overlay && visible(overlay),
      trajectoryFullscreen: !!trajectoryFullscreen && visible(trajectoryFullscreen),
      trajectoryWindowed: !!trajectoryWindowed && visible(trajectoryWindowed),
    },
    surfaces: {
      mainUiHidden: !!showUiBtn && visible(showUiBtn),
      polarAxisMinimized: !!paMinimized && visible(paMinimized),
    },
    capture: {
      panelVisible: cpPanel ? visible(cpPanel) : false,
      state: cpStatus ? attr(cpStatus, 'data-state') : null,
      cfwState: cpCfwDisplay ? attr(cpCfwDisplay, 'data-state') : null,
      e2eExposureCompletedSeq: e2eExposureCompleted ? attr(e2eExposureCompleted, 'data-seq') : null,
      e2eTileGpmSeq: e2eTilegpm ? attr(e2eTilegpm, 'data-seq') : null,
      tileGenerationComplete: e2eTilegpm ? attr(e2eTilegpm, 'data-generation-complete') === 'true' : false,
      tileDownloadComplete: e2eTilegpm ? attr(e2eTilegpm, 'data-download-complete') === 'true' : false,
      requiredTileKeys: e2eTilegpm ? attr(e2eTilegpm, 'data-required-tile-keys') : null,
      downloadedTileKeys: e2eTilegpm ? attr(e2eTilegpm, 'data-downloaded-tile-keys') : null,
      requiredTileCount: e2eTilegpm ? attr(e2eTilegpm, 'data-required-tile-count') : null,
      downloadedTileCount: e2eTilegpm ? attr(e2eTilegpm, 'data-downloaded-tile-count') : null,
    },
    guider: {
      panelVisible: chartRoot ? visible(chartRoot) : false,
      expTimeMs: chartRoot ? attr(chartRoot, 'data-exp-time-ms') : null,
      loopExposure: chartRoot ? attr(chartRoot, 'data-loop-exp-state') : null,
      guiding: chartRoot ? attr(chartRoot, 'data-guiding') : null,
      status: chartRoot ? attr(chartRoot, 'data-guider-status') : null,
    },
    polarAxis: {
      rootState: paRoot ? attr(paRoot, 'data-state') : null,
      widgetVisible: paWidget ? visible(paWidget) : false,
      widgetState: paWidget ? attr(paWidget, 'data-state') : null,
      minimizedVisible: paMinimized ? visible(paMinimized) : false,
    },
    mcpPanelVisible: mcpPanel ? visible(mcpPanel) : false,
    capturePanelVisible: cpPanel ? visible(cpPanel) : false,
    guiderPanelVisible: chartRoot ? visible(chartRoot) : false,
    unifiedRuntime: window.__QUARCS_UNIFIED_RUNTIME__ || null,
  }
})()`

const DEFAULT_STATUS: PageStatus = {
  root: false,
  mainPage: null,
  menuDrawer: null,
  submenuDrawer: null,
  submenuDevicePage: null,
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
    capture: 'unknown',
    guiding: 'unknown',
    polarAxis: 'unknown',
    deviceAllocation: 'unknown',
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
    e2eExposureCompletedSeq: null,
    e2eTileGpmSeq: null,
    tileGenerationComplete: false,
    tileDownloadComplete: false,
    requiredTileKeys: null,
    downloadedTileKeys: null,
    requiredTileCount: null,
    downloadedTileCount: null,
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
  operationState: DEFAULT_UNIFIED_RUNTIME_STATE,
  deviceRuntimeState: [],
  recentLogs: [],
}

function buildDeviceRuntimeState(status: Pick<PageStatus, 'devices'>, operationState: UnifiedRuntimeState): PageStatus['deviceRuntimeState'] {
  return status.devices.map((device) => {
    const ops = operationState.operationsByDevice[device.deviceType] ?? []
    const active = ops.find((op) => op.status === 'running' || op.status === 'waiting') ?? null
    const failed = ops.find((op) => op.status === 'failed' || Boolean(op.error)) ?? null
    return {
      deviceType: device.deviceType,
      connectionState: device.connectionState,
      activeOperationKey: active?.operationKey ?? null,
      activeOperationType: active?.operationType ?? null,
      activeStatus: active?.status ?? null,
      lastError: failed?.error ?? failed?.message ?? null,
    }
  })
}

function normalizeStatus(raw: unknown): PageStatus {
  if (!raw || typeof raw !== 'object') return DEFAULT_STATUS
  const s = raw as Record<string, unknown>
  const dialogs = (s.dialogs as PageStatus['dialogs']) ?? DEFAULT_STATUS.dialogs
  const busyStates = (s.busyStates as PageStatus['busyStates']) ?? DEFAULT_STATUS.busyStates
  const overlays = (s.overlays as PageStatus['overlays']) ?? DEFAULT_STATUS.overlays
  const surfaces = (s.surfaces as PageStatus['surfaces']) ?? DEFAULT_STATUS.surfaces
  const capture = (s.capture as PageStatus['capture']) ?? DEFAULT_STATUS.capture
  const guider = (s.guider as PageStatus['guider']) ?? DEFAULT_STATUS.guider
  const polarAxis = (s.polarAxis as PageStatus['polarAxis']) ?? DEFAULT_STATUS.polarAxis
  const operationState = normalizeUnifiedRuntimeState((s as Record<string, unknown>).unifiedRuntime)
  const confirm = dialogs.confirm ?? { visible: false, availableButtons: [] }
  return {
    root: Boolean(s.root),
    mainPage: (s.mainPage as PageStatus['mainPage']) ?? null,
    menuDrawer: (s.menuDrawer as PageStatus['menuDrawer']) ?? null,
    submenuDrawer: (s.submenuDrawer as PageStatus['submenuDrawer']) ?? null,
    submenuDevicePage: (s.submenuDevicePage as PageStatus['submenuDevicePage']) ?? null,
    selectedDevice: (s.selectedDevice as PageStatus['selectedDevice']) ?? null,
    devices: Array.isArray(s.devices) ? (s.devices as DeviceRuntimeStatus[]) : [],
    dialogs: {
      confirm: {
        visible: Boolean(confirm?.visible),
        action: confirm?.action,
        variant: (confirm?.variant as ConfirmDialogVariant | undefined)
          ?? getConfirmDialogVariant(confirm?.action as string | null | undefined),
        availableButtons: Array.isArray(confirm?.availableButtons)
          ? (confirm.availableButtons as ConfirmDialogActionMode[])
          : Boolean(confirm?.visible)
            ? (getConfirmDialogVariant(confirm?.action as string | null | undefined) === 'autofocus-mode'
                ? ['cancel', 'coarse', 'fine']
                : ['cancel', 'confirm'])
            : [],
      },
      generalSettings: Boolean(dialogs.generalSettings),
      powerManager: Boolean(dialogs.powerManager),
      deviceAllocation: Boolean(dialogs.deviceAllocation),
      imageManager: Boolean(dialogs.imageManager),
      schedulePanel: Boolean(dialogs.schedulePanel),
      polarAxis: Boolean(dialogs.polarAxis),
      location: Boolean(dialogs.location),
      dataCredits: Boolean(dialogs.dataCredits),
      debugLog: Boolean(dialogs.debugLog),
      disconnectDriver: Boolean(dialogs.disconnectDriver),
      usbFiles: Boolean(dialogs.usbFiles),
      planetsVisibility: Boolean(dialogs.planetsVisibility),
      raDec: Boolean(dialogs.raDec),
      settingsMount: Boolean(dialogs.settingsMount),
      settingsGuider: Boolean(dialogs.settingsGuider),
      settingsMainCamera: Boolean(dialogs.settingsMainCamera),
      settingsFocuser: Boolean(dialogs.settingsFocuser),
      settingsCfw: Boolean(dialogs.settingsCfw),
      settingsPoleCamera: Boolean(dialogs.settingsPoleCamera),
    },
    busyStates: {
      capture: (busyStates.capture as PageStatus['busyStates']['capture']) ?? 'unknown',
      guiding: (busyStates.guiding as PageStatus['busyStates']['guiding']) ?? 'unknown',
      polarAxis: (busyStates.polarAxis as PageStatus['busyStates']['polarAxis']) ?? 'unknown',
      deviceAllocation: (busyStates.deviceAllocation as PageStatus['busyStates']['deviceAllocation']) ?? 'unknown',
    },
    overlays: {
      blocking: Boolean(overlays.blocking),
      trajectoryFullscreen: Boolean(overlays.trajectoryFullscreen),
      trajectoryWindowed: Boolean(overlays.trajectoryWindowed),
    },
    surfaces: {
      mainUiHidden: Boolean(surfaces.mainUiHidden),
      polarAxisMinimized: Boolean(surfaces.polarAxisMinimized),
    },
    capture: {
      panelVisible: Boolean(capture.panelVisible),
      state: capture.state ?? null,
      cfwState: capture.cfwState ?? null,
      e2eExposureCompletedSeq: capture.e2eExposureCompletedSeq ?? null,
      e2eTileGpmSeq: capture.e2eTileGpmSeq ?? null,
      tileGenerationComplete: Boolean(capture.tileGenerationComplete),
      tileDownloadComplete: Boolean(capture.tileDownloadComplete),
      requiredTileKeys: capture.requiredTileKeys ?? null,
      downloadedTileKeys: capture.downloadedTileKeys ?? null,
      requiredTileCount: capture.requiredTileCount ?? null,
      downloadedTileCount: capture.downloadedTileCount ?? null,
    },
    guider: {
      panelVisible: Boolean(guider.panelVisible),
      expTimeMs: guider.expTimeMs ?? null,
      loopExposure: guider.loopExposure ?? null,
      guiding: guider.guiding ?? null,
      status: guider.status ?? null,
    },
    polarAxis: {
      rootState: polarAxis.rootState ?? null,
      widgetVisible: Boolean(polarAxis.widgetVisible),
      widgetState: polarAxis.widgetState ?? null,
      minimizedVisible: Boolean(polarAxis.minimizedVisible),
    },
    mcpPanelVisible: Boolean(s.mcpPanelVisible),
    capturePanelVisible: Boolean(s.capturePanelVisible),
    guiderPanelVisible: Boolean(s.guiderPanelVisible),
    operationState,
    deviceRuntimeState: buildDeviceRuntimeState({ devices: Array.isArray(s.devices) ? (s.devices as DeviceRuntimeStatus[]) : [] }, operationState),
    recentLogs: operationState.recentLogs,
  }
}

export async function evaluatePageStatus(page: Page): Promise<PageStatus> {
  const raw = await page.evaluate(PAGE_STATUS_EVALUATE_SCRIPT)
  return normalizeStatus(raw)
}

export interface PlannedStep {
  id: string
  reason: string
}

export interface CommandPlan {
  commandName: string
  status: PageStatus
  preSteps: PlannedStep[]
  coreStepIds: string[]
  suggestions: string[]
  blockers: Array<{ kind: string; reason: string; resolution: string; stepId?: string }>
  targetSurface: string | null
}

export function planCommandSteps(
  commandName: string,
  status: PageStatus,
  getFlowCallsByCommand: (cmd: string, params?: Record<string, unknown>) => Array<{ id: string }>,
  flowParams: CliFlowParams = {},
): CommandPlan {
  const recoveryPlan = planRecoverySteps({
    commandName,
    status,
    flowParams,
  })
  const calls = getFlowCallsByCommand(commandName, flowParams)
  const coreStepIds = calls.map((c) => c.id)

  return {
    commandName,
    status,
    preSteps: recoveryPlan.preSteps.map((item) => ({
      id: item.id,
      reason: recoveryPlan.blockers.find((blocker) => blocker.stepId === item.id)?.reason ?? '恢复层前置步骤',
    })),
    coreStepIds,
    suggestions: recoveryPlan.suggestions,
    blockers: recoveryPlan.blockers,
    targetSurface: recoveryPlan.targetSurface,
  }
}
