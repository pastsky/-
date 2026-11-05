import request from '@/utils/request'
import { unwrapPage } from '@/utils/unwrap'

// 分页：{list,total,page,pageSize}
export async function getElevatorList(params) {
  return unwrapPage(await request.get('/elevators', { params }))
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

// tab = WORK_ORDER | MAINTENANCE | INSPECTION；返回 {tab,list,total,page,pageSize}
export async function getElevatorProfile(id, params) {
  const data = await request.get(`/elevators/${id}/profile`, { params })
  return { ...data, list: Array.isArray(data?.list) ? data.list : [] }
}

export function importElevators(file) {
  const formData = new FormData()
  formData.append('file', file)
  return request.post('/elevators/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

// 文件流：返回 { blob, filename }
export function downloadElevatorTemplate() {
  return request.get('/elevators/import-template', { responseType: 'blob' })
}

// 年检登记
export function inspectElevator(id, data) {
  return request.post(`/elevators/${id}/inspect`, data)
}
