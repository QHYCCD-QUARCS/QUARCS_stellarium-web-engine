/**
 * AI-Control 菜单确认弹窗步骤注册表。
 *
 * 设计目的：
 * - 为菜单类业务动作提供统一的确认弹窗等待、确认、取消能力。
 * - 严格遵循 README 中“前置检查 -> 执行动作 -> 后置确认”的链路约束，不把“按钮点到了”当作完成。
 * - 所有交互只使用稳定的 `data-testid`，不依赖文案、层级或样式类名。
 * - 弹窗根节点与 data-state / data-action 约定见 docs/dialog-identification.md。
 *
 * 当前职责：
 * - `dialog.confirm.wait`：等待确认弹窗出现，校验 data-state=open；可选 params.expectedAction 校验 data-action。
 * - `dialog.confirm.confirm`：弹窗可见时点击确认按钮并校验关闭；可选 params.expectedAction。
 * - `dialog.confirm.cancel`：弹窗可见时点击取消按钮并校验关闭；可选 params.expectedAction。
 *
 * 约束说明：
 * - 这里只处理通用确认弹窗（gui.vue），类型通过 data-action 区分，见 CONFIRM_ACTION。
 * - 若弹窗未出现，不会强行点击；由上游步骤决定是否抛错或跳过。
 */
import { expect, type Page } from '@playwright/test'
import type { StepRegistry } from '../core/flowTypes'
import {
  CONFIRM_ACTION,
  CONFIRM_DIALOG_BTN_CANCEL,
  CONFIRM_DIALOG_BTN_CONFIRM,
  CONFIRM_DIALOG_ROOT_TESTID,
  DISCONNECT_DRIVER_DIALOG_BTN_CANCEL,
  DISCONNECT_DRIVER_DIALOG_BTN_CONFIRM,
  DISCONNECT_DRIVER_DIALOG_ROOT_TESTID,
  IMAGE_MANAGER_DIALOG_CONFIGS,
  type ImageManagerDialogKind,
} from '../shared/dialogConstants'
import { createStepError } from '../shared/errors'
import { clickByTestId } from '../shared/interaction'

/** 确认弹窗期望：可选校验 data-action 及自定义属性名 */
export type ConfirmDialogExpectation = {
  expectedAction?: string
  actionAttr?: string
}

function resolveDialogActionAttr(expectation?: ConfirmDialogExpectation) {
  return expectation?.actionAttr ?? 'data-action'
}

function resolveTimeout(timeout: number) {
  return Math.max(500, Number(timeout) || 5000)
}

async function isVisibleByTestId(page: Page, testId: string) {
  return page.getByTestId(testId).first().isVisible().catch(() => false)
}

/** 等待确认弹窗打开（可见且 data-state=open），可选校验 expectedAction */
async function waitForConfirmDialogOpen(page: Page, timeout: number, expectation?: ConfirmDialogExpectation) {
  const root = page.getByTestId(CONFIRM_DIALOG_ROOT_TESTID).first()
  await expect(root).toBeVisible({ timeout })
  await expect(root).toHaveAttribute('data-state', 'open', { timeout })
  if (expectation?.expectedAction != null && expectation.expectedAction !== '') {
    await expect(root).toHaveAttribute(
      resolveDialogActionAttr(expectation),
      expectation.expectedAction,
      { timeout },
    )
  }
  return root
}

/** 等待确认弹窗关闭（data-state=closed 或不可见） */
async function waitForConfirmDialogClosed(page: Page, timeout: number) {
  const root = page.getByTestId(CONFIRM_DIALOG_ROOT_TESTID).first()
  await expect(root).toHaveAttribute('data-state', 'closed', { timeout }).catch(async () => {
    await expect(root).not.toBeVisible({ timeout })
  })
}

async function confirmDialogIfOpen(
  page: Page,
  action: 'confirm' | 'cancel',
  timeout: number,
  expectation?: ConfirmDialogExpectation,
) {
  const root = page.getByTestId(CONFIRM_DIALOG_ROOT_TESTID).first()
  if (!(await root.isVisible().catch(() => false))) return false

  await waitForConfirmDialogOpen(page, timeout, expectation)
  const buttonTestId = action === 'confirm' ? CONFIRM_DIALOG_BTN_CONFIRM : CONFIRM_DIALOG_BTN_CANCEL
  await clickByTestId(page, buttonTestId, timeout)
  await waitForConfirmDialogClosed(page, Math.min(timeout, 8000))
  return true
}

/** 从 step params 解析 expectedAction / actionAttr */
function expectationFromParams(params: Record<string, unknown>): ConfirmDialogExpectation | undefined {
  const action = params.expectedAction
  if (action == null || String(action).trim() === '') return undefined
  return { expectedAction: String(action), actionAttr: (params.actionAttr as string) || 'data-action' }
}

export type DisconnectDriverDialogExpectation = {
  expectedDriverName?: string
}

export type DisconnectAllDialogExpectation = {
  allowMissing?: boolean
}

