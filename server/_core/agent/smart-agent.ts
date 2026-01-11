/**
 * SmartAgent - 智能 Agent 入口
 * 
 * 整合：
 * - SubAgent 系统
 * - Session 管理
 * - Memory 系统
 * - Skill 系统
 */

import { AgentOrchestrator } from './orchestrator';
import { AnalysisAgent } from './agents/analysis-agent';
import { getSessionStore, type Session, type TodoItem, type TodoRunStatus } from '../session';
import { getMemoryStore } from '../memory';
import { getSkillRegistry, type Skill } from '../skills';
import type { StreamEvent, AgentMessage } from './types';

export interface SmartAgentConfig {
    sessionId?: string;
    stockCode?: string;
    useOrchestrator?: boolean;
    verbose?: boolean;
    thinkHard?: boolean;
    preloadedContext?: string;
}

export class SmartAgent {
    private config: SmartAgentConfig;
    private session: Session;
    private orchestrator: AgentOrchestrator | null;
    private analysisAgent: AnalysisAgent | null;

    constructor(config: SmartAgentConfig = {}) {
        this.config = {
            useOrchestrator: true,
            verbose: true,
            ...config,
        };

        const sessionStore = getSessionStore();
        this.session = sessionStore.getOrCreateSession(
            config.sessionId,
            config.stockCode
        );

        if (typeof config.thinkHard === 'boolean') {
            sessionStore.updateMetadata(this.session.id, {
                detailMode: config.thinkHard,
            });
        }

        this.orchestrator = config.useOrchestrator ? new AgentOrchestrator() : null;
        this.analysisAgent = config.useOrchestrator ? null : new AnalysisAgent(this.session.metadata.detailMode || false);
    }

    /**
     * 同步执行
     */
    async chat(userMessage: string): Promise<{
        response: string;
        toolCalls: string[];
        iterations: number;
    }> {
        const sessionStore = getSessionStore();
        const memoryStore = getMemoryStore();
        const skillRegistry = getSkillRegistry();

        sessionStore.addMessage(this.session.id, {
            role: 'user',
            content: userMessage,
        });

        const memoryContext = memoryStore.generateContextInjection(
            userMessage,
            this.config.stockCode
        );

        const matchedSkill = skillRegistry.getBestMatch(userMessage);
        const skillContext = matchedSkill
            ? skillRegistry.generateSkillPrompt(matchedSkill.name)
            : '';

        const todoRun = sessionStore.startTodoRun(this.session.id, {
            userMessage,
            stockCode: this.config.stockCode,
            thinkHard: this.session.metadata.detailMode,
            initialTodos: this.buildInitialTodos(matchedSkill),
        });

        const enhancedMessage = this.buildEnhancedMessage(
            userMessage,
            memoryContext,
            skillContext,
            matchedSkill
        );

        const agent = this.orchestrator || this.analysisAgent!;

        // 20秒超时控制，超时后降级到基础工具
        const response = await this.runWithTimeout(agent, enhancedMessage);

        sessionStore.addMessage(this.session.id, {
            role: 'assistant',
            content: response,
        });

        this.extractAndSaveMemories(userMessage, response);

        const toolCalls = typeof agent.getToolStats === 'function'
            ? agent.getToolStats().map((t: any) => t.name)
            : [];
        const iterations = typeof agent.getThinking === 'function'
            ? agent.getThinking().length
            : 1;

        // chat() 模式没有逐步事件：只把最终状态落盘
        sessionStore.finishTodoRun(this.session.id, todoRun.id, 'completed');

        return {
            response,
            toolCalls,
            iterations,
        };
    }

