#!/usr/bin/env bash
# 作用：停止 8080/9090 服务 ->（可选）更新引擎 -> 构建前端 -> 启动服务，并输出每步耗时/检查结果
set -euo pipefail

cd "$(dirname "$0")"
SCRIPT_DIR="$(pwd -P)"

PORT_HTTP="${PORT_HTTP:-8080}"
PORT_HTTPS="${PORT_HTTPS:-9090}"
TILES_MODE="${TILES_MODE:-}"          # sudo 默认 copy；普通用户默认 symlink
SKYDATA_MODE="${SKYDATA_MODE:-}"      # sudo 默认 copy；普通用户默认 symlink
ENGINE_UPDATE="${ENGINE_UPDATE:-1}"   # 1=make update-engine, 0=跳过（默认跳过：该步骤需要 docker 且耗时较长）
BUMP_VERSION="${BUMP_VERSION:-0}"     # 1=更新 .env 中 VUE_APP_VERSION, 0=保持不变（默认不改：避免触发前端全量重建）
WAIT_SERVERS="${WAIT_SERVERS:-1}"     # 1=启动后保持前台运行（wait），0=启动后直接返回
BUILD_ONLY="${BUILD_ONLY:-0}"         # 1=仅构建 dist/ 后退出，不启动本地 HTTP/HTTPS 预览（供 quarcs-update 等部署脚本使用）

# Pin Node via nvm to avoid /usr/bin/node (v12) breaking modern JS syntax (??, etc.)
NODE_VER="${NODE_VER:-20}"
ARTIFACT_UID="${SUDO_UID:-$(id -u)}"
ARTIFACT_GID="${SUDO_GID:-$(id -g)}"
RUN_AS_ROOT="0"
DEFAULT_HOME="${HOME:-}"

if [ "$(id -u)" -eq 0 ]; then
  RUN_AS_ROOT="1"
fi

if [ "${RUN_AS_ROOT}" = "1" ] && [ -n "${SUDO_USER:-}" ]; then
  DEFAULT_HOME="$(getent passwd "${SUDO_USER}" 2>/dev/null | cut -d: -f6)"
fi

if [ -z "${DEFAULT_HOME}" ]; then
  DEFAULT_HOME="${HOME:-}"
fi

if [ "${RUN_AS_ROOT}" = "1" ] && [ -n "${DEFAULT_HOME}" ] && [ "${HOME:-}" = "/root" ]; then
  export HOME="${DEFAULT_HOME}"
fi

NVM_DIR="${NVM_DIR:-${HOME}/.nvm}"

if [ -z "${TILES_MODE}" ]; then
  if [ "${RUN_AS_ROOT}" = "1" ]; then
    TILES_MODE="copy"
  else
    TILES_MODE="symlink"
  fi
fi

if [ -z "${SKYDATA_MODE}" ]; then
  if [ "${RUN_AS_ROOT}" = "1" ]; then
    SKYDATA_MODE="copy"
  else
    SKYDATA_MODE="symlink"
  fi
fi

log() { printf '%s\n' "$*"; }
warn() { printf 'WARN: %s\n' "$*" >&2; }
die() { printf 'ERROR: %s\n' "$*" >&2; exit 2; }

restore_path_owner() {
  local target="$1"

  if [ ! -e "${target}" ]; then
    return 0
  fi

  if [ "$(id -u)" -ne 0 ]; then
    return 0
  fi

  if [ -z "${SUDO_UID:-}" ] || [ -z "${SUDO_GID:-}" ]; then
    return 0
  fi

  chown -R "${ARTIFACT_UID}:${ARTIFACT_GID}" "${target}"
}

