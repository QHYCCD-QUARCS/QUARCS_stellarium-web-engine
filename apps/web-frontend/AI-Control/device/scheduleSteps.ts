/**
 * 任务计划表（SchedulePanel）步骤：工具栏打开面板、表格与预设对话框内交互。
 * testid 与 `components/SchedulePanel.vue` 一致。
 */
import { expect } from '@playwright/test'
import type { FlowContext, StepRegistry } from '../core/flowTypes'
import { CONFIRM_ACTION } from '../shared/dialogConstants'
import {
  clearActiveOverlay,
  clickByTestId,
  clickLocator,
  fillByTestId,
  setCheckboxChecked,
  sleep,
} from '../shared/interaction'
import {
  closeStatefulDialogByButtonIfOpen,
  confirmDialogIfOpen,
  waitForConfirmDialogClosed,
  waitForConfirmDialogOpen,
  waitForStatefulDialogOpen,
} from '../menu/dialogSteps'

export type SchedulePresetDeleteMode = boolean | 'confirm' | 'cancel'

/** 与 SchedulePanel 侧栏一致：逐行写入 9 个数据列（不含状态列） */
export type ScheduleFillRow = {
  target: string,
  ra: string,
  dec: string,
  /** 默认 true：Shoot Time 为 Now */
  shootTimeNow?: boolean,
  /** 须与曝光下拉选项一致，如 "10 s" */
  expTime: string,
  /** 滤镜 pill 的 data-value，如 L */
  filter?: string,
  reps: number,
  frameType?: string,
  refocus: 'ON' | 'OFF',
  /** Exp Delay 秒数，默认 0 */
  expDelaySeconds?: number,
}

export type ScheduleInteractParams = {
  /** 选中表格行号（1-based），点击 Target 列 */
  selectRow?: number,
  /** 折叠/展开左侧竖条工具栏 */
  toggleLeftToolbar?: boolean,
  /** 新增一行 */
  addRow?: boolean,
  /** 删除当前选中行（需已选中行） */
  deleteSelectedRow?: boolean,
  /** 开始 / 暂停（与界面主按钮一致，运行中点为暂停） */
  toggleStartPause?: boolean,
  /** 打开「保存预设」内嵌对话框 */
  openSavePresetDialog?: boolean,
  /** 打开「加载预设」内嵌对话框 */
  openLoadPresetDialog?: boolean,
  /** 预设名称：保存时填入输入框；加载时在列表中选中 `data-name` 匹配的项 */
  presetName?: string,
  /** 在保存对话框点击「保存」 */
  presetSave?: boolean,
  /** 在加载对话框点击「OK」应用选中预设 */
  presetLoadOk?: boolean,
  /** 在加载对话框删除当前选中预设；`true` 等同 confirm；`cancel` 表示弹出确认后取消 */
  presetDelete?: SchedulePresetDeleteMode,
  /** 关闭预设内嵌对话框（右上角关闭） */
  closePresetDialog?: boolean,
  /** 关闭任务计划表面板 */
  closePanel?: boolean,
  /** 依次填充第 1…N 行（计划未运行时） */
  fillRows?: ScheduleFillRow[],
  /** 打开「加载预设」对话框并删除列表中全部预设（每项需确认）；完成后关闭该对话框 */
  clearAllSchedulePresets?: boolean,
}

