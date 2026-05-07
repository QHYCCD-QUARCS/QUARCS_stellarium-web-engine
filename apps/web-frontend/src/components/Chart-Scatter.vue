<template>
  <div data-testid="ui-chart-scatter-root">
    <div ref="scatterchart" style="width: 80px; height: 80px;" class="scatterchart-panel"></div>
    <!-- <button @click="clearChartData" class="clear-btn" data-testid="ui-chart-scatter-btn-clear-chart-data">Clear</button> -->
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
      rangeMode: 'auto',
      rangeModes: ['auto', 4, 2, 1],
      axisMarginRatio: 0.15,
      axisShrinkFactor: 0.92,
    };
  },
  mounted() {
    this.initChart();
  },
  created() {
    this.$bus.$on('AddScatterChartData', this.addData);
    this.$bus.$on('clearChartData', this.clearChartData);
    this.$bus.$on('ChartRangeSwitch', this.RangeSwitch);
    this.$bus.$on('GuiderErrorUnitChanged', this.onGuiderErrorUnitChanged);
  },
  methods: {
    getBaseRange() {
      const fixedRange = this.getFixedRange();
      return Number.isFinite(fixedRange) && fixedRange > 0 ? fixedRange : 4;
    },
    getFixedRange() {
      return Number.isFinite(this.rangeMode) && this.rangeMode > 0 ? this.rangeMode : null;
    },
    getScatterMaxAbs() {
      let maxAbs = 0;
      const updateMaxAbs = (point) => {
        if (!Array.isArray(point) || point.length < 2) return;
        const x = Number(point[0]);
        const y = Number(point[1]);
        if (Number.isFinite(x)) maxAbs = Math.max(maxAbs, Math.abs(x));
        if (Number.isFinite(y)) maxAbs = Math.max(maxAbs, Math.abs(y));
      };
      this.chartData.forEach(updateMaxAbs);
      this.chartData_new.forEach(updateMaxAbs);
      return maxAbs;
    },
    updateAxisRange() {
      const fixedRange = this.getFixedRange();
      if (Number.isFinite(fixedRange) && fixedRange > 0) {
        this.xAxis_min = -fixedRange;
        this.xAxis_max = fixedRange;
        this.yAxis_min = -fixedRange;
        this.yAxis_max = fixedRange;
        return;
      }

      const baseRange = this.getBaseRange();
      const dataMaxAbs = this.getScatterMaxAbs();
      const paddedDataRange = dataMaxAbs > 0
        ? Math.max(baseRange, Number((dataMaxAbs * (1 + this.axisMarginRatio)).toFixed(3)))
        : baseRange;
      const currentRange = Math.max(
        baseRange,
        Math.abs(Number(this.xAxis_min) || 0),
        Math.abs(Number(this.xAxis_max) || 0),
        Math.abs(Number(this.yAxis_min) || 0),
        Math.abs(Number(this.yAxis_max) || 0)
      );
      const nextRange = dataMaxAbs > currentRange
        ? paddedDataRange
        : Math.max(baseRange, Number((Math.max(paddedDataRange, currentRange * this.axisShrinkFactor)).toFixed(3)));

      this.xAxis_min = -nextRange;
      this.xAxis_max = nextRange;
      this.yAxis_min = -nextRange;
      this.yAxis_max = nextRange;
    },
    initChart() {
      const chartDom = this.$refs.scatterchart;
      this.myChart = echarts.init(chartDom);

      this.renderChart(this.xAxis_min, this.xAxis_max, this.yAxis_min, this.yAxis_max);
    },
    renderChart(x_min,x_max,y_min,y_max) {
      if (!this.myChart) return;
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
              color: 'rgba(200, 200, 200, 0.5)'  // y轴线颜色
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
      this.updateAxisRange();
      this.renderChart(this.xAxis_min, this.xAxis_max, this.yAxis_min, this.yAxis_max);
    },
    clearChartData() {
      this.chartData = [];
      this.chartData_new = [];
      this.updateAxisRange();
      this.renderChart(this.xAxis_min, this.xAxis_max, this.yAxis_min, this.yAxis_max);
    },
    RangeSwitch() {
      const currentIndex = this.rangeModes.indexOf(this.rangeMode);
      const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % this.rangeModes.length : 0;
      this.rangeMode = this.rangeModes[nextIndex];

      this.updateAxisRange();
      this.renderChart(this.xAxis_min, this.xAxis_max, this.yAxis_min, this.yAxis_max);
    },
    onGuiderErrorUnitChanged() {
      this.clearChartData();
    }
  }
}
</script>

<style scoped>
.scatterchart-panel {
  background-color: rgba(0, 0, 0, 0.0);
  /* backdrop-filter: blur(5px); */
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
