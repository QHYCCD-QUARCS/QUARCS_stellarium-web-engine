# tests 目录文件作用说明

> 路径：`apps/web-frontend/tests`  
> 目标：说明当前目录下各文件/子目录职责，便于维护、扩展和排查。

---

## 1. 总体结构

当前 `tests` 目录主要由以下部分组成：

- `AI_TEST_PLAYBOOK.md`：E2E 测试执行手册（环境准备、运行方式、排障规则）。
- `e2e/flows/`：流程步骤层（step registry），封装可复用业务动作。
- `e2e/feature-by-feature/`：按功能组合的轻量用例，依赖 `flows`。
- `e2e/test001/`：专项/重型业务脚本，每个文件内含大量独立流程细节。
- `e2e/ai/`：AI 相关 schema、执行器、UI 快照与 testId 检索工具。
- `e2e/support/`：测试公共支撑（启动路径、交互 testId 清单）。

---

## 2. 根目录文件

### `AI_TEST_PLAYBOOK.md`

- 用途：E2E 单文件操作指南。
- 内容覆盖：
  - 环境准备（依赖安装、Playwright 安装）
  - `E2E_BASE_URL` 与运行命令模板
  - `flow-runner` 的标准调用方式
  - 可用 `step id` / `testId` 的发现方式
  - 常见失败处理与执行约束（例如单 worker 串行）

### `TESTS_DIRECTORY_ANALYSIS.md`

- 用途：本说明文档，记录 `tests` 当前结构与各文件职责。

---

## 3. `e2e/ai`（AI 辅助层）

### `e2e/ai/actionSchema.ts`

- 定义 AI 可产出的动作结构（点击、输入、等待、断言等）。
- 是 AI 规划动作与执行动作之间的协议类型。

### `e2e/ai/executeStep.ts`

- 将 `ActionStep` 映射为 Playwright 操作。
- 提供统一执行入口，按 `step.kind` 分发。

### `e2e/ai/testIdIndex.ts`

- 从 `docs/e2e/E2E_TEST_IDS_INDEX.json` 加载 testId 索引。
- 提供基于目标文本与当前可见元素的 testId 候选推荐能力。

### `e2e/ai/uiModel.ts`

- 采集当前页面可见 `data-testid` 元素快照。
- 输出简化 UI 状态模型（URL、标题、节点属性），用于 AI 上下文输入。

---

## 4. `e2e/support`（公共支撑）

### `e2e/support/appStartPath.ts`

- 统一构建应用启动路径及 query 参数。
- 支持通过环境变量覆盖 WS/后端 host/port 等连接目标。

### `e2e/support/interactiveTestIds.ts`

- 基于 testId 索引识别“可交互控件”。
- 同时标记潜在高风险/破坏性控件（用于 smoke 安全策略）。

---

## 5. `e2e/flows`（可复用步骤层，核心）

### `e2e/flows/flowTypes.ts`

- 定义流程执行所需类型：
  - `FlowContext`
  - `FlowStepCall`
  - `FlowStepDefinition`
  - `StepRegistry`

### `e2e/flows/flowRunner.ts`

- 流程执行引擎。
- 负责：
  - 解析环境变量中的 flow 定义
  - 合并全局参数和步骤参数
  - 按顺序执行注册步骤
  - 支持失败忽略和步骤间延时

### `e2e/flows/helpers.ts`

- 通用交互工具集（复用度高）：
  - testId 拼装与规范化
  - 安全点击/输入（可见+可操作检查）
  - 状态等待（如 `data-state`）
  - 菜单抽屉开合保障
  - 拍摄 UI 可见性保障

### `e2e/flows/prereq.ts`

- 提供前置条件断言：
  - testId 存在
  - testId 可见

### `e2e/flows/uiAtomicSteps.ts`

- UI 原子步骤注册：
  - `ui.goto`、`ui.click`、`ui.type`
  - `ui.waitVisible`、`ui.waitState`
  - `ui.assert*` 等

### `e2e/flows/testIdAliasSteps.ts`

- 动态生成 `tid.<testId>.<action>` 形式别名步骤。
- 让流程可直接基于具体 testId 调用动作。

### `e2e/flows/deviceSteps.ts`

- 设备与拍摄核心步骤：
  - 侧边栏打开
  - 设备连接/断开
  - 设备分配面板绑定
  - 拍摄面板保障
  - 单次拍摄、保存、曝光调整

### `e2e/flows/qhyccdSteps.ts`

- `deviceSteps` 的 QHY 主相机别名层。
- 默认注入：
  - `deviceType=MainCamera`
  - `driverText=QHYCCD`
  - `connectionModeText=SDK`

