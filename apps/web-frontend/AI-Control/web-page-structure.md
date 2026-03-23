# 网页结构目录

本文档基于 AI-Control 控制流程，描述当前 Stellarium Web 前端网页的可控结构，供 E2E、AI 控制及人工排查使用。

---

## 一、初始界面：星图主界面（Stel）

- **根节点**：`ui-app-root`
- **主页面切换**：通过 `gui-btn-switch-main-page` 在三个主页面间循环切换：
  - **Stel**：星图界面（默认）
  - **MainCamera**：主相机拍摄界面
  - **GuiderCamera**：导星镜界面

---

## 二、主界面可控区域

### 1. 主菜单抽屉（左侧）

- **入口**：`tb-act-toggle-navigation-drawer`（工具栏菜单图标）
- **根节点**：`ui-app-menu-drawer`（`data-state`: open/closed）
- **关闭方式**：主菜单打开时优先点击遮罩上的 `tb-act-toggle-navigation-drawer-overlay`

**主菜单内一级入口：**

| 菜单项 testid | 功能 | 打开后的目标 |
|---------------|------|--------------|
| `ui-app-menu-connect-all` | 连接全部设备 | 触发连接流程 |
| `ui-app-menu-disconnect-all` | 断开全部设备 | 弹出确认弹窗 |
| `ui-app-menu-general-settings` | 通用设置 | 通用设置对话框 |
| `ui-app-menu-open-power-manager` | 电源管理 | 电源管理页 `ui-power-manager-root` |
| `ui-app-menu-device-allocation` | 设备分配 | 设备分配面板 `dap-root` |
| `ui-app-menu-calibrate-polar-axis` | 极轴校准 | 极轴校准页 `pa-widget` |
| `ui-app-menu-open-image-manager` | 图像管理 | 图像管理面板 `imp-root` |
| `ui-app-menu-open-debug-log` | 调试日志 | 调试日志对话框 |
| `ui-app-menu-location` | 位置 | 位置对话框 |
| `ui-app-menu-data-credits` | 数据版权 | 数据版权对话框 |
| `ui-app-menu-refresh-page` | 刷新页面 | 刷新确认弹窗 |

**设备子菜单（二级抽屉）：**

- **二级抽屉**：`ui-app-submenu-drawer`、`ui-app-submenu-device-page`
- **设备项**：`ui-app-menu-device-{设备类型}`（`data-selected`: true/false）

| 设备类型 | testid | 说明 |
|----------|--------|------|
| MainCamera | `ui-app-menu-device-MainCamera` | 主相机配置侧栏 |
| Guider | `ui-app-menu-device-Guider` | 导星镜配置侧栏 |
| Mount | `ui-app-menu-device-Mount` | 赤道仪配置侧栏 |
| Focuser | `ui-app-menu-device-Focuser` | 电调配置侧栏 |
| Telescopes | `ui-app-menu-device-Telescopes` | 望远镜焦距等 |
| CFW | （主相机连接后） | 滤镜轮配置 |

### 2. 主界面赤道仪控制面板（mcp-panel）

- **入口**：`gui-btn-toggle-mount-panel`
- **根节点**：`mcp-panel`（MountControlPanel.vue）
- **控件**：
  - Park：`mcp-btn-park`
  - Track：`mcp-btn-track`
  - Home：`mcp-btn-home`
  - Stop：`mcp-btn-stop`
  - Sync：`mcp-btn-sync`
  - Solve：`mcp-btn-solve`
  - 方向移动：`mcp-btn-ra-plus`、`mcp-btn-ra-minus`、`mcp-btn-dec-plus`、`mcp-btn-dec-minus`

### 3. 拍摄面板（主相机页）

- **根节点**：`cp-panel`（`cp-` 前缀）
- **显示条件**：主页面切换到 MainCamera
- **功能**：曝光、拍摄、CFW 加减等

### 4. 导星图表面板（导星页）

- **根节点**：`ui-chart-component-root`（ChartComponent.vue）
- **显示条件**：主页面切换到 GuiderCamera
- **功能**：导星控制、循环曝光、导星开关等

---

## 三、弹窗与浮层

### 1. 通用确认弹窗（gui.vue）

- **根节点**：`ui-confirm-dialog-root`
- **属性**：`data-state`、`data-action`（区分业务类型）
- **类型示例**：断开全部、刷新、重启、关机、切换电源、强制更新、重新校准等

