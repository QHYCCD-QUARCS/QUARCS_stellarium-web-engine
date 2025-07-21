<template>
  <transition name="panel">
    <div class="mount-control-panel"
      :style="{ top: top + 'px', right: right + 'px', width: width + 'px', height: height + 'px' }">
      <div class="display-text-container">
        <!-- 修改：使用紧凑的水平布局和缩写 -->
        <div class="combined-text">
          <div class="pier-side-text">{{ abbreviatedPierSide }}</div>
          <div class="separator">|</div>
          <div class="radec-text">
            <span class="ra-line">{{ currentLatitude }}</span>
            <span class="dec-line">{{ currentLongitude }}</span>
          </div>
        </div>
      </div>

      <div class="Direction-Btn">
        <button class="ra-plus no-select" @touchstart="handleMouseDownRA('plus')" @touchend="stop"
          @mousedown="handleMouseDownRA('plus')" @mouseup="stop">
          <div style="display: flex; justify-content: center; align-items: center;">
            <img src="@/assets/images/svg/ui/RA+.svg" height="40px"
              style="min-height: 40px; pointer-events: none;"></img>
          </div>
        </button>
        <button class="ra-minus no-select" @touchstart="handleMouseDownRA('minus')" @touchend="stop"
          @mousedown="handleMouseDownRA('minus')" @mouseup="stop">
          <div style="display: flex; justify-content: center; align-items: center;">
            <img src="@/assets/images/svg/ui/RA-.svg" height="40px"
              style="min-height: 40px; pointer-events: none;"></img>
          </div>
        </button>
        <button class="dec-plus no-select" @touchstart="handleMouseDownDEC('plus')" @touchend="stop"
          @mousedown="handleMouseDownDEC('plus')" @mouseup="stop">
          <div style="display: flex; justify-content: center; align-items: center;">
            <img src="@/assets/images/svg/ui/DEC+.svg" height="40px"
              style="min-height: 40px; pointer-events: none;"></img>
          </div>
        </button>
        <button class="dec-minus no-select" @touchstart="handleMouseDownDEC('minus')" @touchend="stop"
          @mousedown="handleMouseDownDEC('minus')" @mouseup="stop">
          <div style="display: flex; justify-content: center; align-items: center;">
            <img src="@/assets/images/svg/ui/DEC-.svg" height="40px"
              style="min-height: 40px; pointer-events: none;"></img>
          </div>
        </button>
      </div>

      <div>
        <button class="btn-stop no-select" @click="stop"><v-icon> mdi-stop-circle-outline </v-icon></button>
      </div>

      <div>
        <button class="btn-speed custom-button no-select" @click="MountSlewRateSwitch">
          <span style="position:absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);">{{ MountSpeed
            }}</span>
          <div style="display: flex; justify-content: center; align-items: center;">
            <img src="@/assets/images/svg/ui/SPEED.svg" height="25px"
              style="min-height: 25px; pointer-events: none;"></img>
          </div>
        </button>
      </div>

      <div v-if="showButtons">
        <button v-bind:class="{ 'btn-park-on no-select': ParkSwitch, 'btn-park no-select': !ParkSwitch, 'processing': isParkProcessing, 'error-animation': isErrorPark }"
          @click="handleMountPark">
          <div style="display: flex; justify-content: center; align-items: center;">
            <img src="@/assets/images/svg/ui/Park.svg" height="25px"
              style="min-height: 25px; pointer-events: none;"></img>
          </div>
        </button>
        <button v-bind:class="{ 'btn-track-on no-select': TrackSwitch, 'btn-track no-select': !TrackSwitch, 'processing': isTrackProcessing, 'error-animation': isErrorTrack }"
          @click="handleMountTrack"><v-icon> mdi-target </v-icon></button>
        <button class="custom-button btn-home no-select" :class="{'processing': isHomeProcessing, 'error-animation': isErrorHome}" @click="handleMountHome">
          <div style="display: flex; justify-content: center; align-items: center;">
            <img src="@/assets/images/svg/ui/Home.svg" height="20px"
              style="min-height: 20px; pointer-events: none;"></img>
          </div>
        </button>
        <button class="custom-button btn-sync no-select" :class="{'processing': isSyncProcessing, 'error-animation': isErrorSync}" @click="handleMountSYNC">
          <div style="display: flex; justify-content: center; align-items: center;">
            <img src="@/assets/images/svg/ui/Sync.svg" height="20px"
              style="min-height: 20px; pointer-events: none;"></img>
          </div>
        </button>

        <button class="custom-button btn-slove no-select" :class="{'processing': isSolveProcessing, 'error-animation': isErrorSolve}" @click="handleSolveSYNC">
          <div style="display: flex; justify-content: center; align-items: center;">
            <img src="@/assets/images/svg/ui/Solve.svg" height="25px"
              style="min-height: 25px; pointer-events: none;"></img>
          </div>
        </button>
      </div>

      <div>
        <span v-if="isIDLE" class="icon-container">
          <div style="display: flex; justify-content: center; align-items: center;">
            <img src="@/assets/images/svg/ui/Status-idle.svg" height="15px"
              style="min-height: 15px; pointer-events: none;"></img>
          </div>
        </span>
        <span v-else class="icon-container">
          <div style="display: flex; justify-content: center; align-items: center;">
            <img src="@/assets/images/svg/ui/Status-busy.svg" height="15px"
              style="min-height: 15px; pointer-events: none;"></img>
          </div>
        </span>
      </div>

      <div>
        <button class="btn-close no-select" @click="PanelClose">
          <div style="display: flex; justify-content: center; align-items: center;">
            <img src="@/assets/images/svg/ui/OFF.svg" height="12px"
              style="min-height: 12px; pointer-events: none;"></img>
          </div>
        </button>
      </div>

    </div>
  </transition>
