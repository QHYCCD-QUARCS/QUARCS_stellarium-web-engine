# AI Test Playbook（单文件自包含）

> 目标：让 AI **只看本文件** 就能在 QUARCS web-frontend 中执行与扩展 E2E 测试，不需要再打开源码或其它文档。

---

## 1. 适用范围

- 项目：`/home/quarcs/workspace/QUARCS/QUARCS_stellarium-web-engine/apps/web-frontend`
- 测试框架：Playwright
- 核心执行入口：`tests/e2e/flow-runner.spec.ts`
- 默认约束：测试不会自动启动前端服务，需先确保被测页面可访问

---

## 2. 一次性准备（每次新环境先做）

在终端执行：

```bash
cd /home/quarcs/workspace/QUARCS/QUARCS_stellarium-web-engine/apps/web-frontend
npm install
npx playwright install
```

---

## 3. 启动被测页面

二选一：

1) 已有远端设备页面（推荐）  
直接设置 `E2E_BASE_URL` 指向设备，例如：

```bash
export E2E_BASE_URL="http://192.168.1.113:8000"
```

2) 本机开发服务  
先启动：

```bash
cd /home/quarcs/workspace/QUARCS/QUARCS_stellarium-web-engine/apps/web-frontend
npm run dev
```

再设置：

```bash
export E2E_BASE_URL="http://127.0.0.1:8080"
```

补充说明：
- 如果 `8080` 已有可用前端服务（例如 `server.py` 已在本机提供页面），可直接复用该服务，不必重复执行 `npm run dev`
- 先用 `curl -I "$E2E_BASE_URL"` 确认可达，再执行测试

---

## 4. 最小验证（先确认环境可跑）

```bash
cd /home/quarcs/workspace/QUARCS/QUARCS_stellarium-web-engine/apps/web-frontend
npx playwright test tests/e2e/flow-runner.spec.ts --headed --workers=1
```

通过标准：
- 退出码为 `0`
- 控制台出现 `1 passed`

---

## 5. 标准执行方式（推荐）

使用 `E2E_FLOW_CALLS_JSON` 传入步骤数组，每个步骤格式如下：

```json
{"id":"stepId","params":{"k":"v"}}
```

### 5.1 通用模板（可直接复制）

```bash
cd /home/quarcs/workspace/QUARCS/QUARCS_stellarium-web-engine/apps/web-frontend
export E2E_BASE_URL="http://192.168.1.113:8000"
export E2E_FLOW_CALLS_JSON='[
  {"id":"ui.goto","params":{"url":"/"}}
]'
npx playwright test tests/e2e/flow-runner.spec.ts --headed --workers=1
```

### 5.2 带全局参数模板

```bash
cd /home/quarcs/workspace/QUARCS/QUARCS_stellarium-web-engine/apps/web-frontend
export E2E_BASE_URL="http://192.168.1.113:8000"
export E2E_FLOW_CALLS_JSON='[
  {"id":"ui.goto","params":{"url":"/"}}
]'
export E2E_FLOW_PARAMS_JSON='{
  "waitCaptureTimeoutMs":180000
}'
npx playwright test tests/e2e/flow-runner.spec.ts --headed --workers=1
```

---

## 6. 不看源码也能“发现可用能力”

### 6.1 列出全部可用 step id（关键）

执行下面命令（故意传不存在的 step），报错中会打印当前全部可用 step：

```bash
cd /home/quarcs/workspace/QUARCS/QUARCS_stellarium-web-engine/apps/web-frontend
export E2E_BASE_URL="http://192.168.1.113:8000"
export E2E_FLOW_CALLS_JSON='[{"id":"__LIST_ALL_STEPS__"}]'
npx playwright test tests/e2e/flow-runner.spec.ts --workers=1
```

读取失败输出里的：
- `未知 step id: __LIST_ALL_STEPS__`
- `可用 steps（N）: ...`

### 6.2 列出全部 testId（用于 tid.* 步骤）

```bash
cd /home/quarcs/workspace/QUARCS/QUARCS_stellarium-web-engine/apps/web-frontend
node -e "const fs=require('fs');const p='docs/e2e/E2E_TEST_IDS_INDEX.json';const j=JSON.parse(fs.readFileSync(p,'utf8'));console.log(Object.keys(j.testIds).join('\n'));"
```

---

