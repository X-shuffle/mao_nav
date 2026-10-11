const REQUEST_TIMEOUT = 6000

export const parseSiteUrl = (value) => {
  const input = value.trim()
  const url = new URL(input.includes('://') ? input : `https://${input}`)
  if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) {
    throw new Error('请输入有效的 HTTP 或 HTTPS 站点地址')
  }
  return url
}

export const getIconSources = (url) => [
  `${url.origin}/favicon.ico`,
  `https://icons.duckduckgo.com/ip3/${encodeURIComponent(url.hostname)}.ico`,
  `https://icon.bqb.cool/?url=${encodeURIComponent(url.hostname)}`,
  `https://www.google.com/s2/favicons?domain=${encodeURIComponent(url.hostname)}&sz=64`,
]

const withTimeout = async (task, signal) => {
  const controller = new AbortController()
  const abort = () => controller.abort()
  signal?.addEventListener('abort', abort, { once: true })
  if (signal?.aborted) abort()
  const timer = setTimeout(abort, REQUEST_TIMEOUT)
  try {
    return await task(controller.signal)
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', abort)
  }
}

const testImage = (src, signal) => new Promise((resolve, reject) => {
  const img = new Image()
  const cleanup = () => {
    img.onload = null
    img.onerror = null
    signal.removeEventListener('abort', abort)
  }
  const abort = () => {
    cleanup()
    img.src = ''
    reject(new DOMException('图标请求已取消或超时', 'AbortError'))
  }
  if (signal.aborted) return abort()
  signal.addEventListener('abort', abort, { once: true })
  img.onload = () => {
    cleanup()
    if (img.naturalWidth > 0 && img.naturalHeight > 0) resolve()
    else reject(new Error('图标没有有效尺寸'))
  }
  img.onerror = () => {
    cleanup()
    reject(new Error('无法加载图标'))
  }
  img.referrerPolicy = 'no-referrer'
  img.src = src
})

// 根据文件内容识别格式，避免把 PNG / SVG 当成 ICO 上传。
export const getIconFormat = (data) => {
  const bytes = new Uint8Array(data)
  if (bytes[0] === 0 && bytes[1] === 0 && bytes[2] === 1 && bytes[3] === 0) {
    return { extension: 'ico', type: 'image/x-icon' }
  }
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return { extension: 'png', type: 'image/png' }
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { extension: 'jpg', type: 'image/jpeg' }
  }
  const text = new TextDecoder().decode(bytes.slice(0, 1024))
  if (text.startsWith('GIF87a') || text.startsWith('GIF89a')) {
    return { extension: 'gif', type: 'image/gif' }
  }
  if (text.startsWith('RIFF') && text.slice(8, 12) === 'WEBP') {
    return { extension: 'webp', type: 'image/webp' }
  }
  if (/^\s*(?:<\?xml[^>]*>\s*)?(?:<!--[^]*?-->\s*)*<svg[\s>]/i.test(text)) {
    return { extension: 'svg', type: 'image/svg+xml' }
  }
  throw new Error('响应不是支持的图标文件')
}

const downloadIcon = (src, signal) => withTimeout(async (requestSignal) => {
  const response = await fetch(src, {
    signal: requestSignal,
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const data = await response.arrayBuffer()
  const format = getIconFormat(data)
  const blob = new Blob([data], { type: format.type })
  const preview = URL.createObjectURL(blob)
  try {
    await testImage(preview, requestSignal)
    return { src, data, blob, extension: format.extension }
  } finally {
    URL.revokeObjectURL(preview)
  }
}, signal)

export const fetchSiteIcon = async (url, signal) => {
  const sources = getIconSources(url)
  const downloads = new AbortController()
  const abort = () => downloads.abort()
  signal?.addEventListener('abort', abort, { once: true })
  if (signal?.aborted) abort()
  try {
    // 并行尝试来源，一个服务超时不会阻塞其他来源。
    return await Promise.any(sources.map(src => downloadIcon(src, downloads.signal)))
  } catch {
    if (signal?.aborted) throw new DOMException('请求已取消', 'AbortError')
  } finally {
    downloads.abort()
    signal?.removeEventListener('abort', abort)
  }

  // 跨域只允许显示时，保留可用的在线地址，不再依赖公共 CORS 代理。
  for (const src of sources) {
    if (signal?.aborted) throw new DOMException('请求已取消', 'AbortError')
    try {
      await withTimeout(requestSignal => testImage(src, requestSignal), signal)
      return { src }
    } catch {
      // 当前来源失效时继续尝试下一来源。
    }
  }
  throw new Error('所有图标来源均不可用，请稍后重试或手动输入图标地址')
}
