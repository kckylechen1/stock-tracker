/**
 * 分批AI Agent测试 - 5只股票x2模型 = 10次测试
 */

import { createSmartAgent } from "./_core/agent";
import * as fs from "fs";

// 测试股票 (5只)
const TEST_STOCKS = [
  "002594", // 比亚迪
  "600519", // 茅台
  "300750", // 宁德时代
  "688981", // 中芯国际
  "000001", // 平安银行
];

// 测试结果接口
interface TestResult {
  stockCode: string;
  model: "grok" | "glm";
  success: boolean;
  executionTime: number;
  recommendation?: {
    type: "买入" | "持有" | "卖出";
    confidence: number;
    reasoning: string;
  };
  analysis?: {
    response: string;
    toolCalls: string[];
    iterations: number;
  };
  error?: string;
}

// 测试单只股票
async function testSingleStock(
  stockCode: string,
  model: "grok" | "glm"
): Promise<TestResult> {
  const startTime = Date.now();

  try {
    console.log(`🔍 测试 ${stockCode} (${model.toUpperCase()})...`);

    const agent = createSmartAgent({
      stockCode,
      preferredModel: model,
      testMode: true,
    });

    const query = `请对 ${stockCode} 进行技术分析，给出买入/持有/卖出的投资建议。当前时间是2025年9月15日。`;

    const result = await agent.chat(query);
    const recommendation = parseRecommendation(result.response);

    console.log(`✅ ${stockCode} 完成 (${Date.now() - startTime}ms)`);

    return {
      stockCode,
      model,
      success: true,
      executionTime: Date.now() - startTime,
      recommendation,
      analysis: result,
    };
  } catch (error) {
    console.log(`❌ ${stockCode} 失败: ${error.message}`);

    return {
      stockCode,
      model,
      success: false,
      executionTime: Date.now() - startTime,
      error: error.message,
    };
  }
}

// 解析AI推荐
function parseRecommendation(content: string): {
  type: "买入" | "持有" | "卖出";
  confidence: number;
  reasoning: string;
} {
  let type: "买入" | "持有" | "卖出" = "持有";
  let confidence = 50;
  let reasoning = content;

  if (content.includes("强烈买入") || content.includes("推荐买入")) {
    type = "买入";
    confidence = 80;
  } else if (content.includes("买入")) {
    type = "买入";
    confidence = 60;
  } else if (content.includes("卖出") || content.includes("推荐卖出")) {
    type = "卖出";
    confidence = 60;
  }

  return { type, confidence, reasoning: reasoning.substring(0, 100) };
}

// 主函数 - 分批测试
async function main() {
  console.log("🚀 开始分批AI Agent测试 (5只股票 x 2模型)\n");

  const allResults: TestResult[] = [];

  // 第一批：Grok模型
  console.log("🤖 第一批：Grok模型测试");
  for (const stockCode of TEST_STOCKS) {
    const result = await testSingleStock(stockCode, "grok");
    allResults.push(result);
    await new Promise(resolve => setTimeout(resolve, 2000)); // 间隔2秒
  }

  // 第二批：GLM模型 (用deepseek)
  console.log("\n🧠 第二批：GLM模型测试");
  for (const stockCode of TEST_STOCKS) {
    const result = await testSingleStock(stockCode, "deepseek");
    allResults.push(result);
    await new Promise(resolve => setTimeout(resolve, 2000)); // 间隔2秒
  }

  // 生成简报
  const grokResults = allResults.filter(r => r.model === "grok");
  const glmResults = allResults.filter(r => r.model === "deepseek");

  const grokSuccess = grokResults.filter(r => r.success).length;
  const glmSuccess = glmResults.filter(r => r.success).length;

  console.log("\n🎯 测试结果统计:");
  console.log(`Grok: ${grokSuccess}/${grokResults.length} 成功`);
  console.log(`GLM:  ${glmSuccess}/${glmResults.length} 成功`);

  // 保存简报
  const summary = `# AI Agent分批测试报告

## 测试概况
- 测试时间: ${new Date().toISOString()}
- 测试股票: ${TEST_STOCKS.length}只
- 总测试次数: ${allResults.length}

## 成功率统计
- Grok: ${grokSuccess}/${grokResults.length} (${((grokSuccess / grokResults.length) * 100).toFixed(1)}%)
- GLM: ${glmSuccess}/${glmResults.length} (${((glmSuccess / glmResults.length) * 100).toFixed(1)}%)

## 结论
${
  grokSuccess >= 4 && glmSuccess >= 4
    ? "✅ 测试成功！AI Agent框架运行正常，可以进行大规模测试"
    : "⚠️ 测试存在问题，需要进一步调试"
}

---
*生成时间: ${new Date().toISOString()}*
`;

  await fs.promises.writeFile(
    "./ai_agent_batch_test_summary.md",
    summary,
    "utf8"
  );
  console.log("\n💾 简报已保存: ai_agent_batch_test_summary.md");

  if (grokSuccess >= 4 && glmSuccess >= 4) {
    console.log("\n🎉 分批测试成功！可以开始大规模100只股票测试了！");
  }
}

// 运行测试
main().catch(console.error);
