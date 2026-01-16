/**
 * 模型对比测试脚本
 * 对比 DeepSeek V3 和 Qwen 的回答质量
 */

const API_URL = "https://api.siliconflow.cn/v1/chat/completions";
const API_KEY = "sk-ucmeiodrdhubymxanffmxjyrgyyvnfrffeerejhgpzokawhl";

// 测试问题
const TEST_QUESTION = `用户问：新易盛今天跌了，早上有什么信号吗？我应该止损还是持有？

以下是工具返回的数据：
【2026-01-09】新易盛(300502) 技术分析报告

📊 核心指标
├─ 价格: 398.22元 (-2.95%)
├─ 均线: MA5=414.61 MA10=428.77 MA20=380.00
│  ❌ 非多头排列
├─ MACD: 🔴 绿柱
├─ RSI: 37.7 (正常)
└─ 量比: 1.20 (正常)

📋 "没走弱"判定（得分: 2/5）
├─ ❌ 收盘价跌破MA5
├─ ❌ 收盘价跌破MA10  
├─ ❌ MACD绿柱
├─ ✅ RSI在30以上
├─ ✅ 成交量正常

🛡️ 止损位
├─ 激进(MA5): 414.61元
├─ 稳健(MA10): 428.77元
└─ 保守(MA20): 380.00元

🎯 综合结论
⚠️ 谨慎观望。得分2/5，技术面走弱但未破位。建议减仓或观望，等待明确信号。

【5分钟形态分析】早盘(9:30-11:30)
├─ 走势: 下跌 (开410.00 → 收395.00)
├─ 信号: ❌ 无明确进场信号
└─ 结论: 早盘均线粘合但未向上发散，10:45后放量下跌，不宜追

请根据以上数据，给出专业的分析建议。`;

const SYSTEM_PROMPT = `你是"小A"，一个专业的A股分析师AI助手。

今天是2026年1月9日星期四。

你必须：
1. 用自己的话重新组织工具返回的数据
2. 给出具体的操作建议（止损/持有/加仓）
3. 解释为什么这么建议
4. 不要说废话套话`;

// 测试模型
const MODELS = ["deepseek-ai/DeepSeek-V3", "Qwen/Qwen2.5-72B-Instruct"];

async function testModel(model: string): Promise<string> {
  const startTime = Date.now();

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: TEST_QUESTION },
      ],
      max_tokens: 2000,
      temperature: 0.7,
    }),
  });

  const data = await response.json();
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  if (data.error) {
    return `❌ 错误: ${data.error.message}`;
  }

  const content = data.choices?.[0]?.message?.content || "无内容";
  return `⏱️ 耗时: ${elapsed}s\n\n${content}`;
}

async function main() {
  console.log("=".repeat(60));
  console.log("🔬 模型对比测试");
  console.log("=".repeat(60));
  console.log("\n📝 测试问题摘要:");
  console.log("用户今天买了新易盛亏了，问早上有没有信号，应该止损还是持有？\n");

  for (const model of MODELS) {
    console.log("\n" + "─".repeat(60));
    console.log(`🤖 模型: ${model}`);
    console.log("─".repeat(60));

    try {
      const result = await testModel(model);
      console.log(result);
    } catch (error: any) {
      console.log(`❌ 请求失败: ${error.message}`);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("📊 对比完成，请评判哪个回答更好！");
  console.log("=".repeat(60));
}

main();
