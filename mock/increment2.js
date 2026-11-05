// 证书审核 / 巡检 / 维保 Mock（对齐 PR-008 / PR-017 / PR-018）
import { users, workOrders, elevators, groups, communities, nextId, now } from './data'

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

const me = (headers) => users.find((u) => u.id === getUserId(headers)) || null
const findUser = (id) => users.find((u) => u.id === Number(id))
const today = () => now().slice(0, 10)
const isStaff = (u) => ['CUSTOMER_SERVICE', 'ADMIN', 'BRANCH_ADMIN'].includes(u?.role)

function paginate(list, page, pageSize) {
  const p = Number(page) || 1
  const ps = Number(pageSize) || 20
  return { list: list.slice((p - 1) * ps, p * ps), total: list.length, page: p, pageSize: ps }
}

// ============ 证书 ============
const repairerTags = [
  { id: 1, tagCode: 'LIFT_CERT', tagName: '电梯作业证', certLevel: 'L2', sortNo: 1, status: 'ACTIVE', remark: '特种设备作业人员证' },
  { id: 2, tagCode: 'ELECTRIC_CERT', tagName: '电工作业证', certLevel: 'L2', sortNo: 2, status: 'ACTIVE', remark: '' },
  { id: 3, tagCode: 'FIRE_CERT', tagName: '消防设施操作员', certLevel: 'L1', sortNo: 3, status: 'ACTIVE', remark: '' },
  { id: 4, tagCode: 'WATER_CERT', tagName: '给排水作业证', certLevel: '', sortNo: 4, status: 'ACTIVE', remark: '建议类' },
  { id: 5, tagCode: 'AIR_CERT', tagName: '制冷空调作业证', certLevel: '', sortNo: 5, status: 'ACTIVE', remark: '建议类' }
]

const typeCertMappings = [
  { workOrderType: 'LIFT', requirement: 'FORCE', tagCode: 'LIFT_CERT', tagName: '电梯作业证' },
  { workOrderType: 'ELECTRIC', requirement: 'FORCE', tagCode: 'ELECTRIC_CERT', tagName: '电工作业证' },
  { workOrderType: 'FIRE', requirement: 'FORCE', tagCode: 'FIRE_CERT', tagName: '消防设施操作员' },
  { workOrderType: 'WATER', requirement: 'SUGGEST', tagCode: 'WATER_CERT', tagName: '给排水作业证' },
  { workOrderType: 'AIR', requirement: 'SUGGEST', tagCode: 'AIR_CERT', tagName: '制冷空调作业证' },
  { workOrderType: 'CLEANING', requirement: 'NONE', tagCode: null, tagName: null },
  { workOrderType: 'SECURITY', requirement: 'NONE', tagCode: null, tagName: null },
  { workOrderType: 'OTHER', requirement: 'NONE', tagCode: null, tagName: null }
]

const certificates = [
  {
    id: 1, engineerId: 3, tagCode: 'LIFT_CERT', tagName: '电梯作业证', skillLevel: 2,
    certNo: 'TS-LIFT-2024-0011', issueDate: '2024-01-10', expireDate: '2027-12-31',
    status: 'APPROVED', rejectCount: 0, images: [], remark: '', createdAt: '2026-10-20 09:00:00',
    timeline: [
      { action: 'SUBMIT', operatorName: '李师傅', remark: '', createdAt: '2026-10-20 09:00:00' },
      { action: 'APPROVE', operatorName: '客服小王', remark: '', createdAt: '2026-10-20 10:20:00' }
    ]
  },
  {
    id: 2, engineerId: 4, tagCode: 'LIFT_CERT', tagName: '电梯作业证', skillLevel: 2,
    certNo: 'TS-LIFT-2021-0088', issueDate: '2021-02-01', expireDate: '2026-11-15',
    status: 'APPROVED', rejectCount: 0, images: [], remark: '', createdAt: '2026-10-21 09:00:00',
    timeline: [{ action: 'SUBMIT', operatorName: '王师傅', remark: '', createdAt: '2026-10-21 09:00:00' }]
  },
  {
    id: 3, engineerId: 4, tagCode: 'FIRE_CERT', tagName: '消防设施操作员', skillLevel: 1,
    certNo: 'XF-2025-0321', issueDate: '2025-03-01', expireDate: '2028-03-01',
    status: 'PENDING', rejectCount: 0, images: [], remark: '新提交', createdAt: '2026-11-04 09:00:00',
    timeline: [{ action: 'SUBMIT', operatorName: '王师傅', remark: '新提交', createdAt: '2026-11-04 09:00:00' }]
  },
  {
    id: 4, engineerId: 9, tagCode: 'LIFT_CERT', tagName: '电梯作业证', skillLevel: 1,
    certNo: 'TS-LIFT-2025-0100', issueDate: '2025-05-01', expireDate: '2026-10-01',
    status: 'REJECTED', rejectCount: 2, images: [], remark: '', createdAt: '2026-10-25 09:00:00',
    timeline: [
      { action: 'SUBMIT', operatorName: '外委赵师傅', remark: '', createdAt: '2026-10-25 09:00:00' },
      { action: 'REJECT', operatorName: '客服小王', remark: '证书编号与图片不一致', createdAt: '2026-10-25 10:00:00' },
      { action: 'RE_SUBMIT', operatorName: '外委赵师傅', remark: '已重新上传', createdAt: '2026-10-26 09:00:00' },
      { action: 'REJECT', operatorName: '客服小王', remark: '有效期已过', createdAt: '2026-10-26 10:00:00' }
    ]
  }
]

