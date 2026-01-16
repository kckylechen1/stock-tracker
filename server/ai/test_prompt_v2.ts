/**
 * Prompt Engineering V2 测试脚本
 * 对比新旧 Prompt 的效果
 */

import { ENV } from "../_core/env";
import { stockTools } from "../_core/stockTools";
import {
  buildGrokSystemPrompt,
  preprocessUserMessage,
  GROK_CONFIG,
} from "../_core/prompts/grokPrompt";

const STOCK_CODE = "300308";
const STOCK_NAME = "中际旭创";

// 测试用例
const TEST_CASES = [
  {
    name: "日期测试",
    question: "今天是几号？",
    expected: "应该正确返回当前日期",
  },
  {
    name: "走势分析",
    question: "这只股票走势怎么样？",
    expected: "应该调用工具并给出详细分析",
  },
  {
    name: "涨停池测试",
    question: "今天涨停的有哪些？",
    expected: "应该调用 get_zt_pool 工具",
  },
];

async function callGrokAPI(
  systemPrompt: string,
  userMessage: string,
  useTools: boolean = true
) {
  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage },
  ];

  const payload: any = {
    model: GROK_CONFIG.model,
    messages,
    temperature: GROK_CONFIG.temperature,
    top_p: GROK_CONFIG.top_p,
    max_tokens: GROK_CONFIG.max_tokens,
    stream: false,
  };

  if (useTools) {
    payload.tools = stockTools;
    payload.tool_choice = "auto";
  }

  const response = await fetch(`${ENV.grokApiUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ENV.grokApiKey}`,
    },
    body: JSON.stringify(payload),
  });

  return await response.json();
}

async function runTest() {
  console.log("=".repeat(80));
  console.log("🧪 Prompt Engineering V2 测试");
  console.log("=".repeat(80));
  console.log(`股票: ${STOCK_NAME} (${STOCK_CODE})`);
  console.log(`模型: ${GROK_CONFIG.model}`);
  console.log(`温度: ${GROK_CONFIG.temperature}`);
  console.log(`时间: ${new Date().toLocaleString("zh-CN")}`);
  console.log("=".repeat(80));

  // 构建新版 Prompt
  const newPrompt = buildGrokSystemPrompt({
    stockCode: STOCK_CODE,
    stockName: STOCK_NAME,
  });

  console.log("\n📝 新版 System Prompt 长度:", newPrompt.length, "字符");
  console.log("\n" + "─".repeat(80));

  for (const testCase of TEST_CASES) {
    console.log(`\n🔬 测试: ${testCase.name}`);
    console.log(`   问题: ${testCase.question}`);
    console.log(`   预期: ${testCase.expected}`);
    console.log("");

    try {
      // 使用新版 preprocessUserMessage 注入时间
      const processedMessage = preprocessUserMessage(testCase.question);
      console.log("   处理后消息:", processedMessage.split("\n")[0]);

      const startTime = Date.now();
      const result = await callGrokAPI(newPrompt, processedMessage);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

      const choice = result.choices?.[0];
      const message = choice?.message;
      const toolCalls = message?.tool_calls || [];
      const content = message?.content || "";

      console.log(`\n   ⏱️  耗时: ${elapsed}s`);
      console.log(
        `   🔧 工具调用: ${toolCalls.length > 0 ? toolCalls.map((t: any) => t.function?.name).join(", ") : "无"}`
      );

      if (content) {
        // 截取前500字符
        const preview =
          content.length > 500 ? content.substring(0, 500) + "..." : content;
        console.log(`   📝 回答长度: ${content.length} 字符`);
        console.log(
          `   📄 预览:\n${preview
            .split("\n")
            .map((l: string) => "      " + l)
            .join("\n")}`
        );
      }

      // 检查是否符合预期
      if (testCase.name === "日期测试") {
        const today = new Date();
        const dateStr = `${today.getMonth() + 1}月${today.getDate()}`;
        if (content.includes(dateStr) || content.includes("2026")) {
          console.log("\n   ✅ 日期正确!");
        } else {
          console.log("\n   ⚠️ 日期可能不正确，请检查");
        }
      } else if (testCase.name === "涨停池测试") {
        if (toolCalls.some((t: any) => t.function?.name === "get_zt_pool")) {
          console.log("\n   ✅ 正确调用了 get_zt_pool!");
        } else {
          console.log("\n   ⚠️ 未调用 get_zt_pool");
        }
      } else if (testCase.name === "走势分析") {
        if (toolCalls.length >= 1) {
          console.log(`\n   ✅ 调用了 ${toolCalls.length} 个工具!`);
        } else {
          console.log("\n   ⚠️ 未调用任何工具");
        }
        if (content.length >= 500) {
          console.log(`   ✅ 回答详细 (${content.length} 字符)`);
        } else if (content.length > 0) {
          console.log(`   ⚠️ 回答较短 (${content.length} 字符)`);
        }
      }
    } catch (error: any) {
      console.log(`   ❌ 错误: ${error.message}`);
    }

    console.log("\n" + "─".repeat(80));
  }

  console.log("\n🎉 测试完成!");
}

// 运行测试
runTest().catch(console.error);
