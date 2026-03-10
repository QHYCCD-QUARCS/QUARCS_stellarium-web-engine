<template>
  <transition name="panel">
    <div
      class="capture-panel"
      :style="{ bottom: bottom + 'px', left: left + 'px', width: width + 'px', height: height + 'px' }"
      data-testid="cp-panel"
    >
      <span
        style="position: absolute; top: 4%; left: 50%; transform: translate(-50%, -50%); font-size: 10px; color: rgba(255, 255, 255, 0.5); user-select: none;"
        data-testid="cp-camera-temperature"
      >
        {{ CameraTemperature }}
      </span>

      <div class="Direction-Btn" data-testid="cp-direction-controls">
        <button
          class="ExpTime-minus no-select"
          @click="handleExpTimeButtonClick('minus')"
          data-testid="cp-btn-exptime-minus"
        >
          <span class="ExpTime-minus-icon" data-testid="cp-icon-exptime-minus">
            <v-icon>mdi-menu-up</v-icon>
          </span>
        </button>

        <button
          class="ExpTime-plus no-select"
          @click="handleExpTimeButtonClick('plus')"
          data-testid="cp-btn-exptime-plus"
        >
          <span class="ExpTime-plus-icon" data-testid="cp-icon-exptime-plus">
            <v-icon>mdi-menu-up</v-icon>
          </span>
        </button>

        <button
          class="CFW-minus no-select"
          :disabled="cfwButtonsDisabled"
          @click="handleCFWButtonClick('minus')"
          data-testid="cp-btn-cfw-minus"
          :data-state="cfwButtonsDisabled ? 'disabled' : 'enabled'"
        >
          <span class="CFW-minus-icon" data-testid="cp-icon-cfw-minus">
            <v-icon>mdi-menu-down</v-icon>
          </span>
        </button>

        <button
          class="CFW-plus no-select"
          :disabled="cfwButtonsDisabled"
          @click="handleCFWButtonClick('plus')"
          data-testid="cp-btn-cfw-plus"
          :data-state="cfwButtonsDisabled ? 'disabled' : 'enabled'"
        >
          <span class="CFW-plus-icon" data-testid="cp-icon-cfw-plus">
            <v-icon>mdi-menu-down</v-icon>
          </span>
        </button>

        <span
          class="text-ExpTime-content"
          ref="expTimeContent"
          data-testid="cp-exptime-value"
          :data-value="ExpTimes[currentExpTimeIndex]"
        >
          {{ ExpTimes[currentExpTimeIndex] }}
        </span>

        <div
          class="cfw-display"
          :class="{ moving: isCFWMoving }"
          data-testid="cp-cfw-display"
          :data-state="isCFWMoving ? 'moving' : 'stable'"
        >
          <!-- 方案 C：点阵旋转（不遮挡数字） -->
          <div v-if="isCFWMoving" class="cfw-dots" aria-hidden="true" data-testid="cp-cfw-moving-dots">
            <div class="cfw-dots-rotor" data-testid="cp-cfw-moving-rotor">
              <span class="cfw-dot" style="--i:0" data-testid="cp-cfw-dot-0"></span>
              <span class="cfw-dot" style="--i:1" data-testid="cp-cfw-dot-1"></span>
              <span class="cfw-dot" style="--i:2" data-testid="cp-cfw-dot-2"></span>
              <span class="cfw-dot" style="--i:3" data-testid="cp-cfw-dot-3"></span>
              <span class="cfw-dot" style="--i:4" data-testid="cp-cfw-dot-4"></span>
              <span class="cfw-dot" style="--i:5" data-testid="cp-cfw-dot-5"></span>
              <span class="cfw-dot" style="--i:6" data-testid="cp-cfw-dot-6"></span>
              <span class="cfw-dot" style="--i:7" data-testid="cp-cfw-dot-7"></span>
            </div>
          </div>

          <span
            class="text-CFW-content"
            ref="CFWContent"
            data-testid="cp-cfw-value"
            :data-value="CFWs[currentCFWIndex]"
          >
            {{ CFWs[currentCFWIndex] }}
          </span>
        </div>
      </div>

      <div data-testid="cp-capture">
        <CircularProgressButton class="btn-Capture" data-testid="cp-btn-capture" />
      </div>

      <div data-testid="cp-secondary-panels">
        <button
          class="custom-button btn-focus no-select"
          @click="toggleFocuserPanel"
          data-testid="cp-btn-toggle-focuser"
        >
          <div style="display: flex; justify-content: center; align-items: center;" data-testid="cp-btn-toggle-focuser-content">
            <img
              src="@/assets/images/svg/ui/focuser.svg"
              height="45px"
              style="min-height: 45px; pointer-events: none;"
              data-testid="cp-img-focuser"
            />
          </div>
        </button>

        <button
          class="custom-button btn-hist no-select"
          @click="toggleHistogramPanel"
          data-testid="cp-btn-toggle-histogram"
        >
          <div style="display: flex; justify-content: center; align-items: center;" data-testid="cp-btn-toggle-histogram-content">
            <img
              src="@/assets/images/svg/ui/histo.svg"
              height="45px"
              style="min-height: 45px; pointer-events: none;"
              data-testid="cp-img-histogram"
            />
          </div>
        </button>
      </div>

      <div
        data-testid="cp-status"
        :data-state="isIDLE ? 'idle' : 'busy'"
      >
        <span class="icon-container" data-testid="cp-status-icon">
          <div style="display: flex; justify-content: center; align-items: center;" data-testid="cp-status-icon-content">
            <img
              :src="require(isIDLE ? '@/assets/images/svg/ui/Status-idle.svg' : '@/assets/images/svg/ui/Status-busy.svg')"
              height="15px"
              style="min-height: 15px; pointer-events: none;"
              data-testid="cp-img-status"
            />
          </div>
        </span>
      </div>

      <div data-testid="cp-save">
        <button class="btn-save no-select" @click="CaptureImageSave" data-testid="cp-btn-save">
          <div style="display: flex; justify-content: center; align-items: center;" data-testid="cp-btn-save-content">
            <img
              src="@/assets/images/svg/ui/download.svg"
              height="25px"
              style="min-height: 25px; pointer-events: none;"
              data-testid="cp-img-save"
            />
          </div>
        </button>
      </div>
    </div>
  </transition>
