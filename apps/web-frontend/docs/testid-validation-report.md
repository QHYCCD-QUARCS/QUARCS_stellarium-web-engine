# 测试标识验证报告

**生成时间**: 2026/3/20 17:29:57

## 📊 验证摘要

- **总标识数**: 648
- **总组件数**: 55
- **问题总数**: 6

### 按严重程度分类

- ⚠️ **warning**: 4
- ℹ️ **info**: 2

### 按问题类型分类

- **命名规范**: 5
- **覆盖率**: 1

## 🔴 严重错误 (error)

✅ 没有严重错误

## ⚠️ 警告 (warning)

| 类型 | 标识 | 文件 | 位置 | 描述 | 建议 |
|------|------|------|------|------|------|
| 命名规范 | `e2e-probes` | App.vue | 行 18 | 测试标识 "e2e-probes" 未使用规范的前缀 | 建议使用以下前缀之一: pa-, cp-, mcp-, fp-, imp-, scp-, hp-, dap-, dp-, sd-, chart-, tb-, gui-, ui-, bb- |
| 命名规范 | `e2e-device-X-conn` | App.vue | 行 25 | 测试标识 "e2e-device-X-conn" 未使用规范的前缀 | 建议使用以下前缀之一: pa-, cp-, mcp-, fp-, imp-, scp-, hp-, dap-, dp-, sd-, chart-, tb-, gui-, ui-, bb- |
| 命名规范 | `e2e-tilegpm` | App.vue | 行 33 | 测试标识 "e2e-tilegpm" 未使用规范的前缀 | 建议使用以下前缀之一: pa-, cp-, mcp-, fp-, imp-, scp-, hp-, dap-, dp-, sd-, chart-, tb-, gui-, ui-, bb- |
| 命名规范 | `e2e-exposure-completed` | App.vue | 行 37 | 测试标识 "e2e-exposure-completed" 未使用规范的前缀 | 建议使用以下前缀之一: pa-, cp-, mcp-, fp-, imp-, scp-, hp-, dap-, dp-, sd-, chart-, tb-, gui-, ui-, bb- |

## ℹ️ 信息 (info)

### 命名规范

测试标识 "ui-components-location-focal-inputs-act-handle-keyboard-input" 过长 (61 字符)


💡 建议: 建议保持在 60 字符以内

### 覆盖率

1 个组件尚未添加测试标识

**未添加标识的组件** (1个):

- components/ImageManagerPanel.vue

💡 建议: 建议为所有组件添加测试标识以提高测试覆盖率


## 📘 命名规范参考

### 推荐前缀

| 前缀 | 用途 |
|------|------|
| `pa-` | 极轴校准 (AutomaticPolarAlignmentCalibration) |
| `cp-` | 拍摄面板 (CapturePanel) |
| `mcp-` | 赤道仪控制 (MountControlPanel) |
| `fp-` | 调焦面板 (FocuserPanel) |
| `imp-` | 图像管理 (ImageManagerPanel) |
| `scp-` | 计划面板 (SchedulePanel) |
| `hp-` | 直方图面板 (HistogramPanel) |
| `dap-` | 设备分配 (DeviceAllocationPanel) |
| `dp-` | 设备选择器 (DevicePicker) |
| `sd-` | 设置对话框 (Settings-Dialog) |
| `chart-` | 图表组件 |
| `tb-` | 工具栏 (toolbar) |
| `gui-` | 主界面 (gui) |
| `ui-` | 通用组件 |
| `bb-` | 底部栏 (bottom-bar) |
