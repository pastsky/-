<template>
  <el-row :gutter="16">
    <el-col :span="10">
      <el-card>
        <template #header>发布广播</template>
        <el-form ref="formRef" :model="form" :rules="rules" label-width="92px">
          <el-form-item label="标题" prop="title">
            <el-input v-model="form.title" placeholder="如：11 月电梯年检安排" />
          </el-form-item>
          <el-form-item label="内容" prop="content">
            <el-input v-model="form.content" type="textarea" :rows="4" placeholder="广播正文" />
          </el-form-item>
          <el-form-item label="接收范围">
            <el-radio-group v-model="form.targetScope">
              <el-radio v-for="o in NOTIFICATION_SCOPE_OPTIONS" :key="o.value" :value="o.value">
                {{ o.label }}
              </el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item v-if="form.targetScope === 'ROLE'" label="目标角色" prop="targetRole">
            <el-select v-model="form.targetRole" placeholder="选择角色" style="width: 100%">
              <el-option v-for="o in ROLE_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
            </el-select>
          </el-form-item>
          <el-form-item v-if="form.targetScope === 'BRANCH'" label="目标小区" prop="branchId">
            <el-select v-model="form.branchId" placeholder="选择小区" style="width: 100%">
              <el-option v-for="c in communities" :key="c.id" :label="c.name" :value="c.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="类型">
            <el-select v-model="form.type" style="width: 100%">
              <el-option label="公告" value="ANNOUNCEMENT" />
              <el-option label="维保进度" value="MAINT_PROGRESS" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="submitting" @click="handleSubmit">发布</el-button>
            <el-button @click="resetForm">重置</el-button>
          </el-form-item>
        </el-form>
      </el-card>
    </el-col>

    <el-col :span="14">
      <el-card>
        <template #header>已发布记录</template>
        <ListError :failed="loadError" :loading="loading" @retry="loadHistory" />
        <el-table v-if="!loadError" v-loading="loading" :data="history">
          <el-table-column prop="title" label="标题" min-width="150" show-overflow-tooltip />
          <el-table-column label="范围" width="120">
            <template #default="{ row }">
              {{ NOTIFICATION_SCOPE_MAP[row.targetScope] }}
              <span v-if="row.targetRole" class="sub">（{{ ROLE_MAP[row.targetRole] }}）</span>
              <span v-else-if="row.branchId" class="sub">（{{ communityName(row.branchId) }}）</span>
            </template>
          </el-table-column>
          <el-table-column label="类型" width="100">
            <template #default="{ row }">
              {{ NOTIFICATION_TYPE_MAP[row.type] || row.type }}
            </template>
          </el-table-column>
          <el-table-column prop="delivered" label="送达" width="70" />
          <el-table-column prop="createdAt" label="时间" width="165" />
        </el-table>
      </el-card>
    </el-col>
  </el-row>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { notify } from '@/utils/notify'
import { broadcastNotification, getBroadcastList } from '@/api/notification'
import { getCommunities } from '@/api/basedata'
import ListError from '@/components/ListError.vue'
import {
  ROLE_MAP,
  ROLE_OPTIONS,
  NOTIFICATION_SCOPE_MAP,
  NOTIFICATION_SCOPE_OPTIONS,
  NOTIFICATION_TYPE_MAP
} from '@/utils/dict'

const formRef = ref()
const submitting = ref(false)
const loading = ref(false)
const loadError = ref(false)
const history = ref([])
const communities = ref([])

const form = reactive({
  title: '',
  content: '',
  targetScope: 'ALL',
  targetRole: '',
  branchId: null,
  type: 'ANNOUNCEMENT'
})

const rules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  content: [{ required: true, message: '请输入内容', trigger: 'blur' }],
  targetRole: [{ required: true, message: '请选择目标角色', trigger: 'change' }],
  branchId: [{ required: true, message: '请选择目标小区', trigger: 'change' }]
}

function communityName(id) {
  return communities.value.find((c) => c.id === id)?.name || id
}

// 后端通知类型枚举无 BROADCAST，广播类通知按下列类型过滤
const BROADCAST_TYPES = ['ANNOUNCEMENT', 'MAINT_PROGRESS', 'BROADCAST']

async function loadHistory() {
  loading.value = true
  loadError.value = false
  try {
    const data = await getBroadcastList()
    const list = Array.isArray(data) ? data : data?.list || []
    history.value = list.filter((n) => !n.type || BROADCAST_TYPES.includes(n.type))
  } catch (e) {
    loadError.value = true
  } finally {
    loading.value = false
  }
}

async function handleSubmit() {
  await formRef.value.validate()
  submitting.value = true
  try {
    const data = await broadcastNotification({
      title: form.title,
      content: form.content,
      targetScope: form.targetScope,
      targetRole: form.targetScope === 'ROLE' ? form.targetRole : undefined,
      branchId: form.targetScope === 'BRANCH' ? form.branchId : undefined,
      type: form.type
    })
    notify.success(`发布成功，送达 ${data.delivered} 人`)
    resetForm()
    loadHistory()
  } finally {
    submitting.value = false
  }
}

function resetForm() {
  form.title = ''
  form.content = ''
  form.targetScope = 'ALL'
  form.targetRole = ''
  form.branchId = null
  form.type = 'ANNOUNCEMENT'
}

onMounted(async () => {
  // 字典加载失败不得阻断历史列表
  loadHistory()
  try {
    communities.value = await getCommunities()
  } catch (e) {
    communities.value = []
  }
})
</script>

<style scoped>
.sub {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
</style>
