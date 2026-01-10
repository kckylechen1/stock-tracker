/**
 * Prompt Engineering 对比测试
 * 
 * 运行方式: npx tsx server/ai/test_prompt_comparison.ts
 * 
 * 测试 Grok 4 的新旧 Prompt 对比
 */

import { ENV } from '../_core/env';
import { stockTools, executeStockTool } from '../_core/stockTools';

// ==================== 新版 Prompt (V2) ====================

function buildGrokPromptV2(context: {
    stockCode?: string;
    stockName?: string;
    dateStr: string;
    timeStr: string;
}): string {
    const { stockCode, stockName, dateStr, timeStr } = context;

    return `# 角色
你是「小A」，一位经验丰富的A股短线交易分析师。你的分析风格：
- 🎯 **果断直接**：先给结论，再讲理由
- 📊 **数据驱动**：每个观点都有数据支撑
- 💡 **实战导向**：给出具体点位和操作建议
- ⚠️ **风险意识**：明确止损位和风险提示

# 你的工具

你可以调用以下工具获取实时数据：

| 工具 | 用途 | 何时调用 |
|------|------|----------|
| \`comprehensive_analysis\` | 综合分析（技术+资金+大盘） | 用户问"走势/分析/能买卖吗"时 **必须调用** |
| \`get_fund_flow_history\` | 历史资金流向 | 判断主力资金趋势 |
| \`analyze_minute_patterns\` | 5分钟K线形态 | 寻找买点/卖点 |
| \`get_guba_hot_rank\` | 股吧人气排名 | 判断市场关注度 |
| \`get_trading_memory\` | 用户交易记忆 | 了解用户持仓和历史教训 |

# 核心规则

## 规则1: 分析问题 → 必须先调用工具
当用户问"走势怎么样"、"能买吗"、"分析一下"时：
1. **先调用** \`comprehensive_analysis\` 获取数据
2. 基于数据生成分析报告

## 规则2: 回答要长、要深入
不要敷衍！一个完整的分析应该包括：
- 技术面判断（均线、MACD、RSI 等指标的**含义解读**）
- 资金面判断（主力是在吸筹还是出货？）
- 大盘环境（大盘配合吗？）
- 操作建议（具体点位 + 仓位建议）
- 风险提示（止损位 + 可能的风险）

## 规则3: 禁止的行为
❌ 不要原封不动复制工具返回的数据
❌ 不要说"仅供参考"、"建议结合自身情况"等废话
❌ 不要只罗列数据不解读
❌ 不要给模糊的建议（如"可以关注"）

${stockCode ? `
# 当前上下文

📌 **当前股票**: ${stockName || stockCode} (${stockCode})
` : ''}

# 回答格式模板

\`\`\`
## 📊 核心结论
【一句话给出明确判断：买入/卖出/持有/观望】

## 📈 技术面分析
### 趋势判断
- 短期趋势：...
- 中期趋势：...

### 技术指标解读
- MACD：...（说明这意味着什么）
- RSI：...（是否超买/超卖）

### 支撑与压力
- 支撑位：XX.XX元
- 压力位：XX.XX元

## 💰 资金面分析
- 主力动向：...
- 资金信号：...

## 🌍 大盘环境
- 大盘状态：...

## 🎯 操作建议
### 对于已持仓者
- 止损位：XX.XX元
- 止盈位：XX.XX元

### 对于未持仓者
- 入场点位：XX.XX元
- 仓位建议：...

## ⚠️ 风险提示
1. ...
2. ...
\`\`\``;
}

// 用户消息预处理：注入时间
function preprocessUserMessageV2(message: string): string {
    const now = new Date();
    const dateStr = now.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
    });
    const timeStr = now.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit'
    });

    // 将时间放在用户消息最前面
    return `【当前时间：${dateStr} ${timeStr}】

${message}`;
}

// ==================== 旧版 Prompt (V1 - 当前版本) ====================