## 7. 最常用步骤（无需记全部）

### 7.1 UI 原子步骤

- `ui.goto`：打开页面（参数：`url`）
- `ui.click`：按 testId 点击（参数：`testId`）
- `ui.clickText`：按文本点击（参数：`text`，可选 `withinTestId` / `exact`）
- `ui.type`：输入（参数：`testId`, `text`, 可选 `clear`）
- `ui.selectVSelectItemText`：Vuetify 下拉按文案选项（参数：`testId`, `itemText`）
- `ui.waitVisible` / `ui.waitHidden`（参数：`testId`, 可选 `timeoutMs`）
- `ui.waitState`：等待 `data-state`（参数：`testId`, `state`, 可选 `timeoutMs`）
- `ui.assertVisible` / `ui.assertTextContains`

### 7.2 testId 别名步骤（自动生成）

对任意 testId：`X`，可直接用：

- `tid.X.click`
- `tid.X.clickEnsured`
- `tid.X.typeEnsured`（参数：`text`, 可选 `clear`）
- `tid.X.selectVSelectItemTextEnsured`（参数：`itemText`）
- `tid.X.waitVisible`
- `tid.X.waitHidden`
- `tid.X.assertVisible`
- `tid.X.assertTextContains`（参数：`text`）
- `tid.X.waitState`（参数：`state`）

---

## 8. 三个可直接执行的示例

### 示例 A：打开首页并检查关键区域可见

```bash
cd /home/quarcs/workspace/QUARCS/QUARCS_stellarium-web-engine/apps/web-frontend
export E2E_BASE_URL="http://192.168.1.113:8000"
export E2E_FLOW_CALLS_JSON='[
  {"id":"ui.goto","params":{"url":"/"}},
  {"id":"ui.waitVisible","params":{"testId":"ui-app-root","timeoutMs":20000}},
  {"id":"ui.assertVisible","params":{"testId":"ui-app-root"}}
]'
npx playwright test tests/e2e/flow-runner.spec.ts --headed --workers=1
```

> `ui-app-root` 已在当前索引中验证可用；若你的环境索引不同，按“6.2”先列出 testId 再替换。

### 示例 B：QHYCCD 一次拍摄（现成专项用例）

```bash
cd /home/quarcs/workspace/QUARCS/QUARCS_stellarium-web-engine/apps/web-frontend
export E2E_BASE_URL="http://192.168.1.113:8000"
npx playwright test tests/e2e/qhyccd-flow-runner.spec.ts --headed --workers=1
```

### 示例 C：组合业务流程（flow-runner）

```bash
cd /home/quarcs/workspace/QUARCS/QUARCS_stellarium-web-engine/apps/web-frontend
export E2E_BASE_URL="http://192.168.1.113:8000"
export E2E_FLOW_CALLS_JSON='[
  {"id":"device.gotoHome"},
  {"id":"device.ensureDeviceSidebar"},
  {"id":"device.connectIfNeeded","params":{"deviceType":"MainCamera","driverText":"QHYCCD","connectionModeText":"SDK"}},
  {"id":"device.ensureCapturePanel"}
]'
npx playwright test tests/e2e/flow-runner.spec.ts --headed --workers=1
```

---

## 9. `tests/e2e` 示例实测矩阵（本机）

实测环境：
- `E2E_BASE_URL=http://127.0.0.1:8080`
- 执行策略：全部单线程 `--workers=1` 串行执行

说明：
- “调用情况”优先写该示例的关键 step 链（或关键页面调用）
- 状态含义：`可用`=本机直接通过；`条件可用`=需补充环境变量或业务前置；`当前不可用`=本机现状无法通过

