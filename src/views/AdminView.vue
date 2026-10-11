<template>
  <div class="admin-container admin-ui">
    <!-- 登录界面 -->
    <div v-if="!isAuthenticated" class="login-container">
      <div class="login-box">
        <a class="admin-brand" href="/">Navigation<span>导航站管理</span></a>
        <h1>登录管理后台</h1>
        <p class="login-description">管理你的分类、站点与网站设置。</p>
        <form @submit.prevent="handleLogin">
          <div class="form-group">
            <label for="password">管理密钥:</label>
            <input
              id="password"
              type="password"
              v-model="loginPassword"
              placeholder="请输入管理密钥"
              required
              class="form-input"
              autocomplete="current-password"
              :aria-invalid="!!loginError"
              aria-describedby="login-error"
            />
          </div>
          <button type="submit" class="login-btn" :disabled="loading">
            {{ loading ? '验证中...' : '登录' }}
          </button>
        </form>
        <div v-if="loginError" id="login-error" role="alert" class="error-message">
          {{ loginError }}
        </div>
        <a href="/" class="back-home">← 返回导航首页</a>
      </div>
    </div>

    <!-- 管理界面 -->
    <div v-else class="admin-dashboard">
      <!-- 顶部导航 -->
      <header class="admin-header">
        <div class="header-content">
          <a class="admin-brand" href="/">Navigation<span>管理后台</span></a>
          <div class="header-actions">
            <button @click="emergencyReset" class="emergency-btn" hidden="true">🚨 紧急重置</button>
            <button @click="debugLoadData" class="debug-btn" hidden="true">🔍 调试加载</button>
            <a href="/" class="home-link">查看首页 ↗</a>
            <button @click="logout" class="logout-btn">退出</button>
          </div>
        </div>
      </header>

      <!-- 主要内容 -->
      <main class="admin-main">
        <!-- 加载状态显示 -->
        <div v-if="loading" class="loading-overlay">
          <div class="loading-content">
            <div class="loading-spinner"></div>
            <p>正在加载数据...</p>
            <button @click="skipLoading" class="skip-loading-btn">跳过加载</button>
          </div>
        </div>

        <nav class="admin-tabs" aria-label="后台导航">
          <button
            class="tab-btn"
            :class="{ active: activeTab === 'categories' }"
            :aria-pressed="activeTab === 'categories'"
            @click="activeTab = 'categories'"
          >
            分类管理
          </button>
          <button
            class="tab-btn"
            :class="{ active: activeTab === 'sites' }"
            :aria-pressed="activeTab === 'sites'"
            @click="switchToSiteTab"
          >
            站点管理
          </button>
          <button
            class="tab-btn"
            :class="{ active: activeTab === 'settings' }"
            :aria-pressed="activeTab === 'settings'"
            @click="activeTab = 'settings'"
          >
            系统设置
          </button>
        </nav>

        <p v-if="hasUnsavedChanges" class="unsaved-notice" role="status">有尚未保存的修改。点击“保存到 GitHub”同步到网站。</p>

        <!-- 分类管理 -->
        <div v-if="activeTab === 'categories'" class="tab-content">
          <CategoryManager
            :categories="categories"
            @update="handleCategoriesUpdate"
            @save="saveToGitHub"
            @viewSites="switchToSiteManager"
            :loading="saving"
          />
        </div>

        <!-- 站点管理 -->
        <div v-if="activeTab === 'sites'" class="tab-content">
          <SiteManager
            :categories="categories"
            :initialSelectedCategoryId="selectedCategoryId"
            @update="handleCategoriesUpdate"
            @save="saveToGitHub"
            :loading="saving"
          />
        </div>

        <!-- 系统设置 -->
        <div v-if="activeTab === 'settings'" class="tab-content">
          <SystemSettings />
        </div>
      </main>
    </div>

    <!-- 自定义弹框 -->
    <CustomDialog
      :visible="dialogVisible"
      :type="dialogType"
      :title="dialogTitle"
      :message="dialogMessage"
      :details="dialogDetails"
      @close="closeDialog"
      @confirm="closeDialog"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import '../assets/admin.css'
import { useRouter } from 'vue-router'
import CategoryManager from '../components/admin/CategoryManager.vue'
import SiteManager from '../components/admin/SiteManager.vue'
import SystemSettings from '../components/admin/SystemSettings.vue'
import CustomDialog from '../components/admin/CustomDialog.vue'
import { useGitHubAPI } from '../apis/useGitHubAPI.js'

const router = useRouter()
const { saveCategoriesToGitHub, loadCategoriesFromGitHub } = useGitHubAPI()

