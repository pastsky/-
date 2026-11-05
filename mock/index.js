import {
  users, workOrders, logs, notifications, elevators, dutySchedules, groups, communities,
  broadcasts, nextId, genOrderNo, now
} from './data'

const ok = (data) => ({ code: 0, message: 'success', data })
const fail = (code, message) => ({ code, message, data: null })

const UNFINISHED = ['PENDING', 'ASSIGNED', 'PROCESSING', 'PENDING_REVIEW']
const ARCHIVED = ['CLOSED', 'CANCELED', 'ESCALATED_FINAL']
const TIMEOUT_HOURS = { URGENT: 2, HIGH: 4, MEDIUM: 8, LOW: 24 }
const CERT_REQUIRED = { LIFT: 'LIFT_CERT', ELECTRIC: 'ELECTRIC_CERT', FIRE: 'FIRE_CERT' }

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

function me(headers) {
  return users.find((u) => u.id === getUserId(headers)) || null
}

function findUser(id) {
  return users.find((u) => u.id === Number(id))
}

function toUserVO(u) {
  const { password, ...rest } = u
  return rest
}

function toUserBrief(u) {
  if (!u) return null
  return { id: u.id, realName: u.realName, phone: u.phone, groupId: u.groupId }
}

function toEngineerBrief(u) {
  const today = now().slice(0, 10)
  const unfinished = workOrders.filter(
    (o) => o.assigneeId === u.id && UNFINISHED.includes(o.status)
  )
  const finishedToday = workOrders.filter(
    (o) => o.assigneeId === u.id && o.finishTime && o.finishTime.slice(0, 10) === today
  )
  const finished = workOrders.filter((o) => o.assigneeId === u.id && o.finishTime)
  const overdue = unfinished.filter(isOverdue)
  return {
    id: u.id,
    username: u.username,
    realName: u.realName,
    phone: u.phone,
    role: u.role,
    groupId: u.groupId,
    groupName: groups.find((g) => g.id === u.groupId)?.name || '未分组',
    onDuty: u.onDuty,
    certs: (u.certs || []).map((c) => c.tagCode),
    validCerts: (u.certs || []).filter(
      (c) => c.status === 'APPROVED' && (!c.expireDate || c.expireDate >= today)
    ).map((c) => c.tagCode),
    unfinishedCount: unfinished.length,
    todayCount: finishedToday.length,
    totalCount: finished.length,
    overdueRate: unfinished.length ? Math.round((overdue.length / unfinished.length) * 100) : 0
  }
}

function isOverdue(o) {
  if (o.status !== 'PROCESSING' || !o.acceptTime) return false
  const hours = (Date.now() - new Date(o.acceptTime.replace(' ', 'T')).getTime()) / 3600000
  return hours > (TIMEOUT_HOURS[o.priority] || 8)
}

function toListItem(o) {
  const reporter = findUser(o.reporterId)
  const assignee = findUser(o.assigneeId)
  const elevator = elevators.find((e) => e.id === o.elevatorId)
  return {
    id: o.id,
    orderNo: o.orderNo,
    title: o.title,
    type: o.type,
    priority: o.priority,
    status: o.status,
    poolFlag: o.poolFlag,
    location: o.location,
    appointmentTime: o.appointmentTime,
    escalationCount: o.escalationCount,
    source: o.source,
    elevatorNo: elevator ? elevator.elevatorNo : null,
    reporterName: reporter ? reporter.realName : '',
    reporterPhone: reporter ? reporter.phone : '',
    assigneeName: assignee ? assignee.realName : null,
    overdue: isOverdue(o),
    createdAt: o.createdAt
  }
}

function toDetail(o) {
  const elevator = elevators.find((e) => e.id === o.elevatorId)
  return {
    ...o,
    elevator: elevator || null,
    reporter: toUserBrief(findUser(o.reporterId)),
    assignee: toUserBrief(findUser(o.assigneeId)),
    overdue: isOverdue(o)
  }
}

function toNotificationVO(n) {
  const { userId, ...rest } = n
  return rest
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

function addNotification(userId, title, content, type, orderId) {
  notifications.unshift({
    id: nextId(),
    userId,
    title,
    content,
    type,
    isRead: false,
    orderId,
    createdAt: now()
  })
}

function paginate(list, page, pageSize) {
  const p = Number(page) || 1
  const ps = Number(pageSize) || 20
  const total = list.length
  return { list: list.slice((p - 1) * ps, p * ps), total, page: p, pageSize: ps }
}

function getOrder(id) {
  return workOrders.find((o) => o.id === Number(id))
}

function canViewOrder(order, user) {
  if (!user) return false
  if (['CUSTOMER_SERVICE', 'ADMIN', 'BRANCH_ADMIN', 'VENDOR_ADMIN'].includes(user.role)) return true
  if (user.role === 'RESIDENT') return order.reporterId === user.id
  if (['ENGINEER', 'VENDOR_ENGINEER'].includes(user.role)) {
    // 维修工可见：指派给自己的 + 池中待抢的
    return order.assigneeId === user.id || (order.status === 'PENDING' && order.poolFlag === 1)
  }
  return false
}

// ============ 业务校验 ============
function checkUnfinished(repairerId) {
  const list = workOrders.filter(
    (o) => o.assigneeId === Number(repairerId) && UNFINISHED.includes(o.status)
  )
  return list.length ? list[0] : null
}

function checkCertEligibility(user, type) {
  const required = CERT_REQUIRED[type]
  if (!required) return null
  const today = now().slice(0, 10)
  const hit = (user.certs || []).find(
    (c) => c.tagCode === required && c.status === 'APPROVED' && (!c.expireDate || c.expireDate >= today)
  )
  return hit ? null : required
}

function checkOnDuty(user) {
  return user.onDuty === 1 ? null : '当前不在值班状态'
}

function checkAppointmentConflict(order, repairerId) {
  if (!order.appointmentTime) return null
  const base = new Date(order.appointmentTime.replace(' ', 'T')).getTime()
  return (
    workOrders.find((o) => {
      if (o.id === order.id || !o.appointmentTime) return false
      if (!['PENDING', 'ASSIGNED', 'PROCESSING'].includes(o.status)) return false
      const sameElevator = order.elevatorId && o.elevatorId === order.elevatorId
      const sameRepairer = repairerId && o.assigneeId === Number(repairerId)
      if (!sameElevator && !sameRepairer) return false
      const t = new Date(o.appointmentTime.replace(' ', 'T')).getTime()
      return Math.abs(t - base) < 30 * 60 * 1000
    }) || null
  )
}

// 抢单/指派共用校验，返回 {code, message} 或 null
function validateTakeOrder(user, order) {
  if (user.status !== 'ACTIVE') return { code: 1002, message: '账号已停用，无法接单' }
  const cert = checkCertEligibility(user, order.type)
  if (cert) return { code: 3002, message: `缺少 ${cert} 证书，无法处理该类工单` }
  const duty = checkOnDuty(user)
  if (duty) return { code: 3003, message: duty }
  const busy = checkUnfinished(user.id)
  if (busy) return { code: 3004, message: `存在在途工单（${busy.orderNo}），同时仅可处理一单` }
  const conflict = checkAppointmentConflict(order, user.id)
  if (conflict) return { code: 3005, message: `与 ${conflict.orderNo} 的预约时间（30 分钟内）冲突` }
  return null
}

function sortPool(list, user) {
  const weight = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }
  return list.slice().sort((a, b) => {
    const aGroup = a.communityId === user.communityId ? 1 : 0
    const bGroup = b.communityId === user.communityId ? 1 : 0
    if (aGroup !== bGroup) return bGroup - aGroup
    const aw = weight[a.priority] || 0
    const bw = weight[b.priority] || 0
    if (aw !== bw) return bw - aw
    return a.createdAt < b.createdAt ? -1 : 1
  })
}

