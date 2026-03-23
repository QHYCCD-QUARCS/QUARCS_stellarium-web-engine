/**
 * AI-Control 统一入口。
 *
 * 对外导出流程类型、运行器、交互原语、导航、守卫、步骤注册表工厂及高层业务 flow builder，
 * 供 E2E 测试、CLI 或 MCP 调用。不侵入 tests/ 目录，仅提供新的控制层草案。
 */
export * from './core/flowTypes'
export * from './core/flowRunner'
export * from './core/commandExecutor'
export * from './shared/interaction'
export * from './shared/navigation'
export * from './shared/guards'
export * from './shared/errors'
export * from './registry'
export * from './scenario/businessFlows'
export * from './scenario/cliFlows'
export * from './scenario/commandRequirements'
export * from './recovery/recoveryPlanner'
export * from './recovery/recoveryTypes'
export * from './setup/flowContext'
export * from './setup/flowParamsFromEnv'
export * from './status/pageStatus'
