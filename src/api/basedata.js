import request from '@/utils/request'
import { cachedRequest, unwrapList, unwrapPage } from '@/utils/unwrap'

// 后端契约：小区 = 分支 branch（GET /api/branches），返回 {list:[...]}
export async function getCommunities(params) {
  const data = params
    ? await request.get('/branches', { params })
    : await cachedRequest('branches', () => request.get('/branches'))
  return unwrapList(data).map((b) => ({
    ...b,
    name: b.name || b.branchName || b.branch_name || `小区${b.id}`
  }))
}

// 分页：{list,total,page,pageSize}
export async function getElevators(params) {
  return unwrapPage(await request.get('/elevators', { params }))
}

// 仅 {list}，且契约要求 startDate/endDate 必填、区间 ≤31 天
export async function getDutySchedules(params) {
  return unwrapList(await request.get('/duty-schedules', { params }))
}
