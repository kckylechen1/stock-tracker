/**
 * 简单AI Agent测试 - 先验证基本功能
 */

import { createSmartAgent } from './_core/agent';

async function testBasicAgent() {
  console.log('🧪 测试基本AI Agent功能...\n');

  try {
    // 创建Agent
    console.log('🤖 创建SmartAgent...');
    const agent = createSmartAgent({
      stockCode: '002594', // 比亚迪
      preferredModel: 'grok'
    });

    // 测试简单查询
    console.log('📝 测试简单查询...');
    const query = '比亚迪最近怎么样？';
    console.log(`查询: ${query}`);

    const response = await agent.chat(query);
    console.log(`回答: ${response.substring(0, 200)}...\n`);

    console.log('✅ 基本功能测试通过！');

  } catch (error) {
    console.error('❌ 基本功能测试失败:', error);
    console.error('错误详情:', error.message);
    console.error('错误堆栈:', error.stack);
  }
}

// 运行测试
testBasicAgent().catch(console.error);