# 直方图 UI 相关代码位置说明

更新时间：2026-04-13

本文说明当前前端直方图 UI 中，以下 3 类内容分别在什么地方修改：

1. 黑白电平的实线调节条宽度
2. 垂直浅灰色虚线的绘制位置
3. 垂直虚线的浅灰色颜色位置

前端仓库根目录：

`/home/q/workspace_origin/QUARCS_stellarium-web-engine`

## 1. 黑白电平的实线调节条宽度修改位置

文件：

- [Dial-Knob.vue](/home/q/workspace_origin/QUARCS_stellarium-web-engine/apps/web-frontend/src/components/Dial-Knob.vue:355)

当前实线调节条对应的是两个粗条：

- 黑电平粗条：`.indicator`
- 白电平粗条：`.second-indicator`

当前宽度代码：

```css
.indicator {
  width: 14px;
}

.second-indicator {
  width: 14px;
}
```

对应位置：

- 黑电平粗条宽度：[Dial-Knob.vue](/home/q/workspace_origin/QUARCS_stellarium-web-engine/apps/web-frontend/src/components/Dial-Knob.vue:355)
- 白电平粗条宽度：[Dial-Knob.vue](/home/q/workspace_origin/QUARCS_stellarium-web-engine/apps/web-frontend/src/components/Dial-Knob.vue:370)

另外，按下时的激活态宽度也要一起改，否则静态宽度和按下宽度会不一致：

- 黑电平激活态：[Dial-Knob.vue](/home/q/workspace_origin/QUARCS_stellarium-web-engine/apps/web-frontend/src/components/Dial-Knob.vue:385)
- 白电平激活态：[Dial-Knob.vue](/home/q/workspace_origin/QUARCS_stellarium-web-engine/apps/web-frontend/src/components/Dial-Knob.vue:401)

当前激活态也都是：

```css
width: 14px;
```

修改建议：

- 如果只是想增大鼠标/手指可触达区域，直接把这 4 处 `width` 一起改大即可
- 改完后注意保持左右相对定位逻辑不变：
  - 黑电平粗条在细虚线左侧：`transform: translate(-100%, -50%)`
  - 白电平粗条在细虚线右侧：`transform: translate(0, -50%)`

说明：

- 细虚线表示真实黑白电平位置
- 粗实线只用于扩大触控范围，不应该代替真实位置线

## 2. 绘制垂直浅灰色虚线的代码位置

文件：

- [Chart-Histogram.vue](/home/q/workspace_origin/QUARCS_stellarium-web-engine/apps/web-frontend/src/components/Chart-Histogram.vue:63)

当前垂直浅灰色虚线是在 `buildBaseChartOption()` 里通过 ECharts 的 `xAxis.splitLine` 生成的。

关键代码位置：

- `buildBaseChartOption()` 定义：[Chart-Histogram.vue](/home/q/workspace_origin/QUARCS_stellarium-web-engine/apps/web-frontend/src/components/Chart-Histogram.vue:63)
- 控制是否显示全范围虚线：[Chart-Histogram.vue](/home/q/workspace_origin/QUARCS_stellarium-web-engine/apps/web-frontend/src/components/Chart-Histogram.vue:65)
- `xAxis.splitNumber = 5`：[Chart-Histogram.vue](/home/q/workspace_origin/QUARCS_stellarium-web-engine/apps/web-frontend/src/components/Chart-Histogram.vue:82)
- `xAxis.splitLine` 配置：[Chart-Histogram.vue](/home/q/workspace_origin/QUARCS_stellarium-web-engine/apps/web-frontend/src/components/Chart-Histogram.vue:92)

当前实现片段：

```js
const showFullRangeGuides = !this.useEffectiveRange;

xAxis: {
  type: 'value',
  min: x_min,
  max: x_max,
  splitNumber: 5,
  splitLine: {
    show: showFullRangeGuides,
    lineStyle: {
      color: borderColor,
      type: 'dashed',
      width: 1
    }
  }
}
```

说明：

- `splitNumber: 5` 决定了横向参考分区数量
- `splitLine.show = !this.useEffectiveRange` 表示：
  - 全范围模式：显示垂直虚线
  - 局部范围模式：不显示垂直虚线

如果要修改“均分成几个区域”，优先看 `splitNumber`

## 3. 垂直虚线的浅灰色颜色修改位置

文件：

- [Chart-Histogram.vue](/home/q/workspace_origin/QUARCS_stellarium-web-engine/apps/web-frontend/src/components/Chart-Histogram.vue:64)

当前浅灰色来自 `buildBaseChartOption()` 里的 `borderColor`：

```js
const borderColor = 'rgba(210, 210, 210, 0.65)';
```

这个颜色目前被同时用于：

- 四边框颜色
- 全范围模式下的垂直虚线颜色

对应使用位置：

- `grid.borderColor`：[Chart-Histogram.vue](/home/q/workspace_origin/QUARCS_stellarium-web-engine/apps/web-frontend/src/components/Chart-Histogram.vue:75)
- `xAxis.splitLine.lineStyle.color`：[Chart-Histogram.vue](/home/q/workspace_origin/QUARCS_stellarium-web-engine/apps/web-frontend/src/components/Chart-Histogram.vue:95)

如果你只想改“垂直虚线颜色”，但不想改“四边框颜色”，建议拆成两个变量，例如：

```js
const frameColor = 'rgba(210, 210, 210, 0.65)';
const guideLineColor = 'rgba(210, 210, 210, 0.45)';
```

然后分别填到：

- `grid.borderColor`
- `xAxis.splitLine.lineStyle.color`

## 额外说明

当前这两类线的职责分工是：

- 细虚线蓝/红线：表示真实黑白电平位置
- 粗实线蓝/红条：只用于扩大触控范围
- 浅灰色四边框：作为直方图整体边框
- 浅灰色垂直虚线：仅在 `0~65535` 全范围模式下作为辅助参考线

