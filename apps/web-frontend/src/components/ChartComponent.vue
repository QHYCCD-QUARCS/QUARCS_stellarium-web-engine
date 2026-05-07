<template>
<transition name="panel">
  <div
    class="chart-panel"
    :style="{ bottom: bottom + 'px', left: ComponentPadding + 'px', right: ComponentPadding + 'px', height: height + 'px' }"
    data-testid="ui-chart-component-root"
    :data-exp-time-ms="String(ExpTime)"
    :data-loop-exp-state="isLoopping ? 'on' : 'off'"
    :data-guiding="isGuiding ? 'true' : 'false'"
    :data-guider-status="CurrentGuiderStatus"
  >
    <div
      v-if="showGuiderProgressCard"
      class="guider-progress-card"
      data-testid="ui-guider-progress-card"
      :data-phase="guiderPhaseLabel"
    >
      <div class="guider-progress-card__header">
        <span class="guider-progress-card__phase">{{ guiderPhaseLabel }}</span>
        <span v-if="guiderLastPulse" class="guider-progress-card__pulse">{{ guiderLastPulse }}</span>
      </div>
      <div class="guider-progress-card__summary">
        {{ guiderProgressSummary || 'Waiting for guider telemetry...' }}
      </div>
      <div
        v-if="showCalibrationGraph"
        class="guider-progress-card__graph"
        data-testid="ui-guider-calibration-graph"
      >
        <svg viewBox="0 0 120 120" class="guider-progress-card__graph-svg" aria-label="Guider calibration trace">
          <line x1="60" y1="8" x2="60" y2="112" class="guider-progress-card__axis" />
          <line x1="8" y1="60" x2="112" y2="60" class="guider-progress-card__axis" />
          <line
            v-if="calibrationGraph.raLine"
            :x1="calibrationGraph.raLine.x1"
            :y1="calibrationGraph.raLine.y1"
            :x2="calibrationGraph.raLine.x2"
            :y2="calibrationGraph.raLine.y2"
            class="guider-progress-card__line guider-progress-card__line--ra"
          />
          <line
            v-if="calibrationGraph.decLine"
            :x1="calibrationGraph.decLine.x1"
            :y1="calibrationGraph.decLine.y1"
            :x2="calibrationGraph.decLine.x2"
            :y2="calibrationGraph.decLine.y2"
            class="guider-progress-card__line guider-progress-card__line--dec"
          />
          <circle
            v-for="point in calibrationGraph.raPoints"
            :key="point.id"
            :cx="point.x"
            :cy="point.y"
            r="2.6"
            class="guider-progress-card__point guider-progress-card__point--ra"
          />
          <circle
            v-for="point in calibrationGraph.decPoints"
            :key="point.id"
            :cx="point.x"
            :cy="point.y"
            r="2.6"
            class="guider-progress-card__point guider-progress-card__point--dec"
          />
        </svg>
        <div class="guider-progress-card__graph-legend">
          <span class="guider-progress-card__graph-legend-item guider-progress-card__graph-legend-item--ra">RA</span>
          <span class="guider-progress-card__graph-legend-item guider-progress-card__graph-legend-item--dec">DEC</span>
        </div>
      </div>
      <div v-if="guiderLastCalibration" class="guider-progress-card__calibration">
        {{ guiderLastCalibration }}
      </div>
      <div v-if="guiderProgressMessages.length" class="guider-progress-card__messages">
        <div
          v-for="item in guiderProgressMessages"
          :key="item.id"
          class="guider-progress-card__message"
          :class="'guider-progress-card__message--' + item.type"
        >
          {{ item.text }}
        </div>
      </div>
    </div>

    <LineChart ref="linechart" class="line-chart"/>
    
    <ScatterChart ref="scatterchart" class="scatter-chart"/>

    <div class="buttons-container">

      <button
        :class="LoopExpSwitchBtnClass"
        :style="{ animationDuration: ExpTime + 'ms' }"
        @click="LoopExpSwitch"
        @touchend.stop.prevent="LoopExpSwitch"
        @touchcancel.stop.prevent
        data-testid="ui-chart-component-btn-loop-exp-switch"
        :data-state="isLoopping ? 'on' : 'off'"
        :aria-pressed="isLoopping ? 'true' : 'false'"
      >
        <div style="display: flex; justify-content: center; align-items: center;">
          <img src="@/assets/images/svg/ui/GuiderLoopExp.svg" height="20px" style="min-height: 20px; pointer-events: none;"></img>
        </div>
      </button>

      <button class="btn-Style" :class="GuiderSwitchBtnClass"
        @mousedown="startPress" @mouseup="endPress" @mouseleave="cancelPress"
        @touchstart.stop.prevent="startPress" @touchend.stop.prevent="endPress"
        @touchcancel.stop.prevent="cancelPress"
        data-testid="ui-chart-component-btn-start-press"
        :data-guiding="isGuiding ? 'true' : 'false'"
        :data-status="CurrentGuiderStatus"
        :aria-pressed="isGuiding ? 'true' : 'false'">

        <div style="display: flex; justify-content: center; align-items: center;">
          <img src="@/assets/images/svg/ui/Guider.svg" height="20px" style="min-height: 20px; pointer-events: none;"></img>
        </div>
      </button>

      <button
        class="btn-Style"
        @click="ExpTimeSwitch"
        data-testid="ui-chart-component-btn-exp-time-switch"
        :data-exp-time-ms="String(ExpTime)"
      >
        <span v-if="ExpTime === 1000">
          <div style="display: flex; justify-content: center; align-items: center;">
            <img src="@/assets/images/svg/ui/Exp-1000.svg" height="25px" style="min-height: 25px; pointer-events: none;"></img>
          </div>
        </span>
        <span v-if="ExpTime === 2000">
          <div style="display: flex; justify-content: center; align-items: center;">
            <img src="@/assets/images/svg/ui/Exp-2000.svg" height="25px" style="min-height: 25px; pointer-events: none;"></img>
          </div>
        </span>
        <span v-if="ExpTime === 500">
          <div style="display: flex; justify-content: center; align-items: center;">
            <img src="@/assets/images/svg/ui/Exp-500.svg" height="25px" style="min-height: 25px; pointer-events: none;"></img>
          </div>
        </span>
      </button>

      <button class="btn-Style" @click="DataClear" data-testid="ui-chart-component-btn-data-clear">
        <div style="display: flex; justify-content: center; align-items: center;">
          <img src="@/assets/images/svg/ui/delete.svg" height="20px" style="min-height: 20px; pointer-events: none;"></img>
        </div>
      </button>

      <button class="btn-Style" @click="RangeSwitch" data-testid="ui-chart-component-btn-range-switch">
        <div style="display: flex; justify-content: center; align-items: center;">
          <img src="@/assets/images/svg/ui/suofang.svg" height="20px" style="min-height: 20px; pointer-events: none;"></img>
        </div>
      </button>

    </div>
    
  </div>
