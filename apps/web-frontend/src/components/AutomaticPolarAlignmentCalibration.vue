<template>
  <div class="polar-alignment-root">
  <!-- 最小化状态 -->
  <div v-if="visible && isMinimized" class="polar-alignment-minimized" :class="{ 'dragging': isDraggingState }"
    :style="{ left: position.x + 'px', top: position.y + 'px' }">
    <div class="minimized-header">
      <div class="minimized-drag-area" @mousedown="startDrag" @touchstart="startDrag">
        <v-icon class="minimized-icon">mdi-compass-rose</v-icon>
        <span class="minimized-title">{{ $t('Polar Alignment') }}</span>
      </div>
      <div class="minimized-controls">
        <button class="minimized-btn" @click="toggleMinimize" :title="$t('Expand')">
          <v-icon>mdi-chevron-up</v-icon>
        </button>
      </div>
    </div>
    <div class="minimized-status">
      <div class="status-indicator" :class="{ 'online': isConnected }"></div>
      <span class="status-text">{{ isConnected ? $t('Connected') : $t('Disconnected') }}</span>
    </div>
  </div>

  <!-- 完整界面 -->
  <div v-else-if="visible" class="polar-alignment-widget"
    :class="{ 'collapsed': isCollapsed, 'dragging': isDraggingState }"
    :style="{ left: position.x + 'px', top: position.y + 'px', pointerEvents: (showTrajectoryOverlay && overlayMode === 'fullscreen' ? 'none' : 'auto') }">

    <!-- 拖动手柄 -->
    <div class="widget-header">
      <div class="header-drag-area" @mousedown="startDrag" @touchstart="startDrag">
        <div class="header-left">
          <v-icon class="header-icon">mdi-compass-rose</v-icon>
          <span class="header-title">{{ $t('Polar Alignment Calibration') }}</span>
          <div class="connection-indicator">
            <div class="status-dot" :class="{ 'online': isConnected }"></div>
          </div>
        </div>
      </div>

      <div class="header-controls">
        <button class="header-btn" @click="toggleCollapse" :title="isCollapsed ? $t('Expand') : $t('Collapse')">
          <v-icon>{{ isCollapsed ? 'mdi-chevron-down' : 'mdi-chevron-up' }}</v-icon>
        </button>
        <button class="header-btn" @click="toggleTrajectoryOverlay" :title="showTrajectoryOverlay ? $t('Hide Trajectory Canvas') : $t('Show Trajectory Canvas')">
          <v-icon>{{ showTrajectoryOverlay ? 'mdi-eye-off' : 'mdi-crosshairs-gps' }}</v-icon>
        </button>
        <button class="header-btn" @click="toggleMinimize" :title="$t('Minimize')">
          <v-icon>mdi-minus</v-icon>
        </button>
      </div>
    </div>

    <!-- 收缩状态内容 -->
    <div v-if="isCollapsed" class="widget-content collapsed" :class="{ 'dragging': isDraggingState }">
      <div class="collapsed-info">
        <div class="collapsed-progress">
          <div class="progress-circle" :style="{ '--progress': progressPercentage + '%' }">
            <span class="progress-text">{{ Math.round(progressPercentage) }}%</span>
          </div>
        </div>
        <div class="collapsed-status">
          <div class="status-item">
            <span class="status-label">方位角:</span>
            <span class="status-value" :class="{ 'needs-adjustment': needsAzimuthAdjustment }">
              {{ formatAdjustmentValue(adjustment.azimuth) }}
            </span>
          </div>
          <div class="status-item">
            <span class="status-label">高度角:</span>
            <span class="status-value" :class="{ 'needs-adjustment': needsAltitudeAdjustment }">
              {{ formatAdjustmentValue(adjustment.altitude) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 展开状态内容 -->
    <div v-else class="widget-content expanded" :class="{ 'dragging': isDraggingState }">
      <div class="content-sections">
        <!-- 校准步骤进度条 -->
        <div class="calibration-progress">
          <div class="progress-header">
            <div class="progress-title">{{ $t('Calibration Progress') }}</div>
            <div v-if="progressPercentage >= 75 && progressPercentage < 95" class="calibration-loop-info">
              {{ $t('Calibration Round', [calibrationLoopCount]) }}
            </div>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: progressPercentage + '%' }"></div>
            <div class="progress-nodes">
              <!-- 初始化节点 -->
              <div class="progress-node" :class="getStepClass(0)">
                <div class="node-circle">
                  <v-icon v-if="progressPercentage >= 15">mdi-check</v-icon>
                  <v-icon v-else>mdi-cog</v-icon>
                </div>
                <div class="node-label">{{ $t('Initialization') }}</div>
              </div>

              <!-- 第一次校准节点 -->
              <div class="progress-node" :class="getStepClass(1)">
                <div class="node-circle">
                  <v-icon v-if="progressPercentage >= 25">mdi-check</v-icon>
                  <span v-else>1</span>
                </div>
                <div class="node-label">{{ $t('First Calibration') }}</div>
              </div>

              <!-- 第二次校准节点 -->
              <div class="progress-node" :class="getStepClass(2)">
                <div class="node-circle">
                  <v-icon v-if="progressPercentage >= 50">mdi-check</v-icon>
                  <span v-else>2</span>
                </div>
                <div class="node-label">{{ $t('Second Calibration') }}</div>
              </div>

              <!-- 第三次校准节点 -->
              <div class="progress-node" :class="getStepClass(3)">
                <div class="node-circle">
                  <v-icon v-if="progressPercentage >= 75">mdi-check</v-icon>
                  <span v-else>3</span>
                </div>
                <div class="node-label">{{ $t('Third Calibration') }}</div>
              </div>

              <!-- 校准调整节点 -->
              <div class="progress-node calibration-node"
                :class="{ 'active': progressPercentage >= 75, 'looping': progressPercentage >= 75 && progressPercentage < 95 }">
                <div class="node-circle">
                  <v-icon v-if="progressPercentage >= 95">mdi-check</v-icon>
                  <v-icon v-else-if="progressPercentage >= 75">mdi-refresh</v-icon>
                  <v-icon v-else>mdi-tune</v-icon>
                </div>
                <div class="node-label">{{ $t('Calibration') }}</div>
              </div>

              <!-- 最终验证节点 -->
              <div class="progress-node verification-node" :class="{ 'active': progressPercentage >= 95 }">
                <div class="node-circle">
                  <v-icon v-if="isPolarAligned">mdi-check</v-icon>
                  <v-icon v-else>mdi-target</v-icon>
                </div>
                <div class="node-label">{{ $t('Verification') }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 日志显示 -->
        <div class="log-section">
          <div class="log-display">
            <div v-if="displayLogs.length > 0" class="latest-log" :class="displayLogs[0].level">
              <div class="log-timestamp">{{ formatTime(displayLogs[0].timestamp) }}</div>
              <div class="log-message">{{ displayLogs[0].message }}</div>
            </div>
            <div v-else class="log-empty">
              {{ $t('No activity logs') }}
            </div>
          </div>
        </div>

        <!-- 位置信息 -->
        <div class="position-section">
          <div class="position-grid">
            <div class="position-cell current">
              <div class="cell-label">{{ $t('current RA') }}</div>
              <div class="cell-value">{{ currentPosition.ra }}</div>
            </div>
            <div class="position-cell current">
              <div class="cell-label">{{ $t('current DEC') }}</div>
              <div class="cell-value">{{ currentPosition.dec }}</div>
            </div>
            <div class="position-cell target">
              <div class="cell-label">{{ $t('target RA') }}</div>
              <div class="cell-value">{{ targetPosition.ra }}</div>
            </div>
            <div class="position-cell target">
              <div class="cell-label">{{ $t('target DEC') }}</div>
              <div class="cell-value">{{ targetPosition.dec }}</div>
            </div>
          </div>
        </div>

        <!-- 调整指导 -->
        <div class="adjustment-section">
          <div class="adjustment-instructions">
            <div class="adjustment-item" :class="{ 'active': needsAzimuthAdjustment }">
              <div class="adjustment-icon">
                <v-icon>mdi-compass</v-icon>
              </div>
              <div class="adjustment-details">
                <div class="adjustment-header">
                  <span class="adjustment-type">{{ $t('Azimuth') }}</span>
                  <span class="adjustment-value">{{ formatAdjustmentValue(adjustment.azimuth) }}</span>
                </div>
                <div class="adjustment-action">
                  {{ needsAzimuthAdjustment ? getAzimuthAction(adjustment.azimuth) : $t('No adjustment needed') }}
                </div>

              </div>
            </div>

            <div class="adjustment-item" :class="{ 'active': needsAltitudeAdjustment }">
              <div class="adjustment-icon">
                <v-icon>mdi-compass</v-icon>
              </div>
              <div class="adjustment-details">
                <div class="adjustment-header">
                  <span class="adjustment-type">{{ $t('Altitude') }}</span>
                  <span class="adjustment-value">{{ formatAdjustmentValue(adjustment.altitude) }}</span>
                </div>
                <div class="adjustment-action">
                  {{ needsAltitudeAdjustment ? getAltitudeAction(adjustment.altitude) : $t('No adjustment needed') }}
                </div>

              </div>
            </div>
          </div>
        </div>

        <!-- 控制按钮 -->
        <div class="control-section">
          <div class="action-buttons">
            <button class="action-btn primary" @click="startAutoCalibration" :disabled="!canAutoCalibrate">
              <v-icon v-if="!isCalibrationRunning">mdi-play-circle</v-icon>
              <v-icon v-else>mdi-stop-circle</v-icon>
              <span>{{ isCalibrationRunning ? $t('Stop Calibration') : $t('Start Auto Calibration') }}</span>
            </button>



          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 轨迹画布：全屏模式 -->
  <div v-if="visible && showTrajectoryOverlay && overlayMode === 'fullscreen'" class="trajectory-overlay"
       @wheel.prevent="onOverlayWheel" @mousedown.stop @touchstart.stop>
    <canvas ref="trajectoryCanvas"></canvas>
    <button class="overlay-close-btn" @click.stop="toggleTrajectoryOverlay" :title="$t('Hide Trajectory Canvas')">
      <v-icon>mdi-close</v-icon>
    </button>
    <div class="overlay-hint">{{ $t('Trajectory.Instruction') }}</div>
    <div class="overlay-panel">
      <div class="panel-row">
        <span class="panel-label">{{ $t('Current') }}:</span>
        <span class="panel-value">RA {{ currentPosition.ra }} / DEC {{ currentPosition.dec }}</span>
      </div>
      <div class="panel-row">
        <span class="panel-label">{{ $t('Target') }}:</span>
        <span class="panel-value">RA {{ targetPosition.ra }} / DEC {{ targetPosition.dec }}</span>
      </div>
      <div class="panel-actions">
        <!-- <button class="panel-btn" disabled :title="$t('Disabled')">{{ $t('Clear All Trajectory') }}</button> -->
        <button class="panel-btn" @click.stop="clearOldTrajectory">{{ $t('Clear Old Trajectory') }}</button>
        <button class="panel-btn" @click.stop="switchToWindowed">{{ $t('Switch to Windowed Mode') }}</button>
      </div>
    </div>
  </div>

  <!-- 轨迹画布：窗口模式 -->
  <div v-if="visible && showTrajectoryOverlay && overlayMode === 'windowed'"
       class="trajectory-window" :style="{ left: windowedRect.x + 'px', top: windowedRect.y + 'px', width: windowedRect.width + 'px', height: windowedRect.height + 'px' }"
       @mousedown.stop @touchstart.stop>
    <div class="window-header" @mousedown.stop="startWindowDrag" @touchstart.stop="startWindowDrag">
      <span class="window-title">{{ $t('Trajectory') }}</span>
      <div class="window-actions">
        <button class="panel-btn small" @click.stop="switchToFullscreen">{{ $t('Switch to Fullscreen Mode') }}</button>
        <button class="panel-btn small" @click.stop="clearOldTrajectory">{{ $t('Clear Old Trajectory') }}</button>
        <!-- <button class="panel-btn small" disabled :title="$t('Disabled')">{{ $t('Clear All Trajectory') }}</button> -->
        <button class="panel-btn small" @click.stop="toggleTrajectoryOverlay" :title="$t('Hide Trajectory Canvas')"><v-icon>mdi-close</v-icon></button>
      </div>
    </div>
    <div class="window-content">
      <canvas ref="trajectoryCanvas"></canvas>
    </div>
  </div>
  </div>
</template>

<script>
// 常量定义
const COLORS = {
  PRIMARY: '#64b5f6',
  SUCCESS: '#4caf50',
  WARNING: '#ff9800',
  ERROR: '#f44336',
  INFO: '#2196f3',
  WHITE: '#ffffff',
  BACKGROUND: 'rgba(35, 35, 45, 0.95)',
  SURFACE: 'rgba(60, 60, 70, 0.9)'
}

const CALIBRATION_PHASES = {
  INITIAL: 'initial',
  COLLECTING: 'collecting',
  ADJUSTING: 'adjusting',
  VERIFYING: 'verifying'
}

const PROGRESS_THRESHOLDS = {
  INITIALIZATION: 15,
  FIRST_CALIBRATION: 25,
  SECOND_CALIBRATION: 50,
  THIRD_CALIBRATION: 75,
  CALIBRATION_LOOP: 95,
  COMPLETION: 100
}

const DIMENSIONS = {
  MINIMIZED: { width: 250, height: 80 },
  COLLAPSED: { width: 300, height: 120 },
  EXPANDED: { width: 350, height: 400 }
}

const LOG_LIMIT = 100
const DISPLAY_LOG_LIMIT = 10

export default {
  name: 'AutomaticPolarAlignmentCalibration',

  props: {
    visible: {
      type: Boolean,
      default: false
    },
    autoStart: {
      type: Boolean,
      default: false
    },
    // 新增：传入调整数据的单位（'deg' | 'arcmin' | 'arcsec'）
    adjustmentUnit: { type: String, default: 'arcmin' },

    // 新增：用户站位视角（'north' | 'south'），用于左右映射
    facingPole: { type: String, default: 'north' },

    // 新增：动作死区（以角分定义，UI判定是否需要动作）
    deadbandArcmin: { type: Number, default: 0.5 }
  },

  data() {
    return {
      // 连接状态
      isConnected: false,

      // 位置信息
      currentPosition: {
        ra: '00h 00m 00s',
        dec: '+00° 00\' 00"'
      },
      targetPosition: {
        ra: '00h 00m 00s',
        dec: '+00° 00\' 00"'
      },
      previousPosition: {
        ra: '00h 00m 00s',
        dec: '+00° 00\' 00"'
      },

      // 校准数据
      isCalibrationComplete: false,
      isPolarAligned: false,

      // 调整信息
      adjustment: {
        azimuth: 0.0,
        altitude: 0.0
      },

      // 日志系统 - 使用循环数组优化内存
      logs: [],
      logIndex: 0,
      logCapacity: LOG_LIMIT,

      // 校准运行状态
      isCalibrationRunning: false,

      // 视场数据
      fieldData: null,

      // 当前进度
      currentProgress: 0,

      // === 新增：界面控制状态 ===
      // 拖动状态
      isDragging: false,
      dragOffset: { x: 0, y: 0 },

      // 控件位置
      position: { x: 50, y: 50 },

      // 界面状态
      isMinimized: false,
      isCollapsed: false,

      // === 新增：性能优化 ===
      // 缓存尺寸计算结果
      cachedDimensions: {
        width: 350,
        height: 400
      },
      // 拖动状态标记
      isDraggingState: false,

      // 内存清理定时器
      memoryCleanupTimer: null,

      // 计算缓存
      cachedAzimuthArcmin: null,
      cachedAltitudeArcmin: null,
      lastAzimuthValue: null,
      lastAltitudeValue: null,

      // 拖动性能优化
      lastDragTime: 0,

      // 极轴偏移量
      polarAxisOffset: {
        azimuth: 0,
        altitude: 0
      },

      // 校准循环计数
      calibrationLoopCount: 0,
      lastCalibrationProgress: 0,

      // 校准阶段状态
      calibrationPhase: 'initial', // 'initial', 'collecting', 'adjusting', 'verifying'
      calibrationPoints: [], // 存储三个校准点的坐标
      maxCalibrationPoints: 3, // 最大校准点数量
      targetPoint: null, // 存储目标点坐标

      // 移除假极轴相关数据
      // fakePolarAxis: {
      //   ra: null,
      //   dec: null,
      //   calculated: false
      // },

      // === 轨迹画布状态 ===
      showTrajectoryOverlay: false,
      overlayMode: 'fullscreen', // 'fullscreen' | 'windowed'
      trajectoryScale: 1, // 已弃用（不再使用手动缩放）
      autoFitPxPerDeg: 40, // 自动适配计算出的 px/deg（基于当前画布尺寸与数据范围）
      trajectoryPoints: [], // [{x, y}] in overlay canvas space after transform
      rawTrajectoryPoints: [], // 保存原始的 {ra, dec} 序列
      lastRawPosition: null, // {ra, dec} numeric
      targetRawPosition: null, // {ra, dec} numeric, fixed as overlay center reference
      windowedRect: { x: 40, y: 80, width: 420, height: 300 },
      // 逻辑画布尺寸：用于窗口模式将“全屏画布”按比例缩放进窗口
      baseCanvasLogicalSize: { width: 1280, height: 720 },
      windowDrag: { active: false, offsetX: 0, offsetY: 0 },
      // === 视图变换（仅缩小比例；以目标与首点填满画布） ===
      currentPxPerDeg: null, // 当前像素/度，只会缩小
      viewMinWorldX: null, // 世界坐标：X 为 dRA(unwrapped)，Y 为 dDec
      viewMaxWorldX: null,
      viewMinWorldY: null,
      viewMaxWorldY: null,
      raUnwrapAnchor: null, // dRA 展开锚点（首点相对目标）
      viewPadRatioX: 0.12,
      viewPadRatioY: 0.10,
      viewOffsetXPx: 0,
      viewOffsetYPx: 0,
      // 轨迹点合并容差（角分）
      trajectoryMergeTolArcmin: 2.0,  // 轨迹点合并容差（角分）
      calibrationCircleArcmin: 1.0,  // 校准圆半径（角分）-- 约等于校准精度

      hasAcceptUpdateMessage: false, // 是否已经接受更新消息,防止由于组件加载顺序导致组件更新丢失
    }
  },

  computed: {
    // 显示的日志 - 使用缓存优化
    displayLogs() {
      // 返回最近的10条日志，按时间倒序（用于显示最新一条）
      const logs = this.logs
      if (logs.length <= DISPLAY_LOG_LIMIT) {
        return logs.slice().reverse()
      }
      return logs.slice(-DISPLAY_LOG_LIMIT).reverse()
    },

    // 校准进度百分比
    progressPercentage() {
      // 使用从后端传入的进度
      return this.currentProgress
    },

    // 是否可以自动校准
    canAutoCalibrate() {
      return this.isConnected
    },

    // 是否需要方位角调整 - 使用缓存避免重复计算
    needsAzimuthAdjustment() {
      const v = this.adjustment?.azimuth
      if (!Number.isFinite(v)) return false
      // 使用缓存的值，避免重复计算
      return this.cachedAzimuthArcmin !== null ? 
        Math.abs(this.cachedAzimuthArcmin) > this.deadbandArcmin : 
        Math.abs(this.unitToArcmin(v, this.adjustmentUnit)) > this.deadbandArcmin
    },

    // 是否需要高度角调整 - 使用缓存避免重复计算
    needsAltitudeAdjustment() {
      const v = this.adjustment?.altitude
      if (!Number.isFinite(v)) return false
      // 使用缓存的值，避免重复计算
      return this.cachedAltitudeArcmin !== null ? 
        Math.abs(this.cachedAltitudeArcmin) > this.deadbandArcmin : 
        Math.abs(this.unitToArcmin(v, this.adjustmentUnit)) > this.deadbandArcmin
    }
  },

  watch: {
    visible(newVal) {
      if (newVal && this.autoStart) {
        this.startAutoCalibration()
      }
    },
    
    // 监听当前坐标变化，自动更新朝向极点
    '$store.state.currentLocation.lat': {
      handler(newLat, oldLat) {
        if (newLat !== oldLat && newLat !== undefined) {
          const facingPole = this.calculateFacingPole()
          this.addLog(this.$t('Location Changed', [facingPole, newLat]), 'info')
          
          // 如果正在调整阶段，重新计算调整建议
          if (this.calibrationPhase === 'adjusting') {
            this.addLog(this.$t('Recalculating Adjustment Directions'), 'info')
          }
        }
      },
      immediate: false
    },

    // 监听调整值变化，更新缓存 - 使用防抖避免频繁更新
    'adjustment.azimuth': {
      handler: function(newVal) {
        if (Number.isFinite(newVal)) {
          // 清除之前的定时器
          if (this._azimuthUpdateTimer) {
            clearTimeout(this._azimuthUpdateTimer)
          }
          // 使用防抖，延迟100ms更新
          this._azimuthUpdateTimer = setTimeout(() => {
            this.cachedAzimuthArcmin = this.unitToArcmin(newVal, this.adjustmentUnit)
            this.lastAzimuthValue = newVal
          }, 100)
        }
      },
      immediate: true
    },

    'adjustment.altitude': {
      handler: function(newVal) {
        if (Number.isFinite(newVal)) {
          // 清除之前的定时器
          if (this._altitudeUpdateTimer) {
            clearTimeout(this._altitudeUpdateTimer)
          }
          // 使用防抖，延迟100ms更新
          this._altitudeUpdateTimer = setTimeout(() => {
            this.cachedAltitudeArcmin = this.unitToArcmin(newVal, this.adjustmentUnit)
            this.lastAltitudeValue = newVal
          }, 100)
        }
      },
      immediate: true
    }
  },

    mounted() {
      // 实现组件初始化逻辑
      this.initialize()

      // 初始化缓存的尺寸信息
      this.updateCachedDimensions()

      // 监听信号总线事件
      this.$bus.$on('showPolarAlignment', this.showInterface)
      this.$bus.$on('hidePolarAlignment', this.hideInterface)

      // 监听赤道仪连接状态
      this.$bus.$on('MountConnected', this.updateMountConnection)

      // 接收状态更新
      this.$bus.$on('PolarAlignmentState', this.updatePolarAlignmentState)

      // 监听视场数据更新
      this.$bus.$on('FieldDataUpdate', this.updateFieldData)

      // 监听卡片信息更新
      this.$bus.$on('updateCardInfo', this.updateCardInfo)

      // 监听自动校准状态
      this.$bus.$on('PolarAlignmentIsRunning', this.updatePolarAlignmentIsRunning)

      // 组件加载完成后，若尚未收到更新消息，则主动请求极轴对齐状态
      if (!this.hasAcceptUpdateMessage) {
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'getPolarAlignmentState')
      }

      // 启动定期内存清理（每5分钟清理一次）
      this.startMemoryCleanup()
    },

    beforeDestroy() {
      // 移除信号总线监听
      this.$bus.$off('showPolarAlignment', this.showInterface)
      this.$bus.$off('hidePolarAlignment', this.hideInterface)
      this.$bus.$off('MountConnected', this.updateMountConnection)
      this.$bus.$off('PolarAlignmentState', this.updatePolarAlignmentState)
      this.$bus.$off('FieldDataUpdate', this.updateFieldData)
      this.$bus.$off('updateCardInfo', this.updateCardInfo)
      this.$bus.$off('PolarAlignmentIsRunning', this.updatePolarAlignmentIsRunning)

      // 清理拖动事件监听
      this.cleanupDragListeners()

      // 清理缓存数据
      this.clearCachedData()

      // 停止内存清理定时器
      this.stopMemoryCleanup()

      // 清理防抖定时器
      this.clearDebounceTimers()

      // 实现组件销毁逻辑
      this.cleanup()
    },

    methods: {
      // ========================================
      // 信号总线事件处理
      // ========================================
      showInterface() {
        this.$emit('update:visible', true)
      },

      hideInterface() {
        this.$emit('update:visible', false)
      },

      updateMountConnection(status) {
        this.isConnected = status === 1
        const statusText = this.isConnected ? this.$t('Connected') : this.$t('Disconnected')
        this.addLog(this.$t('Mount Connection Status', [statusText]), this.isConnected ? 'success' : 'warning')
      },

      // ========================================
      // 初始化和清理
      // ========================================
      initialize() {
        this.addLog(this.$t('Polar Alignment Component Initialized'), 'info')
        
        // 记录当前朝向极点
        const facingPole = this.calculateFacingPole()
        const lat = this.$store?.state?.currentLocation?.lat || 'unknown'
        this.addLog(this.$t('Facing Pole', [facingPole, lat]), 'info')
      },

      cleanup() {
        this.addLog(this.$t('Polar Alignment Component Cleaned'), 'info')
      },

      // 内存使用监控（仅在开发环境）
      getMemoryUsage() {
        if (process.env.NODE_ENV === 'development' && performance.memory) {
          return {
            usedJSHeapSize: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + 'MB',
            totalJSHeapSize: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024) + 'MB',
            jsHeapSizeLimit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024) + 'MB',
            logsCount: this.logs.length,
            calibrationPointsCount: this.calibrationPoints.length
          }
        }
        return null
      },

      // 启动定期内存清理
      startMemoryCleanup() {
        this.memoryCleanupTimer = setInterval(() => {
          this.performMemoryCleanup()
        }, 5 * 60 * 1000) // 每5分钟清理一次
      },

      // 停止内存清理定时器
      stopMemoryCleanup() {
        if (this.memoryCleanupTimer) {
          clearInterval(this.memoryCleanupTimer)
          this.memoryCleanupTimer = null
        }
      },

      // 执行内存清理
      performMemoryCleanup() {
        // 清理过期的日志（保留最近50条）
        if (this.logs.length > 50) {
          this.logs = this.logs.slice(-50)
          this.logIndex = Math.min(this.logIndex, 50)
        }

        // 清理过期的校准点（如果超过最大数量）
        if (this.calibrationPoints.length > this.maxCalibrationPoints) {
          this.calibrationPoints = this.calibrationPoints.slice(-this.maxCalibrationPoints)
        }

        // 强制垃圾回收（如果可用）
        if (window.gc && typeof window.gc === 'function') {
          window.gc()
        }

        // 在开发环境输出内存使用情况
        if (process.env.NODE_ENV === 'development') {
          const memoryInfo = this.getMemoryUsage()
          if (memoryInfo) {
            console.log('Memory cleanup performed:', memoryInfo)
          }
        }
      },

      // 清理拖动事件监听器
      cleanupDragListeners() {
        document.removeEventListener('mousemove', this.onDrag)
        document.removeEventListener('mouseup', this.stopDrag)
        document.removeEventListener('touchmove', this.onDrag)
        document.removeEventListener('touchend', this.stopDrag)
      },

      // 清理防抖定时器
      clearDebounceTimers() {
        if (this._azimuthUpdateTimer) {
          clearTimeout(this._azimuthUpdateTimer)
          this._azimuthUpdateTimer = null
        }
        if (this._altitudeUpdateTimer) {
          clearTimeout(this._altitudeUpdateTimer)
          this._altitudeUpdateTimer = null
        }
      },

      // 清理缓存数据
      clearCachedData() {
        // 清理计算缓存
        this.cachedAzimuthArcmin = null
        this.cachedAltitudeArcmin = null
        this.lastAzimuthValue = null
        this.lastAltitudeValue = null
        this.lastDragTime = 0
        
        // 清理日志数据
        this.logs = []
        this.logIndex = 0
        
        // 清理校准数据
        this.calibrationPoints = []
        this.targetPoint = null
        this.fieldData = null
        
        // 清理位置数据
        this.currentPosition = { ra: '00h 00m 00s', dec: '+00° 00\' 00"' }
        this.targetPosition = { ra: '00h 00m 00s', dec: '+00° 00\' 00"' }
        this.previousPosition = { ra: '00h 00m 00s', dec: '+00° 00\' 00"' }
        
        // 清理调整数据
        this.adjustment = { azimuth: 0.0, altitude: 0.0 }
        this.polarAxisOffset = { azimuth: 0, altitude: 0 }
        
        // 重置状态
        this.isCalibrationComplete = false
        this.isPolarAligned = false
        this.calibrationLoopCount = 0
        this.lastCalibrationProgress = 0
        this.calibrationPhase = 'initial'
      },

      // ========================================
      // 拖动控制方法
      // ========================================
      startDrag(event) {
        if (event.target.closest('.header-controls, .minimized-controls, .header-btn, .minimized-btn')) {
          return
        }

        this.isDragging = true
        this.isDraggingState = true

        // 添加dragging类，移除过渡动画
        this.$el.classList.add('dragging')

        const rect = event.currentTarget.getBoundingClientRect()
        const clientX = event.clientX || event.touches?.[0]?.clientX || 0
        const clientY = event.clientY || event.touches?.[0]?.clientY || 0

        this.dragOffset = {
          x: clientX - rect.left,
          y: clientY - rect.top
        }

        // 预计算并缓存尺寸，避免拖动时重复计算
        this.updateCachedDimensions()

        // 优化触摸事件处理
        if (event.type === 'touchstart') {
          document.addEventListener('touchmove', this.onDrag, { passive: false })
          document.addEventListener('touchend', this.stopDrag, { passive: false })
        } else {
          document.addEventListener('mousemove', this.onDrag)
          document.addEventListener('mouseup', this.stopDrag)
        }
      },

      onDrag(event) {
        if (!this.isDragging) return

        // 阻止默认行为，提高触摸响应性
        if (event.type === 'touchmove') {
          event.preventDefault()
        }

        // 使用更高效的节流机制
        const now = Date.now()
        if (this.lastDragTime && now - this.lastDragTime < 16) return // 60fps限制
        this.lastDragTime = now
        
        const clientX = event.clientX || event.touches?.[0]?.clientX || 0
        const clientY = event.clientY || event.touches?.[0]?.clientY || 0

        const newX = clientX - this.dragOffset.x
        const newY = clientY - this.dragOffset.y

        // 使用缓存的尺寸，避免重复计算
        const maxX = window.innerWidth - this.cachedDimensions.width
        const maxY = window.innerHeight - this.cachedDimensions.height

        this.position = {
          x: Math.max(0, Math.min(newX, maxX)),
          y: Math.max(0, Math.min(newY, maxY))
        }
      },

      stopDrag() {
        this.isDragging = false
        this.isDraggingState = false

        // 移除dragging类，恢复过渡动画
        this.$el.classList.remove('dragging')

        // 清理所有事件监听器
        this.cleanupDragListeners()
      },

      // 新增：更新缓存的尺寸信息
      updateCachedDimensions() {
        if (this.isMinimized) {
          this.cachedDimensions = { ...DIMENSIONS.MINIMIZED }
        } else if (this.isCollapsed) {
          this.cachedDimensions = { ...DIMENSIONS.COLLAPSED }
        } else {
          // 展开状态，使用基础尺寸
          this.cachedDimensions = { ...DIMENSIONS.EXPANDED }
        }
      },

      // 获取组件高度（优化版本）
      getComponentHeight() {
        // 如果正在拖动，使用缓存的尺寸
        if (this.isDraggingState) {
          return this.cachedDimensions.height
        }

        // 正常状态下的计算
        if (this.isMinimized) {
          return 80 // 最小化状态高度
        } else if (this.isCollapsed) {
          return 120 // 收缩状态高度
        } else {
          // 展开状态，根据内容自适应
          const baseHeight = 400 // 基础高度
          const logHeight = this.displayLogs.length > 0 ? 60 : 40
          const adjustmentHeight = this.needsAzimuthAdjustment || this.needsAltitudeAdjustment ? 120 : 80
          return Math.min(baseHeight + logHeight + adjustmentHeight, window.innerHeight * 0.8)
        }
      },

      // ========================================
      // 界面状态控制方法
      // ========================================
      toggleMinimize() {
        this.isMinimized = !this.isMinimized
        this.isCollapsed = false
        // 更新缓存的尺寸信息
        this.updateCachedDimensions()
        this.addLog(this.isMinimized ? this.$t('Interface Minimized') : this.$t('Interface Expanded'), 'info')
      },

      toggleCollapse() {
        this.isCollapsed = !this.isCollapsed
        // 更新缓存的尺寸信息
        this.updateCachedDimensions()
        this.addLog(this.isCollapsed ? this.$t('Interface Collapsed') : this.$t('Interface Expanded'), 'info')
      },

      // === 轨迹画布相关 ===
      toggleTrajectoryOverlay() {
        this.showTrajectoryOverlay = !this.showTrajectoryOverlay
        if (this.showTrajectoryOverlay) {
          if (this.overlayMode === 'fullscreen') this.enableOverlayEventCapture(); else this.disableOverlayEventCapture()
          this.$nextTick(() => {
            this.initTrajectoryCanvas()
            this.redrawTrajectory()
          })
        } else {
          this.disableOverlayEventCapture()
        }
      },
      switchToWindowed() {
        this.overlayMode = 'windowed'
        this.disableOverlayEventCapture()
        this.resetViewMapping()
        this.$nextTick(() => {
          this.initTrajectoryCanvas()
          this.redrawTrajectory()
        })
      },
      switchToFullscreen() {
        this.overlayMode = 'fullscreen'
        this.enableOverlayEventCapture()
        this.resetViewMapping()
        this.clearTrajectoryCanvas()
        this.$nextTick(() => {
          this.initTrajectoryCanvas()
          this.redrawTrajectory()
        })
      },
      onOverlayWheel(e) {
        // 已取消全屏缩放需求：忽略滚轮，仅防止穿透
        e.preventDefault()
      },
      resetViewMapping() {
        this.currentPxPerDeg = null
        this.viewMinWorldX = null
        this.viewMaxWorldX = null
        this.viewMinWorldY = null
        this.viewMaxWorldY = null
        this.raUnwrapAnchor = null
        this.viewOffsetXPx = 0
        this.viewOffsetYPx = 0
      },
      // 清空视图映射，但保留 RA 展开锚点，防止清理旧点或模式切换时方向翻转
      resetViewMappingKeepAnchor() {
        const anchor = this.raUnwrapAnchor
        this.currentPxPerDeg = null
        this.viewMinWorldX = null
        this.viewMaxWorldX = null
        this.viewMinWorldY = null
        this.viewMaxWorldY = null
        this.viewOffsetXPx = 0
        this.viewOffsetYPx = 0
        this.raUnwrapAnchor = anchor
      },
      startWindowDrag(event) {
        const e = event.touches ? event.touches[0] : event
        this.windowDrag.active = true
        this.windowDrag.offsetX = e.clientX - this.windowedRect.x
        this.windowDrag.offsetY = e.clientY - this.windowedRect.y
        window.addEventListener('mousemove', this.onWindowDragMove, { passive: false })
        window.addEventListener('mouseup', this.stopWindowDrag, { passive: false })
        window.addEventListener('touchmove', this.onWindowDragMove, { passive: false })
        window.addEventListener('touchend', this.stopWindowDrag, { passive: false })
      },
      onWindowDragMove(event) {
        if (!this.windowDrag.active) return
        const e = event.touches ? event.touches[0] : event
        const nx = e.clientX - this.windowDrag.offsetX
        const ny = e.clientY - this.windowDrag.offsetY
        this.windowedRect.x = Math.max(0, Math.min(nx, window.innerWidth - this.windowedRect.width))
        this.windowedRect.y = Math.max(0, Math.min(ny, window.innerHeight - this.windowedRect.height))
      },
      stopWindowDrag() {
        this.windowDrag.active = false
        window.removeEventListener('mousemove', this.onWindowDragMove)
        window.removeEventListener('mouseup', this.stopWindowDrag)
        window.removeEventListener('touchmove', this.onWindowDragMove)
        window.removeEventListener('touchend', this.stopWindowDrag)
      },
      enableOverlayEventCapture() {
        // 拦截全局滚轮/触摸/鼠标事件，避免穿透到底图
        const preventAll = e => { e.preventDefault(); e.stopPropagation(); }
        this._overlayHandlers = this._overlayHandlers || {}
        this._overlayHandlers.wheel = preventAll
        this._overlayHandlers.touchmove = preventAll
        this._overlayHandlers.mousedown = preventAll
        window.addEventListener('wheel', this._overlayHandlers.wheel, { passive: false, capture: true })
        window.addEventListener('touchmove', this._overlayHandlers.touchmove, { passive: false, capture: true })
        window.addEventListener('mousedown', this._overlayHandlers.mousedown, { passive: false, capture: true })
      },
      disableOverlayEventCapture() {
        if (!this._overlayHandlers) return
        window.removeEventListener('wheel', this._overlayHandlers.wheel, { capture: true })
        window.removeEventListener('touchmove', this._overlayHandlers.touchmove, { capture: true })
        window.removeEventListener('mousedown', this._overlayHandlers.mousedown, { capture: true })
        this._overlayHandlers = null
      },
      clearAllTrajectory() {
        this.rawTrajectoryPoints = []
        this.trajectoryPoints = []
        this.lastRawPosition = null
        this.resetViewMapping()
        this.redrawTrajectory()
      },
      clearOldTrajectory() {
        if (this.rawTrajectoryPoints.length <= 2) return
        this.rawTrajectoryPoints = this.rawTrajectoryPoints.slice(-2)
        this.trajectoryPoints = []
        this.resetViewMappingKeepAnchor()
        this.redrawTrajectory()
      },
      initTrajectoryCanvas() {
        const canvas = this.$refs.trajectoryCanvas
        if (!canvas) return
        const dpr = window.devicePixelRatio || 1
        let w, h, scaleX = 1, scaleY = 1
        if (this.overlayMode === 'fullscreen') {
          w = window.innerWidth
          h = window.innerHeight
          canvas.width = Math.round(w * dpr)
          canvas.height = Math.round(h * dpr)
          canvas.style.width = w + 'px'
          canvas.style.height = h + 'px'
        } else {
          // 窗口模式：使用逻辑画布尺寸，绘制后整体缩放到窗口区域
          const HEADER = 32
          const vw = Math.max(50, Math.round(this.windowedRect.width))
          const vh = Math.max(50, Math.round(this.windowedRect.height - HEADER))
          const lw = this.baseCanvasLogicalSize.width
          const lh = this.baseCanvasLogicalSize.height
          // 计算将逻辑画布缩放到可视窗口的缩放比
          scaleX = vw / lw
          scaleY = vh / lh
          // Canvas 显示尺寸 = 窗口尺寸，内部像素 = 显示尺寸 * DPR
          w = vw
          h = vh
          canvas.style.width = vw + 'px'
          canvas.style.height = vh + 'px'
          canvas.width = Math.round(vw * dpr)
          canvas.height = Math.round(vh * dpr)
        }
        const ctx = canvas.getContext('2d')
        // 设置设备像素比缩放
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        // 窗口模式下增加整体缩放，将逻辑画布缩放到窗口尺寸
        if (this.overlayMode === 'windowed') {
          ctx.scale(scaleX, scaleY)
        }
        this.clearTrajectoryCanvas()
        // 背景由 drawTargetMarker 统一绘制
      },
      clearTrajectoryCanvas() {
        const canvas = this.$refs.trajectoryCanvas
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        ctx.save()
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.restore()
      },
      // === 视图映射与工具 ===
      getCanvasGeom() {
        const canvas = this.$refs.trajectoryCanvas
        if (!canvas) return null
        // 在窗口模式下，Canvas 内部逻辑为 baseCanvasLogicalSize，
        // 外部通过 ctx.scale 显示到窗口，所以几何计算返回逻辑尺寸
        const w = this.overlayMode === 'windowed' ? this.baseCanvasLogicalSize.width : canvas.clientWidth
        const h = this.overlayMode === 'windowed' ? this.baseCanvasLogicalSize.height : canvas.clientHeight
        const padX = Math.round(w * (this.viewPadRatioX || 0.12))
        const padY = Math.round(h * (this.viewPadRatioY || 0.10))
        return { w, h, padX, padY }
      },
      worldForPoint(raDeg, decDeg, timeMsOrDate = null) {
        // 使用地平坐标（Az/Alt）绘制：世界坐标以“目标点”为原点
        if (!this.targetRawPosition) return { x: 0, y: 0 }
        const loc = this.$store?.state?.currentLocation || {}
        const lat = Number(loc.lat)
        const lon = Number(loc.lng)
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return { x: 0, y: 0 }
        const t = (timeMsOrDate instanceof Date) ? timeMsOrDate : new Date(timeMsOrDate || Date.now())
        const cur = this.equatorialToHorizontal(raDeg, decDeg, t, lat, lon)
        const tgt = this.equatorialToHorizontal(this.targetRawPosition.ra, this.targetRawPosition.dec, t, lat, lon)
        let dx = this.normalizeAzDelta(cur.az - tgt.az) // dAz（考虑 0/360 包裹）
        let dy = cur.alt - tgt.alt                    // dAlt
        // 使用基于首点的展开锚点，避免跨 0/360 跳变
        if (this.raUnwrapAnchor != null) {
          while (dx - this.raUnwrapAnchor > 180) dx -= 360
          while (dx - this.raUnwrapAnchor < -180) dx += 360
        }
        return { x: dx, y: dy }
      },
      makeWorldSeq(rawPoints) {
        if (!this.targetRawPosition || !rawPoints || rawPoints.length === 0) return []
        const loc = this.$store?.state?.currentLocation || {}
        const lat = Number(loc.lat)
        const lon = Number(loc.lng)
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return []
        const times = rawPoints.map((p, idx) => {
          if (p.t) return new Date(p.t)
          if (idx > 0 && rawPoints[idx - 1].t) return new Date(rawPoints[idx - 1].t)
          return new Date()
        })
        const targAltAz = times.map(t => this.equatorialToHorizontal(this.targetRawPosition.ra, this.targetRawPosition.dec, t, lat, lon))
        const curAltAz = rawPoints.map((p, i) => this.equatorialToHorizontal(p.ra, p.dec, times[i], lat, lon))
        const dAzNorm = curAltAz.map((c, i) => this.normalizeAzDelta(c.az - targAltAz[i].az))
        let anchor = this.raUnwrapAnchor
        if (anchor == null && dAzNorm.length > 0) anchor = dAzNorm[0]
        const aligned = dAzNorm.map(x => {
          let v = x
          while (v - anchor > 180) v -= 360
          while (v - anchor < -180) v += 360
          return v
        })
        const dAzs = this.unwrapRaDeltaSequence(aligned)
        return rawPoints.map((p, i) => ({ x: dAzs[i], y: curAltAz[i].alt - targAltAz[i].alt }))
      },
      // 基于“全量轨迹”的连续展开，返回用于垂线的最后两点世界坐标（允许超出常规范围）
      getWorldABForPerp() {
        if (!this.targetRawPosition || this.rawTrajectoryPoints.length < 2) return null
        const loc = this.$store?.state?.currentLocation || {}
        const lat = Number(loc.lat)
        const lon = Number(loc.lng)
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
        const all = this.rawTrajectoryPoints
        const tA = new Date(all[all.length - 2].t || Date.now())
        const tB = new Date(all[all.length - 1].t || Date.now())
        const tgtA = this.equatorialToHorizontal(this.targetRawPosition.ra, this.targetRawPosition.dec, tA, lat, lon)
        const tgtB = this.equatorialToHorizontal(this.targetRawPosition.ra, this.targetRawPosition.dec, tB, lat, lon)
        const curA = this.equatorialToHorizontal(all[all.length - 2].ra, all[all.length - 2].dec, tA, lat, lon)
        const curB = this.equatorialToHorizontal(all[all.length - 1].ra, all[all.length - 1].dec, tB, lat, lon)
        let dxA = this.normalizeAzDelta(curA.az - tgtA.az)
        let dxB = this.normalizeAzDelta(curB.az - tgtB.az)
        if (this.raUnwrapAnchor != null) {
          while (dxA - this.raUnwrapAnchor > 180) dxA -= 360
          while (dxA - this.raUnwrapAnchor < -180) dxA += 360
          while (dxB - this.raUnwrapAnchor > 180) dxB -= 360
          while (dxB - this.raUnwrapAnchor < -180) dxB += 360
        }
        const A = { x: dxA, y: curA.alt - tgtA.alt }
        const B = { x: dxB, y: curB.alt - tgtB.alt }
        return { A, B }
      },
      screenForWorld(wx, wy) {
        const g = this.getCanvasGeom()
        if (!g || !Number.isFinite(this.currentPxPerDeg)) return { x: 0, y: 0 }
        const { w, h, padX, padY } = g
        const x = padX + this.viewOffsetXPx + (wx - (this.viewMinWorldX || 0)) * this.currentPxPerDeg
        const y = h - padY - this.viewOffsetYPx - (wy - (this.viewMinWorldY || 0)) * this.currentPxPerDeg
        return { x, y }
      },
      ensureViewMappingInitialized(seqWorld) {
        if (!seqWorld || seqWorld.length === 0) return
        if (this.currentPxPerDeg != null && this.viewMinWorldX != null) return
        const g = this.getCanvasGeom()
        if (!g) return
        const { w, h, padX, padY } = g
        // 起始点：序列第一个；目标原点为 (0,0)
        const first = seqWorld[0]
        // 初始化展开锚点为首点 X（相对目标）
        this.raUnwrapAnchor = first.x
        const minX = Math.min(0, first.x)
        const maxX = Math.max(0, first.x)
        const minY = Math.min(0, first.y)
        const maxY = Math.max(0, first.y)
        const spanX = Math.max(1e-6, maxX - minX)
        const spanY = Math.max(1e-6, maxY - minY)
        const scaleX = (w - 2 * padX) / spanX
        const scaleY = (h - 2 * padY) / spanY
        this.currentPxPerDeg = Math.max(5, Math.min(scaleX, scaleY))
        this.viewMinWorldX = minX
        this.viewMaxWorldX = maxX
        this.viewMinWorldY = minY
        this.viewMaxWorldY = maxY
        // 初次视图内容居中：仅在初始化时设置一次偏移
        const contentWpx = spanX * this.currentPxPerDeg
        const contentHpx = spanY * this.currentPxPerDeg
        this.viewOffsetXPx = Math.round(((w - 2 * padX) - contentWpx) / 2)
        this.viewOffsetYPx = Math.round(((h - 2 * padY) - contentHpx) / 2)
      },
      maybeExpandViewForPoint(wx, wy) {
        // 若点在当前屏幕内，则不更新比例尺；若越界，扩展边界并仅缩小比例尺
        const g = this.getCanvasGeom()
        if (!g || this.currentPxPerDeg == null) return
        const { w, h, padX, padY } = g
        const px = padX + this.viewOffsetXPx + (wx - this.viewMinWorldX) * this.currentPxPerDeg
        const py = h - padY - this.viewOffsetYPx - (wy - this.viewMinWorldY) * this.currentPxPerDeg
        const inside = px >= padX && px <= (w - padX) && py >= padY && py <= (h - padY)
        if (inside) return
        // 扩展世界边界到包含该点
        const newMinX = Math.min(this.viewMinWorldX, wx)
        const newMaxX = Math.max(this.viewMaxWorldX, wx)
        const newMinY = Math.min(this.viewMinWorldY, wy)
        const newMaxY = Math.max(this.viewMaxWorldY, wy)
        const spanX = Math.max(1e-6, newMaxX - newMinX)
        const spanY = Math.max(1e-6, newMaxY - newMinY)
        const scaleX = (w - 2 * padX) / spanX
        const scaleY = (h - 2 * padY) / spanY
        const candidate = Math.max(5, Math.min(scaleX, scaleY))
        // 仅缩小
        this.currentPxPerDeg = this.currentPxPerDeg == null ? candidate : Math.min(this.currentPxPerDeg, candidate)
        this.viewMinWorldX = newMinX
        this.viewMaxWorldX = newMaxX
        this.viewMinWorldY = newMinY
        this.viewMaxWorldY = newMaxY
        // 固定锚点：不再重算偏移，保持目标点屏幕位置恒定
      },
      drawTargetMarker(scaleOverride = null) {
        const canvas = this.$refs.trajectoryCanvas
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        const g = this.getCanvasGeom()
        if (!g) return
        const { w, h } = g
        ctx.save()
        // 背景
        ctx.fillStyle = 'black'
        ctx.fillRect(0, 0, w, h)
        // 目标圆环
        const center = this.screenForWorld(0, 0)
        const ringDeg = this.getTargetRingDeg()
        const scale = (scaleOverride != null ? scaleOverride : this.currentPxPerDeg) || 40
        // 半径限制：不超出可见区域
        const rPx = Math.max(6, Math.min(Math.min(w, h) * 0.45, ringDeg * scale))
        ctx.strokeStyle = '#4CAF50'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(center.x, center.y, rPx, 0, Math.PI * 2)
        ctx.stroke()
        ctx.fillStyle = '#4CAF50'
        ctx.beginPath()
        ctx.arc(center.x, center.y, 3, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      },
      drawTargetAtCenter(ringDegOverride = null) {
        const canvas = this.$refs.trajectoryCanvas
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        const cx = Math.round((this.overlayMode === 'windowed' ? this.baseCanvasLogicalSize.width : canvas.clientWidth) / 2)
        const cy = Math.round((this.overlayMode === 'windowed' ? this.baseCanvasLogicalSize.height : canvas.clientHeight) / 2)
        ctx.save()
        // 黑色背景
        ctx.fillStyle = 'black'
        const bw = this.overlayMode === 'windowed' ? this.baseCanvasLogicalSize.width : canvas.clientWidth
        const bh = this.overlayMode === 'windowed' ? this.baseCanvasLogicalSize.height : canvas.clientHeight
        ctx.fillRect(0, 0, bw, bh)
        // 目标点环（空心）+ 中心小点
        const base = this.autoFitPxPerDeg || 40
        const scalePxPerDeg = base
        const ringDeg = ringDegOverride !== null ? ringDegOverride : this.getTargetRingDeg()
        const halfW = bw / 2
        const halfH = bh / 2
        const pad = 24
        const rMax = Math.max(6, Math.min(halfW - pad, halfH - pad))
        const rPx = Math.max(6, Math.min(rMax, ringDeg * scalePxPerDeg))
        // 空心圆
        ctx.strokeStyle = '#4CAF50'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(cx, cy, rPx, 0, Math.PI * 2)
        ctx.stroke()
        // 中心小点
        ctx.fillStyle = '#4CAF50'
        ctx.beginPath()
        ctx.arc(cx, cy, 3, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      },
      getTargetRingDeg() {
        // 环大小不超过视场半径（取 RA/DEC 跨度的较小一半，留 90% 边距）
        if (!this.fieldData) return 0.3
        const ras = [this.fieldData.ra0, this.fieldData.ra1, this.fieldData.ra2, this.fieldData.ra3]
        const decs = [this.fieldData.dec0, this.fieldData.dec1, this.fieldData.dec2, this.fieldData.dec3]
        const raSpan = Math.max(...ras) - Math.min(...ras)
        const decSpan = Math.max(...decs) - Math.min(...decs)
        const halfMin = Math.max(0.01, Math.min(raSpan, decSpan) / 2)
        return halfMin * 0.9
      },
      raDecToCanvasDelta(raDeg, decDeg) {
        // 将相对目标点的 (ΔRA, ΔDEC) 转换为画布像素偏移。
        // 使用自适应像素/度比例，并在全屏模式下再乘以用户缩放因子。
        const base = this.autoFitPxPerDeg || 40
        const scalePxPerDeg = base
        // 固定约定：RA 增大向右
        const dx = (this.normalizeRaDelta(raDeg)) * scalePxPerDeg
        const dy = (-decDeg) * scalePxPerDeg
        return { dx, dy }
      },
      normalizeRaDelta(deltaDeg) {
        // 将 RA 差值归一到 [-180, 180)
        let x = deltaDeg
        x = ((x + 540) % 360) - 180
        return x
      },
      normalizeAzDelta(deltaDeg) {
        // 将 Az 差值归一到 [-180, 180)
        let x = deltaDeg
        x = ((x + 540) % 360) - 180
        return x
      },

      // === 轨迹点合并/追加（按 Alt/Az 容差） ===
      appendRawTrajectoryPoint(raDeg, decDeg, timeMs = Date.now()) {
        if (!Number.isFinite(raDeg) || !Number.isFinite(decDeg)) return
        const loc = this.$store?.state?.currentLocation || {}
        const lat = Number(loc.lat)
        const lon = Number(loc.lng)
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
          // 无法转换 Alt/Az，则直接追加
          this.rawTrajectoryPoints.push({ ra: raDeg, dec: decDeg, t: timeMs })
          return
        }
        const t = new Date(timeMs)
        // 计算当前点与上一点在 Alt/Az 上的距离
        const curAltAz = this.equatorialToHorizontal(raDeg, decDeg, t, lat, lon)
        const tolDeg = (Number(this.trajectoryMergeTolArcmin) || 0) / 60
        const last = this.rawTrajectoryPoints[this.rawTrajectoryPoints.length - 1]
        if (!last) {
          this.rawTrajectoryPoints.push({ ra: raDeg, dec: decDeg, t: timeMs })
          return
        }
        const lastAltAz = this.equatorialToHorizontal(last.ra, last.dec, new Date(last.t || timeMs), lat, lon)
        const dAz = this.normalizeAzDelta(curAltAz.az - lastAltAz.az)
        const dAlt = curAltAz.alt - lastAltAz.alt
        const sep = Math.hypot(dAz, dAlt)
        if (sep <= tolDeg) {
          // 合并：更新最后一点为当前值（保持时间最新）
          last.ra = raDeg
          last.dec = decDeg
          last.t = timeMs
        } else {
          this.rawTrajectoryPoints.push({ ra: raDeg, dec: decDeg, t: timeMs })
        }
      },
      unwrapRaDeltaSequence(dRaDegList) {
        // 使相邻 dRA 序列在数值上连续，避免跨 0/360 发生长连线
        if (!dRaDegList || dRaDegList.length === 0) return []
        const out = [dRaDegList[0]]
        for (let i = 1; i < dRaDegList.length; i++) {
          let curr = dRaDegList[i]
          let prev = out[i - 1]
          let diff = curr - prev
          while (diff > 180) { curr -= 360; diff = curr - prev }
          while (diff < -180) { curr += 360; diff = curr - prev }
          out.push(curr)
        }
        return out
      },
      appendTrajectoryPoint(rawRaDeg, rawDecDeg) {
        // 已保留以兼容调用，但当前重绘使用 redrawTrajectory 覆盖全量绘制
        if (!this.targetRawPosition) return
        const canvas = this.$refs.trajectoryCanvas
        if (!canvas) return
        const cx = Math.round((this.overlayMode === 'windowed' ? this.baseCanvasLogicalSize.width : canvas.clientWidth) / 2)
        const cy = Math.round((this.overlayMode === 'windowed' ? this.baseCanvasLogicalSize.height : canvas.clientHeight) / 2)
        const dRa = rawRaDeg - this.targetRawPosition.ra
        const dDec = rawDecDeg - this.targetRawPosition.dec
        const { dx, dy } = this.raDecToCanvasDelta(dRa, dDec)
        const point = { x: cx + dx, y: cy + dy }
        this.trajectoryPoints.push(point)
        this.drawPoint(point.x, point.y, '#FFD54F')
      },
      drawPoint(x, y, color) {
        const canvas = this.$refs.trajectoryCanvas
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        ctx.save()
        ctx.fillStyle = color || '#00BFFF'
        ctx.beginPath()
        ctx.arc(x, y, 3, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      },
      drawArrow(x1, y1, x2, y2, color) {
        const canvas = this.$refs.trajectoryCanvas
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        ctx.save()
        ctx.strokeStyle = color || '#FFD54F'
        ctx.fillStyle = color || '#FFD54F'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.stroke()
        // 箭头
        const angle = Math.atan2(y2 - y1, x2 - x1)
        const headLen = 8
        ctx.beginPath()
        ctx.moveTo(x2, y2)
        ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6))
        ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6))
        ctx.lineTo(x2, y2)
        ctx.fill()
        ctx.restore()
      },
      // 画从目标到最后一段的垂线（虚线）；如垂足不在段内，仅将线段有限延长至垂点
      drawPerpendicularAuxLine() {
        if (!this.targetRawPosition || this.rawTrajectoryPoints.length < 2) return
        // 使用“全量连续展开”的最后两点，允许 RA 超出常规范围，保证几何连续
        const pair = this.getWorldABForPerp(); if (!pair) return
        const { A, B } = pair
        const O = { x: 0, y: 0 } // 目标在世界坐标为原点（与 worldForPoint/展开保持一致）
        // 线段 AB 的向量与 O 到 AB 的投影参数 t
        const vx = B.x - A.x
        const vy = B.y - A.y
        const len2 = vx * vx + vy * vy
        if (len2 < 1e-9) return
        const t = ((O.x - A.x) * vx + (O.y - A.y) * vy) / len2
        let Hx, Hy, segment
        if (t >= 0 && t <= 1) {
          // 垂足在线段上
          Hx = A.x + t * vx
          Hy = A.y + t * vy
          // 垂足在线段上时，不再绘制整段，只画 O→H 的垂线
          segment = null
        } else {
          // 垂足在线段外：计算真正的垂足 H，并把线段朝 H 方向有限延长至 H
          Hx = A.x + t * vx
          Hy = A.y + t * vy
          if (t < 0) {
            segment = { x1: Hx, y1: Hy, x2: A.x, y2: A.y }
          } else {
            segment = { x1: B.x, y1: B.y, x2: Hx, y2: Hy }
          }
        }
        // 画垂线（O->H）与（可能的延长）线段，均使用虚线
        const canvas = this.$refs.trajectoryCanvas
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        const Opx = this.screenForWorld(O.x, O.y)
        const Hpx = this.screenForWorld(Hx, Hy)
        // const S1 = this.screenForWorld(segment.x1, segment.y1)
        // const S2 = this.screenForWorld(segment.x2, segment.y2)
        ctx.save()
        ctx.setLineDash([6, 6])
        ctx.lineWidth = 1.5
        ctx.strokeStyle = '#9E9E9E'
        // 垂线 O-H
        ctx.beginPath()
        ctx.moveTo(Opx.x, Opx.y)
        ctx.lineTo(Hpx.x, Hpx.y)
        ctx.stroke()
        // 在辅助线（虚线）上用箭头标明方向：从 H 指向 O（指向目标）
        // 选择线段内一点作为箭头位置，避免与目标环重叠
        const tArrow = 0.6
        const ax = Hpx.x + (Opx.x - Hpx.x) * tArrow
        const ay = Hpx.y + (Opx.y - Hpx.y) * tArrow
        const ang = Math.atan2(Opx.y - Hpx.y, Opx.x - Hpx.x)
        const head = 8
        ctx.setLineDash([])
        ctx.fillStyle = '#9E9E9E'
        ctx.beginPath()
        ctx.moveTo(ax, ay)
        ctx.lineTo(ax - head * Math.cos(ang - Math.PI / 6), ay - head * Math.sin(ang - Math.PI / 6))
        ctx.lineTo(ax - head * Math.cos(ang + Math.PI / 6), ay - head * Math.sin(ang + Math.PI / 6))
        ctx.closePath()
        ctx.fill()
        // 恢复虚线样式，用于绘制延长段
        ctx.setLineDash([6, 6])
        // 仅当垂足不在段上时绘制“延长到垂点”的那段
        if (segment) {
          const S1 = this.screenForWorld(segment.x1, segment.y1)
          const S2 = this.screenForWorld(segment.x2, segment.y2)
          ctx.beginPath()
          ctx.moveTo(S1.x, S1.y)
          ctx.lineTo(S2.x, S2.y)
          ctx.stroke()
          // 在延长段上也标注一个朝向“垂足 H”的小箭头
          const exStart = (t < 0) ? { x: A.x, y: A.y } : { x: B.x, y: B.y }
          const exEnd = { x: Hx, y: Hy }
          const ES = this.screenForWorld(exStart.x, exStart.y)
          const EE = this.screenForWorld(exEnd.x, exEnd.y)
          const exdx = EE.x - ES.x
          const exdy = EE.y - ES.y
          const exLen2 = exdx * exdx + exdy * exdy
          if (exLen2 > 1) {
            const tEx = 0.5
            const eax = ES.x + exdx * tEx
            const eay = ES.y + exdy * tEx
            const eang = Math.atan2(exdy, exdx)
            ctx.setLineDash([])
            ctx.beginPath()
            ctx.moveTo(eax, eay)
            ctx.lineTo(eax - head * Math.cos(eang - Math.PI / 6), eay - head * Math.sin(eang - Math.PI / 6))
            ctx.lineTo(eax - head * Math.cos(eang + Math.PI / 6), eay - head * Math.sin(eang + Math.PI / 6))
            ctx.closePath()
            ctx.fill()
          }
        }
        ctx.restore()
      },
      computeAutoFitScale() {
        const canvas = this.$refs.trajectoryCanvas
        if (!canvas || !this.targetRawPosition) return 40
        const cx = this.targetRawPosition.ra
        const cy = this.targetRawPosition.dec
        let maxDx = 0, maxDy = 0
        // 历史点
        for (let i = 0; i < this.rawTrajectoryPoints.length; i++) {
          const p = this.rawTrajectoryPoints[i]
          maxDx = Math.max(maxDx, Math.abs(this.normalizeRaDelta(p.ra - cx)))
          maxDy = Math.max(maxDy, Math.abs(p.dec - cy))
        }
        // 目标环半径（确保环不会顶边）
        const ringDeg = this.getTargetRingDeg()
        maxDx = Math.max(maxDx, ringDeg)
        maxDy = Math.max(maxDy, ringDeg)
        // 全屏时纳入视场角点以适配视场框；窗口模式不纳入
        if (this.overlayMode === 'fullscreen') {
          if (this.fieldData && Number.isFinite(this.fieldData.ra0)) {
            const corners = [
              { ra: this.fieldData.ra0, dec: this.fieldData.dec0 },
              { ra: this.fieldData.ra1, dec: this.fieldData.dec1 },
              { ra: this.fieldData.ra2, dec: this.fieldData.dec2 },
              { ra: this.fieldData.ra3, dec: this.fieldData.dec3 },
            ]
            for (const c of corners) {
              maxDx = Math.max(maxDx, Math.abs(this.normalizeRaDelta(c.ra - cx)))
              maxDy = Math.max(maxDy, Math.abs(c.dec - cy))
            }
          }
        }
        if (maxDx === 0 && maxDy === 0) return 40
        const w = this.overlayMode === 'windowed' ? this.baseCanvasLogicalSize.width : canvas.clientWidth
        const h = this.overlayMode === 'windowed' ? this.baseCanvasLogicalSize.height : canvas.clientHeight
        // 固定像素内边距，考虑箭头长度（8px）与点半径（4px）
        const arrowHead = 8, pointR = 4
        const pixelPadding = 32 + arrowHead + pointR
        const halfW = Math.max(60, (w / 2) - pixelPadding)
        const halfH = Math.max(50, (h / 2) - pixelPadding)
        // 让最远点落在中心到边界距离的 80% 处（留足可视余量）
        const margin = 0.8
        let scale = Math.max(5, Math.min((halfW * margin) / (maxDx || 1e-6), (halfH * margin) / (maxDy || 1e-6)))
        // 二次校验：按该比例转换一次，确保确实未越界，如越界再缩小比例
        const pad = pixelPadding
        const cxPx = w / 2, cyPx = h / 2
        let maxAbsPxX = 0, maxAbsPxY = 0
        const collect = []
        for (let i = 0; i < this.rawTrajectoryPoints.length; i++) collect.push(this.rawTrajectoryPoints[i])
        if (this.overlayMode === 'fullscreen' && this.fieldData && Number.isFinite(this.fieldData.ra0)) {
          collect.push({ ra: this.fieldData.ra0, dec: this.fieldData.dec0 })
          collect.push({ ra: this.fieldData.ra1, dec: this.fieldData.dec1 })
          collect.push({ ra: this.fieldData.ra2, dec: this.fieldData.dec2 })
          collect.push({ ra: this.fieldData.ra3, dec: this.fieldData.dec3 })
        }
        for (const p of collect) {
          const dxDeg = this.normalizeRaDelta(p.ra - cx)
          const dyDeg = (p.dec - cy)
          maxAbsPxX = Math.max(maxAbsPxX, Math.abs(dxDeg * scale))
          maxAbsPxY = Math.max(maxAbsPxY, Math.abs(dyDeg * scale))
        }
        const allowedX = halfW - pad
        const allowedY = halfH - pad
        const adj = Math.min(1, allowedX / (maxAbsPxX || 1e-6), allowedY / (maxAbsPxY || 1e-6))
        scale *= adj
        return scale
      },
      redrawTrajectory() {
        if (!this.showTrajectoryOverlay || !this.targetRawPosition) return
        this.initTrajectoryCanvas()
        const canvas = this.$refs.trajectoryCanvas
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        // 预先将所有点转换到世界坐标，并初始化映射
        const rawAll = this.rawTrajectoryPoints
        // 使用全量点序列初始化/扩展视图映射，确保跨 0/360 时展开方向一致
        const ensureRaw = rawAll
        const worldSeq = this.makeWorldSeq(ensureRaw)
        // 当存在视场数据时，也将视场四角纳入初始映射，防止目标附近尺度过小导致视场绘制异常
        let fovWorld = []
        if (this.fieldData) {
          const timeRef = rawAll.length ? new Date(rawAll[rawAll.length - 1].t || Date.now()) : new Date()
          const corners = [
            { ra: this.fieldData.ra0, dec: this.fieldData.dec0 },
            { ra: this.fieldData.ra1, dec: this.fieldData.dec1 },
            { ra: this.fieldData.ra2, dec: this.fieldData.dec2 },
            { ra: this.fieldData.ra3, dec: this.fieldData.dec3 },
          ]
          fovWorld = corners.map(c => this.worldForPoint(c.ra, c.dec, timeRef))
        }
        this.ensureViewMappingInitialized(worldSeq.concat(fovWorld))
        // 选择绘制的数据集：全屏=全部；窗口=最新三个，但保持展开锚点稳定
        const raw = this.overlayMode === 'windowed' ? rawAll.slice(-3) : rawAll
        const world = this.makeWorldSeq(raw)
        // 先走一遍更新比例/边界，不绘制，确保下游图元坐标系一致
        for (let i = 0; i < world.length; i++) this.maybeExpandViewForPoint(world[i].x, world[i].y)
        for (let i = 0; i < fovWorld.length; i++) this.maybeExpandViewForPoint(fovWorld[i].x, fovWorld[i].y)
        // 再绘背景/目标环
        this.drawTargetMarker()
        // 绘制轨迹
        this.trajectoryPoints = []
        let prevPt = null
        for (let i = 0; i < world.length; i++) {
          const spt = this.screenForWorld(world[i].x, world[i].y)
          const px = spt.x
          const py = spt.y
          const isLast = i === raw.length - 1
          if (!isLast) {
            this.drawPoint(px, py, '#FFD54F')
            if (prevPt) this.drawArrow(prevPt.x, prevPt.y, px, py, '#FFD54F')
          } else {
            // 当前位置以空心圆表示（半径约 1 角分）
            const arcmin = (this.calibrationCircleArcmin || 1)
            const rPx = Math.max(4, (arcmin / 60) * ((this.currentPxPerDeg || 40)))
            this.drawHollowCircle(px, py, rPx, '#00BFFF', 2)
            // 圈住目标（目标在世界原点），当圆心到原点的距离小于半径时视为完成
            const rDeg = Math.hypot(world[i].x, world[i].y)
            if (rDeg <= (arcmin / 60)) {
              if (!this.isPolarAligned) {
                this.isPolarAligned = true
                this.addLog(this.$t('Polar Alignment Completed'), 'success')
              }
            }
            if (prevPt) this.drawArrow(prevPt.x, prevPt.y, px, py, '#FFD54F')
          }
          prevPt = { x: px, y: py }
          this.trajectoryPoints.push({ x: px, y: py })
        }
        // 辅助：目标到最后段的垂线（虚线）
        this.drawPerpendicularAuxLine()
      },
      drawHollowCircle(x, y, r = 8, color = '#FFFFFF', lineWidth = 2) {
        const canvas = this.$refs.trajectoryCanvas
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        ctx.save()
        ctx.strokeStyle = color
        ctx.lineWidth = lineWidth
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.stroke()
        ctx.restore()
      },
      // FoV 绘制已不再需要

      resetCalibration() {
        // 使用统一的内存清理方法
        this.clearCachedData()

        this.addLog(this.$t('Calibration Data Reset'), 'info')
        // this.$bus.$emit('AppSendMessage', 'Vue_Command', 'ResetAutoPolarAlignment')
        this.$bus.$emit('ClearCalibrationPoints')
        this.$bus.$emit('ClearStatusTextFromStarMap')
        // 清空轨迹
        this.rawTrajectoryPoints = []
        this.trajectoryPoints = []
        this.lastRawPosition = null
        this.targetRawPosition = null
      },

      restoreCalibration() {
        this.addLog(this.$t('Calibration Data Restored'), 'success')
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'RestoreAutoPolarAlignment')
      },

      // ========================================
      // 校准控制方法
      // ========================================
      startAutoCalibration() {
        if (!this.isConnected) {
          this.addLog(this.$t('Error: Mount Not Connected'), 'error')
          return
        }
        if (this.isCalibrationRunning) {
          this.stopAutoCalibration()
          return
        }
        this.isCalibrationRunning = true
        this.resetCalibration()
        this.addLog(this.$t('Starting Auto Calibration'), 'info')
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'StartAutoPolarAlignment')
      },

      stopAutoCalibration() {
        this.isCalibrationRunning = false
        this.addLog(this.$t('Auto Calibration Stopped'), 'warning')
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'StopAutoPolarAlignment')
      },
      // ========================================
      // 视场数据处理方法
      // ========================================
      updateFieldData(data) {
        if (data && Array.isArray(data) && data.length >= 12) { // 修改长度检查，确保包含假极轴数据
          const isValidData = data.every(val => typeof val === 'number' && !isNaN(val))
          if (!isValidData) {
            this.addLog(this.$t('Warning: Invalid Field Data Received'), 'warning')
            return
          }

          this.fieldData = {
            ra: data[0],
            dec: data[1],
            ra0: data[2],
            dec0: data[3],
            ra1: data[4],
            dec1: data[5],
            ra2: data[6],
            dec2: data[7],
            ra3: data[8],
            dec3: data[9],
            targetra: data[10],
            targetdec: data[11],
            fakePolarRA: data[12],
            fakePolarDEC: data[13],
            realPolarRA: data[14],
            realPolarDEC: data[15]
          }

          // 保存上一次位置（在更新当前位置之前）
          if (this.currentPosition.ra !== '00h 00m 00s') {
            this.previousPosition = { ...this.currentPosition }
          }

          // 更新当前位置
          this.currentPosition = {
            ra: this.formatCoordinate(data[0], 'ra'),
            dec: this.formatCoordinate(data[1], 'dec')
          }

          // === 轨迹逻辑挂接 ===
          // 使用原始角度（假设 data[0], data[1], data[10], data[11] 为度单位）
          const rawRa = data[0]
          const rawDec = data[1]
          // 在进入调整阶段（目标提供）时固定目标点；否则不绘制
          if (data[10] !== -1 && data[11] !== -1) {
            if (!this.targetRawPosition || (this.targetRawPosition.ra !== data[10] || this.targetRawPosition.dec !== data[11])) {
              this.targetRawPosition = { ra: data[10], dec: data[11] }
              // 重绘以目标点为中心
              if (this.showTrajectoryOverlay) this.redrawTrajectory()
            }
            const posChanged = !this.lastRawPosition || this.lastRawPosition.ra !== rawRa || this.lastRawPosition.dec !== rawDec
            if (posChanged) {
              this.appendRawTrajectoryPoint(rawRa, rawDec, Date.now())
              // 改为全量重绘（确保自适应比例包含所有点、并绘制视场框）
              if (this.showTrajectoryOverlay) this.redrawTrajectory()
              this.lastRawPosition = { ra: rawRa, dec: rawDec }
            }
          }

          if (data[10] === -1 && data[11] === -1) {
            // 校准点收集阶段
            this.calibrationPhase = 'collecting'
            const pointNumber = this.calibrationPoints.length + 1

            // 添加调试信息
            this.addLog(`准备收集校准点${pointNumber}，当前已有${this.calibrationPoints.length}个点`, 'info')

            try {
              this.drawCalibrationPointPolygon(data[0], data[1], pointNumber, this.fieldData)
              this.addLog(this.$t('Calibration Point', [pointNumber, data[0].toFixed(4), data[1].toFixed(4)]), 'info')

              // 保存校准点 - 限制最大数量
              if (this.calibrationPoints.length < this.maxCalibrationPoints) {
                this.calibrationPoints.push({
                  ra: data[0],
                  dec: data[1],
                  index: pointNumber
                })
              } else {
                // 如果超过最大数量，替换最旧的点
                const oldestIndex = (pointNumber - 1) % this.maxCalibrationPoints
                this.calibrationPoints[oldestIndex] = {
                  ra: data[0],
                  dec: data[1],
                  index: pointNumber
                }
              }

              this.addLog(`校准点${pointNumber}已添加，现在总共有${this.calibrationPoints.length}个点`, 'info')

              // 如果收集了3个点，进入调整阶段
              if (this.calibrationPoints.length === this.maxCalibrationPoints) {
                this.calibrationPhase = 'adjusting'
                this.addLog(this.$t('Three calibration points collected, entering adjustment phase'), 'success')
              }
            } catch (error) {
              this.addLog(this.$t('Error processing calibration point', [error.message]), 'error')
              console.error('处理校准点错误：', error)
            }
          } else if (data[10] !== -1 && data[11] !== -1) {
            // 调整阶段：显示目标位置和假极轴
            this.calibrationPhase = 'adjusting'
            this.targetPoint = { ra: data[10], dec: data[11] }

            try {
              // 先清除所有之前的元素
              this.addLog('调整模式：准备清除之前的校准元素', 'info')
              this.$bus.$emit('ClearCalibrationPoints')
              this.addLog('调整模式：清除命令已发送', 'info')

              // 绘制校准点（如果已收集3个点）
              if (this.calibrationPoints.length === this.maxCalibrationPoints) {
                this.calibrationPoints.forEach((point, index) => {
                  const pointCoordinates = this.calculateFieldCorners(point.ra, point.dec, this.fieldData, false)
                  const pointColor = {
                    stroke: "#FFD700",        // 金色边框：校准点
                    strokeOpacity: 1,         // 边框不透明度
                    fill: "#FFD700",          // 金色填充：校准点
                    fillOpacity: 0.3          // 填充不透明度（半透明）
                  }

                  this.$bus.$emit('DrawCalibrationPointPolygon', pointCoordinates, pointColor,
                    `Calibration_Point_${index + 1}`)
                })
              }

              // 绘制当前位置（蓝色）
              const currentCoordinates = this.calculateFieldCorners(data[0], data[1], this.fieldData, false)
              const currentColor = {
                stroke: "#00BFFF",        // 蓝色边框：当前位置
                strokeOpacity: 1,         // 边框不透明度
                fill: "#00BFFF",          // 蓝色填充：当前位置
                fillOpacity: 0.3          // 填充不透明度（半透明）
              }

              this.$bus.$emit('DrawCalibrationPointPolygon', currentCoordinates, currentColor,
                'Current_Position')

              // 绘制目标点（绿色圆形）
              const targetColor = {
                stroke: "#4CAF50",        // 绿色边框：目标点
                strokeOpacity: 1,         // 边框不透明度
                fill: "#4CAF50",          // 绿色填充：目标点
                fillOpacity: 0.3          // 填充不透明度（半透明）
              }

              const { az, alt } = this.equatorialToHorizontal(data[10], data[11], new Date(Date.now()), this.$store.state.currentLocation.lat, this.$store.state.currentLocation.lng)
              // console.log('当前位置目标点', data[6], data[7] + ' 转化为地平坐标为' + az + ' ' + alt);
              // console.log('使用时间和地点', new Date(Date.now()), $store.state.currentLocation.lat, $store.state.currentLocation.lng);

              this.$bus.$emit('DrawTargetPointCircle',
                az,
                alt,
                targetColor,
                'Target_Point',
                '目标点'
              )

              // 绘制假极轴（紫色圆形）
              if (data[12] !== -1 && data[13] !== -1 && !isNaN(data[12]) && !isNaN(data[13])) {
                const { az, alt } = this.equatorialToHorizontal(data[12], data[13], new Date(Date.now()), this.$store.state.currentLocation.lat, this.$store.state.currentLocation.lng)
                this.drawFakePolarAxis(az, alt)
              }

              this.addLog(`调整模式：当前位置(${data[0].toFixed(4)}, ${data[1].toFixed(4)}) 目标位置(${data[6].toFixed(4)}, ${data[7].toFixed(4)}) 假极轴(${data[8].toFixed(4)}, ${data[9].toFixed(4)})`, 'info')
            } catch (error) {
              this.addLog(this.$t('Error processing adjustment data', [error.message]), 'error')
              console.error('处理调整数据错误：', error)
            }
          }
        } else {
          this.addLog(this.$t('Error: Invalid Field Data Format'), 'error')
        }
      },

      // 绘制校准点
      drawCalibrationPointPolygon(ra, dec, pointNumber, fieldData) {
        this.addLog(this.$t('Drawing Calibration Point', [pointNumber, ra, dec]), 'info')

        try {
          const coordinates = this.calculateFieldCorners(ra, dec, fieldData)
          this.addLog(this.$t('Calculated Field Corner Coordinates', [JSON.stringify(coordinates)]), 'info')

          // 验证坐标有效性
          const validCoordinates = coordinates.every((coord, index) => {
            const isValid = coord && typeof coord.ra === 'number' && typeof coord.dec === 'number' &&
              !isNaN(coord.ra) && !isNaN(coord.dec) && isFinite(coord.ra) && isFinite(coord.dec)
            if (!isValid) {
              this.addLog(this.$t('Warning: Invalid Coordinate Point', [index, JSON.stringify(coord)]), 'warning')
            }
            return isValid
          })

          if (!validCoordinates) {
            this.addLog(this.$t('Invalid Field Coordinates'), 'error')
            return
          }

          const color = this.getCalibrationPointColor()

          // 添加文本标签
          const label = `校准点${pointNumber}`
          const labelColor = "#FFFFFF"

          this.addLog(this.$t('Sending Draw Calibration Event', [pointNumber]), 'info')
          this.$bus.$emit('DrawCalibrationPointPolygon', coordinates, color, `Calibration_${pointNumber}`)

        } catch (error) {
          this.addLog(this.$t('Error Drawing Calibration Point', [error.message]), 'error')
          console.error('绘制校准点错误：', error)
        }
      },

      // 清除所有校准点
      clearCalibrationPoints() {
        this.addLog(this.$t('Clearing All Calibration Points'), 'info')
        this.$bus.$emit('ClearCalibrationPoints')
        this.$bus.$emit('ClearStatusTextFromStarMap')
      },

      /**
       * 绘制极轴校准调整点
       * 在星图上绘制当前位置、目标位置、校准点等关键位置标记
       * @param {number} currentRa - 当前赤经位置
       * @param {number} currentDec - 当前赤纬位置  
       * @param {number} targetRa - 目标赤经位置
       * @param {number} targetDec - 目标赤纬位置
       * @param {object} fieldData - 视场数据（包含视场边界信息）
       * @param {boolean} isTimerUpdate - 是否为定时器更新（用于区分手动更新和自动更新）
       */
      drawAdjustmentPoints(currentRa, currentDec, targetRa, targetDec, fieldData, isTimerUpdate = false) {
        // 这个方法现在主要用于校准点收集阶段
        // 调整阶段的绘制逻辑已经移到updateFieldData方法中

        this.addLog(this.$t('Starting Draw Adjustment Points', [currentRa, currentDec, targetRa, targetDec]), 'info')

        try {
          // 只在校准点收集阶段使用这个方法
          if (this.calibrationPhase === 'collecting') {
            // 绘制校准点收集阶段的逻辑
            const currentCoordinates = this.calculateFieldCorners(currentRa, currentDec, fieldData, false)
            const currentColor = {
              stroke: "#00BFFF",        // 蓝色边框：当前位置
              strokeOpacity: 1,         // 边框不透明度
              fill: "#00BFFF",          // 蓝色填充：当前位置
              fillOpacity: 0.3          // 填充不透明度（半透明）
            }

            this.$bus.$emit('DrawCalibrationPointPolygon', currentCoordinates, currentColor,
              'Current_Position')
          }

        } catch (error) {
          this.addLog(this.$t('Error Drawing Adjustment Points', [error.message]), 'error')
          console.error('绘制调整点错误：', error)
        }
      },

      /**
       * 计算视场的五个角点坐标
       * @param {number} centerRa - 视场中心的赤经坐标
       * @param {number} centerDec - 视场中心的赤纬坐标
       * @param {object} fieldData - 视场数据（包含视场边界信息）
       * @param {boolean} useDefaultSize - 是否使用默认视场大小（用于目标点等固定位置）
       * @returns {Array} 包含5个角点坐标的数组，用于绘制多边形
       */
      calculateFieldCorners(centerRa, centerDec, fieldData, useDefaultSize = false) {
        this.addLog(this.$t('Calculating Field Corners', [centerRa, centerDec]), 'info')

        // 如果指定使用默认大小或者没有视场数据，使用默认的0.5度视场大小
        if (useDefaultSize || !fieldData) {
          this.addLog(this.$t('Using Default Field Size: 0.5 Degrees'), 'info')
          const fieldSize = 0.5
          const coordinates = [
            { ra: centerRa + fieldSize / 2, dec: centerDec + fieldSize / 2 },
            { ra: centerRa - fieldSize / 2, dec: centerDec + fieldSize / 2 },
            { ra: centerRa - fieldSize / 2, dec: centerDec - fieldSize / 2 },
            { ra: centerRa + fieldSize / 2, dec: centerDec - fieldSize / 2 },
            { ra: centerRa + fieldSize / 2, dec: centerDec + fieldSize / 2 }
          ]
          this.addLog(this.$t('Default Field Corners', [JSON.stringify(coordinates)]), 'info')
          return coordinates
        }

        // 如果有视场数据且不强制使用默认大小，基于传入的中心点坐标计算视场角点
        // 这种情况主要用于当前位置的显示，需要反映实际的视场大小
        const { ra0, dec0, ra1, dec1, ra2, dec2, ra3, dec3 } = fieldData

        // 计算视场的实际大小（RA和DEC方向的跨度）
   

        // 基于传入的中心点坐标，计算视场的五个角点
        const coordinates = [
          { ra: ra0, dec: dec0 },     // 右上角
          { ra: ra1, dec: dec1 },     // 左上角
          { ra: ra2, dec: dec2 },     // 左下角
          { ra: ra3, dec: dec3 },     // 右下角
          { ra: ra0, dec: dec0 }      // 回到右上角（闭合多边形）
        ]

        this.addLog(this.$t('Using Field Data', [ra0, dec0, ra1, dec1, ra2, dec2, ra3, dec3]), 'info')
        this.addLog(this.$t('Field Corner Calculation Result', [JSON.stringify(coordinates)]), 'info')
        return coordinates
      },



      // ========================================
      // 格式化方法
      // ========================================
      formatTime(timestamp) {
        if (!timestamp) return ''
        const date = new Date(timestamp)
        return date.toLocaleTimeString('zh-CN', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
      },

      formatAdjustmentValue(value) {
        if (!Number.isFinite(value)) return `0.0${this.unitGlyph(this.adjustmentUnit)}`
        // value 的单位 = props.adjustmentUnit
        const valArcmin = this.unitToArcmin(value, this.adjustmentUnit)
        // 展示单位仍然用 props.adjustmentUnit（也可改成固定'arcmin'）
        return this.formatWithUnit(valArcmin, this.adjustmentUnit, 1)
      },

      // 格式化坐标显示
      formatCoordinate(value, type) {
        if (value === null || value === undefined || isNaN(value)) {
          return type === 'ra' ? '00h 00m 00s' : '+00° 00\' 00"'
        }

        if (type === 'ra') {
          // 格式化RA为时分秒格式
          const hours = Math.floor(value / 15)
          const minutes = Math.floor((value % 15) * 4)
          const seconds = Math.floor(((value % 15) * 4 - minutes) * 60)
          return `${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`
        } else {
          // 格式化DEC为度分秒格式
          const sign = value >= 0 ? '+' : '-'
          const absValue = Math.abs(value)
          const degrees = Math.floor(absValue)
          const minutes = Math.floor((absValue - degrees) * 60)
          const seconds = Math.floor(((absValue - degrees) * 60 - minutes) * 60)
          return `${sign}${degrees.toString().padStart(2, '0')}° ${minutes.toString().padStart(2, '0')}' ${seconds.toString().padStart(2, '0')}"`
        }
      },


      // ========================================
      // 辅助方法
      // ========================================
      parseCoordinate(value, type) {
        if (typeof value === 'string') {
          if (type === 'ra') {
            // 解析时分秒格式 "00h 00m 00s"
            const match = value.match(/(\d+)h\s*(\d+)m\s*(\d+)s/)
            if (match) {
              const hours = parseInt(match[1])
              const minutes = parseInt(match[2])
              const seconds = parseInt(match[3])
              return hours + minutes / 60 + seconds / 3600
            }
          } else {
            // 解析度分秒格式 "+00° 00' 00""
            const match = value.match(/([+-]?)(\d+)°\s*(\d+)'\s*(\d+)"/)
            if (match) {
              const sign = match[1] === '-' ? -1 : 1
              const degrees = parseInt(match[2])
              const minutes = parseInt(match[3])
              const seconds = parseInt(match[4])
              return sign * (degrees + minutes / 60 + seconds / 3600)
            }
          }
        }
        return null
      },

      addStatusTextToStarMap() {
        // 添加状态文本到星图
        const statusText = {
          text: `极轴校准调整中 - 校准点: ${this.calibrationPoints.length}/3`,
          position: { ra: this.currentPosition.ra, dec: this.currentPosition.dec },
          color: "#FFFFFF",
          fontSize: 14,
          backgroundColor: "rgba(0, 0, 0, 0.7)"
        }

        // 发送状态文本到星图
        // this.$bus.$emit('AddStatusTextToStarMap', statusText)
      },

      getStepClass(index) {
        // 根据进度百分比确定节点状态
        const progress = this.progressPercentage

        switch (index) {
          case 0: // 初始化节点
            if (progress >= PROGRESS_THRESHOLDS.INITIALIZATION) return { completed: true }
            if (progress >= 0) return { current: true }
            return {}

          case 1: // 第一次校准节点
            if (progress >= PROGRESS_THRESHOLDS.FIRST_CALIBRATION) return { completed: true }
            if (progress >= PROGRESS_THRESHOLDS.INITIALIZATION) return { current: true }
            return {}

          case 2: // 第二次校准节点
            if (progress >= PROGRESS_THRESHOLDS.SECOND_CALIBRATION) return { completed: true }
            if (progress >= PROGRESS_THRESHOLDS.FIRST_CALIBRATION) return { current: true }
            return {}

          case 3: // 第三次校准节点
            if (progress >= PROGRESS_THRESHOLDS.THIRD_CALIBRATION) return { completed: true }
            if (progress >= PROGRESS_THRESHOLDS.SECOND_CALIBRATION) return { current: true }
            return {}

          default:
            return {}
        }
      },

      getAzimuthAction(azVal) {
        if (!Number.isFinite(azVal)) return ''
        const arcmin = this.unitToArcmin(azVal, this.adjustmentUnit)
        if (Math.abs(arcmin) <= this.deadbandArcmin) return this.$t('No adjustment needed')
        const dir = this.azLabelBySign(arcmin)
        // 输出单位与 props.adjustmentUnit 保持一致
        return `${dir} ${this.formatWithUnit(arcmin, this.adjustmentUnit, 1)}`
      },

      getAltitudeAction(altVal) {
        if (!Number.isFinite(altVal)) return ''
        const arcmin = this.unitToArcmin(altVal, this.adjustmentUnit)
        if (Math.abs(arcmin) <= this.deadbandArcmin) return this.$t('No adjustment needed')
        const dir = this.altLabelBySign(arcmin)
        return `${dir} ${this.formatWithUnit(arcmin, this.adjustmentUnit, 1)}`
      },



      // ========================================
      // 日志方法
      // ========================================
      addLog(message, level = 'info') {
        const log = {
          id: Date.now() + Math.random(),
          message,
          level,
          timestamp: new Date()
        }
        
        // 生产环境减少console输出
        if (process.env.NODE_ENV === 'development') {
          console.log(log.message)
        }
        
        // 使用循环数组优化内存使用
        if (this.logs.length < this.logCapacity) {
          this.logs.push(log)
        } else {
          // 循环覆盖旧日志
          this.logs[this.logIndex] = log
          this.logIndex = (this.logIndex + 1) % this.logCapacity
        }
      },

      clearLogs() {
        this.logs = []
        this.logIndex = 0
      },

      // ========================================
      // 极轴校准状态更新方法
      // ========================================
      calculatePolarAxisOffset() {
        this.polarAxisOffset = {
          azimuth: this.adjustment.azimuth,
          altitude: this.adjustment.altitude
        }
      },

      updatePolarAlignmentState(stateNumber, logMessage, progress) {
        if (logMessage && typeof logMessage === 'string') {
          let level = 'info'
          if (logMessage.toLowerCase().includes('error') || logMessage.toLowerCase().includes('失败')) {
            level = 'error'
          } else if (logMessage.toLowerCase().includes('warning') || logMessage.toLowerCase().includes('警告')) {
            level = 'warning'
          } else if (logMessage.toLowerCase().includes('success') || logMessage.toLowerCase().includes('成功') || logMessage.toLowerCase().includes('完成')) {
            level = 'success'
          }
          this.addLog(logMessage, level)
        }

        if (progress !== undefined && progress !== null) {
          this.currentProgress = progress

          if (progress >= 0 && progress <= 100) {
            // 根据进度更新校准状态
            if (progress >= 0 && progress < 15) {
              // 初始化阶段
              this.calibrationPoints = []
              this.isCalibrationComplete = false
              this.isPolarAligned = false
            } else if (progress >= 15 && progress < 25) {
              // 第一次校准阶段 - 移除模拟数据添加，实际校准点由updateFieldData处理
              // 这里只更新状态，不添加模拟校准点
            } else if (progress >= 25 && progress < 50) {
              // 第二次校准阶段 - 移除模拟数据添加，实际校准点由updateFieldData处理
              // 这里只更新状态，不添加模拟校准点
            } else if (progress >= 50 && progress < 75) {
              // 第三次校准阶段 - 移除模拟数据添加，实际校准点由updateFieldData处理
              // 这里只更新状态，不添加模拟校准点
            } else if (progress >= 75 && progress < 95) {
              // 循环校准调整阶段
              this.isCalibrationComplete = true
              this.calculatePolarAxisOffset()

              // 检测校准循环
              if (progress < this.lastCalibrationProgress && this.lastCalibrationProgress >= 75) {
                this.calibrationLoopCount++
                this.addLog(this.$t('Calibration Round Started', [this.calibrationLoopCount]), 'info')
              }

              // 在循环校准阶段，进度可能会在75-95之间波动
              // 这表示系统正在进行多次校准调整
              if (progress > 85) {
                this.addLog(this.$t('Calibration Progress Info', [Math.round(progress), this.calibrationLoopCount]), 'info')
              }

              this.lastCalibrationProgress = progress
            } else if (progress >= 95 && progress <= 100) {
              // 最终验证阶段
              this.isCalibrationComplete = true
              this.calculatePolarAxisOffset()

              if (Math.abs(this.polarAxisOffset.azimuth) < 1.0 && Math.abs(this.polarAxisOffset.altitude) < 1.0) {
                this.isPolarAligned = true
                this.addLog(this.$t('Polar Alignment Completed'), 'success')
              } else {
                this.addLog(this.$t('Polar Alignment Needs Manual Adjustment'), 'warning')
              }
            }
          }
        }
      },

      updatePolarAlignmentIsRunning(isRunning) {
        this.isCalibrationRunning = isRunning
        this.hasAcceptUpdateMessage = true
      },

      // ========================================
      // 坐标转换方法
      // ========================================
      /**
       * 赤道坐标 (RA, Dec) → 地平坐标 (Az, Alt)
       * @param {number} raDeg 赤经 (度, 0~360)
       * @param {number} decDeg 赤纬 (度, -90~+90)
       * @param {Date} dateUTC 观测时间 (UTC 时间)
       * @param {number} latDeg 观测点纬度 (度, 北正南负)
       * @param {number} lonDeg 观测点经度 (度, 东正西负)
       * @returns {{az: number, alt: number}} 方位角/高度角 (度)
       */
      equatorialToHorizontal(raDeg, decDeg, dateUTC, latDeg, lonDeg) {
        // 工具
        const toJD = d => (Number(d) / 86400000) + 2440587.5; // Date/ms → JD
        const d2r = x => x * Math.PI / 180, r2d = x => x * 180 / Math.PI;
        const norm360 = a => ((a % 360) + 360) % 360;
        const clamp = (x, lo = -1, hi = 1) => Math.min(hi, Math.max(lo, x));

        // 入参归一化 + 硬校验
        raDeg = Number(raDeg);
        decDeg = Number(decDeg);
        latDeg = Number(latDeg);
        lonDeg = Number(lonDeg);
        const tms = Number(dateUTC); // Date 或时间戳都可

        if (process.env.NODE_ENV === 'development') {
          console.log('EQ→HOR 入参:', { raDeg, decDeg, latDeg, lonDeg, dateUTC, tms });
        }

        if (![raDeg, decDeg, latDeg, lonDeg, tms].every(Number.isFinite)) {
          console.error('EQ→HOR 入参非法:', { raDeg, decDeg, latDeg, lonDeg, dateUTC, tms });
          return { az: NaN, alt: NaN };
        }

        try {
          // 1) JD & GMST
          const JD = toJD(tms);
          const d = JD - 2451545.0;
          let GMST = norm360(280.46061837 + 360.98564736629 * d); // 度

          // 2) LST（东经为正）
          let LST = norm360(GMST + lonDeg);

          // 3) HA（-180~180 更稳）
          let HA = LST - raDeg;
          HA = ((HA + 180) % 360) - 180;

          // 4) Alt / Az（稳定形式）
          const ha = d2r(HA);
          const dec = d2r(decDeg);
          const lat = d2r(latDeg);

          const sinAlt = clamp(
            Math.sin(dec) * Math.sin(lat) + Math.cos(dec) * Math.cos(lat) * Math.cos(ha)
          );
          const alt = Math.asin(sinAlt);
          const y = -Math.sin(ha) * Math.cos(dec);
          const x = Math.sin(dec) * Math.cos(lat) - Math.cos(dec) * Math.sin(lat) * Math.cos(ha);
          const az = Math.atan2(y, x);

          const altDeg = r2d(alt);
          const azDeg = norm360(r2d(az));

          if (process.env.NODE_ENV === 'development') {
            console.log('EQ→HOR 结果:', {
              JD, GMST, LST, HA,
              haRad: ha, decRad: dec, latRad: lat,
              az: azDeg, alt: altDeg
            });
          }

          return { az: azDeg, alt: altDeg };
        } catch (e) {
          console.error('EQ→HOR 计算异常:', e, {
            raDeg, decDeg, latDeg, lonDeg, dateUTC, tms
          });
          return { az: NaN, alt: NaN };
        }
      },





      // === 增强的卡片信息更新方法 ===
      updateCardInfo(currentRa, currentDec, targetRa, targetDec, azimuthVal, altitudeVal, raAdjustment, decAdjustment, unitHint) {
        const parseValue = v => (v === null || v === '' || v === undefined) ? 0 : (Number(v) || 0)

        const currentRaNum = parseValue(currentRa)
        const currentDecNum = parseValue(currentDec)
        const targetRaNum = parseValue(targetRa)
        const targetDecNum = parseValue(targetDec)
        const azVal = parseValue(azimuthVal)
        const altVal = parseValue(altitudeVal)

        // 1) 位置显示（原样）
        this.currentPosition.ra = this.formatCoordinate(currentRaNum, 'ra')
        this.currentPosition.dec = this.formatCoordinate(currentDecNum, 'dec')
        this.targetPosition.ra = this.formatCoordinate(targetRaNum, 'ra')
        this.targetPosition.dec = this.formatCoordinate(targetDecNum, 'dec')

        // 2) 调整量：以传入单位为准写入（默认用 props.adjustmentUnit）
        const inUnit = unitHint || this.adjustmentUnit
        // 如果传入是"度"，但你 props 设为了"arcmin"，也没关系——显示会自动换算
        // 这里保存"原始数 + 它的单位（通过 props）"
        this.adjustment.azimuth = azVal
        this.adjustment.altitude = altVal
        this.adjustmentUnit = inUnit  // 如果希望每次随数据切换单位，可加入这一行

        // 3) 在调整阶段，每次接收到调整数据时增加校准轮数
        if (this.calibrationPhase === 'adjusting') {
          this.calibrationLoopCount++
          this.addLog(this.$t('Calibration Round Started', [this.calibrationLoopCount]), 'info')
        }

        // 4) 极轴完成判定（用角分比较）
        const azArcmin = this.unitToArcmin(azVal, inUnit)
        const altArcmin = this.unitToArcmin(altVal, inUnit)
        this.isPolarAligned = Math.abs(azArcmin) < 1.0 && Math.abs(altArcmin) < 1.0

        if (process.env.NODE_ENV === 'development') {
          console.log('PolarAlignment update:', {
            unit: inUnit,
            adj_raw: { azimuth: azVal, altitude: altVal },
            adj_arcmin: { az: azArcmin, alt: altArcmin },
            isPolarAligned: this.isPolarAligned,
            calibrationRound: this.calibrationLoopCount
          })
        }
      },


      /**
       * 根据三个校准点计算假极轴位置
       * 使用三点极轴校准算法
       */
      calculateFakePolarAxis() {
        if (this.calibrationPoints.length !== this.maxCalibrationPoints) {
          this.addLog('需要3个校准点才能计算假极轴位置', 'warning')
          return false
        }

        try {
          const [p1, p2, p3] = this.calibrationPoints

          // 将三个点转换为笛卡尔坐标
          const cart1 = this.equatorialToCartesian(p1.ra, p1.dec)
          const cart2 = this.equatorialToCartesian(p2.ra, p2.dec)
          const cart3 = this.equatorialToCartesian(p3.ra, p3.dec)

          // 计算两个向量
          const v1 = {
            x: cart2.x - cart1.x,
            y: cart2.y - cart1.y,
            z: cart2.z - cart1.z
          }
          const v2 = {
            x: cart3.x - cart1.x,
            y: cart3.y - cart1.y,
            z: cart3.z - cart1.z
          }

          // 计算法向量（叉积）
          const normal = this.crossProduct(v1, v2)

          // 检查法向量是否为零向量
          const normalLength = this.vectorLength(normal)
          if (normalLength < 1e-10) {
            this.addLog('三个校准点共线，无法计算假极轴位置', 'error')
            return false
          }

          // 归一化法向量
          const unitNormal = this.normalizeVector(normal)

          // 计算与单位球面的交点（假极点）
          const fakePolarPoint = {
            x: unitNormal.x,
            y: unitNormal.y,
            z: unitNormal.z
          }

          // 选择正确的交点（z坐标为正的）
          if (fakePolarPoint.z < 0) {
            fakePolarPoint.x = -fakePolarPoint.x
            fakePolarPoint.y = -fakePolarPoint.y
            fakePolarPoint.z = -fakePolarPoint.z
          }

          // 将假极点转换为赤道坐标
          const fakePolarEquatorial = this.cartesianToEquatorial(fakePolarPoint)

          // 保存假极轴位置
          this.fakePolarAxis.ra = fakePolarEquatorial.ra
          this.fakePolarAxis.dec = fakePolarEquatorial.dec
          this.fakePolarAxis.calculated = true

          this.addLog(`假极轴位置计算完成: RA=${fakePolarEquatorial.ra.toFixed(4)}°, DEC=${fakePolarEquatorial.dec.toFixed(4)}°`, 'success')

          return true
        } catch (error) {
          this.addLog(`计算假极轴位置时出错: ${error.message}`, 'error')
          console.error('计算假极轴位置错误：', error)
          return false
        }
      },

      /**
       * 将赤道坐标转换为笛卡尔坐标
       */
      equatorialToCartesian(ra, dec, radius = 1) {
        const raRad = ra * Math.PI / 180.0
        const decRad = dec * Math.PI / 180.0

        return {
          x: radius * Math.cos(decRad) * Math.cos(raRad),
          y: radius * Math.cos(decRad) * Math.sin(raRad),
          z: radius * Math.sin(decRad)
        }
      },

      /**
       * 将笛卡尔坐标转换为赤道坐标
       */
      cartesianToEquatorial(cart) {
        const radius = Math.sqrt(cart.x * cart.x + cart.y * cart.y + cart.z * cart.z)

        const dec = Math.asin(cart.z / radius) * 180.0 / Math.PI
        let ra = Math.atan2(cart.y, cart.x) * 180.0 / Math.PI

        // 确保RA在0-360度范围内
        if (ra < 0) ra += 360.0

        return { ra, dec }
      },

      /**
       * 计算两个向量的叉积
       */
      crossProduct(v1, v2) {
        return {
          x: v1.y * v2.z - v1.z * v2.y,
          y: v1.z * v2.x - v1.x * v2.z,
          z: v1.x * v2.y - v1.y * v2.x
        }
      },

      /**
       * 计算向量长度
       */
      vectorLength(v) {
        return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z)
      },

      /**
       * 归一化向量
       */
      normalizeVector(v) {
        const length = this.vectorLength(v)
        return {
          x: v.x / length,
          y: v.y / length,
          z: v.z / length
        }
      },

      /**
       * 绘制假极轴位置
       */
      drawFakePolarAxis(fakePolarRA, fakePolarDEC) {
        this.addLog(`绘制假极轴位置: RA=${fakePolarRA.toFixed(4)}°, DEC=${fakePolarDEC.toFixed(4)}°`, 'info')

        try {
          // 定义假极轴的颜色（紫色）
          const fakePolarColor = {
            stroke: "#9C27B0",        // 紫色边框
            strokeOpacity: 1,         // 边框不透明度
            fill: "#9C27B0",          // 紫色填充
            fillOpacity: 0.3          // 填充不透明度（半透明）
          }

          // 使用专门的假极轴绘制事件，避免与目标点冲突
          this.$bus.$emit('DrawFakePolarAxisCircle',
            fakePolarRA,
            fakePolarDEC,
            fakePolarColor,
            'FakePolarAxis',
            '假极轴'
          )

          this.addLog(`假极轴位置已绘制: RA=${fakePolarRA.toFixed(4)}°, DEC=${fakePolarDEC.toFixed(4)}°`, 'info')

        } catch (error) {
          this.addLog(`绘制假极轴位置时出错: ${error.message}`, 'error')
          console.error('绘制假极轴位置错误：', error)
        }
      },
      // ========================================
      // 单位换算方法
      // ========================================
      unitToArcmin(val, unit) {
        if (!Number.isFinite(val)) return NaN
        if (unit === 'deg') return val * 60
        if (unit === 'arcsec') return val / 60
        return val // 'arcmin'
      },
      arcminToUnit(valArcmin, unit) {
        if (!Number.isFinite(valArcmin)) return NaN
        if (unit === 'deg') return valArcmin / 60
        if (unit === 'arcsec') return valArcmin * 60
        return valArcmin
      },
      unitGlyph(unit) {
        if (unit === 'deg') return '°'
        if (unit === 'arcsec') return '″'
        return '′' // arcmin
      },

      // ========================================
      // 左右/上下映射（面向极点）方法
      // ========================================
      // 根据当前坐标计算朝向哪个极点
      calculateFacingPole() {
        if (!this.$store || !this.$store.state.currentLocation) {
          return 'north' // 默认返回北极
        }
        
        const lat = this.$store.state.currentLocation.lat
        // 北半球（纬度 > 0）面向北极，南半球（纬度 < 0）面向南极
        return lat >= 0 ? 'north' : 'south'
      },

      // azSign > 0 = 朝东；azSign < 0 = 朝西
      azLabelBySign(azSign) {
        // 动态计算朝向极点，而不是使用 props
        const facingPole = this.calculateFacingPole()
        // 面向北极点：东=→右，西=←左；面向南极点则相反
        const east = (facingPole === 'north') ? this.$t('→ Right (East)') : this.$t('← Left (East)')
        const west = (facingPole === 'north') ? this.$t('← Left (West)') : this.$t('→ Right (West)')
        return azSign >= 0 ? east : west
      },
      // altSign > 0 = 抬高；altSign < 0 = 降低
      altLabelBySign(altSign) {
        return altSign >= 0 ? this.$t('↑ Up (Raise)') : this.$t('↓ Down (Lower)')
      },

      // ========================================
      // 统一格式化"数值 + 单位"方法
      // ========================================
      formatWithUnit(valInArcmin, unit, digits = 1) {
        const v = this.arcminToUnit(Math.abs(valInArcmin), unit)
        const glyph = this.unitGlyph(unit)
        return `${v.toFixed(digits)}${glyph}`
      },

      // ========================================
      // 颜色工具方法
      // ========================================
      getCalibrationPointColor() {
        return {
          stroke: COLORS.WHITE,
          strokeOpacity: 1,
          fill: COLORS.WHITE,
          fillOpacity: 0.2
        }
      },

      getCurrentPositionColor() {
        return {
          stroke: "#00BFFF",
          strokeOpacity: 1,
          fill: "#00BFFF",
          fillOpacity: 0.3
        }
      },

      getTargetPointColor() {
        return {
          stroke: COLORS.SUCCESS,
          strokeOpacity: 1,
          fill: COLORS.SUCCESS,
          fillOpacity: 0.3
        }
      },

      getFakePolarAxisColor() {
        return {
          stroke: "#9C27B0",
          strokeOpacity: 1,
          fill: "#9C27B0",
          fillOpacity: 0.3
        }
      },
    },
  }
