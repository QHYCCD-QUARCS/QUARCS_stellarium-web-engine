import { expect, type Page } from '@playwright/test'
import type { FlowContext, StepRegistry } from '../core/flowTypes'
import { clickByTestId, clickLocator, deviceProbeTestId, waitForTestIdState } from '../shared/interaction'
import { ensureCaptureUiVisible } from '../shared/navigation'
import { openDeviceSubmenu } from '../menu/drawerSteps'

const EXPOSURE_PRESETS = ['1ms', '10ms', '100ms', '1s', '5s', '10s', '30s', '60s', '120s', '300s', '600s']

function normalizeExposure(value: string) {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, '')
}

function resolveDeviceType(params: Record<string, any>) {
  return String(params.deviceType ?? params.driverType ?? 'MainCamera')
}

async function currentExposureText(page: Page) {
  return ((await page.getByTestId('cp-exptime-value').first().textContent()) ?? '').trim()
}

async function ensureDeviceConnected(ctx: FlowContext, params: Record<string, any>) {
  const deviceType = resolveDeviceType(params)
  const probe = ctx.page.getByTestId(deviceProbeTestId(deviceType)).first()
  const state = await probe.getAttribute('data-state').catch(() => null)
  if (state === 'connected') return
  throw new Error(`前置条件不满足: ${deviceType} 未连接`)
}

export function makeCaptureStepRegistry(): StepRegistry {
  const registry: StepRegistry = new Map()

  registry.set('capture.panel.ensureOpen', {
    async run(ctx, params) {
      console.log('[ai-control] capture.panel.ensureOpen 前置: 设备已连接')
      await ensureDeviceConnected(ctx, params)
      await ensureCaptureUiVisible(ctx.page, params.timeoutMs ?? ctx.stepTimeoutMs)
      await expect(ctx.page.getByTestId('cp-panel').first()).toBeVisible({ timeout: params.timeoutMs ?? ctx.stepTimeoutMs })
    },
  })

  registry.set('device.ensureCapturePanel', {
    async run(ctx, params) {
      await registry.get('capture.panel.ensureOpen')!.run(ctx, params)
    },
  })

  registry.set('device.captureOnce', {
    async run(ctx, params) {
      console.log('[ai-control] device.captureOnce 前置: capture.panel.ensureOpen + cp-status=idle')
      await ensureDeviceConnected(ctx, params)
      await ensureCaptureUiVisible(ctx.page, ctx.stepTimeoutMs)
      await waitForTestIdState(ctx.page, 'cp-status', 'idle', ctx.stepTimeoutMs)

      const seqBefore = await ctx.page.getByTestId('e2e-tilegpm').first().getAttribute('data-seq').catch(() => null)
      await clickByTestId(ctx.page, 'cp-btn-capture', ctx.stepTimeoutMs)
      await waitForTestIdState(ctx.page, 'cp-status', 'busy', Math.min(10_000, params.waitCaptureTimeoutMs ?? ctx.stepTimeoutMs)).catch(() => {})
      await waitForTestIdState(
        ctx.page,
        'cp-status',
        'idle',
        params.waitCaptureTimeoutMs ?? Math.max(ctx.stepTimeoutMs, 60_000),
      )

      if (seqBefore != null) {
        await expect
          .poll(
            async () => ctx.page.getByTestId('e2e-tilegpm').first().getAttribute('data-seq'),
            { timeout: params.waitCaptureTimeoutMs ?? Math.max(ctx.stepTimeoutMs, 60_000) },
          )
          .not.toBe(seqBefore)
      }
    },
  })

  registry.set('device.save', {
    async run(ctx, params) {
      if (params.doSave === false) return
      await ensureDeviceConnected(ctx, params)
      await ensureCaptureUiVisible(ctx.page, ctx.stepTimeoutMs)
      await clickByTestId(ctx.page, 'cp-btn-save', ctx.stepTimeoutMs)
      await expect(ctx.page.getByTestId('cp-btn-save').first()).toBeVisible({ timeout: ctx.stepTimeoutMs })
    },
  })

  registry.set('device.setExposureTime', {
    async run(ctx, params) {
      const target = normalizeExposure(String(params.exposure ?? ''))
      if (!target) throw new Error('device.setExposureTime 缺少 exposure')

      await ensureDeviceConnected(ctx, params)
      await ensureCaptureUiVisible(ctx.page, ctx.stepTimeoutMs)
      let current = normalizeExposure(await currentExposureText(ctx.page))
      if (current === target) return

      const currentIndex = EXPOSURE_PRESETS.findIndex((x) => normalizeExposure(x) === current)
      const targetIndex = EXPOSURE_PRESETS.findIndex((x) => normalizeExposure(x) === target)
      if (currentIndex < 0 || targetIndex < 0) {
        throw new Error(`不支持的曝光值切换: current=${current} target=${target}`)
      }

      const buttonId = targetIndex > currentIndex ? 'cp-btn-exptime-plus' : 'cp-btn-exptime-minus'
      const steps = Math.abs(targetIndex - currentIndex)
      for (let i = 0; i < steps; i += 1) {
        await clickByTestId(ctx.page, buttonId, ctx.stepTimeoutMs)
        await ctx.page.waitForTimeout(150)
      }

      current = normalizeExposure(await currentExposureText(ctx.page))
      if (current !== target) {
        throw new Error(`曝光值未生效: expected=${target} actual=${current}`)
      }
    },
  })

  registry.set('device.disconnectIfNeeded', {
    async run(ctx, params) {
      const deviceType = resolveDeviceType(params)
      const probe = ctx.page.getByTestId(deviceProbeTestId(deviceType)).first()
      const state = await probe.getAttribute('data-state').catch(() => null)
      if (state !== 'connected') return

      await openDeviceSubmenu(ctx, deviceType)
      await clickLocator(ctx.page.getByTestId('ui-app-btn-disconnect-driver').first(), ctx.stepTimeoutMs)
      const dialogRoot = ctx.page.getByTestId('ui-confirm-dialog-root').first()
      if (await dialogRoot.isVisible().catch(() => false)) {
        await clickByTestId(ctx.page, 'ui-confirm-dialog-btn-confirm', ctx.stepTimeoutMs)
      }
      await waitForTestIdState(
        ctx.page,
        deviceProbeTestId(deviceType),
        'disconnected',
        params.timeoutMs ?? Math.max(ctx.stepTimeoutMs, 30_000),
      )
    },
  })

  return registry
}
