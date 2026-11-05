<template>
  <el-card>
    <el-tabs v-model="tab">
      <el-tab-pane label="班组管理" name="teams">
        <div class="toolbar">
          <el-button v-if="isAdmin" type="primary" @click="openCreate">新建班组</el-button>
          <el-input v-model="keyword" placeholder="班组编码 / 名称" clearable style="width: 200px" @change="loadTeams" />
          <span class="sub">维修工只归属一个班组；未入组不影响指派与抢单，统计归「未分组」</span>
        </div>

        <el-table v-loading="teamLoading" :data="teams">
          <el-table-column prop="teamCode" label="班组编码" width="140" />
          <el-table-column prop="teamName" label="班组名称" width="160" />
          <el-table-column prop="memberCount" label="成员数" width="90" />
          <el-table-column label="状态" width="90">
            <template #default="{ row }">
              <el-tag :type="row.status === 'ACTIVE' ? 'success' : 'info'" size="small">
                {{ TEAM_STATUS_MAP[row.status] || row.status }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="remark" label="备注" min-width="160" show-overflow-tooltip>
            <template #default="{ row }">{{ row.remark || '—' }}</template>
          </el-table-column>
          <el-table-column label="操作" width="200" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openMembers(row)">成员</el-button>
              <el-button v-if="isAdmin" link type="primary" @click="openEdit(row)">编辑</el-button>
              <el-button v-if="isAdmin" link type="danger" @click="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="审计日志" name="audit">
        <el-form :inline="true" class="filter">
          <el-form-item label="业务类型">
            <el-select v-model="audit.bizType" clearable placeholder="全部" style="width: 130px">
              <el-option
                v-for="(label, value) in AUDIT_BIZ_TYPE_MAP"
                :key="value"
                :label="label"
                :value="value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="动作">
            <el-select v-model="audit.action" clearable placeholder="全部" style="width: 130px">
              <el-option
                v-for="(label, value) in AUDIT_ACTION_MAP"
                :key="value"
                :label="label"
                :value="value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="日期">
            <el-date-picker
              v-model="auditRange"
              type="daterange"
              value-format="YYYY-MM-DD"
              range-separator="至"
              start-placeholder="开始"
              end-placeholder="结束"
              style="width: 240px"
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="loadAudit">查询</el-button>
          </el-form-item>
        </el-form>

        <el-table v-loading="auditLoading" :data="auditList">
          <el-table-column prop="createdAt" label="时间" width="170" />
          <el-table-column label="业务" width="110">
            <template #default="{ row }">{{ AUDIT_BIZ_TYPE_MAP[row.bizType] || row.bizType }}</template>
          </el-table-column>
          <el-table-column prop="bizId" label="业务ID" width="90" />
          <el-table-column label="动作" width="110">
            <template #default="{ row }">{{ AUDIT_ACTION_MAP[row.action] || row.action }}</template>
          </el-table-column>
          <el-table-column prop="operatorName" label="操作人" width="110" />
          <el-table-column prop="remark" label="说明" min-width="180" show-overflow-tooltip>
            <template #default="{ row }">{{ row.remark || '—' }}</template>
          </el-table-column>
          <el-table-column label="变更前" min-width="140" show-overflow-tooltip>
            <template #default="{ row }">{{ row.beforeValue || '—' }}</template>
          </el-table-column>
          <el-table-column label="变更后" min-width="140" show-overflow-tooltip>
            <template #default="{ row }">{{ row.afterValue || '—' }}</template>
          </el-table-column>
        </el-table>
        <el-pagination
          class="pagination"
          v-model:current-page="audit.page"
          v-model:page-size="audit.pageSize"
          :total="auditTotal"
          :page-sizes="[20, 50, 100]"
          layout="total, sizes, prev, pager, next"
          @size-change="loadAudit"
          @current-change="loadAudit"
        />
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="formVisible" :title="isEdit ? '编辑班组' : '新建班组'" width="480px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="班组编码" prop="teamCode">
          <el-input v-model="form.teamCode" :disabled="isEdit" placeholder="唯一编码，如 T01" />
        </el-form-item>
        <el-form-item label="班组名称" prop="teamName">
          <el-input v-model="form.teamName" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="form.status" style="width: 100%">
            <el-option label="启用" value="ACTIVE" />
            <el-option label="停用" value="DISABLED" />
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

    <el-drawer v-model="memberVisible" :title="`班组成员 · ${currentTeam?.teamName || ''}`" size="480px">
      <el-select
        v-model="memberIds"
        multiple
        filterable
        placeholder="选择维修工（仅启用状态可入组）"
        style="width: 100%"
      >
        <el-option
          v-for="e in engineers"
          :key="e.id"
          :label="`${e.realName}（${e.groupName}）`"
          :value="e.id"
        />
      </el-select>
      <div class="sub">提交为全量覆盖；调组会写入审计日志</div>
      <div class="drawer-footer">
        <el-button @click="memberVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitMembers">保存成员</el-button>
      </div>
    </el-drawer>
  </el-card>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getTeamList,
  createTeam,
  updateTeam,
  deleteTeam,
  getTeamMembers,
  updateTeamMembers,
  getAuditLogs
} from '@/api/team'
import { getEngineers } from '@/api/user'
import { useUserStore } from '@/stores/user'
import { TEAM_STATUS_MAP, AUDIT_BIZ_TYPE_MAP, AUDIT_ACTION_MAP } from '@/utils/dict'