</script>

<style scoped>
/* === 轨迹覆盖层样式 === */
.trajectory-overlay {
  position: fixed;
  inset: 0;
  background: black;
  z-index: 10002 !important;
  pointer-events: auto;
}
.trajectory-overlay canvas {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
}
.overlay-panel {
  position: absolute;
  left: 16px;
  top: 16px;
  background: rgba(30, 30, 30, 0.7);
  color: #fff;
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 8px;
  padding: 10px 12px;
  cursor: move;
}
.panel-row { display: flex; gap: 8px; margin-bottom: 6px; font-size: 12px; }
.panel-label { opacity: 0.85; }
.panel-value { opacity: 0.95; }
.panel-actions { display: flex; gap: 8px; margin-top: 6px; flex-wrap: wrap; }
.panel-btn { background: rgba(255,255,255,0.14); color: #fff; border: none; border-radius: 6px; padding: 6px 10px; cursor: pointer; }
.panel-btn.small { padding: 4px 8px; font-size: 12px; }
.panel-btn:hover { background: rgba(255,255,255,0.22); }

.trajectory-window {
  position: fixed;
  z-index: 10002 !important;
  background: rgba(18,18,18,0.95);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 8px;
  box-shadow: 0 6px 24px rgba(0,0,0,0.4);
  overflow: hidden;
  pointer-events: auto;
}
.window-header {
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 8px;
  background: rgba(45,45,55,0.9);
  color: #fff;
  cursor: move;
}
.window-title { font-size: 13px; }
.window-actions { display: flex; gap: 6px; }
.window-content { width: 100%; height: calc(100% - 32px); position: relative; overflow: hidden; }
.window-content canvas { position: absolute; left: 0; top: 0; width: 100%; height: 100%; }
.overlay-close-btn {
  position: absolute;
  right: 16px;
  top: 16px;
  width: 36px;
  height: 36px;
  border: none;
  background: rgba(255,255,255,0.12);
  color: #fff;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.overlay-close-btn:hover {
  background: rgba(255,255,255,0.2);
}
.overlay-hint {
  position: absolute;
  left: 50%;
  bottom: 20px;
  transform: translateX(-50%);
  color: rgba(255,255,255,0.85);
  font-size: 12px;
}
/* === 最小化状态样式 === */
.polar-alignment-minimized {
  position: fixed;
  width: 250px;
  max-width: 80vw;
  background: rgba(35, 35, 45, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  backdrop-filter: blur(10px);
  z-index: 1000;
  cursor: move;
  user-select: none;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  transition: all 0.3s ease;
  /* 添加背景隔离，防止操作映射到背景 */
  isolation: isolate;
  /* 移除contain属性，它可能阻止拖动事件 */
  touch-action: none;
  -webkit-tap-highlight-color: transparent;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
}

/* 拖动状态：移除过渡动画和复杂效果 */
.polar-alignment-minimized.dragging {
  transition: none !important;
  backdrop-filter: none !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2) !important;
  touch-action: manipulation;
}

.polar-alignment-minimized:hover {
  box-shadow: 0 6px 25px rgba(0, 0, 0, 0.4);
}

.polar-alignment-minimized.dragging:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2) !important;
}

