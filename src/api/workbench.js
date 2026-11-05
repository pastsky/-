import request from '@/utils/request'
import { unwrapPage } from '@/utils/unwrap'

// BOP107 客服工作台待办聚合
export function getWorkbenchTodos() {
  return request.get('/cs-workbench/todos')
}

// BOP108 逾期/超时聚合（分页）
// type = WORK_ORDER | MAINTENANCE | INSPECTION | ALL
export async function getWorkbenchOverdue(params) {
  return unwrapPage(await request.get('/cs-workbench/overdue', { params }))
}
