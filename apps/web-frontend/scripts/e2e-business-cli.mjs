#!/usr/bin/env node

import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import cfg from '../e2e.config.cjs'

const { DEFAULTS, envFlag, envNumber, resolveBoolWithPrecedence } = cfg

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const WEB_FRONTEND_ROOT = path.resolve(__dirname, '..')

const SCHEMA_VERSION = '2026-03-12'
const RUNNER_SPEC = 'tests/e2e/flow-runner.spec.ts'

const BUSINESS_COMMANDS = Object.freeze({
  'device.connect.capture': {
    title: 'Connect device and capture once',
    summary: 'Connect a device, ensure capture panel, run one capture, and optionally save.',
    params: {
      baseUrl: { type: 'string', required: false, defaultFromEnv: 'E2E_BASE_URL' },
      headed: { type: 'boolean', required: false, default: DEFAULTS.mcp.headed },
      timeoutSec: { type: 'number', required: false, default: DEFAULTS.mcp.flowTimeoutSec },
      testTimeoutMs: { type: 'number', required: false, default: DEFAULTS.flow.testTimeoutMs },
      deviceType: { type: 'string', required: false, default: DEFAULTS.flow.deviceType ?? 'MainCamera' },
      driverText: { type: 'string', required: false, default: DEFAULTS.flow.qhyDriverText },
      connectionModeText: { type: 'string', required: false, default: DEFAULTS.flow.qhyConnectionModeText },
      waitCaptureTimeoutMs: { type: 'number', required: false, default: DEFAULTS.flow.qhyWaitCaptureTimeoutMs },
      doSave: { type: 'boolean', required: false, default: DEFAULTS.flow.qhyDoSave },
      resetBeforeConnect: { type: 'boolean', required: false, default: true },
      downloadDir: { type: 'string', required: false, default: DEFAULTS.flow.downloadDir },
      doBindAllocation: { type: 'boolean', required: false, default: true },
      allocationDeviceMatch: { type: 'string', required: false },
      deviceTypes: { type: 'string[]', required: false, description: 'Comma-separated device types for multi-device connect' },
      driverTexts: { type: 'string[]', required: false, description: 'Comma-separated driver labels aligned by index' },
      connectionModeTexts: { type: 'string[]', required: false, description: 'Comma-separated connection modes aligned by index' },
      allocationDeviceMatches: {
        type: 'string[]',
        required: false,
        description: 'Comma-separated allocation name matchers aligned by index',
      },
    },
    stateModel: {
      initialState: 'boot.pending',
      successStates: ['capture.captured', 'capture.saved'],
      failureStates: ['device.connect_failed', 'capture.capture_failed', 'run.failed'],
      states: [
        {
          id: 'boot.pending',
          category: 'boot',
          meaning: 'The app has not been opened by the business command.',
          allowedNext: ['nav.home'],
        },
        {
          id: 'nav.home',
          category: 'navigation',
          meaning: 'The app home page is ready for device workflows.',
          allowedNext: ['device.sidebar_ready', 'device.disconnected'],
        },
        {
          id: 'device.disconnected',
          category: 'connection',
          meaning: 'Target device is not connected and can be configured safely.',
          allowedNext: ['device.sidebar_ready', 'device.connecting'],
        },
        {
          id: 'device.sidebar_ready',
          category: 'connection',
          meaning: 'The correct device sidebar is focused and config controls are reachable.',
          allowedNext: ['device.connecting', 'device.disconnected'],
        },
        {
          id: 'device.connecting',
          category: 'connection',
          meaning: 'A connect action is in progress.',
          allowedNext: ['device.connected', 'device.connect_failed'],
        },
        {
          id: 'device.connected',
          category: 'connection',
          meaning: 'The target device is connected and capture actions are allowed.',
          allowedNext: ['capture.panel_ready', 'device.disconnected'],
        },
        {
          id: 'capture.panel_ready',
          category: 'capture',
          meaning: 'Capture controls are visible and ready.',
          allowedNext: ['capture.capturing', 'device.connected'],
        },
        {
          id: 'capture.capturing',
          category: 'capture',
          meaning: 'One capture cycle is running.',
          allowedNext: ['capture.captured', 'capture.capture_failed'],
        },
        {
          id: 'capture.captured',
          category: 'capture',
          meaning: 'One capture finished successfully without persistence.',
          allowedNext: ['capture.saved', 'device.connected'],
        },
        {
          id: 'capture.saved',
          category: 'capture',
          meaning: 'One capture finished successfully and save completed.',
          allowedNext: ['device.connected'],
        },
        {
          id: 'device.connect_failed',
          category: 'error',
          meaning: 'Device could not reach connected state.',
          allowedNext: ['device.disconnected', 'device.sidebar_ready'],
        },
        {
          id: 'capture.capture_failed',
          category: 'error',
          meaning: 'Capture did not finish successfully.',
          allowedNext: ['capture.panel_ready', 'device.connected'],
        },
        {
          id: 'run.failed',
          category: 'error',
          meaning: 'The underlying flow-runner process failed or timed out.',
          allowedNext: ['boot.pending', 'nav.home'],
        },
      ],
      transitions: [
        { from: 'boot.pending', to: 'nav.home', trigger: 'device.gotoHome' },
        { from: 'nav.home', to: 'device.disconnected', trigger: 'menu.disconnectAll', optional: true },
        { from: 'nav.home', to: 'device.sidebar_ready', trigger: 'device.ensureDeviceSidebarFor' },
        { from: 'device.disconnected', to: 'device.sidebar_ready', trigger: 'device.ensureDeviceSidebarFor' },
        { from: 'device.sidebar_ready', to: 'device.connecting', trigger: 'device.connectIfNeeded' },
        { from: 'device.connecting', to: 'device.connected', trigger: 'device.connectIfNeeded:success' },
        { from: 'device.connecting', to: 'device.connect_failed', trigger: 'device.connectIfNeeded:failure' },
        { from: 'device.connected', to: 'capture.panel_ready', trigger: 'device.ensureCapturePanel' },
        { from: 'capture.panel_ready', to: 'capture.capturing', trigger: 'device.captureOnce' },
        { from: 'capture.capturing', to: 'capture.captured', trigger: 'device.captureOnce:success' },
        { from: 'capture.capturing', to: 'capture.capture_failed', trigger: 'device.captureOnce:failure' },
        { from: 'capture.captured', to: 'capture.saved', trigger: 'device.save', optional: true },
      ],
    },
  },
})

