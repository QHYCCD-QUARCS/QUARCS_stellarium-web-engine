#!/usr/bin/env bash
# 在默认目标设备上跑 AI-Control Playwright 项目（可通过 E2E_BASE_URL 覆盖）。
# 用法: apps/web-frontend 下  npm run e2e:ai-control:target
# 或:   E2E_BASE_URL=http://192.168.1.104:8080 bash scripts/ai-control-e2e-target.sh
# 本脚本固定单 worker（--workers=1），与 AI-Control 测试计划一致；`--workers=1` 置于末尾以覆盖用户误传的 worker 数。
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd -P)"
cd "$ROOT"
export E2E_BASE_URL="${E2E_BASE_URL:-http://192.168.1.104:8080}"
exec npm run e2e -- "$@" --workers=1