</template>

<script>
export default {
  name: 'MountControlPanel',
  data() {
    return {
      top: 50,
      right: 10,
      startX: 0,
      startY: 0,
      width: 150,
      height: 240,

      isExpanded: true,
      showButtons: true,

      ParkSwitch: false,
      TrackSwitch: false,

      SpeedTotalNum: [],

      isIDLE: true,

      FocalLength: 510,
      // CameraSizeWidth: 24.9,
      // CameraSizeHeight: 16.6,

      RaDec: 0,

      MountSpeed: 1,

      MountPierSide: '',
      currentLatitude: '',
      currentLongitude: '',
      
      // 移除定时器相关变量
      // showPierSide: true,
      // displayTimer: null,
      // timerStarted: false,

      isMountConnected: false,
      
      isParkProcessing: false,
      isTrackProcessing: false, 
      isHomeProcessing: false,
      isSyncProcessing: false,
      isSolveProcessing: false,
      
      isErrorPark: false,
      isErrorTrack: false,
      isErrorHome: false,
      isErrorSync: false,
      isErrorSolve: false,
    };
  },
  computed: {
    // 新增：子午面信息缩写
    abbreviatedPierSide() {
      if (!this.MountPierSide) return '';
      
      const pierSide = this.MountPierSide.toLowerCase();
      if (pierSide.includes('east') || pierSide.includes('e')) {
        return 'E';
      } else if (pierSide.includes('west') || pierSide.includes('w')) {
        return 'W';
      } else if (pierSide.includes('north') || pierSide.includes('n')) {
        return 'N';
      } else if (pierSide.includes('south') || pierSide.includes('s')) {
        return 'S';
      }
      
      // 如果是其他格式，尝试取第一个字符
      return this.MountPierSide.charAt(0).toUpperCase();
    }
  },
  created() {
    // this.MountTotalSlewRate(7);
    this.$bus.$on('MountParkSwitch', this.MountParkSwitch);
    this.$bus.$on('MountTrackSwitch', this.MountTrackSwitch);
    // this.$bus.$on('MountTotalSlewRate',this.MountTotalSlewRate);
    this.$bus.$on('newMountSlewRate', this.newMountSlewRate);
    this.$bus.$on('TargetRaDec', this.getTargetRaDec);
    this.$bus.$on('MountGoto', this.MountGoto);
    this.$bus.$on('MountStatus', this.MountStatus);
    this.$bus.$on('updateMountPierSide', this.updateMountPierSide);
    this.$bus.$on('MountConnected', this.updateMountConnection);
    this.$bus.$on('MountOperationComplete', this.handleOperationComplete);
    
    // 新增经纬度监听
    this.$bus.$on('updateCurrentLocation', this.updateCurrentLocation);
    
    // 移除自动启动定时器的代码
    // this.startDisplayTimer();
  },
  beforeDestroy() {
    // 移除定时器清理代码
    // if (this.displayTimer) {
    //   clearInterval(this.displayTimer);
    //   this.displayTimer = null;
    // }
  },
  methods: {
    handleMouseDownRA(direction) {
      if (!this.isMountConnected) {
        this.$bus.$emit('showMsgBox', '赤道仪未连接，无法执行操作', 'error');
        return;
      }
      this.$bus.$emit('SendConsoleLogMsg', `Mount Move RA ${direction}`, 'info');
      if (direction === 'plus') {
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'MountMoveWest');
      } else {
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'MountMoveEast');
      }
    },
    handleMouseDownDEC(direction) {
      if (!this.isMountConnected) {
        this.$bus.$emit('showMsgBox', '赤道仪未连接，无法执行操作', 'error');
        return;
      }
      this.$bus.$emit('SendConsoleLogMsg', `Mount Move DEC ${direction}`, 'info');
      if (direction === 'plus') {
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'MountMoveNorth');
      } else {
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'MountMoveSouth');
      }
    },
    stop() {
      if (!this.isMountConnected) {
        this.$bus.$emit('showMsgBox', '赤道仪未连接，无法执行操作', 'error');
        return;
      }
      console.log('QHYCCD | 停止');
      this.$bus.$emit('SendConsoleLogMsg', 'Mount Move Abort', 'info');
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'MountMoveAbort');
    },

    MountPark() {
      console.log('QHYCCD | Park');
      this.isParkProcessing = true;
      this.$bus.$emit('SendConsoleLogMsg', 'Mount Park', 'info');
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'MountPark');
      // 处理状态将由MountOperationComplete信号结束
    },
    MountTrack() {
      console.log('QHYCCD | Truck');
      this.isTrackProcessing = true;
      this.$bus.$emit('SendConsoleLogMsg', 'Mount Truck', 'info');
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'MountTrack');
      // 处理状态将由MountOperationComplete信号结束
    },
    MountHome() {
      console.log('QHYCCD | Home');
      this.isHomeProcessing = true;
      this.$bus.$emit('SendConsoleLogMsg', 'Mount Home', 'info');
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'MountHome');
      // 1秒后自动结束动画
      setTimeout(() => {
        this.isHomeProcessing = false;
      }, 1000);
    },
    MountSYNC() {
      console.log('QHYCCD | SYNC');
      this.isSyncProcessing = true;
      this.$bus.$emit('SendConsoleLogMsg', 'Mount SYNC', 'info');
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'MountSYNC');
      // 1秒后自动结束动画
      setTimeout(() => {
        this.isSyncProcessing = false;
      }, 1000);
    },
    SolveSYNC() {
      console.log('QHYCCD | SolveSYNC');
      this.isSolveProcessing = true;
      this.$bus.$emit('SendConsoleLogMsg', 'Mount Solve SYNC', 'info');
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'SolveSYNC:' + this.FocalLength);
      // 处理状态将由MountOperationComplete信号结束
    },
    getTargetRaDec(value) {
      console.log('getTargetRaDec:', value);
      this.RaDec = value;
    },
    MountGoto() {
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'MountGoto:' + this.RaDec);
    },

    MountStatus(status) {
      if (status === 'Slewing') {
        this.isIDLE = false;
      }
      else {
        this.isIDLE = true;
      }
    },

    // MountTotalSlewRate(num) {
    //   console.log('MountTotalSlewRate:',num);
    //   this.SpeedTotalNum = [];
    //   for (let i = 1; i <= num; i++) {
    //     this.SpeedTotalNum.push(i);
    //     console.log('pushSpeed:',i);
    //   }
    // },
    newMountSlewRate(num) {
      this.MountSpeed = num;
    },

    MountSlewRateSwitch() {
      if (!this.isMountConnected) {
        this.showErrorAnimation('speed');
        return;
      }
      if (this.MountSpeed !== -1) {
        this.$bus.$emit('AppSendMessage', 'Vue_Command', 'MountSpeedSwitch');
      }else{
        this.$bus.$emit('SendConsoleLogMsg', 'Mount not has speed or Mount is not connected!', 'warning');
      }
    },

    MountParkSwitch(Switch) {
      if (Switch === 'ON') {
        this.ParkSwitch = true;
        this.handleOperationComplete('park');
      }
      else {
        this.ParkSwitch = false;
        this.handleOperationComplete('park');
      }
    },

    MountTrackSwitch(Switch) {
      if (Switch === 'ON') {
        this.TrackSwitch = true;
        this.handleOperationComplete('track');
      }
      else {
        this.TrackSwitch = false;
        this.handleOperationComplete('track');
      }
    },

    updateMountPierSide(side) {
      this.MountPierSide = side;
      // 移除定时器启动逻辑
      // if (!this.timerStarted && side && side.trim() !== '') {
      //   this.startDisplayTimer();
      //   this.timerStarted = true;
      //   console.log('首次获取到子午面数据，启动切换定时器:', side);
      // }
    },
    
    updateCurrentLocation(ra, dec) {
      // 处理从App.vue传来的RA和DEC数据
      console.log('收到望远镜位置数据:', ra, dec);
      
      // 现在RA是度数格式，需要转换为小时格式
      const raDegrees = parseFloat(ra);   // 度数格式
      const decDegrees = parseFloat(dec); // 度数格式
      
      if (!isNaN(raDegrees)) {
        // 将度数转换为小时：小时 = 度数 / 15
        const raHours = raDegrees / 15.0;
        this.currentLatitude = this.formatRATime(raHours);
      }
      
      if (!isNaN(decDegrees)) {
        this.currentLongitude = this.formatDecDegrees(decDegrees);
      }
      
      // 移除定时器启动逻辑
      // if (!this.timerStarted && this.MountPierSide && this.currentLatitude && this.currentLongitude) {
      //   this.startDisplayTimer();
      // }
    },
    
    formatRATime(hours) {
      if (hours === null || hours === undefined || isNaN(hours)) return '';
      
      // 确保小时值在0-24范围内
      let normalizedHours = hours;
      while (normalizedHours < 0) normalizedHours += 24;
      while (normalizedHours >= 24) normalizedHours -= 24;
      
      // 转换为时分秒
      const h = Math.floor(normalizedHours);
      const remainingMinutes = (normalizedHours - h) * 60;
      const m = Math.floor(remainingMinutes);
      const s = Math.floor((remainingMinutes - m) * 60);
      
      // 更紧凑的格式显示
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    },
    
    formatDecDegrees(degrees) {
      if (degrees === null || degrees === undefined || isNaN(degrees)) return '';
      
      // 处理正负号
      const sign = degrees >= 0 ? '+' : '-';
      const absDegrees = Math.abs(degrees);
      
      // 转换为度分秒
      const d = Math.floor(absDegrees);
      const remainingMinutes = (absDegrees - d) * 60;
      const m = Math.floor(remainingMinutes);
      const s = Math.floor((remainingMinutes - m) * 60);
      
      // 更紧凑的格式显示
      return `${sign}${d.toString().padStart(2, '0')}°${m.toString().padStart(2, '0')}'${s.toString().padStart(2, '0')}"`;
    },
    
    // 移除定时器相关方法
    // startDisplayTimer() {
    //   // 移除这个方法
    // },
    
    PanelClose() {
      // 移除定时器清理代码
      // if (this.displayTimer) {
      //   clearInterval(this.displayTimer);
      //   this.displayTimer = null;
      // }
      // this.timerStarted = false;
      this.$bus.$emit('MountPanelClose');
    },

    updateMountConnection(status) {
      this.isMountConnected = status === 1;
    },
    
    handleOperationComplete(operation) {
      switch(operation) {
        case 'park':
          this.isParkProcessing = false;
          break;
        case 'track':
          this.isTrackProcessing = false;
          break;
        case 'home':
          this.isHomeProcessing = false;
          break;
        case 'sync':
          this.isSyncProcessing = false;
          break;
        case 'solve':
          this.isSolveProcessing = false;
          break;
      }
    },
    
    showErrorAnimation(type) {
      switch(type) {
        case 'park':
          this.isErrorPark = true;
          setTimeout(() => { this.isErrorPark = false; }, 800);
          break;
        case 'track':
          this.isErrorTrack = true;
          setTimeout(() => { this.isErrorTrack = false; }, 800);
          break;
        case 'home':
          this.isErrorHome = true;
          setTimeout(() => { this.isErrorHome = false; }, 800);
          break;
        case 'sync':
          this.isErrorSync = true;
          setTimeout(() => { this.isErrorSync = false; }, 800);
          break;
        case 'solve':
          this.isErrorSolve = true;
          setTimeout(() => { this.isErrorSolve = false; }, 800);
          break;
      }
      this.$bus.$emit('showMsgBox', '赤道仪未连接，无法执行操作', 'error');
    },
    
    handleMountPark() {
      if (!this.isMountConnected) {
        this.showErrorAnimation('park');
        return;
      }
      this.MountPark();
    },
    
    handleMountTrack() {
      if (!this.isMountConnected) {
        this.showErrorAnimation('track');
        return;
      }
      this.MountTrack();
    },
    
    handleMountHome() {
      if (!this.isMountConnected) {
        this.showErrorAnimation('home');
        return;
      }
      this.MountHome();
    },
    
    handleMountSYNC() {
      if (!this.isMountConnected) {
        this.showErrorAnimation('sync');
        return;
      }
      this.MountSYNC();
    },
    
    handleSolveSYNC() {
      if (!this.isMountConnected) {
        this.showErrorAnimation('solve');
        return;
      }
      this.SolveSYNC();
    },
  }
}
</script>