function decorateCert(c) {
  const expired = !!c.expireDate && c.expireDate < today()
  const waitHours = Number(((Date.now() - new Date(c.createdAt.replace(' ', 'T')).getTime()) / 3600000).toFixed(1))
  return {
    ...c,
    engineerName: findUser(c.engineerId)?.realName || '',
    expired,
    reviewWaitHours: waitHours,
    slaOverdue: c.status === 'PENDING' && waitHours > 24
  }
}

// ============ 巡检 ============
const pointTemplates = [
  {
    id: 1, templateCode: 'TPL-LIFT-01', templateName: '电梯月度巡检模板', elevatorType: 'PASSENGER',
    status: 'ACTIVE', pointCount: 4,
    points: [
      { id: 1, pointName: '轿厢照明', sortNo: 1, severity: 'MEDIUM' },
      { id: 2, pointName: '层门开合', sortNo: 2, severity: 'URGENT' },
      { id: 3, pointName: '紧急呼叫按钮', sortNo: 3, severity: 'URGENT' },
      { id: 4, pointName: '机房温湿度', sortNo: 4, severity: 'LOW' }
    ]
  }
]

const inspectionPlans = [
  {
    id: 1,
    planName: '金桂园电梯月度巡检',
    branchId: 1,
    branchName: '金桂园小区',
    frequency: 'MONTHLY',
    frequencyTime: '09:00',
    pointTemplateId: 1,
    templateName: '电梯月度巡检模板',
    effectiveFrom: '2026-10-01',
    effectiveTo: '',
    autoGenerate: true,
    status: 'ENABLED',
    taskCount: 2
  }
]

const inspectionTasks = [
  {
    id: 1, taskNo: 'IN202610300001', planId: 1, planName: '金桂园电梯月度巡检', elevatorId: 1,
    elevatorNo: 'JG-A1-01', scheduledTime: '2026-10-30 09:00:00', actualTime: '2026-10-30 09:40:00',
    assigneeId: 3, status: 'COMPLETED', overdue: false, abnormalCount: 1,
    points: [
      { id: 1, pointName: '轿厢照明', severity: 'MEDIUM', result: 'NORMAL', remark: '' },
      { id: 2, pointName: '层门开合', severity: 'URGENT', result: 'ABNORMAL', remark: '关门有异响', images: [] },
      { id: 3, pointName: '紧急呼叫按钮', severity: 'URGENT', result: 'NORMAL', remark: '' },
      { id: 4, pointName: '机房温湿度', severity: 'LOW', result: 'NORMAL', remark: '' }
    ],
    sourceWorkOrderIds: [9]
  },
  {
    id: 2, taskNo: 'IN202611010001', planId: 1, planName: '金桂园电梯月度巡检', elevatorId: 2,
    elevatorNo: 'JG-A2-01', scheduledTime: '2026-11-01 09:00:00', actualTime: '',
    assigneeId: 4, status: 'ASSIGNED', overdue: true, abnormalCount: 0, points: []
  }
]

// ============ 维保 ============
const maintenancePlans = [
  { id: 1, planName: '金桂园电梯季度维保', branchId: 1, branchName: '金桂园小区', cycleType: 'QUARTERLY', effectiveFrom: '2026-10-01', effectiveTo: '', autoGenerate: true, status: 'ACTIVE', taskCount: 3 }
]

const maintenanceTasks = [
  {
    id: 1, taskNo: 'MT202610280001', planId: 1, planName: '金桂园电梯季度维保', elevatorId: 1,
    elevatorNo: 'JG-A1-01', scheduledTime: '2026-10-28 09:00:00', actualTime: '2026-10-28 10:30:00',
    assigneeId: 4, status: 'COMPLETED', poolFlag: 0, overdue: true, rejectCount: 0,
    finishImages: [], finishRemark: '已完成季度维保'
  },
  {
    id: 2, taskNo: 'MT202611010001', planId: 1, planName: '金桂园电梯季度维保', elevatorId: 2,
    elevatorNo: 'JG-A2-01', scheduledTime: '2026-11-01 09:00:00', actualTime: '',
    assigneeId: null, status: 'PENDING', poolFlag: 1, overdue: false, rejectCount: 0,
    finishImages: [], finishRemark: ''
  }
]

