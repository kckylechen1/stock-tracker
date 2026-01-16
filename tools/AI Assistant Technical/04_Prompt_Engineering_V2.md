# Stock Tracker - Prompt Engineering V2

**创建日期**: 2026-01-10  
**版本**: 2.0  
**目标**: 解决 AI 不识别意图、不调用函数、不知道日期的问题

---

## 1. 架构概览

```
┌─────────────────────────────────────────────────────────────────────┐
│                         用户输入                                     │
└────────────────────────────┬────────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Intent Router (意图路由器)                        │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 规则匹配 → 快速分类                                          │   │
│  │ 例: /走势|分析|技术面/ → ANALYZE_STOCK                       │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                             │                                        │
│                    无法匹配时 ↓ 调用 Qwen 分类                       │
└────────────────────────────┬────────────────────────────────────────┘
                             ▼
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Grok 4     │     │ DeepSeek V3  │     │   Qwen3      │
│  (Primary)   │     │   (Backup)   │     │  (Worker)    │
│              │     │              │     │              │
│ • 复杂分析   │     │ • 备用模式   │     │ • 数据获取   │
│ • 交易决策   │     │ • 批量任务   │     │ • Gauge填充  │
│ • 多轮对话   │     │ • 切换测试   │     │ • 新闻聚合   │
│              │     │              │     │ • 意图分类   │
│ temp: 0.85   │     │ temp: 0.7    │     │ temp: 0.3    │
└──────────────┘     └──────────────┘     └──────────────┘
```

---

## 2. 模型选择建议

### 2.1 Qwen Worker 模型推荐

| 模型                        | 参数量 | 速度 | 成本 | 推荐场景                   |
| --------------------------- | ------ | ---- | ---- | -------------------------- |
| `Qwen/Qwen3-235B-A22B`      | 235B   | 慢   | 高   | ❌ Worker不需要这么强      |
| `Qwen/Qwen3-32B`            | 32B    | 中   | 中   | ✅ **推荐** 平衡性能和成本 |
| `Qwen/Qwen2.5-32B-Instruct` | 32B    | 中   | 中   | ✅ 备选，指令遵循更好      |
| `Qwen/Qwen3-14B`            | 14B    | 快   | 低   | ✅ 简单任务可用            |
| `Qwen/Qwen3-8B`             | 8B     | 最快 | 最低 | ⚠️ 可能不够稳定            |

**推荐配置**:

```typescript
// Worker 模型（数据获取、简单任务）
const QWEN_WORKER_MODEL = "Qwen/Qwen3-32B";

// 意图分类模型（需要一定理解能力）
const QWEN_CLASSIFIER_MODEL = "Qwen/Qwen2.5-32B-Instruct";
```

### 2.2 模型参数对比

| 模型            | temperature           | max_tokens | 用途             |
| --------------- | --------------------- | ---------- | ---------------- |
| Grok 4          | **0.85** (提高创造性) | 4096       | 深度分析、长回答 |
| DeepSeek V3     | 0.7                   | 4096       | 备用分析         |
| Qwen Worker     | **0.2** (确定性输出)  | 2048       | 数据获取         |
| Qwen Classifier | **0.1** (稳定分类)    | 256        | 意图识别         |

---

## 3. Intent Router 设计

### 3.1 意图类型定义

```typescript
export type IntentType =
  // Grok 4 处理（复杂分析）
  | "ANALYZE_STOCK" // 走势分析、技术分析
  | "TRADING_DECISION" // 买卖决策、止损持有
  | "COMPARE_STOCKS" // 股票对比
  | "STRATEGY_ADVICE" // 策略建议
  | "MARKET_ANALYSIS" // 大盘分析

  // Qwen Worker 处理（数据获取）
  | "GET_QUOTE" // 查价格
  | "GET_NEWS" // 查新闻
  | "ADD_WATCHLIST" // 添加自选（触发数据预加载）
  | "BACKGROUND_TASK" // 后台任务

  // 直接处理（无需 LLM）
  | "SEARCH_STOCK" // 搜索股票
  | "GET_TIME" // 查时间
  | "GREETING" // 打招呼

  // 兜底
  | "GENERAL_QA"; // 一般问答
```

### 3.2 规则匹配引擎

