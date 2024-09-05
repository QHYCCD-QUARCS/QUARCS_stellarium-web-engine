<template>
  <transition name="panel">
  <div class="capture-panel" :style="{ bottom: bottom + 'px', left: left + 'px', width: width + 'px', height: height + 'px' }">
    <div class="Direction-Btn">
        <button class="ExpTime-minus no-select" @click="handleExpTimeButtonClick('minus')">
          <span class="ExpTime-minus-icon"> <v-icon>mdi-menu-up</v-icon> </span>
        </button>
        <button class="ExpTime-plus no-select" @click="handleExpTimeButtonClick('plus')">
          <span class="ExpTime-plus-icon"> <v-icon>mdi-menu-up</v-icon> </span>
        </button>
        <button class="CFW-minus no-select" :disabled="cfwButtonsDisabled" @click="handleCFWButtonClick('minus')">
          <span class="CFW-minus-icon"> <v-icon>mdi-menu-down</v-icon> </span>
        </button>
        <button class="CFW-plus no-select" :disabled="cfwButtonsDisabled" @click="handleCFWButtonClick('plus')">
          <span class="CFW-plus-icon"> <v-icon>mdi-menu-down</v-icon> </span>
        </button>

        <span class="text-ExpTime-content" ref="expTimeContent"> {{ExpTimes[currentExpTimeIndex]}} </span>
        <span class="text-CFW-content" ref="CFWContent"> {{CFWs[currentCFWIndex]}} </span>
    </div>

    <div>
      <CircularProgressButton class="btn-Capture"/>
    </div>
    
    <div>
      <button class="custom-button btn-focus no-select" @click="toggleFocuserPanel"> 
        <div style="display: flex; justify-content: center; align-items: center;">
          <img src="@/assets/images/svg/ui/focuser.svg" height="45px" style="min-height: 45px"></img>
        </div>
      </button>
      <button class="custom-button btn-hist no-select" @click="toggleHistogramPanel"> 
        <div style="display: flex; justify-content: center; align-items: center;">
          <img src="@/assets/images/svg/ui/histo.svg" height="45px" style="min-height: 45px"></img>
        </div> 
      </button>
    </div>

    <div>
      <span v-if="isIDLE" class="icon-container">
        <div style="display: flex; justify-content: center; align-items: center;">
          <img src="@/assets/images/svg/ui/Status-idle.svg" height="15px" style="min-height: 15px"></img>
        </div>
      </span>
      <span v-else class="icon-container">
        <div style="display: flex; justify-content: center; align-items: center;">
          <img src="@/assets/images/svg/ui/Status-busy.svg" height="15px" style="min-height: 15px"></img>
        </div>
      </span>
    </div>

    <div>
      <button class="btn-save no-select" @click="CaptureImageSave"> 
        <div style="display: flex; justify-content: center; align-items: center;">
          <img src="@/assets/images/svg/ui/download.svg" height="25px" style="min-height: 25px"></img>
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
      cfwButtonsDisabled: false,

      ExpTimes: ['1ms', '10ms', '100ms', '1s', '5s', '10s', '30s', '60s', '120s'],
      // CFWs: ['Null', 'L', 'R', 'G', 'B', 'Ha', 'OIIII', 'SII'],
      CFWs: ['Null'],
    };
  },
  created() {
    this.$bus.$on('ExpTime [1]', this.ModifyExpTimeList);
    this.$bus.$on('ExpTime [2]', this.ModifyExpTimeList);
    this.$bus.$on('ExpTime [3]', this.ModifyExpTimeList);
    this.$bus.$on('ExpTime [4]', this.ModifyExpTimeList);
    this.$bus.$on('ExpTime [5]', this.ModifyExpTimeList);
    this.$bus.$on('ExpTime [6]', this.ModifyExpTimeList);
    this.$bus.$on('ExpTime [7]', this.ModifyExpTimeList);
    this.$bus.$on('ExpTime [8]', this.ModifyExpTimeList);
    this.$bus.$on('ExpTime [9]', this.ModifyExpTimeList);

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

    this.$bus.$on('initCFWList', this.initCFWList);

    this.$bus.$on('MainCameraStatus',this.MainCameraStatus);
  },
  mounted: function () {
    this.CurrentExpTimeList();
    this.$bus.$emit('AppSendMessage', 'Vue_Command', 'getExpTimeList');

  },
  methods: {
    handleExpTimeButtonClick(direction) {
      if (direction === 'plus') {
        if (this.currentExpTimeIndex < this.ExpTimes.length - 1) {
          this.currentExpTimeIndex++;
        } else {
          this.currentExpTimeIndex = 0;
        }
      } else {
        if (this.currentExpTimeIndex > 0) {
          this.currentExpTimeIndex--;
        } else {
          this.currentExpTimeIndex = this.ExpTimes.length - 1;
        }
      }
      // console.log('handleExpTimeButtonClick: ',this.ExpTimes[this.currentExpTimeIndex]);
      // this.$refs.expTimeContent.innerText = this.ExpTimes[this.currentExpTimeIndex];
      this.$bus.$emit('time-selected', this.ExpTimes[this.currentExpTimeIndex]);
    },

    handleCFWButtonClick(direction) {
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
      // console.log('handleMouseDownCFW: ',this.CFWs[this.currentCFWIndex]);
      // this.$refs.CFWContent.innerText = this.CFWs[this.currentCFWIndex];
      // this.$bus.$emit('cfw-selected', this.currentCFWIndex);
      console.log('QHYCCD | CFWSelected: ', (this.currentCFWIndex+1));
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'SetCFWPosition:' + (this.currentCFWIndex+1));
      this.cfwButtonsDisabled = true;
    },

    toggleFocuserPanel() {
      this.$bus.$emit('toggleFocuserPanel');
    },
    toggleHistogramPanel() {
      this.$bus.$emit('toggleHistogramPanel');
    },
    CaptureImageSave() {
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'CaptureImageSave');
      // this.$bus.$emit('mainCanvasZoom');
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
      this.CurrentExpTimeList();
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
      this.cfwButtonsDisabled = false;
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
  position:absolute;
  width: 30px;
  height: 10px;
  bottom: 10px;
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

</style>

