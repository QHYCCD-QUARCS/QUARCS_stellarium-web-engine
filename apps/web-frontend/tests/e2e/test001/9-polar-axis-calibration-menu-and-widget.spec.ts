/**
 * 极轴校准（Calibrate Polar Axis）E2E 测试：连接设备 + 菜单入口 + 极轴校准组件显示 + 执行校准
 *
 * 参考：test001/4-maincamera-qhyccd-two-connections-loop.spec.ts、5-mount-eqmod-connect-control-goto.spec.ts、8-cfw-switching-capture-and-config.spec.ts
 *
 * 详细执行逻辑（按 runPolarAxisCalibrationTest 的真实顺序）：
 * 1) 启动与初始清理：
 *    - 打开应用并等待 Gui 就绪。
 *    - 打开菜单后执行 Disconnect All，确保起始状态一致。
 *
 * 2) 分支 A：E2E_PA_SIMULATE_UNBOUND=1 时，模拟“未连接设备”状态，跳过连接步骤，仅测试错误提示分支。
 *
 * 3) 分支 B：正常流程（需真实后端）：
 *    - 连接 MainCamera（QHYCCD 驱动），等待连接完成（含设备分配面板绑定）。
 *    - 连接 Mount（EQMod 驱动），等待连接完成（含设备分配面板绑定）。
 *    - 赤道仪前置：关闭 Park、打开 Track、回到 Home 位。
 *    - 设置望远镜焦距：进入 Telescopes 子菜单，填写焦距（默认 510mm，可 E2E_PA_FOCAL_MM 覆盖）。
 *    - 设置当前位置：点击 Location 菜单项，填写纬度/经度并保存（默认 31.2, 121.5，可 E2E_PA_LAT/E2E_PA_LNG 覆盖）。
 *    - 关闭菜单，回到主视图。
 *
 * 4) 进入极轴校准：
 *    - 打开菜单，点击 Calibrate Polar Axis 菜单项。
 *    - 若设备已绑定：极轴校准组件（pa-widget）应显示，校验 pa-header、pa-calibration-progress 等。
 *    - 若未绑定：显示错误提示（ui-message-box-root），视为预期行为。
 *
 * 5) 执行校准（若 pa-widget 已显示）：
 *    - 点击 pa-btn-auto-calibration 开始自动校准。
 *    - 等待 pa-widget data-state 变为 running 或 pa-progress-fill 有进度。
 *    - 等待校准执行完成（pa-root data-state 变为 idle），默认超时 10 分钟，可 E2E_PA_CALIBRATION_COMPLETE_TIMEOUT_MS 覆盖。
 *    - 结束极轴校准后，打开赤道仪 Park。
 *
 * 6) 收尾与断言：
 *    - 附加运行报告并断言 stepErrors=0、pageErrors=0。
 */

import { test, expect, type Page, type TestInfo } from '@playwright/test'
import { getAppStartPath } from '../support/appStartPath'

// 统一配置入口（默认超时）
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { DEFAULTS, envNumber, envFlag, envString } = require('../../../e2e.config.cjs')

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
const MOUNT_DRIVER_MATCH = /eqmod\s*mount|eqmod/i
const CONNECT_WAIT_MS = 30_000
const MOUNT_CONNECT_WAIT_MS = envNumber(process.env, 'E2E_MOUNT_CONNECT_WAIT_MS', 30_000)
const PA_CALIBRATION_COMPLETE_TIMEOUT_MS = 10 * 60 * 1000 // 默认 10 分钟等待校准完成
const MOUNT_ACTION_WAIT_MS = 120_000 // 赤道仪 Home 等动作等待超时
const DEFAULT_FOCAL_MM = '510'
const DEFAULT_LAT = '31.2'
const DEFAULT_LNG = '121.5'

function resolveFocalMmFromEnv(): string {
  const raw = (envString(process.env, 'E2E_PA_FOCAL_MM', '') || process.env.E2E_TELESCOPES_FOCAL_MM || '').trim()
  if (!raw) return DEFAULT_FOCAL_MM
  const value = Number(raw)
  if (!Number.isFinite(value) || value < 0) return DEFAULT_FOCAL_MM
  return String(value)
}

