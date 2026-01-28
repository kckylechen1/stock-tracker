// Grok X Search 完整测试 - 处理 tool_calls 循环
// 运行: npx tsx scripts/test-grok-x-search-complete.ts

const GROK_API_URL = "https://api.x.ai/v1/chat/completions";
const GROK_API_KEY = process.env.GROK_API_KEY || "";

interface Message {
    role: string;
    content: string | null;
    tool_calls?: any[];
    tool_call_id?: string;
}

async function callGrokAPI(messages: Message[], tools?: any[]) {
    const body: any = {
        model: "grok-4-1-fast",
        messages,
        max_tokens: 4000
    };

    if (tools) {
        body.tools = tools;
    }

    const response = await fetch(GROK_API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${GROK_API_KEY}`
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${await response.text()}`);
    }

    return response.json();
}

async function testXSearch() {
    console.log("🔍 测试 Grok X Search（完整流程）...\n");

    // 要监控的账号
    const watchAccounts = ["Wallstreetcn"];

    const tools = [
        {
            type: "function",
            function: {
                name: "x_search",
                parameters: {
                    allowed_x_handles: watchAccounts
                }
            }
        }
    ];

    const messages: Message[] = [
        {
            role: "user",
            content: `搜索 X/Twitter 上 @${watchAccounts.join(", @")} 最近的推文，找出财经、股市相关的重要消息。用中文回答。`
        }
    ];

    let maxIterations = 5;

    while (maxIterations > 0) {
        console.log(`\n--- 迭代 ${6 - maxIterations} ---`);

        const result = await callGrokAPI(messages, maxIterations === 5 ? tools : undefined);
        const choice = result.choices[0];
        const assistantMessage = choice.message;

        console.log("finish_reason:", choice.finish_reason);

        // 如果有内容，打印
        if (assistantMessage.content) {
            console.log("\n✅ Grok 回复:\n");
            console.log(assistantMessage.content);
        }

        // 如果完成了，退出循环
        if (choice.finish_reason === "stop") {
            console.log("\n📊 Token 使用:", result.usage);
            break;
        }

        // 如果有 tool_calls，处理它们
        if (choice.finish_reason === "tool_calls" && assistantMessage.tool_calls) {
            console.log("📡 Tool Calls:", JSON.stringify(assistantMessage.tool_calls, null, 2));

            // 添加助手消息到历史
            messages.push({
                role: "assistant",
                content: assistantMessage.content,
                tool_calls: assistantMessage.tool_calls
            });

            // xAI 的 x_search 是服务端执行的，我们只需要继续请求
            // 模拟 tool 响应（对于 xAI 服务端 tool，可能不需要这步）
            for (const toolCall of assistantMessage.tool_calls) {
                messages.push({
                    role: "tool",
                    tool_call_id: toolCall.id,
                    content: "Tool executed by xAI server"
                });
            }
        }

        maxIterations--;
    }

    console.log("\n✅ 测试完成！");
}

testXSearch().catch(e => console.error("❌ 错误:", e.message));
