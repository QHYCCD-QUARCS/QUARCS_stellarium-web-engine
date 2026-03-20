/**
 * AI-Control 第一个 CLI 示例：general-settings。
 * 不传 generalSettingsInteract 时仅打开通用设置对话框；传入则按参数执行对话框内各项交互（页签、复选框、语言、清理盒子等）。
 * 使用 runFlowByCommand(ctx, registry, 'general-settings', flowParams)。
 *
 * 本 spec 使用串行模式 + 共用同一 page：整次运行只打开一个网页，所有用例在该页面上顺序执行。
 */
import type { BrowserContext, Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import {
  createFlowContext,
  GENERAL_SETTINGS_INTERACT_KEYS,
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

test('general-settings 命令：gotoHome + openGeneralSettings（不执行断开全部）', async (
  { },
  testInfo,
) => {
  const page = sharedPage!
  const ctx = createFlowContext(page, testInfo, { minTestTimeoutMs: 2 * 60_000 })
  const registry = makeAiControlRegistry()

  await runFlowByCommand({
    ctx,
    registry,
    commandName: 'general-settings',
    flowParams: { resetBeforeConnect: false },
  })

  await expect(page.getByTestId('ui-view-settings-dialog-root').first()).toHaveAttribute(
    'data-state',
    'open',
  )
})

test('general-settings 命令：完整流程（gotoHome + disconnectAll + openGeneralSettings）', async (
  { },
  testInfo,
) => {
  const page = sharedPage!
  const ctx = createFlowContext(page, testInfo, { minTestTimeoutMs: 2 * 60_000 })
  const registry = makeAiControlRegistry()

  await runFlowByCommand({
    ctx,
    registry,
    commandName: 'general-settings',
    flowParams: { resetBeforeConnect: true },
  })

  await expect(page.getByTestId('ui-view-settings-dialog-root').first()).toHaveAttribute(
    'data-state',
    'open',
  )
})

test('general-settings 命令（传 generalSettingsInteract）：打开总设置并测试每个可交互项（默认每项交互后等待 1s 再还原）', async (
  { },
  testInfo,
) => {
  const page = sharedPage!
  const ctx = createFlowContext(page, testInfo, { minTestTimeoutMs: 5 * 60_000 })
  const registry = makeAiControlRegistry()

  await runFlowByCommand({
    ctx,
    registry,
    commandName: 'general-settings',
    flowParams: {
      resetBeforeConnect: false,
      generalSettingsRestoreAfterMs: 400,
      // clearBoxConfirm 需至少勾选一项才可确认，流程已做勾选+waitEnabled；E2E 中嵌套弹窗勾选偶发不生效故暂关
      generalSettingsInteract: { clearBoxConfirm: false },
    },
  })

  await expect(page.getByTestId('ui-view-settings-dialog-root').first()).toHaveAttribute(
    'data-state',
    'closed',
  )
})

test('清理盒子缓存：只清理更新包文件', async ({ }, testInfo) => {
  const page = sharedPage!
  const ctx = createFlowContext(page, testInfo, { minTestTimeoutMs: 2 * 60_000 })
  const registry = makeAiControlRegistry()

  await runFlowByCommand({
    ctx,
    registry,
    commandName: 'general-settings',
    flowParams: {
      resetBeforeConnect: false,
      generalSettingsRestoreAfterMs: 300,
      clearBoxConfirmOption: 'update-pack',
      generalSettingsInteract: {
        displayTab: false,
        milkyWay: false,
        dss: false,
        meridian: false,
        ecliptic: false,
        highfps: false,
        versionTab: false,
        refreshDevices: false,
        memoryTab: true,
        refreshStorage: false,
        clearLogs: false,
        clearBoxCancel: false,
        clearBoxConfirm: true,
        close: true,
      },
    },
  })

  await expect(page.getByTestId('ui-view-settings-dialog-root').first()).toHaveAttribute(
    'data-state',
    'closed',
  )
})

test('general-settings 命令（参数由环境变量指定，无需改代码）', async ({ }, testInfo) => {
  const page = sharedPage!
  const ctx = createFlowContext(page, testInfo, { minTestTimeoutMs: 5 * 60_000 })
  const registry = makeAiControlRegistry()
  const defaultInteract: Partial<Record<(typeof GENERAL_SETTINGS_INTERACT_KEYS)[number], boolean>> = {}
  for (const k of GENERAL_SETTINGS_INTERACT_KEYS) {
    defaultInteract[k] = ['displayTab', 'selectLanguage', 'close'].includes(k)
  }
  const flowParams = resolveFlowParamsFromEnv({
    resetBeforeConnect: false,
    generalSettingsRestoreAfterMs: 400,
    generalSettingsInteract: defaultInteract,
  })

  await runFlowByCommand({
    ctx,
    registry,
    commandName: 'general-settings',
    flowParams,
  })

  await expect(page.getByTestId('ui-view-settings-dialog-root').first()).toHaveAttribute(
    'data-state',
    'closed',
  )
})
