/**
 * AI-Control 菜单确认弹窗步骤注册表。
 *
 * 设计目的：
 * - 为菜单类业务动作提供统一的确认弹窗等待、确认、取消能力。
 * - 严格遵循 README 中“前置检查 -> 执行动作 -> 后置确认”的链路约束，不把“按钮点到了”当作完成。
 * - 所有交互只使用稳定的 `data-testid`，不依赖文案、层级或样式类名。
 *
 * 当前职责：
 * - `dialog.confirm.wait`：等待确认弹窗真正出现，并校验根节点进入 `data-state=open`。
 * - `dialog.confirm.confirm`：在弹窗可见时点击确认按钮，并校验弹窗关闭。
 * - `dialog.confirm.cancel`：在弹窗可见时点击取消按钮，并校验弹窗关闭。
 *
 * 约束说明：
 * - 这里只处理通用确认弹窗，不关心上游菜单业务语义。
 * - 若弹窗未出现，不会强行点击任意位置；由上游步骤决定是否应当抛错或跳过。
 */
import { expect, type Page } from '@playwright/test'
import type { StepRegistry } from '../core/flowTypes'
import { clickByTestId } from '../shared/interaction'

type ConfirmDialogExpectation = {
  expectedAction?: string
  actionAttr?: string
}

function resolveDialogActionAttr(expectation?: ConfirmDialogExpectation) {
  return expectation?.actionAttr ?? 'data-action'
}

async function waitForConfirmDialogOpen(page: Page, timeout: number, expectation?: ConfirmDialogExpectation) {
  const root = page.getByTestId('ui-confirm-dialog-root').first()
  await expect(root).toBeVisible({ timeout })
  await expect(root).toHaveAttribute('data-state', 'open', { timeout })
  if (expectation?.expectedAction != null) {
    await expect(root).toHaveAttribute(resolveDialogActionAttr(expectation), expectation.expectedAction, { timeout })
  }
  return root
}

async function waitForConfirmDialogClosed(page: Page, timeout: number) {
  const root = page.getByTestId('ui-confirm-dialog-root').first()
  await expect(root).not.toBeVisible({ timeout }).catch(async () => {
    await expect(root).toHaveAttribute('data-state', 'closed', { timeout })
  })
}

async function confirmDialogIfOpen(
  page: Page,
  action: 'confirm' | 'cancel',
  timeout: number,
  expectation?: ConfirmDialogExpectation,
) {
  const root = page.getByTestId('ui-confirm-dialog-root').first()
  if (!(await root.isVisible().catch(() => false))) return false

  await waitForConfirmDialogOpen(page, timeout, expectation)
  const buttonTestId = action === 'confirm' ? 'ui-confirm-dialog-btn-confirm' : 'ui-confirm-dialog-btn-cancel'
  await clickByTestId(page, buttonTestId, timeout)
  await waitForConfirmDialogClosed(page, Math.min(timeout, 8000))
  return true
}

export function makeDialogStepRegistry(): StepRegistry {
  const registry: StepRegistry = new Map()

  registry.set('dialog.confirm.wait', {
    async run(ctx, params) {
      await waitForConfirmDialogOpen(ctx.page, params.timeoutMs ?? ctx.stepTimeoutMs)
    },
  })

  registry.set('dialog.confirm.confirm', {
    async run(ctx, params) {
      const timeout = params.timeoutMs ?? ctx.stepTimeoutMs
      await waitForConfirmDialogOpen(ctx.page, timeout)
      await confirmDialogIfOpen(ctx.page, 'confirm', timeout)
    },
  })

  registry.set('dialog.confirm.cancel', {
    async run(ctx, params) {
      const timeout = params.timeoutMs ?? ctx.stepTimeoutMs
      await waitForConfirmDialogOpen(ctx.page, timeout)
      await confirmDialogIfOpen(ctx.page, 'cancel', timeout)
    },
  })

  return registry
}

export { confirmDialogIfOpen, waitForConfirmDialogOpen }
