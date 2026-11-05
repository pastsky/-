import axios from 'axios'
import { notify } from './notify'
import { getToken, clearToken } from './auth'

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 20000
})

// 请求拦截：自动附加 token
request.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 从 Content-Disposition 解析文件名（RFC5987 filename*/普通 filename）
function parseFilename(disposition) {
  if (!disposition) return ''
  const star = disposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (star) {
    try {
      return decodeURIComponent(star[1].replace(/"/g, ''))
    } catch (e) {
      return star[1].replace(/"/g, '')
    }
  }
  const normal = disposition.match(/filename="?([^";]+)"?/i)
  return normal ? normal[1] : ''
}

function toBizError(code, message) {
  const err = new Error(message || '请求失败')
  err.code = code
  err.message = message || '请求失败'
  return err
}

function logoutToLogin() {
  clearToken()
  if (window.location.pathname !== '/login') {
    window.location.href = '/login'
  }
}

async function readBlobMessage(blob) {
  try {
    const text = await blob.text()
    return JSON.parse(text)
  } catch (e) {
    return null
  }
}

// 响应拦截：按业务码处理（HTTP 200 不等于成功）
request.interceptors.response.use(
  (response) => {
    // 文件流（导出下载/模板）不套统一响应结构，返回 blob + 文件名
    if (response.config?.responseType === 'blob') {
      return {
        blob: response.data,
        filename: parseFilename(response.headers?.['content-disposition'])
      }
    }
    const res = response.data
    if (res?.code === 0) {
      return res.data
    }
    const code = res?.code
    const message = res?.message || '请求失败'
    if (code === 2000 || code === 2002) {
      notify.error(message)
      logoutToLogin()
    } else {
      // 1002 无权限 / 1001·3001 不存在 / 3000·3002 状态与规则 / 1000 参数
      // 一律直接展示后端 message，不做本地翻译、不做页面跳转
      notify.error(message)
    }
    return Promise.reject(toBizError(code, message))
  },
  async (error) => {
    const status = error.response?.status
    let payload = error.response?.data
    if (payload instanceof Blob) {
      payload = await readBlobMessage(payload)
    }
    const code = payload?.code
    const message = payload?.message || error.message || '请求失败'

    if (status === 401 || code === 2000 || code === 2002) {
      notify.error(payload?.message || '登录已过期，请重新登录')
      logoutToLogin()
    } else if (status === 403 || code === 1002) {
      notify.error(payload?.message || '无权限执行该操作')
    } else if (status === 404 || code === 1001 || code === 3001 || code === 4000) {
      notify.error(payload?.message || '资源不存在')
    } else if (status === 409 || code === 3000 || code === 3002) {
      notify.error(payload?.message || '当前状态不允许该操作')
    } else if (status === 400 || code === 1000) {
      notify.error(payload?.message || '参数不合法')
    } else {
      notify.error(payload?.message || '请求失败')
    }
    return Promise.reject(toBizError(code, message))
  }
)

export default request
