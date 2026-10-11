<template>
  <div class="site-manager">
    <div class="manager-header">
      <h2>🌐 站点管理</h2>
      <div class="header-actions">
        <select v-model="selectedCategoryId" class="category-filter">
          <option value="">所有分类</option>
          <option v-for="category in categories" :key="category.id" :value="category.id">
            {{ category.icon }} {{ category.name }}
          </option>
        </select>
        <button @click="showAddModal = true" class="add-btn">
          ➕ 添加站点
        </button>
        <button @click="handleSave" :disabled="loading" class="save-btn">
          {{ loading ? '保存中...' : '💾 保存到GitHub' }}
        </button>
      </div>
    </div>

    <!-- 统计信息 -->
    <div class="stats-bar">
      <div class="stat-item">
        <span class="stat-number">{{ totalSites }}</span>
        <span class="stat-label">总站点数</span>
      </div>
      <div class="stat-item">
        <span class="stat-number">{{ categories.length }}</span>
        <span class="stat-label">分类数</span>
      </div>
      <div class="stat-item">
        <span class="stat-number">{{ filteredSites.length }}</span>
        <span class="stat-label">当前显示</span>
      </div>
    </div>

    <!-- 站点列表 -->
    <div class="sites-list">
      <div
        v-for="site in paginatedSites"
        :key="site.id"
        class="site-item"
      >
        <div class="site-info">
          <div class="site-icon">
            <img :src="getIconDisplayUrl(site.icon)" :alt="site.name" @error="handleImageError">
          </div>
          <div class="site-details">
            <h3>{{ site.name }}</h3>
            <p class="site-description">{{ site.description }}</p>
            <a :href="site.url" target="_blank" rel="noopener noreferrer" class="site-url">
              {{ site.url }}
            </a>
            <span class="site-category">
              {{ getCategoryName(site.categoryId) }}
            </span>
          </div>
        </div>
        <div class="site-actions">
          <button @click="editSite(site)" class="edit-btn">
            ✏️ 编辑
          </button>
          <button @click="deleteSite(site)" class="delete-btn">
            🗑️ 删除
          </button>
        </div>
      </div>
    </div>

    <!-- 分页 -->
    <div class="pagination" v-if="totalPages > 1">
      <button
        @click="currentPage--"
        :disabled="currentPage === 1"
        class="page-btn"
      >
        ⬅️ 上一页
      </button>
      <span class="page-info">
        第 {{ currentPage }} 页，共 {{ totalPages }} 页
      </span>
      <button
        @click="currentPage++"
        :disabled="currentPage === totalPages"
        class="page-btn"
      >
        下一页 ➡️
      </button>
    </div>

    <!-- 添加/编辑站点弹窗 -->
    <div v-if="showAddModal || editingSite" class="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ editingSite ? '编辑站点' : '添加站点' }}</h3>
          <button @click="closeModal" class="close-btn">✕</button>
        </div>

        <form @submit.prevent="saveSite" class="site-form">
          <div class="form-row">
            <div class="form-group">
              <label>站点名称 *:</label>
              <input
                v-model="formData.name"
                required
                placeholder="请输入站点名称"
                class="form-input"
              >
            </div>
            <div class="form-group">
              <label>所属分类 *:</label>
              <select v-model="formData.categoryId" required class="form-input">
                <option value="">请选择分类</option>
                <option v-for="category in categories" :key="category.id" :value="category.id">
                  {{ category.icon }} {{ category.name }}
                </option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label>站点地址 *:</label>
            <input
              v-model="formData.url"
              type="url"
              required
              placeholder="https://example.com"
              class="form-input"
            >
          </div>

          <div class="form-group">
            <label>站点描述:</label>
            <textarea
              v-model="formData.description"
              placeholder="请输入站点描述"
              class="form-textarea"
              rows="3"
            ></textarea>
          </div>

          <div class="form-group">
            <label>站点图标:</label>
            <div class="icon-input-group">
              <input
                v-model="formData.icon"
                @input="cancelIconRequest"
                placeholder="图标URL或使用自动获取"
                class="form-input"
              >
              <button type="button" @click="autoDetectIcon" :disabled="fetchingIcon" class="auto-icon-btn">
                {{ fetchingIcon ? '获取中...' : '🔍 自动获取' }}
              </button>
            </div>
            <p v-if="iconStatus" role="status" class="icon-status">{{ iconStatus }}</p>
            <div class="icon-preview" v-if="formData.icon">
              <img :src="getIconDisplayUrl(formData.icon)" alt="图标预览" @error="iconError = true">
            </div>
          </div>

          <div class="form-actions">
            <button type="button" @click="closeModal" class="cancel-btn">取消</button>
            <button type="submit" class="submit-btn">
              {{ editingSite ? '更新' : '添加' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { useGitHubAPI } from '../../apis/useGitHubAPI.js'
import { fetchSiteIcon, parseSiteUrl } from '../../apis/siteIcon.js'

const props = defineProps({
  categories: {
    type: Array,
    default: () => []
  },
  initialSelectedCategoryId: {
    type: String,
    default: ''
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update', 'save', 'upload-icons'])

// GitHub API
const { uploadBinaryFile } = useGitHubAPI()

// 本地分类数据
const localCategories = ref([])

// 图标数据缓存 - 用于存储待上传的图标
const pendingIcons = ref(new Map())

// 图标预览缓存 - 用于在编辑期间显示图标
const iconPreviews = ref(new Map())

// 分页和筛选
const selectedCategoryId = ref('')
const currentPage = ref(1)
const pageSize = 10

// 弹窗状态
const showAddModal = ref(false)
const editingSite = ref(null)
const iconError = ref(false)
const fetchingIcon = ref(false)
const iconStatus = ref('')
let iconController = null

// 表单数据
const formData = ref({
  name: '',
  url: '',
  description: '',
  icon: '',
  categoryId: ''
})

// 监听props变化
watch(() => props.categories, (newCategories) => {
  localCategories.value = JSON.parse(JSON.stringify(newCategories))
}, { immediate: true, deep: true })

// 监听选中分类变化
watch(() => props.initialSelectedCategoryId, (newCategoryId) => {
  if (newCategoryId) {
    selectedCategoryId.value = newCategoryId
    currentPage.value = 1 // 重置到第一页
  }
}, { immediate: true })

// 手动同步到父组件的函数，避免无限循环
const syncToParent = () => {
  emit('update', localCategories.value)
}

// 计算属性
const allSites = computed(() => {
  const sites = []
  localCategories.value.forEach(category => {
    if (category.sites) {
      category.sites.forEach(site => {
        sites.push({
          ...site,
          categoryId: category.id
        })
      })
    }
  })
  return sites
})

const totalSites = computed(() => allSites.value.length)

const filteredSites = computed(() => {
  if (!selectedCategoryId.value) {
    return allSites.value
  }
  return allSites.value.filter(site => site.categoryId === selectedCategoryId.value)
})

const totalPages = computed(() => Math.ceil(filteredSites.value.length / pageSize))

const paginatedSites = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  const end = start + pageSize
  return filteredSites.value.slice(start, end)
})

// 获取分类名称
const getCategoryName = (categoryId) => {
  const category = localCategories.value.find(cat => cat.id === categoryId)
  return category ? `${category.icon} ${category.name}` : '未分类'
}

// 获取图标显示URL - 优先使用预览缓存
const getIconDisplayUrl = (iconPath) => {
  if (!iconPath) return ''

  // 如果有预览缓存，使用预览URL
  if (iconPreviews.value.has(iconPath)) {
    return iconPreviews.value.get(iconPath)
  }

  // 否则使用原始路径
  return iconPath
}

// 编辑站点
const editSite = (site) => {
  cancelIconRequest()
  editingSite.value = site
  formData.value = {
    name: site.name,
    url: site.url,
    description: site.description,
    icon: site.icon,
    categoryId: site.categoryId
  }
  iconError.value = false
}

// 删除站点
const deleteSite = (site) => {
  if (confirm(`确定要删除站点"${site.name}"吗？`)) {
    const category = localCategories.value.find(cat => cat.id === site.categoryId)
    if (category && category.sites) {
      category.sites = category.sites.filter(s => s.id !== site.id)
      syncToParent()
    }
  }
}

// 上传所有待处理的图标到GitHub（串行上传避免冲突）
const uploadPendingIconsToGitHub = async () => {
  const usedPaths = new Set(allSites.value.map(site => site.icon))
  const icons = Array.from(pendingIcons.value.values()).filter(icon => usedPaths.has(icon.localPath))
  if (icons.length === 0) {
    console.log('没有待上传的图标')
    return
  }

  console.log(`开始串行上传 ${icons.length} 个图标到GitHub...`)

  const uploadResults = []

  // 串行上传，避免并发冲突
  for (const icon of icons) {
    try {
      const githubPath = `public/sitelogo/${icon.fileName}`
      const message = `chore: 添加站点图标 ${icon.fileName}`

      console.log(`📤 上传图标: ${icon.fileName}`)
      await uploadBinaryFile(githubPath, icon.arrayBuffer, message)
      console.log(`✅ 图标已上传到GitHub: ${githubPath}`)

      // 上传成功后从待处理列表中移除
      pendingIcons.value.delete(icon.localPath)
      uploadResults.push({ success: true, fileName: icon.fileName })
    } catch (error) {
      console.error(`❌ 上传图标 ${icon.fileName} 失败:`, error)
      uploadResults.push({ success: false, fileName: icon.fileName, error: error.message })

      // 如果是SHA冲突，抛出错误停止上传，否则继续上传其他图标
      if (error.message.includes('but expected')) {
        throw new Error(`GitHub文件冲突: ${error.message}`)
      }
    }
  }

  // 检查上传结果
  const successCount = uploadResults.filter(r => r.success).length
  const failCount = uploadResults.filter(r => !r.success).length

  console.log(`📊 上传结果: 成功 ${successCount}/${icons.length}`)

  if (failCount > 0) {
    const failedFiles = uploadResults.filter(r => !r.success).map(r => r.fileName)
    throw new Error(`部分图标上传失败: ${failedFiles.join(', ')}`)
  }

  console.log('✅ 所有图标上传完成')
}

// 自动获取图标；下载失败但图片可显示时使用在线地址。
const autoDetectIcon = async () => {
  if (fetchingIcon.value) return
  if (!formData.value.url.trim()) {
    iconStatus.value = '请先输入站点地址'
    return
  }

  let url
  try {
    url = parseSiteUrl(formData.value.url)
  } catch {
    iconStatus.value = 'URL 格式不正确，请输入有效的站点地址'
    return
  }

  const originalForm = formData.value
  const originalUrl = originalForm.url
  const originalIcon = originalForm.icon
  const controller = new AbortController()
  iconController = controller
  fetchingIcon.value = true
  iconStatus.value = ''

  try {
    const result = await fetchSiteIcon(url, controller.signal)
    if (controller.signal.aborted || formData.value !== originalForm ||
        originalForm.url !== originalUrl || originalForm.icon !== originalIcon) return

    if (result.data) {
      const domain = url.hostname
      const fileName = `${domain}.${result.extension}`
      const localPath = `/sitelogo/${fileName}`
      const oldPreview = iconPreviews.value.get(localPath)
      if (oldPreview) URL.revokeObjectURL(oldPreview)
      pendingIcons.value.set(localPath, {
        arrayBuffer: result.data, fileName, localPath, domain,
      })
      iconPreviews.value.set(localPath, URL.createObjectURL(result.blob))
      formData.value.icon = localPath
      iconStatus.value = '图标已获取，保存到 GitHub 时会上传图标文件'
    } else {
      formData.value.icon = result.src
      iconStatus.value = '图标已获取，将使用在线图标地址'
    }
    iconError.value = false
  } catch (error) {
    if (!controller.signal.aborted && formData.value === originalForm &&
        originalForm.url === originalUrl && originalForm.icon === originalIcon) {
      iconStatus.value = `${error.message}。原图标已保留。`
    }
  } finally {
    if (iconController === controller) {
      iconController = null
      fetchingIcon.value = false
    }
  }
}

const cancelIconRequest = () => {
  iconController?.abort()
  iconController = null
  fetchingIcon.value = false
  iconStatus.value = ''
}

watch(() => formData.value.url, cancelIconRequest, { flush: 'sync' })

onBeforeUnmount(() => {
  cancelIconRequest()
  iconPreviews.value.forEach(preview => URL.revokeObjectURL(preview))
})

// 保存站点
const saveSite = () => {
  const category = localCategories.value.find(cat => cat.id === formData.value.categoryId)
  if (!category) {
    alert('请选择有效的分类')
    return
  }

  if (!category.sites) {
    category.sites = []
  }

  if (editingSite.value) {
    // 更新现有站点
    // 首先从原分类中移除站点
    const originalCategory = localCategories.value.find(cat =>
      cat.sites && cat.sites.some(s => s.id === editingSite.value.id)
    )

    if (originalCategory && originalCategory.sites) {
      originalCategory.sites = originalCategory.sites.filter(s => s.id !== editingSite.value.id)
    }

    // 然后在新分类中添加更新后的站点
    const updatedSite = {
      id: editingSite.value.id,
      name: formData.value.name,
      url: formData.value.url,
      description: formData.value.description,
      icon: formData.value.icon
    }
    category.sites.push(updatedSite)
  } else {
    // 添加新站点
    const newSite = {
      id: `site-${Date.now()}`,
      name: formData.value.name,
      url: formData.value.url,
      description: formData.value.description,
      icon: formData.value.icon
    }
    category.sites.push(newSite)
  }

  syncToParent()
  closeModal()
}

// 关闭弹窗
const closeModal = () => {
  cancelIconRequest()
  showAddModal.value = false
  editingSite.value = null
  formData.value = {
    name: '',
    url: '',
    description: '',
    icon: '',
    categoryId: selectedCategoryId.value || (localCategories.value[0]?.id || '')
  }
  iconError.value = false
}

// 处理图片错误
const handleImageError = (event) => {
  event.target.style.display = 'none'
}

// 处理保存操作
const handleSave = async () => {
  try {
    // 先上传待处理的图标文件
    if (pendingIcons.value.size > 0) {
      await uploadPendingIconsToGitHub()
    }

    // 然后保存站点数据
    emit('save')

  } catch (error) {
    console.error('保存失败:', error)
    alert(`保存失败: ${error.message}`)
  }
}

// 重置分页
watch(selectedCategoryId, () => {
  currentPage.value = 1
})
</script>

<style scoped>
.site-manager {
  padding: 20px 0;
}

.manager-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 2px solid #e9ecef;
}

.manager-header h2 {
  color: #2c3e50;
  margin: 0;
  font-size: 24px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 15px;
}

.category-filter {
  padding: 8px 12px;
  border: 2px solid #e1e1e1;
  border-radius: 4px;
  font-size: 14px;
  background: white;
  cursor: pointer;
}

.add-btn, .save-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.add-btn {
  background: #27ae60;
  color: white;
}

.add-btn:hover {
  background: #219a52;
}

.save-btn {
  background: #3498db;
  color: white;
}

.save-btn:hover:not(:disabled) {
  background: #2980b9;
}

.save-btn:disabled {
  background: #bdc3c7;
  cursor: not-allowed;
}

.stats-bar {
  display: flex;
  gap: 20px;
  margin-bottom: 30px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.stat-number {
  font-size: 24px;
  font-weight: 600;
  color: #3498db;
}

.stat-label {
  font-size: 12px;
  color: #7f8c8d;
  margin-top: 5px;
}

.sites-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 30px;
}

.site-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
  transition: box-shadow 0.3s ease;
}

.site-item:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.site-info {
  display: flex;
  align-items: center;
  gap: 15px;
  flex: 1;
}

.site-icon {
  width: 48px;
  height: 48px;
  background: white;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #e9ecef;
}

.site-icon img {
  width: 32px;
  height: 32px;
  object-fit: contain;
}

.site-details {
  flex: 1;
}

.site-details h3 {
  margin: 0 0 5px 0;
  color: #2c3e50;
  font-size: 16px;
}

.site-description {
  margin: 0 0 5px 0;
  color: #7f8c8d;
  font-size: 14px;
}

.site-url {
  color: #3498db;
  text-decoration: none;
  font-size: 13px;
  display: block;
  margin-bottom: 5px;
}

.site-url:hover {
  text-decoration: underline;
}

.site-category {
  display: inline-block;
  background: #3498db;
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
}

.site-actions {
  display: flex;
  gap: 10px;
}

.edit-btn, .delete-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.3s ease;
}

