/**
 * AI-Control 主相机拍摄相关配置步骤。
 *
 * 在设备侧栏中设置主相机菜单项：增益(Gain)、偏置(Offset)、CFA 模式(ImageCFA)、
 * 温度(Temperature)、自动保存(Auto Save)、保存解析失败图片(Save Failed Parse)、保存文件夹(Save Folder)。
 * 控件 testid 规则：ui-config-MainCamera-{Label}-slider|select|switch-{index}，Label 为 App.vue 中 label 去掉非字母数字后的形式。
 */
import type { FlowContext, StepRegistry } from '../core/flowTypes'
import {
  clickLocator,
  sanitizeTestIdPart,
  selectVSelectItemText,
  sleep,
} from '../shared/interaction'
import { openDeviceSubmenu } from '../menu/drawerSteps'

const DEVICE_TYPE = 'MainCamera'

/** 从 testid 中解析出 index 后缀，如 "ui-config-MainCamera-Gain-slider-3" -> "3" */
function parseIndexFromTestId(testId: string): string {
  const match = testId.match(/-(\d+)$/)
  return match ? match[1] : '0'
}

/** 获取滑块当前值（从 label 文案 "Gain: 123" 解析） */
async function getSliderLabelValue(page: import('@playwright/test').Page, label: string, timeout: number): Promise<number | null> {
  const prefix = `ui-config-${DEVICE_TYPE}-${sanitizeTestIdPart(label)}-slider-label-`
  const loc = page.locator(`[data-testid^="${prefix}"]`).first()
  if ((await loc.count()) === 0) return null
  await loc.scrollIntoViewIfNeeded().catch(() => {})
  const text = await loc.textContent().catch(() => null)
  if (!text) return null
  const m = text.match(/:?\s*(\d+)\s*$/)
  return m ? parseInt(m[1], 10) : null
}

/** 设置滑块到目标值：通过 inc/dec 按钮调整，最多步数限制防止死循环 */
async function setSliderToValue(
  ctx: FlowContext,
  label: string,
  targetValue: number,
  maxSteps = 500,
) {
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
    console.log(`[ai-control] 未找到主相机 ${label} 滑块，跳过`)
    return
  }
  const index = parseIndexFromTestId(sliderTestId)
  const decBtn = page.getByTestId(`ui-config-${DEVICE_TYPE}-${safeLabel}-slider-dec-${index}`).first()
  const incBtn = page.getByTestId(`ui-config-${DEVICE_TYPE}-${safeLabel}-slider-inc-${index}`).first()

  for (let step = 0; step < maxSteps; step++) {
    const current = await getSliderLabelValue(page, label, timeout)
    if (current === null) break
    if (current === targetValue) {
      console.log(`[ai-control] 主相机 ${label} 已为 ${targetValue}`)
      return
    }
    if (current < targetValue) {
      await clickLocator(incBtn, timeout)
    } else {
      await clickLocator(decBtn, timeout)
    }
    await sleep(150)
  }
  console.log(`[ai-control] 主相机 ${label} 调整至 ${targetValue} 完成或已达最大步数`)
}

/** 设置 select 类配置（ImageCFA、Temperature、Save Folder） */
async function setSelectConfig(ctx: FlowContext, label: string, itemText: string) {
  const page = ctx.page
  const timeout = ctx.stepTimeoutMs
  const safeLabel = sanitizeTestIdPart(label)
  const configItemTestId = `ui-app-config-item-${DEVICE_TYPE}-${safeLabel}-`
  const configItem = page.locator(`[data-testid^="${configItemTestId}"]`).first()
  if ((await configItem.count()) > 0) {
    await configItem.scrollIntoViewIfNeeded().catch(() => {})
    await sleep(400)
  }
  const selectLoc = page.locator(`[data-testid^="ui-config-${DEVICE_TYPE}-${safeLabel}-select-"]`).first()
  if ((await selectLoc.count()) === 0) {
    console.log(`[ai-control] 未找到主相机 ${label} 下拉，跳过`)
    return
  }
  const testId = await selectLoc.getAttribute('data-testid')
  if (!testId) return
  await selectLoc.scrollIntoViewIfNeeded().catch(() => {})
  await sleep(300)
  const vInputWrapper = page.locator('.v-input').filter({ has: page.getByTestId(testId).first() }).first()
  const wrapperVisible = (await vInputWrapper.count()) > 0 && (await vInputWrapper.isVisible().catch(() => false))
  const inputVisible = await selectLoc.isVisible().catch(() => false)
  if (!wrapperVisible && !inputVisible) {
    console.log(`[ai-control] 主相机 ${label} 下拉不可见，跳过（可能需在界面中手动设置）`)
    return
  }
  await selectVSelectItemText(page, testId, String(itemText), timeout)
  console.log(`[ai-control] 主相机 ${label} 已选 ${itemText}`)
}