resolve_tiles_dir() {
  local candidate
  local candidates=()

  if [ -n "${TILES_SRC_DIR:-}" ]; then
    candidates+=("${TILES_SRC_DIR}")
  fi

  candidates+=(
    "${SCRIPT_DIR}/tile-server/tiles"
    "${SCRIPT_DIR}/../../tile-server/tiles"
    "${SCRIPT_DIR}/../tile-server/tiles"
    "../../tile-server/tiles"
    "../tile-server/tiles"
    "tile-server/tiles"
  )

  for candidate in "${candidates[@]}"; do
    if [ -d "${candidate}" ]; then
      readlink -f "${candidate}"
      return 0
    fi
  done

  return 1
}

resolve_skydata_dir() {
  local candidate
  local candidates=()

  if [ -n "${SKYDATA_SRC_DIR:-}" ]; then
    candidates+=("${SKYDATA_SRC_DIR}")
  fi

  candidates+=(
    "${SCRIPT_DIR}/../test-skydata"
    "${SCRIPT_DIR}/../../test-skydata"
    "${SCRIPT_DIR}/test-skydata"
    "../test-skydata"
    "../../test-skydata"
    "test-skydata"
  )

  for candidate in "${candidates[@]}"; do
    if [ -d "${candidate}" ]; then
      readlink -f "${candidate}"
      return 0
    fi
  done

  return 1
}

step() {
  local name="$1"; shift
  local start end
  start="$(date +%s)"
  log ""
  log "==> ${name}"
  "$@"
  end="$(date +%s)"
  log "<== ${name} (耗时 $((end - start))s)"
}

ensure_node() {
  # Load nvm in non-interactive shell and select Node version
  if [ ! -s "${NVM_DIR}/nvm.sh" ]; then
    die "nvm 未找到：${NVM_DIR}/nvm.sh 不存在。请安装 nvm 或设置 NVM_DIR。"
  fi

  # shellcheck disable=SC1090
  source "${NVM_DIR}/nvm.sh"

  if ! nvm use "${NODE_VER}" >/dev/null 2>&1; then
    warn "Node ${NODE_VER} 未安装，尝试安装..."
    nvm install "${NODE_VER}" >/dev/null
    nvm use "${NODE_VER}" >/dev/null
  fi

  log "[node] $(node -v) @ $(node -p 'process.execPath')"
}

kill_port() {
  local port="$1"
  # 优先只杀 LISTEN 的进程（避免误杀客户端连接）
  local pids=""
  if command -v lsof >/dev/null 2>&1; then
    pids="$(lsof -t -iTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  elif command -v ss >/dev/null 2>&1; then
    # ss 输出较杂，这里尽量取 pid=
    pids="$(ss -ltnp 2>/dev/null | awk -v p=":$port" '$4 ~ p {print $NF}' | sed -n 's/.*pid=\([0-9]\+\).*/\1/p' | sort -u || true)"
  fi

  if [ -z "${pids}" ]; then
    log "[port:$port] 未发现监听进程"
    return 0
  fi

  log "[port:$port] kill pids: ${pids}"
  # 先温和退出，再强杀
  kill ${pids} 2>/dev/null || true
  sleep 0.5
  kill -9 ${pids} 2>/dev/null || true
}

check_port_free() {
  local port="$1"
  if command -v lsof >/dev/null 2>&1; then
    if lsof -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
      warn "[port:$port] 仍被占用（可能有进程未退出）"
      return 1
    fi
  fi
  return 0
}

check_file() {
  local p="$1"
  if [ ! -e "$p" ]; then
    warn "缺失文件：$p"
    return 1
  fi
  log "✅ 存在：$p ($(stat -c '%s bytes' "$p" 2>/dev/null || echo 'unknown size'))"
}

stop_services() {
  kill_port "${PORT_HTTP}"
  kill_port "${PORT_HTTPS}"
  check_port_free "${PORT_HTTP}" || true
  check_port_free "${PORT_HTTPS}" || true
}

