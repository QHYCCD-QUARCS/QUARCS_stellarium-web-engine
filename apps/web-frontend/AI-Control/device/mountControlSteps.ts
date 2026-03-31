/**
 * AI-Control 赤道仪控制步骤。
 *
 * - 设备侧栏内：点击按钮（SolveCurrentPosition、Goto）、设置开关（GotoThenSolve、AutoFlip）。
 * - 主界面赤道仪面板（MountControlPanel.vue）：Park、Track、Home、Stop、方向移动（RA+/−、DEC+/−）等。
 * 控件 testid：设备侧栏 ui-config-Mount-{Label}-*；主面板 mcp-panel、gui-btn-toggle-mount-panel、
 * mcp-btn-park、mcp-btn-track、mcp-btn-home、mcp-btn-stop、mcp-btn-ra-plus、mcp-btn-ra-minus、mcp-btn-dec-plus、mcp-btn-dec-minus 等。
 */
import { expect } from '@playwright/test'
import type { FlowContext, StepRegistry } from '../core/flowTypes'
import { clickLocator, clickVuetifySwitchByRoot, sanitizeTestIdPart, sleep } from '../shared/interaction'
import { deviceMenuTestId } from '../shared/interaction'
import { ensureMenuDrawerOpen } from '../shared/navigation'
import { openDeviceSubmenu } from '../menu/drawerSteps'

const MCP_PANEL = 'mcp-panel'
const MCP_TOGGLE = 'gui-btn-toggle-mount-panel'

/** 确保主界面赤道仪面板（mcp-panel）可见，不可见则点击 gui-btn-toggle-mount-panel */
async function ensureMountPanelOpen(ctx: FlowContext, timeout: number) {
  const page = ctx.page
  const panel = page.getByTestId(MCP_PANEL).first()
  if (await panel.isVisible().catch(() => false)) return
  await clickLocator(page.getByTestId(MCP_TOGGLE).first(), timeout)
  await expect(panel).toBeVisible({ timeout })
}

const DEVICE_TYPE = 'Mount'

/** 点击赤道仪侧栏内指定 label 的按钮（第一个匹配） */
async function clickMountButton(ctx: FlowContext, label: string) {
  const page = ctx.page
  const timeout = ctx.stepTimeoutMs
  const safeLabel = sanitizeTestIdPart(label)
  const btn = page.locator(`[data-testid^="ui-config-${DEVICE_TYPE}-${safeLabel}-button-"]`).first()
  if ((await btn.count()) === 0) {
    console.log(`[ai-control] 未找到赤道仪 ${label} 按钮，跳过`)
    return
  }
  await btn.scrollIntoViewIfNeeded().catch(() => {})
  await sleep(300)
  await clickLocator(btn, timeout)
  await sleep(200)
  console.log(`[ai-control] 赤道仪 ${label} 已点击`)
}

/** 将赤道仪侧栏内指定 label 的 switch 设为目标状态 */
async function setMountSwitch(ctx: FlowContext, label: string, wanted: boolean) {
  const page = ctx.page
  const timeout = ctx.stepTimeoutMs
  const safeLabel = sanitizeTestIdPart(label)
  const switchLoc = page.locator(`[data-testid^="ui-config-${DEVICE_TYPE}-${safeLabel}-switch-"]`).first()
  if ((await switchLoc.count()) === 0) {
    console.log(`[ai-control] 未找到赤道仪 ${label} 开关，跳过（可能未连接或后端未下发该项）`)
    return
  }
  const innerInput = switchLoc.locator('input[type="checkbox"]').first()
  const current =
    (await innerInput.count()) > 0
      ? await innerInput.isChecked().catch(() => false)
      : await switchLoc.isChecked().catch(() => false)
  if (current === wanted) {
    console.log(`[ai-control] 赤道仪 ${label} 已为 ${wanted}，跳过`)
    return
  }
  await clickVuetifySwitchByRoot(switchLoc, timeout)
  await sleep(200)
  console.log(`[ai-control] 赤道仪 ${label} 已设为 ${wanted}`)
}

