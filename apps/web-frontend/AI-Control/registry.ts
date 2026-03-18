/**
 * AI-Control 步骤注册表聚合。
 *
 * 将 atomic、menu（drawer/dialog/menu）、device（allocation/connection/capture/qhyccdAlias）
 * 等模块的 step 合并为单一 StepRegistry，供 runFlow 使用。合并时若出现重复 step id 会抛错。
 */
import type { StepRegistry } from './core/flowTypes'
import { mergeRegistries } from './core/flowRunner'
import { makeUiAtomicStepRegistry } from './atomic/uiAtomicSteps'
import { makeDrawerStepRegistry } from './menu/drawerSteps'
import { makeDialogStepRegistry } from './menu/dialogSteps'
import { makeMenuStepRegistry } from './menu/menuSteps'
import { makeAllocationStepRegistry } from './device/allocationSteps'
import { makeConnectionStepRegistry } from './device/connectionSteps'
import { makeCaptureStepRegistry } from './device/captureSteps'
import { makeMainCameraConfigStepRegistry } from './device/mainCameraConfigSteps'
import { makeMountControlStepRegistry } from './device/mountControlSteps'
import { makePowerManagementStepRegistry } from './device/powerManagementSteps'
import { makeFocuserControlStepRegistry } from './device/focuserControlSteps'
import { makeCfwControlStepRegistry } from './device/cfwControlSteps'
import { makePolarAxisStepRegistry } from './device/polarAxisSteps'
import { makeGuiderControlStepRegistry } from './device/guiderControlSteps'
import { makeQhyccdAliasStepRegistry } from './device/qhyccdAliasSteps'
import { makeRecoveryStepRegistry } from './recovery/recoverySteps'

export function makeAiControlRegistry(): StepRegistry {
  return mergeRegistries(
    makeUiAtomicStepRegistry(),
    makeDrawerStepRegistry(),
    makeDialogStepRegistry(),
    makeMenuStepRegistry(),
    makeAllocationStepRegistry(),
    makeConnectionStepRegistry(),
    makeCaptureStepRegistry(),
    makeMainCameraConfigStepRegistry(),
    makeMountControlStepRegistry(),
    makePowerManagementStepRegistry(),
    makeFocuserControlStepRegistry(),
    makeCfwControlStepRegistry(),
    makePolarAxisStepRegistry(),
    makeGuiderControlStepRegistry(),
    makeQhyccdAliasStepRegistry(),
    makeRecoveryStepRegistry(),
  )
}
