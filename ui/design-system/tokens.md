# DeepLens Design Tokens

> Version 1.0.0 | 2026-02-19
> Manus-inspired Agentic Desktop App | Orange Warm-tone

---

## 1. Color System

### 1.1 Primary — Orange Warm-tone

品牌核心色，传达温暖、智能、活力。

| Token | Hex | Tailwind Variable | 用途 |
|-------|-----|-------------------|------|
| `primary-50` | `#FFF7ED` | `--color-primary-50` | 最浅背景 / Hover 态 |
| `primary-100` | `#FFEDD5` | `--color-primary-100` | 浅背景 / 选中态背景 |
| `primary-200` | `#FED7AA` | `--color-primary-200` | 边框 / 分隔线 |
| `primary-300` | `#FDBA74` | `--color-primary-300` | 图标次要色 |
| `primary-400` | `#FB923C` | `--color-primary-400` | 活跃指示器 |
| `primary-500` | `#F97316` | `--color-primary-500` | **品牌主色** / CTA 按钮 |
| `primary-600` | `#EA580C` | `--color-primary-600` | 按钮 Hover |
| `primary-700` | `#C2410C` | `--color-primary-700` | 按钮 Active / 深色文字 |
| `primary-800` | `#9A3412` | `--color-primary-800` | 深色标题 |
| `primary-900` | `#7C2D12` | `--color-primary-900` | 最深强调 |
| `primary-950` | `#431407` | `--color-primary-950` | 暗色模式背景强调 |

### 1.2 Secondary — Warm Amber

辅助色，用于次要操作和信息层次区分。

| Token | Hex | Tailwind Variable | 用途 |
|-------|-----|-------------------|------|
| `secondary-50` | `#FFFBEB` | `--color-secondary-50` | 提示背景 |
| `secondary-100` | `#FEF3C7` | `--color-secondary-100` | Badge 背景 |
| `secondary-200` | `#FDE68A` | `--color-secondary-200` | 分隔 / 边框 |
| `secondary-300` | `#FCD34D` | `--color-secondary-300` | 图标辅助 |
| `secondary-400` | `#FBBF24` | `--color-secondary-400` | 进度条活跃 |
| `secondary-500` | `#F59E0B` | `--color-secondary-500` | **辅助主色** |
| `secondary-600` | `#D97706` | `--color-secondary-600` | Hover |
| `secondary-700` | `#B45309` | `--color-secondary-700` | Active |
| `secondary-800` | `#92400E` | `--color-secondary-800` | 深色 |
| `secondary-900` | `#78350F` | `--color-secondary-900` | 最深 |

### 1.3 Neutral — Warm Gray

中性色带暖色底调，确保整体色调和谐。

| Token | Hex | Light Mode 用途 | Dark Mode 用途 |
|-------|-----|----------------|----------------|
| `neutral-0` | `#FFFFFF` | 页面背景 | — |
| `neutral-50` | `#FAFAF9` | 卡片背景 | — |
| `neutral-100` | `#F5F5F4` | 次级面板背景 | 高亮文字 |
| `neutral-200` | `#E7E5E4` | 边框 / 分隔线 | 次要文字 |
| `neutral-300` | `#D6D3D1` | 禁用态 | — |
| `neutral-400` | `#A8A29E` | 占位文字 | 禁用态 |
| `neutral-500` | `#78716C` | 次要文字 | 边框 |
| `neutral-600` | `#57534E` | 正文文字 | 分隔线 |
| `neutral-700` | `#44403C` | 标题文字 | 正文文字 |
| `neutral-800` | `#292524` | 强调文字 | 卡片背景 |
| `neutral-850` | `#1F1E1D` | — | 次级面板背景 |
| `neutral-900` | `#1C1917` | — | 页面背景 |
| `neutral-950` | `#0C0A09` | — | 最深背景 |

### 1.4 Semantic Colors

| 语义 | Light Hex | Dark Hex | Token | 用途 |
|------|-----------|----------|-------|------|
| **Success** | `#16A34A` | `#4ADE80` | `semantic-success` | 完成、通过、已连接 |
| Success BG | `#F0FDF4` | `#052E16` | `semantic-success-bg` | 成功提示背景 |
| **Warning** | `#D97706` | `#FBBF24` | `semantic-warning` | 注意、进行中 |
| Warning BG | `#FFFBEB` | `#422006` | `semantic-warning-bg` | 警告提示背景 |
| **Error** | `#DC2626` | `#F87171` | `semantic-error` | 错误、失败、断开 |
| Error BG | `#FEF2F2` | `#450A0A` | `semantic-error-bg` | 错误提示背景 |
| **Info** | `#2563EB` | `#60A5FA` | `semantic-info` | 提示、链接 |
| Info BG | `#EFF6FF` | `#172554` | `semantic-info-bg` | 信息提示背景 |

### 1.5 Agent State Colors

Agent 工作阶段专用色。

