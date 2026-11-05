<template>
  <el-card>
    <div class="header">
      <div>
        <span class="title">维修日历</span>
        <span class="sub">按工程师维度聚合工单/维保/巡检/值班，30 分钟刻度；点击色块查看业务单据</span>
      </div>
      <div class="ops">
        <el-select
          v-if="canChooseRepairer"
          v-model="engineerId"
          clearable
          placeholder="选择维修工"
          style="width: 180px"
          @change="loadData"
        >
          <el-option
            v-for="e in engineers"
            :key="e.id"
            :label="engineerLabel(e)"
            :value="e.id"
          />
        </el-select>
        <el-date-picker
          v-model="month"
          type="month"
          value-format="YYYY-MM"
          :clearable="false"
          style="width: 150px"
          @change="loadData"
        />
        <el-button @click="loadData">刷新</el-button>
      </div>
    </div>

    <el-row :gutter="16" class="summary">
      <el-col :span="8">
        <el-card shadow="never"><div class="metric">{{ days.length }}</div><div class="label">有单天数</div></el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="never"><div class="metric">{{ blocks.length }}</div><div class="label">时段块数</div></el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="never"><div class="metric">{{ totalHours }}</div><div class="label">累计工时（小时）</div></el-card>
      </el-col>
    </el-row>

    <ListError :failed="loadError" :loading="loading" @retry="loadData" />

    <el-skeleton v-if="loading && !blocks.length" :rows="6" animated />

    <!-- 宽屏：ECharts 甘特 -->
    <div v-else-if="!loadError && !isNarrow" ref="chartRef" class="chart" :style="{ height: chartHeight }"></div>

    <!-- 窄屏：按日竖排列表 -->
    <div v-else-if="!loadError" class="mobile">
      <el-empty v-if="!days.length" description="当前区间暂无日程" />
      <div v-for="day in days" :key="day.date" class="day-card">
        <div class="day-head">
          <span>{{ day.date.slice(5) }}</span>
          <span class="sub">{{ weekday(day.date) }} · {{ dayHours(day) }}h</span>
        </div>
        <div
          v-for="b in day.items"
          :key="b.key"
          class="mobile-item"
          :style="{ borderLeftColor: COLOR[b.blockType] || '#94a3b8' }"
          @click="openBlock(b)"
        >
          <div class="mobile-title">{{ b.bizNo }} · {{ b.title }}</div>
          <div class="sub">{{ b.start }}{{ b.end ? ' - ' + b.end : ' 起' }} · {{ typeLabel(b.blockType) }}</div>
        </div>
      </div>
    </div>
  </el-card>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import { getEngineerCalendar } from '@/api/workOrder'
import { getEngineers } from '@/api/user'
import ListError from '@/components/ListError.vue'
import { useUserStore } from '@/stores/user'
import { REPAIRER_ROLES } from '@/utils/dict'

const router = useRouter()
const userStore = useUserStore()

const COLOR = {
  DUTY: '#94a3b8',
  WORK_ORDER: '#f59e0b',
  MAINT_TASK: '#10b981',
  INSPECTION: '#8b5cf6'
}
const TYPE_LABEL = {
  DUTY: '值班',
  WORK_ORDER: '工单',
  MAINT_TASK: '维保',
  INSPECTION: '巡检'
}
const SERIES_ORDER = ['WORK_ORDER', 'MAINT_TASK', 'INSPECTION', 'DUTY']

const loading = ref(false)
const loadError = ref(false)
const month = ref(new Date().toISOString().slice(0, 7))
const blocks = ref([])
const engineers = ref([])
const engineerId = ref(null)
const chartRef = ref(null)
const isNarrow = ref(false)
let chart = null
let mediaQuery = null

const canChooseRepairer = computed(() =>
  ['ADMIN', 'CUSTOMER_SERVICE', 'BRANCH_ADMIN', 'VENDOR_ADMIN'].includes(userStore.role)
)

// 契约要求 startDate/endDate，跨度 ≤31 天
function range() {
  const [y, m] = month.value.split('-').map(Number)
  const last = new Date(y, m, 0).getDate()
  return {
    startDate: `${month.value}-01`,
    endDate: `${month.value}-${String(last).padStart(2, '0')}`
  }
}

const days = computed(() => {
  const map = {}
  blocks.value.forEach((b, i) => {
    const date = (b.startTime || '').slice(0, 10)
    if (!date) return
    if (!map[date]) map[date] = []
    map[date].push({
      ...b,
      key: `${b.blockType}-${b.bizId}-${i}`,
      start: fmt(b.startTime),
      end: b.endTime ? fmt(b.endTime) : ''
    })
  })
  return Object.keys(map)
    .sort()
    .map((date) => ({ date, items: map[date].sort((a, b) => a.start.localeCompare(b.start)) }))
})

