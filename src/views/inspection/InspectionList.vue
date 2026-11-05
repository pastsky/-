<template>
  <el-card>
    <el-tabs v-model="tab">
      <!-- 巡检计划 -->
      <el-tab-pane label="巡检计划" name="plans">
        <div class="toolbar">
          <el-button v-if="isAdmin" type="primary" @click="openPlanCreate">新建计划</el-button>
          <el-select v-model="planQuery.status" clearable placeholder="全部状态" style="width: 130px" @change="loadPlans">
            <el-option label="启用" value="ENABLED" />
            <el-option label="停用" value="DISABLED" />
          </el-select>
          <el-button @click="loadPlans">刷新</el-button>
          <span class="sub">同小区仅允许一个启用中的巡检计划；生成任务按频率与值班持证分配</span>
        </div>
        <ListError :failed="loadError" :loading="planLoading" @retry="reloadAll" />
        <el-table v-if="!loadError" v-loading="planLoading" :data="plans">
          <el-table-column prop="planName" label="计划名称" min-width="160" />
          <el-table-column prop="branchName" label="小区" width="130" show-overflow-tooltip>
            <template #default="{ row }">{{ row.branchName || '—' }}</template>
          </el-table-column>
          <el-table-column label="频率" width="90">
            <template #default="{ row }">{{ INSPECTION_FREQUENCY_MAP[row.frequency] || row.frequency }}</template>
          </el-table-column>
          <el-table-column label="执行时间" width="100">
            <template #default="{ row }">{{ row.frequencyTime || '任意' }}</template>
          </el-table-column>
          <el-table-column prop="templateName" label="点位模板" min-width="130" show-overflow-tooltip>
            <template #default="{ row }">{{ row.templateName || '—' }}</template>
          </el-table-column>
          <el-table-column label="有效期" width="190">
            <template #default="{ row }">{{ row.effectiveFrom || '—' }} ~ {{ row.effectiveTo || '长期' }}</template>
          </el-table-column>
          <el-table-column label="状态" width="90">
            <template #default="{ row }">
              <el-tag :type="row.status === 'ENABLED' ? 'success' : 'info'" size="small">
                {{ row.status === 'ENABLED' ? '启用' : '停用' }}
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
            <span class="sub">漏巡/逾期任务由状态与计划时间标识</span>
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
          <el-table-column label="操作" width="210" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openTemplate(row)">查看点位</el-button>
              <el-button v-if="isAdmin" link type="primary" @click="openTemplateEdit(row)">编辑</el-button>
              <el-button v-if="isAdmin" link type="danger" @click="handleTemplateDelete(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <!-- 计划编辑（字段对齐 BOP90/92） -->
    <el-dialog v-model="planVisible" :title="planEdit ? '编辑巡检计划' : '新建巡检计划'" width="520px">
      <el-form label-width="100px">
        <el-form-item label="小区" required>
          <el-select v-model="planForm.branchId" style="width: 100%">
            <el-option v-for="c in communities" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="计划名称" required>
          <el-input v-model="planForm.planName" />
        </el-form-item>
        <el-form-item label="频率" required>
          <el-select v-model="planForm.frequency" style="width: 100%">
            <el-option
              v-for="(label, value) in INSPECTION_FREQUENCY_MAP"
              :key="value"
              :label="label"
              :value="value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="执行时间">
          <el-time-select
            v-model="planForm.frequencyTime"
            start="06:00"
            end="22:00"
            step="00:30"
            clearable
            placeholder="留空表示当日任意"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="点位模板" required>
          <el-select v-model="planForm.pointTemplateId" style="width: 100%" placeholder="选择启用中的模板">
            <el-option
              v-for="t in templates"
              :key="t.id"
              :label="`${t.templateName}（${ELEVATOR_TYPE_MAP[t.elevatorType] || '全部'}）`"
              :value="t.id"
              :disabled="t.status !== 'ACTIVE'"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="生效日期" required>
          <el-date-picker v-model="planForm.effectiveFrom" type="date" value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item label="结束日期">
          <el-date-picker v-model="planForm.effectiveTo" type="date" value-format="YYYY-MM-DD" placeholder="留空表示长期" />
        </el-form-item>
        <el-form-item label="自动生成">
          <el-switch v-model="planForm.autoGenerate" />
        </el-form-item>
        <el-form-item v-if="planEdit" label="状态">
          <el-switch v-model="planForm.status" active-value="ENABLED" inactive-value="DISABLED" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="planForm.remark" type="textarea" :rows="2" />
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
        <el-table-column label="照片" width="90">
          <template #default="{ row }">
            <el-tag v-if="row.images && row.images.length" size="small" type="info">
              {{ row.images.length }} 张
            </el-tag>
            <span v-else class="sub">—</span>
          </template>
        </el-table-column>
        <el-table-column v-if="canExecute" label="操作" width="80" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openPoint(row)">录入</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div v-if="current.sourceWorkOrderIds?.length" class="section-title">
        已转工单：{{ current.sourceWorkOrderIds.join('、') }}
      </div>

      <template #footer>
        <div class="drawer-footer">
          <el-button @click="taskVisible = false">关闭</el-button>
          <el-button
            v-if="canExecute && current.status === 'ASSIGNED'"
            type="primary"
            :loading="submitting"
            @click="handleAcceptTask"
          >
            接单
          </el-button>
          <el-button
            v-if="canExecute && current.status === 'PROCESSING'"
            type="success"
            :loading="submitting"
            @click="handleSubmitTask"
          >
            提交任务
          </el-button>
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

    <!-- 点位录入 -->
    <el-dialog v-model="pointVisible" title="点位录入" width="520px">
      <el-form label-width="90px">
        <el-form-item label="点位">
          <b>{{ pointRow.pointName }}</b>
          <el-tag :type="SEVERITY_TAG[pointRow.severity] || 'info'" size="small" class="tag">
            {{ SEVERITY_MAP[pointRow.severity] || '—' }}
          </el-tag>
        </el-form-item>
        <el-form-item label="结果" required>
          <el-radio-group v-model="pointForm.result">
            <el-radio value="NORMAL">正常</el-radio>
            <el-radio value="ABNORMAL">异常</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注" :required="pointForm.result === 'ABNORMAL'">
          <el-input
            v-model="pointForm.remark"
            type="textarea"
            :rows="2"
            placeholder="异常时必填，说明问题现象"
          />
        </el-form-item>
        <el-form-item label="现场照片" :required="pointForm.result === 'ABNORMAL'">
          <el-upload
            v-model:file-list="pointFiles"
            list-type="picture-card"
            :http-request="handlePointUpload"
            :limit="6"
            multiple
          >
            <span class="sub">上传</span>
          </el-upload>
          <div class="sub">异常点位至少 1 张照片</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="pointVisible = false">取消</el-button>
        <el-button type="primary" :loading="pointSubmitting" @click="submitPoint">保存点位</el-button>
      </template>
    </el-dialog>

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
    <el-dialog
      v-model="templateVisible"
      :title="templateView ? '点位清单' : templateEdit ? '编辑点位模板' : '新建点位模板'"
      width="620px"
    >
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
import { useRoute } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { notify } from '@/utils/notify'
import {
  getInspectionPlans,
  createInspectionPlan,
  updateInspectionPlan,
  generateInspectionTasks,
  getInspectionTasks,
  getInspectionTask,
  getInspectionPoints,
  rejectInspectionTask,
  acceptInspectionTask,
  submitInspectionTask,
  updateInspectionPoint,
  getPointTemplates,
  getPointTemplateDetail,
  createPointTemplate,
  updatePointTemplate,
  deletePointTemplate
} from '@/api/inspection'
import { uploadImage, compressImage } from '@/api/file'
import { collectUploadedUrls, hasPendingUpload } from '@/utils/upload'
import ListError from '@/components/ListError.vue'
import { getCommunities } from '@/api/basedata'
import { useUserStore } from '@/stores/user'
import {
  ELEVATOR_TYPE_MAP,
  ELEVATOR_TYPE_OPTIONS,
  INSPECTION_FREQUENCY_MAP,
  INSPECTION_STATUS_MAP,
  INSPECTION_STATUS_TAG,
  POINT_RESULT_MAP,
  SEVERITY_MAP,
  SEVERITY_TAG
} from '@/utils/dict'

