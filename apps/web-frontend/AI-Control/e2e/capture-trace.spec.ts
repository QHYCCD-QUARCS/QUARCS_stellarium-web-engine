import { expect, test } from '@playwright/test'
import {
  ensureCaptureTraceForCommand,
  handleBackendCaptureTrace,
  normalizeCaptureTraceValue,
  parseBackendCaptureTrace,
  parseCaptureCommand,
} from '../../src/domain/capture/captureTrace.js'

function createContext() {
  const logs = []
  return {
    context: {
      captureTraceKeyword: 'CaptureTrace',
      captureTrace: null,
      SendConsoleLogMsg(message, type) {
        logs.push({ message, type })
      },
    },
    logs,
  }
}

test('parseCaptureCommand parses single and burst exposure commands', () => {
  expect(parseCaptureCommand('takeExposure:1500:trace-single')).toMatchObject({
    traceId: 'trace-single',
    mode: 'Single',
    exposureMs: 1500,
    burstFrames: 1,
  })
  expect(parseCaptureCommand('takeExposureBurst:800:3:trace-burst')).toMatchObject({
    traceId: 'trace-burst',
    mode: 'Burst',
    exposureMs: 800,
    burstFrames: 3,
  })
  expect(parseCaptureCommand('takeExposure:1000:')).toBeNull()
})

test('parseBackendCaptureTrace preserves detail containing colons', () => {
  expect(parseBackendCaptureTrace([
    'CaptureTrace',
    'trace-1',
    'backend_tilegpm_sent',
    '42.5',
    'serverNowMs=100,path=http://host:8080/image',
  ])).toMatchObject({
    traceId: 'trace-1',
    stage: 'backend_tilegpm_sent',
    backendElapsedMs: 42.5,
    detail: 'serverNowMs=100,path=http://host:8080/image',
    detailMap: {
      serverNowMs: '100',
      path: 'http://host:8080/image',
    },
  })
})

test('normalizeCaptureTraceValue keeps log-safe values', () => {
  expect(normalizeCaptureTraceValue(false)).toBe('false')
  expect(normalizeCaptureTraceValue({ frameId: 7 })).toBe('{"frameId":7}')
  expect(normalizeCaptureTraceValue(Number.NaN)).toBe('')
})

test('ensureCaptureTraceForCommand initializes state and keeps log protocol', () => {
  const { context, logs } = createContext()
  expect(ensureCaptureTraceForCommand(context, 'takeExposureBurst:800:3:trace-2')).toBe(true)
  expect(context.captureTrace).toMatchObject({
    traceId: 'trace-2',
    mode: 'Burst',
    exposureMs: 800,
    burstFrames: 3,
    lastBackendTileGpmSentAtMs: null,
  })
  expect(logs[0].message).toBe(
    'CaptureTrace | traceId=trace-2 | stage=frontend_click | frontendElapsedMs=0 | mode=Burst | exposureMs=800 | burstFrames=3',
  )
  expect(logs[1].message).toContain('stage=frontend_click_fallback')
  expect(logs[1].message).toContain('command=takeExposureBurst:800:3:trace-2')
})

test('handleBackendCaptureTrace updates matching tile timestamp', () => {
  const { context, logs } = createContext()
  ensureCaptureTraceForCommand(context, 'takeExposure:1000:trace-3')
  handleBackendCaptureTrace(context, [
    'CaptureTrace',
    'trace-3',
    'backend_tilegpm_sent',
    '12.5',
    'serverNowMs=123456,tileCount=4',
  ])
  expect(context.captureTrace.lastBackendTileGpmSentAtMs).toBe(123456)
  expect(logs[logs.length - 1]?.message).toContain('stage=backend_tilegpm_sent')
  expect(logs[logs.length - 1]?.message).toContain('backendElapsedMs=12.5')
})
