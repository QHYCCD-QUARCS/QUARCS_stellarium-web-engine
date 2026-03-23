/**
 * 设备与拍摄相关步骤注册表 (deviceSteps)
 *
 * 作用：
 * 封装设备侧边栏、连接/断开、拍摄面板、单次拍摄、保存、曝光调节、配置按钮等。
 * 以 data-testid（含 deviceMenuTestId、deviceProbeTestId 等）定位，交互前做可操作性检查，禁止 force。
 *
 * 执行过程概要：
 * - device.gotoHome：gotoHome(page)。
 * - device.ensureDeviceSidebar / device.ensureDeviceSidebarFor：openDeviceSidebar(deviceType)，即打开菜单 → 点击设备菜单项 → 断言 ui-app-submenu-device-page data-state=open。
 * - device.connectIfNeeded：打开侧边栏 → 若探针已 connected 则跳过；否则选驱动/连接模式 → 点击 ui-app-btn-connect-driver → 若出现设备分配面板(dap-root)则执行绑定(doBindAllocation)，再等待探针 data-state=connected。
 * - device.ensureCapturePanel：前置「设备已连接 + 主相机拍摄界面」；不满足则先 ensureDeviceConnected、再切换主界面并显示拍摄面板，最后断言 cp-panel 可见。
 * - device.captureOnce：前置同上；不满足则先满足再等 cp-status=idle → 点击 cp-btn-capture → 等 busy 再 idle。
 * - device.save：前置同上；不满足则先满足再点击 cp-btn-save。
 * - device.setExposureTime：前置同上；不满足则先满足再通过 cp-btn-exptime-plus/minus 调曝光。
 * - device.disconnectIfNeeded：若探针已连接则打开侧边栏 → 点击断开 → 若有确认弹窗则确认 → 等探针 disconnected。
 * - device.readConnectionState / device.readCurrentDriverConfig：读取探针 data-state 等并输出。
 * - device.clickConfigButton：点击 ui-config-{deviceType}-{label}-button-{index}。
 *
 * 规范：禁止 force；连接/断开/点击均经 clickByTestId 或 clickLocator。参考 testid-validation-report.md、testid-scan-report.md。
 */
import { expect, type Page } from '@playwright/test'
import type { FlowContext, StepRegistry } from './flowTypes'
import {
  clickByTestId,
  clickLocator,
  deviceMenuTestId,
  deviceProbeTestId,
  ensureCaptureUiVisible,
  ensureMenuDrawerClosed,
  ensureMenuDrawerOpen,
  gotoHome,
  sanitizeTestIdPart,
  selectVSelectItemText,
  sleep,
  waitForTestIdState,
} from './helpers'

const EXPOSURE_PRESETS = ['1ms', '10ms', '100ms', '1s', '5s', '10s', '30s', '60s', '120s', '300s', '600s']

function normalizeCompareText(value: unknown) {
  return String(value ?? '')
    .toUpperCase()
    .replace(/\s+/g, '')
}

function normalizeExposure(value: string) {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, '')
}

function resolveDeviceType(params: Record<string, any>) {
  return String(params.deviceType ?? params.driverType ?? 'MainCamera')
}

type ConnectTarget = {
  deviceType: string
  driverText: string
  connectionModeText: string
  allocationDeviceMatch?: string
}

function splitCsvLike(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((x) => String(x ?? '').trim()).filter(Boolean)
  }
  if (value == null) return []
  const text = String(value).trim()
  if (!text) return []
  return text
    .split(/[,\n|]/)
    .map((x) => x.trim())
    .filter(Boolean)
}

function valueByIndexOrFirst(values: string[], index: number, fallback = ''): string {
  if (values[index]) return values[index]
  if (values.length > 0) return values[0]
  return fallback
}

