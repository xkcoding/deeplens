# DeepLens - 需求规格说明书 v2

> **版本**: 2.0.0
> **日期**: 2026-02-22
> **状态**: 已确认
> **前置**: Phase 1-4 已全部完成，见 `specs/requirements.md`

---

## 1. 概述

本文档定义 DeepLens Phase 5/6/7 的需求，聚焦三个方向：

| Phase | 方向 | 优先级 | 目标 |
|-------|------|--------|------|
| Phase 5 | 中英文文档支持 | P0 - 最高 | 生成双语文档，VitePress i18n |
| Phase 6 | Landing Page + 埋点 | P1 - 高 | 产品主页上线，用户触达 |
| Phase 7 | 自动更新 + 分发 | P2 - 中 | CI/CD + Brew + 桌面端自动更新 |

---

## 2. Phase 5: 中英文文档支持

### 2.1 目标

Generator Agent 生成英文文档后，自动翻译为中文，VitePress 配置 i18n 支持双语切换。

### 2.2 翻译流程

```
Generator Agent (Claude)
    │
    ├── 遍历每个 Domain
    │   │
    │   ├── 生成 Hub Doc (EN) ───► 写入 /en/domains/{id}/index.md
    │   ├── 生成 Spoke Docs (EN) ─► 写入 /en/domains/{id}/{spoke}.md
    │   │
    │   │   ↓ 本 Domain 全部英文文档完成后
    │   │
    │   ├── 翻译 Hub Doc (ZH) ───► 写入 /zh/domains/{id}/index.md
    │   └── 翻译 Spoke Docs (ZH) ─► 写入 /zh/domains/{id}/{spoke}.md
    │
    ├── 生成 Overview (EN) → 翻译 → Overview (ZH)
    └── 生成 Summary (EN) → 翻译 → Summary (ZH)
```

### 2.3 翻译引擎

**选型**: Claude Agent SDK（同一 Agent 会话内完成翻译）

**理由**:
- 不打断生成流程，Hub+Spokes 写完英文后紧接着在同一 Agent 会话中翻译
- Claude 对 Markdown 格式保持最好，不会破坏 Mermaid 图表语法
- 翻译质量高于通用翻译 API，能理解技术上下文
- 翻译只在生成阶段发生（一次性），不影响日常问答成本

### 2.4 翻译规则

- **保留不翻译的内容**：
  - Mermaid 图表代码块内容
  - 内联代码（\`backtick\` 中的内容）
  - 代码块（fenced code blocks）
  - 文件路径和 URL
  - 英文技术专有名词（需保持原文，可附中文注释）
- **需要翻译的内容**：
  - 所有正文文本
  - 标题（H1-H6）
  - 列表项说明文字
  - 表格中的描述性文字
- **术语一致性**：翻译时应保持同一术语在整个文档站点中的译法一致

### 2.5 VitePress i18n 配置

**目录结构**:

```
.deeplens/docs/
├── en/                          # 英文（默认语言）
│   ├── index.md                 # Overview
│   ├── summary.md               # Summary
│   └── domains/
│       ├── {domain-id}/
│       │   ├── index.md         # Hub doc
│       │   ├── {spoke-1}.md     # Spoke doc
│       │   └── {spoke-2}.md
│       └── ...
├── zh/                          # 中文
│   ├── index.md
│   ├── summary.md
│   └── domains/
│       └── (同 en/ 结构)
└── .vitepress/
    └── config.ts                # i18n 配置
