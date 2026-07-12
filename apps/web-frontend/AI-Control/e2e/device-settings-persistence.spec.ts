import { expect, test } from '@playwright/test'
import {
  drainDeviceConfigChanges,
  queueDeviceConfigChange,
} from '../../src/domain/devices/deviceSettingsPersistence.js'

test('pending settings keep only the latest value for each device field', () => {
  let pending = queueDeviceConfigChange({}, {
    driverType: 'Guider', label: 'Guider Focal Length (mm)', value: '240',
  })
  pending = queueDeviceConfigChange(pending, {
    driverType: 'Guider', label: 'Guider Focal Length (mm)', value: '250',
  })
  pending = queueDeviceConfigChange(pending, {
    driverType: 'Guider', label: 'Multi Star Guider', value: true,
  })

  expect(Object.values(pending)).toEqual([
    { driverType: 'Guider', label: 'Guider Focal Length (mm)', value: '250' },
    { driverType: 'Guider', label: 'Multi Star Guider', value: true },
  ])
})

test('drain returns queued settings and clears pending state', () => {
  const pending = queueDeviceConfigChange({}, {
    driverType: 'MainCamera', label: 'Main Camera Focal Length (mm)', value: 600,
  })
  const drained = drainDeviceConfigChanges(pending)
  expect(drained.changes).toEqual([
    { driverType: 'MainCamera', label: 'Main Camera Focal Length (mm)', value: 600 },
  ])
  expect(drained.pendingChanges).toEqual({})
})
