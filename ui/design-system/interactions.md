# DeepLens Interaction Patterns

> Version 1.0.0 | 2026-02-19
> Agentic UI Interaction Design

---

## 1. Agentic State Machine

Agent 全生命周期状态机，驱动 UI 的全局表现。

### 1.1 状态定义

```
                    ┌──────────────────────────────────────────────┐
                    │                                              │
    ┌───────┐    ┌──▼──────┐    ┌─────────┐    ┌────────────┐    │
    │       │    │         │    │         │    │            │    │
───►│ idle  ├───►│exploring├───►│waiting  ├───►│ generating ├────┤
    │       │    │         │    │ (HITL)  │    │            │    │
    └───────┘    └────┬────┘    └────┬────┘    └─────┬──────┘    │
        ▲             │              │               │           │
        │             │              │               ▼           │
        │             │              │         ┌──────────┐      │
        │             │              │         │          │      │
        │             ▼              │         │ indexing  │      │
        │        ┌─────────┐        │         │          │      │
        │        │  error  │◄───────┘         └────┬─────┘      │
        │        └────┬────┘                       │            │
        │             │                            ▼            │
        │             │                      ┌──────────┐       │
        │             └─────────────────────►│  ready   ├───────┘
        │                                    └────┬─────┘
        │                                         │
        └─────────────────────────────────────────┘
```

### 1.2 状态-UI 映射

| 状态 | Header 指示器 | Nav Panel | Flow Panel | Artifact Panel |
|------|--------------|-----------|------------|----------------|
| **idle** | ● 灰色圆点 | 空白 / "导入项目" | 欢迎页引导 | 空白 |
| **exploring** | ◉ 橙色脉冲 | 目录节点逐步出现 | 思考流实时滚动 | 空白 / 骨架预览 |
| **waiting** | ◉ 琥珀色呼吸 | 目录树完整显示 | 大纲编辑器覆盖 | 大纲预览 |
| **generating** | ◉ 橙色流动 | 节点状态逐步变化 | 思考流 + 进度 | 文档块级刷新 |
| **indexing** | ◉ 蓝色进度 | 全部 completed | 索引进度条 | 文档完整预览 |
| **ready** | ● 绿色静态 | 全部 completed | 完成摘要 | 文档站 + Chat |
| **error** | ● 红色闪烁 | 错误节点标红 | 错误卡片 | 错误详情 |

### 1.3 状态过渡动画

| 过渡 | 动画描述 | 时长 |
|------|---------|------|
| idle → exploring | Header 圆点淡入橙色 + 脉冲开始, Flow 面板 slide-up | 500ms |
| exploring → waiting | Flow 内容 fade-out, 大纲编辑器 scale-in | 350ms |
| waiting → generating | 大纲编辑器 fade-out, 思考流恢复 + 进度条 slide-down | 350ms |
| generating → indexing | Header 圆点变蓝, 进度条样式切换 | 250ms |
| indexing → ready | Header 圆点变绿, Artifact 面板 Chat 按钮 bounce 出现 | 500ms |
| any → error | 红色 flash overlay 150ms, 错误卡片 slide-up | 300ms |

---

## 2. Block Refresh Strategy

Agent 生成文档时的前端刷新策略，避免字符级跳动。

### 2.1 核心原则

1. **Agent 写完一个完整 Section 后**，才触发前端更新
2. 前端使用 **DOM Diff** 平滑插入，不做全量替换
3. 生成中的 Section 显示**骨架屏**占位

### 2.2 Section 生命周期

```
pending       →      generating        →      completed
┌──────────┐    ┌────────────────────┐    ┌──────────────────┐
│ ○ 待生成  │    │ 🔄 Agent 正在撰写  │    │ ● 完整 Markdown   │
│           │ →  │    此章节...        │ →  │   + Mermaid 图表  │
│ (不可见)   │    │  ████░░░░ shimmer  │    │   + 代码块        │
└──────────┘    └────────────────────┘    └──────────────────┘
```

