// 内存态 mock 数据（模块单例，供所有 mock 接口共享读写）

export const users = [
  { id: 1, username: 'admin', password: '123456', realName: '管理员', phone: '13800000001', email: 'admin@example.com', address: '', role: 'ADMIN', status: 'ACTIVE', createdAt: '2026-10-01 09:00:00', updatedAt: '2026-10-01 09:00:00' },
  { id: 2, username: 'cs001', password: '123456', realName: '客服小王', phone: '13800000002', email: 'cs@example.com', address: '', role: 'CUSTOMER_SERVICE', status: 'ACTIVE', createdAt: '2026-10-01 09:00:00', updatedAt: '2026-10-01 09:00:00' },
  { id: 3, username: 'engineer001', password: '123456', realName: '李师傅', phone: '13800000003', email: 'li@example.com', address: '', role: 'ENGINEER', status: 'ACTIVE', createdAt: '2026-10-01 09:00:00', updatedAt: '2026-10-01 09:00:00' },
  { id: 4, username: 'engineer002', password: '123456', realName: '王师傅', phone: '13800000004', email: 'wang@example.com', address: '', role: 'ENGINEER', status: 'ACTIVE', createdAt: '2026-10-01 09:00:00', updatedAt: '2026-10-01 09:00:00' },
  { id: 5, username: 'resident001', password: '123456', realName: '张三', phone: '13800000005', email: 'zhang@example.com', address: '3栋2单元501', role: 'RESIDENT', status: 'ACTIVE', createdAt: '2026-10-01 09:00:00', updatedAt: '2026-10-01 09:00:00' },
  { id: 6, username: 'resident002', password: '123456', realName: '李四', phone: '13800000006', email: 'li2@example.com', address: '5栋1单元302', role: 'RESIDENT', status: 'ACTIVE', createdAt: '2026-10-01 09:00:00', updatedAt: '2026-10-01 09:00:00' }
]

export const workOrders = [
  { id: 1, orderNo: 'WO202610280001', title: '3栋2单元水管漏水', description: '厨房水管接口处漏水严重', type: 'WATER', priority: 'HIGH', status: 'PENDING', location: '3栋2单元501', images: [], reporterId: 5, assigneeId: null, assignTime: null, acceptTime: null, finishTime: null, closeTime: null, cancelTime: null, rating: 0, ratingComment: null, ratedAt: null, createdAt: '2026-10-28 09:30:00', updatedAt: '2026-10-28 09:30:00' },
  { id: 2, orderNo: 'WO202610280002', title: '5栋1单元停电', description: '整层跳闸停电', type: 'ELECTRIC', priority: 'HIGH', status: 'ASSIGNED', location: '5栋1单元', images: [], reporterId: 6, assigneeId: 3, assignTime: '2026-10-28 10:00:00', acceptTime: null, finishTime: null, closeTime: null, cancelTime: null, rating: 0, ratingComment: null, ratedAt: null, createdAt: '2026-10-28 08:10:00', updatedAt: '2026-10-28 10:00:00' },
  { id: 3, orderNo: 'WO202610270001', title: '2栋空调不制冷', description: '客厅空调开机不制冷', type: 'AIR', priority: 'MEDIUM', status: 'PROCESSING', location: '2栋1502', images: [], reporterId: 5, assigneeId: 3, assignTime: '2026-10-27 14:00:00', acceptTime: '2026-10-27 15:20:00', finishTime: null, closeTime: null, cancelTime: null, rating: 0, ratingComment: null, ratedAt: null, createdAt: '2026-10-27 13:40:00', updatedAt: '2026-10-27 15:20:00' },
  { id: 4, orderNo: 'WO202610270002', title: '1栋电梯异响', description: '电梯运行时明显异响', type: 'LIFT', priority: 'URGENT', status: 'PROCESSING', location: '1栋', images: [], reporterId: 6, assigneeId: 4, assignTime: '2026-10-27 16:00:00', acceptTime: '2026-10-27 16:30:00', finishTime: null, closeTime: null, cancelTime: null, rating: 0, ratingComment: null, ratedAt: null, createdAt: '2026-10-27 15:50:00', updatedAt: '2026-10-27 16:30:00' },
  { id: 5, orderNo: 'WO202610260001', title: '楼道保洁', description: '3栋楼道需要保洁', type: 'CLEANING', priority: 'LOW', status: 'COMPLETED', location: '3栋楼道', images: [], reporterId: 5, assigneeId: 4, assignTime: '2026-10-26 09:00:00', acceptTime: '2026-10-26 09:10:00', finishTime: '2026-10-26 11:00:00', closeTime: null, cancelTime: null, rating: 0, ratingComment: null, ratedAt: null, createdAt: '2026-10-26 08:30:00', updatedAt: '2026-10-26 11:00:00' },
  { id: 6, orderNo: 'WO202610250001', title: '地下车库门禁故障', description: '车库入口门禁无法识别', type: 'SECURITY', priority: 'MEDIUM', status: 'CLOSED', location: '地下车库入口', images: [], reporterId: 6, assigneeId: 3, assignTime: '2026-10-25 10:00:00', acceptTime: '2026-10-25 10:30:00', finishTime: '2026-10-25 12:00:00', closeTime: '2026-10-25 14:00:00', cancelTime: null, rating: 4, ratingComment: '处理及时', ratedAt: '2026-10-25 13:50:00', createdAt: '2026-10-25 09:40:00', updatedAt: '2026-10-25 14:00:00' },
  { id: 7, orderNo: 'WO202610240001', title: '消防通道堆物清理', description: '消防通道被杂物占用', type: 'FIRE', priority: 'HIGH', status: 'CLOSED', location: '消防通道', images: [], reporterId: 5, assigneeId: 4, assignTime: '2026-10-24 09:00:00', acceptTime: '2026-10-24 09:20:00', finishTime: '2026-10-24 11:30:00', closeTime: '2026-10-24 13:00:00', cancelTime: null, rating: 5, ratingComment: '师傅很负责', ratedAt: '2026-10-24 12:40:00', createdAt: '2026-10-24 08:50:00', updatedAt: '2026-10-24 13:00:00' },
  { id: 8, orderNo: 'WO202610230001', title: '其他咨询', description: '物业费相关问题咨询', type: 'OTHER', priority: 'LOW', status: 'CANCELED', location: '', images: [], reporterId: 6, assigneeId: null, assignTime: null, acceptTime: null, finishTime: null, closeTime: null, cancelTime: '2026-10-23 11:00:00', rating: 0, ratingComment: null, ratedAt: null, createdAt: '2026-10-23 10:00:00', updatedAt: '2026-10-23 11:00:00' }
]