    /**
     * 流式执行
     */
    async *stream(userMessage: string): AsyncGenerator<StreamEvent> {
        const sessionStore = getSessionStore();
        const memoryStore = getMemoryStore();
        const skillRegistry = getSkillRegistry();

        sessionStore.addMessage(this.session.id, {
            role: 'user',
            content: userMessage,
        });

        const memoryContext = memoryStore.generateContextInjection(
            userMessage,
            this.config.stockCode
        );

        const matchedSkill = skillRegistry.getBestMatch(userMessage);
        const skillContext = matchedSkill
            ? skillRegistry.generateSkillPrompt(matchedSkill.name)
            : '';

        const todoRun = sessionStore.startTodoRun(this.session.id, {
            userMessage,
            stockCode: this.config.stockCode,
            thinkHard: this.session.metadata.detailMode,
            initialTodos: this.buildInitialTodos(matchedSkill),
        });
        const finalTodoId = todoRun.todos.find(t => !t.toolName)?.id;

        if (matchedSkill) {
            yield {
                type: 'thinking',
                data: `匹配技能: ${matchedSkill.name}`,
            };
        }

        if (memoryContext) {
            yield {
                type: 'thinking',
                data: '注入相关记忆...',
            };
        }

        const enhancedMessage = this.buildEnhancedMessage(
            userMessage,
            memoryContext,
            skillContext,
            matchedSkill
        );

        const agent = this.orchestrator || this.analysisAgent!;
        let fullResponse = '';
        let runStatus: TodoRunStatus = 'completed';

        // 简化实现：暂时不实现流式超时，后续优化
        for await (const event of agent.stream(enhancedMessage)) {
            if (event.type === 'tool_call') {
                const toolCallId = event.data?.toolCallId || event.data?.id;
                const toolName = event.data?.name;
                const toolArgs = this.safeParseArgs(event.data?.args);

                if (toolCallId && toolName) {
                    sessionStore.upsertTodoForToolCall(this.session.id, todoRun.id, {
                        toolCallId,
                        toolName,
                        toolArgs,
                        status: 'in_progress',
                        title: `调用工具: ${toolName}`,
                    });
                }
            }

            if (event.type === 'tool_result') {
                const toolCallId = event.data?.toolCallId || event.data?.id;
                const toolName = event.data?.name;
                const ok = Boolean(event.data?.ok);
                const result = typeof event.data?.result === 'string' ? event.data.result : '';
                const error = typeof event.data?.error === 'string' ? event.data.error : undefined;

                if (toolCallId && toolName) {
                    const todo = sessionStore.upsertTodoForToolCall(this.session.id, todoRun.id, {
                        toolCallId,
                        toolName,
                        status: ok ? 'completed' : 'failed',
                        title: `调用工具: ${toolName}`,
                    });
                    sessionStore.updateTodo(this.session.id, todoRun.id, todo.id, {
                        resultPreview: result.slice(0, 200),
                        error: ok ? undefined : (error || 'Tool failed'),
                    });
                }
            }

            if (event.type === 'content') {
                fullResponse = event.data;
                if (finalTodoId) {
                    sessionStore.updateTodo(this.session.id, todoRun.id, finalTodoId, {
                        status: 'in_progress',
                    });
                }
            }

            if (event.type === 'error') {
                runStatus = 'failed';
            }

            yield event;
        }

        sessionStore.addMessage(this.session.id, {
            role: 'assistant',
            content: fullResponse,
        });

        if (finalTodoId) {
            sessionStore.updateTodo(this.session.id, todoRun.id, finalTodoId, {
                status: runStatus === 'completed' ? 'completed' : 'failed',
            });
        }
        sessionStore.finishTodoRun(this.session.id, todoRun.id, runStatus);

        this.extractAndSaveMemories(userMessage, fullResponse);
    }

