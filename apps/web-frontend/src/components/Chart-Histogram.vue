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

  },
  created() {
    // this.$bus.$on('InitChart', this.setMaxWidth);
    this.$bus.$on('showHistogram', this.addDataToChart);
    this.$bus.$on('updateHistogramWidth', this.initChart);
  },
  methods: {
    initChart(Width) {
      this.containerMaxWidth = Width - 10;
      const chartDom = this.$refs.barchart;
      chartDom.style.width = this.containerMaxWidth + 'px';
      this.myChart = echarts.init(chartDom);
      this.renderChart(this.xAxis_min, this.xAxis_max);
    },

    renderChart(x_min, x_max) {
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
        series: []
      };

      // 为每个通道创建对应的 series
      for (let channel = 0; channel < 3; channel++) {
        option.series.push({
          data: this.barData[channel], // 注意这里的数据结构
          type: 'line',
          itemStyle: {
            color: channel === 0 ? 'rgba(0,120,212,0.7)' : (channel === 1 ? 'rgba(51,218,121,0.7)' : 'rgba(255,0,0,0.7)') // 根据通道选择颜色
          },
          symbolSize: 0
        });
      }

      // 在这里可以继续添加其他通道的曲线，也可以根据需要修改颜色

      option.series.push({
        data: [[this.histogram_min, 0], [this.histogram_min, yAxisMax]],  // 数据格式为 [x, y]
        type: 'line',
        lineStyle: {
          color: 'blue',  // 设置线的颜色
          type: 'dashed',  // 设置线的类型，可以为 'solid', 'dashed', 'dotted'
          width: 1
        },
        symbolSize: 0
      });

      option.series.push({
        data: [[this.histogram_max, 0], [this.histogram_max, yAxisMax]],
        type: 'line',
        lineStyle: {
          color: 'red',
          type: 'dashed',
          width: 1
        },
        symbolSize: 0
      });

      this.myChart.setOption(option);
    },
    
    addDataToChart(histogramData) {
            this.clearBarData();

      // 初始化最小和最大值的索引
      let firstNonZeroIndex = -1;
      let lastNonZeroIndex = -1;

      // 处理三个通道的直方图数据
      for (let channel = 0; channel < histogramData.length; channel++) {
        const channelData = histogramData[channel];
        const channelSeriesData = []; // 存储当前通道的 series 数据

        for (let i = 0; i < channelData.length; i++) {
          const value = [i, channelData[i]];
          channelSeriesData.push(value);

          // 更新最小和最大值的索引
          if (channelData[i] !== 0) {
            if (firstNonZeroIndex === -1) {
              // 第一次不等于0的索引
              firstNonZeroIndex = i;
            }
            // 记录每次不等于0的索引，最后一次会覆盖之前记录的值
            lastNonZeroIndex = i;
          }
        }

        // 将当前通道的 series 数据存入 barData
        this.barData.push(channelSeriesData);
      }

      // 发送最小和最大值的索引到其他组件
      this.histogram_min = firstNonZeroIndex;
      this.histogram_max = lastNonZeroIndex;

      this.$bus.$emit('AutoHistogramNum', this.histogram_min, this.histogram_max);

      console.log('First Non-Zero Index:', firstNonZeroIndex);
      this.$bus.$emit('SendConsoleLogMsg', 'First Non-Zero Index:' + firstNonZeroIndex, 'info');
      console.log('Last Non-Zero Index:', lastNonZeroIndex);
      this.$bus.$emit('SendConsoleLogMsg', 'Last Non-Zero Index:' + lastNonZeroIndex, 'info');

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





