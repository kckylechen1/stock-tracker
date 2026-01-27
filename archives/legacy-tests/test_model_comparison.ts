/**
 * Grok vs GLM 模型对比测试
 *
 * 测试维度：
 * 1. Tool Call 成功率
 * 2. 响应延迟
 * 3. 输出稳定性
 * 4. 内容质量
 *
 * 用法: npx tsx server/test_model_comparison.ts
 */

import { ENV } from "./_core/env";
import { BaseAgent } from "./_core/agent/base-agent";
import { executeStockTool, stockTools } from "./_core/stockTools";
import type { ToolDefinition, AgentConfig } from "./_core/agent/types";

// ==================== 模型配置 ====================

const MODELS = {
  grok: {
    name: "Grok",
    apiUrl: ENV.grokApiUrl,
    apiKey: ENV.grokApiKey,
    model: ENV.grokModel || "grok-3-mini",
  },
  glm: {
    name: "GLM",
    apiUrl: ENV.glmApiUrl,
    apiKey: ENV.glmApiKey,
    model: ENV.glmModel || "glm-4-plus",
  },
};

// ==================== 测试用 Agent ====================

class TestAgent extends BaseAgent {
  private modelConfig: typeof MODELS.grok;

  constructor(modelType: "grok" | "glm") {
    const modelConfig = MODELS[modelType];

    const testTools: ToolDefinition[] = stockTools.filter(t =>
      [
        "get_stock_quote",
        "analyze_stock_technical",
        "get_fund_flow",
        "get_current_datetime",
      ].includes(t.function.name)
    ) as ToolDefinition[];

    super({
      name: `TestAgent-${modelConfig.name}`,
      description: `Test agent using ${modelConfig.name}`,
      systemPrompt: `你是一个股票分析助手。分析股票时必须调用工具获取数据，不要编造数据。`,
      tools: testTools,
      maxIterations: 5,
      temperature: 0.5,
      model: modelConfig.model,
      verbose: false,
    });

    this.modelConfig = modelConfig;
    this.registerTestTools();
  }

  private registerTestTools(): void {
    const toolNames = [
      "get_stock_quote",
      "analyze_stock_technical",
      "get_fund_flow",
      "get_current_datetime",
    ];
    for (const name of toolNames) {
      this.registerTool(name, async args => executeStockTool(name, args));
    }
  }

  protected override async callLLM() {
    const payload: any = {
      model: this.modelConfig.model,
      messages: this.state.messages,
      max_tokens: 4096,
      temperature: 0.5,
    };

    if (this.config.tools.length > 0) {
      payload.tools = this.config.tools;
      payload.tool_choice = "auto";
    }

    const response = await fetch(
      `${this.modelConfig.apiUrl}/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.modelConfig.apiKey}`,
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `${this.modelConfig.name} Error: ${response.status} - ${error.slice(0, 200)}`
      );
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message;

    return {
      content: message?.content || "",
      tool_calls: message?.tool_calls,
      usage: data.usage,
    };
  }
}

// ==================== 测试用例 ====================

interface TestResult {
  model: string;
  testCase: string;
  success: boolean;
  toolCallCount: number;
  toolsUsed: string[];
  latency: number;
  outputLength: number;
  error?: string;
  output?: string;
}

const TEST_CASES = [
  {
    name: "简单查询",
    prompt: "帮我查一下比亚迪的股价",
    expectedTools: ["get_stock_quote"],
  },
  {
    name: "技术分析",
    prompt: "分析一下 002594 的技术面",
    expectedTools: ["analyze_stock_technical"],
  },
  {
    name: "多工具调用",
    prompt: "全面分析比亚迪，包括行情、技术面和资金流向",
    expectedTools: [
      "get_stock_quote",
      "analyze_stock_technical",
      "get_fund_flow",
    ],
  },
  {
    name: "时间感知",
    prompt: "今天是几号？然后查一下茅台的股价",
    expectedTools: ["get_current_datetime", "get_stock_quote"],
  },
];

// ==================== 运行测试 ====================

