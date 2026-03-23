/**
 * Flow 公共辅助函数 (helpers)
 *
 * 作用：
 * 提供 testid 生成、等待、点击、填写、状态断言等 E2E 通用方法，供各 step 复用。
 * 所有点击/填写均先做可操作性检查（滚动入视、可见、再操作），禁止 force。
 *
 * 执行过程概要：
 * - sanitizeTestIdPart / deviceMenuTestId / deviceProbeTestId：生成或规范化 data-testid 字符串。
 * - clickLocator(locator)：scrollIntoViewIfNeeded → toBeVisible → click，无 force。
 * - clickByTestId(page, testId)：通过 getByTestId(testId).first() 再 clickLocator。
 * - fillByTestId：滚动入视、可见后 fill（必要时 Ctrl+A+type）。
 * - waitForTestIdState：等待指定 testid 的 data-state（或自定义属性）等于给定值。
 * - selectVSelectItemText：点击 testid 对应选择器展开菜单，再在可见菜单项上点击（先精确匹配，再模糊），均不做 force 点击。
 * - gotoHome：goto getAppStartPath()，等待 ui-app-root 可见。
 * - ensureMenuDrawerOpen/Closed：根据 ui-app-menu-drawer 的 data-state；关闭时主菜单打开则优先点击 tb-act-toggle-navigation-drawer-overlay（遮罩上），否则 Escape 或 tb-act-toggle-navigation-drawer。
 * - ensureCaptureUiVisible：若 cp-panel 不可见则点击 gui-btn-show-capture-ui，再断言 cp-panel 可见。
 *
 * 规范：以全局唯一 data-testid 定位；参考 testid-validation-report.md、testid-scan-report.md。
 *
 * Class 定位说明：clearActiveOverlay、clickVSelectTrigger、selectVSelectItemText 中使用的
 * .v-overlay、.v-input、.v-menu__content 等为 Vuetify 2 内部结构，仅作已知实现细节，非主要定位；
 * 主要交互入口均以 data-testid 定位。
 */
import { expect, type Locator, type Page } from '@playwright/test'
import { getAppStartPath } from '../support/appStartPath'

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

