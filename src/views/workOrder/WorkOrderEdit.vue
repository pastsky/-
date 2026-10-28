<template>
  <div>
    <el-page-header class="page-header" :content="isEdit ? '编辑工单' : '新建工单'" @back="$router.back()" />
    <el-card>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px" style="max-width: 720px">
        <el-form-item label="标题" prop="title">
          <el-input v-model="form.title" placeholder="请输入工单标题" />
        </el-form-item>
        <el-form-item label="类型" prop="type">
          <el-select v-model="form.type" placeholder="请选择类型" style="width: 100%">
            <el-option
              v-for="o in WORK_ORDER_TYPE_OPTIONS"
              :key="o.value"
              :label="o.label"
              :value="o.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="优先级" prop="priority">
          <el-select v-model="form.priority" style="width: 100%">
            <el-option
              v-for="o in priorityOptions"
              :key="o.value"
              :label="o.label"
              :value="o.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="位置">
          <el-input v-model="form.location" placeholder="如 3栋2单元501" />
        </el-form-item>
        <el-form-item label="问题描述">
          <el-input v-model="form.description" type="textarea" :rows="4" placeholder="请描述问题" />
        </el-form-item>
        <el-form-item label="图片">
          <el-upload
            v-model:file-list="fileList"
            list-type="picture-card"
            :http-request="handleUpload"
            :on-remove="handleRemove"
            :limit="9"
            multiple
          >
            <el-icon><Plus /></el-icon>
          </el-upload>
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
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { createWorkOrder, updateWorkOrder, getWorkOrderDetail } from '@/api/workOrder'
import { uploadImage, compressImage } from '@/api/file'
import { useUserStore } from '@/stores/user'
import { WORK_ORDER_TYPE_OPTIONS, WORK_ORDER_PRIORITY_OPTIONS } from '@/utils/dict'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const isEdit = computed(() => !!route.params.id)
const formRef = ref()
const submitting = ref(false)
const fileList = ref([])
const form = reactive({
  title: '',
  type: '',
  priority: 'MEDIUM',
  location: '',
  description: ''
})

const rules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  type: [{ required: true, message: '请选择类型', trigger: 'change' }]
}

// 业主仅允许 LOW/MEDIUM，管理员/客服可升级
const priorityOptions = computed(() => {
  if (userStore.role === 'RESIDENT') {
    return WORK_ORDER_PRIORITY_OPTIONS.filter((o) => ['LOW', 'MEDIUM'].includes(o.value))
  }
  return WORK_ORDER_PRIORITY_OPTIONS
})

onMounted(async () => {
  if (isEdit.value) {
    const detail = await getWorkOrderDetail(route.params.id)
    form.title = detail.title
    form.type = detail.type
    form.priority = detail.priority
    form.location = detail.location || ''
    form.description = detail.description || ''
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

async function handleSubmit() {
  await formRef.value.validate()
  const payload = {
    title: form.title,
    type: form.type,
    priority: form.priority,
    location: form.location,
    description: form.description,
    images: fileList.value.filter((f) => f.url).map((f) => f.url)
  }
  submitting.value = true
  try {
    if (isEdit.value) {
      await updateWorkOrder(route.params.id, payload)
      ElMessage.success('保存成功')
      router.push(`/work-orders/${route.params.id}`)
    } else {
      await createWorkOrder(payload)
      ElMessage.success('创建成功')
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
</style>
