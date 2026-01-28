// 正确的 Grok X Search 测试 - 使用 tools 参数
// 运行: npx tsx scripts/test-grok-x-search.ts

async function testGrokXSearch() {
    const GROK_API_URL = "https://api.x.ai/v1/chat/completions";
    const GROK_API_KEY = process.env.GROK_API_KEY || "";
    // 使用专门针对 agentic search 优化的模型
    const GROK_MODEL = "grok-4-1-fast";

    console.log("🔍 测试 Grok X Search (使用 tools 参数)...\n");

    // 要监控的推特账号
    const watchedAccounts = ["fx_trader_en", "Wallstreetcn", "CIKIBLAZE"];

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
                        content: `请搜索以下 X/Twitter 账号的最新推文，找出最近24小时内与财经、股市、外汇相关的重要消息：
账号列表：${watchedAccounts.join(", ")}

返回格式：
- 账号 | 时间 | 内容摘要 | 市场影响(利多/利空/中性)`
                    }
                ],
                // 关键：启用 x_search 工具
                tools: [
                    {
                        type: "x_search",
                        x_search: {
                            allowed_x_handles: watchedAccounts,
                            // from_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 过去24小时
                        }
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
        console.log("✅ Grok X Search 响应:\n");
        console.log(result.choices?.[0]?.message?.content || JSON.stringify(result, null, 2));

        // 检查是否有 tool_calls
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

testGrokXSearch();
