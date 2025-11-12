<template>
  <div>
    <!-- 折线图区域 -->
    <div ref="linechart" :style="{ width: containerMaxWidth + 'px', height: 80 + 'px' }" class="linechart-panel"></div>
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
      
      // 新增数据
      resolution: '1920x1080',  // 分辨率
      currentRa: '0.000',       // 当前Ra值
      currentDec: '0.000',      // 当前Dec值
    };
  },
  mounted() {
    this.$bus.$emit('AppSendMessage', 'Vue_Command', 'getStagingGuiderData');
  },
  created() {
    this.$bus.$on('AddLineChartData', this.addData);
    this.$bus.$on('SetLineChartRange', this.changeRange);
    this.$bus.$on('clearChartData', this.clearChartData);
    this.$bus.$on('ChartRangeSwitch', this.RangeSwitch);
    this.$bus.$on('updateLineChartWidth', this.initChart);
    
    // 新增事件监听
    this.$bus.$on('GuideSize', this.updateResolution);
  },
  methods: {
    initChart(Width) {
      this.containerMaxWidth = Width - 95;
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
          data: [
            {
              name: `分辨率: ${this.resolution}`,
              textStyle: {
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: 8
              }
            },
            {
              name: `Ra: ${this.currentRa}`,
              textStyle: {
                color: 'red',
                fontSize: 8
              }
            },
            {
              name: `Dec: ${this.currentDec}`,
              textStyle: {
                color: 'green',
                fontSize: 8
              }
            }
          ],
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
            name: `Ra: ${this.currentRa}`,  // 系列名称也要对应图例
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
            name: `Dec: ${this.currentDec}`,  // 系列名称也要对应图例
            type: 'line',
            data: this.chartData2,
            itemStyle: {
              color: 'green'
            },
            lineStyle: {  // 设置红色曲线的宽度为2
              width: 1
            },
            symbolSize: 0
          },
          {
            name: `分辨率: ${this.resolution}`,  // 分辨率对应的虚拟系列
            type: 'line',
            data: [],  // 空数据，不显示任何图形
            itemStyle: {
              color: 'transparent'  // 透明色
            },
            lineStyle: {
              width: 0,  // 线宽为0
              opacity: 0  // 完全透明
            },
            symbolSize: 0,
            silent: true  // 不响应鼠标事件
          }
        ]
      };
      this.myChart.setOption(option);
    },
    addData(newDataPoint1,newDataPoint2) {
      this.chartData1.push(newDataPoint1);
      this.chartData2.push(newDataPoint2);
      
      // 更新当前Ra和Dec值
      if (newDataPoint1 && newDataPoint1.length > 1) {
        this.currentRa = newDataPoint1[1].toFixed(3);
      }
      if (newDataPoint2 && newDataPoint2.length > 1) {
        this.currentDec = newDataPoint2[1].toFixed(3);
      }
      
      this.renderChart(this.xAxis_min, this.xAxis_max, this.yAxis_min, this.yAxis_max);
    },
    changeRange(min, max) {
      this.xAxis_min = min;
      this.xAxis_max = max;
    },
    clearChartData() {
      this.chartData1 = [];
      this.chartData2 = [];
      this.currentRa = '0.000';
      this.currentDec = '0.000';
      this.changeRange(0, 50);
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
    },
    
    // 新增方法
    updateResolution(col,row) {
      this.resolution = `${col}x${row}`;
      // 更新分辨率后重新渲染图表
      this.renderChart(this.xAxis_min, this.xAxis_max, this.yAxis_min, this.yAxis_max);
    },
  }
}
</script>

<style scoped>
.linechart-panel {
  background-color: rgba(0, 0, 0, 0.0);
  border-radius: 5px;
  box-sizing: border-box;
}
</style>

