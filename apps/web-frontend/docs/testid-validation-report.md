# 测试标识验证报告

**生成时间**: 2026/3/6 14:40:33

## 📊 验证摘要

- **总标识数**: 620
- **总组件数**: 55
- **问题总数**: 4

### 按严重程度分类

- ⚠️ **warning**: 3
- ℹ️ **info**: 1

### 按问题类型分类

- **命名规范**: 4

## 🔴 严重错误 (error)

✅ 没有严重错误

## ⚠️ 警告 (warning)

| 类型 | 标识 | 文件 | 位置 | 描述 | 建议 |
|------|------|------|------|------|------|
| 命名规范 | `e2e-probes` | App.vue | 行 18 | 测试标识 "e2e-probes" 未使用规范的前缀 | 建议使用以下前缀之一: pa-, cp-, mcp-, fp-, imp-, scp-, hp-, dap-, dp-, sd-, chart-, tb-, gui-, ui-, bb- |
| 命名规范 | `e2e-device-X-conn` | App.vue | 行 25 | 测试标识 "e2e-device-X-conn" 未使用规范的前缀 | 建议使用以下前缀之一: pa-, cp-, mcp-, fp-, imp-, scp-, hp-, dap-, dp-, sd-, chart-, tb-, gui-, ui-, bb- |
| 命名规范 | `e2e-tilegpm` | App.vue | 行 32 | 测试标识 "e2e-tilegpm" 未使用规范的前缀 | 建议使用以下前缀之一: pa-, cp-, mcp-, fp-, imp-, scp-, hp-, dap-, dp-, sd-, chart-, tb-, gui-, ui-, bb- |

## ℹ️ 信息 (info)

### 命名规范

测试标识 "ui-components-location-focal-inputs-act-handle-keyboard-input" 过长 (61 字符)


💡 建议: 建议保持在 60 字符以内


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

---

## 按 E2E 用例的 testid 校验

### 2-电源管理 (tests/e2e/test001/2-power-management-menu-and-dialogs.spec.ts)

**校验内容**：该 spec 中使用的全部 data-testid 是否在源码中存在、是否全局唯一、触发方式是否与源码一致。

#### Spec 中引用的 testid 清单

| testid | 用途 | 源码位置 | 校验结果 |
|--------|------|----------|----------|
| ui-app-menu-drawer | 主菜单抽屉，检查 data-state | App.vue ~513 | ✅ 存在，唯一 |
| tb-act-toggle-navigation-drawer | 打开/关闭菜单抽屉（工具栏内） | toolbar.vue ~12 | ✅ 存在，唯一 |
| tb-act-toggle-navigation-drawer-overlay | 主菜单打开时浮在遮罩上的关闭按钮，与顶部工具栏菜单图标同位置 | App.vue ~827 | ✅ 存在，唯一（仅主菜单打开时在 DOM） |
| ui-confirm-dialog-root | 确认弹窗根，data-state open/closed | gui.vue ~315 | ✅ 存在，唯一 |
| ui-confirm-dialog-btn-cancel | 弹窗取消按钮 | gui.vue ~371 | ✅ 存在，唯一 |
| ui-confirm-dialog-btn-confirm | 弹窗确认按钮 | gui.vue ~378 | ✅ 存在，唯一 |
| ui-app-menu-open-power-manager | 菜单项「Power Management」 | App.vue ~575 | ✅ 存在，唯一 |
| ui-power-manager-root | 电源管理页根，data-state open/closed | App.vue ~408 | ✅ 存在，唯一 |
| ui-app-power-page-output-power-1 | Output Power 1 开关 | App.vue ~420 | ✅ 存在，唯一 |
| ui-app-power-page-output-power-2 | Output Power 2 存在性检查 | App.vue ~440 | ✅ 存在，唯一 |
| ui-app-power-page-restart | 重启 | App.vue ~461 | ✅ 存在，唯一 |
| ui-app-power-page-shutdown | 关机 | App.vue ~473 | ✅ 存在，唯一 |
| ui-app-power-page-force-update | 强制更新 | App.vue ~485 | ✅ 存在，唯一 |

#### 触发方式与源码对应

| 控件 | 源码触发方式 | E2E 操作 |
|------|--------------|----------|
| 菜单抽屉开关 | `@click="toggleNavigationDrawer"` (toolbar.vue) | getByTestId + 可操作性检查后 click；关闭时主菜单打开则优先点击 `tb-act-toggle-navigation-drawer-overlay`（App.vue，浮在遮罩上） |
| Power 菜单项 | `@click.stop="openPowerManagerPage()"` (App.vue) | getByTestId + ensureVisibleAndClick |
| Output Power 1/2 | `@click.stop="SwitchOutPutPower(1, ...)"` 或 `SwitchOutPutPower(2, ...)` (App.vue) | getByTestId + ensureVisibleAndClick |
| Restart / Shutdown / Force Update | `@click.stop="RestartRaspberryPi()"` 等 (App.vue) | getByTestId + ensureVisibleAndClick |
| 确认弹窗 Cancel/Confirm | `ConfirmDialogCancel()` / `ConfirmDialogToDo()` (gui.vue) | getByTestId + ensureVisibleAndClick |

所有交互均通过 **可见 + 可点击（toBeVisible / toBeEnabled）+ scrollIntoViewIfNeeded + 标准 click** 完成，无 force 或 DOM 级强制点击。

#### 缺失项与建议

- 本 spec 所涉控件：无缺失，所有引用 testid 均在源码中已定义且在当前功能范围内唯一。
- 建议：新增与电源管理相关的 UI 时，继续在对应节点上添加 `data-testid`，并在本报告中补充一行校验记录。

### 3-导星镜 QHYCCD 双连接与循环 (tests/e2e/test001/3-guider-qhyccd-two-connections-loop.spec.ts)

**校验内容**：该 spec 中使用的全部 data-testid 是否在源码中存在、是否全局唯一、触发方式是否与源码一致；禁止 force 类操作，所有交互先做可操作性检查。

#### Spec 中引用的 testid 清单

