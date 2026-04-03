import { expect, test } from '@playwright/test'
import { normalizeUnifiedRuntimeState } from '../status/unifiedRuntime'

test('normalizeUnifiedRuntimeState 提取活跃操作、最近日志与最近错误', () => {
  const state = normalizeUnifiedRuntimeState({
    version: 2,
    websocketState: 'connected',
    operationsByKey: {
      'Mount::polar-axis-calibration#3': {
        operationKey: 'Mount::polar-axis-calibration#3',
        operationType: 'polar-axis-calibration',
        deviceType: 'Mount',
        status: 'running',
        startedAt: '2026-03-30T10:00:00.000Z',
        updatedAt: '2026-03-30T10:00:05.000Z',
        completedAt: null,
        message: '开始自动极轴校准...',
        error: null,
        completionEvidence: 'ws-message',
        sourceMessages: ['StartAutoPolarAlignmentStatus:true:开始自动极轴校准...'],
        progress: 10,
        rawState: '1',
        rawStatus: 'true',
      },
      'Focuser::travel-range#2': {
        operationKey: 'Focuser::travel-range#2',
        operationType: 'travel-range',
        deviceType: 'Focuser',
        status: 'failed',
        startedAt: '2026-03-30T09:00:00.000Z',
        updatedAt: '2026-03-30T09:00:10.000Z',
        completedAt: '2026-03-30T09:00:10.000Z',
        message: 'focusMoveFailed:focuser is not connected',
        error: 'focuser is not connected',
        completionEvidence: 'ws-message',
        sourceMessages: ['focusMoveFailed:focuser is not connected'],
        progress: null,
        rawState: null,
        rawStatus: null,
      },
    },
    logs: [
      {
        source: 'server',
        level: 'error',
        message: 'focuser is not connected',
        timestamp: '2026-03-30T09:00:10.000Z',
        deviceType: 'Focuser',
        operationKey: 'Focuser::travel-range#2',
        rawMessage: 'focusMoveFailed:focuser is not connected',
      },
    ],
  })

  expect(state.websocketState).toBe('connected')
  expect(state.activeOperations).toHaveLength(1)
  expect(state.activeOperations[0]).toMatchObject({
    operationType: 'polar-axis-calibration',
    deviceType: 'Mount',
    status: 'running',
  })
  expect(state.operationsByDevice.Mount?.[0]?.operationType).toBe('polar-axis-calibration')
  expect(state.lastOperationError?.error).toBe('focuser is not connected')
  expect(state.recentLogs[0]).toMatchObject({
    source: 'server',
    deviceType: 'Focuser',
    operationKey: 'Focuser::travel-range#2',
  })
})

test('normalizeUnifiedRuntimeState 保留极轴校准失败原因', () => {
  const reason = 'Failed to start polar alignment,dpMount or dpMainCamera is nullptr'
  const state = normalizeUnifiedRuntimeState({
    operationsByKey: {
      'Mount::polar-axis-calibration#7': {
        operationKey: 'Mount::polar-axis-calibration#7',
        operationType: 'polar-axis-calibration',
        deviceType: 'Mount',
        status: 'failed',
        startedAt: '2026-03-30T11:00:00.000Z',
        updatedAt: '2026-03-30T11:00:01.000Z',
        completedAt: '2026-03-30T11:00:01.000Z',
        message: reason,
        error: reason,
        completionEvidence: 'ws-message',
        sourceMessages: [`StartAutoPolarAlignmentStatus:false:${reason}`],
        progress: null,
        rawState: null,
        rawStatus: 'false',
      },
    },
  })

  expect(state.lastOperationError).toMatchObject({
    operationType: 'polar-axis-calibration',
    status: 'failed',
    error: reason,
    message: reason,
  })
  expect(state.recentOperationResults[0]?.sourceMessages).toContain(`StartAutoPolarAlignmentStatus:false:${reason}`)
})
