import request from '@/utils/request'

export function getFeedbackList(params) {
  return request.get('/feedback', { params })
}

export function getFeedbackDetail(id) {
  return request.get(`/feedback/${id}`)
}

export function createFeedback(data) {
  return request.post('/feedback', data)
}

export function resolveFeedback(id, data) {
  return request.put(`/feedback/${id}/resolve`, data)
}
