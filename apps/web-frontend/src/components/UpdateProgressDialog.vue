<template>
    <div class="update-overlay" v-if="visible" :class="{ 'update-complete': updateComplete }" @click="handleOverlayClick">
      <div class="update-dialog" @click.stop>
        <div class="update-header">
          <h2 v-if="!updateComplete && !updateFailed" class="warning-text">{{ $t('update.warning') }}</h2>
          <h2 v-else-if="updateComplete" class="success-text">{{ $t('update.complete') }}</h2>
          <h2 v-else class="error-text">{{ $t('update.failed') }}</h2>
        </div>
  
        <div class="progress-container">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: `${progress}%` }" 
                 :class="{ 'success': updateComplete, 'error': updateFailed }"></div>
          </div>
          <div class="progress-text">{{ progress }}%</div>
        </div>
  
        <div class="current-task">
          <span>{{ $t('update.currentTask') }}：</span>{{ currentTask }}
        </div>
  
        <div class="log-container">
          <div class="log-header">
            <span>{{ $t('update.updateLog') }}</span>
            <button class="toggle-log" @click="toggleLogExpand">
              {{ logExpanded ? $t('update.collapse') : $t('update.expand') }}
            </button>
          </div>
          <div class="log-content" :class="{ 'expanded': logExpanded }">
            <div class="log-scroll">
              <div v-for="(log, index) in logs" :key="index" 
                   :class="{ 'error-log': log.type === 'error', 
                            'success-log': log.type === 'success', 
                            'progress-log': log.type === 'progress' }">
                <span class="log-time">{{ log.time }}</span>
                <span class="log-message">{{ log.message }}</span>
              </div>
            </div>
          </div>
        </div>
  
        <div class="dialog-footer" v-if="updateComplete || updateFailed">
          <button class="close-button" @click="closeDialog">{{ $t('update.close') }}</button>
          <button class="retry-button" v-if="updateFailed" @click="retryUpdate">{{ $t('update.retry') }}</button>
        </div>
      </div>
    </div>
  </template>
  
  <script>
  export default {
    name: 'UpdateProgressDialog',
    props: {
      visible: {
        type: Boolean,
        default: false
      }
    },
    data() {
      return {
        progress: 0,
        currentTask: this.$t('update.preparing'),
        logs: [],
        logExpanded: false,
        updateComplete: false,
        updateFailed: false,
        errorMessage: '',
        // 顺序更新相关信息（用于多包依次更新的整体进度展示）
        sequenceTotalSteps: 0,
        sequenceCurrentStep: 0,
        sequenceCurrentVersion: '',
        sequenceFinished: false
      };
    },
    watch: {
    currentDriverType() {
      // 当语言改变时更新当前任务文本
      if (this.progress === 0) {
        this.currentTask = this.$t('update.preparing');
      }
    }
  },
    mounted() {
      this.$bus.$on('update_progress', this.handleProgressMessage);
      this.$bus.$on('update_error', this.handleErrorMessage);
      this.$bus.$on('update_success', this.handleSuccessMessage);
      // 多包顺序更新事件
      this.$bus.$on('update_sequence_start', this.handleSequenceStart);
      this.$bus.$on('update_sequence_step', this.handleSequenceStep);
      this.$bus.$on('update_sequence_finished', this.handleSequenceFinished);
      this.$bus.$on('update_sequence_failed', this.handleSequenceFailed);
      
      // 阻止页面滚动
      if (this.visible) {
        document.body.style.overflow = 'hidden';
      }
    },
    beforeDestroy() {
      // 恢复页面滚动
      document.body.style.overflow = '';
    },
    methods: {
        handleOverlayClick() {
          // 点击背景时不做任何操作，防止误关闭
          // 如果需要点击背景关闭，可以在这里添加逻辑
        },
        // 处理后端发来的进度信息：update_progress:<percent>:<message>
        // 适配当前协议：
        //  - percent 为“当前步骤内部”的阶段进度，而不是整体 0–100
        //  - 如果是多包顺序更新，结合 sequenceCurrentStep/sequenceTotalSteps 计算整体进度
        //  - 进度条只前进不后退，避免 UI 来回跳
        handleProgressMessage(message) {
          const parts = message.split(':');
          if (parts.length >= 3) {
            const stagePercent = parseInt(parts[1], 10);
            // 防止消息体里再含有 ':'，这里把 2 之后的再拼回去
            const progressMessage = parts.slice(2).join(':');

            let globalProgress = this.progress;

            if (
              this.sequenceTotalSteps > 0 &&
              this.sequenceCurrentStep > 0 &&
              !isNaN(stagePercent)
            ) {
              // 多包顺序更新：把单步 0–100 映射到整体 0–100
              const perStepSpan = 100 / this.sequenceTotalSteps;
              const completedSteps = this.sequenceCurrentStep - 1; // 已完成的步数
              const stepBase = completedSteps * perStepSpan;
              const stepProgress = Math.max(0, Math.min(1, stagePercent / 100));
              globalProgress = Math.floor(stepBase + stepProgress * perStepSpan);
            } else if (!isNaN(stagePercent)) {
              // 单包更新：直接使用当前阶段进度
              globalProgress = stagePercent;
            }

            // 只前进不后退，避免进度条抖动
            this.progress = Math.max(this.progress, globalProgress);

            this.currentTask = progressMessage;
            this.addLogEntry(progressMessage, 'progress');
          }
        },
      handleErrorMessage(message) {
        const parts = message.split(':');
        if (parts.length >= 3) {
            const errorMessage = parts[2];
            
            this.updateFailed = true;
            this.errorMessage = errorMessage;
            this.addLogEntry(`${this.$t('update.error')}: ${errorMessage}`, 'error');
        }
      },
      handleSuccessMessage(message) {
        // update_success:<percent>:<message>
        const parts = message.split(':');
        if (parts.length >= 3) {
          const successPercent = parseInt(parts[1], 10);
          const successMessage = parts.slice(2).join(':');

          let globalProgress = this.progress;

          if (this.sequenceTotalSteps > 0 && this.sequenceCurrentStep > 0) {
            // 当前步骤完成：整体进度推进到当前步骤结束
            const perStepSpan = 100 / this.sequenceTotalSteps;
            const completedSteps = this.sequenceCurrentStep;
            globalProgress = Math.floor(perStepSpan * completedSteps);
          } else if (!isNaN(successPercent)) {
            globalProgress = successPercent;
          }

          this.progress = Math.min(100, Math.max(this.progress, globalProgress));
          this.currentTask = successMessage;
          this.addLogEntry(`${this.$t('update.completed')}: ${successMessage}`, 'success');

          // 是否整体完成由 update_sequence_finished 控制；
          // 如果后端在单包模式下发送 100，则也视为整体完成。
          if (!isNaN(successPercent) && successPercent === 100) {
            this.updateComplete = true;
            this.updateFailed = false;
          }
        }
      },
      addLogEntry(message, type) {
        const now = new Date();
        const timeString = now.toLocaleTimeString();
        
        this.logs.push({
            time: timeString,
            message: message,
            type: type
        });
        
        // 如果日志数量太多，移除最早的条目
        if (this.logs.length > 100) {
            this.logs.shift();
        }
        
        // 自动滚动到最新的日志
        this.$nextTick(() => {
            const logScroll = this.$el.querySelector('.log-scroll');
            if (logScroll) {
            logScroll.scrollTop = logScroll.scrollHeight;
            }
        });
      },
      toggleLogExpand() {
        this.logExpanded = !this.logExpanded;
      },
      closeDialog() {
        // 恢复页面滚动
        document.body.style.overflow = '';
        this.$bus.$emit('closeUpdateDialog');
      },
      retryUpdate() {
        this.updateFailed = false;
        this.updateComplete = false;
        this.progress = 0;
        this.currentTask = this.$t('update.preparing');
        this.logs = [];
        // this.$emit('retry');
        this.$bus.$emit('reRunUpdate');
        },
      // 顺序更新事件处理：仅用于在日志和当前任务里展示多包整体进度
      handleSequenceStart(message) {
        const parts = message.split(':');
        if (parts.length >= 2) {
          const total = parseInt(parts[1], 10);
          this.sequenceTotalSteps = isNaN(total) ? 0 : total;
          this.sequenceCurrentStep = 0;
          this.sequenceCurrentVersion = '';
          this.sequenceFinished = false;

          // 开始顺序更新时，重置整体状态，并清空上一轮的错误与日志，
          // 避免旧的 “Error during extraction process / Failed to extract update package”
          // 一直残留在界面上，让用户误以为每一轮更新都报错。
          this.updateFailed = false;
          this.updateComplete = false;
          this.errorMessage = '';
          this.progress = 0;
          this.currentTask = this.$t('update.preparing');
          this.logs = [];

          this.addLogEntry(`Start sequential update: ${this.sequenceTotalSteps} steps`, 'progress');
        }
      },
      handleSequenceStep(message) {
        const parts = message.split(':');
        if (parts.length >= 4) {
          const current = parseInt(parts[1], 10);
          const total = parseInt(parts[2], 10);
          const version = parts[3];
          this.sequenceCurrentStep = isNaN(current) ? 0 : current;
          this.sequenceTotalSteps = isNaN(total) ? this.sequenceTotalSteps : total;
          this.sequenceCurrentVersion = version;
          this.addLogEntry(`Step ${this.sequenceCurrentStep}/${this.sequenceTotalSteps} - ${version}`, 'progress');
        }
      },
      handleSequenceFinished(message) {
        this.sequenceFinished = true;
        this.updateComplete = true;
        this.updateFailed = false;
        this.progress = 100;
        if (!this.currentTask || this.currentTask === this.$t('update.preparing')) {
          this.currentTask = this.$t('update.complete');
        }
        this.addLogEntry('Sequential update finished', 'success');
      },
      handleSequenceFailed(message) {
        const parts = message.split(':');
        let idx = '';
        if (parts.length >= 2) {
          idx = parts[1];
        }
        this.addLogEntry(`Sequential update failed at step ${idx}`, 'error');
      }
    }
  };
  </script>
  
  <style scoped>
  .update-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    overflow: hidden;
    /* 确保可以接收点击事件 */
    pointer-events: auto;
  }
  
  .update-dialog {
    background-color: #fff;
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
    width: 80%;
    max-width: 600px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    max-height: 80vh;
    /* 确保对话框可以接收点击事件 */
    pointer-events: auto;
    /* 防止选择 */
    user-select: none;
    /* 确保在最前面 */
    position: relative;
    z-index: 1000;
  }
  
  .update-header {
    margin-bottom: 20px;
    text-align: center;
  }
  
  .warning-text {
    color: #ff9800;
    font-weight: bold;
  }
  
  .success-text {
    color: #4caf50;
    font-weight: bold;
  }
  
  .error-text {
    color: #f44336;
    font-weight: bold;
  }
  
  .progress-container {
    display: flex;
    align-items: center;
    margin-bottom: 20px;
  }
  
  .progress-bar {
    flex-grow: 1;
    height: 20px;
    background-color: #e0e0e0;
    border-radius: 10px;
    overflow: hidden;
    margin-right: 10px;
  }
  
  .progress-fill {
    height: 100%;
    background-color: #2196f3;
    transition: width 0.3s ease;
  }
  
  .progress-fill.success {
    background-color: #4caf50;
  }
  
  .progress-fill.error {
    background-color: #f44336;
  }
  
  .progress-text {
    width: 40px;
    font-weight: bold;
    text-align: right;
  }
  
  .current-task {
    margin-bottom: 15px;
    font-size: 16px;
  }
  
  .current-task span {
    font-weight: bold;
  }
  
  .log-container {
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 20px;
  }
  
  .log-header {
    background-color: #f5f5f5;
    padding: 8px 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: bold;
  }
  
  .toggle-log {
    background: none;
    border: none;
    color: #2196f3;
    cursor: pointer;
    font-size: 14px;
    padding: 4px 8px;
    border-radius: 4px;
    transition: background-color 0.2s ease;
  }
  
  .toggle-log:hover {
    background-color: #e3f2fd;
  }
  
  .toggle-log:active {
    background-color: #bbdefb;
  }
  
  .log-content {
    max-height: 100px;
    transition: max-height 0.3s ease;
    overflow: hidden;
  }
  
  .log-content.expanded {
    max-height: 300px;
  }
  
  .log-scroll {
    overflow-y: auto;
    max-height: 300px;
    padding: 10px;
  }
  
  .log-scroll div {
    padding: 4px 0;
    border-bottom: 1px solid #f0f0f0;
    font-family: monospace;
  }
  
  .log-time {
    color: #757575;
    margin-right: 10px;
    font-size: 12px;
  }
  
  .error-log .log-message {
    color: #f44336;
  }
  
  .success-log .log-message {
    color: #4caf50;
  }
  
  .progress-log .log-message {
    color: #2196f3;
  }
  
  .dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
  }
  
  .close-button, .retry-button {
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
    transition: all 0.2s ease;
    min-width: 80px;
  }
  
  .close-button {
    background-color: #e0e0e0;
    color: #333;
  }
  
  .close-button:hover {
    background-color: #d0d0d0;
  }
  
  .close-button:active {
    background-color: #c0c0c0;
  }
  
  .retry-button {
    background-color: #2196f3;
    color: white;
  }
  
  .retry-button:hover {
    background-color: #1976d2;
  }
  
  .retry-button:active {
    background-color: #1565c0;
  }
  </style>