maybe_bump_version() {
  if [ "${BUMP_VERSION}" = "1" ]; then
    touch .env
    sed -i '/^VUE_APP_VERSION=/d' .env
    echo "VUE_APP_VERSION=$(date +%Y%m%d)" >> .env
    log "VUE_APP_VERSION 已更新：$(tail -n 1 .env)"
    log "提示：修改 .env 可能导致前端全量重建。若不需要可 BUMP_VERSION=0。"
  else
    log "保持 .env 不变（BUMP_VERSION=0）"
  fi
}

maybe_update_engine() {
  if [ "${ENGINE_UPDATE}" = "1" ]; then
    if ! command -v docker >/dev/null 2>&1; then
      warn "未安装 docker，跳过 update-engine（ENGINE_UPDATE=1 但 docker 不可用）"
      return 0
    fi
    if ! docker info >/dev/null 2>&1; then
      warn "docker 不可用/无权限访问 /var/run/docker.sock，跳过 update-engine（建议把当前用户加入 docker 组或用 sudo）"
      return 0
    fi
    if ! docker image inspect swe-dev >/dev/null 2>&1; then
      warn "docker 镜像 swe-dev 不存在，跳过 update-engine（可先执行 make setup 构建镜像）"
      return 0
    fi
    make update-engine
    restore_path_owner "src/assets/js/stellarium-web-engine.js"
    restore_path_owner "src/assets/js/stellarium-web-engine.wasm"
    check_file src/assets/js/stellarium-web-engine.js
    check_file src/assets/js/stellarium-web-engine.wasm
  else
    log "跳过 update-engine（ENGINE_UPDATE=0）"
  fi
}

build_frontend() {
  # Ensure node is correct BEFORE calling make (make will inherit PATH)
  ensure_node
  local tiles_dir=""
  local tiles_env=""
  local skydata_dir=""
  local copy_skydata_flag="0"

  tiles_dir="$(resolve_tiles_dir || true)"
  tiles_env="${TILES_SRC_DIR:-${tiles_dir}}"
  skydata_dir="$(resolve_skydata_dir || true)"

  if [ -z "${tiles_dir}" ]; then
    warn "未找到离线瓦片目录，build-with-tiles 可能失败；可设置 TILES_SRC_DIR=/path/to/tiles"
  else
    log "[tiles] source=${tiles_dir}"
  fi

  if [ "${SKYDATA_MODE}" = "copy" ]; then
    if [ -z "${skydata_dir}" ]; then
      warn "未找到星图数据目录，无法复制；可设置 SKYDATA_SRC_DIR=/path/to/test-skydata"
    else
      copy_skydata_flag="1"
      log "[skydata] source=${skydata_dir}"
      log "[skydata] mode=copy"
    fi
  elif [ "${SKYDATA_MODE}" = "symlink" ]; then
    if [ -z "${skydata_dir}" ]; then
      warn "未找到星图数据目录，无法创建软链接；可设置 SKYDATA_SRC_DIR=/path/to/test-skydata"
    else
      log "[skydata] source=${skydata_dir}"
      log "[skydata] mode=symlink"
    fi
  else
    log "跳过星图数据处理（SKYDATA_MODE=${SKYDATA_MODE}）"
  fi

  TILES_MODE="${TILES_MODE}" \
  TILES_SRC_DIR="${tiles_env}" \
  SKYDATA_SRC_DIR="${skydata_dir}" \
  SWE_COPY_SKYDATA="${copy_skydata_flag}" \
  NODE_VER="${NODE_VER}" \
  NVM_DIR="${NVM_DIR}" \
  make build-with-tiles
  if [ "${SKYDATA_MODE}" = "symlink" ] && [ -n "${skydata_dir}" ]; then
    mkdir -p dist
    rm -rf dist/skydata
    ln -sfn "${skydata_dir}" dist/skydata
  fi
  restore_path_owner "dist"
  check_file dist/index.html

  # tiles 可能是软链接或目录
  if [ -L dist/tiles ]; then
    log "✅ dist/tiles 是软链接 -> $(readlink dist/tiles)"
  elif [ -d dist/tiles ]; then
    log "✅ dist/tiles 是目录"
  else
    warn "dist/tiles 不存在（如果不需要离线瓦片可忽略）"
  fi

  if [ -L dist/skydata ]; then
    log "✅ dist/skydata 是软链接 -> $(readlink dist/skydata)"
  elif [ -d dist/skydata ]; then
    log "✅ dist/skydata 是目录"
  elif [ "${SKYDATA_MODE}" != "none" ]; then
    warn "dist/skydata 不存在，星图数据处理可能失败"
  fi
}

