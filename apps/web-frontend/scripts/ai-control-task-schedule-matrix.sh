#!/usr/bin/env bash
# 按 AI-Control README：每步先 GET /status，再 POST /run 执行 task-schedule 组合。
# 依赖：本会话已启动（npm run e2e:ai-control:session），curl；可选 jq 美化输出。
set -euo pipefail

BASE="${E2E_AI_CONTROL_SESSION_URL:-http://127.0.0.1:39281}"

status() {
  echo "=== GET /status ==="
  if command -v jq >/dev/null 2>&1; then
    curl -sS "$BASE/status" | jq .
  else
    curl -sS "$BASE/status"
    echo
  fi
}

status_cmd() {
  local fp="$1"
  echo "=== GET /status?command=task-schedule flowParams=$fp ==="
  if command -v jq >/dev/null 2>&1; then
    curl -sS --get "$BASE/status" --data-urlencode "command=task-schedule" --data-urlencode "flowParams=$fp" | jq .
  else
    curl -sS --get "$BASE/status" --data-urlencode "command=task-schedule" --data-urlencode "flowParams=$fp"
    echo
  fi
}

run() {
  local body="$1"
  echo "=== POST /run $body ==="
  local out
  out=$(curl -sS -X POST "$BASE/run" -H "Content-Type: application/json" -d "$body")
  if command -v jq >/dev/null 2>&1; then
    echo "$out" | jq .
  else
    echo "$out"
  fi
  if command -v jq >/dev/null 2>&1; then
    if ! echo "$out" | jq -e '.ok == true' >/dev/null 2>&1; then
      echo "ERROR: run did not return ok:true" >&2
      exit 1
    fi
  else
    if echo "$out" | grep -q '"ok":false'; then
      echo "ERROR: run reported ok:false" >&2
      exit 1
    fi
  fi
}

echo "Using session: $BASE"
curl -sS -o /dev/null -w "health HTTP %{http_code}\n" "$BASE/health" || { echo "Session not reachable"; exit 1; }

echo "=== Bootstrap: gotoHome + 关计划表（清除残留确认框 / Vuetify scrim） ==="
status
run '{"commandName":"task-schedule","flowParams":{"gotoHome":true,"scheduleInteract":{"closePanel":true}}}'
status

PRESET_BASE="e2e-matrix-$(date +%Y%m%d%H%M%S)"
PRESET_SAVE="${PRESET_BASE}-save"
PRESET_DEL_CONFIRM="${PRESET_BASE}-del-confirm"
PRESET_DEL_CANCEL="${PRESET_BASE}-del-cancel"

# --- 套件 A ---
status_cmd '{}'
run '{"commandName":"task-schedule","flowParams":{"scheduleInteract":{"closePanel":true}}}'
status

status_cmd '{"scheduleInteract":{"toggleLeftToolbar":true,"addRow":true,"closePanel":true}}'
run '{"commandName":"task-schedule","flowParams":{"scheduleInteract":{"toggleLeftToolbar":true,"addRow":true,"closePanel":true}}}'
status

run '{"commandName":"task-schedule","flowParams":{"scheduleInteract":{"addRow":true,"closePanel":true}}}'
run '{"commandName":"task-schedule","flowParams":{"scheduleInteract":{"addRow":true,"closePanel":true}}}'
status_cmd '{"scheduleInteract":{"selectRow":2,"deleteSelectedRow":true,"closePanel":true}}'
run '{"commandName":"task-schedule","flowParams":{"scheduleInteract":{"selectRow":2,"deleteSelectedRow":true,"closePanel":true}}}'
sleep 1
# 再删一次第 2 行（删除后下一行顶到第 2 行，不依赖总行数）
run '{"commandName":"task-schedule","flowParams":{"scheduleInteract":{"selectRow":2,"deleteSelectedRow":true,"closePanel":true}}}'
status

status_cmd '{"scheduleInteract":{"toggleLeftToolbar":true,"closePanel":true}}'
run '{"commandName":"task-schedule","flowParams":{"scheduleInteract":{"toggleLeftToolbar":true,"closePanel":true}}}'
run '{"commandName":"task-schedule","flowParams":{"scheduleInteract":{"addRow":true,"closePanel":true}}}'
status

