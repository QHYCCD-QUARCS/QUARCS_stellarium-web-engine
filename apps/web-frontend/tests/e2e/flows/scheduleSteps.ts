/**
 * 计划面板相关步骤注册表 (scheduleSteps)
 *
 * 作用：
 * 封装计划面板的打开/关闭、运行状态等待、开始/暂停、添加/删除行、预设对话框等。
 * 以 data-testid（scp-root、tb-btn-toggle-schedule-panel、scp-btn-* 等）定位，所有点击经可操作性检查，禁止 force。
 *
 * 执行过程概要：
 * - schedule.openIfClosed：前置检查 scp-root 可见且 data-state=open，否则 动作 点击 tb-btn-toggle-schedule-panel → 后置确认 scp-root 可见且 data-state=open。
 * - schedule.closeIfOpen：若 scp-btn-close-panel 可见则通过 clickLocator 点击关闭。
 * - schedule.waitRunState：ensureScheduleOpen 后断言 scp-root 的 data-run 等于给定 state。
 * - schedule.startIfNotRunning / schedule.pauseIfRunning：ensureScheduleOpen 后若 scp-btn-toggle-schedule 的 data-state 与目标不符则 clickLocator 点击。
 * - schedule.assertUiDisabledWhenRunning：断言 scp-btn-add-row 在运行时为 disabled。
 * - schedule.addRow / schedule.deleteSelectedRow：ensureScheduleOpen 后 clickByTestId 点击对应按钮。
 * - schedule.preset.okClose / schedule.presetDialog.closeIfOpen：若对应按钮可见则 clickLocator 点击。
 * 部分步骤（trimRows、setupRowFull 等）为占位未实现。
 *
 * 规范：禁止 force；按钮点击前先确保可见再 clickLocator。参考 testid-validation-report.md、testid-scan-report.md。
 */
import { expect } from '@playwright/test'
import type { FlowContext, StepRegistry } from './flowTypes'
import { clickByTestId, clickLocator } from './helpers'

function notImplemented(stepId: string) {
  return {
    async run() {
      throw new Error(`step ${stepId} 尚未在本次重建中实现`)
    },
  }
}

async function ensureScheduleOpen(ctx: FlowContext, timeout: number) {
  const root = ctx.page.getByTestId('scp-root').first()
  if (await root.isVisible().catch(() => false)) {
    const state = await root.getAttribute('data-state').catch(() => null)
    if (state === 'open') return
    // 面板可见但未打开，点击切换按钮打开
    await clickByTestId(ctx.page, 'tb-btn-toggle-schedule-panel', timeout)
  } else {
    await clickByTestId(ctx.page, 'tb-btn-toggle-schedule-panel', timeout)
  }
  await expect(root).toBeVisible({ timeout })
  await expect(root).toHaveAttribute('data-state', 'open', { timeout })
}

export function makeScheduleStepRegistry(): StepRegistry {
  const registry: StepRegistry = new Map()

  registry.set('schedule.openIfClosed', {
    async run(ctx, params) {
      await ensureScheduleOpen(ctx, params.timeoutMs ?? ctx.stepTimeoutMs)
    },
  })

  registry.set('schedule.closeIfOpen', {
    async run(ctx, params) {
      const close = ctx.page.getByTestId('scp-btn-close-panel').first()
      if (await close.isVisible().catch(() => false)) {
        await clickLocator(close, params.timeoutMs ?? ctx.stepTimeoutMs)
      }
    },
  })

  registry.set('schedule.waitRunState', {
    async run(ctx, params) {
      await ensureScheduleOpen(ctx, params.timeoutMs ?? ctx.stepTimeoutMs)
      await expect(ctx.page.getByTestId('scp-root')).toHaveAttribute('data-run', String(params.state), {
        timeout: params.timeoutMs ?? ctx.stepTimeoutMs,
      })
    },
  })

  registry.set('schedule.startIfNotRunning', {
    async run(ctx, params) {
      await ensureScheduleOpen(ctx, params.timeoutMs ?? ctx.stepTimeoutMs)
      const button = ctx.page.getByTestId('scp-btn-toggle-schedule').first()
      const state = await button.getAttribute('data-state')
      if (state !== 'running') {
        await clickLocator(button, params.timeoutMs ?? ctx.stepTimeoutMs)
      }
    },
  })

  registry.set('schedule.pauseIfRunning', {
    async run(ctx, params) {
      await ensureScheduleOpen(ctx, params.timeoutMs ?? ctx.stepTimeoutMs)
      const button = ctx.page.getByTestId('scp-btn-toggle-schedule').first()
      const state = await button.getAttribute('data-state')
      if (state === 'running') {
        await clickLocator(button, params.timeoutMs ?? ctx.stepTimeoutMs)
      }
    },
  })

  registry.set('schedule.assertUiDisabledWhenRunning', {
    async run(ctx, params) {
      await ensureScheduleOpen(ctx, params.timeoutMs ?? ctx.stepTimeoutMs)
      await expect(ctx.page.getByTestId('scp-btn-add-row')).toBeDisabled({ timeout: params.timeoutMs ?? ctx.stepTimeoutMs })
    },
  })

  registry.set('schedule.addRow', {
    async run(ctx, params) {
      await ensureScheduleOpen(ctx, params.timeoutMs ?? ctx.stepTimeoutMs)
      await clickByTestId(ctx.page, 'scp-btn-add-row', params.timeoutMs ?? ctx.stepTimeoutMs)
    },
  })

  registry.set('schedule.deleteSelectedRow', {
    async run(ctx, params) {
      await ensureScheduleOpen(ctx, params.timeoutMs ?? ctx.stepTimeoutMs)
      await clickByTestId(ctx.page, 'scp-btn-delete-selected-row', params.timeoutMs ?? ctx.stepTimeoutMs)
    },
  })

  registry.set('schedule.preset.okClose', {
    async run(ctx, params) {
      const button = ctx.page.getByTestId('scp-preset-btn-ok').first()
      if (await button.isVisible().catch(() => false)) {
        await clickLocator(button, params.timeoutMs ?? ctx.stepTimeoutMs)
      }
    },
  })

  registry.set('schedule.presetDialog.closeIfOpen', {
    async run(ctx, params) {
      const button = ctx.page.getByTestId('scp-preset-btn-close').first()
      if (await button.isVisible().catch(() => false)) {
        await clickLocator(button, params.timeoutMs ?? ctx.stepTimeoutMs)
      }
    },
  })

  registry.set('schedule.trimRows', notImplemented('schedule.trimRows'))
  registry.set('schedule.setupRowFull', notImplemented('schedule.setupRowFull'))
  registry.set('schedule.assertCellContainsText', notImplemented('schedule.assertCellContainsText'))
  registry.set('schedule.setExposureCustom', notImplemented('schedule.setExposureCustom'))
  registry.set('schedule.setReps', notImplemented('schedule.setReps'))
  registry.set('schedule.setShootTime', notImplemented('schedule.setShootTime'))
  registry.set('schedule.selectCell', notImplemented('schedule.selectCell'))
  registry.set('schedule.setupCapturePlan', notImplemented('schedule.setupCapturePlan'))
  registry.set('schedule.preset.saveAs', notImplemented('schedule.preset.saveAs'))
  registry.set('schedule.preset.selectByName', notImplemented('schedule.preset.selectByName'))
  registry.set('schedule.preset.deleteSelected', notImplemented('schedule.preset.deleteSelected'))

  return registry
}
