/**
 * 10只股票AI Agent测试 - 完整流程验证
 */

import { createSmartAgent } from './_core/agent';
import * as fs from 'fs';

// 测试股票 (精选10只代表性股票)
const TEST_STOCKS = [
  '002594', // 比亚迪 - 新能源龙头
  '600519', // 茅台 - 白酒龙头
  '300750', // 宁德时代 - 创业板明星
  '688981', // 中芯国际 - 科创板代表
  '000001', // 平安银行 - 银行股代表
  '600036', // 招商银行 - 另一银行股
  '300274', // 阳光电源 - 新能源
  '688008', // 澜起科技 - 芯片
  '002131', // 利欧股份 - 教育
  '600276'  // 恒瑞医药 - 医药
];

const TEST_CONFIG = {
  testDate: '2025-09-15',
  outputFile: './ai_agent_10_stocks_test.md'
};

// 测试结果接口
interface TestResult {
  stockCode: string;
  model: 'grok' | 'glm';
  success: boolean;
  executionTime: number;
  recommendation?: {
    type: '买入' | '持有' | '卖出';
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
async function testSingleStock(stockCode: string, model: 'grok' | 'glm'): Promise<TestResult> {
  const startTime = Date.now();

  try {
    console.log(`🔍 测试 ${stockCode} (${model.toUpperCase()})...`);

    const agent = createSmartAgent({
      stockCode,
      preferredModel: model,
      testMode: true
    });

    const query = `请对 ${stockCode} 进行技术分析，给出买入/持有/卖出的投资建议，并说明理由。当前时间是${TEST_CONFIG.testDate}。`;

    const result = await agent.chat(query);

    // 解析投资建议
    const recommendation = parseRecommendation(result.response);

    console.log(`✅ ${stockCode} 完成 (${Date.now() - startTime}ms)`);

    return {
      stockCode,
      model,
      success: true,
      executionTime: Date.now() - startTime,
      recommendation,
      analysis: result
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

// 解析AI推荐
function parseRecommendation(content: string): { type: '买入' | '持有' | '卖出'; confidence: number; reasoning: string } {
  let type: '买入' | '持有' | '卖出' = '持有';
  let confidence = 50;
  let reasoning = content;

  // 关键词匹配
  if (content.includes('强烈买入') || content.includes('推荐买入') || content.includes('积极买入')) {
    type = '买入';
    confidence = 80;
  } else if (content.includes('买入') || content.includes('看涨') || content.includes('看好')) {
    type = '买入';
    confidence = 60;
  } else if (content.includes('卖出') || content.includes('看跌') || content.includes('看空') || content.includes('推荐卖出')) {
    type = '卖出';
    confidence = 60;
  }

  // 提取关键理由
  const reasoningMatch = content.match(/(?:理由|因为|由于|分析)([:：].*?)(?:\n|$)/);
  if (reasoningMatch) {
    reasoning = reasoningMatch[1].trim();
  }

  return { type, confidence, reasoning };
}

// 生成报告
function generateTestReport(results: TestResult[]): string {
  const grokResults = results.filter(r => r.model === 'grok');
  const glmResults = results.filter(r => r.model === 'deepseek'); // GLM用deepseek

  let report = `# AI Agent 10只股票技术分析测试报告

## 测试概况
- **测试时间**: ${new Date().toISOString()}
- **测试股票**: 10只 (${TEST_STOCKS.join(', ')})
- **模型对比**: Grok vs GLM (DeepSeek)
- **测试类型**: 真实API调用 + 技术分析

## 测试结果汇总

### Grok模型结果
`;

  grokResults.forEach(result => {
    report += `#### ${result.stockCode}\n`;
    report += `- **状态**: ${result.success ? '✅ 成功' : '❌ 失败'}\n`;
    report += `- **耗时**: ${result.executionTime}ms\n`;

    if (result.success && result.recommendation) {
      report += `- **建议**: ${result.recommendation.type} (置信度${result.recommendation.confidence}%)\n`;
      report += `- **理由**: ${result.recommendation.reasoning.substring(0, 100)}...\n`;
    }

    if (result.error) {
      report += `- **错误**: ${result.error}\n`;
    }
    report += '\n';
  });

  report += `### GLM模型结果 (DeepSeek)
`;

  glmResults.forEach(result => {
    report += `#### ${result.stockCode}\n`;
    report += `- **状态**: ${result.success ? '✅ 成功' : '❌ 失败'}\n`;
    report += `- **耗时**: ${result.executionTime}ms\n`;

    if (result.success && result.recommendation) {
      report += `- **建议**: ${result.recommendation.type} (置信度${result.recommendation.confidence}%)\n`;
      report += `- **理由**: ${result.recommendation.reasoning.substring(0, 100)}...\n`;
    }

    if (result.error) {
      report += `- **错误**: ${result.error}\n`;
    }
    report += '\n';
  });

  // 统计
  const grokSuccess = grokResults.filter(r => r.success).length;
  const glmSuccess = glmResults.filter(r => r.success).length;

  const grokAvgTime = grokResults.reduce((sum, r) => sum + r.executionTime, 0) / grokResults.length;
  const glmAvgTime = glmResults.reduce((sum, r) => sum + r.executionTime, 0) / glmResults.length;

  report += `## 性能统计

### 成功率
- **Grok**: ${grokSuccess}/${grokResults.length} (${(grokSuccess/grokResults.length*100).toFixed(1)}%)
- **GLM**: ${glmSuccess}/${glmResults.length} (${(glmSuccess/glmResults.length*100).toFixed(1)}%)

### 平均耗时
- **Grok**: ${grokAvgTime.toFixed(0)}ms
- **GLM**: ${glmAvgTime.toFixed(0)}ms

### 建议分布统计
`;

  // 统计建议分布
  const grokRecommendations = grokResults.filter(r => r.success && r.recommendation);
  const glmRecommendations = glmResults.filter(r => r.success && r.recommendation);

  const countRecommendations = (results: TestResult[]) => {
    const counts = { 买入: 0, 持有: 0, 卖出: 0 };
    results.forEach(r => {
      if (r.recommendation) {
        counts[r.recommendation.type]++;
      }
    });
    return counts;
  };

  const grokCounts = countRecommendations(grokRecommendations);
  const glmCounts = countRecommendations(glmRecommendations);

  report += `#### Grok模型
- 买入: ${grokCounts.买入}
- 持有: ${grokCounts.持有}
- 卖出: ${grokCounts.卖出}

#### GLM模型
- 买入: ${glmCounts.买入}
- 持有: ${glmCounts.持有}
- 卖出: ${glmCounts.卖出}

## 结论

${grokSuccess >= 8 && glmSuccess >= 8 ?
  '✅ 测试成功！两个模型都能正常进行股票技术分析。AI Agent框架运行稳定，可以进行更大规模测试。' :
  '⚠️ 测试存在问题，需要检查API配置或网络连接。'}

---
*测试完成时间: ${new Date().toISOString()}*
`;

  return report;
}

// 主函数
async function main() {
  console.log('🚀 开始10只股票AI Agent测试\n');

  const results: TestResult[] = [];

  // 逐个测试，避免并发问题
  for (const stockCode of TEST_STOCKS) {
    // 测试Grok
    const grokResult = await testSingleStock(stockCode, 'grok');
    results.push(grokResult);

    // 短暂延迟
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 测试GLM (用deepseek)
    const glmResult = await testSingleStock(stockCode, 'deepseek');
    results.push(glmResult);

    // 批次间延迟
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // 生成报告
  console.log('\n📄 生成测试报告...');
  const report = generateTestReport(results);
  await fs.promises.writeFile(TEST_CONFIG.outputFile, report, 'utf8');

  console.log(`💾 报告已保存: ${TEST_CONFIG.outputFile}`);

  // 输出统计
  const grokResults = results.filter(r => r.model === 'grok');
  const glmResults = results.filter(r => r.model === 'deepseek');

  const grokSuccess = grokResults.filter(r => r.success).length;
  const glmSuccess = glmResults.filter(r => r.success).length;

  console.log('\n🎯 最终统计:');
  console.log(`Grok: ${grokSuccess}/${grokResults.length} 成功`);
  console.log(`GLM:  ${glmSuccess}/${glmResults.length} 成功`);

  if (grokSuccess >= 8 && glmSuccess >= 8) {
    console.log('\n🎉 10只股票测试成功！可以开始100只股票大规模测试了。');
  }
}

// 运行测试
main().catch(console.error);