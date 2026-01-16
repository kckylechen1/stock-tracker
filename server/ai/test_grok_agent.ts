/**
 * 测试 Grok Agent 主从架构
 * Grok 命令 Qwen3 获取中际旭创数据
 */

import { grokAgentChat } from "../_core/grokAgent";

async function main() {
  console.log("\n" + "🚀".repeat(20));
  console.log("   测试 Grok Agent 主从架构");
  console.log("   Grok（指挥官）→ Qwen3（奴隶）→ Tools");
  console.log("🚀".repeat(20));

  const startTime = Date.now();

  try {
    const response = await grokAgentChat(
      "中际旭创今天跌了，我买入后亏了，应该止损还是持有？",
      "300308"
    );

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log("\n" + "=".repeat(60));
    console.log("🎯 最终回答");
    console.log("=".repeat(60));
    console.log(response);
    console.log("\n" + "=".repeat(60));
    console.log(`⏱️ 总耗时: ${elapsed}s`);
    console.log("=".repeat(60));
  } catch (error: any) {
    console.error("\n❌ 错误:", error.message);
  }
}

main();
