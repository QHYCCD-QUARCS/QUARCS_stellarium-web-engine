/**
 * 导星镜（Guider）E2E 测试：QHYCCD 驱动，两种连接方式（INDI / SDK）
 *
 * 详细执行逻辑（按 runGuiderTest 的真实顺序）：
 * 1) 启动与初始清理：
 *    - 打开应用并等待界面 ready。
 *    - 打开菜单后执行 Disconnect All，确保起始状态一致。
 *
 * 2) INDI 模式回路：
 *    - 进入 Guider 子菜单，选择 QHYCCD 驱动，连接模式设为 INDI。
 *    - 点击连接并等待 connected；若出现设备分配面板则执行 Guider 绑定后继续等待。
 *    - 打开图表面板，启动循环曝光，运行 10 秒后停止。
 *
 * 3) 模式切换：
 *    - 进入 Guider 子菜单，断开当前连接并等待 disconnected。
 *    - 重新进入子菜单，切换到 SDK 模式，连接并等待 connected。
 *
 * 4) SDK 模式与稳定性循环：
 *    - 在 SDK 模式下执行一轮 10 秒循环曝光（开->运行->关）。
 *    - 继续执行 3 轮开关循环（每轮 10 秒）验证稳定性。
 *
 * 5) 收尾与断言：
 *    - 附加运行报告并断言 stepErrors=0、pageErrors=0。
 *
 * 参考：test001/1-general-settings-all-interactions.spec.ts、2-power-management-menu-and-dialogs.spec.ts
 * DOM：导星镜菜单项 ui-app-menu-device-Guider；循环按钮 ui-chart-component-btn-loop-exp-switch
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

const LOOP_RUN_SEC = 10
const GUIDER_DRIVER_MATCH = /indi_qhy_ccd|qhyccd|QHY CCD/i

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

async function clickLocatorWithFallback(
  page: Page,
  loc: ReturnType<Page['locator']>,
  timing: RunTiming,
  opts?: { timeoutMs?: number; requireStable?: boolean; allowKeyboardTriggerOnUnstable?: boolean },
) {
  const timeout = opts?.timeoutMs ?? 8_000
  const requireStable = opts?.requireStable ?? true
  const allowKeyboardTriggerOnUnstable = opts?.allowKeyboardTriggerOnUnstable ?? false
  await expect(loc).toBeVisible({ timeout })
  await expect(loc).toBeEnabled({ timeout })
  await loc.scrollIntoViewIfNeeded().catch(() => {})

  // 非 force 前提下的“未遮挡”检查：中心点命中当前元素或其子元素。
  if (!requireStable) {
    let unobscured = false
    for (let i = 0; i < 4; i++) {
      unobscured = await loc.evaluate((el) => {
        const target = el as HTMLElement
        const rect = target.getBoundingClientRect()
        const points = [
          [rect.left + rect.width / 2, rect.top + rect.height / 2], // center
          [rect.left + 4, rect.top + 4], // top-left
          [rect.right - 4, rect.top + 4], // top-right
          [rect.left + 4, rect.bottom - 4], // bottom-left
          [rect.right - 4, rect.bottom - 4], // bottom-right
        ]
        return points.some(([x, y]) => {
          const topEl = document.elementFromPoint(x, y)
          return !!topEl && (topEl === target || target.contains(topEl))
        })
      }).catch(() => false)
      if (unobscured) break
      await page.waitForTimeout(120)
    }
    if (!unobscured) {
      if (!allowKeyboardTriggerOnUnstable) throw new Error('目标元素命中区域被遮挡，取消点击')
      // 部分状态下按钮被动画层短暂覆盖，但焦点触发 Enter 仍可稳定切换。
      await loc.focus()
      await page.keyboard.press('Enter')
      await waitAfterAction(page, timing)
      return
    }
  }

  if (requireStable) {
    await loc.click({ timeout, trial: true })
  }
  try {
    await loc.click({ timeout })
  } catch (err) {
    const msg = shortError(err)
    if (!allowKeyboardTriggerOnUnstable || !/not stable/i.test(msg)) throw err
    await loc.focus()
    await page.keyboard.press('Enter')
  }
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
  lines.push('==== Guider QHYCCD 双连接 + 循环 测试报告 ====')
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
    await clickLocatorWithFallback(page, toggleBtn, timing, { timeoutMs: 10_000 })
    await expect(drawer).toHaveAttribute('data-state', 'open', { timeout: 10_000 })
  })
}

/** 关闭菜单抽屉，使主内容区与底部主切换按钮完全可见、可点击；仅当抽屉为 open 且切换按钮可见可点时点击，禁止 force。 */
async function ensureMenuDrawerClosed(page: Page, report: RuntimeReport, timing: RunTiming) {
  await addStep('menu.ensure-drawer-closed', report, async () => {
    const drawer = page.getByTestId('ui-app-menu-drawer').first()
    if ((await drawer.count()) === 0) return
    const state = await drawer.getAttribute('data-state').catch(() => '')
    if (state !== 'open') return
    const toggleBtn = page.getByTestId('tb-act-toggle-navigation-drawer').first()
    if ((await toggleBtn.count()) === 0) return
    await expect(toggleBtn).toBeVisible({ timeout: 5_000 })
    await expect(toggleBtn).toBeEnabled({ timeout: 2_000 })
    await toggleBtn.scrollIntoViewIfNeeded().catch(() => {})
    await clickLocatorWithFallback(page, toggleBtn, timing, { timeoutMs: 8_000 })
    await expect(drawer).toHaveAttribute('data-state', 'closed', { timeout: 8_000 })
    await waitShort(page, timing)
  })
}

