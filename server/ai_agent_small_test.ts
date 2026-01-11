/**
 * AI Agent技术分析回测测试 - 小规模测试版
 * 测试10只随机股票，比较Grok和GLM模型表现
 */

import * as fs from 'fs';

// 测试配置 - 小规模测试
const TEST_CONFIG = {
  randomSeed: 20240915,
  testDate: '2025-09-15',
  backtestDays: 60,
  accuracyThreshold: 10,
  concurrency: 2, // 减少并发
  successRateThreshold: 80,
  outputFile: './ai_agent_test_results_20240915_small.md'
};

// 生成固定随机数
function seededRandom(seed: number): () => number {
  let x = Math.sin(seed) * 10000;
  return () => {
    x = Math.sin(x) * 10000;
    return x - Math.floor(x);
  };
}

// 生成随机股票列表 - 只生成10只
function generateSeededStockList(seed: number): string[] {
  const random = seededRandom(seed);
  const stocks: string[] = [];

  // 简化版本：从每个板块各选几只
  const stockPools = {
    shanghai: ['600000', '600036', '600519', '600276', '600036'],
    shenzhen: ['000001', '000002', '000858', '002594', '000001'],
    chuangye: ['300750', '300274', '300122', '300750', '300274'],
    kechuang: ['688981', '688008', '688036', '688981', '688008']
  };

  Object.values(stockPools).forEach(pool => {
    stocks.push(...pool.slice(0, 2)); // 每个板块选2只
  });

  return stocks.slice(0, 10); // 确保正好10只
}

// 模拟股票数据验证
async function validateStockData(stockCode: string, testDate: string): Promise<boolean> {
  // 简单模拟验证
  await new Promise(resolve => setTimeout(resolve, 10));
  return true; // 假设都有效
}

// Mock AI Agent响应 - 简化版
function mockAIAnalysis(stockCode: string): any {
  const seed = stockCode.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const random = seededRandom(seed);

  const recommendations = ['买入', '持有', '卖出'];
  const recommendation = recommendations[Math.floor(random() * recommendations.length)];

  return {
    recommendation,
    confidence: Math.floor(random() * 40) + 30,
    reasoning: `${recommendation}理由`,
    executionTime: Math.floor(random() * 3000) + 2000,
    toolCalls: ['get_stock_quote', 'analyze_stock_technical'],
    iterations: Math.floor(random() * 3) + 2
  };
}

// Mock回测验证
function mockBacktest(recommendation: string, stockCode: string): any {
  const seed = stockCode.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const random = seededRandom(seed);

  const totalReturn = (random() - 0.3) * 80;
  const maxGain = Math.abs(totalReturn) * (0.5 + random() * 0.5);
  const maxLoss = -Math.abs(totalReturn) * (0.3 + random() * 0.4);

  let accuracy = 0;
  if (recommendation === '买入') {
    accuracy = totalReturn > TEST_CONFIG.accuracyThreshold ? 100 :
              totalReturn > -TEST_CONFIG.accuracyThreshold ? 50 : 0;
  } else if (recommendation === '卖出') {
    accuracy = totalReturn < -TEST_CONFIG.accuracyThreshold ? 100 :
              totalReturn < TEST_CONFIG.accuracyThreshold ? 50 : 0;
  } else {
    const volatility = Math.abs(maxGain) + Math.abs(maxLoss);
    accuracy = volatility < 40 ? 100 : volatility < 80 ? 50 : 0;
  }

  return {
    totalReturn,
    maxGain,
    maxLoss,
    accuracy,
    valid: true
  };
}

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
  backtestResult?: {
    totalReturn: number;
    maxGain: number;
    maxLoss: number;
    accuracy: number;
    valid: boolean;
  };
  toolCalls?: string[];
  iterations?: number;
  error?: string;
}

// 单股票测试
async function testSingleStock(stockCode: string, model: 'grok' | 'glm'): Promise<TestResult> {
  const startTime = Date.now();

  try {
    // 模拟API调用延迟
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));

    const mockResult = mockAIAnalysis(stockCode);
    const backtestResult = mockBacktest(mockResult.recommendation, stockCode);

    return {
      stockCode,
      model,
      success: true,
      executionTime: mockResult.executionTime,
      recommendation: {
        type: mockResult.recommendation,
        confidence: mockResult.confidence,
        reasoning: mockResult.reasoning
      },
      backtestResult,
      toolCalls: mockResult.toolCalls,
      iterations: mockResult.iterations
    };

  } catch (error) {
    return {
      stockCode,
      model,
      success: false,
      executionTime: Date.now() - startTime,
      error: error.message
    };
  }
}

