<template>
  <transition name="panel">
    <div class="chart-panel" :style="{ bottom: bottom + 'px', left: ComponentPadding + 'px', right: ComponentPadding + 'px', height: height + 'px' }">
    <HistogramChart ref="histogramchart" class="histogram-chart"/>
    <DialKnob class="dial-knob"/>
    <div class="buttons-container">
      <button  @touchend="calcWhiteBalanceGains" class="get-click btn-Reset">
        <div style="display: flex; justify-content: center; align-items: center;">
          <img src="@/assets/images/svg/ui/WhiteBalance.svg" height="20px" style="min-height: 20px; pointer-events: none;"></img>
        </div>
      </button>

      <button  @touchend="AutoHistogram" class="get-click btn-Auto"><v-icon>mdi-alpha-a-circle-outline</v-icon></button>

      <button  @touchend="ResetHistogram" class="get-click btn-Reset">
        <div style="display: flex; justify-content: center; align-items: center;">
          <img src="@/assets/images/svg/ui/reset.svg" height="25px" style="min-height: 25px; pointer-events: none;"></img>
        </div>
      </button>

    </div>

  </div>
</transition>
</template>

<script>
import HistogramChart from './Chart-Histogram.vue'
import DialKnob from './Dial-Knob.vue'

export default {
  name: 'HistogramPanel',
  data() {
    return {
      bottom: 10,
      ComponentPadding: 0,
      height: 90,

      histogram_min: 0,
      histogram_max: 255,
    };
  },
  components: {
    HistogramChart,
    DialKnob,
  },
  created() {
    this.$bus.$on('AutoHistogramNum', this.setAutoHistogramNum);
  },
  mounted() {
    this.updatePosition(); // 初始化位置
    window.addEventListener('resize', this.updatePosition);
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.updatePosition);
  },
  methods: {
    updatePosition() {
      const screenWidth = window.innerWidth;
      const halfWidth = screenWidth / 2 - 250;
      this.ComponentPadding = Math.max(halfWidth, 170);

      // 计算宽度
      const newWidth = screenWidth - (this.ComponentPadding * 2);
      // console.log('Update new width:', newWidth);
      this.$bus.$emit('updateHistogramWidth', newWidth);
    },
    AutoHistogram() {
      this.$bus.$emit('HandleHistogramNum', this.histogram_min, this.histogram_max);
    },
    ResetHistogram() {
      this.$bus.$emit('HandleHistogramNum', 0 , 255);
    },
    setAutoHistogramNum(min, max) {
      this.histogram_min = min;
      this.histogram_max = max;
    },
    calcWhiteBalanceGains() {
      this.$bus.$emit('calcWhiteBalanceGains');
    },
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

.histogram-chart {
  position:absolute;
  top: 5px;
  left: 5px;
}

.dial-knob {
  position:absolute;
  top: 5px;
  left: 5px;
}

.buttons-container {
  display: flex;
  justify-content: space-between;
  position: absolute;
  top: -35px;
  left: 25%;
  right: 25%;
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

.btn-Reset {
  width: 30px;
  height: 30px;

  user-select: none;
  background-color: rgba(64, 64, 64, 0.5);
  backdrop-filter: blur(5px);
  border: none;
  border-radius: 50%; 
  box-sizing: border-box;
}

.btn-WhiteBalance {
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
.btn-Reset:active,
.btn-WhiteBalance:active {
  transform: scale(0.95); /* 点击时缩小按钮 */
  background-color: rgba(255, 255, 255, 0.7);
}

</style>

