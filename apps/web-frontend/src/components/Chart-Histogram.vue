<template>
  <div>
    <div ref="barchart" :style="{ width: containerMaxWidth + 'px', height: 80 + 'px' }" class="barchart-panel"></div>
  </div>
</template>


<script>
import * as echarts from 'echarts';

export default {
  name: 'BarChart',
  data() {
    return {
      containerMaxWidth: 190,
      barData: [],  // 示例数据
      xAxis_min: 0,
      xAxis_max: 255, 

      histogram_min: 0,
      histogram_max: 255,
    };
  },
  mounted() {
    this.initChart();
  },
  created() {
    // this.$bus.$on('InitChart', this.setMaxWidth);
    this.$bus.$on('showHistogram', this.addDataToChart);
  },
  methods: {
    // setMaxWidth() {
    //   const Width = window.innerWidth;
    //   this.containerMaxWidth = Width - 350;
    //   const chartDom = this.$refs.barchart;
    //   chartDom.style.width = this.containerMaxWidth + 'px';
    //   this.myChart = echarts.init(chartDom);
    //   this.renderChart(this.xAxis_min, this.xAxis_max);
    // },

    initChart() {
      const Width = window.innerWidth;
      this.containerMaxWidth = Width - 350;
      const chartDom = this.$refs.barchart;
      chartDom.style.width = this.containerMaxWidth + 'px';
      this.myChart = echarts.init(chartDom);
      this.renderChart(this.xAxis_min, this.xAxis_max);
    },

    renderChart(x_min,x_max) {
      const yAxisMax = Math.max(...this.barData.map(item => item[1]));  // 获取 y 轴的最大值
      const option = {
        grid: {
          left: '-1%',
          right: '1%',
          bottom: '0%',
          top: '0%',
          containLabel: true
        },
        xAxis: {
          type: 'value',
          min: x_min,
          max: x_max,
          axisLine: {
            lineStyle: {
              color: 'white'
            }
          },
          axisLabel: null,
          splitLine: {  // 隐藏 x 轴的网格线
            show: false
          }
        },
        yAxis: {
          type: 'value',
          max: yAxisMax,  // 使用动态获取的 y 轴最大值
          axisLine: {
            lineStyle: {
              color: 'white'
            }
          },
          axisLabel: null,
          splitLine: {  // 隐藏 x 轴的网格线
            show: false
          }
        },
        series: [{
          data: this.barData,
          type: 'line',
          itemStyle: {
            color: 'white'  // 柱子颜色
          },
          symbolSize: 0
        }, {
          data: [[this.histogram_min, 0], [this.histogram_min, yAxisMax]],  // 数据格式为 [x, y]
          type: 'line',
          lineStyle: {
            color: 'blue',  // 设置线的颜色
            type: 'dashed',  // 设置线的类型，可以为 'solid', 'dashed', 'dotted'
            width: 1
          },
          symbolSize: 0
        }, {
          data: [[this.histogram_max, 0], [this.histogram_max, yAxisMax]],
          type: 'line',
          lineStyle: {
            color: 'red',
            type: 'dashed',
            width: 1
          },
          symbolSize: 0
        }]
      };
      this.myChart.setOption(option);
    },

    addDataToChart(histogramData) {
      this.clearBarData();
      let firstNonZeroIndex = -1;
      let lastNonZeroIndex = -1;

      for (let i = 0; i < histogramData.length; i++) {
        const value = [i,histogramData[i]];
        console.log('QHYCCD | histogramData:', i, histogramData[i]);
        this.barData.push(value);

        if (histogramData[i] !== 0) {
          if (firstNonZeroIndex === -1) {
            // 第一次不等于0的索引
            firstNonZeroIndex = i;
          }
          // 记录每次不等于0的索引，最后一次会覆盖之前记录的值
          lastNonZeroIndex = i;
        }
      }

      this.histogram_min = firstNonZeroIndex;
      this.histogram_max = lastNonZeroIndex;

      this.$bus.$emit('AutoHistogramNum', this.histogram_min, this.histogram_max);

      console.log('First Non-Zero Index:', firstNonZeroIndex);
      console.log('Last Non-Zero Index:', lastNonZeroIndex);

      this.renderChart(this.xAxis_min, this.xAxis_max);
    },

    clearBarData() {
      this.barData = [];  // 清空数据
      this.renderChart(this.xAxis_min, this.xAxis_max);  // 重新渲染图表
    }
  }
}
</script>


<style scoped>
.barchart-panel {
  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
  border-radius: 5px;
  box-sizing: border-box;
  /* border: 1px solid rgba(255, 255, 255, 0.8); */
}
</style>





