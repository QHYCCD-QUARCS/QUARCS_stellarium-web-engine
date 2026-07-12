const DEVICE_DISCOVERY_MESSAGE_TYPES = new Set([
  'AddDriver',
  'AddDevice',
  'updateDevices_',
  'ConnectSuccess',
  'ConnectFailed',
  'ConnectAllDeviceComplete',
  'ScanFailed',
  'AddDeviceType',
  'DeviceToBeAllocated',
  'ShowDeviceAllocationWindow',
])

export function handleDeviceDiscoveryMessage(vm, messageType, parts) {
  if (!DEVICE_DISCOVERY_MESSAGE_TYPES.has(messageType)) return false

  switch (messageType) {
    case 'AddDriver': {
      if (parts.length === 3) {
        const driver = { type: vm.CurrentDriverType, label: parts[1], value: parts[2] }
        if (['QHY CCD', 'QFocuser', 'QHY CCD2'].includes(driver.label)) vm.drivers.unshift(driver)
        else vm.drivers.push(driver)
      }
      break
    }
    case 'AddDevice': {
      if (parts.length === 2) {
        const device = { type: vm.confirmDriverType, label: parts[1] }
        console.log('QHYCCD | AddDevice: ', device)
        vm.devicesList.push(device)
        vm.ToBeConnectDevice = vm.devicesList.filter(item => item.type === vm.CurrentDriverType)
        vm.loadingSelectDriver = false
      }
      break
    }
    case 'updateDevices_':
      if (parts.length === 3) vm.updateDevices_(parts[1], parts[2])
      break
    case 'ConnectSuccess': {
      if (parts.length === 4) {
        const [, type, deviceName, driverName] = parts
        vm.updateDevicesConnect(type, deviceName, driverName, deviceName !== '', { silent: type === 'CFW' })
      }
      break
    }
    case 'ConnectFailed':
      if (parts.length === 2) {
        vm.callShowMessageBox(parts[1], 'error')
        vm.loadingConnectAllDevice = false
      }
      break
    case 'ConnectAllDeviceComplete':
      vm.loadingConnectAllDevice = false
      if (vm.isConnecting) {
        vm.isConnecting = false
        vm.stopLoading()
      }
      break
    case 'ScanFailed':
      if (parts.length === 2) {
        vm.callShowMessageBox(parts[1], 'error')
        vm.loadingSelectDriver = false
      }
      break
    case 'AddDeviceType':
      if (parts.length === 2) {
        vm.addInlineCameraAllocationRole(parts[1])
        vm.$bus.$emit('AddDeviceType', parts[1])
      }
      break
    case 'DeviceToBeAllocated': {
      if (parts.length >= 4) {
        const [, deviceType, rawIndex, deviceName, cameraCategory = 'OTHER'] = parts
        const numericIndex = Number(rawIndex)
        const deviceIndex = Number.isFinite(numericIndex) ? numericIndex : rawIndex
        vm.upsertInlineCameraAllocationCandidate(deviceType, deviceIndex, deviceName)
        vm.$bus.$emit('DeviceToBeAllocated', deviceType, deviceIndex, deviceName, cameraCategory)
      }
      break
    }
    case 'ShowDeviceAllocationWindow':
      if (vm.isCameraAllocationRole(vm.CurrentDriverType)) {
        vm.SendConsoleLogMsg('[DIAG][ALLOC_INLINE] use_inline_camera_candidate_bar', 'info')
        vm.$store.commit('setValue', { varName: 'showNavigationDrawer', newValue: true })
        vm.isOpenPowerPage = false
        vm.isOpenDevicePage = true
        vm.drawer_2 = true
        break
      }
      vm.SendConsoleLogMsg(
        `[DIAG][ALLOC_POPUP_FLOW] stage=rx_show_alloc nav=${vm.$store.state.showNavigationDrawer ? 1 : 0} submenu=${vm.drawer_2 ? 1 : 0} devPage=${vm.isOpenDevicePage ? 1 : 0}`,
        'warning'
      )
      vm.$bus.$emit('clearDeviceAllocationList')
      vm.clearInlineCameraAllocationState('all')
      vm.$store.commit('setValue', { varName: 'showNavigationDrawer', newValue: false })
      vm.drawer_2 = false
      vm.isOpenDevicePage = false
      vm.$nextTick(() => {
        vm.SendConsoleLogMsg(
          `[DIAG][ALLOC_POPUP_FLOW] stage=after_close_menu nav=${vm.$store.state.showNavigationDrawer ? 1 : 0} submenu=${vm.drawer_2 ? 1 : 0} devPage=${vm.isOpenDevicePage ? 1 : 0}`,
          'warning'
        )
        vm.$bus.$emit('openDeviceAllocationPanel')
        vm.SendConsoleLogMsg('[DIAG][ALLOC_POPUP_FLOW] stage=emit_open_alloc', 'warning')
      })
      break
  }

  return true
}