| testid | 用途 | 源码位置 | 校验结果 |
|--------|------|----------|----------|
| ui-gui-loader-root | 加载层，等待隐藏 | gui-loader.vue | ✅ 存在，唯一 |
| gui-root | 主界面根 | gui.vue ~11 | ✅ 存在，唯一 |
| ui-app-menu-drawer | 主菜单抽屉，data-state | App.vue ~513 | ✅ 存在，唯一 |
| tb-act-toggle-navigation-drawer | 打开/关闭菜单抽屉 | toolbar.vue ~12 | ✅ 存在，唯一 |
| ui-confirm-dialog-root | 确认弹窗根 | gui.vue ~306 | ✅ 存在，唯一 |
| ui-confirm-dialog-btn-cancel | 弹窗取消 | gui.vue ~362 | ✅ 存在，唯一 |
| ui-confirm-dialog-btn-confirm | 弹窗确认 | gui.vue ~369 | ✅ 存在，唯一 |
| ui-app-menu-disconnect-all | Disconnect All | App.vue ~649 | ✅ 存在，唯一 |
| ui-app-menu-device-Guider | 导星镜菜单项 | App.vue ~596 动态 | ✅ 存在，唯一 |
| ui-app-submenu-device-page | 设备子页，data-state | App.vue ~44 | ✅ 存在，唯一 |
| ui-app-select-confirm-driver | 驱动选择器 | App.vue ~69 | ✅ 存在，唯一 |
| ui-app-select-confirm-driver-option-* | 驱动选项 | App.vue ~74 动态 | ✅ 存在，唯一 |
| ui-app-select-on-connection-mode-change | 连接模式选择 | App.vue ~98 | ✅ 存在，唯一 |
| ui-app-select-connection-mode-option-* | 连接模式选项 | App.vue ~103 动态 | ✅ 存在，唯一 |
| e2e-device-Guider-conn | 导星连接状态探针 data-state | App.vue ~25 动态 | ✅ 存在（命名规范见前文 warning） |
| ui-app-device-connection-panel | 设备连接面板 | App.vue ~60 | ✅ 存在，唯一 |
| ui-app-btn-connect-driver | 连接按钮 | App.vue ~158 | ✅ 存在，唯一 |
| ui-app-btn-disconnect-driver | 断开按钮 | App.vue ~395 | ✅ 存在，唯一 |
| dap-root | 设备分配面板根 | DeviceAllocationPanel.vue ~8 | ✅ 存在，唯一 |
| dp-picker | 设备选择器卡片 | DevicePicker.vue ~5 | ✅ 存在 |
| dp-device-type | 设备类型 | DevicePicker.vue ~9 | ✅ 存在 |
| dp-btn-toggle-bind | 绑定按钮 | DevicePicker.vue ~20 | ✅ 存在 |
| dap-act-selected-device-name-2 | 待选设备项 | DeviceAllocationPanel.vue ~28 | ✅ 存在，唯一 |
| dap-act-close-panel | 关闭面板 | DeviceAllocationPanel.vue ~35 | ✅ 存在，唯一 |
| ui-chart-component-root | 图表面板根 | ChartComponent.vue ~3 | ✅ 存在，唯一 |
| gui-btn-switch-main-page | 主页面切换按钮，data-current-main-page | gui.vue ~135 | ✅ 存在，唯一（已补 data-current-main-page） |
| gui-btn-toggle-charts-panel | 图表面板开关 | gui.vue ~163 | ✅ 存在，唯一 |
| gui-btn-show-capture-ui | 显示拍摄 UI | gui.vue ~212 | ✅ 存在，唯一 |
| gui-btn-hide-capture-ui | 隐藏拍摄 UI | gui.vue ~208 | ✅ 存在，唯一 |
| ui-chart-component-btn-loop-exp-switch | 循环曝光开关 | ChartComponent.vue ~14 | ✅ 存在，唯一 |

#### 触发方式与源码对应

| 控件 | 源码触发方式 | E2E 操作 |
|------|--------------|----------|
| 菜单抽屉 / 确认弹窗按钮 | @click (toolbar.vue / gui.vue) | getByTestId + toBeVisible/toBeEnabled + scrollIntoViewIfNeeded + 未遮挡检查 + click，无 force |
| 菜单抽屉关闭（ensureChartPanelVisible 前） | tb-act-toggle-navigation-drawer / tb-act-toggle-navigation-drawer-overlay | ensureMenuDrawerClosed：主菜单打开时优先点击遮罩上的 tb-act-toggle-navigation-drawer-overlay，否则 Escape 或工具栏 tb-act-toggle-navigation-drawer，确保主切换按钮露出 |
| 导星菜单项 / 驱动与连接模式选择器 | @click (App.vue) | getByTestId + clickLocatorWithFallback |
| 连接/断开按钮 | @click (App.vue) | getByTestId + 可见后 clickLocatorWithFallback |
| 设备分配面板 dp-picker、dap-act-selected-device-name-2、dp-btn-toggle-bind、dap-act-close-panel | @click 等 (DevicePicker / DeviceAllocationPanel) | getByTestId + toBeVisible + clickLocatorWithFallback |
| 主页面切换 / 图表面板开关 / 循环曝光开关 | @click (gui.vue / ChartComponent.vue) | getByTestId + 可见可点后 click；主切换仅在 visible+enabled 时点击，禁止 evaluate(click) |

#### 缺失项与建议

- 本 spec 所涉控件：无缺失；已在 gui.vue 主页面切换按钮上补齐 `data-current-main-page`，用于导星页就绪判断（替代原 img[src*="skymap"] 复合选择器）。
- **ensureChartPanelVisible**：进入步骤前先执行 **ensureMenuDrawerClosed**，关闭菜单抽屉使主内容区与底部主切换按钮（gui-btn-switch-main-page）完全可见、可点击，避免连接后菜单仍打开导致无法点击切页。就绪判断先校验 data-current-main-page === 'GuiderCamera'，再校验图表面板可见；循环内仅当主切换/图表面板开关可见且 enabled 时点击，无 force。
- 所有交互均通过 **可见 + 可启用 + scrollIntoViewIfNeeded + 未遮挡检查（或键盘回退）** 后标准 click，**禁止 force 与 DOM 级 evaluate(click)**。

