# AI-Control

`AI-Control/` 是一个不侵入 `tests/` 的 E2E/CLI 业务控制层。

**目标**

- 在不修改现有 `tests/e2e/flows` 的前提下，建立新的多层分工结构。
- 将「主菜单、子菜单、连接、分配、拍摄、保存」等动作拆成可独立调用的节点。
- 高层业务 flow 由这些细粒度步骤组合成流程网。

---

## 目录结构

| 目录 | 说明 |
|------|------|
| `core/` | 流程上下文、步骤类型、运行器与 registry 合并 |
| `shared/` | 交互原语、导航、guard、等待 |
| `atomic/` | 通用 UI 原子步骤 |
| `menu/` | 主菜单、子菜单、确认弹窗、设置入口。关闭主菜单时优先使用遮罩上的 `tb-act-toggle-navigation-drawer-overlay`（仅主菜单打开时存在） |

**子菜单状态判断与控制**（`menu/drawerSteps.ts` 中 `openDeviceSubmenu` / 步骤 `menu.device.open`）：

- **前置**：先确保主菜单抽屉已打开（`menu.drawer.open` / `ensureMenuDrawerOpen`），再根据状态决定是否点击设备项。
- **状态来源**：`ui-app-submenu-device-page` 的 `data-state`（open/closed）表示设备页是否打开；`ui-app-menu-device-${deviceType}` 的 `data-selected`（true/false）表示该设备是否当前选中。二者与前端 `App.vue` 中 `isOpenDevicePage`、`CurrentDriverType` 一致。
- **是否点击**：仅当「子菜单设备页已打开」且「目标设备项已选中」时跳过点击（幂等）；否则点击目标设备项 `ui-app-menu-device-${deviceType}`。
- **后置**：断言目标菜单项 `data-selected="true"`、`ui-app-submenu-drawer` 与 `ui-app-submenu-device-page` 均为 `data-state="open"`，保证二级抽屉与设备页均已就绪。
- **失败重试**：若后置断言超时（子菜单未变为 open），会重新执行「打开主菜单 → 点击设备项 → 等待子菜单 open」，最多共尝试 3 次（首次 + 2 次重试），每次重试前等待 400ms。
- **「再打开主菜单后卡住」原因与对策**：流程中会先打开主菜单与子菜单、再整体关闭（如 `menu.drawer.close`），随后再次打开主菜单以执行下一步（如 `applyCaptureConfig`）。**根因**：关闭主菜单时仅把 `nav`（showNavigationDrawer）设为 false，未同步重置子菜单状态；点击 overlay 可能被 Vuetify 视为“外部点击”从而将子菜单的 `drawer_2` 置为 false，但 `isOpenDevicePage` 仍为 true，导致 E2E 认为“子菜单已打开”而跳过点击，随后断言 `ui-app-submenu-drawer` 的 data-state=open 失败。**前端修复**：在 `App.vue` 中 watch `$store.state.showNavigationDrawer`，当主菜单关闭（isOpen 为 false）时同步执行 `drawer_2 = false`、`isOpenDevicePage = false`，保证再次打开主菜单后 E2E 会重新点击设备项并打开子菜单。E2E 侧对策：① 再次打开主菜单后固定等待约 600ms；② 设备项限定在 `ui-app-menu-drawer` 内查找并点击；③ 点击前滚入视口并短暂等待。
| `device/` | 设备侧栏、连接、分配、拍摄、QHY 别名 |
| `scenario/` | 面向 CLI 或 MCP 的高层业务 flow；`cliFlows.ts` 提供公开 CLI 命令与参数化业务流 |

**弹窗约定**：弹窗根节点与 `data-state` / `data-action` 的定位与含义见 `apps/web-frontend/docs/dialog-identification.md`。网页整体结构目录见 `apps/web-frontend/docs/web-page-structure.md`。确认弹窗（gui.vue）类型由根节点 `data-action` 区分，常量见 `shared/dialogConstants.ts`（如 `CONFIRM_ACTION.DISCONNECT_ALL_DEVICE`）；步骤 `dialog.confirm.wait` / `confirm` / `cancel` 支持可选参数 `expectedAction` 以校验当前弹窗类型。另已补充 `dialog.disconnectDriver.wait` / `confirm` / `cancel`（单设备断开）、`dialog.disconnectAll.wait` / `confirm` / `cancel`（全部断开；可传 `allowMissing=true` 兼容“无设备连接时不弹框”）与 `dialog.imageManager.wait` / `confirm` / `cancel`（图像管理确认类弹层，通过 `dialog` 指定 `usbConfirm` / `deleteConfirm` / `downloadConfirm` / `downloadLocationReminder`）。**单设备断开入口**来自设备子菜单底部固定按钮 `ui-app-btn-disconnect-driver`（`App.vue` 中 `@click="disconnectDriver"`），点击后会触发单设备确认框 `ui-app-disconnect-driver-dialog-root`，不应依赖不稳定的 DOM Path/class 链。**全部断开入口**来自主菜单 `ui-app-menu-disconnect-all`（`App.vue` 中 `@click.stop="disconnectAllDevice(false)"`），其确认框实际仍是通用 `gui.vue` 确认弹窗；由于前端仅在 `haveDeviceConnect=true` 时才会弹框，无设备时不会出现确认框。

---

## CLI 命令

通过 `runFlowByCommand(ctx, registry, commandName, flowParams?, options?)` 或 `getFlowCallsByCommand(commandName, flowParams)` 使用。列出全部命令：`listCliCommands()`。

| 命令名 | 说明 |
|--------|------|
| `general-settings` | 打开通用设置对话框 |
| `disconnect-all` | 独立执行“断开全部设备” |
| `device-disconnect` | 按 `deviceType` 独立断开单个设备 |
| `power-management` | 打开电源管理页，并按参数切换输出电源/重启/关机/强制更新 |
| `switch-to-guider-page` | 仅切换到导星界面（不连接设备；关闭主菜单后点击主页面切换按钮直至 GuiderCamera） |
| `guider-connect-capture` | 导星镜连接与导星专用控制（Guider + QHYCCD；菜单参数 + 导星面板） |
| `maincamera-connect-capture` | 主相机连接，并按参数决定是否拍摄（MainCamera + QHYCCD） |
| `mount-connect-control` | 赤道仪连接与控制（Mount + EQMod） |
| `mount-park` | 赤道仪连接并确保 Park 为 on，可继续执行主面板交互 |
| `mount-panel` | 打开主界面赤道仪面板并执行 mcpInteract（Park/Track/Home/Stop/Sync/Solve/方向移动） |
| `telescopes-focal-length` | 望远镜焦距设置（Telescopes + 焦距，默认 510mm） |
| `focuser-connect-control` | 电调连接与控制（Focuser，可控速度/ROI/手动移动/校准/自动对焦） |
| `cfw-capture-config` | 滤镜轮：主相机连接后执行拍摄面板和菜单级滤镜切换 |
| `polar-axis-calibration` | 打开极轴校准页面并执行组件内交互 |
| `image-file-manager` | 打开图像管理面板 |

**各命令可用参数速查**（详见下文各节）：

| 命令名 | 适用参数 |
|--------|----------|
| `general-settings` | gotoHome, resetBeforeConnect, generalSettingsInteract, generalSettingsRestoreAfterMs, clearBoxConfirmOption, clearBoxConfirmOptions, generalSettingsLanguageItemText, generalSettingsLanguageRestoreItemText |
| `disconnect-all` | gotoHome |
| `device-disconnect` | gotoHome, deviceType |
| `power-management` | gotoHome, powerManagementInteract |
| `switch-to-guider-page` | gotoHome |
| `guider-connect-capture` | gotoHome, resetBeforeConnect, driverText, connectionModeText, doBindAllocation, allocationDeviceMatch, guiderFocalLengthMm, guiderMultiStar, guiderGain, guiderOffset, guiderRaDirection, guiderDecDirection, guiderExposure, guiderInteract |
| `maincamera-connect-capture` | guider 共用参数 + doCapture, captureGain, captureOffset, captureCfaMode, captureTemperature, captureAutoSave, captureSaveFailedParse, captureSaveFolder |
| `mount-connect-control` | gotoHome, resetBeforeConnect, driverText, connectionModeText, mountControlInteract, ensurePark, mcpInteract |
| `mount-park` | gotoHome, resetBeforeConnect, driverText, connectionModeText, mcpInteract |
| `mount-panel` | gotoHome, mcpInteract |
| `telescopes-focal-length` | focalLengthMm, gotoHome |
| `focuser-connect-control` | gotoHome, resetBeforeConnect, driverText, connectionModeText, doBindAllocation, allocationDeviceMatch, focuserInteract |
| `cfw-capture-config` | gotoHome, resetBeforeConnect, driverText, connectionModeText, doBindAllocation, allocationDeviceMatch, cfwInteract |
| `polar-axis-calibration` | gotoHome, polarAxisInteract |
| `image-file-manager` | gotoHome, imageManagerInteract |

