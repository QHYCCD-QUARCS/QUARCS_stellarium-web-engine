<template>
  <div class="pole-master-panel" data-testid="pm-panel" :data-state="running ? 'running' : 'idle'">
    <div class="pm-progress" data-testid="pm-progress">
      <div
        v-for="step in steps"
        :key="step.value"
        class="pm-step"
        :class="stepClass(step)"
        :data-step="step.value"
      >
        <div class="pm-step-dot">
          <v-icon v-if="isStepDone(step)">mdi-check</v-icon>
          <v-icon v-else>{{ step.icon }}</v-icon>
        </div>
        <span>{{ step.label }}</span>
      </div>
    </div>

    <div class="pm-main">
      <div class="pm-canvas-wrap" data-testid="pm-canvas-wrap">
        <canvas ref="canvas" class="pm-canvas" data-testid="pm-canvas"></canvas>
        <div v-if="!hasGuideData && !hasFrameImage" class="pm-empty" data-testid="pm-empty">
          等待极轴镜星场解析
        </div>
      </div>

      <div class="pm-side">
        <div class="pm-title">电子极轴镜校准</div>
        <div class="pm-message" :class="{ error: failed }" data-testid="pm-message">
          <v-icon small>{{ failed ? 'mdi-alert-circle' : 'mdi-information' }}</v-icon>
          <span>{{ message || '准备开始' }}</span>
        </div>

        <div class="pm-metric">
          <span>误差</span>
          <strong data-testid="pm-error-arcsec">{{ formattedArcsec }}</strong>
        </div>
        <div class="pm-metric">
          <span>像素</span>
          <strong data-testid="pm-error-px">{{ formattedPx }}</strong>
        </div>
        <div class="pm-hint" data-testid="pm-hint">{{ guide.hint || '调节赤道仪高度/方位，使两个圆重合' }}</div>

        <div class="pm-diagnostics" data-testid="pm-diagnostics">
          <div class="pm-diag-row">
            <span>阶段</span>
            <strong>{{ overlayPhaseLabel }}</strong>
          </div>
          <div class="pm-diag-row">
            <span>识别/跟踪</span>
            <strong>{{ overlayStarSummary }}</strong>
          </div>
          <div class="pm-diag-row">
            <span>曝光时间</span>
            <strong>{{ overlayExposureSummary }}</strong>
          </div>
          <div class="pm-diag-row">
            <span>RA/残差</span>
            <strong>{{ overlayQualitySummary }}</strong>
          </div>
          <div v-if="overlayWarningText" class="pm-warning">{{ overlayWarningText }}</div>
        </div>

        <div
          class="pm-status-pill"
          data-testid="pm-status-pill"
          :data-state="running ? 'running' : 'stopped'"
        >
          <v-icon>{{ running ? 'mdi-stop-circle' : 'mdi-check-circle' }}</v-icon>
          <span>{{ running ? '电子极轴镜校准中' : (failed ? '校准失败' : '校准已结束') }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PoleMasterPolarAlignmentPanel',
  props: {
    running: { type: Boolean, default: false },
    stateNumber: { type: Number, default: 0 },
    message: { type: String, default: '' },
    progress: { type: Number, default: 0 },
    frame: {
      type: Object,
      default: () => null
    },
    guide: {
      type: Object,
      default: () => ({
        imageW: 0,
        imageH: 0,
        axisX: null,
        axisY: null,
        poleX: null,
        poleY: null,
        errorPx: null,
        errorArcsec: null,
        hint: ''
      })
    },
    overlay: {
      type: Object,
      default: () => null
    },
    collapsedSummary: { type: Boolean, default: false }
  },
  data() {
    return {
      steps: [
        { value: 1, label: '准备', icon: 'mdi-cog' },
        { value: 2, label: '星场确认', icon: 'mdi-star-four-points' },
        { value: 3, label: '固定星确认', icon: 'mdi-vector-circle' },
        { value: 5, label: '旋转采样', icon: 'mdi-rotate-right' },
        { value: 7, label: '轴心拟合', icon: 'mdi-crosshairs-gps' },
        { value: 8, label: '返回/调整', icon: 'mdi-tune' },
        { value: 9, label: '完成', icon: 'mdi-check' }
      ],
      frameCanvas: null,
      frameLoadKey: '',
      frameRequestKey: '',
      frameImageMeta: null,
      frameObjectUrl: ''
    }
  },
  computed: {
    failed() {
      return this.stateNumber === 10
    },
    hasGuideData() {
      const axisX = this.guide && this.guide.axisX
      const poleX = this.guide && this.guide.poleX
      return Number.isFinite(axisX) && Number.isFinite(poleX)
    },
    hasFrameImage() {
      return !!this.frameCanvas
    },
    formattedArcsec() {
      const v = Number(this.guide.errorArcsec)
      return Number.isFinite(v) ? `${v.toFixed(1)}"` : '--'
    },
    formattedPx() {
      const v = Number(this.guide.errorPx)
      return Number.isFinite(v) ? v.toFixed(1) : '--'
    },
    overlayQuality() {
      return this.effectiveOverlay?.quality || {}
    },
    currentFrameId() {
      const v = this.frame?.frameId
      return v == null ? '' : String(v)
    },
    overlayFrameId() {
      const v = this.overlay?.frameId
      return v == null ? '' : String(v)
    },
    effectiveOverlay() {
      // If both sides provide frameId, only render overlay bound to current frame.
      if (this.currentFrameId && this.overlayFrameId && this.currentFrameId !== this.overlayFrameId) {
        return null
      }
      return this.overlay || null
    },
    overlayPhaseLabel() {
      const map = {
        'field-confirmation': '星场确认',
        'ra-rotation-1': 'RA 旋转 1',
        'ra-rotation-2': 'RA 旋转 2',
        'axis-fit': '轴心拟合',
        'return-home': '返回 Home',
        'guiding-init': '实时调整初始化',
        'guiding': '实时调整',
        'simulation': '模拟演示',
        'capture': '采集解析'
      }
      return map[this.effectiveOverlay?.phase] || this.effectiveOverlay?.phase || '--'
    },
    overlayStarSummary() {
      if (!this.effectiveOverlay || !this.effectiveOverlay.quality) return '--/--'
      const stars = Number(this.overlayQuality.detectedStarCount)
      const fallbackStars = Number(this.overlayQuality.starCount)
      const tracked = Number(this.overlayQuality.selectedTrackStarCount)
      const s = Number.isFinite(stars) ? stars : (Number.isFinite(fallbackStars) ? fallbackStars : 0)
      const t = Number.isFinite(tracked) ? tracked : 0
      return `${s}/${t}`
    },
    overlayExposureSummary() {
      const exposureMs = Number(this.overlayQuality.exposureMs)
      if (!Number.isFinite(exposureMs) || exposureMs <= 0) return '--'
      if (exposureMs < 1000) return `${Math.round(exposureMs)}ms`
      return `${(exposureMs / 1000).toFixed(1)}s`
    },
    overlayQualitySummary() {
      const ra = Number(this.overlayQuality.lastRaRotationDeg)
      const residual = Number(this.overlayQuality.axisResidualPx)
      const raText = Number.isFinite(ra) ? `${ra.toFixed(1)}°` : '--'
      const resText = Number.isFinite(residual) ? `${residual.toFixed(1)}px` : '--'
      return `${raText}/${resText}`
    },
    overlayWarningText() {
      const warnings = Array.isArray(this.effectiveOverlay?.warnings) ? this.effectiveOverlay.warnings : []
      return warnings.filter(Boolean).join('；')
    },
    currentStepValue() {
      if (this.failed) {
        const p = Number(this.progress)
        if (p >= 74) return 7
        if (p >= 62) return 6
        if (p >= 50) return 5
        if (p >= 38) return 4
        if (p >= 25) return 3
        if (p >= 10) return 2
        return 1
      }
      if (this.stateNumber >= 9) return 9
      let current = 1
      for (const step of this.steps) {
        if (this.stateNumber >= step.value) current = step.value
      }
      return current
    }
  },
  watch: {
    guide: {
      handler() {
        console.log('[PoleMasterDebug][PanelGuide]', {
          currentFrameId: this.currentFrameId,
          axisX: this.guide && this.guide.axisX,
          poleX: this.guide && this.guide.poleX,
          errorArcsec: this.guide && this.guide.errorArcsec,
          hasGuideData: this.hasGuideData
        })
        this.$nextTick(this.draw)
      },
      deep: true,
      immediate: true
    },
    stateNumber() {
      this.$nextTick(this.draw)
    },
    frame: {
      handler() {
        console.log('[PoleMasterDebug][PanelFrame]', {
          currentFrameId: this.currentFrameId,
          fileName: this.frame && (this.frame.fileName || this.frame.url),
          imageWidth: this.frame && this.frame.imageWidth,
          imageHeight: this.frame && this.frame.imageHeight
        })
        this.loadFrameImage()
      },
      deep: true
    },
    overlay: {
      handler() {
        console.log('[PoleMasterDebug][PanelOverlay]', {
          overlayFrameId: this.overlayFrameId,
          currentFrameId: this.currentFrameId,
          effectiveOverlayPhase: this.effectiveOverlay && this.effectiveOverlay.phase
        })
        this.$nextTick(this.draw)
      },
      deep: true
    }
  },
  mounted() {
    this.loadFrameImage()
    this.draw()
    window.addEventListener('resize', this.draw)
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.draw)
    this.releaseFrameObjectUrl()
  },
  methods: {
    emitFrameLog(message, level = 'info') {
      this.$emit('frame-log', message, level)
    },
    isStepDone(step) {
      if (this.failed) return Number(this.stateNumber) > step.value && step.value < this.currentStepValue
      return Number(this.stateNumber) > step.value || Number(this.stateNumber) === 9
    },
    stepClass(step) {
      return {
        active: this.isStepDone(step) || this.currentStepValue === step.value,
        current: this.currentStepValue === step.value,
        failed: this.failed && this.currentStepValue === step.value
      }
    },
    async loadFrameImage() {
      const fileName = this.frame?.fileName || this.frame?.url || ''
      if (!fileName) return
      const key = String(fileName)
      if (key === this.frameLoadKey && this.frameCanvas) return
      this.frameRequestKey = key
      try {
        const src = this.resolveFrameSrc(fileName)
        this.emitFrameLog(`开始下载极轴镜预览图: ${src}`, 'info')
        const offscreen = await this.loadImageToCanvas(src)
        if (key !== this.frameRequestKey) return
        this.frameCanvas = offscreen
        this.frameLoadKey = key
        this.frameImageMeta = { width: offscreen.width, height: offscreen.height }
        this.emitFrameLog(`极轴镜预览图下载完成: ${offscreen.width}x${offscreen.height}`, 'success')
      } catch (error) {
        console.warn('PoleMaster frame load failed:', error)
        this.emitFrameLog(`极轴镜预览图下载失败: ${error && error.message ? error.message : error}`, 'error')
      }
      this.$nextTick(this.draw)
    },
    resolveFrameSrc(fileName) {
      if (/^https?:\/\//i.test(fileName)) return fileName
      const base = (process.env.BASE_URL || '/').replace(/\/?$/, '/')
      return fileName.startsWith('/img/') || fileName.startsWith('img/')
        ? `${base}${fileName.replace(/^\/?/, '')}`
        : `${base}img/${fileName}`
    },
    releaseFrameObjectUrl() {
      if (this.frameObjectUrl) {
        URL.revokeObjectURL(this.frameObjectUrl)
        this.frameObjectUrl = ''
      }
    },
    async loadImageToCanvas(src) {
      const url = `${src}${src.includes('?') ? '&' : '?'}t=${Date.now()}`
      const response = await fetch(url, { cache: 'no-store' })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      this.releaseFrameObjectUrl()
      this.frameObjectUrl = objectUrl
      if (window.createImageBitmap) {
        const bitmap = await window.createImageBitmap(blob)
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, bitmap.width)
        canvas.height = Math.max(1, bitmap.height)
        const ctx = canvas.getContext('2d')
        ctx.drawImage(bitmap, 0, 0)
        if (bitmap.close) bitmap.close()
        return canvas
      }
      return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          canvas.width = Math.max(1, img.naturalWidth || img.width)
          canvas.height = Math.max(1, img.naturalHeight || img.height)
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0)
          resolve(canvas)
        }
        img.onerror = reject
        img.src = objectUrl
      })
    },
    draw() {
      const canvas = this.$refs.canvas
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      const w = Math.max(1, Math.floor(rect.width || canvas.clientWidth || 1))
      const h = Math.max(1, Math.floor(rect.height || canvas.clientHeight || 1))
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      const ctx = canvas.getContext('2d')
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)

      ctx.fillStyle = '#070b10'
      ctx.fillRect(0, 0, w, h)
      let imageDraw = null
      if (this.frameCanvas) {
        const imageW = this.frameCanvas.width
        const imageH = this.frameCanvas.height
        // Use contain scaling so the full frame is always visible.
        const scale = Math.min(w / imageW, h / imageH)
        const ox = (w - imageW * scale) / 2
        const oy = (h - imageH * scale) / 2
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(this.frameCanvas, ox, oy, imageW * scale, imageH * scale)
        imageDraw = { imageW, imageH, scale, ox, oy }
      } else {
        ctx.strokeStyle = 'rgba(255,255,255,0.08)'
        ctx.lineWidth = 1
        for (let x = 0; x < w; x += 40) {
          ctx.beginPath()
          ctx.moveTo(x, 0)
          ctx.lineTo(x, h)
          ctx.stroke()
        }
        for (let y = 0; y < h; y += 40) {
          ctx.beginPath()
          ctx.moveTo(0, y)
          ctx.lineTo(w, y)
          ctx.stroke()
        }
      }

      const overlayW = Number(this.effectiveOverlay?.imageW)
      const overlayH = Number(this.effectiveOverlay?.imageH)
      const imageW = imageDraw ? imageDraw.imageW : Math.max(1, Number(this.guide.imageW) || overlayW || 1)
      const imageH = imageDraw ? imageDraw.imageH : Math.max(1, Number(this.guide.imageH) || overlayH || 1)
      const guideW = Math.max(1, Number(this.guide.imageW) || overlayW || imageW)
      const guideH = Math.max(1, Number(this.guide.imageH) || overlayH || imageH)
      const scale = imageDraw ? imageDraw.scale : Math.min(w / imageW, h / imageH)
      const ox = imageDraw ? imageDraw.ox : (w - imageW * scale) / 2
      const oy = imageDraw ? imageDraw.oy : (h - imageH * scale) / 2
      const sx = imageW / guideW
      const sy = imageH / guideH
      const mapX = (x) => ox + Number(x) * sx * scale
      const mapY = (y) => oy + Number(y) * sy * scale
      ctx.strokeStyle = 'rgba(255,255,255,0.45)'
      ctx.strokeRect(ox, oy, imageW * scale, imageH * scale)
      ctx.font = '12px sans-serif'
      ctx.lineWidth = 2

      this.drawOverlay(ctx, mapX, mapY)
      this.drawRotationIndicator(ctx, w, h)

      if (!this.hasGuideData || Number(this.stateNumber) < 7) return
      const axis = { x: mapX(this.guide.axisX), y: mapY(this.guide.axisY) }
      const pole = { x: mapX(this.guide.poleX), y: mapY(this.guide.poleY) }

      ctx.strokeStyle = '#4caf50'
      ctx.beginPath()
      ctx.arc(axis.x, axis.y, 14, 0, Math.PI * 2)
      ctx.stroke()
      ctx.fillStyle = '#4caf50'
      this.drawLabel(ctx, '机械轴心', axis.x + 18, axis.y - 8, '#4caf50')

      ctx.strokeStyle = '#ef5350'
      ctx.beginPath()
      ctx.arc(pole.x, pole.y, 10, 0, Math.PI * 2)
      ctx.stroke()
      ctx.fillStyle = '#ef5350'
      this.drawLabel(ctx, '真实天极', pole.x + 14, pole.y + 18, '#ef5350')

      ctx.strokeStyle = '#ffd54f'
      ctx.setLineDash([6, 5])
      ctx.beginPath()
      ctx.moveTo(axis.x, axis.y)
      ctx.lineTo(pole.x, pole.y)
      ctx.stroke()
      ctx.setLineDash([])
    },
    drawOverlay(ctx, mapX, mapY) {
      const overlay = this.effectiveOverlay || {}
      const isDrawablePoint = point => point &&
        Number.isFinite(Number(point.x)) &&
        Number.isFinite(Number(point.y))
      const drawPoint = (point, radius, color, fill = false) => {
        if (!isDrawablePoint(point)) return
        ctx.beginPath()
        ctx.arc(mapX(point.x), mapY(point.y), radius, 0, Math.PI * 2)
        if (fill) {
          ctx.fillStyle = color
          ctx.fill()
        } else {
          ctx.strokeStyle = color
          ctx.stroke()
        }
      }
      const detectedStars = Array.isArray(overlay.detectedStars) ? overlay.detectedStars.slice(0, 120) : []
      ctx.lineWidth = 1.6
      for (const star of detectedStars) {
        drawPoint(star, 6, 'rgba(66,165,245,0.95)', false)
      }
      const trackedStars = Array.isArray(overlay.selectedTrackStars) ? overlay.selectedTrackStars.slice(0, 60) : []
      ctx.lineWidth = 2
      for (const star of trackedStars) {
        drawPoint(star, 7, 'rgba(76,175,80,0.98)', false)
      }
      const fixedStars = Array.isArray(overlay.fixedStars) ? overlay.fixedStars.slice(0, 8) : []
      ctx.lineWidth = 2
      for (const star of fixedStars) {
        if (!star || star.visible === false) continue
        const point = star.matched ? star.detected : star.expected
        const color = star.matched ? 'rgba(66,165,245,0.95)' : 'rgba(239,83,80,0.95)'
        drawPoint(point, 8, color, false)
        const name = String(star.name || star.id || '').toLowerCase()
        if (name.includes('polaris') || name.includes('北极星')) {
          this.drawLabel(ctx, '北极星', mapX(point.x) + 12, mapY(point.y) - 10, color)
        }
      }

      const axisCandidate = overlay.axisCandidate
      if (axisCandidate && axisCandidate.valid !== false && Number.isFinite(Number(axisCandidate.x))) {
        const x = mapX(axisCandidate.x)
        const y = mapY(axisCandidate.y)
        ctx.strokeStyle = 'rgba(129,199,132,0.85)'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(x - 12, y)
        ctx.lineTo(x + 12, y)
        ctx.moveTo(x, y - 12)
        ctx.lineTo(x, y + 12)
        ctx.stroke()
      }
    },
    drawRotationIndicator(ctx, w, h) {
      const rotationDegRaw = Number(this.overlayQuality.rotationFromFirstDeg)
      const rotationDeg = Number.isFinite(rotationDegRaw) ? rotationDegRaw : 0
      const direction = rotationDeg >= 0 ? '顺时针' : '逆时针'
      const absDeg = Math.abs(rotationDeg)

      const boxX = 12
      const boxY = 12
      const boxW = 168
      const boxH = 66
      ctx.save()
      ctx.fillStyle = 'rgba(0,0,0,0.64)'
      ctx.strokeStyle = 'rgba(255,255,255,0.22)'
      ctx.lineWidth = 1
      ctx.fillRect(boxX, boxY, boxW, boxH)
      ctx.strokeRect(boxX, boxY, boxW, boxH)

      const cx = boxX + 24
      const cy = boxY + 40
      const len = 18
      const rad = rotationDeg * Math.PI / 180
      // 基准方向：首帧解析角度定义为竖直向上（0°）
      const x2 = cx + Math.sin(rad) * len
      const y2 = cy - Math.cos(rad) * len

      ctx.strokeStyle = '#ffd54f'
      ctx.lineWidth = 2.2
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(x2, y2)
      ctx.stroke()

      const head = 5
      const a = Math.atan2(y2 - cy, x2 - cx)
      ctx.beginPath()
      ctx.moveTo(x2, y2)
      ctx.lineTo(x2 - head * Math.cos(a - Math.PI / 6), y2 - head * Math.sin(a - Math.PI / 6))
      ctx.lineTo(x2 - head * Math.cos(a + Math.PI / 6), y2 - head * Math.sin(a + Math.PI / 6))
      ctx.closePath()
      ctx.fillStyle = '#ffd54f'
      ctx.fill()

      ctx.fillStyle = 'rgba(255,255,255,0.92)'
      ctx.font = '12px sans-serif'
      ctx.fillText('旋转方向', boxX + 54, boxY + 22)
      ctx.fillText(`${direction} ${absDeg.toFixed(1)}°`, boxX + 54, boxY + 43)
      ctx.fillStyle = 'rgba(255,255,255,0.7)'
      ctx.font = '11px sans-serif'
      ctx.fillText('首帧=竖直(0°)', boxX + 54, boxY + 59)
      ctx.restore()
    },
    drawLabel(ctx, text, x, y, color) {
      const paddingX = 4
      const paddingY = 3
      const metrics = ctx.measureText(text)
      const w = metrics.width + paddingX * 2
      const h = 18
      ctx.fillStyle = 'rgba(0,0,0,0.72)'
      ctx.fillRect(x - paddingX, y - 13, w, h)
      ctx.fillStyle = color
      ctx.fillText(text, x, y)
    }
  }
}
</script>

