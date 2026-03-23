/**
 * AI-Control 交互原语。
 *
 * 提供基于 data-testid 的点击、填充、VSelect 选择、状态等待等，统一处理滚动入视、可见性、
 * 可操作性及 overlay 干扰；严禁 force，所有交互走真实链路。设备菜单/探针 testid 生成见 deviceMenuTestId、deviceProbeTestId。
 */
import { expect, type Locator, type Page } from '@playwright/test'

/** 将字符串规范为 testid 安全片段（仅保留字母数字） */
export function sanitizeTestIdPart(value: string) {
  return String(value || 'Unknown').replace(/[^A-Za-z0-9]+/g, '')
}

/** 主菜单中设备子项 testid，如 ui-app-menu-device-MainCamera */
export function deviceMenuTestId(deviceType: string) {
  return `ui-app-menu-device-${deviceType}`
}

/** 设备连接探针 testid，如 e2e-device-MainCamera-conn，用于 data-state=connected/disconnected */
export function deviceProbeTestId(deviceType: string) {
  return `e2e-device-${deviceType}-conn`
}

/** 延时 Promise，用于动画或异步稳定 */
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

/** 对 Locator 执行滚动入视、可见、可点检查后点击；若被 overlay 拦截会尝试 Escape 清 overlay 后重试 */
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

/** 按 data-testid 点击第一个匹配元素，走 clickLocator 链路 */
export async function clickByTestId(page: Page, testId: string, timeout = 10_000) {
  console.log(`[ai-control] 点击  testId=${testId}`)
  await clickLocator(page.getByTestId(testId).first(), timeout)
}

/**
 * 点击复选框以切换状态（Vuetify 等常将 input 隐藏，需点 label）。
 * 优先点击同根 testId 的 testId-label，否则点 testId 自身。
 */
export async function clickCheckboxByTestId(page: Page, testId: string, timeout = 10_000) {
  console.log(`[ai-control] 切换勾选  testId=${testId}`)
  const labelId = `${testId}-label`
  const label = page.getByTestId(labelId).first()
  if ((await label.count()) > 0 && (await label.isVisible().catch(() => false))) {
    await clickLocator(label, timeout)
    return
  }
  await clickLocator(page.getByTestId(testId).first(), timeout)
}

/**
 * 获取复选框当前是否勾选（先找 testId 下 input[type=checkbox]，否则认为 testId 自身为 input）。
 */
export async function isCheckboxChecked(page: Page, testId: string, timeout = 10_000): Promise<boolean> {
  const root = page.getByTestId(testId).first()
  await root.waitFor({ state: 'visible', timeout }).catch(() => {})
  const input = root.locator('input[type=checkbox]').first()
  if ((await input.count()) > 0) return await input.isChecked().catch(() => false)
  return await root.isChecked().catch(() => false)
}

/**
 * 根据目标状态设置复选框：仅当当前状态与目标不一致时才点击，避免重复点击。
 * @param checked true 表示需要勾选，false 表示需要取消勾选
 */
export async function setCheckboxChecked(page: Page, testId: string, checked: boolean, timeout = 10_000) {
  const current = await isCheckboxChecked(page, testId, timeout)
  if (current === checked) {
    console.log(`[ai-control] 勾选状态已满足  testId=${testId}  checked=${checked} (跳过点击)`)
    return
  }
  await clickCheckboxByTestId(page, testId, timeout)
}

/** 按 data-testid 定位输入框，可选先清空再填充，失败时尝试 Ctrl+A 后 type */
export async function fillByTestId(page: Page, testId: string, text: string, clear = true, timeout = 10_000) {
  console.log(`[ai-control] 输入  testId=${testId}  text=${text.length > 20 ? text.slice(0, 20) + '...' : text}`)
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

/** 等待指定 testId 的元素具有给定属性值（默认 data-state），用于异步状态稳定 */
export async function waitForTestIdState(
  page: Page,
  testId: string,
  state: string,
  timeout = 30_000,
  attr = 'data-state',
) {
  await expect(page.getByTestId(testId).first()).toHaveAttribute(attr, state, { timeout })
}

/** 内部：点击 VSelect 触发器（若 testId 在 .v-input 内则点包装器以兼容 Vuetify；包装器不可见时回退点 testid 元素） */
async function clickVSelectTrigger(page: Page, testId: string, timeout: number) {
  const byTestId = page.getByTestId(testId).first()
  await byTestId.scrollIntoViewIfNeeded().catch(() => {})
  await sleep(200)
  const vInputWrapper = page.locator('.v-input').filter({ has: byTestId }).first()
  const wrapperExists = (await vInputWrapper.count()) > 0
  const wrapperVisible = wrapperExists && (await vInputWrapper.isVisible().catch(() => false))
  const locator = wrapperVisible ? vInputWrapper : byTestId
  await clickLocator(locator, timeout)
}

function toOptionTestIdSuffix(text: string) {
  return String(text || '').replace(/[^A-Za-z0-9]+/g, '')
}

/** 打开 VSelect 后按选项文案选择；ui-app-select-confirm-driver 使用 option testid 优先 */
export async function selectVSelectItemText(page: Page, testId: string, itemText: string, timeout = 10_000) {
  console.log(`[ai-control] 下拉选择  testId=${testId}  itemText=${itemText}`)
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
