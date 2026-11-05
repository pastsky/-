<template>
  <el-card>
    <el-tabs v-model="tab">
      <!-- 证书审核 -->
      <el-tab-pane label="证书审核" name="audit">
        <el-form :inline="true" class="filter">
          <el-form-item label="关键字">
            <el-input v-model="query.keyword" placeholder="维修工 / 证书编号" clearable style="width: 190px" />
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="query.status" clearable placeholder="全部" style="width: 130px">
              <el-option
                v-for="(label, value) in CERT_STATUS_MAP"
                :key="value"
                :label="label"
                :value="value"
              />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="loadCerts">查询</el-button>
            <el-button @click="resetQuery">重置</el-button>
            <el-button @click="openEligibility">资格校验</el-button>
          </el-form-item>
        </el-form>

        <ListError :failed="loadError" :loading="loading" @retry="loadCerts" />
        <el-table v-if="!loadError" v-loading="loading" :data="certs">
          <el-table-column prop="engineerName" label="维修工" width="110" />
          <el-table-column label="证书类型" width="140">
            <template #default="{ row }">{{ row.tagName || CERT_TYPE_MAP[row.tagCode] }}</template>
          </el-table-column>
          <el-table-column prop="skillLevel" label="等级" width="80">
            <template #default="{ row }">{{ row.skillLevel ? `L${row.skillLevel}` : '—' }}</template>
          </el-table-column>
          <el-table-column prop="certNo" label="证书编号" width="150" />
          <el-table-column label="有效期" width="170">
            <template #default="{ row }">
              <span :class="{ expired: row.expired }">{{ row.expireDate || '长期' }}</span>
              <el-tag v-if="row.expired" size="small" type="danger" class="tag">已过期</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="110">
            <template #default="{ row }">
              <el-tag :type="CERT_STATUS_TAG[row.status]" size="small">
                {{ CERT_STATUS_MAP[row.status] }}
              </el-tag>
              <el-tag v-if="row.slaOverdue" size="small" type="danger" class="tag">超时</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="驳回次数" width="100">
            <template #default="{ row }">{{ row.rejectCount || 0 }} / 3</template>
          </el-table-column>
          <el-table-column prop="createdAt" label="提交时间" width="165" />
          <el-table-column label="操作" width="110" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openDetail(row)">
                {{ row.status === 'PENDING' ? '审核' : '详情' }}
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <el-pagination
          class="pagination"
          v-model:current-page="query.page"
          v-model:page-size="query.pageSize"
          :total="total"
          layout="total, prev, pager, next"
          @current-change="loadCerts"
        />
      </el-tab-pane>

      <!-- 标签字典 -->
      <el-tab-pane label="证书标签" name="tags">
        <div class="toolbar">
          <el-button v-if="isAdmin" type="primary" @click="openTagCreate">新增标签</el-button>
          <span class="sub">标签编码唯一且强制大写；被证书引用时不可删除</span>
        </div>
        <el-table v-loading="tagLoading" :data="tags">
          <el-table-column prop="tagCode" label="标签编码" width="160" />
          <el-table-column prop="tagName" label="名称" width="160" />
          <el-table-column prop="certLevel" label="等级" width="90" />
          <el-table-column prop="sortNo" label="排序" width="80" />
          <el-table-column prop="remark" label="备注" min-width="150" show-overflow-tooltip />
          <el-table-column label="状态" width="90">
            <template #default="{ row }">
              <el-tag :type="row.status === 'ACTIVE' ? 'success' : 'info'" size="small">
                {{ row.status === 'ACTIVE' ? '启用' : '停用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column v-if="isAdmin" label="操作" width="140" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openTagEdit(row)">编辑</el-button>
              <el-button link type="danger" @click="handleTagDelete(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- 类型映射 -->
      <el-tab-pane label="工单类型映射" name="mapping">
        <el-table v-loading="mappingLoading" :data="mappings">
          <el-table-column label="工单类型" width="140">
            <template #default="{ row }">{{ WORK_ORDER_TYPE_MAP[row.workOrderType] || row.workOrderType }}</template>
          </el-table-column>
          <el-table-column label="持证要求" width="130">
            <template #default="{ row }">
              <el-tag
                size="small"
                :type="row.requirement === 'FORCE' ? 'danger' : row.requirement === 'SUGGEST' ? 'warning' : 'info'"
              >
                {{ CERT_REQUIREMENT_MAP[row.requirement] }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="对应证书" min-width="160">
            <template #default="{ row }">{{ row.tagName || '—' }}</template>
          </el-table-column>
          <el-table-column v-if="isAdmin" label="操作" width="100" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openMapping(row)">配置</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <!-- 证书详情 / 审核 -->
    <el-drawer v-model="detailVisible" title="证书审核" size="560px">
      <el-descriptions :column="1" border>
        <el-descriptions-item label="维修工">{{ detail.engineerName }}</el-descriptions-item>
        <el-descriptions-item label="证书">
          {{ detail.tagName || CERT_TYPE_MAP[detail.tagCode] }}
          <span v-if="detail.skillLevel" class="sub">L{{ detail.skillLevel }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="证书编号">{{ detail.certNo || '—' }}</el-descriptions-item>
        <el-descriptions-item label="有效期">
          {{ detail.issueDate || '—' }} ~ {{ detail.expireDate || '长期' }}
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="CERT_STATUS_TAG[detail.status]" size="small">
            {{ CERT_STATUS_MAP[detail.status] }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item v-if="detail.remark" label="维修工备注">{{ detail.remark }}</el-descriptions-item>
      </el-descriptions>

      <div v-if="detail.images?.length" class="images">
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

      <div class="timeline">
        <div class="timeline-title">审核留痕</div>
        <el-timeline>
          <el-timeline-item
            v-for="(t, i) in detail.timeline || []"
            :key="i"
            :timestamp="t.createdAt"
            placement="top"
          >
            <b>{{ t.operatorName }}</b> · {{ CERT_REVIEW_ACTION_MAP[t.action] || t.action }}
            <span v-if="t.remark" class="sub">（{{ t.remark }}）</span>
          </el-timeline-item>
        </el-timeline>
        <el-empty v-if="!(detail.timeline || []).length" description="暂无记录" :image-size="50" />
      </div>

      <template #footer>
        <div class="drawer-footer">
          <el-button @click="detailVisible = false">关闭</el-button>
          <template v-if="detail.status === 'PENDING'">
            <el-button type="danger" @click="openReject">驳回</el-button>
            <el-button type="primary" :loading="submitting" @click="handleApprove">通过</el-button>
          </template>
          <template v-if="detail.status === 'LOCKED'">
            <el-button type="warning" :loading="submitting" @click="handleUnlock">解锁</el-button>
          </template>
          <el-button
            v-if="isAdmin && detail.status === 'APPROVED'"
            type="danger"
            plain
            @click="openRevoke"
          >
            撤销证书
          </el-button>
        </div>
      </template>
    </el-drawer>

    <!-- 驳回 / 撤销 -->
    <el-dialog v-model="reasonVisible" :title="reasonMode === 'reject' ? '驳回证书' : '撤销证书'" width="480px">
      <el-form label-width="80px">
        <el-form-item label="原因" required>
          <el-input v-model="reason" type="textarea" placeholder="如：证书编号与图片不一致 / 有效期已过" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="reasonVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitReason">确定</el-button>
      </template>
    </el-dialog>

    <!-- 标签编辑 -->
    <el-dialog v-model="tagVisible" :title="tagEdit ? '编辑标签' : '新增标签'" width="480px">
      <el-form label-width="90px">
        <el-form-item label="标签编码" required>
          <el-input v-model="tagForm.tagCode" :disabled="tagEdit" placeholder="如 LIFT_CERT（大写）" />
        </el-form-item>
        <el-form-item label="名称" required>
          <el-input v-model="tagForm.tagName" />
        </el-form-item>
        <el-form-item label="等级">
          <el-input v-model="tagForm.certLevel" placeholder="如 L2" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="tagForm.sortNo" :min="0" style="width: 100%" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="tagForm.status" active-value="ACTIVE" inactive-value="DISABLED" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="tagForm.remark" type="textarea" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="tagVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitTag">保存</el-button>
      </template>
    </el-dialog>

    <!-- 类型映射 -->
    <el-dialog v-model="mappingVisible" title="配置持证要求" width="460px">
      <el-form label-width="90px">
        <el-form-item label="工单类型">
          {{ WORK_ORDER_TYPE_MAP[mappingForm.workOrderType] }}
        </el-form-item>
        <el-form-item label="要求">
          <el-radio-group v-model="mappingForm.requirement">
            <el-radio value="FORCE">强制</el-radio>
            <el-radio value="SUGGEST">建议</el-radio>
            <el-radio value="NONE">不要求</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="mappingForm.requirement !== 'NONE'" label="证书标签">
          <el-select v-model="mappingForm.tagCode" style="width: 100%">
            <el-option
              v-for="t in tags.filter((x) => x.status === 'ACTIVE')"
              :key="t.tagCode"
              :label="t.tagName"
              :value="t.tagCode"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="mappingVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitMapping">保存</el-button>
      </template>
    </el-dialog>

    <!-- 资质校验（BOP83） -->
    <el-dialog v-model="eligibilityVisible" title="资质校验" width="480px">
      <el-form label-width="100px">
        <el-form-item label="维修工" required>
          <el-select v-model="eligibilityForm.engineerId" filterable style="width: 100%">
            <el-option
              v-for="e in engineers"
              :key="e.id"
              :label="`${e.realName}（${e.groupName || '未分组'}）`"
              :value="e.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="工单类型" required>
          <el-select v-model="eligibilityForm.workOrderType" style="width: 100%">
            <el-option v-for="o in WORK_ORDER_TYPE_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="checking" @click="checkEligibility">校验</el-button>
        </el-form-item>
      </el-form>
      <el-alert
        v-if="eligibilityResult"
        :type="eligibilityResult.eligible ? 'success' : 'error'"
        :closable="false"
        show-icon
      >
        <div>要求：{{ CERT_REQUIREMENT_MAP[eligibilityResult.requirement] || eligibilityResult.requirement || '—' }}</div>
        <div>标签：{{ eligibilityResult.tagCode || '—' }}</div>
        <div v-if="(eligibilityResult.missingTags || []).length">
          缺失：{{ eligibilityResult.missingTags.join('、') }}
        </div>
        <div v-if="(eligibilityResult.expiredTags || []).length">
          过期：{{ eligibilityResult.expiredTags.join('、') }}
        </div>
      </el-alert>
    </el-dialog>
  </el-card>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessageBox } from 'element-plus'
import { notify } from '@/utils/notify'
import {
  getCertificateList,
  getCertificateDetail,
  approveCertificate,
  rejectCertificate,
  revokeCertificate,
  unlockCertificate,
  getRepairerTags,
  createRepairerTag,
  updateRepairerTag,
  deleteRepairerTag,
  getTypeCertMappings,
  updateTypeCertMapping,
  getCertificateEligibility
} from '@/api/certificate'
import { getEngineers } from '@/api/user'
import ListError from '@/components/ListError.vue'
import { useUserStore } from '@/stores/user'
import {
  CERT_TYPE_MAP,
  CERT_STATUS_MAP,
  CERT_STATUS_TAG,
  CERT_REQUIREMENT_MAP,
  CERT_REVIEW_ACTION_MAP,
  WORK_ORDER_TYPE_MAP,
  WORK_ORDER_TYPE_OPTIONS
} from '@/utils/dict'

const userStore = useUserStore()
const isAdmin = computed(() => userStore.role === 'ADMIN')
const tab = ref('audit')
const submitting = ref(false)

const loading = ref(false)
const loadError = ref(false)
const certs = ref([])
const total = ref(0)
const query = reactive({ page: 1, pageSize: 20, status: '', keyword: '' })

const detailVisible = ref(false)
const detail = ref({})

const reasonVisible = ref(false)
const reasonMode = ref('reject')
const reason = ref('')

const tagLoading = ref(false)
const tags = ref([])
const tagVisible = ref(false)
const tagEdit = ref(false)
const tagId = ref(null)
const tagForm = reactive({
  tagCode: '',
  tagName: '',
  certLevel: '',
  sortNo: 0,
  status: 'ACTIVE',
  remark: ''
})

const mappingLoading = ref(false)
const mappings = ref([])
const mappingVisible = ref(false)
const mappingForm = reactive({ workOrderType: '', requirement: 'NONE', tagCode: '' })

const eligibilityVisible = ref(false)
const checking = ref(false)
const engineers = ref([])
const eligibilityForm = reactive({ engineerId: null, workOrderType: '' })
const eligibilityResult = ref(null)

async function loadCerts() {
  loading.value = true
  loadError.value = false
  try {
    const data = await getCertificateList({
      page: query.page,
      pageSize: query.pageSize,
      status: query.status || undefined,
      keyword: query.keyword || undefined
    })
    certs.value = data.list
    total.value = data.total
  } catch (e) {
    loadError.value = true
  } finally {
    loading.value = false
  }
}

function resetQuery() {
  query.status = ''
  query.keyword = ''
  query.page = 1
  loadCerts()
}

async function openDetail(row) {
  detail.value = await getCertificateDetail(row.id)
  detailVisible.value = true
}

async function handleApprove() {
  submitting.value = true
  try {
    await approveCertificate(detail.value.id)
    notify.success('已通过')
    detailVisible.value = false
    loadCerts()
  } finally {
    submitting.value = false
  }
}

function openReject() {
  reasonMode.value = 'reject'
  reason.value = ''
  reasonVisible.value = true
}

function openRevoke() {
  reasonMode.value = 'revoke'
  reason.value = ''
  reasonVisible.value = true
}

async function submitReason() {
  if (!reason.value.trim()) {
    notify.warning('请填写原因')
    return
  }
  submitting.value = true
  try {
    if (reasonMode.value === 'reject') {
      await rejectCertificate(detail.value.id, { reason: reason.value })
    } else {
      await revokeCertificate(detail.value.id, { reason: reason.value })
    }
    notify.success('操作成功')
    reasonVisible.value = false
    detailVisible.value = false
    loadCerts()
  } finally {
    submitting.value = false
  }
}

async function handleUnlock() {
  submitting.value = true
  try {
    await unlockCertificate(detail.value.id)
    notify.success('已解锁')
    detailVisible.value = false
    loadCerts()
  } finally {
    submitting.value = false
  }
}

async function loadTags() {
  tagLoading.value = true
  try {
    tags.value = await getRepairerTags()
  } catch (e) {
    tags.value = []
  } finally {
    tagLoading.value = false
  }
}

function openTagCreate() {
  tagEdit.value = false
  tagId.value = null
  Object.assign(tagForm, {
    tagCode: '',
    tagName: '',
    certLevel: '',
    sortNo: 0,
    status: 'ACTIVE',
    remark: ''
  })
  tagVisible.value = true
}

function openTagEdit(row) {
  tagEdit.value = true
  tagId.value = row.id
  Object.assign(tagForm, {
    tagCode: row.tagCode,
    tagName: row.tagName,
    certLevel: row.certLevel || '',
    sortNo: row.sortNo || 0,
    status: row.status,
    remark: row.remark || ''
  })
  tagVisible.value = true
}

async function submitTag() {
  if (!tagForm.tagCode || !tagForm.tagName) {
    notify.warning('标签编码与名称必填')
    return
  }
  submitting.value = true
  try {
    if (tagEdit.value) await updateRepairerTag(tagId.value, tagForm)
    else await createRepairerTag(tagForm)
    notify.success('保存成功')
    tagVisible.value = false
    loadTags()
  } finally {
    submitting.value = false
  }
}

async function handleTagDelete(row) {
  await ElMessageBox.confirm(`确认删除标签「${row.tagName}」？`, '删除确认', { type: 'warning' })
  try {
    await deleteRepairerTag(row.id)
    notify.success('已删除')
    loadTags()
  } catch (e) {
    // 3002 被引用由拦截器提示
  }
}

async function loadMappings() {
  mappingLoading.value = true
  try {
    mappings.value = await getTypeCertMappings()
  } catch (e) {
    mappings.value = []
  } finally {
    mappingLoading.value = false
  }
}

function openMapping(row) {
  Object.assign(mappingForm, {
    workOrderType: row.workOrderType,
    requirement: row.requirement,
    tagCode: row.tagCode || ''
  })
  mappingVisible.value = true
}

async function submitMapping() {
  if (mappingForm.requirement !== 'NONE' && !mappingForm.tagCode) {
    notify.warning('请选择证书标签')
    return
  }
  submitting.value = true
  try {
    await updateTypeCertMapping(mappingForm.workOrderType, {
      requirement: mappingForm.requirement,
      tagCode: mappingForm.requirement === 'NONE' ? null : mappingForm.tagCode
    })
    notify.success('保存成功')
    mappingVisible.value = false
    loadMappings()
  } finally {
    submitting.value = false
  }
}

async function openEligibility() {
  eligibilityResult.value = null
  eligibilityForm.engineerId = null
  eligibilityForm.workOrderType = ''
  eligibilityVisible.value = true
  if (!engineers.value.length) {
    engineers.value = await getEngineers().catch(() => [])
  }
}

async function checkEligibility() {
  if (!eligibilityForm.engineerId || !eligibilityForm.workOrderType) {
    notify.warning('请选择维修工与工单类型')
    return
  }
  checking.value = true
  try {
    eligibilityResult.value = await getCertificateEligibility(eligibilityForm)
  } catch (e) {
    eligibilityResult.value = null
  } finally {
    checking.value = false
  }
}

onMounted(() => {
  loadCerts()
  loadTags()
  loadMappings()
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
  margin-left: 6px;
}
.tag {
  margin-left: 4px;
}
.expired {
  color: var(--el-color-danger);
}
.images {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  flex-wrap: wrap;
}
.thumb {
  width: 84px;
  height: 84px;
  border-radius: 6px;
}
.timeline {
  margin-top: 16px;
}
.timeline-title {
  font-weight: 600;
  margin-bottom: 10px;
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
