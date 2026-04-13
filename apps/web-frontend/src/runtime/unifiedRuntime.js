const MAX_LOGS = 500
const MAX_ERRORS = 50
const MAX_RECENT_OPERATIONS = 120

const DEVICE_TYPES = ['MainCamera', 'Guider', 'Mount', 'Focuser', 'Telescopes', 'CFW', 'PoleCamera', 'System']
const TERMINAL_STATUSES = new Set(['succeeded', 'failed', 'cancelled'])
const ACTIVE_STATUSES = new Set(['running', 'waiting'])

function nowIso() {
  return new Date().toISOString()
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function defaultRuntime() {
  return {
    version: 1,
    sequence: 0,
    logSequence: 0,
    updatedAt: nowIso(),
    websocketState: 'unknown',
    recentMessages: [],
    operationsByKey: {},
    latestOperationKeyByBase: {},
    recentOperationKeys: [],
    logs: [],
    lastErrors: [],
  }
}

function getWindowObject() {
  if (typeof window === 'undefined') return null
  return window
}

function commit(runtime) {
  runtime.updatedAt = nowIso()
  const win = getWindowObject()
  if (win) win.__QUARCS_UNIFIED_RUNTIME__ = runtime
  return runtime
}

export function ensureUnifiedRuntime() {
  const win = getWindowObject()
  if (!win) return defaultRuntime()
  if (!win.__QUARCS_UNIFIED_RUNTIME__ || typeof win.__QUARCS_UNIFIED_RUNTIME__ !== 'object') {
    win.__QUARCS_UNIFIED_RUNTIME__ = defaultRuntime()
  }
  return commit(win.__QUARCS_UNIFIED_RUNTIME__)
}

function touchRecentOperation(runtime, key) {
  runtime.recentOperationKeys = runtime.recentOperationKeys.filter((item) => item !== key)
  runtime.recentOperationKeys.unshift(key)
  if (runtime.recentOperationKeys.length > MAX_RECENT_OPERATIONS) {
    runtime.recentOperationKeys.length = MAX_RECENT_OPERATIONS
  }
}

function recordError(runtime, entry) {
  runtime.lastErrors.unshift(entry)
  if (runtime.lastErrors.length > MAX_ERRORS) runtime.lastErrors.length = MAX_ERRORS
}

function inferDeviceTypeFromText(text) {
  const source = String(text || '')
  for (const deviceType of DEVICE_TYPES) {
    if (source.includes(deviceType)) return deviceType
  }
  if (/focuser|focus/i.test(source)) return 'Focuser'
  if (/mount|telescope/i.test(source)) return 'Mount'
  if (/guider/i.test(source)) return 'Guider'
  if (/camera/i.test(source)) return 'MainCamera'
  if (/polar/i.test(source)) return 'Mount'
  return 'System'
}

function baseKey(operationType, deviceType) {
  return `${deviceType || 'System'}::${operationType || 'unknown'}`
}

function getLatestOperation(runtime, operationType, deviceType) {
  const key = runtime.latestOperationKeyByBase[baseKey(operationType, deviceType)]
  return key ? runtime.operationsByKey[key] || null : null
}

function createOperation(runtime, operationType, deviceType, patch = {}) {
  const base = baseKey(operationType, deviceType)
  const key = `${base}#${++runtime.sequence}`
  const ts = nowIso()
  const op = {
    operationKey: key,
    operationType,
    deviceType: deviceType || 'System',
    status: patch.status || 'running',
    startedAt: patch.startedAt || ts,
    updatedAt: ts,
    completedAt: patch.completedAt || null,
    message: patch.message || '',
    error: patch.error || null,
    completionEvidence: patch.completionEvidence || null,
    sourceMessages: Array.isArray(patch.sourceMessages) ? patch.sourceMessages.slice(0, 10) : [],
    progress: patch.progress ?? null,
    rawState: patch.rawState ?? null,
    rawStatus: patch.rawStatus ?? null,
  }
  runtime.operationsByKey[key] = op
  runtime.latestOperationKeyByBase[base] = key
  touchRecentOperation(runtime, key)
  if (op.status === 'failed' && op.error) {
    recordError(runtime, {
      operationKey: key,
      deviceType: op.deviceType,
      operationType: op.operationType,
      message: op.error,
      timestamp: ts,
    })
  }
  return op
}

function appendSourceMessage(op, rawMessage) {
  if (!rawMessage) return
  const next = op.sourceMessages.filter((item) => item !== rawMessage)
  next.unshift(rawMessage)
  op.sourceMessages = next.slice(0, 10)
}

function upsertOperation(runtime, operationType, deviceType, patch = {}, options = {}) {
  const latest = getLatestOperation(runtime, operationType, deviceType)
  const shouldCreate = !latest || (!options.reuseTerminal && TERMINAL_STATUSES.has(latest.status))
  const op = shouldCreate ? createOperation(runtime, operationType, deviceType, patch) : latest
  Object.assign(op, patch)
  op.updatedAt = nowIso()
  if (patch.error && patch.status === 'failed') {
    op.completedAt = op.completedAt || op.updatedAt
    recordError(runtime, {
      operationKey: op.operationKey,
      deviceType: op.deviceType,
      operationType: op.operationType,
      message: patch.error,
      timestamp: op.updatedAt,
    })
  }
  if (patch.status && TERMINAL_STATUSES.has(patch.status)) {
    op.completedAt = patch.completedAt || op.updatedAt
  }
  if (options.rawMessage) appendSourceMessage(op, options.rawMessage)
  touchRecentOperation(runtime, op.operationKey)
  return op
}

function completeOperation(runtime, operationType, deviceType, status, patch = {}, rawMessage = '') {
  return upsertOperation(
    runtime,
    operationType,
    deviceType,
    {
      ...patch,
      status,
      completedAt: patch.completedAt || nowIso(),
    },
    { rawMessage },
  )
}

function appendLog(runtime, entry) {
  runtime.logSequence = Number.isFinite(runtime.logSequence) ? runtime.logSequence + 1 : 1
  entry.sequence = runtime.logSequence
  runtime.logs.unshift(entry)
  if (runtime.logs.length > MAX_LOGS) runtime.logs.length = MAX_LOGS
}

function logEntry(source, level, message, extra = {}) {
  return {
    source,
    level,
    message,
    timestamp: nowIso(),
    deviceType: extra.deviceType || inferDeviceTypeFromText(message),
    operationKey: extra.operationKey || null,
    rawMessage: extra.rawMessage || message,
  }
}

function findActiveOperation(runtime, deviceType, candidates) {
  for (const operationType of candidates) {
    const op = getLatestOperation(runtime, operationType, deviceType)
    if (op && ACTIVE_STATUSES.has(op.status)) return op
  }
  return null
}

function parseClientCommand(runtime, command) {
  const raw = String(command || '').trim()
  if (!raw) return null
  if (raw.startsWith('ConnectDriver:')) {
    const parts = raw.split(':')
    return upsertOperation(runtime, 'connect-driver', parts[2] || inferDeviceTypeFromText(raw), {
      status: 'running',
      message: raw,
      completionEvidence: 'ws-message',
    }, { rawMessage: raw })
  }
  if (raw.startsWith('DisconnectDevice:')) {
    const parts = raw.split(':')
    return upsertOperation(runtime, 'disconnect-driver', parts[2] || inferDeviceTypeFromText(raw), {
      status: 'running',
      message: raw,
      completionEvidence: 'ws-message',
    }, { rawMessage: raw })
  }
  if (raw === 'disconnectAllDevice') {
    return upsertOperation(runtime, 'disconnect-all', 'System', {
      status: 'running',
      message: raw,
      completionEvidence: 'ws-message',
    }, { rawMessage: raw })
  }
  if (raw === 'focusMoveToMin') return upsertOperation(runtime, 'move-to-min', 'Focuser', { status: 'running', message: raw, completionEvidence: 'mixed' }, { rawMessage: raw })
  if (raw === 'focusMoveToMax') return upsertOperation(runtime, 'move-to-max', 'Focuser', { status: 'running', message: raw, completionEvidence: 'mixed' }, { rawMessage: raw })
  if (raw === 'focusSetTravelRange') return upsertOperation(runtime, 'travel-range', 'Focuser', { status: 'running', message: raw, completionEvidence: 'mixed' }, { rawMessage: raw })
  if (raw === 'StartAutoPolarAlignment') return upsertOperation(runtime, 'polar-axis-calibration', 'Mount', { status: 'running', message: raw, completionEvidence: 'ws-message' }, { rawMessage: raw })
  if (raw === 'StopAutoPolarAlignment') return upsertOperation(runtime, 'polar-axis-calibration', 'Mount', { status: 'cancelled', message: raw, completionEvidence: 'ws-message' }, { rawMessage: raw })
  if (raw === 'MountPark') return upsertOperation(runtime, 'park', 'Mount', { status: 'running', message: raw, completionEvidence: 'mixed' }, { rawMessage: raw })
  if (raw === 'MountTrack') return upsertOperation(runtime, 'track', 'Mount', { status: 'running', message: raw, completionEvidence: 'mixed' }, { rawMessage: raw })
  if (raw === 'MountHome') return upsertOperation(runtime, 'home', 'Mount', { status: 'running', message: raw, completionEvidence: 'mixed' }, { rawMessage: raw })
  if (raw === 'MountSYNC') return upsertOperation(runtime, 'sync', 'Mount', { status: 'running', message: raw, completionEvidence: 'mixed' }, { rawMessage: raw })
  if (raw.startsWith('MountGoto:')) return upsertOperation(runtime, 'goto', 'Mount', { status: 'running', message: raw, completionEvidence: 'mixed' }, { rawMessage: raw })
  if (raw === 'MountSpeedSwitch') return upsertOperation(runtime, 'set-speed', 'Mount', { status: 'running', message: raw, completionEvidence: 'mixed' }, { rawMessage: raw })
  if (raw.startsWith('SetConnectionMode:')) {
    const parts = raw.split(':')
    return upsertOperation(runtime, 'set-connection-mode', parts[1] || inferDeviceTypeFromText(raw), {
      status: 'running',
      message: raw,
      completionEvidence: 'ws-message',
    }, { rawMessage: raw })
  }
  if (/^MountMove(West|East)$/.test(raw)) return upsertOperation(runtime, 'move-ra', 'Mount', { status: 'running', message: raw, completionEvidence: 'mixed' }, { rawMessage: raw })
  if (/^MountMove(North|South)$/.test(raw)) return upsertOperation(runtime, 'move-dec', 'Mount', { status: 'running', message: raw, completionEvidence: 'mixed' }, { rawMessage: raw })
  if (raw === 'MountMoveAbort' || raw.startsWith('MountMoveRAStop:') || raw.startsWith('MountMoveDECStop:')) {
    const ra = findActiveOperation(runtime, 'Mount', ['move-ra'])
    const dec = findActiveOperation(runtime, 'Mount', ['move-dec'])
    if (ra) completeOperation(runtime, ra.operationType, 'Mount', 'succeeded', { message: raw, completionEvidence: 'ws-message' }, raw)
    if (dec) completeOperation(runtime, dec.operationType, 'Mount', 'succeeded', { message: raw, completionEvidence: 'ws-message' }, raw)
    return ra || dec
  }
  return null
}

function parseClientLog(runtime, level, message) {
  const raw = String(message || '').trim()
  if (!raw) return null
  if (raw.startsWith('Start Connecting driver:')) {
    const parts = raw.replace('Start Connecting driver:', '').trim().split(/\s+/)
    return upsertOperation(runtime, 'connect-driver', parts[0] || inferDeviceTypeFromText(raw), {
      status: 'running',
      message: raw,
      completionEvidence: 'ws-message',
    }, { rawMessage: raw })
  }
  if (raw.startsWith('connectDriverSuccess:')) {
    const deviceType = raw.split(':')[1] || inferDeviceTypeFromText(raw)
    return completeOperation(runtime, 'connect-driver', deviceType, 'succeeded', { message: raw, completionEvidence: 'ws-message' }, raw)
  }
  if (raw.startsWith('connectDriverFailed:')) {
    const parts = raw.split(':')
    const deviceType = parts.length >= 3 ? parts[1] : inferDeviceTypeFromText(raw)
    const error = parts.length >= 3 ? parts.slice(2).join(':') : raw
    return completeOperation(runtime, 'connect-driver', deviceType, 'failed', { message: raw, error, completionEvidence: 'ws-message' }, raw)
  }
  if (raw === 'Disconnect All Device') return upsertOperation(runtime, 'disconnect-all', 'System', { status: 'running', message: raw, completionEvidence: 'mixed' }, { rawMessage: raw })
  if (raw === 'Starting focuser travel range calibration') return upsertOperation(runtime, 'travel-range', 'Focuser', { status: 'running', message: raw, completionEvidence: 'mixed' }, { rawMessage: raw })
  if (raw === 'Calibration Step 1: Moving to minimum position') return upsertOperation(runtime, 'move-to-min', 'Focuser', { status: 'running', message: raw, completionEvidence: 'mixed' }, { rawMessage: raw })
  if (raw === 'Calibration Step 2: Moving to maximum position') return upsertOperation(runtime, 'move-to-max', 'Focuser', { status: 'running', message: raw, completionEvidence: 'mixed' }, { rawMessage: raw })
  if (raw === 'Calibration Step 3: Travel range set successfully' || raw === 'Focuser travel range set successfully') return completeOperation(runtime, 'travel-range', 'Focuser', 'succeeded', { message: raw, completionEvidence: 'ws-message' }, raw)
  if (raw === 'Mount Park') return upsertOperation(runtime, 'park', 'Mount', { status: 'running', message: raw, completionEvidence: 'mixed' }, { rawMessage: raw })
  if (raw === 'Mount Truck') return upsertOperation(runtime, 'track', 'Mount', { status: 'running', message: raw, completionEvidence: 'mixed' }, { rawMessage: raw })
  if (raw === 'Mount Home') return upsertOperation(runtime, 'home', 'Mount', { status: 'running', message: raw, completionEvidence: 'mixed' }, { rawMessage: raw })
  if (raw === 'Mount SYNC' || raw === 'Mount Solve SYNC') return upsertOperation(runtime, raw === 'Mount SYNC' ? 'sync' : 'solve-sync', 'Mount', { status: 'running', message: raw, completionEvidence: 'mixed' }, { rawMessage: raw })
  if (raw.startsWith('Mount Move RA')) return upsertOperation(runtime, 'move-ra', 'Mount', { status: 'running', message: raw, completionEvidence: 'mixed' }, { rawMessage: raw })
  if (raw.startsWith('Mount Move DEC')) return upsertOperation(runtime, 'move-dec', 'Mount', { status: 'running', message: raw, completionEvidence: 'mixed' }, { rawMessage: raw })
  if (raw === 'Mount Move Abort') {
    const ra = findActiveOperation(runtime, 'Mount', ['move-ra'])
    const dec = findActiveOperation(runtime, 'Mount', ['move-dec'])
    if (ra) completeOperation(runtime, 'move-ra', 'Mount', 'cancelled', { message: raw, completionEvidence: 'mixed' }, raw)
    if (dec) completeOperation(runtime, 'move-dec', 'Mount', 'cancelled', { message: raw, completionEvidence: 'mixed' }, raw)
    return ra || dec
  }
  if (raw.startsWith('Mount Stop RA')) return completeOperation(runtime, 'move-ra', 'Mount', 'succeeded', { message: raw, completionEvidence: 'mixed' }, raw)
  if (raw.startsWith('Mount Stop DEC')) return completeOperation(runtime, 'move-dec', 'Mount', 'succeeded', { message: raw, completionEvidence: 'mixed' }, raw)
  if (raw.startsWith('SetConnectionMode:')) {
    const parts = raw.split(':')
    return upsertOperation(runtime, 'set-connection-mode', parts[1] || inferDeviceTypeFromText(raw), { status: 'running', message: raw, completionEvidence: 'ws-message' }, { rawMessage: raw })
  }
  if (raw.startsWith('SetConnectionModeSuccess:')) {
    const parts = raw.split(':')
    return completeOperation(runtime, 'set-connection-mode', parts[1] || inferDeviceTypeFromText(raw), 'succeeded', { message: raw, completionEvidence: 'ws-message' }, raw)
  }
  return null
}

function classifyPolarAlignmentOutcome(message, stateToken) {
  const text = `${stateToken || ''} ${message || ''}`.toLowerCase()
  if (!text.trim()) return 'unknown'
  if (/fail|error|错误|失败|invalid|nullptr|not set|不可用|无法/.test(text)) return 'failed'
  if (/stop|cancel|用户|停止|已停止|暂停|intervention/.test(text)) return 'cancelled'
  if (/complete|completed|success|完成|已完成/.test(text)) return 'succeeded'
  return 'unknown'
}

export function recordClientCommand(command) {
  const runtime = ensureUnifiedRuntime()
  parseClientCommand(runtime, command)
  return commit(runtime)
}

export function recordClientLog(level, message) {
  const runtime = ensureUnifiedRuntime()
  const op = parseClientLog(runtime, level, message)
  appendLog(runtime, logEntry('client', level, message, {
    operationKey: op ? op.operationKey : null,
    deviceType: op ? op.deviceType : inferDeviceTypeFromText(message),
  }))
  return commit(runtime)
}

export function setUnifiedWebSocketState(state, detail = '') {
  const runtime = ensureUnifiedRuntime()
  runtime.websocketState = state || 'unknown'
  if (detail) runtime.recentMessages.unshift(`${nowIso()} ${detail}`)
  runtime.recentMessages = runtime.recentMessages.slice(0, 50)
  return commit(runtime)
}

export function recordServerRawMessage(rawMessage) {
  const runtime = ensureUnifiedRuntime()
  const raw = String(rawMessage || '').trim()
  if (!raw) return commit(runtime)
  runtime.recentMessages.unshift(raw)
  runtime.recentMessages = runtime.recentMessages.slice(0, 50)

  let op = null
  if (raw.startsWith('CaptureTrace:')) {
    appendLog(runtime, logEntry('server', 'info', raw, {
      rawMessage: raw,
      deviceType: 'MainCamera',
    }))
    return commit(runtime)
  }
  if (raw.startsWith('SendDebugMessage|')) {
    const parts = raw.split('|')
    if (parts.length >= 3) {
      appendLog(runtime, logEntry('server', String(parts[1] || 'info').toLowerCase(), parts.slice(2).join('|'), {
        rawMessage: raw,
      }))
    }
    return commit(runtime)
  }
  if (raw.startsWith('ConnectDriverSuccess:')) {
    const deviceType = raw.split(':')[1] || inferDeviceTypeFromText(raw)
    op = completeOperation(runtime, 'connect-driver', deviceType, 'succeeded', { message: raw, completionEvidence: 'ws-message' }, raw)
  } else if (raw.startsWith('ConnectDriverFailed:')) {
    const parts = raw.split(':')
    const deviceType = parts.length >= 3 ? parts[1] : inferDeviceTypeFromText(raw)
    const error = parts.length >= 3 ? parts.slice(2).join(':') : raw
    op = completeOperation(runtime, 'connect-driver', deviceType, 'failed', { message: raw, error, completionEvidence: 'ws-message' }, raw)
  } else if (raw.startsWith('DisconnectDriverSuccess:')) {
    const deviceType = raw.split(':')[1] || inferDeviceTypeFromText(raw)
    op = completeOperation(runtime, deviceType === 'all' ? 'disconnect-all' : 'disconnect-driver', deviceType === 'all' ? 'System' : deviceType, 'succeeded', { message: raw, completionEvidence: 'ws-message' }, raw)
  } else if (raw.startsWith('DisconnectDriverFail:')) {
    const deviceType = raw.split(':')[1] || inferDeviceTypeFromText(raw)
    op = completeOperation(runtime, 'disconnect-driver', deviceType, 'failed', { message: raw, error: raw, completionEvidence: 'ws-message' }, raw)
  } else if (raw === 'focusMoveToMinStarted') {
    op = upsertOperation(runtime, 'move-to-min', 'Focuser', { status: 'running', message: raw, completionEvidence: 'ws-message' }, { rawMessage: raw })
  } else if (raw === 'focusMoveToMaxStarted') {
    op = upsertOperation(runtime, 'move-to-max', 'Focuser', { status: 'running', message: raw, completionEvidence: 'ws-message' }, { rawMessage: raw })
  } else if (raw === 'focusSetTravelRangeStarted') {
    op = upsertOperation(runtime, 'travel-range', 'Focuser', { status: 'running', message: raw, completionEvidence: 'ws-message' }, { rawMessage: raw })
  } else if (raw.startsWith('FocusPosition:')) {
    const parts = raw.split(':')
    const position = parts[1] || ''
    const active = findActiveOperation(runtime, 'Focuser', ['move-to-min', 'move-to-max', 'travel-range'])
    if (active) {
      op = upsertOperation(runtime, active.operationType, 'Focuser', {
        status: 'running',
        message: `FocusPosition:${position}`,
        completionEvidence: 'mixed',
      }, { rawMessage: raw, reuseTerminal: true })
    }
  } else if (raw.startsWith('focusMoveFailed:')) {
    const error = raw.substring('focusMoveFailed:'.length)
    const active = findActiveOperation(runtime, 'Focuser', ['move-to-min', 'move-to-max', 'travel-range'])
    op = completeOperation(runtime, active ? active.operationType : 'move', 'Focuser', 'failed', { message: raw, error, completionEvidence: 'ws-message' }, raw)
  } else if (raw.startsWith('FocusMoveToLimit:')) {
    const active = findActiveOperation(runtime, 'Focuser', ['move-to-min', 'move-to-max'])
    op = completeOperation(runtime, active ? active.operationType : 'move', 'Focuser', 'succeeded', { message: raw, completionEvidence: 'ws-message' }, raw)
  } else if (raw === 'focusSetTravelRangeSuccess') {
    op = completeOperation(runtime, 'travel-range', 'Focuser', 'succeeded', { message: raw, completionEvidence: 'ws-message' }, raw)
  } else if (raw.startsWith('TelescopePark:')) {
    op = completeOperation(runtime, 'park', 'Mount', 'succeeded', { message: raw, rawState: raw.split(':')[1] || null, completionEvidence: 'mixed' }, raw)
  } else if (raw.startsWith('TelescopeTrack:')) {
    op = completeOperation(runtime, 'track', 'Mount', 'succeeded', { message: raw, rawState: raw.split(':')[1] || null, completionEvidence: 'mixed' }, raw)
  } else if (raw.startsWith('MountSetSpeedSuccess:')) {
    op = completeOperation(runtime, 'set-speed', 'Mount', 'succeeded', { message: raw, completionEvidence: 'ws-message' }, raw)
  } else if (raw.startsWith('SetConnectionModeSuccess:')) {
    const parts = raw.split(':')
    op = completeOperation(runtime, 'set-connection-mode', parts[1] || inferDeviceTypeFromText(raw), 'succeeded', { message: raw, rawState: parts[2] || null, completionEvidence: 'ws-message' }, raw)
  } else if (raw.startsWith('SetConnectionModeFailed:')) {
    const parts = raw.split(':')
    op = completeOperation(runtime, 'set-connection-mode', parts[1] || inferDeviceTypeFromText(raw), 'failed', { message: raw, error: parts.slice(2).join(':'), completionEvidence: 'ws-message' }, raw)
  } else if (raw.startsWith('StartAutoPolarAlignmentStatus:')) {
    const parts = raw.split(':')
    const ok = parts[1] === 'true'
    const message = parts.slice(2).join(':')
    op = upsertOperation(runtime, 'polar-axis-calibration', 'Mount', {
      status: ok ? 'running' : 'failed',
      message,
      error: ok ? null : message,
      completionEvidence: 'ws-message',
      rawStatus: parts[1] || null,
    }, { rawMessage: raw })
  } else if (raw.startsWith('PolarAlignmentState:')) {
    const parts = raw.split(':')
    if (parts.length >= 5) {
      const isRunning = parts[1] === 'true'
      const stateToken = parts[2]
      const message = parts[3]
      const progress = Number(parts[4])
      if (isRunning) {
        op = upsertOperation(runtime, 'polar-axis-calibration', 'Mount', {
          status: 'running',
          message,
          progress: Number.isFinite(progress) ? progress : null,
          rawState: stateToken,
          completionEvidence: 'ws-message',
        }, { rawMessage: raw })
      } else {
        const outcome = classifyPolarAlignmentOutcome(message, stateToken)
        const terminal = outcome === 'unknown' ? 'succeeded' : outcome
        op = completeOperation(runtime, 'polar-axis-calibration', 'Mount', terminal, {
          message,
          error: terminal === 'failed' ? message : null,
          progress: Number.isFinite(progress) ? progress : null,
          rawState: stateToken,
          completionEvidence: 'ws-message',
        }, raw)
      }
    }
  } else if (raw.startsWith('PolarAlignmentGuidanceStepProgress:')) {
    const parts = raw.split(':')
    if (parts.length >= 4) {
      op = upsertOperation(runtime, 'polar-axis-calibration', 'Mount', {
        status: 'running',
        message: parts[2],
        progress: Number(parts[1]) || null,
        completionEvidence: 'ws-message',
      }, { rawMessage: raw })
    }
  } else if (raw.startsWith('GuiderStatus:')) {
    op = upsertOperation(runtime, 'guiding', 'Guider', {
      status: 'running',
      message: raw.split(':').slice(1).join(':'),
      completionEvidence: 'mixed',
    }, { rawMessage: raw, reuseTerminal: true })
  } else if (raw.startsWith('GuiderSwitchStatus:')) {
    const value = raw.split(':')[1]
    op = upsertOperation(runtime, 'guiding', 'Guider', {
      status: value === 'true' ? 'running' : 'succeeded',
      message: raw,
      completionEvidence: 'mixed',
    }, { rawMessage: raw })
  } else if (raw.startsWith('GuiderLoopExpStatus:')) {
    const value = raw.split(':')[1]
    op = upsertOperation(runtime, 'loop-exposure', 'Guider', {
      status: value === 'true' ? 'running' : 'succeeded',
      message: raw,
      completionEvidence: 'mixed',
    }, { rawMessage: raw })
  } else if (raw === 'ExposureCompleted') {
    op = completeOperation(runtime, 'capture-exposure', 'MainCamera', 'succeeded', { message: raw, completionEvidence: 'ws-message' }, raw)
  } else if (raw.startsWith('CaptureImageSaveStatus:')) {
    const statusText = raw.split(':').slice(1).join(':')
    const isFail = !/success|ok/i.test(statusText)
    op = completeOperation(runtime, 'capture-save', 'MainCamera', isFail ? 'failed' : 'succeeded', {
      message: raw,
      error: isFail ? statusText : null,
      completionEvidence: 'ws-message',
    }, raw)
  }

  if (op) {
    appendLog(runtime, logEntry('server', op.status === 'failed' ? 'error' : 'info', op.message || raw, {
      operationKey: op.operationKey,
      deviceType: op.deviceType,
      rawMessage: raw,
    }))
  }
  return commit(runtime)
}

export function getUnifiedRuntimeState() {
  return clone(ensureUnifiedRuntime())
}