### 2.3 骨架屏规范

**触发时机**: Section 状态变为 `generating` 时立即显示

**骨架元素**:
- 标题骨架: 高 24px, 宽 60%, `rounded-sm`
- 段落骨架: 3-4 行, 高 16px, 宽 100%/90%/70%, 间距 `space-2`
- 图表骨架: 高 200px, 宽 100%, `rounded-lg`, 内含装饰性方块
- 所有骨架条: `neutral-200` 底色, `skeleton-shimmer` 动画

**替换动画**: 骨架 `fade-out` 200ms → 真实内容 `fade-in` 300ms, 整体 500ms

### 2.4 事件协议处理

```typescript
// Node Sidecar → Frontend IPC 事件
interface ThoughtEvent {
  type: "thought";
  content: string;
}

interface ToolStartEvent {
  type: "tool_start";
  tool: string;
  args: Record<string, unknown>;
}

interface ToolEndEvent {
  type: "tool_end";
  tool: string;
  duration_ms: number;
}

interface SectionReadyEvent {
  type: "section_ready";
  target_file: string;
  block_id: string;
  status: "completed" | "error";
}

interface ProgressEvent {
  type: "progress";
  completed: number;
  total: number;
}
```

**UI 响应规则**:
- `thought` → 追加到 ThoughtStream
- `tool_start` → 追加 Tool Start 卡片, 对应 Nav 节点显示 loading
- `tool_end` → 更新对应 Tool Start 卡片为完成态
- `section_ready` → 触发 Artifact 面板对应 Section 的块级刷新
- `progress` → 更新 Nav 底部进度, ThoughtStream 进度卡片

---

## 3. Glass Box Experience

Deep Search 模式下的 CoT 思维链透明展示，让用户看到 AI 的推理过程。

### 3.1 CoT 展示容器

在 ChatWidget 内, AI 回答前展示可折叠的思维链。

```
┌──────────────────────────────────────┐
│ 🧠 思考过程                    [▼]   │
├──────────────────────────────────────┤
│                                      │
│ Step 1: 检索文档向量库               │
│ → 找到 3 个相关文档片段              │
│                                      │
│ Step 2: 分析源码引用                 │
│ → 读取 auth/jwt-strategy.ts:45-89   │
│ → 发现双 Token 刷新逻辑             │
│                                      │
│ Step 3: 综合分析                     │
│ → 跨模块追踪 refresh 调用链          │
│ → 确认 Redis 缓存策略                │
│                                      │
│ ⏱ 耗时 4.2s · 3 步骤 · 5 次工具调用 │
└──────────────────────────────────────┘
```

### 3.2 视觉规范

- **容器背景**: `secondary-50` (light) / `neutral-850` (dark)
- **圆角**: `rounded-lg`
- **边框**: 1px `secondary-200` (light) / `neutral-700` (dark)
- **标题**: "🧠 思考过程", `text-sm` `font-medium` `secondary-700`
- **折叠/展开**: 默认展开, 点击标题栏折叠, `duration-normal` 滑动
- **步骤文字**: `text-sm` `neutral-600`
- **步骤前缀**: "Step N:" `font-medium` `neutral-700`
- **引用标记 (→)**: `primary-500` 色
- **底部统计**: `text-xs` `neutral-400`, dot 分隔

### 3.3 实时流式展示

思维链步骤**逐步出现**，而非等全部完成:
1. 新步骤 `slide-up` + `fade-in` 250ms 出现
2. 步骤内文字按行出现, 间隔 100ms
3. 工具调用行前显示 spinner, 完成后替换为 `→`
4. 全部完成时底部统计行 `fade-in`

---

## 4. Progress Indicators

各阶段的进度反馈设计。

### 4.1 探索阶段 (Exploring)

