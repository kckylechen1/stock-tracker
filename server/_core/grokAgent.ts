/**
 * Grok + Qwen3 主从架构
 * 
 * Grok 是指挥官，可以命令 Qwen3 执行工具调用
 * 就像你能命令我写代码、跑测试一样
 */

import { ENV } from './env';
import { stockTools, executeStockTool } from './stockTools';

// ==================== 类型定义 ====================

interface GrokToolCall {
    id: string;
    type: 'function';
    function: {
        name: string;
        arguments: string;
    };
}

interface ChatMessage {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string;
    tool_calls?: GrokToolCall[];
    tool_call_id?: string;
}

// ==================== Grok 的工具定义 ====================

// Grok 可用的工具：delegate_to_qwen（让 Qwen3 干活）
const grokTools = [
    {
        type: "function" as const,
        function: {
            name: "delegate_to_qwen",
            description: `让 Qwen3（你的助手）去执行数据查询任务。Qwen3 可以执行以下工具：
- comprehensive_analysis: 股票综合分析（技术面+资金面+大盘）
- get_guba_hot_rank: 股吧人气排名
- get_market_status: 大盘状态
- analyze_minute_patterns: 5分钟形态分析
- get_stock_quote: 实时行情
- get_fund_flow: 资金流向

你只需要告诉 Qwen3 你需要什么数据，它会自动选择合适的工具。`,
            parameters: {
                type: "object",
                properties: {
                    task: {
                        type: "string",
                        description: "分配给 Qwen3 的任务描述，例如：'分析 300308 的技术面和资金面' 或 '查询中际旭创的人气排名'"
                    },
                    stockCode: {
                        type: "string",
                        description: "股票代码（如 300308）"
                    }
                },
                required: ["task", "stockCode"]
            }
        }
    }
];

// ==================== Qwen3 执行任务 ====================

async function qwenExecuteTask(task: string, stockCode: string): Promise<string> {
    console.log(`\n[Qwen3] 收到任务: ${task}`);
    console.log(`[Qwen3] 股票代码: ${stockCode}`);

    // Qwen3 根据任务描述决定调用哪些工具
    const qwenSystemPrompt = `你是一个数据执行助手，负责调用工具获取股票数据。
    
当前任务: ${task}
股票代码: ${stockCode}

请根据任务需求，调用合适的工具。你可以用的工具有：
- comprehensive_analysis(code): 综合分析
- get_guba_hot_rank(code): 人气排名
- get_market_status(): 大盘状态
- analyze_minute_patterns(symbol): 5分钟形态

直接调用工具，不要废话。`;

    const response = await fetch(`${ENV.forgeApiUrl}/v1/chat/completions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${ENV.forgeApiKey}`,
        },
        body: JSON.stringify({
            model: "Qwen/Qwen3-235B-A22B",
            messages: [
                { role: "system", content: qwenSystemPrompt },
                { role: "user", content: `执行任务: ${task}` }
            ],
            tools: stockTools,
            tool_choice: "auto",
            max_tokens: 2000,
        }),
    });

    const data = await response.json();
    const message = data.choices?.[0]?.message;

    // 如果 Qwen3 调用了工具
    if (message?.tool_calls && message.tool_calls.length > 0) {
        console.log(`[Qwen3] 决定调用 ${message.tool_calls.length} 个工具`);

        let results: string[] = [];

        for (const toolCall of message.tool_calls) {
            const toolName = toolCall.function.name;
            const toolArgs = JSON.parse(toolCall.function.arguments);
            console.log(`[Qwen3] 执行工具: ${toolName}(${JSON.stringify(toolArgs)})`);

            const result = await executeStockTool(toolName, toolArgs);
            results.push(`【${toolName} 结果】\n${result}`);
        }

        return results.join('\n\n');
    }

    // 没有工具调用，返回 Qwen3 的直接回答
    return message?.content || "Qwen3 无返回";
}

// ==================== Grok 主循环 ====================

