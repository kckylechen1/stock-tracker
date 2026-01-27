/**
 * SmartAgent 测试脚本
 *
 * 用法: npx tsx server/test_smart_agent.ts
 */

import { createSmartAgent } from "./_core/agent";
import { getSessionStore } from "./_core/session";
import { getMemoryStore } from "./_core/memory";
import { getSkillRegistry } from "./_core/skills";

async function testBasicAnalysis() {
  console.log("\n" + "=".repeat(60));
  console.log("测试 1: 基础分析");
  console.log("=".repeat(60));

  const agent = createSmartAgent({
    stockCode: "002594",
    useOrchestrator: false,
    verbose: true,
  });

  const response = await agent.chat("帮我分析一下比亚迪的技术面");
  console.log("\n📝 回答:\n", response.slice(0, 500) + "...");

  console.log("\n✅ Session ID:", agent.getSessionId());
}

async function testOrchestrator() {
  console.log("\n" + "=".repeat(60));
  console.log("测试 2: Orchestrator 子任务派发");
  console.log("=".repeat(60));

  const agent = createSmartAgent({
    stockCode: "002594",
    useOrchestrator: true,
    verbose: true,
  });

  const response = await agent.chat(
    "帮我分析比亚迪，然后回测一下它的启动日信号"
  );
  console.log("\n📝 回答:\n", response.slice(0, 800) + "...");
}

async function testStreamMode() {
  console.log("\n" + "=".repeat(60));
  console.log("测试 3: 流式模式");
  console.log("=".repeat(60));

  const agent = createSmartAgent({
    stockCode: "600519",
    useOrchestrator: false,
    verbose: false,
  });

  console.log("\n📡 流式输出:");

  for await (const event of agent.stream("茅台能不能买？")) {
    switch (event.type) {
      case "thinking":
        console.log(`  💭 ${event.data}`);
        break;
      case "tool_call":
        console.log(`  🔧 调用: ${event.data.name}`);
        break;
      case "tool_result":
        console.log(
          `  📊 结果: ${event.data.name} (${event.data.result.length} 字符)`
        );
        break;
      case "content":
        console.log(`  📝 内容: ${event.data.slice(0, 200)}...`);
        break;
      case "done":
        console.log(`  ✅ 完成: ${JSON.stringify(event.data)}`);
        break;
    }
  }
}

async function testMemory() {
  console.log("\n" + "=".repeat(60));
  console.log("测试 4: Memory 系统");
  console.log("=".repeat(60));

  const memoryStore = getMemoryStore();

  memoryStore.addLesson(
    "追高买入容易被套，要等回调再入场",
    ["追高", "回调", "入场"],
    "002594"
  );

  memoryStore.addFact(
    "比亚迪是新能源汽车龙头",
    ["比亚迪", "新能源", "龙头"],
    "002594"
  );

  const memories = memoryStore.recall("比亚迪能买吗", {
    stockCode: "002594",
    limit: 5,
  });

  console.log("\n🧠 检索到的记忆:");
  for (const m of memories) {
    console.log(`  - [${m.type}] ${m.content}`);
  }

  const context = memoryStore.generateContextInjection("能不能买", "002594");
  console.log("\n📋 生成的上下文:\n", context);
}

async function testSkills() {
  console.log("\n" + "=".repeat(60));
  console.log("测试 5: Skill 系统");
  console.log("=".repeat(60));

  const skillRegistry = getSkillRegistry();

  console.log("\n📚 已注册技能:");
  for (const skill of skillRegistry.listSkills()) {
    console.log(`  - ${skill.name}: ${skill.description}`);
  }

  const testQueries = [
    "帮我分析一下茅台",
    "写个比亚迪的研究报告",
    "回测一下启动日信号",
    "今天有什么好股票",
  ];

  console.log("\n🎯 技能匹配测试:");
  for (const query of testQueries) {
    const match = skillRegistry.getBestMatch(query);
    console.log(`  "${query}" → ${match?.name || "无匹配"}`);
  }
}

async function testSession() {
  console.log("\n" + "=".repeat(60));
  console.log("测试 6: Session 持久化");
  console.log("=".repeat(60));

  const sessionStore = getSessionStore();

  const session = sessionStore.createSession("000001");
  console.log(`\n📦 创建会话: ${session.id}`);

  sessionStore.addMessage(session.id, {
    role: "user",
    content: "平安银行怎么样？",
  });

  sessionStore.addMessage(session.id, {
    role: "assistant",
    content: "平安银行目前技术面走势良好...",
  });

  const messages = sessionStore.getMessages(session.id);
  console.log(`📝 会话消息数: ${messages.length}`);

  const markdown = sessionStore.exportToMarkdown(session.id);
  console.log(`📄 导出 Markdown (${markdown.length} 字符)`);

  const sessions = sessionStore.listSessions();
  console.log(`📚 总会话数: ${sessions.length}`);
}

async function main() {
  console.log("🚀 SmartAgent 系统测试\n");

  try {
    await testMemory();
    await testSkills();
    await testSession();
    await testBasicAnalysis();
    await testStreamMode();

    console.log("\n" + "=".repeat(60));
    console.log("✅ 所有测试完成");
    console.log("=".repeat(60));
  } catch (error: any) {
    console.error("\n❌ 测试失败:", error.message);
    console.error(error.stack);
  }
}

main();