```

**VitePress 配置要求**:
- 默认语言为英文 (`/en/`)
- 顶部导航栏显示语言切换按钮（EN / 中文）
- 侧边栏按语言独立生成
- 搜索功能支持当前语言
- URL 结构: `/en/domains/auth/` 和 `/zh/domains/auth/`

### 2.6 子任务

| 子任务 | 说明 |
|--------|------|
| 5.1 Generator Prompt 扩展 | 修改 Deep Writer Prompt，增加翻译指令 |
| 5.2 翻译 write_file 工具调用 | Agent 生成英文后调用 write_file 写入 /zh/ 目录 |
| 5.3 VitePress i18n 配置生成 | 自动生成支持 i18n 的 config.ts 和双语 sidebar |
| 5.4 增量更新适配 | Git 增量更新时同步更新中文翻译 |

---

## 3. Phase 6: Landing Page + 埋点

### 3.1 目标

构建 DeepLens 产品主页，部署在 Cloudflare Pages，支持中英文，接入基础埋点。

### 3.2 技术选型

| 模块 | 选型 | 理由 |
|------|------|------|
| 框架 | **Astro** (SSG) | 极致轻量、构建快、Cloudflare 部署丝滑 |
| 样式 | **Tailwind CSS** | 与主项目一致 |
| 交互组件 | **React Islands** | 按需水合，最小 JS 体积 |
| i18n | **astro-i18n** / 路由级 i18n | 中英文双语 |
| 部署 | **Cloudflare Pages** | 免费、全球 CDN、自动 HTTPS |
| 域名 | `deeplens.dev` 或 `no-bug.dev`（待定） | — |

### 3.3 项目位置

Landing Page 代码位于主仓库 `/site` 目录，与 DeepLens 主项目统一管理。

```
deeplens/
├── src/           # DeepLens 主项目
├── ui/            # Tauri 前端
├── src-tauri/     # Tauri Rust 后端
└── site/          # Landing Page (Astro)
    ├── src/
    │   ├── pages/
    │   │   ├── en/
    │   │   └── zh/
    │   ├── components/
    │   ├── layouts/
    │   └── i18n/
    ├── public/
    ├── astro.config.mjs
    └── package.json
```

### 3.4 内容板块

参考 [WorkAny](https://workany.ai/) 风格，包含以下板块：

| 板块 | 内容 | 说明 |
|------|------|------|
| **Hero** | 核心价值主张 + 产品截图/GIF | "AI-Powered Code Archaeologist" |
| **Showcase** | 核心功能演示 | 探索 → 大纲审查 → 文档生成 → Q&A |
| **Features** | 6 大技术亮点 | 主动探索、聪明简化、双层查询、MCP 集成等 |
| **How It Works** | 4 步上手流程 | 安装 → 选目录 → Agent 探索 → 浏览文档 |
| **Comparison** | 对比 DeepWiki | 差异化卖点表格 |
| **FAQ** | 常见问题 | 5-7 个 Q&A |
| **CTA** | 行动号召 | 下载按钮（链接 GitHub Release） |
| **Footer** | 版权 + 社交链接 | GitHub / Discord / X |

### 3.5 设计资源

无独立设计师参与，使用 AI 辅助设计生成（`/ui-ux-pro-max` skill）。

设计要求：
- 深色/浅色主题切换
- 响应式布局（Desktop / Tablet / Mobile）
- 现代简约风格
- 与 DeepLens 桌面应用视觉风格一致

### 3.6 埋点方案

#### Landing Page 埋点

**工具**: Cloudflare Web Analytics

**理由**:
- 部署在 Cloudflare Pages，原生集成，零额外配置
- 免费，无使用限制
- 无 Cookie，隐私友好
- 自动采集 PV / UV / 来源 / 地域 / 设备

**采集指标**:
- 页面浏览量（PV）
- 独立访客（UV）
- 流量来源（Referrer）
- 设备类型和浏览器
- 地域分布

#### Desktop App 埋点

**工具**: Aptabase

**理由**:
- 专为 Tauri / Electron 桌面应用设计
- 官方 Tauri 插件 `tauri-plugin-aptabase`
- 隐私友好（不收集 PII）
- 免费额度满足早期需求（20K 事件/月）

**采集事件**:

| 事件名 | 触发时机 | 属性 |
|--------|---------|------|
| `app_launch` | 应用启动 | `version`, `os`, `arch` |
| `project_analyze` | 开始分析项目 | `language`, `file_count` |
| `project_generate` | 开始生成文档 | `domain_count` |
| `search_fast` | Fast Search 查询 | — |
| `search_deep` | Deep Search 查询 | — |
| `mcp_connect` | MCP 客户端连接 | `client_name` |
| `export_static` | 导出静态站点 | — |
| `update_check` | 检查更新 | `current_version` |
| `update_install` | 安装更新 | `new_version` |

### 3.7 子任务

| 子任务 | 说明 |
|--------|------|
| 6.1 Astro 项目初始化 | `/site` 目录，Astro + Tailwind + React |
| 6.2 i18n 配置 | 中英文路由和内容 |
| 6.3 UI 设计与实现 | 使用 `/ui-ux-pro-max` 辅助，实现所有板块 |
| 6.4 Cloudflare Pages 部署 | CI/CD 配置，域名绑定 |
| 6.5 Cloudflare Web Analytics | Landing Page 埋点接入 |
| 6.6 Aptabase 集成 | Tauri 桌面端埋点接入 |

---

## 4. Phase 7: 自动更新 + 分发

### 4.1 目标

实现 CLI 和桌面应用的自动化构建、分发和更新机制。

### 4.2 分发矩阵

| 分发形态 | 安装方式 | 更新方式 | 平台 |
|----------|---------|---------|------|
| CLI 二进制 | `brew install xkcoding/tap/deeplens-cli` 或 GitHub Release 下载 | `brew upgrade` | macOS arm64 / x64 |
| Desktop App | `brew install --cask xkcoding/tap/deeplens` 或 GitHub Release 下载 DMG | 应用内自动更新 (Tauri Updater) | macOS arm64 / x64 |

> **初期平台**: 仅支持 macOS (arm64 + x64)，Linux / Windows 后续扩展。

### 4.3 GitHub Actions CI/CD

**触发条件**: push tag `v*.*.*`

```
push tag v0.x.0
    │
    ├── Job 1: Build CLI ──────────────────────────────┐
    │   ├── pkg → macOS arm64 binary                   │
    │   ├── pkg → macOS x64 binary                     │
    │   └── Upload binaries to GitHub Release           │
    │                                                   │
    ├── Job 2: Build Tauri Desktop ─────────────────────┤
    │   ├── macOS arm64: .dmg + .app.tar.gz + sig      │
    │   ├── macOS x64: .dmg + .app.tar.gz + sig        │
    │   ├── Upload to GitHub Release                    │
    │   └── Generate latest.json (updater manifest)     │
    │                                                   │
    └── Job 3: Update Homebrew Tap ─────────────────────┘
        ├── Auto-push deeplens-cli.rb (formula)
        └── Auto-push deeplens.rb (cask)
        └── 目标仓库: xkcoding/homebrew-tap
