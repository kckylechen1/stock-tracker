/**
 * Intent Router - 意图路由器
 *
 * 根据用户消息识别意图，路由到合适的模型
 */

import { ModelType } from "./modelConfig";

/**
 * 意图类型
 */
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

/**
 * 意图分类结果
 */
export interface IntentClassification {
  intent: IntentType;
  confidence: number;
  requiredTools: string[];
  model: "grok" | "deepseek" | "qwen" | "direct";
  matchedPattern?: string;
}

/**
 * 意图规则
 */
interface IntentRule {
  patterns: RegExp[];
  intent: IntentType;
  confidence: number;
  requiredTools?: string[];
}

/**
 * 意图匹配规则
 */
const INTENT_RULES: IntentRule[] = [
  // === Grok 4 路由（复杂分析） ===
  {
    patterns: [
      /走势.*(怎么样|如何|分析|咋样)/,
      /分析.*(走势|技术|资金|一下|看看)/,
      /(技术面|资金面|基本面)/,
      /能(买|卖|入|出)吗/,
      /(买入|卖出|加仓|减仓|清仓).*(时机|点位|建议)/,
      /帮我(看|分析|研究)/,
      /怎么看/,
      /(涨|跌).*(原因|为什么)/,
    ],
    intent: "ANALYZE_STOCK",
    confidence: 0.95,
    requiredTools: ["comprehensive_analysis"],
  },
  {
    patterns: [
      /(止损|止盈|持有|卖飞)/,
      /应该.*(卖|买|持有|观望)/,
      /(亏|赔|套|被套).*怎么办/,
      /能不能(继续)?持有/,
      /要不要(卖|跑|出)/,
      /还能(涨|跌)吗/,
    ],
    intent: "TRADING_DECISION",
    confidence: 0.95,
    requiredTools: ["comprehensive_analysis", "get_trading_memory"],
  },
  {
    patterns: [
      /(.+)(和|与|跟)(.+)(哪个|对比|比较|选哪)/,
      /(对比|比较).*(股票|个股)/,
      /哪个更(好|强|值得)/,
    ],
    intent: "COMPARE_STOCKS",
    confidence: 0.9,
    requiredTools: ["comprehensive_analysis"],
  },
  {
    patterns: [
      /(短线|波段|中线|长线).*(怎么做|策略)/,
      /操作策略/,
      /仓位.*(怎么|如何)/,
    ],
    intent: "STRATEGY_ADVICE",
    confidence: 0.85,
    requiredTools: ["comprehensive_analysis"],
  },
  {
    patterns: [
      /(大盘|上证|深证|创业板|科创板|指数)/,
      /市场.*(情绪|状态|怎么样)/,
      /今天.*行情/,
    ],
    intent: "MARKET_ANALYSIS",
    confidence: 0.9,
    requiredTools: ["get_market_status", "get_market_fund_flow"],
  },

  // === Qwen Worker 路由（简单数据获取） ===
  {
    patterns: [/(现在|当前|实时).*价格/, /多少钱/, /(股价|价格)是多少/, /报价/],
    intent: "GET_QUOTE",
    confidence: 0.95,
    requiredTools: ["get_stock_quote"],
  },
  {
    patterns: [
      /(新闻|消息|公告|利好|利空)/,
      /最近.*(发生|有什么)/,
      /什么.*消息/,
    ],
    intent: "GET_NEWS",
    confidence: 0.85,
    requiredTools: ["get_market_news"],
  },

  // === 直接处理（无需 LLM） ===
  {
    patterns: [
      /^(你好|hi|hello|嗨|早|晚|在吗)/i,
      /^(谢谢|感谢|辛苦|厉害)/,
      /^(好的|收到|明白)/,
    ],
    intent: "GREETING",
    confidence: 1.0,
  },
  {
    patterns: [
      /今天.*(几号|日期)/,
      /现在.*(时间|几点)/,
      /(日期|时间)是/,
      /^几号/,
    ],
    intent: "GET_TIME",
    confidence: 1.0,
  },
];

/**
 * 根据意图获取对应的模型
 */
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

  return "grok"; // 默认使用 Grok
}

/**
 * 分类用户意图
 */
export function classifyIntent(
  message: string,
  stockCode?: string
): IntentClassification {
  const normalizedMessage = message.trim().toLowerCase();

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
          matchedPattern: pattern.source,
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

/**
 * 直接处理的意图响应
 */
export function handleDirectIntent(intent: IntentType): string | null {
  switch (intent) {
    case "GREETING":
      const greetings = [
        "你好！有什么股票需要我帮你分析吗？",
        "嗨！告诉我你想了解哪只股票？",
        "你好！我是小A，A股分析师，有什么可以帮你的？",
      ];
      return greetings[Math.floor(Math.random() * greetings.length)];

    case "GET_TIME":
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
      return `现在是 ${dateStr} ${timeStr}`;

    default:
      return null;
  }
}

/**
 * 检查是否为交易时间
 */
export function isTradingHours(): boolean {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const time = hour * 100 + minute;

  // 周一到周五
  if (day === 0 || day === 6) return false;

  // 9:30 - 11:30, 13:00 - 15:00
  if ((time >= 930 && time <= 1130) || (time >= 1300 && time <= 1500)) {
    return true;
  }

  return false;
}

/**
 * 获取交易状态描述
 */
export function getTradingStatus(): string {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const time = hour * 100 + minute;

  if (day === 0 || day === 6) {
    return "周末休市";
  }

  if (time < 930) {
    return "盘前";
  } else if (time >= 930 && time <= 1130) {
    return "上午盘";
  } else if (time > 1130 && time < 1300) {
    return "午间休市";
  } else if (time >= 1300 && time <= 1500) {
    return "下午盘";
  } else {
    return "盘后";
  }
}