function resolveConnectTargets(params: Record<string, any>): ConnectTarget[] {
  if (Array.isArray(params.devices) && params.devices.length > 0) {
    const parsed = params.devices
      .map((item: any) => ({
        deviceType: String(item?.deviceType ?? item?.driverType ?? '').trim(),
        driverText: String(item?.driverText ?? '').trim(),
        connectionModeText: String(item?.connectionModeText ?? '').trim(),
        allocationDeviceMatch:
          item?.allocationDeviceMatch != null ? String(item.allocationDeviceMatch).trim() || undefined : undefined,
      }))
      .filter((x) => x.deviceType)
    if (parsed.length > 0) return parsed
  }

  const deviceTypes = splitCsvLike(params.deviceTypes ?? params.driverTypes ?? params.deviceType ?? params.driverType)
  const driverTexts = splitCsvLike(params.driverTexts ?? params.driverText)
  const connectionModes = splitCsvLike(params.connectionModeTexts ?? params.connectionModeText)
  const allocationMatches = splitCsvLike(params.allocationDeviceMatches ?? params.allocationDeviceMatch)

  const fallbackDeviceType = resolveDeviceType(params)
  const total = Math.max(deviceTypes.length, 1)
  const targets: ConnectTarget[] = []
  for (let i = 0; i < total; i += 1) {
    targets.push({
      deviceType: valueByIndexOrFirst(deviceTypes, i, fallbackDeviceType),
      driverText: valueByIndexOrFirst(driverTexts, i, String(params.driverText ?? 'QHYCCD')),
      connectionModeText: valueByIndexOrFirst(connectionModes, i, String(params.connectionModeText ?? '')),
      allocationDeviceMatch: valueByIndexOrFirst(allocationMatches, i, '').trim() || undefined,
    })
  }
  return targets
}

async function openDeviceSidebar(ctx: FlowContext, deviceType: string) {
  await ensureMenuDrawerOpen(ctx.page, ctx.stepTimeoutMs)
  const submenuPage = ctx.page.getByTestId('ui-app-submenu-device-page').first()
  const alreadyOpen = (await submenuPage.getAttribute('data-state').catch(() => null)) === 'open'
  if (!alreadyOpen) {
    await clickByTestId(ctx.page, deviceMenuTestId(deviceType), ctx.stepTimeoutMs)
  }
  await expect(submenuPage).toHaveAttribute('data-state', 'open', {
    timeout: ctx.stepTimeoutMs,
  })
}

/** 驱动选择器：Vuetify 2 的 testid 在隐藏 input 上，用可见的 .v-input 包装器判断是否显示 */
async function selectDriverIfVisible(ctx: FlowContext, driverText: string) {
  const panel = ctx.page.getByTestId('ui-app-device-connection-panel').first()
  const driverSelectWrapper = panel.locator('.v-input').filter({
    has: ctx.page.getByTestId('ui-app-select-confirm-driver'),
  }).first()
  if (!(await driverSelectWrapper.isVisible().catch(() => false))) return

  const wanted = normalizeCompareText(driverText)
  const currentBefore = normalizeCompareText(await driverSelectWrapper.textContent().catch(() => ''))
  if (wanted && currentBefore.includes(wanted)) return

  try {
    await selectVSelectItemText(ctx.page, 'ui-app-select-confirm-driver', driverText, ctx.stepTimeoutMs)
  } catch (error) {
    const currentAfter = normalizeCompareText(await driverSelectWrapper.textContent().catch(() => ''))
    if (wanted && currentAfter.includes(wanted)) return
    throw error
  }
}

/** 连接模式选择器：同上，用可见包装器判断 */
async function selectConnectionModeIfVisible(ctx: FlowContext, modeText: string) {
  const panel = ctx.page.getByTestId('ui-app-device-connection-panel').first()
  const modeSelectWrapper = panel.locator('.v-input').filter({
    has: ctx.page.getByTestId('ui-app-select-on-connection-mode-change'),
  }).first()
  if (!(await modeSelectWrapper.isVisible().catch(() => false))) return
  await selectVSelectItemText(ctx.page, 'ui-app-select-on-connection-mode-change', modeText, ctx.stepTimeoutMs)
}

async function waitForProbeState(ctx: FlowContext, deviceType: string, state: string, timeout?: number) {
  await waitForTestIdState(ctx.page, deviceProbeTestId(deviceType), state, timeout ?? ctx.stepTimeoutMs)
}

/**
 * 设备分配面板：若当前出现 DAP，则对指定 deviceType 的角色执行绑定。
 * 待分配设备选择规则：若传入 deviceNameMatch，则优先匹配名称中包含该字符串（模糊、不区分大小写）的第一个设备，否则选第一个。
 * 供 connectIfNeeded 在点击连接后、等待 connected 前调用；可通过 params.doBindAllocation 关闭。
 */
