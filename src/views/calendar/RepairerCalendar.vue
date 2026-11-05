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
            :label="`${e.realName}（${e.groupName}）`"
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

    <div v-loading="loading" class="calendar">
      <div v-for="day in days" :key="day.date" class="day-row">
        <div class="day-label">
          <div class="date">{{ day.date.slice(5) }}</div>
          <div class="week">{{ weekday(day.date) }}</div>
        </div>
        <div class="track">
          <div v-for="h in 12" :key="h" class="tick"></div>
          <el-tooltip
            v-for="b in day.items"
            :key="b.key"
            :content="`${b.bizNo} ${b.title}（${b.start}${b.end ? ' - ' + b.end : ' 起'}）`"
            placement="top"
          >
            <div class="bar" :class="barClass(b)" :style="barStyle(b)" @click="openBlock(b)">
              <span class="bar-text">{{ b.typeLabel || '' }} {{ b.building || '' }}</span>
            </div>
          </el-tooltip>
        </div>
      </div>
      <el-empty v-if="!days.length && !loading" description="当前区间暂无日程" />
    </div>
  </el-card>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getEngineerCalendar } from '@/api/workOrder'
import { getEngineers } from '@/api/user'
import { useUserStore } from '@/stores/user'
import { REPAIRER_ROLES } from '@/utils/dict'

const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const month = ref(new Date().toISOString().slice(0, 7))
const blocks = ref([])
const engineers = ref([])
const engineerId = ref(null)

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
    map[date].push({ ...b, key: `${b.blockType}-${b.bizId}-${i}`, start: fmt(b.startTime), end: b.endTime ? fmt(b.endTime) : '' })
  })
  return Object.keys(map)
    .sort()
    .map((date) => ({ date, items: map[date] }))
})

const totalHours = computed(() => {
  const minutes = days.value.reduce(
    (sum, d) =>
      sum +
      d.items.reduce((s, b) => (b.end ? s + diffMinutes(b.start, b.end) : s), 0),
    0
  )
  return (minutes / 60).toFixed(1)
})

function fmt(value) {
  return value.includes(' ') ? value.slice(11, 16) : value.slice(0, 5)
}

function diffMinutes(start, end) {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  return Math.max(0, eh * 60 + em - (sh * 60 + sm))
}

function weekday(date) {
  return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][new Date(date).getDay()]
}

function barStyle(b) {
  const [h, m] = b.start.split(':').map(Number)
  const startMin = h * 60 + m
  const dur = b.end ? Math.max(30, diffMinutes(b.start, b.end)) : 60
  return {
    left: `${(startMin / 1440) * 100}%`,
    width: `${Math.min(100 - (startMin / 1440) * 100, (dur / 1440) * 100)}%`
  }
}

function barClass(b) {
  if (b.blockType === 'DUTY') return 'duty'
  if (b.blockType === 'INSPECTION') return 'inspection'
  if (b.blockType === 'MAINT_TASK') return 'maint'
  if (b.status === 'PROCESSING') return 'processing'
  if (['COMPLETED', 'PENDING_REVIEW', 'CLOSED'].includes(b.status)) return 'done'
  return 'assigned'
}

function openBlock(b) {
  if (b.blockType === 'WORK_ORDER') router.push(`/work-orders/${b.bizId}`)
}

async function loadData() {
  loading.value = true
  try {
    const target = engineerId.value || userStore.currentUser?.id
    if (!target) {
      blocks.value = []
      return
    }
    const data = await getEngineerCalendar(target, { ...range(), types: 'WORK_ORDER,MAINT_TASK,INSPECTION,DUTY' })
    blocks.value = data.blocks || []
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  if (canChooseRepairer.value) {
    engineers.value = await getEngineers()
    engineerId.value = engineers.value[0]?.id || null
  } else if (REPAIRER_ROLES.includes(userStore.role)) {
    engineerId.value = userStore.currentUser?.id
  }
  loadData()
})
</script>

<style scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
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
.calendar {
  min-height: 120px;
}
.day-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 0;
  border-bottom: 1px dashed var(--el-border-color-lighter);
}
.day-label {
  width: 64px;
  text-align: right;
}
.date {
  font-size: 13px;
  font-weight: 600;
}
.week {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}
.track {
  position: relative;
  flex: 1;
  height: 30px;
  background: var(--el-fill-color-light);
  border-radius: 6px;
  display: flex;
  overflow: hidden;
}
.tick {
  flex: 1;
  border-right: 1px solid var(--el-border-color-lighter);
}
.bar {
  position: absolute;
  top: 4px;
  height: 22px;
  border-radius: 4px;
  cursor: pointer;
  padding: 0 6px;
  display: flex;
  align-items: center;
  overflow: hidden;
  color: #fff;
  font-size: 11px;
}
.bar.assigned {
  background: var(--el-color-primary);
}
.bar.processing {
  background: var(--el-color-warning);
}
.bar.done {
  background: var(--el-color-success);
}
.bar.maint {
  background: #7c3aed;
}
.bar.inspection {
  background: #0891b2;
}
.bar.duty {
  background: #64748b;
}
.bar-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
