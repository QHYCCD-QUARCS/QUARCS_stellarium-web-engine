/**
 * 从环境变量解析 general-settings 等命令的 flowParams，运行时不改代码即可指定执行哪些项。
 * general-settings 传 generalSettingsInteract 时才会执行对话框内交互；本函数可提供或覆盖该项。
 *
 * 环境变量（均可选）：
 * - E2E_FLOW_PARAMS_JSON：完整 flowParams 的 JSON，与下方单项合并（此项优先作 base）。
 * - E2E_GENERAL_SETTINGS_INTERACT：逗号分隔的 key 列表，仅这些项为 true，其余为 false；key 见 GENERAL_SETTINGS_INTERACT_KEYS。
 * - E2E_CLEAR_BOX_OPTION：clearBoxConfirm 只勾选哪一项，cache | update-pack | backup。
 * - E2E_GENERAL_SETTINGS_LANGUAGE_ITEM_TEXT：语言下拉要切换到的选项文案（如 Simplified Chinese、English）；未设且启用了 selectLanguage 时默认 Simplified Chinese。
 * - E2E_GENERAL_SETTINGS_LANGUAGE_RESTORE_ITEM_TEXT：语言切换后还原的选项文案，不设则不还原。
 * - E2E_RESET_BEFORE_CONNECT：是否先断开全部，1/true 为 true，0/false 为 false；未设时默认不断开。
 * - E2E_GOTO_HOME：是否先刷新页面（device.gotoHome），1/true 为 true；未设或 0/false 为 false（默认不刷新）。
 * - E2E_GENERAL_SETTINGS_RESTORE_AFTER_MS：交互后还原等待毫秒数。
 * - E2E_FOCAL_LENGTH_MM：望远镜焦距（mm），用于 telescopes-focal-length 等。
 * - E2E_DRIVER_TEXT：驱动文案（如 QHYCCD、EQMod），用于设备连接类命令。
 * - E2E_CONNECTION_MODE_TEXT：连接模式（如 SDK、INDI），用于设备连接类命令。
 * - E2E_DO_CAPTURE：主相机命令是否执行拍摄（1/0 或 true/false）。
 * - E2E_CAPTURE_GAIN / E2E_CAPTURE_OFFSET：主相机增益、偏置（数字）。
 * - E2E_CAPTURE_CFA_MODE：主相机 CFA 模式（GR|GB|BG|RGGB|null）。
 * - E2E_CAPTURE_TEMPERATURE：主相机制冷温度（5|0|-5|-10|-15|-20|-25）。
 * - E2E_CAPTURE_AUTO_SAVE：是否开启自动保存（1/0 或 true/false）。
 * - E2E_CAPTURE_SAVE_FAILED_PARSE：是否保存解析失败图片（1/0 或 true/false）。
 * - E2E_CAPTURE_SAVE_FOLDER：保存文件夹选项文案（如 local）。
 * - E2E_CAPTURE_EXPOSURE：曝光预设（如 10ms、1s）。
 * - E2E_CAPTURE_COUNT：拍摄次数（正整数），用于 maincamera-connect-capture，默认 1。
 * - E2E_WAIT_CAPTURE_TIMEOUT_MS：等待单次拍摄完成的超时（毫秒）。
 * - E2E_DO_BIND_ALLOCATION：连接后是否执行设备分配。
 * - E2E_ALLOCATION_DEVICE_MATCH：设备分配时优先匹配的设备文案。
 * - E2E_GUIDER_FOCAL_LENGTH_MM / E2E_GUIDER_GAIN / E2E_GUIDER_OFFSET：导星菜单焦距、增益、偏置。
 * - E2E_GUIDER_MULTI_STAR：导星菜单是否开启多星导星（1/0 或 true/false）。
 * - E2E_GUIDER_RA_DIRECTION / E2E_GUIDER_DEC_DIRECTION：导星菜单 RA/DEC 单步导星方向。
 * - E2E_GUIDER_EXPOSURE：导星页曝光档位（500ms、1s、2s）。
 * - E2E_GUIDER_INTERACT_JSON：导星页交互对象（loopExposure/guiding/dataClear/rangeSwitch/recalibrate/expTime）。
 * - E2E_POWER_MANAGEMENT_INTERACT：逗号分隔的 key（output1、output2、restart），仅这些项为 true，用于 power-management 打开后的页面内交互。
 * - E2E_IMAGE_MANAGER_INTERACT：逗号分隔的 key（moveToUsb、delete、download、imageFileSwitch、refresh、panelClose），仅这些项为 true，用于 image-file-manager 打开后面板内交互。
 * - E2E_FOCUSER_INTERACT_JSON / E2E_CFW_INTERACT_JSON / E2E_POLAR_AXIS_INTERACT_JSON：复杂交互对象的 JSON。
 *
 * 示例：只执行清理更新包
 *   E2E_GENERAL_SETTINGS_INTERACT=memoryTab,clearBoxConfirm,close E2E_CLEAR_BOX_OPTION=update-pack npx playwright test AI-Control/e2e/general-settings.spec.ts -g "参数由环境变量"
 */