### 4-主相机 QHYCCD 双连接 (tests/e2e/test001/4-maincamera-qhyccd-two-connections-loop.spec.ts)

**校验内容**：该 spec 中使用的全部 data-testid 是否在源码中存在、是否全局唯一、触发方式是否与源码一致；禁止 force 类操作，所有交互先做可操作性检查。

#### Spec 中引用的 testid 清单

| testid | 用途 | 源码位置 | 校验结果 |
|--------|------|----------|----------|
| ui-gui-loader-root | 加载层，等待隐藏 | gui-loader.vue | ✅ 存在，唯一 |
| gui-root | 主界面根 | gui.vue ~11 | ✅ 存在，唯一 |
| ui-app-menu-drawer | 主菜单抽屉，data-state | App.vue ~513 | ✅ 存在，唯一 |
| tb-act-toggle-navigation-drawer | 打开/关闭菜单抽屉 | toolbar.vue ~12 | ✅ 存在，唯一 |
| gui-btn-show-capture-ui | 显示拍摄 UI | gui.vue ~212 | ✅ 存在，唯一 |
| gui-btn-switch-main-page | 主页面切换 | gui.vue ~135 | ✅ 存在，唯一 |
| ui-confirm-dialog-root | 确认弹窗根 | gui.vue ~306 | ✅ 存在，唯一 |
| ui-confirm-dialog-btn-confirm | 弹窗确认 | gui.vue ~369 | ✅ 存在，唯一 |
| ui-app-menu-disconnect-all | Disconnect All | App.vue ~649 | ✅ 存在，唯一 |
| ui-app-menu-device-MainCamera | 主相机菜单项 | App.vue ~596 动态 | ✅ 存在，唯一 |
| ui-app-submenu-device-page | 设备子页，data-state | App.vue ~44 | ✅ 存在，唯一 |
| ui-app-select-confirm-driver | 驱动选择器 | App.vue ~69 | ✅ 存在，唯一 |
| ui-app-select-on-connection-mode-change | 连接模式选择 | App.vue ~98 | ✅ 存在，唯一 |
| e2e-device-MainCamera-conn | 主相机连接状态探针 | App.vue ~25 动态 | ✅ 存在（命名规范见前文 warning） |
| ui-app-device-connection-panel | 设备连接面板 | App.vue ~60 | ✅ 存在，唯一 |
| ui-app-btn-connect-driver | 连接按钮 | App.vue ~158 | ✅ 存在，唯一 |
| ui-app-btn-disconnect-driver | 断开按钮 | App.vue ~395 | ✅ 存在，唯一 |
| dap-root, dp-picker, dp-device-type, dp-btn-toggle-bind, dap-act-selected-device-name-2, dap-act-close-panel | 设备分配面板 | DeviceAllocationPanel / DevicePicker | ✅ 存在 |
| cp-panel, cp-exptime-value, cp-btn-exptime-plus, cp-btn-exptime-minus | 拍摄面板与曝光控制 | CapturePanel.vue | ✅ 存在，唯一 |
| cp-btn-cfw-plus, cp-btn-cfw-minus, cp-cfw-display, cp-cfw-value | 拍摄面板滤镜轮 | CapturePanel.vue | ✅ 存在，唯一 |
| cp-status | 拍摄状态探针 data-state | CapturePanel.vue ~137 | ✅ 存在，唯一 |
| ui-components-circular-button-act-handle-mouse-down | 拍摄按钮（mousedown 触发） | CircularButton.vue ~11 | ✅ 存在，唯一 |
| ui-app-menu-device-CFW | 滤镜轮菜单项 | App.vue ~596 动态 | ✅ 存在，唯一 |
| ui-config-CFW-CFWNext-button-*, ui-config-CFW-CFWPrev-button-* | 配置菜单滤镜轮按钮 | App.vue ~359 动态 | ✅ 存在 |
| ui-config-MainCamera-Gain-slider-*, -dec-*, -inc-* | Gain 滑块及加减钮 | App.vue ~245–285 | ✅ 存在 |
| ui-config-MainCamera-Offset-slider-*, -dec-*, -inc-* | Offset 滑块及加减钮 | App.vue ~245–285 | ✅ 存在 |
| ui-config-MainCamera-Binning-slider-*, -dec-*, -inc-* | Binning 滑块及加减钮 | App.vue ~245–285 | ✅ 存在 |
| ui-config-MainCamera-*-slider-label-* | 滑块标签（数值读取） | App.vue 滑动条 span | ✅ 已补齐 |

#### 触发方式与源码对应

| 控件 | 源码触发方式 | E2E 操作 |
|------|--------------|----------|
| 菜单抽屉 / 确认 / 断开 / 连接按钮 | @click (toolbar / gui / App) | getByTestId + toBeVisible + toBeEnabled + scrollIntoViewIfNeeded + click，无 force |
| 主相机菜单项 / 驱动与连接模式选择 | @click (App.vue) | clickWhenOperable（可见、可启用后标准 click） |
| 拍摄按钮 | @mousedown (CircularButton.vue) | scrollIntoViewIfNeeded + toBeVisible + click（Playwright click 含 mousedown） |
| 曝光加减 / CFW 加减 / 滑块 dec-inc | @click (CapturePanel / App) | clickWhenOperable |
| 设备分配面板 | @click (DevicePicker / DeviceAllocationPanel) | clickWhenOperable |

#### 缺失项与建议

- 已在 App.vue 滑动条容器内为 `span.slider-label` 补齐 `data-testid="ui-config-{driverType}-{label}-slider-label-{index}"`，供 getSliderValue 以 testid 定位并解析数值。
- 所有交互均通过 **clickWhenOperable** 或 **clickCaptureButtonWhenOperable**：先 **可见 + 可启用（按钮类）+ scrollIntoViewIfNeeded**，再标准 **click**，**禁止 force 与 DOM 级 evaluate(click)**。

### 5-赤道仪 EQMod 连接控制与 Park/Track/GOTO/Home (tests/e2e/test001/5-mount-eqmod-connect-control-goto.spec.ts)

**校验内容**：该 spec 中使用的全部 data-testid 是否在源码中存在、是否全局唯一、触发方式是否与源码一致；禁止 force 类操作，所有交互先做可操作性检查。

