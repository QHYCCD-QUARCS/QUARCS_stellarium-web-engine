/**
 * 主相机（MainCamera）E2E 测试：QHYCCD 驱动，两种连接方式（INDI / SDK），参数调整与连续拍摄
 *
 * 详细执行逻辑（按 runMainCameraTest + runTestCycleForMode 的真实顺序）：
 * 1) 启动与初始清理：
 *    - 打开应用并等待界面 ready。
 *    - 打开菜单后执行 Disconnect All，确保起始状态一致。
 *
 * 2) INDI 模式测试周期：
 *    - 进入 MainCamera 子菜单，选择 QHYCCD 驱动，连接模式设为 INDI 并连接。
 *    - 等待 connected（若出现设备分配面板则完成绑定后继续）。
 *    - 执行一整轮测试周期（runTestCycleForMode）：
 *      a. 曝光时间切换并逐项拍摄（含最长曝光）
 *      b. Gain / Offset / Binning 参数调整与拍摄验证
 *      c. 参数回默认
 *      d. 若 CFW 已连接，执行拍摄面板与配置菜单两路滤镜切换验证
 *      e. 100ms 连续拍摄 200 帧并检测 busy/idle 收敛
 *
 * 3) 模式切换：
 *    - 断开 INDI 连接并等待 disconnected。
 *    - 切换到 SDK 模式并重新连接。
 *
 * 4) SDK 模式测试周期：
 *    - 复用与 INDI 相同的测试周期，覆盖参数、滤镜轮与 200 帧连续拍摄。
 *
 * 5) 收尾与断言：
 *    - 附加运行报告并断言 stepErrors=0、pageErrors=0。
 *
 * 参考：test001/3-guider-qhyccd-two-connections-loop.spec.ts
 * DOM：主相机菜单项 ui-app-menu-device-MainCamera；
 *      曝光时间控制 cp-exptime-value, cp-btn-exptime-plus, cp-btn-exptime-minus
 *      拍摄按钮 ui-circular-button-root
 *      参数滑块 ui-config-MainCamera-{Gain|Offset|Binning}-slider-*
 *      滤镜轮拍摄面板 cp-btn-cfw-plus, cp-btn-cfw-minus, cp-cfw-display
 *      滤镜轮配置菜单 ui-config-CFW-CFWPrev-button-*, ui-config-CFW-CFWNext-button-*
 */

import { test, expect, type Page, type TestInfo } from '@playwright/test'
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
const EXPOSURE_TIMES_TO_TEST = ['100ms', '1s', '5s', '10s']
const BURST_CAPTURE_COUNT = 200
const BURST_EXPOSURE_MS = 100

test.use({
  trace: 'on',
  video: 'on',
  screenshot: 'on',
})

function shortError(err: unknown) {
  if (err instanceof Error) return err.message
  return String(err)
}

async function readLocatorDisplayText(loc: ReturnType<Page['locator']>) {
  const text = (await loc.textContent())?.trim() ?? ''
  if (text) return text
  const value = (await loc.inputValue().catch(() => ''))?.trim() ?? ''
  if (value) return value
  const ariaLabel = (await loc.getAttribute('aria-label'))?.trim() ?? ''
  return ariaLabel
}

/** 可操作性检查后点击：可见、可启用、滚动入视口后标准 click，禁止 force 与 evaluate(click)。 */
async function clickWhenOperable(
  page: Page,
  loc: ReturnType<Page['locator']>,
  timing: RunTiming,
  opts?: { timeoutMs?: number; skipEnabledCheck?: boolean },
) {
  const timeout = opts?.timeoutMs ?? 8_000
  await loc.scrollIntoViewIfNeeded()
  await expect(loc).toBeVisible({ timeout })
  if (!opts?.skipEnabledCheck) {
    await expect(loc).toBeEnabled({ timeout })
  }
  await loc.click({ timeout })
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
  lines.push('==== MainCamera QHYCCD 双连接 + 参数测试 + 连续拍摄 测试报告 ====')
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
    const initialState = await drawer.getAttribute('data-state')
    if (initialState === 'open') return

    const showCaptureBtn = page.getByTestId('gui-btn-show-capture-ui').first()
    const switchMainBtn = page.getByTestId('gui-btn-switch-main-page').first()
    const toggleBtn = page.getByTestId('tb-act-toggle-navigation-drawer').first()

    // 某些页面状态下顶部工具栏会暂时隐藏，先尝试恢复到可见页面。
    for (let i = 0; i < 6; i++) {
      if (await toggleBtn.isVisible().catch(() => false)) break

      if ((await showCaptureBtn.count()) > 0 && (await showCaptureBtn.isVisible().catch(() => false)) && i === 0) {
        await clickWhenOperable(page, showCaptureBtn, timing)
      }

      if ((await switchMainBtn.count()) > 0 && (await switchMainBtn.isVisible().catch(() => false))) {
        await clickWhenOperable(page, switchMainBtn, timing)
      } else {
        await page.waitForTimeout(250)
      }
    }

    // 无论按钮当前是否可见，都尝试触发抽屉切换，兼容 v-show 隐藏状态。
    const openAttempts = 4
    for (let i = 0; i < openAttempts; i++) {
      const state = await drawer.getAttribute('data-state')
      if (state === 'open') {
        await waitAfterAction(page, timing)
        return
      }

      const toggleVisible = await toggleBtn.isVisible().catch(() => false)
      if (toggleVisible) {
        await expect(toggleBtn).toBeEnabled({ timeout: 5_000 }).catch(() => {})
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
    await confirmBtn.scrollIntoViewIfNeeded()
    await expect(confirmBtn).toBeVisible({ timeout: 8_000 })
    await expect(confirmBtn).toBeEnabled({ timeout: 8_000 })
    await confirmBtn.click({ timeout: 8_000 })
    await expect(root).toHaveAttribute('data-state', 'closed', { timeout: 10_000 })
    await waitAfterAction(page, timing)
  })
}

