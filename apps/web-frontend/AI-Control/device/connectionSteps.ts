/**
 * AI-Control 设备连接步骤。
 *
 * 职责：回首页、打开设备侧栏、等待连接面板就绪、选择驱动/连接模式、点击连接、等待已连接、
 * 以及一站式 device.connectIfNeeded（含分配面板绑定）。支持单设备或多设备（params.devices / deviceTypes 等）。
 */
import { expect } from '@playwright/test'
import type { FlowContext, StepRegistry } from '../core/flowTypes'
import {
  clickByTestId,
  deviceProbeTestId,
  selectVSelectItemText,
  sleep,
  waitForTestIdState,
} from '../shared/interaction'
import { createStepError } from '../shared/errors'
import { ensureMenuDrawerClosed, gotoHome } from '../shared/navigation'
import { openDeviceSubmenu } from '../menu/drawerSteps'
import { bindInAllocationPanelIfVisible } from './allocationSteps'

type ConnectTarget = {
  deviceType: string
  driverText: string
  connectionModeText: string
  allocationDeviceMatch?: string
}

/** 规范化用于比较的文案（大写、去空白） */
function normalizeCompareText(value: unknown) {
  return String(value ?? '')
    .toUpperCase()
    .replace(/\s+/g, '')
}

function resolveDeviceType(params: Record<string, any>) {
  return String(params.deviceType ?? params.driverType ?? 'MainCamera')
}

/** 将 params 中的 CSV 或数组转为字符串数组 */
function splitCsvLike(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((x) => String(x ?? '').trim()).filter(Boolean)
  }
  if (value == null) return []
  return String(value)
    .split(/[,\n|]/)
    .map((x) => x.trim())
    .filter(Boolean)
}

/** 按索引取数组元素，缺省时取首项或 fallback */
function valueByIndexOrFirst(values: string[], index: number, fallback = ''): string {
  if (values[index]) return values[index]
  if (values.length > 0) return values[0]
  return fallback
}

/** 从 params 解析出待连接设备列表（支持 devices 数组或 deviceTypes/driverTexts 等 CSV） */
function resolveConnectTargets(params: Record<string, any>): ConnectTarget[] {
  if (Array.isArray(params.devices) && params.devices.length > 0) {
    const parsed = params.devices
      .map((item: any) => ({
        deviceType: String(item?.deviceType ?? item?.driverType ?? '').trim(),
        driverText: String(item?.driverText ?? '').trim(),
        connectionModeText: String(item?.connectionModeText ?? '').trim(),
        allocationDeviceMatch:
          item?.allocationDeviceMatch != null ? String(item.allocationDeviceMatch).trim() || undefined : undefined,
      }))
      .filter((x) => x.deviceType)
    if (parsed.length > 0) return parsed
  }

  const deviceTypes = splitCsvLike(params.deviceTypes ?? params.driverTypes ?? params.deviceType ?? params.driverType)
  const driverTexts = splitCsvLike(params.driverTexts ?? params.driverText)
  const connectionModes = splitCsvLike(params.connectionModeTexts ?? params.connectionModeText)
  const allocationMatches = splitCsvLike(params.allocationDeviceMatches ?? params.allocationDeviceMatch)
  const fallbackDeviceType = resolveDeviceType(params)
  const total = Math.max(deviceTypes.length, 1)

  const targets: ConnectTarget[] = []
  for (let i = 0; i < total; i += 1) {
    targets.push({
      deviceType: valueByIndexOrFirst(deviceTypes, i, fallbackDeviceType),
      driverText: valueByIndexOrFirst(driverTexts, i, String(params.driverText ?? 'QHYCCD')),
      connectionModeText: valueByIndexOrFirst(connectionModes, i, String(params.connectionModeText ?? '')),
      allocationDeviceMatch: valueByIndexOrFirst(allocationMatches, i, '').trim() || undefined,
    })
  }
  return targets
}

