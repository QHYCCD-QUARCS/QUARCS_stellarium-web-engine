#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
从 QUARCS web-frontend 源码自动提取 WebSocket 协议约定，并生成三份 UTF-8（带 BOM）CSV 协议表。

【背景与目的】
  浏览器与设备侧通过 Hub/WebSocket 交换 JSON 文本帧：顶层含 type、msgid、message 等字段；
  业务命令通常以 `message` 字符串承载（冒号分段、管道符、Base64 等）。本脚本把分散在
  `src/**/*.vue` 与 `App.vue` 里的静态约定汇总成表，便于对照 Qt 服务端（MainWindow）与
  宿主进程（QuarcsMonitor）实现替代前端或联调，而无需手工维护冗长列表。

【三份输出文件的作用】
  1) frontend-to-backend-commands.csv（前端 → Hub/后端方向）
     扫描 `sendMessage('Vue_Command'|'Broadcast_Msg'|'Process_Command_Return', '...')` 等
     字面量，去重后列出每条命令的协议类型、消息前缀、静态示例、参数说明、与 MainWindow
     是否匹配、源文件路径及前后端说明列。
  2) backend-to-frontend-messages.csv（后端 → 前端方向）
     汇总 `QT_Confirm`、`Process_Command` 若干子类型、`QT_Return` 下 switch 前特殊前缀
     以及 `App.vue` 中 `switch (messageType)` 的动态 case 列表（switch 块按括号平衡截取，
     避免行号漂移）。列含解析规律（解析方法）、参数含义（辅助，完整语义以 case 内后续使用为准）、
     当前返回信息（本帧业务概要，由 $bus 名/注释/映射等自动摘要）。
  3) unified-websocket-protocol.csv（统一协议总表）
     合并信封层说明、特判前缀、Process OTA 与 Process_Command_Return 专行、全部出站命令
     行、以及每个 QT_Return case 的摘要；列含 **解析规律**、**参数含义**（后端下行 message
     如何拆、各段语义）、传输类型、方向、载荷结构、权威来源、风险等级等，表头为中文。
  4) backend-to-frontend-messages.csv 与统一表一致含「解析规律」「参数含义」列（入站消息）。

【可选外部仓库（若与本工程同级存在）】
  - QUARCS_QT-SeverProgram/src/mainwindow.cpp：正则抽取 parts[0]/message 分支提示，写入
    统一表的「权威来源」合并字段。
  - QUARCS_Process/src/quarcsmonitor.cpp：抽取 messageList[0] 分支提示，用于
    Process_Command_Return 相关说明。

【重要约定（阅读 CSV 时请注意）】
  - 出站命令与 `backend_param_match` 列来自脚本内 `notes_for_row` 等映射，若 Qt 分支
    变更需同步更新脚本；「否/部分」表示可能与 MainWindow 未匹配或历史遗留。
  - 入站 `message` 若含 JSON 或额外冒号，必须先按 App.vue 中 `startsWith` 特判再解析，
    不可仅用 `split(':')`。
  - 统一表内部分行 `compatibility_status` 为 frontend_gap（如 Process 的 update_failed）
    表示宿主会发但当前前端可能未单独分支，新实现时应显式处理或标注忽略。
  - 单页说明（含各 CSV 文件作用、WebSocket 连接摘要、`parts[0]`、载荷额外冒号需 slice/join）：
    见 **protocol/README.md**（与本脚本同目录的 protocol/，非脚本生成）。

【WebSocket 连接与发送逻辑是否在本产物中】
  - 三份 CSV **不**逐行描述连接、重连、证书选项等；它们只索引「已连接之后」收发的
    `type` 与 `message` 业务串。统一表首行「信封」类记录中有简要指向 App.vue 的
    `sendMessage` / `websocket.onmessage`。
  - 实际连接与发送实现请在源码中阅读（本仓库）：
    - **URL**：`getLocationHostName()` 等设置 `WebSocketUrl`（通常 wss/ws + 主机名 + 端口
      8601/8600）。
    - **连接**：`connect()` 内 `new WebSocket(this.WebSocketUrl, [], { rejectUnauthorized: false })`，
      `onopen` 里更新状态、`StatusRecovery`、`$bus` 等。
    - **发送**：`sendMessage(type, message)` 生成 `{ type, msgid, message }`，`JSON.stringify`
      后 `websocket.send`；`sentMessages` 队列与 `QT_Confirm` 时 `handleMessageResponse(msgid)` 配对。
    - **接收**：`onmessage` 里 `JSON.parse(message.data)`，按 `data.type` 分至 `QT_Return` /
      `QT_Confirm` / `Process_Command` 等分支（与 CSV 中各表对应）。
  - Qt 侧 Hub 封装见 QUARCS_QT-SeverProgram 的 `websocketclient.cpp`；宿主进程见
    QUARCS_Process 的 `websocketclient.cpp`。

【用法】
  在 apps/web-frontend 目录下执行:
    python3 scripts/export-websocket-protocol-csv.py

【输出】
  protocol/frontend-to-backend-commands.csv
  protocol/backend-to-frontend-messages.csv
  protocol/unified-websocket-protocol.csv
  protocol/README.md（前端 WebSocket 连接/收发说明与本目录文件作用，非脚本生成）
  三份 CSV 第一行表头均为中文；单元格内仍保留协议原文（如英文命令名、JSON 片段）。

【实现说明】
  统一协议总表构建逻辑与本脚本合并为单文件，不再依赖已删除的 unified_websocket_protocol.py。
