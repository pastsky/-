<template>
  <div>
    <el-page-header class="page-header" content="工单详情" @back="$router.back()" />

    <el-card v-loading="loading">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="工单号">{{ detail.orderNo }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="WORK_ORDER_STATUS_TAG[detail.status]" size="small">
            {{ WORK_ORDER_STATUS_MAP[detail.status] }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="标题" :span="2">{{ detail.title }}</el-descriptions-item>
        <el-descriptions-item label="位置">{{ detail.location || '—' }}</el-descriptions-item>
        <el-descriptions-item label="优先级">
          {{ WORK_ORDER_PRIORITY_MAP[detail.priority] }}
        </el-descriptions-item>
        <el-descriptions-item label="类型">{{ WORK_ORDER_TYPE_MAP[detail.type] }}</el-descriptions-item>
        <el-descriptions-item label="报修人">{{ detail.reporter?.realName || '—' }}</el-descriptions-item>
        <el-descriptions-item label="问题描述" :span="2">{{ detail.description || '—' }}</el-descriptions-item>
        <el-descriptions-item label="处理人">{{ detail.assignee?.realName || '—' }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ detail.createdAt }}</el-descriptions-item>
        <el-descriptions-item label="完工时间">{{ detail.finishTime || '—' }}</el-descriptions-item>
        <el-descriptions-item label="关闭时间">{{ detail.closeTime || '—' }}</el-descriptions-item>
        <el-descriptions-item v-if="detail.cancelTime" label="取消时间">{{ detail.cancelTime }}</el-descriptions-item>
        <el-descriptions-item v-if="detail.rating" label="评价" :span="2">
          <el-rate :model-value="detail.rating" disabled />
          <span class="rate-text">{{ detail.ratingComment || '' }}</span>
          <span v-if="detail.ratedAt" class="rate-time">{{ detail.ratedAt }}</span>
        </el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-card class="section">
      <div class="action-bar">
        <el-button v-if="canEdit" @click="goEdit">编辑</el-button>
        <el-button v-if="canAssign" type="primary" @click="openAssign">派单</el-button>
        <el-button v-if="canReturn" @click="handleReturn">退回</el-button>
        <el-button v-if="canAccept" type="primary" @click="handleAccept">接单</el-button>
        <el-button v-if="canComplete" type="primary" @click="handleComplete">完工</el-button>
        <el-button v-if="canClose" @click="handleClose">关闭</el-button>
        <el-button v-if="canRate" type="warning" @click="openRate">评价</el-button>
        <el-button v-if="canCancel" type="danger" @click="handleCancel">取消工单</el-button>
      </div>
    </el-card>

    <el-card class="section">
      <template #header>流转记录</template>
      <el-timeline v-if="logList.length">
        <el-timeline-item
          v-for="(log, i) in logList"
          :key="i"
          :timestamp="log.createdAt"
          placement="top"
        >
          {{ log.operatorName }} · {{ WORK_ORDER_ACTION_MAP[log.action] }}
          <span v-if="log.remark" class="log-remark">（{{ log.remark }}）</span>
        </el-timeline-item>
      </el-timeline>
      <el-empty v-else description="暂无记录" />
    </el-card>

    <el-dialog v-model="assignVisible" title="派单" width="440px">
      <el-form label-width="80px">
        <el-form-item label="维修工">
          <el-select v-model="assignForm.assigneeId" placeholder="请选择维修工" style="width: 100%">
            <el-option
              v-for="e in engineers"
              :key="e.id"
              :label="`${e.realName}（${e.phone || '—'}）`"
              :value="e.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="优先级">
          <el-select v-model="assignForm.priority" clearable placeholder="不变更" style="width: 100%">
            <el-option
              v-for="o in WORK_ORDER_PRIORITY_OPTIONS"
              :key="o.value"
              :label="o.label"
              :value="o.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="assignForm.remark" type="textarea" placeholder="派单说明" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="assignVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitAssign">确定派单</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="rateVisible" title="评价工单" width="440px">
      <el-form label-width="60px">
        <el-form-item label="评分">
          <el-rate v-model="rateForm.rating" />
        </el-form-item>
        <el-form-item label="评论">
          <el-input v-model="rateForm.comment" type="textarea" placeholder="说说处理情况" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rateVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitRate">提交评价</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getWorkOrderDetail,
  getWorkOrderLogs,
  assignWorkOrder,
  returnWorkOrder,
  acceptWorkOrder,
  completeWorkOrder,
  closeWorkOrder,
  cancelWorkOrder,
  rateWorkOrder
} from '@/api/workOrder'
import { getEngineers } from '@/api/user'
import { useUserStore } from '@/stores/user'
import {
  WORK_ORDER_STATUS_MAP,
  WORK_ORDER_STATUS_TAG,
  WORK_ORDER_TYPE_MAP,
  WORK_ORDER_PRIORITY_MAP,
  WORK_ORDER_PRIORITY_OPTIONS,
  WORK_ORDER_ACTION_MAP
} from '@/utils/dict'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const id = route.params.id