```
┌──────────────────────────────────────┐
│ 🔍 正在探索代码结构...                │
│                                      │
│ ██████████░░░░░░░░░░  已读取 23 文件  │
│                                      │
│ 当前: src/auth/jwt-strategy.ts       │
└──────────────────────────────────────┘
```

- **进度条**: 不确定型 (indeterminate), `primary-500` 条在 `neutral-200` 底上左右滑动
- **原因**: 探索阶段文件总数未知, 无法精确计算百分比
- **已读文件数**: 实时计数, `font-mono`
- **当前文件**: `text-xs` `font-mono` `neutral-500`, 单行截断

### 4.2 生成阶段 (Generating)

```
┌──────────────────────────────────────┐
│ ✍ 正在生成文档...                     │
│                                      │
│ ████████████████░░░░  3/8  37.5%     │
│                                      │
│ 当前: 用户鉴权 > JWT Token 管理       │
│ 预计剩余: ~4 个 Section               │
└──────────────────────────────────────┘
```

- **进度条**: 确定型, `primary-500` 填充, `neutral-200` 底, `rounded-full` h-2
- **完成比**: "3/8" `font-medium`, 百分比 `neutral-500`
- **进度条动画**: 宽度增长 `duration-slow` `ease-out`
- **当前节点**: 面包屑路径, `text-xs` `neutral-500`

### 4.3 索引阶段 (Indexing)

```
┌──────────────────────────────────────┐
│ 📇 正在建立向量索引...                │
│                                      │
│ 文档向量化   ████████████████████ ✓   │
│ 代码向量化   ████████████░░░░░░░ 67% │
│ 索引优化     ○ 等待中                 │
└──────────────────────────────────────┘
```

- **多步骤**: 每步独立进度条
- **已完成步骤**: `semantic-success` 颜色 + `✓`
- **进行中步骤**: `semantic-info` 颜色 + 百分比
- **等待步骤**: `neutral-300` 底, `○ 等待中`

### 4.4 Header 微进度

顶部栏 Agent 状态旁的微型进度指示器。

| 状态 | 表现 |
|------|------|
| Exploring | 橙色脉冲圆点 8px + `pulse-orange` 动画 |
| Waiting | 琥珀色圆点 8px + `pulse-amber` 呼吸灯 |
| Generating | 橙色圆点 + 旁边微型进度弧 (SVG 圆弧动画) |
| Indexing | 蓝色圆点 + 微型进度弧 |
| Ready | 绿色静态圆点 |
| Error | 红色圆点 + 短暂闪烁后静止 |

---

## 5. Error Handling

分级错误处理的 UI 表现。

### 5.1 错误级别

| 级别 | 触发场景 | UI 表现 | 用户操作 |
|------|---------|---------|---------|
| **Info** | 非关键提示 | Toast (蓝色) | 自动消失, 无需操作 |
| **Warning** | 可恢复错误 | Toast (琥珀) + ThoughtStream 卡片 | 可忽略, 可重试 |
| **Error** | 功能性错误 | Inline Error + ThoughtStream Error 卡片 | 需要用户关注 |
| **Critical** | 系统级错误 | 全屏 Dialog | 必须处理 |

### 5.2 Toast 通知

```
┌──────────────────────────────────────┐
│ ▌ ✓  文件读取完成: auth.ts      [✕]  │   ← Info: 蓝色左竖线
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│ ▌ ⚠  部分文件无法读取,已跳过    [✕]  │   ← Warning: 琥珀色左竖线
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│ ▌ ✗  API 连接失败         [重试][✕]  │   ← Error: 红色左竖线
└──────────────────────────────────────┘
```

**行为**:
- 右上角堆叠, 最新在最上
- Info/Warning: 5s 自动消失
- Error: 手动关闭或重试
- 入场 `slide-down` + `fade-in`, 退场 `fade-out` + `slide-up`

### 5.3 Inline Error

嵌在表单字段下方的错误提示。

