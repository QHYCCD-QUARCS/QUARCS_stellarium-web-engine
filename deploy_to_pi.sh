#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="${SCRIPT_DIR}"
WORKSPACE_ROOT="$(cd "${REPO_ROOT}/.." && pwd)"
DIST_DIR="${DIST_DIR:-${REPO_ROOT}/apps/web-frontend/dist}"

REMOTE_PATH="${REMOTE_PATH:-/var/www/html}"
REMOTE_HOST="${REMOTE_HOST:-}"
REMOTE_USER="${REMOTE_USER:-}"
REMOTE_PASSWORD="${REMOTE_PASSWORD:-}"
REMOTE_HOST_SOURCE="explicit"

INCLUDE_SKYDATA=0
MAKE_BACKUP=1
SHOW_HELP=0

usage() {
  cat <<'EOF'
Usage: deploy_to_pi.sh [options]

Deploy the built web frontend from apps/web-frontend/dist to the Raspberry Pi web root.

Options:
  --with-skydata         Sync dist/skydata as well. This is the slow path.
  --skip-skydata         Do not sync dist/skydata (default).
  --no-backup            Skip creating a remote backup before deployment.
  --host <host>          Override remote host.
  --user <user>          Override remote user.
  --password <password>  Override remote password.
  --remote-path <path>   Override remote web root. Default: /var/www/html
  -h, --help             Show this help message.

Environment fallback order:
  1. REMOTE_HOST / REMOTE_USER / REMOTE_PASSWORD
  2. Values loaded from sibling QUARCS_QT-SeverProgram/.env
  3. PI_HOST_ETH -> PI_HOST_WIFI -> PI_HOST_ZEROTIER -> PI_HOST

Notes:
  - The script keeps extra files under remote img/ and keeps remote tiles/.
  - Use --with-skydata only when the large static astronomical assets changed.
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
    --no-backup)
      MAKE_BACKUP=0
      shift
      ;;
    --host)
      REMOTE_HOST="$2"
      shift 2
      ;;
    --user)
      REMOTE_USER="$2"
      shift 2
      ;;
    --password)
      REMOTE_PASSWORD="$2"
      shift 2
      ;;
    --remote-path)
      REMOTE_PATH="$2"
      shift 2
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

