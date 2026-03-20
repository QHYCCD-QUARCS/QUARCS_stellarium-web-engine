/**
 * AI-Control：导星镜、主相机连接并拍摄，以及滤镜轮拍摄配置命令。
 * 执行后验证对应设备连接状态或拍摄面板/CFW 控件可见。
 * guider-connect-capture、maincamera-connect-capture、cfw-capture-config 需真实设备才能完成连接与控制；无设备时会在 waitConnected 或后续控制步骤超时。
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

test('guider-connect-capture 命令：导星镜连接并打开导星控制面板（需真实设备，无设备时会在等待连接处超时）', async (
  {},
  testInfo,
) => {
  const page = sharedPage!
  const ctx = createFlowContext(page, testInfo, { minTestTimeoutMs: 90_000 })
  const registry = makeAiControlRegistry()

  await runFlowByCommand({
    ctx,
    registry,
    commandName: 'guider-connect-capture',
    flowParams: { gotoHome: false, resetBeforeConnect: false, doSave: false },
  })

  await expect(page.getByTestId(deviceProbeTestId('Guider')).first()).toHaveAttribute(
    'data-state',
    'connected',
    { timeout: 10_000 },
  )
  await expect(page.getByTestId('ui-chart-component-root').first()).toBeVisible({ timeout: 10_000 })
})

test('guider-connect-capture 命令：带导星菜单/导星面板参数（需真实设备）', async ({}, testInfo) => {
  const page = sharedPage!
  const ctx = createFlowContext(page, testInfo, { minTestTimeoutMs: 90_000 })
  const registry = makeAiControlRegistry()

  await runFlowByCommand({
    ctx,
    registry,
    commandName: 'guider-connect-capture',
    flowParams: {
      gotoHome: false,
      resetBeforeConnect: false,
      guiderGain: 10,
      guiderOffset: 0,
      guiderMultiStar: true,
      guiderRaDirection: 'AUTO',
      guiderDecDirection: 'AUTO',
      guiderExposure: '1s',
      guiderInteract: {
        loopExposure: true,
        dataClear: true,
      },
    },
  })

  await expect(page.getByTestId(deviceProbeTestId('Guider')).first()).toHaveAttribute('data-state', 'connected', {
    timeout: 10_000,
  })
  await expect(page.getByTestId('ui-chart-component-root').first()).toBeVisible({ timeout: 10_000 })
})

test('maincamera-connect-capture 命令：主相机连接并拍摄（需真实设备，无设备时会在等待连接处超时）', async (
  {},
  testInfo,
) => {
  const page = sharedPage!
  const ctx = createFlowContext(page, testInfo, { minTestTimeoutMs: 90_000 })
  const registry = makeAiControlRegistry()

  await runFlowByCommand({
    ctx,
    registry,
    commandName: 'maincamera-connect-capture',
    flowParams: { gotoHome: false, resetBeforeConnect: false, doSave: false },
  })

  await expect(page.getByTestId(deviceProbeTestId('MainCamera')).first()).toHaveAttribute(
    'data-state',
    'connected',
    { timeout: 10_000 },
  )
})

test('maincamera-connect-capture 命令：带拍摄参数（captureGain/captureOffset）', async (
  {},
  testInfo,
) => {
  const page = sharedPage!
  const ctx = createFlowContext(page, testInfo, { minTestTimeoutMs: 90_000 })
  const registry = makeAiControlRegistry()

  await runFlowByCommand({
    ctx,
    registry,
    commandName: 'maincamera-connect-capture',
    flowParams: {
      gotoHome: false,
      resetBeforeConnect: false,
      doSave: false,
      captureGain: 10,
      captureOffset: 0,
    },
  })

  await expect(page.getByTestId(deviceProbeTestId('MainCamera')).first()).toHaveAttribute(
    'data-state',
    'connected',
    { timeout: 10_000 },
  )
})

test('maincamera-connect-capture 命令：带曝光/CFA/自动保存/多次拍摄参数', async ({}, testInfo) => {
  const page = sharedPage!
  const ctx = createFlowContext(page, testInfo, { minTestTimeoutMs: 90_000 })
  const registry = makeAiControlRegistry()

  await runFlowByCommand({
    ctx,
    registry,
    commandName: 'maincamera-connect-capture',
    flowParams: {
      gotoHome: false,
      resetBeforeConnect: false,
      doSave: false,
      captureExposure: '1s',
      captureCfaMode: 'RGGB',
      captureAutoSave: true,
      captureCount: 2,
    },
  })

  await expect(page.getByTestId(deviceProbeTestId('MainCamera')).first()).toHaveAttribute('data-state', 'connected', {
    timeout: 10_000,
  })
})

test('cfw-capture-config 命令：主相机连接并执行 CFW 加/减（需真实设备，无设备时会在等待连接处超时）', async (
  {},
  testInfo,
) => {
  const page = sharedPage!
  const ctx = createFlowContext(page, testInfo, { minTestTimeoutMs: 90_000 })
  const registry = makeAiControlRegistry()

  await runFlowByCommand({
    ctx,
    registry,
    commandName: 'cfw-capture-config',
    flowParams: { gotoHome: false, resetBeforeConnect: false },
  })

  await expect(page.getByTestId(deviceProbeTestId('MainCamera')).first()).toHaveAttribute(
    'data-state',
    'connected',
    { timeout: 10_000 },
  )
  await expect(page.getByTestId('cp-btn-cfw-plus').first()).toBeVisible({ timeout: ctx.stepTimeoutMs })
  await expect(page.getByTestId('cp-btn-cfw-minus').first()).toBeVisible({ timeout: ctx.stepTimeoutMs })
})

test('cfw-capture-config 命令：执行拍摄面板与菜单级 CFW 交互（需真实设备）', async ({}, testInfo) => {
  const page = sharedPage!
  const ctx = createFlowContext(page, testInfo, { minTestTimeoutMs: 90_000 })
  const registry = makeAiControlRegistry()

  await runFlowByCommand({
    ctx,
    registry,
    commandName: 'cfw-capture-config',
    flowParams: {
      gotoHome: false,
      resetBeforeConnect: false,
      cfwInteract: {
        capturePanelPlusCount: 1,
        capturePanelMinusCount: 1,
        menuNextCount: 1,
        menuPrevCount: 1,
      },
    },
  })

  await expect(page.getByTestId(deviceProbeTestId('MainCamera')).first()).toHaveAttribute('data-state', 'connected', {
    timeout: 10_000,
  })
})
