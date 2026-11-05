import { ref } from 'vue'
import { notify } from './notify'

// 把 zod schema 的 issues 映射成 el-form-item 的 error 文案
// 用法：const { errors, validate } = useZodForm(schema) 或 useZodForm(() => schema)
export function useZodForm(schema) {
  const errors = ref({})

  function validate(values) {
    const resolved = typeof schema === 'function' ? schema() : schema
    const result = resolved.safeParse(values)
    if (result.success) {
      errors.value = {}
      return true
    }
    const map = {}
    for (const issue of result.error.issues) {
      const key = issue.path[0]
      if (key && !map[key]) map[key] = issue.message
    }
    errors.value = map
    notify.warning(result.error.issues[0]?.message || '请检查表单填写')
    return false
  }

  function clear() {
    errors.value = {}
  }

  return { errors, validate, clear }
}
