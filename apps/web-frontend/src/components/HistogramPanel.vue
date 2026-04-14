<template>
  <transition name="panel">
    <div
      class="chart-panel"
      :style="{ bottom: bottom + 'px', left: ComponentPadding + 'px', right: ComponentPadding + 'px', height: height + 'px' }"
      @click.stop
      @mousedown.stop
      @mouseup.stop
      @touchstart.stop
      @touchmove.stop
      @touchend.stop
      @wheel.stop
      data-testid="hp-panel"
    >
    <HistogramChart ref="histogramchart" class="histogram-chart" data-testid="hp-chart"/>
    <DialKnob class="dial-knob" data-testid="hp-dial-knob"/>
    <div class="buttons-container" data-testid="hp-buttons-container">
      <button
        @mousedown.stop.prevent="beginButtonPress('whiteBalance')"
        @mouseup.stop.prevent="endButtonPress('whiteBalance')"
        @mouseleave.stop.prevent="cancelButtonPress('whiteBalance')"
        @touchstart.stop.prevent="beginButtonPress('whiteBalance')"
        @touchend.stop.prevent="endButtonPress('whiteBalance')"
        @touchcancel.stop.prevent="cancelButtonPress('whiteBalance')"
        class="get-click btn-Reset btn-WhiteBalance"
        :class="{ 'active-white-balance': autoWhiteBalanceEnabled }"
        :title="autoWhiteBalanceEnabled ? '长按已启用持续进一步白平衡，短按可执行一次' : '短按执行一次进一步白平衡，长按切换持续模式'"
        :data-state="autoWhiteBalanceEnabled ? 'enabled' : 'disabled'"
        data-testid="hp-btn-white-balance"
      >
        <div style="display: flex; justify-content: center; align-items: center;">
          <img src="@/assets/images/svg/ui/WhiteBalance.svg" height="20px" style="min-height: 20px; pointer-events: none;" data-testid="hp-img-white-balance"></img>
        </div>
      </button>

      <button
        @mousedown.stop.prevent="beginButtonPress('autoHistogram')"
        @mouseup.stop.prevent="endButtonPress('autoHistogram')"
        @mouseleave.stop.prevent="cancelButtonPress('autoHistogram')"
        @touchstart.stop.prevent="beginButtonPress('autoHistogram')"
        @touchend.stop.prevent="endButtonPress('autoHistogram')"
        @touchcancel.stop.prevent="cancelButtonPress('autoHistogram')"
        class="get-click btn-Auto"
        :class="{ 'active-auto-histogram': autoHistogramEnabled }"
        :title="autoHistogramEnabled ? '长按已启用持续自动拉伸，短按可执行一次' : '短按执行一次自动拉伸，长按切换持续模式'"
        :data-state="autoHistogramEnabled ? 'enabled' : 'disabled'"
        data-testid="hp-btn-auto"
      ><v-icon data-testid="hp-icon-auto">mdi-alpha-a-circle-outline</v-icon></button>

      <button @click.stop.prevent="ResetHistogram" class="get-click btn-Reset" data-testid="hp-btn-reset">
        <div style="display: flex; justify-content: center; align-items: center;">
          <img src="@/assets/images/svg/ui/reset.svg" height="25px" style="min-height: 25px; pointer-events: none;" data-testid="hp-img-reset"></img>
        </div>
      </button>

      <!-- 切换：全图 / 有效区间（支持鼠标点击和触摸） -->
      <button @click.stop.prevent="toggleHistogramRangeMode" class="get-click btn-Range" :class="{ 'active-range': showEffectiveRange }" 
        data-testid="hp-btn-toggle-range" :data-state="showEffectiveRange ? 'range' : 'full'">
        <span v-if="showEffectiveRange" data-testid="hp-range-label-range">区</span>
        <span v-else data-testid="hp-range-label-full">全</span>
      </button>

    </div>

  </div>
</transition>
</template>

<script>
import HistogramChart from './Chart-Histogram.vue'
import DialKnob from './Dial-Knob.vue'