export function hasAnyScheduleInteraction(params: ScheduleInteractParams | undefined) {
  if (!params || typeof params !== 'object') return false
  if (Array.isArray(params.fillRows) && params.fillRows.length > 0) return true
  return Object.values(params).some((v) => v !== undefined)
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

/** 在「加载预设」对话框内删除全部预设项（需已处于 load 模式） */
async function deleteAllPresetsInLoadDialog(ctx: FlowContext, t: number) {
  const page = ctx.page
  for (let round = 0; round < 64; round += 1) {
    const items = page.getByTestId('scp-preset-item')
    const n = await items.count()
    if (n === 0) return
    await clickLocator(items.nth(0), t)
    await sleep(200)
    await clickByTestId(page, 'scp-preset-btn-delete', t)
    await sleep(200)
    await waitForConfirmDialogOpen(ctx.page, Math.min(8000, t), {
      expectedAction: CONFIRM_ACTION.DELETE_SCHEDULE_PRESET,
    }).catch(() => null)
    await confirmDialogIfOpen(ctx.page, 'confirm', t, {
      expectedAction: CONFIRM_ACTION.DELETE_SCHEDULE_PRESET,
    })
    await sleep(300)
    await waitForConfirmDialogClosed(ctx.page, Math.min(8000, t)).catch(() => {})
  }
  throw new Error('删除全部任务计划预设：超过最大循环次数')
}

/** 当前表格数据行数（与 SchedulePanel `numberOfRows` 一致，不含表头） */
async function countScheduleTableDataRows(panel: ReturnType<typeof schedulePanelOpenRoot>): Promise<number> {
  const n = await panel.locator('.schedule-table tbody tr').count()
  return n
}

/** 若现有行数不足 `requiredRows`，则点击「新增行」直至满足（计划运行中无法添加，与界面一致） */
async function ensureScheduleDataRowCount(
  ctx: FlowContext,
  requiredRows: number,
  t: number,
): Promise<void> {
  if (requiredRows < 1) return
  const panel = schedulePanelOpenRoot(ctx)
  let current = await countScheduleTableDataRows(panel)
  let guard = 0
  while (current < requiredRows && guard < 64) {
    guard += 1
    await ensureScheduleLeftToolbarExpanded(ctx, t)
    const addBtn = schedulePanelOpenRoot(ctx).getByTestId('scp-btn-add-row')
    const disabled = await addBtn.isDisabled().catch(() => true)
    if (disabled) {
      throw new Error(
        `任务计划表行数不足（当前 ${current}，需要 ${requiredRows}），且「新增行」不可用（可能计划正在运行）`,
      )
    }
    await clickLocator(addBtn, t)
    await sleep(280)
    current = await countScheduleTableDataRows(schedulePanelOpenRoot(ctx))
  }
  if (current < requiredRows) {
    throw new Error(`任务计划表行数仍不足：当前 ${current}，需要 ${requiredRows}`)
  }
}

async function clickScheduleCell(
  ctx: FlowContext,
  panel: ReturnType<typeof schedulePanelOpenRoot>,
  row: number,
  col: number,
  t: number,
) {
  const page = ctx.page
  const cell = panel.locator(`[data-testid="scp-act-select-cell"][data-row="${row}"][data-col="${col}"]`).first()
  await cell.scrollIntoViewIfNeeded({ timeout: t }).catch(() => {})
  await sleep(300)
  await clearActiveOverlay(page, t)
  await clickLocator(cell, t)
  await sleep(220)
}

async function applyScheduleFillRows(
  ctx: FlowContext,
  panel: ReturnType<typeof schedulePanelOpenRoot>,
  rows: ScheduleFillRow[],
  t: number,
) {
  const page = ctx.page
  await ensureScheduleDataRowCount(ctx, rows.length, t)
  for (let i = 0; i < rows.length; i += 1) {
    if (i > 0) {
      await page.keyboard.press('Escape').catch(() => {})
      await sleep(250)
      await clearActiveOverlay(page, t)
      await sleep(200)
    }
    const row = rows[i]
    const rowNum = i + 1
    const filter = row.filter != null && String(row.filter).trim() !== '' ? String(row.filter).trim() : 'L'
    const frameType = row.frameType != null && String(row.frameType).trim() !== '' ? String(row.frameType).trim() : 'Light'
    const expDelay = row.expDelaySeconds != null && Number.isFinite(Number(row.expDelaySeconds))
      ? Math.max(0, Math.floor(Number(row.expDelaySeconds)))
      : 0
    const wantNow = row.shootTimeNow !== false

    await clickScheduleCell(ctx, panel, rowNum, 1, t)
    await fillByTestId(page, 'scp-editor-target-input', row.target, true, t)
    await page.getByTestId('scp-editor-target-input').first().blur().catch(() => {})
    await sleep(200)

    await clickScheduleCell(ctx, panel, rowNum, 2, t)
    await fillByTestId(page, 'scp-editor-coordinate-ra', row.ra, true, t)
    await fillByTestId(page, 'scp-editor-coordinate-dec', row.dec, true, t)
    await page.getByTestId('scp-editor-coordinate-dec').first().blur().catch(() => {})
    await sleep(200)

    await clickScheduleCell(ctx, panel, rowNum, 3, t)
    await setCheckboxChecked(page, 'scp-editor-clock-now', wantNow, t)
    await sleep(150)

    await clickScheduleCell(ctx, panel, rowNum, 4, t)
    const expSel = panel.locator('select[data-testid="scp-editor-exposure-preset"]').first()
    await expSel.selectOption({ label: row.expTime })
    await sleep(200)

    await clickScheduleCell(ctx, panel, rowNum, 5, t)
    const filterPill = panel.locator(`[data-testid^="scp-editor-filter-pill-"][data-value="${filter}"]`).first()
    if ((await filterPill.count().catch(() => 0)) > 0) {
      await clickLocator(filterPill, t)
    } else {
      console.log(
        `[ai-control] 任务计划第 ${rowNum} 行：无滤镜 pill data-value="${filter}"（设备未回传滤镜列表时跳过，保留单元格默认）`,
      )
    }
    await sleep(150)

    await clickScheduleCell(ctx, panel, rowNum, 6, t)
    const repsStr = String(Math.max(0, Math.floor(Number(row.reps))))
    for (let j = 0; j < repsStr.length; j += 1) {
      await clickByTestId(page, `scp-keypad-key-${repsStr.charAt(j)}`, t)
      await sleep(80)
    }
    await sleep(150)

    await clickScheduleCell(ctx, panel, rowNum, 7, t)
    const typePill = panel.locator(`[data-testid^="scp-editor-type-pill-"][data-value="${frameType}"]`).first()
    await clickLocator(typePill, t)
    await sleep(150)

    await clickScheduleCell(ctx, panel, rowNum, 8, t)
    const refPill = panel.locator(`[data-testid^="scp-editor-refocus-pill-"][data-value="${row.refocus}"]`).first()
    await clickLocator(refPill, t)
    await sleep(150)

    await clickScheduleCell(ctx, panel, rowNum, 9, t)
    for (let k = 0; k < 12; k += 1) {
      await clickByTestId(page, 'scp-keypad-key-Del', t).catch(() => {})
      await sleep(40)
    }
    const delayStr = String(expDelay)
    for (let j = 0; j < delayStr.length; j += 1) {
      await clickByTestId(page, `scp-keypad-key-${delayStr.charAt(j)}`, t)
      await sleep(80)
    }
    await sleep(150)
    await page.keyboard.press('Escape').catch(() => {})
    await sleep(200)
  }
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

      if (Array.isArray(params.fillRows) && params.fillRows.length > 0) {
        await ensureScheduleLeftToolbarExpanded(ctx, t)
        await applyScheduleFillRows(ctx, panel, params.fillRows, t)
      }

      if (params.selectRow != null && Number.isFinite(params.selectRow)) {
        const row = Math.floor(Number(params.selectRow))
        const cell = panel.locator(`[data-testid="scp-act-select-cell"][data-row="${row}"][data-col="1"]`).first()
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

      if (params.clearAllSchedulePresets) {
        await ensureScheduleLeftToolbarExpanded(ctx, t)
        await clickLocator(schedulePanelOpenRoot(ctx).getByTestId('scp-btn-open-load-preset-dialog'), t)
        await sleep(400)
        const presetRootClear = await waitForStatefulDialogOpen(ctx.page, t, {
          rootTestId: 'scp-preset-dialog-root',
        })
        await expect(presetRootClear).toHaveAttribute('data-mode', 'load', {
          timeout: t,
        })
        await deleteAllPresetsInLoadDialog(ctx, t)
        await waitForConfirmDialogClosed(ctx.page, Math.min(8000, t)).catch(() => {})
        await sleep(200)
        await clearActiveOverlay(ctx.page, t)
        await closeStatefulDialogByButtonIfOpen(ctx.page, t, {
          rootTestId: 'scp-preset-dialog-root',
          closeButtonTestId: 'scp-preset-btn-close',
        }).catch(() => null)
        await sleep(300)
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
