<template>
  <el-card>
    <el-tabs v-model="tab">
      <!-- 巡检计划 -->
      <el-tab-pane label="巡检计划" name="plans">
        <div class="toolbar">
          <el-button v-if="isAdmin" type="primary" @click="openPlanCreate">新建计划</el-button>
          <el-input v-model="planKeyword" placeholder="计划名称" clearable style="width: 190px" @change="loadPlans" />
          <span class="sub">计划生成任务后按点位模板逐项录入结果；异常点位自动转工单</span>
        </div>
        <ListError :failed="loadError" :loading="planLoading" @retry="reloadAll" />
        <el-table v-if="!loadError" v-loading="planLoading" :data="plans">
          <el-table-column prop="planName" label="计划名称" min-width="160" />
          <el-table-column label="电梯类型" width="110">
            <template #default="{ row }">{{ ELEVATOR_TYPE_MAP[row.elevatorType] || '全部' }}</template>
          </el-table-column>
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
      </el-tab-pane>

      <!-- 巡检任务 -->
      <el-tab-pane label="巡检任务" name="tasks">
        <el-form :inline="true" class="filter">
          <el-form-item label="状态">
            <el-select v-model="taskQuery.status" clearable placeholder="全部" style="width: 130px">
              <el-option
                v-for="(label, value) in INSPECTION_STATUS_MAP"
                :key="value"
                :label="label"
                :value="value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="逾期">
            <el-checkbox v-model="taskQuery.overdue">仅看逾期/漏巡</el-checkbox>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="loadTasks">查询</el-button>
          </el-form-item>
        </el-form>
        <ListError :failed="loadError" :loading="taskLoading" @retry="reloadAll" />
        <el-table v-if="!loadError" v-loading="taskLoading" :data="tasks">
          <el-table-column prop="taskNo" label="任务号" width="160" />
          <el-table-column prop="elevatorNo" label="电梯" width="140" />
          <el-table-column prop="planName" label="计划" min-width="140" show-overflow-tooltip />
          <el-table-column prop="scheduledTime" label="计划时间" width="160" />
          <el-table-column prop="assigneeName" label="巡检人" width="100">
            <template #default="{ row }">{{ row.assigneeName || '—' }}</template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="INSPECTION_STATUS_TAG[row.status]" size="small">
                {{ INSPECTION_STATUS_MAP[row.status] }}
              </el-tag>
              <el-tag v-if="row.overdue" size="small" type="danger" class="tag">逾期</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="异常点位" width="100">
            <template #default="{ row }">{{ row.abnormalCount || 0 }}</template>
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

      <!-- 点位模板 -->
      <el-tab-pane label="点位模板" name="templates">
        <div class="toolbar">
          <el-button v-if="isAdmin" type="primary" @click="openTemplateCreate">新建模板</el-button>
          <span class="sub">按电梯类型维护点位清单，巡检任务生成时快照</span>
        </div>
        <el-table v-loading="templateLoading" :data="templates">
          <el-table-column prop="templateCode" label="模板编码" width="160" />
          <el-table-column prop="templateName" label="模板名称" min-width="150" />
          <el-table-column label="电梯类型" width="110">
            <template #default="{ row }">{{ ELEVATOR_TYPE_MAP[row.elevatorType] || '全部' }}</template>
          </el-table-column>
          <el-table-column prop="pointCount" label="点位数" width="90" />
          <el-table-column label="状态" width="90">
            <template #default="{ row }">
              <el-tag :type="row.status === 'ACTIVE' ? 'success' : 'info'" size="small">
                {{ row.status === 'ACTIVE' ? '启用' : '停用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="90" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openTemplate(row)">查看点位</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <!-- 计划编辑 -->
    <el-dialog v-model="planVisible" :title="planEdit ? '编辑巡检计划' : '新建巡检计划'" width="520px">
      <el-form label-width="100px">
        <el-form-item label="计划名称" required>
          <el-input v-model="planForm.planName" />
        </el-form-item>
        <el-form-item label="电梯类型">
          <el-select v-model="planForm.elevatorType" clearable placeholder="全部" style="width: 100%">
            <el-option
              v-for="o in ELEVATOR_TYPE_OPTIONS"
              :key="o.value"
              :label="o.label"
              :value="o.value"
            />
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
        <el-form-item label="状态">
          <el-switch v-model="planForm.status" active-value="ACTIVE" inactive-value="DISABLED" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="planVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitPlan">保存</el-button>
      </template>
    </el-dialog>

    <!-- 生成任务 -->
    <el-dialog v-model="generateVisible" title="生成巡检任务" width="480px">
      <el-form label-width="100px">
        <el-form-item label="起始日期" required>
          <el-date-picker v-model="generateForm.startDate" type="date" value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item label="结束日期" required>
          <el-date-picker v-model="generateForm.endDate" type="date" value-format="YYYY-MM-DD" />
        </el-form-item>
      </el-form>
      <div class="sub">区间不超过 92 天；已生成的任务会跳过</div>
      <template #footer>
        <el-button @click="generateVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitGenerate">生成</el-button>
      </template>
    </el-dialog>

    <!-- 任务详情 -->
    <el-drawer v-model="taskVisible" title="巡检任务详情" size="620px">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="任务号">{{ current.taskNo }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="INSPECTION_STATUS_TAG[current.status]" size="small">
            {{ INSPECTION_STATUS_MAP[current.status] }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="电梯">{{ current.elevatorNo || '—' }}</el-descriptions-item>
        <el-descriptions-item label="巡检人">{{ current.assigneeName || '—' }}</el-descriptions-item>
        <el-descriptions-item label="计划时间">{{ current.scheduledTime || '—' }}</el-descriptions-item>
        <el-descriptions-item label="实际提交">{{ current.actualTime || '—' }}</el-descriptions-item>
      </el-descriptions>

      <div class="section-title">点位结果</div>
      <el-table :data="current.points || []">
        <el-table-column type="index" label="#" width="50" />
        <el-table-column prop="pointName" label="点位" min-width="140" />
        <el-table-column label="严重级别" width="100">
          <template #default="{ row }">
            <el-tag :type="SEVERITY_TAG[row.severity] || 'info'" size="small">
              {{ SEVERITY_MAP[row.severity] || '—' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="结果" width="90">
          <template #default="{ row }">
            <el-tag
              v-if="row.result"
              :type="row.result === 'ABNORMAL' ? 'danger' : 'success'"
              size="small"
            >
              {{ POINT_RESULT_MAP[row.result] }}
            </el-tag>
            <span v-else class="sub">未检</span>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="140" show-overflow-tooltip />
      </el-table>

      <div v-if="current.sourceWorkOrderIds?.length" class="section-title">
        已转工单：{{ current.sourceWorkOrderIds.join('、') }}
      </div>

      <template #footer>
        <div class="drawer-footer">
          <el-button @click="taskVisible = false">关闭</el-button>
          <el-button
            v-if="canWrite && ['COMPLETED', 'PROCESSING', 'PENDING'].includes(current.status)"
            type="danger"
            @click="openRejectTask"
          >
            驳回
          </el-button>
        </div>
      </template>
    </el-drawer>

    <!-- 驳回 -->
    <el-dialog v-model="rejectVisible" title="驳回巡检任务" width="460px">
      <el-form label-width="80px">
        <el-form-item label="原因" required>
          <el-input v-model="rejectReason" type="textarea" placeholder="如：异常点位缺少现场照片" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rejectVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitRejectTask">确定驳回</el-button>
      </template>
    </el-dialog>

    <!-- 模板详情/新建 -->
    <el-dialog v-model="templateVisible" :title="templateView ? '点位清单' : '新建点位模板'" width="620px">
      <el-form v-if="!templateView" label-width="96px" class="template-form">
        <el-form-item label="模板编码" required>
          <el-input v-model="templateForm.templateCode" placeholder="如 TPL-LIFT-01" />
        </el-form-item>
        <el-form-item label="模板名称" required>
          <el-input v-model="templateForm.templateName" />
        </el-form-item>
        <el-form-item label="电梯类型">
          <el-select v-model="templateForm.elevatorType" style="width: 100%">
            <el-option
              v-for="o in ELEVATOR_TYPE_OPTIONS"
              :key="o.value"
              :label="o.label"
              :value="o.value"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <div class="section-title">
        点位清单
        <el-button v-if="!templateView" link type="primary" @click="addPoint">添加点位</el-button>
      </div>
      <el-table :data="templatePoints">
        <el-table-column type="index" label="#" width="50" />
        <el-table-column label="点位名称" min-width="160">
          <template #default="{ row }">
            <el-input v-if="!templateView" v-model="row.pointName" placeholder="如 轿厢照明" />
            <span v-else>{{ row.pointName }}</span>
          </template>
        </el-table-column>
        <el-table-column label="严重级别" width="130">
          <template #default="{ row }">
            <el-select v-if="!templateView" v-model="row.severity" size="small">
              <el-option v-for="(label, value) in SEVERITY_MAP" :key="value" :label="label" :value="value" />
            </el-select>
            <span v-else>{{ SEVERITY_MAP[row.severity] }}</span>
          </template>
        </el-table-column>
        <el-table-column v-if="!templateView" label="操作" width="70">
          <template #default="{ $index }">
            <el-button link type="danger" @click="templatePoints.splice($index, 1)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="templateVisible = false">关闭</el-button>
        <el-button v-if="!templateView" type="primary" :loading="submitting" @click="submitTemplate">
          保存
        </el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { notify } from '@/utils/notify'
import {
  getInspectionPlans,
  createInspectionPlan,
  updateInspectionPlan,
  generateInspectionTasks,
  getInspectionTasks,
  getInspectionTask,
  rejectInspectionTask,
  getPointTemplates,
  createPointTemplate
} from '@/api/inspection'
import ListError from '@/components/ListError.vue'
import { useUserStore } from '@/stores/user'
import {
  ELEVATOR_TYPE_MAP,
  ELEVATOR_TYPE_OPTIONS,
  CYCLE_TYPE_MAP,
  CYCLE_TYPE_OPTIONS,
  INSPECTION_STATUS_MAP,
  INSPECTION_STATUS_TAG,
  POINT_RESULT_MAP,
  SEVERITY_MAP,
  SEVERITY_TAG
} from '@/utils/dict'

const userStore = useUserStore()
const isAdmin = computed(() => userStore.role === 'ADMIN')
const canWrite = computed(() => ['ADMIN', 'CUSTOMER_SERVICE'].includes(userStore.role))

const tab = ref('plans')
const submitting = ref(false)

const planLoading = ref(false)
const loadError = ref(false)
const plans = ref([])
const planKeyword = ref('')

const taskLoading = ref(false)
const tasks = ref([])
const taskTotal = ref(0)
const taskQuery = reactive({ page: 1, pageSize: 20, status: '', overdue: false })

const templateLoading = ref(false)
const templates = ref([])

const planVisible = ref(false)
const planEdit = ref(false)
const planId = ref(null)
const planForm = reactive({
  planName: '',
  elevatorType: '',
  cycleType: 'QUARTERLY',
  effectiveFrom: '',
  status: 'ACTIVE'
})

const generateVisible = ref(false)
const generatePlanId = ref(null)
const generateForm = reactive({ startDate: '', endDate: '' })

const taskVisible = ref(false)
const current = ref({})

const rejectVisible = ref(false)
const rejectReason = ref('')

const templateVisible = ref(false)
const templateView = ref(false)
const templateForm = reactive({
  templateCode: '',
  templateName: '',
  elevatorType: 'PASSENGER',
  status: 'ACTIVE'
})
const templatePoints = ref([])

async function loadPlans() {
  planLoading.value = true
  try {
    const data = await getInspectionPlans({ keyword: planKeyword.value || undefined })
    plans.value = data.list || data
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
  loadTemplates()
}

async function loadTasks() {
  taskLoading.value = true
  try {
    const data = await getInspectionTasks({
      page: taskQuery.page,
      pageSize: taskQuery.pageSize,
      status: taskQuery.status || undefined,
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

async function loadTemplates() {
  templateLoading.value = true
  try {
    const data = await getPointTemplates()
    templates.value = data.list || data
    loadError.value = false
  } catch (e) {
    loadError.value = true
  } finally {
    templateLoading.value = false
  }
}

function openPlanCreate() {
  planEdit.value = false
  planId.value = null
  Object.assign(planForm, {
    planName: '',
    elevatorType: '',
    cycleType: 'QUARTERLY',
    effectiveFrom: '',
    status: 'ACTIVE'
  })
  planVisible.value = true
}

function openPlanEdit(row) {
  planEdit.value = true
  planId.value = row.id
  Object.assign(planForm, {
    planName: row.planName,
    elevatorType: row.elevatorType || '',
    cycleType: row.cycleType || 'QUARTERLY',
    effectiveFrom: row.effectiveFrom || '',
    status: row.status
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
    if (planEdit.value) await updateInspectionPlan(planId.value, planForm)
    else await createInspectionPlan(planForm)
    notify.success('保存成功')
    planVisible.value = false
    loadPlans()
  } finally {
    submitting.value = false
  }
}

function openGenerate(row) {
  generatePlanId.value = row.id
  generateForm.startDate = ''
  generateForm.endDate = ''
  generateVisible.value = true
}

async function submitGenerate() {
  if (!generateForm.startDate || !generateForm.endDate) {
    notify.warning('请选择日期区间')
    return
  }
  submitting.value = true
  try {
    const res = await generateInspectionTasks(generatePlanId.value, generateForm)
    notify.success(`生成 ${res.generated} 条，跳过 ${res.skipped} 条`)
    generateVisible.value = false
    loadPlans()
    loadTasks()
  } finally {
    submitting.value = false
  }
}

async function openTask(row) {
  current.value = await getInspectionTask(row.id)
  taskVisible.value = true
}

function openRejectTask() {
  rejectReason.value = ''
  rejectVisible.value = true
}

async function submitRejectTask() {
  if (!rejectReason.value.trim()) {
    notify.warning('请填写驳回原因')
    return
  }
  submitting.value = true
  try {
    await rejectInspectionTask(current.value.id, { reason: rejectReason.value })
    notify.success('已驳回')
    rejectVisible.value = false
    taskVisible.value = false
    loadTasks()
  } finally {
    submitting.value = false
  }
}

function addPoint() {
  templatePoints.value.push({ pointName: '', severity: 'MEDIUM' })
}

function openTemplateCreate() {
  templateView.value = false
  Object.assign(templateForm, {
    templateCode: '',
    templateName: '',
    elevatorType: 'PASSENGER',
    status: 'ACTIVE'
  })
  templatePoints.value = [{ pointName: '', severity: 'MEDIUM' }]
  templateVisible.value = true
}

function openTemplate(row) {
  templateView.value = true
  templatePoints.value = row.points || []
  templateVisible.value = true
}

async function submitTemplate() {
  if (!templateForm.templateCode || !templateForm.templateName) {
    notify.warning('模板编码与名称必填')
    return
  }
  if (!templatePoints.value.length || templatePoints.value.some((p) => !p.pointName)) {
    notify.warning('请填写完整的点位名称')
    return
  }
  submitting.value = true
  try {
    await createPointTemplate({
      ...templateForm,
      points: templatePoints.value.map((p, i) => ({ ...p, sortNo: i + 1 }))
    })
    notify.success('模板已创建')
    templateVisible.value = false
    loadTemplates()
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadPlans()
  loadTasks()
  loadTemplates()
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
.section-title {
  font-weight: 600;
  margin: 16px 0 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.template-form {
  margin-bottom: 8px;
}
.drawer-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.pagination {
  margin-top: 16px;
  justify-content: flex-end;
}
</style>
