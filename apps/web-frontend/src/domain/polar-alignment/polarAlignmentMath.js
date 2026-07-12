export function normalizeAngleDelta(deltaDeg) {
  return ((deltaDeg + 540) % 360) - 180
}

export function addVector3(a, b) {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }
}

export function subtractVector3(a, b) {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }
}

export function scaleVector3(vector, scale) {
  return { x: vector.x * scale, y: vector.y * scale, z: vector.z * scale }
}

export function dotProduct3(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z
}

export function crossProduct3(a, b) {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  }
}

export function vectorLength3(vector) {
  return Math.sqrt(vector.x * vector.x + vector.y * vector.y + vector.z * vector.z)
}

export function normalizeVector3(vector) {
  const length = vectorLength3(vector)
  return { x: vector.x / length, y: vector.y / length, z: vector.z / length }
}

export function horizontalToCartesian(azDeg, altDeg, radius = 1) {
  const azRad = azDeg * Math.PI / 180
  const altRad = altDeg * Math.PI / 180
  const cosAlt = Math.cos(altRad)
  return {
    x: radius * Math.sin(azRad) * cosAlt,
    y: radius * Math.cos(azRad) * cosAlt,
    z: radius * Math.sin(altRad),
  }
}

export function cartesianToHorizontal(cartesian) {
  const radius = vectorLength3(cartesian)
  if (!Number.isFinite(radius) || radius <= 0) return { az: NaN, alt: NaN }
  const alt = Math.asin(Math.max(-1, Math.min(1, cartesian.z / radius))) * 180 / Math.PI
  let az = Math.atan2(cartesian.x, cartesian.y) * 180 / Math.PI
  if (az < 0) az += 360
  return { az, alt }
}

export function alignmentScaleForDistance(distanceDeg) {
  const tenArcminDeg = 10 / 60
  const oneArcminDeg = 1 / 60
  const tenArcsecDeg = 10 / 3600
  const sixtyArcsecDeg = 60 / 3600
  if (distanceDeg >= 1) return { stage: 'deg_10_1', outerRingDeg: 10, innerRingDeg: 1, color: '#FFD54F' }
  if (distanceDeg >= tenArcminDeg) return { stage: 'arcmin_60_10', outerRingDeg: 1, innerRingDeg: tenArcminDeg, color: '#FFD54F' }
  if (distanceDeg > oneArcminDeg) return { stage: 'arcmin_10_1', outerRingDeg: tenArcminDeg, innerRingDeg: oneArcminDeg, color: '#FFD54F' }
  if (distanceDeg >= tenArcsecDeg) {
    return { stage: 'arcsec_60_10', outerRingDeg: sixtyArcsecDeg, innerRingDeg: tenArcsecDeg, color: '#4CAF50' }
  }
  return { stage: 'arcsec_10_1', outerRingDeg: tenArcsecDeg, innerRingDeg: 1 / 3600, color: '#4CAF50' }
}

export function unwrapAngleSequence(values) {
  if (!values || values.length === 0) return []
  const unwrapped = [values[0]]
  for (let index = 1; index < values.length; index++) {
    let current = values[index]
    const previous = unwrapped[index - 1]
    while (current - previous > 180) current -= 360
    while (current - previous < -180) current += 360
    unwrapped.push(current)
  }
  return unwrapped
}

export function equatorialRelativeTrajectory(rawPoints, target) {
  if (!target || !rawPoints || rawPoints.length === 0) return []
  const raDeltas = rawPoints.map(point => normalizeAngleDelta(point.ra - target.ra))
  const unwrappedRa = unwrapAngleSequence(raDeltas)
  return rawPoints.map((point, index) => ({
    x: unwrappedRa[index],
    y: point.dec - target.dec,
  }))
}

export function projectOriginOntoLine(start, end) {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const lengthSquared = dx * dx + dy * dy
  if (lengthSquared < 1e-9) return null
  const ratio = -(start.x * dx + start.y * dy) / lengthSquared
  const foot = { x: start.x + ratio * dx, y: start.y + ratio * dy }
  let extension = null
  if (ratio < 0) extension = { x1: foot.x, y1: foot.y, x2: start.x, y2: start.y }
  if (ratio > 1) extension = { x1: end.x, y1: end.y, x2: foot.x, y2: foot.y }
  return { foot, extension, ratio }
}
