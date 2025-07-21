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
        errorMessage: ''
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
        handleProgressMessage(message) {
        const parts = message.split(':');
        if (parts.length >= 3) {
            const progressValue = parseInt(parts[1], 10);
            const progressMessage = parts[2];
            
            this.progress = progressValue;
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
        const parts = message.split(':');
        if (parts.length >= 3) {
            const successMessage = parts[2];
            
            this.progress = 100;
            this.updateComplete = true;
            this.currentTask = successMessage;
            this.addLogEntry(`${this.$t('update.completed')}: ${successMessage}`, 'success');
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
    z-index: 9999;
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
    z-index: 10000;
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