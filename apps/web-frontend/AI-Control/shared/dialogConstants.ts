/**
 * 弹窗定位与状态常量，与 docs/dialog-identification.md 约定一致。
 *
 * 约定摘要：
 * - 弹窗根节点用 data-testid="ui-xxx-dialog-root" 或 ui-xxx-root，用 data-state="open"|"closed" 表示开关。
 * - 确认弹窗（gui.vue）用 data-action 区分类型，取值为 CONFIRM_ACTION_*。
 */

/** 确认弹窗根节点 testid（gui.vue） */
export const CONFIRM_DIALOG_ROOT_TESTID = 'ui-confirm-dialog-root'

/** 确认弹窗按钮 testid */
export const CONFIRM_DIALOG_BTN_CONFIRM = 'ui-confirm-dialog-btn-confirm'
export const CONFIRM_DIALOG_BTN_CANCEL = 'ui-confirm-dialog-btn-cancel'
export const CONFIRM_DIALOG_BTN_CLOSE = 'ui-confirm-dialog-btn-close'
export const CONFIRM_DIALOG_BTN_AUTOFOCUS_COARSE = 'ui-confirm-dialog-btn-autofocus-coarse'
export const CONFIRM_DIALOG_BTN_AUTOFOCUS_FINE = 'ui-confirm-dialog-btn-autofocus-fine'

/** 单设备断开确认弹窗（App.vue showDisconnectDialog），与“断开全部”的 gui 确认弹窗区分 */
export const DISCONNECT_DRIVER_DIALOG_ROOT_TESTID = 'ui-app-disconnect-driver-dialog-root'
export const DISCONNECT_DRIVER_DIALOG_BTN_CANCEL = 'ui-app-disconnect-driver-dialog-btn-cancel'
export const DISCONNECT_DRIVER_DIALOG_BTN_CONFIRM = 'ui-app-disconnect-driver-dialog-btn-confirm'

/**
 * 图像管理里的确认/取消类弹层。
 * 这些弹层使用 v-if 渲染，没有统一的 data-state；E2E 以根节点是否可见判断是否已出现。
 */
export const IMAGE_MANAGER_DIALOG_CONFIGS = {
  usbConfirm: {
    rootTestId: 'imp-usb-confirm-dialog',
    confirmTestId: 'imp-btn-confirm-usb-transfer',
    cancelTestId: 'imp-btn-cancel-usb-confirm',
  },
  deleteConfirm: {
    rootTestId: 'imp-delete-confirm-dialog',
    confirmTestId: 'imp-btn-confirm-delete',
    cancelTestId: 'imp-btn-cancel-delete-confirm',
  },
  downloadConfirm: {
    rootTestId: 'imp-act-usb-select-dialog-2',
    confirmTestId: 'imp-btn-confirm-start-download',
    cancelTestId: 'imp-btn-close-download-confirm-dialog-2',
  },
  downloadLocationReminder: {
    rootTestId: 'imp-act-download-location-reminder-dialog',
    confirmTestId: 'imp-btn-continue-download-location-reminder-dialog',
    cancelTestId: 'imp-btn-cancel-download-location-reminder-dialog',
  },
} as const

export type ImageManagerDialogKind = keyof typeof IMAGE_MANAGER_DIALOG_CONFIGS

/** 确认弹窗 data-action 取值（ConfirmToDo），与 gui.vue ShowConfirmDialog(title, text, ToDo) 一致 */
export const CONFIRM_ACTION = {
  DISCONNECT_ALL_DEVICE: 'disconnectAllDevice',
  REFRESH: 'Refresh',
  RESTART_RASPBERRY_PI: 'RestartRaspberryPi',
  SHUTDOWN_RASPBERRY_PI: 'ShutdownRaspberryPi',
  RESTART_QT_SERVER: 'restartQtServer',
  RESTART_PHD2: 'RestartPHD2',
  SWITCH_OUTPUT_POWER: 'SwitchOutPutPower',
  FORCE_UPDATE: 'ForceUpdate',
  RECALIBRATE: 'Recalibrate',
  END_CAPTURE_AND_SOLVE: 'EndCaptureAndSolve',
  START_CALIBRATION: 'StartCalibration',
  START_AUTO_FOCUS: 'startAutoFocus',
  DELETE_SCHEDULE_PRESET: 'DeleteSchedulePreset',
  UPDATE_CURRENT_CLIENT_PREFIX: 'updateCurrentClient',
} as const

export type ConfirmActionType = (typeof CONFIRM_ACTION)[keyof typeof CONFIRM_ACTION]

/** 其他弹窗根节点 testid（与 dialog-identification.md 第 3 节对应） */
export const DIALOG_ROOT_TESTIDS = {
  VIEW_SETTINGS: 'ui-view-settings-dialog-root',
  LOCATION: 'ui-location-dialog-root',
  DATA_CREDITS: 'ui-data-credits-dialog-root',
  INDI_DEBUG: 'ui-indi-debug-dialog-root',
  POWER_MANAGER: 'ui-power-manager-root',
  DEVICE_ALLOCATION: 'dap-root',
  IMAGE_MANAGER: 'imp-root',
  RA_DEC: 'ui-ra-dec-dialog-root',
  SETTINGS_MOUNT: 'ui-settings-dialog-mount-root',
  SETTINGS_GUIDER: 'ui-settings-dialog-guider-root',
  SETTINGS_MAIN_CAMERA: 'ui-settings-dialog-main-camera-root',
  SETTINGS_FOCUSER: 'ui-settings-dialog-focuser-root',
  SETTINGS_CFW: 'ui-settings-dialog-cfw-root',
  SETTINGS_POLE_CAMERA: 'ui-settings-dialog-pole-camera-root',
  USB_FILES: 'ui-usbfiles-dialog-root',
  PLANETS_VISIBILITY: 'ui-planets-visibility-root',
} as const
