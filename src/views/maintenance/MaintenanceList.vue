<template>
  <el-card>
    <el-tabs v-model="tab">
      <!-- 维保计划 -->
      <el-tab-pane label="维保计划" name="plans">
        <div class="toolbar">
          <el-button v-if="canWrite" type="primary" @click="openPlanCreate">新建计划</el-button>
          <el-input v-model="planKeyword" placeholder="计划名称" clearable style="width: 190px" @change="loadPlans" />
          <span class="sub">计划按电梯范围周期生成任务；生成时选择「指派个人」或「推入任务池」</span>
        </div>
        <ListError :failed="loadError" :loading="planLoading" @retry="reloadAll" />
        <el-table v-if="!loadError" v-loading="planLoading" :data="plans">
          <el-table-column prop="planName" label="计划名称" min-width="170" />
          <el-table-column prop="branchName" label="小区" width="130" show-overflow-tooltip />
          <el-table-column label="频率" width="100">
            <template #default="{ row }">{{ CYCLE_TYPE_MAP[row.cycleType] || row.cycleType }}</template>
          </el-table-column>
          <el-table-column label="有效期" width="200">
            <template #default="{ row }">{{ row.effectiveFrom || '—' }} ~ {{ row.effectiveTo || '长期' }}</template>
          </el-table-column>
          <el-table-column prop="taskCount" label="已生成任务" width="110" />
          <el-table-column label="状态" width="90">
            <template #default="{ row }">
              <el-tag :type="row.status === 'ACTIVE' ? 'success' : 'info'" size="small">
                {{ row.status === 'ACTIVE' ? '启用' : '停用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="190" fixed="right">
            <template #default="{ row }">
              <el-button v-if="canWrite" link type="primary" @click="openGenerate(row)">生成任务</el-button>
              <el-button v-if="isAdmin" link type="primary" @click="openPlanEdit(row)">编辑</el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-pagination
          class="pagination"
          v-model:current-page="planQuery.page"
          v-model:page-size="planQuery.pageSize"
          :total="planTotal"
          layout="total, prev, pager, next"
          @current-change="loadPlans"
        />
      </el-tab-pane>

      <!-- 维保任务 -->
      <el-tab-pane label="维保任务" name="tasks">
        <el-form :inline="true" class="filter">
          <el-form-item label="状态">
            <el-select v-model="taskQuery.status" clearable placeholder="全部" style="width: 130px">
              <el-option
                v-for="(label, value) in MAINT_STATUS_MAP"
                :key="value"
                :label="label"
                :value="value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="任务池">
            <el-select v-model="taskQuery.poolFlag" clearable placeholder="全部" style="width: 110px">
              <el-option label="池中待抢" value="1" />
              <el-option label="常规" value="0" />
            </el-select>
          </el-form-item>
          <el-form-item label="逾期">
            <el-checkbox v-model="taskQuery.overdue">仅看逾期</el-checkbox>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="loadTasks">查询</el-button>
          </el-form-item>
        </el-form>
        <ListError :failed="loadError" :loading="taskLoading" @retry="reloadAll" />
        <el-table v-if="!loadError" v-loading="taskLoading" :data="tasks">
          <el-table-column prop="taskNo" label="任务号" width="160" />
          <el-table-column prop="elevatorNo" label="电梯" width="140" />
          <el-table-column prop="planName" label="所属计划" min-width="140" show-overflow-tooltip />
          <el-table-column prop="scheduledTime" label="计划时间" width="160" />
          <el-table-column prop="assigneeName" label="处理人" width="100">
            <template #default="{ row }">{{ row.assigneeName || '—' }}</template>
          </el-table-column>
          <el-table-column label="状态" width="120">
            <template #default="{ row }">
              <el-tag :type="MAINT_STATUS_TAG[row.status]" size="small">
                {{ MAINT_STATUS_MAP[row.status] }}
              </el-tag>
              <el-tag v-if="row.poolFlag === 1" size="small" type="warning" class="tag">池中</el-tag>
              <el-tag v-if="row.overdue" size="small" type="danger" class="tag">逾期</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openTask(row)">详情</el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-pagination
          class="pagination"
          v-model:current-page="taskQuery.page"
          v-model:page-size="taskQuery.pageSize"
          :total="taskTotal"
          layout="total, prev, pager, next"
          @current-change="loadTasks"
        />
      </el-tab-pane>
    </el-tabs>

    <!-- 计划编辑 -->
    <el-dialog v-model="planVisible" :title="planEdit ? '编辑维保计划' : '新建维保计划'" width="520px">
      <el-form label-width="100px">
        <el-form-item label="计划名称" required>
          <el-input v-model="planForm.planName" />
        </el-form-item>
        <el-form-item label="小区">
          <el-select v-model="planForm.branchId" style="width: 100%">
            <el-option v-for="c in communities" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="频率">
          <el-select v-model="planForm.cycleType" style="width: 100%">
            <el-option v-for="o in CYCLE_TYPE_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="生效日期">
          <el-date-picker v-model="planForm.effectiveFrom" type="date" value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item label="自动生成">
          <el-switch v-model="planForm.autoGenerate" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="planForm.status" active-value="ACTIVE" inactive-value="DISABLED" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="planForm.remark" type="textarea" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="planVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitPlan">保存</el-button>
      </template>
    </el-dialog>

    <!-- 生成任务 -->
    <el-dialog v-model="generateVisible" title="生成维保任务" width="500px">
      <el-form label-width="100px">
        <el-form-item label="计划日期" required>
          <el-date-picker v-model="generateForm.planDate" type="date" value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item label="任务去向">
          <el-radio-group v-model="generateForm.destination">
            <el-radio value="ASSIGN">指派个人</el-radio>
            <el-radio value="POOL">推入任务池</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <div class="sub">已有同日任务将被跳过</div>
      <template #footer>
        <el-button @click="generateVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitGenerate">生成</el-button>
      </template>
    </el-dialog>

    <!-- 任务详情 -->
    <el-drawer v-model="taskVisible" title="维保任务详情" size="600px">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="任务号">{{ current.taskNo }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="MAINT_STATUS_TAG[current.status]" size="small">
            {{ MAINT_STATUS_MAP[current.status] }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="电梯">{{ current.elevatorNo || '—' }}</el-descriptions-item>
        <el-descriptions-item label="所属计划">{{ current.planName || '—' }}</el-descriptions-item>
        <el-descriptions-item label="计划时间">{{ current.scheduledTime || '—' }}</el-descriptions-item>
        <el-descriptions-item label="处理人">{{ current.assigneeName || '—' }}</el-descriptions-item>
        <el-descriptions-item label="完工时间">{{ current.actualTime || '—' }}</el-descriptions-item>
        <el-descriptions-item label="驳回次数">{{ current.rejectCount || 0 }} / 3</el-descriptions-item>
        <el-descriptions-item v-if="current.finishRemark" label="完工说明" :span="2">
          {{ current.finishRemark }}
        </el-descriptions-item>
        <el-descriptions-item v-if="current.sourceWorkOrderId" label="转工单" :span="2">
          已转工单 #{{ current.sourceWorkOrderId }}
        </el-descriptions-item>
      </el-descriptions>

      <div v-if="current.finishImages?.length" class="images">
        <el-image
          v-for="(img, i) in current.finishImages"
          :key="i"
          :src="img"
          :preview-src-list="current.finishImages"
          :initial-index="i"
          fit="cover"
          class="thumb"
        >
          <template #error>
            <div class="img-error"><el-icon><Picture /></el-icon><span>图片失效</span></div>
          </template>
        </el-image>
      </div>

      <el-divider content-position="left">流转记录</el-divider>
      <el-timeline v-if="timelineList.length">
        <el-timeline-item
          v-for="(log, i) in timelineList"
          :key="i"
          :timestamp="log.createdAt"
          placement="top"
        >
          <span class="log-op">{{ log.operatorName || '系统' }}</span>
          · {{ log.actionLabel || log.action }}
          <span v-if="log.remark" class="sub">（{{ log.remark }}）</span>
          <span v-if="log.reason" class="sub"> 原因：{{ log.reason }}</span>
        </el-timeline-item>
      </el-timeline>
      <el-empty v-else description="暂无流转记录" :image-size="60" />

      <template #footer>
        <div class="drawer-footer">
          <el-button @click="taskVisible = false">关闭</el-button>
          <el-button v-if="canWrite && current.status === 'PENDING'" @click="openAssign">指派</el-button>
          <el-button
            v-if="canWrite && current.poolFlag === 1 && current.status === 'PENDING'"
            @click="openFromPool"
          >
            池内转派
          </el-button>
          <el-button v-if="canWrite && current.status === 'PENDING'" @click="handleToPool">推入任务池</el-button>
          <el-button
            v-if="isAssignee && current.status === 'ASSIGNED'"
            type="primary"
            @click="handleAccept"
          >
            接单
          </el-button>
          <el-button
            v-if="isAssignee && current.status === 'PROCESSING'"
            type="primary"
            @click="openComplete"
          >
            完工
          </el-button>
          <el-button v-if="canWrite && current.status === 'COMPLETED'" type="danger" @click="openReject">
            驳回
          </el-button>
          <el-button v-if="canWrite && current.status === 'COMPLETED'" type="success" @click="handleConfirm">
            确认
          </el-button>
          <el-button
            v-if="(canWrite || isAssignee) && ['ASSIGNED', 'PROCESSING'].includes(current.status)"
            @click="openTransfer"
          >
            转交
          </el-button>
          <el-button
            v-if="canWrite && !['COMPLETED', 'CANCELED'].includes(current.status)"
            type="danger"
            plain
            @click="openCancel"
          >
            取消任务
          </el-button>
        </div>
      </template>
    </el-drawer>

    <!-- 转交 -->
    <el-dialog v-model="transferVisible" title="转交维保任务" width="480px">
      <el-form label-width="90px">
        <el-form-item label="目标维修工" required>
          <el-select v-model="transferForm.targetAssigneeId" filterable style="width: 100%">
            <el-option
              v-for="e in engineers"
              :key="e.id"
              :label="`${e.realName}（${e.groupName || '未分组'}）`"
              :value="e.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="转交原因" required>
          <el-input v-model="transferForm.reason" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="transferVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitTransfer">确认转交</el-button>
      </template>
    </el-dialog>

    <!-- 取消任务 -->
    <el-dialog v-model="cancelVisible" title="取消维保任务" width="480px">
      <el-form label-width="80px">
        <el-form-item label="原因" required>
          <el-input v-model="cancelForm.reason" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="cancelVisible = false">取消</el-button>
        <el-button type="danger" :loading="submitting" @click="submitCancel">确认取消</el-button>
      </template>
    </el-dialog>

    <!-- 指派 -->
    <el-dialog v-model="assignVisible" title="指派维保任务" width="460px">
      <el-form label-width="80px">
        <el-form-item label="维修工" required>
          <el-select v-model="assigneeId" filterable style="width: 100%">
            <el-option
              v-for="e in engineers"
              :key="e.id"
              :label="`${e.realName}（${e.groupName}，在途 ${e.unfinishedCount}）`"
              :value="e.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="assignVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitAssign">确定</el-button>
      </template>
    </el-dialog>

    <!-- 池内转派 -->
    <el-dialog v-model="fromPoolVisible" title="池内转派" width="460px">
      <el-form label-width="80px">
        <el-form-item label="维修工" required>
          <el-select v-model="fromPoolAssigneeId" filterable style="width: 100%">
            <el-option
              v-for="e in engineers"
              :key="e.id"
              :label="`${e.realName}（${e.groupName || '未分组'}）`"
              :value="e.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <div class="sub">池内转派会直接把任务指派给目标维修工并移出任务池</div>
      <template #footer>
        <el-button @click="fromPoolVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitFromPool">确认转派</el-button>
      </template>
    </el-dialog>

    <!-- 完工 -->
    <el-dialog v-model="completeVisible" title="提交完工" width="520px">
      <el-form label-width="80px">
        <el-form-item label="完工说明">
          <el-input v-model="completeForm.remark" type="textarea" />
        </el-form-item>
        <el-form-item label="现场照片" required>
          <el-upload
            v-model:file-list="completeFiles"
            list-type="picture-card"
            :http-request="handleUpload"
            :limit="6"
            multiple
          >
            <el-icon><Plus /></el-icon>
          </el-upload>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="completeVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitComplete">提交</el-button>
      </template>
    </el-dialog>

    <!-- 驳回 -->
    <el-dialog v-model="rejectVisible" title="驳回维保任务" width="460px">
      <el-form label-width="80px">
        <el-form-item label="原因" required>
          <el-input v-model="rejectReason" type="textarea" placeholder="如：照片未覆盖关键点位" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rejectVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitReject">确定驳回</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { notify } from '@/utils/notify'
import { Plus } from '@element-plus/icons-vue'
import {
  getMaintenancePlans,
  createMaintenancePlan,
  updateMaintenancePlan,
  generateMaintenanceTasks,
  getMaintenanceTasks,
  getMaintenanceTask,
  assignMaintenanceTask,
  toPoolMaintenanceTask,
  acceptMaintenanceTask,
  completeMaintenanceTask,
  rejectMaintenanceTask,
  confirmMaintenanceTask,
  getMaintenanceTimeline,
  transferMaintenanceTask,
  cancelMaintenanceTask,
  fromPoolMaintenanceTask
} from '@/api/maintenance'
import { getEngineers } from '@/api/user'
import { getCommunities } from '@/api/basedata'
import ListError from '@/components/ListError.vue'
import { uploadImage, compressImage } from '@/api/file'
import { collectUploadedUrls, hasPendingUpload } from '@/utils/upload'
import { useUserStore } from '@/stores/user'
import {
  CYCLE_TYPE_MAP,
  CYCLE_TYPE_OPTIONS,
  MAINT_STATUS_MAP,
  MAINT_STATUS_TAG
} from '@/utils/dict'

const userStore = useUserStore()
const route = useRoute()
const isAdmin = computed(() => userStore.role === 'ADMIN')
const canWrite = computed(() => ['ADMIN', 'CUSTOMER_SERVICE'].includes(userStore.role))
const isAssignee = computed(() => current.value.assigneeId === userStore.currentUser?.id)

const tab = ref('plans')
const submitting = ref(false)
const communities = ref([])
const engineers = ref([])

const planLoading = ref(false)
const loadError = ref(false)
const plans = ref([])
const planTotal = ref(0)
const planQuery = reactive({ page: 1, pageSize: 20 })
const planKeyword = ref('')

const taskLoading = ref(false)
const tasks = ref([])
const taskTotal = ref(0)
const taskQuery = reactive({ page: 1, pageSize: 20, status: '', poolFlag: '', overdue: false })

const planVisible = ref(false)
const planEdit = ref(false)
const planId = ref(null)
const planForm = reactive({
  planName: '',
  branchId: 1,
  cycleType: 'QUARTERLY',
  effectiveFrom: '',
  autoGenerate: true,
  status: 'ACTIVE',
  remark: ''
})

const generateVisible = ref(false)
const generatePlanId = ref(null)
const generateForm = reactive({ planDate: '', destination: 'ASSIGN' })

const taskVisible = ref(false)
const current = ref({})
const timelineList = ref([])
const timelineLoading = ref(false)

const transferVisible = ref(false)
const transferForm = reactive({ targetAssigneeId: null, reason: '' })
const cancelVisible = ref(false)
const cancelForm = reactive({ reason: '' })
const fromPoolVisible = ref(false)
const fromPoolAssigneeId = ref(null)

const assignVisible = ref(false)
const assigneeId = ref(null)

const completeVisible = ref(false)
const completeForm = reactive({ remark: '' })
const completeFiles = ref([])

const rejectVisible = ref(false)
const rejectReason = ref('')

async function loadPlans() {
  planLoading.value = true
  try {
    const data = await getMaintenancePlans({
      page: planQuery.page,
      pageSize: planQuery.pageSize,
      keyword: planKeyword.value || undefined
    })
    plans.value = data.list
    planTotal.value = data.total
    loadError.value = false
  } catch (e) {
    loadError.value = true
  } finally {
    planLoading.value = false
  }
}

function reloadAll() {
  loadPlans()
  loadTasks()
}

async function loadTasks() {
  taskLoading.value = true
  try {
    const data = await getMaintenanceTasks({
      page: taskQuery.page,
      pageSize: taskQuery.pageSize,
      status: taskQuery.status || undefined,
      poolFlag: taskQuery.poolFlag === '' ? undefined : taskQuery.poolFlag,
      overdue: taskQuery.overdue ? true : undefined
    })
    tasks.value = data.list
    taskTotal.value = data.total
    loadError.value = false
  } catch (e) {
    loadError.value = true
  } finally {
    taskLoading.value = false
  }
}

function openPlanCreate() {
  planEdit.value = false
  planId.value = null
  Object.assign(planForm, {
    planName: '',
    branchId: communities.value[0]?.id || 1,
    cycleType: 'QUARTERLY',
    effectiveFrom: '',
    autoGenerate: true,
    status: 'ACTIVE',
    remark: ''
  })
  planVisible.value = true
}

function openPlanEdit(row) {
  planEdit.value = true
  planId.value = row.id
  Object.assign(planForm, {
    planName: row.planName,
    branchId: row.branchId || 1,
    cycleType: row.cycleType || 'QUARTERLY',
    effectiveFrom: row.effectiveFrom || '',
    autoGenerate: !!row.autoGenerate,
    status: row.status,
    remark: row.remark || ''
  })
  planVisible.value = true
}

async function submitPlan() {
  if (!planForm.planName) {
    notify.warning('请填写计划名称')
    return
  }
  submitting.value = true
  try {
    if (planEdit.value) await updateMaintenancePlan(planId.value, planForm)
    else await createMaintenancePlan(planForm)
    notify.success('保存成功')
    planVisible.value = false
    loadPlans()
  } finally {
    submitting.value = false
  }
}

function openGenerate(row) {
  generatePlanId.value = row.id
  generateForm.planDate = ''
  generateForm.destination = 'ASSIGN'
  generateVisible.value = true
}

async function submitGenerate() {
  if (!generateForm.planDate) {
    notify.warning('请选择计划日期')
    return
  }
  submitting.value = true
  try {
    const res = await generateMaintenanceTasks(generatePlanId.value, generateForm)
    notify.success(`生成 ${res.generated} 条，跳过 ${res.skipped} 条`)
    generateVisible.value = false
    loadPlans()
    loadTasks()
  } finally {
    submitting.value = false
  }
}

async function openTask(row) {
  try {
    current.value = await getMaintenanceTask(row.id)
    taskVisible.value = true
    loadTimeline(row.id)
  } catch (e) {
    // 1001/1002 由拦截器提示
  }
}

// 客服工作台「去处理」带 taskId 直达详情
async function openTaskById(id) {
  tab.value = 'tasks'
  current.value = await getMaintenanceTask(id)
  taskVisible.value = true
  loadTimeline(id)
}

async function loadTimeline(id) {
  timelineLoading.value = true
  try {
    const data = await getMaintenanceTimeline(id)
    timelineList.value = data.list
  } catch (e) {
    timelineList.value = []
  } finally {
    timelineLoading.value = false
  }
}

async function openFromPool() {
  fromPoolAssigneeId.value = null
  if (!engineers.value.length) await ensureEngineers().catch(() => [])
  fromPoolVisible.value = true
}

async function submitFromPool() {
  if (!fromPoolAssigneeId.value) {
    notify.warning('请选择维修工')
    return
  }
  submitting.value = true
  try {
    await fromPoolMaintenanceTask(current.value.id, { assigneeId: fromPoolAssigneeId.value })
    notify.success('已从任务池转派')
    fromPoolVisible.value = false
    taskVisible.value = false
    loadTasks()
  } catch (e) {
    // 3000/3002 由拦截器提示
  } finally {
    submitting.value = false
  }
}

async function openTransfer() {
  transferForm.targetAssigneeId = null
  transferForm.reason = ''
  if (!engineers.value.length) await ensureEngineers().catch(() => [])
  transferVisible.value = true
}

async function submitTransfer() {
  if (!transferForm.targetAssigneeId || !transferForm.reason.trim()) {
    notify.warning('请选择目标维修工并填写转交原因')
    return
  }
  submitting.value = true
  try {
    await transferMaintenanceTask(current.value.id, transferForm)
    notify.success('已转交')
    transferVisible.value = false
    taskVisible.value = false
    loadTasks()
  } catch (e) {
    // 3000/3002 由拦截器提示
  } finally {
    submitting.value = false
  }
}

function openCancel() {
  cancelForm.reason = ''
  cancelVisible.value = true
}

async function submitCancel() {
  if (!cancelForm.reason.trim()) {
    notify.warning('请填写取消原因')
    return
  }
  submitting.value = true
  try {
    await cancelMaintenanceTask(current.value.id, { reason: cancelForm.reason })
    notify.success('任务已取消')
    cancelVisible.value = false
    taskVisible.value = false
    loadTasks()
  } catch (e) {
    // 3000/3002 由拦截器提示
  } finally {
    submitting.value = false
  }
}

async function ensureEngineers() {
  if (!engineers.value.length) engineers.value = await getEngineers()
}

async function openAssign() {
  await ensureEngineers()
  assigneeId.value = null
  assignVisible.value = true
}

async function submitAssign() {
  if (!assigneeId.value) {
    notify.warning('请选择维修工')
    return
  }
  submitting.value = true
  try {
    await assignMaintenanceTask(current.value.id, { assigneeId: assigneeId.value })
    notify.success('已指派')
    assignVisible.value = false
    taskVisible.value = false
    loadTasks()
  } finally {
    submitting.value = false
  }
}

async function handleToPool() {
  await toPoolMaintenanceTask(current.value.id, {})
  notify.success('已推入任务池')
  taskVisible.value = false
  loadTasks()
}

async function handleAccept() {
  await acceptMaintenanceTask(current.value.id)
  notify.success('已接单')
  taskVisible.value = false
  loadTasks()
}

function openComplete() {
  completeForm.remark = ''
  completeFiles.value = []
  completeVisible.value = true
}

async function handleUpload(options) {
  // 不能手动 onSuccess：async 返回值会被 el-upload 再写一次并覆盖 file.response
  const compressed = await compressImage(options.file)
  return uploadImage(compressed)
}

async function submitComplete() {
  if (hasPendingUpload(completeFiles.value)) {
    notify.error('有图片上传失败，请删除后重新上传')
    return
  }
  const images = collectUploadedUrls(completeFiles.value)
  if (!images.length) {
    notify.warning('完工需至少上传 1 张现场照片')
    return
  }
  submitting.value = true
  try {
    await completeMaintenanceTask(current.value.id, {
      remark: completeForm.remark,
      images,
      finishImages: images
    })
    notify.success('已完工，待客服确认')
    completeVisible.value = false
    taskVisible.value = false
    loadTasks()
  } finally {
    submitting.value = false
  }
}

function openReject() {
  rejectReason.value = ''
  rejectVisible.value = true
}

async function submitReject() {
  if (!rejectReason.value.trim()) {
    notify.warning('请填写驳回原因')
    return
  }
  submitting.value = true
  try {
    await rejectMaintenanceTask(current.value.id, { reason: rejectReason.value })
    notify.success('已驳回')
    rejectVisible.value = false
    taskVisible.value = false
    loadTasks()
  } finally {
    submitting.value = false
  }
}

async function handleConfirm() {
  await confirmMaintenanceTask(current.value.id, {})
  notify.success('已确认')
  taskVisible.value = false
  loadTasks()
}

onMounted(async () => {
  // 字典与主列表解耦：小区接口失败不影响计划/任务加载
  loadPlans()
  loadTasks()
  if (route.query.taskId) {
    openTaskById(route.query.taskId).catch(() => notify.error('维保任务加载失败'))
  }
  try {
    communities.value = await getCommunities()
  } catch (e) {
    communities.value = []
  }
})
</script>

<style scoped>
.filter {
  margin-bottom: 4px;
}
.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.sub {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.tag {
  margin-left: 4px;
}
.images {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 12px;
}
.thumb {
  width: 82px;
  height: 82px;
  border-radius: 6px;
}
.img-error {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  font-size: 11px;
  color: var(--el-text-color-placeholder);
  background: var(--el-fill-color-light);
  border-radius: 6px;
}
.log-op {
  font-weight: 600;
}
.drawer-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
}
.pagination {
  margin-top: 16px;
  justify-content: flex-end;
}
</style>
