/**
 * 任务计划表（SchedulePanel）步骤：工具栏打开面板、表格与预设对话框内交互。
 * testid 与 `components/SchedulePanel.vue` 一致。
 */
import { expect } from '@playwright/test'
import type { FlowContext, StepRegistry } from '../core/flowTypes'
import { CONFIRM_ACTION } from '../shared/dialogConstants'
import { clearActiveOverlay, clickByTestId, clickLocator, fillByTestId, sleep } from '../shared/interaction'
import {
  closeStatefulDialogByButtonIfOpen,
  confirmDialogIfOpen,
  waitForConfirmDialogClosed,
  waitForConfirmDialogOpen,
  waitForStatefulDialogOpen,
} from '../menu/dialogSteps'

export type SchedulePresetDeleteMode = boolean | 'confirm' | 'cancel'

export type ScheduleInteractParams = {
  /** 选中表格行号（1-based），便于后续 deleteSelectedRow */
  selectRow?: number
  /** 折叠/展开左侧竖条工具栏 */
  toggleLeftToolbar?: boolean
  /** 新增一行 */
  addRow?: boolean
  /** 删除当前选中行（需已选中行） */
  deleteSelectedRow?: boolean
  /** 开始 / 暂停（与界面主按钮一致，运行中点为暂停） */
  toggleStartPause?: boolean
  /** 打开「保存预设」内嵌对话框 */
  openSavePresetDialog?: boolean
  /** 打开「加载预设」内嵌对话框 */
  openLoadPresetDialog?: boolean
  /** 预设名称：保存时填入输入框；加载时在列表中选中 `data-name` 匹配的项 */
  presetName?: string
  /** 在保存对话框点击「保存」 */
  presetSave?: boolean
  /** 在加载对话框点击「OK」应用选中预设 */
  presetLoadOk?: boolean
  /** 在加载对话框删除当前选中预设；`true` 等同 confirm；`cancel` 表示弹出确认后取消 */
  presetDelete?: SchedulePresetDeleteMode
  /** 关闭预设内嵌对话框（右上角关闭） */
  closePresetDialog?: boolean
  /** 关闭任务计划表面板 */
  closePanel?: boolean
}

export function hasAnyScheduleInteraction(params: ScheduleInteractParams | undefined) {
  if (!params || typeof params !== 'object') return false
  return Object.keys(params).some((k) => params[k as keyof ScheduleInteractParams] !== undefined)
}

/** 扫描结果中可能存在多个 scp-root 节点；仅操作当前打开的面板。 */
function schedulePanelOpenRoot(ctx: FlowContext) {
  return ctx.page.locator('[data-testid="scp-root"][data-state="open"]').first()
}

async function ensureSchedulePanelOpen(ctx: FlowContext) {
  const openRoot = schedulePanelOpenRoot(ctx)
  if (await openRoot.isVisible().catch(() => false)) return

  await clickByTestId(ctx.page, 'tb-btn-toggle-schedule-panel', ctx.stepTimeoutMs)
  await sleep(500)
  await expect(openRoot).toBeVisible({ timeout: ctx.stepTimeoutMs })
  await expect(openRoot).toHaveAttribute('data-state', 'open', { timeout: ctx.stepTimeoutMs })
}

/** 左侧竖条折叠时 Add/Delete/Start 等按钮在 v-show 内不可见，点击前先展开。 */
async function ensureScheduleLeftToolbarExpanded(ctx: FlowContext, timeout: number) {
  const root = schedulePanelOpenRoot(ctx)
  const addBtn = root.getByTestId('scp-btn-add-row')
  const toggle = root.getByTestId('scp-btn-toggle-left-toolbar')
  for (let i = 0; i < 4; i += 1) {
    if (await addBtn.isVisible().catch(() => false)) return
    await clickLocator(toggle, timeout)
    await sleep(400)
  }
  await expect(addBtn).toBeVisible({ timeout })
}

async function clickPresetItemByName(ctx: FlowContext, name: string, timeout: number) {
  const items = ctx.page.getByTestId('scp-preset-item')
  const count = await items.count()
  for (let i = 0; i < count; i += 1) {
    const el = items.nth(i)
    const n = await el.getAttribute('data-name')
    if (n === name) {
      await clickLocator(el, timeout)
      return
    }
  }
  throw new Error(`未找到预设项 data-name="${name}"`)
}

function resolveDeleteMode(mode: SchedulePresetDeleteMode | undefined): 'confirm' | 'cancel' | null {
  if (mode == null || mode === false) return null
  if (mode === 'cancel') return 'cancel'
  return 'confirm'
}

