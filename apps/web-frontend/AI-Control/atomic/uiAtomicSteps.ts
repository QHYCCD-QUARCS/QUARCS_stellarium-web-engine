import { expect } from '@playwright/test'
import type { StepRegistry } from '../core/flowTypes'
import {
  clickByTestId,
  clickLocator,
  fillByTestId,
  selectVSelectItemText,
  waitForTestIdState,
} from '../shared/interaction'
import { gotoHome } from '../shared/navigation'

export function makeUiAtomicStepRegistry(): StepRegistry {
  const registry: StepRegistry = new Map()

  registry.set('ui.gotoHome', {
    async run(ctx) {
      await gotoHome(ctx.page, ctx.stepTimeoutMs)
    },
  })

  registry.set('ui.click', {
    async run(ctx, params) {
      await clickByTestId(ctx.page, String(params.testId), params.timeoutMs ?? ctx.stepTimeoutMs)
    },
  })

  registry.set('ui.clickText', {
    async run(ctx, params) {
      const scope = params.withinTestId ? ctx.page.getByTestId(String(params.withinTestId)).first() : ctx.page
      await clickLocator(
        scope.getByText(String(params.text), { exact: Boolean(params.exact) }).first(),
        params.timeoutMs ?? ctx.stepTimeoutMs,
      )
    },
  })

  registry.set('ui.type', {
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

  registry.set('ui.selectVSelectItemText', {
    async run(ctx, params) {
      await selectVSelectItemText(
        ctx.page,
        String(params.testId),
        String(params.itemText),
        params.timeoutMs ?? ctx.stepTimeoutMs,
      )
    },
  })

  registry.set('ui.waitVisible', {
    async run(ctx, params) {
      await ctx.page.getByTestId(String(params.testId)).first().waitFor({
        state: 'visible',
        timeout: params.timeoutMs ?? ctx.stepTimeoutMs,
      })
    },
  })

  registry.set('ui.assertVisible', {
    async run(ctx, params) {
      await expect(ctx.page.getByTestId(String(params.testId)).first()).toBeVisible({
        timeout: params.timeoutMs ?? ctx.stepTimeoutMs,
      })
    },
  })

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
