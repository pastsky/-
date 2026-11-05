// 前后端共享的业务枚举中文映射与展示配置（对齐 v1.0 增量设计 v12 终版）

// ============ 角色 ============
export const ROLE_MAP = {
  RESIDENT: '业主',
  CUSTOMER_SERVICE: '客服',
  ENGINEER: '维修工',
  VENDOR_ENGINEER: '乙方检修员',
  BRANCH_ADMIN: '分公司管理员',
  VENDOR_ADMIN: '乙方管理员',
  ADMIN: '平台管理员'
}

export const ROLE_OPTIONS = [
  { value: 'RESIDENT', label: '业主' },
  { value: 'CUSTOMER_SERVICE', label: '客服' },
  { value: 'ENGINEER', label: '维修工' },
  { value: 'VENDOR_ENGINEER', label: '乙方检修员' },
  { value: 'BRANCH_ADMIN', label: '分公司管理员' },
  { value: 'VENDOR_ADMIN', label: '乙方管理员' },
  { value: 'ADMIN', label: '平台管理员' }
]

// 管理端可登录角色（业主端 / 维修工端为独立 H5 工程）
export const MANAGEMENT_ROLES = ['ADMIN', 'CUSTOMER_SERVICE', 'BRANCH_ADMIN', 'VENDOR_ADMIN']
// 可执行维修动作的角色
export const REPAIRER_ROLES = ['ENGINEER', 'VENDOR_ENGINEER']

// ============ 工单状态 ============
// 状态机定版（以《工单生命周期与调度机制设计归档》为准）：
//   PENDING --ASSIGN/GRAB--> ASSIGNED --ACCEPT--> PROCESSING --COMPLETE--> COMPLETED（瞬态）
//   COMPLETED --待回访--> PENDING_REVIEW --回访/评价--> CLOSED；回访不满意 --REJECT--> PROCESSING
//   PENDING/ASSIGNED --CANCEL--> CANCELED；ASSIGNED --RETURN--> PENDING 或入池
// 抢单与派单出口一致（都进入 ASSIGNED），维修工仍需 ACCEPT 才进入 PROCESSING，
// 以保证「ASSIGNED 超时未接回池」升级链对抢单同样生效、acceptTime 代表实际开工。
export const WORK_ORDER_STATUS_MAP = {
  PENDING: '待派单',
  ASSIGNED: '待接单',
  PROCESSING: '处理中',
  COMPLETED: '已完工',
  PENDING_REVIEW: '待回访',
  CLOSED: '已关闭',
  CANCELED: '已取消',
  ESCALATED_FINAL: '升级终态'
}

export const WORK_ORDER_STATUS_TAG = {
  PENDING: 'warning',
  ASSIGNED: 'primary',
  PROCESSING: 'primary',
  COMPLETED: 'success',
  PENDING_REVIEW: 'warning',
  CLOSED: 'info',
  CANCELED: 'danger',
  ESCALATED_FINAL: 'danger'
}

export const WORK_ORDER_STATUS_OPTIONS = Object.keys(WORK_ORDER_STATUS_MAP).map((value) => ({
  value,
  label: WORK_ORDER_STATUS_MAP[value]
}))

// 归档态：核心字段只读
export const ARCHIVED_STATUS = ['CLOSED', 'CANCELED', 'ESCALATED_FINAL']
// 在途态：占用维修工并发额度
export const UNFINISHED_STATUS = ['PENDING', 'ASSIGNED', 'PROCESSING', 'PENDING_REVIEW']

// ============ 优先级 ============
export const WORK_ORDER_PRIORITY_MAP = {
  LOW: '低',
  MEDIUM: '中',
  HIGH: '高',
  URGENT: '紧急'
}

export const WORK_ORDER_PRIORITY_TAG = {
  LOW: 'info',
  MEDIUM: 'primary',
  HIGH: 'warning',
  URGENT: 'danger'
}

export const WORK_ORDER_PRIORITY_OPTIONS = [
  { value: 'LOW', label: '低' },
  { value: 'MEDIUM', label: '中' },
  { value: 'HIGH', label: '高' },
  { value: 'URGENT', label: '紧急' }
]

export const PRIORITY_WEIGHT = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }

// ============ 工单类型 ============
export const WORK_ORDER_TYPE_MAP = {
  WATER: '水',
  ELECTRIC: '电',
  AIR: '空调',
  LIFT: '电梯',
  FIRE: '消防',
  CLEANING: '保洁',
  SECURITY: '安保',
  OTHER: '其他'
}