export async function grokAgentChat(
    userMessage: string,
    stockCode?: string
): Promise<string> {
    console.log("\n" + "=".repeat(60));
    console.log("🧠 Grok Agent 启动");
    console.log("=".repeat(60));

    const now = new Date();
    const dateStr = now.toLocaleDateString('zh-CN', {
        year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
        hour: '2-digit', minute: '2-digit'
    });

    const systemPrompt = `你是"小A"，一个A股短线操盘手AI。性格：果断、直接、不废话。

【当前时间】${dateStr}

【你的能力】
你有一个助手叫 Qwen3，可以帮你执行数据查询。使用 delegate_to_qwen 工具让它干活。

【工作流程】
1. 用户提问 → 你思考需要什么数据
2. 调用 delegate_to_qwen 让 Qwen3 获取数据
3. 基于数据给出专业、直接的分析

【你的风格】
- 直接给结论：买入/卖出/观望
- 不说"仅供参考"废话
- 用数据说话，给具体点位
- 风险大就直接说"别碰"

【回答格式】
1. **结论**（一句话）
2. **理由**（3点以内）
3. **操作建议**（具体点位）`;

    let messages: ChatMessage[] = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage + (stockCode ? ` [股票代码: ${stockCode}]` : '') }
    ];

    let iteration = 0;
    const maxIterations = 5;

    while (iteration < maxIterations) {
        iteration++;
        console.log(`\n[Grok] 第 ${iteration} 轮对话...`);

        const response = await fetch(`${ENV.grokApiUrl}/chat/completions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${ENV.grokApiKey}`,
            },
            body: JSON.stringify({
                model: ENV.grokModel,
                messages: messages.map(m => ({
                    role: m.role,
                    content: m.content,
                    ...(m.tool_calls && { tool_calls: m.tool_calls }),
                    ...(m.tool_call_id && { tool_call_id: m.tool_call_id }),
                })),
                tools: grokTools,
                tool_choice: "auto",
                max_tokens: 2000,
                temperature: 0.7,
            }),
        });

        const data = await response.json();
        const assistantMessage = data.choices?.[0]?.message;

        if (!assistantMessage) {
            return "Grok 无响应";
        }

        // Grok 调用了工具
        if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
            console.log(`[Grok] 决定调用工具...`);

            // 添加 assistant 消息（带 tool_calls）
            messages.push({
                role: "assistant",
                content: assistantMessage.content || "",
                tool_calls: assistantMessage.tool_calls,
            });

            // 执行每个工具调用
            for (const toolCall of assistantMessage.tool_calls) {
                const toolName = toolCall.function.name;
                const toolArgs = JSON.parse(toolCall.function.arguments);

                console.log(`[Grok] 命令: ${toolName}(${JSON.stringify(toolArgs)})`);

                let result: string;

                if (toolName === "delegate_to_qwen") {
                    // 让 Qwen3 干活
                    result = await qwenExecuteTask(toolArgs.task, toolArgs.stockCode);
                } else {
                    result = `未知工具: ${toolName}`;
                }

                // 添加工具结果
                messages.push({
                    role: "tool",
                    content: result,
                    tool_call_id: toolCall.id,
                });
            }

            // 继续循环，让 Grok 处理工具结果
            continue;
        }

        // Grok 给出了最终回答
        console.log(`[Grok] 输出最终回答`);
        return assistantMessage.content || "";
    }

    return "达到最大迭代次数";
}

// ==================== 流式版本 ====================

export async function* streamGrokAgentChat(
    userMessage: string,
    stockCode?: string
): AsyncGenerator<string> {
    // 先执行完整的 agent 循环获取所有数据
    // 然后流式输出 Grok 的最终回答

    const now = new Date();
    const dateStr = now.toLocaleDateString('zh-CN', {
        year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
        hour: '2-digit', minute: '2-digit'
    });

    const systemPrompt = `你是"小A"，一个A股短线操盘手AI。性格：果断、直接、不废话。

【当前时间】${dateStr}

【你的能力】
你有一个助手叫 Qwen3，可以帮你执行数据查询。使用 delegate_to_qwen 工具让它干活。

【工作流程】
1. 用户提问 → 你思考需要什么数据
2. 调用 delegate_to_qwen 让 Qwen3 获取数据
3. 基于数据给出专业、直接的分析

【你的风格】
- 直接给结论：买入/卖出/观望
- 不说"仅供参考"废话
- 用数据说话，给具体点位
- 风险大就直接说"别碰"`;

    let messages: ChatMessage[] = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage + (stockCode ? ` [股票代码: ${stockCode}]` : '') }
    ];

    // 工具调用阶段（非流式，因为需要完整执行）
    let iteration = 0;
    const maxIterations = 5;
    let needsToolCall = true;

    while (needsToolCall && iteration < maxIterations) {
        iteration++;

        const response = await fetch(`${ENV.grokApiUrl}/chat/completions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${ENV.grokApiKey}`,
            },
            body: JSON.stringify({
                model: ENV.grokModel,
                messages: messages.map(m => ({
                    role: m.role,
                    content: m.content,
                    ...(m.tool_calls && { tool_calls: m.tool_calls }),
                    ...(m.tool_call_id && { tool_call_id: m.tool_call_id }),
                })),
                tools: grokTools,
                tool_choice: "auto",
                max_tokens: 2000,
            }),
        });

        const data = await response.json();
        const assistantMessage = data.choices?.[0]?.message;

        if (assistantMessage?.tool_calls && assistantMessage.tool_calls.length > 0) {
            yield "正在获取数据...\n";

            messages.push({
                role: "assistant",
                content: assistantMessage.content || "",
                tool_calls: assistantMessage.tool_calls,
            });

            for (const toolCall of assistantMessage.tool_calls) {
                const toolArgs = JSON.parse(toolCall.function.arguments);

                if (toolCall.function.name === "delegate_to_qwen") {
                    yield `📊 Qwen3 正在执行: ${toolArgs.task}\n`;
                    const result = await qwenExecuteTask(toolArgs.task, toolArgs.stockCode);
                    messages.push({
                        role: "tool",
                        content: result,
                        tool_call_id: toolCall.id,
                    });
                }
            }
        } else {
            needsToolCall = false;
        }
    }

    // 最终回答阶段（流式）
    yield "\n🧠 Grok 分析中...\n\n";

    const finalResponse = await fetch(`${ENV.grokApiUrl}/chat/completions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${ENV.grokApiKey}`,
        },
        body: JSON.stringify({
            model: ENV.grokModel,
            messages,
            stream: true,
            max_tokens: 2000,
        }),
    });

    const reader = finalResponse.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
        yield "无法读取响应";
        return;
    }

    let buffer = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
            if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;

                try {
                    const parsed = JSON.parse(data);
                    const content = parsed.choices?.[0]?.delta?.content;
                    if (content) {
                        yield content;
                    }
                } catch {
                    // Ignore
                }
            }
        }
    }
}
