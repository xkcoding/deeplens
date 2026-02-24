## Why

DeepLens 作为产品缺少公开的展示入口。用户无法快速了解产品价值、功能特性和安装方式。需要一个产品主页来承载品牌展示、功能介绍和下载引导，同时接入统一埋点追踪用户触达和桌面端使用情况。

## What Changes

- **新建 Landing Page**: 基于 Astro (SSG) 构建产品主页，部署在 Cloudflare Pages
- **中英文双语**: 路由级 i18n，支持 `/en/` 和 `/zh/` 路径
- **内容板块**: Hero、Showcase（核心功能演示）、Features（6 大技术亮点）、How It Works（4 步上手）、Comparison（对比 DeepWiki）、FAQ、CTA（下载按钮）、Footer
- **统一埋点**: Landing Page + Desktop App 统一接入 PostHog Cloud，一个 project key 覆盖全端，支持 PV/UV、自定义事件、漏斗分析、CTR 计算
- **设计**: AI 辅助设计生成，深色/浅色主题切换，响应式布局，与桌面应用视觉风格一致

## Capabilities

### New Capabilities
- `landing-page`: Astro SSG 产品主页，包含 Hero/Showcase/Features/How It Works/Comparison/FAQ/CTA/Footer 板块
- `landing-page-i18n`: 中英文路由级 i18n 支持
- `landing-page-analytics`: PostHog Cloud 埋点接入（Landing Page 侧），追踪 PV/UV、按钮点击 CTR、页面漏斗
- `desktop-analytics`: PostHog Cloud 埋点接入（Desktop 侧），追踪关键业务事件 + UI 交互行为

### Modified Capabilities
（无已有 spec 的需求变更）

## Impact

- **新增目录**: `/site`（Astro 项目，独立 package.json）
- **依赖**: astro, tailwindcss, @astrojs/react, posthog-js
- **部署**: Cloudflare Pages，需配置域名和 CI/CD
- **Tauri 改动**: `ui/` 前端需集成 PostHog JS SDK
- **CI**: 后续 Phase 7 会增加 GitHub Actions 构建 `/site`
