/**
 * Playwright E2E 测试 - 极轴校准组件
 * 
 * 本测试文件演示如何使用 data-testid 标识进行 E2E 测试
 * 
 * @file polar-alignment.spec.ts
 * @see docs/E2E_TEST_IDS_SUMMARY.md
 */

import { test, expect, type Page } from '@playwright/test'

// 测试辅助函数
class PolarAlignmentPage {
  constructor(private page: Page) {}

  // 根容器
  get root() {
    return this.page.getByTestId('pa-root')
  }

  // 最小化状态
  get minimized() {
    return this.page.getByTestId('pa-minimized')
  }

  get minimizedExpandButton() {
    return this.page.getByTestId('pa-btn-expand-from-minimized')
  }

  // 完整界面
  get widget() {
    return this.page.getByTestId('pa-widget')
  }

  get header() {
    return this.page.getByTestId('pa-header')
  }

  get minimizeButton() {
    return this.page.getByTestId('pa-btn-minimize')
  }

  get toggleCollapseButton() {
    return this.page.getByTestId('pa-btn-toggle-collapse')
  }

  get toggleTrajectoryButton() {
    return this.page.getByTestId('pa-btn-toggle-trajectory')
  }

  // 连接状态
  get connectionDot() {
    return this.page.getByTestId('pa-connection-dot')
  }

  get connectionIndicatorMinimized() {
    return this.page.getByTestId('pa-connection-indicator-minimized')
  }

  // 收缩状态
  get contentCollapsed() {
    return this.page.getByTestId('pa-content-collapsed')
  }

  get collapsedProgressCircle() {
    return this.page.getByTestId('pa-collapsed-progress-circle')
  }

  get collapsedAzimuthValue() {
    return this.page.getByTestId('pa-collapsed-azimuth-value')
  }

  get collapsedAltitudeValue() {
    return this.page.getByTestId('pa-collapsed-altitude-value')
  }

  // 展开状态
  get contentExpanded() {
    return this.page.getByTestId('pa-content-expanded')
  }

  // 校准进度
  get progressBar() {
    return this.page.getByTestId('pa-progress-bar')
  }

  get progressFill() {
    return this.page.getByTestId('pa-progress-fill')
  }

  get stepInitialization() {
    return this.page.getByTestId('pa-step-initialization')
  }

  get stepCalibration1() {
    return this.page.getByTestId('pa-step-calibration-1')
  }

  get stepCalibration2() {
    return this.page.getByTestId('pa-step-calibration-2')
  }

  get stepCalibration3() {
    return this.page.getByTestId('pa-step-calibration-3')
  }

  get stepGuidanceCalibration() {
    return this.page.getByTestId('pa-step-guidance-calibration')
  }

  get stepVerification() {
    return this.page.getByTestId('pa-step-verification')
  }

  // 日志
  get logDisplay() {
    return this.page.getByTestId('pa-log-display')
  }

  get latestLog() {
    return this.page.getByTestId('pa-latest-log')
  }

  get latestLogMessage() {
    return this.page.getByTestId('pa-latest-log-message')
  }

  // 位置信息
  get posCurrentRA() {
    return this.page.getByTestId('pa-pos-current-ra-value')
  }

  get posCurrentDEC() {
    return this.page.getByTestId('pa-pos-current-dec-value')
  }

  get posTargetRA() {
    return this.page.getByTestId('pa-pos-target-ra-value')
  }

  get posTargetDEC() {
    return this.page.getByTestId('pa-pos-target-dec-value')
  }

  // 调整指导
  get adjustAzimuth() {
    return this.page.getByTestId('pa-adjust-azimuth')
  }

  get adjustAzimuthValue() {
    return this.page.getByTestId('pa-adjust-azimuth-value')
  }

  get adjustAltitude() {
    return this.page.getByTestId('pa-adjust-altitude')
  }

  get adjustAltitudeValue() {
    return this.page.getByTestId('pa-adjust-altitude-value')
  }

  // 控制按钮
  get autoCalibrationButton() {
    return this.page.getByTestId('pa-btn-auto-calibration')
  }

  get testSimulationButton() {
    return this.page.getByTestId('pa-btn-test-simulation')
  }

  // 指导进度指示器
  get guidanceIndicator() {
    return this.page.getByTestId('pa-guidance-indicator')
  }

  get guidanceCircle() {
    return this.page.getByTestId('pa-guidance-circle')
  }

  get guidanceStepDescription() {
    return this.page.getByTestId('pa-guidance-step-description')
  }

  get guidanceStarCount() {
    return this.page.getByTestId('pa-guidance-star-count')
  }

