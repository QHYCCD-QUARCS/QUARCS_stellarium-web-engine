/**
 * 电调（Focuser）E2E 测试：连接 + 控制面板 + 速度切换 + 左右短按/长按位置变化
 *
 * 关键约束：
 * - 严禁使用 force 交互。
 * - 所有交互前执行可操作性检查（visible/enabled/scroll/trial click）。
 * - 自动校准与 ROI 循环拍摄仅做可操作性检查，不触发实际功能。
 * - 定位以全局唯一的 data-testid 为准；testid 与源码、触发方式以
 *   docs/testid-scan-report.md 与 docs/testid-validation-report.md 为核对依据。
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
  positionLogs: string[]
}

type RunTiming = {
  actionDelayMs: number
  shortDelayMs: number
}

type StepSync = {
  page: Page
  timing: RunTiming
  settleTimeoutMs?: number
}

const FOCUSER_CONNECT_WAIT_MS = 60_000
const POSITION_SETTLE_TIMEOUT_MS = 12_000
const LONG_PRESS_MS = 1_000
const FOCUSER_DRIVER_MATCH = /focuser|qhy|zwo|indi/i

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
  lines.push('==== Focuser 连接与控制位置变化测试报告 ====')
  lines.push(`stepErrors: ${report.stepErrors.length}`)
  for (const e of report.stepErrors) lines.push(`- [STEP] ${e.step} :: ${e.message}`)
  lines.push(`pageErrors: ${report.pageErrors.length}`)
  for (const e of report.pageErrors) lines.push(`- [PAGE] ${e}`)
  lines.push(`consoleErrors: ${report.consoleErrors.length}`)
  for (const e of report.consoleErrors) lines.push(`- [CONSOLE] ${e}`)
  lines.push(`requestFailed: ${report.requestFailed.length}`)
  for (const e of report.requestFailed) lines.push(`- [REQUEST] ${e}`)
  lines.push(`positionLogs: ${report.positionLogs.length}`)
  for (const l of report.positionLogs) lines.push(`- [POS] ${l}`)
  return lines.join('\n')
}

async function addStep(
  name: string,
  report: RuntimeReport,
  fn: () => Promise<void>,
  options?: { allowFailure?: boolean; sync?: StepSync },
) {
  try {
    if (options?.sync) {
      await waitForStepSettled(options.sync.page, options.sync.timing, options.sync.settleTimeoutMs)
    }
    await fn()
    if (options?.sync) {
      await waitForStepSettled(options.sync.page, options.sync.timing, options.sync.settleTimeoutMs)
    }
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

async function waitForStepSettled(page: Page, timing: RunTiming, settleTimeoutMs: number = 3_000) {
  await page.waitForLoadState('domcontentloaded', { timeout: settleTimeoutMs }).catch(() => {})
  await page.waitForLoadState('load', { timeout: settleTimeoutMs }).catch(() => {})
  await page.waitForLoadState('networkidle', { timeout: settleTimeoutMs }).catch(() => {})
  await waitAfterAction(page, timing)
}

async function ensureLocatorActionable(loc: Locator, timeoutMs: number = 8_000) {
  await expect(loc).toBeVisible({ timeout: timeoutMs })
  await expect(loc).toBeEnabled({ timeout: timeoutMs })
  await loc.scrollIntoViewIfNeeded().catch(() => {})
  await loc.click({ timeout: timeoutMs, trial: true })
}

async function clickLocator(page: Page, loc: Locator, timing: RunTiming, timeoutMs: number = 8_000) {
  await ensureLocatorActionable(loc, timeoutMs)
  await loc.click({ timeout: timeoutMs })
  await waitAfterAction(page, timing)
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
  }, { sync: { page, timing, settleTimeoutMs: timeoutMs } })
}

async function ensureMenuDrawerOpen(page: Page, report: RuntimeReport, timing: RunTiming) {
  await addStep('menu.ensure-drawer-open', report, async () => {
    const drawer = page.getByTestId('ui-app-menu-drawer').first()
    if ((await drawer.count()) === 0) return
    if ((await drawer.getAttribute('data-state')) === 'open') return
    const toggleBtn = page.getByTestId('tb-act-toggle-navigation-drawer').first()
    await clickLocator(page, toggleBtn, timing, 10_000)
    await expect(drawer).toHaveAttribute('data-state', 'open', { timeout: 10_000 })
  }, { sync: { page, timing } })
}

/**
 * 点击可见的遮罩层一次以关闭浮层（仅当可操作时点击，禁止 force）。
 * 遮罩为 Vuetify .v-overlay__scrim，无 data-testid；若不可点击则跳过，由调用方 Escape 兜底。
 */
