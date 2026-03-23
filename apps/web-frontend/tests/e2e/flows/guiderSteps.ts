/**
 * 导星/图表面板相关步骤注册表 (guiderSteps)
 *
 * 作用：
 * 封装导星图表面板的打开与循环曝光开关。以 data-testid（ui-chart-component-root、gui-btn-toggle-charts-panel、ui-chart-component-btn-loop-exp-switch、e2e-tilegpm）定位，禁止 force。
 *
 * 执行过程概要：
 * - guider.openChartPanel：若 ui-chart-component-root 不可见则点击 gui-btn-toggle-charts-panel，再断言图表面板可见。
 * - guider.loopExposureOn / guider.loopExposureOff：ensureChartPanel 后 clickByTestId(ui-chart-component-btn-loop-exp-switch)。
 * - guider.loopExposureOnAndWaitImage：记录 e2e-tilegpm 的 data-seq → ensureChartPanel → 打开循环曝光 → 轮询直到 data-seq 变化。
 *
 * 规范：所有交互经 clickByTestId（内部含可见与点击检查）。参考 testid-validation-report.md、testid-scan-report.md。
 */
import { expect } from '@playwright/test'
import type { FlowContext, StepRegistry } from './flowTypes'
import { clickByTestId } from './helpers'

async function ensureChartPanel(ctx: FlowContext, timeout: number) {
  const root = ctx.page.getByTestId('ui-chart-component-root').first()
  if (await root.isVisible().catch(() => false)) return
  await clickByTestId(ctx.page, 'gui-btn-toggle-charts-panel', timeout)
  await expect(root).toBeVisible({ timeout })
}

export function makeGuiderStepRegistry(): StepRegistry {
  const registry: StepRegistry = new Map()

  registry.set('guider.openChartPanel', {
    async run(ctx, params) {
      await ensureChartPanel(ctx, params.timeoutMs ?? ctx.stepTimeoutMs)
    },
  })

  registry.set('guider.loopExposureOn', {
    async run(ctx, params) {
      await ensureChartPanel(ctx, params.timeoutMs ?? ctx.stepTimeoutMs)
      await clickByTestId(ctx.page, 'ui-chart-component-btn-loop-exp-switch', params.timeoutMs ?? ctx.stepTimeoutMs)
    },
  })

  registry.set('guider.loopExposureOff', {
    async run(ctx, params) {
      await ensureChartPanel(ctx, params.timeoutMs ?? ctx.stepTimeoutMs)
      await clickByTestId(ctx.page, 'ui-chart-component-btn-loop-exp-switch', params.timeoutMs ?? ctx.stepTimeoutMs)
    },
  })

  registry.set('guider.loopExposureOnAndWaitImage', {
    async run(ctx, params) {
      const seqBefore = await ctx.page.getByTestId('e2e-tilegpm').first().getAttribute('data-seq').catch(() => null)
      await ensureChartPanel(ctx, params.timeoutMs ?? ctx.stepTimeoutMs)
      await clickByTestId(ctx.page, 'ui-chart-component-btn-loop-exp-switch', params.timeoutMs ?? ctx.stepTimeoutMs)
      if (seqBefore != null) {
        await expect
          .poll(
            async () => ctx.page.getByTestId('e2e-tilegpm').first().getAttribute('data-seq'),
            { timeout: params.timeoutMs ?? Math.max(ctx.stepTimeoutMs, 30_000) },
          )
          .not.toBe(seqBefore)
      }
    },
  })

  return registry
}
