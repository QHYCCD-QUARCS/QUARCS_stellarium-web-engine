/**
 * E2E / MCP 统一配置（单一修改入口）
 *
 * 目标：
 * - 所有“可更改的默认配置/开关/环境变量名/含义”集中在这里
 * - 其他代码（playwright.config.ts / scripts/mcp-e2e-server.mjs / tests/e2e/*）只负责“使用配置”
 *
 * 约定：
 * - Boolean 环境变量支持：1/true/yes/on => true；0/false/no/off => false；未设置则使用 default
 * - 数值环境变量：无法解析则回退 default
 */

/** @type {{ items: Array<{key: string, env: string, default: any, scope: 'playwright'|'mcp'|'flow', descZh: string}> }} */
const CONFIG_DOCS = {
  items: [
    {
      key: 'baseUrl',
      env: 'E2E_BASE_URL',
      default: 'http://192.168.1.113:8080',
      scope: 'playwright',
      descZh: '被测前端的 baseURL（Playwright use.baseURL）。MCP/CLI 都可通过此变量覆盖目标站点。',
    },
    {
      key: 'recordArtifacts',
      env: 'E2E_RECORD',
      default: true,
      scope: 'playwright',
      descZh:
        '是否录制/保留回放产物：video/trace/screenshot。false 时默认仅失败保留；true 时每次都录制并保留。',
    },
    {
      key: 'headed',
      env: 'E2E_HEADED',
      default: true,
      scope: 'mcp',
      descZh:
        'MCP 触发的 playwright test 默认是否使用 --headed（可视化模式）。传 0/false/off 可全局关闭。',
    },
    {
      key: 'mcpRecordDefault',
      env: 'E2E_RECORD',
      default: true,
      scope: 'mcp',
      descZh:
        'MCP 触发的测试默认是否开启录制（即默认注入 E2E_RECORD=1）。可用 E2E_RECORD=0/false/off 关闭。',
    },
    {
      key: 'mcpQhyCaptureTimeoutSec',
      env: 'E2E_QHY_CAPTURE_TIMEOUT_SEC',
      default: 420,
      scope: 'mcp',
      descZh: 'MCP 工具 e2e_qhyccd_sdk_capture 的默认超时（秒）。',
    },
    {
      key: 'mcpFlowTimeoutSec',
      env: 'E2E_FLOW_TIMEOUT_SEC',
      default: 600,
      scope: 'mcp',
      descZh: 'MCP 工具 e2e_run_flow 的默认超时（秒）。',
    },
    {
      key: 'mcpScreenshotTimeoutSec',
      env: 'E2E_SCREENSHOT_TIMEOUT_SEC',
      default: 60,
      scope: 'mcp',
      descZh: 'MCP 工具 web_screenshot 的默认超时（秒）。',
    },
    {
      key: 'mcpScreenshotReturnImage',
      env: 'E2E_SCREENSHOT_RETURN_IMAGE',
      default: true,
      scope: 'mcp',
      descZh: 'web_screenshot 默认是否返回 base64 图片内容（true 返回，false 仅返回文件路径）。',
    },
    {
      key: 'reducedMotion',
      env: 'E2E_REDUCED_MOTION',
      default: false,
      scope: 'playwright',
      descZh: '是否开启 reduced motion（减少动画，提升稳定性/观感）。',
    },
    {
      key: 'slowMoMs',
      env: 'E2E_SLOWMO_MS',
      default: 0,
      scope: 'playwright',
      descZh: 'Playwright slowMo 毫秒数（仅用于调试，减慢每个操作）。',
    },
    // Flow / 业务相关参数（主要用于 QHYCCD 流程）
    {
      key: 'deviceType',
      env: 'E2E_DEVICE_TYPE',
      default: 'MainCamera',
      scope: 'flow',
      descZh: '设备类型（用于 e2e-device-<DeviceType>-conn 探针与通用 device.* flow）。',
    },
    {
      key: 'qhyDriverText',
      env: 'E2E_DRIVER_TEXT',
      default: 'QHYCCD',
      scope: 'flow',
      descZh: '驱动下拉框要选择的文本（QHYCCD 流程）。',
    },
    {
      key: 'qhyConnectionModeText',
      env: 'E2E_CONNECTION_MODE_TEXT',
      default: 'SDK',
      scope: 'flow',
      descZh: '连接方式下拉框要选择的文本（QHYCCD 流程）。',
    },
    {
      key: 'qhyDoSave',
      env: 'E2E_DO_SAVE',
      default: true,
      scope: 'flow',
      descZh: '拍摄完成后是否自动点击保存（QHYCCD 流程）。',
    },
    {
      key: 'qhyWaitCaptureTimeoutMs',
      env: 'E2E_WAIT_CAPTURE_TIMEOUT_MS',
      default: 180_000,
      scope: 'flow',
      descZh: '等待一次拍摄完成（cp-status 回到 idle）的超时毫秒数（QHYCCD 流程）。',
    },
    {
      key: 'downloadDir',
      env: 'E2E_DOWNLOAD_DIR',
      default: '',
      scope: 'flow',
      descZh:
        '下载/保存目录（由 MCP 工具在运行时注入，通常不需要手动设置；设置后可覆盖默认下载目录）。',
    },
    {
      key: 'goalMaxSteps',
      env: 'E2E_MAX_STEPS',
      default: 30,
      scope: 'flow',
      descZh: 'Goal-driven AI E2E 的最大步数（避免无限循环）。',
    },

    // Runner / 超时相关（通用于 flow-runner / qhyccd-flow-runner / qhyccd-sdk-capture）
    {
      key: 'uiTimeoutMs',
      env: 'E2E_UI_TIMEOUT_MS',
      default: 2_000,
      scope: 'flow',
      descZh: 'UI 交互默认超时（page.setDefaultTimeout）。',
    },
    {
      key: 'stepTimeoutMs',
      env: 'E2E_STEP_TIMEOUT_MS',
      default: 5_000,
      scope: 'flow',
      descZh: '导航/后端相关步骤默认超时（page.setDefaultNavigationTimeout / step 兜底超时）。',
    },
    {
      key: 'testTimeoutMs',
      env: 'E2E_TEST_TIMEOUT_MS',
      default: 10 * 60_000,
      scope: 'flow',
      descZh: '单个 Playwright 测试用例的总超时（test.setTimeout）。',
    },
    {
      key: 'mountConnectWaitMs',
      env: 'E2E_MOUNT_CONNECT_WAIT_MS',
      default: 30_000,
      scope: 'flow',
      descZh: 'Mount 连接或设备分配面板绑定等待超时（毫秒）；用例 5、9 使用。',
    },

    // App 启动路径拼接相关（support/appStartPath.ts）
    {
      key: 'appPath',
      env: 'E2E_APP_PATH',
      default: '/',
      scope: 'flow',
      descZh: 'E2E 启动路径（相对 baseURL），例如 "/" 或 "/app"。',
    },
    {
      key: 'ws',
      env: 'E2E_WS',
      default: '',
      scope: 'flow',
      descZh: '直接指定 ws/wss 地址（优先级最高），例如 ws://192.168.1.113:8600。',
    },
    {
      key: 'backendHost',
      env: 'E2E_BACKEND_HOST',
      default: '',
      scope: 'flow',
      descZh: '后端 host（用于拼接 query backendHost/backendPort/backendSecure）。',
    },
    {
      key: 'backendPort',
      env: 'E2E_BACKEND_PORT',
      default: '',
      scope: 'flow',
      descZh: '后端 port（用于拼接 query backendPort）。',
    },
    {
      key: 'backendSecure',
      env: 'E2E_BACKEND_SECURE',
      default: false,
      scope: 'flow',
      descZh: '后端是否使用安全连接（用于拼接 query backendSecure=1）。',
    },
    {
      key: 'appQuery',
      env: 'E2E_APP_QUERY',
      default: '',
      scope: 'flow',
      descZh: '额外 query 字符串（原样追加，可包含 ws/backendHost/backendPort 等）。',
    },

    // Flow 输入（主要是运行时指令；这里集中说明，便于统一查找）
    {
      key: 'flowJson',
      env: 'E2E_FLOW_JSON',
      default: '',
      scope: 'flow',
      descZh: '旧格式：stepId 数组 JSON（例如 ["qhy.gotoHome","qhy.captureOnce"]）。',
    },
    {
      key: 'flowCallsJson',
      env: 'E2E_FLOW_CALLS_JSON',
      default: '',
      scope: 'flow',
      descZh: '新格式：{id, params}[] JSON（推荐）。',
    },
    {
      key: 'flowParamsJson',
      env: 'E2E_FLOW_PARAMS_JSON',
      default: '',
      scope: 'flow',
      descZh: 'Flow 全局 params 的 JSON（传给每个 step 的参数）。',
    },
    {
      key: 'flowCsv',
      env: 'E2E_FLOW',
      default: '',
      scope: 'flow',
      descZh: '逗号分隔 stepId 列表（兼容用法）。',
    },
    {
      key: 'flowTiming',
      env: 'E2E_FLOW_TIMING',
      default: true,
      scope: 'flow',
      descZh: '是否输出 flow 每一步的耗时统计（用于定位流程变慢的原因）。',
    },
  ],
}