/** 连接面板可见时选择驱动（ui-app-select-confirm-driver） */
async function selectDriverIfVisible(ctx: FlowContext, driverText: string) {
  const panel = ctx.page.getByTestId('ui-app-device-connection-panel').first()
  const wrapper = panel.locator('.v-input').filter({ has: ctx.page.getByTestId('ui-app-select-confirm-driver') }).first()
  if (!(await wrapper.isVisible().catch(() => false))) return

  const wanted = normalizeCompareText(driverText)
  const current = normalizeCompareText(await wrapper.textContent().catch(() => ''))
  if (wanted && current.includes(wanted)) return
  await selectVSelectItemText(ctx.page, 'ui-app-select-confirm-driver', driverText, ctx.stepTimeoutMs)
}

/** 连接面板可见时选择连接模式（ui-app-select-on-connection-mode-change） */
async function selectConnectionModeIfVisible(ctx: FlowContext, modeText: string) {
  const panel = ctx.page.getByTestId('ui-app-device-connection-panel').first()
  const wrapper = panel
    .locator('.v-input')
    .filter({ has: ctx.page.getByTestId('ui-app-select-on-connection-mode-change') })
    .first()
  if (!(await wrapper.isVisible().catch(() => false))) return
  await selectVSelectItemText(ctx.page, 'ui-app-select-on-connection-mode-change', modeText, ctx.stepTimeoutMs)
}

/** 等待设备探针进入指定 state */
async function waitForProbeState(ctx: FlowContext, deviceType: string, state: string, timeout?: number) {
  await waitForTestIdState(ctx.page, deviceProbeTestId(deviceType), state, timeout ?? ctx.stepTimeoutMs)
}

async function getProbeState(ctx: FlowContext, deviceType: string) {
  return ctx.page.getByTestId(deviceProbeTestId(deviceType)).first().getAttribute('data-state').catch(() => null)
}

/** 打开设备子菜单并等待连接面板 data-state=ready；若面板被父级 CSS 判为 hidden 则仅以 data-state 为准以便流程继续 */
async function ensureConnectionPanelReady(
  ctx: FlowContext,
  deviceType: string,
  options?: { skipOpen?: boolean },
) {
  if (!options?.skipOpen) {
    await openDeviceSubmenu(ctx, deviceType)
  }
  await sleep(600)
  const panel = ctx.page.getByTestId('ui-app-device-connection-panel').first()
  await expect(panel).toHaveAttribute('data-state', 'ready', { timeout: ctx.stepTimeoutMs })
  await panel.scrollIntoViewIfNeeded().catch(() => {})
  await sleep(300)
}

/** 单设备连接：打开侧栏、选驱动/模式、点连接、可选处理分配弹窗并等待 connected */
async function ensureSingleDeviceConnected(ctx: FlowContext, target: ConnectTarget, params: Record<string, any>) {
  const { deviceType, driverText, connectionModeText, allocationDeviceMatch } = target
  const keepDrawerOpen = params.keepDrawerOpen === true
  const probeState = await getProbeState(ctx, deviceType)
  if (probeState === 'connected') {
    if (!keepDrawerOpen) {
      await ensureMenuDrawerClosed(ctx.page, ctx.stepTimeoutMs)
    }
    return
  }
  await ensureConnectionPanelReady(ctx, deviceType)

  const probe = ctx.page.getByTestId(deviceProbeTestId(deviceType)).first()

  if (driverText) await selectDriverIfVisible(ctx, driverText)
  if (connectionModeText) await selectConnectionModeIfVisible(ctx, connectionModeText)
  await clickByTestId(ctx.page, 'ui-app-btn-connect-driver', ctx.stepTimeoutMs)

  const connectTimeoutMs = params.timeoutMs ?? Math.max(ctx.stepTimeoutMs, 60_000)
  const doBindAllocation = params.doBindAllocation !== false
  if (doBindAllocation) {
    const deadline = Date.now() + connectTimeoutMs
    while (Date.now() < deadline) {
      const state = await probe.getAttribute('data-state').catch(() => null)
      if (state === 'connected') break
      const handled = await bindInAllocationPanelIfVisible(ctx, deviceType, allocationDeviceMatch)
      if (handled) await sleep(500)
      await sleep(400)
    }
  }

  await waitForProbeState(ctx, deviceType, 'connected', connectTimeoutMs)
  if (!keepDrawerOpen) {
    await ensureMenuDrawerClosed(ctx.page, ctx.stepTimeoutMs)
  }
}