### `e2e/flows/guiderSteps.ts`

- 导星相关步骤：
  - 图表面板打开
  - 循环曝光开关
  - 等待新图像到来

### `e2e/flows/mountSteps.ts`

- 赤道仪步骤：
  - 确保 Mount 面板可见
  - 确保 Park 状态收敛

### `e2e/flows/polarAxisSteps.ts`

- 极轴校准步骤：
  - 打开极轴面板
  - 执行一次自动校准
  - 最小化退出

### `e2e/flows/scheduleSteps.ts`

- 计划任务面板步骤：
  - 打开/关闭
  - 启停与运行态等待
  - 行增删与预设弹窗基础动作
- 说明：部分步骤当前为占位未实现（会主动抛错提示）。

### `e2e/flows/menuSteps.ts`

- 菜单相关步骤：
  - 连接全部 / 断开全部
  - 确认弹窗确认/取消
  - 打开电源管理、调试日志、总设置、刷新确认弹窗

### `e2e/flows/fileManagerSteps.ts`

- 图像文件管理步骤：
  - 打开面板
  - 打开文件夹
  - 打开文件

### `e2e/flows/updateSteps.ts`

- 版本/更新步骤：
  - 打开版本信息页签
  - 读取总版本号
  - 断言总版本号
  - 关闭设置对话框

---

## 6. `e2e/feature-by-feature`（轻量功能用例层）

### `_shared.ts`

- 聚合所有步骤注册表并提供统一执行入口 `runFeatureFlow`。
- 统一处理 timeout 和全局默认参数。

### `01-device-connection-mode-switch.spec.ts`

- 验证设备连接模式切换流程（切换前先断开）。

### `02-maincamera-exposure-matrix.spec.ts`

- 逐个曝光参数执行拍摄与保存。

### `03-guider-loop-exposure.spec.ts`

- 覆盖导星循环曝光动作，并回归主相机拍摄保存。

### `04-mount-park.spec.ts`

- 覆盖赤道仪 Park 动作，并回归拍摄保存。

### `05-polar-axis-calibration.spec.ts`

- 覆盖极轴校准主流程并回归拍摄保存。

### `06-schedule-single-row.spec.ts`

- 覆盖单行计划任务字段与运行控制（依赖 schedule 步骤实现完备度）。

### `07-menu-dialogs.spec.ts`

- 覆盖菜单和弹窗动作后回归拍摄保存。

### `08-file-manager-open.spec.ts`

- 覆盖图像管理打开文件路径并回归拍摄保存。

### `09-update-version-check.spec.ts`

- 版本读取/校验完成后回归拍摄保存。

---

## 7. `e2e/test001`（专项重型用例层）

### `1-general-settings-all-interactions.spec.ts`

- 总设置页（Display/Version/Memory）的全交互覆盖及关键分支断言。

### `2-power-management-menu-and-dialogs.spec.ts`

- 电源管理入口与危险操作确认弹窗取消分支覆盖。

### `3-guider-qhyccd-two-connections-loop.spec.ts`

- 导星 QHYCCD 在 INDI/SDK 两种连接模式下循环曝光稳定性验证。

### `4-maincamera-qhyccd-two-connections-loop.spec.ts`

- 主相机 QHYCCD 双模式验证、参数调节、滤镜轮联动、200 帧连续拍摄。

### `5-mount-eqmod-connect-control-goto.spec.ts`

- EQMod 赤道仪连接与控制全链路：Park/Track/GOTO/Home。

### `6-telescopes-set-focal-length-510.spec.ts`

- 望远镜焦距字段设置（默认 510，可由环境变量覆盖）。

### `7-focuser-connect-control-position.spec.ts`

- 电调连接、面板控制、位置变化记录与操作链路验证。

### `8-cfw-switching-capture-and-config.spec.ts`

- 滤镜轮在拍摄面板与配置菜单两路切换验证。

### `9-polar-axis-calibration-menu-and-widget.spec.ts`

- 极轴校准入口、组件显示、设备前置状态与校准执行全流程。

### `10-image-file-manager.spec.ts`

- 图像管理完整流程：无数据分支处理 + 文件夹/文件/下载/删除等动作覆盖。

---

## 8. 当前分层定位（维护建议）

- `flows`：动作能力层（可复用、可组合）。
- `feature-by-feature`：推荐日常回归入口（结构清晰、扩展成本低）。
- `test001`：专项深测与历史沉淀（覆盖深，但脚本较重、重复逻辑较多）。

建议后续逐步把 `test001` 中稳定能力下沉到 `flows`，再由 `feature-by-feature` 组合，以降低维护复杂度。

