<template>
  <div class="Dial-Knob-Rect" :style="{ '--positionX': positionX + 'px', '--secondPositionX': secondPositionX + 'px', top: top + 'px', left: left + 'px', width: width + 'px', height: height + 'px' }">
    <div class="indicator" @mousedown="startDrag" @mouseup="stopDrag" @touchstart="startDragMobile" @touchmove="onDragMobile" @touchend="stopDragMobile"></div>
    <div class="second-indicator" @mousedown="startSecondDrag" @mouseup="stopSecondDrag" @touchstart="startSecondDragMobile" @touchmove="onSecondDragMobile" @touchend="stopSecondDragMobile"></div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      top: 5, // 初始位置的垂直坐标
      left: 5, // 初始位置的水平坐标
      width: 190, // 初始宽度
      height: 90, // 初始高度

      DialWidth: 1,
      
      positionX: 0,
      dragging: false,
      startPositionX: 0,
      
      // 新滑块的数据
      secondPositionX: 190,
      secondDragging: false,
      secondStartPositionX: 0,
    };
  },
  created() {
    this.$bus.$on('toggleHistogramPanel', this.setMaxWidth);
    this.$bus.$on('ChangeDialPosition', this.ChangeDialPosition);
  },
  methods: {
    setMaxWidth() {
      const Width = window.innerWidth;
      this.width = Width - 350;
      this.secondPositionX = this.width;
    },
    startDrag(event) {
      event.preventDefault(); // 阻止默认触摸事件
      this.dragging = true;
      this.startPositionX = event.clientX - this.positionX;
      document.addEventListener("mousemove", this.onDrag);
      document.addEventListener("mouseup", this.stopDrag);
    },
    onDrag(event) {
      if (this.dragging) {
        const clientX = event.touches ? event.touches[0].clientX : event.clientX;
        const newPositionX = clientX - this.startPositionX;

        // 确保滑块在组件范围内
        this.positionX = Math.max(0, Math.min(newPositionX, this.secondPositionX));
        this.positionX = Math.max(0, Math.min(newPositionX, this.width - this.DialWidth));

        if (this.secondPositionX - this.positionX < this.DialWidth) {
          this.secondPositionX = this.positionX + this.DialWidth;
        }

        // console.log("Width:", this.width, "PositionX:", this.positionX, "SecondPositionX:", this.secondPositionX);
      }
    },
    stopDrag() {
      this.dragging = false;
      document.removeEventListener("mousemove", this.onDrag);
      document.removeEventListener("mouseup", this.stopDrag);
      
      const HistMin = this.mappedWidth(this.positionX);
      const HistMax = this.mappedWidth(this.secondPositionX);
      console.log("Hist Num:", HistMin, HistMax);
      this.$bus.$emit('HandleHistogramNum', HistMin, HistMax);
    },

    startDragMobile(event) {
      event.preventDefault();
      this.dragging = true;
      this.startPositionX = event.touches[0].clientX - this.positionX;
      document.addEventListener("touchmove", this.onDragMobile);
      document.addEventListener("touchend", this.stopDragMobile);
    },
    onDragMobile(event) {
      if (this.dragging) {
        const clientX = event.touches[0].clientX;
        const newPositionX = clientX - this.startPositionX;
        // 确保滑块在组件范围内
        this.positionX = Math.max(0, Math.min(newPositionX, this.secondPositionX));
        this.positionX = Math.max(0, Math.min(newPositionX, this.width - this.DialWidth));

        if (this.secondPositionX - this.positionX < this.DialWidth) {
          this.secondPositionX = this.positionX + this.DialWidth;
        }

        // console.log("Width:", this.width, "PositionX:", this.positionX, "SecondPositionX:", this.secondPositionX);
      }
    },
    stopDragMobile() {
      this.dragging = false;
      document.removeEventListener("touchmove", this.onDragMobile);
      document.removeEventListener("touchend", this.stopDragMobile);

      const HistMin = this.mappedWidth(this.positionX);
      const HistMax = this.mappedWidth(this.secondPositionX);
      console.log("Hist Num:", HistMin, HistMax);
      this.$bus.$emit('HandleHistogramNum', HistMin, HistMax);
    },
    
    // 新滑块的方法
    startSecondDrag(event) {
      event.preventDefault(); // 阻止默认触摸事件
      this.secondDragging = true;
      this.secondStartPositionX = event.clientX - this.secondPositionX;
      document.addEventListener("mousemove", this.onSecondDrag);
      document.addEventListener("mouseup", this.stopSecondDrag);
    },
    onSecondDrag(event) {
      if (this.secondDragging) {
        const clientX = event.touches ? event.touches[0].clientX : event.clientX;
        const newSecondPositionX = clientX - this.secondStartPositionX;

        this.secondStartPositionX = Math.max(this.positionX, Math.min(newSecondPositionX, this.width));
        this.secondStartPositionX = Math.max(this.DialWidth, Math.min(newSecondPositionX, this.width));

        if (this.secondStartPositionX - this.positionX < this.DialWidth) {
          this.positionX = this.secondStartPositionX - this.DialWidth;
        }

        // console.log("Width:", this.width, "PositionX:", this.positionX, "SecondPositionX:", this.secondPositionX);
      }
    },
    stopSecondDrag() {
      this.secondDragging = false;
      document.removeEventListener("mousemove", this.onSecondDrag);
      document.removeEventListener("mouseup", this.stopSecondDrag);
      
      const HistMin = this.mappedWidth(this.positionX);
      const HistMax = this.mappedWidth(this.secondPositionX);
      console.log("Hist Num:", HistMin, HistMax);
      this.$bus.$emit('HandleHistogramNum', HistMin, HistMax);
    },

    startSecondDragMobile(event) {
      event.preventDefault();
      this.secondDragging = true;
      this.startsecondPositionX = event.touches[0].clientX - this.secondPositionX;
      document.addEventListener("touchmove", this.onDragMobile);
      document.addEventListener("touchend", this.stopDragMobile);
    },
    onSecondDragMobile(event) {
      if (this.secondDragging) {
        const clientX = event.touches[0].clientX;
        const newSecondPositionX = clientX - this.startsecondPositionX;
        // 确保滑块在组件范围内
        this.secondPositionX = Math.max(this.positionX, Math.min(newSecondPositionX, this.width));
        this.secondPositionX = Math.max(this.DialWidth, Math.min(newSecondPositionX, this.width));

        if (this.secondPositionX - this.positionX < this.DialWidth) {
          this.positionX = this.secondPositionX - this.DialWidth;
        }

        // console.log("Width:", this.width, "PositionX:", this.positionX, "SecondPositionX:", this.secondPositionX);
      }
    },
    stopSecondDragMobile() {
      this.secondDragging = false;
      document.removeEventListener("touchmove", this.onDragMobile);
      document.removeEventListener("touchend", this.stopDragMobile);

      const HistMin = this.mappedWidth(this.positionX);
      const HistMax = this.mappedWidth(this.secondPositionX);
      console.log("Hist Num:", HistMin, HistMax);
      this.$bus.$emit('HandleHistogramNum', HistMin, HistMax);
    },

    ChangeDialPosition(min, max) {
      this.positionX = Math.round((min / 255) * this.width);
      this.secondPositionX = Math.round((max / 255) * this.width);
    },
    
    mappedWidth(position) {
      // 映射原始的 width 到 0-255 的范围
      return Math.round((position / this.width) * 255);
    },
  },
};
</script>