export default [
  // ============ 认证 ============
  {
    url: '/api/auth/login',
    method: 'post',
    response: ({ body }) => {
      const b = parseBody(body)
      const user = users.find((u) => u.username === b.username && u.password === b.password)
      if (!user) return fail(2001, '用户名或密码错误')
      if (user.status === 'DISABLED') return fail(2001, '账号已停用，请联系管理员')
      return ok({
        token: `mock-token-${user.id}`,
        user: { id: user.id, username: user.username, realName: user.realName, role: user.role }
      })
    }
  },
  { url: '/api/auth/logout', method: 'post', response: () => ok(null) },
  {
    url: '/api/auth/me',
    method: 'get',
    response: ({ headers }) => {
      const user = me(headers)
      if (!user) return fail(2000, '未登录或 token 无效')
      return ok(toUserVO(user))
    }
  },

  // ============ 通知 / 广播 ============
  {
    url: '/api/notifications/broadcast',
    method: 'post',
    response: ({ headers, body }) => {
      const user = me(headers)
      if (!user) return fail(2000, '未登录')
      if (!['ADMIN', 'CUSTOMER_SERVICE'].includes(user.role)) return fail(1002, '无权发布广播')
      const b = parseBody(body)
      if (!b.title || !b.content) return fail(1000, '标题与内容不能为空')
      const scope = b.targetScope || 'ALL'
      let targets = users.filter((u) => u.status === 'ACTIVE')
      if (scope === 'ROLE') targets = targets.filter((u) => u.role === b.targetRole)
      if (scope === 'BRANCH') targets = targets.filter((u) => u.communityId === Number(b.branchId))
      if (!targets.length) return fail(1000, '未匹配到接收人，请调整广播范围')
      targets.forEach((t) =>
        addNotification(t.id, b.title, b.content, b.type || 'ANNOUNCEMENT', null)
      )
      const record = {
        id: nextId(),
        senderId: user.id,
        title: b.title,
        content: b.content,
        targetScope: scope,
        targetRole: b.targetRole || null,
        branchId: b.branchId ? Number(b.branchId) : null,
        type: b.type || 'ANNOUNCEMENT',
        delivered: targets.length,
        createdAt: now()
      }
      broadcasts.unshift(record)
      return ok({ delivered: targets.length, id: record.id })
    }
  },
  {
    url: '/api/notifications',
    method: 'get',
    response: ({ headers, query }) => {
      // 广播历史：后端仅有 POST /notifications/broadcast，历史按 type 从通知聚合
      if (query?.type === 'BROADCAST') {
        return ok(paginate(broadcasts.slice(), query?.page, query?.pageSize))
      }
      const user = me(headers)
      let list = notifications.filter((n) => n.userId === user?.id)
      if (query?.unreadOnly === true || query?.unreadOnly === 'true') {
        list = list.filter((n) => !n.isRead)
      }
      return ok(paginate(list.map(toNotificationVO), query?.page, query?.pageSize))
    }
  },
  {
    url: '/api/notifications/read-all',
    method: 'put',
    response: ({ headers }) => {
      const user = me(headers)
      let updated = 0
      notifications.forEach((n) => {
        if (n.userId === user?.id && !n.isRead) {
          n.isRead = true
          updated += 1
        }
      })
      return ok({ updated })
    }
  },
  {
    url: '/api/notifications/:id/read',
    method: 'put',
    response: ({ query }) => {
      const n = notifications.find((x) => x.id === Number(query.id))
      if (!n) return fail(1001, '通知不存在')
      n.isRead = true
      return ok({ id: n.id, isRead: true })
    }
  },

  // ============ 文件 ============
  {
    url: '/api/files/upload',
    method: 'post',
    response: () =>
      ok({
        url: `http://localhost:8080/uploads/workorder/${now().slice(0, 10).replace(/-/g, '')}/mock-${Date.now()}.jpg`
      })
  },

  // ============ 基础数据 ============
  { url: '/api/branches', method: 'get', response: () => ok(communities.slice()) },
  {
    url: '/api/duty-schedules',
    method: 'get',
    response: ({ query }) => {
      let list = dutySchedules.slice()
      if (query?.month) list = list.filter((d) => d.date.startsWith(query.month))
      return ok(list)
    }
  },

  // ============ 用户 ============
  {
    url: '/api/users/engineers',
    method: 'get',
    response: ({ query }) =>
      ok(
        users
          .filter((u) => ['ENGINEER', 'VENDOR_ENGINEER'].includes(u.role) && u.status === 'ACTIVE')
          .filter((u) => (query?.groupId ? u.groupId === Number(query.groupId) : true))
          .map(toEngineerBrief)
      )
  },
  {
    url: '/api/users',
    method: 'get',
    response: ({ query }) => {
      const { keyword, role, status } = query || {}
      let list = users.slice()
      if (keyword) {
        list = list.filter(
          (u) =>
            u.username.includes(keyword) ||
            u.realName.includes(keyword) ||
            (u.phone || '').includes(keyword)
        )
      }
      if (role) list = list.filter((u) => u.role === role)
      if (status) list = list.filter((u) => u.status === status)
      const data = paginate(list.map(toUserVO), query?.page, query?.pageSize)
      return ok(data)
    }
  },
  {
    url: '/api/users',
    method: 'post',
    response: ({ body }) => {
      const b = parseBody(body)
      if (users.some((u) => u.username === b.username)) return fail(1000, '用户名已存在')
      const user = {
        id: nextId(),
        username: b.username,
        password: b.password || '123456',
        realName: b.realName,
        phone: b.phone || '',
        email: b.email || '',
        address: b.address || '',
        communityId: b.communityId ? Number(b.communityId) : 1,
        building: b.building || '',
        room: b.room || '',
        role: b.role,
        groupId: b.groupId ? Number(b.groupId) : null,
        onDuty: 1,
        certs: [],
        status: b.status || 'ACTIVE',
        createdAt: now(),
        updatedAt: now()
      }
      users.push(user)
      return ok(toUserVO(user))
    }
  },
  {
    url: '/api/users/:id/enable',
    method: 'put',
    response: ({ query }) => {
      const user = findUser(query.id)
      if (!user) return fail(4000, '用户不存在')
      user.status = 'ACTIVE'
      user.updatedAt = now()
      return ok(null)
    }
  },
  {
    url: '/api/users/:id',
    method: 'put',
    response: ({ query, body }) => {
      const user = findUser(query.id)
      if (!user) return fail(4000, '用户不存在')
      const b = parseBody(body)
      Object.assign(user, {
        username: b.username ?? user.username,
        realName: b.realName ?? user.realName,
        phone: b.phone ?? user.phone,
        email: b.email ?? user.email,
        address: b.address ?? user.address,
        communityId: b.communityId ? Number(b.communityId) : user.communityId,
        building: b.building ?? user.building,
        room: b.room ?? user.room,
        role: b.role ?? user.role,
        groupId: b.groupId === undefined ? user.groupId : b.groupId ? Number(b.groupId) : null,
        status: b.status ?? user.status,
        updatedAt: now()
      })
      return ok(toUserVO(user))
    }
  },
  {
    url: '/api/users/:id',
    method: 'delete',
    response: ({ query, headers }) => {
      const user = findUser(query.id)
      if (!user) return fail(4000, '用户不存在')
      if (getUserId(headers) === Number(query.id)) return fail(1000, '不能停用自己')
      const hasUnfinished = workOrders.some(
        (o) =>
          (o.reporterId === Number(query.id) || o.assigneeId === Number(query.id)) &&
          !['CLOSED', 'CANCELED'].includes(o.status)
      )
      if (hasUnfinished) return fail(1000, '该用户存在未完结工单，无法停用')
      user.status = 'DISABLED'
      user.updatedAt = now()
      return ok(null)
    }
  },
  {
    url: '/api/users/:id/password',
    method: 'put',
    response: ({ query, body }) => {
      const user = findUser(query.id)
      if (!user) return fail(4000, '用户不存在')
      const b = parseBody(body)
      user.password = b.password || '123456'
      user.updatedAt = now()
      return ok({ id: user.id })
    }
  },

  // ============ 工单池（必须先于 /work-orders/:id 定义） ============
  {
    url: '/api/work-orders/pool',
    method: 'get',
    response: ({ headers, query }) => {
      const user = me(headers)
      if (!user) return fail(2000, '未登录')
      const showAll = query?.show_all === true || query?.show_all === 'true'
      let list = workOrders.filter((o) => o.status === 'PENDING' && o.poolFlag === 1)
      if (!showAll && ['ENGINEER', 'VENDOR_ENGINEER'].includes(user.role)) {
        // 默认本小区优先展示（不隐藏其它小区，仅排序靠前，show_all 时取消排序偏好）
        list = sortPool(list, user)
      }
      if (query?.type) list = list.filter((o) => o.type === query.type)
      if (query?.priority) list = list.filter((o) => o.priority === query.priority)
      const items = list.map((o) => ({
        ...toListItem(o),
        myGroup: !!user.groupId && findUser(o.reporterId)?.groupId === user.groupId,
        waitHours: Number(((Date.now() - new Date(o.createdAt.replace(' ', 'T')).getTime()) / 3600000).toFixed(1))
      }))
      return ok(paginate(items, query?.page, query?.pageSize))
    }
  },

  {
    url: '/api/work-orders/calendar',
    method: 'get',
    response: ({ headers, query }) => {
      const user = me(headers)
      if (!user) return fail(2000, '未登录')
      const month = query?.month || now().slice(0, 7)
      const repairerId =
        query?.repairerId && ['ADMIN', 'CUSTOMER_SERVICE', 'BRANCH_ADMIN', 'VENDOR_ADMIN'].includes(user.role)
          ? Number(query.repairerId)
          : user.id
      const map = {}
      workOrders
        .filter((o) => o.assigneeId === repairerId && (o.acceptTime || o.appointmentTime))
        .filter((o) => (o.acceptTime || o.appointmentTime).startsWith(month))
        .forEach((o) => {
          const start = (o.acceptTime || o.appointmentTime).slice(11, 16)
          const end = o.finishTime ? o.finishTime.slice(11, 16) : null
          const date = (o.acceptTime || o.appointmentTime).slice(0, 10)
          if (!map[date]) map[date] = []
          map[date].push({
            id: o.id,
            orderNo: o.orderNo,
            title: o.title,
            type: o.type,
            building: o.building,
            status: o.status,
            priority: o.priority,
            start,
            end,
            appointmentTime: o.appointmentTime
          })
        })
      return ok(
        Object.keys(map)
          .sort()
          .map((date) => ({ date, orders: map[date] }))
      )
    }
  },

  // ============ 工单 ============
  {
    url: '/api/work-orders/batch',
    method: 'post',
    response: ({ headers, body }) => {
      const user = me(headers)
      if (!user) return fail(2000, '未登录')
      const b = parseBody(body)
      const ids = Array.isArray(b.ids) ? b.ids.map(Number) : []
      const success = []
      const failed = []
      ids.forEach((id) => {
        const o = getOrder(id)
        if (!o) {
          failed.push({ id, reason: '工单不存在' })
          return
        }
        if (b.action === 'pool') {
          if (!['PENDING', 'ASSIGNED'].includes(o.status)) {
            failed.push({ id, orderNo: o.orderNo, reason: '当前状态不可入池' })
            return
          }
          const from = o.status
          o.status = 'PENDING'
          o.poolFlag = 1
          o.assigneeId = null
          o.assignTime = null
          o.updatedAt = now()
          addLog(o.id, user.id, 'RETURN', from, 'PENDING', '', b.reason || '批量入池')
          success.push({ id, orderNo: o.orderNo })
        } else if (b.action === 'cancel') {
          if (!['PENDING', 'ASSIGNED'].includes(o.status)) {
            failed.push({ id, orderNo: o.orderNo, reason: '当前状态不可取消' })
            return
          }
          o.status = 'CANCELED'
          o.cancelTime = now()
          o.updatedAt = now()
          addLog(o.id, user.id, 'CANCEL', null, 'CANCELED', '', b.reason || '批量取消')
          success.push({ id, orderNo: o.orderNo })
        } else {
          failed.push({ id, orderNo: o.orderNo, reason: '不支持的批量操作' })
        }
      })
      return ok({ success, failed })
    }
  },
  {
    url: '/api/work-orders',
    method: 'post',
    response: ({ headers, body }) => {
      const user = me(headers)
      if (!user) return fail(2000, '未登录')
      const b = parseBody(body)
      if (!b.title || !b.type) return fail(1000, '标题与类型不能为空')
      if (b.appointmentTime && new Date(b.appointmentTime.replace(' ', 'T')) <= new Date()) {
        return fail(1000, '预约时间需晚于当前时间')
      }
      // 业主当日同位置紧急报修限 3 次
      if (b.priority === 'URGENT' && user.role === 'RESIDENT') {
        const today = now().slice(0, 10)
        const cnt = workOrders.filter(
          (o) =>
            o.reporterId === user.id &&
            o.priority === 'URGENT' &&
            o.createdAt.slice(0, 10) === today &&
            o.location === (b.location || '')
        ).length
        if (cnt >= 3) return fail(1000, '该位置今日紧急报修已达 3 次，已转为普通单')
      }
      const order = {
        id: nextId(),
        orderNo: genOrderNo(),
        title: b.title,
        description: b.description || '',
        type: b.type,
        priority: user.role === 'RESIDENT' ? ['LOW', 'MEDIUM'].includes(b.priority) ? b.priority : 'MEDIUM' : b.priority || 'MEDIUM',
        status: 'PENDING',
        poolFlag: b.poolFlag ? 1 : 0,
        appointmentTime: b.appointmentTime || null,
        location: b.location || `${b.building || ''}${b.room || ''}`,
        communityId: user.communityId || 1,
        building: b.building || '',
        room: b.room || '',
        elevatorId: b.elevatorId ? Number(b.elevatorId) : null,
        images: Array.isArray(b.images) ? b.images : [],
        finishImages: [],
        finishRemark: null,
        reviewResult: null,
        reviewRemark: null,
        remarks: [],
        escalationCount: 0,
        source: user.role === 'RESIDENT' ? 'USER_REPORT' : 'CS_ASSIGN',
        reporterId: user.id,
        assigneeId: null,
        assignTime: null,
        acceptTime: null,
        finishTime: null,
        closeTime: null,
        cancelTime: null,
        rating: 0,
        ratingComment: null,
        ratedAt: null,
        createdAt: now(),
        updatedAt: now()
      }
      workOrders.unshift(order)
      addLog(order.id, user.id, 'CREATE', null, 'PENDING', '创建工单')
      return ok({ id: order.id, orderNo: order.orderNo, status: order.status })
    }
  },
  {
    url: '/api/work-orders',
    method: 'get',
    response: ({ headers, query }) => {
      const user = me(headers)
      if (!user) return fail(2000, '未登录')
      const q = query || {}
      let list = workOrders.filter((o) => canViewOrder(o, user))
      if (q.status) list = list.filter((o) => o.status === q.status)
      if (q.type) list = list.filter((o) => o.type === q.type)
      if (q.priority) list = list.filter((o) => o.priority === q.priority)
      if (q.poolFlag !== undefined && q.poolFlag !== '') {
        list = list.filter((o) => o.poolFlag === Number(q.poolFlag))
      }
      if (q.escalated === 'true') list = list.filter((o) => o.escalationCount > 0)
      if (q.assigneeId) list = list.filter((o) => o.assigneeId === Number(q.assigneeId))
      if (q.reporterId) list = list.filter((o) => o.reporterId === Number(q.reporterId))
      if (q.overdue === 'true') list = list.filter(isOverdue)
      if (q.keyword) {
        const kw = String(q.keyword)
        list = list.filter((o) => {
          const reporter = findUser(o.reporterId)
          const elevator = elevators.find((e) => e.id === o.elevatorId)
          return (
            o.title.includes(kw) ||
            o.orderNo.includes(kw) ||
            (o.description || '').includes(kw) ||
            (reporter?.realName || '').includes(kw) ||
            (reporter?.phone || '').includes(kw) ||
            (elevator?.elevatorNo || '').includes(kw)
          )
        })
      }
      if (q.startDate) list = list.filter((o) => o.createdAt.slice(0, 10) >= q.startDate)
      if (q.endDate) list = list.filter((o) => o.createdAt.slice(0, 10) <= q.endDate)
      const weight = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }
      list = list.slice().sort((a, b) => {
        // 紧急置顶，其余按创建时间倒序
        if (weight[a.priority] === 4 && weight[b.priority] !== 4) return -1
        if (weight[b.priority] === 4 && weight[a.priority] !== 4) return 1
        return a.createdAt < b.createdAt ? 1 : -1
      })
      return ok(paginate(list.map(toListItem), q.page, q.pageSize))
    }
  },
  {
    url: '/api/work-orders/:id/logs',
    method: 'get',
    response: ({ query }) => {
      const list = (logs[query.id] || []).map((l) => ({
        action: l.action,
        operatorName: findUser(l.operatorId)?.realName || '系统',
        operatorRole: findUser(l.operatorId)?.role || 'SYSTEM',
        fromStatus: l.fromStatus,
        toStatus: l.toStatus,
        remark: l.remark,
        reason: l.reason,
        createdAt: l.createdAt
      }))
      return ok(list)
    }
  },
  {
    url: '/api/work-orders/:id/grab',
    method: 'post',
    response: ({ query, headers }) => {
      const user = me(headers)
      const order = getOrder(query.id)
      if (!order) return fail(3001, '工单不存在')
      if (!['ENGINEER', 'VENDOR_ENGINEER'].includes(user.role)) return fail(1002, '仅维修工可抢单')
      if (!(order.status === 'PENDING' && order.poolFlag === 1)) return fail(3000, '该工单已被抢或不在池中')
      const invalid = validateTakeOrder(user, order)
      if (invalid) return fail(invalid.code, invalid.message)
      // 契约（PR-009/PR-021）：抢单 PENDING + pool_flag=1 -> PROCESSING，同时写 accept_time
      order.status = 'PROCESSING'
      order.assigneeId = user.id
      order.assignTime = now()
      order.acceptTime = now()
      order.poolFlag = 0
      order.updatedAt = now()
      addLog(order.id, user.id, 'GRAB', 'PENDING', 'PROCESSING', '', '抢单')
      addNotification(order.reporterId, '工单已被接单', `工单 ${order.orderNo} 已被 ${user.realName} 抢单`, 'ACCEPTED', order.id)
      return ok({ id: order.id, status: order.status })
    }
  },
  {
    url: '/api/work-orders/:id/reassign-to-pool',
    method: 'post',
    response: ({ query, headers, body }) => {
      const user = me(headers)
      const order = getOrder(query.id)
      if (!order) return fail(3001, '工单不存在')
      if (!['CUSTOMER_SERVICE', 'ADMIN', 'BRANCH_ADMIN'].includes(user.role)) return fail(1002, '无权操作')
      if (!['PENDING', 'ASSIGNED'].includes(order.status)) return fail(3000, '当前状态不可入池')
      const b = parseBody(body)
      if (!b.reason) return fail(1000, '请填写入池原因')
      const from = order.status
      order.status = 'PENDING'
      order.poolFlag = 1
      order.assigneeId = null
      order.assignTime = null
      order.updatedAt = now()
      addLog(order.id, user.id, 'RETURN', from, 'PENDING', b.remark, b.reason)
      users
        .filter((u) => ['ENGINEER', 'VENDOR_ENGINEER'].includes(u.role) && u.status === 'ACTIVE')
        .forEach((u) =>
          addNotification(u.id, '工单已入池', `工单 ${order.orderNo} 已进入待抢单池`, 'ANNOUNCEMENT', order.id)
        )
      return ok({ id: order.id, status: order.status })
    }
  },
  {
    url: '/api/work-orders/:id/assign',
    method: 'post',
    response: ({ query, headers, body }) => {
      const user = me(headers)
      const order = getOrder(query.id)
      if (!order) return fail(3001, '工单不存在')
      if (!['CUSTOMER_SERVICE', 'ADMIN', 'BRANCH_ADMIN'].includes(user.role)) return fail(1002, '无权派单')
      if (order.status !== 'PENDING') return fail(3000, '当前状态不允许派单')
      const b = parseBody(body)
      const repairer = findUser(b.assigneeId)
      if (!repairer) return fail(4000, '维修工不存在')
      const invalid = validateTakeOrder(repairer, order)
      if (invalid) return fail(invalid.code, invalid.message)
      order.assigneeId = repairer.id
      if (b.priority) order.priority = b.priority
      order.status = 'ASSIGNED'
      order.poolFlag = 0
      order.assignTime = now()
      order.updatedAt = now()
      addLog(order.id, user.id, 'ASSIGN', 'PENDING', 'ASSIGNED', b.remark, null)
      addNotification(
        repairer.id,
        '新工单待接单',
        `工单 ${order.orderNo} 已派单给您，请及时处理`,
        'ASSIGNED',
        order.id
      )
      return ok({ id: order.id, status: order.status })
    }
  },
  {
    url: '/api/work-orders/:id/transfer',
    method: 'post',
    response: ({ query, headers, body }) => {
      const user = me(headers)
      const order = getOrder(query.id)
      if (!order) return fail(3001, '工单不存在')
      if (!['CUSTOMER_SERVICE', 'ADMIN', 'BRANCH_ADMIN'].includes(user.role) && order.assigneeId !== user.id) {
        return fail(1002, '无权转交')
      }
      if (!['ASSIGNED', 'PROCESSING'].includes(order.status)) return fail(3000, '当前状态不允许转交')
      const b = parseBody(body)
      if (!b.reason) return fail(1000, '请填写转交原因')
      const target = findUser(b.targetAssigneeId)
      if (!target) return fail(4000, '目标维修工不存在')
      const invalid = validateTakeOrder(target, order)
      if (invalid) return fail(invalid.code, invalid.message)
      const from = order.assigneeId
      order.assigneeId = target.id
      order.status = 'ASSIGNED'
      order.assignTime = now()
      order.acceptTime = null
      order.updatedAt = now()
      addLog(order.id, user.id, 'TRANSFER', 'PROCESSING', 'ASSIGNED', b.remark, b.reason)
      addNotification(target.id, '工单已转交给您', `工单 ${order.orderNo} 已转交给您处理`, 'ASSIGNED', order.id)
      return ok({ id: order.id, fromAssigneeId: from, status: order.status })
    }
  },
  {
    url: '/api/work-orders/:id/return',
    method: 'post',
    response: ({ query, headers, body }) => {
      const user = me(headers)
      const order = getOrder(query.id)
      if (!order) return fail(3001, '工单不存在')
      if (order.status !== 'ASSIGNED') return fail(3000, '当前状态不允许退回')
      const b = parseBody(body)
      const from = order.status
      order.assigneeId = null
      order.assignTime = null
      order.status = 'PENDING'
      // 契约：退回仅回说明，pool_flag 保持不变；是否入池由客服单独调 /to-pool
      order.updatedAt = now()
      addLog(order.id, user.id, 'RETURN', from, 'PENDING', b.remark, null)
      users
        .filter((u) => ['CUSTOMER_SERVICE', 'BRANCH_ADMIN', 'ADMIN'].includes(u.role) && u.status === 'ACTIVE')
        .forEach((cs) =>
          addNotification(cs.id, '工单被退回', `工单 ${order.orderNo} 被退回，请重新指派或入池`, 'RETURNED', order.id)
        )
      return ok({ id: order.id, status: order.status, poolFlag: order.poolFlag })
    }
  },
  {
    url: '/api/work-orders/:id/audit-appointment',
    method: 'post',
    response: ({ query, headers, body }) => {
      const user = me(headers)
      const order = getOrder(query.id)
      if (!order) return fail(3001, '工单不存在')
      if (!['ENGINEER', 'VENDOR_ENGINEER'].includes(user.role)) return fail(1002, '仅维修工可审核预约')
      const b = parseBody(body)
      if (!b.approved) {
        if (!b.newTime) return fail(1000, '改约需填写新的预约时间')
        if (!b.reason) return fail(1000, '请填写改约原因')
        order.appointmentTime = b.newTime
      }
      order.updatedAt = now()
      addLog(
        order.id,
        user.id,
        'REVIEW_RESULT',
        order.status,
        order.status,
        b.approved ? '预约时间通过' : `改约至 ${b.newTime}`,
        b.reason
      )
      addNotification(
        order.reporterId,
        b.approved ? '预约时间已确认' : '预约时间已改约',
        `工单 ${order.orderNo} ${b.approved ? '预约时间已确认' : `已改约至 ${b.newTime}`}`,
        'ASSIGNED',
        order.id
      )
      return ok({ id: order.id, appointmentTime: order.appointmentTime })
    }
  },
  {
    url: '/api/work-orders/:id/accept',
    method: 'post',
    response: ({ query, headers, body }) => {
      const user = me(headers)
      const order = getOrder(query.id)
      if (!order) return fail(3001, '工单不存在')
      if (order.status !== 'ASSIGNED') return fail(3000, '当前状态不允许接单')
      if (order.assigneeId !== user.id) return fail(1002, '仅被指派维修工可接单')
      const b = parseBody(body)
      order.status = 'PROCESSING'
      order.acceptTime = now()
      order.arriveTime = b.arriveImage ? now() : order.arriveTime || null
      order.arriveImage = b.arriveImage || order.arriveImage || null
      order.updatedAt = now()
      addLog(order.id, user.id, 'ACCEPT', 'ASSIGNED', 'PROCESSING', b.remark, null)
      addNotification(order.reporterId, '工单已被接单', `工单 ${order.orderNo} 已被接单，正在处理`, 'ACCEPTED', order.id)
      return ok({ id: order.id, status: order.status })
    }
  },
  {
    url: '/api/work-orders/:id/complete',
    method: 'post',
    response: ({ query, headers, body }) => {
      const user = me(headers)
      const order = getOrder(query.id)
      if (!order) return fail(3001, '工单不存在')
      if (order.status !== 'PROCESSING') return fail(3000, '当前状态不允许完工')
      if (order.assigneeId !== user.id) return fail(1002, '仅处理人可完工')
      const b = parseBody(body)
      const images = Array.isArray(b.images) ? b.images : []
      if (!images.length) return fail(1000, '完工需至少上传 1 张现场照片')
      order.status = 'PENDING_REVIEW'
      order.finishTime = now()
      order.finishImages = images
      order.finishRemark = b.remark || ''
      order.rejectCount = order.rejectCount || 0
      order.updatedAt = now()
      addLog(order.id, user.id, 'COMPLETE', 'PROCESSING', 'PENDING_REVIEW', b.remark, null)
      addNotification(order.reporterId, '工单已完工', `工单 ${order.orderNo} 已完工，待回访`, 'COMPLETED', order.id)
      return ok({ id: order.id, status: order.status })
    }
  },
  {
    url: '/api/work-orders/:id/reject',
    method: 'post',
    response: ({ query, headers, body }) => {
      const user = me(headers)
      const order = getOrder(query.id)
      if (!order) return fail(3001, '工单不存在')
      if (!['CUSTOMER_SERVICE', 'ADMIN', 'BRANCH_ADMIN'].includes(user.role)) return fail(1002, '无权驳回')
      if (!['COMPLETED', 'PENDING_REVIEW'].includes(order.status)) return fail(3000, '当前状态不允许驳回')
      const b = parseBody(body)
      if (!b.reason) return fail(1000, '请填写驳回原因')
      order.rejectCount = (order.rejectCount || 0) + 1
      if (order.rejectCount > 3) return fail(3000, '驳回次数已超过 3 次，请走升级督办')
      const from = order.status
      order.status = 'PROCESSING'
      order.finishTime = null
      order.updatedAt = now()
      addLog(order.id, user.id, 'REJECT', from, 'PROCESSING', b.remark, b.reason)
      addNotification(order.assigneeId, '完工被驳回', `工单 ${order.orderNo} 被驳回：${b.reason}`, 'RETURNED', order.id)
      return ok({ id: order.id, status: order.status, rejectCount: order.rejectCount })
    }
  },
  {
    url: '/api/work-orders/:id/review',
    method: 'post',
    response: ({ query, headers, body }) => {
      const user = me(headers)
      const order = getOrder(query.id)
      if (!order) return fail(3001, '工单不存在')
      if (!['CUSTOMER_SERVICE', 'ADMIN', 'BRANCH_ADMIN'].includes(user.role)) return fail(1002, '无权回访')
      if (order.status !== 'PENDING_REVIEW') return fail(3000, '当前状态不允许回访')
      const b = parseBody(body)
      if (!['SATISFIED', 'UNSATISFIED'].includes(b.result)) return fail(1000, '请选择回访结果')
      const from = order.status
      order.reviewResult = b.result
      order.reviewRemark = b.remark || ''
      if (b.result === 'SATISFIED') {
        order.status = 'CLOSED'
        order.closeTime = now()
      } else {
        order.status = 'PROCESSING'
      }
      order.updatedAt = now()
      addLog(order.id, user.id, 'REVIEW_RESULT', from, order.status, b.remark, null)
      if (b.result === 'UNSATISFIED') {
        addNotification(order.assigneeId, '回访不满意', `工单 ${order.orderNo} 回访不满意，请返工`, 'RETURNED', order.id)
      }
      return ok({ id: order.id, status: order.status })
    }
  },
  {
    url: '/api/work-orders/:id/close',
    method: 'post',
    response: ({ query, headers, body }) => {
      const user = me(headers)
      const order = getOrder(query.id)
      if (!order) return fail(3001, '工单不存在')
      if (!['COMPLETED', 'PENDING_REVIEW'].includes(order.status)) return fail(3000, '当前状态不允许关闭')
      const b = parseBody(body)
      order.status = 'CLOSED'
      order.closeTime = now()
      order.updatedAt = now()
      addLog(order.id, user.id, 'CLOSE', null, 'CLOSED', b.remark, null)
      return ok({ id: order.id, status: order.status })
    }
  },
  {
    url: '/api/work-orders/:id/cancel',
    method: 'post',
    response: ({ query, headers, body }) => {
      const user = me(headers)
      const order = getOrder(query.id)
      if (!order) return fail(3001, '工单不存在')
      const b = parseBody(body)
      const isStaff = ['CUSTOMER_SERVICE', 'ADMIN', 'BRANCH_ADMIN'].includes(user.role)
      if (order.status === 'PROCESSING' && !isStaff) {
        return fail(3000, '处理中工单取消需客服确认，请联系客服')
      }
      if (!['PENDING', 'ASSIGNED', 'PROCESSING'].includes(order.status)) {
        return fail(3000, '当前状态不允许取消')
      }
      if (!b.reason) return fail(1000, '请填写取消原因')
      const from = order.status
      order.status = 'CANCELED'
      order.cancelTime = now()
      order.updatedAt = now()
      addLog(order.id, user.id, 'CANCEL', from, 'CANCELED', b.remark, b.reason)
      addNotification(order.reporterId, '工单已取消', `工单 ${order.orderNo} 已取消`, 'CANCELED', order.id)
      return ok({ id: order.id, status: order.status })
    }
  },
  {
    url: '/api/work-orders/:id/rate',
    method: 'post',
    response: ({ query, headers, body }) => {
      const user = me(headers)
      const order = getOrder(query.id)
      if (!order) return fail(3001, '工单不存在')
      if (!['COMPLETED', 'PENDING_REVIEW'].includes(order.status)) return fail(3000, '当前状态不允许评价')
      const b = parseBody(body)
      order.rating = Number(b.rating)
      order.ratingComment = b.comment || ''
      order.ratedAt = now()
      order.reviewResult = order.reviewResult || 'SATISFIED'
      order.status = 'CLOSED'
      order.closeTime = now()
      order.updatedAt = now()
      addLog(order.id, user.id, 'RATE', 'PENDING_REVIEW', 'CLOSED', `${b.rating}星：${b.comment || ''}`, null)
      return ok({ id: order.id, status: order.status })
    }
  },
  {
    url: '/api/work-orders/:id/remarks',
    method: 'post',
    response: ({ query, headers, body }) => {
      const user = me(headers)
      const order = getOrder(query.id)
      if (!order) return fail(3001, '工单不存在')
      if (user.role === 'RESIDENT') return fail(1002, '内部备注对业主不可见、不可写')
      const b = parseBody(body)
      if (!b.content) return fail(1000, '请输入备注内容')
      const images = Array.isArray(b.images) ? b.images : []
      if (images.length > 3) return fail(1000, '每条备注最多 3 张图片')
      if (!order.remarks) order.remarks = []
      order.remarks.push({
        id: nextId(),
        operatorId: user.id,
        operatorName: user.realName,
        content: b.content,
        images,
        createdAt: now()
      })
      addLog(order.id, user.id, 'REMARK', order.status, order.status, b.content, null)
      return ok({ id: order.id })
    }
  },
  {
    url: '/api/work-orders/:id',
    method: 'get',
    response: ({ query, headers }) => {
      const order = getOrder(query.id)
      if (!order) return fail(3001, '工单不存在')
      const user = me(headers)
      if (!canViewOrder(order, user)) return fail(1002, '无权查看该工单')
      const detail = toDetail(order)
      // 业主不可见内部备注
      if (user?.role === 'RESIDENT') detail.remarks = []
      return ok(detail)
    }
  },
  {
    url: '/api/work-orders/:id',
    method: 'put',
    response: ({ query, body }) => {
      const order = getOrder(query.id)
      if (!order) return fail(3001, '工单不存在')
      if (order.status !== 'PENDING') return fail(3000, '仅待派单状态可编辑')
      const b = parseBody(body)
      Object.assign(order, {
        title: b.title ?? order.title,
        description: b.description ?? order.description,
        type: b.type ?? order.type,
        priority: b.priority ?? order.priority,
        location: b.location ?? order.location,
        building: b.building ?? order.building,
        room: b.room ?? order.room,
        elevatorId: b.elevatorId ? Number(b.elevatorId) : order.elevatorId,
        appointmentTime: b.appointmentTime ?? order.appointmentTime,
        images: Array.isArray(b.images) ? b.images : order.images,
        updatedAt: now()
      })
      return ok(toDetail(order))
    }
  },

  // ============ 统计 ============
  {
    url: '/api/stats/workbench',
    method: 'get',
    response: () => {
      const count = (s) => workOrders.filter((o) => o.status === s).length
      return ok({
        pending: count('PENDING'),
        assigned: count('ASSIGNED'),
        processing: count('PROCESSING'),
        pendingReview: count('PENDING_REVIEW'),
        pool: workOrders.filter((o) => o.status === 'PENDING' && o.poolFlag === 1).length,
        overdue: workOrders.filter(isOverdue).length,
        escalated: workOrders.filter((o) => o.escalationCount > 0).length,
        urgent: workOrders.filter(
          (o) => o.priority === 'URGENT' && !ARCHIVED.includes(o.status)
        ).length
      })
    }
  },
  {
    url: '/api/stats/overview',
    method: 'get',
    response: () => {
      const total = workOrders.length
      const cnt = (s) => workOrders.filter((o) => o.status === s).length
      const rated = workOrders.filter((o) => o.rating > 0)
      const avgRating = rated.length ? rated.reduce((s, o) => s + o.rating, 0) / rated.length : 0
      const finished = workOrders.filter((o) => o.acceptTime && o.finishTime)
      const avgHandleHours = finished.length
        ? finished.reduce(
            (s, o) =>
              s + (new Date(o.finishTime.replace(' ', 'T')) - new Date(o.acceptTime.replace(' ', 'T'))) / 3600000,
            0
          ) / finished.length
        : 0
      return ok({
        total,
        pending: cnt('PENDING'),
        assigned: cnt('ASSIGNED'),
        processing: cnt('PROCESSING'),
        pendingReview: cnt('PENDING_REVIEW'),
        completed: workOrders.filter((o) => ['COMPLETED', 'PENDING_REVIEW', 'CLOSED'].includes(o.status)).length,
        closed: cnt('CLOSED'),
        canceled: cnt('CANCELED'),
        pool: workOrders.filter((o) => o.status === 'PENDING' && o.poolFlag === 1).length,
        overdue: workOrders.filter(isOverdue).length,
        escalated: workOrders.filter((o) => o.escalationCount > 0).length,
        avgHandleHours: Number(avgHandleHours.toFixed(2)),
        avgRating: Number(avgRating.toFixed(2))
      })
    }
  },
  {
    url: '/api/stats/trend',
    method: 'get',
    response: ({ query }) => {
      const q = query || {}
      let list = workOrders.slice()
      if (q.startDate) list = list.filter((o) => o.createdAt.slice(0, 10) >= q.startDate)
      if (q.endDate) list = list.filter((o) => o.createdAt.slice(0, 10) <= q.endDate)
      const createdMap = {}
      const completedMap = {}
      list.forEach((o) => {
        const d = o.createdAt.slice(0, 10)
        createdMap[d] = (createdMap[d] || 0) + 1
      })
      workOrders.forEach((o) => {
        if (o.finishTime) {
          const d = o.finishTime.slice(0, 10)
          completedMap[d] = (completedMap[d] || 0) + 1
        }
      })
      const labels = Array.from(new Set([...Object.keys(createdMap), ...Object.keys(completedMap)])).sort()
      return ok({
        labels,
        created: labels.map((d) => createdMap[d] || 0),
        completed: labels.map((d) => completedMap[d] || 0)
      })
    }
  },
  {
    url: '/api/stats/type-distribution',
    method: 'get',
    response: () => {
      const map = {}
      workOrders.forEach((o) => {
        map[o.type] = (map[o.type] || 0) + 1
      })
      return ok(
        Object.keys(map)
          .map((type) => ({ type, count: map[type] }))
          .sort((a, b) => b.count - a.count)
      )
    }
  },
  {
    url: '/api/stats/source-distribution',
    method: 'get',
    response: () => {
      const map = {}
      workOrders.forEach((o) => {
        const s = o.source || 'USER_REPORT'
        map[s] = (map[s] || 0) + 1
      })
      return ok(Object.keys(map).map((source) => ({ source, count: map[source] })))
    }
  },
  {
    url: '/api/stats/engineer-performance',
    method: 'get',
    response: () => {
      const map = {}
      workOrders.forEach((o) => {
        if (!o.assigneeId) return
        if (!map[o.assigneeId]) map[o.assigneeId] = []
        map[o.assigneeId].push(o)
      })
      const data = Object.keys(map).map((id) => {
        const list = map[id]
        const finished = list.filter((o) => o.finishTime)
        const rated = list.filter((o) => o.rating > 0)
        const avgRating = rated.length ? rated.reduce((s, o) => s + o.rating, 0) / rated.length : 0
        const avgHandleHours = finished.length
          ? finished.reduce(
              (s, o) =>
                s + (new Date(o.finishTime.replace(' ', 'T')) - new Date(o.acceptTime.replace(' ', 'T'))) / 3600000,
              0
            ) / finished.length
          : 0
        const u = findUser(id)
        const overdue = list.filter(isOverdue).length
        return {
          engineerId: Number(id),
          engineerName: u ? u.realName : '',
          groupName: groups.find((g) => g.id === u?.groupId)?.name || '未分组',
          total: finished.length,
          avgHandleHours: Number(avgHandleHours.toFixed(2)),
          avgRating: Number(avgRating.toFixed(2)),
          overdueRate: list.length ? Math.round((overdue / list.length) * 100) : 0
        }
      })
      data.sort((a, b) => b.total - a.total || a.engineerId - b.engineerId)
      return ok(data)
    }
  },
  {
    url: '/api/stats/export',
    method: 'get',
    response: ({ query }) =>
      ok({
        taskId: nextId(),
        formats: ['EXCEL', 'CSV', 'PDF', 'PNG'],
        format: query?.format || 'EXCEL',
        message: '导出任务已提交，完成后将通过站内通知下发下载链接（保留 7 天）',
        expireDays: 7
      })
  }
]
