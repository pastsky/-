<template>
  <div class="engineer">
    <div class="page-head">
      <div>
        <div class="page-title">我的工单</div>
        <div class="sub">首屏只展示待办任务；已完成历史可在右侧页签查看</div>
      </div>
      <div class="ops">
        <el-radio-group v-model="tab" size="small">
          <el-radio-button value="todo">待办 {{ todoCount }}</el-radio-button>
          <el-radio-button value="history">历史 {{ historyList.length }}</el-radio-button>
        </el-radio-group>
        <el-input
          v-model="keyword"
          placeholder="单号 / 标题"
          clearable
          style="width: 160px"
          @change="loadData"
        />
        <el-button @click="loadData">刷新</el-button>
      </div>
    </div>

    <ListError :failed="loadError" :loading="loading" @retry="loadData" />

    <el-skeleton v-if="loading && !list.length" :rows="4" animated />

    <template v-else-if="!loadError">
      <el-empty
        v-if="!current.length"
        :description="tab === 'todo' ? '当前无待处理任务' : '暂无历史工单'"
      >
        <el-button v-if="tab === 'todo'" @click="tab = 'history'">查看历史工单</el-button>
      </el-empty>

      <div v-else class="cards">
        <el-card
          v-for="row in current"
          :key="row.id"
          class="task-card"
          :class="{ alert: isAlert(row) }"
          shadow="hover"
        >
          <div class="card-top">
            <div class="title-line">
              <el-tag
                size="small"
                :type="row.status === 'PENDING_REVIEW' ? 'success' : WORK_ORDER_STATUS_TAG[row.status]"
              >
                {{ WORK_ORDER_STATUS_MAP[row.status] || row.status }}
              </el-tag>
              <el-tag size="small" effect="plain">
                {{ WORK_ORDER_TYPE_MAP[row.type] || row.type }}
              </el-tag>
              <el-tag v-if="row.priority === 'URGENT'" size="small" type="danger" effect="dark">
                紧急
              </el-tag>
              <span class="title-text">{{ row.title }}</span>
            </div>
            <span class="order-no">{{ row.orderNo }}</span>
          </div>

          <div class="fields">
            <span class="field primary">
              <el-icon><Location /></el-icon>{{ row.location || '位置待补充' }}
            </span>
            <span class="field">
              <el-icon><Clock /></el-icon>{{ formatAppointment(row.appointmentTime) }}
            </span>
            <span class="field" :class="{ danger: isAlert(row) }">
              <el-icon><Timer /></el-icon>{{ slaText(row) }}
            </span>
          </div>

          <div class="actions">
            <el-button
              v-if="row.status === 'ASSIGNED'"
              type="primary"
              :loading="actingId === row.id"
              @click="handleAccept(row)"
            >
              接单
            </el-button>
            <el-button v-if="row.status === 'PROCESSING'" type="success" @click="goComplete(row)">
              上传照片并完工
            </el-button>
            <el-button @click="goDetail(row)">详情</el-button>
            <span v-if="row.status === 'PENDING_REVIEW'" class="sub">已完工，等待客服回访</span>
          </div>
        </el-card>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { notify } from '@/utils/notify'
import { getWorkOrderList, acceptWorkOrder } from '@/api/workOrder'
import ListError from '@/components/ListError.vue'
import {
  WORK_ORDER_STATUS_MAP,
  WORK_ORDER_STATUS_TAG,
  WORK_ORDER_TYPE_MAP,
  formatAppointment
} from '@/utils/dict'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const loadError = ref(false)
const list = ref([])
const tab = ref('todo')
const keyword = ref('')
const actingId = ref(null)

// 维修工待办白名单：其余状态（含 PENDING_REVIEW/COMPLETED/CLOSED/CANCELED）一律不进待办
const TODO = ['ASSIGNED', 'PROCESSING']
// 已完工待回访归入历史，且不渲染任何操作按钮
const DONE = ['PENDING_REVIEW', 'COMPLETED', 'CLOSED', 'CANCELED']
const todoList = computed(() => list.value.filter((r) => TODO.includes(r.status)))
const historyList = computed(() => list.value.filter((r) => DONE.includes(r.status)))
const todoCount = computed(() => todoList.value.length)
const current = computed(() => (tab.value === 'todo' ? todoList.value : historyList.value))

function isAlert(row) {
  if (DONE.includes(row.status)) return false
  if (row.overdue) return true
  return row.appointmentTime
    ? new Date(row.appointmentTime.replace(' ', 'T')) < new Date()
    : false
}

function slaText(row) {
  if (DONE.includes(row.status)) return '已完结'
  if (!row.appointmentTime) return '尽快处理'
  const target = new Date(row.appointmentTime.replace(' ', 'T'))
  const diff = target - new Date()
  const abs = Math.abs(diff)
  const hours = Math.floor(abs / 3600000)
  const minutes = Math.floor((abs % 3600000) / 60000)
  const text = hours ? `${hours} 小时 ${minutes} 分` : `${minutes} 分钟`
  return diff >= 0 ? `距预约 ${text}` : `已超预约 ${text}`
}

async function loadData() {
  loading.value = true
  loadError.value = false
  try {
    const data = await getWorkOrderList({
      page: 1,
      pageSize: 100,
      keyword: keyword.value || undefined
    })
    list.value = data?.list || []
  } catch (e) {
    loadError.value = true
  } finally {
    loading.value = false
  }
}

async function handleAccept(row) {
  try {
    await ElMessageBox.confirm(`确认接单「${row.title}」？接单后即进入处理中。`, '接单确认')
  } catch (e) {
    return
  }
  actingId.value = row.id
  try {
    await acceptWorkOrder(row.id, {})
    notify.success('已接单，工单进入处理中')
    await loadData()
  } finally {
    actingId.value = null
  }
}

function goDetail(row) {
  router.push(`/work-orders/${row.id}`)
}

function goComplete(row) {
  router.push({ path: `/work-orders/${row.id}`, query: { action: 'complete' } })
}

watch(
  () => route.query.keyword,
  (kw) => {
    keyword.value = kw || ''
    loadData()
  }
)

onMounted(() => {
  keyword.value = route.query.keyword || ''
  loadData()
})
</script>

<style scoped>
.page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}
.page-title {
  font-size: 16px;
  font-weight: 600;
}
.sub {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.ops {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 14px;
}
.task-card {
  border-left: 3px solid var(--el-color-primary-light-5);
}
.task-card.alert {
  border-left-color: var(--el-color-danger);
  background: var(--el-color-danger-light-9);
}
.card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.title-line {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.title-text {
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}
.order-no {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
}
.fields {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 18px;
  margin: 12px 0;
}
.field {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: var(--el-text-color-regular);
}
.field.primary {
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}
.field.danger {
  color: var(--el-color-danger);
  font-weight: 600;
}
.actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding-top: 10px;
  border-top: 1px dashed var(--el-border-color-lighter);
}
@media (max-width: 768px) {
  .cards {
    grid-template-columns: 1fr;
  }
  .ops {
    width: 100%;
  }
  .actions .el-button {
    flex: 1;
    margin-left: 0;
  }
}
</style>
