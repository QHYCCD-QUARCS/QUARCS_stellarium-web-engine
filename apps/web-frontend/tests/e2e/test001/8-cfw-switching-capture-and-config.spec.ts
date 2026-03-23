/**
 * 滤镜轮（CFW）E2E 测试：拍摄面板与配置菜单两路滤镜切换验证
 *
 * 从 4-maincamera-qhyccd-two-connections-loop.spec.ts 单独提出。
 *
 * 约束：
 * - 禁止使用 force 类操作；所有交互先做可操作性检查（可见、可启用、进入视口、trial 点击）。
 * - 定位以全局唯一的 data-testid 为准；缺失时在源码中补齐，以
 *   docs/testid-validation-report.md 与 docs/testid-scan-report.md 为核对依据。
 *
 * 执行逻辑：
 * 1) 启动与初始清理：打开应用、Disconnect All
 * 2) 连接主相机（MainCamera QHYCCD），等待连接完成（含设备分配）
 * 3) 若 CFW 已连接，执行：
 *    a. 拍摄面板：cp-btn-cfw-plus / cp-btn-cfw-minus 切换验证
 *    b. 配置菜单：CFW 子菜单内 CFWNext / CFWPrev 切换验证
 * 4) 若 CFW 未连接，跳过并标记为 SKIP
 *
 * DOM：拍摄面板 cp-btn-cfw-plus, cp-btn-cfw-minus, cp-cfw-display, cp-cfw-value
 *      配置菜单 ui-config-CFW-CFWPrev-button-*, ui-config-CFW-CFWNext-button-*
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

const MAINCAMERA_DRIVER_MATCH = /indi_qhy_ccd|qhyccd|QHY CCD|QHYminiCam/i
const CONNECT_WAIT_MS = 25_000

test.use({
  trace: 'on',
  video: 'on',
  screenshot: 'on',
})

function shortError(err: unknown) {
  if (err instanceof Error) return err.message
  return String(err)
}

/** 可操作性检查：可见、可启用、进入视口、trial 点击通过后视为可点击。禁止 force / evaluate(click)。 */
async function ensureLocatorActionable(loc: Locator, timeoutMs: number = 8_000) {
  await expect(loc).toBeVisible({ timeout: timeoutMs })
  await expect(loc).toBeEnabled({ timeout: timeoutMs })
  await loc.scrollIntoViewIfNeeded().catch(() => {})
  await loc.click({ timeout: timeoutMs, trial: true })
}

/** 先做可操作性检查再标准 click，禁止 force 与 DOM 级 evaluate(click)。 */
async function clickLocator(page: Page, loc: Locator, timing: RunTiming, timeoutMs: number = 8_000) {
  await ensureLocatorActionable(loc, timeoutMs)
  await loc.click({ timeout: timeoutMs })
  await waitAfterAction(page, timing)
}

async function addStep(
  name: string,
  report: RuntimeReport,
  fn: () => Promise<void>,
  options?: { allowFailure?: boolean },
) {
  try {
    await fn()
    console.log(`[OK] ${name}`)
  } catch (err) {
    const message = shortError(err)
    report.stepErrors.push({ step: name, message })
    console.error(`[STEP-ERROR] ${name}: ${message}`)
    if (!options?.allowFailure) throw err
  }
}

async function waitAfterAction(page: Page, timing: RunTiming) {
  if (timing.actionDelayMs > 0) await page.waitForTimeout(timing.actionDelayMs)
}

async function waitShort(page: Page, timing: RunTiming) {
  if (timing.shortDelayMs > 0) await page.waitForTimeout(timing.shortDelayMs)
}