### 2. 其他弹窗

| 用途 | 根节点 testid |
|------|---------------|
| 通用设置 | `ui-view-settings-dialog-root` |
| 位置 | `ui-location-dialog-root` |
| 数据版权 | `ui-data-credits-dialog-root` |
| 调试日志 | `ui-indi-debug-dialog-root` |
| 单设备断开 | `ui-app-disconnect-driver-dialog-root` |
| 设备分配 | `dap-root` |
| 图像管理 | `imp-root` |
| 电源管理 | `ui-power-manager-root` |

### 3. Recovery 相关关闭入口 / 状态

| 区域 | 关键 testid / 状态 | 说明 |
|------|--------------------|------|
| 电源管理 | `ui-power-manager-root[data-state]`、`ui-power-manager-btn-close` | recovery 层可直接关闭电源管理页 |
| 图像管理 | `imp-root[data-state]`、`imp-btn-panel-close` | 图像管理面板支持显式关闭 |
| 极轴校准 | `pa-root[data-state]`、`pa-widget[data-state]`、`pa-minimized[data-state]`、`gui-btn-quit-polar-axis-mode`、`pa-btn-close`、`pa-btn-close-minimized` | `gui-btn-quit-polar-axis-mode` 用于退出极轴校准；`pa-btn-close*` 仍可作为组件级关闭兜底 |
| 设备分配 | `dap-root`、`dap-act-close-panel` | 连接过程中若残留，可先关闭再执行其它命令 |
| 全局遮挡层 | `.v-overlay.v-overlay--active` | recovery 层会先尝试 `Escape` 和 scrim 点击清理 |
| 主 UI 隐藏态 | `gui-btn-show-capture-ui` | 可用于判断当前主界面 UI 是否被隐藏 |
| 拍摄 busy | `cp-status[data-state]` | `idle/busy`，供 recovery 层判断是否允许切换命令 |
| 导星 busy | `ui-chart-component-root[data-guiding][data-guider-status]` | 导星运行中默认视为不可安全打断 |
| 设备连接探针 | `e2e-device-*-conn[data-state][data-driver-name][data-connection-mode]` | 用于统一判断各设备当前连接状态 |

---

## 四、结构层级示意

```
星图主界面 (ui-app-root)
├── 工具栏
│   ├── tb-act-toggle-navigation-drawer（主菜单开关）
│   └── gui-btn-toggle-mount-panel（赤道仪面板开关）
│
├── 主菜单抽屉 (ui-app-menu-drawer)
│   ├── 一级菜单项
│   │   ├── 连接全部 / 断开全部
│   │   ├── 通用设置 → 通用设置对话框
│   │   ├── 电源管理 → 电源管理页
│   │   ├── 设备分配 → 设备分配面板
│   │   ├── 极轴校准 → 极轴校准页
│   │   ├── 图像管理 → 图像管理面板
│   │   ├── 调试日志 / 位置 / 数据版权 / 刷新
│   │   └── 设备子菜单入口
│   │
│   └── 设备子菜单 (ui-app-submenu-drawer)
│       ├── MainCamera（主相机侧栏）
│       ├── Guider（导星镜侧栏）
│       ├── Mount（赤道仪侧栏）
│       ├── Focuser（电调侧栏）
│       └── Telescopes（望远镜焦距等）
│
├── 主界面区域（按 gui-btn-switch-main-page 切换）
│   ├── Stel（星图）
│   ├── MainCamera（主相机页 + cp-panel 拍摄面板）
│   └── GuiderCamera（导星页 + ui-chart-component-root 导星面板）
│
├── 赤道仪控制面板 (mcp-panel)（可折叠）
│   └── Park / Track / Home / Stop / Sync / Solve / 方向键
│
└── 各类弹窗（覆盖在主界面上方）
    ├── 通用确认弹窗 (ui-confirm-dialog-root)
    ├── 通用设置对话框
    ├── 设备分配 / 图像管理 / 电源管理 等
    └── 单设备断开确认
```

---

## 相关文档

- 弹窗定位与状态约定：`docs/dialog-identification.md`
- AI-Control 使用说明：`AI-Control/README.md`
- testid 校验报告：`docs/testid-validation-report.md`
