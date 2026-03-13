/**
 * Flow 前置条件 (prereq)
 *
 * 作用：
 * 提供基于 data-testid 的前置断言，用于流程开始前确认页面或控件已就绪。
 *
 * 执行过程：
 * - ensureForTestId(ctx, testId, mode)：在 ctx 的 page 上通过 getByTestId(testId) 断言存在（toHaveCount(1)）；
 *   若 mode 为 'assertVisible' 则再断言 first() 可见。超时取 stepTimeoutMs 与 5s 的较小值。
 *
 * 规范：禁止 force；仅做断言不触发点击，定位以全局唯一 data-testid 为准。
 * 参考：docs/testid-validation-report.md、docs/testid-scan-report.md。
 */
import { expect } from '@playwright/test'
import type { FlowContext } from './flowTypes'

export async function ensureForTestId(ctx: FlowContext, testId: string, mode: 'assertExists' | 'assertVisible' = 'assertExists') {
  const locator = ctx.page.getByTestId(testId)
  await expect(locator).toHaveCount(1, { timeout: Math.min(ctx.stepTimeoutMs, 5_000) })
  if (mode === 'assertVisible') {
    await expect(locator.first()).toBeVisible({ timeout: Math.min(ctx.stepTimeoutMs, 5_000) })
  }
  return true
}