.edit-btn {
  background: #f39c12;
  color: white;
}

.edit-btn:hover {
  background: #e67e22;
}

.delete-btn {
  background: #e74c3c;
  color: white;
}

.delete-btn:hover {
  background: #c0392b;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  padding: 20px 0;
}

.page-btn {
  padding: 8px 16px;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.page-btn:hover:not(:disabled) {
  background: #2980b9;
}

.page-btn:disabled {
  background: #bdc3c7;
  cursor: not-allowed;
}

.page-info {
  color: #7f8c8d;
  font-size: 14px;
}

/* 弹窗样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e9ecef;
}

.modal-header h3 {
  margin: 0;
  color: #2c3e50;
}

.close-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #7f8c8d;
  padding: 5px;
  border-radius: 4px;
  transition: background-color 0.3s ease;
}

.close-btn:hover {
  background: #f8f9fa;
}

.site-form {
  padding: 20px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #555;
  font-weight: 500;
}

.form-input, .form-textarea {
  width: 100%;
  padding: 10px;
  border: 2px solid #e1e1e1;
  border-radius: 4px;
  font-size: 14px;
  transition: border-color 0.3s ease;
}

.form-input:focus, .form-textarea:focus {
  outline: none;
  border-color: #3498db;
}

.form-textarea {
  resize: vertical;
  font-family: inherit;
}

.icon-input-group {
  display: flex;
  gap: 10px;
}

.auto-icon-btn {
  padding: 10px 15px;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  white-space: nowrap;
  transition: background-color 0.3s ease;
}

.auto-icon-btn:hover {
  background: #2980b9;
}

.auto-icon-btn:disabled {
  opacity: 0.65;
  cursor: wait;
}

.icon-status {
  margin: 8px 0 0;
  font-size: 13px;
  color: #52616b;
}

.icon-preview {
  margin-top: 10px;
  padding: 10px;
  background: #f8f9fa;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-preview img {
  width: 32px;
  height: 32px;
  object-fit: contain;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #e9ecef;
}

.cancel-btn, .submit-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.3s ease;
}

.cancel-btn {
  background: #95a5a6;
  color: white;
}

.cancel-btn:hover {
  background: #7f8c8d;
}

.submit-btn {
  background: #27ae60;
  color: white;
}

.submit-btn:hover {
  background: #219a52;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .manager-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }

  .header-actions {
    flex-wrap: wrap;
    width: 100%;
  }

  .stats-bar {
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  }

  .site-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }

  .site-actions {
    align-self: flex-end;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .icon-input-group {
    flex-direction: column;
  }
}
</style>