async function clickVisibleOverlayScrimOnce(page: Page): Promise<boolean> {
  const scrims = page.locator('.v-overlay__scrim')
  const count = await scrims.count()
  for (let i = count - 1; i >= 0; i--) {
    const scrim = scrims.nth(i)
    const visible = await scrim.isVisible().catch(() => false)
    if (!visible) continue
    await scrim.scrollIntoViewIfNeeded().catch(() => {})
    try {
      await scrim.click({ timeout: 1_500 })
      return true
    } catch {
      return false
    }
  }
  return false
}

async function closeMenuAndSubmenu(page: Page, report: RuntimeReport, timing: RunTiming) {
  await addStep('menu.ensure-closed', report, async () => {
    const menuDrawer = page.getByTestId('ui-app-menu-drawer').first()
    const subDrawer = page.getByTestId('ui-app-submenu-drawer').first()

    for (let i = 0; i < 5; i++) {
      const menuOpen = (await menuDrawer.count()) > 0 && (await menuDrawer.getAttribute('data-state')) === 'open'
      const subOpen = (await subDrawer.count()) > 0 && (await subDrawer.getAttribute('data-state')) === 'open'
      if (!menuOpen && !subOpen) return

      await page.keyboard.press('Escape').catch(() => {})
      await page.waitForTimeout(220)
      if (menuOpen || subOpen) {
        const clicked = await clickVisibleOverlayScrimOnce(page)
        if (clicked) await page.waitForTimeout(220)
      }
    }

    if ((await menuDrawer.getAttribute('data-state').catch(() => '')) === 'open') {
      await page.keyboard.press('Escape').catch(() => {})
      await page.waitForTimeout(220)
    }

    if ((await menuDrawer.count()) > 0) {
      await expect(menuDrawer).toHaveAttribute('data-state', 'closed', { timeout: 8_000 })
    }
    if ((await subDrawer.count()) > 0) {
      await expect(subDrawer).toHaveAttribute('data-state', 'closed', { timeout: 8_000 })
    }
  }, { sync: { page, timing } })
}

async function confirmConfirmIfOpened(page: Page, report: RuntimeReport, timing: RunTiming, stepPrefix: string) {
  await addStep(`${stepPrefix}.confirm-if-opened`, report, async () => {
    const root = page.getByTestId('ui-confirm-dialog-root').first()
    if ((await root.count()) === 0) return
    if ((await root.getAttribute('data-state')) !== 'open') return
    const confirmBtn = page.getByTestId('ui-confirm-dialog-btn-confirm').first()
    await clickLocator(page, confirmBtn, timing)
    await expect(root).toHaveAttribute('data-state', 'closed', { timeout: 8_000 })
  }, { sync: { page, timing } })
}

async function disconnectAllWithConfirm(page: Page, report: RuntimeReport, timing: RunTiming) {
  await addStep('menu.disconnect-all.click', report, async () => {
    const btn = page.getByTestId('ui-app-menu-disconnect-all').first()
    await clickLocator(page, btn, timing)
  }, { sync: { page, timing } })
  await confirmConfirmIfOpened(page, report, timing, 'menu.disconnect-all')
  await waitShort(page, timing)
}