export default {
  name: 'HistogramPanel',
  data() {
    return {
      bottom: 10,
      ComponentPadding: 0,
      height: 90,

      histogram_min: 0,
      histogram_max: 65535,

      // true：只绘制有效区间；false：绘制全局直方图
      showEffectiveRange: true,
      autoWhiteBalanceEnabled: false,
      autoHistogramEnabled: false,
      longPressThresholdMs: 500,
      buttonPressState: {
        whiteBalance: { timer: null, longPressTriggered: false },
        autoHistogram: { timer: null, longPressTriggered: false },
      },
    };
  },
  components: {
    HistogramChart,
    DialKnob,
  },
  created() {
    this.$bus.$on('AutoHistogramNum', this.setAutoHistogramNum);
    this.$bus.$on('AutoWhiteBalanceState', this.setAutoWhiteBalanceState);
    this.$bus.$on('AutoHistogramState', this.setAutoHistogramState);
    this.$bus.$on('HistogramRangeMode', this.setHistogramRangeMode);
  },
  mounted() {
    this.updatePosition(); // 初始化位置
    window.addEventListener('resize', this.updatePosition);
    this.$bus.$emit('RequestAutoWhiteBalanceState');
    this.$bus.$emit('RequestAutoHistogramState');
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.updatePosition);
    this.cancelButtonPress('whiteBalance');
    this.cancelButtonPress('autoHistogram');
    this.$bus.$off('AutoHistogramNum', this.setAutoHistogramNum);
    this.$bus.$off('AutoWhiteBalanceState', this.setAutoWhiteBalanceState);
    this.$bus.$off('AutoHistogramState', this.setAutoHistogramState);
    this.$bus.$off('HistogramRangeMode', this.setHistogramRangeMode);
  },
  methods: {
    logMainCameraImagePipeLine(functionName, variableName, value) {
      let normalizedValue = value;
      if (typeof value === 'object' && value !== null) {
        try {
          normalizedValue = JSON.stringify(value);
        } catch (error) {
          normalizedValue = String(value);
        }
      }
      this.$bus.$emit('SendConsoleLogMsg', `MainCameraImagePipeLine | HistogramPanel.vue | ${functionName} | ${variableName} = ${normalizedValue}`, 'info');
    },
    updatePosition() {
      const screenWidth = window.innerWidth;
      const halfWidth = screenWidth / 2 - 250;
      this.ComponentPadding = Math.max(halfWidth, 170);

      // 计算宽度
      const newWidth = screenWidth - (this.ComponentPadding * 2);
      // console.log('Update new width:', newWidth);
      this.$bus.$emit('updateHistogramWidth', newWidth);
    },
    runAutoHistogramOnce() {
      console.log('[HistogramPanel] 触发前端自动拉伸');
      this.logMainCameraImagePipeLine('AutoHistogram', 'requestMinMax', '-1,-1(frontend-z0)');
      // 自动拉伸通常配合“区间模式”观察有效范围
      if (!this.showEffectiveRange) {
        this.showEffectiveRange = true;
        this.$bus.$emit('HistogramRangeMode', true);
      }
      this.$bus.$emit('autoHistogram');
    },
    ResetHistogram() {
      console.log('[HistogramPanel] 重置直方图到全范围 [0, 65535]');
      // 重置到全范围时，切换到“全图模式”以避免坐标轴仍停留在有效区间导致观感异常
      if (this.showEffectiveRange) {
        this.showEffectiveRange = false;
        this.$bus.$emit('HistogramRangeMode', false);
      }
      // 恢复原功能：将区间重置为 0 ~ 65535 全范围
      this.$bus.$emit('HandleHistogramNum', 0, 65535);
    },
    // 切换"全图 / 有效区间"显示模式
    toggleHistogramRangeMode() {
      this.showEffectiveRange = !this.showEffectiveRange;
      const modeText = this.showEffectiveRange ? '有效区间模式' : '全图模式';
      console.log(`[HistogramPanel] 切换直方图显示模式 -> ${modeText} (showEffectiveRange: ${this.showEffectiveRange})`);
      
      // 通知拨盘组件和直方图图表组件同步区间模式
      this.$bus.$emit('HistogramRangeMode', this.showEffectiveRange);
      
      // 提供用户反馈
      this.$bus.$emit('SendConsoleLogMsg', `直方图切换到${modeText}`, 'info');
    },
    setAutoHistogramNum(min, max) {
      this.histogram_min = min;
      this.histogram_max = max;
    },
    setAutoWhiteBalanceState(enabled) {
      this.autoWhiteBalanceEnabled = !!enabled;
    },
    setAutoHistogramState(enabled) {
      this.autoHistogramEnabled = !!enabled;
    },
    setHistogramRangeMode(enabled) {
      this.showEffectiveRange = !!enabled;
    },
    runWhiteBalanceOnce() {
      console.log('[HistogramPanel] 触发进一步白平衡计算');
      this.$bus.$emit('calcWhiteBalanceGains');
    },
    beginButtonPress(action) {
      const state = this.buttonPressState[action];
      if (!state) return;
      this.cancelButtonPress(action);
      state.longPressTriggered = false;
      state.timer = window.setTimeout(() => {
        state.longPressTriggered = true;
        if (action === 'whiteBalance') {
          this.$bus.$emit('toggleAutoWhiteBalance');
        } else if (action === 'autoHistogram') {
          this.$bus.$emit('toggleAutoHistogram');
        }
      }, this.longPressThresholdMs);
    },
    endButtonPress(action) {
      const state = this.buttonPressState[action];
      if (!state) return;
      const wasLongPress = !!state.longPressTriggered;
      this.cancelButtonPress(action);
      if (wasLongPress) return;
      if (action === 'whiteBalance') {
        this.runWhiteBalanceOnce();
      } else if (action === 'autoHistogram') {
        this.runAutoHistogramOnce();
      }
    },
    cancelButtonPress(action) {
      const state = this.buttonPressState[action];
      if (!state) return;
      if (state.timer) {
        clearTimeout(state.timer);
        state.timer = null;
      }
      state.longPressTriggered = false;
    },
  }
}
</script>