</transition>
</template>

<script>
import LineChart from './Chart-Line.vue';
import ScatterChart from './Chart-Scatter.vue';

export default {
  name: 'ChartsPanel',
  data() {
    return {
      bottom: 10,
      ComponentPadding: 0,
      height: 90,
      ExpTime: 1000,
      isGuiding: false,
      isLoopping: false,
      CurrentGuiderStatus: 'null',
      // 导星丢星弹窗节流：记录上次弹窗时间（ms），默认每 5s 最多弹一次
      lastStarLostAlertTime: 0,
      starLostAlertIntervalMs: 5000,

      pressTimer: null,
      longPressThreshold: 1000,
      isLongPress: false, // 标记是否为长按
      canClick: true,

      GuiderConnect: false,
      guiderProgressMessages: [],
      guiderProgressSummary: '',
      guiderLastPulse: '',
      guiderLastCalibration: '',
      guiderProgressMessageId: 0,
      calibrationRaTrace: [],
      calibrationDecTrace: [],
      calibrationGraphTargetPx: 0,

    };
  },
  components: {
    LineChart,
    ScatterChart,
  },
  created() {
    this.$bus.$on('GuiderSwitchStatus', this.GuiderSwitchStatus);
    this.$bus.$on('GuiderLoopExpStatus', this.GuiderLoopExpStatus);
    this.$bus.$on('GuiderStatus', this.GuiderStatus);
    this.$bus.$on('GuiderConnected', this.GuiderConnected);
    this.$bus.$on('GuiderCoreInfo', this.GuiderCoreInfo);
    this.$bus.$on('GuiderCoreError', this.GuiderCoreError);
    this.$bus.$on('GuiderCalibration', this.GuiderCalibration);
    this.$bus.$on('GuiderPulse', this.GuiderPulse);
    this.$bus.$on('GuiderStarSelected', this.GuiderStarSelected);
    this.$bus.$emit('AppSendMessage', 'Vue_Command', 'getGuiderStatus');
  },
  mounted() {
    this.updatePosition(); // 初始化位置
    window.addEventListener('resize', this.updatePosition);
    // 图表面板仅在切到导星页后挂载，可能早于本组件订阅总线时已发出的 GuiderConnected(1)，
    // 导致 GuiderConnect 仍为 false，LoopExpSwitch 只弹错不发指令、data-state 永不变为 on。
    this.syncGuiderConnectFromStore();
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.updatePosition);
    this.$bus.$off('GuiderSwitchStatus', this.GuiderSwitchStatus);
    this.$bus.$off('GuiderLoopExpStatus', this.GuiderLoopExpStatus);
    this.$bus.$off('GuiderStatus', this.GuiderStatus);
    this.$bus.$off('GuiderConnected', this.GuiderConnected);
    this.$bus.$off('GuiderCoreInfo', this.GuiderCoreInfo);
    this.$bus.$off('GuiderCoreError', this.GuiderCoreError);
    this.$bus.$off('GuiderCalibration', this.GuiderCalibration);
    this.$bus.$off('GuiderPulse', this.GuiderPulse);
    this.$bus.$off('GuiderStarSelected', this.GuiderStarSelected);
  },
  computed: {
    GuiderSwitchBtnClass() {
      if (this.isGuiding) {
        return [
          {
            'btn-InGuiding': this.CurrentGuiderStatus === 'InGuiding',
            'btn-InSelecting': this.CurrentGuiderStatus === 'InSelecting',
            'btn-InCalibration': this.CurrentGuiderStatus === 'InCalibration',
            'btn-StarLostAlert': this.CurrentGuiderStatus === 'StarLostAlert',
            'btn-null': this.CurrentGuiderStatus === 'null',
          }
        ];
      } else if (this.isLoopping && this.GuiderConnect) {
        return 'btn-Ready';
      } else {
        return 'btn-null';
      }
    },
    LoopExpSwitchBtnClass() {
        return [
          {
            'btn-LoopExp-true': this.isLoopping, 
            'btn-LoopExp-false': !this.isLoopping, 
          },
        ];
    },
    showGuiderProgressCard() {
      return this.isGuiding
        || this.CurrentGuiderStatus !== 'null'
        || this.guiderProgressMessages.length > 0;
    },
    guiderPhaseLabel() {
      const labels = {
        InSelecting: 'Selecting star',
        SelectingProgress: 'Selecting star',
        StarSelected: 'Star selected',
        InCalibration: 'Calibrating',
        InDirectionDetection: 'Detecting axes',
        InGuiding: 'Guiding',
        StarLostAlert: 'Star lost',
        null: 'Guider'
      };
      return labels[this.CurrentGuiderStatus] || this.CurrentGuiderStatus || 'Guider';
    },
    showCalibrationGraph() {
      return this.calibrationRaTrace.length > 0 || this.calibrationDecTrace.length > 0;
    },
    calibrationGraph() {
      return this.buildCalibrationGraph();
    }
  },
  watch: {
    '$store.state.device.devices.GuiderCamera.connected'(connected) {
      if (typeof connected === 'boolean') {
        this.GuiderConnect = connected;
      }
    },
  },
  methods: {
    syncGuiderConnectFromStore() {
      try {
        const guider = this.$store.getters['device/getDevice']('GuiderCamera');
        if (guider && guider.connected) {
          this.GuiderConnect = true;
        }
      } catch (e) {
        /* 无 store 的测试环境忽略 */
      }
    },
    updatePosition() {
      const screenWidth = window.innerWidth;
      const halfWidth = screenWidth / 2 - 250;
      this.ComponentPadding = Math.max(halfWidth, 170);
      // console.log('Updated Padding:', this.ComponentPadding);

      // 计算宽度
      const newWidth = screenWidth - (this.ComponentPadding * 2);
      // console.log('update LineChart Width:', newWidth);
      this.$bus.$emit('updateLineChartWidth', newWidth);
    },
    startPress() {
      if (this.pressTimer) {
        clearTimeout(this.pressTimer);
      }
      this.isLongPress = false; // 重置长按标记
      this.pressTimer = setTimeout(() => {
        this.isLongPress = true; // 标记为长按
        this.handleLongPress();
      }, this.longPressThreshold);
    },
    endPress() {
      clearTimeout(this.pressTimer); // 清除定时器
      if (!this.isLongPress) {
        this.handleClick(); // 如果不是长按，则触发点击事件
      }
      this.pressTimer = null; // 重置定时器
    },
    cancelPress() {
      if (this.pressTimer) {
        clearTimeout(this.pressTimer);
      }
      this.pressTimer = null;
      this.isLongPress = false;
    },
    handleClick() {
      if (!this.canClick) return; // 如果不可点击，直接返回
      this.canClick = false; // 设置为不可点击
      // console.log("Button clicked");

      this.GuiderSwitch();

      // 恢复点击权限
      setTimeout(() => {
        this.canClick = true;
      }, 1000); // 1秒后恢复
    },
    handleLongPress() {
      if(this.isGuiding) return;
      if (!this.isLoopping) {
        this.$bus.$emit('showMsgBox', this.$t('Please open the loop exposure first.'), 'error');
        return;
      }
      this.DataClear();
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'PHD2Recalibrate');
    },

    GuiderSwitch() {
      if (this.isGuiding) {
        this.$bus.$emit(
          'ShowConfirmDialog',
          'Confirm',
          'Are you sure you want to stop guiding?',
          'StopGuiding'
        );
        return;
      }
      if(this.isLoopping) {
        this.DataClear();
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'GuiderSwitch:true');
      } else {
        this.$bus.$emit('showMsgBox', this.$t('Please open the loop exposure first.'), 'error');
      }
    },

    LoopExpSwitch() {
      if (this.GuiderConnect) {
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'GuiderLoopExpSwitch:' + !this.isLoopping);
      } else {
        this.$bus.$emit('showMsgBox', this.$t('Please connect the Guider camera first.'), 'error');
      }
    },

    ExpTimeSwitch() {
      if (this.ExpTime === 1000) {
        this.ExpTime = 2000;
      } else if (this.ExpTime === 2000) {
        this.ExpTime = 500;
      } else if (this.ExpTime === 500) {
        this.ExpTime = 1000;
      }
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'GuiderExpTimeSwitch:' + this.ExpTime);
    },

    GuiderSwitchStatus(value) {
      if(value === 'true' || value === "true") {
        this.isGuiding = true;
        // 若后端尚未返回细分状态，先以“选星中”显示，避免把自动选星误显示为校准
        if (this.CurrentGuiderStatus !== 'InGuiding'
          && this.CurrentGuiderStatus !== 'InCalibration'
          && this.CurrentGuiderStatus !== 'InDirectionDetection') {
          this.CurrentGuiderStatus = 'InSelecting';
        }
        this.$startFeature(['GuiderCamera'], 'GuiderGuiding');
      } else {
        this.isGuiding = false;
        this.CurrentGuiderStatus = 'null';
        this.clearGuiderProgress();
        this.resetCalibrationGraph();
        // 停止导星时重置丢星弹窗时间
        this.lastStarLostAlertTime = 0;
        this.$bus.$emit('GuiderStop');
        this.$stopFeature(['GuiderCamera'], 'GuiderGuiding');
      }
      console.log('GuiderSwitchStatus:', this.isGuiding);
    },

    GuiderLoopExpStatus(value) {
      if(value === 'true' || value === "true") {
        this.isLoopping = true;
        this.$startFeature(['GuiderCamera'], 'GuiderLoop');
      } else {
        this.isLoopping = false;
        this.isGuiding = false;
        this.CurrentGuiderStatus = 'null';
        this.clearGuiderProgress();
        this.resetCalibrationGraph();
        this.$stopFeature(['GuiderCamera'], 'GuiderLoop');
        this.$stopFeature(['GuiderCamera'], 'GuiderGuiding');
      }
      console.log('GuiderLoopExpSwitchStatus:', this.isLoopping);
    },

    GuiderStatus(status) {
      if(status === 'InGuiding') {
        this.CurrentGuiderStatus = 'InGuiding';
        this.pushGuiderProgress('status', 'Guiding corrections are active.');
        // 恢复正常导星，重置丢星弹窗时间
        this.lastStarLostAlertTime = 0;
      } else if(status === 'InSelecting') {
        this.CurrentGuiderStatus = 'InSelecting';
        this.pushGuiderProgress('status', 'Selecting guide star.');
        this.lastStarLostAlertTime = 0;
      } else if(status === 'InCalibration') {
        if (this.CurrentGuiderStatus !== 'InCalibration') {
          this.$bus.$emit('showMsgBox', this.$t('Guiding calibration started.'), 'info');
        }
        this.CurrentGuiderStatus = 'InCalibration';
        this.pushGuiderProgress('status', 'Calibration is running.');
        // 校准状态也视为“未丢星”，重置丢星弹窗时间
        this.lastStarLostAlertTime = 0;
      } else if(status === 'InDirectionDetection') {
        this.CurrentGuiderStatus = 'InDirectionDetection';
        this.pushGuiderProgress('status', 'Detecting mount axis directions.');
        this.lastStarLostAlertTime = 0;
      } else if(status === 'SelectingProgress' || status === 'StarSelected') {
        this.CurrentGuiderStatus = status;
        this.pushGuiderProgress('status', this.guiderPhaseLabel + '.');
        this.lastStarLostAlertTime = 0;
      } else if(status === 'StarLostAlert') {
        this.CurrentGuiderStatus = 'StarLostAlert';
        this.pushGuiderProgress('warning', 'Guide star lost. Waiting for reacquire or user action.');
        // 节流：丢星期间每 starLostAlertIntervalMs 才弹一次
        const now = Date.now();
        if (now - this.lastStarLostAlertTime >= this.starLostAlertIntervalMs) {
          this.$bus.$emit('showMsgBox', 'Lost guiding star target.', 'error');
          this.lastStarLostAlertTime = now;
        }
      }
      console.log('GuiderStatus:', this.CurrentGuiderStatus);
      this.$bus.$emit('SendConsoleLogMsg', 'GuiderStatus:' + this.CurrentGuiderStatus, 'info');
    },
    
    DataClear() {
      this.$bus.$emit('clearChartData');
    },
    RangeSwitch() {
      this.$bus.$emit('ChartRangeSwitch');
    },
    GuiderConnected(num) {
      if(num === 0){
        this.GuiderConnect = false;
        // this.$bus.$emit('showMsgBox', 'Guider is not connected.', 'error');
      } else {
        this.GuiderConnect = true;
        // this.$bus.$emit('showMsgBox', 'Guider is connected.', 'info');
      }
    },
    GuiderCoreInfo(message) {
      const text = this.formatGuiderInfo(message);
      this.guiderProgressSummary = text;
      this.pushGuiderProgress('info', text);
      this.captureCalibrationTrace(message);
    },
    GuiderCoreError(message) {
      const text = this.formatGuiderError(message);
      this.guiderProgressSummary = text;
      this.pushGuiderProgress('warning', text);
    },
    GuiderCalibration(message) {
      const text = this.formatKeyValueMessage(message, 'Calibration');
      this.guiderLastCalibration = text;
      this.guiderProgressSummary = text;
      this.pushGuiderProgress('calibration', text);
    },
    GuiderPulse(message) {
      const text = this.formatGuiderPulse(message);
      this.guiderLastPulse = text;
      this.pushGuiderProgress('pulse', text);
    },
    GuiderStarSelected(message) {
      const text = this.formatKeyValueMessage(message, 'Star selected');
      this.guiderProgressSummary = text;
      this.pushGuiderProgress('status', text);
    },
    pushGuiderProgress(type, text) {
      const normalized = String(text || '').trim();
      if (!normalized) return;
      const last = this.guiderProgressMessages[0];
      if (last && last.type === type && last.text === normalized) return;
      this.guiderProgressMessageId += 1;
      this.guiderProgressMessages.unshift({
        id: this.guiderProgressMessageId,
        type,
        text: normalized
      });
      if (this.guiderProgressMessages.length > 5) {
        this.guiderProgressMessages.splice(5);
      }
    },
    clearGuiderProgress() {
      this.guiderProgressMessages = [];
      this.guiderProgressSummary = '';
      this.guiderLastPulse = '';
      this.guiderLastCalibration = '';
    },
    resetCalibrationGraph() {
      this.calibrationRaTrace = [];
      this.calibrationDecTrace = [];
      this.calibrationGraphTargetPx = 0;
    },
    captureCalibrationTrace(message) {
      const raw = String(message || '').trim();
      if (!raw) return;
      if (raw.indexOf('进入校准阶段') !== -1) {
        this.resetCalibrationGraph();
        return;
      }
      const match = raw.match(/^CAL step=(\d+)\s+state=(GoWest|GoNorth)\s+dx=([-0-9.]+)\s+dy=([-0-9.]+)\s+dist=([-0-9.]+)\/([-0-9.]+)px/);
      if (!match) return;
      const axis = match[2] === 'GoWest' ? 'ra' : 'dec';
      const step = parseInt(match[1], 10);
      const point = {
        id: axis + '-' + step + '-' + match[3] + '-' + match[4],
        step,
        dx: parseFloat(match[3]),
        dy: parseFloat(match[4])
      };
      const target = parseFloat(match[6]);
      if (Number.isFinite(target)) {
        this.calibrationGraphTargetPx = Math.max(this.calibrationGraphTargetPx, Math.abs(target));
      }
      if (axis === 'ra') {
        this.calibrationRaTrace = this.upsertCalibrationTrace(this.calibrationRaTrace, point);
      } else {
        this.calibrationDecTrace = this.upsertCalibrationTrace(this.calibrationDecTrace, point);
      }
    },
    upsertCalibrationTrace(trace, point) {
      const next = Array.isArray(trace) ? trace.slice() : [];
      const index = next.findIndex(item => item.id === point.id || item.step === point.step);
      if (index >= 0) {
        next.splice(index, 1, point);
      } else {
        next.push(point);
      }
      next.sort((a, b) => a.step - b.step);
      return next;
    },
    buildCalibrationGraph() {
      const size = 120;
      const center = size / 2;
      const padding = 8;
      const scale = this.getCalibrationGraphScale(size, padding);
      return {
        raPoints: this.projectCalibrationPoints(this.calibrationRaTrace, scale, center, 'ra'),
        decPoints: this.projectCalibrationPoints(this.calibrationDecTrace, scale, center, 'dec'),
        raLine: this.projectCalibrationLine(this.calibrationRaTrace, scale, center),
        decLine: this.projectCalibrationLine(this.calibrationDecTrace, scale, center)
      };
    },
    getCalibrationGraphScale(size, padding) {
      const values = [];
      this.calibrationRaTrace.forEach((point) => {
        values.push(Math.abs(point.dx), Math.abs(point.dy));
      });
      this.calibrationDecTrace.forEach((point) => {
        values.push(Math.abs(point.dx), Math.abs(point.dy));
      });
      if (this.calibrationGraphTargetPx > 0) {
        values.push(this.calibrationGraphTargetPx);
      }
      const maxAbs = values.length > 0 ? Math.max.apply(null, values) : 1;
      return maxAbs > 0 ? ((size / 2) - padding) / maxAbs : 1;
    },
    projectCalibrationPoints(trace, scale, center, prefix) {
      return trace.map((point) => ({
        id: prefix + '-' + point.id,
        x: center + (point.dx * scale),
        y: center - (point.dy * scale)
      }));
    },
    projectCalibrationLine(trace, scale, center) {
      if (!Array.isArray(trace) || trace.length < 2) return null;
      const first = trace[0];
      const last = trace[trace.length - 1];
      return {
        x1: center + (first.dx * scale),
        y1: center - (first.dy * scale),
        x2: center + (last.dx * scale),
        y2: center - (last.dy * scale)
      };
    },
    formatGuiderInfo(message) {
      const raw = String(message || '').trim();
      if (!raw) return '';

      let match = raw.match(/^CAL step=(\d+)\s+state=([A-Za-z]+)\s+dx=([-0-9.]+)\s+dy=([-0-9.]+)\s+dist=([-0-9.]+)\/([-0-9.]+)px/);
      if (match) {
        return match[2] + ': step ' + match[1] + ', dist ' + match[5] + '/' + match[6] + ' px, dx ' + match[3] + ', dy ' + match[4];
      }

      match = raw.match(/DEC回差测量\(PushNorth\):\s*moved=([-0-9.]+)\/([-0-9.]+)px\s+northTotal=(\d+)ms/);
      if (match) {
        return 'DEC backlash PushNorth: moved ' + match[1] + '/' + match[2] + ' px, north ' + match[3] + ' ms';
      }

      match = raw.match(/DEC回差测量\(ProbeSouth\):\s*pulled=([-0-9.]+)px\s+thresh=([-0-9.]+)px.*southTotal=(\d+)ms/);
      if (match) {
        return 'DEC backlash ProbeSouth: pulled ' + match[1] + ' px, threshold ' + match[2] + ' px, south ' + match[3] + ' ms';
      }

      return raw;
    },
    formatGuiderError(message) {
      const raw = String(message || '').trim();
      if (!raw) return 'Guider error';
      if (/CalibrationFailed:LostStar/i.test(raw)) return 'Calibration failed: guide star was lost.';
      if (/RA Calibration Failed: star did not move enough/i.test(raw)) return 'Calibration failed: RA movement was too small.';
      if (/DEC Calibration Failed: star did not move enough/i.test(raw)) return 'Calibration failed: DEC movement was too small.';
      if (/Backlash Clearing Failed: star did not move enough/i.test(raw)) return 'Calibration failed: backlash clearing did not move the star enough.';
      if (/CalibrationQualityFailed:/i.test(raw)) return 'Calibration failed: quality checks did not pass.';
      if (/BeginCalibrationFailed:NoLock/i.test(raw)) return 'Calibration failed: no guide star is locked.';
      return raw.replace(/:/g, ', ');
    },
    formatGuiderPulse(message) {
      const parts = String(message || '').split(':');
      if (parts.length >= 3) {
        const direction = parts[1];
        const ms = parts[2];
        const raErr = this.extractKeyValue(parts, 'raErrPx');
        const decErr = this.extractKeyValue(parts, 'decErrPx');
        let text = 'Pulse ' + direction + ' ' + ms + ' ms';
        if (raErr || decErr) {
          text += ' (RA ' + (raErr || '-') + ' px, DEC ' + (decErr || '-') + ' px)';
        }
        return text;
      }
      return 'Pulse ' + String(message || '').trim();
    },
    formatKeyValueMessage(message, prefix) {
      const raw = String(message || '').trim();
      if (!raw) return prefix;
      return prefix + ': ' + raw.replace(/:/g, ', ');
    },
    extractKeyValue(parts, key) {
      const prefix = key + '=';
      const found = parts.find((part) => part.indexOf(prefix) === 0);
      return found ? found.slice(prefix.length) : '';
    },
  }
}
</script>

