/**
 * AI-Control 导星镜配置与导星面板交互步骤。
 *
 * 覆盖两类能力：
 * 1) 设备侧栏中的 Guider 配置项（焦距、多星导星、RA/DEC 方向、Gain/Offset）
 * 2) 导星页图表面板（循环曝光、导星开关、曝光档位、清图、量程切换、重新校准）
 */
import { expect, type Locator, type Page } from '@playwright/test'
import type { FlowContext, StepRegistry } from '../core/flowTypes'
import {
  CONFIRM_ACTION,
  CONFIRM_DIALOG_BTN_CONFIRM,
  CONFIRM_DIALOG_ROOT_TESTID,
} from '../shared/dialogConstants'
import { createStepError } from '../shared/errors'
import {
  clickByTestId,
  clickLocator,
  fillByTestId,
  sanitizeTestIdPart,
  selectVSelectItemText,
  sleep,
} from '../shared/interaction'
import { openDeviceSubmenu } from '../menu/drawerSteps'
import { ensureGuiderUiVisible } from '../shared/navigation'

const DEVICE_TYPE = 'Guider'
const GUIDER_LOOP_SWITCH_TESTID = 'ui-chart-component-btn-loop-exp-switch'
const GUIDER_SWITCH_TESTID = 'ui-chart-component-btn-start-press'
const GUIDER_EXPTIME_SWITCH_TESTID = 'ui-chart-component-btn-exp-time-switch'
const GUIDER_DATA_CLEAR_TESTID = 'ui-chart-component-btn-data-clear'
const GUIDER_RANGE_SWITCH_TESTID = 'ui-chart-component-btn-range-switch'
const GUIDER_EXPOSURE_SEQUENCE = [1000, 2000, 500] as const

export type GuiderInteractParams = {
  loopExposure?: boolean
  guiding?: boolean
  expTime?: number | string
  dataClear?: boolean
  rangeSwitch?: boolean
  recalibrate?: boolean
}

function normalizeGuiderExposure(value: number | string): number {
  if (typeof value === 'number' && GUIDER_EXPOSURE_SEQUENCE.includes(value as 500 | 1000 | 2000)) {
    return value
  }

  const normalized = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')

  if (normalized === '500' || normalized === '500ms' || normalized === '0.5s') return 500
  if (normalized === '1000' || normalized === '1000ms' || normalized === '1s') return 1000
  if (normalized === '2000' || normalized === '2000ms' || normalized === '2s') return 2000

  throw createStepError('guider.setExposureTime', 'params', '导星曝光仅支持 500ms / 1s / 2s', { value })
}

/** 从 testid 中解析 index 后缀，如 "ui-config-Guider-Gain-slider-4" -> "4" */
function parseIndexFromTestId(testId: string): string {
  const match = testId.match(/-(\d+)$/)
  return match ? match[1] : '0'
}

async function getSliderLabelValue(page: Page, label: string): Promise<number | null> {
  const prefix = `ui-config-${DEVICE_TYPE}-${sanitizeTestIdPart(label)}-slider-label-`
  const loc = page.locator(`[data-testid^="${prefix}"]`).first()
  if ((await loc.count()) === 0) return null
  await loc.scrollIntoViewIfNeeded().catch(() => {})
  const text = await loc.textContent().catch(() => null)
  if (!text) return null
  const m = text.match(/:?\s*(\d+)\s*$/)
  return m ? parseInt(m[1], 10) : null
}

async function setSliderToValue(ctx: FlowContext, label: string, targetValue: number, maxSteps = 500) {
  const page = ctx.page
  const timeout = ctx.stepTimeoutMs
  const safeLabel = sanitizeTestIdPart(label)
  const sliderLoc = page
    .locator(`[data-testid^="ui-config-${DEVICE_TYPE}-${safeLabel}-slider-"]`)
    .filter({ hasNot: page.locator('[data-testid*="-dec-"]') })
    .filter({ hasNot: page.locator('[data-testid*="-inc-"]') })
    .first()
  const sliderTestId = await sliderLoc.getAttribute('data-testid').catch(() => null)
  if (!sliderTestId) {
    console.log(`[ai-control] 未找到导星 ${label} 滑块，跳过`)
    return
  }
  const index = parseIndexFromTestId(sliderTestId)
  const decBtn = page.getByTestId(`ui-config-${DEVICE_TYPE}-${safeLabel}-slider-dec-${index}`).first()
  const incBtn = page.getByTestId(`ui-config-${DEVICE_TYPE}-${safeLabel}-slider-inc-${index}`).first()

  for (let step = 0; step < maxSteps; step += 1) {
    const current = await getSliderLabelValue(page, label)
    if (current === null) break
    if (current === targetValue) return
    if (current < targetValue) {
      await clickLocator(incBtn, timeout)
    } else {
      await clickLocator(decBtn, timeout)
    }
    await sleep(150)
  }
}