</template>


<script>
import CircularProgressButton from './CircularButton.vue';

export default {
  name: 'CapturePanel',
  components: {
    CircularProgressButton,
    
  },
  data() {
    return {
      bottom: 10,
      left: 10,
      startX: 0,
      startY: 0,
      width: 150,
      height: 200,

      isIDLE: true,

      currentExpTimeIndex: 0,
      currentCFWIndex: 0,
      // 记录“已确认”的滤镜位置（用于失败/超时后还原）
      lastConfirmedCFWIndex: 0,
      // 当前一次切换的目标位置（0-based），用于判断是否在移动中
      pendingCFWIndex: null,
      cfwButtonsDisabled: false,
      isCFWMoving: false,
      cfwMoveTargetPos1: null,
      cfwMoveWatchdog: null,

      ExpTimes: ['1ms', '10ms', '100ms', '1s', '5s', '10s', '30s', '60s', '120s','300s','600s'],
      ExpTimeNum: 11, // 默认曝光时间数量
      // CFWs: ['Null', 'L', 'R', 'G', 'B', 'Ha', 'OIIII', 'SII'],
      CFWs: ['Null'],

      CFWConnect: false,

      CameraTemperature: '',

      // 按钮状态
      btnSaveStatus: false, // 保存按钮状态
      btnCaptureStatus: false, // 拍照按钮状态
      btnFocusStatus: false, // 聚焦按钮状态
      btnHistStatus: false, // 直方图按钮状态
      btnExpTimeStatus: false, // 曝光时间按钮状态
      btnCFWStatus: false, // 滤光片按钮状态
    };
  },
  created() {
    // this.$bus.$on('ExpTime [1]', this.ModifyExpTimeList);
    // this.$bus.$on('ExpTime [2]', this.ModifyExpTimeList);
    // this.$bus.$on('ExpTime [3]', this.ModifyExpTimeList);
    // this.$bus.$on('ExpTime [4]', this.ModifyExpTimeList);
    // this.$bus.$on('ExpTime [5]', this.ModifyExpTimeList);
    // this.$bus.$on('ExpTime [6]', this.ModifyExpTimeList);
    // this.$bus.$on('ExpTime [7]', this.ModifyExpTimeList);
    // this.$bus.$on('ExpTime [8]', this.ModifyExpTimeList);
    // this.$bus.$on('ExpTime [9]', this.ModifyExpTimeList);

    // this.$bus.$on('CFW [1]', this.ModifyCFWList);
    // this.$bus.$on('CFW [2]', this.ModifyCFWList);
    // this.$bus.$on('CFW [3]', this.ModifyCFWList);
    // this.$bus.$on('CFW [4]', this.ModifyCFWList);
    // this.$bus.$on('CFW [5]', this.ModifyCFWList);
    // this.$bus.$on('CFW [6]', this.ModifyCFWList);
    // this.$bus.$on('CFW [7]', this.ModifyCFWList);
    // this.$bus.$on('CFW [8]', this.ModifyCFWList);
    // this.$bus.$on('CFW [9]', this.ModifyCFWList);
    this.$bus.$on('SetCFWPositionMax', (max) => {
      this.SetCFWPositionMax(max);
      
      // 动态注册新的 CFW 事件监听器
      for (let i = 1; i <= max; i++) {
        this.$bus.$on(`CFW [${i}]`, this.ModifyCFWList);
      }
    });

    this.$bus.$on('initExpTimeList', this.initExpTimeList);
    // this.$bus.$on('SetCFWPositionMax', this.SetCFWPositionMax);
    this.$bus.$on('SetCFWPositionSuccess', this.SetCFWPositionSuccess);
    this.$bus.$on('SetCFWPositionFailed', this.SetCFWPositionFailed);

    this.$bus.$on('initCFWList', this.initCFWList);

    this.$bus.$on('MainCameraStatus',this.MainCameraStatus);

    this.$bus.$on('CFWConnected', this.CFWConnected);

    this.$bus.$on('MainCameraTemperature', this.MainCameraTemperature);

    this.$bus.$on('setSelfExposureTime', this.setSelfExposureTime);

    this.$bus.$emit('getSelfExposureTime');  // 初始化完成后获取自定义曝光时间
  },
  beforeDestroy() {
    if (this.cfwMoveWatchdog) {
      clearTimeout(this.cfwMoveWatchdog);
      this.cfwMoveWatchdog = null;
    }
  },
  mounted: function () {
    // this.CurrentExpTimeList();
    // this.$bus.$emit('AppSendMessage', 'Vue_Command', 'getExpTimeList');

  },
  methods: {
    startCfwMoving(targetPos1) {
      this.cfwMoveTargetPos1 = targetPos1;
      this.isCFWMoving = true;

      if (this.cfwMoveWatchdog) clearTimeout(this.cfwMoveWatchdog);
      // 避免异常情况下无限转：15s 兜底
      this.cfwMoveWatchdog = setTimeout(() => {
        // 统一走失败处理：会负责停转、解锁按钮、并把 UI 位置还原到 lastConfirmedCFWIndex
        this.SetCFWPositionFailed('timeout');
      }, 15000);
    },
    finishCfwMoving() {
      this.isCFWMoving = false;
      this.cfwMoveTargetPos1 = null;
      this.pendingCFWIndex = null;
      if (this.cfwMoveWatchdog) {
        clearTimeout(this.cfwMoveWatchdog);
        this.cfwMoveWatchdog = null;
      }
    },
    handleExpTimeButtonClick(direction) {
      if(this.btnExpTimeStatus) {
        return;
      }
      this.btnExpTimeStatus = true;
      if (direction === 'plus') {
        if (this.currentExpTimeIndex < this.ExpTimes.length - 1) {
          this.currentExpTimeIndex++;
        } else {
          this.currentExpTimeIndex = 0;
        }
      } else if (direction === 'minus') {
        if (this.currentExpTimeIndex > 0) {
          this.currentExpTimeIndex--;
        } else {
          this.currentExpTimeIndex = this.ExpTimes.length - 1;
        }
      }
      // console.log('handleExpTimeButtonClick: ',this.ExpTimes[this.currentExpTimeIndex]);
      // this.$refs.expTimeContent.innerText = this.ExpTimes[this.currentExpTimeIndex];
      this.$bus.$emit('time-selected', this.ExpTimes[this.currentExpTimeIndex]);
      this.btnExpTimeStatus = false;
    },

    handleCFWButtonClick(direction) {
      if(this.btnCFWStatus) {
        return;
      }
      this.btnCFWStatus = true;
      if(this.CFWConnect) {
        // 保存当前“已确认位置”，以便失败后还原
        if (this.pendingCFWIndex === null || this.pendingCFWIndex === undefined) {
          this.lastConfirmedCFWIndex = this.currentCFWIndex;
        }

        if (direction === 'plus') {
          if (this.currentCFWIndex < this.CFWs.length - 1) {
            this.currentCFWIndex++;
          } else {
            this.currentCFWIndex = 0;
          }
        } else {
          if (this.currentCFWIndex > 0) {
            this.currentCFWIndex--;
          } else {
            this.currentCFWIndex = this.CFWs.length - 1;
          }
        }
        this.pendingCFWIndex = this.currentCFWIndex;
        // console.log('handleMouseDownCFW: ',this.CFWs[this.currentCFWIndex]);
        // this.$refs.CFWContent.innerText = this.CFWs[this.currentCFWIndex];
        // this.$bus.$emit('cfw-selected', this.currentCFWIndex);
        console.log('QHYCCD | CFWSelected: ', (this.currentCFWIndex+1));
        this.$bus.$emit('SendConsoleLogMsg', 'SetCFWPosition:' + (this.currentCFWIndex+1), 'info');
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'SetCFWPosition:' + (this.currentCFWIndex+1));
        this.cfwButtonsDisabled = true;
        this.startCfwMoving(this.currentCFWIndex + 1);
      } else {
        this.$bus.$emit('showMsgBox', 'Please connect the Filter Wheels first.', 'error');
      }
      this.btnCFWStatus = false;
    },

    toggleFocuserPanel() {
      if(this.btnFocusStatus) {
        return;
      }
      this.btnFocusStatus = true;
      this.$bus.$emit('toggleFocuserPanel');
      this.btnFocusStatus = false;
    },
    toggleHistogramPanel() {
      if(this.btnHistStatus) {
        return;
      }
      this.btnHistStatus = true;
      this.$bus.$emit('toggleHistogramPanel');
      this.btnHistStatus = false;
    },
    CaptureImageSave() {
      if(this.btnSaveStatus) {
        return;
      }
      this.btnSaveStatus = true;
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'CaptureImageSave');
      this.btnSaveStatus = false;
    },

    CurrentExpTimeList() {
      for(let i = 0; i < this.ExpTimes.length; i++) {
        this.$bus.$emit('CurrentExpTimeList', i, this.ExpTimes[i]);
      }
    },

    parseNumberFromBracket(str) {
      const regex = /\[(\d+)\]/; // 匹配[]中的数字
      const match = regex.exec(str);
      if (match && match.length > 1) {
        return parseInt(match[1]); // 返回匹配到的数字
      } else {
        return null; // 如果没有匹配到，则返回null
      }
    },

    ModifyExpTimeList(payload) {
      const [signal, value] = payload.split(':'); // 拆分信号和值

      // 正则表达式，匹配数字后面跟着'ms'或's'
      const regex = /^\d+(ms|s)$/;

      if (regex.test(value)) {
        this.ExpTimes[this.parseNumberFromBracket(signal) - 1] = value;

        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'ExpTimeList:' + this.ExpTimes);
      } else {
        // 如果不符合格式，可以做出相应的处理，比如提示用户输入错误等
        console.error('Value format is invalid. Please provide a number followed by "ms" or "s".');
        this.$bus.$emit('showMsgBox', 'Value format is invalid. Please provide a number followed by "ms" or "s".', 'error');
      }
    },

    ModifyCFWList(payload) {
      const [signal, value] = payload.split(':'); // 拆分信号和值
      this.CFWs[this.parseNumberFromBracket(signal) - 1] = value;
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'CFWList:' + this.CFWs);
    },

    initExpTimeList(list) {
      console.log('initExpTimeList: ', list);
      const parts = list.split(',');

      for(let i = 0; i < parts.length; i++)
      {
        this.ExpTimes[i] = parts[i];
      }

      // this.CurrentExpTimeList();
    },

    CurrentCFWList() {
      for(let i = 0; i < this.CFWs.length; i++) {
        this.$bus.$emit('CurrentCFWList', i, this.CFWs[i]);
      }
    },

    SetCFWPositionMax(max) {
      for (let i = 0; i < max; i++) {
        this.CFWs[i] = i + 1;
      }
      console.log('CFWList: ', this.CFWs);
      // this.CurrentCFWList();
    },

    SetCFWPositionSuccess(num) {
      console.log('Set CFW Position Success: ', num);
      this.$bus.$emit('SendConsoleLogMsg', 'Set CFW Position Success:' + num, 'info');
      // 以成功回包为准，更新“已确认位置”
      const pos1 = parseInt(num, 10);
      if (!isNaN(pos1) && pos1 > 0) {
        this.currentCFWIndex = pos1 - 1;
        this.lastConfirmedCFWIndex = this.currentCFWIndex;
      } else {
        // 若回包格式异常，则至少把当前 UI 位置视为已确认
        this.lastConfirmedCFWIndex = this.currentCFWIndex;
      }
      this.finishCfwMoving();
      this.cfwButtonsDisabled = false;
    },
    SetCFWPositionFailed(reason) {
      console.log('Set CFW Position Failed: ', reason);
      this.$bus.$emit('SendConsoleLogMsg', 'Set CFW Position Failed:' + reason, 'error');
      // 失败/超时：还原到“已确认位置”，避免 UI 位置被错误改变
      if (this.lastConfirmedCFWIndex !== null && this.lastConfirmedCFWIndex !== undefined) {
        this.currentCFWIndex = this.lastConfirmedCFWIndex;
      }
      this.finishCfwMoving();
      this.cfwButtonsDisabled = false;
      this.$bus.$emit('showMsgBox', 'Filter wheel move failed: ' + reason, 'error');
    },

    initCFWList(list) {
      console.log('initCFWList: ', list);
      const parts = list.split(',');

      for(let i = 0; i < parts.length; i++)
      {
        this.CFWs[i] = parts[i];
      }
      this.CurrentCFWList();
    },

    MainCameraStatus(status) {
      if(status === 'Exposuring') {
        this.isIDLE = false;
      } 
      else {
        this.isIDLE = true;
      }
    },

    MainCameraTemperature(value) {
      this.CameraTemperature = value + '°';
    },

    setSelfExposureTime(time) {
      if (time != 0 && time != null && time != undefined && time != '' && typeof time === 'number') {
        if (this.ExpTimes.length > this.ExpTimeNum) {
          this.ExpTimes.pop();
        }
        if (time > 1000)
        {
          this.ExpTimes.push((time/1000) + 's');
        }
        else
        {
          this.ExpTimes.push(time + 'ms');
        }
        this.handleExpTimeButtonClick('null');  // 重新同步曝光时间
      }else{
        if (this.ExpTimes.length > this.ExpTimeNum) {
          this.ExpTimes.pop();
        }
        this.handleExpTimeButtonClick('null');  // 重新同步曝光时间
      }
    },


    CFWConnected(num) {
      if(num === 0){
        this.CFWConnect = false;
      } else {
        this.CFWConnect = true;
      }
      console.log('CFW is Connected: ', num);
      this.$bus.$emit('SendConsoleLogMsg', 'CFW is Connected:' + num, 'info');
    }
    
  },
  computed: {
    // currentExpTime() {
    //   return this.ExpTimes[this.currentExpTimeIndex];
    // },
    // currentCFW() {
    //   return this.CFWs[this.currentCFWIndex];
    // },
  },
}
</script>

