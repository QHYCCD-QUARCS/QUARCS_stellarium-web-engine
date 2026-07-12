export function normalizeCaptureTraceValue(value) {
  if (value == null) return ''
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : ''
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch (error) {
      return String(value)
    }
  }
  return String(value)
}

function nowPerformanceMs() {
  return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()
}

export function sendCaptureTraceLog(context, parts, type = 'info') {
  const cleaned = parts.filter(part => part !== '')
  if (!cleaned.length) return
  context.SendConsoleLogMsg(cleaned.join(' | '), type)
}

export function startCaptureTrace(context, payload = {}) {
  const traceId = String(payload.traceId || '').trim()
  if (!traceId) return
  context.captureTrace = {
    traceId,
    startedAtPerf: nowPerformanceMs(),
    startedAtEpochMs: Date.now(),
    mode: String(payload.mode || 'Single'),
    exposureMs: Number(payload.exposureMs) || 0,
    burstFrames: Math.max(1, Number(payload.burstFrames) || 1),
    sessionId: null,
    frameId: null,
    lastBackendTileGpmSentAtMs: null,
    z0FetchLogged: false,
    z0RenderLogged: false,
  }
  sendCaptureTraceLog(context, [
    context.captureTraceKeyword,
    `traceId=${traceId}`,
    'stage=frontend_click',
    'frontendElapsedMs=0',
    `mode=${context.captureTrace.mode}`,
    `exposureMs=${context.captureTrace.exposureMs}`,
    `burstFrames=${context.captureTrace.burstFrames}`,
  ])
}

export function emitCaptureTrace(context, stage, extra = {}, type = 'info') {
  if (!context.captureTrace || !context.captureTrace.traceId) return
  const elapsed = Math.max(0, nowPerformanceMs() - context.captureTrace.startedAtPerf)
  const parts = [
    context.captureTraceKeyword,
    `traceId=${context.captureTrace.traceId}`,
    `stage=${stage}`,
    `frontendElapsedMs=${elapsed.toFixed(2)}`,
  ]
  Object.entries(extra || {}).forEach(([key, value]) => {
    const normalized = normalizeCaptureTraceValue(value)
    if (normalized !== '') parts.push(`${key}=${normalized}`)
  })
  sendCaptureTraceLog(context, parts, type)
}

export function parseCaptureCommand(message) {
  if (typeof message !== 'string') return null
  const command = message.trim()
  if (!command) return null

  if (command.startsWith('takeExposureBurst:')) {
    const parts = command.split(':')
    if (parts.length < 4 || !String(parts[3] || '').trim()) return null
    return {
      command,
      traceId: parts[3],
      mode: 'Burst',
      exposureMs: Number(parts[1]) || 0,
      burstFrames: Math.max(1, Number(parts[2]) || 1),
    }
  }

  if (command.startsWith('takeExposure:')) {
    const parts = command.split(':')
    if (parts.length < 3 || !String(parts[2] || '').trim()) return null
    return {
      command,
      traceId: parts[2],
      mode: 'Single',
      exposureMs: Number(parts[1]) || 0,
      burstFrames: 1,
    }
  }

  return null
}

export function ensureCaptureTraceForCommand(context, message) {
  if (context.captureTrace && context.captureTrace.traceId) return false
  const payload = parseCaptureCommand(message)
  if (!payload) return false
  startCaptureTrace(context, payload)
  emitCaptureTrace(context, 'frontend_click_fallback', { command: payload.command })
  return true
}

export function parseBackendCaptureTrace(parts) {
  if (!parts || parts.length < 3) return null
  const traceId = String(parts[1] || '').trim()
  const stage = String(parts[2] || '').trim()
  const backendElapsedMs = parts.length >= 4 ? Number(parts[3]) : NaN
  const detail = parts.length >= 5 ? parts.slice(4).join(':') : ''
  const detailMap = {}

  if (detail) {
    detail.split(',').forEach((segment) => {
      const trimmed = String(segment || '').trim()
      if (!trimmed) return
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx <= 0) return
      const key = trimmed.slice(0, eqIdx).trim()
      const value = trimmed.slice(eqIdx + 1).trim()
      if (key) detailMap[key] = value
    })
  }

  return { traceId, stage, backendElapsedMs, detail, detailMap }
}

export function handleBackendCaptureTrace(context, parts) {
  const parsed = parseBackendCaptureTrace(parts)
  if (!parsed) return
  const { traceId, stage, backendElapsedMs, detail, detailMap } = parsed
  if (
    context.captureTrace &&
    context.captureTrace.traceId === traceId &&
    stage === 'backend_tilegpm_sent' &&
    Number.isFinite(Number(detailMap.serverNowMs))
  ) {
    context.captureTrace.lastBackendTileGpmSentAtMs = Number(detailMap.serverNowMs)
  }
  const extra = {}
  if (Number.isFinite(backendElapsedMs)) extra.backendElapsedMs = backendElapsedMs
  if (detail) extra.detail = detail
  if (context.captureTrace && context.captureTrace.traceId === traceId) {
    emitCaptureTrace(context, stage, extra)
    return
  }
  const logParts = [
    context.captureTraceKeyword,
    `traceId=${traceId || 'unknown'}`,
    `stage=${stage || 'backend_unknown'}`,
  ]
  if (Number.isFinite(backendElapsedMs)) logParts.push(`backendElapsedMs=${backendElapsedMs}`)
  if (detail) logParts.push(`detail=${detail}`)
  sendCaptureTraceLog(context, logParts)
}