.minimized-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: rgba(60, 60, 70, 0.9);
  border-radius: 8px 8px 0 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.minimized-drag-area {
  display: flex;
  align-items: center;
  flex: 1;
  cursor: move;
  /* 确保拖动区域有正确的交互 */
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  touch-action: none;
  -webkit-tap-highlight-color: transparent;
}

.minimized-icon {
  color: #64b5f6;
  font-size: 16px;
  margin-right: 8px;
}

.minimized-title {
  font-size: 12px;
  font-weight: 600;
  color: #ffffff;
  flex: 1;
}

.minimized-controls {
  display: flex;
  gap: 4px;
  /* 确保控制区域可以接收事件 */
  position: relative;
  z-index: 20;
  pointer-events: auto;
}

.minimized-btn {
  width: 24px;
  height: 24px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  color: #ffffff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  /* 移动端触摸优化 */
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  /* 确保按钮可以正确点击 */
  position: relative;
  z-index: 10;
  /* 确保按钮可以接收点击事件 */
  pointer-events: auto;
}

.minimized-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.minimized-btn:active {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(0.95);
}

.minimized-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  font-size: 11px;
}

.status-indicator {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #f44336;
  transition: all 0.3s ease;
}

.status-indicator.online {
  background: #4caf50;
  box-shadow: 0 0 4px rgba(76, 175, 80, 0.6);
}

