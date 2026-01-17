/**
 * 方向2：ReAct Loop + 自建工具铣 + E2B 沙箱
 * 
 * 核心优势：
 * - 完全自主控制，成本可控
 * - 沙箱无限扩展（声学会＋quant重态分析等）
 * - 隐私安全完全控制（不供奖流给 xAI）
 * 
 * 成本贰估：
 * - Tavily API: $0.005-0.008 / 查询≈月$3-5
 * - E2B Sandbox: 免费始体 + 按秒计費≈月$10-20
 * - 汀 Chroma/Pinecone: 个人应用免费
 * - 总计：月费 < $50
 * 
 * 开发时间欰：1-2周
 * - ReAct Loop 改造：3天
 * - Web 工具集：1天
 * - E2B 沙箱集成：2天
 * 
 * VS 方向1：
 * 比 4h 底窗子、$5/1000调用多的不是一个数量级，
 * 但具有简单可预测的优化空间。
 */

import { ENV } from "./env";
import { ChatMessage as BaseMessage } from "./grokClient";

// ==================== ReAct 类型 ====================

interface ObservationData {
  type: "web_search" | "code_execution" | "database" | "cache";
  query?: string;
  code?: string;
  result: string;
  timestamp: number;
}

interface ReActThought {
  thinking: string;
  action: "search" | "execute" | "query" | "observe" | "conclude";
  toolName?: string;
  input?: Record<string, any>;
}

interface ReActTrace {
  step: number;
  thought: ReActThought;
  observation?: ObservationData;
  confidence: number; // 0-1, ReAct 自评的信心度
}

// ==================== 自建工具铣 ====================

class ToolRegistry {
  private tools: Map<
    string,
    (args: Record<string, any>) => Promise<string>
  > = new Map();

  /**
   * 注册 Web 搜索工具（Tavily）
   */
  registerWebSearch() {
    this.tools.set("web_search", async (args: any) => {
      const { query, domain } = args;
      console.log(`[Tool] web_search(\'${query}\'...`);

      try {
        const response = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: ENV.tavilyApiKey,
            query,
            include_answer: true,
            max_results: 5,
            ...(domain && { domains: [domain] }),
          }),
        });

