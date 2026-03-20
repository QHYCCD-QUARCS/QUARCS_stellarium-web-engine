/**
 * AI-Control 主菜单业务步骤注册表。
 *
 * 设计目的：
 * - 把主菜单里的“打开设置、打开日志、打开图像管理、打开设备分配、打开位置对话框、处理刷新/断开确认”等动作收敛成统一入口。
 * - 每个步骤都必须符合 README 里的菜单规则：先确认抽屉已展开，再点击真实菜单项，最后用稳定的根节点或状态做后置确认。
 * - 对会“切换开关态”的菜单项（例如设置、数据版权、位置、日志），优先做幂等处理：若目标已打开，则直接复用当前状态，避免再次点击把它关闭。
 *
 * 当前职责：
 * - 提供主菜单常用入口的 step，包括连接全部、断开全部、通用设置、电源管理、设备分配、极轴校准、图像管理、调试日志、位置对话框、数据版权、刷新确认。
 * - 对 `menu.disconnectAll` 这种带确认弹窗的动作，拆成“打开确认弹窗”和“确认执行”两个层次，兼顾复用与现有 flow 兼容。
 *
 * 约束说明：
 * - 所有正式定位都基于 `data-testid`。
 * - 不使用 `force`，不依赖文案，不跨层级跳转，不把“click 成功”当作业务成功。
 * - `menu.connectAll` 仅负责触发真实菜单动作；若需要验证设备连接结果，应交由后续设备步骤继续校验。
 */
import { expect } from '@playwright/test'
import type { FlowContext, StepRegistry } from '../core/flowTypes'
import { CONFIRM_ACTION, CONFIRM_DIALOG_ROOT_TESTID } from '../shared/dialogConstants'
import { createStepError } from '../shared/errors'
import { clickByTestId } from '../shared/interaction'
import { ensureMenuDrawerOpen } from '../shared/navigation'
import { sleep } from '../shared/interaction'
import {
  confirmDialogIfOpen,
  disconnectAllDialogIfOpen,
  waitForConfirmDialogOpen,
  waitForDisconnectAllDialogOpen,
} from './dialogSteps'

type MenuOpenSpec = {
  menuTestId: string
  resultTestId: string
  resultLabel: string
  resultState?: string
  resultAttr?: string
  resultAction?: string
  resultActionAttr?: string
}

function resolveTimeout(ctx: FlowContext, params: Record<string, any>) {
  return params.timeoutMs ?? ctx.stepTimeoutMs
}

async function isMenuResultOpen(ctx: FlowContext, spec: MenuOpenSpec) {
  const root = ctx.page.getByTestId(spec.resultTestId).first()
  const isVisible = await root.isVisible().catch(() => false)
  if (!isVisible) return false

  if (spec.resultState) {
    const state = await root.getAttribute(spec.resultAttr ?? 'data-state').catch(() => null)
    if (state !== spec.resultState) return false
  }

  if (spec.resultAction) {
    const action = await root.getAttribute(spec.resultActionAttr ?? 'data-action').catch(() => null)
    if (action !== spec.resultAction) return false
  }

  return true
}

async function assertMenuResultOpen(ctx: FlowContext, spec: MenuOpenSpec, timeout: number) {
  const root = ctx.page.getByTestId(spec.resultTestId).first()
  if (spec.resultState) {
    await expect(root, `${spec.resultLabel} 应已打开 (data-state)`).toHaveAttribute(
      spec.resultAttr ?? 'data-state',
      spec.resultState,
      { timeout },
    )
  }
  if (spec.resultAction) {
    await expect(root).toHaveAttribute(spec.resultActionAttr ?? 'data-action', spec.resultAction, { timeout })
  }
  // 以 data-state 为业务结果；v-dialog 等组件在过渡期可能被判为不可见，仅校验状态即可
  if (!spec.resultState && !spec.resultAction) {
    await expect(root, `${spec.resultLabel} 应已可见`).toBeVisible({ timeout })
  }
}

async function assertNoUnexpectedConfirmDialog(ctx: FlowContext, spec: MenuOpenSpec, timeout: number) {
  if (spec.resultTestId !== CONFIRM_DIALOG_ROOT_TESTID || !spec.resultAction) return

  const root = ctx.page.getByTestId(CONFIRM_DIALOG_ROOT_TESTID).first()
  if (!(await root.isVisible().catch(() => false))) return

  const currentAction = await root.getAttribute(spec.resultActionAttr ?? 'data-action').catch(() => null)
  if (currentAction === spec.resultAction) {
    await waitForConfirmDialogOpen(ctx.page, timeout, { expectedAction: spec.resultAction, actionAttr: spec.resultActionAttr })
    return
  }

  throw createStepError(
    'menu.ensureMenuResultOpen',
    'postcondition',
    `当前已打开其他确认弹窗，无法执行 ${spec.menuTestId}`,
    { expectedAction: spec.resultAction, actualAction: currentAction ?? 'unknown' },
  )
}