```
  API Key
  ┌────────────────────────────────────┐
  │ sk-invalid...                      │  ← border 变为 semantic-error
  └────────────────────────────────────┘
  ✗ API Key 格式不正确，请检查后重试      ← text-xs semantic-error
```

### 5.4 Error Dialog (Critical)

```
┌──────────────────────────────────────────┐
│                                          │
│    ⚠                                     │
│                                          │
│    Agent 执行异常                         │
│                                          │
│    Claude API 返回 429 Too Many          │
│    Requests。请稍后重试或检查 API         │
│    用量限制。                             │
│                                          │
│    Error: rate_limit_exceeded            │
│    Request ID: req_abc123                │
│                                          │
│           [复制错误信息]  [重试]           │
│                                          │
└──────────────────────────────────────────┘
```

- **图标**: `⚠` 48px `semantic-warning` (可恢复) 或 `✗` `semantic-error` (不可恢复)
- **标题**: `text-xl` `font-semibold`
- **描述**: `text-base` `neutral-600`
- **错误详情**: `font-mono` `text-xs` `neutral-500`, 可展开/折叠
- **按钮**: "复制错误信息" (Ghost) + "重试" (Primary) 或 "关闭" (Primary)

### 5.5 Agent 自恢复提示

Agent 遇到非致命错误时自行处理，UI 展示:

```
ThoughtStream 中:
┌─────────────────────────────────────────┐
│ ⚠  文件读取失败: src/legacy/old.ts      │
│    → Agent 已跳过此文件，继续分析...     │
└─────────────────────────────────────────┘
```

- 琥珀色左竖线, 自动折叠
- 表示 Agent 自主处理, 用户无需干预

---

## 6. First-Run Setup Wizard

首次启动引导流程。

### 6.1 流程步骤

```
Step 1          Step 2           Step 3          Step 4
欢迎            Claude API       SiliconFlow     完成
●───────────────○────────────────○───────────────○
```

### 6.2 Step 1: 欢迎页

```
┌──────────────────────────────────────────────┐
│                                              │
│               🔍                             │
│            DeepLens                          │
│                                              │
│    AI 驱动的代码深度分析与文档生成工具        │
│                                              │
│    DeepLens 像一位资深架构师一样探索你的      │
│    代码库，生成按业务概念组织的深度文档。      │
│                                              │
│                [开始配置 →]                   │
│                                              │
└──────────────────────────────────────────────┘
```

- **Logo**: `primary-500` 渐变图标, 64px, 入场 `scale-in` + `fade-in`
- **标题**: `text-3xl` `font-bold`, 入场 `fade-in` delay 200ms
- **描述**: `text-base` `neutral-600`, 居中, max-width 400px
- **按钮**: Primary, 居中, 入场 `slide-up` delay 400ms

### 6.3 Step 2: Claude API 配置

```
┌──────────────────────────────────────────────┐
│ ← 返回                         Step 2 of 4  │
│                                              │
│ 🤖 配置 Claude API                           │
│                                              │
│ DeepLens 使用 Claude 进行代码探索和           │
│ 文档生成。请配置 API 连接信息。               │
│                                              │
│ API Base URL                                 │
│ ┌──────────────────────────────────────────┐ │
│ │ https://api.anthropic.com               │ │
│ └──────────────────────────────────────────┘ │
│ 💡 国内用户可填写 Coding Plan 代理地址       │
│                                              │
│ API Key *                                    │
│ ┌──────────────────────────────────────────┐ │
│ │ sk-ant-...                           👁  │ │
│ └──────────────────────────────────────────┘ │
│                                              │
│ 模型                                         │
│ ┌──────────────────────────────────────────┐ │
│ │ claude-sonnet-4-20250514             ▾  │ │
│ └──────────────────────────────────────────┘ │
│                                              │
│    [Test Connection]            [下一步 →]   │
│                                              │
└──────────────────────────────────────────────┘
```

