<template>
  <div class="login">
    <el-card class="login-card" shadow="always">
      <div class="brand">
        <h2 class="title">物业工单管理平台</h2>
        <p class="subtitle">Property Work Order Management</p>
      </div>
      <el-form :model="form">
        <el-form-item>
          <el-input v-model="form.username" placeholder="用户名" size="large" />
        </el-form-item>
        <el-form-item>
          <el-input
            v-model="form.password"
            type="password"
            placeholder="密码"
            show-password
            size="large"
            @keyup.enter="handleLogin"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" size="large" class="submit" :loading="loading" @click="handleLogin">
            登录
          </el-button>
        </el-form-item>
      </el-form>
      <p class="tip">测试账号：admin / cs001 / engineer001 / resident001（密码均为 123456）</p>
    </el-card>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()
const loading = ref(false)
const form = reactive({ username: '', password: '' })

async function handleLogin() {
  if (!form.username || !form.password) {
    ElMessage.warning('请输入用户名和密码')
    return
  }
  loading.value = true
  try {
    await userStore.login(form)
    router.push('/')
  } catch (e) {
    // 错误已由 request 拦截器统一提示
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 45%, #1e3a8a 100%);
}
.login-card {
  width: 400px;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
}
.brand {
  text-align: center;
  margin-bottom: 24px;
}
.title {
  margin: 0 0 8px;
  font-size: 22px;
  font-weight: 700;
  color: #1f2937;
}
.subtitle {
  margin: 0;
  font-size: 13px;
  color: #9ca3af;
}
.submit {
  width: 100%;
}
.tip {
  margin: 0;
  font-size: 12px;
  color: #9ca3af;
  text-align: center;
  line-height: 1.6;
}
</style>