function printJson(obj) {
  process.stdout.write(`${JSON.stringify(obj, null, 2)}\n`)
}

function parseBoolean(raw) {
  if (typeof raw === 'boolean') return raw
  if (raw == null) return undefined
  const value = String(raw).trim().toLowerCase()
  if (!value) return undefined
  if (['1', 'true', 'yes', 'on'].includes(value)) return true
  if (['0', 'false', 'no', 'off'].includes(value)) return false
  throw new Error(`Invalid boolean value: ${raw}`)
}

function parseNumber(raw, name) {
  if (raw == null || raw === '') return undefined
  const value = Number(raw)
  if (!Number.isFinite(value)) throw new Error(`Invalid number for ${name}: ${raw}`)
  return value
}

function parseList(raw) {
  if (raw == null || raw === '') return []
  if (Array.isArray(raw)) return raw.map((x) => String(x ?? '').trim()).filter(Boolean)
  return String(raw)
    .split(/[,\n|]/)
    .map((x) => x.trim())
    .filter(Boolean)
}

function parseArgv(argv) {
  const positional = []
  const flags = {}
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i]
    if (!token.startsWith('--')) {
      positional.push(token)
      continue
    }
    const body = token.slice(2)
    const eq = body.indexOf('=')
    if (eq >= 0) {
      const key = body.slice(0, eq)
      const value = body.slice(eq + 1)
      flags[key] = value
      continue
    }
    const next = argv[i + 1]
    if (next == null || next.startsWith('--')) {
      flags[body] = 'true'
      continue
    }
    flags[body] = next
    i += 1
  }
  return { positional, flags }
}