- **返回箭头**: `neutral-500`, hover `neutral-700`
- **步骤指示**: `text-xs` `neutral-400`, 右上角
- **标题**: `text-xl` `font-semibold`
- **说明**: `text-sm` `neutral-600`, `space-2` margin-bottom
- **提示 (💡)**: `text-xs` `secondary-600`, 字段下方
- **必填标记 (*)**: `semantic-error` 色
- **Test Connection**: Ghost 按钮, 左侧
- **下一步**: Primary 按钮, 右侧, 必填项未填时 disabled

### 6.4 Step 3: SiliconFlow 配置

与 Step 2 结构类似, 包含:
- API Base URL
- API Key
- Embedding 模型选择 (下拉)
- LLM 模型选择 (下拉)

### 6.5 Step 4: 完成

```
┌──────────────────────────────────────────────┐
│                                              │
│               ✓                              │
│                                              │
│         配置完成!                             │
│                                              │
│    所有服务已连接成功。                        │
│    现在开始导入你的第一个项目吧。              │
│                                              │
│    ┌────────────────────────────────────┐    │
│    │              ＋                     │    │
│    │         导入新项目                  │    │
│    │    点击选择项目文件夹               │    │
│    └────────────────────────────────────┘    │
│                                              │
│              [稍后再说]                       │
│                                              │
└──────────────────────────────────────────────┘
```

- **完成图标**: `✓` 64px `semantic-success`, 入场 `scale-in` + bounce
- **项目卡片**: 同 ProjectCard 新增样式
- **稍后链接**: Text 按钮, `neutral-500`

### 6.6 步骤指示器

```
●━━━━━━━━━━━━━━━●━━━━━━━━━━━━━━━○━━━━━━━━━━━━━━━○
Step 1         Step 2         Step 3         Step 4
欢迎           Claude API     SiliconFlow     完成
```

- **已完成**: 圆点 `primary-500`, 连线 `primary-500`
- **当前**: 圆点 `primary-500` + `pulse-orange` 动画, 连线 `primary-500` (左) `neutral-300` (右)
- **未完成**: 圆点 `neutral-300`, 连线 `neutral-300`
- **步骤名**: `text-xs`, 已完成/当前 `neutral-700`, 未完成 `neutral-400`
- **步骤切换**: 滑动过渡 `duration-normal` `ease-spring`

---

## 7. Keyboard Shortcuts

| 快捷键 | 作用域 | 功能 |
|--------|--------|------|
| `Cmd/Ctrl + ,` | 全局 | 打开设置 |
| `Cmd/Ctrl + K` | 全局 | 快速搜索 / 命令面板 |
| `Cmd/Ctrl + B` | 全局 | 切换左侧面板 |
| `Cmd/Ctrl + J` | 全局 | 切换 Chat 面板 |
| `Cmd/Ctrl + Enter` | 大纲编辑器 | 确认大纲 |
| `Escape` | 对话框/弹出 | 关闭 |
| `Tab` / `Shift+Tab` | 表单 | 焦点切换 |
| `↑` / `↓` | NavigationTree | 节点导航 |
| `Enter` | NavigationTree | 展开/选中节点 |
| `F2` | NavigationTree | 重命名节点 |

---

## 8. Responsive Behavior

桌面应用窗口尺寸适配。

| 窗口宽度 | 布局调整 |
|----------|---------|
| >= 1280px (wide) | 三栏全部显示, 宽裕间距 |
| 1024-1279px (standard) | 三栏显示, 紧凑间距 |
| 800-1023px (compact) | Nav + Flow 两栏, Artifact 折叠为底部 Tab |
| < 800px | 单栏 + 底部 Tab 切换, 最小可用态 |

**面板折叠优先级**: Artifact (优先折叠) → Nav → Flow (始终可见)

**过渡**: 面板显隐 `duration-normal` `ease-default`, 宽度变化实时跟随
