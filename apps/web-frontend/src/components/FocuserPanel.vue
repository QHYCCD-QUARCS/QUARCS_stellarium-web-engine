<template>
  <transition name="panel">
    <div class="chart-panel"
      :style="{ bottom: bottom + 'px', left: ComponentPadding + 'px', right: ComponentPadding + 'px', height: height + 'px' }" data-testid="fp-root">
      <ImageChart ref="imagechart" class="image-chart" />
      <FocusChart ref="focuschart" class="focus-chart" />

      <div class="buttons-container" data-testid="fp-buttons-container">

        <button
          @click="startCalibration"
          :title="manualCalibrationMode ? $t('End manual focuser calibration') : $t('Open manual focuser calibration dialog')"
          :class="{'btn-calibration': true, 'active-calibration': isCalibrating, 'complete-calibration': calibrationState === 'complete', 'error-calibration': calibrationState === 'error'}"
          class="get-click"
          data-testid="fp-btn-start-calibration">
          <div style="display: flex; justify-content: center; align-items: center;">
            <img v-if="calibrationState === 'complete'" src="@/assets/images/svg/ui/CalibrationComplete.svg" height="25px"
              style="min-height: 25px; pointer-events: none;"></img>
            <img v-else-if="isCalibrating" src="@/assets/images/svg/ui/StopCalibration.svg" height="25px"
              :class="{'pulse-animation': calibrationState === 'running'}"
              style="min-height: 25px; pointer-events: none;"></img>
            <img v-else src="@/assets/images/svg/ui/Calibration.svg" height="25px"
              style="min-height: 25px; pointer-events: none;"></img>
          </div>
        </button>

        <button
          @click="toggleLoopShooting"
          :disabled="manualCalibrationMode"
          :class="{'btn-loop-shooting': true, 'active-loop': isLoopActive}"
          class="get-click"
          data-testid="fp-btn-toggle-loop-shooting">
          <div style="display: flex; justify-content: center; align-items: center;">
            <img :src="require(isLoopActive ? '@/assets/images/svg/ui/ROI-Capturing.svg' : '@/assets/images/svg/ui/ROI-Capture.svg')" height="25px"
              :class="{'rotate-animation': isLoopActive}"
              style="min-height: 25px; pointer-events: none;"></img>
          </div>
        </button>

        <!-- <button  @click="SpeedChange" @touchend="active" class="get-click btn-Speed" data-testid="fp-btn-speed-change"><v-icon>mdi-run-fast</v-icon></button> -->
        <button
          @click="SpeedChange"
          @touchend="active"
          :disabled="manualCalibrationMode"
          class="get-click btn-Speed"
          data-testid="fp-btn-speed-change-2">
          <span v-if="MoveSpeed === 1">
            <div style="display: flex; justify-content: center; align-items: center;">
              <img src="@/assets/images/svg/ui/Speed-1.svg" height="25px"
                style="min-height: 25px; pointer-events: none;"></img>
            </div>
          </span>
          <span v-if="MoveSpeed === 3">
            <div style="display: flex; justify-content: center; align-items: center;">
              <img src="@/assets/images/svg/ui/Speed-2.svg" height="25px"
                style="min-height: 25px; pointer-events: none;"></img>
            </div>
          </span>
          <span v-if="MoveSpeed === 5">
            <div style="display: flex; justify-content: center; align-items: center;">
              <img src="@/assets/images/svg/ui/Speed-3.svg" height="25px"
                style="min-height: 25px; pointer-events: none;"></img>
            </div>
          </span>
        </button>

        <button
          @click="ROIChange"
          @touchend="active"
          :disabled="manualCalibrationMode"
          class="get-click btn-ROI"
          data-testid="fp-btn-roichange">
        <span v-if="ROI_length === 100">
          <div style="display: flex; justify-content: center; align-items: center;">
            <img src="@/assets/images/svg/ui/ROI-100.svg" height="25px"
              style="min-height: 25px; pointer-events: none;"></img>
          </div>
        </span>
        <span v-if="ROI_length === 300">
          <div style="display: flex; justify-content: center; align-items: center;">
            <img src="@/assets/images/svg/ui/ROI-300.svg" height="25px"
              style="min-height: 25px; pointer-events: none;"></img>
          </div>
        </span>
        <span v-if="ROI_length === 500">
          <div style="display: flex; justify-content: center; align-items: center;">
            <img src="@/assets/images/svg/ui/ROI-500.svg" height="25px"
              style="min-height: 25px; pointer-events: none;"></img>
          </div>
        </span>
      </button>

        <!-- <button :disabled="isBtnMoveDisabled" @click="FocusLeftMove" @touchend="active" class="get-click btn-Left" data-testid="fp-btn-focus-left-move">
        <div style="display: flex; justify-content: center; align-items: center;">
          <img src="@/assets/images/svg/ui/arrow-left-circle.svg" height="20px" style="min-height: 20px; pointer-events: none;"></img>
        </div>
      </button> -->
        <button :disabled="isBtnMoveDisabled" @mousedown="FocusMove('left')" @mouseup="FocusAbort"
          @touchstart.stop.prevent="FocusMove('left')" @touchend.stop.prevent="FocusAbort" @touchcancel.stop.prevent="FocusAbort" class="get-click btn-Left" data-testid="fp-btn-focus-move">
          <div style="display: flex; justify-content: center; align-items: center;">
            <img src="@/assets/images/svg/ui/arrow-left-circle.svg" height="20px"
              style="min-height: 20px; pointer-events: none;"></img>
          </div>
        </button>

        <!-- <button  @click="AutoFocus" @touchend="active" class="get-click btn-Auto" data-testid="fp-btn-auto-focus"><v-icon>mdi-focus-auto</v-icon></button> -->
        <button
          @click="AutoFocus"
          @touchend="active"
          :disabled="manualCalibrationMode"
          class="get-click btn-Auto"
          data-testid="fp-btn-auto-focus-2">
          <span v-if="inAutoFocus">
            <div style="display: flex; justify-content: center; align-items: center;">
              <img src="@/assets/images/svg/ui/StopAutoFocus.svg" height="20px"
                style="min-height: 20px; pointer-events: none;"></img>
            </div>
          </span>
          <span v-else>
            <div style="display: flex; justify-content: center; align-items: center;">
              <img src="@/assets/images/svg/ui/AutoFocus.svg" height="20px"
                style="min-height: 20px; pointer-events: none;"></img>
            </div>
          </span>
        </button>

        <!-- <button @click="FocusGoto" @touchend="active" class="get-click btn-Goto" data-testid="fp-btn-focus-goto">
          <div style="display: flex; justify-content: center; align-items: center;">
            <img src="@/assets/images/svg/ui/Move.svg" height="10px"
              style="min-height: 10px; pointer-events: none;"></img>
          </div>
        </button> -->
        <!-- <button :disabled="isBtnMoveDisabled" @click="FocusRightMove" @touchend="active" class="get-click btn-Right" data-testid="fp-btn-focus-right-move">
          <div style="display: flex; justify-content: center; align-items: center;">
            <img src="@/assets/images/svg/ui/arrow-right-circle.svg" height="20px"
              style="min-height: 20px; pointer-events: none;"></img>
          </div>
        </button> -->

        <button :disabled="isBtnMoveDisabled" @mousedown="FocusMove('right')" @mouseup="FocusAbort"
          @touchstart.stop.prevent="FocusMove('right')" @touchend.stop.prevent="FocusAbort" @touchcancel.stop.prevent="FocusAbort" class="get-click btn-Right" data-testid="fp-btn-focus-move-2">
          <div style="display: flex; justify-content: center; align-items: center;">
            <img src="@/assets/images/svg/ui/arrow-right-circle.svg" height="20px"
              style="min-height: 20px; pointer-events: none;"></img>
          </div>
        </button>

      </div>

      <div class="Canvas-Bar">
        <canvas ref="FocusCanvas" id="Focus-Canvas"></canvas>
      </div>

      <div class="Speed-Bar" :style="{ fontSize: '8px' }">
        {{ this.MoveSpeed_ }}
      </div>

      <div class="State-Bar" data-testid="fp-act-state-bar" :style="{ left: 80 + 'px', right: 80 + 'px', fontSize: '8px' }">
        <div class="State-BarLine" data-testid="fp-state-current">Current:{{ this.CurrentPosition }}  FWHM:{{ this.FWHM }}  SNR:{{ this.SNR }}  Max:{{ this.LocalMax }}  Std:{{ this.BgStd }}</div>
      </div>

      <div class="Steps-Bar" :style="{ fontSize: '8px' }">
        {{ this.MoveSteps }}
      </div>

      <div
        v-if="showManualCalibrationDialog"
        class="manual-calibration-modal"
        data-testid="fp-manual-calibration-dialog">
        <div class="manual-calibration-title">{{ $t('Manual Focuser Calibration') }}</div>
        <div class="manual-calibration-desc">{{ $t('Please use the left/right move buttons to move the focuser manually, then set the left and right boundaries.') }}</div>
        <div class="manual-calibration-pos">{{ $t('Current Position') }}: {{ CurrentPosition }}</div>
        <div class="manual-calibration-status">
          {{ $t('Left boundary') }}:
          <span>{{ manualCalibrationLeftSet ? manualCalibrationLeftValue : $t('Not set') }}</span>
          |
          {{ $t('Right boundary') }}:
          <span>{{ manualCalibrationRightSet ? manualCalibrationRightValue : $t('Not set') }}</span>
        </div>
        <div class="manual-calibration-actions">
          <button
            class="manual-calibration-btn"
            :title="$t('Set current position as left boundary (Min Limit)')"
            @click="setManualLeftBoundary">
            {{ $t('Set Left Boundary') }}
          </button>
          <button
            class="manual-calibration-btn"
            :title="$t('Set current position as right boundary (Max Limit)')"
            @click="setManualRightBoundary">
            {{ $t('Set Right Boundary') }}
          </button>
        </div>
      </div>



    </div>
  </transition>