**通用可选参数**（`CliFlowParams`）：`gotoHome`、`deviceType`、`focalLengthMm`、`resetBeforeConnect`、`driverText`、`connectionModeText`、`doBindAllocation`、`allocationDeviceMatch`。主相机额外支持 `doCapture`、`doSave`、`captureCount`、`captureExposure`、`waitCaptureTimeoutMs`、`captureGain`、`captureOffset`、`captureCfaMode`、`captureTemperature`、`captureAutoSave`、`captureSaveFailedParse`、`captureSaveFolder`；导星镜额外支持 `guiderFocalLengthMm`、`guiderMultiStar`、`guiderGain`、`guiderOffset`、`guiderRaDirection`、`guiderDecDirection`、`guiderExposure`、`guiderInteract`；赤道仪支持 `mountControlInteract`、`ensurePark`、`mcpInteract`；电源管理支持 `powerManagementInteract`；电调支持 `focuserInteract`；滤镜轮支持 `cfwInteract`；极轴校准支持 `polarAxisInteract`；图像管理支持 `imageManagerInteract`。

**默认不刷新网页**：执行命令时默认**不**先执行 `device.gotoHome`（不刷新/不重新加载页面），在当前已打开的页面上直接操作。若需要先回到首页再执行，请显式传 `gotoHome: true` 或设置环境变量 `E2E_GOTO_HOME=1`。

**文档中的示例**：以下各节示例均以「通过 HTTP 向会话发命令」形式给出。需先启动会话（`npm run e2e:ai-control:session`），再向 `http://127.0.0.1:39281/run`（端口可由 `E2E_AI_CONTROL_SESSION_PORT` 修改）发 **POST**，请求体为 JSON：`{ "commandName": "命令名", "flowParams": { ... } }`。也可用 curl：`curl -X POST http://127.0.0.1:39281/run -H "Content-Type: application/json" -d '{"commandName":"general-settings"}'`。

**GET /status**：通过 Playwright `page.evaluate()` 在页面内读取当前 UI 状态（基于 `docs/web-page-structure.md`），返回主页面、菜单抽屉、弹窗、设备、busy 状态、overlay 等。可选 `?command=xxx` 参数，会同时规划该命令的执行步骤，返回 `targetSurface`、`blockers`、`preSteps`、`coreStepIds`、`suggestions`。若命令依赖参数，可额外传 `flowParams` 查询参数（JSON 字符串）。示例：`curl http://127.0.0.1:39281/status`、`curl "http://127.0.0.1:39281/status?command=general-settings"`、`curl --get "http://127.0.0.1:39281/status" --data-urlencode 'command=maincamera-connect-capture' --data-urlencode 'flowParams={\"captureCount\":3}'`。

**恢复层（Recovery）**：`POST /run` 执行命令前，会先读取当前状态并自动执行恢复步骤，例如关闭残留确认框、关闭图像管理/电源管理/极轴校准、清理 overlay，并按 busy 策略矩阵决定是等待、取消还是严格拒绝，再进入命令核心 flow。当前策略不再把所有 busy 都粗暴视为“只能等”或“只能报错”，而是明确区分：

- **可等待（wait）**：该 busy 会自然结束，恢复层先等它回到 idle，例如主相机连续拍摄命令遇到已有拍摄中。
- **可取消（cancel）**：该 busy 需要先主动收口，恢复层会执行取消步骤，例如停止导星、关闭设备分配、停止并关闭极轴校准。
- **严格拒绝（reject）**：该 busy 当前没有安全取消链路，或等待它会破坏命令语义，恢复层直接报错，例如拍摄中执行设置类命令。

**当前 busy 矩阵（概览）**：

| busy 状态 | 策略 | 典型命令 |
|-----------|------|----------|
| `capture` | `wait / reject` | `maincamera-connect-capture`、`cfw-capture-config` 为 `wait`；其余大多数命令为 `reject` |
| `guiding` | `cancel` | 大多数会切页或改配置的命令都会先停止导星，再继续执行 |
| `polarAxis` | `cancel` | 非极轴命令遇到正在运行的极轴校准，会先停止并关闭极轴组件 |
| `deviceAllocation` | `cancel` | 命令切换时会优先关闭残留设备分配面板，而不是死等 |

**使用提示**：建议先调用 GET /status 获取当前状态与恢复计划，再 POST /run 执行；但即使直接 POST /run，恢复层也会自动尝试把页面收敛到可执行状态。详见下文「AI 使用对话模式」中的推荐执行流程。

---

## 如何使用 AI 控制

可以用三种方式让「AI」或自动化脚本控制前端页面：

### 1. 会话模式（人在终端输入命令）

先启动一个常驻浏览器，再在终端输入命令，**所有命令在同一页面上执行**：

```bash
cd apps/web-frontend
npm run e2e:ai-control:session
```

出现 `> ` 后输入命令，例如：`general-settings`、`power-management`、`list`（列出全部）、`exit`（退出）。同一进程还会启动本地 HTTP 服务（默认端口 39281），供 AI 通过 **`ai_control_run_command_on_session`** 在同一页上发命令，详见下文「会话模式」与「AI 使用对话模式」。

### 2. 通过 MCP 让 Cursor / 其他 AI 发命令

在 Cursor 中配置 MCP 服务器，指向本仓库的 E2E MCP 服务后，AI 可以调用工具控制浏览器。

**配置 MCP**：在 Cursor 设置里添加 MCP server，命令为：
```bash
node /你的路径/QUARCS_stellarium-web-engine/apps/web-frontend/scripts/mcp-e2e-server.mjs
```
可选环境变量：`E2E_BASE_URL`、`E2E_HEADED=1`（默认显示浏览器）。

**AI 可用的工具**：
- **`ai_control_list_commands`**：列出全部命令名。
- **`ai_control_run_command`**：执行一条命令，每次调用会**新开一次浏览器**运行该命令。
- **`ai_control_run_command_on_session`**：在**当前已打开的会话页**上执行命令（见下）。

#### AI 使用对话模式（在同一已打开的网页上执行）

若希望 **AI 和你在同一页上操作**（不每次新开浏览器），按以下步骤：

**推荐执行流程**：启动会话后，执行命令前应优先读取当前状态与恢复计划，再执行：
- **获取状态**：`GET /status` 或 `GET /status?command=xxx`；若命令依赖参数，可追加 `flowParams=<json>` 查询参数
- **查看恢复计划**：检查 `blockers`、`preSteps`、`coreStepIds`，确认恢复层会先关闭哪些阻挡界面，以及各 busy 状态会被等待、取消还是严格拒绝
- **执行命令**：`POST /run` 发送 `{ "commandName": "xxx", "flowParams": {} }`；恢复层会先执行 preSteps，再执行核心 flow

1. **你先启动会话并保持运行**（终端不要关）：
   ```bash
   cd apps/web-frontend
   npm run e2e:ai-control:session
   ```
   启动后会打开一个浏览器页，并输出类似：
   ```
   Session HTTP server: http://127.0.0.1:39281
    GET /status        - 读取当前页面状态
    GET /status?command=xxx - 状态 + 恢复计划 + 命令执行步骤规划
     POST /run          - 执行命令
   ```

2. **在 Cursor 里对 AI 说**：「打开通用设置」「执行 power-management」等。AI 应使用 **`ai_control_run_command_on_session`**（而不是 `ai_control_run_command`），这样命令会通过本地端口 39281 发到你正在运行的会话，**在已打开的那一页上执行**。

   **例如连接主相机并拍摄**：对 AI 说「执行 maincamera-connect-capture 连接主相机并拍摄」。AI 调用 `ai_control_run_command_on_session`，commandName 为 `maincamera-connect-capture`；若只改参数不拍摄，可传 flowParams：`{ "doCapture": false, "captureTemperature": -10 }`；若需拍摄后保存，传 flowParams：`{ "doSave": true }`。若需要把当前已连接设备全部断开，应单独执行 `disconnect-all`，而不是依赖设备类命令里的 `resetBeforeConnect`。

3. **效果**：你既可以自己在终端输入命令，也可以让 AI 通过 MCP 发命令，**两者共用同一个浏览器页**，即「AI 也能使用对话模式」。若会话未启动就调 `ai_control_run_command_on_session`，会返回提示：请先执行 `npm run e2e:ai-control:session`。

端口可通过环境变量 `E2E_AI_CONTROL_SESSION_PORT` 修改（默认 39281）；MCP 工具参数中有 `sessionPort` 可传。

### 3. 在代码或 E2E 测试中调用

在 TypeScript/JavaScript 中：

```ts
import { createFlowContextForSession, makeAiControlRegistry, runFlowByCommand } from './AI-Control'

const ctx = createFlowContextForSession(page, { minTestTimeoutMs: 60_000 })
const registry = makeAiControlRegistry()
await runFlowByCommand({ ctx, registry, commandName: 'general-settings', flowParams: { resetBeforeConnect: false } })
```

或在 Playwright 测试里用 `createFlowContext(page, testInfo, options)` 替代 `createFlowContextForSession`，然后同样调用 `runFlowByCommand`。

---

## general-settings（一个命令，由参数区分行为）

**默认（不配置任何参数）**：仅进入首页 → **打开**通用设置对话框（默认不断开全部设备；需先断开时传 `resetBeforeConnect: true`），不操作对话框内任何控件。

