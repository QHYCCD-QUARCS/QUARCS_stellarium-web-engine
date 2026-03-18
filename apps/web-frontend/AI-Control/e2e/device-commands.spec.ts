/**
 * AI-Control：赤道仪、电调、望远镜焦距命令。
 * 执行后验证对应面板/连接状态或焦距输入框可见。
 * mount-connect-control、focuser-connect-control 需真实设备才能完成连接；无设备时会在 waitConnected 超时。
 *
 * 本 spec 使用串行模式 + 共用同一 page。
 */
import type { BrowserContext, Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { createFlowContext, makeAiControlRegistry, runFlowByCommand } from '..'
import { deviceProbeTestId } from '../shared/interaction'

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

test('telescopes-focal-length 命令：打开 Telescopes 并设置焦距', async ({ }, testInfo) => {
  const page = sharedPage!
  const ctx = createFlowContext(page, testInfo, { minTestTimeoutMs: 2 * 60_000 })
  const registry = makeAiControlRegistry()

  await runFlowByCommand({
    ctx,
    registry,
    commandName: 'telescopes-focal-length',
    flowParams: { gotoHome: false, focalLengthMm: '510' },
  })

  const focalInput = page.getByTestId('ui-config-Telescopes-FocalLengthmm-number-0').first()
  await expect(focalInput).toBeVisible({ timeout: ctx.stepTimeoutMs })
  await expect(focalInput).toHaveValue('510')
})

test('mount-connect-control 命令：连接赤道仪（需真实设备，无设备时会在等待连接处超时）', async (
  { },
  testInfo,
) => {
  const page = sharedPage!
  const ctx = createFlowContext(page, testInfo, { minTestTimeoutMs: 90_000 })
  const registry = makeAiControlRegistry()

  await runFlowByCommand({
    ctx,
    registry,
    commandName: 'mount-connect-control',
    flowParams: { gotoHome: false, resetBeforeConnect: false },
  })

  await expect(page.getByTestId(deviceProbeTestId('Mount')).first()).toHaveAttribute(
    'data-state',
    'connected',
    { timeout: 10_000 },
  )
})

test('mount-connect-control 命令：带 mountControlInteract 连接并执行控制（需真实设备，无设备时在等待连接处超时）', async (
  { },
  testInfo,
) => {
  const page = sharedPage!
  const ctx = createFlowContext(page, testInfo, { minTestTimeoutMs: 90_000 })
  const registry = makeAiControlRegistry()

  await runFlowByCommand({
    ctx,
    registry,
    commandName: 'mount-connect-control',
    flowParams: {
      gotoHome: false,
      resetBeforeConnect: true,
      mountControlInteract: { solveCurrentPosition: true, gotoThenSolve: true },
    },
  })
  // resetBeforeConnect: true 确保在上一用例已连接 Mount 时先断开再连接，使「连接 → applyControl → 关闭抽屉」流程可执行

  await expect(page.getByTestId(deviceProbeTestId('Mount')).first()).toHaveAttribute(
    'data-state',
    'connected',
    { timeout: 10_000 },
  )
})

test('mount-connect-control 命令：连接后执行主面板 mcpInteract（需真实设备）', async ({}, testInfo) => {
  const page = sharedPage!
  const ctx = createFlowContext(page, testInfo, { minTestTimeoutMs: 90_000 })
  const registry = makeAiControlRegistry()

  await runFlowByCommand({
    ctx,
    registry,
    commandName: 'mount-connect-control',
    flowParams: {
      gotoHome: false,
      resetBeforeConnect: false,
      mcpInteract: { park: false, track: true, sync: true, solve: true },
    },
  })

  await expect(page.getByTestId('mcp-panel').first()).toBeVisible({ timeout: ctx.stepTimeoutMs })
})

test('mount-park 命令：连接赤道仪并确保 Park 为 on（需真实设备，参考 04-mount-park.spec.ts）', async (
  { },
  testInfo,
) => {
  const page = sharedPage!
  const ctx = createFlowContext(page, testInfo, { minTestTimeoutMs: 90_000 })
  const registry = makeAiControlRegistry()

  await runFlowByCommand({
    ctx,
    registry,
    commandName: 'mount-park',
    flowParams: { gotoHome: false, resetBeforeConnect: false },
  })

  await expect(page.getByTestId(deviceProbeTestId('Mount')).first()).toHaveAttribute(
    'data-state',
    'connected',
    { timeout: 10_000 },
  )
  await expect(page.getByTestId('mcp-btn-park').first()).toHaveAttribute('data-state', 'on', { timeout: 10_000 })
})

test('focuser-connect-control 命令：连接电调（需真实设备，无设备时会在等待连接处超时）', async (
  { },
  testInfo,
) => {
  const page = sharedPage!
  const ctx = createFlowContext(page, testInfo, { minTestTimeoutMs: 90_000 })
  const registry = makeAiControlRegistry()

  await runFlowByCommand({
    ctx,
    registry,
    commandName: 'focuser-connect-control',
    flowParams: { gotoHome: false, resetBeforeConnect: false },
  })

  await expect(page.getByTestId(deviceProbeTestId('Focuser')).first()).toHaveAttribute(
    'data-state',
    'connected',
    { timeout: 10_000 },
  )
})

test('focuser-connect-control 命令：连接后执行 focuserInteract（需真实设备）', async ({}, testInfo) => {
  const page = sharedPage!
  const ctx = createFlowContext(page, testInfo, { minTestTimeoutMs: 90_000 })
  const registry = makeAiControlRegistry()

  await runFlowByCommand({
    ctx,
    registry,
    commandName: 'focuser-connect-control',
    flowParams: {
      gotoHome: false,
      resetBeforeConnect: false,
      focuserInteract: {
        speed: 3,
        roiLength: 300,
        move: { direction: 'right', durationMs: 300 },
      },
    },
  })

  await expect(page.getByTestId('fp-root').first()).toBeVisible({ timeout: ctx.stepTimeoutMs })
  await expect(page.getByTestId('fp-state-current').first()).toContainText('Current')
})

test('mount-panel 命令：打开主面板并执行 mcpInteract', async ({}, testInfo) => {
  const page = sharedPage!
  const ctx = createFlowContext(page, testInfo, { minTestTimeoutMs: 2 * 60_000 })
  const registry = makeAiControlRegistry()

  await runFlowByCommand({
    ctx,
    registry,
    commandName: 'mount-panel',
    flowParams: { gotoHome: false, mcpInteract: { sync: true, solve: true } },
  })

  await expect(page.getByTestId('mcp-panel').first()).toBeVisible({ timeout: ctx.stepTimeoutMs })
})
