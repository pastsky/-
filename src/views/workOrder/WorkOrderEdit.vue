<template>
  <div>
    <el-page-header class="page-header" :content="isEdit ? '编辑工单' : '新建工单'" @back="$router.back()" />
    <el-card>
      <el-form :model="form" label-width="100px" style="max-width: 760px">
        <el-form-item label="标题" :error="errors.title">
          <el-input v-model="form.title" placeholder="请输入工单标题" />
        </el-form-item>
        <el-form-item label="类型" :error="errors.type">
          <el-select v-model="form.type" placeholder="请选择类型" style="width: 100%" @change="onTypeChange">
            <el-option
              v-for="o in WORK_ORDER_TYPE_OPTIONS"
              :key="o.value"
              :label="o.label"
              :value="o.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item v-if="requireElevator" label="电梯" :error="errors.elevatorId">
          <el-select v-model="form.elevatorId" placeholder="请选择电梯档案" style="width: 100%">
            <el-option
              v-for="e in elevators"
              :key="e.id"
              :label="`${e.elevatorNo}（${e.building}）${e.status === 'ACTIVE' ? '' : ' · 不可报修'}`"
              :value="e.id"
              :disabled="e.status !== 'ACTIVE'"
            />
          </el-select>
          <div class="sub">电梯类工单必须选择电梯档案；检修中/停用电梯不可报修</div>
        </el-form-item>
        <el-form-item label="优先级" :error="errors.priority">
          <el-select v-model="form.priority" style="width: 100%">
            <el-option
              v-for="o in priorityOptions"
              :key="o.value"
              :label="o.label"
              :value="o.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="小区" :error="errors.communityId">
          <el-select v-model="form.communityId" style="width: 100%">
            <el-option v-for="c in communities" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="报修位置" :error="errors.building || errors.room">
          <div class="inline">
            <el-input v-model="form.building" placeholder="楼栋，如 3栋" />
            <el-input v-model="form.room" placeholder="房号，如 2单元501" />
          </div>
          <div class="sub">地址按创建时快照保存，后续业主改地址不影响历史工单</div>
        </el-form-item>
        <el-form-item label="预约时间">
          <div class="inline">
            <el-date-picker
              v-model="appointmentDate"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="选择日期（可留空）"
              :disabled-date="isNoDutyDate"
              style="width: 180px"
            />
            <el-time-select
              v-model="appointmentClock"
              start="08:00"
              end="20:00"
              step="00:30"
              placeholder="选择时段"
              clearable
              style="width: 140px"
            />
          </div>
          <div class="sub">留空表示「尽快处理」；按 30 分钟粒度；无值班人员的日期不可选</div>
        </el-form-item>
        <el-form-item label="问题描述" :error="errors.description">
          <el-input v-model="form.description" type="textarea" :rows="4" placeholder="请描述问题" />
        </el-form-item>
        <el-form-item label="故障图片">
          <el-upload
            v-model:file-list="fileList"
            list-type="picture-card"
            :http-request="handleUpload"
            :on-remove="handleRemove"
            :limit="6"
            multiple
          >
            <el-icon><Plus /></el-icon>
          </el-upload>
          <div class="sub">最多 6 张，自动压缩后上传</div>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="submitting" @click="handleSubmit">保存</el-button>
          <el-button @click="$router.back()">取消</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { notify } from '@/utils/notify'
import { Plus } from '@element-plus/icons-vue'
import { createWorkOrder, updateWorkOrder, getWorkOrderDetail } from '@/api/workOrder'
import { uploadImage, compressImage } from '@/api/file'
import { getCommunities, getElevators, getDutySchedules } from '@/api/basedata'
import { workOrderSchema } from '@/schemas/workOrder'
import { useZodForm } from '@/utils/useZodForm'
import { useUserStore } from '@/stores/user'
import {
  WORK_ORDER_TYPE_OPTIONS,
  WORK_ORDER_PRIORITY_OPTIONS,
  ELEVATOR_REQUIRED_TYPES
} from '@/utils/dict'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const isEdit = computed(() => !!route.params.id)
const submitting = ref(false)
const { errors, validate } = useZodForm(workOrderSchema)
const fileList = ref([])
const communities = ref([])
const elevators = ref([])
const dutyDates = ref([])
const appointmentDate = ref('')
const appointmentClock = ref('')
const form = reactive({
  title: '',
  type: '',
  priority: 'MEDIUM',
  communityId: null,
  building: '',
  room: '',
  elevatorId: null,
  description: ''
})

