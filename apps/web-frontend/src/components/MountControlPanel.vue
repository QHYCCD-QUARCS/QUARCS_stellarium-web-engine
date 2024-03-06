<template>
  <div class="mount-control-panel" :style="{ top: top + 'px', right: right + 'px', width: width + 'px', height: height + 'px' }">
    <div class="Direction-Btn">
      <button class="ra-plus no-select" @touchstart="handleMouseDownRA('plus')" @touchend="stop">RA +</button>
      <button class="ra-minus no-select" @touchstart="handleMouseDownRA('minus')" @touchend="stop">RA -</button>
      <button class="dec-plus no-select" @touchstart="handleMouseDownDEC('plus')" @touchend="stop">DEC +</button>
      <button class="dec-minus no-select" @touchstart="handleMouseDownDEC('minus')" @touchend="stop">DEC -</button>
    </div>

    <div>
      <button class="btn-stop no-select" @touchend="stop"><v-icon> mdi-stop-circle-outline </v-icon></button>
    </div>
    <div>
      <button class="btn-speed custom-button no-select" @touchend="MountSlewRateSwitch" ref="speedContent"> 0 </button>
    </div>
    
    <div v-if="showButtons">
      <button v-bind:class="{ 'btn-park-on no-select': ParkSwitch, 'btn-park no-select': !ParkSwitch }" @touchend="MountPark"><v-icon> mdi-parking </v-icon></button>
      <button v-bind:class="{ 'btn-track-on no-select': TrackSwitch, 'btn-track no-select': !TrackSwitch }" @touchend="MountTrack"><v-icon> mdi-target </v-icon></button>
      <button class="custom-button btn-home no-select" @touchend="MountHome"><v-icon> mdi-home </v-icon></button>
      <button class="custom-button btn-sync no-select" @touchend="MountSYNC"><v-icon> mdi-sync </v-icon></button>
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
      <button class="btn-close no-select" @touchend="PanelClose"><v-icon> mdi-close-circle-outline </v-icon></button>
    </div>

  </div>
</template>

<script>
export default {
  name: 'MountControlPanel',
  data() {
    return {
      top: 50,
      right: 50,
      startX: 0,
      startY: 0,
      width: 150,
      height: 240,
      
      isExpanded: true,
      showButtons: true,

      ParkSwitch: false,
      TrackSwitch: false,

      SpeedTotalNum: [],
      speedNum: 0,

      isIDLE: true,
    };
  },
  created() {
    this.MountTotalSlewRate(7);
    this.$bus.$on('MountParkSwitch', this.MountParkSwitch);
    this.$bus.$on('MountTrackSwitch', this.MountTrackSwitch);
    this.$bus.$on('MountTotalSlewRate',this.MountTotalSlewRate);
  },
  methods: {
    handleMouseDownRA(direction) {
      // 在这里实现调整RA的逻辑
      console.log(`QHYCCD | 调整RA ${direction}`);
      if(direction === 'plus'){
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'MountMoveNorth');
      } else {
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'MountMoveSouth');
      }
      
    },
    handleMouseDownDEC(direction) {
      // 在这里实现调整DEC的逻辑
      console.log(`QHYCCD | 调整DEC ${direction}`);
      if(direction === 'plus'){
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'MountMoveWest');
      } else {
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'MountMoveEast');
      }
    },
    stop() {
      // 在这里实现停止的逻辑
      console.log('QHYCCD | 停止');
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'MountMoveAbort');
    },

    MountPark() {
      console.log('QHYCCD | Park');
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'MountPark');
    },
    MountTrack() {
      console.log('QHYCCD | Truck');
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'MountTrack');
    },
    MountHome() {
      console.log('QHYCCD | Home');
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'MountHome');
    },
    MountSYNC() {
      console.log('QHYCCD | SYNC');
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'MountSYNC');
    },
    
    MountTotalSlewRate(num) {
      console.log('MountTotalSlewRate:',num);
      this.SpeedTotalNum = [];
      for (let i = 0; i < num; i++) {
        this.SpeedTotalNum.push(i);
        console.log('pushSpeed:',i);
      }
    },

    MountSlewRateSwitch() {
      this.speedNum = (this.speedNum + 1) % this.SpeedTotalNum.length;
      console.log('Switching to speed:', this.speedNum);
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'MountSpeedSet:'+this.speedNum);
      this.$refs.speedContent.innerText = this.speedNum;
    },
    
    MountParkSwitch(Switch) {
      if(Switch === 'ON')
      {
        this.ParkSwitch = true;
      }
      else
      {
        this.ParkSwitch = false;
      }
    },
    
    MountTrackSwitch(Switch) {
      if(Switch === 'ON')
      {
        this.TrackSwitch = true;
      }
      else
      {
        this.TrackSwitch = false;
      }
    },

    PanelClose() {
      this.$bus.$emit('MountPanelClose');
    },
  }
}
</script>

