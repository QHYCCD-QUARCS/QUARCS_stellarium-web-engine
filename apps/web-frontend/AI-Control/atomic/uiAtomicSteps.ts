/**
 * AI-Control 通用 UI 原子步骤。
 *
 * 提供与页面无关的底层操作：回首页、按 testid 点击/输入、VSelect 选择、等待可见/状态等，
 * 供高层 menu/device 步骤组合使用。所有步骤均走 shared/interaction 与 navigation，不使用 force。
 */
import { expect } from '@playwright/test'
import type { StepRegistry } from '../core/flowTypes'
import {
  clickByTestId,
  clickCheckboxByTestId,
  clickLocator,
  fillByTestId,
  selectVSelectItemText,
  setCheckboxChecked,
  waitForTestIdState,
} from '../shared/interaction'
import { gotoHome } from '../shared/navigation'
import { sleep } from '../shared/interaction'

export function makeUiAtomicStepRegistry(): StepRegistry {
  const registry: StepRegistry = new Map()

  /** 打开应用首页并等待 ui-app-root 可见 */
  registry.set('ui.gotoHome', {
    async run(ctx) {
      await gotoHome(ctx.page, ctx.stepTimeoutMs)
    },
  })

  /** 按 params.testId 点击，可选 params.timeoutMs */
  registry.set('ui.click', {
    description: '点击',
    async run(ctx, params) {
      await clickByTestId(ctx.page, String(params.testId), params.timeoutMs ?? ctx.stepTimeoutMs)
    },
  })

  /** 按 params.testId 点击复选框（优先点 testId-label），用于 Vuetify checkbox 切换 */
  registry.set('ui.toggleCheckbox', {
    description: '切换勾选',
    async run(ctx, params) {
      await clickCheckboxByTestId(ctx.page, String(params.testId), params.timeoutMs ?? ctx.stepTimeoutMs)
    },
  })

  /** 按目标状态设置复选框：先读当前状态，仅在不一致时点击一次，避免重复点击。params.testId、params.checked（true=勾选，false=取消） */
  registry.set('ui.setCheckbox', {
    description: '设置勾选状态',
    async run(ctx, params) {
      const checked = params.checked !== false
      await setCheckboxChecked(
        ctx.page,
        String(params.testId),
        checked,
        params.timeoutMs ?? ctx.stepTimeoutMs,
      )
    },
  })

  /** 在可选 params.withinTestId 范围内按文案点击，params.text、params.exact */
  registry.set('ui.clickText', {
    async run(ctx, params) {
      const scope = params.withinTestId ? ctx.page.getByTestId(String(params.withinTestId)).first() : ctx.page
      await clickLocator(
        scope.getByText(String(params.text), { exact: Boolean(params.exact) }).first(),
        params.timeoutMs ?? ctx.stepTimeoutMs,
      )
    },
  })

  /** 按 params.testId 填充文本，params.text、params.clear 控制是否先清空 */
  registry.set('ui.type', {
    description: '输入文本',
    async run(ctx, params) {
      await fillByTestId(
        ctx.page,
        String(params.testId),
        String(params.text ?? ''),
        params.clear !== false,
        params.timeoutMs ?? ctx.stepTimeoutMs,
      )
    },
  })

  /** 按 params.testId 打开下拉后选择 params.itemText */
  registry.set('ui.selectVSelectItemText', {
    description: '下拉选择',
    async run(ctx, params) {
      await selectVSelectItemText(
        ctx.page,
        String(params.testId),
        String(params.itemText),
        params.timeoutMs ?? ctx.stepTimeoutMs,
      )
    },
  })

  /** 等待 params.ms 毫秒（用于动画或异步状态稳定） */
  registry.set('ui.sleep', {
    async run(ctx, params) {
      const ms = Number(params?.ms) || 300
      await sleep(ms)
    },
  })

  /** 等待 params.testId 元素可见 */
  registry.set('ui.waitVisible', {
    async run(ctx, params) {
      await ctx.page.getByTestId(String(params.testId)).first().waitFor({
        state: 'visible',
        timeout: params.timeoutMs ?? ctx.stepTimeoutMs,
      })
    },
  })

  /** 等待 params.testId 元素变为可点击（非 disabled），用于依赖勾选等状态才能启用的按钮 */
  registry.set('ui.waitEnabled', {
    description: '等待按钮可点',
    async run(ctx, params) {
      const loc = ctx.page.getByTestId(String(params.testId)).first()
      await expect(loc).toBeEnabled({ timeout: params.timeoutMs ?? ctx.stepTimeoutMs })
    },
  })

  /** 断言 params.testId 元素可见 */
  registry.set('ui.assertVisible', {
    async run(ctx, params) {
      await expect(ctx.page.getByTestId(String(params.testId)).first()).toBeVisible({
        timeout: params.timeoutMs ?? ctx.stepTimeoutMs,
      })
    },
  })

  /** 等待 params.testId 具有 params.state（默认 data-state，可 params.attr） */
  registry.set('ui.waitState', {
    async run(ctx, params) {
      await waitForTestIdState(
        ctx.page,
        String(params.testId),
        String(params.state),
        params.timeoutMs ?? ctx.stepTimeoutMs,
        String(params.attr ?? 'data-state'),
      )
    },
  })

  return registry
}
