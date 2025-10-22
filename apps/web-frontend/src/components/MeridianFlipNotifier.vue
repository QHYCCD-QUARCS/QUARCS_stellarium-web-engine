<template>
  <div v-if="isMountConnected">
    <!-- 顶部横幅提示：小于5分钟时一次性提示，可关闭，10秒自动关闭 -->
    <transition name="mf-slide-down">
      <div v-if="bannerVisible" class="mf-banner" :style="{ zIndex: String(zIndexBaseComputed) }" role="alert" aria-live="polite">
        <div class="mf-banner__content">
          <div class="mf-banner__text">{{ $t('MeridianFlipNotifier.banner.text', { time: mmss }) }}</div>
          <div class="mf-banner__actions">
            <button class="mf-btn" :class="btnClass('auto')" @click="selectMode('auto')">{{ $t('MeridianFlipNotifier.actions.autoAtTime') }}</button>
            <button class="mf-btn" :class="btnClass('manual')" @click="selectMode('manual')">{{ $t('MeridianFlipNotifier.actions.manual') }}</button>
            <button v-if="isManualSelected" class="mf-btn mf-btn--immediate" :disabled="!isNegative" @click="triggerFlipNow">{{ $t('MeridianFlipNotifier.actions.flipNow') }}</button>
          </div>
          <button class="mf-banner__close" :aria-label="$t('Common.close')" @click="closeBanner">×</button>
        </div>
      </div>
    </transition>

    <!-- 居中弹窗：小于1分钟且未选择时再次提示，关闭后显示左上角挂件 -->
    <transition name="mf-fade">
      <div v-if="centerVisible" class="mf-modal" :style="{ zIndex: String(zIndexBaseComputed + 1) }">
        <div class="mf-modal__backdrop" @click="closeCenter"></div>
        <div class="mf-modal__dialog" role="dialog" aria-modal="true" :aria-label="$t('MeridianFlipNotifier.modal.title')">
          <div class="mf-modal__title">{{ $t('MeridianFlipNotifier.modal.title') }}</div>
          <div class="mf-modal__body">{{ $t('MeridianFlipNotifier.modal.body', { time: mmss }) }}</div>
          <div class="mf-modal__actions">
            <button class="mf-btn" :class="btnClass('auto')" @click="selectMode('auto')">{{ $t('MeridianFlipNotifier.actions.autoAtTime') }}</button>
            <button class="mf-btn" :class="btnClass('manual')" @click="selectMode('manual')">{{ $t('MeridianFlipNotifier.actions.manual') }}</button>
            <button v-if="isManualSelected" class="mf-btn mf-btn--immediate" :disabled="!isNegative" @click="triggerFlipNow">{{ $t('MeridianFlipNotifier.actions.flipNow') }}</button>
            <button class="mf-btn mf-btn--ghost" @click="closeCenter">{{ $t('Common.close') }}</button>
          </div>
        </div>
      </div>
    </transition>

    <!-- 左上角挂件：居中弹窗关闭或做出选择后显示，红色倒计时，位于菜单栏下方 -->
    <transition name="mf-fade">
      <div
        v-if="miniVisible"
        class="mf-mini"
        :style="{ top: topOffsetPxComputed + 'px', zIndex: String(zIndexBaseComputed) }"
        role="status"
        aria-live="polite"
      >
        <!-- 常规倒计时显示 -->
        <template v-if="flipUiState === 'idle'">
          <div class="mf-mini__line">
            <span class="mf-mini__label">{{ $t('MeridianFlipNotifier.mini.title') }}</span>
            <span class="mf-mini__time">{{ mmss }}</span>
          </div>
          <div class="mf-mini__line mf-mini__line--controls">
            <button class="mf-link" :class="{ 'mf-link--active': autoIsActive }" @click="selectMode('auto')">{{ $t('MeridianFlipNotifier.mini.auto') }}</button>
            <span class="mf-sep">/</span>
            <button class="mf-link" :class="{ 'mf-link--active': manualIsActive }" @click="selectMode('manual')">{{ $t('MeridianFlipNotifier.mini.manual') }}</button>
            <button v-if="isManualSelected" class="mf-btn mf-btn--immediate" :disabled="!isNegative" @click="triggerFlipNow">{{ $t('MeridianFlipNotifier.actions.flipNow') }}</button>
            <button class="mf-mini__close" :aria-label="$t('Common.close')" @click="closeMini">×</button>
          </div>
        </template>

        <!-- 预备翻转倒计时 -->
        <template v-else-if="flipUiState === 'prepare'">
          <div class="mf-mini__line">
            <span class="mf-mini__label">{{ $t('MeridianFlipNotifier.mini.title') }}</span>
            <span class="mf-mini__time">{{ prepareMmss }}</span>
          </div>
          <div class="mf-mini__line mf-mini__line--controls">
            <button class="mf-link" :class="{ 'mf-link--active': autoIsActive }" @click="selectMode('auto')">{{ $t('MeridianFlipNotifier.mini.auto') }}</button>
            <span class="mf-sep">/</span>
            <button class="mf-link" :class="{ 'mf-link--active': manualIsActive }" @click="selectMode('manual')">{{ $t('MeridianFlipNotifier.mini.manual') }}</button>
            <button class="mf-mini__close" :aria-label="$t('Common.close')" @click="closeMini">×</button>
          </div>
        </template>

        <!-- 正式翻转：仅显示中止与不确定进度条 -->
        <template v-else-if="flipUiState === 'flipping'">
          <div class="mf-mini__line">
            <span class="mf-mini__label">{{ $t('MeridianFlipNotifier.mini.title') }}</span>
            <span class="mf-mini__time">{{ $t('MeridianFlipNotifier.mini.inProgress') }}</span>
          </div>
          <div class="mf-mini__line mf-mini__line--controls">
            <button class="mf-btn mf-btn--immediate" @click="abortFlip">{{ $t('Common.abort') }}</button>
            <div class="mf-progress--indeterminate" aria-label="progress" />
          </div>
        </template>

        <!-- 结果：成功或失败提示，10 秒后恢复 -->
        <template v-else-if="flipUiState === 'result'">
          <div class="mf-mini__line">
            <span class="mf-mini__label">{{ $t('MeridianFlipNotifier.mini.title') }}</span>
            <span class="mf-mini__time" :style="{ color: resultKind==='success' ? '#22c55e' : '#ef4444' }">
              {{ resultKind==='success' ? $t('MeridianFlipNotifier.result.success') : $t('MeridianFlipNotifier.result.fail') }}
            </span>
          </div>
        </template>
      </div>
    </transition>
  </div>
  
