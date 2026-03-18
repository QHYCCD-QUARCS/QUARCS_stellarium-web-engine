import { expect } from '@playwright/test'
import type { FlowContext, StepRegistry } from '../core/flowTypes'
import {
  CONFIRM_ACTION,
  CONFIRM_DIALOG_BTN_AUTOFOCUS_COARSE,
  CONFIRM_DIALOG_BTN_AUTOFOCUS_FINE,
  CONFIRM_DIALOG_BTN_CANCEL,
} from '../shared/dialogConstants'
import { clickByTestId, clickLocator, deviceProbeTestId, sleep } from '../shared/interaction'
import { ensureCaptureUiVisible } from '../shared/navigation'
import { createStepError } from '../shared/errors'
import { confirmDialogIfOpen } from '../menu/dialogSteps'

type FocuserMoveParams = {
  direction: 'left' | 'right'
  durationMs?: number
}

export type FocuserInteractParams = {
  speed?: 1 | 3 | 5
  roiLength?: 100 | 300 | 500
  move?: FocuserMoveParams
  loopShooting?: boolean
  startCalibration?: boolean | 'cancel'
  autoFocusMode?: 'coarse' | 'fine' | 'cancel'
  stopAutoFocus?: boolean
}

async function ensureFocuserConnected(ctx: FlowContext) {
  const probe = ctx.page.getByTestId(deviceProbeTestId('Focuser')).first()
  await expect(probe).toHaveAttribute('data-state', 'connected', {
    timeout: Math.max(ctx.stepTimeoutMs, 30_000),
  })
}

async function ensureFocuserPanelOpen(ctx: FlowContext) {
  await ensureFocuserConnected(ctx)
  await ensureCaptureUiVisible(ctx.page, ctx.stepTimeoutMs)
  const root = ctx.page.getByTestId('fp-root').first()
  if (await root.isVisible().catch(() => false)) return
  await clickByTestId(ctx.page, 'cp-btn-toggle-focuser', ctx.stepTimeoutMs)
  await expect(root).toBeVisible({ timeout: ctx.stepTimeoutMs })
}

async function currentSpeed(ctx: FlowContext): Promise<1 | 3 | 5 | null> {
  const src = (await ctx.page.getByTestId('fp-btn-speed-change-2').first().locator('img').first().getAttribute('src').catch(() => null)) ?? ''
  if (src.includes('Speed-1')) return 1
  if (src.includes('Speed-2')) return 3
  if (src.includes('Speed-3')) return 5
  return null
}

async function currentRoiLength(ctx: FlowContext): Promise<100 | 300 | 500 | null> {
  const src = (await ctx.page.getByTestId('fp-btn-roichange').first().locator('img').first().getAttribute('src').catch(() => null)) ?? ''
  if (src.includes('ROI-100')) return 100
  if (src.includes('ROI-300')) return 300
  if (src.includes('ROI-500')) return 500
  return null
}

async function setSpeed(ctx: FlowContext, target: 1 | 3 | 5) {
  for (let i = 0; i < 4; i += 1) {
    if ((await currentSpeed(ctx)) === target) return
    await clickByTestId(ctx.page, 'fp-btn-speed-change-2', ctx.stepTimeoutMs)
    await sleep(250)
  }
  throw createStepError('focuser.setSpeed', 'postcondition', '未能切换到目标速度', { target })
}

async function setRoiLength(ctx: FlowContext, target: 100 | 300 | 500) {
  for (let i = 0; i < 4; i += 1) {
    if ((await currentRoiLength(ctx)) === target) return
    await clickByTestId(ctx.page, 'fp-btn-roichange', ctx.stepTimeoutMs)
    await sleep(250)
  }
  throw createStepError('focuser.setRoiLength', 'postcondition', '未能切换到目标 ROI', { target })
}

async function currentPosition(ctx: FlowContext) {
  const text = (await ctx.page.getByTestId('fp-state-current').first().textContent().catch(() => '')) ?? ''
  const match = text.replace(/\s+/g, '').match(/Current:([-+]?\d+)/i)
  return match ? Number(match[1]) : null
}