const loading = ref(false)
const submitting = ref(false)
const detail = ref({})
const logList = ref([])
const engineers = ref([])
const assignVisible = ref(false)
const rateVisible = ref(false)
const assignForm = reactive({ assigneeId: null, remark: '', priority: '' })
const rateForm = reactive({ rating: 0, comment: '' })

const role = computed(() => userStore.role)
const status = computed(() => detail.value.status)
const isAssignee = computed(() => detail.value.assignee?.id === userStore.currentUser?.id)
const isReporter = computed(() => detail.value.reporter?.id === userStore.currentUser?.id)

const canEdit = computed(
  () => ['RESIDENT', 'ADMIN'].includes(role.value) && status.value === 'PENDING'
)
const canAssign = computed(
  () => ['CUSTOMER_SERVICE', 'ADMIN'].includes(role.value) && status.value === 'PENDING'
)
const canReturn = computed(
  () => role.value === 'ENGINEER' && status.value === 'ASSIGNED' && isAssignee.value
)
const canAccept = computed(
  () => role.value === 'ENGINEER' && status.value === 'ASSIGNED' && isAssignee.value
)
const canComplete = computed(
  () => role.value === 'ENGINEER' && status.value === 'PROCESSING' && isAssignee.value
)
const canClose = computed(
  () => ['CUSTOMER_SERVICE', 'ADMIN'].includes(role.value) && status.value === 'COMPLETED'
)
const canRate = computed(
  () =>
    role.value === 'RESIDENT' &&
    status.value === 'COMPLETED' &&
    detail.value.rating === 0 &&
    isReporter.value
)
const canCancel = computed(
  () =>
    ['RESIDENT', 'CUSTOMER_SERVICE', 'ADMIN'].includes(role.value) &&
    ['PENDING', 'ASSIGNED'].includes(status.value)
)

async function loadDetail() {
  loading.value = true
  try {
    detail.value = await getWorkOrderDetail(id)
    logList.value = await getWorkOrderLogs(id)
  } finally {
    loading.value = false
  }
}

function goEdit() {
  router.push(`/work-orders/${id}/edit`)
}

async function openAssign() {
  if (!engineers.value.length) {
    engineers.value = await getEngineers()
  }
  assignForm.assigneeId = null
  assignForm.remark = ''
  assignForm.priority = ''
  assignVisible.value = true
}

async function submitAssign() {
  if (!assignForm.assigneeId) {
    ElMessage.warning('请选择维修工')
    return
  }
  submitting.value = true
  try {
    await assignWorkOrder(id, {
      assigneeId: assignForm.assigneeId,
      remark: assignForm.remark,
      priority: assignForm.priority || undefined
    })
    assignVisible.value = false
    ElMessage.success('派单成功')
    loadDetail()
  } finally {
    submitting.value = false
  }
}

async function handleReturn() {
  const { value } = await ElMessageBox.prompt('请输入退回原因', '退回工单', {
    confirmButtonText: '确定',
    cancelButtonText: '取消'
  })
  await returnWorkOrder(id, { remark: value || '' })
  ElMessage.success('已退回')
  loadDetail()
}

async function handleAccept() {
  await ElMessageBox.confirm('确认接单？', '接单')
  await acceptWorkOrder(id, {})
  ElMessage.success('已接单')
  loadDetail()
}

async function handleComplete() {
  const { value } = await ElMessageBox.prompt('请输入完工说明', '完工', {
    confirmButtonText: '确定',
    cancelButtonText: '取消'
  })
  await completeWorkOrder(id, { remark: value || '' })
  ElMessage.success('已完工')
  loadDetail()
}

async function handleClose() {
  await ElMessageBox.confirm('确认关闭该工单？', '关闭工单')
  await closeWorkOrder(id, {})
  ElMessage.success('已关闭')
  loadDetail()
}

async function handleCancel() {
  const { value } = await ElMessageBox.prompt('请输入取消原因', '取消工单', {
    confirmButtonText: '确定',
    cancelButtonText: '取消'
  })
  await cancelWorkOrder(id, { remark: value || '' })
  ElMessage.success('已取消')
  loadDetail()
}

function openRate() {
  rateForm.rating = 0
  rateForm.comment = ''
  rateVisible.value = true
}

async function submitRate() {
  if (!rateForm.rating) {
    ElMessage.warning('请选择评分')
    return
  }
  submitting.value = true
  try {
    await rateWorkOrder(id, { rating: rateForm.rating, comment: rateForm.comment })
    rateVisible.value = false
    ElMessage.success('评价成功')
    loadDetail()
  } finally {
    submitting.value = false
  }
}

onMounted(loadDetail)
</script>

<style scoped>
.page-header {
  margin-bottom: 16px;
}
.section {
  margin-top: 16px;
}
.action-bar {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.rate-text {
  margin-left: 12px;
  color: var(--el-text-color-secondary);
}
.rate-time {
  margin-left: 8px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
.log-remark {
  color: var(--el-text-color-secondary);
}
</style>