import type { CliFlowParams, GeneralSettingsInteractKey } from '../scenario/cliFlows'
import { GENERAL_SETTINGS_INTERACT_KEYS } from '../scenario/cliFlows'

declare const process: { env: Record<string, string | undefined> }

function parseBool(raw: string | undefined, defaultValue: boolean): boolean {
  if (raw == null || raw === '') return defaultValue
  const v = String(raw).trim().toLowerCase()
  if (['1', 'true', 'yes', 'on'].includes(v)) return true
  if (['0', 'false', 'no', 'off'].includes(v)) return false
  return true
}

function parseNumber(raw: string | undefined, defaultValue: number): number {
  if (raw == null || raw === '') return defaultValue
  const n = Number(raw)
  return Number.isFinite(n) ? n : defaultValue
}

function parseJsonObject<T>(raw: string | undefined): T | undefined {
  const text = raw?.trim()
  if (!text) return undefined
  try {
    return JSON.parse(text) as T
  } catch {
    return undefined
  }
}

/**
 * 从 process.env 解析 CliFlowParams，与 defaults 合并（env 覆盖 defaults）。
 */
export function resolveFlowParamsFromEnv(defaults: Partial<CliFlowParams> = {}): CliFlowParams {
  const env = process.env
  let base: Partial<CliFlowParams> = {}

  const jsonRaw = env.E2E_FLOW_PARAMS_JSON?.trim()
  if (jsonRaw) {
    try {
      base = JSON.parse(jsonRaw) as Partial<CliFlowParams>
    } catch {
      // ignore invalid JSON
    }
  }

  const merged: Partial<CliFlowParams> = { ...defaults, ...base }

  const interactRaw = env.E2E_GENERAL_SETTINGS_INTERACT?.trim()
  if (interactRaw) {
    const keys = interactRaw.split(',').map((k) => k.trim().toLowerCase())
    const generalSettingsInteract: Partial<Record<GeneralSettingsInteractKey, boolean>> = {}
    for (const key of GENERAL_SETTINGS_INTERACT_KEYS) {
      generalSettingsInteract[key] = keys.includes(key.toLowerCase())
    }
    merged.generalSettingsInteract = generalSettingsInteract
  }

  if (env.E2E_CLEAR_BOX_OPTION?.trim()) {
    const v = env.E2E_CLEAR_BOX_OPTION.trim().toLowerCase()
    if (['cache', 'update-pack', 'backup'].includes(v)) {
      merged.clearBoxConfirmOption = v as 'cache' | 'update-pack' | 'backup'
    }
  }

  if (env.E2E_RESET_BEFORE_CONNECT !== undefined && env.E2E_RESET_BEFORE_CONNECT !== '') {
    merged.resetBeforeConnect = parseBool(env.E2E_RESET_BEFORE_CONNECT, false)
  }

  if (env.E2E_GOTO_HOME !== undefined && env.E2E_GOTO_HOME !== '') {
    merged.gotoHome = parseBool(env.E2E_GOTO_HOME, false)
  }

  const pmInteractRaw = env.E2E_POWER_MANAGEMENT_INTERACT?.trim()
  if (pmInteractRaw) {
    const pmKeys = pmInteractRaw.split(',').map((k) => k.trim().toLowerCase())
    const powerManagementInteract: NonNullable<CliFlowParams['powerManagementInteract']> = {}
    if (pmKeys.includes('output1-on')) powerManagementInteract.output1 = true
    if (pmKeys.includes('output1-off')) powerManagementInteract.output1 = false
    if (pmKeys.includes('output2-on')) powerManagementInteract.output2 = true
    if (pmKeys.includes('output2-off')) powerManagementInteract.output2 = false
    if (pmKeys.includes('restart-confirm')) powerManagementInteract.restart = 'confirm'
    if (pmKeys.includes('restart-cancel')) powerManagementInteract.restart = 'cancel'
    if (pmKeys.includes('shutdown-confirm')) powerManagementInteract.shutdown = 'confirm'
    if (pmKeys.includes('shutdown-cancel')) powerManagementInteract.shutdown = 'cancel'
    if (pmKeys.includes('force-update-confirm')) powerManagementInteract.forceUpdate = 'confirm'
    if (pmKeys.includes('force-update-cancel')) powerManagementInteract.forceUpdate = 'cancel'
    merged.powerManagementInteract = powerManagementInteract
  }

  const imInteractRaw = env.E2E_IMAGE_MANAGER_INTERACT?.trim()
  if (imInteractRaw) {
    const imKeys = imInteractRaw.split(',').map((k) => k.trim().toLowerCase())
    merged.imageManagerInteract = {
      moveToUsb: imKeys.includes('movetousb'),
      delete: imKeys.includes('delete'),
      download: imKeys.includes('download'),
      imageFileSwitch: imKeys.includes('imagefileswitch'),
      refresh: imKeys.includes('refresh'),
      panelClose: imKeys.includes('panelclose'),
    }
  }

  if (env.E2E_GENERAL_SETTINGS_RESTORE_AFTER_MS !== undefined) {
    const ms = parseNumber(env.E2E_GENERAL_SETTINGS_RESTORE_AFTER_MS, 1000)
    if (Number.isFinite(ms)) merged.generalSettingsRestoreAfterMs = ms
  }

  if (env.E2E_GENERAL_SETTINGS_LANGUAGE_ITEM_TEXT !== undefined) {
    merged.generalSettingsLanguageItemText =
      env.E2E_GENERAL_SETTINGS_LANGUAGE_ITEM_TEXT.trim() || 'Simplified Chinese'
  } else if (merged.generalSettingsInteract?.selectLanguage) {
    merged.generalSettingsLanguageItemText = merged.generalSettingsLanguageItemText ?? 'Simplified Chinese'
  }
  if (env.E2E_GENERAL_SETTINGS_LANGUAGE_RESTORE_ITEM_TEXT?.trim()) {
    merged.generalSettingsLanguageRestoreItemText = env.E2E_GENERAL_SETTINGS_LANGUAGE_RESTORE_ITEM_TEXT.trim()
  }

  if (env.E2E_FOCAL_LENGTH_MM?.trim()) {
    merged.focalLengthMm = env.E2E_FOCAL_LENGTH_MM.trim()
  }

  if (env.E2E_DRIVER_TEXT?.trim()) {
    merged.driverText = env.E2E_DRIVER_TEXT.trim()
  }

  if (env.E2E_CONNECTION_MODE_TEXT?.trim()) {
    merged.connectionModeText = env.E2E_CONNECTION_MODE_TEXT.trim()
  }

  if (env.E2E_DO_CAPTURE !== undefined && env.E2E_DO_CAPTURE !== '') {
    merged.doCapture = parseBool(env.E2E_DO_CAPTURE, true)
  }

  if (env.E2E_CAPTURE_GAIN !== undefined && env.E2E_CAPTURE_GAIN !== '') {
    const n = parseNumber(env.E2E_CAPTURE_GAIN, 0)
    if (Number.isFinite(n)) merged.captureGain = n
  }
  if (env.E2E_CAPTURE_OFFSET !== undefined && env.E2E_CAPTURE_OFFSET !== '') {
    const n = parseNumber(env.E2E_CAPTURE_OFFSET, 0)
    if (Number.isFinite(n)) merged.captureOffset = n
  }
  if (env.E2E_CAPTURE_CFA_MODE?.trim()) {
    merged.captureCfaMode = env.E2E_CAPTURE_CFA_MODE.trim()
  }
  if (env.E2E_CAPTURE_TEMPERATURE !== undefined && env.E2E_CAPTURE_TEMPERATURE !== '') {
    const t = env.E2E_CAPTURE_TEMPERATURE.trim()
    const n = parseNumber(t, NaN)
    merged.captureTemperature = Number.isFinite(n) ? n : t
  }
  if (env.E2E_CAPTURE_AUTO_SAVE !== undefined && env.E2E_CAPTURE_AUTO_SAVE !== '') {
    merged.captureAutoSave = parseBool(env.E2E_CAPTURE_AUTO_SAVE, false)
  }
  if (env.E2E_CAPTURE_SAVE_FAILED_PARSE !== undefined && env.E2E_CAPTURE_SAVE_FAILED_PARSE !== '') {
    merged.captureSaveFailedParse = parseBool(env.E2E_CAPTURE_SAVE_FAILED_PARSE, false)
  }
  if (env.E2E_CAPTURE_SAVE_FOLDER?.trim()) {
    merged.captureSaveFolder = env.E2E_CAPTURE_SAVE_FOLDER.trim()
  }
  if (env.E2E_CAPTURE_EXPOSURE?.trim()) {
    merged.captureExposure = env.E2E_CAPTURE_EXPOSURE.trim()
  }
  if (env.E2E_CAPTURE_COUNT !== undefined && env.E2E_CAPTURE_COUNT !== '') {
    const n = parseNumber(env.E2E_CAPTURE_COUNT, 1)
    if (Number.isInteger(n) && n >= 1) merged.captureCount = n
  }
  if (env.E2E_WAIT_CAPTURE_TIMEOUT_MS !== undefined && env.E2E_WAIT_CAPTURE_TIMEOUT_MS !== '') {
    const n = parseNumber(env.E2E_WAIT_CAPTURE_TIMEOUT_MS, 0)
    if (Number.isFinite(n) && n > 0) merged.waitCaptureTimeoutMs = n
  }
  if (env.E2E_DO_BIND_ALLOCATION !== undefined && env.E2E_DO_BIND_ALLOCATION !== '') {
    merged.doBindAllocation = parseBool(env.E2E_DO_BIND_ALLOCATION, true)
  }
  if (env.E2E_ALLOCATION_DEVICE_MATCH?.trim()) {
    merged.allocationDeviceMatch = env.E2E_ALLOCATION_DEVICE_MATCH.trim()
  }

  if (env.E2E_GUIDER_FOCAL_LENGTH_MM?.trim()) {
    merged.guiderFocalLengthMm = env.E2E_GUIDER_FOCAL_LENGTH_MM.trim()
  }
  if (env.E2E_GUIDER_MULTI_STAR !== undefined && env.E2E_GUIDER_MULTI_STAR !== '') {
    merged.guiderMultiStar = parseBool(env.E2E_GUIDER_MULTI_STAR, false)
  }
  if (env.E2E_GUIDER_GAIN !== undefined && env.E2E_GUIDER_GAIN !== '') {
    const n = parseNumber(env.E2E_GUIDER_GAIN, 0)
    if (Number.isFinite(n)) merged.guiderGain = n
  }
  if (env.E2E_GUIDER_OFFSET !== undefined && env.E2E_GUIDER_OFFSET !== '') {
    const n = parseNumber(env.E2E_GUIDER_OFFSET, 0)
    if (Number.isFinite(n)) merged.guiderOffset = n
  }
  if (env.E2E_GUIDER_RA_DIRECTION?.trim()) {
    merged.guiderRaDirection = env.E2E_GUIDER_RA_DIRECTION.trim()
  }
  if (env.E2E_GUIDER_DEC_DIRECTION?.trim()) {
    merged.guiderDecDirection = env.E2E_GUIDER_DEC_DIRECTION.trim()
  }
  if (env.E2E_GUIDER_EXPOSURE?.trim()) {
    merged.guiderExposure = env.E2E_GUIDER_EXPOSURE.trim()
  }

  const focuserInteract = parseJsonObject<CliFlowParams['focuserInteract']>(env.E2E_FOCUSER_INTERACT_JSON)
  if (focuserInteract) merged.focuserInteract = focuserInteract

  const cfwInteract = parseJsonObject<CliFlowParams['cfwInteract']>(env.E2E_CFW_INTERACT_JSON)
  if (cfwInteract) merged.cfwInteract = cfwInteract

  const polarAxisInteract = parseJsonObject<CliFlowParams['polarAxisInteract']>(env.E2E_POLAR_AXIS_INTERACT_JSON)
  if (polarAxisInteract) merged.polarAxisInteract = polarAxisInteract

  const guiderInteract = parseJsonObject<CliFlowParams['guiderInteract']>(env.E2E_GUIDER_INTERACT_JSON)
  if (guiderInteract) merged.guiderInteract = guiderInteract

  return merged as CliFlowParams
}