export const WORK_ORDER_TYPE_OPTIONS = Object.keys(WORK_ORDER_TYPE_MAP).map((value) => ({
  value,
  label: WORK_ORDER_TYPE_MAP[value]
}))

// 电梯类工单必须选择电梯档案
export const ELEVATOR_REQUIRED_TYPES = ['LIFT']

// ============ 动作（work_order_log.action） ============
export const WORK_ORDER_ACTION_MAP = {
  CREATE: '创建',
  ASSIGN: '派单',
  GRAB: '抢单',
  RETURN: '退回',
  TRANSFER: '转交',
  ACCEPT: '接单',
  COMPLETE: '完工',
  REJECT: '完工驳回',
  REVIEW_RESULT: '回访',
  CLOSE: '关闭',
  CANCEL: '取消',
  RATE: '评价',
  REMARK: '内部备注',
  ESCALATE: '超时升级'
}

// ============ 待抢单池 ============
export const POOL_FLAG_MAP = { 0: '常规', 1: '待抢单' }

// 抢单失败提示（后端 BOP：1002 无权限/已收工等，3000 状态或并发，3001 不存在）
export const GRAB_FAIL_REASON = {
  1002: '数据权限不足或当前不在值班状态',
  3000: '已被抢 / 存在在途工单 / 预约冲突 / 状态已变化',
  3001: '工单不存在'
}

// ============ 回访结果 ============
export const REVIEW_RESULT_MAP = {
  SATISFIED: '满意，归档',
  UNSATISFIED: '不满意，返工',
  TIMEOUT_AUTO: '超时默认好评'
}

// ============ 工单来源 ============
export const WORK_ORDER_SOURCE_MAP = {
  USER_REPORT: '业主报修',
  CS_ASSIGN: '客服受理',
  PLAN_TASK: '计划任务',
  INSPECTION: '巡检异常'
}

// ============ 通知 ============
export const USER_STATUS_MAP = { ACTIVE: '启用', DISABLED: '停用' }
export const USER_STATUS_OPTIONS = [
  { value: 'ACTIVE', label: '启用' },
  { value: 'DISABLED', label: '停用' }
]

export const NOTIFICATION_TYPE_MAP = {
  ASSIGNED: '派单',
  ACCEPTED: '接单',
  COMPLETED: '完工',
  CANCELED: '取消',
  RATED: '评价',
  RETURNED: '退回',
  MAINT_PROGRESS: '维保进度',
  ANNOUNCEMENT: '公告',
  FEEDBACK_RESOLVED: '反馈处理',
  CERT_EXPIRING: '证书到期',
  ASSIGN_TIMEOUT: '接单超时',
  PROCESS_TIMEOUT: '处理超时',
  REVIEW_TIMEOUT: '回访超时'
}

export const NOTIFICATION_SCOPE_MAP = {
  ALL: '全部用户',
  ROLE: '指定角色',
  BRANCH: '指定小区'
}

export const NOTIFICATION_SCOPE_OPTIONS = [
  { value: 'ALL', label: '全部用户' },
  { value: 'ROLE', label: '指定角色' },
  { value: 'BRANCH', label: '指定小区' }
]

// ============ 证书 ============
export const CERT_TYPE_MAP = {
  LIFT_CERT: '电梯作业证',
  ELECTRIC_CERT: '电工作业证',
  FIRE_CERT: '消防设施操作员',
  WATER_CERT: '给排水作业证',
  AIR_CERT: '制冷空调作业证'
}

// 强制持证的工单类型
export const CERT_REQUIRED_TYPES = {
  LIFT: 'LIFT_CERT',
  ELECTRIC: 'ELECTRIC_CERT',
  FIRE: 'FIRE_CERT'
}

export const CERT_STATUS_MAP = {
  PENDING: '待审核',
  APPROVED: '已通过',
  REJECTED: '已驳回',
  REVOKED: '已撤销',
  LOCKED: '已锁定'
}

export const CERT_STATUS_TAG = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
  REVOKED: 'info',
  LOCKED: 'danger'
}

// ============ 计划任务类型（维保 / 巡检） ============
export const TASK_TYPE_MAP = {
  MAINTENANCE: '维保',
  INSPECTION: '巡检'
}

// ============ 升级链 ============
export const ESCALATION_MAP = {
  0: '正常',
  1: 'L0 池超时',
  2: 'L1 督办',
  3: 'L2 终态'
}

