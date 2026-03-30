/**
 * AI-Control 拍摄与保存步骤。
 *
 * 职责：确保拍摄面板打开、单次拍摄、保存、设置曝光时间、按需断开设备。
 * 前置条件：设备已连接（通过 deviceProbeTestId 的 data-state=connected 校验）；拍摄前要求 cp-status=idle，
 * 拍摄成功判定：优先 Qt「ExposureCompleted」探针 e2e-exposure-completed（短曝光时比 cp-status busy 可靠），
 * 并与 e2e-tilegpm（TileGPM）二选一满足即视为本帧完成；cp-status 仅作尽力同步。
 */
import { expect, type Page } from '@playwright/test'
import type { FlowContext, StepRegistry } from '../core/flowTypes'
import { createStepError } from '../shared/errors'
import {
  MESSAGE_BOX_ROOT_TESTID,
  SAVE_FAILURE_SUBSTRINGS,
  SAVE_SUCCESS_SUBSTRINGS,
} from '../shared/messageConstants'
import { clickByTestId, clickLocator, deviceProbeTestId, waitForTestIdState, sleep } from '../shared/interaction'
import { ensureCaptureUiVisible, ensureMenuDrawerClosed } from '../shared/navigation'
import { openDeviceSubmenu } from '../menu/drawerSteps'
import { confirmDialogIfOpen, disconnectDriverDialogIfOpen } from '../menu/dialogSteps'

const EXPOSURE_PRESETS = ['1ms', '10ms', '100ms', '1s', '5s', '10s', '30s', '60s', '120s', '300s', '600s']

/** cp-status busy→idle：曝光时长 + 该缓冲（毫秒） */
const CAPTURE_WAIT_BUFFER_MS = 60_000

/** e2e-tilegpm data-seq 自增依赖 TileGPM，常晚于 MainCameraStatus 已 idle，单独加长 */
const SEQ_CHANGE_BUFFER_MS = 120_000

function normalizeExposure(value: string) {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, '')
}

/** 将拍摄面板曝光文案（如 10ms、1s）解析为毫秒；无法解析时返回 null */
function parseExposurePresetToMs(normalized: string): number | null {
  const n = normalizeExposure(normalized)
  if (!n) return null
  const m = n.match(/^(\d+(?:\.\d+)?)(ms|s)$/)
  if (!m) return null
  const v = parseFloat(m[1])
  if (!Number.isFinite(v) || v < 0) return null
  if (m[2] === 'ms') return v
  return v * 1000
}

async function resolveCaptureTiming(
  ctx: FlowContext,
  params: Record<string, unknown>,
): Promise<{ statusWaitMs: number; seqWaitMs: number }> {
  const fromParam =
    typeof params.captureExposure === 'string' && params.captureExposure.trim() !== ''
      ? normalizeExposure(params.captureExposure.trim())
      : ''
  const fromUi = fromParam ? '' : normalizeExposure(await currentExposurePresetFromPanel(ctx.page))
  const raw = fromParam || fromUi
  const exposureMs = parseExposurePresetToMs(raw)
  if (exposureMs != null) {
    const em = Math.round(exposureMs)
    return {
      statusWaitMs: em + CAPTURE_WAIT_BUFFER_MS,
      seqWaitMs: em + SEQ_CHANGE_BUFFER_MS,
    }
  }
  const fallback =
    typeof params.waitCaptureTimeoutMs === 'number' && Number.isFinite(params.waitCaptureTimeoutMs)
      ? params.waitCaptureTimeoutMs
      : Math.max(ctx.stepTimeoutMs, 60_000)
  return { statusWaitMs: fallback, seqWaitMs: fallback }
}

function resolveDeviceType(params: Record<string, any>) {
  return String(params.deviceType ?? params.driverType ?? 'MainCamera')
}

