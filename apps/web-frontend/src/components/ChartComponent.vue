<template>
  <div class="chart-panel" :style="{ width: width + 'px', height: height + 'px' }">
    <LineChart v-show="showLineChart" ref="linechart" class="line-chart"/>
    
    <ScatterChart ref="scatterchart" class="scatter-chart"/>

    <button class="btn-More" @touchend="toggleMore">
      <span v-if="isExpanded">
        <v-icon>mdi-chevron-right</v-icon>
      </span>
      <span v-else>
        <v-icon>mdi-chevron-left</v-icon>
      </span>
    </button>

    <button v-show="showLineChart" class="btn-Clear" @touchend="DataClear">Clear</button>
    <button v-show="showLineChart" class="btn-RangeSwitch" @touchend="RangeSwitch">Range Switch</button>

    <!-- <button @click="addLineData(); addScatterData();" class="btn-addData">Add Data</button> -->
  </div>
</template>

<script>
import LineChart from './Chart-Line.vue';
import ScatterChart from './Chart-Scatter.vue';

export default {
  name: 'ChartsPanel',
  data() {
    return {
      width: 130, // 初始宽度
      height: 100,
      
      isExpanded: false, // 新增状态来追踪面板是否展开
      showLineChart: false,
    };
  },
  components: {
    LineChart,
    ScatterChart,
  },
  methods: {
    // addLineData() {
    //   const newDataPoint1 = [Math.floor(Math.random() * 50), Math.random() * 8 - 4];
    //   const newDataPoint2 = [Math.floor(Math.random() * 50), Math.random() * 8 - 4];
      
    //   this.$refs.linechart.addData(newDataPoint1,newDataPoint2);
    // },
    // addScatterData() {
    //   const newDataPoint = [Math.floor(Math.random() * 8 - 4), Math.random() * 8 - 4];
      
    //   this.$refs.scatterchart.addData(newDataPoint);
    // },
    toggleMore() {
      this.isExpanded = !this.isExpanded;
      if (this.isExpanded) {
        setTimeout(() => {
          this.showLineChart = true;
        }, 100);
        this.width = 355;
      } else {
        setTimeout(() => {
          this.showLineChart = false;
        }, 30);
        this.width = 130;
      }
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
  background-color: rgba(128, 128, 128, 0.5);
  /* border: 1px solid rgba(255, 255, 255, 0.8); */
  backdrop-filter: blur(5px);
  border-radius: 10px; 
  transition: width 0.2s ease;
}

.line-chart {
  position:absolute;
  top: 5px;
  left: 65px;
}

.scatter-chart {
  position:absolute;
  top: 5px;
  right: 5px;
}

.btn-Clear {
  position:absolute;
  top: 5px;
  left: 35px;
  
  width: 25px;
  height: 43px;
  
  user-select: none;
  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
  border-radius: 5px; 
  box-sizing: border-box;
}

.btn-RangeSwitch {
  position:absolute;
  bottom: 5px;
  left: 35px;
  
  width: 25px;
  height: 43px;
  
  user-select: none;
  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
  border-radius: 5px; 
  box-sizing: border-box;
}

.btn-More {
  position:absolute;
  top: 5px;
  left: 5px;
  
  width: 25px;
  height: 90px;
  
  user-select: none;
  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
  border-radius: 5px; 
  box-sizing: border-box;
}

.btn-Clear:active,
.btn-RangeSwitch:active ,
.btn-More:active {
  transform: scale(0.95); /* 点击时缩小按钮 */
  background-color: rgba(255, 255, 255, 0.7);
}

/* .btn-addData {
  position:absolute;
  top: 5px;
  left: 5px;
  
  width: 25px;
  height: 40px;
  
  background-color: rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(5px);
  border-radius: 5px;
} */

</style>