| 示例文件 | 测试的具体功能 | 调用情况（关键步骤） | 本机状态 | 备注 |
|---|---|---|---|---|
| `tests/e2e/probes.spec.ts` | E2E 探针基础可见性 | `page.goto` -> 断言 `e2e-device-MainCamera-conn` 与 `e2e-tilegpm` | 可用 | 已通过 |
| `tests/e2e/flow-runner.spec.ts` | 通用 flow-runner 最小冒烟 | 默认 `ui.goto`（可由 `E2E_FLOW_CALLS_JSON` 覆盖） | 可用 | 已通过 |
| `tests/e2e/qhyccd-flow-runner.spec.ts` | QHY 可组合流程 | `qhy.gotoHome -> qhy.ensureDeviceSidebar -> qhy.connectIfNeeded -> qhy.ensureCapturePanel -> qhy.captureOnce -> qhy.save` | 可用 | 已通过 |
| `tests/e2e/device-connect-capture.spec.ts` | 通用设备连接拍摄保存 | `device.gotoHome -> device.ensureDeviceSidebar -> device.connectIfNeeded -> device.ensureCapturePanel -> device.captureOnce -> device.save` | 可用 | 已通过 |
| `tests/e2e/update-page-refresh.spec.ts` | 页面刷新加载 | `page.reload(waitUntil=networkidle)` | 可用 | 已通过 |
| `tests/e2e/verify-version.spec.ts` | 系统总版本读取/断言 | `device.gotoHome -> update.readTotalVersion`（或 `update.assertTotalVersion`） | 可用 | 未设置 `E2E_EXPECT_TOTAL_VERSION` 时走“读取模式”，本机打印 `UI_TOTAL_VERSION=0.0.0` |
| `tests/e2e/schedule-10rows-plan-complete.spec.ts` | 写入 10 行任务并执行到 idle | `device.connectIfNeeded` + 多次 `schedule.setupRowFull` + `schedule.startIfNotRunning` + `schedule.waitRunState(idle)` | 可用 | 已通过 |
| `tests/e2e/update-dialog-check.spec.ts` | 检测更新确认弹窗出现 | `page.goto('/')` -> 断言 `ui-confirm-dialog-root data-state=open` | 当前不可用 | 本机 30s 内始终 `closed` |
| `tests/e2e/live-fps-test.spec.ts` | 主相机切 Live 并检查 FPS | `device.connectIfNeeded -> device.ensureDeviceSidebarFor(MainCamera) -> ui.selectOption(ui-config-MainCamera-CaptureMode-select-0,'Live') -> ui.assertText(tb-root,'FPS')` | 当前不可用 | 本机缺少 `ui-config-MainCamera-CaptureMode-select-0` |
| `tests/e2e/qhy-guide-pa-schedule-10rows.spec.ts` | 主/导星/赤道仪 + PA + 写 10 行计划 | `device.connectIfNeeded(Main/Guider/Mount) -> mount.ensureParkedForTest -> guider.loopExposureOn -> pa.runOnce -> schedule.setupRowFull(1..10)` | 当前不可用 | 导星连接超时：`e2e-device-Guider-conn=disconnected` |
| `tests/e2e/all-interactive-prereqs.spec.ts` | 全交互 testId 前置可达性 smoke | 遍历 `interactive testIds` 并 `ensureForTestId(...,'assertExists')` | 当前不可用 | 本机最先失败于 `cp-btn-capture` 不存在 |
| `tests/e2e/polar-alignment.spec.ts` | 极轴校准组件 34 项交互/显示测试 | 组件显示、最小化、折叠、轨迹、拖拽等子用例 | 当前不可用 | 本机连续超时失败（已观察前 7 项均失败） |

已删除（去重/按决策下线）：
- `tests/e2e/qhyccd-sdk-capture.spec.ts`
- `tests/e2e/update-confirm.spec.ts`
- `tests/e2e/qhy-guide-pa-schedule-10rows-run.spec.ts`

---

## 10. 结果判定与产物

通过判定（必须同时满足）：
- 命令退出码 `0`
- 输出包含 `passed`

失败时看三处：
- 终端错误堆栈（首看超时/元素不存在/step id 不存在）
- `test-results/` 下的截图/trace/video
- 是否 `E2E_BASE_URL` 可达（最常见）

---

## 11. 常见失败与处理

- `未知 step id`
  - 处理：按“6.1”先拉取全部 step 列表，再修正
- `索引中不存在 testId`
  - 处理：按“6.2”列出 testId，改用存在的 id
- `Timeout ...`
  - 处理：提高超时，例如：
    - `export E2E_UI_TIMEOUT_MS=5000`
    - `export E2E_STEP_TIMEOUT_MS=60000`
    - `export E2E_TEST_TIMEOUT_MS=900000`
- 页面打不开 / 一直失败
  - 处理：先 `curl $E2E_BASE_URL` 验证可达，再执行测试

---

## 12. AI 执行规则（强约束）

