import request from '@/utils/request'
import { cachedRequest, clearDictCache, unwrapList, unwrapPage } from '@/utils/unwrap'

// ============ 点位模板（仅 {list}，≤200 不分页） ============
export async function getPointTemplates(params) {
  const data = params
    ? await request.get('/inspection/point-templates', { params })
    : await cachedRequest('inspection-templates', () => request.get('/inspection/point-templates'))
  return unwrapList(data)
}

// 模板详情（含点位）
export function getPointTemplateDetail(id) {
  return request.get(`/inspection/point-templates/${id}`)
}

export async function createPointTemplate(data) {
  try {
    return await request.post('/inspection/point-templates', data)
  } finally {
    clearDictCache('inspection-templates')
  }
}

export async function updatePointTemplate(id, data) {
  try {
    return await request.put(`/inspection/point-templates/${id}`, data)
  } finally {
    clearDictCache('inspection-templates')
  }
}

export async function deletePointTemplate(id) {
  try {
    return await request.delete(`/inspection/point-templates/${id}`)
  } finally {
    clearDictCache('inspection-templates')
  }
}

// ============ 巡检计划（分页） ============
export async function getInspectionPlans(params) {
  return unwrapPage(await request.get('/inspection/plans', { params }))
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

// ============ 巡检任务（分页） ============
export async function getInspectionTasks(params) {
  return unwrapPage(await request.get('/inspection/tasks', { params }))
}

export function getInspectionTask(id) {
  return request.get(`/inspection/tasks/${id}`)
}

// 仅 {list}
export async function getInspectionPoints(id) {
  return unwrapList(await request.get(`/inspection/tasks/${id}/points`))
}

// 单点结果提交（BOP97）
export function updateInspectionPoint(taskId, pointId, data) {
  return request.put(`/inspection/tasks/${taskId}/points/${pointId}`, data)
}

// 巡检总览（BOP101）：RES 按小区，管理端可传 branchId
export async function getInspectionOverview(params) {
  const data = await request.get('/inspection/overview', { params })
  return { ...data, list: Array.isArray(data?.list) ? data.list : [] }
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
