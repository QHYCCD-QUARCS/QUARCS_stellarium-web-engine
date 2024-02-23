<template>
  <div class="chart-panel" :style="{ width: width + 'px', height: height + 'px' }">
     <FocusChart ref="focuschart" class="focus-chart"/>
     <button  @click="AutoFocus" @touchend="active" class="get-click btn-Auto">Auto</button>
     <button  @click="StepsChange" @touchend="active" class="get-click btn-Steps">Steps</button>
     <button  @click="SpeedChange" @touchend="active" class="get-click btn-Speed">Speed</button>

     <button :disabled="isBtnMoveDisabled" @click="FocusLeftMove" @touchend="active" class="get-click btn-Left"><v-icon>mdi-chevron-left</v-icon></button>
     <button :disabled="isBtnMoveDisabled" @click="FocusRightMove" @touchend="active" class="get-click btn-Right"><v-icon>mdi-chevron-right</v-icon></button>
     
     <div class="Canvas-Bar">
       <canvas ref="FocusCanvas" id="Focus-Canvas"></canvas>
     </div>
     
     <div class="Speed-Bar" :style="{ fontSize: '12px' }">
       {{this.MoveSpeed_}}
     </div>
     
     <!-- <div class="State-Bar" :style="{ fontSize: '12px' }">
       Current:{{this.CurrentPosition}}Target:{{this.TargetPosition}}
     </div> -->
     <div class="State-Bar">
      <div style="text-align: left;">   Current:{{ this.CurrentPosition }}</div>
      <div style="text-align: center;">   FWHM:{{ this.FWHM }}</div>
      <div style="text-align: right;">Target:{{ this.TargetPosition }}   </div>
    </div>
     
     <div class="Steps-Bar" :style="{ fontSize: '12px' }">
      {{this.MoveSteps}}
     </div>

  </div>
</template>

<script>
import FocusChart from './Chart-Focus.vue';

export default {
  name: 'FocuserPanel',
  data() {
    return {
      width: 330, // 初始宽度
      height: 170,

      MoveSteps: 100,
      MoveSpeed: 1,
      MoveSpeed_: 1,

      CurrentPosition: 0,
      TargetPosition: 0,
      FWHM: 0,

      isBtnMoveDisabled: false,

    };
  },
  components: {
    FocusChart
  },
  created() {
    // this.$bus.$on('AutoHistogramNum', this.setAutoHistogramNum);
    this.$bus.$on('FocusChangeSpeedSuccess', this.ShowSpeedNum);
    this.$bus.$on('FocusPosition', this.ShowPositionNum);
    this.$bus.$on('FocusMoveDone', this.MoveDone);
    this.$bus.$on('UpdateFWHM',this.UpdateFWHM);
    this.$bus.$on('showRoiImage',this.loadAndDisplayImage);
  },
  methods: {
    AutoFocus() {
      console.log('QHYCCD | AutoFocus: ');
    },
    
    StepsChange() {
      if(this.MoveSteps === 100) this.MoveSteps = 500;
      else if(this.MoveSteps === 500) this.MoveSteps = 1000;
      else if(this.MoveSteps === 1000) this.MoveSteps = 5000;
      else if(this.MoveSteps === 5000) this.MoveSteps = 10000;
      else if(this.MoveSteps === 10000) this.MoveSteps = 100;

      console.log('QHYCCD | StepsChange: ', this.MoveSteps);
    },

    SpeedChange() {
      if(this.MoveSpeed === 1) this.MoveSpeed = 3;
      else if(this.MoveSpeed === 3) this.MoveSpeed = 5;
      else if(this.MoveSpeed === 5) this.MoveSpeed = 1;

      console.log('QHYCCD | SpeedChange: ', this.MoveSpeed);
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'focusSpeed:'+ this.MoveSpeed);
    },

    FocusLeftMove() {
      this.isBtnMoveDisabled = true;
      console.log('QHYCCD | FocusLeftMove: ');
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'focusMove:'+ "Left" + ":" + this.MoveSteps);
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'focusCapture');
    },

    FocusRightMove() {
      this.isBtnMoveDisabled = true;
      console.log('QHYCCD | FocusRightMove: ');
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'focusMove:'+ "Right" + ":" + this.MoveSteps);
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'focusCapture');
    },

    ShowSpeedNum(speed) {
      this.MoveSpeed_ = speed;
    },

    ShowPositionNum(current, target) {
      this.CurrentPosition = current;
      this.TargetPosition = target;
    },

    MoveDone() {
      this.isBtnMoveDisabled = false;
      console.log('QHYCCD | FocusMoveDone');
    },

    UpdateFWHM(FWHM) {
      this.FWHM = FWHM;
    },

    loadAndDisplayImage(file) {
      const imagePath = 'http://192.168.2.31:8080/img/'+file;

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
  background-color: rgba(128, 128, 128, 0.5);
  backdrop-filter: blur(5px);
  border-radius: 10px; 
  transition: width 0.2s ease;
}

