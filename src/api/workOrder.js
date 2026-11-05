import request from '@/utils/request'

// ============ 工单：存量动作 ============
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

export function rateWorkOrder(id, data) {
  return request.post(`/work-orders/${id}/rate`, data)
}

export function getWorkOrderLogs(id) {
  return request.get(`/work-orders/${id}/logs`)
}

// ============ 工单：增量动作（BOP42~51 / R1） ============
// 派单
export function assignWorkOrder(id, data) {
  return request.post(`/work-orders/${id}/assign`, data)
}

// 抢单：PENDING + pool_flag=1 -> PROCESSING（后端已实现口径）
export function grabWorkOrder(id, data) {
  return request.post(`/work-orders/${id}/grab`, data)
}

// 推送入池（原 reassign-to-pool）
export function toPool(id, data) {
  return request.post(`/work-orders/${id}/to-pool`, data)
}

// 维修工退回：仅 remark，回到 PENDING，重派走 /assign
export function returnWorkOrder(id, data) {
  return request.post(`/work-orders/${id}/return`, data)
}

// 转交：targetAssigneeId + reason；ASSIGNED/PROCESSING -> ASSIGNED
export function transferWorkOrder(id, data) {
  return request.post(`/work-orders/${id}/transfer`, data)
}

// 完工驳回 / 回访
export function rejectWorkOrder(id, data) {
  return request.post(`/work-orders/${id}/reject`, data)
}

export function reviewWorkOrder(id, data) {
  return request.post(`/work-orders/${id}/review`, data)
}

// 预约审核
export function auditAppointment(id, data) {
  return request.post(`/work-orders/${id}/audit-appointment`, data)
}

// 内部备注（原 remarks）
export function addInternalNote(id, data) {
  return request.post(`/work-orders/${id}/internal-notes`, data)
}

// 兜底改单：仅 3 对状态
export function forceStatus(id, data) {
  return request.post(`/work-orders/${id}/force-status`, data)
}

// 工单池
export function getWorkOrderPool(params) {
  return request.get('/work-orders/pool', { params })
}

// 全局搜索（客服工作台）
export function globalSearch(params) {
  return request.get('/work-orders/global-search', { params })
}

// 批量操作：路径区分动作
export function batchAssign(data) {
  return request.post('/work-orders/batch-assign', data)
}

export function batchToPool(data) {
  return request.post('/work-orders/batch-to-pool', data)
}

export function batchCancel(data) {
  return request.post('/work-orders/batch-cancel', data)
}

// 维修日历：按工程师维度
export function getEngineerCalendar(engineerId, params) {
  return request.get(`/engineers/${engineerId}/calendar`, { params })
}

// 预约频控（BOP-R2/R3）与值班可用性
export function getAppointmentChangeLimit(params) {
  return request.get('/appointments/change-limit', { params })
}

export function releaseAppointmentChangeLimit(data) {
  return request.post('/appointments/change-limit/release', data)
}

export function getDutyAvailability(params) {
  return request.get('/appointments/duty-availability', { params })
}
