<template>
  <div class="chart-panel" :style="{ bottom: bottom + 'px', left: left + 'px', right: right + 'px', height: height + 'px' }">
    <ImageChart ref="imagechart" class="image-chart"/>
    <FocusChart ref="focuschart" class="focus-chart"/>

     <div class="buttons-container">
      <button  @click="SpeedChange" @touchend="active" class="get-click btn-Speed"><v-icon>mdi-run-fast</v-icon></button>
      <button :disabled="isBtnMoveDisabled" @click="FocusLeftMove" @touchend="active" class="get-click btn-Left"><v-icon>mdi-arrow-left-circle-outline</v-icon></button>
      <button  @click="AutoFocus" @touchend="active" class="get-click btn-Auto"><v-icon>mdi-focus-auto</v-icon></button>
      <button  @click="FocusGoto" @touchend="active" class="get-click btn-Goto"><v-icon>mdi-google-circles-group</v-icon></button>
      <button :disabled="isBtnMoveDisabled" @click="FocusRightMove" @touchend="active" class="get-click btn-Right"><v-icon>mdi-arrow-right-circle-outline</v-icon></button>
      <button  @click="StepsChange" @touchend="active" class="get-click btn-Steps"><v-icon>mdi-diameter-outline</v-icon></button>
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
      left: 170,
      right: 170,
      height: 90,

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
    FocusChart,
    ImageChart
  },
  created() {
    // this.$bus.$on('AutoHistogramNum', this.setAutoHistogramNum);
    this.$bus.$on('FocusChangeSpeedSuccess', this.ShowSpeedNum);
    this.$bus.$on('FocusPosition', this.ShowPositionNum);
    this.$bus.$on('FocusMoveDone', this.MoveDone);
    this.$bus.$on('UpdateFWHM',this.UpdateFWHM);
    this.$bus.$on('showRoiImage',this.loadAndDisplayImage);
    this.$bus.$on('setTargetPosition', this.setTargetPosition);
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

    setTargetPosition(target) {
      this.TargetPosition = target;
    },

    FocusGoto() {
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'focusMove:'+ "Target" + ":" + this.TargetPosition);
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
  background-color: rgba(64, 64, 64, 0.5);
  backdrop-filter: blur(5px);
  border-radius: 10px;
  border: 4px solid rgba(128, 128, 128, 0.5);
  box-sizing: border-box;
  transition: width 0.2s ease;
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
