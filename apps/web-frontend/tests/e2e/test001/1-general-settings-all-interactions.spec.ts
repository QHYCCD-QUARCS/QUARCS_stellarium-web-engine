/**
 * 总设置（General Settings）E2E 测试：全页签交互与关键分支覆盖
 *
 * 详细执行逻辑（按 runGeneralSettingsAllInteractions 的真实顺序）：
 * 1) 启动与进入设置：
 *    - 打开应用并等待基础页面稳定。
 *    - 打开侧边菜单，进入 General Settings 对话框。
 *
 * 2) Display Settings 页签：
 *    - 依次验证并双向切换 Milky Way / DSS / Meridian / Ecliptic / HighFPS。
 *    - 若语言切换控件存在，则执行一次语言切换验证。
 *
 * 3) Version Info 页签：
 *    - 切换到 Version Info。
 *    - 触发 Refresh Devices。
 *
 * 4) Memory Settings 页签：
 *    - 切换到 Memory Settings。
 *    - 执行 Refresh Storage、Clear Logs。
 *    - 分别打开单文件/多文件 USB Browser 并做弹窗交互后关闭。
 *    - 打开 Clear Box 对话框，覆盖 Cancel 分支。
 *    - 再次打开 Clear Box，对至少一项勾选后覆盖 Confirm 分支。
 *
 * 5) 收尾与断言：
 *    - 关闭 General Settings 对话框。
 *    - 附加运行报告并断言 stepErrors=0、pageErrors=0。
 */

import { test, expect, type Locator, type Page, type TestInfo } from '@playwright/test'
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
  shortDelayMs: number
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