#### Spec 中引用的 testid 清单

| testid | 用途 | 源码位置 | 校验结果 |
|--------|------|----------|----------|
| gui-root | 主界面根 | gui.vue ~11 | ✅ 存在，唯一 |
| ui-app-menu-drawer | 主菜单抽屉，data-state | App.vue ~513 | ✅ 存在，唯一 |
| ui-app-submenu-drawer | 子菜单抽屉，data-state | App.vue ~40 | ✅ 存在，唯一 |
| tb-act-toggle-navigation-drawer | 打开/关闭菜单 | toolbar.vue ~12 | ✅ 存在，唯一 |
| ui-app-menu-disconnect-all | Disconnect All | App.vue ~649 | ✅ 存在，唯一 |
| ui-app-menu-device-Mount | Mount 菜单项 | App.vue ~596 动态 | ✅ 存在，唯一 |
| ui-app-submenu-device-page | 设备子页 data-state | App.vue ~44 | ✅ 存在，唯一 |
| ui-app-select-confirm-driver | 驱动选择器 | App.vue ~69 | ✅ 存在，唯一 |
| ui-app-select-confirm-driver-option-* | 驱动选项 | App.vue ~74 动态 | ✅ 存在，唯一 |
| ui-app-device-connection-panel | 设备连接面板 | App.vue ~60 | ✅ 存在，唯一 |
| ui-app-btn-connect-driver | 连接按钮 | App.vue ~158 | ✅ 存在，唯一 |
| dap-root, dp-picker, dp-device-type, dp-btn-toggle-bind, dap-act-selected-device-name-2, dap-act-close-panel | 设备分配面板 | DeviceAllocationPanel / DevicePicker | ✅ 存在 |
| e2e-device-Mount-conn | Mount 连接状态探针 | App.vue ~25 动态 | ✅ 存在（命名规范见前文 warning） |
| mcp-panel, gui-btn-toggle-mount-panel | 赤道仪控制面板及开关 | MountControlPanel.vue / gui.vue | ✅ 存在，唯一 |
| mcp-btn-speed, mcp-btn-ra-plus, mcp-btn-ra-minus, mcp-btn-dec-plus, mcp-btn-dec-minus, mcp-btn-stop | 速度/点动/停止 | MountControlPanel.vue | ✅ 存在，唯一 |
| mcp-btn-track, mcp-btn-park, mcp-btn-home | Track/Park/Home | MountControlPanel.vue | ✅ 存在，唯一 |
| mcp-status-indicator-busy, mcp-status-indicator-idle | 状态指示 | MountControlPanel.vue | ✅ 存在，唯一 |
| ui-skysource-search-input-search-field, ui-components-skysource-search-act-source-clicked | 天图搜索与结果 | skysource-search.vue | ✅ 存在，唯一 |
| ui-selected-object-info-root, ui-selected-object-info-btn-goto | 选中目标信息与 GOTO | selected-object-info.vue | ✅ 存在，唯一 |
| ui-ra-dec-dialog-root, ui-ra-dec-dialog-input-ra-str, ui-ra-dec-dialog-input-dec-str, ui-ra-dec-dialog-btn-on-ok, ui-ra-dec-dialog-btn-on-cancel | RA/DEC 弹窗 | RaDecDialog.vue | ✅ 存在，唯一 |
| ui-app-submenu-params-container | 子菜单参数容器 | App.vue ~52 | ✅ 存在，唯一 |
| ui-config-Mount-GotoThenSolve-switch-*, ui-config-Mount-SolveCurrentPosition-button-*, ui-config-Mount-Goto-button-* | Mount 配置项 | App.vue ~328, ~359 动态 | ✅ 存在 |
| ui-confirm-dialog-root, ui-confirm-dialog-btn-confirm | 确认弹窗 | gui.vue | ✅ 存在，唯一 |

#### 非 testid 定位说明

- **.v-overlay__scrim**：Vuetify 遮罩层，无 data-testid；仅用于关闭浮层时在**可点击时**点击一次，不可点击则依赖 Escape 兜底，**禁止 force**。
- **getByText(/No data available/i)**：用于驱动列表“无数据”状态判断以重试，非控件点击，保持现状。

#### 触发方式与源码对应

| 控件 | 源码触发方式 | E2E 操作 |
|------|--------------|----------|
| 菜单/确认/连接/断开/设备分配 | @click (App / gui / DevicePicker / DeviceAllocationPanel) | getByTestId + ensureLocatorActionable + clickLocatorWithFallback，无 force |
| 遮罩关闭 | 点击 Vuetify scrim | 可见后 click 无 force，失败则 Escape 兜底 |
| 点动 RA/DEC | mousedown + mouseup (MountControlPanel) | pressAndRelease（ensureLocatorActionable + boundingBox + mouse） |
| Track/Park/Home/速度/Stop/Goto 按钮 | @click (MountControlPanel / App) | clickLocatorWithFallback |
| RA/DEC 弹窗输入与确认 | @input / @click (RaDecDialog) | fillLocatorWithFallback / clickLocatorWithFallback |

#### 缺失项与建议

- 本 spec 所涉控件：无缺失，所有引用 testid 均在源码中已定义且在当前功能范围内唯一。
- 已移除全部 **force** 与 **evaluate(click)**，统一通过 **ensureLocatorActionable** + **clickLocatorWithFallback**（可见、可启用、scrollIntoView、trial 点击后标准 click）。

### 6-望远镜 Telescopes 设置焦距 (tests/e2e/test001/6-telescopes-set-focal-length-510.spec.ts)

**校验内容**：该 spec 中使用的全部 data-testid 是否在源码中存在、是否全局唯一、触发方式是否与源码一致；禁止 force 类操作，所有交互先做可操作性检查。

#### Spec 中引用的 testid 清单