export const logs = {
  1: [
    { id: 1, orderId: 1, operatorId: 5, action: 'CREATE', fromStatus: null, toStatus: 'PENDING', remark: '创建工单', createdAt: '2026-10-28 09:30:00' }
  ],
  2: [
    { id: 2, orderId: 2, operatorId: 6, action: 'CREATE', fromStatus: null, toStatus: 'PENDING', remark: '创建工单', createdAt: '2026-10-28 08:10:00' },
    { id: 3, orderId: 2, operatorId: 2, action: 'ASSIGN', fromStatus: 'PENDING', toStatus: 'ASSIGNED', remark: '派单给李师傅', createdAt: '2026-10-28 10:00:00' }
  ],
  3: [
    { id: 4, orderId: 3, operatorId: 5, action: 'CREATE', fromStatus: null, toStatus: 'PENDING', remark: '创建工单', createdAt: '2026-10-27 13:40:00' },
    { id: 5, orderId: 3, operatorId: 2, action: 'ASSIGN', fromStatus: 'PENDING', toStatus: 'ASSIGNED', remark: '派单给李师傅', createdAt: '2026-10-27 14:00:00' },
    { id: 6, orderId: 3, operatorId: 3, action: 'ACCEPT', fromStatus: 'ASSIGNED', toStatus: 'PROCESSING', remark: '接单', createdAt: '2026-10-27 15:20:00' }
  ],
  4: [
    { id: 7, orderId: 4, operatorId: 6, action: 'CREATE', fromStatus: null, toStatus: 'PENDING', remark: '创建工单', createdAt: '2026-10-27 15:50:00' },
    { id: 8, orderId: 4, operatorId: 2, action: 'ASSIGN', fromStatus: 'PENDING', toStatus: 'ASSIGNED', remark: '派单给王师傅', createdAt: '2026-10-27 16:00:00' },
    { id: 9, orderId: 4, operatorId: 4, action: 'ACCEPT', fromStatus: 'ASSIGNED', toStatus: 'PROCESSING', remark: '接单', createdAt: '2026-10-27 16:30:00' }
  ],
  5: [
    { id: 10, orderId: 5, operatorId: 5, action: 'CREATE', fromStatus: null, toStatus: 'PENDING', remark: '创建工单', createdAt: '2026-10-26 08:30:00' },
    { id: 11, orderId: 5, operatorId: 2, action: 'ASSIGN', fromStatus: 'PENDING', toStatus: 'ASSIGNED', remark: '派单给王师傅', createdAt: '2026-10-26 09:00:00' },
    { id: 12, orderId: 5, operatorId: 4, action: 'ACCEPT', fromStatus: 'ASSIGNED', toStatus: 'PROCESSING', remark: '接单', createdAt: '2026-10-26 09:10:00' },
    { id: 13, orderId: 5, operatorId: 4, action: 'COMPLETE', fromStatus: 'PROCESSING', toStatus: 'COMPLETED', remark: '保洁完成', createdAt: '2026-10-26 11:00:00' }
  ],
  6: [
    { id: 14, orderId: 6, operatorId: 6, action: 'CREATE', fromStatus: null, toStatus: 'PENDING', remark: '创建工单', createdAt: '2026-10-25 09:40:00' },
    { id: 15, orderId: 6, operatorId: 2, action: 'ASSIGN', fromStatus: 'PENDING', toStatus: 'ASSIGNED', remark: '派单给李师傅', createdAt: '2026-10-25 10:00:00' },
    { id: 16, orderId: 6, operatorId: 3, action: 'ACCEPT', fromStatus: 'ASSIGNED', toStatus: 'PROCESSING', remark: '接单', createdAt: '2026-10-25 10:30:00' },
    { id: 17, orderId: 6, operatorId: 3, action: 'COMPLETE', fromStatus: 'PROCESSING', toStatus: 'COMPLETED', remark: '门禁已修复', createdAt: '2026-10-25 12:00:00' },
    { id: 18, orderId: 6, operatorId: 6, action: 'RATE', fromStatus: 'COMPLETED', toStatus: 'CLOSED', remark: '4星：处理及时', createdAt: '2026-10-25 13:50:00' }
  ],
  7: [
    { id: 20, orderId: 7, operatorId: 5, action: 'CREATE', fromStatus: null, toStatus: 'PENDING', remark: '创建工单', createdAt: '2026-10-24 08:50:00' },
    { id: 21, orderId: 7, operatorId: 2, action: 'ASSIGN', fromStatus: 'PENDING', toStatus: 'ASSIGNED', remark: '派单给王师傅', createdAt: '2026-10-24 09:00:00' },
    { id: 22, orderId: 7, operatorId: 4, action: 'ACCEPT', fromStatus: 'ASSIGNED', toStatus: 'PROCESSING', remark: '接单', createdAt: '2026-10-24 09:20:00' },
    { id: 23, orderId: 7, operatorId: 4, action: 'COMPLETE', fromStatus: 'PROCESSING', toStatus: 'COMPLETED', remark: '已清理', createdAt: '2026-10-24 11:30:00' },
    { id: 24, orderId: 7, operatorId: 5, action: 'RATE', fromStatus: 'COMPLETED', toStatus: 'CLOSED', remark: '5星：师傅很负责', createdAt: '2026-10-24 12:40:00' }
  ],
  8: [
    { id: 26, orderId: 8, operatorId: 6, action: 'CREATE', fromStatus: null, toStatus: 'PENDING', remark: '创建工单', createdAt: '2026-10-23 10:00:00' },
    { id: 27, orderId: 8, operatorId: 6, action: 'CANCEL', fromStatus: 'PENDING', toStatus: 'CANCELED', remark: '自行取消', createdAt: '2026-10-23 11:00:00' }
  ]
}

export const notifications = [
  { id: 1, userId: 3, title: '新工单待接单', content: '工单 WO202610280002 已派单给您，请及时处理', type: 'ASSIGNED', isRead: false, orderId: 2, createdAt: '2026-10-28 10:00:00' },
  { id: 2, userId: 5, title: '工单已完工', content: '工单 WO202610260001 已完工，请评价', type: 'COMPLETED', isRead: false, orderId: 5, createdAt: '2026-10-26 11:00:00' },
  { id: 3, userId: 6, title: '工单已派单', content: '工单 WO202610250001 已派单给李师傅', type: 'ASSIGNED', isRead: true, orderId: 6, createdAt: '2026-10-25 10:00:00' }
]

let idSeq = 1000
let orderSeq = 8

export function nextId() {
  idSeq += 1
  return idSeq
}

export function genOrderNo() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  const ymd = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`
  orderSeq += 1
  return `WO${ymd}${String(orderSeq).padStart(4, '0')}`
}

export function now() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

export default []
