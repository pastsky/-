import axios from 'axios'
import { ElMessage } from 'element-plus'
import { getToken, clearToken } from './auth'

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 10000
})

// 请求拦截：自动附加 token
request.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截：统一处理 { code, message, data }
request.interceptors.response.use(
  (response) => {
    const res = response.data
    if (res.code === 0) {
      return res.data
    }
    if (res.code === 2000 || res.code === 2002) {
      clearToken()
      window.location.href = '/login'
    } else {
      ElMessage.error(res.message || '请求失败')
    }
    return Promise.reject(new Error(res.message || '请求失败'))
  },
  (error) => {
    if (error.response) {
      const status = error.response.status
      const msg = error.response.data?.message
      if (status === 401) {
        clearToken()
        ElMessage.error(msg || '登录已过期，请重新登录')
        window.location.href = '/login'
      } else {
        ElMessage.error(msg || error.message || '请求失败')
      }
    } else {
      ElMessage.error(error.message || '网络错误')
    }
    return Promise.reject(error)
  }
)

export default request
