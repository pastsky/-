<template>
  <el-card>
    <div class="header">
      <div>
        <span class="title">电梯巡检公示</span>
        <span class="sub">本小区电梯最近一次巡检结果，异常状态请在报修时说明</span>
      </div>
      <el-button @click="loadData">刷新</el-button>
    </div>

    <ListError :failed="loadError" :loading="loading" @retry="loadData" />

    <el-table v-if="!loadError" v-loading="loading" :data="list">
      <el-table-column prop="elevatorNo" label="电梯编号" width="160" />
      <el-table-column prop="lastInspectionTime" label="最近巡检时间" width="190">
        <template #default="{ row }">{{ row.lastInspectionTime || '暂无巡检记录' }}</template>
      </el-table-column>
      <el-table-column label="巡检状态" width="120">
        <template #default="{ row }">
          <el-tag :type="STATUS_TAG[row.overallStatus] || 'info'" size="small">
            {{ STATUS_MAP[row.overallStatus] || '未知' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="说明" min-width="200">
        <template #default="{ row }">
          <span class="sub">
            {{ row.overallStatus === 'ABNORMAL' ? '存在异常点位，物业已转工单处理' : row.overallStatus === 'UNKNOWN' ? '尚无巡检数据' : '巡检正常' }}
          </span>
        </template>
      </el-table-column>
    </el-table>

    <el-empty v-if="!loadError && !loading && !list.length" description="暂无电梯巡检公示" />
  </el-card>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { getInspectionOverview } from '@/api/inspection'
import ListError from '@/components/ListError.vue'

const STATUS_MAP = { NORMAL: '正常', ABNORMAL: '异常', UNKNOWN: '未巡检' }
const STATUS_TAG = { NORMAL: 'success', ABNORMAL: 'danger', UNKNOWN: 'info' }

const loading = ref(false)
const loadError = ref(false)
const list = ref([])

async function loadData() {
  loading.value = true
  loadError.value = false
  try {
    const data = await getInspectionOverview()
    list.value = data.list
  } catch (e) {
    loadError.value = true
    list.value = []
  } finally {
    loading.value = false
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