const userStore = useUserStore()
const isAdmin = computed(() => userStore.role === 'ADMIN')
const tab = ref('teams')
const keyword = ref('')
const teamLoading = ref(false)
const teams = ref([])

const formVisible = ref(false)
const isEdit = ref(false)
const editId = ref(null)
const formRef = ref()
const submitting = ref(false)
const form = reactive({ teamCode: '', teamName: '', status: 'ACTIVE', remark: '' })
const rules = {
  teamCode: [{ required: true, message: '请输入班组编码', trigger: 'blur' }],
  teamName: [{ required: true, message: '请输入班组名称', trigger: 'blur' }]
}

const memberVisible = ref(false)
const currentTeam = ref(null)
const memberIds = ref([])
const engineers = ref([])

const auditRange = ref([])
const auditLoading = ref(false)
const auditList = ref([])
const auditTotal = ref(0)
const audit = reactive({ page: 1, pageSize: 20, bizType: '', action: '' })

async function loadTeams() {
  teamLoading.value = true
  try {
    teams.value = await getTeamList({ keyword: keyword.value || undefined })
  } finally {
    teamLoading.value = false
  }
}

function openCreate() {
  isEdit.value = false
  editId.value = null
  Object.assign(form, { teamCode: '', teamName: '', status: 'ACTIVE', remark: '' })
  formVisible.value = true
}

function openEdit(row) {
  isEdit.value = true
  editId.value = row.id
  Object.assign(form, {
    teamCode: row.teamCode,
    teamName: row.teamName,
    status: row.status,
    remark: row.remark || ''
  })
  formVisible.value = true
}

async function submitForm() {
  await formRef.value.validate()
  submitting.value = true
  try {
    if (isEdit.value) {
      await updateTeam(editId.value, {
        teamName: form.teamName,
        status: form.status,
        remark: form.remark
      })
    } else {
      await createTeam(form)
    }
    ElMessage.success('保存成功')
    formVisible.value = false
    loadTeams()
  } finally {
    submitting.value = false
  }
}

async function handleDelete(row) {
  await ElMessageBox.confirm(`确认删除班组「${row.teamName}」？有成员引用时请改为停用。`, '删除确认', {
    type: 'warning'
  })
  try {
    await deleteTeam(row.id)
    ElMessage.success('已删除')
    loadTeams()
  } catch (e) {
    // 3002 等由拦截器提示
  }
}

async function openMembers(row) {
  currentTeam.value = row
  if (!engineers.value.length) engineers.value = await getEngineers()
  const members = await getTeamMembers(row.id)
  memberIds.value = members.map((m) => m.id)
  memberVisible.value = true
}

async function submitMembers() {
  submitting.value = true
  try {
    await updateTeamMembers(currentTeam.value.id, memberIds.value)
    ElMessage.success('成员已更新')
    memberVisible.value = false
    loadTeams()
  } finally {
    submitting.value = false
  }
}

async function loadAudit() {
  auditLoading.value = true
  try {
    const data = await getAuditLogs({
      page: audit.page,
      pageSize: audit.pageSize,
      bizType: audit.bizType || undefined,
      action: audit.action || undefined,
      startDate: auditRange.value?.[0] || undefined,
      endDate: auditRange.value?.[1] || undefined
    })
    auditList.value = data.list
    auditTotal.value = data.total
  } finally {
    auditLoading.value = false
  }
}

onMounted(async () => {
  loadTeams()
  loadAudit()
})
</script>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.sub {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 8px;
}
.filter {
  margin-bottom: 4px;
}
.drawer-footer {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.pagination {
  margin-top: 16px;
  justify-content: flex-end;
}
</style>
