#!/usr/bin/env bash
set -euo pipefail

# 一键跑：主相机+导星相机(QHYCCD/SDK) + 赤道仪(EQMod Mount)
#       → 开启导星循环曝光 → 极轴校准(一次，结束后无论成功/失败都继续)
#       → 写入 10 行 Schedule（每列参数都设置，尽量不同）→ 直接执行并等结束
#
# 默认使用 e2e.config.cjs 的 DEFAULTS.playwright.baseUrl（当前仓库默认已是 http://192.168.1.113:8080）。
# 如需覆盖：
#   E2E_BASE_URL='http://192.168.1.113:8080' bash scripts/run-e2e-pa-guiding-schedule-10rows.sh

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

mkdir -p test-results
LOG="test-results/e2e-pa-guiding-schedule-10rows.$(date +%Y%m%d_%H%M%S).log"

FLOW_JSON='[
  {"id":"device.gotoHome"},

  {"id":"device.connectIfNeeded","params":{"deviceType":"MainCamera","driverText":"QHYCCD","connectionModeText":"SDK"}},
  {"id":"device.connectIfNeeded","params":{"deviceType":"GuiderCamera","driverText":"QHYCCD","connectionModeText":"SDK"}},
  {"id":"device.connectIfNeeded","params":{"deviceType":"Mount","driverText":"EQMod Mount"}},

  {"id":"device.ensureCapturePanel"},
  {"id":"guider.loopExposureOn","params":{"driverType":"GuiderCamera","allowDisconnected":false}},

  {"id":"pa.runOnce","params":{"timeoutMs":600000}},

  {"id":"schedule.openIfClosed"},
  {"id":"schedule.waitRunState","params":{"state":"idle","timeoutMs":60000}},
  {"id":"schedule.trimRows","params":{"keepRows":1}},

  {"id":"schedule.setupRowFull","params":{"row":1,"targetMode":"name","targetName":"E2E-PA-ROW01-M42","ra":"01h 02m 03s","dec":"+01d 02m 03s","shootIsNow":true,"exposurePreset":"10 ms","filterIndex":0,"reps":1,"frameTypeIndex":0,"refocusIndex":0,"expDelaySeconds":0,"timeoutMs":60000}},
  {"id":"schedule.setupRowFull","params":{"row":2,"targetMode":"name","targetName":"E2E-PA-ROW02-NGC7000","ra":"02h 03m 04s","dec":"-02d 03m 04s","shootIsNow":false,"shootHour":0,"shootMinute":1,"exposureValue":20,"exposureUnit":"ms","filterIndex":1,"reps":2,"frameTypeIndex":1,"refocusIndex":1,"expDelaySeconds":1,"timeoutMs":60000}},
  {"id":"schedule.setupRowFull","params":{"row":3,"targetMode":"name","targetName":"E2E-PA-ROW03-M31","ra":"03h 04m 05s","dec":"+03d 04m 05s","shootIsNow":true,"exposurePreset":"1 s","filterIndex":2,"reps":3,"frameTypeIndex":2,"refocusIndex":2,"expDelaySeconds":2,"timeoutMs":60000}},
  {"id":"schedule.setupRowFull","params":{"row":4,"targetMode":"name","targetName":"E2E-PA-ROW04-IC5070","ra":"04h 05m 06s","dec":"-04d 05m 06s","shootIsNow":false,"shootHour":0,"shootMinute":2,"exposureValue":40,"exposureUnit":"ms","filterIndex":3,"reps":4,"frameTypeIndex":3,"refocusIndex":0,"expDelaySeconds":3,"timeoutMs":60000}},
  {"id":"schedule.setupRowFull","params":{"row":5,"targetMode":"name","targetName":"E2E-PA-ROW05-M45","ra":"05h 06m 07s","dec":"+05d 06m 07s","shootIsNow":true,"exposureValue":75,"exposureUnit":"ms","filterIndex":4,"reps":5,"frameTypeIndex":0,"refocusIndex":1,"expDelaySeconds":4,"timeoutMs":60000}},
  {"id":"schedule.setupRowFull","params":{"row":6,"targetMode":"name","targetName":"E2E-PA-ROW06-NGC6888","ra":"06h 07m 08s","dec":"-06d 07m 08s","shootIsNow":false,"shootHour":0,"shootMinute":3,"exposureValue":120,"exposureUnit":"ms","filterIndex":0,"reps":6,"frameTypeIndex":1,"refocusIndex":2,"expDelaySeconds":5,"timeoutMs":60000}},
  {"id":"schedule.setupRowFull","params":{"row":7,"targetMode":"name","targetName":"E2E-PA-ROW07-M13","ra":"07h 08m 09s","dec":"+07d 08m 09s","shootIsNow":true,"exposureValue":200,"exposureUnit":"ms","filterIndex":1,"reps":7,"frameTypeIndex":2,"refocusIndex":0,"expDelaySeconds":6,"timeoutMs":60000}},
  {"id":"schedule.setupRowFull","params":{"row":8,"targetMode":"name","targetName":"E2E-PA-ROW08-M57","ra":"08h 09m 10s","dec":"-08d 09m 10s","shootIsNow":false,"shootHour":0,"shootMinute":4,"exposureValue":350,"exposureUnit":"ms","filterIndex":2,"reps":8,"frameTypeIndex":3,"refocusIndex":1,"expDelaySeconds":7,"timeoutMs":60000}},
  {"id":"schedule.setupRowFull","params":{"row":9,"targetMode":"name","targetName":"E2E-PA-ROW09-NGC7635","ra":"09h 10m 11s","dec":"+09d 10m 11s","shootIsNow":true,"exposureValue":500,"exposureUnit":"ms","filterIndex":3,"reps":9,"frameTypeIndex":0,"refocusIndex":2,"expDelaySeconds":8,"timeoutMs":60000}},
  {"id":"schedule.setupRowFull","params":{"row":10,"targetMode":"name","targetName":"E2E-PA-ROW10-M101","ra":"10h 11m 12s","dec":"-10d 11m 12s","shootIsNow":false,"shootHour":0,"shootMinute":5,"exposureValue":800,"exposureUnit":"ms","filterIndex":4,"reps":10,"frameTypeIndex":1,"refocusIndex":0,"expDelaySeconds":9,"timeoutMs":60000}},

  {"id":"schedule.startIfNotRunning"},
  {"id":"schedule.waitRunState","params":{"state":"idle","timeoutMs":900000}},

  {"id":"guider.loopExposureOff","params":{"driverType":"GuiderCamera","allowDisconnected":true}},
  {"id":"schedule.closeIfOpen"}
]'

E2E_HEADED="${E2E_HEADED:-1}"
E2E_RECORD="${E2E_RECORD:-1}"
E2E_FLOW_TIMING="${E2E_FLOW_TIMING:-1}"
E2E_UI_TIMEOUT_MS="${E2E_UI_TIMEOUT_MS:-5000}"
E2E_STEP_TIMEOUT_MS="${E2E_STEP_TIMEOUT_MS:-60000}"
E2E_TEST_TIMEOUT_MS="${E2E_TEST_TIMEOUT_MS:-1800000}"

export E2E_HEADED E2E_RECORD E2E_FLOW_TIMING E2E_UI_TIMEOUT_MS E2E_STEP_TIMEOUT_MS E2E_TEST_TIMEOUT_MS
export E2E_FLOW_CALLS_JSON="$FLOW_JSON"

echo "[e2e] baseURL=${E2E_BASE_URL:-<DEFAULT>}"
echo "[e2e] log=$LOG"

(npx playwright test tests/e2e/flow-runner.spec.ts --workers=1) |& tee "$LOG"

