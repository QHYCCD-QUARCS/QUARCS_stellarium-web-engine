/**
 * 与测试计划文档对齐的分模块命令矩阵（仅数据，供脚本/工具引用）。
 * 执行顺序：A → B → C → D → E。
 */
export type PlanModuleId = 'A' | 'B' | 'C' | 'D' | 'E'

export const PLAN_MODULE_ORDER: PlanModuleId[] = ['A', 'B', 'C', 'D', 'E']

export const PLAN_MODULES: Record<
  PlanModuleId,
  { titleZh: string; commandNames: readonly string[]; playwrightSpecs?: readonly string[] }
> = {
  A: {
    titleZh: '会话与恢复层基线',
    commandNames: [],
    playwrightSpecs: ['recovery.spec.ts', 'busy-policy-matrix.spec.ts', 'cli-flow-planning.spec.ts'],
  },
  B: {
    titleZh: '通用与面板类',
    commandNames: [
      'general-settings',
      'power-management',
      'image-file-manager',
      'task-schedule',
      'polar-axis-calibration',
    ],
    playwrightSpecs: ['general-settings.spec.ts', 'power-management.spec.ts', 'other-commands.spec.ts'],
  },
  C: {
    titleZh: '设备连接与控制',
    commandNames: [
      'disconnect-all',
      'device-disconnect',
      'mount-connect-control',
      'mount-park',
      'mount-panel',
      'focuser-connect-control',
      'telescopes-focal-length',
    ],
    playwrightSpecs: ['device-commands.spec.ts'],
  },
  D: {
    titleZh: '拍摄与导星',
    commandNames: ['guider-connect-capture', 'maincamera-connect-capture', 'cfw-capture-config'],
    playwrightSpecs: ['capture-commands.spec.ts'],
  },
  E: {
    titleZh: 'CLI / E2E 回归与深度验证',
    commandNames: [],
    playwrightSpecs: ['run-one-command.spec.ts'],
  },
}

/** 深度验证脚本内嵌的 12 条命令顺序名（与 scripts/ai-control-deep-verify.sh 一致） */
export const DEEP_VERIFY_COMMAND_SEQUENCE: readonly string[] = [
  'general-settings',
  'power-management',
  'telescopes-focal-length',
  'polar-axis-calibration',
  'image-file-manager',
  'mount-connect-control',
  'mount-park',
  'mount-panel',
  'guider-connect-capture',
  'maincamera-connect-capture',
  'focuser-connect-control',
  'cfw-capture-config',
]
