import { expect, test } from '@playwright/test'
import { handleDeviceDiscoveryMessage } from '../../src/domain/devices/deviceDiscoveryMessageHandlers.js'

function createVm() {
  const events: unknown[][] = []
  const vm: any = {
    CurrentDriverType: 'Guider',
    confirmDriverType: 'Guider',
    drivers: [],
    devicesList: [],
    ToBeConnectDevice: [],
    loadingSelectDriver: true,
    loadingConnectAllDevice: true,
    isConnecting: false,
    $bus: { $emit: (...args: unknown[]) => events.push(args) },
  }
  return { vm, events }
}

test('ignores messages outside device discovery and connection flow', () => {
  const { vm } = createVm()
  expect(handleDeviceDiscoveryMessage(vm, 'ExposureCompleted', ['ExposureCompleted'])).toBe(false)
})

test('collects drivers and prioritizes QHY drivers', () => {
  const { vm } = createVm()
  expect(handleDeviceDiscoveryMessage(vm, 'AddDriver', ['AddDriver', 'Other', 'other'])).toBe(true)
  handleDeviceDiscoveryMessage(vm, 'AddDriver', ['AddDriver', 'QHY CCD', 'qhy'])
  expect(vm.drivers).toEqual([
    { type: 'Guider', label: 'QHY CCD', value: 'qhy' },
    { type: 'Guider', label: 'Other', value: 'other' },
  ])
})

test('rebuilds connect candidates from scanned devices', () => {
  const { vm } = createVm()
  vm.devicesList.push({ type: 'MainCamera', label: 'main' })
  handleDeviceDiscoveryMessage(vm, 'AddDevice', ['AddDevice', 'guide'])
  expect(vm.ToBeConnectDevice).toEqual([{ type: 'Guider', label: 'guide' }])
  expect(vm.loadingSelectDriver).toBe(false)
})

test('normalizes allocation indexes before updating UI state', () => {
  const { vm, events } = createVm()
  vm.upsertInlineCameraAllocationCandidate = (...args: unknown[]) => events.push(['upsert', ...args])
  handleDeviceDiscoveryMessage(vm, 'DeviceToBeAllocated', ['DeviceToBeAllocated', 'Guider', '7', 'QHY5', 'QHY'])
  expect(events).toEqual([
    ['upsert', 'Guider', 7, 'QHY5'],
    ['DeviceToBeAllocated', 'Guider', 7, 'QHY5', 'QHY'],
  ])
})

test('connect all completion clears both loading paths', () => {
  const { vm } = createVm()
  vm.isConnecting = true
  vm.stopLoading = () => { vm.stopped = true }
  handleDeviceDiscoveryMessage(vm, 'ConnectAllDeviceComplete', ['ConnectAllDeviceComplete'])
  expect(vm.loadingConnectAllDevice).toBe(false)
  expect(vm.isConnecting).toBe(false)
  expect(vm.stopped).toBe(true)
})
