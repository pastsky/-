<template>
  <div>
    <el-card class="section">
      <template #header>创建导出任务</template>
      <el-form :inline="true" :model="form" class="form">
        <el-form-item label="报表">
          <el-select v-model="form.reportType" style="width: 170px" @change="syncFormats">
            <el-option
              v-for="o in REPORT_TYPE_OPTIONS"
              :key="o.value"
              :label="o.label"
              :value="o.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="格式">
          <el-select v-model="form.format" style="width: 120px">
            <el-option
              v-for="f in availableFormats"
              :key="f"
              :label="EXPORT_FORMAT_MAP[f]"
              :value="f"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="日期">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            value-format="YYYY-MM-DD"
            range-separator="至"
            start-placeholder="开始"
            end-placeholder="结束"
            style="width: 240px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="creating" @click="handleCreate">提交导出</el-button>
        </el-form-item>
      </el-form>
      <div class="sub">
        异步生成，完成后站内通知下发下载链接，文件保留 7 天；PDF 仅支持总览/维修工绩效/班组统计，PNG 仅总览/班组统计且最多 200 行。
      </div>
    </el-card>

    <el-card>
      <template #header>
        <div class="card-header">
          <span>导出任务</span>
          <div class="ops">
            <el-select v-model="query.status" clearable placeholder="全部状态" size="small" style="width: 130px" @change="loadList">
              <el-option
                v-for="(label, value) in EXPORT_STATUS_MAP"
                :key="value"
                :label="label"
                :value="value"
              />
            </el-select>
            <el-button link type="primary" @click="loadList">刷新</el-button>
          </div>
        </div>
      </template>
      <ListError :failed="loadError" :loading="loading" @retry="loadList" />
      <el-table v-if="!loadError" v-loading="loading" :data="list">
        <el-table-column prop="jobNo" label="任务号" width="170" />
        <el-table-column label="报表" width="150">
          <template #default="{ row }">{{ REPORT_TYPE_MAP[row.reportType] || row.reportType }}</template>
        </el-table-column>
        <el-table-column label="格式" width="90">
          <template #default="{ row }">{{ EXPORT_FORMAT_MAP[row.format] || row.format }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="EXPORT_STATUS_TAG[row.status] || 'info'" size="small">
              {{ EXPORT_STATUS_MAP[row.status] || row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="rowCount" label="行数" width="90" />
        <el-table-column label="文件大小" width="100">
          <template #default="{ row }">{{ formatSize(row.fileSize) }}</template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="165" />
        <el-table-column label="过期" width="165">
          <template #default="{ row }">{{ row.expireAt || '—' }}</template>
        </el-table-column>
        <el-table-column prop="errorMessage" label="失败原因" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">{{ row.errorMessage || '—' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 'SUCCESS'"
              link
              type="primary"
              @click="handleDownload(row)"
            >
              下载
            </el-button>
            <span v-else class="sub">—</span>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        class="pagination"
        v-model:current-page="query.page"
        v-model:page-size="query.pageSize"
        :total="total"
        layout="total, prev, pager, next"
        @current-change="loadList"
      />
    </el-card>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { notify } from '@/utils/notify'
import { createExportJob, getExportList, downloadExport } from '@/api/export'
import ListError from '@/components/ListError.vue'
import {
  REPORT_TYPE_MAP,
  REPORT_TYPE_OPTIONS,
  EXPORT_FORMAT_MAP,
  EXPORT_FORMAT_MATRIX,
  EXPORT_STATUS_MAP,
  EXPORT_STATUS_TAG
} from '@/utils/dict'

const creating = ref(false)
const loading = ref(false)
const loadError = ref(false)
const list = ref([])
const total = ref(0)
const dateRange = ref([])
const form = reactive({ reportType: 'WORK_ORDER', format: 'EXCEL' })
const query = reactive({ page: 1, pageSize: 20, status: '' })

let timer = null

const availableFormats = computed(() => {
  const allowed = EXPORT_FORMAT_MATRIX[form.format] || []
  return Object.keys(EXPORT_FORMAT_MAP).filter((f) => allowed.includes(form.reportType))
})

function syncFormats() {
  const allowed = EXPORT_FORMAT_MATRIX[form.format] || []
  if (!allowed.includes(form.reportType)) {
    form.format = allowed[0] || 'EXCEL'
  }
}

function extOf(format) {
  return { EXCEL: 'xlsx', CSV: 'csv', PDF: 'pdf', PNG: 'png' }[format] || 'dat'
}

function formatSize(size) {
  if (!size) return '—'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(2)} MB`
}

async function loadList() {
  loading.value = true
  loadError.value = false
  try {
    const data = await getExportList({
      status: query.status || undefined,
      page: query.page,
      pageSize: query.pageSize
    })
    list.value = data.list
    total.value = data.total
    // 有进行中的任务时轮询
    const running = data.list.some((j) => ['QUEUED', 'RUNNING'].includes(j.status))
    if (running && !timer) {
      timer = setTimeout(() => {
        timer = null
        loadList()
      }, 3000)
    }
  } catch (e) {
    loadError.value = true
  } finally {
    loading.value = false
  }
}

async function handleCreate() {
  creating.value = true
  try {
    const job = await createExportJob({
      reportType: form.reportType,
      format: form.format,
      startDate: dateRange.value?.[0] || undefined,
      endDate: dateRange.value?.[1] || undefined
    })
    notify.success(`导出任务已提交（${job.jobNo}）`)
    await loadList()
  } finally {
    creating.value = false
  }
}

async function handleDownload(row) {
  const blob = await downloadExport(row.id)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${row.jobNo}.${extOf(row.format)}`
  a.click()
  URL.revokeObjectURL(url)
}

onMounted(loadList)
onUnmounted(() => {
  if (timer) clearTimeout(timer)
})
</script>

<style scoped>
.section {
  margin-bottom: 16px;
}
.form {
  margin-bottom: 0;
}
.sub {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.7;
}
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.ops {
  display: flex;
  gap: 8px;
  align-items: center;
}
.pagination {
  margin-top: 12px;
  justify-content: flex-end;
}
</style>
