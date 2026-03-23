/**
 * AI-Control 设备分配步骤。
 *
 * 职责：在设备分配面板（dap-root）内按设备类型定位 dp-picker、选择设备（dap-act-selected-device-name-2）、
 * 绑定角色（dp-btn-toggle-bind）、关闭面板。bindInAllocationPanelIfVisible 供连接流程在连接过程中处理弹窗绑定。
 */
import { expect } from '@playwright/test'
import type { FlowContext, StepRegistry } from '../core/flowTypes'
import { createStepError } from '../shared/errors'
import { clickLocator, sleep } from '../shared/interaction'

/** 在 dap-root 内按 deviceType（dp-device-type 文案）找到对应 dp-picker */
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

/** 在分配面板中按 deviceNameMatch 匹配并点击设备项（dap-act-selected-device-name-2） */
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

/** 等待分配面板出现且目标角色 picker 已渲染（连接后面板与 DeviceTypes 可能异步就绪） */
async function waitForAllocationPanelReady(ctx: FlowContext, deviceType: string, waitMs: number) {
  const dap = ctx.page.getByTestId('dap-root').first()
  await dap.waitFor({ state: 'visible', timeout: Math.min(waitMs, 8000) }).catch(() => {})
  const pickerWithType = dap
    .getByTestId('dp-picker')
    .filter({ has: ctx.page.getByTestId('dp-device-type').filter({ hasText: deviceType }) })
    .first()
  await pickerWithType.waitFor({ state: 'visible', timeout: Math.min(waitMs, 6000) }).catch(() => {})
  return resolvePicker(ctx, deviceType)
}

export async function bindInAllocationPanelIfVisible(ctx: FlowContext, deviceType: string, deviceNameMatch?: string) {
  const panelWaitMs = 8000
  const picker = await resolvePicker(ctx, deviceType) ?? await waitForAllocationPanelReady(ctx, deviceType, panelWaitMs)
  if (!picker) return false

  const state = await picker.getAttribute('data-state').catch(() => '')
  if (state === 'bound') return true

  await clickLocator(picker, ctx.stepTimeoutMs)
  await sleep(300)

  const dap = ctx.page.getByTestId('dap-root').first()
  const deviceItems = dap.getByTestId('dap-act-selected-device-name-2')
  const listWaitMs = 6000
  const listDeadline = Date.now() + listWaitMs
  while ((await deviceItems.count()) === 0 && Date.now() < listDeadline) {
    await sleep(400)
  }

  const selected = await selectAllocationDevice(ctx, deviceNameMatch)
  if (!selected) {
    const closeBtn = ctx.page.getByTestId('dap-act-close-panel').first()
    if (await closeBtn.isVisible().catch(() => false)) {
      await clickLocator(closeBtn, ctx.stepTimeoutMs)
      await sleep(300)
    }
    return false
  }

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

  /** 打开指定设备类型的分配角色选择器（点击对应 dp-picker） */
  registry.set('device.allocation.openRole', {
    async run(ctx, params) {
      const deviceType = String(params.deviceType ?? params.driverType ?? 'MainCamera')
      const picker = await resolvePicker(ctx, deviceType)
      if (!picker) throw createStepError('device.allocation.openRole', 'precondition', '未找到分配角色', { deviceType })
      await clickLocator(picker, params.timeoutMs ?? ctx.stepTimeoutMs)
    },
  })

  /** 在已打开的 picker 中选择设备，params.allocationDeviceMatch 为名称匹配串 */
  registry.set('device.allocation.selectDevice', {
    async run(ctx, params) {
      await selectAllocationDevice(ctx, params.allocationDeviceMatch != null ? String(params.allocationDeviceMatch) : undefined)
    },
  })

  /** 点击 dp-btn-toggle-bind 绑定当前角色 */
  registry.set('device.allocation.bindRole', {
    async run(ctx, params) {
      const deviceType = String(params.deviceType ?? params.driverType ?? 'MainCamera')
      const picker = await resolvePicker(ctx, deviceType)
      if (!picker) throw createStepError('device.allocation.bindRole', 'precondition', '未找到分配角色', { deviceType })
      const bindBtn = picker.getByTestId('dp-btn-toggle-bind')
      await expect(bindBtn).toBeVisible({ timeout: params.timeoutMs ?? ctx.stepTimeoutMs })
      await clickLocator(bindBtn, params.timeoutMs ?? ctx.stepTimeoutMs)
    },
  })

  /** 若分配面板有关闭按钮则点击 dap-act-close-panel */
  registry.set('device.allocation.close', {
    async run(ctx, params) {
      const closeBtn = ctx.page.getByTestId('dap-act-close-panel').first()
      if (await closeBtn.isVisible().catch(() => false)) {
        await clickLocator(closeBtn, params.timeoutMs ?? ctx.stepTimeoutMs)
      }
    },
  })

  /** 分配面板可见时执行绑定（打开角色、选设备、点绑定、关闭）；params.doBindAllocation=false 跳过 */
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
