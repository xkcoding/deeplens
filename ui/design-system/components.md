# DeepLens Component Design Specification

> Version 1.0.0 | 2026-02-19
> React + Tailwind CSS + shadcn/ui

---

## 1. ThreePanelLayout

三栏主布局容器：左 Navigation / 中 Flow / 右 Artifact。

### 结构

```
┌─────────┬──┬──────────────────┬──┬──────────────────┐
│  Nav    │▐▐│    The Flow      │▐▐│  The Artifact    │
│  Panel  │▐▐│   (思考流)       │▐▐│  (文档预览)       │
│         │▐▐│                  │▐▐│                  │
│ 240px   │4 │     flex-1       │4 │     flex-1       │
│ (resize)│px│                  │px│                  │
└─────────┴──┴──────────────────┴──┴──────────────────┘
```

### 视觉规范

- **背景**: `neutral-50` (light) / `neutral-900` (dark)
- **分隔条**: 宽 4px, `neutral-200` (light) / `neutral-700` (dark)
- **分隔条 Hover**: `primary-300`, cursor 变为 `col-resize`
- **分隔条 Active (拖拽中)**: `primary-500`, 2px 宽发光线
- **最小窗口** (< 800px): 隐藏 Artifact 面板，Flow 占满右侧
- **过渡**: 面板宽度变化 `duration-normal` + `ease-default`

### 状态

| 状态 | 表现 |
|------|------|
| Default | 三栏均可见，默认比例 |
| Compact | 窗口 < 800px，右侧面板折叠为 Tab |
| Nav Collapsed | 左侧面板收至 48px 图标栏 |
| Dragging Divider | 分隔条高亮 `primary-500`，面板实时 resize |
| Full Artifact | 双击右分隔条，Artifact 展开至最大 |

---

## 2. AppHeader

顶部栏，贯穿应用全宽。

### 结构

```
┌──────────────────────────────────────────────────────────────┐
│ [Logo] DeepLens   │   ProjectName ▾   │  ◉ Agent状态  │ ⚙ │
│                   │                    │              │    │
└──────────────────────────────────────────────────────────────┘
  高度: 48px
```

### 视觉规范

- **背景**: `neutral-0` (light) / `neutral-950` (dark), 底部 1px `border-light` / `border-dark`
- **Logo**: 橙色渐变图标 (`primary-500` → `primary-600`), 20x20px
- **项目名**: `text-sm` `font-semibold` `neutral-700` (light) / `neutral-200` (dark)
- **Agent 状态点**: 8px 圆形，颜色跟随 Agent State Colors (参见 tokens.md)
- **设置图标**: 20px, `neutral-500`, hover `neutral-700`

### 交互状态

| 元素 | Hover | Active | Disabled |
|------|-------|--------|----------|
| 项目切换 | 背景 `neutral-100`, 下拉箭头旋转 | 展开下拉列表 | 灰色文字, 无交互 |
| Agent 状态 | Tooltip 显示详细状态 | — | — |
| 设置图标 | `neutral-700`, scale(1.05) | `neutral-800` | — |

---

## 3. NavigationTree

左侧面板文档目录树，显示知识骨架和生成状态。

### 节点结构

```
▼ 📁 用户鉴权              ● completed
    📄 JWT Token 管理       ● completed
    📄 OAuth2 集成          ◐ generating
    📄 权限控制              ○ pending
▶ 📁 订单处理              ○ pending
▶ 📁 支付网关              ○ pending
```

### 节点状态图标

