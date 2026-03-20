/**
 * AI-Control 导航与页面状态准备。
 *
 * 提供回到首页、主菜单抽屉开关、拍摄 UI 可见性保证等。关闭主菜单时优先使用遮罩上的
 * tb-act-toggle-navigation-drawer-overlay（仅主菜单打开时存在），避免误触其他控件。
 */
import { expect, type Page } from '@playwright/test'
import { getAppStartPath } from '../../tests/e2e/support/appStartPath'
import { clickLocator, sleep } from './interaction'

/** 打开应用首页并等待 ui-app-root 可见 */
export async function gotoHome(page: Page, stepTimeoutMs: number) {
  await page.goto(getAppStartPath(), { waitUntil: 'domcontentloaded', timeout: stepTimeoutMs })
  await expect(page.getByTestId('ui-app-root')).toBeVisible({ timeout: stepTimeoutMs })
}

/** 尝试关闭可能挡住点击的 Vuetify 遮罩（如主菜单关闭后残留的 v-overlay--active） */
async function dismissBlockingOverlay(page: Page) {
  const overlay = page.locator('.v-overlay.v-overlay--active').first()
  const alreadyGone = (await overlay.count()) === 0 || !(await overlay.isVisible().catch(() => false))
  if (alreadyGone) return

  for (let i = 0; i < 4; i += 1) {
    await page.keyboard.press('Escape').catch(() => {})
    await sleep(300)
  }
  const scrim = page.locator('.v-overlay__scrim').first()
  if (await scrim.isVisible().catch(() => false)) {
    await scrim.click({ timeout: 3000 }).catch(() => {})
    await sleep(500)
  }
  for (let i = 0; i < 2; i += 1) {
    await page.keyboard.press('Escape').catch(() => {})
    await sleep(200)
  }
  await overlay.waitFor({ state: 'hidden', timeout: 6000 }).catch(() => {})

  if (await overlay.isVisible().catch(() => false)) {
    await page.evaluate(() => {
      document.querySelectorAll('.v-overlay.v-overlay--active').forEach((el) => {
        ;(el as HTMLElement).style.setProperty('display', 'none')
      })
    })
    await sleep(400)
  }
}

/** 确保主菜单抽屉为打开态（data-state=open），未打开则点击 tb-act-toggle-navigation-drawer。若有遮罩先按 Escape，主菜单自带的 overlay 可点 tb-act-toggle-navigation-drawer-overlay。打开前会尝试关闭可能挡住按钮的 Vuetify 遮罩。 */
export async function ensureMenuDrawerOpen(page: Page, timeout = 10_000) {
  const drawer = page.getByTestId('ui-app-menu-drawer').first()
  if ((await drawer.count()) === 0) return

  const state = await drawer.getAttribute('data-state')
  if (state === 'open') return

  await dismissBlockingOverlay(page)
  await page.keyboard.press('Escape').catch(() => {})
  await sleep(300)
  const overlayToggle = page.getByTestId('tb-act-toggle-navigation-drawer-overlay').first()
  if (await overlayToggle.isVisible().catch(() => false)) {
    await clickLocator(overlayToggle, timeout)
    await sleep(300)
  }

  await clickLocator(page.getByTestId('tb-act-toggle-navigation-drawer').first(), timeout)
  await expect(drawer).toHaveAttribute('data-state', 'open', { timeout })
}

/** 主菜单打开时浮在遮罩之上的关闭按钮 testid，仅当主菜单打开时存在于 DOM，优先点击以关闭主菜单 */
const MENU_TOGGLE_OVERLAY_TESTID = 'tb-act-toggle-navigation-drawer-overlay'

