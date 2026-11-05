import request from '@/utils/request'

export function getUserList(params) {
  return request.get('/users', { params })
}

export function createUser(data) {
  return request.post('/users', data)
}

export function updateUser(id, data) {
  return request.put(`/users/${id}`, data)
}

// 逻辑停用（保留历史，可恢复）
export function disableUser(id) {
  return request.delete(`/users/${id}`)
}

export function enableUser(id) {
  return request.put(`/users/${id}/enable`)
}

export function resetPassword(id, data) {
  return request.put(`/users/${id}/password`, data)
}

// 指派候选：带班组、持证、在途、今日单量、超时率
export function getEngineers(params) {
  return request.get('/users/engineers', { params })
}

// 后端契约：用户组 = 班组 team（GET /api/teams，返回数组），无 /api/users/groups
export async function getGroups(params) {
  const data = await request.get('/teams', { params })
  const list = Array.isArray(data) ? data : data?.list || []
  return list.map((t) => ({ ...t, name: t.name || t.teamName || t.team_name || `班组${t.id}` }))
}
