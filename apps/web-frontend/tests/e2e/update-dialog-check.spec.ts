/**
 * 更新弹窗检测测试
 * 检测更新确认对话框是否在30秒内出现
 *
 * 运行：
 *   cd apps/web-frontend
 *   npx playwright test tests/e2e/update-dialog-check.spec.ts --workers=1
 */

import { test, expect } from '@playwright/test'

// 统一配置入口
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { DEFAULTS, envNumber } = require('../../e2e.config.cjs')

test('检测更新确认对话框', async ({ page }) => {
  const uiTimeoutMs = envNumber(process.env, 'E2E_UI_TIMEOUT_MS', DEFAULTS.flow.uiTimeoutMs)
  const stepTimeoutMs = envNumber(process.env, 'E2E_STEP_TIMEOUT_MS', DEFAULTS.flow.stepTimeoutMs)
  page.setDefaultTimeout(uiTimeoutMs)
  page.setDefaultNavigationTimeout(stepTimeoutMs)

  // 设置较短的超时时间用于检测（30秒）
  const checkTimeoutMs = 30_000

  // 进入应用主页
  await page.goto('/')

  // 等待更新确认对话框出现（最多等待30秒）
  const dialogRoot = page.getByTestId('ui-confirm-dialog-root')
  
  try {
    // 等待对话框出现（data-state=open）
    await expect(dialogRoot).toHaveAttribute('data-state', 'open', {
      timeout: checkTimeoutMs,
    })
    
    // 对话框已出现，测试通过
    console.log('更新确认对话框已出现')
  } catch (error) {
    // 对话框未在30秒内出现，测试失败
    console.log('更新确认对话框未在30秒内出现')
    throw error
  }
})
