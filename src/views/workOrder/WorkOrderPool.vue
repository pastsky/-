<template>
  <el-card>
    <div class="header">
      <div>
        <span class="title">待抢单池</span>
        <span class="sub">同一时刻仅可处理一单；抢单需满足持证、值班、无在途、无预约冲突</span>
      </div>
      <div class="ops">
        <el-select v-model="query.type" placeholder="全部类型" clearable style="width: 120px" @change="loadData">
          <el-option
            v-for="o in WORK_ORDER_TYPE_OPTIONS"
            :key="o.value"
            :label="o.label"
            :value="o.value"
          />
        </el-select>
        <el-select v-model="query.priority" placeholder="全部优先级" clearable style="width: 130px" @change="loadData">
          <el-option
            v-for="o in WORK_ORDER_PRIORITY_OPTIONS"
            :key="o.value"
            :label="o.label"
            :value="o.value"
          />
        </el-select>
        <el-switch
          v-model="showAll"
          active-text="查看全部小区"
          @change="loadData"
        />
        <el-button @click="loadData">刷新</el-button>
      </div>
    </div>

    <el-table v-loading="loading" :data="list" @row-click="goDetail">
      <el-table-column type="expand">
        <template #default="{ row }">
          <div class="expand">
            <span>报修人：{{ row.reporterName }}（{{ row.reporterPhone }}）</span>
            <span>位置：{{ row.location || '—' }}</span>
            <span>电梯：{{ row.elevatorNo || '—' }}</span>
            <span>预约：{{ formatAppointment(row.appointmentTime) }}</span>
            <span>入池时长：{{ row.waitHours }} 小时{{ row.waitHours >= 4 ? '（已超 4h，L0 升级）' : '' }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="orderNo" label="工单号" width="150" />
      <el-table-column prop="title" label="标题" min-width="180" show-overflow-tooltip />
      <el-table-column label="小区/楼栋" width="140">
        <template #default="{ row }">{{ row.location || '—' }}</template>
      </el-table-column>
      <el-table-column label="类型" width="80">
        <template #default="{ row }">{{ WORK_ORDER_TYPE_MAP[row.type] }}</template>
      </el-table-column>
      <el-table-column label="优先级" width="90">
        <template #default="{ row }">
          <el-tag :type="WORK_ORDER_PRIORITY_TAG[row.priority]" size="small">
            {{ WORK_ORDER_PRIORITY_MAP[row.priority] }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="预约" width="150">
        <template #default="{ row }">{{ formatAppointment(row.appointmentTime) }}</template>
      </el-table-column>
      <el-table-column label="标记" width="130">
        <template #default="{ row }">
          <el-tag v-if="row.myGroup" size="small" type="success">本组</el-tag>
          <el-tag v-if="row.waitHours >= 4" size="small" type="danger" class="tag">超时</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="150" fixed="right">
        <template #default="{ row }">
          <el-button
            v-if="canGrab"
            type="primary"
            size="small"
            :loading="grabbingId === row.id"
            @click.stop="handleGrab(row)"
          >
            抢单
          </el-button>
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
import { ElMessage, ElMessageBox } from 'element-plus'
import { getWorkOrderPool, grabWorkOrder } from '@/api/workOrder'
import { useUserStore } from '@/stores/user'
import {
  WORK_ORDER_TYPE_MAP,
  WORK_ORDER_TYPE_OPTIONS,
  WORK_ORDER_PRIORITY_MAP,
  WORK_ORDER_PRIORITY_TAG,
  WORK_ORDER_PRIORITY_OPTIONS,
  REPAIRER_ROLES,
  formatAppointment
} from '@/utils/dict'

const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const list = ref([])
const total = ref(0)
const showAll = ref(true)
const grabbingId = ref(null)
const query = reactive({ page: 1, pageSize: 20, type: '', priority: '' })

const canGrab = computed(() => REPAIRER_ROLES.includes(userStore.role))

async function loadData() {
  loading.value = true
  try {
    const data = await getWorkOrderPool({
      page: query.page,
      pageSize: query.pageSize,
      type: query.type || undefined,
      priority: query.priority || undefined,
      show_all: showAll.value
    })
    list.value = data.list
    total.value = data.total
  } finally {
    loading.value = false
  }
}

function goDetail(row) {
  router.push(`/work-orders/${row.id}`)
}

async function handleGrab(row) {
  try {
    await ElMessageBox.confirm(
      `确认抢单「${row.title}」？抢单后将占用你当前的在途额度。`,
      '抢单确认'
    )
  } catch (e) {
    return
  }
  grabbingId.value = row.id
  try {
    await grabWorkOrder(row.id)
    // 抢单后进入「待接单」，需在工单详情接单才开始计时处理
    ElMessage.success('抢单成功，请到工单详情接单')
    loadData()
  } catch (e) {
    // 失败原因（数据权限/无证/值班外/在途/预约冲突）由请求拦截器统一提示
    loadData()
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
.expand {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
  font-size: 13px;
  color: var(--el-text-color-regular);
  padding: 4px 12px;
}
.tag {
  margin-left: 4px;
}
.pagination {
  margin-top: 16px;
  justify-content: flex-end;
}
</style>
