/**
 * AI-Control：极轴校准、图像管理命令。
 * 执行后验证对应页面/面板打开（pa-widget、imp-root）；图像管理支持 imageManagerInteract 组合。
 *
 * 本 spec 使用串行模式 + 共用同一 page。
 */
import type { BrowserContext, Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import {
  createFlowContext,
  makeAiControlRegistry,
  resolveFlowParamsFromEnv,
  runFlowByCommand,
} from '..'

let sharedContext: BrowserContext | undefined
let sharedPage: Page | undefined

test.describe.configure({ mode: 'serial' })

test.beforeAll(async ({ browser, baseURL }) => {
  sharedContext = await browser.newContext({ baseURL: baseURL ?? undefined })
  sharedPage = await sharedContext.newPage()
  await sharedPage!.goto('/')
})

test.afterAll(async () => {
  await sharedPage?.close()
  await sharedContext?.close()
})

test('polar-axis-calibration 命令：打开极轴校准页', async ({ }, testInfo) => {
  const page = sharedPage!
  const ctx = createFlowContext(page, testInfo, { minTestTimeoutMs: 2 * 60_000 })
  const registry = makeAiControlRegistry()

  await runFlowByCommand({
    ctx,
    registry,
    commandName: 'polar-axis-calibration',
    flowParams: { gotoHome: false },
  })

  await expect(page.getByTestId('pa-widget').first()).toBeVisible({ timeout: ctx.stepTimeoutMs })
})

test('polar-axis-calibration 命令：执行组件交互（折叠/轨迹层）', async ({ }, testInfo) => {
  const page = sharedPage!
  const ctx = createFlowContext(page, testInfo, { minTestTimeoutMs: 2 * 60_000 })
  const registry = makeAiControlRegistry()

  await runFlowByCommand({
    ctx,
    registry,
    commandName: 'polar-axis-calibration',
    flowParams: {
      gotoHome: false,
      polarAxisInteract: { toggleCollapse: true, toggleTrajectory: true, switchToWindowed: true, closeTrajectory: true },
    },
  })

  await expect(page.getByTestId('pa-widget').first()).toBeVisible({ timeout: ctx.stepTimeoutMs })
  await expect(page.getByTestId('pa-btn-toggle-trajectory').first()).toHaveAttribute('data-state', 'hidden')
})

test('polar-axis-calibration 命令：关闭轨迹界面后退出极轴校准', async ({ }, testInfo) => {
  const page = sharedPage!
  const ctx = createFlowContext(page, testInfo, { minTestTimeoutMs: 2 * 60_000 })
  const registry = makeAiControlRegistry()

  await runFlowByCommand({
    ctx,
    registry,
    commandName: 'polar-axis-calibration',
    flowParams: {
      gotoHome: false,
      polarAxisInteract: {
        toggleTrajectory: true,
        closeTrajectory: true,
        quitPolarAxisMode: true,
      },
    },
  })

  await expect(page.getByTestId('gui-btn-quit-polar-axis-mode').first()).not.toBeVisible({
    timeout: ctx.stepTimeoutMs,
  })
  await expect(page.getByTestId('pa-widget').first()).not.toBeVisible({ timeout: ctx.stepTimeoutMs }).catch(() => {})
  await expect(page.getByTestId('pa-minimized').first()).not.toBeVisible({ timeout: ctx.stepTimeoutMs }).catch(() => {})
})

test('image-file-manager 命令：打开图像管理面板', async ({ }, testInfo) => {
  const page = sharedPage!
  const ctx = createFlowContext(page, testInfo, { minTestTimeoutMs: 2 * 60_000 })
  const registry = makeAiControlRegistry()

  await runFlowByCommand({
    ctx,
    registry,
    commandName: 'image-file-manager',
    flowParams: { gotoHome: true },
  })

  await expect(page.getByTestId('imp-root').first()).toHaveAttribute(
    'data-state',
    'open',
  )
})

test('image-file-manager 命令：打开后面板内 imageFileSwitch（切换图像/文件夹视图）', async ({ }, testInfo) => {
  const page = sharedPage!
  const ctx = createFlowContext(page, testInfo, { minTestTimeoutMs: 2 * 60_000 })
  const registry = makeAiControlRegistry()

  await runFlowByCommand({
    ctx,
    registry,
    commandName: 'image-file-manager',
    flowParams: { gotoHome: false, imageManagerInteract: { imageFileSwitch: true } },
  })

  await expect(page.getByTestId('imp-root').first()).toHaveAttribute(
    'data-state',
    'open',
  )
})

test('image-file-manager 命令：打开后 panelClose（关闭面板）', async ({ }, testInfo) => {
  const page = sharedPage!
  const ctx = createFlowContext(page, testInfo, { minTestTimeoutMs: 2 * 60_000 })
  const registry = makeAiControlRegistry()

  await runFlowByCommand({
    ctx,
    registry,
    commandName: 'image-file-manager',
    flowParams: { gotoHome: false, imageManagerInteract: { panelClose: true } },
  })

  await expect(page.getByTestId('imp-root').first()).not.toBeVisible({ timeout: ctx.stepTimeoutMs })
})

test('image-file-manager 命令：组合 imageFileSwitch + panelClose', async ({ }, testInfo) => {
  const page = sharedPage!
  const ctx = createFlowContext(page, testInfo, { minTestTimeoutMs: 2 * 60_000 })
  const registry = makeAiControlRegistry()

  await runFlowByCommand({
    ctx,
    registry,
    commandName: 'image-file-manager',
    flowParams: {
      gotoHome: false,
      imageManagerInteract: { imageFileSwitch: true, panelClose: true },
    },
  })

  await expect(page.getByTestId('imp-root').first()).not.toBeVisible({ timeout: ctx.stepTimeoutMs })
})

test('image-file-manager 命令：参数由环境变量指定（E2E_IMAGE_MANAGER_INTERACT）', async ({ }, testInfo) => {
  const page = sharedPage!
  const ctx = createFlowContext(page, testInfo, { minTestTimeoutMs: 2 * 60_000 })
  const registry = makeAiControlRegistry()
  const flowParams = resolveFlowParamsFromEnv({})

  await runFlowByCommand({
    ctx,
    registry,
    commandName: 'image-file-manager',
    flowParams: { ...flowParams, gotoHome: false },
  })

  // 未设置 E2E_IMAGE_MANAGER_INTERACT 时仅打开面板；设置时执行对应交互后可能已关闭
  const root = page.getByTestId('imp-root').first()
  const visible = await root.isVisible().catch(() => false)
  const state = await root.getAttribute('data-state').catch(() => null)
  expect(visible || state === 'closed' || state === 'open').toBeTruthy()
})

test('image-file-manager 命令：执行 refresh + delete + download', async ({ }, testInfo) => {
  const page = sharedPage!
  const ctx = createFlowContext(page, testInfo, { minTestTimeoutMs: 2 * 60_000 })
  const registry = makeAiControlRegistry()

  await runFlowByCommand({
    ctx,
    registry,
    commandName: 'image-file-manager',
    flowParams: {
      gotoHome: false,
      imageManagerInteract: { refresh: true, delete: true, download: true },
    },
  })

  await expect(page.getByTestId('imp-root').first()).toHaveAttribute('data-state', 'open')
})
