import request from '@/utils/request'

export function getElevatorList(params) {
  return request.get('/elevators', { params })
}

export function getElevatorDetail(id) {
  return request.get(`/elevators/${id}`)
}

export function createElevator(data) {
  return request.post('/elevators', data)
}

export function updateElevator(id, data) {
  return request.put(`/elevators/${id}`, data)
}

export function deleteElevator(id) {
  return request.delete(`/elevators/${id}`)
}

// tab = WORK_ORDER | MAINTENANCE | INSPECTION
export function getElevatorProfile(id, params) {
  return request.get(`/elevators/${id}/profile`, { params })
}

export function importElevators(file) {
  const formData = new FormData()
  formData.append('file', file)
  return request.post('/elevators/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

export function downloadElevatorTemplate() {
  return request.get('/elevators/import-template', { responseType: 'blob' })
}

// 年检登记
export function inspectElevator(id, data) {
  return request.post(`/elevators/${id}/inspect`, data)
}