    /**
     * 带超时的执行，20秒超时后降级到基础工具
     */
    private async runWithTimeout(agent: any, enhancedMessage: string): Promise<string> {
        const TIMEOUT_MS = this.session.metadata.detailMode ? 45000 : 20000; // 详细模式允许更久

        try {
            // 创建超时 Promise
            const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error('TIMEOUT')), TIMEOUT_MS);
            });

            // 执行 agent 的 Promise
            const agentPromise = agent.run(enhancedMessage);

            // 竞态执行，哪个先完成用哪个
            const response = await Promise.race([agentPromise, timeoutPromise]);

            return response;

        } catch (error) {
            if (error instanceof Error && error.message === 'TIMEOUT') {
                console.warn('Agent execution timed out after 20 seconds, falling back to basic tools');

                // 降级到基础工具分析
                return await this.fallbackToBasicTools(enhancedMessage);
            }

            // 其他错误直接抛出
            throw error;
        }
    }

    /**
     * 基础工具降级策略
     */
    private async fallbackToBasicTools(userMessage: string): Promise<string> {
        try {
            // 导入工具执行器
            const { executeStockTool } = await import('../stockTools');

            let response = '⚠️ 响应超时，已降级到基础工具分析：\n\n';

            // 提取股票代码（简单正则匹配）
            const stockCodeMatch = userMessage.match(/(\d{6}|\w{2,}\.\w{2,})/);
            if (!stockCodeMatch) {
                return response + '未检测到有效的股票代码，请重新提问。';
            }

            const stockCode = stockCodeMatch[1];

            // 获取基本报价
            const quoteResult = await executeStockTool('get_stock_quote', { code: stockCode });
            if (quoteResult && !quoteResult.includes('无法获取')) {
                response += quoteResult + '\n\n';
            }

            // 简单的技术分析
            const technicalResult = await executeStockTool('analyze_stock_technical', {
                code: stockCode,
                period: 'day'
            });
            if (technicalResult && !technicalResult.includes('失败')) {
                response += technicalResult + '\n\n';
            }

            response += `💡 建议：如需更详细分析，请稍后重试或简化问题。`;

            return response;

        } catch (fallbackError) {
            console.error('Fallback analysis failed:', fallbackError);
            return '❌ 分析服务暂时不可用，请稍后重试。';
        }
    }

    /**
     * 构建增强消息
     */
    private buildEnhancedMessage(
        userMessage: string,
        memoryContext: string,
        skillContext: string,
        matchedSkill: Skill | null
    ): string {
        const parts: string[] = [];

        if (this.config.stockCode) {
            parts.push(`【当前股票】${this.config.stockCode}`);
        }

        if (this.config.preloadedContext) {
            parts.push(this.config.preloadedContext);
        }

        if (memoryContext) {
            parts.push(memoryContext);
        }

        if (skillContext && matchedSkill) {
            parts.push(`【激活技能】${matchedSkill.name}`);
            parts.push(skillContext);
        }

        parts.push(`【用户问题】${userMessage}`);

        return parts.join('\n\n');
    }

    /**
     * 提取并保存记忆
     */
    private extractAndSaveMemories(userMessage: string, response: string): void {
        const memoryStore = getMemoryStore();

        const lessonPatterns = [
            /教训[：:]\s*(.+)/,
            /记住[：:]\s*(.+)/,
            /以后[：:]\s*(.+)/,
            /下次[：:]\s*(.+)/,
        ];

        for (const pattern of lessonPatterns) {
            const match = userMessage.match(pattern) || response.match(pattern);
            if (match) {
                memoryStore.addLesson(
                    match[1],
                    this.extractKeywords(match[1]),
                    this.config.stockCode
                );
            }
        }

        if (this.config.stockCode && (response.includes('买入') || response.includes('卖出'))) {
            memoryStore.setShortTerm(
                this.session.id,
                'last_advice',
                response.slice(0, 200)
            );
        }
    }

    private buildInitialTodos(matchedSkill: Skill | null): Array<Pick<TodoItem, 'title'> & Partial<Omit<TodoItem, 'id' | 'createdAt' | 'updatedAt'>>> {
        const stockCode = this.config.stockCode;
        const detailMode = Boolean(this.session.metadata.detailMode);

        if (!stockCode) {
            return [{ title: '理解问题并给出回答' }];
        }

        const toolPlan = matchedSkill?.tools && matchedSkill.tools.length > 0
            ? matchedSkill.tools
            : detailMode
                ? [
                    'comprehensive_analysis',
                    'get_guba_hot_rank',
                    'get_trading_memory',
                ]
                : [
                    'get_stock_quote',
                    'analyze_stock_technical',
                    'get_fund_flow',
                    'get_market_status',
                    'get_trading_memory',
                ];

        const todos: Array<Pick<TodoItem, 'title'> & Partial<Omit<TodoItem, 'id' | 'createdAt' | 'updatedAt'>>> = toolPlan.map(toolName => ({
            title: `计划工具: ${toolName}`,
            toolName,
            toolArgs: toolName === 'get_market_status'
                ? {}
                : toolName === 'search_stock'
                    ? { keyword: stockCode }
                    : { code: stockCode },
        }));

        todos.push({ title: '生成结论与操作建议' });
        return todos;
    }

    private safeParseArgs(args: unknown): Record<string, any> | undefined {
        if (!args) return undefined;
        if (typeof args === 'object') return args as Record<string, any>;
        if (typeof args !== 'string') return undefined;
        try {
            return JSON.parse(args) as Record<string, any>;
        } catch {
            return undefined;
        }
    }

    /**
     * 提取关键词
     */
    private extractKeywords(text: string): string[] {
        const words = text
            .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, ' ')
            .split(/\s+/)
            .filter(w => w.length > 1);

        return Array.from(new Set(words)).slice(0, 10);
    }

    /**
     * 获取会话 ID
     */
    getSessionId(): string {
        return this.session.id;
    }

    /**
     * 获取会话历史
     */
    getHistory(): AgentMessage[] {
        return getSessionStore().getMessages(this.session.id);
    }

    /**
     * 导出会话
     */
    exportSession(): string {
        return getSessionStore().exportToMarkdown(this.session.id);
    }

    /**
     * 添加记忆
     */
    addMemory(type: 'fact' | 'lesson' | 'insight', content: string): void {
        const memoryStore = getMemoryStore();
        const keywords = this.extractKeywords(content);

        switch (type) {
            case 'fact':
                memoryStore.addFact(content, keywords, this.config.stockCode);
                break;
            case 'lesson':
                memoryStore.addLesson(content, keywords, this.config.stockCode);
                break;
            case 'insight':
                memoryStore.addInsight(content, keywords);
                break;
        }
    }

    /**
     * 清理资源
     */
    cleanup(): void {
        if (this.orchestrator) {
            this.orchestrator.reset();
        }
        if (this.analysisAgent) {
            this.analysisAgent.reset();
        }
    }
}

/**
 * 快速创建 SmartAgent
 */
export function createSmartAgent(config: SmartAgentConfig = {}): SmartAgent {
    return new SmartAgent(config);
}