<style scoped>
.chart-panel {
  position: absolute;
  background-color: rgba(64, 64, 64, 0.5);
  backdrop-filter: blur(5px);
  border-radius: 10px;
  border: 4px solid rgba(128, 128, 128, 0.5);
  box-sizing: border-box;
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

.line-chart {
  position:absolute;
  bottom: 1px;
  left: 5px;
}

.scatter-chart {
  position:absolute;
  top: 1px;
  right: 0px;
}

.buttons-container {
  display: flex;
  justify-content: space-between;
  position: absolute;
  top: -39px;
  left: 5px;
  right: 5px;
  z-index: 3;
  pointer-events: auto;
}

.guider-progress-card {
  position: absolute;
  left: 5px;
  bottom: calc(100% + 44px);
  width: min(430px, calc(100vw - 34px));
  max-width: calc(100vw - 34px);
  padding: 8px 10px;
  color: rgba(255, 255, 255, 0.92);
  background: rgba(14, 18, 24, 0.48);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(4px);
  box-sizing: border-box;
  pointer-events: none;
  font-size: 12px;
  line-height: 1.35;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.58);
  z-index: 2;
}

.guider-progress-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 4px;
}

.guider-progress-card__phase {
  font-weight: 700;
  letter-spacing: 0.02em;
  color: rgba(255, 188, 92, 0.95);
}

