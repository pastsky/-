<template>
  <div>
    <el-row :gutter="14">
      <el-col v-for="card in cards" :key="card.key" :span="3">
        <el-card class="metric-card" shadow="hover" :class="{ alert: card.alert }" @click="goList(card)">
          <div class="metric-value">{{ stats[card.key] ?? 0 }}</div>
          <div class="metric-label">{{ card.label }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-card class="section">
      <template #header>
        <div class="card-header">
          <span>逾期 / 超时聚合（按紧急度排序）</span>
          <el-button link type="primary" @click="loadData">刷新</el-button>
        </div>
      </template>
      <el-table v-loading="loading.overdue" :data="overdueList" @row-click="goDetail">
        <el-table-column prop="orderNo" label="工单号" width="150" />
        <el-table-column prop="title" label="标题" min-width="180" show-overflow-tooltip />
        <el-table-column label="优先级" width="90">
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
        <el-table-column label="升级" width="110">
          <template #default="{ row }">
            <el-tag v-if="row.escalationCount > 0" size="small" type="danger">
              {{ ESCALATION_MAP[row.escalationCount] || '已升级' }}
            </el-tag>
            <span v-else class="sub">—</span>
          </template>
        </el-table-column>
        <el-table-column prop="assigneeName" label="处理人" width="100" />
        <el-table-column label="超时" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.overdue" size="small" type="danger">超时</el-tag>
            <span v-else class="sub">—</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="90" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click.stop="goDetail(row)">去处理</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-row :gutter="16">
      <el-col :span="12">
        <el-card class="section">
          <template #header>待回访（超 24h 自动默认好评归档）</template>
          <el-table v-loading="loading.review" :data="reviewList" @row-click="goDetail">
            <el-table-column prop="orderNo" label="工单号" width="150" />
            <el-table-column prop="title" label="标题" min-width="150" show-overflow-tooltip />
            <el-table-column prop="assigneeName" label="处理人" width="90" />
            <el-table-column label="操作" width="90">
              <template #default="{ row }">
                <el-button link type="primary" @click.stop="goDetail(row)">回访</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card class="section">
          <template #header>池中待抢（超 4h 自动 L0 升级）</template>
          <el-table v-loading="loading.pool" :data="poolList" @row-click="goDetail">
            <el-table-column prop="orderNo" label="工单号" width="150" />
            <el-table-column prop="title" label="标题" min-width="150" show-overflow-tooltip />
            <el-table-column label="优先级" width="86">
              <template #default="{ row }">
                <el-tag :type="WORK_ORDER_PRIORITY_TAG[row.priority]" size="small">
                  {{ WORK_ORDER_PRIORITY_MAP[row.priority] }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="90">
              <template #default="{ row }">
                <el-button link type="primary" @click.stop="goDetail(row)">派单</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getWorkbenchStats } from '@/api/stats'
import { getWorkOrderList } from '@/api/workOrder'
import {
  WORK_ORDER_STATUS_MAP,
  WORK_ORDER_STATUS_TAG,
  WORK_ORDER_PRIORITY_MAP,
  WORK_ORDER_PRIORITY_TAG,
  ESCALATION_MAP
} from '@/utils/dict'

const router = useRouter()

const stats = ref({})
const overdueList = ref([])
const reviewList = ref([])
const poolList = ref([])
const loading = reactive({ overdue: false, review: false, pool: false })

const cards = [
  { key: 'pending', label: '待派单', nav: { status: 'PENDING' } },
  { key: 'pool', label: '池中待抢', nav: { status: 'PENDING' } },
  { key: 'assigned', label: '待接单', nav: { status: 'ASSIGNED' } },
  { key: 'processing', label: '处理中', nav: { status: 'PROCESSING' } },
  { key: 'pendingReview', label: '待回访', nav: { status: 'PENDING_REVIEW' } },
  { key: 'overdue', label: '处理超时', nav: { overdue: 'true' }, alert: true },
  { key: 'escalated', label: '已升级', nav: { escalated: true }, alert: true },
  { key: 'urgent', label: '紧急未完结', nav: { priority: 'URGENT' }, alert: true }
]

function goList(card) {
  router.push({ path: '/work-orders', query: card.nav })
}

function goDetail(row) {
  if (row) router.push(`/work-orders/${row.id}`)
}

async function loadData() {
  stats.value = await getWorkbenchStats()

  loading.overdue = true
  try {
    const [overdue, escalated] = await Promise.all([
      getWorkOrderList({ status: 'PROCESSING', overdue: 'true', page: 1, pageSize: 20 }),
      getWorkOrderList({ escalated: 'true', page: 1, pageSize: 20 })
    ])
    const map = new Map()
    ;[...overdue.list, ...escalated.list].forEach((o) => map.set(o.id, o))
    overdueList.value = Array.from(map.values())
  } finally {
    loading.overdue = false
  }

  loading.review = true
  try {
    const data = await getWorkOrderList({ status: 'PENDING_REVIEW', page: 1, pageSize: 10 })
    reviewList.value = data.list
  } finally {
    loading.review = false
  }

  loading.pool = true
  try {
    const data = await getWorkOrderList({ status: 'PENDING', poolFlag: 1, page: 1, pageSize: 10 })
    poolList.value = data.list
  } finally {
    loading.pool = false
  }
}

onMounted(loadData)
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
.sub {
  color: var(--el-text-color-placeholder);
}
</style>
