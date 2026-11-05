import request from '@/utils/request'

// ============ 点位模板 ============
export function getPointTemplates(params) {
  return request.get('/inspection/point-templates', { params })
}

export function createPointTemplate(data) {
  return request.post('/inspection/point-templates', data)
}

export function updatePointTemplate(id, data) {
  return request.put(`/inspection/point-templates/${id}`, data)
}

export function deletePointTemplate(id) {
  return request.delete(`/inspection/point-templates/${id}`)
}

// ============ 巡检计划 ============
export function getInspectionPlans(params) {
  return request.get('/inspection/plans', { params })
}

export function createInspectionPlan(data) {
  return request.post('/inspection/plans', data)
}

export function updateInspectionPlan(id, data) {
  return request.put(`/inspection/plans/${id}`, data)
}

export function generateInspectionTasks(id, data) {
  return request.post(`/inspection/plans/${id}/generate`, data)
}

// ============ 巡检任务 ============
export function getInspectionTasks(params) {
  return request.get('/inspection/tasks', { params })
}

export function getInspectionTask(id) {
  return request.get(`/inspection/tasks/${id}`)
}

export function getInspectionPoints(id) {
  return request.get(`/inspection/tasks/${id}/points`)
}

export function acceptInspectionTask(id) {
  return request.post(`/inspection/tasks/${id}/accept`)
}

export function submitInspectionTask(id, data) {
  return request.post(`/inspection/tasks/${id}/submit`, data)
}

export function rejectInspectionTask(id, data) {
  return request.post(`/inspection/tasks/${id}/reject`, data)
}