function buildGrokPromptV1(dateStr: string): string {
    return `你是"小A"，一个A股短线操盘手AI。性格：果断、直接、不废话。

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
}

// ==================== 测试函数 ====================

interface ChatMessage {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string;
    tool_calls?: any[];
    tool_call_id?: string;
}

async function testWithPrompt(
    promptVersion: 'V1' | 'V2',
    userMessage: string,
    stockCode: string
): Promise<{ response: string; toolsCalled: string[]; timeMs: number }> {

    const now = new Date();
    const dateStr = now.toLocaleDateString('zh-CN', {
        year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
        hour: '2-digit', minute: '2-digit'
    });
    const timeStr = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

    // 选择 Prompt 版本
    let systemPrompt: string;
    let processedUserMessage: string;

    if (promptVersion === 'V2') {
        systemPrompt = buildGrokPromptV2({
            stockCode,
            stockName: undefined,
            dateStr,
            timeStr
        });
        processedUserMessage = preprocessUserMessageV2(userMessage);
    } else {
        systemPrompt = buildGrokPromptV1(dateStr);
        processedUserMessage = userMessage + ` [股票代码: ${stockCode}]`;
    }

    let messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: processedUserMessage }
    ];

    const toolsCalled: string[] = [];
    const startTime = Date.now();
    let iteration = 0;
    const maxIterations = 5;

    while (iteration < maxIterations) {
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
                tools: stockTools,
                tool_choice: "auto",
                max_tokens: 4096,
                temperature: promptVersion === 'V2' ? 0.85 : 0.7, // V2 用更高温度
            }),
        });

        const data = await response.json();
        const assistantMessage = data.choices?.[0]?.message;

        if (!assistantMessage) {
            return { response: "无响应", toolsCalled, timeMs: Date.now() - startTime };
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
                const toolArgs = JSON.parse(toolCall.function.arguments);
                toolsCalled.push(`${toolName}(${JSON.stringify(toolArgs)})`);

                console.log(`  [${promptVersion}] 调用工具: ${toolName}`);

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

    return { response: "达到最大迭代次数", toolsCalled, timeMs: Date.now() - startTime };
}

// ==================== 主测试 ====================

async function main() {
    console.log("\n" + "=".repeat(80));
    console.log("  🧪 Prompt Engineering 对比测试");
    console.log("  V1 (旧版) vs V2 (新版)");
    console.log("=".repeat(80));

    const testCases = [
        { message: "中际旭创走势怎么样？", stockCode: "300308" },
        // { message: "今天是几号？大盘怎么样？", stockCode: "" },
        // { message: "蓝思科技能买吗？", stockCode: "300433" },
    ];

    for (const test of testCases) {
        console.log("\n" + "─".repeat(80));
        console.log(`📝 测试问题: "${test.message}"`);
        console.log(`📌 股票代码: ${test.stockCode || '无'}`);
        console.log("─".repeat(80));

        // 测试 V1
        console.log("\n🔵 【V1 旧版 Prompt】");
        console.log("  温度: 0.7");
        console.log("  特点: 简短提示词，委托 Qwen 调用工具");
        console.log("  正在测试...");

        try {
            const v1Result = await testWithPrompt('V1', test.message, test.stockCode);
            console.log(`  ⏱️ 耗时: ${(v1Result.timeMs / 1000).toFixed(1)}s`);
            console.log(`  🔧 调用的工具: ${v1Result.toolsCalled.length > 0 ? v1Result.toolsCalled.join(', ') : '❌ 无'}`);
            console.log(`  📄 回答长度: ${v1Result.response.length} 字符`);
            console.log("\n  回答预览 (前500字):");
            console.log("  " + "-".repeat(60));
            console.log(v1Result.response.slice(0, 500).split('\n').map(l => '  ' + l).join('\n'));
            if (v1Result.response.length > 500) console.log("  ...(更多内容省略)");
        } catch (error: any) {
            console.log(`  ❌ 错误: ${error.message}`);
        }

        // 测试 V2
        console.log("\n🟢 【V2 新版 Prompt】");
        console.log("  温度: 0.85 (更高，回答更丰富)");
        console.log("  特点: 结构化提示词，直接调用工具，时间注入在用户消息");
        console.log("  正在测试...");

        try {
            const v2Result = await testWithPrompt('V2', test.message, test.stockCode);
            console.log(`  ⏱️ 耗时: ${(v2Result.timeMs / 1000).toFixed(1)}s`);
            console.log(`  🔧 调用的工具: ${v2Result.toolsCalled.length > 0 ? v2Result.toolsCalled.join(', ') : '❌ 无'}`);
            console.log(`  📄 回答长度: ${v2Result.response.length} 字符`);
            console.log("\n  回答预览 (前500字):");
            console.log("  " + "-".repeat(60));
            console.log(v2Result.response.slice(0, 500).split('\n').map(l => '  ' + l).join('\n'));
            if (v2Result.response.length > 500) console.log("  ...(更多内容省略)");
        } catch (error: any) {
            console.log(`  ❌ 错误: ${error.message}`);
        }
    }

    console.log("\n" + "=".repeat(80));
    console.log("  测试完成！请对比：");
    console.log("  1. V2 是否更容易调用工具？");
    console.log("  2. V2 的回答是否更长、更详细？");
    console.log("  3. V2 是否正确识别了日期？");
    console.log("=".repeat(80) + "\n");
}

main().catch(console.error);
