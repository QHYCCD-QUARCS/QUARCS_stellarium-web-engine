/**
 * AI-Control：power-management 命令。
 * 执行后打开电源管理页（menu.openPowerManager），验证 ui-power-manager-root 为 open。
 *
 * 本 spec 使用串行模式 + 共用同一 page。
 */
import type { BrowserContext, Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { createFlowContext, makeAiControlRegistry, runFlowByCommand } from '..'

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

test('power-management 命令：打开电源管理页', async ({ }, testInfo) => {
  const page = sharedPage!
  const ctx = createFlowContext(page, testInfo, { minTestTimeoutMs: 2 * 60_000 })
  const registry = makeAiControlRegistry()

  await runFlowByCommand({
    ctx,
    registry,
    commandName: 'power-management',
    flowParams: { gotoHome: false },
  })

  await expect(page.getByTestId('ui-power-manager-root').first()).toHaveAttribute(
    'data-state',
    'open',
  )
})

test('power-management 命令：打开电源管理页并执行 output1 交互', async ({}, testInfo) => {
  const page = sharedPage!
  const ctx = createFlowContext(page, testInfo, { minTestTimeoutMs: 2 * 60_000 })
  const registry = makeAiControlRegistry()

  await runFlowByCommand({
    ctx,
    registry,
    commandName: 'power-management',
    flowParams: { gotoHome: false, powerManagementInteract: { output1: true } },
  })

  await expect(page.getByTestId('ui-power-manager-root').first()).toHaveAttribute(
    'data-state',
    'open',
  )
  await expect(page.getByTestId('ui-app-power-page-output-power-1').first()).toContainText(/\[(ON|OFF)\]/)
})

test('power-management 命令：将 output2 设为开启态', async ({}, testInfo) => {
  const page = sharedPage!
  const ctx = createFlowContext(page, testInfo, { minTestTimeoutMs: 2 * 60_000 })
  const registry = makeAiControlRegistry()

  await runFlowByCommand({
    ctx,
    registry,
    commandName: 'power-management',
    flowParams: { gotoHome: false, powerManagementInteract: { output2: true } },
  })

  await expect(page.getByTestId('ui-power-manager-root').first()).toHaveAttribute('data-state', 'open')
  await expect(page.getByTestId('ui-app-power-page-output-power-2').first()).toContainText('[ON]')
})

test('power-management 命令：打开重启确认后取消', async ({}, testInfo) => {
  const page = sharedPage!
  const ctx = createFlowContext(page, testInfo, { minTestTimeoutMs: 2 * 60_000 })
  const registry = makeAiControlRegistry()

  await runFlowByCommand({
    ctx,
    registry,
    commandName: 'power-management',
    flowParams: { gotoHome: false, powerManagementInteract: { restart: 'cancel' } },
  })

  await expect(page.getByTestId('ui-confirm-dialog-root').first()).toHaveAttribute('data-state', 'closed')
})

test('power-management 命令：打开关机确认后取消', async ({}, testInfo) => {
  const page = sharedPage!
  const ctx = createFlowContext(page, testInfo, { minTestTimeoutMs: 2 * 60_000 })
  const registry = makeAiControlRegistry()

  await runFlowByCommand({
    ctx,
    registry,
    commandName: 'power-management',
    flowParams: { gotoHome: false, powerManagementInteract: { shutdown: 'cancel' } },
  })

  await expect(page.getByTestId('ui-confirm-dialog-root').first()).toHaveAttribute('data-state', 'closed')
})

test('power-management 命令：打开强制更新确认后取消', async ({}, testInfo) => {
  const page = sharedPage!
  const ctx = createFlowContext(page, testInfo, { minTestTimeoutMs: 2 * 60_000 })
  const registry = makeAiControlRegistry()

  await runFlowByCommand({
    ctx,
    registry,
    commandName: 'power-management',
    flowParams: { gotoHome: false, powerManagementInteract: { forceUpdate: 'cancel' } },
  })

  await expect(page.getByTestId('ui-confirm-dialog-root').first()).toHaveAttribute('data-state', 'closed')
})
