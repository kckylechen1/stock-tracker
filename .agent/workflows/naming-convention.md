---
description: 项目命名规范 - 对话记录、分支、文档等命名标准
---

# 命名规范

## 一、对话记录命名

AI 对话记录按以下格式命名：

```
[日期] [主要功能/模块]
```

### 示例
- `2026-01-08 AI Function Calling + 策略 UI`
- `2026-01-09 Skill 管理模块开发`
- `2026-01-10 回测引擎集成`
- `2026-01-11 K线图优化 + 技术指标`

### 规则
1. 日期格式：`YYYY-MM-DD`
2. 功能描述：简洁明了，2-5 个关键词
3. 多个功能用 `+` 连接
4. 中文优先，技术术语可用英文

---

## 二、Git 分支命名

```
[类型]/[日期]-[功能描述]
```

### 类型
- `feature/` - 新功能
- `fix/` - Bug 修复
- `refactor/` - 重构
- `docs/` - 文档更新

### 示例
- `feature/2026-01-08-ai-function-calling`
- `fix/2026-01-09-kline-loading`
- `refactor/2026-01-10-chat-panel`

---

## 三、文档命名

### 设计文档
```
[模块名]-design.md
[模块名]-dev-plan.md
```

示例：
- `nlp-strategy-design.md`
- `nlp-strategy-dev-plan.md`

### 每日总结
```
daily-summary-[日期].md
```

示例：
- `daily-summary-2026-01-08.md`

---

## 四、代码文件命名

| 类型 | 格式 | 示例 |
|-----|------|------|
| React 组件 | PascalCase | `StockDetailPanel.tsx` |
| 工具函数 | camelCase | `stockTools.ts` |
| 常量/配置 | camelCase | `env.ts`, `config.ts` |
| API 路由 | camelCase | `routers.ts` |
| 类型定义 | camelCase | `types.ts` |

---

**创建日期**: 2026-01-08
**最后更新**: 2026-01-08