function usage() {
  return {
    schemaVersion: SCHEMA_VERSION,
    kind: 'quarcs.e2e.business-cli.help',
    usage: [
      'node scripts/e2e-business-cli.mjs catalog',
      'node scripts/e2e-business-cli.mjs catalog device.connect.capture',
      'node scripts/e2e-business-cli.mjs plan device.connect.capture --deviceType MainCamera --driverText QHYCCD --connectionModeText SDK',
      'node scripts/e2e-business-cli.mjs run device.connect.capture --deviceType MainCamera --driverText QHYCCD --connectionModeText SDK --doSave true',
    ],
    notes: [
      'The CLI exposes business commands, not raw page controls.',
      'All outputs are structured JSON.',
      `Current runner: ${RUNNER_SPEC}`,
    ],
    commands: Object.keys(BUSINESS_COMMANDS),
  }
}

function getCommandDefinition(commandId) {
  const definition = BUSINESS_COMMANDS[commandId]
  if (!definition) {
    throw new Error(`Unknown business command: ${commandId}`)
  }
  return definition
}

function resolveDownloadDir(rawDir) {
  if (!rawDir) return DEFAULTS.flow.downloadDir
  if (path.isAbsolute(rawDir)) return rawDir
  return path.join(WEB_FRONTEND_ROOT, rawDir)
}

function normalizeCommandParams(commandId, flags) {
  if (commandId !== 'device.connect.capture') {
    throw new Error(`Normalization is not implemented for command: ${commandId}`)
  }

  const headedOverride = parseBoolean(flags.headed)
  const doSave = parseBoolean(flags.doSave)
  const resetBeforeConnect = parseBoolean(flags.resetBeforeConnect)
  const deviceTypes = parseList(flags.deviceTypes ?? process.env.E2E_DEVICE_TYPES)
  const driverTexts = parseList(flags.driverTexts ?? process.env.E2E_DRIVER_TEXTS)
  const connectionModeTexts = parseList(flags.connectionModeTexts ?? process.env.E2E_CONNECTION_MODE_TEXTS)
  const allocationDeviceMatches = parseList(
    flags.allocationDeviceMatches ?? process.env.E2E_ALLOCATION_DEVICE_MATCHES,
  )

  return {
    baseUrl: flags.baseUrl ?? process.env.E2E_BASE_URL ?? null,
    headed: resolveBoolWithPrecedence({
      override: headedOverride,
      envName: 'E2E_HEADED',
      defaultValue: DEFAULTS.mcp.headed,
    }),
    timeoutSec: parseNumber(flags.timeoutSec, 'timeoutSec') ?? DEFAULTS.mcp.flowTimeoutSec,
    testTimeoutMs: parseNumber(flags.testTimeoutMs, 'testTimeoutMs') ?? DEFAULTS.flow.testTimeoutMs,
    deviceType: flags.deviceType ?? process.env.E2E_DEVICE_TYPE ?? DEFAULTS.flow.deviceType ?? 'MainCamera',
    driverText: flags.driverText ?? process.env.E2E_DRIVER_TEXT ?? DEFAULTS.flow.qhyDriverText,
    connectionModeText:
      flags.connectionModeText ?? process.env.E2E_CONNECTION_MODE_TEXT ?? DEFAULTS.flow.qhyConnectionModeText,
    waitCaptureTimeoutMs:
      parseNumber(flags.waitCaptureTimeoutMs, 'waitCaptureTimeoutMs') ??
      envNumber(process.env, 'E2E_WAIT_CAPTURE_TIMEOUT_MS', DEFAULTS.flow.qhyWaitCaptureTimeoutMs),
    doSave: typeof doSave === 'boolean' ? doSave : envFlag(process.env, 'E2E_DO_SAVE', DEFAULTS.flow.qhyDoSave),
    resetBeforeConnect: typeof resetBeforeConnect === 'boolean' ? resetBeforeConnect : true,
    downloadDir: resolveDownloadDir(flags.downloadDir ?? process.env.E2E_DOWNLOAD_DIR ?? DEFAULTS.flow.downloadDir),
    doBindAllocation: parseBoolean(flags.doBindAllocation) ?? envFlag(process.env, 'E2E_DO_BIND_ALLOCATION', true),
    allocationDeviceMatch: flags.allocationDeviceMatch ?? process.env.E2E_ALLOCATION_DEVICE_MATCH ?? null,
    deviceTypes,
    driverTexts,
    connectionModeTexts,
    allocationDeviceMatches,
  }
}

