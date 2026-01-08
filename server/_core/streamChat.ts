import { ENV } from "./env";
import { stockTools, executeStockTool } from "./stockTools";
import { readFileSync } from "fs";
import { join } from "path";

// 加载 AI 知识库文件
// 开发模式下不缓存，方便热更新
// 生产模式下缓存以提升性能
let cachedKnowledgeBase: string | null = null;
const isDev = process.env.NODE_ENV !== 'production';

function loadKnowledgeBase(): string {
    // 开发模式下每次重新读取，便于调试
    if (cachedKnowledgeBase && !isDev) return cachedKnowledgeBase;

    try {
        // 使用项目根目录查找知识库文件
        const knowledgePath = join(process.cwd(), 'server', '_core', 'ai_knowledge.md');
        const content = readFileSync(knowledgePath, 'utf-8');
        if (!isDev) {
            cachedKnowledgeBase = content;
        }
        console.log('[AI] 知识库加载成功, 字符数:', content.length);
        return content;
    } catch (error: any) {
        console.warn('[AI] 知识库加载失败:', error.message);
        return '';
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
}

const resolveApiUrl = () =>
    ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0
        ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions`
        : "https://api.siliconflow.cn/v1/chat/completions";

// 格式化资金金额（统一显示亿元）
function formatFundAmount(val?: number): string {
    if (val === null || val === undefined) return '--';
    const absVal = Math.abs(val);
    const sign = val >= 0 ? '+' : '-';
    return `${sign}${(absVal / 100000000).toFixed(2)}亿`;
}

// 从前端上下文数据构建内存字符串
function buildContextFromFrontend(stockCode: string, ctx: StockContextData): string {
    const quote = ctx.quote;
    const flow = ctx.capitalFlow;

    if (!quote) {
        return `【当前查看的股票】${stockCode}`;
    }

    const changeSign = (quote.change || 0) >= 0 ? '+' : '';
    const changePercentSign = (quote.changePercent || 0) >= 0 ? '+' : '';

    let result = `
【当前股票数据 - 已从页面加载，无需重复查询】
📌 股票名称：${quote.name || stockCode}
📌 股票代码：${quote.code || stockCode}
📊 当前价格：${quote.price || '--'} 元
${(quote.changePercent || 0) >= 0 ? '📈' : '📉'} 涨跌幅：${changePercentSign}${quote.changePercent?.toFixed(2) || '--'}%
💰 涨跌额：${changeSign}${quote.change?.toFixed(2) || '--'} 元

📅 今日交易：
  今开：${quote.open || '--'} 元
  最高：${quote.high || '--'} 元
  最低：${quote.low || '--'} 元
  昨收：${quote.preClose || '--'} 元

📊 成交情况：
  成交量：${quote.volume ? (quote.volume / 10000).toFixed(2) + '万手' : '--'}
  成交额：${quote.amount ? (quote.amount / 100000000).toFixed(2) + '亿元' : '--'}
  换手率：${quote.turnoverRate?.toFixed(2) || '--'}%
  量比：${quote.volumeRatio?.toFixed(2) || '--'}

💹 估值指标：
  市盈率(PE)：${quote.pe?.toFixed(2) || '--'}
  市净率(PB)：${quote.pb?.toFixed(2) || '--'}
  总市值：${quote.marketCap ? (quote.marketCap / 100000000).toFixed(2) + '亿元' : '--'}
  流通市值：${quote.circulationMarketCap ? (quote.circulationMarketCap / 100000000).toFixed(2) + '亿元' : '--'}`;

    if (flow) {
        const mainStatus = (flow.mainNetInflow || 0) >= 0 ? '🟢 净流入' : '🔴 净流出';
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
    const toolGuidance = knowledgeBase ? `
详细的工具使用指南请参考下方【知识库】部分。
` : `
## 可用工具
1. **search_stock** - 搜索股票代码
2. **get_stock_quote** - 获取股票实时行情
3. **get_kline_data** - 获取K线数据
4. **get_fund_flow** - 获取今日资金流向
5. **get_fund_flow_history** - 获取历史资金流向
6. **get_fund_flow_rank** - 获取资金流入排行榜
7. **get_market_fund_flow** - 获取大盘资金流向
`;

    return `你是一个专业的A股分析师助手，名叫"小A"。

## 你的记忆能力
${hasPreloadedData ? `
⭐ **重要**：用户当前查看的股票数据已经预加载在你的记忆中（见下方）。
🎯 当用户问关于当前股票的问题时，**直接使用记忆中的数据回答**，不需要调用工具重复查询。
🔧 只有在以下情况才需要使用工具：
   - 用户问的是**其他股票**（不是当前查看的）
   - 用户需要**K线数据**进行技术分析
   - 用户需要**历史资金流向**趋势
   - 用户问**资金流入排行榜**或**大盘资金**
` : `
📌 用户还没有选择具体股票，或数据未加载。
🔧 需要使用工具来查询股票数据。
`}
${toolGuidance}
## 工作原则
1. **优先使用记忆**：当前股票数据已在记忆中，直接使用
2. **按需查询**：只有需要额外数据时才调用工具
3. **简洁专业**：用简洁的语言回答
4. **客观中立**：分析要客观
5. **风险提示**：提醒用户自行决策

${stockContext}

${knowledgeBase ? `
---
【知识库参考】
${knowledgeBase}
` : ''}`;
};


// 流式聊天函数 - 支持 Function Calling
export async function* streamChat(params: StreamChatParams): AsyncGenerator<string, void, unknown> {
    const { messages, stockCode, stockContext: frontendContext, useThinking } = params;

    if (!ENV.forgeApiKey) {
        yield "错误：AI API Key 未配置";
        return;
    }

    // 构建股票上下文 - 优先使用前端传来的数据
    let stockContextStr = '';
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
        if (index === 0 && msg.role === 'system') {
            return { ...msg, content: systemPrompt };
        }
        return msg;
    });

    if (messagesWithContext[0]?.role !== 'system') {
        messagesWithContext.unshift({ role: 'system' as const, content: systemPrompt });
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
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${ENV.forgeApiKey}`,
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
            let buffer = '';
            let fullContent = '';
            let toolCalls: ToolCall[] = [];
            let currentToolCall: Partial<ToolCall> | null = null;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6).trim();
                        if (data === '[DONE]') continue;

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
                                                id: tc.id || '',
                                                type: 'function',
                                                function: {
                                                    name: tc.function?.name || '',
                                                    arguments: tc.function?.arguments || ''
                                                }
                                            };
                                        } else {
                                            if (tc.id) toolCalls[tc.index].id = tc.id;
                                            if (tc.function?.name) toolCalls[tc.index].function.name = tc.function.name;
                                            if (tc.function?.arguments) toolCalls[tc.index].function.arguments += tc.function.arguments;
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
            const validToolCalls = toolCalls.filter(tc => tc && tc.id && tc.function?.name);

            if (validToolCalls.length > 0) {
                // 有工具调用，需要执行并继续对话
                yield "\n\n🔍 *正在查询数据...*\n\n";

                // 添加助手消息（包含工具调用）
                // 注意：tool_calls 时 content 应为空字符串
                conversationMessages.push({
                    role: 'assistant',
                    content: '',
                    tool_calls: validToolCalls
                });

                // 执行每个工具调用并添加结果
                for (const toolCall of validToolCalls) {
                    try {
                        const args = JSON.parse(toolCall.function.arguments);
                        console.log(`[StreamChat] 执行工具: ${toolCall.function.name}`, args);

                        const result = await executeStockTool(toolCall.function.name, args);

                        conversationMessages.push({
                            role: 'tool',
                            content: result,
                            tool_call_id: toolCall.id
                        });
                    } catch (error: any) {
                        console.error(`[StreamChat] 工具执行失败:`, error);
                        conversationMessages.push({
                            role: 'tool',
                            content: `工具执行失败: ${error.message}`,
                            tool_call_id: toolCall.id
                        });
                    }
                }

                // 继续循环，让LLM基于工具结果生成回复
                continue;
            }

            // 没有工具调用，对话结束
            break;

        } catch (error) {
            console.error('Stream chat error:', error);
            yield `错误：网络请求失败`;
            return;
        }
    }

    if (iterationCount >= maxIterations) {
        yield "\n\n⚠️ 达到最大查询次数限制";
    }
}