        const data = await response.json();
        return JSON.stringify(data.results || [], null, 2);
      } catch (error: any) {
        return `错误: ${error.message}`;
      }
    });
  }

  /**
   * 注册代码执行工具（E2B）
   */
  registerCodeExecution() {
    this.tools.set("code_execution", async (args: any) => {
      const { code, language = "python" } = args;
      console.log(`[Tool] code_execution(${language}...`);

      try {
        // E2B SDK 例子
        // 实际上需要 `npm i @e2b/code-interpreter` 然后引入
        // import { CodeInterpreter } from '@e2b/code-interpreter';
        // const sbx = await CodeInterpreter.create();
        // const result = await sbx.runCode(code, 'python');
        // await sbx.close();
        // 这里模拟简化

        const response = await fetch("https://api.e2b.dev/v1/code/execute", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${ENV.e2bApiKey}`,
          },
          body: JSON.stringify({
            code,
            language,
            timeout: 30,
          }),
        });

        const data = await response.json();
        return JSON.stringify(data.result || {}, null, 2);
      } catch (error: any) {
        return `错误: ${error.message}`;
      }
    });
  }

  /**
   * 注册本地 AKShare 工具
   */
  registerAkshareTools() {
    this.tools.set(
      "akshare_fund_flow_ranking",
      async (args: any) => {
        const { period = "1d", count = 20 } = args;
        console.log(`[Tool] akshare_fund_flow_ranking(${period}, ${count}...`);
        // 实际应调用 AKShare API
        // 引用 server/akshare.ts 中的 函数
        return `推流排名 [${period}]: 推流数据...`;
      }
    );

    this.tools.set(
      "akshare_bull_signal_backtest",
      async (args: any) => {
        const { stockCode, startDate, endDate } = args;
        console.log(`[Tool] akshare_bull_signal_backtest(${stockCode}...`);
        // 实际应调用 backtest 函数
        return `回测结果 [${stockCode}]: ...`;
      }
    );
  }

  /**
   * 执行工具
   */
  async execute(toolName: string, args: Record<string, any>): Promise<string> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      return `未知工具: ${toolName}`;
    }
    return await tool(args);
  }

  /**
   * 获取所有工具列表
   */
  listTools(): string[] {
    return Array.from(this.tools.keys());
  }
}

// ==================== ReAct Loop 核心 ====================

export class ReActAgent {
  private toolRegistry: ToolRegistry;
  private trace: ReActTrace[] = [];
  private maxSteps: number = 10;

  constructor() {
    this.toolRegistry = new ToolRegistry();
    this.toolRegistry.registerWebSearch();
    this.toolRegistry.registerCodeExecution();
    this.toolRegistry.registerAkshareTools();
  }

  /**
   * Grok 作为Dreamweaver（思考师），触发 ReAct Loop
   */
  async thinkAndAct(
    userQuery: string,
    stockCode?: string
  ): Promise<{ trace: ReActTrace[]; finalAnswer: string }> {
    console.log("\n" + "=".repeat(60));
    console.log("🧪 ReAct Loop 启动（方向2）");
    console.log("=".repeat(60));

    this.trace = [];
    let step = 0;

    // 初始想法
    let thought: ReActThought = {
      thinking: `用户问: "${userQuery}" ${stockCode ? `[${stockCode}]` : ""}\n\n需要分的步骤:
1. 理解问题意图→
2. 决定需要的数据→
3. 选择適当的工具→
4. 基于结果给出答案`,
      action: "observe",
      confidence: 1.0,
    };

    this.trace.push({
      step: ++step,
      thought,
      confidence: 1.0,
    });

    // 主循环：最多 10 次
    while (step < this.maxSteps) {
      // 调用 Grok 生成下一步的 thought + action
      const nextThought = await this.grokThink(
        userQuery,
        this.trace,
        stockCode
      );

      // 取消核心集中
      if (
        !nextThought.action ||
        nextThought.action === "conclude" ||
        nextThought.confidence < 0.3
      ) {
        // 会聚到 conclude 
        break;
      }

      step++;
      let observation: string = "";

      // 依据 action 选择工具
      try {
        if (nextThought.action === "search") {
          observation = await this.toolRegistry.execute(
            nextThought.toolName || "web_search",
            nextThought.input || {}
          );
        } else if (nextThought.action === "execute") {
          observation = await this.toolRegistry.execute(
            nextThought.toolName || "code_execution",
            nextThought.input || {}
          );
        } else if (nextThought.action === "query") {
          observation = await this.toolRegistry.execute(
            nextThought.toolName || "akshare_fund_flow_ranking",
            nextThought.input || {}
          );
        }
      } catch (error: any) {
        observation = `工具执行错误: ${error.message}`;
      }

      this.trace.push({
        step,
        thought: nextThought,
        observation: {
          type: (nextThought.action === "search"
            ? "web_search"
            : nextThought.action === "execute"
              ? "code_execution"
              : "database") as any,
          result: observation,
          timestamp: Date.now(),
        },
        confidence: nextThought.confidence,
      });

      console.log(
        `[Step ${step}] ${nextThought.thinking}\n  → ${nextThought.action}(${nextThought.toolName || ""})\n  ✅ ${observation.substring(0, 80)}...`
      );
    }

    // 最后：调用 Grok 合成最终答案
    const finalAnswer = await this.grokConclusion(userQuery, this.trace);

    return {
      trace: this.trace,
      finalAnswer,
    };
  }

  /**
   * Grok 为 ReAct 提供下一个 thought + action
   */
  private async grokThink(
    query: string,
    trace: ReActTrace[],
    stockCode?: string
  ): Promise<ReActThought> {
    const traceStr = trace
      .map(
        (t) => `
[Step ${t.step}]
Thinking: ${t.thought.thinking}
Action: ${t.thought.action}
${t.observation ? `Observation: ${t.observation.result.substring(0, 200)}` : ""}
Confidence: ${t.confidence}
`
      )
      .join("\n");

    const systemPrompt = `你是 ReAct Agent 的"思考师"，提供下一个 action。

每个轮子，你需要基于状态，决定是否需要控制封声或空邊封声，先去取了但是没有完成了你这一手的东西，下一步会最简洁、最直接、最业界的任务。

可供你选择的 action：
- search: web_search
- execute: code_execution
- query: akshare_*
- observe: 莫计划的上置
- conclude: 下结论，步数到了或者既然有决底

输出格式（JSON）：
{
  "thinking": "你的的業业思想",
  "action": "search|execute|query|observe|conclude",
  "toolName": "可选工具名",
  "input": {...},
  "confidence": 0.0-1.0
}`;

    const userPrompt = `原序问题: ${query}

前置执行拒绝指漏: 
${traceStr}

你明下一步的 action 是什么？`;

    try {
      const response = await fetch(
        `${ENV.grokApiUrl || "https://api.x.ai"}/v1/chat/completions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            Authorization: `Bearer ${ENV.grokApiKey}`,
          },
          body: JSON.stringify({
            model: "grok-4-1-fast",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.3, // 比较僆定（不需要太其性化）
            max_tokens: 1000,
          }),
        }
      );

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";

      // 解析 JSON
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      } catch {}

      // 默认 conclude
      return {
        thinking: content,
        action: "conclude",
        confidence: 0.5,
      };
    } catch (error: any) {
      return {
        thinking: `Grok error: ${error.message}`,
        action: "conclude",
        confidence: 0.0,
      };
    }
  }

  /**
   * Grok 基于 trace 路径生成最终答案
   */
  private async grokConclusion(
    query: string,
    trace: ReActTrace[]
  ): Promise<string> {
    const traceStr = trace
      .map(
        (t) =>
          `[Step ${t.step}] ${t.thought.thinking}\n  ${t.observation ? `Result: ${t.observation.result.substring(0, 100)}` : ""}`
      )
      .join("\n\n");

    const systemPrompt = "你是一个A股短线操盘手。基于ReAct处理过程，给出专业、直接的买壳瓶建议。";

    const userPrompt = `重认问题: ${query}\n\nReAct 处理路径\uff1a\n${traceStr}\n\n请给出最终专业结论（买/卖/观望 + 具体点位）`;

    try {
      const response = await fetch(
        `${ENV.grokApiUrl || "https://api.x.ai"}/v1/chat/completions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            Authorization: `Bearer ${ENV.grokApiKey}`,
          },
          body: JSON.stringify({
            model: "grok-4-1-fast",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.7,
            max_tokens: 2000,
          }),
        }
      );

      const data = await response.json();
      return data.choices?.[0]?.message?.content || "稍候~";
    } catch (error: any) {
      return `错误: ${error.message}`;
    }
  }

  /**
   * 获取 trace 路径窗竖
   */
  getTraceVisualization(): string {
    const lines = [
      "ReAct Loop 执行步数\uff1a",
      "=".repeat(60),
    ];

    for (const trace of this.trace) {
      lines.push(
        `\n[Step ${trace.step}] 🧪 ${trace.thought.thinking}`
      );
      lines.push(`  Action: ${trace.thought.action}`);
      if (trace.observation) {
        lines.push(
          `  Observation: ${trace.observation.result.substring(0, 100)}...`
        );
      }
      lines.push(`  Confidence: ${(trace.confidence * 100).toFixed(0)}%`);
    }

    lines.push("\n" + "=".repeat(60));
    return lines.join("\n");
  }
}

// ==================== 优化、扩展建议 ====================

/**
 * 方向2 后可以添加：
 * 
 * 1. **表现记忆优化**
 *    - 使用 Chroma/Pinecone 向量数据库
 *    - 保存历史交易记录 → 重复流量下幾天不用重新查询
 * 
 * 2. **沙箱扩展**
 *    - 第三方应用（上譽维宗提供的技术面数据、资金面数据等）
 *    - 声学 Antml 进行复杂计算
 * 
 * 3. **ReAct 反馬避刀、最大迭代次数控制**
 *    - 反馬避刀 (Anti-jailbreak)：如果 5 次轮子竞湿不决论，自动 abort
 *    - 需要算了最优化：核师前、下跌末方物理位置、债券成本等
 * 
 * 4. **回籔优化**
 *    - Markdown 表格不大背楼的技术面线索
 *    - MermaidJS 可视化 ReAct 执行路径
 */

// ==================== 主序入口 ====================

export async function testReActAgent() {
  console.log("\n🧪 测试 ReAct Agent");
  console.log("=".repeat(60));

  const agent = new ReActAgent();

  const testQuery = "中际断创(300308)今天跌了，我买入后亏了，应该止损还是持有？";

  const { trace, finalAnswer } = await agent.thinkAndAct(testQuery, "300308");

  console.log("\n" + agent.getTraceVisualization());
  console.log("\n💫 最终答案\uff1a");
  console.log(finalAnswer);
}
