---
description: 项目命名规范 - 对话记录、分支、文档等命名标准
---

# 命名规范

## 1. Git 分支命名

```
feature/功能名称     # 新功能
fix/bug描述          # Bug修复
refactor/模块名称    # 重构
docs/文档类型        # 文档更新
```

**示例**：

- `feature/ai-chat-streaming`
- `fix/market-sentiment-loading`
- `refactor/akshare-integration`

## 2. Commit Message

```
feat: 新增功能描述
fix: 修复问题描述
refactor: 重构内容描述
docs: 文档更新描述
style: 代码格式调整
test: 测试相关
chore: 构建/配置相关
```

**示例**：

- `feat: 添加拖拽删除自选股功能`
- `fix: 修复AI聊天流式响应中断`
- `refactor: 重构市场情绪数据获取逻辑`

## 3. 文件命名

### React 组件

- PascalCase: `StockListItem.tsx`, `AIChatPanel.tsx`
- 组件放在对应功能目录下

### TypeScript 模块

- camelCase: `eastmoney.ts`, `akshare.ts`
- 工具函数: `xxxUtils.ts`
- 类型定义: `types.ts` 或 `xxx.types.ts`

### 目录结构

```
client/src/
├── components/
│   ├── ai/           # AI 相关组件
│   ├── market/       # 市场相关组件
│   ├── stock/        # 股票相关组件
│   └── ui/           # 通用 UI 组件
├── hooks/            # 自定义 Hooks
├── lib/              # 工具库
└── pages/            # 页面组件

server/
├── _core/            # 核心逻辑
├── data/             # 数据文件
└── gauge/            # Gauge 评分
```

## 4. Workflow 文件命名

```
daily-summary-YYYY-MM-DD.md   # 每日总结
git-workflow.md               # Git 工作流
dev-workflow.md               # 开发流程
debug-guide.md                # 调试指南
```

## 5. 变量命名

### JavaScript/TypeScript

- 变量/函数: camelCase (`stockCode`, `getMarketData`)
- 常量: UPPER_SNAKE_CASE (`API_BASE_URL`, `MAX_RETRY_COUNT`)
- 类/接口: PascalCase (`StockQuote`, `MarketSentiment`)
- 布尔值: 使用 is/has/can 前缀 (`isLoading`, `hasError`)

### CSS 类名

- 使用 Tailwind 时遵循 Tailwind 规范
- 自定义类使用 kebab-case (`stock-list-item`, `ai-chat-panel`)

## 6. API 端点命名

```
stocks.search      # 搜索股票
stocks.getDetail   # 获取详情
watchlist.add      # 添加到观察池
watchlist.remove   # 从观察池删除
market.sentiment   # 市场情绪
ai.chat            # AI 聊天
```
