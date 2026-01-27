/**
 * AI Agent详细回答内容测试 - 展示模型回答质量
 */

import { createSmartAgent } from "./_core/agent";
import * as fs from "fs";

// 测试配置
const DETAIL_TEST_CONFIG = {
  testStocks: [
    { code: "002594", name: "比亚迪" },
    { code: "600519", name: "茅台" },
    { code: "300750", name: "宁德时代" },
  ],
  testDate: "2025-09-15",
  outputFile: "./ai_agent_detailed_responses.md",
};

// 测试结果接口
interface DetailedTestResult {
  stockCode: string;
  stockName: string;
  model: "grok" | "glm";
  query: string;
  response: string;
  executionTime: number;
  toolCalls: string[];
  success: boolean;
}

// 获取详细AI回答
async function getDetailedResponse(
  stockCode: string,
  stockName: string,
  model: "grok" | "glm"
): Promise<DetailedTestResult> {
  const startTime = Date.now();

  try {
    console.log(
      `🤖 测试 ${stockName}(${stockCode}) - ${model.toUpperCase()}模型...`
    );

    const agent = createSmartAgent({
      stockCode,
      preferredModel: model,
      testMode: true,
    });

    const query = `请对 ${stockCode}(${stockName})进行详细的技术分析，给出买入/持有/卖出的投资建议，并详细说明理由。当前时间是${DETAIL_TEST_CONFIG.testDate}。请详细分析技术指标、资金流向和市场走势。`;

    const result = await agent.chat(query);

    console.log(`✅ ${stockName} 完成 (${Date.now() - startTime}ms)`);

    return {
      stockCode,
      stockName,
      model,
      query,
      response: result.response,
      executionTime: Date.now() - startTime,
      toolCalls: result.toolCalls || [],
      success: true,
    };
  } catch (error) {
    console.log(`❌ ${stockName} 失败: ${error.message}`);

    return {
      stockCode,
      stockName,
      model,
      query: "",
      response: "",
      executionTime: Date.now() - startTime,
      toolCalls: [],
      success: false,
    };
  }
}

// 主函数
async function main() {
  console.log("📝 AI Agent详细回答内容测试 - 展示模型回答质量\n");

  const allResults: DetailedTestResult[] = [];

  // 测试每个股票的两个模型
  for (const stock of DETAIL_TEST_CONFIG.testStocks) {
    console.log(`\n🏢 开始测试股票: ${stock.name}(${stock.code})`);

    // Grok模型
    const grokResult = await getDetailedResponse(
      stock.code,
      stock.name,
      "grok"
    );
    allResults.push(grokResult);

    // 等待5秒
    await new Promise(resolve => setTimeout(resolve, 5000));

    // GLM模型
    const glmResult = await getDetailedResponse(
      stock.code,
      stock.name,
      "deepseek"
    );
    allResults.push(glmResult);

    // 等待5秒
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  // 生成详细报告
  const report = generateDetailedReport(allResults);
  fs.writeFileSync(DETAIL_TEST_CONFIG.outputFile, report, "utf8");

  console.log(`\n💾 详细回答报告已保存: ${DETAIL_TEST_CONFIG.outputFile}`);
  console.log("\n🎯 报告包含了每个模型对每只股票的完整AI回答内容");
  console.log("你可以查看回答质量、分析深度和建议合理性");
}

// 生成详细报告
function generateDetailedReport(results: DetailedTestResult[]): string {
  let report = `# AI Agent详细回答内容分析报告

## 测试概况
- 测试时间: ${new Date().toISOString()}
- 测试股票: ${DETAIL_TEST_CONFIG.testStocks.length}只
- 模型对比: Grok vs GLM (DeepSeek)
- 分析深度: 详细技术分析 + 投资建议

## 回答内容展示

`;

  // 按股票分组展示
  DETAIL_TEST_CONFIG.testStocks.forEach(stock => {
    report += `## ${stock.name}(${stock.code}) 详细分析\n\n`;

    const stockResults = results.filter(r => r.stockCode === stock.code);

    stockResults.forEach(result => {
      if (result.success) {
        report += `### ${result.model.toUpperCase()}模型回答\n\n`;
        report += `**查询**: ${result.query}\n\n`;
        report += `**执行时间**: ${result.executionTime}ms\n\n`;
        report += `**工具调用**: ${result.toolCalls.join(", ")}\n\n`;
        report += `**AI回答**:\n\n${result.response}\n\n`;
        report += `---\n\n`;
      } else {
        report += `### ${result.model.toUpperCase()}模型 (失败)\n\n`;
        report += `❌ 测试失败\n\n`;
        report += `---\n\n`;
      }
    });

    report += `\n\n`;
  });

  // 质量评估
  report += `## 回答质量评估

### 评估标准
1. **信息完整性**: 是否涵盖技术面、资金面、基本面
2. **逻辑严谨性**: 分析推理是否合理，结论是否有数据支撑
3. **实用性**: 投资建议是否具体可操作
4. **客观性**: 是否避免过度乐观或悲观
5. **专业性**: 分析语言是否专业，概念是否准确

### 质量评分 (1-5分)

| 股票 | Grok质量 | GLM质量 | 优势模型 | 主要特点 |
|------|----------|---------|----------|----------|
`;

  // 为每个股票的回答评分
  DETAIL_TEST_CONFIG.testStocks.forEach(stock => {
    const stockResults = results.filter(
      r => r.stockCode === stock.code && r.success
    );

    let grokScore = 0;
    let glmScore = 0;
    let grokFeatures = "";
    let glmFeatures = "";

    stockResults.forEach(result => {
      if (result.model === "grok") {
        grokScore = evaluateResponseQuality(result.response);
        grokFeatures = getResponseFeatures(result.response);
      } else {
        glmScore = evaluateResponseQuality(result.response);
        glmFeatures = getResponseFeatures(result.response);
      }
    });

    const winner =
      grokScore > glmScore ? "Grok" : grokScore < glmScore ? "GLM" : "平手";

    report += `| ${stock.name} | ${grokScore}/5 | ${glmScore}/5 | ${winner} | ${winner === "Grok" ? grokFeatures : glmFeatures} |\n`;
  });

  report += `

---

*详细回答内容报告生成时间: ${new Date().toISOString()}*
*包含完整的AI回答内容，方便质量评估和对比分析*
`;

  return report;
}

// 评估回答质量 (1-5分)
function evaluateResponseQuality(response: string): number {
  let score = 3; // 基础分

  // 信息完整性 (+1分)
  if (
    response.includes("技术") &&
    response.includes("资金") &&
    response.includes("建议")
  ) {
    score += 1;
  }

  // 逻辑严谨性 (+1分)
  if (
    response.includes("因为") ||
    response.includes("由于") ||
    response.includes("数据")
  ) {
    score += 1;
  }

  // 实用性 (+1分)
  if (
    response.includes("价") ||
    response.includes("仓位") ||
    response.includes("止损")
  ) {
    score += 1;
  }

  // 专业性 (+1分)
  if (
    response.includes("MACD") ||
    response.includes("RSI") ||
    response.includes("均线")
  ) {
    score += 1;
  }

  return Math.min(5, score);
}

// 获取回答特点
function getResponseFeatures(response: string): string {
  const features: string[] = [];

  if (response.length > 1000) features.push("详细");
  if (response.includes("具体") || response.includes("明确"))
    features.push("具体");
  if (response.includes("风险") || response.includes("注意"))
    features.push("谨慎");
  if (response.includes("数据") || response.includes("指标"))
    features.push("数据驱动");

  return features.join(", ") || "标准回答";
}

// 运行测试
main().catch(console.error);
