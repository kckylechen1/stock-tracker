/**
 * SmartAgent 流式聊天入口
 *
 * 替代原有的 streamChat，使用新架构：
 * - SmartAgent (主控)
 * - Session 持久化
 * - Memory 记忆系统
 * - Skill 技能匹配
 */

import { createSmartAgent } from "./agent";
import type { StreamEvent } from "./agent/types";

// 前端传来的股票上下文数据类型
export interface StockContextData {
  quote?: {
    name?: string;
    code?: string;
    price?: number;
    change?: number;
    changePercent?: number;
    open?: number;
    high?: number;
    low?: number;
    preClose?: number;
    volume?: number;
    amount?: number;
    turnoverRate?: number;
    pe?: number;
    pb?: number;
    marketCap?: number;
    circulationMarketCap?: number;
    volumeRatio?: number;
  } | null;
  capitalFlow?: {
    mainNetInflow?: number;
    superLargeNetInflow?: number;
    largeNetInflow?: number;
    mediumNetInflow?: number;
    smallNetInflow?: number;
  } | null;
}

export interface Message {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
}

export interface SmartStreamChatParams {
  messages: Message[];
  stockCode?: string;
  stockContext?: StockContextData | null;
  sessionId?: string;
  thinkHard?: boolean;
}

function formatFundAmount(val?: number): string {
  if (val === null || val === undefined) return "--";
  const absVal = Math.abs(val);
  const sign = val >= 0 ? "+" : "-";
  return `${sign}${(absVal / 100000000).toFixed(2)}亿`;
}

function buildContextFromFrontend(
  stockCode: string,
  ctx: StockContextData
): string {
  const quote = ctx.quote;
  const flow = ctx.capitalFlow;

  if (!quote) {
    return `【当前查看的股票】${stockCode}`;
  }

  const changeSign = (quote.change || 0) >= 0 ? "+" : "";
  const changePercentSign = (quote.changePercent || 0) >= 0 ? "+" : "";

  let result = `
【当前股票数据 - 已从页面加载，无需重复查询】
📌 股票名称：${quote.name || stockCode}
📌 股票代码：${quote.code || stockCode}
📊 当前价格：${quote.price || "--"} 元
${(quote.changePercent || 0) >= 0 ? "📈" : "📉"} 涨跌幅：${changePercentSign}${quote.changePercent?.toFixed(2) || "--"}%
💰 涨跌额：${changeSign}${quote.change?.toFixed(2) || "--"} 元`;

  if (quote.open !== undefined) {
    result += `

📅 今日交易：
  今开：${quote.open || "--"} 元
  最高：${quote.high || "--"} 元
  最低：${quote.low || "--"} 元
  昨收：${quote.preClose || "--"} 元`;
  }

  if (quote.volume !== undefined) {
    result += `

📊 成交情况：
  成交量：${quote.volume ? (quote.volume / 10000).toFixed(2) + "万手" : "--"}
  成交额：${quote.amount ? (quote.amount / 100000000).toFixed(2) + "亿元" : "--"}
  换手率：${quote.turnoverRate?.toFixed(2) || "--"}%
  量比：${quote.volumeRatio?.toFixed(2) || "--"}`;
  }

  if (quote.pe !== undefined) {
    result += `

💹 估值指标：
  市盈率(PE)：${quote.pe?.toFixed(2) || "--"}
  市净率(PB)：${quote.pb?.toFixed(2) || "--"}
  总市值：${quote.marketCap ? (quote.marketCap / 100000000).toFixed(2) + "亿元" : "--"}
  流通市值：${quote.circulationMarketCap ? (quote.circulationMarketCap / 100000000).toFixed(2) + "亿元" : "--"}`;
  }

  if (flow) {
    const mainStatus =
      (flow.mainNetInflow || 0) >= 0 ? "🟢 净流入" : "🔴 净流出";
    result += `

💰 今日资金流向：
${mainStatus}
  主力净流入：${formatFundAmount(flow.mainNetInflow)}
  ├─ 超大单：${formatFundAmount(flow.superLargeNetInflow)}
  └─ 大单：${formatFundAmount(flow.largeNetInflow)}
  散户资金：
  ├─ 中单：${formatFundAmount(flow.mediumNetInflow)}
  └─ 小单：${formatFundAmount(flow.smallNetInflow)}`;
  }

  return result;
}

/**
 * 格式化流式事件为前端可用的 SSE 格式
 *
 * 精简模式：只显示最终分析结果，隐藏中间过程
 */
function formatEventForSSE(event: StreamEvent): string {
  switch (event.type) {
    case "thinking":
    case "tool_call":
    case "tool_result":
    case "task_start":
    case "task_complete":
      // 隐藏中间过程，让输出更像专业投资顾问
      return "";

    case "content":
      // 主要内容输出
      return event.data;

    case "error":
      return `❌ 分析失败: ${event.data}\n`;

    case "done":
      return "";

    default:
      return "";
  }
}

/**
 * 流式聊天 - 使用 SmartAgent
 *
 * 返回 AsyncGenerator，兼容现有的 SSE 推送逻辑
 */
