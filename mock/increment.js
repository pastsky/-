// 增量接口 Mock（对齐后端 PR-006~022 契约 v1.2）
import {
  users, workOrders, logs, elevators, groups, communities, notifications,
  nextId, now
} from './data'

const ok = (data) => ({ code: 0, message: 'success', data })
const fail = (code, message) => ({ code, message, data: null })
const UNFINISHED = ['PENDING', 'ASSIGNED', 'PROCESSING', 'PENDING_REVIEW']
const ARCHIVED = ['CLOSED', 'CANCELED', 'ESCALATED_FINAL']

function parseBody(body) {
  if (typeof body === 'string') {
    try {
      return JSON.parse(body)
    } catch (e) {
      return {}
    }
  }
  return body || {}
}

function getUserId(headers) {
  const auth = headers?.authorization || headers?.Authorization || ''
  const m = auth.match(/Bearer mock-token-(\d+)/)
  return m ? Number(m[1]) : null
}

const me = (headers) => users.find((u) => u.id === getUserId(headers)) || null
const findUser = (id) => users.find((u) => u.id === Number(id))
const today = () => now().slice(0, 10)
const isStaff = (u) => ['CUSTOMER_SERVICE', 'ADMIN', 'BRANCH_ADMIN'].includes(u?.role)

function paginate(list, page, pageSize) {
  const p = Number(page) || 1
  const ps = Number(pageSize) || 20
  return { list: list.slice((p - 1) * ps, p * ps), total: list.length, page: p, pageSize: ps }
}

function addLog(orderId, operatorId, action, fromStatus, toStatus, remark, reason) {
  if (!logs[orderId]) logs[orderId] = []
  logs[orderId].push({
    id: nextId(),
    orderId,
    operatorId,
    action,
    fromStatus,
    toStatus,
    remark: remark || '',
    reason: reason || null,
    createdAt: now()
  })
}

function isOverdue(o) {
  if (o.status !== 'PROCESSING' || !o.acceptTime) return false
  const limit = { URGENT: 2, HIGH: 4, MEDIUM: 8, LOW: 24 }[o.priority] || 8
  return (Date.now() - new Date(o.acceptTime.replace(' ', 'T')).getTime()) / 3600000 > limit
}

function overdueHours(dateStr) {
  return Number(((Date.now() - new Date(dateStr.replace(' ', 'T')).getTime()) / 3600000).toFixed(1))
}

function taskStatus(status) {
  return status
}

// 电梯年检标记
function decorateElevator(e) {
  const days = e.nextInspectDate
    ? Math.ceil((new Date(e.nextInspectDate).getTime() - Date.now()) / 86400000)
    : null
  return {
    ...e,
    inspectDaysLeft: days,
    inspectOverdue: days !== null && days < 0,
    inspectNearExpire: days !== null && days >= 0 && days <= 30,
    planCount: null
  }
}

const auditLogs = []
const feedbacks = [
  { id: 1, orderId: 5, reporterId: 5, content: '师傅上门很及时，但楼道还有残留水渍', images: [], status: 'SUBMITTED', handlerId: null, resolveRemark: null, handledAt: null, createdAt: '2026-10-26 16:00:00' },
  { id: 2, orderId: 6, reporterId: 6, content: '门禁已修复，感谢', images: [], status: 'RESOLVED', handlerId: 2, resolveRemark: '已电话回访并致谢', handledAt: '2026-10-26 10:00:00', createdAt: '2026-10-25 15:00:00' }
]
const exportJobs = [
  { id: 1, jobNo: 'EXP202610300001', requesterId: 2, reportType: 'TEAM_PERFORMANCE', format: 'EXCEL', status: 'SUCCESS', rowCount: 4, fileSize: 20480, errorMessage: null, fileName: '班组统计.xlsx', createdAt: '2026-10-30 09:00:00', finishedAt: '2026-10-30 09:00:05', expireAt: '2026-11-06 09:00:00' },
  { id: 2, jobNo: 'EXP202610300002', requesterId: 2, reportType: 'OVERVIEW', format: 'PNG', status: 'EXPIRED', rowCount: 1, fileSize: 51200, errorMessage: null, fileName: '运营总览.png', createdAt: '2026-10-20 10:00:00', finishedAt: '2026-10-20 10:00:03', expireAt: '2026-10-27 10:00:00' }
]