.focus-chart {
  position:absolute;
  top: 5px;
  right: 5px;
}

.btn-Speed {
  position:absolute;
  bottom: 5px;
  right: 265px;

  width: 60px;
  height: 45px;

  user-select: none;
  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
  border: none;
  border-radius: 5px; 
  box-sizing: border-box;
}

.btn-Left {
  position:absolute;
  bottom: 5px;
  right: 200px;

  width: 60px;
  height: 45px;

  user-select: none;
  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
  border: none;
  border-radius: 5px; 
  box-sizing: border-box;
}

.btn-Auto {
  position:absolute;
  bottom: 5px;
  right: 135px;

  width: 60px;
  height: 45px;

  user-select: none;
  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
  border: none;
  border-radius: 5px; 
  box-sizing: border-box;
}

.btn-Right {
  position:absolute;
  bottom: 5px;
  right: 70px;

  width: 60px;
  height: 45px;

  user-select: none;
  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
  border: none;
  border-radius: 5px; 
  box-sizing: border-box;
}

.btn-Steps {
  position:absolute;
  bottom: 5px;
  right: 5px;

  width: 60px;
  height: 45px;

  user-select: none;
  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
  border: none;
  border-radius: 5px; 
  box-sizing: border-box;
}

.btn-Auto:active,
.btn-Left:active,
.btn-Right:active,
.btn-Steps:active,
.btn-Speed:active {
  transform: scale(0.95); /* 点击时缩小按钮 */
  background-color: rgba(255, 255, 255, 0.7);
}

.Canvas-Bar {
  position:absolute;
  top: 5px;
  left: 5px;

  width: 90px;
  height: 90px;
  
  user-select: none;
  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
  border: none;
  border-radius: 5px; 
  box-sizing: border-box;
}

.Speed-Bar { 
  position:absolute;
  top: 100px;
  left: 5px;

  width: 60px;
  height: 15px;
  
  user-select: none;
  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
  border: none;
  border-radius: 5px; 
  box-sizing: border-box;

  text-align: center;
}

.State-Bar { 
  position:absolute;
  top: 100px;
  left: 70px;

  width: 190px;
  height: 15px;
  
  user-select: none;
  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
  border: none;
  border-radius: 5px; 
  box-sizing: border-box;

  /* text-align: center; */
  display: flex;
  justify-content: space-between;
  font-size: 10px;
}

.Steps-Bar { 
  position:absolute;
  top: 100px;
  right: 5px;

  width: 60px;
  height: 15px;
  
  user-select: none;
  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
  border: none;
  border-radius: 5px; 
  box-sizing: border-box;

  text-align: center;
}

#Focus-Canvas {width: 90px; height: 90px;position: absolute; top: 0; left: 0; border-radius: 5px;}

</style>
