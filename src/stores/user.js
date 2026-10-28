import { defineStore } from 'pinia'
import { login as loginApi, logout as logoutApi, getCurrentUser } from '@/api/auth'
import { getToken, setToken, clearToken } from '@/utils/auth'

export const useUserStore = defineStore('user', {
  state: () => ({
    token: getToken() || '',
    currentUser: null
  }),
  getters: {
    role: (state) => state.currentUser?.role || '',
    isLoggedIn: (state) => !!state.token
  },
  actions: {
    async login(payload) {
      const data = await loginApi(payload)
      this.token = data.token
      this.currentUser = data.user
      setToken(data.token)
      return data
    },
    async fetchUser() {
      if (!this.token) return
      this.currentUser = await getCurrentUser()
    },
    async logout() {
      try {
        await logoutApi()
      } catch (e) {
        // 忽略退出接口异常
      }
      this.token = ''
      this.currentUser = null
      clearToken()
    }
  }
})
