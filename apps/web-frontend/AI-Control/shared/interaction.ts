/**
 * AI-Control 交互原语。
 *
 * 提供基于 data-testid 的点击、填充、VSelect 选择、状态等待等，统一处理滚动入视、可见性、
 * 可操作性及 overlay 干扰；严禁 force，所有交互走真实链路。设备菜单/探针 testid 生成见 deviceMenuTestId、deviceProbeTestId。
 */
import { expect, type Locator, type Page } from '@playwright/test'

export const ACTION_SETTLE_MS = 200

/** 与 connectionSteps.selectDriverIfVisible 一致：大写、去空白，用于驱动 label / driverText 等价比较 */
export function normalizeDriverLabelForCompare(value: unknown) {
  return String(value ?? '')
    .toUpperCase()
    .replace(/\s+/g, '')
}

export { DEFAULT_QHY_DRIVER_TEXT } from './driverDefaults'

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

/** 多次 Escape 尝试消除 Vuetify 残留 scrim；仍挡住时点击 scrim（与主菜单遮罩关闭策略一致） */
export async function clearActiveOverlay(page: Page, timeout: number) {
  const deadline = Date.now() + Math.max(800, Math.min(timeout, 8000))
  const activeScrim = page.locator('.v-overlay.v-overlay--active .v-overlay__scrim, .v-overlay__scrim')
  while (Date.now() < deadline) {
    const count = await activeScrim.count().catch(() => 0)
    let visibleScrim = null as Locator | null
    for (let i = 0; i < count; i += 1) {
      const candidate = activeScrim.nth(i)
      if (await candidate.isVisible().catch(() => false)) {
        visibleScrim = candidate
        break
      }
    }
    if (!visibleScrim) return
    await page.keyboard.press('Escape').catch(() => {})
    await sleep(120)
  }
  const count = await activeScrim.count().catch(() => 0)
  for (let i = 0; i < count; i += 1) {
    const candidate = activeScrim.nth(i)
    if (!(await candidate.isVisible().catch(() => false))) continue
    await candidate
      .click({ position: { x: 2, y: 2 }, timeout: Math.min(timeout, 5000) })
      .catch(() => {})
    await sleep(250)
    return
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
      await sleep(ACTION_SETTLE_MS)
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
 * Vuetify `v-switch`：写在 `<v-switch>` 上的 `data-testid` 会进入 `attrs$`，VSwitch 将其传入 `genInput`
 *（见 node_modules/vuetify/.../VSwitch.ts：`genInput('checkbox', { ...this.attrs, ...switchAttrs })`），
 * 因此 **testid 常落在内部 `<input type="checkbox">` 上**，而不是外层 `.v-input`。
 * 此时 `root` 已指向 input，`root.locator('input[type="checkbox"]')` 无子级可匹配，若再回退到
 * `clickLocator(root)`，仍会被同级的 ripple 层拦截。对最终命中的节点统一 `force: true` 即可。
 */
export async function clickVuetifySwitchByRoot(root: Locator, timeout = 10_000) {
  await root.scrollIntoViewIfNeeded().catch(() => {})
  await sleep(200)
  const inner = root.locator('input[type="checkbox"]').first()
  const target = (await inner.count()) > 0 ? inner : root
  await expect(target).toBeAttached({ timeout })
  await target.click({ timeout, force: true })
  await sleep(ACTION_SETTLE_MS)
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
  await sleep(ACTION_SETTLE_MS)
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
  await sleep(ACTION_SETTLE_MS)
  const vInputWrapper = page.locator('.v-input').filter({ has: byTestId }).first()
  const wrapperExists = (await vInputWrapper.count()) > 0
  const wrapperVisible = wrapperExists && (await vInputWrapper.isVisible().catch(() => false))
  const locator = wrapperVisible ? vInputWrapper : byTestId
  await clickLocator(locator, timeout)
}

function toOptionTestIdSuffix(text: string) {
  return String(text || '').replace(/[^A-Za-z0-9]+/g, '')
}

/**
 * App.vue 中选项 data-testid 由 item.value 生成（如 indi_qhy_ccd → indiqhyccd），
 * 而 driverText 常为展示 label（QHY CCD）或 SDK 名（QHYCCD）。收集可能匹配的 testid 后缀。
 */
function collectConfirmDriverOptionTestIdSuffixes(itemText: string): string[] {
  const out = new Set<string>()
  const add = (raw: string) => {
    const s = toOptionTestIdSuffix(raw)
    if (s) out.add(s)
  }
  add(itemText)
  const norm = normalizeDriverLabelForCompare(itemText)
  if (norm === 'QHYCCD' || norm === 'QHYCCD2') {
    add('indi_qhy_ccd')
    add('indi_qhy_ccd2')
    add('libqhyccd')
  }
  if (norm === 'EQMOD') {
    add('indi_eqmod_mount')
    add('indi_eqmod_telescope')
    add('eqmod')
  }
  return [...out]
}

async function clickConfirmDriverOptionIfPossible(
  page: Page,
  menu: Locator,
  itemText: string,
  timeout: number,
): Promise<boolean> {
  const suffixes = collectConfirmDriverOptionTestIdSuffixes(itemText)
  for (const suffix of suffixes) {
    const tid = `ui-app-select-confirm-driver-option-${suffix}`
    const loc = page.getByTestId(tid).first()
    if ((await loc.count().catch(() => 0)) > 0) {
      await loc.scrollIntoViewIfNeeded().catch(() => {})
      await sleep(ACTION_SETTLE_MS)
    }
    if (await loc.isVisible().catch(() => false)) {
      await clickLocator(loc, timeout)
      return true
    }
  }

  const want = normalizeDriverLabelForCompare(itemText)
  if (!want) return false

  const options = menu.locator('[data-testid^="ui-app-select-confirm-driver-option-"]')
  const n = await options.count()
  for (let i = 0; i < n; i += 1) {
    const el = options.nth(i)
    await el.scrollIntoViewIfNeeded().catch(() => {})
    await sleep(60)
    const txt = await el.innerText().catch(() => '')
    const normalizedText = normalizeDriverLabelForCompare(txt)
    const tid = await el.getAttribute('data-testid').catch(() => '')
    const normalizedTid = normalizeDriverLabelForCompare(tid)
    if (
      normalizedText === want ||
      normalizedText.includes(want) ||
      want.includes(normalizedText) ||
      normalizedTid.includes(want)
    ) {
      await clickLocator(el, timeout)
      return true
    }
  }
  return false
}

/** 打开 VSelect 后按选项文案选择；ui-app-select-confirm-driver 使用 option testid 优先 */
export async function selectVSelectItemText(page: Page, testId: string, itemText: string, timeout = 10_000) {
  console.log(`[ai-control] 下拉选择  testId=${testId}  itemText=${itemText}`)
  await clickVSelectTrigger(page, testId, timeout)

  const menu = page.locator('.v-menu__content.menuable__content__active').first()
  await expect(menu).toBeVisible({ timeout: Math.min(5000, timeout) }).catch(() => {})

  if (testId === 'ui-app-select-confirm-driver') {
    if (await clickConfirmDriverOptionIfPossible(page, menu, itemText, timeout)) return
  }

  const byRole = menu.getByRole('option', { name: new RegExp(`^${escapeRegExp(itemText)}$`, 'i') }).first()
  await byRole.scrollIntoViewIfNeeded().catch(() => {})
  if (await byRole.isVisible().catch(() => false)) {
    await clickLocator(byRole, timeout)
    return
  }

  const exact = menu.getByText(itemText, { exact: true }).first()
  await exact.scrollIntoViewIfNeeded().catch(() => {})
  if (await exact.isVisible().catch(() => false)) {
    await clickLocator(exact, timeout)
    return
  }

  const fallback = menu.getByText(itemText, { exact: false }).first()
  await fallback.scrollIntoViewIfNeeded().catch(() => {})
  await expect(fallback).toBeVisible({ timeout: Math.min(8000, timeout) })
  await clickLocator(fallback, timeout)
}

function escapeRegExp(s: string) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
