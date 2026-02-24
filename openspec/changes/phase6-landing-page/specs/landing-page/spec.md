# Landing Page

## ADDED Requirements

### R1: Project Setup

- 位于主仓库 `/site` 目录，独立 `package.json`
- 框架: Astro 5.x (SSG)
- 样式: Tailwind CSS 4.x
- 交互组件: React Islands (`client:visible` / `client:idle` / `client:load`)
- 图标: Lucide React

### R2: Content Sections

8 个内容板块，按以下顺序排列：

| 板块 | 组件 | 水合策略 | 内容 |
|------|------|---------|------|
| **Header** | `Header.tsx` | `client:load` | Logo + 导航 + 语言切换 + 主题切换 + GitHub Star |
| **Hero** | `Hero.tsx` | `client:visible` | 核心价值主张 + 产品截图/GIF + 安装命令 |
| **Showcase** | `Showcase.tsx` | `client:visible` | Tab 切换展示：探索→审查→生成→问答 |
| **Features** | `Features.tsx` | `client:visible` | 6 卡片网格：主动探索、聪明简化、双层查询、MCP 集成、增量更新、双语文档 |
| **How It Works** | `HowItWorks.tsx` | `client:visible` | 4 步流程图 |
| **Comparison** | `Comparison.tsx` | `client:visible` | 对比表格（DeepLens vs DeepWiki） |
| **FAQ** | `FAQ.tsx` | `client:visible` | 手风琴展开，5-7 个 Q&A |
| **CTA** | `CTA.tsx` | `client:idle` | 下载按钮 + brew 安装命令 |
| **Footer** | `Footer.tsx` | 静态 | 版权 + GitHub / Discord / X 链接 |

### R3: Theme System

- 深色/浅色双主题
- 使用 Tailwind `dark:` 变体
- 默认跟随系统偏好（`prefers-color-scheme`）
- Header 提供手动切换按钮
- 偏好存入 `localStorage`

### R4: Responsive Design

| 断点 | 宽度 | 布局要求 |
|------|------|---------|
| Mobile | < 768px | 单列，Hero 文字居中，汉堡菜单 |
| Tablet | 768-1024px | 双列 Features |
| Desktop | > 1024px | 三列 Features，Hero 左文右图 |

### R5: Design Style

- 现代简约风格
- 与 DeepLens 桌面应用视觉风格一致
- AI 辅助设计生成（`/ui-ux-pro-max` skill）
- 参考 [WorkAny](https://workany.ai/) 整体风格
