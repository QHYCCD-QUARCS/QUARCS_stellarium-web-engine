# 弹窗如何确定（源码约定）

本文档说明前端弹窗在源码中的定位与状态约定，供 E2E、AI-Control 及人工排查使用。

## 1. 通用约定

- **根节点**：每个弹窗有一个带 `data-testid="ui-xxx-dialog-root"` 或 `ui-xxx-root` 的根元素。
- **开关状态**：根节点通常带有 `data-state="open" | "closed"`，与是否显示一致。
- **定位方式**：`page.getByTestId('ui-xxx-dialog-root').first()`，再通过 `getAttribute('data-state')` 或 `toHaveAttribute('data-state', 'open')` 判断是否打开。

## 2. 确认弹窗（Confirm Dialog）— gui.vue

**根节点**（约 315–320 行）：

```html
<div
  data-testid="ui-confirm-dialog-root"
  :data-state="ConfirmDialog ? 'open' : 'closed'"
  :data-action="ConfirmToDo || ''"
  :data-title="ConfirmDialogTitle || ''"
  style="display: contents;"
>
  <v-dialog v-model="ConfirmDialog" ...>
```

| 属性 | 含义 | 取值示例 |
|------|------|----------|
| `data-state` | 是否打开 | `open` / `closed` |
| `data-action` | 当前确认动作类型（业务区分用） | 见下表 |
| `data-title` | 弹窗标题文案 | 来自 `ConfirmDialogTitle` |

**data-action 取值**（来自 `ConfirmToDo`，在 `ShowConfirmDialog(title, text, ToDo)` 时设置）：

| data-action | 含义 |
|-------------|------|
| `disconnectAllDevice` | 断开全部设备确认 |
| `Refresh` | 刷新页确认 |
| `RestartRaspberryPi` | 重启树莓派 |
| `ShutdownRaspberryPi` | 关机 |
| `restartQtServer` | 重启 Qt 服务 |
| `RestartPHD2` | 重启 PHD2 |
| `SwitchOutPutPower` | 切换输出电源 |
| `ForceUpdate` | 强制更新树莓派 |
| `Recalibrate` | 重新校准 |
| `EndCaptureAndSolve` | 结束拍摄并解析 |
| `StartCalibration` | 开始校准 |
| `startAutoFocus` | 自动对焦模式确认（有粗调/精调按钮） |
| `DeleteSchedulePreset` | 删除计划预设 |
| `updateCurrentClient...` | 客户端更新相关 |

**按钮 testid**：

- 通用：`ui-confirm-dialog-btn-cancel`、`ui-confirm-dialog-btn-confirm`
- 自动对焦：`ui-confirm-dialog-btn-close`、`ui-confirm-dialog-btn-autofocus-coarse`、`ui-confirm-dialog-btn-autofocus-fine`

**E2E 示例**：

```ts
// 等待确认弹窗打开且为“断开全部”类型
await expect(page.getByTestId('ui-confirm-dialog-root').first()).toHaveAttribute('data-state', 'open')
await expect(page.getByTestId('ui-confirm-dialog-root').first()).toHaveAttribute('data-action', 'disconnectAllDevice')

// 点击确认
await page.getByTestId('ui-confirm-dialog-btn-confirm').first().click()
```

## 3. 其他弹窗与浮层

| 用途 | data-testid (根) | data-state 来源 | 组件/文件 |
|------|------------------|-----------------|-----------|
| 通用设置 | `ui-view-settings-dialog-root` | `$store.state.showViewSettingsDialog` | view-settings-dialog.vue |
| 位置 | `ui-location-dialog-root` | `$store.state.showLocationDialog` | location-dialog.vue |
| 数据版权 | `ui-data-credits-dialog-root` | `$store.state.showDataCreditsDialog` | data-credits-dialog.vue |
| 调试日志 | `ui-indi-debug-dialog-root` | props `isOpen` | indiDebugDialog.vue |
| 电源管理页 | `ui-power-manager-root` | 页面内部状态 | App.vue（非 v-dialog） |
| 设备分配 | `dap-root` | 组件内部 `data-state` | DeviceAllocationPanel.vue |
| 图像管理 | `imp-root` | 组件内部 | ImageManagerBrowser.vue |
| RA/DEC | `ui-ra-dec-dialog-root` | v-model 控制 | RaDecDialog.vue |
| 设备设置 Mount | `ui-settings-dialog-mount-root` | `$store.state.showDeviceSettingsDialog_Mount` | Settings-Dialog-Mount.vue |
| 设备设置 Guider/MainCamera/Focuser/CFW/PoleCamera | `ui-settings-dialog-guider-root` 等 | 对应 store 状态 | 各 Settings-Dialog-*.vue |
| USB 文件 | `ui-usbfiles-dialog-root` | `$store.state.showUSBFilesDialog` | USBFilesDialog.vue |
| 行星可见性 | `ui-planets-visibility-root` | `$store.state.showPlanetsVisibilityDialog` | planets-visibility.vue |

