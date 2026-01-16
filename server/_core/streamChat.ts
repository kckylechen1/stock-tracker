import { ENV } from "./env";
import { stockTools, executeStockTool } from "./stockTools";
import { readFileSync } from "fs";
import { join } from "path";

// 加载 AI 知识库文件
// 开发模式下不缓存，方便热更新
// 生产模式下缓存以提升性能
let cachedKnowledgeBase: string | null = null;
const isDev = process.env.NODE_ENV !== "production";

function loadKnowledgeBase(): string {
  // 开发模式下每次重新读取，便于调试
  if (cachedKnowledgeBase && !isDev) return cachedKnowledgeBase;

  try {
    // 使用项目根目录查找知识库文件
    const knowledgePath = join(
      process.cwd(),
      "server",
      "_core",
      "ai_knowledge.md"
    );
    const content = readFileSync(knowledgePath, "utf-8");
    if (!isDev) {
      cachedKnowledgeBase = content;
    }
    console.log("[AI] 知识库加载成功, 字符数:", content.length);
    return content;
  } catch (error: any) {
    console.warn("[AI] 知识库加载失败:", error.message);
    return "";
  }
}

export type Message = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
};

export type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

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

export interface StreamChatParams {
  messages: Message[];
  stockCode?: string;
  stockContext?: StockContextData | null; // 前端已加载的数据
  useThinking?: boolean;
  useGrok?: boolean; // 使用 Grok 作为对话模型
}

const resolveApiUrl = () =>
  ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0
    ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions`
    : "https://api.siliconflow.cn/v1/chat/completions";

// 格式化资金金额（统一显示亿元）
function formatFundAmount(val?: number): string {
  if (val === null || val === undefined) return "--";
  const absVal = Math.abs(val);
  const sign = val >= 0 ? "+" : "-";
  return `${sign}${(absVal / 100000000).toFixed(2)}亿`;
}

// 从前端上下文数据构建内存字符串
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
💰 涨跌额：${changeSign}${quote.change?.toFixed(2) || "--"} 元

📅 今日交易：
  今开：${quote.open || "--"} 元
  最高：${quote.high || "--"} 元
  最低：${quote.low || "--"} 元
  昨收：${quote.preClose || "--"} 元

📊 成交情况：
  成交量：${quote.volume ? (quote.volume / 10000).toFixed(2) + "万手" : "--"}
  成交额：${quote.amount ? (quote.amount / 100000000).toFixed(2) + "亿元" : "--"}
  换手率：${quote.turnoverRate?.toFixed(2) || "--"}%
  量比：${quote.volumeRatio?.toFixed(2) || "--"}

💹 估值指标：
  市盈率(PE)：${quote.pe?.toFixed(2) || "--"}
  市净率(PB)：${quote.pb?.toFixed(2) || "--"}
  总市值：${quote.marketCap ? (quote.marketCap / 100000000).toFixed(2) + "亿元" : "--"}
  流通市值：${quote.circulationMarketCap ? (quote.circulationMarketCap / 100000000).toFixed(2) + "亿元" : "--"}`;

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