const totalHours = computed(() => {
  const minutes = days.value.reduce(
    (sum, d) => sum + d.items.reduce((s, b) => (b.end ? s + diffMinutes(b.start, b.end) : s), 0),
    0
  )
  return (minutes / 60).toFixed(1)
})

const chartHeight = computed(() => `${Math.max(360, days.value.length * 44 + 120)}px`)

function engineerLabel(e) {
  const name = e.realName || e.username || '未命名'
  const org = e.groupName || e.vendorName
  return org ? `${name}（${org}）` : name
}

function fmt(value) {
  return value.includes(' ') ? value.slice(11, 16) : value.slice(0, 5)
}

function toMinutes(value) {
  const [h, m] = fmt(value).split(':').map(Number)
  return h * 60 + m
}

function diffMinutes(start, end) {
  return Math.max(0, toMinutes(end) - toMinutes(start))
}

function weekday(date) {
  return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][new Date(date).getDay()]
}

function isWeekend(date) {
  const day = new Date(date).getDay()
  return day === 0 || day === 6
}

function typeLabel(type) {
  return TYPE_LABEL[type] || type
}

function dayHours(day) {
  const minutes = day.items.reduce((s, b) => (b.end ? s + diffMinutes(b.start, b.end) : 0), 0)
  return (minutes / 60).toFixed(1)
}

function isDone(status) {
  return ['COMPLETED', 'PENDING_REVIEW', 'CLOSED', 'CONFIRMED', 'CANCELED'].includes(status)
}

function isOverdue(b) {
  return !!b.overdue || ['ESCALATED', 'MISSED'].includes(b.status)
}

function openBlock(b) {
  if (b.blockType === 'WORK_ORDER') router.push(`/work-orders/${b.bizId}`)
  else if (b.blockType === 'MAINT_TASK') router.push({ path: '/maintenance', query: { taskId: b.bizId } })
  else if (b.blockType === 'INSPECTION') router.push({ path: '/inspection', query: { taskId: b.bizId } })
}

function buildSeries() {
  const dates = days.value.map((d) => d.date)
  return SERIES_ORDER.map((type) => ({
    name: typeLabel(type),
    type: 'custom',
    encode: { x: [1, 2], y: 0 },
    itemStyle: { color: COLOR[type] },
    data: days.value.flatMap((day, dayIdx) =>
      day.items
        .filter((b) => b.blockType === type)
        .map((b) => {
          const startMin = toMinutes(b.start)
          const endMin = b.end ? toMinutes(b.end) : Math.min(1440, startMin + 60)
          return {
            value: [dayIdx, startMin, Math.max(startMin + 15, endMin)],
            meta: { ...b, date: dates[dayIdx] }
          }
        })
    ),
    renderItem(params, api) {
      const dayIdx = api.value(0)
      const start = api.value(1)
      const end = api.value(2)
      const startCoord = api.coord([start, dayIdx])
      const endCoord = api.coord([end, dayIdx])
      const barHeight = Math.max(12, api.size([0, 1])[1] * 0.52)
      const meta = params.data?.meta || {}
      const done = isDone(meta.status)
      const overdue = isOverdue(meta)
      return {
        type: 'rect',
        shape: {
          x: startCoord[0],
          y: startCoord[1] - barHeight / 2,
          width: Math.max(4, endCoord[0] - startCoord[0]),
          height: barHeight,
          r: 4
        },
        style: {
          fill: COLOR[type],
          opacity: done ? 0.45 : 0.92,
          stroke: overdue ? '#ef4444' : 'transparent',
          lineWidth: overdue ? 2 : 0
        }
      }
    }
  }))
}

