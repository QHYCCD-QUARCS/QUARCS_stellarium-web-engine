/**
 * 赤道仪控制相关步骤注册表 (mountSteps)
 *
 * 作用：
 * 封装赤道仪面板的打开与“已泊车”状态保障。以 data-testid（mcp-panel、gui-btn-toggle-mount-panel、mcp-btn-park）定位，禁止 force。
 *
 * 执行过程概要：
 * - mount.ensureParkedForTest：ensureMountPanel（若 mcp-panel 不可见则点击 gui-btn-toggle-mount-panel）→ 若 mcp-btn-park 的 data-state 非 'on' 则 clickLocator 点击 → 断言 data-state=on。
 *
 * 规范：按钮点击前经 clickLocator 做可操作性检查。参考 testid-validation-report.md、testid-scan-report.md。
 */
import { expect } from '@playwright/test'
import type { FlowContext, StepRegistry } from './flowTypes'
import { clickByTestId, clickLocator } from './helpers'

async function ensureMountPanel(ctx: FlowContext, timeout: number) {
  const panel = ctx.page.getByTestId('mcp-panel').first()
  if (await panel.isVisible().catch(() => false)) return
  await clickByTestId(ctx.page, 'gui-btn-toggle-mount-panel', timeout)
  await expect(panel).toBeVisible({ timeout })
}

export function makeMountStepRegistry(): StepRegistry {
  const registry: StepRegistry = new Map()

  registry.set('mount.ensureParkedForTest', {
    async run(ctx, params) {
      await ensureMountPanel(ctx, params.timeoutMs ?? ctx.stepTimeoutMs)
      const button = ctx.page.getByTestId('mcp-btn-park').first()
      const state = await button.getAttribute('data-state')
      if (state !== 'on') {
        await clickLocator(button, params.timeoutMs ?? ctx.stepTimeoutMs)
      }
      await expect(button).toHaveAttribute('data-state', 'on', { timeout: params.timeoutMs ?? Math.max(ctx.stepTimeoutMs, 30_000) })
    },
  })

  return registry
}
