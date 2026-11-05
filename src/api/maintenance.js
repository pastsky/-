import request from '@/utils/request'

// ============ 维保计划 ============
export function getMaintenancePlans(params) {
  return request.get('/maintenance/plans', { params })
}

export function createMaintenancePlan(data) {
  return request.post('/maintenance/plans', data)
}

export function updateMaintenancePlan(id, data) {
  return request.put(`/maintenance/plans/${id}`, data)
}

// destination = ASSIGN | POOL
export function generateMaintenanceTasks(id, data) {
  return request.post(`/maintenance/plans/${id}/generate`, data)
}

// ============ 维保任务 ============
export function getMaintenanceTasks(params) {
  return request.get('/maintenance/tasks', { params })
}

export function getMaintenanceTask(id) {
  return request.get(`/maintenance/tasks/${id}`)
}

export function getMaintenanceTimeline(id) {
  return request.get(`/maintenance/tasks/${id}/timeline`)
}

export function assignMaintenanceTask(id, data) {
  return request.post(`/maintenance/tasks/${id}/assign`, data)
}

export function toPoolMaintenanceTask(id, data) {
  return request.post(`/maintenance/tasks/${id}/to-pool`, data)
}

export function acceptMaintenanceTask(id) {
  return request.post(`/maintenance/tasks/${id}/accept`)
}

export function completeMaintenanceTask(id, data) {
  return request.post(`/maintenance/tasks/${id}/complete`, data)
}

export function rejectMaintenanceTask(id, data) {
  return request.post(`/maintenance/tasks/${id}/reject`, data)
}

export function confirmMaintenanceTask(id, data) {
  return request.post(`/maintenance/tasks/${id}/confirm`, data)
}

export function transferMaintenanceTask(id, data) {
  return request.post(`/maintenance/tasks/${id}/transfer`, data)
}

export function cancelMaintenanceTask(id, data) {
  return request.post(`/maintenance/tasks/${id}/cancel`, data)
}