export type MountControlInteractParams = {
  /** true 时点击「SolveCurrentPosition」按钮 */
  solveCurrentPosition?: boolean
  /** true 时点击「Goto」按钮（会打开 RA/DEC 对话框，流程不自动填写或确认） */
  gotoClick?: boolean
  /** 将「GotoThenSolve」开关设为该值 */
  gotoThenSolve?: boolean
  /** 将「AutoFlip」开关设为该值（连接后后端可能才下发该项） */
  autoFlip?: boolean
}

/** 主界面赤道仪面板（mcp）交互参数：Park/Track 开关、Home/Stop 点击、方向移动 */
export type McpInteractParams = {
  park?: boolean
  track?: boolean
  home?: boolean
  stop?: boolean
  sync?: boolean
  solve?: boolean
  slewSpeed?: number
  move?: { direction: 'ra-plus' | 'ra-minus' | 'dec-plus' | 'dec-minus'; durationMs?: number }
  moveAllDirections?: boolean
  moveDurationMs?: number
}

function hasMountControlInteract(p: MountControlInteractParams | undefined): boolean {
  if (!p || typeof p !== 'object') return false
  return (
    p.solveCurrentPosition === true ||
    p.gotoClick === true ||
    typeof p.gotoThenSolve === 'boolean' ||
    typeof p.autoFlip === 'boolean'
  )
}

