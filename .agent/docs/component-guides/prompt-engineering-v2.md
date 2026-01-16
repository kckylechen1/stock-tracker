# Prompt Engineering V2 开发指南

## 概述

本次优化主要解决以下问题：

1. AI 不识别用户意图
2. AI 不使用 function calling
3. DeepSeek V3 不知道日期
4. 回答太短、不够详细

**状态**: ✅ 已完成 (2026-01-10)

## 文件结构

```
server/_core/
├── prompts/                    # Prompt 模块
│   ├── index.ts               # 导出入口
│   ├── grokPrompt.ts          # Grok 4 主分析师 prompt
│   ├── deepseekPrompt.ts      # DeepSeek V3 备用 prompt
│   └── qwenWorkerPrompt.ts    # Qwen3 数据工作者 prompt
├── modelConfig.ts             # 模型配置中心
├── intentRouter.ts            # 意图路由器
└── streamChat.ts              # 主聊天入口（已更新使用新 prompt）
```

## 模型配置

| 模型            | 角色       | 温度       | 用途                           |
| --------------- | ---------- | ---------- | ------------------------------ |
| **Grok 4**      | 主分析师   | 1.0 (高)   | 复杂分析、交易决策、策略建议   |
| **DeepSeek V3** | 备用分析师 | 0.8        | 切换测试、批量任务             |
| **Qwen3-32B**   | 数据工作者 | 0.2 (低)   | Gauge 数据、新闻聚合、后台刷新 |
| **Qwen2.5-32B** | 意图分类器 | 0.1 (极低) | 规则无法匹配时的兜底分类       |

## 关键改进

### 1. 时间注入

将时间注入到**用户消息开头**，而不是埋在 system prompt：

```typescript
// preprocessUserMessage() in grokPrompt.ts
return `【当前时间：${dateStr} ${timeStr}】\n\n${message}`;
```

### 2. 结构化 Prompt

Grok prompt 包含：

- 角色定义
- 工具列表（分类清晰）
- 核心规则（强调行为）
- 回答模板（确保结构完整）

### 3. 意图路由

```typescript
classifyIntent("走势怎么样") → ANALYZE_STOCK → grok
classifyIntent("现在什么价") → GET_QUOTE → qwen
classifyIntent("今天几号") → GET_TIME → direct
```

## 使用方式

### Grok 模式（默认）

```typescript
import { buildGrokSystemPrompt, GROK_CONFIG } from "./prompts/grokPrompt";

const prompt = buildGrokSystemPrompt({
  stockCode: "300308",
  stockName: "中际旭创",
  preloadedData: "当前价: 583.20元...",
});

// 请求配置
const payload = {
  model: GROK_CONFIG.model, // grok-4-1-fast-reasoning
  temperature: GROK_CONFIG.temperature, // 1.0
  top_p: GROK_CONFIG.top_p, // 0.95
  max_tokens: GROK_CONFIG.max_tokens, // 4096
};
```

### Qwen Worker 模式

```typescript
import { qwenWorkerPrompt } from "./prompts/qwenWorkerPrompt";

const prompt = qwenWorkerPrompt({
  task: "fetch_gauge_data",
  stockCode: "300308",
});
```

## 测试方法

运行对比测试脚本：

```bash
npx tsx server/ai/test_prompt_comparison.ts
```

## 常见问题

### Q: AI 仍然不调用工具

**A:** 检查 prompt 规则是否明确。规则2 强调"必须先调用 comprehensive_analysis"。

### Q: 回答太短

**A:** 检查温度设置。GROK_CONFIG.temperature 应为 1.0。

### Q: 日期仍然错误

**A:** 确认 `preprocessUserMessage()` 被调用，时间在用户消息开头。

## 更新日志

- **2026-01-10**: 初始版本
  - 创建 prompts 模块
  - 集成到 streamChat.ts
  - 添加 AKShare 工具到 prompt

---

_维护者: Antigravity AI_
