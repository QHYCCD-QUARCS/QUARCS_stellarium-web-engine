<template>
  <div>
    <div ref="linechart" :style="{ width: containerMaxWidth + 'px', height: 80 + 'px' }" class="linechart-panel"></div>
    <!-- <button @click="clearChartData" class="clear-btn">Clear</button> -->
  </div>
</template>

<script>
import * as echarts from 'echarts';

export default {
  name: 'LineChart',
  data() {
    return {
      containerMaxWidth: 190,

      chartData1: [],  
      chartData2: [],
      xAxis_min: 0,
      xAxis_max: 50, 
      yAxis_min: -4,
      yAxis_max: 4,  
      range: 4,
    };
  },
  mounted() {
    this.initChart();
  },
  created() {
    this.$bus.$on('AddLineChartData', this.addData);
    this.$bus.$on('SetLineChartRange', this.changeRange);
    this.$bus.$on('clearChartData', this.clearChartData);
    this.$bus.$on('ChartRangeSwitch', this.RangeSwitch);
  },
  methods: {
    initChart() {
      const Width = window.innerWidth;
      this.containerMaxWidth = Width - 435;
      const chartDom = this.$refs.linechart;
      chartDom.style.width = this.containerMaxWidth + 'px';
      this.myChart = echarts.init(chartDom);
      this.renderChart(this.xAxis_min, this.xAxis_max, this.yAxis_min, this.yAxis_max);
    },
    renderChart(x_min,x_max,y_min,y_max) {
      const option = {
        grid: {  
          left: '0%',
          right: '2%',
          bottom: '0%',
          top: '10%',
          containLabel: true
        },
        xAxis: {
          min: x_min,
          max: x_max,
          axisLine: {
            lineStyle: {
              color: 'rgba(200, 200, 200, 0.5)'  // x轴线颜色
            }
          },
          axisLabel: {
            color: 'white', 
            fontSize: 5
          },
          splitLine: {
            show: true, // 显示分隔线
            lineStyle: {
              color: 'rgba(128, 128, 128, 0.5)', // 设置分隔线颜色
              width: 1, // 设置分隔线宽度
              type: 'solid' // 设置分隔线样式
            }
          }
        },
        yAxis: {
          min: y_min,
          max: y_max,
          axisLine: {
            lineStyle: {
              color: 'rgba(200, 200, 200, 0.5)'  // x轴线颜色
            }
          },
          axisLabel: {
            color: 'white', 
            fontSize: 5
          },
          splitLine: {
            show: true, // 显示分隔线
            lineStyle: {
              color: 'rgba(128, 128, 128, 0.5)', // 设置分隔线颜色
              width: 1, // 设置分隔线宽度
              type: 'solid' // 设置分隔线样式
            }
          }
        },
        legend: {
          data: ['Ra', 'Dec'],  // 图例中的标注名称
          top: -5,       // 设置图例距离顶部的距离
          right: 5,      // 设置图例距离右侧的距离
          itemWidth: 7,   // 设置图例项的宽度为5
          itemHeight: 2,   // 设置图例项的高度为3
          textStyle: {
            color: 'white', // 设置字体颜色
            fontSize: 8 // 设置字体大小
          }
        },
        series: [
          {
            name: 'Ra',
            type: 'line',
            data: this.chartData1,
            itemStyle: {
              color: 'red'
            },
            lineStyle: {  // 设置红色曲线的宽度为2
              width: 1
            },
            symbolSize: 0
          },
          {
            name: 'Dec',
            type: 'line',
            data: this.chartData2,
            itemStyle: {
              color: 'green'
            },
            lineStyle: {  // 设置红色曲线的宽度为2
              width: 1
            },
            symbolSize: 0
          }
        ]
      };
      this.myChart.setOption(option);
    },
    addData(newDataPoint1,newDataPoint2) {
      // const newDataPoint1 = [Math.floor(Math.random() * 50), Math.random() * 8 - 4];
      // const newDataPoint2 = [Math.floor(Math.random() * 50), Math.random() * 8 - 4];
      this.chartData1.push(newDataPoint1);
      this.chartData2.push(newDataPoint2);
      this.renderChart(this.xAxis_min, this.xAxis_max, this.yAxis_min, this.yAxis_max);
    },
    changeRange(min, max) {
      this.xAxis_min = min;
      this.xAxis_max = max;
    },
    clearChartData() {
      this.chartData1 = [];
      this.chartData2 = [];
      this.renderChart(0, 50, this.yAxis_min, this.yAxis_max);
    },
    RangeSwitch() {
      if(this.range === 4) {
        this.range = 2;
        this.yAxis_min = -2;
        this.yAxis_max = 2;
      }else if(this.range === 2) {
        this.range = 1;
        this.yAxis_min = -1;
        this.yAxis_max = 1;
      }else if(this.range === 1) {
        this.range = 4;
        this.yAxis_min = -4;
        this.yAxis_max = 4;
      }

      this.renderChart(this.xAxis_min, this.xAxis_max, this.yAxis_min, this.yAxis_max);
    }
  }
}
</script>

<style scoped>
.linechart-panel {
  background-color: rgba(0, 0, 0, 0.0);
  /* backdrop-filter: blur(5px); */
  border-radius: 5px;
  box-sizing: border-box;
}

.clear-btn {
  position: absolute;
  top: 0;
  left: 7%;
  width: 30%;
  height: 10%;
  
  background-color: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(5px);
  border-radius: 5px;
  box-sizing: border-box;
}


</style>