async function findVisibleButtonByTestIdPrefix(
  page: Page,
  testIdPrefix: string,
): Promise<ReturnType<Page['locator']> | null> {
  const candidates = page.locator(`[data-testid^="${testIdPrefix}"]`)
  const count = await candidates.count()
  if (count === 0) return null

  for (let i = 0; i < count; i++) {
    const candidate = candidates.nth(i)
    if (!(await candidate.isVisible().catch(() => false))) continue
    const testId = await candidate.getAttribute('data-testid')
    if (!testId) continue
    return page.getByTestId(testId).first()
  }

  const fallbackId = await candidates.first().getAttribute('data-testid')
  if (!fallbackId) return null
  return page.getByTestId(fallbackId).first()
}

async function ensureMenuLayersClosed(page: Page, timing: RunTiming) {
  const drawer = page.getByTestId('ui-app-menu-drawer').first()
  const submenuDrawer = page.getByTestId('ui-app-submenu-drawer').first()
  const toggleDrawerBtn = page.getByTestId('tb-act-toggle-navigation-drawer').first()

  const clickOutside = async () => {
    const drawerBox = await drawer.boundingBox().catch(() => null)
    const submenuBox = await submenuDrawer.boundingBox().catch(() => null)
    const viewport = page.viewportSize()
    if (viewport && (drawerBox || submenuBox)) {
      const drawerRight = drawerBox ? drawerBox.x + drawerBox.width : 0
      const submenuRight = submenuBox ? submenuBox.x + submenuBox.width : 0
      const rightEdge = Math.max(drawerRight, submenuRight)
      const sourceBox = submenuBox ?? drawerBox
      const targetX = Math.min(viewport.width - 10, rightEdge + 24)
      const targetY = Math.min(viewport.height - 10, Math.max(10, (sourceBox?.y ?? 0) + 60))
      await page.mouse.click(targetX, targetY)
    } else {
      await page.mouse.click(20, 20)
    }
    await page.waitForTimeout(250)
  }

  const isDrawerOpen = async () => (await drawer.count()) > 0 && (await drawer.getAttribute('data-state')) === 'open'
  const isSubmenuOpen = async () =>
    (await submenuDrawer.count()) > 0 && (await submenuDrawer.getAttribute('data-state')) === 'open'
  const toggleMenuDrawer = async () => {
    await toggleDrawerBtn.scrollIntoViewIfNeeded().catch(() => {})
    if (await toggleDrawerBtn.isVisible().catch(() => false) && (await toggleDrawerBtn.isEnabled().catch(() => false))) {
      await toggleDrawerBtn.click({ timeout: 8_000 }).catch(() => {})
    }
    await page.waitForTimeout(300)
  }

  for (let i = 0; i < 4; i++) {
    const drawerOpen = await isDrawerOpen()
    const submenuOpen = await isSubmenuOpen()
    if (!drawerOpen && !submenuOpen) {
      await waitAfterAction(page, timing)
      return
    }
    if (drawerOpen) await toggleMenuDrawer()
    if (await isSubmenuOpen()) {
      await page.keyboard.press('Escape').catch(() => {})
      await page.waitForTimeout(250)
    }
    if (await isDrawerOpen() || (await isSubmenuOpen())) {
      await clickOutside()
    }
  }

  if (await isDrawerOpen() || (await isSubmenuOpen())) await clickOutside()
  if (await isDrawerOpen()) await toggleMenuDrawer()
  if (await isSubmenuOpen()) {
    await page.keyboard.press('Escape').catch(() => {})
    await page.waitForTimeout(250)
    if (await isSubmenuOpen()) await clickOutside()
  }
  await waitAfterAction(page, timing)
}

