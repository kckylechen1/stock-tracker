// 正确的 Grok Live Search 测试 - 使用 live_search 类型
// 运行: npx tsx scripts/test-grok-live-search.ts

async function testGrokLiveSearch() {
    const GROK_API_URL = "https://api.x.ai/v1/chat/completions";
    const GROK_API_KEY = process.env.GROK_API_KEY || "";
    const GROK_MODEL = "grok-4-1-fast";

    console.log("🔍 测试 Grok Live Search...\n");

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
                        content: `搜索 X/Twitter 上 @fx_trader_en 和 @Wallstreetcn 最近24小时的推文，找出与财经、股市、外汇相关的重要消息。

用中文回答，格式：
- 账号 | 时间 | 内容 | 市场影响`
                    }
                ],
                // 使用 live_search 类型
                tools: [
                    {
                        type: "live_search"
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
        console.log("✅ Grok Live Search 响应:\n");
        console.log(result.choices?.[0]?.message?.content || JSON.stringify(result, null, 2));

        if (result.choices?.[0]?.message?.tool_calls) {
            console.log("\n📡 Tool Calls:");
            console.log(JSON.stringify(result.choices[0].message.tool_calls, null, 2));
        }

        console.log("\n📊 Token 使用:");
        console.log(`  - Prompt: ${result.usage?.prompt_tokens || 'N/A'}`);
        console.log(`  - Completion: ${result.usage?.completion_tokens || 'N/A'}`);
        console.log(`  - Total: ${result.usage?.total_tokens || 'N/A'}`);

    } catch (error) {
        console.error("❌ 请求失败:", error);
    }
}

testGrokLiveSearch();
