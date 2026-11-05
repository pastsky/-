import { toast } from 'vue-sonner'

// 全局轻提示统一入口：sonner 渲染，堆叠上限由 Toaster 的 visible-toasts 控制（5 条）
// 同名提示 800ms 内去重，避免请求重试/轮询刷屏
let lastKey = ''
let lastAt = 0

function dedupe(key) {
  const time = Date.now()
  if (key === lastKey && time - lastAt < 800) return true
  lastKey = key
  lastAt = time
  return false
}

function show(type, text) {
  if (!text) return
  if (dedupe(`${type}:${text}`)) return
  const fn = toast[type] || toast
  fn(text)
}

export const notify = {
  success: (text) => show('success', text),
  error: (text) => show('error', text),
  warning: (text) => show('warning', text),
  info: (text) => show('info', text)
}