</template>

<script>
export default {
  name: 'MeridianFlipNotifier',
  props: {
    remainingSeconds: {
      type: Number,
      required: true
    },
    defaultMode: {
      type: String,
      default: 'auto'
    },
    isMountMoving: {
      type: Boolean,
      default: false
    },
    isMountConnected: {
      type: Boolean,
      default: false
    },
    menuOffsetPx: {
      type: Number,
      default: 56
    },
    zIndexBase: {
      type: Number,
      default: 3000
    },
    autoCloseMs: {
      type: Number,
      default: 10000
    }
  },
  data() {
    return {
      mode: null, // 'auto' | 'manual' | null
      bannerVisible: false,
      centerVisible: false,
      miniVisible: false,
      fiveMinCycleTriggered: false,
      oneMinCycleTriggered: false,
      bannerTimer: null,
      autoOneMinSent: false,
      negativeOnceSent: false,
      // 翻转 UI 状态机
      flipUiState: 'idle', // 'idle' | 'prepare' | 'flipping' | 'result'
      prepareBaseSeconds: 0,
      prepareStartMs: 0,
      prepareTicker: null,
      resultKind: null, // 'success' | 'fail' | null
      resultTimerId: null
    };
  },
  created() {
    // 监听全局信号：允许外部随时切换模式
    if (this.$bus && this.$bus.$on) {
      this.$bus.$on('SetFlipMode', this.setFlipMode);
      this.$bus.$on('FlipStatus', this.setFlipStatus);
    }
    this.$bus.$emit('getMountAutoFlip'); // 要求与主程序同步
  },
  computed: {
    mmss() {
      const s = Math.max(0, Math.floor(this.remainingSeconds || 0));
      const m = Math.floor(s / 60);
      const r = s % 60;
      const mm = String(m).padStart(2, '0');
      const ss = String(r).padStart(2, '0');
      return `${mm}:${ss}`;
    },
    prepareMmss() {
      const now = Date.now();
      const elapsed = Math.floor((now - (this.prepareStartMs || now)) / 1000);
      const left = Math.max(0, (this.prepareBaseSeconds || 0) - elapsed);
      const m = Math.floor(left / 60);
      const r = left % 60;
      const mm = String(m).padStart(2, '0');
      const ss = String(r).padStart(2, '0');
      return `${mm}:${ss}`;
    },
    isNegative() {
      return (this.remainingSeconds || 0) < 0;
    },
    resolvedDefaultMode() {
      return this.defaultMode === 'auto' || this.defaultMode === 'manual' ? this.defaultMode : null;
    },
    autoIsActive() {
      if (this.mode === 'auto') return true;
      if (this.mode === null && this.resolvedDefaultMode === 'auto') return true;
      return false;
    },
    manualIsActive() {
      if (this.mode === 'manual') return true;
      if (this.mode === null && this.resolvedDefaultMode === 'manual') return true;
      return false;
    },
    isManualSelected() {
      return this.mode === 'manual';
    },
    topOffsetPxComputed() {
      return this.menuOffsetPx;
    },
    zIndexBaseComputed() {
      return this.zIndexBase;
    }
  },
  watch: {
    remainingSeconds: {
      immediate: true,
      handler(sec) {
        // 赤道仪未连接：不显示任何提示，也不发送事件
        if (!this.isMountConnected) {
          this.bannerVisible = false;
          this.centerVisible = false;
          this.miniVisible = false;
          this.clearBannerTimer();
          return;
        }
        // 赤道仪移动中：不弹出任何横幅/弹窗
        if (this.isMountMoving) {
          this.bannerVisible = false;
          this.centerVisible = false;
          this.clearBannerTimer();
          // 小窗是否显示由其它条件控制，这里不强制隐藏
          return;
        }
        if (sec <= 0) {
          this.bannerVisible = false;
          this.centerVisible = false;
          // 保持小窗口状态，以便在负数倒计时时可操作“立即翻转”
          this.clearBannerTimer();
          // 小于0后：在自动模式下仅发送一次
          if (this.autoIsActive && !this.negativeOnceSent) {
            // 到点：在自动模式下仅触发一次，让后端开始自动翻转
            if (this.$bus && this.$bus.$emit) {
              this.$bus.$emit('AppSendMessage', 'Vue_Command', 'AutoFlip:true');
            }
            this.negativeOnceSent = true;
          }
          // 规则：小于1min或为负数时，小窗口强制显示
          this.miniVisible = true;
          return;
        }

        // 5 分钟阈值：首次跌破时提示，回升到>=5分钟后重置
        if (sec < 300 && !this.fiveMinCycleTriggered && this.mode === null) {
          this.fiveMinCycleTriggered = true;
          this.showBannerOnce();
        } else if (sec >= 300) {
          this.fiveMinCycleTriggered = false;
          this.closeBanner();
        }

        // 1 分钟阈值：仅在未选择时提示
        if (sec < 60 && !this.oneMinCycleTriggered && this.mode === null) {
          this.oneMinCycleTriggered = true;
          this.centerVisible = true;
          this.bannerVisible = false; // 避免同时出现
          this.clearBannerTimer();
          // 若默认选择为自动：小于 1 分钟时向后端发送一次预触发
          if (this.resolvedDefaultMode === 'auto' && !this.autoOneMinSent) {
            if (this.$bus && this.$bus.$emit) {
              this.$bus.$emit('AppSendMessage', 'Vue_Command', 'AutoFlip:true');
            }
            this.autoOneMinSent = true;
          }
        } else if (sec >= 60) {
          this.oneMinCycleTriggered = false;
          // 回到 >=60s：允许下一次周期再次发送 1 分钟事件；复位负数事件
          this.autoOneMinSent = false;
          this.negativeOnceSent = false;
        }

        // 规则：当时间小于1min时，小窗口强制显示；当时间大于等于5min时不显示
        if (sec < 60) {
          this.miniVisible = true;
        } else if (sec >= 300 && !this.isMountMoving) {
          this.miniVisible = false;
        }

        // 超过5分钟自动关闭小窗（除非赤道仪正在移动）
        if (sec >= 300 && !this.isMountMoving) {
          this.miniVisible = false;
        }
      }
    }
    ,
    isMountMoving(next) {
      if (next) {
        // 移动开始，立即关闭横幅与中心弹窗
        this.bannerVisible = false;
        this.centerVisible = false;
        this.clearBannerTimer();
      }
    },
    isMountConnected(next) {
      if (!next) {
        // 断开连接：关闭所有可视元素并清理状态
        this.bannerVisible = false;
        this.centerVisible = false;
        this.miniVisible = false;
        this.clearBannerTimer();
        this.fiveMinCycleTriggered = false;
        this.oneMinCycleTriggered = false;
        this.autoOneMinSent = false;
        this.negativeOnceSent = false;
        // 重置翻转状态
        this.clearPrepareTicker();
        this.clearResultTimer();
        this.flipUiState = 'idle';
        this.resultKind = null;
      }
    }
  },
  methods: {
    setFlipStatus(payload) {
      if (!payload || typeof payload !== 'string') return;
      if (payload.startsWith('FlipPrepareTime,')) {
        const parts = payload.split(',');
        const sec = parseInt(parts[1], 10) || 0;
        this.flipUiState = 'prepare';
        this.prepareBaseSeconds = sec;
        this.prepareStartMs = Date.now();
        this.startPrepareTicker();
        // 展示小挂件
        this.miniVisible = true;
        this.bannerVisible = false;
        this.centerVisible = false;
        return;
      }
      if (payload === 'start') {
        this.flipUiState = 'flipping';
        this.clearPrepareTicker();
        // 隐藏横幅/居中，只保留左上角挂件
        this.bannerVisible = false;
        this.centerVisible = false;
        this.miniVisible = true;
        return;
      }
      if (payload === 'success' || payload === 'fail') {
        this.flipUiState = 'result';
        this.resultKind = payload;
        this.clearPrepareTicker();
        this.clearResultTimer();
        // 10 秒后恢复常规倒计时显示
        this.resultTimerId = setTimeout(() => {
          this.flipUiState = 'idle';
          this.resultKind = null;
        }, 10000);
        this.miniVisible = true;
        return;
      }
    },
    startPrepareTicker() {
      if (this.prepareTicker != null) return;
      this.prepareTicker = setInterval(() => {
        if (this.flipUiState !== 'prepare') {
          this.clearPrepareTicker();
        }
      }, 1000);
    },
    clearPrepareTicker() {
      if (this.prepareTicker != null) {
        clearInterval(this.prepareTicker);
        this.prepareTicker = null;
      }
    },
    clearResultTimer() {
      if (this.resultTimerId != null) {
        clearTimeout(this.resultTimerId);
        this.resultTimerId = null;
      }
    },
    abortFlip() {
      if (this.$bus && this.$bus.$emit) {
        this.$bus.$emit('SendConsoleLogMsg', 'Abort Flip requested', 'warning');
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'MountMoveAbort');
        this.flipUiState = 'idle';
      }
    },
    setFlipMode(next) {
      if (next !== 'auto' && next !== 'manual') return;
      this.mode = next;
      if (next === 'auto') this.onAutoFlipSelected();
      else this.onManualFlipSelected();
    },
    onAutoFlipSelected() {
      // 记录日志并通知后端启用自动翻转
      if (this.$bus && this.$bus.$emit) {
        this.$bus.$emit('SendConsoleLogMsg', 'Auto Flip selected', 'info');
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'AutoFlip:true');
        // 选择自动后，立即触发一次启动请求（由后端状态机去重）
        // this.$bus.$emit('AppSendMessage', 'Vue_Command', 'startAutoFlip');
      }
    },
    onManualFlipSelected() {
      // 记录日志并通知后端关闭自动翻转
      if (this.$bus && this.$bus.$emit) {
        this.$bus.$emit('SendConsoleLogMsg', 'Manual Flip selected', 'info');
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'AutoFlip:false');
      }
    },
    btnClass(kind) {
      const active = kind === 'auto' ? this.autoIsActive : this.manualIsActive;
      return active ? 'mf-btn--success' : 'mf-btn--ghost';
    },
    clearBannerTimer() {
      if (this.bannerTimer != null) {
        clearTimeout(this.bannerTimer);
        this.bannerTimer = null;
      }
    },
    showBannerOnce() {
      this.bannerVisible = true;
      this.clearBannerTimer();
      const autoClose = this.autoCloseMs;
      this.bannerTimer = setTimeout(() => {
        this.bannerVisible = false;
        this.bannerTimer = null;
      }, autoClose);
    },
    closeBanner() {
      this.bannerVisible = false;
      this.clearBannerTimer();
    },
    closeCenter() {
      this.centerVisible = false;
      this.miniVisible = true; // 关闭后显示左上角挂件
    },
    closeMini() {
      if (this.isNegative) {
        // 负数倒计时：不允许关闭，保持显示
        this.miniVisible = true;
        return;
      }
      this.miniVisible = false;
    },
    triggerFlipNow() {
      if (!this.isNegative) return;
      this.$emit('flip-now');
    },
    selectMode(next) {
      this.mode = next; // 'auto' | 'manual'
      this.$emit('mode-change', next);
      if (next === 'auto') {
        this.onAutoFlipSelected();
        this.$emit('auto-flip-selected');
      }
      if (next === 'manual') {
        this.onManualFlipSelected();
        this.$emit('manual-flip-selected');
      }
      // 选择后：关闭横幅和中心弹窗，显示左上角挂件
      this.bannerVisible = false;
      this.centerVisible = false;
      this.miniVisible = true;
      this.clearBannerTimer();
    }
  },
  beforeDestroy() {
    this.clearBannerTimer();
    if (this.$bus && this.$bus.$off) {
      this.$bus.$off('SetFlipMode', this.setFlipMode);
      this.$bus.$off('FlipStatus', this.setFlipStatus);
    }
  }
};
</script>

