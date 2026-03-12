#!/usr/bin/env bash
# 执行 test001 全部任务，记录日志，每 10 分钟监测运行状态；
# 若超过 2 分钟没有新的日志输出则判定为卡住，并记录原因（进程树、最后日志等）。
#
# 用法：
#   cd apps/web-frontend && bash scripts/run-test001-sequential-with-monitor.sh

set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

RESULTS_DIR="$ROOT_DIR/test-results"
mkdir -p "$RESULTS_DIR"
RUN_TS=$(date +%Y%m%d_%H%M%S)

# 本轮监控用的主日志（所有 stdout/stderr 都会 tee 到这里，用于判断是否有新输出）
MONITOR_LOG="$RESULTS_DIR/run-test001-sequential-monitor.${RUN_TS}.log"
# 卡住时的诊断报告
STUCK_REPORT_DIR="$RESULTS_DIR/stuck-reports"
mkdir -p "$STUCK_REPORT_DIR"

# 每 10 分钟检查一次；超过 2 分钟无新日志视为卡住
CHECK_INTERVAL_SEC=600
NO_LOG_THRESHOLD_SEC=120

# 后台监控：每 CHECK_INTERVAL_SEC 检查一次，若日志超过 NO_LOG_THRESHOLD_SEC 未更新且主进程仍在运行则写卡住报告
monitor_loop() {
  local main_pid=$1
  local log_file=$2
  while kill -0 "$main_pid" 2>/dev/null; do
    sleep "$CHECK_INTERVAL_SEC"
    kill -0 "$main_pid" 2>/dev/null || break
    if [ ! -f "$log_file" ]; then
      continue
    fi
    local now_sec
    now_sec=$(date +%s)
    local mtime_sec
    mtime_sec=$(stat -c %Y "$log_file" 2>/dev/null) || mtime_sec=$(stat -f %m "$log_file" 2>/dev/null)
    [ -z "${mtime_sec:-}" ] && continue
    local age=$((now_sec - mtime_sec))
    if [ "$age" -gt "$NO_LOG_THRESHOLD_SEC" ]; then
      local stuck_ts
      stuck_ts=$(date +%Y%m%d_%H%M%S)
      local report="$STUCK_REPORT_DIR/stuck-${stuck_ts}.report.txt"
      {
        echo "=============================================="
        echo "检测到卡住 (无新日志超过 ${NO_LOG_THRESHOLD_SEC} 秒)"
        echo "时间: $(date -Iseconds 2>/dev/null || date '+%Y-%m-%dT%H:%M:%S%z')"
        echo "主进程 PID: $main_pid"
        echo "监控日志: $log_file"
        echo "日志最后修改: $(date -Iseconds -d "@${mtime_sec}" 2>/dev/null || date -r "$mtime_sec" '+%Y-%m-%dT%H:%M:%S%z' 2>/dev/null)"
        echo "=============================================="
        echo ""
        echo "--- 主进程及子进程树 ---"
        (pstree -p "$main_pid" 2>/dev/null) || (ps -o pid,ppid,cmd -g $(ps -o pgid= -p "$main_pid" 2>/dev/null) 2>/dev/null) || ps aux | head -1; ps aux | grep -E "^[^ ]+ +$main_pid " || true
        echo ""
        echo "--- 监控日志最后 150 行 ---"
        tail -n 150 "$log_file" | sed 's/^/  /'
        echo ""
        echo "--- 当前运行中的 node/playwright 相关进程 ---"
        (ps aux | grep -E 'node|playwright' | grep -v grep) || true
      } > "$report"
      echo "[监控] 已判定卡住，诊断报告: $report" >> "$log_file"
    fi
  done
}

echo "========== test001 顺序测试（带监控）==========" | tee "$MONITOR_LOG"
echo "监控日志: $MONITOR_LOG" | tee -a "$MONITOR_LOG"
echo "每 ${CHECK_INTERVAL_SEC} 秒检查一次；超过 ${NO_LOG_THRESHOLD_SEC} 秒无新日志将写入卡住报告到: $STUCK_REPORT_DIR" | tee -a "$MONITOR_LOG"
echo "" | tee -a "$MONITOR_LOG"

# 运行实际测试脚本，所有输出同时写入 MONITOR_LOG
bash "$ROOT_DIR/scripts/run-test001-sequential.sh" 2>&1 | tee -a "$MONITOR_LOG" &
MAIN_PID=$!

# 启动后台监控
monitor_loop "$MAIN_PID" "$MONITOR_LOG" &
MONITOR_PID=$!

# 等待主任务结束
wait $MAIN_PID
MAIN_EXIT=$?
# 监控循环会在主进程退出后因 kill -0 失败而退出
kill $MONITOR_PID 2>/dev/null || true
wait $MONITOR_PID 2>/dev/null || true

echo "" | tee -a "$MONITOR_LOG"
echo "主任务已结束，退出码: $MAIN_EXIT" | tee -a "$MONITOR_LOG"
echo "完整日志见: $MONITOR_LOG" | tee -a "$MONITOR_LOG"
exit $MAIN_EXIT
