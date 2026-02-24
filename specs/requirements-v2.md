# DeepLens - 需求规格说明书 v2

> **版本**: 2.1.0
> **日期**: 2026-02-22
> **状态**: 已确认
> **前置**: Phase 1-4 已全部完成，见 `specs/requirements.md`

---

## 1. 概述

本文档定义 DeepLens Phase 5-8 的需求，聚焦五个方向：

| Phase | 方向 | 优先级 | 目标 |
|-------|------|--------|------|
| Phase 5 | 中英文文档支持 | P0 - 最高 | 生成双语文档，VitePress i18n |
| Phase 5.5 | Prompt 深度优化 | P0 - 最高 | WHAT-HOW-WHY-EDGE 四层深度模型，提升生成质量 |
| Phase 6 | Landing Page + 埋点 | P1 - 高 | 产品主页上线，用户触达 |
| Phase 7 | 自动更新 + 分发 | P2 - 中 | CI/CD + Brew + 桌面端自动更新 |
| Phase 8 | LSP 语义增强 | P3 - 低 | 引入语言服务器，提升代码分析精度 |

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

## 2.5. Phase 5.5: Prompt 深度优化

### 2.5.1 目标

优化全流水线 Prompt（Explorer → Generator → Overview → Summary → Translator），引入 WHAT-HOW-WHY-EDGE 四层深度模型，从根本上提升生成文档的深度和质量。

### 2.5.2 问题分析

当前生成文档只覆盖 WHAT 层（组件做什么），缺少更深层次的分析：

```
     浅 ──────────────────────────────── 深
      │                                    │
  WHAT ──→ HOW ──→ WHY ──→ EDGE
  做什么     怎么做     为什么     边界约束
  (当前)    (薄弱)    (缺失)    (缺失)
```

| 深度层 | 含义 | 当前状态 |
|--------|------|---------|
| **WHAT** | 组件做什么 | 有，但偏概要 |
| **HOW** | 具体实现、设计模式、调用链 | 薄弱，一句话带过 |
| **WHY** | 为什么这样设计、tradeoff 分析 | 完全缺失 |
| **EDGE** | 边界情况、约束、并发、异常处理策略 | 完全缺失 |

### 2.5.3 优化范围

**设计约束**: Prompt 中的示例必须使用通用术语（如 UserService、OrderController），不得绑定特定项目，确保对任意项目均有效。

| Prompt | 优化点 | 改动规模 |
|--------|--------|---------|
| **Generator** | 加入 Hub/Spoke 标准模板、BAD vs GOOD 示例、WHAT-HOW-WHY-EDGE 深度要求、代码片段标准 | 大改 |
| **Explorer** | 强化 sub_concepts 质量标准、增加域间依赖信号、grep_search 策略化引导、抽样调整为 5-12 | 中改 |
| **Overview** | Key Flows 增加 Mermaid sequence diagram、Architecture 图标注边语义、Quick Start 增强 | 小改 |
| **Summary** | 收紧 Potential Improvements 范围、增强 At a Glance 指标 | 小改 |
| **Translator** | HTML 结构保留规则、术语示例通用化（去除 DeepLens 特有示例） | 微调 |

### 2.5.4 Generator 深度模板

**Hub 文档标准结构**:
1. 域标题 + 一句话定位
2. 概述（该域在项目中的角色和职责）
3. 架构决策（WHY: 为什么采用这种设计）
4. 核心组件表（组件名 + 职责 + 关键接口）
5. 数据流图（Mermaid: 组件间调用链）
6. 关联领域（与其他域的交互关系）
7. Spoke 导航列表

**Spoke 文档标准结构**:
1. 组件标题 + 一句话定位
2. 职责与接口（WHAT: 做什么，暴露什么接口）
3. 实现机制（HOW: 用了什么模式，调用链是什么）
4. 关键代码（1-3 段核心代码，每段不超过 20 行，带行号引用）
5. 设计决策（WHY: 为什么选择这个方案，有什么 tradeoff）
6. 边界与约束（EDGE: 并发、错误处理、性能约束）
7. 关联组件（链接到相关 spoke）

### 2.5.5 Explorer 增强

- 抽样范围从 "3-8 files" 调整为 "5-12 files"
- sub_concepts 增加质量标准：每个 sub_concept 应对应一个可独立文档化的功能单元
- 引导 Agent 在 Probe 阶段使用 grep_search 发现跨文件调用链和设计模式
- 增加域间交互信号，供下游 Agent 使用

### 2.5.6 子任务

