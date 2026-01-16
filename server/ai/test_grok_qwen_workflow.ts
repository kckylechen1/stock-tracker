/**
 * 测试 Grok + Qwen3 工作流
 * 模拟分析中际旭创(300308)
 */

const GROK_API_URL = "https://api.x.ai/v1/chat/completions";
const GROK_API_KEY =
  "xai-0rp662eJtQaxf819Zt27m4cyp8qScrKdNulVo5XCeC0tCnH7M5DegKtiI2Ee06XAjTaaZbfNhYiEWHdt";
const GROK_MODEL = "grok-4-1-fast-reasoning";

const QWEN_API_URL = "https://api.siliconflow.cn/v1/chat/completions";
const QWEN_API_KEY = "sk-ucmeiodrdhubymxanffmxjyrgyyvnfrffeerejhgpzokawhl";
const QWEN_MODEL = "Qwen/Qwen3-235B-A22B";

// ==================== Step 1: Qwen3 获取数据 ====================

async function step1_QwenGetData(): Promise<string> {
  console.log("\n" + "=".repeat(60));
  console.log("📊 Step 1: Qwen3 获取中际旭创(300308)分析数据");
  console.log("=".repeat(60));

  const startTime = Date.now();

  const response = await fetch(QWEN_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${QWEN_API_KEY}`,
    },
    body: JSON.stringify({
      model: QWEN_MODEL,
      messages: [
        {
          role: "system",
          content: `你是数据分析助手。请返回中际旭创(300308)的分析数据。
                    
要求返回以下格式（用你的知识估算，如果不确定就说"需要实时查询"）：
- 当前价格和涨跌幅
- 技术面状态（MA、MACD、RSI）
- 资金面状态（主力流向）
- 简要结论

注意：今天是2026年1月10日。`,
        },
        {
          role: "user",
          content: "请分析中际旭创(300308)的当前状态",
        },
      ],
      max_tokens: 1500,
    }),
  });

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "获取失败";
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`⏱️ Qwen3 耗时: ${elapsed}s`);
  console.log("\n📄 Qwen3 返回的数据:");
  console.log("-".repeat(40));
  console.log(content);
  console.log("-".repeat(40));

  return content;
}

// ==================== Step 2: Grok 深度分析 ====================

async function step2_GrokAnalyze(qwenData: string): Promise<string> {
  console.log("\n" + "=".repeat(60));
  console.log("🧠 Step 2: Grok 基于数据进行深度分析");
  console.log("=".repeat(60));

  const startTime = Date.now();

  const systemPrompt = `你是"小A"，一个A股短线操盘手AI助手。性格特点：果断、直接、不废话。

【当前时间】2026年1月10日 星期五 00:00

【你的风格】
- 直接给出结论：买入/卖出/观望/空仓
- 不说"仅供参考"、"结合自身情况"这种废话
- 用数据说话，给出具体点位
- 如果风险大，直接说"别碰"
- 说话简洁有力，像老练的操盘手

【Qwen3 预处理的股票数据】
${qwenData}

【回答格式】
1. **结论**（一句话判断）
2. **理由**（3点以内，用数据）
3. **操作建议**（具体点位和仓位）`;

  const response = await fetch(GROK_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROK_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROK_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: "中际旭创今天跌了，我买入后亏了，应该止损还是持有？",
        },
      ],
      max_tokens: 2000,
      temperature: 0.7,
    }),
  });

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "分析失败";
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`⏱️ Grok 耗时: ${elapsed}s`);
  console.log("\n🎯 Grok 的分析结果:");
  console.log("-".repeat(40));
  console.log(content);
  console.log("-".repeat(40));

  return content;
}

// ==================== Main ====================

async function main() {
  console.log("\n" + "🚀".repeat(20));
  console.log("   测试 Grok + Qwen3 双模型工作流");
  console.log("   股票: 中际旭创(300308)");
  console.log("🚀".repeat(20));

  try {
    // Step 1: Qwen3 获取数据
    const qwenData = await step1_QwenGetData();

    // Step 2: Grok 深度分析
    const grokAnalysis = await step2_GrokAnalyze(qwenData);

    // 总结
    console.log("\n" + "=".repeat(60));
    console.log("✅ 工作流完成");
    console.log("=".repeat(60));
    console.log("\n架构验证:");
    console.log("1. Qwen3 负责数据收集（便宜）");
    console.log("2. Grok 负责深度分析（聪明、直接）");
    console.log("3. 用户得到有态度的专业回答");
  } catch (error: any) {
    console.error("\n❌ 错误:", error.message);
  }
}

main();
