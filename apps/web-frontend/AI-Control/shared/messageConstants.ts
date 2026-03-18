/**
 * 与 App.vue CaptureImageSaveStatus 反馈一致的保存结果文案（含 i18n 键或常见翻译），
 * 用于 device.save 后置确认时匹配 ui-message-box-root 内容。
 */

/** 保存成功时 MessageBox 可能显示的文案（键或英文） */
export const SAVE_SUCCESS_SUBSTRINGS = ['Image saved successfully']

/** 保存失败时 MessageBox 可能显示的文案（与 App.vue case 分支一致） */
export const SAVE_FAILURE_SUBSTRINGS = [
  'There is no need to save it again',
  'No images to save',
  'There is not enough space on the USB drive',
  'There is not enough space on the local storage',
  'USB drive is read-only',
  'Failed to save image',
  'USB not available',
]

const MESSAGE_BOX_ROOT_TESTID = 'ui-message-box-root'

export { MESSAGE_BOX_ROOT_TESTID }