async function setSelectConfig(ctx: FlowContext, label: string, itemText: string) {
  const page = ctx.page
  const timeout = ctx.stepTimeoutMs
  const safeLabel = sanitizeTestIdPart(label)
  const selectLoc = page.locator(`[data-testid^="ui-config-${DEVICE_TYPE}-${safeLabel}-select-"]`).first()
  if ((await selectLoc.count()) === 0) {
    console.log(`[ai-control] 未找到导星 ${label} 下拉，跳过`)
    return
  }
  const testId = await selectLoc.getAttribute('data-testid')
  if (!testId) return
  await selectLoc.scrollIntoViewIfNeeded().catch(() => {})
  await sleep(300)
  await selectVSelectItemText(page, testId, String(itemText), timeout)
}

async function setSwitchConfig(ctx: FlowContext, label: string, wanted: boolean) {
  const page = ctx.page
  const safeLabel = sanitizeTestIdPart(label)
  const switchLoc = page.locator(`[data-testid^="ui-config-${DEVICE_TYPE}-${safeLabel}-switch-"]`).first()
  if ((await switchLoc.count()) === 0) {
    console.log(`[ai-control] 未找到导星 ${label} 开关，跳过`)
    return
  }
  const innerInput = switchLoc.locator('input[type="checkbox"]').first()
  const hasInner = (await innerInput.count()) > 0
  const target = hasInner ? innerInput : switchLoc
  const current = await target.evaluate((el: HTMLInputElement) => el.checked).catch(() => false)
  if (current === wanted) return
  await target.evaluate((el: HTMLInputElement) => el.click())
  await sleep(200)
}

async function setTextConfig(ctx: FlowContext, label: string, value: string) {
  const page = ctx.page
  const safeLabel = sanitizeTestIdPart(label)
  const inputLoc = page.locator(`[data-testid^="ui-config-${DEVICE_TYPE}-${safeLabel}-text-"]`).first()
  if ((await inputLoc.count()) === 0) {
    console.log(`[ai-control] 未找到导星 ${label} 输入框，跳过`)
    return
  }
  const testId = await inputLoc.getAttribute('data-testid')
  if (!testId) return
  await fillByTestId(page, testId, value, true, ctx.stepTimeoutMs)
  await sleep(200)
}

async function ensureGuiderPanelOpen(ctx: FlowContext, timeout = ctx.stepTimeoutMs) {
  await ensureGuiderUiVisible(ctx.page, timeout)
  await expect(ctx.page.getByTestId('ui-chart-component-root').first()).toBeVisible({ timeout })
}

async function currentGuiderExposureMs(ctx: FlowContext): Promise<number> {
  const raw = await ctx.page.getByTestId(GUIDER_EXPTIME_SWITCH_TESTID).first().getAttribute('data-exp-time-ms')
  const value = Number(raw)
  if (!Number.isFinite(value)) {
    throw createStepError('guider.setExposureTime', 'postcondition', '无法读取当前导星曝光档位', { raw })
  }
  return value
}

async function setGuiderExposureTime(ctx: FlowContext, exposure: number | string) {
  const target = normalizeGuiderExposure(exposure)
  await ensureGuiderPanelOpen(ctx)
  let current = await currentGuiderExposureMs(ctx)
  if (current === target) return

  for (let i = 0; i < GUIDER_EXPOSURE_SEQUENCE.length; i += 1) {
    await clickByTestId(ctx.page, GUIDER_EXPTIME_SWITCH_TESTID, ctx.stepTimeoutMs)
    await sleep(250)
    current = await currentGuiderExposureMs(ctx)
    if (current === target) return
  }

  throw createStepError('guider.setExposureTime', 'postcondition', '导星曝光档位未切换到目标值', {
    expected: target,
    actual: current,
  })
}

async function setChartButtonState(
  ctx: FlowContext,
  locator: Locator,
  attr: string,
  wanted: string,
  clickStepId: string,
) {
  const current = await locator.getAttribute(attr).catch(() => null)
  if (current === wanted) return
  await clickLocator(locator, ctx.stepTimeoutMs)
  await expect(locator).toHaveAttribute(attr, wanted, { timeout: Math.min(15_000, ctx.stepTimeoutMs) })
  console.log(`[ai-control] ${clickStepId} 已切到 ${wanted}`)
}

