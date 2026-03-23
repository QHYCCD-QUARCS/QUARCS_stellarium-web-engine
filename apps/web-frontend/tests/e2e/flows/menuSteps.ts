/**
 * 菜单相关步骤注册表 (menuSteps)
 *
 * 作用：
 * 封装主菜单抽屉内的操作：断开/连接全部设备、确认/取消弹窗、打开电源管理、调试日志、通用设置、刷新确认等。
 * 所有交互均通过 data-testid 定位，先确保菜单抽屉打开再点击菜单项，禁止 force。
 *
 * 执行过程概要：
 * - menu.disconnectAll：前置步骤 ensureMenuDrawerOpen → 动作 点击 ui-app-menu-disconnect-all → 若有确认弹窗则 confirm，后置确认弹窗已处理。
 * - menu.connectAll：前置步骤 ensureMenuDrawerOpen → 动作 点击 ui-app-menu-connect-all。
 * - menu.confirmDialogConfirm / menu.confirmDialogCancel：若 ui-confirm-dialog-root 可见则点击对应按钮。
 * - menu.openPowerManager：打开菜单 → 点击 ui-app-menu-open-power-manager → 断言 ui-power-manager-root 可见。
 * - menu.openDebugLog：打开菜单 → 点击 ui-app-menu-open-debug-log → 断言 ui-indi-debug-dialog-root 可见。
 * - menu.openGeneralSettings：打开菜单 → 点击 ui-app-menu-general-settings → 断言 ui-view-settings-dialog-root 可见。
 * - menu.openRefreshConfirm：打开菜单 → 点击 ui-app-menu-refresh-page → 断言 ui-confirm-dialog-root 可见。
 *
 * 规范：以 testid 定位；确认弹窗与菜单项点击前通过 clickByTestId 做可操作性检查。参考 testid-validation-report.md、testid-scan-report.md。
 */
import { expect, type Page } from '@playwright/test'
import type { StepRegistry } from './flowTypes'
import { clickByTestId, ensureMenuDrawerOpen } from './helpers'

async function confirmIfOpen(page: Page, action: 'confirm' | 'cancel', timeout: number) {
  const root = page.getByTestId('ui-confirm-dialog-root').first()
  if (!(await root.isVisible().catch(() => false))) return
  await clickByTestId(page, action === 'confirm' ? 'ui-confirm-dialog-btn-confirm' : 'ui-confirm-dialog-btn-cancel', timeout)
}

export function makeMenuStepRegistry(): StepRegistry {
  const registry: StepRegistry = new Map()

  registry.set('menu.disconnectAll', {
    async run(ctx, params) {
      console.log('[flow] menu.disconnectAll 前置步骤 ensureMenuDrawerOpen，动作 点击 ui-app-menu-disconnect-all')
      await ensureMenuDrawerOpen(ctx.page, ctx.stepTimeoutMs)
      await clickByTestId(ctx.page, 'ui-app-menu-disconnect-all', params.timeoutMs ?? ctx.stepTimeoutMs)
      // 断开全部会触发确认弹窗，需等待弹窗出现后点击确认并关闭，否则 overlay 会挡住后续操作
      const dialogRoot = ctx.page.getByTestId('ui-confirm-dialog-root').first()
      await expect(dialogRoot).toBeVisible({ timeout: Math.min(8000, ctx.stepTimeoutMs) }).catch(() => {})
      await confirmIfOpen(ctx.page, 'confirm', params.timeoutMs ?? ctx.stepTimeoutMs)
      console.log('[flow] menu.disconnectAll 后置确认: 确认弹窗已处理')
    },
  })

  registry.set('menu.connectAll', {
    async run(ctx, params) {
      await ensureMenuDrawerOpen(ctx.page, ctx.stepTimeoutMs)
      await clickByTestId(ctx.page, 'ui-app-menu-connect-all', params.timeoutMs ?? ctx.stepTimeoutMs)
    },
  })

  registry.set('menu.confirmDialogConfirm', {
    async run(ctx, params) {
      await confirmIfOpen(ctx.page, 'confirm', params.timeoutMs ?? ctx.stepTimeoutMs)
    },
  })

  registry.set('menu.confirmDialogCancel', {
    async run(ctx, params) {
      await confirmIfOpen(ctx.page, 'cancel', params.timeoutMs ?? ctx.stepTimeoutMs)
    },
  })

  registry.set('menu.openPowerManager', {
    async run(ctx, params) {
      await ensureMenuDrawerOpen(ctx.page, ctx.stepTimeoutMs)
      await clickByTestId(ctx.page, 'ui-app-menu-open-power-manager', params.timeoutMs ?? ctx.stepTimeoutMs)
      await expect(ctx.page.getByTestId('ui-power-manager-root')).toBeVisible({ timeout: params.timeoutMs ?? ctx.stepTimeoutMs })
    },
  })

  registry.set('menu.openDebugLog', {
    async run(ctx, params) {
      await ensureMenuDrawerOpen(ctx.page, ctx.stepTimeoutMs)
      await clickByTestId(ctx.page, 'ui-app-menu-open-debug-log', params.timeoutMs ?? ctx.stepTimeoutMs)
      await expect(ctx.page.getByTestId('ui-indi-debug-dialog-root')).toBeVisible({ timeout: params.timeoutMs ?? ctx.stepTimeoutMs })
    },
  })

  registry.set('menu.openGeneralSettings', {
    async run(ctx, params) {
      console.log('[flow] menu.openGeneralSettings 动作 点击 ui-app-menu-general-settings')
      await ensureMenuDrawerOpen(ctx.page, ctx.stepTimeoutMs)
      await clickByTestId(ctx.page, 'ui-app-menu-general-settings', params.timeoutMs ?? ctx.stepTimeoutMs)
      await expect(ctx.page.getByTestId('ui-view-settings-dialog-root')).toBeVisible({ timeout: params.timeoutMs ?? ctx.stepTimeoutMs })
      console.log('[flow] menu.openGeneralSettings 后置确认: ui-view-settings-dialog-root 可见')
    },
  })

  registry.set('menu.openRefreshConfirm', {
    async run(ctx, params) {
      await ensureMenuDrawerOpen(ctx.page, ctx.stepTimeoutMs)
      await clickByTestId(ctx.page, 'ui-app-menu-refresh-page', params.timeoutMs ?? ctx.stepTimeoutMs)
      await expect(ctx.page.getByTestId('ui-confirm-dialog-root')).toBeVisible({ timeout: params.timeoutMs ?? ctx.stepTimeoutMs })
    },
  })

  return registry
}