async function addStep(
  name: string,
  report: RuntimeReport,
  fn: () => Promise<void>,
) {
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

async function getCheckboxAndControl(loc: Locator) {
  const isCheckboxSelf = await loc
    .evaluate((el) => el instanceof HTMLInputElement && el.type === 'checkbox')
    .catch(() => false)
  const checkbox = isCheckboxSelf ? loc : loc.locator('input[type="checkbox"]').first()

  // 优先使用源码中显式定义的可点击 testid（${rootTestId}-label）
  const rootTestId = await loc.getAttribute('data-testid')
  if (rootTestId) {
    const labelControl = loc.page().getByTestId(`${rootTestId}-label`).first()
    if ((await labelControl.count()) > 0 && (await labelControl.isVisible().catch(() => false))) {
      return { checkbox, control: labelControl }
    }
  }

  return { checkbox, control: loc }
}

async function setCheckboxByRealInteraction(loc: Locator, checked: boolean) {
  const { checkbox, control } = await getCheckboxAndControl(loc)
  if ((await checkbox.count()) === 0) return

  const current = await checkbox.isChecked().catch(() => false)
  if (current === checked) return

  await control.click({ timeout: 8_000 })
  const afterClick = await checkbox.isChecked().catch(() => current)
  if (afterClick === checked) return

  await control.focus()
  await control.press('Space')
  await expect.poll(async () => checkbox.isChecked().catch(() => false), { timeout: 2_000 }).toBe(checked)
}

async function clickByTestIdIfVisible(
  page: Page,
  testId: string,
  stepName: string,
  report: RuntimeReport,
  timing: RunTiming,
) {
  await addStep(stepName, report, async () => {
    const loc = page.getByTestId(testId).first()
    if ((await loc.count()) === 0) return
    if (!(await loc.isVisible().catch(() => false))) return

    // 优先处理 checkbox，避免被 ripple 覆盖层拦截 click
    const { checkbox } = await getCheckboxAndControl(loc)
    if ((await checkbox.count()) > 0) {
      const original = await checkbox.isChecked().catch(() => false)
      await setCheckboxByRealInteraction(loc, !original)
      await waitAfterAction(page, timing)
      return
    }

    await loc.click({ timeout: 8_000 })
    await waitAfterAction(page, timing)
  })
}

async function toggleCheckboxTwice(
  page: Page,
  testId: string,
  stepName: string,
  report: RuntimeReport,
  timing: RunTiming,
) {
  await addStep(stepName, report, async () => {
    const loc = page.getByTestId(testId).first()
    if ((await loc.count()) === 0) return
    if (!(await loc.isVisible().catch(() => false))) return

    const { checkbox } = await getCheckboxAndControl(loc)
    if ((await checkbox.count()) > 0) {
      const original = await checkbox.isChecked().catch(() => false)
      await setCheckboxByRealInteraction(loc, !original)
      await waitShort(page, timing)
      await setCheckboxByRealInteraction(loc, original)
      await waitAfterAction(page, timing)
      return
    }

    await loc.click({ timeout: 8_000 })
    await waitShort(page, timing)
    await loc.click({ timeout: 8_000 })
    await waitAfterAction(page, timing)
  })
}

async function setCheckboxByTestIdIfVisible(
  page: Page,
  testId: string,
  checked: boolean,
  stepName: string,
  report: RuntimeReport,
  timing: RunTiming,
) {
  await addStep(stepName, report, async () => {
    const loc = page.getByTestId(testId).first()
    if ((await loc.count()) === 0) return
    if (!(await loc.isVisible().catch(() => false))) return

    const { checkbox } = await getCheckboxAndControl(loc)
    if ((await checkbox.count()) === 0) return
    await setCheckboxByRealInteraction(loc, checked)
    await waitAfterAction(page, timing)
  })
}

async function switchLanguageIfPossible(page: Page, report: RuntimeReport, timing: RunTiming) {
  await addStep('display.select-language.switch-and-back', report, async () => {
    const select = page.getByTestId('ui-view-settings-dialog-select-switch-language').first()
    if ((await select.count()) === 0) return
    if (!(await select.isVisible().catch(() => false))) return

    const currentText = (await select.textContent())?.trim() ?? ''
    await select.click({ timeout: 8_000 })

    const menuItems = page.locator('.v-menu__content .v-list-item')
    const itemCount = await menuItems.count()
    if (itemCount === 0) {
      await page.keyboard.press('Escape')
      return
    }

    const labels: string[] = []
    for (let i = 0; i < itemCount; i++) {
      labels.push((await menuItems.nth(i).innerText()).trim())
    }

    let target = labels.find((v) => v && v !== currentText)
    if (!target) target = labels.find(Boolean)
    if (!target) {
      await page.keyboard.press('Escape')
      return
    }

    const targetItem = page.locator('.v-menu__content .v-list-item', { hasText: target }).first()
    await targetItem.scrollIntoViewIfNeeded().catch(() => {})
    await expect(targetItem).toBeVisible({ timeout: 8_000 })
    await targetItem.click({ timeout: 8_000 })
    await waitAfterAction(page, timing)

    // 再切回原值，避免影响后续用例/环境
    if (currentText && currentText !== target) {
      await select.click({ timeout: 8_000 })
      const restoreItem = page.locator('.v-menu__content .v-list-item', { hasText: currentText }).first()
      await restoreItem.scrollIntoViewIfNeeded().catch(() => {})
      await expect(restoreItem).toBeVisible({ timeout: 8_000 })
      await restoreItem.click({ timeout: 8_000 })
      await waitAfterAction(page, timing)
    }
  })
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

async function interactUsbDialogIfOpened(page: Page, report: RuntimeReport, timing: RunTiming) {
  const root = page.getByTestId('ui-usbfiles-dialog-root').first()
  if ((await root.count()) === 0) return
  if (!(await root.isVisible().catch(() => false))) return

  await clickByTestIdIfVisible(
    page,
    'ui-usbfiles-dialog-btn-navigate-up',
    'memory.usb-dialog.navigate-up',
    report,
    timing,
  )

  await addStep('memory.usb-dialog.click-first-item-if-exists', report, async () => {
    const item = page.getByTestId('ui-components-usbfiles-dialog-act-handle-item-click').first()
    if ((await item.count()) === 0) return
    if (!(await item.isVisible().catch(() => false))) return
    await item.click({ timeout: 8_000 })
    await waitAfterAction(page, timing)
  })

  await clickByTestIdIfVisible(
    page,
    'ui-usbfiles-dialog-btn-blue-text',
    'memory.usb-dialog.close',
    report,
    timing,
  )
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
  lines.push('==== General Settings 测试报告 ====')
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

async function runGeneralSettingsAllInteractions(page: Page, testInfo: TestInfo) {
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

  page.setDefaultTimeout(uiTimeoutMs)
  page.setDefaultNavigationTimeout(stepTimeoutMs)
  testInfo.setTimeout(Math.max(testTimeoutMs, 10 * 60_000))

  // 阶段 1：应用启动并进入 General Settings
  await addStep('boot.goto-app', report, async () => {
    await page.goto(getAppStartPath(), { waitUntil: 'domcontentloaded', timeout: stepTimeoutMs })
    await waitAfterAction(page, timing)
  })

  await ensureMenuDrawerOpen(page, report, timing)

  await addStep('menu.open-general-settings', report, async () => {
    const menuItem = page.getByTestId('ui-app-menu-general-settings').first()
    await expect(menuItem).toBeVisible({ timeout: Math.min(15_000, stepTimeoutMs) })
    await menuItem.click({ timeout: 8_000 })
    await expect(page.getByTestId('ui-view-settings-dialog-root').first()).toHaveAttribute(
      'data-state',
      'open',
      { timeout: Math.min(15_000, stepTimeoutMs) },
    )
    await waitAfterAction(page, timing)
  })

  // 阶段 2：Display Settings 页签交互
  await clickByTestIdIfVisible(
    page,
    'ui-view-settings-dialog-tab-display-settings',
    'display.tab.open',
    report,
    timing,
  )
  await toggleCheckboxTwice(
    page,
    'ui-view-settings-dialog-checkbox-milky-way-on',
    'display.checkbox.milky-way.toggle-twice',
    report,
    timing,
  )
  await toggleCheckboxTwice(
    page,
    'ui-view-settings-dialog-checkbox-dss-on',
    'display.checkbox.dss.toggle-twice',
    report,
    timing,
  )
  await toggleCheckboxTwice(
    page,
    'ui-view-settings-dialog-checkbox-meridian-on',
    'display.checkbox.meridian.toggle-twice',
    report,
    timing,
  )
  await toggleCheckboxTwice(
    page,
    'ui-view-settings-dialog-checkbox-ecliptic-on',
    'display.checkbox.ecliptic.toggle-twice',
    report,
    timing,
  )
  await toggleCheckboxTwice(
    page,
    'ui-view-settings-dialog-checkbox-highfps-on',
    'display.checkbox.highfps.toggle-twice',
    report,
    timing,
  )
  await switchLanguageIfPossible(page, report, timing)

  // 阶段 3：Version Info 页签交互
  await clickByTestIdIfVisible(
    page,
    'ui-view-settings-dialog-tab-version-info',
    'version.tab.open',
    report,
    timing,
  )
  await clickByTestIdIfVisible(
    page,
    'ui-view-settings-dialog-btn-refresh-devices',
    'version.refresh-devices',
    report,
    timing,
  )

  // 阶段 4：Memory Settings 页签交互（含清理确认弹窗双分支）
  await clickByTestIdIfVisible(
    page,
    'ui-view-settings-dialog-tab-memory-settings',
    'memory.tab.open',
    report,
    timing,
  )
  await clickByTestIdIfVisible(
    page,
    'ui-view-settings-dialog-btn-refresh-storage',
    'memory.refresh-storage',
    report,
    timing,
  )
  await clickByTestIdIfVisible(
    page,
    'ui-view-settings-dialog-btn-clear-logs',
    'memory.clear-logs',
    report,
    timing,
  )

  await clickByTestIdIfVisible(
    page,
    'ui-view-settings-dialog-btn-open-usbbrowser',
    'memory.open-usb-browser.single',
    report,
    timing,
  )
  await interactUsbDialogIfOpened(page, report, timing)

  await clickByTestIdIfVisible(
    page,
    'ui-view-settings-dialog-btn-open-usbbrowser-2',
    'memory.open-usb-browser.multiple',
    report,
    timing,
  )
  await interactUsbDialogIfOpened(page, report, timing)

  await clickByTestIdIfVisible(
    page,
    'ui-view-settings-dialog-btn-open-clear-box-dialog',
    'memory.open-clear-box-dialog.first',
    report,
    timing,
  )
  await toggleCheckboxTwice(
    page,
    'ui-view-settings-dialog-checkbox-cache',
    'memory.clear-box.checkbox.cache.toggle-twice',
    report,
    timing,
  )
  await toggleCheckboxTwice(
    page,
    'ui-view-settings-dialog-checkbox-update-pack',
    'memory.clear-box.checkbox.update-pack.toggle-twice',
    report,
    timing,
  )
  await toggleCheckboxTwice(
    page,
    'ui-view-settings-dialog-checkbox-backup',
    'memory.clear-box.checkbox.backup.toggle-twice',
    report,
    timing,
  )
  await clickByTestIdIfVisible(
    page,
    'ui-view-settings-dialog-btn-on-cancel-clear-box',
    'memory.clear-box.cancel',
    report,
    timing,
  )

  // 再打开一次，测试 confirm 分支（先确保有选项勾选）
  await clickByTestIdIfVisible(
    page,
    'ui-view-settings-dialog-btn-open-clear-box-dialog',
    'memory.open-clear-box-dialog.second',
    report,
    timing,
  )
  await setCheckboxByTestIdIfVisible(
    page,
    'ui-view-settings-dialog-checkbox-cache',
    true,
    'memory.clear-box.checkbox.cache.enable',
    report,
    timing,
  )
  await clickByTestIdIfVisible(
    page,
    'ui-view-settings-dialog-btn-on-confirm-clear-box',
    'memory.clear-box.confirm',
    report,
    timing,
  )

  await clickByTestIdIfVisible(
    page,
    'ui-view-settings-dialog-btn-blue-text',
    'general-settings.close-dialog',
    report,
    timing,
  )

  // 阶段 5：收尾与断言
  const reportText = buildReportText(report)
  console.log(reportText)
  await testInfo.attach('general-settings-runtime-report', {
    body: reportText,
    contentType: 'text/plain',
  })

  // 关键失败：步骤交互失败 / 页面运行时异常
  expect(
    report.stepErrors.length,
    `总设置交互步骤存在失败，请查看附件 general-settings-runtime-report`,
  ).toBe(0)
  expect(
    report.pageErrors.length,
    `页面存在运行时异常，请查看附件 general-settings-runtime-report`,
  ).toBe(0)
}

test('1-总设置-全交互与子项覆盖（含报错输出与全程录制）', async ({ page }, testInfo) => {
  await runGeneralSettingsAllInteractions(page, testInfo)
})
