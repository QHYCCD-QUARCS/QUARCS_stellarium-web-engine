import { expect, test } from '@playwright/test'
import { alignmentScaleForDistance } from '../../src/domain/polar-alignment/polarAlignmentMath.js'

test('alignment scale moves from degrees to arcminutes', () => {
  expect(alignmentScaleForDistance(1)).toMatchObject({ stage: 'deg_10_1', outerRingDeg: 10, innerRingDeg: 1 })
  expect(alignmentScaleForDistance(10 / 60)).toMatchObject({ stage: 'arcmin_60_10', outerRingDeg: 1 })
  expect(alignmentScaleForDistance(2 / 60)).toMatchObject({ stage: 'arcmin_10_1', innerRingDeg: 1 / 60 })
})

test('alignment scale uses arcseconds and turns green within one arcminute', () => {
  expect(alignmentScaleForDistance(1 / 60)).toMatchObject({ stage: 'arcsec_60_10', color: '#4CAF50' })
  expect(alignmentScaleForDistance(5 / 3600)).toMatchObject({
    stage: 'arcsec_10_1', outerRingDeg: 10 / 3600, innerRingDeg: 1 / 3600, color: '#4CAF50',
  })
})

test('alignment scale remains yellow above one arcminute', () => {
  expect(alignmentScaleForDistance((1 / 60) + 1e-9).color).toBe('#FFD54F')
})
