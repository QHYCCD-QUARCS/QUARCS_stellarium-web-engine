import fs from 'node:fs'
import path from 'node:path'

export type TestIdIndex = {
  metadata: {
    generatedAt: string
    totalComponents: number
    componentsWithTestIds: number
    totalTestIds: number
  }
  components: Record<
    string,
    {
      name: string
      lines: number
      suggestedPrefix: string
      priority: string
      testIdCount: number
      testIds: string[]
    }
  >
  testIds: Record<
    string,
    {
      component: string
      line: number
      elementType: string
      hasDataState: boolean
      dataState: string | null
    }
  >
  prefixes: Record<string, string>
}

export function loadTestIdIndex(): TestIdIndex {
  const p = path.join(process.cwd(), 'docs/e2e/E2E_TEST_IDS_INDEX.json')
  const raw = fs.readFileSync(p, 'utf-8')
  return JSON.parse(raw) as TestIdIndex
}

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

/**
 * 给 goal/当前页面状态提供候选 testid（用于喂给 LLM，避免塞整个 index）。
 */
export function suggestTestIds(params: {
  goal: string
  visibleTestIds: string[]
  index: TestIdIndex
  limit?: number
}): { id: string; score: number; visible: boolean }[] {
  const limit = params.limit ?? 40
  const goalTokens = tokenize(params.goal)
  const visibleSet = new Set(params.visibleTestIds)

  const scoreId = (id: string) => {
    const low = id.toLowerCase()
    let score = 0
    for (const t of goalTokens) {
      if (t.length < 2) continue
      if (low.includes(t)) score += 3
    }
    // 鼓励优先可见元素
    if (visibleSet.has(id)) score += 5
    return score
  }

  const scored = Object.keys(params.index.testIds)
    .map((id) => ({ id, score: scoreId(id), visible: visibleSet.has(id) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)

  // 若 goal 很抽象，补充一些可见元素做兜底
  const fallbackVisible = params.visibleTestIds
    .slice(0, limit)
    .map((id) => ({ id, score: 1, visible: true }))

  const merged: { id: string; score: number; visible: boolean }[] = []
  const seen = new Set<string>()
  for (const x of [...scored, ...fallbackVisible]) {
    if (seen.has(x.id)) continue
    seen.add(x.id)
    merged.push(x)
    if (merged.length >= limit) break
  }
  return merged
}

