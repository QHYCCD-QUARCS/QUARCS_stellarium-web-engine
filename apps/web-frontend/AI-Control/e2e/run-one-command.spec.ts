/**
 * 供 MCP / 外部按「命令名」执行单条 AI-Control 命令。
 * 通过环境变量传入：E2E_AI_CONTROL_COMMAND（命令名）、E2E_FLOW_PARAMS_JSON（可选 JSON 参数）。
 */
import { test } from '@playwright/test'
import {
  CLI_COMMANDS,
  createFlowContext,
  makeAiControlRegistry,
  resolveFlowParamsFromEnv,
  runFlowByCommand,
} from '..'

test('按环境变量执行一条 AI-Control 命令', async ({ page }, testInfo) => {
  const commandName = (process.env.E2E_AI_CONTROL_COMMAND?.trim().toLowerCase() || 'general-settings') as (typeof CLI_COMMANDS)[number]
  if (!CLI_COMMANDS.includes(commandName)) {
    throw new Error(`未知命令: ${commandName}，可用: ${CLI_COMMANDS.join(', ')}`)
  }

  let flowParams: Record<string, unknown> = {}
  const paramsJson = process.env.E2E_FLOW_PARAMS_JSON?.trim()
  if (paramsJson) {
    try {
      flowParams = JSON.parse(paramsJson) as Record<string, unknown>
    } catch {
      // ignore invalid JSON
    }
  }
  flowParams = resolveFlowParamsFromEnv(flowParams) as Record<string, unknown>

  const ctx = createFlowContext(page, testInfo, { minTestTimeoutMs: 5 * 60_000 })
  const registry = makeAiControlRegistry()
  await page.goto('/')
  await runFlowByCommand({ ctx, registry, commandName, flowParams })
})