**传入 `generalSettingsInteract` 等参数**：在「打开」之后，按参数依次执行对话框内各项：切页签、勾选/还原复选框、语言切换、刷新、清理盒子、最后关闭。

**示例（HTTP）**：先启动会话 `npm run e2e:ai-control:session`，再向 `http://127.0.0.1:39281/run` 发 POST，请求体 JSON。只打开 → `{ "commandName": "general-settings" }` 或 `{ "commandName": "general-settings", "flowParams": { "resetBeforeConnect": false } }`。要执行对话框内交互 → 在 `flowParams` 中传 `generalSettingsInteract`（及可选 `generalSettingsRestoreAfterMs`、`clearBoxConfirmOption`、语言相关参数等）。

**说明**：「断开全部」仅在有设备连接时才会弹出确认框，无设备连接时不会弹窗，步骤会直接跳过。

### general-settings 全部变量及控制功能

以下为 `general-settings` 命令可用的**全部参数（flowParams / CliFlowParams）**及其控制的功能。

| 参数名 | 类型 | 默认值 | 控制功能 |
|--------|------|--------|----------|
| `gotoHome` | `boolean` | `false` | 是否先刷新页面（device.gotoHome）；不传则在当前页执行。 |
| `resetBeforeConnect` | `boolean` | `false` | 是否在执行前先断开全部设备（有设备连接时会弹出确认框）。 |
| `generalSettingsInteract` | `Partial<Record<GeneralSettingsInteractKey, boolean>>` | 未传则全部 `true` | 按项开关：仅其中为 `true` 的 key 会执行；未传则所有交互项均为 `true`。key 见下表。 |
| `generalSettingsRestoreAfterMs` | `number` | `1000` | 交互后等待多少毫秒再还原（仅对可还原项如复选框、语言切换生效）。 |
| `clearBoxConfirmOption` | `'cache' \| 'update-pack' \| 'backup'` | `'cache'` | `clearBoxConfirm` 时只勾选哪一项：缓存文件 / 更新包 / 备份文件。 |
| `clearBoxConfirmOptions` | `Array<'cache' \| 'update-pack' \| 'backup'>` | — | 勾选多项（若传则优先于 `clearBoxConfirmOption`）；如 `['cache','update-pack','backup']` 表示清理全部。 |
| `generalSettingsLanguageItemText` | `string` | `'Simplified Chinese'` | 语言下拉要切换到的选项文案（需与界面一致，如 `Simplified Chinese`、`English`）；未设且启用 selectLanguage 时使用默认。 |
| `generalSettingsLanguageRestoreItemText` | `string` | — | 语言切换后是否再切回该项（还原）；不传则不还原。 |

**`generalSettingsInteract` 各 key 与控制的 UI 行为：**

| key | 控制功能 |
|-----|----------|
| `displayTab` | 切换到 **Display** 页签。 |
| `milkyWay` | 银河层开关：勾选/还原复选框（`ui-view-settings-dialog-checkbox-milky-way-on`）。 |
| `dss` | DSS 层开关：勾选/还原复选框。 |
| `meridian` | 子午线开关：勾选/还原复选框。 |
| `ecliptic` | 黄道线开关：勾选/还原复选框。 |
| `highfps` | 高帧率开关：勾选/还原复选框。 |
| `selectLanguage` | Display 页签内语言下拉切换；目标选项由 `generalSettingsLanguageItemText` 指定，可选还原由 `generalSettingsLanguageRestoreItemText` 指定。 |
| `versionTab` | 切换到 **Version Info** 页签。 |
| `refreshDevices` | 点击「刷新设备版本」按钮。 |
| `memoryTab` | 切换到 **Memory** 页签。 |
| `refreshStorage` | 点击「刷新存储」按钮。 |
| `clearLogs` | 点击「清除日志」按钮。 |
| `clearBoxCancel` | 打开清理盒子缓存弹窗，然后点击取消。 |
| `clearBoxConfirm` | 再次打开清理盒子弹窗，按 `clearBoxConfirmOption` 勾选一项（cache/update-pack/backup）后点击确认。 |
| `close` | 关闭通用设置对话框。 |

未传 `generalSettingsInteract` 时上述 key 全部视为 `true`；传入对象时仅所列 key 为 `true` 的项会执行。

### 语言切换（selectLanguage）

- 目标语言：`generalSettingsLanguageItemText` 或环境变量 `E2E_GENERAL_SETTINGS_LANGUAGE_ITEM_TEXT`，选项文案需与下拉一致（如 `Simplified Chinese`、`English`），未设时默认 **Simplified Chinese**。
- 可选还原：`generalSettingsLanguageRestoreItemText` 或 `E2E_GENERAL_SETTINGS_LANGUAGE_RESTORE_ITEM_TEXT`。

### 清理盒子缓存（clearBoxCancel / clearBoxConfirm）

弹窗内有多项可选：缓存文件、更新包、备份文件；至少勾选一项后确认按钮才可用。流程中会先勾选指定项，再 `ui.waitEnabled` 确认按钮后点击。勾选使用 **`ui.setCheckbox`**（先读当前状态，仅在不一致时点击一次），不再多次盲目 toggle。

- **只勾选某一项**：`clearBoxConfirmOption: 'cache' | 'update-pack' | 'backup'`（默认 `cache`）。例如只清理更新包：`clearBoxConfirmOption: 'update-pack'`。
- **勾选多项**：`clearBoxConfirmOptions: Array<'cache'|'update-pack'|'backup'>`；若传此项则优先于 `clearBoxConfirmOption`，如 `['cache','update-pack','backup']` 表示清理全部。
- 环境变量：`E2E_CLEAR_BOX_OPTION`（取值 `cache` / `update-pack` / `backup`）。

### 用环境变量指定执行项（不改代码）

跑用例「general-settings 命令（参数由环境变量指定）」时，通过 `resolveFlowParamsFromEnv()` 从环境变量解析 flowParams。未设置 `E2E_GENERAL_SETTINGS_INTERACT` 时，若用例内传了默认的 `generalSettingsInteract`，则会执行对应交互；否则为仅打开。

**general-settings 全部环境变量及控制功能：**

| 环境变量 | 控制功能 | 对应参数 |
|----------|----------|----------|
| `E2E_GENERAL_SETTINGS_INTERACT` | 逗号分隔的 key，仅这些项为 `true`（如 `displayTab,selectLanguage,close`）；key 与上表一致。 | `generalSettingsInteract` |
| `E2E_CLEAR_BOX_OPTION` | 清理盒子时只勾选哪一项：`cache` / `update-pack` / `backup`。 | `clearBoxConfirmOption` |
| `E2E_GENERAL_SETTINGS_LANGUAGE_ITEM_TEXT` | 语言下拉要切换到的选项文案；未设且启用 selectLanguage 时默认 `Simplified Chinese`。 | `generalSettingsLanguageItemText` |
| `E2E_GENERAL_SETTINGS_LANGUAGE_RESTORE_ITEM_TEXT` | 语言切换后还原的选项文案；不设则不还原。 | `generalSettingsLanguageRestoreItemText` |
| `E2E_GENERAL_SETTINGS_RESTORE_AFTER_MS` | 交互后等待多少毫秒再还原（数字）。 | `generalSettingsRestoreAfterMs` |
| `E2E_RESET_BEFORE_CONNECT` | 是否先断开全部再打开设置：`1`/`true`/`yes`/`on` 为 true，`0`/`false`/`no`/`off` 为 false；未设时默认不断开。 | `resetBeforeConnect` |
| `E2E_GOTO_HOME` | 是否先刷新页面（device.gotoHome）：`1`/`true` 为 true；未设或 `0`/`false` 为 false（默认不刷新）。 | `gotoHome` |
| `E2E_FLOW_PARAMS_JSON` | 完整 flowParams 的 JSON，与上述单项合并（此项优先作 base，再被其它 env 覆盖）。 | 覆盖整份 `CliFlowParams` |

**示例：只跑 Display + 语言切换 + 关闭**（跑 Playwright 时用环境变量）：
```bash
E2E_GENERAL_SETTINGS_INTERACT=displayTab,selectLanguage,close npx playwright test AI-Control/e2e/general-settings.spec.ts --project=ai-control -g "参数由环境变量"
```

**示例：只清理更新包**（跑 Playwright 时用环境变量）：
```bash
E2E_GENERAL_SETTINGS_INTERACT=memoryTab,clearBoxConfirm,close E2E_CLEAR_BOX_OPTION=update-pack npx playwright test AI-Control/e2e/general-settings.spec.ts --project=ai-control -g "参数由环境变量"
```

通过 HTTP 发送时，将参数放入 POST 请求体的 `flowParams`，例如只跑 Display + 语言切换 + 关闭：`{ "commandName": "general-settings", "flowParams": { "generalSettingsInteract": { "displayTab": true, "selectLanguage": true, "close": true } } }`；只清理更新包：`{ "commandName": "general-settings", "flowParams": { "generalSettingsInteract": { "memoryTab": true, "clearBoxConfirm": true, "close": true }, "clearBoxConfirmOption": "update-pack" } }`。

---

## disconnect-all（独立断开全部）