<style scoped>
/* 顶部横幅 */
.mf-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: rgba(33, 33, 33, 0.96);
  color: #fff;
  box-shadow: 0 2px 12px rgba(0,0,0,0.3);
}
.mf-banner__content {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
}
.mf-banner__text {
  font-size: 14px;
  flex: 1;
}
.mf-banner__actions {
  display: flex;
  gap: 8px;
}
.mf-banner__close {
  background: transparent;
  color: #bbb;
  border: none;
  font-size: 18px;
  cursor: pointer;
}
.mf-banner__close:hover { color: #fff; }

/* 按钮 */
.mf-btn {
  padding: 6px 12px;
  border-radius: 4px;
  border: 1px solid transparent;
  font-size: 13px;
  cursor: pointer;
}
.mf-btn--primary {
  background: #1677ff;
  border-color: #1677ff;
  color: #fff;
}
.mf-btn--success {
  background: #22c55e;
  border-color: #22c55e;
  color: #fff;
}
.mf-btn--ghost {
  background: transparent;
  border-color: #666;
  color: #ddd;
}
.mf-btn--warn {
  background: #f59e0b;
  border-color: #f59e0b;
  color: #1a1a1a;
}
.mf-btn--immediate {
  background: #4b5563; /* 灰色 */
  border-color: #4b5563;
  color: #e5e7eb;
}
/* 不确定进度条 */
.mf-progress--indeterminate {
  position: relative;
  height: 4px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 2px;
  overflow: hidden;
  min-width: 120px;
}
.mf-progress--indeterminate::before {
  content: "";
  position: absolute;
  left: -40%;
  width: 40%;
  height: 100%;
  background: #60a5fa;
  animation: mf-indeterminate 1.2s infinite ease;
}
@keyframes mf-indeterminate {
  0% { left: -40%; width: 40%; }
  50% { left: 20%; width: 60%; }
  100% { left: 100%; width: 40%; }
}
.mf-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 居中弹窗 */
.mf-modal {
  position: fixed;
  inset: 0;
}
.mf-modal__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.5);
}
.mf-modal__dialog {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 360px;
  max-width: calc(100vw - 32px);
  transform: translate(-50%, -50%);
  background: #1f1f1f;
  color: #f0f0f0;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.35);
  padding: 16px;
}
.mf-modal__title {
  font-weight: 600;
  margin-bottom: 8px;
}
.mf-modal__body {
  margin-bottom: 14px;
  color: #e5e5e5;
}
.mf-modal__actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  flex-wrap: wrap;
}