export async function* smartStreamChat(
  params: SmartStreamChatParams
): AsyncGenerator<string, void, unknown> {
  const { messages, stockCode, stockContext, sessionId, thinkHard } = params;

  // 获取最后一条用户消息
  const userMessages = messages.filter(m => m.role === "user");
  const lastUserMessage = userMessages[userMessages.length - 1]?.content || "";

  if (!lastUserMessage) {
    yield "请输入您的问题。";
    return;
  }

  // 兼容旧的“切换到详细模式”口令
  const isSwitchingToDetailMode =
    lastUserMessage.includes("切换到详细输出模式") ||
    lastUserMessage.includes("更详细输出版本");
  const effectiveThinkHard = Boolean(thinkHard) || isSwitchingToDetailMode;

  const preloadedContext =
    stockCode && stockContext
      ? buildContextFromFrontend(stockCode, stockContext)
      : undefined;

  // 创建 SmartAgent
  const agent = createSmartAgent({
    stockCode,
    sessionId,
    thinkHard: effectiveThinkHard,
    preloadedContext,
    useOrchestrator: false, // 先用基础模式，更快更稳定
    verbose: false,
  });

  let hasContent = false;
  let fullContent = ""; // 收集完整回复用于生成 follow-up

  try {
    // 流式执行
    for await (const event of agent.stream(lastUserMessage)) {
      const formatted = formatEventForSSE(event);

      if (formatted) {
        yield formatted;

        if (event.type === "content") {
          hasContent = true;
          fullContent += event.data;
        }
      }
    }

    // 如果没有内容输出，说明出了问题
    if (!hasContent) {
      yield "\n⚠️ 未能生成回答，请重试。";
    } else {
      // 生成上下文相关的 follow-up 建议
      const followUps = generateFollowUpSuggestions(
        fullContent,
        lastUserMessage,
        stockCode
      );
      if (followUps.length > 0) {
        // 使用特殊格式发送 follow-up 建议
        yield `\n<!--FOLLOWUP:${JSON.stringify(followUps)}-->`;
      }
    }
  } catch (error: any) {
    console.error("SmartAgent stream error:", error);
    yield `\n❌ 发生错误: ${error.message}`;
  } finally {
    // 清理资源
    agent.cleanup();
  }
}

/**
 * 根据 AI 回复内容生成上下文相关的 follow-up 建议
 */
function generateFollowUpSuggestions(
  aiResponse: string,
  userQuestion: string,
  stockCode?: string
): string[] {
  const suggestions: string[] = [];

  // 提取关键词和主题
  const keywords = extractKeyTopics(aiResponse, userQuestion);

  // 根据回复内容类型生成相关问题
  if (aiResponse.includes("板块") || aiResponse.includes("概念")) {
    // 板块相关话题
    const sectorMatch = aiResponse.match(
      /([\u4e00-\u9fa5]+概念|[\u4e00-\u9fa5]+板块)/
    );
    if (sectorMatch) {
      suggestions.push(`${sectorMatch[1]}的龙头股有哪些？`);
    }
    suggestions.push("这些热门板块后市怎么看？");
    suggestions.push("有没有还没涨的潜力板块？");
  }

  if (aiResponse.includes("涨停") || aiResponse.includes("跌停")) {
    suggestions.push("今天涨停的股票有什么共同特点？");
    suggestions.push("涨停板打板策略怎么操作？");
  }

  if (
    aiResponse.includes("资金") ||
    aiResponse.includes("净流入") ||
    aiResponse.includes("主力")
  ) {
    suggestions.push("主力资金流入最多的是哪些股票？");
    suggestions.push("如何判断主力是在吸筹还是出货？");
  }

  if (
    aiResponse.includes("技术") ||
    aiResponse.includes("K线") ||
    aiResponse.includes("均线") ||
    aiResponse.includes("MACD")
  ) {
    suggestions.push("MACD和KDJ哪个更适合短线操作？");
    suggestions.push("怎么用均线判断趋势？");
  }

  if (
    aiResponse.includes("风险") ||
    aiResponse.includes("注意") ||
    aiResponse.includes("警惕")
  ) {
    suggestions.push("如何设置止损位？");
    suggestions.push("有什么风险控制的建议？");
  }

  if (stockCode && suggestions.length < 3) {
    // 如果有具体股票，添加股票相关问题
    if (!suggestions.some(s => s.includes("买点") || s.includes("卖点"))) {
      suggestions.push("这只股票现在可以买入吗？");
    }
    if (!suggestions.some(s => s.includes("技术"))) {
      suggestions.push("帮我分析一下技术面");
    }
  }

  // 通用问题作为补充
  if (suggestions.length < 3) {
    const generalQuestions = [
      "有什么操作建议吗？",
      "短线机会在哪里？",
      "帮我总结一下重点",
    ];
    for (const q of generalQuestions) {
      if (suggestions.length >= 3) break;
      if (!suggestions.includes(q)) {
        suggestions.push(q);
      }
    }
  }

  return suggestions.slice(0, 3); // 最多返回3个
}

/**
 * 从文本中提取关键主题
 */
function extractKeyTopics(aiResponse: string, userQuestion: string): string[] {
  const topics: string[] = [];

  // 提取股票名称
  const stockNames = aiResponse.match(
    /[\u4e00-\u9fa5]{2,4}(?:股份|科技|集团|电子|通信|医药|新能源)/g
  );
  if (stockNames) {
    topics.push(...stockNames.slice(0, 2));
  }

  // 提取板块概念
  const concepts = aiResponse.match(/[\u4e00-\u9fa5]+(?:概念|板块)/g);
  if (concepts) {
    topics.push(...concepts.slice(0, 2));
  }

  return topics;
}

/**
 * 兼容旧接口的流式聊天
 *
 * 检测 useSmartAgent 参数决定使用哪个架构
 */
export async function* hybridStreamChat(
  params: SmartStreamChatParams & { useSmartAgent?: boolean }
): AsyncGenerator<string, void, unknown> {
  const { useSmartAgent = true, ...restParams } = params;

  if (useSmartAgent) {
    // 使用新架构
    yield* smartStreamChat(restParams);
  } else {
    // 使用旧架构（保持兼容）
    const { streamChat } = await import("./streamChat");
    yield* streamChat({
      messages: restParams.messages,
      stockCode: restParams.stockCode,
      stockContext: restParams.stockContext,
      useThinking: false,
      useGrok: true,
    });
  }
}
