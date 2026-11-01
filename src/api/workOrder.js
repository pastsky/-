import request from '@/utils/request'

// ============ 存量接口（契约不变） ============
export function createWorkOrder(data) {
  return request.post('/work-orders', data)
}

export function getWorkOrderList(params) {
  return request.get('/work-orders', { params })
}

export function getWorkOrderDetail(id) {
  return request.get(`/work-orders/${id}`)
}

export function updateWorkOrder(id, data) {
  return request.put(`/work-orders/${id}`, data)
}

export function acceptWorkOrder(id, data) {
  return request.post(`/work-orders/${id}/accept`, data)
}

export function completeWorkOrder(id, data) {
  return request.post(`/work-orders/${id}/complete`, data)
}

export function closeWorkOrder(id, data) {
  return request.post(`/work-orders/${id}/close`, data)
}

export function cancelWorkOrder(id, data) {
  return request.post(`/work-orders/${id}/cancel`, data)
}

export function returnWorkOrder(id, data) {
  return request.post(`/work-orders/${id}/return`, data)
}

export function rateWorkOrder(id, data) {
  return request.post(`/work-orders/${id}/rate`, data)
}

export function getWorkOrderLogs(id) {
  return request.get(`/work-orders/${id}/logs`)
}

// ============ 增量接口 ============
// 派单：带持证/值班/在途/预约冲突校验；poolFlag=1 表示推入任务池
export function assignWorkOrder(id, data) {
  return request.post(`/work-orders/${id}/assign`, data)
}

export function getWorkOrderPool(params) {
  return request.get('/work-orders/pool', { params })
}

export function grabWorkOrder(id) {
  return request.post(`/work-orders/${id}/grab`)
}

export function pushToPool(id, data) {
  return request.post(`/work-orders/${id}/reassign-to-pool`, data)
}

export function transferWorkOrder(id, data) {
  return request.post(`/work-orders/${id}/transfer`, data)
}

export function rejectWorkOrder(id, data) {
  return request.post(`/work-orders/${id}/reject`, data)
}

export function reviewWorkOrder(id, data) {
  return request.post(`/work-orders/${id}/review`, data)
}

export function auditAppointment(id, data) {
  return request.post(`/work-orders/${id}/audit-appointment`, data)
}

export function getRepairerCalendar(params) {
  return request.get('/work-orders/calendar', { params })
}

export function addWorkOrderRemark(id, data) {
  return request.post(`/work-orders/${id}/remarks`, data)
}

export function batchWorkOrders(data) {
  return request.post('/work-orders/batch', data)
}
