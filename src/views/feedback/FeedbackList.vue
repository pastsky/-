<template>
  <el-card>
    <el-form :inline="true" class="filter">
      <el-form-item label="状态">
        <el-select v-model="query.status" clearable placeholder="全部" style="width: 120px">
          <el-option
            v-for="o in FEEDBACK_STATUS_OPTIONS"
            :key="o.value"
            :label="o.label"
            :value="o.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="工单ID">
        <el-input v-model="query.orderId" placeholder="按工单 ID 精确查" clearable style="width: 160px" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="handleSearch">查询</el-button>
        <el-button @click="handleReset">重置</el-button>
      </el-form-item>
    </el-form>

    <el-table v-loading="loading" :data="list">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="orderNo" label="工单号" width="160" />
      <el-table-column prop="orderTitle" label="工单标题" min-width="160" show-overflow-tooltip />
      <el-table-column prop="reporterName" label="反馈人" width="100" />
      <el-table-column prop="content" label="反馈内容" min-width="220" show-overflow-tooltip />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="FEEDBACK_STATUS_TAG[row.status]" size="small">
            {{ FEEDBACK_STATUS_MAP[row.status] }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="handlerName" label="处理人" width="100">
        <template #default="{ row }">{{ row.handlerName || '—' }}</template>
      </el-table-column>
      <el-table-column prop="createdAt" label="提交时间" width="165" />
      <el-table-column label="操作" width="110" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openDetail(row)">
            {{ row.status === 'SUBMITTED' ? '处理' : '查看' }}
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
      @current-change="loadData"
    />

    <el-dialog v-model="detailVisible" title="反馈详情" width="560px">
      <el-descriptions :column="1" border>
        <el-descriptions-item label="工单">
          {{ detail.orderNo }} · {{ detail.orderTitle }}
          <span class="sub">（{{ detail.orderStatus }}）</span>
        </el-descriptions-item>
        <el-descriptions-item label="反馈人">{{ detail.reporterName }}</el-descriptions-item>
        <el-descriptions-item label="内容">{{ detail.content }}</el-descriptions-item>
        <el-descriptions-item v-if="detail.images?.length" label="图片">
          <el-image
            v-for="(img, i) in detail.images"
            :key="i"
            :src="img"
            :preview-src-list="detail.images"
            :initial-index="i"
            fit="cover"
            class="thumb"
          />
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          {{ FEEDBACK_STATUS_MAP[detail.status] }}
        </el-descriptions-item>
        <el-descriptions-item v-if="detail.resolveRemark" label="处理说明">
          {{ detail.resolveRemark }}
          <span class="sub">{{ detail.handledAt }}</span>
        </el-descriptions-item>
      </el-descriptions>

      <el-form v-if="detail.status === 'SUBMITTED'" label-width="80px" class="resolve">
        <el-form-item label="处理说明" required>
          <el-input v-model="resolveRemark" type="textarea" placeholder="说明处理结果，必填" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
        <el-button
          v-if="detail.status === 'SUBMITTED'"
          type="primary"
          :loading="submitting"
          @click="handleResolve"
        >
          标记已处理
        </el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { getFeedbackList, getFeedbackDetail, resolveFeedback } from '@/api/feedback'
import {
  FEEDBACK_STATUS_MAP,
  FEEDBACK_STATUS_TAG,
  FEEDBACK_STATUS_OPTIONS
} from '@/utils/dict'

const loading = ref(false)
const submitting = ref(false)
const list = ref([])
const total = ref(0)
const query = reactive({ page: 1, pageSize: 20, status: '', orderId: '' })

const detailVisible = ref(false)
const detail = ref({})
const resolveRemark = ref('')

async function loadData() {
  loading.value = true
  try {
    const data = await getFeedbackList({
      page: query.page,
      pageSize: query.pageSize,
      status: query.status || undefined,
      orderId: query.orderId || undefined
    })
    list.value = data.list
    total.value = data.total
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  query.page = 1
  loadData()
}

function handleReset() {
  query.status = ''
  query.orderId = ''
  query.page = 1
  loadData()
}

async function openDetail(row) {
  detail.value = await getFeedbackDetail(row.id)
  resolveRemark.value = ''
  detailVisible.value = true
}

async function handleResolve() {
  if (!resolveRemark.value.trim()) {
    ElMessage.warning('请填写处理说明')
    return
  }
  submitting.value = true
  try {
    await resolveFeedback(detail.value.id, { resolveRemark: resolveRemark.value })
    ElMessage.success('已标记处理')
    detailVisible.value = false
    loadData()
  } finally {
    submitting.value = false
  }
}

onMounted(loadData)
</script>

<style scoped>
.filter {
  margin-bottom: 4px;
}
.sub {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  margin-left: 6px;
}
.thumb {
  width: 64px;
  height: 64px;
  border-radius: 6px;
  margin-right: 6px;
}
.resolve {
  margin-top: 16px;
}
.pagination {
  margin-top: 16px;
  justify-content: flex-end;
}
</style>
