/**
 * Grok AI 客户端
 * 使用 xAI 的 Grok-4 作为前端对话模型
 * 
 * 架构：Grok（聪明）+ Qwen3（便宜的工具调用）
 */

import { ENV } from './env';

// ==================== 类型定义 ====================

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface GrokResponse {
    id: string;
    choices: Array<{
        message: {
            role: string;
            content: string;
        };
        finish_reason: string;
    }>;
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

// ==================== Grok 客户端 ====================

/**
 * 调用 Grok API
 */
async function callGrokAPI(
    messages: ChatMessage[],
    stream: boolean = false
): Promise<Response> {
    const response = await fetch(`${ENV.grokApiUrl}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ENV.grokApiKey}`,
        },
        body: JSON.stringify({
            model: ENV.grokModel,
            messages,
            stream,
            temperature: 0.7,
            max_tokens: 4000,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Grok API Error: ${response.status} - ${error}`);
    }

    return response;
}

/**
 * Grok 对话（非流式）
 */
export async function chatWithGrok(
    messages: ChatMessage[],
    stockData?: string
): Promise<string> {
    // 构建系统提示
    const systemPrompt = buildSystemPrompt(stockData);

    const fullMessages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        ...messages
    ];

    const response = await callGrokAPI(fullMessages, false);
    const data: GrokResponse = await response.json();

    return data.choices[0]?.message?.content || '';
}

/**
 * Grok 流式对话
 */
export async function* streamChatWithGrok(
    messages: ChatMessage[],
    stockData?: string
): AsyncGenerator<string> {
    const systemPrompt = buildSystemPrompt(stockData);

    const fullMessages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        ...messages
    ];

    const response = await callGrokAPI(fullMessages, true);
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
        throw new Error('No response body');
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
                    // Ignore parse errors
                }
            }
        }
    }
}

/**
 * 构建系统提示
 */
function buildSystemPrompt(stockData?: string): string {
    const now = new Date();
    const dateStr = now.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long',
        hour: '2-digit',
        minute: '2-digit'
    });

    return `你是"小A"，一个A股短线操盘手AI助手。性格特点：果断、直接、不废话。

【当前时间】${dateStr}

【你的风格】
- 直接给出结论：买入/卖出/观望/空仓
- 不说"仅供参考"、"结合自身情况"这种废话
- 用数据说话，给出具体点位
- 如果风险大，直接说"别碰"
- 说话简洁有力，像老练的操盘手

${stockData ? `【股票分析数据】\n${stockData}` : ''}

【回答格式】
1. **结论**（一句话判断）
2. **理由**（3点以内，用数据）
3. **操作建议**（具体点位和仓位）`;
}

/**
 * 测试 Grok 连接
 */
export async function testGrokConnection(): Promise<{
    success: boolean;
    model: string;
    message: string;
}> {
    try {
        const response = await chatWithGrok([
            { role: 'user', content: 'Hi, 简单回复' }
        ]);

        return {
            success: true,
            model: ENV.grokModel,
            message: response.slice(0, 100),
        };
    } catch (error: any) {
        return {
            success: false,
            model: ENV.grokModel,
            message: error.message,
        };
    }
}

// ==================== Qwen 预处理（便宜的工具调用） ====================

/**
 * 使用 Qwen 调用工具预处理数据
 */
export async function preprocessWithQwen(
    stockCode: string,
    analysisType: 'full' | 'quick' = 'quick'
): Promise<string> {
    try {
        const prompt = analysisType === 'full'
            ? `请全面分析股票 ${stockCode}，包括技术面、资金面、大盘环境和股吧人气。`
            : `请快速分析股票 ${stockCode} 的当前状态。`;

        const response = await fetch(`${ENV.forgeApiUrl}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${ENV.forgeApiKey}`,
            },
            body: JSON.stringify({
                model: 'Qwen/Qwen3-235B-A22B',
                messages: [
                    {
                        role: 'system',
                        content: '你是数据预处理助手，请返回结构化的分析数据。'
                    },
                    { role: 'user', content: prompt }
                ],
                max_tokens: 2000,
            }),
        });

        if (!response.ok) {
            throw new Error(`Qwen API Error: ${response.status}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || '';
    } catch (error: any) {
        console.error('[Qwen Preprocess] Error:', error.message);
        return '';
    }
}