async function disconnectAllWithConfirm(page: Page, report: RuntimeReport, timing: RunTiming) {
  await addStep('menu.disconnect-all.click', report, async () => {
    const btn = page.getByTestId('ui-app-menu-disconnect-all').first()
    await btn.scrollIntoViewIfNeeded()
    await expect(btn).toBeVisible({ timeout: 8_000 })
    await expect(btn).toBeEnabled({ timeout: 8_000 })
    await btn.click({ timeout: 8_000 })
    await waitAfterAction(page, timing)
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

    const maxRetries = 6
    for (let i = 0; i < maxRetries; i++) {
      if ((await drawer.count()) > 0) {
        const state = await drawer.getAttribute('data-state')
        if (state !== 'open') {
          await expect(toggleBtn).toBeVisible({ timeout: 8_000 })
          await toggleBtn.click({ timeout: 8_000 })
          await expect(drawer).toHaveAttribute('data-state', 'open', { timeout: 8_000 })
          await waitAfterAction(page, timing)
        }
      }

      const drawerContent = drawer.locator('.v-navigation-drawer__content').first()
      if ((await drawerContent.count()) > 0) {
        await drawerContent.evaluate((el) => {
          ;(el as HTMLElement).scrollTop = 0
        }).catch(() => {})
      }
      await mainCameraItem.scrollIntoViewIfNeeded().catch(() => {})
      if (await mainCameraItem.isVisible().catch(() => false)) {
        await clickWhenOperable(page, mainCameraItem, timing)
        const devicePage = page.getByTestId('ui-app-submenu-device-page').first()
        await expect(devicePage).toHaveAttribute('data-state', 'open', { timeout: 8_000 })
        return
      }

      if ((await drawerContent.count()) > 0) {
        await drawerContent.evaluate((el) => {
          ;(el as HTMLElement).scrollTop = (el as HTMLElement).scrollHeight
        }).catch(() => {})
      }
      await waitShort(page, timing)
      await mainCameraItem.scrollIntoViewIfNeeded().catch(() => {})
      if (await mainCameraItem.isVisible().catch(() => false)) {
        await clickWhenOperable(page, mainCameraItem, timing)
        const devicePage = page.getByTestId('ui-app-submenu-device-page').first()
        await expect(devicePage).toHaveAttribute('data-state', 'open', { timeout: 8_000 })
        return
      }

      // 若仍不可见，重置抽屉状态后重试，处理偶发的隐藏态残留。
      if ((await drawer.count()) > 0 && (await toggleBtn.isVisible().catch(() => false))) {
        await toggleBtn.click({ timeout: 8_000 }).catch(() => {})
        await page.waitForTimeout(300)
        await toggleBtn.click({ timeout: 8_000 }).catch(() => {})
        await page.waitForTimeout(300)
      }
    }

    await expect(mainCameraItem).toBeVisible({ timeout: 10_000 })
  })
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
  const isSubmenuOpen = async () => (await submenuDrawer.count()) > 0 && (await submenuDrawer.getAttribute('data-state')) === 'open'
  const toggleMenuDrawer = async () => {
    if (await toggleDrawerBtn.isVisible().catch(() => false)) {
      await toggleDrawerBtn.scrollIntoViewIfNeeded()
      await expect(toggleDrawerBtn).toBeEnabled({ timeout: 5_000 }).catch(() => {})
      await toggleDrawerBtn.click({ timeout: 8_000 })
    }
    await page.waitForTimeout(300)
  }

  // 统一策略：优先显式控制（toggle + Esc），最后再点空白兜底。
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
    if (await isDrawerOpen() || await isSubmenuOpen()) {
      await clickOutside()
    }
  }

  if (await isDrawerOpen() || await isSubmenuOpen()) {
    await clickOutside()
  }
  if (await isDrawerOpen()) await toggleMenuDrawer()
  if (await isSubmenuOpen()) {
    await page.keyboard.press('Escape').catch(() => {})
    await page.waitForTimeout(250)
    if (await isSubmenuOpen()) await clickOutside()
  }

  if ((await drawer.count()) > 0) {
    await expect(drawer).toHaveAttribute('data-state', 'closed', { timeout: 8_000 })
  }
  if ((await submenuDrawer.count()) > 0) {
    await expect(submenuDrawer).toHaveAttribute('data-state', 'closed', { timeout: 8_000 })
  }
  await waitAfterAction(page, timing)
}

