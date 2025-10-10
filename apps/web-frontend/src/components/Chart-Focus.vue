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
    
    <!-- 对焦结果状态框 -->
    <div class="focus-result-panel" v-if="quadraticResult.show">
      <div class="panel-header">
        <div class="header-left">
          <div class="status-icon" :class="{ 'success': !isHorizontalFit(), 'warning': isHorizontalFit() }">
            <i v-if="!isHorizontalFit()" class="icon-check">✓</i>
            <i v-else class="icon-warning">⚠</i>
          </div>
          <div class="panel-title">对焦状态</div>
        </div>
        <div class="close-button" @click="closePanel">
          <i class="icon-close">×</i>
        </div>
      </div>
      <div class="panel-content">
        <div class="status-row">
          <span class="label">最佳位置</span>
          <span class="value" :class="{ 'error': isHorizontalFit() }">{{ getBestPositionDisplay() }}</span>
        </div>
        <div class="status-row">
          <span class="label">最小HFR</span>
          <span class="value">{{ quadraticResult.minHFR }}</span>
        </div>
        <div class="status-row">
          <span class="label">数据点数</span>
          <span class="value">{{ validDataPointCount }}</span>
        </div>
      </div>
    </div>
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
      chartData4: [], // 异常点数据
      xAxis_min: 0,
      xAxis_max: 6000,
      yAxis_min: 0,
      yAxis_max: 30,
      range: 4,
      currentX: 0,
      HFRMax: 0,
      isDragging: false,
      startX: 0,
      deltaX: 0,
      x_min: -60000,
      x_max: 60000,
      quadraticResult: {
        show: false,
        a: 0,
        b: 0,
        c: 0,
        bestPosition: 0,
        minHFR: 0
      },
      logger: null // 统一日志记录器
    };
  },
  computed: {
    validDataPointCount() {
      // 过滤掉异常数据点（位置为0或负数，HFR为0或负数）
      return this.chartData1.filter(point => 
        point[0] > 0 && point[1] > 0
      ).length;
    },
    
    // 获取清理后的数据点（去除异常点）
    cleanDataPoints() {
      return this.unifiedOutlierDetection(this.chartData1);
    },
    
    // 获取异常点数据
    outlierDataPoints() {
      const cleanData = this.unifiedOutlierDetection(this.chartData1);
      return this.chartData1.filter(point => 
        !cleanData.some(cleanPoint => 
          cleanPoint[0] === point[0] && cleanPoint[1] === point[1]
        )
      );
    }
  },
  mounted() {
    // 初始化logger
    this.initLogger();
    
    // 在开发环境下运行测试
    if (process.env.NODE_ENV === 'development') {
      // 延迟执行测试，确保组件完全初始化
      setTimeout(() => {
        this.logger.info('Chart-Focus.vue | 开发环境：运行二次曲线拟合测试');
        this.testQuadraticFitting();
      }, 1000);
    }
  },
  created() {
    this.$bus.$on('FocusPosition', this.changeRange_x);
    // this.$bus.$on('UpdateHFR', this.UpdateHFR);
    this.$bus.$on('fitQuadraticCurve', this.fitQuadraticCurve);
    this.$bus.$on('fitQuadraticCurve_minPoint', this.fitQuadraticCurve_minPoint);

    this.$bus.$on('ClearfitQuadraticCurve', this.clearChartData2);
    this.$bus.$on('ClearAllData', this.ClearAllData);
    this.$bus.$on('ClearFineData', this.ClearFineData);
    this.$bus.$on('updateFocusChartWidth', this.initChart);
    this.$bus.$on('addData_Point', this.addData_Point);
    this.$bus.$on('addMinPointData_Point', this.addMinPointData_Point);
    this.$bus.$on('addLineData_Point', this.addLineData_Point);
    this.$bus.$on('setFocusChartRange', this.setFocusChartRange);
  },
  methods: {
    // 初始化logger
    initLogger() {
      this.logger = {
        info: (message, ...args) => {
          console.log(`[INFO] ${message}`, ...args);
        },
        warn: (message, ...args) => {
          console.warn(`[WARN] ${message}`, ...args);
        },
        error: (message, ...args) => {
          console.error(`[ERROR] ${message}`, ...args);
        },
        debug: (message, ...args) => {
          if (process.env.NODE_ENV === 'development') {
            console.debug(`[DEBUG] ${message}`, ...args);
          }
        }
      };
    },
    
    // 验证拟合系数的有效性
    validateFitCoefficients(a, b, c) {
      // 检查是否为有效数值
      if (!isFinite(a) || !isFinite(b) || !isFinite(c)) {
        this.logger.warn('拟合系数包含无效值 (NaN/Infinity)');
        return false;
      }
      
      // 检查是否为水平线拟合
      if (Math.abs(a) < 1e-6 && Math.abs(b) < 1e-6) {
        this.logger.warn('检测到水平线拟合 (a≈0, b≈0)');
        return false;
      }
      
      // 检查二次项系数是否过小
      if (Math.abs(a) < 1e-10) {
        this.logger.warn('二次项系数过小，可能是直线拟合');
        return false;
      }
      
      return true;
    },
    
    // 统一的前后端异常点检测算法
    // 与后端C++算法保持一致
    unifiedOutlierDetection(dataPoints) {
      if (dataPoints.length < 4) {
        return dataPoints;
      }
      
      this.logger.info('Chart-Focus.vue | 开始统一异常点检测，数据点数量:', dataPoints.length);
      
      // 第一步：基于HFR统计分布的IQR方法（与后端一致）
      const cleanData = this.removeOutliersByIQR(dataPoints);
      
      // 第二步：如果数据点仍然足够，进行二次拟合残差分析
      if (cleanData.length >= 4) {
        const residualCleanData = this.removeOutliersByResidual(cleanData);
        
        // 选择保留更多数据点的方法
        if (residualCleanData.length >= 3) {
          this.logger.info('Chart-Focus.vue | 使用残差分析方法，保留', residualCleanData.length, '个数据点');
          return residualCleanData;
        }
      }
      
      this.logger.info('Chart-Focus.vue | 使用IQR方法，保留', cleanData.length, '个数据点');
      return cleanData;
    },
    
    // 验证前后端拟合结果一致性
    validateFitConsistency(backendCoefficients, frontendCoefficients) {
      const tolerance = 1e-6; // 允许的误差范围
      
      const aDiff = Math.abs(backendCoefficients.a - frontendCoefficients.a);
      const bDiff = Math.abs(backendCoefficients.b - frontendCoefficients.b);
      const cDiff = Math.abs(backendCoefficients.c - frontendCoefficients.c);
      
      this.logger.info('Chart-Focus.vue | 拟合系数对比:', {
        backend: backendCoefficients,
        frontend: frontendCoefficients,
        differences: { a: aDiff, b: bDiff, c: cDiff }
      });
      
      const isConsistent = aDiff < tolerance && bDiff < tolerance && cDiff < tolerance;
      
      if (isConsistent) {
        this.logger.info('Chart-Focus.vue | 前后端拟合结果一致');
      } else {
        this.logger.warn('Chart-Focus.vue | 前后端拟合结果不一致，可能存在算法差异');
      }
      
      return isConsistent;
    },
    
    // 关闭面板
    closePanel() {
      this.quadraticResult.show = false;
    },
    
    // 检查是否为水平线拟合
    isHorizontalFit() {
      const a = parseFloat(this.quadraticResult.a);
      const b = parseFloat(this.quadraticResult.b);
      return Math.abs(a) < 1e-6 && Math.abs(b) < 1e-6;
    },
    
    // 获取最佳位置显示文本
    getBestPositionDisplay() {
      // 检查是否为水平线拟合（a和b都接近0）
      const a = parseFloat(this.quadraticResult.a);
      const b = parseFloat(this.quadraticResult.b);
      
      this.logger.debug('Chart-Focus.vue | 检查最佳位置显示:', { a, b, bestPosition: this.quadraticResult.bestPosition });
      
      // 如果a和b都接近0，说明是水平线，没有最佳位置
      if (this.isHorizontalFit()) {
        this.logger.warn('Chart-Focus.vue | 检测到水平线拟合，显示"未找到最佳位置"');
        return "未找到最佳位置";
      }
      
      // 否则显示具体的最佳位置数值
      return this.quadraticResult.bestPosition;
    },
    
    initChart(Width) {
      this.containerMaxWidth = Width - 95;
      const chartDom = this.$refs.linechart;
      chartDom.style.width = this.containerMaxWidth + 'px';
      this.myChart = echarts.init(chartDom);
      this.renderChart(this.xAxis_min, this.xAxis_max);
    },
    startDrag(event) {
      this.isDragging = true;
      // 兼容鼠标事件和触摸事件
      if (event.touches && event.touches.length > 0) {
        this.startX = event.touches[0].clientX;
      } else {
        this.startX = event.clientX;
      }
    },
    dragging(event) {
      if (this.isDragging) {
        // 兼容鼠标事件和触摸事件
        let clientX;
        if (event.touches && event.touches.length > 0) {
          clientX = event.touches[0].clientX;
        } else {
          clientX = event.clientX;
        }
        
        this.deltaX = (clientX - this.startX) * 10;
        this.startX = clientX;
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
      // 计算Y轴最大值，包括所有数据
      let allYValues = [];
      if (this.chartData1.length > 0) allYValues = allYValues.concat(this.chartData1.map(item => item[1]));
      if (this.chartData2.length > 0) allYValues = allYValues.concat(this.chartData2.map(item => item[1]));
      if (this.chartData3.length > 0) allYValues = allYValues.concat(this.chartData3.map(item => item[1]));
      if (this.chartData4.length > 0) allYValues = allYValues.concat(this.chartData4.map(item => item[1]));
      
      const y_max = allYValues.length > 0 ? Math.max(...allYValues) * 1.2 : this.yAxis_max;
      const y_min = allYValues.length > 0 ? Math.min(...allYValues) * 0.8 : this.yAxis_min;
      
      this.logger.debug('Chart-Focus.vue | 渲染图表:', {
        lowerBound, upperBound, y_min, y_max,
        data1: this.chartData1.length,
        data2: this.chartData2.length,
        data3: this.chartData3.length
      });
      
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
            name: 'HFR',
            type: 'scatter',
            data: this.chartData1,
            itemStyle: {
              color: 'red',
              borderColor: 'white',
              borderWidth: 1
            },
            symbolSize: 8
          },
          {
            name: 'QuadraticCurve',
            type: 'line',
            data: this.chartData2,
            itemStyle: {
              color: 'yellow'
            },
            lineStyle: {
              width: 3,
              type: 'solid'
            },
            symbolSize: 0,
            smooth: false
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
          },
          {
            name: 'Outliers',
            type: 'scatter',
            data: this.chartData4,
            itemStyle: {
              color: 'rgba(255, 0, 255, 0.8)',
              borderColor: 'white',
              borderWidth: 2
            },
            symbolSize: 12,
            symbol: 'diamond'
          }
        ]
      };
      this.myChart.setOption(option);
    },
    addData_Point(x,y) {
      this.logger.info('Chart-Focus.vue | 添加数据点:', { x, y });
      
      // 过滤HFR大于等于100的数据点
      if (y >= 100) {
        this.logger.warn('Chart-Focus.vue | HFR值过大(>=100)，忽略此数据点:', { x, y });
        return;
      }
      
      const newDataPoint = [x, y];
      const existingPointIndex = this.chartData1.findIndex(point => point[0] === newDataPoint[0]);
      if (existingPointIndex !== -1) {
        // If the x value already exists, update the y value
        if (newDataPoint[1] == 0 || newDataPoint[1] == this.chartData1[existingPointIndex][1]) {
          this.logger.debug('Chart-Focus.vue | 跳过重复数据点:', newDataPoint);
          return;
        }
        this.chartData1[existingPointIndex] = newDataPoint;
        this.logger.info('Chart-Focus.vue | 更新现有数据点:', newDataPoint);
      } else {
        // If the x value does not exist, add the new data point
        this.chartData1.push(newDataPoint);
        this.logger.info('Chart-Focus.vue | 添加新数据点:', newDataPoint);
      }
      
      this.logger.debug('Chart-Focus.vue | 当前数据点总数:', this.chartData1.length);
      this.logger.debug('Chart-Focus.vue | 所有数据点:', this.chartData1);
      
      // 更新异常点数据
      this.updateOutlierData();
      
      // 如果已经有拟合结果，重新生成曲线
      if (this.quadraticResult.show) {
        const a = parseFloat(this.quadraticResult.a);
        const b = parseFloat(this.quadraticResult.b);
        const c = parseFloat(this.quadraticResult.c);
        const bestPosition = parseFloat(this.quadraticResult.bestPosition);
        
        if (Math.abs(a) < 1e-10) {
          // 线性拟合
          this.logger.info('Chart-Focus.vue | 数据点更新，重新生成线性拟合曲线');
          this.generateLinearCurve(b, c, bestPosition);
        } else {
          // 二次拟合
          this.logger.info('Chart-Focus.vue | 数据点更新，重新生成二次拟合曲线');
          this.generateQuadraticCurve(a, b, c, bestPosition);
        }
      } else {
        this.renderChart(this.xAxis_min, this.xAxis_max);
      }
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
      const newCurrentX = Number(current);
      
      // 只有当位置真正发生变化时才更新
      if (Math.abs(newCurrentX - this.currentX) > 1) {
        this.currentX = newCurrentX;
        
        // 检查是否需要调整X轴范围
        const newXAxisMin = newCurrentX - 3000;
        const newXAxisMax = newCurrentX + 3000;
        
        // 只有当新位置超出当前显示范围时才调整X轴范围
        if (newCurrentX < this.xAxis_min + 1000 || newCurrentX > this.xAxis_max - 1000) {
          this.xAxis_min = newXAxisMin;
          this.xAxis_max = newXAxisMax;
          this.logger.debug("Chart-Focus.vue | 调整X轴范围:", newCurrentX, this.xAxis_min, this.xAxis_max);
          this.renderChart(this.xAxis_min, this.xAxis_max);
        } else {
          // 只更新绿色线位置，不重新渲染整个图表
          this.updateCurrentPositionLine();
        }
      }
    },
    
    // 只更新当前绿色位置线，不重新渲染整个图表
    updateCurrentPositionLine() {
      if (this.myChart) {
        // 计算Y轴最大值
        let allYValues = [];
        if (this.chartData1.length > 0) allYValues = allYValues.concat(this.chartData1.map(item => item[1]));
        if (this.chartData2.length > 0) allYValues = allYValues.concat(this.chartData2.map(item => item[1]));
        if (this.chartData3.length > 0) allYValues = allYValues.concat(this.chartData3.map(item => item[1]));
        
        const y_max = allYValues.length > 0 ? Math.max(...allYValues) * 1.2 : this.yAxis_max;
        const y_min = allYValues.length > 0 ? Math.min(...allYValues) * 0.8 : this.yAxis_min;
        
        // 只更新currentPosition系列
        this.myChart.setOption({
          series: [{
            name: 'currentPosition',
            type: 'line',
            data: [
              [this.currentX, y_min],
              [this.currentX, y_max]
            ],
            lineStyle: {
              color: 'green',
              width: 1
            },
            symbol: 'none'
          }]
        }, false); // false表示不重新渲染，只更新数据
      }
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
      // 清空所有数据，包括精调数据点
      this.chartData1 = [];
      this.chartData2 = [];
      this.chartData3 = [];
      this.chartData4 = [];
      this.quadraticResult.show = false;
      this.yAxis_max = 30;
      this.HFRMax = 15;
      this.renderChart(this.xAxis_min, this.xAxis_max);
    },
    
    // 清空精调数据（在精调开始时调用）
    ClearFineData() {
      this.logger.info('Chart-Focus.vue | 清空精调数据');
      this.chartData1 = [];
      this.chartData2 = [];
      this.chartData3 = [];
      this.chartData4 = [];
      this.quadraticResult.show = false;
      this.renderChart(this.xAxis_min, this.xAxis_max);
    },
    
    // 更新异常点数据
    updateOutlierData() {
      if (this.chartData1.length >= 4) {
        this.chartData4 = this.outlierDataPoints;
        this.logger.debug('Chart-Focus.vue | 更新异常点数据，异常点数量:', this.chartData4.length);
      } else {
        this.chartData4 = [];
      }
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
    // 更新HFR
    // UpdateHFR(HFR) {
    //   const newDataPoint = [this.currentX, HFR];
    //   this.addData_Point(newDataPoint);
    //   // console.log("QHYCCD | UpdateHFR:", newDataPoint);
    //   // this.$bus.$emit('SendConsoleLogMsg', 'UpdateHFR:' + newDataPoint, 'info');
    //   this.renderChart(this.xAxis_min, this.xAxis_max);
    // },
    // 拟合二次曲线
    fitQuadraticCurve(dataString) {
      this.logger.info('Chart-Focus.vue | 接收二次曲线数据:', dataString);
      console.log('Chart-Focus.vue | 接收二次曲线数据:', dataString);
      
      const parts = dataString.split(':');
      this.logger.info('Chart-Focus.vue | 解析后的数据部分:', parts);
      console.log('Chart-Focus.vue | 解析后的数据部分:', parts);
      
      if (parts.length >= 6) {
        const a = parseFloat(parts[1]);
        const b = parseFloat(parts[2]);
        const c = parseFloat(parts[3]);
        const bestPosition = parseFloat(parts[4]);
        const minHFR = parseFloat(parts[5]);
        
        this.logger.info('Chart-Focus.vue | 解析的数值:', { a, b, c, bestPosition, minHFR });
        console.log('Chart-Focus.vue | 解析的数值:', { a, b, c, bestPosition, minHFR });
        console.log('Chart-Focus.vue | 原始字符串部分:', parts);
        
        // 验证拟合系数的有效性
        if (!this.validateFitCoefficients(a, b, c)) {
          this.logger.warn('Chart-Focus.vue | 拟合系数无效，可能是水平线拟合');
        }
        
        // 不再进行前端拟合计算，完全依赖后端提供的参数
        this.logger.info('Chart-Focus.vue | 使用后端提供的拟合参数，不再进行前端拟合计算');
        console.log('Chart-Focus.vue | 使用后端提供的拟合参数，不再进行前端拟合计算');
        
        // 验证参数是否合理
        if (Math.abs(a) < 1e-10) {
          this.logger.warn('Chart-Focus.vue | 警告：a系数接近0，这是线性拟合而不是二次拟合');
          console.warn('Chart-Focus.vue | 警告：a系数接近0，这是线性拟合而不是二次拟合');
          
          // 对于线性拟合，我们需要特殊处理
          this.generateLinearCurve(b, c, bestPosition);
          
          // 更新文本框显示（线性拟合）
          this.quadraticResult.a = "0.000000"; // 显示为0
          this.quadraticResult.b = b.toFixed(6);
          this.quadraticResult.c = c.toFixed(6);
          this.quadraticResult.bestPosition = "线性拟合";
          this.quadraticResult.minHFR = minHFR.toFixed(3);
          this.quadraticResult.show = true;
          
          return; // 直接返回，不执行二次曲线生成
        }
        
        // 更新文本框显示
        this.quadraticResult.a = a.toFixed(6);
        this.quadraticResult.b = b.toFixed(6);
        this.quadraticResult.c = c.toFixed(6);
        this.quadraticResult.bestPosition = bestPosition.toFixed(2);
        this.quadraticResult.minHFR = minHFR.toFixed(3);
        this.quadraticResult.show = true;
        
        this.logger.info('Chart-Focus.vue | 文本框数据已更新:', this.quadraticResult);
        
        // 生成二次曲线数据点
        this.generateQuadraticCurve(a, b, c, bestPosition);
        
        // 更新异常点数据
        this.updateOutlierData();
        
        this.logger.info('Chart-Focus.vue | 二次拟合信息已更新:', this.quadraticResult);
      } else {
        this.logger.error('Chart-Focus.vue | 数据格式错误，部分数量不足:', parts.length);
      }
    },
    
    // 生成二次曲线数据点
    generateQuadraticCurve(a, b, c, bestPosition) {
      this.logger.info('Chart-Focus.vue | 开始生成二次曲线数据点:', { a, b, c, bestPosition });
      
      // 修正：后端发送的a、b、c系数是基于相对坐标的
      // 需要找到数据点的最小位置作为偏移量，确保与后端算法一致
      
      // 从数据点中找到最小位置作为偏移量（修正：不使用bestPosition作为minPos）
      let minPos = 0;
      if (this.chartData1.length > 0) {
        minPos = Math.min(...this.chartData1.map(point => point[0]));
      }
      
      this.logger.debug('Chart-Focus.vue | 坐标系统信息:');
      this.logger.debug('Chart-Focus.vue | - 数据点最小位置 (minPos):', minPos);
      this.logger.debug('Chart-Focus.vue | - 后端发送的最佳位置 (bestPosition):', bestPosition);
      this.logger.debug('Chart-Focus.vue | - 拟合系数 a:', a, 'b:', b, 'c:', c);
      
      console.log('Chart-Focus.vue | 坐标系统信息:');
      console.log('Chart-Focus.vue | - 数据点最小位置 (minPos):', minPos);
      console.log('Chart-Focus.vue | - 后端发送的最佳位置 (bestPosition):', bestPosition);
      console.log('Chart-Focus.vue | - 拟合系数 a:', a, 'b:', b, 'c:', c);
      console.log('Chart-Focus.vue | - 当前数据点:', this.chartData1);
      
      // 验证最佳位置的计算是否正确
      const expectedBestRelativePos = -b / (2 * a);
      const expectedBestAbsolutePos = expectedBestRelativePos + minPos;
      this.logger.debug('Chart-Focus.vue | - 计算的最佳相对位置:', expectedBestRelativePos);
      this.logger.debug('Chart-Focus.vue | - 计算的最佳绝对位置:', expectedBestAbsolutePos);
      this.logger.debug('Chart-Focus.vue | - 位置差异:', Math.abs(expectedBestAbsolutePos - bestPosition));
      
      const curveData = [];
      
      // 智能确定曲线生成范围
      let startX, endX, stepSize;
      
      if (this.chartData1.length > 0) {
        // 基于数据点范围生成曲线
        const dataMinX = Math.min(...this.chartData1.map(point => point[0]));
        const dataMaxX = Math.max(...this.chartData1.map(point => point[0]));
        const dataRange = dataMaxX - dataMinX;
        
        // 扩展范围以确保曲线覆盖完整
        const extension = Math.max(dataRange * 0.2, 1000); // 扩展20%或至少1000
        startX = dataMinX - extension;
        endX = dataMaxX + extension;
        
        // 根据数据范围调整步长
        stepSize = Math.max(Math.floor(dataRange / 100), 20); // 至少100个点，步长至少20
      } else {
        // 如果没有数据点，使用默认范围
        const range = 5000;
        startX = bestPosition - range;
        endX = bestPosition + range;
        stepSize = 50;
      }
      
      // 确保曲线覆盖当前X轴范围
      startX = Math.min(startX, this.xAxis_min);
      endX = Math.max(endX, this.xAxis_max);
      
      this.logger.debug('Chart-Focus.vue | 曲线生成范围:', startX, '到', endX, '步长:', stepSize);
      
      // 生成曲线数据点
      for (let x = startX; x <= endX; x += stepSize) {
        // 将绝对坐标转换为相对坐标进行计算（与后端算法一致）
        const relativeX = x - minPos;
        const y = a * relativeX * relativeX + b * relativeX + c;
        
        // 验证计算结果
        if (isFinite(y) && y >= 0) {
          curveData.push([x, y]);
        } else {
          this.logger.warn('Chart-Focus.vue | 警告：计算得到无效的Y值:', y, '在位置:', x, '相对位置:', relativeX);
        }
      }
      
      // 添加关键点：确保数据点位置在曲线上有精确的点
      if (this.chartData1.length > 0) {
        for (const point of this.chartData1) {
          const x = point[0];
          const relativeX = x - minPos;
          const y = a * relativeX * relativeX + b * relativeX + c;
          
          if (isFinite(y) && y >= 0) {
            // 检查是否已经存在这个点（避免重复）
            const exists = curveData.some(curvePoint => Math.abs(curvePoint[0] - x) < stepSize / 2);
            if (!exists) {
              curveData.push([x, y]);
            }
          }
        }
        
        // 添加最佳位置点及其附近的高精度点
        const bestRelativeX = bestPosition - minPos;
        const bestY = a * bestRelativeX * bestRelativeX + b * bestRelativeX + c;
        if (isFinite(bestY) && bestY >= 0) {
          const exists = curveData.some(curvePoint => Math.abs(curvePoint[0] - bestPosition) < stepSize / 2);
          if (!exists) {
            curveData.push([bestPosition, bestY]);
          }
          
          // 在最佳位置附近添加更多高精度点
          const fineRange = Math.max(stepSize * 2, 200); // 在最佳位置附近200范围内使用高精度
          const fineStep = Math.max(stepSize / 10, 5);
          for (let offset = -fineRange; offset <= fineRange; offset += fineStep) {
            const x = bestPosition + offset;
            if (x >= startX && x <= endX) {
              const relativeX = x - minPos;
              const y = a * relativeX * relativeX + b * relativeX + c;
              if (isFinite(y) && y >= 0) {
                const exists = curveData.some(curvePoint => Math.abs(curvePoint[0] - x) < fineStep / 2);
                if (!exists) {
                  curveData.push([x, y]);
                }
              }
            }
          }
        }
      }
      
      // 按X坐标排序
      curveData.sort((a, b) => a[0] - b[0]);
      
      // 在数据点密集区域增加曲线密度
      if (this.chartData1.length > 0) {
        const enhancedCurveData = [];
        const fineStepSize = Math.max(stepSize / 5, 5); // 在密集区域使用更小的步长
        
        for (let i = 0; i < curveData.length - 1; i++) {
          const currentPoint = curveData[i];
          const nextPoint = curveData[i + 1];
          
          enhancedCurveData.push(currentPoint);
          
          // 检查当前段是否包含数据点
          const hasDataPoint = this.chartData1.some(point => 
            point[0] >= currentPoint[0] && point[0] <= nextPoint[0]
          );
          
          // 如果包含数据点，在中间添加更多点
          if (hasDataPoint && (nextPoint[0] - currentPoint[0]) > fineStepSize) {
            const midPoints = Math.floor((nextPoint[0] - currentPoint[0]) / fineStepSize);
            for (let j = 1; j < midPoints; j++) {
              const x = currentPoint[0] + (j * fineStepSize);
              const relativeX = x - minPos;
              const y = a * relativeX * relativeX + b * relativeX + c;
              if (isFinite(y) && y >= 0) {
                enhancedCurveData.push([x, y]);
              }
            }
          }
        }
        
        // 添加最后一个点
        if (curveData.length > 0) {
          enhancedCurveData.push(curveData[curveData.length - 1]);
        }
        
        // 更新曲线数据
        curveData.length = 0;
        curveData.push(...enhancedCurveData);
      }
      
      // 添加关键点的验证
      if (curveData.length > 0) {
        // 验证最佳位置点的Y值
        const bestPointY = a * (bestPosition - minPos) * (bestPosition - minPos) + b * (bestPosition - minPos) + c;
        this.logger.debug('Chart-Focus.vue | 最佳位置点验证:');
        this.logger.debug('Chart-Focus.vue | - 最佳位置:', bestPosition);
        this.logger.debug('Chart-Focus.vue | - 最佳位置相对坐标:', bestPosition - minPos);
        this.logger.debug('Chart-Focus.vue | - 最佳位置Y值:', bestPointY);
        
        // 验证数据点是否在曲线上
        this.logger.debug('Chart-Focus.vue | 数据点与曲线对比:');
        for (let i = 0; i < Math.min(this.chartData1.length, 5); i++) {
          const point = this.chartData1[i];
          const pointRelativeX = point[0] - minPos;
          const pointY = a * pointRelativeX * pointRelativeX + b * pointRelativeX + c;
          const actualY = point[1];
          const diff = Math.abs(pointY - actualY);
          this.logger.debug(`Chart-Focus.vue | - 点${i}: 位置=${point[0]}, 实际HFR=${actualY}, 曲线HFR=${pointY}, 差异=${diff}`);
        }
      }
      
      this.logger.debug('Chart-Focus.vue | 生成的曲线数据点数量:', curveData.length);
      this.logger.debug('Chart-Focus.vue | X轴范围:', startX, '到', endX);
      this.logger.debug('Chart-Focus.vue | 前5个数据点:', curveData.slice(0, 5));
      this.logger.debug('Chart-Focus.vue | 后5个数据点:', curveData.slice(-5));
      
      // 验证曲线形状
      if (curveData.length > 0) {
        const firstY = curveData[0][1];
        const lastY = curveData[curveData.length - 1][1];
        const middleIndex = Math.floor(curveData.length / 2);
        const middleY = curveData[middleIndex][1];
        
        this.logger.debug('Chart-Focus.vue | 曲线形状验证 - 起始Y:', firstY, '中间Y:', middleY, '结束Y:', lastY);
        
        // 检查是否为有效的二次曲线（应该有最小值或最大值）
        if (Math.abs(a) > 1e-10) {
          const vertexX = -b / (2 * a) + minPos; // 顶点X坐标（转换回绝对坐标）
          const vertexY = c - (b * b) / (4 * a); // 顶点Y坐标
          this.logger.debug('Chart-Focus.vue | 二次曲线顶点位置:', vertexX, 'Y值:', vertexY);
        }
      }
      
      // 最终验证和清理曲线数据
      const finalCurveData = curveData.filter(point => {
        const [x, y] = point;
        return isFinite(x) && isFinite(y) && y >= 0 && x >= startX && x <= endX;
      });
      
      // 确保曲线数据按X坐标排序
      finalCurveData.sort((a, b) => a[0] - b[0]);
      
      this.logger.debug('Chart-Focus.vue | 最终曲线数据验证:');
      this.logger.debug('Chart-Focus.vue | - 原始数据点数量:', curveData.length);
      this.logger.debug('Chart-Focus.vue | - 清理后数据点数量:', finalCurveData.length);
      this.logger.debug('Chart-Focus.vue | - X轴范围:', finalCurveData.length > 0 ? `${finalCurveData[0][0]} 到 ${finalCurveData[finalCurveData.length - 1][0]}` : '无数据');
      
      this.chartData2 = finalCurveData;
      this.logger.debug('Chart-Focus.vue | chartData2已更新，长度:', this.chartData2.length);
      
      // 调整X轴范围以显示完整曲线
      if (finalCurveData.length > 0) {
        this.xAxis_min = Math.min(this.xAxis_min, finalCurveData[0][0]);
        this.xAxis_max = Math.max(this.xAxis_max, finalCurveData[finalCurveData.length - 1][0]);
      }
      
      this.renderChart(this.xAxis_min, this.xAxis_max);
      
      this.logger.info('Chart-Focus.vue | 二次曲线数据点已生成并渲染完成');
    },
    
    // 生成线性曲线数据点（当a=0时）
    generateLinearCurve(b, c, bestPosition) {
      this.logger.info('Chart-Focus.vue | 开始生成线性曲线数据点:', { b, c, bestPosition });
      console.log('Chart-Focus.vue | 开始生成线性曲线数据点:', { b, c, bestPosition });
      
      // 对于线性拟合，我们需要找到数据点的最小位置作为偏移量
      let minPos = 0;
      if (this.chartData1.length > 0) {
        minPos = Math.min(...this.chartData1.map(point => point[0]));
      }
      
      this.logger.debug('Chart-Focus.vue | 线性拟合坐标系统信息:');
      this.logger.debug('Chart-Focus.vue | - 数据点最小位置 (minPos):', minPos);
      this.logger.debug('Chart-Focus.vue | - 线性系数 b:', b, 'c:', c);
      
      console.log('Chart-Focus.vue | 线性拟合坐标系统信息:');
      console.log('Chart-Focus.vue | - 数据点最小位置 (minPos):', minPos);
      console.log('Chart-Focus.vue | - 线性系数 b:', b, 'c:', c);
      
      const curveData = [];
      
      // 智能确定曲线生成范围
      let startX, endX, stepSize;
      
      if (this.chartData1.length > 0) {
        // 基于数据点范围生成曲线
        const dataMinX = Math.min(...this.chartData1.map(point => point[0]));
        const dataMaxX = Math.max(...this.chartData1.map(point => point[0]));
        const dataRange = dataMaxX - dataMinX;
        
        // 扩展范围以确保曲线覆盖完整
        const extension = Math.max(dataRange * 0.2, 1000);
        startX = dataMinX - extension;
        endX = dataMaxX + extension;
        
        // 根据数据范围调整步长
        stepSize = Math.max(Math.floor(dataRange / 100), 20);
      } else {
        // 如果没有数据点，使用默认范围
        const range = 5000;
        startX = bestPosition - range;
        endX = bestPosition + range;
        stepSize = 50;
      }
      
      // 确保曲线覆盖当前X轴范围
      startX = Math.min(startX, this.xAxis_min);
      endX = Math.max(endX, this.xAxis_max);
      
      this.logger.debug('Chart-Focus.vue | 线性曲线生成范围:', startX, '到', endX, '步长:', stepSize);
      
      // 生成线性曲线数据点
      for (let x = startX; x <= endX; x += stepSize) {
        // 将绝对坐标转换为相对坐标进行计算
        const relativeX = x - minPos;
        const y = b * relativeX + c; // 线性方程：y = bx + c
        
        // 验证计算结果
        if (isFinite(y) && y >= 0) {
          curveData.push([x, y]);
        } else {
          this.logger.warn('Chart-Focus.vue | 警告：计算得到无效的Y值:', y, '在位置:', x, '相对位置:', relativeX);
        }
      }
      
      // 添加关键点：确保数据点位置在曲线上有精确的点
      if (this.chartData1.length > 0) {
        for (const point of this.chartData1) {
          const x = point[0];
          const relativeX = x - minPos;
          const y = b * relativeX + c;
          
          if (isFinite(y) && y >= 0) {
            // 检查是否已经存在这个点（避免重复）
            const exists = curveData.some(curvePoint => Math.abs(curvePoint[0] - x) < stepSize / 2);
            if (!exists) {
              curveData.push([x, y]);
            }
          }
        }
      }
      
      // 按X坐标排序
      curveData.sort((a, b) => a[0] - b[0]);
      
      // 最终验证和清理曲线数据
      const finalCurveData = curveData.filter(point => {
        const [x, y] = point;
        return isFinite(x) && isFinite(y) && y >= 0 && x >= startX && x <= endX;
      });
      
      this.logger.debug('Chart-Focus.vue | 线性曲线最终数据验证:');
      this.logger.debug('Chart-Focus.vue | - 原始数据点数量:', curveData.length);
      this.logger.debug('Chart-Focus.vue | - 清理后数据点数量:', finalCurveData.length);
      
      this.chartData2 = finalCurveData;
      this.logger.debug('Chart-Focus.vue | chartData2已更新（线性拟合），长度:', this.chartData2.length);
      
      // 调整X轴范围以显示完整曲线
      if (finalCurveData.length > 0) {
        this.xAxis_min = Math.min(this.xAxis_min, finalCurveData[0][0]);
        this.xAxis_max = Math.max(this.xAxis_max, finalCurveData[finalCurveData.length - 1][0]);
      }
      
      this.renderChart(this.xAxis_min, this.xAxis_max);
      
      this.logger.info('Chart-Focus.vue | 线性曲线数据点已生成并渲染完成');
    },
    
    // 拟合二次曲线最小点
    fitQuadraticCurve_minPoint(dataString) {
      this.logger.info('Chart-Focus.vue | 接收最小点数据:', dataString);
      
      const parts = dataString.split(':');
      if (parts.length >= 3) {
        const bestPosition = parseFloat(parts[1]);
        const minHFR = parseFloat(parts[2]);
        
        // 更新文本框显示
        this.quadraticResult.bestPosition = bestPosition.toFixed(2);
        this.quadraticResult.minHFR = minHFR.toFixed(3);
        this.quadraticResult.show = true;
        
        // 添加最小点到图表
        this.chartData3 = [];
        this.chartData3.push([bestPosition, minHFR]);
        this.renderChart(this.xAxis_min, this.xAxis_max);
        
        this.logger.info('Chart-Focus.vue | 最小点信息已更新:', { bestPosition, minHFR });
      }
    },
    setFocusChartRange(lowerBound, upperBound) {
      this.x_min = lowerBound;
      this.x_max = upperBound;
    },
    
    // ==================== 异常点检测方法 ====================
    
    /**
     * 智能异常点检测
     * 使用多种方法检测并去除异常点
     */
    removeOutliers(dataPoints) {
      if (dataPoints.length < 4) {
        return dataPoints; // 数据点太少，不进行异常值检测
      }
      
      this.logger.info('Chart-Focus.vue | 开始智能异常值检测，原始数据点数量:', dataPoints.length);
      
      // 方法1：基于二次曲线拟合的残差分析
      const cleanData1 = this.removeOutliersByResidual(dataPoints);
      
      // 方法2：基于HFR统计分布的IQR方法
      const cleanData2 = this.removeOutliersByIQR(dataPoints);
      
      // 方法3：基于位置分布的异常检测
      const cleanData3 = this.removeOutliersByPosition(dataPoints);
      
      // 选择保留最多数据点的方法，但确保至少有3个数据点
      let bestCleanData = cleanData1;
      if (cleanData2.length > bestCleanData.length && cleanData2.length >= 3) {
        bestCleanData = cleanData2;
      }
      if (cleanData3.length > bestCleanData.length && cleanData3.length >= 3) {
        bestCleanData = cleanData3;
      }
      
      // 如果所有方法都过滤得太严格，使用最宽松的方法
      if (bestCleanData.length < 3) {
        this.logger.warn('Chart-Focus.vue | 所有异常值检测方法都过于严格，使用最宽松的方法');
        bestCleanData = cleanData2; // IQR方法相对宽松
        if (bestCleanData.length < 3) {
          bestCleanData = dataPoints; // 如果还是不够，返回原始数据
        }
      }
      
      this.logger.info('Chart-Focus.vue | 智能异常值检测完成: 原始数据', dataPoints.length, '个点，清理后', bestCleanData.length, '个点');
      
      return bestCleanData;
    },
    
    /**
     * 基于二次曲线拟合残差的异常值检测
     * 注意：现在主要依赖后端拟合结果，此方法仅作为备用
     */
    removeOutliersByResidual(dataPoints) {
      if (dataPoints.length < 4) {
        return dataPoints; // 需要至少4个点才能进行二次拟合
      }
      
      // 简化异常值检测：直接使用IQR方法，不再进行二次拟合
      const preliminaryClean = this.removeOutliersByIQR(dataPoints);
      if (preliminaryClean.length < 3) {
        return dataPoints;
      }
      
      // 不再进行前端拟合，直接返回IQR清理后的数据
      this.logger.info('Chart-Focus.vue | 异常值检测：使用IQR方法，不再进行前端拟合');
      return preliminaryClean;
    },
    
    /**
     * 基于HFR统计分布的IQR异常值检测
     */
    removeOutliersByIQR(dataPoints) {
      // 计算HFR的统计信息
      const hfrValues = dataPoints.map(point => point[1]);
      
      // 排序
      const sortedHfrValues = [...hfrValues].sort((a, b) => a - b);
      
      // 计算四分位数
      const n = sortedHfrValues.length;
      const q1 = sortedHfrValues[Math.floor(n / 4)];
      const q3 = sortedHfrValues[Math.floor(3 * n / 4)];
      const iqr = q3 - q1;
      
      // 定义异常值边界（使用2倍IQR，比1.5倍更宽松）
      const lowerBound = q1 - 2.0 * iqr;
      const upperBound = q3 + 2.0 * iqr;
      
      // 过滤异常值
      const cleanData = dataPoints.filter(point => 
        point[1] >= lowerBound && point[1] <= upperBound
      );
      
      this.logger.info('Chart-Focus.vue | 基于IQR的异常值检测: 原始数据', dataPoints.length, '个点，清理后', cleanData.length, '个点');
      
      return cleanData;
    },
    
    /**
     * 基于位置分布的异常值检测
     */
    removeOutliersByPosition(dataPoints) {
      if (dataPoints.length < 4) {
        return dataPoints;
      }
      
      // 按位置排序
      const sortedData = [...dataPoints].sort((a, b) => a[0] - b[0]);
      
      // 计算相邻点之间的距离
      const distances = [];
      for (let i = 1; i < sortedData.length; i++) {
        const dist = sortedData[i][0] - sortedData[i-1][0];
        distances.push(dist);
      }
      
      // 计算距离的统计信息
      const sortedDistances = [...distances].sort((a, b) => a - b);
      const n = sortedDistances.length;
      const medianDistance = sortedDistances[Math.floor(n / 2)];
      const q3 = sortedDistances[Math.floor(3 * n / 4)];
      const threshold = q3 + 1.5 * (q3 - medianDistance);
      
      // 识别位置异常的点
      const cleanData = [];
      cleanData.push(sortedData[0]); // 第一个点总是保留
      
      for (let i = 1; i < sortedData.length; i++) {
        const dist = sortedData[i][0] - sortedData[i-1][0];
        if (dist <= threshold) {
          cleanData.push(sortedData[i]);
        } else {
          // 检查是否是孤立点（前后距离都很大）
          let isIsolated = true;
          if (i > 1) {
            const prevDist = sortedData[i-1][0] - sortedData[i-2][0];
            if (prevDist <= threshold) isIsolated = false;
          }
          if (i < sortedData.length - 1) {
            const nextDist = sortedData[i+1][0] - sortedData[i][0];
            if (nextDist <= threshold) isIsolated = false;
          }
          
          if (!isIsolated) {
            cleanData.push(sortedData[i]);
          }
        }
      }
      
      this.logger.info('Chart-Focus.vue | 基于位置的异常值检测: 原始数据', dataPoints.length, '个点，清理后', cleanData.length, '个点');
      
      return cleanData;
    },
    
    /**
     * 执行二次曲线拟合
     * 注意：现在主要依赖后端拟合结果，此方法仅用于测试和调试
     * 返回拟合系数 {a, b, c}
     */
    performQuadraticFit(dataPoints) {
      if (dataPoints.length < 3) {
        return null;
      }
      
      this.logger.info('Chart-Focus.vue | 开始二次曲线拟合，数据点数量:', dataPoints.length);
      
      // 标准化坐标：将位置转换为相对坐标
      const minPos = Math.min(...dataPoints.map(point => point[0]));
      this.logger.debug('Chart-Focus.vue | 最小位置 (偏移量):', minPos);
      
      // 构建最小二乘法正规方程组
      let sum_x4 = 0, sum_x3 = 0, sum_x2 = 0, sum_x = 0, sum_1 = 0;
      let sum_x2y = 0, sum_xy = 0, sum_y = 0;
      
      for (const point of dataPoints) {
        const x = point[0] - minPos; // 相对坐标
        const y = point[1];
        
        const x2 = x * x;
        const x3 = x2 * x;
        const x4 = x3 * x;
        
        sum_x4 += x4;
        sum_x3 += x3;
        sum_x2 += x2;
        sum_x += x;
        sum_1 += 1;
        
        sum_x2y += x2 * y;
        sum_xy += x * y;
        sum_y += y;
      }
      
      this.logger.debug('Chart-Focus.vue | 拟合统计量:', {
        sum_x4, sum_x3, sum_x2, sum_x, sum_1,
        sum_x2y, sum_xy, sum_y
      });
      
      // 构建系数矩阵和常数向量
      const matrix = [
        [sum_x4, sum_x3, sum_x2],
        [sum_x3, sum_x2, sum_x],
        [sum_x2, sum_x, sum_1]
      ];
      
      const constants = [sum_x2y, sum_xy, sum_y];
      
      this.logger.debug('Chart-Focus.vue | 系数矩阵:', matrix);
      this.logger.debug('Chart-Focus.vue | 常数向量:', constants);
      
      // 求解线性方程组（使用高斯消元法）
      const coefficients = this.solveLinearSystem(matrix, constants);
      if (!coefficients) {
        this.logger.error('Chart-Focus.vue | 线性方程组求解失败');
        return null;
      }
      
      const result = {
        a: coefficients[0],
        b: coefficients[1],
        c: coefficients[2]
      };
      
      this.logger.info('Chart-Focus.vue | 拟合系数:', result);
      
      // 验证拟合结果
      if (!isFinite(result.a) || !isFinite(result.b) || !isFinite(result.c)) {
        this.logger.error('Chart-Focus.vue | 拟合系数包含无效值');
        return null;
      }
      
      // 检查是否为有效的二次曲线（a不为0）
      if (Math.abs(result.a) < 1e-10) {
        this.logger.warn('Chart-Focus.vue | 警告：二次项系数接近0，可能是直线拟合');
      }
      
      return result;
    },
    
    /**
     * 求解3x3线性方程组
     */
    solveLinearSystem(matrix, constants) {
      // 高斯消元法求解线性方程组
      const augmented = [];
      
      // 构建增广矩阵
      for (let i = 0; i < 3; i++) {
        augmented[i] = [...matrix[i], constants[i]];
      }
      
      // 前向消元
      for (let i = 0; i < 3; i++) {
        // 寻找主元
        let maxRow = i;
        for (let k = i + 1; k < 3; k++) {
          if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
            maxRow = k;
          }
        }
        
        // 交换行
        if (maxRow !== i) {
          [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];
        }
        
        // 检查主元是否为零
        if (Math.abs(augmented[i][i]) < 1e-10) {
          this.logger.error('Chart-Focus.vue | 线性方程组奇异，无法求解');
          return null;
        }
        
        // 消元
        for (let k = i + 1; k < 3; k++) {
          const factor = augmented[k][i] / augmented[i][i];
          for (let j = i; j < 4; j++) {
            augmented[k][j] -= factor * augmented[i][j];
          }
        }
      }
      
      // 回代求解
      const solution = [0, 0, 0];
      for (let i = 2; i >= 0; i--) {
        solution[i] = augmented[i][3];
        for (let j = i + 1; j < 3; j++) {
          solution[i] -= augmented[i][j] * solution[j];
        }
        solution[i] /= augmented[i][i];
      }
      
      return solution;
    },
    
    // ==================== 测试和调试方法 ====================
    
    /**
     * 测试后端数据接收功能
     * 模拟后端发送的拟合数据来测试前端处理
     */
    testBackendDataReception() {
      this.logger.info('Chart-Focus.vue | 开始测试后端数据接收功能');
      console.log('Chart-Focus.vue | 开始测试后端数据接收功能');
      
      // 模拟后端发送的数据格式
      const testData = "fitQuadraticCurve:0.000001:-0.02:5.0:15731.13:1.930";
      this.logger.info('Chart-Focus.vue | 模拟后端数据:', testData);
      console.log('Chart-Focus.vue | 模拟后端数据:', testData);
      
      // 调用拟合方法
      this.fitQuadraticCurve(testData);
    },
    
    /**
     * 测试二次曲线拟合功能
     * 注意：现在主要依赖后端拟合结果，此方法仅用于测试前端拟合算法
     * 使用模拟数据验证拟合算法是否正确
     */
    testQuadraticFitting() {
      this.logger.info('Chart-Focus.vue | 开始测试二次曲线拟合功能');
      
      // 生成测试数据：y = 0.0001 * (x - 3000)^2 + 2.0
      const testData = [];
      for (let i = 0; i < 10; i++) {
        const x = 2000 + i * 200; // 位置从2000到3800
        const y = 0.0001 * Math.pow(x - 3000, 2) + 2.0 + (Math.random() - 0.5) * 0.2; // 添加噪声
        testData.push([x, y]);
      }
      
      this.logger.debug('Chart-Focus.vue | 测试数据:', testData);
      
      // 执行拟合
      const fitResult = this.performQuadraticFit(testData);
      if (fitResult) {
        this.logger.info('Chart-Focus.vue | 拟合结果:', fitResult);
        
        // 计算理论最佳位置（应该是3000）
        const minPos = Math.min(...testData.map(point => point[0]));
        const theoreticalBestPos = -fitResult.b / (2 * fitResult.a) + minPos;
        this.logger.info('Chart-Focus.vue | 理论最佳位置:', theoreticalBestPos, '期望值: 3000');
        
        // 生成拟合曲线
        this.generateQuadraticCurve(fitResult.a, fitResult.b, fitResult.c, theoreticalBestPos);
        
        this.logger.info('Chart-Focus.vue | 二次曲线拟合测试完成');
      } else {
        this.logger.error('Chart-Focus.vue | 二次曲线拟合测试失败');
      }
    },
    
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

