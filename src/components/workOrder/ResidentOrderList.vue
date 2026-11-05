<template>
  <div class="resident">
    <el-card class="hero" shadow="never">
      <div class="hero-body">
        <div>
          <div class="hero-title">需要维修？</div>
          <div class="sub">提交报修后客服会尽快派单，处理进度可在下方实时查看</div>
        </div>
        <div class="hero-ops">
          <el-button type="primary" size="large" @click="goCreate">我要报修</el-button>
          <el-button size="large" @click="openNotices">小区公告</el-button>
        </div>
      </div>
    </el-card>

    <div class="list-head">
      <span class="page-title">我的报修</span>
      <div class="ops">
        <el-input
          v-model="keyword"
          placeholder="单号 / 事项"
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
      <el-empty v-if="!list.length" description="还没有报修记录">
        <el-button type="primary" @click="goCreate">我要报修</el-button>
      </el-empty>

      <div v-else class="cards">
        <el-card v-for="row in list" :key="row.id" class="order-card" shadow="hover">
          <div class="card-top">
            <div>
              <div class="title-text">{{ row.title }}</div>
              <div class="order-no">{{ row.orderNo }}</div>
            </div>
            <el-tag :type="WORK_ORDER_STATUS_TAG[row.status] || 'info'" size="small">
              {{ WORK_ORDER_STATUS_MAP[row.status] || row.status }}
            </el-tag>
          </div>

          <div class="meta">
            <span><el-icon><Calendar /></el-icon>{{ formatAppointment(row.appointmentTime) }}</span>
            <span><el-icon><Location /></el-icon>{{ row.location || '—' }}</span>
            <span v-if="row.assigneeName"><el-icon><User /></el-icon>{{ row.assigneeName }}</span>
          </div>

          <div class="steps">
            <div
              v-for="(step, i) in STEPS"
              :key="step"
              class="step"
              :class="{ done: i <= activeStep(row), current: i === activeStep(row) }"
            >
              <span class="label">{{ step }}</span>
            </div>
          </div>

          <div class="actions">
            <el-button link type="primary" @click="goDetail(row)">查看详情</el-button>
            <el-button v-if="canRate(row)" type="warning" size="small" @click="openRate(row)">
              评价
            </el-button>
            <el-button v-if="canUrge(row)" size="small" @click="handleUrge(row)">催单</el-button>
          </div>
        </el-card>
      </div>
    </template>

    <el-dialog v-model="rateVisible" title="评价本次维修" width="420px">
      <div class="rate-body">
        <el-rate v-model="rateForm.rating" :max="5" show-text :texts="RATE_TEXTS" />
        <el-input
          v-model="rateForm.comment"
          type="textarea"
          :rows="3"
          placeholder="补充你的意见（选填）"
        />
      </div>
      <template #footer>
        <el-button @click="rateVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitRate">提交评价</el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="noticeVisible" title="小区公告" size="420px">
      <div v-loading="noticeLoading" class="notice-list">
        <div v-for="n in notices" :key="n.id" class="notice-item">
          <div class="notice-title">{{ n.title }}</div>
          <div class="notice-content">{{ n.content }}</div>
          <div class="notice-time">{{ n.createdAt }}</div>
        </div>
        <el-empty v-if="!noticeLoading && !notices.length" description="暂无公告" />
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { notify } from '@/utils/notify'
import { getWorkOrderList, rateWorkOrder } from '@/api/workOrder'
import { getNotificationList } from '@/api/notification'
import { createFeedback } from '@/api/feedback'
import ListError from '@/components/ListError.vue'
import {
  WORK_ORDER_STATUS_MAP,
  WORK_ORDER_STATUS_TAG,
  formatAppointment
} from '@/utils/dict'

const route = useRoute()
const router = useRouter()

const STEPS = ['提交', '派单', '上门', '完成', '评价']
const RATE_TEXTS = ['很不满意', '不满意', '一般', '满意', '非常满意']
const STEP_BY_STATUS = {
  PENDING: 0,
  ASSIGNED: 1,
  PROCESSING: 2,
  COMPLETED: 3,
  PENDING_REVIEW: 3,
  CLOSED: 4
}

const loading = ref(false)
const loadError = ref(false)
const list = ref([])
const keyword = ref('')

