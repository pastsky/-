<template>
  <el-card>
    <div class="header">
      <div>
        <span class="title">维修日历</span>
        <span class="sub">按接单→完工时间段展示，30 分钟刻度；点击色块查看工单</span>
      </div>
      <div class="ops">
        <el-select
          v-if="canChooseRepairer"
          v-model="repairerId"
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
          placeholder="选择月份"
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
        <el-card shadow="never"><div class="metric">{{ totalOrders }}</div><div class="label">工单数</div></el-card>
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
            v-for="o in day.orders"
            :key="o.id"
            :content="`${o.orderNo} ${o.title}（${o.start}${o.end ? ' - ' + o.end : ' 起'}）`"
            placement="top"
          >
            <div
              class="bar"
              :class="barClass(o)"
              :style="barStyle(o)"
              @click="goDetail(o)"
            >
              <span class="bar-text">{{ o.building }} {{ WORK_ORDER_TYPE_MAP[o.type] }}</span>
            </div>
          </el-tooltip>
        </div>
      </div>
      <el-empty v-if="!days.length && !loading" description="本月暂无预约或接单记录" />
    </div>
  </el-card>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getRepairerCalendar } from '@/api/workOrder'
import { getEngineers } from '@/api/user'
import { useUserStore } from '@/stores/user'
import { WORK_ORDER_TYPE_MAP, REPAIRER_ROLES } from '@/utils/dict'

const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const month = ref(new Date().toISOString().slice(0, 7))
const days = ref([])
const engineers = ref([])
const repairerId = ref(null)

const canChooseRepairer = computed(() =>
  ['ADMIN', 'CUSTOMER_SERVICE', 'BRANCH_ADMIN', 'VENDOR_ADMIN'].includes(userStore.role)
)

const totalOrders = computed(() => days.value.reduce((s, d) => s + d.orders.length, 0))
const totalHours = computed(() => {
  const minutes = days.value.reduce((sum, d) => {
    return (
      sum +
      d.orders.reduce((s, o) => {
        if (!o.end) return s
        return s + diffMinutes(o.start, o.end)
      }, 0)
    )
  }, 0)
  return (minutes / 60).toFixed(1)
})

function diffMinutes(start, end) {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  return Math.max(0, eh * 60 + em - (sh * 60 + sm))
}

function weekday(date) {
  return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][new Date(date).getDay()]
}

function barStyle(o) {
  const [h, m] = o.start.split(':').map(Number)
  const startMin = h * 60 + m
  const dur = o.end ? Math.max(30, diffMinutes(o.start, o.end)) : 60
  return {
    left: `${(startMin / 1440) * 100}%`,
    width: `${Math.min(100 - (startMin / 1440) * 100, (dur / 1440) * 100)}%`
  }
}

function barClass(o) {
  if (o.status === 'PROCESSING') return 'processing'
  if (['COMPLETED', 'PENDING_REVIEW'].includes(o.status)) return 'done'
  return 'assigned'
}

function goDetail(o) {
  router.push(`/work-orders/${o.id}`)
}

async function loadData() {
  loading.value = true
  try {
    days.value = await getRepairerCalendar({
      month: month.value,
      repairerId: repairerId.value || undefined
    })
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  if (canChooseRepairer.value) {
    engineers.value = await getEngineers()
  } else if (REPAIRER_ROLES.includes(userStore.role)) {
    repairerId.value = userStore.currentUser?.id
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
.bar-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
