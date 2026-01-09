/**
 * Grok vs DeepSeek V3 对比测试
 * 分析昆仑万维(300418)
 * 包含交易记忆
 */

const GROK_API_URL = "https://api.x.ai/v1/chat/completions";
const GROK_API_KEY = "xai-0rp662eJtQaxf819Zt27m4cyp8qScrKdNulVo5XCeC0tCnH7M5DegKtiI2Ee06XAjTaaZbfNhYiEWHdt";
const GROK_MODEL = "grok-4-1-fast-reasoning";

const V3_API_URL = "https://api.siliconflow.cn/v1/chat/completions";
const V3_API_KEY = "sk-ucmeiodrdhubymxanffmxjyrgyyvnfrffeerejhgpzokawhl";
const V3_MODEL = "deepseek-ai/DeepSeek-V3";

// 模拟的工具返回数据（昆仑万维）
const TOOL_DATA = `【2026-01-10】昆仑万维(300418) 综合分析报告

📊 技术面分析
├─ 价格: 42.50元 (+3.15%)
├─ 均线: MA5=41.20 MA10=40.50 MA20=38.80
│  ✅ 多头排列，站上所有均线
├─ MACD: 🟢 红柱放大
├─ RSI: 65.2 (偏强，接近超买)
├─ KDJ: K=72 D=65 J=86 金叉向上
└─ "没走弱"得分: 4/5

💰 资金面分析
├─ 主力净流入: +1.8亿
├─ 超大单: +1.2亿
├─ 大单: +0.6亿
├─ 5日换手: 22.5%（活跃）
└─ 资金趋势: 📈 连续2日流入

📈 股吧人气分析
├─ 当前排名: 第15名 / 5000只
├─ 排名变化: ↑8（快速上升）
├─ 情绪等级: 🔥 过热（前20）
└─ 信号: ⭐ 人气快速上升，有资金关注

🌐 大盘环境
├─ 上证: +0.25%
├─ 深证: +0.42%
├─ 创业板: +0.68%
└─ 整体偏强，AI概念活跃

🛡️ 止损位
├─ 激进(MA5): 41.20元
├─ 稳健(MA10): 40.50元
└─ 保守(MA20): 38.80元`;

// 交易记忆
const TRADING_MEMORY = `【用户交易记忆】

📋 历史教训:
1. 2026-01-08 蓝思科技: 在RSI超卖区(RSI<30)恐慌清仓，错过第二天反弹10%
   - 避免: 在超卖区恐慌清仓
   - 建议: 等待RSI回升至40以上，或分批减仓

2. 通用教训: 资金票不需要看基本面PE/PB，关注资金流向和市场情绪

👤 用户画像:
- 风险偏好: 中等
- 持股周期: 短线
- 需避免: RSI<30时清仓、追高买入
- 成功模式: 分批减仓、设置trailing stop`;

const USER_QUESTION = "昆仑万维今天涨了3%，我没有持仓，现在可以买入吗？";

const SYSTEM_PROMPT = `你是"小A"，一个A股短线操盘手AI。性格：果断、直接、不废话。

【当前时间】2026年1月10日 星期五 00:30

【重要：用户历史教训】
${TRADING_MEMORY}

【你的风格】
- 直接给结论：买入/卖出/观望
- 不说"仅供参考"废话
- 用数据说话，给具体点位
- 风险大就直接说"别碰"
- 结合用户历史教训给建议

【股票分析数据】
${TOOL_DATA}

【回答格式】
1. **结论**（一句话）
2. **理由**（3点以内，结合用户历史教训）
3. **操作建议**（具体点位和仓位）`;

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

async function testV3(): Promise<{ content: string; elapsed: number }> {
    const startTime = Date.now();

    const response = await fetch(V3_API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${V3_API_KEY}`,
        },
        body: JSON.stringify({
            model: V3_MODEL,
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
    console.log("   Grok vs DeepSeek V3 对比测试");
    console.log("   股票: 昆仑万维(300418)");
    console.log("   问题: " + USER_QUESTION);
    console.log("🆚".repeat(20));

    // 测试 Grok
    console.log("\n" + "=".repeat(60));
    console.log("🧠 Grok (grok-4-1-fast-reasoning)");
    console.log("=".repeat(60));

    const grok = await testGrok();
    console.log(`⏱️ 耗时: ${grok.elapsed.toFixed(1)}s\n`);
    console.log(grok.content);

    // 测试 V3
    console.log("\n" + "=".repeat(60));
    console.log("🤖 DeepSeek V3");
    console.log("=".repeat(60));

    const v3 = await testV3();
    console.log(`⏱️ 耗时: ${v3.elapsed.toFixed(1)}s\n`);
    console.log(v3.content);

    // 总结
    console.log("\n" + "=".repeat(60));
    console.log("📊 对比总结");
    console.log("=".repeat(60));
    console.log(`
指标          | Grok          | DeepSeek V3
--------------|---------------|---------------
耗时          | ${grok.elapsed.toFixed(1)}s          | ${v3.elapsed.toFixed(1)}s
    `);
    console.log("请评判哪个回答更实用！");
}

main();
