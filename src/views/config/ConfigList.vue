<template>
  <el-card>
    <div class="header">
      <div>
        <span class="title">系统配置</span>
        <span class="sub">阈值与开关类配置；<code>editable=false</code> 的键只读</span>
      </div>
      <div class="ops">
        <el-input v-model="keyword" placeholder="键 / 说明" clearable style="width: 200px" />
        <el-button @click="loadData">刷新</el-button>
      </div>
    </div>

    <ListError :failed="loadError" :loading="loading" @retry="loadData" />

    <el-table v-if="!loadError" v-loading="loading" :data="filtered">
      <el-table-column prop="configKey" label="配置键" width="240">
        <template #default="{ row }">{{ row.configKey || row.key || row.id }}</template>
      </el-table-column>
      <el-table-column prop="configValue" label="当前值" min-width="200">
        <template #default="{ row }">
          <span class="value">{{ row.configValue ?? row.value ?? '—' }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="remark" label="说明" min-width="220" show-overflow-tooltip>
        <template #default="{ row }">{{ row.remark || '—' }}</template>
      </el-table-column>
      <el-table-column label="可编辑" width="90">
        <template #default="{ row }">
          <el-tag size="small" :type="isEditable(row) ? 'success' : 'info'">
            {{ isEditable(row) ? '是' : '否' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="90" fixed="right">
        <template #default="{ row }">
          <el-button v-if="isEditable(row)" link type="primary" @click="openEdit(row)">修改</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="editVisible" title="修改配置" width="520px">
      <el-form label-width="90px">
        <el-form-item label="配置键">
          <b>{{ current.configKey || current.key }}</b>
        </el-form-item>
        <el-form-item label="值" required>
          <el-input v-model="editValue" type="textarea" :rows="3" placeholder="请输入新的配置值" />
        </el-form-item>
        <el-form-item v-if="current.remark" label="说明">
          <span class="sub">{{ current.remark }}</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitEdit">保存</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { notify } from '@/utils/notify'
import { getConfigs, updateConfig } from '@/api/config'
import ListError from '@/components/ListError.vue'

const loading = ref(false)
const loadError = ref(false)
const submitting = ref(false)
const list = ref([])
const keyword = ref('')
const editVisible = ref(false)
const current = ref({})
const editValue = ref('')

const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return list.value
  return list.value.filter((row) =>
    `${row.configKey || row.key || ''} ${row.remark || ''}`.toLowerCase().includes(kw)
  )
})

function isEditable(row) {
  const v = row.editable ?? row.configEditable
  return v === true || v === 1 || v === '1' || v === 'true'
}

async function loadData() {
  loading.value = true
  loadError.value = false
  try {
    list.value = await getConfigs()
  } catch (e) {
    loadError.value = true
    list.value = []
  } finally {
    loading.value = false
  }
}

function openEdit(row) {
  current.value = row
  editValue.value = String(row.configValue ?? row.value ?? '')
  editVisible.value = true
}

async function submitEdit() {
  if (!editValue.value.trim()) {
    notify.warning('配置值不能为空')
    return
  }
  submitting.value = true
  try {
    await updateConfig(current.value.id, { value: editValue.value })
    notify.success('配置已更新')
    editVisible.value = false
    loadData()
  } catch (e) {
    // 1000/1002 由拦截器提示
  } finally {
    submitting.value = false
  }
}

onMounted(loadData)
</script>

<style scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
  gap: 12px;
  flex-wrap: wrap;
}
.title {
  font-size: 16px;
  font-weight: 600;
  margin-right: 8px;
}
.sub {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.ops {
  display: flex;
  align-items: center;
  gap: 8px;
}
.value {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
</style>
