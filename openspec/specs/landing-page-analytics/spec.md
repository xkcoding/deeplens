# Landing Page Analytics

## ADDED Requirements

### R1: PostHog Integration

- 在 Layout.astro 的 `<head>` 中注入 PostHog snippet
- 与 Desktop App 共用同一个 PostHog Cloud project key
- Project key 通过环境变量注入（`PUBLIC_POSTHOG_KEY`）
- 开发环境不加载（通过 `import.meta.env.PROD` 判断）

### R2: Auto-collected Metrics

PostHog 自动采集（无需额外代码）：
- 页面浏览量（PV / $pageview）
- 独立访客（UV / distinct_id）
- 流量来源（$referrer, $referring_domain）
- 设备类型和浏览器（$browser, $device_type, $os）
- 地域分布（基于 GeoIP）

### R3: Custom Events — 按钮点击追踪

| 事件名 | 触发时机 | 属性 |
|--------|---------|------|
| `cta_click` | CTA 按钮点击（下载/安装） | `button_name`, `position` |
| `nav_click` | 导航链接点击 | `target`, `source_section` |
| `lang_switch` | 语言切换 | `from_lang`, `to_lang` |
| `faq_toggle` | FAQ 展开/折叠 | `question_id`, `action` |

### R4: Funnel Analysis

PostHog 后台配置漏斗：
- **下载漏斗**: Hero View → Features Scroll → CTA Click → GitHub Release
- **语言偏好**: Landing → Lang Switch → Page Browse

### R5: PostHog 配置

```html
<script>
  !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once register_for_session unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey identify setPersonProperties".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
  posthog.init('PUBLIC_POSTHOG_KEY', {
    api_host: 'https://us.i.posthog.com',
    person_profiles: 'anonymous',
  });
</script>
```

> 注: `PUBLIC_POSTHOG_KEY` 在构建时通过 Astro 环境变量替换。

### R6: Privacy

- 使用 `person_profiles: 'anonymous'` — 不创建用户画像
- 不使用 Cookie consent banner（PostHog anonymous 模式无需）
- 符合 GDPR
- 免费额度: 1M 事件/月（与 Desktop 共享）
