import { expect, type Page } from '@playwright/test'
import type { ActionStep } from './actionSchema'

export async function executeStep(page: Page, step: ActionStep) {
  switch (step.kind) {
    case 'click': {
      await page.getByTestId(step.target.testId).click()
      return
    }
    case 'clickText': {
      const scope = step.withinTestId ? page.getByTestId(step.withinTestId) : page
      await scope.getByText(step.text, { exact: step.exact ?? false }).first().click()
      return
    }
    case 'type': {
      const loc = page.getByTestId(step.target.testId)
      if (step.clear) await loc.fill('')
      await loc.type(step.text)
      return
    }
    case 'selectOption': {
      await page.getByTestId(step.target.testId).selectOption(step.value)
      return
    }
    case 'selectVSelectItemText': {
      // Vuetify v-select：先点开控件，再点菜单项（按文本）
      await page.getByTestId(step.target.testId).click()
      // v-select 的菜单通常在 overlay 的 v-menu__content 里
      const menu = page.locator('.v-menu__content.menuable__content__active').first()
      await menu.getByText(step.itemText, { exact: false }).first().click()
      return
    }
    case 'pressKey': {
      await page.keyboard.press(step.key)
      return
    }
    case 'waitVisible': {
      await page.getByTestId(step.target.testId).waitFor({ state: 'visible', timeout: step.timeoutMs })
      return
    }
    case 'waitHidden': {
      await page.getByTestId(step.target.testId).waitFor({ state: 'hidden', timeout: step.timeoutMs })
      return
    }
    case 'waitState': {
      const loc = page.getByTestId(step.target.testId)
      await expect(loc).toHaveAttribute('data-state', step.state, { timeout: step.timeoutMs })
      return
    }
    case 'assertVisible': {
      await expect(page.getByTestId(step.target.testId)).toBeVisible()
      return
    }
    case 'assertTextContains': {
      await expect(page.getByTestId(step.target.testId)).toContainText(step.text)
      return
    }
    default: {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      throw new Error(`未知 step.kind: ${(step as any).kind}`)
    }
  }
}

