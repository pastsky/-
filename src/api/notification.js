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

export function getBroadcastList() {
  return request.get('/notifications/broadcast')
}