// 认证状态
const isAuthenticated = ref(false)
const loginPassword = ref('')
const loginError = ref('')
const loading = ref(false)
const saving = ref(false)
const hasUnsavedChanges = ref(false)

// 管理界面状态
const activeTab = ref('categories')
const categories = ref([])
const navTitle = ref('Navigation') // 保存网站标题
const selectedCategoryId = ref('') // 用于站点管理的选中分类

// 紧急兜底：如果5秒后loading还是true，强制重置
setTimeout(() => {
  if (loading.value) {
    console.warn('检测到loading状态异常，强制重置')
    loading.value = false
    // 确保至少有基本数据
    if (categories.value.length === 0) {
      categories.value = [
        {
          id: 'default',
          name: '默认分类',
          icon: '📁',
          order: 0,
          sites: []
        }
      ]
    }
  }
}, 5000)

// 自定义弹框状态
const dialogVisible = ref(false)
const dialogType = ref('success')
const dialogTitle = ref('')
const dialogMessage = ref('')
const dialogDetails = ref([])

// 验证管理员密钥
const handleLogin = async () => {
  loading.value = true
  loginError.value = ''

  try {
    const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD
    if (!adminPassword) {
      throw new Error('管理密钥未配置，请配置环境变量')
    }

    if (loginPassword.value === adminPassword) {
      isAuthenticated.value = true
      localStorage.setItem('admin_authenticated', 'true')

      // 登录成功后，不立即加载数据，让用户进入管理界面
      console.log('登录成功，准备进入管理界面')

      // 延迟加载，避免阻塞登录流程
      setTimeout(async () => {
        try {
          await loadCategories()
        } catch (error) {
          console.error('登录后数据加载失败:', error)
          loading.value = false
        }
      }, 500)
    } else {
      throw new Error('密钥错误，请重新输入')
    }
  } catch (error) {
    loginError.value = error.message
  } finally {
    // 确保登录流程的loading状态被重置
    if (!isAuthenticated.value) {
      loading.value = false
    }
  }
}

// 退出登录
const logout = () => {
  isAuthenticated.value = false
  localStorage.removeItem('admin_authenticated')
  loginPassword.value = ''
  router.push('/')
}

// 调试加载数据
const debugLoadData = async () => {
  console.log('=== 开始调试加载数据 ===')
  console.log('当前环境变量:', {
    VITE_GITHUB_TOKEN: import.meta.env.VITE_GITHUB_TOKEN ? '已配置' : '未配置',
    VITE_GITHUB_OWNER: import.meta.env.VITE_GITHUB_OWNER,
    VITE_GITHUB_REPO: import.meta.env.VITE_GITHUB_REPO,
    VITE_GITHUB_BRANCH: import.meta.env.VITE_GITHUB_BRANCH
  })

  try {
    console.log('直接调用loadCategoriesFromGitHub...')
    const data = await loadCategoriesFromGitHub()
    console.log('调用成功，返回数据:', data)

    showDialog(
      'success',
      '🎉 调试成功',
      '直接调用GitHub API成功',
      [`• 数据类型: ${typeof data}`, `• 包含categories: ${!!data.categories}`, `• 分类数量: ${data.categories?.length || 0}`]
    )
  } catch (error) {
    console.error('直接调用失败:', error)
    showDialog(
      'error',
      '❌ 调试失败',
      '直接调用GitHub API失败',
      [`• 错误信息: ${error.message}`, `• 错误类型: ${error.constructor.name}`]
    )
  }
}

// 加载分类数据（简化版本，暂时只加载本地数据）
const loadCategories = async () => {
  console.log('🔍 开始加载分类数据（简化版本）')
  loading.value = true

  try {
    // 直接加载本地数据，避免GitHub API调用
    const { mockData } = await import('../mock/mock_data.js')
    categories.value = mockData.categories || []
    navTitle.value = mockData.title || 'Navigation'
    console.log('✅ 本地数据加载成功，分类数量:', categories.value.length)
  } catch (error) {
    console.error('❌ 本地数据加载失败:', error)
    // 最后兜底：使用空数组
    categories.value = []
    navTitle.value = 'Navigation'
  } finally {
    // 确保loading状态被重置
    loading.value = false
    console.log('🔍 数据加载完成，loading状态重置')
  }
}

// 处理分类更新
const handleCategoriesUpdate = (newCategories) => {
  categories.value = newCategories
  hasUnsavedChanges.value = true
}

// 切换到站点管理并选中对应分类
const switchToSiteManager = (categoryId) => {
  selectedCategoryId.value = categoryId
  activeTab.value = 'sites'
}

