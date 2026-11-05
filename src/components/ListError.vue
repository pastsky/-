<template>
  <div v-if="failed" class="list-error">
    <el-icon class="icon"><WarningFilled /></el-icon>
    <div class="text">
      <p class="title">{{ title }}</p>
      <p class="desc">{{ description }}</p>
    </div>
    <el-button type="primary" plain :loading="loading" @click="$emit('retry')">重新加载</el-button>
  </div>
</template>

<script setup>
import { WarningFilled } from '@element-plus/icons-vue'

defineProps({
  failed: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  title: { type: String, default: '数据加载失败' },
  description: { type: String, default: '请稍后重试；若持续失败请联系管理员' }
})

defineEmits(['retry'])
</script>

<style scoped>
.list-error {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
  margin-bottom: 12px;
  border: 1px solid var(--el-color-danger-light-7);
  background: var(--el-color-danger-light-9);
  border-radius: 8px;
}
.icon {
  font-size: 24px;
  color: var(--el-color-danger);
}
.text {
  flex: 1;
}
.title {
  margin: 0;
  font-weight: 600;
  color: var(--el-text-color-primary);
}
.desc {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
