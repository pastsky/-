// 内存态 mock 数据（模块单例，供所有 mock 接口共享读写）
// 字段口径对齐 v1.0 增量设计：poolFlag / appointmentTime / source / escalationCount / finishImages

export const communities = [
  { id: 1, name: '金桂园小区' },
  { id: 2, name: '银桦苑小区' }
]

export const groups = [
  { id: 1, name: '一班', communityId: 1 },
  { id: 2, name: '二班', communityId: 1 },
  { id: 3, name: '外委组', communityId: 2 }
]

export const elevators = [
  { id: 1, elevatorNo: 'JG-A1-01', communityId: 1, building: '1栋', status: 'ACTIVE', nextInspectionDate: '2026-12-20' },
  { id: 2, elevatorNo: 'JG-A2-01', communityId: 1, building: '2栋', status: 'MAINTENANCE', nextInspectionDate: '2026-11-10' },
  { id: 3, elevatorNo: 'JG-A3-01', communityId: 1, building: '3栋', status: 'INACTIVE', nextInspectionDate: '2026-10-28' },
  { id: 4, elevatorNo: 'YH-B1-01', communityId: 2, building: 'B1栋', status: 'ACTIVE', nextInspectionDate: '2027-01-15' }
]

// 值班表：按班组排班（本系统不做排班界面，仅消费）
export const dutySchedules = [
  { id: 1, date: '2026-11-02', groupId: 1, communityId: 1 },
  { id: 2, date: '2026-11-03', groupId: 2, communityId: 1 },
  { id: 3, date: '2026-11-04', groupId: 1, communityId: 1 },
  { id: 4, date: '2026-11-05', groupId: 2, communityId: 1 }
]

const cert = (tagCode, expireDate = '2027-12-31') => ({
  tagCode,
  status: 'APPROVED',
  expireDate,
  rejectCount: 0
})

export const users = [
  { id: 1, username: 'admin', password: '123456', realName: '管理员', phone: '13800000001', email: 'admin@example.com', address: '', communityId: 1, building: '', room: '', role: 'ADMIN', groupId: null, onDuty: 1, certs: [], status: 'ACTIVE', createdAt: '2026-10-01 09:00:00', updatedAt: '2026-10-01 09:00:00' },
  { id: 2, username: 'cs001', password: '123456', realName: '客服小王', phone: '13800000002', email: 'cs@example.com', address: '', communityId: 1, building: '', room: '', role: 'CUSTOMER_SERVICE', groupId: null, onDuty: 1, certs: [], status: 'ACTIVE', createdAt: '2026-10-01 09:00:00', updatedAt: '2026-10-01 09:00:00' },
  { id: 3, username: 'engineer001', password: '123456', realName: '李师傅', phone: '13800000003', email: 'li@example.com', address: '', communityId: 1, building: '', room: '', role: 'ENGINEER', groupId: 1, onDuty: 1, certs: [cert('LIFT_CERT'), cert('ELECTRIC_CERT')], status: 'ACTIVE', createdAt: '2026-10-01 09:00:00', updatedAt: '2026-10-01 09:00:00' },
  { id: 4, username: 'engineer002', password: '123456', realName: '王师傅', phone: '13800000004', email: 'wang@example.com', address: '', communityId: 1, building: '', room: '', role: 'ENGINEER', groupId: 2, onDuty: 0, certs: [cert('LIFT_CERT', '2026-11-15'), cert('FIRE_CERT')], status: 'ACTIVE', createdAt: '2026-10-01 09:00:00', updatedAt: '2026-10-01 09:00:00' },
  { id: 5, username: 'resident001', password: '123456', realName: '张三', phone: '13800000005', email: 'zhang@example.com', address: '3栋2单元501', communityId: 1, building: '3栋', room: '2单元501', role: 'RESIDENT', groupId: null, onDuty: 1, certs: [], status: 'ACTIVE', createdAt: '2026-10-01 09:00:00', updatedAt: '2026-10-01 09:00:00' },
  { id: 6, username: 'resident002', password: '123456', realName: '李四', phone: '13800000006', email: 'li2@example.com', address: '5栋1单元302', communityId: 1, building: '5栋', room: '1单元302', role: 'RESIDENT', groupId: null, onDuty: 1, certs: [], status: 'ACTIVE', createdAt: '2026-10-01 09:00:00', updatedAt: '2026-10-01 09:00:00' },
  { id: 7, username: 'branch001', password: '123456', realName: '分公司张主管', phone: '13800000007', email: 'branch@example.com', address: '', communityId: 1, building: '', room: '', role: 'BRANCH_ADMIN', groupId: null, onDuty: 1, certs: [], status: 'ACTIVE', createdAt: '2026-10-01 09:00:00', updatedAt: '2026-10-01 09:00:00' },
  { id: 8, username: 'vendor001', password: '123456', realName: '乙方刘经理', phone: '13800000008', email: 'vendor@example.com', address: '', communityId: 2, building: '', room: '', role: 'VENDOR_ADMIN', groupId: null, onDuty: 1, certs: [], status: 'ACTIVE', createdAt: '2026-10-01 09:00:00', updatedAt: '2026-10-01 09:00:00' },
  { id: 9, username: 'vendoreng001', password: '123456', realName: '外委赵师傅', phone: '13800000009', email: 'vendor_eng@example.com', address: '', communityId: 2, building: '', room: '', role: 'VENDOR_ENGINEER', groupId: 3, onDuty: 1, certs: [cert('LIFT_CERT')], status: 'ACTIVE', createdAt: '2026-10-01 09:00:00', updatedAt: '2026-10-01 09:00:00' }
]

