<template>
  <el-card>
    <el-form :inline="true" :model="query" class="filter">
      <el-form-item label="关键字">
        <el-input v-model="query.keyword" placeholder="用户名 / 姓名 / 手机号" clearable style="width: 200px" />
      </el-form-item>
      <el-form-item label="角色">
        <el-select v-model="query.role" placeholder="全部" clearable style="width: 140px">
          <el-option v-for="o in ROLE_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="query.status" placeholder="全部" clearable style="width: 120px">
          <el-option v-for="o in USER_STATUS_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="handleSearch">查询</el-button>
        <el-button @click="handleReset">重置</el-button>
      </el-form-item>
    </el-form>

    <div class="toolbar">
      <el-button type="primary" @click="openCreate">新增用户</el-button>
      <span class="sub">停用为逻辑删除：保留历史工单归属，停用后不可登录、不可被指派</span>
    </div>

    <ListError :failed="loadError" :loading="loading" @retry="loadData" />
    <el-table v-if="!loadError" v-loading="loading" :data="list">
      <el-table-column prop="username" label="用户名" width="125" />
      <el-table-column prop="realName" label="姓名" width="110" />
      <el-table-column label="角色" width="120">
        <template #default="{ row }">{{ ROLE_MAP[row.role] }}</template>
      </el-table-column>
      <el-table-column prop="phone" label="手机号" width="125" />
      <el-table-column label="班组" width="100">
        <template #default="{ row }">{{ row.teamName || groupName(row.teamId || row.groupId) }}</template>
      </el-table-column>
      <el-table-column label="证书" width="150">
        <template #default="{ row }">
          <el-tag v-for="c in row.certs || []" :key="c.tagCode" size="small" class="tag">
            {{ CERT_TYPE_MAP[c.tagCode] || c.tagCode }}
          </el-tag>
          <span v-if="!(row.certs || []).length" class="sub">—</span>
        </template>
      </el-table-column>
      <el-table-column prop="address" label="地址" min-width="130" show-overflow-tooltip>
        <template #default="{ row }">{{ row.address || '—' }}</template>
      </el-table-column>
      <el-table-column label="状态" width="86">
        <template #default="{ row }">
          <el-tag :type="row.status === 'ACTIVE' ? 'success' : 'info'" size="small">
            {{ USER_STATUS_MAP[row.status] }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="创建时间" width="165" />
      <el-table-column label="操作" width="214" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button link type="warning" @click="openReset(row)">重置密码</el-button>
          <el-button v-if="row.status === 'ACTIVE'" link type="danger" @click="handleDisable(row)">
            停用
          </el-button>
          <el-button v-else link type="success" @click="handleEnable(row)">恢复</el-button>
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

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑用户' : '新增用户'" width="520px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="用户名" :error="errors.username">
          <el-input v-model="form.username" placeholder="登录账号" />
        </el-form-item>
        <el-form-item v-if="!isEdit" label="密码" :error="errors.password">
          <el-input v-model="form.password" placeholder="初始密码" />
        </el-form-item>
        <el-form-item label="姓名" :error="errors.realName">
          <el-input v-model="form.realName" placeholder="真实姓名" />
        </el-form-item>
        <el-form-item label="手机号" :error="errors.phone">
          <el-input v-model="form.phone" />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="form.email" />
        </el-form-item>
        <el-form-item label="小区">
          <el-select v-model="form.communityId" style="width: 100%">
            <el-option v-for="c in communities" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="地址">
          <div class="inline">
            <el-input v-model="form.building" placeholder="楼栋" />
            <el-input v-model="form.room" placeholder="房号" />
          </div>
        </el-form-item>
        <el-form-item label="角色" :error="errors.role">
          <el-select v-model="form.role" style="width: 100%">
            <el-option v-for="o in ROLE_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="isRepairerRole" label="班组">
          <el-select v-model="form.teamId" clearable placeholder="可不入组" style="width: 100%">
            <el-option v-for="g in groupList" :key="g.id" :label="g.name" :value="g.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="form.status" active-value="ACTIVE" inactive-value="DISABLED" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="resetVisible" title="重置密码" width="420px">
      <el-form label-width="80px">
        <el-form-item label="新密码">
          <el-input v-model="newPassword" placeholder="6-32 位字符" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="resetVisible = false">取消</el-button>
        <el-button type="primary" @click="submitReset">确定</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessageBox } from 'element-plus'