async function openFocuserSubmenu(page: Page, report: RuntimeReport, timing: RunTiming) {
  await addStep('menu.open-focuser-submenu', report, async () => {
    const drawer = page.getByTestId('ui-app-menu-drawer').first()
    const focuserItem = page.getByTestId('ui-app-menu-device-Focuser').first()
    const devicePage = page.getByTestId('ui-app-submenu-device-page').first()

    for (let i = 0; i < 6; i++) {
      await ensureMenuDrawerOpen(page, report, timing)
      // 仅调整抽屉内部滚动位置以使菜单项进入视口，非点击类交互
      await drawer
        .evaluate((el) => {
          ;(el as HTMLElement).scrollTop = 0
        })
        .catch(() => {})
      await focuserItem.scrollIntoViewIfNeeded().catch(() => {})
      if (await focuserItem.isVisible().catch(() => false)) {
        await clickLocator(page, focuserItem, timing)
        await expect(devicePage).toHaveAttribute('data-state', 'open', { timeout: 8_000 })
        return
      }
      await drawer
        .evaluate((el) => {
          ;(el as HTMLElement).scrollTop = (el as HTMLElement).scrollHeight
        })
        .catch(() => {})
      await waitShort(page, timing)
    }

    throw new Error('未找到 Focuser 菜单项（ui-app-menu-device-Focuser）')
  }, { sync: { page, timing } })
}

async function selectFocuserDriver(page: Page, report: RuntimeReport, timing: RunTiming, labelMatch: RegExp) {
  await addStep('focuser.select-driver', report, async () => {
    const select = page.getByTestId('ui-app-select-confirm-driver').first()
    await ensureLocatorActionable(select, 8_000)

    const currentText = (await select.textContent())?.trim() ?? ''
    if (currentText && labelMatch.test(currentText)) return

    for (let retry = 0; retry < 10; retry++) {
      await clickLocator(page, select, timing)
      await page.waitForTimeout(300)

      const options = page.locator('[data-testid^="ui-app-select-confirm-driver-option-"]')
      const count = await options.count()
      if (count === 0) {
        await page.keyboard.press('Escape').catch(() => {})
        await page.waitForTimeout(600)
        continue
      }

      let chosen: Locator | null = null
      for (let i = 0; i < count; i++) {
        const opt = options.nth(i)
        const text = ((await opt.textContent().catch(() => '')) || '').trim()
        if (!text || /No data available/i.test(text)) continue
        if (labelMatch.test(text)) {
          chosen = opt
          break
        }
        if (!chosen) chosen = opt
      }

      if (!chosen) {
        await page.keyboard.press('Escape').catch(() => {})
        await page.waitForTimeout(800)
        continue
      }

      await clickLocator(page, chosen, timing)
      return
    }

    throw new Error(`未找到可用 Focuser 驱动（匹配 ${labelMatch.source}）`)
  }, { sync: { page, timing } })
}

async function clickConnectFocuser(page: Page, report: RuntimeReport, timing: RunTiming) {
  await addStep('focuser.click-connect', report, async () => {
    const btn = page.getByTestId('ui-app-btn-connect-driver').first()
    for (let i = 0; i < 15; i++) {
      if (await btn.isVisible().catch(() => false)) {
        await clickLocator(page, btn, timing)
        return
      }
      await page.waitForTimeout(1_000)
    }
    throw new Error('连接按钮在 15 秒内未出现')
  }, { sync: { page, timing } })
}

