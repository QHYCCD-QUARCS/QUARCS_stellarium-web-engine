import { expect } from '@playwright/test'
import type { FlowContext, StepRegistry } from '../core/flowTypes'
import { clickLocator, sleep } from '../shared/interaction'

async function resolvePicker(ctx: FlowContext, deviceType: string) {
  const dap = ctx.page.getByTestId('dap-root').first()
  if (!(await dap.isVisible().catch(() => false))) return null

  const pickers = dap.getByTestId('dp-picker')
  await expect(pickers.first()).toBeVisible({ timeout: ctx.stepTimeoutMs }).catch(() => {})

  const count = await pickers.count()
  for (let i = 0; i < count; i += 1) {
    const picker = pickers.nth(i)
    const typeText = ((await picker.getByTestId('dp-device-type').textContent().catch(() => '')) ?? '').trim()
    if (typeText === deviceType) return picker
  }
  return null
}

async function selectAllocationDevice(ctx: FlowContext, deviceNameMatch?: string) {
  const dap = ctx.page.getByTestId('dap-root').first()
  const deviceItems = dap.getByTestId('dap-act-selected-device-name-2')
  if ((await deviceItems.count()) === 0) return null

  const matchLower = (deviceNameMatch ?? '').trim().toLowerCase()
  let targetDevice = deviceItems.first()
  if (matchLower) {
    const itemCount = await deviceItems.count()
    for (let i = 0; i < itemCount; i += 1) {
      const item = deviceItems.nth(i)
      const name = ((await item.textContent().catch(() => '')) ?? '').trim().toLowerCase()
      if (name.includes(matchLower)) {
        targetDevice = item
        break
      }
    }
  }

  await expect(targetDevice).toBeVisible({ timeout: ctx.stepTimeoutMs })
  await clickLocator(targetDevice, ctx.stepTimeoutMs)
  await sleep(300)
  return targetDevice
}

export async function bindInAllocationPanelIfVisible(ctx: FlowContext, deviceType: string, deviceNameMatch?: string) {
  const picker = await resolvePicker(ctx, deviceType)
  if (!picker) return false

  const state = await picker.getAttribute('data-state').catch(() => '')
  if (state === 'bound') return true

  await clickLocator(picker, ctx.stepTimeoutMs)
  await sleep(300)
  await selectAllocationDevice(ctx, deviceNameMatch)

  const bindBtn = picker.getByTestId('dp-btn-toggle-bind')
  if ((await bindBtn.getAttribute('data-state').catch(() => '')) === 'unbound') {
    await clickLocator(bindBtn, ctx.stepTimeoutMs)
    await sleep(500)
  }

  const closeBtn = ctx.page.getByTestId('dap-act-close-panel').first()
  if (await closeBtn.isVisible().catch(() => false)) {
    await clickLocator(closeBtn, ctx.stepTimeoutMs)
    await sleep(300)
  }
  return true
}

export function makeAllocationStepRegistry(): StepRegistry {
  const registry: StepRegistry = new Map()

  registry.set('device.allocation.openRole', {
    async run(ctx, params) {
      const deviceType = String(params.deviceType ?? params.driverType ?? 'MainCamera')
      const picker = await resolvePicker(ctx, deviceType)
      if (!picker) throw new Error(`未找到分配角色: ${deviceType}`)
      await clickLocator(picker, params.timeoutMs ?? ctx.stepTimeoutMs)
    },
  })

  registry.set('device.allocation.selectDevice', {
    async run(ctx, params) {
      await selectAllocationDevice(ctx, params.allocationDeviceMatch != null ? String(params.allocationDeviceMatch) : undefined)
    },
  })

  registry.set('device.allocation.bindRole', {
    async run(ctx, params) {
      const deviceType = String(params.deviceType ?? params.driverType ?? 'MainCamera')
      const picker = await resolvePicker(ctx, deviceType)
      if (!picker) throw new Error(`未找到分配角色: ${deviceType}`)
      const bindBtn = picker.getByTestId('dp-btn-toggle-bind')
      await expect(bindBtn).toBeVisible({ timeout: params.timeoutMs ?? ctx.stepTimeoutMs })
      await clickLocator(bindBtn, params.timeoutMs ?? ctx.stepTimeoutMs)
    },
  })

  registry.set('device.allocation.close', {
    async run(ctx, params) {
      const closeBtn = ctx.page.getByTestId('dap-act-close-panel').first()
      if (await closeBtn.isVisible().catch(() => false)) {
        await clickLocator(closeBtn, params.timeoutMs ?? ctx.stepTimeoutMs)
      }
    },
  })

  registry.set('device.allocation.bindIfVisible', {
    async run(ctx, params) {
      if (params.doBindAllocation === false) return
      const deviceType = String(params.deviceType ?? params.driverType ?? 'MainCamera')
      await bindInAllocationPanelIfVisible(
        ctx,
        deviceType,
        params.allocationDeviceMatch != null ? String(params.allocationDeviceMatch) : undefined,
      )
    },
  })

  return registry
}
