<template>
  <el-card>
    <div class="header">
      <div>
        <span class="title">维保任务池</span>
        <span class="sub">池内任务可直接抢单；抢单占用当前在途额度，需满足值班与持证要求</span>
      </div>
      <div class="ops">
        <el-select v-model="query.status" placeholder="全部状态" clearable style="width: 130px" @change="loadData">
          <el-option v-for="(label, value) in MAINT_STATUS_MAP" :key="value" :label="label" :value="value" />
        </el-select>
        <el-button @click="loadData">刷新</el-button>
      </div>
    </div>

    <ListError :failed="loadError" :loading="loading" @retry="loadData" />

    <el-table v-if="!loadError" v-loading="loading" :data="list">
      <el-table-column prop="taskNo" label="任务号" width="160" />
      <el-table-column prop="elevatorNo" label="电梯" width="140" />
      <el-table-column prop="planName" label="所属计划" min-width="150" show-overflow-tooltip />
      <el-table-column prop="scheduledTime" label="计划时间" width="165" />
      <el-table-column prop="branchName" label="小区" width="130" show-overflow-tooltip>
        <template #default="{ row }">{{ row.branchName || '—' }}</template>
      </el-table-column>
      <el-table-column label="状态" width="110">
        <template #default="{ row }">
          <el-tag :type="MAINT_STATUS_TAG[row.status] || 'info'" size="small">
            {{ MAINT_STATUS_MAP[row.status] || row.status }}
          </el-tag>
          <el-tag v-if="row.overdue" size="small" type="danger" class="tag">逾期</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="110" fixed="right">
        <template #default="{ row }">
          <el-button
            type="primary"
            size="small"
            :loading="grabbingId === row.id"
            @click="handleGrab(row)"
          >
            抢单
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-empty v-if="!loadError && !loading && !list.length" description="任务池暂无待抢任务" />

    <el-pagination
      class="pagination"
      v-model:current-page="query.page"
      v-model:page-size="query.pageSize"
      :total="total"
      layout="total, prev, pager, next"
      @current-change="loadData"
    />
  </el-card>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessageBox } from 'element-plus'
import { notify } from '@/utils/notify'
import { getMaintenanceTaskPool, grabMaintenanceTask } from '@/api/maintenance'
import ListError from '@/components/ListError.vue'
import { MAINT_STATUS_MAP, MAINT_STATUS_TAG } from '@/utils/dict'

const loading = ref(false)
const loadError = ref(false)
const list = ref([])
const total = ref(0)
const grabbingId = ref(null)
const query = reactive({ page: 1, pageSize: 20, status: '' })

async function loadData() {
  loading.value = true
  loadError.value = false
  try {
    const data = await getMaintenanceTaskPool({
      page: query.page,
      pageSize: query.pageSize,
      status: query.status || undefined
    })
    list.value = data.list
    total.value = data.total
  } catch (e) {
    loadError.value = true
    list.value = []
  } finally {
    loading.value = false
  }
}

async function handleGrab(row) {
  try {
    await ElMessageBox.confirm(`确认抢单「${row.taskNo} · ${row.elevatorNo}」？`, '抢单确认')
  } catch (e) {
    return
  }
  grabbingId.value = row.id
  try {
    await grabMaintenanceTask(row.id)
    notify.success('抢单成功，任务已进入处理中')
    await loadData()
  } catch (e) {
    // 3000/3002 由拦截器提示，刷新列表
    await loadData()
  } finally {
    grabbingId.value = null
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
  gap: 10px;
}
.tag {
  margin-left: 4px;
}
.pagination {
  margin-top: 16px;
  justify-content: flex-end;
}
</style>
