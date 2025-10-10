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
  props: {
    // 是否使用时间轴模式（也可通过总线 setFocusChartTimeMode 切换）
    useTimeAxis: {
      type: Boolean,
      default: false
    },
    // 时间窗口长度（秒），仅在时间轴模式下生效
    timeWindowSec: {
      type: Number,
      default: 60
    }
  },
  data() {
    return {
      containerMaxWidth: 150,
      // 非时间轴：散点数据（x 为电调位置）
      chartData1_pos: [],
      // 时间轴：散点数据（x 为时间戳）
      chartData1_time: [],
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
      x_max: 60000,
      // 时间轴模式
      isTimeMode: false,
      timeTicker: null,
      // 可见性控制
      isVisible: false,
      ioObserver: null,
      // 渲染调度
      renderRafId: null,
      renderScheduled: false,
      pendingLowerBound: null,
      pendingUpperBound: null,
      // 调试日志开关
      debugRenderLogs: false,
      // 线条数据来源：若为 null 则使用 quadraticParams 动态采样
      lineDataFromPoints: null,
      quadraticParams: null // { a,b,c,x0? }
    };
  },
  mounted() {
    // 根据可见性启动/停止时间推进
    const el = this.$refs.linechart;
    if (window && 'IntersectionObserver' in window && el) {
      this.ioObserver = new IntersectionObserver((entries) => {
        const e = entries[0];
        this.isVisible = !!(e && e.isIntersecting);
        this.updateTickerByVisibility();
      }, { threshold: 0.01 });
      this.ioObserver.observe(el);
    } else {
      // 回退：不可见性未知时视为可见
      this.isVisible = true;
    }
    document.addEventListener('visibilitychange', this.updateTickerByVisibility);

    // 初始化时间轴模式（由 prop 控制）
    this.isTimeMode = !!this.useTimeAxis;
    this.updateTickerByVisibility();
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
    // 新增：时间轴模式控制与点追加
    this.$bus.$on('setFocusChartTimeMode', this.setTimeMode);
    this.$bus.$on('addFwhmNow', this.addFwhmPointNow);

  },
  beforeDestroy() {
    this.teardownBusAndTimers();
  },
  destroyed() {
    this.teardownBusAndTimers();
  },
  methods: {
    teardownBusAndTimers() {
      this.$bus.$off('FocusPosition', this.changeRange_x);
      this.$bus.$off('ClearfitQuadraticCurve', this.clearChartData2);
      this.$bus.$off('ClearAllData', this.ClearAllData);
      this.$bus.$off('updateFocusChartWidth', this.initChart);
      this.$bus.$off('addData_Point', this.addData_Point);
      this.$bus.$off('addMinPointData_Point', this.addMinPointData_Point);
      this.$bus.$off('addLineData_Point', this.addLineData_Point);
      this.$bus.$off('addQuadraticCurve', this.addLineData_Point);
      this.$bus.$off('setFocusChartRange', this.setFocusChartRange);
      this.$bus.$off('setFocusChartTimeMode', this.setTimeMode);
      this.$bus.$off('addFwhmNow', this.addFwhmPointNow);
      if (this.timeTicker) {
        clearInterval(this.timeTicker);
        this.timeTicker = null;
      }
      if (this.ioObserver) {
        try { this.ioObserver.disconnect(); } catch (e) {}
        this.ioObserver = null;
      }
      document.removeEventListener('visibilitychange', this.updateTickerByVisibility);
    },
    initChart(Width) {
      this.containerMaxWidth = Width - 95;
      const chartDom = this.$refs.linechart;
      chartDom.style.width = this.containerMaxWidth + 'px';
      this.myChart = echarts.init(chartDom);
      this.renderChart(this.xAxis_min, this.xAxis_max);
    },
    startDrag(event) {
      if (this.isTimeMode) return; // 时间轴模式下禁用拖拽
      this.isDragging = true;
      const x = this.getClientX(event);
      if (typeof x === 'number') this.startX = x;
    },
    dragging(event) {
      if (this.isDragging && !this.isTimeMode) {
        const x = this.getClientX(event);
        if (typeof x !== 'number') return;
        this.deltaX = (x - this.startX) * 10;
        this.startX = x;
        const windowWidth = this.xAxis_max - this.xAxis_min;
        // 计算新的范围并做边界裁剪
        let newMin = this.xAxis_min - this.deltaX;
        const minAllowed = this.x_min;
        const maxAllowed = this.x_max - windowWidth;
        if (maxAllowed < minAllowed) {
          // 安全处理：若设置不合理，回退到不移动
          newMin = this.x_min;
        } else {
          newMin = Math.max(minAllowed, Math.min(maxAllowed, newMin));
        }
        this.xAxis_min = newMin;
        this.xAxis_max = newMin + windowWidth;
        this.scheduleRender(this.xAxis_min, this.xAxis_max);
      }
    },
    getClientX(e) {
      if (e && e.touches && e.touches.length) return e.touches[0].clientX;
      if (e && e.changedTouches && e.changedTouches.length) return e.changedTouches[0].clientX;
      if (typeof e.clientX === 'number') return e.clientX;
      return undefined;
    },
    endDrag() {
      this.isDragging = false;
      this.deltaX = 0;
      // this.$bus.$emit('setTargetPosition', (this.xAxis_min + this.xAxis_max) / 2);
    },
    scheduleRender(lowerBound, upperBound) {
      this.pendingLowerBound = lowerBound;
      this.pendingUpperBound = upperBound;
      if (this.renderScheduled) return;
      this.renderScheduled = true;
      const cb = () => {
        this.renderRafId = null;
        this.renderScheduled = false;
        this.renderChart(this.pendingLowerBound, this.pendingUpperBound);
      };
      if (typeof window !== 'undefined' && window.requestAnimationFrame) {
        this.renderRafId = window.requestAnimationFrame(cb);
      } else {
        // 回退：无 rAF 时，使用微任务降低阻塞
        Promise.resolve().then(cb);
      }
    },
    renderChart(lowerBound, upperBound) {
      const data1 = this.isTimeMode ? this.chartData1_time : this.chartData1_pos;
      const y_max = data1.length > 0 ? Math.max(...data1.map(item => item[1])) * 2 : this.yAxis_max;
      // 线数据：若传入系数，则根据当前视图范围动态采样，避免拖动后断裂或消失
      let decData = [];
      if (!this.isTimeMode) {
        if (this.lineDataFromPoints && Array.isArray(this.lineDataFromPoints)) {
          decData = this.lineDataFromPoints;
        } else if (this.quadraticParams) {
          const { a, b, c, x0 } = this.quadraticParams;
          if (isFinite(a) && isFinite(b) && isFinite(c)) {
            decData = this.generateQuadraticData(a, b, c, lowerBound, upperBound, isFinite(x0) ? x0 : 0);
          }
        } else {
          decData = this.chartData2; // 兼容旧逻辑
        }
      }
      
      // 调试日志
      if (this.debugRenderLogs && this.isTimeMode && data1.length > 0) {
        console.log('Chart-Focus: renderChart (time mode)', {
          dataPoints: data1.length,
          latestPoint: data1[data1.length - 1],
          y_max: y_max
        });
      }
      const optionXAxis = this.isTimeMode
        ? {
            type: 'time',
            min: Date.now() - this.timeWindowSec * 1000,
            max: Date.now(),
            axisLabel: {
              color: 'white',
              fontSize: 5,
              formatter: function (value) {
                const d = new Date(value);
                const pad = (n) => (n < 10 ? '0' + n : '' + n);
                return pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
              }
            },
            axisLine: { lineStyle: { color: 'rgba(200, 200, 200, 0.5)' } },
            splitLine: {
              show: true,
              lineStyle: { color: 'rgba(128, 128, 128, 0.5)', width: 1, type: 'solid' }
            }
          }
        : {
            type: 'value',
            min: lowerBound,
            max: upperBound,
            axisLine: { lineStyle: { color: 'rgba(200, 200, 200, 0.5)' } },
            axisLabel: { color: 'white', fontSize: 5 },
            splitLine: { show: true, lineStyle: { color: 'rgba(128, 128, 128, 0.5)', width: 1, type: 'solid' } }
          };
      const option = {
        grid: {
          left: '0%',
          right: '2%',
          bottom: '0%',
          top: '10%',
          containLabel: true
        },
        xAxis: optionXAxis,
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
            data: data1,
            itemStyle: {
              color: 'red'
            },
            symbolSize: 4
          },
          !this.isTimeMode ? {
            name: 'Dec',
            type: 'line',
            data: decData,
            itemStyle: {
              color: 'green'
            },
            lineStyle: {
              width: 1
            },
            symbolSize: 0
          } : null,
          !this.isTimeMode ? {
            name: 'minPoint',
            type: 'scatter',
            data: this.chartData3,
            itemStyle: {
              color: 'rgba(75, 155, 250, 0.7)'
            },
            symbolSize: 4
          } : null,
          !this.isTimeMode ? {
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
          } : null,
          !this.isTimeMode ? {
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
          } : null,
          !this.isTimeMode ? {
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
          } : null
        ]
      };
      // 过滤掉为 null 的 series 项
      option.series = option.series.filter(Boolean);
      // 使用 lazyUpdate 降低同步开销
      this.myChart.setOption(option, false, true);
    },
    // 追加一个以"当前时间"为 x 的 FWHM 点（时间轴模式）
    addFwhmPointNow(fwhm) {
      // 确保 fwhm 是数字
      const fwhmNum = typeof fwhm === 'number' ? fwhm : parseFloat(fwhm);
      if (isNaN(fwhmNum) || fwhmNum <= 0) {
        console.warn('Chart-Focus: Invalid FWHM value:', fwhm);
        return;
      }
      
      const now = Date.now();
      const point = [now, fwhmNum];
      this.chartData1_time.push(point);
      
      console.log('Chart-Focus: addFwhmPointNow', {
        fwhm: fwhmNum,
        time: new Date(now).toLocaleTimeString(),
        isTimeMode: this.isTimeMode,
        dataLength: this.chartData1_time.length,
        chartInitialized: !!this.myChart
      });
      
      // 仅保留窗口期内的数据
      const minTs = now - this.timeWindowSec * 1000;
      this.chartData1_time = this.chartData1_time.filter(p => p[0] >= minTs);
      
      // 强制重新渲染
      if (this.myChart) {
        this.scheduleRender(this.xAxis_min, this.xAxis_max);
      } else {
        console.warn('Chart-Focus: myChart not initialized yet');
      }
    },
    // 开启/关闭时间轴模式
    setTimeMode(flag) {
      const enable = !!flag;
      if (enable === this.isTimeMode) return;
      this.isTimeMode = enable;
      this.updateTickerByVisibility();
      if (this.myChart) { this.myChart.clear(); }
      this.scheduleRender(this.xAxis_min, this.xAxis_max);
    },
    stopTimeTicker() {
      if (this.timeTicker) {
        clearInterval(this.timeTicker);
        this.timeTicker = null;
      }
    },
    startTimeTicker() {
      if (this.timeTicker) return;
      this.timeTicker = setInterval(() => {
        // 没有新点时也推动时间轴前进
        if (this.myChart) {
          this.scheduleRender(this.xAxis_min, this.xAxis_max);
        }
      }, 1000);
    },
    updateTickerByVisibility() {
      const docVisible = typeof document !== 'undefined' ? !document.hidden : true;
      const shouldRun = this.isTimeMode && this.isVisible && docVisible;
      if (shouldRun) this.startTimeTicker(); else this.stopTimeTicker();
    },
    addData_Point(x,y) {
      const newDataPoint = [x, y];
      const existingPointIndex = this.chartData1_pos.findIndex(point => point[0] === newDataPoint[0]);
      if (existingPointIndex !== -1) {
        // If the x value already exists, update the y value
        if (newDataPoint[1] == 0 || newDataPoint[1] == this.chartData1_pos[existingPointIndex][1]) return;
        this.chartData1_pos[existingPointIndex] = newDataPoint;
      } else {
        // If the x value does not exist, add the new data point
        this.chartData1_pos.push(newDataPoint);
      }
      this.scheduleRender(this.xAxis_min, this.xAxis_max);
    },
    // 绘制折线/二次曲线
    addLineData_Point(dataOrA, b, c) {
      // 兼容：如果传入的是点数组，直接使用
      if (Array.isArray(dataOrA)) {
        this.lineDataFromPoints = dataOrA;
        this.quadraticParams = null;
        this.scheduleRender(this.xAxis_min, this.xAxis_max);
        return;
      }

      // 若传入的是系数对象 { a, b, c }
      if (dataOrA && typeof dataOrA === 'object' &&
          (typeof dataOrA.a === 'number' || typeof dataOrA.a === 'string') &&
          (typeof dataOrA.b === 'number' || typeof dataOrA.b === 'string') &&
          (typeof dataOrA.c === 'number' || typeof dataOrA.c === 'string')) {
        const aNum = typeof dataOrA.a === 'number' ? dataOrA.a : parseFloat(dataOrA.a);
        const bNum = typeof dataOrA.b === 'number' ? dataOrA.b : parseFloat(dataOrA.b);
        const cNum = typeof dataOrA.c === 'number' ? dataOrA.c : parseFloat(dataOrA.c);
        if (!isFinite(aNum) || !isFinite(bNum) || !isFinite(cNum)) {
          this.scheduleRender(this.xAxis_min, this.xAxis_max);
          return;
        }
        const centerX = typeof dataOrA.x0 === 'number' ? dataOrA.x0 : (typeof dataOrA.x0 === 'string' ? parseFloat(dataOrA.x0) : 0);
        this.quadraticParams = { a: aNum, b: bNum, c: cNum, x0: isFinite(centerX) ? centerX : 0 };
        this.lineDataFromPoints = null;
        this.scheduleRender(this.xAxis_min, this.xAxis_max);
        return;
      }

      // 或者以三个独立参数形式传入 a, b, c
      if ((typeof dataOrA === 'number' || typeof dataOrA === 'string') &&
          (typeof b === 'number' || typeof b === 'string') &&
          (typeof c === 'number' || typeof c === 'string')) {
        const aNum = typeof dataOrA === 'number' ? dataOrA : parseFloat(dataOrA);
        const bNum = typeof b === 'number' ? b : parseFloat(b);
        const cNum = typeof c === 'number' ? c : parseFloat(c);
        if (!isFinite(aNum) || !isFinite(bNum) || !isFinite(cNum)) {
          this.scheduleRender(this.xAxis_min, this.xAxis_max);
          return;
        }
        this.quadraticParams = { a: aNum, b: bNum, c: cNum };
        this.lineDataFromPoints = null;
        this.scheduleRender(this.xAxis_min, this.xAxis_max);
        return;
      }

      // 其他非法输入：不处理，仅刷新现状
      this.scheduleRender(this.xAxis_min, this.xAxis_max);
    },
    // 生成一元二次曲线采样点
    generateQuadraticData(a, b, c, xMin, xMax, centerX = 0) {
      const start = Number.isFinite(xMin) ? xMin : 0;
      const end = Number.isFinite(xMax) ? xMax : 100;
      const span = end - start;
      const samples = Math.max(2, Math.min(400, Math.ceil(span / 50))); // 根据范围自适应采样密度
      const step = span / samples || 1;
      const data = [];
      for (let x = start; x <= end; x += step) {
        const t = x - centerX;
        const y = a * t * t + b * t + c;
        data.push([x, y]);
      }
      // 确保包含尾点
      if (data.length === 0 || data[data.length - 1][0] < end) {
        const tEnd = end - centerX;
        const yEnd = a * tEnd * tEnd + b * tEnd + c;
        data.push([end, yEnd]);
      }
      return data;
    },
    addMinPointData_Point(x,y) {
      const newDataPoint = [x, y];
      this.chartData3.push(newDataPoint);
      this.scheduleRender(this.xAxis_min, this.xAxis_max);
    },
    // 更改显示的x轴范围
    changeRange_x(current, target) {
      this.xAxis_min = Number(current) - 3000;
      this.xAxis_max = Number(current) + 3000;
      this.currentX = current;
      console.log("QHYCCD | changeRange_x:", current, this.xAxis_min, this.xAxis_max);
      this.scheduleRender(this.xAxis_min, this.xAxis_max);
    },

    // 清除数据
    clearChartData1() {
      this.chartData1_pos = [];
      this.chartData1_time = [];
      this.scheduleRender(this.xAxis_min, this.xAxis_max);
    },
    clearChartData2() {
      this.chartData2 = [];
      this.scheduleRender(this.xAxis_min, this.xAxis_max);
    },
    ClearAllData() {
      this.chartData1_pos = [];
      this.chartData1_time = [];
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