async function moveFocuser(ctx: FlowContext, params: FocuserMoveParams) {
  const testId = params.direction === 'left' ? 'fp-btn-focus-move' : 'fp-btn-focus-move-2'
  const btn = ctx.page.getByTestId(testId).first()
  const before = await currentPosition(ctx)
  const durationMs = Math.max(100, Math.min(10_000, Math.floor(Number(params.durationMs) || 100)))
  const box = await btn.boundingBox().catch(() => null)
  if (!box) throw createStepError('focuser.move', 'precondition', '按钮无可点击区域', params)
  await btn.scrollIntoViewIfNeeded().catch(() => {})
  await ctx.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await ctx.page.mouse.down()
  await sleep(durationMs)
  await ctx.page.mouse.up()
  await sleep(400)

  if (before != null) {
    await expect
      .poll(() => currentPosition(ctx), { timeout: Math.max(ctx.stepTimeoutMs, 12_000) })
      .not.toBe(before)
  }
}

async function setLoopShooting(ctx: FlowContext, wanted: boolean) {
  const btn = ctx.page.getByTestId('fp-btn-toggle-loop-shooting').first()
  const isActive = (((await btn.getAttribute('class').catch(() => '')) ?? '').includes('active-loop'))
  if (isActive === wanted) return
  await clickByTestId(ctx.page, 'fp-btn-toggle-loop-shooting', ctx.stepTimeoutMs)
  await sleep(300)
  await expect
    .poll(async () => (((await btn.getAttribute('class').catch(() => '')) ?? '').includes('active-loop')))
    .toBe(wanted)
}

async function startCalibration(ctx: FlowContext, mode: boolean | 'cancel') {
  await clickByTestId(ctx.page, 'fp-btn-start-calibration', ctx.stepTimeoutMs)
  await sleep(250)
  if (mode === 'cancel') {
    await confirmDialogIfOpen(ctx.page, 'cancel', ctx.stepTimeoutMs, {
      expectedAction: CONFIRM_ACTION.START_CALIBRATION,
    })
    return
  }
  await confirmDialogIfOpen(ctx.page, 'confirm', ctx.stepTimeoutMs, {
    expectedAction: CONFIRM_ACTION.START_CALIBRATION,
  })
}

async function startAutoFocus(ctx: FlowContext, mode: 'coarse' | 'fine' | 'cancel') {
  await clickByTestId(ctx.page, 'fp-btn-auto-focus-2', ctx.stepTimeoutMs)
  await sleep(250)
  if (mode === 'cancel') {
    await clickByTestId(ctx.page, CONFIRM_DIALOG_BTN_CANCEL, ctx.stepTimeoutMs)
    return
  }
  const buttonTestId = mode === 'coarse' ? CONFIRM_DIALOG_BTN_AUTOFOCUS_COARSE : CONFIRM_DIALOG_BTN_AUTOFOCUS_FINE
  await clickByTestId(ctx.page, buttonTestId, ctx.stepTimeoutMs)
  await sleep(250)
}

async function stopAutoFocus(ctx: FlowContext) {
  await clickByTestId(ctx.page, 'fp-btn-auto-focus-2', ctx.stepTimeoutMs)
  await sleep(250)
}

function hasAnyInteract(params: FocuserInteractParams | undefined) {
  if (!params || typeof params !== 'object') return false
  return (
    params.speed != null ||
    params.roiLength != null ||
    params.move != null ||
    typeof params.loopShooting === 'boolean' ||
    params.startCalibration != null ||
    params.autoFocusMode != null ||
    params.stopAutoFocus === true
  )
}

export function makeFocuserControlStepRegistry(): StepRegistry {
  const registry: StepRegistry = new Map()

  registry.set('focuser.panel.ensureOpen', {
    async run(ctx) {
      await ensureFocuserPanelOpen(ctx)
    },
  })

  registry.set('focuser.applyInteract', {
    async run(ctx, params: FocuserInteractParams) {
      if (!hasAnyInteract(params)) return
      await ensureFocuserPanelOpen(ctx)

      if (params.speed != null) await setSpeed(ctx, params.speed)
      if (params.roiLength != null) await setRoiLength(ctx, params.roiLength)
      if (params.move != null) await moveFocuser(ctx, params.move)
      if (typeof params.loopShooting === 'boolean') await setLoopShooting(ctx, params.loopShooting)
      if (params.startCalibration != null) await startCalibration(ctx, params.startCalibration)
      if (params.autoFocusMode != null) await startAutoFocus(ctx, params.autoFocusMode)
      if (params.stopAutoFocus === true) await stopAutoFocus(ctx)
    },
  })

  return registry
}
