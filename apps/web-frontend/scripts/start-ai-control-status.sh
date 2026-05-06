#!/usr/bin/env bash
# 启动 AI-Control 本地会话并访问 /status
# 用法:
#   bash scripts/start-ai-control-status.sh
#   E2E_BASE_URL=http://192.168.1.106:8080 bash scripts/start-ai-control-status.sh
# 可选环境变量:
#   E2E_AI_CONTROL_SESSION_PORT   默认 39281
#   E2E_BASE_URL                  默认 http://192.168.1.106:8080
#   E2E_HEADED                    默认 1
#   E2E_AI_CONTROL_SESSION_NO_KILL_STALE 默认 1（不抢占已存在会话端口，不误杀已有页面）
#   OPEN_BROWSER                  默认 1（可设 0 仅打印地址）
#   SESSION_LOG_FILE              默认 /tmp/ai-control-session.log

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd -P)"
PORT="${E2E_AI_CONTROL_SESSION_PORT:-39281}"
BASE_URL="${E2E_BASE_URL:-http://192.168.1.106:8080}"
HEADED="${E2E_HEADED:-1}"
OPEN_BROWSER="${OPEN_BROWSER:-1}"
NO_KILL_STALE="${E2E_AI_CONTROL_SESSION_NO_KILL_STALE:-1}"
LOG_FILE="${SESSION_LOG_FILE:-/tmp/ai-control-session.log}"
STATUS_URL="http://127.0.0.1:${PORT}/status"

is_status_ready() {
  curl -fsS --max-time 2 "$STATUS_URL" >/dev/null 2>&1
}

start_session_if_needed() {
  if is_status_ready; then
    echo "[info] AI-Control 会话已在运行: $STATUS_URL"
    return 0
  fi

  echo "[info] 启动 AI-Control 会话..."
  echo "[info] E2E_BASE_URL=$BASE_URL"
  echo "[info] 日志文件: $LOG_FILE"

  (
    cd "$ROOT"
    # 保持 stdin 打开，避免非交互环境下会话直接退出
    (while true; do sleep 3600; done) | \
      E2E_BASE_URL="$BASE_URL" \
      E2E_HEADED="$HEADED" \
      E2E_AI_CONTROL_SESSION_NO_KILL_STALE="$NO_KILL_STALE" \
      E2E_AI_CONTROL_SESSION_PORT="$PORT" \
      npm run e2e:ai-control:session
  ) >"$LOG_FILE" 2>&1 &

  echo "[info] 会话进程已拉起，等待 /status 就绪..."
  for _ in $(seq 1 90); do
    if is_status_ready; then
      echo "[ok] /status 已就绪: $STATUS_URL"
      return 0
    fi
    sleep 1
  done

  echo "[error] 等待 /status 超时，请检查日志: $LOG_FILE" >&2
  exit 1
}

print_status() {
  if command -v jq >/dev/null 2>&1; then
    curl -fsS "$STATUS_URL" | jq '{
      mainPage: .status.mainPage,
      menuDrawer: .status.menuDrawer,
      selectedDevice: .status.selectedDevice,
      busyStates: .status.busyStates,
      polarAxis: .status.polarAxis.activeView
    }'
  else
    curl -fsS "$STATUS_URL"
  fi
}

open_browser_if_needed() {
  if [[ "$OPEN_BROWSER" != "1" ]]; then
    echo "[info] 已跳过自动打开浏览器，地址: $STATUS_URL"
    return 0
  fi

  if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$STATUS_URL" >/dev/null 2>&1 || true
    echo "[info] 已尝试打开浏览器: $STATUS_URL"
  else
    echo "[info] 未检测到 xdg-open，请手动打开: $STATUS_URL"
  fi
}

start_session_if_needed
print_status
open_browser_if_needed

echo "[done] 可用命令: curl -fsS $STATUS_URL | jq"
