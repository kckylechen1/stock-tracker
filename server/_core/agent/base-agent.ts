/**
 * BaseAgent - Agent 基类
 * 
 * 核心功能：
 * 1. ReAct 循环（推理-行动-观察）
 * 2. 工具调用管理（支持并行 + 并发限制）
 * 3. 流式输出
 * 4. 错误恢复 + 指数退避重试
 */

import { ENV } from '../env';
import pLimit from 'p-limit';
import type {
    AgentConfig,
    AgentState,
    AgentMessage,
    ToolCall,
    ToolDefinition,
    ToolExecutor,
    LLMResponse,
    StreamEvent,
} from './types';

// 并发限制：最多同时执行 6 个工具调用，防止 AKShare API 限流
const toolConcurrencyLimit = pLimit(6);

export abstract class BaseAgent {
    protected config: AgentConfig;
    protected state: AgentState;
    protected toolExecutors: Map<string, ToolExecutor>;

    constructor(config: Partial<AgentConfig>) {
        this.config = {
            name: 'BaseAgent',
            description: 'Base agent class',
            systemPrompt: '',
            tools: [],
            maxIterations: 10,
            maxTokens: 4096,
            temperature: 0.7,
            verbose: true,
            parallelToolCalls: true,
            toolBudget: {
                simple: 4,    // 简单问题最多 4 个工具
                complex: 8,   // 复杂问题最多 8 个工具
            },
            ...config,
        };

        this.state = this.createInitialState();
        this.toolExecutors = new Map();
    }

    private createInitialState(): AgentState {
        return {
            messages: this.config.systemPrompt
                ? [{ role: 'system', content: this.config.systemPrompt }]
                : [],
            iteration: 0,
            isComplete: false,
            toolResults: new Map(),
            thinking: [],
            startTime: Date.now(),
            toolsUsed: 0,
        };
    }

    /**
     * 注册工具执行器
     */
    registerTool(name: string, executor: ToolExecutor): void {
        this.toolExecutors.set(name, executor);
    }

    /**
     * 批量注册工具
     */
    registerTools(tools: Record<string, ToolExecutor>): void {
        for (const [name, executor] of Object.entries(tools)) {
            this.registerTool(name, executor);
        }
    }

    /**
     * 分类查询复杂度
     */
    private classifyQueryComplexity(userMessage: string): 'simple' | 'complex' {
        const message = userMessage.toLowerCase();

        // 简单查询特征
        const simplePatterns = [
            /^分析.*股票?$/i,
            /^.*股票.*怎么样?$/i,
            /^查看.*行情?$/i,
            /^.*股价.*多少?$/i,
            /^.*能不能买?$/i,
            /^.*能不能卖?$/i,
        ];

        // 复杂查询特征
        const complexPatterns = [
            /对比|比较|研究|调研|分析.*趋势|深度分析/i,
            /回测|测试.*策略/i,
            /扫描|寻找|发现/i,
            /多个|全部|市场|行业/i,
            /详细|全面|综合/i,
            /历史|长期|短期/i,
        ];

        // 检查是否匹配简单模式
        for (const pattern of simplePatterns) {
            if (pattern.test(message)) {
                return 'simple';
            }
        }

        // 检查是否匹配复杂模式
        for (const pattern of complexPatterns) {
            if (pattern.test(message)) {
                return 'complex';
            }
        }

        // 默认当作简单查询
        return 'simple';
    }

    /**
     * 主入口：同步执行
     */
    async run(userMessage: string): Promise<string> {
        this.state.messages.push({ role: 'user', content: userMessage });
        this.state.queryComplexity = this.classifyQueryComplexity(userMessage);
        this.log(`\n🔷 [${this.config.name}] 收到 (${this.state.queryComplexity}): ${userMessage.slice(0, 100)}...`);

        while (this.state.iteration < this.config.maxIterations && !this.state.isComplete) {
            this.state.iteration++;
            this.log(`\n📍 迭代 ${this.state.iteration}/${this.config.maxIterations}`);

            try {
                const response = await this.callLLM();

                if (response.tool_calls && response.tool_calls.length > 0) {
                    await this.handleToolCalls(response);
                    continue;
                }

                this.state.isComplete = true;
                this.log(`\n✅ 完成，共 ${this.state.iteration} 次迭代`);
                return response.content || '无法生成回答';

            } catch (error: any) {
                this.log(`\n❌ 错误: ${error.message}`);
                this.state.error = error.message;

                if (this.state.iteration >= this.config.maxIterations) {
                    return `执行出错: ${error.message}`;
                }
            }
        }

        return '达到最大迭代次数，请简化问题重试';
    }