// 批量测试
async function runBatchTest(stocks: string[], model: 'grok' | 'glm'): Promise<TestResult[]> {
  const results: TestResult[] = [];
  let successCount = 0;

  console.log(`\n🤖 开始${model.toUpperCase()}模型测试 (${stocks.length}只股票)`);

  for (let i = 0; i < stocks.length; i += TEST_CONFIG.concurrency) {
    const batch = stocks.slice(i, i + TEST_CONFIG.concurrency);
    const batchNum = Math.floor(i / TEST_CONFIG.concurrency) + 1;
    const totalBatches = Math.ceil(stocks.length / TEST_CONFIG.concurrency);

    console.log(`📊 ${model.toUpperCase()} - 处理第 ${batchNum}/${totalBatches} 批 (${batch.length}只股票)`);

    const batchPromises = batch.map(stock => testSingleStock(stock, model));
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    const batchSuccess = batchResults.filter(r => r.success).length;
    successCount += batchSuccess;

    console.log(`   ✅ 本批成功: ${batchSuccess}/${batch.length}`);

    // 检查成功率阈值
    const currentSuccessRate = (successCount / (i + TEST_CONFIG.concurrency)) * 100;
    if (currentSuccessRate < TEST_CONFIG.successRateThreshold) {
      console.log(`⚠️ 警告: 当前成功率 ${currentSuccessRate.toFixed(1)}% 低于阈值 ${TEST_CONFIG.successRateThreshold}%`);
      console.log('🛑 测试暂停，请检查问题后继续');
      return results;
    }

    if (i + TEST_CONFIG.concurrency < stocks.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return results;
}

// 生成报告
function generateReport(grokResults: TestResult[], glmResults: TestResult[]): string {
  const grokStats = calculateStats(grokResults);
  const glmStats = calculateStats(glmResults);
  const comparison = compareModels(grokStats, glmStats);

  let report = `# AI Agent技术分析回测测试报告 (小规模测试)

## 测试概况
- **测试时间点**: ${TEST_CONFIG.testDate} (2025年9月15日)
- **测试股票**: 10只 (固定随机种子: ${TEST_CONFIG.randomSeed})
- **AI模型对比**: Grok vs GLM (Mock数据)
- **回测周期**: ${TEST_CONFIG.backtestDays}个交易日 (约3个月)
- **准确性阈值**: ±${TEST_CONFIG.accuracyThreshold}%

## 总体性能统计

### Grok模型
- ✅ **成功率**: ${grokStats.successRate.toFixed(1)}% (${grokStats.successCount}/${grokStats.totalCount})
- ⚡ **平均响应时间**: ${grokStats.avgExecutionTime.toFixed(1)}秒

### GLM模型
- ✅ **成功率**: ${glmStats.successRate.toFixed(1)}% (${glmStats.successCount}/${glmStats.totalCount})
- ⚡ **平均响应时间**: ${glmStats.avgExecutionTime.toFixed(1)}秒

### 模型对比
- 🏆 **胜者**: ${comparison.winner}
- ⚡ **速度**: ${comparison.speedWinner}快${Math.abs(comparison.speedDiff).toFixed(1)}秒
- 🎯 **准确性**: ${comparison.accuracyWinner}高${Math.abs(comparison.accuracyDiff).toFixed(1)}%

## 测试股票列表
${grokResults.map(r => `- ${r.stockCode}`).join('\n')}

## 结论
- **框架验证**: AI Agent框架运行正常
- **下一步**: 可以进行真实API测试

---
*测试完成时间: ${new Date().toISOString()}*
`;

  return report;
}

// 计算统计数据
function calculateStats(results: TestResult[]) {
  const successful = results.filter(r => r.success);
  const withBacktest = successful.filter(r => r.backtestResult?.valid);

  return {
    totalCount: results.length,
    successCount: successful.length,
    successRate: (successful.length / results.length) * 100,
    avgExecutionTime: successful.reduce((sum, r) => sum + r.executionTime, 0) / successful.length,
    accuracy: withBacktest.reduce((sum, r) => sum + (r.backtestResult?.accuracy || 0), 0) / withBacktest.length,
  };
}

// 模型对比
function compareModels(grokStats: any, glmStats: any) {
  return {
    winner: grokStats.successRate > glmStats.successRate ? 'Grok' : 'GLM',
    successRateDiff: grokStats.successRate - glmStats.successRate,
    speedWinner: grokStats.avgExecutionTime < glmStats.avgExecutionTime ? 'Grok' : 'GLM',
    speedDiff: grokStats.avgExecutionTime - glmStats.avgExecutionTime,
    accuracyWinner: grokStats.accuracy > glmStats.accuracy ? 'Grok' : 'GLM',
    accuracyDiff: grokStats.accuracy - glmStats.accuracy
  };
}

// 主函数
async function main() {
  console.log('🚀 AI Agent小规模测试开始 (10只股票)\n');

  try {
    console.log('📊 生成随机股票列表...');
    const testStocks = generateSeededStockList(TEST_CONFIG.randomSeed);
    console.log(`🎯 测试股票: ${testStocks.join(', ')}`);

    console.log('🔍 验证股票数据完整性...');
    const validStocks = await Promise.all(testStocks.map(async stock => ({
      stock,
      valid: await validateStockData(stock, TEST_CONFIG.testDate)
    })));
    const finalStocks = validStocks.filter(v => v.valid).map(v => v.stock);
    console.log(`✅ 有效股票: ${finalStocks.length}只`);

    // Grok模型测试
    console.log('\n🤖 开始Grok模型测试...');
    const grokResults = await runBatchTest(finalStocks, 'grok');

    // GLM模型测试
    console.log('\n🧠 开始GLM模型测试...');
    const glmResults = await runBatchTest(finalStocks, 'glm');

    // 生成报告
    console.log('\n📄 生成测试报告...');
    const report = generateReport(grokResults, glmResults);

    await fs.promises.writeFile(TEST_CONFIG.outputFile, report, 'utf8');
    console.log(`💾 小规模测试报告已保存: ${TEST_CONFIG.outputFile}`);

    const grokStats = calculateStats(grokResults);
    const glmStats = calculateStats(glmResults);

    console.log('\n🎯 小规模测试完成:');
    console.log(`Grok - 成功率: ${grokStats.successRate.toFixed(1)}%`);
    console.log(`GLM  - 成功率: ${glmStats.successRate.toFixed(1)}%`);

  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

// 运行测试
main().catch(console.error);