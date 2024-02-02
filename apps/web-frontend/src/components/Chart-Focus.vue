<template>
  <div>
    <div ref="linechart" style="width: 225px; height: 90px;" class="linechart-panel"></div>
  </div>
</template>

<script>
import * as echarts from 'echarts';

export default {
  name: 'LineChart',
  data() {
    return {
      chartData1: [],  
      chartData2: [],
      xAxis_min: 0,
      xAxis_max: 6000, 
      yAxis_min: 0,
      yAxis_max: 30,  
      range: 4,
      currentX: 0,
      FWHMMax: 0,
    };
  },
  mounted() {
    this.initChart();
  },
  created() {
    this.$bus.$on('FocusPosition', this.changeRange_x);
    this.$bus.$on('UpdateFWHM',this.UpdateFWHM);
    this.$bus.$on('fitQuadraticCurve', this.fitQuadraticCurve);
    this.$bus.$on('ClearfitQuadraticCurve', this.clearChartData2);
  },
  methods: {
    initChart() {
      const chartDom = this.$refs.linechart;
      this.myChart = echarts.init(chartDom);

      this.renderChart(this.xAxis_min, this.xAxis_max, this.yAxis_min, this.yAxis_max);
    },
    renderChart(x_min,x_max,y_min,y_max) {
      const option = {
        grid: {  
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
            color: 'white', 
            fontSize: 8
          }
        },
        yAxis: {
          min: y_min,
          max: y_max,
          axisLine: {
            lineStyle: {
              color: 'white'  // x轴线颜色
            }
          },
          axisLabel: {
            color: 'white', 
            fontSize: 8
          }
        },
        series: [
          {
            name: 'FWHM',
            type: 'scatter',
            data: this.chartData1,
            itemStyle: {
              color: 'red'
            },
            symbolSize: 4
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
    addData_Point(newDataPoint) {
      this.chartData1.push(newDataPoint);
      this.renderChart(this.xAxis_min, this.xAxis_max, this.yAxis_min, this.yAxis_max);
    },
    addData_Line(newDataPoint) {
      this.chartData2.push(newDataPoint);
      this.renderChart(this.xAxis_min, this.xAxis_max, this.yAxis_min, this.yAxis_max);
    },
    changeRange_x(current, target) {
      this.xAxis_min = Number(current)-3000;
      this.xAxis_max = Number(current)+3000;
      this.currentX = current;
      console.log("QHYCCD | changeRange_x:", current, this.xAxis_min, this.xAxis_max);
      this.renderChart(this.xAxis_min, this.xAxis_max, this.yAxis_min, this.yAxis_max);
    },
    clearChartData1() {
      this.chartData1 = [];
      this.renderChart(this.xAxis_min, this.xAxis_max, this.yAxis_min, this.yAxis_max);
    },
    clearChartData2() {
      this.chartData2 = [];
      this.renderChart(this.xAxis_min, this.xAxis_max, this.yAxis_min, this.yAxis_max);
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
    },
    UpdateFWHM(FWHM) {
      const newDataPoint = [this.currentX, FWHM];
      this.addData_Point(newDataPoint);

      console.log("QHYCCD | UpdateFWHM:", newDataPoint);

      if(this.FWHMMax < FWHM)
      {
        this.FWHMMax = FWHM;
        this.yAxis_min = 0;
        this.yAxis_max = this.FWHMMax * 2;

        this.renderChart(this.xAxis_min, this.xAxis_max, this.yAxis_min, this.yAxis_max);
      }
    },

    fitQuadraticCurve(x, y) {
      console.log(x, y);
      const newDataPoint = [x, y];
      this.addData_Line(newDataPoint);
    },
  }
}
</script>

<style scoped>
.linechart-panel {
  background-color: rgba(0, 0, 0, 0.3);
  /* border: 1px solid rgba(255, 255, 255, 0.8); */
  backdrop-filter: blur(5px);
  border-radius: 5px;
  box-sizing: border-box;
}
</style>