    /**
     * 流式执行
     */
    async *stream(userMessage: string): AsyncGenerator<StreamEvent> {
        this.state.messages.push({ role: 'user', content: userMessage });
        this.state.queryComplexity = this.classifyQueryComplexity(userMessage);
        yield { type: 'thinking', data: `分析问题 (${this.state.queryComplexity})...` };

        while (this.state.iteration < this.config.maxIterations && !this.state.isComplete) {
            this.state.iteration++;
            yield { type: 'thinking', data: `迭代 ${this.state.iteration}...` };

            try {
                const response = await this.callLLM();

                if (response.tool_calls && response.tool_calls.length > 0) {
                    for (const tc of response.tool_calls) {
                        yield {
                            type: 'tool_call',
                            data: { name: tc.function.name, args: tc.function.arguments },
                        };
                    }

                    const results = await this.executeToolCalls(response.tool_calls);

                    for (const [name, result] of Array.from(results.entries())) {
                        yield {
                            type: 'tool_result',
                            data: { name, result: this.truncate(result, 200) },
                        };
                    }

                    this.addToolResultsToMessages(response, results);
                    continue;
                }

                this.state.isComplete = true;
                yield { type: 'content', data: response.content };
                yield {
                    type: 'done',
                    data: {
                        iterations: this.state.iteration,
                        duration: Date.now() - this.state.startTime,
                    },
                };
                return;

            } catch (error: any) {
                yield { type: 'error', data: error.message };

                if (this.state.iteration >= this.config.maxIterations) {
                    yield { type: 'done', data: { error: error.message } };
                    return;
                }
            }
        }

        yield { type: 'done', data: { timeout: true } };
    }