<style scoped>
.capture-panel {
  pointer-events: auto;
  position: fixed;
  background-color: rgba(64, 64, 64, 0.5);
  backdrop-filter: blur(5px);
  border-radius: 10px;
  border: 4px solid rgba(128, 128, 128, 0.5);
  box-sizing: border-box;
  transition: height 0.2s ease;
}

@keyframes showPanelAnimation {
  from {
    left: -150px;
  }
  to {
    left: 10px;
  }
}

@keyframes hidePanelAnimation {
  from {
    left: 10px;
  }
  to {
    left: -150px;
  }
}

.panel-enter-active {
  animation: showPanelAnimation 0.15s forwards;
}

.panel-leave-active {
  animation: hidePanelAnimation 0.15s forwards;
}

.custom-button {
  user-select: none;
  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
  border-radius: 50%;
  box-sizing: border-box;
  border: none;
}

.Direction-Btn {
  width: 120px;
  height: 120px;
  top: 15px;
  left: 11px;

  border-radius: 50%;
  overflow: hidden;
  position: relative;
}

.ExpTime-minus {
  position:absolute;
  width: 60px;
  height: 60px;
  top: 0px;
  left: 0px;

  user-select: none;
  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
  box-sizing: border-box;
  border: none;
  mask-image: radial-gradient(circle at 60px 60px, transparent 35px, black 35px);
}

