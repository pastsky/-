<template>
  <el-card class="calendar-page">
    <div class="header">
      <div class="title-block">
        <span class="title">维修日历</span>
        <span class="sub">按月查看工作热度，颜色越深当日单据越多；点击日期查看详情</span>
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
        <el-button-group>
          <el-button :icon="ArrowLeft" @click="shiftMonth(-1)" />
          <el-date-picker
            v-model="month"
            type="month"
            value-format="YYYY-MM"
            :clearable="false"
            style="width: 130px"
            @change="loadData"
          />
          <el-button :icon="ArrowRight" @click="shiftMonth(1)" />
        </el-button-group>
        <el-button @click="loadData">刷新</el-button>
      </div>
    </div>

    <div class="summary">
      <div class="metric-item">
        <span class="metric">{{ days.length }}</span>
        <span class="label">有单天数</span>
      </div>
      <div class="metric-item">
        <span class="metric">{{ blocks.length }}</span>
        <span class="label">业务单据</span>
      </div>
      <div class="metric-item">
        <span class="metric">{{ totalHours }}</span>
        <span class="label">累计工时（h）</span>
      </div>
      <div class="metric-item">
        <span class="metric peak">{{ peakDay }}</span>
        <span class="label">最忙日期</span>
      </div>
    </div>

    <ListError :failed="loadError" :loading="loading" @retry="loadData" />

    <el-skeleton v-if="loading && !blocks.length" :rows="6" animated />

    <div v-else-if="!loadError" class="heat-wrap">
      <div class="heat-weekdays">
        <span v-for="w in WEEKDAYS" :key="w">{{ w }}</span>
      </div>
      <div class="heat-grid">
        <template v-for="(cell, i) in calendarCells" :key="i">
          <div v-if="!cell" class="heat-slot" />
          <button
            v-else
            type="button"
            class="heat-cell"
            :class="[`lvl-${cell.level}`, { busy: cell.total, today: cell.isToday }]"
            :disabled="!cell.total"
            @click="openDay(cell)"
          >
            <span class="day-num">{{ cell.day }}</span>
            <span v-if="cell.total" class="day-count">{{ cell.total }}</span>
            <span class="dots">
              <i v-for="t in cell.types" :key="t" :class="['dot', `dot-${t}`]" />
            </span>
          </button>
        </template>
      </div>
      <div class="legend">
        <span class="sub">活动量</span>
        <i v-for="lvl in 5" :key="lvl" :class="['legend-cell', `lvl-${lvl - 1}`]" />
        <span class="sub">少 → 多</span>
      </div>
      <el-empty v-if="!days.length" description="本月暂无日程" :image-size="72" />
    </div>

    <el-drawer v-model="detailVisible" :title="detailTitle" size="420px" append-to-body>
      <template v-if="activeDay">
        <div class="detail-summary">
          <div class="detail-metric">
            <b>{{ activeDay.total }}</b><span class="sub"> 张单据</span>
          </div>
          <div class="detail-metric">
            <b>{{ activeDay.hours }}</b><span class="sub"> 小时</span>
          </div>
        </div>
        <el-timeline>
          <el-timeline-item
            v-for="b in activeDay.items"
            :key="b.key"
            :timestamp="`${b.start}${b.end ? ' - ' + b.end : ' 起'}`"
            placement="top"
            :color="COLOR[b.blockType]"
          >
            <div
              class="detail-item"
              :class="{ link: b.blockType !== 'DUTY' }"
              @click="openBlock(b)"
            >
              <div class="detail-title">
                <el-tag size="small" :color="COLOR[b.blockType]" effect="dark" class="type-tag">
                  {{ typeLabel(b.blockType) }}
                </el-tag>
                <span>{{ b.title || b.bizNo }}</span>
              </div>
              <div class="sub">
                {{ b.bizNo }}
                <template v-if="b.elevatorNo"> · {{ b.elevatorNo }}</template>
                <template v-if="b.building"> · {{ b.building }}</template>
              </div>
              <div class="detail-meta">
                <el-tag v-if="b.status" size="small" type="info">{{ b.status }}</el-tag>
                <span v-if="isOverdue(b)" class="overdue">已超时</span>
                <span v-if="b.blockType !== 'DUTY'" class="sub">点击查看详情 →</span>
              </div>
            </div>
          </el-timeline-item>
        </el-timeline>
      </template>
    </el-drawer>
  </el-card>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue'
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
const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