const rateVisible = ref(false)
const submitting = ref(false)
const rateRow = ref(null)
const rateForm = reactive({ rating: 5, comment: '' })

const noticeVisible = ref(false)
const noticeLoading = ref(false)
const notices = ref([])

function activeStep(row) {
  return STEP_BY_STATUS[row.status] ?? 0
}

function canRate(row) {
  return ['COMPLETED', 'PENDING_REVIEW'].includes(row.status)
}

function canUrge(row) {
  return ['PENDING', 'ASSIGNED', 'PROCESSING'].includes(row.status)
}

async function loadData() {
  loading.value = true
  loadError.value = false
  try {
    const data = await getWorkOrderList({
      page: 1,
      pageSize: 50,
      keyword: keyword.value || undefined
    })
    list.value = data?.list || []
  } catch (e) {
    loadError.value = true
  } finally {
    loading.value = false
  }
}

function goCreate() {
  router.push('/work-orders/create')
}

function goDetail(row) {
  router.push(`/work-orders/${row.id}`)
}

function openRate(row) {
  rateRow.value = row
  rateForm.rating = 5
  rateForm.comment = ''
  rateVisible.value = true
}

async function submitRate() {
  submitting.value = true
  try {
    await rateWorkOrder(rateRow.value.id, {
      rating: rateForm.rating,
      comment: rateForm.comment
    })
    notify.success('评价已提交，工单已归档')
    rateVisible.value = false
    loadData()
  } finally {
    submitting.value = false
  }
}

// 后端暂无独立催单接口，走反馈通道提醒客服跟进
async function handleUrge(row) {
  try {
    await ElMessageBox.confirm('确认向客服发起催单提醒？', '催单')
  } catch (e) {
    return
  }
  try {
    await createFeedback({
      orderId: row.id,
      content: `【催单】工单 ${row.orderNo}：${row.title}`,
      images: []
    })
    notify.success('已发送催单提醒，客服会尽快跟进')
  } catch (e) {
    // 失败原因由请求拦截器提示
  }
}

async function openNotices() {
  noticeVisible.value = true
  noticeLoading.value = true
  try {
    const data = await getNotificationList({ page: 1, pageSize: 20, type: 'ANNOUNCEMENT' })
    notices.value = data?.list || []
  } catch (e) {
    notices.value = []
  } finally {
    noticeLoading.value = false
  }
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
.hero {
  margin-bottom: 18px;
}
.hero-body {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.hero-title {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 4px;
}
.hero-ops {
  display: flex;
  gap: 10px;
}
.sub {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.list-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  flex-wrap: wrap;
  gap: 10px;
}
.page-title {
  font-size: 16px;
  font-weight: 600;
}
.ops {
  display: flex;
  align-items: center;
  gap: 10px;
}
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 14px;
}
.card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.title-text {
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}
.order-no {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 2px;
}
.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 18px;
  margin-top: 10px;
  font-size: 13px;
  color: var(--el-text-color-regular);
}
.meta span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.steps {
  display: flex;
  margin: 18px 0 6px;
}
.step {
  flex: 1;
  position: relative;
  text-align: center;
  padding-top: 16px;
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}
.step::before {
  content: '';
  position: absolute;
  top: 5px;
  left: calc(-50% + 7px);
  right: calc(50% + 7px);
  height: 2px;
  background: var(--el-border-color);
}
.step:first-child::before {
  display: none;
}
.step::after {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--el-border-color);
}
.step.done {
  color: var(--el-text-color-regular);
}
.step.done::after {
  background: var(--el-color-primary);
}
.step.done::before {
  background: var(--el-color-primary);
}
.step.current {
  color: var(--el-color-primary);
  font-weight: 600;
}
.step.current::after {
  box-shadow: 0 0 0 3px var(--el-color-primary-light-8);
}
.actions {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 10px;
  border-top: 1px dashed var(--el-border-color-lighter);
}
.rate-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.notice-item {
  padding: 12px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}
.notice-title {
  font-weight: 600;
}
.notice-content {
  font-size: 13px;
  color: var(--el-text-color-regular);
  margin-top: 4px;
}
.notice-time {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 6px;
}
@media (max-width: 768px) {
  .cards {
    grid-template-columns: 1fr;
  }
  .hero-ops {
    width: 100%;
  }
  .hero-ops .el-button {
    flex: 1;
  }
}
</style>
