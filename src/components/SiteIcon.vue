<template>
  <span class="site-avatar" aria-hidden="true">
    <img v-if="src && !failed" :src="src" alt="" width="28" height="28"
      loading="lazy" decoding="async" @error="failed = true" />
    <span v-else class="site-initial">{{ initial }}</span>
  </span>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  src: { type: String, default: '' },
  name: { type: String, default: '' },
})
const failed = ref(false)
const initial = computed(() => Array.from(props.name.trim())[0]?.toUpperCase() || '↗')
watch(() => props.src, () => { failed.value = false })
</script>

<style scoped>
.site-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  border-radius: 10px;
  background: #f1f5fa;
}
img { width: 28px; height: 28px; object-fit: contain; }
.site-initial { font-size: 19px; font-weight: 600; color: #35649c; }
</style>
