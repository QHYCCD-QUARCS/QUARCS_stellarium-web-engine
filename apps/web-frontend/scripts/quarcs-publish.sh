#!/usr/bin/env bash
# QUARCS 发布：按需编译前端 / 交叉编译 Qt，并调用 upload.py 上传。
# 用法见脚本末尾 --help，或与 AI-Control/README.md「发布流程」一节对照。
set -euo pipefail

QUARCS_ROOT="${QUARCS_ROOT:-/home/quarcs/workspace/QUARCS}"
WEB_FRONTEND="${WEB_FRONTEND:-${QUARCS_ROOT}/QUARCS_stellarium-web-engine/apps/web-frontend}"
QT_REPO="${QT_REPO:-${QUARCS_ROOT}/QUARCS_QT-SeverProgram}"
QT_BUILD_DIR="${QT_BUILD_DIR:-${QT_REPO}/src/BUILD}"
UPLOAD_PY="${UPLOAD_PY:-${QUARCS_ROOT}/upload.py}"
TOOLCHAIN_REL="${TOOLCHAIN_REL:-../../toolchain-rpi-arm64.cmake}"

DO_VUE=0
DO_QT=0
IP_SUFFIX=""
ENGINE_UPDATE="${ENGINE_UPDATE:-0}"
WORKERS="${WORKERS:-5}"
RELAX_UPLOAD=0
SKIP_VUE_BUILD=0
SKIP_QT_BUILD=0
DRY_RUN=0
LOG_FILE=""
CMAKE_EXTRA=()

usage() {
  cat <<'EOF'

用法:
  quarcs-publish.sh <IP第四段> [--vue] [--qt] [选项]

必选:
  <IP第四段>     与 upload.py 相同，例如 113 -> http://192.168.1.113:8000/

至少指定其一:
  --vue          先编译前端 (ENGINE_UPDATE/BUILD_ONLY/kill_run.sh)，再上传到 --vue 目标
  --qt           先在 src/BUILD 交叉编译 Qt，再上传到 --qt 目标
  可同时指定二者（先前端后 Qt）。

常用选项:
  --engine-update      前端构建前执行引擎 wasm 更新（等价 ENGINE_UPDATE=1，默认 0）
  --workers N          上传并发数（默认 5）
  --relax-upload-filter  对应 upload.py --relax-upload-filter
  --skip-vue-build       仅上传前端，跳过 kill_run.sh
  --skip-qt-build        仅上传 Qt 源码树，跳过 cmake 编译
  --cmake-sysroot PATH   传给 cmake: -DCMAKE_SYSROOT=PATH
  --log-file PATH        日志文件（默认 /tmp/quarcs-publish-YYYYMMDD-HHMMSS.log）
  --dry-run              只打印将执行的命令，不真正编译/上传

环境变量（可选覆盖路径）:
  QUARCS_ROOT WEB_FRONTEND QT_REPO QT_BUILD_DIR UPLOAD_PY TOOLCHAIN_REL ENGINE_UPDATE WORKERS

示例:
  quarcs-publish.sh 113 --vue
  quarcs-publish.sh 113 --qt
  quarcs-publish.sh 113 --vue --qt --workers 8
EOF
}