function decorateTask(t) {
  return {
    ...t,
    assigneeName: findUser(t.assigneeId)?.realName || '',
    overdue: t.overdue || (!!t.scheduledTime && t.scheduledTime < now() && !['COMPLETED', 'CONFIRMED', 'CANCELED'].includes(t.status))
  }
}

export default [
  // ============ 证书 ============
  {
    url: '/api/certificates/:id/approve',
    method: 'post',
    response: ({ query, headers }) => {
      const user = me(headers)
      if (!isStaff(user)) return fail(1002, '无权审核')
      const c = certificates.find((x) => x.id === Number(query.id))
      if (!c) return fail(1001, '证书不存在')
      if (c.status !== 'PENDING') return fail(3000, '当前状态不可审核')
      c.status = 'APPROVED'
      c.timeline.push({ action: 'APPROVE', operatorName: user.realName, remark: '', createdAt: now() })
      return ok(null)
    }
  },
  {
    url: '/api/certificates/:id/reject',
    method: 'post',
    response: ({ query, headers, body }) => {
      const user = me(headers)
      if (!isStaff(user)) return fail(1002, '无权审核')
      const c = certificates.find((x) => x.id === Number(query.id))
      if (!c) return fail(1001, '证书不存在')
      const b = parseBody(body)
      if (!b.reason) return fail(1000, '驳回原因必填')
      c.rejectCount += 1
      c.status = c.rejectCount >= 3 ? 'LOCKED' : 'REJECTED'
      c.timeline.push({ action: 'REJECT', operatorName: user.realName, remark: b.reason, createdAt: now() })
      return ok(null)
    }
  },
  {
    url: '/api/certificates/:id/revoke',
    method: 'post',
    response: ({ query, headers, body }) => {
      const user = me(headers)
      if (user?.role !== 'ADMIN') return fail(1002, '仅管理员可撤证')
      const c = certificates.find((x) => x.id === Number(query.id))
      if (!c) return fail(1001, '证书不存在')
      const b = parseBody(body)
      if (!b.reason) return fail(1000, '撤销原因必填')
      c.status = 'REVOKED'
      c.timeline.push({ action: 'REVOKE', operatorName: user.realName, remark: b.reason, createdAt: now() })
      return ok(null)
    }
  },
  {
    url: '/api/certificates/:id/unlock',
    method: 'post',
    response: ({ query, headers }) => {
      const user = me(headers)
      if (!isStaff(user)) return fail(1002, '无权解锁')
      const c = certificates.find((x) => x.id === Number(query.id))
      if (!c) return fail(1001, '证书不存在')
      if (c.status !== 'LOCKED') return fail(3000, '仅锁定状态可解锁')
      c.status = 'REJECTED'
      c.rejectCount = 0
      c.timeline.push({ action: 'UNLOCK', operatorName: user.realName, remark: '', createdAt: now() })
      return ok(null)
    }
  },
  {
    url: '/api/certificates/mine',
    method: 'get',
    response: ({ headers, query }) => {
      const user = me(headers)
      let list = certificates.filter((c) => c.engineerId === user?.id).map(decorateCert)
      if (query?.status) list = list.filter((c) => c.status === query.status)
      return ok({ list })
    }
  },
  {
    url: '/api/certificates/eligibility',
    method: 'get',
    response: ({ query }) => {
      const mapping = typeCertMappings.find((m) => m.workOrderType === query.workOrderType)
      const engineerId = Number(query.engineerId)
      const tagCode = mapping?.tagCode
      const owned = certificates.filter(
        (c) =>
          c.engineerId === engineerId &&
          c.tagCode === tagCode &&
          c.status === 'APPROVED' &&
          (!c.expireDate || c.expireDate >= today())
      )
      return ok({
        engineerId,
        workOrderType: query.workOrderType,
        requirement: mapping?.requirement || 'NONE',
        tagCode: tagCode || null,
        eligible: (mapping?.requirement || 'NONE') !== 'FORCE' || owned.length > 0,
        missingTags: (mapping?.requirement === 'FORCE' && !owned.length && tagCode) ? [tagCode] : [],
        expiredTags: []
      })
    }
  },
  {
    url: '/api/certificates/:id/resubmit',
    method: 'post',
    response: ({ query, body }) => {
      const c = certificates.find((x) => x.id === Number(query.id))
      if (!c) return fail(1001, '证书不存在')
      if (c.status === 'LOCKED') return fail(3000, '证书已锁定，需管理员解锁')
      const b = parseBody(body)
      Object.assign(c, {
        status: 'PENDING',
        certNo: b.certNo ?? c.certNo,
        certLevel: b.certLevel ?? c.certLevel,
        issueDate: b.issueDate ?? c.issueDate,
        expireDate: b.expireDate ?? c.expireDate,
        imageUrls: b.imageUrls || c.imageUrls,
        updatedAt: now()
      })
      return ok({ id: c.id, status: c.status, rejectCount: c.rejectCount })
    }
  },
  {
    url: '/api/certificates/:id',
    method: 'get',
    response: ({ query }) => {
      const c = certificates.find((x) => x.id === Number(query.id))
      if (!c) return fail(1001, '证书不存在')
      return ok({ ...decorateCert(c), inFlightCount: 1 })
    }
  },
  {
    url: '/api/certificates',
    method: 'get',
    response: ({ query }) => {
      let list = certificates.map(decorateCert)
      if (query?.status) list = list.filter((c) => c.status === query.status)
      if (query?.tagCode) list = list.filter((c) => c.tagCode === query.tagCode)
      if (query?.keyword) {
        list = list.filter(
          (c) => c.engineerName.includes(query.keyword) || (c.certNo || '').includes(query.keyword)
        )
      }
      list.sort((a, b) => {
        const w = { PENDING: 0, LOCKED: 1, REJECTED: 2, APPROVED: 3, REVOKED: 4 }
        return (w[a.status] ?? 9) - (w[b.status] ?? 9)
      })
      return ok(paginate(list, query?.page, query?.pageSize))
    }
  },
  {
    url: '/api/repairer-tags',
    method: 'get',
    response: ({ query }) => {
      let list = repairerTags.slice()
      if (query?.status) list = list.filter((t) => t.status === query.status)
      return ok({ list: list.sort((a, b) => a.sortNo - b.sortNo) })
    }
  },
  {
    url: '/api/repairer-tags',
    method: 'post',
    response: ({ body }) => {
      const b = parseBody(body)
      if (repairerTags.some((t) => t.tagCode === b.tagCode)) return fail(3002, '标签编码已存在')
      const tag = {
        id: nextId(),
        tagCode: b.tagCode,
        tagName: b.tagName,
        certLevel: b.certLevel || '',
        sortNo: b.sortNo || 0,
        status: b.status || 'ACTIVE',
        remark: b.remark || ''
      }
      repairerTags.push(tag)
      return ok(tag)
    }
  },
  {
    url: '/api/repairer-tags/:id',
    method: 'put',
    response: ({ query, body }) => {
      const t = repairerTags.find((x) => x.id === Number(query.id))
      if (!t) return fail(1001, '标签不存在')
      const b = parseBody(body)
      Object.assign(t, {
        tagName: b.tagName ?? t.tagName,
        certLevel: b.certLevel ?? t.certLevel,
        sortNo: b.sortNo ?? t.sortNo,
        status: b.status ?? t.status,
        remark: b.remark ?? t.remark
      })
      return ok(t)
    }
  },
  {
    url: '/api/repairer-tags/:id',
    method: 'delete',
    response: ({ query }) => {
      const idx = repairerTags.findIndex((x) => x.id === Number(query.id))
      if (idx < 0) return fail(1001, '标签不存在')
      if (certificates.some((c) => c.tagCode === repairerTags[idx].tagCode)) {
        return fail(3002, '标签已被证书引用，不可删除')
      }
      repairerTags.splice(idx, 1)
      return ok(null)
    }
  },
  {
    url: '/api/type-cert-mappings',
    method: 'get',
    response: () => ok({ list: typeCertMappings })
  },
  {
    url: '/api/type-cert-mappings/:type',
    method: 'put',
    response: ({ query, body }) => {
      const m = typeCertMappings.find((x) => x.workOrderType === query.type)
      if (!m) return fail(1001, '映射不存在')
      const b = parseBody(body)
      if (b.requirement !== 'NONE' && !repairerTags.some((t) => t.tagCode === b.tagCode && t.status === 'ACTIVE')) {
        return fail(1000, '证书标签不存在或已停用')
      }
      m.requirement = b.requirement
      m.tagCode = b.requirement === 'NONE' ? null : b.tagCode
      m.tagName = b.requirement === 'NONE' ? null : repairerTags.find((t) => t.tagCode === b.tagCode)?.tagName
      return ok(m)
    }
  },

  // ============ 巡检 ============
  {
    url: '/api/inspection/point-templates',
    method: 'get',
    response: () => ok({ list: pointTemplates })
  },
  {
    url: '/api/inspection/point-templates',
    method: 'post',
    response: ({ body }) => {
      const b = parseBody(body)
      if (pointTemplates.some((t) => t.templateCode === b.templateCode)) return fail(3002, '模板编码已存在')
      const tpl = {
        id: nextId(),
        templateCode: b.templateCode,
        templateName: b.templateName,
        elevatorType: b.elevatorType || 'PASSENGER',
        status: b.status || 'ACTIVE',
        points: (b.points || []).map((p, i) => ({ id: nextId(), ...p, sortNo: i + 1 })),
        pointCount: (b.points || []).length
      }
      pointTemplates.push(tpl)
      return ok(tpl)
    }
  },
  {
    url: '/api/inspection/plans/:id/generate',
    method: 'post',
    response: ({ query, body }) => {
      const plan = inspectionPlans.find((p) => p.id === Number(query.id))
      if (!plan) return fail(1001, '计划不存在')
      const b = parseBody(body)
      if (!b.startDate || !b.endDate) return fail(1000, 'startDate/endDate 必填')
      let generated = 0
      let skipped = 0
      elevators
        .filter((e) => e.status === 'ACTIVE')
        .forEach((e) => {
          if (inspectionTasks.some((t) => t.elevatorId === e.id && t.scheduledTime.startsWith(b.startDate))) {
            skipped += 1
            return
          }
          inspectionTasks.unshift({
            id: nextId(),
            taskNo: `IN${today().replace(/-/g, '')}${String(inspectionTasks.length + 1).padStart(4, '0')}`,
            planId: plan.id,
            planName: plan.planName,
            elevatorId: e.id,
            elevatorNo: e.elevatorNo,
            scheduledTime: `${b.startDate} 09:00:00`,
            actualTime: '',
            assigneeId: null,
            status: 'PENDING',
            overdue: false,
            abnormalCount: 0,
            points: []
          })
          generated += 1
        })
      plan.taskCount += generated
      return ok({ generated, skipped, unassigned: generated, errors: [] })
    }
  },
  {
    url: '/api/inspection/plans',
    method: 'get',
    response: ({ query }) => {
      let list = inspectionPlans.slice()
      if (query?.status) list = list.filter((p) => p.status === query.status)
      if (query?.branchId) list = list.filter((p) => p.branchId === Number(query.branchId))
      return ok(paginate(list, query?.page, query?.pageSize))
    }
  },
  {
    url: '/api/inspection/plans',
    method: 'post',
    response: ({ body }) => {
      const b = parseBody(body)
      if (inspectionPlans.some((p) => p.branchId === Number(b.branchId) && p.status === 'ENABLED')) {
        return fail(3002, '该小区已存在启用中的巡检计划')
      }
      const template = pointTemplates.find((t) => t.id === Number(b.pointTemplateId))
      const plan = {
        id: nextId(),
        ...b,
        branchId: Number(b.branchId),
        pointTemplateId: Number(b.pointTemplateId),
        branchName: communities.find((c) => c.id === Number(b.branchId))?.name || '金桂园小区',
        templateName: template?.templateName || '',
        status: 'ENABLED',
        taskCount: 0
      }
      inspectionPlans.push(plan)
      return ok(plan)
    }
  },
  {
    url: '/api/inspection/plans/:id',
    method: 'put',
    response: ({ query, body }) => {
      const p = inspectionPlans.find((x) => x.id === Number(query.id))
      if (!p) return fail(1001, '计划不存在')
      Object.assign(p, parseBody(body))
      return ok(p)
    }
  },
  {
    url: '/api/inspection/tasks/:id/reject',
    method: 'post',
    response: ({ query, headers, body }) => {
      const user = me(headers)
      if (!isStaff(user)) return fail(1002, '无权驳回')
      const t = inspectionTasks.find((x) => x.id === Number(query.id))
      if (!t) return fail(1001, '任务不存在')
      const b = parseBody(body)
      if (!b.reason) return fail(1000, '驳回原因必填')
      t.status = 'REJECTED'
      t.remark = b.reason
      return ok(null)
    }
  },
  {
    url: '/api/inspection/overview',
    method: 'get',
    response: ({ query }) => {
      const branchId = query?.branchId ? Number(query.branchId) : 1
      const list = elevators
        .filter((e) => !branchId || e.communityId === branchId || e.branchId === branchId)
        .map((e) => {
          const tasks = inspectionTasks.filter((t) => t.elevatorId === e.id)
          const latest = tasks.sort((a, b) => (a.scheduledTime < b.scheduledTime ? 1 : -1))[0]
          return {
            elevatorId: e.id,
            elevatorNo: e.elevatorNo,
            lastInspectionTime: latest?.actualTime || latest?.scheduledTime || null,
            overallStatus: latest ? (latest.abnormalCount > 0 ? 'ABNORMAL' : 'NORMAL') : 'UNKNOWN'
          }
        })
      return ok({ branchId, list })
    }
  },
  {
    url: '/api/inspection/tasks/:id/points',
    method: 'get',
    response: ({ query }) => {
      const t = inspectionTasks.find((x) => x.id === Number(query.id))
      if (!t) return fail(1001, '任务不存在')
      return ok({ list: t.points || [] })
    }
  },
  {
    url: '/api/inspection/tasks/:id/points/:pid',
    method: 'put',
    response: ({ query, body }) => {
      const t = inspectionTasks.find((x) => x.id === Number(query.id))
      if (!t) return fail(1001, '任务不存在')
      const point = (t.points || []).find((p) => p.id === Number(query.pid))
      if (!point) return fail(1001, '点位不存在')
      const b = parseBody(body)
      if (!b.result) return fail(1000, '点位结果必填')
      if (b.result === 'ABNORMAL' && (!b.remark || !(b.images || []).length)) {
        return fail(1000, '异常点位需备注与照片')
      }
      point.result = b.result
      point.remark = b.remark || ''
      point.images = b.images || []
      point.checkedAt = now()
      t.abnormalCount = (t.points || []).filter((p) => p.result === 'ABNORMAL').length
      return ok({ pointId: point.id, result: point.result, checkedAt: point.checkedAt })
    }
  },
  {
    url: '/api/inspection/tasks/:id/accept',
    method: 'post',
    response: ({ query }) => {
      const t = inspectionTasks.find((x) => x.id === Number(query.id))
      if (!t) return fail(1001, '任务不存在')
      if (t.status !== 'ASSIGNED') return fail(3000, '当前状态不允许接单')
      t.status = 'PROCESSING'
      return ok({ id: t.id, status: t.status })
    }
  },
  {
    url: '/api/inspection/tasks/:id/submit',
    method: 'post',
    response: ({ query }) => {
      const t = inspectionTasks.find((x) => x.id === Number(query.id))
      if (!t) return fail(1001, '任务不存在')
      if ((t.points || []).some((p) => !p.result)) return fail(3000, '仍有未检点位')
      t.status = 'COMPLETED'
      t.actualTime = now()
      const abnormal = (t.points || []).filter((p) => p.result === 'ABNORMAL')
      return ok({
        id: t.id,
        status: t.status,
        actualTime: t.actualTime,
        workOrders: abnormal.map((p, i) => ({ id: 9000 + i, orderNo: `WO-AUTO-${p.id}`, elevatorId: t.elevatorId, merged: false }))
      })
    }
  },
  {
    url: '/api/inspection/point-templates/:id',
    method: 'get',
    response: ({ query }) => {
      const t = pointTemplates.find((x) => x.id === Number(query.id))
      if (!t) return fail(1001, '模板不存在')
      return ok(t)
    }
  },
  {
    url: '/api/inspection/point-templates/:id',
    method: 'put',
    response: ({ query, body }) => {
      const t = pointTemplates.find((x) => x.id === Number(query.id))
      if (!t) return fail(1001, '模板不存在')
      const b = parseBody(body)
      Object.assign(t, {
        templateName: b.templateName ?? t.templateName,
        elevatorType: b.elevatorType ?? t.elevatorType,
        status: b.status ?? t.status,
        points: b.points || t.points,
        pointCount: (b.points || t.points || []).length
      })
      return ok(t)
    }
  },
  {
    url: '/api/inspection/point-templates/:id',
    method: 'delete',
    response: ({ query }) => {
      const idx = pointTemplates.findIndex((x) => x.id === Number(query.id))
      if (idx < 0) return fail(1001, '模板不存在')
      pointTemplates.splice(idx, 1)
      return ok({ id: Number(query.id), deleted: true })
    }
  },
  {
    url: '/api/inspection/tasks/:id',
    method: 'get',
    response: ({ query }) => {
      const t = inspectionTasks.find((x) => x.id === Number(query.id))
      if (!t) return fail(1001, '任务不存在')
      return ok(decorateTask(t))
    }
  },
  {
    url: '/api/inspection/tasks',
    method: 'get',
    response: ({ query }) => {
      let list = inspectionTasks.map(decorateTask)
      if (query?.status) list = list.filter((t) => t.status === query.status)
      if (query?.overdue === true || query?.overdue === 'true') list = list.filter((t) => t.overdue)
      return ok(paginate(list, query?.page, query?.pageSize))
    }
  },

  // ============ 维保 ============
  {
    url: '/api/maintenance/plans/:id/generate',
    method: 'post',
    response: ({ query, body }) => {
      const plan = maintenancePlans.find((p) => p.id === Number(query.id))
      if (!plan) return fail(1001, '计划不存在')
      const b = parseBody(body)
      if (!b.planDate) return fail(1000, 'planDate 必填')
      if (!['ASSIGN', 'POOL'].includes(b.destination)) return fail(1000, 'destination 只能是 ASSIGN 或 POOL')
      let generated = 0
      let skipped = 0
      elevators
        .filter((e) => e.status !== 'INACTIVE')
        .forEach((e) => {
          if (maintenanceTasks.some((t) => t.elevatorId === e.id && t.scheduledTime.startsWith(b.planDate))) {
            skipped += 1
            return
          }
          maintenanceTasks.unshift({
            id: nextId(),
            taskNo: `MT${today().replace(/-/g, '')}${String(maintenanceTasks.length + 1).padStart(4, '0')}`,
            planId: plan.id,
            planName: plan.planName,
            elevatorId: e.id,
            elevatorNo: e.elevatorNo,
            scheduledTime: `${b.planDate} 09:00:00`,
            actualTime: '',
            assigneeId: null,
            status: 'PENDING',
            poolFlag: b.destination === 'POOL' ? 1 : 0,
            overdue: false,
            rejectCount: 0,
            finishImages: [],
            finishRemark: ''
          })
          generated += 1
        })
      plan.taskCount += generated
      return ok({ generated, skipped, taskIds: [] })
    }
  },
  {
    url: '/api/maintenance/plans',
    method: 'get',
    response: () => ok(maintenancePlans)
  },
  {
    url: '/api/maintenance/plans',
    method: 'post',
    response: ({ body }) => {
      const b = parseBody(body)
      const plan = { id: nextId(), ...b, taskCount: 0 }
      maintenancePlans.push(plan)
      return ok(plan)
    }
  },
  {
    url: '/api/maintenance/plans/:id',
    method: 'put',
    response: ({ query, body }) => {
      const p = maintenancePlans.find((x) => x.id === Number(query.id))
      if (!p) return fail(1001, '计划不存在')
      Object.assign(p, parseBody(body))
      return ok(p)
    }
  },
  {
    url: '/api/maintenance/tasks/:id/assign',
    method: 'post',
    response: ({ query, headers, body }) => {
      const user = me(headers)
      if (!isStaff(user)) return fail(1002, '无权指派')
      const t = maintenanceTasks.find((x) => x.id === Number(query.id))
      if (!t) return fail(1001, '任务不存在')
      const b = parseBody(body)
      if (!b.assigneeId) return fail(1000, '请选择维修工')
      t.assigneeId = Number(b.assigneeId)
      t.status = 'ASSIGNED'
      t.poolFlag = 0
      return ok(null)
    }
  },
  {
    url: '/api/maintenance/tasks/:id/to-pool',
    method: 'post',
    response: ({ query, headers }) => {
      const user = me(headers)
      if (!isStaff(user)) return fail(1002, '无权操作')
      const t = maintenanceTasks.find((x) => x.id === Number(query.id))
      if (!t) return fail(1001, '任务不存在')
      t.status = 'PENDING'
      t.poolFlag = 1
      t.assigneeId = null
      return ok(null)
    }
  },
  {
    url: '/api/maintenance/tasks/:id/accept',
    method: 'post',
    response: ({ query, headers }) => {
      const user = me(headers)
      const t = maintenanceTasks.find((x) => x.id === Number(query.id))
      if (!t) return fail(1001, '任务不存在')
      if (t.assigneeId !== user?.id) return fail(1002, '仅被指派维修工可接单')
      if (t.status !== 'ASSIGNED') return fail(3000, '当前状态不可接单')
      t.status = 'PROCESSING'
      return ok(null)
    }
  },
  {
    url: '/api/maintenance/tasks/:id/complete',
    method: 'post',
    response: ({ query, headers, body }) => {
      const t = maintenanceTasks.find((x) => x.id === Number(query.id))
      if (!t) return fail(1001, '任务不存在')
      if (t.status !== 'PROCESSING') return fail(3000, '当前状态不可完工')
      const b = parseBody(body)
      const images = b.finishImages || b.images || []
      if (!images.length) return fail(1000, '完工需至少 1 张现场照片')
      t.status = 'COMPLETED'
      t.actualTime = now()
      t.finishImages = images
      t.finishRemark = b.remark || ''
      return ok(null)
    }
  },
  {
    url: '/api/maintenance/tasks/:id/reject',
    method: 'post',
    response: ({ query, headers, body }) => {
      const user = me(headers)
      if (!isStaff(user)) return fail(1002, '无权驳回')
      const t = maintenanceTasks.find((x) => x.id === Number(query.id))
      if (!t) return fail(1001, '任务不存在')
      const b = parseBody(body)
      if (!b.reason) return fail(1000, '驳回原因必填')
      t.rejectCount = (t.rejectCount || 0) + 1
      if (t.rejectCount > 3) return fail(3000, '驳回已超过 3 次，请走升级督办')
      t.status = 'PROCESSING'
      t.actualTime = ''
      return ok(null)
    }
  },
  {
    url: '/api/maintenance/tasks/:id/confirm',
    method: 'post',
    response: ({ query, headers }) => {
      const user = me(headers)
      if (!isStaff(user)) return fail(1002, '无权确认')
      const t = maintenanceTasks.find((x) => x.id === Number(query.id))
      if (!t) return fail(1001, '任务不存在')
      if (t.status !== 'COMPLETED') return fail(3000, '仅已完工任务可确认')
      t.status = 'CONFIRMED'
      return ok(null)
    }
  },
  {
    url: '/api/maintenance/tasks/pool',
    method: 'get',
    response: ({ query }) => {
      let list = maintenanceTasks.filter((t) => t.poolFlag === 1 && t.status === 'PENDING')
      if (query?.status) list = list.filter((t) => t.status === query.status)
      return ok(paginate(list.map(decorateTask), query?.page, query?.pageSize))
    }
  },
  {
    url: '/api/maintenance/tasks/:id/grab',
    method: 'post',
    response: ({ query, headers }) => {
      const user = me(headers)
      const t = maintenanceTasks.find((x) => x.id === Number(query.id))
      if (!t) return fail(1001, '任务不存在')
      if (!(t.poolFlag === 1 && t.status === 'PENDING')) return fail(3000, '任务已被抢或状态已变化')
      t.poolFlag = 0
      t.assigneeId = user?.id || null
      t.status = 'PROCESSING'
      return ok({ id: t.id, status: t.status })
    }
  },
  {
    url: '/api/maintenance/tasks/:id/from-pool',
    method: 'post',
    response: ({ query, body }) => {
      const t = maintenanceTasks.find((x) => x.id === Number(query.id))
      if (!t) return fail(1001, '任务不存在')
      const b = parseBody(body)
      if (!b.assigneeId) return fail(1000, '请选择维修工')
      t.poolFlag = 0
      t.assigneeId = Number(b.assigneeId)
      t.status = 'ASSIGNED'
      return ok({ id: t.id, status: t.status })
    }
  },
  {
    url: '/api/maintenance/tasks/:id/transfer',
    method: 'post',
    response: ({ query, body }) => {
      const t = maintenanceTasks.find((x) => x.id === Number(query.id))
      if (!t) return fail(1001, '任务不存在')
      const b = parseBody(body)
      if (!b.targetAssigneeId || !b.reason) return fail(1000, '目标维修工与原因必填')
      t.assigneeId = Number(b.targetAssigneeId)
      t.status = 'ASSIGNED'
      return ok({ id: t.id, status: t.status })
    }
  },
  {
    url: '/api/maintenance/tasks/:id/cancel',
    method: 'post',
    response: ({ query, body }) => {
      const t = maintenanceTasks.find((x) => x.id === Number(query.id))
      if (!t) return fail(1001, '任务不存在')
      const b = parseBody(body)
      if (!b.reason) return fail(1000, '取消原因必填')
      t.status = 'CANCELED'
      return ok({ id: t.id, status: t.status })
    }
  },
  {
    url: '/api/maintenance/tasks/:id/timeline',
    method: 'get',
    response: ({ query }) => {
      const t = maintenanceTasks.find((x) => x.id === Number(query.id))
      if (!t) return fail(1001, '任务不存在')
      return ok({
        list: [
          { operatorName: '系统', actionLabel: '生成任务', createdAt: t.scheduledTime || now() },
          {
            operatorName: findUser(t.assigneeId)?.realName || '系统',
            actionLabel: t.status === 'COMPLETED' ? '完工' : '接单',
            createdAt: t.actualTime || now()
          }
        ],
        total: 2
      })
    }
  },
  {
    url: '/api/maintenance/tasks/:id',
    method: 'get',
    response: ({ query }) => {
      const t = maintenanceTasks.find((x) => x.id === Number(query.id))
      if (!t) return fail(1001, '任务不存在')
      return ok(decorateTask(t))
    }
  },
  {
    url: '/api/maintenance/tasks',
    method: 'get',
    response: ({ query }) => {
      let list = maintenanceTasks.map(decorateTask)
      if (query?.status) list = list.filter((t) => t.status === query.status)
      if (query?.poolFlag !== undefined && query.poolFlag !== '') {
        list = list.filter((t) => t.poolFlag === Number(query.poolFlag))
      }
      if (query?.overdue === true || query?.overdue === 'true') list = list.filter((t) => t.overdue)
      if (query?.me === true || query?.me === 'true') {
        list = list.filter((t) => t.assigneeId === getUserId({}))
      }
      return ok(paginate(list, query?.page, query?.pageSize))
    }
  }
]