const base = {
  images: [],
  finishImages: [],
  finishRemark: null,
  reviewResult: null,
  reviewRemark: null,
  remarks: [],
  escalationCount: 0,
  source: 'USER_REPORT'
}

export const workOrders = [
  {
    ...base,
    id: 1, orderNo: 'WO202610280001', title: '3栋2单元水管漏水', description: '厨房水管接口处漏水严重',
    type: 'WATER', priority: 'HIGH', status: 'PENDING', poolFlag: 1, appointmentTime: null,
    location: '3栋2单元501', communityId: 1, building: '3栋', room: '2单元501', elevatorId: null,
    reporterId: 5, assigneeId: null, assignTime: null, acceptTime: null, finishTime: null,
    closeTime: null, cancelTime: null, rating: 0, ratingComment: null, ratedAt: null,
    createdAt: '2026-10-28 09:30:00', updatedAt: '2026-10-28 09:30:00'
  },
  {
    ...base,
    id: 2, orderNo: 'WO202610280002', title: '5栋1单元停电', description: '整层跳闸停电',
    type: 'ELECTRIC', priority: 'HIGH', status: 'ASSIGNED', poolFlag: 0, appointmentTime: '2026-11-02 10:00:00',
    location: '5栋1单元', communityId: 1, building: '5栋', room: '1单元', elevatorId: null,
    reporterId: 6, assigneeId: 3, assignTime: '2026-10-28 10:00:00', acceptTime: null, finishTime: null,
    closeTime: null, cancelTime: null, rating: 0, ratingComment: null, ratedAt: null,
    createdAt: '2026-10-28 08:10:00', updatedAt: '2026-10-28 10:00:00'
  },
  {
    ...base,
    id: 3, orderNo: 'WO202610270001', title: '2栋空调不制冷', description: '客厅空调开机不制冷',
    type: 'AIR', priority: 'MEDIUM', status: 'PROCESSING', poolFlag: 0, appointmentTime: '2026-10-31 15:00:00',
    location: '2栋1502', communityId: 1, building: '2栋', room: '1502', elevatorId: null,
    reporterId: 5, assigneeId: 3, assignTime: '2026-10-27 14:00:00', acceptTime: '2026-10-27 15:20:00',
    finishTime: null, closeTime: null, cancelTime: null, rating: 0, ratingComment: null, ratedAt: null,
    createdAt: '2026-10-27 13:40:00', updatedAt: '2026-10-27 15:20:00'
  },
  {
    ...base,
    id: 4, orderNo: 'WO202610270002', title: '1栋电梯异响', description: '电梯运行时明显异响',
    type: 'LIFT', priority: 'URGENT', status: 'PROCESSING', poolFlag: 0, appointmentTime: '2026-10-30 09:00:00',
    location: '1栋', communityId: 1, building: '1栋', room: '', elevatorId: 1,
    reporterId: 6, assigneeId: 4, assignTime: '2026-10-27 16:00:00', acceptTime: '2026-10-27 16:30:00',
    finishTime: null, closeTime: null, cancelTime: null, rating: 0, ratingComment: null, ratedAt: null,
    createdAt: '2026-10-27 15:50:00', updatedAt: '2026-10-27 16:30:00'
  },
  {
    ...base,
    id: 5, orderNo: 'WO202610260001', title: '楼道保洁', description: '3栋楼道需要保洁',
    type: 'CLEANING', priority: 'LOW', status: 'COMPLETED', poolFlag: 0, appointmentTime: null,
    location: '3栋楼道', communityId: 1, building: '3栋', room: '楼道', elevatorId: null,
    reporterId: 5, assigneeId: 4, assignTime: '2026-10-26 09:00:00', acceptTime: '2026-10-26 09:10:00',
    finishTime: '2026-10-26 11:00:00', closeTime: null, cancelTime: null,
    rating: 0, ratingComment: null, ratedAt: null,
    finishImages: ['http://localhost:8080/uploads/workorder/20261026/mock-clean.jpg'],
    finishRemark: '楼道已清扫完毕',
    createdAt: '2026-10-26 08:30:00', updatedAt: '2026-10-26 11:00:00'
  },
  {
    ...base,
    id: 6, orderNo: 'WO202610250001', title: '地下车库门禁故障', description: '车库入口门禁无法识别',
    type: 'SECURITY', priority: 'MEDIUM', status: 'CLOSED', poolFlag: 0, appointmentTime: null,
    location: '地下车库入口', communityId: 1, building: '地下车库', room: '入口', elevatorId: null,
    reporterId: 6, assigneeId: 3, assignTime: '2026-10-25 10:00:00', acceptTime: '2026-10-25 10:30:00',
    finishTime: '2026-10-25 12:00:00', closeTime: '2026-10-25 14:00:00', cancelTime: null,
    rating: 4, ratingComment: '处理及时', ratedAt: '2026-10-25 13:50:00',
    finishImages: ['http://localhost:8080/uploads/workorder/20261025/mock-gate.jpg'],
    finishRemark: '门禁主板已更换',
    createdAt: '2026-10-25 09:40:00', updatedAt: '2026-10-25 14:00:00'
  },
  {
    ...base,
    id: 7, orderNo: 'WO202610240001', title: '消防通道堆物清理', description: '消防通道被杂物占用',
    type: 'FIRE', priority: 'HIGH', status: 'CLOSED', poolFlag: 0, appointmentTime: null,
    location: '消防通道', communityId: 1, building: '3栋', room: '消防通道', elevatorId: null,
    reporterId: 5, assigneeId: 4, assignTime: '2026-10-24 09:00:00', acceptTime: '2026-10-24 09:20:00',
    finishTime: '2026-10-24 11:30:00', closeTime: '2026-10-24 13:00:00', cancelTime: null,
    rating: 5, ratingComment: '师傅很负责', ratedAt: '2026-10-24 12:40:00',
    finishImages: ['http://localhost:8080/uploads/workorder/20261024/mock-fire.jpg'],
    finishRemark: '杂物已清理并张贴提示',
    source: 'CS_ASSIGN',
    createdAt: '2026-10-24 08:50:00', updatedAt: '2026-10-24 13:00:00'
  },
  {
    ...base,
    id: 8, orderNo: 'WO202610230001', title: '其他咨询', description: '物业费相关问题咨询',
    type: 'OTHER', priority: 'LOW', status: 'CANCELED', poolFlag: 0, appointmentTime: null,
    location: '', communityId: 1, building: '', room: '', elevatorId: null,
    reporterId: 6, assigneeId: null, assignTime: null, acceptTime: null, finishTime: null,
    closeTime: null, cancelTime: '2026-10-23 11:00:00',
    rating: 0, ratingComment: null, ratedAt: null,
    createdAt: '2026-10-23 10:00:00', updatedAt: '2026-10-23 11:00:00'
  },
  {
    ...base,
    id: 9, orderNo: 'WO202610290001', title: '2栋电梯关人', description: '电梯困人，已联系被困业户',
    type: 'LIFT', priority: 'URGENT', status: 'PENDING', poolFlag: 0, appointmentTime: null,
    location: '2栋', communityId: 1, building: '2栋', room: '', elevatorId: 2,
    reporterId: 5, assigneeId: null, assignTime: null, acceptTime: null, finishTime: null,
    closeTime: null, cancelTime: null, rating: 0, ratingComment: null, ratedAt: null,
    escalationCount: 2, source: 'USER_REPORT',
    createdAt: '2026-10-29 07:40:00', updatedAt: '2026-10-29 11:40:00'
  },
  {
    ...base,
    id: 10, orderNo: 'WO202610290002', title: '5栋门厅照明不亮', description: '门厅灯全灭',
    type: 'ELECTRIC', priority: 'MEDIUM', status: 'PENDING_REVIEW', poolFlag: 0, appointmentTime: '2026-11-03 14:00:00',
    location: '5栋门厅', communityId: 1, building: '5栋', room: '门厅', elevatorId: null,
    reporterId: 6, assigneeId: 3, assignTime: '2026-10-29 09:00:00', acceptTime: '2026-10-29 09:30:00',
    finishTime: '2026-10-29 12:00:00', closeTime: null, cancelTime: null,
    rating: 0, ratingComment: null, ratedAt: null,
    finishImages: ['http://localhost:8080/uploads/workorder/20261029/mock-light.jpg'],
    finishRemark: '已更换镇流器',
    createdAt: '2026-10-29 08:20:00', updatedAt: '2026-10-29 12:00:00'
  }
]

