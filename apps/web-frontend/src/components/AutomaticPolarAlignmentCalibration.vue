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
        <button class="minimized-btn" @click="toggleMinimize" title="展开">
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
        <button class="header-btn" @click="toggleCollapse" :title="isCollapsed ? '展开' : '收缩'">
          <v-icon>{{ isCollapsed ? 'mdi-chevron-down' : 'mdi-chevron-up' }}</v-icon>
        </button>
        <button class="header-btn" @click="toggleMinimize" title="最小化">
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

            <button class="action-btn restore" @click="restoreCalibration" :disabled="!canRestore">
              <v-icon>mdi-restore</v-icon>
              <span>{{ $t('Restore') }}</span>
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
        
        // 校准数据
        calibrationPoints: [],
        isCalibrationComplete: false,
        isPolarAligned: false,
        
        // 调整信息
        adjustment: {
          azimuth: 0,
          altitude: 0
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
        
        // 是否可以恢复校准
        canRestore: false,
        
        // 极轴偏移量
        polarAxisOffset: {
          azimuth: 0,
          altitude: 0
        },
        
        // 校准循环计数
        calibrationLoopCount: 0,
        lastCalibrationProgress: 0,
        
        // 状态持久化相关
        statePersistenceInterval: null
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
        return Math.abs(this.adjustment.azimuth) > 0.5
      },
      
      // 是否需要高度角调整
      needsAltitudeAdjustment() {
        return Math.abs(this.adjustment.altitude) > 0.5
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
      
      // 增强初始化（包括状态恢复）
      this.enhancedInitialize()

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
      
      // 监听页面可见性变化
      document.addEventListener('visibilitychange', this.handleVisibilityChange)
      
      // 监听网络状态变化
      window.addEventListener('online', this.handleOnlineStatusChange)
      window.addEventListener('offline', this.handleOnlineStatusChange)
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
      
      // 移除页面可见性和网络状态监听
      document.removeEventListener('visibilitychange', this.handleVisibilityChange)
      window.removeEventListener('online', this.handleOnlineStatusChange)
      window.removeEventListener('offline', this.handleOnlineStatusChange)
      
      // 停止状态持久化
      this.stopStatePersistence()
      
      // 保存最终状态
      this.saveStateToStorage()
      
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
        
        // 初始化时检查是否需要状态恢复
        this.checkInitialState()
      },
      
      checkInitialState() {
        // 检查初始状态，如果进度不为0，说明可能需要状态恢复
        if (this.currentProgress > 0) {
          console.log(`初始状态恢复检查: 进度 ${this.currentProgress}%`)
          this.restoreCalibrationState(this.currentProgress)
        }
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
        this.addLog(this.$t('Calibration Data Reset'), 'info')
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'ResetAutoPolarAlignment')
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
      
      // === 卡片信息更新方法 ===
      // 原始方法已被增强版本替换，见文件末尾的增强版本
      
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
          
          if (data[6] === -1 && data[7] === -1) {
            this.drawCalibrationPointPolygon(data[0], data[1], this.calibrationPoints.length + 1, this.fieldData)
            this.addLog(this.$t('Calibration Point', [this.calibrationPoints.length + 1, data[0].toFixed(4), data[1].toFixed(4)]), 'info')
          } else if (data[6] !== -1 && data[7] !== -1) {
            this.clearCalibrationPoints()
            this.drawAdjustmentPoints(data[0], data[1], data[6], data[7], this.fieldData, false)
            // this.addLog(`调整模式：当前位置(${data[0].toFixed(4)}, ${data[1].toFixed(4)}) 目标位置(${data[6].toFixed(4)}, ${data[7].toFixed(4)})`, 'info')
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
      },
      
      // 绘制调整点
      drawAdjustmentPoints(currentRa, currentDec, targetRa, targetDec, fieldData, isTimerUpdate = false) {
        this.addLog(this.$t('Starting Draw Adjustment Points', [currentRa, currentDec, targetRa, targetDec]), 'info')
        
        try {
          const currentCoordinates = this.calculateFieldCorners(currentRa, currentDec, fieldData)
          const targetCoordinates = this.calculateFieldCorners(targetRa, targetDec, fieldData)
          
          this.addLog(this.$t('Current Position Field Corners', [JSON.stringify(currentCoordinates)]), 'info')
          this.addLog(this.$t('Target Position Field Corners', [JSON.stringify(targetCoordinates)]), 'info')
          
          // 验证坐标有效性
          const currentValid = currentCoordinates.every((coord, index) => {
            const isValid = coord && typeof coord.ra === 'number' && typeof coord.dec === 'number' &&
                          !isNaN(coord.ra) && !isNaN(coord.dec) && isFinite(coord.ra) && isFinite(coord.dec)
            if (!isValid) {
              this.addLog(this.$t('Warning: Invalid Current Position Coordinate', [index, JSON.stringify(coord)]), 'warning')
            }
            return isValid
          })
          
          const targetValid = targetCoordinates.every((coord, index) => {
            const isValid = coord && typeof coord.ra === 'number' && typeof coord.dec === 'number' &&
                          !isNaN(coord.ra) && !isNaN(coord.dec) && isFinite(coord.ra) && isFinite(coord.dec)
            if (!isValid) {
              this.addLog(this.$t('Warning: Invalid Target Position Coordinate', [index, JSON.stringify(coord)]), 'warning')
            }
            return isValid
          })
          
          if (!currentValid || !targetValid) {
            this.addLog(this.$t('Error: Invalid Adjustment Point Coordinates'), 'error')
            return
          }
          
          const currentColor = {
            stroke: "#00BFFF",
            strokeOpacity: 1,
            fill: "#00BFFF", 
            fillOpacity: 0.3
          }
          
          const targetColor = {
            stroke: "#FF8C00",
            strokeOpacity: 1,
            fill: "#FF8C00", 
            fillOpacity: 0.3
          }
          
          this.addLog(this.$t('Sending Draw Adjustment Points Event'), 'info')
          this.$bus.$emit('DrawAdjustmentPointsPolygon', currentCoordinates, targetCoordinates, currentColor, targetColor, isTimerUpdate)
          
        } catch (error) {
          this.addLog(this.$t('Error Drawing Adjustment Points', [error.message]), 'error')
          console.error('绘制调整点错误：', error)
        }
      },
      
      // 计算视场的五个角点坐标
      calculateFieldCorners(centerRa, centerDec, fieldData) {
        this.addLog(this.$t('Calculating Field Corners', [centerRa, centerDec]), 'info')
        
        if (!fieldData) {
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
        
        const { maxra, minra, maxdec, mindec } = fieldData
        this.addLog(this.$t('Using Field Data', [maxra, minra, maxdec, mindec]), 'info')
        
        const coordinates = [
          { ra: maxra, dec: maxdec },
          { ra: minra, dec: maxdec },
          { ra: minra, dec: mindec },
          { ra: maxra, dec: mindec },
          { ra: maxra, dec: maxdec }
        ]
        
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
        return Math.abs(value).toFixed(1) + "'"
      },
      
      // === 辅助方法 ===
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
        if (azimuth > 0.5) return this.$t('Turn Right') || '向右转'
        if (azimuth < -0.5) return this.$t('Turn Left') || '向左转'
        return ''
      },
      
      getAltitudeAction(altitude) {
        if (altitude > 0.5) return this.$t('Raise Up') || '抬高'
        if (altitude < -0.5) return this.$t('Lower Down') || '降低'
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
          // 检查是否需要状态恢复
          this.checkAndRestoreState(progress)
          
          this.currentProgress = progress
          
          if (progress >= 0 && progress <= 100) {
            // 根据进度更新校准状态
            if (progress >= 0 && progress < 15) {
              // 初始化阶段
              this.calibrationPoints = []
              this.isCalibrationComplete = false
              this.isPolarAligned = false
            } else if (progress >= 15 && progress < 25) {
              // 第一次校准阶段
              if (this.calibrationPoints.length === 0) {
                this.calibrationPoints.push({
                  x: 150 + Math.random() * 20 - 10,
                  y: 150 + Math.random() * 20 - 10,
                  index: 0
                })
              }
            } else if (progress >= 25 && progress < 50) {
              // 第二次校准阶段
              if (this.calibrationPoints.length === 1) {
                this.calibrationPoints.push({
                  x: 150 + Math.random() * 20 - 10,
                  y: 150 + Math.random() * 20 - 10,
                  index: 1
                })
              }
            } else if (progress >= 50 && progress < 75) {
              // 第三次校准阶段
              if (this.calibrationPoints.length === 2) {
                this.calibrationPoints.push({
                  x: 150 + Math.random() * 20 - 10,
                  y: 150 + Math.random() * 20 - 10,
                  index: 2
                })
              }
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
      
      // === 状态恢复方法 ===
      checkAndRestoreState(newProgress) {
        // 如果进度发生显著变化，说明可能是页面刷新后的状态恢复
        const progressDiff = Math.abs(newProgress - this.currentProgress)
        
        if (progressDiff > 5) { // 进度差异超过5%时触发状态恢复
          console.log(`状态恢复检测: 当前进度 ${this.currentProgress} -> 新进度 ${newProgress}`)
          this.restoreCalibrationState(newProgress)
        }
      },
      
      restoreCalibrationState(targetProgress) {
        // 根据目标进度恢复校准状态
        console.log(`恢复校准状态: 目标进度 ${targetProgress}%`)
        
        // 重置状态
        this.calibrationPoints = []
        this.isCalibrationComplete = false
        this.isPolarAligned = false
        this.calibrationLoopCount = 0
        this.lastCalibrationProgress = 0
        
        // 根据进度恢复相应的校准点
        if (targetProgress >= 15) {
          this.calibrationPoints.push({
            x: 150 + Math.random() * 20 - 10,
            y: 150 + Math.random() * 20 - 10,
            index: 0
          })
        }
        
        if (targetProgress >= 25) {
          this.calibrationPoints.push({
            x: 150 + Math.random() * 20 - 10,
            y: 150 + Math.random() * 20 - 10,
            index: 1
          })
        }
        
        if (targetProgress >= 50) {
          this.calibrationPoints.push({
            x: 150 + Math.random() * 20 - 10,
            y: 150 + Math.random() * 20 - 10,
            index: 2
          })
        }
        
        // 恢复校准完成状态
        if (targetProgress >= 75) {
          this.isCalibrationComplete = true
          this.calculatePolarAxisOffset()
          
          // 估算校准循环次数（基于进度）
          if (targetProgress >= 85) {
            this.calibrationLoopCount = Math.floor((targetProgress - 75) / 5) + 1
          }
        }
        
        // 恢复极轴对齐状态
        if (targetProgress >= 95) {
          this.isPolarAligned = Math.abs(this.adjustment.azimuth) < 1.0 && Math.abs(this.adjustment.altitude) < 1.0
        }
        
        // 更新校准运行状态
        this.updateCalibrationRunningState(targetProgress)
        
        console.log(`校准状态已恢复: 进度 ${targetProgress}%, 校准点 ${this.calibrationPoints.length}, 完成状态 ${this.isCalibrationComplete}`)
      },
      
      updateCalibrationRunningState(progress) {
        // 根据进度判断校准是否正在运行
        if (progress > 0 && progress < 100) {
          this.isCalibrationRunning = true
          console.log('检测到校准运行状态')
        } else if (progress >= 100) {
          this.isCalibrationRunning = false
          console.log('检测到校准完成状态')
        } else {
          this.isCalibrationRunning = false
          console.log('检测到校准停止状态')
        }
      },
      
      // === 增强的卡片信息更新方法 ===
      updateCardInfo(currentRa, currentDec, targetRa, targetDec, azimuthDegrees, altitudeDegrees, raAdjustment, decAdjustment) {
        // 检查数据是否有显著变化
        const hasSignificantChange = this.checkSignificantDataChange(
          currentRa, currentDec, targetRa, targetDec, 
          azimuthDegrees, altitudeDegrees
        )
        
        if (hasSignificantChange) {
          console.log('检测到显著数据变化')
        }
        
        this.currentPosition.ra = currentRa
        this.currentPosition.dec = currentDec
        this.targetPosition.ra = targetRa
        this.targetPosition.dec = targetDec
        this.adjustment.azimuth = azimuthDegrees
        this.adjustment.altitude = altitudeDegrees
        
        // 更新极轴对齐状态
        this.isPolarAligned = Math.abs(azimuthDegrees) < 1.0 && Math.abs(altitudeDegrees) < 1.0
        
        // 如果检测到显著变化，可能需要状态恢复
        if (hasSignificantChange) {
          this.checkAndRestoreState(this.currentProgress)
        }
      },
      
      checkSignificantDataChange(currentRa, currentDec, targetRa, targetDec, azimuthDegrees, altitudeDegrees) {
        // 检查位置数据是否有显著变化
        const raDiff = Math.abs(this.currentPosition.ra - currentRa)
        const decDiff = Math.abs(this.currentPosition.dec - currentDec)
        const azimuthDiff = Math.abs(this.adjustment.azimuth - azimuthDegrees)
        const altitudeDiff = Math.abs(this.adjustment.altitude - altitudeDegrees)
        
        // 如果任何数据变化超过阈值，认为是显著变化
        return raDiff > 0.1 || decDiff > 0.1 || azimuthDiff > 1.0 || altitudeDiff > 1.0
      },
      
      // === 状态持久化方法 ===
      saveStateToStorage() {
        try {
          const state = {
            currentProgress: this.currentProgress,
            isCalibrationRunning: this.isCalibrationRunning,
            isCalibrationComplete: this.isCalibrationComplete,
            isPolarAligned: this.isPolarAligned,
            calibrationPoints: this.calibrationPoints,
            calibrationLoopCount: this.calibrationLoopCount,
            adjustment: this.adjustment,
            currentPosition: this.currentPosition,
            targetPosition: this.targetPosition,
            timestamp: Date.now()
          }
          
          localStorage.setItem('polarAlignmentState', JSON.stringify(state))
          console.log('状态已保存到存储')
        } catch (error) {
          console.error('保存状态时出错:', error.message)
        }
      },
      
      loadStateFromStorage() {
        try {
          const savedState = localStorage.getItem('polarAlignmentState')
          if (savedState) {
            const state = JSON.parse(savedState)
            const timeDiff = Date.now() - state.timestamp
            
            // 如果状态保存时间超过30分钟，认为过期
            if (timeDiff > 30 * 60 * 1000) {
              console.log('保存的状态已过期')
              localStorage.removeItem('polarAlignmentState')
              return false
            }
            
            // 恢复状态
            this.currentProgress = state.currentProgress || 0
            this.isCalibrationRunning = state.isCalibrationRunning || false
            this.isCalibrationComplete = state.isCalibrationComplete || false
            this.isPolarAligned = state.isPolarAligned || false
            this.calibrationPoints = state.calibrationPoints || []
            this.calibrationLoopCount = state.calibrationLoopCount || 0
            this.adjustment = state.adjustment || { azimuth: 0, altitude: 0 }
            this.currentPosition = state.currentPosition || { ra: '00h 00m 00s', dec: '+00° 00\' 00"' }
            this.targetPosition = state.targetPosition || { ra: '00h 00m 00s', dec: '+00° 00\' 00"' }
            
            console.log(`从存储加载状态: 进度 ${this.currentProgress}%`)
            return true
          }
        } catch (error) {
          console.error('加载状态时出错:', error.message)
        }
        return false
      },
      
      // === 增强的初始化方法 ===
      enhancedInitialize() {
        // 尝试从存储中加载状态
        const stateLoaded = this.loadStateFromStorage()
        
        if (stateLoaded) {
          // 如果加载了状态，检查是否需要进一步恢复
          this.checkAndRestoreState(this.currentProgress)
        }
        
        // 设置定期保存状态
        this.startStatePersistence()
        console.log('增强初始化完成')
      },
      
      startStatePersistence() {
        // 每30秒保存一次状态
        this.statePersistenceInterval = setInterval(() => {
          if (this.isCalibrationRunning || this.currentProgress > 0) {
            this.saveStateToStorage()
          }
        }, 30000)
      },
      
      stopStatePersistence() {
        if (this.statePersistenceInterval) {
          clearInterval(this.statePersistenceInterval)
          this.statePersistenceInterval = null
        }
      },
      
      // === 页面可见性变化处理 ===
      handleVisibilityChange() {
        if (document.visibilityState === 'visible') {
          // 页面变为可见时，检查是否需要状态恢复
          console.log('页面变为可见')
          this.checkAndRestoreState(this.currentProgress)
        } else {
          // 页面变为隐藏时，保存当前状态
          console.log('页面变为隐藏')
          this.saveStateToStorage()
        }
      },
      
      // === 网络状态变化处理 ===
      handleOnlineStatusChange() {
        if (navigator.onLine) {
          console.log('网络连接已恢复')
          // 网络恢复时，检查状态是否需要同步
          this.checkAndRestoreState(this.currentProgress)
        } else {
          console.log('网络连接已断开')
        }
      },
      
      // === 自动状态恢复方法 ===
      autoRestoreCalibrationState() {
        // 如果当前有进度但校准未运行，尝试恢复状态
        if (this.currentProgress > 0 && !this.isCalibrationRunning) {
          console.log('自动恢复校准状态')
          
          // 根据进度判断是否需要重新启动校准
          if (this.currentProgress < 100) {
            console.log('校准可能需要重新启动')
            // 可以在这里添加自动重启校准的逻辑
            // this.startAutoCalibration()
          }
        }
      },
      
      // === 状态同步方法 ===
      syncStateWithBackend() {
        // 向后端请求当前状态
        console.log('向后端请求状态')
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'GetPolarAlignmentState')
      }
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