import type { FlowStepCall } from '../core/flowTypes'
import type { PageStatus } from '../status/pageStatus'
import {
  getCommandRequirement,
  type BusyStateKey,
  type BusyStrategy,
  type DialogBlockerKind,
} from '../scenario/commandRequirements'
import type { CliFlowParams } from '../scenario/cliFlows'
import type { RecoveryBlocker, RecoveryPlan } from './recoveryTypes'

const DIALOG_BLOCKER_STEP_IDS: Record<DialogBlockerKind, string> = {
  confirm: 'menu.dialog.dismissConfirm',
  disconnectDriver: 'menu.dialog.dismissDisconnectDriver',
  generalSettings: 'menu.ensureGeneralSettingsClosed',
  powerManager: 'menu.closePowerManager',
  deviceAllocation: 'menu.closeDeviceAllocation',
  imageManager: 'menu.closeImageManager',
  polarAxis: 'menu.closePolarAxis',
  location: 'menu.closeLocationDialog',
  dataCredits: 'menu.closeDataCredits',
  debugLog: 'menu.closeDebugLog',
  blockingOverlay: 'app.dismissBlockingOverlay',
}

const WAIT_STEP_IDS: Record<BusyStateKey, string> = {
  capture: 'app.waitForCaptureIdle',
  guiding: 'app.waitForGuiderIdle',
  polarAxis: 'app.waitForPolarAxisIdle',
  deviceAllocation: 'app.waitForAllocationClosed',
}

const CANCEL_STEP_IDS: Partial<Record<BusyStateKey, string>> = {
  guiding: 'app.cancelGuiding',
  polarAxis: 'menu.closePolarAxis',
  deviceAllocation: 'menu.closeDeviceAllocation',
}

const PROACTIVE_SAFE_BLOCKERS = new Set<DialogBlockerKind>([
  'generalSettings',
  'powerManager',
  'deviceAllocation',
  'imageManager',
  'polarAxis',
  'blockingOverlay',
])

function dedupeCalls(calls: FlowStepCall[]): FlowStepCall[] {
  const result: FlowStepCall[] = []
  const seen = new Set<string>()
  for (const call of calls) {
    const key = `${call.id}:${JSON.stringify(call.params ?? {})}`
    if (seen.has(key)) continue
    seen.add(key)
    result.push(call)
  }
  return result
}

function isDialogBlockerActive(status: PageStatus, kind: DialogBlockerKind): boolean {
  switch (kind) {
    case 'confirm':
      return status.dialogs.confirm.visible
    case 'disconnectDriver':
      return status.dialogs.disconnectDriver
    case 'generalSettings':
      return status.dialogs.generalSettings
    case 'powerManager':
      return status.dialogs.powerManager
    case 'deviceAllocation':
      return status.dialogs.deviceAllocation
    case 'imageManager':
      return status.dialogs.imageManager
    case 'polarAxis':
      return status.dialogs.polarAxis || status.surfaces.polarAxisMinimized || status.overlays.trajectoryFullscreen || status.overlays.trajectoryWindowed
    case 'location':
      return status.dialogs.location
    case 'dataCredits':
      return status.dialogs.dataCredits
    case 'debugLog':
      return status.dialogs.debugLog
    case 'blockingOverlay':
      return status.overlays.blocking
  }
}

function createBusyBlocker(status: PageStatus, key: BusyStateKey): RecoveryBlocker | null {
  switch (key) {
    case 'capture':
      return status.busyStates.capture === 'busy'
        ? { kind: key, reason: '主相机拍摄仍在进行中', resolution: 'reject' }
        : null
    case 'guiding':
      return status.busyStates.guiding === 'on'
        ? { kind: key, reason: '导星仍在运行中', resolution: 'reject' }
        : null
    case 'polarAxis':
      return status.busyStates.polarAxis === 'running'
        ? { kind: key, reason: '极轴校准仍在运行中', resolution: 'reject' }
        : null
    case 'deviceAllocation':
      return status.busyStates.deviceAllocation === 'open'
        ? { kind: key, reason: '设备分配面板仍在处理中', resolution: 'cancel' }
        : null
    default:
      return null
  }
}

function resolveBusyStepId(key: BusyStateKey, strategy: BusyStrategy): string | undefined {
  if (strategy === 'wait') return WAIT_STEP_IDS[key]
  if (strategy === 'cancel') return CANCEL_STEP_IDS[key]
  return undefined
}

export function planRecoverySteps(args: {
  commandName: string
  status: PageStatus
  flowParams?: CliFlowParams
}): RecoveryPlan {
  const { commandName, status } = args
  const requirement = getCommandRequirement(commandName)
  const blockers: RecoveryBlocker[] = []
  const preSteps: FlowStepCall[] = []
  const suggestions: string[] = []

  for (const kind of requirement?.blockers ?? []) {
    if (!isDialogBlockerActive(status, kind)) continue
    blockers.push({
      kind,
      reason: `检测到阻挡态: ${kind}`,
      resolution: 'step',
      stepId: DIALOG_BLOCKER_STEP_IDS[kind],
    })
    preSteps.push({ id: DIALOG_BLOCKER_STEP_IDS[kind] })
  }

  for (const kind of requirement?.blockers ?? []) {
    if (!PROACTIVE_SAFE_BLOCKERS.has(kind)) continue
    const stepId = DIALOG_BLOCKER_STEP_IDS[kind]
    if (preSteps.some((item) => item.id === stepId)) continue
    preSteps.push({ id: stepId })
  }

  for (const [busyKey, strategy] of Object.entries(requirement?.busy ?? {}) as Array<[BusyStateKey, BusyStrategy]>) {
    const blocker = createBusyBlocker(status, busyKey)
    if (!blocker) continue
    blocker.resolution = strategy
    const stepId = resolveBusyStepId(busyKey, strategy)
    if (stepId) {
      blocker.stepId = stepId
      preSteps.push({ id: stepId })
    }
    blockers.push(blocker)
  }

  if (requirement?.needMenuOpen && status.menuDrawer === 'closed') {
    suggestions.push('主菜单当前关闭；如核心步骤确实需要菜单，会在执行时按需自行打开。')
  }

  if (requirement?.needDevice && status.selectedDevice !== requirement.needDevice) {
    suggestions.push(`当前设备为 ${status.selectedDevice ?? '无'}，核心流程会切换到 ${requirement.needDevice}。`)
  }

  if (requirement?.mainPage && status.mainPage !== requirement.mainPage) {
    suggestions.push(`当前主页面为 ${status.mainPage ?? '未知'}，核心流程会切换到 ${requirement.mainPage}。`)
  }

  if (status.surfaces.mainUiHidden) {
    suggestions.push('当前主界面 UI 处于隐藏态，后续 ensureCaptureUiVisible/ensureGuiderUiVisible 会自动恢复。')
  }

  return {
    commandName,
    requirement,
    blockers,
    preSteps: dedupeCalls(preSteps),
    targetSurface: requirement?.targetSurface ?? null,
    suggestions,
  }
}
