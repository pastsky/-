<template>
  <el-container class="layout">
    <el-aside width="200px" class="aside">
      <div class="logo">物业工单平台</div>
      <el-menu router :default-active="$route.path" class="menu">
        <el-menu-item index="/work-orders">工单管理</el-menu-item>
        <el-menu-item index="/users">用户管理</el-menu-item>
        <el-menu-item index="/stats">统计报表</el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="header">
        <span>{{ currentUser?.realName || '' }}</span>
        <el-button link type="primary" @click="handleLogout">退出</el-button>
      </el-header>
      <el-main>
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getCurrentUser, logout } from '@/api/auth'
import { clearToken } from '@/utils/auth'

const router = useRouter()
const currentUser = ref(null)

onMounted(async () => {
  try {
    currentUser.value = await getCurrentUser()
  } catch (e) {
    // 获取用户信息失败时忽略
  }
})

async function handleLogout() {
  try {
    await logout()
  } catch (e) {
    // 忽略退出接口异常
  }
  clearToken()
  router.push('/login')
}
</script>

<style scoped>
.layout {
  height: 100vh;
}
.aside {
  border-right: 1px solid var(--el-border-color);
}
.logo {
  height: 56px;
  line-height: 56px;
  text-align: center;
  font-weight: 600;
}
.menu {
  border-right: none;
}
.header {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  border-bottom: 1px solid var(--el-border-color);
}
</style>