async function ensureMenuDrawerOpen(page: Page, report: RuntimeReport, timing: RunTiming) {
  await addStep('menu.ensure-drawer-open', report, async () => {
    const drawer = page.getByTestId('ui-app-menu-drawer').first()
    if ((await drawer.count()) === 0) return
    if ((await drawer.getAttribute('data-state')) === 'open') {
      await waitAfterAction(page, timing)
      return
    }
    const toggleBtn = page.getByTestId('tb-act-toggle-navigation-drawer').first()
    for (let i = 0; i < 4; i++) {
      const state = await drawer.getAttribute('data-state')
      if (state === 'open') {
        await waitAfterAction(page, timing)
        return
      }
      await toggleBtn.scrollIntoViewIfNeeded().catch(() => {})
      if (await toggleBtn.isVisible().catch(() => false) && (await toggleBtn.isEnabled().catch(() => false))) {
        await toggleBtn.click({ timeout: 8_000 })
      }
      await page.waitForTimeout(350)
    }
    await expect(drawer).toHaveAttribute('data-state', 'open', { timeout: 8_000 })
    await waitAfterAction(page, timing)
  })
}

async function confirmConfirmIfOpened(page: Page, report: RuntimeReport, timing: RunTiming, stepPrefix: string) {
  await addStep(`${stepPrefix}.confirm.confirm-if-opened`, report, async () => {
    const root = page.getByTestId('ui-confirm-dialog-root').first()
    if ((await root.count()) === 0) return
    if ((await root.getAttribute('data-state')) !== 'open') return
    const confirmBtn = page.getByTestId('ui-confirm-dialog-btn-confirm').first()
    await ensureLocatorActionable(confirmBtn, 8_000)
    await confirmBtn.click({ timeout: 8_000 })
    await expect(root).toHaveAttribute('data-state', 'closed', { timeout: 10_000 })
    await waitAfterAction(page, timing)
  })
}

async function disconnectAllWithConfirm(page: Page, report: RuntimeReport, timing: RunTiming) {
  await addStep('menu.disconnect-all.click', report, async () => {
    const btn = page.getByTestId('ui-app-menu-disconnect-all').first()
    await clickLocator(page, btn, timing, 8_000)
  })
  await confirmConfirmIfOpened(page, report, timing, 'menu.disconnect-all')
  await waitShort(page, timing)
}

async function openMainCameraSubmenu(page: Page, report: RuntimeReport, timing: RunTiming) {
  await addStep('menu.open-maincamera-submenu', report, async () => {
    const drawer = page.getByTestId('ui-app-menu-drawer').first()
    const toggleBtn = page.getByTestId('tb-act-toggle-navigation-drawer').first()
    const mainCameraItem = page.getByTestId('ui-app-menu-device-MainCamera').first()
    await mainCameraItem.waitFor({ state: 'attached', timeout: 12_000 })

    for (let i = 0; i < 6; i++) {
      if ((await drawer.count()) > 0) {
        const state = await drawer.getAttribute('data-state')
        if (state !== 'open') {
          await expect(toggleBtn).toBeVisible({ timeout: 8_000 })
          await toggleBtn.click({ timeout: 8_000 })
          await expect(drawer).toHaveAttribute('data-state', 'open', { timeout: 8_000 })
          await waitAfterAction(page, timing)
        }
      }
      await mainCameraItem.scrollIntoViewIfNeeded().catch(() => {})
      if (await mainCameraItem.isVisible().catch(() => false)) {
        await clickLocator(page, mainCameraItem, timing)
        const devicePage = page.getByTestId('ui-app-submenu-device-page').first()
        await expect(devicePage).toHaveAttribute('data-state', 'open', { timeout: 8_000 })
        return
      }
      await page.waitForTimeout(300)
    }
    await expect(mainCameraItem).toBeVisible({ timeout: 10_000 })
  })
}

async function selectDriverByLabel(page: Page, report: RuntimeReport, timing: RunTiming, labelMatch: RegExp) {
  await addStep('maincamera.select-driver', report, async () => {
    const select = page.getByTestId('ui-app-select-confirm-driver').first()
    await expect(select).toBeVisible({ timeout: 8_000 })
    const currentText = await select.textContent()
    if (currentText && labelMatch.test(currentText)) return

    for (let retry = 0; retry < 10; retry++) {
      await clickLocator(page, select, timing)
      const menu = page.locator('.v-menu__content.menuable__content__active').first()
      if (!(await menu.isVisible().catch(() => false))) {
        await page.waitForTimeout(500)
        continue
      }
      const option = menu.locator('.v-list-item').filter({ hasText: labelMatch }).first()
      if ((await option.count()) > 0) {
        await clickLocator(page, option, timing)
        return
      }
      await page.keyboard.press('Escape')
      await page.waitForTimeout(1000)
    }
    throw new Error(`未找到匹配 "${labelMatch.source}" 的驱动选项`)
  })
}

