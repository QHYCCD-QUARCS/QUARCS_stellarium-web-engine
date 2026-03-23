import { loadTestIdIndex } from '../ai/testIdIndex'

type Inventory = {
  /** interactive-only：可交互控件（按钮/输入/选择/可点击项等） */
  interactive: string[]
  /** 有明显副作用/破坏性的控件：默认不在 smoke 中执行 click（但仍可 ensure/断言存在） */
  dangerous: string[]
  /** 解释（用于失败提示/调试） */
  reasonById: Record<string, string>
}

function isTemplateLike(id: string) {
  // index 里可能包含 `foo-${bar}` 之类的模板字符串描述；这些不是可直接定位的稳定 testId
  return id.includes('${') || id.includes('`')
}

function hasAnyToken(id: string, tokens: string[]) {
  return tokens.some((t) => id.includes(t))
}

function isInteractiveByNaming(id: string) {
  // 命名约定：-btn- / -act- / -input- / -select- / -switch- / -slider- / -toggle-
  // 注意：ui-app-menu-* 属于 v-list-item（可点击），不一定包含 btn/act token
  if (id.startsWith('ui-app-menu-')) return true
  if (id.startsWith('tb-btn-') || id.startsWith('tb-act-')) return true
  if (id.startsWith('scp-btn-') || id.startsWith('scp-act-')) return true
  if (id.startsWith('ui-confirm-dialog-btn-')) return true

  const tokens = [
    '-btn-',
    '-act-',
    '-input-',
    '-select-',
    '-switch-',
    '-slider-',
    '-toggle-',
    '-checkbox-',
    '-radio-',
  ]
  return hasAnyToken(id, tokens)
}

function isDangerous(id: string) {
  // 默认 smoke 不应触发破坏性动作（退出、刷新、关机/重启/断连、拍摄等）
  const exact = new Set([
    'ui-app-menu-quit',
    'ui-app-menu-connect-all',
    'ui-app-menu-disconnect-all',
    'ui-confirm-dialog-btn-confirm',
    // Power page（强副作用）
    'ui-app-power-page-restart',
    'ui-app-power-page-shutdown',
    'ui-app-power-page-force-update',
    // Capture（需要硬件/后端）
    'cp-btn-capture',
    'cp-btn-save',
  ])
  if (exact.has(id)) return true

  // 额外兜底：明显含 shutdown/restart/quit/refresh 语义
  const tokens = ['shutdown', 'restart', 'quit', 'refresh', 'disconnect', 'connect-all', 'force-update']
  return tokens.some((t) => id.toLowerCase().includes(t))
}

export function buildInteractiveTestIdInventory(): Inventory {
  const idx = loadTestIdIndex()
  const reasonById: Record<string, string> = {}

  const interactive: string[] = []
  const dangerous: string[] = []

  for (const id of Object.keys(idx.testIds ?? {})) {
    if (!id || typeof id !== 'string') continue
    if (isTemplateLike(id)) continue

    const meta = idx.testIds[id]
    const type = String(meta?.elementType ?? '').toLowerCase()
    const interactiveByType = ['button', 'input', 'select', 'textarea', 'a'].includes(type)
    const interactiveByNaming = isInteractiveByNaming(id)

    if (!(interactiveByType || interactiveByNaming)) continue

    interactive.push(id)
    reasonById[id] = interactiveByType
      ? `elementType=${type}`
      : `naming=${id
          .split('-')
          .slice(0, 3)
          .join('-')}`

    if (isDangerous(id)) dangerous.push(id)
  }

  interactive.sort()
  dangerous.sort()

  return { interactive, dangerous, reasonById }
}

