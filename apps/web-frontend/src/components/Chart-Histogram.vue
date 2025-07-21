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
      xAxis_max: 65535,

      histogram_min: 0,
      histogram_max: 65535,
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
      // 如果没有数据，则退出
      if (this.barData.length === 0) return;
      
      const yAxisMax = Math.max(...this.barData.flatMap(channel => 
        channel.map(item => item[1])
      ));  // 获取所有通道中的y轴最大值
      
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
          splitLine: {
            show: false
          }
        },
        yAxis: {
          type: 'value',
          max: yAxisMax,
          axisLine: {
            lineStyle: {
              color: 'white'
            }
          },
          axisLabel: null,
          splitLine: {
            show: false
          }
        },
        series: []
      };

      // 根据实际通道数量创建系列
      const colors = ['rgba(0,120,212,0.7)', 'rgba(51,218,121,0.7)', 'rgba(255,0,0,0.7)'];
      
      // 灰度图和彩色图使用不同的颜色方案
      if (this.barData.length === 1) {
        // 灰度图只有一个通道，使用白色
        option.series.push({
          data: this.barData[0],
          type: 'line',
          itemStyle: {
            color: 'rgba(255,255,255,0.7)'
          },
          symbolSize: 0
        });
      } else {
        // 彩色图有多个通道，使用标准RGB颜色
        for (let channel = 0; channel < this.barData.length; channel++) {
          option.series.push({
            data: this.barData[channel],
            type: 'line',
            itemStyle: {
              color: colors[channel % colors.length]
            },
            symbolSize: 0
          });
        }
      }

      // 添加最小和最大值的垂直线
      option.series.push({
        data: [[this.histogram_min, 0], [this.histogram_min, yAxisMax]],
        type: 'line',
        lineStyle: {
          color: 'blue',
          type: 'dashed',
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
      console.log("当前直方图数据长度:", histogramData.length);
      
      // 判断是灰度图还是彩色图
      // 如果是简单数组(长度很大)，则为灰度图
      // 如果是数组的数组(长度为3)，则为彩色图
      
      
      // 处理灰度图 - 单一数组，长度很大
      if (!Array.isArray(histogramData[0])) {
        const formattedData = [];
        
        // 转换为[index, value]格式，仅保留非零点和每16个点的采样点
        for (let i = 0; i < histogramData.length; i++) {
          if (histogramData[i] > 0 || i % 16 === 0) {
            formattedData.push([i, histogramData[i]]);
          }
        }
        
        this.barData.push(formattedData);
        
      } else { // 处理彩色图 - 三通道数组
        // 遍历RGB三个通道
        for (let channel = 0; channel < histogramData.length; channel++) {
          const channelData = histogramData[channel];
          const formattedData = [];
          
          // 转换为[index, value]格式，仅保留非零点和每16个点的采样点
          for (let i = 0; i < channelData.length; i++) {
            if (channelData[i] > 0 || i % 16 === 0) {
              formattedData.push([i, channelData[i]]);
            }
          }
          
          this.barData.push(formattedData);
        }
      }
      
      // 发送信息
      console.log("有效数据范围:", this.histogram_min, "-", this.histogram_max);
      // this.$bus.$emit('AutoHistogramNum', this.histogram_min, this.histogram_max);
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