const loading = ref(false)
const loadError = ref(false)
const month = ref(new Date().toISOString().slice(0, 7))
const blocks = ref([])
const engineers = ref([])
const engineerId = ref(null)
const detailVisible = ref(false)
const activeDay = ref(null)

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

const peakDay = computed(() => {
  if (!days.value.length) return '—'
  const top = days.value.reduce((a, b) => (b.items.length > a.items.length ? b : a))
  return top.date.slice(5)
})

// 月历网格：周一为第一列，按当日单据量映射 0~4 级热度
const calendarCells = computed(() => {
  const [y, m] = month.value.split('-').map(Number)
  const leading = (new Date(y, m - 1, 1).getDay() + 6) % 7
  const total = new Date(y, m, 0).getDate()
  const map = {}
  days.value.forEach((d) => {
    map[d.date] = d
  })
  const max = Math.max(4, ...days.value.map((d) => d.items.length))
  const today = new Date().toISOString().slice(0, 10)
  const cells = []
  for (let i = 0; i < leading; i += 1) cells.push(null)
  for (let d = 1; d <= total; d += 1) {
    const date = `${month.value}-${String(d).padStart(2, '0')}`
    const day = map[date]
    const items = day?.items || []
    cells.push({
      date,
      day: d,
      items,
      total: items.length,
      hours: day ? dayHours(day) : '0.0',
      types: [...new Set(items.map((i) => i.blockType))],
      isToday: date === today,
      level: items.length ? Math.min(4, Math.ceil((items.length / max) * 4)) : 0
    })
  }
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
})

const detailTitle = computed(() =>
  activeDay.value
    ? `${activeDay.value.date} ${weekday(activeDay.value.date)} · 当日单据`
    : '当日单据'
)

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

function typeLabel(type) {
  return TYPE_LABEL[type] || type
}

function dayHours(day) {
  const minutes = day.items.reduce((s, b) => (b.end ? s + diffMinutes(b.start, b.end) : 0), 0)
  return (minutes / 60).toFixed(1)
}

function isOverdue(b) {
  return !!b.overdue || ['ESCALATED', 'MISSED'].includes(b.status)
}

function shiftMonth(delta) {
  const [y, m] = month.value.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  month.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  loadData()
}

function openDay(cell) {
  activeDay.value = cell
  detailVisible.value = true
}

function openBlock(b) {
  if (b.blockType === 'WORK_ORDER') router.push(`/work-orders/${b.bizId}`)
  else if (b.blockType === 'MAINT_TASK') router.push({ path: '/maintenance', query: { taskId: b.bizId } })
  else if (b.blockType === 'INSPECTION') router.push({ path: '/inspection', query: { taskId: b.bizId } })
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
  }
}

onMounted(async () => {
  if (canChooseRepairer.value) {
    engineers.value = (await getEngineers().catch(() => [])) || []
    engineerId.value = engineers.value[0]?.id || null
  } else if (REPAIRER_ROLES.includes(userStore.role)) {
    engineerId.value = userStore.currentUser?.id
  }
  await loadData()
})
</script>