```typescript
// server/_core/intentRouter.ts

interface IntentRule {
  patterns: RegExp[];
  intent: IntentType;
  confidence: number;
  requiredTools?: string[];
}

const INTENT_RULES: IntentRule[] = [
  // === Grok 4 路由 ===
  {
    patterns: [
      /走势.*(怎么样|如何|分析)/,
      /分析.*(走势|技术|资金|一下)/,
      /(技术面|资金面|基本面)/,
      /能(买|卖|入|出)吗/,
      /(买入|卖出|加仓|减仓|清仓).*(时机|点位|建议)/,
    ],
    intent: "ANALYZE_STOCK",
    confidence: 0.95,
    requiredTools: ["comprehensive_analysis"],
  },
  {
    patterns: [
      /(止损|止盈|持有|卖飞)/,
      /应该.*(卖|买|持有|观望)/,
      /(亏|赔|套).*怎么办/,
      /能不能(继续)?持有/,
    ],
    intent: "TRADING_DECISION",
    confidence: 0.95,
    requiredTools: ["comprehensive_analysis", "get_trading_memory"],
  },
  {
    patterns: [
      /(.+)(和|与|跟)(.+)(哪个|对比|比较)/,
      /(对比|比较).*(股票|个股)/,
    ],
    intent: "COMPARE_STOCKS",
    confidence: 0.9,
    requiredTools: ["comprehensive_analysis"],
  },
  {
    patterns: [/(大盘|上证|深证|创业板|指数)/, /市场.*(情绪|状态|怎么样)/],
    intent: "MARKET_ANALYSIS",
    confidence: 0.9,
    requiredTools: ["get_market_status", "get_market_fund_flow"],
  },

  // === Qwen Worker 路由 ===
  {
    patterns: [/(现在|当前).*价格/, /多少钱/, /(股价|价格)是多少/],
    intent: "GET_QUOTE",
    confidence: 0.95,
    requiredTools: ["get_stock_quote"],
  },
  {
    patterns: [/(新闻|消息|公告|利好|利空)/, /最近.*(发生|有什么)/],
    intent: "GET_NEWS",
    confidence: 0.85,
    requiredTools: ["get_market_news"],
  },

  // === 直接处理 ===
  {
    patterns: [/^(你好|hi|hello|嗨|早|晚)/i, /^(谢谢|感谢|辛苦)/],
    intent: "GREETING",
    confidence: 1.0,
  },
  {
    patterns: [/今天.*几号/, /现在.*时间/, /(日期|时间)是/],
    intent: "GET_TIME",
    confidence: 1.0,
  },
];

export function classifyIntent(
  message: string,
  stockCode?: string
): {
  intent: IntentType;
  confidence: number;
  requiredTools: string[];
  model: "grok" | "deepseek" | "qwen" | "direct";
} {
  // 1. 规则匹配
  for (const rule of INTENT_RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(message)) {
        const model = getModelForIntent(rule.intent);
        return {
          intent: rule.intent,
          confidence: rule.confidence,
          requiredTools: rule.requiredTools || [],
          model,
        };
      }
    }
  }

  // 2. 有股票上下文时，默认为分析意图
  if (stockCode) {
    return {
      intent: "ANALYZE_STOCK",
      confidence: 0.7,
      requiredTools: ["comprehensive_analysis"],
      model: "grok",
    };
  }

  // 3. 兜底：一般问答
  return {
    intent: "GENERAL_QA",
    confidence: 0.5,
    requiredTools: [],
    model: "grok",
  };
}

function getModelForIntent(
  intent: IntentType
): "grok" | "deepseek" | "qwen" | "direct" {
  const grokIntents: IntentType[] = [
    "ANALYZE_STOCK",
    "TRADING_DECISION",
    "COMPARE_STOCKS",
    "STRATEGY_ADVICE",
    "MARKET_ANALYSIS",
    "GENERAL_QA",
  ];
  const qwenIntents: IntentType[] = [
    "GET_QUOTE",
    "GET_NEWS",
    "ADD_WATCHLIST",
    "BACKGROUND_TASK",
  ];
  const directIntents: IntentType[] = ["SEARCH_STOCK", "GET_TIME", "GREETING"];

  if (grokIntents.includes(intent)) return "grok";
  if (qwenIntents.includes(intent)) return "qwen";
  if (directIntents.includes(intent)) return "direct";
  return "grok";
}
```

---

## 4. Grok 4 Prompt (Primary Analyst)

### 4.1 设计原则

1. **时间感知**: 在用户消息前注入当前时间，不是系统提示词
2. **结构清晰**: 分层设计（角色 → 工具 → 规则 → 格式）
3. **Few-shot**: 提供具体示例
4. **高温度**: 0.85 让回答更丰富、更长

### 4.2 完整 Prompt