/** 仅用于清除遮挡：Vuetify 2 overlay 无稳定 testid，此处 class 为已知实现细节，非主要定位。 */
async function clearActiveOverlay(page: Page, timeout: number) {
  const deadline = Date.now() + Math.max(800, Math.min(timeout, 3000))
  const activeScrim = page.locator('.v-overlay.v-overlay--active .v-overlay__scrim')
  while (Date.now() < deadline) {
    const hasActiveScrim = (await activeScrim.count().catch(() => 0)) > 0
    if (!hasActiveScrim) return
    // 对话框类浮层通常可由 ESC 关闭；失败时继续短轮询等待。
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
    try {
      await locator.click({ timeout })
      return
    } catch (error) {
      lastError = error
      const message = error instanceof Error ? error.message : String(error)
      const isOverlayBlocked = /intercepts pointer events/i.test(message)
      if (!isOverlayBlocked || i === attempts - 1) break
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

/**
 * 点击用于打开下拉的“可点击区域”。
 * Vuetify 2 会把 v-select 的 data-testid 传到内部隐藏的 input 上，getByTestId 拿到的是不可见元素，
 * 需改为点击包含该 input 的可见 .v-input 容器（class 为已知实现细节，主入口仍以 testId 定位）。
 */
async function clickVSelectTrigger(page: Page, testId: string, timeout: number) {
  const byTestId = page.getByTestId(testId).first()
  await byTestId.scrollIntoViewIfNeeded().catch(() => {})
  const vInputWrapper = page.locator('.v-input').filter({ has: byTestId }).first()
  const useWrapper = (await vInputWrapper.count()) > 0
  const clickTarget = useWrapper ? vInputWrapper : byTestId
  await clickLocator(clickTarget, timeout)
}

/** 将驱动/选项名转为 testid 后缀（仅保留字母数字），与 App.vue 中 option 的 data-testid 规则一致 */
function toOptionTestIdSuffix(text: string) {
  return String(text || '').replace(/[^A-Za-z0-9]+/g, '')
}

/** 下拉选项异步加载时等待时长（毫秒） */
const MENU_OPTION_WAIT_MS = 8000

/**
 * 下拉选选项：先 testid 选项，再精确文本、再模糊文本。选项点击均经 clickLocator 做可操作性检查。
 * 当选项无 data-testid 时的 getByText fallback 仅作兼容/临时方案；正式流程应保证选项带 testid（如 ui-app-select-confirm-driver-option-*）。
 * 菜单容器 .v-menu__content 为 Vuetify 2 内部结构，非主要定位。
 */
export async function selectVSelectItemText(page: Page, testId: string, itemText: string, timeout = 10_000) {
  await clickVSelectTrigger(page, testId, timeout)

  const menu = page.locator('.v-menu__content.menuable__content__active').first()
  await expect(menu).toBeVisible({ timeout: Math.min(5000, timeout) }).catch(() => {})

  const waitOptionMs = Math.min(MENU_OPTION_WAIT_MS, timeout)

  if (testId === 'ui-app-select-confirm-driver') {
    const optionTestId = `ui-app-select-confirm-driver-option-${toOptionTestIdSuffix(itemText)}`
    const byTestId = page.getByTestId(optionTestId).first()
    const ok = await byTestId.isVisible().catch(() => false)
    if (ok) {
      await clickLocator(byTestId, timeout)
      return
    }
    try {
      await expect(byTestId).toBeVisible({ timeout: waitOptionMs })
      await clickLocator(byTestId, timeout)
      return
    } catch {
      // 选项未出现（如接口未返回），继续用文本匹配
    }
  }

  const exact = menu.getByText(itemText, { exact: true }).first()
  try {
    await expect(exact).toBeVisible({ timeout: waitOptionMs })
    await clickLocator(exact, timeout)
    return
  } catch {
    // 精确文本未匹配
  }

  const fallback = menu.getByText(itemText, { exact: false }).first()
  await expect(fallback).toBeVisible({ timeout: waitOptionMs })
  await clickLocator(fallback, timeout)
}

export async function gotoHome(page: Page, stepTimeoutMs: number) {
  await page.goto(getAppStartPath(), { waitUntil: 'domcontentloaded', timeout: stepTimeoutMs })
  await expect(page.getByTestId('ui-app-root')).toBeVisible({ timeout: stepTimeoutMs })
}

export async function ensureMenuDrawerOpen(page: Page, timeout = 10_000) {
  const drawer = page.getByTestId('ui-app-menu-drawer').first()
  if ((await drawer.count()) === 0) return

  const state = await drawer.getAttribute('data-state')
  if (state === 'open') return

  const toggle = page.getByTestId('tb-act-toggle-navigation-drawer').first()
  await clickLocator(toggle, timeout)
  await expect(drawer).toHaveAttribute('data-state', 'open', { timeout })
}

export async function ensureMenuDrawerClosed(page: Page, timeout = 10_000) {
  const drawer = page.getByTestId('ui-app-menu-drawer').first()
  if ((await drawer.count()) === 0) return

  const state = await drawer.getAttribute('data-state')
  if (state === 'closed') return

  const overlayToggle = page.getByTestId('tb-act-toggle-navigation-drawer-overlay').first()
  if (await overlayToggle.isVisible().catch(() => false)) {
    await clickLocator(overlayToggle, timeout)
    await expect(drawer).toHaveAttribute('data-state', 'closed', { timeout })
    return
  }

  await page.keyboard.press('Escape').catch(() => {})
  if ((await drawer.getAttribute('data-state').catch(() => null)) === 'closed') return

  const toggle = page.getByTestId('tb-act-toggle-navigation-drawer').first()
  await clickLocator(toggle, timeout)
  await expect(drawer).toHaveAttribute('data-state', 'closed', { timeout })
}

/**
 * 拍摄前置：先切换到主相机/主界面，再显示拍摄面板。
 * 若已在主相机拍摄界面（cp-panel 可见）则直接返回；否则依次尝试「切换到主页」→「显示拍摄 UI」再断言 cp-panel 可见。
 * 所有点击经 clickLocator 做可操作性检查（scrollIntoView → toBeVisible → click）。
 */
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
    await sleep(400)
  }

  await expect(panel).toBeVisible({ timeout })
}