</template>

<script>
import FocusChart from './Chart-Focus.vue';
import ImageChart from './Chart-FocusImage.vue';

export default {
  name: 'FocuserPanel',
  data() {
    return {
      // width: 330, // 初始宽度
      bottom: 10,
      ComponentPadding: 0,
      height: 90,

      MoveSteps: 50,
      MoveSpeed: 1,
      MoveSpeed_: 1,

      CurrentPosition: 0,
      // TargetPosition: 0,
      FWHM: 0,
      SNR: 0,
      LocalMax: 0,
      BgStd: 0,

      isBtnMoveDisabled: false, // 调焦按钮是否禁用
      isMoveInProgress: false, // 调焦是否进行中

      inAutoFocus: false, // 自动对焦是否开启
      isLoopActive: false, // 新增状态控制循环拍摄是否激活

      currentMainCanvasHasImage: false,


      ROI_length: 300,

      FocuserIsConnected: false,

      moveStartTime: 0,  // 电调移动按下时间记录

      // 长按判定/状态
      longPressTimer: null,
      longPressTriggered: false,
      pressDirection: '',
      isPressing: false,
      longPressCaptureCleanup: null,

      // 校准相关数据
      isCalibrating: false, // 是否正在校准
      calibrationStep: 0, // 校准步骤 (1-3)
      calibrationMessage: '', // 校准提示信息
      calibrationState: 'idle', // 校准状态: 'idle', 'running', 'complete'
      manualCalibrationMode: false, // 手动校准模式（仅允许移动与设置边界）
      showManualCalibrationDialog: false,
      manualCalibrationLeftSet: false,
      manualCalibrationRightSet: false,
      manualCalibrationLeftValue: null,
      manualCalibrationRightValue: null,

      // 自动对焦阶段拍摄进度（仅用于逻辑记录，不再在面板底部重复显示）
      autoFocusStage: '',
      autoFocusCurrentShot: 0,
      autoFocusTotalShots: 0,
      autoFocusMode: 'full',

    };
  },
  components: {
    FocusChart,
    ImageChart
  },
  computed: {
    // 保留占位，当前不在该面板上展示阶段文案
    autoFocusStageLabel() {
      return '';
    }
  },
  mounted() {
    this.updatePosition(); // 初始化位置
    window.addEventListener('resize', this.updatePosition);
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.updatePosition);
    this.removeLongPressCaptureListeners();
  },
  created() {
    // this.$bus.$on('AutoHistogramNum', this.setAutoHistogramNum);
    this.$bus.$on('FocusChangeSpeedSuccess', this.ShowSpeedNum);
    this.$bus.$on('FocusPosition', this.ShowPositionNum);
    // this.$bus.$on('FocusMoveDone', this.MoveDone);
    this.$bus.$on('UpdateFWHM', this.UpdateFWHM);
    this.$bus.$on('addSnrNow', this.UpdateSNR);
    this.$bus.$on('updateFocusMetrics', this.UpdateFocusMetrics);
    this.$bus.$on('showRoiImage', this.loadAndDisplayImage);
    // this.$bus.$on('setTargetPosition', this.setTargetPosition);
    this.$bus.$on('AutoFocusOver', this.AutoFocusOver);
    this.$bus.$on('getFocuserMoveState', this.getFocuserMoveState);
    this.$bus.$on('startFocusLoopFailed', this.startFocusLoopFailed);
    this.$bus.$on('setFocuserLoopingState', this.setFocuserLoopingState);
    this.$bus.$on('selectStarImage', this.selectStarImage);
    this.$bus.$on('setCurrentMainCanvasHasImage', this.setCurrentMainCanvasHasImage);
    this.$bus.$on('FocuserConnected', this.setFocuserIsConnected);
    this.$bus.$on('setRedBoxSideLength', this.setRedBoxSideLength);
    this.$bus.$on('syncROI_length', this.syncROI_length);
    // [停用 2026-04-14] 旧自动校准流程入口（StartCalibration -> 自动移动并设置行程）已停用，改为手动设置左右边界。
    // this.$bus.$on('StartCalibration', this.startCalibrationProcess);

    // [停用 2026-04-14] 旧自动校准完成回执已停用，保留历史代码以便回溯。
    // this.$bus.$on('focusSetTravelRangeSuccess', this.focusSetTravelRangeSuccess);
    this.$bus.$on('focusMoveFailed', this.focusMoveFailed);

    this.$bus.$on('updateAutoFocuserState', this.updateAutoFocuserState);  // 更新自动对焦状态
    this.$bus.$on('UpdateAutoFocusStep', this.handleAutoFocusStep);        // 自动对焦步骤变化
    this.$bus.$on('AutoFocusSNR', this.handleAutoFocusSNR);                // 自动对焦 SNR 结果

    // 自动对焦拍摄进度：来自 App.vue 的统一事件（AutoFocusCaptureProgressUI）
    this.$bus.$on('AutoFocusCaptureProgressUI', this.handleAutoFocusProgress);


    this.$bus.$on('focusMoveStep', this.StepsChange);
    // 当ui初始化完成,自动获取当前状态
    this.$bus.$emit('AppSendMessage', 'Vue_Command', 'getFocuserState');
  },
  methods: {
    updatePosition() {
      const screenWidth = window.innerWidth;
      const halfWidth = screenWidth / 2 - 250;
      this.ComponentPadding = Math.max(halfWidth, 170);
      // console.log('Updated Padding:', this.ComponentPadding);

      // 计算宽度
      const newWidth = screenWidth - (this.ComponentPadding * 2);
      // console.log('Update Focus Chart width:', newWidth);
      this.$bus.$emit('updateFocusChartWidth', newWidth);
      
    },
    AutoFocus() {
      if (this.manualCalibrationMode) return;
      const check = this.$canUseDevice('Focuser', 'AutoFocus');
      if (!check.allowed) return;
      if (!this.FocuserIsConnected) {
        this.$bus.$emit('showMsgBox', 'Focuser is not connected!', 'warning');
        return;
      }
      if (this.isMoveInProgress) {
        this.$bus.$emit('showMsgBox', 'Focuser is moving!', 'warning');
        return;
      }

      if (this.inAutoFocus) {
        this.inAutoFocus = false;
        // console.log('QHYCCD | StopAutoFocus');
        this.$bus.$emit('SendConsoleLogMsg', 'StopAutoFocus', 'info');
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'StopAutoFocus');
        this.$stopFeature(['Focuser'], 'AutoFocus')
      }else{
        this.inAutoFocus = true;
        this.$startFeature(['Focuser'], 'AutoFocus')
        this.$bus.$emit('ShowConfirmDialog','Confirm', 'Please confirm the auto focus mode', 'startAutoFocus');
      }
 
    },

    AutoFocusOver() {
      console.log('QHYCCD | AutoFocusOver');
      this.$bus.$emit('SendConsoleLogMsg', 'AutoFocusOver', 'info');
      this.inAutoFocus = false;
    },

    StepsChange(steps) {
      this.MoveSteps = steps;
      console.log('QHYCCD | StepsChange: ', this.MoveSteps);
    },

    SpeedChange() {
      if (this.manualCalibrationMode) return;
      if (!this.FocuserIsConnected) {
        this.$bus.$emit('showMsgBox', 'Focuser is not connected!', 'warning');
        return;
      }
      if (this.MoveSpeed === 1) this.MoveSpeed = 3;
      else if (this.MoveSpeed === 3) this.MoveSpeed = 5;
      else if (this.MoveSpeed === 5) this.MoveSpeed = 1;

      console.log('QHYCCD | SpeedChange: ', this.MoveSpeed);
      this.$bus.$emit('SendConsoleLogMsg', 'SpeedChange:' + this.MoveSpeed, 'info');
      if (this.MoveSpeed === 1) {
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'focusSpeed:0');
      } else {
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'focusSpeed:' + this.MoveSpeed);
      }
    },

    ROIChange() {
      if (this.manualCalibrationMode) return;
      if (this.ROI_length === 100) this.ROI_length = 300;
      else if (this.ROI_length === 300) this.ROI_length = 500;
      else if (this.ROI_length === 500) this.ROI_length = 100;

      this.syncROI_length();
    },
    setRedBoxSideLength(length) {
      if (length === '100' || length === 100) this.ROI_length = 100;
      else if (length === '300' || length === 300) this.ROI_length = 300;
      else if (length === '500' || length === 500) this.ROI_length = 500;
      else this.ROI_length = 300;
      console.log('QHYCCD | setRedBoxSideLength: ', this.ROI_length);
      this.syncROI_length();
    },
    // 同步ROI长度
    syncROI_length() {
      this.$bus.$emit('SendConsoleLogMsg', 'QHYCCD | ROIChange:' + this.ROI_length, 'info');
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'RedBoxSizeChange:' + this.ROI_length); // 更新qtserver中的RedBoxSideLength
      this.$bus.$emit('RedBoxSizeChange', this.ROI_length); // 更新gui.vue和app.vue中的RedBoxSideLength
    },

    removeLongPressCaptureListeners() {
      if (this.longPressCaptureCleanup) {
        this.longPressCaptureCleanup();
        this.longPressCaptureCleanup = null;
      }
    },

    FocusMove(direction) {
      if (!this.FocuserIsConnected) {
        this.$bus.$emit('showMsgBox', 'Focuser is not connected!', 'warning');
        return;
      }
      // 互斥检查：与自动对焦互斥（同设备互斥由全局模块处理）
      const check = this.$canUseDevice('Focuser', 'FocuserManualMove');
      if (!check.allowed) return;

      // 记录按下时间与方向
      this.moveStartTime = new Date().getTime();
      this.pressDirection = direction;
      this.isPressing = true;
      this.longPressTriggered = false;
      this.removeLongPressCaptureListeners();
      // 清理可能存在的定时器
      if (this.longPressTimer) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }

      // 200ms 后若仍按下则开始连续移动
      this.longPressTimer = setTimeout(() => {
        if (!this.isPressing || this.longPressTriggered) return;
        this.longPressTriggered = true;
        this.$bus.$emit('FocusInProgress', true);
        // 开始占用：手动移动
        this.$startFeature(['Focuser'], 'FocuserManualMove');
        if (this.pressDirection === 'left') {
          this.$bus.$emit('SendConsoleLogMsg', 'Focus Left Move:' + this.MoveSteps, 'info');
          this.$bus.$emit('AppSendMessage', 'Vue_Command', 'focusMove:' + 'Left');
        } else if (this.pressDirection === 'right') {
          this.$bus.$emit('SendConsoleLogMsg', 'Focus Right Move:' + this.MoveSteps, 'info');
          this.$bus.$emit('AppSendMessage', 'Vue_Command', 'focusMove:' + 'Right');
        }
        this.isMoveInProgress = true;
        const onPointerEnd = () => {
          this.FocusAbort();
        };
        window.addEventListener('pointerup', onPointerEnd, true);
        window.addEventListener('pointercancel', onPointerEnd, true);
        this.longPressCaptureCleanup = () => {
          window.removeEventListener('pointerup', onPointerEnd, true);
          window.removeEventListener('pointercancel', onPointerEnd, true);
        };
      }, 200);
    },

    FocusAbort() {
      this.removeLongPressCaptureListeners();
      const pressDuration = new Date().getTime() - this.moveStartTime;

      // 停止长按定时器
      if (this.longPressTimer) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }

      // 标记已松开
      const wasLongPress = this.longPressTriggered;
      const dir = this.pressDirection === 'left' ? 'Left' : (this.pressDirection === 'right' ? 'Right' : '');
      this.isPressing = false;

      if (!wasLongPress && pressDuration < 200) {
        // 短按：触发一次步进移动（启动后立刻停止，走点击逻辑）
        if (dir) {
          this.$bus.$emit('SendConsoleLogMsg', `Focus Click Move: ${this.MoveSteps} steps`, 'info');
          this.$bus.$emit('AppSendMessage', 'Vue_Command', 'focusMoveStep:' + dir + ':' + this.MoveSteps);
        }
      } else if (wasLongPress) {
        // 长按：停止连续移动
        this.$bus.$emit('SendConsoleLogMsg', 'Focus Abort', 'info');
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'focusMoveStop:false');
      }

      // 复位状态
      this.isMoveInProgress = false;
      this.$bus.$emit('FocusInProgress', false);
      this.longPressTriggered = false;
      this.pressDirection = '';
      // 释放占用：手动移动
      this.$stopFeature(['Focuser'], 'FocuserManualMove');
    },

    getFocuserMoveState() {
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'getFocuserMoveState:' + this.isMoveInProgress);
    },

    FocusLeftMove() {
      // this.isBtnMoveDisabled = true;
      // this.$bus.$emit('FocusInProgress', true);
      // this.$bus.$emit('SendConsoleLogMsg', 'Focus Left Move:' + this.MoveSteps, 'info');
      // this.$bus.$emit('AppSendMessage', 'Vue_Command', 'focusMove:' + "Left" + ":" + this.MoveSteps);
    },

    FocusRightMove() {
      // this.isBtnMoveDisabled = true;
      // this.$bus.$emit('FocusInProgress', true);
      // this.$bus.$emit('SendConsoleLogMsg', 'Focus Right Move:' + this.MoveSteps, 'info');
      // this.$bus.$emit('AppSendMessage', 'Vue_Command', 'focusMove:' + "Right" + ":" + this.MoveSteps);
    },

    ShowSpeedNum(speed) {
      this.MoveSpeed_ = speed;
    },

    ShowPositionNum(current, target) {
      this.CurrentPosition = current;
      // this.TargetPosition = target;
    },

    // setTargetPosition(target) {
    //   this.TargetPosition = parseInt(target, 10);
    // },

    // FocusGoto() {
    //   this.$bus.$emit('AppSendMessage', 'Vue_Command', 'focusMove:' + "Target" + ":" + this.TargetPosition);
    //   this.$bus.$emit('SendConsoleLogMsg', 'Focus Move to:' + this.TargetPosition, 'info');
    // },

    // MoveDone() {
    //   this.isBtnMoveDisabled = false;
    //   console.log('QHYCCD | FocusMoveDone');
    //   this.$bus.$emit('FocusInProgress', false);
    //   this.$bus.$emit('SendConsoleLogMsg', 'FocusMoveDone', 'info');
    // },

    UpdateFWHM(current, FWHM) {
      this.CurrentPosition = current;
      this.FWHM = FWHM;
    },

    UpdateSNR(SNR) {
      this.SNR = Number.isFinite(SNR) ? SNR.toFixed(2) : '0.00';
    },

    UpdateFocusMetrics(payload) {
      if (!payload || typeof payload !== 'object') return;
      const { snr, localMax, bgStd } = payload;
      if (Number.isFinite(snr)) this.SNR = snr.toFixed(2);
      if (Number.isFinite(localMax)) this.LocalMax = localMax.toFixed(0);
      if (Number.isFinite(bgStd)) this.BgStd = bgStd.toFixed(2);
    },

    // loadAndDisplayImage(file) {
    //   const imagePath = 'img/' + file;

    //   const canvas = document.getElementById('Focus-Canvas');
    //   if (canvas.getContext) {
    //     const ctx = canvas.getContext('2d');
    //     const img = new Image();

    //     img.onload = () => {
    //       canvas.width = img.width;
    //       canvas.height = img.height;
    //       ctx.clearRect(0, 0, canvas.width, canvas.height);
    //       ctx.drawImage(img, 0, 0);
    //     };
    //     // 添加错误处理
    //     img.onerror = (error) => {
    //       console.log(`加载图像失败: ${imagePath}`);
    //     };
    //     img.src = imagePath;
    //   }
    // },
    selectStarImage(imageData) {
      // console.log('QHYCCD | selectStarImage', imageData);
      const canvas = document.getElementById('Focus-Canvas');
      if (canvas.getContext) {
        canvas.width = imageData.width;
        canvas.height = imageData.height;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.putImageData(imageData, 0, 0);
      }
    },

    active() { },

    toggleLoopShooting() {
      if (this.manualCalibrationMode) return;
      // 视场 ROI 循环拍摄：互斥设备只占用主相机
      // 仅限制：ROI循环拍摄（主相机未绑定时禁止）
      if (!this.$store.getters['device/isDeviceBound']('MainCamera')) {
        this.$bus.$emit(
          'showMsgBox',
          this.$t('MainCameraNotBoundAction', { action: this.$t('Feature_ROILoopCapture') }),
          'error'
        );
        return;
      }
      const check = this.$canUseDevice('MainCamera', 'FocuserROILoop');
      if (!check.allowed) return;
      if (!this.currentMainCanvasHasImage) {
        this.$bus.$emit('showMsgBox', 'Please take a picture first!', 'warning');
        return;
      }
      this.isLoopActive = !this.isLoopActive;
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'FocusLoopShooting:' + this.isLoopActive);
      // this.$bus.$emit('setFocuserLoopingState', this.isLoopActive);
      this.$bus.$emit('disableCaptureButton', this.isLoopActive);
      if (this.isLoopActive) {
        // 只在主相机上登记该功能占用
        this.$startFeature(['MainCamera'], 'FocuserROILoop')
        this.$bus.$emit('setFocuserState', 'selectstars'); // 设置焦距状态为选择星点
        this.$bus.$emit('setShowSelectStar', true);
        this.$bus.$emit('setFocusChartTimeMode', true); // 切换图表模式：时间轴模式
      } else {
        this.$stopFeature(['MainCamera'], 'FocuserROILoop')
        this.$bus.$emit('setFocuserState', 'setROI'); // 设置焦距状态为设置ROI区域
        this.$bus.$emit('setShowSelectStar', false);
        this.$bus.$emit('setFocusChartTimeMode', false)
      }
      
    },
    startFocusLoopFailed(message) {
      this.isLoopActive = false;
      this.$bus.$emit('setFocusChartTimeMode', false)
      this.$bus.$emit('disableCaptureButton', this.isLoopActive);
      this.$bus.$emit('SendConsoleLogMsg', message, 'warning');
      this.$bus.$emit('setShowSelectStar', false);
    },
    setFocuserLoopingState(state) {
      if (state === 'true') {
        this.isLoopActive = true;
        this.$bus.$emit('setFocusChartTimeMode', true);
        this.$bus.$emit('setShowSelectStar', true);
        // 与按钮逻辑保持一致：只占用主相机
        this.$startFeature(['MainCamera'], 'FocuserROILoop')
      }
      else {
        this.isLoopActive = false;
        this.$bus.$emit('setShowSelectStar', false);
        this.$bus.$emit('setFocusChartTimeMode', false)
        this.$stopFeature(['MainCamera'], 'FocuserROILoop')
      }
      this.$bus.$emit('disableCaptureButton', this.isLoopActive);
    },

    setCurrentMainCanvasHasImage(hasImage) {
      this.currentMainCanvasHasImage = hasImage;
    },
    setFocuserIsConnected(isConnected) {
      if (isConnected == 1) {
        this.FocuserIsConnected = true;
      } else {
        this.FocuserIsConnected = false;
      }
    },

    // 校准相关方法（手动边界设置）
    startCalibration() {
      try {
        if (!this.FocuserIsConnected) {
          this.$bus.$emit('showMsgBox', 'Focuser is not connected!', 'warning');
          return;
        }

        if (!this.manualCalibrationMode) {
          this.manualCalibrationMode = true;
          this.isCalibrating = true;
          this.calibrationState = 'running';
          this.calibrationStep = 0;
          this.calibrationMessage = this.$t('Please use the left/right move buttons to move the focuser manually, then set the left and right boundaries.');
          this.manualCalibrationLeftSet = false;
          this.manualCalibrationRightSet = false;
          this.manualCalibrationLeftValue = null;
          this.manualCalibrationRightValue = null;
          this.showManualCalibrationDialog = true;
          this.$bus.$emit('SendConsoleLogMsg', this.$t('Manual focuser calibration mode started'), 'info');
          return;
        }

        this.endCalibration();
      } catch (error) {
        console.error('Error in startCalibration:', error);
      }
    },

    setManualLeftBoundary() {
      const currentPosition = parseInt(this.CurrentPosition, 10);
      if (!Number.isFinite(currentPosition)) {
        return;
      }
      if (this.manualCalibrationRightSet && currentPosition >= this.manualCalibrationRightValue) {
        this.$bus.$emit('showMsgBox', this.$t('Left boundary must be smaller than right boundary.'), 'warning');
        return;
      }
      this.manualCalibrationLeftSet = true;
      this.manualCalibrationLeftValue = currentPosition;
      this.$bus.$emit('Min Limit', 'Min Limit:' + currentPosition);
      this.$bus.$emit('SendConsoleLogMsg', this.$t('Left boundary set to {0}', [currentPosition]), 'info');
    },

    setManualRightBoundary() {
      const currentPosition = parseInt(this.CurrentPosition, 10);
      if (!Number.isFinite(currentPosition)) {
        return;
      }
      if (this.manualCalibrationLeftSet && currentPosition <= this.manualCalibrationLeftValue) {
        this.$bus.$emit('showMsgBox', this.$t('Right boundary must be greater than left boundary.'), 'warning');
        return;
      }
      this.manualCalibrationRightSet = true;
      this.manualCalibrationRightValue = currentPosition;
      this.$bus.$emit('Max Limit', 'Max Limit:' + currentPosition);
      this.$bus.$emit('SendConsoleLogMsg', this.$t('Right boundary set to {0}', [currentPosition]), 'info');
    },

    openManualCalibrationDialog() {
      if (this.manualCalibrationMode) {
        this.showManualCalibrationDialog = true;
      }
    },

    endCalibration() {
      try {
        if (this.manualCalibrationMode && (!this.manualCalibrationLeftSet || !this.manualCalibrationRightSet)) {
          this.$bus.$emit('showMsgBox', this.$t('Manual calibration boundaries are incomplete; you can continue later or end now.'), 'warning');
        }
        console.log('Ending manual calibration, current state:', this.calibrationState);
        this.manualCalibrationMode = false;
        this.showManualCalibrationDialog = false;
        this.isCalibrating = false;
        this.calibrationState = 'idle';
        this.calibrationStep = 0;
        this.calibrationMessage = '';
        this.$bus.$emit('SendConsoleLogMsg', this.$t('Manual focuser calibration mode ended'), 'info');
        this.$bus.$emit('EndCalibration');
      } catch (error) {
        console.error('Error in endCalibration:', error);
      }
    },

    // 处理电调移动失败
    focusMoveFailed(errorMessage) {
      console.log('Focus move failed:', errorMessage);

      // 重置校准状态
      this.isCalibrating = false;
      this.calibrationState = 'error';
      this.calibrationStep = 0;
      this.calibrationMessage = '';
      // 通知App.vue结束校准
      this.$bus.$emit('EndCalibration');
    },

    // [停用 2026-04-14] 旧自动校准方法保留（注释），用于历史回溯：
    /*
    startCalibrationProcess() {
      // 旧流程：StartCalibration -> nextCalibrationStep() -> focusMoveToMin/focusMoveToMax/focusSetTravelRange
    },
    nextCalibrationStep() {
      // 旧流程：自动推进 1/2/3 步
    },
    focusSetTravelRangeSuccess() {
      // 旧流程：接收 focusSetTravelRangeSuccess 后自动完成
    },
    */
    updateAutoFocuserState(state) {
      this.inAutoFocus = state;
    },

    // 处理自动对焦步骤变化（更新内部状态，方便以后在面板上展示）
    handleAutoFocusStep(step, description) {
      // 这里暂时只在控制台输出和记录，以后可扩展为在 UI 上显示步骤
      console.log('AutoFocus step:', step, description);
      // 也可以在这里根据 step 更新某些本地状态，用于在 FocuserPanel 上显示
    },

    // 处理自动对焦各阶段拍摄进度，在对焦控制区域旁边展示
    handleAutoFocusProgress(payload) {
      try {
        const { stage, current, total, mode } = payload || {};
        this.autoFocusStage = stage || '';
        this.autoFocusCurrentShot = current || 0;
        this.autoFocusTotalShots = total || 0;
        this.autoFocusMode = mode || 'full';
      } catch (e) {
        console.error('Error in handleAutoFocusProgress:', e);
      }
    },

    // 处理来自后端的 SNR 结果，在前端弹出提示
    handleAutoFocusSNR(payload) {
      try {
        const { stage, index, position, snr } = payload || {};
        const stageText = stage === 'coarse'
          ? this.$t('Coarse focus')
          : (stage === 'fine' ? this.$t('Fine focus') : stage);
        const msg = this.$t('{stage} image #{index} at position {pos}, avg_top50_snr = {snr}', {
          stage: stageText,
          index: index || 0,
          pos: position || 0,
          snr: (snr !== undefined && snr !== null) ? snr.toFixed(4) : '0.0000'
        });
        this.$bus.$emit('showMsgBox', msg, 'info');
      } catch (e) {
        console.error('Error in handleAutoFocusSNR:', e);
      }
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

.focus-chart {
  position: absolute;
  bottom: 1px;
  left: 5px;
}

.image-chart {
  position: absolute;
  bottom: 1px;
  right: 0px;
}

.buttons-container {
  display: flex;
  justify-content: space-between;
  position: absolute;
  top: -39px;
  left: 5px;
  right: 5px;
}

.manual-calibration-modal {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 20;
  width: 330px;
  padding: 10px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(20, 20, 20, 0.88);
  color: #f8f8f8;
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.35);
}