```typescript
// server/_core/prompts/grokPrompt.ts

export function buildGrokSystemPrompt(context: {
  stockCode?: string;
  stockName?: string;
  preloadedData?: string;
}): string {
  const { stockCode, stockName, preloadedData } = context;

  return `# 角色
你是「小A」，一位经验丰富的A股短线交易分析师。你的分析风格：
- 🎯 **果断直接**：先给结论，再讲理由
- 📊 **数据驱动**：每个观点都有数据支撑
- 💡 **实战导向**：给出具体点位和操作建议
- ⚠️ **风险意识**：明确止损位和风险提示

# 你的工具

你可以调用以下工具获取实时数据：

| 工具 | 用途 | 何时调用 |
|------|------|----------|
| \`comprehensive_analysis\` | 综合分析（技术+资金+大盘） | 用户问"走势/分析/能买卖吗"时 **必须调用** |
| \`get_fund_flow_history\` | 历史资金流向 | 判断主力资金趋势 |
| \`analyze_minute_patterns\` | 5分钟K线形态 | 寻找买点/卖点 |
| \`get_guba_hot_rank\` | 股吧人气排名 | 判断市场关注度 |
| \`get_trading_memory\` | 用户交易记忆 | 了解用户持仓和历史教训 |

# 核心规则

## 规则1: 分析问题 → 必须先调用工具
当用户问"走势怎么样"、"能买吗"、"分析一下"时：
1. **先调用** \`comprehensive_analysis\` 获取数据
2. 基于数据生成分析报告

## 规则2: 回答要长、要深入
不要敷衍！一个完整的分析应该包括：
- 技术面判断（均线、MACD、RSI 等指标的**含义解读**）
- 资金面判断（主力是在吸筹还是出货？）
- 大盘环境（大盘配合吗？）
- 操作建议（具体点位 + 仓位建议）
- 风险提示（止损位 + 可能的风险）

## 规则3: 禁止的行为
❌ 不要原封不动复制工具返回的数据
❌ 不要说"仅供参考"、"建议结合自身情况"等废话
❌ 不要只罗列数据不解读
❌ 不要给模糊的建议（如"可以关注"）

${
  stockCode
    ? `
# 当前上下文

📌 **当前股票**: ${stockName || stockCode} (${stockCode})
${
  preloadedData
    ? `
📊 **已加载数据**:
${preloadedData}
`
    : ""
}
`
    : ""
}

# 回答格式模板

\`\`\`
## 📊 核心结论
【一句话给出明确判断：买入/卖出/持有/观望】

## 📈 技术面分析
### 趋势判断
- 短期趋势：...
- 中期趋势：...
- 关键均线位置：...

### 技术指标解读
- MACD：...（说明这意味着什么）
- RSI：...（是否超买/超卖）
- KDJ：...

### 支撑与压力
- 支撑位：XX.XX元（为什么是这里）
- 压力位：XX.XX元（为什么是这里）

## 💰 资金面分析
- 主力动向：...（在吸筹还是出货？）
- 近期趋势：...（加速流入还是减速？）
- 资金信号：...

## 🌍 大盘环境
- 大盘状态：...
- 是否配合：...

## 🎯 操作建议

### 对于已持仓者
- 建议：...
- 止损位：XX.XX元
- 止盈位：XX.XX元

### 对于未持仓者
- 建议：...
- 入场点位：XX.XX元
- 仓位建议：...

## ⚠️ 风险提示
1. ...
2. ...
\`\`\`

---

现在，请帮助用户分析他们的问题。记住：先调用工具获取数据，再给出深入分析！`;
}

// 用户消息预处理：注入时间
export function preprocessUserMessage(message: string): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
  const timeStr = now.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // 将时间放在用户消息最前面，模型更容易注意到
  return `【当前时间：${dateStr} ${timeStr}】

${message}`;
}
```

### 4.3 Grok 调用参数

```typescript
// 调用 Grok 4 时的参数配置
const grokConfig = {
  model: "grok-4-1-fast-reasoning",
  temperature: 0.85, // 提高创造性，让回答更丰富
  max_tokens: 4096,
  top_p: 0.95,
  // 不设置 frequency_penalty，避免重复惩罚影响专业术语
};
```

---

## 5. DeepSeek V3 Prompt (Backup)

### 5.1 针对 DeepSeek 的特殊优化

DeepSeek V3 的问题：

- 容易忽略系统提示词中的日期
- Function calling 不够稳定
- 容易复制粘贴工具输出

解决方案：

- **强制时间注入**: 在每条用户消息前加时间
- **简化提示词**: 减少干扰信息
- **显式工具指令**: 明确说"必须调用xxx"

### 5.2 完整 Prompt

```typescript
// server/_core/prompts/deepseekPrompt.ts

