/**
 * AI Agent 快速测试 - 10只股票验证逻辑
 */

import { createSmartAgent } from './_core/agent';

// 测试配置 - 快速版本
const QUICK_CONFIG = {
  testDate: '2025-09-15',
  concurrency: 2,
  batchDelay: 2000,
  outputFile: './ai_agent_quick_test.md'
};

// 选择10只代表性股票
const QUICK_STOCKS = [
  '002594', // 比亚迪
  '600519', // 茅台
  '300750', // 宁德时代
  '688981', // 中芯国际
  '000001', // 平安银行
  '600036', // 招商银行
  '300274', // 阳光电源
  '688008', // 澜起科技
  '002131', // 利欧股份
  '600276'  // 恒瑞医药
];

// 测试结果接口
interface TestResult {
  stockCode: string;
  model: 'grok' | 'glm';
  success: boolean;
  executionTime: number;
  recommendation?: string;
  confidence?: number;
  error?: string;
}

// 测试单只股票
async function testStock(stockCode: string, model: 'grok' | 'glm'): Promise<TestResult> {
  const startTime = Date.now();

  try {
    console.log(`🔍 测试 ${stockCode} (${model.toUpperCase()})...`);

    const agent = createSmartAgent({
      stockCode,
      preferredModel: model,
      testMode: true
    });

    const query = `请对 ${stockCode} 进行技术分析，给出买入/持有/卖出的投资建议。当前时间是${QUICK_CONFIG.testDate}。`;

    const result = await agent.chat(query);

    // 解析推荐
    let recommendation = '持有';
    let confidence = 50;

    if (result.response.includes('强烈买入') || result.response.includes('推荐买入')) {
      recommendation = '买入';
      confidence = 80;
    } else if (result.response.includes('买入')) {
      recommendation = '买入';
      confidence = 60;
    } else if (result.response.includes('卖出')) {
      recommendation = '卖出';
      confidence = 60;
    }

    console.log(`✅ ${stockCode} 完成 (${Date.now() - startTime}ms)`);

    return {
      stockCode,
      model,
      success: true,
      executionTime: Date.now() - startTime,
      recommendation,
      confidence
    };

  } catch (error) {
    console.log(`❌ ${stockCode} 失败: ${error.message}`);

    return {
      stockCode,
      model,
      success: false,
      executionTime: Date.now() - startTime,
      error: error.message
    };
  }
}

// 生成报告
function generateQuickReport(grokResults: TestResult[], glmResults: TestResult[]): string {
  const grokSuccess = grokResults.filter(r => r.success).length;
  const glmSuccess = glmResults.filter(r => r.success).length;

  const grokAvgTime = grokResults.reduce((sum, r) => sum + r.executionTime, 0) / grokResults.length;
  const glmAvgTime = glmResults.reduce((sum, r) => sum + r.executionTime, 0) / glmResults.length;

  let report = `# AI Agent 10只股票快速测试报告

## 测试概况
- 测试时间: ${new Date().toISOString()}
- 测试股票: 10只 (${QUICK_STOCKS.join(', ')})
- 模型对比: Grok vs GLM (DeepSeek)

## 结果统计

### Grok模型
- ✅ 成功率: ${grokSuccess}/${grokResults.length} (${(grokSuccess/grokResults.length*100).toFixed(1)}%)
- ⚡ 平均耗时: ${grokAvgTime.toFixed(0)}ms

### GLM模型
- ✅ 成功率: ${glmSuccess}/${glmResults.length} (${(glmSuccess/glmResults.length*100).toFixed(1)}%)
- ⚡ 平均耗时: ${glmAvgTime.toFixed(0)}ms

## 详细结果

### Grok模型结果
`;

  grokResults.forEach(result => {
    report += `#### ${result.stockCode}\n`;
    report += `- 状态: ${result.success ? '✅ 成功' : '❌ 失败'}\n`;
    report += `- 耗时: ${result.executionTime}ms\n`;
    if (result.success) {
      report += `- 建议: ${result.recommendation} (置信度${result.confidence}%)\n`;
    } else {
      report += `- 错误: ${result.error}\n`;
    }
    report += '\n';
  });

  report += `### GLM模型结果
`;

  glmResults.forEach(result => {
    report += `#### ${result.stockCode}\n`;
    report += `- 状态: ${result.success ? '✅ 成功' : '❌ 失败'}\n`;
    report += `- 耗时: ${result.executionTime}ms\n`;
    if (result.success) {
      report += `- 建议: ${result.recommendation} (置信度${result.confidence}%)\n`;
    } else {
      report += `- 错误: ${result.error}\n`;
    }
    report += '\n';
  });

  report += `## 结论

${grokSuccess >= 8 && glmSuccess >= 8 ?
  '✅ 快速测试成功！AI Agent逻辑正确，可以进行大规模测试' :
  '⚠️ 测试存在问题，需要检查配置'}

---
*快速测试完成时间: ${new Date().toISOString()}*
`;

  return report;
}

// 主函数
async function main() {
  console.log('🚀 AI Agent 10只股票快速测试\n');

  const grokResults: TestResult[] = [];
  const glmResults: TestResult[] = [];

  // 测试Grok
  console.log('🤖 测试Grok模型...');
  for (const stock of QUICK_STOCKS) {
    const result = await testStock(stock, 'grok');
    grokResults.push(result);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // 测试GLM
  console.log('\n🧠 测试GLM模型...');
  for (const stock of QUICK_STOCKS) {
    const result = await testStock(stock, 'deepseek');
    glmResults.push(result);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // 生成报告
  console.log('\n📄 生成测试报告...');
  const report = generateQuickReport(grokResults, glmResults);

  const fs = await import('fs');
  fs.writeFileSync(QUICK_CONFIG.outputFile, report, 'utf8');

  console.log(`💾 报告已保存: ${QUICK_CONFIG.outputFile}`);

  // 输出统计
  const grokSuccess = grokResults.filter(r => r.success).length;
  const glmSuccess = glmResults.filter(r => r.success).length;

  console.log('\n🎯 最终统计:');
  console.log(`Grok: ${grokSuccess}/${grokResults.length} 成功`);
  console.log(`GLM:  ${glmSuccess}/${glmResults.length} 成功`);

  if (grokSuccess >= 8 && glmSuccess >= 8) {
    console.log('\n🎉 快速测试成功！现在可以启动100只股票大规模测试了！');
  }
}

// 运行测试
main().catch(console.error);