.manual-calibration-title {
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 6px;
}

.manual-calibration-desc,
.manual-calibration-pos,
.manual-calibration-status {
  font-size: 11px;
  line-height: 1.35;
  margin-bottom: 6px;
}

.manual-calibration-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.manual-calibration-btn {
  font-size: 11px;
  color: #fefefe;
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  padding: 5px 8px;
  cursor: pointer;
}

.manual-calibration-btn:hover {
  background: rgba(255, 255, 255, 0.22);
}

/* 自动对焦进度文本与动画：位于按钮下方，靠右对齐 */
.auto-focus-inline-progress {
  position: absolute;
  top: -14px;              /* 位于按钮行正下方 */
  right: 10px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  color: #FFD27F;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
  pointer-events: none;    /* 不影响按钮点击 */
}

.auto-focus-spinner {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid rgba(255, 165, 0, 0.35);
  border-top-color: #FFA500;
  border-right-color: #FFA500;
  background-color: transparent;
  box-shadow: 0 0 6px rgba(255, 165, 0, 0.8);
  animation: autofocus-inline-spin 0.9s linear infinite;
}

.auto-focus-inline-text {
  white-space: nowrap;
}

@keyframes autofocus-inline-spin {
  0% {
    transform: rotate(0deg);
  }
  50% {
    transform: rotate(180deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.btn-Speed {
  width: 30px;
  height: 30px;

  user-select: none;
  background-color: rgba(64, 64, 64, 0.5);
  backdrop-filter: blur(5px);
  border: none;
  border-radius: 50%;
  box-sizing: border-box;
}

.btn-Left {
  width: 30px;
  height: 30px;

  user-select: none;
  background-color: rgba(64, 64, 64, 0.5);
  backdrop-filter: blur(5px);
  border: none;
  border-radius: 50%;
  box-sizing: border-box;
}

.btn-ROI {
  width: 30px;
  height: 30px;

  user-select: none;
  background-color: rgba(64, 64, 64, 0.5);
  backdrop-filter: blur(5px);
  border: none;
  border-radius: 50%;
  box-sizing: border-box;
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

.btn-Right {
  width: 30px;
  height: 30px;

  user-select: none;
  background-color: rgba(64, 64, 64, 0.5);
  backdrop-filter: blur(5px);
  border: none;
  border-radius: 50%;
  box-sizing: border-box;
}

.btn-Steps {
  width: 30px;
  height: 30px;

  user-select: none;
  background-color: rgba(64, 64, 64, 0.5);
  backdrop-filter: blur(5px);
  border: none;
  border-radius: 50%;
  box-sizing: border-box;
}

.btn-Goto {
  width: 30px;
  height: 30px;

  user-select: none;
  background-color: rgba(64, 64, 64, 0.5);
  backdrop-filter: blur(5px);
  border: none;
  border-radius: 50%;
  box-sizing: border-box;
}

.btn-loop-shooting:active,
.btn-Auto:active,
.btn-Left:active,
.btn-Right:active,
.btn-Steps:active,
.btn-Speed:active,
.btn-Goto:active {
  transform: scale(0.95);
  /* 点击时缩小按钮 */
  background-color: rgba(255, 255, 255, 0.7);
}

.Canvas-Bar {
  position: absolute;
  bottom: 13px;
  right: 7px;

  width: 61px;
  height: 60px;

  user-select: none;
  background-color: rgba(0, 0, 0, 0.0);
  /* backdrop-filter: blur(5px); */
  border: 1px solid rgba(128, 128, 128, 1);
  /* border-radius: 5px;  */
  box-sizing: border-box;
}

.Speed-Bar {
  position: absolute;
  top: 0px;
  left: 5px;

  width: 30px;
  height: 10px;

  user-select: none;
  background-color: rgba(0, 0, 0, 0.0);
  /* backdrop-filter: blur(5px); */
  border: none;
  border-radius: 5px;
  box-sizing: border-box;

  text-align: center;
  line-height: 10px;
  white-space: nowrap;

}

.State-Bar {
  position: absolute;
  top: 0px;
  height: 10px;

  user-select: none;
  background-color: rgba(0, 0, 0, 0.0);
  /* backdrop-filter: blur(5px); */
  border: none;
  border-radius: 5px;
  box-sizing: border-box;

  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 10px;

  text-align: center;
  white-space: nowrap;
}

.State-BarLine {
  width: 100%;
  line-height: 10px;
  text-align: center;
}

.Steps-Bar {
  position: absolute;
  top: 0px;
  right: 5px;

  width: 30px;
  height: 10px;

  user-select: none;
  background-color: rgba(0, 0, 0, 0.0);
  /* backdrop-filter: blur(5px); */
  border: none;
  border-radius: 5px;
  box-sizing: border-box;

  text-align: center;
  line-height: 10px;
  white-space: nowrap;
}

#Focus-Canvas {
  width: 59px;
  height: 58px;
  position: absolute;
  top: 0px;
  left: 0px;
  background-color: rgba(0, 0, 0, 0.0);
}

.btn-calibration {
  width: 30px;
  height: 30px;

  user-select: none;
  background-color: rgba(64, 64, 64, 0.5);
  backdrop-filter: blur(5px);
  border: none;
  border-radius: 50%;
  box-sizing: border-box;
}

.active-calibration {
  background-color: orange;
  /* 校准时的背景色 */
}

.complete-calibration {
  background-color: green;
  /* 校准完成时的背景色 */
}

.error-calibration {
  background-color: red;
  /* 校准错误时的背景色 */
}

.btn-loop-shooting {
  width: 30px;
  height: 30px;

  user-select: none;
  background-color: rgba(64, 64, 64, 0.5);
  backdrop-filter: blur(5px);
  border: none;
  border-radius: 50%;
  box-sizing: border-box;
}

.active-loop {
  background-color: rgb(40, 71, 40);
  /* 激活时的背景色 */
}

.rotate-animation {
  animation: rotate 2s linear infinite;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

.pulse-animation {
  animation: pulse 1.5s ease-in-out infinite alternate;
}

@keyframes pulse {
  from {
    transform: scale(1);
  }
  to {
    transform: scale(1.1);
  }
}


</style>