| 状态 | 图标 | 颜色 | 动画 |
|------|------|------|------|
| Completed | `●` 实心圆 | `semantic-success` (#16A34A) | 无 |
| Generating | `◐` 半圆 | `primary-500` (#F97316) | 旋转动画 `spin` 2s |
| Pending | `○` 空心圆 | `neutral-400` (#A8A29E) | 无 |
| Error | `●` 实心圆 | `semantic-error` (#DC2626) | 短暂闪烁后静止 |

### 视觉规范

- **面板背景**: `neutral-0` (light) / `neutral-900` (dark)
- **节点高度**: 32px，左侧缩进 16px/层级
- **文字**: `text-sm` `neutral-700` (light) / `neutral-300` (dark)
- **展开/折叠箭头**: 8px 三角, `neutral-400`, 旋转过渡 `duration-fast`
- **文件夹图标**: 16px, `secondary-500`
- **文件图标**: 16px, `neutral-400`
- **选中节点**: 背景 `primary-50` (light) / `primary-950` (dark), 左侧 2px 竖线 `primary-500`
- **底部**: 进度摘要 "3/8 sections completed", `text-xs` `neutral-500`

### 交互状态

| 状态 | 表现 |
|------|------|
| Default | 正常文字颜色和图标 |
| Hover | 背景 `neutral-100` (light) / `neutral-800` (dark), 过渡 `duration-fast` |
| Selected | 背景 `primary-50`, 左侧 2px `primary-500` 竖线 |
| Generating | 状态图标旋转, 文字 `primary-600` |
| Disabled | 文字 `neutral-300`, 不可点击 |
| Drag Over | 2px `primary-400` 虚线框, 背景 `primary-50` |

---

## 4. ThoughtStream

中间面板思考流，实时展示 Agent 的推理过程。

### 事件卡片类型

#### 4.1 Thought 卡片

Agent 的思考/推理内容。

```
┌─────────────────────────────────────────┐
│ 🤔  正在分析 Auth 模块的依赖关系...       │
│                                         │
│    检测到 JWT 和 OAuth2 两种认证策略，   │
│    需要进一步确认各自的使用场景...        │
│                                    14:32│
└─────────────────────────────────────────┘
```

- **左侧**: 橙色渐变竖线 3px (`primary-400` → `primary-600`)
- **图标**: 🤔 (思考), 16px
- **内容**: `text-base` `neutral-700` (light) / `neutral-200` (dark)
- **时间戳**: `text-xs` `neutral-400`, 右下角
- **背景**: `neutral-0` (light) / `neutral-850` (dark)
- **圆角**: `rounded-lg`
- **入场动画**: `slide-up` + `fade-in` 250ms

#### 4.2 Tool Start 卡片

Agent 开始调用工具。

```
┌─────────────────────────────────────────┐
│ ▶  read_file                            │
│    src/auth/jwt-strategy.ts             │
│                           ⏳ 执行中...   │
└─────────────────────────────────────────┘
```

- **左侧**: 蓝色竖线 3px (`semantic-info`)
- **图标**: `▶` 播放, `semantic-info`
- **工具名**: `text-sm` `font-mono` `font-medium`
- **参数**: `text-xs` `font-mono` `neutral-500`, 单行截断
- **状态**: 右侧脉冲圆点 + "执行中..."
- **背景**: `info-bg` 淡蓝底

#### 4.3 Tool End 卡片

工具执行完成。

```
┌─────────────────────────────────────────┐
│ ✓  read_file                   120ms    │
│    src/auth/jwt-strategy.ts             │
└─────────────────────────────────────────┘
```

- **左侧**: 绿色竖线 3px (`semantic-success`)
- **图标**: `✓` 勾, `semantic-success`
- **耗时**: `text-xs` `neutral-400`, 右上角
- **折叠**: 默认折叠为单行，可展开查看工具输出摘要
- **背景**: `success-bg` 淡绿底

#### 4.4 Progress 卡片

整体进度更新。

```
┌─────────────────────────────────────────┐
│ 📊  探索进度                             │
│    ████████████░░░░░░░░  3/8 (37.5%)   │
│    当前: 用户鉴权模块                    │
└─────────────────────────────────────────┘
```

- **进度条**: 高 6px, `rounded-full`, 填充 `primary-500`, 底色 `neutral-200`
- **生成态**: 进度条带 `flow-gradient` 动画
- **文字**: 分数 `font-medium`, 百分比 `neutral-500`

#### 4.5 Error 卡片

错误事件。

```
┌─────────────────────────────────────────┐
│ ✗  read_file 失败                        │
│    ENOENT: src/auth/deprecated.ts       │
│    已跳过，继续分析其他文件...            │
│                              [重试]      │
└─────────────────────────────────────────┘
```

- **左侧**: 红色竖线 3px (`semantic-error`)
- **图标**: `✗` 叉, `semantic-error`
- **错误信息**: `text-sm` `font-mono` `semantic-error`
- **恢复说明**: `text-sm` `neutral-600`
- **重试按钮**: 文字按钮, `primary-500`
- **背景**: `error-bg` 淡红底

### 思考流布局规范

- **卡片间距**: `space-3` (12px)
- **面板内边距**: `space-4` (16px)
- **自动滚动**: 新事件到达时自动滚至底部，用户手动滚动时暂停自动滚动
- **滚动指示器**: 非底部时显示 "↓ New events" 浮动按钮
- **最大显示**: 保留最近 200 条事件，更早的虚拟化

---

## 5. OutlineEditor

HITL 大纲审查时的树状编辑器，覆盖在 Flow 面板上。

### 结构

```
┌─────────────────────────────────────────┐
│ 📋 知识骨架审查                    [确认] │
├─────────────────────────────────────────┤
│                                         │
│ ⠿ ▼ 用户鉴权                      [⋯]  │
│ ⠿   ├── JWT Token 管理            [⋯]  │
│ ⠿   ├── OAuth2 集成               [⋯]  │
│ ⠿   └── 权限控制                   [⋯]  │
│ ⠿ ▼ 订单处理                      [⋯]  │
│ ⠿   ├── 订单生命周期               [⋯]  │
│ ⠿   └── 库存扣减                   [⋯]  │
│                                         │
│           [+ 新增模块]                   │
└─────────────────────────────────────────┘
```

### 视觉规范

- **标题栏**: `text-lg` `font-semibold`, 底部 1px 分隔线
- **确认按钮**: `primary-500` 填充, 白色文字, `rounded-md`, 右上角
- **节点行高**: 36px
- **拖拽手柄 (`⠿`)**: 6 点网格, `neutral-300`, hover `neutral-500`
- **展开箭头**: 8px, `neutral-400`, 旋转过渡 `duration-fast`
- **节点文字**: `text-sm` `neutral-700`, 可双击进入编辑
- **操作菜单 (`[⋯]`)**: 16px, `neutral-400`, hover `neutral-600`
- **新增按钮**: 虚线边框 `neutral-300`, `text-sm` `neutral-500`, hover `primary-500`

### 节点拖拽指示

| 状态 | 表现 |
|------|------|
| Drag Start | 节点 opacity 0.5, 生成拖拽影像 |
| Drag Over (Before) | 目标节点上方 2px `primary-500` 线 |
| Drag Over (Inside) | 目标节点背景 `primary-50`, 2px `primary-400` 虚线框 |
| Drag Over (After) | 目标节点下方 2px `primary-500` 线 |
| Drop | `scale-in` 动画 250ms, 节点归位 |
| Invalid Drop | 短暂红色闪烁, 节点回弹 |

### 右键菜单

```
┌──────────────────┐
│ ✏️  重命名        │
│ 📝  编辑描述      │
│ ─────────────── │
│ ➕  添加子节点    │
│ 📋  复制          │
│ ─────────────── │
│ 🗑️  删除          │  ← 文字 semantic-error
└──────────────────┘
```

- **背景**: `neutral-0` (light) / `neutral-800` (dark), `shadow-lg`
- **菜单项高度**: 32px, `text-sm`
- **Hover**: 背景 `neutral-100` (light) / `neutral-700` (dark)
- **分隔线**: 1px `neutral-200` (light) / `neutral-700` (dark)
- **删除项**: 文字 `semantic-error`, hover 背景 `error-bg`

### Inline 编辑

- 双击节点文字进入编辑态
- 编辑框: `border-2` `primary-500`, `rounded-md`, `shadow-sm`
- 背景: `neutral-0`, `text-sm`
- Enter 确认, Escape 取消
- 确认时短暂绿色闪烁反馈

---

## 6. ChatWidget

右下角可折叠 Chat 面板，嵌入 Artifact 面板内。

### 结构

```
┌──────────────────────────────────────┐
│ 💬 Chat           Fast │ Deep   [—] │
├──────────────────────────────────────┤
│                                      │
│         ┌──────────────────────┐     │
│         │ JWT 的刷新机制是      │     │
│         │ 怎样的？             │     │  ← 用户消息
│         └──────────────────────┘     │
│                                      │
│  ┌──────────────────────────────┐    │
│  │ JWT 刷新采用双 Token 策略：   │    │  ← AI 回答
│  │ 1. Access Token (15min)     │    │
│  │ 2. Refresh Token (7days)    │    │
│  │                             │    │
│  │ 📎 来源: auth/jwt-strategy  │    │  ← 引用来源
│  └──────────────────────────────┘    │
│                                      │
├──────────────────────────────────────┤
│ [Ask about this page...]        [↑] │
└──────────────────────────────────────┘
```

### 视觉规范

- **面板高度**: 360px (可拖拽 200px ~ 500px)
- **背景**: `neutral-0` (light) / `neutral-900` (dark)
- **圆角**: `rounded-xl` (顶部)
- **阴影**: `shadow-xl`
- **头部**: `space-4` padding, 底部 1px 分隔线

### Tab 切换 (Fast / Deep)

- **非活跃 Tab**: `text-sm` `neutral-500`, 无底线
- **活跃 Tab**: `text-sm` `font-medium` `primary-600`, 底部 2px `primary-500` 下划线
- **Deep Tab**: 旁边显示小 `⚡` 图标表示高级模式
- **切换动画**: 下划线滑动 `duration-normal`

### 消息气泡

| 类型 | 对齐 | 背景 | 圆角 |
|------|------|------|------|
| 用户消息 | 右对齐 | `primary-500` (文字 white) | `rounded-2xl`, 右下角 `rounded-sm` |
| AI 回答 | 左对齐 | `neutral-100` (light) / `neutral-800` (dark) | `rounded-2xl`, 左下角 `rounded-sm` |
| 来源引用 | 左对齐, AI 消息内 | `neutral-50` 底 + 左侧 2px `primary-300` | `rounded-md` |
| CoT 思维链 (Deep) | 左对齐 | `secondary-50` (light) / `neutral-850` (dark), 可折叠 | `rounded-lg` |

### 输入区域

- **容器**: 底部固定, `space-3` padding
- **输入框**: 多行 textarea, `rounded-xl`, `border` `neutral-200`, 高度自适应 (max 120px)
- **Focus**: `border-2` `primary-500`, `shadow-glow-primary`
- **发送按钮**: 圆形 36px, `primary-500`, 白色箭头图标
- **发送按钮 Disabled**: `neutral-300`, 无输入时禁用
- **发送按钮 Hover**: `primary-600`, `shadow-sm`

### 折叠/展开

- **折叠态**: 只显示头部栏 (48px), 右侧 `[+]` 展开按钮
- **展开动画**: `slide-up` 350ms + `ease-spring`
- **折叠动画**: `slide-down` 250ms + `ease-default`

---

## 7. SettingsDialog

模态设置对话框，管理所有外部服务配置。

### 结构

```
┌──────────────────────────────────────────────┐
│ ⚙ 设置                                 [✕] │
├───────┬──────────────────────────────────────┤
│       │                                      │
│ Claude│  Claude API 配置                      │
│ ─────│                                      │
│ Silicon│  API Base URL                        │
│ ─────│  ┌────────────────────────────────┐  │
│ 通用  │  │ https://api.anthropic.com      │  │
│       │  └────────────────────────────────┘  │
│       │                                      │
│       │  API Key                             │
│       │  ┌────────────────────────────────┐  │
│       │  │ sk-ant-••••••••••••••          │  │
│       │  └────────────────────────────────┘  │
│       │                                      │
│       │  模型                                │
│       │  ┌────────────────────────────────┐  │
│       │  │ claude-sonnet-4-20250514    ▾  │  │
│       │  └────────────────────────────────┘  │
│       │                                      │
│       │         [Test Connection]  [保存]     │
└───────┴──────────────────────────────────────┘
```

### 视觉规范

- **模态框**: 最大 640px 宽, 居中, `rounded-2xl`, `shadow-xl`
- **遮罩层**: `neutral-950` opacity 0.5 (light) / 0.7 (dark)
- **出入动画**: 遮罩 `fade-in`/`fade-out`, 对话框 `scale-in`/`fade-out` 250ms
- **左侧 Tab**: 宽 120px, `neutral-50` 背景 (light) / `neutral-850` (dark)

### Tab 导航

| Tab | 图标 | 内容 |
|-----|------|------|
| Claude | 🤖 | API Base URL, API Key, Model 选择 |
| SiliconFlow | ⚡ | API URL, API Key, Embedding 模型, LLM 模型 |
| 通用 | 🔧 | 存储路径, VitePress 端口, MCP 端口 |

- **非活跃 Tab**: `text-sm` `neutral-600`, 左侧无标记
- **活跃 Tab**: `text-sm` `font-medium` `primary-600`, 左侧 3px `primary-500` 竖线, 背景 `neutral-0` (light) / `neutral-800` (dark)

### 表单字段

- **Label**: `text-sm` `font-medium` `neutral-700`, 上方 `space-1`
- **Input**: `rounded-md`, `border` `neutral-200`, `text-sm`, 高 40px, 内边距 `space-3`
- **Input Focus**: `border-2` `primary-500`, `ring-2` `primary-100`
- **API Key Input**: 密码模式, 右侧眼睛图标切换可见性
- **Select**: 同 Input 样式, 右侧下拉箭头
- **Help Text**: `text-xs` `neutral-500`, 字段下方

### 按钮

| 按钮 | 样式 |
|------|------|
| Test Connection | Ghost 按钮: `border` `neutral-200`, `text-sm` `neutral-700`, hover 背景 `neutral-100` |
| 保存 | Primary 按钮: `bg-primary-500`, `text-white`, hover `bg-primary-600` |
| 关闭 (✕) | 图标按钮: `neutral-400`, hover `neutral-700`, 24px |

### Test Connection 反馈

| 结果 | 表现 |
|------|------|
| Testing | 按钮内 spinner + "连接中..." |
| Success | 按钮变绿 `semantic-success` + "✓ 连接成功", 2s 后恢复 |
| Failed | 按钮变红 `semantic-error` + "✗ 连接失败", 下方显示错误详情 |

---

## 8. ProjectCard

项目选择页面的项目卡片。

### 结构

```
┌────────────────────────────────────┐
│ 📁                                 │
│                                    │
│ My Spring Boot App                 │
│ /Users/dev/projects/spring-app     │
│                                    │
│ Java · Spring Boot · 128 files     │
│ 最后分析: 2 天前          ● Ready  │
└────────────────────────────────────┘
```

### 视觉规范

- **尺寸**: 280px 宽, auto 高, `rounded-xl`
- **背景**: `neutral-0` (light) / `neutral-850` (dark)
- **边框**: 1px `neutral-200` (light) / `neutral-700` (dark)
- **内边距**: `space-5`
- **文件夹图标**: 32px, `primary-500`
- **项目名**: `text-lg` `font-semibold` `neutral-800` (light) / `neutral-100` (dark)
- **路径**: `text-xs` `font-mono` `neutral-400`, 单行截断 ellipsis
- **技术栈标签**: `text-xs` `neutral-500`, dot 分隔
- **状态 Badge**: `text-xs`, 颜色跟随 Agent State Colors

### 交互状态

| 状态 | 表现 |
|------|------|
| Default | 静态卡片 |
| Hover | `shadow-md`, border `primary-200`, translateY(-2px) `duration-normal` |
| Active | `shadow-sm`, border `primary-400`, translateY(0) |
| Selected | border 2px `primary-500`, `shadow-glow-primary` |
| Generating | 顶部 2px 进度条 `primary-500` + `flow-gradient` 动画 |
| Disabled | opacity 0.5, cursor not-allowed |

### 新增项目卡片

```
┌────────────────────────────────────┐
│                                    │
│              ＋                     │
│                                    │
│         导入新项目                  │
│    点击选择项目文件夹               │
│                                    │
└────────────────────────────────────┘
```

- **边框**: 2px dashed `neutral-300`
- **图标**: 32px `+`, `neutral-400`
- **文字**: `text-sm` `neutral-500`
- **Hover**: border `primary-300`, 图标和文字 `primary-500`, 背景 `primary-50`

---

## 9. Shared Components

### 9.1 Button

| Variant | Background | Text | Border | Hover | Active |
|---------|-----------|------|--------|-------|--------|
| Primary | `primary-500` | white | none | `primary-600`, `shadow-sm` | `primary-700` |
| Secondary | `neutral-100` | `neutral-700` | none | `neutral-200` | `neutral-300` |
| Ghost | transparent | `neutral-600` | 1px `neutral-200` | bg `neutral-100` | bg `neutral-200` |
| Danger | `semantic-error` | white | none | darker 10% | darker 20% |
| Text | transparent | `primary-600` | none | bg `primary-50` | bg `primary-100` |

**通用规范**:
- 高度: 36px (sm) / 40px (md) / 44px (lg)
- `rounded-md`, `text-sm` `font-medium`
- 内边距: `space-3` (sm) / `space-4` (md) / `space-5` (lg) 水平
- Disabled: opacity 0.5, cursor not-allowed
- 加载态: 内容替换为 spinner 8px

### 9.2 Toast

```
┌──────────────────────────────────────┐
│ ✓  文档生成完成                  [✕] │
└──────────────────────────────────────┘
```

- **定位**: 右上角, 距顶部 `space-4`, 距右侧 `space-4`
- **背景**: `neutral-0` (light) / `neutral-800` (dark), `shadow-lg`
- **圆角**: `rounded-lg`
- **左侧色带**: 4px, 颜色跟随类型 (success/warning/error/info)
- **入场**: `slide-down` + `fade-in` 300ms
- **自动消失**: 5s 后 `fade-out` 250ms
- **堆叠**: 多条 Toast 垂直排列, 间距 `space-2`

### 9.3 Tooltip

- **背景**: `neutral-800` (light) / `neutral-200` (dark)
- **文字**: `text-xs` white (light) / `neutral-800` (dark)
- **圆角**: `rounded-md`
- **内边距**: `space-1.5` vertical, `space-2` horizontal
- **箭头**: 6px 三角, 同背景色
- **出现延迟**: 500ms
- **动画**: `fade-in` + `scale-in` 150ms

### 9.4 Skeleton Screen

骨架屏，用于 Section 生成中的占位。

```
┌──────────────────────────────────────┐
│ ████████████████████                 │  ← 标题骨架
│                                      │
│ ████████████████████████████████████ │  ← 文本骨架
│ ██████████████████████████           │
│ ████████████████████████████████     │
│                                      │
│ ┌──────────────────────────────────┐ │  ← 图表骨架
│ │          ████████                │ │
│ │    ████     ████     ████        │ │
│ └──────────────────────────────────┘ │
│                                      │
│  🔄 Agent 正在撰写此章节...          │
└──────────────────────────────────────┘
```

- **骨架条**: `neutral-200` (light) / `neutral-700` (dark), `rounded-sm`
- **动画**: `skeleton-shimmer` — 从左到右的光泽移动效果
- **间距**: 行间 `space-2`, 块间 `space-4`
- **底部文字**: `text-sm` `neutral-500`, 带 `pulse-amber` 动画的 🔄
