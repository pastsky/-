import request from '@/utils/request'
import { unwrapPage } from '@/utils/unwrap'

// 分页：{list,total,page,pageSize}
export async function getNotificationList(params) {
  return unwrapPage(await request.get('/notifications', { params }))
}

// {unreadCount}
export function getUnreadCount() {
  return request.get('/notifications/unread-count')
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
export async function getBroadcastList(params) {
  return unwrapPage(
    await request.get('/notifications', {
      params: { page: 1, pageSize: 50, type: 'ANNOUNCEMENT', ...params }
    })
  )
}