async function bindDeviceInAllocationPanel(
  page: Page,
  report: RuntimeReport,
  timing: RunTiming,
  targetRole: string,
) {
  await addStep(`${targetRole.toLowerCase()}.bind-in-allocation`, report, async () => {
    const panel = page.getByTestId('dap-root').first()
    const pickers = panel.getByTestId('dp-picker')
    await expect(pickers.first()).toBeVisible({ timeout: 10_000 })

    const count = await pickers.count()
    let targetPicker: Locator | null = null
    for (let i = 0; i < count; i++) {
      const picker = pickers.nth(i)
      const typeText = ((await picker.getByTestId('dp-device-type').textContent().catch(() => '')) || '').trim()
      if (typeText === targetRole) {
        targetPicker = picker
        break
      }
    }
    if (!targetPicker) throw new Error(`设备分配面板中未找到角色：${targetRole}`)

    await clickLocator(page, targetPicker, timing)
    const firstDevice = panel.getByTestId('dap-act-selected-device-name-2').first()
    await clickLocator(page, firstDevice, timing)

    const bindBtn = targetPicker.getByTestId('dp-btn-toggle-bind')
    const bindState = (await bindBtn.getAttribute('data-state').catch(() => '')) ?? ''
    if (bindState === 'unbound') {
      await clickLocator(page, bindBtn, timing)
    }

    const closeBtn = panel.getByTestId('dap-act-close-panel').first()
    if (await closeBtn.isVisible().catch(() => false)) {
      await clickLocator(page, closeBtn, timing)
    }
  }, { sync: { page, timing } })
}

async function waitForFocuserConnectionOrAllocation(
  page: Page,
  report: RuntimeReport,
  timing: RunTiming,
  timeoutMs: number,
) {
  await addStep('focuser.wait-connection-or-allocation', report, async () => {
    const connProbe = page.getByTestId('e2e-device-Focuser-conn').first()
    const menuStateProbe = page.getByTestId('ui-app-menu-device-Focuser').first()
    const dapPanel = page.getByTestId('dap-root').first()
    const disconnectBtn = page.getByTestId('ui-app-btn-disconnect-driver').first()
    const start = Date.now()

    while (Date.now() - start < timeoutMs) {
      const connState = (await connProbe.getAttribute('data-state').catch(() => '')) ?? ''
      if (connState === 'connected') return

      const menuState = (await menuStateProbe.getAttribute('data-state').catch(() => '')) ?? ''
      if (menuState === 'connected') return

      const disconnectVisible = await disconnectBtn.isVisible().catch(() => false)
      if (disconnectVisible) return

      if (await dapPanel.isVisible().catch(() => false)) {
        await bindDeviceInAllocationPanel(page, report, timing, 'Focuser')
      }

      await page.waitForTimeout(350)
    }

    throw new Error(`等待 Focuser 连接超时 (${timeoutMs}ms)`)
  }, { sync: { page, timing, settleTimeoutMs: timeoutMs } })
}

async function ensureCapturePanelVisible(page: Page, report: RuntimeReport, timing: RunTiming) {
  await addStep('capture.ensure-panel-visible', report, async () => {
    const capturePanel = page.getByTestId('cp-panel').first()
    if (await capturePanel.isVisible().catch(() => false)) return

    const showCaptureBtn = page.getByTestId('gui-btn-show-capture-ui').first()
    const switchMainBtn = page.getByTestId('gui-btn-switch-main-page').first()

    for (let i = 0; i < 8; i++) {
      if (await capturePanel.isVisible().catch(() => false)) return
      await closeMenuAndSubmenu(page, report, timing)
      if ((await showCaptureBtn.count()) > 0 && (await showCaptureBtn.isVisible().catch(() => false))) {
        await clickLocator(page, showCaptureBtn, timing, 8_000)
      }
      if ((await switchMainBtn.count()) > 0 && (await switchMainBtn.isVisible().catch(() => false))) {
        await clickLocator(page, switchMainBtn, timing, 8_000)
      }
      await page.waitForTimeout(300)
    }

    await expect(capturePanel).toBeVisible({ timeout: 10_000 })
  }, { sync: { page, timing } })
}