| testid | 用途 | 源码位置 | 校验结果 |
|--------|------|----------|----------|
| gui-root | 主界面根 | gui.vue ~11 | ✅ 存在，唯一 |
| ui-app-menu-drawer | 主菜单抽屉，data-state | App.vue ~513 | ✅ 存在，唯一 |
| tb-act-toggle-navigation-drawer | 打开/关闭菜单抽屉 | toolbar.vue ~12 | ✅ 存在，唯一 |
| ui-app-menu-device-Telescopes | Telescopes 菜单项 | App.vue ~596 动态 | ✅ 存在，唯一 |
| ui-app-submenu-device-page | 设备子页，data-state | App.vue ~44 | ✅ 存在，唯一 |
| ui-app-submenu-params-container | 子菜单参数容器 | App.vue ~52 | ✅ 存在，唯一 |
| ui-config-Telescopes-FocalLengthmm-number-0 | 焦距数字输入框 | App.vue ~224 动态（TelescopesConfigItems[0], label: Focal Length (mm)） | ✅ 存在，唯一 |

#### 触发方式与源码对应

| 控件 | 源码触发方式 | E2E 操作 |
|------|--------------|----------|
| 菜单抽屉开关 | @click (toolbar.vue) | getByTestId + ensureLocatorActionable + click |
| Telescopes 菜单项 | 菜单项 @click (App.vue) | getByTestId + scrollIntoViewIfNeeded + isVisible + clickLocatorWithFallback |
| 焦距输入框 | v-model + @input/@blur (App.vue number 配置项) | getByTestId + findVisibleInScrollableContainer + ensureLocatorActionable + fill |

#### 缺失项与建议

- 本 spec 所涉控件：无缺失；`ui-config-Telescopes-FocalLengthmm-number-0` 由 App.vue 动态生成（driverType=Telescopes, label=Focal Length (mm) → FocalLengthmm, inputType=number, index=0）。
- 已移除 **evaluate(click)** 等 force 类操作，统一通过 **ensureLocatorActionable**（可见、可启用、scrollIntoView、trial 点击）+ 标准 **click** 或 **fill**。

### 7-电调 Focuser 连接控制与位置 (tests/e2e/test001/7-focuser-connect-control-position.spec.ts)

**校验内容**：该 spec 中使用的全部 data-testid 是否在源码中存在、是否全局唯一、触发方式是否与源码一致；禁止 force 类操作，所有交互先做可操作性检查。

#### Spec 中引用的 testid 清单

| testid | 用途 | 源码位置 | 校验结果 |
|--------|------|----------|----------|
| ui-gui-loader-root | 加载层，等待隐藏 | gui-loader.vue | ✅ 存在，唯一 |
| gui-root | 主界面根 | gui.vue ~11 | ✅ 存在，唯一 |
| ui-app-menu-drawer | 主菜单抽屉，data-state | App.vue ~513 | ✅ 存在，唯一 |
| tb-act-toggle-navigation-drawer | 打开/关闭菜单抽屉 | toolbar.vue ~12 | ✅ 存在，唯一 |
| ui-app-submenu-drawer | 子菜单抽屉，data-state | App.vue ~40 | ✅ 存在，唯一 |
| ui-app-menu-device-Focuser | 电调菜单项 | App.vue ~596 动态 | ✅ 存在，唯一 |
| ui-app-submenu-device-page | 设备子页，data-state | App.vue ~44 | ✅ 存在，唯一 |
| ui-app-select-confirm-driver | 驱动选择器 | App.vue ~69 | ✅ 存在，唯一 |
| ui-app-select-confirm-driver-option-* | 驱动选项 | App.vue ~74 动态 | ✅ 存在，唯一 |
| ui-app-btn-connect-driver | 连接按钮 | App.vue ~158 | ✅ 存在，唯一 |
| ui-app-btn-disconnect-driver | 断开按钮 | App.vue ~395 | ✅ 存在，唯一 |
| e2e-device-Focuser-conn | 电调连接状态探针 | App.vue ~25 动态 | ✅ 存在（命名规范见前文 warning） |
| dap-root, dp-picker, dp-device-type, dp-btn-toggle-bind, dap-act-selected-device-name-2, dap-act-close-panel | 设备分配面板 | DeviceAllocationPanel / DevicePicker | ✅ 存在 |
| ui-confirm-dialog-root, ui-confirm-dialog-btn-confirm | 确认弹窗 | gui.vue | ✅ 存在，唯一 |
| ui-app-menu-disconnect-all | Disconnect All | App.vue ~649 | ✅ 存在，唯一 |
| cp-panel, cp-btn-toggle-focuser | 拍摄面板与电调面板开关 | CapturePanel.vue | ✅ 存在，唯一 |
| gui-btn-show-capture-ui, gui-btn-switch-main-page | 显示拍摄/主页面切换 | gui.vue | ✅ 存在，唯一 |
| fp-root, fp-act-state-bar, fp-state-current | 电调面板根与状态栏 | FocuserPanel.vue | ✅ 存在，唯一 |
| fp-btn-start-calibration, fp-btn-toggle-loop-shooting | 校准/ROI 循环（仅可操作性检查） | FocuserPanel.vue | ✅ 存在，唯一 |
| fp-btn-speed-change-2 | 速度切换 @click | FocuserPanel.vue ~30 | ✅ 存在，唯一 |
| fp-btn-focus-move, fp-btn-focus-move-2 | 左/右移动 @mousedown/@mouseup | FocuserPanel.vue ~77, ~116 | ✅ 存在，唯一 |

#### 非 testid 定位说明

- **.v-overlay__scrim**：Vuetify 遮罩层，无 data-testid；关闭菜单时仅在可见可点击时点击，禁止 force，失败则 Escape 兜底。

#### 触发方式与源码对应

| 控件 | 源码触发方式 | E2E 操作 |
|------|--------------|----------|
| 菜单抽屉/确认/连接/断开/设备分配/拍摄与电调面板开关 | @click (App / gui / CapturePanel / DevicePicker / DeviceAllocationPanel) | getByTestId + ensureLocatorActionable + clickLocator，无 force |
| 遮罩关闭 | 点击 Vuetify scrim | clickVisibleOverlayScrimOnce（可见后 click，无 force），否则 Escape |
| 电调左/右移动按钮 | @mousedown="FocusMove" @mouseup="FocusAbort" (FocuserPanel.vue) | 短按：pressAndRelease(100ms)；长按：pressAndRelease(1000ms)，均先 ensureLocatorActionable |
| 速度切换按钮 | @click="SpeedChange" (FocuserPanel.vue) | clickLocator |