async function runSingleTest(
  modelType: "grok" | "glm",
  testCase: (typeof TEST_CASES)[0]
): Promise<TestResult> {
  const startTime = Date.now();
  const agent = new TestAgent(modelType);

  try {
    const response = await agent.run(testCase.prompt);
    const stats = agent.getToolStats();

    return {
      model: MODELS[modelType].name,
      testCase: testCase.name,
      success: true,
      toolCallCount: stats.reduce((acc, s) => acc + s.count, 0),
      toolsUsed: stats.map(s => s.name),
      latency: Date.now() - startTime,
      outputLength: response.length,
      output: response.slice(0, 300),
    };
  } catch (error: any) {
    return {
      model: MODELS[modelType].name,
      testCase: testCase.name,
      success: false,
      toolCallCount: 0,
      toolsUsed: [],
      latency: Date.now() - startTime,
      outputLength: 0,
      error: error.message,
    };
  }
}

async function runComparisonTest() {
  console.log("🔬 Grok vs GLM 模型对比测试\n");
  console.log("=".repeat(70));

  // 检查 API Key
  if (!ENV.grokApiKey) {
    console.error("❌ GROK_API_KEY 未配置");
    return;
  }
  if (!ENV.glmApiKey) {
    console.error("❌ GLM_API_KEY 未配置");
    return;
  }

  console.log(`📌 Grok 模型: ${MODELS.grok.model}`);
  console.log(`📌 GLM 模型: ${MODELS.glm.model}\n`);

  const results: TestResult[] = [];

  for (const testCase of TEST_CASES) {
    console.log(`\n📝 测试: ${testCase.name}`);
    console.log(`   问题: "${testCase.prompt}"`);
    console.log("-".repeat(70));

    // 测试 Grok
    console.log("   🟢 运行 Grok...");
    const grokResult = await runSingleTest("grok", testCase);
    results.push(grokResult);

    if (grokResult.success) {
      console.log(
        `      ✅ 成功 | 延迟: ${grokResult.latency}ms | 工具: ${grokResult.toolsUsed.join(", ") || "无"}`
      );
      console.log(`      📄 输出: ${grokResult.output?.slice(0, 100)}...`);
    } else {
      console.log(`      ❌ 失败: ${grokResult.error}`);
    }

    // 测试 GLM
    console.log("   🔵 运行 GLM...");
    const glmResult = await runSingleTest("glm", testCase);
    results.push(glmResult);

    if (glmResult.success) {
      console.log(
        `      ✅ 成功 | 延迟: ${glmResult.latency}ms | 工具: ${glmResult.toolsUsed.join(", ") || "无"}`
      );
      console.log(`      📄 输出: ${glmResult.output?.slice(0, 100)}...`);
    } else {
      console.log(`      ❌ 失败: ${glmResult.error}`);
    }
  }

  // 汇总统计
  console.log("\n" + "=".repeat(70));
  console.log("📊 汇总统计\n");

  const grokResults = results.filter(r => r.model === "Grok");
  const glmResults = results.filter(r => r.model === "GLM");

  const summarize = (modelResults: TestResult[], name: string) => {
    const successCount = modelResults.filter(r => r.success).length;
    const avgLatency =
      modelResults
        .filter(r => r.success)
        .reduce((acc, r) => acc + r.latency, 0) / successCount || 0;
    const totalToolCalls = modelResults.reduce(
      (acc, r) => acc + r.toolCallCount,
      0
    );
    const avgOutputLength =
      modelResults
        .filter(r => r.success)
        .reduce((acc, r) => acc + r.outputLength, 0) / successCount || 0;

    console.log(`【${name}】`);
    console.log(
      `   成功率: ${successCount}/${modelResults.length} (${((successCount / modelResults.length) * 100).toFixed(0)}%)`
    );
    console.log(`   平均延迟: ${avgLatency.toFixed(0)}ms`);
    console.log(`   总工具调用: ${totalToolCalls}次`);
    console.log(`   平均输出长度: ${avgOutputLength.toFixed(0)}字符`);
    console.log("");
  };

  summarize(grokResults, "Grok");
  summarize(glmResults, "GLM");

  // 对比表格
  console.log("📋 详细对比表\n");
  console.log(
    "| 测试用例 | Grok 成功 | Grok 延迟 | Grok 工具数 | GLM 成功 | GLM 延迟 | GLM 工具数 |"
  );
  console.log(
    "|---------|----------|----------|------------|---------|---------|-----------|"
  );

  for (const testCase of TEST_CASES) {
    const grok = results.find(
      r => r.model === "Grok" && r.testCase === testCase.name
    )!;
    const glm = results.find(
      r => r.model === "GLM" && r.testCase === testCase.name
    )!;

    console.log(
      `| ${testCase.name.padEnd(8)} | ${grok.success ? "✅" : "❌"}       | ${String(grok.latency).padStart(7)}ms | ${String(grok.toolCallCount).padStart(10)} | ${glm.success ? "✅" : "❌"}      | ${String(glm.latency).padStart(6)}ms | ${String(glm.toolCallCount).padStart(9)} |`
    );
  }

  // 结论
  console.log("\n" + "=".repeat(70));
  console.log("🎯 结论\n");

  const grokSuccessRate =
    grokResults.filter(r => r.success).length / grokResults.length;
  const glmSuccessRate =
    glmResults.filter(r => r.success).length / glmResults.length;
  const grokAvgLatency =
    grokResults.filter(r => r.success).reduce((acc, r) => acc + r.latency, 0) /
      grokResults.filter(r => r.success).length || Infinity;
  const glmAvgLatency =
    glmResults.filter(r => r.success).reduce((acc, r) => acc + r.latency, 0) /
      glmResults.filter(r => r.success).length || Infinity;
  const grokTotalTools = grokResults.reduce(
    (acc, r) => acc + r.toolCallCount,
    0
  );
  const glmTotalTools = glmResults.reduce((acc, r) => acc + r.toolCallCount, 0);

  console.log(
    `Tool Call 稳定性: ${grokSuccessRate >= glmSuccessRate ? "🟢 Grok" : "🔵 GLM"} 更稳定 (${Math.max(grokSuccessRate, glmSuccessRate) * 100}%)`
  );
  console.log(
    `响应速度: ${grokAvgLatency <= glmAvgLatency ? "🟢 Grok" : "🔵 GLM"} 更快 (${Math.min(grokAvgLatency, glmAvgLatency).toFixed(0)}ms)`
  );
  console.log(
    `工具调用积极性: ${grokTotalTools >= glmTotalTools ? "🟢 Grok" : "🔵 GLM"} 更积极 (${Math.max(grokTotalTools, glmTotalTools)}次)`
  );
}

