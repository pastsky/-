<template>
  <el-card>
    <el-form :inline="true" :model="query" class="filter">
      <el-form-item label="关键字">
        <el-input v-model="query.keyword" placeholder="电梯编号 / 楼栋" clearable style="width: 180px" />
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="query.status" clearable placeholder="全部" style="width: 120px">
          <el-option
            v-for="o in ELEVATOR_STATUS_OPTIONS"
            :key="o.value"
            :label="o.label"
            :value="o.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="年检">
        <el-checkbox v-model="query.inspectOverdue">仅看超期未检</el-checkbox>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="handleSearch">查询</el-button>
        <el-button @click="handleReset">重置</el-button>
      </el-form-item>
    </el-form>

    <div class="toolbar">
      <el-button v-if="isAdmin" type="primary" @click="openCreate">新增电梯</el-button>
      <el-upload
        v-if="isAdmin"
        :show-file-list="false"
        :http-request="handleImport"
        accept=".xlsx"
      >
        <el-button>批量导入</el-button>
      </el-upload>
      <span class="sub">导入模板列：小区编码*、电梯编号、楼栋、单元、位置、品牌、型号、载重、安装日期、状态、备注</span>
    </div>

    <ListError :failed="loadError" :loading="loading" @retry="loadData" />
    <el-table v-if="!loadError" v-loading="loading" :data="list">
      <el-table-column prop="elevatorNo" label="电梯编号" width="150" />
      <el-table-column prop="branchName" label="小区" width="130" show-overflow-tooltip />
      <el-table-column label="位置" min-width="150" show-overflow-tooltip>
        <template #default="{ row }">{{ [row.building, row.unit, row.location].filter(Boolean).join(' ') || '—' }}</template>
      </el-table-column>
      <el-table-column prop="brand" label="品牌" width="100" />
      <el-table-column prop="model" label="型号" width="110" />
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="ELEVATOR_STATUS_TAG[row.status]" size="small">
            {{ ELEVATOR_STATUS_MAP[row.status] }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="下次年检" width="140">
        <template #default="{ row }">
          <span>{{ row.nextInspectDate || '—' }}</span>
          <el-tag v-if="row.inspectOverdue" size="small" type="danger" class="tag">超期</el-tag>
          <el-tag v-else-if="row.inspectNearExpire" size="small" type="warning" class="tag">
            {{ row.inspectDaysLeft }} 天
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="230" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openProfile(row)">档案</el-button>
          <el-button v-if="isAdmin" link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button v-if="isAdmin" link type="warning" @click="openInspect(row)">年检登记</el-button>
          <el-button v-if="isAdmin" link type="danger" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      class="pagination"
      v-model:current-page="query.page"
      v-model:page-size="query.pageSize"
      :total="total"
      :page-sizes="[10, 20, 50]"
      layout="total, sizes, prev, pager, next, jumper"
      @size-change="loadData"
      @current-change="loadData"
    />

    <!-- 新增 / 编辑 -->
    <el-dialog v-model="formVisible" :title="isEdit ? '编辑电梯' : '新增电梯'" width="560px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="小区" prop="branchId">
          <el-select v-model="form.branchId" style="width: 100%">
            <el-option v-for="c in communities" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="电梯编号">
          <el-input v-model="form.elevatorNo" placeholder="留空由系统按小区前缀生成" />
        </el-form-item>
        <el-form-item label="楼栋" prop="building">
          <el-input v-model="form.building" />
        </el-form-item>
        <el-form-item label="单元">
          <el-input v-model="form.unit" />
        </el-form-item>
        <el-form-item label="位置">
          <el-input v-model="form.location" />
        </el-form-item>
        <el-form-item label="品牌">
          <el-input v-model="form.brand" />
        </el-form-item>
        <el-form-item label="型号">
          <el-input v-model="form.model" />
        </el-form-item>
        <el-form-item label="载重(kg)">
          <el-input-number v-model="form.loadWeight" :min="0" style="width: 100%" />
        </el-form-item>
        <el-form-item label="安装日期">
          <el-date-picker v-model="form.installDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="form.status" style="width: 100%">
            <el-option
              v-for="o in ELEVATOR_STATUS_OPTIONS"
              :key="o.value"
              :label="o.label"
              :value="o.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>

    <!-- 年检登记 -->
    <el-dialog v-model="inspectVisible" title="年检登记" width="480px">
      <el-form label-width="100px">
        <el-form-item label="检验日期" required>
          <el-date-picker v-model="inspectForm.inspectDate" type="date" value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item label="下次检验" required>
          <el-date-picker v-model="inspectForm.nextInspectDate" type="date" value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item label="检验单位">
          <el-input v-model="inspectForm.inspectOrg" />
        </el-form-item>
        <el-form-item label="证明附件">
          <el-input v-model="inspectForm.certUrl" placeholder="上传后的文件 URL" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="inspectVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitInspect">保存</el-button>
      </template>
    </el-dialog>

    <!-- 档案聚合 -->
    <el-drawer v-model="profileVisible" :title="`电梯档案 · ${current?.elevatorNo || ''}`" size="640px">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="小区">{{ current?.branchName || '—' }}</el-descriptions-item>
        <el-descriptions-item label="状态">{{ ELEVATOR_STATUS_MAP[current?.status] }}</el-descriptions-item>
        <el-descriptions-item label="位置">
          {{ [current?.building, current?.unit, current?.location].filter(Boolean).join(' ') || '—' }}
        </el-descriptions-item>
        <el-descriptions-item label="下次年检">{{ current?.nextInspectDate || '—' }}</el-descriptions-item>
      </el-descriptions>
      <el-tabs v-model="profileTab" class="tabs" @tab-change="loadProfile">
        <el-tab-pane label="历史工单" name="WORK_ORDER" />
        <el-tab-pane label="维保记录" name="MAINTENANCE" />
        <el-tab-pane label="巡检记录" name="INSPECTION" />
      </el-tabs>
      <el-table v-loading="profileLoading" :data="profileList">
        <el-table-column prop="orderNo" label="单号" width="160" />
        <el-table-column prop="taskNo" label="任务号" width="160" />
        <el-table-column prop="title" label="标题" min-width="140" show-overflow-tooltip />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">{{ row.status }}</template>
        </el-table-column>
        <el-table-column prop="assigneeName" label="处理人" width="100" />
        <el-table-column prop="createdAt" label="时间" width="160">
          <template #default="{ row }">{{ row.createdAt || row.planDate || '—' }}</template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!profileList.length && !profileLoading" description="暂无记录" :image-size="60" />
    </el-drawer>
  </el-card>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessageBox } from 'element-plus'