| 状态 | Hex | Token | 视觉表现 |
|------|-----|-------|---------|
| Idle | `#A8A29E` | `agent-idle` | 灰色静息 |
| Exploring | `#F97316` | `agent-exploring` | 橙色脉冲动画 |
| Waiting (HITL) | `#FBBF24` | `agent-waiting` | 琥珀色呼吸灯 |
| Generating | `#F97316` | `agent-generating` | 橙色流动渐变 |
| Indexing | `#2563EB` | `agent-indexing` | 蓝色进度条 |
| Ready | `#16A34A` | `agent-ready` | 绿色稳定 |
| Error | `#DC2626` | `agent-error` | 红色闪烁 |

---

## 2. Typography

### 2.1 Font Stack

```css
/* 英文优先，中文回退 */
--font-sans: "Inter", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif;
--font-mono: "JetBrains Mono", "Fira Code", "Noto Sans Mono", "SF Mono", monospace;
```

### 2.2 Type Scale

基于 `16px` base，`1.250` Major Third 比例。

| Token | Size | Line Height | Weight | 用途 |
|-------|------|-------------|--------|------|
| `text-xs` | 12px / 0.75rem | 16px / 1.33 | 400 | 辅助标签、时间戳 |
| `text-sm` | 14px / 0.875rem | 20px / 1.43 | 400 | 次要文字、工具提示 |
| `text-base` | 16px / 1rem | 24px / 1.5 | 400 | 正文、Agent 思考流 |
| `text-lg` | 18px / 1.125rem | 28px / 1.56 | 500 | Section 标题 |
| `text-xl` | 20px / 1.25rem | 28px / 1.4 | 600 | 面板标题 |
| `text-2xl` | 24px / 1.5rem | 32px / 1.33 | 600 | 页面标题 |
| `text-3xl` | 30px / 1.875rem | 36px / 1.2 | 700 | 项目名称 |

### 2.3 Font Weight

| Token | Weight | 用途 |
|-------|--------|------|
| `font-normal` | 400 | 正文 |
| `font-medium` | 500 | 小标题、强调 |
| `font-semibold` | 600 | 标题、按钮文字 |
| `font-bold` | 700 | 大标题、品牌文字 |

---

## 3. Spacing System

基于 `4px` 基数，8 点网格系统。

| Token | Value | 用途 |
|-------|-------|------|
| `space-0` | 0px | — |
| `space-0.5` | 2px | 微小间距（图标与文字） |
| `space-1` | 4px | 紧凑间距 |
| `space-1.5` | 6px | 标签内边距 |
| `space-2` | 8px | 小间距（表单字段间） |
| `space-3` | 12px | 列表项间距 |
| `space-4` | 16px | 标准内边距 |
| `space-5` | 20px | 卡片内边距 |
| `space-6` | 24px | Section 间距 |
| `space-8` | 32px | 面板间距 |
| `space-10` | 40px | 大区域间距 |
| `space-12` | 48px | 页面级间距 |
| `space-16` | 64px | 最大间距 |

---

## 4. Border Radius

| Token | Value | 用途 |
|-------|-------|------|
| `rounded-none` | 0px | 无圆角 |
| `rounded-sm` | 4px | 小元素（Badge、Tag） |
| `rounded-md` | 6px | 按钮、输入框 |
| `rounded-lg` | 8px | 卡片、面板 |
| `rounded-xl` | 12px | 对话框、弹窗 |
| `rounded-2xl` | 16px | 大卡片、模态框 |
| `rounded-full` | 9999px | 圆形按钮、头像 |

---

## 5. Shadows

### Light Mode

| Token | Value | 用途 |
|-------|-------|------|
| `shadow-xs` | `0 1px 2px rgba(28, 25, 23, 0.05)` | 微弱浮起 |
| `shadow-sm` | `0 1px 3px rgba(28, 25, 23, 0.08), 0 1px 2px rgba(28, 25, 23, 0.04)` | 按钮、输入框 |
| `shadow-md` | `0 4px 6px rgba(28, 25, 23, 0.07), 0 2px 4px rgba(28, 25, 23, 0.04)` | 卡片悬浮 |
| `shadow-lg` | `0 10px 15px rgba(28, 25, 23, 0.08), 0 4px 6px rgba(28, 25, 23, 0.04)` | 弹出菜单 |
| `shadow-xl` | `0 20px 25px rgba(28, 25, 23, 0.08), 0 8px 10px rgba(28, 25, 23, 0.03)` | 对话框 |

### Dark Mode

| Token | Value | 用途 |
|-------|-------|------|
| `shadow-xs` | `0 1px 2px rgba(0, 0, 0, 0.2)` | 微弱浮起 |
| `shadow-sm` | `0 1px 3px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2)` | 按钮、输入框 |
| `shadow-md` | `0 4px 6px rgba(0, 0, 0, 0.3), 0 2px 4px rgba(0, 0, 0, 0.2)` | 卡片悬浮 |
| `shadow-lg` | `0 10px 15px rgba(0, 0, 0, 0.35), 0 4px 6px rgba(0, 0, 0, 0.2)` | 弹出菜单 |
| `shadow-xl` | `0 20px 25px rgba(0, 0, 0, 0.4), 0 8px 10px rgba(0, 0, 0, 0.2)` | 对话框 |

