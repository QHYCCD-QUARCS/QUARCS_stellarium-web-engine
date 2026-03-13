import { expect } from '@playwright/test'
import type { FlowContext, StepRegistry } from '../core/flowTypes'
import {
  clickByTestId,
  deviceProbeTestId,
  selectVSelectItemText,
  sleep,
  waitForTestIdState,
} from '../shared/interaction'
import { ensureMenuDrawerClosed, gotoHome } from '../shared/navigation'
import { openDeviceSubmenu } from '../menu/drawerSteps'
import { bindInAllocationPanelIfVisible } from './allocationSteps'

type ConnectTarget = {
  deviceType: string
  driverText: string
  connectionModeText: string
  allocationDeviceMatch?: string
}

function normalizeCompareText(value: unknown) {
  return String(value ?? '')
    .toUpperCase()
    .replace(/\s+/g, '')
}

function resolveDeviceType(params: Record<string, any>) {
  return String(params.deviceType ?? params.driverType ?? 'MainCamera')
}

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

function valueByIndexOrFirst(values: string[], index: number, fallback = ''): string {
  if (values[index]) return values[index]
  if (values.length > 0) return values[0]
  return fallback
}

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

async function selectDriverIfVisible(ctx: FlowContext, driverText: string) {
  const panel = ctx.page.getByTestId('ui-app-device-connection-panel').first()
  const wrapper = panel.locator('.v-input').filter({ has: ctx.page.getByTestId('ui-app-select-confirm-driver') }).first()
  if (!(await wrapper.isVisible().catch(() => false))) return

  const wanted = normalizeCompareText(driverText)
  const current = normalizeCompareText(await wrapper.textContent().catch(() => ''))
  if (wanted && current.includes(wanted)) return
  await selectVSelectItemText(ctx.page, 'ui-app-select-confirm-driver', driverText, ctx.stepTimeoutMs)
}

async function selectConnectionModeIfVisible(ctx: FlowContext, modeText: string) {
  const panel = ctx.page.getByTestId('ui-app-device-connection-panel').first()
  const wrapper = panel
    .locator('.v-input')
    .filter({ has: ctx.page.getByTestId('ui-app-select-on-connection-mode-change') })
    .first()
  if (!(await wrapper.isVisible().catch(() => false))) return
  await selectVSelectItemText(ctx.page, 'ui-app-select-on-connection-mode-change', modeText, ctx.stepTimeoutMs)
}

async function waitForProbeState(ctx: FlowContext, deviceType: string, state: string, timeout?: number) {
  await waitForTestIdState(ctx.page, deviceProbeTestId(deviceType), state, timeout ?? ctx.stepTimeoutMs)
}

async function ensureConnectionPanelReady(ctx: FlowContext, deviceType: string) {
  await openDeviceSubmenu(ctx, deviceType)
  const panel = ctx.page.getByTestId('ui-app-device-connection-panel').first()
  await expect(panel).toHaveAttribute('data-state', 'ready', { timeout: ctx.stepTimeoutMs })
  await expect(panel).toBeVisible({ timeout: ctx.stepTimeoutMs })
}

async function ensureSingleDeviceConnected(ctx: FlowContext, target: ConnectTarget, params: Record<string, any>) {
  const { deviceType, driverText, connectionModeText, allocationDeviceMatch } = target
  const probe = ctx.page.getByTestId(deviceProbeTestId(deviceType)).first()

  await openDeviceSubmenu(ctx, deviceType)

  const probeState = await probe.getAttribute('data-state').catch(() => null)
  if (probeState === 'connected') {
    await ensureMenuDrawerClosed(ctx.page, ctx.stepTimeoutMs)
    return
  }

  await ensureConnectionPanelReady(ctx, deviceType)
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
  await ensureMenuDrawerClosed(ctx.page, ctx.stepTimeoutMs)
}

async function ensureDevicesConnected(ctx: FlowContext, params: Record<string, any>) {
  const targets = resolveConnectTargets(params)
  for (const target of targets) {
    await ensureSingleDeviceConnected(ctx, target, params)
  }
}

export function makeConnectionStepRegistry(): StepRegistry {
  const registry: StepRegistry = new Map()

  registry.set('device.gotoHome', {
    async run(ctx) {
      await gotoHome(ctx.page, ctx.stepTimeoutMs)
    },
  })

  registry.set('device.ensureDeviceSidebar', {
    async run(ctx, params) {
      await openDeviceSubmenu(ctx, resolveDeviceType(params))
    },
  })

  registry.set('device.ensureDeviceSidebarFor', {
    async run(ctx, params) {
      await openDeviceSubmenu(ctx, resolveDeviceType(params))
    },
  })

  registry.set('device.sidebar.open', {
    async run(ctx, params) {
      await openDeviceSubmenu(ctx, resolveDeviceType(params))
    },
  })

  registry.set('device.connection.waitReady', {
    async run(ctx, params) {
      await ensureConnectionPanelReady(ctx, resolveDeviceType(params))
    },
  })

  registry.set('device.connection.selectDriver', {
    async run(ctx, params) {
      const driverText = String(params.driverText ?? '')
      if (!driverText) throw new Error('device.connection.selectDriver 缺少 driverText')
      await ensureConnectionPanelReady(ctx, resolveDeviceType(params))
      await selectDriverIfVisible(ctx, driverText)
    },
  })

  registry.set('device.connection.selectMode', {
    async run(ctx, params) {
      const connectionModeText = String(params.connectionModeText ?? '')
      if (!connectionModeText) throw new Error('device.connection.selectMode 缺少 connectionModeText')
      await ensureConnectionPanelReady(ctx, resolveDeviceType(params))
      await selectConnectionModeIfVisible(ctx, connectionModeText)
    },
  })

  registry.set('device.connection.clickConnect', {
    async run(ctx, params) {
      await ensureConnectionPanelReady(ctx, resolveDeviceType(params))
      await clickByTestId(ctx.page, 'ui-app-btn-connect-driver', params.timeoutMs ?? ctx.stepTimeoutMs)
    },
  })

  registry.set('device.connection.waitConnected', {
    async run(ctx, params) {
      await waitForProbeState(
        ctx,
        resolveDeviceType(params),
        'connected',
        params.timeoutMs ?? Math.max(ctx.stepTimeoutMs, 60_000),
      )
    },
  })

  registry.set('device.connectIfNeeded', {
    async run(ctx, params) {
      await ensureDevicesConnected(ctx, params)
    },
  })

  return registry
}