function parseBool(raw, defaultValue = false) {
  if (raw == null) return defaultValue
  const v = String(raw).trim().toLowerCase()
  if (!v) return false
  if (['1', 'true', 'yes', 'y', 'on'].includes(v)) return true
  if (['0', 'false', 'no', 'n', 'off'].includes(v)) return false
  // 兼容历史行为：任意非空值默认视为 true
  return true
}

function parseNumber(raw, defaultValue) {
  if (raw == null) return defaultValue
  const n = Number(raw)
  return Number.isFinite(n) ? n : defaultValue
}

function parseString(raw, defaultValue) {
  if (raw == null) return defaultValue
  const s = String(raw)
  return s.length ? s : defaultValue
}

/**
 * 从 env 读取 boolean 开关（支持默认值）
 * @param {NodeJS.ProcessEnv} env
 * @param {string} name
 * @param {boolean} defaultValue
 */
function envFlag(env, name, defaultValue = false) {
  return parseBool(env?.[name], defaultValue)
}

/**
 * 从 env 读取 number（支持默认值）
 * @param {NodeJS.ProcessEnv} env
 * @param {string} name
 * @param {number} defaultValue
 */
function envNumber(env, name, defaultValue) {
  return parseNumber(env?.[name], defaultValue)
}

/**
 * 从 env 读取 string（支持默认值）
 * @param {NodeJS.ProcessEnv} env
 * @param {string} name
 * @param {string} defaultValue
 */