async function ensureFocuserPanelVisible(page: Page, report: RuntimeReport, timing: RunTiming) {
  await addStep('focuser.ensure-panel-visible', report, async () => {
    const root = page.getByTestId('fp-root').first()
    if (await root.isVisible().catch(() => false)) return

    const btn = page.getByTestId('cp-btn-toggle-focuser').first()
    await clickLocator(page, btn, timing)
    await expect(root).toBeVisible({ timeout: 10_000 })
  }, { sync: { page, timing } })
}

function parseCurrentPosition(raw: string): number {
  const m = raw.replace(/\s+/g, '').match(/Current:([-+]?\d+)/i)
  if (!m) throw new Error(`无法解析 Current 文本: ${raw}`)
  return parseInt(m[1], 10)
}

async function readCurrentPosition(page: Page): Promise<number> {
  const byTestId = page.getByTestId('fp-state-current').first()
  if ((await byTestId.count()) > 0) {
    await expect(byTestId).toBeVisible({ timeout: 8_000 })
    const text = (await byTestId.textContent()) ?? ''
    return parseCurrentPosition(text)
  }

  // 兼容旧页面构建：若尚未包含 fp-state-current，则回退到 fp-root 内固定位置节点读取。
  const fallback = page.getByTestId('fp-act-state-bar').locator('> div').first()
  await expect(fallback).toBeVisible({ timeout: 8_000 })
  const text = (await fallback.textContent()) ?? ''
  return parseCurrentPosition(text)
}

async function waitPositionChanged(
  page: Page,
  before: number,
  timeoutMs: number = POSITION_SETTLE_TIMEOUT_MS,
): Promise<number> {
  const start = Date.now()
  let last = before
  while (Date.now() - start < timeoutMs) {
    const cur = await readCurrentPosition(page)
    last = cur
    if (cur !== before) return cur
    await page.waitForTimeout(250)
  }
  return last
}

async function pressAndRelease(page: Page, loc: Locator, holdMs: number) {
  await ensureLocatorActionable(loc, 8_000)
  const box = await loc.boundingBox()
  if (!box) throw new Error('目标按钮无可点击区域（boundingBox 为空）')
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.waitForTimeout(holdMs)
  await page.mouse.up()
}

/** 短按时长（与 FocuserPanel 中 FocusAbort 的 pressDuration < 200 语义一致，触发单步移动） */
const SHORT_PRESS_MS = 100

async function runMoveActionAndRecord(
  page: Page,
  report: RuntimeReport,
  timing: RunTiming,
  actionName: string,
  buttonTestId: string,
  mode: 'click' | 'hold',
  holdMs: number = LONG_PRESS_MS,
) {
  await addStep(`focuser.move.${actionName}`, report, async () => {
    const btn = page.getByTestId(buttonTestId).first()
    const before = await readCurrentPosition(page)
    await ensureLocatorActionable(btn, 8_000)
    // FocuserPanel 左右键为 @mousedown/@mouseup，非 @click；短按用 pressAndRelease(<200ms)，长按用 pressAndRelease(≥200ms)
    if (mode === 'click') {
      await pressAndRelease(page, btn, SHORT_PRESS_MS)
    } else {
      await pressAndRelease(page, btn, holdMs)
    }
    await waitAfterAction(page, timing)

    const after = await waitPositionChanged(page, before)
    const delta = after - before
    report.positionLogs.push(`${actionName}: before=${before}, after=${after}, delta=${delta}, mode=${mode}`)
    if (delta === 0) {
      throw new Error(`${actionName} 后位置未变化（before=${before}, after=${after}）`)
    }
  }, { sync: { page, timing } })
}

async function validateSkippedButtonsActionable(page: Page, report: RuntimeReport, timing: RunTiming) {
  await addStep('focuser.skip-buttons.actionable-check', report, async () => {
    const calibrationBtn = page.getByTestId('fp-btn-start-calibration').first()
    const loopBtn = page.getByTestId('fp-btn-toggle-loop-shooting').first()
    await ensureLocatorActionable(calibrationBtn, 8_000)
    await ensureLocatorActionable(loopBtn, 8_000)
    report.positionLogs.push('skip: fp-btn-start-calibration (仅检查可操作性，未触发)')
    report.positionLogs.push('skip: fp-btn-toggle-loop-shooting (仅检查可操作性，未触发)')
  }, { sync: { page, timing } })
}

