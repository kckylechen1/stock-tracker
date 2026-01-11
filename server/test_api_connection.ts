/**
 * 快速API连接测试
 * 测试Grok和GLM API是否可用
 */

import { createSmartAgent } from './_core/agent';

async function testAPIConnection() {
  console.log('🔗 测试AI API连接...\n');

  const testStock = '002594'; // 比亚迪

  try {
    // 测试Grok API
    console.log('🤖 测试Grok API连接...');
    const grokAgent = createSmartAgent({
      stockCode: testStock,
      preferredModel: 'grok'
    });

    const grokQuery = '比亚迪最近怎么样？';
    console.log(`查询: ${grokQuery}`);

    const grokStart = Date.now();
    const grokResponse = await grokAgent.chat(grokQuery);
    const grokTime = Date.now() - grokStart;

    console.log(`✅ Grok响应时间: ${grokTime}ms`);
    console.log(`回答: ${grokResponse.substring(0, 100)}...\n`);

  } catch (error) {
    console.log(`❌ Grok API测试失败: ${error.message}\n`);
  }

  try {
    // 测试GLM API
    console.log('🧠 测试GLM API连接...');
    const glmAgent = createSmartAgent({
      stockCode: testStock,
      preferredModel: 'deepseek' // GLM暂时用deepseek替代
    });

    const glmQuery = '比亚迪最近怎么样？';
    console.log(`查询: ${glmQuery}`);

    const glmStart = Date.now();
    const glmResponse = await glmAgent.chat(glmQuery);
    const glmTime = Date.now() - glmStart;

    console.log(`✅ GLM响应时间: ${glmTime}ms`);
    console.log(`回答: ${glmResponse.substring(0, 100)}...\n`);

  } catch (error) {
    console.log(`❌ GLM API测试失败: ${error.message}\n`);
  }

  console.log('🔚 API连接测试完成');
}

// 运行测试
testAPIConnection().catch(console.error);