function buildBusinessPlan(commandId, params) {
  if (commandId !== 'device.connect.capture') {
    throw new Error(`Plan builder is not implemented for command: ${commandId}`)
  }

  const steps = [
    { id: 'device.gotoHome', purpose: 'open the app entry for device workflows', entersState: 'nav.home' },
  ]

  if (params.resetBeforeConnect) {
    steps.push({
      id: 'menu.disconnectAll',
      purpose: 'reset cross-test residue before changing connection parameters',
      entersState: 'device.disconnected',
      optional: true,
    })
  }

  steps.push(
    {
      id: 'device.ensureDeviceSidebarFor',
      params: { driverType: params.deviceType },
      purpose: 'focus the target device sidebar',
      entersState: 'device.sidebar_ready',
    },
    {
      id: 'device.connectIfNeeded',
      params: {
        deviceType: params.deviceType,
        driverText: params.driverText,
        connectionModeText: params.connectionModeText,
        doBindAllocation: params.doBindAllocation,
        allocationDeviceMatch: params.allocationDeviceMatch,
        deviceTypes: params.deviceTypes,
        driverTexts: params.driverTexts,
        connectionModeTexts: params.connectionModeTexts,
        allocationDeviceMatches: params.allocationDeviceMatches,
      },
      purpose: 'configure connection parameters and connect idempotently (with optional device allocation bind)',
      entersState: 'device.connected',
    },
    {
      id: 'device.ensureCapturePanel',
      purpose: 'make capture controls available',
      entersState: 'capture.panel_ready',
    },
    {
      id: 'device.captureOnce',
      params: { waitCaptureTimeoutMs: params.waitCaptureTimeoutMs },
      purpose: 'run one capture cycle and wait for idle',
      entersState: 'capture.captured',
    },
  )

  if (params.doSave) {
    steps.push({
      id: 'device.save',
      params: { doSave: true },
      purpose: 'persist the captured frame',
      entersState: 'capture.saved',
    })
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    kind: 'quarcs.e2e.business-plan',
    command: commandId,
    title: BUSINESS_COMMANDS[commandId].title,
    summary: BUSINESS_COMMANDS[commandId].summary,
    params,
    stateModel: BUSINESS_COMMANDS[commandId].stateModel,
    execution: {
      mode: 'playwright-flow-runner',
      runnerSpec: RUNNER_SPEC,
      steps,
      globalParams: {
        deviceType: params.deviceType,
        driverType: params.deviceType,
        driverText: params.driverText,
        connectionModeText: params.connectionModeText,
        deviceTypes: params.deviceTypes,
        driverTexts: params.driverTexts,
        connectionModeTexts: params.connectionModeTexts,
        waitCaptureTimeoutMs: params.waitCaptureTimeoutMs,
        doSave: params.doSave,
        downloadDir: params.downloadDir,
        doBindAllocation: params.doBindAllocation,
        allocationDeviceMatch: params.allocationDeviceMatch,
        allocationDeviceMatches: params.allocationDeviceMatches,
      },
    },
    expectedTerminalState: params.doSave ? 'capture.saved' : 'capture.captured',
    suggestedNextCommands: ['device.disconnect', 'device.capture.once', 'device.set.exposure'],
  }
}

function runCommand({ cmd, args, cwd, env, timeoutMs }) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      cwd,
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (d) => {
      stdout += d.toString()
    })
    child.stderr.on('data', (d) => {
      stderr += d.toString()
    })

    let killedByTimeout = false
    const timer = timeoutMs
      ? setTimeout(() => {
          killedByTimeout = true
          try {
            child.kill('SIGKILL')
          } catch {
            // ignore
          }
        }, timeoutMs)
      : null

    child.on('close', (code, signal) => {
      if (timer) clearTimeout(timer)
      resolve({
        code: code ?? null,
        signal: signal ?? null,
        killedByTimeout,
        stdout,
        stderr,
      })
    })
  })
}