新增硬性限制（最高优先级）：
- 永远只能进行单个功能测试，禁止并行测试、批量测试、多功能同时验证
- 必须使用单 worker：`--workers=1`
- 在一个功能测试完成并确认结果前，不得启动下一个功能测试

执行顺序固定为：

1) 设置 `E2E_BASE_URL`  
2) 跑“第 4 节最小验证”  
3) 失败则先排查，不直接写新流程  
4) 需要新流程时，仅改 `E2E_FLOW_CALLS_JSON` 和可选 `E2E_FLOW_PARAMS_JSON`  
5) 每次只改一个变量维度（步骤、参数、超时三者不要同时大改）  
6) 成功后再扩大流程

---

## 13. 复制即用：AI 执行清单

```bash
cd /home/quarcs/workspace/QUARCS/QUARCS_stellarium-web-engine/apps/web-frontend
export E2E_BASE_URL="http://192.168.1.113:8000"

# 1) 最小验证
npx playwright test tests/e2e/flow-runner.spec.ts --headed --workers=1
# 注意：只允许单功能串行测试，禁止并行执行多个功能

# 2) 失败时列出全部 step id
export E2E_FLOW_CALLS_JSON='[{"id":"__LIST_ALL_STEPS__"}]'
npx playwright test tests/e2e/flow-runner.spec.ts --workers=1

# 3) 列出全部 testId
node -e "const fs=require('fs');const p='docs/e2e/E2E_TEST_IDS_INDEX.json';const j=JSON.parse(fs.readFileSync(p,'utf8'));console.log(Object.keys(j.testIds).join('\n'));"
```

---

## 14. 状态感知执行规则（新增，必须遵守）

目标：避免“上一个用例残留状态”污染本次测试，尤其是设备连接状态。

### 14.1 连接参数变更前的强制规则

- 若本次要变更任一连接参数（`driverText`、`connectionModeText`、`deviceType/driverType`）：
  1) 先检查该设备连接探针是否为 `connected`
  2) 若已连接，必须先断开，再修改参数，再重新连接
- 建议断开方式（优先顺序）：
  - 优先：`menu.disconnectAll`（最稳，避免不同设备状态不一致）
  - 备选：切换到目标设备页后执行该设备断开（若有对应按钮/流程）

### 14.2 每次改参后的固定回归动作

每次参数设置完成后，必须执行：

1) `device.ensureCapturePanel`  
2) `device.captureOnce`  
3) `device.save`

不允许“只改参数不拍摄保存”就进入下一条参数组合。

### 14.3 单条用例内状态机

每条功能测试必须遵循下面状态机：

`检查状态 -> (必要时断开) -> 改参数 -> 连接 -> 功能动作 -> 拍摄 -> 保存 -> 记录结果`

---

## 15. 按功能区的全按钮测试方法（含状态处理）

说明：
- 所有功能区均使用 `--workers=1`
- 一次只测一个功能区，结束后再进入下一个
- 功能区内每次参数变化都执行“拍摄+保存”

### 15.1 设备管理（连接/驱动/连接方式）

覆盖点：
- `device.ensureDeviceSidebarFor`
- `device.connectIfNeeded`
- `menu.connectAll`
- `menu.disconnectAll`

执行顺序建议（每个设备都跑）：
1) 打开首页并进入对应设备页面  
2) 读取当前连接状态（probe）  
3) 若要改 `driverText/connectionModeText` 且当前已连接：先 `menu.disconnectAll`  
4) 设置新连接参数并连接  
5) 拍摄并保存  
6) 切换下一组连接参数，重复 2)-5)

### 15.2 主相机拍摄面板（Capture 按钮与曝光）

覆盖点：
- `device.setExposureTime`
- `device.captureOnce`
- `device.save`

曝光建议矩阵：
- `1ms, 10ms, 100ms, 1s, 5s, 10s, 30s, 60s, 120s, 300s, 600s`

执行方式：
- 每设置一个曝光值，立即执行一次 `captureOnce + save`

### 15.3 导星（Guider）

覆盖点：
- `guider.openChartPanel`
- `guider.loopExposureOn`
- `guider.loopExposureOff`
- `guider.loopExposureOnAndWaitImage`

执行方式：
- 每次切换导星循环状态后，回到主拍摄链做一次 `captureOnce + save`

### 15.4 赤道仪（Mount）

覆盖点：
- `mount.ensureParkedForTest`

