#!/usr/bin/env bash
# AI-Control E2E 分阶段执行（新会话可逐步跑通全部能力）。
#
# Phase 1（static）：仅流程展开 + 环境变量合并，不打开浏览器、不依赖 dev server。
# Phase 2（browser）：testDir 下全部 spec，需可访问的 E2E_BASE_URL（默认见 e2e.config.cjs）。
#
# 用法（在 apps/web-frontend 目录）:
#   bash scripts/ai-control-e2e-phased.sh static
#   E2E_BASE_URL=http://127.0.0.1:8080 bash scripts/ai-control-e2e-phased.sh browser
#   bash scripts/ai-control-e2e-phased.sh all
# 额外参数会传给 playwright test，例如:
#   bash scripts/ai-control-e2e-phased.sh static --grep "image-file-manager"
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd -P)"
cd "$ROOT"

PHASE="${1:-all}"
if [[ "$PHASE" =~ ^(static|browser|all|1|2)$ ]]; then
  shift
else
  PHASE="all"
fi

run_phase_static() {
  echo "=== AI-Control Phase 1: cli-flow-planning + flow-params-image-manager（无浏览器）==="
  npx playwright test \
    AI-Control/e2e/cli-flow-planning.spec.ts \
    AI-Control/e2e/flow-params-image-manager.spec.ts \
    --workers=1 \
    "$@"
}

run_phase_browser() {
  echo "=== AI-Control Phase 2: 全量 e2e（需 E2E_BASE_URL 可访问）==="
  export E2E_BASE_URL="${E2E_BASE_URL:-http://127.0.0.1:8080}"
  npx playwright test AI-Control/e2e/ --workers=1 "$@"
}

case "$PHASE" in
  static|1)
    run_phase_static "$@"
    ;;
  browser|2)
    run_phase_browser "$@"
    ;;
  all)
    run_phase_static "$@"
    run_phase_browser "$@"
    ;;
  *)
    echo "用法: $0 [static|browser|all] [传给 playwright 的额外参数...]" >&2
    echo "  static  Phase1 无浏览器" >&2
    echo "  browser Phase2 全量（设置 E2E_BASE_URL）" >&2
    echo "  all     先 static 再 browser" >&2
    exit 1
    ;;
esac
