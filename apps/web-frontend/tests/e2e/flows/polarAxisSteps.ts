/**
 * 极轴校准相关步骤注册表 (polarAxisSteps)
 *
 * 作用：
 * 封装极轴校准面板的打开、执行一次自动校准、最小化退出等。以 data-testid（pa-root、ui-app-menu-calibrate-polar-axis、pa-btn-*）定位，禁止 force。
 *
 * 执行过程概要：
 * - pa.open：前置检查 pa-root 不可见则 前置步骤 ensureMenuDrawerOpen → 动作 点击 ui-app-menu-calibrate-polar-axis → 后置确认 pa-root 可见。
 * - pa.runOnce：前置步骤 ensurePaOpen → 动作 点击 pa-btn-auto-calibration → 后置确认 可选 pa-guidance-indicator 可见。
 * - pa.exitIfOpen：若 pa-btn-minimize 可见则 动作 clickLocator 最小化。
 *
 * 规范：所有点击经 clickByTestId 或 clickLocator（先可见再点）。参考 testid-validation-report.md、testid-scan-report.md。
 */
import { expect } from '@playwright/test'
import type { FlowContext, StepRegistry } from './flowTypes'
import { clickByTestId, clickLocator, ensureMenuDrawerOpen } from './helpers'

async function ensurePaOpen(ctx: FlowContext, timeout: number) {
  const root = ctx.page.getByTestId('pa-root').first()
  if (await root.isVisible().catch(() => false)) return
  await ensureMenuDrawerOpen(ctx.page, timeout)
  await clickByTestId(ctx.page, 'ui-app-menu-calibrate-polar-axis', timeout)
  await expect(root).toBeVisible({ timeout })
}

export function makePolarAxisStepRegistry(): StepRegistry {
  const registry: StepRegistry = new Map()

  registry.set('pa.open', {
    async run(ctx, params) {
      await ensurePaOpen(ctx, params.timeoutMs ?? ctx.stepTimeoutMs)
    },
  })

  registry.set('pa.runOnce', {
    async run(ctx, params) {
      const timeout = params.timeoutMs ?? Math.max(ctx.stepTimeoutMs, 120_000)
      console.log('[flow] pa.runOnce 前置步骤 ensurePaOpen，动作 点击 pa-btn-auto-calibration')
      await ensurePaOpen(ctx, timeout)
      await clickByTestId(ctx.page, 'pa-btn-auto-calibration', timeout)
      await expect(ctx.page.getByTestId('pa-guidance-indicator')).toBeVisible({ timeout }).catch(() => {})
      console.log('[flow] pa.runOnce 后置确认: pa-guidance-indicator 可见或已跳过')
    },
  })

  registry.set('pa.exitIfOpen', {
    async run(ctx, params) {
      const button = ctx.page.getByTestId('pa-btn-minimize').first()
      if (await button.isVisible().catch(() => false)) {
        await clickLocator(button, params.timeoutMs ?? ctx.stepTimeoutMs)
      }
    },
  })

  return registry
}