**默认行为**：可选 `gotoHome` → 打开主菜单 → 点击 `ui-app-menu-disconnect-all` → 若当前存在已连接设备，则等待确认弹窗并确认；若当前无设备连接，则不会弹窗，步骤直接跳过。

**适用场景**：需要把当前页面上的全部设备连接清空时，显式执行该命令。它与设备类命令里的 `resetBeforeConnect` 已职责分离：前者是**独立全局重置命令**，后者是某个设备命令内部的**单设备预清理**。

**参数**：`gotoHome`（可选，是否先刷新页面，默认 false）。

**示例（HTTP）**：`{ "commandName": "disconnect-all" }` 或 `{ "commandName": "disconnect-all", "flowParams": { "gotoHome": true } }`。

**会话**：在 `> ` 提示符下输入 `disconnect-all`。

---

## device-disconnect（独立断开单设备）

**默认行为**：可选 `gotoHome` → 打开目标设备子菜单 → 点击底部断开按钮 `ui-app-btn-disconnect-driver` → 处理单设备确认框 `ui-app-disconnect-driver-dialog-root` → 等待对应设备探针变为 `disconnected`。

**适用场景**：需要只断开某一个设备，而不影响其他已连接设备。和 `disconnect-all` 的区别是：本命令只操作 `flowParams.deviceType` 指定的设备。

**参数定义**：

| 参数名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `gotoHome` | `boolean` | `false` | 是否先刷新页面。 |
| `deviceType` | `'MainCamera' \| 'Guider' \| 'Mount' \| 'Focuser' \| 'Telescopes' \| 'CFW'` | 必填 | 要断开的目标设备类型。 |

**示例（HTTP）**：

- 断开赤道仪：`{ "commandName": "device-disconnect", "flowParams": { "deviceType": "Mount" } }`
- 断开主相机：`{ "commandName": "device-disconnect", "flowParams": { "deviceType": "MainCamera" } }`
- 回首页后断开导星镜：`{ "commandName": "device-disconnect", "flowParams": { "gotoHome": true, "deviceType": "Guider" } }`

**会话**：在 `> ` 提示符下输入 `device-disconnect {"deviceType":"Mount"}`。

---

## power-management（电源管理）

**默认行为**：可选 `device.gotoHome` → 打开电源管理页（`menu.openPowerManager`），不操作页面内控件。

**参数定义**：

| 参数名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `gotoHome` | `boolean` | `false` | 是否先刷新页面。 |
| `powerManagementInteract.output1` | `boolean` | — | 将输出电源 1 设为目标状态；`true`=开，`false`=关。关闭时流程会自动处理确认弹窗。 |
| `powerManagementInteract.output2` | `boolean` | — | 将输出电源 2 设为目标状态；`true`=开，`false`=关。关闭时流程会自动处理确认弹窗。 |
| `powerManagementInteract.restart` | `true \| 'confirm' \| 'cancel'` | — | 点击重启；`true` 与 `'confirm'` 等价，`'cancel'` 表示只打开后取消。 |
| `powerManagementInteract.shutdown` | `true \| 'confirm' \| 'cancel'` | — | 点击关机；`true` 与 `'confirm'` 等价。 |
| `powerManagementInteract.forceUpdate` | `true \| 'confirm' \| 'cancel'` | — | 点击强制更新；`true` 与 `'confirm'` 等价。 |

**成功判定**：

- 输出电源切换：列表文本从 `[OFF]` 变为 `[ON]` 或从 `[ON]` 变为 `[OFF]`。
- `restart/shutdown/forceUpdate`：确认或取消动作已执行，对应确认弹窗已关闭。

**环境变量**：

- 通用：`E2E_GOTO_HOME`、`E2E_FLOW_PARAMS_JSON`
- 电源管理：`E2E_POWER_MANAGEMENT_INTERACT`
- `E2E_POWER_MANAGEMENT_INTERACT` 支持值：`output1-on`、`output1-off`、`output2-on`、`output2-off`、`restart-confirm`、`restart-cancel`、`shutdown-confirm`、`shutdown-cancel`、`force-update-confirm`、`force-update-cancel`

**示例（HTTP）**：

- 仅打开：`{ "commandName": "power-management" }`
- 打开并将输出 1 打开：`{ "commandName": "power-management", "flowParams": { "powerManagementInteract": { "output1": true } } }`
- 打开并将输出 2 关闭：`{ "commandName": "power-management", "flowParams": { "powerManagementInteract": { "output2": false } } }`
- 打开并弹出重启确认后取消：`{ "commandName": "power-management", "flowParams": { "powerManagementInteract": { "restart": "cancel" } } }`

**完整测试方法**：

- 自动化最小验证：`npx playwright test AI-Control/e2e/power-management.spec.ts --project=ai-control`
- 自动化全量验证：依次验证 `output1/output2/restart/shutdown/forceUpdate`，并检查输出状态或确认弹窗关闭。
- 会话手工验证：`power-management {"powerManagementInteract":{"output1":true,"output2":false,"restart":"cancel"}}`

---

## switch-to-guider-page（切换到导星界面）

**默认行为**：关闭主菜单抽屉 → 点击 `gui-btn-switch-main-page` 直至主页面为 GuiderCamera，并确保导星图表面板（`ui-chart-component-root`）可见。**不连接设备**，仅切换主界面。

**适用场景**：根据当前状态（如已在 Stel 或 MainCamera）快速切到导星页，供后续手动操作或 AI 控制导星面板。

**参数**：`gotoHome`（可选，是否先刷新页面，默认 false）。

**示例（HTTP）**：`{ "commandName": "switch-to-guider-page" }` 或 `{ "commandName": "switch-to-guider-page", "flowParams": { "gotoHome": true } }`。

**会话**：在 `> ` 提示符下输入 `switch-to-guider-page`。

---

## 设备连接与拍摄

覆盖命令：`guider-connect-capture`、`maincamera-connect-capture`、`mount-connect-control`、`focuser-connect-control`。

**默认行为**：不刷新时在当前页执行；默认**不**先执行断开；需重置时传 `resetBeforeConnect: true`，设备类命令会先对**当前目标设备**执行 `device.disconnectIfNeeded`，其真实链路为：打开对应设备子菜单 → 点击底部按钮 `ui-app-btn-disconnect-driver` → 处理单设备确认框 `ui-app-disconnect-driver-dialog-root` → 等待该设备探针变为 `disconnected`。连接链路会先判断设备当前状态，再按需打开对应设备侧栏、选择驱动/连接模式、执行连接、处理可选设备分配并等待已连接。拍摄类命令还包含打开拍摄面板、设置曝光、单次/多次拍摄、可选保存。

**设备状态检测**：设备连接链路统一先读该设备探针（如 `e2e-device-Mount-conn`）的 `data-state`。`device.connectIfNeeded`、`device.connection.clickConnect`、`device.connection.waitConnected` 若发现已为 `connected`，会直接跳过“打开菜单/点击连接/等待连接”这条链路，只在后续确实需要设备侧栏配置时再按需打开菜单，不再固定先走主菜单 → 子菜单。

**共用参数**：

| 参数 | 说明 |
|------|------|
| `gotoHome` | 是否先刷新页面，默认 false。 |
| `deviceType` | 单设备命令目标设备；当前用于 `device-disconnect`，可选值 `MainCamera`、`Guider`、`Mount`、`Focuser`、`Telescopes`、`CFW`。 |
| `resetBeforeConnect` | 是否先断开当前命令目标设备，默认 false（不执行断开）；设备类命令走单设备断开按钮 `ui-app-btn-disconnect-driver`，不是 `disconnectAll`。 |
| `driverText` | 驱动文案，如 QHYCCD、EQMod、Focuser。 |
| `connectionModeText` | 连接模式，如 SDK、INDI。 |
| `doBindAllocation` | 是否在出现设备分配面板时自动绑定，默认 true。 |
| `allocationDeviceMatch` | 设备分配时优先匹配的设备名称片段。 |
| `doCapture` | 主相机命令是否执行拍摄，默认 true；为 false 时仅连接/配置，不执行 `device.captureOnce`。 |
| `doSave` | 主相机拍摄命令是否保存结果，默认 false；仅在 `doCapture=true` 时生效。 |
| `captureCount` | 主相机拍摄次数，默认 1；仅在 `doCapture=true` 时生效。 |
| `captureExposure` | 主相机拍摄面板曝光预设（如 `10ms`、`1s`、`30s`）。 |
| `waitCaptureTimeoutMs` | 主相机单次拍摄完成超时（毫秒）。 |

**guider-connect-capture 参数定义**（本命令现已改为导星专用控制）：

