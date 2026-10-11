<template>
  <Teleport to="body">
    <dialog ref="dialog" class="admin-modal admin-ui" :aria-labelledby="titleId" @cancel.prevent="emit('close')" @click="onBackdrop">
      <div class="modal-header">
        <h3 :id="titleId">{{ title }}</h3>
        <button type="button" class="close-btn" aria-label="关闭弹窗" @click="emit('close')">✕</button>
      </div>
      <slot />
    </dialog>
  </Teleport>
</template>

<script setup>
import { ref, watch, nextTick, onBeforeUnmount, useId } from 'vue'
import '../../assets/admin.css'
const props = defineProps({ visible: Boolean, title: { type: String, default: '提示' } })
const emit = defineEmits(['close'])
const dialog = ref(null)
const titleId = useId()
let returnFocus
watch(() => props.visible, async visible => {
  await nextTick()
  if (!dialog.value) return
  if (visible && !dialog.value.open) {
    returnFocus = document.activeElement
    dialog.value.showModal()
  } else if (!visible && dialog.value.open) {
    dialog.value.close()
    returnFocus?.focus()
  }
}, { immediate: true })
const onBackdrop = event => {
  if (event.target !== dialog.value) return
  const rect = dialog.value.getBoundingClientRect()
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) emit('close')
}
onBeforeUnmount(() => {
  dialog.value?.close()
  returnFocus?.focus()
})
</script>