function disconnectDriverExpectationFromParams(
  params: Record<string, unknown>,
): DisconnectDriverDialogExpectation | undefined {
  const expectedDriverName = String(params.expectedDriverName ?? '').trim()
  if (expectedDriverName === '') return undefined
  return { expectedDriverName }
}

async function waitForDisconnectDriverDialogOpen(
  page: Page,
  timeout: number,
  expectation?: DisconnectDriverDialogExpectation,
) {
  const root = page.getByTestId(DISCONNECT_DRIVER_DIALOG_ROOT_TESTID).first()
  await expect(root).toBeVisible({ timeout })
  await expect(root).toHaveAttribute('data-state', 'open', { timeout })
  if (expectation?.expectedDriverName) {
    await expect(root).toContainText(expectation.expectedDriverName, { timeout })
  }
  return root
}

async function waitForDisconnectDriverDialogClosed(page: Page, timeout: number) {
  const root = page.getByTestId(DISCONNECT_DRIVER_DIALOG_ROOT_TESTID).first()
  await expect(root).toHaveAttribute('data-state', 'closed', { timeout }).catch(async () => {
    await expect(root).not.toBeVisible({ timeout })
  })
}

async function disconnectDriverDialogIfOpen(
  page: Page,
  action: 'confirm' | 'cancel',
  timeout: number,
  expectation?: DisconnectDriverDialogExpectation,
) {
  if (!(await isVisibleByTestId(page, DISCONNECT_DRIVER_DIALOG_ROOT_TESTID))) return false
  await waitForDisconnectDriverDialogOpen(page, timeout, expectation)
  await clickByTestId(
    page,
    action === 'confirm' ? DISCONNECT_DRIVER_DIALOG_BTN_CONFIRM : DISCONNECT_DRIVER_DIALOG_BTN_CANCEL,
    timeout,
  )
  await waitForDisconnectDriverDialogClosed(page, Math.min(resolveTimeout(timeout), 8000))
  return true
}

function disconnectAllExpectationFromParams(params: Record<string, unknown>): DisconnectAllDialogExpectation {
  return {
    allowMissing: params.allowMissing === true,
  }
}

async function waitForDisconnectAllDialogOpen(
  page: Page,
  timeout: number,
  expectation?: DisconnectAllDialogExpectation,
) {
  try {
    return await waitForConfirmDialogOpen(page, timeout, {
      expectedAction: CONFIRM_ACTION.DISCONNECT_ALL_DEVICE,
    })
  } catch (error) {
    const root = page.getByTestId(CONFIRM_DIALOG_ROOT_TESTID).first()
    const visible = await root.isVisible().catch(() => false)
    if (!visible && expectation?.allowMissing) return null
    throw error
  }
}

async function disconnectAllDialogIfOpen(
  page: Page,
  action: 'confirm' | 'cancel',
  timeout: number,
  expectation?: DisconnectAllDialogExpectation,
) {
  const opened = await waitForDisconnectAllDialogOpen(page, timeout, expectation)
  if (!opened) return false
  await clickByTestId(
    page,
    action === 'confirm' ? CONFIRM_DIALOG_BTN_CONFIRM : CONFIRM_DIALOG_BTN_CANCEL,
    timeout,
  )
  await waitForConfirmDialogClosed(page, Math.min(resolveTimeout(timeout), 8000))
  return true
}

type ImageManagerDialogExpectation = {
  dialog: ImageManagerDialogKind
}

function imageManagerDialogExpectationFromParams(params: Record<string, unknown>): ImageManagerDialogExpectation {
  const raw = String(params.dialog ?? '').trim() as ImageManagerDialogKind
  if (raw && raw in IMAGE_MANAGER_DIALOG_CONFIGS) return { dialog: raw }
  throw createStepError('dialog.imageManager', 'params', '缺少或不支持的 dialog 参数', {
    dialog: params.dialog,
    supported: Object.keys(IMAGE_MANAGER_DIALOG_CONFIGS).join(', '),
  })
}

async function waitForImageManagerDialogOpen(
  page: Page,
  timeout: number,
  expectation: ImageManagerDialogExpectation,
) {
  const root = page.getByTestId(IMAGE_MANAGER_DIALOG_CONFIGS[expectation.dialog].rootTestId).first()
  await expect(root).toBeVisible({ timeout })
  return root
}

async function waitForImageManagerDialogClosed(
  page: Page,
  timeout: number,
  expectation: ImageManagerDialogExpectation,
) {
  const root = page.getByTestId(IMAGE_MANAGER_DIALOG_CONFIGS[expectation.dialog].rootTestId).first()
  await expect(root).not.toBeVisible({ timeout })
}

async function imageManagerDialogIfOpen(
  page: Page,
  action: 'confirm' | 'cancel',
  timeout: number,
  expectation: ImageManagerDialogExpectation,
) {
  const config = IMAGE_MANAGER_DIALOG_CONFIGS[expectation.dialog]
  if (!(await isVisibleByTestId(page, config.rootTestId))) return false
  await waitForImageManagerDialogOpen(page, timeout, expectation)
  await clickByTestId(page, action === 'confirm' ? config.confirmTestId : config.cancelTestId, timeout)
  await waitForImageManagerDialogClosed(page, Math.min(resolveTimeout(timeout), 8000), expectation)
  return true
}

