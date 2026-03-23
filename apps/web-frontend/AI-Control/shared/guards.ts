/**
 * AI-Control 前置/守卫检查。
 *
 * 提供基于 data-testid 的存在性与可见性断言、以及基于 data-state 等属性的状态校验，
 * 用于步骤执行前的“前置检查”与“后置确认”，符合 README 中“先判断前置要求”的规则。
 */
import { expect } from '@playwright/test'
import type { FlowContext } from '../core/flowTypes'

/** 断言指定 testId 的元素存在（且可选为可见），超时使用 stepTimeoutMs 与 5s 的较小值 */
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

/** 断言指定 testId 的元素具有给定属性值（默认 data-state），用于后置状态确认 */
export async function ensureRootState(ctx: FlowContext, testId: string, state: string, attr = 'data-state') {
  await expect(ctx.page.getByTestId(testId).first()).toHaveAttribute(attr, state, {
    timeout: ctx.stepTimeoutMs,
  })
}
