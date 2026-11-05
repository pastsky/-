import request from '@/utils/request'

export function getNotificationList(params) {
  return request.get('/notifications', { params })
}

export function markNotificationRead(id) {
  return request.put(`/notifications/${id}/read`)
}

export function markAllNotificationsRead() {
  return request.put('/notifications/read-all')
}

// 广播：targetScope = ALL / ROLE / BRANCH
export function broadcastNotification(data) {
  return request.post('/notifications/broadcast', data)
}

// 后端通知类型枚举无 BROADCAST（传 BROADCAST 会 400），广播历史按 ANNOUNCEMENT 查询；
// 结果再在前端按广播类类型过滤（见 BroadcastCenter）
export function getBroadcastList(params) {
  return request.get('/notifications', {
    params: { page: 1, pageSize: 50, type: 'ANNOUNCEMENT', ...params }
  })
}