async function ensureMenuResultOpen(ctx: FlowContext, params: Record<string, any>, spec: MenuOpenSpec) {
  const timeout = resolveTimeout(ctx, params)
  await sleep(400)
  if (await isMenuResultOpen(ctx, spec)) return

  await assertNoUnexpectedConfirmDialog(ctx, spec, timeout)
  console.log(`[ai-control] ${spec.menuTestId} 前置步骤: menu.drawer.open`)
  await ensureMenuDrawerOpen(ctx.page, timeout)
  await clickByTestId(ctx.page, spec.menuTestId, timeout)
  await sleep(600)

  const isSettingsDialog = spec.resultTestId === 'ui-view-settings-dialog-root'
  if (isSettingsDialog && !(await isMenuResultOpen(ctx, spec))) {
    await ctx.page.keyboard.press('Escape')
    await sleep(400)
    await ensureMenuDrawerOpen(ctx.page, timeout)
    await clickByTestId(ctx.page, spec.menuTestId, timeout)
    await sleep(800)
  }
  await assertMenuResultOpen(ctx, spec, timeout)
  console.log(`[ai-control] ${spec.menuTestId} 后置确认: ${spec.resultLabel} 已打开`)
}

function allowMissingDisconnectAllDialog(params: Record<string, any>) {
  return params.allowMissing !== false
}

/** 打开“断开全部”确认弹窗。有设备连接时才会弹窗，无设备连接时不会弹窗，此时直接返回 false。 */
async function openDisconnectAllConfirm(ctx: FlowContext, params: Record<string, any>) {
  const timeout = resolveTimeout(ctx, params)
  const dialogRoot = ctx.page.getByTestId(CONFIRM_DIALOG_ROOT_TESTID).first()

  if (await dialogRoot.isVisible().catch(() => false)) {
    await waitForDisconnectAllDialogOpen(ctx.page, timeout)
    return true
  }

  console.log('[ai-control] menu.openDisconnectAllConfirm 前置步骤: menu.drawer.open')
  await ensureMenuDrawerOpen(ctx.page, timeout)
  await clickByTestId(ctx.page, 'ui-app-menu-disconnect-all', timeout)
  const waitMs = Math.min(8000, timeout)
  const dialog = await waitForDisconnectAllDialogOpen(ctx.page, waitMs, {
    allowMissing: allowMissingDisconnectAllDialog(params),
  }).catch((error) => {
    throw createStepError(
      'menu.openDisconnectAllConfirm',
      'postcondition',
      '等待断开全部确认弹窗超时',
      { waitMs },
      error,
    )
  })
  if (!dialog) {
    console.log('[ai-control] menu.openDisconnectAllConfirm: 无设备连接时不弹窗，跳过')
    return false
  }
  console.log('[ai-control] menu.openDisconnectAllConfirm 后置确认: 确认弹窗已出现')
  return true
}

