/**
 * 券商研报级别对比测试
 * 使用优化后的详细提示词
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
├─ 均线: MA5=41.20 MA10=40.50 MA20=38.80 MA60=35.20
│  ✅ 多头排列，站上所有均线
├─ MACD: DIF=1.25 DEA=0.98 红柱放大
├─ RSI: 14日=65.2 (偏强，接近超买)
├─ KDJ: K=72 D=65 J=86 金叉向上
├─ 布林带: 上轨45.50 中轨40.20 下轨34.90，股价在中轨上方
└─ "没走弱"得分: 4/5

📈 K线形态
├─ 日K: 近5日连阳，放量突破前高
├─ 周K: 周线收阳，MACD即将金叉
├─ 形态: 疑似上升旗形，突破后目标位48元
└─ 支撑阻力: 支撑41.20/40.50/38.80，阻力44.00/45.50/48.00

💰 资金面分析
├─ 今日主力净流入: +1.8亿
├─ 超大单: +1.2亿
├─ 大单: +0.6亿
├─ 5日主力净流入: +3.5亿（持续流入）
├─ 5日换手: 22.5%（活跃）
├─ 龙虎榜: 1月8日机构买入8000万
└─ 资金趋势: 📈 连续3日流入，加速态势

📈 股吧人气分析
├─ 当前排名: 第15名 / 5000只
├─ 排名变化: ↑8（快速上升）
├─ 情绪等级: 🔥 过热（前20）
└─ 信号: ⭐ 人气快速上升，有资金关注

🌐 大盘环境
├─ 上证: 3150点 +0.25%
├─ 深证: 10200点 +0.42%
├─ 创业板: 2050点 +0.68%
├─ AI概念指数: +2.3% 板块领涨
└─ 恐慌贪婪指数: 62（偏贪婪）

📰 最新消息
├─ 1月9日: 公司发布AI大模型2.0版本，性能提升40%
├─ 1月8日: 获得国家AI创新应用试点资格
└─ 估值: PE(TTM)=45倍，行业平均38倍，PEG=1.2

🛡️ 止损位
├─ 激进(MA5): 41.20元 (-3%)
├─ 稳健(MA10): 40.50元 (-4.7%)
└─ 保守(MA20): 38.80元 (-8.7%)`;

// 交易记忆
const TRADING_MEMORY = `【用户交易记忆】

📋 历史教训:
1. 2026-01-08 蓝思科技: 在RSI超卖区(RSI<30)恐慌清仓，错过第二天反弹10%
   - 避免: 在超卖区恐慌清仓
   - 建议: 等待RSI回升至40以上，或分批减仓

2. 通用教训: 追高买入导致被套3次

👤 用户画像:
- 风险偏好: 中等
- 持股周期: 短线（3-10天）
- 需避免: RSI<30时清仓、追高买入
- 成功模式: 分批减仓、设置trailing stop`;

const USER_QUESTION = "昆仑万维今天涨了3%，我没有持仓，现在可以买入吗？请给我详细的分析报告。";

const SYSTEM_PROMPT = `你是一个专业股票交易顾问，输出必须严格遵循以下结构，且总字数不少于800字：

1. **综合结论**（100字+）：明确给出买入/持有/减仓/卖出建议，并说明核心理由。

2. **基本面分析**（150字+）：行业地位、最新消息、估值（PE/PB/PEG）、成长性、风险点。必须引用实时数据/新闻。

3. **技术面分析**（200字+）： 
   - 日K/周K走势描述
   - 均线排列、MACD/KDJ/RSI/布林状态
   - 支撑阻力位（至少3个具体价位）
   - 形态判断（旗形/头肩/双底等）

4. **资金面分析**（150字+）：主力/超大单流向（近5日趋势）、龙虎榜异动、股东变化。

5. **大盘与情绪面**（100字+）：指数走势、板块热度、恐慌贪婪指数、潜在催化/风险。

6. **操作建议**（150字+）： 
   - 具体仓位调整（分批买/卖比例）
   - 止损/止盈位（至少2套方案：激进/保守）
   - 持仓用户专属建议（考虑浮亏/浮盈情绪）
   - 替代标的推荐（如果不看好）

7. **风险提示**（100字+）：至少列出3条具体风险。

禁止简短输出。必须用自己的话深度分析，禁止直接复制工具数据。像券商研报一样专业、详尽。
当前日期：2026-01-10。

【用户历史教训】
${TRADING_MEMORY}

【股票分析数据】
${TOOL_DATA}`;

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
            max_tokens: 4000,
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
            max_tokens: 4000,
            temperature: 0.7,
        }),
    });

    const data = await response.json();
    const elapsed = (Date.now() - startTime) / 1000;
    const content = data.choices?.[0]?.message?.content || "无响应";

    return { content, elapsed };
}

function countWords(text: string): number {
    return text.length;
}

async function main() {
    console.log("\n" + "📊".repeat(20));
    console.log("   券商研报级别对比测试");
    console.log("   股票: 昆仑万维(300418)");
    console.log("   要求: 800字以上详细分析");
    console.log("📊".repeat(20));

    // 测试 Grok
    console.log("\n" + "=".repeat(80));
    console.log("🧠 Grok (grok-4-1-fast-reasoning)");
    console.log("=".repeat(80));

    const grok = await testGrok();
    console.log(`⏱️ 耗时: ${grok.elapsed.toFixed(1)}s | 字数: ${countWords(grok.content)}\n`);
    console.log(grok.content);

    // 测试 V3
    console.log("\n" + "=".repeat(80));
    console.log("🤖 DeepSeek V3");
    console.log("=".repeat(80));

    const v3 = await testV3();
    console.log(`⏱️ 耗时: ${v3.elapsed.toFixed(1)}s | 字数: ${countWords(v3.content)}\n`);
    console.log(v3.content);

    // 总结
    console.log("\n" + "=".repeat(80));
    console.log("📊 对比总结");
    console.log("=".repeat(80));
    console.log(`
指标          | Grok                | DeepSeek V3
--------------|---------------------|--------------------
耗时          | ${grok.elapsed.toFixed(1)}s                | ${v3.elapsed.toFixed(1)}s
字数          | ${countWords(grok.content)}              | ${countWords(v3.content)}
    `);
}

main();
