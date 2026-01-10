/**
 * Grok vs DeepSeek V3 对比测试
 * 使用相同的 Prompt，测试不同模型的表现
 */

import { ENV } from '../_core/env';
import { stockTools, executeStockTool } from '../_core/stockTools';
import { buildGrokSystemPrompt, preprocessUserMessage, GROK_CONFIG } from '../_core/prompts/grokPrompt';

const STOCK_CODE = '300418';
const STOCK_NAME = '昆仑万维';
const TEST_QUESTION = '给出下周有可能的走势';

interface ChatMessage {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string;
    tool_calls?: any[];
    tool_call_id?: string;
}

async function testModel(
    modelName: 'grok' | 'deepseek',
    systemPrompt: string,
    userMessage: string
): Promise<{ response: string; toolsCalled: string[]; timeMs: number }> {

    const config = modelName === 'grok' ? {
        apiUrl: `${ENV.grokApiUrl}/chat/completions`,
        apiKey: ENV.grokApiKey,
        model: GROK_CONFIG.model,
        temperature: GROK_CONFIG.temperature,
    } : {
        apiUrl: `${ENV.forgeApiUrl}/v1/chat/completions`,
        apiKey: ENV.forgeApiKey,
        model: 'deepseek-ai/DeepSeek-V3',
        temperature: 0.8,
    };

    let messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
    ];

    const toolsCalled: string[] = [];
    const startTime = Date.now();
    let iteration = 0;
    const maxIterations = 5;

    while (iteration < maxIterations) {
        iteration++;
        console.log(`  [${modelName.toUpperCase()}] 迭代 ${iteration}...`);

        const response = await fetch(config.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`,
            },
            body: JSON.stringify({
                model: config.model,
                messages: messages.map(m => ({
                    role: m.role,
                    content: m.content,
                    ...(m.tool_calls && { tool_calls: m.tool_calls }),
                    ...(m.tool_call_id && { tool_call_id: m.tool_call_id }),
                })),
                tools: stockTools,
                tool_choice: 'auto',
                max_tokens: 4096,
                temperature: config.temperature,
            }),
        });

        const data = await response.json();

        if (data.error) {
            console.log(`  [${modelName.toUpperCase()}] API 错误:`, data.error);
            return { response: `错误: ${data.error.message}`, toolsCalled, timeMs: Date.now() - startTime };
        }

        const assistantMessage = data.choices?.[0]?.message;
        if (!assistantMessage) {
            return { response: '无响应', toolsCalled, timeMs: Date.now() - startTime };
        }

        // 有工具调用
        if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
            messages.push({
                role: 'assistant',
                content: assistantMessage.content || '',
                tool_calls: assistantMessage.tool_calls,
            });

            for (const toolCall of assistantMessage.tool_calls) {
                const toolName = toolCall.function.name;
                let toolArgs: any = {};
                try {
                    toolArgs = JSON.parse(toolCall.function.arguments || '{}');
                } catch { }

                toolsCalled.push(toolName);
                console.log(`    → 调用工具: ${toolName}`);

                const result = await executeStockTool(toolName, toolArgs);

                messages.push({
                    role: 'tool',
                    content: result,
                    tool_call_id: toolCall.id,
                });
            }

            continue;
        }

        // 最终回答
        return {
            response: assistantMessage.content || '',
            toolsCalled,
            timeMs: Date.now() - startTime
        };
    }

    return { response: '达到最大迭代次数', toolsCalled, timeMs: Date.now() - startTime };
}

async function main() {
    console.log('\n' + '='.repeat(100));
    console.log('  🧪 Grok 4 vs DeepSeek V3 对比测试');
    console.log('  使用相同的 Prompt (V2 结构化版本)');
    console.log('='.repeat(100));

    // 构建相同的 Prompt
    const systemPrompt = buildGrokSystemPrompt({
        stockCode: STOCK_CODE,
        stockName: STOCK_NAME,
    });

    const userMessage = preprocessUserMessage(TEST_QUESTION);

    console.log(`\n📌 测试信息:`);
    console.log(`   股票: ${STOCK_NAME} (${STOCK_CODE})`);
    console.log(`   问题: ${TEST_QUESTION}`);
    console.log(`   Prompt 长度: ${systemPrompt.length} 字符`);
    console.log(`   用户消息: ${userMessage.split('\n')[0]}`);

    // ==================== 测试 Grok ====================
    console.log('\n' + '─'.repeat(100));
    console.log('🔵 【Grok 4】');
    console.log(`   模型: ${GROK_CONFIG.model}`);
    console.log(`   温度: ${GROK_CONFIG.temperature}`);
    console.log('   测试中...\n');

    let grokResult: any;
    try {
        grokResult = await testModel('grok', systemPrompt, userMessage);
        console.log(`\n   ⏱️  耗时: ${(grokResult.timeMs / 1000).toFixed(1)}s`);
        console.log(`   🔧 工具调用: ${grokResult.toolsCalled.length > 0 ? grokResult.toolsCalled.join(', ') : '无'}`);
        console.log(`   📄 回答长度: ${grokResult.response.length} 字符`);
    } catch (error: any) {
        console.log(`   ❌ 错误: ${error.message}`);
        grokResult = { response: '', toolsCalled: [], timeMs: 0 };
    }

    // ==================== 测试 DeepSeek V3 ====================
    console.log('\n' + '─'.repeat(100));
    console.log('🟢 【DeepSeek V3】');
    console.log(`   模型: deepseek-ai/DeepSeek-V3`);
    console.log(`   温度: 0.8`);
    console.log('   测试中...\n');

    let deepseekResult: any;
    try {
        deepseekResult = await testModel('deepseek', systemPrompt, userMessage);
        console.log(`\n   ⏱️  耗时: ${(deepseekResult.timeMs / 1000).toFixed(1)}s`);
        console.log(`   🔧 工具调用: ${deepseekResult.toolsCalled.length > 0 ? deepseekResult.toolsCalled.join(', ') : '无'}`);
        console.log(`   📄 回答长度: ${deepseekResult.response.length} 字符`);
    } catch (error: any) {
        console.log(`   ❌ 错误: ${error.message}`);
        deepseekResult = { response: '', toolsCalled: [], timeMs: 0 };
    }

    // ==================== 对比结果 ====================
    console.log('\n' + '='.repeat(100));
    console.log('  📊 对比结果');
    console.log('='.repeat(100));

    console.log('\n┌─────────────────┬────────────────────┬────────────────────┐');
    console.log('│     指标        │      Grok 4        │    DeepSeek V3     │');
    console.log('├─────────────────┼────────────────────┼────────────────────┤');
    console.log(`│ 耗时            │ ${String((grokResult.timeMs / 1000).toFixed(1) + 's').padEnd(18)} │ ${String((deepseekResult.timeMs / 1000).toFixed(1) + 's').padEnd(18)} │`);
    console.log(`│ 工具调用数      │ ${String(grokResult.toolsCalled.length).padEnd(18)} │ ${String(deepseekResult.toolsCalled.length).padEnd(18)} │`);
    console.log(`│ 回答长度        │ ${String(grokResult.response.length + ' 字符').padEnd(18)} │ ${String(deepseekResult.response.length + ' 字符').padEnd(18)} │`);
    console.log('└─────────────────┴────────────────────┴────────────────────┘');

    // 显示回答预览
    console.log('\n' + '─'.repeat(100));
    console.log('🔵 【Grok 4 回答预览】(前800字)');
    console.log('─'.repeat(100));
    console.log(grokResult.response.slice(0, 800));
    if (grokResult.response.length > 800) console.log('\n... (更多内容省略)');

    console.log('\n' + '─'.repeat(100));
    console.log('🟢 【DeepSeek V3 回答预览】(前800字)');
    console.log('─'.repeat(100));
    console.log(deepseekResult.response.slice(0, 800));
    if (deepseekResult.response.length > 800) console.log('\n... (更多内容省略)');

    console.log('\n' + '='.repeat(100));
    console.log('  🎉 测试完成!');
    console.log('='.repeat(100) + '\n');
}

main().catch(console.error);