log() {
  printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

die() {
  log "ERROR: $*"
  exit 2
}

run() {
  log ">>> 执行: $*"
  if [[ "$DRY_RUN" -eq 1 ]]; then
    log ">>> [DRY-RUN] 已跳过实际执行"
    return 0
  fi
  "$@"
}

require_file() {
  [[ -f "$1" ]] || die "缺少文件: $1"
}

require_dir() {
  [[ -d "$1" ]] || die "缺少目录: $1"
}

detect_sysroot_gcc_major() {
  local sysroot="$1"
  local gcc_dir="${sysroot}/usr/lib/gcc/aarch64-linux-gnu"
  local version=""
  [[ -d "$gcc_dir" ]] || return 1
  version="$(find "$gcc_dir" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' 2>/dev/null | sort -V | tail -n 1)"
  [[ -n "$version" ]] || return 1
  printf '%s\n' "${version%%.*}"
}

detect_cross_compiler_version() {
  local compiler="$1"
  local version=""
  command -v "$compiler" >/dev/null 2>&1 || return 1
  version="$("$compiler" -dumpversion 2>/dev/null | head -n 1)"
  [[ -n "$version" ]] || return 1
  printf '%s\n' "$version"
}

pick_cross_cxx_compiler() {
  local required_major="$1"
  if command -v "aarch64-linux-gnu-g++-${required_major}" >/dev/null 2>&1; then
    printf '%s\n' "aarch64-linux-gnu-g++-${required_major}"
    return 0
  fi
  if command -v aarch64-linux-gnu-g++ >/dev/null 2>&1; then
    printf '%s\n' "aarch64-linux-gnu-g++"
    return 0
  fi
  return 1
}

preflight_qt_toolchain() {
  local sysroot="/home/quarcs/rpi-sysroot"
  local required_major=""
  local compiler_name=""
  local compiler_version=""
  local compiler_major=""

  for arg in "${CMAKE_EXTRA[@]}"; do
    if [[ "$arg" == -DCMAKE_SYSROOT=* ]]; then
      sysroot="${arg#-DCMAKE_SYSROOT=}"
    fi
  done

  require_dir "$sysroot"
  required_major="$(detect_sysroot_gcc_major "$sysroot")" || die \
    "无法从 sysroot 检测 GCC 版本: ${sysroot}/usr/lib/gcc/aarch64-linux-gnu"

  compiler_name="$(pick_cross_cxx_compiler "$required_major")" || die \
    "未找到交叉编译器 aarch64-linux-gnu-g++。请先安装 gcc-aarch64-linux-gnu / g++-aarch64-linux-gnu"
  compiler_version="$(detect_cross_compiler_version "$compiler_name")" || die \
    "无法读取交叉编译器版本: ${compiler_name}"
  compiler_major="${compiler_version%%.*}"

  log "检测到 sysroot GCC 主版本: ${required_major}"
  log "检测到将使用的交叉编译器: ${compiler_name} (${compiler_version})"

  if [[ "$compiler_major" != "$required_major" ]]; then
    local installed_compilers=""
    installed_compilers="$(compgen -c | grep -E '^aarch64-linux-gnu-g\+\+(-[0-9]+)?$' | sort -u | tr '\n' ' ' || true)"
    [[ -n "$installed_compilers" ]] && log "本机可见交叉 C++ 编译器: ${installed_compilers}"
    die "Qt 交叉编译器版本与 sysroot 不匹配。请安装匹配版本后重试，例如:
  sudo apt install gcc-${required_major}-aarch64-linux-gnu g++-${required_major}-aarch64-linux-gnu"
  fi
}

# ---------- 参数解析 ----------
while [[ $# -gt 0 ]]; do
  case "$1" in
    --vue|--VUE)
      DO_VUE=1
      shift
      ;;
    --qt|--QT)
      DO_QT=1
      shift
      ;;
    --engine-update)
      ENGINE_UPDATE=1
      shift
      ;;
    --no-engine-update)
      ENGINE_UPDATE=0
      shift
      ;;
    --workers)
      WORKERS="${2:-}"
      [[ -n "$WORKERS" ]] || die "--workers 需要参数"
      shift 2
      ;;
    --relax-upload-filter)
      RELAX_UPLOAD=1
      shift
      ;;
    --skip-vue-build)
      SKIP_VUE_BUILD=1
      shift
      ;;
    --skip-qt-build)
      SKIP_QT_BUILD=1
      shift
      ;;
    --cmake-sysroot)
      [[ -n "${2:-}" ]] || die "--cmake-sysroot 需要参数"
      CMAKE_EXTRA+=("-DCMAKE_SYSROOT=${2}")
      shift 2
      ;;
    --log-file)
      [[ -n "${2:-}" ]] || die "--log-file 需要参数"
      LOG_FILE="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    -*)
      die "未知选项: $1 （使用 --help）"
      ;;
    *)
      if [[ -z "$IP_SUFFIX" ]]; then
        IP_SUFFIX="$1"
        shift
      else
        die "多余参数: $1"
      fi
      ;;
  esac
done

[[ -n "$IP_SUFFIX" ]] || die "请提供目标 IP 第四段，例如: $0 113 --vue"

if [[ "$DO_VUE" -eq 0 && "$DO_QT" -eq 0 ]]; then
  die "请至少指定 --vue 和/或 --qt"
fi

if [[ -z "$LOG_FILE" ]]; then
  LOG_FILE="/tmp/quarcs-publish-$(date +%Y%m%d-%H%M%S).log"
fi

# 此后 stdout/stderr 均写入终端与日志
exec > >(tee -a "$LOG_FILE") 2>&1

