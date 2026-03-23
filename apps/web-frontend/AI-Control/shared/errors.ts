/**
 * AI-Control 统一步骤错误格式。
 *
 * 提供 createStepError，使报错包含步骤 id、阶段、原因与可选 detail；
 * 支持 Error.cause 便于追溯原始异常。
 */

export type StepErrorPhase = 'precondition' | 'params' | 'execute' | 'postcondition'

const PREFIX = '[AI-Control]'

/** 判断是否为 AI-Control 步骤错误（已带统一前缀） */
export function isStepError(e: unknown): boolean {
  return e instanceof Error && e.message.startsWith(PREFIX)
}

/**
 * 创建步骤错误，message 格式： [AI-Control] ${stepId} ${phase}: ${reason}
 * 若有 detail 则附在第二行（JSON 序列化）。
 * 若支持 Error.cause，可传入 cause 便于排查。
 */
export function createStepError(
  stepId: string,
  phase: StepErrorPhase,
  reason: string,
  detail?: Record<string, unknown>,
  cause?: unknown,
): Error {
  let message = `${PREFIX} ${stepId} ${phase}: ${reason}`
  if (detail != null && Object.keys(detail).length > 0) {
    try {
      message += `\n${JSON.stringify(detail)}`
    } catch {
      message += `\n${String(detail)}`
    }
  }
  const err =
    cause != null
      ? new Error(message, { cause: cause instanceof Error ? cause : new Error(String(cause)) })
      : new Error(message)
  return err
}
