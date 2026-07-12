export function normalizeGain(value) {
  return Number.isFinite(value) ? value : 1
}

export function combineWhiteBalanceGains(preGainR, preGainB, postGainR, postGainB) {
  return {
    gainR: Math.min(3, Math.max(0.01, normalizeGain(preGainR) * normalizeGain(postGainR))),
    gainB: Math.min(3, Math.max(0.01, normalizeGain(preGainB) * normalizeGain(postGainB))),
  }
}

export function buildHistogramSnapshotKey(sessionId, frameId) {
  const sid = sessionId != null ? String(sessionId) : ''
  const fid = frameId != null ? String(frameId) : ''
  return sid && fid ? `${sid}::${fid}` : ''
}

export function createHistogramSnapshot(histogram, options = {}) {
  if (!histogram) return null
  const sessionId = options.sessionId != null ? String(options.sessionId) : ''
  const frameId = options.frameId != null ? options.frameId : null
  const isMultiChannel = Array.isArray(histogram[0])
  return {
    sessionId,
    frameId,
    snapshotKey: buildHistogramSnapshotKey(sessionId, frameId),
    bins: isMultiChannel ? histogram[0].length : histogram.length,
    total: options.total != null ? options.total : null,
    counts: histogram,
  }
}

function finiteNumber(value) {
  return Number.isFinite(Number(value)) ? Number(value) : null
}

export function deriveTileGpmTransition(current, nextGpm) {
  const previousGpm = current.gpm || {}
  const incomingFrameId = (typeof nextGpm.frameId === 'number' && Number.isFinite(nextGpm.frameId))
    ? nextGpm.frameId
    : null
  const previousFrameId = current.frameId != null && Number.isFinite(Number(current.frameId))
    ? Number(current.frameId)
    : null
  const isNewSession =
    current.sessionId !== nextGpm.sessionId ||
    current.imageWidth !== nextGpm.imageWidth ||
    current.imageHeight !== nextGpm.imageHeight ||
    finiteNumber(previousGpm.previewBinningFactor) !== finiteNumber(nextGpm.previewBinningFactor) ||
    finiteNumber(previousGpm.previewWidth) !== finiteNumber(nextGpm.previewWidth) ||
    finiteNumber(previousGpm.previewHeight) !== finiteNumber(nextGpm.previewHeight) ||
    finiteNumber(previousGpm.maxZoomLevel) !== finiteNumber(nextGpm.maxZoomLevel) ||
    current.levelMode !== nextGpm.levelMode ||
    (previousGpm.cfa || 'null') !== (nextGpm.cfa || 'null')
  const sessionId = String(nextGpm.sessionId || '')
  const isLiveSession = sessionId === 'live' || sessionId.startsWith('live_')
  const isSameFrameUpdate = incomingFrameId !== null && previousFrameId !== null && incomingFrameId === previousFrameId
  const isOverwriteFrame = !isNewSession && incomingFrameId !== null && previousFrameId !== null && incomingFrameId !== previousFrameId

  return {
    incomingFrameId,
    previousFrameId,
    isNewSession,
    isLiveSession,
    isSameFrameUpdate,
    isOverwriteFrame,
    isLiveOverwriteFrame: isOverwriteFrame && isLiveSession,
  }
}