#### 缺失项与建议

- 本 spec 所涉控件：无缺失，所有引用 testid 均在源码中已定义且在当前功能范围内唯一。
- 已禁止 force；抽屉内滚动使用 evaluate 仅调整 scrollTop 以令菜单项进入视口，非点击类交互。

### 8-滤镜轮 CFW 拍摄面板与配置菜单切换 (tests/e2e/test001/8-cfw-switching-capture-and-config.spec.ts)

**校验内容**：该 spec 中使用的全部 data-testid 是否在源码中存在、是否全局唯一、触发方式是否与源码一致；禁止 force 类操作，所有交互先做可操作性检查。

#### Spec 中引用的 testid 清单

| testid | 用途 | 源码位置 | 校验结果 |
|--------|------|----------|----------|
| ui-gui-loader-root | 加载层，等待隐藏 | gui-loader.vue | ✅ 存在，唯一 |
| gui-root | 主界面根 | gui.vue ~11 | ✅ 存在，唯一 |
| ui-app-menu-drawer | 主菜单抽屉，data-state | App.vue ~513 | ✅ 存在，唯一 |
| ui-app-submenu-drawer | 子菜单抽屉，data-state | App.vue ~40 | ✅ 存在，唯一 |
| tb-act-toggle-navigation-drawer | 打开/关闭菜单抽屉 | toolbar.vue ~12 | ✅ 存在，唯一 |
| ui-confirm-dialog-root | 确认弹窗根，data-state | gui.vue ~306 | ✅ 存在，唯一 |
| ui-confirm-dialog-btn-confirm | 弹窗确认 | gui.vue ~369 | ✅ 存在，唯一 |
| ui-app-menu-disconnect-all | Disconnect All | App.vue ~649 | ✅ 存在，唯一 |
| ui-app-menu-device-MainCamera | 主相机菜单项 | App.vue ~596 动态 | ✅ 存在，唯一 |
| ui-app-submenu-device-page | 设备子页，data-state | App.vue ~44 | ✅ 存在，唯一 |
| ui-app-select-confirm-driver | 驱动选择器 | App.vue ~69 | ✅ 存在，唯一 |
| ui-app-btn-connect-driver | 连接按钮 | App.vue ~158 | ✅ 存在，唯一 |
| e2e-device-MainCamera-conn | 主相机连接状态探针 | App.vue ~25 动态 | ✅ 存在（命名规范见前文 warning） |
| e2e-device-CFW-conn | 滤镜轮连接状态探针 | App.vue ~25 动态 | ✅ 存在（命名规范见前文 warning） |
| dap-root, dp-picker, dp-device-type, dp-btn-toggle-bind, dap-act-selected-device-name-2, dap-act-close-panel | 设备分配面板 | DeviceAllocationPanel / DevicePicker | ✅ 存在 |
| cp-panel | 拍摄面板根 | CapturePanel.vue ~6 | ✅ 存在，唯一 |
| gui-btn-show-capture-ui | 显示拍摄 UI | gui.vue ~212 | ✅ 存在，唯一 |
| gui-btn-switch-main-page | 主页面切换 | gui.vue ~135 | ✅ 存在，唯一 |
| cp-btn-cfw-plus, cp-btn-cfw-minus | 拍摄面板 CFW 加减 | CapturePanel.vue ~40, ~52 | ✅ 存在，唯一 |
| cp-cfw-display, cp-cfw-value | CFW 显示与数值 data-state/data-value | CapturePanel.vue ~72, ~92 | ✅ 存在，唯一 |
| ui-app-menu-device-CFW | 滤镜轮菜单项 | App.vue ~596 动态 | ✅ 存在，唯一 |
| ui-config-CFW-CFWNext-button-*, ui-config-CFW-CFWPrev-button-* | 配置菜单 CFW 下一档/上一档 | App.vue ~359 动态 | ✅ 存在 |

#### 触发方式与源码对应

| 控件 | 源码触发方式 | E2E 操作 |
|------|--------------|----------|
| 菜单抽屉开关 / 确认 / Disconnect All | @click (toolbar.vue / gui.vue / App.vue) | getByTestId + ensureLocatorActionable + click 或 clickLocator，无 force |
| 主相机/滤镜轮菜单项、驱动选择、连接按钮、设备分配 | @click (App.vue / DevicePicker / DeviceAllocationPanel) | getByTestId + clickLocator（先 ensureLocatorActionable） |
| 显示拍摄 / 主页面切换 | @click (gui.vue) | 可见可启用后 clickLocator，禁止 evaluate(click) |
| 拍摄面板 CFW 加减 | @click="handleCFWButtonClick" (CapturePanel.vue) | getByTestId + clickLocator |
| 配置菜单 CFWNext/CFWPrev | @click="onButtonPress(item)" (App.vue 按钮型配置项) | findVisibleButtonByTestIdPrefix + clickLocator |

#### 缺失项与建议

- 本 spec 所涉控件：无缺失；拍摄面板与配置菜单 CFW 相关 testid 均在 CapturePanel.vue / App.vue 中已定义且全局唯一。
- 已禁止 **force** 与 **evaluate(click)**，统一通过 **ensureLocatorActionable**（可见、可启用、scrollIntoView、trial 点击）+ **clickLocator** 标准 click。

### 9-极轴校准 (tests/e2e/test001/9-polar-axis-calibration-menu-and-widget.spec.ts)

**校验内容**：该 spec 中使用的全部 data-testid 是否在源码中存在、是否全局唯一、触发方式是否与源码一致；禁止 force 类操作，所有交互先做可操作性检查。

#### Spec 中引用的 testid 清单

