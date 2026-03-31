export type UnifiedOperationStatus = 'idle' | 'running' | 'waiting' | 'succeeded' | 'failed' | 'cancelled' | 'unknown'

export interface UnifiedLogEntry {
  source: 'client' | 'server' | string
  level: string
  message: string
  timestamp: string | null
  deviceType: string | null
  operationKey: string | null
  rawMessage: string | null
}

export interface UnifiedOperationState {
  operationKey: string
  operationType: string
  deviceType: string
  status: UnifiedOperationStatus
  startedAt: string | null
  updatedAt: string | null
  completedAt: string | null
  message: string | null
  error: string | null
  completionEvidence: string | null
  sourceMessages: string[]
  progress: number | null
  rawState: string | null
  rawStatus: string | null
}

export interface UnifiedRuntimeState {
  version: number
  websocketState: string
  activeOperations: UnifiedOperationState[]
  operationsByDevice: Record<string, UnifiedOperationState[]>
  recentOperationResults: UnifiedOperationState[]
  lastOperationError: UnifiedOperationState | null
  recentLogs: UnifiedLogEntry[]
}

export const DEFAULT_UNIFIED_RUNTIME_STATE: UnifiedRuntimeState = {
  version: 1,
  websocketState: 'unknown',
  activeOperations: [],
  operationsByDevice: {},
  recentOperationResults: [],
  lastOperationError: null,
  recentLogs: [],
}

function normalizeLogEntry(raw: unknown): UnifiedLogEntry | null {
  if (!raw || typeof raw !== 'object') return null
  const entry = raw as Record<string, unknown>
  return {
    source: String(entry.source ?? 'server'),
    level: String(entry.level ?? 'info'),
    message: String(entry.message ?? ''),
    timestamp: typeof entry.timestamp === 'string' ? entry.timestamp : null,
    deviceType: typeof entry.deviceType === 'string' ? entry.deviceType : null,
    operationKey: typeof entry.operationKey === 'string' ? entry.operationKey : null,
    rawMessage: typeof entry.rawMessage === 'string' ? entry.rawMessage : null,
  }
}

function normalizeOperation(raw: unknown): UnifiedOperationState | null {
  if (!raw || typeof raw !== 'object') return null
  const op = raw as Record<string, unknown>
  const operationKey = typeof op.operationKey === 'string' ? op.operationKey : null
  const operationType = typeof op.operationType === 'string' ? op.operationType : null
  if (!operationKey || !operationType) return null
  return {
    operationKey,
    operationType,
    deviceType: typeof op.deviceType === 'string' ? op.deviceType : 'System',
    status: (typeof op.status === 'string' ? op.status : 'unknown') as UnifiedOperationStatus,
    startedAt: typeof op.startedAt === 'string' ? op.startedAt : null,
    updatedAt: typeof op.updatedAt === 'string' ? op.updatedAt : null,
    completedAt: typeof op.completedAt === 'string' ? op.completedAt : null,
    message: typeof op.message === 'string' ? op.message : null,
    error: typeof op.error === 'string' ? op.error : null,
    completionEvidence: typeof op.completionEvidence === 'string' ? op.completionEvidence : null,
    sourceMessages: Array.isArray(op.sourceMessages) ? op.sourceMessages.map((item) => String(item)) : [],
    progress: typeof op.progress === 'number' && Number.isFinite(op.progress) ? op.progress : null,
    rawState: typeof op.rawState === 'string' ? op.rawState : null,
    rawStatus: typeof op.rawStatus === 'string' ? op.rawStatus : null,
  }
}

export function normalizeUnifiedRuntimeState(raw: unknown): UnifiedRuntimeState {
  if (!raw || typeof raw !== 'object') return DEFAULT_UNIFIED_RUNTIME_STATE
  const runtime = raw as Record<string, unknown>
  const operationsByKey = runtime.operationsByKey && typeof runtime.operationsByKey === 'object'
    ? Object.values(runtime.operationsByKey as Record<string, unknown>).map(normalizeOperation).filter(Boolean) as UnifiedOperationState[]
    : []
  const sortedOps = operationsByKey.slice().sort((a, b) => {
    const aTime = Date.parse(a.updatedAt ?? a.startedAt ?? '') || 0
    const bTime = Date.parse(b.updatedAt ?? b.startedAt ?? '') || 0
    return bTime - aTime
  })
  const activeOperations = sortedOps.filter((op) => op.status === 'running' || op.status === 'waiting')
  const operationsByDevice = sortedOps.reduce<Record<string, UnifiedOperationState[]>>((acc, op) => {
    const key = op.deviceType || 'System'
    if (!acc[key]) acc[key] = []
    acc[key].push(op)
    return acc
  }, {})
  const recentOperationResults = sortedOps.filter((op) => op.status === 'succeeded' || op.status === 'failed' || op.status === 'cancelled').slice(0, 20)
  const lastOperationError = sortedOps.find((op) => op.status === 'failed' || Boolean(op.error)) ?? null
  const recentLogs = Array.isArray(runtime.logs)
    ? runtime.logs.map(normalizeLogEntry).filter(Boolean).slice(0, 50) as UnifiedLogEntry[]
    : []
  return {
    version: typeof runtime.version === 'number' ? runtime.version : 1,
    websocketState: typeof runtime.websocketState === 'string' ? runtime.websocketState : 'unknown',
    activeOperations,
    operationsByDevice,
    recentOperationResults,
    lastOperationError,
    recentLogs,
  }
}