| 参数名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `gotoHome` | `boolean` | `false` | 是否先刷新页面。 |
| `resetBeforeConnect` | `boolean` | `false` | 是否先断开 Guider 设备。 |
| `driverText` | `string` | `'QHYCCD'` | 驱动文案。 |
| `connectionModeText` | `string` | `'SDK'` | 连接模式。 |
| `doBindAllocation` | `boolean` | `true` | 是否自动设备分配。 |
| `allocationDeviceMatch` | `string` | — | 指定设备分配优先匹配文案。 |
| `guiderFocalLengthMm` | `string` | — | 导星菜单中的焦距（`Guider Focal Length (mm)`）。 |
| `guiderMultiStar` | `boolean` | — | 是否开启多星导星（`Multi Star Guider`）。 |
| `guiderGain` | `number` | — | 导星 Gain 滑块数值。 |
| `guiderOffset` | `number` | — | 导星 Offset 滑块数值。 |
| `guiderRaDirection` | `string` | — | RA 单步导星方向：`AUTO` / `WEST` / `EAST`。 |
| `guiderDecDirection` | `string` | — | DEC 单步导星方向：`AUTO` / `NORTH` / `SOUTH`。 |
| `guiderExposure` | `number \| string` | — | 导星面板曝光档位，仅支持 `500ms`、`1s`、`2s`。 |
| `guiderInteract.loopExposure` | `boolean` | — | 设置导星循环曝光开关。 |
| `guiderInteract.guiding` | `boolean` | — | 设置导星开关（开启前会自动确保循环曝光为 on）。 |
| `guiderInteract.expTime` | `number \| string` | — | 与 `guiderExposure` 等价的面板曝光档位控制。 |
| `guiderInteract.dataClear` | `boolean` | — | 点击导星数据清空按钮。 |
| `guiderInteract.rangeSwitch` | `boolean` | — | 点击导星图表量程切换按钮。 |
| `guiderInteract.recalibrate` | `boolean` | — | 长按导星按钮并确认重新校准。 |

**当前实现范围**：`guider-connect-capture` 现已支持导星镜连接、设备分配匹配、导星菜单参数设置，以及导星页图表面板控制（循环曝光、导星开关、曝光档位、清图、量程切换、重新校准）。旧的主相机拍摄型参数 `doSave` / `captureCount` / `waitCaptureTimeoutMs` 不再适用于该命令；`captureExposure` 仅作为 `guiderExposure` 的兼容别名保留。

各命令默认驱动/模式：Mount 默认 EQMod/INDI；MainCamera、Guider 默认 QHYCCD/SDK；Focuser 默认 Focuser/INDI。

**环境变量**：`E2E_GOTO_HOME`、`E2E_RESET_BEFORE_CONNECT`、`E2E_FLOW_PARAMS_JSON`、`E2E_DO_BIND_ALLOCATION`、`E2E_ALLOCATION_DEVICE_MATCH`、`E2E_GUIDER_FOCAL_LENGTH_MM`、`E2E_GUIDER_MULTI_STAR`、`E2E_GUIDER_GAIN`、`E2E_GUIDER_OFFSET`、`E2E_GUIDER_RA_DIRECTION`、`E2E_GUIDER_DEC_DIRECTION`、`E2E_GUIDER_EXPOSURE`、`E2E_GUIDER_INTERACT_JSON`。

**示例（HTTP）**：

- 导星镜连接并打开导星页：`{ "commandName": "guider-connect-capture" }`
- 导星镜连接后设置菜单参数并开启循环曝光：`{ "commandName": "guider-connect-capture", "flowParams": { "guiderGain": 10, "guiderOffset": 0, "guiderExposure": "1s", "guiderInteract": { "loopExposure": true } } }`
- 导星镜连接后开启导星：`{ "commandName": "guider-connect-capture", "flowParams": { "guiderInteract": { "loopExposure": true, "guiding": true } } }`
- 主相机只连接并设置温度，不拍摄：`{ "commandName": "maincamera-connect-capture", "flowParams": { "doCapture": false, "captureTemperature": -10 } }`
- 主相机连接并拍摄且保存：`{ "commandName": "maincamera-connect-capture", "flowParams": { "doSave": true } }`
- 主相机连接并拍摄 300 次：`{ "commandName": "maincamera-connect-capture", "flowParams": { "captureCount": 300 } }`
- 赤道仪连接：`{ "commandName": "mount-connect-control" }`

### 主相机拍摄时参数（maincamera-connect-capture）

本命令除共用参数外，还支持以下拍摄配置。在连接流程中，可在「连接与分配」之后，通过参数设置主相机菜单中的拍摄相关配置（步骤 `device.mainCamera.applyCaptureConfig`）。默认仍会继续关闭侧栏并执行拍摄；若传 `doCapture: false`，则只连接/应用参数，不执行 `device.captureOnce` 与后续保存。仅当传入以下至少一项时才会执行配置步骤。`captureCount` 仅在 `doCapture=true` 时控制连续拍摄次数（默认 1）。

| 参数名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `doCapture` | `boolean` | `true` | 是否执行拍摄；为 `false` 时仅连接/配置，不执行 `device.captureOnce`。 |
| `captureCount` | `number` | `1` | 拍摄次数；大于 1 时流程内连续执行多次 `device.captureOnce`。 |
| `captureGain` | `number` | — | 增益（滑块数值，与设备侧栏主相机 Gain 一致）。 |
| `captureOffset` | `number` | — | 偏置（滑块数值，与设备侧栏主相机 Offset 一致）。 |
| `captureCfaMode` | `string` | — | CFA 模式：`'GR'`、`'GB'`、`'BG'`、`'RGGB'`、`'null'`（与 App.vue ImageCFA 选项一致）。 |
| `captureTemperature` | `number \| string` | — | 制冷温度：`5`、`0`、`-5`、`-10`、`-15`、`-20`、`-25`（或对应字符串）。 |
| `captureAutoSave` | `boolean` | — | 是否开启自动保存。 |
| `captureSaveFailedParse` | `boolean` | — | 是否保存解析失败图片。 |
| `captureSaveFolder` | `string` | — | 保存文件夹选项文案（如 `'local'`），与后端下发的选项一致。 |
| `captureExposure` | `string` | — | 曝光时间（如 `'10ms'`、`'1s'`），需在拍摄面板预设内。 |

**环境变量**：`E2E_DO_CAPTURE`、`E2E_CAPTURE_GAIN`、`E2E_CAPTURE_OFFSET`、`E2E_CAPTURE_CFA_MODE`、`E2E_CAPTURE_TEMPERATURE`、`E2E_CAPTURE_AUTO_SAVE`、`E2E_CAPTURE_SAVE_FAILED_PARSE`、`E2E_CAPTURE_SAVE_FOLDER`、`E2E_CAPTURE_EXPOSURE`、`E2E_CAPTURE_COUNT`、`E2E_WAIT_CAPTURE_TIMEOUT_MS`。

**示例（HTTP）**：向会话 POST `/run`，请求体示例：主相机连接、设增益 10、偏置 0、开启自动保存并拍摄 → `{ "commandName": "maincamera-connect-capture", "flowParams": { "captureGain": 10, "captureOffset": 0, "captureAutoSave": true } }`；只设置温度为 `-10` 不拍摄 → `{ "commandName": "maincamera-connect-capture", "flowParams": { "doCapture": false, "captureTemperature": -10 } }`；带 CFA 与保存选项 → `{ "commandName": "maincamera-connect-capture", "flowParams": { "captureGain": 10, "captureCfaMode": "RGGB", "captureAutoSave": true } }`。

**完整测试方法（guider/maincamera）**：

- 自动化最小验证：`npx playwright test AI-Control/e2e/capture-commands.spec.ts --project=ai-control`
- 自动化全量验证：
  - guider：覆盖 `guiderGain`、`guiderOffset`、`guiderMultiStar`、`guiderExposure`、`guiderInteract.loopExposure`
  - maincamera：覆盖 `captureGain`、`captureOffset`、`captureExposure`、`captureCfaMode`、`captureAutoSave`、`captureCount`
- 会话手工验证：
  - `guider-connect-capture {"guiderGain":10,"guiderOffset":0,"guiderExposure":"1s","guiderInteract":{"loopExposure":true}}`
  - `maincamera-connect-capture {"captureGain":10,"captureOffset":0,"captureExposure":"1s","captureAutoSave":true}`

### focuser-connect-control 参数定义

| 参数名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `gotoHome` | `boolean` | `false` | 是否先刷新页面。 |
| `resetBeforeConnect` | `boolean` | `false` | 是否先断开 Focuser 设备。 |
| `driverText` | `string` | `'Focuser'` | 驱动文案。 |
| `connectionModeText` | `string` | `'INDI'` | 连接模式。 |
| `doBindAllocation` | `boolean` | `true` | 是否自动设备分配。 |
| `allocationDeviceMatch` | `string` | — | 设备分配优先匹配文案。 |
| `focuserInteract.speed` | `1 \| 3 \| 5` | — | 将电调速度切到目标档位。 |
| `focuserInteract.roiLength` | `100 \| 300 \| 500` | — | 将 ROI 切到目标尺寸。 |
| `focuserInteract.move` | `{ direction, durationMs? }` | — | 手动移动电调；`direction` 为 `left` 或 `right`，`durationMs` 默认 100ms。 |
| `focuserInteract.loopShooting` | `boolean` | — | 设置 ROI 循环拍摄开关。 |
| `focuserInteract.startCalibration` | `true \| 'cancel'` | — | 打开电调行程校准确认框并确认/取消。 |
| `focuserInteract.autoFocusMode` | `'coarse' \| 'fine' \| 'cancel'` | — | 打开自动对焦确认框并选择粗调、精调或取消。 |
| `focuserInteract.stopAutoFocus` | `boolean` | `false` | 再点击一次自动对焦按钮，停止自动对焦。 |

