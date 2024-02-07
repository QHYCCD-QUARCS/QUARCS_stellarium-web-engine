<template>
  <div class="mount-control-panel" :style="{ top: top + 'px', right: right + 'px', width: width + 'px', height: height + 'px' }">
    <div>
      <button class="custom-button ra-plus no-select" @touchstart="handleMouseDownRA('plus')" @touchend="stop">RA +</button>
      <button class="custom-button ra-minus no-select" @touchstart="handleMouseDownRA('minus')" @touchend="stop">RA -</button>
    </div>
    <div>
      <button class="custom-button dec-plus no-select" @touchstart="handleMouseDownDEC('plus')" @touchend="stop">DEC +</button>
      <button class="custom-button dec-minus no-select" @touchstart="handleMouseDownDEC('minus')" @touchend="stop">DEC -</button>
    </div>
    <!-- <div>
      <button class="custom-button ra-plus no-select" @mousedown="handleMouseDownRA('plus')" @mouseup="stop">RA +</button>
      <button class="custom-button ra-minus no-select" @mousedown="handleMouseDownRA('minus')" @mouseup="stop">RA -</button>
    </div>
    <div>
      <button class="custom-button dec-plus no-select" @mousedown="handleMouseDownDEC('plus')" @mouseup="stop" >DEC +</button>
      <button class="custom-button dec-minus no-select" @mousedown="handleMouseDownDEC('minus')" @mouseup="stop">DEC -</button>
    </div> -->

    <div class="Dial-Knob">
      <div class="tick-marks">
        <div class="tick-mark" v-for="(angle, index) in snapAngles" :key="index" :style="{ transform: `rotate(${angle}deg)` }"></div>
      </div>
      <div class="knob" :style="{ transform: `rotate(${angle}deg)` }">
        <div class="indicator" @mousedown="startDrag" @touchstart="startDragMobile">{{ speedNum }}</div>
      </div>
    </div>

    <div>
      <button class="btn-stop no-select" @touchend="stop">STOP</button>
    </div>
    <div>
      <button class="btn-more custom-button no-select" @touchend="toggleMore">
        <span v-if="isExpanded">
          <v-icon>mdi-chevron-up</v-icon>
        </span>
        <span v-else>
          <v-icon>mdi-chevron-down</v-icon>
        </span>
      </button>
    </div>
    
      <div v-if="showButtons">
        <button v-bind:class="{ 'btn-park-on no-select': ParkSwitch, 'btn-park no-select': !ParkSwitch }" @touchend="MountPark">Park</button>
        <button v-bind:class="{ 'btn-track-on no-select': TrackSwitch, 'btn-track no-select': !TrackSwitch }" @touchend="MountTrack">Track</button>
        <button class="custom-button btn-home no-select" @touchend="MountHome">Home</button>
        <button class="custom-button btn-sync no-select" @touchend="MountSYNC">SYNC</button>
      </div>
    
  </div>
</template>