export function buildDeepSeekSystemPrompt(context: {
  stockCode?: string;
  stockName?: string;
  preloadedData?: string;
}): string {
  const { stockCode, stockName, preloadedData } = context;

  // DeepSeek 需要更简洁的提示词
  return `你是「小A」，A股短线分析师。

## 工具使用规则（必须遵守！）

当用户问任何关于股票的分析问题时，你**必须**调用工具：

| 问题类型 | 必须调用的工具 |
|----------|---------------|
| "走势怎么样" | comprehensive_analysis |
| "能买/卖吗" | comprehensive_analysis |
| "技术面分析" | comprehensive_analysis |
| "资金流向" | get_fund_flow_history |

⚠️ **严禁**不调用工具就直接回答分析问题！

## 回答规则

1. **先调用工具**，再回答
2. 用你**自己的话**解读数据，不要复制粘贴
3. 给**具体结论**（买/卖/观望）和**具体点位**
4. 回答要**详细**，至少500字

${
  stockCode
    ? `
## 当前股票
${stockName || stockCode} (${stockCode})
${preloadedData || ""}
`
    : ""
}`;
}

// DeepSeek 特殊的消息预处理
export function preprocessDeepSeekMessage(message: string): string {
  const now = new Date();

  // 更强调的时间格式，DeepSeek 不容易忽略
  return `===========================================
⏰ 系统时间：${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${now.getHours()}:${now.getMinutes().toString().padStart(2, "0")}
⚠️ 注意：你的训练数据截止2023年，但现在是${now.getFullYear()}年！
===========================================

用户问题：${message}`;
}
```

---

## 6. Qwen Worker Prompt

### 6.1 设计原则

Worker 模式的特点：

- **不聊天**: 只执行任务，不废话
- **结构化输出**: 返回 JSON 或格式化数据
- **低温度**: 0.2-0.3，确保稳定输出
- **快速**: 不需要深度推理

### 6.2 完整 Prompt

```typescript
// server/_core/prompts/qwenWorkerPrompt.ts

export const QWEN_WORKER_SYSTEM_PROMPT = `你是一个数据获取助手。

## 你的职责
执行工具调用，返回结构化数据。

## 规则
1. 收到任务后，立即调用对应的工具
2. 不要解释、不要废话
3. 直接返回工具结果

## 可用工具
- comprehensive_analysis: 综合分析
- get_stock_quote: 实时行情
- get_fund_flow: 今日资金流向
- get_fund_flow_history: 历史资金流向
- get_market_news: 最新新闻
- get_guba_hot_rank: 股吧人气排名
- analyze_minute_patterns: 分钟级形态

## 输出格式
直接输出工具返回的结果，不添加任何解释。`;

// Worker 任务请求格式
export function buildWorkerTask(task: {
  type: "gauge_data" | "news_data" | "quick_quote" | "analysis";
  stockCode: string;
}): string {
  switch (task.type) {
    case "gauge_data":
      return `获取 ${task.stockCode} 的综合分析数据，用于填充仪表盘。调用 comprehensive_analysis。`;
    case "news_data":
      return `获取 ${task.stockCode} 相关的最新新闻。调用 get_market_news。`;
    case "quick_quote":
      return `获取 ${task.stockCode} 的实时行情。调用 get_stock_quote。`;
    case "analysis":
      return `获取 ${task.stockCode} 的完整分析数据。依次调用：comprehensive_analysis, get_fund_flow_history, get_guba_hot_rank。`;
    default:
      return `获取 ${task.stockCode} 的数据。`;
  }
}
```

### 6.3 Qwen Worker 调用参数

```typescript
const qwenWorkerConfig = {
  model: "Qwen/Qwen3-32B", // 推荐使用 32B
  temperature: 0.2, // 低温度，确保稳定
  max_tokens: 2048,
  top_p: 0.9,
};
```

---

## 7. 意图分类器 Prompt (Qwen)

当规则无法匹配时，使用 Qwen 进行意图分类：

```typescript
// server/_core/prompts/classifierPrompt.ts

