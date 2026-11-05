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

    <el-card class="section search-card" shadow="never">
      <div class="search-line">
        <el-input
          v-model="searchKeyword"
          placeholder="全局搜索：单号 / 业主姓名 / 电话 / 电梯编号"
          clearable
          style="max-width: 420px"
          @keyup.enter="handleGlobalSearch"
        />
        <el-button type="primary" @click="handleGlobalSearch">搜索</el-button>
        <span class="sub">BOP109 全字段搜索（单号/标题/描述/业主/电话/电梯）</span>
      </div>
    </el-card>

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
      <ListError :failed="loadError" :loading="loading" @retry="loadAll" />
      <el-table v-if="!loadError" v-loading="loading" :data="overdueList" @row-click="openRow">
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
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.bizType === 'WORK_ORDER' && row.status === 'PENDING'"
              link
              type="primary"
              @click.stop="openAssign(row)"
            >
              派单
            </el-button>
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

    <!-- 全局搜索结果 -->
    <el-dialog v-model="searchVisible" title="全局搜索结果" width="860px">
      <el-table v-loading="searchLoading" :data="searchRows" max-height="420">
        <el-table-column prop="orderNo" label="单号" width="160" />
        <el-table-column prop="title" label="标题" min-width="180" show-overflow-tooltip />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="WORK_ORDER_STATUS_TAG[row.status] || 'info'">
              {{ WORK_ORDER_STATUS_MAP[row.status] || row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="reporterName" label="报修人" width="100" />
        <el-table-column prop="assigneeName" label="处理人" width="100" />
        <el-table-column prop="location" label="位置" width="140" show-overflow-tooltip />
        <el-table-column prop="matchedField" label="命中" width="100" />
        <el-table-column label="操作" width="80" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openRow({ ...row, bizType: 'WORK_ORDER', bizId: row.id })">
              详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!searchLoading && !searchRows.length" description="无匹配工单" :image-size="60" />
    </el-dialog>

    <!-- 派单候选面板 -->
    <el-dialog v-model="assignVisible" title="派单" width="760px">
      <div class="sub">候选按值班/持证/在途/今日单量排序；缺证或无值班人员将置灰</div>
      <el-table
        v-loading="assignLoading"
        :data="assignCandidates"
        max-height="320"
        highlight-current-row
        @current-change="(row) => (assigneeId = row?.id || null)"
      >
        <el-table-column prop="realName" label="姓名" width="100" />
        <el-table-column prop="groupName" label="班组" width="110" />
        <el-table-column label="值班" width="80">
          <template #default="{ row }">
            <el-tag size="small" :type="row.onDuty ? 'success' : 'info'">
              {{ row.onDuty ? '在岗' : '收工' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="inFlight" label="在途" width="80" />
        <el-table-column prop="todayOrderCount" label="今日单量" width="100" />
        <el-table-column label="超时率" width="90">
          <template #default="{ row }">{{ row.timeoutRate ?? '—' }}%</template>
        </el-table-column>
        <el-table-column label="持证" min-width="140">
          <template #default="{ row }">
            <el-tag v-if="row.certEligible === false" size="small" type="danger">
              缺 {{ (row.missingTags || []).join('/') || '证书' }}
            </el-tag>
            <span v-else class="sub">符合</span>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!assignLoading && !assignCandidates.length" description="暂无可用维修工" :image-size="60" />
      <template #footer>
        <el-button @click="assignVisible = false">取消</el-button>
        <el-button type="primary" :loading="assignSubmitting" @click="submitAssign">确认派单</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getWorkbenchTodos, getWorkbenchOverdue, getAssignPanel } from '@/api/workbench'
import { globalSearch, assignWorkOrder } from '@/api/workOrder'
import { notify } from '@/utils/notify'
import ListError from '@/components/ListError.vue'
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
const loadError = ref(false)

const searchKeyword = ref('')
const searchVisible = ref(false)
const searchLoading = ref(false)
const searchRows = ref([])

const assignVisible = ref(false)
const assignLoading = ref(false)
const assignSubmitting = ref(false)
const assignCandidates = ref([])
const assignTarget = ref(null)
const assigneeId = ref(null)

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
  loadError.value = false
  try {
    const data = await getWorkbenchOverdue({
      type: overdueType.value,
      page: page.value,
      pageSize: pageSize.value
    })
    overdueList.value = data.list
    total.value = data.total
  } catch (e) {
    loadError.value = true
    overdueList.value = []
  } finally {
    loading.value = false
  }
}

async function loadAll() {
  try {
    todos.value = await getWorkbenchTodos()
  } catch (e) {
    todos.value = {}
  }
  await loadOverdue()
}

async function handleGlobalSearch() {
  const keyword = searchKeyword.value.trim()
  if (!keyword) {
    notify.warning('请输入搜索关键字')
    return
  }
  searchVisible.value = true
  searchLoading.value = true
  try {
    const data = await globalSearch({ keyword, page: 1, pageSize: 50 })
    searchRows.value = data.list
  } catch (e) {
    searchRows.value = []
  } finally {
    searchLoading.value = false
  }
}

async function openAssign(row) {
  assignTarget.value = row
  assigneeId.value = null
  assignCandidates.value = []
  assignVisible.value = true
  assignLoading.value = true
  try {
    assignCandidates.value = await getAssignPanel({ orderId: row.bizId })
  } catch (e) {
    assignCandidates.value = []
  } finally {
    assignLoading.value = false
  }
}

async function submitAssign() {
  if (!assigneeId.value) {
    notify.warning('请选择维修工')
    return
  }
  assignSubmitting.value = true
  try {
    await assignWorkOrder(assignTarget.value.bizId, { assigneeId: assigneeId.value })
    notify.success('派单成功')
    assignVisible.value = false
    loadAll()
  } catch (e) {
    // 1000/3000/3002 由拦截器提示
  } finally {
    assignSubmitting.value = false
  }
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
.search-line {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.search-card :deep(.el-card__body) {
  padding: 12px 16px;
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
