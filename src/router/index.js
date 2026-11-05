import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/LoginView.vue'),
    meta: { public: true }
  },
  {
    path: '/',
    component: () => import('@/layouts/DefaultLayout.vue'),
    redirect: '/work-orders',
    children: [
      {
        path: 'dispatch',
        name: 'Dispatch',
        component: () => import('@/views/dispatch/DispatchWorkbench.vue'),
        meta: { roles: ['ADMIN', 'CUSTOMER_SERVICE', 'BRANCH_ADMIN', 'VENDOR_ADMIN'] }
      },
      {
        path: 'work-orders',
        name: 'WorkOrderList',
        component: () => import('@/views/workOrder/WorkOrderList.vue')
      },
      {
        path: 'work-orders/create',
        name: 'WorkOrderCreate',
        component: () => import('@/views/workOrder/WorkOrderEdit.vue'),
        meta: { roles: ['RESIDENT'] }
      },
      {
        path: 'work-orders/pool',
        name: 'WorkOrderPool',
        component: () => import('@/views/workOrder/WorkOrderPool.vue'),
        meta: { roles: ['ENGINEER', 'VENDOR_ENGINEER'] }
      },
      {
        path: 'work-orders/:id/edit',
        name: 'WorkOrderEdit',
        component: () => import('@/views/workOrder/WorkOrderEdit.vue'),
        meta: { roles: ['RESIDENT', 'ADMIN'] }
      },
      {
        path: 'work-orders/:id',
        name: 'WorkOrderDetail',
        component: () => import('@/views/workOrder/WorkOrderDetail.vue')
      },
      {
        path: 'calendar',
        name: 'RepairerCalendar',
        component: () => import('@/views/calendar/RepairerCalendar.vue'),
        meta: { roles: ['ENGINEER', 'VENDOR_ENGINEER', 'ADMIN', 'CUSTOMER_SERVICE'] }
      },
      {
        path: 'elevators',
        name: 'ElevatorList',
        component: () => import('@/views/elevator/ElevatorList.vue'),
        meta: { roles: ['ADMIN', 'CUSTOMER_SERVICE', 'ENGINEER', 'VENDOR_ENGINEER'] }
      },
      {
        path: 'maintenance',
        name: 'MaintenanceList',
        component: () => import('@/views/maintenance/MaintenanceList.vue'),
        meta: { roles: ['ADMIN', 'CUSTOMER_SERVICE'] }
      },
      {
        path: 'inspection',
        name: 'InspectionList',
        component: () => import('@/views/inspection/InspectionList.vue'),
        meta: { roles: ['ADMIN', 'CUSTOMER_SERVICE'] }
      },
      {
        path: 'certificates',
        name: 'CertificateList',
        component: () => import('@/views/certificate/CertificateList.vue'),
        meta: { roles: ['ADMIN', 'CUSTOMER_SERVICE'] }
      },
      {
        path: 'teams',
        name: 'TeamList',
        component: () => import('@/views/team/TeamList.vue'),
        meta: { roles: ['ADMIN', 'CUSTOMER_SERVICE'] }
      },
      {
        path: 'feedback',
        name: 'FeedbackList',
        component: () => import('@/views/feedback/FeedbackList.vue'),
        meta: { roles: ['ADMIN', 'CUSTOMER_SERVICE', 'BRANCH_ADMIN'] }
      },
      {
        path: 'exports',
        name: 'ExportCenter',
        component: () => import('@/views/export/ExportCenter.vue'),
        meta: { roles: ['ADMIN', 'CUSTOMER_SERVICE', 'BRANCH_ADMIN', 'VENDOR_ADMIN'] }
      },
      {
        path: 'users',
        name: 'UserList',
        component: () => import('@/views/user/UserList.vue'),
        meta: { roles: ['ADMIN'] }
      },
      {
        path: 'stats',
        name: 'Stats',
        component: () => import('@/views/stats/StatsView.vue'),
        meta: { roles: ['ADMIN', 'CUSTOMER_SERVICE', 'BRANCH_ADMIN', 'VENDOR_ADMIN'] }
      },
      {
        path: 'broadcast',
        name: 'Broadcast',
        component: () => import('@/views/notification/BroadcastCenter.vue'),
        meta: { roles: ['ADMIN', 'CUSTOMER_SERVICE'] }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(async (to) => {
  const store = useUserStore()

  if (to.meta.public) {
    if (to.path === '/login' && store.isLoggedIn) return '/'
    return true
  }

  if (!store.isLoggedIn) return '/login'

  if (!store.currentUser) {
    try {
      await store.fetchUser()
    } catch (e) {
      await store.logout()
      return '/login'
    }
  }

  if (to.meta.roles && !to.meta.roles.includes(store.role)) {
    return '/work-orders'
  }

  return true
})

export default router
