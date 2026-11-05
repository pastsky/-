import request from '@/utils/request'

// ============ 证书（PR-017） ============
export function getCertificateList(params) {
  return request.get('/certificates', { params })
}

export function getCertificateDetail(id) {
  return request.get(`/certificates/${id}`)
}

export function getMyCertificates(params) {
  return request.get('/certificates/mine', { params })
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

// ============ 证书标签字典 ============
export function getRepairerTags(params) {
  return request.get('/repairer-tags', { params })
}

export function createRepairerTag(data) {
  return request.post('/repairer-tags', data)
}

export function updateRepairerTag(id, data) {
  return request.put(`/repairer-tags/${id}`, data)
}

export function deleteRepairerTag(id) {
  return request.delete(`/repairer-tags/${id}`)
}

export function getTypeCertMappings() {
  return request.get('/type-cert-mappings')
}

export function updateTypeCertMapping(workOrderType, data) {
  return request.put(`/type-cert-mappings/${workOrderType}`, data)
}
