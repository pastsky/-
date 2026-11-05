<template>
  <div>
    <el-page-header class="page-header" content="工单详情" @back="$router.back()" />

    <el-card v-loading="loading">
      <div class="title-row">
        <span class="title">{{ detail.title }}</span>
        <el-tag v-if="detail.poolFlag === 1" type="warning" size="small">待抢单</el-tag>
        <el-tag v-if="detail.overdue" type="danger" size="small">处理超时</el-tag>
        <el-tag v-if="detail.escalationCount > 0" type="danger" size="small">
          {{ ESCALATION_MAP[detail.escalationCount] || '已升级' }}
        </el-tag>
      </div>
      <el-descriptions :column="3" border class="desc">
        <el-descriptions-item label="工单号">{{ detail.orderNo }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="WORK_ORDER_STATUS_TAG[detail.status]" size="small">
            {{ WORK_ORDER_STATUS_MAP[detail.status] }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="来源">
          {{ WORK_ORDER_SOURCE_MAP[detail.source] || '—' }}
        </el-descriptions-item>
        <el-descriptions-item label="类型">{{ WORK_ORDER_TYPE_MAP[detail.type] }}</el-descriptions-item>
        <el-descriptions-item label="优先级">
          <el-tag :type="WORK_ORDER_PRIORITY_TAG[detail.priority]" size="small">
            {{ WORK_ORDER_PRIORITY_MAP[detail.priority] }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="预约时间">
          {{ formatAppointment(detail.appointmentTime) }}
        </el-descriptions-item>
        <el-descriptions-item label="位置">
          {{ detail.location || [detail.building, detail.room].filter(Boolean).join('') || '—' }}
        </el-descriptions-item>
        <el-descriptions-item label="电梯">
          {{ detail.elevator ? detail.elevator.elevatorNo : '—' }}
        </el-descriptions-item>
        <el-descriptions-item label="报修人">
          {{ detail.reporter?.realName || '—' }}
          <span v-if="detail.reporter?.phone" class="sub">（{{ detail.reporter.phone }}）</span>
        </el-descriptions-item>
        <el-descriptions-item label="处理人">
          {{ detail.assignee?.realName || '—' }}
          <span v-if="detail.assignee?.phone" class="sub">（{{ detail.assignee.phone }}）</span>
        </el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ detail.createdAt }}</el-descriptions-item>
        <el-descriptions-item label="到场时间">{{ detail.acceptTime || '—' }}</el-descriptions-item>
        <el-descriptions-item label="完工时间">{{ detail.finishTime || '—' }}</el-descriptions-item>
        <el-descriptions-item label="关闭时间">{{ detail.closeTime || '—' }}</el-descriptions-item>
        <el-descriptions-item v-if="detail.cancelTime" label="取消时间">
          {{ detail.cancelTime }}
        </el-descriptions-item>
        <el-descriptions-item v-if="detail.rejectCount" label="完工驳回次数">
          {{ detail.rejectCount }} / 3
        </el-descriptions-item>
        <el-descriptions-item label="问题描述" :span="3">
          {{ detail.description || '—' }}
        </el-descriptions-item>
        <el-descriptions-item v-if="detail.rating" label="评价" :span="3">
          <el-rate :model-value="detail.rating" disabled />
          <span class="sub">{{ detail.ratingComment || '' }}</span>
        </el-descriptions-item>
        <el-descriptions-item v-if="detail.reviewResult" label="回访结果" :span="3">
          {{ REVIEW_RESULT_MAP[detail.reviewResult] }}
          <span class="sub">{{ detail.reviewRemark || '' }}</span>
        </el-descriptions-item>
      </el-descriptions>

      <div v-if="detail.images && detail.images.length" class="images">
        <div class="images-label">故障照片</div>
        <el-image
          v-for="(img, i) in detail.images"
          :key="i"
          :src="img"
          :preview-src-list="detail.images"
          :initial-index="i"
          fit="cover"
          class="thumb"
        />
      </div>
      <div v-if="detail.finishImages && detail.finishImages.length" class="images">
        <div class="images-label">完工照片</div>
        <el-image
          v-for="(img, i) in detail.finishImages"
          :key="i"
          :src="img"
          :preview-src-list="detail.finishImages"
          :initial-index="i"
          fit="cover"
          class="thumb"
        />
        <span class="sub">{{ detail.finishRemark }}</span>
      </div>
    </el-card>

    <el-card class="section">
      <div class="action-bar">
        <el-button v-if="canEdit" @click="goEdit">编辑</el-button>
        <el-button v-if="canAssign" type="primary" @click="openAssign">派单</el-button>
        <el-button v-if="canPushPool" @click="handlePushPool">推送入池</el-button>
        <el-button v-if="canAuditAppointment" @click="openAudit">审核预约</el-button>
        <el-button v-if="canReturn" @click="openReturn">退回</el-button>
        <el-button v-if="canTransfer" @click="openTransfer">转交</el-button>
        <el-button v-if="canAccept" type="primary" @click="handleAccept">接单</el-button>
        <el-button v-if="canComplete" type="primary" @click="openComplete">完工</el-button>
        <el-button v-if="canReject" type="warning" @click="openReject">完工驳回</el-button>
        <el-button v-if="canReview" type="success" @click="openReview">回访</el-button>
        <el-button v-if="canClose" @click="handleClose">关闭</el-button>
        <el-button v-if="canRate" type="warning" @click="openRate">评价</el-button>
        <el-button v-if="canRemark" @click="openRemark">内部备注</el-button>
        <el-button v-if="canForce" type="info" @click="openForce">兜底改单</el-button>
        <el-button v-if="canCancel" type="danger" @click="handleCancel">取消工单</el-button>
        <span v-if="!hasAction" class="sub">当前状态/角色无可执行操作</span>
      </div>
    </el-card>

    <el-card class="section">
      <template #header>
        流转记录
        <span class="sub">（含原因与操作角色，按时间正序）</span>
      </template>
      <el-timeline v-if="logList.length">
        <el-timeline-item
          v-for="(log, i) in logList"
          :key="i"
          :timestamp="log.createdAt"
          placement="top"
        >
          <span class="log-op">{{ log.operatorName }}</span>
          · {{ WORK_ORDER_ACTION_MAP[log.action] || log.action }}
          <el-tag v-if="log.reason" size="small" type="info" class="log-reason">原因：{{ log.reason }}</el-tag>
          <span v-if="log.remark" class="sub">（{{ log.remark }}）</span>
        </el-timeline-item>
      </el-timeline>
      <el-empty v-else description="暂无记录" />
    </el-card>

    <el-card v-if="canRemark" class="section">
      <template #header>
        内部备注
        <span class="sub">（客服与维修工互见，业主不可见）</span>
      </template>
      <div v-if="detail.remarks && detail.remarks.length" class="remark-list">
        <div v-for="r in detail.remarks" :key="r.id" class="remark-item">
          <div class="remark-head">
            <b>{{ r.operatorName }}</b>
            <span class="sub">{{ r.createdAt }}</span>
          </div>
          <div>{{ r.content }}</div>
          <div v-if="r.images && r.images.length" class="images">
            <el-image
              v-for="(img, i) in r.images"
              :key="i"
              :src="img"
              :preview-src-list="r.images"
              :initial-index="i"
              fit="cover"
              class="thumb small"
            />
          </div>
        </div>
      </div>
      <el-empty v-else description="暂无内部备注" :image-size="60" />
    </el-card>

    <!-- 派单 -->
    <el-dialog v-model="assignVisible" title="派单" width="760px">
      <el-form label-width="88px">
        <el-form-item label="班组">
          <el-select v-model="assignForm.teamId" clearable placeholder="全部班组" style="width: 220px" @change="loadEngineers">
            <el-option v-for="g in groupList" :key="g.id" :label="g.name" :value="g.id" />
          </el-select>
          <span class="sub">不选班组则全局选人</span>
        </el-form-item>
        <el-form-item label="维修工">
          <el-table :data="engineers" height="240" highlight-current-row @current-change="onEngineerChange">
            <el-table-column prop="realName" label="姓名" width="90" />
            <el-table-column prop="groupName" label="班组" width="90" />
            <el-table-column label="持证" min-width="140">
              <template #default="{ row }">
                <el-tag
                  v-for="c in row.validCerts"
                  :key="c"
                  size="small"
                  :type="isCertSufficient(row) ? 'success' : 'info'"
                  class="tag"
                >
                  {{ CERT_TYPE_MAP[c] || c }}
                </el-tag>
                <span v-if="!row.validCerts.length" class="sub">无证</span>
              </template>
            </el-table-column>
            <el-table-column label="值班" width="66">
              <template #default="{ row }">
                <el-tag size="small" :type="row.onDuty ? 'success' : 'info'">
                  {{ row.onDuty ? '在值' : '收工' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="在途" width="60">
              <template #default="{ row }">{{ row.unfinishedCount }}</template>
            </el-table-column>
            <el-table-column label="今日" width="60">
              <template #default="{ row }">{{ row.todayCount }}</template>
            </el-table-column>
            <el-table-column label="超时率" width="76">
              <template #default="{ row }">{{ row.overdueRate }}%</template>
            </el-table-column>
          </el-table>
        </el-form-item>
        <el-form-item label="优先级">
          <el-select v-model="assignForm.priority" clearable placeholder="不变更" style="width: 220px">
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
        <el-form-item label="去向">
          <el-checkbox v-model="assignForm.toPool">不指派个人，直接推入待抢单池</el-checkbox>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="assignVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitAssign">确定</el-button>
      </template>
    </el-dialog>

    <!-- 退回（维修工）：仅回说明，回到待派单，由客服重派或入池 -->
    <el-dialog v-model="returnVisible" title="退回工单" width="520px">
      <el-form label-width="80px">
        <el-form-item label="退回说明">
          <el-input v-model="returnForm.remark" type="textarea" placeholder="如：无电梯作业证 / 现场无法进入（可留空）" />
        </el-form-item>
      </el-form>
      <div class="sub">退回后回到「待派单」，由客服重新指派或推入待抢单池</div>
      <template #footer>
        <el-button @click="returnVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitReturn">确定退回</el-button>
      </template>
    </el-dialog>

    <!-- 转交 -->
    <el-dialog v-model="transferVisible" title="转交工单" width="520px">
      <el-form label-width="80px">
        <el-form-item label="目标维修工">
          <el-select v-model="transferForm.targetAssigneeId" placeholder="请选择" style="width: 100%">
            <el-option
              v-for="e in engineers"
              :key="e.id"
              :label="`${e.realName}（${e.groupName}，在途 ${e.unfinishedCount}）`"
              :value="e.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="转交原因" required>
          <el-input v-model="transferForm.reason" type="textarea" placeholder="如：原维修工超时未处理" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="transferVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitTransfer">确定转交</el-button>
      </template>
    </el-dialog>

    <!-- 完工 -->
    <el-dialog v-model="completeVisible" title="完工提交" width="560px">
      <el-form label-width="80px">
        <el-form-item label="完工说明">
          <el-input v-model="completeForm.remark" type="textarea" placeholder="说明处理结果" />
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
          <div class="sub">完工必须上传至少 1 张现场照片（1~6 张），后端缺失时同样返回 1000</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="completeVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitComplete">提交完工</el-button>
      </template>
    </el-dialog>

    <!-- 完工驳回 -->
    <el-dialog v-model="rejectVisible" title="完工驳回" width="520px">
      <el-form label-width="80px">
        <el-form-item label="驳回原因" required>
          <el-input v-model="rejectForm.reason" type="textarea" placeholder="如：现场照片不清晰 / 问题未解决" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="rejectForm.remark" type="textarea" />
        </el-form-item>
      </el-form>
      <div class="sub">驳回后回到「处理中」返工，最多 3 次，超限需走升级督办</div>
      <template #footer>
        <el-button @click="rejectVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitReject">确定驳回</el-button>
      </template>
    </el-dialog>

    <!-- 回访 -->
    <el-dialog v-model="reviewVisible" title="回访结果" width="520px">
      <el-form label-width="80px">
        <el-form-item label="结果">
          <el-radio-group v-model="reviewForm.result">
            <el-radio value="SATISFIED">满意，归档</el-radio>
            <el-radio value="UNSATISFIED">不满意，返工</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="reviewForm.remark" type="textarea" />
        </el-form-item>
      </el-form>
      <div class="sub">待回访超 24 小时将自动默认好评归档</div>
      <template #footer>
        <el-button @click="reviewVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitReview">提交</el-button>
      </template>
    </el-dialog>

    <!-- 审核预约 -->
    <el-dialog v-model="auditVisible" title="审核预约时间" width="520px">
      <el-form label-width="90px">
        <el-form-item label="业主预约">
          {{ formatAppointment(detail.appointmentTime) }}
        </el-form-item>
        <el-form-item label="审核结果">
          <el-radio-group v-model="auditForm.approved">
            <el-radio :value="1">按预约时间上门</el-radio>
            <el-radio :value="0">改约</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="!auditForm.approved" label="新时间" required>
          <el-date-picker
            v-model="auditForm.newTime"
            type="datetime"
            value-format="YYYY-MM-DD HH:mm:ss"
            format="YYYY-MM-DD HH:mm"
            :step="30"
            placeholder="选择新时间（30 分钟粒度）"
          />
        </el-form-item>
        <el-form-item v-if="!auditForm.approved" label="改约原因" required>
          <el-input v-model="auditForm.reason" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="auditVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitAudit">提交</el-button>
      </template>
    </el-dialog>

    <!-- 评价 -->
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

    <!-- 内部备注 -->
    <el-dialog v-model="remarkVisible" title="内部备注" width="560px">
      <el-form label-width="70px">
        <el-form-item label="内容">
          <el-input v-model="remarkForm.content" type="textarea" :rows="3" placeholder="仅客服与维修工可见" />
        </el-form-item>
        <el-form-item label="图片">
          <el-upload
            v-model:file-list="remarkFiles"
            list-type="picture-card"
            :http-request="handleUpload"
            :limit="3"
            multiple
          >
            <el-icon><Plus /></el-icon>
          </el-upload>
          <div class="sub">每条备注最多 3 张</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="remarkVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitRemark">保存</el-button>
      </template>
    </el-dialog>

    <!-- 兜底改单：仅状态转移矩阵内的 3 对，原因必填 -->
    <el-dialog v-model="forceVisible" title="兜底改单" width="540px">
      <el-form label-width="90px">
        <el-form-item label="目标状态" required>
          <el-select v-model="forceForm.targetStatus" style="width: 100%">
            <el-option
              v-for="s in forceTargets"
              :key="s"
              :label="WORK_ORDER_STATUS_MAP[s]"
              :value="s"
            />
          </el-select>
        </el-form-item>
        <el-form-item v-if="forceForm.targetStatus === 'ASSIGNED'" label="改派给" required>
          <el-select v-model="forceForm.assigneeId" style="width: 100%">
            <el-option
              v-for="e in engineers"
              :key="e.id"
              :label="`${e.realName}（${e.groupName}，在途 ${e.unfinishedCount}）`"
              :value="e.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item v-if="forceForm.targetStatus === 'COMPLETED'" label="完工照片" required>
          <el-upload
            v-model:file-list="forceFiles"
            list-type="picture-card"
            :http-request="handleUpload"
            :limit="6"
            multiple
          >
            <el-icon><Plus /></el-icon>
          </el-upload>
        </el-form-item>
        <el-form-item label="原因" required>
          <el-input v-model="forceForm.reason" type="textarea" placeholder="改单原因，写入审计与流转日志" />
        </el-form-item>
      </el-form>
      <div class="sub">仅允许 PROCESSING→ASSIGNED、PROCESSING→COMPLETED、PENDING→CANCELED 三对状态</div>
      <template #footer>
        <el-button @click="forceVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitForce">确认改单</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { notify } from '@/utils/notify'
import { Plus } from '@element-plus/icons-vue'
import {
  getWorkOrderDetail,
  getWorkOrderLogs,
  assignWorkOrder,
  toPool,
  returnWorkOrder,
  transferWorkOrder,
  acceptWorkOrder,
  completeWorkOrder,
  rejectWorkOrder,
  reviewWorkOrder,
  closeWorkOrder,
  cancelWorkOrder,
  rateWorkOrder,
  auditAppointment,
  addInternalNote,
  forceStatus
} from '@/api/workOrder'
import { getEngineers, getGroups } from '@/api/user'
import { uploadImage, compressImage } from '@/api/file'
import { useUserStore } from '@/stores/user'
import {
  WORK_ORDER_STATUS_MAP,
  WORK_ORDER_STATUS_TAG,
  WORK_ORDER_TYPE_MAP,
  WORK_ORDER_PRIORITY_MAP,
  WORK_ORDER_PRIORITY_TAG,
  WORK_ORDER_PRIORITY_OPTIONS,
  WORK_ORDER_ACTION_MAP,
  WORK_ORDER_SOURCE_MAP,
  REVIEW_RESULT_MAP,
  ESCALATION_MAP,
  CERT_TYPE_MAP,
  CERT_REQUIRED_TYPES,
  REPAIRER_ROLES,
  FORCE_STATUS_MATRIX,
  formatAppointment
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
const groupList = ref([])

const assignVisible = ref(false)
const returnVisible = ref(false)
const transferVisible = ref(false)
const completeVisible = ref(false)
const rejectVisible = ref(false)
const reviewVisible = ref(false)
const auditVisible = ref(false)
const rateVisible = ref(false)
const remarkVisible = ref(false)
const forceVisible = ref(false)

const assignForm = reactive({ assigneeId: null, teamId: null, priority: '', remark: '', toPool: false })
const returnForm = reactive({ remark: '' })
const transferForm = reactive({ targetAssigneeId: null, reason: '' })
const completeForm = reactive({ remark: '' })
const rejectForm = reactive({ reason: '', remark: '' })
const reviewForm = reactive({ result: 'SATISFIED', remark: '' })
const auditForm = reactive({ approved: 1, newTime: '', reason: '' })
const rateForm = reactive({ rating: 0, comment: '' })
const remarkForm = reactive({ content: '' })
const forceForm = reactive({ targetStatus: '', assigneeId: null, reason: '' })

const completeFiles = ref([])
const remarkFiles = ref([])
const forceFiles = ref([])

const role = computed(() => userStore.role)
const status = computed(() => detail.value.status)
// 调度类动作（派单/入池/关闭/回访/驳回/督办/内部备注）后端仅 CS、ADMIN
const isStaff = computed(() => ['CUSTOMER_SERVICE', 'ADMIN'].includes(role.value))
const isRepairer = computed(() => REPAIRER_ROLES.includes(role.value))
const isAssignee = computed(() => detail.value.assignee?.id === userStore.currentUser?.id)
const isReporter = computed(() => detail.value.reporter?.id === userStore.currentUser?.id)
const archived = computed(() => ['CLOSED', 'CANCELED', 'ESCALATED_FINAL'].includes(status.value))

// 后端 PUT /work-orders/{id} 仅 RESIDENT、ADMIN
const canEdit = computed(
  () => ['RESIDENT', 'ADMIN'].includes(role.value) && status.value === 'PENDING'
)
const canAssign = computed(() => isStaff.value && status.value === 'PENDING')
const canPushPool = computed(() => isStaff.value && ['PENDING', 'ASSIGNED'].includes(status.value))
const canAuditAppointment = computed(
  () => isRepairer.value && isAssignee.value && !!detail.value.appointmentTime && !archived.value
)
const canReturn = computed(() => isRepairer.value && status.value === 'ASSIGNED' && isAssignee.value)
const canTransfer = computed(
  () =>
    (isStaff.value || (isRepairer.value && isAssignee.value)) &&
    ['ASSIGNED', 'PROCESSING'].includes(status.value)
)
const canAccept = computed(() => isRepairer.value && status.value === 'ASSIGNED' && isAssignee.value)
const canComplete = computed(() => isRepairer.value && status.value === 'PROCESSING' && isAssignee.value)
const canReject = computed(
  () => isStaff.value && ['COMPLETED', 'PENDING_REVIEW'].includes(status.value)
)
const canReview = computed(() => isStaff.value && status.value === 'PENDING_REVIEW')
const canClose = computed(
  () => isStaff.value && ['COMPLETED', 'PENDING_REVIEW'].includes(status.value)
)
const canRate = computed(
  () =>
    role.value === 'RESIDENT' &&
    ['COMPLETED', 'PENDING_REVIEW'].includes(status.value) &&
    !detail.value.rating &&
    isReporter.value
)
// 内部备注：CS/ADMIN 或本单维修工；归档态只读
const canRemark = computed(
  () => !archived.value && (isStaff.value || (isRepairer.value && isAssignee.value))
)
// 兜底改单：仅 3 对状态（PROCESSING→ASSIGNED / PROCESSING→COMPLETED / PENDING→CANCELED）
const forceTargets = computed(() => FORCE_STATUS_MATRIX[status.value] || [])
const canForce = computed(
  () => ['CUSTOMER_SERVICE', 'ADMIN'].includes(role.value) && forceTargets.value.length > 0
)
const canCancel = computed(() => {
  if (['PENDING', 'ASSIGNED'].includes(status.value)) {
    return isStaff.value || (role.value === 'RESIDENT' && isReporter.value)
  }
  if (status.value === 'PROCESSING') return isStaff.value
  return false
})

const hasAction = computed(
  () =>
    canEdit.value ||
    canAssign.value ||
    canPushPool.value ||
    canAuditAppointment.value ||
    canReturn.value ||
    canTransfer.value ||
    canAccept.value ||
    canComplete.value ||
    canReject.value ||
    canReview.value ||
    canClose.value ||
    canRate.value ||
    canRemark.value ||
    canForce.value ||
    canCancel.value
)

function isCertSufficient(row) {
  const required = CERT_REQUIRED_TYPES[detail.value.type]
  return !required || row.validCerts.includes(required)
}

async function loadDetail() {
  loading.value = true
  try {
    detail.value = await getWorkOrderDetail(id)
    logList.value = await getWorkOrderLogs(id)
  } catch (e) {
    // 1001/3001/1002 由拦截器提示，页面保持上一状态
  } finally {
    loading.value = false
  }
}

async function loadEngineers() {
  engineers.value = await getEngineers(assignForm.teamId ? { teamId: assignForm.teamId } : {})
}

async function loadGroups() {
  groupList.value = await getGroups()
}

function goEdit() {
  router.push(`/work-orders/${id}/edit`)
}

async function openAssign() {
  assignForm.assigneeId = null
  assignForm.teamId = null
  assignForm.priority = ''
  assignForm.remark = ''
  assignForm.toPool = false
  if (!groupList.value.length) await loadGroups()
  await loadEngineers()
  assignVisible.value = true
}

function onEngineerChange(row) {
  assignForm.assigneeId = row ? row.id : null
}

async function submitAssign() {
  if (assignForm.toPool) {
    if (!assignForm.remark) {
      notify.warning('入池需填写说明')
      return
    }
    submitting.value = true
    try {
      await toPool(id, { reason: assignForm.remark })
      assignVisible.value = false
      notify.success('已推入待抢单池')
      loadDetail()
    } finally {
      submitting.value = false
    }
    return
  }
  if (!assignForm.assigneeId) {
    notify.warning('请选择维修工')
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
    notify.success('派单成功')
    loadDetail()
  } finally {
    submitting.value = false
  }
}

async function handlePushPool() {
  const { value } = await ElMessageBox.prompt('请输入推送入池原因', '推送入池', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    inputValidator: (v) => (v && v.trim() ? true : '原因不能为空')
  })
  await toPool(id, { reason: value })
  notify.success('已推入待抢单池')
  loadDetail()
}

function openReturn() {
  returnForm.remark = ''
  returnVisible.value = true
}

async function submitReturn() {
  submitting.value = true
  try {
    await returnWorkOrder(id, { remark: returnForm.remark })
    returnVisible.value = false
    notify.success('已退回待派单')
    loadDetail()
  } finally {
    submitting.value = false
  }
}

async function openTransfer() {
  await loadEngineers()
  transferForm.targetAssigneeId = null
  transferForm.reason = ''
  transferVisible.value = true
}

async function submitTransfer() {
  if (!transferForm.targetAssigneeId) {
    notify.warning('请选择目标维修工')
    return
  }
  if (!transferForm.reason) {
    notify.warning('请填写转交原因')
    return
  }
  submitting.value = true
  try {
    await transferWorkOrder(id, transferForm)
    transferVisible.value = false
    notify.success('已转交，待对方接单')
    loadDetail()
  } finally {
    submitting.value = false
  }
}

async function handleAccept() {
  await ElMessageBox.confirm('确认接单？', '接单')
  await acceptWorkOrder(id, {})
  notify.success('已接单')
  loadDetail()
}

function openComplete() {
  completeForm.remark = ''
  completeFiles.value = []
  completeVisible.value = true
}

async function handleUpload(options) {
  try {
    const compressed = await compressImage(options.file)
    const url = await uploadImage(compressed)
    options.onSuccess(url)
  } catch (e) {
    options.onError(e)
  }
}

async function submitComplete() {
  const images = completeFiles.value.filter((f) => f.url).map((f) => f.url)
  if (!images.length) {
    notify.warning('完工需至少上传 1 张现场照片')
    return
  }
  submitting.value = true
  try {
    await completeWorkOrder(id, { remark: completeForm.remark, images })
    completeVisible.value = false
    notify.success('已完工，待回访')
    loadDetail()
  } finally {
    submitting.value = false
  }
}

function openReject() {
  rejectForm.reason = ''
  rejectForm.remark = ''
  rejectVisible.value = true
}

async function submitReject() {
  if (!rejectForm.reason) {
    notify.warning('请填写驳回原因')
    return
  }
  submitting.value = true
  try {
    await rejectWorkOrder(id, rejectForm)
    rejectVisible.value = false
    notify.success('已驳回，返回处理中')
    loadDetail()
  } finally {
    submitting.value = false
  }
}

function openReview() {
  reviewForm.result = 'SATISFIED'
  reviewForm.remark = ''
  reviewVisible.value = true
}

async function submitReview() {
  submitting.value = true
  try {
    await reviewWorkOrder(id, reviewForm)
    reviewVisible.value = false
    notify.success(reviewForm.result === 'SATISFIED' ? '回访完成，已归档' : '已退回返工')
    loadDetail()
  } finally {
    submitting.value = false
  }
}

function openAudit() {
  auditForm.approved = 1
  auditForm.newTime = ''
  auditForm.reason = ''
  auditVisible.value = true
}

async function submitAudit() {
  if (!auditForm.approved && (!auditForm.newTime || !auditForm.reason)) {
    notify.warning('改约需填写新时间与原因')
    return
  }
  submitting.value = true
  try {
    await auditAppointment(id, auditForm)
    auditVisible.value = false
    notify.success('预约处理已提交')
    loadDetail()
  } finally {
    submitting.value = false
  }
}

async function handleClose() {
  await ElMessageBox.confirm('确认关闭该工单？', '关闭工单')
  await closeWorkOrder(id, {})
  notify.success('已关闭')
  loadDetail()
}

async function handleCancel() {
  const { value } = await ElMessageBox.prompt('请输入取消原因', '取消工单', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    inputValidator: (v) => (v && v.trim() ? true : '原因不能为空')
  })
  await cancelWorkOrder(id, { reason: value, remark: value })
  notify.success('已取消')
  loadDetail()
}

function openRate() {
  rateForm.rating = 0
  rateForm.comment = ''
  rateVisible.value = true
}

async function submitRate() {
  if (!rateForm.rating) {
    notify.warning('请选择评分')
    return
  }
  submitting.value = true
  try {
    await rateWorkOrder(id, { rating: rateForm.rating, comment: rateForm.comment })
    rateVisible.value = false
    notify.success('评价成功')
    loadDetail()
  } finally {
    submitting.value = false
  }
}

function openRemark() {
  remarkForm.content = ''
  remarkFiles.value = []
  remarkVisible.value = true
}

async function submitRemark() {
  if (!remarkForm.content) {
    notify.warning('请输入备注内容')
    return
  }
  const images = remarkFiles.value.filter((f) => f.url).map((f) => f.url)
  submitting.value = true
  try {
    await addInternalNote(id, { remark: remarkForm.content, images })
    remarkVisible.value = false
    notify.success('备注已保存')
    loadDetail()
  } finally {
    submitting.value = false
  }
}

async function openForce() {
  await loadEngineers()
  forceForm.targetStatus = forceTargets.value[0] || ''
  forceForm.assigneeId = null
  forceForm.reason = ''
  forceFiles.value = []
  forceVisible.value = true
}

async function submitForce() {
  if (!forceForm.targetStatus) {
    notify.warning('请选择目标状态')
    return
  }
  if (!forceForm.reason) {
    notify.warning('请填写改单原因')
    return
  }
  if (forceForm.targetStatus === 'ASSIGNED' && !forceForm.assigneeId) {
    notify.warning('改派需选择目标维修工')
    return
  }
  const finishImages = forceFiles.value.filter((f) => f.url).map((f) => f.url)
  if (forceForm.targetStatus === 'COMPLETED' && !finishImages.length) {
    notify.warning('补录完工需至少 1 张现场照片')
    return
  }
  submitting.value = true
  try {
    await forceStatus(id, {
      targetStatus: forceForm.targetStatus,
      assigneeId: forceForm.assigneeId || undefined,
      finishImages: finishImages.length ? finishImages : undefined,
      reason: forceForm.reason
    })
    forceVisible.value = false
    notify.success('改单成功')
    loadDetail()
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  await loadDetail()
  // 维修工任务卡「上传照片并完工」直达完工弹窗
  if (route.query.action === 'complete' && canComplete.value) openComplete()
})
</script>

<style scoped>
.page-header {
  margin-bottom: 16px;
}
.title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.title {
  font-size: 18px;
  font-weight: 600;
}
.desc {
  margin-bottom: 8px;
}
.section {
  margin-top: 16px;
}
.action-bar {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}
.sub {
  margin-left: 6px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
.images {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 8px;
}
.images-label {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
.thumb {
  width: 72px;
  height: 72px;
  border-radius: 6px;
}
.thumb.small {
  width: 56px;
  height: 56px;
}
.tag {
  margin-right: 4px;
}
.log-op {
  font-weight: 600;
}
.log-reason {
  margin-left: 6px;
}
.remark-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.remark-item {
  border-left: 3px solid var(--el-color-primary-light-5);
  padding-left: 10px;
}
.remark-head {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 4px;
}
</style>