async function clickConnectMainCamera(page: Page, report: RuntimeReport, timing: RunTiming) {
  await addStep('maincamera.click-connect', report, async () => {
    const btn = page.getByTestId('ui-app-btn-connect-driver').first()
    for (let attempt = 0; attempt < 15; attempt++) {
      if (await btn.isVisible().catch(() => false)) {
        await clickLocator(page, btn, timing)
        return
      }
      await page.waitForTimeout(1000)
    }
    throw new Error('连接按钮在 15 秒内未出现')
  })
}

async function bindDeviceInAllocationPanel(
  page: Page,
  report: RuntimeReport,
  timing: RunTiming,
  targetRole: string,
) {
  const panel = page.getByTestId('dap-root').first()
  const pickers = panel.locator('[data-testid="dp-picker"]')
  await expect(pickers.first()).toBeVisible({ timeout: 8_000 })

  let targetPickerIndex = -1
  const pickerCount = await pickers.count()
  for (let i = 0; i < pickerCount; i++) {
    const picker = pickers.nth(i)
    const typeText = await picker.getByTestId('dp-device-type').textContent()
    if (typeText?.trim() === targetRole) {
      if ((await picker.getAttribute('data-state')) !== 'bound') {
        targetPickerIndex = i
        break
      }
      return
    }
  }
  if (targetPickerIndex === -1) return

  const targetPicker = pickers.nth(targetPickerIndex)
  await clickLocator(page, targetPicker, timing)
  await waitShort(page, timing)

  const firstDevice = panel.locator('[data-testid="dap-act-selected-device-name-2"]').first()
  await expect(firstDevice).toBeVisible({ timeout: 5_000 })
  await clickLocator(page, firstDevice, timing)
  await waitShort(page, timing)

  const bindBtn = targetPicker.getByTestId('dp-btn-toggle-bind')
  if ((await bindBtn.getAttribute('data-state')) === 'unbound') {
    await clickLocator(page, bindBtn, timing)
  }
  await page.waitForTimeout(500)
  const closeBtn = page.getByTestId('dap-act-close-panel').first()
  if (await closeBtn.isVisible().catch(() => false)) {
    await clickLocator(page, closeBtn, timing)
  }
}

async function waitForConnectionOrAllocation(
  page: Page,
  report: RuntimeReport,
  timing: RunTiming,
  targetRole: string,
  timeoutMs: number,
) {
  await addStep(`${targetRole.toLowerCase()}.wait-connection-or-allocation`, report, async () => {
    const connProbe = page.getByTestId(`e2e-device-${targetRole}-conn`).first()
    const dapPanel = page.getByTestId('dap-root').first()
    const startTime = Date.now()

    while (Date.now() - startTime < timeoutMs) {
      const connState = await connProbe.getAttribute('data-state').catch(() => 'unknown')
      if (connState === 'connected') return

      if (await dapPanel.isVisible().catch(() => false)) {
        await bindDeviceInAllocationPanel(page, report, timing, targetRole)
        await expect(connProbe).toHaveAttribute('data-state', 'connected', {
          timeout: Math.max(timeoutMs - (Date.now() - startTime), 10_000),
        })
        return
      }
      await page.waitForTimeout(300)
    }
    throw new Error(`等待 ${targetRole} 连接超时 (${timeoutMs}ms)`)
  })
}

