import request from '@/utils/request'

// 前端压缩图片：最大宽度 1920px，JPEG 质量 0.8（契约 6.6.9）
export function compressImage(file, maxWidth = 1920, quality = 0.8) {
  return new Promise((resolve) => {
    if (!file.type || !file.type.startsWith('image/')) {
      resolve(file)
      return
    }
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      const ratio = Math.min(1, maxWidth / img.width)
      const width = Math.round(img.width * ratio)
      const height = Math.round(img.height * ratio)
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => {
          if (blob) {
            // 重编码为 JPEG 后扩展名必须同步改为 .jpg，否则后端按扩展名/MIME/魔数三重校验会 400
            const base = (file.name || 'image').replace(/\.[^.]+$/, '') || 'image'
            resolve(new File([blob], `${base}.jpg`, { type: 'image/jpeg' }))
          } else {
            resolve(file)
          }
        },
        'image/jpeg',
        quality
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(file)
    }
    img.src = objectUrl
  })
}

export function uploadImage(file) {
  const formData = new FormData()
  formData.append('file', file)
  return request.post('/files/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}