| testid | 用途 | 源码位置 | 校验结果 |
|--------|------|----------|----------|
| ui-gui-loader-root | 加载层，等待隐藏 | gui-loader.vue | ✅ 存在，唯一 |
| gui-root | 主界面根 | gui.vue ~11 | ✅ 存在，唯一 |
| ui-app-menu-drawer | 主菜单抽屉，data-state | App.vue ~513 | ✅ 存在，唯一 |
| ui-app-submenu-drawer | 子菜单抽屉，data-state | App.vue ~40 | ✅ 存在，唯一 |
| tb-act-toggle-navigation-drawer | 打开/关闭菜单抽屉 | toolbar.vue ~12 | ✅ 存在，唯一 |
| ui-confirm-dialog-root, ui-confirm-dialog-btn-confirm | 确认弹窗 | gui.vue | ✅ 存在，唯一 |
| ui-app-menu-disconnect-all | Disconnect All | App.vue ~649 | ✅ 存在，唯一 |
| ui-app-menu-device-MainCamera | 主相机菜单项 | App.vue ~596 动态 | ✅ 存在，唯一 |
| ui-app-submenu-device-page | 设备子页，data-state | App.vue ~44 | ✅ 存在，唯一 |
| ui-app-select-confirm-driver | 驱动选择器 | App.vue ~69 | ✅ 存在，唯一 |
| ui-app-select-confirm-driver-option-* | 驱动选项（主相机/赤道仪） | App.vue ~74 动态 | ✅ 存在，唯一 |
| ui-app-btn-connect-driver | 连接按钮 | App.vue ~158 | ✅ 存在，唯一 |
| e2e-device-MainCamera-conn, e2e-device-Mount-conn | 连接状态探针 data-state | App.vue ~25 动态 | ✅ 存在（命名规范见前文 warning） |
| dap-root, dp-picker, dp-device-type, dp-btn-toggle-bind, dap-act-selected-device-name-2, dap-act-close-panel | 设备分配面板 | DeviceAllocationPanel / DevicePicker | ✅ 存在 |
| ui-app-menu-device-Mount | Mount 菜单项 | App.vue ~596 动态 | ✅ 存在，唯一 |
| ui-app-device-connection-panel | 设备连接面板 | App.vue ~60 | ✅ 存在，唯一 |
| mcp-panel, gui-btn-toggle-mount-panel | 赤道仪控制面板及开关 | MountControlPanel.vue / gui.vue | ✅ 存在，唯一 |
| mcp-btn-park, mcp-btn-track, mcp-btn-home | Park/Track/Home | MountControlPanel.vue | ✅ 存在，唯一 |
| mcp-status-indicator-busy, mcp-status-indicator-idle | 状态指示 | MountControlPanel.vue | ✅ 存在，唯一 |
| ui-app-submenu-params-container | 子菜单参数容器 | App.vue ~52 | ✅ 存在，唯一 |
| ui-app-menu-device-Telescopes | Telescopes 菜单项 | App.vue ~596 动态 | ✅ 存在，唯一 |
| ui-config-Telescopes-FocalLengthmm-number-0 | 焦距输入框 | App.vue ~224 动态 | ✅ 存在，唯一 |
| ui-app-menu-location | Location 菜单项 | App.vue ~721 | ✅ 存在，唯一 |
| ui-location-dialog-root, ui-location-dialog-input-latitude, ui-location-dialog-input-longitude | 位置弹窗与经纬度输入 | location-dialog.vue | ✅ 存在，唯一 |
| ui-location-dialog-btn-save-manual-coordinates | 保存手动坐标 | location-dialog.vue ~48 | ✅ 存在，唯一 |
| ui-app-menu-calibrate-polar-axis | Calibrate Polar Axis 菜单项 | App.vue ~677 | ✅ 存在，唯一 |
| pa-widget, pa-root | 极轴校准组件根与 data-state | AutomaticPolarAlignmentCalibration.vue ~62, ~4 | ✅ 存在，唯一 |
| pa-header, pa-calibration-progress, pa-progress-fill | 极轴校准头部与进度 | AutomaticPolarAlignmentCalibration.vue | ✅ 存在，唯一 |
| pa-btn-auto-calibration | 开始/停止自动校准按钮 @click | AutomaticPolarAlignmentCalibration.vue ~379 | ✅ 存在，唯一 |
| ui-message-box-root | 错误提示（未绑定设备时） | MessageBox.vue | ✅ 存在，唯一 |

#### 非 testid 定位说明

- **.v-overlay__scrim**：Vuetify 遮罩层，无 data-testid；关闭菜单/弹窗时仅在**可见可点击**时点击一次（clickVisibleOverlayScrimOnce），禁止 force，失败则 Escape 兜底。

#### 触发方式与源码对应

| 控件 | 源码触发方式 | E2E 操作 |
|------|--------------|----------|
| 菜单抽屉/确认/Disconnect All/各菜单项 | @click (toolbar.vue / gui.vue / App.vue) | getByTestId + toBeVisible + scrollIntoViewIfNeeded + clickLocatorWhenOperable，无 force |
| 驱动选择与选项 | @click 打开选择器；选项 ui-app-select-confirm-driver-option-* | clickLocatorWhenOperable(select) + clickMenuOptionWithScroll(testid 选项)，禁止 .v-menu__content/.v-list-item |
| 连接/绑定/关闭面板/保存坐标 | @click (App.vue / DevicePicker / DeviceAllocationPanel / location-dialog) | getByTestId + clickLocatorWhenOperable |
| 遮罩关闭 | 点击 Vuetify scrim | clickVisibleOverlayScrimOnce（可见后 click），否则 Escape |
| 赤道仪 Park/Track/Home/面板开关 | @click (MountControlPanel.vue / gui.vue) | getByTestId + toBeVisible + toBeEnabled + clickLocatorWhenOperable |
| 极轴校准「Start Auto Calibration」 | @click="startAutoCalibration" (AutomaticPolarAlignmentCalibration.vue ~377) | getByTestId('pa-btn-auto-calibration') + toBeVisible + toBeEnabled + clickLocatorWhenOperable |

#### 缺失项与建议

- 本 spec 所涉控件：无缺失；极轴校准相关 testid（pa-*）均在 AutomaticPolarAlignmentCalibration.vue 中已定义且全局唯一，菜单与设备流程与前述 spec 共用 testid 一致。
- 已禁止 **force** 与 **evaluate(click)**；**clickLocatorWhenOperable** 仅做 scrollIntoViewIfNeeded、toBeVisible、可选 toBeEnabled 后标准 click，无 DOM 级回退。

### 10-图像文件管理 (tests/e2e/test001/10-image-file-manager.spec.ts)