// 手动切换到站点管理标签
const switchToSiteTab = () => {
  selectedCategoryId.value = '' // 清空选中分类，显示所有站点
  activeTab.value = 'sites'
}

// 显示弹框
const showDialog = (type, title, message, details = []) => {
  dialogType.value = type
  dialogTitle.value = title
  dialogMessage.value = message
  dialogDetails.value = details
  dialogVisible.value = true
}

// 关闭弹框
const closeDialog = () => {
  dialogVisible.value = false
}

// 跳过加载
const skipLoading = async () => {
  console.log('用户选择跳过加载')
  loading.value = false

  // 尝试加载本地数据
  try {
    const { mockData } = await import('../mock/mock_data.js')
    categories.value = mockData.categories || []
    navTitle.value = mockData.title || 'Navigation'
    console.log('跳过加载后，使用本地数据:', categories.value.length)
  } catch (error) {
    console.error('跳过加载时，本地数据加载失败:', error)
    // 最基本的兜底数据
    categories.value = [
      {
        id: 'default',
        name: '默认分类',
        icon: '📁',
        order: 0,
        sites: []
      }
    ]
    navTitle.value = 'Navigation'
  }

  showDialog(
    'info',
    '⏭️ 已跳过加载',
    '已跳过GitHub数据加载，当前使用本地数据',
    [`• 分类数量: ${categories.value.length}`, `• 可在系统设置中重新尝试连接GitHub`]
  )
}

// 保存到GitHub
const saveToGitHub = async () => {
  saving.value = true
  const snapshot = JSON.stringify({ categories: categories.value, title: navTitle.value })
  try {
    // 保存完整的数据结构，包括title字段
    await saveCategoriesToGitHub(JSON.parse(snapshot))
    hasUnsavedChanges.value = snapshot !== JSON.stringify({ categories: categories.value, title: navTitle.value })
    showDialog(
      'success',
      '保存成功',
      '您的更改已成功保存到GitHub仓库！',
      [
        '• 更改将在 2-3 分钟内自动部署到线上',
        '• 部署完成后，您可以在前台页面看到最新内容',
        '• 可在 Cloudflare Pages 中查看部署进度'
      ]
    )
  } catch (error) {
    showDialog(
      'error',
      '❌ 保存失败',
      '保存过程中发生错误，请重试',
      [`• 错误详情: ${error.message}`]
    )
  } finally {
    saving.value = false
  }
}

// 紧急重置加载状态
const emergencyReset = () => {
  console.log('用户点击紧急重置按钮，强制重置loading状态')
  loading.value = false
  // 强制DOM更新，确保loading状态同步到模板
  setTimeout(() => {
    console.log('🔍 延迟检查loading状态:', loading.value)
    console.log('🔍 DOM中loading元素:', document.querySelector('.loading-overlay'))
    console.log('🔍 DOM中tab按钮:', document.querySelectorAll('.tab-btn'))

    // 如果loading overlay仍然存在，强制隐藏
    const loadingOverlay = document.querySelector('.loading-overlay')
    if (loadingOverlay) {
      console.warn('🔍 发现loading overlay仍然存在，强制隐藏')
      loadingOverlay.style.display = 'none'
    }
  }, 100)
  showDialog(
    'info',
    '⚠️ 加载状态已重置',
    '已强制重置加载状态，请刷新页面查看效果。',
    []
  )
}

// 组件挂载时检查认证状态
onMounted(() => {
  console.log('🔍 AdminView组件开始挂载')

  // 立即强制重置loading状态，避免卡死
  loading.value = false

  const savedAuth = localStorage.getItem('admin_authenticated')
  if (savedAuth === 'true') {
    console.log('🔍 检测到已登录状态')
    isAuthenticated.value = true

    // 直接使用本地数据，不调用GitHub API
    console.log('🔍 直接加载本地数据，跳过GitHub API调用')
    try {
      // 使用同步方式加载本地数据
      import('../mock/mock_data.js').then(({ mockData }) => {
        categories.value = mockData.categories || []
        navTitle.value = mockData.title || 'Navigation'
        console.log('🔍 本地数据加载成功，分类数量:', categories.value.length)
      }).catch(error => {
        console.error('🔍 本地数据加载失败:', error)
        categories.value = []
        navTitle.value = 'Navigation'
      })
    } catch (error) {
      console.error('🔍 数据加载异常:', error)
      categories.value = []
      navTitle.value = 'Navigation'
    }
  }

  console.log('🔍 AdminView组件挂载完成')
})
</script>
