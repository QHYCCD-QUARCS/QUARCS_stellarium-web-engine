/**
 * 图像文件管理：从环境变量解析 flowParams 与 getFlowCallsByCommand 衔接（无浏览器）。
 */
import { expect, test } from '@playwright/test'
import { getFlowCallsByCommand } from '../scenario/cliFlows'
import { resolveFlowParamsFromEnv } from '../setup/flowParamsFromEnv'

const IM_ENV_KEYS = [
  'E2E_IMAGE_MANAGER_INTERACT',
  'E2E_IMAGE_MANAGER_INTERACT_JSON',
  'E2E_IMAGE_MANAGER_OPEN_FOLDER_INDEX',
  'E2E_IMAGE_MANAGER_USB_SELECT_INDEX',
  'E2E_IMAGE_MANAGER_DOWNLOAD_CONCURRENCY',
]

function snapshotImEnv(): Record<string, string | undefined> {
  const o: Record<string, string | undefined> = {}
  for (const k of IM_ENV_KEYS) o[k] = process.env[k]
  return o
}

function restoreImEnv(prev: Record<string, string | undefined>) {
  for (const k of IM_ENV_KEYS) {
    if (prev[k] === undefined) delete process.env[k]
    else process.env[k] = prev[k]
  }
}

test('resolveFlowParamsFromEnv：逗号 key + JSON + 数值 env 合并进 imageManagerInteract', () => {
  const prev = snapshotImEnv()
  try {
    process.env.E2E_IMAGE_MANAGER_INTERACT = 'delete,deleteconfirm'
    process.env.E2E_IMAGE_MANAGER_OPEN_FOLDER_INDEX = '2'
    process.env.E2E_IMAGE_MANAGER_USB_SELECT_INDEX = '0'
    process.env.E2E_IMAGE_MANAGER_DOWNLOAD_CONCURRENCY = '3'
    process.env.E2E_IMAGE_MANAGER_INTERACT_JSON = JSON.stringify({ download: true })
    const p = resolveFlowParamsFromEnv({})
    expect(p.imageManagerInteract?.delete).toBe(true)
    expect(p.imageManagerInteract?.deleteConfirmDialog).toBe(true)
    expect(p.imageManagerInteract?.openFolderIndex).toBe(2)
    expect(p.imageManagerInteract?.usbSelectIndex).toBe(0)
    expect(p.imageManagerInteract?.download).toBe(true)
    expect(p.imageManagerInteract?.downloadConcurrency).toBe(3)
    const calls = getFlowCallsByCommand('image-file-manager', p)
    expect(calls.map((c) => c.id)).toContain('imageManager.openFolder')
    expect(calls.map((c) => c.id)).toContain('imageManager.setDownloadConcurrency')
  } finally {
    restoreImEnv(prev)
  }
})
