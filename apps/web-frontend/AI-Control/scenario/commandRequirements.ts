export type CommandMainPage = 'Stel' | 'MainCamera' | 'GuiderCamera'

export type DialogBlockerKind =
  | 'confirm'
  | 'disconnectDriver'
  | 'generalSettings'
  | 'powerManager'
  | 'deviceAllocation'
  | 'imageManager'
  | 'polarAxis'
  | 'location'
  | 'dataCredits'
  | 'debugLog'
  | 'blockingOverlay'

export type BusyStateKey = 'capture' | 'guiding' | 'polarAxis' | 'deviceAllocation'

export type BusyStrategy = 'wait' | 'cancel' | 'reject'

export const BUSY_STRATEGY_LABELS: Record<BusyStrategy, string> = {
  wait: '可等待',
  cancel: '可取消',
  reject: '严格拒绝',
}

export type CommandRequirement = {
  targetSurface: string
  mainPage?: CommandMainPage
  needMenuOpen?: boolean
  needDevice?: string
  blockers?: DialogBlockerKind[]
  busy?: Partial<Record<BusyStateKey, BusyStrategy>>
}

const DEFAULT_BLOCKERS: DialogBlockerKind[] = [
  'confirm',
  'disconnectDriver',
  'generalSettings',
  'powerManager',
  'deviceAllocation',
  'imageManager',
  'polarAxis',
  'location',
  'dataCredits',
  'debugLog',
  'blockingOverlay',
]

export const COMMAND_REQUIREMENTS: Record<string, CommandRequirement> = {
  'general-settings': {
    targetSurface: 'general-settings-dialog',
    needMenuOpen: true,
    blockers: DEFAULT_BLOCKERS.filter((item) => item !== 'generalSettings'),
    busy: {
      capture: 'reject',
      guiding: 'cancel',
      polarAxis: 'cancel',
      deviceAllocation: 'cancel',
    },
  },
  'disconnect-all': {
    targetSurface: 'disconnect-all-confirm',
    needMenuOpen: true,
    blockers: DEFAULT_BLOCKERS.filter((item) => item !== 'confirm'),
    busy: {
      capture: 'reject',
      guiding: 'cancel',
      polarAxis: 'cancel',
      deviceAllocation: 'cancel',
    },
  },
  'device-disconnect': {
    targetSurface: 'device-disconnect-dialog',
    needMenuOpen: true,
    blockers: DEFAULT_BLOCKERS,
    busy: {
      capture: 'reject',
      guiding: 'cancel',
      polarAxis: 'cancel',
      deviceAllocation: 'cancel',
    },
  },
  'power-management': {
    targetSurface: 'power-management-page',
    needMenuOpen: true,
    blockers: DEFAULT_BLOCKERS.filter((item) => item !== 'powerManager'),
    busy: {
      capture: 'reject',
      guiding: 'cancel',
      polarAxis: 'cancel',
      deviceAllocation: 'cancel',
    },
  },
  'switch-to-guider-page': {
    targetSurface: 'guider-main-page',
    mainPage: 'GuiderCamera',
    blockers: DEFAULT_BLOCKERS.filter((item) => item !== 'blockingOverlay'),
    busy: {
      capture: 'reject',
      polarAxis: 'cancel',
    },
  },
  'guider-connect-capture': {
    targetSurface: 'guider-panel',
    mainPage: 'GuiderCamera',
    needMenuOpen: true,
    needDevice: 'Guider',
    blockers: DEFAULT_BLOCKERS,
    busy: {
      capture: 'reject',
      guiding: 'cancel',
      polarAxis: 'cancel',
      deviceAllocation: 'cancel',
    },
  },
  'maincamera-connect-capture': {
    targetSurface: 'capture-panel',
    mainPage: 'MainCamera',
    needMenuOpen: true,
    needDevice: 'MainCamera',
    blockers: DEFAULT_BLOCKERS,
    busy: {
      capture: 'wait',
      guiding: 'cancel',
      polarAxis: 'cancel',
      deviceAllocation: 'cancel',
    },
  },
  'mount-connect-control': {
    targetSurface: 'mount-device-panel',
    needMenuOpen: true,
    needDevice: 'Mount',
    blockers: DEFAULT_BLOCKERS,
    busy: {
      capture: 'reject',
      guiding: 'cancel',
      polarAxis: 'cancel',
      deviceAllocation: 'cancel',
    },
  },
  'mount-park': {
    targetSurface: 'mount-park',
    needMenuOpen: true,
    needDevice: 'Mount',
    blockers: DEFAULT_BLOCKERS,
    busy: {
      capture: 'reject',
      guiding: 'cancel',
      polarAxis: 'cancel',
      deviceAllocation: 'cancel',
    },
  },
  'mount-panel': {
    targetSurface: 'mount-control-panel',
    blockers: DEFAULT_BLOCKERS,
    busy: {
      capture: 'reject',
      guiding: 'cancel',
      polarAxis: 'cancel',
    },
  },
  'telescopes-focal-length': {
    targetSurface: 'telescopes-device-panel',
    needMenuOpen: true,
    needDevice: 'Telescopes',
    blockers: DEFAULT_BLOCKERS,
    busy: {
      capture: 'reject',
      guiding: 'cancel',
      polarAxis: 'cancel',
      deviceAllocation: 'cancel',
    },
  },
  'focuser-connect-control': {
    targetSurface: 'focuser-panel',
    needMenuOpen: true,
    needDevice: 'Focuser',
    blockers: DEFAULT_BLOCKERS,
    busy: {
      capture: 'reject',
      guiding: 'cancel',
      polarAxis: 'cancel',
      deviceAllocation: 'cancel',
    },
  },
  'cfw-capture-config': {
    targetSurface: 'capture-panel-cfw',
    mainPage: 'MainCamera',
    needMenuOpen: true,
    needDevice: 'MainCamera',
    blockers: DEFAULT_BLOCKERS,
    busy: {
      capture: 'wait',
      guiding: 'cancel',
      polarAxis: 'cancel',
      deviceAllocation: 'cancel',
    },
  },
  'polar-axis-calibration': {
    targetSurface: 'polar-axis-widget',
    needMenuOpen: true,
    blockers: DEFAULT_BLOCKERS.filter((item) => item !== 'polarAxis'),
    busy: {
      capture: 'reject',
      guiding: 'cancel',
      deviceAllocation: 'cancel',
    },
  },
  'image-file-manager': {
    targetSurface: 'image-manager-panel',
    needMenuOpen: true,
    blockers: DEFAULT_BLOCKERS.filter((item) => item !== 'imageManager'),
    busy: {
      capture: 'reject',
      guiding: 'cancel',
      polarAxis: 'cancel',
      deviceAllocation: 'cancel',
    },
  },
}

export function getCommandRequirement(commandName: string): CommandRequirement | undefined {
  return COMMAND_REQUIREMENTS[commandName]
}
