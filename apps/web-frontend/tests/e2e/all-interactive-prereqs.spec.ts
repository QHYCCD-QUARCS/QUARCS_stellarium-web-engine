import { test, expect } from '@playwright/test'
import { getAppStartPath } from './support/appStartPath'
import { buildInteractiveTestIdInventory } from './support/interactiveTestIds'
import { ensureForTestId } from './flows/prereq'
// 统一配置入口（默认超时）
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { DEFAULTS, envNumber } = require('../../e2e.config.cjs')

test('All interactive testIds: ensure prereqs (safe smoke)', async ({ page }, testInfo) => {
  const uiTimeoutMs = envNumber(process.env, 'E2E_UI_TIMEOUT_MS', DEFAULTS.flow.uiTimeoutMs)
  const stepTimeoutMs = envNumber(process.env, 'E2E_STEP_TIMEOUT_MS', DEFAULTS.flow.stepTimeoutMs)

  page.setDefaultTimeout(uiTimeoutMs)
  page.setDefaultNavigationTimeout(stepTimeoutMs)

  await page.goto(getAppStartPath(), { waitUntil: 'domcontentloaded', timeout: stepTimeoutMs })

  const inv = buildInteractiveTestIdInventory()
  const dangerous = new Set(inv.dangerous)

  // 可选：限制遍历数量（默认不限制）
  const limitRaw = process.env.E2E_INTERACTIVE_LIMIT
  const limit = limitRaw ? Number(limitRaw) : null
  const ids = Number.isFinite(limit as any) && (limit as any) > 0 ? inv.interactive.slice(0, limit as any) : inv.interactive

  for (const id of ids) {
    await test.step(`ensure: ${id}`, async () => {
      const ctx = { page, testInfo, uiTimeoutMs, stepTimeoutMs }
      const handled = await ensureForTestId(ctx, id, 'assertExists')

      // 危险控件：默认不 click，只验证“存在/可被定位”
      if (dangerous.has(id)) {
        testInfo.annotations.push({ type: 'dangerous-testid', description: id })
      }

      if (!handled) {
        testInfo.annotations.push({ type: 'prereq-unhandled', description: id })
        // 不强制失败：否则会把“未实现规则”的问题与“UI 本身缺失/重复”的问题混在一起
        return
      }

      // handled 的才强断言：至少存在 1 个（唯一性由 validate-testids 门禁保障）
      await expect(page.getByTestId(id)).toHaveCount(1, { timeout: Math.min(5_000, stepTimeoutMs) })
    })
  }
})

