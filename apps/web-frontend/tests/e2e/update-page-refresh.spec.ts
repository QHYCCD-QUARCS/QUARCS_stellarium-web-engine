/**
 * 页面刷新测试
 * 刷新页面并等待加载完成
 *
 * 运行：
 *   cd apps/web-frontend
 *   npx playwright test tests/e2e/update-page-refresh.spec.ts --workers=1
 */

import { test } from '@playwright/test'

// 统一配置入口
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { DEFAULTS, envNumber } = require('../../e2e.config.cjs')

test('刷新页面', async ({ page }) => {
  const stepTimeoutMs = envNumber(process.env, 'E2E_STEP_TIMEOUT_MS', DEFAULTS.flow.stepTimeoutMs)
  page.setDefaultTimeout(stepTimeoutMs)
  page.setDefaultNavigationTimeout(stepTimeoutMs)

  // 刷新页面
  await page.reload({ waitUntil: 'networkidle' })
  console.log('页面已刷新')
  
  // 等待页面加载完成
  await page.waitForTimeout(2000)
})