.focus-result-panel {
  position: fixed;
  top: -200%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 300px;
  background: linear-gradient(135deg, rgba(30, 30, 30, 0.95), rgba(45, 45, 45, 0.95));
  border: 1px solid rgba(100, 100, 100, 0.3);
  border-radius: 8px;
  padding: 12px;
  font-size: 12px;
  color: #e0e0e0;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  min-height: 60px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(100, 100, 100, 0.2);
}

.header-left {
  display: flex;
  align-items: center;
}

.close-button {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background-color: rgba(255, 255, 255, 0.1);
  color: #b0b0b0;
  font-size: 14px;
  font-weight: bold;
  transition: all 0.2s ease;
}

.close-button:hover {
  background-color: rgba(255, 255, 255, 0.2);
  color: #ffffff;
}

.status-icon {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 8px;
  font-size: 12px;
  font-weight: bold;
}

.status-icon.success {
  background-color: rgba(76, 175, 80, 0.2);
  color: #4caf50;
  border: 1px solid rgba(76, 175, 80, 0.4);
}

.status-icon.warning {
  background-color: rgba(255, 152, 0, 0.2);
  color: #ff9800;
  border: 1px solid rgba(255, 152, 0, 0.4);
}

.panel-title {
  font-weight: 600;
  color: #ffffff;
  font-size: 13px;
}

.panel-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.status-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2px 0;
}

.label {
  color: #b0b0b0;
  font-size: 11px;
  font-weight: 500;
}

.value {
  color: #ffffff;
  font-size: 11px;
  font-weight: 600;
  font-family: 'Courier New', monospace;
}

.value.error {
  color: #ff9800;
  background: none;
}

.best-position {
  margin-bottom: 2px;
  color: #00ffff;
  font-size: 9px;
}

.min-hfr {
  color: #ff00ff;
  font-size: 9px;
}

.fit-info {
  color: #00ff00;
  font-size: 8px;
  margin-top: 2px;
  font-style: italic;
}
</style>