<script>
export default {
  name: 'MountControlPanel',
  data() {
    return {
      top: 50, // 初始位置的垂直坐标
      right: 50, // 初始位置的水平坐标
      startX: 0,
      startY: 0,
      width: 150, // 初始宽度
      height: 180,
      
      angle: 0,
      dragging: false,
      startAngle: 0,
      
      isExpanded: false, // 新增状态来追踪面板是否展开
      showButtons: false,

      ParkSwitch: false,
      TrackSwitch: false,

      // angle: 0,
      // dragging: false,
      // startAngle: 0,
      snapAngles: [], // 定义吸附的角度位置
      speedNum: 0,
    };
  },
  created() {
    this.generateSnapAngles(360);
    this.$bus.$on('MountParkSwitch', this.MountParkSwitch);
    this.$bus.$on('MountTrackSwitch', this.MountTrackSwitch);
    this.$bus.$on('MountTotalSlewRate',this.generateSnapAngles);
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
    
    startDrag(event) {
      this.dragging = true;
      this.startAngle = this.getAngle(event);
      document.addEventListener("mousemove", this.onDrag);
      document.addEventListener("mouseup", this.stopDrag);
    },
    onDrag(event) {
      if (this.dragging) {
        const currentAngle = this.getAngle(event);
        this.angle += currentAngle - this.startAngle;
        this.startAngle = currentAngle;
      }
    },
    stopDrag() {
      this.dragging = false;
      // 在拖拽结束时吸附到最近的角度位置
      const nearestAngle = this.findNearestAngle(this.angle);
      this.angle = nearestAngle;
      
       // 获取当前档数
       this.speedNum = this.snapAngles.indexOf(nearestAngle) + 1;
       console.log('当前档数：', this.speedNum);
       this.$bus.$emit('AppSendMessage', 'Vue_Command', 'MountSpeedSet:'+this.speedNum);  
      
      document.removeEventListener("mousemove", this.onDrag);
      document.removeEventListener("mouseup", this.stopDrag);
    },
    getAngle(event) {
      const rect = this.$el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.width / 2;
      const deltaX = event.clientX - centerX;
      const deltaY = event.clientY - centerY;
      return (Math.atan2(deltaY, deltaX) * 180) / Math.PI;
    },
    
    startDragMobile(event) {
      event.preventDefault(); // 阻止默认触摸事件
      this.dragging = true;
      this.startAngle = this.getAngle(event.touches[0]); // 使用触摸事件的第一个触摸点
      document.addEventListener("touchmove", this.onDragMobile);
      document.addEventListener("touchend", this.stopDragMobile);
    },

    onDragMobile(event) {
      if (this.dragging) {
        const currentAngle = this.getAngle(event.touches[0]); // 使用触摸事件的第一个触摸点
        this.angle += currentAngle - this.startAngle;
        this.startAngle = currentAngle;
      }
    },

    stopDragMobile() {
      this.dragging = false;
      // 在触摸拖拽结束时吸附到最近的角度位置
      const nearestAngle = this.findNearestAngle(this.angle);
      this.angle = nearestAngle;
      
      // 获取当前档数
      this.speedNum = this.snapAngles.indexOf(nearestAngle) + 1;
      console.log('当前档数：', this.speedNum);    
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'MountSpeedSet:'+this.speedNum);  
      
      document.removeEventListener("touchmove", this.onDragMobile);
      document.removeEventListener("touchend", this.stopDragMobile);
    },

    findNearestAngle(angle) {
      // 处理角度值在0到360度之间
      angle = (angle % 360 + 360) % 360;

      let nearestAngle = this.snapAngles[0];
      let minDifference = Math.abs(angle - nearestAngle);
      for (let i = 1; i < this.snapAngles.length; i++) {
        const difference = Math.abs(angle - this.snapAngles[i]);
        if (difference < minDifference) {
          minDifference = difference;
          nearestAngle = this.snapAngles[i];
        }
      }
      return nearestAngle;
    },
    generateSnapAngles(num) {
      // 生成 num 个吸附角度，将其均匀分布在360度内
      console.log('generateSnapAngles:',num);
      this.snapAngles = [];
      const interval = 360 / num;
      for (let i = 0; i < num; i++) {
        this.snapAngles.push(i * interval);
        console.log('pushAngle:',i * interval);
      }
    },
    
    toggleMore() {
      this.isExpanded = !this.isExpanded;
      if (this.isExpanded) {
        setTimeout(() => {
          this.showButtons = true;
        }, 100);
        this.height = 255;
      } else {
        setTimeout(() => {
          this.showButtons = false;
        }, 30);
        this.height = 180;
      }
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
  box-sizing: border-box;
  transition: height 0.2s ease;
}

.custom-button {
  user-select: none;
  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
  border-radius: 5px;
  box-sizing: border-box;
}

.ra-plus {
  clip-path: polygon(0 0, 100% 0, 100% 29%, 90% 30%, 80% 32%, 70% 36%, 60% 42%, 50% 50%, 42% 60%, 36% 70%, 32% 80%, 30% 90%, 29% 100%, 0 100%);
  
  position:absolute;
  width: 70px;
  height: 70px;
  top: 4px;
  left: 4px;
}

.ra-minus {
  clip-path: polygon(100% 0, 0 0, 0 29%, 10% 30%, 20% 32%, 30% 36%, 40% 42%, 50% 50%, 58% 60%, 64% 70%, 68% 80%, 70% 90%, 71% 100%, 100% 100%);
  
  position:absolute;
  width: 70px;
  height: 70px;
  top: 4px;
  right: 4px;
}

.dec-plus {
  clip-path: polygon(0 100%, 100% 100%, 100% 71%, 90% 70%, 80% 68%, 70% 64%, 60% 58%, 50% 50%, 42% 40%, 36% 30%, 32% 20%, 30% 10%, 29% 0, 0 0);
  
  position:absolute;
  width: 70px;
  height: 70px;
  top: 76px;
  left: 4px;
}

.dec-minus {
  clip-path: polygon(100% 100%, 0 100%, 0 71%, 10% 70%, 20% 68%, 30% 64%, 40% 58%, 50% 50%, 58% 40%, 64% 30%, 68% 20%, 70% 10%, 71% 0, 100% 0);
  
  position:absolute;
  width: 70px;
  height: 70px;
  top: 76px;
  right: 4px;
}

.btn-stop {
  border-radius: 50%;
  position:absolute;
  width: 50px;
  height: 50px;
  top: 50px;
  left: 50px;
  
  background-color: rgba(255, 0, 0, 0.3);
  /* border: 1px solid rgba(255, 255, 255, 0.8); */
  backdrop-filter: blur(5px); /* 添加毛玻璃效果 */
  box-sizing: border-box; /* 设置box-sizing为border-box */
}

/* .btn-stop::before {
  content: "";
  position: absolute;
  width: 2px;
  height: 2px;
  background-color: red;
  border-radius: 50%;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
} */

.ra-plus:active,
.ra-minus:active,
.dec-plus:active,
.dec-minus:active,
.btn-more:active,
.btn-park:active,
.btn-truck:active,
.btn-park-on:active,
.btn-truck-on:active,
.btn-home:active,
.btn-sync:active {
  transform: scale(0.95); /* 点击时缩小按钮 */
  background-color: rgba(255, 255, 255, 0.7);
}

.btn-stop:active {
  transform: scale(0.95); /* 点击时缩小按钮 */
  background-color: rgba(255, 0, 0, 0.5);
}

.no-select {
  user-select: none;
}

.Dial-Knob {
  width: 100px;
  height: 100px;
  top: 25px;
  left: 25px;
  position: relative;
}

.tick-marks {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: -48px;
  transform-origin: center center;
  transform: rotate(90deg);
}

.tick-mark {
  position: absolute;
  width: 4px; /* 刻度线的宽度 */
  height: 4px; /* 刻度线的高度 */
  border-radius: 50%;
  background-color: rgba(0, 0, 0, 0.5);
  transform-origin: 50px; /* 以刻度线顶部为旋转中心 */
}

.knob {
  width: 100px;
  height: 100px;
  background-color: rgba(50, 50, 50, 0.5);
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  user-select: none;
  position: relative;
}

.indicator {
  width: 25px;
  height: 25px;
  border-radius: 50%; /* 添加圆角半径属性 */
  position: absolute;
  top: 0px; /* 调整垂直位置 */
  left: 50%;
  transform: translateX(-50%);
  /* transform: translate(-50%, -50%); */
  background-color: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px); /* 添加毛玻璃效果 */
  cursor: pointer;
  user-select: none;
  box-sizing: border-box;

  color: rgba(0, 0, 0, 0.3);
  font-size: 16px;
  text-align: center;
}

