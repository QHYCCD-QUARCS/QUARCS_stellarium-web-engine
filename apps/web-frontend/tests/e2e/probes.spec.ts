import { test, expect } from '@playwright/test'
import { getAppStartPath } from './support/appStartPath'

test('E2E probes should render non-empty state', async ({ page }) => {
  await page.goto(getAppStartPath(), { waitUntil: 'domcontentloaded' })

  const mainConn = page.getByTestId('e2e-device-MainCamera-conn')
  await expect(mainConn).toHaveCount(1)

  const state = await mainConn.getAttribute('data-state')
  expect(state, 'e2e-device-MainCamera-conn 的 data-state 不应为空').toBeTruthy()
  expect(['connected', 'disconnected']).toContain(state)

  const tile = page.getByTestId('e2e-tilegpm')
  await expect(tile).toHaveCount(1)

  const seqRaw = await tile.getAttribute('data-seq')
  const seq = Number(seqRaw ?? NaN)
  expect(Number.isFinite(seq), `e2e-tilegpm 的 data-seq 应为数字字符串，实际=${seqRaw}`).toBeTruthy()
})

