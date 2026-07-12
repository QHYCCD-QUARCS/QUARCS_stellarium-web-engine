export function queueDeviceConfigChange(pendingChanges, change) {
  const driverType = String(change && change.driverType ? change.driverType : '')
  const label = String(change && change.label ? change.label : '')
  if (!label) return { ...(pendingChanges || {}) }
  const key = `${driverType}::${label}`
  return {
    ...(pendingChanges || {}),
    [key]: { driverType, label, value: change.value },
  }
}

export function drainDeviceConfigChanges(pendingChanges) {
  return {
    changes: Object.values(pendingChanges || {}),
    pendingChanges: {},
  }
}