const userStore = useUserStore()
const route = useRoute()
const isAdmin = computed(() => userStore.role === 'ADMIN')
const canWrite = computed(() => ['ADMIN', 'CUSTOMER_SERVICE'].includes(userStore.role))

const tab = ref('plans')
const submitting = ref(false)

const planLoading = ref(false)
const loadError = ref(false)
const plans = ref([])
const planTotal = ref(0)
const planQuery = reactive({ page: 1, pageSize: 20, status: '' })
const communities = ref([])

const taskLoading = ref(false)
const tasks = ref([])
const taskTotal = ref(0)
const taskQuery = reactive({ page: 1, pageSize: 20, status: '' })

const templateLoading = ref(false)
const templates = ref([])

const planVisible = ref(false)
const planEdit = ref(false)
const planId = ref(null)
const planForm = reactive({
  planName: '',
  branchId: null,
  frequency: 'MONTHLY',
  frequencyTime: '',
  pointTemplateId: null,
  effectiveFrom: '',
  effectiveTo: '',
  autoGenerate: true,
  status: 'ENABLED',
  remark: ''
})

const generateVisible = ref(false)
const generatePlanId = ref(null)
const generateForm = reactive({ startDate: '', endDate: '' })

const taskVisible = ref(false)
const current = ref({})

