import type { FlowStepCall } from '../core/flowTypes'

export function buildDeviceConnectCaptureFlow(params: {
  deviceType?: string
  driverText?: string
  connectionModeText?: string
  doSave?: boolean
  waitCaptureTimeoutMs?: number
  resetBeforeConnect?: boolean
  doBindAllocation?: boolean
  allocationDeviceMatch?: string | null
}): FlowStepCall[] {
  const calls: FlowStepCall[] = [{ id: 'device.gotoHome' }]

  if (params.resetBeforeConnect !== false) {
    calls.push({ id: 'menu.disconnectAll' })
  }

  calls.push(
    { id: 'menu.device.open', params: { deviceType: params.deviceType ?? 'MainCamera' } },
    {
      id: 'device.connection.selectDriver',
      params: {
        deviceType: params.deviceType ?? 'MainCamera',
        driverText: params.driverText ?? 'QHYCCD',
      },
    },
    {
      id: 'device.connection.selectMode',
      params: {
        deviceType: params.deviceType ?? 'MainCamera',
        connectionModeText: params.connectionModeText ?? 'SDK',
      },
    },
    { id: 'device.connection.clickConnect', params: { deviceType: params.deviceType ?? 'MainCamera' } },
    {
      id: 'device.allocation.bindIfVisible',
      params: {
        deviceType: params.deviceType ?? 'MainCamera',
        allocationDeviceMatch: params.allocationDeviceMatch ?? undefined,
        doBindAllocation: params.doBindAllocation !== false,
      },
    },
    { id: 'device.connection.waitConnected', params: { deviceType: params.deviceType ?? 'MainCamera' } },
    { id: 'capture.panel.ensureOpen', params: { deviceType: params.deviceType ?? 'MainCamera' } },
    {
      id: 'device.captureOnce',
      params: {
        deviceType: params.deviceType ?? 'MainCamera',
        waitCaptureTimeoutMs: params.waitCaptureTimeoutMs,
      },
    },
  )

  if (params.doSave !== false) {
    calls.push({ id: 'device.save', params: { deviceType: params.deviceType ?? 'MainCamera', doSave: true } })
  }

  return calls
}