<style scoped>
.mount-control-panel {
  pointer-events: auto;
  position: fixed;
  background-color: rgba(64, 64, 64, 0.5);
  backdrop-filter: blur(5px);
  border-radius: 10px;
  border: 4px solid rgba(128, 128, 128, 0.5);
  box-sizing: border-box;
  /* overflow: hidden; */
}

@keyframes showPanelAnimation {
  from {
    right: -150px;
  }

  to {
    right: 10px;
  }
}

@keyframes hidePanelAnimation {
  from {
    right: 10px;
  }

  to {
    right: -150px;
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

  position: absolute;
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

  position: absolute;
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

  position: absolute;
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

  position: absolute;
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
  position: absolute;
  width: 60px;
  height: 60px;
  top: 45px;
  left: 41px;

  background-color: rgba(255, 0, 0, 0.5);
  /* border: 1px solid rgba(255, 255, 255, 0.8); */
  backdrop-filter: blur(5px);
  /* 添加毛玻璃效果 */
  box-sizing: border-box;
  /* 设置box-sizing为border-box */
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
  transform: scale(0.95);
  /* 点击时缩小按钮 */
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
  transform: scale(0.95);
  /* 点击时缩小按钮 */
  background-color: rgba(255, 0, 0, 0.5);
}

.no-select {
  user-select: none;
}

.btn-park {
  position: absolute;
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

.btn-track {
  position: absolute;
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

.btn-park-on {
  position: absolute;
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

.btn-track-on {
  position: absolute;
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

.btn-home {
  position: absolute;
  width: 35px;
  height: 35px;
  bottom: 55px;
  right: 10px;
}

.btn-sync {
  position: absolute;
  width: 35px;
  height: 35px;
  bottom: 10px;
  left: 10px;
}

.btn-speed {
  position: absolute;
  width: 35px;
  height: 35px;
  bottom: 10px;
  right: calc(50% - 17.5px);
}

.btn-slove {
  position: absolute;
  width: 35px;
  height: 35px;
  bottom: 10px;
  right: 10px;
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

@keyframes processing-animation {
  0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.7); }
  50% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(255, 255, 255, 0); }
  100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 255, 255, 0); }
}

.processing {
  animation: processing-animation 1s infinite;
  background-color: rgba(72, 72, 255, 0.5) !important;
}

@keyframes error-animation {
  0% { transform: scale(1); background-color: rgba(255, 0, 0, 0.3); }
  50% { transform: scale(1.1); background-color: rgba(255, 0, 0, 0.8); }
  100% { transform: scale(1); background-color: rgba(0, 0, 0, 0.3); }
}

.error-animation {
  animation: error-animation 0.8s;
}

.display-text-container {
  position: absolute;
  top: 3%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  width: 140px;
  color: rgba(255, 255, 255, 0.5);
  user-select: none;
}

/* 修改：更紧凑的水平布局样式 */
.combined-text {
  display: flex;
  flex-direction: row;
  gap: 1px;
  align-items: center;
  justify-content: center;
  flex-wrap: nowrap;
}

.pier-side-text {
  font-size: 6px;
  line-height: 1;
  flex-shrink: 0;
  white-space: nowrap;
  min-width: 8px;
}

.separator {
  font-size: 6px;
  color: rgba(255, 255, 255, 0.3);
  flex-shrink: 0;
  margin: 0;
}

.radec-text {
  font-size: 5px;
  line-height: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1px;
  flex-wrap: nowrap;
  flex-shrink: 1;
}

.ra-line, .dec-line {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 1;
}

/* 移除不需要的样式 */
/* .separator {
  margin: 0 1px;
  flex-shrink: 0;
} */
</style>
