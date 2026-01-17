/**
 * Grok 4.1 Server-Side Tools 集成方案（方向1）
 * 
 * 核心优势：
 * - 零自建基础设施：web_search, code_execution 由 xAI 完全托管
 * - 4小时集成：不需要改造 ReAct Loop，直接用 Grok 自带 tools
 * - 成本可控：$5/1000次工具调用
 * - 立即拥有 grok.com 级自主能力
 * 
 * 适用场景：MVP、快速验证、小规模生产
 * 
 * VS 方向2：
 * 方向1 = 快速上线（用现成工具）
 * 方向2 = 长期掌控（自建工具链+ReAct+沙箱）
 */

import { ENV } from "./env";
import { stockTools, executeStockTool } from "./stockTools";

// ==================== 类型定义 ====================

interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

// ==================== xAI Server-Side Tools 定义 ====================

/**
 * Grok 4.1 原生支持的 server-side tools
 * 这些工具由 xAI 服务器执行，客户端只需声明需要哪些
 */
const xaiServerSideTools = [
  {
    type: "function" as const,
    function: {
      name: "web_search",
      description: "搜索网络实时信息（新闻、行情、论文等）",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "搜索查询",
          },
          domain: {
            type: "string",
            description: "可选：限制在特定域名搜索（如 sina.com.cn）",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "browse_page",
      description: "浏览网页内容（抓取特定页面的信息）",
      parameters: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "网页 URL",
          },
          selector: {
            type: "string",
            description: "可选：CSS 选择器（精确抽取信息）",
          },
        },
        required: ["url"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "code_execution",
      description: "执行 Python 代码（回测、数据处理、计算）",
      parameters: {
        type: "object",
        properties: {
          code: {
            type: "string",
            description: "Python 代码段",
          },
          timeout: {
            type: "number",
            description: "超时时间（秒），默认 10s",
          },
        },
        required: ["code"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "x_keyword_search",
      description: "搜索 X（Twitter）平台的实时帖子",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "搜索关键词",
          },
          count: {
            type: "number",
            description: "返回结果数（最多100）",
          },
        },
        required: ["query"],
      },
    },
  },
];

// ==================== 本地股票工具集（补充 xAI 工具） ====================

/**
 * 本地工具集（AKShare 等专属数据）
 * 这些工具 Grok 调用不了，需要代理到本地执行
 */
