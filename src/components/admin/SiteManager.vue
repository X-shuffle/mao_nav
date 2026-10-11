<template>
  <div class="site-manager">
    <div class="manager-header">
      <h2>站点管理</h2>
      <div class="header-actions">
        <input v-model="searchQuery" type="search" class="search-input" aria-label="搜索站点" placeholder="搜索名称、网址或描述" />
        <select aria-label="筛选分类" v-model="selectedCategoryId" class="category-filter">
          <option value="">所有分类</option>
          <option v-for="category in categories" :key="category.id" :value="category.id">
            {{ category.icon }} {{ category.name }}
          </option>
        </select>
        <button @click="showAddModal = true" class="add-btn">
          ＋ 添加站点
        </button>
        <button @click="handleSave" :disabled="loading" class="save-btn">
          {{ loading ? '保存中...' : '保存到 GitHub' }}
        </button>
      </div>
    </div>

    <p v-if="saveError" role="alert" class="error-message">{{ saveError }}</p>
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
    <p v-if="!filteredSites.length" class="empty-state">{{ totalSites ? '没有匹配的站点，试试其他关键词或分类。' : '还没有站点，点击“添加站点”开始整理。' }}</p>
    <div class="sites-list">
      <div
        v-for="site in paginatedSites"
        :key="site.id"
        class="site-item"
      >
        <div class="site-info">
          <div class="site-icon">
            <SiteIcon :src="getIconDisplayUrl(site.icon)" :name="site.name" />
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
            编辑
          </button>
          <button @click="deleteSite(site)" class="delete-btn">
            删除
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
    <AdminModal :visible="!!(showAddModal || editingSite)" :title="editingSite ? '编辑站点' : '添加站点'" @close="closeModal">
        <form @submit.prevent="saveSite" class="site-form">
          <div class="form-row">
            <div class="form-group">
              <label for="sitemanager-1">站点名称 *</label>
              <input id="sitemanager-1"
                v-model="formData.name"
                required
                placeholder="请输入站点名称"
                class="form-input"
              >
            </div>
            <div class="form-group">
              <label for="sitemanager-2">所属分类 *</label>
              <select id="sitemanager-2" v-model="formData.categoryId" required class="form-input">
                <option value="">请选择分类</option>
                <option v-for="category in categories" :key="category.id" :value="category.id">
                  {{ category.icon }} {{ category.name }}
                </option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label for="sitemanager-3">站点地址 *</label>
            <input id="sitemanager-3"
              v-model="formData.url"
              type="url"
              required
              placeholder="https://example.com"
              class="form-input"
            >
          </div>

          <div class="form-group">
            <label for="sitemanager-4">站点描述</label>
            <textarea id="sitemanager-4"
              v-model="formData.description"
              placeholder="请输入站点描述"
              class="form-textarea"
              rows="3"
            ></textarea>
          </div>

          <div class="form-group">
            <label for="sitemanager-5">站点图标</label>
            <div class="icon-input-group">
              <input id="sitemanager-5"
                v-model="formData.icon"
                @input="cancelIconRequest"
                placeholder="图标URL或使用自动获取"
                class="form-input"
              >
              <button type="button" @click="autoDetectIcon" :disabled="fetchingIcon" class="auto-icon-btn">
                {{ fetchingIcon ? '获取中...' : '自动获取' }}
              </button>
            </div>
            <p v-if="iconStatus" role="status" class="icon-status">{{ iconStatus }}</p>
            <div class="icon-preview" v-if="formData.icon">
              <img :src="getIconDisplayUrl(formData.icon)" alt="图标预览" @error="iconError = true">
            </div>
          </div>

          <p v-if="formError" role="alert" class="error-message">{{ formError }}</p>
          <div class="form-actions">
            <button type="button" @click="closeModal" class="cancel-btn">取消</button>
            <button type="submit" class="submit-btn">
              {{ editingSite ? '更新' : '添加' }}
            </button>
          </div>
        </form>
    </AdminModal>
    <CustomDialog :visible="!!pendingDelete" type="error" title="删除站点" :message="`确认删除“${pendingDelete?.name || ''}”？保存到 GitHub 后才会同步到网站。`" show-cancel confirm-text="确认删除" @confirm="confirmDelete" @cancel="pendingDelete = null" @close="pendingDelete = null" />
  </div>
</template>

<script setup>
import AdminModal from './AdminModal.vue'
import SiteIcon from '../SiteIcon.vue'
import CustomDialog from './CustomDialog.vue'
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
const searchQuery = ref('')
const formError = ref('')
const saveError = ref('')
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
  const query = searchQuery.value.trim().toLocaleLowerCase()
  return allSites.value.filter(site =>
    (!selectedCategoryId.value || site.categoryId === selectedCategoryId.value) &&
    (!query || [site.name, site.url, site.description].join(' ').toLocaleLowerCase().includes(query)))
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

const pendingDelete = ref(null)
const deleteSite = (site) => { pendingDelete.value = site }
const confirmDelete = () => {
  const category = localCategories.value.find(cat => cat.id === pendingDelete.value.categoryId)
  if (category?.sites) category.sites = category.sites.filter(site => site.id !== pendingDelete.value.id)
  syncToParent()
  pendingDelete.value = null
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
    formError.value = '请选择有效的分类'
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

  formError.value = ''
  syncToParent()
  closeModal()
}

// 关闭弹窗
const closeModal = () => {
  cancelIconRequest()
  formError.value = ''
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

// 处理保存操作
const handleSave = async () => {
  saveError.value = ''
  try {
    // 先上传待处理的图标文件
    if (pendingIcons.value.size > 0) {
      await uploadPendingIconsToGitHub()
    }

    // 然后保存站点数据
    emit('save')

  } catch (error) {
    console.error('保存失败:', error)
    saveError.value = `保存失败：${error.message}`
  }
}

// 重置分页
watch([selectedCategoryId, searchQuery], () => {
  currentPage.value = 1
})
watch(totalPages, pages => { currentPage.value = Math.min(currentPage.value, Math.max(1, pages)) })
</script>