/** 当前曝光预设：优先 cp-exptime-value 的 data-value（与 ExpTimes 一致），否则用可见文案 */
async function currentExposurePresetFromPanel(page: Page) {
  const el = page.getByTestId('cp-exptime-value').first()
  const dv = await el.getAttribute('data-value').catch(() => null)
  if (dv != null && String(dv).trim() !== '') return String(dv).trim()
  return ((await el.textContent()) ?? '').trim()
}

/** 校验设备已连接，否则抛错 */
/** 与 `CircularButton.vue` 的 `data-capture-ready` 对齐：为 true 时点拍才会调用 `takeExposure` */
async function waitForCaptureButtonReady(page: Page, timeoutMs: number, flowTag: string) {
  const root = page.getByTestId('cp-btn-capture').first()
  console.log(`[ai-control] device.captureOnce${flowTag} 等待拍摄按钮可再次拍摄 (data-capture-ready)`)
  const t0 = Date.now()
  await expect
    .poll(
      async () => {
        const v = await root.getAttribute('data-capture-ready').catch(() => null)
        if (v === null) return true
        return v === 'true'
      },
      { timeout: timeoutMs },
    )
    .toBe(true)
  console.log(`[ai-control] device.captureOnce${flowTag} 拍摄按钮已可再次拍摄（${Date.now() - t0}ms）`)
}

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

  /** 单次拍摄：点拍后以 ExposureCompleted / TileGPM 探针为主，cp-status 为辅（短曝光友好） */
  registry.set('device.captureOnce', {
    async run(ctx, params) {
      const flowIdx = typeof params.__flowStepIndex === 'number' ? params.__flowStepIndex : undefined
      const flowTot = typeof params.__flowStepTotal === 'number' ? params.__flowStepTotal : undefined
      const flowTag =
        flowIdx != null && flowTot != null ? ` [flow ${flowIdx}/${flowTot}]` : ''

      console.log(`[ai-control] device.captureOnce${flowTag} 前置: capture.panel.ensureOpen + cp-status=idle`)
      await ensureDeviceConnected(ctx, params)
      await ensureCaptureUiVisible(ctx.page, ctx.stepTimeoutMs)
      await waitForTestIdState(ctx.page, 'cp-status', 'idle', ctx.stepTimeoutMs)
      // 等待拍摄面板入场动画结束，避免 cp-btn-capture 尚未可点
      await sleep(600)
      // 将拍摄面板与拍摄按钮滚入视口，避免 headless 下按钮被判为不可见
      const panel = ctx.page.getByTestId('cp-panel').first()
      await panel.scrollIntoViewIfNeeded().catch(() => {})
      await sleep(200)

      const readyMs =
        typeof params.captureReadyTimeoutMs === 'number' && Number.isFinite(params.captureReadyTimeoutMs)
          ? Math.max(1_000, params.captureReadyTimeoutMs)
          : Math.max(30_000, ctx.stepTimeoutMs)
      await waitForCaptureButtonReady(ctx.page, readyMs, flowTag)

      const { statusWaitMs, seqWaitMs } = await resolveCaptureTiming(ctx, params)
      console.log(
        `[ai-control] device.captureOnce${flowTag} 超时: cp-status(尽力)≤${statusWaitMs}ms, ExposureCompleted|TileGPM≤${seqWaitMs}ms（曝光+${SEQ_CHANGE_BUFFER_MS / 1000}s）`,
      )

      const expBefore = await ctx.page.getByTestId('e2e-exposure-completed').first().getAttribute('data-seq').catch(() => null)
      const tileBefore = await ctx.page.getByTestId('e2e-tilegpm').first().getAttribute('data-seq').catch(() => null)
      const cpBefore = await ctx.page.getByTestId('cp-status').first().getAttribute('data-state').catch(() => null)
      console.log(
        `[ai-control] device.captureOnce${flowTag} 点击前: cp-status=${cpBefore} e2e-exposure-completed.seq=${expBefore} e2e-tilegpm.seq=${tileBefore}`,
      )

      const tClick = Date.now()
      await clickByTestId(ctx.page, 'cp-btn-capture', ctx.stepTimeoutMs)
      console.log(`[ai-control] device.captureOnce${flowTag} 已点击 cp-btn-capture`)

      const hasExpProbe = expBefore != null
      const hasTileProbe = tileBefore != null

      try {
        if (hasExpProbe || hasTileProbe) {
          await expect
            .poll(
              async () => {
                const curExp = await ctx.page
                  .getByTestId('e2e-exposure-completed')
                  .first()
                  .getAttribute('data-seq')
                  .catch(() => null)
                const curTile = await ctx.page.getByTestId('e2e-tilegpm').first().getAttribute('data-seq').catch(() => null)
                const expOk = hasExpProbe && curExp != null && curExp !== expBefore
                const tileOk = hasTileProbe && curTile != null && curTile !== tileBefore
                return expOk || tileOk
              },
              { timeout: seqWaitMs },
            )
            .toBe(true)
        } else {
          const deadlineStatus = Date.now() + statusWaitMs
          const remainingStatusMs = () => Math.max(1, deadlineStatus - Date.now())
          await waitForTestIdState(ctx.page, 'cp-status', 'busy', Math.min(10_000, remainingStatusMs())).catch(() => {})
          await waitForTestIdState(ctx.page, 'cp-status', 'idle', remainingStatusMs())
        }
      } catch (e) {
        const expFinal = await ctx.page.getByTestId('e2e-exposure-completed').first().getAttribute('data-seq').catch(() => null)
        const tileFinal = await ctx.page.getByTestId('e2e-tilegpm').first().getAttribute('data-seq').catch(() => null)
        const cpNow = await ctx.page.getByTestId('cp-status').first().getAttribute('data-state').catch(() => null)
        console.error(
          `[ai-control] device.captureOnce${flowTag} 拍摄完成信号未在 ${seqWaitMs}ms 内出现: exp ${expBefore}→${expFinal} tile ${tileBefore}→${tileFinal} cp-status=${cpNow}`,
        )
        throw createStepError(
          'device.captureOnce',
          'postcondition',
          `未在 ${seqWaitMs}ms 内收到 ExposureCompleted 或 TileGPM 出图信号（见 e2e-exposure-completed / e2e-tilegpm）`,
          {
            flowStepIndex: flowIdx,
            flowStepTotal: flowTot,
            expBefore,
            expFinal,
            tileBefore,
            tileFinal,
            cpStatus: cpNow,
            seqWaitMs,
          },
          e,
        )
      }

      const tDone = Date.now()
      const expAfter = await ctx.page.getByTestId('e2e-exposure-completed').first().getAttribute('data-seq').catch(() => null)
      const tileAfter = await ctx.page.getByTestId('e2e-tilegpm').first().getAttribute('data-seq').catch(() => null)
      console.log(
        `[ai-control] device.captureOnce${flowTag} 探针已前进: exp ${expBefore}→${expAfter} tile ${tileBefore}→${tileAfter}（${tDone - tClick}ms）`,
      )

      await waitForTestIdState(ctx.page, 'cp-status', 'idle', Math.min(statusWaitMs, 15_000)).catch(() => {
        console.log(`[ai-control] device.captureOnce${flowTag} cp-status 未在短超时内回 idle（已忽略，以 ExposureCompleted/TileGPM 为准）`)
      })
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
      let current = normalizeExposure(await currentExposurePresetFromPanel(ctx.page))
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

      current = normalizeExposure(await currentExposurePresetFromPanel(ctx.page))
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
      await disconnectDriverDialogIfOpen(ctx.page, 'confirm', ctx.stepTimeoutMs).catch(() => false)
      await confirmDialogIfOpen(ctx.page, 'confirm', ctx.stepTimeoutMs).catch(() => false)

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

      await ensureMenuDrawerClosed(ctx.page, ctx.stepTimeoutMs).catch(() => {})
    },
  })

  return registry
}