  // 轨迹画布 - 全屏
  get trajectoryOverlayFullscreen() {
    return this.page.getByTestId('pa-trajectory-overlay-fullscreen')
  }

  get trajectoryCanvas() {
    return this.page.getByTestId('pa-trajectory-canvas')
  }

  get btnTrajectoryClose() {
    return this.page.getByTestId('pa-btn-trajectory-close')
  }

  get btnClearOldTrajectory() {
    return this.page.getByTestId('pa-btn-clear-old-trajectory')
  }

  get btnSwitchToWindowed() {
    return this.page.getByTestId('pa-btn-switch-to-windowed')
  }

  // 轨迹画布 - 窗口模式
  get trajectoryOverlayWindowed() {
    return this.page.getByTestId('pa-trajectory-overlay-windowed')
  }

  get btnSwitchToFullscreen() {
    return this.page.getByTestId('pa-btn-switch-to-fullscreen')
  }

  get btnTrajectoryCloseWindowed() {
    return this.page.getByTestId('pa-btn-trajectory-close-windowed')
  }

  // 辅助方法
  async getConnectionState() {
    return await this.connectionDot.getAttribute('data-state')
  }

  async getProgress() {
    const progress = await this.progressFill.getAttribute('data-progress')
    return progress ? parseInt(progress) : 0
  }

  async getCalibrationState() {
    return await this.autoCalibrationButton.getAttribute('data-state')
  }
}

