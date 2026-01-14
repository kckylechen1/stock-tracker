/**
 * Stock Agent - 参考 opencode/Claude Code 架构设计
 * 
 * 核心理念：
 * 1. ReAct 循环（推理 + 行动）
 * 2. 工具调用管理
 * 3. 上下文记忆
 * 4. 流式输出
 * 5. 自我反思和纠错
 */

import { ENV } from './env';
import { stockTools, executeStockTool } from './stockTools';

// ==================== 类型定义 ====================

export interface AgentMessage {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string;
    tool_call_id?: string;
    tool_calls?: ToolCall[];
}

export interface ToolCall {
    id: string;
    type: 'function';
    function: {
        name: string;
        arguments: string;
    };
}

export interface AgentConfig {
    maxIterations: number;      // 最大循环次数
    maxTokens: number;          // 最大 token 数
    temperature: number;        // 温度
    streamOutput: boolean;      // 是否流式输出
    verbose: boolean;           // 是否打印调试信息
}

export interface AgentState {
    messages: AgentMessage[];   // 对话历史
    toolResults: Map<string, any>; // 工具结果缓存
    iteration: number;          // 当前迭代次数
    thinking: string[];         // 思考过程记录
    isComplete: boolean;        // 是否完成
}

// ==================== 系统提示词 ====================

const AGENT_SYSTEM_PROMPT = `你是"小A"，一个专业的A股短线操盘手AI助手。

【核心能力】
你可以调用多种工具获取实时股票数据：
- analyze_stock_technical: 技术分析（均线、MACD、RSI、KDJ）
- get_fund_flow: 资金流向（主力、散户）
- get_fund_flow_history: 历史资金趋势
- get_market_status: 大盘环境
- get_stock_quote: 实时行情
- get_trading_memory: 用户的交易记忆和教训
- get_zt_pool: 涨停股池
- get_concept_board: 概念板块

【工作方法 - ReAct】
1. **Reasoning（推理）**: 先思考用户问题需要哪些数据
2. **Acting（行动）**: 调用必要的工具获取数据
3. **Observing（观察）**: 检查工具返回的数据是否完整
4. **Reflecting（反思）**: 如果数据不足，继续获取；如果足够，综合分析

【分析框架】
分析股票时，确保获取以下三个维度的数据：
1. 技术面：均线状态、MACD、成交量（调用 analyze_stock_technical）
2. 资金面：主力流向、近期趋势（调用 get_fund_flow + get_fund_flow_history）
3. 大盘环境：市场整体状态（调用 get_market_status）

【回答风格】
- 直接给结论：买入/卖出/观望
- 不说"仅供参考"、"结合自身情况"
- 用数据支撑观点
- 给出具体点位：入场价、止损价、目标价

【重要原则】
- 在数据不足时，继续调用工具，不要硬给建议
- 如果用户有交易记忆（历史教训），要参考并提醒
- 工具调用失败时，尝试替代方案或如实告知`;

// ==================== Agent 核心类 ====================

export class StockAgent {
    private config: AgentConfig;
    private state: AgentState;

    constructor(config: Partial<AgentConfig> = {}) {
        this.config = {
            maxIterations: 5,
            maxTokens: 4000,
            temperature: 0.7,
            streamOutput: true,
            verbose: true,
            ...config,
        };

        this.state = {
            messages: [{ role: 'system', content: AGENT_SYSTEM_PROMPT }],
            toolResults: new Map(),
            iteration: 0,
            thinking: [],
            isComplete: false,
        };
    }

    /**
     * 主入口：处理用户问题
     */
    async chat(userQuestion: string): Promise<string> {
        // 添加用户消息
        this.state.messages.push({ role: 'user', content: userQuestion });
        this.log(`\n🔷 用户问题: ${userQuestion}`);

        // ReAct 循环
        while (this.state.iteration < this.config.maxIterations && !this.state.isComplete) {
            this.state.iteration++;
            this.log(`\n📍 迭代 ${this.state.iteration}/${this.config.maxIterations}`);

            // Step 1: 调用 LLM（可能返回工具调用或最终回答）
            const response = await this.callLLM();

            // Step 2: 检查是否有工具调用
            if (response.tool_calls && response.tool_calls.length > 0) {
                this.log(`🔧 工具调用: ${response.tool_calls.map(tc => tc.function.name).join(', ')}`);

                // 添加 assistant 消息（包含工具调用）
                this.state.messages.push({
                    role: 'assistant',
                    content: response.content || '',
                    tool_calls: response.tool_calls,
                });

                // Step 3: 执行所有工具调用
                for (const toolCall of response.tool_calls) {
                    const result = await this.executeTool(toolCall);

                    // 添加工具结果消息
                    this.state.messages.push({
                        role: 'tool',
                        tool_call_id: toolCall.id,
                        content: result,
                    });
                }

                // 继续循环，让 LLM 处理工具结果
                continue;
            }

            // Step 4: 没有工具调用 = LLM 认为信息足够，给出最终回答
            this.state.isComplete = true;
            this.log(`\n✅ 完成，共 ${this.state.iteration} 次迭代`);

            return response.content || '抱歉，无法生成回答';
        }

        // 达到最大迭代次数
        this.log(`\n⚠️ 达到最大迭代次数 (${this.config.maxIterations})`);
        return '分析超时，请尝试简化问题或稍后重试';
    }

