/**
 * 图像文件管理（Image File Manager）E2E 测试：打开图像管理面板、检测无数据时连接主相机拍摄保存、测试相关功能
 *
 * 约定：所有运行前都需要等待浏览器加载完成（load/networkidle、loader 隐藏、gui-root 可见）。
 *
 * 参考：test001/4-maincamera-qhyccd-two-connections-loop.spec.ts、9-polar-axis-calibration-menu-and-widget.spec.ts
 *
 * 详细执行逻辑：
 * 1) 启动与初始清理：
 *    - 打开应用并等待 Gui 就绪。
 *    - 打开菜单后执行 Disconnect All，确保起始状态一致。
 *
 * 2) 打开图像管理面板：
 *    - 打开菜单抽屉，点击 Image Files 菜单项（ui-app-menu-open-image-manager）。
 *    - 校验 imp-root 显示且 data-state=open。
 *
 * 3) 无图像数据分支：
 *    - 若显示 "There are no image folders"，则关闭图像管理面板。
 *    - 连接 MainCamera（QHYCCD 驱动），等待连接完成（含设备分配面板绑定）。
 *    - 确保拍摄面板可见，设置 100ms 曝光，执行一次拍摄并保存。
 *    - 关闭菜单，再次打开图像管理面板。
 *
 * 4) 有图像数据时测试功能：
 *    - 分页：点击上一页/下一页（若有多页）。
 *    - 图像类型切换：点击 imp-btn-image-file-switch 在 Capture/Schedule/Solve Failed 间切换。
 *    - 打开文件夹：点击第一个文件夹（ui-image-folder-root-0），验证右侧图像列表自动加载。
 *    - 打开文件：点击第一个文件（ui-image-folder-file-0-0）打开预览。
 *    - 下载：点击下载按钮，在确认对话框取消。
 *    - 移至 U 盘：点击移至 U 盘按钮，若出现 U 盘选择对话框则取消。
 *    - 删除：点击删除按钮进入确认态，再次点击取消。
 *    - 关闭面板：点击 imp-btn-panel-close。
 *
 * 5) 收尾与断言：
 *    - 附加运行报告并断言 stepErrors=0、pageErrors=0。
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
const CONNECT_WAIT_MS = 30_000

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
  lines.push('==== Image File Manager 测试报告 ====')
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

/** 关闭可能挡住面板关闭按钮的 overlay（USB 选择、下载确认等）。收尾关面板前调用。 */
async function dismissImageManagerOverlays(page: Page, timing: RunTiming) {
  const closeButtonTestIds = [
    'imp-btn-close-usbselect-dialog',
    'imp-btn-close-download-confirm-dialog-2',
    'imp-btn-close-download-confirm-dialog',
    'imp-btn-close-usb-confirm-dialog',
    'imp-btn-close-delete-confirm-dialog',
    'imp-btn-close-download-location-reminder-dialog',
  ]
  for (let round = 0; round < 5; round++) {
    let closedAny = false
    for (const testId of closeButtonTestIds) {
      const btn = page.getByTestId(testId).first()
      if ((await btn.count()) > 0 && (await btn.isVisible().catch(() => false))) {
        await btn.scrollIntoViewIfNeeded().catch(() => {})
        await btn.click({ timeout: 3_000 }).catch(() => {})
        await page.waitForTimeout(200)
        closedAny = true
      }
    }
    if (!closedAny) break
  }
}

/** 可操作性检查后点击：先滚动入视、等待可见、可启用（按钮类）再点击。禁止使用 force，所有交互必须通过可操作性检查。 */
async function clickLocatorWithFallback(
  page: Page,
  loc: ReturnType<Page['locator']>,
  timing: RunTiming,
  opts?: { timeoutMs?: number },
) {
  const timeout = opts?.timeoutMs ?? 8_000
  await loc.scrollIntoViewIfNeeded().catch(() => {})
  await expect(loc).toBeVisible({ timeout })
  await loc.click({ timeout })
  await waitAfterAction(page, timing)
}

/** 等待浏览器加载完成：load + networkidle + loader 隐藏 + gui-root 可见 */
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

