/**
 * `image-file-manager` CLI：将 imageManagerInteract 参数展开为 FlowStepCall 序列。
 * 与 ImageManagerBrowser.vue（imp-*）及 dialog.imageManager.* 步骤对齐。
 */
import type { FlowStepCall } from '../core/flowTypes'
import { createStepError } from '../shared/errors'

export type ImageManagerDialogAction = 'confirm' | 'cancel'

/** 图像管理面板交互参数（扩展后可配合弹窗确认、侧栏选文件夹等） */
export interface ImageManagerInteractParams {
  moveToUsb?: boolean
  delete?: boolean
  download?: boolean
  imageFileSwitch?: boolean
  refresh?: boolean
  panelClose?: boolean
  /** 侧栏文件夹索引（从 0 起），先打开再执行后续选择 */
  openFolderIndex?: number
  /** 将对应 `openFolderIndex` 文件夹行的复选框勾上（当前文件夹内文件联动全选） */
  selectAllInOpenFolder?: boolean
  /** 工具栏删除后的删除确认弹窗；默认不点（与历史行为一致） */
  deleteConfirmDialog?: boolean | ImageManagerDialogAction
  /** 移动到 USB 后选择列表第几项（0 起），对应 `imp-act-select-usb` */
  usbSelectIndex?: number
  /** USB 传输确认弹窗 `usbConfirm` */
  usbTransferConfirmDialog?: boolean | ImageManagerDialogAction
  /** 批量下载确认弹窗 `downloadConfirm`（点「开始下载」或关闭） */
  downloadConfirmDialog?: boolean | ImageManagerDialogAction
  /** 下载路径提示弹窗 `downloadLocationReminder`（点「继续」或取消） */
  downloadLocationReminderDialog?: boolean | ImageManagerDialogAction
  /** 下载确认框内并发数 1/2/3（在点「开始下载」前设置） */
  downloadConcurrency?: 1 | 2 | 3
}

function normalizeDialog(v: boolean | ImageManagerDialogAction | undefined): 'confirm' | 'cancel' | null {
  if (v === undefined || v === false) return null
  if (v === true || v === 'confirm') return 'confirm'
  if (v === 'cancel') return 'cancel'
  return null
}

function pushDialogAction(
  calls: FlowStepCall[],
  action: 'confirm' | 'cancel',
  dialog: 'usbConfirm' | 'deleteConfirm' | 'downloadConfirm' | 'downloadLocationReminder',
) {
  calls.push({
    id: action === 'confirm' ? 'dialog.imageManager.confirm' : 'dialog.imageManager.cancel',
    params: { dialog },
  })
}

export function buildImageManagerFlowCalls(im: ImageManagerInteractParams | undefined): FlowStepCall[] {
  if (!im || typeof im !== 'object') return []
  const calls: FlowStepCall[] = []

  if (typeof im.openFolderIndex === 'number' && Number.isFinite(im.openFolderIndex) && im.openFolderIndex >= 0) {
    calls.push({ id: 'imageManager.openFolder', params: { folderIndex: Math.floor(im.openFolderIndex) } })
  }

  if (im.selectAllInOpenFolder === true) {
    const fi = im.openFolderIndex
    if (typeof fi !== 'number' || !Number.isFinite(fi) || fi < 0) {
      throw createStepError('image-file-manager', 'flowParams', 'selectAllInOpenFolder 为 true 时需同时提供 openFolderIndex（非负整数）')
    }
    calls.push({
      id: 'imageManager.setFolderCheckbox',
      params: { folderIndex: Math.floor(fi), checked: true },
    })
  }

  if (im.moveToUsb) {
    calls.push({ id: 'ui.click', params: { testId: 'imp-btn-move-file-to-usb', skipIfDisabled: true } })
    if (typeof im.usbSelectIndex === 'number' && im.usbSelectIndex >= 0) {
      calls.push({ id: 'imageManager.selectUsbByIndex', params: { usbIndex: Math.floor(im.usbSelectIndex) } })
    }
    const usbAction = normalizeDialog(im.usbTransferConfirmDialog)
    if (usbAction) pushDialogAction(calls, usbAction, 'usbConfirm')
  }

  if (im.delete) {
    calls.push({ id: 'ui.click', params: { testId: 'imp-btn-delete-btn-click' } })
    const delAction = normalizeDialog(im.deleteConfirmDialog)
    if (delAction) pushDialogAction(calls, delAction, 'deleteConfirm')
  }

  if (im.download) {
    calls.push({ id: 'ui.click', params: { testId: 'imp-btn-download-selected' } })
    if (typeof im.downloadConcurrency === 'number' && [1, 2, 3].includes(im.downloadConcurrency)) {
      calls.push({ id: 'imageManager.setDownloadConcurrency', params: { value: im.downloadConcurrency } })
    }
    const dlAction = normalizeDialog(im.downloadConfirmDialog)
    if (dlAction) pushDialogAction(calls, dlAction, 'downloadConfirm')
    const locAction = normalizeDialog(im.downloadLocationReminderDialog)
    if (locAction) pushDialogAction(calls, locAction, 'downloadLocationReminder')
  }

  if (im.imageFileSwitch) {
    calls.push({ id: 'ui.click', params: { testId: 'imp-btn-image-file-switch' } })
  }
  if (im.refresh) {
    calls.push({
      id: 'ui.click',
      params: { testId: 'imp-btn-refresh-current-folder', skipIfDisabled: true },
    })
  }
  if (im.panelClose) {
    calls.push({ id: 'ui.click', params: { testId: 'imp-btn-panel-close' } })
  }

  return calls
}
