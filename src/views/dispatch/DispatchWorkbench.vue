<template>
  <div>
    <el-row :gutter="14">
      <el-col v-for="card in cards" :key="card.key" :span="card.span || 6">
        <el-card class="metric-card" shadow="hover" :class="{ alert: card.alert }" @click="goCard(card)">
          <div class="metric-value">{{ todos[card.key] ?? 0 }}</div>
          <div class="metric-label">{{ card.label }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-card class="section">
      <template #header>
        <div class="card-header">
          <span>逾期 / 超时聚合（按超时小时倒序）</span>
          <div class="ops">
            <el-radio-group v-model="overdueType" size="small" @change="loadOverdue">
              <el-radio-button value="ALL">全部</el-radio-button>
              <el-radio-button value="WORK_ORDER">工单</el-radio-button>
              <el-radio-button value="MAINTENANCE">维保</el-radio-button>
              <el-radio-button value="INSPECTION">巡检</el-radio-button>
            </el-radio-group>
            <el-button link type="primary" @click="loadAll">刷新</el-button>
          </div>
        </div>
      </template>
      <el-table v-loading="loading" :data="overdueList" @row-click="openRow">
        <el-table-column label="类型" width="90">
          <template #default="{ row }">
            <el-tag size="small" :type="bizTag(row.bizType)">
              {{ BIZ_TYPE_MAP[row.bizType] || row.bizType }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="bizNo" label="单号" width="160" />
        <el-table-column prop="title" label="标题" min-width="180" show-overflow-tooltip />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="WORK_ORDER_STATUS_TAG[row.status] || 'info'">
              {{ WORK_ORDER_STATUS_MAP[row.status] || row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="优先级" width="86">
          <template #default="{ row }">
            <el-tag v-if="row.priority" :type="WORK_ORDER_PRIORITY_TAG[row.priority]" size="small">
              {{ WORK_ORDER_PRIORITY_MAP[row.priority] }}
            </el-tag>
            <span v-else class="sub">—</span>
          </template>
        </el-table-column>
        <el-table-column label="超时" width="100">
          <template #default="{ row }">
            <el-tag size="small" type="danger">{{ row.overdueHours }} h</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="assigneeName" label="处理人" width="100" />
        <el-table-column prop="branchName" label="小区" width="130" show-overflow-tooltip />
        <el-table-column label="操作" width="90" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click.stop="openRow(row)">去处理</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        class="pagination"
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
        layout="total, prev, pager, next"
        @current-change="loadOverdue"
      />
    </el-card>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getWorkbenchTodos, getWorkbenchOverdue } from '@/api/workbench'
import { notify } from '@/utils/notify'
import {
  WORK_ORDER_STATUS_MAP,
  WORK_ORDER_STATUS_TAG,
  WORK_ORDER_PRIORITY_MAP,
  WORK_ORDER_PRIORITY_TAG
} from '@/utils/dict'

const BIZ_TYPE_MAP = { WORK_ORDER: '工单', MAINTENANCE: '维保', INSPECTION: '巡检' }

const router = useRouter()
const todos = ref({})
const overdueList = ref([])
const overdueType = ref('ALL')
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const loading = ref(false)

const cards = [
  { key: 'pendingAssignCount', label: '待派单', nav: { status: 'PENDING' } },
  { key: 'pendingReviewCount', label: '待回访', nav: { status: 'PENDING_REVIEW' } },
  { key: 'urgentPendingCount', label: '紧急未完结', nav: { priority: 'URGENT' }, alert: true },
  { key: 'escalatedFinalCount', label: '升级终态', nav: { escalated: true }, alert: true },
  { key: 'overdueWorkOrderCount', label: '工单超时', overdue: 'WORK_ORDER', alert: true },
  { key: 'overdueMaintenanceCount', label: '维保逾期', overdue: 'MAINTENANCE', alert: true },
  { key: 'overdueInspectionCount', label: '巡检逾期', overdue: 'INSPECTION', alert: true },
  { key: 'feedbackSubmittedCount', label: '待处理反馈', route: '/feedback', alert: true },
  { key: 'certPendingCount', label: '待审证书', route: '/certificates', span: 8 }
]

function bizTag(type) {
  return { WORK_ORDER: 'primary', MAINTENANCE: 'warning', INSPECTION: 'success' }[type] || 'info'
}

function goCard(card) {
  if (card.overdue) {
    overdueType.value = card.overdue
    page.value = 1
    loadOverdue()
    return
  }
  if (card.route) {
    router.push(card.route)
    return
  }
  if (card.nav) router.push({ path: '/work-orders', query: card.nav })
}

function openRow(row) {
  // 按业务类型分流到对应详情，避免维保/巡检点击无反应
  if (row.bizType === 'WORK_ORDER') {
    router.push(`/work-orders/${row.bizId}`)
  } else if (row.bizType === 'MAINTENANCE') {
    router.push({ path: '/maintenance', query: { taskId: row.bizId } })
  } else if (row.bizType === 'INSPECTION') {
    router.push({ path: '/inspection', query: { taskId: row.bizId } })
  } else {
    notify.warning('该类型单据暂不支持跳转')
  }
}

async function loadOverdue() {
  loading.value = true
  try {
    const data = await getWorkbenchOverdue({
      type: overdueType.value,
      page: page.value,
      pageSize: pageSize.value
    })
    overdueList.value = data.list
    total.value = data.total
  } finally {
    loading.value = false
  }
}

async function loadAll() {
  todos.value = await getWorkbenchTodos()
  await loadOverdue()
}

onMounted(loadAll)
</script>

<style scoped>
.metric-card {
  text-align: center;
  margin-bottom: 14px;
  cursor: pointer;
}
.metric-card.alert .metric-value {
  color: var(--el-color-danger);
}
.metric-value {
  font-size: 22px;
  font-weight: 600;
  line-height: 1.4;
}
.metric-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 2px;
}
.section {
  margin-bottom: 16px;
}
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.ops {
  display: flex;
  align-items: center;
  gap: 10px;
}
.sub {
  color: var(--el-text-color-placeholder);
}
.pagination {
  margin-top: 12px;
  justify-content: flex-end;
}
</style>