**示例（HTTP）**：

- 连接后切速度到 5 并向左移动 1 秒：`{ "commandName": "focuser-connect-control", "flowParams": { "focuserInteract": { "speed": 5, "move": { "direction": "left", "durationMs": 1000 } } } }`
- 连接后切 ROI 到 500，并打开 ROI 循环拍摄：`{ "commandName": "focuser-connect-control", "flowParams": { "focuserInteract": { "roiLength": 500, "loopShooting": true } } }`
- 连接后打开自动对焦确认框并选择粗调：`{ "commandName": "focuser-connect-control", "flowParams": { "focuserInteract": { "autoFocusMode": "coarse" } } }`

**完整测试方法**：

- 自动化最小验证：`npx playwright test AI-Control/e2e/device-commands.spec.ts --project=ai-control -g "focuser-connect-control"`
- 自动化全量验证：验证 `speed`、`roiLength`、`move` 至少一条链路，真实设备下检查当前位置确实变化。
- 会话手工验证：`focuser-connect-control {"focuserInteract":{"speed":3,"roiLength":300,"move":{"direction":"right","durationMs":1000}}}`

---

## 设备属性操作（望远镜焦距）

**命令**：`telescopes-focal-length`。

**默认行为**：可选 `device.gotoHome` → 打开 Telescopes 子菜单 → 在焦距输入框（`ui-config-Telescopes-FocalLengthmm-number-0`）填入默认 510。

**参数定义**：

| 参数名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `focalLengthMm` | `string` | `'510'` | 望远镜焦距（mm），填入设备侧栏焦距输入框。 |
| `gotoHome` | `boolean` | `false` | 是否先刷新页面。 |

**环境变量**：`E2E_GOTO_HOME`、`E2E_FLOW_PARAMS_JSON`；`E2E_FOCAL_LENGTH_MM`（由 `resolveFlowParamsFromEnv` 解析，对应 `focalLengthMm`）。

**示例（HTTP）**：向会话 POST `/run`，请求体：`{ "commandName": "telescopes-focal-length", "flowParams": { "focalLengthMm": "600" } }`。

---

## 拍摄（流程说明）

流程：设备已连接 → `capture.panel.ensureOpen` → `device.captureOnce`（等待 idle → 点击拍摄 → 等 busy → idle，校验 data-seq）→ 可选 `device.save`。当 `maincamera-connect-capture` 传 `doCapture=false` 时，会跳过 `device.captureOnce` 与 `device.save`，仅保留连接/配置链路；导星命令已改走独立的导星菜单 + 导星面板控制链路，不再复用此拍摄流程。

**参数**：`doCapture`、`doSave`、`waitCaptureTimeoutMs`、`captureExposure`。CLI 通过 `maincamera-connect-capture` 的 flowParams 传入。

### cfw-capture-config 参数定义

主相机连接后，既可操作拍摄面板的 CFW 加减，也可进入 CFW 菜单执行 `CFWNext` / `CFWPrev`。若不传 `cfwInteract`，默认执行一次拍摄面板 `+` 与一次 `-`，兼容旧行为。

| 参数名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `gotoHome` | `boolean` | `false` | 是否先刷新页面。 |
| `resetBeforeConnect` | `boolean` | `false` | 是否先断开 MainCamera 设备。 |
| `driverText` | `string` | `'QHYCCD'` | 驱动文案。 |
| `connectionModeText` | `string` | `'SDK'` | 连接模式。 |
| `doBindAllocation` | `boolean` | `true` | 是否自动设备分配。 |
| `allocationDeviceMatch` | `string` | — | 主相机设备分配优先匹配文案。 |
| `cfwInteract.capturePanelPlusCount` | `number` | `1` | 拍摄面板 `cp-btn-cfw-plus` 点击次数。 |
| `cfwInteract.capturePanelMinusCount` | `number` | `1` | 拍摄面板 `cp-btn-cfw-minus` 点击次数。 |
| `cfwInteract.menuNextCount` | `number` | `0` | CFW 菜单 `CFWNext` 点击次数。 |
| `cfwInteract.menuPrevCount` | `number` | `0` | CFW 菜单 `CFWPrev` 点击次数。 |

**示例（HTTP）**：

- 兼容旧行为：`{ "commandName": "cfw-capture-config" }`
- 拍摄面板向后切两次、再向前切一次：`{ "commandName": "cfw-capture-config", "flowParams": { "cfwInteract": { "capturePanelPlusCount": 2, "capturePanelMinusCount": 1 } } }`
- CFW 菜单执行 Next 2 次、Prev 2 次：`{ "commandName": "cfw-capture-config", "flowParams": { "cfwInteract": { "menuNextCount": 2, "menuPrevCount": 2 } } }`

**完整测试方法**：

- 自动化最小验证：`npx playwright test AI-Control/e2e/capture-commands.spec.ts --project=ai-control -g "cfw-capture-config"`
- 自动化全量验证：至少覆盖拍摄面板一组 `+/-` 与菜单一组 `next/prev`。
- 会话手工验证：`cfw-capture-config {"cfwInteract":{"capturePanelPlusCount":1,"capturePanelMinusCount":1,"menuNextCount":1,"menuPrevCount":1}}`

---

## 赤道仪（mount-connect-control）

**默认行为**：可选 gotoHome → 可选单设备断开 Mount → 打开 Mount 侧栏 → 选驱动 EQMod、模式 INDI → 连接 → 分配绑定 → 等待已连接 → [可选] 执行侧栏内控制（见 `mountControlInteract`）→ 关闭抽屉。

**实现范围**：连接流程与侧栏内控制均已实现。传入 `mountControlInteract` 时，在连接完成后、关闭抽屉前依次执行：点击「SolveCurrentPosition」/「Goto」按钮，或设置「GotoThenSolve」「AutoFlip」开关。方向键等未在侧栏内的控制暂未实现。控件 testid 规则：`ui-config-Mount-{Label}-button-{index}`、`ui-config-Mount-{Label}-switch-{index}`（与设备侧栏通用 config 规则一致，见 `App.vue` MountConfigItems）。

**参数定义**：

| 参数名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `gotoHome` | `boolean` | `false` | 是否先刷新页面。 |
| `resetBeforeConnect` | `boolean` | `false` | 是否先断开 Mount 设备。 |
| `driverText` | `string` | `'EQMod'` | 驱动文案。 |
| `connectionModeText` | `string` | `'INDI'` | 连接模式。 |
| `mountControlInteract` | `Partial<Record<'solveCurrentPosition' \| 'gotoClick' \| 'gotoThenSolve' \| 'autoFlip', boolean>>` | 未传则不执行控制 | 连接完成后在侧栏内依次执行：为 `true` 的按钮项会点击，开关项按给定布尔值设置。key 见下表。 |
| `ensurePark` | `boolean` | `false` | 为 `true` 时在关闭抽屉后执行 `mount.ensureParkedForTest`，确保主界面赤道仪面板 Park 为 on。 |

**`mountControlInteract` 各 key 与控制的 UI 行为**：

| key | 类型 | 控制功能 | testid 前缀 |
|-----|------|----------|-------------|
| `solveCurrentPosition` | 按钮 | `true` 时点击「SolveCurrentPosition」按钮 | `ui-config-Mount-SolveCurrentPosition-button-` |
| `gotoClick` | 按钮 | `true` 时点击「Goto」按钮（会弹出 RA/DEC 对话框，流程不自动填写或确认） | `ui-config-Mount-Goto-button-` |
| `gotoThenSolve` | 开关 | 将「GotoThenSolve」开关设为该布尔值 | `ui-config-Mount-GotoThenSolve-switch-` |
| `autoFlip` | 开关 | 将「AutoFlip」开关设为该布尔值（连接后后端可能才下发该项） | `ui-config-Mount-AutoFlip-switch-` |

**示例（HTTP）**：连接后点击 SolveCurrentPosition → `{ "commandName": "mount-connect-control", "flowParams": { "mountControlInteract": { "solveCurrentPosition": true } } }`；连接并开启 GotoThenSolve → `{ "commandName": "mount-connect-control", "flowParams": { "mountControlInteract": { "gotoThenSolve": true } } }`；连接并在主面板执行 Sync + Solve → `{ "commandName": "mount-connect-control", "flowParams": { "mcpInteract": { "sync": true, "solve": true } } }`；连接并确保 Park 为 on → `{ "commandName": "mount-connect-control", "flowParams": { "ensurePark": true } }` 或使用命令 `mount-park`。

**完整测试方法**：

- 自动化最小验证：`npx playwright test AI-Control/e2e/device-commands.spec.ts --project=ai-control -g "mount-connect-control"`
- 自动化全量验证：至少覆盖 `mountControlInteract` 的按钮/开关，以及 `mcpInteract` 的 `park/track/sync/solve/move` 中一条真实链路。
- 会话手工验证：`mount-connect-control {"mountControlInteract":{"gotoThenSolve":true},"mcpInteract":{"park":false,"track":true,"sync":true}}`