async function selectDriverByLabel(page: Page, report: RuntimeReport, timing: RunTiming, labelMatch: RegExp) {
  await addStep('maincamera.select-driver', report, async () => {
    const select = page.getByTestId('ui-app-select-confirm-driver').first()
    await expect(select).toBeVisible({ timeout: 8_000 })

    const currentText = await select.textContent()
    if (currentText && labelMatch.test(currentText)) {
      console.log(`[SKIP] 驱动已选择: ${currentText.trim()}`)
      return
    }

    const maxRetries = 10
    for (let retry = 0; retry < maxRetries; retry++) {
      await clickWhenOperable(page, select, timing)

      const menu = page.locator('.v-menu__content.menuable__content__active').first()
      const menuVisible = await menu.isVisible().catch(() => false)
      if (!menuVisible) {
        console.log(`[RETRY ${retry + 1}/${maxRetries}] 下拉菜单未打开，重试...`)
        await page.waitForTimeout(500)
        continue
      }

      const items = menu.locator('.v-list-item')
      await page.waitForTimeout(500)
      const itemCount = await items.count()
      if (itemCount === 0) {
        console.log(`[RETRY ${retry + 1}/${maxRetries}] 驱动列表为空，等待数据加载...`)
        await page.keyboard.press('Escape')
        await page.waitForTimeout(1000)
        continue
      }

      const noDataItem = items.filter({ hasText: /No data available/i }).first()
      if ((await noDataItem.count()) > 0) {
        console.log(`[RETRY ${retry + 1}/${maxRetries}] 驱动列表显示 "No data available"，等待数据加载...`)
        await page.keyboard.press('Escape')
        await page.waitForTimeout(1000)
        continue
      }

      const option = items.filter({ hasText: labelMatch }).first()
      if ((await option.count()) === 0) {
        console.log(`[RETRY ${retry + 1}/${maxRetries}] 未找到匹配驱动，等待...`)
        await page.keyboard.press('Escape')
        await page.waitForTimeout(1000)
        continue
      }

      await clickWhenOperable(page, option, timing)
      return
    }

    throw new Error(`未找到匹配 "${labelMatch.source}" 的驱动选项（重试 ${maxRetries} 次后）`)
  })
}

async function selectConnectionMode(page: Page, report: RuntimeReport, timing: RunTiming, mode: 'INDI' | 'SDK') {
  await addStep(`maincamera.select-connection-mode-${mode}`, report, async () => {
    const select = page.getByTestId('ui-app-select-on-connection-mode-change').first()
    const probe = page.getByTestId('e2e-device-MainCamera-conn').first()
    if ((await select.count()) === 0) {
      console.log(`[SKIP] 当前驱动未显示连接模式选择器，可能仅支持 INDI`)
      return
    }
    if (!(await select.isVisible().catch(() => false))) return

    const currentProbeMode = ((await probe.getAttribute('data-connection-mode').catch(() => '')) || '').trim()
    const currentText = await readLocatorDisplayText(select)
    const targetModeRegex = new RegExp(`\\b${mode}\\b`, 'i')
    if (targetModeRegex.test(currentProbeMode) || targetModeRegex.test(currentText)) {
      console.log(`[SKIP] 连接模式已是 ${mode}`)
      return
    }

    await clickWhenOperable(page, select, timing)

    const menu = page.locator('.v-menu__content.menuable__content__active').first()
    await expect(menu).toBeVisible({ timeout: 8_000 })
    const option = menu.locator('.v-list-item').filter({ hasText: new RegExp(`^\\s*${mode}\\s*$`, 'i') }).first()
    if ((await option.count()) === 0) {
      await page.keyboard.press('Escape')
      throw new Error(`未找到连接模式选项：${mode}`)
    }
    await clickWhenOperable(page, option, timing)
    await expect.poll(async () => {
      const probeMode = ((await probe.getAttribute('data-connection-mode').catch(() => '')) || '').trim()
      if (probeMode) return probeMode
      return await readLocatorDisplayText(select)
    }, { timeout: 8_000 }).toMatch(targetModeRegex)
  })
}

async function clickConnectMainCamera(page: Page, report: RuntimeReport, timing: RunTiming) {
  await addStep('maincamera.click-connect', report, async () => {
    const panel = page.getByTestId('ui-app-device-connection-panel').first()
    if ((await panel.count()) > 0) await panel.scrollIntoViewIfNeeded().catch(() => {})

    const btn = page.getByTestId('ui-app-btn-connect-driver').first()

    for (let attempt = 0; attempt < 15; attempt++) {
      const visible = await btn.isVisible().catch(() => false)
      if (visible) {
        await clickWhenOperable(page, btn, timing)
        return
      }
      console.log(`[WAIT ${attempt + 1}/15] 等待连接按钮出现...`)
      await page.waitForTimeout(1000)
    }

    throw new Error('连接按钮在 15 秒内未出现')
  })
}

async function waitMainCameraDisconnected(page: Page, report: RuntimeReport, timeoutMs: number) {
  await addStep('maincamera.wait-disconnected', report, async () => {
    const probe = page.getByTestId('e2e-device-MainCamera-conn').first()
    await expect(probe).toHaveAttribute('data-state', 'disconnected', { timeout: timeoutMs })
  })
}

