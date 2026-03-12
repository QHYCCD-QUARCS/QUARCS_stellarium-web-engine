/**
 * 望远镜（Telescopes）E2E 测试：设置焦距（默认 510，可动态传参）
 *
 * 执行逻辑：
 * 1) 打开应用并等待主界面可见。
 * 2) 打开主菜单，进入 Telescopes 子菜单。
 * 3) 仅填写焦距输入框（ui-config-Telescopes-FocalLengthmm-number-0）。
 *    - 默认值：510
 *    - 可通过环境变量 E2E_TELESCOPES_FOCAL_MM 动态覆盖
 * 4) 断言步骤无失败、页面无运行时异常。
 *
 * 定位与交互规范：
 * - 以全局唯一的 data-testid 作为定位标准；控件缺 testid 时需在源码中补齐。
 * - 禁止 force 类操作；所有交互先做可操作性检查（可见、可启用、scrollIntoView、trial 点击）。
 */

import { test, expect, type Locator, type Page, type TestInfo } from '@playwright/test'
import { getAppStartPath } from '../support/appStartPath'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { DEFAULTS, envNumber } = require('../../../e2e.config.cjs')

type StepError = { step: string; message: string }
type RuntimeReport = {
  stepErrors: StepError[]
  pageErrors: string[]
  consoleErrors: string[]
  requestFailed: string[]
}

type RunTiming = {
  actionDelayMs: number
  shortDelayMs: number
}

const DEFAULT_FOCAL_MM = '510'

function resolveFocalMmFromEnv(): string {
  const raw = (process.env.E2E_TELESCOPES_FOCAL_MM ?? '').trim()
  if (!raw) return DEFAULT_FOCAL_MM
  const value = Number(raw)
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`环境变量 E2E_TELESCOPES_FOCAL_MM 非法：${raw}`)
  }
  return String(value)
}

test.use({
  trace: 'on',
  video: 'on',
  screenshot: 'on',
})

function shortError(err: unknown) {
  if (err instanceof Error) return err.message
  return String(err)
}

function attachRuntimeCollectors(page: Page, report: RuntimeReport) {
  page.on('pageerror', (err) => report.pageErrors.push(shortError(err)))
  page.on('console', (msg) => {
    if (msg.type() === 'error') report.consoleErrors.push(msg.text())
  })
  page.on('requestfailed', (req) => {
    report.requestFailed.push(`${req.method()} ${req.url()} :: ${req.failure()?.errorText ?? 'unknown'}`)
  })
}

function buildReportText(report: RuntimeReport) {
  const lines: string[] = []
  lines.push('==== Telescopes 焦距设置测试报告 ====')
  lines.push(`stepErrors: ${report.stepErrors.length}`)
  for (const e of report.stepErrors) lines.push(`- [STEP] ${e.step} :: ${e.message}`)
  lines.push(`pageErrors: ${report.pageErrors.length}`)
  for (const e of report.pageErrors) lines.push(`- [PAGE] ${e}`)
  lines.push(`consoleErrors: ${report.consoleErrors.length}`)
  for (const e of report.consoleErrors) lines.push(`- [CONSOLE] ${e}`)
  lines.push(`requestFailed: ${report.requestFailed.length}`)
  for (const e of report.requestFailed) lines.push(`- [REQUEST] ${e}`)
  return lines.join('\n')
}

async function addStep(name: string, report: RuntimeReport, fn: () => Promise<void>) {
  try {
    await fn()
    console.log(`[OK] ${name}`)
  } catch (err) {
    const message = shortError(err)
    report.stepErrors.push({ step: name, message })
    console.error(`[STEP-ERROR] ${name}: ${message}`)
  }
}

async function waitAfterAction(page: Page, timing: RunTiming) {
  if (timing.actionDelayMs > 0) await page.waitForTimeout(timing.actionDelayMs)
}

async function waitShort(page: Page, timing: RunTiming) {
  if (timing.shortDelayMs > 0) await page.waitForTimeout(timing.shortDelayMs)
}

/** 可操作性检查：可见、可启用、滚入视口、trial 点击；禁止 force 与 DOM 级点击。 */
async function ensureLocatorActionable(loc: Locator, timeoutMs: number = 8_000) {
  await expect(loc).toBeVisible({ timeout: timeoutMs })
  await expect(loc).toBeEnabled({ timeout: timeoutMs })
  await loc.scrollIntoViewIfNeeded().catch(() => {})
  await loc.click({ timeout: timeoutMs, trial: true })
}

/** 先做可操作性检查再标准点击，禁止 force 与 evaluate(click)。 */
async function clickLocatorWithFallback(page: Page, loc: Locator, timing: RunTiming, timeoutMs: number = 8_000) {
  await ensureLocatorActionable(loc, timeoutMs)
  await loc.click({ timeout: timeoutMs })
  await waitAfterAction(page, timing)
}

async function ensureMenuDrawerOpen(page: Page, report: RuntimeReport, timing: RunTiming) {
  await addStep('menu.ensure-drawer-open', report, async () => {
    const drawer = page.getByTestId('ui-app-menu-drawer').first()
    if ((await drawer.count()) === 0) return
    const state = await drawer.getAttribute('data-state')
    if (state === 'open') return
    const toggleBtn = page.getByTestId('tb-act-toggle-navigation-drawer').first()
    await ensureLocatorActionable(toggleBtn, 10_000)
    await toggleBtn.click({ timeout: 10_000 })
    await expect(drawer).toHaveAttribute('data-state', 'open', { timeout: 10_000 })
    await waitAfterAction(page, timing)
  })
}

async function firstVisibleLocator(candidates: Locator): Promise<Locator | null> {
  const count = await candidates.count()
  for (let i = 0; i < count; i++) {
    const item = candidates.nth(i)
    if (await item.isVisible().catch(() => false)) return item
  }
  return null
}

