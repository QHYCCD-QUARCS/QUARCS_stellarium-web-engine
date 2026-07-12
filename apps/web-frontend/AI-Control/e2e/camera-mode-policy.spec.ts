import { expect, test } from '@playwright/test'
import {
  cameraModeConsistencyActions,
  deviceDisplayText,
  driverSelectionValue,
  hasBoundDeviceName,
  linkedCameraModeDevices,
  normalizeDriverKey,
} from '../../src/domain/devices/cameraModePolicy.js'

function cameras(overrides = {}) {
  return [
    { driverType: 'MainCamera', driverName: 'QHY CCD', connectionMode: 'SDK', isConnected: false },
    { driverType: 'Guider', driverName: 'qhy ccd', connectionMode: 'INDI', isConnected: false },
    { driverType: 'PoleCamera', driverName: 'Other Camera', connectionMode: 'INDI', isConnected: false },
  ].map(device => ({ ...device, ...(overrides[device.driverType] || {}) }))
}

test('driver keys ignore casing and reject mode placeholders', () => {
  expect(normalizeDriverKey(' QHY CCD ')).toBe('qhy ccd')
  expect(normalizeDriverKey('SDK')).toBe('')
  expect(normalizeDriverKey('indi')).toBe('')
})

test('SDK implementation name maps back to the driver selector value', () => {
  expect(driverSelectionValue('QHYCCD')).toBe('indi_qhy_ccd')
  expect(driverSelectionValue('indi_qhy_ccd')).toBe('indi_qhy_ccd')
})

test('SDK display takes precedence over a saved INDI device name', () => {
  expect(deviceDisplayText({ connectionMode: 'SDK', device: 'indi_qhy_ccd', driverName: 'indi_qhy_ccd' }))
    .toBe('QHYCCD SDK')
  expect(deviceDisplayText({ connectionMode: 'SDK', device: 'QHY5III585M-8baa5d53', driverName: 'indi_qhy_ccd', isConnected: true }))
    .toBe('QHY5III585M-8baa5d53')
  expect(deviceDisplayText({ connectionMode: 'INDI', device: 'indi_qhy_ccd' })).toBe('indi_qhy_ccd')
  expect(deviceDisplayText({ connectionMode: 'INDI', device: 'Not Bind Device' })).toBe('')
})

test('disconnected SDK camera keeps its selected camera name', () => {
  expect(deviceDisplayText({
    connectionMode: 'SDK',
    device: 'QHY5III585M-8baa5d53',
    driverName: 'indi_qhy_ccd',
    isConnected: false,
  })).toBe('QHY5III585M-8baa5d53')
})

test('a concrete disconnected camera remains a binding when driver metadata refreshes', () => {
  expect(hasBoundDeviceName({
    device: 'QHY5III585M-8baa5d53',
    driverName: 'QHYCCD',
    connectionMode: 'SDK',
    isConnected: false,
  })).toBe(true)
  expect(hasBoundDeviceName({ device: 'QHYCCD', driverName: 'QHYCCD' })).toBe(false)
})

test('only camera roles sharing the same driver are linked', () => {
  expect(linkedCameraModeDevices(cameras(), 'MainCamera').map(device => device.driverType))
    .toEqual(['MainCamera', 'Guider'])
  expect(linkedCameraModeDevices(cameras(), 'Mount')).toEqual([])
})

test('an active SDK camera locks peers to SDK', () => {
  const devices = cameras({ MainCamera: { isConnected: true } })
  expect(cameraModeConsistencyActions(devices, 'Guider')).toEqual([
    { driverType: 'Guider', mode: 'SDK' },
  ])
})

test('an active INDI camera locks peers to INDI', () => {
  const devices = cameras({
    MainCamera: { connectionMode: 'SDK' },
    Guider: { connectionMode: 'INDI', isConnected: true },
  })
  expect(cameraModeConsistencyActions(devices, 'MainCamera')).toEqual([
    { driverType: 'MainCamera', mode: 'INDI' },
  ])
})

test('without connected cameras the preferred role wins', () => {
  expect(cameraModeConsistencyActions(cameras(), 'Guider')).toEqual([
    { driverType: 'MainCamera', mode: 'INDI' },
  ])
})