const priorityOptions = computed(() => {
  if (userStore.role === 'RESIDENT') {
    return WORK_ORDER_PRIORITY_OPTIONS.filter((o) => ['LOW', 'MEDIUM'].includes(o.value))
  }
  return WORK_ORDER_PRIORITY_OPTIONS
})

const requireElevator = computed(() => ELEVATOR_REQUIRED_TYPES.includes(form.type))

// 无值班人员的日期置灰（预约时间与值班表联动）
function isNoDutyDate(date) {
  const d = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (date < today) return true
  return !dutyDates.value.includes(d)
}

function onTypeChange() {
  if (!requireElevator.value) form.elevatorId = null
}

onMounted(async () => {
  // 字典加载失败只降级为空，不阻断页面与编辑回填
  const [cs, es, ds] = await Promise.all([
    getCommunities().catch(() => []),
    getElevators().catch(() => []),
    getDutySchedules({ month: new Date().toISOString().slice(0, 7) }).catch(() => [])
  ])
  communities.value = cs
  elevators.value = Array.isArray(es) ? es : es?.list || []
  dutyDates.value = (Array.isArray(ds) ? ds : ds?.list || []).map((d) => d.date)
  if (!isEdit.value && cs.length) form.communityId = cs[0].id

  if (isEdit.value) {
    const detail = await getWorkOrderDetail(route.params.id)
    form.title = detail.title
    form.type = detail.type
    form.priority = detail.priority
    form.communityId = detail.communityId || null
    form.building = detail.building || ''
    form.room = detail.room || ''
    form.elevatorId = detail.elevatorId || null
    form.description = detail.description || ''
    if (detail.appointmentTime) {
      appointmentDate.value = detail.appointmentTime.slice(0, 10)
      appointmentClock.value = detail.appointmentTime.slice(11, 16)
    }
    fileList.value = (detail.images || []).map((url) => ({
      name: url.split('/').pop() || 'image',
      url
    }))
  }
})

async function handleUpload(options) {
  try {
    const compressed = await compressImage(options.file)
    const url = await uploadImage(compressed)
    options.onSuccess(url)
  } catch (e) {
    options.onError(e)
  }
}

function handleRemove(file) {
  if (file.url) {
    const idx = fileList.value.findIndex((f) => f.url === file.url)
    if (idx > -1) fileList.value.splice(idx, 1)
  }
}

function buildAppointment() {
  if (!appointmentDate.value) return null
  if (!appointmentClock.value) return `${appointmentDate.value} 00:00:00`
  return `${appointmentDate.value} ${appointmentClock.value}:00`
}

async function handleSubmit() {
  if (!validate(form)) return
  const location = `${form.building || ''}${form.room || ''}`
  const payload = {
    title: form.title,
    type: form.type,
    priority: form.priority,
    communityId: form.communityId,
    building: form.building,
    room: form.room,
    location,
    elevatorId: form.elevatorId,
    appointmentTime: buildAppointment(),
    description: form.description,
    images: fileList.value.filter((f) => f.url).map((f) => f.url)
  }
  submitting.value = true
  try {
    if (isEdit.value) {
      await updateWorkOrder(route.params.id, payload)
      notify.success('保存成功')
      router.push(`/work-orders/${route.params.id}`)
    } else {
      await createWorkOrder(payload)
      notify.success('创建成功')
      router.push('/work-orders')
    }
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.page-header {
  margin-bottom: 16px;
}
.inline {
  display: flex;
  gap: 8px;
  width: 100%;
}
.sub {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.6;
  margin-top: 2px;
}
</style>
