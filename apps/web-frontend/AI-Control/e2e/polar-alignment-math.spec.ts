import { expect, test } from '@playwright/test'
import {
  cartesianToHorizontal,
  crossProduct3,
  dotProduct3,
  horizontalToCartesian,
  normalizeAngleDelta,
  normalizeVector3,
} from '../../src/domain/polar-alignment/polarAlignmentMath.js'

test('angle deltas wrap into the signed half circle', () => {
  expect(normalizeAngleDelta(181)).toBe(-179)
  expect(normalizeAngleDelta(-181)).toBe(179)
})

test('vector operations preserve orthogonality and normalization', () => {
  const x = { x: 1, y: 0, z: 0 }
  const y = { x: 0, y: 1, z: 0 }
  const cross = crossProduct3(x, y)
  expect(cross).toEqual({ x: 0, y: 0, z: 1 })
  expect(dotProduct3(cross, x)).toBe(0)
  expect(normalizeVector3({ x: 0, y: 3, z: 4 })).toEqual({ x: 0, y: 0.6, z: 0.8 })
})

test('horizontal and cartesian coordinates round trip', () => {
  const cartesian = horizontalToCartesian(123, 45, 2)
  const horizontal = cartesianToHorizontal(cartesian)
  expect(horizontal.az).toBeCloseTo(123, 10)
  expect(horizontal.alt).toBeCloseTo(45, 10)
  expect(Number.isNaN(cartesianToHorizontal({ x: 0, y: 0, z: 0 }).az)).toBe(true)
})