async function cancelConfirmIfOpened(page: Page, report: RuntimeReport, timing: RunTiming, stepPrefix: string) {
  await addStep(`${stepPrefix}.confirm.cancel-if-opened`, report, async () => {
    const root = page.getByTestId('ui-confirm-dialog-root').first()
    if ((await root.count()) === 0) return
    if ((await root.getAttribute('data-state')) !== 'open') return
    const cancelBtn = page.getByTestId('ui-confirm-dialog-btn-cancel').first()
    await clickLocatorWithFallback(page, cancelBtn, timing)
    await expect(root).toHaveAttribute('data-state', 'closed', { timeout: 10_000 })
  })
}

async function confirmConfirmIfOpened(page: Page, report: RuntimeReport, timing: RunTiming, stepPrefix: string) {
  await addStep(`${stepPrefix}.confirm.confirm-if-opened`, report, async () => {
    const root = page.getByTestId('ui-confirm-dialog-root').first()
    if ((await root.count()) === 0) return
    if ((await root.getAttribute('data-state')) !== 'open') return
    const confirmBtn = page.getByTestId('ui-confirm-dialog-btn-confirm').first()
    await clickLocatorWithFallback(page, confirmBtn, timing)
    await expect(root).toHaveAttribute('data-state', 'closed', { timeout: 10_000 })
  })
}

async function disconnectAllWithConfirm(page: Page, report: RuntimeReport, timing: RunTiming) {
  await addStep('menu.disconnect-all.click', report, async () => {
    const btn = page.getByTestId('ui-app-menu-disconnect-all').first()
    await clickLocatorWithFallback(page, btn, timing)
  })
  await confirmConfirmIfOpened(page, report, timing, 'menu.disconnect-all')
  await waitShort(page, timing)
}

