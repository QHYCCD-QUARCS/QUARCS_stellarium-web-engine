/**
 * 电源管理（Power Management）E2E 测试：菜单入口 + 关键确认弹窗分支覆盖
 *
 * 详细执行逻辑（按 runPowerManagementTest 的真实顺序）：
 * 1) 启动与进入电源页：
 *    - 打开应用并进入主菜单。
 *    - 点击 Power Management 菜单并确认电源页处于 open 状态。
 *
 * 2) 基础控件存在性检查：
 *    - 校验 Output Power 1/2、Restart、Shutdown、Force Update 五个主操作入口均存在。
 *
 * 3) Output Power 1 状态闭环：
 *    - 读取当前 [ON]/[OFF] 状态。
 *    - 执行一次状态切换并确认。
 *    - 再执行一次反向切换并确认，最终恢复初始状态。
 *
 * 4) 危险操作弹窗取消路径：
 *    - Force Update：点击后走 Cancel 分支。
 *    - Restart：连续两次点击，均走 Cancel 分支。
 *    - Shutdown：点击后走 Cancel 分支。
 *
 * 5) 收尾与断言：
 *    - 附加运行报告并断言 stepErrors=0、pageErrors=0。
 */

import { test, expect, type Page, type TestInfo } from '@playwright/test'
import { getAppStartPath } from '../support/appStartPath'

// 统一配置入口（默认超时）
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

function attachRuntimeCollectors(page: Page, report: RuntimeReport) {
  page.on('pageerror', (err) => {
    report.pageErrors.push(shortError(err))
  })
  page.on('console', (msg) => {
    if (msg.type() === 'error') report.consoleErrors.push(msg.text())
  })
  page.on('requestfailed', (req) => {
    report.requestFailed.push(`${req.method()} ${req.url()} :: ${req.failure()?.errorText ?? 'unknown'}`)
  })
}