export function makeMenuStepRegistry(): StepRegistry {
  const registry: StepRegistry = new Map()

  registry.set('menu.connectAll', {
    async run(ctx, params) {
      const timeout = resolveTimeout(ctx, params)
      const expectedState = String(params.expectedState ?? 'busy')
      console.log('[ai-control] menu.connectAll 前置步骤: menu.drawer.open')
      await ensureMenuDrawerOpen(ctx.page, timeout)
      const button = ctx.page.getByTestId('ui-app-menu-connect-all').first()
      await expect(button).toBeVisible({ timeout })
      const currentState = await button.getAttribute('data-state').catch(() => null)
      if (currentState === expectedState) {
        if (expectedState === 'busy') {
          await expect(button).toHaveAttribute('aria-disabled', 'true', { timeout })
        }
        return
      }

      await clickByTestId(ctx.page, 'ui-app-menu-connect-all', timeout)
      await expect(button).toHaveAttribute('data-state', expectedState, { timeout })
      if (expectedState === 'busy') {
        await expect(button).toHaveAttribute('aria-disabled', 'true', { timeout })
      }
      console.log(`[ai-control] menu.connectAll 后置确认: data-state=${expectedState}`)
    },
  })

  registry.set('menu.openDisconnectAllConfirm', {
    async run(ctx, params) {
      await openDisconnectAllConfirm(ctx, params)
    },
  })

  registry.set('menu.disconnectAll', {
    description: '断开全部设备',
    async run(ctx, params) {
      const timeout = resolveTimeout(ctx, params)
      const opened = await openDisconnectAllConfirm(ctx, params)
      await disconnectAllDialogIfOpen(ctx.page, 'confirm', timeout, {
        allowMissing: allowMissingDisconnectAllDialog(params) && !opened,
      })
      console.log('[ai-control] menu.disconnectAll 后置确认: 断开全部确认弹窗已处理')
    },
  })

  registry.set('menu.confirmDialogConfirm', {
    async run(ctx, params) {
      await confirmDialogIfOpen(ctx.page, 'confirm', resolveTimeout(ctx, params))
    },
  })

  registry.set('menu.confirmDialogCancel', {
    async run(ctx, params) {
      await confirmDialogIfOpen(ctx.page, 'cancel', resolveTimeout(ctx, params))
    },
  })

  registry.set('menu.ensureGeneralSettingsClosed', {
    description: '若通用设置对话框已打开则关闭，便于后续 openGeneralSettings 从已知关闭态打开',
    async run(ctx, params) {
      const root = ctx.page.getByTestId('ui-view-settings-dialog-root').first()
      const state = await root.getAttribute('data-state').catch(() => null)
      if (state !== 'open') return
      for (let i = 0; i < 3; i += 1) {
        await ctx.page.keyboard.press('Escape')
        await sleep(300)
      }
      await root.waitFor({ state: 'hidden', timeout: 4000 }).catch(() => {})
      await sleep(200)
    },
  })

  registry.set('menu.openGeneralSettings', {
    description: '打开总设置对话框',
    async run(ctx, params) {
      await ensureMenuResultOpen(ctx, params, {
        menuTestId: 'ui-app-menu-general-settings',
        resultTestId: 'ui-view-settings-dialog-root',
        resultLabel: '通用设置对话框',
        resultState: 'open',
      })
    },
  })

  registry.set('menu.openPowerManager', {
    async run(ctx, params) {
      await ensureMenuResultOpen(ctx, params, {
        menuTestId: 'ui-app-menu-open-power-manager',
        resultTestId: 'ui-power-manager-root',
        resultLabel: '电源管理页面',
        resultState: 'open',
      })
    },
  })

  registry.set('menu.openDeviceAllocation', {
    async run(ctx, params) {
      await ensureMenuResultOpen(ctx, params, {
        menuTestId: 'ui-app-menu-device-allocation',
        resultTestId: 'dap-root',
        resultLabel: '设备分配面板',
        resultState: 'open',
      })
    },
  })

  registry.set('menu.openPolarAxisCalibration', {
    async run(ctx, params) {
      await ensureMenuResultOpen(ctx, params, {
        menuTestId: 'ui-app-menu-calibrate-polar-axis',
        resultTestId: 'pa-widget',
        resultLabel: '极轴校准页面',
      })
    },
  })

  registry.set('menu.openImageManager', {
    async run(ctx, params) {
      await ensureMenuResultOpen(ctx, params, {
        menuTestId: 'ui-app-menu-open-image-manager',
        resultTestId: 'imp-root',
        resultLabel: '图像管理页面',
        resultState: 'open',
      })
    },
  })

  registry.set('menu.openDebugLog', {
    async run(ctx, params) {
      await ensureMenuResultOpen(ctx, params, {
        menuTestId: 'ui-app-menu-open-debug-log',
        resultTestId: 'ui-indi-debug-dialog-root',
        resultLabel: '调试日志对话框',
        resultState: 'open',
      })
    },
  })

  registry.set('menu.openLocationDialog', {
    async run(ctx, params) {
      await ensureMenuResultOpen(ctx, params, {
        menuTestId: 'ui-app-menu-location',
        resultTestId: 'ui-location-dialog-root',
        resultLabel: '位置对话框',
        resultState: 'open',
      })
    },
  })

  registry.set('menu.openDataCredits', {
    async run(ctx, params) {
      await ensureMenuResultOpen(ctx, params, {
        menuTestId: 'ui-app-menu-data-credits',
        resultTestId: 'ui-data-credits-dialog-root',
        resultLabel: '数据版权对话框',
        resultState: 'open',
      })
    },
  })

  registry.set('menu.openRefreshConfirm', {
    async run(ctx, params) {
      await ensureMenuResultOpen(ctx, params, {
        menuTestId: 'ui-app-menu-refresh-page',
        resultTestId: CONFIRM_DIALOG_ROOT_TESTID,
        resultLabel: '刷新确认弹窗',
        resultState: 'open',
        resultAction: CONFIRM_ACTION.REFRESH,
      })
    },
  })

  return registry
}