.ExpTime-minus-icon {
  position: absolute;
  top: 40%;
  left: 40%;
  transform: translate(-50%, -50%) rotate(-45deg);
}

.ExpTime-plus {
  position:absolute;
  width: 60px;
  height: 60px;
  top: 0px;
  right: 0px;

  user-select: none;
  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
  box-sizing: border-box;
  border: none;
  mask-image: radial-gradient(circle at -2.5px 60px, transparent 35px, black 35px);
}

.ExpTime-plus-icon {
  position: absolute;
  top: 40%;
  left: 60%;
  transform: translate(-50%, -50%) rotate(45deg);
}

.CFW-minus { 
  position:absolute;
  width: 60px;
  height: 60px;
  top: 60px;
  left: 0px;

  user-select: none;
  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
  box-sizing: border-box;
  border: none;
  mask-image: radial-gradient(circle at 60px -2.5px, transparent 35px, black 35px);
}

.CFW-minus-icon {
  position: absolute;
  top: 60%;
  left: 40%;
  transform: translate(-50%, -50%) rotate(45deg);
}

.CFW-plus {
  position:absolute;
  width: 60px;
  height: 60px;
  top: 60px;
  right: 0px;

  user-select: none;
  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
  box-sizing: border-box;
  border: none;
  mask-image: radial-gradient(circle at -2.5px -2.5px, transparent 35px, black 35px);
}

