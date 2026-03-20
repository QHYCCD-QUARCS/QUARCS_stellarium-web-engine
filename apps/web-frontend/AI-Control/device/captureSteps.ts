/**
 * AI-Control 拍摄与保存步骤。
 *
 * 职责：确保拍摄面板打开、单次拍摄、保存、设置曝光时间、按需断开设备。
 * 前置条件：设备已连接（通过 deviceProbeTestId 的 data-state=connected 校验）；拍摄前要求 cp-status=idle，
 * 拍摄后等待 cp-status 经 busy 再回到 idle，并可选校验 e2e-tilegpm 的 data-seq 变化以确认新图。
 */
import { expect, type Page } from '@playwright/test'
import type { FlowContext, StepRegistry } from '../core/flowTypes'
import {
  CONFIRM_DIALOG_BTN_CONFIRM,
  CONFIRM_DIALOG_ROOT_TESTID,
  DISCONNECT_DRIVER_DIALOG_BTN_CONFIRM,
  DISCONNECT_DRIVER_DIALOG_ROOT_TESTID,
} from '../shared/dialogConstants'
import { createStepError } from '../shared/errors'
import {
  MESSAGE_BOX_ROOT_TESTID,
  SAVE_FAILURE_SUBSTRINGS,
  SAVE_SUCCESS_SUBSTRINGS,
} from '../shared/messageConstants'
import { clickByTestId, clickLocator, deviceProbeTestId, waitForTestIdState, sleep } from '../shared/interaction'
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

/** 当前曝光显示文案（cp-exptime-value） */
async function currentExposureText(page: Page) {
  return ((await page.getByTestId('cp-exptime-value').first().textContent()) ?? '').trim()
}

/** 校验设备已连接，否则抛错 */
async function ensureDeviceConnected(ctx: FlowContext, params: Record<string, any>) {
  const deviceType = resolveDeviceType(params)
  const probe = ctx.page.getByTestId(deviceProbeTestId(deviceType)).first()
  const state = await probe.getAttribute('data-state').catch(() => null)
  if (state === 'connected') return
  throw createStepError('device.ensureDeviceConnected', 'precondition', '设备未连接', { deviceType, currentState: state })
}