async function bindInAllocationPanelIfVisible(
  ctx: FlowContext,
  deviceType: string,
  deviceNameMatch?: string,
) {
  const page = ctx.page
  const dap = page.getByTestId('dap-root').first()
  if (!(await dap.isVisible().catch(() => false))) return

  const pickers = dap.getByTestId('dp-picker')
  await expect(pickers.first()).toBeVisible({ timeout: ctx.stepTimeoutMs }).catch(() => {})

  const count = await pickers.count()
  let targetIndex = -1
  for (let i = 0; i < count; i++) {
    const typeSpan = pickers.nth(i).getByTestId('dp-device-type')
    const text = (await typeSpan.textContent().catch(() => ''))?.trim() ?? ''
    if (text === deviceType) {
      const state = await pickers.nth(i).getAttribute('data-state').catch(() => '')
      if (state !== 'bound') {
        targetIndex = i
        break
      }
      return
    }
  }
  if (targetIndex < 0) return

  const picker = pickers.nth(targetIndex)
  await clickLocator(picker, ctx.stepTimeoutMs)
  await sleep(300)

  const deviceItems = dap.getByTestId('dap-act-selected-device-name-2')
  if ((await deviceItems.count()) === 0) return

  const matchLower = (deviceNameMatch ?? '').trim().toLowerCase()
  let targetDevice = deviceItems.first()
  if (matchLower) {
    const itemCount = await deviceItems.count()
    for (let i = 0; i < itemCount; i++) {
      const item = deviceItems.nth(i)
      const name = (await item.textContent().catch(() => ''))?.trim().toLowerCase() ?? ''
      if (name.includes(matchLower)) {
        targetDevice = item
        break
      }
    }
  }

  await expect(targetDevice).toBeVisible({ timeout: 5000 }).catch(() => {})
  await clickLocator(targetDevice, ctx.stepTimeoutMs)
  await sleep(300)

  const bindBtn = picker.getByTestId('dp-btn-toggle-bind')
  if ((await bindBtn.getAttribute('data-state').catch(() => '')) === 'unbound') {
    await clickLocator(bindBtn, ctx.stepTimeoutMs)
    await sleep(500)
  }

  const closeBtn = page.getByTestId('dap-act-close-panel').first()
  if (await closeBtn.isVisible().catch(() => false)) {
    await clickLocator(closeBtn, ctx.stepTimeoutMs)
    await sleep(300)
  }
}

async function currentExposureText(page: Page) {
  return ((await page.getByTestId('cp-exptime-value').first().textContent()) ?? '').trim()
}

