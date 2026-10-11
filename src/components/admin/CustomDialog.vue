<template>
  <AdminModal :visible="visible" :title="title" @close="closeOnOverlay && !loading && emit('close')">
    <div class="dialog-body" :class="{ 'error-message': type === 'error' }">
      <p class="dialog-message">{{ message }}</p>
      <div v-if="details.length" class="dialog-details">
        <p v-for="detail in details" :key="detail" class="detail-item">{{ detail }}</p>
      </div>
    </div>
    <div class="dialog-footer">
      <button v-if="showCancel" :disabled="loading" @click="handleCancel" class="btn-cancel">{{ cancelText }}</button>
      <button :disabled="loading" @click="handleConfirm" class="btn-confirm" :class="{ 'btn-danger': type === 'error' && showCancel }">{{ loading ? '处理中…' : confirmText }}</button>
    </div>
  </AdminModal>
</template>

<script setup>
import { watch, onBeforeUnmount } from 'vue'
import AdminModal from './AdminModal.vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  type: {
    type: String,
    default: 'info', // success, error, info, loading
    validator: (value) => ['success', 'error', 'info', 'loading'].includes(value)
  },
  title: {
    type: String,
    default: '提示'
  },
  message: {
    type: String,
    required: true
  },
  details: {
    type: Array,
    default: () => []
  },
  showCancel: {
    type: Boolean,
    default: false
  },
  confirmText: {
    type: String,
    default: '确定'
  },
  cancelText: {
    type: String,
    default: '取消'
  },
  loading: {
    type: Boolean,
    default: false
  },
  closeOnOverlay: {
    type: Boolean,
    default: true
  },
  autoClose: {
    type: Number,
    default: 0 // 0 means no auto close
  }
})

const emit = defineEmits(['confirm', 'cancel', 'close'])

let autoCloseTimer = null

const handleConfirm = () => {
  emit('confirm')
}

const handleCancel = () => {
  emit('cancel')
}

// 自动关闭功能
watch(() => props.visible, (newValue) => {
  clearTimeout(autoCloseTimer)
  if (newValue && props.autoClose > 0) {
    autoCloseTimer = setTimeout(() => {
      emit('close')
    }, props.autoClose)
  } else if (autoCloseTimer) {
    clearTimeout(autoCloseTimer)
    autoCloseTimer = null
  }
}, { immediate: true })
onBeforeUnmount(() => clearTimeout(autoCloseTimer))
</script>
