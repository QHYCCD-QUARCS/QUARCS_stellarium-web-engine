/**
 * 以 data-testid 为 id 的步骤别名注册表 (testIdAliasSteps)
 *
 * 作用：
 * 根据 TestIdIndex 中登记的 testid 动态生成步骤 id，格式为 tid.<testId>.<action>，
 * 使流程可直接通过 testid 引用点击、输入、选择、等待可见/隐藏/状态、断言等操作。
 *
 * 执行过程：
 * 遍历 index.testIds 的每个 testId，注册：
 * - tid.<testId>.click / tid.<testId>.clickEnsured：clickByTestId（内部含可见与点击检查）。
 * - tid.<testId>.typeEnsured：fillByTestId。
 * - tid.<testId>.selectVSelectItemTextEnsured：selectVSelectItemText。
 * - tid.<testId>.waitVisible / waitHidden / assertVisible / assertTextContains / waitState：对应等待或断言。
 * 所有操作均通过 helpers 实现，无 force；定位以传入的 testid（即 data-testid）为准。
 *
 * 规范：testid 须在源码中全局唯一；参考 testid-validation-report.md、testid-scan-report.md。
 */
import { expect } from '@playwright/test'
import type { TestIdIndex } from '../ai/testIdIndex'
import type { StepRegistry } from './flowTypes'
import { clickByTestId, fillByTestId, selectVSelectItemText, waitForTestIdState } from './helpers'

export function makeTestIdAliasRegistry(index: TestIdIndex): StepRegistry {
  const registry: StepRegistry = new Map()

  for (const testId of Object.keys(index.testIds ?? {})) {
    registry.set(`tid.${testId}.click`, {
      async run(ctx, params) {
        await clickByTestId(ctx.page, testId, params.timeoutMs ?? ctx.stepTimeoutMs)
      },
    })

    registry.set(`tid.${testId}.clickEnsured`, {
      async run(ctx, params) {
        await clickByTestId(ctx.page, testId, params.timeoutMs ?? ctx.stepTimeoutMs)
      },
    })

    registry.set(`tid.${testId}.typeEnsured`, {
      async run(ctx, params) {
        await fillByTestId(ctx.page, testId, String(params.text ?? ''), params.clear !== false, params.timeoutMs ?? ctx.stepTimeoutMs)
      },
    })

    registry.set(`tid.${testId}.selectVSelectItemTextEnsured`, {
      async run(ctx, params) {
        await selectVSelectItemText(ctx.page, testId, String(params.itemText), params.timeoutMs ?? ctx.stepTimeoutMs)
      },
    })

    registry.set(`tid.${testId}.waitVisible`, {
      async run(ctx, params) {
        await ctx.page.getByTestId(testId).first().waitFor({ state: 'visible', timeout: params.timeoutMs ?? ctx.stepTimeoutMs })
      },
    })

    registry.set(`tid.${testId}.waitHidden`, {
      async run(ctx, params) {
        await ctx.page.getByTestId(testId).first().waitFor({ state: 'hidden', timeout: params.timeoutMs ?? ctx.stepTimeoutMs })
      },
    })

    registry.set(`tid.${testId}.assertVisible`, {
      async run(ctx, params) {
        await ctx.page.getByTestId(testId).first().waitFor({ state: 'visible', timeout: params.timeoutMs ?? ctx.stepTimeoutMs })
      },
    })

    registry.set(`tid.${testId}.assertTextContains`, {
      async run(ctx, params) {
        await expect(ctx.page.getByTestId(testId).first()).toContainText(String(params.text), {
          timeout: params.timeoutMs ?? ctx.stepTimeoutMs,
        })
      },
    })

    registry.set(`tid.${testId}.waitState`, {
      async run(ctx, params) {
        await waitForTestIdState(ctx.page, testId, String(params.state), params.timeoutMs ?? ctx.stepTimeoutMs)
      },
    })
  }

  return registry
}
