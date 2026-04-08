#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="${SCRIPT_DIR}"

WITH_SKYDATA=0
ENGINE_UPDATE=0
NO_BACKUP=0
SKIP_BUILD=0
SHOW_HELP=0

usage() {
  cat <<'EOF'
Usage: hot_update_to_pi.sh [options]

One-click fast update for the Raspberry Pi business machine.
Default behavior:
  1. Rebuild only the frontend bundle (no engine rebuild, no skydata copy)
  2. Deploy the rebuilt dist/ to the Raspberry Pi (no skydata sync)

Options:
  --with-skydata   Include skydata in both build and deploy.
  --engine-update  Rebuild stellarium-web-engine.{js,wasm} before frontend build.
  --skip-build     Skip local build and deploy the existing dist/ directly.
  --no-backup      Skip the remote backup during deployment.
  -h, --help       Show this help message.

Typical use:
  ./hot_update_to_pi.sh

When to use:
  - Most Vue/UI/button/panel/style changes on the static deployment flow.

When not enough:
  - If the business machine were serving raw source files directly, this script would be unnecessary.
    But the current business machine serves built dist/, so Vue source changes still need a fast rebuild.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --with-skydata)
      WITH_SKYDATA=1
      shift
      ;;
    --engine-update)
      ENGINE_UPDATE=1
      shift
      ;;
    --skip-build)
      SKIP_BUILD=1
      shift
      ;;
    --no-backup)
      NO_BACKUP=1
      shift
      ;;
    -h|--help)
      SHOW_HELP=1
      shift
      ;;
    *)
      echo "Unknown option: $1" >&2
      SHOW_HELP=1
      break
      ;;
  esac
done

if [[ "${SHOW_HELP}" -eq 1 ]]; then
  usage
  exit 0
fi

BUILD_ARGS=()
DEPLOY_ARGS=()

if [[ "${WITH_SKYDATA}" -eq 1 ]]; then
  BUILD_ARGS+=(--with-skydata)
  DEPLOY_ARGS+=(--with-skydata)
fi

if [[ "${ENGINE_UPDATE}" -eq 1 ]]; then
  BUILD_ARGS+=(--engine-update)
fi

if [[ "${NO_BACKUP}" -eq 1 ]]; then
  DEPLOY_ARGS+=(--no-backup)
fi

if [[ "${SKIP_BUILD}" -eq 0 ]]; then
  echo "Step 1/2: Fast frontend build"
  "${REPO_ROOT}/compile_frontend.sh" "${BUILD_ARGS[@]}"
else
  echo "Step 1/2: Skipping build"
fi

echo "Step 2/2: Deploy to Raspberry Pi"
"${REPO_ROOT}/deploy_to_pi.sh" "${DEPLOY_ARGS[@]}"

echo "Hot update deployment completed successfully."
