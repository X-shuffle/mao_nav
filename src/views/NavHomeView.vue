<template>
  <div class="nav-home" :class="{ 'list-view': viewMode === 'list' }">
    <aside class="sidebar">
      <a class="brand" href="/" :aria-label="`${title || 'Navigation'} 首页`">
        <img src="/logo.png" alt="" width="38" height="38" />
        <h1>{{ title || 'Navigation' }}</h1>
      </a>
      <nav class="category-nav" aria-label="分类导航">
        <p class="nav-label">分类导航 <span>{{ visibleCategories.length }}</span></p>
        <ul class="category-list">
          <li v-if="pinnedSites.length && !isSearching"><a href="#category-favorites" class="category-link" :class="{ active: activeCategoryId === 'favorites' }" :aria-current="activeCategoryId === 'favorites' ? 'location' : undefined" @click.prevent="scrollToCategory('favorites')"><span class="category-emoji" aria-hidden="true">☆</span><span class="category-label">常用站点</span><span class="category-count">{{ pinnedSites.length }}</span></a></li>
          <li v-for="category in visibleCategories" :key="category.id">
            <a :href="`#category-${category.id}`" class="category-link"
              :class="{ active: activeCategoryId === category.id }"
              :aria-current="activeCategoryId === category.id ? 'location' : undefined"
              @click.prevent="scrollToCategory(category.id)">
              <span class="category-emoji" aria-hidden="true">{{ category.icon }}</span>
              <span class="category-label">{{ category.name }}</span>
              <span class="category-count">{{ category.sites?.length || 0 }}</span>
            </a>
          </li>
        </ul>
        <p v-if="!loading && !visibleCategories.length" class="nav-empty">{{ isSearching ? '暂无匹配分类' : '暂无分类' }}</p>
      </nav>
      <a class="github-link" href="https://github.com/X-shuffle/mao_nav" target="_blank" rel="noopener noreferrer">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.39.6.11.8-.26.8-.58v-2.23c-3.34.73-4.03-1.42-4.03-1.42-.55-1.39-1.33-1.76-1.33-1.76-1.09-.74.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.8 1.3 3.49 1 .11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.65 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.6-2.8 5.62-5.48 5.92.43.37.82 1.1.82 2.22v3.29c0 .32.22.69.83.57A12 12 0 0 0 24 12C24 5.37 18.63 0 12 0Z"/></svg>
        <span>X-shuffle / mao_nav</span><span aria-hidden="true">↗</span>
      </a>
    </aside>

    <main class="main-content">
      <header class="search-header">
        <form class="search-container" role="search" @submit.prevent="handleSearch">
          <div class="search-mode">
            <svg v-if="selectedEngine === 'local'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/></svg>
            <img v-else :src="searchEngines[selectedEngine].icon" alt="" width="18" height="18" />
            <select v-model="selectedEngine" aria-label="搜索范围">
              <option value="local">站内</option>
              <option value="bing">Bing</option>
              <option value="google">Google</option>
              <option value="baidu">百度</option>
              <option value="duckduckgo">DuckDuckGo</option>
            </select>
          </div>
          <input ref="searchInput" v-model="searchQuery" type="search" aria-label="搜索关键词"
            :placeholder="selectedEngine === 'local' ? '搜索站点、描述或域名' : `使用 ${searchEngines[selectedEngine].name} 搜索`"
            autocomplete="off" @keydown.esc.stop="searchQuery = ''" />
          <button v-if="searchQuery" type="button" class="clear-search" aria-label="清空搜索" @click="clearSearch">×</button>
          <kbd v-else class="search-shortcut" aria-hidden="true">/</kbd>
          <button v-if="selectedEngine !== 'local'" type="submit" class="web-search" aria-label="在新标签页搜索">↗</button>
        </form>
        <button ref="menuButton" class="mobile-menu-btn" type="button" aria-label="打开分类导航" aria-controls="mobile-categories"
          :aria-expanded="showMobileMenu" @click="openMobileMenu">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
        </button>
      </header>

      <div ref="contentArea" class="content-area" @scroll.passive="scheduleActiveCategory">
        <div v-if="loading" class="page-state" role="status">正在加载站点…</div>
        <div v-else-if="error" class="page-state" role="alert"><p>{{ error }}</p><button class="primary-button" @click="fetchCategories">重新加载</button></div>
        <div v-else class="categories-container">
          <div class="collection-summary">
            <p v-if="isSearching" role="status" aria-live="polite">找到 <strong>{{ visibleSiteCount }}</strong> 个站点 <span>· {{ visibleCategories.length }} 个分类</span></p>
            <p v-else>收藏的好去处 <span>· {{ totalSites }} 个站点</span></p>
            <div class="collection-actions"><button v-if="isSearching" class="text-button" @click="clearSearch">显示全部</button>
              <div class="view-switch" role="group" aria-label="站点显示方式"><button type="button" :aria-pressed="viewMode === 'cards'" @click="viewMode = 'cards'">卡片</button><button type="button" :aria-pressed="viewMode === 'list'" @click="viewMode = 'list'">列表</button></div>
            </div>
          </div>
          <div v-if="!visibleCategories.length" class="empty-state">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/></svg>
            <h2>{{ isSearching ? '没有找到匹配的站点' : '还没有收藏站点' }}</h2>
            <p>{{ isSearching ? '试试更短的关键词，也可以切换搜索引擎到网上查找。' : '添加一些常用网站，让这里成为你的日常入口。' }}</p>
            <button v-if="isSearching" class="primary-button" @click="clearSearch">清空搜索</button>
          </div>
          <p class="preference-status" role="status">{{ preferenceStatus }}</p>
          <section v-if="pinnedSites.length && !isSearching" id="category-favorites" class="category-section favorites-section" aria-labelledby="heading-favorites">
            <div class="category-heading"><h2 id="heading-favorites"><span aria-hidden="true">☆</span>常用站点</h2><span>{{ pinnedSites.length }} 个站点 · 本机收藏</span></div>
            <div class="sites-grid"><SiteCard v-for="site in pinnedSites" :key="site.url" :site="site" favorite :compact="viewMode === 'list'" @toggle-favorite="toggleFavorite" /></div>
          </section>
          <p v-else-if="!isSearching && totalSites" class="favorite-hint">点击站点旁的 ☆，把常用网站放在这里。</p>
          <section v-for="category in visibleCategories" :id="`category-${category.id}`" :key="category.id" class="category-section" :aria-labelledby="`heading-${category.id}`">
            <div class="category-heading">
              <h2 :id="`heading-${category.id}`"><span aria-hidden="true">{{ category.icon }}</span>{{ category.name }}</h2>
              <span>{{ category.sites?.length || 0 }} 个站点</span>
            </div>
            <div class="sites-grid">
              <SiteCard v-for="site in category.sites" :key="site.id" :site="site" :favorite="favoriteSet.has(site.url)" :compact="viewMode === 'list'" @toggle-favorite="toggleFavorite" />
            </div>
            <p v-if="!category.sites?.length" class="category-empty">这个分类还没有站点</p>
          </section>
          <p v-if="visibleCategories.length" class="collection-end">{{ title || 'Navigation' }} · 发现值得收藏的网站</p>
        </div>
      </div>
    </main>

    <dialog id="mobile-categories" ref="menuDialog" class="mobile-menu" aria-labelledby="mobile-menu-title" @close="showMobileMenu = false" @cancel="showMobileMenu = false" @click="handleDialogClick">
      <div class="mobile-menu-header"><h2 id="mobile-menu-title">分类导航</h2><button type="button" aria-label="关闭分类导航" @click="closeMobileMenu">×</button></div>
      <nav aria-label="手机分类导航"><ul class="category-list">
        <li v-if="pinnedSites.length && !isSearching"><a href="#category-favorites" class="category-link" :class="{ active: activeCategoryId === 'favorites' }" :aria-current="activeCategoryId === 'favorites' ? 'location' : undefined" @click.prevent="scrollToCategoryMobile('favorites')"><span class="category-emoji" aria-hidden="true">☆</span><span class="category-label">常用站点</span><span class="category-count">{{ pinnedSites.length }}</span></a></li>
        <li v-for="category in visibleCategories" :key="category.id">
        <a :href="`#category-${category.id}`" class="category-link" :class="{ active: activeCategoryId === category.id }"
          :aria-current="activeCategoryId === category.id ? 'location' : undefined" @click.prevent="scrollToCategoryMobile(category.id)">
          <span class="category-emoji" aria-hidden="true">{{ category.icon }}</span><span class="category-label">{{ category.name }}</span><span class="category-count">{{ category.sites?.length || 0 }}</span>
        </a>
      </li></ul><p v-if="!loading && !visibleCategories.length" class="nav-empty">{{ isSearching ? '暂无匹配分类' : '暂无分类' }}</p></nav>
    </dialog>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useNavigation } from '@/apis/useNavigation.js'