| 子任务 | 说明 |
|--------|------|
| 5.5.1 Generator Prompt 大改 | Hub/Spoke 模板 + 四层深度 + BAD vs GOOD 示例（通用） |
| 5.5.2 Explorer Prompt 中改 | sub_concepts 质量 + 抽样调整 + grep 策略 |
| 5.5.3 Overview Prompt 小改 | Key Flows 图 + Architecture 增强 |
| 5.5.4 Summary Prompt 小改 | At a Glance + Potential Improvements 收紧 |
| 5.5.5 Translator Prompt 微调 | HTML 保留规则 + 示例通用化 |

---

## 3. Phase 8: LSP 语义增强

### 3.1 目标

在 Explorer 和 Generator 阶段引入 LSP（Language Server Protocol）语义分析能力，从文本级代码分析升级为语义级分析，提升文档精度。

### 3.2 问题分析

当前代码分析工具链为纯文本级：

| 当前工具 | 能力 | 局限 |
|---------|------|------|
| `list_files` | 目录结构 | 无语义信息 |
| `read_file` | 文件全文 | 需要 LLM 自行解析结构 |
| `grep_search` | 文本模式匹配 | 有误报，无法区分定义/引用 |

LSP 能提供的语义级信息：

| LSP 能力 | 对应分析提升 | 影响的深度层 |
|---------|-------------|------------|
| `documentSymbol` | 精确的类/函数/变量列表 | WHAT |
| `references` | 精确的引用查找（谁调用了这个函数） | HOW |
| `callHierarchy` | 完整调用链（A→B→C→D） | HOW |
| `typeHierarchy` | 类继承/接口实现关系 | HOW, WHY |
| `hover` | 类型签名 + 文档注释 | WHAT, EDGE |
| `definition` | 精确跳转到定义 | HOW |

### 3.3 技术方案

**分层架构**:

```
Agent (Explorer / Generator)
    │
    ├── 现有工具（保留）
    │   ├── list_files
    │   ├── read_file / read_file_snippet
    │   └── grep_search
    │
    └── LSP 增强工具（新增，可选）
        ├── get_symbols(path) — 文件符号列表
        ├── find_references(path, symbol) — 引用查找
        ├── get_call_hierarchy(path, symbol) — 调用链
        ├── get_type_info(path, symbol) — 类型信息
        └── get_implementations(path, symbol) — 接口实现
```

**渐进式支持**:

| 阶段 | 语言 | Language Server | 优先级 |
|------|------|----------------|--------|
| Phase 8a | TypeScript / JavaScript | `typescript-language-server` (tsserver) | 最高 |
| Phase 8b | Python | `pylsp` / `pyright` | 高 |
| Phase 8c | Go | `gopls` | 中 |
| Phase 8d | Rust / Java | `rust-analyzer` / `jdtls` | 低 |

**Fallback 策略**: 当目标语言无可用 Language Server 时，自动降级为文本分析（现有工具链），确保任何项目都能正常生成文档。

### 3.4 MCP 工具设计

新增 LSP 工具通过与现有工具相同的 MCP Server 注入，Agent 无需感知底层实现差异：

```typescript
// 新增 MCP 工具定义（概念设计）
get_symbols(path: string): Symbol[]
  → 返回文件内所有符号（类、函数、变量），含类型和位置

find_references(path: string, symbol: string): Reference[]
  → 返回符号的所有引用位置，含上下文代码片段

get_call_hierarchy(path: string, symbol: string): CallNode[]
  → 返回符号的调用者和被调用者，形成调用树

get_type_info(path: string, symbol: string): TypeInfo
  → 返回符号的完整类型签名、文档注释

get_implementations(path: string, symbol: string): Implementation[]
  → 返回接口/抽象类的所有实现
```

### 3.5 对 Prompt 的影响

LSP 工具引入后，Explorer 和 Generator Prompt 需要新增对应的工具使用引导：

- **Explorer**: 用 `get_symbols` 快速获取文件结构概览（替代 read_file 全量读取），用 `find_references` 发现跨域依赖
- **Generator**: 用 `get_call_hierarchy` 生成精确的调用链图（替代人工推理），用 `get_type_info` 获取接口签名

### 3.6 子任务

| 子任务 | 说明 |
|--------|------|
| 8.1 LSP Client 基础架构 | Language Server 生命周期管理（启动、初始化、关闭） |
| 8.2 TypeScript LSP 集成 | tsserver 接入，实现 5 个 LSP MCP 工具 |
| 8.3 Explorer Prompt 适配 | 增加 LSP 工具使用引导 |
| 8.4 Generator Prompt 适配 | 增加 LSP 工具使用引导 |
| 8.5 Fallback 机制 | 无 Language Server 时自动降级为文本分析 |
| 8.6 多语言扩展 | Python / Go / Rust / Java LSP 支持 |

---

## 4. Phase 6: Landing Page + 埋点

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

**统一工具**: PostHog Cloud — Landing Page + Desktop App 使用同一个 project key

