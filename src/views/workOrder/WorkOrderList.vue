<template>
  <!-- 维修工：卡片式我的工单（首屏即待办） -->
  <EngineerTaskList v-if="isEngineer" />
  <!-- 业主：报修主入口 + 进度卡片 -->
  <ResidentOrderList v-else-if="isResident" />

  <el-card v-else>
    <el-form :inline="true" :model="query" class="filter">
      <el-form-item label="状态">
        <el-select v-model="query.status" placeholder="全部" clearable style="width: 130px">
          <el-option
            v-for="o in WORK_ORDER_STATUS_OPTIONS"
            :key="o.value"
            :label="o.label"
            :value="o.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="类型">
        <el-select v-model="query.type" placeholder="全部" clearable style="width: 110px">
          <el-option
            v-for="o in WORK_ORDER_TYPE_OPTIONS"
            :key="o.value"
            :label="o.label"
            :value="o.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="优先级">
        <el-select v-model="query.priority" placeholder="全部" clearable style="width: 110px">
          <el-option
            v-for="o in WORK_ORDER_PRIORITY_OPTIONS"
            :key="o.value"
            :label="o.label"
            :value="o.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="池状态">
        <el-select v-model="query.poolFlag" placeholder="全部" clearable style="width: 110px">
          <el-option label="常规" value="0" />
          <el-option label="待抢单" value="1" />
        </el-select>
      </el-form-item>
      <el-form-item label="关键字">
        <el-input v-model="query.keyword" placeholder="工单号 / 标题" clearable style="width: 180px" />
      </el-form-item>
      <el-form-item label="日期">
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          value-format="YYYY-MM-DD"
          range-separator="至"
          start-placeholder="开始"
          end-placeholder="结束"
          style="width: 240px"
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="handleSearch">查询</el-button>
        <el-button @click="handleReset">重置</el-button>
      </el-form-item>
    </el-form>

    <div class="toolbar">
      <el-button v-if="canCreate" type="primary" @click="goCreate">新建工单</el-button>
      <el-button v-if="canBatch && selection.length" type="warning" @click="handleBatch('pool')">
        批量入池（{{ selection.length }}）
      </el-button>
      <el-button v-if="canBatch && selection.length" type="danger" @click="handleBatch('cancel')">
        批量取消
      </el-button>
      <span v-if="query.escalated" class="hint">仅显示已升级工单</span>
      <span v-if="query.overdue" class="hint">仅显示处理超时工单</span>
    </div>

    <ListError :failed="loadError" :loading="loading" @retry="loadData" />

    <el-table
      v-if="!loadError"
      v-loading="loading"
      :data="list"
      class="table"
      :row-class-name="rowClass"
      @row-click="goDetail"
      @selection-change="onSelectionChange"
      @sort-change="handleSortChange"
    >
      <el-table-column v-if="canBatch" type="selection" width="46" />
      <el-table-column prop="orderNo" label="工单号" width="150" />
      <el-table-column prop="title" label="标题" min-width="170" show-overflow-tooltip />
      <el-table-column label="标签" width="150">
        <template #default="{ row }">
          <el-tag v-if="row.poolFlag === 1" size="small" type="warning" class="tag">待抢单</el-tag>
          <el-tag v-if="row.escalationCount > 0" size="small" type="danger" class="tag">
            {{ ESCALATION_MAP[row.escalationCount] || '升级' }}
          </el-tag>
          <el-tag v-if="row.overdue" size="small" type="danger" class="tag">超时</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="类型" width="80">
        <template #default="{ row }">{{ WORK_ORDER_TYPE_MAP[row.type] }}</template>
      </el-table-column>
      <el-table-column prop="priority" label="优先级" width="86" sortable="custom">
        <template #default="{ row }">
          <el-tag :type="WORK_ORDER_PRIORITY_TAG[row.priority]" size="small">
            {{ WORK_ORDER_PRIORITY_MAP[row.priority] }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="WORK_ORDER_STATUS_TAG[row.status]" size="small">
            {{ WORK_ORDER_STATUS_MAP[row.status] }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="appointmentTime" label="预约时间" width="160" sortable="custom">
        <template #default="{ row }">
          <span :class="{ 'muted': !row.appointmentTime }">{{ formatAppointment(row.appointmentTime) }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="location" label="位置" width="120" show-overflow-tooltip />
      <el-table-column prop="reporterName" label="报修人" width="90" />
      <el-table-column prop="assigneeName" label="处理人" width="90" />
      <el-table-column prop="createdAt" label="创建时间" width="165" sortable="custom" />
      <el-table-column label="操作" width="76" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click.stop="goDetail(row)">详情</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      class="pagination"
      v-model:current-page="query.page"
      v-model:page-size="query.pageSize"
      :total="total"
      :page-sizes="[10, 20, 50]"
      layout="total, sizes, prev, pager, next, jumper"
      @size-change="loadData"
      @current-change="loadData"
    />
  </el-card>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { notify } from '@/utils/notify'
import { getWorkOrderList, batchToPool, batchCancel } from '@/api/workOrder'
import ListError from '@/components/ListError.vue'
import EngineerTaskList from '@/components/workOrder/EngineerTaskList.vue'
import ResidentOrderList from '@/components/workOrder/ResidentOrderList.vue'
import { useUserStore } from '@/stores/user'
import {
  REPAIRER_ROLES,
  WORK_ORDER_STATUS_OPTIONS,
  WORK_ORDER_STATUS_MAP,
  WORK_ORDER_STATUS_TAG,
  WORK_ORDER_TYPE_OPTIONS,
  WORK_ORDER_TYPE_MAP,
  WORK_ORDER_PRIORITY_OPTIONS,
  WORK_ORDER_PRIORITY_MAP,
  WORK_ORDER_PRIORITY_TAG,
  ESCALATION_MAP,
  formatAppointment
} from '@/utils/dict'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const loadError = ref(false)
const list = ref([])
const total = ref(0)
const selection = ref([])
const dateRange = ref([])
const query = reactive({
  page: 1,
  pageSize: 20,
  status: '',
  type: '',
  priority: '',
  poolFlag: '',
  keyword: '',
  escalated: false,
  overdue: false,
  sortField: 'created_at',
  sortOrder: 'desc'
})

// 后端 POST /work-orders 仅 RESIDENT
const canCreate = computed(() => userStore.role === 'RESIDENT')
// 批量指派/入池/取消仅 CUSTOMER_SERVICE、ADMIN
const canBatch = computed(() => ['CUSTOMER_SERVICE', 'ADMIN'].includes(userStore.role))
// 维修工 / 业主走卡片视图，管理端保持宽表
const isEngineer = computed(() => REPAIRER_ROLES.includes(userStore.role))
const isResident = computed(() => userStore.role === 'RESIDENT')

function rowClass({ row }) {
  if (row.priority === 'URGENT' && !['CLOSED', 'CANCELED'].includes(row.status)) return 'urgent-row'
  return ''
}

function buildParams() {
  return {
    page: query.page,
    pageSize: query.pageSize,
    status: query.status || undefined,
    type: query.type || undefined,
    priority: query.priority || undefined,
    poolFlag: query.poolFlag === '' ? undefined : query.poolFlag,
    keyword: query.keyword || undefined,
    escalated: query.escalated ? 'true' : undefined,
    overdue: query.overdue ? 'true' : undefined,
    startDate: dateRange.value?.[0] || undefined,
    endDate: dateRange.value?.[1] || undefined,
    // 契约排序参数：sortField/sortOrder，白名单见 SORT_FIELD_MAP
    sortField: query.sortField,
    sortOrder: query.sortOrder
  }
}

// 工单列表排序白名单：created_at|priority|updated_at|appointment_time|review_time
const SORT_FIELD_MAP = {
  createdAt: 'created_at',
  priority: 'priority',
  appointmentTime: 'appointment_time'
}

function handleSortChange({ prop, order }) {
  const field = SORT_FIELD_MAP[prop]
  if (!order || !field) {
    query.sortField = 'created_at'
    query.sortOrder = 'desc'
  } else {
    query.sortField = field
    query.sortOrder = order === 'ascending' ? 'asc' : 'desc'
  }
  query.page = 1
  loadData()
}

async function loadData() {
  // 维修工 / 业主由独立卡片组件自行取数，避免重复请求
  if (isEngineer.value || isResident.value) return
  loading.value = true
  loadError.value = false
  try {
    const data = await getWorkOrderList(buildParams())
    list.value = data.list
    total.value = data.total
  } catch (e) {
    loadError.value = true
  } finally {
    loading.value = false
  }
}

watch(
  () => route.query.keyword,
  (kw) => {
    query.keyword = kw || ''
    query.page = 1
    loadData()
  }
)

watch(
  () => route.query.overdue,
  (v) => {
    query.overdue = v === 'true'
    loadData()
  }
)

function handleSearch() {
  query.page = 1
  loadData()
}

function handleReset() {
  query.status = ''
  query.type = ''
  query.priority = ''
  query.poolFlag = ''
  query.keyword = ''
  query.escalated = false
  query.overdue = false
  dateRange.value = []
  query.page = 1
  router.replace({ path: '/work-orders' })
  loadData()
}

function goCreate() {
  router.push('/work-orders/create')
}

function goDetail(row) {
  router.push(`/work-orders/${row.id}`)
}

function onSelectionChange(rows) {
  selection.value = rows
}

async function handleBatch(action) {
  const label = action === 'pool' ? '入池' : '取消'
  try {
    const { value } = await ElMessageBox.prompt(`请输入批量${label}原因`, `批量${label}`, {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputValidator: (v) => (v && v.trim() ? true : '原因不能为空')
    })
    const orderIds = selection.value.map((r) => r.id)
    const result =
      action === 'pool'
        ? await batchToPool({ orderIds, reason: value })
        : await batchCancel({ orderIds, reason: value })
    if (result.failureCount) {
      ElMessageBox.alert(
        (result.failures || []).map((f) => `#${f.orderId}：${f.message}（${f.code}）`).join('\n'),
        `失败 ${result.failureCount} 条`,
        { type: 'warning' }
      )
    }
    notify.success(`成功 ${result.successCount} 条`)
    loadData()
  } catch (e) {
    // 取消输入或业务失败由拦截器提示
  }
}

onMounted(() => {
  query.keyword = route.query.keyword || ''
  query.overdue = route.query.overdue === 'true'
  loadData()
})
</script>

<style scoped>
.filter {
  margin-bottom: 4px;
}
.toolbar {
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.hint {
  font-size: 12px;
  color: var(--el-color-warning);
}
.table {
  cursor: pointer;
}
.tag {
  margin-right: 4px;
}
.muted {
  color: var(--el-text-color-placeholder);
}
.pagination {
  margin-top: 16px;
  justify-content: flex-end;
}
:deep(.urgent-row) {
  background: var(--el-color-danger-light-9);
}
</style>
