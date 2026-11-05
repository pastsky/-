import request from '@/utils/request'
import { cachedRequest, clearDictCache, unwrapList, unwrapPage } from '@/utils/unwrap'

// ============ 证书（PR-017） ============
// 分页：{list,total,page,pageSize}
export async function getCertificateList(params) {
  return unwrapPage(await request.get('/certificates', { params }))
}

export function getCertificateDetail(id) {
  return request.get(`/certificates/${id}`)
}

// 仅 {list}（v1.3 起由裸数组改为 list 包装）
export async function getMyCertificates(params) {
  return unwrapList(await request.get('/certificates/mine', { params }))
}

export function createCertificate(data) {
  return request.post('/certificates', data)
}

export function approveCertificate(id) {
  return request.post(`/certificates/${id}/approve`)
}

export function rejectCertificate(id, data) {
  return request.post(`/certificates/${id}/reject`, data)
}

export function revokeCertificate(id, data) {
  return request.post(`/certificates/${id}/revoke`, data)
}

export function unlockCertificate(id) {
  return request.post(`/certificates/${id}/unlock`)
}

export function getCertificateEligibility(params) {
  return request.get('/certificates/eligibility', { params })
}

// ============ 证书标签字典（仅 {list}，缓存去重） ============
export async function getRepairerTags(params) {
  const data = params
    ? await request.get('/repairer-tags', { params })
    : await cachedRequest('repairer-tags', () => request.get('/repairer-tags'))
  return unwrapList(data)
}

export async function createRepairerTag(data) {
  try {
    return await request.post('/repairer-tags', data)
  } finally {
    clearDictCache('repairer-tags')
  }
}

export async function updateRepairerTag(id, data) {
  try {
    return await request.put(`/repairer-tags/${id}`, data)
  } finally {
    clearDictCache('repairer-tags')
  }
}

export async function deleteRepairerTag(id) {
  try {
    return await request.delete(`/repairer-tags/${id}`)
  } finally {
    clearDictCache('repairer-tags')
  }
}

// 仅 {list}，缓存去重
export async function getTypeCertMappings() {
  return unwrapList(
    await cachedRequest('type-cert-mappings', () => request.get('/type-cert-mappings'))
  )
}

export async function updateTypeCertMapping(workOrderType, data) {
  try {
    return await request.put(`/type-cert-mappings/${workOrderType}`, data)
  } finally {
    clearDictCache('type-cert-mappings')
  }
}
