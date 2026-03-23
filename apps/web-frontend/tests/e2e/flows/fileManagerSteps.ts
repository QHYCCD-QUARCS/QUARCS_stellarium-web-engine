/**
 * 图像文件管理相关步骤注册表 (fileManagerSteps)
 *
 * 作用：
 * 封装图像管理入口的打开、进入文件夹、打开文件等。以 data-testid（imp-root、ui-app-menu-open-image-manager、ui-image-folder-root-{index}、ui-image-folder-file-{folderIndex}-{fileIndex}）定位，禁止 force。
 *
 * 执行过程概要：
 * - fm.gotoHome：使用 helpers.gotoHome(page)，即 goto getAppStartPath() 并等待 ui-app-root 可见，与报告约定一致。
 * - fm.open：前置步骤 ensureMenuDrawerOpen → 动作 点击 ui-app-menu-open-image-manager → 后置确认 imp-root 可见。
 * - fm.openFolder：前置检查 imp-root 可见 → 动作 clickByTestId(ui-image-folder-root-{folderIndex})。
 * - fm.openFile：前置检查 imp-root 可见 → 动作 点击文件夹与文件 testid；暂无图片加载完成信号时用固定延时过渡。
 *
 * 规范：以全局唯一 data-testid 定位；参考 testid-validation-report.md、testid-scan-report.md。ImageManagerBrowser/ImageFolder 中已定义上述 testid。
 */
import { expect } from '@playwright/test'
import type { StepRegistry } from './flowTypes'
import { clickByTestId, ensureMenuDrawerOpen, gotoHome } from './helpers'

export function makeFileManagerStepRegistry(): StepRegistry {
  const registry: StepRegistry = new Map()

  registry.set('fm.gotoHome', {
    async run(ctx) {
      await gotoHome(ctx.page, ctx.stepTimeoutMs)
    },
  })

  registry.set('fm.open', {
    async run(ctx, params) {
      console.log('[flow] fm.open 前置步骤 ensureMenuDrawerOpen，动作 点击 ui-app-menu-open-image-manager')
      await ensureMenuDrawerOpen(ctx.page, ctx.stepTimeoutMs)
      await clickByTestId(ctx.page, 'ui-app-menu-open-image-manager', params.timeoutMs ?? ctx.stepTimeoutMs)
      await expect(ctx.page.getByTestId('imp-root')).toBeVisible({ timeout: params.timeoutMs ?? ctx.stepTimeoutMs })
      console.log('[flow] fm.open 后置确认: imp-root 可见')
    },
  })

  registry.set('fm.openFolder', {
    async run(ctx, params) {
      const folderIndex = Number(params.folderIndex ?? 0)
      await expect(ctx.page.getByTestId('imp-root')).toBeVisible({ timeout: ctx.stepTimeoutMs })
      await clickByTestId(ctx.page, `ui-image-folder-root-${folderIndex}`, params.timeoutMs ?? ctx.stepTimeoutMs)
    },
  })

  registry.set('fm.openFile', {
    async run(ctx, params) {
      const folderIndex = Number(params.folderIndex ?? 0)
      const fileIndex = Number(params.fileIndex ?? 0)
      console.log(`[flow] fm.openFile folderIndex=${folderIndex} fileIndex=${fileIndex}`)
      await expect(ctx.page.getByTestId('imp-root')).toBeVisible({ timeout: ctx.stepTimeoutMs })
      await clickByTestId(ctx.page, `ui-image-folder-root-${folderIndex}`, params.timeoutMs ?? ctx.stepTimeoutMs)
      await clickByTestId(ctx.page, `ui-image-folder-file-${folderIndex}-${fileIndex}`, params.timeoutMs ?? ctx.stepTimeoutMs)
      // 暂无图片加载/渲染完成的明确信号，用固定延时作为过渡，待产品暴露 testid/状态后再替换
      await ctx.page.waitForTimeout(Number(params.waitImageTimeoutMs ?? 1000))
    },
  })

  return registry
}
