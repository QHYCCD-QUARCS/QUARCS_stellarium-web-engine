export const CAMERA_MUTEX_ROLE_TYPES = ['MainCamera', 'Guider', 'PoleCamera']

export function normalizeDriverKey(name) {
  const normalized = String(name || '').trim()
  if (!normalized) return ''
  const upper = normalized.toUpperCase()
  if (upper === 'SDK' || upper === 'INDI') return ''
  return normalized.toLowerCase()
}

export function driverSelectionValue(name) {
  const normalized = String(name || '').trim()
  if (normalized.toUpperCase() === 'QHYCCD') return 'indi_qhy_ccd'
  return normalized
}

export function connectionModeOf(device) {
  return String(device && device.connectionMode ? device.connectionMode : 'INDI').toUpperCase() === 'SDK'
    ? 'SDK'
    : 'INDI'
}

export function deviceDisplayText(device) {
  if (!device) return ''
  if (hasBoundDeviceName(device)) return String(device.device || '').trim()
  const selectedDevice = String(device.device || '').trim()
  const hasSelectedDevice = selectedDevice && selectedDevice !== 'Not Bind Device'
  if (device.isConnected && hasSelectedDevice) return selectedDevice
  if (connectionModeOf(device) === 'SDK') return 'QHYCCD SDK'
  return hasSelectedDevice ? selectedDevice : ''
}

export function hasBoundDeviceName(device) {
  if (!device) return false
  const selectedDevice = String(device.device || '').trim()
  if (!selectedDevice || selectedDevice === 'Not Bind Device') return false
  const selectedUpper = selectedDevice.toUpperCase()
  const driverName = String(device.driverName || '').trim()
  return selectedUpper !== 'SDK' &&
    selectedUpper !== 'INDI' &&
    !/^indi_/i.test(selectedDevice) &&
    !(driverName && selectedDevice.toLowerCase() === driverName.toLowerCase())
}

export function getDeviceByType(devices, deviceType) {
  return (devices || []).find(device => device.driverType === deviceType) || null
}

export function linkedCameraModeDevices(devices, deviceType) {
  if (!CAMERA_MUTEX_ROLE_TYPES.includes(deviceType)) return []
  const current = getDeviceByType(devices, deviceType)
  const driverKey = normalizeDriverKey(current && current.driverName)
  if (!driverKey) return []
  return CAMERA_MUTEX_ROLE_TYPES
    .map(type => getDeviceByType(devices, type))
    .filter(device => device && normalizeDriverKey(device.driverName) === driverKey)
}

export function cameraModeConsistencyActions(devices, preferDeviceType, selectedConnectionMode = 'INDI') {
  const linked = linkedCameraModeDevices(devices, preferDeviceType)
  if (linked.length <= 1) return []

  let desiredMode = null
  if (linked.some(device => device.isConnected && connectionModeOf(device) === 'SDK')) {
    desiredMode = 'SDK'
  } else if (linked.some(device => device.isConnected && connectionModeOf(device) === 'INDI')) {
    desiredMode = 'INDI'
  } else if (new Set(linked.map(connectionModeOf)).size > 1) {
    const preferred = getDeviceByType(devices, preferDeviceType)
    desiredMode = preferred
      ? connectionModeOf(preferred)
      : (String(selectedConnectionMode || '').toUpperCase() === 'SDK' ? 'SDK' : 'INDI')
  }

  if (!desiredMode) return []
  return linked
    .filter(device => connectionModeOf(device) !== desiredMode)
    .map(device => ({ driverType: device.driverType, mode: desiredMode }))
}
