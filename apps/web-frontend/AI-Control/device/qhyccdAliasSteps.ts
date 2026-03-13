import type { FlowContext, StepRegistry } from '../core/flowTypes'
import { makeCaptureStepRegistry } from './captureSteps'
import { makeConnectionStepRegistry } from './connectionSteps'

function makeBaseRegistry() {
  const registry: StepRegistry = new Map()
  for (const [id, def] of makeConnectionStepRegistry().entries()) registry.set(id, def)
  for (const [id, def] of makeCaptureStepRegistry().entries()) registry.set(id, def)
  return registry
}

function wrapDeviceStep(deviceStepId: string, defaults: Record<string, any> = {}) {
  const deviceRegistry = makeBaseRegistry()
  const def = deviceRegistry.get(deviceStepId)
  if (!def) throw new Error(`缺少 AI-Control device step: ${deviceStepId}`)

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
