<template>
  <div class="chart-panel" :style="{ bottom: bottom + 'px', left: left + 'px', right: right + 'px', height: height + 'px' }">
    <LineChart ref="linechart" class="line-chart"/>
    
    <ScatterChart ref="scatterchart" class="scatter-chart"/>

    <div class="buttons-container">

      <button :class="{ 'btn-Guider-true': isGuiding, 'btn-Guider-false': !isGuiding }" :style="{ animationDuration: ExpTime + 'ms' }" @touchend="GuiderSwitch">
        <div style="display: flex; justify-content: center; align-items: center;">
          <img src="@/assets/images/svg/ui/Guider.svg" height="20px" style="min-height: 20px"></img>
        </div>
      </button>

      <button class="btn-Style" @touchend="ExpTimeSwitch">
        <span v-if="ExpTime === 1000">
          <div style="display: flex; justify-content: center; align-items: center;">
            <img src="@/assets/images/svg/ui/Exp-1000.svg" height="25px" style="min-height: 25px"></img>
          </div>
        </span>
        <span v-if="ExpTime === 2000">
          <div style="display: flex; justify-content: center; align-items: center;">
            <img src="@/assets/images/svg/ui/Exp-2000.svg" height="25px" style="min-height: 25px"></img>
          </div>
        </span>
        <span v-if="ExpTime === 500">
          <div style="display: flex; justify-content: center; align-items: center;">
            <img src="@/assets/images/svg/ui/Exp-500.svg" height="25px" style="min-height: 25px"></img>
          </div>
        </span>
      </button>

      <button class="btn-Style" @touchend="DataClear">
        <div style="display: flex; justify-content: center; align-items: center;">
          <img src="@/assets/images/svg/ui/delete.svg" height="20px" style="min-height: 20px"></img>
        </div>
      </button>

      <button class="btn-Style" @touchend="RangeSwitch">
        <div style="display: flex; justify-content: center; align-items: center;">
          <img src="@/assets/images/svg/ui/suofang.svg" height="20px" style="min-height: 20px"></img>
        </div>
      </button>

    </div>
    
  </div>
</template>

<script>
import LineChart from './Chart-Line.vue';
import ScatterChart from './Chart-Scatter.vue';

export default {
  name: 'ChartsPanel',
  data() {
    return {
      bottom: 10,
      left: 170,
      right: 170,
      height: 90,
      ExpTime: 1000,
      isGuiding: false,
    };
  },
  components: {
    LineChart,
    ScatterChart,
  },
  created() {
    this.$bus.$on('GuiderStatus', this.GuiderStatus);
  },
  mounted() {
    this.$bus.$emit('AppSendMessage', 'Vue_Command', 'getGuiderStatus');
  },
  methods: {
    GuiderSwitch() {
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'GuiderSwitch');
    },

    ExpTimeSwitch() {
      if (this.ExpTime === 1000) {
        this.ExpTime = 2000;
      } else if (this.ExpTime === 2000) {
        this.ExpTime = 500;
      } else if (this.ExpTime === 500) {
        this.ExpTime = 1000;
      }
      this.$bus.$emit('AppSendMessage', 'Vue_Command', 'GuiderExpTimeSwitch:' + this.ExpTime);
    },

    GuiderStatus(value) {
      if(value === 'true') {
        this.isGuiding = true;
      } else {
        this.isGuiding = false;
      }
      console.log('GuiderStatus:', this.isGuiding);
    },
    
    DataClear() {
      this.$bus.$emit('clearChartData');
    },
    RangeSwitch() {
      this.$bus.$emit('ChartRangeSwitch');
    },
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

.line-chart {
  position:absolute;
  bottom: 1px;
  left: 5px;
}

.scatter-chart {
  position:absolute;
  top: 1px;
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

.btn-Style {
  width: 30px;
  height: 30px; 

  user-select: none;
  background-color: rgba(64, 64, 64, 0.5);
  backdrop-filter: blur(5px);
  border: none;
  border-radius: 50%; 
  box-sizing: border-box;
}

.btn-Guider-false {
  width: 30px;
  height: 30px; 

  user-select: none;
  background-color: rgba(64, 64, 64, 0.5);
  backdrop-filter: blur(5px);
  border: none;
  border-radius: 50%; 
  box-sizing: border-box;
}

.btn-Guider-true {
  width: 30px;
  height: 30px; 

  user-select: none;
  background-color: rgba(64, 64, 64, 0.5);
  backdrop-filter: blur(5px);
  border: none;
  border-radius: 50%; 
  box-sizing: border-box;

  animation: Animation_true infinite;
}

@keyframes Animation_true {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(90deg);
  }
}


.btn-Guider:active,
.btn-Style:active {
  transform: scale(0.95); /* 点击时缩小按钮 */
  background-color: rgba(255, 255, 255, 0.7);
}

</style>