/* 左上角挂件（红色倒计时） */
.mf-mini {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(30, 30, 30, 0.92);
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 8px;
  padding: 8px 10px;
  min-width: 220px;
  color: #ddd;
}
.mf-mini__line {
  display: flex;
  align-items: center;
  gap: 8px;
}
.mf-mini__line + .mf-mini__line {
  margin-top: 6px;
}
.mf-mini__label {
  font-size: 12px;
  color: #bbb;
}
.mf-mini__time {
  margin-left: auto;
  font-weight: 700;
  color: #ef4444; /* 红色提示 */
}
.mf-link {
  background: none;
  border: none;
  color: #60a5fa;
  cursor: pointer;
  font-size: 12px;
  padding: 0;
}
.mf-link:hover { text-decoration: underline; }
.mf-link--active {
  color: #22c55e; /* 选中高亮（与成功色一致） */
  font-weight: 700;
}
.mf-sep { color: #666; font-size: 12px; }
.mf-mode { font-size: 12px; color: #bbb; }
.mf-mini__close {
  margin-left: auto;
  background: transparent;
  border: none;
  color: #888;
  cursor: pointer;
  font-size: 16px;
}

/* 动效 */
.mf-slide-down-enter-active,
.mf-slide-down-leave-active {
  transition: transform .18s ease, opacity .18s ease;
}
.mf-slide-down-enter-from,
.mf-slide-down-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}
.mf-fade-enter-active,
.mf-fade-leave-active {
  transition: opacity .18s ease;
}
.mf-fade-enter-from,
.mf-fade-leave-to {
  opacity: 0;
}
</style>


