import { expect, test } from '@playwright/test'
import { deriveTileGpmTransition } from '../../src/domain/capture/imagePipelineState.js'

function current(overrides = {}) {
  return {
    gpm: { previewBinningFactor: 2, previewWidth: 800, previewHeight: 600, maxZoomLevel: 4, cfa: 'RGGB' },
    sessionId: 'live_1',
    frameId: 10,
    imageWidth: 1600,
    imageHeight: 1200,
    levelMode: 'auto',
    ...overrides,
  }
}

function next(overrides = {}) {
  return {
    sessionId: 'live_1',
    frameId: 10,
    imageWidth: 1600,
    imageHeight: 1200,
    previewBinningFactor: 2,
    previewWidth: 800,
    previewHeight: 600,
    maxZoomLevel: 4,
    levelMode: 'auto',
    cfa: 'RGGB',
    ...overrides,
  }
}

test('same frame metadata update preserves the current tile session', () => {
  expect(deriveTileGpmTransition(current(), next())).toMatchObject({
    incomingFrameId: 10,
    isNewSession: false,
    isSameFrameUpdate: true,
    isOverwriteFrame: false,
  })
})

test('live frame overwrite is detected without treating it as a new session', () => {
  expect(deriveTileGpmTransition(current(), next({ frameId: 11 }))).toMatchObject({
    isNewSession: false,
    isOverwriteFrame: true,
    isLiveOverwriteFrame: true,
  })
})

test('missing current frame does not look like frame zero', () => {
  expect(deriveTileGpmTransition(current({ frameId: null }), next({ frameId: 0 }))).toMatchObject({
    previousFrameId: null,
    incomingFrameId: 0,
    isSameFrameUpdate: false,
    isOverwriteFrame: false,
  })
})

test('geometry, level mode and CFA changes create a new session boundary', () => {
  expect(deriveTileGpmTransition(current(), next({ previewWidth: 640 })).isNewSession).toBe(true)
  expect(deriveTileGpmTransition(current(), next({ levelMode: 'fixed' })).isNewSession).toBe(true)
  expect(deriveTileGpmTransition(current(), next({ cfa: 'BGGR' })).isNewSession).toBe(true)
})
