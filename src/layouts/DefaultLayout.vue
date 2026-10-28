<template>
  <el-container class="layout">
    <el-aside width="200px" class="aside">
      <div class="logo">物业工单平台</div>
      <el-menu router :default-active="$route.path" class="menu">
        <el-menu-item v-for="item in visibleMenus" :key="item.path" :index="item.path">
          <el-icon><component :is="item.icon" /></el-icon>
          <span>{{ item.title }}</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="header">
        <div class="header-right">
          <el-badge :value="unreadCount" :hidden="unreadCount === 0" class="bell">
            <el-icon class="bell-icon" @click="openNotifications"><Bell /></el-icon>
          </el-badge>
          <span class="username">{{ userStore.currentUser?.realName || '' }}</span>
          <el-button link type="primary" @click="handleLogout">退出</el-button>
        </div>
      </el-header>
      <el-main class="main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>

  <el-drawer v-model="notifyVisible" title="站内通知" size="380px">
    <div class="notify-toolbar">
      <el-button v-if="unreadCount" link type="primary" @click="handleReadAll">全部已读</el-button>
    </div>
    <div v-loading="notifyLoading" class="notify-list">
      <div
        v-for="n in notifications"
        :key="n.id"
        class="notify-item"
        :class="{ unread: !n.isRead }"
        @click="handleOpen(n)"
      >
        <div class="notify-title">
          <span v-if="!n.isRead" class="dot"></span>
          {{ n.title }}
        </div>
        <div class="notify-content">{{ n.content }}</div>
        <div class="notify-time">{{ n.createdAt }}</div>
      </div>
      <el-empty v-if="!notifications.length" description="暂无通知" />
    </div>
  </el-drawer>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Bell } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { getNotificationList, markNotificationRead, markAllNotificationsRead } from '@/api/notification'

const router = useRouter()
const userStore = useUserStore()

const unreadCount = ref(0)
const notifications = ref([])
const notifyVisible = ref(false)
const notifyLoading = ref(false)

const allMenus = [
  { path: '/work-orders', title: '工单管理', icon: 'List', roles: [] },
  { path: '/users', title: '用户管理', icon: 'User', roles: ['ADMIN'] },
  { path: '/stats', title: '统计报表', icon: 'DataAnalysis', roles: ['ADMIN', 'CUSTOMER_SERVICE'] }
]

const visibleMenus = computed(() =>
  allMenus.filter((m) => m.roles.length === 0 || m.roles.includes(userStore.role))
)

async function loadUnreadCount() {
  const data = await getNotificationList({ page: 1, pageSize: 1, unreadOnly: true })
  unreadCount.value = data.total
}

async function openNotifications() {
  notifyVisible.value = true
  notifyLoading.value = true
  try {
    const data = await getNotificationList({ page: 1, pageSize: 20 })
    notifications.value = data.list
    unreadCount.value = data.list.filter((n) => !n.isRead).length
  } finally {
    notifyLoading.value = false
  }
}

async function handleReadAll() {
  await markAllNotificationsRead()
  notifications.value.forEach((n) => (n.isRead = true))
  unreadCount.value = 0
}

async function handleOpen(n) {
  if (!n.isRead) {
    await markNotificationRead(n.id)
    n.isRead = true
    unreadCount.value = Math.max(0, unreadCount.value - 1)
  }
  if (n.orderId) {
    notifyVisible.value = false
    router.push(`/work-orders/${n.orderId}`)
  }
}

async function handleLogout() {
  await userStore.logout()
  router.push('/login')
}

onMounted(async () => {
  if (!userStore.currentUser) {
    try {
      await userStore.fetchUser()
    } catch (e) {
      // 忽略
    }
  }
  loadUnreadCount()
})
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
  border-bottom: 1px solid var(--el-border-color);
}
.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}
.bell-icon {
  font-size: 20px;
  cursor: pointer;
  color: var(--el-text-color-regular);
}
.username {
  color: var(--el-text-color-secondary);
}
.main {
  background: var(--el-fill-color-light);
}
.notify-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
}
.notify-item {
  padding: 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  cursor: pointer;
  border-radius: 6px;
}
.notify-item:hover {
  background: var(--el-fill-color-light);
}
.notify-item.unread {
  background: var(--el-color-primary-light-9);
}
.notify-title {
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--el-color-danger);
  display: inline-block;
}
.notify-content {
  font-size: 13px;
  color: var(--el-text-color-regular);
  margin-top: 4px;
}
.notify-time {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 6px;
}
</style>
