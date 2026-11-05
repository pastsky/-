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

// 后端仅有 POST /notifications/broadcast；历史记录走通知列表按 type=BROADCAST 过滤
export function getBroadcastList(params) {
  return request.get('/notifications', { params: { page: 1, pageSize: 50, type: 'BROADCAST', ...params } })
}
