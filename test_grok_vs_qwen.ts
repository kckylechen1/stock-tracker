/**
 * Grok vs Qwen3 对比测试
 * 同样的问题，看两个模型的回答质量
 */

const GROK_API_URL = "https://api.x.ai/v1/chat/completions";
const GROK_API_KEY = "xai-0rp662eJtQaxf819Zt27m4cyp8qScrKdNulVo5XCeC0tCnH7M5DegKtiI2Ee06XAjTaaZbfNhYiEWHdt";
const GROK_MODEL = "grok-4-1-fast-reasoning";

const QWEN_API_URL = "https://api.siliconflow.cn/v1/chat/completions";
const QWEN_API_KEY = "sk-ucmeiodrdhubymxanffmxjyrgyyvnfrffeerejhgpzokawhl";
const QWEN_MODEL = "Qwen/Qwen3-235B-A22B";

// 模拟的工具返回数据（中际旭创）
const TOOL_DATA = `【2026-01-10】中际旭创(300308) 综合分析报告

📊 技术面分析
├─ 价格: 583.20元 (-2.06%)
├─ 均线: MA5=595.00 MA10=610.00 MA20=580.00
│  ⚠️ 跌破MA5和MA10，MA20支撑
├─ MACD: 🔴 绿柱扩大
├─ RSI: 42.5 (偏弱)
├─ KDJ: K=35 D=45 J=15 死叉
└─ "没走弱"得分: 2/5

💰 资金面分析
├─ 主力净流入: -2.3亿
├─ 超大单: -1.8亿
├─ 大单: -0.5亿
├─ 5日换手: 18.5%
└─ 资金趋势: 📉 连续3日流出

📈 股吧人气分析
├─ 当前排名: 第8名 / 5000只
├─ 排名变化: ↓3
├─ 情绪等级: 🔥 过热（前20）
└─ 信号: ⚠️ 警惕情绪见顶

🌐 大盘环境
├─ 上证: -0.35%
├─ 深证: -0.52%
├─ 创业板: -0.68%
└─ 整体偏弱

🛡️ 止损位
├─ 激进(MA5): 595.00元
├─ 稳健(MA10): 610.00元
└─ 保守(MA20): 580.00元`;

const USER_QUESTION = "中际旭创今天跌了，我买入后亏了，应该止损还是持有？";

const SYSTEM_PROMPT = `你是"小A"，一个A股短线操盘手AI。性格：果断、直接、不废话。

【当前时间】2026年1月10日 星期五 00:10

【你的风格】
- 直接给结论：买入/卖出/观望
- 不说"仅供参考"废话
- 用数据说话，给具体点位
- 风险大就直接说"别碰"

【股票分析数据】
${TOOL_DATA}

【回答格式】
1. **结论**（一句话）
2. **理由**（3点以内）
3. **操作建议**（具体点位）`;

async function testGrok(): Promise<{ content: string; elapsed: number }> {
    const startTime = Date.now();

    const response = await fetch(GROK_API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${GROK_API_KEY}`,
        },
        body: JSON.stringify({
            model: GROK_MODEL,
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: USER_QUESTION }
            ],
            max_tokens: 2000,
            temperature: 0.7,
        }),
    });

    const data = await response.json();
    const elapsed = (Date.now() - startTime) / 1000;
    const content = data.choices?.[0]?.message?.content || "无响应";

    return { content, elapsed };
}

async function testQwen(): Promise<{ content: string; elapsed: number }> {
    const startTime = Date.now();

    const response = await fetch(QWEN_API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${QWEN_API_KEY}`,
        },
        body: JSON.stringify({
            model: QWEN_MODEL,
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: USER_QUESTION }
            ],
            max_tokens: 2000,
            temperature: 0.7,
        }),
    });

    const data = await response.json();
    const elapsed = (Date.now() - startTime) / 1000;
    const content = data.choices?.[0]?.message?.content || "无响应";

    return { content, elapsed };
}

async function main() {
    console.log("\n" + "🆚".repeat(20));
    console.log("   Grok vs Qwen3 对比测试");
    console.log("   问题: " + USER_QUESTION);
    console.log("🆚".repeat(20));

    // 测试 Grok
    console.log("\n" + "=".repeat(60));
    console.log("🧠 Grok (grok-4-1-fast-reasoning)");
    console.log("=".repeat(60));

    const grok = await testGrok();
    console.log(`⏱️ 耗时: ${grok.elapsed.toFixed(1)}s\n`);
    console.log(grok.content);

    // 测试 Qwen3
    console.log("\n" + "=".repeat(60));
    console.log("🤖 Qwen3 (Qwen3-235B-A22B)");
    console.log("=".repeat(60));

    const qwen = await testQwen();
    console.log(`⏱️ 耗时: ${qwen.elapsed.toFixed(1)}s\n`);
    console.log(qwen.content);

    // 总结
    console.log("\n" + "=".repeat(60));
    console.log("📊 对比总结");
    console.log("=".repeat(60));
    console.log(`Grok 耗时: ${grok.elapsed.toFixed(1)}s`);
    console.log(`Qwen3 耗时: ${qwen.elapsed.toFixed(1)}s`);
    console.log("\n请评判哪个回答更直接、更有用！");
}

main();