export const logs = {
  1: [
    { id: 1, orderId: 1, operatorId: 5, action: 'CREATE', fromStatus: null, toStatus: 'PENDING', remark: '创建工单', reason: null, createdAt: '2026-10-28 09:30:00' },
    { id: 2, orderId: 1, operatorId: 2, action: 'RETURN', fromStatus: 'ASSIGNED', toStatus: 'PENDING', remark: '', reason: '维修工无电梯证，退回入池', createdAt: '2026-10-28 10:10:00' }
  ],
  2: [
    { id: 3, orderId: 2, operatorId: 6, action: 'CREATE', fromStatus: null, toStatus: 'PENDING', remark: '创建工单', reason: null, createdAt: '2026-10-28 08:10:00' },
    { id: 4, orderId: 2, operatorId: 2, action: 'ASSIGN', fromStatus: 'PENDING', toStatus: 'ASSIGNED', remark: '派单给李师傅', reason: null, createdAt: '2026-10-28 10:00:00' }
  ],
  3: [
    { id: 5, orderId: 3, operatorId: 5, action: 'CREATE', fromStatus: null, toStatus: 'PENDING', remark: '创建工单', reason: null, createdAt: '2026-10-27 13:40:00' },
    { id: 6, orderId: 3, operatorId: 2, action: 'ASSIGN', fromStatus: 'PENDING', toStatus: 'ASSIGNED', remark: '派单给李师傅', reason: null, createdAt: '2026-10-27 14:00:00' },
    { id: 7, orderId: 3, operatorId: 3, action: 'ACCEPT', fromStatus: 'ASSIGNED', toStatus: 'PROCESSING', remark: '接单', reason: null, createdAt: '2026-10-27 15:20:00' }
  ],
  4: [
    { id: 8, orderId: 4, operatorId: 2, action: 'GRAB', fromStatus: 'PENDING', toStatus: 'ASSIGNED', remark: '', reason: '抢单', createdAt: '2026-10-27 16:00:00' },
    { id: 9, orderId: 4, operatorId: 4, action: 'ACCEPT', fromStatus: 'ASSIGNED', toStatus: 'PROCESSING', remark: '接单', reason: null, createdAt: '2026-10-27 16:30:00' },
    { id: 10, orderId: 4, operatorId: 2, action: 'REMARK', fromStatus: 'PROCESSING', toStatus: 'PROCESSING', remark: '已联系业户，预计下午到场', reason: null, createdAt: '2026-10-27 17:10:00' }
  ],
  5: [
    { id: 11, orderId: 5, operatorId: 5, action: 'CREATE', fromStatus: null, toStatus: 'PENDING', remark: '创建工单', reason: null, createdAt: '2026-10-26 08:30:00' },
    { id: 12, orderId: 5, operatorId: 2, action: 'ASSIGN', fromStatus: 'PENDING', toStatus: 'ASSIGNED', remark: '派单给王师傅', reason: null, createdAt: '2026-10-26 09:00:00' },
    { id: 13, orderId: 5, operatorId: 4, action: 'ACCEPT', fromStatus: 'ASSIGNED', toStatus: 'PROCESSING', remark: '接单', reason: null, createdAt: '2026-10-26 09:10:00' },
    { id: 14, orderId: 5, operatorId: 4, action: 'COMPLETE', fromStatus: 'PROCESSING', toStatus: 'COMPLETED', remark: '保洁完成', reason: null, createdAt: '2026-10-26 11:00:00' }
  ],
  6: [
    { id: 15, orderId: 6, operatorId: 6, action: 'CREATE', fromStatus: null, toStatus: 'PENDING', remark: '创建工单', reason: null, createdAt: '2026-10-25 09:40:00' },
    { id: 16, orderId: 6, operatorId: 2, action: 'ASSIGN', fromStatus: 'PENDING', toStatus: 'ASSIGNED', remark: '派单给李师傅', reason: null, createdAt: '2026-10-25 10:00:00' },
    { id: 17, orderId: 6, operatorId: 3, action: 'ACCEPT', fromStatus: 'ASSIGNED', toStatus: 'PROCESSING', remark: '接单', reason: null, createdAt: '2026-10-25 10:30:00' },
    { id: 18, orderId: 6, operatorId: 3, action: 'COMPLETE', fromStatus: 'PROCESSING', toStatus: 'COMPLETED', remark: '门禁已修复', reason: null, createdAt: '2026-10-25 12:00:00' },
    { id: 19, orderId: 6, operatorId: 6, action: 'RATE', fromStatus: 'COMPLETED', toStatus: 'CLOSED', remark: '4星：处理及时', reason: null, createdAt: '2026-10-25 13:50:00' }
  ],
  7: [
    { id: 20, orderId: 7, operatorId: 5, action: 'CREATE', fromStatus: null, toStatus: 'PENDING', remark: '创建工单', reason: null, createdAt: '2026-10-24 08:50:00' },
    { id: 21, orderId: 7, operatorId: 2, action: 'ASSIGN', fromStatus: 'PENDING', toStatus: 'ASSIGNED', remark: '派单给王师傅', reason: null, createdAt: '2026-10-24 09:00:00' },
    { id: 22, orderId: 7, operatorId: 4, action: 'ACCEPT', fromStatus: 'ASSIGNED', toStatus: 'PROCESSING', remark: '接单', reason: null, createdAt: '2026-10-24 09:20:00' },
    { id: 23, orderId: 7, operatorId: 4, action: 'COMPLETE', fromStatus: 'PROCESSING', toStatus: 'COMPLETED', remark: '已清理', reason: null, createdAt: '2026-10-24 11:30:00' },
    { id: 24, orderId: 7, operatorId: 5, action: 'RATE', fromStatus: 'COMPLETED', toStatus: 'CLOSED', remark: '5星：师傅很负责', reason: null, createdAt: '2026-10-24 12:40:00' }
  ],
  8: [
    { id: 25, orderId: 8, operatorId: 6, action: 'CREATE', fromStatus: null, toStatus: 'PENDING', remark: '创建工单', reason: null, createdAt: '2026-10-23 10:00:00' },
    { id: 26, orderId: 8, operatorId: 6, action: 'CANCEL', fromStatus: 'PENDING', toStatus: 'CANCELED', remark: '自行取消', reason: '问题已自行解决', createdAt: '2026-10-23 11:00:00' }
  ],
  9: [
    { id: 27, orderId: 9, operatorId: 5, action: 'CREATE', fromStatus: null, toStatus: 'PENDING', remark: '紧急报修', reason: null, createdAt: '2026-10-29 07:40:00' },
    { id: 28, orderId: 9, operatorId: 1, action: 'ESCALATE', fromStatus: 'PENDING', toStatus: 'PENDING', remark: '池中 4h 无人接，L0 升级', reason: '池超时', createdAt: '2026-10-29 11:40:00' }
  ],
  10: [
    { id: 29, orderId: 10, operatorId: 6, action: 'CREATE', fromStatus: null, toStatus: 'PENDING', remark: '创建工单', reason: null, createdAt: '2026-10-29 08:20:00' },
    { id: 30, orderId: 10, operatorId: 2, action: 'ASSIGN', fromStatus: 'PENDING', toStatus: 'ASSIGNED', remark: '派单给李师傅', reason: null, createdAt: '2026-10-29 09:00:00' },
    { id: 31, orderId: 10, operatorId: 3, action: 'ACCEPT', fromStatus: 'ASSIGNED', toStatus: 'PROCESSING', remark: '接单', reason: null, createdAt: '2026-10-29 09:30:00' },
    { id: 32, orderId: 10, operatorId: 3, action: 'COMPLETE', fromStatus: 'PROCESSING', toStatus: 'COMPLETED', remark: '已更换镇流器', reason: null, createdAt: '2026-10-29 12:00:00' },
    { id: 33, orderId: 10, operatorId: 2, action: 'REVIEW_RESULT', fromStatus: 'COMPLETED', toStatus: 'PENDING_REVIEW', remark: '转待回访', reason: null, createdAt: '2026-10-29 12:05:00' }
  ]
}