log "======== QUARCS 发布开始 ========"
log "日志文件: $LOG_FILE"
log "目标: 192.168.1.${IP_SUFFIX}:8000"
log "选项: DO_VUE=$DO_VUE DO_QT=$DO_QT ENGINE_UPDATE=$ENGINE_UPDATE WORKERS=$WORKERS"
log "DRY_RUN=$DRY_RUN SKIP_VUE_BUILD=$SKIP_VUE_BUILD SKIP_QT_BUILD=$SKIP_QT_BUILD RELAX_UPLOAD=$RELAX_UPLOAD"
log "路径: WEB_FRONTEND=$WEB_FRONTEND"
log "路径: QT_REPO=$QT_REPO QT_BUILD_DIR=$QT_BUILD_DIR"
log "路径: UPLOAD_PY=$UPLOAD_PY"

START_TOTAL=$(date +%s)

build_vue() {
  log "---------- 前端：编译 ----------"
  require_dir "$WEB_FRONTEND"
  require_file "${WEB_FRONTEND}/kill_run.sh"
  if [[ "$SKIP_VUE_BUILD" -eq 1 ]]; then
    log "已跳过前端编译 (--skip-vue-build)"
  else
    (
      cd "$WEB_FRONTEND"
      export ENGINE_UPDATE
      export BUILD_ONLY=1
      log "环境: ENGINE_UPDATE=$ENGINE_UPDATE BUILD_ONLY=1（目录: $(pwd -P)）"
      run bash kill_run.sh
    )
  fi
  if [[ -d "${WEB_FRONTEND}/dist" ]]; then
    log "前端 dist 已就绪: ${WEB_FRONTEND}/dist"
  elif [[ "$DRY_RUN" -eq 1 ]]; then
    log "WARN: [DRY-RUN] 未找到 ${WEB_FRONTEND}/dist，真实执行时若未先编译则会失败"
  else
    die "缺少前端产物目录: ${WEB_FRONTEND}/dist（请先成功执行 kill_run.sh 或使用 --skip-vue-build 并确保已有 dist）"
  fi
}

upload_vue() {
  log "---------- 前端：上传 ----------"
  require_file "$UPLOAD_PY"
  local -a up=(python3 "$UPLOAD_PY" "$IP_SUFFIX" "${WEB_FRONTEND}/dist/" --vue --workers "$WORKERS")
  if [[ "$RELAX_UPLOAD" -eq 1 ]]; then
    up+=(--relax-upload-filter)
  fi
  run "${up[@]}"
}

build_qt() {
  log "---------- Qt：交叉编译 ----------"
  require_dir "$QT_REPO"
  require_file "${QT_REPO}/toolchain-rpi-arm64.cmake"
  if [[ "$SKIP_QT_BUILD" -eq 1 ]]; then
    log "已跳过 Qt 编译 (--skip-qt-build)"
    return 0
  fi
  require_dir "$QT_BUILD_DIR"
  preflight_qt_toolchain
  (
    cd "$QT_BUILD_DIR"
    local cmake_src_dir
    local cmake_toolchain_file
    cmake_src_dir="${QT_REPO}/src"
    cmake_toolchain_file="${QT_REPO}/toolchain-rpi-arm64.cmake"
    log "CMake 源码目录 (-S): ${cmake_src_dir}"
    log "CMake 构建目录 (-B .): $(pwd -P)"
    log "工具链文件: ${cmake_toolchain_file}"
    run cmake -S "${cmake_src_dir}" -B . -DCMAKE_TOOLCHAIN_FILE="${cmake_toolchain_file}" "${CMAKE_EXTRA[@]}"
    run cmake --build . -j"$(nproc)"
  )
}

upload_qt() {
  log "---------- Qt：上传 ----------"
  require_file "$UPLOAD_PY"
  require_dir "${QT_REPO}/src"
  local -a up=(python3 "$UPLOAD_PY" "$IP_SUFFIX" "${QT_REPO}/src/" --qt --workers "$WORKERS")
  if [[ "$RELAX_UPLOAD" -eq 1 ]]; then
    up+=(--relax-upload-filter)
  fi
  run "${up[@]}"
}

if [[ "$DO_VUE" -eq 1 ]]; then
  build_vue
  upload_vue
fi

if [[ "$DO_QT" -eq 1 ]]; then
  build_qt
  upload_qt
fi

END_TOTAL=$(date +%s)
log "======== 完成，总耗时: $((END_TOTAL - START_TOTAL)) 秒 ========"
log "完整日志: $LOG_FILE"
exit 0
