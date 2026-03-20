import { expect, type Locator, type Page } from '@playwright/test'
import type { FlowContext, StepRegistry } from '../core/flowTypes'
import { clickByTestId, clickLocator, deviceProbeTestId, sleep } from '../shared/interaction'
import { ensureCaptureUiVisible, ensureMenuDrawerClosed } from '../shared/navigation'
import { openDeviceSubmenu } from '../menu/drawerSteps'
import { createStepError } from '../shared/errors'

export type CfwInteractParams = {
  capturePanelPlusCount?: number
  capturePanelMinusCount?: number
  menuNextCount?: number
  menuPrevCount?: number
}

async function ensureMainCameraConnected(ctx: FlowContext) {
  await expect(ctx.page.getByTestId(deviceProbeTestId('MainCamera')).first()).toHaveAttribute('data-state', 'connected', {
    timeout: Math.max(ctx.stepTimeoutMs, 30_000),
  })
}

async function ensureCfwConnected(ctx: FlowContext) {
  await expect(ctx.page.getByTestId(deviceProbeTestId('CFW')).first()).toHaveAttribute('data-state', 'connected', {
    timeout: Math.max(ctx.stepTimeoutMs, 10_000),
  })
}

async function waitCfwStable(page: Page, timeout: number) {
  await expect
    .poll(
      async () => (await page.getByTestId('cp-cfw-display').first().getAttribute('data-state').catch(() => null)) ?? 'unknown',
      { timeout: Math.max(timeout, 15_000) },
    )
    .toBe('stable')
}

async function clickVisibleByPrefix(page: Page, prefix: string, timeout: number) {
  const candidates = page.locator(`[data-testid^="${prefix}"]`)
  const count = await candidates.count()
  for (let i = 0; i < count; i += 1) {
    const candidate = candidates.nth(i)
    if (!(await candidate.isVisible().catch(() => false))) continue
    await clickLocator(candidate, timeout)
    return
  }
  throw createStepError('cfw.clickVisibleByPrefix', 'precondition', '未找到可见按钮', { prefix })
}

function resolveCount(value: unknown) {
  const count = Math.max(0, Math.floor(Number(value) || 0))
  return Number.isFinite(count) ? count : 0
}

function hasAnyInteract(params: CfwInteractParams | undefined) {
  if (!params || typeof params !== 'object') return false
  return (
    resolveCount(params.capturePanelPlusCount) > 0 ||
    resolveCount(params.capturePanelMinusCount) > 0 ||
    resolveCount(params.menuNextCount) > 0 ||
    resolveCount(params.menuPrevCount) > 0
  )
}

export function makeCfwControlStepRegistry(): StepRegistry {
  const registry: StepRegistry = new Map()

  registry.set('cfw.applyInteract', {
    async run(ctx, params: CfwInteractParams) {
      if (!hasAnyInteract(params)) return

      const nextCount = resolveCount(params.menuNextCount)
      const prevCount = resolveCount(params.menuPrevCount)
      if (nextCount > 0 || prevCount > 0) {
        await ensureCfwConnected(ctx)
        await openDeviceSubmenu(ctx, 'CFW')
        for (let i = 0; i < nextCount; i += 1) {
          await clickVisibleByPrefix(ctx.page, 'ui-config-CFW-CFWNext-button-', ctx.stepTimeoutMs)
          await sleep(400)
        }
        for (let i = 0; i < prevCount; i += 1) {
          await clickVisibleByPrefix(ctx.page, 'ui-config-CFW-CFWPrev-button-', ctx.stepTimeoutMs)
          await sleep(400)
        }
        await ensureMenuDrawerClosed(ctx.page, ctx.stepTimeoutMs)
      }

      const plusCount = resolveCount(params.capturePanelPlusCount)
      const minusCount = resolveCount(params.capturePanelMinusCount)
      if (plusCount > 0 || minusCount > 0) {
        await ensureMenuDrawerClosed(ctx.page, ctx.stepTimeoutMs)
        await ensureMainCameraConnected(ctx)
        await ensureCaptureUiVisible(ctx.page, ctx.stepTimeoutMs)
      }
      for (let i = 0; i < plusCount; i += 1) {
        await clickByTestId(ctx.page, 'cp-btn-cfw-plus', ctx.stepTimeoutMs)
        await waitCfwStable(ctx.page, ctx.stepTimeoutMs).catch(() => sleep(500))
      }
      for (let i = 0; i < minusCount; i += 1) {
        await clickByTestId(ctx.page, 'cp-btn-cfw-minus', ctx.stepTimeoutMs)
        await waitCfwStable(ctx.page, ctx.stepTimeoutMs).catch(() => sleep(500))
      }
    },
  })

  return registry
}