export const INTENT_CLASSIFIER_PROMPT = `你是一个意图分类器。

## 任务
分析用户消息，返回意图类型。

## 意图类型

| 意图 | 描述 | 示例 |
|------|------|------|
| ANALYZE_STOCK | 股票走势分析 | "蓝思科技走势怎么样"、"能买吗" |
| TRADING_DECISION | 交易决策 | "应该止损还是持有"、"卖飞了怎么办" |
| COMPARE_STOCKS | 股票对比 | "比亚迪和宁德时代哪个好" |
| MARKET_ANALYSIS | 大盘分析 | "今天大盘怎么样" |
| GET_QUOTE | 查询价格 | "现在多少钱" |
| GET_NEWS | 查询新闻 | "最近有什么消息" |
| GREETING | 打招呼 | "你好"、"谢谢" |
| GENERAL_QA | 一般问答 | 其他问题 |

## 输出格式
只返回意图类型，不要解释。

示例：
输入：蓝思科技今天跌了，能继续持有吗
输出：TRADING_DECISION

输入：帮我看看比亚迪
输出：ANALYZE_STOCK

输入：现在几点了
输出：GENERAL_QA`;

export function buildClassifierMessage(userMessage: string): string {
  return `分析以下用户消息的意图：

${userMessage}

输出意图类型：`;
}
```

---

## 8. 工具描述优化

现有工具描述太简单，需要增加：

- 触发词（何时调用）
- 输入示例
- 输出摘要

```typescript
// server/_core/stockTools.ts 优化版

export const stockToolsV2: Tool[] = [
  {
    type: "function",
    function: {
      name: "comprehensive_analysis",
      description: `股票综合分析工具。

【何时调用】
当用户问以下问题时必须调用：
- "走势怎么样"、"分析一下"
- "能买吗"、"能卖吗"
- "技术面怎么样"
- "资金面如何"

【输入】
{
  "code": "300433"  // 股票代码
}

【输出内容】
- 技术分析：均线状态、MACD、RSI、KDJ、成交量
- 资金分析：主力净流入、资金趋势
- 大盘状态：指数涨跌、整体情绪
- 综合建议：买入/卖出/观望`,
      parameters: {
        type: "object",
        properties: {
          code: {
            type: "string",
            description: "股票代码，如 300433、600519、002594",
          },
        },
        required: ["code"],
      },
    },
  },
  // ... 其他工具类似优化
];
```

---

## 9. 实现计划

### 第一阶段：创建新文件结构

```
server/_core/
├── prompts/
│   ├── grokPrompt.ts       # Grok 4 主提示词
│   ├── deepseekPrompt.ts   # DeepSeek V3 备用提示词
│   ├── qwenWorkerPrompt.ts # Qwen Worker 提示词
│   └── classifierPrompt.ts # 意图分类提示词
├── intentRouter.ts          # 意图路由器
├── modelConfig.ts           # 模型配置
└── streamChat.ts            # 更新：集成新架构
```

### 第二阶段：修改 streamChat.ts

1. 导入 intentRouter
2. 在处理消息前先分类意图
3. 根据意图选择模型和提示词
4. 统一处理工具调用

### 第三阶段：测试用例

```typescript
// 测试用例
const testCases = [
  {
    input: "蓝思科技走势怎么样",
    expectedIntent: "ANALYZE_STOCK",
    expectedModel: "grok",
  },
  {
    input: "应该止损还是持有",
    expectedIntent: "TRADING_DECISION",
    expectedModel: "grok",
  },
  { input: "现在多少钱", expectedIntent: "GET_QUOTE", expectedModel: "qwen" },
  { input: "你好", expectedIntent: "GREETING", expectedModel: "direct" },
  { input: "今天几号", expectedIntent: "GET_TIME", expectedModel: "direct" },
];
```

---

## 10. 配置汇总

```typescript
// server/_core/modelConfig.ts

export const MODEL_CONFIG = {
  // Grok 4 - 主分析师
  grok: {
    model: "grok-4-1-fast-reasoning",
    temperature: 0.85,
    max_tokens: 4096,
    top_p: 0.95,
  },

  // DeepSeek V3 - 备用
  deepseek: {
    model: "deepseek-ai/DeepSeek-V3",
    temperature: 0.7,
    max_tokens: 4096,
    top_p: 0.9,
  },

  // Qwen Worker - 数据获取
  qwenWorker: {
    model: "Qwen/Qwen3-32B",
    temperature: 0.2,
    max_tokens: 2048,
    top_p: 0.9,
  },

  // Qwen Classifier - 意图分类
  qwenClassifier: {
    model: "Qwen/Qwen2.5-32B-Instruct",
    temperature: 0.1,
    max_tokens: 64,
    top_p: 0.9,
  },
};
```

---

**文档创建**: 2026-01-10  
**作者**: AI Assistant  
**状态**: 待实施