**理由**:
- 一套工具覆盖全端（Web + Tauri WebView），数据统一分析
- 支持 PV/UV、自定义事件、漏斗分析、CTR 计算
- 免费额度 1M 事件/月（个人项目完全够用）
- 隐私友好（anonymous 模式，不创建用户画像，不使用 Cookie）

#### Landing Page 采集

自动采集 + 自定义事件：
- **自动**: PV/UV、流量来源、设备类型、地域分布
- **自定义**: CTA 按钮点击（`cta_click`）、导航点击（`nav_click`）、语言切换（`lang_switch`）、FAQ 展开（`faq_toggle`）
- **漏斗**: Hero View → Features Scroll → CTA Click → GitHub Release

#### Desktop App 采集

业务事件 + UI 交互事件：

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
| `button_click` | 关键按钮点击 | `name`, `page` |
| `tab_switch` | Tab/面板切换 | `from`, `to` |
| `page_view` | 页面/视图切换 | `view_name` |

### 3.7 子任务

| 子任务 | 说明 |
|--------|------|
| 6.1 Astro 项目初始化 | `/site` 目录，Astro + Tailwind + React |
| 6.2 i18n 配置 | 中英文路由和内容 |
| 6.3 UI 设计与实现 | 使用 `/ui-ux-pro-max` 辅助，实现所有板块 |
| 6.4 Cloudflare Pages 部署 | CI/CD 配置，域名绑定 |
| 6.5 PostHog Landing Page 接入 | PostHog snippet 注入，自定义事件 + 漏斗配置 |
| 6.6 PostHog Desktop 接入 | Tauri 前端 posthog-js 集成，业务事件 + UI 交互事件 |

---

## 5. Phase 7: 自动更新 + 分发

### 5.1 目标

实现 CLI 和桌面应用的自动化构建、分发和更新机制。

### 5.2 分发矩阵

| 分发形态 | 安装方式 | 更新方式 | 平台 |
|----------|---------|---------|------|
| CLI 二进制 | `brew install xkcoding/tap/deeplens-cli` 或 GitHub Release 下载 | `brew upgrade` | macOS arm64 / x64 |
| Desktop App | `brew install --cask xkcoding/tap/deeplens` 或 GitHub Release 下载 DMG | 应用内自动更新 (Tauri Updater) | macOS arm64 / x64 |

> **初期平台**: 仅支持 macOS (arm64 + x64)，Linux / Windows 后续扩展。

### 5.3 GitHub Actions CI/CD

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

### 5.4 Tauri 自动更新

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

### 5.5 Homebrew

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

### 5.6 CLI 二进制打包

**工具**: `@yao-pkg/pkg`（已在 devDependencies 中）

**产物**:
- `deeplens-cli-macos-arm64` — Apple Silicon
- `deeplens-cli-macos-x64` — Intel Mac

**特性**:
- 独立二进制，不依赖 Node.js 运行时
- 包含所有 npm 依赖

### 5.7 子任务

| 子任务 | 说明 |
|--------|------|
| 7.1 GitHub Actions: Build CLI | pkg 打包 macOS arm64/x64 二进制 |
| 7.2 GitHub Actions: Build Tauri | Tauri 构建 .dmg + .tar.gz + 签名 |
| 7.3 GitHub Actions: Create Release | 自动创建 GitHub Release，上传产物 |
| 7.4 GitHub Actions: Update Homebrew | 自动推送 Formula/Cask 到 homebrew-tap |
| 7.5 Tauri Updater 配置 | tauri.conf.json + plugin-updater 集成 |
| 7.6 创建 homebrew-tap 仓库 | 初始化 `xkcoding/homebrew-tap`，编写初始 Formula |

---

## 6. 关键设计决策

| # | 决策 | 选择 | 理由 |
|---|------|------|------|
| D21 | 翻译引擎 | Claude Agent SDK（同流程翻译） | 不打断生成流程，Markdown 保持最好，质量高 |
| D22 | 翻译触发 | 每个 Domain 英文完成后立即翻译 | 粒度适中，避免全部生成后再翻译导致上下文断裂 |
| D23 | VitePress 默认语言 | 英文 | 国际化优先，中文作为翻译语言 |
| D24 | Landing Page 框架 | Astro (SSG) | 极致轻量，Cloudflare Pages 原生支持 |
| D25 | Landing Page 位置 | 主仓库 `/site` 目录 | 统一管理，CI 一体化 |
| D26 | 全端埋点 | PostHog Cloud（Landing Page + Desktop 统一） | 一套工具覆盖全端，支持 PV/UV、CTR、漏斗分析，免费 1M 事件/月 |
| D28 | 桌面端更新 | Tauri Updater + GitHub Release | 原生支持，无需独立 CDN |
| D29 | CLI 分发 | pkg 打包 + Homebrew Tap | 独立二进制不依赖 Node.js，Brew 标准化安装 |
| D30 | Brew 仓库 | 独立 `homebrew-tap` 仓库（CI 自动维护） | 符合 Homebrew 约定，用户安装体验标准化 |
| D31 | 初期平台 | macOS only (arm64 + x64) | 聚焦核心平台，后续扩展 Linux / Windows |
| D32 | 文档深度模型 | WHAT-HOW-WHY-EDGE 四层 | 单纯 WHAT 层太浅，开发者需要理解设计决策和边界约束 |
| D33 | Prompt 示例策略 | 通用示例，不绑定特定项目 | 绑定项目示例会导致特定项目效果好、其他项目效果差 |
| D34 | 深度优先于广度 | 每个 spoke 写深，而非生成更多 spoke | 避免 token 膨胀，优先 WHY/EDGE 深度 |
| D35 | LSP 引入策略 | 渐进式，TypeScript 优先 | tsserver 最成熟，其他语言 fallback 到文本分析 |
| D36 | LSP 定位 | 精度增强，非核心依赖 | Prompt 优化是基础（解决 70% 深度问题），LSP 是锦上添花（20%） |

