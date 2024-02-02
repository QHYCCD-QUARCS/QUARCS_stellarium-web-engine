<template>
  <div>
    <div ref="scatterchart" style="width: 90px; height: 90px;" class="scatterchart-panel"></div>
    <!-- <button @click="clearChartData" class="clear-btn">Clear</button> -->
  </div>
</template>

<script>
import * as echarts from 'echarts';

export default {
  name: 'ScatterChart',
  data() {
    return {
      chartData: [],
      chartData_new: [],
      xAxis_min: -4,
      xAxis_max: 4, 
      yAxis_min: -4,
      yAxis_max: 4, 
      range: 4,
    };
  },
  mounted() {
    this.initChart();
  },
  created() {
    this.$bus.$on('AddScatterChartData', this.addData);
    this.$bus.$on('clearChartData', this.clearChartData);
    this.$bus.$on('ChartRangeSwitch', this.RangeSwitch);
  },
  methods: {
    initChart() {
      const chartDom = this.$refs.scatterchart;
      this.myChart = echarts.init(chartDom);

      this.renderChart(this.xAxis_min, this.xAxis_max, this.yAxis_min, this.yAxis_max);
    },
    renderChart(x_min,x_max,y_min,y_max) {
      const option = {
        grid: {  // 设置 grid 以使其占满容器
          left: '0%',
          right: '10%',
          bottom: '0%',
          top: '10%',
          containLabel: true
        },
        xAxis: {
          min: x_min,
          max: x_max,
          axisLine: {
            lineStyle: {
              color: 'white'  // x轴线颜色
            }
          },
          axisLabel: {
            color: 'white'  // x轴刻度标签颜色
          }
        },
        yAxis: {
          min: y_min,
          max: y_max,
          axisLine: {
            lineStyle: {
              color: 'white'  // y轴线颜色
            }
          },
          axisLabel: {
            color: 'white'  // y轴刻度标签颜色
          }
        },
        series: [{
          type: 'scatter',
          data: this.chartData,
          itemStyle: {
            color: 'green'
          },
          symbolSize: 3
        },
        {
          type: 'scatter',
          data: this.chartData_new,
          itemStyle: {
              color: 'red'
          },
          symbolSize: 4
        }
        ]
      };
      this.myChart.setOption(option);
    },
    addData(newDataPoint) {
      // 将新数据点添加到数据数组中
      this.chartData.push(newDataPoint);
      this.chartData_new = [];
      this.chartData_new.push(newDataPoint);

      // 更新图表
      this.renderChart(this.xAxis_min, this.xAxis_max, this.yAxis_min, this.yAxis_max);
    },
    clearChartData() {
      this.chartData = [];
      this.chartData_new = [];
      this.renderChart(this.xAxis_min, this.xAxis_max, this.yAxis_min, this.yAxis_max);
    },
    RangeSwitch() {
      if(this.range === 4) {
        this.range = 2;
        this.xAxis_min = -2;
        this.xAxis_max = 2;
        this.yAxis_min = -2;
        this.yAxis_max = 2;
      }else if(this.range === 2) {
        this.range = 1;
        this.xAxis_min = -1;
        this.xAxis_max = 1;
        this.yAxis_min = -1;
        this.yAxis_max = 1;
      }else if(this.range === 1) {
        this.range = 4;
        this.xAxis_min = -4;
        this.xAxis_max = 4;
        this.yAxis_min = -4;
        this.yAxis_max = 4;
      }

      this.renderChart(this.xAxis_min, this.xAxis_max, this.yAxis_min, this.yAxis_max);
    }
  }
}
</script>

<style scoped>
.scatterchart-panel {
  background-color: rgba(0, 0, 0, 0.3);
  /* border: 1px solid rgba(255, 255, 255, 0.8); */
  backdrop-filter: blur(5px);
  border-radius: 5px;
  box-sizing: border-box;
}

.clear-btn {
  position: absolute;
  top: 0;
  left: 10%;
  width: 30%;
  height: 10%;
  
  background-color: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(5px);
  border-radius: 5px;
  box-sizing: border-box;
}
</style>