// 处理超时阈值（小时），与 sys_config 口径一致
export const PROCESS_TIMEOUT_HOURS = { URGENT: 2, HIGH: 4, MEDIUM: 8, LOW: 24 }

// 预约时间粒度（分钟）
export const APPOINTMENT_SLOT_MINUTES = 30

export function isArchived(status) {
  return ARCHIVED_STATUS.includes(status)
}

export function formatAppointment(value) {
  return value || '尽快'
}

// ============ 电梯台账（PR-007） ============
export const ELEVATOR_STATUS_MAP = {
  ACTIVE: '正常',
  MAINTENANCE: '检修中',
  INACTIVE: '停用'
}

export const ELEVATOR_STATUS_TAG = {
  ACTIVE: 'success',
  MAINTENANCE: 'warning',
  INACTIVE: 'info'
}

export const ELEVATOR_STATUS_OPTIONS = Object.keys(ELEVATOR_STATUS_MAP).map((value) => ({
  value,
  label: ELEVATOR_STATUS_MAP[value]
}))

// ============ 班组（PR-014） ============
export const TEAM_STATUS_MAP = { ACTIVE: '启用', DISABLED: '停用' }

// ============ 证书映射要求（PR-017） ============
export const CERT_REQUIREMENT_MAP = {
  FORCE: '强制持证',
  SUGGEST: '建议持证',
  NONE: '不要求'
}

// ============ 反馈（PR-016） ============
export const FEEDBACK_STATUS_MAP = {
  SUBMITTED: '待处理',
  RESOLVED: '已处理'
}

export const FEEDBACK_STATUS_TAG = {
  SUBMITTED: 'warning',
  RESOLVED: 'success'
}

export const FEEDBACK_STATUS_OPTIONS = Object.keys(FEEDBACK_STATUS_MAP).map((value) => ({
  value,
  label: FEEDBACK_STATUS_MAP[value]
}))

// ============ 报表导出中心（PR-022） ============
export const REPORT_TYPE_MAP = {
  WORK_ORDER: '工单明细',
  MAINTENANCE: '维保任务明细',
  INSPECTION: '巡检任务明细',
  ENGINEER_PERFORMANCE: '维修工绩效',
  TEAM_PERFORMANCE: '班组统计',
  OVERVIEW: '运营总览'
}

export const REPORT_TYPE_OPTIONS = Object.keys(REPORT_TYPE_MAP).map((value) => ({
  value,
  label: REPORT_TYPE_MAP[value]
}))

export const EXPORT_FORMAT_MAP = {
  EXCEL: 'Excel',
  CSV: 'CSV',
  PDF: 'PDF',
  PNG: 'PNG 图片'
}

// PDF/PNG 仅支持部分报表；PNG 最多渲染 200 行
export const EXPORT_FORMAT_MATRIX = {
  EXCEL: ['WORK_ORDER', 'MAINTENANCE', 'INSPECTION', 'ENGINEER_PERFORMANCE', 'TEAM_PERFORMANCE', 'OVERVIEW'],
  CSV: ['WORK_ORDER', 'MAINTENANCE', 'INSPECTION', 'ENGINEER_PERFORMANCE', 'TEAM_PERFORMANCE', 'OVERVIEW'],
  PDF: ['OVERVIEW', 'ENGINEER_PERFORMANCE', 'TEAM_PERFORMANCE'],
  PNG: ['OVERVIEW', 'TEAM_PERFORMANCE']
}

export const EXPORT_STATUS_MAP = {
  QUEUED: '排队中',
  RUNNING: '生成中',
  SUCCESS: '已完成',
  FAILED: '失败',
  EXPIRED: '已过期'
}

export const EXPORT_STATUS_TAG = {
  QUEUED: 'info',
  RUNNING: 'warning',
  SUCCESS: 'success',
  FAILED: 'danger',
  EXPIRED: 'info'
}

// ============ 审计（PR-014） ============
export const AUDIT_BIZ_TYPE_MAP = {
  CONFIG: '系统配置',
  USER: '用户',
  TEAM: '班组',
  BROADCAST: '广播'
}

export const AUDIT_ACTION_MAP = {
  CREATE: '创建',
  UPDATE: '更新',
  DISABLE: '停用',
  ENABLE: '启用',
  DELETE: '删除',
  MEMBER_CHANGE: '成员变更',
  BROADCAST: '广播'
}

// 兜底改单仅允许的 3 对状态
export const FORCE_STATUS_MATRIX = {
  PROCESSING: ['ASSIGNED', 'COMPLETED'],
  PENDING: ['CANCELED']
}