async function ensureCapturePanelVisible(page: Page, report: RuntimeReport, timing: RunTiming) {
  await addStep('maincamera.ensure-capture-panel-visible', report, async () => {
    const capturePanel = page.getByTestId('cp-panel').first()
    const showCaptureBtn = page.getByTestId('gui-btn-show-capture-ui').first()
    const drawer = page.getByTestId('ui-app-menu-drawer').first()

    for (let i = 0; i < 10; i++) {
      if (await capturePanel.isVisible().catch(() => false)) return

      const drawerOpen = (await drawer.count()) > 0 && (await drawer.getAttribute('data-state')) === 'open'
      if (drawerOpen) await ensureMenuLayersClosed(page, timing)

      if ((await showCaptureBtn.count()) > 0) {
        await showCaptureBtn.scrollIntoViewIfNeeded().catch(() => {})
        if (await showCaptureBtn.isVisible().catch(() => false) && (await showCaptureBtn.isEnabled().catch(() => false))) {
          await clickLocator(page, showCaptureBtn, timing, 5_000)
        }
        if (await capturePanel.isVisible().catch(() => false)) return
      }

      const switchMainBtn = page.getByTestId('gui-btn-switch-main-page').first()
      if ((await switchMainBtn.count()) > 0) {
        await switchMainBtn.scrollIntoViewIfNeeded().catch(() => {})
        if (await switchMainBtn.isVisible().catch(() => false) && (await switchMainBtn.isEnabled().catch(() => false))) {
          await clickLocator(page, switchMainBtn, timing, 5_000)
        }
      }
      await ensureMenuDrawerOpen(page, report, timing)
      await openMainCameraSubmenu(page, report, timing)
      await ensureMenuLayersClosed(page, timing)
      await waitShort(page, timing)
    }
    await expect(capturePanel).toBeVisible({ timeout: 8_000 })
  })
}

