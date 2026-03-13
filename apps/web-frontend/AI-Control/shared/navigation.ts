import { expect, type Page } from '@playwright/test'
import { getAppStartPath } from '../../tests/e2e/support/appStartPath'
import { clickLocator, sleep } from './interaction'

export async function gotoHome(page: Page, stepTimeoutMs: number) {
  await page.goto(getAppStartPath(), { waitUntil: 'domcontentloaded', timeout: stepTimeoutMs })
  await expect(page.getByTestId('ui-app-root')).toBeVisible({ timeout: stepTimeoutMs })
}

export async function ensureMenuDrawerOpen(page: Page, timeout = 10_000) {
  const drawer = page.getByTestId('ui-app-menu-drawer').first()
  if ((await drawer.count()) === 0) return

  const state = await drawer.getAttribute('data-state')
  if (state === 'open') return

  await clickLocator(page.getByTestId('tb-act-toggle-navigation-drawer').first(), timeout)
  await expect(drawer).toHaveAttribute('data-state', 'open', { timeout })
}

export async function ensureMenuDrawerClosed(page: Page, timeout = 10_000) {
  const drawer = page.getByTestId('ui-app-menu-drawer').first()
  if ((await drawer.count()) === 0) return

  const state = await drawer.getAttribute('data-state')
  if (state === 'closed') return

  await page.keyboard.press('Escape').catch(() => {})
  if ((await drawer.getAttribute('data-state').catch(() => null)) === 'closed') return

  await clickLocator(page.getByTestId('tb-act-toggle-navigation-drawer').first(), timeout)
  await expect(drawer).toHaveAttribute('data-state', 'closed', { timeout })
}

export async function ensureCaptureUiVisible(page: Page, timeout = 10_000) {
  const panel = page.getByTestId('cp-panel').first()
  if (await panel.isVisible().catch(() => false)) return

  const switchMainBtn = page.getByTestId('gui-btn-switch-main-page').first()
  if (await switchMainBtn.isVisible().catch(() => false)) {
    await clickLocator(switchMainBtn, timeout)
    await sleep(400)
  }
  if (await panel.isVisible().catch(() => false)) return

  const showBtn = page.getByTestId('gui-btn-show-capture-ui').first()
  if (await showBtn.isVisible().catch(() => false)) {
    await clickLocator(showBtn, timeout)
  }

  await expect(panel).toBeVisible({ timeout })
}
