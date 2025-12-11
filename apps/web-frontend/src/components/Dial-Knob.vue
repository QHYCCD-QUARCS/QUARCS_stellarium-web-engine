<template>
  <div class="Dial-Knob-Rect" :style="{ '--positionX': positionX + 'px', '--secondPositionX': secondPositionX + 'px', top: top + 'px', left: left + 'px', width: width + 'px', height: height + 'px' }">
    <div class="indicator" @mousedown="startDrag" @mouseup="stopDrag" @touchstart="startDragMobile" @touchmove="onDragMobile" @touchend="stopDragMobile"></div>
    <div class="second-indicator" @mousedown="startSecondDrag" @mouseup="stopSecondDrag" @touchstart="startSecondDragMobile" @touchmove="onSecondDragMobile" @touchend="stopSecondDragMobile"></div>

    <!-- 底部下标：显示当前区间/全图的最小值与最大值 -->
    <div class="dial-labels">
      <span class="dial-label-min">{{ displayMin }}</span>
      <span class="dial-label-max">{{ displayMax }}</span>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      top: 5, // 初始位置的垂直坐标
      left: 5, // 初始位置的水平坐标
      width: 190, // 初始宽度
      height: 80, // 初始高度

      DialWidth: 1,
      
      positionX: 0,
      dragging: false,
      startPositionX: 0,
      
      // 新滑块的数据
      secondPositionX: 190,
      secondDragging: false,
      secondStartPositionX: 65535,

      // 是否使用“有效区间模式”（与直方图的区间模式联动）
      useEffectiveRange: true,
      // 自动拉伸得到的固定区间（作为“区间模式”的基准）
      autoMin: 0,
      autoMax: 65535,
      // 当前窗口实际使用的最小/最大值（由拨盘控制）
      windowMin: 0,
      windowMax: 65535,
    };
  },
  computed: {
    // 下标显示的左/右端点数值
    displayMin() {
      // 区间模式：显示固定的自动拉伸最小值；全图模式：0
      if (this.useEffectiveRange && this.autoMax > this.autoMin) {
        return this.autoMin;
      }
      return 0;
    },
    displayMax() {
      // 区间模式：显示固定的自动拉伸最大值；全图模式：65535
      if (this.useEffectiveRange && this.autoMax > this.autoMin) {
        return this.autoMax;
      }
      return 65535;
    },
  },
  created() {
    this.$bus.$on('toggleHistogramPanel', this.setMaxWidth);
    this.$bus.$on('ChangeDialPosition', this.ChangeDialPosition);
    // 与直方图区间模式联动
    this.$bus.$on('HistogramRangeMode', this.setRangeMode);
    // 接收当前图像的自动拉伸范围，作为区间模式的固定范围
    this.$bus.$on('AutoHistogramNum', this.setAutoRange);
  },
  mounted() {
    window.addEventListener('resize', this.setMaxWidth);
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.setMaxWidth);
  },
  methods: {
    setMaxWidth() {
      const Width = window.innerWidth;
      this.width = Math.min(Width - 350, 490);
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
      console.log("Hist Num:", HistMin, HistMax, "(16-bit range)");
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
      console.log("Hist Num:", HistMin, HistMax, "(16-bit range)");
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
        
        // 关键修复：更新正确的变量，使用一次赋值
        this.secondPositionX = Math.max(this.positionX + this.DialWidth, 
                                  Math.min(newSecondPositionX, this.width));
        
        // 保持最小间距
        if (this.secondPositionX - this.positionX < this.DialWidth) {
          this.positionX = this.secondPositionX - this.DialWidth;
        }
      }
    },
    stopSecondDrag() {
      this.secondDragging = false;
      document.removeEventListener("mousemove", this.onSecondDrag);
      document.removeEventListener("mouseup", this.stopSecondDrag);
      
      const HistMin = this.mappedWidth(this.positionX);
      const HistMax = this.mappedWidth(this.secondPositionX);
      console.log("Hist Num:", HistMin, HistMax, "(16-bit range)");
      this.$bus.$emit('HandleHistogramNum', HistMin, HistMax);
    },

    startSecondDragMobile(event) {
      event.preventDefault();
      this.secondDragging = true;
      this.secondStartPositionX = event.touches[0].clientX - this.secondPositionX;
      document.addEventListener("touchmove", this.onSecondDragMobile);
      document.addEventListener("touchend", this.stopSecondDragMobile);
    },
    onSecondDragMobile(event) {
      if (this.secondDragging) {
        const clientX = event.touches[0].clientX;
        const newSecondPositionX = clientX - this.secondStartPositionX;
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
      document.removeEventListener("touchmove", this.onSecondDragMobile);
      document.removeEventListener("touchend", this.stopSecondDragMobile);

      const HistMin = this.mappedWidth(this.positionX);
      const HistMax = this.mappedWidth(this.secondPositionX);
      console.log("Hist Num:", HistMin, HistMax, "(16-bit range)");
      this.$bus.$emit('HandleHistogramNum', HistMin, HistMax);
    },

    ChangeDialPosition(min, max) {
      // 外部请求设置当前窗口的最小/最大值（包括自动拉伸和手动调整）
      this.windowMin = min;
      this.windowMax = max;

      if (this.useEffectiveRange && this.autoMax > this.autoMin) {
        // 区间模式：相对于固定的自动拉伸范围 [autoMin, autoMax] 计算滑块位置
        const range = this.autoMax - this.autoMin || 1;
        const tMin = (min - this.autoMin) / range;
        const tMax = (max - this.autoMin) / range;
        this.positionX = Math.round(this.width * Math.max(0, Math.min(tMin, 1)));
        this.secondPositionX = Math.round(this.width * Math.max(0, Math.min(tMax, 1)));
      } else {
        // 全图模式：拨盘映射到全 0-65535
        this.positionX = Math.round((min / 65535) * this.width);
        this.secondPositionX = Math.round((max / 65535) * this.width);
      }
    },
    
    mappedWidth(position) {
      // 根据模式，将拨盘位置映射回真实 16bit 灰度值
      if (this.useEffectiveRange && this.autoMax > this.autoMin) {
        const t = this.width > 0 ? (position / this.width) : 0;
        return Math.round(this.autoMin + t * (this.autoMax - this.autoMin));
      }
      // 全图模式：映射到 0-65535
      return Math.round((position / this.width) * 65535);
    },

    // 与直方图区间模式同步
    setRangeMode(flag) {
      this.useEffectiveRange = flag;
      // 切换模式时，重新根据当前窗口刷新滑块位置
      this.ChangeDialPosition(this.windowMin, this.windowMax);
    },

    // 由自动拉伸结果设置固定区间
    setAutoRange(min, max) {
      this.autoMin = min;
      this.autoMax = max;
      // 初始窗口与自动拉伸范围一致
      this.windowMin = min;
      this.windowMax = max;
      this.ChangeDialPosition(this.windowMin, this.windowMax);
    },
  },
};
</script>

<style scoped>
.Dial-Knob-Rect {
  width: 200px;
  height: 80px;

  position: relative;
  cursor: pointer;
  user-select: none;
  /* overflow: hidden; */
  
  background-color: transparent;
  box-sizing: border-box; /* 设置box-sizing为border-box */
}

.dial-labels {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 0 4px;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  font-size: 10px;
  color: #ffffff;
  pointer-events: none; /* 避免挡住拖动事件 */
}

.dial-label-min,
.dial-label-max {
  text-shadow: 0 0 2px rgba(0, 0, 0, 0.8);
}

.indicator {
  width: 10px;
  height: 80px;
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
  height: 80px;
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
  height: 80px;
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
  height: 80px;
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

