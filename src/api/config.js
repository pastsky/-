import request from '@/utils/request'
import { unwrapList } from '@/utils/unwrap'

// 系统配置（仅 {list}，ADMIN）
export async function getConfigs(params) {
  return unwrapList(await request.get('/configs', { params }))
}

export function updateConfig(id, data) {
  return request.put(`/configs/${id}`, data)
}
