import request from '@/utils/request'

export function getTeamList(params) {
  return request.get('/teams', { params })
}

export function getTeamDetail(id) {
  return request.get(`/teams/${id}`)
}

export function createTeam(data) {
  return request.post('/teams', data)
}

export function updateTeam(id, data) {
  return request.put(`/teams/${id}`, data)
}

export function deleteTeam(id) {
  return request.delete(`/teams/${id}`)
}

export function getTeamMembers(id, params) {
  return request.get(`/teams/${id}/members`, { params })
}

// 全量覆盖成员，仅 ENGINEER / VENDOR_ENGINEER 且 ACTIVE
export function updateTeamMembers(id, memberIds) {
  return request.put(`/teams/${id}/members`, { memberIds })
}

export function getAuditLogs(params) {
  return request.get('/audit-logs', { params })
}