function envString(env, name, defaultValue) {
  return parseString(env?.[name], defaultValue)
}

/**
 * 统一默认值（修改这里即可影响默认行为）
 */
function docDefault(key, fallback) {
  const it = CONFIG_DOCS.items.find((x) => x.key === key)
  return it?.default ?? fallback
}

const DEFAULTS = Object.freeze({
  playwright: {
    baseUrl: docDefault('baseUrl', 'http://127.0.0.1:8080'),
    recordArtifacts: docDefault('recordArtifacts', false),
    reducedMotion: docDefault('reducedMotion', false),
    slowMoMs: docDefault('slowMoMs', 0),
  },
  mcp: {
    headed: docDefault('headed', true),
    recordArtifacts: docDefault('mcpRecordDefault', true),
    qhyCaptureTimeoutSec: docDefault('mcpQhyCaptureTimeoutSec', 420),
    flowTimeoutSec: docDefault('mcpFlowTimeoutSec', 600),
    screenshotTimeoutSec: docDefault('mcpScreenshotTimeoutSec', 60),
    screenshotReturnImage: docDefault('mcpScreenshotReturnImage', true),
  },
  flow: {
    deviceType: docDefault('deviceType', 'MainCamera'),
    qhyDriverText: docDefault('qhyDriverText', 'QHYCCD'),
    qhyConnectionModeText: docDefault('qhyConnectionModeText', 'SDK'),
    qhyDoSave: docDefault('qhyDoSave', true),
    qhyWaitCaptureTimeoutMs: docDefault('qhyWaitCaptureTimeoutMs', 180_000),
    downloadDir: docDefault('downloadDir', './playwright-downloads') || './playwright-downloads',
    goalMaxSteps: docDefault('goalMaxSteps', 30),
    uiTimeoutMs: docDefault('uiTimeoutMs', 2_000),
    stepTimeoutMs: docDefault('stepTimeoutMs', 5_000),
    testTimeoutMs: docDefault('testTimeoutMs', 10 * 60_000),
    appPath: docDefault('appPath', '/'),
    ws: docDefault('ws', ''),
    backendHost: docDefault('backendHost', ''),
    backendPort: docDefault('backendPort', ''),
    backendSecure: docDefault('backendSecure', false),
    appQuery: docDefault('appQuery', ''),
    flowTiming: docDefault('flowTiming', true),
  },
})

/**
 * 布尔值解析优先级：tool 参数（显式） > env（若设置） > default
 * @param {{ override?: boolean, envName: string, defaultValue: boolean }} args
 */
function resolveBoolWithPrecedence({ override, envName, defaultValue }) {
  if (typeof override === 'boolean') return override
  if (process.env[envName] != null) return envFlag(process.env, envName, defaultValue)
  return defaultValue
}

module.exports = {
  CONFIG_DOCS,
  DEFAULTS,
  parseBool,
  parseNumber,
  parseString,
  envFlag,
  envNumber,
  envString,
  resolveBoolWithPrecedence,
}

