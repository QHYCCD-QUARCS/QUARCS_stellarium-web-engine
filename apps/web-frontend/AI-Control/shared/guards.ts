import { expect } from '@playwright/test'
import type { FlowContext } from '../core/flowTypes'

export async function ensureForTestId(
  ctx: FlowContext,
  testId: string,
  mode: 'assertExists' | 'assertVisible' = 'assertExists',
) {
  const locator = ctx.page.getByTestId(testId)
  await expect(locator).toHaveCount(1, { timeout: Math.min(ctx.stepTimeoutMs, 5000) })
  if (mode === 'assertVisible') {
    await expect(locator.first()).toBeVisible({ timeout: Math.min(ctx.stepTimeoutMs, 5000) })
  }
}

export async function ensureRootState(ctx: FlowContext, testId: string, state: string, attr = 'data-state') {
  await expect(ctx.page.getByTestId(testId).first()).toHaveAttribute(attr, state, {
    timeout: ctx.stepTimeoutMs,
  })
}