function resolveLocationFromEnv(): { lat: string; lng: string } {
  const lat = (envString(process.env, 'E2E_PA_LAT', '') || '').trim() || DEFAULT_LAT
  const lng = (envString(process.env, 'E2E_PA_LNG', '') || '').trim() || DEFAULT_LNG
  return { lat, lng }
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
  lines.push('==== Polar Axis Calibration 测试报告 ====')
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

/** 可操作性检查后标准点击，禁止 force 与 DOM 级 evaluate(click) */
async function clickLocatorWhenOperable(
  page: Page,
  loc: ReturnType<Page['locator']>,
  timing: RunTiming,
  opts?: { timeoutMs?: number; checkEnabled?: boolean },
) {
  const timeout = opts?.timeoutMs ?? 8_000
  await loc.scrollIntoViewIfNeeded().catch(() => {})
  await expect(loc).toBeVisible({ timeout: Math.min(timeout, 10_000) })
  if (opts?.checkEnabled) await expect(loc).toBeEnabled({ timeout: 5_000 })
  await loc.click({ timeout })
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

async function disconnectAllWithConfirm(page: Page, report: RuntimeReport, timing: RunTiming) {
  await addStep('menu.disconnect-all.click', report, async () => {
    const btn = page.getByTestId('ui-app-menu-disconnect-all').first()
    await expect(btn).toBeVisible({ timeout: 8_000 })
    await btn.click({ timeout: 8_000 })
    await waitAfterAction(page, timing)
  })
  await confirmConfirmIfOpened(page, report, timing, 'menu.disconnect-all')
  await waitShort(page, timing)
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
    if (await toggleDrawerBtn.isVisible().catch(() => false)) {
      await toggleDrawerBtn.scrollIntoViewIfNeeded().catch(() => {})
      await expect(toggleDrawerBtn).toBeVisible({ timeout: 3_000 }).catch(() => null)
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
        await clickLocatorWhenOperable(page, mainCameraItem, timing)
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
    if (currentText && labelMatch.test(currentText)) {
      console.log(`[SKIP] 驱动已选择: ${currentText.trim()}`)
      return
    }

    for (let retry = 0; retry < 10; retry++) {
      await clickLocatorWhenOperable(page, select, timing)
      await page.waitForTimeout(350)

      const selected = await clickMenuOptionWithScroll(page, timing, labelMatch)
      if (selected) return
      await page.keyboard.press('Escape').catch(() => {})
      await page.waitForTimeout(700)
    }
    throw new Error(`未找到匹配 "${labelMatch.source}" 的驱动选项`)
  })
}

async function clickConnectMainCamera(page: Page, report: RuntimeReport, timing: RunTiming) {
  await addStep('maincamera.click-connect', report, async () => {
    const btn = page.getByTestId('ui-app-btn-connect-driver').first()
    for (let attempt = 0; attempt < 15; attempt++) {
      if (await btn.isVisible().catch(() => false)) {
        await clickLocatorWhenOperable(page, btn, timing)
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
  await clickLocatorWhenOperable(page, targetPicker, timing)
  await waitShort(page, timing)

  const firstDevice = panel.locator('[data-testid="dap-act-selected-device-name-2"]').first()
  await expect(firstDevice).toBeVisible({ timeout: 5_000 })
  await clickLocatorWhenOperable(page, firstDevice, timing)
  await waitShort(page, timing)

  const bindBtn = targetPicker.getByTestId('dp-btn-toggle-bind')
  if ((await bindBtn.getAttribute('data-state')) === 'unbound') {
    await clickLocatorWhenOperable(page, bindBtn, timing)
  }
  await page.waitForTimeout(500)
  const closeBtn = page.getByTestId('dap-act-close-panel').first()
  if (await closeBtn.isVisible().catch(() => false)) {
    await clickLocatorWhenOperable(page, closeBtn, timing)
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

async function openMountSubmenu(page: Page, report: RuntimeReport, timing: RunTiming) {
  await addStep('menu.open-mount-submenu', report, async () => {
    const drawer = page.getByTestId('ui-app-menu-drawer').first()
    const mountItemByTestId = page.getByTestId('ui-app-menu-device-Mount').first()
    const devicePage = page.getByTestId('ui-app-submenu-device-page').first()

    for (let i = 0; i < 6; i++) {
      await ensureMenuDrawerOpen(page, report, timing)
      await drawer
        .evaluate((el) => {
          ;(el as HTMLElement).scrollTop = 0
        })
        .catch(() => {})

      if ((await mountItemByTestId.count()) > 0) {
        await mountItemByTestId.scrollIntoViewIfNeeded().catch(() => {})
        if (await mountItemByTestId.isVisible().catch(() => false)) {
          await clickLocatorWhenOperable(page, mountItemByTestId, timing)
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

    throw new Error('未找到 Mount 菜单项（ui-app-menu-device-Mount）')
  })
}

async function clickMenuOptionWithScroll(
  page: Page,
  timing: RunTiming,
  labelMatch: RegExp,
) {
  const options = page.locator('[data-testid^="ui-app-select-confirm-driver-option-"]')
  const tryClickMatchedOption = async () => {
    const count = await options.count()
    for (let i = 0; i < count; i++) {
      const option = options.nth(i)
      const text = ((await option.textContent().catch(() => '')) || '').trim()
      if (!labelMatch.test(text)) continue
      await option.scrollIntoViewIfNeeded().catch(() => {})
      if (!(await option.isVisible().catch(() => false))) continue
      await clickLocatorWhenOperable(page, option, timing)
      return true
    }
    return false
  }

  if (await tryClickMatchedOption()) return true

  const scrollDropdownPanel = async () => {
    const options = page.locator('[data-testid^="ui-app-select-confirm-driver-option-"]')
    const first = options.first()
    if (!(await first.isVisible().catch(() => false))) return false
    return await first.evaluate((el) => {
      let cur: HTMLElement | null = el as HTMLElement
      while (cur) {
        const canScroll = cur.scrollHeight > cur.clientHeight + 2
        if (canScroll) {
          cur.scrollTop += Math.max(220, Math.floor(cur.clientHeight * 0.75))
          return true
        }
        cur = cur.parentElement
      }
      return false
    }).catch(() => false)
  }

  for (let i = 1; i <= 12; i++) {
    const scrolled = await scrollDropdownPanel()
    if (!scrolled) {
      await page.keyboard.press('ArrowDown').catch(() => {})
    }
    await page.waitForTimeout(180)
    if (await tryClickMatchedOption()) return true
  }

  return false
}

async function selectMountDriverByLabel(page: Page, report: RuntimeReport, timing: RunTiming, labelMatch: RegExp) {
  await addStep('mount.select-driver', report, async () => {
    const select = page.getByTestId('ui-app-select-confirm-driver').first()
    await expect(select).toBeVisible({ timeout: 8_000 })

    const currentText = (await select.textContent())?.trim() ?? ''
    if (currentText && labelMatch.test(currentText)) return

    for (let retry = 0; retry < 10; retry++) {
      await clickLocatorWhenOperable(page, select, timing)
      await page.waitForTimeout(350)

      const anyOption = page.locator('[data-testid^="ui-app-select-confirm-driver-option-"]').first()
      const noDataItem = page.getByText(/No data available/i).first()
      if (await noDataItem.isVisible().catch(() => false)) {
        console.log(`[RETRY ${retry + 1}/10] 驱动列表显示 "No data available"，等待数据加载...`)
        await page.keyboard.press('Escape').catch(() => {})
        await page.waitForTimeout(1000)
        continue
      }

      if (!(await anyOption.isVisible().catch(() => false))) {
        console.log(`[RETRY ${retry + 1}/10] 驱动下拉尚未展开，重试...`)
        await page.waitForTimeout(500)
        continue
      }
      const selected = await clickMenuOptionWithScroll(page, timing, labelMatch)
      if (!selected) {
        await page.keyboard.press('Escape').catch(() => {})
        await page.waitForTimeout(700)
        continue
      }
      return
    }

    throw new Error(`未找到匹配驱动：${labelMatch.source}`)
  })
}

async function clickConnectMount(page: Page, report: RuntimeReport, timing: RunTiming) {
  await addStep('mount.click-connect', report, async () => {
    const panel = page.getByTestId('ui-app-device-connection-panel').first()
    if ((await panel.count()) > 0) await panel.scrollIntoViewIfNeeded().catch(() => {})
    const btn = page.getByTestId('ui-app-btn-connect-driver').first()
    for (let i = 0; i < 15; i++) {
      if (await btn.isVisible().catch(() => false)) {
        await clickLocatorWhenOperable(page, btn, timing)
        return
      }
      await page.waitForTimeout(1000)
    }
    throw new Error('连接按钮在 15 秒内未出现')
  })
}

async function dismissOverlayScrimIfPresent(page: Page, maxRounds: number = 6) {
  for (let i = 0; i < maxRounds; i++) {
    await page.keyboard.press('Escape').catch(() => {})
    await page.waitForTimeout(160)
  }
}

/** 可操作性检查后点击遮罩关闭菜单，禁止 force 类操作 */
async function clickVisibleOverlayScrimOnce(page: Page): Promise<boolean> {
  const scrims = page.locator('.v-overlay__scrim')
  const count = await scrims.count()
  for (let i = count - 1; i >= 0; i--) {
    const scrim = scrims.nth(i)
    const visible = await scrim.isVisible().catch(() => false)
    if (!visible) continue
    await scrim.scrollIntoViewIfNeeded().catch(() => {})
    await expect(scrim).toBeVisible({ timeout: 1_500 }).catch(() => null)
    await scrim.click({ timeout: 1_500 }).catch(() => {})
    return true
  }
  return false
}

async function closeMenuByOutsideScrimSmart(page: Page) {
  const menuDrawer = page.getByTestId('ui-app-menu-drawer').first()
  if ((await menuDrawer.count()) === 0) return
  if ((await menuDrawer.getAttribute('data-state').catch(() => '')) !== 'open') return

  const subDrawer = page.getByTestId('ui-app-submenu-drawer').first()
  const subState = (await subDrawer.getAttribute('data-state').catch(() => '')) ?? ''
  const clicksNeeded = subState === 'open' ? 2 : 1

  for (let i = 0; i < clicksNeeded; i++) {
    const clicked = await clickVisibleOverlayScrimOnce(page)
    if (!clicked) break
    await page.waitForTimeout(220)
  }

  if ((await menuDrawer.getAttribute('data-state').catch(() => '')) === 'open') {
    await page.keyboard.press('Escape').catch(() => {})
    await page.waitForTimeout(200)
  }
}

async function ensureMountControlPanelVisible(page: Page, report: RuntimeReport, timing: RunTiming) {
  await addStep('mount.ensure-control-panel-visible', report, async () => {
    const panel = page.getByTestId('mcp-panel').first()
    if (await panel.isVisible().catch(() => false)) return

    const toggleBtn = page.getByTestId('gui-btn-toggle-mount-panel').first()
    for (let i = 0; i < 5; i++) {
      if (await panel.isVisible().catch(() => false)) return
      await closeMenuByOutsideScrimSmart(page)
      await dismissOverlayScrimIfPresent(page, 1)
      if (await toggleBtn.isVisible().catch(() => false)) {
        await clickLocatorWhenOperable(page, toggleBtn, { actionDelayMs: 0, shortDelayMs: 0 }, { timeoutMs: 5_000 })
      }
      await page.waitForTimeout(500)
    }

    await expect(panel).toBeVisible({ timeout: 12_000 })
  })
}

async function waitForMountIdleState(page: Page, timeoutMs: number = MOUNT_ACTION_WAIT_MS) {
  const busy = page.getByTestId('mcp-status-indicator-busy').first()
  const idle = page.getByTestId('mcp-status-indicator-idle').first()
  const start = Date.now()

  while (Date.now() - start < timeoutMs) {
    if (await idle.isVisible().catch(() => false)) return
    const busyVisible = await busy.isVisible().catch(() => false)
    if (!busyVisible) {
      await page.waitForTimeout(200)
      if (await idle.isVisible().catch(() => false)) return
    }
    await page.waitForTimeout(300)
  }

  throw new Error('等待赤道仪进入 idle 状态超时')
}

async function waitMountBusyThenIdle(
  page: Page,
  report: RuntimeReport,
  stepName: string,
  timeoutMs: number,
  options?: { requireBusy?: boolean },
) {
  await addStep(stepName, report, async () => {
    const busy = page.getByTestId('mcp-status-indicator-busy').first()
    const idle = page.getByTestId('mcp-status-indicator-idle').first()
    const requireBusy = options?.requireBusy ?? true
    const start = Date.now()
    let sawBusy = false

    while (Date.now() - start < timeoutMs) {
      const busyVisible = await busy.isVisible().catch(() => false)
      const idleVisible = await idle.isVisible().catch(() => false)
      if (busyVisible) sawBusy = true
      if ((!requireBusy || sawBusy) && idleVisible) return
      await page.waitForTimeout(400)
    }

    if (requireBusy && !sawBusy) throw new Error('未观察到赤道仪进入 busy 状态')
    throw new Error('长时间未观察到赤道仪回到 idle 状态')
  })
}

async function ensureParkDisabled(page: Page, report: RuntimeReport, timing: RunTiming, stepName: string) {
  await addStep(stepName, report, async () => {
    const btn = page.getByTestId('mcp-btn-park').first()
    await expect(btn).toBeVisible({ timeout: 10_000 })
    await waitForMountIdleState(page)

    if (((await btn.getAttribute('data-state')) ?? '') === 'off') return

    for (let i = 0; i < 4; i++) {
      await waitForMountIdleState(page)
      await clickLocatorWhenOperable(page, btn, timing)
      const isOff = await expect
        .poll(async () => (await btn.getAttribute('data-state')) ?? '', { timeout: 20_000 })
        .toBe('off')
        .then(() => true)
        .catch(() => false)
      if (isOff) return
    }

    throw new Error('功能执行前关闭 Park 失败，状态未到 off')
  })
}

async function ensureParkEnabled(page: Page, report: RuntimeReport, timing: RunTiming, stepName: string) {
  await addStep(stepName, report, async () => {
    const btn = page.getByTestId('mcp-btn-park').first()
    await expect(btn).toBeVisible({ timeout: 10_000 })
    await waitForMountIdleState(page)

    if (((await btn.getAttribute('data-state')) ?? '') === 'on') return

    for (let i = 0; i < 4; i++) {
      await waitForMountIdleState(page)
      await clickLocatorWhenOperable(page, btn, timing)
      const isOn = await expect
        .poll(async () => (await btn.getAttribute('data-state')) ?? '', { timeout: 20_000 })
        .toBe('on')
        .then(() => true)
        .catch(() => false)
      if (isOn) return
    }

    throw new Error('结束极轴校准后开启 Park 失败，状态未到 on')
  })
}

async function ensureTrackEnabled(page: Page, report: RuntimeReport, timing: RunTiming) {
  await addStep('mount.track.ensure-on', report, async () => {
    const btn = page.getByTestId('mcp-btn-track').first()
    await expect(btn).toBeVisible({ timeout: 10_000 })
    await waitForMountIdleState(page)

    if (((await btn.getAttribute('data-state')) ?? '') === 'on') {
      console.log('[OK] Track 已启用')
      return
    }

    for (let i = 0; i < 4; i++) {
      await waitForMountIdleState(page)
      await clickLocatorWhenOperable(page, btn, timing)
      const isOn = await expect
        .poll(async () => (await btn.getAttribute('data-state')) ?? '', { timeout: 20_000 })
        .toBe('on')
        .then(() => true)
        .catch(() => false)
      if (isOn) return
    }

    throw new Error('打开 Track 失败，状态未到 on')
  })
}

async function executeMountHomeAndWait(page: Page, report: RuntimeReport, timing: RunTiming) {
  const homeBtn = page.getByTestId('mcp-btn-home').first()
  await addStep('mount.home.click', report, async () => {
    await expect(homeBtn).toBeVisible({ timeout: 10_000 })
    await waitForMountIdleState(page)
    await clickLocatorWhenOperable(page, homeBtn, timing)
  })

  await addStep('mount.home.wait-processing-started', report, async () => {
    await expect.poll(async () => (await homeBtn.getAttribute('data-processing')) ?? '', { timeout: 8_000 }).toBe('true')
  })
  await addStep('mount.home.wait-processing-finished', report, async () => {
    await expect
      .poll(async () => (await homeBtn.getAttribute('data-processing')) ?? '', { timeout: MOUNT_ACTION_WAIT_MS })
      .not.toBe('true')
  })

  await waitMountBusyThenIdle(page, report, 'mount.home.wait-complete', MOUNT_ACTION_WAIT_MS, {
    requireBusy: false,
  })
}

async function firstVisibleLocator(candidates: ReturnType<Page['locator']>): Promise<ReturnType<Page['locator']> | null> {
  const count = await candidates.count()
  for (let i = 0; i < count; i++) {
    const item = candidates.nth(i)
    if (await item.isVisible().catch(() => false)) return item
  }
  return null
}

async function findVisibleInScrollableContainer(
  page: Page,
  container: ReturnType<Page['locator']>,
  candidates: ReturnType<Page['locator']>,
  maxScrollSteps: number = 12,
): Promise<ReturnType<Page['locator']> | null> {
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
          await clickLocatorWhenOperable(page, telescopesItem, timing)
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
    const focalCandidates = page.locator('[data-testid="ui-config-Telescopes-FocalLengthmm-number-0"]')
    const focalInput = await findVisibleInScrollableContainer(page, paramsContainer, focalCandidates, 10)
    if (!focalInput) throw new Error('未找到可见焦距输入框（ui-config-Telescopes-FocalLengthmm-number-0）')

    const inputEl = focalInput.locator('input').first()
    if ((await inputEl.count()) > 0) {
      await inputEl.fill(focalMm, { timeout: 8_000 })
    } else {
      await focalInput.fill(focalMm, { timeout: 8_000 })
    }
    await waitAfterAction(page, timing)
  })
}

async function openLocationDialogAndSetLocation(
  page: Page,
  report: RuntimeReport,
  timing: RunTiming,
  lat: string,
  lng: string,
) {
  await addStep('location.open-dialog', report, async () => {
    const menuItem = page.getByTestId('ui-app-menu-location').first()
    await expect(menuItem).toBeVisible({ timeout: 10_000 })
    await clickLocatorWhenOperable(page, menuItem, timing)
    const dialog = page.getByTestId('ui-location-dialog-root').first()
    await expect(dialog).toHaveAttribute('data-state', 'open', { timeout: 8_000 })
    await waitAfterAction(page, timing)
  })

  await addStep('location.fill-coordinates', report, async () => {
    const latInput = page.getByTestId('ui-location-dialog-input-latitude').first().locator('input').first()
    const lngInput = page.getByTestId('ui-location-dialog-input-longitude').first().locator('input').first()
    if ((await latInput.count()) === 0 || (await lngInput.count()) === 0) {
      const latField = page.getByTestId('ui-location-dialog-input-latitude').first()
      const lngField = page.getByTestId('ui-location-dialog-input-longitude').first()
      await latField.fill(lat, { timeout: 5_000 })
      await lngField.fill(lng, { timeout: 5_000 })
    } else {
      await latInput.fill(lat, { timeout: 5_000 })
      await lngInput.fill(lng, { timeout: 5_000 })
    }
    await waitAfterAction(page, timing)
  })

  await addStep('location.save-coordinates', report, async () => {
    const saveBtn = page.getByTestId('ui-location-dialog-btn-save-manual-coordinates').first()
    await expect(saveBtn).toBeVisible({ timeout: 5_000 })
    await clickLocatorWhenOperable(page, saveBtn, timing)
    await page.waitForTimeout(300)
    await page.keyboard.press('Escape').catch(() => {})
    await page.waitForTimeout(200)
    const dialog = page.getByTestId('ui-location-dialog-root').first()
    if ((await dialog.getAttribute('data-state').catch(() => '')) === 'open') {
      const closed = await clickVisibleOverlayScrimOnce(page)
      if (!closed) await page.keyboard.press('Escape').catch(() => {})
      await page.waitForTimeout(200)
    }
    await waitAfterAction(page, timing)
  })
}

async function runPolarAxisCalibrationTest(page: Page, testInfo: TestInfo) {
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
  const completeTimeoutMs = envNumber(
    process.env,
    'E2E_PA_CALIBRATION_COMPLETE_TIMEOUT_MS',
    PA_CALIBRATION_COMPLETE_TIMEOUT_MS,
  )
  testInfo.setTimeout(Math.max(testTimeoutMs, completeTimeoutMs + 2 * 60_000))

  // 阶段 1：应用启动并等待 Gui 就绪
  await addStep('boot.goto-app', report, async () => {
    await page.goto(getAppStartPath(), { waitUntil: 'domcontentloaded', timeout: stepTimeoutMs })
    await waitAfterAction(page, timing)
  })

  await waitForAppLoaded100(page, report, timing, stepTimeoutMs)

  await ensureMenuDrawerOpen(page, report, timing)
  await disconnectAllWithConfirm(page, report, timing)
  await waitShort(page, timing)

  // 分支 A：E2E_PA_SIMULATE_UNBOUND=1 时，模拟“未连接设备”状态，跳过连接步骤
  const simulateUnbound = envFlag(process.env, 'E2E_PA_SIMULATE_UNBOUND', false)
  if (simulateUnbound) {
    await addStep('pa.simulate-unbound', report, async () => {
      await page.evaluate(() => {
        const el = document.querySelector('#app') as any
        const app = el?.__vue__ ?? el?._vue__
        if (app?.$store) {
          app.$store.commit('device/SET_DEVICE_BOUND', { device: 'MainCamera', bound: false })
          app.$store.commit('device/SET_DEVICE_BOUND', { device: 'Mount', bound: false })
        }
      })
      await waitAfterAction(page, timing)
    })
  } else {
    // 分支 B：连接 MainCamera + Mount
    await openMainCameraSubmenu(page, report, timing)
    await selectDriverByLabel(page, report, timing, MAINCAMERA_DRIVER_MATCH)
    await clickConnectMainCamera(page, report, timing)
    await waitForConnectionOrAllocation(page, report, timing, 'MainCamera', CONNECT_WAIT_MS)

    await ensureMenuDrawerOpen(page, report, timing)
    await openMountSubmenu(page, report, timing)
    await selectMountDriverByLabel(page, report, timing, MOUNT_DRIVER_MATCH)
    await clickConnectMount(page, report, timing)
    await waitForConnectionOrAllocation(page, report, timing, 'Mount', MOUNT_CONNECT_WAIT_MS)

    await ensureMenuLayersClosed(page, timing)
    await waitShort(page, timing)

    // 赤道仪前置：关闭 Park、打开 Track、回到 Home 位
    await ensureMountControlPanelVisible(page, report, timing)
    await ensureParkDisabled(page, report, timing, 'mount.park.ensure-off-after-connect')
    await ensureTrackEnabled(page, report, timing)
    await executeMountHomeAndWait(page, report, timing)

    // 设置望远镜焦距
    const focalMm = resolveFocalMmFromEnv()
    await ensureMenuDrawerOpen(page, report, timing)
    await openTelescopesSubmenu(page, report, timing)
    await setTelescopesFocalLength(page, report, timing, focalMm)
    await ensureMenuLayersClosed(page, timing)
    await waitShort(page, timing)

    // 设置当前位置
    const { lat, lng } = resolveLocationFromEnv()
    await ensureMenuDrawerOpen(page, report, timing)
    await openLocationDialogAndSetLocation(page, report, timing, lat, lng)
    await ensureMenuLayersClosed(page, timing)
    await waitShort(page, timing)
  }

  await ensureMenuDrawerOpen(page, report, timing)

  // 阶段 2：点击 Calibrate Polar Axis 菜单项
  await addStep('menu.click-calibrate-polar-axis', report, async () => {
    const menuItem = page.getByTestId('ui-app-menu-calibrate-polar-axis').first()
    await expect(menuItem).toBeVisible({ timeout: Math.min(15_000, stepTimeoutMs) })
    await clickLocatorWhenOperable(page, menuItem, timing)
  })

  // 阶段 3：等待并校验结果（主相机已绑定则显示 pa-widget，未绑定则显示错误提示）
  let paWidgetVisible = false
  await addStep('pa.verify-outcome', report, async () => {
    const waitMs = 8_000
    const paWidget = page.getByTestId('pa-widget').first()
    const messageBox = page.getByTestId('ui-message-box-root').first()

    const paPromise = paWidget.waitFor({ state: 'visible', timeout: waitMs }).then(() => 'pa' as const)
    const msgPromise = messageBox.waitFor({ state: 'visible', timeout: waitMs }).then(() => 'msg' as const)
    const first = await Promise.race([paPromise, msgPromise]).catch(() => null)

    if (first === 'pa') {
      await expect(paWidget).toBeVisible()
      await expect(page.getByTestId('pa-header').first()).toBeVisible({ timeout: 5_000 })
      await expect(page.getByTestId('pa-calibration-progress').first()).toBeVisible({ timeout: 5_000 })
      console.log('[OK] 极轴校准组件已显示（主相机+Mount 已绑定）')
      paWidgetVisible = true
      return
    }

    if (first === 'msg') {
      console.log('[OK] 显示主相机未绑定错误提示（预期行为）')
      return
    }

    throw new Error('点击 Calibrate Polar Axis 后，既未显示极轴校准组件(pa-widget)，也未显示错误提示(ui-message-box-root)')
  })

  // 阶段 4：执行极轴校准（若 pa-widget 已显示）
  if (paWidgetVisible) {
    await addStep('pa.click-start-auto-calibration', report, async () => {
      const btn = page.getByTestId('pa-btn-auto-calibration').first()
      await expect(btn).toBeVisible({ timeout: 8_000 })
      await expect(btn).toBeEnabled({ timeout: 5_000 })
      await clickLocatorWhenOperable(page, btn, timing)
      console.log('[OK] 已点击 Start Auto Calibration')
    })

    await addStep('pa.wait-calibration-running', report, async () => {
      const paRoot = page.getByTestId('pa-root').first()
      const progressFill = page.getByTestId('pa-progress-fill').first()
      const start = Date.now()
      const timeoutMs = 15_000

      while (Date.now() - start < timeoutMs) {
        const state = await paRoot.getAttribute('data-state').catch(() => '')
        const progress = await progressFill.getAttribute('data-progress').catch(() => '')
        if (state === 'running' || (progress && parseInt(progress, 10) > 0)) {
          console.log(`[OK] 校准已启动 (data-state=${state}, progress=${progress})`)
          return
        }
        await page.waitForTimeout(250)
      }
      console.log('[WARN] 未在超时内观测到 data-state=running 或 progress>0，继续执行')
    })

    const completeTimeoutMs = envNumber(
      process.env,
      'E2E_PA_CALIBRATION_COMPLETE_TIMEOUT_MS',
      PA_CALIBRATION_COMPLETE_TIMEOUT_MS,
    )

    await addStep('pa.wait-calibration-complete', report, async () => {
      const paRoot = page.getByTestId('pa-root').first()
      const start = Date.now()

      while (Date.now() - start < completeTimeoutMs) {
        const state = await paRoot.getAttribute('data-state').catch(() => '')
        if (state === 'idle') {
          const elapsed = Math.round((Date.now() - start) / 1000)
          console.log(`[OK] 校准已执行完成 (data-state=idle, 耗时约 ${elapsed}s)`)
          return
        }
        await page.waitForTimeout(500)
      }

      throw new Error(
        `等待极轴校准完成超时 (${completeTimeoutMs}ms)，pa-root 仍为 data-state=running`,
      )
    })

    // 结束极轴校准后，打开赤道仪 Park
    await ensureMountControlPanelVisible(page, report, timing)
    await ensureParkEnabled(page, report, timing, 'mount.park.ensure-on-after-calibration')
  }

  // 阶段 5：收尾与断言
  const reportText = buildReportText(report)
  console.log(reportText)
  await testInfo.attach('polar-axis-calibration-runtime-report', {
    body: reportText,
    contentType: 'text/plain',
  })

  expect(report.stepErrors.length, '极轴校准交互步骤存在失败，请查看附件 polar-axis-calibration-runtime-report').toBe(0)
  expect(report.pageErrors.length, '页面存在运行时异常，请查看附件 polar-axis-calibration-runtime-report').toBe(0)
}

test('9-极轴校准-连接设备并执行极轴校准', async ({ page }, testInfo) => {
  await runPolarAxisCalibrationTest(page, testInfo)
})
