  <template>
    <div class="polar-alignment-interface" v-show="visible">
      <!-- 重新设计的主布局：左侧视场显示，右侧信息控制面板 -->
      <div class="main-layout">
        <!-- 左侧视场显示区域 -->
        <div class="display-panel">
          <!-- 标题栏 -->
          <div class="panel-header">
            <div class="header-title">
              <span class="interface-title">{{ $t('Automatic Polar Alignment Calibration') }}</span>
              <div class="connection-status">
                <div class="status-indicator" :class="{ 'online': isConnected }"></div>
                <span>{{ isConnected ? $t('Mount Connected') : $t('Mount Disconnected') }}</span>
              </div>
            </div>
            <div class="header-actions">
              <v-icon class="close-icon" @click="closeComponent">mdi-close</v-icon>
            </div>
          </div>

          

          <!-- 主视场显示 -->
          <div class="field-display">
            <svg width="100%" height="100%" viewBox="0 0 500 500" class="field-svg">
              <rect width="100%" height="100%" fill="#0a0a0a" />
              
              <!-- 网格背景 -->
              <defs>
                <pattern id="grid" width="25" height="25" patternUnits="userSpaceOnUse">
                  <path d="M 25 0 L 0 0 0 25" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="0.5"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
              
              <!-- 同心圆指示 -->
              <g class="polar-circles">
                <circle cx="250" cy="250" r="40" fill="none" stroke="rgba(0,255,0,0.4)" stroke-width="2" stroke-dasharray="3,3" />
                <circle cx="250" cy="250" r="80" fill="none" stroke="rgba(0,255,0,0.3)" stroke-width="1" stroke-dasharray="2,4" />
                <circle cx="250" cy="250" r="120" fill="none" stroke="rgba(0,255,0,0.2)" stroke-width="1" stroke-dasharray="1,5" />
              </g>
              
              <!-- 目标点（原极轴点） -->
              <g class="target-center">
                <circle cx="250" cy="250" r="10" fill="#ff6b6b" stroke="#ff5252" stroke-width="2" />
                <text x="250" y="235" text-anchor="middle" fill="#ff6b6b" font-size="14" font-weight="bold">{{ $t('Target') }}</text>
              </g>
              

              
              <!-- 视场框 - 只在有数据时显示 -->
              <g v-if="fieldData" class="field-of-view" :transform="fieldTransform">
                <!-- 视场外框 -->
                <rect 
                  :x="fieldRect.x" 
                  :y="fieldRect.y" 
                  :width="fieldRect.width" 
                  :height="fieldRect.height" 
                  fill="none" 
                  :stroke="fieldBorderColor" 
                  stroke-width="2" 
                />
                
                <!-- 视场中心十字线 -->
                <line 
                  :x1="fieldCenter.x - 20" 
                  :y1="fieldCenter.y" 
                  :x2="fieldCenter.x + 20" 
                  :y2="fieldCenter.y" 
                  :stroke="fieldBorderColor" 
                  stroke-width="1" 
                  stroke-dasharray="2,2" 
                />
                <line 
                  :x1="fieldCenter.x" 
                  :y1="fieldCenter.y - 20" 
                  :x2="fieldCenter.x" 
                  :y2="fieldCenter.y + 20" 
                  :stroke="fieldBorderColor" 
                  stroke-width="1" 
                  stroke-dasharray="2,2" 
                />
                
                <!-- 视场中心点 -->
                <circle 
                  :cx="fieldCenter.x" 
                  :cy="fieldCenter.y" 
                  r="3" 
                  :fill="fieldBorderColor" 
                />
                
                <!-- 中心对准框（虚线） -->
                <rect 
                  :x="fieldCenter.x - 15" 
                  :y="fieldCenter.y - 15" 
                  :width="30" 
                  :height="30" 
                  fill="none" 
                  stroke="#ffffff" 
                  stroke-width="1" 
                  stroke-dasharray="3,3" 
                />
              </g>
              
              <!-- 校准点和赤经赤纬线 -->
              <g class="calibration-points">
                <!-- 赤经线 -->
                <line v-for="(point, index) in calibrationPoints" :key="'ra-line-' + index"
                      :x1="point.x" :y1="0" :x2="point.x" :y2="500"
                      stroke="rgba(100, 181, 246, 0.3)" stroke-width="1" stroke-dasharray="3,3" />
                
                <!-- 赤纬线 -->
                <line v-for="(point, index) in calibrationPoints" :key="'dec-line-' + index"
                      :x1="0" :y1="point.y" :x2="500" :y2="point.y"
                      stroke="rgba(255, 152, 0, 0.3)" stroke-width="1" stroke-dasharray="3,3" />
                
                <!-- 校准点 -->
                <circle v-for="(point, index) in calibrationPoints" :key="index"
                        :cx="point.x" :cy="point.y" r="6" :fill="getPointColor(index)" 
                        stroke="#ffffff" stroke-width="2" />
                <text v-for="(point, index) in calibrationPoints" :key="'text-' + index"
                      :x="point.x" :y="point.y - 12" text-anchor="middle" fill="#ffffff" font-size="14" font-weight="bold">
                  {{ index + 1 }}
                </text>
                
                <!-- 目标点（基于fieldData显示） -->
                <g v-if="targetPoint">
                  <circle :cx="targetPoint.x" :cy="targetPoint.y" r="8" fill="none" 
                          stroke="#00ff00" stroke-width="3" />
                  <text :x="targetPoint.x" :y="targetPoint.y - 15" text-anchor="middle" 
                        fill="#00ff00" font-size="16" font-weight="bold">T</text>
                </g>
              </g>
              
              <!-- 校准成功指示 -->
              <g v-if="isCalibrationComplete && isPolarAligned">
                <circle cx="250" cy="250" r="50" fill="none" stroke="#00ff00" stroke-width="5" class="success-ring" />
                <text x="250" y="320" text-anchor="middle" fill="#00ff00" font-size="18" font-weight="bold">
                  {{ $t('Polar Aligned!') }}
                </text>
              </g>
            </svg>
          </div>
        </div>

        <!-- 右侧信息控制面板 -->
        <div class="info-panel">
          <!-- 极轴校准信息 -->
          <div class="info-card polar-alignment-info">
            <div class="card-header">
              <v-icon class="card-icon">mdi-compass-rose</v-icon>
              <span>{{ $t('Polar Alignment Calibration') }}</span>
            </div>
            <div class="card-content">
              <!-- 校准步骤进度条 -->
              <div class="calibration-progress">
                <div class="progress-bar">
                  <div class="progress-fill" :style="{ width: progressPercentage + '%' }"></div>
                  <div class="progress-nodes">
                    <div class="progress-node" :class="getStepClass(0)">
                      <div class="node-circle">
                        <v-icon v-if="calibrationPoints.length > 0">mdi-check</v-icon>
                        <span v-else>1</span>
                      </div>
                    </div>
                    <div class="progress-node" :class="getStepClass(1)">
                      <div class="node-circle">
                        <v-icon v-if="calibrationPoints.length > 1">mdi-check</v-icon>
                        <span v-else>2</span>
                      </div>
                    </div>
                    <div class="progress-node" :class="getStepClass(2)">
                      <div class="node-circle">
                        <v-icon v-if="calibrationPoints.length > 2">mdi-check</v-icon>
                        <span v-else>3</span>
                      </div>
                    </div>
                    <div class="progress-node adjustment-node" :class="{ 'active': isCalibrationComplete }">
                      <div class="node-circle">
                        <v-icon v-if="isPolarAligned">mdi-check</v-icon>
                        <v-icon v-else>mdi-tune</v-icon>
                      </div>
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
                      <v-icon>mdi-rotate-360</v-icon>
                    </div>
                    <div class="adjustment-details">
                      <div class="adjustment-header">
                        <span class="adjustment-type">{{ $t('Azimuth') }}</span>
                        <span class="adjustment-value">{{ formatAdjustmentValue(adjustment.azimuth) }}</span>
                      </div>
                      <div class="adjustment-action">
                        {{ needsAzimuthAdjustment ? getAzimuthAction(adjustment.azimuth) : $t('No adjustment needed') }}
                      </div>
                      <!-- 方位角调整箭头 -->
                      <div v-if="needsAzimuthAdjustment" class="adjustment-arrows">
                        <div class="arrow-container">
                          <div class="arrow-left" v-if="adjustment.azimuth < 0">
                            <svg width="20" height="20" viewBox="0 0 20 20">
                              <circle cx="10" cy="10" r="8" fill="none" stroke="#ff9800" stroke-width="2"/>
                              <path d="M 12 10 L 8 10 M 8 10 L 10 8 M 8 10 L 10 12" stroke="#ff9800" stroke-width="2" fill="none"/>
                            </svg>
                          </div>
                          <div class="arrow-right" v-if="adjustment.azimuth > 0">
                            <svg width="20" height="20" viewBox="0 0 20 20">
                              <circle cx="10" cy="10" r="8" fill="none" stroke="#ff9800" stroke-width="2"/>
                              <path d="M 8 10 L 12 10 M 12 10 L 10 8 M 12 10 L 10 12" stroke="#ff9800" stroke-width="2" fill="none"/>
                            </svg>
                          </div>
                        </div>
                      </div>
                      <!-- 显示RA调整建议
                      <div v-if="raAdjustmentSuggestion" class="adjustment-suggestion">
                        <span class="suggestion-label">RA建议:</span>
                        <span class="suggestion-text">{{ raAdjustmentSuggestion }}</span>
                      </div> -->
                    </div>
                  </div>
                  
                  <div class="adjustment-item" :class="{ 'active': needsAltitudeAdjustment }">
                    <div class="adjustment-icon">
                      <v-icon>mdi-arrow-up-down</v-icon>
                    </div>
                    <div class="adjustment-details">
                      <div class="adjustment-header">
                        <span class="adjustment-type">{{ $t('Altitude') }}</span>
                        <span class="adjustment-value">{{ formatAdjustmentValue(adjustment.altitude) }}</span>
                      </div>
                      <div class="adjustment-action">
                        {{ needsAltitudeAdjustment ? getAltitudeAction(adjustment.altitude) : $t('No adjustment needed') }}
                      </div>
                      <!-- 高度角调整箭头 -->
                      <div v-if="needsAltitudeAdjustment" class="adjustment-arrows">
                        <div class="arrow-container">
                          <div class="arrow-down" v-if="adjustment.altitude < 0">
                            <svg width="20" height="20" viewBox="0 0 20 20">
                              <circle cx="10" cy="10" r="8" fill="none" stroke="#ff9800" stroke-width="2"/>
                              <path d="M 10 8 L 10 12 M 10 12 L 8 10 M 10 12 L 12 10" stroke="#ff9800" stroke-width="2" fill="none"/>
                            </svg>
                          </div>
                          <div class="arrow-up" v-if="adjustment.altitude > 0">
                            <svg width="20" height="20" viewBox="0 0 20 20">
                              <circle cx="10" cy="10" r="8" fill="none" stroke="#ff9800" stroke-width="2"/>
                              <path d="M 10 12 L 10 8 M 10 8 L 8 10 M 10 8 L 12 10" stroke="#ff9800" stroke-width="2" fill="none"/>
                            </svg>
                          </div>
                        </div>
                      </div>
                      <!-- 显示DEC调整建议 -->
                      <!-- <div v-if="decAdjustmentSuggestion" class="adjustment-suggestion">
                        <span class="suggestion-label">DEC建议:</span>
                        <span class="suggestion-text">{{ decAdjustmentSuggestion }}</span>
                      </div> -->
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
                  <!-- <button class="action-btn secondary" @click="resetCalibration" :disabled="!canReset">
                    <v-icon>mdi-refresh</v-icon>
                    <span>{{ $t('Reset') }}</span>
                  </button> -->
                  <button class="action-btn restore" @click="restoreCalibration" :disabled="!canRestore">
                    <v-icon>mdi-restore</v-icon>
                    <span>{{ $t('Restore') }}</span>
                  </button>
                </div>
              </div>
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
        polarAxisOffset: {
          azimuth: 0,
          altitude: 0
        },
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
        fieldData: null, // 包含8个值：ra, dec, maxra, minra, maxdec, mindec, targetra, targetdec
        fieldCenter: { x: 250, y: 250 }, // 视场中心位置，默认在中心
        fieldRect: { x: 190, y: 205, width: 120, height: 90 }, // 视场矩形，相对于SVG坐标
        isAligned: false, // 是否对准
        
        // 恢复功能相关数据
        savedCalibrationData: null, // 保存的校准数据
        canRestore: false, // 是否可以恢复
        
        // 当前进度
        currentProgress: 0
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
      
      // 是否可以添加点
      canAddPoint() {
        return this.isConnected && this.calibrationPoints.length < 3
      },
      
      // 是否可以重置
      canReset() {
        return this.calibrationPoints.length > 0
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
      },
      
      // 视场边框颜色
      fieldBorderColor() {
        return this.isAligned ? '#00ff00' : '#ffffff'
      },
      
      // 计算目标点（基于fieldData中的targetra和targetdec）
      targetPoint() {
        if (this.fieldData && this.fieldData.targetra !== undefined && this.fieldData.targetdec !== undefined) {
          // 目标点始终在中心 (250, 250)
          return { x: 250, y: 250 }
        }
        return null
      },
      
     
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
      
      // 实现组件销毁逻辑
      this.cleanup()
    },
    
    methods: {
      // === 信号总线事件处理 ===
      showInterface() {
        this.$emit('update:visible', true)
        this.addLog('极轴校准界面已显示', 'info')
      },
      
      hideInterface() {
        this.$emit('update:visible', false)
        this.addLog('极轴校准界面已隐藏', 'info')
      },
      
      updateMountConnection(status) {
        this.isConnected = status === 1
        const statusText = this.isConnected ? '已连接' : '已断开'
        this.addLog(`赤道仪连接状态：${statusText}`, this.isConnected ? 'success' : 'warning')
      },
      
      // === 初始化和清理 ===
      initialize() {
        // 实现初始化逻辑
        // - 连接事件总线
        // - 初始化WebSocket
        // - 设置定时器
        // - 加载配置
        this.addLog('极轴校准组件初始化完成', 'info')
        

      },
      
      cleanup() {
        // 实现清理逻辑
        // - 断开事件总线
        // - 关闭WebSocket
        // - 清理定时器
        this.addLog('极轴校准组件已清理', 'info')
        

      },
      
      // === UI控制方法 ===
      closeComponent() {
        this.$emit('update:visible', false)
        this.addLog('关闭极轴校准界面', 'info')
      },
      

      

      

      
      resetCalibration() {
        this.calibrationPoints = []
        this.isCalibrationComplete = false
        this.isPolarAligned = false
        this.polarAxisOffset = { azimuth: 0, altitude: 0 }
        // 清除视场数据
        this.fieldData = null
        this.isAligned = false
        this.addLog('校准数据已重置', 'info')
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'ResetAutoPolarAlignment')
      },
      
      restoreCalibration() {
        this.addLog('校准数据已恢复', 'success')
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'RestoreAutoPolarAlignment')
      },
      
      startAutoCalibration() {
        if (!this.isConnected) {
          this.addLog('错误：赤道仪未连接，无法开始自动校准', 'error')
          return
        }
        if (this.isCalibrationRunning) {
          this.stopAutoCalibration()
          return
        }
        this.isCalibrationRunning = true
        this.resetCalibration()
        this.addLog('开始自动校准...', 'info')
        // TODO: 这里应调用实际的自动校准启动接口
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'StartAutoPolarAlignment')
      },
      stopAutoCalibration() {
        this.isCalibrationRunning = false
        this.addLog('自动校准已停止', 'warning')
        // TODO: 这里应调用实际的自动校准停止接口
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'StopAutoPolarAlignment')
      },
      
      // === 卡片信息更新方法 ===
      updateCardInfo(currentRa, currentDec, targetRa, targetDec, azimuthDegrees, altitudeDegrees, raAdjustment, decAdjustment) {
        // 更新当前位置
        this.currentPosition.ra = currentRa
        this.currentPosition.dec = currentDec
        
        // 更新目标位置
        this.targetPosition.ra = targetRa
        this.targetPosition.dec = targetDec
        
        // 更新调整信息
        this.adjustment.azimuth = azimuthDegrees
        this.adjustment.altitude = altitudeDegrees
        
        // 记录日志
        this.addLog(`卡片信息更新：当前(${currentRa}, ${currentDec}) 目标(${targetRa}, ${targetDec}) 调整(${azimuthDegrees.toFixed(1)}°, ${altitudeDegrees.toFixed(1)}°)`, 'info')
        
        // 判断是否极轴对准
        this.isPolarAligned = Math.abs(azimuthDegrees) < 1.0 && Math.abs(altitudeDegrees) < 1.0
      },
      
      // === 视场数据处理方法 ===
      updateFieldData(data) {
        // 接收视场数据：ra, dec, maxra, minra, maxdec, mindec
        if (data && Array.isArray(data) && data.length >= 6) {
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
          
          // 计算视场位置和大小
          this.calculateFieldPosition()
          
          // 检查对准状态
          this.checkAlignment()
          
          this.addLog(`视场数据更新：RA ${data[0]}, DEC ${data[1]}`, 'info')
        }
      },
      
      calculateFieldPosition() {
        if (!this.fieldData) return
        
        // 目标点始终在中心 (250, 250)
        const targetX = 250
        const targetY = 250
        
        // 计算视场大小（基于RA和DEC的范围）
        const raRange = this.fieldData.maxra - this.fieldData.minra
        const decRange = this.fieldData.maxdec - this.fieldData.mindec
        
        // 转换为屏幕坐标（简化处理）
        const scale = 50 // 缩放因子，调整以适合显示
        const fieldWidth = Math.abs(raRange) * scale
        const fieldHeight = Math.abs(decRange) * scale
        
        // 限制视场大小，避免超出显示范围
        const maxFieldSize = 200
        const actualFieldWidth = Math.min(fieldWidth, maxFieldSize)
        const actualFieldHeight = Math.min(fieldHeight, maxFieldSize)
        
        // 计算视场中心相对于目标点的偏移
        // 使用目标点的ra和dec作为参考点
        const targetRa = this.fieldData.targetra || this.fieldData.ra
        const targetDec = this.fieldData.targetdec || this.fieldData.dec
        
        // 计算视场中心与目标点的偏移
        const raOffset = (this.fieldData.ra - targetRa) * scale
        const decOffset = (this.fieldData.dec - targetDec) * scale
        
        // 限制偏移范围，确保视场不会超出显示区域
        const maxOffset = 150
        const limitedRaOffset = Math.max(-maxOffset, Math.min(maxOffset, raOffset))
        const limitedDecOffset = Math.max(-maxOffset, Math.min(maxOffset, decOffset))
        
        // 更新视场位置 - 视场中心相对于目标点的偏移
        this.fieldCenter = {
          x: targetX + limitedRaOffset,
          y: targetY + limitedDecOffset
        }
        
        // 更新视场矩形（相对于SVG坐标系统）
        this.fieldRect = {
          x: this.fieldCenter.x - actualFieldWidth / 2,
          y: this.fieldCenter.y - actualFieldHeight / 2,
          width: actualFieldWidth,
          height: actualFieldHeight
        }
      },
      
      checkAlignment() {
        if (!this.fieldData) {
          this.isAligned = false
          return
        }
        
        // 检查目标点是否在对准框内
        const targetX = 250
        const targetY = 250
        
        // 对准框位置是相对于视场中心的
        const alignmentBoxX = this.fieldCenter.x - 15
        const alignmentBoxY = this.fieldCenter.y - 15
        const alignmentBoxWidth = 30
        const alignmentBoxHeight = 30
        
        // 检查目标点是否在对准框内
        this.isAligned = (
          targetX >= alignmentBoxX &&
          targetX <= alignmentBoxX + alignmentBoxWidth &&
          targetY >= alignmentBoxY &&
          targetY <= alignmentBoxY + alignmentBoxHeight
        )
        
        if (this.isAligned) {
          this.addLog('视场已对准目标点', 'success')
        } else {
          this.addLog('视场未对准目标点', 'warning')
        }
      },
      
      // === 计算方法 ===
      calculatePolarAxisOffset() {
        if (this.calibrationPoints.length < 3) return
        
        // 简化的极轴偏移计算（模拟）
        const centerX = 150
        const centerY = 150
        
        let totalOffsetX = 0
        let totalOffsetY = 0
        
        this.calibrationPoints.forEach(point => {
          totalOffsetX += point.x - centerX
          totalOffsetY += point.y - centerY
        })
        
        const avgOffsetX = totalOffsetX / this.calibrationPoints.length
        const avgOffsetY = totalOffsetY / this.calibrationPoints.length
        
        // 转换为方位角和高度角偏移（模拟）
        this.polarAxisOffset.azimuth = avgOffsetX * 0.1
        this.polarAxisOffset.altitude = avgOffsetY * 0.1
        
        this.calculatePolarDistance()
        this.calculateAdjustmentDirection()
        
        this.addLog(`极轴偏移：方位角 ${this.polarAxisOffset.azimuth.toFixed(1)}'，高度角 ${this.polarAxisOffset.altitude.toFixed(1)}'`, 'info')
      },
      
      calculateAdjustmentDirection() {
        const azimuth = this.polarAxisOffset.azimuth
        const altitude = this.polarAxisOffset.altitude
        
        this.adjustment.azimuth = azimuth
        this.adjustment.altitude = altitude
        
        // 判断是否需要调整
        this.showAdjustmentArrows = Math.abs(azimuth) > 0.5 || Math.abs(altitude) > 0.5
        
        // 判断是否极轴对准
        this.isPolarAligned = Math.abs(azimuth) < 1.0 && Math.abs(altitude) < 1.0
      },
      
      calculatePolarDistance() {
        const azimuth = this.polarAxisOffset.azimuth
        const altitude = this.polarAxisOffset.altitude
        this.polarDistance = Math.sqrt(azimuth * azimuth + altitude * altitude)
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
      
      formatCoordinates(point) {
        return `(${point.x.toFixed(0)}, ${point.y.toFixed(0)})`
      },
      
      formatOffset(value) {
        return value.toFixed(1) + "'"
      },
      
      // === 辅助方法 ===
      getStepClass(index) {
        if (index < this.calibrationPoints.length) {
          return { completed: true }
        } else if (index === this.calibrationPoints.length) {
          return { current: true }
        }
        return {}
      },
      
      getPointColor(index) {
        const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1']
        return colors[index % colors.length]
      },
      
      getAzimuthAction(azimuth) {
        if (azimuth > 0.5) {
          return this.$t('Turn Right') || '向右转'
        } else if (azimuth < -0.5) {
          return this.$t('Turn Left') || '向左转'
        }
        return ''
      },
      
      getAltitudeAction(altitude) {
        if (altitude > 0.5) {
          return this.$t('Raise Up') || '抬高'
        } else if (altitude < -0.5) {
          return this.$t('Lower Down') || '降低'
        }
        return ''
      },
      
      // === 事件处理方法 ===
      handlePositionUpdate(data) {
        // TODO: 实现位置更新事件处理逻辑
        
      },
      
      handleCalibrationComplete(data) {
        // TODO: 实现校准完成事件处理逻辑
      },
      
      handleMountConnection(status) {
        // TODO: 实现赤道仪连接状态处理逻辑
      },
      
      // === 日志方法 ===
      addLog(message, level = 'info') {
        const log = {
          id: Date.now() + Math.random(),
          message,
          level,
          timestamp: new Date()
        }
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
      updatePolarAlignmentState(stateNumber, logMessage, progress) {
        // 第一个参数：当前执行状态序号（无需处理）
        // 第二个参数：日志信息
        if (logMessage && typeof logMessage === 'string') {
          // 根据日志内容判断日志级别
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
        
        // 第三个参数：进度
        if (progress !== undefined && progress !== null) {
          // 保存传入的进度
          this.currentProgress = progress
          
          // 根据进度更新校准状态
          if (progress >= 0 && progress <= 100) {
            // 根据进度确定校准点数量
            if (progress >= 0 && progress < 25) {
              // 第一阶段：准备校准
              this.calibrationPoints = []
              this.isCalibrationComplete = false
              this.isPolarAligned = false
            } else if (progress >= 25 && progress < 50) {
              // 第二阶段：第一个校准点
              if (this.calibrationPoints.length === 0) {
                this.calibrationPoints.push({
                  x: 150 + Math.random() * 20 - 10,
                  y: 150 + Math.random() * 20 - 10,
                  index: 0
                })
              }
            } else if (progress >= 50 && progress < 75) {
              // 第三阶段：第二个校准点
              if (this.calibrationPoints.length === 1) {
                this.calibrationPoints.push({
                  x: 150 + Math.random() * 20 - 10,
                  y: 150 + Math.random() * 20 - 10,
                  index: 1
                })
              }
            } else if (progress >= 75 && progress < 100) {
              // 第四阶段：第三个校准点
              if (this.calibrationPoints.length === 2) {
                this.calibrationPoints.push({
                  x: 150 + Math.random() * 20 - 10,
                  y: 150 + Math.random() * 20 - 10,
                  index: 2
                })
              }
            } else if (progress >= 100) {
              // 校准完成
              this.isCalibrationComplete = true
              this.calculatePolarAxisOffset()
              
              // 检查是否极轴对准
              if (Math.abs(this.polarAxisOffset.azimuth) < 1.0 && Math.abs(this.polarAxisOffset.altitude) < 1.0) {
                this.isPolarAligned = true
                this.addLog('极轴校准完成，极轴已对准！', 'success')
              } else {
                this.addLog('极轴校准完成，需要手动调整', 'warning')
              }
            }
          }
        }
      }
    }
  }
  </script>
  
  <style scoped>
  /* === 主界面布局样式 === */
  .polar-alignment-interface {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    height: 100vh;
    width: 100vw;
    max-width: 100vw;
    background: rgba(25, 25, 35, 0.95);
    backdrop-filter: blur(10px);
    z-index: 1000;
    font-family: 'Microsoft YaHei', Arial, sans-serif;
    display: flex;
    flex-direction: column;
    color: #ffffff;
    pointer-events: auto;
    overflow: hidden;
    box-sizing: border-box;
  }
  
  /* 全局元素约束 */
  .polar-alignment-interface * {
    box-sizing: border-box;
    max-width: 100%;
  }
  
  /* 顶部状态栏 */
  .status-bar {
    height: 50px;
    background: rgba(40, 40, 50, 0.9);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 20px;
    flex-shrink: 0;
    pointer-events: auto;
  }
  
  .status-info {
    display: flex;
    align-items: center;
    gap: 20px;
    pointer-events: auto;
  }
  
  .interface-title {
    font-size: 16px;
    font-weight: 600;
    color: #ffffff;
  }
  
  .connection-status {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
  }
  
  .status-indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #f44336;
    transition: all 0.3s ease;
  }
  
  .status-indicator.online {
    background: #4caf50;
    box-shadow: 0 0 8px rgba(76, 175, 80, 0.6);
  }
  
  .header-actions {
    display: flex;
    align-items: center;
    pointer-events: auto;
  }
  
  .close-icon {
    color: rgba(255, 255, 255, 0.7);
    cursor: pointer;
    transition: color 0.3s ease;
    pointer-events: auto;
  }
  
  .close-icon:hover {
    color: #ff5722;
  }
  
  /* === 主要左右布局结构 === */
  .main-layout {
    flex: 1;
    display: flex;
    flex-direction: row;
    gap: 12px;
    overflow: hidden;
    pointer-events: auto;
    max-width: 100vw;
    min-height: 0;
    padding: 12px;
  }

  /* === 左侧视场显示区域 === */
  .display-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    background: rgba(35, 35, 45, 0.8);
    border-radius: 12px;
    padding: 16px;
    min-height: 0;
    position: relative;
  }

  /* === 右侧信息控制面板 === */
  .info-panel {
    flex: 0 0 380px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    background: rgba(35, 35, 45, 0.8);
    border-radius: 12px;
    padding: 16px;
    min-height: 0;
    max-height: 100vh;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    overflow-x: hidden;
  }

  /* === 面板标题 === */
  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .header-title {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .interface-title {
    font-size: 16px;
    font-weight: 600;
    color: #ffffff;
  }

  .connection-status {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.8);
  }

  .status-indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #f44336;
    transition: all 0.3s ease;
  }

  .status-indicator.online {
    background: #4caf50;
    box-shadow: 0 0 8px rgba(76, 175, 80, 0.6);
  }

  .header-actions {
    display: flex;
    align-items: center;
  }

  .close-icon {
    color: rgba(255, 255, 255, 0.7);
    cursor: pointer;
    transition: color 0.3s ease;
    pointer-events: auto;
  }

  .close-icon:hover {
    color: #ff5722;
  }

  /* === 信息卡片样式 === */
  .info-card {
    background: rgba(50, 50, 60, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    overflow: hidden;
    transition: all 0.3s ease;
  }

  .info-card:hover {
    border-color: rgba(255, 255, 255, 0.2);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }



  /* === 视场显示区域 === */
  .field-display {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 0;
  }

  .field-svg {
    width: 100%;
    height: 100%;
    max-width: 600px;
    max-height: 600px;
    object-fit: contain;
  }

  /* === 卡片头部样式 === */
  .card-header {
    background: rgba(60, 60, 70, 0.9);
    padding: 14px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .card-header span {
    font-size: 14px;
    font-weight: 600;
    color: #ffffff;
    display: flex;
    align-items: center;
    gap: 8px;
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

  .card-icon.control {
    color: #9c27b0;
  }

  .card-content {
    padding: 16px;
    min-height: 0;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }

  /* === 状态概览样式已删除 === */
  /* 这些样式已经被简化结构替代 */

  /* === 已删除的旧样式 === */
  /* 这些样式已经被新的简化结构替代 */

  /* === 位置信息样式 === */
  .position-grid {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .position-row {
    display: flex;
    justify-content: space-between;
    gap: 16px;
  }

  .position-group {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    flex: 1;
  }

  .position-label {
    font-size: 10px;
    color: rgba(255, 255, 255, 0.7);
  }

  .position-value {
    font-size: 12px;
    color: #ffffff;
    font-family: monospace;
    font-weight: 500;
  }

  /* === 调整信息样式 === */
  .adjustment-grid {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .adjustment-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
    transition: all 0.3s ease;
  }

  .adjustment-item.significant {
    background: rgba(255, 152, 0, 0.15);
    border: 1px solid rgba(255, 152, 0, 0.3);
  }

  .adjustment-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .adjustment-type {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.7);
    font-weight: 500;
  }

  .adjustment-value {
    font-family: monospace;
    font-size: 14px;
    color: #ffffff;
    font-weight: bold;
  }

  .adjustment-action {
    font-size: 11px;
    color: #64b5f6;
    font-weight: 500;
  }

  /* === 进度条样式 === */
  .progress-bar {
    width: 100%;
    height: 6px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
    overflow: hidden;
    margin-bottom: 16px;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #64b5f6, #4caf50);
    transition: width 0.3s ease;
  }

  .progress-steps {
    display: flex;
    justify-content: space-between;
    gap: 8px;
  }

  .step {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 8px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 6px;
    transition: all 0.3s ease;
  }

  .step.completed {
    background: rgba(76, 175, 80, 0.2);
    border: 1px solid #4caf50;
  }

  .step.current {
    background: rgba(100, 181, 246, 0.2);
    border: 1px solid #64b5f6;
  }

  .step-circle {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: bold;
    color: #ffffff;
    margin-bottom: 4px;
  }

  .step.completed .step-circle {
    background: #4caf50;
  }

  .step.current .step-circle {
    background: #64b5f6;
  }

  .step-label {
    font-size: 10px;
    color: rgba(255, 255, 255, 0.7);
    text-align: center;
  }

  /* === 控制按钮样式 === */
  .control-buttons {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .control-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px 16px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.3s ease;
    pointer-events: auto;
  }

  .control-btn.primary {
    background: #64b5f6;
    color: #ffffff;
  }

  .control-btn.primary:hover:not(:disabled) {
    background: #42a5f5;
  }

  .control-btn.secondary {
    background: rgba(255, 255, 255, 0.1);
    color: #ffffff;
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .control-btn.secondary:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.2);
  }

  .control-btn.success {
    background: #4caf50;
    color: #ffffff;
  }

  .control-btn.success:hover:not(:disabled) {
    background: #43a047;
  }

  .control-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* === 日志显示样式 === */
  .expand-logs-btn {
    background: transparent;
    border: none;
    color: rgba(255, 255, 255, 0.7);
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    transition: all 0.3s ease;
    pointer-events: auto;
  }

  .expand-logs-btn:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  .expand-logs-btn .v-icon.rotated {
    transform: rotate(180deg);
  }

  .log-stream {
    max-height: 120px;
    overflow-y: auto;
    transition: max-height 0.3s ease;
    -webkit-overflow-scrolling: touch;
  }

  .log-stream.expanded {
    max-height: 200px;
  }

  .log-entry {
    display: flex;
    margin-bottom: 6px;
    padding: 6px 8px;
    border-radius: 4px;
    font-size: 11px;
    background: rgba(255, 255, 255, 0.05);
  }

  .log-entry.info {
    border-left: 3px solid #64b5f6;
  }

  .log-entry.warning {
    border-left: 3px solid #ff9800;
  }

  .log-entry.success {
    border-left: 3px solid #4caf50;
  }

  .log-entry.error {
    border-left: 3px solid #f44336;
  }

  .log-timestamp {
    color: rgba(255, 255, 255, 0.6);
    margin-right: 8px;
    min-width: 60px;
    font-family: monospace;
  }

  .log-content {
    color: rgba(255, 255, 255, 0.9);
    flex: 1;
  }
  
  .left-panel, .center-panel, .right-panel {
    background: rgba(35, 35, 45, 0.8);
    border-radius: 8px;
    margin: 8px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    pointer-events: auto;
    max-width: 100%;
    box-sizing: border-box;
  }
  
  .left-panel {
    flex: 0 0 300px;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
  
  .center-panel {
    flex: 1;
    min-width: 400px;
  }
  
  .right-panel {
    flex: 0 0 280px;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
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
  
  /* === 卡片样式 === */
  .status-card, .control-card {
    background: rgba(50, 50, 60, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    margin-bottom: 16px;
    overflow: hidden;
    pointer-events: auto;
    max-width: 100%;
    box-sizing: border-box;
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
  
  /* === 位置信息卡片 === */
  .position-grid {
    padding: 16px;
  }
  
  .position-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    padding: 8px 12px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
  }
  
  .position-item label {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.7);
    font-weight: 500;
  }
  
  .coordinates {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
  }
  
  .coordinates span {
    font-family: monospace;
    font-size: 11px;
    color: #ffffff;
  }
  
  .distance-indicator {
    text-align: center;
    padding: 12px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 6px;
    margin-top: 8px;
  }
  
  .distance-value {
    font-size: 18px;
    font-weight: bold;
    color: #ffffff;
    margin-bottom: 4px;
  }
  
  .distance-value.close {
    color: #4caf50;
  }
  
  .distance-value.far {
    color: #ff9800;
  }
  
  .distance-label {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.7);
  }
  
  /* === 调整信息卡片 === */
  .adjustment-grid {
    padding: 16px;
  }
  
  .adjustment-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    padding: 8px 12px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
  }
  
  .adjustment-item.significant {
    background: rgba(255, 152, 0, 0.15);
    border: 1px solid rgba(255, 152, 0, 0.3);
  }
  
  .adjustment-type {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.7);
    font-weight: 500;
  }
  
  .adjustment-value {
    font-family: monospace;
    font-size: 13px;
    color: #ffffff;
    font-weight: bold;
  }
  
  .adjustment-action {
    font-size: 11px;
    color: #64b5f6;
    font-weight: 500;
  }
  
  /* === 日志卡片 === */
  .expand-logs-btn {
    background: transparent;
    border: none;
    color: rgba(255, 255, 255, 0.7);
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    transition: all 0.3s ease;
    pointer-events: auto;
    min-height: 28px;
    min-width: 28px;
    touch-action: manipulation;
  }
  
  .expand-logs-btn:hover {
    background: rgba(255, 255, 255, 0.1);
  }
  
  .expand-logs-btn .v-icon.rotated {
    transform: rotate(180deg);
  }
  
  .log-stream {
    max-height: 200px;
    overflow-y: auto;
    padding: 12px;
    transition: max-height 0.3s ease;
  }
  
  .log-stream.expanded {
    max-height: 400px;
  }
  
  .log-entry {
    display: flex;
    margin-bottom: 8px;
    padding: 6px 8px;
    border-radius: 4px;
    font-size: 12px;
    background: rgba(255, 255, 255, 0.05);
  }
  
  .log-entry.info {
    border-left: 3px solid #64b5f6;
  }
  
  .log-entry.warning {
    border-left: 3px solid #ff9800;
  }
  
  .log-entry.success {
    border-left: 3px solid #4caf50;
  }
  
  .log-entry.error {
    border-left: 3px solid #f44336;
  }
  
  .log-timestamp {
    color: rgba(255, 255, 255, 0.6);
    margin-right: 12px;
    min-width: 70px;
    font-family: monospace;
  }
  
  .log-content {
    color: rgba(255, 255, 255, 0.9);
    flex: 1;
  }
  
  /* === 可视化区域 === */
  .visualization-container {
    height: 100%;
    display: flex;
    flex-direction: column;
    pointer-events: auto;
    gap: 6px;
    max-width: 100%;
    overflow: hidden;
  }
  
  .mount-view-section, .field-view-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    margin-bottom: 6px;
    pointer-events: auto;
    min-height: 0;
    overflow: hidden;
    max-width: 100%;
  }
  
  .mount-view, .field-view {
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 16px;
    pointer-events: auto;
    min-height: 0;
    width: 100%;
    max-width: 100%;
    overflow: hidden;
    position: relative;
  }
  
  .mount-svg, .field-svg {
    width: 100%;
    height: auto;
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    aspect-ratio: 1 / 1;
  }
  
  /* === SVG动画 === */
  .pointing-line {
    animation: blink 2s infinite;
  }
  
  .adjustment-arrow {
    animation: pulse-arrow 1.5s infinite;
  }
  
  .success-ring {
    animation: success-pulse 2s infinite;
  }
  
  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }
  
  @keyframes pulse-arrow {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.8; transform: scale(1.1); }
  }
  
  @keyframes success-pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.7; transform: scale(1.05); }
  }
  
    /* === 校准步骤进度条样式 === */
  .calibration-progress {
    margin-bottom: 16px;
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
  
  /* === 调整箭头样式 === */
  .adjustment-arrows {
    margin-top: 8px;
    display: flex;
    justify-content: center;
  }
  
  .arrow-container {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: rgba(255, 152, 0, 0.1);
    border: 1px solid rgba(255, 152, 0, 0.3);
  }
  
  .arrow-left, .arrow-right, .arrow-up, .arrow-down {
    animation: pulse-arrow 1.5s infinite;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .arrow-left svg, .arrow-right svg, .arrow-up svg, .arrow-down svg {
    width: 16px;
    height: 16px;
  }
  
  @keyframes pulse-arrow {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.8; transform: scale(1.1); }
  }
  
  /* === 调整建议样式 === */
  .adjustment-suggestion {
    margin-top: 6px;
    padding: 6px 8px;
    background: rgba(100, 181, 246, 0.1);
    border-radius: 4px;
    border-left: 3px solid #64b5f6;
  }
  
  .suggestion-label {
    font-size: 10px;
    color: #64b5f6;
    font-weight: 600;
    margin-right: 6px;
  }
  
  .suggestion-text {
    font-size: 10px;
    color: rgba(255, 255, 255, 0.9);
    font-weight: 500;
  }
  
  .adjustment-item.active .adjustment-suggestion {
    background: rgba(255, 152, 0, 0.1);
    border-left-color: #ff9800;
  }
  
  .adjustment-item.active .suggestion-label {
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
  
  /* === 结果显示 === */
  .result-display {
    padding: 16px;
  }
  
  .result-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    padding: 8px 12px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
  }
  
  .result-item.warning {
    background: rgba(255, 152, 0, 0.15);
    border: 1px solid rgba(255, 152, 0, 0.3);
  }
  
  .result-label {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.7);
    font-weight: 500;
  }
  
  .result-value {
    font-family: monospace;
    font-size: 13px;
    color: #ffffff;
    font-weight: bold;
  }
  
  .result-status {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 16px;
    padding: 12px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 6px;
  }
  
  .status-icon {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .status-icon.success {
    background: rgba(76, 175, 80, 0.2);
    color: #4caf50;
  }
  
  .status-icon.warning {
    background: rgba(255, 152, 0, 0.2);
    color: #ff9800;
  }
  
  .status-text {
    font-size: 14px;
    font-weight: 500;
    color: #ffffff;
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
    
    .status-card, .control-card {
      margin-bottom: 8px;
    }
    
    .adjustment-hints {
      top: 10px;
      left: 10px;
      right: 10px;
    }
    
    .hint-direction {
      padding: 8px;
    }
    
    .hint-label {
      font-size: 10px;
    }
    
    .hint-value {
      font-size: 12px;
    }
    
    .field-svg {
      max-width: 400px;
      max-height: 400px;
    }
    
    .control-buttons {
      flex-direction: row;
      gap: 6px;
    }
    
    .control-btn {
      padding: 8px 12px;
      font-size: 12px;
    }
    
    .control-btn span {
      display: none;
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
    
    .interface-title {
      font-size: 12px;
    }
    
    .connection-status {
      font-size: 9px;
    }
    
    .card-header {
      padding: 6px 8px;
    }
    
    .card-header span {
      font-size: 10px;
    }
    
    .card-content {
      padding: 8px;
    }
    
    .status-card, .control-card {
      margin-bottom: 6px;
    }
    
    .adjustment-hints {
      top: 5px;
      left: 5px;
      right: 5px;
    }
    
    .hint-direction {
      padding: 6px;
    }
    
    .hint-label {
      font-size: 8px;
    }
    
    .hint-value {
      font-size: 10px;
    }
    
    .field-svg {
      max-width: 300px;
      max-height: 300px;
    }
    
    .control-buttons {
      flex-direction: row;
      gap: 4px;
    }
    
    .control-btn {
      padding: 6px 8px;
      font-size: 10px;
    }
    
    .control-btn span {
      display: none;
    }
    
    .step-label {
      font-size: 8px;
    }
    
    .step-circle {
      width: 14px;
      height: 14px;
      font-size: 7px;
    }
    
    .log-stream {
      max-height: 60px;
    }
    
    .log-stream.expanded {
      max-height: 100px;
    }
    
    .log-entry {
      font-size: 9px;
    }
    
    .log-timestamp {
      min-width: 40px;
    }
  }
  
    /* 横屏优化 - 保持横屏布局 */
  @media screen and (orientation: landscape) {
    .main-layout {
      flex-direction: row !important;
    }

    .display-panel {
      flex: 1 !important;
      min-height: 300px !important;
    }

    .info-panel {
      flex: 0 0 350px !important;
      max-height: 100vh !important;
      overflow-y: auto !important;
    }
  }

  /* 小屏幕横屏优化 */
  @media screen and (max-width: 768px) and (orientation: landscape) {
    .main-layout {
      flex-direction: row !important;
      gap: 6px !important;
      padding: 6px !important;
    }

    .display-panel {
      flex: 1 !important;
      min-height: 200px !important;
      padding: 8px !important;
    }

        .info-panel {
      flex: 0 0 280px !important;
      min-height: 0 !important;
      max-height: 100vh !important;
      overflow-y: auto !important;
      padding: 8px !important;
      gap: 6px !important;
    }
    
    .card-content {
      padding: 8px !important;
      min-height: 0 !important;
    }

    .calibration-progress {
      margin-bottom: 8px !important;
    }

    .progress-bar {
      height: 4px !important;
    }

    .node-circle {
      width: 14px !important;
      height: 14px !important;
      font-size: 7px !important;
    }

    .position-section {
      margin-top: 6px !important;
      padding-top: 6px !important;
    }

    .position-grid {
      gap: 4px !important;
      padding: 6px !important;
    }

    .position-cell {
      padding: 4px !important;
    }

    .cell-label {
      font-size: 8px !important;
    }

    .cell-value {
      font-size: 9px !important;
    }

    .log-section {
      margin-top: 6px !important;
      padding-top: 6px !important;
    }

    .log-display {
      padding: 4px !important;
    }

    .latest-log {
      font-size: 8px !important;
      padding: 4px 6px !important;
    }

    .log-timestamp {
      min-width: 40px !important;
      font-size: 7px !important;
    }

    .adjustment-section {
      margin-top: 6px !important;
      padding-top: 6px !important;
    }

    .adjustment-item {
      padding: 4px !important;
    }

    .adjustment-icon {
      width: 16px !important;
      height: 16px !important;
    }

    .adjustment-type {
      font-size: 8px !important;
    }

    .adjustment-value {
      font-size: 8px !important;
    }

    .adjustment-action {
      font-size: 7px !important;
    }
    
    .adjustment-suggestion {
      margin-top: 4px !important;
      padding: 4px 6px !important;
    }
    
    .suggestion-label {
      font-size: 8px !important;
    }
    
    .suggestion-text {
      font-size: 8px !important;
    }

    .control-section {
      margin-top: 6px !important;
      padding-top: 6px !important;
    }

    .action-buttons {
      flex-direction: row !important;
      gap: 4px !important;
    }

    .action-btn {
      padding: 6px 8px !important;
      font-size: 8px !important;
      min-height: 28px !important;
      flex: 1 !important;
    }

    .action-btn span {
      display: none !important;
    }

    .panel-header {
      margin-bottom: 6px !important;
      padding-bottom: 6px !important;
    }

    .interface-title {
      font-size: 10px !important;
    }

    .connection-status {
      font-size: 8px !important;
    }

    .card-header {
      padding: 6px 8px !important;
    }

    .card-header span {
      font-size: 10px !important;
    }
  }

  /* 横屏移动设备优化 */
  @media screen and (max-height: 500px) and (orientation: landscape) {
    .polar-alignment-interface {
      font-size: 8px;
    }
    
    .main-layout {
      gap: 4px !important;
      padding: 4px !important;
    }
    
    .display-panel {
      padding: 6px !important;
    }
    
    .info-panel {
      flex: 0 0 250px !important;
      padding: 6px !important;
      gap: 4px !important;
      min-height: 0 !important;
    }
    
    .card-content {
      padding: 6px !important;
      min-height: 0 !important;
    }
    
    .calibration-progress {
      margin-bottom: 6px !important;
    }
    
    .progress-bar {
      height: 3px !important;
    }
    
    .node-circle {
      width: 12px !important;
      height: 12px !important;
      font-size: 6px !important;
    }
    
    .position-section {
      margin-top: 4px !important;
      padding-top: 4px !important;
    }
    
    .position-grid {
      gap: 3px !important;
      padding: 4px !important;
    }
    
    .position-cell {
      padding: 3px !important;
    }
    
    .cell-label {
      font-size: 7px !important;
    }
    
    .cell-value {
      font-size: 8px !important;
    }
    
    .log-section {
      margin-top: 4px !important;
      padding-top: 4px !important;
    }
    
    .log-display {
      padding: 3px !important;
    }
    
    .latest-log {
      font-size: 7px !important;
      padding: 3px 4px !important;
    }
    
    .log-timestamp {
      min-width: 35px !important;
      font-size: 6px !important;
    }
    
    .adjustment-section {
      margin-top: 4px !important;
      padding-top: 4px !important;
    }
    
    .adjustment-item {
      padding: 3px !important;
    }
    
    .adjustment-icon {
      width: 14px !important;
      height: 14px !important;
    }
    
    .adjustment-type {
      font-size: 7px !important;
    }
    
    .adjustment-value {
      font-size: 7px !important;
    }
    
    .adjustment-action {
      font-size: 6px !important;
    }
    
    .adjustment-suggestion {
      margin-top: 3px !important;
      padding: 3px 4px !important;
    }
    
    .suggestion-label {
      font-size: 6px !important;
    }
    
    .suggestion-text {
      font-size: 6px !important;
    }
    
    .control-section {
      margin-top: 4px !important;
      padding-top: 4px !important;
    }
    
    .action-buttons {
      gap: 3px !important;
    }
    
    .action-btn {
      padding: 4px 6px !important;
      font-size: 7px !important;
      min-height: 24px !important;
    }
    
    .panel-header {
      margin-bottom: 4px !important;
      padding-bottom: 4px !important;
    }
    
    .interface-title {
      font-size: 9px !important;
    }
    
    .connection-status {
      font-size: 7px !important;
    }
    
    .card-header {
      padding: 4px 6px !important;
    }
    
    .card-header span {
      font-size: 9px !important;
    }
  }
  
  /* 手机横屏优化 */
  @media screen and (max-width: 900px) and (orientation: landscape) and (max-height: 600px) {
    .polar-alignment-interface {
      font-size: 8px;
    }
    
    .main-layout {
      gap: 4px !important;
      padding: 4px !important;
    }
    
    .display-panel {
      padding: 6px !important;
    }
    
    .info-panel {
      flex: 0 0 260px !important;
      padding: 6px !important;
      gap: 4px !important;
      min-height: 0 !important;
      max-height: 100vh !important;
      overflow-y: auto !important;
    }
    
    .card-content {
      padding: 6px !important;
      min-height: 0 !important;
    }
    
    .calibration-progress {
      margin-bottom: 6px !important;
    }
    
    .progress-bar {
      height: 3px !important;
    }
    
    .node-circle {
      width: 12px !important;
      height: 12px !important;
      font-size: 6px !important;
    }
    
    .position-section {
      margin-top: 4px !important;
      padding-top: 4px !important;
    }
    
    .position-grid {
      gap: 3px !important;
      padding: 4px !important;
    }
    
    .position-cell {
      padding: 3px !important;
    }
    
    .cell-label {
      font-size: 7px !important;
    }
    
    .cell-value {
      font-size: 8px !important;
    }
    
    .log-section {
      margin-top: 4px !important;
      padding-top: 4px !important;
    }
    
    .log-display {
      padding: 3px !important;
    }
    
    .latest-log {
      font-size: 7px !important;
      padding: 3px 4px !important;
    }
    
    .log-timestamp {
      min-width: 35px !important;
      font-size: 6px !important;
    }
    
    .adjustment-section {
      margin-top: 4px !important;
      padding-top: 4px !important;
    }
    
    .adjustment-item {
      padding: 3px !important;
    }
    
    .adjustment-icon {
      width: 14px !important;
      height: 14px !important;
    }
    
    .adjustment-type {
      font-size: 7px !important;
    }
    
    .adjustment-value {
      font-size: 7px !important;
    }
    
    .adjustment-action {
      font-size: 6px !important;
    }
    
    .adjustment-suggestion {
      margin-top: 3px !important;
      padding: 3px 4px !important;
    }
    
    .suggestion-label {
      font-size: 6px !important;
    }
    
    .suggestion-text {
      font-size: 6px !important;
    }
    
    .control-section {
      margin-top: 4px !important;
      padding-top: 4px !important;
    }
    
    .action-buttons {
      gap: 3px !important;
    }
    
    .action-btn {
      padding: 4px 6px !important;
      font-size: 7px !important;
      min-height: 24px !important;
    }
    
    .panel-header {
      margin-bottom: 4px !important;
      padding-bottom: 4px !important;
    }
    
    .interface-title {
      font-size: 9px !important;
    }
    
    .connection-status {
      font-size: 7px !important;
    }
    
    .card-header {
      padding: 4px 6px !important;
    }
    
    .card-header span {
      font-size: 9px !important;
    }
  }

  /* 极小屏幕设备优化 */
  @media screen and (max-width: 320px) and (orientation: landscape) {
    .polar-alignment-interface {
      font-size: 7px;
    }
    
    .main-layout {
      gap: 3px !important;
      padding: 3px !important;
    }
    
    .display-panel {
      padding: 4px !important;
    }
    
    .info-panel {
      flex: 0 0 220px !important;
      padding: 4px !important;
      gap: 3px !important;
      min-height: 0 !important;
    }
    
    .card-content {
      padding: 4px !important;
      min-height: 0 !important;
    }
    
    .calibration-progress {
      margin-bottom: 4px !important;
    }
    
    .progress-bar {
      height: 2px !important;
    }
    
    .node-circle {
      width: 10px !important;
      height: 10px !important;
      font-size: 5px !important;
    }
    
    .position-section {
      margin-top: 3px !important;
      padding-top: 3px !important;
    }
    
    .position-grid {
      gap: 2px !important;
      padding: 3px !important;
    }
    
    .position-cell {
      padding: 2px !important;
    }
    
    .cell-label {
      font-size: 6px !important;
    }
    
    .cell-value {
      font-size: 7px !important;
    }
    
    .log-section {
      margin-top: 3px !important;
      padding-top: 3px !important;
    }
    
    .log-display {
      padding: 2px !important;
    }
    
    .latest-log {
      font-size: 6px !important;
      padding: 2px 3px !important;
    }
    
    .log-timestamp {
      min-width: 30px !important;
      font-size: 5px !important;
    }
    
    .adjustment-section {
      margin-top: 3px !important;
      padding-top: 3px !important;
    }
    
    .adjustment-item {
      padding: 2px !important;
    }
    
    .adjustment-icon {
      width: 12px !important;
      height: 12px !important;
    }
    
    .adjustment-type {
      font-size: 6px !important;
    }
    
    .adjustment-value {
      font-size: 6px !important;
    }
    
    .adjustment-action {
      font-size: 5px !important;
    }
    
    .adjustment-suggestion {
      margin-top: 2px !important;
      padding: 2px 3px !important;
    }
    
    .suggestion-label {
      font-size: 5px !important;
    }
    
    .suggestion-text {
      font-size: 5px !important;
    }
    
    .control-section {
      margin-top: 3px !important;
      padding-top: 3px !important;
    }
    
    .action-buttons {
      gap: 2px !important;
    }
    
    .action-btn {
      padding: 3px 4px !important;
      font-size: 6px !important;
      min-height: 20px !important;
    }
    
    .panel-header {
      margin-bottom: 3px !important;
      padding-bottom: 3px !important;
    }
    
    .interface-title {
      font-size: 8px !important;
    }
    
    .connection-status {
      font-size: 6px !important;
    }
    
    .card-header {
      padding: 3px 4px !important;
    }
    
    .card-header span {
      font-size: 8px !important;
    }
  }
  </style>