/**
 * GLM 模型测试脚本
 * 测试智谱AI的各个模型是否可用
 */

import "dotenv/config";

const GLM_API_URL =
  process.env.GLM_API_URL || "https://open.bigmodel.cn/api/paas/v4";
const GLM_API_KEY = process.env.GLM_API_KEY || "";

// 要测试的模型列表
const MODELS_TO_TEST = [
  "glm-4.7", // 你配置的模型
  "glm-4-flash", // 免费模型
  "glm-4-air", // 高性价比
  "glm-4", // 标准版
];

async function testModel(model: string): Promise<void> {
  console.log(`\n🧪 测试模型: ${model}`);
  console.log("-".repeat(40));

  try {
    const response = await fetch(`${GLM_API_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GLM_API_KEY}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: "user", content: "你好，请用一句话介绍自己" }],
        max_tokens: 100,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`❌ 失败 (${response.status}): ${errorText}`);
      return;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "无响应";
    const usage = data.usage;

    console.log(`✅ 成功!`);
    console.log(`📝 回复: ${content.substring(0, 100)}...`);
    if (usage) {
      console.log(
        `📊 Token: prompt=${usage.prompt_tokens}, completion=${usage.completion_tokens}`
      );
    }
  } catch (error: any) {
    console.log(`❌ 错误: ${error.message}`);
  }
}

async function main() {
  console.log("=".repeat(50));
  console.log("🔬 智谱AI GLM 模型测试");
  console.log("=".repeat(50));
  console.log(`API URL: ${GLM_API_URL}`);
  console.log(`API Key: ${GLM_API_KEY.substring(0, 10)}...`);

  for (const model of MODELS_TO_TEST) {
    await testModel(model);
  }

  console.log("\n" + "=".repeat(50));
  console.log("测试完成!");
}

main();
