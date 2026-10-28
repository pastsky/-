<template>
  <el-card>
    <el-form :inline="true" :model="query" class="filter">
      <el-form-item label="状态">
        <el-select v-model="query.status" placeholder="全部" clearable style="width: 120px">
          <el-option
            v-for="o in WORK_ORDER_STATUS_OPTIONS"
            :key="o.value"
            :label="o.label"
            :value="o.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="类型">
        <el-select v-model="query.type" placeholder="全部" clearable style="width: 120px">
          <el-option
            v-for="o in WORK_ORDER_TYPE_OPTIONS"
            :key="o.value"
            :label="o.label"
            :value="o.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="优先级">
        <el-select v-model="query.priority" placeholder="全部" clearable style="width: 120px">
          <el-option
            v-for="o in WORK_ORDER_PRIORITY_OPTIONS"
            :key="o.value"
            :label="o.label"
            :value="o.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="关键字">
        <el-input v-model="query.keyword" placeholder="工单号 / 标题" clearable style="width: 180px" />
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
        <el-button type="primary" @click="handleSearch">查询</el-button>
        <el-button @click="handleReset">重置</el-button>
      </el-form-item>
    </el-form>

    <div class="toolbar">
      <el-button v-if="canCreate" type="primary" @click="goCreate">新建工单</el-button>
    </div>

    <el-table v-loading="loading" :data="list" class="table" @row-click="goDetail">
      <el-table-column prop="orderNo" label="工单号" width="170" />
      <el-table-column prop="title" label="标题" min-width="180" show-overflow-tooltip />
      <el-table-column prop="location" label="位置" width="140" show-overflow-tooltip />
      <el-table-column label="类型" width="90">
        <template #default="{ row }">{{ WORK_ORDER_TYPE_MAP[row.type] }}</template>
      </el-table-column>
      <el-table-column label="优先级" width="90">
        <template #default="{ row }">
          <el-tag :type="WORK_ORDER_PRIORITY_TAG[row.priority]" size="small">
            {{ WORK_ORDER_PRIORITY_MAP[row.priority] }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="WORK_ORDER_STATUS_TAG[row.status]" size="small">
            {{ WORK_ORDER_STATUS_MAP[row.status] }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="reporterName" label="报修人" width="100" />
      <el-table-column prop="assigneeName" label="处理人" width="100" />
      <el-table-column prop="createdAt" label="创建时间" width="170" />
      <el-table-column label="操作" width="80" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click.stop="goDetail(row)">详情</el-button>
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
  </el-card>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getWorkOrderList } from '@/api/workOrder'
import { useUserStore } from '@/stores/user'
import {
  WORK_ORDER_STATUS_OPTIONS,
  WORK_ORDER_STATUS_MAP,
  WORK_ORDER_STATUS_TAG,
  WORK_ORDER_TYPE_OPTIONS,
  WORK_ORDER_TYPE_MAP,
  WORK_ORDER_PRIORITY_OPTIONS,
  WORK_ORDER_PRIORITY_MAP,
  WORK_ORDER_PRIORITY_TAG
} from '@/utils/dict'

const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const list = ref([])
const total = ref(0)
const dateRange = ref([])
const query = reactive({
  page: 1,
  pageSize: 20,
  status: '',
  type: '',
  priority: '',
  keyword: ''
})

const canCreate = computed(() => ['RESIDENT', 'ADMIN'].includes(userStore.role))

function buildParams() {
  return {
    page: query.page,
    pageSize: query.pageSize,
    status: query.status || undefined,
    type: query.type || undefined,
    priority: query.priority || undefined,
    keyword: query.keyword || undefined,
    startDate: dateRange.value?.[0] || undefined,
    endDate: dateRange.value?.[1] || undefined
  }
}

async function loadData() {
  loading.value = true
  try {
    const data = await getWorkOrderList(buildParams())
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
  query.type = ''
  query.priority = ''
  query.keyword = ''
  dateRange.value = []
  query.page = 1
  loadData()
}

function goCreate() {
  router.push('/work-orders/create')
}

function goDetail(row) {
  router.push(`/work-orders/${row.id}`)
}

onMounted(loadData)
</script>

<style scoped>
.filter {
  margin-bottom: 4px;
}
.toolbar {
  margin-bottom: 12px;
}
.table {
  cursor: pointer;
}
.pagination {
  margin-top: 16px;
  justify-content: flex-end;
}
</style>
