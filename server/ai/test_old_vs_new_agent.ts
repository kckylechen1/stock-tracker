/**
 * 新旧 Agent 架构对比测试
 *
 * 对比：
 * - 旧架构: grokAgent (Grok 直接工具调用)
 * - 新架构: SmartAgent (Claude Code 重构版本)
 *
 * 用法: npx tsx server/ai/test_old_vs_new_agent.ts
 */

import "dotenv/config";
import { grokAgentChat } from "../_core/grokAgent";
import { createSmartAgent } from "../_core/agent";

// ==================== 测试用例 ====================

interface TestCase {
  name: string;
  prompt: string;
  stockCode: string;
  description: string;
}

const TEST_CASES: TestCase[] = [
  {
    name: "简单查询",
    prompt: "比亚迪现在什么价格？",
    stockCode: "002594",
    description: "测试基础股价查询",
  },
  {
    name: "技术分析",
    prompt: "帮我分析一下技术面，现在能买吗？",
    stockCode: "002594",
    description: "测试技术分析能力",
  },
  {
    name: "综合分析",
    prompt: "我想买比亚迪，帮我全面分析一下行情、技术面和资金流向",
    stockCode: "002594",
    description: "测试多工具调用能力",
  },
  {
    name: "交易决策",
    prompt: "中际旭创今天跌了，我买入后亏了，应该止损还是持有？",
    stockCode: "300308",
    description: "测试复杂交易建议场景",
  },
];

// ==================== 结果类型 ====================

interface TestResult {
  architecture: "old" | "new";
  testCase: string;
  success: boolean;
  latency: number;
  outputLength: number;
  output: string;
  error?: string;
}

// ==================== 测试旧架构 ====================

async function testOldArchitecture(testCase: TestCase): Promise<TestResult> {
  const startTime = Date.now();

  try {
    const response = await grokAgentChat(testCase.prompt, testCase.stockCode);

    return {
      architecture: "old",
      testCase: testCase.name,
      success: true,
      latency: Date.now() - startTime,
      outputLength: response.length,
      output: response,
    };
  } catch (error: any) {
    return {
      architecture: "old",
      testCase: testCase.name,
      success: false,
      latency: Date.now() - startTime,
      outputLength: 0,
      output: "",
      error: error.message,
    };
  }
}

// ==================== 测试新架构 ====================

async function testNewArchitecture(testCase: TestCase): Promise<TestResult> {
  const startTime = Date.now();

  try {
    const agent = createSmartAgent({
      stockCode: testCase.stockCode,
      useOrchestrator: false, // 先测试基础 Agent
      verbose: false,
    });

    const response = await agent.chat(testCase.prompt);
    agent.cleanup();

    return {
      architecture: "new",
      testCase: testCase.name,
      success: true,
      latency: Date.now() - startTime,
      outputLength: response.length,
      output: response,
    };
  } catch (error: any) {
    return {
      architecture: "new",
      testCase: testCase.name,
      success: false,
      latency: Date.now() - startTime,
      outputLength: 0,
      output: "",
      error: error.message,
    };
  }
}

// ==================== 对比单个测试 ====================

async function runSingleComparison(
  testCase: TestCase
): Promise<{ old: TestResult; new: TestResult }> {
  console.log(`\n${"─".repeat(70)}`);
  console.log(`📝 测试: ${testCase.name}`);
  console.log(`   描述: ${testCase.description}`);
  console.log(`   问题: "${testCase.prompt}"`);
  console.log(`   股票: ${testCase.stockCode}`);
  console.log("─".repeat(70));

  // 测试旧架构
  console.log("\n🔷 运行旧架构 (grokAgent)...");
  const oldResult = await testOldArchitecture(testCase);

  if (oldResult.success) {
    console.log(
      `   ✅ 成功 | 耗时: ${(oldResult.latency / 1000).toFixed(2)}s | 输出: ${oldResult.outputLength} 字符`
    );
    console.log(
      `   📄 摘要: ${oldResult.output.slice(0, 150).replace(/\n/g, " ")}...`
    );
  } else {
    console.log(`   ❌ 失败: ${oldResult.error}`);
  }

  // 测试新架构
  console.log("\n🟢 运行新架构 (SmartAgent)...");
  const newResult = await testNewArchitecture(testCase);

  if (newResult.success) {
    console.log(
      `   ✅ 成功 | 耗时: ${(newResult.latency / 1000).toFixed(2)}s | 输出: ${newResult.outputLength} 字符`
    );
    console.log(
      `   📄 摘要: ${newResult.output.slice(0, 150).replace(/\n/g, " ")}...`
    );
  } else {
    console.log(`   ❌ 失败: ${newResult.error}`);
  }

  return { old: oldResult, new: newResult };
}

// ==================== 主测试函数 ====================