export function makeMountControlStepRegistry(): StepRegistry {
  const registry: StepRegistry = new Map()

  /**
   * 在赤道仪侧栏内执行控制操作（连接后、关闭抽屉前调用）。
   * 前置：Mount 设备页已打开（如 mount-connect-control 流程中 waitConnected 之后）。
   * 参数：solveCurrentPosition?, gotoClick?, gotoThenSolve?, autoFlip?
   * - solveCurrentPosition: true 时点击「SolveCurrentPosition」按钮
   * - gotoClick: true 时点击「Goto」按钮（会弹出 RA/DEC 输入框，流程不自动填写）
   * - gotoThenSolve: 将 GotoThenSolve 开关设为该布尔值
   * - autoFlip: 将 AutoFlip 开关设为该布尔值（项可能由后端动态添加）
   */
  registry.set('device.mount.applyControl', {
    async run(ctx, params: MountControlInteractParams) {
      if (!hasMountControlInteract(params)) return
      const navTimeout = Math.max(ctx.stepTimeoutMs, 15_000)
      const page = ctx.page
      const submenuDrawer = page.getByTestId('ui-app-submenu-drawer').first()
      const submenuPage = page.getByTestId('ui-app-submenu-device-page').first()
      const mountItem = page.getByTestId(deviceMenuTestId(DEVICE_TYPE)).first()
      const d = await submenuDrawer.getAttribute('data-state').catch(() => null)
      const p = await submenuPage.getAttribute('data-state').catch(() => null)
      const sel = await mountItem.getAttribute('data-selected').catch(() => null)
      /** 必须 drawer 与 page 同时为 open；仅 p=open 而 d=closed 时仍须 openDeviceSubmenu（见 connectDriverSuccess 与 drawerSteps 注释） */
      if (d === 'open' && p === 'open' && sel === 'true') {
        console.log('[ai-control] device.mount.applyControl 跳过 openDeviceSubmenu：Mount 子菜单已就绪')
      } else {
        await ensureMenuDrawerOpen(page, navTimeout)
        await sleep(500)
        await openDeviceSubmenu(ctx, DEVICE_TYPE)
      }

      if (params.solveCurrentPosition === true) {
        await clickMountButton(ctx, 'SolveCurrentPosition')
      }
      if (params.gotoClick === true) {
        await clickMountButton(ctx, 'Goto')
      }
      if (typeof params.gotoThenSolve === 'boolean') {
        await setMountSwitch(ctx, 'GotoThenSolve', params.gotoThenSolve)
      }
      if (typeof params.autoFlip === 'boolean') {
        await setMountSwitch(ctx, 'AutoFlip', params.autoFlip)
      }
    },
  })

  /**
   * 确保赤道仪 Park 为开启状态（主界面 Mount 控制面板，非设备侧栏）。
   * 若 mcp-panel 不可见则点击 gui-btn-toggle-mount-panel 打开；若 mcp-btn-park 的 data-state 非 'on' 则点击该按钮，最后断言 data-state=on。
   */
  registry.set('mount.ensureParkedForTest', {
    async run(ctx, params) {
      const timeout = params?.timeoutMs ?? ctx.stepTimeoutMs
      await ensureMountPanelOpen(ctx, timeout)
      const parkBtn = ctx.page.getByTestId('mcp-btn-park').first()
      await parkBtn.scrollIntoViewIfNeeded().catch(() => {})
      await sleep(300)
      const state = await parkBtn.getAttribute('data-state').catch(() => null)
      if (state !== 'on') {
        await clickLocator(parkBtn, timeout)
        await sleep(500)
      }
      await expect(parkBtn).toHaveAttribute('data-state', 'on', {
        timeout: Math.max(timeout, 30_000),
      })
      console.log('[ai-control] 赤道仪 Park 已确保为 on')
    },
  })

  /** 仅确保主界面赤道仪面板打开，不操作 Park/Track */
  registry.set('mount.ensurePanelOpen', {
    async run(ctx, params) {
      await ensureMountPanelOpen(ctx, params?.timeoutMs ?? ctx.stepTimeoutMs)
    },
  })

  /** 主面板：将 Park 设为 on/off（点击 mcp-btn-park 直至 data-state 匹配） */
  registry.set('mount.panel.setPark', {
    async run(ctx, params: { on?: boolean }) {
      const wanted = params?.on !== false
      const target = wanted ? 'on' : 'off'
      await ensureMountPanelOpen(ctx, ctx.stepTimeoutMs)
      const btn = ctx.page.getByTestId('mcp-btn-park').first()
      await btn.scrollIntoViewIfNeeded().catch(() => {})
      await sleep(200)
      for (let i = 0; i < 5; i++) {
        const state = await btn.getAttribute('data-state').catch(() => null)
        if (state === target) {
          console.log(`[ai-control] 赤道仪 Park 已为 ${target}`)
          return
        }
        await clickLocator(btn, ctx.stepTimeoutMs)
        await sleep(600)
      }
      await expect(btn).toHaveAttribute('data-state', target, { timeout: 15_000 })
    },
  })

  /** 主面板：将 Track 设为 on/off（点击 mcp-btn-track 直至 data-state 匹配） */
  registry.set('mount.panel.setTrack', {
    async run(ctx, params: { on?: boolean }) {
      const wanted = params?.on !== false
      const target = wanted ? 'on' : 'off'
      await ensureMountPanelOpen(ctx, ctx.stepTimeoutMs)
      const btn = ctx.page.getByTestId('mcp-btn-track').first()
      await btn.scrollIntoViewIfNeeded().catch(() => {})
      await sleep(200)
      for (let i = 0; i < 5; i++) {
        const state = await btn.getAttribute('data-state').catch(() => null)
        if (state === target) {
          console.log(`[ai-control] 赤道仪 Track 已为 ${target}`)
          return
        }
        await clickLocator(btn, ctx.stepTimeoutMs)
        await sleep(600)
      }
      await expect(btn).toHaveAttribute('data-state', target, { timeout: 15_000 })
    },
  })

  /** 主面板：点击 Home（mcp-btn-home） */
  registry.set('mount.panel.clickHome', {
    async run(ctx) {
      await ensureMountPanelOpen(ctx, ctx.stepTimeoutMs)
      const btn = ctx.page.getByTestId('mcp-btn-home').first()
      await btn.scrollIntoViewIfNeeded().catch(() => {})
      await sleep(200)
      await clickLocator(btn, ctx.stepTimeoutMs)
      console.log('[ai-control] 赤道仪 Home 已点击')
    },
  })

  /** 主面板：点击 Stop（mcp-btn-stop）停止移动 */
  registry.set('mount.panel.clickStop', {
    async run(ctx) {
      await ensureMountPanelOpen(ctx, ctx.stepTimeoutMs)
      const btn = ctx.page.getByTestId('mcp-btn-stop').first()
      await btn.scrollIntoViewIfNeeded().catch(() => {})
      await sleep(200)
      await clickLocator(btn, ctx.stepTimeoutMs)
      console.log('[ai-control] 赤道仪 Stop 已点击')
    },
  })

  /** 主面板：将速度切到目标档位（循环点击 mcp-btn-speed，直到 data-value 匹配）。 */
  registry.set('mount.panel.setSlewSpeed', {
    async run(ctx, params: { value?: number }) {
      const wanted = params?.value
      if (typeof wanted !== 'number' || !Number.isFinite(wanted)) {
        console.log('[ai-control] mount.panel.setSlewSpeed 缺少有效 value，跳过')
        return
      }
      await ensureMountPanelOpen(ctx, ctx.stepTimeoutMs)
      const btn = ctx.page.getByTestId('mcp-btn-speed').first()
      await btn.scrollIntoViewIfNeeded().catch(() => {})
      await sleep(200)
      let bestObserved: number | null = null
      let lastValue: string | null = null
      let unchangedCount = 0
      for (let i = 0; i < 8; i++) {
        const value = await btn.getAttribute('data-value').catch(() => null)
        const numericValue = value == null ? Number.NaN : Number(value)
        if (Number.isFinite(numericValue)) {
          bestObserved = bestObserved == null ? numericValue : Math.max(bestObserved, numericValue)
        }
        if (value === String(wanted)) {
          console.log(`[ai-control] 赤道仪速度已为 ${wanted}`)
          return
        }
        if (value === lastValue) unchangedCount += 1
        else unchangedCount = 0
        lastValue = value
        await clickLocator(btn, ctx.stepTimeoutMs)
        await sleep(400)
        const nextValue = await btn.getAttribute('data-value').catch(() => null)
        const nextNumericValue = nextValue == null ? Number.NaN : Number(nextValue)
        if (Number.isFinite(nextNumericValue)) {
          bestObserved = bestObserved == null ? nextNumericValue : Math.max(bestObserved, nextNumericValue)
        }
        if (nextValue === String(wanted)) {
          console.log(`[ai-control] 赤道仪速度已切到 ${wanted}`)
          return
        }
        if (nextValue === value) unchangedCount += 1
        else unchangedCount = 0
        lastValue = nextValue
        if (bestObserved != null && bestObserved < wanted && unchangedCount >= 3) {
          console.log(
            `[ai-control] 赤道仪速度未命中目标 ${wanted}，当前设备最大可达档位疑似为 ${bestObserved}，按现场可达值继续`,
          )
          return
        }
      }
      if (bestObserved != null && bestObserved < wanted) {
        console.log(
          `[ai-control] 赤道仪速度未命中目标 ${wanted}，循环后最高仅观察到 ${bestObserved}，按现场可达值继续`,
        )
        return
      }
      await expect(btn).toHaveAttribute('data-value', String(wanted), { timeout: 10_000 })
    },
  })

  const MCP_DIRECTIONS = ['ra-plus', 'ra-minus', 'dec-plus', 'dec-minus'] as const
  type McpDirectionLocal = (typeof MCP_DIRECTIONS)[number]

  /** 主面板：方向移动（RA+/−、DEC+/−）。direction: ra-plus|ra-minus|dec-plus|dec-minus；durationMs 存在时模拟按下 durationMs 毫秒后松开（mousedown → sleep → mouseup），否则单次点击。 */
  registry.set('mount.panel.moveDirection', {
    async run(ctx, params: { direction: McpDirectionLocal; durationMs?: number }) {
      const dir = params?.direction
      if (!dir || !MCP_DIRECTIONS.includes(dir)) {
        console.log('[ai-control] mount.panel.moveDirection 缺少有效 direction，跳过')
        return
      }
      await ensureMountPanelOpen(ctx, ctx.stepTimeoutMs)
      const btn = ctx.page.getByTestId(`mcp-btn-${dir}`).first()
      await btn.scrollIntoViewIfNeeded().catch(() => {})
      await sleep(200)
      const durationMs = params?.durationMs ?? 0
      if (durationMs > 0) {
        const box = await btn.boundingBox().catch(() => null)
        if (box) {
          await ctx.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
          await ctx.page.mouse.down()
          await sleep(Math.min(durationMs, 10_000))
          await ctx.page.mouse.up()
        } else {
          await clickLocator(btn, ctx.stepTimeoutMs)
        }
      } else {
        await clickLocator(btn, ctx.stepTimeoutMs)
      }
      console.log(`[ai-control] 赤道仪方向 ${dir}${durationMs > 0 ? ` ${durationMs}ms` : ''} 已执行`)
    },
  })

  /** 主面板：点击 Sync（mcp-btn-sync） */
  registry.set('mount.panel.clickSync', {
    async run(ctx) {
      await ensureMountPanelOpen(ctx, ctx.stepTimeoutMs)
      const btn = ctx.page.getByTestId('mcp-btn-sync').first()
      await btn.scrollIntoViewIfNeeded().catch(() => {})
      await sleep(200)
      await clickLocator(btn, ctx.stepTimeoutMs)
      console.log('[ai-control] 赤道仪 Sync 已点击')
    },
  })

  /** 主面板：点击 Solve（mcp-btn-solve） */
  registry.set('mount.panel.clickSolve', {
    async run(ctx) {
      await ensureMountPanelOpen(ctx, ctx.stepTimeoutMs)
      const btn = ctx.page.getByTestId('mcp-btn-solve').first()
      await btn.scrollIntoViewIfNeeded().catch(() => {})
      await sleep(200)
      await clickLocator(btn, ctx.stepTimeoutMs)
      console.log('[ai-control] 赤道仪 Solve 已点击')
    },
  })

  /** 主面板：按参数依次执行 Park/Track/Home/Stop/Sync/Solve/方向移动。先 ensurePanelOpen，再按 mcpInteract 各 key 执行。 */
  registry.set('mount.panel.applyMcpInteract', {
    async run(ctx, params: McpInteractParams) {
      if (!params || typeof params !== 'object') return
      await ensureMountPanelOpen(ctx, ctx.stepTimeoutMs)
      if (typeof params.slewSpeed === 'number') {
        const def = registry.get('mount.panel.setSlewSpeed')
        if (def) await def.run(ctx, { value: params.slewSpeed })
      }
      if (typeof params.park === 'boolean') {
        const def = registry.get('mount.panel.setPark')
        if (def) await def.run(ctx, { on: params.park })
      }
      if (typeof params.track === 'boolean') {
        const def = registry.get('mount.panel.setTrack')
        if (def) await def.run(ctx, { on: params.track })
      }
      if (params.home === true) {
        const def = registry.get('mount.panel.clickHome')
        if (def) await def.run(ctx, {})
      }
      if (params.sync === true) {
        const def = registry.get('mount.panel.clickSync')
        if (def) await def.run(ctx, {})
      }
      if (params.solve === true) {
        const def = registry.get('mount.panel.clickSolve')
        if (def) await def.run(ctx, {})
      }
      if (params.moveAllDirections === true) {
        const def = registry.get('mount.panel.moveDirection')
        const durationMs = Math.max(params.moveDurationMs ?? params.move?.durationMs ?? 5_000, 5_000)
        if (def) {
          for (const direction of MCP_DIRECTIONS) {
            await def.run(ctx, { direction, durationMs })
            await sleep(300)
          }
        }
      } else if (params.move?.direction && MCP_DIRECTIONS.includes(params.move.direction)) {
        const def = registry.get('mount.panel.moveDirection')
        if (def) await def.run(ctx, { direction: params.move.direction, durationMs: params.move.durationMs })
      }
      if (params.stop === true) {
        const def = registry.get('mount.panel.clickStop')
        if (def) await def.run(ctx, {})
      }
    },
  })

  return registry
}