export default [
  // ============ 工单：入池 / 内部备注 / 兜底改单 / 批量 ============
  {
    url: '/api/work-orders/:id/to-pool',
    method: 'post',
    response: ({ query, headers, body }) => {
      const user = me(headers)
      const order = workOrders.find((o) => o.id === Number(query.id))
      if (!order) return fail(3001, '工单不存在')
      if (!isStaff(user)) return fail(1002, '无权操作')
      if (!['PENDING', 'ASSIGNED'].includes(order.status)) return fail(3000, '当前状态不可入池')
      const b = parseBody(body)
      if (!b.reason) return fail(1000, '请填写入池原因')
      const from = order.status
      order.status = 'PENDING'
      order.poolFlag = 1
      order.assigneeId = null
      order.assignTime = null
      order.poolTime = now()
      order.updatedAt = now()
      addLog(order.id, user.id, 'RETURN', from, 'PENDING', b.remark, b.reason)
      return ok({ id: order.id, status: order.status, poolFlag: 1 })
    }
  },
  {
    url: '/api/work-orders/:id/internal-notes',
    method: 'post',
    response: ({ query, headers, body }) => {
      const user = me(headers)
      const order = workOrders.find((o) => o.id === Number(query.id))
      if (!order) return fail(3001, '工单不存在')
      if (user.role === 'RESIDENT') return fail(1002, '内部备注对业主不可见、不可写')
      const b = parseBody(body)
      const images = Array.isArray(b.images) ? b.images : []
      if (!b.remark && !images.length) return fail(1000, '备注内容与图片至少填写一项')
      if (images.length > 3) return fail(1000, '每条备注最多 3 张图片')
      if (!order.remarks) order.remarks = []
      const item = {
        id: nextId(),
        operatorId: user.id,
        operatorName: user.realName,
        content: b.remark || '',
        images,
        createdAt: now()
      }
      order.remarks.push(item)
      const logId = nextId()
      if (!logs[order.id]) logs[order.id] = []
      logs[order.id].push({
        id: logId,
        orderId: order.id,
        operatorId: user.id,
        action: 'REMARK',
        fromStatus: order.status,
        toStatus: order.status,
        remark: b.remark || '',
        reason: null,
        images,
        createdAt: now()
      })
      return ok({ logId, orderId: order.id, createdAt: item.createdAt })
    }
  },
  {
    url: '/api/work-orders/:id/force-status',
    method: 'post',
    response: ({ query, headers, body }) => {
      const user = me(headers)
      const order = workOrders.find((o) => o.id === Number(query.id))
      if (!order) return fail(3001, '工单不存在')
      if (!['CUSTOMER_SERVICE', 'ADMIN'].includes(user.role)) return fail(1002, '无权改单')
      const b = parseBody(body)
      const allowed = { PROCESSING: ['ASSIGNED', 'COMPLETED'], PENDING: ['CANCELED'] }
      if (!(allowed[order.status] || []).includes(b.targetStatus)) return fail(3002, '超出兜底改单状态矩阵')
      if (!b.reason) return fail(1000, '请填写改单原因')
      const from = order.status
      if (b.targetStatus === 'ASSIGNED') {
        if (!b.assigneeId) return fail(1000, '改派需指定维修工')
        order.assigneeId = Number(b.assigneeId)
        order.assignTime = now()
        order.acceptTime = null
        order.status = 'ASSIGNED'
      } else if (b.targetStatus === 'COMPLETED') {
        const images = Array.isArray(b.finishImages) ? b.finishImages : []
        if (!images.length) return fail(1000, '补录完工需至少 1 张现场照片')
        order.status = 'PENDING_REVIEW'
        order.finishImages = images
        order.finishTime = now()
      } else {
        order.status = 'CANCELED'
        order.cancelTime = now()
      }
      order.updatedAt = now()
      addLog(order.id, user.id, 'REVIEW_RESULT', from, order.status, b.reason, b.reason)
      auditLogs.unshift({
        id: nextId(),
        bizType: 'USER',
        bizId: order.id,
        action: 'UPDATE',
        operatorId: user.id,
        operatorName: user.realName,
        remark: `兜底改单：${from} → ${order.status}；${b.reason}`,
        beforeValue: from,
        afterValue: order.status,
        createdAt: now()
      })
      return ok({ id: order.id, status: order.status })
    }
  },
  {
    url: '/api/work-orders/batch-assign',
    method: 'post',
    response: ({ headers, body }) => {
      const user = me(headers)
      const b = parseBody(body)
      const target = findUser(b.assigneeId)
      const failures = []
      let successCount = 0
      ;(b.orderIds || []).forEach((id) => {
        const o = workOrders.find((x) => x.id === Number(id))
        if (!o) return failures.push({ orderId: id, code: 3001, message: '工单不存在' })
        if (o.status !== 'PENDING') return failures.push({ orderId: id, code: 3000, message: '状态不允许' })
        if (!target) return failures.push({ orderId: id, code: 4000, message: '维修工不存在' })
        const busy = workOrders.find((x) => x.assigneeId === target.id && UNFINISHED.includes(x.status))
        if (busy) return failures.push({ orderId: id, code: 3000, message: '目标维修工在途' })
        o.assigneeId = target.id
        o.status = 'ASSIGNED'
        o.poolFlag = 0
        o.assignTime = now()
        addLog(o.id, user.id, 'ASSIGN', 'PENDING', 'ASSIGNED', b.reason, null)
        successCount += 1
      })
      return ok({ successCount, failureCount: failures.length, failures })
    }
  },
  {
    url: '/api/work-orders/batch-to-pool',
    method: 'post',
    response: ({ headers, body }) => {
      const user = me(headers)
      const b = parseBody(body)
      if (!b.reason) return fail(1000, '请填写入池原因')
      const failures = []
      let successCount = 0
      ;(b.orderIds || []).forEach((id) => {
        const o = workOrders.find((x) => x.id === Number(id))
        if (!o) return failures.push({ orderId: id, code: 3001, message: '工单不存在' })
        if (!['PENDING', 'ASSIGNED'].includes(o.status)) {
          return failures.push({ orderId: id, code: 3000, message: '状态不允许入池' })
        }
        const from = o.status
        o.status = 'PENDING'
        o.poolFlag = 1
        o.assigneeId = null
        o.assignTime = null
        o.poolTime = now()
        addLog(o.id, user.id, 'RETURN', from, 'PENDING', '', b.reason)
        successCount += 1
      })
      return ok({ successCount, failureCount: failures.length, failures })
    }
  },
  {
    url: '/api/work-orders/batch-cancel',
    method: 'post',
    response: ({ headers, body }) => {
      const user = me(headers)
      const b = parseBody(body)
      if (!b.reason) return fail(1000, '请填写取消原因')
      const failures = []
      let successCount = 0
      ;(b.orderIds || []).forEach((id) => {
        const o = workOrders.find((x) => x.id === Number(id))
        if (!o) return failures.push({ orderId: id, code: 3001, message: '工单不存在' })
        if (!['PENDING', 'ASSIGNED', 'PROCESSING'].includes(o.status)) {
          return failures.push({ orderId: id, code: 3000, message: '状态不允许取消' })
        }
        const from = o.status
        o.status = 'CANCELED'
        o.cancelTime = now()
        addLog(o.id, user.id, 'CANCEL', from, 'CANCELED', b.reason, b.reason)
        successCount += 1
      })
      return ok({ successCount, failureCount: failures.length, failures })
    }
  },

  // ============ 客服工作台 ============
  {
    url: '/api/cs-workbench/todos',
    method: 'get',
    response: ({ headers }) => {
      const user = me(headers)
      if (!isStaff(user)) return fail(1002, '无权访问工作台')
      const count = (fn) => workOrders.filter(fn).length
      return ok({
        pendingAssignCount: count((o) => o.status === 'PENDING'),
        pendingReviewCount: count((o) => o.status === 'PENDING_REVIEW'),
        feedbackSubmittedCount: feedbacks.filter((f) => f.status === 'SUBMITTED').length,
        certPendingCount: 1,
        overdueWorkOrderCount: count(isOverdue),
        overdueMaintenanceCount: 1,
        overdueInspectionCount: 0,
        escalatedFinalCount: count((o) => o.escalationCount >= 2),
        urgentPendingCount: count((o) => o.priority === 'URGENT' && !ARCHIVED.includes(o.status)),
        generatedAt: now()
      })
    }
  },
  {
    url: '/api/cs-workbench/overdue',
    method: 'get',
    response: ({ headers, query }) => {
      const user = me(headers)
      if (!isStaff(user)) return fail(1002, '无权访问工作台')
      const type = query?.type && query.type !== 'ALL' ? query.type : null
      const rows = []
      if (!type || type === 'WORK_ORDER') {
        workOrders.filter(isOverdue).forEach((o) => {
          rows.push({
            bizType: 'WORK_ORDER',
            bizId: o.id,
            bizNo: o.orderNo,
            title: o.title,
            status: o.status,
            priority: o.priority,
            overdueHours: overdueHours(o.acceptTime),
            assigneeName: findUser(o.assigneeId)?.realName || '',
            branchName: communities.find((c) => c.id === o.communityId)?.name || ''
          })
        })
      }
      if (!type || type === 'MAINTENANCE') {
        rows.push({
          bizType: 'MAINTENANCE',
          bizId: 1,
          bizNo: 'MT202610280001',
          title: '维保任务',
          status: 'PENDING',
          priority: null,
          overdueHours: 12.5,
          assigneeName: '王师傅',
          branchName: '金桂园小区'
        })
      }
      if (type === 'INSPECTION') {
        rows.push({
          bizType: 'INSPECTION',
          bizId: 1,
          bizNo: 'IN202610280001',
          title: '巡检任务',
          status: 'MISSED',
          priority: null,
          overdueHours: 6,
          assigneeName: '李师傅',
          branchName: '金桂园小区'
        })
      }
      rows.sort((a, b) => b.overdueHours - a.overdueHours)
      return ok(paginate(rows, query?.page, query?.pageSize))
    }
  },
  {
    url: '/api/work-orders/global-search',
    method: 'get',
    response: ({ headers, query }) => {
      const kw = String(query?.keyword || '')
      if (!kw) return fail(1000, '关键字不能为空')
      const list = workOrders
        .filter(
          (o) =>
            o.orderNo.includes(kw) ||
            o.title.includes(kw) ||
            (findUser(o.reporterId)?.realName || '').includes(kw) ||
            (findUser(o.reporterId)?.phone || '').includes(kw) ||
            (elevators.find((e) => e.id === o.elevatorId)?.elevatorNo || '').includes(kw)
        )
        .map((o) => ({
          id: o.id,
          orderNo: o.orderNo,
          title: o.title,
          type: o.type,
          priority: o.priority,
          status: o.status,
          poolFlag: o.poolFlag,
          location: o.location,
          appointmentTime: o.appointmentTime,
          createdAt: o.createdAt
        }))
      return ok(paginate(list, query?.page, query?.pageSize))
    }
  },

  // ============ 维修日历 ============
  {
    url: '/api/engineers/:id/calendar',
    method: 'get',
    response: ({ query }) => {
      const engineerId = Number(query.id)
      const startDate = query?.startDate
      const endDate = query?.endDate
      if (!startDate || !endDate) return fail(1000, 'startDate 与 endDate 必填')
      const engineer = findUser(engineerId)
      const blocks = workOrders
        .filter((o) => o.assigneeId === engineerId && (o.appointmentTime || o.acceptTime))
        .filter((o) => {
          const d = (o.acceptTime || o.appointmentTime).slice(0, 10)
          return d >= startDate && d <= endDate
        })
        .map((o) => ({
          blockType: 'WORK_ORDER',
          bizId: o.id,
          bizNo: o.orderNo,
          title: o.title,
          status: o.status,
          priority: o.priority,
          startTime: o.appointmentTime || o.acceptTime,
          endTime: o.finishTime || now(),
          appointmentTime: o.appointmentTime,
          elevatorNo: elevators.find((e) => e.id === o.elevatorId)?.elevatorNo || null,
          branchName: communities.find((c) => c.id === o.communityId)?.name || '',
          building: o.building,
          type: o.type,
          typeLabel: { WATER: '水', ELECTRIC: '电', AIR: '空调', LIFT: '电梯', FIRE: '消防', CLEANING: '保洁', SECURITY: '安保', OTHER: '其他' }[o.type]
        }))
      blocks.push({
        blockType: 'DUTY',
        bizId: 1,
        bizNo: 'DUTY-1',
        title: '值班',
        status: 'ACTIVE',
        priority: null,
        startTime: `${startDate} 18:00:00`,
        endTime: `${startDate} 23:59:00`,
        appointmentTime: null,
        elevatorNo: null,
        branchName: '金桂园小区',
        building: '',
        type: null,
        typeLabel: '值班'
      })
      return ok({
        engineerId,
        engineerName: engineer?.realName || '',
        startDate,
        endDate,
        blocks
      })
    }
  },

  // ============ 预约 ============
  {
    url: '/api/appointments/change-limit',
    method: 'get',
    response: ({ headers, query }) => {
      const user = me(headers)
      const reporterId = query?.reporterId ? Number(query.reporterId) : user?.id
      return ok({
        reporterId,
        date: today(),
        usedCount: 0,
        limit: 2,
        locked: false,
        released: false,
        noShowCount: 0,
        noShowAlertCount: 3,
        noShowAlert: false
      })
    }
  },
  {
    url: '/api/appointments/change-limit/release',
    method: 'post',
    response: () => ok({ released: true })
  },
  {
    url: '/api/appointments/duty-availability',
    method: 'get',
    response: ({ query }) => {
      const date = query?.date
      const has = ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05'].includes(date)
      return ok({
        date,
        branchId: query?.branchId ? Number(query.branchId) : null,
        hasDutyData: true,
        available: has,
        tip: has ? '' : '当天暂无值班人员'
      })
    }
  },

  // ============ 电梯台账 ============
  {
    url: '/api/elevators/import-template',
    method: 'get',
    response: () => ok({ message: '模板下载接口（Mock 不返回真实文件）' })
  },
  {
    url: '/api/elevators/import',
    method: 'post',
    response: () => ok({ total: 3, successCount: 2, failureCount: 1, errors: [{ row: 3, message: '电梯编号重复' }], planSyncHint: { branchIds: [1], hasEnabledPlan: true } })
  },
  {
    url: '/api/elevators/:id/profile',
    method: 'get',
    response: ({ query }) => {
      const tab = query?.tab || 'WORK_ORDER'
      const id = Number(query.id)
      if (tab === 'WORK_ORDER') {
        const list = workOrders
          .filter((o) => o.elevatorId === id)
          .map((o) => ({
            id: o.id,
            orderNo: o.orderNo,
            title: o.title,
            type: o.type,
            status: o.status,
            priority: o.priority,
            createdAt: o.createdAt,
            assigneeName: findUser(o.assigneeId)?.realName || ''
          }))
        return ok(paginate(list, query?.page, query?.pageSize))
      }
      return ok({ list: [], total: 0, page: 1, pageSize: 20 })
    }
  },
  {
    url: '/api/elevators/:id/inspect',
    method: 'post',
    response: ({ query, body }) => {
      const e = elevators.find((x) => x.id === Number(query.id))
      if (!e) return fail(1001, '电梯不存在')
      const b = parseBody(body)
      Object.assign(e, {
        inspectDate: b.inspectDate,
        nextInspectDate: b.nextInspectDate,
        inspectOrg: b.inspectOrg,
        inspectCertUrl: b.certUrl
      })
      return ok(decorateElevator(e))
    }
  },
  {
    url: '/api/elevators/:id',
    method: 'get',
    response: ({ query }) => {
      const e = elevators.find((x) => x.id === Number(query.id))
      return e ? ok(decorateElevator(e)) : fail(1001, '电梯不存在')
    }
  },
  {
    url: '/api/elevators/:id',
    method: 'put',
    response: ({ query, body }) => {
      const e = elevators.find((x) => x.id === Number(query.id))
      if (!e) return fail(1001, '电梯不存在')
      const b = parseBody(body)
      Object.assign(e, {
        branchId: b.branchId ? Number(b.branchId) : e.branchId,
        branchName: communities.find((c) => c.id === Number(b.branchId))?.name || e.branchName,
        elevatorNo: b.elevatorNo || e.elevatorNo,
        building: b.building ?? e.building,
        unit: b.unit ?? e.unit,
        location: b.location ?? e.location,
        brand: b.brand ?? e.brand,
        model: b.model ?? e.model,
        loadWeight: b.loadWeight ?? e.loadWeight,
        installDate: b.installDate ?? e.installDate,
        status: b.status ?? e.status,
        remark: b.remark ?? e.remark
      })
      return ok(decorateElevator(e))
    }
  },
  {
    url: '/api/elevators/:id',
    method: 'delete',
    response: ({ query }) => {
      const idx = elevators.findIndex((x) => x.id === Number(query.id))
      if (idx < 0) return fail(1001, '电梯不存在')
      const used = workOrders.some((o) => o.elevatorId === Number(query.id))
      if (used) return fail(3002, '存在关联工单，请改为停用')
      elevators.splice(idx, 1)
      return ok({ id: Number(query.id), deleted: true })
    }
  },
  {
    url: '/api/elevators',
    method: 'get',
    response: ({ query }) => {
      let list = elevators.map(decorateElevator)
      if (query?.status) list = list.filter((e) => e.status === query.status)
      if (query?.keyword) list = list.filter((e) => e.elevatorNo.includes(query.keyword) || (e.building || '').includes(query.keyword))
      if (query?.inspectOverdue === true || query?.inspectOverdue === 'true') {
        list = list.filter((e) => e.inspectOverdue)
      }
      return ok(paginate(list, query?.page, query?.pageSize))
    }
  },
  {
    url: '/api/elevators',
    method: 'post',
    response: ({ body }) => {
      const b = parseBody(body)
      const branch = communities.find((c) => c.id === Number(b.branchId)) || communities[0]
      const elevator = {
        id: nextId(),
        elevatorNo: b.elevatorNo || `JG-${String(elevators.length + 1).padStart(2, '0')}`,
        branchId: branch.id,
        branchName: branch.name,
        building: b.building,
        unit: b.unit || '',
        location: b.location || '',
        brand: b.brand || '',
        model: b.model || '',
        loadWeight: b.loadWeight || 0,
        installDate: b.installDate || '',
        status: b.status || 'ACTIVE',
        inspectDate: '',
        nextInspectDate: '',
        inspectOrg: '',
        inspectCertUrl: '',
        remark: b.remark || ''
      }
      elevators.push(elevator)
      return ok({ id: elevator.id, elevatorNo: elevator.elevatorNo, status: elevator.status })
    }
  },

  // ============ 班组 / 审计 ============
  {
    url: '/api/teams/:id/members',
    method: 'get',
    response: ({ query }) => {
      const list = users
        .filter((u) => u.groupId === Number(query.id))
        .map(({ password, ...rest }) => rest)
      return ok(list)
    }
  },
  {
    url: '/api/teams/:id/members',
    method: 'put',
    response: ({ query, body }) => {
      const teamId = Number(query.id)
      const ids = (parseBody(body).memberIds || []).map(Number)
      users.forEach((u) => {
        if (ids.includes(u.id)) u.groupId = teamId
        else if (u.groupId === teamId) u.groupId = null
      })
      auditLogs.unshift({
        id: nextId(),
        bizType: 'TEAM',
        bizId: teamId,
        action: 'MEMBER_CHANGE',
        operatorId: 1,
        operatorName: '管理员',
        remark: `班组成员调整为 ${ids.length} 人`,
        beforeValue: '',
        afterValue: ids.join(','),
        createdAt: now()
      })
      return ok(null)
    }
  },
  {
    url: '/api/teams/:id',
    method: 'get',
    response: ({ query }) => {
      const t = groups.find((g) => g.id === Number(query.id))
      return t ? ok(t) : fail(1001, '班组不存在')
    }
  },
  {
    url: '/api/teams/:id',
    method: 'put',
    response: ({ query, body }) => {
      const t = groups.find((g) => g.id === Number(query.id))
      if (!t) return fail(1001, '班组不存在')
      const b = parseBody(body)
      Object.assign(t, { name: b.teamName ?? t.name, status: b.status ?? 'ACTIVE', remark: b.remark ?? '' })
      return ok(t)
    }
  },
  {
    url: '/api/teams/:id',
    method: 'delete',
    response: ({ query }) => {
      const idx = groups.findIndex((g) => g.id === Number(query.id))
      if (idx < 0) return fail(1001, '班组不存在')
      if (users.some((u) => u.groupId === Number(query.id))) return fail(3002, '班组仍有成员，请先移出')
      groups.splice(idx, 1)
      return ok(null)
    }
  },
  {
    url: '/api/teams',
    method: 'get',
    response: ({ query }) => {
      let list = groups.map((g) => ({
        id: g.id,
        teamCode: `T0${g.id}`,
        teamName: g.name,
        status: g.status || 'ACTIVE',
        remark: g.remark || '',
        memberCount: users.filter((u) => u.groupId === g.id).length
      }))
      if (query?.keyword) list = list.filter((t) => t.teamName.includes(query.keyword) || t.teamCode.includes(query.keyword))
      return ok(list)
    }
  },
  {
    url: '/api/teams',
    method: 'post',
    response: ({ body }) => {
      const b = parseBody(body)
      if (groups.some((g) => `T0${g.id}` === b.teamCode)) return fail(3002, '班组编码已存在')
      const team = { id: nextId(), name: b.teamName, status: b.status || 'ACTIVE', remark: b.remark || '', communityId: 1 }
      groups.push(team)
      return ok(team)
    }
  },
  {
    url: '/api/audit-logs',
    method: 'get',
    response: ({ query }) => {
      let list = auditLogs.slice()
      if (query?.bizType) list = list.filter((l) => l.bizType === query.bizType)
      if (query?.action) list = list.filter((l) => l.action === query.action)
      return ok(paginate(list, query?.page, query?.pageSize))
    }
  },

  // ============ 反馈 ============
  {
    url: '/api/feedback',
    method: 'post',
    response: ({ headers, body }) => {
      const user = me(headers)
      if (!user) return fail(2000, '未登录')
      const b = parseBody(body)
      if (!b.content) return fail(1000, '反馈内容不能为空')
      const feedback = {
        id: nextId(),
        orderId: b.orderId ? Number(b.orderId) : null,
        reporterId: user.id,
        content: b.content,
        images: Array.isArray(b.images) ? b.images : [],
        status: 'SUBMITTED',
        handlerId: null,
        resolveRemark: null,
        handledAt: null,
        createdAt: now()
      }
      feedbacks.unshift(feedback)
      return ok({ id: feedback.id, status: feedback.status })
    }
  },
  {
    url: '/api/feedback/:id/resolve',
    method: 'put',
    response: ({ query, headers, body }) => {
      const user = me(headers)
      const f = feedbacks.find((x) => x.id === Number(query.id))
      if (!f) return fail(1001, '反馈不存在')
      const b = parseBody(body)
      if (!b.resolveRemark) return fail(1000, '处理说明必填')
      f.status = 'RESOLVED'
      f.resolveRemark = b.resolveRemark
      f.handlerId = user.id
      f.handledAt = now()
      notifications.unshift({
        id: nextId(),
        userId: f.reporterId,
        title: '反馈已处理',
        content: `您的反馈已处理：${b.resolveRemark}`,
        type: 'FEEDBACK_RESOLVED',
        isRead: false,
        orderId: f.orderId,
        createdAt: now()
      })
      return ok({ id: f.id, status: f.status, handledAt: f.handledAt })
    }
  },
  {
    url: '/api/feedback/:id',
    method: 'get',
    response: ({ query }) => {
      const f = feedbacks.find((x) => x.id === Number(query.id))
      if (!f) return fail(1001, '反馈不存在')
      const order = workOrders.find((o) => o.id === f.orderId)
      return ok({
        ...f,
        orderNo: order?.orderNo || '',
        orderTitle: order?.title || '',
        orderStatus: order?.status || '',
        reporterName: findUser(f.reporterId)?.realName || '',
        handlerName: findUser(f.handlerId)?.realName || ''
      })
    }
  },
  {
    url: '/api/feedback',
    method: 'get',
    response: ({ query }) => {
      let list = feedbacks.slice()
      if (query?.status) list = list.filter((f) => f.status === query.status)
      if (query?.orderId) list = list.filter((f) => f.orderId === Number(query.orderId))
      list.sort((a, b) => {
        if (a.status !== b.status) return a.status === 'SUBMITTED' ? -1 : 1
        return a.createdAt < b.createdAt ? 1 : -1
      })
      const rows = list.map((f) => {
        const order = workOrders.find((o) => o.id === f.orderId)
        return {
          ...f,
          orderNo: order?.orderNo || '',
          orderTitle: order?.title || '',
          reporterName: findUser(f.reporterId)?.realName || '',
          handlerName: findUser(f.handlerId)?.realName || ''
        }
      })
      return ok(paginate(rows, query?.page, query?.pageSize))
    }
  },

  // ============ 导出中心 / 班组统计 ============
  {
    url: '/api/exports/:id/download',
    method: 'get',
    response: ({ query }) => {
      const job = exportJobs.find((j) => j.id === Number(query.id))
      if (!job) return fail(3002, '任务不存在或文件已过期')
      if (job.status !== 'SUCCESS') return fail(3002, '任务未完成或已过期')
      return ok({ message: `Mock 环境不返回真实文件流：${job.fileName}` })
    }
  },
  {
    url: '/api/exports/:id',
    method: 'get',
    response: ({ query }) => {
      const job = exportJobs.find((j) => j.id === Number(query.id))
      if (!job) return fail(1001, '任务不存在')
      return ok({ ...job, downloadable: job.status === 'SUCCESS' })
    }
  },
  {
    url: '/api/exports',
    method: 'get',
    response: ({ headers, query }) => {
      const user = me(headers)
      let list = exportJobs.filter((j) => user.role === 'ADMIN' || j.requesterId === user.id)
      if (query?.status) list = list.filter((j) => j.status === query.status)
      return ok(paginate(list, query?.page, query?.pageSize))
    }
  },
  {
    url: '/api/exports',
    method: 'post',
    response: ({ headers, body }) => {
      const user = me(headers)
      const b = parseBody(body)
      if (!b.reportType || !b.format) return fail(1000, 'reportType 与 format 必填')
      const matrix = {
        EXCEL: ['WORK_ORDER', 'MAINTENANCE', 'INSPECTION', 'ENGINEER_PERFORMANCE', 'TEAM_PERFORMANCE', 'OVERVIEW'],
        CSV: ['WORK_ORDER', 'MAINTENANCE', 'INSPECTION', 'ENGINEER_PERFORMANCE', 'TEAM_PERFORMANCE', 'OVERVIEW'],
        PDF: ['OVERVIEW', 'ENGINEER_PERFORMANCE', 'TEAM_PERFORMANCE'],
        PNG: ['OVERVIEW', 'TEAM_PERFORMANCE']
      }
      if (!(matrix[b.format] || []).includes(b.reportType)) return fail(1000, '报表与格式组合不支持')
      const job = {
        id: nextId(),
        jobNo: `EXP${today().replace(/-/g, '')}${String(exportJobs.length + 1).padStart(4, '0')}`,
        requesterId: user.id,
        reportType: b.reportType,
        format: b.format,
        status: 'SUCCESS',
        rowCount: 12,
        fileSize: 40960,
        errorMessage: null,
        fileName: 'report',
        createdAt: now(),
        finishedAt: now(),
        expireAt: `${today()} 23:59:59`
      }
      exportJobs.unshift(job)
      notifications.unshift({
        id: nextId(),
        userId: user.id,
        title: '导出完成',
        content: `任务 ${job.jobNo} 已生成，下载链接保留 7 天`,
        type: 'ANNOUNCEMENT',
        isRead: false,
        orderId: null,
        createdAt: now()
      })
      return ok({ jobId: job.id, jobNo: job.jobNo, status: 'QUEUED' })
    }
  },
  {
    url: '/api/stats/team-performance',
    method: 'get',
    response: () => {
      const list = groups.map((g) => {
        const members = users.filter((u) => u.groupId === g.id)
        const ids = members.map((m) => m.id)
        const orders = workOrders.filter((o) => ids.includes(o.assigneeId))
        const finished = orders.filter((o) => o.finishTime)
        const overdue = orders.filter(isOverdue)
        const rejected = orders.filter((o) => o.rejectCount > 0)
        return {
          teamId: g.id,
          teamName: g.name,
          completedCount: finished.length,
          timeoutRate: orders.length ? Math.round((overdue.length / orders.length) * 100) : 0,
          rejectRate: orders.length ? Math.round((rejected.length / orders.length) * 100) : 0,
          memberCount: members.length
        }
      })
      return ok({
        list,
        ungrouped: { teamId: null, teamName: '未分组', completedCount: 0, timeoutRate: 0, rejectRate: 0, memberCount: users.filter((u) => !u.groupId && ['ENGINEER', 'VENDOR_ENGINEER'].includes(u.role)).length }
      })
    }
  }
]
