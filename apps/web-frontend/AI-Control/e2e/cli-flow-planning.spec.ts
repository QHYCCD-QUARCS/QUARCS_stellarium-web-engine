import { expect, test } from '@playwright/test'
import { getFlowCallsByCommand } from '../scenario/cliFlows'

test('maincamera-connect-capture 默认仍会生成一次拍摄步骤', () => {
  const calls = getFlowCallsByCommand('maincamera-connect-capture', {
    captureTemperature: -10,
  })

  expect(calls.map((call) => call.id)).toEqual([
    'device.connectIfNeeded',
    'device.mainCamera.applyCaptureConfig',
    'menu.drawer.close',
    'capture.panel.ensureOpen',
    'device.captureOnce',
  ])
})

test('maincamera-connect-capture 支持只改参数不拍摄', () => {
  const calls = getFlowCallsByCommand('maincamera-connect-capture', {
    doCapture: false,
    captureTemperature: -10,
    doSave: true,
  })

  expect(calls.map((call) => call.id)).toEqual([
    'device.connectIfNeeded',
    'device.mainCamera.applyCaptureConfig',
    'menu.drawer.close',
    'capture.panel.ensureOpen',
  ])
  expect(calls.some((call) => call.id === 'device.captureOnce')).toBe(false)
  expect(calls.some((call) => call.id === 'device.save')).toBe(false)
})

test('maincamera-connect-capture 在不拍摄时仍可设置曝光', () => {
  const calls = getFlowCallsByCommand('maincamera-connect-capture', {
    doCapture: false,
    captureExposure: '1s',
  })

  expect(calls.map((call) => call.id)).toEqual([
    'device.connectIfNeeded',
    'menu.drawer.close',
    'capture.panel.ensureOpen',
    'device.setExposureTime',
  ])
  expect(calls.some((call) => call.id === 'device.captureOnce')).toBe(false)
})

test('device-disconnect 会按 deviceType 生成单设备断开步骤', () => {
  const calls = getFlowCallsByCommand('device-disconnect', {
    deviceType: 'Mount',
  })

  expect(calls).toEqual([
    {
      id: 'device.disconnectIfNeeded',
      params: { deviceType: 'Mount' },
    },
  ])
})

test('device-disconnect 缺少 deviceType 时抛出错误', () => {
  expect(() => getFlowCallsByCommand('device-disconnect')).toThrow(/deviceType/)
})
