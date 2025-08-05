<template>
  <transition name="panel">
    <div class="chart-panel"
      :style="{ bottom: bottom + 'px', left: ComponentPadding + 'px', right: ComponentPadding + 'px', height: height + 'px' }">
      <ImageChart ref="imagechart" class="image-chart" />
      <FocusChart ref="focuschart" class="focus-chart" />

      <div class="buttons-container">

        <button @click="startCalibration" :class="{'btn-calibration': true, 'active-calibration': isCalibrating, 'complete-calibration': calibrationState === 'complete', 'error-calibration': calibrationState === 'error'}" class="get-click">
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

        <button @click="toggleLoopShooting" :class="{'btn-loop-shooting': true, 'active-loop': isLoopActive}" class="get-click">
          <div style="display: flex; justify-content: center; align-items: center;">
            <img :src="require(isLoopActive ? '@/assets/images/svg/ui/ROI-Capturing.svg' : '@/assets/images/svg/ui/ROI-Capture.svg')" height="25px"
              :class="{'rotate-animation': isLoopActive}"
              style="min-height: 25px; pointer-events: none;"></img>
          </div>
        </button>

        <!-- <button  @click="SpeedChange" @touchend="active" class="get-click btn-Speed"><v-icon>mdi-run-fast</v-icon></button> -->
        <button @click="SpeedChange" @touchend="active" class="get-click btn-Speed">
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

        <button @click="ROIChange" @touchend="active" class="get-click btn-ROI">
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

        <!-- <button :disabled="isBtnMoveDisabled" @click="FocusLeftMove" @touchend="active" class="get-click btn-Left">
        <div style="display: flex; justify-content: center; align-items: center;">
          <img src="@/assets/images/svg/ui/arrow-left-circle.svg" height="20px" style="min-height: 20px; pointer-events: none;"></img>
        </div>
      </button> -->
        <button :disabled="isBtnMoveDisabled" @mousedown="FocusMove('left')" @mouseup="FocusAbort" @mouseleave="FocusAbort"
          @touchstart="FocusMove('left')" @touchend="FocusAbort" @touchcancel="FocusAbort" class="get-click btn-Left">
          <div style="display: flex; justify-content: center; align-items: center;">
            <img src="@/assets/images/svg/ui/arrow-left-circle.svg" height="20px"
              style="min-height: 20px; pointer-events: none;"></img>
          </div>
        </button>

        <!-- <button  @click="AutoFocus" @touchend="active" class="get-click btn-Auto"><v-icon>mdi-focus-auto</v-icon></button> -->
        <button @click="AutoFocus" @touchend="active" class="get-click btn-Auto">
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

        <!-- <button @click="FocusGoto" @touchend="active" class="get-click btn-Goto">
          <div style="display: flex; justify-content: center; align-items: center;">
            <img src="@/assets/images/svg/ui/Move.svg" height="10px"
              style="min-height: 10px; pointer-events: none;"></img>
          </div>
        </button> -->
        <!-- <button :disabled="isBtnMoveDisabled" @click="FocusRightMove" @touchend="active" class="get-click btn-Right">
          <div style="display: flex; justify-content: center; align-items: center;">
            <img src="@/assets/images/svg/ui/arrow-right-circle.svg" height="20px"
              style="min-height: 20px; pointer-events: none;"></img>
          </div>
        </button> -->

        <button :disabled="isBtnMoveDisabled" @mousedown="FocusMove('right')" @mouseup="FocusAbort" @mouseleave="FocusAbort"
          @touchstart="FocusMove('right')" @touchend="FocusAbort" @touchcancel="FocusAbort" class="get-click btn-Right">
          <div style="display: flex; justify-content: center; align-items: center;">
            <img src="@/assets/images/svg/ui/arrow-right-circle.svg" height="20px"
              style="min-height: 20px; pointer-events: none;"></img>
          </div>
        </button>

        <!-- <button @click="StepsChange" @touchend="active" class="get-click btn-Steps">
          <span v-if="MoveSteps === 100">
            <div style="display: flex; justify-content: center; align-items: center;">
              <img src="@/assets/images/svg/ui/step_100.svg" height="25px"
                style="min-height: 25px; pointer-events: none;"></img>
            </div>
          </span>
          <span v-if="MoveSteps === 500">
            <div style="display: flex; justify-content: center; align-items: center;">
              <img src="@/assets/images/svg/ui/step_500.svg" height="25px"
                style="min-height: 25px; pointer-events: none;"></img>
            </div>
          </span>
          <span v-if="MoveSteps === 1000">
            <div style="display: flex; justify-content: center; align-items: center;">
              <img src="@/assets/images/svg/ui/step_1000.svg" height="25px"
                style="min-height: 25px; pointer-events: none;"></img>
            </div>
          </span>
          <span v-if="MoveSteps === 5000">
            <div style="display: flex; justify-content: center; align-items: center;">
              <img src="@/assets/images/svg/ui/step_5000.svg" height="25px"
                style="min-height: 25px; pointer-events: none;"></img>
            </div>
          </span>
          <span v-if="MoveSteps === 10000">
            <div style="display: flex; justify-content: center; align-items: center;">
              <img src="@/assets/images/svg/ui/step_10000.svg" height="25px"
                style="min-height: 25px; pointer-events: none;"></img>
            </div>
          </span>
        </button> -->
      </div>

      <div class="Canvas-Bar">
        <canvas ref="FocusCanvas" id="Focus-Canvas"></canvas>
      </div>

      <div class="Speed-Bar" :style="{ fontSize: '8px' }">
        {{ this.MoveSpeed_ }}
      </div>

      <div class="State-Bar" :style="{ left: 80 + 'px', right: 80 + 'px', fontSize: '8px' }">
        <div style="text-align: left;"> Current:{{ this.CurrentPosition }}</div>
        <div style="text-align: center;"> FWHM:{{ this.FWHM }}</div>
        <!-- <div style="text-align: right;">Target:{{ this.TargetPosition }} </div> -->
      </div>

      <div class="Steps-Bar" :style="{ fontSize: '8px' }">
        {{ this.MoveSteps }}
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

      MoveSteps: 100,
      MoveSpeed: 1,
      MoveSpeed_: 1,

      CurrentPosition: 0,
      // TargetPosition: 0,
      FWHM: 0,

      isBtnMoveDisabled: false, // 调焦按钮是否禁用
      isMoveInProgress: false, // 调焦是否进行中

      inAutoFocus: false, // 自动对焦是否开启
      isLoopActive: false, // 新增状态控制循环拍摄是否激活

      currentMainCanvasHasImage: false,


      ROI_length: 300,

      FocuserIsConnected: false,

      moveStartTime: 0,  // 电调移动按下时间记录

      // 校准相关数据
      isCalibrating: false, // 是否正在校准
      calibrationStep: 0, // 校准步骤 (1-3)
      calibrationMessage: '', // 校准提示信息
      calibrationState: 'idle', // 校准状态: 'idle', 'running', 'complete'

    };
  },
  components: {
    FocusChart,
    ImageChart
  },
  mounted() {
    this.updatePosition(); // 初始化位置
    window.addEventListener('resize', this.updatePosition);
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.updatePosition);
  },
  created() {
    // this.$bus.$on('AutoHistogramNum', this.setAutoHistogramNum);
    this.$bus.$on('FocusChangeSpeedSuccess', this.ShowSpeedNum);
    this.$bus.$on('FocusPosition', this.ShowPositionNum);
    // this.$bus.$on('FocusMoveDone', this.MoveDone);
    this.$bus.$on('UpdateFWHM', this.UpdateFWHM);
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
    this.$bus.$on('StartCalibration', this.startCalibrationProcess);
    this.$bus.$on('focusSetTravelRangeSuccess', this.focusSetTravelRangeSuccess);
    this.$bus.$on('focusMoveFailed', this.focusMoveFailed);
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
      }
      else {
        console.log('QHYCCD | StartAutoFocus');
        this.$bus.$emit('SendConsoleLogMsg', 'StartAutoFocus', 'info');
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'ClearDataPoints');
        this.$bus.$emit('ClearAllData');

        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'AutoFocus');

        this.inAutoFocus = true;
      }
    },

    AutoFocusOver() {
      console.log('QHYCCD | AutoFocusOver');
      this.$bus.$emit('SendConsoleLogMsg', 'AutoFocusOver', 'info');
      this.inAutoFocus = false;
    },

    StepsChange() {
      if (!this.FocuserIsConnected) {
        this.$bus.$emit('showMsgBox', 'Focuser is not connected!', 'warning');
        return;
      }
      if (this.MoveSteps === 100) this.MoveSteps = 500;
      else if (this.MoveSteps === 500) this.MoveSteps = 1000;
      else if (this.MoveSteps === 1000) this.MoveSteps = 5000;
      else if (this.MoveSteps === 5000) this.MoveSteps = 10000;
      else if (this.MoveSteps === 10000) this.MoveSteps = 100;

      console.log('QHYCCD | StepsChange: ', this.MoveSteps);
      // this.$bus.$emit('SendConsoleLogMsg', 'StepsChange:' + this.MoveSteps, 'info');
    },

    SpeedChange() {
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
      if (this.ROI_length === 100) this.ROI_length = 300;
      else if (this.ROI_length === 300) this.ROI_length = 500;
      else if (this.ROI_length === 500) this.ROI_length = 100;

      this.syncROI_length();
    },
    setRedBoxSideLength(length) {
      if (length === '100') this.ROI_length = 100;
      else if (length === '300') this.ROI_length = 300;
      else if (length === '500') this.ROI_length = 500;
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

    FocusMove(direction) {
      if (!this.FocuserIsConnected) {
        this.$bus.$emit('showMsgBox', 'Focuser is not connected!', 'warning');
        return;
      }
      if (this.inAutoFocus) return;
      
      // 记录按下时间
      this.moveStartTime = new Date().getTime();
      
      if (direction === 'left') {
        this.$bus.$emit('FocusInProgress', true);
        this.$bus.$emit('SendConsoleLogMsg', 'Focus Left Move:' + this.MoveSteps, 'info');
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'focusMove:' + "Left");
        this.isMoveInProgress = true;
      }
      else if (direction === 'right') {
        this.$bus.$emit('FocusInProgress', true);
        this.$bus.$emit('SendConsoleLogMsg', 'Focus Right Move:' + this.MoveSteps, 'info');
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'focusMove:' + "Right");
        this.isMoveInProgress = true;
      }
    },

    FocusAbort() {
      if (!this.isMoveInProgress) return;
      const pressDuration = new Date().getTime() - this.moveStartTime;
      this.isMoveInProgress = false;
      this.$bus.$emit('FocusInProgress', false);
      
      // 区分点按和长按
      if (pressDuration < 200) {
        // 点按操作 - 移动固定步数
        this.$bus.$emit('SendConsoleLogMsg', `Focus Click Move: ${this.MoveSteps} steps`, 'info');
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'focusMoveStop:true');
      } else {
        // 长按操作 - 停止连续移动
        this.$bus.$emit('SendConsoleLogMsg', 'Focus Abort', 'info');
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'focusMoveStop:false');
      }
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
      if (!this.currentMainCanvasHasImage) {
        this.$bus.$emit('showMsgBox', 'Please take a picture first!', 'warning');
        return;
      }
      this.isLoopActive = !this.isLoopActive;
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'FocusLoopShooting:' + this.isLoopActive);
      // this.$bus.$emit('setFocuserLoopingState', this.isLoopActive);
      this.$bus.$emit('disableCaptureButton', this.isLoopActive);
      if (this.isLoopActive) {
        this.$bus.$emit('setFocuserState', 'selectstars'); // 设置焦距状态为选择星点
        this.$bus.$emit('setShowSelectStar', true);
      } else {
        this.$bus.$emit('setFocuserState', 'setROI'); // 设置焦距状态为设置ROI区域
        this.$bus.$emit('setShowSelectStar', false);
      }
    },
    startFocusLoopFailed(message) {
      this.isLoopActive = false;
      this.$bus.$emit('disableCaptureButton', this.isLoopActive);
      this.$bus.$emit('SendConsoleLogMsg', message, 'warning');
      this.$bus.$emit('setShowSelectStar', false);
    },
    setFocuserLoopingState(state) {
      if (state === 'true') {
        this.isLoopActive = true;
        this.$bus.$emit('setShowSelectStar', true);
      }
      else {
        this.isLoopActive = false;
        this.$bus.$emit('setShowSelectStar', false);
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

    // 校准相关方法
    startCalibration() {
      try {
        if (!this.FocuserIsConnected) {
          this.$bus.$emit('showMsgBox', 'Focuser is not connected!', 'warning');
          return;
        }
        
        if (this.calibrationState === 'complete') {
          // 如果校准完成，点击按钮结束校准
          this.endCalibration();
        } else if (this.isCalibrating) {
          // 如果正在校准，点击按钮进入下一步
          this.nextCalibrationStep();
        } else {
                  // 开始校准，显示确认对话框
        this.$bus.$emit('ShowConfirmDialog', 'Calibration', this.$t('Do you want to perform focuser travel calibration? Calibration will set the maximum and minimum positions of the focuser.'), 'StartCalibration');
        }
      } catch (error) {
        console.error('Error in startCalibration:', error);
      }
    },

    nextCalibrationStep() {
      this.calibrationStep++;
      console.log('Calibration step:', this.calibrationStep, 'State:', this.calibrationState);
      
      if (this.calibrationStep === 1) {
        // 第一步：移动到最小位置并设置最小位置
        this.calibrationMessage = this.$t('Please observe if the focuser has moved to the minimum position. If it has reached the position, click the calibration button to set the minimum position');
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'focusMoveToMin');
        this.$bus.$emit('SendConsoleLogMsg', 'Calibration Step 1: Moving to minimum position', 'info');
        // 通知App.vue更新校准信息
        this.$bus.$emit('UpdateCalibrationInfo', this.calibrationStep, this.calibrationMessage);
      } else if (this.calibrationStep === 2) {
        // 第二步：移动到最大位置并设置最大位置
        this.calibrationMessage = this.$t('Please observe if the focuser has moved to the maximum position. If it has reached the position, click the calibration button to set the maximum position');
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'focusMoveToMax');
        this.$bus.$emit('SendConsoleLogMsg', 'Calibration Step 2: Moving to maximum position', 'info');
        // 通知App.vue更新校准信息
        this.$bus.$emit('UpdateCalibrationInfo', this.calibrationStep, this.calibrationMessage);
      } else if (this.calibrationStep === 3) {
        // 第三步：校准完成，设置行程范围
        this.calibrationState = 'complete';
        this.calibrationMessage = this.$t('Calibration completed! Focuser travel range has been set. Click the button to end calibration');
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'focusSetTravelRange');
        this.$bus.$emit('SendConsoleLogMsg', 'Calibration Step 3: Travel range set successfully', 'success');
        // 通知App.vue更新校准信息
        this.$bus.$emit('UpdateCalibrationInfo', this.calibrationStep, this.calibrationMessage, 'complete');
      }
    },

    startCalibrationProcess() {
      this.isCalibrating = true;
      this.calibrationState = 'running';
      this.calibrationStep = 0;
      this.calibrationMessage = this.$t('Preparing to start focuser travel calibration...');
      console.log('Calibration started:', this.isCalibrating, this.calibrationState);
      this.$bus.$emit('SendConsoleLogMsg', 'Starting focuser travel range calibration', 'info');
      
      // 通知App.vue更新校准信息
      this.$bus.$emit('UpdateCalibrationInfo', 0, 'Preparing to start focuser travel calibration...', 'running');
      
      // 延迟开始第一步
      const self = this;
      setTimeout(() => {
        self.nextCalibrationStep();
      }, 1000);
    },



    endCalibration() {
      try {
        console.log('Ending calibration, current state:', this.calibrationState);
        this.isCalibrating = false;
        this.calibrationState = 'idle';
        this.calibrationStep = 0;
        this.calibrationMessage = '';
        this.$bus.$emit('SendConsoleLogMsg', 'Focuser travel range calibration ended', 'info');
        // 通知App.vue结束校准
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

    // 处理设置行程范围成功
    focusSetTravelRangeSuccess() {
      console.log('Focus set travel range success');
      this.$bus.$emit('SendConsoleLogMsg', 'Focuser travel range set successfully', 'success');
      // 校准完成，重置状态
      this.isCalibrating = false;
      this.calibrationState = 'complete';
      this.calibrationStep = 3;
      this.calibrationMessage = this.$t('Calibration completed! Focuser travel range has been set. Click the button to end calibration');
      // 通知App.vue更新校准信息
      this.$bus.$emit('UpdateCalibrationInfo', this.calibrationStep, this.calibrationMessage, 'complete');
      setTimeout(() => {
        this.$bus.$emit('EndCalibration');
      }, 1000);
    }
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
  justify-content: space-between;
  font-size: 10px;

  text-align: center;
  line-height: 10px;
  white-space: nowrap;
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
  background-color: rgba(64, 64, 64, 0.5);
  /* 默认背景色 */
  backdrop-filter: blur(5px);
  border: none;
  border-radius: 5px;
  padding: 5px 10px;
}

.active-loop {
  background-color: green;
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
