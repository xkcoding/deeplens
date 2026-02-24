# Desktop Analytics

## ADDED Requirements

### R1: PostHog Integration

- 使用 `posthog-js` SDK（Tauri WebView 直接使用 Web SDK）
- 与 Landing Page 共用同一个 PostHog Cloud project key
- Project key 通过环境变量注入（`VITE_POSTHOG_KEY`）
- API host: `https://us.i.posthog.com`（或 EU `https://eu.i.posthog.com`）

### R2: Event Schema — 业务事件

| 事件名 | 触发时机 | 属性 | 类型 |
|--------|---------|------|------|
| `app_launch` | 应用启动 | `version`, `os`, `arch` | 自动 |
| `project_analyze` | 开始分析项目 | `language`, `file_count` | 手动 |
| `project_generate` | 开始生成文档 | `domain_count` | 手动 |
| `search_fast` | Fast Search 查询 | — | 手动 |
| `search_deep` | Deep Search 查询 | — | 手动 |
| `mcp_connect` | MCP 客户端连接 | `client_name` | 手动 |
| `export_static` | 导出静态站点 | — | 手动 |
| `update_check` | 检查更新 | `current_version` | 手动 |
| `update_install` | 安装更新 | `new_version` | 手动 |

### R3: Event Schema — UI 交互事件

| 事件名 | 触发时机 | 属性 |
|--------|---------|------|
| `button_click` | 关键按钮点击 | `name`, `page` |
| `tab_switch` | Tab/面板切换 | `from`, `to` |
| `page_view` | 页面/视图切换 | `view_name` |

### R4: Event Tracking Integration Points

- `app_launch`: 在 React App 组件 `useEffect` 中调用 `posthog.capture()`
- `project_analyze` / `project_generate`: 在 SSE 事件流开始时发送
- `search_fast` / `search_deep`: 在搜索 API 调用前发送
- `mcp_connect`: 在 MCP server 接受连接时发送
- `export_static`: 在导出命令执行时发送
- `button_click`: 通过统一的事件追踪 hook 或 wrapper 组件采集
- `page_view`: PostHog 自动采集（SPA 模式下通过 `posthog.capture('$pageview')` 手动触发）

### R5: PostHog 配置

```typescript
posthog.init(POSTHOG_KEY, {
  api_host: 'https://us.i.posthog.com',
  autocapture: false,           // 关闭自动采集，仅手动上报
  capture_pageview: false,      // SPA 手动控制 pageview
  capture_pageleave: true,      // 页面离开事件
  persistence: 'localStorage',  // Tauri WebView 无 Cookie
  disable_session_recording: true, // 不录制会话，仅事件追踪
});
```

### R6: Privacy

- PostHog Cloud 不收集 PII（配置 `disable_session_recording: true`）
- 不使用 Cookie（`persistence: 'localStorage'`）
- 免费额度: 1M 事件/月
- 可通过 PostHog 后台配置数据保留策略

### R7: Development Mode

- 开发环境通过 `posthog.opt_out_capturing()` 禁用上报
- 通过 `import.meta.env.DEV` 判断环境