### Special Shadows

| Token | Value | 用途 |
|-------|-------|------|
| `shadow-glow-primary` | `0 0 20px rgba(249, 115, 22, 0.15)` | Agent 活跃态发光 |
| `shadow-glow-success` | `0 0 12px rgba(22, 163, 74, 0.2)` | 完成态发光 |
| `shadow-inner` | `inset 0 2px 4px rgba(28, 25, 23, 0.06)` | 凹陷输入框 |

---

## 6. Borders

| Token | Value | 用途 |
|-------|-------|------|
| `border-width-default` | 1px | 标准边框 |
| `border-width-thick` | 2px | 聚焦态、选中态 |
| `border-light` | `#E7E5E4` (neutral-200) | Light 模式边框 |
| `border-dark` | `#44403C` (neutral-700) | Dark 模式边框 |
| `border-focus` | `#F97316` (primary-500) | 聚焦态边框 |
| `divider-light` | `#F5F5F4` (neutral-100) | Light 分隔线 |
| `divider-dark` | `#292524` (neutral-800) | Dark 分隔线 |

---

## 7. Animation & Transition

### 7.1 Duration

| Token | Value | 用途 |
|-------|-------|------|
| `duration-instant` | 75ms | 即时反馈（checkbox toggle） |
| `duration-fast` | 150ms | 微交互（按钮 hover、tooltip） |
| `duration-normal` | 250ms | 标准过渡（面板展开、tab 切换） |
| `duration-slow` | 350ms | 复杂动画（对话框出入） |
| `duration-slower` | 500ms | 大面积过渡（页面切换） |

### 7.2 Easing

| Token | Value | 用途 |
|-------|-------|------|
| `ease-default` | `cubic-bezier(0.4, 0, 0.2, 1)` | 标准缓动 |
| `ease-in` | `cubic-bezier(0.4, 0, 1, 1)` | 进入动画 |
| `ease-out` | `cubic-bezier(0, 0, 0.2, 1)` | 退出动画 |
| `ease-bounce` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | 弹性动画 |
| `ease-spring` | `cubic-bezier(0.22, 1, 0.36, 1)` | 弹簧效果 |

### 7.3 Keyframe Animations

| 名称 | 用途 | 描述 |
|------|------|------|
| `fade-in` | 元素出现 | opacity 0 → 1, 250ms |
| `fade-out` | 元素消失 | opacity 1 → 0, 200ms |
| `slide-up` | 底部弹入 | translateY(8px) → 0, opacity 0 → 1 |
| `slide-down` | 顶部弹入 | translateY(-8px) → 0, opacity 0 → 1 |
| `scale-in` | 缩放出现 | scale(0.95) → 1, opacity 0 → 1 |
| `pulse-orange` | Agent 探索脉冲 | box-shadow 橙色呼吸, 2s infinite |
| `pulse-amber` | HITL 等待呼吸灯 | opacity 0.6 → 1, 1.5s infinite |
| `flow-gradient` | 生成态流动 | background-position 线性移动, 3s infinite |
| `skeleton-shimmer` | 骨架屏闪烁 | background-position 左 → 右, 1.5s infinite |
| `spin` | 加载旋转 | rotate(0deg → 360deg), 1s infinite linear |
| `bounce-dot` | 加载点跳动 | translateY(0 → -4px), 0.6s infinite alternate |
| `typewriter` | 思考流文字 | 逐字出现效果 |

---

## 8. Z-Index Scale

| Token | Value | 用途 |
|-------|-------|------|
| `z-base` | 0 | 基础层 |
| `z-raised` | 10 | 浮起元素（卡片） |
| `z-dropdown` | 20 | 下拉菜单 |
| `z-sticky` | 30 | 固定头部 |
| `z-overlay` | 40 | 遮罩层 |
| `z-modal` | 50 | 对话框 |
| `z-popover` | 60 | 气泡弹出 |
| `z-toast` | 70 | Toast 通知 |
| `z-tooltip` | 80 | 工具提示 |
| `z-max` | 99 | 最高层级 |

---

## 9. Breakpoints

桌面应用适配不同窗口尺寸。

| Token | Min Width | 用途 |
|-------|-----------|------|
| `compact` | 800px | 最小窗口（隐藏右侧面板） |
| `standard` | 1024px | 标准窗口（三栏可见） |
| `wide` | 1280px | 宽屏（各栏宽裕） |
| `ultrawide` | 1536px | 超宽屏（最大间距） |

---

## 10. Layout Tokens

### Panel Sizes

| Token | Default | Min | Max | 用途 |
|-------|---------|-----|-----|------|
| `panel-nav-width` | 240px | 200px | 320px | 左侧导航面板 |
| `panel-flow-width` | 1fr | 360px | — | 中间思考流 |
| `panel-artifact-width` | 1fr | 400px | — | 右侧预览面板 |
| `panel-divider-width` | 4px | — | — | 分隔条宽度 |
| `header-height` | 48px | — | — | 顶部栏高度 |
| `chat-widget-height` | 360px | 200px | 500px | Chat 面板高度 |