async function findVisibleInScrollableContainer(
  page: Page,
  container: Locator,
  candidates: Locator,
  maxScrollSteps: number = 12,
): Promise<Locator | null> {
  let found = await firstVisibleLocator(candidates)
  if (found) return found

  for (let i = 0; i <= maxScrollSteps; i++) {
    const ratio = i / Math.max(1, maxScrollSteps)
    await container
      .evaluate((el, r) => {
        const node = el as HTMLElement
        const max = Math.max(0, node.scrollHeight - node.clientHeight)
        node.scrollTop = Math.floor(max * r)
      }, ratio)
      .catch(() => {})
    await page.waitForTimeout(120)
    found = await firstVisibleLocator(candidates)
    if (found) return found
  }

  return null
}

async function openTelescopesSubmenu(page: Page, report: RuntimeReport, timing: RunTiming) {
  await addStep('menu.open-telescopes-submenu', report, async () => {
    const drawer = page.getByTestId('ui-app-menu-drawer').first()
    const telescopesItem = page.getByTestId('ui-app-menu-device-Telescopes').first()
    const devicePage = page.getByTestId('ui-app-submenu-device-page').first()

    for (let i = 0; i < 6; i++) {
      await ensureMenuDrawerOpen(page, report, timing)
      await drawer
        .evaluate((el) => {
          ;(el as HTMLElement).scrollTop = 0
        })
        .catch(() => {})

      if ((await telescopesItem.count()) > 0) {
        await telescopesItem.scrollIntoViewIfNeeded().catch(() => {})
        if (await telescopesItem.isVisible().catch(() => false)) {
          await clickLocatorWithFallback(page, telescopesItem, timing, 8_000)
          await expect(devicePage).toHaveAttribute('data-state', 'open', { timeout: 8_000 })
          return
        }
      }

      await drawer
        .evaluate((el) => {
          ;(el as HTMLElement).scrollTop = (el as HTMLElement).scrollHeight
        })
        .catch(() => {})
      await waitShort(page, timing)
    }

    throw new Error('未找到 Telescopes 菜单项（ui-app-menu-device-Telescopes）')
  })
}

async function setTelescopesFocalLength(page: Page, report: RuntimeReport, timing: RunTiming, focalMm: string) {
  await addStep(`telescopes.set-focal-length-${focalMm}`, report, async () => {
    const paramsContainer = page.getByTestId('ui-app-submenu-params-container').first()
    const focalCandidates = page.getByTestId('ui-config-Telescopes-FocalLengthmm-number-0')
    const focalInput = await findVisibleInScrollableContainer(page, paramsContainer, focalCandidates, 10)
    if (!focalInput) throw new Error('未找到可见焦距输入框（ui-config-Telescopes-FocalLengthmm-number-0）')

    await ensureLocatorActionable(focalInput, 8_000)
    await focalInput.fill(focalMm, { timeout: 8_000 })
    await waitAfterAction(page, timing)
    await expect.poll(async () => ((await focalInput.inputValue().catch(() => '') || '').trim()), { timeout: 5_000 }).toBe(focalMm)
  })
}

async function runTelescopesFocalLengthTest(page: Page, testInfo: TestInfo) {
  const report: RuntimeReport = {
    stepErrors: [],
    pageErrors: [],
    consoleErrors: [],
    requestFailed: [],
  }
  attachRuntimeCollectors(page, report)

  const uiTimeoutMs = envNumber(process.env, 'E2E_UI_TIMEOUT_MS', DEFAULTS.flow.uiTimeoutMs)
  const stepTimeoutMs = envNumber(process.env, 'E2E_STEP_TIMEOUT_MS', DEFAULTS.flow.stepTimeoutMs)
  const testTimeoutMs = envNumber(process.env, 'E2E_TEST_TIMEOUT_MS', DEFAULTS.flow.testTimeoutMs)
  const actionDelayMs = Math.max(0, envNumber(process.env, 'E2E_INTERACTION_DELAY_MS', 300))
  const shortDelayMs = Math.max(0, envNumber(process.env, 'E2E_INTERACTION_SHORT_DELAY_MS', 180))
  const timing: RunTiming = { actionDelayMs, shortDelayMs }
  const focalMm = resolveFocalMmFromEnv()

  page.setDefaultTimeout(uiTimeoutMs)
  page.setDefaultNavigationTimeout(stepTimeoutMs)
  testInfo.setTimeout(Math.max(testTimeoutMs, 6 * 60_000))

  await addStep('boot.goto-app', report, async () => {
    await page.goto(getAppStartPath(), { waitUntil: 'load', timeout: stepTimeoutMs })
    await page.waitForLoadState('networkidle', { timeout: stepTimeoutMs }).catch(() => {})
    await expect(page.getByTestId('gui-root').first()).toBeVisible({ timeout: stepTimeoutMs })
    await waitAfterAction(page, timing)
  })

  await ensureMenuDrawerOpen(page, report, timing)
  await openTelescopesSubmenu(page, report, timing)
  await setTelescopesFocalLength(page, report, timing, focalMm)

  const reportText = buildReportText(report)
  console.log(reportText)
  await testInfo.attach('telescopes-focal-length-runtime-report', {
    body: reportText,
    contentType: 'text/plain',
  })

  expect(report.stepErrors.length, '望远镜焦距设置步骤存在失败，请查看附件 telescopes-focal-length-runtime-report').toBe(0)
  expect(report.pageErrors.length, '页面存在运行时异常，请查看附件 telescopes-focal-length-runtime-report').toBe(0)
}

test('6-望远镜-Telescopes-仅设置焦距510', async ({ page }, testInfo) => {
  await runTelescopesFocalLengthTest(page, testInfo)
})