执行方式：
- 每次执行 Park 状态动作后，执行一次 `captureOnce + save`

### 15.5 极轴校准（PA）

覆盖点：
- `pa.open`
- `pa.runOnce`
- `pa.exitIfOpen`

执行方式：
- 每次校准结束后，执行一次 `captureOnce + save`

### 15.6 计划任务（Schedule）

覆盖点：
- 行编辑：`setTarget*`、`setRaDec`、`setShootTime`、`setExposure*`、`setFilterByIndex`、`setReps`、`setFrameTypeByIndex`、`setRefocusByIndex`、`setExpDelaySeconds`
- 运行控制：`startIfNotRunning`、`pauseIfRunning`、`waitRunState`
- 行管理/预设：`addRow`、`deleteSelectedRow`、`trimRows`、`preset.*`

执行方式：
- 每改完一个关键字段，执行一次 `captureOnce + save`
- 每完成一整行配置，再执行一次 `captureOnce + save`

### 15.7 菜单/弹窗与图像管理

覆盖点：
- 菜单：`menu.open*`、`menu.confirmDialogConfirm/Cancel`
- 文件管理：`fm.open`、`fm.openFolder`、`fm.openFile`

执行方式：
- 每次菜单动作或文件打开动作后，执行一次 `captureOnce + save`

---

## 16. 可直接复制的状态感知 Flow 模板

### 16.1 变更连接方式前先断开（核心模板）

```bash
export E2E_FLOW_CALLS_JSON='[
  {"id":"device.gotoHome"},
  {"id":"menu.disconnectAll"},
  {"id":"device.ensureDeviceSidebarFor","params":{"driverType":"MainCamera"}},
  {"id":"device.connectIfNeeded","params":{"deviceType":"MainCamera","driverText":"QHYCCD","connectionModeText":"SDK"}},
  {"id":"device.ensureCapturePanel"},
  {"id":"device.captureOnce","params":{"waitCaptureTimeoutMs":180000}},
  {"id":"device.save","params":{"doSave":true}}
]'
npx playwright test tests/e2e/flow-runner.spec.ts --headed --workers=1
```

### 16.2 仅改曝光参数并立即拍摄保存

```bash
export E2E_FLOW_CALLS_JSON='[
  {"id":"device.gotoHome"},
  {"id":"device.ensureDeviceSidebarFor","params":{"driverType":"MainCamera"}},
  {"id":"device.connectIfNeeded","params":{"deviceType":"MainCamera","driverText":"QHYCCD","connectionModeText":"SDK"}},
  {"id":"device.setExposureTime","params":{"exposure":"10s"}},
  {"id":"device.ensureCapturePanel"},
  {"id":"device.captureOnce","params":{"waitCaptureTimeoutMs":180000}},
  {"id":"device.save","params":{"doSave":true}}
]'
npx playwright test tests/e2e/flow-runner.spec.ts --headed --workers=1
```

### 16.3 同一设备切换连接模式（A -> B）

```bash
# 先测模式 A
export E2E_FLOW_CALLS_JSON='[
  {"id":"device.gotoHome"},
  {"id":"menu.disconnectAll"},
  {"id":"device.ensureDeviceSidebarFor","params":{"driverType":"MainCamera"}},
  {"id":"device.connectIfNeeded","params":{"deviceType":"MainCamera","driverText":"QHYCCD","connectionModeText":"SDK"}},
  {"id":"device.captureOnce","params":{"waitCaptureTimeoutMs":180000}},
  {"id":"device.save","params":{"doSave":true}}
]'
npx playwright test tests/e2e/flow-runner.spec.ts --headed --workers=1

# 再测模式 B（必须先断开）
export E2E_FLOW_CALLS_JSON='[
  {"id":"device.gotoHome"},
  {"id":"menu.disconnectAll"},
  {"id":"device.ensureDeviceSidebarFor","params":{"driverType":"MainCamera"}},
  {"id":"device.connectIfNeeded","params":{"deviceType":"MainCamera","driverText":"QHYCCD","connectionModeText":"INDI"}},
  {"id":"device.captureOnce","params":{"waitCaptureTimeoutMs":180000}},
  {"id":"device.save","params":{"doSave":true}}
]'
npx playwright test tests/e2e/flow-runner.spec.ts --headed --workers=1
```

本文件即执行规范，不需要额外查阅源码。