"""
from __future__ import annotations

import csv
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP_VUE = ROOT / "src" / "App.vue"
PROTO_DIR = ROOT / "protocol"

MW = "QUARCS_QT-SeverProgram/src/mainwindow.cpp::MainWindow::onMessageReceived"
PM = "QUARCS_Process/src/quarcsmonitor.cpp::QuarcsMonitor（Process_Command_Return）"


def read_text(p: Path) -> str:
    return p.read_text(encoding="utf-8", errors="replace")

# ---------------------------------------------------------------------------
# 统一协议总表（逻辑原 unified_websocket_protocol.py，表头输出为中文）
# ---------------------------------------------------------------------------
UNIFIED_FIELDS_EN = [
    "id",
    "transport_type",
    "envelope_type",
    "signal_name",
    "direction",
    "wire_format",
    "payload_schema",
    "field_constraints",
    "preconditions",
    "success_responses",
    "error_responses",
    "state_side_effects",
    "compatibility_status",
    "source_of_truth",
    "frontend_consume_path",
    "parse_rule",
    "parameter_meaning",
    "risk_tier",
    "notes",
]

UNIFIED_FIELDS_CN = [
    "序号",
    "传输类型",
    "信封类型",
    "信号名",
    "方向",
    "线上格式",
    "载荷结构",
    "字段约束",
    "前置条件",
    "成功响应",
    "错误响应",
    "状态副作用",
    "兼容状态",
    "权威来源",
    "前端消费路径",
    "解析规律",
    "参数含义",
    "风险等级",
    "备注",
]


def discover_sibling_repo(web_frontend_root: Path, folder_name: str) -> Path | None:
    """在 web-frontend 上级目录链中查找同级 QUARCS 仓库（如 QUARCS/QUARCS_QT-SeverProgram）。"""
    p = web_frontend_root.resolve()
    for _ in range(10):
        cand = p.parent / folder_name
        if cand.is_dir():
            return cand
        if p.parent == p:
            break
        p = p.parent
    return None


def extract_qt_mainwindow_hints(mainwindow: Path) -> dict[str, str]:
    """从 MainWindow::onMessageReceived 抽取 parts[0]/message 关键字，供 source_of_truth 合并。"""
    if not mainwindow.is_file():
        return {}
    text = read_text(mainwindow)
    hints: dict[str, str] = {}
    patterns = [
        (r'parts\[0\]\.trimmed\(\)\s*==\s*"([^"]+)"', "parts[0]=="),
        (r'parts\[0\]\s*==\s*"([^"]+)"', "parts[0]=="),
        (r'message\.trimmed\(\)\s*==\s*"([^"]+)"', "message=="),
        (r'message\.startsWith\("([^"]+)"', "startsWith"),
    ]
    for pat, kind in patterns:
        for m in re.finditer(pat, text):
            key = m.group(1).strip()
            if not key or len(key) > 120:
                continue
            val = f"Qt mainwindow.cpp | {kind} \"{key}\""
            if key not in hints or len(val) > len(hints[key]):
                hints[key] = val
    return hints


def extract_process_monitor_hints(quarcs_monitor: Path) -> dict[str, str]:
    """从 QuarcsMonitor::receivedMessage 抽取 messageList[0] 分支。"""
    if not quarcs_monitor.is_file():
        return {}
    text = read_text(quarcs_monitor)
    hints: dict[str, str] = {}
    for m in re.finditer(r'messageList\[0\]\s*==\s*"([^"]+)"', text):
        k = m.group(1)
        hints[k] = f"Process quarcsmonitor.cpp | messageList[0]==\"{k}\""
    return hints


# ---------------------------------------------------------------------------
# 后端下行 message：解析规律（解析方法）/ 参数含义（与 App.vue 一致；无映射时回退到 case 摘要）
# 参数含义列仅为辅助；各段完整语义须结合 case 内解析之后的赋值、$bus、子组件使用判定。
# ---------------------------------------------------------------------------
GENERIC_QT_SWITCH_PARSE_RULE = (
    "① 先经 switch 前 startsWith 特判（NetStatus|、DownloadManifest: 等），勿对整段盲目 split(':')。"
    "② 进入 switch(messageType) 后常写：parts=data.message.split(':'); messageType=parts[0]。"
    "③ 若业务串需保留 ':'，在 case 内用 parts.slice(1).join(':') 或 indexOf/substring。"
)


def qt_switch_case_parse_rule(case_name: str) -> str:
    return GENERIC_QT_SWITCH_PARSE_RULE + f" 当前 case：「{case_name}」。"


# 各 QT_Return case 的参数语义（有则优先，否则用注释+摘要模板）
QT_RETURN_PARAM_MEANING: dict[str, str] = {
    "GuiderStatus": "parts[1]: 导星状态字符串；由 case 内 $bus 传给导星界面。",
    "GuiderSwitchStatus": "parts[1] 起：导星开关/循环曝光等状态；以 case 内解析为准。",
    "GuiderLoopExpStatus": "parts[1] 起：导星循环曝光状态。",
    "ExposureCompleted": "主相机曝光完成通知；段数与含义以 case 内解析（可能含路径/FPS 等）。",
    "ExposureFailed": "parts[1] 起：曝光失败原因或错误码。",
    "LiveFPS": "parts[1]: Live 预览帧率（字符串转数值）。",
    "LiveProcessFPS": "parts[1]: 处理后 Live 帧率。",
    "ConnectSuccess": "parts[1] 起：设备连接成功相关字段（设备名/类型等）。",
    "ConnectFailed": "parts[1] 起：连接失败原因。",
    "AddDeviceType": "parts[1..]: 设备类型及索引等，用于设备列表 UI。",
    "DeviceToBeAllocated": "parts[1..]: 待分配设备类型、索引、名称等。",
    "GuideSize": "parts[1], parts[2]: 导星窗口列/行等尺寸。",
    "AddScatterChartData": "parts[1..]: 散点图数据点。",
    "AddLineChartData": "parts[1..]: RA/Dec 曲线数据点。",
    "AddRMSErrorData": "parts[1..]: RMS 误差（RA/Dec/总）。",
    "SetLineChartRange": "parts[1..]: 曲线纵轴范围。",
    "FocusPosition": "parts[1], parts[2]: 电调当前位置与目标位置等。",
    "FocusChangeSpeedSuccess": "parts[1]: 对焦速度设定结果。",
    "FocusMoveDone": "电调移动完成通知；段数以 case 为准。",
    "TelescopeRADEC": "parts[1..]: 望远镜当前 Ra/Dec（单位以 case 内为准）。",
    "TelescopeStatus": "parts[1..]: 望远镜状态摘要。",
    "TelescopePark": "赤道仪停放状态相关字段。",
    "TelescopeTrack": "跟踪开关状态相关字段。",
    "MainCameraStatus": "主相机状态。",
    "MainCameraTemperature": "parts[1]: 传感器温度等。",
    "MainCameraSize": "parts[1], parts[2]: 主相机宽高。",
    "MainCameraBinning": "parts[1]: binning。",
    "CameraInExposuring": "parts[1]: 是否正在曝光（布尔/枚举字符串）。",
    "AutoFocusOver": "自动对焦结束；子段含结果摘要。",
    "AutoFocusModeChanged": "parts[1]: 粗对焦/细对焦等模式。",
    "ScheduleComplete": "计划任务完成通知。",
    "UpdateScheduleProcess": "parts[1..]: 计划执行进度。",
    "ExpTimeList": "parts[1]: 曝光时间列表字符串。",
    "getCFWList": "parts[1]: 滤镜轮槽位名称列表。",
    "CFWPositionMax": "parts[1]: 滤镜槽位数上限等。",
    "SetCFWPositionSuccess": "滤镜轮到位成功。",
    "SetCFWPositionFailed": "滤镜轮到位失败及原因。",
    "WhiteBalanceGains": "parts[1..]: 白平衡增益等。",
    "ErrorMessage:": "parts[1] 起：错误说明文本（若含 ':' 用 join 还原）。",
    "PHD2Log:": "PHD2 日志行；子段为日志内容。",
    "PolarAlignmentState:": "极轴校准状态机字段。",
    "SolveResult:": "plate solve 结果串。",
    "MeridianFlip:": "子午线翻转相关状态。",
}


def qt_switch_case_parameter_meaning(
    case_name: str,
    first_comment: str,
    case_summary: str,
) -> str:
    """生成入站表「参数含义」：有手工映射用映射，否则用注释与代码摘要；完整语义以 case 后续使用为准。"""
    if case_name in QT_RETURN_PARAM_MEANING:
        return QT_RETURN_PARAM_MEANING[case_name]
    cmt = (first_comment or "").strip()
    cmt_part = f" case 首行注释：{cmt}。" if cmt else ""
    return (
        f"parts[0]: 与 Qt 约定的下行关键字「{case_name}」。"
        f"parts[1] 及之后：以 App.vue 该 case 内对 parts 的解析为准。{cmt_part}"
        f" 代码摘要：{_summarize_case_body(case_summary, 240)}"
    )


def build_incoming_return_info(case_name: str, det: dict[str, str]) -> str:
    """入站 CSV「当前返回信息」列：概括本帧 `data.message` 传递的业务信息（非旧「前端用途」）。"""
    bus = (det.get("bus_events") or "").strip()
    comment = (det.get("first_comment") or "").strip()
    bits: list[str] = []
    if bus:
        bits.append("向下游抛出 $bus 事件: " + bus.replace("|", "、"))
    if comment:
        bits.append(comment)
    if not bits and case_name in QT_RETURN_PARAM_MEANING:
        return QT_RETURN_PARAM_MEANING[case_name]
    if not bits:
        return "见参数含义列及 App.vue case 内赋值/$bus"
    return "；".join(bits)


def extract_switch_block_for_message_type(app_vue_lines: list[str]) -> str:
    """提取 `switch (messageType) { ... }` 整块源码（括号平衡）。"""
    start = None
    for i, line in enumerate(app_vue_lines):
        if "switch (messageType)" in line:
            start = i
            break
    if start is None:
        return ""
    brace = 0
    started = False
    end = start
    for i in range(start, len(app_vue_lines)):
        for ch in app_vue_lines[i]:
            if ch == "{":
                brace += 1
                started = True
            elif ch == "}":
                brace -= 1
        if started and brace == 0:
            end = i
            break
    return "\n".join(app_vue_lines[start : end + 1])


def _summarize_case_body(body: str, max_len: int = 320) -> str:
    # 去掉多余空白
    one = re.sub(r"\s+", " ", body).strip()
    if len(one) > max_len:
        return one[: max_len - 3] + "..."
    return one


def extract_qt_return_case_details(switch_block: str) -> list[dict[str, str]]:
    """
    从 switch 块解析每个 case 名称与摘要（用于 payload_schema / frontend_consume_path）。
    """
    chunks = re.split(r"(?=\n\s*case\s+')", switch_block)
    out: list[dict[str, str]] = []
    for chunk in chunks:
        m = re.match(r"^\s*case\s+'([^']+)'\s*:\s*", chunk, re.DOTALL)
        if not m:
            continue
        name = m.group(1)
        body = chunk[m.end() :]
        dm = re.search(r"\n\s*default\s*:", body)
        if dm:
            body = body[: dm.start()]
        # 提取 $bus / SendConsoleLog / 注释首行
        bus_emit = re.findall(r"\$bus\.\$emit\(\s*'([^']+)'", body)
        comment = ""
        for line in body.splitlines():
            line = line.strip()
            if line.startswith("//"):
                comment = line.lstrip("/ ").strip()
                break
        summary = _summarize_case_body(body)
        out.append(
            {
                "case_name": name,
                "case_summary": summary,
                "first_comment": comment,
                "bus_events": "|".join(dict.fromkeys(bus_emit)) if bus_emit else "",
            }
        )
    return out


# 高风险信号：用于 risk_tier 与人工核对提示
HIGH_RISK_PREFIXES = frozenset(
    {
        "update_progress",
        "update_error",
        "update_success",
        "update_failed",
        "update_sequence_start",
        "update_sequence_step",
        "update_sequence_finished",
        "update_sequence_failed",
        "checkHasNewUpdatePack",
        "NetStatus|",
        "WiFiScan|",
        "WiFiSaveResult|",
        "NetModeResult|",
        "DownloadManifest:",
        "AutoFocus",
        "PolarAlignment",
        "Guider",
        "Solve",
        "Exposure",
        "Meridian",
        "Flip",
    }
)


def _risk_tier_for_signal(name: str) -> str:
    n = name
    if any(p in n for p in HIGH_RISK_PREFIXES):
        return "high"
    if n.startswith("PHD2") or "Mount" in n or "Telescope" in n:
        return "medium"
    return "normal"


def build_envelope_doc_rows() -> list[dict[str, str]]:
    """Hub 外层 JSON 与各 type 的职责（协议信封层）。"""
    rows = [
        {
            "transport_type": "websocket_text_json",
            "envelope_type": "meta",
            "signal_name": "(envelope)",
            "direction": "bidirectional",
            "wire_format": '单帧 UTF-8 文本；内容为 JSON 对象，至少含 type、msgid；业务载荷在 message 字符串字段。',
            "payload_schema": '{"type":string,"msgid":string,"message"?:string,...}',
            "field_constraints": "type 决定路由；Vue_Command/Process_Command_Return 等会触发 QT_Confirm（仅 msgid 回执）。",
            "preconditions": "WebSocket 已连接；HTTPS/HTTP 双通道由 Qt WebSocketClient 实现。",
            "success_responses": "依 type：QT_Confirm 仅表示 Hub 已收到；业务结果在 QT_Return/Process_Command 的 message。",
            "error_responses": "连接断开、JSON 解析失败、未处理 type 时由各端日志处理。",
            "state_side_effects": "无全局业务状态；仅连接状态 UI。",
            "compatibility_status": "stable",
            "source_of_truth": "QUARCS_QT-SeverProgram/src/websocketclient.cpp; apps/web-frontend/src/App.vue sendMessage/onmessage",
            "frontend_consume_path": "App.vue websocket.onmessage",
            "parse_rule": "① JSON.parse(文本帧)。② 读顶层 type、msgid；业务串在 message（若有）。③ 再按 type 进入分支。",
            "parameter_meaning": "type：路由键。msgid：与发送队列配对。message：业务载荷（部分 type 无）。",
            "risk_tier": "high",
            "notes": "实现替代前端时必须先实现 JSON 信封与 msgid 追踪。",
        },
        {
            "transport_type": "websocket_text_json",
            "envelope_type": "Vue_Command",
            "signal_name": "Vue_Command",
            "direction": "browser_to_hub",
            "wire_format": '{"type":"Vue_Command","msgid":"...","message":"<command string>"}',
            "payload_schema": "message 为纯文本命令；多数为冒号分隔段 parts[0] 为命令名。",
            "field_constraints": "同一命令短时重复整串可能被 Qt 防抖丢弃（MainWindow）。",
            "preconditions": "Qt Server 已连接并路由到 MainWindow::onMessageReceived。",
            "success_responses": "QT_Confirm + 异步多条 QT_Return（无固定一一映射）。",
            "error_responses": "Unknown message 日志；部分命令返回 ErrorMessage: 前缀字符串。",
            "state_side_effects": "设备/拍摄/导星等状态由具体命令决定。",
            "compatibility_status": "stable",
            "source_of_truth": "QUARCS_QT-SeverProgram/src/mainwindow.cpp::onMessageReceived",
            "frontend_consume_path": "App.vue sendMessage('Vue_Command', ...)",
            "parse_rule": "不适用（浏览器→Hub 上行；本行描述 Hub 侧如何读入见 Qt MainWindow）。",
            "parameter_meaning": "message 串多为「命令:参数…」；与下行 QT_Return 解析无关。",
            "risk_tier": "high",
            "notes": "勿假设 message 仅用 split(':')；见 wifiSaveB64|、saveSchedulePreset、MountGoto 等变体。",
        },
        {
            "transport_type": "websocket_text_json",
            "envelope_type": "QT_Return",
            "signal_name": "QT_Return",
            "direction": "hub_to_browser",
            "wire_format": '{"type":"QT_Return","message":"<payload string>"}',
            "payload_schema": "message 内再分：管道 NetStatus|JSON、或冒号分段、或首段为 case 名。",
            "field_constraints": "JSON 载荷若含 ':' 必须在 switch 前用 startsWith 特判（见 App.vue）。",
            "preconditions": "Qt 侧 messageSend 封装为 QT_Return。",
            "success_responses": "前端 switch(messageType) 或特殊前缀处理。",
            "error_responses": "未命中 case 走 default 控制台 warn。",
            "state_side_effects": "$bus 事件与组件状态更新。",
            "compatibility_status": "stable",
            "source_of_truth": "apps/web-frontend/src/App.vue QT_Return 分支",
            "frontend_consume_path": "App.vue onmessage -> QT_Return",
            "parse_rule": GENERIC_QT_SWITCH_PARSE_RULE,
            "parameter_meaning": "data.message 整段为业务串；先特判前缀再 switch；各子类型见本表每条 QT_Return 行的「解析规律/参数含义」。",
            "risk_tier": "high",
            "notes": "message 与 data.message 全文一致；parts 仅用于非 JSON 嵌套场景。",
        },
        {
            "transport_type": "websocket_text_json",
            "envelope_type": "QT_Confirm",
            "signal_name": "QT_Confirm",
            "direction": "hub_to_browser",
            "wire_format": '{"type":"QT_Confirm","msgid":"..."}',
            "payload_schema": "无业务 message；msgid 对应发送时的投递确认。",
            "field_constraints": "与 sentMessages 队列、handleMessageResponse 配对。",
            "preconditions": "此前已发送带 msgid 的 Vue_Command 等。",
            "success_responses": "handleMessageResponse 标记成功。",
            "error_responses": "超时策略见前端实现。",
            "state_side_effects": "更新消息发送状态 UI/日志。",
            "compatibility_status": "stable",
            "source_of_truth": "apps/web-frontend/src/App.vue",
            "frontend_consume_path": "handleMessageResponse",
            "parse_rule": "无 message 业务串；仅比对 data.msgid 与 sentMessages。",
            "parameter_meaning": "msgid：与此前 sendMessage 生成的 id 对应，表示 Hub 已收到该帧。",
            "risk_tier": "normal",
            "notes": "",
        },
        {
            "transport_type": "websocket_text_json",
            "envelope_type": "Process_Command",
            "signal_name": "Process_Command",
            "direction": "process_to_browser",
            "wire_format": '{"type":"Process_Command","message":"<payload>"}',
            "payload_schema": "message 多为冒号分段，parts[0] 为子类型。",
            "field_constraints": "与 QUARCS_Process WebSocketClient::messageSend 一致。",
            "preconditions": "QuarcsMonitor 存活并已连接 Hub。",
            "success_responses": "App.vue 内分支或 $bus 转发。",
            "error_responses": "update_error / update_failed 等；未处理前缀会 console.warn。",
            "state_side_effects": "OTA 对话框、重启提示等。",
            "compatibility_status": "stable",
            "source_of_truth": "QUARCS_Process/src/quarcsmonitor.cpp",
            "frontend_consume_path": "App.vue Process_Command 分支",
            "parse_rule": "parts = data.message.split(':'); 以 parts[0] 为子命令；载荷含额外 ':' 时用 slice/join。",
            "parameter_meaning": "parts[0]：宿主子类型（qtServerIsOver、update_* 等）；后续段含义见本表 Process_Command 展开行。",
            "risk_tier": "high",
            "notes": "含 OTA：update_progress/update_error/update_success/update_sequence_*；另有 update_failed（脚本退出码）。",
        },
        {
            "transport_type": "websocket_text_json",
            "envelope_type": "Process_Command_Return",
            "signal_name": "Process_Command_Return",
            "direction": "browser_to_hub",
            "wire_format": '{"type":"Process_Command_Return","msgid":"...","message":"<payload>"}',
            "payload_schema": "Hub 将 message 转给 Process；Process 仅解析 message 字符串。",
            "field_constraints": "Process 侧对整段 split(':')；语义化版本若含 '.' 可能被拆段（VueClientVersion 需注意）。",
            "preconditions": "宿主进程 WebSocket 已连接。",
            "success_responses": "无统一回包；副作用为重启/更新流程。",
            "error_responses": "",
            "state_side_effects": "重启 Qt、顺序更新、版本检查。",
            "compatibility_status": "stable",
            "source_of_truth": "QUARCS_Process/src/quarcsmonitor.cpp::receivedMessage",
            "frontend_consume_path": "App.vue AppSendMessage / sendMessage(..., Process_Command_Return)",
            "parse_rule": "不适用（浏览器上行到 Hub→Process；下行解析见 quarcsmonitor）。",
            "parameter_meaning": "message 串由 Process 按 messageList[0] 等规则解析；非浏览器解析焦点。",
            "risk_tier": "high",
            "notes": "ServerInitSuccess、restartQtServer、VueClientVersion、updateCurrentClient、ForceUpdate 等见专用行。",
        },
        {
            "transport_type": "websocket_text_json",
            "envelope_type": "Broadcast_Msg",
            "signal_name": "Broadcast_Msg",
            "direction": "browser_to_hub",
            "wire_format": '{"type":"Broadcast_Msg","message":"CloseWebView"}',
            "payload_schema": "依宿主实现；未必进入 MainWindow。",
            "field_constraints": "",
            "preconditions": "",
            "success_responses": "",
            "error_responses": "",
            "state_side_effects": "壳层关闭 WebView 等。",
            "compatibility_status": "implementation_defined",
            "source_of_truth": "宿主/嵌入环境",
            "frontend_consume_path": "sendMessage('Broadcast_Msg',...)",
            "parse_rule": "不适用（浏览器上行）。",
            "parameter_meaning": "message 如 CloseWebView；由宿主消费。",
            "risk_tier": "normal",
            "notes": "",
        },
    ]
    return rows


def build_special_qt_return_rows() -> list[dict[str, str]]:
    """switch 之前单独处理的前缀（App.vue）。"""
    specials = [
        (
            "NetStatus|",
            "hub_to_browser",
            "message 以 NetStatus| 开头，其后为 JSON；禁止先 split(':')。",
            '{ wifi?:..., zerotier?:... } 等 JSON 对象，见运行时 payload',
            "JSON.parse(payload)；失败则打日志",
            "App.vue 特判 startsWith",
            "$bus NetStatus",
            "① startsWith('NetStatus|')。② payload = message.substring('NetStatus|'.length)。③ JSON.parse(payload)。禁止先对整段 split(':')。",
            "JSON：网络/WiFi/ZeroTier 等状态键值；键名以运行时 Hub 下发为准。",
        ),
        (
            "WiFiScan|",
            "hub_to_browser",
            "NetStatus| 同类；载荷为 JSON 数组",
            "JSON 数组",
            "JSON.parse",
            "App.vue 特判",
            "$bus WiFiScan",
            "① startsWith('WiFiScan|')。② 其后子串 JSON.parse 为数组。",
            "数组元素：扫描到的 AP（SSID 等字段以实际 JSON 为准）。",
        ),
        (
            "WiFiSaveResult|",
            "hub_to_browser",
            "管道分段：WiFiSaveResult|action|result|detail...",
            "split('|')；action/result/detail",
            "见 App.vue 注释",
            "App.vue 特判",
            "$bus WiFiSaveResult",
            "按 '|' split（不是 ':'）：段0=WiFiSaveResult；段1=action；段2=result；段3+=detail。",
            "action/result/detail：保存热点配置的操作结果与详情文本。",
        ),
        (
            "NetModeResult|",
            "hub_to_browser",
            "NetModeResult|mode|result|detail",
            "mode: ap|wan 等",
            "parts.length>=3",
            "App.vue 特判",
            "$bus NetModeResult",
            "按 '|' split：段0=NetModeResult；段1=mode(ap/wan 等)；段2=result；段3=detail。",
            "mode：当前或目标网络模式；result/detail：切换是否成功及说明。",
        ),
        (
            "StagingScheduleData:",
            "hub_to_browser",
            "定标计划原始字符串；含 '[' 分段",
            "整段 emit",
            "见 App.vue",
            "App.vue 特判",
            "$bus StagingScheduleData",
            "startsWith('StagingScheduleData:')；首段前缀后若含 ':'，取首冒号后子串为业务数据（见 App.vue）。",
            "定标/计划表原始文本；结构由 save/load 计划逻辑约定。",
        ),
        (
            "SendDebugMessage|",
            "hub_to_browser",
            "三段：SendDebugMessage|type|message",
            "parts.length===3",
            "App.vue",
            "App.vue 特判",
            "$bus SendDebugMessage",
            "按 '|' split：段0=SendDebugMessage；段1=type；段2=message（message 内勿再误用 ':' 拆）。",
            "type：调试类别；message：展示给控制台的文本。",
        ),
        (
            "DownloadManifest:",
            "hub_to_browser",
            "首个冒号后全部为 JSON（因 JSON 内含 ':'）",
            "indexOf(':') 后 substring 再 JSON.parse",
            "解析失败 emit 带 error 的对象",
            "App.vue 特判",
            "$bus DownloadManifest",
            "① startsWith('DownloadManifest:')。② idx = indexOf(':'); JSON.parse(message.substring(idx+1))。",
            "JSON：下载清单（文件列表、总大小等）；解析失败时前端会构造带 error 字段的对象。",
        ),
    ]
    rows = []
    for name, direction, wire, schema, fc, pre, consume, prule, pmean in specials:
        rows.append(
            {
                "transport_type": "websocket_text_json",
                "envelope_type": "QT_Return",
                "signal_name": name,
                "direction": direction,
                "wire_format": wire,
                "payload_schema": schema,
                "field_constraints": fc,
                "preconditions": pre,
                "success_responses": "前端 $bus 订阅者处理",
                "error_responses": "JSON 解析失败路径见 App.vue",
                "state_side_effects": "网络/下载 UI",
                "compatibility_status": "stable",
                "source_of_truth": "apps/web-frontend/src/App.vue（QT_Return 前缀分支）",
                "frontend_consume_path": consume,
                "parse_rule": prule,
                "parameter_meaning": pmean,
                "risk_tier": _risk_tier_for_signal(name),
                "notes": "高风险：载荷含 JSON 或与 ':' 冲突，必须先走特判分支。",
            }
        )
    return rows


def build_expanded_process_command_rows() -> list[dict[str, str]]:
    """展开 Process_Command 子类型（与 quarcsmonitor + App.vue 对齐）。"""
    # name, schema, consume, risk, note_extra, parse_rule, parameter_meaning
    specs = [
        (
            "qtServerIsOver",
            "Qt 进程丢失或冻结；冒号后可带原因",
            "callShowMessageBox + ShowConfirmDialog(restart)",
            "high",
            "",
            "parts=data.message.split(':'); parts[0]==='qtServerIsOver'；其后段若存在为原因等，需 join 还原。",
            "parts[0]: 固定子类型。parts[1..]: 可选原因/附加说明（若 Host 发送）。",
        ),
        (
            "checkHasNewUpdatePack",
            "parts[1]=目标版本字符串",
            "ShowConfirmDialog ForceUpdate -> updateCurrentClient:version",
            "high",
            "",
            "parts.length>=2 时取 parts[1] 为版本号字符串；勿把版本号中的 '.' 误当作分段。",
            "parts[1]: 可更新包的目标版本号，用于强制更新确认框。",
        ),
        (
            "No_update_pack_found",
            "无参数",
            "callShowMessageBox 无更新包",
            "normal",
            "",
            "仅 parts[0]，无后续业务段。",
            "无附加参数；表示无可用更新包。",
        ),
        (
            "update_progress",
            "update_progress:percent:text",
            "$bus update_progress",
            "high",
            "",
            "split(':'): parts[0]=update_progress；进度文本若含 ':' 用 parts.slice(1).join(':')。",
            "parts[1]: 进度百分比或阶段码；其后为展示文案（以 Process 拼接为准）。",
        ),
        (
            "update_error",
            "update_error:code:message",
            "$bus update_error",
            "high",
            "",
            "同上；错误信息含 ':' 时 join。",
            "parts[1]: 错误码；其后: 错误描述。",
        ),
        (
            "update_success",
            "update_success:code:message",
            "$bus update_success",
            "high",
            "",
            "同上。",
            "parts[1]: 状态码；其后: 成功说明。",
        ),
        (
            "update_failed",
            "update_failed:exitCode（Process 发送；App.vue 默认未分支）",
            "可能仅控制台未处理 warn",
            "high",
            "实现新前端时须显式处理或标注忽略；与 update_error 不同。",
            "parts[0]=update_failed；parts[1] 常为进程退出码；整段解析以 quarcsmonitor 为准。",
            "parts[1]: 退出码或错误类别；当前前端可能未分支，仅 warn。",
        ),
        (
            "update_sequence_start",
            "update_sequence_start:totalCount",
            "$bus update_sequence_start",
            "high",
            "",
            "冒号分段；后续段若含 ':' 用 join。",
            "parts[1]: 序列总步数等（见 Process 拼接）。",
        ),
        (
            "update_sequence_step",
            "update_sequence_step:index:total:version（以 quarcsmonitor 拼接为准）",
            "$bus update_sequence_step",
            "high",
            "",
            "多段时用固定段序解析（index/total/version），具体以 quarcsmonitor 发送格式为准。",
            "parts[1..]: 当前步序号、总步数、版本字符串等。",
        ),
        (
            "update_sequence_finished",
            "无冒号载荷或固定串",
            "$bus update_sequence_finished",
            "high",
            "",
            "整段或单段；无附加参数时仅前缀。",
            "表示分步更新序列正常结束。",
        ),
        (
            "update_sequence_failed",
            "update_sequence_failed:index",
            "$bus update_sequence_failed",
            "high",
            "",
            "parts[0] 后接失败步或原因索引。",
            "parts[1]: 失败序号或错误定位。",
        ),
        (
            "testQtServerProcess",
            "占位",
            "空分支",
            "low",
            "",
            "无解析逻辑。",
            "无参数含义。",
        ),
    ]
    rows = []
    for name, schema, consume, risk, note_extra, prule, pmean in specs:
        rows.append(
            {
                "transport_type": "websocket_text_json",
                "envelope_type": "Process_Command",
                "signal_name": name,
                "direction": "process_to_browser",
                "wire_format": '{"type":"Process_Command","message":"<payload>"}',
                "payload_schema": schema,
                "field_constraints": "parts=data.message.split(':')；载荷可含额外冒号时需 join",
                "preconditions": "QUARCS_Process 已连接 Hub",
                "success_responses": "UI/$bus 处理即视为消费",
                "error_responses": "未匹配前缀 -> console.warn 未处理命令",
                "state_side_effects": "OTA/重启流程",
                "compatibility_status": "stable" if name != "update_failed" else "frontend_gap",
                "source_of_truth": "QUARCS_Process/src/quarcsmonitor.cpp; apps/web-frontend/src/App.vue",
                "frontend_consume_path": consume,
                "parse_rule": prule,
                "parameter_meaning": pmean,
                "risk_tier": risk,
                "notes": note_extra,
            }
        )
    return rows


def build_process_command_return_detail_rows() -> list[dict[str, str]]:
    """浏览器经 Hub 发往 Process 的 Process_Command_Return 文本载荷。"""
    items = [
        (
            "ServerInitSuccess",
            "无冒号或单段",
            "置位 qtServerInitSuccess；抑制重启竞态",
            "QUARCS_Process/src/quarcsmonitor.cpp",
            "整段 message 可为单段或带前缀；Process 按 messageList[0] 等分支解析。",
            "通知 Qt 服务已就绪；无附加参数或见 quarcsmonitor。",
        ),
        (
            "restartQtServer",
            "无参数",
            "reRunQTServer() 条件重启",
            "quarcsmonitor.cpp",
            "单段命令名即 message。",
            "请求宿主重启 Qt 服务进程。",
        ),
        (
            "VueClientVersion",
            "VueClientVersion:<version>；注意 ':' 拆分与版本串含 '.' 的歧义",
            "赋值并 checkVueClientVersion；比较逻辑多用 QUARCS_TOTAL_VERSION",
            "quarcsmonitor.cpp",
            "建议仅一个 ':' 分隔前缀与版本；版本串勿再含 ':'。",
            "冒号后：Vue 前端构建版本号，用于与宿主版本比对/更新策略。",
        ),
        (
            "updateCurrentClient",
            "updateCurrentClient:<ver>；参数可被忽略",
            "startSequentialUpdate()",
            "quarcsmonitor.cpp",
            "parts[0]=updateCurrentClient；parts[1] 为目标版本（若存在）。",
            "触发顺序更新或拉取客户端包；版本串语义见 Process。",
        ),
        (
            "ForceUpdate",
            "无参数",
            "forceUpdate()",
            "quarcsmonitor.cpp",
            "单段命令。",
            "强制走更新流程（无版本参数时由 Process 内部状态决定）。",
        ),
    ]
    rows = []
    for name, schema, side, src, prule, pmean in items:
        rows.append(
            {
                "transport_type": "websocket_text_json",
                "envelope_type": "Process_Command_Return",
                "signal_name": name,
                "direction": "browser_to_hub",
                "wire_format": '{"type":"Process_Command_Return","msgid":"...","message":"<payload>"}',
                "payload_schema": schema,
                "field_constraints": "Process 对 message.split(':'); 版本号建议避免额外 ':'",
                "preconditions": "宿主进程已连接",
                "success_responses": "无统一 JSON；观察 Process 日志与后续 Process_Command",
                "error_responses": "",
                "state_side_effects": side,
                "compatibility_status": "stable",
                "source_of_truth": src,
                "frontend_consume_path": "App.vue AppSendMessage('Process_Command_Return', ...)",
                "parse_rule": prule,
                "parameter_meaning": pmean,
                "risk_tier": "high",
                "notes": "与 Qt 的 QT_Return 不同通道；勿混淆 ServerInitSuccess 的 type 路由（依赖 Hub 转发约定）。",
            }
        )
    return rows


def build_high_risk_verification_row() -> dict[str, str]:
    """计划验收：高风险域核对清单（单行 meta）。"""
    return {
        "transport_type": "websocket_text_json",
        "envelope_type": "meta",
        "signal_name": "(high_risk_domain_checklist)",
        "direction": "n/a",
        "wire_format": "n/a",
        "payload_schema": "OTA | NetStatus/WiFi/NetMode | DownloadManifest | AutoFocus | PolarAlignment | Guider | Meridian/Flip | Exposure/Live",
        "field_constraints": "实现替代前端时按域逐条对照本表 risk_tier=high 行",
        "preconditions": "已读信封层与 QT_Return 特判前缀行",
        "success_responses": "各域 $bus/UI 行为与现网一致",
        "error_responses": "default 未处理与 JSON 解析失败路径可观测",
        "state_side_effects": "设备与拍摄状态机不偏离现网",
        "compatibility_status": "audit",
        "source_of_truth": "unified-websocket-protocol.csv 筛选 risk_tier=high",
        "frontend_consume_path": "App.vue + 各 Panel / $bus 订阅",
        "parse_rule": "按域阅读本表「解析规律」列；高风险行 risk_tier=high。",
        "parameter_meaning": "各域参数含义见对应信号行；本行仅为验收索引。",
        "risk_tier": "high",
        "notes": "核对：Process OTA 全链路；含冒号 JSON 的特判；导星/极轴/解析长流程；赤道仪子午线与翻转。",
    }


def merge_qt_hint(prefix: str, qt_hints: dict[str, str]) -> str:
    base = prefix.rstrip(":").rstrip("|")
    for key in (prefix, base, base.split(":")[0] if ":" in base else base):
        if key in qt_hints:
            return qt_hints[key]
    return ""


def build_unified_table(
    outgoing_rows: list[dict],
    app_vue_path: Path,
    qt_hints: dict[str, str],
    process_hints: dict[str, str],
) -> list[dict[str, str]]:
    """组装 unified-websocket-protocol.csv 所有行。"""
    lines = read_text(app_vue_path).splitlines()
    switch_block = extract_switch_block_for_message_type(lines)
    case_details = extract_qt_return_case_details(switch_block) if switch_block else []

    unified: list[dict[str, str]] = []

    # 信封层
    for doc in build_envelope_doc_rows():
        unified.append(doc)

    unified.append(build_high_risk_verification_row())

    # 特殊 QT_Return 前缀
    for row in build_special_qt_return_rows():
        unified.append(row)

    # Process_Command 展开
    for row in build_expanded_process_command_rows():
        unified.append(row)

    # Process_Command_Return 细节
    for row in build_process_command_return_detail_rows():
        unified.append(row)

    # 出站命令（前端 -> Hub）
    for row in outgoing_rows:
        pt = row["protocol_type"]
        prefix = row["message_prefix"]
        ex = row.get("message_example_static", "")
        if pt == "Vue_Command":
            direction = "browser_to_hub"
        elif pt == "Process_Command_Return":
            direction = "browser_to_hub"
        elif pt == "Broadcast_Msg":
            direction = "browser_to_hub"
        else:
            direction = "browser_to_hub"

        qt_m = merge_qt_hint(prefix, qt_hints)
        pm_m = ""
        if pt == "Process_Command_Return":
            head = ex.split(":")[0] if ":" in ex else ex
            pm_m = process_hints.get(head, "")

        sof = row.get("source_file", "")
        src_parts = [f"frontend:{sof}"]
        if qt_m:
            src_parts.append(qt_m)
        if pm_m:
            src_parts.append(pm_m)

        unified.append(
            {
                "transport_type": "websocket_text_json",
                "envelope_type": pt,
                "signal_name": prefix,
                "direction": direction,
                "wire_format": '{"type":"' + pt + '","msgid":"...","message":"<见 message_example_static>"}',
                "payload_schema": row.get("parameter_hint", ""),
                "field_constraints": "与 MainWindow 解析一致时需满足段数/分隔符；见 parameter_hint",
                "preconditions": "设备已连接等；详 notes / backend_handler_note",
                "success_responses": "QT_Confirm + 异步 QT_Return（依命令而定，无全局固定映射）",
                "error_responses": "Unknown message 日志；部分命令返回 ErrorMessage: 等文本",
                "state_side_effects": (row.get("frontend_purpose_note", "") or "")[:200],
                "compatibility_status": row.get("backend_param_match", ""),
                "source_of_truth": " | ".join(src_parts),
                "frontend_consume_path": f"sendMessage → {sof}",
                "parse_rule": "不适用（浏览器→Hub）；Qt 返回见对应 QT_Return 行。",
                "parameter_meaning": "见「载荷结构」列 parameter_hint（浏览器发送时各段含义）。",
                "risk_tier": _risk_tier_for_signal(prefix),
                "notes": ((row.get("backend_handler_note", "") or "") + " | example: " + (ex[:120] if ex else ""))[:600],
            }
        )

    # 入站 QT_Return switch cases
    for c in case_details:
        name = c["case_name"]
        summary = c.get("case_summary", "")
        comment = c.get("first_comment", "")
        bus = c.get("bus_events", "")
        qt_m = merge_qt_hint(name, qt_hints)
        pr = qt_switch_case_parse_rule(name)
        pm = qt_switch_case_parameter_meaning(name, comment, summary)
        unified.append(
            {
                "transport_type": "websocket_text_json",
                "envelope_type": "QT_Return",
                "signal_name": name,
                "direction": "hub_to_browser",
                "wire_format": f"QT_Return.message = \"{name}:<segments...>\"（部分消息 payload 含额外 ':' 需 join）",
                "payload_schema": comment or f"parts[0]={name}; 详见 App.vue case 分支",
                "field_constraints": _summarize_case_body(summary, 400),
                "preconditions": "messageType 来自 data.message.split(':')[0]",
                "success_responses": "case 内 $bus / 状态赋值",
                "error_responses": "default: console.warn 未处理命令",
                "state_side_effects": bus or "见 case 内逻辑",
                "compatibility_status": "stable",
                "source_of_truth": "apps/web-frontend/src/App.vue | " + (qt_m or "Qt 发送侧见 mainwindow/各模块"),
                "frontend_consume_path": "App.vue switch(messageType) -> " + (bus or "inline"),
                "parse_rule": pr,
                "parameter_meaning": pm,
                "risk_tier": _risk_tier_for_signal(name),
                "notes": "",
            }
        )

    return unified


def assign_ids(rows: list[dict[str, str]]) -> None:
    for i, r in enumerate(rows, 1):
        r["id"] = str(i)


def write_unified_csv(path: Path, rows: list[dict[str, str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    assign_ids(rows)
    with path.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=UNIFIED_FIELDS_CN, extrasaction="ignore")
        w.writeheader()
        for r in rows:
            w.writerow(
                {cn: r.get(en, "") for en, cn in zip(UNIFIED_FIELDS_EN, UNIFIED_FIELDS_CN)}
            )


# ---------------------------------------------------------------------------
# 参数形态（与后端 message.split(':') / 整段匹配 对照；键为 message_prefix）
# ---------------------------------------------------------------------------
_PARAM_HINT: dict[str, str] = {
    "CloseWebView": "无参数（仅 message 文本）。",
    "VueClientVersion:": "parts[1]: string，Vue 前端构建版本号。",
    "restartQtServer": "无参数。",
    "AutoFlip:": "parts[1]: bool 字符串 true/false。",
    "AutoFocus Exposure Time (ms):": "parts[1]: int，自动对焦曝光(ms)。",
    "AutoFocusConfirm:": "AutoFocusConfirm: 之后为模式枚举 Coarse|Fine|Yes|No（message.startsWith 解析）。",
    "Backlash:": "parts[1]: int，回差步数。",
    "BindingDevice:": "parts[1]: string 设备类型; parts[2]: int 索引 | parts.size()==3。",
    "CFWList:": "parts[1]: string，槽位列表序列化串。",
    "CS": "无参数（短命令）。",
    "CalcWhiteBalance": "无参数或带附加段（parts[0] 为命令名）。",
    "CalibrationDuration:": "parts[1]: string/数值，校准时长相关。",
    "CaptureImageSave": "无参数。",
    "CheckBoxSpace": "无参数。",
    "ClearCalibrationData": "无参数。",
    "ClearDataPoints": "无参数。",
    "ClearDownloadLinks:": "parts[1]: string。",
    "ClearIndiDriver": "无参数。",
    "ClearLogs": "无参数。",
    "ClearSloveResultList": "无参数。",
    "Coarse Step Divisions:": "parts[1]: int。",
    "ConfirmIndiDevice:": "parts[1]: string 设备名; parts[2]: string 驱动名 | parts.size()==3。",
    "ConfirmIndiDriver:": "parts[1]: string 驱动名; [parts[2]: string 波特率] | size 2 或 3。",
    "DSLRCameraInfo:": "parts[1..3]: 宽、高、像元(µm) 等 | parts.size()==4。",
    "DecAggression:": "parts[1]: string/数值（当前多为忽略）。",
    "DeleteFile:": "parts[1]: string 路径。",
    "DisconnectDevice:": "parts[1]: string 设备名; parts[2]: string 类型 | size==3。",
    "EastMinutesPastMeridian:": "parts[1]: int 分钟。",
    "EndCaptureAndSolve": "无参数。",
    "ExpTimeList:": "parts[1]: string 列表。",
    "FocusLoopShooting:": "parts[1]: bool 字符串。",
    "GetDownloadManifest:": "parts[1]: string。",
    "GetImageFiles:": "parts[1]: string 路径。",
    "Goto:": "parts[1]: Ra; parts[2]: Dec（弧度，见源码）| parts.size()==3。",
    "GotoThenSolve:": "parts[1]: string。",
    "GuiderCanvasClick:": "parts[1..4]: x,y 等 | parts.size()==5。",
    "GuiderDecGuideDir:": "parts[1]: NORTH|SOUTH|AUTO 等。",
    "GuiderExpTimeSwitch:": "parts[1]: bool 字符串。",
    "GuiderFocalLength:": "parts[1]: string/数值（当前多为忽略）。",
    "GuiderGain:": "parts[1]: int（硬件请用 SetGuiderGain）。",
    "GuiderLoopExpSwitch:": "parts[1]: bool 字符串。",
    "GuiderPixelSize:": "parts[1]: string/数值（忽略）。",
    "GuiderRaGuideDir:": "parts[1]: string。",
    "GuiderSwitch:": "parts[1]: bool 字符串。",
    "ImageCFA:": "parts[1]: string CFA 模式。",
    "ImageGainB:": "parts[1]: float/double。",
    "ImageGainR:": "parts[1]: float/double。",
    "ImageOffset:": "parts[1]: int/double offset。",
    "LoopCapture:": "parts[1]: bool 字符串（后端可能未匹配）。",
    "MaxLimit:": "parts[1]: int。",
    "MinLimit:": "parts[1]: int。",
    "MountGoto:": "message 含逗号分段 Ra/Dec 子串，见 MountGoto 解析 | parts.size()==4。",
    "MountHome": "无参数。",
    "MountMoveAbort": "无参数。",
    "MountMoveDECStop:": "parts[1]: string。",
    "MountMoveRAStop:": "parts[1]: string。",
    "MountMoveEast": "无参数。",
    "MountMoveWest": "无参数。",
    "MountMoveNorth": "无参数。",
    "MountMoveSouth": "无参数。",
    "MountPark": "无参数。",
    "MountSYNC": "无参数。",
    "MountSpeedSwitch": "无参数。",
    "MountTrack": "无参数。",
    "MoveFileToUSB:": "parts[1..]: 路径等 | size>=2。",
    "MultiStarGuider:": "parts[1]: string（忽略）。",
    "PHD2Recalibrate": "无参数。",
    "RaAggression:": "parts[1]: string/数值（忽略）。",
    "ReadImageFile:": "parts[1]: string 路径。",
    "RedBox Side Length (px):": "parts[1]: int 像素。",
    "RedBox:": "parts[1]: string/数值。",
    "RedBoxSizeChange:": "parts[1]: int 边长。",
    "ResetAutoPolarAlignment": "无参数。",
    "RestartPHD2": "无参数（已废弃）。",
    "RestartRaspberryPi": "无参数。",
    "RestoreAutoPolarAlignment": "无参数。",
    "SelectIndiDriver:": "parts[1]: string Group; parts[2]: int ListNum | size==3。",
    "Self Exposure Time (ms):": "parts[1]: int。",
    "SetBinning:": "parts[1]: string 或 int binning。",
    "SetCFWPosition:": "parts[1]: int 槽位(1-based)。",
    "SetCameraGain:": "parts[1]: int。",
    "SetCameraOffset:": "parts[1]: int（Qt 主路径为 ImageOffset:）。",
    "SetCameraTemperature:": "parts[1]: double 目标温度。",
    "SetGuiderGain:": "parts[1]: int。",
    "SetGuiderOffset:": "parts[1]: int/double。",
    "SetMainCameraAutoSave:": "parts[1]: bool 字符串。",
    "SetMainCameraCaptureMode:": "parts[1]: string 模式枚举。",
    "SetMainCameraLoopCaptureNum:": "parts[1]: int 剩余张数。",
    "SetMainCameraSaveFailedParse:": "parts[1]: bool 字符串。",
    "SetMainCameraSaveFolder:": "parts[1]: string 路径或 local。",
    "SetMainCameraTileBuildMode:": "parts[1]: string。",
    "SetSerialPort:": "parts[1]: Mount|Focuser; parts[2]: string 设备路径或 default | size==3。",
    "SetUsbTraffic:": "parts[1]: int。",
    "ShowAllImageFolder": "无参数。",
    "ShutdownRaspberryPi": "无参数。",
    "SolveCurrentPosition:": "parts[1]: string。",
    "SolveSYNC": "无参数。",
    "StartAutoPolarAlignment": "无参数。",
    "StartLoopCapture": "无参数（后端可能未匹配）。",
    "StepsPerClick:": "parts[1]: int。",
    "StopAutoFocus": "无参数。",
    "StopAutoPolarAlignment": "无参数。",
    "StopLoopCapture": "无参数（后端可能未匹配）。",
    "StopSchedule": "无参数。",
    "SwitchOutPutPower:": "parts[1]: string。",
    "SyncFocuserStep:": "parts[1]: int 目标步数。",
    "SynchronizeTime:": "多段：日期/时间/时区等（见源码）。",
    "USBCheck": "无参数。",
    "UnBindingDevice:": "parts[1]: string 设备类型。",
    "WestMinutesPastMeridian:": "parts[1]: int 分钟。",
    "abortExposure": "无参数。",
    "autoConnectAllDevice": "无参数（后端可能未匹配）。",
    "connectAllDevice": "无参数。",
    "currectLocation:": "parts[1]: lat; parts[2]: lon | size==3。",
    "deleteSchedulePreset:": "parts[1]: string 预设名。",
    "disconnectAllDevice": "无参数。",
    "disconnectSelectDriver:": "parts[1]: string。",
    "editHotspotName:": "parts[1]: string。",
    "focusMove:": "parts[1]: Left|Right。",
    "focusMoveStep:": "parts[1]: Left|Right; parts[2]: int 步数 | size==3。",
    "focusMoveStop:": "parts[1]: bool 字符串。",
    "focusMoveToMax": "无参数。",
    "focusMoveToMin": "无参数。",
    "focusSetTravelRange": "无参数。",
    "focusSpeed:": "parts[1]: int 档位。",
    "getCFWList": "无参数。",
    "getCaptureStatus": "无参数。",
    "getClientSettings": "无参数。",
    "getExpTimeList": "无参数。",
    "getFocuserLoopingState": "无参数。",
    "getFocuserMoveState:": "parts[1]: bool 字符串。",
    "getFocuserParameters": "无参数。",
    "getFocuserState": "无参数。",
    "getGPIOsStatus": "无参数。",
    "getGuiderStatus": "无参数。",
    "getHotspotName": "无参数。",
    "getLastSelectDevice": "无参数。",
    "getMainCameraParameters": "无参数。",
    "getMountParameters": "无参数。",
    "getOriginalImage": "无参数。",
    "getPolarAlignmentState": "无参数。",
    "getQTClientVersion": "无参数。",
    "getROIInfo": "无参数。",
    "getStagingGuiderData": "无参数。",
    "getStagingScheduleData": "无参数。",
    "getStagingSolveResult": "无参数。",
    "getTotalVersion": "无参数。",
    "listSchedulePresets": "无参数。",
    "loadBindDeviceList": "无参数。",
    "loadBindDeviceTypeList": "无参数。",
    "loadSchedulePreset:": "parts[1]: string 预设名。",
    "loadSelectedDriverList": "无参数。",
    "loadSDKVersionAndUSBSerialPath": "无参数。",
    "localMessage": "无参请求回推；或整段 localMessage:…（见后端分支）。",
    "localMessage:": "parts[1..3]: lat,lon,lang 等 | size>=4。",
    "netMode:": "parts[1]: ap|wan 等。",
    "netStatus": "无参数。",
    "reGetLocation": "无参数。",
    "saveSchedulePreset:": "saveSchedulePreset:name:rawData（rawData 可含 ':'，后端 slice 拼接）。",
    "saveToConfigFile:": "parts[1]: ConfigName; parts[2]: ConfigValue | size==3（Value 内 ':' 会拆段，以源码为准）。",
    "sendRedBoxState:": "parts[1..3]: 边长,x,y | size==4。",
    "sendSelectStars:": "parts[1..2]: string | size==3。",
    "sendVisibleArea:": "parts[1..3] 或含 fov：x,y,scale[,fov] | size 4 或 5。",
    "setExposureTime:": "parts[1]: int ms。",
    "setROIPosition:": "parts[1]: double ROI_x; parts[2]: double ROI_y | size==3。",
    "showRoiImageSuccess:": "parts[1]: bool 字符串。",
    "startAutoFlip": "无参数（后端可能未匹配）。",
    "takeExposure:": "parts[1]: int 曝光 ms。",
    "takeExposureBurst:": "parts[1]: int ms; parts[2]: int 帧数 | size==3。",
    "wifiSaveB64|": "整段：wifiSaveB64| + Base64(JSON)，非 ':' 主解析。",
    "wifiScan": "无参数。",
}


def _param_hint_fallback(protocol_type: str, msg: str, prefix: str) -> str:
    if protocol_type == "Broadcast_Msg":
        return "无参数（广播 message 文本）。"
    if protocol_type == "Process_Command_Return":
        if "VueClientVersion" in prefix:
            return "parts[1]: string 版本号。"
        return "无参数或见 message 分段。"
    if "|" in msg and not msg.startswith("saveToConfigFile"):
        return "「|」分隔：前缀|载荷（JSON/Base64）；勿仅用 split(':') 理解。"
    n = msg.count(":")
    if n == 0:
        return "无参数（message 与命令名相同）。"
    if n == 1:
        return "parts[1]: string 或数值（parts[0] 为命令名）。"
    return f"按 ':' 拆成至少 {n + 1} 段；parts[0] 为命令名，载荷中若含 ':' 需按后端逻辑 slice 拼接。"


def _save_to_config_param_hint(example: str) -> str:
    """saveToConfigFile:Key:Value 变体。"""
    parts = example.split(":", 2)
    key = parts[2] if len(parts) > 2 else ""
    return (
        f"parts[1]: string 配置键（如 {key or '…'}）; parts[2]: string 值 | "
        "若 Value 内含 ':' 会与 split 冲突，以 MainWindow 三分支为准。"
    )


def _backend_param_match(protocol_type: str, bp: str, bh: str) -> str:
    """与 MainWindow/Process 对照：是/否/部分/不适用/忽略。"""
    if protocol_type == "Broadcast_Msg":
        return "不适用"
    if protocol_type == "Process_Command_Return":
        return "是"
    if "不再支持" in bh or "注释：不再支持" in bh:
        return "忽略"
    if "已对照忽略" in bp or ("忽略分支" in bp and "已对照" in bp):
        return "忽略"
    if "未编入" in bh:
        return "否"
    if "未匹配该命令前缀" in bh:
        return "否"
    # 部分匹配/多路径：须在「MainWindow 已命中」之前判断
    if "可能 Unknown" in bh or "若主窗口无" in bh:
        return "部分"
    if "优先使用" in bh and "Unknown" in bh:
        return "部分"
    if "MainWindow::onMessageReceived" in bh:
        return "是"
    if "已由 Process" in bp or "已对照" in bp:
        return "是"
    if "请对照" in bp:
        return "否"
    return "部分"


def extract_outgoing_from_vue_files() -> list[dict]:
    """提取 sendMessage / AppSendMessage 中的静态 type + message 字符串，并补全说明列。"""
    rows: list[dict] = []
    seen: set[tuple[str, str]] = set()

    line_pat = re.compile(
        r"'(Vue_Command|Broadcast_Msg|Process_Command_Return)',\s*'([^']+)'"
    )

    for vue in sorted((ROOT / "src").rglob("*.vue")):
        text = read_text(vue)
        rel = vue.relative_to(ROOT)
        for m in line_pat.finditer(text):
            wtype, msg = m.group(1), m.group(2)
            key = (wtype, msg)
            if key in seen:
                continue
            seen.add(key)
            if "|" in msg and not msg.startswith("saveToConfigFile"):
                prefix = msg.split("|", 1)[0] + "|"
            elif ":" in msg:
                prefix = msg.split(":", 1)[0] + ":"
            else:
                prefix = msg

            if prefix.startswith("saveToConfigFile:"):
                ph = _save_to_config_param_hint(msg)
            else:
                ph = _PARAM_HINT.get(prefix) or _param_hint_fallback(wtype, msg, prefix)

            row = {
                "protocol_type": wtype,
                "message_prefix": prefix,
                "message_example_static": msg,
                "source_file": str(rel).replace("\\", "/"),
                "parameter_hint": ph,
                "backend_param_match": "",
                "frontend_purpose_note": "",
                "backend_purpose_to_confirm": "",
                "backend_handler_note": "",
            }
            fe, bp, bh = notes_for_row(row)
            row["frontend_purpose_note"] = fe
            row["backend_purpose_to_confirm"] = bp
            row["backend_handler_note"] = bh
            row["backend_param_match"] = _backend_param_match(wtype, bp, bh)
            row["parameter_hint"] = _refine_param_hint_with_notes(
                wtype, prefix, msg, ph, row["backend_param_match"]
            )
            rows.append(row)

    rows.sort(key=lambda r: (r["protocol_type"], r["message_prefix"], r["message_example_static"]))
    return rows


def _refine_param_hint_with_notes(
    protocol_type: str, prefix: str, msg: str, ph: str, match: str
) -> str:
    """在参数说明末尾附加与 MainWindow 对照结论（与 backend_param_match 列一致）。"""
    tail = f" [与后端对照: {match}]"
    if protocol_type != "Vue_Command":
        return ph + tail
    if prefix.startswith("saveToConfigFile:"):
        return _save_to_config_param_hint(msg) + tail
    return ph + tail


# ---------------------------------------------------------------------------
# 富化：frontend / backend 说明（与 Qt Process 对照）
# ---------------------------------------------------------------------------
def notes_for_row(row: dict) -> tuple[str, str, str]:
    """返回 (frontend_purpose_note, backend_purpose_to_confirm, backend_handler_note)"""
    t = row["protocol_type"]
    p = row["message_prefix"]
    e = row["message_example_static"]
    src = row["source_file"]

    if t == "Broadcast_Msg" and p == "CloseWebView":
        return (
            "通知宿主/外壳关闭内嵌 WebView 或返回主应用（如 QuitToMainApp）；与 $bus CloseWebView 联动。",
            "广播类型，未必由 Qt Server 解析；消费方依部署（浏览器壳/进程管理器）。",
            "非 MainWindow 文本命令；见前端 App.vue sendMessage('Broadcast_Msg','CloseWebView')。",
        )
    if t == "Process_Command_Return" and "VueClientVersion" in p:
        return (
            "上报 Vue 前端构建版本，供宿主侧版本检查/更新策略。",
            "已由 Process 侧解析；触发 checkVueClientVersion 等逻辑。",
            f"{PM} 处理 VueClientVersion 分段；与强制更新流程相关。",
        )
    if t == "Process_Command_Return" and e == "restartQtServer":
        return (
            "用户确认后请求重启 Qt 服务进程（如崩溃/卡死对话框）。",
            "已由 Process 侧解析并执行重启 Qt Server。",
            f"{PM} 分支 restartQtServer；见 gui.vue 确认后 AppSendMessage。",
        )

    fe = f"发送位置: {src}"

    def bh_mw(branch: str) -> str:
        return f"{MW} | {branch}"

    def bh_unknown(reason: str) -> str:
        return f"当前 {MW} 未匹配该命令前缀；{reason}"

    if p == "AutoFlip:":
        if e.endswith("false"):
            return (
                "设置是否启用子午线翻转前自动流程（与 MeridianFlipNotifier 一致）。",
                "与赤道仪/计划任务策略相关；由 Qt 保存或应用。",
                bh_mw('parts[0]=="AutoFlip"，载荷为 true/false'),
            )
        return (
            "设置是否启用子午线翻转相关自动逻辑（默认/真值路径）。",
            "同上。",
            bh_mw('parts[0]=="AutoFlip"'),
        )

    if p == "AutoFocus Exposure Time (ms):":
        return (
            "自动对焦流程中单次曝光时间（毫秒），写入配置并同步 AutoFocus 模块。",
            "已对照。",
            bh_mw('parts[0]=="AutoFocus Exposure Time (ms)"，保存至 Tools/Focuser 参数'),
        )

    if p == "AutoFocusConfirm:":
        sub = e.split(":", 1)[-1].strip() if ":" in e else ""
        modes = {
            "Coarse": "完整粗+精+super-fine（startAutoFocus）",
            "Fine": "仅从当前位置 HFR 精调（startAutoFocusFineHFROnly）",
            "No": "取消并 AutoFocusCancelled",
            "Yes": "同 Coarse 完整流程",
        }
        return (
            f"自动对焦确认：{sub or '?'} → {modes.get(sub, '见源码分支')}",
            "已对照。",
            bh_mw("message.startsWith('AutoFocusConfirm:')，按 Coarse/Fine/Yes/No 分支"),
        )

    if p == "Backlash:":
        return ("电调回差补偿（步），用于自动对焦；绑定 INDI 电调时持久化。", "已对照。", bh_mw('parts[0]=="Backlash"'))

    if p == "BindingDevice:":
        return (
            "将某类设备槽位绑定到具体设备索引（设备分配面板）。",
            "已对照。",
            bh_mw('parts size 3 BindingDevice:type:index → BindingDevice()'),
        )

    if p == "CFWList:":
        return ("保存滤镜轮槽位名称列表字符串，供 getCFWList 恢复。", "已对照。", bh_mw('parts[0]=="CFWList" → Tools::saveCFWList'))

    if p == "CS":
        return (
            "滤镜轮相关短命令（Settings-Dialog-CFW）。",
            "若 MainWindow 无显式分支则落入 Unknown message；以实际固件/版本为准。",
            bh_unknown("可能为历史协议或与其它消息合并使用"),
        )

    if p == "CalcWhiteBalance":
        return ("请求对白平衡进行采样/计算（主相机图像）。", "已对照。", bh_mw('parts[0]=="CalcWhiteBalance"'))

    if p == "CalibrationDuration:":
        return (
            "导星校准时长等（与内置导星配置相关）；当前版本可能仅记录或忽略。",
            "源码中可与 PHD2 移除后的忽略分支相关，需与当前分支对照。",
            bh_mw('与 GuiderFocalLength 等一并：parts[0]==… 时 Log「PHD2 removed」忽略'),
        )

    if p == "CaptureImageSave":
        return ("保存当前捕获图像到配置路径。", "已对照。", bh_mw('message=="CaptureImageSave" → CaptureImageSave()'))

    if p == "CheckBoxSpace":
        return ("查询/同步 UI 勾选框占用或空间信息（视图设置）。", "已对照。", bh_mw('parts[0]=="CheckBoxSpace" → getCheckBoxSpace()'))

    if p == "ClearCalibrationData":
        return ("清除内置导星校准缓存并下次强制重校。", "已对照。", bh_mw("与 clearGuiderData、PHD2Recalibrate 同分支 → guiderCore->clearCachedCalibration"))

    if p == "ClearDataPoints":
        return ("清除导星/曲线数据点（GUI）。", "已对照。", bh_mw('message=="ClearDataPoints"'))

    if p == "ClearDownloadLinks:":
        return ("清除图像下载链接列表（图像管理器）。", "已对照。", bh_mw('parts[0]=="ClearDownloadLinks"'))

    if p == "ClearIndiDriver":
        return ("清空已选 INDI 驱动列表。", "已对照。", bh_mw('message=="ClearIndiDriver" → indi_Driver_Clear'))

    if p == "ClearLogs":
        return ("清空本地日志。", "已对照。", bh_mw('parts[0]=="ClearLogs" → clearLogs()'))

    if p == "ClearSloveResultList":
        return ("清空 plate solve 结果列表（拼写 Slove 与代码一致）。", "已对照。", bh_mw('message=="ClearSloveResultList"'))

    if p == "Coarse Step Divisions:":
        return ("粗对焦分段数，写入 Focuser 配置。", "已对照。", bh_mw('parts[0]=="Coarse Step Divisions"'))

    if p == "ConfirmIndiDevice:":
        return ("确认连接某 INDI 设备名与驱动名。", "已对照。", bh_mw("ConfirmIndiDevice → indi_Device_Confirm"))

    if p == "ConfirmIndiDriver:":
        return ("确认选择 INDI 驱动（可选波特率）。", "已对照。", bh_mw("ConfirmIndiDriver → indi_Driver_Confirm"))

    if p == "DSLRCameraInfo:":
        return ("单反相机分辨率/像元等元信息登记。", "已对照。", bh_mw("parts size 4 DSLRCameraInfo → Tools::saveDSLRsInfo 等"))

    if p == "DecAggression:":
        return ("导星 Dec  aggressive（原 PHD2 系参数）；当前可能忽略。", "与 PHD2 移除注释一致。", bh_mw("同 GuiderFocalLength 忽略分支"))

    if p == "DeleteFile:":
        return ("删除指定文件（图像文件夹）。", "已对照。", bh_mw('parts[0]=="DeleteFile"'))

    if p == "DisconnectDevice:":
        return ("按设备名与类型断开 INDI 设备。", "已对照。", bh_mw("DisconnectDevice → DisconnectDevice(indi,…)"))

    if p == "EastMinutesPastMeridian:":
        return ("子午线东侧允许分钟数（翻转策略）。", "已对照。", bh_mw('parts[0]=="EastMinutesPastMeridian"'))

    if p == "EndCaptureAndSolve":
        return ("结束循环拍摄并求解流程。", "已对照。", bh_mw('message=="EndCaptureAndSolve"'))

    if p == "ExpTimeList:":
        return ("保存曝光时间列表字符串。", "已对照。", bh_mw('parts[0]=="ExpTimeList" → Tools::saveExpTimeList'))

    if p == "FocusLoopShooting:":
        return ("电调循环拍摄开关（与对焦面板相关）。", "已对照。", bh_mw('parts[0]=="FocusLoopShooting"'))

    if p == "GetDownloadManifest:":
        return ("请求下载清单 JSON（图像管理器）。", "已对照。", bh_mw('parts[0]=="GetDownloadManifest"'))

    if p == "GetImageFiles:":
        return ("列出指定路径图像文件。", "已对照。", bh_mw('parts[0]=="GetImageFiles"'))

    if p == "Goto:":
        return ("望远镜 GOTO：Ra:Dec 格式（弧度分段）。", "已对照。", bh_mw("parts size 3 Goto → 解析 Ra/Dec 并 MountGoto"))

    if p == "GotoThenSolve:":
        return ("GOTO 后 plate solve（载荷依实现）。", "已对照。", bh_mw('parts[0]=="GotoThenSolve"'))

    if p == "GuiderCanvasClick:":
        return ("导星画布点击（归一化坐标等），内置导星选星。", "已对照。", bh_mw("parts size 5 GuiderCanvasClick"))

    if p == "GuiderDecGuideDir:":
        return ("Dec 轴导星方向 NORTH/SOUTH/AUTO 等。", "若主窗口无分支则可能 Unknown；GuiderCore 注释仍提及协议。", bh_unknown("导星内核可能从配置或其它入口读取"))

    if p == "GuiderExpTimeSwitch:":
        return ("导星相机曝光切换。", "已对照。", bh_mw('parts[0]=="GuiderExpTimeSwitch"'))

    if p == "GuiderFocalLength:":
        return ("导星焦距（旧 PHD2 系）；当前可能仅日志忽略。", "已对照忽略分支。", bh_mw("GuiderFocalLength 等与 PHD2 移除相关"))

    if p == "GuiderGain:":
        return (
            "设置/同步导星相机增益（常与 saveToConfigFile 同时发）。",
            "硬件设置请用 SetGuiderGain；单独 GuiderGain 可能不落主分支。",
            bh_mw("优先使用 SetGuiderGain；GuiderGain 单独或仅配置持久化时可能 Unknown"),
        )

    if p == "GuiderLoopExpSwitch:":
        return ("导星循环曝光开关。", "已对照。", bh_mw('parts[0]=="GuiderLoopExpSwitch"'))

    if p == "GuiderPixelSize:":
        return ("导星像元尺寸（旧 PHD2 系）。", "忽略分支。", bh_mw("同 GuiderFocalLength 忽略"))

    if p == "GuiderRaGuideDir:":
        return ("Ra 轴导星方向；内置导星可能强制双向。", "可能 Unknown 或仅文档/内核注释。", bh_unknown("参见 GuiderCore.cpp 注释"))

    if p == "GuiderSwitch:":
        return ("内置导星总开关 true/false。", "已对照。", bh_mw('parts[0]=="GuiderSwitch" → guiderCore start/stop'))

    if p == "ImageCFA:":
        return ("主相机 CFA 排列字符串。", "已对照。", bh_mw('parts[0]=="ImageCFA" 校验 RGGB 等'))

    if p == "ImageGainR:":
        return ("白平衡增益 R 通道。", "已对照。", bh_mw('parts[0]=="ImageGainR"'))
    if p == "ImageGainB:":
        return ("白平衡增益 B 通道。", "已对照。", bh_mw('parts[0]=="ImageGainB"'))

    if p == "ImageOffset:":
        return ("主相机 offset。", "已对照。", bh_mw('parts[0]=="ImageOffset"'))

    if p == "LoopCapture:":
        return (
            "切换 ROI/主相机循环连拍模式布尔值（App.vue LoopCapture）。",
            "当前 mainwindow 未见 parts[0]==LoopCapture 分支，可能 Unknown。",
            bh_unknown("连拍次数用 SetMainCameraLoopCaptureNum；模式开关待后端补全或经 SetMainCameraCaptureMode"),
        )

    if p == "MaxLimit:" or p == "MinLimit:":
        return ("电调行程最大/最小限制。", "已对照。", bh_mw("MinLimit/MaxLimit + dpFocuser"))

    if p == "MountGoto:":
        return ("赤道仪 GOTO（MountGoto:…,… 复杂格式）。", "已对照。", bh_mw("parts size 4 MountGoto → 解析 RaDecList"))

    if p == "MountHome":
        return ("指向零点/ home 位。", "已对照。", bh_mw('message=="MountHome"'))

    if p == "MountMoveAbort":
        return ("停止当前赤经赤纬移动。", "已对照。", bh_mw('message=="MountMoveAbort"'))

    if p == "MountMoveDECStop:" or p == "MountMoveRAStop:":
        return ("停止 Dec/RA 轴向点动。", "已对照。", bh_mw("MountMoveDECStop / MountMoveRAStop"))

    if p in ("MountMoveEast", "MountMoveWest", "MountMoveNorth", "MountMoveSouth"):
        return (f"点动 {p.replace('MountMove', '')}。", "已对照。", bh_mw(f'message=="{p}"'))

    if p == "MountPark":
        return ("Park 望远镜。", "已对照。", bh_mw('message=="MountPark"'))

    if p == "MountSYNC":
        return ("同步当前位置到天体坐标。", "已对照。", bh_mw('message=="MountSYNC"'))

    if p == "MountSpeedSwitch":
        return ("切换点动速度档位。", "已对照。", bh_mw('message=="MountSpeedSwitch"'))

    if p == "MountTrack":
        return ("开启/切换跟踪。", "已对照。", bh_mw('message=="MountTrack"'))

    if p == "MoveFileToUSB:":
        return ("将文件拷到 USB 存储。", "已对照。", bh_mw("parts[0]==MoveFileToUSB"))

    if p == "MultiStarGuider:":
        return ("多星导星开关（旧 PHD2）。", "忽略分支。", bh_mw("同 GuiderFocalLength 忽略"))

    if p == "PHD2Recalibrate":
        return ("兼容命令名：等同清除校准并下次重校。", "已对照。", bh_mw("与 ClearCalibrationData 同分支"))

    if p == "RaAggression:":
        return ("Ra aggressive（旧 PHD2）。", "忽略分支。", bh_mw("同 GuiderFocalLength 忽略"))

    if p == "ReadImageFile:":
        return ("读取指定路径图像到预览/处理。", "已对照。", bh_mw('parts[0]=="ReadImageFile"'))

    if p == "RedBox Side Length (px):":
        return ("对焦红框边长（像素）。", "已对照。", bh_mw("与 RedBox/ROI 相关参数；见 roiAndFocuserInfo"))

    if p == "RedBox:":
        return ("红框位置或尺寸相关（主界面）。", "若与 RedBoxSizeChange 混用见对应分支。", bh_mw("可能经 roi 字典；与 RedBoxSizeChange 区分"))

    if p == "RedBoxSizeChange:":
        return ("改变红框边长并保存 MainCamera/RedBoxSize。", "已对照。", bh_mw('parts[0]=="RedBoxSizeChange"'))

    if p == "ResetAutoPolarAlignment":
        return (
            "重置自动极轴流程前销毁 polarAlignment 对象（与 Start 前清理相关）。",
            "独立命令若不存在则 Unknown；Reset 日志出现在 StartAutoPolarAlignment 内。",
            bh_unknown("当前以 StartAutoPolarAlignment 内删除 polarAlignment 为主；独立 Reset 命令需确认是否仍发送"),
        )

    if p == "RestartPHD2":
        return ("重启 PHD2（遗留）。", "源码注明 PHD2 已移除，不再处理。", bh_mw("注释：不再支持 RestartPHD2"))

    if p == "RestartRaspberryPi":
        return ("执行系统 reboot。", "已对照。", bh_mw('message=="RestartRaspberryPi" → system("reboot")'))

    if p == "RestoreAutoPolarAlignment":
        return ("恢复极轴校准状态（前端）。", "若主窗口无专门分支则可能 Unknown。", bh_unknown("在 mainwindow 未检索到独立 Restore 分支"))

    if p == "SelectIndiDriver:":
        return ("列出/打印某组驱动列表序号。", "已对照。", bh_mw("SelectIndiDriver → printDevGroups2"))

    if p == "Self Exposure Time (ms):":
        return ("主相机自曝光（非导星）毫秒，写入配置。", "已对照。", bh_mw('parts[0]=="Self Exposure Time (ms)"'))

    if p == "SetBinning:":
        return ("主相机 binning。", "已对照。", bh_mw('parts[0]=="SetBinning"'))

    if p == "SetCFWPosition:":
        return ("转动滤镜轮到指定槽位（1-based）。", "已对照。", bh_mw("SetCFWPosition → INDI/SDK 等待到位"))

    if p == "SetCameraGain:":
        return ("主相机增益。", "已对照。", bh_mw('parts[0]=="SetCameraGain"'))

    if p == "SetCameraOffset:":
        return (
            "主相机 offset（前端多为 ImageOffset/已注释路径）。",
            "Qt 侧主分支为 ImageOffset:；若仍发 SetCameraOffset 可能 Unknown。",
            bh_unknown("mainwindow 使用 ImageOffset:；App.vue 中 SetCameraOffset 多为注释"),
        )

    if p == "SetCameraTemperature:":
        return ("主相机制冷目标温度。", "已对照。", bh_mw('parts[0]=="SetCameraTemperature"'))

    if p == "SetGuiderGain:":
        return ("导星相机增益。", "已对照。", bh_mw('parts[0]=="SetGuiderGain"'))

    if p == "SetGuiderOffset:":
        return ("导星 offset。", "已对照。", bh_mw('parts[0]=="SetGuiderOffset"'))

    if p == "SetMainCameraAutoSave:":
        return ("主相机自动保存开关。", "已对照。", bh_mw('parts[0]=="SetMainCameraAutoSave"'))

    if p == "SetMainCameraCaptureMode:":
        return ("单张/连拍/Live 等采集模式。", "已对照。", bh_mw('parts[0]=="SetMainCameraCaptureMode"'))

    if p == "SetMainCameraLoopCaptureNum:":
        return ("连拍剩余张数计数。", "已对照。", bh_mw('parts[0]=="SetMainCameraLoopCaptureNum" → LoopCaptureNum'))

    if p == "SetMainCameraSaveFailedParse:":
        return ("解析失败时是否仍保存。", "已对照。", bh_mw('parts[0]=="SetMainCameraSaveFailedParse"'))

    if p == "SetMainCameraSaveFolder:":
        return ("主相机保存目录（含 local 等约定）。", "已对照。", bh_mw('parts[0]=="SetMainCameraSaveFolder"'))

    if p == "SetMainCameraTileBuildMode:":
        return ("拼图/平铺合成模式。", "已对照。", bh_mw('parts[0]=="SetMainCameraTileBuildMode"'))

    if p == "SetSerialPort:":
        return ("手动指定 Mount/Focuser 串口路径或 default。", "已对照。", bh_mw('parts size 3 SetSerialPort'))

    if p == "SetUsbTraffic:":
        return ("USB 流量/带宽参数。", "已对照。", bh_mw('parts[0]=="SetUsbTraffic"'))

    if p == "ShowAllImageFolder":
        return ("展示全部图像文件夹。", "已对照。", bh_mw('message=="ShowAllImageFolder"'))

    if p == "ShutdownRaspberryPi":
        return ("关机。", "已对照。", bh_mw('system("shutdown -h now")'))

    if p == "SolveCurrentPosition:":
        return ("对当前求解图像做 plate solve。", "已对照。", bh_mw('parts[0]=="SolveCurrentPosition" → solveCurrentPosition()'))

    if p == "SolveSYNC":
        return ("解析后与 mount 同步。", "已对照。", bh_mw('parts[0]=="SolveSYNC"'))

    if p == "StartAutoPolarAlignment":
        return ("启动内置自动极轴：关跟踪、initPolarAlignment、startPolarAlignment。", "已对照。", bh_mw('parts[0]=="StartAutoPolarAlignment"'))

    if p == "StartLoopCapture":
        return ("开始连拍（前端）；若后端仅计数需与 SetMainCameraCaptureMode 等配合。", "可能无独立分支。", bh_unknown("见 LoopCapture / SetMainCameraLoopCaptureNum"))

    if p == "StepsPerClick:":
        return ("电调每点击步数。", "已对照。", bh_mw('parts[0]=="StepsPerClick"'))

    if p == "StopAutoFocus":
        return ("停止自动对焦线程并 AutoFocusEnded。", "已对照。", bh_mw('message=="StopAutoFocus"'))

    if p == "StopAutoPolarAlignment":
        return ("停止极轴校准。", "已对照。", bh_mw('parts[0]=="StopAutoPolarAlignment"'))

    if p == "StopLoopCapture":
        return ("停止循环拍摄。", "若主窗口无同名分支则可能 Unknown。", bh_unknown("停止逻辑可能由 StopSchedule/abort/模式切换间接完成"))

    if p == "StopSchedule":
        return ("停止计划任务并 ScheduleRunning:false。", "已对照。", bh_mw('message=="StopSchedule"'))

    if p == "SwitchOutPutPower:":
        return ("GPIO/电源输出开关。", "已对照。", bh_mw('parts[0]=="SwitchOutPutPower"'))

    if p == "SyncFocuserStep:":
        return ("将电调当前位置同步为指定步数并调整限位。", "已对照。", bh_mw("大块 SyncFocuserStep INDI/SDK"))

    if p == "SynchronizeTime:":
        return ("同步系统时间与客户端。", "已对照。", bh_mw('parts[0]=="SynchronizeTime"'))

    if p == "USBCheck":
        return ("检测 USB 存储挂载等。", "已对照。", bh_mw('message=="USBCheck"'))

    if p == "UnBindingDevice:":
        return ("解绑设备类型。", "已对照。", bh_mw("UnBindingDevice → UnBindingDevice"))

    if p == "WestMinutesPastMeridian:":
        return ("子午线西侧允许分钟数。", "已对照。", bh_mw('parts[0]=="WestMinutesPastMeridian"'))

    if p == "abortExposure":
        return ("中止当前曝光。", "已对照。", bh_mw('message=="abortExposure"'))

    if p == "autoConnectAllDevice":
        return ("上电自动连接全部设备。", "若主窗口无分支则可能 Unknown。", bh_unknown("ConnectDriver 系列通常单独连接"))

    if p == "connectAllDevice":
        return ("连接全部设备。", "已对照。", bh_mw('message=="connectAllDevice"'))

    if p == "currectLocation:":
        return ("手动经纬度（拼写 currect），保存并可能 setMountLocation。", "已对照。", bh_mw("currectLocation size 3"))

    if p == "deleteSchedulePreset:":
        return ("删除计划任务预设名。", "已对照。", bh_mw("deleteSchedulePreset → Tools::deleteSchedulePreset"))

    if p == "disconnectAllDevice":
        return ("断开全部设备。", "已对照。", bh_mw('message=="disconnectAllDevice"'))

    if p == "disconnectSelectDriver:":
        return ("断开所选驱动实例。", "已对照。", bh_mw('parts[0]=="disconnectSelectDriver"'))

    if p == "editHotspotName:":
        return ("编辑热点名称。", "已对照。", bh_mw('parts[0]=="editHotspotName"'))

    if p in ("focusMoveToMax", "focusMoveToMin"):
        return ("移动到行程最大/最小。", "已对照。", bh_mw("focusMoveToMax / focusMoveToMin"))

    if p == "focusSetTravelRange":
        return ("设置电调行程范围。", "已对照。", bh_mw("focusSetTravelRange"))

    if p.startswith("focusMove") or p == "focusSpeed:":
        return ("电调移动/单步/停止/速度等相关。", "已对照。", bh_mw("focusMove / focusMoveStep / focusMoveStop / focusSpeed"))

    if p == "getCFWList":
        return ("读取已保存 CFW 列表。", "已对照。", bh_mw('message=="getCFWList"'))

    if p == "getCaptureStatus":
        return ("查询主相机是否正在曝光。", "已对照。", bh_mw("getCaptureStatus → CameraInExposuring"))

    if p == "getClientSettings":
        return ("拉取 config.ini 客户端设置。", "已对照。", bh_mw('message=="getClientSettings" → getClientSettings'))

    if p == "getExpTimeList":
        return ("读取曝光列表。", "已对照。", bh_mw('message=="getExpTimeList"'))

    if p == "getFocuserLoopingState":
        return ("查询电调循环状态。", "已对照。", bh_mw('parts[0]=="getFocuserLoopingState"'))

    if p == "getFocuserMoveState:":
        return ("与对焦移动完成状态联动。", "已对照。", bh_mw('parts[0]=="getFocuserMoveState"'))

    if p == "getFocuserParameters":
        return ("拉取电调参数。", "已对照。", bh_mw('parts[0]=="getFocuserParameters"'))

    if p == "getFocuserState":
        return ("拉取电调状态。", "已对照。", bh_mw('parts[0]=="getFocuserState"'))

    if p == "getGPIOsStatus":
        return ("GPIO 状态。", "已对照。", bh_mw('message=="getGPIOsStatus"'))

    if p == "getGuiderStatus":
        return ("导星开关/循环曝光/状态机。", "已对照。", bh_mw("getGuiderStatus → GuiderSwitchStatus 等"))

    if p == "getHotspotName":
        return ("获取热点 SSID 名。", "已对照。", bh_mw('message=="getHotspotName"'))

    if p == "getLastSelectDevice":
        return ("上次选中设备。", "已对照。", bh_mw('parts[0]=="getLastSelectDevice"'))

    if p == "getMainCameraParameters":
        return ("主相机参数汇总。", "已对照。", bh_mw('parts[0]=="getMainCameraParameters"'))

    if p == "getMountParameters":
        return ("赤道仪参数。", "已对照。", bh_mw('parts[0]=="getMountParameters"'))

    if p == "getOriginalImage":
        return ("取原始图。", "已对照。", bh_mw('message=="getOriginalImage"'))

    if p == "getPolarAlignmentState":
        return ("极轴校准状态轮询。", "已对照。", bh_mw("PolarAlignmentState:…"))

    if p == "getQTClientVersion":
        return ("Qt 客户端版本。", "已对照。", bh_mw('message=="getQTClientVersion"'))

    if p == "getROIInfo":
        return ("ROI 信息。", "已对照。", bh_mw('parts[0]=="getROIInfo"'))

    if p == "getStagingGuiderData":
        return ("暂存导星曲线数据（PHD2 路径已禁用）。", "已对照。", bh_mw("getStagingGuiderData（内部 #if 0）"))

    if p == "getStagingScheduleData":
        return ("拉取暂存计划表。", "已对照。", bh_mw("getStagingScheduleData"))

    if p == "getStagingSolveResult":
        return ("拉取 plate solve 结果。", "已对照。", bh_mw('message=="getStagingSolveResult"'))

    if p == "getTotalVersion":
        return ("总版本号。", "已对照。", bh_mw('message=="getTotalVersion"'))

    if p == "listSchedulePresets":
        return ("列出计划预设名。", "已对照。", bh_mw("SchedulePresetList"))

    if p == "loadBindDeviceList":
        return ("加载可绑定设备列表。", "已对照。", bh_mw('message=="loadBindDeviceList"'))

    if p == "loadBindDeviceTypeList":
        return ("加载设备类型列表。", "已对照。", bh_mw('message=="loadBindDeviceTypeList"'))

    if p == "loadSchedulePreset:":
        return ("加载某预设到 StagingScheduleData。", "已对照。", bh_mw("loadSchedulePreset"))

    if p == "loadSelectedDriverList":
        return ("加载已选驱动列表。", "已对照。", bh_mw('message=="loadSelectedDriverList"'))

    if p == "loadSDKVersionAndUSBSerialPath":
        return ("SDK 与 USB 串口路径信息。", "已对照。", bh_mw("loadSDKVersionAndUSBSerialPath"))

    if p == "localMessage":
        return (
            "无参：请求后端回推缓存的 localMessage:纬度:经度:语言。",
            "已对照。",
            bh_mw("parts[0]==localMessage 且 parts.size()<4 → emit localMessage:lat:lon:lang"),
        )
    if p == "localMessage:":
        return (
            "带经纬与语言等多段时写入 ClientLanguage/缓存并回显；见 location-dialog。",
            "已对照。",
            bh_mw("parts[0]==localMessage 且 parts.size()>=4 → setClientSettings + emit"),
        )

    if p == "netMode:":
        return ("切换 AP/WAN 网络模式。", "已对照。", bh_mw('parts[0]=="netMode"'))

    if p == "netStatus":
        return ("网络状态查询。", "已对照。", bh_mw('message=="netStatus"'))

    if p == "reGetLocation":
        return ("重新获取定位。", "已对照。", bh_mw('parts[0]=="reGetLocation"'))

    if p == "saveSchedulePreset:":
        return ("保存计划预设。", "已对照。", bh_mw("saveSchedulePreset rawData 可含 ':'"))

    if p.startswith("saveToConfigFile:"):
        key = e.split(":", 2)[2] if e.count(":") >= 2 else ""
        return (
            f"持久化客户端配置项（{key or '见第二段键名'}）到 config.ini，并执行 setClientSettings。",
            "已对照。",
            bh_mw("saveToConfigFile → setClientSettings；Coordinates 会 setMountLocation"),
        )

    if p == "sendRedBoxState:":
        return ("向前端同步红框状态。", "已对照。", bh_mw("sendRedBoxState size 4"))

    if p == "sendSelectStars:":
        return ("选星坐标。", "已对照。", bh_mw("sendSelectStars size 3"))

    if p == "sendVisibleArea:":
        return ("Stellarium 视口可见区域与 scale。", "已对照。", bh_mw("sendVisibleArea 4 或 5 段"))

    if p == "setExposureTime:":
        return ("设置主相机曝光毫秒（未立即拍摄）。", "已对照。", bh_mw('parts[0]=="setExposureTime"'))

    if p == "setROIPosition:":
        return ("ROI 中心坐标。", "已对照。", bh_mw("setROIPosition → roiAndFocuserInfo"))

    if p == "showRoiImageSuccess:":
        return ("ROI 成像成功反馈（曾关联 focus loop）。", "已对照。", bh_mw("showRoiImageSuccess 当前多为日志"))

    if p == "startAutoFlip":
        return ("触发自动翻转流程。", "若主窗口无同名则可能 Unknown。", bh_unknown("与 AutoFlip: 设置配合使用"))

    if p.startswith("takeExposure"):
        return ("主相机单次/连拍曝光。", "已对照。", bh_mw("takeExposure / takeExposureBurst"))

    if p == "wifiSaveB64|":
        return ("Base64 编码的 WiFi 配置 JSON。", "已对照。", bh_mw("message.startsWith wifiSaveB64| → runSudo/nmcli 等"))

    if p == "wifiScan":
        return ("扫描 WiFi。", "已对照。", bh_mw('message=="wifiScan"'))

    return (
        fe,
        "请对照当前 Qt 分支 mainwindow.cpp 是否新增分支。",
        bh_unknown("未编入映射表"),
    )


def extract_incoming_qt_return_cases() -> list[dict]:
    """从 App.vue 中 switch (messageType) { ... } 块提取 case 标签（动态定位 switch 块，避免行号漂移）。"""
    lines = read_text(APP_VUE).splitlines()
    switch_block = extract_switch_block_for_message_type(lines)
    case_details = extract_qt_return_case_details(switch_block) if switch_block else []
    case_by_name = {c["case_name"]: c for c in case_details}
    # 与上方 extract_switch_block_for_message_type 动态定位的 switch 块对齐
    start = None
    for i, line in enumerate(lines):
        if "switch (messageType)" in line:
            start = i
            break
    if start is None:
        slice_lines = lines[2219:4376]
    else:
        brace = 0
        started = False
        end = start
        for i in range(start, len(lines)):
            for ch in lines[i]:
                if ch == "{":
                    brace += 1
                    started = True
                elif ch == "}":
                    brace -= 1
            if started and brace == 0:
                end = i
                break
        slice_lines = lines[start : end + 1]
    block = "\n".join(slice_lines)
    cases = re.findall(r"case\s+'([^']+)'", block)
    seen: set[str] = set()
    unique: list[str] = []
    for c in cases:
        if c not in seen:
            seen.add(c)
            unique.append(c)

    rows = []
    for i, c in enumerate(unique, 1):
        det = case_by_name.get(c, {})
        comment = det.get("first_comment", "")
        summary = det.get("case_summary", "")
        pr = qt_switch_case_parse_rule(c)
        pm = qt_switch_case_parameter_meaning(c, comment, summary)
        ret_info = build_incoming_return_info(c, det)
        rows.append(
            {
                "incoming_channel": "QT_Return_switch",
                "qt_return_message_prefix": c,
                "parse_note": "parts[0] 为命令名；部分消息含额外 ':' 需 slice 拼接",
                "parse_rule": pr,
                "parameter_meaning": pm,
                "frontend_purpose_note": ret_info,
                "backend_purpose_to_confirm": "",
                "backend_emit_format": f"QT_Return message 建议: {c}:...",
            }
        )
    return rows


def extract_incoming_non_qt_return() -> list[dict]:
    """QT_Confirm、Process_Command 等顶层 type（非 message 内前缀）。"""
    rows = [
        {
            "incoming_channel": "QT_Confirm",
            "qt_return_message_prefix": "(N/A)",
            "parse_note": "data.msgid 与发送时一致，用于 handleMessageResponse",
            "parse_rule": "无 data.message 业务串；仅读取 data.msgid 与 sentMessages 配对。",
            "parameter_meaning": "msgid：对应此前浏览器发出的带业务 message 的请求，表示 Hub 已收到。",
            "frontend_purpose_note": "仅回执 msgid，无 data.message 业务载荷",
            "backend_purpose_to_confirm": "",
            "backend_emit_format": '{"type":"QT_Confirm","msgid":"..."}',
        },
        {
            "incoming_channel": "Process_Command",
            "qt_return_message_prefix": "qtServerIsOver",
            "parse_note": "parts[0]",
            "parse_rule": "parts = data.message.split(':'); 判断 parts[0]==='qtServerIsOver'；后续段 join。",
            "parameter_meaning": "parts[0]: 子类型关键字；parts[1..]: 可选崩溃/冻结原因文本。",
            "frontend_purpose_note": "子类型 qtServerIsOver 及可选崩溃/冻结原因文本",
            "backend_purpose_to_confirm": "",
            "backend_emit_format": "Process_Command message: qtServerIsOver:...",
        },
        {
            "incoming_channel": "Process_Command",
            "qt_return_message_prefix": "checkHasNewUpdatePack",
            "parse_note": "parts[1] 为版本号",
            "parse_rule": "parts.length>=2 时 parts[1] 为版本字符串；勿将版本号中的 '.' 误拆为分段语义。",
            "parameter_meaning": "parts[1]: 服务端发现的可更新包版本号，用于弹窗与 updateCurrentClient。",
            "frontend_purpose_note": "可更新包版本号（用于弹窗与更新逻辑）",
            "backend_purpose_to_confirm": "",
            "backend_emit_format": "checkHasNewUpdatePack:<version>",
        },
        {
            "incoming_channel": "Process_Command",
            "qt_return_message_prefix": "No_update_pack_found",
            "parse_note": "无参数",
            "parse_rule": "仅 parts[0] 匹配，无后续业务段。",
            "parameter_meaning": "无附加参数。",
            "frontend_purpose_note": "无后续业务段，仅表示未发现更新包",
            "backend_purpose_to_confirm": "",
            "backend_emit_format": "No_update_pack_found",
        },
        {
            "incoming_channel": "Process_Command",
            "qt_return_message_prefix": "update_progress | update_error | update_success",
            "parse_note": "整段 message 转发 $bus",
            "parse_rule": "parts[0] 为子命令名；其后若含 ':' 用 parts.slice(1).join(':')；整串可再传给 OTA UI 解析。",
            "parameter_meaning": "update_progress：进度与展示文案；update_error：错误码与描述；update_success：成功状态与描述（均以 Process 拼接为准）。",
            "frontend_purpose_note": "OTA 进度、错误或成功相关的整段 payload（可再经 OTA UI 解析）",
            "backend_purpose_to_confirm": "",
            "backend_emit_format": "update_*:<payload>",
        },
        {
            "incoming_channel": "Process_Command",
            "qt_return_message_prefix": "update_sequence_start | update_sequence_step | update_sequence_finished | update_sequence_failed",
            "parse_note": "整段 message 转发 $bus",
            "parse_rule": "同上用 ':' 拆首段为子命令；后续段按顺序更新对话框逐步解析。",
            "parameter_meaning": "分步更新：总步数、当前步、版本标签或失败序号等（见 quarcsmonitor 与 UpdateProgressDialog）。",
            "frontend_purpose_note": "分步更新各阶段 payload（总步/当前步/版本或失败信息等）",
            "backend_purpose_to_confirm": "",
            "backend_emit_format": "update_sequence_*:<payload>",
        },
        {
            "incoming_channel": "Process_Command",
            "qt_return_message_prefix": "testQtServerProcess",
            "parse_note": "当前为空处理",
            "parse_rule": "无解析。",
            "parameter_meaning": "无。",
            "frontend_purpose_note": "无业务载荷（case 内空处理）",
            "backend_purpose_to_confirm": "",
            "backend_emit_format": "testQtServerProcess",
        },
    ]
    return rows


def extract_incoming_special_prefixes() -> list[dict]:
    """在 switch 之前单独处理的消息前缀。"""
    specials = [
        (
            "NetStatus|",
            "JSON",
            "网络状态（WiFi/ZeroTier 等）",
            "① startsWith('NetStatus|')。② payload = message.substring('NetStatus|'.length)。③ JSON.parse(payload)。",
            "JSON：各键表示网络/接口状态；以运行时为准。",
        ),
        (
            "WiFiScan|",
            "JSON 数组",
            "扫描到的 WiFi 列表",
            "startsWith('WiFiScan|') 后子串 JSON.parse 为数组。",
            "数组元素：AP 信息（SSID 等）。",
        ),
        (
            "WiFiSaveResult|",
            "管道分段",
            "保存 WiFi 配置结果",
            "按 '|' split（非 ':'）：段1=action，段2=result，段3+=detail。",
            "action/result/detail：保存配置的操作与结果说明。",
        ),
        (
            "NetModeResult|",
            "管道分段",
            "AP/WAN 模式切换结果",
            "按 '|' split：mode / result / detail。",
            "mode：ap|wan 等；result/detail：切换是否成功及说明。",
        ),
        (
            "StagingScheduleData:",
            "字符串",
            "定标计划数据",
            "startsWith('StagingScheduleData:'); 首冒号后可能仍含 ':'，按 App.vue 取子串。",
            "定标/计划表原始文本载荷。",
        ),
        (
            "SendDebugMessage|",
            "type|message",
            "调试消息",
            "按 '|' 拆为 type 与 message 段。",
            "type：类别；message：调试文本。",
        ),
        (
            "DownloadManifest:",
            "JSON",
            "下载清单",
            "indexOf(':') 后整段为 JSON（因 JSON 内含 ':'）。",
            "JSON：文件列表、总大小等；失败时见 App.vue 错误对象约定。",
        ),
    ]
    rows = []
    for prefix, fmt, note, prule, pmean in specials:
        rows.append(
            {
                "incoming_channel": "QT_Return_special_prefix",
                "qt_return_message_prefix": prefix,
                "parse_note": f"在 switch 前处理，格式: {fmt}",
                "parse_rule": prule,
                "parameter_meaning": pmean,
                "frontend_purpose_note": note,
                "backend_purpose_to_confirm": "",
                "backend_emit_format": f"QT_Return message: {prefix}...",
            }
        )
    return rows


def write_csv(
    path: Path,
    columns: list[tuple[str, str]],
    rows: list[dict],
) -> None:
    """columns: (英文键, 中文表头)"""
    path.parent.mkdir(parents=True, exist_ok=True)
    headers = [c[1] for c in columns]
    with path.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=headers, extrasaction="ignore")
        w.writeheader()
        for r in rows:
            w.writerow({cn: r.get(en, "") for en, cn in columns})


def main() -> None:
    out_send = PROTO_DIR / "frontend-to-backend-commands.csv"
    out_recv = PROTO_DIR / "backend-to-frontend-messages.csv"

    outgoing = extract_outgoing_from_vue_files()
    for i, r in enumerate(outgoing, 1):
        r["id"] = str(i)

    send_fields = [
        ("id", "序号"),
        ("protocol_type", "协议类型"),
        ("message_prefix", "消息前缀"),
        ("message_example_static", "静态示例"),
        ("parameter_hint", "参数说明"),
        ("backend_param_match", "后端参数匹配"),
        ("source_file", "源文件"),
        ("frontend_purpose_note", "前端用途说明"),
        ("backend_purpose_to_confirm", "后端用途待确认"),
        ("backend_handler_note", "后端处理说明"),
    ]
    write_csv(out_send, send_fields, outgoing)

    meta = extract_incoming_non_qt_return()
    special = extract_incoming_special_prefixes()
    cases = extract_incoming_qt_return_cases()
    incoming = meta + special + cases
    for i, r in enumerate(incoming, 1):
        r["id"] = str(i)

    recv_fields = [
        ("id", "序号"),
        ("incoming_channel", "入站通道"),
        ("qt_return_message_prefix", "消息前缀"),
        ("parse_note", "解析说明"),
        ("parse_rule", "解析规律"),
        ("parameter_meaning", "参数含义"),
        ("frontend_purpose_note", "当前返回信息"),
        ("backend_purpose_to_confirm", "后端用途待确认"),
        ("backend_emit_format", "后端发出格式"),
    ]
    write_csv(out_recv, recv_fields, incoming)

    qt_repo = discover_sibling_repo(ROOT, "QUARCS_QT-SeverProgram")
    proc_repo = discover_sibling_repo(ROOT, "QUARCS_Process")
    mw_path = (qt_repo / "src" / "mainwindow.cpp") if qt_repo else Path()
    qm_path = (proc_repo / "src" / "quarcsmonitor.cpp") if proc_repo else Path()
    qt_hints = extract_qt_mainwindow_hints(mw_path)
    process_hints = extract_process_monitor_hints(qm_path)
    unified = build_unified_table(outgoing, APP_VUE, qt_hints, process_hints)
    out_unified = PROTO_DIR / "unified-websocket-protocol.csv"
    write_unified_csv(out_unified, unified)

    print(f"Wrote {len(outgoing)} rows -> {out_send}")
    print(f"Wrote {len(incoming)} rows -> {out_recv}")
    print(f"Wrote {len(unified)} rows -> {out_unified}")


if __name__ == "__main__":
    main()