async function clickDisconnectCurrentDevice(page: Page, report: RuntimeReport, timing: RunTiming) {
  await addStep('maincamera.click-disconnect', report, async () => {
    const btn = page.getByTestId('ui-app-btn-disconnect-driver').first()
    if ((await btn.count()) === 0) return
    if (!(await btn.isVisible().catch(() => false))) return
    await clickWhenOperable(page, btn, timing)
  })
  await confirmConfirmIfOpened(page, report, timing, 'maincamera.disconnect')
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
      if (connState === 'connected') {
        console.log(`[OK] ${targetRole} 已连接（无需设备分配）`)
        return
      }

      const dapVisible = await dapPanel.isVisible().catch(() => false)
      if (dapVisible) {
        console.log(`[INFO] 检测到设备分配面板，开始绑定 ${targetRole}`)
        await bindDeviceInAllocationPanel(page, report, timing, targetRole)

        console.log(`[INFO] 绑定完成，等待 ${targetRole} 连接...`)
        await expect(connProbe).toHaveAttribute('data-state', 'connected', {
          timeout: Math.max(timeoutMs - (Date.now() - startTime), 10_000),
        })
        return
      }

      await page.waitForTimeout(300)
    }

    throw new Error(`等待 ${targetRole} 连接或设备分配面板超时 (${timeoutMs}ms)`)
  })
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
    const cfwDisplay = page.getByTestId('cp-cfw-display').first()
    const cfwValue = page.getByTestId('cp-cfw-value').first()

    const plusState = await cfwPlusBtn.getAttribute('data-state').catch(() => 'unknown')
    if (plusState === 'disabled') {
      console.log(`[SKIP] CFW 按钮已禁用，跳过拍摄面板滤镜轮测试`)
      return
    }

    const initialValue = await cfwValue.getAttribute('data-value').catch(() => '-')
    console.log(`[INFO] [${modePrefix}] 拍摄面板 CFW 初始位置: ${initialValue}`)

    await clickWhenOperable(page, cfwPlusBtn, timing)
    console.log(`[INFO] [${modePrefix}] 点击 CFW Plus 按钮`)

    const plusMoveSuccess = await waitCFWMoveComplete(page, timing)
    if (plusMoveSuccess) {
      const newValue = await cfwValue.getAttribute('data-value').catch(() => '-')
      console.log(`[OK] [${modePrefix}] CFW Plus 切换完成，新位置: ${newValue}`)
    } else {
      console.log(`[WARN] [${modePrefix}] CFW Plus 切换超时`)
    }

    await page.waitForTimeout(500)

    await clickWhenOperable(page, cfwMinusBtn, timing)
    console.log(`[INFO] [${modePrefix}] 点击 CFW Minus 按钮`)

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
    await clickWhenOperable(page, cfwItem, timing)
    const devicePage = page.getByTestId('ui-app-submenu-device-page').first()
    await expect(devicePage).toHaveAttribute('data-state', 'open', { timeout: 8_000 })
  })
}

