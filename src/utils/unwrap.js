// 列表响应三形态解包器（docs/frontend-api-guide.md §2.6）
// 1) 分页：data = { list, total, page, pageSize }
// 2) 仅 list：data = { list }
// 3) 裸数组：data = [...]
// 禁止所有页面统一按 data.list 解构，按接口选择对应解包器。

export function unwrapPage(data) {
  if (Array.isArray(data)) {
    return { list: data, total: data.length, page: 1, pageSize: data.length || 20 }
  }
  const list = Array.isArray(data?.list) ? data.list : []
  return {
    list,
    total: Number(data?.total ?? list.length),
    page: Number(data?.page ?? 1),
    pageSize: Number(data?.pageSize ?? (list.length || 20))
  }
}

// 仅 {list} 或裸数组
export function unwrapList(data) {
  if (Array.isArray(data)) return data
  return Array.isArray(data?.list) ? data.list : []
}

// 契约明确为裸数组的接口（users/engineers、work-orders/{id}/logs、
// stats/type-distribution、stats/engineer-performance）
export const unwrapArray = unwrapList

// 字典类接口缓存与并发去重：teams/configs/branches/repairer-tags/type-cert-mappings
const dictCache = new Map()

export function cachedRequest(key, loader, ttl = 60000) {
  const hit = dictCache.get(key)
  if (hit && Date.now() - hit.at < ttl) return hit.promise

  const promise = Promise.resolve()
    .then(loader)
    .catch((err) => {
      dictCache.delete(key)
      throw err
    })
  dictCache.set(key, { at: Date.now(), promise })
  return promise
}

export function clearDictCache(key) {
  if (key) dictCache.delete(key)
  else dictCache.clear()
}