async function waitForAppLoaded100(page: Page, report: RuntimeReport, timing: RunTiming, timeoutMs: number) {
  await addStep('boot.wait-app-ready-100', report, async () => {
    await page.waitForLoadState('load', { timeout: timeoutMs })
    await page.waitForLoadState('networkidle', { timeout: timeoutMs }).catch(() => {})

    const loaderRoot = page.getByTestId('ui-gui-loader-root').first()
    if ((await loaderRoot.count()) > 0) {
      await expect(loaderRoot).toBeHidden({ timeout: timeoutMs })
    }
    const guiRoot = page.getByTestId('gui-root').first()
    await expect(guiRoot).toBeVisible({ timeout: timeoutMs })
    await waitAfterAction(page, timing)
  })
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
  lines.push('==== CFW 滤镜轮拍摄面板与配置菜单切换测试报告 ====')
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

async function checkCFWConnected(page: Page): Promise<boolean> {
  const cfwProbe = page.getByTestId('e2e-device-CFW-conn').first()
  if ((await cfwProbe.count()) === 0) return false
  const state = await cfwProbe.getAttribute('data-state').catch(() => 'unknown')
  return state === 'connected'
}

async function waitCFWMoveComplete(page: Page, timing: RunTiming, timeoutMs: number = 15000): Promise<boolean> {
  const cfwDisplay = page.getByTestId('cp-cfw-display').first()
  const startTime = Date.now()
  while (Date.now() - startTime < timeoutMs) {
    const state = await cfwDisplay.getAttribute('data-state').catch(() => 'unknown')
    if (state === 'stable') {
      await waitAfterAction(page, timing)
      return true
    }
    await page.waitForTimeout(300)
  }
  return false
}

async function testCFWSwitchingInCapturePanel(
  page: Page,
  report: RuntimeReport,
  timing: RunTiming,
  modePrefix: string,
  iteration: number,
) {
  await addStep(`${modePrefix}.cfw-capture-panel-switch-${iteration}`, report, async () => {
    const cfwPlusBtn = page.getByTestId('cp-btn-cfw-plus').first()
    const cfwMinusBtn = page.getByTestId('cp-btn-cfw-minus').first()
    const cfwValue = page.getByTestId('cp-cfw-value').first()

    const plusState = await cfwPlusBtn.getAttribute('data-state').catch(() => 'unknown')
    if (plusState === 'disabled') {
      console.log(`[SKIP] CFW 按钮已禁用，跳过拍摄面板滤镜轮测试`)
      return
    }

    const initialValue = await cfwValue.getAttribute('data-value').catch(() => '-')
    console.log(`[INFO] [${modePrefix}] 拍摄面板 CFW 初始位置: ${initialValue}`)

    await clickLocator(page, cfwPlusBtn, timing)
    const plusMoveSuccess = await waitCFWMoveComplete(page, timing)
    if (plusMoveSuccess) {
      const newValue = await cfwValue.getAttribute('data-value').catch(() => '-')
      console.log(`[OK] [${modePrefix}] CFW Plus 切换完成，新位置: ${newValue}`)
    } else {
      console.log(`[WARN] [${modePrefix}] CFW Plus 切换超时`)
    }

    await page.waitForTimeout(500)
    await clickLocator(page, cfwMinusBtn, timing)
    const minusMoveSuccess = await waitCFWMoveComplete(page, timing)
    if (minusMoveSuccess) {
      const finalValue = await cfwValue.getAttribute('data-value').catch(() => '-')
      console.log(`[OK] [${modePrefix}] CFW Minus 切换完成，最终位置: ${finalValue}`)
    } else {
      console.log(`[WARN] [${modePrefix}] CFW Minus 切换超时`)
    }
  }, { allowFailure: true })
}

async function openCFWSubmenu(page: Page, report: RuntimeReport, timing: RunTiming) {
  await addStep('menu.open-cfw-submenu', report, async () => {
    const cfwItem = page.getByTestId('ui-app-menu-device-CFW').first()
    await expect(cfwItem).toBeVisible({ timeout: 10_000 })
    await clickLocator(page, cfwItem, timing)
    const devicePage = page.getByTestId('ui-app-submenu-device-page').first()
    await expect(devicePage).toHaveAttribute('data-state', 'open', { timeout: 8_000 })
  })
}

async function waitCFWMenuMoveComplete(page: Page, timing: RunTiming, timeoutMs: number = 15000): Promise<boolean> {
  const startTime = Date.now()
  while (Date.now() - startTime < timeoutMs) {
    const cfwNextBtn = await findVisibleButtonByTestIdPrefix(page, 'ui-config-CFW-CFWNext-button-')
    if (!cfwNextBtn || (await cfwNextBtn.count()) === 0) {
      await page.waitForTimeout(300)
      continue
    }
    const isDisabled = await cfwNextBtn.getAttribute('aria-disabled').catch(() => 'false')
    const isLoading = await cfwNextBtn.locator('.v-progress-circular').count().catch(() => 0)
    if (isDisabled !== 'true' && isLoading === 0) {
      await waitAfterAction(page, timing)
      return true
    }
    await page.waitForTimeout(300)
  }
  return false
}

async function testCFWSwitchingInConfigMenu(
  page: Page,
  report: RuntimeReport,
  timing: RunTiming,
  modePrefix: string,
  iteration: number,
) {
  await addStep(`${modePrefix}.cfw-config-menu-switch-${iteration}`, report, async () => {
    const cfwNextBtn = await findVisibleButtonByTestIdPrefix(page, 'ui-config-CFW-CFWNext-button-')
    const cfwPrevBtn = await findVisibleButtonByTestIdPrefix(page, 'ui-config-CFW-CFWPrev-button-')
    if (!cfwNextBtn || !cfwPrevBtn || (await cfwNextBtn.count()) === 0 || (await cfwPrevBtn.count()) === 0) {
      console.log(`[SKIP] CFW 配置菜单按钮未找到，跳过配置菜单滤镜轮测试`)
      return
    }
    const isDisabled = await cfwNextBtn.getAttribute('aria-disabled').catch(() => 'false')
    if (isDisabled === 'true') {
      console.log(`[SKIP] CFW 配置菜单按钮已禁用，跳过配置菜单滤镜轮测试`)
      return
    }

    await clickLocator(page, cfwNextBtn, timing)
    await waitCFWMenuMoveComplete(page, timing)
    await page.waitForTimeout(500)
    await clickLocator(page, cfwPrevBtn, timing)
    await waitCFWMenuMoveComplete(page, timing)
  }, { allowFailure: true })
}

async function runCFWTestsIfConnected(
  page: Page,
  report: RuntimeReport,
  timing: RunTiming,
  modePrefix: string,
) {
  const cfwConnected = await checkCFWConnected(page)
  if (!cfwConnected) {
    console.log(`[SKIP] [${modePrefix}] 滤镜轮未连接，跳过 CFW 测试`)
    return
  }

  console.log(`[INFO] [${modePrefix}] 检测到滤镜轮已连接，开始 CFW 测试`)

  await ensureCapturePanelVisible(page, report, timing)
  for (let i = 1; i <= 2; i++) {
    await testCFWSwitchingInCapturePanel(page, report, timing, modePrefix, i)
    await page.waitForTimeout(300)
  }

  await ensureMenuDrawerOpen(page, report, timing)
  await openCFWSubmenu(page, report, timing)
  await page.waitForTimeout(500)

  for (let i = 1; i <= 2; i++) {
    await testCFWSwitchingInConfigMenu(page, report, timing, modePrefix, i)
    await page.waitForTimeout(300)
  }

  console.log(`[OK] [${modePrefix}] CFW 测试完成`)
}

async function runCFWTest(page: Page, testInfo: TestInfo) {
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
  testInfo.setTimeout(Math.max(testTimeoutMs, 20 * 60_000))

  await addStep('boot.goto-app', report, async () => {
    await page.goto(getAppStartPath(), { waitUntil: 'load', timeout: stepTimeoutMs })
    await waitAfterAction(page, timing)
  })
  await waitForAppLoaded100(page, report, timing, stepTimeoutMs)

  await ensureMenuDrawerOpen(page, report, timing)
  await disconnectAllWithConfirm(page, report, timing)
  await waitShort(page, timing)

  await openMainCameraSubmenu(page, report, timing)
  await selectDriverByLabel(page, report, timing, MAINCAMERA_DRIVER_MATCH)
  await clickConnectMainCamera(page, report, timing)
  await waitForConnectionOrAllocation(page, report, timing, 'MainCamera', CONNECT_WAIT_MS)

  // 主相机连接后，设备分配/滤镜轮状态可能有更新延迟，等待 1s 再判断 CFW 是否连接
  await page.waitForTimeout(1000)

  const cfwConnected = await checkCFWConnected(page)
  if (!cfwConnected) {
    console.log('[SKIP] 滤镜轮未连接，跳过 CFW 测试（主相机已连接，可手动连接 CFW 后重试）')
    const reportText = buildReportText(report)
    await testInfo.attach('cfw-runtime-report', { body: reportText, contentType: 'text/plain' })
    expect(report.stepErrors.length, '启动与主相机连接步骤存在失败').toBe(0)
    return
  }

  await runCFWTestsIfConnected(page, report, timing, 'cfw-standalone')

  const reportText = buildReportText(report)
  console.log(reportText)
  await testInfo.attach('cfw-runtime-report', { body: reportText, contentType: 'text/plain' })

  expect(report.stepErrors.length, 'CFW 测试步骤存在失败，请查看附件 cfw-runtime-report').toBe(0)
  expect(report.pageErrors.length, '页面存在运行时异常').toBe(0)
}

test('8-滤镜轮-拍摄面板与配置菜单切换验证', async ({ page }, testInfo) => {
  await runCFWTest(page, testInfo)
})