async function main() {
  console.log("\n" + "═".repeat(70));
  console.log("🔬 新旧 Agent 架构对比测试");
  console.log("═".repeat(70));
  console.log(`\n📅 测试时间: ${new Date().toLocaleString("zh-CN")}`);
  console.log(`📌 旧架构: grokAgent (Grok 直接工具调用)`);
  console.log(`📌 新架构: SmartAgent (Claude Code 重构版)`);

  const allResults: { old: TestResult; new: TestResult }[] = [];

  // 运行所有测试
  for (const testCase of TEST_CASES) {
    try {
      const result = await runSingleComparison(testCase);
      allResults.push(result);
    } catch (error: any) {
      console.error(`\n❌ 测试 "${testCase.name}" 出错: ${error.message}`);
    }
  }

  // ==================== 汇总统计 ====================

  console.log("\n\n" + "═".repeat(70));
  console.log("📊 汇总统计");
  console.log("═".repeat(70));

  const oldResults = allResults.map(r => r.old);
  const newResults = allResults.map(r => r.new);

  const summarize = (results: TestResult[], name: string) => {
    const successCount = results.filter(r => r.success).length;
    const successResults = results.filter(r => r.success);
    const avgLatency =
      successResults.length > 0
        ? successResults.reduce((acc, r) => acc + r.latency, 0) /
          successResults.length
        : 0;
    const avgOutputLength =
      successResults.length > 0
        ? successResults.reduce((acc, r) => acc + r.outputLength, 0) /
          successResults.length
        : 0;

    console.log(`\n【${name}】`);
    console.log(
      `   成功率: ${successCount}/${results.length} (${((successCount / results.length) * 100).toFixed(0)}%)`
    );
    console.log(`   平均耗时: ${(avgLatency / 1000).toFixed(2)}s`);
    console.log(`   平均输出长度: ${avgOutputLength.toFixed(0)} 字符`);

    return { successCount, avgLatency, avgOutputLength };
  };

  const oldStats = summarize(oldResults, "旧架构 (grokAgent)");
  const newStats = summarize(newResults, "新架构 (SmartAgent)");

  // ==================== 对比表格 ====================

  console.log("\n\n📋 详细对比表\n");
  console.log(
    "| 测试用例   | 旧架构状态 | 旧架构耗时 | 旧架构输出 | 新架构状态 | 新架构耗时 | 新架构输出 |"
  );
  console.log(
    "|------------|-----------|-----------|-----------|-----------|-----------|-----------|"
  );

  for (const result of allResults) {
    const oldStatus = result.old.success ? "✅" : "❌";
    const newStatus = result.new.success ? "✅" : "❌";
    const oldLatency = result.old.success
      ? `${(result.old.latency / 1000).toFixed(1)}s`
      : "N/A";
    const newLatency = result.new.success
      ? `${(result.new.latency / 1000).toFixed(1)}s`
      : "N/A";
    const oldLen = result.old.success ? `${result.old.outputLength}字` : "N/A";
    const newLen = result.new.success ? `${result.new.outputLength}字` : "N/A";

    console.log(
      `| ${result.old.testCase.padEnd(10)} | ${oldStatus.padEnd(9)} | ${oldLatency.padEnd(9)} | ${oldLen.padEnd(9)} | ${newStatus.padEnd(9)} | ${newLatency.padEnd(9)} | ${newLen.padEnd(9)} |`
    );
  }

  // ==================== 结论 ====================

  console.log("\n\n" + "═".repeat(70));
  console.log("🎯 对比结论");
  console.log("═".repeat(70));

  // 成功率对比
  if (oldStats.successCount >= newStats.successCount) {
    console.log(
      `\n✅ 成功率: 旧架构 ${oldStats.successCount}/${oldResults.length} vs 新架构 ${newStats.successCount}/${newResults.length}`
    );
  } else {
    console.log(
      `\n✅ 成功率: 新架构领先 (${newStats.successCount}/${newResults.length} vs ${oldStats.successCount}/${oldResults.length})`
    );
  }

  // 速度对比
  const speedDiff =
    ((oldStats.avgLatency - newStats.avgLatency) / oldStats.avgLatency) * 100;
  if (newStats.avgLatency < oldStats.avgLatency) {
    console.log(
      `⚡ 速度: 新架构快 ${Math.abs(speedDiff).toFixed(1)}% (${(newStats.avgLatency / 1000).toFixed(2)}s vs ${(oldStats.avgLatency / 1000).toFixed(2)}s)`
    );
  } else {
    console.log(
      `⚡ 速度: 旧架构快 ${Math.abs(speedDiff).toFixed(1)}% (${(oldStats.avgLatency / 1000).toFixed(2)}s vs ${(newStats.avgLatency / 1000).toFixed(2)}s)`
    );
  }

  // 输出质量
  if (newStats.avgOutputLength > oldStats.avgOutputLength) {
    console.log(
      `📝 输出详细度: 新架构更详细 (${newStats.avgOutputLength.toFixed(0)} vs ${oldStats.avgOutputLength.toFixed(0)} 字符)`
    );
  } else {
    console.log(
      `📝 输出详细度: 旧架构更详细 (${oldStats.avgOutputLength.toFixed(0)} vs ${newStats.avgOutputLength.toFixed(0)} 字符)`
    );
  }

  // 总体建议
  console.log("\n📌 建议:");
  if (
    newStats.successCount >= oldStats.successCount &&
    newStats.avgLatency <= oldStats.avgLatency * 1.2
  ) {
    console.log("   新架构表现良好，建议切换到新架构");
    console.log("   优势: Session 持久化 + Memory 系统 + Skill 系统");
  } else if (newStats.successCount < oldStats.successCount) {
    console.log("   新架构成功率较低，需要调试后再切换");
    console.log("   建议: 检查 SmartAgent 的工具调用逻辑");
  } else {
    console.log("   两者表现相近，新架构有更好的扩展性");
    console.log("   建议: 完成 API 集成后切换到新架构");
  }

  console.log("\n" + "═".repeat(70));
  console.log("✨ 测试完成");
  console.log("═".repeat(70) + "\n");
}

main().catch(console.error);
