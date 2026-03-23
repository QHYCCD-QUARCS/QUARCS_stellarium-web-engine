/**
 * QHYCCD 主相机步骤别名注册表 (qhyccdSteps)
 *
 * 作用：
 * 将 deviceSteps 中与主相机相关的步骤封装为 qhy.* 别名，默认 deviceType/driverType 为 MainCamera，驱动为 QHYCCD，连接模式为 SDK。
 * 不新增交互逻辑，仅做参数默认值与步骤转发；实际交互遵循 deviceSteps 的规范（data-testid 定位、禁止 force）。
 *
 * 执行过程：
 * - wrapDeviceStep(deviceStepId, defaults)：从 makeDeviceStepRegistry() 取得对应步骤定义，run 时合并 deviceType: 'MainCamera'、driverText: 'QHYCCD'、connectionModeText: 'SDK' 与 defaults、params 后调用原步骤 run。
 * - 注册的步骤：qhy.gotoHome、qhy.ensureDeviceSidebar、qhy.connectIfNeeded、qhy.ensureCapturePanel、qhy.captureOnce、qhy.save。
 *
 * 规范：依赖 deviceSteps 的 testid 与可操作性检查；参考 testid-validation-report.md、testid-scan-report.md。
 */
import type { FlowContext, StepRegistry } from './flowTypes'
import { makeDeviceStepRegistry } from './deviceSteps'

function wrapDeviceStep(deviceStepId: string, defaults: Record<string, any> = {}) {
  const deviceRegistry = makeDeviceStepRegistry()
  const def = deviceRegistry.get(deviceStepId)
  if (!def) throw new Error(`缺少 device step: ${deviceStepId}`)

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

export function makeQhyccdStepRegistry(): StepRegistry {
  const registry: StepRegistry = new Map()
  registry.set('qhy.gotoHome', wrapDeviceStep('device.gotoHome'))
  registry.set('qhy.ensureDeviceSidebar', wrapDeviceStep('device.ensureDeviceSidebar'))
  registry.set('qhy.connectIfNeeded', wrapDeviceStep('device.connectIfNeeded'))
  registry.set('qhy.ensureCapturePanel', wrapDeviceStep('device.ensureCapturePanel'))
  registry.set('qhy.captureOnce', wrapDeviceStep('device.captureOnce'))
  registry.set('qhy.save', wrapDeviceStep('device.save'))
  return registry
}
