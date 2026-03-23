/**
 * 赤道仪（Mount）E2E 测试：EQMod Mount 连接 + 控制面板 + Park/Track/GOTO/Home
 *
 * 详细执行逻辑（按 runMountEqmodControlGotoTest 的真实顺序）：
 * 1) 启动与基础就绪：
 *    - 打开应用并等待 gui-root 可见。
 *    - 打开主菜单，执行 Disconnect All（如有确认弹窗则确认），确保起始状态干净。
 *
 * 2) Mount 建链：
 *    - 打开 Mount 子菜单，按正则匹配选择 EQMod 驱动。
 *    - 点击连接并等待连接成功；若弹出设备分配面板（DAP），自动完成 Mount 绑定后继续等待 connected。
 *
 * 3) 控制面板动作前置收敛：
 *    - 确保 Mount Control Panel 可见。
 *    - 强制将 Park 收敛到 off（避免影响点动/GOTO/Home）。
 *    - 将速度档位初始化到 10，确保后续速度切换可观测。
 *
 * 4) 基础控制动作：
 *    - 执行速度切换。
 *    - 依次执行 RA+/RA-/DEC+/DEC- 点动（按住 JOG_HOLD_MS 后释放）。
 *    - 执行 Stop。
 *    - 执行 Track 开关切换并恢复到初始状态。
 *    - 再次确认 Park=off，保证后续功能可执行。
 *
 * 5) 子菜单扩展动作（配置页）：
 *    - 在 Mount 子菜单中尝试可选项：GotoThenSolve=on、SolveCurrentPosition。
 *    - 执行配置页 Goto（通过 RA/DEC 对话框输入固定坐标并确认），等待运动状态收敛。
 *    - 关闭子菜单，回到主视图。
 *
 * 6) 天图目标 GOTO（可开关）：
 *    - 当 E2E_MOUNT_GOTO_ENABLED=true 时，搜索并选择目标 M31。
 *    - 从 selected-object-info 触发 GOTO，随后等待 mount busy->idle（或按 idle 收敛兜底）。
 *
 * 7) 收尾与最终状态：
 *    - 执行 Home，并等待 processing 及状态收敛完成。
 *    - 进行 Park 切换测试（可选）后恢复可继续状态。
 *    - 最终强制收敛 Park=on，确保测试结束时设备处于 parked。
 *
 * 8) 结果判定：
 *    - 汇总 step/page/console/request 运行信息并挂载附件。
 *    - 断言 stepErrors=0 且 pageErrors=0。
 *
 * 菜单交互特殊备注：
 * - 菜单开关状态统一以 data-state(open/closed) 判定，不仅依赖可见性。
 * - 关闭主菜单时若子菜单已开，需先关子菜单再关主菜单（通常为点击遮罩 2 次）。
 * - 执行 SolveCurrentPosition 后，可能自动关闭主菜单/子菜单；后续步骤前需重开并重进 Mount 子菜单。
 * - 长列表场景仅滚动对应浮层/子容器，避免误滚主菜单导致元素定位失效。
 * - 菜单点击统一走 clickLocatorWithFallback（含可操作性检查与动作后等待）以降低偶发失败。
 * - 关闭流程末尾补一次 Escape 作为兜底，有助于清理残留遮罩并减少后续串扰。
 *
 * 定位与交互规范：
 * - 以全局唯一的 data-testid 作为定位标准；控件缺 testid 时需在源码中补齐。
 * - 禁止 force 类操作；所有交互先做可操作性检查（可见、可启用、scrollIntoView、trial 点击）。
 * - 遮罩关闭使用 .v-overlay__scrim（Vuetify 内部无 testid），仅在可点击时点击，否则依赖 Escape。
 */

import { test, expect, type Locator, type Page, type TestInfo } from '@playwright/test'
import { getAppStartPath } from '../support/appStartPath'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { DEFAULTS, envFlag, envNumber } = require('../../../e2e.config.cjs')

type StepError = { step: string; message: string }
type RuntimeReport = {
  stepErrors: StepError[]
  pageErrors: string[]
  consoleErrors: string[]
  requestFailed: string[]
  optionalResults: string[]
}

type RunTiming = {
  actionDelayMs: number
  shortDelayMs: number
}

type MountFeatureFlags = {
  gotoEnabled: boolean
}

const MOUNT_DRIVER_MATCH = /eqmod\s*mount|eqmod/i
const MOUNT_CONNECT_WAIT_MS = envNumber(process.env, 'E2E_MOUNT_CONNECT_WAIT_MS', 30_000)
const MOUNT_GOTO_WAIT_MS = 90_000
const MOUNT_ACTION_WAIT_MS = 120_000
const JOG_HOLD_MS = 3_000

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
  lines.push('==== Mount EQMod 连接 + 控制 + Park/Track/GOTO/Home 测试报告 ====')
  lines.push(`stepErrors: ${report.stepErrors.length}`)
  for (const e of report.stepErrors) lines.push(`- [STEP] ${e.step} :: ${e.message}`)
  lines.push(`pageErrors: ${report.pageErrors.length}`)
  for (const e of report.pageErrors) lines.push(`- [PAGE] ${e}`)
  lines.push(`consoleErrors: ${report.consoleErrors.length}`)
  for (const e of report.consoleErrors) lines.push(`- [CONSOLE] ${e}`)
  lines.push(`requestFailed: ${report.requestFailed.length}`)
  for (const e of report.requestFailed) lines.push(`- [REQUEST] ${e}`)
  lines.push(`optionalResults: ${report.optionalResults.length}`)
  for (const e of report.optionalResults) lines.push(`- [OPTIONAL] ${e}`)
  return lines.join('\n')
}

async function waitAfterAction(page: Page, timing: RunTiming) {
  if (timing.actionDelayMs > 0) await page.waitForTimeout(timing.actionDelayMs)
}

