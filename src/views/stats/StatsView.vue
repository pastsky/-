<template>
  <div>
    <el-row :gutter="16">
      <el-col v-for="card in overviewCards" :key="card.label" :span="4">
        <el-card class="metric-card" shadow="hover">
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
          <el-button type="primary" size="small" @click="handleExport">导出报表</el-button>
        </div>
      </template>
      <el-table :data="performance">
        <el-table-column prop="engineerName" label="维修工" width="140" />
        <el-table-column prop="total" label="完工单数" width="120" />
        <el-table-column label="平均处理时长（小时）">
          <template #default="{ row }">{{ row.avgHandleHours }}</template>
        </el-table-column>
        <el-table-column label="平均满意度">
          <template #default="{ row }">
            <span v-if="row.avgRating">{{ row.avgRating }} 分</span>
            <span v-else>—</span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import * as echarts from 'echarts'
import { getStatsOverview, getStatsTrend, getTypeDistribution, getEngineerPerformance } from '@/api/stats'
import { WORK_ORDER_TYPE_MAP } from '@/utils/dict'

const overview = ref({})
const trend = ref({ labels: [], created: [], completed: [] })
const typeDist = ref([])
const performance = ref([])
const granularity = ref('day')
const trendRef = ref()
const typeRef = ref()

let trendChart = null
let typeChart = null

const overviewCards = computed(() => [
  { label: '工单总数', value: overview.value.total ?? 0 },
  { label: '待派单', value: overview.value.pending ?? 0 },
  { label: '已派单', value: overview.value.assigned ?? 0 },
  { label: '处理中', value: overview.value.processing ?? 0 },
  { label: '已完成', value: overview.value.completed ?? 0 },
  { label: '已关闭', value: overview.value.closed ?? 0 },
  { label: '已取消', value: overview.value.canceled ?? 0 },
  { label: '平均时长(h)', value: overview.value.avgHandleHours ?? 0 },
  { label: '平均满意度', value: overview.value.avgRating ?? 0 }
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

function handleExport() {
  const o = overview.value
  const t = trend.value
  const sections = []

  const overviewRows = [
    ['指标', '数值'],
    ['工单总数', o.total ?? 0],
    ['待派单', o.pending ?? 0],
    ['已派单', o.assigned ?? 0],
    ['处理中', o.processing ?? 0],
    ['已完成', o.completed ?? 0],
    ['已关闭', o.closed ?? 0],
    ['已取消', o.canceled ?? 0],
    ['平均处理时长(小时)', o.avgHandleHours ?? 0],
    ['平均满意度', o.avgRating ?? 0]
  ]
  sections.push(['【统计总览】', ...overviewRows.map((r) => r.join(','))].join('\n'))

  const trendRows = [
    ['日期', '新建', '完工'],
    ...(t.labels || []).map((label, i) => [label, t.created?.[i] ?? 0, t.completed?.[i] ?? 0])
  ]
  sections.push(['【工单趋势】', ...trendRows.map((r) => r.join(','))].join('\n'))

  const typeRows = [
    ['类型', '数量'],
    ...typeDist.value.map((item) => [WORK_ORDER_TYPE_MAP[item.type] || item.type, item.count])
  ]
  sections.push(['【报修类型分布】', ...typeRows.map((r) => r.join(','))].join('\n'))

  const perfRows = [
    ['维修工', '完工单数', '平均处理时长(小时)', '平均满意度'],
    ...performance.value.map((p) => [p.engineerName, p.total, p.avgHandleHours, p.avgRating])
  ]
  sections.push(['【维修工绩效】', ...perfRows.map((r) => r.join(','))].join('\n'))

  const csv = sections.join('\n\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `统计报表_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
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
  margin-bottom: 16px;
}
.metric-value {
  font-size: 24px;
  font-weight: 600;
  line-height: 1.4;
}
.metric-label {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
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
</style>