<style scoped>
.chart-panel {
  position: absolute;
  background-color: rgba(128, 128, 128, 0.5);
  backdrop-filter: blur(5px);
  border-radius: 10px; 
  transition: width 0.2s ease;
}

@keyframes showPanelAnimation {
  from {
    bottom: -150px;
  }
  to {
    bottom: 10px;
  }
}

@keyframes hidePanelAnimation {
  from {
    bottom: 10px;
  }
  to {
    bottom: -150px;
  }
}

.panel-enter-active {
  animation: showPanelAnimation 0.15s forwards;
}

.panel-leave-active {
  animation: hidePanelAnimation 0.15s forwards;
}

.histogram-chart {
  position:absolute;
  top: 5px;
  left: 5px;
}

.dial-knob {
  position:absolute;
  top: 5px;
  left: 5px;
}

.buttons-container {
  display: flex;
  justify-content: space-between;
  position: absolute;
  top: -35px;
  left: 25%;
  right: 25%;
}

.btn-Auto {
  width: 30px;
  height: 30px;

  user-select: none;
  background-color: rgba(64, 64, 64, 0.5);
  backdrop-filter: blur(5px);
  border: none;
  border-radius: 50%; 
  box-sizing: border-box;
}

.btn-Range {
  width: 30px;
  height: 30px;

  user-select: none;
  background-color: rgba(64, 64, 64, 0.5);
  backdrop-filter: blur(5px);
  border: none;
  border-radius: 50%;
  box-sizing: border-box;
  color: white;
  font-size: 14px;
  transition: all 0.2s ease;
}

.btn-Range.active-range {
  background-color: rgba(75, 155, 250, 0.7);
  box-shadow: 0 0 8px rgba(75, 155, 250, 0.5);
}

.btn-Reset {
  width: 30px;
  height: 30px;

  user-select: none;
  background-color: rgba(64, 64, 64, 0.5);
  backdrop-filter: blur(5px);
  border: none;
  border-radius: 50%; 
  box-sizing: border-box;
}

.btn-WhiteBalance {
  width: 30px;
  height: 30px;

  user-select: none;
  background-color: rgba(64, 64, 64, 0.5);
  backdrop-filter: blur(5px);
  border: none;
  border-radius: 50%; 
  box-sizing: border-box;
  transition: all 0.2s ease;
}

.btn-WhiteBalance.active-white-balance {
  background-color: rgba(76, 175, 80, 0.78);
  box-shadow: 0 0 10px rgba(76, 175, 80, 0.45);
}

.btn-Auto.active-auto-histogram {
  background-color: rgba(255, 152, 0, 0.82);
  box-shadow: 0 0 10px rgba(255, 152, 0, 0.45);
}

.btn-Auto:active,
.btn-Reset:active,
.btn-WhiteBalance:active {
  transform: scale(0.95); /* 点击时缩小按钮 */
  background-color: rgba(255, 255, 255, 0.7);
}

</style>