// 系统提示词 - 根据是否有预加载数据来调整
const getSystemPrompt = (stockContext: string, hasPreloadedData: boolean) => {
  // 加载知识库
  const knowledgeBase = loadKnowledgeBase();

  // 如果知识库加载成功，使用简洁版提示词（详细说明在知识库中）
  const toolGuidance = knowledgeBase
    ? `
详细的工具使用指南请参考下方【知识库】部分。
`
    : `
## 可用工具
1. **search_stock** - 搜索股票代码
2. **get_stock_quote** - 获取股票实时行情
3. **get_kline_data** - 获取K线数据
4. **get_fund_flow** - 获取今日资金流向
5. **get_fund_flow_history** - 获取历史资金流向
6. **get_fund_flow_rank** - 获取资金流入排行榜
7. **get_market_fund_flow** - 获取大盘资金流向
`;

  // 获取当前日期时间
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

  return `# 角色设定
你是"小A"，一个专业的A股分析师AI助手。你的分析必须像真正的证券分析师那样深入、专业、全面。

# ⏰ 重要：当前时间
**今天是 ${dateStr}，北京时间 ${timeStr}**
⚠️ 你的训练数据截止到2023年，但现在是${now.getFullYear()}年！所有回答必须使用上述正确日期。

# 🎯 核心行为规则（必须遵守）

## 规则1：走势分析必须调用 comprehensive_analysis
当用户问"走势怎么样"、"分析一下"、"能买吗"、"能卖吗"时，**必须先调用 \`comprehensive_analysis\` 工具**获取数据。

## 规则2：⚠️ 禁止偷懒！必须深度分析！
**绝对禁止**直接复制粘贴工具返回的结果！你必须：
1. 获取工具数据后，**用你自己的话重新组织**
2. **添加你的专业解读**（为什么这个指标重要？意味着什么？）
3. **结合多个维度**（技术面+资金面+大盘环境）给出综合判断
4. **给出具体的操作建议**（买/卖/持有，以及理由）

## 规则3：⚠️ 严格禁止以下行为！（DeepSeek 专属）
1. **禁止原封不动复制数据**：例如"上证3150（+0.25%）"这种格式必须改写
2. **禁止罗列数据不解读**：每个数据点都要说明它的意义
3. **数据要核实合理性**：如果数据看起来不对（如日期、价格异常），主动提醒用户核实
4. **必须用自然语言**：把数字转化为判断，例如"RSI 65" 要说成"RSI已接近超买区，短期有回调风险"
5. **禁止说"仅供参考"、"建议结合自身情况"等废话**

## 规则4：回答必须包含以下结构
\`\`\`
一、基本面分析
- 行业背景
- 公司定位
- 估值分析（PE/PB是高是低？合理吗？）

二、技术面分析
- 短期走势（结合工具数据解读）
- 技术指标（均线、MACD、RSI 的含义）
- 支撑与阻力位

三、资金面分析
- 主力动向（流入还是流出？意味着什么？）
- 近期趋势（是加速还是减速？）

四、大盘环境
- 大盘是否配合？

五、综合投资建议
- 对于已持仓投资者的建议
- 对于未持仓投资者的建议
- 风险提示
\`\`\`

# 📊 你的记忆
${
  hasPreloadedData
    ? `
用户当前查看的股票数据已预加载：
${stockContext}

💡 基础行情数据可直接使用，分析走势时调用 \`comprehensive_analysis\` 获取技术分析数据。
`
    : `
用户尚未选择股票，需要先调用工具获取数据。
`
}
${toolGuidance}
${
  knowledgeBase
    ? `
# 📚 知识库
${knowledgeBase}
`
    : ""
}