// ==================== 稳定性测试（同一问题多次运行）====================

async function runStabilityTest() {
  console.log("\n\n🔄 稳定性测试（同一问题运行3次）\n");
  console.log("=".repeat(70));

  const testPrompt = "分析比亚迪的技术面，给出买卖建议";
  const runs = 3;

  for (const modelType of ["grok", "glm"] as const) {
    console.log(`\n【${MODELS[modelType].name}】运行 ${runs} 次:\n`);

    const results: TestResult[] = [];

    for (let i = 0; i < runs; i++) {
      console.log(`   第 ${i + 1} 次...`);
      const result = await runSingleTest(modelType, {
        name: `稳定性测试-${i + 1}`,
        prompt: testPrompt,
        expectedTools: ["analyze_stock_technical"],
      });
      results.push(result);

      console.log(
        `      ${result.success ? "✅" : "❌"} | ${result.latency}ms | 工具: ${result.toolsUsed.join(", ") || "无"}`
      );
    }

    const successCount = results.filter(r => r.success).length;
    const latencies = results.filter(r => r.success).map(r => r.latency);
    const avgLatency =
      latencies.reduce((a, b) => a + b, 0) / latencies.length || 0;
    const latencyVariance =
      latencies.length > 1
        ? Math.sqrt(
            latencies.reduce((acc, l) => acc + Math.pow(l - avgLatency, 2), 0) /
              latencies.length
          )
        : 0;

    console.log(`\n   📊 统计:`);
    console.log(`      成功率: ${successCount}/${runs}`);
    console.log(`      平均延迟: ${avgLatency.toFixed(0)}ms`);
    console.log(`      延迟标准差: ${latencyVariance.toFixed(0)}ms`);
  }
}

// ==================== 主函数 ====================

async function main() {
  try {
    await runComparisonTest();
    await runStabilityTest();

    console.log("\n✅ 测试完成");
  } catch (error: any) {
    console.error("\n❌ 测试失败:", error.message);
    console.error(error.stack);
  }
}

main();