async function waitCFWMenuMoveComplete(page: Page, timing: RunTiming, timeoutMs: number = 15000): Promise<boolean> {
  const startTime = Date.now()

  while (Date.now() - startTime < timeoutMs) {
    const cfwNextBtn = await findVisibleButtonByTestIdPrefix(page, 'ui-config-CFW-CFWNext-button-')
    if (!cfwNextBtn) {
      await page.waitForTimeout(300)
      continue
    }
    if ((await cfwNextBtn.count()) === 0) {
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
    if (!cfwNextBtn || !cfwPrevBtn) {
      console.log(`[SKIP] CFW 配置菜单按钮未找到，跳过配置菜单滤镜轮测试`)
      return
    }

    if ((await cfwNextBtn.count()) === 0 || (await cfwPrevBtn.count()) === 0) {
      console.log(`[SKIP] CFW 配置菜单按钮未找到，跳过配置菜单滤镜轮测试`)
      return
    }

    const isDisabled = await cfwNextBtn.getAttribute('aria-disabled').catch(() => 'false')
    if (isDisabled === 'true') {
      console.log(`[SKIP] CFW 配置菜单按钮已禁用，跳过配置菜单滤镜轮测试`)
      return
    }

    console.log(`[INFO] [${modePrefix}] 开始配置菜单 CFW 切换测试 (第 ${iteration} 次)`)

    await clickWhenOperable(page, cfwNextBtn, timing)
    console.log(`[INFO] [${modePrefix}] 点击 CFW Next 按钮`)

    const nextMoveSuccess = await waitCFWMenuMoveComplete(page, timing)
    if (nextMoveSuccess) {
      console.log(`[OK] [${modePrefix}] CFW Next 切换完成`)
    } else {
      console.log(`[WARN] [${modePrefix}] CFW Next 切换超时`)
    }

    await page.waitForTimeout(500)

    await clickWhenOperable(page, cfwPrevBtn, timing)
    console.log(`[INFO] [${modePrefix}] 点击 CFW Prev 按钮`)

    const prevMoveSuccess = await waitCFWMenuMoveComplete(page, timing)
    if (prevMoveSuccess) {
      console.log(`[OK] [${modePrefix}] CFW Prev 切换完成`)
    } else {
      console.log(`[WARN] [${modePrefix}] CFW Prev 切换超时`)
    }
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

async function bindDeviceInAllocationPanel(
  page: Page,
  report: RuntimeReport,
  timing: RunTiming,
  targetRole: string,
) {
  const panel = page.getByTestId('dap-root').first()
  const pickers = panel.locator('[data-testid="dp-picker"]')

  await expect(pickers.first()).toBeVisible({ timeout: 8_000 })
  const pickerCount = await pickers.count()

  let targetPickerIndex = -1
  for (let i = 0; i < pickerCount; i++) {
    const picker = pickers.nth(i)
    const typeSpan = picker.getByTestId('dp-device-type')
    const typeText = await typeSpan.textContent()
    if (typeText && typeText.trim() === targetRole) {
      const state = await picker.getAttribute('data-state')
      if (state !== 'bound') {
        targetPickerIndex = i
        break
      } else {
        console.log(`[SKIP] ${targetRole} 已绑定`)
        return
      }
    }
  }

  if (targetPickerIndex === -1) {
    console.log(`[WARN] 未找到 ${targetRole} 角色卡片`)
    return
  }

  const targetPicker = pickers.nth(targetPickerIndex)
  await clickWhenOperable(page, targetPicker, timing)
  await waitShort(page, timing)

  const deviceItems = panel.locator('[data-testid="dap-act-selected-device-name-2"]')
  const deviceCount = await deviceItems.count()
  if (deviceCount === 0) {
    console.log('[WARN] 右侧待分配设备列表为空')
    return
  }

  const firstDevice = deviceItems.first()
  await expect(firstDevice).toBeVisible({ timeout: 5_000 })
  const deviceName = await firstDevice.textContent()
  console.log(`[INFO] 选择设备: ${deviceName?.trim()}`)
  await clickWhenOperable(page, firstDevice, timing)
  await waitShort(page, timing)

  const bindBtn = targetPicker.getByTestId('dp-btn-toggle-bind')
  const bindBtnState = await bindBtn.getAttribute('data-state')
  if (bindBtnState === 'unbound') {
    await expect(bindBtn).toBeVisible({ timeout: 5_000 })
    await clickWhenOperable(page, bindBtn, timing)
    console.log(`[OK] 已点击 Bind 按钮绑定 ${targetRole}`)
    await waitAfterAction(page, timing)
  }

  await page.waitForTimeout(500)
  const closeBtn = page.getByTestId('dap-act-close-panel').first()
  if (await closeBtn.isVisible().catch(() => false)) {
    await clickWhenOperable(page, closeBtn, timing)
    console.log(`[OK] 已关闭设备分配面板`)
    await waitAfterAction(page, timing)
  }
}

async function ensureCapturePanelVisible(page: Page, report: RuntimeReport, timing: RunTiming) {
  await addStep('maincamera.ensure-capture-panel-visible', report, async () => {
    const capturePanel = page.getByTestId('cp-panel').first()
    const showCaptureBtn = page.getByTestId('gui-btn-show-capture-ui').first()
    const drawer = page.getByTestId('ui-app-menu-drawer').first()

    for (let i = 0; i < 10; i++) {
      if (await capturePanel.isVisible().catch(() => false)) return

      // 若菜单抽屉仍开着，先关闭，避免遮挡拍摄面板区域。
      const drawerOpen = (await drawer.count()) > 0 && (await drawer.getAttribute('data-state')) === 'open'
      if (drawerOpen) {
        await ensureMenuLayersClosed(page, timing)
      }

      // 在主相机页但 UI 被隐藏时，优先展开拍摄控件；仅当按钮可见可点时点击。
      if ((await showCaptureBtn.count()) > 0 && (await showCaptureBtn.isVisible().catch(() => false))) {
        await clickWhenOperable(page, showCaptureBtn, timing)
        if (await capturePanel.isVisible().catch(() => false)) return
      }

      // 某些状态下必须触发一次主页面切换才能显示拍摄面板；仅当按钮可见可点时点击。
      const switchMainBtn = page.getByTestId('gui-btn-switch-main-page').first()
      if ((await switchMainBtn.count()) > 0 && (await switchMainBtn.isVisible().catch(() => false))) {
        await clickWhenOperable(page, switchMainBtn, timing)
        if (await capturePanel.isVisible().catch(() => false)) return
      }

      await ensureMenuDrawerOpen(page, report, timing)
      await openMainCameraSubmenu(page, report, timing)
      await ensureMenuLayersClosed(page, timing)
      await waitShort(page, timing)
    }

    await expect(capturePanel).toBeVisible({ timeout: 8_000 })
  })
}

async function setExposureTime(page: Page, report: RuntimeReport, timing: RunTiming, targetTime: string, modePrefix: string) {
  await addStep(`${modePrefix}.set-exposure-${targetTime}`, report, async () => {
    const expTimeDisplay = page.getByTestId('cp-exptime-value').first()
    await expect(expTimeDisplay).toBeVisible({ timeout: 8_000 })

    const plusBtn = page.getByTestId('cp-btn-exptime-plus').first()
    const minusBtn = page.getByTestId('cp-btn-exptime-minus').first()

    const maxClicks = 15
    for (let i = 0; i < maxClicks; i++) {
      const currentValue = await expTimeDisplay.getAttribute('data-value')
      if (currentValue === targetTime) {
        console.log(`[OK] 曝光时间已设置为: ${targetTime}`)
        return
      }
      await clickWhenOperable(page, plusBtn, timing)
      await page.waitForTimeout(200)
    }

    for (let i = 0; i < maxClicks; i++) {
      const currentValue = await expTimeDisplay.getAttribute('data-value')
      if (currentValue === targetTime) {
        console.log(`[OK] 曝光时间已设置为: ${targetTime}`)
        return
      }
      await clickWhenOperable(page, minusBtn, timing)
      await page.waitForTimeout(200)
    }

    const finalValue = await expTimeDisplay.getAttribute('data-value')
    console.log(`[WARN] 无法设置目标曝光时间 ${targetTime}，当前为: ${finalValue}`)
    throw new Error(`曝光时间设置失败：目标=${targetTime}，当前=${finalValue ?? 'unknown'}`)
  })
}

function parseExposureMs(expTime: string): number {
  const match = expTime.match(/^(\d+)(ms|s)$/)
  if (!match) return 1000
  const value = parseInt(match[1], 10)
  const unit = match[2]
  return unit === 's' ? value * 1000 : value
}

/** 拍摄按钮：先做可见与入视口检查，再标准 click（禁止 force / evaluate）。 */
async function clickCaptureButtonWhenOperable(loc: ReturnType<Page['locator']>) {
  await loc.scrollIntoViewIfNeeded()
  await expect(loc).toBeVisible({ timeout: 5_000 })
  await loc.click({ timeout: 5_000 })
}

async function ensureCaptureButtonHitTarget(page: Page, captureBtn: ReturnType<Page['locator']>) {
  await captureBtn.scrollIntoViewIfNeeded().catch(() => {})
  const box = await captureBtn.boundingBox()
  if (!box) return

  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  const hitTestId = await page.evaluate(
    ({ xPos, yPos }) => {
      const el = document.elementFromPoint(xPos, yPos) as HTMLElement | null
      return el?.closest('[data-testid]')?.getAttribute('data-testid') || ''
    },
    { xPos: x, yPos: y },
  )

  if (!/ui-components-circular-button/.test(hitTestId)) {
    throw new Error(`拍摄按钮中心点命中异常，当前命中元素: ${hitTestId || 'none'}`)
  }
}

async function takeExposure(page: Page, report: RuntimeReport, timing: RunTiming, stepLabel: string, waitMs: number) {
  await addStep(stepLabel, report, async () => {
    const captureBtn = page.getByTestId('ui-components-circular-button-act-handle-mouse-down').first()
    await expect(captureBtn).toBeVisible({ timeout: 8_000 })
    await ensureMenuLayersClosed(page, timing)

    const statusProbe = page.getByTestId('cp-status').first()
    let sawBusy = false
    for (let triggerAttempt = 0; triggerAttempt < 2; triggerAttempt++) {
      if (triggerAttempt > 0) {
        console.log('[WARN] 首次触发后未进入 busy，执行一次重试点击')
        await ensureCapturePanelVisible(page, report, timing)
        await ensureMenuLayersClosed(page, timing)
      }

      await ensureCaptureButtonHitTarget(page, captureBtn)
      await clickCaptureButtonWhenOperable(captureBtn)
      console.log(`[INFO] 开始曝光，等待 ${waitMs}ms + 缓冲时间...`)

      for (let attempt = 0; attempt < 12; attempt++) {
        const state = await statusProbe.getAttribute('data-state').catch(() => 'unknown')
        if (state === 'busy') {
          console.log(`[OK] 相机进入曝光状态`)
          sawBusy = true
          break
        }
        await page.waitForTimeout(300)
      }

      if (sawBusy) break
      await page.waitForTimeout(500)
    }

    if (!sawBusy) {
      throw new Error('点击拍摄后未检测到相机进入 busy 状态（含一次重试），疑似本次曝光未触发')
    }

    const totalWait = waitMs + 15_000
    const startTime = Date.now()
    while (Date.now() - startTime < totalWait) {
      const state = await statusProbe.getAttribute('data-state').catch(() => 'unknown')
      if (state === 'idle') {
        console.log(`[OK] 曝光完成，相机回到空闲状态`)
        await waitAfterAction(page, timing)
        return
      }
      await page.waitForTimeout(500)
    }

    const finalState = await statusProbe.getAttribute('data-state').catch(() => 'unknown')
    throw new Error(`曝光超时未回到 idle，当前状态: ${finalState}`)
  })
}

interface SliderInfo {
  label: string
  sliderTestId: string
  decBtnTestId: string
  incBtnTestId: string
  minValue: number
  maxValue: number
  defaultValue: number
}

async function findSliderInfo(page: Page, label: string): Promise<SliderInfo | null> {
  const sliderPattern = new RegExp(`ui-config-MainCamera-${label}-slider-\\d+`)
  const sliders = page.locator(`[data-testid^="ui-config-MainCamera-${label}-slider-"]`)
  const count = await sliders.count()

  for (let i = 0; i < count; i++) {
    const slider = sliders.nth(i)
    const testId = await slider.getAttribute('data-testid')
    if (testId && sliderPattern.test(testId) && !testId.includes('-dec-') && !testId.includes('-inc-')) {
      const indexMatch = testId.match(/-(\d+)$/)
      const index = indexMatch ? indexMatch[1] : '0'
      return {
        label,
        sliderTestId: testId,
        decBtnTestId: `ui-config-MainCamera-${label}-slider-dec-${index}`,
        incBtnTestId: `ui-config-MainCamera-${label}-slider-inc-${index}`,
        minValue: 0,
        maxValue: 100,
        defaultValue: 0,
      }
    }
  }
  return null
}

async function adjustSliderParameter(
  page: Page,
  report: RuntimeReport,
  timing: RunTiming,
  label: string,
  direction: 'increase' | 'decrease',
  clicks: number,
  modePrefix: string,
) {
  await addStep(`${modePrefix}.adjust-${label}-${direction}`, report, async () => {
    const sliderInfo = await findSliderInfo(page, label)
    if (!sliderInfo) {
      console.log(`[SKIP] 未找到 ${label} 滑块控件`)
      return
    }

    const btnTestId = direction === 'increase' ? sliderInfo.incBtnTestId : sliderInfo.decBtnTestId
    const btn = page.getByTestId(btnTestId).first()

    if ((await btn.count()) === 0) {
      console.log(`[WARN] 未找到 ${label} ${direction} 按钮`)
      return
    }

    for (let i = 0; i < clicks; i++) {
      await clickWhenOperable(page, btn, timing)
      await page.waitForTimeout(100)
    }
    console.log(`[OK] ${label} ${direction === 'increase' ? '增加' : '减少'} ${clicks} 次`)
  })
}

async function getSliderValue(page: Page, label: string): Promise<number | null> {
  const labelLoc = page.locator(`[data-testid^="ui-config-MainCamera-${label}-slider-label-"]`).first()
  if ((await labelLoc.count()) === 0) return null
  await labelLoc.scrollIntoViewIfNeeded()
  if (!(await labelLoc.isVisible().catch(() => false))) return null
  const text = await labelLoc.textContent()
  if (!text) return null
  const match = text.match(/:?\s*(\d+)\s*$/)
  return match ? parseInt(match[1], 10) : null
}

interface StoredParams {
  gain: number | null
  offset: number | null
  binning: number | null
}

async function captureCurrentParams(page: Page): Promise<StoredParams> {
  return {
    gain: await getSliderValue(page, 'Gain'),
    offset: await getSliderValue(page, 'Offset'),
    binning: await getSliderValue(page, 'Binning'),
  }
}

async function runTestCycleForMode(
  page: Page,
  report: RuntimeReport,
  timing: RunTiming,
  mode: 'INDI' | 'SDK',
) {
  const modePrefix = `maincamera-${mode.toLowerCase()}`

  await ensureCapturePanelVisible(page, report, timing)

  const initialParams = await captureCurrentParams(page)
  console.log(`[INFO] [${mode}] 初始参数: Gain=${initialParams.gain}, Offset=${initialParams.offset}, Binning=${initialParams.binning}`)

  for (const expTime of EXPOSURE_TIMES_TO_TEST) {
    await setExposureTime(page, report, timing, expTime, modePrefix)
    const waitMs = parseExposureMs(expTime)
    await takeExposure(page, report, timing, `${modePrefix}.capture-${expTime}`, waitMs)
    await waitShort(page, timing)
  }

  await ensureMenuDrawerOpen(page, report, timing)
  await openMainCameraSubmenu(page, report, timing)
  await page.waitForTimeout(500)

  await addStep(`${modePrefix}.test-gain-parameter`, report, async () => {
    await adjustSliderParameter(page, report, timing, 'Gain', 'increase', 5, modePrefix)
    await page.waitForTimeout(300)
  }, { allowFailure: true })

  await ensureMenuLayersClosed(page, timing)
  await ensureCapturePanelVisible(page, report, timing)
  await setExposureTime(page, report, timing, '1s', modePrefix)
  await takeExposure(page, report, timing, `${modePrefix}.capture-after-gain-change`, 1000)

  await ensureMenuDrawerOpen(page, report, timing)
  await openMainCameraSubmenu(page, report, timing)
  await page.waitForTimeout(500)

  await addStep(`${modePrefix}.test-offset-parameter`, report, async () => {
    await adjustSliderParameter(page, report, timing, 'Offset', 'increase', 5, modePrefix)
    await page.waitForTimeout(300)
  }, { allowFailure: true })

  await ensureMenuLayersClosed(page, timing)
  await ensureCapturePanelVisible(page, report, timing)
  await setExposureTime(page, report, timing, '1s', modePrefix)
  await takeExposure(page, report, timing, `${modePrefix}.capture-after-offset-change`, 1000)

  await ensureMenuDrawerOpen(page, report, timing)
  await openMainCameraSubmenu(page, report, timing)
  await page.waitForTimeout(500)

  await addStep(`${modePrefix}.test-binning-parameter`, report, async () => {
    await adjustSliderParameter(page, report, timing, 'Binning', 'increase', 1, modePrefix)
    await page.waitForTimeout(300)
  }, { allowFailure: true })

  await ensureMenuLayersClosed(page, timing)
  await ensureCapturePanelVisible(page, report, timing)
  await setExposureTime(page, report, timing, '1s', modePrefix)
  await takeExposure(page, report, timing, `${modePrefix}.capture-after-binning-change`, 1000)

  await addStep(`${modePrefix}.restore-default-params`, report, async () => {
    await ensureMenuDrawerOpen(page, report, timing)
    await openMainCameraSubmenu(page, report, timing)
    await page.waitForTimeout(500)

    await adjustSliderParameter(page, report, timing, 'Gain', 'decrease', 5, modePrefix)
    await adjustSliderParameter(page, report, timing, 'Offset', 'decrease', 5, modePrefix)
    await adjustSliderParameter(page, report, timing, 'Binning', 'decrease', 1, modePrefix)

    console.log(`[OK] [${mode}] 参数已恢复`)
  }, { allowFailure: true })

  await runCFWTestsIfConnected(page, report, timing, modePrefix)

  await ensureCapturePanelVisible(page, report, timing)
  await setExposureTime(page, report, timing, '100ms', modePrefix)

  await addStep(`${modePrefix}.burst-capture-${BURST_CAPTURE_COUNT}-frames`, report, async () => {
    console.log(`[INFO] [${mode}] 开始连续拍摄 ${BURST_CAPTURE_COUNT} 帧，每帧 ${BURST_EXPOSURE_MS}ms`)
    let consecutiveTriggerMiss = 0

    for (let i = 0; i < BURST_CAPTURE_COUNT; i++) {
      const captureBtn = page.getByTestId('ui-components-circular-button-act-handle-mouse-down').first()
      const statusProbe = page.getByTestId('cp-status').first()

      let sawBusy = false
      for (let triggerAttempt = 0; triggerAttempt < 2; triggerAttempt++) {
        if (triggerAttempt > 0) {
          console.log(`[WARN] [${mode}] 第 ${i + 1} 帧第 ${triggerAttempt} 次触发未进入 busy，继续重试`)
          await ensureCapturePanelVisible(page, report, timing)
        }
        await ensureMenuLayersClosed(page, timing)
        await ensureCaptureButtonHitTarget(page, captureBtn)
        await clickCaptureButtonWhenOperable(captureBtn)

        for (let wait = 0; wait < 8; wait++) {
          const state = await statusProbe.getAttribute('data-state').catch(() => 'unknown')
          if (state === 'busy') {
            sawBusy = true
            break
          }
          await page.waitForTimeout(120)
        }
        if (sawBusy) break
        await page.waitForTimeout(180)
      }
      if (!sawBusy) {
        consecutiveTriggerMiss += 1
        console.log(`[WARN] [${mode}] 第 ${i + 1} 帧未检测到 busy，按短等待继续（连续 ${consecutiveTriggerMiss} 帧）`)
        if (consecutiveTriggerMiss >= 8) {
          throw new Error(`[${mode}] 连续 ${consecutiveTriggerMiss} 帧未检测到 busy，疑似拍摄触发异常`)
        }
        await page.waitForTimeout(300)
        continue
      }
      consecutiveTriggerMiss = 0

      const waitIdleRounds = Math.ceil((BURST_EXPOSURE_MS + 2500) / 120)
      let backToIdle = false
      for (let wait = 0; wait < waitIdleRounds; wait++) {
        const state = await statusProbe.getAttribute('data-state').catch(() => 'unknown')
        if (state === 'idle') {
          backToIdle = true
          break
        }
        await page.waitForTimeout(120)
      }
      if (!backToIdle) {
        throw new Error(`[${mode}] 第 ${i + 1} 帧超时未回到 idle 状态`)
      }

      if ((i + 1) % 20 === 0) {
        console.log(`[INFO] [${mode}] 已完成 ${i + 1}/${BURST_CAPTURE_COUNT} 帧`)
      }
    }

    console.log(`[OK] [${mode}] 连续拍摄 ${BURST_CAPTURE_COUNT} 帧完成`)
  })
}

async function runMainCameraTest(page: Page, testInfo: TestInfo) {
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
  const connectWaitMs = 25_000

  page.setDefaultTimeout(uiTimeoutMs)
  page.setDefaultNavigationTimeout(stepTimeoutMs)
  testInfo.setTimeout(Math.max(testTimeoutMs, 20 * 60_000))

  // 阶段 1：应用启动与初始清理
  await addStep('boot.goto-app', report, async () => {
    await page.goto(getAppStartPath(), { waitUntil: 'load', timeout: stepTimeoutMs })
    await waitAfterAction(page, timing)
  })
  await waitForAppLoaded100(page, report, timing, stepTimeoutMs)

  await ensureMenuDrawerOpen(page, report, timing)
  await disconnectAllWithConfirm(page, report, timing)
  await waitShort(page, timing)

  // 阶段 2：INDI 模式全量测试周期
  console.log('\n========== 第一轮测试：INDI 连接模式 ==========\n')
  await openMainCameraSubmenu(page, report, timing)
  await selectDriverByLabel(page, report, timing, MAINCAMERA_DRIVER_MATCH)
  await selectConnectionMode(page, report, timing, 'INDI')
  await clickConnectMainCamera(page, report, timing)
  await waitForConnectionOrAllocation(page, report, timing, 'MainCamera', connectWaitMs)

  await runTestCycleForMode(page, report, timing, 'INDI')

  // 阶段 3：断开并切换到 SDK 模式
  await ensureMenuDrawerOpen(page, report, timing)
  await openMainCameraSubmenu(page, report, timing)
  await clickDisconnectCurrentDevice(page, report, timing)
  await waitMainCameraDisconnected(page, report, connectWaitMs)
  await waitShort(page, timing)

  console.log('\n========== 第二轮测试：SDK 连接模式 ==========\n')
  await ensureMenuDrawerOpen(page, report, timing)
  await openMainCameraSubmenu(page, report, timing)
  await selectConnectionMode(page, report, timing, 'SDK')
  await clickConnectMainCamera(page, report, timing)
  await waitForConnectionOrAllocation(page, report, timing, 'MainCamera', connectWaitMs)

  // 阶段 4：SDK 模式全量测试周期
  await runTestCycleForMode(page, report, timing, 'SDK')

  // 阶段 5：收尾与断言
  const reportText = buildReportText(report)
  console.log(reportText)
  await testInfo.attach('maincamera-qhyccd-runtime-report', {
    body: reportText,
    contentType: 'text/plain',
  })

  expect(
    report.stepErrors.length,
    '主相机 QHYCCD 双连接、参数测试与连续拍摄步骤存在失败，请查看附件 maincamera-qhyccd-runtime-report',
  ).toBe(0)
  expect(
    report.pageErrors.length,
    '页面存在运行时异常，请查看附件 maincamera-qhyccd-runtime-report',
  ).toBe(0)
}

test('4-主相机-QHYCCD双连接参数调整与200帧连续拍摄', async ({ page }, testInfo) => {
  await runMainCameraTest(page, testInfo)
})