# --- 套件 B ---
status_cmd "{\"scheduleInteract\":{\"openSavePresetDialog\":true,\"presetName\":\"$PRESET_SAVE\",\"presetSave\":true,\"closePresetDialog\":true,\"closePanel\":true}}"
run "{\"commandName\":\"task-schedule\",\"flowParams\":{\"scheduleInteract\":{\"openSavePresetDialog\":true,\"presetName\":\"$PRESET_SAVE\",\"presetSave\":true,\"closePresetDialog\":true,\"closePanel\":true}}}"
status

run "{\"commandName\":\"task-schedule\",\"flowParams\":{\"scheduleInteract\":{\"openLoadPresetDialog\":true,\"presetName\":\"$PRESET_SAVE\",\"presetLoadOk\":true,\"closePanel\":true}}}"
status

# 另存两个预设供删除用
run "{\"commandName\":\"task-schedule\",\"flowParams\":{\"scheduleInteract\":{\"openSavePresetDialog\":true,\"presetName\":\"$PRESET_DEL_CONFIRM\",\"presetSave\":true,\"closePresetDialog\":true,\"closePanel\":true}}}"
run "{\"commandName\":\"task-schedule\",\"flowParams\":{\"scheduleInteract\":{\"openSavePresetDialog\":true,\"presetName\":\"$PRESET_DEL_CANCEL\",\"presetSave\":true,\"closePresetDialog\":true,\"closePanel\":true}}}"

status_cmd "{\"scheduleInteract\":{\"openLoadPresetDialog\":true,\"presetName\":\"$PRESET_DEL_CANCEL\",\"presetDelete\":\"cancel\",\"closePresetDialog\":true,\"closePanel\":true}}"
run "{\"commandName\":\"task-schedule\",\"flowParams\":{\"scheduleInteract\":{\"openLoadPresetDialog\":true,\"presetName\":\"$PRESET_DEL_CANCEL\",\"presetDelete\":\"cancel\",\"closePresetDialog\":true,\"closePanel\":true}}}"
status

status_cmd "{\"scheduleInteract\":{\"openLoadPresetDialog\":true,\"presetName\":\"$PRESET_DEL_CONFIRM\",\"presetDelete\":\"confirm\",\"closePresetDialog\":true,\"closePanel\":true}}"
run "{\"commandName\":\"task-schedule\",\"flowParams\":{\"scheduleInteract\":{\"openLoadPresetDialog\":true,\"presetName\":\"$PRESET_DEL_CONFIRM\",\"presetDelete\":\"confirm\",\"closePresetDialog\":true,\"closePanel\":true}}}"
status

status_cmd "{\"scheduleInteract\":{\"openLoadPresetDialog\":true,\"presetName\":\"$PRESET_SAVE\",\"presetDelete\":true,\"closePresetDialog\":true,\"closePanel\":true}}"
run "{\"commandName\":\"task-schedule\",\"flowParams\":{\"scheduleInteract\":{\"openLoadPresetDialog\":true,\"presetName\":\"$PRESET_SAVE\",\"presetDelete\":true,\"closePresetDialog\":true,\"closePanel\":true}}}"
status

# --- 套件 C ---
status_cmd '{"scheduleInteract":{"toggleStartPause":true,"closePanel":true}}'
run '{"commandName":"task-schedule","flowParams":{"scheduleInteract":{"toggleStartPause":true,"closePanel":true}}}'
status
run '{"commandName":"task-schedule","flowParams":{"scheduleInteract":{"toggleStartPause":true,"closePanel":true}}}'
status

run '{"commandName":"task-schedule","flowParams":{"scheduleInteract":{"addRow":true,"closePanel":true}}}'
status

# --- 套件 D ---
status_cmd '{"scheduleInteract":{"addRow":true,"selectRow":1,"openSavePresetDialog":true,"presetName":"'"$PRESET_BASE"'-cross","presetSave":true,"closePresetDialog":true,"closePanel":true}}'
run '{"commandName":"task-schedule","flowParams":{"scheduleInteract":{"addRow":true,"selectRow":1,"openSavePresetDialog":true,"presetName":"'"$PRESET_BASE"'-cross","presetSave":true,"closePresetDialog":true,"closePanel":true}}}'
status

run "{\"commandName\":\"task-schedule\",\"flowParams\":{\"scheduleInteract\":{\"toggleLeftToolbar\":true,\"openLoadPresetDialog\":true,\"presetName\":\"${PRESET_BASE}-cross\",\"presetLoadOk\":true,\"closePanel\":true}}}"
status

# --- 收尾还原 ---
status
run '{"commandName":"task-schedule","flowParams":{"scheduleInteract":{"closePresetDialog":true,"closePanel":true}}}'
status

echo "Matrix completed OK."
