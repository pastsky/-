import request from '@/utils/request'

// 后端契约：小区 = 分支 branch（GET /api/branches），无 /api/communities
export async function getCommunities(params) {
  const data = await request.get('/branches', { params })
  const list = Array.isArray(data) ? data : data?.list || []
  return list.map((b) => ({ ...b, name: b.name || b.branchName || b.branch_name || `小区${b.id}` }))
}

export function getElevators(params) {
  return request.get('/elevators', { params })
}

export function getDutySchedules(params) {
  return request.get('/duty-schedules', { params })
}
