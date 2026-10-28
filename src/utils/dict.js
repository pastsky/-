// 前后端共享的业务枚举中文映射与展示配置

export const ROLE_MAP = {
  RESIDENT: '业主',
  CUSTOMER_SERVICE: '客服',
  ENGINEER: '维修工',
  ADMIN: '管理员'
}

export const ROLE_OPTIONS = [
  { value: 'RESIDENT', label: '业主' },
  { value: 'CUSTOMER_SERVICE', label: '客服' },
  { value: 'ENGINEER', label: '维修工' },
  { value: 'ADMIN', label: '管理员' }
]

export const WORK_ORDER_STATUS_MAP = {
  PENDING: '待派单',
  ASSIGNED: '待接单',
  PROCESSING: '处理中',
  COMPLETED: '已完成',
  CLOSED: '已关闭',
  CANCELED: '已取消'
}

export const WORK_ORDER_STATUS_TAG = {
  PENDING: 'warning',
  ASSIGNED: 'primary',
  PROCESSING: 'primary',
  COMPLETED: 'success',
  CLOSED: 'info',
  CANCELED: 'danger'
}

export const WORK_ORDER_STATUS_OPTIONS = [
  { value: 'PENDING', label: '待派单' },
  { value: 'ASSIGNED', label: '待接单' },
  { value: 'PROCESSING', label: '处理中' },
  { value: 'COMPLETED', label: '已完成' },
  { value: 'CLOSED', label: '已关闭' },
  { value: 'CANCELED', label: '已取消' }
]

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

export const WORK_ORDER_TYPE_OPTIONS = [
  { value: 'WATER', label: '水' },
  { value: 'ELECTRIC', label: '电' },
  { value: 'AIR', label: '空调' },
  { value: 'LIFT', label: '电梯' },
  { value: 'FIRE', label: '消防' },
  { value: 'CLEANING', label: '保洁' },
  { value: 'SECURITY', label: '安保' },
  { value: 'OTHER', label: '其他' }
]

export const USER_STATUS_MAP = {
  ACTIVE: '启用',
  DISABLED: '禁用'
}

export const USER_STATUS_OPTIONS = [
  { value: 'ACTIVE', label: '启用' },
  { value: 'DISABLED', label: '禁用' }
]

export const WORK_ORDER_ACTION_MAP = {
  CREATE: '创建',
  ASSIGN: '派单',
  RETURN: '退回',
  ACCEPT: '接单',
  COMPLETE: '完工',
  CLOSE: '关闭',
  CANCEL: '取消',
  RATE: '评价'
}

export const NOTIFICATION_TYPE_MAP = {
  ASSIGNED: '派单',
  ACCEPTED: '接单',
  COMPLETED: '完工',
  CANCELED: '取消',
  RATED: '评价',
  RETURNED: '退回'
}
