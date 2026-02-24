# Phase 6: Landing Page + 埋点 — Tasks

## Group 1: Astro 项目初始化

- [x] 1.1 在 `/site` 目录初始化 Astro 项目（`npm create astro@latest`）
- [x] 1.2 安装依赖：`@astrojs/react`, `@astrojs/tailwind`, `tailwindcss`, `react`, `react-dom`, `lucide-react`
- [x] 1.3 配置 `astro.config.mjs`（React + Tailwind 集成）
- [x] 1.4 配置 `tailwind.config.ts`（与主项目风格一致）
- [x] 1.5 创建 `Layout.astro` 基础布局（`<head>` + 主题切换 script + slot）

## Group 2: i18n 配置

- [x] 2.1 创建 `src/i18n/en.json` 和 `src/i18n/zh.json` 文案文件
- [x] 2.2 创建根路由 `src/pages/index.astro`（重定向到 `/en/`）
- [x] 2.3 创建 `src/pages/en/index.astro` 和 `src/pages/zh/index.astro`
- [x] 2.4 实现 i18n helper（获取当前语言、切换语言路由）

## Group 3: UI 组件实现

- [x] 3.1 实现 `Header.tsx`（导航 + 语言切换 + 主题切换 + GitHub Star）
- [x] 3.2 实现 `Hero.tsx`（价值主张 + 产品截图/GIF + 安装命令）
- [x] 3.3 实现 `Showcase.tsx`（Tab 切换展示 4 阶段功能）
- [x] 3.4 实现 `Features.tsx`（6 卡片网格，响应式布局）
- [x] 3.5 实现 `HowItWorks.tsx`（4 步流程图）
- [x] 3.6 实现 `Comparison.tsx`（DeepLens vs DeepWiki 对比表）
- [x] 3.7 实现 `FAQ.tsx`（手风琴展开 5-7 Q&A）
- [x] 3.8 实现 `CTA.tsx`（下载按钮 + brew 安装命令）
- [x] 3.9 实现 `Footer.tsx`（版权 + 社交链接）

## Group 4: 主题与响应式

- [x] 4.1 实现深色/浅色主题切换（`localStorage` + `prefers-color-scheme`）
- [x] 4.2 响应式断点适配（Mobile < 768px / Tablet 768-1024px / Desktop > 1024px）
- [x] 4.3 视觉风格调优（与桌面应用一致，参考 WorkAny 风格）

## Group 5: Landing Page 埋点（PostHog）

- [x] 5.1 在 Layout.astro 注入 PostHog snippet（`person_profiles: 'anonymous'`）
- [x] 5.2 通过环境变量注入 project key（`PUBLIC_POSTHOG_KEY`）
- [x] 5.3 开发环境不加载（`import.meta.env.PROD` 判断）
- [x] 5.4 实现自定义事件：`cta_click`, `nav_click`, `lang_switch`, `faq_toggle`
- [ ] 5.5 PostHog 后台配置下载漏斗（Hero View → CTA Click → GitHub Release）

## Group 6: Desktop App 埋点（PostHog）

- [x] 6.1 安装 `posthog-js`，在 App 入口初始化（`autocapture: false`, `disable_session_recording: true`）
- [x] 6.2 通过环境变量注入 project key（`VITE_POSTHOG_KEY`，与 Landing Page 共用）
- [x] 6.3 实现 `app_launch` 事件（App 组件 useEffect）
- [x] 6.4 实现 `project_analyze` / `project_generate` 事件
- [x] 6.5 实现 `search_fast` / `search_deep` 事件
- [x] 6.6 实现 `mcp_connect` / `export_static` 事件
- [x] 6.7 实现 UI 交互事件：`button_click`, `tab_switch`, `page_view`
- [x] 6.8 开发环境 `posthog.opt_out_capturing()` 禁用上报

## Group 7: Cloudflare Pages 部署

- [ ] 7.1 配置 Cloudflare Pages 项目（连接 GitHub 仓库，设置 build command）
- [ ] 7.2 配置自定义域名
- [ ] 7.3 配置环境变量（PostHog project key）
- [ ] 7.4 验证部署：中英文页面、主题切换、埋点上报

## Group 8: 验证

- [x] 8.1 本地 `astro dev` 运行无报错
- [x] 8.2 `astro build` 构建成功
- [ ] 8.3 响应式 + 主题切换 + 语言切换功能验证
- [ ] 8.4 PostHog Landing Page 事件上报验证（PV + 自定义事件）
- [ ] 8.5 PostHog Desktop 事件上报验证（业务事件 + UI 交互事件）
