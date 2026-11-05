<template>
  <el-card>
    <div class="header">
      <div>
        <span class="title">调度任务</span>
        <span class="sub">定时任务实时状态；<code>lastRun*</code> 为内存态，重启后清空。手工触发为同步执行，可用于补偿。</span>
      </div>
      <el-button @click="loadData">刷新</el-button>
    </div>

    <ListError :failed="loadError" :loading="loading" @retry="loadData" />

    <el-table v-if="!loadError" v-loading="loading" :data="list">
      <el-table-column prop="jobCode" label="任务编码" width="220" />
      <el-table-column prop="name" label="名称" min-width="180" show-overflow-tooltip />
      <el-table-column prop="cron" label="Cron" width="150" />
      <el-table-column label="启用" width="90">
        <template #default="{ row }">
          <el-tag size="small" :type="row.enabled ? 'success' : 'info'">
            {{ row.enabled ? '启用' : '暂停' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="lastRunAt" label="上次执行" width="180">
        <template #default="{ row }">{{ row.lastRunAt || '—' }}</template>
      </el-table-column>
      <el-table-column label="上次结果" min-width="150">
        <template #default="{ row }">
          <el-tag v-if="row.lastResult" size="small" :type="resultTag(row.lastResult)">
            {{ row.lastResult }}
          </el-tag>
          <span v-else class="sub">—</span>
          <span v-if="row.lastProcessed != null" class="sub">（处理 {{ row.lastProcessed }} 条）</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="110" fixed="right">
        <template #default="{ row }">
          <el-button
            link
            type="primary"
            :loading="runningCode === row.jobCode"
            @click="handleRun(row)"
          >
            立即执行
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="resultVisible" title="执行结果" width="460px">
      <el-descriptions :column="1" border>
        <el-descriptions-item label="任务">{{ runResult.jobCode }}</el-descriptions-item>
        <el-descriptions-item label="处理">{{ runResult.processed ?? 0 }} 条</el-descriptions-item>
        <el-descriptions-item label="成功">{{ runResult.succeeded ?? 0 }} 条</el-descriptions-item>
        <el-descriptions-item label="失败">{{ runResult.failed ?? 0 }} 条</el-descriptions-item>
        <el-descriptions-item label="耗时">{{ runResult.durationMs ?? 0 }} ms</el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button type="primary" @click="resultVisible = false">知道了</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { ElMessageBox } from 'element-plus'
import { notify } from '@/utils/notify'
import { getScheduleJobs, runScheduleJob } from '@/api/schedule'
import ListError from '@/components/ListError.vue'

const loading = ref(false)
const loadError = ref(false)
const list = ref([])
const runningCode = ref(null)
const resultVisible = ref(false)
const runResult = ref({})

function resultTag(result) {
  const text = String(result).toUpperCase()
  if (text.includes('SUCCESS') || text.includes('OK')) return 'success'
  if (text.includes('FAIL')) return 'danger'
  return 'info'
}

async function loadData() {
  loading.value = true
  loadError.value = false
  try {
    list.value = await getScheduleJobs()
  } catch (e) {
    loadError.value = true
    list.value = []
  } finally {
    loading.value = false
  }
}

async function handleRun(row) {
  try {
    await ElMessageBox.confirm(`确认立即执行「${row.name || row.jobCode}」？将同步执行一次。`, '手动触发')
  } catch (e) {
    return
  }
  runningCode.value = row.jobCode
  try {
    runResult.value = await runScheduleJob(row.jobCode)
    resultVisible.value = true
    notify.success('执行完成')
    loadData()
  } catch (e) {
    // 1001/5000 由拦截器提示
  } finally {
    runningCode.value = null
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
</style>