### mount-park

**默认行为**：与 `mount-connect-control` 相同的连接流程（可选 gotoHome、先单设备断开 Mount → 打开 Mount 侧栏 → 选驱动/模式 → 连接 → 分配 → 等待已连接 → 关闭抽屉），随后执行 **`mount.ensureParkedForTest`**：若主界面赤道仪控制面板（`mcp-panel`）不可见则点击 `gui-btn-toggle-mount-panel` 打开，若 Park 按钮（`mcp-btn-park`）的 `data-state` 非 `on` 则点击直至为 on。参考 `tests/e2e/feature-by-feature/04-mount-park.spec.ts`。

**参数**：`gotoHome`、`resetBeforeConnect`、`driverText`、`connectionModeText`、`mcpInteract`。适合“先确保 Park，再继续做主面板动作”。

**示例（HTTP）**：`{ "commandName": "mount-park" }` 或 `{ "commandName": "mount-park", "flowParams": { "gotoHome": true } }`。

### mount-panel 与 mcpInteract（主界面赤道仪面板）

主界面赤道仪控制面板（MountControlPanel.vue）通过 testid 前缀 `mcp-` 定位：Park（mcp-btn-park）、Track（mcp-btn-track）、Home（mcp-btn-home）、Stop（mcp-btn-stop）、方向移动（mcp-btn-ra-plus、mcp-btn-ra-minus、mcp-btn-dec-plus、mcp-btn-dec-minus）等。

**命令 `mount-panel`**：可选 gotoHome → 打开主界面赤道仪面板（mount.ensurePanelOpen）→ 若传 `mcpInteract` 则执行 `mount.panel.applyMcpInteract`。

**参数 `mcpInteract`**（可用于 mount-connect-control、mount-park、mount-panel）：

| key | 类型 | 说明 |
|-----|------|------|
| `park` | `boolean` | 将 Park 设为 on（true）或 off（false），点击 mcp-btn-park 直至 data-state 匹配 |
| `track` | `boolean` | 将 Track 设为 on/off，点击 mcp-btn-track |
| `home` | `boolean` | 为 true 时点击 Home（mcp-btn-home） |
| `stop` | `boolean` | 为 true 时点击 Stop（mcp-btn-stop）停止移动 |
| `sync` | `boolean` | 为 true 时点击 Sync（`mcp-btn-sync`） |
| `solve` | `boolean` | 为 true 时点击 Solve（`mcp-btn-solve`） |
| `move` | `{ direction, durationMs? }` | 方向移动：direction 为 `'ra-plus'`、`'ra-minus'`、`'dec-plus'`、`'dec-minus'`；durationMs 为按下时长（毫秒），不传则单次点击 |

**示例（HTTP）**：仅打开面板 → `{ "commandName": "mount-panel" }`。打开面板并开启 Track、再向 RA+ 移动 1 秒 → `{ "commandName": "mount-panel", "flowParams": { "mcpInteract": { "track": true, "move": { "direction": "ra-plus", "durationMs": 1000 } } } }`。打开面板并执行 Sync + Solve → `{ "commandName": "mount-panel", "flowParams": { "mcpInteract": { "sync": true, "solve": true } } }`。

**完整测试方法**：

- 自动化最小验证：执行 `mount-panel` 打开面板并断言 `mcp-panel` 可见。
- 自动化全量验证：覆盖 `park/track/sync/solve/move` 至少一组组合。
- 会话手工验证：`mount-panel {"mcpInteract":{"park":false,"track":true,"sync":true,"move":{"direction":"ra-plus","durationMs":1000},"stop":true}}`

---

## 极轴校准与图像管理

### polar-axis-calibration 参数定义

**默认行为**：可选 gotoHome → 打开极轴校准页；结果 testid `pa-widget`。

| 参数名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `gotoHome` | `boolean` | `false` | 是否先刷新页面。 |
| `polarAxisInteract.autoCalibration` | `boolean` | `false` | 点击自动校准按钮，并等待 `pa-root` 进入 `running`。 |
| `polarAxisInteract.testSimulation` | `boolean` | `false` | 点击测试模拟按钮。 |
| `polarAxisInteract.toggleCollapse` | `boolean` | `false` | 折叠/展开主组件。 |
| `polarAxisInteract.toggleTrajectory` | `boolean` | `false` | 显示/隐藏轨迹层。 |
| `polarAxisInteract.minimize` | `boolean` | `false` | 最小化组件。 |
| `polarAxisInteract.expandFromMinimized` | `boolean` | `false` | 若处于最小化状态则展开。 |
| `polarAxisInteract.clearOldTrajectory` | `boolean` | `false` | 清理轨迹层的历史轨迹。 |
| `polarAxisInteract.switchToWindowed` | `boolean` | `false` | 将轨迹层切到窗口模式。 |
| `polarAxisInteract.switchToFullscreen` | `boolean` | `false` | 将轨迹层切到全屏模式。 |
| `polarAxisInteract.closeTrajectory` | `boolean` | `false` | 关闭轨迹界面，不退出极轴校准。 |
| `polarAxisInteract.quitPolarAxisMode` | `boolean` | `false` | 点击左上角退出按钮，执行 `QuitPolarAxisMode`，退出极轴校准。 |

**环境变量**：`E2E_POLAR_AXIS_INTERACT_JSON` 可直接传 `polarAxisInteract` JSON。

**示例（HTTP）**：

- 仅打开：`{ "commandName": "polar-axis-calibration" }`
- 打开并启动自动校准：`{ "commandName": "polar-axis-calibration", "flowParams": { "polarAxisInteract": { "autoCalibration": true } } }`
- 打开并显示轨迹层、切窗口模式、清理历史轨迹：`{ "commandName": "polar-axis-calibration", "flowParams": { "polarAxisInteract": { "toggleTrajectory": true, "switchToWindowed": true, "clearOldTrajectory": true } } }`
- 打开后关闭轨迹界面并退出极轴校准：`{ "commandName": "polar-axis-calibration", "flowParams": { "polarAxisInteract": { "toggleTrajectory": true, "closeTrajectory": true, "quitPolarAxisMode": true } } }`

**完整测试方法**：

- 自动化最小验证：`npx playwright test AI-Control/e2e/other-commands.spec.ts --project=ai-control -g "polar-axis-calibration"`
- 自动化全量验证：覆盖 `toggleCollapse`、`toggleTrajectory`、`closeTrajectory`、`quitPolarAxisMode`、`autoCalibration` 至少一组链路。
- 会话手工验证：`polar-axis-calibration {"polarAxisInteract":{"toggleTrajectory":true,"closeTrajectory":true,"quitPolarAxisMode":true}}`

### image-file-manager 参数定义

**默认行为**：可选 gotoHome → 打开图像管理面板；结果 testid `imp-root`。传入 `imageManagerInteract` 时，打开后面板内为 `true` 的项会依次执行（点击对应按钮）。

**参数说明**（flowParams 中可传）：

| 参数名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `gotoHome` | `boolean` | `false` | 是否先刷新页面。 |
| `imageManagerInteract` | `Partial<Record<'moveToUsb' \| 'delete' \| 'download' \| 'imageFileSwitch' \| 'refresh' \| 'panelClose', boolean>>` | 未传则不执行面板内交互 | 打开图像管理面板后依次执行：为 `true` 的 key 会执行——各 key 含义见下表。 |

**`imageManagerInteract` 各 key 与控制的 UI 行为**（控件见 `ImageManagerBrowser.vue`）：

| key | 控制功能 | testid |
|-----|----------|--------|
| `moveToUsb` | 点击「移动到 USB」按钮（无 USB 时按钮 disabled） | `imp-btn-move-file-to-usb` |
| `delete` | 点击「删除」按钮（会弹出确认弹窗，流程不自动确认/取消） | `imp-btn-delete-btn-click` |
| `download` | 点击「下载选中」按钮（会弹出下载确认弹窗） | `imp-btn-download-selected` |
| `imageFileSwitch` | 点击图像/文件夹视图切换 | `imp-btn-image-file-switch` |
| `refresh` | 点击当前文件夹「刷新」按钮（需已选中文件夹） | `imp-btn-refresh-current-folder` |
| `panelClose` | 点击关闭面板按钮 | `imp-btn-panel-close` |

**示例（HTTP）**：向会话 POST `/run`，请求体：仅打开 → `{ "commandName": "image-file-manager" }`；先刷新再打开 → `{ "commandName": "image-file-manager", "flowParams": { "gotoHome": true } }`；打开并点击刷新与关闭面板 → `{ "commandName": "image-file-manager", "flowParams": { "imageManagerInteract": { "refresh": true, "panelClose": true } } }`。

**环境变量**：`E2E_GOTO_HOME`、`E2E_FLOW_PARAMS_JSON`（通用）；`E2E_IMAGE_MANAGER_INTERACT`（逗号分隔的 key：`moveToUsb`、`delete`、`download`、`imageFileSwitch`、`refresh`、`panelClose`，仅这些项为 true，由 `resolveFlowParamsFromEnv` 解析）。

**完整测试方法**：

