import { expect, test } from '@playwright/test'
import { getFlowCallsByCommand } from '../scenario/cliFlows'

function paramField(params: unknown, key: string): unknown {
  if (params == null || typeof params !== 'object') return undefined
  return Reflect.get(params, key)
}

test('maincamera-connect-capture 将 captureExposure 传入 device.captureOnce', () => {
  const calls = getFlowCallsByCommand('maincamera-connect-capture', {
    captureExposure: '100ms',
  })
  const cap = calls.find((c) => c.id === 'device.captureOnce')
  expect(cap?.params).toMatchObject({ captureExposure: '100ms', deviceType: 'MainCamera' })
})

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

test('image-file-manager：无交互参数时仅打开菜单', () => {
  const calls = getFlowCallsByCommand('image-file-manager', {})
  expect(calls.map((c) => c.id)).toEqual(['menu.openImageManager'])
})

test('image-file-manager：deleteConfirmDialog 展开为 dialog.imageManager.confirm(deleteConfirm)', () => {
  const calls = getFlowCallsByCommand('image-file-manager', {
    imageManagerInteract: { delete: true, deleteConfirmDialog: true },
  })
  const ids = calls.map((c) => c.id)
  expect(ids).toContain('menu.openImageManager')
  expect(ids).toContain('ui.click')
  const confirmCall = calls.find((c) => c.id === 'dialog.imageManager.confirm')
  expect(confirmCall).toBeDefined()
  expect(confirmCall?.params).toMatchObject({ dialog: 'deleteConfirm' })
})

test('image-file-manager：deleteConfirmDialog 为 cancel 时展开为 dialog.imageManager.cancel(deleteConfirm)', () => {
  const calls = getFlowCallsByCommand('image-file-manager', {
    imageManagerInteract: { delete: true, deleteConfirmDialog: 'cancel' },
  })
  const cancelCall = calls.find((c) => c.id === 'dialog.imageManager.cancel')
  expect(cancelCall?.params).toMatchObject({ dialog: 'deleteConfirm' })
})

test('image-file-manager：openFolderIndex + selectAllInOpenFolder', () => {
  const calls = getFlowCallsByCommand('image-file-manager', {
    imageManagerInteract: { openFolderIndex: 2, selectAllInOpenFolder: true },
  })
  expect(calls.map((c) => c.id)).toEqual([
    'menu.openImageManager',
    'imageManager.openFolder',
    'imageManager.setFolderCheckbox',
  ])
  expect(calls[1]?.params).toMatchObject({ folderIndex: 2 })
  expect(calls[2]?.params).toMatchObject({ folderIndex: 2, checked: true })
})

test('image-file-manager：selectAllInOpenFolder 无 openFolderIndex 时报错', () => {
  expect(() =>
    getFlowCallsByCommand('image-file-manager', {
      imageManagerInteract: { selectAllInOpenFolder: true },
    }),
  ).toThrow(/openFolderIndex/)
})

test('image-file-manager：moveToUsb + usbSelectIndex + usbTransferConfirmDialog', () => {
  const calls = getFlowCallsByCommand('image-file-manager', {
    imageManagerInteract: {
      moveToUsb: true,
      usbSelectIndex: 1,
      usbTransferConfirmDialog: true,
    },
  })
  const usbClick = calls.find(
    (c) => c.id === 'ui.click' && paramField(c.params, 'testId') === 'imp-btn-move-file-to-usb',
  )
  expect(usbClick).toBeDefined()
  expect(calls.find((c) => c.id === 'imageManager.selectUsbByIndex')?.params).toMatchObject({ usbIndex: 1 })
  expect(
    calls.find(
      (c) => c.id === 'dialog.imageManager.confirm' && paramField(c.params, 'dialog') === 'usbConfirm',
    ),
  ).toBeDefined()
})

test('image-file-manager：download 步骤顺序为 点击下载 → 并发 → 下载确认 → 路径提示', () => {
  const calls = getFlowCallsByCommand('image-file-manager', {
    imageManagerInteract: {
      download: true,
      downloadConcurrency: 2,
      downloadConfirmDialog: true,
      downloadLocationReminderDialog: true,
    },
  })
  const ids = calls.map((c) => c.id)
  const iMenu = ids.indexOf('menu.openImageManager')
  const iDlClick = calls.findIndex(
    (c) => c.id === 'ui.click' && paramField(c.params, 'testId') === 'imp-btn-download-selected',
  )
  const iConc = ids.indexOf('imageManager.setDownloadConcurrency')
  const confirms = calls.filter((c) => c.id === 'dialog.imageManager.confirm')
  expect(iMenu).toBe(0)
  expect(iDlClick).toBeGreaterThan(iMenu)
  expect(iConc).toBe(iDlClick + 1)
  expect(calls[iConc]?.params).toMatchObject({ value: 2 })
  expect(confirms[0]?.params).toMatchObject({ dialog: 'downloadConfirm' })
  expect(confirms[1]?.params).toMatchObject({ dialog: 'downloadLocationReminder' })
})

test('image-file-manager：imageFileSwitch 在 refresh 之前', () => {
  const calls = getFlowCallsByCommand('image-file-manager', {
    imageManagerInteract: { imageFileSwitch: true, refresh: true },
  })
  const ids = calls.map((c) => c.id)
  const iSwitch = calls.findIndex(
    (c) => c.id === 'ui.click' && paramField(c.params, 'testId') === 'imp-btn-image-file-switch',
  )
  const iRefresh = calls.findIndex(
    (c) => c.id === 'ui.click' && paramField(c.params, 'testId') === 'imp-btn-refresh-current-folder',
  )
  expect(iSwitch).toBeLessThan(iRefresh)
  expect(ids[iSwitch]).toBe('ui.click')
  expect(ids[iRefresh]).toBe('ui.click')
})
