<template>
  <el-container class="layout">
    <el-aside width="208px" class="aside">
      <div class="logo">物业工单平台</div>
      <el-menu router :default-active="$route.path" class="menu">
        <el-menu-item v-for="item in visibleMenus" :key="item.path" :index="item.path">
          <el-icon><component :is="item.icon" /></el-icon>
          <span>{{ item.title }}</span>
        </el-menu-item>
      </el-menu>
      <div class="role-tip">{{ ROLE_MAP[userStore.role] || '' }}</div>
    </el-aside>
    <el-container>
      <el-header class="header">
        <el-input
          v-model="searchKeyword"
          class="search"
          placeholder="搜索工单号 / 业主姓名 / 电话 / 电梯编号"
          clearable
          @keyup.enter="handleSearch"
        >
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
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

  <el-drawer v-model="notifyVisible" title="站内通知" size="420px">
    <div class="notify-toolbar">
      <el-radio-group v-model="notifyFilter" size="small">
        <el-radio-button value="all">全部</el-radio-button>
        <el-radio-button value="unread">未读</el-radio-button>
      </el-radio-group>
      <el-button v-if="unreadCount" link type="primary" @click="handleReadAll">全部已读</el-button>
    </div>
    <div v-loading="notifyLoading" class="notify-list">
      <div
        v-for="n in filteredNotifications"
        :key="n.id"
        class="notify-item"
        :class="{ unread: !n.isRead, urgent: isUrgentNotify(n) }"
        @click="handleOpen(n)"
      >
        <div class="notify-title">
          <span v-if="!n.isRead" class="dot"></span>
          <el-tag size="small" :type="isUrgentNotify(n) ? 'danger' : 'info'">
            {{ NOTIFICATION_TYPE_MAP[n.type] || n.type }}
          </el-tag>
          <span>{{ n.title }}</span>
        </div>
        <div class="notify-content">{{ n.content }}</div>
        <div class="notify-time">{{ n.createdAt }}</div>
      </div>
      <el-empty v-if="!filteredNotifications.length" description="暂无通知" />
    </div>
  </el-drawer>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Bell, Search } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { getNotificationList, markNotificationRead, markAllNotificationsRead } from '@/api/notification'
import { ROLE_MAP, NOTIFICATION_TYPE_MAP } from '@/utils/dict'

const router = useRouter()
const userStore = useUserStore()

const searchKeyword = ref('')
const unreadCount = ref(0)
const notifications = ref([])
const notifyVisible = ref(false)
const notifyLoading = ref(false)
const notifyFilter = ref('all')

const allMenus = [
  { path: '/dispatch', title: '客服工作台', icon: 'Odometer', roles: ['ADMIN', 'CUSTOMER_SERVICE', 'BRANCH_ADMIN', 'VENDOR_ADMIN'] },
  { path: '/work-orders', title: '工单管理', icon: 'List', roles: [] },
  { path: '/work-orders/pool', title: '工单池', icon: 'Box', roles: ['ENGINEER', 'VENDOR_ENGINEER', 'ADMIN', 'CUSTOMER_SERVICE', 'BRANCH_ADMIN'] },
  { path: '/calendar', title: '维修日历', icon: 'Calendar', roles: ['ENGINEER', 'VENDOR_ENGINEER', 'ADMIN', 'CUSTOMER_SERVICE', 'BRANCH_ADMIN'] },
  { path: '/elevators', title: '电梯台账', icon: 'OfficeBuilding', roles: ['ADMIN', 'CUSTOMER_SERVICE', 'BRANCH_ADMIN'] },
  { path: '/maintenance', title: '维保计划', icon: 'Tools', roles: ['ADMIN', 'CUSTOMER_SERVICE', 'BRANCH_ADMIN'] },
  { path: '/inspection', title: '巡检管理', icon: 'Aim', roles: ['ADMIN', 'CUSTOMER_SERVICE', 'BRANCH_ADMIN'] },
  { path: '/certificates', title: '证书审核', icon: 'Medal', roles: ['ADMIN', 'CUSTOMER_SERVICE', 'BRANCH_ADMIN'] },
  { path: '/teams', title: '班组管理', icon: 'UserFilled', roles: ['ADMIN', 'CUSTOMER_SERVICE', 'BRANCH_ADMIN'] },
  { path: '/feedback', title: '反馈工单', icon: 'ChatDotRound', roles: ['ADMIN', 'CUSTOMER_SERVICE', 'BRANCH_ADMIN'] },
  { path: '/users', title: '用户管理', icon: 'User', roles: ['ADMIN', 'BRANCH_ADMIN'] },
  { path: '/stats', title: '统计报表', icon: 'DataAnalysis', roles: ['ADMIN', 'CUSTOMER_SERVICE', 'BRANCH_ADMIN', 'VENDOR_ADMIN'] },
  { path: '/exports', title: '导出中心', icon: 'Download', roles: ['ADMIN', 'CUSTOMER_SERVICE', 'BRANCH_ADMIN', 'VENDOR_ADMIN'] },
  { path: '/broadcast', title: '广播中心', icon: 'Promotion', roles: ['ADMIN', 'CUSTOMER_SERVICE'] }
]

const visibleMenus = computed(() =>
  allMenus.filter((m) => m.roles.length === 0 || m.roles.includes(userStore.role))
)

const filteredNotifications = computed(() =>
  notifyFilter.value === 'unread' ? notifications.value.filter((n) => !n.isRead) : notifications.value
)

function isUrgentNotify(n) {
  return ['ASSIGN_TIMEOUT', 'PROCESS_TIMEOUT', 'RETURNED', 'CERT_EXPIRING'].includes(n.type)
}

async function loadUnreadCount() {
  const data = await getNotificationList({ page: 1, pageSize: 1, unreadOnly: true })
  unreadCount.value = data.total
}

async function openNotifications() {
  notifyVisible.value = true
  notifyLoading.value = true
  try {
    const data = await getNotificationList({ page: 1, pageSize: 50 })
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

function handleSearch() {
  const keyword = searchKeyword.value.trim()
  router.push({ path: '/work-orders', query: keyword ? { keyword } : {} })
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
  display: flex;
  flex-direction: column;
}
.logo {
  height: 56px;
  line-height: 56px;
  text-align: center;
  font-weight: 600;
}
.menu {
  border-right: none;
  flex: 1;
}
.role-tip {
  padding: 12px 16px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  border-top: 1px solid var(--el-border-color-lighter);
}
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  border-bottom: 1px solid var(--el-border-color);
}
.search {
  max-width: 380px;
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
  align-items: center;
  justify-content: space-between;
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
.notify-item.urgent .notify-title {
  color: var(--el-color-danger);
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
