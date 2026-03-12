#!/usr/bin/env bash
# test001 依次测试与重复验证：按 1→10 顺序执行，每项先跑 1 次，通过则再跑 2 次（共 3 次）；失败则记录问题并继续下一项。
#
# 用法（任选其一）：
#   cd apps/web-frontend && bash scripts/run-test001-sequential.sh
#   npm run e2e:test001:sequential
#   make e2e-test001-sequential
#
# 输出：test-results/<脚本名>.<时间戳>.log、.report.txt；录屏/截图/trace 写入 test-results/<脚本名>.<时间戳>/；不同脚本不同命名，避免互相覆盖。
# 可选环境变量：E2E_BASE_URL、E2E_WS、E2E_BACKEND_HOST 等（见 e2e.config.cjs）。

set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT_NAME="$(basename "${BASH_SOURCE[0]}" .sh)"
cd "$ROOT_DIR"

# test001 下 10 个 spec，按数字顺序
SPECS=(
  "tests/e2e/test001/1-general-settings-all-interactions.spec.ts"
  "tests/e2e/test001/2-power-management-menu-and-dialogs.spec.ts"
  "tests/e2e/test001/3-guider-qhyccd-two-connections-loop.spec.ts"
  "tests/e2e/test001/4-maincamera-qhyccd-two-connections-loop.spec.ts"
  "tests/e2e/test001/5-mount-eqmod-connect-control-goto.spec.ts"
  "tests/e2e/test001/6-telescopes-set-focal-length-510.spec.ts"
  "tests/e2e/test001/7-focuser-connect-control-position.spec.ts"
  "tests/e2e/test001/8-cfw-switching-capture-and-config.spec.ts"
  "tests/e2e/test001/9-polar-axis-calibration-menu-and-widget.spec.ts"
  "tests/e2e/test001/10-image-file-manager.spec.ts"
)

NAMES=(
  "1-总设置-全交互与子项覆盖"
  "2-电源管理-Power菜单与确认弹窗"
  "3-导星镜-QHYCCD双连接与循环启停三次"
  "4-主相机-QHYCCD双连接与200帧连续拍摄"
  "5-赤道仪-EQMod连接控制与ParkTrackGotoHome"
  "6-望远镜-Telescopes仅设置焦距510"
  "7-电调-连接控制与位置变化记录"
  "8-滤镜轮-拍摄面板与配置菜单切换"
  "9-极轴校准-连接设备并执行极轴校准"
  "10-图像文件管理-打开面板与功能测试"
)

RESULTS_DIR="$ROOT_DIR/test-results"
mkdir -p "$RESULTS_DIR"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
ARTIFACT_SUBDIR="${SCRIPT_NAME}.${TIMESTAMP}"
LOG="$RESULTS_DIR/${SCRIPT_NAME}.${TIMESTAMP}.log"
REPORT="$RESULTS_DIR/${SCRIPT_NAME}.${TIMESTAMP}.report.txt"
RUN_LOG=$(mktemp)
trap 'rm -f "$RUN_LOG"' EXIT

# 本次运行的录屏/截图/trace 统一放入该子目录，与日志/报告同前缀，避免与其他脚本或多次运行混淆
export E2E_ARTIFACT_SUBDIR="$ARTIFACT_SUBDIR"

# 记录失败：用例编号、轮次、报错摘要（取 run 输出最后一段）
record_failure() {
  local spec="$1"
  local run_phase="$2"   # "第1次" | "第2次" | "第3次"
  local run_log_file="$3"
  local name
  name=$(basename "$spec" .spec.ts)
  {
    echo "========== 失败记录 =========="
    echo "用例编号与名称: $name"
    echo "失败轮次: $run_phase"
    echo "错误类型/报错摘要:"
    # 从 run 日志中提取可能包含错误信息的最后 80 行
    tail -n 80 "$run_log_file" | sed 's/^/  /'
    echo "产物: test-results/$ARTIFACT_SUBDIR/（本脚本本次运行的 trace/video/screenshot）"
    echo ""
  } >> "$REPORT"
}

# 汇总：全部通过列表、有问题列表
PASSED_ALL=()
FAILED_ITEMS=()

echo "========== test001 依次测试（先 1 次，通过再 2 次）==========" | tee -a "$LOG"
echo "日志: $LOG" | tee -a "$LOG"
echo "报告: $REPORT" | tee -a "$LOG"
echo "录屏/截图/trace: $RESULTS_DIR/$ARTIFACT_SUBDIR/" | tee -a "$LOG"
echo "baseURL: ${E2E_BASE_URL:-<默认 e2e.config.cjs>}" | tee -a "$LOG"
echo "" | tee -a "$LOG"

for i in "${!SPECS[@]}"; do
  spec="${SPECS[$i]}"
  name="${NAMES[$i]}"
  idx=$((i + 1))
  echo "[$idx/10] $name" | tee -a "$LOG"

  # 第一轮：跑 1 次（用 PIPESTATUS 取 playwright 的退出码，tee 会吞掉管道出口码）
  npx playwright test "$spec" --reporter=list 2>&1 | tee "$RUN_LOG" >> "$LOG"
  run_exit=${PIPESTATUS[0]}
  if [ "$run_exit" -ne 0 ]; then
    record_failure "$spec" "第1次" "$RUN_LOG"
    FAILED_ITEMS+=("$name（第1次失败）")
    echo "  结果: 第1次失败，已记录，跳过重复。" | tee -a "$LOG"
    echo "" | tee -a "$LOG"
    continue
  fi

  # 第二轮：再跑 2 次（共 3 次）
  npx playwright test "$spec" --repeat-each=2 --reporter=list 2>&1 | tee "$RUN_LOG" >> "$LOG"
  run_exit=${PIPESTATUS[0]}
  if [ "$run_exit" -ne 0 ]; then
    record_failure "$spec" "第2或第3次" "$RUN_LOG"
    FAILED_ITEMS+=("$name（第2/3次中失败）")
    echo "  结果: 第2/3次中失败，已记录。" | tee -a "$LOG"
  else
    PASSED_ALL+=("$name")
    echo "  结果: 3 次均通过。" | tee -a "$LOG"
  fi
  echo "" | tee -a "$LOG"
done

# 汇总写入报告文件并打印
{
  echo "=============================================="
  echo "test001 顺序测试汇总"
  echo "=============================================="
  echo ""
  echo "--- 通过且 3 次均通过的项 ---"
  if [ ${#PASSED_ALL[@]} -eq 0 ]; then
    echo "（无）"
  else
    printf '%s\n' "${PASSED_ALL[@]}"
  fi
  echo ""
  echo "--- 有问题的项及说明 ---"
  if [ ${#FAILED_ITEMS[@]} -eq 0 ]; then
    echo "（无）"
  else
    printf '%s\n' "${FAILED_ITEMS[@]}"
    echo ""
    echo "详细失败记录见本文件上方「失败记录」段落。"
  fi
} | tee -a "$REPORT"

echo ""
echo "运行日志: $LOG"
echo "汇总报告: $REPORT"
