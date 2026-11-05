<template>
  <el-card>
    <div class="header">
      <div>
        <span class="title">我的证书</span>
        <span class="sub">证书提交后由客服审核；驳回满 3 次锁定，需客服/管理员解锁</span>
      </div>
      <div class="ops">
        <el-button @click="loadData">刷新</el-button>
        <el-button type="primary" @click="openCreate">提交证书</el-button>
      </div>
    </div>

    <ListError :failed="loadError" :loading="loading" @retry="loadData" />

    <el-table v-if="!loadError" v-loading="loading" :data="list">
      <el-table-column prop="tagName" label="证书类型" width="160">
        <template #default="{ row }">{{ row.tagName || row.tagCode }}</template>
      </el-table-column>
      <el-table-column prop="certNo" label="证书编号" width="180">
        <template #default="{ row }">{{ row.certNo || '—' }}</template>
      </el-table-column>
      <el-table-column prop="certLevel" label="等级" width="100">
        <template #default="{ row }">{{ row.certLevel || '—' }}</template>
      </el-table-column>
      <el-table-column prop="expireDate" label="有效期至" width="130">
        <template #default="{ row }">
          <span :class="{ danger: row.expired }">{{ row.expireDate || '长期' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="120">
        <template #default="{ row }">
          <el-tag :type="CERT_STATUS_TAG[row.status] || 'info'" size="small">
            {{ CERT_STATUS_MAP[row.status] || row.status }}
          </el-tag>
          <el-tag v-if="row.expired" size="small" type="danger" class="tag">已过期</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="驳回次数" width="100">
        <template #default="{ row }">{{ row.rejectCount || 0 }}</template>
      </el-table-column>
      <el-table-column label="操作" width="110" fixed="right">
        <template #default="{ row }">
          <el-button
            v-if="['REJECTED', 'REVOKED'].includes(row.status)"
            link
            type="primary"
            @click="openResubmit(row)"
          >
            重新提交
          </el-button>
          <span v-else class="sub">—</span>
        </template>
      </el-table-column>
    </el-table>

    <el-empty v-if="!loadError && !loading && !list.length" description="还没有提交过证书" />

    <el-dialog v-model="formVisible" :title="resubmitId ? '重新提交证书' : '提交证书'" width="540px">
      <el-form label-width="96px">
        <el-form-item label="证书类型" required>
          <el-select v-model="form.tagCode" filterable style="width: 100%" :disabled="!!resubmitId">
            <el-option v-for="t in tags" :key="t.tagCode" :label="t.tagName" :value="t.tagCode" />
          </el-select>
        </el-form-item>
        <el-form-item label="证书编号">
          <el-input v-model="form.certNo" />
        </el-form-item>
        <el-form-item label="等级">
          <el-input v-model="form.certLevel" placeholder="如 中级 / T1" />
        </el-form-item>
        <el-form-item label="发证日期">
          <el-date-picker v-model="form.issueDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="有效期至">
          <el-date-picker v-model="form.expireDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="证书照片" required>
          <el-upload
            v-model:file-list="files"
            list-type="picture-card"
            :http-request="handleUpload"
            :limit="6"
            multiple
          >
            <span class="sub">上传</span>
          </el-upload>
          <div class="sub">至少 1 张，JPG/PNG，自动压缩后上传</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitForm">提交</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { notify } from '@/utils/notify'
import {
  getMyCertificates,
  getRepairerTags,
  createCertificate,
  resubmitCertificate
} from '@/api/certificate'
import { uploadImage, compressImage } from '@/api/file'
import { collectUploadedUrls, hasPendingUpload } from '@/utils/upload'
import ListError from '@/components/ListError.vue'
import { CERT_STATUS_MAP, CERT_STATUS_TAG } from '@/utils/dict'

const loading = ref(false)
const loadError = ref(false)
const list = ref([])
const tags = ref([])

const formVisible = ref(false)
const submitting = ref(false)
const resubmitId = ref(null)
const files = ref([])
const form = reactive({
  tagCode: '',
  certNo: '',
  certLevel: '',
  issueDate: '',
  expireDate: ''
})

async function loadData() {
  loading.value = true
  loadError.value = false
  try {
    list.value = await getMyCertificates()
  } catch (e) {
    loadError.value = true
    list.value = []
  } finally {
    loading.value = false
  }
}

async function ensureTags() {
  if (!tags.value.length) tags.value = await getRepairerTags({ status: 'ACTIVE' }).catch(() => [])
}

async function openCreate() {
  resubmitId.value = null
  Object.assign(form, { tagCode: '', certNo: '', certLevel: '', issueDate: '', expireDate: '' })
  files.value = []
  await ensureTags()
  formVisible.value = true
}

async function openResubmit(row) {
  resubmitId.value = row.id
  Object.assign(form, {
    tagCode: row.tagCode,
    certNo: row.certNo || '',
    certLevel: row.certLevel || '',
    issueDate: row.issueDate || '',
    expireDate: row.expireDate || ''
  })
  files.value = []
  await ensureTags()
  formVisible.value = true
}

async function handleUpload(options) {
  const compressed = await compressImage(options.file)
  return uploadImage(compressed)
}

async function submitForm() {
  if (!form.tagCode) {
    notify.warning('请选择证书类型')
    return
  }
  if (hasPendingUpload(files.value)) {
    notify.error('有图片上传失败，请删除后重新上传')
    return
  }
  const imageUrls = collectUploadedUrls(files.value)
  if (!imageUrls.length) {
    notify.warning('请至少上传 1 张证书照片')
    return
  }
  if (form.expireDate && form.issueDate && form.expireDate < form.issueDate) {
    notify.warning('有效期不能早于发证日期')
    return
  }
  submitting.value = true
  try {
    const payload = {
      certNo: form.certNo || undefined,
      certLevel: form.certLevel || undefined,
      issueDate: form.issueDate || undefined,
      expireDate: form.expireDate || undefined,
      imageUrls
    }
    if (resubmitId.value) {
      await resubmitCertificate(resubmitId.value, payload)
      notify.success('已重新提交，等待审核')
    } else {
      await createCertificate({ ...payload, tagCode: form.tagCode })
      notify.success('证书已提交，等待审核')
    }
    formVisible.value = false
    loadData()
  } catch (e) {
    // 3002（重复证书）/3000（锁定）由拦截器提示
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
  gap: 8px;
}
.tag {
  margin-left: 4px;
}
.danger {
  color: var(--el-color-danger);
}
</style>