/** 设置 switch 类配置（Auto Save、Save Failed Parse） */
async function setSwitchConfig(ctx: FlowContext, label: string, wanted: boolean) {
  const page = ctx.page
  const timeout = ctx.stepTimeoutMs
  const safeLabel = sanitizeTestIdPart(label)
  const switchLoc = page.locator(`[data-testid^="ui-config-${DEVICE_TYPE}-${safeLabel}-switch-"]`).first()
  if ((await switchLoc.count()) === 0) {
    console.log(`[ai-control] 未找到主相机 ${label} 开关，跳过`)
    return
  }
  // testid 可能在 wrapper 或 input 上：有子 input 则用子 input，否则用 switchLoc（即 input 自身）
  const innerInput = switchLoc.locator('input[type="checkbox"]').first()
  const hasInner = (await innerInput.count()) > 0
  const target = hasInner ? innerInput : switchLoc
  const current = await target.evaluate((el: HTMLInputElement) => el.checked).catch(() => false)
  if (current === wanted) {
    console.log(`[ai-control] 主相机 ${label} 已为 ${wanted}，跳过`)
    return
  }
  // 用 JS 在元素上触发 click，绕过 Vuetify ripple 层遮挡
  await target.evaluate((el: HTMLInputElement) => el.click())
  await sleep(200)
  console.log(`[ai-control] 主相机 ${label} 已设为 ${wanted}`)
}

export function makeMainCameraConfigStepRegistry(): StepRegistry {
  const registry: StepRegistry = new Map()

  /**
   * 应用主相机拍摄相关配置。
   * 前置：设备侧栏可打开（不要求已连接）。
   * 参数：gain?, offset?, cfaMode?, temperature?, autoSave?, saveFailedParse?, saveFolder?
   * - gain/offset: 数字，滑块目标值
   * - cfaMode: 可选 'GR'|'GB'|'BG'|'RGGB'|'null'，与 App.vue ImageCFA selectValue 一致
   * - temperature: 可选 5|0|-5|-10|-15|-20|-25 或对应字符串
   * - autoSave: 是否开启自动保存
   * - saveFailedParse: 是否保存解析失败图片
   * - saveFolder: 保存文件夹选项文案（如 'local'），与后端下发的选项一致
   */
  registry.set('device.mainCamera.applyCaptureConfig', {
    async run(ctx, params) {
      if (params.skipOpen !== true) {
        await openDeviceSubmenu(ctx, DEVICE_TYPE)
        await sleep(500)
      }

      if (params.gain !== undefined && params.gain !== null && Number.isFinite(Number(params.gain))) {
        await setSliderToValue(ctx, 'Gain', Number(params.gain))
      }
      if (params.offset !== undefined && params.offset !== null && Number.isFinite(Number(params.offset))) {
        await setSliderToValue(ctx, 'Offset', Number(params.offset))
      }
      if (params.cfaMode != null && String(params.cfaMode).trim() !== '') {
        await setSelectConfig(ctx, 'ImageCFA', String(params.cfaMode))
      }
      if (params.temperature !== undefined && params.temperature !== null) {
        await setSelectConfig(ctx, 'Temperature', String(params.temperature))
      }
      if (typeof params.autoSave === 'boolean') {
        await setSwitchConfig(ctx, 'Auto Save', params.autoSave)
      }
      if (typeof params.saveFailedParse === 'boolean') {
        await setSwitchConfig(ctx, 'Save Failed Parse', params.saveFailedParse)
      }
      if (params.saveFolder != null && String(params.saveFolder).trim() !== '') {
        await setSelectConfig(ctx, 'Save Folder', String(params.saveFolder))
      }
    },
  })

  return registry
}