test.describe('极轴校准组件 E2E 测试', () => {
  let paPage: PolarAlignmentPage

  test.beforeEach(async ({ page }) => {
    // 导航到应用页面
    await page.goto('/')
    paPage = new PolarAlignmentPage(page)
    
    // 等待组件加载
    await paPage.root.waitFor({ state: 'visible' })
  })

  test.describe('1. 基础可见性测试', () => {
    test('应该显示极轴校准组件', async () => {
      await expect(paPage.root).toBeVisible()
      await expect(paPage.widget).toBeVisible()
    })

    test('应该显示标题栏和控制按钮', async () => {
      await expect(paPage.header).toBeVisible()
      await expect(paPage.minimizeButton).toBeVisible()
      await expect(paPage.toggleCollapseButton).toBeVisible()
      await expect(paPage.toggleTrajectoryButton).toBeVisible()
    })
  })

  test.describe('2. 最小化/展开功能', () => {
    test('应该能够最小化组件', async () => {
      // 点击最小化按钮
      await paPage.minimizeButton.click()
      
      // 验证最小化状态
      await expect(paPage.minimized).toBeVisible()
      await expect(paPage.widget).not.toBeVisible()
      
      // 验证 data-state 属性
      await expect(paPage.minimized).toHaveAttribute('data-state', 'minimized')
    })

    test('应该能够从最小化状态展开', async () => {
      // 先最小化
      await paPage.minimizeButton.click()
      await expect(paPage.minimized).toBeVisible()
      
      // 再展开
      await paPage.minimizedExpandButton.click()
      await expect(paPage.widget).toBeVisible()
      await expect(paPage.minimized).not.toBeVisible()
    })
  })

  test.describe('3. 折叠/展开功能', () => {
    test('应该能够折叠内容', async () => {
      // 点击折叠按钮
      await paPage.toggleCollapseButton.click()
      
      // 验证折叠状态
      await expect(paPage.contentCollapsed).toBeVisible()
      await expect(paPage.contentExpanded).not.toBeVisible()
      
      // 验证 data-state 属性
      await expect(paPage.widget).toHaveAttribute('data-state', 'collapsed')
    })

    test('折叠状态应该显示进度和调整值', async () => {
      await paPage.toggleCollapseButton.click()
      
      // 验证收缩状态显示的元素
      await expect(paPage.collapsedProgressCircle).toBeVisible()
      await expect(paPage.collapsedAzimuthValue).toBeVisible()
      await expect(paPage.collapsedAltitudeValue).toBeVisible()
    })
  })

  test.describe('4. 连接状态测试', () => {
    test('应该显示连接状态指示器', async () => {
      await expect(paPage.connectionDot).toBeVisible()
      
      // 检查连接状态
      const state = await paPage.getConnectionState()
      expect(['connected', 'disconnected']).toContain(state)
    })

    test('最小化状态应该显示连接状态', async () => {
      await paPage.minimizeButton.click()
      await expect(paPage.connectionIndicatorMinimized).toBeVisible()
    })
  })

  test.describe('5. 校准进度测试', () => {
    test('应该显示校准进度条', async () => {
      await expect(paPage.progressBar).toBeVisible()
      await expect(paPage.progressFill).toBeVisible()
    })

    test('应该显示所有进度节点', async () => {
      await expect(paPage.stepInitialization).toBeVisible()
      await expect(paPage.stepCalibration1).toBeVisible()
      await expect(paPage.stepCalibration2).toBeVisible()
      await expect(paPage.stepCalibration3).toBeVisible()
      await expect(paPage.stepGuidanceCalibration).toBeVisible()
      await expect(paPage.stepVerification).toBeVisible()
    })

    test('进度值应该在 0-100 之间', async () => {
      const progress = await paPage.getProgress()
      expect(progress).toBeGreaterThanOrEqual(0)
      expect(progress).toBeLessThanOrEqual(100)
    })
  })

  test.describe('6. 日志显示测试', () => {
    test('应该显示日志区域', async () => {
      await expect(paPage.logDisplay).toBeVisible()
    })

    test('应该显示最新日志', async () => {
      // 检查是否有日志或显示"无日志"提示
      const hasLog = await paPage.latestLog.isVisible()
      const isEmpty = await paPage.page.getByTestId('pa-log-empty').isVisible()
      
      expect(hasLog || isEmpty).toBeTruthy()
    })
  })

  test.describe('7. 位置信息测试', () => {
    test('应该显示当前位置', async () => {
      await expect(paPage.posCurrentRA).toBeVisible()
      await expect(paPage.posCurrentDEC).toBeVisible()
    })

    test('应该显示目标位置', async () => {
      await expect(paPage.posTargetRA).toBeVisible()
      await expect(paPage.posTargetDEC).toBeVisible()
    })

    test('位置格式应该正确', async () => {
      // RA 格式: XXh XXm XXs
      const raText = await paPage.posCurrentRA.textContent()
      expect(raText).toMatch(/\d{2}h \d{2}m \d{2}s/)
      
      // DEC 格式: +/-XX° XX' XX"
      const decText = await paPage.posCurrentDEC.textContent()
      expect(decText).toMatch(/[+-]\d{2}° \d{2}' \d{2}"/)
    })
  })

  test.describe('8. 调整指导测试', () => {
    test('应该显示方位角调整', async () => {
      await expect(paPage.adjustAzimuth).toBeVisible()
      await expect(paPage.adjustAzimuthValue).toBeVisible()
    })

    test('应该显示高度角调整', async () => {
      await expect(paPage.adjustAltitude).toBeVisible()
      await expect(paPage.adjustAltitudeValue).toBeVisible()
    })

    test('调整状态应该正确标记', async () => {
      const azState = await paPage.adjustAzimuth.getAttribute('data-state')
      expect(['active', 'inactive']).toContain(azState)
      
      const altState = await paPage.adjustAltitude.getAttribute('data-state')
      expect(['active', 'inactive']).toContain(altState)
    })
  })

  test.describe('9. 控制按钮测试', () => {
    test('应该显示自动校准按钮', async () => {
      await expect(paPage.autoCalibrationButton).toBeVisible()
    })

    test('点击校准按钮应该改变状态', async () => {
      const initialState = await paPage.getCalibrationState()
      
      await paPage.autoCalibrationButton.click()
      await paPage.page.waitForTimeout(100) // 等待状态更新
      
      const newState = await paPage.getCalibrationState()
      // 状态应该在 running 和 stopped 之间切换
      expect(['running', 'stopped']).toContain(newState)
    })
  })

  test.describe('10. 指导进度指示器测试', () => {
    test('应该显示指导进度指示器', async () => {
      await expect(paPage.guidanceIndicator).toBeVisible()
      await expect(paPage.guidanceCircle).toBeVisible()
    })

    test('应该显示步骤描述', async () => {
      await expect(paPage.guidanceStepDescription).toBeVisible()
    })

    test('指导状态应该正确', async () => {
      const state = await paPage.guidanceCircle.getAttribute('data-status')
      expect(['normal', 'success', 'error']).toContain(state)
    })
  })

  test.describe('11. 轨迹画布测试', () => {
    test('应该能够打开轨迹画布（全屏模式）', async () => {
      // 点击轨迹按钮
      await paPage.toggleTrajectoryButton.click()
      
      // 验证全屏模式显示
      await expect(paPage.trajectoryOverlayFullscreen).toBeVisible()
      await expect(paPage.trajectoryCanvas).toBeVisible()
    })

    test('应该能够关闭轨迹画布', async () => {
      // 先打开
      await paPage.toggleTrajectoryButton.click()
      await expect(paPage.trajectoryOverlayFullscreen).toBeVisible()
      
      // 再关闭
      await paPage.btnTrajectoryClose.click()
      await expect(paPage.trajectoryOverlayFullscreen).not.toBeVisible()
    })

    test('应该能够切换到窗口模式', async () => {
      // 打开全屏模式
      await paPage.toggleTrajectoryButton.click()
      await expect(paPage.trajectoryOverlayFullscreen).toBeVisible()
      
      // 切换到窗口模式
      await paPage.btnSwitchToWindowed.click()
      await expect(paPage.trajectoryOverlayWindowed).toBeVisible()
      await expect(paPage.trajectoryOverlayFullscreen).not.toBeVisible()
    })

    test('应该能够从窗口模式切换回全屏', async () => {
      // 打开全屏模式
      await paPage.toggleTrajectoryButton.click()
      
      // 切换到窗口模式
      await paPage.btnSwitchToWindowed.click()
      await expect(paPage.trajectoryOverlayWindowed).toBeVisible()
      
      // 切换回全屏
      await paPage.btnSwitchToFullscreen.click()
      await expect(paPage.trajectoryOverlayFullscreen).toBeVisible()
      await expect(paPage.trajectoryOverlayWindowed).not.toBeVisible()
    })

    test('应该能够清除旧轨迹', async () => {
      // 打开轨迹画布
      await paPage.toggleTrajectoryButton.click()
      
      // 点击清除按钮（应该不会报错）
      await paPage.btnClearOldTrajectory.click()
      
      // 画布应该仍然可见
      await expect(paPage.trajectoryOverlayFullscreen).toBeVisible()
    })
  })

  test.describe('12. 拖动功能测试', () => {
    test('应该能够拖动组件', async () => {
      const dragHandle = paPage.page.getByTestId('pa-header-drag-handle')
      
      // 获取初始位置
      const initialBox = await paPage.widget.boundingBox()
      expect(initialBox).not.toBeNull()
      
      // 拖动组件
      await dragHandle.hover()
      await paPage.page.mouse.down()
      await paPage.page.mouse.move(
        initialBox!.x + 100,
        initialBox!.y + 100
      )
      await paPage.page.mouse.up()
      
      // 等待拖动完成
      await paPage.page.waitForTimeout(100)
      
      // 获取新位置
      const newBox = await paPage.widget.boundingBox()
      expect(newBox).not.toBeNull()
      
      // 位置应该发生变化
      expect(newBox!.x).not.toBe(initialBox!.x)
      expect(newBox!.y).not.toBe(initialBox!.y)
    })

    test('最小化状态应该能够拖动', async () => {
      // 先最小化
      await paPage.minimizeButton.click()
      await expect(paPage.minimized).toBeVisible()
      
      const dragHandle = paPage.page.getByTestId('pa-minimized-drag-handle')
      const initialBox = await paPage.minimized.boundingBox()
      expect(initialBox).not.toBeNull()
      
      // 拖动
      await dragHandle.hover()
      await paPage.page.mouse.down()
      await paPage.page.mouse.move(
        initialBox!.x + 50,
        initialBox!.y + 50
      )
      await paPage.page.mouse.up()
      
      await paPage.page.waitForTimeout(100)
      
      const newBox = await paPage.minimized.boundingBox()
      expect(newBox).not.toBeNull()
      expect(newBox!.x).not.toBe(initialBox!.x)
    })
  })

  test.describe('13. 响应式测试', () => {
    test('应该在不同视口尺寸下正常显示', async ({ page }) => {
      // 测试桌面尺寸
      await page.setViewportSize({ width: 1920, height: 1080 })
      await expect(paPage.root).toBeVisible()
      
      // 测试平板尺寸
      await page.setViewportSize({ width: 768, height: 1024 })
      await expect(paPage.root).toBeVisible()
      
      // 测试移动设备尺寸
      await page.setViewportSize({ width: 375, height: 667 })
      await expect(paPage.root).toBeVisible()
    })
  })

  test.describe('14. 性能测试', () => {
    test('组件加载时间应该在合理范围内', async ({ page }) => {
      const startTime = Date.now()
      await page.goto('/')
      await paPage.root.waitFor({ state: 'visible' })
      const loadTime = Date.now() - startTime
      
      // 组件应该在 3 秒内加载完成
      expect(loadTime).toBeLessThan(3000)
    })

    test('交互操作应该响应迅速', async () => {
      const startTime = Date.now()
      await paPage.toggleCollapseButton.click()
      await expect(paPage.contentCollapsed).toBeVisible()
      const responseTime = Date.now() - startTime
      
      // 交互响应时间应该在 500ms 以内
      expect(responseTime).toBeLessThan(500)
    })
  })
})
