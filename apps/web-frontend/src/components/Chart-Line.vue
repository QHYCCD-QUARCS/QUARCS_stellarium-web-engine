<template>
  <div data-testid="ui-chart-line-root">
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
      pulseDataRa: [], // [x, signedPulseMs]
      pulseDataDec: [], // [x, signedPulseMs]
      lastX: null,
      // 脉冲柱状条 y 轴范围（ms）
      // 之前设为 800ms 会导致常见 20~80ms 的导星脉冲几乎不可见，看起来像“高度条没显示”。
      // 这里用更贴近实际的默认值，并在 onGuiderPulse 中做自适应伸缩。
      pulseAxisMax: 250,
      xAxis_min: 0,
      xAxis_max: 50, 
      xWindowSize: 50,
      chartHistoryPadding: 10,
      yAxis_min: -4,
      yAxis_max: 4,  
      range: 4,
      
      // 新增数据
      resolution: '1920x1080',  // 分辨率
      // PHD2 风格 Rolling RMS（默认窗口 60）
      rmsWindow: 60,
      rmsRa: '0.000',
      rmsDec: '0.000',
      rmsTotal: '0.000',
      // 后端 RMS 最近一次更新时间（用于“后端未持续推送时”的前端兜底）
      lastBackendRmsAt: 0,
      backendRmsStaleMs: 2000,
      // 误差滚动窗口（用于前端计算 RMS）
      rmsBufRa: [],
      rmsBufDec: [],
      // 若后端提供 RMS（AddRMSErrorData），优先显示后端值以便对齐口径
      preferBackendRms: true,
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
    this.$bus.$on('GuiderPulse', this.onGuiderPulse);
    this.$bus.$on('AddRMSErrorData', this.onBackendRms);
  },
  methods: {
    isCompactLegend() {
      return window.innerWidth <= 768;
    },
    formatLegendLabel(name) {
      const compact = this.isCompactLegend();
      if (name === 'RES') return compact ? `RES:${this.resolution}` : `分辨率: ${this.resolution}`;
      if (name === 'RA') return compact ? `RA:${this.rmsRa}` : `RA RMS: ${this.rmsRa}`;
      if (name === 'DEC') return compact ? `DEC:${this.rmsDec}` : `DEC RMS: ${this.rmsDec}`;
      if (name === 'TOTAL') return compact ? `TOT:${this.rmsTotal}` : `Total RMS: ${this.rmsTotal}`;
      return name;
    },
    // PHD2：RA RMS = sqrt(mean(ra^2)), DEC RMS = sqrt(mean(dec^2)),
    // Total RMS = sqrt(mean(ra^2 + dec^2))
    recomputeRmsFromBuffers() {
      const n = Math.min(this.rmsBufRa.length, this.rmsBufDec.length);
      if (n <= 0) {
        this.rmsRa = '0.000';
        this.rmsDec = '0.000';
        this.rmsTotal = '0.000';
        return;
      }
      let sumRa2 = 0;
      let sumDec2 = 0;
      let sumTot2 = 0;
      for (let i = 0; i < n; i++) {
        const ra = this.rmsBufRa[i];
        const dec = this.rmsBufDec[i];
        sumRa2 += ra * ra;
        sumDec2 += dec * dec;
        sumTot2 += ra * ra + dec * dec;
      }
      const raRms = Math.sqrt(sumRa2 / n);
      const decRms = Math.sqrt(sumDec2 / n);
      const totRms = Math.sqrt(sumTot2 / n);
      this.rmsRa = raRms.toFixed(3);
      this.rmsDec = decRms.toFixed(3);
      this.rmsTotal = totRms.toFixed(3);
    },
    onBackendRms(ra, dec, total) {
      if (!this.preferBackendRms) return;
      if (!Number.isFinite(ra) || !Number.isFinite(dec) || !Number.isFinite(total)) return;
      this.rmsRa = Number(ra).toFixed(3);
      this.rmsDec = Number(dec).toFixed(3);
      this.rmsTotal = Number(total).toFixed(3);
      this.lastBackendRmsAt = Date.now();
      // legend 文案变化需要重绘
      this.renderChart(this.xAxis_min, this.xAxis_max, this.yAxis_min, this.yAxis_max);
    },
    initChart(Width) {
      this.containerMaxWidth = Width - 95;
      const chartDom = this.$refs.linechart;
      chartDom.style.width = this.containerMaxWidth + 'px';
      this.myChart = echarts.init(chartDom);
      this.renderChart(this.xAxis_min, this.xAxis_max, this.yAxis_min, this.yAxis_max);
    },
    renderChart(x_min,x_max,y_min,y_max) {
      const compactLegend = this.isCompactLegend();
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
        yAxis: [
          {
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
          {
            // 脉冲柱状条专用 y 轴（ms），隐藏轴线/刻度，避免干扰
            min: -this.pulseAxisMax,
            max: this.pulseAxisMax,
            axisLine: { show: false },
            axisLabel: { show: false },
            axisTick: { show: false },
            splitLine: { show: false }
          }
        ],
        legend: {
          data: ['RES', 'RA', 'DEC', 'TOTAL'],
          formatter: (name) => this.formatLegendLabel(name),
          top: -5,       // 设置图例距离顶部的距离
          left: compactLegend ? 2 : 'auto',
          right: compactLegend ? 2 : 5,
          itemWidth: compactLegend ? 5 : 7,
          itemHeight: 2,   // 设置图例项的高度为3
          itemGap: compactLegend ? 4 : 10,
          textStyle: {
            color: 'white', // 设置字体颜色
            fontSize: compactLegend ? 6 : 8
          },
          selectedMode: false
        },
        series: [
          // 脉冲高度条（先画在底层，颜色暗淡一些；方向=误差反向）
          {
            name: '__RaPulse',
            type: 'bar',
            yAxisIndex: 1,
            data: this.pulseDataRa,
            barWidth: 2,
            barGap: '-100%',
            itemStyle: {
              color: 'rgba(255, 0, 0, 0.35)'
            },
            emphasis: { disabled: true },
            silent: true,
            z: 1
          },
          {
            name: '__DecPulse',
            type: 'bar',
            yAxisIndex: 1,
            data: this.pulseDataDec,
            barWidth: 2,
            barGap: '-100%',
            itemStyle: {
              color: 'rgba(0, 255, 0, 0.30)'
            },
            emphasis: { disabled: true },
            silent: true,
            z: 1
          },
          {
            name: 'RA',
            type: 'line',
            data: this.chartData1,
            itemStyle: {
              color: 'red'
            },
            lineStyle: {  // 设置红色曲线的宽度为2
              width: 1
            },
            symbolSize: 0,
            z: 3
          },
          {
            name: 'DEC',
            type: 'line',
            data: this.chartData2,
            itemStyle: {
              color: 'green'
            },
            lineStyle: {  // 设置红色曲线的宽度为2
              width: 1
            },
            symbolSize: 0,
            z: 3
          },
          {
            name: 'RES',  // 分辨率对应的虚拟系列
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
          },
          {
            name: 'TOTAL', // Total RMS 对应的虚拟系列（只用于 legend 文案）
            type: 'line',
            data: [],
            itemStyle: { color: 'transparent' },
            lineStyle: { width: 0, opacity: 0 },
            symbolSize: 0,
            silent: true
          }
        ]
      };
      this.myChart.setOption(option);
    },
    updateAutoScrollWindow(latestX) {
      if (!Number.isFinite(latestX)) return;
      const windowSize = Math.max(1, this.xWindowSize);
      const nextMax = Math.max(windowSize, latestX);
      this.xAxis_max = nextMax;
      this.xAxis_min = Math.max(0, nextMax - windowSize);
    },
    pruneOldChartData() {
      const keepAfterX = this.xAxis_min - this.chartHistoryPadding;
      const shouldKeepPoint = (point) => Array.isArray(point) && point.length > 0 && Number(point[0]) >= keepAfterX;
      this.chartData1 = this.chartData1.filter(shouldKeepPoint);
      this.chartData2 = this.chartData2.filter(shouldKeepPoint);
      this.pulseDataRa = this.pulseDataRa.filter(shouldKeepPoint);
      this.pulseDataDec = this.pulseDataDec.filter(shouldKeepPoint);
    },
    addData(newDataPoint1,newDataPoint2) {
      this.chartData1.push(newDataPoint1);
      this.chartData2.push(newDataPoint2);

      // 记录最后一个 x，用于把 GuiderPulse 对齐到同一时刻
      if (newDataPoint1 && newDataPoint1.length > 1) {
        this.lastX = newDataPoint1[0];
        // 默认补 0（没有脉冲时）
        this.pulseDataRa.push([this.lastX, 0]);
        this.pulseDataDec.push([this.lastX, 0]);
        this.updateAutoScrollWindow(this.lastX);
        this.pruneOldChartData();
      }
      
      // 更新当前Ra和Dec值
      if (newDataPoint1 && newDataPoint1.length > 1 && newDataPoint2 && newDataPoint2.length > 1) {
        const ra = Number(newDataPoint1[1]);
        const dec = Number(newDataPoint2[1]);
        if (Number.isFinite(ra) && Number.isFinite(dec)) {
          this.rmsBufRa.push(ra);
          this.rmsBufDec.push(dec);
          while (this.rmsBufRa.length > this.rmsWindow) this.rmsBufRa.shift();
          while (this.rmsBufDec.length > this.rmsWindow) this.rmsBufDec.shift();
          // RMS 更新策略：
          // - preferBackendRms=false：始终前端实时计算（每帧）
          // - preferBackendRms=true：优先用后端 RMS，但若后端超过一段时间未更新，则使用前端滚动 RMS 兜底，避免 UI “卡住”
          const backendFresh = this.lastBackendRmsAt > 0 && (Date.now() - this.lastBackendRmsAt) <= this.backendRmsStaleMs;
          if (!this.preferBackendRms || !backendFresh) {
            this.recomputeRmsFromBuffers();
          }
        }
      }
      
      this.renderChart(this.xAxis_min, this.xAxis_max, this.yAxis_min, this.yAxis_max);
    },
    onGuiderPulse(message) {
      // message 形如：GuiderPulse:NORTH:110:raErrPx=...:decErrPx=...
      // 目标：把脉冲显示成“高度条”，颜色对应 RA/DEC，且方向与误差相反（和 PHD2 观感一致）
      if (!message || typeof message !== 'string') return;
      const parts = message.split(':');
      if (parts.length < 3) return;
      if (parts[0] !== 'GuiderPulse') return;

      const dir = parts[1];
      const durationMs = Number(parts[2]);
      if (!Number.isFinite(durationMs) || durationMs <= 0) return;
      if (!Number.isFinite(this.lastX)) return;

      // 解析 raErrPx / decErrPx
      let raErr = NaN;
      let decErr = NaN;
      for (let i = 3; i < parts.length; i++) {
        if (parts[i].startsWith('raErrPx=')) raErr = Number(parts[i].substring('raErrPx='.length));
        if (parts[i].startsWith('decErrPx=')) decErr = Number(parts[i].substring('decErrPx='.length));
      }

      const isRa = (dir === 'EAST' || dir === 'WEST');
      const isDec = (dir === 'NORTH' || dir === 'SOUTH');
      if (!isRa && !isDec) return;

      // 柱方向：与误差相反（你要求 RA 也像 DEC 一样）
      // 若误差不可用（校准/回差阶段是 N/A），fallback 用方向映射给一个固定符号。
      let sign = 0;
      if (isRa && Number.isFinite(raErr) && raErr !== 0) sign = -Math.sign(raErr);
      else if (isDec && Number.isFinite(decErr) && decErr !== 0) sign = -Math.sign(decErr);
      else {
        // fallback：仅用于 N/A 场景，不追求与误差严格对应
        if (dir === 'EAST') sign = -1;
        else if (dir === 'WEST') sign = 1;
        else if (dir === 'NORTH') sign = 1;
        else if (dir === 'SOUTH') sign = -1;
      }

      const signedMs = sign * durationMs;

      // 写入最后一个点的柱高（与最新误差点对齐）
      const idx = this.pulseDataRa.length - 1;
      if (idx < 0) return;
      if (isRa) this.pulseDataRa[idx] = [this.lastX, signedMs];
      if (isDec) this.pulseDataDec[idx] = [this.lastX, signedMs];

      // 动态调整脉冲 y 轴范围，避免柱状条被截断（但保持相对稳定）
      const absMs = Math.abs(signedMs);
      // 既能扩展到大脉冲（回差补偿/校准），也能在持续小脉冲时缓慢收缩，让小脉冲“肉眼可见”
      const target = Math.min(5000, Math.max(200, Math.ceil(absMs * 1.5)));
      if (target > this.pulseAxisMax) this.pulseAxisMax = target;
      else this.pulseAxisMax = Math.max(target, Math.ceil(this.pulseAxisMax * 0.97));

      this.renderChart(this.xAxis_min, this.xAxis_max, this.yAxis_min, this.yAxis_max);
    },
    changeRange(min, max) {
      this.xAxis_min = min;
      this.xAxis_max = max;
      const windowSize = max - min;
      if (Number.isFinite(windowSize) && windowSize > 0) {
        this.xWindowSize = windowSize;
      }
      this.pruneOldChartData();
      this.renderChart(this.xAxis_min, this.xAxis_max, this.yAxis_min, this.yAxis_max);
    },
    clearChartData() {
      this.chartData1 = [];
      this.chartData2 = [];
      this.pulseDataRa = [];
      this.pulseDataDec = [];
      this.lastX = null;
      this.pulseAxisMax = 800;
      this.rmsRa = '0.000';
      this.rmsDec = '0.000';
      this.rmsTotal = '0.000';
      this.rmsBufRa = [];
      this.rmsBufDec = [];
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