const localStockTools = [
  {
    type: "function" as const,
    function: {
      name: "akshare_fund_flow_ranking",
      description:
        "获取 A 股资金流排名（主力净流入排行）- 本地执行，Grok 无法调用",
      parameters: {
        type: "object",
        properties: {
          period: {
            type: "string",
            enum: ["1d", "3d", "5d"],
            description: "时间周期（1天/3天/5天）",
          },
          count: {
            type: "number",
            description: "返回数量（默认 20）",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "akshare_bull_signal_backtest",
      description:
        "回测牛股信号（基于技术面+资金面）- 本地执行，Grok 无法调用",
      parameters: {
        type: "object",
        properties: {
          stockCode: {
            type: "string",
            description: "股票代码（如 300308）",
          },
          startDate: {
            type: "string",
            description: "开始日期（YYYY-MM-DD）",
          },
          endDate: {
            type: "string",
            description: "结束日期（YYYY-MM-DD）",
          },
        },
        required: ["stockCode"],
      },
    },
  },
];

// ==================== Grok 4.1 主循环（方向1） ====================

export async function grokAgentChatV2(
  userMessage: string,
  stockCode?: string
): Promise<string> {
  console.log("\n" + "=".repeat(60));
  console.log("🚀 Grok 4.1 Server-Side Tools 启动（方向1）");
  console.log("=".repeat(60));

  const now = new Date();
  const dateStr = now.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

  const systemPrompt = `你是"小A"，A股短线操盘手AI。性格：果断、直接、数据驱动。

【当前时间】${dateStr}

【你的超能力】
你可以直接用以下工具，xAI 服务器会自动执行：
- web_search: 搜索实时新闻、行情、论文
- code_execution: 执行 Python 代码（回测、数据处理）
- browse_page: 抓取网页内容
- x_keyword_search: 搜索 X 平台的实时讨论

【工作流程】
1. 用户问题 → 自动决定调用哪些工具
2. xAI 服务器执行工具 → 返回结果
3. 基于数据给出专业结论

【回答风格】
- 直接结论：买入/卖出/观望
- 不说"仅供参考"这种废话
- 用数据说话，给具体点位
- 大风险直接说"别碰"

【输出格式】
1. **结论**（一句话判断）
2. **理由**（3点以内，用数据）
3. **操作建议**（具体点位和仓位）`;

  let messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: userMessage + (stockCode ? ` [股票代码: ${stockCode}]` : ""),
    },
  ];

  let iteration = 0;
  const maxIterations = 5;

  while (iteration < maxIterations) {
    iteration++;
    console.log(`\n[Grok] 第 ${iteration} 轮...`);

    const apiKey = ENV.grokApiKey;
    const hasNonAscii = /[^\x00-\x7F]/.test(apiKey);
    if (hasNonAscii) {
      console.error("[Grok] API Key contains non-ASCII characters!");
      return "❌ Grok API Key 错误";
    }

    try {
      const response = await fetch(
        `${ENV.grokApiUrl || "https://api.x.ai"}/v1/chat/completions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "grok-4-1-fast", // 使用 4.1 Fast 版本
            messages: messages.map((m) => ({
              role: m.role,
              content: m.content,
              ...(m.tool_calls && { tool_calls: m.tool_calls }),
              ...(m.tool_call_id && { tool_call_id: m.tool_call_id }),
            })),
            // 告诉 Grok 可用的 server-side tools
            tools: xaiServerSideTools,
            tool_choice: "auto", // 让 Grok 自动决定是否调用
            temperature: 0.7,
            max_tokens: 4000,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        console.error(`[Grok API Error] ${response.status}: ${error}`);
        return `❌ API 错误: ${response.status}`;
      }

      const data = await response.json();
      const assistantMessage = data.choices?.[0]?.message;

      if (!assistantMessage) {
        return "❌ Grok 无响应";
      }

      // 关键：xAI 在 server-side 执行了工具并返回结果
      // 如果有 tool_calls，说明还需要本地代理处理
      if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
        console.log(
          `[Grok] 调用了 ${assistantMessage.tool_calls.length} 个工具`
        );

        messages.push({
          role: "assistant",
          content: assistantMessage.content || "",
          tool_calls: assistantMessage.tool_calls,
        });

        // 执行本地工具（AKShare等）
        for (const toolCall of assistantMessage.tool_calls) {
          const toolName = toolCall.function.name;
          const toolArgs = JSON.parse(toolCall.function.arguments);

          console.log(`[代理] 执行本地工具: ${toolName}`);

          let result: string;

          if (
            toolName === "akshare_fund_flow_ranking" ||
            toolName === "akshare_bull_signal_backtest"
          ) {
            // 本地 AKShare 工具
            result = await executeStockTool(toolName, toolArgs);
          } else {
            // xAI server-side tools（web_search, code_execution 等）
            // 实际上 xAI 已经在服务器执行了，这里不应该重复执行
            result = "[xAI 已在服务器执行]";
          }

          messages.push({
            role: "tool",
            content: result,
            tool_call_id: toolCall.id,
          });
        }

        // 继续循环让 Grok 处理工具结果
        continue;
      }

      // Grok 的最终回答
      console.log(`[✅] Grok 输出最终结论`);
      return assistantMessage.content || "";
    } catch (error: any) {
      console.error(`[❌ Error] ${error.message}`);
      return `❌ 错误: ${error.message}`;
    }
  }

  return "❌ 达到最大迭代次数";
}

// ==================== 流式版本（支持实时输出） ====================

export async function* streamGrokAgentChatV2(
  userMessage: string,
  stockCode?: string
): AsyncGenerator<string> {
  const now = new Date();
  const dateStr = now.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

  const systemPrompt = `你是"小A"，A股短线操盘手AI。性格：果断、直接、数据驱动。

【当前时间】${dateStr}

【你的超能力】
- web_search: 搜索实时新闻、行情
- code_execution: 执行 Python 回测
- browse_page: 抓取网页内容
- x_keyword_search: 搜索 X 平台讨论`;

  let messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: userMessage + (stockCode ? ` [${stockCode}]` : ""),
    },
  ];

  let iteration = 0;
  const maxIterations = 5;
  let hasToolCalls = true;

  // 第一阶段：工具调用循环（非流式）
  while (hasToolCalls && iteration < maxIterations) {
    iteration++;
    yield `[Grok 轮 ${iteration}...] `;

    const apiKey = ENV.grokApiKey;
    if (/[^\x00-\x7F]/.test(apiKey)) {
      yield "❌ API Key 错误";
      return;
    }

    try {
      const response = await fetch(
        `${ENV.grokApiUrl || "https://api.x.ai"}/v1/chat/completions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "grok-4-1-fast",
            messages,
            tools: xaiServerSideTools,
            tool_choice: "auto",
            temperature: 0.7,
            max_tokens: 4000,
          }),
        }
      );

      const data = await response.json();
      const assistantMessage = data.choices?.[0]?.message;

      if (assistantMessage?.tool_calls && assistantMessage.tool_calls.length > 0) {
        yield `调用 ${assistantMessage.tool_calls.length} 个工具...\n`;

        messages.push({
          role: "assistant",
          content: assistantMessage.content || "",
          tool_calls: assistantMessage.tool_calls,
        });

        for (const toolCall of assistantMessage.tool_calls) {
          const toolName = toolCall.function.name;
          const toolArgs = JSON.parse(toolCall.function.arguments);
          yield `📊 ${toolName}...`;

          const result =
            toolName.startsWith("akshare")
              ? await executeStockTool(toolName, toolArgs)
              : "[xAI 已执行]";

          messages.push({
            role: "tool",
            content: result,
            tool_call_id: toolCall.id,
          });
        }
      } else {
        hasToolCalls = false;
      }
    } catch (error: any) {
      yield `❌ ${error.message}`;
      return;
    }
  }

  // 第二阶段：流式输出最终回答
  yield "\n\n🧠 Grok 分析结果:\n---\n";

  const apiKey = ENV.grokApiKey;
  if (/[^\x00-\x7F]/.test(apiKey)) {
    yield "❌ API Key 错误";
    return;
  }

  try {
    const finalResponse = await fetch(
      `${ENV.grokApiUrl || "https://api.x.ai"}/v1/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "grok-4-1-fast",
          messages,
          stream: true,
          max_tokens: 4000,
        }),
      }
    );

    const reader = finalResponse.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      yield "❌ 无法读取响应";
      return;
    }

    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              yield content;
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    }

    yield "\n---";
  } catch (error: any) {
    yield `\n❌ ${error.message}`;
  }
}

// ==================== 测试用例 ====================

export async function testGrokV2ServerSideTools() {
  console.log("\n🧪 测试 Grok 4.1 Server-Side Tools");
  console.log("=".repeat(60));

  const testCases = [
    {
      message: "中际旭创(300308)今天跌了，我买入后亏了，应该止损还是持有？",
      stockCode: "300308",
    },
    {
      message:
        "搜索今天A股热点新闻，资金流排名前5的是哪些股？能回测一下信号吗？",
      stockCode: undefined,
    },
    {
      message:
        "用 Python 计算下最近 20 个交易日的胜率，我的买点信号是否靠谱？",
      stockCode: "000001",
    },
  ];

  for (const testCase of testCases) {
    console.log("\n📝 测试:", testCase.message);
    console.log("-".repeat(60));

    try {
      const result = await grokAgentChatV2(
        testCase.message,
        testCase.stockCode
      );
      console.log("✅ 结果:", result);
    } catch (error: any) {
      console.error("❌ 错误:", error.message);
    }

    console.log("\n");
  }
}
