<template>
  <div class="chart-panel" :style="{ bottom: bottom + 'px', left: left + 'px', right: right + 'px', height: height + 'px' }">
    <LineChart ref="linechart" class="line-chart"/>
    
    <ScatterChart ref="scatterchart" class="scatter-chart"/>

    <!-- <button class="btn-More" @touchend="toggleMore">
      <span v-if="isExpanded">
        <v-icon>mdi-chevron-right</v-icon>
      </span>
      <span v-else>
        <v-icon>mdi-chevron-left</v-icon>
      </span>
    </button> -->

    <div class="buttons-container">
      <button class="btn-Clear" @touchend="DataClear"><v-icon>mdi-delete</v-icon></button>
      <button class="btn-RangeSwitch" @touchend="RangeSwitch"><v-icon>mdi-stretch-to-page-outline</v-icon></button>
    </div>
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
      bottom: 10,
      left: 170,
      right: 170,
      height: 90,
      
      // isExpanded: false, // 新增状态来追踪面板是否展开
      // showLineChart: false,
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
    // toggleMore() {
    //   this.isExpanded = !this.isExpanded;
    //   if (this.isExpanded) {
    //     setTimeout(() => {
    //       this.showLineChart = true;
    //     }, 100);
    //     this.width = 355;
    //   } else {
    //     setTimeout(() => {
    //       this.showLineChart = false;
    //     }, 30);
    //     this.width = 130;
    //   }
    // },
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
  left: 30%;
  right: 30%;
}

.btn-Clear {
  width: 30px;
  height: 30px; 

  user-select: none;
  background-color: rgba(64, 64, 64, 0.5);
  backdrop-filter: blur(5px);
  border: none;
  border-radius: 50%; 
  box-sizing: border-box;
}

.btn-RangeSwitch {
  width: 30px;
  height: 30px; 

  user-select: none;
  background-color: rgba(64, 64, 64, 0.5);
  backdrop-filter: blur(5px);
  border: none;
  border-radius: 50%; 
  box-sizing: border-box;
}

/* .btn-More {
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
} */

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