.status-text {
  color: rgba(255, 255, 255, 0.8);
}

/* === 完整控件样式 === */
.polar-alignment-widget {
  position: fixed;
  width: 350px;
  max-width: 90vw;
  background: rgba(35, 35, 45, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  backdrop-filter: blur(10px);
  z-index: 1000;
  cursor: move;
  user-select: none;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  transition: all 0.3s ease;
  overflow: hidden;
  /* 添加背景隔离，防止操作映射到背景 */
  isolation: isolate;
  /* 移除contain属性，它可能阻止拖动事件 */
  touch-action: none;
  -webkit-tap-highlight-color: transparent;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
}

/* 拖动状态：移除过渡动画和复杂效果 */
.polar-alignment-widget.dragging {
  transition: none !important;
  backdrop-filter: none !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2) !important;
  touch-action: manipulation;
}

.polar-alignment-widget:hover {
  box-shadow: 0 6px 25px rgba(0, 0, 0, 0.4);
}

.polar-alignment-widget.dragging:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2) !important;
}

.polar-alignment-widget.collapsed {
  width: 300px;
  max-width: 85vw;
}

/* === 控件头部样式 === */
.widget-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: rgba(60, 60, 70, 0.9);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.header-drag-area {
  display: flex;
  align-items: center;
  flex: 1;
  cursor: move;
  /* 确保拖动区域有正确的交互 */
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  /* 添加拖动时的视觉反馈 */
  transition: background-color 0.2s ease;
  /* 确保拖动区域有正确的指针事件 */
  pointer-events: auto;
  touch-action: none;
  -webkit-tap-highlight-color: transparent;
}