<style scoped>
.mount-control-panel {
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

.ra-plus {
  /* clip-path: polygon(0 0, 100% 0, 100% 59%, 90% 60%, 80% 64%, 70% 71%, 60% 75%, 50% 50%, 42% 60%, 36% 70%, 32% 80%, 30% 90%, 29% 100%, 0 100%); */
  
  position:absolute;
  width: 57.5px;
  height: 57.5px;
  top: 0px;
  left: 0px;

  user-select: none;
  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
  box-sizing: border-box;
  border: none;
  mask-image: radial-gradient(circle at 60px 60px, transparent 35px, black 35px);
}

.ra-minus {
  /* clip-path: polygon(100% 0, 0 0, 0 29%, 10% 30%, 20% 32%, 30% 36%, 40% 42%, 50% 50%, 58% 60%, 64% 70%, 68% 80%, 70% 90%, 71% 100%, 100% 100%); */
  
  position:absolute;
  width: 57.5px;
  height: 57.5px;
  top: 0px;
  right: 0px;

  user-select: none;
  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
  box-sizing: border-box;
  border: none;
  mask-image: radial-gradient(circle at -2.5px 60px, transparent 35px, black 35px);
}

.dec-plus {
  /* clip-path: polygon(0 100%, 100% 100%, 100% 71%, 90% 70%, 80% 68%, 70% 64%, 60% 58%, 50% 50%, 42% 40%, 36% 30%, 32% 20%, 30% 10%, 29% 0, 0 0); */
  
  position:absolute;
  width: 57.5px;
  height: 57.5px;
  top: 62.5px;
  left: 0px;

  user-select: none;
  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
  box-sizing: border-box;
  border: none;
  mask-image: radial-gradient(circle at 60px -2.5px, transparent 35px, black 35px);
}

.dec-minus {
  /* clip-path: polygon(100% 100%, 0 100%, 0 71%, 10% 70%, 20% 68%, 30% 64%, 40% 58%, 50% 50%, 58% 40%, 64% 30%, 68% 20%, 70% 10%, 71% 0, 100% 0); */
  
  position:absolute;
  width: 57.5px;
  height: 57.5px;
  top: 62.5px;
  right: 0px;

  user-select: none;
  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
  box-sizing: border-box;
  border: none;
  mask-image: radial-gradient(circle at -2.5px -2.5px, transparent 35px, black 35px);
}

.btn-stop {
  border-radius: 50%;
  position:absolute;
  width: 60px;
  height: 60px;
  top: 45px;
  left: 41px;
  
  background-color: rgba(255, 0, 0, 0.5);
  /* border: 1px solid rgba(255, 255, 255, 0.8); */
  backdrop-filter: blur(5px); /* 添加毛玻璃效果 */
  box-sizing: border-box; /* 设置box-sizing为border-box */
  border: none;
}

.btn-speed:active,
.btn-park:active,
.btn-truck:active,
.btn-park-on:active,
.btn-truck-on:active,
.btn-home:active,
.btn-close:active,
.btn-sync:active {
  transform: scale(0.95); /* 点击时缩小按钮 */
  background-color: rgba(255, 255, 255, 0.7);
}

.ra-plus:active,
.ra-minus:active,
.dec-plus:active,
.dec-minus:active {
  /* transform: scale(0.95); */
  background-color: rgba(255, 255, 255, 0.7);
}
.btn-stop:active {
  transform: scale(0.95); /* 点击时缩小按钮 */
  background-color: rgba(255, 0, 0, 0.5);
}

.no-select {
  user-select: none;
}

.btn-park{
  position:absolute;
  width: 35px;
  height: 35px;
  bottom: 55px;
  left: 10px;

  user-select: none;
  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
  border-radius: 50%;
  box-sizing: border-box;
}

.btn-track{
  position:absolute;
  width: 35px;
  height: 35px;
  bottom: 55px;
  right: calc(50% - 17.5px);

  user-select: none;
  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
  border-radius: 50%;
  box-sizing: border-box;
}

.btn-park-on{
  position:absolute;
  width: 35px;
  height: 35px;
  bottom: 55px;
  left: 10px;

  user-select: none;
  background-color: rgba(0, 255, 30, 0.5);
  backdrop-filter: blur(5px);
  border-radius: 50%;
  box-sizing: border-box;
}

.btn-track-on{
  position:absolute;
  width: 35px;
  height: 35px;
  bottom: 55px;
  right: calc(50% - 17.5px);

  user-select: none;
  background-color: rgba(0, 255, 30, 0.5);
  backdrop-filter: blur(5px);
  border-radius: 50%;
  box-sizing: border-box;
}

.btn-home{
  position:absolute;
  width: 35px;
  height: 35px;
  bottom: 55px;
  right: 10px;
}

.btn-sync{
  position:absolute;
  width: 35px;
  height: 35px;
  bottom: 10px;
  left: 10px;
}

.btn-speed {
  position:absolute;
  width: 35px;
  height: 35px;
  bottom: 10px;
  right: calc(50% - 17.5px);
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

.btn-close {
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
}

</style>
