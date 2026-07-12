import { expect, test } from '@playwright/test'
import { handleSpecialWebSocketMessage } from '../../src/domain/websocket/specialMessageHandlers.js'

function createContext() {
  const events = []
  return {
    events,
    context: {
      $bus: { $emit: (...args) => events.push(args) },
      handleTileBatchReady: payload => events.push(['TileBatchReady', payload]),
      handleTileGenerationComplete: payload => events.push(['TileGenerationComplete', payload]),
    },
  }
}

test('network and Wi-Fi messages emit parsed payloads', () => {
  const { context, events } = createContext()
  expect(handleSpecialWebSocketMessage(context, 'NetStatus|{"mode":"wan","online":true}')).toBe(true)
  expect(handleSpecialWebSocketMessage(context, 'WiFiSaveResult|save|ok|profile stored')).toBe(true)
  expect(events).toContainEqual(['NetStatus', { mode: 'wan', online: true }])
  expect(events).toContainEqual(['WiFiSaveResult', { action: 'save', result: 'ok', detail: 'profile stored' }])
})

test('invalid JSON is handled and reported without falling through', () => {
  const { context, events } = createContext()
  expect(handleSpecialWebSocketMessage(context, 'WiFiScan|not-json')).toBe(true)
  expect(events).toContainEqual(['SendConsoleLogMsg', 'WiFiScan JSON parse failed', 'warning'])
})

test('download manifests preserve colons inside JSON strings', () => {
  const { context, events } = createContext()
  expect(handleSpecialWebSocketMessage(context, 'DownloadManifest:{"url":"http://host:8080/a","files":[]}')).toBe(true)
  expect(events).toContainEqual(['DownloadManifest', { url: 'http://host:8080/a', files: [] }])
})

test('tile notifications call their domain methods', () => {
  const { context, events } = createContext()
  expect(handleSpecialWebSocketMessage(context, 'TileBatchReady:{"sessionId":"s1","tiles":["0/0/0"]}')).toBe(true)
  expect(handleSpecialWebSocketMessage(context, 'TileGenerationComplete:{"sessionId":"s1","complete":true}')).toBe(true)
  expect(events).toContainEqual(['TileBatchReady', { sessionId: 's1', tiles: ['0/0/0'] }])
  expect(events).toContainEqual(['TileGenerationComplete', { sessionId: 's1', complete: true }])
})

test('ordinary colon-delimited messages fall through to switch dispatch', () => {
  const { context } = createContext()
  expect(handleSpecialWebSocketMessage(context, 'ConnectSuccess:MainCamera:QHY:indi_qhy_ccd')).toBe(false)
})