.guider-progress-card__pulse {
  flex: 0 0 auto;
  color: rgba(154, 214, 255, 0.95);
  font-size: 11px;
}

.guider-progress-card__summary,
.guider-progress-card__calibration,
.guider-progress-card__message {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.guider-progress-card__summary {
  color: rgba(255, 255, 255, 0.96);
}

.guider-progress-card__calibration {
  margin-top: 3px;
  color: rgba(175, 255, 196, 0.92);
}

.guider-progress-card__graph {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 6px;
}

.guider-progress-card__graph-svg {
  width: 96px;
  height: 96px;
  flex: 0 0 auto;
}

.guider-progress-card__axis {
  stroke: rgba(255, 255, 255, 0.20);
  stroke-width: 1;
}

.guider-progress-card__line {
  fill: none;
  stroke-width: 2;
  stroke-linecap: round;
}

.guider-progress-card__line--ra {
  stroke: rgba(255, 128, 102, 0.92);
}

.guider-progress-card__line--dec {
  stroke: rgba(122, 232, 162, 0.92);
}

.guider-progress-card__point {
  stroke-width: 0;
}

.guider-progress-card__point--ra {
  fill: rgba(255, 146, 122, 0.96);
}

.guider-progress-card__point--dec {
  fill: rgba(136, 244, 176, 0.96);
}

.guider-progress-card__graph-legend {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 11px;
}

.guider-progress-card__graph-legend-item--ra {
  color: rgba(255, 146, 122, 0.96);
}

.guider-progress-card__graph-legend-item--dec {
  color: rgba(136, 244, 176, 0.96);
}

.guider-progress-card__messages {
  margin-top: 5px;
  padding-top: 5px;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
}

.guider-progress-card__message {
  color: rgba(235, 239, 245, 0.78);
}

.guider-progress-card__message--warning {
  color: rgba(255, 120, 120, 0.94);
}

.guider-progress-card__message--pulse {
  color: rgba(154, 214, 255, 0.9);
}

.guider-progress-card__message--calibration {
  color: rgba(175, 255, 196, 0.9);
}

.btn-Style {
  width: 30px;
  height: 30px; 

  user-select: none;
  background-color: rgba(64, 64, 64, 0.5);
  backdrop-filter: blur(5px);
  border: none;
  border-radius: 50%; 
  box-sizing: border-box;
}

.btn-LoopExp-false {
  width: 30px;
  height: 30px; 

  user-select: none;
  background-color: rgba(64, 64, 64, 0.5);
  backdrop-filter: blur(5px);
  border: none;
  border-radius: 50%; 
  box-sizing: border-box;
}

.btn-LoopExp-true {
  width: 30px;
  height: 30px; 

  user-select: none;
  background-color: rgba(64, 64, 64, 0.5);
  backdrop-filter: blur(5px);
  /* border: none; */
  border-radius: 50%; 
  box-sizing: border-box;

  animation: Animation_true infinite;
}

@keyframes Animation_true {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(-180deg);
  }
}

.btn-InGuiding {
  border: 1px solid rgba(51, 218, 121, 1);
}

.btn-InSelecting {
  border: 1px solid rgba(120, 170, 255, 0.95);
}

.btn-InCalibration {
  border: 1px solid rgba(255, 165, 0, 1);
}

.btn-StarLostAlert {
  border: 1px solid rgba(255, 0, 0, 1);
}

.btn-Ready {
  border: 1px solid rgba(120, 170, 255, 0.95);
}

.btn-null {
  border: none;
}

.btn-Guider:active,
.btn-Style:active {
  transform: scale(0.95); /* 点击时缩小按钮 */
  background-color: rgba(255, 255, 255, 0.7);
}

</style>