export function makeDialogStepRegistry(): StepRegistry {
  const registry: StepRegistry = new Map()

  registry.set('dialog.confirm.wait', {
    async run(ctx, params) {
      const timeout = params.timeoutMs ?? ctx.stepTimeoutMs
      await waitForConfirmDialogOpen(ctx.page, timeout, expectationFromParams(params))
    },
  })

  registry.set('dialog.confirm.confirm', {
    async run(ctx, params) {
      const timeout = params.timeoutMs ?? ctx.stepTimeoutMs
      const expectation = expectationFromParams(params)
      await waitForConfirmDialogOpen(ctx.page, timeout, expectation)
      await confirmDialogIfOpen(ctx.page, 'confirm', timeout, expectation)
    },
  })

  registry.set('dialog.confirm.cancel', {
    async run(ctx, params) {
      const timeout = params.timeoutMs ?? ctx.stepTimeoutMs
      const expectation = expectationFromParams(params)
      await waitForConfirmDialogOpen(ctx.page, timeout, expectation)
      await confirmDialogIfOpen(ctx.page, 'cancel', timeout, expectation)
    },
  })

  registry.set('dialog.disconnectDriver.wait', {
    async run(ctx, params) {
      const timeout = params.timeoutMs ?? ctx.stepTimeoutMs
      await waitForDisconnectDriverDialogOpen(ctx.page, timeout, disconnectDriverExpectationFromParams(params))
    },
  })

  registry.set('dialog.disconnectDriver.confirm', {
    async run(ctx, params) {
      const timeout = params.timeoutMs ?? ctx.stepTimeoutMs
      const expectation = disconnectDriverExpectationFromParams(params)
      await waitForDisconnectDriverDialogOpen(ctx.page, timeout, expectation)
      await disconnectDriverDialogIfOpen(ctx.page, 'confirm', timeout, expectation)
    },
  })

  registry.set('dialog.disconnectDriver.cancel', {
    async run(ctx, params) {
      const timeout = params.timeoutMs ?? ctx.stepTimeoutMs
      const expectation = disconnectDriverExpectationFromParams(params)
      await waitForDisconnectDriverDialogOpen(ctx.page, timeout, expectation)
      await disconnectDriverDialogIfOpen(ctx.page, 'cancel', timeout, expectation)
    },
  })

  registry.set('dialog.disconnectAll.wait', {
    async run(ctx, params) {
      const timeout = params.timeoutMs ?? ctx.stepTimeoutMs
      await waitForDisconnectAllDialogOpen(ctx.page, timeout, disconnectAllExpectationFromParams(params))
    },
  })

  registry.set('dialog.disconnectAll.confirm', {
    async run(ctx, params) {
      const timeout = params.timeoutMs ?? ctx.stepTimeoutMs
      const expectation = disconnectAllExpectationFromParams(params)
      await disconnectAllDialogIfOpen(ctx.page, 'confirm', timeout, expectation)
    },
  })

  registry.set('dialog.disconnectAll.cancel', {
    async run(ctx, params) {
      const timeout = params.timeoutMs ?? ctx.stepTimeoutMs
      const expectation = disconnectAllExpectationFromParams(params)
      await disconnectAllDialogIfOpen(ctx.page, 'cancel', timeout, expectation)
    },
  })

  registry.set('dialog.imageManager.wait', {
    async run(ctx, params) {
      const timeout = params.timeoutMs ?? ctx.stepTimeoutMs
      await waitForImageManagerDialogOpen(ctx.page, timeout, imageManagerDialogExpectationFromParams(params))
    },
  })

  registry.set('dialog.imageManager.confirm', {
    async run(ctx, params) {
      const timeout = params.timeoutMs ?? ctx.stepTimeoutMs
      const expectation = imageManagerDialogExpectationFromParams(params)
      await waitForImageManagerDialogOpen(ctx.page, timeout, expectation)
      await imageManagerDialogIfOpen(ctx.page, 'confirm', timeout, expectation)
    },
  })

  registry.set('dialog.imageManager.cancel', {
    async run(ctx, params) {
      const timeout = params.timeoutMs ?? ctx.stepTimeoutMs
      const expectation = imageManagerDialogExpectationFromParams(params)
      await waitForImageManagerDialogOpen(ctx.page, timeout, expectation)
      await imageManagerDialogIfOpen(ctx.page, 'cancel', timeout, expectation)
    },
  })

  return registry
}

/** 若弹窗已打开则点击确认/取消并等待关闭；供业务步骤复用 */
export {
  confirmDialogIfOpen,
  disconnectAllDialogIfOpen,
  disconnectDriverDialogIfOpen,
  imageManagerDialogIfOpen,
  waitForConfirmDialogOpen,
  waitForDisconnectAllDialogOpen,
  waitForDisconnectDriverDialogOpen,
  waitForImageManagerDialogOpen,
}
