/**
 * AI Agent 迷你测试 - 3只股票快速验证
 */

import { createSmartAgent } from "./_core/agent";
import * as fs from "fs";

// 迷你测试配置
const MINI_CONFIG = {
  testDate: "2025-09-15",
  outputFile: "./ai_agent_mini_test.md",
};

// 只测试3只股票
const MINI_STOCKS = [
  "002594", // 比亚迪
  "600519", // 茅台
  "300750", // 宁德时代
];

// 主函数
async function main() {
  console.log("🚀 AI Agent 3只股票迷你测试\n");

  const results: any[] = [];

  // 测试Grok模型
  console.log("🤖 测试Grok模型...");
  for (const stock of MINI_STOCKS) {
    console.log(`\n🔍 测试 ${stock} (Grok)...`);

    try {
      const agent = createSmartAgent({
        stockCode: stock,
        preferredModel: "grok",
        testMode: true,
      });

      const query = `请对 ${stock} 进行技术分析，给出买入/持有/卖出的投资建议。当前时间是${MINI_CONFIG.testDate}。`;

      const startTime = Date.now();
      const result = await agent.chat(query);
      const duration = Date.now() - startTime;

      console.log(`✅ 完成 (${duration}ms)`);

      results.push({
        stockCode: stock,
        model: "grok",
        success: true,
        executionTime: duration,
        response: result.response.substring(0, 200) + "...",
      });
    } catch (error) {
      console.log(`❌ 失败: ${error.message}`);
      results.push({
        stockCode: stock,
        model: "grok",
        success: false,
        error: error.message,
      });
    }

    // 等待2秒
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // 测试GLM模型
  console.log("\n🧠 测试GLM模型...");
  for (const stock of MINI_STOCKS) {
    console.log(`\n🔍 测试 ${stock} (GLM)...`);

    try {
      const agent = createSmartAgent({
        stockCode: stock,
        preferredModel: "deepseek",
        testMode: true,
      });

      const query = `请对 ${stock} 进行技术分析，给出买入/持有/卖出的投资建议。当前时间是${MINI_CONFIG.testDate}。`;

      const startTime = Date.now();
      const result = await agent.chat(query);
      const duration = Date.now() - startTime;

      console.log(`✅ 完成 (${duration}ms)`);

      results.push({
        stockCode: stock,
        model: "deepseek",
        success: true,
        executionTime: duration,
        response: result.response.substring(0, 200) + "...",
      });
    } catch (error) {
      console.log(`❌ 失败: ${error.message}`);
      results.push({
        stockCode: stock,
        model: "deepseek",
        success: false,
        error: error.message,
      });
    }

    // 等待2秒
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // 生成报告
  console.log("\n📄 生成迷你测试报告...");

  const grokResults = results.filter(r => r.model === "grok");
  const glmResults = results.filter(r => r.model === "deepseek");

  const grokSuccess = grokResults.filter(r => r.success).length;
  const glmSuccess = glmResults.filter(r => r.success).length;

  const report = `# AI Agent 3只股票迷你测试报告

## 测试概况
- 测试时间: ${new Date().toISOString()}
- 测试股票: 3只 (${MINI_STOCKS.join(", ")})
- 模型对比: Grok vs GLM (DeepSeek)

## 结果统计

### Grok模型
- ✅ 成功率: ${grokSuccess}/${grokResults.length} (${((grokSuccess / grokResults.length) * 100).toFixed(1)}%)
- ⚡ 平均耗时: ${grokResults.reduce((sum, r) => sum + r.executionTime, 0) / grokResults.length}ms

### GLM模型
- ✅ 成功率: ${glmSuccess}/${glmResults.length} (${((glmSuccess / glmResults.length) * 100).toFixed(1)}%)
- ⚡ 平均耗时: ${glmResults.reduce((sum, r) => sum + r.executionTime, 0) / glmResults.length}ms

## 详细结果

### Grok模型结果
${grokResults.map(r => `#### ${r.stockCode}\n- 状态: ${r.success ? "✅ 成功" : "❌ 失败"}\n- 耗时: ${r.executionTime}ms\n${r.success ? `- 响应: ${r.response}\n` : `- 错误: ${r.error}\n`}`).join("\n")}

### GLM模型结果
${glmResults.map(r => `#### ${r.stockCode}\n- 状态: ${r.success ? "✅ 成功" : "❌ 失败"}\n- 耗时: ${r.executionTime}ms\n${r.success ? `- 响应: ${r.response}\n` : `- 错误: ${r.error}\n`}`).join("\n")}

## 结论

${
  grokSuccess >= 2 && glmSuccess >= 2
    ? "✅ 迷你测试成功！AI Agent可以正常进行股票技术分析。"
    : "⚠️ 测试存在问题，需要检查配置。"
}

现在可以开始更大规模的测试了！

---
*迷你测试完成时间: ${new Date().toISOString()}*
`;

  fs.writeFileSync(MINI_CONFIG.outputFile, report, "utf8");
  console.log(`💾 报告已保存: ${MINI_CONFIG.outputFile}`);

  console.log("\n🎯 最终统计:");
  console.log(`Grok: ${grokSuccess}/${grokResults.length} 成功`);
  console.log(`GLM:  ${glmSuccess}/${glmResults.length} 成功`);

  if (grokSuccess >= 2 && glmSuccess >= 2) {
    console.log(
      "\n🎉 迷你测试成功！AI Agent框架运行正常，可以开始大规模测试！"
    );
  }
}

// 运行测试
main().catch(console.error);