    /**
     * 流式聊天（返回 AsyncGenerator）
     */
    async *streamChat(userQuestion: string): AsyncGenerator<{
        type: 'thinking' | 'tool_call' | 'tool_result' | 'content' | 'done';
        data: any;
    }> {
        this.state.messages.push({ role: 'user', content: userQuestion });

        yield { type: 'thinking', data: `分析问题: ${userQuestion}` };

        while (this.state.iteration < this.config.maxIterations && !this.state.isComplete) {
            this.state.iteration++;
            yield { type: 'thinking', data: `迭代 ${this.state.iteration}...` };

            // 调用 LLM（流式）
            const response = await this.callLLMStream();

            if (response.tool_calls && response.tool_calls.length > 0) {
                // 通知工具调用
                for (const tc of response.tool_calls) {
                    yield { type: 'tool_call', data: { name: tc.function.name, args: tc.function.arguments } };
                }

                this.state.messages.push({
                    role: 'assistant',
                    content: response.content || '',
                    tool_calls: response.tool_calls,
                });

                // 执行工具并返回结果
                for (const toolCall of response.tool_calls) {
                    const result = await this.executeTool(toolCall);
                    yield { type: 'tool_result', data: { name: toolCall.function.name, result: result.slice(0, 200) } };

                    this.state.messages.push({
                        role: 'tool',
                        tool_call_id: toolCall.id,
                        content: result,
                    });
                }

                continue;
            }

            // 最终回答
            this.state.isComplete = true;
            yield { type: 'content', data: response.content };
            yield { type: 'done', data: { iterations: this.state.iteration } };
            return;
        }

        yield { type: 'done', data: { iterations: this.state.iteration, timeout: true } };
    }

    /**
     * 调用 LLM
     */
    private async callLLM(): Promise<{ content: string; tool_calls?: ToolCall[] }> {
        const response = await fetch(`${ENV.grokApiUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${ENV.grokApiKey}`,
            },
            body: JSON.stringify({
                model: ENV.grokModel,
                messages: this.state.messages,
                tools: stockTools,
                tool_choice: 'auto',
                max_tokens: this.config.maxTokens,
                temperature: this.config.temperature,
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`LLM API Error: ${response.status} - ${error}`);
        }

        const data = await response.json();
        const message = data.choices?.[0]?.message;

        return {
            content: message?.content || '',
            tool_calls: message?.tool_calls,
        };
    }

    /**
     * 调用 LLM（流式版本，但收集完整响应）
     */
    private async callLLMStream(): Promise<{ content: string; tool_calls?: ToolCall[] }> {
        // 简化版：先用非流式，后续可以改成真正的流式
        return this.callLLM();
    }

    /**
     * 执行单个工具调用
     */
    private async executeTool(toolCall: ToolCall): Promise<string> {
        const { name, arguments: argsStr } = toolCall.function;

        try {
            const args = JSON.parse(argsStr || '{}');
            this.log(`   执行: ${name}(${JSON.stringify(args)})`);

            const result = await executeStockTool(name, args);

            // 缓存结果
            this.state.toolResults.set(`${name}:${argsStr}`, result);

            return result;
        } catch (error: any) {
            this.log(`   ❌ 工具执行失败: ${error.message}`);
            return `工具 ${name} 执行失败: ${error.message}`;
        }
    }

    /**
     * 日志输出
     */
    private log(message: string) {
        if (this.config.verbose) {
            console.log(message);
        }
        this.state.thinking.push(message);
    }

    /**
     * 重置状态
     */
    reset() {
        this.state = {
            messages: [{ role: 'system', content: AGENT_SYSTEM_PROMPT }],
            toolResults: new Map(),
            iteration: 0,
            thinking: [],
            isComplete: false,
        };
    }

    /**
     * 获取思考过程
     */
    getThinking(): string[] {
        return this.state.thinking;
    }

    /**
     * 获取工具调用统计
     */
    getToolStats(): { name: string; count: number }[] {
        const stats = new Map<string, number>();
        this.state.toolResults.forEach((_value, key) => {
            const name = key.split(':')[0];
            stats.set(name, (stats.get(name) || 0) + 1);
        });
        return Array.from(stats.entries()).map(([name, count]) => ({ name, count }));
    }
}

// ==================== 便捷函数 ====================

/**
 * 快速分析（一次性调用）
 */
export async function analyzeWithAgent(question: string): Promise<string> {
    const agent = new StockAgent({ verbose: false });
    return agent.chat(question);
}

/**
 * 流式分析（返回 AsyncGenerator）
 */
export async function* streamAnalyzeWithAgent(question: string) {
    const agent = new StockAgent({ verbose: false, streamOutput: true });
    yield* agent.streamChat(question);
}
