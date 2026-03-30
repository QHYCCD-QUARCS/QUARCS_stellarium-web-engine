/**
 * AI-Control 高层业务 Flow 构建器。
 *
 * 面向 CLI/MCP 的“设备连接 -> [可选]主相机配置 -> [可选]拍摄 -> [可选]保存”一站式流程。buildDeviceConnectCaptureFlow 生成步骤序列：
 * gotoHome -> [可选 disconnect] -> device.connectIfNeeded（支持单设备字段或 devices[] 多段依次连接）-> [若提供拍摄参数] device.mainCamera.applyCaptureConfig -> 关闭侧栏 -> 确保拍摄面板 -> [可选] captureOnce × captureCount（每次点击前等待 data-capture-ready）-> [可选 save]。参数可指定 deviceType、devices、driverText、connectionModeText、doCapture、doSave、waitCaptureTimeoutMs、captureReadyTimeoutMs、resetBeforeConnect、doBindAllocation、allocationDeviceMatch、captureCount（拍摄次数，默认 1），以及拍摄配置 captureGain/captureOffset/captureCfaMode/captureTemperature/captureAutoSave/captureSaveFailedParse/captureSaveFolder。
 */
import type { FlowStepCall } from '../core/flowTypes'
import { DEFAULT_QHY_DRIVER_TEXT } from '../shared/driverDefaults'

function hasCaptureConfigParams(p: {
  captureGain?: number
  captureOffset?: number
  captureCfaMode?: string
  captureTemperature?: number | string
  captureAutoSave?: boolean
  captureSaveFailedParse?: boolean
  captureSaveFolder?: string
}): boolean {
  return (
    p.captureGain !== undefined ||
    p.captureOffset !== undefined ||
    p.captureCfaMode !== undefined ||
    p.captureTemperature !== undefined ||
    p.captureAutoSave !== undefined ||
    p.captureSaveFailedParse !== undefined ||
    (p.captureSaveFolder !== undefined && p.captureSaveFolder !== '')
  )
}

/** 构建“设备连接并拍摄（可选保存）”的 FlowStepCall 数组，可直接交给 runFlow 执行 */
export function buildDeviceConnectCaptureFlow(params: {
  deviceType?: string
  driverText?: string
  connectionModeText?: string
  /** 多设备依次连接；若设置则优先于单设备字段 */
  devices?: Array<{
    deviceType: string
    driverText?: string
    connectionModeText?: string
    allocationDeviceMatch?: string
  }>
  doSave?: boolean
  waitCaptureTimeoutMs?: number
  /** 等待 `cp-btn-capture` 的 `data-capture-ready=true`（连拍与按钮解锁对齐） */
  captureReadyTimeoutMs?: number
  resetBeforeConnect?: boolean
  doBindAllocation?: boolean
  allocationDeviceMatch?: string | null
  /** 是否先执行 device.gotoHome 刷新页面，默认 false */
  gotoHome?: boolean
  /** 主相机拍摄配置（增益、偏置、CFA、温度、自动保存、保存解析失败、保存文件夹） */
  captureGain?: number
  captureOffset?: number
  captureCfaMode?: string
  captureTemperature?: number | string
  captureAutoSave?: boolean
  captureSaveFailedParse?: boolean
  captureSaveFolder?: string
  /** 曝光时间（如 '10ms'、'1s'），需在拍摄面板预设内，设置后再拍摄 */
  captureExposure?: string
  /** 是否执行拍摄，默认 true；为 false 时仅连接/配置，不执行 device.captureOnce */
  doCapture?: boolean
  /** 拍摄次数，默认 1；仅在 doCapture !== false 时生效 */
  captureCount?: number
}): FlowStepCall[] {
  const calls: FlowStepCall[] = []
  if (params.gotoHome === true) calls.push({ id: 'device.gotoHome' })
  const deviceType = params.deviceType ?? 'MainCamera'

  if (params.devices?.length) {
    if (params.resetBeforeConnect === true) {
      for (const d of params.devices) {
        calls.push({ id: 'device.disconnectIfNeeded', params: { deviceType: d.deviceType } })
      }
    }
    calls.push({
      id: 'device.connectIfNeeded',
      params: {
        devices: params.devices.map((d) => ({
          deviceType: d.deviceType,
          driverText: d.driverText ?? DEFAULT_QHY_DRIVER_TEXT,
          connectionModeText: d.connectionModeText ?? 'SDK',
          allocationDeviceMatch: d.allocationDeviceMatch,
        })),
        doBindAllocation: params.doBindAllocation !== false,
        keepDrawerOpen: true,
      },
    })
  } else {
    if (params.resetBeforeConnect === true) {
      calls.push({ id: 'device.disconnectIfNeeded', params: { deviceType } })
    }
    calls.push({
      id: 'device.connectIfNeeded',
      params: {
        deviceType,
        driverText: params.driverText ?? DEFAULT_QHY_DRIVER_TEXT,
        connectionModeText: params.connectionModeText ?? 'SDK',
        allocationDeviceMatch: params.allocationDeviceMatch ?? undefined,
        doBindAllocation: params.doBindAllocation !== false,
        keepDrawerOpen: true,
      },
    })
  }

  if (hasCaptureConfigParams(params)) {
    calls.push({
      id: 'device.mainCamera.applyCaptureConfig',
      params: {
        gain: params.captureGain,
        offset: params.captureOffset,
        cfaMode: params.captureCfaMode,
        temperature: params.captureTemperature,
        autoSave: params.captureAutoSave,
        saveFailedParse: params.captureSaveFailedParse,
        saveFolder: params.captureSaveFolder,
      },
    })
  }

  calls.push(
    { id: 'menu.drawer.close' },
    { id: 'capture.panel.ensureOpen', params: { deviceType } },
  )
  if (params.captureExposure !== undefined && String(params.captureExposure).trim() !== '') {
    calls.push({
      id: 'device.setExposureTime',
      params: { exposure: String(params.captureExposure).trim(), deviceType },
    })
  }

  const shouldCapture = params.doCapture !== false
  const count = shouldCapture ? Math.max(1, Math.floor(Number(params.captureCount)) || 1) : 0
  const captureOnceParams: {
    deviceType: string
    waitCaptureTimeoutMs?: number
    captureExposure?: string
    captureReadyTimeoutMs?: number
  } = {
    deviceType,
    waitCaptureTimeoutMs: params.waitCaptureTimeoutMs,
  }
  if (params.captureExposure !== undefined && String(params.captureExposure).trim() !== '') {
    captureOnceParams.captureExposure = String(params.captureExposure).trim()
  }
  if (params.captureReadyTimeoutMs != null) {
    captureOnceParams.captureReadyTimeoutMs = params.captureReadyTimeoutMs
  }
  for (let i = 0; i < count; i++) {
    calls.push({ id: 'device.captureOnce', params: captureOnceParams })
  }

  if (shouldCapture && params.doSave === true) {
    calls.push({ id: 'device.save', params: { deviceType, doSave: true } })
  }

  return calls
}
