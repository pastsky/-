import request from '@/utils/request'

export function getWorkbenchTodos() {
  return request.get('/cs-workbench/todos')
}

// type = WORK_ORDER | MAINTENANCE | INSPECTION | ALL
export function getWorkbenchOverdue(params) {
  return request.get('/cs-workbench/overdue', { params })
}

// 指派候选面板：班组/持证/在途/今日单量/超时率
export function getAssignPanel(params) {
  return request.get('/cs-workbench/assign-panel', { params })
}