function tailLines(text, maxLines = 120) {
  const lines = String(text ?? '').split(/\r?\n/)
  if (lines.length <= maxLines) return lines.join('\n')
  return lines.slice(-maxLines).join('\n')
}

async function runBusinessCommand(plan) {
  const timeoutMs = plan.params.timeoutSec * 1000
  const perTestTimeoutMs = Math.min(Math.max(timeoutMs - 10_000, 60_000), 3_600_000)
  const env = {
    ...(plan.params.baseUrl ? { E2E_BASE_URL: plan.params.baseUrl } : null),
    E2E_FLOW_CALLS_JSON: JSON.stringify(
      plan.execution.steps.map((step) => ({
        id: step.id,
        ...(step.params ? { params: step.params } : null),
      })),
    ),
    E2E_FLOW_PARAMS_JSON: JSON.stringify(plan.execution.globalParams),
    E2E_RECORD: envFlag(process.env, 'E2E_RECORD', DEFAULTS.mcp.recordArtifacts) ? '1' : '0',
  }

  const args = ['playwright', 'test', RUNNER_SPEC, '--workers=1', '--timeout', String(perTestTimeoutMs)]
  if (plan.params.headed) args.push('--headed')

  const res = await runCommand({
    cmd: 'npx',
    args,
    cwd: WEB_FRONTEND_ROOT,
    env,
    timeoutMs,
  })

  const ok = res.code === 0 && !res.killedByTimeout
  return {
    schemaVersion: SCHEMA_VERSION,
    kind: 'quarcs.e2e.business-run-result',
    ok,
    command: plan.command,
    status: ok ? 'completed' : 'failed',
    terminalState: ok ? plan.expectedTerminalState : 'run.failed',
    params: plan.params,
    execution: {
      runnerSpec: RUNNER_SPEC,
      cwd: WEB_FRONTEND_ROOT,
      timeoutMs,
      testTimeoutMs: plan.params.testTimeoutMs,
      envUsed: {
        E2E_BASE_URL: env.E2E_BASE_URL ?? null,
        E2E_FLOW_CALLS_JSON: env.E2E_FLOW_CALLS_JSON,
        E2E_FLOW_PARAMS_JSON: env.E2E_FLOW_PARAMS_JSON,
        E2E_RECORD: env.E2E_RECORD,
        E2E_HEADED: plan.params.headed ? '1' : '0',
      },
      childProcess: {
        exitCode: res.code,
        signal: res.signal,
        killedByTimeout: res.killedByTimeout,
      },
    },
    stdoutTail: tailLines(res.stdout),
    stderrTail: tailLines(res.stderr),
    plan,
  }
}

async function main() {
  try {
    const { positional, flags } = parseArgv(process.argv.slice(2))
    const [subcommand, commandId] = positional

    if (!subcommand || subcommand === 'help' || subcommand === '--help') {
      printJson(usage())
      return
    }

    if (subcommand === 'catalog') {
      if (!commandId) {
        printJson({
          schemaVersion: SCHEMA_VERSION,
          kind: 'quarcs.e2e.business-command-catalog',
          commands: Object.entries(BUSINESS_COMMANDS).map(([id, def]) => ({
            id,
            title: def.title,
            summary: def.summary,
            params: def.params,
          })),
        })
        return
      }
      const definition = getCommandDefinition(commandId)
      printJson({
        schemaVersion: SCHEMA_VERSION,
        kind: 'quarcs.e2e.business-command-definition',
        id: commandId,
        ...definition,
      })
      return
    }

    if (!commandId) {
      throw new Error('A business command id is required.')
    }

    getCommandDefinition(commandId)
    const params = normalizeCommandParams(commandId, flags)
    const plan = buildBusinessPlan(commandId, params)

    if (subcommand === 'plan') {
      printJson(plan)
      return
    }

    if (subcommand === 'run') {
      const result = await runBusinessCommand(plan)
      printJson(result)
      process.exitCode = result.ok ? 0 : 1
      return
    }

    throw new Error(`Unknown subcommand: ${subcommand}`)
  } catch (error) {
    printJson({
      schemaVersion: SCHEMA_VERSION,
      kind: 'quarcs.e2e.business-cli.error',
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    })
    process.exitCode = 1
  }
}

await main()