import { filterCategories } from '@/apis/navigationSearch.js'
import SiteCard from '@/components/SiteCard.vue'
import { PREFERENCES_KEY, readPreferences, savePreferences } from '@/apis/navigationPreferences.js'
import googleLogo from '@/assets/goolge.png'
import baiduLogo from '@/assets/baidu.png'
import bingLogo from '@/assets/bing.png'
import duckLogo from '@/assets/duck.png'

const { categories, title, loading, error, fetchCategories } = useNavigation()
const loadPreferences = () => {
  try { return readPreferences(window.localStorage) }
  catch { return { favoriteUrls: [], viewMode: 'cards' } }
}
const initialPreferences = loadPreferences()
const favoriteUrls = ref(initialPreferences.favoriteUrls)
const viewMode = ref(initialPreferences.viewMode)
const preferenceStatus = ref('')
const favoriteSet = computed(() => new Set(favoriteUrls.value))
const pinnedSites = computed(() => {
  const sites = new Map(categories.value.flatMap(category => category.sites || []).map(site => [site.url, site]))
  return favoriteUrls.value.map(url => sites.get(url)).filter(Boolean)
})
const toggleFavorite = (url) => {
  const removed = favoriteSet.value.has(url)
  favoriteUrls.value = removed ? favoriteUrls.value.filter(value => value !== url) : [...favoriteUrls.value, url]
  preferenceStatus.value = removed ? '已从常用站点移除' : '已添加到常用站点'
}
watch([favoriteUrls, viewMode], () => {
  try {
    if (!savePreferences(window.localStorage, { favoriteUrls: favoriteUrls.value, viewMode: viewMode.value })) preferenceStatus.value = '浏览器无法保存偏好，本次设置仍可使用'
  } catch { preferenceStatus.value = '浏览器无法保存偏好，本次设置仍可使用' }
})
const syncPreferences = (event) => {
  if (event.key !== PREFERENCES_KEY && event.key !== null) return
  const preferences = loadPreferences()
  favoriteUrls.value = preferences.favoriteUrls
  viewMode.value = preferences.viewMode
}
const searchQuery = ref('')
const selectedEngine = ref('local')
const activeCategoryId = ref('')
const contentArea = ref(null)
const searchInput = ref(null)
const menuDialog = ref(null)
const showMobileMenu = ref(false)
const menuButton = ref(null)
let scrollFrame = 0
const searchEngines = {
  google: { name: 'Google', url: 'https://www.google.com/search?q=', icon: googleLogo },
  baidu: { name: '百度', url: 'https://www.baidu.com/s?wd=', icon: baiduLogo },
  bing: { name: 'Bing', url: 'https://www.bing.com/search?q=', icon: bingLogo },
  duckduckgo: { name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=', icon: duckLogo },
}
const isSearching = computed(() => selectedEngine.value === 'local' && !!searchQuery.value.trim())
const visibleCategories = computed(() => filterCategories(categories.value, isSearching.value ? searchQuery.value : ''))
const totalSites = computed(() => categories.value.reduce((sum, category) => sum + (category.sites?.length || 0), 0))
const visibleSiteCount = computed(() => visibleCategories.value.reduce((sum, category) => sum + (category.sites?.length || 0), 0))

const updateActiveCategory = () => {
  scrollFrame = 0
  const container = contentArea.value
  const sections = container?.querySelectorAll('.category-section')
  if (!sections?.length) { activeCategoryId.value = ''; return }
  let current = sections[0]
  const top = container.getBoundingClientRect().top + 40
  for (const section of sections) {
    if (section.getBoundingClientRect().top <= top) current = section
    else break
  }
  if (container.scrollHeight > container.clientHeight && container.scrollTop + container.clientHeight >= container.scrollHeight - 2) current = sections[sections.length - 1]
  activeCategoryId.value = current.id.slice('category-'.length)
}
const scheduleActiveCategory = () => {
  if (!scrollFrame) scrollFrame = requestAnimationFrame(updateActiveCategory)
}
const scrollToCategory = (categoryId) => {
  const container = contentArea.value
  const element = document.getElementById(`category-${categoryId}`)
  if (!container || !element) return
  const top = element.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop - 24
  container.scrollTo({ top: Math.max(0, top), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
}
const clearSearch = () => { searchQuery.value = ''; searchInput.value?.focus() }
const handleSearch = () => {
  if (selectedEngine.value === 'local' || !searchQuery.value.trim()) return
  window.open(searchEngines[selectedEngine.value].url + encodeURIComponent(searchQuery.value.trim()), '_blank', 'noopener,noreferrer')
}
const openMobileMenu = () => { menuDialog.value?.showModal(); showMobileMenu.value = true }
const closeMobileMenu = () => { menuDialog.value?.close(); showMobileMenu.value = false; menuButton.value?.focus() }
const handleDialogClick = (event) => {
  if (event.target !== menuDialog.value) return
  const rect = menuDialog.value.getBoundingClientRect()
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeMobileMenu()
}
const scrollToCategoryMobile = (id) => { closeMobileMenu(); scrollToCategory(id) }
const handleKeyboard = (event) => {
  if (event.defaultPrevented || event.isComposing || menuDialog.value?.open) return
  const editing = event.target instanceof HTMLElement && (event.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName))
  if (((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') || (event.key === '/' && !editing && !event.ctrlKey && !event.metaKey && !event.altKey)) {
    event.preventDefault(); searchInput.value?.focus()
  }
}
const handleResize = () => {
  if (window.innerWidth > 768 && menuDialog.value?.open) closeMobileMenu()
  scheduleActiveCategory()
}
watch(visibleCategories, async () => {
  await nextTick()
  contentArea.value?.scrollTo({ top: 0, behavior: 'instant' })
  updateActiveCategory()
})
watch([viewMode, pinnedSites], async () => { await nextTick(); scheduleActiveCategory() })
onMounted(() => {
  fetchCategories()
  window.addEventListener('storage', syncPreferences)
  window.addEventListener('keydown', handleKeyboard)
  window.addEventListener('resize', handleResize)
})
onUnmounted(() => {
  cancelAnimationFrame(scrollFrame)
  window.removeEventListener('storage', syncPreferences)
  window.removeEventListener('keydown', handleKeyboard)
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.nav-home {
  --nav-ink: #243247;
  --nav-muted: #5c6b7e;
  --nav-accent: #2866af;
  --nav-line: #e2e8f0;
  display: flex;
  height: 100vh;
  height: 100dvh;
  background: #f5f7fa;
  color: var(--nav-ink);
}
button, input, select { font: inherit; }
button, a, input, select { -webkit-tap-highlight-color: transparent; }
a:focus-visible, button:focus-visible, select:focus-visible { outline: 2px solid var(--nav-accent); outline-offset: 4px; }
.sidebar { display: flex; flex-direction: column; width: 240px; flex-shrink: 0; background: #2c3e50; color: #fff; }
.brand { display: flex; gap: 12px; align-items: center; padding: 24px 20px; color: inherit; text-decoration: none; }
.brand img { object-fit: cover; border-radius: 8px; }
.brand h1 { font-size: 20px; font-weight: 600; letter-spacing: -0.02em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.category-nav { flex: 1; min-height: 0; overflow-y: auto; padding: 12px; }
.nav-label { display: flex; justify-content: space-between; margin: 0 10px 12px; font-size: 12px; font-weight: 600; color: #c4ceda; }
.category-list { padding: 0; margin: 0; list-style: none; }
.category-list li + li { margin-top: 4px; }
.category-link { display: flex; align-items: center; gap: 10px; min-height: 44px; padding: 10px; border-radius: 8px; color: #dce4ed; text-decoration: none; transition: background-color 160ms ease, color 160ms ease; }
.category-link:hover { background: #374d62; color: #fff; }
.category-link.active { background: #405b74; color: #fff; }
.category-link:focus-visible { outline-color: #9fc8ff; outline-offset: -2px; }
.category-emoji { font-size: 18px; flex-shrink: 0; }
.category-label { font-size: 14px; min-width: 0; flex: 1; }
.category-count { font-size: 12px; font-variant-numeric: tabular-nums; opacity: 0.8; }
.nav-empty { padding: 12px; color: #c4ceda; font-size: 13px; }
.github-link { display: flex; gap: 10px; align-items: center; margin: 12px; padding: 14px 10px; border-top: 1px solid #526274; color: #dce4ed; font-size: 12px; text-decoration: none; }
.github-link span:last-child { margin-left: auto; }
.github-link:hover { color: #fff; }
.main-content { display: flex; flex: 1; flex-direction: column; min-width: 0; }
.search-header { display: flex; align-items: center; gap: 12px; padding: 18px 32px; background: #fff; border-bottom: 1px solid var(--nav-line); flex-shrink: 0; }
.search-container { display: flex; flex: 1; min-width: 0; align-items: center; gap: 8px; width: 100%; max-width: 720px; min-height: 46px; margin: 0 auto; padding: 0 10px; border: 1px solid #d3dce8; border-radius: 10px; background: #fff; }
.search-container:focus-within { outline: 2px solid var(--nav-accent); outline-offset: 2px; }
.search-mode { display: flex; align-items: center; gap: 6px; padding-right: 8px; border-right: 1px solid var(--nav-line); color: var(--nav-muted); }
.search-mode img { object-fit: contain; }
.search-mode select { max-width: 120px; padding: 6px 2px; border: none; color: var(--nav-ink); background: #fff; cursor: pointer; font-size: 13px; }
.search-container input { min-width: 0; flex: 1; padding: 10px 4px; border: none; outline: none; background: transparent; color: var(--nav-ink); font-size: 15px; }
.search-container input::placeholder { color: var(--nav-muted); }
.search-container input::-webkit-search-cancel-button { display: none; }
.clear-search, .web-search { display: grid; place-items: center; width: 32px; height: 32px; flex-shrink: 0; border: none; background: transparent; border-radius: 6px; color: var(--nav-muted); cursor: pointer; font-size: 22px; }
.clear-search:hover, .web-search:hover { background: #edf3fa; color: var(--nav-accent); }
.search-shortcut { padding: 0 6px; border: 1px solid var(--nav-line); border-radius: 4px; color: var(--nav-muted); font-size: 12px; }
.mobile-menu-btn { display: none; }
.content-area { flex: 1; min-height: 0; overflow-y: auto; padding: 24px 32px 40px; }
.categories-container { max-width: 1320px; margin: 0 auto; }
.collection-summary { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 24px; font-size: 13px; color: var(--nav-muted); }
.collection-actions { display: flex; align-items: center; gap: 14px; flex-shrink: 0; }
.view-switch { display: flex; padding: 3px; background: #e9eef5; border-radius: 7px; }
.view-switch button { padding: 5px 10px; border: none; background: transparent; color: var(--nav-muted); border-radius: 5px; cursor: pointer; font-size: 12px; }
.view-switch button[aria-pressed="true"] { background: #fff; color: var(--nav-accent); font-weight: 600; }
.favorite-hint { margin: -10px 0 24px; font-size: 12px; color: var(--nav-muted); }
.preference-status { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.list-view .sites-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.collection-summary strong { font-weight: 600; color: var(--nav-ink); }
.collection-summary span { margin-left: 4px; }
.category-section { margin-bottom: 32px; }
.category-heading { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 14px; }
.category-heading h2 { display: flex; align-items: center; gap: 10px; font-size: 19px; font-weight: 600; text-wrap: balance; }
.category-heading h2 span { font-size: 21px; }
.category-heading > span { flex-shrink: 0; font-size: 12px; color: var(--nav-muted); }
.sites-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
.category-empty { padding: 20px 0; color: var(--nav-muted); font-size: 14px; }
.collection-end { margin-top: 40px; color: var(--nav-muted); text-align: center; font-size: 12px; }
.page-state, .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; min-height: 320px; text-align: center; color: var(--nav-muted); }
.empty-state h2 { font-size: 20px; font-weight: 600; color: var(--nav-ink); }
.empty-state p { max-width: 40ch; font-size: 14px; }
.primary-button { padding: 10px 16px; border: none; border-radius: 8px; background: var(--nav-accent); color: #fff; cursor: pointer; font-size: 14px; }
.primary-button:hover { background: #20558f; }
.text-button { padding: 4px 0; border: none; color: var(--nav-accent); background: transparent; cursor: pointer; font-size: 13px; }
.mobile-menu { position: fixed; inset: 0 0 0 auto; width: min(300px, 85vw); max-width: none; height: 100dvh; max-height: none; margin: 0; padding: 20px 14px; border: none; background: #2c3e50; color: #fff; }
.mobile-menu::backdrop { background: rgb(20 31 46 / 45%); }
.mobile-menu-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 20px; padding: 0 8px; }
.mobile-menu-header h2 { font-size: 18px; font-weight: 600; }
.mobile-menu-header button { width: 36px; height: 36px; border: none; border-radius: 6px; background: #405b74; color: #fff; font-size: 24px; cursor: pointer; }
@media (min-width: 769px) and (max-width: 1100px) {
  .sites-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 768px) {
  .sidebar { display: none; }
  .search-header { padding: 14px 16px; gap: 10px; }
  .search-container { padding: 0 8px; gap: 4px; min-height: 44px; }
  .search-mode { gap: 4px; padding-right: 4px; }
  .search-mode select { width: 76px; font-size: 12px; }
  .search-mode svg, .search-mode img { display: none; }
  .search-container input { font-size: 16px; padding-left: 6px; }
  .search-shortcut { display: none; }
  .mobile-menu-btn { display: grid; place-items: center; width: 40px; height: 40px; flex-shrink: 0; border: none; border-radius: 8px; background: #edf3fa; color: var(--nav-ink); cursor: pointer; }
  .content-area { padding: 20px 16px 32px; }
  .collection-summary { margin-bottom: 22px; font-size: 12px; flex-wrap: wrap; }
  .collection-actions { gap: 10px; }
  .list-view .sites-grid { grid-template-columns: 1fr; }
  .category-heading h2 { font-size: 18px; }
  .category-heading > span { font-size: 11px; }
  .sites-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .category-section { margin-bottom: 28px; }
}
@media (max-width: 360px) {
  .content-area { padding-right: 12px; padding-left: 12px; }
  .search-header { padding-right: 12px; padding-left: 12px; }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { transition: none !important; animation: none !important; scroll-behavior: auto !important; }
}
</style>
