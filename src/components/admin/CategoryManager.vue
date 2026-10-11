<template>
  <div class="category-manager">
    <div class="manager-header">
      <h2>分类管理</h2>
      <div class="header-actions">
        <button @click="showAddModal = true" class="add-btn">
          ＋ 添加分类
        </button>
        <button @click="$emit('save')" :disabled="loading" class="save-btn">
          {{ loading ? '保存中...' : '保存到 GitHub' }}
        </button>
      </div>
    </div>

    <p v-if="!localCategories.length" class="empty-state">还没有分类，添加一个分类来整理你的站点。</p>
    <!-- 分类列表 -->
    <div class="categories-list">
      <div
        v-for="(category, index) in localCategories"
        :key="category.id"
        class="category-item"
      >
        <div class="category-header">
          <div class="category-info">
            <span class="category-icon">
              {{ category.icon }}
            </span>
            <div class="category-details">
              <h3>{{ category.name }}</h3>
              <button class="category-view-btn" @click="$emit('viewSites', category.id)">{{ category.sites?.length || 0 }} 个站点 · 查看站点 →</button>
            </div>
          </div>
          <div class="category-actions">
            <span class="order-badge">排序: {{ category.order }}</span>
            <button @click.stop="moveCategory(index, -1)" :disabled="index === 0" class="move-btn" :aria-label="`上移 ${category.name}`">
              ↑
            </button>
            <button @click.stop="moveCategory(index, 1)" :disabled="index === localCategories.length - 1" class="move-btn" :aria-label="`下移 ${category.name}`">
              ↓
            </button>
            <button @click.stop="editCategory(category)" class="edit-btn">
              编辑
            </button>
            <button @click.stop="deleteCategory(category.id)" class="delete-btn">
              删除
            </button>
          </div>
        </div>

        <!-- 站点预览 -->
        <div class="sites-preview" v-if="category.sites && category.sites.length > 0">
          <div class="sites-grid">
            <div
              v-for="site in category.sites.slice(0, 6)"
              :key="site.id"
              class="site-preview"
            >
              <SiteIcon :src="site.icon" :name="site.name" />
              <span>{{ site.name }}</span>
            </div>
            <div v-if="category.sites.length > 6" class="more-sites">
              +{{ category.sites.length - 6 }} 更多
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 添加/编辑分类弹窗 -->
    <AdminModal :visible="!!(showAddModal || editingCategory)" :title="editingCategory ? '编辑分类' : '添加分类'" @close="closeModal">
        <form @submit.prevent="saveCategory" class="category-form">
          <div class="form-group">
            <label for="categorymanager-1">分类图标</label>
            <div class="icon-input">
              <input id="categorymanager-1"
                v-model="formData.icon"
                placeholder="输入emoji图标"
                class="form-input icon-preview"
              >
              <div class="emoji-suggestions">
                <button type="button" :aria-label="`选择图标 ${emoji}`"
                  v-for="emoji in emojiSuggestions"
                  :key="emoji"
                  @click="formData.icon = emoji"
                  class="emoji-item"
                >
                  {{ emoji }}
                </button>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label for="categorymanager-2">分类名称</label>
            <input id="categorymanager-2"
              v-model="formData.name"
              required
              placeholder="请输入分类名称"
              class="form-input"
            >
          </div>

          <div class="form-group">
            <label for="categorymanager-3">排序顺序</label>
            <input id="categorymanager-3"
              v-model.number="formData.order"
              type="number"
              required
              placeholder="数字越小排序越靠前"
              class="form-input"
            >
          </div>

          <div class="form-actions">
            <button type="button" @click="closeModal" class="cancel-btn">取消</button>
            <button type="submit" class="submit-btn">
              {{ editingCategory ? '更新' : '添加' }}
            </button>
          </div>
        </form>
    </AdminModal>
    <CustomDialog :visible="!!pendingDelete" type="error" title="删除分类" message="此分类下的站点也会删除，保存到 GitHub 后才会同步到网站。" show-cancel confirm-text="确认删除" @confirm="confirmDelete" @cancel="pendingDelete = null" @close="pendingDelete = null" />
  </div>
</template>

<script setup>
import AdminModal from './AdminModal.vue'
import SiteIcon from '../SiteIcon.vue'
import CustomDialog from './CustomDialog.vue'
import { ref, watch } from 'vue'

const props = defineProps({
  categories: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update', 'save', 'viewSites'])

// 本地分类数据
const localCategories = ref([])

// 弹窗状态
const showAddModal = ref(false)
const editingCategory = ref(null)

// 表单数据
const formData = ref({
  icon: '📁',
  name: '',
  order: 0
})

// Emoji建议
const emojiSuggestions = [
  '📁', '🛠️', '🎨', '📚', '👥', '⚙️', '🎮', '💼',
  '☁️', '🔧', '📊', '🎵', '📱', '💻', '🌐', '🔍'
]

// 监听props变化
watch(() => props.categories, (newCategories) => {
  localCategories.value = JSON.parse(JSON.stringify(newCategories))
}, { immediate: true, deep: true })

// 手动同步到父组件的函数，避免无限循环
const syncToParent = () => {
  emit('update', localCategories.value)
}

// 移动分类
const moveCategory = (index, direction) => {
  const newIndex = index + direction
  if (newIndex < 0 || newIndex >= localCategories.value.length) return

  const categories = [...localCategories.value]
  const item = categories.splice(index, 1)[0]
  categories.splice(newIndex, 0, item)

  // 重新排序
  categories.forEach((category, idx) => {
    category.order = idx
  })

  localCategories.value = categories
  syncToParent()
}

// 编辑分类
const editCategory = (category) => {
  editingCategory.value = category
  formData.value = {
    icon: category.icon,
    name: category.name,
    order: category.order
  }
}

const pendingDelete = ref(null)
const deleteCategory = (categoryId) => { pendingDelete.value = categoryId }
const confirmDelete = () => {
  localCategories.value = localCategories.value.filter(cat => cat.id !== pendingDelete.value)
  syncToParent()
  pendingDelete.value = null
}

// 保存分类
const saveCategory = () => {
  if (editingCategory.value) {
    // 更新现有分类
    const index = localCategories.value.findIndex(cat => cat.id === editingCategory.value.id)
    if (index !== -1) {
      localCategories.value[index] = {
        ...localCategories.value[index],
        ...formData.value
      }
    }
  } else {
    // 添加新分类
    const newCategory = {
      id: `category-${Date.now()}`,
      ...formData.value,
      sites: []
    }
    localCategories.value.push(newCategory)
  }

  syncToParent()
  closeModal()
}

// 关闭弹窗
const closeModal = () => {
  showAddModal.value = false
  editingCategory.value = null
  formData.value = {
    icon: '📁',
    name: '',
    order: localCategories.value.length
  }
}

</script>