```

### 4.4 Tauri 自动更新

**机制**: `@tauri-apps/plugin-updater`

**工作流**:
1. 应用启动时检查 GitHub Release（`https://github.com/xkcoding/deeplens/releases/latest`）
2. 对比当前版本与 `latest.json` 中的版本
3. 有新版本 → 提示用户 → 下载 `.app.tar.gz` → 验证签名 → 替换 → 重启
4. 已是最新 → 静默跳过

**配置要求**:
- `tauri.conf.json` 中配置 updater endpoint 指向 GitHub Release
- CI 构建时使用密钥对产物签名
- 无需独立 CDN，GitHub Release 作为分发源

### 4.5 Homebrew

**仓库结构**:
- 主仓库: `xkcoding/deeplens`（代码 + CI）
- Tap 仓库: `xkcoding/homebrew-tap`（由 CI 自动维护，无需手动管理）

**安装命令**:
```bash
# CLI 工具
brew tap xkcoding/tap
brew install deeplens-cli

# 桌面应用
brew install --cask xkcoding/tap/deeplens
```

**Formula 更新**: GitHub Actions 在创建 Release 后，自动向 `xkcoding/homebrew-tap` 仓库推送更新后的 Formula/Cask 文件。

### 4.6 CLI 二进制打包

**工具**: `@yao-pkg/pkg`（已在 devDependencies 中）

**产物**:
- `deeplens-cli-macos-arm64` — Apple Silicon
- `deeplens-cli-macos-x64` — Intel Mac

**特性**:
- 独立二进制，不依赖 Node.js 运行时
- 包含所有 npm 依赖

### 4.7 子任务