**校验内容**：该 spec 中使用的全部 data-testid 是否在源码中存在、是否全局唯一、触发方式是否与源码一致；禁止 force 类操作，所有交互先做可操作性检查（可见、可点击、未被遮挡等）。

#### Spec 中引用的 testid 清单

| testid | 用途 | 源码位置 | 校验结果 |
|--------|------|----------|----------|
| ui-gui-loader-root | 加载层，等待隐藏 | gui-loader.vue | ✅ 存在，唯一 |
| gui-root | 主界面根 | gui.vue ~11 | ✅ 存在，唯一 |
| ui-app-menu-drawer | 主菜单抽屉，data-state | App.vue ~513 | ✅ 存在，唯一 |
| tb-act-toggle-navigation-drawer | 打开/关闭菜单抽屉 | toolbar.vue ~12 | ✅ 存在，唯一 |
| gui-btn-show-capture-ui, gui-btn-switch-main-page | 显示拍摄/主页面切换 | gui.vue | ✅ 存在，唯一 |
| ui-confirm-dialog-root, ui-confirm-dialog-btn-confirm | 确认弹窗 | gui.vue | ✅ 存在，唯一 |
| ui-app-menu-disconnect-all | Disconnect All | App.vue ~649 | ✅ 存在，唯一 |
| ui-app-menu-open-image-manager | 菜单项「Image Files」 | App.vue ~691 | ✅ 存在，唯一 |
| imp-root | 图像管理面板根，data-state open/closed | ImageManagerBrowser.vue ~6 | ✅ 存在，唯一 |
| imp-btn-panel-close | 关闭面板按钮 | ImageManagerBrowser.vue ~26 | ✅ 存在，唯一 |
| imp-txt-no-folders | 无文件夹提示文案 | ImageManagerBrowser.vue ~41 | ✅ 存在，唯一 |
| ui-app-menu-device-MainCamera | 主相机菜单项 | App.vue ~596 动态 | ✅ 存在，唯一 |
| ui-app-submenu-device-page | 设备子页 data-state | App.vue ~44 | ✅ 存在，唯一 |
| ui-app-select-confirm-driver | 驱动选择器 | App.vue ~69 | ✅ 存在，唯一 |
| ui-app-btn-connect-driver | 连接按钮 | App.vue ~158 | ✅ 存在，唯一 |
| e2e-device-MainCamera-conn | 主相机连接状态探针 | App.vue ~25 动态 | ✅ 存在 |
| dap-root, dp-picker, dp-device-type, dp-btn-toggle-bind, dap-act-selected-device-name-2, dap-act-close-panel | 设备分配面板 | DeviceAllocationPanel / DevicePicker | ✅ 存在 |
| cp-panel, cp-exptime-value, cp-btn-exptime-plus, cp-btn-exptime-minus, cp-status, cp-btn-save | 拍摄面板与曝光/保存 | CapturePanel.vue | ✅ 存在，唯一 |
| ui-components-circular-button-act-handle-mouse-down | 拍摄按钮（mousedown） | CircularButton.vue ~11 | ✅ 存在，唯一 |
| imp-btn-image-file-switch | 图像类型切换（Capture/Schedule/Solve Failed） | ImageManagerBrowser.vue ~18 | ✅ 存在，唯一 |
| ui-image-folder-root-0 | 第一个文件夹（列表项） | ImageManagerBrowser.vue ~49 动态 | ✅ 存在 |
| imp-txt-current-folder | 当前文件夹标签（含 No folder loaded） | ImageManagerBrowser.vue ~72 | ✅ 存在，唯一 |
| ui-image-folder-file-0-0 | 当前文件夹下第一个文件行 | ImageManagerBrowser.vue ~92 动态 | ✅ 存在 |
| imp-btn-download-selected | 下载选中 | ImageManagerBrowser.vue ~16 | ✅ 存在，唯一 |
| imp-act-usb-select-dialog-2, imp-btn-close-download-confirm-dialog-2 | 下载确认弹窗与取消 | ImageManagerBrowser.vue ~179, ~193 | ✅ 存在，唯一 |
| imp-btn-delete-btn-click | 删除按钮（进入确认态） | ImageManagerBrowser.vue ~13 | ✅ 存在，唯一 |
| imp-btn-move-file-to-usb | 移至 U 盘 | ImageManagerBrowser.vue ~10 | ✅ 存在，唯一 |
| imp-act-usb-select-dialog, imp-btn-close-usbselect-dialog | U 盘选择弹窗与关闭 | ImageManagerBrowser.vue ~117-121 | ✅ 存在，唯一 |

#### 触发方式与源码对应

| 控件 | 源码触发方式 | E2E 操作 |
|------|--------------|----------|
| 菜单抽屉/确认/Disconnect All/各菜单项 | @click (toolbar.vue / gui.vue / App.vue) | getByTestId + scrollIntoViewIfNeeded + toBeVisible + click，无 force |
| 图像管理面板打开/关闭 | @click (App.vue 菜单项 / ImageManagerBrowser 关闭按钮) | clickLocatorWithFallback（可见后标准 click） |
| 分页/图像类型切换/文件夹/文件行 | @click (ImageManagerBrowser.vue selectFolder、focusFile、prevPage、nextPage、ImageFileSwitch) | getByTestId + scrollIntoViewIfNeeded + toBeVisible + click |
| 下载/删除/移至 U 盘/弹窗取消 | @click (ImageManagerBrowser.vue 各按钮与弹窗关闭) | 先可见性检查再 click，禁止 force |
| 拍摄按钮 | @mousedown (CircularButton.vue) | toBeVisible + scrollIntoViewIfNeeded + click |

#### 缺失项与建议

- 本 spec 所涉控件：无缺失；图像管理相关 testid（imp-*、ui-image-folder-*）均在 ImageManagerBrowser.vue 中已定义，与 testid-scan-report 中 ImageManagerPanel/ImageManagerBrowser 一致。
- 已禁止 **force**；**clickLocatorWithFallback** 仅做 scrollIntoViewIfNeeded、toBeVisible 后标准 click，关闭面板与移至 U 盘按钮同样仅在做完可操作性检查后点击，不传 force。
