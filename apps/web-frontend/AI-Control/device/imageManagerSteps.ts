/**
 * 图像管理面板（ImageManagerBrowser / imp-*）专用步骤。
 * 供 `image-file-manager` CLI 与 `imageManager.applyInteract` 复用。
 */
import type { StepRegistry } from '../core/flowTypes'
import { createStepError } from '../shared/errors'
import { IMAGE_MANAGER_DIALOG_CONFIGS } from '../shared/dialogConstants'
import { sleep } from '../shared/interaction'

function parseNonNegativeInt(params: Record<string, unknown>, key: string): number {
  const n = Number(params[key])
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
    throw createStepError('imageManager', 'params', `缺少或无效的 ${key}（需非负整数）`, { [key]: params[key] })
  }
  return n
}

/** 关闭按钮：多 USB 时的「选择 U 盘」弹层（与 usbConfirm 等并列，见 ImageManagerBrowser.vue） */
const USB_SELECT_DIALOG_ROOT = 'imp-act-usb-select-dialog'
const USB_SELECT_DIALOG_CLOSE_BTN = 'imp-btn-close-usbselect-dialog'

function dismissPairsInOrder(): Array<{ root: string; close: string }> {
  const pairs: Array<{ root: string; close: string }> = [
    { root: USB_SELECT_DIALOG_ROOT, close: USB_SELECT_DIALOG_CLOSE_BTN },
  ]
  for (const cfg of Object.values(IMAGE_MANAGER_DIALOG_CONFIGS)) {
    pairs.push({ root: cfg.rootTestId, close: cfg.cancelTestId })
  }
  return pairs
}

export function makeImageManagerStepRegistry(): StepRegistry {
  const registry: StepRegistry = new Map()

  /**
   * 若图像管理内仍有未关弹层（残留遮罩会拦截侧栏点击），按顺序尝试点「取消/关闭」。
   * 与 `MoveFileToUSB` 单 U 盘直出确认框、多 U 盘先选再确认等行为兼容。
   */
  registry.set('imageManager.dismissOpenDialogsIfAny', {
    async run(ctx) {
      const page = ctx.page
      const stepTimeout = ctx.stepTimeoutMs
      const pairs = dismissPairsInOrder()
      for (let round = 0; round < 2; round++) {
        let closedAny = false
        for (const { root, close } of pairs) {
          const rootLoc = page.getByTestId(root).first()
          const rootVisible = await rootLoc.isVisible().catch(() => false)
          if (!rootVisible) continue
          const closeBtn = page.getByTestId(close).first()
          const btnVisible = await closeBtn.isVisible().catch(() => false)
          if (!btnVisible) continue
          await closeBtn.click({ timeout: stepTimeout })
          await sleep(200)
          closedAny = true
        }
        if (!closedAny) break
      }
    },
  })

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
      const items = ctx.page.getByTestId('imp-act-select-usb')
      const count = await items.count()
      if (count === 0) {
        return
      }
      if (index >= count) {
        throw createStepError('imageManager.selectUsbByIndex', 'params', 'usbIndex 超出当前 USB 列表长度', {
          usbIndex: index,
          listLength: count,
        })
      }
      await items.nth(index).click({ timeout })
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
        .selectOption(
          { value: String(v) },
          { timeout: (params.timeoutMs as number | undefined) ?? ctx.stepTimeoutMs },
        )
      await sleep(100)
    },
  })

  return registry
}
