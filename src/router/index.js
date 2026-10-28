import { createRouter, createWebHistory } from 'vue-router'
import { getToken } from '@/utils/auth'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/LoginView.vue')
  },
  {
    path: '/',
    component: () => import('@/layouts/DefaultLayout.vue'),
    redirect: '/work-orders',
    children: [
      {
        path: 'work-orders',
        name: 'WorkOrderList',
        component: () => import('@/views/workOrder/WorkOrderList.vue')
      },
      {
        path: 'users',
        name: 'UserList',
        component: () => import('@/views/user/UserList.vue')
      },
      {
        path: 'stats',
        name: 'Stats',
        component: () => import('@/views/stats/StatsView.vue')
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 登录守卫：未登录跳转登录页
router.beforeEach((to) => {
  const token = getToken()
  if (to.path !== '/login' && !token) {
    return '/login'
  }
  return true
})

export default router