<style scoped>
.Dial-Knob-Rect {
  width: 200px;
  height: 60px;

  position: relative;
  cursor: pointer;
  user-select: none;
  /* overflow: hidden; */
  
  background-color: transparent;
  box-sizing: border-box; /* 设置box-sizing为border-box */
}

.indicator {
  width: 10px;
  height: 90px;
  border-radius: 1px;
  position: absolute;
  top: 50%;
  left: var(--positionX);
  transform: translate(-50%, -50%);
  
  background-color: rgba(75, 155, 250, 0.5);
  border: 1px solid rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(5px);
  box-sizing: border-box;
}

.second-indicator {
  width: 10px;
  height: 90px;
  border-radius: 1px;
  position: absolute;
  top: 50%;
  left: var(--secondPositionX);
  transform: translate(-50%, -50%);
  
  background-color: rgba(255, 0, 0, 0.5);
  border: 1px solid rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(5px);
  box-sizing: border-box;
}

.indicator:active:active {
  width: 2px;
  height: 90px;
  border-radius: 1px;
  position: absolute;
  top: 50%;
  left: var(--positionX);
  transform: translate(-50%, -50%);
  
  background-color: rgba(75, 155, 250, 1);
  border: 1px solid rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(5px);
  box-sizing: border-box;
}


.second-indicator:active {
  width: 2px;
  height: 90px;
  border-radius: 1px;
  position: absolute;
  top: 50%;
  left: var(--secondPositionX);
  transform: translate(-50%, -50%);
  
  background-color: rgba(255, 0, 0, 1);
  border: 1px solid rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(5px);
  box-sizing: border-box;
}
</style>

