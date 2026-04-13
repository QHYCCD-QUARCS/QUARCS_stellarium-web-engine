<template>
  <div data-testid="ui-chart-histogram-root">
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
      barData: [],
      rawHistogramData: null,
      myChart: null,
      xAxis_min: 0,
      xAxis_max: 65535,

      // 当前有效区间（由自动拉伸 / 拨盘设置）
      histogram_min: 0,
      histogram_max: 65535,

      // 自动拉伸得到的“有效区间”总范围（按钮显示“区”时，X 轴固定到这个范围）
      auto_min: 0,
      auto_max: 65535,

      // 是否使用有效区间绘制（true：只画有效区间；false：画全范围）
      useEffectiveRange: true,

      // 全范围（16bit）
      fullRange_min: 0,
      fullRange_max: 65535,
    };
  },
  mounted() {

  },
  created() {
    this.$bus.$on('showHistogram', this.addDataToChart);
    this.$bus.$on('updateHistogramWidth', this.initChart);
    // 自动拉伸结果：决定“区间模式”的固定显示范围，并更新初始窗口位置
    this.$bus.$on('AutoHistogramNum', this.setAutoRange);
    // 手动/自动拉伸窗口变化：只更新窗口位置（用于全图模式下的蓝/红竖线）
    this.$bus.$on('ChangeDialPosition', this.setWindowRange);
    // 与拨盘联动：切换“全图 / 区间”模式
    this.$bus.$on('HistogramRangeMode', this.setRangeMode);
  },
  beforeDestroy() {
    this.$bus.$off('showHistogram', this.addDataToChart);
    this.$bus.$off('updateHistogramWidth', this.initChart);
    this.$bus.$off('AutoHistogramNum', this.setAutoRange);
    this.$bus.$off('ChangeDialPosition', this.setWindowRange);
    this.$bus.$off('HistogramRangeMode', this.setRangeMode);
    if (this.myChart) {
      this.myChart.dispose();
      this.myChart = null;
    }
  },
  methods: {
    updateXAxisRange() {
      if (this.useEffectiveRange) {
        const autoMin = Number.isFinite(this.auto_min) ? this.auto_min : 0;
        const autoMax = Number.isFinite(this.auto_max) ? this.auto_max : 65535;
        this.xAxis_min = autoMin;
        this.xAxis_max = autoMax > autoMin ? autoMax : autoMin + 1;
      } else {
        this.xAxis_min = this.fullRange_min;
        this.xAxis_max = this.fullRange_max;
      }
    },
    buildSeriesData(channelData) {
      if (!Array.isArray(channelData) || channelData.length === 0) return [];

      let maxLogValue = 0;
      const logValues = new Array(channelData.length);
      for (let i = 0; i < channelData.length; i++) {
        const count = Number(channelData[i]) || 0;
        const logValue = Math.log1p(Math.max(0, count));
        logValues[i] = logValue;
        if (logValue > maxLogValue) maxLogValue = logValue;
      }

      const normalizationBase = maxLogValue > 0 ? maxLogValue : 1;
      const formattedData = [];
      for (let i = 0; i < logValues.length; i++) {
        const normalizedValue = logValues[i] / normalizationBase;
        if (normalizedValue > 0 || i % 16 === 0 || i === 0 || i === logValues.length - 1) {
          formattedData.push([i, normalizedValue]);
        }
      }
      return formattedData;
    },
    // 自动拉伸得到的固定显示范围（16bit：0-65535）
    setAutoRange(min, max) {
      // 记录自动拉伸得到的“有效区间”总范围
      this.auto_min = min;
      this.auto_max = max;

      // 初始窗口与自动拉伸范围一致
      this.histogram_min = min;
      this.histogram_max = max;

      // 按模式决定 X 轴总范围：
      // 区间模式（按钮显示“区”）：X 轴固定为自动拉伸区间 [auto_min, auto_max]
      // 全图模式（按钮显示“全”）：X 轴固定为完整 16bit 范围 [0, 65535]
      this.updateXAxisRange();

      // 已有图表和数据时，立即按新范围重绘，便于观察像素变化
      if (this.myChart) {
        this.renderChart(this.xAxis_min, this.xAxis_max);
      }
    },

    // 当前窗口范围（由拨盘/手动拉伸控制）
    setWindowRange(min, max) {
      this.histogram_min = min;
      this.histogram_max = max;

      if (this.myChart) {
        this.renderChart(this.xAxis_min, this.xAxis_max);
      }
    },

    // 外部调用：切换“全范围 / 有效区间”显示模式
    toggleRangeMode() {
      this.useEffectiveRange = !this.useEffectiveRange;
      this.updateXAxisRange();

      if (this.myChart && this.barData.length > 0) {
        this.renderChart(this.xAxis_min, this.xAxis_max);
      }
    },

    // 根据外部开关直接设置"全图 / 区间"模式（与拨盘和面板按钮联动）
    setRangeMode(flag) {
      this.useEffectiveRange = flag;
      this.updateXAxisRange();

      if (this.useEffectiveRange) {
        console.log(`[Chart-Histogram] 切换到区间模式: [${this.xAxis_min}, ${this.xAxis_max}]`);
      } else {
        console.log(`[Chart-Histogram] 切换到全图模式: [${this.xAxis_min}, ${this.xAxis_max}]`);
      }

      if (this.myChart) {
        this.renderChart(this.xAxis_min, this.xAxis_max);
      } else {
        console.log('[Chart-Histogram] 图表尚未初始化或无数据，延迟渲染');
      }
    },

    initChart(Width) {
      this.containerMaxWidth = Width - 10;
      const chartDom = this.$refs.barchart;
      chartDom.style.width = this.containerMaxWidth + 'px';
      if (this.myChart) {
        this.myChart.dispose();
      }
      this.myChart = echarts.init(chartDom);
      this.renderChart(this.xAxis_min, this.xAxis_max);
    },

    renderChart(x_min, x_max) {
      // 尚未初始化图表或没有数据，则退出
      if (!this.myChart) return;
      if (this.barData.length === 0) {
        this.myChart.setOption({
          xAxis: {
            type: 'value',
            min: x_min,
            max: x_max,
            axisLabel: null,
            splitLine: { show: false }
          },
          yAxis: {
            type: 'value',
            min: 0,
            max: 1,
            axisLabel: null,
            splitLine: { show: false }
          },
          series: []
        }, true);
        return;
      }
      
      const flattened = this.barData.flatMap(channel => channel.map(item => item[1]));
      const yAxisMax = Math.max(1, ...flattened);
      
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
          min: 0,
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
      const colors = ['rgba(255,0,0,0.85)', 'rgba(51,218,121,0.85)', 'rgba(0,120,212,0.85)'];
      
      // 灰度图和彩色图使用不同的颜色方案
      if (this.barData.length === 1) {
        // 灰度图只有一个通道，使用白色
        option.series.push({
          data: this.barData[0],
          type: 'line',
          showSymbol: false,
          smooth: false,
          itemStyle: {
            color: 'rgba(255,255,255,0.7)'
          },
          lineStyle: {
            width: 1.2
          },
          symbolSize: 0
        });
      } else {
        // 彩色图有多个通道，使用标准RGB颜色
        for (let channel = 0; channel < this.barData.length; channel++) {
          option.series.push({
            data: this.barData[channel],
            type: 'line',
            showSymbol: false,
            smooth: false,
            itemStyle: {
              color: colors[channel % colors.length]
            },
            lineStyle: {
              width: 1.1
            },
            symbolSize: 0
          });
        }
      }

      // 在两种模式下都添加最小和最大值的垂直线，标出当前窗口在 X 轴总范围中的位置
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

      this.myChart.setOption(option, true);
    },

    addDataToChart(histogramData) {
      this.rawHistogramData = histogramData;
      this.barData = [];
      if (!Array.isArray(histogramData) || histogramData.length === 0) {
        this.renderChart(this.xAxis_min, this.xAxis_max);
        return;
      }
      console.log("当前直方图数据长度:", histogramData.length);

      if (!Array.isArray(histogramData[0])) {
        this.barData.push(this.buildSeriesData(histogramData));
      } else {
        for (let channel = 0; channel < histogramData.length; channel++) {
          this.barData.push(this.buildSeriesData(histogramData[channel]));
        }
      }
      
      // 发送信息
      console.log("有效数据范围:", this.histogram_min, "-", this.histogram_max);
      // this.$bus.$emit('AutoHistogramNum', this.histogram_min, this.histogram_max);
      this.renderChart(this.xAxis_min, this.xAxis_max);
    },

    clearBarData() {
      this.rawHistogramData = null;
      this.barData = [];
      this.renderChart(this.xAxis_min, this.xAxis_max);
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
