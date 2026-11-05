import request from '@/utils/request'
import { unwrapPage } from '@/utils/unwrap'

// 分页：{list,total,page,pageSize}
export async function getFeedbackList(params) {
  return unwrapPage(await request.get('/feedback', { params }))
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
