import request from '@/utils/request'
import { unwrapArray } from '@/utils/unwrap'

export function getStatsOverview() {
  return request.get('/stats/overview')
}

export function getStatsTrend(params) {
  return request.get('/stats/trend', { params })
}

// 裸数组接口
export function getTypeDistribution(params) {
  return request.get('/stats/type-distribution', { params }).then(unwrapArray)
}

// 裸数组接口
export function getEngineerPerformance(params) {
  return request.get('/stats/engineer-performance', { params }).then(unwrapArray)
}

// 统计报表导出（文件流）：返回 { blob, filename }
export function exportStats(params) {
  return request.get('/stats/export', { params, responseType: 'blob' })
}