.CFW-plus-icon {
  position: absolute;
  top: 60%;
  left: 60%;
  transform: translate(-50%, -50%) rotate(-45deg);
}

.btn-focus:active,
.btn-save:active,
.btn-hist:active {
  transform: scale(0.95); /* 点击时缩小按钮 */
  background-color: rgba(255, 255, 255, 0.7);
}

.ExpTime-plus:active,
.ExpTime-minus:active,
.CFW-plus:active,
.CFW-minus:active {
  background-color: rgba(255, 255, 255, 0.7);
}

.no-select {
  user-select: none;
}

.btn-focus {
  position: absolute;
  width: 45px;
  height: 45px;
  bottom: 10px;
  right: 10px;

  font-size: x-large;
  text-align: center; /* 水平居中 */
  line-height: 45px; /* 垂直居中 */
}

.btn-hist{
  position:absolute;
  width: 45px;
  height: 45px;
  bottom: 10px;
  left: 10px;

  font-size: x-large;
  text-align: center; /* 水平居中 */
  line-height: 45px; /* 垂直居中 */
}

.border-icon {
  position: absolute;
  top: 0px;
  left: 4px;
  font-size: large;
}

.icon-container {
  position: absolute;
  top: 5px;
  left: 5px;
}

.icon-container .green-icon {
  color: rgba(51, 218, 121, 1);
}