/** 按 resolveConnectTargets 结果依次连接多设备 */
async function ensureDevicesConnected(ctx: FlowContext, params: Record<string, any>) {
  const targets = resolveConnectTargets(params)
  for (const target of targets) {
    await ensureSingleDeviceConnected(ctx, target, params)
  }
}

export function makeConnectionStepRegistry(): StepRegistry {
  const registry: StepRegistry = new Map()

  /** 打开应用首页并等待 ui-app-root */
  registry.set('device.gotoHome', {
    description: '回首页/刷新页面',
    async run(ctx) {
      await gotoHome(ctx.page, ctx.stepTimeoutMs)
    },
  })

  /** 打开指定设备类型的设备侧栏（子菜单） */
  registry.set('device.ensureDeviceSidebar', {
    async run(ctx, params) {
      await openDeviceSubmenu(ctx, resolveDeviceType(params))
    },
  })

  /** 同 device.ensureDeviceSidebar */
  registry.set('device.ensureDeviceSidebarFor', {
    async run(ctx, params) {
      await openDeviceSubmenu(ctx, resolveDeviceType(params))
    },
  })

  /** 打开设备侧栏（同 device.ensureDeviceSidebar） */
  registry.set('device.sidebar.open', {
    async run(ctx, params) {
      await openDeviceSubmenu(ctx, resolveDeviceType(params))
    },
  })

  /** 等待连接面板 data-state=ready */
  registry.set('device.connection.waitReady', {
    async run(ctx, params) {
      await ensureConnectionPanelReady(ctx, resolveDeviceType(params))
    },
  })

  /** 选择驱动，params.driverText 必填 */
  registry.set('device.connection.selectDriver', {
    async run(ctx, params) {
      const driverText = String(params.driverText ?? '')
      if (!driverText) throw createStepError('device.connection.selectDriver', 'params', '缺少 driverText')
      await ensureConnectionPanelReady(ctx, resolveDeviceType(params))
      await selectDriverIfVisible(ctx, driverText)
    },
  })

  /** 选择连接模式，params.connectionModeText 必填 */
  registry.set('device.connection.selectMode', {
    async run(ctx, params) {
      const connectionModeText = String(params.connectionModeText ?? '')
      if (!connectionModeText) throw createStepError('device.connection.selectMode', 'params', '缺少 connectionModeText')
      await ensureConnectionPanelReady(ctx, resolveDeviceType(params))
      await selectConnectionModeIfVisible(ctx, connectionModeText)
    },
  })

  /** 点击连接按钮 ui-app-btn-connect-driver */
  registry.set('device.connection.clickConnect', {
    async run(ctx, params) {
      const deviceType = resolveDeviceType(params)
      const probeState = await getProbeState(ctx, deviceType)
      if (probeState === 'connected') {
        console.log(`[ai-control] ${deviceType} 已连接，跳过点击连接`)
        return
      }
      await ensureConnectionPanelReady(ctx, deviceType)
      await clickByTestId(ctx.page, 'ui-app-btn-connect-driver', params.timeoutMs ?? ctx.stepTimeoutMs)
    },
  })

  /** 等待设备探针 data-state=connected */
  registry.set('device.connection.waitConnected', {
    async run(ctx, params) {
      const deviceType = resolveDeviceType(params)
      const probeState = await getProbeState(ctx, deviceType)
      if (probeState === 'connected') {
        console.log(`[ai-control] ${deviceType} 已连接，跳过等待 connected`)
        return
      }
      await ensureConnectionPanelReady(ctx, deviceType)
      await waitForProbeState(
        ctx,
        deviceType,
        'connected',
        params.timeoutMs ?? Math.max(ctx.stepTimeoutMs, 60_000),
      )
    },
  })

  /** 按 params 解析目标设备并依次连接（含分配绑定与等待 connected） */
  registry.set('device.connectIfNeeded', {
    async run(ctx, params) {
      await ensureDevicesConnected(ctx, params)
    },
  })

  return registry
}
