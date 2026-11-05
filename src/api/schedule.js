import request from '@/utils/request'
import { unwrapList } from '@/utils/unwrap'

// 调度任务列表（仅 {list}，ADMIN）
export async function getScheduleJobs() {
  return unwrapList(await request.get('/schedules/jobs'))
}

// 手动触发一次（同步执行）
export function runScheduleJob(jobCode) {
  return request.post(`/schedules/jobs/${jobCode}/run`)
}