    /**
     * 调用 LLM
     */
    protected async callLLM(): Promise<LLMResponse> {
        const apiUrl = ENV.grokApiUrl || 'https://api.x.ai/v1';
        const apiKey = ENV.grokApiKey;
        const model = this.config.model || ENV.grokModel || 'grok-3-mini';

        const payload: any = {
            model,
            messages: this.state.messages,
            max_tokens: this.config.maxTokens,
            temperature: this.config.temperature,
        };

        if (this.config.tools.length > 0) {
            payload.tools = this.config.tools;
            payload.tool_choice = 'auto';
        }

        const response = await fetch(`${apiUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`LLM Error: ${response.status} - ${error}`);
        }

        const data = await response.json();
        const message = data.choices?.[0]?.message;

        return {
            content: message?.content || '',
            tool_calls: message?.tool_calls,
            finish_reason: data.choices?.[0]?.finish_reason,
            usage: data.usage,
        };
    }

    /**
     * 处理工具调用（添加到消息历史）
     */
    private async handleToolCalls(response: LLMResponse): Promise<void> {
        this.log(`🔧 工具调用: ${response.tool_calls!.map(tc => tc.function.name).join(', ')}`);

        this.state.messages.push({
            role: 'assistant',
            content: response.content || '',
            tool_calls: response.tool_calls,
        });

        const results = await this.executeToolCalls(response.tool_calls!);
        this.addToolResultsToMessages(response, results);
    }

    /**
     * 执行工具调用（支持并行 + 并发限制）
     */
    private async executeToolCalls(toolCalls: ToolCall[]): Promise<Map<string, string>> {
        const results = new Map<string, string>();

        // 检查工具预算
        const maxTools = this.config.toolBudget![this.state.queryComplexity!];
        const remainingTools = maxTools - this.state.toolsUsed;

        if (remainingTools <= 0) {
            this.log(`⚠️ 工具预算已耗尽 (最大 ${maxTools} 个工具)`);
            results.set('budget_exceeded', `已达到工具使用上限 (${maxTools} 个)，请简化问题或分步查询。`);
            return results;
        }

        // 如果请求的工具数量超过剩余预算，截断
        const allowedToolCalls = toolCalls.slice(0, remainingTools);

        if (allowedToolCalls.length < toolCalls.length) {
            this.log(`⚠️ 工具调用被截断: ${toolCalls.length} → ${allowedToolCalls.length} (预算限制)`);
            results.set('budget_limited', `工具调用数量已限制为 ${allowedToolCalls.length} 个 (预算: ${maxTools})`);
        }

        if (this.config.parallelToolCalls && allowedToolCalls.length > 1) {
            // 使用 p-limit 控制并发，最多同时执行 6 个
            const promises = allowedToolCalls.map((tc) =>
                toolConcurrencyLimit(async () => {
                    const result = await this.executeSingleToolWithRetry(tc);
                    return { id: tc.id, name: tc.function.name, result };
                })
            );

            const settled = await Promise.allSettled(promises);

            for (const item of settled) {
                if (item.status === 'fulfilled') {
                    results.set(item.value.id, item.value.result);
                    this.state.toolsUsed++;
                } else {
                    results.set('error', `执行失败: ${item.reason}`);
                }
            }
        } else {
            for (const tc of allowedToolCalls) {
                const result = await this.executeSingleToolWithRetry(tc);
                results.set(tc.id, result);
                this.state.toolsUsed++;
            }
        }

        return results;
    }

    /**
     * 执行单个工具（带指数退避重试）
     */
    private async executeSingleToolWithRetry(toolCall: ToolCall, maxRetries = 3): Promise<string> {
        let lastError: Error | null = null;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                return await this.executeSingleTool(toolCall);
            } catch (error: any) {
                lastError = error;

                // 指数退避：1s, 2s, 4s
                const delay = Math.pow(2, attempt) * 1000;
                this.log(`   ⚠️ 工具 ${toolCall.function.name} 第 ${attempt + 1} 次失败，${delay / 1000}s 后重试...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        return `工具 ${toolCall.function.name} 执行失败（重试 ${maxRetries} 次）: ${lastError?.message}`;
    }

    /**
     * 执行单个工具
     */
    private async executeSingleTool(toolCall: ToolCall): Promise<string> {
        const { name, arguments: argsStr } = toolCall.function;
        const executor = this.toolExecutors.get(name);

        if (!executor) {
            return `未知工具: ${name}`;
        }

        try {
            const args = JSON.parse(argsStr || '{}');
            this.log(`   执行: ${name}(${JSON.stringify(args).slice(0, 100)})`);

            const result = await executor(args);
            this.state.toolResults.set(`${name}:${argsStr}`, result);

            return result;
        } catch (error: any) {
            this.log(`   ❌ ${name} 失败: ${error.message}`);
            return `工具 ${name} 执行失败: ${error.message}`;
        }
    }

    /**
     * 添加工具结果到消息历史
     */
    private addToolResultsToMessages(response: LLMResponse, results: Map<string, string>): void {
        for (const tc of response.tool_calls!) {
            const result = results.get(tc.id) || '执行失败';
            this.state.messages.push({
                role: 'tool',
                tool_call_id: tc.id,
                content: result,
            });
        }
    }

    /**
     * 重置状态
     */
    reset(): void {
        this.state = this.createInitialState();
    }

    /**
     * 获取当前上下文
     */
    getContext(): AgentMessage[] {
        return [...this.state.messages];
    }

    /**
     * 注入上下文
     */
    injectContext(messages: AgentMessage[]): void {
        this.state.messages = [
            ...this.state.messages.filter(m => m.role === 'system'),
            ...messages,
        ];
    }

    /**
     * 日志输出
     */
    protected log(message: string): void {
        if (this.config.verbose) {
            console.log(message);
        }
        this.state.thinking.push(message);
    }

    /**
     * 截断字符串
     */
    private truncate(str: string, maxLen: number): string {
        return str.length > maxLen ? str.slice(0, maxLen) + '...' : str;
    }

    /**
     * 获取工具使用统计
     */
    getToolStats(): { name: string; count: number }[] {
        const stats = new Map<string, number>();
        for (const key of Array.from(this.state.toolResults.keys())) {
            const name = key.split(':')[0];
            stats.set(name, (stats.get(name) || 0) + 1);
        }
        return Array.from(stats.entries()).map(([name, count]) => ({ name, count }));
    }

    /**
     * 获取思考过程
     */
    getThinking(): string[] {
        return [...this.state.thinking];
    }
}
