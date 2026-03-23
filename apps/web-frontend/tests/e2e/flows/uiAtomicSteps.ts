/**
 * UI 原子步骤注册表 (uiAtomicSteps)
 *
 * 作用：
 * 定义与 UI 相关的原子步骤（跳转、点击、输入、选择、按键、等待、断言等），
 * 供流程通过 step id 调用。所有交互均通过 helpers 中的可操作性安全方法，禁止 force。
 *
 * 执行过程概要：
 * - ui.goto：page.goto(url)。
 * - ui.click：clickByTestId(testId)，内部 scrollIntoViewIfNeeded + toBeVisible + click。
 * - ui.clickText：在 withinTestId 范围内或整页按文本点击，使用 clickLocator（可见后再点）。
 * - ui.type：fillByTestId(testId, text)。
 * - ui.selectOption：对原生 select 先滚动入视、可见，再 selectOption(value)。
 * - ui.selectVSelectItemText：selectVSelectItemText(testId, itemText)。
 * - ui.pressKey：keyboard.press(key)。
 * - ui.waitVisible / ui.waitHidden：等待 testid 对应元素可见/隐藏。
 * - ui.waitState：waitForTestIdState(testId, state)。
 * - ui.assertVisible / ui.assertExists / ui.assertTextContains / ui.assertText：基于 testid 的断言。
 * - ui.wait：固定延时。ui.gotoHome：gotoHome(page)。
 *
 * 规范：以 data-testid 定位；交互前可操作性检查，禁止 force。参考 testid-validation-report.md、testid-scan-report.md。
 */
import { expect } from '@playwright/test'
import type { StepRegistry } from './flowTypes'
import {
  clickByTestId,
  clickLocator,
  fillByTestId,
  gotoHome,
  selectVSelectItemText,
  waitForTestIdState,
} from './helpers'

export function makeUiAtomicStepRegistry(): StepRegistry {
  const registry: StepRegistry = new Map()

  registry.set('ui.goto', {
    async run(ctx, params) {
      const url = String(params.url ?? '/')
      await ctx.page.goto(url, { waitUntil: 'domcontentloaded', timeout: ctx.stepTimeoutMs })
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
      await clickLocator(scope.getByText(String(params.text), { exact: Boolean(params.exact) }).first(), params.timeoutMs ?? ctx.stepTimeoutMs)
    },
  })

  registry.set('ui.type', {
    async run(ctx, params) {
      await fillByTestId(ctx.page, String(params.testId), String(params.text ?? ''), params.clear !== false, params.timeoutMs ?? ctx.stepTimeoutMs)
    },
  })

  registry.set('ui.selectOption', {
    async run(ctx, params) {
      const locator = ctx.page.getByTestId(String(params.testId)).first()
      await locator.scrollIntoViewIfNeeded().catch(() => {})
      await expect(locator).toBeVisible({ timeout: params.timeoutMs ?? ctx.stepTimeoutMs })
      await locator.selectOption(String(params.value), { timeout: params.timeoutMs ?? ctx.stepTimeoutMs })
    },
  })

  registry.set('ui.selectVSelectItemText', {
    async run(ctx, params) {
      await selectVSelectItemText(ctx.page, String(params.testId), String(params.itemText), params.timeoutMs ?? ctx.stepTimeoutMs)
    },
  })

  registry.set('ui.pressKey', {
    async run(ctx, params) {
      await ctx.page.keyboard.press(String(params.key))
    },
  })

  registry.set('ui.waitVisible', {
    async run(ctx, params) {
      await ctx.page.getByTestId(String(params.testId)).first().waitFor({ state: 'visible', timeout: params.timeoutMs ?? ctx.stepTimeoutMs })
    },
  })

  registry.set('ui.waitHidden', {
    async run(ctx, params) {
      await ctx.page.getByTestId(String(params.testId)).first().waitFor({ state: 'hidden', timeout: params.timeoutMs ?? ctx.stepTimeoutMs })
    },
  })

  registry.set('ui.waitState', {
    async run(ctx, params) {
      await waitForTestIdState(ctx.page, String(params.testId), String(params.state), params.timeoutMs ?? ctx.stepTimeoutMs)
    },
  })

  registry.set('ui.assertVisible', {
    async run(ctx, params) {
      await expect(ctx.page.getByTestId(String(params.testId)).first()).toBeVisible({ timeout: params.timeoutMs ?? ctx.stepTimeoutMs })
    },
  })

  registry.set('ui.assertExists', {
    async run(ctx, params) {
      await expect(ctx.page.getByTestId(String(params.testId))).toHaveCount(1, { timeout: params.timeoutMs ?? ctx.stepTimeoutMs })
    },
  })

  registry.set('ui.assertTextContains', {
    async run(ctx, params) {
      await expect(ctx.page.getByTestId(String(params.testId)).first()).toContainText(String(params.text), { timeout: params.timeoutMs ?? ctx.stepTimeoutMs })
    },
  })

  registry.set('ui.assertText', {
    async run(ctx, params) {
      await expect(ctx.page.getByTestId(String(params.testId)).first()).toContainText(String(params.containsText ?? params.text), {
        timeout: params.timeoutMs ?? ctx.stepTimeoutMs,
      })
    },
  })

  registry.set('ui.wait', {
    async run(_ctx, params) {
      await new Promise((resolve) => setTimeout(resolve, Number(params.timeoutMs ?? params.ms ?? 1000)))
    },
  })

  registry.set('ui.gotoHome', {
    async run(ctx) {
      await gotoHome(ctx.page, ctx.stepTimeoutMs)
    },
  })

  return registry
}
