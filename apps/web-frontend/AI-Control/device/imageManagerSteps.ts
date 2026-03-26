/**
 * 图像管理面板（ImageManagerBrowser / imp-*）专用步骤。
 * 供 `image-file-manager` CLI 与 `imageManager.applyInteract` 复用。
 */
import type { StepRegistry } from '../core/flowTypes'
import { createStepError } from '../shared/errors'
import { sleep } from '../shared/interaction'

function parseNonNegativeInt(params: Record<string, unknown>, key: string): number {
  const n = Number(params[key])
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
    throw createStepError('imageManager', 'params', `缺少或无效的 ${key}（需非负整数）`, { [key]: params[key] })
  }
  return n
}

export function makeImageManagerStepRegistry(): StepRegistry {
  const registry: StepRegistry = new Map()

  /** 点击侧栏文件夹行（与界面「选中/切换当前文件夹」一致） */
  registry.set('imageManager.openFolder', {
    async run(ctx, params) {
      const folderIndex = parseNonNegativeInt(params as Record<string, unknown>, 'folderIndex')
      const timeout = (params.timeoutMs as number | undefined) ?? ctx.stepTimeoutMs
      await ctx.page.getByTestId(`imp-sidebar-folder-${folderIndex}`).first().click({ timeout })
    },
  })

  /** 设置侧栏某文件夹行的复选框（勾选后当前文件夹内文件会按组件逻辑联动全选） */
  registry.set('imageManager.setFolderCheckbox', {
    async run(ctx, params) {
      const folderIndex = parseNonNegativeInt(params as Record<string, unknown>, 'folderIndex')
      const checked = params.checked !== false
      const timeout = (params.timeoutMs as number | undefined) ?? ctx.stepTimeoutMs
      const input = ctx.page
        .getByTestId(`imp-sidebar-folder-${folderIndex}`)
        .first()
        .locator('.folder-item-check input[type="checkbox"]')
      await input.setChecked(checked, { timeout })
    },
  })

  /** USB 选择列表中第 n 项（0 起），对应 `imp-act-select-usb` */
  registry.set('imageManager.selectUsbByIndex', {
    async run(ctx, params) {
      const index = parseNonNegativeInt(params as Record<string, unknown>, 'usbIndex')
      const timeout = (params.timeoutMs as number | undefined) ?? ctx.stepTimeoutMs
      await ctx.page.getByTestId('imp-act-select-usb').nth(index).click({ timeout })
    },
  })

  /** 下载确认框内设置并发数（1/2/3） */
  registry.set('imageManager.setDownloadConcurrency', {
    async run(ctx, params) {
      const v = Number(params.value)
      if (![1, 2, 3].includes(v)) {
        throw createStepError('imageManager.setDownloadConcurrency', 'params', 'value 须为 1、2 或 3', {
          value: params.value,
        })
      }
      await ctx.page
        .getByTestId('imp-select-download-concurrency')
        .first()
        .selectOption({ value: String(v), timeout: (params.timeoutMs as number | undefined) ?? ctx.stepTimeoutMs })
      await sleep(100)
    },
  })

  return registry
}
