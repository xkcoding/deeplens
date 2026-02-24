## Context

DeepLens 已完成 CLI + 桌面应用 + MCP Server 的核心功能，但缺少公开展示入口。需要一个产品主页承载品牌展示、功能介绍和下载引导。同时需要埋点追踪用户触达（Landing Page）和桌面端使用情况（Desktop App）。

**约束**:
- Landing Page 位于主仓库 `/site` 目录，独立 package.json
- 部署目标: Cloudflare Pages（免费、全球 CDN）
- 设计由 AI 辅助生成，无独立设计师
- 中英文双语支持

## Goals / Non-Goals

**Goals**:
- 构建 Astro SSG 产品主页，7 个核心板块
- 中英文路由级 i18n
- Cloudflare Pages 部署 + Web Analytics
- Tauri 桌面端 Aptabase 埋点

**Non-Goals**:
- 不做 SEO 深度优化（初期）
- 不做用户系统或后端 API
- 不做 A/B 测试
- 不处理 CI/CD（Phase 7 范围）

## Design

### 技术架构

```
site/                          # Landing Page (独立项目)
├── src/
│   ├── pages/
│   │   ├── index.astro        # 根路由重定向到 /en/
│   │   ├── en/
│   │   │   └── index.astro    # English homepage
│   │   └── zh/
│   │       └── index.astro    # 中文首页
│   ├── components/
│   │   ├── Hero.tsx           # React Island - Hero 板块
│   │   ├── Showcase.tsx       # React Island - 功能演示
│   │   ├── Features.tsx       # React Island - 技术亮点
│   │   ├── HowItWorks.tsx     # React Island - 上手流程
│   │   ├── Comparison.tsx     # React Island - 对比表
│   │   ├── FAQ.tsx            # React Island - 常见问题
│   │   ├── CTA.tsx            # React Island - 行动号召
│   │   ├── Header.tsx         # 导航栏 + 语言切换
│   │   └── Footer.tsx         # 页脚
│   ├── layouts/
│   │   └── Layout.astro       # 基础布局（含 <head>、主题切换）
│   └── i18n/
│       ├── en.json            # 英文文案
│       └── zh.json            # 中文文案
├── public/
│   ├── favicon.svg
│   └── images/                # 产品截图、GIF
├── astro.config.mjs
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

### 技术选型

| 模块 | 选型 | 理由 |
|------|------|------|
| 框架 | Astro 5.x (SSG) | 零 JS 默认、Islands 架构、Cloudflare 原生支持 |
| 样式 | Tailwind CSS 4.x | 与主项目一致，utility-first |
| 交互组件 | React Islands (`client:visible`) | 按需水合，最小 JS 体积 |
| i18n | 路由级（`/en/`, `/zh/`）+ JSON 文案 | 简单直接，不依赖额外库 |
| 部署 | Cloudflare Pages | 免费、全球 CDN、自动 HTTPS |
| 图标 | Lucide React | 轻量、与桌面端一致 |

### i18n 方案

路由级 i18n，不使用额外 i18n 库：

1. 根路由 `/` 重定向到 `/en/`（`<meta http-equiv="refresh">`）
2. 每个语言有独立的 `.astro` 页面文件
3. 文案存储在 `src/i18n/en.json` 和 `src/i18n/zh.json`
4. 页面通过 `import en from '../i18n/en.json'` 获取文案
5. Header 组件提供语言切换按钮，切换时跳转到对应语言路由

### 内容板块设计

| 板块 | 组件 | 水合策略 | 内容要点 |
|------|------|---------|---------|
| **Hero** | `Hero.tsx` | `client:visible` | 核心价值主张 + 产品截图/GIF + 安装命令 |
| **Showcase** | `Showcase.tsx` | `client:visible` | Tab 切换展示 4 个阶段：探索→审查→生成→问答 |
| **Features** | `Features.tsx` | `client:visible` | 6 卡片网格：主动探索、聪明简化、双层查询、MCP 集成、增量更新、双语文档 |
| **How It Works** | `HowItWorks.tsx` | `client:visible` | 4 步流程：安装→选目录→Agent 探索→浏览文档 |
| **Comparison** | `Comparison.tsx` | `client:visible` | 对比表：DeepLens vs DeepWiki（本地 vs 云端、隐私等） |
| **FAQ** | `FAQ.tsx` | `client:visible` | 手风琴展开，5-7 个 Q&A |
| **CTA** | `CTA.tsx` | `client:idle` | 下载按钮（GitHub Release 链接）+ brew 安装命令 |
| **Header** | `Header.tsx` | `client:load` | 导航 + 语言切换 + 主题切换 + GitHub Star |
| **Footer** | `Footer.tsx` | 静态 | 版权 + GitHub / Discord / X 链接 |

### 主题系统

- 使用 Tailwind `dark:` 变体
- `<html>` 添加 `class="dark"` 切换
- 默认跟随系统偏好（`prefers-color-scheme`）
- Header 提供手动切换按钮，偏好存入 `localStorage`

### 埋点设计

#### Landing Page — Cloudflare Web Analytics

在 Layout.astro 的 `<head>` 中注入 Cloudflare beacon script：
```html
<script defer src='https://static.cloudflareinsights.com/beacon.min.js'
  data-cf-beacon='{"token": "SITE_TOKEN"}'></script>
```
无需额外代码，自动采集 PV/UV/来源/设备/地域。

#### Desktop App — Aptabase

在 Tauri 前端初始化 Aptabase SDK，采集关键事件：

| 事件 | 触发时机 | 属性 |
|------|---------|------|
| `app_launch` | 应用启动 | `version`, `os`, `arch` |
| `project_analyze` | 开始分析 | `language`, `file_count` |
| `project_generate` | 开始生成 | `domain_count` |
| `search_fast` | Fast Search | — |
| `search_deep` | Deep Search | — |
| `mcp_connect` | MCP 连接 | `client_name` |
| `export_static` | 导出站点 | — |

Tauri 后端集成 `tauri-plugin-aptabase`，Cargo.toml 添加依赖。

### 响应式断点

| 断点 | 宽度 | 布局 |
|------|------|------|
| Mobile | < 768px | 单列，Hero 文字居中 |
| Tablet | 768-1024px | 双列 Features |
| Desktop | > 1024px | 三列 Features，Hero 左文右图 |

## Risks

| 风险 | 概率 | 影响 | 缓解 |
|------|------|------|------|
| AI 生成设计质量不达标 | 中 | 首页不专业 | 参考 WorkAny 风格，迭代优化 |
| Astro + React Islands 学习曲线 | 低 | 开发速度 | Astro 文档成熟，Islands 模式简单 |
| Aptabase 插件兼容性 | 低 | 桌面端埋点失败 | 官方 Tauri 2 支持，社区活跃 |
| Cloudflare Pages 构建限制 | 低 | 部署问题 | Astro 原生支持 CF Pages adapter |
