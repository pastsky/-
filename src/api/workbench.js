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

// 派单候选面板（班组/持证/在途/今日单量/超时率）
export async function getAssignPanel(params) {
  const data = await request.get('/cs-workbench/assign-panel', { params })
  // 兼容裸数组 / {list}
  return Array.isArray(data) ? data : Array.isArray(data?.list) ? data.list : []
}
