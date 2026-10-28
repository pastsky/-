<template>
  <el-container class="layout">
    <el-aside width="200px" class="aside">
      <div class="logo">物业工单平台</div>
      <el-menu router :default-active="$route.path" class="menu">
        <el-menu-item v-for="item in visibleMenus" :key="item.path" :index="item.path">
          <span>{{ item.title }}</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="header">
        <span class="username">{{ userStore.currentUser?.realName || '' }}</span>
        <el-button link type="primary" @click="handleLogout">退出</el-button>
      </el-header>
      <el-main class="main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

const allMenus = [
  { path: '/work-orders', title: '工单管理', roles: [] },
  { path: '/users', title: '用户管理', roles: ['ADMIN'] },
  { path: '/stats', title: '统计报表', roles: ['ADMIN', 'CUSTOMER_SERVICE'] }
]

const visibleMenus = computed(() =>
  allMenus.filter((m) => m.roles.length === 0 || m.roles.includes(userStore.role))
)

onMounted(async () => {
  if (!userStore.currentUser) {
    try {
      await userStore.fetchUser()
    } catch (e) {
      // 忽略
    }
  }
})

async function handleLogout() {
  await userStore.logout()
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
.username {
  color: var(--el-text-color-secondary);
}
.main {
  background: var(--el-fill-color-light);
}
</style>