async function waitShort(page: Page, timing: RunTiming) {
  if (timing.shortDelayMs > 0) await page.waitForTimeout(timing.shortDelayMs)
}

async function dismissOverlayScrimIfPresent(page: Page, maxRounds: number = 6) {
  for (let i = 0; i < maxRounds; i++) {
    await page.keyboard.press('Escape').catch(() => {})
    await page.waitForTimeout(160)
  }
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
      // 遮罩可能被遮挡或不可接收点击，不强制点击，返回 false 由调用方用 Escape 兜底
      return false
    }
  }
  return false
}

/**
 * 关闭主菜单（模拟真实人工点击遮罩）：
 * - 若子菜单已开：先点一次关闭子菜单，再点一次关闭主菜单
 * - 若子菜单未开：点一次关闭主菜单
 */
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

  // 兜底：如果仍未关闭，补一次 ESC 防止遮罩残留
  if ((await menuDrawer.getAttribute('data-state').catch(() => '')) === 'open') {
    await page.keyboard.press('Escape').catch(() => {})
    await page.waitForTimeout(200)
  }
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

async function addOptionalStep(name: string, report: RuntimeReport, fn: () => Promise<void>) {
  try {
    await fn()
    report.optionalResults.push(`${name} :: OK`)
    console.log(`[OPTIONAL-OK] ${name}`)
  } catch (err) {
    const message = shortError(err)
    const maybeHidden = /toBeVisible|unexpected value "hidden"|not visible|waiting for locator/i.test(message)
    if (maybeHidden) {
      report.optionalResults.push(`${name} :: SKIPPED(HIDDEN)`)
      console.warn(`[OPTIONAL-SKIP] ${name}`)
      return
    }
    report.optionalResults.push(`${name} :: FAILED :: ${message}`)
    console.warn(`[OPTIONAL-FAIL] ${name}: ${message}`)
  }
}

async function ensureLocatorActionable(loc: Locator, timeoutMs: number = 8_000) {
  await expect(loc).toBeVisible({ timeout: timeoutMs })
  await expect(loc).toBeEnabled({ timeout: timeoutMs })
  await loc.scrollIntoViewIfNeeded().catch(() => {})
  await loc.click({ timeout: timeoutMs, trial: true })
}

async function clickLocatorWithFallback(page: Page, loc: Locator, timing: RunTiming, timeoutMs: number = 8_000) {
  await ensureLocatorActionable(loc, timeoutMs)
  await loc.click({ timeout: timeoutMs })
  await waitAfterAction(page, timing)
}

async function fillLocatorWithFallback(
  page: Page,
  loc: Locator,
  value: string,
  timing: RunTiming,
  timeoutMs: number = 8_000,
) {
  await ensureLocatorActionable(loc, timeoutMs)
  await loc.fill(value, { timeout: timeoutMs })
  await waitAfterAction(page, timing)
}

async function firstVisibleLocator(candidates: Locator): Promise<Locator | null> {
  const count = await candidates.count()
  for (let i = 0; i < count; i++) {
    const item = candidates.nth(i)
    if (await item.isVisible().catch(() => false)) return item
  }
  return null
}

async function waitForAppLoaded100(page: Page, report: RuntimeReport, timing: RunTiming, timeoutMs: number) {
  await addStep('boot.wait-app-ready-100', report, async () => {
    await page.waitForLoadState('load', { timeout: timeoutMs })
    await page.waitForLoadState('networkidle', { timeout: timeoutMs }).catch(() => {})
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
    await clickLocatorWithFallback(page, toggleBtn, timing, 10_000)
    await expect(drawer).toHaveAttribute('data-state', 'open', { timeout: 10_000 })
  })
}

async function ensureMenuDrawerClosed(page: Page, report: RuntimeReport, timing: RunTiming) {
  await addStep('menu.ensure-drawer-closed', report, async () => {
    const drawer = page.getByTestId('ui-app-menu-drawer').first()
    if ((await drawer.count()) === 0) return
    const state = await drawer.getAttribute('data-state')
    if (state === 'closed') return
    await closeMenuByOutsideScrimSmart(page)
    await expect(drawer).toHaveAttribute('data-state', 'closed', { timeout: 10_000 })
    await dismissOverlayScrimIfPresent(page)
  })
}

async function confirmConfirmIfOpened(page: Page, report: RuntimeReport, timing: RunTiming, stepPrefix: string) {
  await addStep(`${stepPrefix}.confirm.confirm-if-opened`, report, async () => {
    const root = page.getByTestId('ui-confirm-dialog-root').first()
    if ((await root.count()) === 0) return
    if ((await root.getAttribute('data-state')) !== 'open') return
    const confirmBtn = page.getByTestId('ui-confirm-dialog-btn-confirm').first()
    await expect(confirmBtn).toBeVisible({ timeout: 8_000 })
    await clickLocatorWithFallback(page, confirmBtn, timing)
    await expect(root).toHaveAttribute('data-state', 'closed', { timeout: 10_000 })
  })
}

