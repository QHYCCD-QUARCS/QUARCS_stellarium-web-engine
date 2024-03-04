<template>
  <div class="capture-panel" :style="{ bottom: bottom + 'px', left: left + 'px', width: width + 'px', height: height + 'px' }">
    <div class="Direction-Btn">
        <button class="ExpTime-minus no-select" @click="handleExpTimeButtonClick('minus')">-</button>
        <button class="ExpTime-plus no-select" @click="handleExpTimeButtonClick('plus')">+</button>
        <button class="CFW-minus no-select" @click="handleCFWButtonClick('minus')">-</button>
        <button class="CFW-plus no-select" @click="handleCFWButtonClick('plus')">+</button>

        <span class="text-ExpTime-content" ref="expTimeContent"> 1ms </span>
        <span class="text-CFW-content" ref="CFWContent"> Null </span>
    </div>

    <div>
      <CircularProgressButton class="btn-Capture"/>
    </div>
    
    <div>
      <button class="custom-button btn-focus no-select" @touchend="toggleFocuserPanel"> <i class="mdi mdi-image-filter-center-focus"></i> </button>
      <button class="custom-button btn-hist no-select" @touchend="toggleHistogramPanel"> <i class="mdi mdi-arrow-expand-horizontal"></i> </button>
    </div>

    <div>
      <i class="mdi border-icon mdi-image-filter-center-focus"></i>
      <span v-if="isIDLE" class="icon-container">
        <v-icon class="green-icon">mdi-circle-medium</v-icon>
      </span>
      <span v-else class="icon-container">
        <v-icon class="red-icon">mdi-circle-medium</v-icon>
      </span>
    </div>

    <div>
      <button class="btn-save no-select" @touchend="saveImage"> <v-icon>mdi-arrow-down-bold-circle-outline</v-icon> </button>
    </div>

  </div>
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

      ExpTimes: ['1ms', '5ms', '10ms', '30ms', '50ms', '100ms', '1s', '5s', '10s'],
      CFWs: ['Null', 'L', 'R', 'G', 'B', 'Ha', 'OIIII', 'SII'],
    };
  },
  created() {
    
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
      this.$refs.expTimeContent.innerText = this.ExpTimes[this.currentExpTimeIndex];
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
      this.$refs.CFWContent.innerText = this.CFWs[this.currentCFWIndex];
      this.$bus.$emit('cfw-selected', this.CFWs[this.currentCFWIndex]);
    },

    toggleFocuserPanel() {
      this.$bus.$emit('toggleFocuserPanel');
    },
    toggleHistogramPanel() {
      this.$bus.$emit('toggleHistogramPanel');
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
  background-color: rgba(128, 128, 128, 0.5);
  backdrop-filter: blur(5px);
  border-radius: 10px;
  border: 4px solid rgba(200, 200, 200, 0.5);
  box-sizing: border-box;
  transition: height 0.2s ease;
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
  top: 1px;
  left: 1px;
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