check_http() {
  local url="http://127.0.0.1:${PORT_HTTP}/"
  if command -v curl >/dev/null 2>&1; then
    curl -fsS --max-time 2 "$url" >/dev/null && log "✅ HTTP 可访问：$url" || warn "HTTP 不可访问：$url"
  else
    warn "未安装 curl，跳过 HTTP 检查：$url"
  fi
}

check_https() {
  local url="https://127.0.0.1:${PORT_HTTPS}/"
  if command -v curl >/dev/null 2>&1; then
    curl -kfsS --max-time 2 "$url" >/dev/null && log "✅ HTTPS 可访问：$url" || warn "HTTPS 不可访问：$url"
  else
    warn "未安装 curl，跳过 HTTPS 检查：$url"
  fi
}

check_services() {
  check_http || true
  check_https || true
}

PID_HTTP=""
PID_HTTPS=""

start_services() {
  echo "🚀 启动服务（dist 目录）..."
  if [ ! -d dist ]; then
    warn "dist 不存在，无法启动服务"
    return 1
  fi
  if ! python3 -c "import flask" >/dev/null 2>&1; then
    warn "Python 缺少依赖 flask：请先执行 `pip3 install flask`"
    return 1
  fi

  (cd dist && python3 ../server.py "${PORT_HTTP}") &
  PID_HTTP="$!"
  (cd dist && python3 ../server.py "${PORT_HTTPS}") &
  PID_HTTPS="$!"

  log "服务已启动：HTTP pid=${PID_HTTP}, HTTPS pid=${PID_HTTPS}"

  # 允许服务启动
  sleep 0.5
}

if [ "${BUILD_ONLY}" = "1" ]; then
  step "停止服务（释放端口 ${PORT_HTTP}/${PORT_HTTPS}）" stop_services
  step "（可选）更新前端版本号 .env: VUE_APP_VERSION" maybe_bump_version
  step "（可选）编译并更新 stellarium-web-engine (wasm/js)" maybe_update_engine
  step "构建前端（tiles: ${TILES_MODE}）" build_frontend
  log ""
  log "BUILD_ONLY=1：已生成 dist/，未启动本地 HTTP/HTTPS 预览。"
  exit 0
fi

step "停止服务（释放端口 ${PORT_HTTP}/${PORT_HTTPS}）" stop_services
step "（可选）更新前端版本号 .env: VUE_APP_VERSION" maybe_bump_version
step "（可选）编译并更新 stellarium-web-engine (wasm/js)" maybe_update_engine
step "构建前端（tiles: ${TILES_MODE}）" build_frontend
step "启动服务" start_services
step "检查服务可用性" check_services

cleanup() {
  # 仅在脚本收到退出信号时清理自己启动的服务
  if [ -n "${PID_HTTP}" ] || [ -n "${PID_HTTPS}" ]; then
    log ""
    log "收到退出信号，正在停止服务..."
    kill "${PID_HTTP}" "${PID_HTTPS}" 2>/dev/null || true
  fi
}
trap cleanup INT TERM

if [ "${WAIT_SERVERS}" = "1" ]; then
  log ""
  log "保持前台运行中（WAIT_SERVERS=1）。Ctrl+C 退出。"
  wait "${PID_HTTP}" "${PID_HTTPS}"
else
  log "不等待服务进程（WAIT_SERVERS=0），脚本结束但服务会继续在后台运行。"
fi
