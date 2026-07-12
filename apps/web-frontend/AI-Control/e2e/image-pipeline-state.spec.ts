import { expect, test } from '@playwright/test'
import {
  buildHistogramSnapshotKey,
  combineWhiteBalanceGains,
  createHistogramSnapshot,
} from '../../src/domain/capture/imagePipelineState.js'

test('combineWhiteBalanceGains normalizes and clamps gains', () => {
  expect(combineWhiteBalanceGains(2, 0.5, 2, 0.01)).toEqual({ gainR: 3, gainB: 0.01 })
  expect(combineWhiteBalanceGains(Number.NaN, 2, undefined, 0.5)).toEqual({ gainR: 1, gainB: 1 })
})

test('buildHistogramSnapshotKey requires both identifiers', () => {
  expect(buildHistogramSnapshotKey('session-1', 0)).toBe('session-1::0')
  expect(buildHistogramSnapshotKey('session-1', null)).toBe('')
})

test('createHistogramSnapshot supports mono and multi-channel histograms', () => {
  expect(createHistogramSnapshot([1, 2, 3], { sessionId: 7, frameId: 2, total: 6 })).toMatchObject({
    sessionId: '7', frameId: 2, snapshotKey: '7::2', bins: 3, total: 6,
  })
  expect(createHistogramSnapshot([[1, 2], [3, 4]], { sessionId: 's', frameId: 1 })).toMatchObject({
    bins: 2, counts: [[1, 2], [3, 4]],
  })
  expect(createHistogramSnapshot(null)).toBeNull()
})