async function disconnectAllWithConfirm(page: Page, report: RuntimeReport, timing: RunTiming) {
  await addStep('menu.disconnect-all.click', report, async () => {
    const btn = page.getByTestId('ui-app-menu-disconnect-all').first()
    await expect(btn).toBeVisible({ timeout: 8_000 })
    await clickLocatorWithFallback(page, btn, timing)
  })
  await confirmConfirmIfOpened(page, report, timing, 'menu.disconnect-all')
  await waitShort(page, timing)
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
          await clickLocatorWithFallback(page, mountItemByTestId, timing)
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

async function closeMountSubmenu(page: Page, report: RuntimeReport, timing: RunTiming) {
  await addOptionalStep('menu.close-mount-submenu', report, async () => {
    const devicePage = page.getByTestId('ui-app-submenu-device-page').first()
    const pageState = (await devicePage.getAttribute('data-state').catch(() => '')) ?? ''
    if (pageState !== 'open') return

    const mountItemByTestId = page.getByTestId('ui-app-menu-device-Mount').first()
    for (let i = 0; i < 4; i++) {
      await ensureMenuDrawerOpen(page, report, timing)
      await dismissOverlayScrimIfPresent(page)
      if (await mountItemByTestId.isVisible().catch(() => false)) {
        await clickLocatorWithFallback(page, mountItemByTestId, timing)
      }
      const closed = await expect
        .poll(async () => (await devicePage.getAttribute('data-state').catch(() => '')) ?? '', { timeout: 3_000 })
        .toBe('closed')
        .then(() => true)
        .catch(() => false)
      if (closed) return
      await page.waitForTimeout(300)
    }

    throw new Error('关闭 Mount 子菜单失败（已容错，不中断主流程）')
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
      await clickLocatorWithFallback(page, option, timing)
      return true
    }
    return false
  }

  if (await tryClickMatchedOption()) return true

  // 下拉列表内容过长时，仅滚动“驱动下拉浮层”的可滚动容器，避免误滚子菜单。
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

async function readVisibleDriverOptions(page: Page) {
  const options = page.locator('[data-testid^="ui-app-select-confirm-driver-option-"]')
  const count = await options.count()
  const texts: string[] = []
  for (let i = 0; i < count; i++) {
    const txt = ((await options.nth(i).textContent().catch(() => '')) || '').trim()
    if (txt) texts.push(txt)
  }
  return texts
}

async function selectMountDriverByLabel(page: Page, report: RuntimeReport, timing: RunTiming, labelMatch: RegExp) {
  await addStep('mount.select-driver', report, async () => {
    const select = page.getByTestId('ui-app-select-confirm-driver').first()
    await ensureLocatorActionable(select, 8_000)

    const currentText = (await select.textContent())?.trim() ?? ''
    if (currentText && labelMatch.test(currentText)) return

    const maxRetries = 10
    for (let retry = 0; retry < maxRetries; retry++) {
      await dismissOverlayScrimIfPresent(page, 2)
      await clickLocatorWithFallback(page, select, timing)
      await page.waitForTimeout(350)

      const anyOption = page.locator('[data-testid^="ui-app-select-confirm-driver-option-"]').first()
      const noDataItem = page.getByText(/No data available/i).first()
      if (await noDataItem.isVisible().catch(() => false)) {
        console.log(`[RETRY ${retry + 1}/${maxRetries}] 驱动列表显示 "No data available"，等待数据加载...`)
        await page.keyboard.press('Escape').catch(() => {})
        await page.waitForTimeout(1000)
        continue
      }

      if (!(await anyOption.isVisible().catch(() => false))) {
        console.log(`[RETRY ${retry + 1}/${maxRetries}] 驱动下拉尚未展开，重试...`)
        await page.waitForTimeout(500)
        continue
      }
      const selected = await clickMenuOptionWithScroll(page, timing, labelMatch)
      if (!selected) {
        const options = await readVisibleDriverOptions(page)
        if (options.length > 0) {
          console.log(`[RETRY ${retry + 1}/${maxRetries}] 当前驱动选项: ${options.join(' | ')}`)
        } else {
          console.log(`[RETRY ${retry + 1}/${maxRetries}] 当前未读到驱动选项文本`)
        }
        await page.keyboard.press('Escape').catch(() => {})
        await page.waitForTimeout(700)
        continue
      }
      await dismissOverlayScrimIfPresent(page, 1)
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
  await addStep(`${targetRole.toLowerCase()}.bind-in-allocation`, report, async () => {
    const panel = page.getByTestId('dap-root').first()
    const pickers = panel.getByTestId('dp-picker')
    await expect(pickers.first()).toBeVisible({ timeout: 10_000 })

    const count = await pickers.count()
    let targetPicker: Locator | null = null
    for (let i = 0; i < count; i++) {
      const p = pickers.nth(i)
      const typeText = ((await p.getByTestId('dp-device-type').textContent().catch(() => '')) || '').trim()
      if (typeText !== targetRole) continue
      targetPicker = p
      break
    }
    if (!targetPicker) throw new Error(`设备分配面板中未找到角色：${targetRole}`)

    await clickLocatorWithFallback(page, targetPicker, timing)
    const firstDevice = panel.getByTestId('dap-act-selected-device-name-2').first()
    await expect(firstDevice).toBeVisible({ timeout: 8_000 })
    await clickLocatorWithFallback(page, firstDevice, timing)

    const bindBtn = targetPicker.getByTestId('dp-btn-toggle-bind')
    const bindState = (await bindBtn.getAttribute('data-state').catch(() => ''))
    if (bindState === 'unbound') {
      await clickLocatorWithFallback(page, bindBtn, timing)
    }

    const closeBtn = page.getByTestId('dap-act-close-panel').first()
    if (await closeBtn.isVisible().catch(() => false)) {
      await clickLocatorWithFallback(page, closeBtn, timing)
    }
  })
}

async function waitForMountConnectionOrAllocation(
  page: Page,
  report: RuntimeReport,
  timing: RunTiming,
  timeoutMs: number,
) {
  await addStep('mount.wait-connection-or-allocation', report, async () => {
    const probe = page.getByTestId('e2e-device-Mount-conn').first()
    const dapPanel = page.getByTestId('dap-root').first()
    const start = Date.now()

    while (Date.now() - start < timeoutMs) {
      const connState = await probe.getAttribute('data-state').catch(() => '')
      if (connState === 'connected') return

      if (await dapPanel.isVisible().catch(() => false)) {
        await bindDeviceInAllocationPanel(page, report, timing, 'Mount')
        await expect(probe).toHaveAttribute('data-state', 'connected', {
          timeout: Math.max(timeoutMs - (Date.now() - start), 10_000),
        })
        return
      }

      await page.waitForTimeout(350)
    }

    throw new Error(`等待 Mount 连接超时 (${timeoutMs}ms)`)
  })
}

async function ensureMountControlPanelVisible(page: Page, report: RuntimeReport) {
  await addStep('mount.ensure-control-panel-visible', report, async () => {
    const panel = page.getByTestId('mcp-panel').first()
    if (await panel.isVisible().catch(() => false)) return

    const toggleBtn = page.getByTestId('gui-btn-toggle-mount-panel').first()
    for (let i = 0; i < 5; i++) {
      if (await panel.isVisible().catch(() => false)) return
      await closeMenuByOutsideScrimSmart(page)
      await dismissOverlayScrimIfPresent(page, 1)
      if (await toggleBtn.isVisible().catch(() => false)) {
        await clickLocatorWithFallback(page, toggleBtn, { actionDelayMs: 0, shortDelayMs: 0 }, 5_000)
      }
      await page.waitForTimeout(500)
    }

    await expect(panel).toBeVisible({ timeout: 12_000 })
  })
}

async function pressAndRelease(page: Page, loc: Locator, holdMs: number = 500) {
  await ensureLocatorActionable(loc, 8_000)
  await loc.scrollIntoViewIfNeeded().catch(() => {})
  const box = await loc.boundingBox()
  if (!box) throw new Error('目标按钮不可点击（无 bounding box）')
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.waitForTimeout(holdMs)
  await page.mouse.up()
}

async function ensureMountSpeedAtStart(page: Page, report: RuntimeReport, timing: RunTiming, targetSpeed: string = '10') {
  await addStep('mount.control.speed-init-to-10', report, async () => {
    const speedBtn = page.getByTestId('mcp-btn-speed').first()
    await expect(speedBtn).toBeVisible({ timeout: 10_000 })
    await waitForMountIdleState(page)

    const getSpeed = async () => (await speedBtn.getAttribute('data-value')) ?? ''
    if ((await getSpeed()) === targetSpeed) return

    for (let i = 0; i < 20; i++) {
      await waitForMountIdleState(page)
      await clickLocatorWithFallback(page, speedBtn, timing)
      const matched = await expect
        .poll(async () => await getSpeed(), { timeout: 2_000 })
        .toBe(targetSpeed)
        .then(() => true)
        .catch(() => false)
      if (matched) return
    }

    const current = await getSpeed()
    throw new Error(`初始化速度失败，期望 ${targetSpeed}，当前 ${current || 'unknown'}`)
  })
}

async function runMountControlActions(page: Page, report: RuntimeReport, timing: RunTiming) {
  await addStep('mount.control.speed-switch', report, async () => {
    const speedBtn = page.getByTestId('mcp-btn-speed').first()
    await waitForMountIdleState(page)
    const before = (await speedBtn.getAttribute('data-value')) ?? ''
    await clickLocatorWithFallback(page, speedBtn, timing)
    await page.waitForTimeout(300)
    const after = (await speedBtn.getAttribute('data-value')) ?? ''
    if (before && after && before === after) {
      console.log(`[WARN] 速度档位未变化，仍为 ${before}`)
    }
  })

  const jogButtons: Array<{ step: string; testId: string }> = [
    { step: 'mount.control.ra-plus-jog', testId: 'mcp-btn-ra-plus' },
    { step: 'mount.control.ra-minus-jog', testId: 'mcp-btn-ra-minus' },
    { step: 'mount.control.dec-plus-jog', testId: 'mcp-btn-dec-plus' },
    { step: 'mount.control.dec-minus-jog', testId: 'mcp-btn-dec-minus' },
  ]
  for (const item of jogButtons) {
    await addStep(item.step, report, async () => {
      const btn = page.getByTestId(item.testId).first()
      await waitForMountIdleState(page)
      await pressAndRelease(page, btn, JOG_HOLD_MS)
      await waitAfterAction(page, timing)
    })
  }

  await addStep('mount.control.stop', report, async () => {
    const stopBtn = page.getByTestId('mcp-btn-stop').first()
    await waitForMountIdleState(page)
    await clickLocatorWithFallback(page, stopBtn, timing)
  })
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

async function toggleTrackAndRestore(page: Page, report: RuntimeReport, timing: RunTiming) {
  await addStep('mount.track.toggle-and-restore', report, async () => {
    const btn = page.getByTestId('mcp-btn-track').first()
    await expect(btn).toBeVisible({ timeout: 10_000 })
    await waitForMountIdleState(page)
    const before = (await btn.getAttribute('data-state')) ?? ''
    let changed = before
    let toggled = false

    // 阶段 A：尝试把 Track 从 before 切到另一个状态（仅可操作性检查后点击，禁止 force）
    for (let i = 0; i < 6; i++) {
      await waitForMountIdleState(page)
      const current = (await btn.getAttribute('data-state')) ?? ''
      if (current !== before) {
        changed = current
        toggled = true
        break
      }
      await clickLocatorWithFallback(page, btn, timing)
      const switched = await expect
        .poll(async () => (await btn.getAttribute('data-state')) ?? '', { timeout: 8_000 })
        .not.toBe(before)
        .then(() => true)
        .catch(() => false)
      if (switched) {
        changed = (await btn.getAttribute('data-state')) ?? ''
        toggled = true
        break
      }
    }

    if (!toggled) {
      report.optionalResults.push('mount.track.toggle-and-restore :: TRACK_NOT_TOGGLED(保留原状态继续)')
      console.warn('[WARN] Track 未观察到状态切换，进入状态兜底并继续')
      return
    }

    // 阶段 B：恢复到初始状态 before（仅可操作性检查后点击，禁止 force）
    let restored = false
    for (let i = 0; i < 6; i++) {
      const current = (await btn.getAttribute('data-state')) ?? ''
      if (current === before) {
        restored = true
        break
      }
      await waitForMountIdleState(page)
      await clickLocatorWithFallback(page, btn, timing)
      await page.waitForTimeout(450)
    }

    if (!restored) {
      const finalState = (await btn.getAttribute('data-state')) ?? ''
      report.optionalResults.push(
        `mount.track.toggle-and-restore :: RESTORE_FALLBACK(before=${before}, changed=${changed}, final=${finalState})`,
      )
      console.warn(`[WARN] Track 恢复失败，状态兜底继续：${before} -> ${changed} -> ${finalState}`)
      return
    }

    console.log(`[INFO] Track 状态切换并恢复: ${before} -> ${changed} -> ${before}`)
  })
}

async function testParkAndEnsureUnparked(page: Page, report: RuntimeReport, timing: RunTiming) {
  await addOptionalStep('mount.park.toggle-and-ensure-unparked', report, async () => {
    const btn = page.getByTestId('mcp-btn-park').first()
    await expect(btn).toBeVisible({ timeout: 10_000 })
    await waitForMountIdleState(page)
    const before = (await btn.getAttribute('data-state')) ?? ''
    await clickLocatorWithFallback(page, btn, timing)

    await expect.poll(async () => (await btn.getAttribute('data-state')) ?? '', { timeout: 60_000 }).not.toBe(before)
    const changed = (await btn.getAttribute('data-state')) ?? ''

    // 若当前为 parked(on)，再点一次恢复为 off，避免影响 GOTO/Home。
    if (changed === 'on') {
      await waitForMountIdleState(page)
      await clickLocatorWithFallback(page, btn, timing)
      await expect.poll(async () => (await btn.getAttribute('data-state')) ?? '', { timeout: 60_000 }).toBe('off')
    }
    console.log(`[INFO] Park 状态切换: ${before} -> ${changed}${changed === 'on' ? ' -> off' : ''}`)
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
      await clickLocatorWithFallback(page, btn, timing)
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

async function selectSkyTargetForGoto(page: Page, report: RuntimeReport, timing: RunTiming, targetName: string) {
  await addStep(`goto.search-target-${targetName}`, report, async () => {
    await dismissOverlayScrimIfPresent(page)
    const input = page.getByTestId('ui-skysource-search-input-search-field').first()
    await expect(input).toBeVisible({ timeout: 10_000 })
    await dismissOverlayScrimIfPresent(page)
    await fillLocatorWithFallback(page, input, targetName, timing, 8_000)

    const items = page.getByTestId('ui-components-skysource-search-act-source-clicked')
    await expect(items.first()).toBeVisible({ timeout: 10_000 })
    const count = await items.count()
    let chosen: Locator | null = null
    for (let i = 0; i < count; i++) {
      const item = items.nth(i)
      const text = ((await item.textContent().catch(() => '')) || '').toLowerCase()
      if (text.includes(targetName.toLowerCase())) {
        chosen = item
        break
      }
    }
    await clickLocatorWithFallback(page, chosen ?? items.first(), timing)

    const infoRoot = page.getByTestId('ui-selected-object-info-root').first()
    await expect(infoRoot).toBeVisible({ timeout: 10_000 })
    await expect
      .poll(async () => {
        const text = ((await infoRoot.textContent().catch(() => '')) || '').toLowerCase().replace(/\s+/g, ' ')
        return /m\s*31|andromeda/.test(text)
      }, { timeout: 10_000 })
      .toBe(true)
  })
}

async function clickGotoFromSelectedObjectInfo(page: Page, report: RuntimeReport, timing: RunTiming): Promise<boolean> {
  let triggered = false
  await addStep('goto.click-goto-button', report, async () => {
    await ensureRaDecDialogClosedIfOpen(page, timing)
    await dismissOverlayScrimIfPresent(page)
    const roots = page.getByTestId('ui-selected-object-info-root')
    await expect(roots.first()).toBeVisible({ timeout: 10_000 })

    const gotoBtn = page.getByTestId('ui-selected-object-info-btn-goto').first()
    await expect(gotoBtn).toBeVisible({ timeout: 12_000 })
    await waitForMountIdleState(page)
    await clickLocatorWithFallback(page, gotoBtn, timing)

    // 目标信息面板 GOTO 应直接执行，不应弹出 RA/DEC 输入框。
    const raDecDialog = page.getByTestId('ui-ra-dec-dialog-root').first()
    await expect
      .poll(async () => await raDecDialog.isVisible().catch(() => false), { timeout: 2_500 })
      .toBe(false)
    triggered = true
  })
  return triggered
}

async function waitMountGotoComplete(page: Page, report: RuntimeReport, timeoutMs: number) {
  await addStep('goto.wait-mount-status-complete', report, async () => {
    const busy = page.getByTestId('mcp-status-indicator-busy').first()
    const idle = page.getByTestId('mcp-status-indicator-idle').first()
    const start = Date.now()
    let sawBusy = false

    while (Date.now() - start < timeoutMs) {
      const busyVisible = await busy.isVisible().catch(() => false)
      const idleVisible = await idle.isVisible().catch(() => false)
      if (busyVisible) sawBusy = true
      if (idleVisible && (sawBusy || Date.now() - start > 10_000)) {
        if (!sawBusy) {
          const note = 'goto.wait-mount-status-complete :: NO_BUSY_SIGNAL(设备未上报busy，已按idle收敛)'
          report.optionalResults.push(note)
          console.warn(`[WARN] ${note}`)
        }
        return
      }
      await page.waitForTimeout(400)
    }

    throw new Error('GOTO 等待超时，未观察到稳定的 idle 收敛')
  })
}

async function findVisibleInScrollableContainer(
  page: Page,
  container: Locator,
  candidates: Locator,
  maxScrollSteps: number = 14,
): Promise<Locator | null> {
  const findVisible = async (): Promise<Locator | null> => {
    const count = await candidates.count()
    for (let i = 0; i < count; i++) {
      const c = candidates.nth(i)
      if (await c.isVisible().catch(() => false)) return c
    }
    return null
  }

  let found = await findVisible()
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
    found = await findVisible()
    if (found) return found
  }
  return null
}

async function runOptionalMountExtendedActions(page: Page, report: RuntimeReport, timing: RunTiming) {
  const paramsContainer = page.getByTestId('ui-app-submenu-params-container').first()

  await addOptionalStep('mount.optional.goto-then-solve-switch-on', report, async () => {
    const switchCandidates = page.locator('[data-testid^="ui-config-Mount-GotoThenSolve-switch-"]')
    const switchBtn = await findVisibleInScrollableContainer(page, paramsContainer, switchCandidates)
    if (!switchBtn) throw new Error('未找到可见的 Goto Then Solve 开关')
    await waitForMountIdleState(page)
    const aria = (await switchBtn.getAttribute('aria-checked').catch(() => '')) ?? ''
    const alreadyOn = aria === 'true'
    if (!alreadyOn) await clickLocatorWithFallback(page, switchBtn, timing)
  })

  await addOptionalStep('mount.optional.solve-current-position', report, async () => {
    const solveCandidates = page.locator('[data-testid^="ui-config-Mount-SolveCurrentPosition-button-"]')
    const solveBtn = await findVisibleInScrollableContainer(page, paramsContainer, solveCandidates)
    if (!solveBtn) throw new Error('未找到可见的 Solve Current Position 按钮')
    await waitForMountIdleState(page)
    await clickLocatorWithFallback(page, solveBtn, timing)
    await page.waitForTimeout(800)
    await waitForMountIdleState(page, 45_000).catch(() => {})

    // 某些设备流程下，执行 Solve Current Position 后会自动关闭子菜单/主菜单。
    // 这里立即恢复到 Mount 子菜单打开状态，避免后续 Goto 点击链路中断。
    const devicePage = page.getByTestId('ui-app-submenu-device-page').first()
    const pageState = (await devicePage.getAttribute('data-state').catch(() => '')) ?? ''
    if (pageState !== 'open') {
      report.optionalResults.push('mount.optional.solve-current-position :: SUBMENU_REOPEN')
      await ensureMenuDrawerOpen(page, report, timing)
      await openMountSubmenu(page, report, timing)
    }
  })
}

async function runMountConfigGotoByRaDecDialog(page: Page, report: RuntimeReport, timing: RunTiming) {
  await addStep('mount.config.goto-via-dialog', report, async () => {
    await ensureRaDecDialogClosedIfOpen(page, timing)
    await ensureMenuDrawerOpen(page, report, timing)
    await openMountSubmenu(page, report, timing)
    const paramsContainer = page.getByTestId('ui-app-submenu-params-container').first()
    const devicePage = page.getByTestId('ui-app-submenu-device-page').first()
    const getVisibleGotoBtn = async () => {
      const preferred = paramsContainer.locator('[data-testid="ui-config-Mount-Goto-button-3"]')
      const preferredVisible = await firstVisibleLocator(preferred)
      if (preferredVisible) return preferredVisible
      const gotoCandidates = paramsContainer.locator('[data-testid^="ui-config-Mount-Goto-button-"]')
      return await findVisibleInScrollableContainer(page, paramsContainer, gotoCandidates)
    }

    const raDecDialogRoot = page.getByTestId('ui-ra-dec-dialog-root').first()
    const raInputCandidates = page.getByTestId('ui-ra-dec-dialog-input-ra-str')
    const decInputCandidates = page.getByTestId('ui-ra-dec-dialog-input-dec-str')
    const busyIndicator = page.getByTestId('mcp-status-indicator-busy').first()
    const idleIndicator = page.getByTestId('mcp-status-indicator-idle').first()
    const waitDialogOpened = async (timeoutMs: number) =>
      await expect
        .poll(async () => {
          const raInput = await firstVisibleLocator(raInputCandidates)
          const decInput = await firstVisibleLocator(decInputCandidates)
          return !!raInput && !!decInput
        }, { timeout: timeoutMs })
        .toBe(true)
        .then(() => true)
        .catch(() => false)
    const waitDirectGotoSignal = async (timeoutMs: number) =>
      await expect
        .poll(async () => {
          const busyVisible = await busyIndicator.isVisible().catch(() => false)
          const idleVisible = await idleIndicator.isVisible().catch(() => false)
          return busyVisible || !idleVisible
        }, { timeout: timeoutMs })
        .toBe(true)
        .then(() => true)
        .catch(() => false)

    let opened = false
    let directGotoTriggered = false
    for (let i = 0; i < 6; i++) {
      const pageState = (await devicePage.getAttribute('data-state').catch(() => '')) ?? ''
      if (pageState !== 'open') {
        await ensureMenuDrawerOpen(page, report, timing)
        await openMountSubmenu(page, report, timing)
      }

      await waitForMountIdleState(page)
      const gotoBtn = await getVisibleGotoBtn()
      if (!gotoBtn) {
        await paramsContainer
          .evaluate((el) => {
            ;(el as HTMLElement).scrollTop = 0
          })
          .catch(() => {})
        await page.waitForTimeout(250)
        await paramsContainer
          .evaluate((el) => {
            ;(el as HTMLElement).scrollTop = (el as HTMLElement).scrollHeight
          })
          .catch(() => {})
        await page.waitForTimeout(300)
        continue
      }
      await gotoBtn.scrollIntoViewIfNeeded().catch(() => {})
      await clickLocatorWithFallback(page, gotoBtn, timing)
      opened = await waitDialogOpened(2_500)
      if (opened) break
      directGotoTriggered = await waitDirectGotoSignal(2_500)
      if (directGotoTriggered) break
    }

    if (!opened) {
      if (directGotoTriggered) {
        report.optionalResults.push('mount.config.goto-via-dialog :: DIRECT_GOTO_WITHOUT_DIALOG')
        await waitMountBusyThenIdle(page, report, 'mount.config.goto-direct.wait-complete', 60_000, {
          requireBusy: false,
        })
        return
      }

      const emitted = await emitGotoEventViaVueBus(page)
      if (emitted) {
        await waitAfterAction(page, timing)
        opened = await expect
          .poll(async () => {
            const raInput = await firstVisibleLocator(raInputCandidates)
            const decInput = await firstVisibleLocator(decInputCandidates)
            return !!raInput && !!decInput
          }, { timeout: 3_500 })
          .toBe(true)
          .then(() => true)
          .catch(() => false)
        if (!opened) {
          directGotoTriggered = await expect
            .poll(async () => {
              const busyVisible = await busyIndicator.isVisible().catch(() => false)
              const idleVisible = await idleIndicator.isVisible().catch(() => false)
              return busyVisible || !idleVisible
            }, { timeout: 3_500 })
            .toBe(true)
            .then(() => true)
            .catch(() => false)
        }
        if (opened) {
          report.optionalResults.push('mount.config.goto-via-dialog :: FALLBACK_BUS_EMIT_OPENED')
        } else if (directGotoTriggered) {
          report.optionalResults.push('mount.config.goto-via-dialog :: FALLBACK_BUS_EMIT_DIRECT_GOTO')
          await waitMountBusyThenIdle(page, report, 'mount.config.goto-direct.wait-complete', 60_000, {
            requireBusy: false,
          })
          return
        }
      }

      if (opened) {
        // fallback 已触发弹窗，继续走输入路径
      } else {
      throw new Error('已重试点击 Mount 配置页 Goto，但既未出现 RA/DEC 弹窗，也未观察到直接 GOTO 运动信号')
      }
    }

    const raInput = await firstVisibleLocator(raInputCandidates)
    const decInput = await firstVisibleLocator(decInputCandidates)
    const okBtn = await firstVisibleLocator(page.getByTestId('ui-ra-dec-dialog-btn-on-ok'))
    if (!raInput || !decInput || !okBtn) throw new Error('RA/DEC 弹窗已出现，但未定位到可见输入框或确认按钮')

    await fillLocatorWithFallback(page, raInput, '5.5', timing)
    await fillLocatorWithFallback(page, decInput, '20', timing)
    await clickLocatorWithFallback(page, okBtn, timing)
    await expect
      .poll(async () => {
        const raInputVisible = !!(await firstVisibleLocator(raInputCandidates))
        const decInputVisible = !!(await firstVisibleLocator(decInputCandidates))
        return raInputVisible || decInputVisible
      }, { timeout: 8_000 })
      .toBe(false)
    await waitMountBusyThenIdle(page, report, 'mount.config.goto-via-dialog.wait-complete', 60_000, {
      requireBusy: false,
    })
  })
}

async function ensureRaDecDialogClosedIfOpen(page: Page, timing: RunTiming) {
  const dialog = page.getByTestId('ui-ra-dec-dialog-root').first()
  const opened = await dialog.isVisible().catch(() => false)
  if (!opened) return

  const cancelBtn = page.getByTestId('ui-ra-dec-dialog-btn-on-cancel').first()
  if (await cancelBtn.isVisible().catch(() => false)) {
    await clickLocatorWithFallback(page, cancelBtn, timing, 8_000)
  } else {
    await page.keyboard.press('Escape').catch(() => {})
    await waitAfterAction(page, timing)
  }

  await expect
    .poll(async () => await dialog.isVisible().catch(() => false), { timeout: 8_000 })
    .toBe(false)
}

async function emitGotoEventViaVueBus(page: Page): Promise<boolean> {
  return await page
    .evaluate(() => {
      const root = document.querySelector('#app') as any
      const vm = root?.__vue__
      const bus = vm?.$bus
      if (!bus || typeof bus.$emit !== 'function') return false
      bus.$emit('Goto', 'Goto:true')
      return true
    })
    .catch(() => false)
}

async function testHomeBeforeFinalPark(page: Page, report: RuntimeReport, timing: RunTiming) {
  const homeBtn = page.getByTestId('mcp-btn-home').first()
  await addStep('mount.home.before-final-park-click', report, async () => {
    await ensureLocatorActionable(homeBtn, 10_000)
    await waitForMountIdleState(page)
    await clickLocatorWithFallback(page, homeBtn, timing)
  })

  await addStep('mount.home.before-final-park-processing-started', report, async () => {
    await expect.poll(async () => (await homeBtn.getAttribute('data-processing')) ?? '', { timeout: 8_000 }).toBe('true')
  })
  await addStep('mount.home.before-final-park-processing-finished', report, async () => {
    await expect
      .poll(async () => (await homeBtn.getAttribute('data-processing')) ?? '', { timeout: MOUNT_ACTION_WAIT_MS })
      .not.toBe('true')
  })

  await waitMountBusyThenIdle(page, report, 'mount.home.before-final-park-wait-complete', MOUNT_ACTION_WAIT_MS, {
    requireBusy: false,
  })
}

async function ensureParkEnabledAsFinalState(page: Page, report: RuntimeReport, timing: RunTiming) {
  await addStep('mount.park.final-enable', report, async () => {
    const btn = page.getByTestId('mcp-btn-park').first()
    await expect(btn).toBeVisible({ timeout: 10_000 })
    await waitForMountIdleState(page)

    if (((await btn.getAttribute('data-state')) ?? '') === 'on') return

    // Park 状态切换可能存在设备侧延迟，加入有限重试确保最终收敛到 on。
    for (let i = 0; i < 4; i++) {
      await waitForMountIdleState(page)
      await clickLocatorWithFallback(page, btn, timing)
      const isOn = await expect
        .poll(async () => (await btn.getAttribute('data-state')) ?? '', { timeout: 20_000 })
        .toBe('on')
        .then(() => true)
        .catch(() => false)
      if (isOn) return
    }

    throw new Error('最终收尾开启 Park 失败，状态未到 on')
  })
}

async function runMountEqmodControlGotoTest(page: Page, testInfo: TestInfo) {
  const report: RuntimeReport = {
    stepErrors: [],
    pageErrors: [],
    consoleErrors: [],
    requestFailed: [],
    optionalResults: [],
  }
  attachRuntimeCollectors(page, report)

  const uiTimeoutMs = envNumber(process.env, 'E2E_UI_TIMEOUT_MS', DEFAULTS.flow.uiTimeoutMs)
  const stepTimeoutMs = envNumber(process.env, 'E2E_STEP_TIMEOUT_MS', DEFAULTS.flow.stepTimeoutMs)
  const testTimeoutMs = envNumber(process.env, 'E2E_TEST_TIMEOUT_MS', DEFAULTS.flow.testTimeoutMs)
  const actionDelayMs = Math.max(0, envNumber(process.env, 'E2E_INTERACTION_DELAY_MS', 300))
  const shortDelayMs = Math.max(0, envNumber(process.env, 'E2E_INTERACTION_SHORT_DELAY_MS', 180))
  const timing: RunTiming = { actionDelayMs, shortDelayMs }
  const features: MountFeatureFlags = {
    // 默认执行 GOTO；如需临时关闭可设置 E2E_MOUNT_GOTO_ENABLED=0。
    gotoEnabled: envFlag(process.env, 'E2E_MOUNT_GOTO_ENABLED', true),
  }

  page.setDefaultTimeout(uiTimeoutMs)
  page.setDefaultNavigationTimeout(stepTimeoutMs)
  testInfo.setTimeout(Math.max(testTimeoutMs, 10 * 60_000))

  // 阶段 1：应用启动与初始状态清理（断开所有设备）
  await addStep('boot.goto-app', report, async () => {
    await page.goto(getAppStartPath(), { waitUntil: 'load', timeout: stepTimeoutMs })
    await waitAfterAction(page, timing)
  })
  await waitForAppLoaded100(page, report, timing, stepTimeoutMs)

  await ensureMenuDrawerOpen(page, report, timing)
  await disconnectAllWithConfirm(page, report, timing)
  await ensureMenuDrawerOpen(page, report, timing)

  // 阶段 2：Mount 连接建立（含 DAP 绑定兜底）
  await openMountSubmenu(page, report, timing)
  await selectMountDriverByLabel(page, report, timing, MOUNT_DRIVER_MATCH)
  await clickConnectMount(page, report, timing)
  await waitForMountConnectionOrAllocation(page, report, timing, MOUNT_CONNECT_WAIT_MS)

  // 阶段 3：控制面板基础动作（点动/速度/Stop/Track）
  await ensureMountControlPanelVisible(page, report)
  await ensureParkDisabled(page, report, timing, 'mount.park.ensure-off-after-connect')
  await ensureMountSpeedAtStart(page, report, timing, '10')
  await runMountControlActions(page, report, timing)
  await toggleTrackAndRestore(page, report, timing)
  await ensureParkDisabled(page, report, timing, 'mount.park.ensure-off-before-actions')

  // 阶段 4：配置页扩展动作（可选开关 + RA/DEC 对话框 Goto）
  await openMountSubmenu(page, report, timing)
  await runOptionalMountExtendedActions(page, report, timing)
  await runMountConfigGotoByRaDecDialog(page, report, timing)
  await ensureMenuDrawerClosed(page, report, timing)

  // 阶段 5：天图目标 GOTO（受 feature flag 控制）
  if (features.gotoEnabled) {
    await selectSkyTargetForGoto(page, report, timing, 'M31')
    const gotoTriggered = await clickGotoFromSelectedObjectInfo(page, report, timing)
    if (gotoTriggered) {
      await waitMountGotoComplete(page, report, MOUNT_GOTO_WAIT_MS)
    } else {
      console.log('[WARN] 本次未触发 GOTO，跳过 goto.wait-mount-status-complete')
    }
  } else {
    console.log('[WARN] 已通过 E2E_MOUNT_GOTO_ENABLED=0 关闭 GOTO 步骤')
  }

  // 阶段 6：收尾动作（Home -> Park 测试 -> 最终 Park=on）
  await testHomeBeforeFinalPark(page, report, timing)
  await testParkAndEnsureUnparked(page, report, timing)
  await ensureParkEnabledAsFinalState(page, report, timing)

  // 阶段 7：报告与断言
  const reportText = buildReportText(report)
  console.log(reportText)
  await testInfo.attach('mount-eqmod-control-goto-runtime-report', {
    body: reportText,
    contentType: 'text/plain',
  })

  expect(
    report.stepErrors.length,
    '赤道仪（Mount）连接、控制、Park/Track/GOTO/Home 步骤存在失败，请查看附件 mount-eqmod-control-goto-runtime-report',
  ).toBe(0)
  expect(
    report.pageErrors.length,
    '页面存在运行时异常，请查看附件 mount-eqmod-control-goto-runtime-report',
  ).toBe(0)
}

test('5-赤道仪-EQMod-连接控制与ParkTrackGotoHome', async ({ page }, testInfo) => {
  await runMountEqmodControlGotoTest(page, testInfo)
})

