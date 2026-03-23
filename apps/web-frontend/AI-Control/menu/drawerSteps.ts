/**
 * AI-Control 菜单抽屉与设备子菜单步骤注册表。
 *
 * 设计目的：
 * - 统一管理主菜单抽屉与设备二级抽屉的开关动作，避免业务步骤各自重复处理抽屉状态。
 * - 把“打开主菜单”“关闭主菜单”“进入某个设备子菜单”拆成可复用前置步骤，供连接、分配、拍摄等流程复用。
 * - 保证设备页进入链路符合 README 规则：必须先打开主菜单，再点击真实设备菜单项，最后确认二级抽屉与目标页面都已进入可操作状态。
 *
 * 当前职责：
 * - `menu.drawer.open`：确保主菜单抽屉进入 `data-state=open`（点击工具栏 `tb-act-toggle-navigation-drawer`）。
 * - `menu.drawer.close`：确保主菜单抽屉进入 `data-state=closed`；主菜单打开时优先点击遮罩上的
 *   `tb-act-toggle-navigation-drawer-overlay`（浮在 overlay 之上、与顶部工具栏菜单图标同位置），否则回退到 Escape 或工具栏按钮。
 * - `menu.device.open`：通过 `ui-app-menu-device-*` 真实点击进入设备子菜单，并确认目标菜单项被选中、二级抽屉已打开、设备页已就绪。
 *
 * 约束说明：
 * - 禁止跳过主菜单直接操作二级区域。
 * - 禁止使用 `force`；所有点击前都通过共享交互原语做可见性/可操作性检查。
 */
import { expect } from '@playwright/test'
import type { FlowContext, StepRegistry } from '../core/flowTypes'
import { clickLocator, deviceMenuTestId, sleep } from '../shared/interaction'
import { ensureMenuDrawerClosed, ensureMenuDrawerOpen } from '../shared/navigation'

const SUBMENU_OPEN_MAX_ATTEMPTS = 3
/** 主菜单再次打开后等待抽屉稳定、可点击再操作，避免动画未结束或 DOM 未就绪导致点击无效 */
const AFTER_MAIN_MENU_OPEN_DELAY_MS = 600

async function openDeviceSubmenu(ctx: FlowContext, deviceType: string) {
  const page = ctx.page
  const submenuDrawer = page.getByTestId('ui-app-submenu-drawer').first()
  const submenuPage = page.getByTestId('ui-app-submenu-device-page').first()
  /** 限定在主菜单抽屉内查找设备项，避免点到其它层或误触 overlay */
  const menuDrawer = page.getByTestId('ui-app-menu-drawer').first()
  const deviceMenuItem = menuDrawer.getByTestId(deviceMenuTestId(deviceType)).first()

  let lastError: unknown = null
  for (let attempt = 1; attempt <= SUBMENU_OPEN_MAX_ATTEMPTS; attempt += 1) {
    try {
      if (attempt > 1) {
        console.log(`[ai-control] 打开子菜单 第 ${attempt}/${SUBMENU_OPEN_MAX_ATTEMPTS} 次尝试`)
      }
      await ensureMenuDrawerOpen(page, ctx.stepTimeoutMs)
      await sleep(AFTER_MAIN_MENU_OPEN_DELAY_MS)
      await expect(deviceMenuItem).toBeVisible({ timeout: ctx.stepTimeoutMs })

      const alreadyOpen = (await submenuPage.getAttribute('data-state').catch(() => null)) === 'open'
      const alreadySelected = (await deviceMenuItem.getAttribute('data-selected').catch(() => null)) === 'true'

      if (!alreadyOpen || !alreadySelected) {
        if (attempt > 1) await sleep(400)
        await deviceMenuItem.scrollIntoViewIfNeeded().catch(() => {})
        await sleep(200)
        console.log(`[ai-control] 点击设备项 testId=${deviceMenuTestId(deviceType)}`)
        await clickLocator(deviceMenuItem, ctx.stepTimeoutMs)
        await sleep(500)
      }

      await expect(deviceMenuItem).toHaveAttribute('data-selected', 'true', { timeout: ctx.stepTimeoutMs })
      await expect(submenuDrawer).toHaveAttribute('data-state', 'open', { timeout: ctx.stepTimeoutMs })
      await expect(submenuPage).toHaveAttribute('data-state', 'open', { timeout: ctx.stepTimeoutMs })
      return
    } catch (e) {
      lastError = e
      if (attempt < SUBMENU_OPEN_MAX_ATTEMPTS) {
        console.log(`[ai-control] 打开子菜单未就绪，第 ${attempt}/${SUBMENU_OPEN_MAX_ATTEMPTS} 次失败，重试…`)
      }
    }
  }
  throw lastError
}

export function makeDrawerStepRegistry(): StepRegistry {
  const registry: StepRegistry = new Map()

  registry.set('menu.drawer.open', {
    async run(ctx, params) {
      console.log('[ai-control] menu.drawer.open 前置检查: 主菜单抽屉是否已打开')
      await ensureMenuDrawerOpen(ctx.page, params.timeoutMs ?? ctx.stepTimeoutMs)
      console.log('[ai-control] menu.drawer.open 后置确认: ui-app-menu-drawer=data-state=open')
    },
  })

  registry.set('menu.drawer.close', {
    async run(ctx, params) {
      console.log('[ai-control] menu.drawer.close 前置检查: 主菜单抽屉是否已关闭')
      await ensureMenuDrawerClosed(ctx.page, params.timeoutMs ?? ctx.stepTimeoutMs)
      console.log('[ai-control] menu.drawer.close 后置确认: ui-app-menu-drawer=data-state=closed')
    },
  })

  registry.set('menu.device.open', {
    async run(ctx, params) {
      const deviceType = String(params.deviceType ?? params.driverType ?? 'MainCamera')
      console.log(`[ai-control] menu.device.open 前置步骤: menu.drawer.open, target=${deviceType}`)
      await openDeviceSubmenu(ctx, deviceType)
      console.log('[ai-control] menu.device.open 后置确认: 设备菜单已选中且子菜单已打开')
    },
  })

  return registry
}

export { openDeviceSubmenu }
