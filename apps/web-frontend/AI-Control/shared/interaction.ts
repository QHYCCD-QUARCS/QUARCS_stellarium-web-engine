import { expect, type Locator, type Page } from '@playwright/test'

export function sanitizeTestIdPart(value: string) {
  return String(value || 'Unknown').replace(/[^A-Za-z0-9]+/g, '')
}

export function deviceMenuTestId(deviceType: string) {
  return `ui-app-menu-device-${deviceType}`
}

export function deviceProbeTestId(deviceType: string) {
  return `e2e-device-${deviceType}-conn`
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function clearActiveOverlay(page: Page, timeout: number) {
  const deadline = Date.now() + Math.max(800, Math.min(timeout, 3000))
  const activeScrim = page.locator('.v-overlay.v-overlay--active .v-overlay__scrim')
  while (Date.now() < deadline) {
    const hasActiveScrim = (await activeScrim.count().catch(() => 0)) > 0
    if (!hasActiveScrim) return
    await page.keyboard.press('Escape').catch(() => {})
    await sleep(120)
  }
}

export async function clickLocator(locator: Locator, timeout = 10_000) {
  const page = locator.page()
  const attempts = 3
  let lastError: unknown = null

  for (let i = 0; i < attempts; i += 1) {
    await locator.scrollIntoViewIfNeeded().catch(() => {})
    await expect(locator).toBeVisible({ timeout })
    await expect(locator).toBeEnabled({ timeout }).catch(() => {})
    try {
      await locator.click({ timeout })
      return
    } catch (error) {
      lastError = error
      const message = error instanceof Error ? error.message : String(error)
      if (!/intercepts pointer events/i.test(message) || i === attempts - 1) break
      await clearActiveOverlay(page, timeout)
      await sleep(120)
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError ?? 'clickLocator failed'))
}

export async function clickByTestId(page: Page, testId: string, timeout = 10_000) {
  await clickLocator(page.getByTestId(testId).first(), timeout)
}

export async function fillByTestId(page: Page, testId: string, text: string, clear = true, timeout = 10_000) {
  const locator = page.getByTestId(testId).first()
  await locator.scrollIntoViewIfNeeded().catch(() => {})
  await expect(locator).toBeVisible({ timeout })
  await expect(locator).toBeEnabled({ timeout }).catch(() => {})
  if (clear) {
    await locator.fill('', { timeout }).catch(() => {})
  }
  await locator.fill(text, { timeout }).catch(async () => {
    if (clear) await locator.press('ControlOrMeta+a').catch(() => {})
    await locator.type(text, { timeout })
  })
}

export async function waitForTestIdState(
  page: Page,
  testId: string,
  state: string,
  timeout = 30_000,
  attr = 'data-state',
) {
  await expect(page.getByTestId(testId).first()).toHaveAttribute(attr, state, { timeout })
}

async function clickVSelectTrigger(page: Page, testId: string, timeout: number) {
  const byTestId = page.getByTestId(testId).first()
  await byTestId.scrollIntoViewIfNeeded().catch(() => {})
  const vInputWrapper = page.locator('.v-input').filter({ has: byTestId }).first()
  const useWrapper = (await vInputWrapper.count()) > 0
  await clickLocator(useWrapper ? vInputWrapper : byTestId, timeout)
}

function toOptionTestIdSuffix(text: string) {
  return String(text || '').replace(/[^A-Za-z0-9]+/g, '')
}

export async function selectVSelectItemText(page: Page, testId: string, itemText: string, timeout = 10_000) {
  await clickVSelectTrigger(page, testId, timeout)

  const menu = page.locator('.v-menu__content.menuable__content__active').first()
  await expect(menu).toBeVisible({ timeout: Math.min(5000, timeout) }).catch(() => {})

  if (testId === 'ui-app-select-confirm-driver') {
    const optionTestId = `ui-app-select-confirm-driver-option-${toOptionTestIdSuffix(itemText)}`
    const byTestId = page.getByTestId(optionTestId).first()
    if (await byTestId.isVisible().catch(() => false)) {
      await clickLocator(byTestId, timeout)
      return
    }
  }

  const exact = menu.getByText(itemText, { exact: true }).first()
  if (await exact.isVisible().catch(() => false)) {
    await clickLocator(exact, timeout)
    return
  }

  const fallback = menu.getByText(itemText, { exact: false }).first()
  await expect(fallback).toBeVisible({ timeout: Math.min(8000, timeout) })
  await clickLocator(fallback, timeout)
}