<style scoped>
.header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 16px;
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
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 16px;
}
.metric-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 14px;
  background: #f7f8fa;
  border-radius: 10px;
}
.metric {
  font-size: 22px;
  font-weight: 600;
  line-height: 1.2;
  color: var(--el-text-color-primary);
}
.metric.peak {
  font-size: 18px;
}
.label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.heat-wrap {
  width: 100%;
}
.heat-weekdays {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 8px;
}
.heat-weekdays span {
  text-align: center;
  font-size: 12px;
  font-weight: 500;
  color: var(--el-text-color-secondary);
  padding: 2px 0;
}
.heat-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 8px;
}
.heat-slot {
  min-height: 68px;
}
.heat-cell {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: space-between;
  min-height: 68px;
  padding: 8px 10px;
  border: none;
  border-radius: 12px;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: transform 0.16s ease, box-shadow 0.16s ease, filter 0.16s ease;
}
.heat-cell.busy:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 18px rgba(47, 111, 237, 0.16);
  filter: brightness(1.03);
}
.heat-cell:disabled {
  cursor: default;
}
.heat-cell:focus-visible {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 2px;
}
.heat-cell.lvl-0 {
  background: #f7f8fa;
  color: var(--el-text-color-placeholder);
}
.heat-cell.lvl-1 {
  background: #eaf2ff;
  color: #1e3f73;
}
.heat-cell.lvl-2 {
  background: #cfe0ff;
  color: #173666;
}
.heat-cell.lvl-3 {
  background: #8ab4fb;
  color: #ffffff;
}
.heat-cell.lvl-4 {
  background: #2f6fed;
  color: #ffffff;
}
.heat-cell.today {
  box-shadow: inset 0 0 0 2px var(--el-color-primary);
}
.heat-cell.today.lvl-3,
.heat-cell.today.lvl-4 {
  box-shadow: inset 0 0 0 2px #ffffff;
}
.day-num {
  font-size: 14px;
  font-weight: 600;
  line-height: 1;
}
.day-count {
  position: absolute;
  top: 8px;
  right: 10px;
  font-size: 12px;
  font-weight: 600;
  opacity: 0.85;
}
.dots {
  display: flex;
  gap: 4px;
  height: 6px;
}
.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #94a3b8;
}
.dot-WORK_ORDER {
  background: #f59e0b;
}
.dot-MAINT_TASK {
  background: #10b981;
}
.dot-INSPECTION {
  background: #8b5cf6;
}
.dot-DUTY {
  background: #94a3b8;
}
.legend {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  margin-top: 14px;
}
.legend-cell {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  display: inline-block;
}
.legend-cell.lvl-0 {
  background: #f7f8fa;
}
.legend-cell.lvl-1 {
  background: #eaf2ff;
}
.legend-cell.lvl-2 {
  background: #cfe0ff;
}
.legend-cell.lvl-3 {
  background: #8ab4fb;
}
.legend-cell.lvl-4 {
  background: #2f6fed;
}
.detail-summary {
  display: flex;
  gap: 24px;
  padding: 10px 14px;
  margin-bottom: 16px;
  background: #f7f8fa;
  border-radius: 10px;
}
.detail-metric b {
  font-size: 20px;
  margin-right: 4px;
}
.detail-item {
  padding: 2px 0 6px;
}
.detail-item.link {
  cursor: pointer;
}
.detail-item.link:hover .detail-title span:last-child {
  color: var(--el-color-primary);
}
.detail-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 4px;
}
.type-tag {
  border: none;
  color: #fff;
}
.detail-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}
.overdue {
  font-size: 12px;
  color: var(--el-color-danger);
  font-weight: 600;
}
@media (max-width: 768px) {
  .summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .heat-grid,
  .heat-weekdays {
    gap: 4px;
  }
  .heat-slot,
  .heat-cell {
    min-height: 48px;
    border-radius: 8px;
    padding: 4px 6px;
  }
  .day-num {
    font-size: 12px;
  }
  .day-count {
    top: 4px;
    right: 6px;
    font-size: 10px;
  }
  .dots {
    display: none;
  }
  .ops {
    width: 100%;
    flex-wrap: wrap;
  }
}
</style>
