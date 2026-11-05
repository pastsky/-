import request from '@/utils/request'
import { cachedRequest, clearDictCache, unwrapList, unwrapPage } from '@/utils/unwrap'

// 仅 {list}（≤200，不分页）
export async function getTeamList(params) {
  const data = params
    ? await request.get('/teams', { params })
    : await cachedRequest('teams', () => request.get('/teams'))
  return unwrapList(data)
}

export function getTeamDetail(id) {
  return request.get(`/teams/${id}`)
}

export async function createTeam(data) {
  try {
    return await request.post('/teams', data)
  } finally {
    clearDictCache('teams')
  }
}

export async function updateTeam(id, data) {
  try {
    return await request.put(`/teams/${id}`, data)
  } finally {
    clearDictCache('teams')
  }
}

export async function deleteTeam(id) {
  try {
    return await request.delete(`/teams/${id}`)
  } finally {
    clearDictCache('teams')
  }
}

// 仅 {list}（≤200，不分页）
export async function getTeamMembers(id, params) {
  return unwrapList(await request.get(`/teams/${id}/members`, { params }))
}

// 全量覆盖成员，仅 ENGINEER / VENDOR_ENGINEER 且 ACTIVE
export function updateTeamMembers(id, memberIds) {
  return request.put(`/teams/${id}/members`, { memberIds })
}

// 分页；排序白名单 created_at
export async function getAuditLogs(params) {
  return unwrapPage(await request.get('/audit-logs', { params }))
}
