import { users, workOrders, logs, nextId, genOrderNo, now } from './data'

const ok = (data) => ({ code: 0, message: 'success', data })
const fail = (code, message) => ({ code, message, data: null })

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

function findUser(id) {
  return users.find((u) => u.id === Number(id))
}

function toUserVO(u) {
  const { password, ...rest } = u
  return rest
}

function toUserBrief(u) {
  if (!u) return null
  return { id: u.id, realName: u.realName, phone: u.phone }
}

function toListItem(o) {
  const reporter = findUser(o.reporterId)
  const assignee = findUser(o.assigneeId)
  return {
    id: o.id,
    orderNo: o.orderNo,
    title: o.title,
    type: o.type,
    priority: o.priority,
    status: o.status,
    reporterName: reporter ? reporter.realName : '',
    assigneeName: assignee ? assignee.realName : null,
    createdAt: o.createdAt
  }
}

function toDetail(o) {
  return {
    ...o,
    reporter: toUserBrief(findUser(o.reporterId)),
    assignee: toUserBrief(findUser(o.assigneeId))
  }
}

function addLog(orderId, operatorId, action, fromStatus, toStatus, remark) {
  if (!logs[orderId]) logs[orderId] = []
  logs[orderId].push({
    id: nextId(),
    orderId,
    operatorId,
    action,
    fromStatus,
    toStatus,
    remark: remark || '',
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

export default [
  // ============ 认证模块 ============
  {
    url: '/api/auth/login',
    method: 'post',
    response: ({ body }) => {
      const b = parseBody(body)
      const user = users.find((u) => u.username === b.username && u.password === b.password)
      if (!user) return fail(2001, '用户名或密码错误')
      return ok({
        token: `mock-token-${user.id}`,
        user: { id: user.id, username: user.username, realName: user.realName, role: user.role }
      })
    }
  },
  {
    url: '/api/auth/logout',
    method: 'post',
    response: () => ok(null)
  },
  {
    url: '/api/auth/me',
    method: 'get',
    response: ({ headers }) => {
      const user = findUser(getUserId(headers))
      if (!user) return fail(2000, '未登录或 token 无效')
      return ok(toUserVO(user))
    }
  },

  // ============ 用户模块 ============
  {
    url: '/api/users/engineers',
    method: 'get',
    response: () => {
      const list = users
        .filter((u) => u.role === 'ENGINEER' && u.status === 'ACTIVE')
        .map(toUserBrief)
      return ok(list)
    }
  },
  {
    url: '/api/users',
    method: 'get',
    response: ({ query }) => {
      const { keyword, role, status } = query || {}
      let list = users.slice()
      if (keyword) {
        list = list.filter(
          (u) => u.username.includes(keyword) || u.realName.includes(keyword) || (u.phone || '').includes(keyword)
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
        role: b.role,
        status: b.status || 'ACTIVE',
        createdAt: now(),
        updatedAt: now()
      }
      users.push(user)
      return ok(toUserVO(user))
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
        realName: b.realName ?? user.realName,
        phone: b.phone ?? user.phone,
        email: b.email ?? user.email,
        role: b.role ?? user.role,
        status: b.status ?? user.status,
        updatedAt: now()
      })
      return ok(toUserVO(user))
    }
  },
  {
    url: '/api/users/:id',
    method: 'delete',
    response: ({ query }) => {
      const idx = users.findIndex((u) => u.id === Number(query.id))
      if (idx === -1) return fail(4000, '用户不存在')
      users.splice(idx, 1)
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
      user.password = b.newPassword || b.password || '123456'
      user.updatedAt = now()
      return ok(null)
    }
  },

  // ============ 工单模块 ============
  {
    url: '/api/work-orders',
    method: 'post',
    response: ({ headers, body }) => {
      const operatorId = getUserId(headers)
      const b = parseBody(body)
      const order = {
        id: nextId(),
        orderNo: genOrderNo(),
        title: b.title,
        description: b.description || '',
        type: b.type,
        priority: b.priority || 'MEDIUM',
        status: 'PENDING',
        images: Array.isArray(b.images) ? b.images : [],
        reporterId: operatorId,
        assigneeId: null,
        assignTime: null,
        acceptTime: null,
        finishTime: null,
        closeTime: null,
        rating: 0,
        ratingComment: null,
        createdAt: now(),
        updatedAt: now()
      }
      workOrders.unshift(order)
      addLog(order.id, operatorId, 'CREATE', null, 'PENDING', '创建工单')
      return ok({ id: order.id, orderNo: order.orderNo, status: order.status })
    }
  },
  {
    url: '/api/work-orders',
    method: 'get',
    response: ({ query }) => {
      const q = query || {}
      let list = workOrders.slice()
      if (q.status) list = list.filter((o) => o.status === q.status)
      if (q.type) list = list.filter((o) => o.type === q.type)
      if (q.priority) list = list.filter((o) => o.priority === q.priority)
      if (q.assigneeId) list = list.filter((o) => o.assigneeId === Number(q.assigneeId))
      if (q.reporterId) list = list.filter((o) => o.reporterId === Number(q.reporterId))
      if (q.keyword) {
        const kw = q.keyword
        list = list.filter((o) => o.title.includes(kw) || o.orderNo.includes(kw))
      }
      if (q.startDate) list = list.filter((o) => o.createdAt.slice(0, 10) >= q.startDate)
      if (q.endDate) list = list.filter((o) => o.createdAt.slice(0, 10) <= q.endDate)
      const data = paginate(list.map(toListItem), q.page, q.pageSize)
      return ok(data)
    }
  },
  {
    url: '/api/work-orders/:id/logs',
    method: 'get',
    response: ({ query }) => {
      const list = (logs[query.id] || []).map((l) => ({
        action: l.action,
        operatorName: findUser(l.operatorId)?.realName || '',
        fromStatus: l.fromStatus,
        toStatus: l.toStatus,
        remark: l.remark,
        createdAt: l.createdAt
      }))
      return ok(list)
    }
  },
  {
    url: '/api/work-orders/:id/assign',
    method: 'post',
    response: ({ query, headers, body }) => {
      const order = getOrder(query.id)
      if (!order) return fail(3001, '工单不存在')
      if (order.status !== 'PENDING') return fail(3000, '当前状态不允许派单')
      const b = parseBody(body)
      order.assigneeId = Number(b.assigneeId)
      order.status = 'ASSIGNED'
      order.assignTime = now()
      order.updatedAt = now()
      addLog(order.id, getUserId(headers), 'ASSIGN', 'PENDING', 'ASSIGNED', b.remark)
      return ok({ id: order.id, orderNo: order.orderNo, status: order.status })
    }
  },
  {
    url: '/api/work-orders/:id/accept',
    method: 'post',
    response: ({ query, headers, body }) => {
      const order = getOrder(query.id)
      if (!order) return fail(3001, '工单不存在')
      if (order.status !== 'ASSIGNED') return fail(3000, '当前状态不允许接单')
      const b = parseBody(body)
      order.status = 'PROCESSING'
      order.acceptTime = now()
      order.updatedAt = now()
      addLog(order.id, getUserId(headers), 'ACCEPT', 'ASSIGNED', 'PROCESSING', b.remark)
      return ok({ id: order.id, orderNo: order.orderNo, status: order.status })
    }
  },
  {
    url: '/api/work-orders/:id/complete',
    method: 'post',
    response: ({ query, headers, body }) => {
      const order = getOrder(query.id)
      if (!order) return fail(3001, '工单不存在')
      if (order.status !== 'PROCESSING') return fail(3000, '当前状态不允许完工')
      const b = parseBody(body)
      order.status = 'COMPLETED'
      order.finishTime = now()
      order.updatedAt = now()
      addLog(order.id, getUserId(headers), 'COMPLETE', 'PROCESSING', 'COMPLETED', b.remark)
      return ok({ id: order.id, orderNo: order.orderNo, status: order.status })
    }
  },
  {
    url: '/api/work-orders/:id/close',
    method: 'post',
    response: ({ query, headers, body }) => {
      const order = getOrder(query.id)
      if (!order) return fail(3001, '工单不存在')
      if (order.status !== 'COMPLETED') return fail(3000, '当前状态不允许关闭')
      const b = parseBody(body)
      order.status = 'CLOSED'
      order.closeTime = now()
      order.updatedAt = now()
      addLog(order.id, getUserId(headers), 'CLOSE', 'COMPLETED', 'CLOSED', b.remark)
      return ok({ id: order.id, orderNo: order.orderNo, status: order.status })
    }
  },
  {
    url: '/api/work-orders/:id/cancel',
    method: 'post',
    response: ({ query, headers, body }) => {
      const order = getOrder(query.id)
      if (!order) return fail(3001, '工单不存在')
      if (!['PENDING', 'ASSIGNED'].includes(order.status)) return fail(3000, '当前状态不允许取消')
      const b = parseBody(body)
      const from = order.status
      order.status = 'CANCELED'
      order.updatedAt = now()
      addLog(order.id, getUserId(headers), 'CANCEL', from, 'CANCELED', b.remark)
      return ok({ id: order.id, orderNo: order.orderNo, status: order.status })
    }
  },
  {
    url: '/api/work-orders/:id/rate',
    method: 'post',
    response: ({ query, headers, body }) => {
      const order = getOrder(query.id)
      if (!order) return fail(3001, '工单不存在')
      if (!['COMPLETED', 'CLOSED'].includes(order.status)) return fail(3000, '当前状态不允许评价')
      const b = parseBody(body)
      order.rating = Number(b.rating)
      order.ratingComment = b.comment || ''
      order.updatedAt = now()
      addLog(order.id, getUserId(headers), 'RATE', order.status, order.status, `${b.rating}星：${b.comment || ''}`)
      return ok({ id: order.id, orderNo: order.orderNo, status: order.status })
    }
  },
  {
    url: '/api/work-orders/:id',
    method: 'get',
    response: ({ query }) => {
      const order = getOrder(query.id)
      if (!order) return fail(3001, '工单不存在')
      return ok(toDetail(order))
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
        images: Array.isArray(b.images) ? b.images : order.images,
        updatedAt: now()
      })
      return ok(toDetail(order))
    }
  },

  // ============ 统计报表模块 ============
  {
    url: '/api/stats/overview',
    method: 'get',
    response: () => {
      const total = workOrders.length
      const pending = workOrders.filter((o) => o.status === 'PENDING').length
      const processing = workOrders.filter((o) => o.status === 'PROCESSING').length
      const completed = workOrders.filter((o) => o.status === 'COMPLETED').length
      const closed = workOrders.filter((o) => o.status === 'CLOSED').length
      const rated = workOrders.filter((o) => o.rating > 0)
      const avgRating = rated.length ? rated.reduce((s, o) => s + o.rating, 0) / rated.length : 0
      const finished = workOrders.filter((o) => o.acceptTime && o.finishTime)
      const avgHandleHours = finished.length
        ? finished.reduce((s, o) => {
            const h = (new Date(o.finishTime).getTime() - new Date(o.acceptTime).getTime()) / 3600000
            return s + h
          }, 0) / finished.length
        : 0
      return ok({
        total,
        pending,
        processing,
        completed,
        closed,
        avgHandleHours: Number(avgHandleHours.toFixed(1)),
        avgRating: Number(avgRating.toFixed(1))
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
      const map = {}
      list.forEach((o) => {
        const d = o.createdAt.slice(0, 10)
        map[d] = (map[d] || 0) + 1
      })
      const data = Object.keys(map)
        .sort()
        .map((date) => ({ date, count: map[date] }))
      return ok(data)
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
      const data = Object.keys(map).map((type) => ({ type, count: map[type] }))
      return ok(data)
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
        const rated = list.filter((o) => o.rating > 0)
        const finished = list.filter((o) => o.acceptTime && o.finishTime)
        const avgRating = rated.length ? rated.reduce((s, o) => s + o.rating, 0) / rated.length : 0
        const avgHandleHours = finished.length
          ? finished.reduce((s, o) => {
              const h = (new Date(o.finishTime).getTime() - new Date(o.acceptTime).getTime()) / 3600000
              return s + h
            }, 0) / finished.length
          : 0
        const u = findUser(id)
        return {
          engineerId: Number(id),
          engineerName: u ? u.realName : '',
          totalOrders: list.length,
          avgHandleHours: Number(avgHandleHours.toFixed(1)),
          avgRating: Number(avgRating.toFixed(1))
        }
      })
      return ok(data)
    }
  },
  {
    url: '/api/stats/export',
    method: 'get',
    response: () => ok({ message: '导出任务已创建' })
  }
]
