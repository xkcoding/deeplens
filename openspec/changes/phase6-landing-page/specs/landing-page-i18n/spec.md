# Landing Page i18n

## ADDED Requirements

### R1: Routing Strategy

- 路由级 i18n：`/en/` 和 `/zh/`
- 根路由 `/` 重定向到 `/en/`（使用 `<meta http-equiv="refresh">` 或 Astro redirect）
- 每个语言有独立的 `.astro` 页面文件

### R2: Content Management

- 文案存储在 `src/i18n/en.json` 和 `src/i18n/zh.json`
- 页面通过 import 获取对应语言文案
- JSON 结构按板块组织（hero、features、faq 等）

### R3: Language Switcher

- Header 组件提供语言切换按钮（EN / 中文）
- 切换时跳转到对应语言路由（保持同一页面位置）
- 当前语言高亮显示

### R4: Content Localization

- 所有 UI 文案完整翻译
- 产品截图/GIF 可按语言差异化（可选）
- SEO meta tags 按语言设置（title、description、og:locale）
