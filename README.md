# Todo List 看板应用

基于 Next.js 15 和 Supabase 构建的现代化 Todo List 看板应用，提供完整的任务管理和团队协作功能。

## 🚀 功能特性

### 🔐 身份验证系统
- Google OAuth 和 GitHub OAuth 登录
- 用户会话管理和状态持久化
- 受保护路由和自动重定向

### 📋 看板管理
- 看板列表展示和创建
- 四列任务状态布局（待办/进行中/完成/失败）
- 任务卡片 CRUD 操作

### 🎯 拖放功能
- 使用 @dnd-kit 实现流畅的卡片拖放操作
- 支持跨列表移动任务
- 实时状态更新和位置调整

### ⚡ 实时同步
- 基于 Supabase WebSocket 的多用户实时数据同步
- 多设备同步支持
- 自动更新看板、列表和卡片变更

### 🎨 现代化 UI
- 响应式设计，完全适配桌面和移动设备
- 使用 Tailwind CSS 实现现代化视觉设计
- 优雅的加载状态和错误处理

## 🛠️ 技术栈

- **前端**: React 18 + TypeScript + Vite
- **后端**: Supabase (PostgreSQL + 实时订阅 + OAuth认证)
- **样式**: Tailwind CSS
- **拖放**: @dnd-kit/core
- **UI组件**: @headlessui/react + @heroicons/react
- **状态管理**: React Context + Zustand

## 📦 安装和运行

### 1. 克隆项目
```bash
git clone <repository-url>
cd next-supabase-demo
```

### 2. 安装依赖
```bash
pnpm install
```

### 3. 环境配置
创建 `.env` 文件并配置 Supabase 环境变量：
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_URL=your_supabase_url
```

### 4. 数据库设置
在 Supabase 中执行 `supabase/migrations/001_initial_schema.sql` 脚本创建数据库表结构。

### 5. 启动开发服务器
```bash
pnpm run dev
```

应用将在 http://localhost:5173 启动。

## 🚀 部署到 Vercel

### 自动部署（推荐）
1. 将代码推送到 GitHub 仓库
2. 在 Vercel 中导入项目
3. 配置环境变量：
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. 部署完成

### 手动部署
```bash
# 构建项目
pnpm run build

# 使用 Vercel CLI 部署
npx vercel --prod
```

## 📁 项目结构

```
src/
├── components/          # 可复用组件
├── contexts/           # React Context
├── hooks/              # 自定义 Hooks
├── lib/                # 工具库和配置
├── pages/              # 页面组件
├── types/              # TypeScript 类型定义
supabase/
└── migrations/         # 数据库迁移脚本
```

## 🗄️ 数据库架构

- **user_profiles**: 用户配置信息
- **boards**: 看板数据
- **lists**: 任务列表
- **cards**: 任务卡片

所有表都启用了行级安全策略 (RLS)，确保多租户数据隔离。

## 🔧 开发脚本

```bash
# 开发模式
pnpm run dev

# 类型检查
pnpm run check

# 构建生产版本
pnpm run build

# 预览构建结果
pnpm run preview

# 代码检查
pnpm run lint
```

## 📄 许可证

MIT License
