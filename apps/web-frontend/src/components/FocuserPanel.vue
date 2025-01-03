<template>
  <transition name="panel">
    <div class="chart-panel" :style="{ bottom: bottom + 'px', left: ComponentPadding + 'px', right: ComponentPadding + 'px', height: height + 'px' }">
    <ImageChart ref="imagechart" class="image-chart"/>
    <FocusChart ref="focuschart" class="focus-chart"/>

     <div class="buttons-container">
      <!-- <button  @click="SpeedChange" @touchend="active" class="get-click btn-Speed"><v-icon>mdi-run-fast</v-icon></button> -->
      <button  @click="SpeedChange" @touchend="active" class="get-click btn-Speed">
        <span v-if="MoveSpeed === 1">
          <div style="display: flex; justify-content: center; align-items: center;">
            <img src="@/assets/images/svg/ui/Speed-1.svg" height="25px" style="min-height: 25px; pointer-events: none;"></img>
          </div>
        </span>
        <span v-if="MoveSpeed === 3">
          <div style="display: flex; justify-content: center; align-items: center;">
            <img src="@/assets/images/svg/ui/Speed-2.svg" height="25px" style="min-height: 25px; pointer-events: none;"></img>
          </div>
        </span>
        <span v-if="MoveSpeed === 5">
          <div style="display: flex; justify-content: center; align-items: center;">
            <img src="@/assets/images/svg/ui/Speed-3.svg" height="25px" style="min-height: 25px; pointer-events: none;"></img>
          </div>
        </span>
      </button>
      <button :disabled="isBtnMoveDisabled" @click="FocusLeftMove" @touchend="active" class="get-click btn-Left">
        <div style="display: flex; justify-content: center; align-items: center;">
          <img src="@/assets/images/svg/ui/arrow-left-circle.svg" height="20px" style="min-height: 20px; pointer-events: none;"></img>
        </div>
      </button>
      <!-- <button  @click="AutoFocus" @touchend="active" class="get-click btn-Auto"><v-icon>mdi-focus-auto</v-icon></button> -->
      <button  @click="AutoFocus" @touchend="active" class="get-click btn-Auto">
        <span v-if="inAutoFocus">
          <div style="display: flex; justify-content: center; align-items: center;">
            <img src="@/assets/images/svg/ui/StopAutoFocus.svg" height="20px" style="min-height: 20px; pointer-events: none;"></img>
          </div>
        </span>
        <span v-else>
          <div style="display: flex; justify-content: center; align-items: center;">
            <img src="@/assets/images/svg/ui/AutoFocus.svg" height="20px" style="min-height: 20px; pointer-events: none;"></img>
          </div>
        </span>
      </button>

      <button  @click="FocusGoto" @touchend="active" class="get-click btn-Goto">
        <div style="display: flex; justify-content: center; align-items: center;">
          <img src="@/assets/images/svg/ui/Move.svg" height="10px" style="min-height: 10px; pointer-events: none;"></img>
        </div>
      </button>
      <button :disabled="isBtnMoveDisabled" @click="FocusRightMove" @touchend="active" class="get-click btn-Right">
        <div style="display: flex; justify-content: center; align-items: center;">
          <img src="@/assets/images/svg/ui/arrow-right-circle.svg" height="20px" style="min-height: 20px; pointer-events: none;"></img>
        </div>
      </button>
      <button  @click="StepsChange" @touchend="active" class="get-click btn-Steps">
        <span v-if="MoveSteps === 100">
          <div style="display: flex; justify-content: center; align-items: center;">
            <img src="@/assets/images/svg/ui/step_100.svg" height="25px" style="min-height: 25px; pointer-events: none;"></img>
          </div>
        </span>
        <span v-if="MoveSteps === 500">
          <div style="display: flex; justify-content: center; align-items: center;">
            <img src="@/assets/images/svg/ui/step_500.svg" height="25px" style="min-height: 25px; pointer-events: none;"></img>
          </div>
        </span>
        <span v-if="MoveSteps === 1000">
          <div style="display: flex; justify-content: center; align-items: center;">
            <img src="@/assets/images/svg/ui/step_1000.svg" height="25px" style="min-height: 25px; pointer-events: none;"></img>
          </div>
        </span>
        <span v-if="MoveSteps === 5000">
          <div style="display: flex; justify-content: center; align-items: center;">
            <img src="@/assets/images/svg/ui/step_5000.svg" height="25px" style="min-height: 25px; pointer-events: none;"></img>
          </div>
        </span>
        <span v-if="MoveSteps === 10000">
          <div style="display: flex; justify-content: center; align-items: center;">
            <img src="@/assets/images/svg/ui/step_10000.svg" height="25px" style="min-height: 25px; pointer-events: none;"></img>
          </div>
        </span>
      </button>
    </div>

     <div class="Canvas-Bar">
       <canvas ref="FocusCanvas" id="Focus-Canvas"></canvas>
     </div>
     
     <div class="Speed-Bar" :style="{ fontSize: '8px' }">
       {{this.MoveSpeed_}}
     </div>
     
     <div class="State-Bar" :style="{ left: 80 + 'px', right: 80 + 'px', fontSize: '8px' }" >
      <div style="text-align: left;">   Current:{{ this.CurrentPosition }}</div>
      <div style="text-align: center;">   FWHM:{{ this.FWHM }}</div>
      <div style="text-align: right;">Target:{{ this.TargetPosition }}   </div>
    </div>
     
     <div class="Steps-Bar" :style="{ fontSize: '8px' }">
      {{this.MoveSteps}}
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
      TargetPosition: 0,
      FWHM: 0,

      isBtnMoveDisabled: false,

      inAutoFocus: false,

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
    this.$bus.$on('FocusMoveDone', this.MoveDone);
    this.$bus.$on('UpdateFWHM',this.UpdateFWHM);
    this.$bus.$on('showRoiImage',this.loadAndDisplayImage);
    this.$bus.$on('setTargetPosition', this.setTargetPosition);
    this.$bus.$on('AutoFocusOver', this.AutoFocusOver);
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
      if(this.inAutoFocus)
      {
        this.inAutoFocus = false;
        console.log('QHYCCD | StopAutoFocus');
        this.$bus.$emit('SendConsoleLogMsg', 'StopAutoFocus', 'info');
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'StopAutoFocus');
      }
      else
      {
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
      if(this.MoveSteps === 100) this.MoveSteps = 500;
      else if(this.MoveSteps === 500) this.MoveSteps = 1000;
      else if(this.MoveSteps === 1000) this.MoveSteps = 5000;
      else if(this.MoveSteps === 5000) this.MoveSteps = 10000;
      else if(this.MoveSteps === 10000) this.MoveSteps = 100;

      console.log('QHYCCD | StepsChange: ', this.MoveSteps);
      // this.$bus.$emit('SendConsoleLogMsg', 'StepsChange:' + this.MoveSteps, 'info');
    },

    SpeedChange() {
      if(this.MoveSpeed === 1) this.MoveSpeed = 3;
      else if(this.MoveSpeed === 3) this.MoveSpeed = 5;
      else if(this.MoveSpeed === 5) this.MoveSpeed = 1;

      console.log('QHYCCD | SpeedChange: ', this.MoveSpeed);
      this.$bus.$emit('SendConsoleLogMsg', 'SpeedChange:' + this.MoveSpeed, 'info');
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'focusSpeed:'+ this.MoveSpeed);
    },

    FocusLeftMove() {
      this.isBtnMoveDisabled = true;
      // console.log('QHYCCD | FocusLeftMove: ');
      this.$bus.$emit('SendConsoleLogMsg', 'Focus Left Move:' + this.MoveSteps, 'info');
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'focusMove:'+ "Left" + ":" + this.MoveSteps);
    },

    FocusRightMove() {
      this.isBtnMoveDisabled = true;
      // console.log('QHYCCD | FocusRightMove: ');
      this.$bus.$emit('SendConsoleLogMsg', 'Focus Right Move:' + this.MoveSteps, 'info');
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'focusMove:'+ "Right" + ":" + this.MoveSteps);
    },

    ShowSpeedNum(speed) {
      this.MoveSpeed_ = speed;
    },

    ShowPositionNum(current, target) {
      this.CurrentPosition = current;
      this.TargetPosition = target;
    },

    setTargetPosition(target) {
      this.TargetPosition = parseInt(target, 10);
    },

    FocusGoto() {
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'focusMove:'+ "Target" + ":" + this.TargetPosition);
      this.$bus.$emit('SendConsoleLogMsg', 'Focus Move to:' + this.TargetPosition, 'info');
    },

    MoveDone() {
      this.isBtnMoveDisabled = false;
      console.log('QHYCCD | FocusMoveDone');
      this.$bus.$emit('SendConsoleLogMsg', 'FocusMoveDone', 'info');
    },

    UpdateFWHM(FWHM) {
      this.FWHM = FWHM;
    },

    loadAndDisplayImage(file) {
      // const imagePath = 'http://192.168.2.31:8080/img/'+file; //process.env.VUE_APP_IMAGE_FILE
      // const imagePath = process.env.VUE_APP_IMAGE_FILE + file;
      // const imagePath = this.ImageFileUrl + file;
      const imagePath = 'img/' + file;

      const canvas = document.getElementById('Focus-Canvas');
      if (canvas.getContext) {
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
        };
        // 添加错误处理
        img.onerror = (error) => {
          console.log(`加载图像失败: ${imagePath}`);
        };
        img.src = imagePath;
      }
    },

    active() {},
    
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
  position:absolute;
  bottom: 1px;
  left: 5px;
}

.image-chart {
  position:absolute;
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
  transform: scale(0.95); /* 点击时缩小按钮 */
  background-color: rgba(255, 255, 255, 0.7);
}

.Canvas-Bar {
  position:absolute;
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
  position:absolute;
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
  position:absolute;
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
  position:absolute;
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

#Focus-Canvas {width: 59px; height: 58px;position: absolute; top: 0px; left: 0px; background-color: rgba(0, 0, 0, 0.0);}

</style>
