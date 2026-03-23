/**
 * 版本/更新相关步骤注册表 (updateSteps)
 *
 * 作用：
 * 封装从通用设置进入版本信息页、读取或断言总版本号、关闭对话框。以 data-testid（ui-view-settings-dialog-tab-version-info、ui-system-version-total、ui-view-settings-dialog-btn-blue-text）定位，禁止 force。
 *
 * 执行过程概要：
 * - openVersionTab：前置步骤 menu.openGeneralSettings → 动作 点击版本信息 tab → 后置确认 ui-system-version-total 可见。
 * - update.readTotalVersion：前置步骤 openVersionTab → 动作 读取版本文本并输出 → 后置 若关闭按钮可见则 clickLocator 关闭。
 * - update.assertTotalVersion：前置步骤 openVersionTab → 动作 断言 ui-system-version-total 包含期望文本 → 后置 clickLocator 关闭。
 *
 * 规范：关闭按钮点击前经 clickLocator 做可操作性检查。参考 testid-validation-report.md、testid-scan-report.md。
 */
import { expect } from '@playwright/test'
import type { FlowContext, StepRegistry } from './flowTypes'
import { clickByTestId, clickLocator } from './helpers'
import { makeMenuStepRegistry } from './menuSteps'

async function openVersionTab(ctx: FlowContext) {
  const menuRegistry = makeMenuStepRegistry()
  const openGeneral = menuRegistry.get('menu.openGeneralSettings')
  if (!openGeneral) throw new Error('缺少 menu.openGeneralSettings')

  await openGeneral.run(ctx, {})
  await clickByTestId(ctx.page, 'ui-view-settings-dialog-tab-version-info', ctx.stepTimeoutMs)
  await expect(ctx.page.getByTestId('ui-system-version-total')).toBeVisible({ timeout: ctx.stepTimeoutMs })
}

export function makeUpdateStepRegistry(): StepRegistry {
  const registry: StepRegistry = new Map()

  registry.set('update.readTotalVersion', {
    async run(ctx) {
      await openVersionTab(ctx)
      const version = ((await ctx.page.getByTestId('ui-system-version-total').first().textContent()) ?? '').trim()
      console.log(`UI_TOTAL_VERSION=${version}`)
      const close = ctx.page.getByTestId('ui-view-settings-dialog-btn-blue-text').first()
      if (await close.isVisible().catch(() => false)) {
        await clickLocator(close, ctx.stepTimeoutMs)
      }
    },
  })

  registry.set('update.assertTotalVersion', {
    async run(ctx) {
      const expectedVersion = String(process.env.E2E_EXPECT_TOTAL_VERSION ?? '').trim()
      if (!expectedVersion) throw new Error('缺少 E2E_EXPECT_TOTAL_VERSION')

      await openVersionTab(ctx)
      await expect(ctx.page.getByTestId('ui-system-version-total')).toContainText(expectedVersion, {
        timeout: Math.max(ctx.stepTimeoutMs, 60_000),
      })
      const close = ctx.page.getByTestId('ui-view-settings-dialog-btn-blue-text').first()
      if (await close.isVisible().catch(() => false)) {
        await clickLocator(close, ctx.stepTimeoutMs)
      }
    },
  })

  return registry
}
