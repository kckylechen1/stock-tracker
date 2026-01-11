/**
 * SmartAgent 流式聊天入口
 * 
 * 替代原有的 streamChat，使用新架构：
 * - SmartAgent (主控)
 * - Session 持久化
 * - Memory 记忆系统
 * - Skill 技能匹配
 */

import { createSmartAgent } from './agent';
import type { StreamEvent } from './agent/types';

// 前端传来的股票上下文数据类型
export interface StockContextData {
    quote?: {
        name?: string;
        code?: string;
        price?: number;
        change?: number;
        changePercent?: number;
    } | null;
    fundFlow?: {
        mainNetInflow?: number;
        superLargeNetInflow?: number;
    } | null;
}

export interface Message {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string;
}

export interface SmartStreamChatParams {
    messages: Message[];
    stockCode?: string;
    stockContext?: StockContextData | null;
    sessionId?: string;
}

/**
 * 格式化流式事件为前端可用的 SSE 格式
 * 
 * 精简模式：只显示最终分析结果，隐藏中间过程
 */
function formatEventForSSE(event: StreamEvent): string {
    switch (event.type) {
        case 'thinking':
        case 'tool_call':
        case 'tool_result':
        case 'task_start':
        case 'task_complete':
            // 隐藏中间过程，让输出更像专业投资顾问
            return '';

        case 'content':
            // 主要内容输出
            return event.data;

        case 'error':
            return `❌ 分析失败: ${event.data}\n`;

        case 'done':
            return '';

        default:
            return '';
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
    const { messages, stockCode, stockContext, sessionId } = params;

    // 获取最后一条用户消息
    const userMessages = messages.filter(m => m.role === 'user');
    const lastUserMessage = userMessages[userMessages.length - 1]?.content || '';

    if (!lastUserMessage) {
        yield '请输入您的问题。';
        return;
    }

    // 检查是否切换到详细模式
    const isSwitchingToDetailMode = lastUserMessage.includes("切换到详细输出模式") || lastUserMessage.includes("更详细输出版本");
    if (isSwitchingToDetailMode) {
        // 更新会话的详细模式设置
        const { getSessionStore } = await import('../session');
        const sessionStore = getSessionStore();
        const session = sessionStore.getOrCreateSession(sessionId, stockCode);
        session.metadata.detailMode = true;
        sessionStore.saveSession(session.id);
    }

    // 创建 SmartAgent
    const agent = createSmartAgent({
        stockCode,
        sessionId,
        useOrchestrator: false, // 先用基础模式，更快更稳定
        verbose: false,
    });

    let hasContent = false;

    try {
        // 流式执行
        for await (const event of agent.stream(lastUserMessage)) {
            const formatted = formatEventForSSE(event);

            if (formatted) {
                yield formatted;

                if (event.type === 'content') {
                    hasContent = true;
                }
            }
        }

        // 如果没有内容输出，说明出了问题
        if (!hasContent) {
            yield '\n⚠️ 未能生成回答，请重试。';
        }

    } catch (error: any) {
        console.error('SmartAgent stream error:', error);
        yield `\n❌ 发生错误: ${error.message}`;
    } finally {
        // 清理资源
        agent.cleanup();
    }
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
        const { streamChat } = await import('./streamChat');
        yield* streamChat({
            messages: restParams.messages,
            stockCode: restParams.stockCode,
            stockContext: restParams.stockContext,
            useThinking: false,
            useGrok: true,
        });
    }
}