<style scoped>
.pole-master-panel {
  padding: 14px;
  color: #fff;
  pointer-events: auto;
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  overflow: hidden;
}

.pm-progress {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 12px;
  flex: 0 0 auto;
}

.pm-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  color: rgba(255,255,255,0.52);
  font-size: 12px;
  min-width: 0;
}

.pm-step-dot {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.12);
}

.pm-step.active {
  color: #fff;
}

.pm-step.active .pm-step-dot {
  border-color: rgba(76,175,80,0.9);
  background: rgba(76,175,80,0.18);
}

.pm-step.current .pm-step-dot {
  box-shadow: 0 0 0 3px rgba(255,213,79,0.16);
}

.pm-step.failed .pm-step-dot {
  border-color: rgba(239,83,80,0.95);
  background: rgba(239,83,80,0.24);
}

.pm-main {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 240px;
  gap: 14px;
  min-height: 0;
  flex: 1 1 auto;
  overflow: hidden;
}

.pm-canvas-wrap {
  position: relative;
  min-height: 0;
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 6px;
  overflow: hidden;
}

.pm-canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.pm-empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255,255,255,0.62);
}

.pm-side {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pm-title {
  font-size: 18px;
  font-weight: 600;
}

.pm-message {
  min-height: 0;
  padding: 7px 9px;
  border-radius: 4px;
  color: #e3f2fd;
  background: rgba(144, 202, 249, 0.12);
  border: 1px solid rgba(144, 202, 249, 0.24);
  font-size: 13px;
  font-weight: 500;
  line-height: 1.35;
  display: flex;
  align-items: flex-start;
  gap: 6px;
  overflow-wrap: anywhere;
}

.pm-message .v-icon {
  margin-top: 1px;
  flex: 0 0 auto;
  color: currentColor;
}

.pm-message.error {
  color: #fff;
  background: rgba(239, 83, 80, 0.22);
  border-color: rgba(239, 83, 80, 0.72);
}

.pm-metric {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255,255,255,0.10);
}

.pm-metric strong {
  font-size: 22px;
  color: #ffd54f;
}

.pm-hint {
  min-height: 0;
  color: rgba(255,255,255,0.90);
  font-size: 12px;
  line-height: 1.45;
}

.pm-diagnostics {
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 6px;
  padding: 8px;
  background: rgba(255,255,255,0.05);
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.pm-diag-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  color: rgba(255,255,255,0.70);
}

.pm-diag-row strong {
  color: #e3f2fd;
  font-size: 12px;
  font-weight: 600;
  text-align: right;
  overflow-wrap: anywhere;
}

.pm-warning {
  color: #ffd54f;
  font-size: 12px;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.pm-status-pill {
  margin-top: auto;
  min-height: 46px;
  border-radius: 6px;
  color: #fff;
  background: linear-gradient(135deg, #26a69a, #ef5350);
  box-shadow: 0 0 0 2px rgba(255,213,79,0.24), 0 8px 18px rgba(0,0,0,0.24);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

@media (max-width: 760px) {
  .pm-progress {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .pm-main {
    grid-template-columns: 1fr;
  }
}
</style>