export const notifications = [
  { id: 1, userId: 3, title: '新工单待接单', content: '工单 WO202610280002 已派单给您，请及时处理', type: 'ASSIGNED', isRead: false, orderId: 2, createdAt: '2026-10-28 10:00:00' },
  { id: 2, userId: 5, title: '工单已完工', content: '工单 WO202610260001 已完工，请评价', type: 'COMPLETED', isRead: false, orderId: 5, createdAt: '2026-10-26 11:00:00' },
  { id: 3, userId: 6, title: '工单已派单', content: '工单 WO202610250001 已派单给李师傅', type: 'ASSIGNED', isRead: true, orderId: 6, createdAt: '2026-10-25 10:00:00' },
  { id: 4, userId: 3, title: '抢单提醒', content: '工单 WO202610280001 已进入待抢单池', type: 'ANNOUNCEMENT', isRead: false, orderId: 1, createdAt: '2026-10-28 10:10:00' }
]

// 已发送的广播记录
export const broadcasts = [
  { id: 1, senderId: 2, title: '11 月电梯年检安排', content: '各楼栋电梯年检将于 11 月 10 日进行，请提前告知业主', targetScope: 'ALL', targetRole: null, branchId: null, type: 'ANNOUNCEMENT', delivered: 9, createdAt: '2026-10-28 16:00:00' }
]

let idSeq = 1000
let orderSeq = 10

export function nextId() {
  idSeq += 1
  return idSeq
}

export function genOrderNo() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  const ymd = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`
  orderSeq += 1
  return `WO${ymd}-${String(orderSeq).padStart(4, '0')}`
}

export function now() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

export default []