function buildReportText(report: RuntimeReport) {
  const lines: string[] = []
  lines.push('==== Power Management 测试报告 ====')
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

async function ensureMenuDrawerOpen(page: Page, report: RuntimeReport, timing: RunTiming) {
  await addStep('menu.ensure-drawer-open', report, async () => {
    const drawer = page.getByTestId('ui-app-menu-drawer').first()
    if ((await drawer.count()) === 0) return

    const state = await drawer.getAttribute('data-state')
    if (state === 'open') return

    const toggleBtn = page.getByTestId('tb-act-toggle-navigation-drawer').first()
    await expect(toggleBtn).toBeVisible({ timeout: 10_000 })
    await toggleBtn.click({ timeout: 8_000 })
    await expect(drawer).toHaveAttribute('data-state', 'open', { timeout: 10_000 })
    await waitAfterAction(page, timing)
  })
}

async function cancelConfirmIfOpened(page: Page, report: RuntimeReport, timing: RunTiming, stepPrefix: string) {
  await addStep(`${stepPrefix}.confirm.cancel-if-opened`, report, async () => {
    const root = page.getByTestId('ui-confirm-dialog-root').first()
    if ((await root.count()) === 0) return
    if ((await root.getAttribute('data-state')) !== 'open') return

    const cancelBtn = page.getByTestId('ui-confirm-dialog-btn-cancel').first()
    await expect(cancelBtn).toBeVisible({ timeout: 8_000 })
    await cancelBtn.click({ timeout: 8_000 })
    await expect(root).toHaveAttribute('data-state', 'closed', { timeout: 10_000 })
    await waitAfterAction(page, timing)
  })
}

async function confirmConfirmIfOpened(page: Page, report: RuntimeReport, timing: RunTiming, stepPrefix: string) {
  await addStep(`${stepPrefix}.confirm.confirm-if-opened`, report, async () => {
    const root = page.getByTestId('ui-confirm-dialog-root').first()
    if ((await root.count()) === 0) return
    if ((await root.getAttribute('data-state')) !== 'open') return

    const confirmBtn = page.getByTestId('ui-confirm-dialog-btn-confirm').first()
    await expect(confirmBtn).toBeVisible({ timeout: 8_000 })
    await confirmBtn.click({ timeout: 8_000 })
    await expect(root).toHaveAttribute('data-state', 'closed', { timeout: 10_000 })
    await waitAfterAction(page, timing)
  })
}

async function pickVisibleByTestId(page: Page, testId: string) {
  const all = page.getByTestId(testId)
  const count = await all.count()
  if (count === 0) return all.first()
  for (let i = 0; i < count; i++) {
    const item = all.nth(i)
    if (await item.isVisible().catch(() => false)) return item
  }
  return all.first()
}

async function clickPowerActionAndCancel(
  page: Page,
  report: RuntimeReport,
  timing: RunTiming,
  actionTestId: string,
  stepPrefix: string,
) {
  await addStep(`${stepPrefix}.click`, report, async () => {
    const btn = await pickVisibleByTestId(page, actionTestId)
    await btn.scrollIntoViewIfNeeded()
    try {
      await btn.click({ timeout: 8_000 })
    } catch {
      // 某些设备分辨率下按钮存在但超出可点击视口，回退为 DOM 级 click 触发处理逻辑。
      await btn.evaluate((el) => (el as HTMLElement).click())
    }
    await waitAfterAction(page, timing)
  })
  await cancelConfirmIfOpened(page, report, timing, stepPrefix)
}

async function clickLocatorWithFallback(page: Page, loc: ReturnType<Page['locator']>, timing: RunTiming) {
  await loc.scrollIntoViewIfNeeded()
  try {
    await loc.click({ timeout: 8_000 })
  } catch {
    await loc.evaluate((el) => (el as HTMLElement).click())
  }
  await waitAfterAction(page, timing)
}

async function runPowerManagementTest(page: Page, testInfo: TestInfo) {
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
  const timing: RunTiming = { actionDelayMs }

  page.setDefaultTimeout(uiTimeoutMs)
  page.setDefaultNavigationTimeout(stepTimeoutMs)
  testInfo.setTimeout(Math.max(testTimeoutMs, 8 * 60_000))

  // 阶段 1：应用启动并进入 Power Management 页面
  await addStep('boot.goto-app', report, async () => {
    await page.goto(getAppStartPath(), { waitUntil: 'domcontentloaded', timeout: stepTimeoutMs })
    await waitAfterAction(page, timing)
  })

  await ensureMenuDrawerOpen(page, report, timing)

  await addStep('menu.open-power-manager', report, async () => {
    // 优先使用稳定 testid，对应你给出的 Power 菜单 DOM
    const menuItem = page.getByTestId('ui-app-menu-open-power-manager').first()
    await expect(menuItem).toBeVisible({ timeout: Math.min(15_000, stepTimeoutMs) })
    await menuItem.click({ timeout: 8_000 })

    const root = page.getByTestId('ui-power-manager-root').first()
    await expect(root).toHaveAttribute('data-state', 'open', { timeout: Math.min(15_000, stepTimeoutMs) })
    await waitAfterAction(page, timing)
  })

  // 阶段 2：校验关键入口存在
  await addStep('power-page.check-main-actions-exist', report, async () => {
    await expect(page.getByTestId('ui-app-power-page-output-power-1').first()).toHaveCount(1)
    await expect(page.getByTestId('ui-app-power-page-output-power-2').first()).toHaveCount(1)
    await expect(page.getByTestId('ui-app-power-page-restart').first()).toHaveCount(1)
    await expect(page.getByTestId('ui-app-power-page-shutdown').first()).toHaveCount(1)
    await expect(page.getByTestId('ui-app-power-page-force-update').first()).toHaveCount(1)
  })

  // 阶段 3：Output Power 1 做“先切换再恢复”闭环：ON->OFF->ON 或 OFF->ON->OFF。
  await addStep('power-page.output-power-1.toggle-and-restore', report, async () => {
    const power1 = await pickVisibleByTestId(page, 'ui-app-power-page-output-power-1')
    const readState = async () => {
      const text = (await power1.textContent()) ?? ''
      if (text.includes('[ON]')) return 'ON'
      if (text.includes('[OFF]')) return 'OFF'
      return 'UNKNOWN'
    }

    const initialState = await readState()
    if (initialState === 'UNKNOWN') throw new Error('Output Power 1 未识别到 [ON]/[OFF] 状态')

    if (initialState === 'ON') {
      await clickLocatorWithFallback(page, power1, timing)
      await confirmConfirmIfOpened(page, report, timing, 'power-page.output-power-1.turn-off')

      await clickLocatorWithFallback(page, power1, timing)
      await confirmConfirmIfOpened(page, report, timing, 'power-page.output-power-1.turn-on')
      return
    }

    await clickLocatorWithFallback(page, power1, timing)
    await confirmConfirmIfOpened(page, report, timing, 'power-page.output-power-1.turn-on')

    await clickLocatorWithFallback(page, power1, timing)
    await confirmConfirmIfOpened(page, report, timing, 'power-page.output-power-1.turn-off')
  })

  // 阶段 4：危险操作仅验证弹窗取消分支（不执行真实重启/关机）
  await clickPowerActionAndCancel(page, report, timing, 'ui-app-power-page-force-update', 'power-page.force-update')
  // 按要求把重启/关机放在最后验证
  await clickPowerActionAndCancel(page, report, timing, 'ui-app-power-page-restart', 'power-page.restart.first')
  await clickPowerActionAndCancel(page, report, timing, 'ui-app-power-page-restart', 'power-page.restart.second')
  await clickPowerActionAndCancel(page, report, timing, 'ui-app-power-page-shutdown', 'power-page.shutdown')

  // 阶段 5：收尾与断言
  const reportText = buildReportText(report)
  console.log(reportText)
  await testInfo.attach('power-management-runtime-report', {
    body: reportText,
    contentType: 'text/plain',
  })

  expect(report.stepErrors.length, '电源管理交互步骤存在失败，请查看附件 power-management-runtime-report').toBe(0)
  expect(report.pageErrors.length, '页面存在运行时异常，请查看附件 power-management-runtime-report').toBe(0)
}

test('2-电源管理-Power菜单进入与确认弹窗取消分支覆盖', async ({ page }, testInfo) => {
  await runPowerManagementTest(page, testInfo)
})