.icon-container .red-icon {
  color: rgba(250, 0, 0, 1);
}

.btn-save {
  position: absolute;
  width: 25px;
  height: 25px;
  top: 3px;
  right: 3px;

  user-select: none;
  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
  box-sizing: border-box;
  border: none;
  border-radius: 50%;

  /* text-align: center;
  line-height: 24px;
  font-size: large; */
}

.btn-Capture {
  position:absolute;
  width: 70px;
  height: 70px;
  top: 40px;
  left: 36px;

  box-sizing: border-box;
  /* border: none; */
  clip-path: circle(35px at 35px 35px);

  backdrop-filter: blur(5px);  
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.8);
}

.cfw-moving-indicator {
  position: absolute;
  left: 50%;
  bottom: 2px;
  transform: translateX(-50%);
  pointer-events: none; /* 不影响按钮点击 */
  z-index: 2;
}

.text-ExpTime-content {
  position:absolute;
  width: 30px;
  height: 10px;
  top: 10px;
  left: 45px;

  user-select: none;
  text-align: center;
  line-height: 10px;
  white-space: nowrap;

  /* background-color: rgba(255, 0, 0, 0.3);
  backdrop-filter: blur(5px); */
  box-sizing: border-box;
  border: none;
}

.text-CFW-content {

  width: 30px;
  height: 10px;

  display: block;

  user-select: none;
  text-align: center;
  line-height: 10px;
  white-space: nowrap;

  /* background-color: rgba(255, 0, 0, 0.3);
  backdrop-filter: blur(5px); */
  box-sizing: border-box;
  border: none;
}