async function openGuiderSubmenu(page: Page, report: RuntimeReport, timing: RunTiming) {
  await addStep('menu.open-guider-submenu', report, async () => {
    const guiderItem = page.getByTestId('ui-app-menu-device-Guider').first()
    const drawer = page.getByTestId('ui-app-menu-drawer').first()
    const toggleBtn = page.getByTestId('tb-act-toggle-navigation-drawer').first()
    await guiderItem.waitFor({ state: 'attached', timeout: 12_000 })

    const maxRetries = 6
    for (let i = 0; i < maxRetries; i++) {
      if ((await drawer.count()) > 0) {
        const state = await drawer.getAttribute('data-state')
        if (state !== 'open') {
          await clickLocatorWithFallback(page, toggleBtn, timing, { timeoutMs: 10_000 })
          await expect(drawer).toHaveAttribute('data-state', 'open', { timeout: 8_000 })
        }
      }

      const drawerContent = drawer.locator('.v-navigation-drawer__content').first()
      if ((await drawerContent.count()) > 0) {
        await drawerContent.evaluate((el) => {
          ;(el as HTMLElement).scrollTop = 0
        }).catch(() => {})
      }
      await guiderItem.scrollIntoViewIfNeeded().catch(() => {})
      if (await guiderItem.isVisible().catch(() => false)) {
        await clickLocatorWithFallback(page, guiderItem, timing)
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
      await guiderItem.scrollIntoViewIfNeeded().catch(() => {})
      if (await guiderItem.isVisible().catch(() => false)) {
        await clickLocatorWithFallback(page, guiderItem, timing)
        const devicePage = page.getByTestId('ui-app-submenu-device-page').first()
        await expect(devicePage).toHaveAttribute('data-state', 'open', { timeout: 8_000 })
        return
      }

      if ((await drawer.count()) > 0 && (await toggleBtn.isVisible().catch(() => false))) {
        await clickLocatorWithFallback(page, toggleBtn, timing)
        await page.waitForTimeout(300)
        await clickLocatorWithFallback(page, toggleBtn, timing)
      }
    }

    await expect(guiderItem).toBeVisible({ timeout: 10_000 })
  })
}

async function selectDriverByLabel(page: Page, report: RuntimeReport, timing: RunTiming, labelMatch: RegExp) {
  await addStep('guider.select-driver', report, async () => {
    const select = page.getByTestId('ui-app-select-confirm-driver').first()
    await expect(select).toBeVisible({ timeout: 8_000 })

    const currentText = await select.textContent()
    if (currentText && labelMatch.test(currentText)) {
      console.log(`[SKIP] 驱动已选择: ${currentText.trim()}`)
      return
    }

    const maxRetries = 10
    for (let retry = 0; retry < maxRetries; retry++) {
      await clickLocatorWithFallback(page, select, timing)

      await page.waitForTimeout(350)
      const options = page.locator('[data-testid^="ui-app-select-confirm-driver-option-"]')
      const noDataItem = page.getByText(/No data available/i).first()
      if ((await noDataItem.count()) > 0) {
        console.log(`[RETRY ${retry + 1}/${maxRetries}] 驱动列表显示 "No data available"，等待数据加载...`)
        await page.keyboard.press('Escape')
        await page.waitForTimeout(1000)
        continue
      }

      const option = options.filter({ hasText: labelMatch }).first()
      if ((await option.count()) === 0) {
        console.log(`[RETRY ${retry + 1}/${maxRetries}] 未找到匹配驱动，等待...`)
        await page.keyboard.press('Escape')
        await page.waitForTimeout(1000)
        continue
      }

      await clickLocatorWithFallback(page, option, timing)
      return
    }

    throw new Error(`未找到匹配 "${labelMatch.source}" 的驱动选项（重试 ${maxRetries} 次后）`)
  })
}

async function selectConnectionMode(page: Page, report: RuntimeReport, timing: RunTiming, mode: 'INDI' | 'SDK') {
  await addStep(`guider.select-connection-mode-${mode}`, report, async () => {
    const select = page.getByTestId('ui-app-select-on-connection-mode-change').first()
    const probe = page.getByTestId('e2e-device-Guider-conn').first()
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

    await clickLocatorWithFallback(page, select, timing)

    const options = page.locator('[data-testid^="ui-app-select-connection-mode-option-"]')
    await expect(options.first()).toBeVisible({ timeout: 8_000 })
    const option = options.filter({ hasText: new RegExp(`^\\s*${mode}\\s*$`, 'i') }).first()
    if ((await option.count()) === 0) {
      await page.keyboard.press('Escape')
      throw new Error(`未找到连接模式选项：${mode}`)
    }
    await clickLocatorWithFallback(page, option, timing)
    await expect.poll(async () => {
      const probeMode = ((await probe.getAttribute('data-connection-mode').catch(() => '')) || '').trim()
      if (probeMode) return probeMode
      return await readLocatorDisplayText(select)
    }, { timeout: 8_000 }).toMatch(targetModeRegex)
  })
}

async function clickConnectGuider(page: Page, report: RuntimeReport, timing: RunTiming) {
  await addStep('guider.click-connect', report, async () => {
    // 确保处在“设备未连接”面板
    const panel = page.getByTestId('ui-app-device-connection-panel').first()
    if ((await panel.count()) > 0) await panel.scrollIntoViewIfNeeded().catch(() => {})

    const btn = page.getByTestId('ui-app-btn-connect-driver').first()

    for (let attempt = 0; attempt < 15; attempt++) {
      const visible = await btn.isVisible().catch(() => false)
      if (visible) {
        await clickLocatorWithFallback(page, btn, timing)
        return
      }
      console.log(`[WAIT ${attempt + 1}/15] 等待连接按钮出现...`)
      await page.waitForTimeout(1000)
    }

    throw new Error('连接按钮在 15 秒内未出现')
  })
}

async function waitGuiderConnected(page: Page, report: RuntimeReport, timeoutMs: number) {
  await addStep('guider.wait-connected', report, async () => {
    const probe = page.getByTestId('e2e-device-Guider-conn').first()
    await expect(probe).toHaveAttribute('data-state', 'connected', { timeout: timeoutMs })
  })
}

async function waitGuiderDisconnected(page: Page, report: RuntimeReport, timeoutMs: number) {
  await addStep('guider.wait-disconnected', report, async () => {
    const probe = page.getByTestId('e2e-device-Guider-conn').first()
    await expect(probe).toHaveAttribute('data-state', 'disconnected', { timeout: timeoutMs })
  })
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
  await clickLocatorWithFallback(page, targetPicker, timing)
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
  await clickLocatorWithFallback(page, firstDevice, timing)
  await waitShort(page, timing)

  const bindBtn = targetPicker.getByTestId('dp-btn-toggle-bind')
  const bindBtnState = await bindBtn.getAttribute('data-state')
  if (bindBtnState === 'unbound') {
    await expect(bindBtn).toBeVisible({ timeout: 5_000 })
    await clickLocatorWithFallback(page, bindBtn, timing)
    console.log(`[OK] 已点击 Bind 按钮绑定 ${targetRole}`)
    await waitAfterAction(page, timing)
  }

  await page.waitForTimeout(500)
  const closeBtn = page.getByTestId('dap-act-close-panel').first()
  if (await closeBtn.isVisible().catch(() => false)) {
    await clickLocatorWithFallback(page, closeBtn, timing)
    console.log(`[OK] 已关闭设备分配面板`)
    await waitAfterAction(page, timing)
  }
}

async function ensureChartPanelVisible(page: Page, report: RuntimeReport, timing: RunTiming) {
  await addStep('guider.ensure-chart-panel-visible', report, async () => {
    const chartRoot = page.getByTestId('ui-chart-component-root').first()
    const switchMain = page.getByTestId('gui-btn-switch-main-page').first()
    const toggleChart = page.getByTestId('gui-btn-toggle-charts-panel').first()
    const showCaptureBtn = page.getByTestId('gui-btn-show-capture-ui').first()
    const hideCaptureBtn = page.getByTestId('gui-btn-hide-capture-ui').first()
    const submenuDrawer = page.getByTestId('ui-app-submenu-drawer').first()

    // 先关闭菜单抽屉，确保主内容区与底部主切换按钮完全露出、可点击（禁止 force，仅可见可点时操作）
    await ensureMenuDrawerClosed(page, report, timing)
    await page.waitForTimeout(600)

    // 等待设备子抽屉（ui-app-submenu-drawer）关闭，否则会遮挡主内容区导致主切换按钮无法命中
    await expect(submenuDrawer).toHaveAttribute('data-state', 'closed', { timeout: 8_000 }).catch(async () => {
      if ((await submenuDrawer.getAttribute('data-state')) === 'open') {
        await switchMain.scrollIntoViewIfNeeded().catch(() => {})
        if (await switchMain.isVisible().catch(() => false)) {
          await clickLocatorWithFallback(page, switchMain, timing, { requireStable: false, allowKeyboardTriggerOnUnstable: true })
          await page.waitForTimeout(500)
        }
      }
    })
    await page.waitForTimeout(400)

    // 导星页就绪：当前主页面为 GuiderCamera 且图表面板可见（以 data-current-main-page 为准；图表面板有 transition 需轮询等待）
    const isGuiderPageReady = async () => {
      const currentPage = await switchMain.getAttribute('data-current-main-page').catch(() => '')
      if (currentPage !== 'GuiderCamera') return false
      const chartVisible = await chartRoot.isVisible().catch(() => false)
      if (chartVisible) return true
      const toggleChartVisible = await toggleChart.isVisible().catch(() => false)
      const showCaptureVisible = await showCaptureBtn.isVisible().catch(() => false)
      const hideCaptureVisible = await hideCaptureBtn.isVisible().catch(() => false)
      return !toggleChartVisible && !showCaptureVisible && !hideCaptureVisible
    }

    // 当已在 GuiderCamera 时，轮询等待图表面板 transition 结束变为可见（最多 6s）
    const waitForChartVisibleOnGuiderPage = async () => {
      for (let w = 0; w < 12; w++) {
        const currentPage = await switchMain.getAttribute('data-current-main-page').catch(() => '')
        if (currentPage !== 'GuiderCamera') return false
        if (await chartRoot.isVisible().catch(() => false)) return true
        await page.waitForTimeout(500)
      }
      return false
    }

    // 等待主切换按钮出现（关闭抽屉后可能需短暂渲染）
    await expect(switchMain).toBeVisible({ timeout: 12_000 })
    await switchMain.scrollIntoViewIfNeeded().catch(() => {})

    // 阶段 A：轮询触发主切换直到 data-current-main-page === 'GuiderCamera'（Stel -> MainCamera -> GuiderCamera 需 2 次）
    // 先尝试标准 click（可见、可点、未遮挡）；否则 focus + Enter；再否则 Tab 到按钮后 Enter
    await expect.poll(async () => {
      const current = await switchMain.getAttribute('data-current-main-page').catch(() => '')
      if (current === 'GuiderCamera') return true
      if ((await switchMain.count()) === 0) return false
      const visible = await switchMain.isVisible().catch(() => false)
      const enabled = visible && (await switchMain.isEnabled().catch(() => false))
      if (!visible || !enabled) {
        await page.waitForTimeout(300)
        return false
      }
      await switchMain.scrollIntoViewIfNeeded().catch(() => {})
      const unobscured = await switchMain.evaluate((el) => {
        const target = el as HTMLElement
        const rect = target.getBoundingClientRect()
        const [x, y] = [rect.left + rect.width / 2, rect.top + rect.height / 2]
        const topEl = document.elementFromPoint(x, y)
        return !!topEl && (topEl === target || target.contains(topEl))
      }).catch(() => false)
      if (unobscured) {
        await switchMain.click({ timeout: 5_000 }).catch(() => {})
      } else {
        await switchMain.focus().catch(() => {})
        await page.keyboard.press('Enter')
        const focusedTestId = await page.evaluate(() => {
          const el = document.activeElement
          return el?.getAttribute?.('data-testid') ?? ''
        }).catch(() => '')
        if (focusedTestId !== 'gui-btn-switch-main-page') {
          for (let t = 0; t < 15; t++) {
            await page.keyboard.press('Tab')
            await page.waitForTimeout(80)
            const id = await page.evaluate(() => document.activeElement?.getAttribute?.('data-testid') ?? '').catch(() => '')
            if (id === 'gui-btn-switch-main-page') break
          }
          await page.keyboard.press('Enter')
        }
      }
      await waitShort(page, timing)
      await page.waitForTimeout(600)
      return (await switchMain.getAttribute('data-current-main-page').catch(() => '')) === 'GuiderCamera'
    }, { timeout: 25_000 }).toBeTruthy()

    // 阶段 B：已在 GuiderCamera，等待图表面板 transition 后可见
    const chartOk = await waitForChartVisibleOnGuiderPage()
    if (chartOk) return
    await expect.poll(async () => await isGuiderPageReady(), { timeout: 8_000 }).toBeTruthy()
  })
}

async function startLoopExposure(page: Page, report: RuntimeReport, timing: RunTiming, stepLabel: string) {
  await addStep(stepLabel, report, async () => {
    const btn = page.getByTestId('ui-chart-component-btn-loop-exp-switch').first()

    for (let attempt = 0; attempt < 10; attempt++) {
      const visible = await btn.isVisible().catch(() => false)
      if (!visible) {
        console.log(`[WAIT ${attempt + 1}/10] 等待循环拍摄按钮出现...`)
        await page.waitForTimeout(500)
        continue
      }

      const state = await btn.getAttribute('data-state').catch(() => 'off')
      if (state === 'on') {
        console.log(`[OK] 循环拍摄已在运行中`)
        return
      }

      await clickLocatorWithFallback(page, btn, timing, {
        requireStable: false,
        allowKeyboardTriggerOnUnstable: true,
      })
      await page.waitForTimeout(1000)

      for (let check = 0; check < 5; check++) {
        const stateAfter = await btn.getAttribute('data-state').catch(() => 'off')
        if (stateAfter === 'on') {
          console.log(`[OK] 循环拍摄已开启: ${state} -> ${stateAfter}`)
          await waitAfterAction(page, timing)
          return
        }
        await page.waitForTimeout(500)
      }

      console.log(`[RETRY ${attempt + 1}/10] 点击后状态未变为 on，重试...`)
    }

    throw new Error('循环拍摄按钮点击后未能开启')
  })
}

async function stopLoopExposure(page: Page, report: RuntimeReport, timing: RunTiming, stepLabel: string) {
  await addStep(stepLabel, report, async () => {
    const btn = page.getByTestId('ui-chart-component-btn-loop-exp-switch').first()

    for (let attempt = 0; attempt < 10; attempt++) {
      const visible = await btn.isVisible().catch(() => false)
      if (!visible) {
        console.log(`[WAIT ${attempt + 1}/10] 等待循环拍摄按钮出现...`)
        await page.waitForTimeout(500)
        continue
      }

      const state = await btn.getAttribute('data-state').catch(() => 'off')
      if (state === 'off') {
        console.log(`[OK] 循环拍摄已停止`)
        return
      }

      await clickLocatorWithFallback(page, btn, timing, {
        requireStable: false,
        allowKeyboardTriggerOnUnstable: true,
      })
      await page.waitForTimeout(1000)

      for (let check = 0; check < 5; check++) {
        const stateAfter = await btn.getAttribute('data-state').catch(() => 'on')
        if (stateAfter === 'off') {
          console.log(`[OK] 循环拍摄已停止: ${state} -> ${stateAfter}`)
          await waitAfterAction(page, timing)
          return
        }
        await page.waitForTimeout(500)
      }

      console.log(`[RETRY ${attempt + 1}/10] 点击后状态未变为 off，重试...`)
    }

    throw new Error('循环拍摄按钮点击后未能停止')
  })
}

async function runLoopForSeconds(page: Page, report: RuntimeReport, timing: RunTiming, seconds: number) {
  await addStep(`guider.loop-wait-${seconds}s`, report, async () => {
    await page.waitForTimeout(seconds * 1000)
  })
}

async function clickDisconnectCurrentDevice(page: Page, report: RuntimeReport, timing: RunTiming) {
  await addStep('guider.click-disconnect', report, async () => {
    const btn = page.getByTestId('ui-app-btn-disconnect-driver').first()
    if ((await btn.count()) === 0) return
    if (!(await btn.isVisible().catch(() => false))) return
    await clickLocatorWithFallback(page, btn, timing)
  })
  await confirmConfirmIfOpened(page, report, timing, 'guider.disconnect')
}

async function runGuiderTest(page: Page, testInfo: TestInfo) {
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
  testInfo.setTimeout(Math.max(testTimeoutMs, 4 * 60_000))

  // 阶段 1：应用启动与初始清理
  await addStep('boot.goto-app', report, async () => {
    await page.goto(getAppStartPath(), { waitUntil: 'load', timeout: stepTimeoutMs })
    await waitAfterAction(page, timing)
  })
  await waitForAppLoaded100(page, report, timing, stepTimeoutMs)

  await ensureMenuDrawerOpen(page, report, timing)
  await disconnectAllWithConfirm(page, report, timing)
  await waitShort(page, timing)

  // 阶段 2：INDI 模式连接与循环曝光
  await openGuiderSubmenu(page, report, timing)

  await selectDriverByLabel(page, report, timing, GUIDER_DRIVER_MATCH)
  await selectConnectionMode(page, report, timing, 'INDI')
  await clickConnectGuider(page, report, timing)
  await waitForConnectionOrAllocation(page, report, timing, 'Guider', connectWaitMs)

  await ensureChartPanelVisible(page, report, timing)
  await startLoopExposure(page, report, timing, 'guider.loop-exp.on-indi')
  await runLoopForSeconds(page, report, timing, LOOP_RUN_SEC)
  await stopLoopExposure(page, report, timing, 'guider.loop-exp.off-indi')

  // 阶段 3：断开并切换到 SDK 模式
  await ensureMenuDrawerOpen(page, report, timing)
  await openGuiderSubmenu(page, report, timing)
  await clickDisconnectCurrentDevice(page, report, timing)
  await waitGuiderDisconnected(page, report, connectWaitMs)
  await waitShort(page, timing)

  await ensureMenuDrawerOpen(page, report, timing)
  await openGuiderSubmenu(page, report, timing)
  await selectConnectionMode(page, report, timing, 'SDK')
  await clickConnectGuider(page, report, timing)
  await waitForConnectionOrAllocation(page, report, timing, 'Guider', connectWaitMs)

  // 阶段 4：SDK 模式循环曝光 + 三轮稳定性开关
  await ensureChartPanelVisible(page, report, timing)
  await startLoopExposure(page, report, timing, 'guider.loop-exp.on-sdk')
  await runLoopForSeconds(page, report, timing, LOOP_RUN_SEC)
  await stopLoopExposure(page, report, timing, 'guider.loop-exp.off-sdk')

  for (let i = 0; i < 3; i++) {
    await startLoopExposure(page, report, timing, `guider.loop-exp.on-cycle-${i + 1}`)
    await runLoopForSeconds(page, report, timing, LOOP_RUN_SEC)
    await stopLoopExposure(page, report, timing, `guider.loop-exp.off-cycle-${i + 1}`)
    await waitShort(page, timing)
  }

  // 阶段 5：收尾与断言
  const reportText = buildReportText(report)
  console.log(reportText)
  await testInfo.attach('guider-qhyccd-runtime-report', {
    body: reportText,
    contentType: 'text/plain',
  })

  expect(
    report.stepErrors.length,
    '导星镜 QHYCCD 双连接与循环步骤存在失败，请查看附件 guider-qhyccd-runtime-report',
  ).toBe(0)
  expect(
    report.pageErrors.length,
    '页面存在运行时异常，请查看附件 guider-qhyccd-runtime-report',
  ).toBe(0)
}

test('3-导星镜-QHYCCD双连接与循环启停三次', async ({ page }, testInfo) => {
  await runGuiderTest(page, testInfo)
})
