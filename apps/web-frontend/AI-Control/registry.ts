import type { StepRegistry } from './core/flowTypes'
import { mergeRegistries } from './core/flowRunner'
import { makeUiAtomicStepRegistry } from './atomic/uiAtomicSteps'
import { makeDrawerStepRegistry } from './menu/drawerSteps'
import { makeDialogStepRegistry } from './menu/dialogSteps'
import { makeMenuStepRegistry } from './menu/menuSteps'
import { makeAllocationStepRegistry } from './device/allocationSteps'
import { makeConnectionStepRegistry } from './device/connectionSteps'
import { makeCaptureStepRegistry } from './device/captureSteps'
import { makeQhyccdAliasStepRegistry } from './device/qhyccdAliasSteps'

export function makeAiControlRegistry(): StepRegistry {
  return mergeRegistries(
    makeUiAtomicStepRegistry(),
    makeDrawerStepRegistry(),
    makeDialogStepRegistry(),
    makeMenuStepRegistry(),
    makeAllocationStepRegistry(),
    makeConnectionStepRegistry(),
    makeCaptureStepRegistry(),
    makeQhyccdAliasStepRegistry(),
  )
}