import { notify } from '@/utils/notify'
import { useZodForm } from '@/utils/useZodForm'
import { buildUserSchema } from '@/schemas/user'
import {
  getUserList,
  createUser,
  updateUser,
  disableUser,
  enableUser,
  resetPassword,
  getGroups
} from '@/api/user'
import { getCommunities } from '@/api/basedata'
import ListError from '@/components/ListError.vue'
import {
  ROLE_MAP,
  ROLE_OPTIONS,
  USER_STATUS_MAP,
  USER_STATUS_OPTIONS,
  CERT_TYPE_MAP,
  REPAIRER_ROLES
} from '@/utils/dict'

const loading = ref(false)
const loadError = ref(false)
const submitting = ref(false)
const list = ref([])
const total = ref(0)
const groups = ref([])
const communities = ref([])
const query = reactive({ page: 1, pageSize: 20, keyword: '', role: '', status: '' })

const dialogVisible = ref(false)
const resetVisible = ref(false)
const isEdit = ref(false)
const editId = ref(null)
const resetId = ref(null)
const newPassword = ref('')
const { errors, validate, clear } = useZodForm(() =>
  buildUserSchema({ requirePassword: !isEdit.value })
)
const form = reactive({
  username: '',
  password: '',
  realName: '',
  phone: '',
  email: '',
  building: '',
  room: '',
  communityId: 1,
  role: '',
  groupId: null,
  status: 'ACTIVE'
})

const isRepairerRole = computed(() => REPAIRER_ROLES.includes(form.role))

const groupList = groups

function groupName(id) {
  return groups.value.find((g) => g.id === id)?.name || '—'
}

function buildParams() {
  return {
    page: query.page,
    pageSize: query.pageSize,
    keyword: query.keyword || undefined,
    role: query.role || undefined,
    status: query.status || undefined
  }
}

async function loadData() {
  loading.value = true
  loadError.value = false
  try {
    const data = await getUserList(buildParams())
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
  query.role = ''
  query.status = ''
  query.page = 1
  loadData()
}

function resetForm() {
  Object.assign(form, {
    username: '',
    password: '',
    realName: '',
    phone: '',
    email: '',
    building: '',
    room: '',
    communityId: 1,
    role: '',
    teamId: null,
    status: 'ACTIVE'
  })
}

function openCreate() {
  isEdit.value = false
  editId.value = null
  resetForm()
  clear()
  dialogVisible.value = true
}

function openEdit(row) {
  isEdit.value = true
  editId.value = row.id
  clear()
  Object.assign(form, {
    username: row.username,
    password: '',
    realName: row.realName,
    phone: row.phone || '',
    email: row.email || '',
    building: row.building || '',
    room: row.room || '',
    communityId: row.communityId || 1,
    role: row.role,
    teamId: row.teamId || row.groupId || null,
    status: row.status
  })
  dialogVisible.value = true
}

async function handleSubmit() {
  if (!validate(form)) return
  const payload = {
    username: form.username,
    realName: form.realName,
    phone: form.phone,
    email: form.email,
    address: `${form.building || ''}${form.room || ''}`,
    building: form.building,
    room: form.room,
    communityId: form.communityId,
    role: form.role,
    teamId: isRepairerRole.value ? form.teamId : null,
    status: form.status
  }
  submitting.value = true
  try {
    if (isEdit.value) {
      await updateUser(editId.value, payload)
      notify.success('保存成功')
    } else {
      await createUser({ ...payload, password: form.password })
      notify.success('新增成功')
    }
    dialogVisible.value = false
    loadData()
  } finally {
    submitting.value = false
  }
}

function openReset(row) {
  resetId.value = row.id
  newPassword.value = ''
  resetVisible.value = true
}

async function submitReset() {
  if (!newPassword.value) {
    notify.warning('请输入新密码')
    return
  }
  await resetPassword(resetId.value, { password: newPassword.value })
  notify.success('密码已重置')
  resetVisible.value = false
}

async function handleDisable(row) {
  await ElMessageBox.confirm(
    `确认停用「${row.realName}」？停用后不可登录、不可被指派，历史工单保留。`,
    '停用确认',
    { type: 'warning' }
  )
  await disableUser(row.id)
  notify.success('已停用')
  loadData()
}

async function handleEnable(row) {
  await enableUser(row.id)
  notify.success('已恢复')
  loadData()
}

onMounted(async () => {
  // 字典与主列表解耦：班组/小区接口失败不影响用户列表
  loadData()
  const [gs, cs] = await Promise.all([
    getGroups().catch(() => []),
    getCommunities().catch(() => [])
  ])
  groups.value = gs
  communities.value = cs
})
</script>

<style scoped>
.filter {
  margin-bottom: 4px;
}
.toolbar {
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
}
.sub {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.tag {
  margin-right: 4px;
}
.inline {
  display: flex;
  gap: 8px;
  width: 100%;
}
.pagination {
  margin-top: 16px;
  justify-content: flex-end;
}
</style>
