import request from '@/utils/request'

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

export function assignWorkOrder(id, data) {
  return request.post(`/work-orders/${id}/assign`, data)
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