async function triggerGuiderRecalibrate(ctx: FlowContext) {
  await ensureGuiderPanelOpen(ctx)
  const button = ctx.page.getByTestId(GUIDER_SWITCH_TESTID).first()
  await button.scrollIntoViewIfNeeded().catch(() => {})
  await button.dispatchEvent('mousedown')
  await sleep(1200)
  await button.dispatchEvent('mouseup')

  const dialog = ctx.page.getByTestId(CONFIRM_DIALOG_ROOT_TESTID).first()
  await expect(dialog).toBeVisible({ timeout: Math.min(10_000, ctx.stepTimeoutMs) })
  await expect(dialog).toHaveAttribute('data-action', CONFIRM_ACTION.RECALIBRATE, {
    timeout: Math.min(10_000, ctx.stepTimeoutMs),
  })
  await clickByTestId(ctx.page, CONFIRM_DIALOG_BTN_CONFIRM, ctx.stepTimeoutMs)
}

export function makeGuiderControlStepRegistry(): StepRegistry {
  const registry: StepRegistry = new Map()

  registry.set('device.guider.applyConfig', {
    async run(ctx, params) {
      if (params.skipOpen !== true) {
        await openDeviceSubmenu(ctx, DEVICE_TYPE)
        await sleep(500)
      }

      if (params.focalLengthMm != null && String(params.focalLengthMm).trim() !== '') {
        await setTextConfig(ctx, 'Guider Focal Length (mm)', String(params.focalLengthMm).trim())
      }
      if (typeof params.multiStar === 'boolean') {
        await setSwitchConfig(ctx, 'Multi Star Guider', params.multiStar)
      }
      if (params.raDirection != null && String(params.raDirection).trim() !== '') {
        await setSelectConfig(ctx, 'RA Single Guide Direction', String(params.raDirection).trim())
      }
      if (params.decDirection != null && String(params.decDirection).trim() !== '') {
        await setSelectConfig(ctx, 'DEC Single Guide Direction', String(params.decDirection).trim())
      }
      if (params.gain !== undefined && params.gain !== null && Number.isFinite(Number(params.gain))) {
        await setSliderToValue(ctx, 'Gain', Number(params.gain))
      }
      if (params.offset !== undefined && params.offset !== null && Number.isFinite(Number(params.offset))) {
        await setSliderToValue(ctx, 'Offset', Number(params.offset))
      }
    },
  })

  registry.set('guider.panel.ensureOpen', {
    async run(ctx, params) {
      await ensureGuiderPanelOpen(ctx, params.timeoutMs ?? ctx.stepTimeoutMs)
    },
  })

  registry.set('guider.setExposureTime', {
    async run(ctx, params) {
      if (params.exposure == null || String(params.exposure).trim() === '') {
        throw createStepError('guider.setExposureTime', 'params', '缺少 exposure')
      }
      await setGuiderExposureTime(ctx, params.exposure)
    },
  })

  registry.set('guider.applyInteract', {
    async run(ctx, params) {
      await ensureGuiderPanelOpen(ctx)

      if (params.expTime != null && String(params.expTime).trim() !== '') {
        await setGuiderExposureTime(ctx, params.expTime)
      }

      if (params.dataClear === true) {
        await clickByTestId(ctx.page, GUIDER_DATA_CLEAR_TESTID, ctx.stepTimeoutMs)
        await sleep(250)
      }

      if (params.rangeSwitch === true) {
        await clickByTestId(ctx.page, GUIDER_RANGE_SWITCH_TESTID, ctx.stepTimeoutMs)
        await sleep(250)
      }

      const loopButton = ctx.page.getByTestId(GUIDER_LOOP_SWITCH_TESTID).first()
      if (typeof params.loopExposure === 'boolean') {
        await setChartButtonState(
          ctx,
          loopButton,
          'data-state',
          params.loopExposure ? 'on' : 'off',
          'guider.loopExposure',
        )
      }

      if (params.recalibrate === true) {
        await triggerGuiderRecalibrate(ctx)
      }

      if (typeof params.guiding === 'boolean') {
        if (params.guiding) {
          const loopState = await loopButton.getAttribute('data-state').catch(() => null)
          if (loopState !== 'on') {
            await setChartButtonState(ctx, loopButton, 'data-state', 'on', 'guider.loopExposure')
          }
        }
        const guiderButton = ctx.page.getByTestId(GUIDER_SWITCH_TESTID).first()
        await setChartButtonState(
          ctx,
          guiderButton,
          'data-guiding',
          params.guiding ? 'true' : 'false',
          'guider.guiding',
        )
      }
    },
  })

  return registry
}
