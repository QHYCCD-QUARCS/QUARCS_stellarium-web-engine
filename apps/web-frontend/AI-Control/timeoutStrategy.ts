/**
 * 与 commandRequirements / recoveryPlanner 配套的「避免整命令超时」执行提示（只读参考）。
 * 具体策略以 scenario/commandRequirements.ts 为准。
 */
import type { BusyStateKey, BusyStrategy } from './scenario/commandRequirements'

export type TimeoutMitigationHint = {
  busyKey: BusyStateKey
  strategies: BusyStrategy[]
  mitigationZh: string
}

export const TIMEOUT_MITIGATION_HINTS: readonly TimeoutMitigationHint[] = [
  {
    busyKey: 'capture',
    strategies: ['wait', 'reject'],
    mitigationZh:
      '执行前用 GET /status 查看 busyStates.capture；maincamera/cfw 对 capture 多为 wait，其它命令多为 reject，应先结束拍摄或换命令。',
  },
  {
    busyKey: 'guiding',
    strategies: ['cancel'],
    mitigationZh: '多数命令会经恢复层取消导星；若长时间卡在导星相关步骤，检查 app.cancelGuiding 是否生效。',
  },
  {
    busyKey: 'polarAxis',
    strategies: ['cancel'],
    mitigationZh: '非极轴命令遇极轴运行会先收敛；避免与极轴长任务并行压测同一命令超时。',
  },
  {
    busyKey: 'deviceAllocation',
    strategies: ['cancel'],
    mitigationZh: '分配面板打开时优先关闭而非死等；连接步骤内会轮询绑定与探针状态。',
  },
]

/** 默认目标设备 baseURL 片段（与测试计划一致，可被 E2E_BASE_URL 覆盖） */
export const DEFAULT_PLAN_TARGET_HOST = '192.168.1.104'
