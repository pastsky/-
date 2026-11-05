import request from '@/utils/request'
import { unwrapPage } from '@/utils/unwrap'

// 创建异步导出任务
export function createExportJob(data) {
  return request.post('/exports', data)
}

// 分页：{list,total,page,pageSize}
export async function getExportList(params) {
  return unwrapPage(await request.get('/exports', { params }))
}

export function getExportDetail(id) {
  return request.get(`/exports/${id}`)
}

// 文件流：返回 { blob, filename }，文件名取自 Content-Disposition
export function downloadExport(id) {
  return request.get(`/exports/${id}/download`, { responseType: 'blob' })
}

// {list, ungrouped}
export function getTeamPerformance(params) {
  return request.get('/stats/team-performance', { params })
}
