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
 * - `dialog.confirm.act`：按 mode 自动分派到 confirm/cancel/coarse/fine，并校验关闭。
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
  CONFIRM_DIALOG_BTN_AUTOFOCUS_COARSE,
  CONFIRM_DIALOG_BTN_AUTOFOCUS_FINE,
  CONFIRM_DIALOG_BTN_CANCEL,
  CONFIRM_DIALOG_BTN_CLOSE,
  CONFIRM_DIALOG_BTN_CONFIRM,
  CONFIRM_DIALOG_VARIANT_AUTOFOCUS_MODE,
  CONFIRM_DIALOG_VARIANT_BINARY,
  CONFIRM_DIALOG_ROOT_TESTID,
  DISCONNECT_DRIVER_DIALOG_BTN_CANCEL,
  DISCONNECT_DRIVER_DIALOG_BTN_CONFIRM,
  DISCONNECT_DRIVER_DIALOG_ROOT_TESTID,
  IMAGE_MANAGER_DIALOG_CONFIGS,
  getConfirmDialogVariant,
  type ConfirmDialogActionMode,
  type ConfirmDialogVariant,
  type ImageManagerDialogKind,
} from '../shared/dialogConstants'
import { createStepError } from '../shared/errors'
import { clickByTestId, sleep } from '../shared/interaction'

/** 确认弹窗期望：可选校验 data-action 及自定义属性名 */
export type ConfirmDialogExpectation = {
  expectedAction?: string
  actionAttr?: string
  expectedVariant?: ConfirmDialogVariant
}

export type StatefulDialogExpectation = {
  rootTestId: string
  stateAttr?: string
  openState?: string
  closedState?: string
}

function resolveDialogActionAttr(expectation?: ConfirmDialogExpectation) {
  return expectation?.actionAttr ?? 'data-action'
}

function resolveDialogStateAttr(expectation?: StatefulDialogExpectation) {
  return expectation?.stateAttr ?? 'data-state'
}

function resolveDialogOpenState(expectation?: StatefulDialogExpectation) {
  return expectation?.openState ?? 'open'
}

function resolveDialogClosedState(expectation?: StatefulDialogExpectation) {
  return expectation?.closedState ?? 'closed'
}

function resolveExpectedDialogVariant(expectation?: ConfirmDialogExpectation): ConfirmDialogVariant | undefined {
  if (expectation?.expectedVariant) return expectation.expectedVariant
  if (expectation?.expectedAction) return getConfirmDialogVariant(expectation.expectedAction)
  return undefined
}

function resolveTimeout(timeout: number) {
  return Math.max(500, Number(timeout) || 5000)
}

type ConfirmDialogSnapshot = {
  visible: boolean
  state: string | null
  action: string | null
  variant: string | null
}

async function isVisibleByTestId(page: Page, testId: string) {
  return page.getByTestId(testId).first().isVisible().catch(() => false)
}

async function isStatefulDialogOpen(page: Page, expectation: StatefulDialogExpectation) {
  const root = page.getByTestId(expectation.rootTestId).first()
  const visible = await root.isVisible().catch(() => false)
  const state = await root.getAttribute(resolveDialogStateAttr(expectation)).catch(() => null)
  if (state === resolveDialogOpenState(expectation)) return true
  if (state === resolveDialogClosedState(expectation)) return false
  return visible
}

async function waitForStatefulDialogOpen(page: Page, timeout: number, expectation: StatefulDialogExpectation) {
  const root = page.getByTestId(expectation.rootTestId).first()
  const stateAttr = resolveDialogStateAttr(expectation)
  const openState = resolveDialogOpenState(expectation)
  await expect(root).toBeVisible({ timeout }).catch(() => {})
  await expect(root).toHaveAttribute(stateAttr, openState, { timeout }).catch(async () => {
    await expect(root).toBeVisible({ timeout })
  })
  return root
}

async function waitForStatefulDialogClosed(page: Page, timeout: number, expectation: StatefulDialogExpectation) {
  const root = page.getByTestId(expectation.rootTestId).first()
  const stateAttr = resolveDialogStateAttr(expectation)
  const closedState = resolveDialogClosedState(expectation)
  await expect(root).toHaveAttribute(stateAttr, closedState, { timeout }).catch(async () => {
    await expect(root).not.toBeVisible({ timeout }).catch(async () => {
      await expect(root).toHaveCount(0, { timeout })
    })
  })
}

async function closeStatefulDialogByButtonIfOpen(
  page: Page,
  timeout: number,
  expectation: StatefulDialogExpectation & { closeButtonTestId: string },
) {
  if (!(await isStatefulDialogOpen(page, expectation))) return false
  await clickByTestId(page, expectation.closeButtonTestId, timeout)
  await waitForStatefulDialogClosed(page, Math.min(resolveTimeout(timeout), 8000), expectation)
  return true
}

async function closeStatefulDialogByEscapeIfOpen(
  page: Page,
  timeout: number,
  expectation: StatefulDialogExpectation,
) {
  if (!(await isStatefulDialogOpen(page, expectation))) return false
  for (let i = 0; i < 3; i += 1) {
    await page.keyboard.press('Escape').catch(() => {})
    await sleep(250)
    if (!(await isStatefulDialogOpen(page, expectation))) return true
  }
  await waitForStatefulDialogClosed(page, Math.min(resolveTimeout(timeout), 5000), expectation)
  return true
}

async function readConfirmDialogSnapshot(page: Page): Promise<ConfirmDialogSnapshot> {
  const root = page.getByTestId(CONFIRM_DIALOG_ROOT_TESTID).first()
  const [visible, state, action, variant] = await Promise.all([
    root.isVisible().catch(() => false),
    root.getAttribute('data-state').catch(() => null),
    root.getAttribute('data-action').catch(() => null),
    root.getAttribute('data-variant').catch(() => null),
  ])
  return { visible, state, action, variant }
}