# 💎 你的分析质量标准
- 像证券公司的研究报告一样专业
- 每个观点都要有数据支撑
- 不要说空话废话
- 给出明确的、可执行的建议`;
};

// 流式聊天函数 - 支持 Function Calling
export async function* streamChat(
  params: StreamChatParams
): AsyncGenerator<string, void, unknown> {
  const {
    messages,
    stockCode,
    stockContext: frontendContext,
    useThinking,
    useGrok,
  } = params;

  // ============ Grok 模式（直接调用工具）============
  if (useGrok) {
    if (!ENV.grokApiKey) {
      yield "错误：Grok API Key 未配置";
      return;
    }

    // 构建股票上下文
    let stockContextStr = "";
    if (frontendContext && stockCode) {
      stockContextStr = buildContextFromFrontend(stockCode, frontendContext);
    }

    // 使用新的 Grok 结构化 Prompt
    const { buildGrokSystemPrompt, preprocessUserMessage, GROK_CONFIG } =
      await import("./prompts/grokPrompt");

    const grokSystemPrompt = buildGrokSystemPrompt({
      stockCode,
      stockName: frontendContext?.quote?.name,
      preloadedData: stockContextStr || undefined,
    });

    // 预处理用户消息：注入当前时间
    // Node 18 兼容：避免使用 Array.prototype.findLast
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      if (message?.role === "user") {
        message.content = preprocessUserMessage(message.content);
        break;
      }
    }

    // 构建消息
    let conversationMessages: Message[] = [
      { role: "system", content: grokSystemPrompt },
      ...messages.filter(m => m.role !== "system"),
    ];

    let iteration = 0;
    const maxIterations = 5;
    let hasShownLoadingMessage = false; // 只显示一次加载提示

    while (iteration < maxIterations) {
      iteration++;

      const payload: any = {
        model: GROK_CONFIG.model,
        messages: conversationMessages.map(m => {
          const msg: any = { role: m.role, content: m.content };
          if (m.tool_calls) msg.tool_calls = m.tool_calls;
          if (m.tool_call_id) msg.tool_call_id = m.tool_call_id;
          return msg;
        }),
        tools: stockTools,
        tool_choice: "auto",
        max_tokens: GROK_CONFIG.max_tokens,
        temperature: GROK_CONFIG.temperature,
        top_p: GROK_CONFIG.top_p,
        stream: true,
      };

      try {
        // 调试：检查 API Key 是否包含非 ASCII 字符
        const apiKey = ENV.grokApiKey;
        const hasNonAscii = /[^\x00-\x7F]/.test(apiKey);
        if (hasNonAscii) {
          console.error("[Grok] API Key contains non-ASCII characters!");
          console.error("[Grok] First 20 chars:", apiKey.substring(0, 20));
          yield "Grok 错误：API Key 包含非 ASCII 字符，请检查 .env 文件";
          return;
        }

        const response = await fetch(`${ENV.grokApiUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            Authorization: `Bearer ${ENV.grokApiKey}`,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorText = await response.text();
          yield `Grok 错误：${response.status} - ${errorText}`;
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          yield "错误：无法读取响应流";
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";
        let fullContent = "";
        let toolCalls: ToolCall[] = [];
        let currentToolCall: any = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta;

              // 处理内容
              if (delta?.content) {
                fullContent += delta.content;
                yield delta.content;
              }

              // 处理工具调用
              if (delta?.tool_calls) {
                for (const tc of delta.tool_calls) {
                  if (tc.index !== undefined) {
                    if (!toolCalls[tc.index]) {
                      toolCalls[tc.index] = {
                        id: tc.id || "",
                        type: "function",
                        function: { name: "", arguments: "" },
                      };
                    }
                    if (tc.id) toolCalls[tc.index].id = tc.id;
                    if (tc.function?.name) {
                      toolCalls[tc.index].function.name = tc.function.name;
                    }
                    if (tc.function?.arguments) {
                      toolCalls[tc.index].function.arguments +=
                        tc.function.arguments;
                    }
                  }
                }
              }
            } catch {
              // Ignore parse errors
            }
          }
        }

        // 如果有工具调用
        if (toolCalls.length > 0) {
          // 前端已有加载动画，不再输出文本提示
          hasShownLoadingMessage = true;

          conversationMessages.push({
            role: "assistant",
            content: fullContent,
            tool_calls: toolCalls,
          });

          // 静默执行工具（不输出调试信息）
          for (const tc of toolCalls) {
            const toolName = tc.function.name;
            let toolArgs: any = {};
            try {
              toolArgs = JSON.parse(tc.function.arguments);
            } catch {}

            // 不再输出工具名称
            const result = await executeStockTool(toolName, toolArgs);

            conversationMessages.push({
              role: "tool",
              content: result,
              tool_call_id: tc.id,
            });
          }

          // 继续循环让 Grok 处理工具结果
          continue;
        }

        // 没有工具调用，结束
        return;
      } catch (error: any) {
        console.error("[Grok Error]", error);
        console.error("[Grok Error Stack]", error.stack);
        yield `Grok 错误：${error.message}`;
        return;
      }
    }

    yield "\n达到最大迭代次数";
    return;
  }

  // ============ DeepSeek 模式（原有逻辑）============
  if (!ENV.forgeApiKey) {
    yield "错误：AI API Key 未配置";
    return;
  }

  // 构建股票上下文 - 优先使用前端传来的数据
  let stockContextStr = "";
  let hasPreloadedData = false;

  if (frontendContext && stockCode) {
    // 使用前端已加载的数据，避免重复 API 调用
    stockContextStr = buildContextFromFrontend(stockCode, frontendContext);
    hasPreloadedData = true;
    console.log(`[StreamChat] 使用前端预加载数据: ${stockCode}`);
  } else if (stockCode) {
    // 没有前端数据时的降级处理
    stockContextStr = `【当前查看的股票】${stockCode}`;
    hasPreloadedData = false;
    console.log(`[StreamChat] 无前端数据，股票代码: ${stockCode}`);
  }

  // 构建完整的消息列表
  const systemPrompt = getSystemPrompt(stockContextStr, hasPreloadedData);
  const messagesWithContext: Message[] = messages.map((msg, index) => {
    if (index === 0 && msg.role === "system") {
      return { ...msg, content: systemPrompt };
    }
    return msg;
  });

  if (messagesWithContext[0]?.role !== "system") {
    messagesWithContext.unshift({
      role: "system" as const,
      content: systemPrompt,
    });
  }

  // 选择模型 - Function Calling 需要用 V3（R1 不支持 tools）
  const model = useThinking
    ? "deepseek-ai/DeepSeek-R1"
    : "deepseek-ai/DeepSeek-V3";

  // 如果使用思考模式，不使用工具（R1不支持）
  const useTools = !useThinking;

  // 开始对话循环（可能需要多轮工具调用）
  let conversationMessages = [...messagesWithContext];
  let iterationCount = 0;
  const maxIterations = 5; // 防止无限循环

  while (iterationCount < maxIterations) {
    iterationCount++;

    const payload: any = {
      model,
      messages: conversationMessages.map(m => {
        const msg: any = { role: m.role, content: m.content };
        if (m.tool_calls) msg.tool_calls = m.tool_calls;
        if (m.tool_call_id) msg.tool_call_id = m.tool_call_id;
        return msg;
      }),
      max_tokens: 4096,
      stream: true,
    };

    // 只有在非思考模式下才添加工具
    if (useTools) {
      payload.tools = stockTools;
      payload.tool_choice = "auto";
    }

    try {
      const response = await fetch(resolveApiUrl(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          Authorization: `Bearer ${ENV.forgeApiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        yield `错误：${response.status} - ${errorText}`;
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        yield "错误：无法读取响应流";
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";
      let toolCalls: ToolCall[] = [];
      let currentToolCall: Partial<ToolCall> | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;

            try {
              const json = JSON.parse(data);
              const delta = json.choices?.[0]?.delta;

              // 处理文本内容
              if (delta?.content) {
                fullContent += delta.content;
                yield delta.content;
              }

              // 处理工具调用
              if (delta?.tool_calls) {
                for (const tc of delta.tool_calls) {
                  if (tc.index !== undefined) {
                    // 新的工具调用或追加
                    if (!toolCalls[tc.index]) {
                      toolCalls[tc.index] = {
                        id: tc.id || "",
                        type: "function",
                        function: {
                          name: tc.function?.name || "",
                          arguments: tc.function?.arguments || "",
                        },
                      };
                    } else {
                      if (tc.id) toolCalls[tc.index].id = tc.id;
                      if (tc.function?.name)
                        toolCalls[tc.index].function.name = tc.function.name;
                      if (tc.function?.arguments)
                        toolCalls[tc.index].function.arguments +=
                          tc.function.arguments;
                    }
                  }
                }
              }
            } catch {
              // 忽略解析错误
            }
          }
        }
      }

      // 检查是否有工具调用
      const validToolCalls = toolCalls.filter(
        tc => tc && tc.id && tc.function?.name
      );

      if (validToolCalls.length > 0) {
        // 有工具调用，需要执行并继续对话
        yield "\n\n🔍 *正在查询数据...*\n\n";

        // 添加助手消息（包含工具调用）
        // 注意：tool_calls 时 content 应为空字符串
        conversationMessages.push({
          role: "assistant",
          content: "",
          tool_calls: validToolCalls,
        });

        // 执行每个工具调用并添加结果
        for (const toolCall of validToolCalls) {
          try {
            const args = JSON.parse(toolCall.function.arguments);
            console.log(
              `[StreamChat] 执行工具: ${toolCall.function.name}`,
              args
            );

            const result = await executeStockTool(toolCall.function.name, args);

            conversationMessages.push({
              role: "tool",
              content: result,
              tool_call_id: toolCall.id,
            });
          } catch (error: any) {
            console.error(`[StreamChat] 工具执行失败:`, error);
            conversationMessages.push({
              role: "tool",
              content: `工具执行失败: ${error.message}`,
              tool_call_id: toolCall.id,
            });
          }
        }

        // 继续循环，让LLM基于工具结果生成回复
        continue;
      }

      // 没有工具调用，对话结束
      break;
    } catch (error) {
      console.error("Stream chat error:", error);
      yield `错误：网络请求失败`;
      return;
    }
  }

  if (iterationCount >= maxIterations) {
    yield "\n\n⚠️ 达到最大查询次数限制";
  }
}
