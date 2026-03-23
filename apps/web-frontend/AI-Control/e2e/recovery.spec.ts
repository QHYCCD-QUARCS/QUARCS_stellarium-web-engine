import type { BrowserContext, Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import {
  createFlowContext,
  makeAiControlRegistry,
  runFlowByCommand,
} from '..'

let sharedContext: BrowserContext | undefined
let sharedPage: Page | undefined

test.describe.configure({ mode: 'serial' })

test.beforeAll(async ({ browser, baseURL }) => {
  sharedContext = await browser.newContext({ baseURL: baseURL ?? undefined })
  sharedPage = await sharedContext.newPage()
  await sharedPage.goto('/')
})

test.afterAll(async () => {
  await sharedPage?.close()
  await sharedContext?.close()
})

test('recovery：已打开电源管理时切到通用设置', async ({}, testInfo) => {
  const page = sharedPage!
  const ctx = createFlowContext(page, testInfo, { minTestTimeoutMs: 2 * 60_000 })
  const registry = makeAiControlRegistry()

  await runFlowByCommand({
    ctx,
    registry,
    commandName: 'power-management',
    flowParams: { gotoHome: true },
  })
  await expect(page.getByTestId('ui-power-manager-root').first()).toHaveAttribute('data-state', 'open')

  await runFlowByCommand({
    ctx,
    registry,
    commandName: 'general-settings',
    flowParams: { gotoHome: false },
  })

  await expect(page.getByTestId('ui-power-manager-root').first()).not.toBeVisible({ timeout: ctx.stepTimeoutMs })
  await expect(page.getByTestId('ui-view-settings-dialog-root').first()).toHaveAttribute('data-state', 'open')
})

test('recovery：已打开通用设置时切到图像管理', async ({}, testInfo) => {
  const page = sharedPage!
  const ctx = createFlowContext(page, testInfo, { minTestTimeoutMs: 2 * 60_000 })
  const registry = makeAiControlRegistry()

  await runFlowByCommand({
    ctx,
    registry,
    commandName: 'general-settings',
    flowParams: { gotoHome: false },
  })
  await expect(page.getByTestId('ui-view-settings-dialog-root').first()).toHaveAttribute('data-state', 'open')

  await runFlowByCommand({
    ctx,
    registry,
    commandName: 'image-file-manager',
    flowParams: { gotoHome: false },
  })

  await expect(page.getByTestId('ui-view-settings-dialog-root').first()).not.toBeVisible({ timeout: ctx.stepTimeoutMs })
  await expect(page.getByTestId('imp-root').first()).toHaveAttribute('data-state', 'open')
})

test('recovery：已打开图像管理时切回电源管理', async ({}, testInfo) => {
  const page = sharedPage!
  const ctx = createFlowContext(page, testInfo, { minTestTimeoutMs: 2 * 60_000 })
  const registry = makeAiControlRegistry()

  await runFlowByCommand({
    ctx,
    registry,
    commandName: 'image-file-manager',
    flowParams: { gotoHome: false },
  })
  await expect(page.getByTestId('imp-root').first()).toHaveAttribute('data-state', 'open')

  await runFlowByCommand({
    ctx,
    registry,
    commandName: 'power-management',
    flowParams: { gotoHome: false },
  })

  await expect(page.getByTestId('imp-root').first()).not.toBeVisible({ timeout: ctx.stepTimeoutMs })
  await expect(page.getByTestId('ui-power-manager-root').first()).toHaveAttribute('data-state', 'open')
})
