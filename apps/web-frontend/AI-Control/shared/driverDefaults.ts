/**
 * QHY 主相机 / 导星等默认驱动展示文案。
 * 与 App.vue 下拉常见 label「QHY CCD」一致；与 SDK 内部名「QHYCCD」通过 normalizeDriverLabelForCompare 等价匹配。
 */
export const DEFAULT_QHY_DRIVER_TEXT = 'QHY CCD'

/** 多相机且未指定 allocationDeviceMatch 时，导星角色默认优先匹配名称中含此子串的设备（如 QHY5III 系列），大小写不敏感 */
export const DEFAULT_GUIDER_ALLOCATION_SUBSTRING = '5III'