.cfw-display {
  /* CFW 文本位于两 CFW 按钮的中间（水平居中），保持与曝光时间围绕拍摄键的对称感 */
  position: absolute;
  left: 50%;
  bottom: 10px;
  transform: translateX(-50%);
  width: 30px;
  height: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: visible; /* 允许点阵环超出文本盒子 */
  pointer-events: none; /* 不影响按钮点击 */
}

.cfw-display .text-CFW-content {
  z-index: 2;
  color: rgba(255, 255, 255, 0.92);
  font-weight: 600;
  letter-spacing: 0.2px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.45);
  font-size: 12px;
}

.cfw-dots {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 38px;
  height: 38px;
  transform: translate(-50%, -50%);
  z-index: 1;
  filter: drop-shadow(0 0 4px rgba(0, 229, 255, 0.35));
}

.cfw-dots-rotor {
  position: absolute;
  inset: 0;
  animation: cfwDotsRotate 0.9s linear infinite;
}

.cfw-dot {
  --radius: 16px;
  --size: 4px;
  position: absolute;
  top: 50%;
  left: 50%;
  width: var(--size);
  height: var(--size);
  border-radius: 50%;
  background: rgba(0, 229, 255, 0.95);
  transform:
    translate(-50%, -50%)
    rotate(calc(var(--i) * 45deg))
    translate(0, calc(-1 * var(--radius)));
  opacity: 0.18;
  animation: cfwDotPulse 0.9s ease-in-out infinite;
  animation-delay: calc(var(--i) * -0.11s);
}

@keyframes cfwDotsRotate {
  to { transform: rotate(360deg); }
}

@keyframes cfwDotPulse {
  0%, 100% { opacity: 0.18; transform: translate(-50%, -50%) rotate(calc(var(--i) * 45deg)) translate(0, calc(-1 * var(--radius))) scale(0.92); }
  50%      { opacity: 0.92; transform: translate(-50%, -50%) rotate(calc(var(--i) * 45deg)) translate(0, calc(-1 * var(--radius))) scale(1.12); }
}

</style>

