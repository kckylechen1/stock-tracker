/**
 * GLM 模型详细测试脚本
 * 测试 glm-4.7 和 glm-4.6 的完整回复能力
 */

import "dotenv/config";

const GLM_API_URL =
  process.env.GLM_API_URL || "https://open.bigmodel.cn/api/paas/v4";
const GLM_API_KEY = process.env.GLM_API_KEY || "";

// 要测试的模型列表
const MODELS_TO_TEST = ["glm-4.7", "glm-4.6", "glm-4-flash"];

// 更复杂的测试问题
const TEST_PROMPT = `请分析一下A股市场中，散户投资者常见的三个心理误区，并给出相应的改进建议。
要求：
1. 每个误区要有具体的例子
2. 建议要有可操作性
3. 回答要结构清晰`;

async function testModel(model: string): Promise<void> {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`🧪 测试模型: ${model}`);
  console.log("=".repeat(60));

  const startTime = Date.now();

  try {
    const response = await fetch(`${GLM_API_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GLM_API_KEY}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: "system",
            content: "你是一位专业的A股投资顾问，有丰富的市场分析经验。",
          },
          {
            role: "user",
            content: TEST_PROMPT,
          },
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`❌ 失败 (${response.status})`);
      console.log(`错误信息: ${errorText}`);
      return;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "无响应";
    const usage = data.usage;
    const finishReason = data.choices?.[0]?.finish_reason;

    console.log(`\n✅ 成功! (耗时: ${duration}s)`);
    console.log(
      `📊 Token使用: prompt=${usage?.prompt_tokens}, completion=${usage?.completion_tokens}, total=${usage?.total_tokens}`
    );
    console.log(`🏁 结束原因: ${finishReason}`);
    console.log(`\n📝 完整回复:\n${"-".repeat(60)}`);
    console.log(content);
    console.log("-".repeat(60));
  } catch (error: any) {
    console.log(`❌ 请求错误: ${error.message}`);
  }
}

async function main() {
  console.log("\n" + "🔬".repeat(30));
  console.log("智谱AI GLM 模型详细测试");
  console.log("🔬".repeat(30));
  console.log(`\nAPI URL: ${GLM_API_URL}`);
  console.log(`API Key: ${GLM_API_KEY.substring(0, 15)}...`);
  console.log(`\n📋 测试问题:\n${TEST_PROMPT}`);

  for (const model of MODELS_TO_TEST) {
    await testModel(model);
  }

  console.log("\n" + "✨".repeat(30));
  console.log("所有测试完成!");
  console.log("✨".repeat(30) + "\n");
}

main();