async function runFocuserConnectControlTest(page: Page, testInfo: TestInfo) {
  const report: RuntimeReport = {
    stepErrors: [],
    pageErrors: [],
    consoleErrors: [],
    requestFailed: [],
    positionLogs: [],
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
  testInfo.setTimeout(Math.max(testTimeoutMs, 12 * 60_000))

  await addStep('boot.goto-app', report, async () => {
    await page.goto(getAppStartPath(), { waitUntil: 'load', timeout: stepTimeoutMs })
    await waitAfterAction(page, timing)
  }, { sync: { page, timing, settleTimeoutMs: stepTimeoutMs } })

  await waitForAppLoaded100(page, report, timing, stepTimeoutMs)
  await ensureMenuDrawerOpen(page, report, timing)
  await disconnectAllWithConfirm(page, report, timing)
  await ensureMenuDrawerOpen(page, report, timing)

  await openFocuserSubmenu(page, report, timing)
  await selectFocuserDriver(page, report, timing, FOCUSER_DRIVER_MATCH)
  await clickConnectFocuser(page, report, timing)
  await waitForFocuserConnectionOrAllocation(page, report, timing, FOCUSER_CONNECT_WAIT_MS)

  await closeMenuAndSubmenu(page, report, timing)
  await ensureCapturePanelVisible(page, report, timing)
  await ensureFocuserPanelVisible(page, report, timing)
  await validateSkippedButtonsActionable(page, report, timing)

  await addStep('focuser.read-baseline-current', report, async () => {
    const baseline = await readCurrentPosition(page)
    report.positionLogs.push(`baseline: current=${baseline}`)
  }, { sync: { page, timing } })

  await runMoveActionAndRecord(page, report, timing, 'left-short-click', 'fp-btn-focus-move', 'click')
  await runMoveActionAndRecord(page, report, timing, 'right-short-click', 'fp-btn-focus-move-2', 'click')
  await runMoveActionAndRecord(page, report, timing, 'left-hold-1s', 'fp-btn-focus-move', 'hold', LONG_PRESS_MS)
  await runMoveActionAndRecord(page, report, timing, 'right-hold-1s', 'fp-btn-focus-move-2', 'hold', LONG_PRESS_MS)

  await addStep('focuser.speed-change', report, async () => {
    const speedBtn = page.getByTestId('fp-btn-speed-change-2').first()
    await clickLocator(page, speedBtn, timing)
    report.positionLogs.push('speed: clicked fp-btn-speed-change-2 once')
  }, { sync: { page, timing } })

  await runMoveActionAndRecord(page, report, timing, 'left-hold-1s-after-speed-change', 'fp-btn-focus-move', 'hold', LONG_PRESS_MS)
  await runMoveActionAndRecord(page, report, timing, 'right-hold-1s-after-speed-change', 'fp-btn-focus-move-2', 'hold', LONG_PRESS_MS)

  const reportText = buildReportText(report)
  console.log(reportText)
  await testInfo.attach('focuser-connect-control-position-runtime-report', {
    body: reportText,
    contentType: 'text/plain',
  })

  expect(
    report.stepErrors.length,
    '电调连接与控制步骤存在失败，请查看附件 focuser-connect-control-position-runtime-report',
  ).toBe(0)
  expect(
    report.pageErrors.length,
    '页面存在运行时异常，请查看附件 focuser-connect-control-position-runtime-report',
  ).toBe(0)
}

test('7-电调-连接控制与位置变化记录', async ({ page }, testInfo) => {
  await runFocuserConnectControlTest(page, testInfo)
})

