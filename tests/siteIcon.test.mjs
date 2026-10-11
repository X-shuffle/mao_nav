import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { fetchSiteIcon, getIconFormat, getIconSources, parseSiteUrl } from '../src/apis/siteIcon.js'

const originalFetch = globalThis.fetch
const originalImage = globalThis.Image
const originalSetTimeout = globalThis.setTimeout
const icon = new Uint8Array([0, 0, 1, 0, 1, 0]).buffer

afterEach(() => {
  globalThis.fetch = originalFetch
  globalThis.Image = originalImage
  globalThis.setTimeout = originalSetTimeout
})

const mockImages = (isValid = () => true) => {
  globalThis.Image = class {
    naturalWidth = 16
    naturalHeight = 16
    set src(value) {
      if (!value) return
      queueMicrotask(() => {
        if (isValid(value)) this.onload?.()
        else this.onerror?.()
      })
    }
  }
}

test('normalizes bare domains, preserves origin and excludes ports from service domains', () => {
  const url = parseSiteUrl(' example.com:8080/path ')
  assert.equal(url.href, 'https://example.com:8080/path')
  const sources = getIconSources(url)
  assert.equal(sources[0], 'https://example.com:8080/favicon.ico')
  assert.ok(sources[1].endsWith('/example.com.ico'))
  assert.throws(() => parseSiteUrl('file:///tmp/icon'))
  assert.throws(() => parseSiteUrl('https://'))
})

test('recognizes small ICO, PNG and SVG; rejects HTML error responses', () => {
  assert.equal(getIconFormat(icon).extension, 'ico')
  assert.equal(getIconFormat(new Uint8Array([0x89, 0x50, 0x4e, 0x47]).buffer).extension, 'png')
  assert.equal(getIconFormat(new TextEncoder().encode('<?xml version="1.0"?><svg></svg>').buffer).extension, 'svg')
  assert.throws(() => getIconFormat(new TextEncoder().encode('<html>Error</html>').buffer))
})

test('downloads a valid icon even when its size is below 512 bytes', async () => {
  mockImages()
  globalThis.fetch = async () => new Response(icon)
  const result = await fetchSiteIcon(new URL('https://example.com'))
  assert.equal(result.extension, 'ico')
  assert.equal(result.data.byteLength, 6)
  assert.equal(result.blob.type, 'image/x-icon')
})

test('a failed or hanging primary source does not block a downloadable fallback', async () => {
  mockImages()
  globalThis.fetch = (src, { signal }) => {
    if (src.includes('duckduckgo.com')) return Promise.resolve(new Response(icon))
    return new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true })
    })
  }
  const result = await fetchSiteIcon(new URL('https://example.com'))
  assert.ok(result.src.includes('duckduckgo.com'))
  assert.ok(result.data)
})

test('CORS download failures fall back to an image that can be displayed', async () => {
  globalThis.fetch = async () => { throw new TypeError('Failed to fetch') }
  mockImages(src => src.includes('icon.bqb.cool'))
  const result = await fetchSiteIcon(new URL('https://example.com'))
  assert.equal(result.src, 'https://icon.bqb.cool/?url=example.com')
  assert.equal(result.data, undefined)
})

test('HTML proxy errors and undecodable images are not accepted as downloads', async () => {
  globalThis.fetch = async src => new Response(src.includes('duckduckgo.com') ? icon : '<html>Unavailable</html>')
  mockImages(src => !src.startsWith('blob:') && src.includes('google.com'))
  const result = await fetchSiteIcon(new URL('https://example.com'))
  assert.ok(result.src.includes('google.com'))
  assert.equal(result.data, undefined)
})

test('requests really time out when sources and image loads hang', async () => {
  globalThis.setTimeout = (callback) => originalSetTimeout(callback, 10)
  globalThis.fetch = (src, { signal }) => new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true })
  })
  globalThis.Image = class { set src(value) { void value } }
  await assert.rejects(fetchSiteIcon(new URL('https://example.com')), /所有图标来源均不可用/)
})

test('cancelling a pending request does not start online fallback requests', async () => {
  const controller = new AbortController()
  let images = 0
  globalThis.Image = class { constructor() { images++ } }
  globalThis.fetch = (src, { signal }) => new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true })
  })
  const request = fetchSiteIcon(new URL('https://example.com'), controller.signal)
  controller.abort()
  await assert.rejects(request, { name: 'AbortError' })
  assert.equal(images, 0)
})

test('reports failure when neither downloadable nor online images work', async () => {
  globalThis.fetch = async () => new Response('Not found', { status: 404 })
  mockImages(() => false)
  await assert.rejects(fetchSiteIcon(new URL('https://example.com')), /所有图标来源均不可用/)
})
