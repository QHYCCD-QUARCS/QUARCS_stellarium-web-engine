import { expect, test } from '@playwright/test'
import {
  equatorialRelativeTrajectory,
  projectOriginOntoLine,
  unwrapAngleSequence,
} from '../../src/domain/polar-alignment/polarAlignmentMath.js'

test('angle sequence stays continuous across the 360 degree boundary', () => {
  expect(unwrapAngleSequence([179, -179, -178])).toEqual([179, 181, 182])
  expect(unwrapAngleSequence([-179, 179, 178])).toEqual([-179, -181, -182])
})

test('equatorial fallback trajectory is relative to target and unwrapped', () => {
  expect(equatorialRelativeTrajectory([
    { ra: 359, dec: 11 },
    { ra: 1, dec: 12 },
  ], { ra: 180, dec: 10 })).toEqual([
    { x: 179, y: 1 },
    { x: 181, y: 2 },
  ])
})

test('origin projection identifies perpendicular foot and required extension', () => {
  expect(projectOriginOntoLine({ x: -1, y: 1 }, { x: 1, y: 1 })).toMatchObject({
    foot: { x: 0, y: 1 }, extension: null, ratio: 0.5,
  })
  expect(projectOriginOntoLine({ x: 1, y: 1 }, { x: 2, y: 1 })).toMatchObject({
    foot: { x: 0, y: 1 }, extension: { x1: 0, y1: 1, x2: 1, y2: 1 },
  })
  expect(projectOriginOntoLine({ x: 1, y: 1 }, { x: 1, y: 1 })).toBeNull()
})
