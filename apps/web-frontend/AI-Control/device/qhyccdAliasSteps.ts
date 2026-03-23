/**
 * AI-Control QHYCCD 预设别名步骤。
 *
 * 将 device 侧的 gotoHome、ensureDeviceSidebar、connectIfNeeded、ensureCapturePanel、captureOnce、save
 * 包装为默认 deviceType=MainCamera、driverText=QHYCCD、connectionModeText=SDK 的 qhy.* 步骤，便于 CLI/Flow 调用。
 */
import type { FlowContext, StepRegistry } from '../core/flowTypes'
import { createStepError } from '../shared/errors'
import { makeCaptureStepRegistry } from './captureSteps'
import { makeConnectionStepRegistry } from './connectionSteps'

/** 仅包含 connection + capture 的注册表，用于按 id 取 step 并包装 */
function makeBaseRegistry() {
  const registry: StepRegistry = new Map()
  for (const [id, def] of makeConnectionStepRegistry().entries()) registry.set(id, def)
  for (const [id, def] of makeCaptureStepRegistry().entries()) registry.set(id, def)
  return registry
}

/** 将指定 device step 包装为带默认参数的 step（MainCamera + QHYCCD + SDK），params 可覆盖 */
function wrapDeviceStep(deviceStepId: string, defaults: Record<string, any> = {}) {
  const deviceRegistry = makeBaseRegistry()
  const def = deviceRegistry.get(deviceStepId)
  if (!def) throw createStepError('qhyccdAlias', 'params', '缺少 AI-Control device step', { deviceStepId })

  return {
    description: `Alias for ${deviceStepId}`,
    async run(ctx: FlowContext, params: Record<string, any>) {
      await def.run(ctx, {
        deviceType: 'MainCamera',
        driverType: 'MainCamera',
        driverText: 'QHYCCD',
        connectionModeText: 'SDK',
        ...defaults,
        ...(params ?? {}),
      })
    },
  }
}

export function makeQhyccdAliasStepRegistry(): StepRegistry {
  const registry: StepRegistry = new Map()
  registry.set('qhy.gotoHome', wrapDeviceStep('device.gotoHome'))
  registry.set('qhy.ensureDeviceSidebar', wrapDeviceStep('device.ensureDeviceSidebar'))
  registry.set('qhy.connectIfNeeded', wrapDeviceStep('device.connectIfNeeded'))
  registry.set('qhy.ensureCapturePanel', wrapDeviceStep('device.ensureCapturePanel'))
  registry.set('qhy.captureOnce', wrapDeviceStep('device.captureOnce'))
  registry.set('qhy.save', wrapDeviceStep('device.save'))
  return registry
}