## 4. 单设备断开确认弹窗（App.vue）

**用途**：在设备侧栏点击“断开”单个驱动时弹出（`showSelectdisconnectDriver` → `showDisconnectDialog`），与主菜单“断开全部”使用的 gui.vue 确认弹窗不同。

**根节点**（App.vue 内 `<v-card>` 包在 `<v-dialog v-model="showDisconnectDialog">` 内）：

| 属性 | 含义 |
|------|------|
| `data-testid` | `ui-app-disconnect-driver-dialog-root` |
| `data-state` | `open` / `closed`（与 showDisconnectDialog 一致） |

**按钮 testid**：`ui-app-disconnect-driver-dialog-btn-cancel`、`ui-app-disconnect-driver-dialog-btn-confirm`。

**与“断开全部”区别**：“断开全部”走 gui.vue `ShowConfirmDialog(..., 'disconnectAllDevice')`，根节点为 `ui-confirm-dialog-root`；单设备断开走 App.vue `showDisconnectDialog`，根节点为 `ui-app-disconnect-driver-dialog-root`。

## 5. 图像管理中的确认/取消类弹层（ImageManagerBrowser.vue）

这几类弹层都在 `ImageManagerBrowser.vue` 中，采用 `v-if` 渲染，**没有统一的 `data-state`**。因此 E2E 判断方式是：

- `page.getByTestId('<root-testid>').first()` 可见：弹层已出现
- `expect(locator).toBeVisible()`：等待出现
- `expect(locator).not.toBeVisible()`：等待关闭

| 用途 | 根节点 testid | 出现判断 | 取消按钮 | 确认按钮 | 功能说明 |
|------|---------------|----------|----------|----------|----------|
| USB 传输确认 | `imp-usb-confirm-dialog` | 根节点可见 | `imp-btn-cancel-usb-confirm` | `imp-btn-confirm-usb-transfer` | 将已选文件复制到已选择的 USB 盘 |
| 删除确认 | `imp-delete-confirm-dialog` | 根节点可见 | `imp-btn-cancel-delete-confirm` | `imp-btn-confirm-delete` | 删除已选文件 |
| 下载确认 | `imp-act-usb-select-dialog-2` | 根节点可见 | `imp-btn-close-download-confirm-dialog-2` | `imp-btn-confirm-start-download` | 开始浏览器下载已选文件 |
| 下载位置提醒 | `imp-act-download-location-reminder-dialog` | 根节点可见 | `imp-btn-cancel-download-location-reminder-dialog` | `imp-btn-continue-download-location-reminder-dialog` | 浏览器不支持页内选择路径时，提示是否继续下载 |

说明：

- `imp-act-close-xxx` 多为点击遮罩关闭，不建议作为 E2E 主路径；优先使用显式确认/取消按钮。
- `showUSBSelectDialog` 是“选择 USB 设备”弹层，不属于确认/取消弹层；它的作用是选择目标 U 盘，随后才会进入 `imp-usb-confirm-dialog`。

## 6. 未暴露 testid 的弹窗

（暂无；原 App.vue 单设备断开已补 testid，见第 4 节。）

## 7. 小结

- **是否弹窗打开**：用对应根的 `data-state === 'open'` 判断。
- **确认弹窗类型**：用 `ui-confirm-dialog-root` 的 `data-action` 区分。
- **图像管理弹层是否打开**：因使用 `v-if`，直接判断对应根节点是否 `visible`。
- **操作**：通过各弹窗约定的 `data-testid` 按钮（如 `ui-confirm-dialog-btn-confirm`）点击，禁止 `force`。

## 8. AI-Control 对齐

- 常量与 testid：`AI-Control/shared/dialogConstants.ts` 中定义了 `CONFIRM_DIALOG_ROOT_TESTID`、`CONFIRM_DIALOG_BTN_CONFIRM` / `CONFIRM_DIALOG_BTN_CANCEL` 及 `CONFIRM_ACTION.*`（与上表 data-action 一致）；单设备断开弹窗见 `DISCONNECT_DRIVER_DIALOG_ROOT_TESTID`、`DISCONNECT_DRIVER_DIALOG_BTN_CONFIRM` / `DISCONNECT_DRIVER_DIALOG_BTN_CANCEL`。
- 步骤参数：`dialog.confirm.wait`、`dialog.confirm.confirm`、`dialog.confirm.cancel` 支持可选 `params.expectedAction`（如 `CONFIRM_ACTION.REFRESH`），用于校验当前确认弹窗类型后再操作。
- 单设备断开：`dialog.disconnectDriver.wait` / `confirm` / `cancel` 支持可选 `params.expectedDriverName`，用于校验当前断开的是哪个驱动。
- 图像管理弹层：`dialog.imageManager.wait` / `confirm` / `cancel` 通过 `params.dialog` 指定目标弹层，支持值：`usbConfirm`、`deleteConfirm`、`downloadConfirm`、`downloadLocationReminder`。
