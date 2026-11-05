// el-upload 文件项与后端返回值的统一取值
// 注意：list-type="picture-card" 下 file.url 是浏览器临时预览地址（blob:），
// 只有 file.response.url 才是 /api/files/upload 返回的服务端地址，不能提交 blob。

export function fileUrl(file) {
  const res = file?.response
  if (typeof res === 'string') return res
  if (res?.url) return res.url
  // 编辑回填的历史图片只有 url，没有 response；blob: 一律丢弃
  const url = file?.url
  return url && !url.startsWith('blob:') ? url : ''
}

export function collectUploadedUrls(list) {
  return (list || []).map(fileUrl).filter(Boolean)
}

// 仍有未完成/失败的图片时禁止提交，避免把 blob 或空地址写库
export function hasPendingUpload(list) {
  return (list || []).some((f) => ['ready', 'uploading', 'fail'].includes(f.status))
}
