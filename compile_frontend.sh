#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="${SCRIPT_DIR}"
FRONTEND_DIR="${REPO_ROOT}/apps/web-frontend"
FRONTEND_ENGINE_DIR="${FRONTEND_DIR}/src/assets/js"
LOCAL_NODE_PATH="${LOCAL_NODE_PATH:-/usr/bin:${PATH}}"
WEBPACK_NODE_OPTIONS="${WEBPACK_NODE_OPTIONS:---openssl-legacy-provider}"
BUILD_VERSION="${BUILD_VERSION:-${VUE_APP_VERSION:-$(date +%Y%m%d%H%M)}}"

INCLUDE_SKYDATA=0
INSTALL_MODE="auto"
ENGINE_UPDATE=0
SHOW_HELP=0

usage() {
  cat <<'EOF'
Usage: compile_frontend.sh [options]

Build the web frontend into apps/web-frontend/dist.

Options:
  --with-skydata     Copy skydata into dist/ during build. This is the slow path.
  --skip-skydata     Do not copy skydata into dist/ (default).
  --engine-update    Rebuild and refresh stellarium-web-engine.{js,wasm} before frontend build.
  --install          Force npm dependency installation before build.
  --skip-install     Skip npm dependency installation even if node_modules is missing.
  -h, --help         Show this help message.

Notes:
  - Default behavior is frontend-only packaging: reuse the existing engine artifacts already present
    in apps/web-frontend/src/assets/js.
  - Use --engine-update only when C/C++ engine or wasm outputs changed.
  - Fast build is usually enough when skydata has not changed and the device already has it.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --with-skydata)
      INCLUDE_SKYDATA=1
      shift
      ;;
    --skip-skydata)
      INCLUDE_SKYDATA=0
      shift
      ;;
    --engine-update)
      ENGINE_UPDATE=1
      shift
      ;;
    --install)
      INSTALL_MODE="always"
      shift
      ;;
    --skip-install)
      INSTALL_MODE="never"
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

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require_cmd python3
require_cmd npm

if [[ ! -d "${FRONTEND_DIR}" ]]; then
  echo "Frontend directory not found: ${FRONTEND_DIR}" >&2
  exit 1
fi

echo "Using frontend build version: ${BUILD_VERSION}"

if [[ "${ENGINE_UPDATE}" -eq 1 ]]; then
  require_cmd emcc
  require_cmd scons
  echo "Building stellarium web engine"
  (
    cd "${REPO_ROOT}"
    emscons scons -j8 mode=release
  )

  echo "Syncing engine artifacts into frontend"
  cp "${REPO_ROOT}/build/stellarium-web-engine.js" "${FRONTEND_ENGINE_DIR}/"
  cp "${REPO_ROOT}/build/stellarium-web-engine.wasm" "${FRONTEND_ENGINE_DIR}/"
else
  echo "Skipping engine rebuild; reusing existing frontend engine artifacts"
fi

for required_path in \
  "${FRONTEND_ENGINE_DIR}/stellarium-web-engine.js" \
  "${FRONTEND_ENGINE_DIR}/stellarium-web-engine.wasm"; do
  if [[ ! -f "${required_path}" ]]; then
    echo "Missing frontend engine artifact: ${required_path}" >&2
    echo "Run with --engine-update to rebuild the engine artifacts." >&2
    exit 1
  fi
done

if [[ "${INSTALL_MODE}" = "always" ]]; then
  echo "Installing frontend dependencies"
  (
    cd "${FRONTEND_DIR}"
    env PATH="${LOCAL_NODE_PATH}" bash -lc 'npm ci || npm install'
  )
elif [[ "${INSTALL_MODE}" = "auto" ]]; then
  if [[ -d "${FRONTEND_DIR}/node_modules" ]]; then
    echo "Skipping dependency install; node_modules already exists"
  else
    echo "Installing frontend dependencies (node_modules missing)"
    (
      cd "${FRONTEND_DIR}"
      env PATH="${LOCAL_NODE_PATH}" bash -lc 'npm ci || npm install'
    )
  fi
else
  echo "Skipping dependency install"
fi

if [[ "${INCLUDE_SKYDATA}" -eq 1 ]]; then
  echo "Building frontend with skydata copy"
else
  echo "Building frontend without skydata copy"
fi

(
  cd "${FRONTEND_DIR}"
  env \
    PATH="${LOCAL_NODE_PATH}" \
    NODE_OPTIONS="${WEBPACK_NODE_OPTIONS}" \
    BUILD_VERSION="${BUILD_VERSION}" \
    VUE_APP_VERSION="${BUILD_VERSION}" \
    SWE_COPY_SKYDATA="${INCLUDE_SKYDATA}" \
    npm run build
)

echo "Build complete: ${FRONTEND_DIR}/dist"