---

## 7. 风险与应对

| 风险 | 影响 | 应对策略 |
|------|------|---------|
| Claude 翻译成本叠加 | 文档生成总成本增加约 30-50% | 翻译只在生成阶段发生（一次性），增量更新时仅翻译变更部分 |
| 翻译质量不一致 | 同一术语不同文档中译法不同 | Prompt 中维护术语表，翻译前注入已翻译术语 |
| 深度提升导致 token 消耗增加 | Generator 成本增加约 30-50% | 深度优先广度，控制 spoke 数量而非每个 spoke 的深度 |
| Prompt 示例通用化后特定场景不够准确 | 某些领域可能生成不够贴合 | 示例覆盖多种项目类型（Web 应用、CLI 工具、库等） |
| LSP Language Server 启动慢 | 大项目初始化需 5-30 秒 | 启动时显示进度提示，超时自动降级为文本分析 |
| LSP 多语言覆盖不全 | 小众语言无 Language Server | Fallback 到文本分析，确保任何项目可用 |
| Astro 与主项目构建冲突 | CI 构建复杂度增加 | `/site` 独立 package.json，独立构建流程 |
| Tauri Updater 签名密钥泄露 | 恶意更新推送 | 密钥仅存储在 GitHub Secrets，不落地到代码 |
| Homebrew 审核延迟 | 用户安装体验 | 自维护 Tap，不依赖 Homebrew core 审核 |
| PostHog 免费额度不足 | 超出 1M 事件/月后降级 | 控制事件粒度，关闭 autocapture，仅手动上报关键事件 |
| GitHub Release 作为 CDN 不稳定 | 国内用户下载/更新慢 | 后续可接入国内镜像或 Cloudflare R2 加速 |

---

## 8. 开发顺序

```
Phase 5: 中英文文档 ───────────────────────────────────►
  5.1 Generator Prompt 扩展
  5.2 翻译 write_file 调用
  5.3 VitePress i18n 配置
  5.4 增量更新适配

Phase 5.5: Prompt 深度优化 ────────────────────────────► (紧跟 Phase 5)
  5.5.1 Generator Prompt 大改
  5.5.2 Explorer Prompt 中改
  5.5.3 Overview Prompt 小改
  5.5.4 Summary Prompt 小改
  5.5.5 Translator Prompt 微调

Phase 6: Landing Page + 埋点 ──────────────────────────► (可与 Phase 5.5 并行)
  6.1 Astro 项目初始化
  6.2 i18n 配置
  6.3 UI 设计与实现
  6.4 Cloudflare Pages 部署
  6.5 PostHog Landing Page 接入
  6.6 PostHog Desktop 接入

Phase 7: 自动更新 + 分发 ─────────────────────────────►
  7.1 GitHub Actions: Build CLI
  7.2 GitHub Actions: Build Tauri
  7.3 GitHub Actions: Create Release
  7.4 GitHub Actions: Update Homebrew
  7.5 Tauri Updater 配置
  7.6 创建 homebrew-tap 仓库

Phase 8: LSP 语义增强 ────────────────────────────────► (独立迭代)
  8.1 LSP Client 基础架构
  8.2 TypeScript LSP 集成
  8.3 Explorer Prompt 适配
  8.4 Generator Prompt 适配
  8.5 Fallback 机制
  8.6 多语言扩展
```

> Phase 5 → 5.5 是强依赖：先完成 i18n 基础，再优化生成深度。
> Phase 5.5 和 Phase 6 可并行推进。
> Phase 7 依赖 Phase 6.6（PostHog Desktop 接入后才能在更新事件中采集数据）。
> Phase 8 独立迭代，不阻塞其他 Phase，可在任何时间点开始。
