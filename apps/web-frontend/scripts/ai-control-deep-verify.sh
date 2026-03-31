#!/bin/bash
# AI-Control 深度验证脚本
# 通过 HTTP POST 向已运行的会话 (npm run e2e:ai-control:session) 发送 12 条带参数的命令
# 用法: 先启动会话，再在另一终端运行: ./scripts/ai-control-deep-verify.sh
# 或: E2E_AI_CONTROL_SESSION_PORT=39281 ./scripts/ai-control-deep-verify.sh
# 可选: PAUSE=1 在每条命令后暂停等待 Enter

set -e
PORT="${E2E_AI_CONTROL_SESSION_PORT:-39281}"
STATUS_URL="http://127.0.0.1:${PORT}/status"
BASE="http://127.0.0.1:${PORT}/run"
PAUSE="${PAUSE:-0}"
STATUS_JSON=""
MOUNT_DRIVER_TEXT="${E2E_DEEP_VERIFY_MOUNT_DRIVER_TEXT:-EQMod}"
MOUNT_CONNECTION_MODE="${E2E_DEEP_VERIFY_MOUNT_CONNECTION_MODE:-INDI}"

run_cmd() {
  local name="$1"
  local body="$2"
  echo "=== $name ==="
  curl -s -X POST "$BASE" -H "Content-Type: application/json" -d "$body"
  echo ""
  if [ "$PAUSE" = "1" ] || [ "$PAUSE" = "true" ]; then
    read -p "按 Enter 继续下一项..."
  fi
}

session_status_json() {
  curl -fsS "$STATUS_URL"
}

has_connected_cfw() {
  local status_json="$1"
  STATUS_JSON="$status_json" node -e '
    const raw = process.env.STATUS_JSON || ""
    let payload
    try {
      payload = JSON.parse(raw)
    } catch {
      process.exit(1)
    }
    const status = payload && typeof payload === "object" && payload.status && typeof payload.status === "object"
      ? payload.status
      : payload
    const devices = Array.isArray(status?.devices) ? status.devices : []
    const hasConnected = devices.some((device) => {
      if (!device || typeof device !== "object") return false
      return device.deviceType === "CFW" && device.connectionState === "connected"
    })
    process.exit(hasConnected ? 0 : 1)
  '
}

echo "AI-Control 深度验证 (端口 $PORT)"
echo "确保会话已启动: npm run e2e:ai-control:session"
echo ""

STATUS_JSON="$(session_status_json)"

run_cmd "1. general-settings" '{"commandName":"general-settings","flowParams":{"generalSettingsInteract":{"displayTab":true,"selectLanguage":true,"close":true}}}'
run_cmd "2. power-management" '{"commandName":"power-management","flowParams":{"powerManagementInteract":{"output1":true,"restart":"cancel"}}}'
run_cmd "3. telescopes-focal-length" '{"commandName":"telescopes-focal-length","flowParams":{"focalLengthMm":"600"}}'
run_cmd "4. polar-axis-calibration" '{"commandName":"polar-axis-calibration","flowParams":{"polarAxisInteract":{"toggleTrajectory":true,"closeTrajectory":true,"quitPolarAxisMode":true}}}'
run_cmd "5. image-file-manager" '{"commandName":"image-file-manager","flowParams":{"imageManagerInteract":{"imageFileSwitch":true,"refresh":true,"panelClose":true}}}'
run_cmd "6. mount-connect-control" "{\"commandName\":\"mount-connect-control\",\"flowParams\":{\"driverText\":\"${MOUNT_DRIVER_TEXT}\",\"connectionModeText\":\"${MOUNT_CONNECTION_MODE}\",\"mountControlInteract\":{\"gotoThenSolve\":true}}}"
run_cmd "7. mount-park" "{\"commandName\":\"mount-park\",\"flowParams\":{\"driverText\":\"${MOUNT_DRIVER_TEXT}\",\"connectionModeText\":\"${MOUNT_CONNECTION_MODE}\"}}"
run_cmd "8. mount-panel" '{"commandName":"mount-panel","flowParams":{"mcpInteract":{"slewSpeed":10,"park":false,"track":true,"sync":true,"moveAllDirections":true,"moveDurationMs":5000,"stop":true}}}'
# 导星/主相机链路步骤多、真实设备耗时常超过默认会话 60s，显式放宽 runTimeoutMs
run_cmd "9. guider-connect-capture" '{"commandName":"guider-connect-capture","runTimeoutMs":120000,"flowParams":{"guiderGain":10,"guiderOffset":0,"guiderExposure":"1s","guiderInteract":{"loopExposure":true,"guiding":true}}}'
run_cmd "10. maincamera-connect-capture" '{"commandName":"maincamera-connect-capture","runTimeoutMs":180000,"flowParams":{"captureGain":10,"captureOffset":0,"captureExposure":"1s","captureAutoSave":true,"doSave":true}}'
run_cmd "11. focuser-connect-control" '{"commandName":"focuser-connect-control","flowParams":{"focuserInteract":{"speed":3,"roiLength":300,"move":{"direction":"right","durationMs":500}}}}'
if has_connected_cfw "$STATUS_JSON"; then
  run_cmd "12. cfw-capture-config" '{"commandName":"cfw-capture-config","flowParams":{"cfwInteract":{"capturePanelPlusCount":1,"capturePanelMinusCount":1,"menuNextCount":1,"menuPrevCount":1}}}'
else
  echo "=== 12. cfw-capture-config ==="
  echo "SKIP 12. cfw-capture-config (CFW not connected/present)"
  echo ""
fi

echo ""
echo "深度验证完成"
