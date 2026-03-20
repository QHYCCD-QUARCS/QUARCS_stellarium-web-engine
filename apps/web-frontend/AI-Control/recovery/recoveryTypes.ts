import type { FlowStepCall } from '../core/flowTypes'
import type { BusyStateKey, CommandRequirement, DialogBlockerKind } from '../scenario/commandRequirements'

export type RecoveryBlockerResolution = 'step' | 'wait' | 'cancel' | 'reject'

export type RecoveryBlocker = {
  kind: DialogBlockerKind | BusyStateKey
  reason: string
  resolution: RecoveryBlockerResolution
  stepId?: string
}

export type RecoveryPlan = {
  commandName: string
  requirement: CommandRequirement | undefined
  blockers: RecoveryBlocker[]
  preSteps: FlowStepCall[]
  targetSurface: string | null
  suggestions: string[]
}
