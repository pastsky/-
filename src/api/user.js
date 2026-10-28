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

export function deleteUser(id) {
  return request.delete(`/users/${id}`)
}

export function resetPassword(id, data) {
  return request.put(`/users/${id}/password`, data)
}

export function getEngineers() {
  return request.get('/users/engineers')
}
