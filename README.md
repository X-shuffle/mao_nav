# Navigation

> 一个简洁美观的个人导航网站，支持分类管理和自定义收藏夹

项目仓库：[X-shuffle/mao_nav](https://github.com/X-shuffle/mao_nav) · 生产分支：`master` · 在线访问：[nv.x-shuffle.com](https://nv.x-shuffle.com/)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Vue](https://img.shields.io/badge/Vue-3.5.17-4FC08D?logo=vue.js)](https://vuejs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4.10-646CFF?logo=vite)](https://vitejs.dev/)
[![Cloudflare](https://img.shields.io/badge/Deploy-Cloudflare%20Pages-F38020?logo=cloudflare)](https://pages.cloudflare.com/)

## ✨ 特性

- 🎨 **现代化设计** - 简洁美观的界面，支持响应式布局
- 📱 **多设备适配** - 完美支持桌面端、平板和移动端
- ⭐ **常用站点** - 星标收藏常用网站，收藏与卡片/列表视图偏好保存在本机浏览器
- 🔎 **站内搜索** - 按站点名称、描述或域名搜索，支持多个关键词
- 🔥 **分类管理** - 支持自定义分类和网站管理
- ⚡ **快速访问** - 基于 Vue 3 + Vite 构建，加载速度极快
- 🌐 **免费部署** - 支持 Cloudflare Pages 免费部署
- 🛠️ **易于定制** - 简单的配置即可个性化你的导航
- 👨‍💻 **管理界面** - 可选配置管理员界面，支持可视化添加/编辑分类和网站（需要GitHub Token）


## 🚀 快速开始

### 🚀 部署到 Cloudflare（推荐）

**1. 选择本仓库**
- 仓库：[X-shuffle/mao_nav](https://github.com/X-shuffle/mao_nav)
- 生产分支：`master`

**2. 在 Cloudflare Pages 控制台部署**
1. 访问 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 注册/登录 Cloudflare 账号（免费）
3. 点击左侧菜单 **"Workers & Pages"**
4. 点击 **"Create application"** → **"Pages"** → **"Connect to Git"**
5. 授权 GitHub 并选择 `X-shuffle/mao_nav` 仓库，生产分支设为 `master`
6. 配置构建设置：
   - **Framework preset**: `Vue`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
7.（可选）在 **Environment Variables** 里添加你的环境变量（如需用到管理员功能）
8. 点击 **"Save and Deploy"**

✅ **完成！** 几分钟后你就有了自己的导航网站，每次修改代码都会自动重新部署。

**3. 自定义你的导航**
- 编辑 `src/mock/mock_data.js` 文件，添加你自己的网站分类和链接
- 提交更改，Cloudflare 会自动重新部署

**4. 绑定自定义域名（可选）**
- 在 Cloudflare Pages 项目设置中点击 **"Custom domains"**
- 添加你的域名并按提示配置 DNS

---

### 🚀 部署到 Vercel

**1. 选择本仓库**
- 仓库：[X-shuffle/mao_nav](https://github.com/X-shuffle/mao_nav)
- 生产分支：`master`

**2. 在 Vercel 控制台部署**
1. 访问 [Vercel 官网](https://vercel.com/)
2. 注册/登录 Vercel 账号（免费）
3. 点击右上角 **"Add New"** → **"Project"**
4. 选择 `X-shuffle/mao_nav` 仓库，点击 **"Import"**
5. 保持默认设置，Vercel 会自动检测到是 Vue 项目
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
6. （可选）在 **Environment Variables** 里添加你的环境变量（如需用到管理员功能）
7. 点击 **"Deploy"**

✅ **完成！** 部署成功后会自动生成一个 vercel.app 域名，每次推送代码会自动重新部署。

**3. 自定义你的导航**
- 编辑 `src/mock/mock_data.js` 文件，添加你自己的网站分类和链接
- 提交更改，Vercel 会自动重新部署

**4. 绑定自定义域名（可选）**
- 在 Vercel 项目设置中点击 **"Domains"**
- 添加你的域名并按提示配置 DNS

### 🛠️ 配置管理员界面（可选）

如果你想使用管理员界面来可视化管理导航数据，可以配置 GitHub Token：

**1. 获取 GitHub Personal Access Token**

1. 访问 [GitHub Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens)
2. 点击 "Generate new token" → "Generate new token (fine-grained token)"
3. 设置 Token 名称，选择过期时间，并**仅选择 X-shuffle/mao_nav 仓库**
4. 在 **Repository permissions (仓库权限)** 部分，勾选以下权限：
   - `Contents` - **Read and write** ✅  
     <span style="color:#888;font-size:13px;">用于读取和修改 <code>src/mock/mock_data.js</code> 文件，这是管理系统的核心功能</span>
   - `Metadata` - **Read** ✅  
     <span style="color:#888;font-size:13px;">用于访问仓库基本信息，GitHub API 的基础权限</span>
5. 在 **Account permissions (账户权限)** 部分：  
   <span style="color:#888;font-size:13px;">不需要勾选任何账户权限 ❌，我们只操作特定仓库，不需要账户级别的权限</span>
6. 点击 "Generate token" 并复制生成的 Token（只显示一次）

**2. 配置环境变量**

- **如果你在 _自己的服务器_ 部署：**  
  在项目根目录创建 `.env` 文件，添加以下配置：

- **如果你使用 _Vercel_ 或 _Cloudflare Pages_ 部署：**  
  请在对应平台的「环境变量」设置界面，添加下方这些变量，无需在项目中创建 `.env` 文件。

```
# 管理员密钥（自定义）
VITE_ADMIN_PASSWORD=your_admin_password_here

# GitHub Token
VITE_GITHUB_TOKEN=your_github_token_here
# 本仓库：X-shuffle/mao_nav，生产分支：master
VITE_GITHUB_OWNER=X-shuffle
VITE_GITHUB_REPO=mao_nav
VITE_GITHUB_BRANCH=master
```


### 本地开发

1. **克隆项目**
```bash
git clone https://github.com/X-shuffle/mao_nav.git
cd mao_nav
```

2. **安装依赖**
```bash
npm install
```

3. **启动开发服务器**
```bash
npm run dev
```

4. **打开浏览器访问** `http://localhost:5173`

### 项目结构

```
mao_nav/
├── src/
│   ├── apis/           # API 接口
│   ├── assets/         # 静态资源（图片、样式等）
│   ├── components/     # Vue 组件
│   ├── mock/          # 模拟数据
│   ├── router/        # 路由配置
│   ├── stores/        # Pinia 状态管理
│   ├── views/         # 页面组件
│   ├── App.vue        # 根组件
│   └── main.js        # 入口文件
├── public/            # 公共静态文件
├── index.html         # HTML 模板
├── package.json       # 项目配置
├── vite.config.js     # Vite 配置
└── wrangler.toml      # Cloudflare 部署配置
```

## 🎯 自定义配置

### 修改导航数据

有两种方式来自定义你的导航分类和网站：

**方式1：直接编辑文件（推荐）**
编辑 `src/mock/mock_data.js` 文件来自定义你的导航分类和网站：

```javascript
export const mockData = {
  categories: [
    {
      id: "my-favorites",
      name: "我的常用",
      icon: "💥",
      order: 0,
      sites: [
        {
          id: "example",
          name: "示例网站",
          url: "https://example.com",
          description: "网站描述",
          icon: "https://example.com/favicon.ico"
        }
      ]
    }
  ]
}
```

**方式2：使用管理员界面（可选）**
如果你配置了管理员界面（见上方配置说明），可以通过以下步骤可视化管理：

1. 访问 `http://localhost:5173/admin` 或 `https://nv.x-shuffle.com/admin`
2. 输入管理员密钥登录
3. 在界面中添加、编辑或删除分类和网站
4. 点击"保存到GitHub"按钮保存更改
5. 系统会自动在 2-3 分钟内重新部署

### 自定义样式

- 主要样式文件：`src/assets/main.css`
- 基础样式：`src/assets/base.css`


## 🛠️ 开发命令

```bash
# 开发模式
npm run dev

# 构建生产版本
npm run build

# 预览生产版本
npm run preview

# 代码检查和修复
npm run lint
```

## 📋 部署清单

在部署前请检查：

- [ ] 已修改 `src/mock/mock_data.js` 为你的个人数据
- [ ] 已更新 `package.json` 中的项目信息
- [ ] 已配置 Cloudflare 账号（用于部署）
- [ ] 已测试构建命令 `npm run build`
- [ ] 已验证 `dist` 目录生成正常
- [ ] （可选）已配置管理员界面的环境变量

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork [X-shuffle/mao_nav](https://github.com/X-shuffle/mao_nav)
2. 创建你的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的修改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开一个 Pull Request

## 📄 许可证

本项目基于 MIT 许可证开源 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🙏 致谢

- [Vue.js](https://vuejs.org/) - 渐进式 JavaScript 框架
- [Vite](https://vitejs.dev/) - 下一代前端构建工具
- [Cloudflare Pages](https://pages.cloudflare.com/) - 现代化的 JAMstack 平台
- [Pinia](https://pinia.vuejs.org/) - Vue.js 状态管理库

## 📞 联系方式

如果你有任何问题或建议，欢迎通过以下方式联系：

- 提交 [Issue](https://github.com/X-shuffle/mao_nav/issues)
- 发起 [Discussion](https://github.com/X-shuffle/mao_nav/discussions)

---

⭐ 如果这个项目对你有帮助，请给它一个 Star！
