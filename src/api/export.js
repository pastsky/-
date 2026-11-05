import request from '@/utils/request'

// 创建异步导出任务
export function createExportJob(data) {
  return request.post('/exports', data)
}

export function getExportList(params) {
  return request.get('/exports', { params })
}

export function getExportDetail(id) {
  return request.get(`/exports/${id}`)
}

// 文件流下载（不套统一响应结构）
export function downloadExport(id) {
  return request.get(`/exports/${id}/download`, { responseType: 'blob' })
}

export function getTeamPerformance(params) {
  return request.get('/stats/team-performance', { params })
}