import { notify } from '@/utils/notify'
import {
  getElevatorList,
  createElevator,
  updateElevator,
  deleteElevator,
  getElevatorProfile,
  inspectElevator,
  importElevators
} from '@/api/elevator'
import { getCommunities } from '@/api/basedata'
import ListError from '@/components/ListError.vue'
import { useUserStore } from '@/stores/user'
import {
  ELEVATOR_STATUS_MAP,
  ELEVATOR_STATUS_TAG,
  ELEVATOR_STATUS_OPTIONS
} from '@/utils/dict'

const userStore = useUserStore()
const isAdmin = computed(() => userStore.role === 'ADMIN')

const loading = ref(false)
const loadError = ref(false)
const submitting = ref(false)
const list = ref([])
const total = ref(0)
const communities = ref([])
const query = reactive({ page: 1, pageSize: 20, keyword: '', status: '', inspectOverdue: false })

const formVisible = ref(false)
const isEdit = ref(false)
const editId = ref(null)
const formRef = ref()
const form = reactive({
  branchId: 1,
  elevatorNo: '',
  building: '',
  unit: '',
  location: '',
  brand: '',
  model: '',
  loadWeight: 0,
  installDate: '',
  status: 'ACTIVE',
  remark: ''
})

const rules = {
  branchId: [{ required: true, message: '请选择小区', trigger: 'change' }],
  building: [{ required: true, message: '请输入楼栋', trigger: 'blur' }]
}

const inspectVisible = ref(false)
const inspectId = ref(null)
const inspectForm = reactive({ inspectDate: '', nextInspectDate: '', inspectOrg: '', certUrl: '' })

