<template>
  <article class="site-card" :class="{ compact }">
    <a :href="site.url" target="_blank" rel="noopener noreferrer" class="site-link"
      :title="[site.name, site.description, getSiteHost(site.url)].filter(Boolean).join(' · ')">
      <SiteIcon :src="site.icon" :name="site.name" />
      <div class="site-info"><h3>{{ site.name }}</h3><p>{{ site.description || getSiteHost(site.url) }}</p></div>
    </a>
    <button type="button" class="favorite-button" :class="{ saved: favorite }" :aria-pressed="favorite"
      :aria-label="`${favorite ? '取消收藏' : '收藏'} ${site.name}`" :title="favorite ? '取消收藏' : '收藏到常用站点'"
      @click="$emit('toggle-favorite', site.url)">
      <svg width="17" height="17" viewBox="0 0 24 24" :fill="favorite ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m12 3 2.8 5.7 6.3.9-4.5 4.4 1 6.3L12 17.3l-5.6 3 1-6.3L3 9.6l6.2-.9Z"/></svg>
    </button>
  </article>
</template>

<script setup>
import SiteIcon from './SiteIcon.vue'
import { getSiteHost } from '../apis/navigationSearch.js'
defineProps({ site: { type: Object, required: true }, favorite: Boolean, compact: Boolean })
defineEmits(['toggle-favorite'])
</script>

<style scoped>
.site-card { position: relative; min-width: 0; border: 1px solid var(--nav-line); border-radius: 10px; background: #fff; transition: border-color 160ms ease, background-color 160ms ease; }
.site-card:hover { border-color: #91b6df; background: #f9fbfe; }
.site-link { display: flex; align-items: center; gap: 12px; min-height: 88px; padding: 14px 46px 14px 14px; color: inherit; text-decoration: none; height: 100%; border-radius: inherit; }
.site-info { min-width: 0; flex: 1; }
h3 { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 15px; font-weight: 600; line-height: 1.5; }
p { margin-top: 3px; color: var(--nav-muted); font-size: 12px; line-height: 1.5; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow-wrap: anywhere; }
.favorite-button { position: absolute; right: 7px; top: 7px; display: grid; place-items: center; width: 32px; height: 32px; padding: 0; border: none; border-radius: 6px; background: transparent; color: #62748b; cursor: pointer; }
.favorite-button:hover, .favorite-button.saved { color: var(--nav-accent); background: #edf3fa; }
a:focus-visible, button:focus-visible { outline: 2px solid var(--nav-accent); outline-offset: 2px; }
.compact .site-link { min-height: 74px; padding-top: 10px; padding-bottom: 10px; }
@media (max-width: 768px) {
  .site-link { flex-direction: column; align-items: flex-start; gap: 10px; padding: 14px; min-height: 132px; }
  .site-info { width: 100%; }
  h3 { font-size: 14px; }
  .favorite-button { width: 40px; height: 40px; right: 3px; top: 3px; }
  .compact .site-link { flex-direction: row; align-items: center; gap: 12px; padding: 12px 50px 12px 12px; min-height: 74px; }
  .compact .favorite-button { top: 50%; transform: translateY(-50%); }
}
@media (prefers-reduced-motion: reduce) { .site-card { transition: none; } }
</style>