.widget-header:hover {
  background: rgba(60, 60, 70, 0.95);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.header-icon {
  color: #64b5f6;
  font-size: 18px;
}

.header-title {
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
}

.connection-indicator {
  display: flex;
  align-items: center;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #f44336;
  transition: all 0.3s ease;
}

.status-dot.online {
  background: #4caf50;
  box-shadow: 0 0 6px rgba(76, 175, 80, 0.6);
}

.header-controls {
  display: flex;
  gap: 4px;
  /* 确保控制区域可以接收事件 */
  position: relative;
  z-index: 20;
  pointer-events: auto;
}

.header-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  color: #ffffff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  /* 移动端触摸优化 */
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  /* 确保按钮可以正确点击 */
  position: relative;
  z-index: 10;
  /* 确保按钮可以接收点击事件 */
  pointer-events: auto;
}

.header-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.header-btn:active {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(0.95);
}

.header-btn.close-btn:hover {
  background: #f44336;
}

/* === 控件内容样式 === */
.widget-content {
  transition: all 0.3s ease;
  /* 确保内容区域有适当的背景隔离 */
  background: rgba(35, 35, 45, 0.95);
  position: relative;
  z-index: 1;
  /* 确保内容区域不会阻止拖动事件 */
  pointer-events: auto;
}

