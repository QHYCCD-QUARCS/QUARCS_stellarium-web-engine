/**
 * 统一生成 E2E 启动路径（相对 baseURL）。
 *
 * 用途：让 E2E 在“前端页面 host”和“Qt/相机后端 host”不一致时，也能通过 query 覆盖 WebSocket 目标。
 *
 * 支持环境变量：
 * - E2E_APP_PATH: 默认 '/'
 * - E2E_WS:        直接指定 ws/wss 地址（优先级最高），例如 ws://192.168.1.113:8600
 * - E2E_BACKEND_HOST / E2E_BACKEND_PORT / E2E_BACKEND_SECURE: 组合指定
 * - E2E_APP_QUERY: 额外 query（原样追加；可包含 ws/backendHost/backendPort 等）
 */

// 统一配置入口（所有默认值/环境变量含义都在这里）
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { DEFAULTS, envFlag, envString } = require('../../../e2e.config.cjs')

export function getAppStartPath(): string {
  const appPathRaw = envString(process.env, 'E2E_APP_PATH', DEFAULTS.flow.appPath).trim() || '/'
  const appPath = appPathRaw.startsWith('/') ? appPathRaw : `/${appPathRaw}`

  const params = new URLSearchParams()

  const ws = envString(process.env, 'E2E_WS', DEFAULTS.flow.ws).trim()
  if (ws) {
    params.set('ws', ws)
  } else {
    const host = envString(process.env, 'E2E_BACKEND_HOST', DEFAULTS.flow.backendHost).trim()
    if (host) {
      params.set('backendHost', host)
      const port = envString(process.env, 'E2E_BACKEND_PORT', DEFAULTS.flow.backendPort).trim()
      if (port) params.set('backendPort', port)
      const secure = envFlag(process.env, 'E2E_BACKEND_SECURE', DEFAULTS.flow.backendSecure)
      if (secure) params.set('backendSecure', '1')
    }
  }

  const extra = envString(process.env, 'E2E_APP_QUERY', DEFAULTS.flow.appQuery).trim()
  if (extra) {
    // 允许用户传 "a=1&b=2" 或 "?a=1&b=2"
    const s = extra.startsWith('?') ? extra.slice(1) : extra
    const extraParams = new URLSearchParams(s)
    for (const [k, v] of extraParams.entries()) params.append(k, v)
  }

  const qs = params.toString()
  return qs ? `${appPath}?${qs}` : appPath
}