export function makeCaptureStepRegistry(): StepRegistry {
  const registry: StepRegistry = new Map()

  /** 确保设备已连接且拍摄面板 cp-panel 可见 */
  registry.set('capture.panel.ensureOpen', {
    async run(ctx, params) {
      console.log('[ai-control] capture.panel.ensureOpen 前置: 设备已连接')
      await ensureDeviceConnected(ctx, params)
      await ensureCaptureUiVisible(ctx.page, params.timeoutMs ?? ctx.stepTimeoutMs)
      await expect(ctx.page.getByTestId('cp-panel').first()).toBeVisible({ timeout: params.timeoutMs ?? ctx.stepTimeoutMs })
    },
  })

  /** 别名：同 capture.panel.ensureOpen */
  registry.set('device.ensureCapturePanel', {
    async run(ctx, params) {
      await registry.get('capture.panel.ensureOpen')!.run(ctx, params)
    },
  })

  /** 单次拍摄：等待 idle -> 点 cp-btn-capture -> 等 busy -> idle，并校验 data-seq 变化 */
  registry.set('device.captureOnce', {
    async run(ctx, params) {
      console.log('[ai-control] device.captureOnce 前置: capture.panel.ensureOpen + cp-status=idle')
      await ensureDeviceConnected(ctx, params)
      await ensureCaptureUiVisible(ctx.page, ctx.stepTimeoutMs)
      await waitForTestIdState(ctx.page, 'cp-status', 'idle', ctx.stepTimeoutMs)
      // 等待拍摄面板入场动画结束，避免 cp-btn-capture 尚未可点
      await sleep(600)
      // 将拍摄面板与拍摄按钮滚入视口，避免 headless 下按钮被判为不可见
      const panel = ctx.page.getByTestId('cp-panel').first()
      await panel.scrollIntoViewIfNeeded().catch(() => {})
      await sleep(200)

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

  /** 点击保存按钮 cp-btn-save，等待 MessageBox 成功/失败反馈；params.doSave=false 时跳过 */
  registry.set('device.save', {
    async run(ctx, params) {
      if (params.doSave === false) return
      await ensureDeviceConnected(ctx, params)
      await ensureCaptureUiVisible(ctx.page, ctx.stepTimeoutMs)
      await clickByTestId(ctx.page, 'cp-btn-save', ctx.stepTimeoutMs)
      const timeoutMs = params.saveResultTimeoutMs ?? 15_000
      const deadline = Date.now() + timeoutMs
      while (Date.now() < deadline) {
        const box = ctx.page.getByTestId(MESSAGE_BOX_ROOT_TESTID).first()
        if (!(await box.isVisible().catch(() => false))) {
          await ctx.page.waitForTimeout(300)
          continue
        }
        const text = (await box.textContent().catch(() => '')) ?? ''
        if (SAVE_SUCCESS_SUBSTRINGS.some((s) => text.includes(s))) return
        const failure = SAVE_FAILURE_SUBSTRINGS.find((s) => text.includes(s))
        if (failure !== undefined) {
          throw createStepError('device.save', 'postcondition', `保存失败：页面反馈为 ${text.trim()}`, { messageText: text.trim() })
        }
        await ctx.page.waitForTimeout(300)
      }
      throw createStepError('device.save', 'postcondition', '保存结果未在限定时间内出现成功或失败提示', { timeoutMs })
    },
  })

  /** 通过 cp-btn-exptime-plus/minus 将曝光调到 params.exposure（需在 EXPOSURE_PRESETS 内） */
  registry.set('device.setExposureTime', {
    async run(ctx, params) {
      const target = normalizeExposure(String(params.exposure ?? ''))
      if (!target) throw createStepError('device.setExposureTime', 'params', '缺少 exposure')

      await ensureDeviceConnected(ctx, params)
      await ensureCaptureUiVisible(ctx.page, ctx.stepTimeoutMs)
      let current = normalizeExposure(await currentExposureText(ctx.page))
      if (current === target) return

      const currentIndex = EXPOSURE_PRESETS.findIndex((x) => normalizeExposure(x) === current)
      const targetIndex = EXPOSURE_PRESETS.findIndex((x) => normalizeExposure(x) === target)
      if (currentIndex < 0 || targetIndex < 0) {
        throw createStepError('device.setExposureTime', 'params', '不支持的曝光值切换', { current, target })
      }

      const buttonId = targetIndex > currentIndex ? 'cp-btn-exptime-plus' : 'cp-btn-exptime-minus'
      const steps = Math.abs(targetIndex - currentIndex)
      for (let i = 0; i < steps; i += 1) {
        await clickByTestId(ctx.page, buttonId, ctx.stepTimeoutMs)
        await ctx.page.waitForTimeout(150)
      }

      current = normalizeExposure(await currentExposureText(ctx.page))
      if (current !== target) {
        throw createStepError('device.setExposureTime', 'postcondition', '曝光值未生效', {
          expected: target,
          actual: current,
        })
      }
    },
  })

  /** 若设备已连接则进入设备侧栏、点击断开、处理确认弹窗（单设备或 gui 断开全部）并等待探针 data-state=disconnected */
  registry.set('device.disconnectIfNeeded', {
    async run(ctx, params) {
      const deviceType = resolveDeviceType(params)
      const probe = ctx.page.getByTestId(deviceProbeTestId(deviceType)).first()
      const state = await probe.getAttribute('data-state').catch(() => null)
      if (state !== 'connected') return

      await openDeviceSubmenu(ctx, deviceType)
      await clickLocator(ctx.page.getByTestId('ui-app-btn-disconnect-driver').first(), ctx.stepTimeoutMs)

      const singleDeviceRoot = ctx.page.getByTestId(DISCONNECT_DRIVER_DIALOG_ROOT_TESTID).first()
      const guiConfirmRoot = ctx.page.getByTestId(CONFIRM_DIALOG_ROOT_TESTID).first()
      const singleVisible = await singleDeviceRoot.isVisible().catch(() => false)
      const guiVisible = await guiConfirmRoot.isVisible().catch(() => false)
      if (singleVisible) {
        await clickByTestId(ctx.page, DISCONNECT_DRIVER_DIALOG_BTN_CONFIRM, ctx.stepTimeoutMs)
      } else if (guiVisible) {
        await clickByTestId(ctx.page, CONFIRM_DIALOG_BTN_CONFIRM, ctx.stepTimeoutMs)
      }

      const disconnectTimeoutMs = params.timeoutMs ?? Math.max(ctx.stepTimeoutMs, 30_000)
      try {
        await waitForTestIdState(
          ctx.page,
          deviceProbeTestId(deviceType),
          'disconnected',
          disconnectTimeoutMs,
        )
      } catch (e) {
        const currentState = await probe.getAttribute('data-state').catch(() => null)
        throw createStepError(
          'device.disconnectIfNeeded',
          'postcondition',
          '探针未在限定时间内变为 disconnected',
          { deviceType, currentState, timeoutMs: disconnectTimeoutMs },
          e,
        )
      }
    },
  })

  return registry
}
