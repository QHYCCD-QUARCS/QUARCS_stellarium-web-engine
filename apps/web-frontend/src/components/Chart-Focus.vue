<template>
  <div>
    <div
      ref="linechart"
      :style="{ width: containerMaxWidth + 'px', height: 80 + 'px' }"
      class="linechart-panel"
      @mousedown="startDrag"
      @mousemove="dragging"
      @mouseup="endDrag"
      @touchstart="startDrag"
      @touchmove="dragging"
      @touchend="endDrag"
    ></div>
  </div>
</template>

<script>
import * as echarts from 'echarts';

export default {
  name: 'LineChart',
  data() {
    return {
      containerMaxWidth: 150,
      chartData1: [],
      chartData2: [],
      chartData3: [],
      xAxis_min: 0,
      xAxis_max: 6000,
      yAxis_min: 0,
      yAxis_max: 30,
      range: 4,
      currentX: 0,
      FWHMMax: 0,
      isDragging: false,
      startX: 0,
      deltaX: 0,
      x_min: -60000,
      x_max: 60000
    };
  },
  mounted() {

  },
  created() {
    this.$bus.$on('FocusPosition', this.changeRange_x);
    // this.$bus.$on('UpdateFWHM', this.UpdateFWHM);
    // this.$bus.$on('fitQuadraticCurve', this.fitQuadraticCurve);
    // this.$bus.$on('fitQuadraticCurve_minPoint', this.fitQuadraticCurve_minPoint);

    this.$bus.$on('ClearfitQuadraticCurve', this.clearChartData2);
    this.$bus.$on('ClearAllData', this.ClearAllData);
    this.$bus.$on('updateFocusChartWidth', this.initChart);
    this.$bus.$on('addData_Point', this.addData_Point);
    this.$bus.$on('addMinPointData_Point', this.addMinPointData_Point);
    this.$bus.$on('addLineData_Point', this.addLineData_Point);
    this.$bus.$on('setFocusChartRange', this.setFocusChartRange);
  },
  methods: {
    initChart(Width) {
      this.containerMaxWidth = Width - 95;
      const chartDom = this.$refs.linechart;
      chartDom.style.width = this.containerMaxWidth + 'px';
      this.myChart = echarts.init(chartDom);
      this.renderChart(this.xAxis_min, this.xAxis_max);
    },
    startDrag(event) {
      this.isDragging = true;
      this.startX = event.touches[0].clientX;
    },
    dragging(event) {
      if (this.isDragging) {
        const touch = event.touches[0];
        this.deltaX = (touch.clientX - this.startX) * 10;
        this.startX = touch.clientX;
        this.xAxis_min -= this.deltaX;
        this.xAxis_max -= this.deltaX;
        this.renderChart(this.xAxis_min, this.xAxis_max);
      }
    },
    endDrag() {
      this.isDragging = false;
      this.deltaX = 0;
      // this.$bus.$emit('setTargetPosition', (this.xAxis_min + this.xAxis_max) / 2);
    },
    renderChart(lowerBound, upperBound) {
      const y_max = this.chartData1.length > 0 ? Math.max(...this.chartData1.map(item => item[1])) * 2 : this.yAxis_max;
      const option = {
        grid: {
          left: '0%',
          right: '2%',
          bottom: '0%',
          top: '10%',
          containLabel: true
        },
        xAxis: {
          min: lowerBound,
          max: upperBound,
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
            show: true,
            lineStyle: {
              color: 'rgba(128, 128, 128, 0.5)', 
              width: 1,
              type: 'solid'
            }
          }
        },
        yAxis: {
          min: this.yAxis_min,
          max: y_max,
          axisLine: {
            lineStyle: {
              color: 'rgba(200, 200, 200, 0.5)'  // y轴线颜色
            }
          },
          axisLabel: {
            color: 'white',
            fontSize: 5
          },
          splitNumber: 3,
          splitLine: {
            show: true,
            lineStyle: {
              color: 'rgba(128, 128, 128, 0.5)',
              width: 1,
              type: 'solid'
            }
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
            lineStyle: {
              width: 1
            },
            symbolSize: 0
          },
          {
            name: 'minPoint',
            type: 'scatter',
            data: this.chartData3,
            itemStyle: {
              color: 'rgba(75, 155, 250, 0.7)'
            },
            symbolSize: 4
          },
          {
            name: 'xMinLine',
            type: 'line',
            data: [
              [this.x_min, this.yAxis_min],
              [this.x_min, y_max]
            ],
            lineStyle: {
              color: 'red',
              width: 1
            },
            symbol: 'none'
          },
          {
            name: 'xMaxLine',
            type: 'line',
            data: [
              [this.x_max, this.yAxis_min],
              [this.x_max, y_max]
            ],
            lineStyle: {
              color: 'red',
              width: 1
            },
            symbol: 'none'
          },
          {
            name: 'currentPosition',
            type: 'line',
            data: [
              [this.currentX, this.yAxis_min],
              [this.currentX, y_max]
            ],
            lineStyle: {
              color: 'green',
              width: 1
            },
            symbol: 'none'
          }
        ]
      };
      this.myChart.setOption(option);
    },
    addData_Point(x,y) {
      const newDataPoint = [x, y];
      const existingPointIndex = this.chartData1.findIndex(point => point[0] === newDataPoint[0]);
      if (existingPointIndex !== -1) {
        // If the x value already exists, update the y value
        if (newDataPoint[1] == 0 || newDataPoint[1] == this.chartData1[existingPointIndex][1]) return;
        this.chartData1[existingPointIndex] = newDataPoint;
      } else {
        // If the x value does not exist, add the new data point
        this.chartData1.push(newDataPoint);
      }
      this.renderChart(this.xAxis_min, this.xAxis_max);
    },
    // 绘制折线
    addLineData_Point(dataList) {
      this.chartData2 = dataList;
      this.renderChart(this.xAxis_min, this.xAxis_max);
    },
    addMinPointData_Point(x,y) {
      const newDataPoint = [x, y];
      this.chartData3.push(newDataPoint);
      this.renderChart(this.xAxis_min, this.xAxis_max);
    },
    // 更改显示的x轴范围
    changeRange_x(current, target) {
      this.xAxis_min = Number(current) - 3000;
      this.xAxis_max = Number(current) + 3000;
      this.currentX = current;
      console.log("QHYCCD | changeRange_x:", current, this.xAxis_min, this.xAxis_max);
      this.renderChart(this.xAxis_min, this.xAxis_max);
    },

    // 清除数据
    clearChartData1() {
      this.chartData1 = [];
      this.renderChart(this.xAxis_min, this.xAxis_max);
    },
    clearChartData2() {
      this.chartData2 = [];
      this.renderChart(this.xAxis_min, this.xAxis_max);
    },
    ClearAllData() {
      this.chartData1 = [];
      this.chartData2 = [];
      this.chartData3 = [];
      this.yAxis_max = 30;
      this.FWHMMax = 15;
      this.renderChart(this.xAxis_min, this.xAxis_max);
    },
    // 切换显示范围
    RangeSwitch() {
      if (this.range === 4) {
        this.range = 2;
        this.yAxis_min = -2;
        this.yAxis_max = 2;
      } else if (this.range === 2) {
        this.range = 1;
        this.yAxis_min = -1;
        this.yAxis_max = 1;
      } else if (this.range === 1) {
        this.range = 4;
        this.yAxis_min = -4;
        this.yAxis_max = 4;
      }
      this.renderChart(this.xAxis_min, this.xAxis_max);
    },
    // 更新FWHM
    // UpdateFWHM(FWHM) {
    //   const newDataPoint = [this.currentX, FWHM];
    //   this.addData_Point(newDataPoint);
    //   // console.log("QHYCCD | UpdateFWHM:", newDataPoint);
    //   // this.$bus.$emit('SendConsoleLogMsg', 'UpdateFWHM:' + newDataPoint, 'info');
    //   this.renderChart(this.xAxis_min, this.xAxis_max);
    // },
    // 拟合二次曲线
    // fitQuadraticCurve(x, y) {
    //   const newDataPoint = [x, y];
    //   this.addData_Line(newDataPoint);
    // },
    // 拟合二次曲线最小点
    // fitQuadraticCurve_minPoint(x, y) {
    //   console.log("QHYCCD | minPoint:", x, ',', y);
    //   this.$bus.$emit('SendConsoleLogMsg', 'minPoint:' + x + ',' + y, 'info');
    //   this.chartData3 = [];
    //   const newDataPoint = [x, y];
    //   this.chartData3.push(newDataPoint);
    // },
    setFocusChartRange(lowerBound, upperBound) {
      this.x_min = lowerBound;
      this.x_max = upperBound;
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
</style>