load_env_file() {
  local env_file="$1"
  if [[ -f "${env_file}" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "${env_file}"
    set +a
  fi
}

load_env_file "${WORKSPACE_ROOT}/QUARCS_QT-SeverProgram/.env"
load_env_file "${REPO_ROOT}/.env"

REMOTE_USER="${REMOTE_USER:-${PI_USER:-}}"
REMOTE_PASSWORD="${REMOTE_PASSWORD:-${PI_PASSWORD:-}}"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require_cmd rsync
require_cmd ssh
require_cmd sshpass
require_cmd sha256sum

if [[ ! -d "${DIST_DIR}" ]]; then
  echo "Local dist directory not found: ${DIST_DIR}" >&2
  exit 1
fi

for required_path in \
  "${DIST_DIR}/index.html" \
  "${DIST_DIR}/favicon.ico" \
  "${DIST_DIR}/opencv.js" \
  "${DIST_DIR}/css" \
  "${DIST_DIR}/fonts" \
  "${DIST_DIR}/images" \
  "${DIST_DIR}/img" \
  "${DIST_DIR}/js"; do
  if [[ ! -e "${required_path}" ]]; then
    echo "Missing required artifact: ${required_path}" >&2
    exit 1
  fi
done

if [[ "${INCLUDE_SKYDATA}" -eq 1 && ! -d "${DIST_DIR}/skydata" ]]; then
  echo "Missing required artifact for --with-skydata: ${DIST_DIR}/skydata" >&2
  exit 1
fi

if [[ -z "${REMOTE_HOST}" || -z "${REMOTE_USER}" || -z "${REMOTE_PASSWORD}" ]]; then
  :
fi

unique_append() {
  local candidate="$1"
  [[ -n "${candidate}" ]] || return 0
  local existing
  for existing in "${HOST_CANDIDATES[@]:-}"; do
    [[ "${existing}" == "${candidate}" ]] && return 0
  done
  HOST_CANDIDATES+=("${candidate}")
}

export SSHPASS="${REMOTE_PASSWORD}"
SSH_OPTS=(
  -o StrictHostKeyChecking=no
  -o UserKnownHostsFile=/dev/null
  -o ConnectTimeout=5
)
SSH_CMD=(sshpass -e ssh "${SSH_OPTS[@]}")
RSYNC_RSH="sshpass -e ssh ${SSH_OPTS[*]}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_PATH="${REMOTE_PATH}_backup_${TIMESTAMP}"

HOST_CANDIDATES=()
if [[ -n "${REMOTE_HOST}" ]]; then
  unique_append "${REMOTE_HOST}"
else
  REMOTE_HOST_SOURCE="auto"
  unique_append "${PI_HOST_ETH:-}"
  unique_append "${PI_HOST_WIFI:-}"
  unique_append "${PI_HOST_ZEROTIER:-}"
  unique_append "${PI_HOST:-}"
fi

if [[ -z "${REMOTE_USER}" || -z "${REMOTE_PASSWORD}" || "${#HOST_CANDIDATES[@]}" -eq 0 ]]; then
  echo "Remote connection info is incomplete." >&2
  echo "Need user/password and at least one host from options or env." >&2
  exit 1
fi

choose_reachable_host() {
  local host
  for host in "${HOST_CANDIDATES[@]}"; do
    if sshpass -e ssh "${SSH_OPTS[@]}" "${REMOTE_USER}@${host}" "exit 0" >/dev/null 2>&1; then
      echo "${host}"
      return 0
    fi
  done
  return 1
}

if ! REMOTE_HOST="$(choose_reachable_host)"; then
  echo "Could not reach any configured Raspberry Pi host over SSH." >&2
  echo "Tried:" >&2
  printf '  - %s\n' "${HOST_CANDIDATES[@]}" >&2
  exit 1
fi

REMOTE="${REMOTE_USER}@${REMOTE_HOST}"

ACCESS_URLS=()
append_access_url() {
  local host="$1"
  [[ -n "${host}" ]] || return 0
  local url="http://${host}/"
  local existing
  for existing in "${ACCESS_URLS[@]:-}"; do
    [[ "${existing}" == "${url}" ]] && return 0
  done
  ACCESS_URLS+=("${url}")
}

append_access_url "${PI_HOST_ETH:-}"
append_access_url "${PI_HOST_WIFI:-}"
append_access_url "${PI_HOST_ZEROTIER:-}"
append_access_url "${PI_HOST:-}"

rsync_dir_delete() {
  local src="$1"
  local dest="$2"
  rsync -a --delete --info=progress2,stats1 -e "${RSYNC_RSH}" "${src}" "${REMOTE}:${dest}"
}

rsync_dir_keep_extra() {
  local src="$1"
  local dest="$2"
  rsync -a --info=progress2,stats1 -e "${RSYNC_RSH}" "${src}" "${REMOTE}:${dest}"
}

rsync_files() {
  rsync -a --info=stats1 -e "${RSYNC_RSH}" "$@" "${REMOTE}:${REMOTE_PATH}/"
}

echo "Remote target: ${REMOTE}:${REMOTE_PATH}"
if [[ "${REMOTE_HOST_SOURCE}" == "auto" ]]; then
  echo "Selected reachable host automatically from configured addresses"
fi
echo "Local dist: ${DIST_DIR}"
if [[ "${INCLUDE_SKYDATA}" -eq 1 ]]; then
  echo "Mode: full deploy (includes skydata)"
else
  echo "Mode: fast deploy (skips skydata)"
fi

if [[ "${MAKE_BACKUP}" -eq 1 ]]; then
  echo "Creating backup: ${BACKUP_PATH}"
  "${SSH_CMD[@]}" "${REMOTE}" \
    "set -e; test -d '${REMOTE_PATH}'; cp -a '${REMOTE_PATH}' '${BACKUP_PATH}'; du -sh '${BACKUP_PATH}'"
else
  echo "Skipping remote backup"
fi

echo "Syncing root files"
rsync_files \
  "${DIST_DIR}/index.html" \
  "${DIST_DIR}/favicon.ico" \
  "${DIST_DIR}/opencv.js"

echo "Syncing css/"
rsync_dir_delete "${DIST_DIR}/css/" "${REMOTE_PATH}/css/"

echo "Syncing fonts/"
rsync_dir_delete "${DIST_DIR}/fonts/" "${REMOTE_PATH}/fonts/"

echo "Syncing images/"
rsync_dir_delete "${DIST_DIR}/images/" "${REMOTE_PATH}/images/"

echo "Syncing js/"
rsync_dir_delete "${DIST_DIR}/js/" "${REMOTE_PATH}/js/"

if [[ "${INCLUDE_SKYDATA}" -eq 1 ]]; then
  echo "Syncing skydata/ (slow)"
  rsync_dir_delete "${DIST_DIR}/skydata/" "${REMOTE_PATH}/skydata/"
else
  echo "Skipping skydata/"
fi

echo "Syncing img/ without deleting remote extras"
rsync_dir_keep_extra "${DIST_DIR}/img/" "${REMOTE_PATH}/img/"

LOCAL_JS_BASENAME="$(basename "$(find "${DIST_DIR}/js" -maxdepth 1 -type f -name 'app.*.js' | sort | head -n 1)")"
LOCAL_CSS_BASENAME="$(basename "$(find "${DIST_DIR}/css" -maxdepth 1 -type f -name 'app.*.css' | sort | head -n 1)")"

if [[ -z "${LOCAL_JS_BASENAME}" || -z "${LOCAL_CSS_BASENAME}" ]]; then
  echo "Could not determine built app js/css filenames for verification." >&2
  exit 1
fi

LOCAL_INDEX_SHA="$(sha256sum "${DIST_DIR}/index.html" | awk '{print $1}')"
LOCAL_JS_SHA="$(sha256sum "${DIST_DIR}/js/${LOCAL_JS_BASENAME}" | awk '{print $1}')"
LOCAL_CSS_SHA="$(sha256sum "${DIST_DIR}/css/${LOCAL_CSS_BASENAME}" | awk '{print $1}')"

echo "Verifying remote hashes"
REMOTE_HASHES="$("${SSH_CMD[@]}" "${REMOTE}" \
  "sha256sum '${REMOTE_PATH}/index.html' '${REMOTE_PATH}/js/${LOCAL_JS_BASENAME}' '${REMOTE_PATH}/css/${LOCAL_CSS_BASENAME}'")"

echo "${REMOTE_HASHES}"

if ! grep -q "^${LOCAL_INDEX_SHA}[[:space:]]" <<<"${REMOTE_HASHES}"; then
  echo "Remote index.html hash mismatch" >&2
  exit 1
fi
if ! grep -q "^${LOCAL_JS_SHA}[[:space:]]" <<<"${REMOTE_HASHES}"; then
  echo "Remote js hash mismatch" >&2
  exit 1
fi
if ! grep -q "^${LOCAL_CSS_SHA}[[:space:]]" <<<"${REMOTE_HASHES}"; then
  echo "Remote css hash mismatch" >&2
  exit 1
fi

echo "Deployment completed successfully."
if [[ "${MAKE_BACKUP}" -eq 1 ]]; then
  echo "Backup: ${BACKUP_PATH}"
fi
if [[ "${#ACCESS_URLS[@]}" -gt 0 ]]; then
  echo "Access URLs:"
  printf '  - %s\n' "${ACCESS_URLS[@]}"
fi
