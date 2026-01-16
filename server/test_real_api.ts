/**
 * AI Agent真实API测试 - 5只股票测试
 */

import { createSmartAgent } from "./_core/agent";
import * as fs from "fs";

// 测试配置
const TEST_CONFIG = {
  testDate: "2025-09-15",
  outputFile: "./ai_agent_real_test_results.md",
};

// 测试股票列表 (精选5只代表性股票)
const TEST_STOCKS = [
  "002594", // 比亚迪 - 新能源代表
  "600519", // 茅台 - 白酒龙头
  "300750", // 宁德时代 - 创业板明星
  "688981", // 中芯国际 - 科创板代表
  "000001", // 平安银行 - 银行股代表
];

// 测试结果接口
interface TestResult {
  stockCode: string;
  model: "grok" | "glm";
  success: boolean;
  executionTime: number;
  response?: string;
  toolCalls?: string[];
  iterations?: number;
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

    // 创建AI Agent
    const agent = createSmartAgent({
      stockCode,
      preferredModel: model,
      testMode: true,
    });

    // 技术分析查询
    const query = `请对 ${stockCode} 进行技术分析，给出买入/持有/卖出的投资建议，并说明理由。当前时间是${TEST_CONFIG.testDate}。`;

    const result = await agent.chat(query);

    console.log(`✅ ${stockCode} 完成 (${Date.now() - startTime}ms)`);

    return {
      stockCode,
      model,
      success: true,
      executionTime: Date.now() - startTime,
      response: result.response || "",
      toolCalls: result.toolCalls || [],
      iterations: result.iterations || 0,
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

// 运行测试
async function runRealTest() {
  console.log("🚀 开始AI Agent真实API测试\n");

  const results: TestResult[] = [];

  // 逐个测试，避免并发问题
  for (const stockCode of TEST_STOCKS) {
    // 测试Grok
    const grokResult = await testSingleStock(stockCode, "grok");
    results.push(grokResult);

    // 短暂延迟
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 测试GLM
    const glmResult = await testSingleStock(stockCode, "glm");
    results.push(glmResult);

    // 批次间延迟
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // 生成报告
  const report = generateRealTestReport(results);
  await fs.promises.writeFile(TEST_CONFIG.outputFile, report, "utf8");

  console.log(`\n💾 真实API测试报告已保存: ${TEST_CONFIG.outputFile}`);

  // 输出统计
  const grokResults = results.filter(r => r.model === "grok");
  const glmResults = results.filter(r => r.model === "glm");

  const grokSuccess = grokResults.filter(r => r.success).length;
  const glmSuccess = glmResults.filter(r => r.success).length;

  console.log("\n🎯 测试统计:");
  console.log(`Grok: ${grokSuccess}/${grokResults.length} 成功`);
  console.log(`GLM:  ${glmSuccess}/${glmResults.length} 成功`);

  if (grokSuccess > 0 && glmSuccess > 0) {
    console.log("\n🎉 真实API测试成功！可以进行大规模测试了。");
  }
}

// 生成报告
function generateRealTestReport(results: TestResult[]): string {
  const grokResults = results.filter(r => r.model === "grok");
  const glmResults = results.filter(r => r.model === "glm");

  let report = `# AI Agent真实API测试报告

## 测试概况
- **测试时间**: ${new Date().toISOString()}
- **测试股票**: ${TEST_STOCKS.length}只 (${TEST_STOCKS.join(", ")})
- **模型对比**: Grok vs GLM
- **测试类型**: 真实API调用

## 测试结果

`;

  // Grok结果
  report += `### Grok模型结果\n\n`;
  grokResults.forEach(result => {
    report += `#### ${result.stockCode}\n`;
    report += `- **状态**: ${result.success ? "✅ 成功" : "❌ 失败"}\n`;
    report += `- **耗时**: ${result.executionTime}ms\n`;
    if (result.success) {
      report += `- **工具调用**: ${result.toolCalls?.join(", ") || "无"}\n`;
      report += `- **推理次数**: ${result.iterations}\n`;
      report += `- **响应**: ${result.response?.substring(0, 200)}...\n`;
    } else {
      report += `- **错误**: ${result.error}\n`;
    }
    report += "\n";
  });

  // GLM结果
  report += `### GLM模型结果\n\n`;
  glmResults.forEach(result => {
    report += `#### ${result.stockCode}\n`;
    report += `- **状态**: ${result.success ? "✅ 成功" : "❌ 失败"}\n`;
    report += `- **耗时**: ${result.executionTime}ms\n`;
    if (result.success) {
      report += `- **工具调用**: ${result.toolCalls?.join(", ") || "无"}\n`;
      report += `- **推理次数**: ${result.iterations}\n`;
      report += `- **响应**: ${result.response?.substring(0, 200)}...\n`;
    } else {
      report += `- **错误**: ${result.error}\n`;
    }
    report += "\n";
  });

  // 统计
  const grokSuccess = grokResults.filter(r => r.success).length;
  const glmSuccess = glmResults.filter(r => r.success).length;

  report += `## 统计总结

### 成功率
- **Grok**: ${grokSuccess}/${grokResults.length} (${((grokSuccess / grokResults.length) * 100).toFixed(1)}%)
- **GLM**: ${glmSuccess}/${glmResults.length} (${((glmSuccess / glmResults.length) * 100).toFixed(1)}%)

### 平均性能
- **Grok平均耗时**: ${grokResults.reduce((sum, r) => sum + r.executionTime, 0) / grokResults.length}ms
- **GLM平均耗时**: ${glmResults.reduce((sum, r) => sum + r.executionTime, 0) / glmResults.length}ms

### 结论
${
  grokSuccess >= 3 && glmSuccess >= 3
    ? "✅ 两个模型都表现出色，可以进行大规模测试"
    : "⚠️ 部分模型表现不佳，需要检查配置或网络"
}

---
*测试完成时间: ${new Date().toISOString()}*
`;

  return report;
}

// 运行测试
runRealTest().catch(console.error);