/* 拖动状态：移除过渡动画 */
.widget-content.dragging {
  transition: none !important;
}

.widget-content.collapsed {
  padding: 12px;
}

.widget-content.expanded {
  padding: 16px;
  max-height: 80vh;
  overflow-y: auto;
  /* 优化内容布局，充分利用空间 */
  display: flex;
  flex-direction: column;
  gap: 16px;
  /* 确保内容充分利用可用空间 */
  min-height: 0;
  flex: 1;
  /* 自适应高度 */
  height: auto;
}

/* === 收缩状态样式 === */
.collapsed-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.collapsed-progress {
  flex-shrink: 0;
}

.progress-circle {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: conic-gradient(#64b5f6 0deg var(--progress, 0deg),
      rgba(255, 255, 255, 0.1) var(--progress, 0deg) 360deg);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.progress-circle::before {
  content: '';
  position: absolute;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: rgba(35, 35, 45, 0.95);
}

.progress-text {
  position: relative;
  z-index: 1;
  font-size: 12px;
  font-weight: 600;
  color: #ffffff;
}

.collapsed-status {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
}

.status-label {
  color: rgba(255, 255, 255, 0.7);
}

.status-value {
  color: #ffffff;
  font-weight: 600;
  font-family: monospace;
}

.status-value.needs-adjustment {
  color: #ff9800;
}

/* === 展开状态样式 === */
.content-sections {
  display: flex;
  flex-direction: column;
  gap: 16px;
  /* 优化布局，充分利用可用空间 */
  width: 100%;
  min-height: 0;
}

/* === 校准步骤进度条样式 === */
.calibration-progress {
  margin-bottom: 16px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.progress-title {
  font-size: 12px;
  font-weight: 600;
  color: #ffffff;
}

.calibration-loop-info {
  font-size: 10px;
  color: #ff9800;
  font-weight: 500;
  padding: 2px 6px;
  background: rgba(255, 152, 0, 0.2);
  border-radius: 4px;
  animation: loop-pulse 2s infinite;
}

@keyframes loop-pulse {

  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.7;
  }
}

.progress-bar {
  position: relative;
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: visible;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #64b5f6, #4caf50);
  border-radius: 4px;
  transition: width 0.1s ease;
}

.progress-nodes {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  transform: translateY(-50%);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.progress-node {
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
}

.node-circle {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: bold;
  color: #ffffff;
  transition: all 0.3s ease;
}

.progress-node.completed .node-circle {
  background: #4caf50;
  border-color: #4caf50;
  box-shadow: 0 0 8px rgba(76, 175, 80, 0.4);
}

.progress-node.current .node-circle {
  background: #64b5f6;
  border-color: #64b5f6;
  box-shadow: 0 0 8px rgba(100, 181, 246, 0.4);
}

.progress-node.adjustment-node .node-circle {
  background: rgba(255, 152, 0, 0.3);
  border-color: rgba(255, 152, 0, 0.5);
}

.progress-node.adjustment-node.active .node-circle {
  background: #ff9800;
  border-color: #ff9800;
  box-shadow: 0 0 8px rgba(255, 152, 0, 0.4);
}

.progress-node.calibration-node .node-circle {
  background: rgba(255, 152, 0, 0.3);
  border-color: rgba(255, 152, 0, 0.5);
}

.progress-node.calibration-node.active .node-circle {
  background: #ff9800;
  border-color: #ff9800;
  box-shadow: 0 0 8px rgba(255, 152, 0, 0.4);
}

.progress-node.calibration-node.looping .node-circle {
  animation: calibration-pulse 2s infinite;
}

@keyframes calibration-pulse {
  0% {
    background: #ff9800;
    box-shadow: 0 0 8px rgba(255, 152, 0, 0.4);
  }

  50% {
    background: #ff5722;
    box-shadow: 0 0 12px rgba(255, 152, 0, 0.6);
  }

  100% {
    background: #ff9800;
    box-shadow: 0 0 8px rgba(255, 152, 0, 0.4);
  }
}

.progress-node.calibration-node.looping .node-circle i {
  animation: calibration-rotate 2s linear infinite;
}

@keyframes calibration-rotate {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

.progress-node.verification-node .node-circle {
  background: rgba(76, 175, 80, 0.3);
  border-color: rgba(76, 175, 80, 0.5);
}

.progress-node.verification-node.active .node-circle {
  background: #4caf50;
  border-color: #4caf50;
  box-shadow: 0 0 8px rgba(76, 175, 80, 0.4);
}

.node-label {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  font-size: 9px;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 500;
  margin-top: 4px;
  white-space: nowrap;
  text-align: center;
}

.progress-node {
  position: relative;
}

/* === 位置信息样式 === */
.position-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.position-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  padding: 12px;
}

.position-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px;
  border-radius: 4px;
  transition: all 0.3s ease;
}

.position-cell.current {
  background: rgba(100, 181, 246, 0.1);
  border: 1px solid rgba(100, 181, 246, 0.2);
}

.position-cell.target {
  background: rgba(255, 152, 0, 0.1);
  border: 1px solid rgba(255, 152, 0, 0.2);
}

.cell-label {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.cell-value {
  font-size: 11px;
  color: #ffffff;
  font-family: monospace;
  font-weight: 600;
}

/* === 调整指导样式 === */
.adjustment-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.adjustment-instructions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.adjustment-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  transition: all 0.3s ease;
  border: 1px solid transparent;
}

.adjustment-item.active {
  background: rgba(255, 152, 0, 0.15);
  border-color: #ff9800;
}

.adjustment-icon {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: #ffffff;
  flex-shrink: 0;
}

.adjustment-item.active .adjustment-icon {
  background: #ff9800;
}

.adjustment-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.adjustment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.adjustment-type {
  font-size: 12px;
  color: #ffffff;
  font-weight: 500;
}

.adjustment-value {
  font-size: 18px;
  color: #ffffff;
  font-family: monospace;
  font-weight: 700;
  text-shadow: 0 0 4px rgba(255, 255, 255, 0.3);
  letter-spacing: 1px;
}

.adjustment-action {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 500;
}

.adjustment-item.active .adjustment-action {
  color: #ff9800;
}

/* === 操作按钮样式 === */
.control-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.action-buttons {
  display: flex;
  flex-direction: row;
  gap: 10px;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.3s ease;
  pointer-events: auto;
  min-height: 40px;
  touch-action: manipulation;
  position: relative;
  flex: 1;
}

.action-btn.primary {
  background: linear-gradient(135deg, #64b5f6, #42a5f5);
  color: #ffffff;
  box-shadow: 0 2px 6px rgba(100, 181, 246, 0.3);
}

.action-btn.primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #42a5f5, #2196f3);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(100, 181, 246, 0.4);
}

.action-btn.secondary {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.action-btn.secondary:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
}

.action-btn.success {
  background: linear-gradient(135deg, #4caf50, #43a047);
  color: #ffffff;
  box-shadow: 0 2px 6px rgba(76, 175, 80, 0.3);
}

.action-btn.success:hover:not(:disabled) {
  background: linear-gradient(135deg, #43a047, #388e3c);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
}

.action-btn.restore {
  background: linear-gradient(135deg, #ff9800, #f57c00);
  color: #ffffff;
  box-shadow: 0 2px 6px rgba(255, 152, 0, 0.3);
}

.action-btn.restore:hover:not(:disabled) {
  background: linear-gradient(135deg, #f57c00, #ef6c00);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(255, 152, 0, 0.4);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
  box-shadow: none !important;
}

/* === 日志显示样式 === */
.log-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.log-display {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  padding: 10px;
}

.latest-log {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 4px;
  font-size: 11px;
  background: rgba(255, 255, 255, 0.05);
  border-left: 3px solid transparent;
}

.latest-log.info {
  border-left-color: #64b5f6;
}

.latest-log.warning {
  border-left-color: #ff9800;
}

.latest-log.success {
  border-left-color: #4caf50;
}

.latest-log.error {
  border-left-color: #f44336;
}

.log-timestamp {
  color: rgba(255, 255, 255, 0.6);
  font-family: monospace;
  font-size: 10px;
  min-width: 65px;
  flex-shrink: 0;
}

.log-message {
  color: rgba(255, 255, 255, 0.9);
  flex: 1;
  line-height: 1.4;
}

.log-empty {
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
  font-size: 11px;
  padding: 20px;
  font-style: italic;
}

/* === 响应式设计 === */
@media (max-width: 768px) {
  .polar-alignment-widget {
    width: 320px;
    max-width: 95vw;
  }

  .polar-alignment-widget.collapsed {
    width: 280px;
    max-width: 90vw;
  }

  .polar-alignment-minimized {
    width: 240px;
  }

  .widget-header {
    padding: 10px 12px;
  }

  .header-title {
    font-size: 12px;
  }

  .widget-content.expanded {
    padding: 12px;
    max-height: 500px;
  }

  .widget-content.collapsed {
    padding: 8px;
  }

  .action-btn {
    padding: 10px 12px;
    font-size: 12px;
    min-height: 36px;
  }

  .adjustment-value {
    font-size: 16px;
  }

  .progress-circle {
    width: 50px;
    height: 50px;
  }

  .progress-text {
    font-size: 10px;
  }

  .node-label {
    font-size: 8px;
    margin-top: 2px;
  }

  .node-circle {
    width: 16px;
    height: 16px;
    font-size: 8px;
  }

  .progress-header {
    margin-bottom: 6px;
  }

  .progress-title {
    font-size: 11px;
  }

  .calibration-loop-info {
    font-size: 9px;
    padding: 1px 4px;
  }
}

/* 移动端触摸优化 */
@media (hover: none) and (pointer: coarse) {
  .action-btn {
    min-height: 48px;
    padding: 14px 18px;
    font-size: 14px;
  }

  .widget-header {
    padding: 16px 20px;
  }

  .minimized-header {
    padding: 12px 16px;
  }

  .header-btn {
    width: 32px;
    height: 32px;
  }

  .minimized-btn {
    width: 28px;
    height: 28px;
  }
}

@media (max-width: 480px) {
  .polar-alignment-widget {
    width: 280px;
    max-width: 98vw;
  }

  .polar-alignment-widget.collapsed {
    width: 240px;
    max-width: 95vw;
  }

  .polar-alignment-minimized {
    width: 200px;
  }

  .widget-header {
    padding: 8px 10px;
  }

  .header-title {
    font-size: 11px;
  }

  .header-btn {
    width: 20px;
    height: 20px;
  }

  .widget-content.expanded {
    padding: 10px;
    max-height: 400px;
  }

  .widget-content.collapsed {
    padding: 6px;
  }

  .action-btn {
    padding: 8px 10px;
    font-size: 11px;
    min-height: 32px;
  }

  .adjustment-value {
    font-size: 14px;
  }

  .progress-circle {
    width: 40px;
    height: 40px;
  }

  .progress-text {
    font-size: 9px;
  }

  .minimized-header {
    padding: 6px 8px;
  }

  .minimized-title {
    font-size: 10px;
  }

  .minimized-btn {
    width: 16px;
    height: 16px;
  }

  .node-label {
    font-size: 7px;
    margin-top: 1px;
  }

  .node-circle {
    width: 14px;
    height: 14px;
    font-size: 7px;
  }

  .progress-nodes {
    gap: 2px;
  }

  .progress-header {
    margin-bottom: 4px;
  }

  .progress-title {
    font-size: 10px;
  }

  .calibration-loop-info {
    font-size: 8px;
    padding: 1px 3px;
  }
}

/* 面板标题 */
.panel-header {
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  pointer-events: auto;
}

.panel-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #ffffff;
}

.panel-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #64b5f6;
}

.panel-indicator.live {
  animation: pulse 2s infinite;
}

.panel-indicator.control {
  background: #ff9800;
}

@keyframes pulse {
  0% {
    opacity: 1;
  }

  50% {
    opacity: 0.5;
  }

  100% {
    opacity: 1;
  }
}



.card-header {
  background: rgba(60, 60, 70, 0.8);
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  pointer-events: auto;
}

.card-header span {
  font-size: 14px;
  font-weight: 500;
  color: #ffffff;
}

.card-icon {
  color: #64b5f6;
  font-size: 18px;
}

.card-icon.warning {
  color: #ff9800;
}

.card-icon.success {
  color: #4caf50;
}






/* === 响应式设计 === */
@media (max-width: 1200px) {
  .info-panel {
    flex: 0 0 350px;
  }
}

@media (max-width: 768px) {
  .polar-alignment-interface {
    font-size: 12px;
  }

  .main-layout {
    flex-direction: column;
    gap: 8px;
    padding: 8px;
  }

  .display-panel {
    flex: 1;
    min-height: 300px;
    padding: 12px;
  }

  .info-panel {
    flex: 0 0 auto;
    max-height: 50vh;
    overflow-y: auto;
    padding: 12px;
  }

  /* 状态相关样式已删除 */

  .calibration-progress {
    margin-bottom: 12px;
  }

  .progress-bar {
    height: 6px;
  }

  .node-circle {
    width: 16px;
    height: 16px;
    font-size: 8px;
  }

  .position-section {
    margin-top: 12px;
    padding-top: 12px;
  }

  .position-grid {
    gap: 6px;
    padding: 8px;
  }

  .position-cell {
    padding: 6px;
  }

  .adjustment-section {
    margin-top: 12px;
    padding-top: 12px;
  }

  .adjustment-item {
    padding: 8px;
  }

  .adjustment-icon {
    width: 24px;
    height: 24px;
  }

  .control-section {
    margin-top: 12px;
    padding-top: 12px;
  }

  .action-btn {
    padding: 10px 12px;
    font-size: 12px;
    min-height: 36px;
    flex: 1;
  }

  .log-section {
    margin-top: 12px;
    padding-top: 12px;
  }

  .log-display {
    padding: 8px;
  }

  .panel-header {
    margin-bottom: 8px;
    padding-bottom: 8px;
  }

  .interface-title {
    font-size: 14px;
  }

  .connection-status {
    font-size: 10px;
  }

  .card-header {
    padding: 8px 12px;
  }

  .card-header span {
    font-size: 12px;
  }

  .card-content {
    padding: 12px;
  }



  .node-circle {
    width: 14px;
    height: 14px;
    font-size: 7px;
  }

  .log-display {
    padding: 6px;
  }

  .latest-log {
    font-size: 10px;
  }

  .log-timestamp {
    min-width: 50px;
  }
}

@media (max-width: 480px) {
  .polar-alignment-interface {
    font-size: 10px;
  }

  .main-layout {
    flex-direction: column;
    gap: 6px;
    padding: 6px;
  }

  .display-panel {
    flex: 1;
    min-height: 250px;
    padding: 8px;
  }

  .info-panel {
    flex: 0 0 auto;
    max-height: 45vh;
    overflow-y: auto;
    padding: 8px;
  }

  .card-header {
    padding: 8px 12px;
  }

  .card-header span {
    font-size: 11px;
  }

  .card-content {
    padding: 12px;
  }

  /* 状态相关样式已删除 */

  .calibration-progress {
    margin-bottom: 8px;
  }

  .progress-bar {
    height: 4px;
  }

  .node-circle {
    width: 14px;
    height: 14px;
    font-size: 7px;
  }

  .position-section {
    margin-top: 8px;
    padding-top: 8px;
  }

  .position-grid {
    gap: 4px;
    padding: 6px;
  }

  .position-cell {
    padding: 4px;
  }

  .cell-label {
    font-size: 8px;
  }

  .cell-value {
    font-size: 9px;
  }

  .adjustment-section {
    margin-top: 8px;
    padding-top: 8px;
  }

  .adjustment-item {
    padding: 6px;
  }

  .adjustment-icon {
    width: 20px;
    height: 20px;
  }

  .adjustment-type {
    font-size: 10px;
  }

  .adjustment-value {
    font-size: 10px;
  }

  .adjustment-action {
    font-size: 8px;
  }

  .control-section {
    margin-top: 8px;
    padding-top: 8px;
  }

  .action-btn {
    padding: 8px 10px;
    font-size: 10px;
    min-height: 32px;
    flex: 1;
  }

  .log-section {
    margin-top: 8px;
    padding-top: 8px;
  }

  .log-display {
    padding: 6px;
  }

  .latest-log {
    font-size: 9px;
  }

  .log-timestamp {
    font-size: 8px;
    min-width: 45px;
  }

  .panel-header {
    margin-bottom: 6px;
    padding-bottom: 6px;
  }

}

/* === 触摸优化 === */
.polar-alignment-widget,
.polar-alignment-minimized {
  /* 触摸优化 */
  touch-action: none;
  -webkit-tap-highlight-color: transparent;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
}

.header-drag-area,
.minimized-drag-area {
  /* 触摸优化 */
  touch-action: none;
  -webkit-tap-highlight-color: transparent;
}

/* 拖动状态：移除触摸优化，允许正常触摸 */
.polar-alignment-widget.dragging,
.polar-alignment-minimized.dragging {
  touch-action: manipulation;
}

/* === 性能优化 === */
/* 拖动时禁用不必要的动画和效果 */
.dragging * {
  animation: none !important;
  transition: none !important;
}

/* 拖动时简化阴影和模糊效果 */
.dragging .progress-circle::before,
.dragging .node-circle,
.dragging .status-indicator {
  box-shadow: none !important;
  filter: none !important;
}
</style>