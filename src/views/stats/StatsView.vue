<template>
  <div>
    <el-row :gutter="14">
      <el-col v-for="card in overviewCards" :key="card.label" :span="3">
        <el-card class="metric-card" shadow="hover" :class="{ alert: card.alert }">
          <div class="metric-value">{{ card.value }}</div>
          <div class="metric-label">{{ card.label }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="charts">
      <el-col :span="16">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>工单趋势</span>
              <el-radio-group v-model="granularity" size="small" @change="loadTrend">
                <el-radio-button value="day">日</el-radio-button>
                <el-radio-button value="week">周</el-radio-button>
                <el-radio-button value="month">月</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <div ref="trendRef" class="chart"></div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card>
          <template #header>报修类型分布</template>
          <div ref="typeRef" class="chart"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-card class="section">
      <template #header>
        <div class="card-header">
          <span>维修工绩效</span>
          <div class="ops">
            <el-select v-model="exportFormat" size="small" style="width: 110px">
              <el-option label="Excel" value="EXCEL" />
              <el-option label="CSV" value="CSV" />
              <el-option label="PDF" value="PDF" />
              <el-option label="图表 PNG" value="PNG" />
            </el-select>
            <el-button type="primary" size="small" :loading="exporting" @click="handleExport">
              异步导出
            </el-button>
          </div>
        </div>
      </template>
      <el-table :data="performance">
        <el-table-column prop="engineerName" label="维修工" width="130" />
        <el-table-column prop="groupName" label="班组" width="110" />
        <el-table-column prop="total" label="完工单数" width="110" />
        <el-table-column label="平均处理时长（小时）">
          <template #default="{ row }">{{ row.avgHandleHours }}</template>
        </el-table-column>
        <el-table-column label="平均满意度">
          <template #default="{ row }">
            <span v-if="row.avgRating">{{ row.avgRating }} 分</span>
            <span v-else>—</span>
          </template>
        </el-table-column>
        <el-table-column label="超时率" width="100">
          <template #default="{ row }">
            <el-tag :type="row.overdueRate > 30 ? 'danger' : 'info'" size="small">
              {{ row.overdueRate }}%
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
      <div class="sub export-tip">
        导出为异步任务：提交后由后台生成，完成后通过站内通知下发下载链接，链接保留 7 天。
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import * as echarts from 'echarts'
import { ElMessage } from 'element-plus'
import {
  getStatsOverview,
  getStatsTrend,
  getTypeDistribution,
  getEngineerPerformance,
  exportStats
} from '@/api/stats'
import { WORK_ORDER_TYPE_MAP } from '@/utils/dict'

const overview = ref({})
const trend = ref({ labels: [], created: [], completed: [] })
const typeDist = ref([])
const performance = ref([])
const granularity = ref('day')
const trendRef = ref()
const typeRef = ref()
const exportFormat = ref('EXCEL')
const exporting = ref(false)

let trendChart = null
let typeChart = null

const overviewCards = computed(() => [
  { label: '工单总数', value: overview.value.total ?? 0 },
  { label: '待派单', value: overview.value.pending ?? 0 },
  { label: '池中待抢', value: overview.value.pool ?? 0 },
  { label: '处理中', value: overview.value.processing ?? 0 },
  { label: '待回访', value: overview.value.pendingReview ?? 0 },
  { label: '已关闭', value: overview.value.closed ?? 0 },
  { label: '已取消', value: overview.value.canceled ?? 0 },
  { label: '平均时长(h)', value: overview.value.avgHandleHours ?? 0 },
  { label: '平均满意度', value: overview.value.avgRating ?? 0 },
  { label: '处理超时', value: overview.value.overdue ?? 0, alert: true },
  { label: '已升级', value: overview.value.escalated ?? 0, alert: true }
])

function initCharts() {
  trendChart = echarts.init(trendRef.value)
  typeChart = echarts.init(typeRef.value)
}

function renderTrend() {
  trendChart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['新建', '完工'], top: 0 },
    grid: { left: 40, right: 20, top: 40, bottom: 30 },
    xAxis: { type: 'category', data: trend.value.labels || [], boundaryGap: false },
    yAxis: { type: 'value', minInterval: 1 },
    series: [
      {
        name: '新建',
        type: 'line',
        smooth: true,
        data: trend.value.created || [],
        areaStyle: { opacity: 0.12 }
      },
      {
        name: '完工',
        type: 'line',
        smooth: true,
        data: trend.value.completed || []
      }
    ]
  })
}

function renderType() {
  typeChart.setOption({
    tooltip: { trigger: 'item' },
    legend: { bottom: 0, left: 'center' },
    series: [
      {
        type: 'pie',
        radius: ['40%', '65%'],
        center: ['50%', '45%'],
        data: typeDist.value.map((t) => ({
          name: WORK_ORDER_TYPE_MAP[t.type] || t.type,
          value: t.count
        })),
        label: { formatter: '{b}: {c}' }
      }
    ]
  })
}

async function loadTrend() {
  trend.value = await getStatsTrend({ granularity: granularity.value })
  renderTrend()
}

async function loadData() {
  overview.value = await getStatsOverview()
  typeDist.value = await getTypeDistribution()
  performance.value = await getEngineerPerformance()
  renderType()
  await loadTrend()
}

async function handleExport() {
  exporting.value = true
  try {
    const data = await exportStats({ format: exportFormat.value })
    ElMessage.success(data.message || '导出任务已提交')
  } finally {
    exporting.value = false
  }
}

function handleResize() {
  trendChart?.resize()
  typeChart?.resize()
}

onMounted(async () => {
  initCharts()
  await loadData()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  trendChart?.dispose()
  typeChart?.dispose()
})
</script>

<style scoped>
.metric-card {
  text-align: center;
  margin-bottom: 14px;
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
.charts {
  margin-bottom: 16px;
}
.chart {
  height: 300px;
}
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.ops {
  display: flex;
  gap: 8px;
  align-items: center;
}
.sub {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.export-tip {
  margin-top: 10px;
}
</style>