function matchesConfirmDialogExpectation(
  snapshot: ConfirmDialogSnapshot,
  expectation?: ConfirmDialogExpectation,
) {
  if (snapshot.state !== 'open' && !snapshot.visible) return false
  if (expectation?.expectedAction != null && expectation.expectedAction !== '') {
    if (snapshot.action !== expectation.expectedAction) return false
  }
  const expectedVariant = resolveExpectedDialogVariant(expectation)
  if (expectedVariant && snapshot.variant !== expectedVariant) return false
  return true
}

async function isConfirmDialogOpen(page: Page, expectation?: ConfirmDialogExpectation) {
  return matchesConfirmDialogExpectation(await readConfirmDialogSnapshot(page), expectation)
}

/** 等待确认弹窗打开（可见且 data-state=open），可选校验 expectedAction */
async function waitForConfirmDialogOpen(page: Page, timeout: number, expectation?: ConfirmDialogExpectation) {
  const root = page.getByTestId(CONFIRM_DIALOG_ROOT_TESTID).first()
  await expect
    .poll(async () => matchesConfirmDialogExpectation(await readConfirmDialogSnapshot(page), expectation), { timeout })
    .toBe(true)
  if (expectation?.expectedAction != null && expectation.expectedAction !== '') {
    await expect(root).toHaveAttribute(resolveDialogActionAttr(expectation), expectation.expectedAction, { timeout })
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

function resolveConfirmDialogButtonTestId(variant: ConfirmDialogVariant, mode: ConfirmDialogActionMode) {
  if (variant === CONFIRM_DIALOG_VARIANT_AUTOFOCUS_MODE) {
    if (mode === 'cancel') return CONFIRM_DIALOG_BTN_CLOSE
    if (mode === 'coarse') return CONFIRM_DIALOG_BTN_AUTOFOCUS_COARSE
    if (mode === 'fine') return CONFIRM_DIALOG_BTN_AUTOFOCUS_FINE
    throw createStepError('dialog.confirm.act', 'params', '自动对焦确认框不支持该 mode', {
      variant,
      mode,
      supported: ['cancel', 'coarse', 'fine'],
    })
  }
  if (mode === 'confirm') return CONFIRM_DIALOG_BTN_CONFIRM
  if (mode === 'cancel') return CONFIRM_DIALOG_BTN_CANCEL
  throw createStepError('dialog.confirm.act', 'params', '普通确认框不支持该 mode', {
    variant,
    mode,
    supported: ['confirm', 'cancel'],
  })
}

async function actConfirmDialogIfOpen(
  page: Page,
  mode: ConfirmDialogActionMode,
  timeout: number,
  expectation?: ConfirmDialogExpectation,
) {
  const root = page.getByTestId(CONFIRM_DIALOG_ROOT_TESTID).first()
  if (!(await isConfirmDialogOpen(page, expectation))) return false

  await waitForConfirmDialogOpen(page, timeout, expectation)
  const variant =
    (await root.getAttribute('data-variant').catch(() => null)) ?? resolveExpectedDialogVariant(expectation) ?? CONFIRM_DIALOG_VARIANT_BINARY
  const buttonTestId = resolveConfirmDialogButtonTestId(variant as ConfirmDialogVariant, mode)
  await clickByTestId(page, buttonTestId, timeout)
  await waitForConfirmDialogClosed(page, Math.min(timeout, 8000))
  return true
}

async function confirmDialogIfOpen(
  page: Page,
  action: 'confirm' | 'cancel',
  timeout: number,
  expectation?: ConfirmDialogExpectation,
) {
  return actConfirmDialogIfOpen(page, action, timeout, {
    ...expectation,
    expectedVariant: expectation?.expectedVariant ?? CONFIRM_DIALOG_VARIANT_BINARY,
  })
}

/** 从 step params 解析 expectedAction / actionAttr / expectedVariant */
function expectationFromParams(params: Record<string, unknown>): ConfirmDialogExpectation | undefined {
  const action = params.expectedAction
  const expectedVariant = typeof params.expectedVariant === 'string'
    ? (params.expectedVariant as ConfirmDialogVariant)
    : undefined
  if ((action == null || String(action).trim() === '') && !expectedVariant) return undefined
  return {
    expectedAction: action == null || String(action).trim() === '' ? undefined : String(action),
    actionAttr: (params.actionAttr as string) || 'data-action',
    expectedVariant,
  }
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

  registry.set('dialog.confirm.act', {
    async run(ctx, params) {
      const timeout = params.timeoutMs ?? ctx.stepTimeoutMs
      const expectation = expectationFromParams(params)
      const mode = String(params.mode ?? '').trim() as ConfirmDialogActionMode
      if (!mode) {
        throw createStepError('dialog.confirm.act', 'params', '缺少 mode 参数', {
          supported: ['confirm', 'cancel', 'coarse', 'fine'],
        })
      }
      await waitForConfirmDialogOpen(ctx.page, timeout, expectation)
      await actConfirmDialogIfOpen(ctx.page, mode, timeout, expectation)
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
  actConfirmDialogIfOpen,
  closeStatefulDialogByButtonIfOpen,
  closeStatefulDialogByEscapeIfOpen,
  confirmDialogIfOpen,
  disconnectAllDialogIfOpen,
  disconnectDriverDialogIfOpen,
  imageManagerDialogIfOpen,
  waitForConfirmDialogClosed,
  waitForConfirmDialogOpen,
  waitForDisconnectAllDialogOpen,
  waitForDisconnectDriverDialogOpen,
  waitForImageManagerDialogOpen,
  waitForStatefulDialogClosed,
  waitForStatefulDialogOpen,
}