/** 确保主菜单抽屉为关闭态；优先点 overlay 上的关闭按钮，否则 Escape 或工具栏开关 */
export async function ensureMenuDrawerClosed(page: Page, timeout = 10_000) {
  const drawer = page.getByTestId('ui-app-menu-drawer').first()
  if ((await drawer.count()) === 0) return

  const state = await drawer.getAttribute('data-state')
  if (state === 'closed') return

  const overlayToggle = page.getByTestId(MENU_TOGGLE_OVERLAY_TESTID).first()
  const overlayVisible = await overlayToggle.isVisible().catch(() => false)
  if (overlayVisible) {
    await clickLocator(overlayToggle, timeout)
    await expect(drawer).toHaveAttribute('data-state', 'closed', { timeout })
    return
  }

  await page.keyboard.press('Escape').catch(() => {})
  if ((await drawer.getAttribute('data-state').catch(() => null)) === 'closed') return

  await clickLocator(page.getByTestId('tb-act-toggle-navigation-drawer').first(), timeout)
  await expect(drawer).toHaveAttribute('data-state', 'closed', { timeout })
}

const CAPTURE_PANEL_TESTID = 'cp-panel'
const GUIDER_PANEL_TESTID = 'ui-chart-component-root'
const SHOW_CAPTURE_UI_BTN_TESTID = 'gui-btn-show-capture-ui'
const SWITCH_MAIN_PAGE_BTN_TESTID = 'gui-btn-switch-main-page'

type MainPageName = 'Stel' | 'MainCamera' | 'GuiderCamera'

/** 先尝试恢复被隐藏的主界面 UI（如用户点过“隐藏 UI”） */
async function tryRestoreMainUi(page: Page, timeout: number) {
  const showBtn = page.getByTestId(SHOW_CAPTURE_UI_BTN_TESTID).first()
  const showBtnVisible = await showBtn.isVisible().catch(() => false)
  if (!showBtnVisible) return

  await clickLocator(showBtn, timeout)
  await sleep(500)
}

/**
 * 确保当前主页面切到目标页，并让目标 testid 可见。
 * gui-btn-switch-main-page 的 data-current-main-page 表示“当前页”，点击后按 Stel -> MainCamera -> GuiderCamera -> Stel 循环切换。
 */
async function ensureMainPageVisible(
  page: Page,
  targetPage: MainPageName,
  visibleTestId: string,
  timeout = 10_000,
) {
  const target = page.getByTestId(visibleTestId).first()
  if (await target.isVisible().catch(() => false)) return

  await tryRestoreMainUi(page, timeout)
  if (await target.isVisible().catch(() => false)) return

  const switchMainBtn = page.getByTestId(SWITCH_MAIN_PAGE_BTN_TESTID).first()
  const maxSwitchClicks = 4
  for (let i = 0; i < maxSwitchClicks; i += 1) {
    if (await target.isVisible().catch(() => false)) return

    const currentPage = (await switchMainBtn.getAttribute('data-current-main-page').catch(() => null)) as MainPageName | null
    if (currentPage === targetPage) break

    const switchVisible = await switchMainBtn.isVisible().catch(() => false)
    if (!switchVisible) break

    await clickLocator(switchMainBtn, timeout)
    await sleep(800)
  }

  if (await target.isVisible().catch(() => false)) return

  await tryRestoreMainUi(page, timeout)
  await expect(target).toBeVisible({ timeout })
}

/** 确保拍摄面板 cp-panel 可见；需切到主相机页（MainCamera）时 isCaptureMode 才为 true。 */
export async function ensureCaptureUiVisible(page: Page, timeout = 10_000) {
  const panel = page.getByTestId(CAPTURE_PANEL_TESTID).first()
  if (await panel.isVisible().catch(() => false)) return
  await ensureMainPageVisible(page, 'MainCamera', CAPTURE_PANEL_TESTID, timeout)
}

/** 确保导星图表面板可见；需切到导星页（GuiderCamera）时 showChartsPanel 才为 true。 */
export async function ensureGuiderUiVisible(page: Page, timeout = 10_000) {
  const panel = page.getByTestId(GUIDER_PANEL_TESTID).first()
  if (await panel.isVisible().catch(() => false)) return
  await ensureMainPageVisible(page, 'GuiderCamera', GUIDER_PANEL_TESTID, timeout)
}