export function makeScheduleStepRegistry(): StepRegistry {
  const registry: StepRegistry = new Map()

  registry.set('schedule.panel.ensureOpen', {
    description: '通过工具栏打开任务计划表面板',
    async run(ctx) {
      await ensureSchedulePanelOpen(ctx)
    },
  })

  registry.set('schedule.applyInteract', {
    async run(ctx, params: ScheduleInteractParams) {
      if (!hasAnyScheduleInteraction(params)) return
      await ensureSchedulePanelOpen(ctx)
      const t = ctx.stepTimeoutMs
      const panel = schedulePanelOpenRoot(ctx)

      if (params.selectRow != null && Number.isFinite(params.selectRow)) {
        const row = Math.floor(Number(params.selectRow))
        const cell = panel.locator(`[data-testid="scp-act-select-cell"][data-row="${row}"]`).first()
        await clickLocator(cell, t)
        await sleep(200)
      }

      if (params.toggleLeftToolbar) {
        await clickLocator(panel.getByTestId('scp-btn-toggle-left-toolbar'), t)
        await sleep(250)
      }

      if (params.addRow) {
        await ensureScheduleLeftToolbarExpanded(ctx, t)
        await clickLocator(schedulePanelOpenRoot(ctx).getByTestId('scp-btn-add-row'), t)
        await sleep(250)
      }

      if (params.deleteSelectedRow) {
        await ensureScheduleLeftToolbarExpanded(ctx, t)
        await clickLocator(schedulePanelOpenRoot(ctx).getByTestId('scp-btn-delete-selected-row'), t)
        await sleep(300)
      }

      if (params.toggleStartPause) {
        await ensureScheduleLeftToolbarExpanded(ctx, t)
        await clickLocator(schedulePanelOpenRoot(ctx).getByTestId('scp-btn-toggle-schedule'), t)
        await sleep(400)
      }

      if (params.openSavePresetDialog) {
        await ensureScheduleLeftToolbarExpanded(ctx, t)
        await clickLocator(schedulePanelOpenRoot(ctx).getByTestId('scp-btn-open-save-preset-dialog'), t)
        await sleep(400)
        const presetRoot = await waitForStatefulDialogOpen(ctx.page, t, {
          rootTestId: 'scp-preset-dialog-root',
        })
        await expect(presetRoot).toHaveAttribute('data-mode', 'save', {
          timeout: t,
        })
        const name = params.presetName != null ? String(params.presetName).trim() : ''
        if (name !== '') {
          await fillByTestId(ctx.page, 'scp-preset-input-name', name, true, t)
        }
        if (params.presetSave) {
          await clickByTestId(ctx.page, 'scp-preset-btn-save', t)
          await sleep(400)
        }
      }

      if (params.openLoadPresetDialog) {
        await ensureScheduleLeftToolbarExpanded(ctx, t)
        await clickLocator(schedulePanelOpenRoot(ctx).getByTestId('scp-btn-open-load-preset-dialog'), t)
        await sleep(400)
        const presetRoot = await waitForStatefulDialogOpen(ctx.page, t, {
          rootTestId: 'scp-preset-dialog-root',
        })
        await expect(presetRoot).toHaveAttribute('data-mode', 'load', {
          timeout: t,
        })
        const loadName = params.presetName != null ? String(params.presetName).trim() : ''
        if (loadName !== '') {
          await clickPresetItemByName(ctx, loadName, t)
          await sleep(250)
        }
        const delMode = resolveDeleteMode(params.presetDelete)
        if (delMode) {
          await clickByTestId(ctx.page, 'scp-preset-btn-delete', t)
          await sleep(250)
          await waitForConfirmDialogOpen(ctx.page, Math.min(8000, t), {
            expectedAction: CONFIRM_ACTION.DELETE_SCHEDULE_PRESET,
          }).catch(() => null)
          if (delMode === 'cancel') {
            await confirmDialogIfOpen(ctx.page, 'cancel', t, {
              expectedAction: CONFIRM_ACTION.DELETE_SCHEDULE_PRESET,
            }).catch(() => null)
            await sleep(300)
          } else {
            await confirmDialogIfOpen(ctx.page, 'confirm', t, {
              expectedAction: CONFIRM_ACTION.DELETE_SCHEDULE_PRESET,
            })
          }
          await sleep(300)
          await waitForConfirmDialogClosed(ctx.page, Math.min(8000, t)).catch(() => {})
        }
        if (params.presetLoadOk) {
          await clickByTestId(ctx.page, 'scp-preset-btn-ok', t)
          await sleep(400)
        }
      }

      if (params.closePresetDialog) {
        await waitForConfirmDialogClosed(ctx.page, Math.min(8000, t)).catch(() => {})
        await sleep(300)
        await clearActiveOverlay(ctx.page, t)
        await closeStatefulDialogByButtonIfOpen(ctx.page, t, {
          rootTestId: 'scp-preset-dialog-root',
          closeButtonTestId: 'scp-preset-btn-close',
        }).catch(() => null)
      }

      if (params.closePanel) {
        await closeStatefulDialogByButtonIfOpen(ctx.page, t, {
          rootTestId: 'scp-root',
          closeButtonTestId: 'scp-btn-close-panel',
        }).catch(() => null)
      }
    },
  })

  return registry
}