function buildOption() {
  const dates = days.value.map((d) => d.date)
  const today = new Date().toISOString().slice(0, 10)
  return {
    animationDuration: 240,
    grid: { left: 96, right: 28, top: 44, bottom: 64 },
    legend: {
      bottom: 0,
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { fontSize: 12, color: '#475569' },
      data: SERIES_ORDER.map((t) => typeLabel(t))
    },
    tooltip: {
      trigger: 'item',
      confine: true,
      formatter: (p) => {
        const m = p.data?.meta || {}
        const rows = [
          `<b>${m.bizNo || '—'}</b>`,
          m.title ? `事项：${m.title}` : '',
          m.elevatorNo ? `电梯：${m.elevatorNo}` : '',
          m.building ? `位置：${m.building}` : '',
          `时段：${m.start || ''}${m.end ? ' - ' + m.end : ' 起'}`,
          m.assigneeName ? `负责人：${m.assigneeName}` : '',
          m.status ? `状态：${m.status}` : ''
        ].filter(Boolean)
        return rows.join('<br/>')
      }
    },
    xAxis: {
      type: 'value',
      min: 0,
      max: 1440,
      interval: 30,
      axisLabel: {
        fontSize: 12,
        color: '#64748b',
        formatter: (value) => (value % 120 === 0 ? `${String(value / 60).padStart(2, '0')}:00` : '')
      },
      axisLine: { lineStyle: { color: '#e5e7eb' } },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: '#eef0f4', type: 'dashed' } }
    },
    yAxis: {
      type: 'category',
      data: dates,
      inverse: true,
      axisTick: { show: false },
      axisLine: { lineStyle: { color: '#e5e7eb' } },
      axisLabel: {
        fontSize: 12,
        margin: 12,
        formatter: (date) => {
          const [m, d] = date.slice(5).split('-')
          return `${m}-${d} ${weekday(date)}`
        },
        color: (value) => (isWeekend(value) ? '#9aa3b2' : value === today ? '#3b82f6' : '#334155')
      },
      splitLine: { lineStyle: { color: '#eef0f4', type: 'dashed' } }
    },
    dataZoom: [
      { type: 'inside', xAxisIndex: 0, filterMode: 'none' },
      { type: 'slider', xAxisIndex: 0, height: 16, bottom: 30, filterMode: 'none' }
    ],
    graphic: days.value.length
      ? []
      : [
          {
            type: 'text',
            left: 'center',
            top: 'middle',
            style: { text: '当前区间暂无日程', fill: '#94a3b8', fontSize: 14 }
          }
        ],
    series: buildSeries()
  }
}

function renderChart() {
  if (isNarrow.value || loadError.value) return
  nextTick(() => {
    if (!chartRef.value) return
    if (!chart) {
      chart = echarts.init(chartRef.value)
      chart.on('click', handleClick)
    }
    chart.setOption(buildOption(), true)
    chart.resize()
  })
}

function handleClick(params) {
  const meta = params.data?.meta
  if (meta) openBlock(meta)
}

async function loadData() {
  loading.value = true
  loadError.value = false
  try {
    const target = engineerId.value || userStore.currentUser?.id
    if (!target) {
      blocks.value = []
      return
    }
    const data = await getEngineerCalendar(target, {
      ...range(),
      types: 'WORK_ORDER,MAINT_TASK,INSPECTION,DUTY'
    })
    blocks.value = data?.blocks || []
  } catch (e) {
    loadError.value = true
    blocks.value = []
  } finally {
    loading.value = false
    renderChart()
  }
}

function handleResize() {
  const narrow = mediaQuery ? mediaQuery.matches : window.innerWidth < 768
  isNarrow.value = narrow
  if (narrow) {
    chart?.dispose()
    chart = null
  } else {
    renderChart()
  }
}

watch(blocks, () => renderChart())

onMounted(async () => {
  mediaQuery = window.matchMedia('(max-width: 768px)')
  isNarrow.value = mediaQuery.matches
  mediaQuery.addEventListener('change', handleResize)
  window.addEventListener('resize', handleResize)

  if (canChooseRepairer.value) {
    engineers.value = (await getEngineers().catch(() => [])) || []
    engineerId.value = engineers.value[0]?.id || null
  } else if (REPAIRER_ROLES.includes(userStore.role)) {
    engineerId.value = userStore.currentUser?.id
  }
  await loadData()
  if (!isNarrow.value && chartRef.value) {
    if (!chart) {
      chart = echarts.init(chartRef.value)
      chart.on('click', handleClick)
    }
    chart.setOption(buildOption(), true)
  }
})

onUnmounted(() => {
  mediaQuery?.removeEventListener('change', handleResize)
  window.removeEventListener('resize', handleResize)
  chart?.dispose()
  chart = null
})
</script>

<style scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
  gap: 12px;
  flex-wrap: wrap;
}
.title {
  font-size: 16px;
  font-weight: 600;
  margin-right: 8px;
}
.sub {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.ops {
  display: flex;
  align-items: center;
  gap: 10px;
}
.summary {
  margin-bottom: 12px;
}
.summary :deep(.el-card__body) {
  text-align: center;
  padding: 12px;
}
.metric {
  font-size: 22px;
  font-weight: 600;
}
.label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.chart {
  width: 100%;
}
.mobile {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.day-card {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  padding: 10px 12px;
}
.day-head {
  display: flex;
  justify-content: space-between;
  font-weight: 600;
  margin-bottom: 8px;
}
.mobile-item {
  border-left: 3px solid #94a3b8;
  padding: 6px 0 6px 10px;
  cursor: pointer;
}
.mobile-item + .mobile-item {
  border-top: 1px dashed var(--el-border-color-lighter);
}
.mobile-title {
  font-size: 14px;
  margin-bottom: 2px;
}
</style>