export function makeDeviceStepRegistry(): StepRegistry {
  const registry: StepRegistry = new Map()

  registry.set('device.gotoHome', {
    async run(ctx) {
      await gotoHome(ctx.page, ctx.stepTimeoutMs)
    },
  })

  registry.set('device.ensureDeviceSidebar', {
    async run(ctx, params) {
      await openDeviceSidebar(ctx, resolveDeviceType(params))
    },
  })

  registry.set('device.ensureDeviceSidebarFor', {
    async run(ctx, params) {
      await openDeviceSidebar(ctx, resolveDeviceType(params))
    },
  })

  async function ensureSingleDeviceConnected(
    ctx: FlowContext,
    target: ConnectTarget,
    params: Record<string, any>,
  ) {
    const { deviceType, driverText, connectionModeText, allocationDeviceMatch } = target
    const probe = ctx.page.getByTestId(deviceProbeTestId(deviceType)).first()

    await openDeviceSidebar(ctx, deviceType)

    const probeState = await probe.getAttribute('data-state').catch(() => null)
    if (probeState === 'connected') {
      await ensureMenuDrawerClosed(ctx.page, ctx.stepTimeoutMs)
      return
    }

    const panel = ctx.page.getByTestId('ui-app-device-connection-panel').first()
    await expect(panel).toHaveAttribute('data-state', 'ready', { timeout: ctx.stepTimeoutMs })
    await expect(panel).toBeVisible({ timeout: ctx.stepTimeoutMs })
    if (driverText) await selectDriverIfVisible(ctx, driverText)
    if (connectionModeText) await selectConnectionModeIfVisible(ctx, connectionModeText)

    await clickByTestId(ctx.page, 'ui-app-btn-connect-driver', ctx.stepTimeoutMs)

    const connectTimeoutMs = params.timeoutMs ?? Math.max(ctx.stepTimeoutMs, 60_000)
    const doBindAllocation = params.doBindAllocation !== false

    if (doBindAllocation) {
      const deadline = Date.now() + connectTimeoutMs
      const pollMs = 400
      while (Date.now() < deadline) {
        const state = await probe.getAttribute('data-state').catch(() => null)
        if (state === 'connected') break
        const dapVisible = await ctx.page.getByTestId('dap-root').first().isVisible().catch(() => false)
        if (dapVisible) {
          await bindInAllocationPanelIfVisible(ctx, deviceType, allocationDeviceMatch)
          await sleep(500)
        }
        await sleep(pollMs)
      }
    }

    await waitForProbeState(ctx, deviceType, 'connected', connectTimeoutMs)
    await ensureMenuDrawerClosed(ctx.page, ctx.stepTimeoutMs)
  }

  /**
   * 前置：设备已连接。支持单设备与多设备（deviceTypes/driverTexts/connectionModeTexts 或 devices[]）。
   * 若未连接则打开侧栏、选驱动/模式、点击连接、必要时做设备分配绑定，再等待 connected。
   * 供 connectIfNeeded、ensureCapturePanel、captureOnce 等依赖「设备已连接」的步骤复用。
   */
  async function ensureDeviceConnected(ctx: FlowContext, params: Record<string, any>) {
    const targets = resolveConnectTargets(params)
    for (const target of targets) {
      await ensureSingleDeviceConnected(ctx, target, params)
    }
  }

  registry.set('device.connectIfNeeded', {
    async run(ctx, params) {
      const deviceType = resolveDeviceType(params)
      console.log(`[flow] device.connectIfNeeded deviceType=${deviceType} target=connected`)
      await ensureDeviceConnected(ctx, params)
      console.log(`[flow] device.connectIfNeeded 后置确认: 探针 data-state=connected`)
    },
  })

  /** 前置：设备已连接 + 处于主相机拍摄界面。不满足则先连接、再切换并显示拍摄面板。后置确认：cp-panel 可见。 */
  registry.set('device.ensureCapturePanel', {
    async run(ctx, params) {
      console.log('[flow] device.ensureCapturePanel 前置：设备已连接 + 拍摄面板可见')
      await ensureDeviceConnected(ctx, params)
      await ensureCaptureUiVisible(ctx.page, ctx.stepTimeoutMs)
      await expect(ctx.page.getByTestId('cp-panel')).toBeVisible({ timeout: ctx.stepTimeoutMs })
      console.log('[flow] device.ensureCapturePanel 后置确认: cp-panel 可见')
    },
  })

  /** 前置：设备已连接 + 处于主相机拍摄界面。不满足则先 ensureCapturePanel 再执行拍摄。后置确认：cp-status idle、e2e-tilegpm data-seq 变化。 */
  registry.set('device.captureOnce', {
    async run(ctx, params) {
      console.log('[flow] device.captureOnce 前置：设备已连接、拍摄界面、cp-status=idle')
      await ensureDeviceConnected(ctx, params)
      await ensureCaptureUiVisible(ctx.page, ctx.stepTimeoutMs)
      await waitForTestIdState(ctx.page, 'cp-status', 'idle', ctx.stepTimeoutMs)

      const seqBefore = await ctx.page.getByTestId('e2e-tilegpm').first().getAttribute('data-seq').catch(() => null)
      await clickByTestId(ctx.page, 'cp-btn-capture', ctx.stepTimeoutMs)

      await waitForTestIdState(ctx.page, 'cp-status', 'busy', Math.min(10_000, params.waitCaptureTimeoutMs ?? ctx.stepTimeoutMs)).catch(() => {})
      await waitForTestIdState(ctx.page, 'cp-status', 'idle', params.waitCaptureTimeoutMs ?? Math.max(ctx.stepTimeoutMs, 60_000))

      if (seqBefore != null) {
        await expect
          .poll(
            async () => ctx.page.getByTestId('e2e-tilegpm').first().getAttribute('data-seq'),
            { timeout: params.waitCaptureTimeoutMs ?? Math.max(ctx.stepTimeoutMs, 60_000) },
          )
          .not.toBe(seqBefore)
      }
      console.log('[flow] device.captureOnce 后置确认: cp-status=idle, data-seq 已更新')
    },
  })

  /** 前置：设备已连接 + 拍摄界面。不满足则先满足再保存。后置：暂无明确保存成功 UI 信号，用固定延时作为过渡。 */
  registry.set('device.save', {
    async run(ctx, params) {
      if (params.doSave === false) return
      console.log('[flow] device.save 点击 cp-btn-save')
      await ensureDeviceConnected(ctx, params)
      await ensureCaptureUiVisible(ctx.page, ctx.stepTimeoutMs)
      await clickByTestId(ctx.page, 'cp-btn-save', ctx.stepTimeoutMs)
      // 暂无明确保存成功 UI 信号，用固定延时作为过渡，待产品暴露 testid/状态后再替换
      await ctx.page.waitForTimeout(Number(params.waitAfterSaveMs ?? 1000))
    },
  })

  /** 前置：设备已连接 + 拍摄界面。不满足则先满足再调曝光。 */
  registry.set('device.setExposureTime', {
    async run(ctx, params) {
      const target = normalizeExposure(String(params.exposure ?? ''))
      if (!target) throw new Error('device.setExposureTime 缺少 exposure')

      await ensureDeviceConnected(ctx, params)
      await ensureCaptureUiVisible(ctx.page, ctx.stepTimeoutMs)
      let current = normalizeExposure(await currentExposureText(ctx.page))
      if (current === target) return

      const currentIndex = EXPOSURE_PRESETS.findIndex((x) => normalizeExposure(x) === current)
      const targetIndex = EXPOSURE_PRESETS.findIndex((x) => normalizeExposure(x) === target)
      if (currentIndex < 0 || targetIndex < 0) {
        throw new Error(`不支持的曝光值切换: current=${current} target=${target}`)
      }

      const buttonId = targetIndex > currentIndex ? 'cp-btn-exptime-plus' : 'cp-btn-exptime-minus'
      const steps = Math.abs(targetIndex - currentIndex)
      for (let i = 0; i < steps; i += 1) {
        await clickByTestId(ctx.page, buttonId, ctx.stepTimeoutMs)
        // 步进间隔，避免连续点击导致 UI 未更新
        await ctx.page.waitForTimeout(150)
      }

      current = normalizeExposure(await currentExposureText(ctx.page))
      if (current !== target) {
        throw new Error(`曝光值未生效: expected=${target} actual=${current}`)
      }
    },
  })

  registry.set('device.disconnectIfNeeded', {
    async run(ctx, params) {
      const deviceType = resolveDeviceType(params)
      const probe = ctx.page.getByTestId(deviceProbeTestId(deviceType)).first()
      const state = await probe.getAttribute('data-state').catch(() => null)
      if (state !== 'connected') {
        console.log(`[flow] device.disconnectIfNeeded 前置不满足: ${deviceType} state=${state ?? 'unknown'}，跳过`)
        return
      }
      console.log(`[flow] device.disconnectIfNeeded deviceType=${deviceType} 执行断开`)
      await openDeviceSidebar(ctx, deviceType)
      const button = ctx.page.getByTestId('ui-app-btn-disconnect-driver').first()
      await clickLocator(button, ctx.stepTimeoutMs)
      // 单设备断开可能弹确认框；若出现则确认，避免 overlay 挡住后续流程。
      const dialogRoot = ctx.page.getByTestId('ui-confirm-dialog-root').first()
      const dialogVisible = await dialogRoot.isVisible().catch(() => false)
      if (dialogVisible) {
        await clickByTestId(ctx.page, 'ui-confirm-dialog-btn-confirm', ctx.stepTimeoutMs)
      } else {
        await expect(dialogRoot).toBeVisible({ timeout: Math.min(5000, ctx.stepTimeoutMs) }).catch(() => {})
        if (await dialogRoot.isVisible().catch(() => false)) {
          await clickByTestId(ctx.page, 'ui-confirm-dialog-btn-confirm', ctx.stepTimeoutMs)
        }
      }
      await waitForProbeState(ctx, deviceType, 'disconnected', params.timeoutMs ?? Math.max(ctx.stepTimeoutMs, 30_000))
      await ensureMenuDrawerClosed(ctx.page, ctx.stepTimeoutMs)
      console.log(`[flow] device.disconnectIfNeeded 后置确认: ${deviceType} data-state=disconnected`)
    },
  })

  registry.set('device.readConnectionState', {
    async run(ctx, params) {
      const deviceType = resolveDeviceType(params)
      const state = await ctx.page.getByTestId(deviceProbeTestId(deviceType)).first().getAttribute('data-state')
      console.log(`DEVICE_CONNECTION_STATE ${deviceType}=${state ?? 'unknown'}`)
    },
  })

  registry.set('device.readCurrentDriverConfig', {
    async run(ctx, params) {
      const deviceType = resolveDeviceType(params)
      const probe = ctx.page.getByTestId(deviceProbeTestId(deviceType)).first()
      const info = {
        deviceType,
        dataState: await probe.getAttribute('data-state').catch(() => null),
        connectionMode: await probe.getAttribute('data-connection-mode').catch(() => null),
        driverName: await probe.getAttribute('data-driver-name').catch(() => null),
        device: await probe.getAttribute('data-device').catch(() => null),
      }
      console.log(`DEVICE_CONFIG ${JSON.stringify(info)}`)
    },
  })

  registry.set('device.clickConfigButton', {
    async run(ctx, params) {
      const deviceType = resolveDeviceType(params)
      const label = sanitizeTestIdPart(String(params.label ?? params.buttonLabel ?? ''))
      const index = Number(params.index ?? 0)
      if (!label) throw new Error('device.clickConfigButton 缺少 label')
      await clickByTestId(ctx.page, `ui-config-${sanitizeTestIdPart(deviceType)}-${label}-button-${index}`, ctx.stepTimeoutMs)
    },
  })

  return registry
}
