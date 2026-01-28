// 测试 Grok API 是否能获取 X/Twitter 推文
// 运行: npx tsx scripts/test-grok-twitter.ts

async function testGrokTwitterAccess() {
    const GROK_API_URL = "https://api.x.ai/v1/chat/completions";
    const GROK_API_KEY = process.env.GROK_API_KEY || "";
    const GROK_MODEL = "grok-3-latest";

    console.log("🔍 测试 Grok API 获取 X/Twitter 推文...\n");

    const prompt = `请搜索 X/Twitter 上 "外汇交易员" 或 "@FXTrader" 或类似财经博主的最新推文。

我想知道：
1. 他们最近1小时内发布了什么重要财经新闻？
2. 有没有关于 A股、美股、外汇的突发消息？

请用中文回复，格式：
- 账号名 | 时间 | 内容摘要 | 市场影响(利多/利空/中性)

如果你无法访问 X/Twitter 实时数据，请明确告诉我。`;

    try {
        const response = await fetch(GROK_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${GROK_API_KEY}`
            },
            body: JSON.stringify({
                model: GROK_MODEL,
                messages: [
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                max_tokens: 2000
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ API 错误: ${response.status} ${response.statusText}`);
            console.error(errorText);
            return;
        }

        const result = await response.json();
        console.log("✅ Grok API 响应:\n");
        console.log(result.choices?.[0]?.message?.content || JSON.stringify(result, null, 2));

        console.log("\n📊 Token 使用:");
        console.log(`  - Prompt: ${result.usage?.prompt_tokens || 'N/A'}`);
        console.log(`  - Completion: ${result.usage?.completion_tokens || 'N/A'}`);
        console.log(`  - Total: ${result.usage?.total_tokens || 'N/A'}`);

    } catch (error) {
        console.error("❌ 请求失败:", error);
    }
}

testGrokTwitterAccess();