const pointVisible = ref(false)
const pointSubmitting = ref(false)
const pointRow = ref({})
const pointForm = reactive({ result: 'NORMAL', remark: '' })
const pointFiles = ref([])
// 仅本单巡检人可逐点录入与提交
const canExecute = computed(
  () => !!current.value.assigneeId && current.value.assigneeId === userStore.currentUser?.id
)

const rejectVisible = ref(false)
const rejectReason = ref('')

const templateVisible = ref(false)
const templateView = ref(false)
const templateEdit = ref(false)
const templateId = ref(null)
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
    const data = await getInspectionPlans({
      page: planQuery.page,
      pageSize: planQuery.pageSize,
      status: planQuery.status || undefined
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
  loadTemplates()
}

async function loadTasks() {
  taskLoading.value = true
  try {
    const data = await getInspectionTasks({
      page: taskQuery.page,
      pageSize: taskQuery.pageSize,
      status: taskQuery.status || undefined
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
    templates.value = await getPointTemplates()
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
    branchId: communities.value[0]?.id || null,
    frequency: 'MONTHLY',
    frequencyTime: '',
    pointTemplateId: null,
    effectiveFrom: new Date().toISOString().slice(0, 10),
    effectiveTo: '',
    autoGenerate: true,
    status: 'ENABLED',
    remark: ''
  })
  planVisible.value = true
}

function openPlanEdit(row) {
  planEdit.value = true
  planId.value = row.id
  Object.assign(planForm, {
    planName: row.planName,
    branchId: row.branchId || null,
    frequency: row.frequency || 'MONTHLY',
    frequencyTime: row.frequencyTime || '',
    pointTemplateId: row.pointTemplateId || null,
    effectiveFrom: row.effectiveFrom || '',
    effectiveTo: row.effectiveTo || '',
    autoGenerate: !!row.autoGenerate,
    status: row.status || 'ENABLED',
    remark: row.remark || ''
  })
  planVisible.value = true
}

async function submitPlan() {
  if (!planForm.branchId) {
    notify.warning('请选择小区')
    return
  }
  if (!planForm.planName) {
    notify.warning('请填写计划名称')
    return
  }
  if (!planForm.pointTemplateId) {
    notify.warning('请选择点位模板')
    return
  }
  if (!planForm.effectiveFrom) {
    notify.warning('请选择生效日期')
    return
  }
  const payload = {
    branchId: planForm.branchId,
    planName: planForm.planName,
    frequency: planForm.frequency,
    frequencyTime: planForm.frequencyTime || undefined,
    pointTemplateId: planForm.pointTemplateId,
    effectiveFrom: planForm.effectiveFrom,
    effectiveTo: planForm.effectiveTo || undefined,
    autoGenerate: planForm.autoGenerate,
    remark: planForm.remark || undefined
  }
  if (planEdit.value) payload.status = planForm.status
  submitting.value = true
  try {
    if (planEdit.value) await updateInspectionPlan(planId.value, payload)
    else await createInspectionPlan(payload)
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
  try {
    const detail = await getInspectionTask(row.id)
    detail.points = await getInspectionPoints(row.id).catch(() => detail.points || [])
    current.value = detail
    taskVisible.value = true
  } catch (e) {
    // 1001/1002 由拦截器提示
  }
}

// 客服工作台「去处理」带 taskId 直达详情
async function openTaskById(id) {
  tab.value = 'tasks'
  const detail = await getInspectionTask(id)
  detail.points = await getInspectionPoints(id).catch(() => detail.points || [])
  current.value = detail
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

function openPoint(row) {
  pointRow.value = row
  pointForm.result = row.result || 'NORMAL'
  pointForm.remark = row.remark || ''
  pointFiles.value = (row.images || []).map((url) => ({
    name: url.split('/').pop() || 'image',
    url
  }))
  pointVisible.value = true
}

async function handlePointUpload(options) {
  const compressed = await compressImage(options.file)
  return uploadImage(compressed)
}

async function submitPoint() {
  if (pointForm.result === 'ABNORMAL' && !pointForm.remark.trim()) {
    notify.warning('异常点位需填写备注')
    return
  }
  if (hasPendingUpload(pointFiles.value)) {
    notify.error('有图片上传失败，请删除后重新上传')
    return
  }
  const images = collectUploadedUrls(pointFiles.value)
  if (pointForm.result === 'ABNORMAL' && !images.length) {
    notify.warning('异常点位需至少 1 张现场照片')
    return
  }
  pointSubmitting.value = true
  try {
    await updateInspectionPoint(current.value.id, pointRow.value.id, {
      result: pointForm.result,
      remark: pointForm.remark || undefined,
      images
    })
    notify.success('点位已保存')
    pointVisible.value = false
    current.value = await getInspectionTask(current.value.id)
  } catch (e) {
    // 3000/3002 由拦截器提示
  } finally {
    pointSubmitting.value = false
  }
}

async function handleAcceptTask() {
  try {
    await ElMessageBox.confirm('确认接单该巡检任务？同一时刻仅可执行一个在途巡检。', '接单')
  } catch (e) {
    return
  }
  submitting.value = true
  try {
    await acceptInspectionTask(current.value.id)
    notify.success('已接单')
    current.value = await getInspectionTask(current.value.id)
    loadTasks()
  } catch (e) {
    // 3000（在途巡检）/1002 由拦截器提示
  } finally {
    submitting.value = false
  }
}

async function handleSubmitTask() {
  try {
    await ElMessageBox.confirm('提交后将校验全部点位，异常点位自动转工单，确认提交？', '提交巡检')
  } catch (e) {
    return
  }
  submitting.value = true
  try {
    const res = await submitInspectionTask(current.value.id)
    const created = res?.workOrders?.length || 0
    notify.success(created ? `提交成功，已转 ${created} 张异常工单` : '提交成功')
    taskVisible.value = false
    loadTasks()
  } catch (e) {
    // 3000（点位未检完/证据缺失）由拦截器提示
  } finally {
    submitting.value = false
  }
}

function openTemplateCreate() {
  templateView.value = false
  templateEdit.value = false
  templateId.value = null
  Object.assign(templateForm, {
    templateCode: '',
    templateName: '',
    elevatorType: 'PASSENGER',
    status: 'ACTIVE'
  })
  templatePoints.value = [{ pointName: '', severity: 'MEDIUM' }]
  templateVisible.value = true
}

// 查看点位（列表 VO 无 points，需拉详情）
async function openTemplate(row) {
  templateView.value = true
  templatePoints.value = []
  templateVisible.value = true
  try {
    const detail = await getPointTemplateDetail(row.id)
    templatePoints.value = detail.points || []
  } catch (e) {
    templatePoints.value = []
  }
}

async function openTemplateEdit(row) {
  templateView.value = false
  templateEdit.value = true
  templateId.value = row.id
  templateVisible.value = true
  try {
    const detail = await getPointTemplateDetail(row.id)
    Object.assign(templateForm, {
      templateCode: detail.templateCode,
      templateName: detail.templateName,
      elevatorType: detail.elevatorType || 'PASSENGER',
      status: detail.status || 'ACTIVE'
    })
    templatePoints.value = (detail.points || []).map((p) => ({ ...p }))
  } catch (e) {
    templatePoints.value = []
  }
}

async function handleTemplateDelete(row) {
  try {
    await ElMessageBox.confirm(`确认删除点位模板「${row.templateName}」？被计划/任务引用时后端会拒绝。`, '删除确认', {
      type: 'warning'
    })
  } catch (e) {
    return
  }
  try {
    await deletePointTemplate(row.id)
    notify.success('模板已删除')
    loadTemplates()
  } catch (e) {
    // 3002 被引用由拦截器提示
  }
}

async function submitTemplate() {
  if (!templateForm.templateName) {
    notify.warning('模板名称必填')
    return
  }
  if (!templateEdit.value && !templateForm.templateCode) {
    notify.warning('模板编码必填')
    return
  }
  if (!templatePoints.value.length || templatePoints.value.some((p) => !p.pointName)) {
    notify.warning('请填写完整的点位名称')
    return
  }
  submitting.value = true
  try {
    const payload = {
      templateName: templateForm.templateName,
      elevatorType: templateForm.elevatorType,
      status: templateForm.status,
      points: templatePoints.value.map((p, i) => ({
        pointName: p.pointName,
        severity: p.severity,
        remark: p.remark || undefined,
        sortNo: i + 1
      }))
    }
    if (templateEdit.value) {
      await updatePointTemplate(templateId.value, payload)
      notify.success('模板已更新')
    } else {
      await createPointTemplate({ ...payload, templateCode: templateForm.templateCode })
      notify.success('模板已创建')
    }
    templateVisible.value = false
    loadTemplates()
  } catch (e) {
    // 3000/3002 由拦截器提示
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  loadPlans()
  loadTasks()
  loadTemplates()
  communities.value = await getCommunities().catch(() => [])
  if (route.query.taskId) {
    openTaskById(route.query.taskId).catch(() => notify.error('巡检任务加载失败'))
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
