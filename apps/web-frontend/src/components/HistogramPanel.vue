<template>
  <div class="chart-panel" :style="{ width: width + 'px', height: height + 'px' }">
     <HistogramChart ref="histogramchart" class="histogram-chart"/>
     <DialKnob class="dial-knob"/>
     <button  @touchend="AutoHistogram" class="get-click btn-Auto">Auto</button>
     <button  @touchend="ResetHistogram" class="get-click btn-Reset">Reset</button>
  </div>
</template>

<script>
import HistogramChart from './Chart-Histogram.vue'
import DialKnob from './Dial-Knob.vue'

export default {
  name: 'HistogramPanel',
  data() {
    return {
      width: 250, // 初始宽度
      height: 100,

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
  methods: {
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

.histogram-chart {
  position:absolute;
  top: 5px;
  left: 5px;
}

.dial-knob {
  position:absolute;
  top: 5px;
  left: 5px;
  width: 190px;
  height: 90px;
}

.btn-Auto {
  position:absolute;
  top: 5px;
  right: 5px;

  width: 45px;
  height: 42.5px;

  user-select: none;
  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
  border-radius: 5px; 
  box-sizing: border-box;
}

.btn-Reset {
  position:absolute;
  top: 52.5px;
  right: 5px;

  width: 45px;
  height: 42.5px;

  user-select: none;
  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
  border-radius: 5px; 
  box-sizing: border-box;
}
.btn-Auto:active,
.btn-Reset:active {
  transform: scale(0.95); /* 点击时缩小按钮 */
  background-color: rgba(255, 255, 255, 0.7);
}

</style>

