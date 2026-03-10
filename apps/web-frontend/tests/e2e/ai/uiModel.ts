import type { Page } from '@playwright/test'

export type UiNode = {
  testId: string
  tag: string
  text: string
  disabled: boolean
  visible: boolean
  attrs: Record<string, string>
}

export type UiModel = {
  url: string
  title: string
  timestamp: string
  nodes: UiNode[]
}

/**
 * 抽取当前页面（可见）data-testid 元素快照，作为 AI 的“状态输入”。
 * 只保留高信号字段（避免 prompt 过大）。
 */
export async function collectUiModel(page: Page, limit = 600): Promise<UiModel> {
  const url = page.url()
  const title = await page.title().catch(() => '')
  const timestamp = new Date().toISOString()

  const nodes = await page.evaluate(
    ({ limit }) => {
      const isVisible = (el: Element) => {
        const e = el as HTMLElement
        const rect = e.getBoundingClientRect()
        if (rect.width <= 0 || rect.height <= 0) return false
        const style = window.getComputedStyle(e)
        if (style.visibility === 'hidden' || style.display === 'none') return false
        // 在视口内（允许部分在外）
        const inViewport =
          rect.bottom >= 0 &&
          rect.right >= 0 &&
          rect.top <= (window.innerHeight || document.documentElement.clientHeight) &&
          rect.left <= (window.innerWidth || document.documentElement.clientWidth)
        return inViewport
      }

      const pickAttrs = (el: Element) => {
        const out: Record<string, string> = {}
        const attrNames = ['data-state', 'data-value', 'data-progress', 'data-step', 'aria-label', 'role', 'name', 'type']
        for (const n of attrNames) {
          const v = el.getAttribute(n)
          if (v != null) out[n] = v
        }
        // 把 data-*（除了 testid）也收一点
        for (const a of Array.from(el.attributes)) {
          if (!a.name.startsWith('data-')) continue
          if (a.name === 'data-testid') continue
          if (out[a.name] == null) out[a.name] = a.value
        }
        return out
      }

      const elements = Array.from(document.querySelectorAll('[data-testid]'))
        .filter(isVisible)
        .slice(0, limit)

      return elements.map((el) => {
        const testId = (el.getAttribute('data-testid') || '').trim()
        const tag = el.tagName.toLowerCase()
        const text = (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120)
        const disabled = (el as HTMLButtonElement).disabled === true || el.getAttribute('aria-disabled') === 'true'
        return {
          testId,
          tag,
          text,
          disabled,
          visible: true,
          attrs: pickAttrs(el),
        }
      })
    },
    { limit },
  )

  return { url, title, timestamp, nodes }
}