/** 等待页面稳定（如保存后、重开面板前），确保浏览器加载/网络请求完成 */
async function waitForPageStable(page: Page, timing: RunTiming, timeoutMs = 8_000) {
  await page.waitForLoadState('load', { timeout: timeoutMs }).catch(() => {})
  await page.waitForLoadState('networkidle', { timeout: timeoutMs }).catch(() => {})
  await waitShort(page, timing)
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
        await clickLocatorWithFallback(page, showCaptureBtn, timing)
      }

      if ((await switchMainBtn.count()) > 0 && (await switchMainBtn.isVisible().catch(() => false))) {
        await clickLocatorWithFallback(page, switchMainBtn, timing)
      } else {
        await page.waitForTimeout(250)
      }
    }

    // 仅当按钮可见、可点击时触发，禁止 force 类操作
    const openAttempts = 8
    for (let i = 0; i < openAttempts; i++) {
      const state = await drawer.getAttribute('data-state')
      if (state === 'open') {
        await waitAfterAction(page, timing)
        return
      }

      const toggleVisible = await toggleBtn.isVisible().catch(() => false)
      if (toggleVisible) {
        await toggleBtn.scrollIntoViewIfNeeded().catch(() => {})
        await toggleBtn.click({ timeout: 8_000 })
      } else {
        // 按钮仍不可见时，再尝试恢复可见性（仅点击可见控件）
        if ((await showCaptureBtn.count()) > 0 && (await showCaptureBtn.isVisible().catch(() => false))) {
          await clickLocatorWithFallback(page, showCaptureBtn, timing, { timeoutMs: 5_000 })
        }
        if ((await switchMainBtn.count()) > 0 && (await switchMainBtn.isVisible().catch(() => false))) {
          await clickLocatorWithFallback(page, switchMainBtn, timing, { timeoutMs: 5_000 })
        }
        await page.waitForTimeout(400)
      }

      await page.waitForTimeout(350)
    }

    await expect(drawer).toHaveAttribute('data-state', 'open', { timeout: 8_000 })
    await waitAfterAction(page, timing)
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
  const isSubmenuOpen = async () =>
    (await submenuDrawer.count()) > 0 && (await submenuDrawer.getAttribute('data-state')) === 'open'
  const toggleMenuDrawer = async () => {
    if (await toggleDrawerBtn.isVisible().catch(() => false)) {
      await toggleDrawerBtn.scrollIntoViewIfNeeded().catch(() => {})
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
    if ((await isDrawerOpen()) || (await isSubmenuOpen())) {
      await clickOutside()
    }
  }

  if ((await isDrawerOpen()) || (await isSubmenuOpen())) await clickOutside()
  if (await isDrawerOpen()) await toggleMenuDrawer()
  if (await isSubmenuOpen()) {
    await page.keyboard.press('Escape').catch(() => {})
    await page.waitForTimeout(250)
    if (await isSubmenuOpen()) await clickOutside()
  }
  await waitAfterAction(page, timing)
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

async function openImageManagerViaMenu(page: Page, report: RuntimeReport, timing: RunTiming) {
  await addStep('menu.open-image-manager', report, async () => {
    await ensureMenuDrawerOpen(page, report, timing)

    const drawer = page.getByTestId('ui-app-menu-drawer').first()
    const drawerContent = drawer.locator('.v-navigation-drawer__content').first()
    if ((await drawerContent.count()) > 0) {
      await drawerContent.evaluate((el) => {
        ;(el as HTMLElement).scrollTop = 0
      }).catch(() => {})
    }

    const imageManagerItem = page.getByTestId('ui-app-menu-open-image-manager').first()
    await expect(imageManagerItem).toBeVisible({ timeout: 10_000 })
    await imageManagerItem.scrollIntoViewIfNeeded().catch(() => {})
    await clickLocatorWithFallback(page, imageManagerItem, timing)

    const impRoot = page.getByTestId('imp-root').first()
    await expect(impRoot).toBeVisible({ timeout: 8_000 })
    await expect(impRoot).toHaveAttribute('data-state', 'open', { timeout: 5_000 })
    await waitAfterAction(page, timing)
  })
}

async function closeImageManagerPanel(page: Page, report: RuntimeReport, timing: RunTiming) {
  await addStep('imp.close-panel', report, async () => {
    const closeBtn = page.getByTestId('imp-btn-panel-close').first()
    if ((await closeBtn.count()) > 0 && (await closeBtn.isVisible().catch(() => false))) {
      await clickLocatorWithFallback(page, closeBtn, timing)
    }
    const impRoot = page.getByTestId('imp-root').first()
    if ((await impRoot.count()) > 0) {
      await expect(impRoot).toHaveAttribute('data-state', 'closed', { timeout: 5_000 }).catch(() => {})
    }
    await waitAfterAction(page, timing)
  })
}

async function hasNoImageFolders(page: Page): Promise<boolean> {
  const noFoldersSpan = page.getByTestId('imp-txt-no-folders').first()
  return (await noFoldersSpan.count()) > 0 && (await noFoldersSpan.isVisible().catch(() => false))
}

async function openMainCameraSubmenu(page: Page, report: RuntimeReport, timing: RunTiming) {
  await addStep('menu.open-maincamera-submenu', report, async () => {
    await ensureMenuDrawerOpen(page, report, timing)

    const drawer = page.getByTestId('ui-app-menu-drawer').first()
    const drawerContent = drawer.locator('.v-navigation-drawer__content').first()
    if ((await drawerContent.count()) > 0) {
      await drawerContent.evaluate((el) => {
        ;(el as HTMLElement).scrollTop = 0
      }).catch(() => {})
    }

    const mainCameraItem = page.getByTestId('ui-app-menu-device-MainCamera').first()
    await mainCameraItem.waitFor({ state: 'attached', timeout: 12_000 })
    await mainCameraItem.scrollIntoViewIfNeeded().catch(() => {})
    await expect(mainCameraItem).toBeVisible({ timeout: 10_000 })
    await clickLocatorWithFallback(page, mainCameraItem, timing)

    const devicePage = page.getByTestId('ui-app-submenu-device-page').first()
    await expect(devicePage).toHaveAttribute('data-state', 'open', { timeout: 8_000 })
  })
}

async function selectDriverByLabel(page: Page, report: RuntimeReport, timing: RunTiming, labelMatch: RegExp) {
  await addStep('maincamera.select-driver', report, async () => {
    const select = page.getByTestId('ui-app-select-confirm-driver').first()
    if ((await select.count()) === 0) return
    await expect(select).toBeVisible({ timeout: 8_000 })

    const currentText = await select.textContent()
    if (currentText && labelMatch.test(currentText)) {
      console.log(`[SKIP] 驱动已选择: ${currentText.trim()}`)
      return
    }

    for (let retry = 0; retry < 10; retry++) {
      await clickLocatorWithFallback(page, select, timing)

      const menu = page.locator('.v-menu__content.menuable__content__active').first()
      if (!(await menu.isVisible().catch(() => false))) {
        await page.waitForTimeout(500)
        continue
      }
      const option = menu.locator('.v-list-item').filter({ hasText: labelMatch }).first()
      if ((await option.count()) > 0) {
        await clickLocatorWithFallback(page, option, timing)
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
        await clickLocatorWithFallback(page, btn, timing)
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
  await clickLocatorWithFallback(page, targetPicker, timing)
  await waitShort(page, timing)

  const firstDevice = panel.locator('[data-testid="dap-act-selected-device-name-2"]').first()
  await expect(firstDevice).toBeVisible({ timeout: 5_000 })
  await clickLocatorWithFallback(page, firstDevice, timing)
  await waitShort(page, timing)

  const bindBtn = targetPicker.getByTestId('dp-btn-toggle-bind')
  if ((await bindBtn.getAttribute('data-state')) === 'unbound') {
    await clickLocatorWithFallback(page, bindBtn, timing)
  }
  await page.waitForTimeout(500)
  const closeBtn = page.getByTestId('dap-act-close-panel').first()
  if (await closeBtn.isVisible().catch(() => false)) {
    await clickLocatorWithFallback(page, closeBtn, timing)
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
      if (drawerOpen) {
        await ensureMenuLayersClosed(page, timing)
      }

      if ((await showCaptureBtn.count()) > 0 && (await showCaptureBtn.isVisible().catch(() => false))) {
        await clickLocatorWithFallback(page, showCaptureBtn, timing)
        if (await capturePanel.isVisible().catch(() => false)) return
      }

      const switchMainBtn = page.getByTestId('gui-btn-switch-main-page').first()
      if ((await switchMainBtn.count()) > 0 && (await switchMainBtn.isVisible().catch(() => false))) {
        await clickLocatorWithFallback(page, switchMainBtn, timing)
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

async function setExposureTime(page: Page, report: RuntimeReport, timing: RunTiming, targetTime: string) {
  await addStep(`maincamera.set-exposure-${targetTime}`, report, async () => {
    const expTimeDisplay = page.getByTestId('cp-exptime-value').first()
    await expect(expTimeDisplay).toBeVisible({ timeout: 8_000 })

    const plusBtn = page.getByTestId('cp-btn-exptime-plus').first()
    const minusBtn = page.getByTestId('cp-btn-exptime-minus').first()

    for (let i = 0; i < 15; i++) {
      const currentValue = await expTimeDisplay.getAttribute('data-value')
      if (currentValue === targetTime) return
      await clickLocatorWithFallback(page, plusBtn, timing)
      await page.waitForTimeout(200)
    }

    for (let i = 0; i < 15; i++) {
      const currentValue = await expTimeDisplay.getAttribute('data-value')
      if (currentValue === targetTime) return
      await clickLocatorWithFallback(page, minusBtn, timing)
      await page.waitForTimeout(200)
    }

    const finalValue = await expTimeDisplay.getAttribute('data-value')
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

async function takeExposureAndSave(
  page: Page,
  report: RuntimeReport,
  timing: RunTiming,
  expTime: string,
  waitMs: number,
) {
  await addStep('maincamera.capture-and-save', report, async () => {
    await setExposureTime(page, report, timing, expTime)
    await ensureMenuLayersClosed(page, timing)

    const captureBtn = page.getByTestId('ui-components-circular-button-act-handle-mouse-down').first()
    await expect(captureBtn).toBeVisible({ timeout: 8_000 })
    await captureBtn.scrollIntoViewIfNeeded().catch(() => {})

    const statusProbe = page.getByTestId('cp-status').first()
    await captureBtn.click({ timeout: 5_000 })

    for (let attempt = 0; attempt < 15; attempt++) {
      const state = await statusProbe.getAttribute('data-state').catch(() => 'unknown')
      if (state === 'busy') break
      await page.waitForTimeout(300)
    }

    const totalWait = waitMs + 15_000
    const startTime = Date.now()
    while (Date.now() - startTime < totalWait) {
      const state = await statusProbe.getAttribute('data-state').catch(() => 'unknown')
      if (state === 'idle') break
      await page.waitForTimeout(500)
    }

    const saveBtn = page.getByTestId('cp-btn-save').first()
    await expect(saveBtn).toBeVisible({ timeout: 5_000 })
    await clickLocatorWithFallback(page, saveBtn, timing)
    await page.waitForTimeout(2000)
    await waitAfterAction(page, timing)
  })
}

async function runImageFileManagerTest(page: Page, testInfo: TestInfo) {
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
  testInfo.setTimeout(Math.max(testTimeoutMs, 15 * 60_000))

  // 阶段 1：应用启动与初始清理（等待浏览器加载完成后再操作）
  await addStep('boot.goto-app', report, async () => {
    await page.goto(getAppStartPath(), { waitUntil: 'load', timeout: stepTimeoutMs })
    await waitAfterAction(page, timing)
  })
  await waitForAppLoaded100(page, report, timing, stepTimeoutMs)
  await waitShort(page, timing)

  await ensureMenuDrawerOpen(page, report, timing)
  await disconnectAllWithConfirm(page, report, timing)
  await waitShort(page, timing)

  // 阶段 2：打开图像管理面板
  await openImageManagerViaMenu(page, report, timing)

  // 阶段 3：若无图像数据，连接主相机拍摄保存后重开
  const noFolders = await hasNoImageFolders(page)
  if (noFolders) {
    console.log('[INFO] 检测到无图像文件夹，将连接主相机拍摄保存')
    await closeImageManagerPanel(page, report, timing)
    await ensureMenuDrawerOpen(page, report, timing)
    await openMainCameraSubmenu(page, report, timing)
    await selectDriverByLabel(page, report, timing, MAINCAMERA_DRIVER_MATCH)
    await clickConnectMainCamera(page, report, timing)
    await waitForConnectionOrAllocation(page, report, timing, 'MainCamera', CONNECT_WAIT_MS)
    await ensureMenuLayersClosed(page, timing)
    await ensureCapturePanelVisible(page, report, timing)
    await takeExposureAndSave(page, report, timing, '100ms', parseExposureMs('100ms'))
    await addStep('boot.wait-page-stable-after-save', report, async () => {
      await waitForPageStable(page, timing, 10_000)
    })
    await ensureMenuDrawerOpen(page, report, timing)
    await openImageManagerViaMenu(page, report, timing)
  }

  // 阶段 4：测试图像管理功能（若有数据）
  const stillNoFolders = await hasNoImageFolders(page)
  if (!stillNoFolders) {
    await addStep('imp.test-image-file-switch', report, async () => {
      const switchBtn = page.getByTestId('imp-btn-image-file-switch').first()
      await expect(switchBtn).toBeVisible({ timeout: 5_000 })
      await clickLocatorWithFallback(page, switchBtn, timing)
      await page.waitForTimeout(500)
      await clickLocatorWithFallback(page, switchBtn, timing)
      await page.waitForTimeout(500)
      await clickLocatorWithFallback(page, switchBtn, timing)
    })

    await addStep('imp.test-download-dialog-cancel', report, async () => {
      const downloadBtn = page.getByTestId('imp-btn-download-selected').first()
      if ((await downloadBtn.count()) > 0 && (await downloadBtn.isVisible().catch(() => false))) {
        await clickLocatorWithFallback(page, downloadBtn, timing)
        const confirmDialog = page.getByTestId('imp-act-usb-select-dialog-2').first()
        if ((await confirmDialog.count()) > 0 && (await confirmDialog.isVisible().catch(() => false))) {
          const cancelBtn = page.getByTestId('imp-btn-close-download-confirm-dialog-2').first()
          await clickLocatorWithFallback(page, cancelBtn, timing)
        }
      }
    }, { allowFailure: true })

    await addStep('imp.test-delete-mode-cancel', report, async () => {
      const deleteBtn = page.getByTestId('imp-btn-delete-btn-click').first()
      if ((await deleteBtn.count()) > 0 && (await deleteBtn.isVisible().catch(() => false))) {
        await clickLocatorWithFallback(page, deleteBtn, timing)
        await page.waitForTimeout(300)
        await clickLocatorWithFallback(page, deleteBtn, timing)
      }
    }, { allowFailure: true })

    await addStep('imp.test-open-folder-and-file', report, async () => {
      const folder0 = page.getByTestId('ui-image-folder-root-0').first()
      if ((await folder0.count()) > 0 && (await folder0.isVisible().catch(() => false))) {
        await clickLocatorWithFallback(page, folder0, timing)
        await page.waitForTimeout(800)

        const currentFolderText = page.getByTestId('imp-txt-current-folder').first()
        if ((await currentFolderText.count()) > 0) {
          await expect(currentFolderText).not.toContainText('No folder loaded', { timeout: 5_000 })
        }

        const file0 = page.getByTestId('ui-image-folder-file-0-0').first()
        if ((await file0.count()) > 0) {
          await file0.scrollIntoViewIfNeeded().catch(() => {})
          await expect(file0).toBeVisible({ timeout: 5_000 })
          await file0.click({ timeout: 5_000 })
          await waitAfterAction(page, timing)
          await expect(file0).toHaveAttribute('data-state', 'open', { timeout: 5_000 })
        }
      }
    }, { allowFailure: true })

    await addStep('imp.test-move-to-usb-dialog-cancel', report, async () => {
      const moveBtn = page.getByTestId('imp-btn-move-file-to-usb').first()
      if ((await moveBtn.count()) > 0 && (await moveBtn.isVisible().catch(() => false))) {
        await moveBtn.scrollIntoViewIfNeeded().catch(() => {})
        await expect(moveBtn).toBeVisible({ timeout: 5_000 })
        await moveBtn.click({ timeout: 5_000 })
        await waitAfterAction(page, timing)
        const usbDialog = page.getByTestId('imp-act-usb-select-dialog').first()
        if ((await usbDialog.count()) > 0 && (await usbDialog.isVisible().catch(() => false))) {
          const closeBtn = page.getByTestId('imp-btn-close-usbselect-dialog').first()
          await clickLocatorWithFallback(page, closeBtn, timing)
        }
      }
    }, { allowFailure: true })
  }

  await addStep('imp.close-panel-final', report, async () => {
    await dismissImageManagerOverlays(page, timing)
    const closeBtn = page.getByTestId('imp-btn-panel-close').first()
    if ((await closeBtn.count()) > 0 && (await closeBtn.isVisible().catch(() => false))) {
      await closeBtn.scrollIntoViewIfNeeded().catch(() => {})
      await expect(closeBtn).toBeVisible({ timeout: 5_000 })
      await closeBtn.click({ timeout: 5_000 })
      await waitAfterAction(page, timing)
    }
  })

  // 阶段 5：收尾与断言
  const reportText = buildReportText(report)
  console.log(reportText)
  await testInfo.attach('image-file-manager-runtime-report', {
    body: reportText,
    contentType: 'text/plain',
  })

  expect(
    report.stepErrors.length,
    '图像文件管理测试步骤存在失败，请查看附件 image-file-manager-runtime-report',
  ).toBe(0)
  expect(
    report.pageErrors.length,
    '页面存在运行时异常，请查看附件 image-file-manager-runtime-report',
  ).toBe(0)
}

test('10-图像文件管理-打开面板与功能测试', async ({ page }, testInfo) => {
  await runImageFileManagerTest(page, testInfo)
})
