<template>
  <!-- 最小化状态 -->
  <div v-if="visible && isMinimized" class="polar-alignment-minimized" 
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
       :class="{ 'collapsed': isCollapsed }"
       :style="{ left: position.x + 'px', top: position.y + 'px' }">
    
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
        <button class="header-btn" @click="toggleMinimize" :title="$t('Minimize')">
          <v-icon>mdi-minus</v-icon>
        </button>
      </div>
    </div>

    <!-- 收缩状态内容 -->
    <div v-if="isCollapsed" class="widget-content collapsed">
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
    <div v-else class="widget-content expanded">
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
              <div class="progress-node calibration-node" :class="{ 'active': progressPercentage >= 75, 'looping': progressPercentage >= 75 && progressPercentage < 95 }">
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
</template>
  
  <script>
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
      }
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
        
        // 日志系统
        logs: [],
        
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
        targetPoint: null, // 存储目标点坐标
      }
    },
    
    computed: {
      // 显示的日志
      displayLogs() {
        // 返回最近的10条日志，按时间倒序（用于显示最新一条）
        return this.logs.slice(-10).reverse()
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
      
      // 是否需要方位角调整
      needsAzimuthAdjustment() {
        const value = this.adjustment.azimuth
        if (value === null || value === undefined || isNaN(value)) return false
        return Math.abs(value) > 0.5
      },
      
      // 是否需要高度角调整
      needsAltitudeAdjustment() {
        const value = this.adjustment.altitude
        if (value === null || value === undefined || isNaN(value)) return false
        return Math.abs(value) > 0.5
      }
    },
    
    watch: {
      visible(newVal) {
        if (newVal && this.autoStart) {
          this.startAutoCalibration()
        }
      }
    },
    
    mounted() {
      // 实现组件初始化逻辑
      this.initialize()
      
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
    },
    
    beforeDestroy() {
      // 移除信号总线监听
      this.$bus.$off('showPolarAlignment', this.showInterface)
      this.$bus.$off('hidePolarAlignment', this.hideInterface)
      this.$bus.$off('MountConnected', this.updateMountConnection)
      this.$bus.$off('PolarAlignmentState', this.updatePolarAlignmentState)
      this.$bus.$off('FieldDataUpdate', this.updateFieldData)
      this.$bus.$off('updateCardInfo', this.updateCardInfo)
      
      // 清理拖动事件监听
      document.removeEventListener('mousemove', this.onDrag)
      document.removeEventListener('mouseup', this.stopDrag)
      
      // 实现组件销毁逻辑
      this.cleanup()
    },
    
    methods: {
      // === 信号总线事件处理 ===
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
      
      // === 初始化和清理 ===
      initialize() {
        this.addLog(this.$t('Polar Alignment Component Initialized'), 'info')
      },
      
      cleanup() {
        this.addLog(this.$t('Polar Alignment Component Cleaned'), 'info')
      },
      
      // === 拖动控制方法 ===
      startDrag(event) {
        if (event.target.closest('.header-controls, .minimized-controls, .header-btn, .minimized-btn')) {
          return
        }
        
        this.isDragging = true
        const rect = event.currentTarget.getBoundingClientRect()
        const clientX = event.clientX || event.touches?.[0]?.clientX || 0
        const clientY = event.clientY || event.touches?.[0]?.clientY || 0
        
        this.dragOffset = {
          x: clientX - rect.left,
          y: clientY - rect.top
        }
        
        document.addEventListener('mousemove', this.onDrag)
        document.addEventListener('mouseup', this.stopDrag)
        document.addEventListener('touchmove', this.onDrag, { passive: false })
        document.addEventListener('touchend', this.stopDrag, { passive: false })
      },
      
      onDrag(event) {
        if (!this.isDragging) return
        
        const clientX = event.clientX || event.touches?.[0]?.clientX || 0
        const clientY = event.clientY || event.touches?.[0]?.clientY || 0
        
        const newX = clientX - this.dragOffset.x
        const newY = clientY - this.dragOffset.y
        
        const componentWidth = this.isCollapsed ? 300 : 350
        const componentHeight = this.getComponentHeight()
        const maxX = window.innerWidth - componentWidth
        const maxY = window.innerHeight - componentHeight
        
        this.position = {
          x: Math.max(0, Math.min(newX, maxX)),
          y: Math.max(0, Math.min(newY, maxY))
        }
      },
      
      stopDrag() {
        this.isDragging = false
        document.removeEventListener('mousemove', this.onDrag)
        document.removeEventListener('mouseup', this.stopDrag)
        document.removeEventListener('touchmove', this.onDrag)
        document.removeEventListener('touchend', this.stopDrag)
      },
      
      // 获取组件高度
      getComponentHeight() {
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
      
      // === 界面状态控制方法 ===
      toggleMinimize() {
        this.isMinimized = !this.isMinimized
        this.isCollapsed = false
        this.addLog(this.isMinimized ? this.$t('Interface Minimized') : this.$t('Interface Expanded'), 'info')
      },
      
      toggleCollapse() {
        this.isCollapsed = !this.isCollapsed
        this.addLog(this.isCollapsed ? this.$t('Interface Collapsed') : this.$t('Interface Expanded'), 'info')
      },
      
      resetCalibration() {
        this.calibrationPoints = []
        this.isCalibrationComplete = false
        this.isPolarAligned = false
        this.fieldData = null
        this.calibrationLoopCount = 0
        this.lastCalibrationProgress = 0
        this.calibrationPhase = 'initial'
        this.targetPoint = null
        this.addLog(this.$t('Calibration Data Reset'), 'info')
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'ResetAutoPolarAlignment')
        this.$bus.$emit('ClearCalibrationPoints')
        this.$bus.$emit('ClearStatusTextFromStarMap')
      },
      
      restoreCalibration() {
        this.addLog(this.$t('Calibration Data Restored'), 'success')
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'RestoreAutoPolarAlignment')
      },
      
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
      
      // === 视场数据处理方法 ===
      updateFieldData(data) {
        if (data && Array.isArray(data) && data.length >= 8) {
          const isValidData = data.every(val => typeof val === 'number' && !isNaN(val))
          if (!isValidData) {
            this.addLog(this.$t('Warning: Invalid Field Data Received'), 'warning')
            return
          }

          this.fieldData = {
            ra: data[0],
            dec: data[1],
            maxra: data[2],
            minra: data[3],
            maxdec: data[4],
            mindec: data[5],
            targetra: data[6],
            targetdec: data[7]
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
          
          if (data[6] === -1 && data[7] === -1) {
            // 校准点收集阶段
            this.calibrationPhase = 'collecting'
            const pointNumber = this.calibrationPoints.length + 1
            
            // 添加调试信息
            this.addLog(`准备收集校准点${pointNumber}，当前已有${this.calibrationPoints.length}个点`, 'info')
            
            try {
              this.drawCalibrationPointPolygon(data[0], data[1], pointNumber, this.fieldData)
              this.addLog(this.$t('Calibration Point', [pointNumber, data[0].toFixed(4), data[1].toFixed(4)]), 'info')
              
              // 保存校准点
              this.calibrationPoints.push({
                ra: data[0],
                dec: data[1],
                index: pointNumber
              })
              
              this.addLog(`校准点${pointNumber}已添加，现在总共有${this.calibrationPoints.length}个点`, 'info')
              
              // 如果收集了3个点，进入调整阶段
              if (this.calibrationPoints.length === 3) {
                this.calibrationPhase = 'adjusting'
                this.addLog(this.$t('Three calibration points collected, entering adjustment phase'), 'success')
              }
            } catch (error) {
              this.addLog(this.$t('Error processing calibration point', [error.message]), 'error')
              console.error('处理校准点错误：', error)
            }
          } else if (data[6] !== -1 && data[7] !== -1) {
            // 调整阶段：显示目标位置
            this.calibrationPhase = 'adjusting'
            this.targetPoint = { ra: data[6], dec: data[7] }
            
            try {
              // 不清除校准点，保持校准点显示，同时显示调整信息
              this.drawAdjustmentPoints(data[0], data[1], data[6], data[7], this.fieldData, false)
              this.addLog(`调整模式：当前位置(${data[0].toFixed(4)}, ${data[1].toFixed(4)}) 目标位置(${data[6].toFixed(4)}, ${data[7].toFixed(4)})`, 'info')
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
          
          const color = {
            stroke: "#FFFFFF",
            strokeOpacity: 1,
            fill: "#FFFFFF", 
            fillOpacity: 0.2
          }
          
          // 添加文本标签
          const label = `校准点${pointNumber}`
          const labelColor = "#FFFFFF"
          
          this.addLog(this.$t('Sending Draw Calibration Event', [pointNumber]), 'info')
          this.$bus.$emit('DrawCalibrationPointPolygon', coordinates, color, `Calibration_${pointNumber}`, label, labelColor)
          
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
        // 记录开始绘制调整点的日志
        this.addLog(this.$t('Starting Draw Adjustment Points', [currentRa, currentDec, targetRa, targetDec]), 'info')
        
        try {
          // 计算当前位置和目标位置的视场角点坐标
          // 当前位置使用真实视场大小，目标点不需要视场（将绘制为圆）
          const currentCoordinates = this.calculateFieldCorners(currentRa, currentDec, fieldData, false)
          // 目标点不需要计算视场角点，将直接绘制为圆
          
          // 记录计算得到的坐标信息到日志
          this.addLog(this.$t('Current Position Field Corners', [JSON.stringify(currentCoordinates)]), 'info')
          this.addLog(`目标点坐标: RA=${targetRa}, DEC=${targetDec}`, 'info')
          
          // 验证当前位置坐标的有效性
          // 检查每个坐标点是否包含有效的RA和DEC数值
          const currentValid = currentCoordinates.every((coord, index) => {
            const isValid = coord && typeof coord.ra === 'number' && typeof coord.dec === 'number' &&
                          !isNaN(coord.ra) && !isNaN(coord.dec) && isFinite(coord.ra) && isFinite(coord.dec)
            if (!isValid) {
              // 如果发现无效坐标，记录警告日志
              this.addLog(this.$t('Warning: Invalid Current Position Coordinate', [index, JSON.stringify(coord)]), 'warning')
            }
            return isValid
          })
          
          // 验证目标位置坐标的有效性（目标点只需要验证中心坐标）
          const targetValid = typeof targetRa === 'number' && typeof targetDec === 'number' &&
                            !isNaN(targetRa) && !isNaN(targetDec) && isFinite(targetRa) && isFinite(targetDec)
          
          if (!targetValid) {
            this.addLog(this.$t('Warning: Invalid Target Position Coordinate', [targetRa, targetDec]), 'warning')
          }
          
          // 如果任一位置的坐标无效，则终止绘制
          if (!currentValid || !targetValid) {
            this.addLog(this.$t('Error: Invalid Adjustment Point Coordinates'), 'error')
            return
          }
          
          // 定义不同位置点的颜色方案
          // 使用不同颜色来区分各种位置，提高可视化效果
          const currentColor = {
            stroke: "#00BFFF",        // 蓝色边框：当前位置
            strokeOpacity: 1,         // 边框不透明度
            fill: "#00BFFF",          // 蓝色填充：当前位置
            fillOpacity: 0.3          // 填充不透明度（半透明）
          }
          
          const targetColor = {
            stroke: "#FF8C00",        // 橙色边框：目标位置
            strokeOpacity: 1,         // 边框不透明度
            fill: "#FF8C00",          // 橙色填充：目标位置
            fillOpacity: 0.3          // 填充不透明度（半透明）
          }
          
          const previousColor = {
            stroke: "#FFD700",        // 黄色边框：上一次位置
            strokeOpacity: 1,         // 边框不透明度
            fill: "#FFD700",          // 黄色填充：上一次位置
            fillOpacity: 0.2          // 填充不透明度（更透明）
          }
          
          // 判断是否绘制完整的调整视图
          // 条件：已收集到3个校准点（放宽previousPosition的要求）
          if (this.calibrationPoints.length === 3) {
            // 在绘制新元素前，先清除所有之前的元素
            this.addLog('准备清除之前的校准元素', 'info')
            this.$bus.$emit('ClearCalibrationPoints')
            this.addLog('清除命令已发送', 'info')
            
            // 绘制完整的校准调整视图，包含所有关键位置点
            
            // 1. 绘制三个校准点（白色多边形）
            // 这些点代表校准过程中收集的参考位置
            this.calibrationPoints.forEach((point, index) => {
              // 计算每个校准点的视场角点坐标，使用真实视场大小
              const pointCoordinates = this.calculateFieldCorners(point.ra, point.dec, fieldData, false)
              // 定义校准点的颜色（白色）
              const whiteColor = {
                stroke: "#FFFFFF",        // 白色边框
                strokeOpacity: 1,         // 边框不透明度
                fill: "#FFFFFF",          // 白色填充
                fillOpacity: 0.2          // 填充不透明度（较透明）
              }
              // 发送绘制校准点多边形的事件
              this.$bus.$emit('DrawCalibrationPointPolygon', pointCoordinates, whiteColor, 
                             `Calibration_${index + 1}`, `校准点${index + 1}`, "#FFFFFF")
            })
            
            // 2. 绘制目标点（橙色圆形）
            // 这是望远镜应该移动到的目标位置
            // 目标点使用圆形绘制，不需要视场多边形
            this.$bus.$emit('DrawTargetPointCircle', targetRa, targetDec, targetColor)
            
            // 3. 绘制当前位置（蓝色多边形）
            // 这是望远镜当前指向的位置
            this.$bus.$emit('DrawCalibrationPointPolygon', currentCoordinates, currentColor, 
                           'Current_Position', '当前位置', "#00BFFF")
            
            // 4. 上一次位置点已移除，不再绘制
            
            // 5. 在星图上添加状态文本提示
            // 显示当前校准状态和进度信息
            this.addStatusTextToStarMap()
            
          } else {
            // 标准调整模式：只绘制当前位置和目标位置
            // 这种情况通常发生在校准初期或数据不完整时
            // 在绘制前先清除所有之前的元素
            this.addLog('标准模式：准备清除之前的校准元素', 'info')
            this.$bus.$emit('ClearCalibrationPoints')
            this.addLog('标准模式：清除命令已发送', 'info')
            
            // 目标点使用圆形绘制，当前位置使用多边形
            this.$bus.$emit('DrawAdjustmentPointsPolygon', currentCoordinates, null, currentColor, targetColor, isTimerUpdate)
            this.$bus.$emit('DrawTargetPointCircle', targetRa, targetDec, targetColor)
          }
          
        } catch (error) {
          // 捕获并记录绘制过程中的任何错误
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
            { ra: centerRa + fieldSize/2, dec: centerDec + fieldSize/2 },
            { ra: centerRa - fieldSize/2, dec: centerDec + fieldSize/2 },
            { ra: centerRa - fieldSize/2, dec: centerDec - fieldSize/2 },
            { ra: centerRa + fieldSize/2, dec: centerDec - fieldSize/2 },
            { ra: centerRa + fieldSize/2, dec: centerDec + fieldSize/2 }
          ]
          this.addLog(this.$t('Default Field Corners', [JSON.stringify(coordinates)]), 'info')
          return coordinates
        }
        
        // 如果有视场数据且不强制使用默认大小，基于传入的中心点坐标计算视场角点
        // 这种情况主要用于当前位置的显示，需要反映实际的视场大小
        const { maxra, minra, maxdec, mindec } = fieldData
        
        // 计算视场的实际大小（RA和DEC方向的跨度）
        const raSpan = maxra - minra
        const decSpan = maxdec - mindec
        
        // 基于传入的中心点坐标，计算视场的五个角点
        const coordinates = [
          { ra: centerRa + raSpan/2, dec: centerDec + decSpan/2 },     // 右上角
          { ra: centerRa - raSpan/2, dec: centerDec + decSpan/2 },     // 左上角
          { ra: centerRa - raSpan/2, dec: centerDec - decSpan/2 },     // 左下角
          { ra: centerRa + raSpan/2, dec: centerDec - decSpan/2 },     // 右下角
          { ra: centerRa + raSpan/2, dec: centerDec + decSpan/2 }      // 回到右上角（闭合多边形）
        ]
        
        this.addLog(this.$t('Using Field Data', [raSpan, decSpan]), 'info')
        this.addLog(this.$t('Field Corner Calculation Result', [JSON.stringify(coordinates)]), 'info')
        return coordinates
      },
      

      
      // === 格式化方法 ===
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
        if (value === null || value === undefined || isNaN(value)) return '0.0\''
        return Math.abs(value).toFixed(1) + "'"
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
      
      // === 辅助方法 ===
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
        
        switch(index) {
          case 0: // 初始化节点
            if (progress >= 15) return { completed: true }
            if (progress >= 0) return { current: true }
            return {}
            
          case 1: // 第一次校准节点
            if (progress >= 25) return { completed: true }
            if (progress >= 15) return { current: true }
            return {}
            
          case 2: // 第二次校准节点
            if (progress >= 50) return { completed: true }
            if (progress >= 25) return { current: true }
            return {}
            
          case 3: // 第三次校准节点
            if (progress >= 75) return { completed: true }
            if (progress >= 50) return { current: true }
            return {}
            
          default:
            return {}
        }
      },
      
      getAzimuthAction(azimuth) {
        if (azimuth === null || azimuth === undefined || isNaN(azimuth)) return ''
        if (azimuth > 0.5) return this.$t('Turn Right')
        if (azimuth < -0.5) return this.$t('Turn Left')
        return ''
      },
      
      getAltitudeAction(altitude) {
        if (altitude === null || altitude === undefined || isNaN(altitude)) return ''
        if (altitude > 0.5) return this.$t('Raise Up')
        if (altitude < -0.5) return this.$t('Lower Down')
        return ''
      },
      

      
      // === 日志方法 ===
      addLog(message, level = 'info') {
        const log = {
          id: Date.now() + Math.random(),
          message,
          level,
          timestamp: new Date()
        }
        console.log(log.message)
        this.logs.push(log)
        // 限制日志数量
        if (this.logs.length > 100) {
          this.logs.shift()
        }
      },
      
      clearLogs() {
        this.logs = []
      },
      
      // === 极轴校准状态更新方法 ===
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
      

      
      // === 增强的卡片信息更新方法 ===
      updateCardInfo(currentRa, currentDec, targetRa, targetDec, azimuthDegrees, altitudeDegrees, raAdjustment, decAdjustment) {
        // 数据类型转换和有效性检查
        const parseValue = (value) => {
          if (value === null || value === undefined || value === '') return 0
          const num = parseFloat(value)
          return isNaN(num) ? 0 : num
        }
        
        // 转换并验证所有数值
        const currentRaNum = parseValue(currentRa)
        const currentDecNum = parseValue(currentDec)
        const targetRaNum = parseValue(targetRa)
        const targetDecNum = parseValue(targetDec)
        const azimuthNum = parseValue(azimuthDegrees)
        const altitudeNum = parseValue(altitudeDegrees)
        
        // 检查数据有效性
        if (isNaN(currentRaNum) || isNaN(currentDecNum) || isNaN(targetRaNum) || isNaN(targetDecNum) || 
            isNaN(azimuthNum) || isNaN(altitudeNum)) {
          console.warn('PolarAlignment: 接收到无效的数值数据:', {
            currentRa, currentDec, targetRa, targetDec, azimuthDegrees, altitudeDegrees
          })
          return
        }
        
        // 更新位置信息
        this.currentPosition.ra = this.formatCoordinate(currentRaNum, 'ra')
        this.currentPosition.dec = this.formatCoordinate(currentDecNum, 'dec')
        // 注意：这里的targetRa和targetDec是应该移动到的目标位置，不是真极轴位置
        this.targetPosition.ra = this.formatCoordinate(targetRaNum, 'ra')
        this.targetPosition.dec = this.formatCoordinate(targetDecNum, 'dec')
        
        // 更新调整信息
        this.adjustment.azimuth = azimuthNum
        this.adjustment.altitude = altitudeNum
        
        // 更新极轴对齐状态
        this.isPolarAligned = Math.abs(azimuthNum) < 1.0 && Math.abs(altitudeNum) < 1.0
        
        // 添加调试日志
        console.log('PolarAlignment: 更新卡片信息成功:', {
          currentPosition: { ra: this.currentPosition.ra, dec: this.currentPosition.dec },
          targetPosition: { ra: this.targetPosition.ra, dec: this.targetPosition.dec },
          adjustment: { azimuth: this.adjustment.azimuth, altitude: this.adjustment.altitude },
          isPolarAligned: this.isPolarAligned
        })
        
      },
      
    }
  }
  </script>
  
  <style scoped>
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
  }
  
  .polar-alignment-minimized:hover {
    box-shadow: 0 6px 25px rgba(0, 0, 0, 0.4);
    transform: translateY(-2px);
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
  }
  
  .polar-alignment-widget:hover {
    box-shadow: 0 6px 25px rgba(0, 0, 0, 0.4);
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
    background: conic-gradient(
      #64b5f6 0deg var(--progress, 0deg),
      rgba(255, 255, 255, 0.1) var(--progress, 0deg) 360deg
    );
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
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
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
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
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
    0% { opacity: 1; }
    50% { opacity: 0.5; }
    100% { opacity: 1; }
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
  </style>