- 自动化最小验证：`npx playwright test AI-Control/e2e/other-commands.spec.ts --project=ai-control -g "image-file-manager"`
- 自动化全量验证：依次验证 `imageFileSwitch`、`refresh`、`panelClose`，以及带确认框的 `delete/download/moveToUsb`。
- 会话手工验证：`image-file-manager {"imageManagerInteract":{"imageFileSwitch":true,"refresh":true,"panelClose":true}}`

---

## 运行第一个示例

在 `apps/web-frontend` 下执行（使用本目录内 `e2e/general-settings.spec.ts`，通过 `createFlowContext`、`makeAiControlRegistry`、`runFlowByCommand` 调用）：

```bash
npx playwright test AI-Control/e2e/general-settings.spec.ts --project=ai-control
```

**同一 spec、同一网页**：ai-control 项目使用单 worker，且 `general-settings.spec.ts` 采用串行模式并共用同一个 page（`beforeAll` 创建，`afterAll` 关闭）。整次运行只打开一个浏览器页签，所有用例在该页面上顺序执行，不会每条命令重开新页。

**依赖真实设备的用例**：`device-commands.spec.ts` 中的 mount-connect-control、mount-park、focuser-connect-control 与 `capture-commands.spec.ts` 中的 guider-connect-capture、maincamera-connect-capture、cfw-capture-config 需真实设备才能完成连接/控制。无设备时会在等待连接或后续控制步骤处超时。

**遮罩与主菜单**：打开主菜单前（`ensureMenuDrawerOpen`）会先尝试关闭可能挡住点击的 Vuetify 遮罩（如断开全部确认关闭后残留的 `v-overlay__scrim`）：多次 Escape + 若有 scrim 则点击关闭，再点击抽屉开关，以减少 general-settings 完整流程等用例因遮罩拦截而失败。

### 会话模式：先打开一页，再输入命令控制

若希望**先打开一个网页并保持打开**，之后**只在终端输入命令**即可在该页面上执行（不重复开新页），可使用会话脚本：

在 `apps/web-frontend` 下执行：

```bash
npm run e2e:ai-control:session
```

或 `E2E_BASE_URL=http://你的地址:8080 npx tsx scripts/ai-control-session.ts`。

启动后会出现一个**常驻浏览器窗口**并访问 `E2E_BASE_URL`，终端出现 `> ` 提示符。输入命令即可在当前页面上执行，例如：

- `general-settings` — 打开通用设置
- `general-settings {"resetBeforeConnect":false}` — 带参数执行
- `power-management` — 打开电源管理
- `list` — 列出全部可用命令
- `exit` 或 `quit` — 关闭浏览器并退出

同一会话内可连续输入多条命令，**始终在同一网页上执行**，无需每次重开浏览器。

### 全面测试各功能

在 `apps/web-frontend` 下、**前端已启动**（默认 `http://127.0.0.1:8080`，可用 `E2E_BASE_URL` 覆盖）时，可一次跑完所有 AI-Control E2E：

```bash
# 全部用例（含依赖真实设备的赤道仪/导星镜/主相机/电调/滤镜轮连接与控制；无设备时相关用例会在等待连接处超时）
npx playwright test AI-Control/e2e/ --project=ai-control
```

**Spec 与命令对应关系**：

| Spec 文件 | 覆盖命令 / 场景 |
|-----------|------------------|
| `general-settings.spec.ts` | `general-settings`（打开、断开全部、完整交互、清理盒子、环境变量参数） |
| `power-management.spec.ts` | `power-management`（打开页面、输出电源切换、重启/关机/强制更新确认链路） |
| `other-commands.spec.ts` | `polar-axis-calibration`、`image-file-manager`（页面打开、组件内交互、环境变量） |
| `recovery.spec.ts` | recovery 层（从已打开界面/残留面板切到其它命令，验证 preSteps 自动执行） |
| `device-commands.spec.ts` | `telescopes-focal-length`、`mount-connect-control`、`mount-park`、`mount-panel`、`focuser-connect-control`（需真实设备，无设备时超时） |
| `capture-commands.spec.ts` | `guider-connect-capture`、`maincamera-connect-capture`、`cfw-capture-config`（需真实设备，无设备时超时） |
| `run-one-command.spec.ts` | 按 `E2E_AI_CONTROL_COMMAND`（未设时默认 `general-settings`）+ 可选 `E2E_FLOW_PARAMS_JSON` 执行单条命令 |

**会话模式逐条验证**：先 `npm run e2e:ai-control:session`，在提示符下输入 `list` 查看命令，再输入命令名或 `命令名 {"param":value}` 做手动/自动化验证；或通过 HTTP POST `http://127.0.0.1:39281/run` 发 `{ "commandName": "xxx", "flowParams": {} }` 全面测试各命令。

**深度验证**：设备已插入、会话已打开时，可执行带交互参数的 12 条命令做完整业务链路验证。方式一：在另一终端运行 `npm run e2e:ai-control:deep-verify`（通过 HTTP 向会话发命令）；`PAUSE=1 npm run e2e:ai-control:deep-verify` 可在每条命令后暂停。方式二：在会话提示符下逐条复制粘贴 `AI-Control/deep-verify-commands.txt` 中的命令。

---

## 约束

- 所有交互必须走真实链路，不使用 `force`。
- 每个关键步骤都要求具备前置检查、执行动作、后置确认。
- `AI-Control/` 仅提供新实现草案，不替换现有 `tests/` 目录逻辑。

---

## 制作规则

步骤设计、Flow 组织与 CLI 对外接口统一遵循以下规则。

### 1. 设计原则

- **业务动作优先**：围绕「连接设备、进入配置、分配设备、开始拍摄、保存结果」等可验证业务动作设计稳定接口，不围绕单页控件拼脚本。
- **先判断前置要求**：执行前检查页面模块、数据加载、目标对象、当前状态、依赖步骤是否满足；不满足时明确返回阻塞原因。
- **前置步骤可复用**：打开菜单、进入页面、加载列表、选择目标等拆成独立步骤，不隐藏在主流程内部。
- **先做可操作性检查**：交互前确认目标可见、可用、未被遮挡、已渲染完成。
- **后置确认必做**：以页面状态、文案、标记、数据刷新等真实变化为完成标准，不以「点击成功」为完成标准。
- **状态变化可追踪**：关键动作体现「执行前状态 → 触发动作 → 执行后状态 → 是否符合预期」，在日志或断言中保留依据。

### 2. 交互实现要求

- **不凭猜测模拟控件**：优先阅读源码，确认真实触发方式（如 `@click`、`v-model`、自定义事件）。
- **Vuetify 等组件**：确认 `data-testid` 所在节点是否可点击；若绑定在隐藏 input 上，应点击其可见父容器。
- **依赖展开态/激活态**：先满足展开、hover、焦点或异步渲染完成，再执行后续动作。
- **层级控件**：菜单、子菜单、弹窗、下拉、标签页按真实业务顺序逐级进入，不跳过链路。
- **禁止**：使用 `force: true` 或其它绕过真实交互的方式。

### 3. 元素定位规则

- 正式流程以全局唯一的 `data-testid` 为主定位方式。
- 缺 testid 时先回源码补齐，再纳入 AI-Control / Flow / CLI。
- 命名要有业务语义，与现有前缀一致（如 `pa-`、`cp-`、`gui-`、`ui-`）。历史 testid（如 `e2e-device-*-conn`、`e2e-tilegpm`）暂保留；新步骤优先使用规范前缀。
- 不以文本内容、DOM 层级、样式类名或随机结构为正式依赖。
- 新增或修改 testid 时参考并更新：`apps/web-frontend/docs/testid-validation-report.md`、`testid-scan-report.md`、`E2E_TEST_IDS_INDEX.json`。

### 4. Flow / CLI 结构

- 每个业务功能拆成：前置检查、前置步骤、执行动作、后置确认、状态校验。
- 各段尽量为独立函数或独立 step，避免堆在一个大函数里。
- 重试须基于明确状态判断，不盲目重复点击。
- 失败分支、异常提示、权限限制或空数据场景须在流程中显式处理。

### 5. 实施细则

- **点击**：等价于 `scrollIntoViewIfNeeded → visible/assert enabled → click`。
- **输入**：先确保目标可见且可交互，再 `fill` / `type`。
- **下拉与选择**：通过 testid 找到可见触发区域或选项后再点击，不对隐藏 input 强制操作。
- **菜单与弹层**：先确认主入口已展开，再定位子项；有动画或挂载延迟时需等待可交互状态。
- **异步流程**：提交、切换、加载、刷新后等待明确完成信号（loading 消失、按钮恢复、列表更新、状态变化、提示出现）。

### 6. 断言、日志与职责边界

- 断言围绕**业务结果**（是否真正连接成功、保存成功、切换到目标模式），而非「页面点到了」。
- 关键流程同时校验页面反馈、内部状态与业务结果，避免假阳性。
- 关键步骤记录清晰日志：业务动作、目标 testid、前置/后置结果、状态变化。
- 流程中断时明确记录失败点、失败原因和上下文。
- **职责边界**：E2E 验证元素可达可操作可验证；Flow 组织可复用业务步骤；CLI 提供稳定外部调用接口。