const profileVisible = ref(false)
const profileTab = ref('WORK_ORDER')
const profileLoading = ref(false)
const profileList = ref([])
const current = ref(null)

async function loadData() {
  loading.value = true
  loadError.value = false
  try {
    const data = await getElevatorList({
      page: query.page,
      pageSize: query.pageSize,
      keyword: query.keyword || undefined,
      status: query.status || undefined,
      inspectOverdue: query.inspectOverdue ? true : undefined
    })
    list.value = data.list
    total.value = data.total
  } catch (e) {
    loadError.value = true
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  query.page = 1
  loadData()
}

function handleReset() {
  query.keyword = ''
  query.status = ''
  query.inspectOverdue = false
  query.page = 1
  loadData()
}

function openCreate() {
  isEdit.value = false
  editId.value = null
  Object.assign(form, {
    branchId: communities.value[0]?.id || 1,
    elevatorNo: '',
    building: '',
    unit: '',
    location: '',
    brand: '',
    model: '',
    loadWeight: 0,
    installDate: '',
    status: 'ACTIVE',
    remark: ''
  })
  formVisible.value = true
}

function openEdit(row) {
  isEdit.value = true
  editId.value = row.id
  Object.assign(form, {
    branchId: row.branchId || 1,
    elevatorNo: row.elevatorNo || '',
    building: row.building || '',
    unit: row.unit || '',
    location: row.location || '',
    brand: row.brand || '',
    model: row.model || '',
    loadWeight: row.loadWeight || 0,
    installDate: row.installDate || '',
    status: row.status || 'ACTIVE',
    remark: row.remark || ''
  })
  formVisible.value = true
}

async function submitForm() {
  await formRef.value.validate()
  submitting.value = true
  try {
    if (isEdit.value) {
      await updateElevator(editId.value, form)
      notify.success('保存成功')
    } else {
      await createElevator(form)
      notify.success('新增成功')
    }
    formVisible.value = false
    loadData()
  } finally {
    submitting.value = false
  }
}

async function handleDelete(row) {
  await ElMessageBox.confirm(`确认删除电梯「${row.elevatorNo}」？有关联历史时请改为停用。`, '删除确认', {
    type: 'warning'
  })
  await deleteElevator(row.id)
  notify.success('已删除')
  loadData()
}

function openInspect(row) {
  inspectId.value = row.id
  Object.assign(inspectForm, {
    inspectDate: '',
    nextInspectDate: '',
    inspectOrg: '',
    certUrl: ''
  })
  inspectVisible.value = true
}

async function submitInspect() {
  if (!inspectForm.inspectDate || !inspectForm.nextInspectDate) {
    notify.warning('请填写检验日期与下次检验日期')
    return
  }
  submitting.value = true
  try {
    await inspectElevator(inspectId.value, inspectForm)
    inspectVisible.value = false
    notify.success('年检登记成功')
    loadData()
  } finally {
    submitting.value = false
  }
}

async function openProfile(row) {
  current.value = row
  profileTab.value = 'WORK_ORDER'
  profileVisible.value = true
  loadProfile()
}

async function loadProfile() {
  if (!current.value) return
  profileLoading.value = true
  try {
    const data = await getElevatorProfile(current.value.id, {
      tab: profileTab.value,
      page: 1,
      pageSize: 20
    })
    profileList.value = data.list
  } finally {
    profileLoading.value = false
  }
}

async function handleImport(options) {
  try {
    const result = await importElevators(options.file)
    const errors = (result.errors || [])
      .map((e) => `第 ${e.row} 行：${e.message}`)
      .join('\n')
    if (errors) {
      ElMessageBox.alert(errors, `导入完成：成功 ${result.successCount} 条，失败 ${result.failureCount} 条`, {
        type: 'warning'
      })
    } else {
      notify.success(`导入成功 ${result.successCount} 条`)
    }
    loadData()
  } catch (e) {
    // 错误由拦截器提示
  }
}

onMounted(async () => {
  // 字典与主列表解耦：小区接口失败不影响台账加载
  loadData()
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
.tabs {
  margin-top: 12px;
}
.pagination {
  margin-top: 16px;
  justify-content: flex-end;
}
</style>