.btn-more {
  position:absolute;
  width: 142px;
  height: 25px;
  bottom: 4px; /* 保持在底部 */
  left: 4px;
}

.btn-park{
  position:absolute;
  width: 70px;
  height: 35px;
  bottom: 70px;
  left: 4px;

  user-select: none;
  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
  border-radius: 5px;
  box-sizing: border-box;
}

.btn-track{
  position:absolute;
  width: 70px;
  height: 35px;
  bottom: 70px;
  right: 4px;

  user-select: none;
  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
  border-radius: 5px;
  box-sizing: border-box;
}

.btn-park-on{
  position:absolute;
  width: 70px;
  height: 35px;
  bottom: 70px;
  left: 4px;

  user-select: none;
  background-color: rgba(0, 255, 30, 0.5);
  backdrop-filter: blur(5px);
  border-radius: 5px;
  box-sizing: border-box;
}

.btn-track-on{
  position:absolute;
  width: 70px;
  height: 35px;
  bottom: 70px;
  right: 4px;

  user-select: none;
  background-color: rgba(0, 255, 30, 0.5);
  backdrop-filter: blur(5px);
  border-radius: 5px;
  box-sizing: border-box;
}

.btn-home{
  position:absolute;
  width: 70px;
  height: 35px;
  bottom: 33px;
  left: 4px;
}

.btn-sync{
  position:absolute;
  width: 70px;
  height: 35px;
  bottom: 33px;
  right: 4px;
}


</style>
