import request from '@/utils/request'

export function getStatsOverview() {
  return request.get('/stats/overview')
}

export function getStatsTrend(params) {
  return request.get('/stats/trend', { params })
}

export function getTypeDistribution(params) {
  return request.get('/stats/type-distribution', { params })
}

export function getEngineerPerformance(params) {
  return request.get('/stats/engineer-performance', { params })
}

export function exportStats(params) {
  return request.get('/stats/export', { params })
}