| 子任务 | 说明 |
|--------|------|
| 7.1 GitHub Actions: Build CLI | pkg 打包 macOS arm64/x64 二进制 |
| 7.2 GitHub Actions: Build Tauri | Tauri 构建 .dmg + .tar.gz + 签名 |
| 7.3 GitHub Actions: Create Release | 自动创建 GitHub Release，上传产物 |
| 7.4 GitHub Actions: Update Homebrew | 自动推送 Formula/Cask 到 homebrew-tap |
| 7.5 Tauri Updater 配置 | tauri.conf.json + plugin-updater 集成 |
| 7.6 创建 homebrew-tap 仓库 | 初始化 `xkcoding/homebrew-tap`，编写初始 Formula |

---

## 5. 关键设计决策

| # | 决策 | 选择 | 理由 |
|---|------|------|------|
| D21 | 翻译引擎 | Claude Agent SDK（同流程翻译） | 不打断生成流程，Markdown 保持最好，质量高 |
| D22 | 翻译触发 | 每个 Domain 英文完成后立即翻译 | 粒度适中，避免全部生成后再翻译导致上下文断裂 |
| D23 | VitePress 默认语言 | 英文 | 国际化优先，中文作为翻译语言 |
| D24 | Landing Page 框架 | Astro (SSG) | 极致轻量，Cloudflare Pages 原生支持 |
| D25 | Landing Page 位置 | 主仓库 `/site` 目录 | 统一管理，CI 一体化 |
| D26 | Landing Page 埋点 | Cloudflare Web Analytics | 免费、无 Cookie、原生集成 CF Pages |
| D27 | Desktop 埋点 | Aptabase | 专为 Tauri 设计，隐私友好，免费额度够用 |
| D28 | 桌面端更新 | Tauri Updater + GitHub Release | 原生支持，无需独立 CDN |
| D29 | CLI 分发 | pkg 打包 + Homebrew Tap | 独立二进制不依赖 Node.js，Brew 标准化安装 |
| D30 | Brew 仓库 | 独立 `homebrew-tap` 仓库（CI 自动维护） | 符合 Homebrew 约定，用户安装体验标准化 |
| D31 | 初期平台 | macOS only (arm64 + x64) | 聚焦核心平台，后续扩展 Linux / Windows |

---

## 6. 风险与应对

| 风险 | 影响 | 应对策略 |
|------|------|---------|
| Claude 翻译成本叠加 | 文档生成总成本增加约 30-50% | 翻译只在生成阶段发生（一次性），增量更新时仅翻译变更部分 |
| 翻译质量不一致 | 同一术语不同文档中译法不同 | Prompt 中维护术语表，翻译前注入已翻译术语 |
| Astro 与主项目构建冲突 | CI 构建复杂度增加 | `/site` 独立 package.json，独立构建流程 |
| Tauri Updater 签名密钥泄露 | 恶意更新推送 | 密钥仅存储在 GitHub Secrets，不落地到代码 |
| Homebrew 审核延迟 | 用户安装体验 | 自维护 Tap，不依赖 Homebrew core 审核 |
| Aptabase 免费额度不足 | 超出后无法采集 | 控制事件发送频率，仅采集关键事件 |
| GitHub Release 作为 CDN 不稳定 | 国内用户下载/更新慢 | 后续可接入国内镜像或 Cloudflare R2 加速 |

---

## 7. 开发顺序

```
Phase 5: 中英文文档 ───────────────────────────────────►
  5.1 Generator Prompt 扩展
  5.2 翻译 write_file 调用
  5.3 VitePress i18n 配置
  5.4 增量更新适配

Phase 6: Landing Page + 埋点 ──────────────────────────►
  6.1 Astro 项目初始化          (可与 Phase 5 并行)
  6.2 i18n 配置
  6.3 UI 设计与实现
  6.4 Cloudflare Pages 部署
  6.5 CF Web Analytics
  6.6 Aptabase 集成             (桌面端埋点，独立于 Landing Page)

Phase 7: 自动更新 + 分发 ─────────────────────────────►
  7.1 GitHub Actions: Build CLI
  7.2 GitHub Actions: Build Tauri
  7.3 GitHub Actions: Create Release
  7.4 GitHub Actions: Update Homebrew
  7.5 Tauri Updater 配置
  7.6 创建 homebrew-tap 仓库
```

> Phase 5 和 Phase 6 可部分并行推进：5.1-5.3 与 6.1-6.2 互不依赖。
> Phase 7 依赖 Phase 6.6（Aptabase 集成后才能在更新事件中采集数据）。
