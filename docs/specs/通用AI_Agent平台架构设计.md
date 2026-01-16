# 通用 AI Agent 平台架构设计

**版本**: v1.0  
**日期**: 2026-01-15  
**作者**: Claude (Amp)  
**目的**: 构建可复用的 AI Agent 平台，支持股票分析、资产评估等多业务场景

---

## 一、背景与目标

### 1.1 当前问题

你现在的 bot 与 grok.com 的差距：

| 能力       | grok.com                                 | 你的 bot                |
| ---------- | ---------------------------------------- | ----------------------- |
| 模型       | **Grok 4** (2025年7月发布，原生工具调用) | grok-4-1-fast-reasoning |
| Web 搜索   | ✅ 内置 ($5/1000次)                      | ❌ 无                   |
| 网页爬取   | ✅ 自动抓取分析                          | ❌ 无                   |
| 代码执行   | ✅ Python 沙箱 ($5/1000次)               | ❌ 无                   |
| 自主决策   | ReAct Loop + 原生工具使用                | 预定义工具流程          |
| 上下文窗口 | 256K tokens (API)                        | 同                      |

> **重要**: Grok 4 是 xAI 最新发布的模型（2025年7月），使用强化学习训练，具备原生工具使用能力。grok.com 现在使用的就是 Grok 4。

### 1.2 设计目标

1. **自主性**: Agent 能自己决定需要什么工具，而不是按预设流程执行
2. **代码执行**: 在 Docker 沙箱中安全执行 LLM 生成的代码
3. **可扩展**: 同一套架构支持股票分析、资产评估等多业务场景
4. **工具复用**: 成功执行的脚本可保存为可复用工具

---

## 1.3 xAI Grok 模型现状 (2025年7月更新)

### 可用模型

| 模型             | 能力           | 上下文 | 特点                   | 定价 (输入/输出)      |
| ---------------- | -------------- | ------ | ---------------------- | --------------------- |
| **grok-4**       | 文本+图像+工具 | 256K   | 最强推理，原生工具使用 | $3/$15 /M tokens      |
| **grok-4-heavy** | 多 Agent 并行  | 256K   | 多智能体，最高准确率   | $30/$150 /M tokens    |
| **grok-3**       | 文本+图像      | 128K   | 通用任务               | $3/$15 /M tokens      |
| **grok-3-mini**  | 文本           | 128K   | 快速响应               | $0.30/$0.50 /M tokens |

### Grok 4 的原生工具

xAI API 已内置以下工具（服务端执行）：

| 工具                   | 价格         | 说明                |
| ---------------------- | ------------ | ------------------- |
| **Web Search**         | $5/1000次    | 互联网搜索+网页浏览 |
| **X Search**           | $5/1000次    | X/Twitter 帖子搜索  |
| **Code Execution**     | $5/1000次    | Python 代码执行环境 |
| **Document Search**    | $5/1000次    | 上传文档搜索        |
| **Collections Search** | $2.50/1000次 | 知识库 RAG 搜索     |

### 关键结论

1. **grok.com 使用 Grok 4**，不是 Grok 3
2. **Grok 4 已内置工具调用**，可直接使用 API 的 server-side tools
3. **你可以不自建沙箱**，直接用 xAI 的 Code Execution 工具
4. **知识截止日期**: 2024年11月

### 两种实现路径

| 路径                   | 优点                 | 缺点                      | 推荐场景             |
| ---------------------- | -------------------- | ------------------------- | -------------------- |
| **A: 用 xAI 内置工具** | 零开发成本、立即可用 | 按次付费、受限于 xAI 能力 | 快速验证、小规模使用 |
| **B: 自建工具层**      | 完全控制、成本可控   | 开发工作量大              | 大规模生产、定制需求 |

**建议**: 先用路径 A 验证效果，后续根据成本和需求决定是否自建。

---

## 二、技术选型分析

### 2.1 框架选择：自建 vs 现有框架

| 方案                    | 优点                         | 缺点                           | 推荐场景               |
| ----------------------- | ---------------------------- | ------------------------------ | ---------------------- |
| **自建 (推荐)**         | 完全控制、无抽象开销、可定制 | 需要更多开发时间               | 你已有 Agent 基础架构  |
| **LangChain/LangGraph** | 生态丰富、600+ 集成          | 抽象重、学习曲线陡、过度工程化 | 快速原型、需要大量集成 |
| **CrewAI**              | 简单易用、角色化             | 灵活性差、社区小               | 简单多 Agent 场景      |
| **AutoGen (Microsoft)** | 多 Agent 协作强              | 文档少、生态小                 | 复杂对话式协作         |

**推荐**: 继续使用你现有的自建架构，扩展能力层。原因：

- 你已有完整的 SmartAgent + Orchestrator + SkillRegistry 体系
- 自建架构更轻量，无框架抽象开销
- 完全控制 Agent Loop 逻辑

### 2.2 代码执行沙箱选择

| 方案            | 启动速度 | 安全性 | 成本       | 推荐场景           |
| --------------- | -------- | ------ | ---------- | ------------------ |
| **E2B**         | ~200ms   | 高     | 按使用付费 | 生产环境、快速集成 |
| **Docker 自建** | ~1-2s    | 高     | 自托管免费 | 完全控制、预算有限 |
| **Modal**       | ~500ms   | 高     | 按使用付费 | GPU 密集型任务     |
| **Daytona**     | ~27ms    | 高     | 按使用付费 | 极速启动场景       |

**推荐**: Docker 自建 + 可选 E2B 备用

- Docker 自建：完全控制、无额外成本
- E2B：作为备用方案，生产级可靠性

### 2.3 向量数据库选择

| 方案       | 特点                      | 推荐场景         |
| ---------- | ------------------------- | ---------------- |
| **Chroma** | 轻量、嵌入式、Python 原生 | 小规模、快速上手 |
| **Qdrant** | 高性能、Rust 实现         | 中大规模生产环境 |
| **Milvus** | 企业级、分布式            | 大规模向量检索   |

**推荐**: Phase 1 用 Chroma，后续可迁移 Qdrant

---

## 三、整体架构设计

```
┌─────────────────────────────────────────────────────────────────────┐
│                        AI Agent Platform                            │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │
│  │ 股票分析Bot │  │ 资产评估Bot │  │ 其他业务Bot │  ← 业务层        │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                  │
│         │                │                │                          │
│  ┌──────┴────────────────┴────────────────┴──────┐                  │
│  │              SmartAgent (入口)                 │  ← Agent 核心   │
│  │   ┌─────────────────────────────────────┐    │                  │
│  │   │        ReAct Loop Controller        │    │                  │
│  │   │  (自主决策：思考→行动→观察→循环)    │    │                  │
│  │   └─────────────────────────────────────┘    │                  │
│  └──────────────────┬───────────────────────────┘                  │
│                     │                                               │
│  ┌──────────────────┼───────────────────────────────────────────┐  │
│  │                  ↓                                            │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐│  │
│  │  │ WebSearch│ │ReadPage │ │CodeExec │ │ RAG     │ │ToolCall ││  │
│  │  │ 搜索工具 │ │网页爬取 │ │代码执行 │ │ 向量检索│ │ 业务工具││  │
│  │  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘│  │
│  │       │           │           │           │           │      │  │
│  │  ┌────┴───────────┴───────────┴───────────┴───────────┴────┐│  │
│  │  │                  Tool Registry (工具注册中心)           ││  │
│  │  └─────────────────────────────────────────────────────────┘│  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    基础设施层                                 │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐            │  │
│  │  │ Docker  │ │ Vector  │ │ Memory  │ │ Skill   │            │  │
│  │  │ Sandbox │ │ DB      │ │ Store   │ │ Store   │            │  │
│  │  │ 代码沙箱│ │ Chroma  │ │ 记忆系统│ │ 技能库  │            │  │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘            │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 四、核心组件详细设计

### 4.1 ReAct Loop Controller (核心改造)

**现状问题**: 你现在的 Orchestrator 是预设流程，不是真正的 ReAct Loop。

**改造方案**:

```typescript
// server/_core/agent/react-loop.ts

interface ThoughtAction {
  thought: string; // 模型的思考过程
  action: string; // 决定执行的工具
  actionInput: any; // 工具参数
}

interface Observation {
  result: string; // 工具执行结果
  success: boolean;
}

export class ReActLoopController {
  private maxIterations = 10;

  async *run(userMessage: string): AsyncGenerator<StreamEvent> {
    let iteration = 0;
    let context = this.buildInitialContext(userMessage);

    while (iteration < this.maxIterations) {
      iteration++;

      // Step 1: 思考 - 让模型决定下一步
      yield { type: "thinking", data: `迭代 ${iteration}: 分析中...` };

      const decision = await this.think(context);

      // Step 2: 检查是否应该结束
      if (decision.action === "FINISH") {
        yield { type: "content", data: decision.thought };
        yield { type: "done", data: { iterations: iteration } };
        return;
      }

      // Step 3: 执行动作
      yield { type: "tool_call", data: { name: decision.action } };

      const observation = await this.act(decision);

      yield {
        type: "tool_result",
        data: {
          name: decision.action,
          ok: observation.success,
          preview: observation.result.slice(0, 200),
        },
      };

      // Step 4: 更新上下文
      context = this.updateContext(context, decision, observation);
    }

    yield { type: "error", data: "达到最大迭代次数" };
  }

  private async think(context: string): Promise<ThoughtAction> {
    // 调用 LLM，让它自己决定下一步
    const response = await this.callLLM(context, REACT_SYSTEM_PROMPT);
    return this.parseThoughtAction(response);
  }

  private async act(decision: ThoughtAction): Promise<Observation> {
    const tool = this.toolRegistry.get(decision.action);
    if (!tool) {
      return { result: `工具 ${decision.action} 不存在`, success: false };
    }

    try {
      const result = await tool.execute(decision.actionInput);
      return { result, success: true };
    } catch (error) {
      return { result: error.message, success: false };
    }
  }
}
```

**ReAct System Prompt**:

```typescript
const REACT_SYSTEM_PROMPT = `你是一个智能 Agent，通过 思考-行动-观察 循环来解决问题。

## 可用工具

{tools_description}

## 输出格式

每次回复必须按以下格式：

Thought: [你的思考过程，分析当前情况，决定下一步]
Action: [工具名称，或 FINISH 表示完成]
Action Input: [工具参数的 JSON]

## 示例

用户: 帮我查一下中际旭创的龙虎榜数据

Thought: 用户想查中际旭创的龙虎榜数据。我需要先搜索网页获取最新信息。
Action: web_search
Action Input: {"query": "中际旭创 龙虎榜 最新"}

[工具返回结果后]

Thought: 搜索结果显示需要访问东方财富网获取详细数据。我来读取这个网页。
Action: read_webpage
Action Input: {"url": "https://data.eastmoney.com/..."}

[工具返回结果后]

Thought: 我已经获取到了龙虎榜数据，可以给用户总结了。
Action: FINISH
Action Input: {}

## 重要规则

1. 每次只执行一个 Action
2. 根据 Observation 结果决定下一步
3. 如果工具失败，尝试其他方法
4. 当问题解决后，使用 FINISH 结束
`;
```

### 4.2 Web 搜索工具

```typescript
// server/_core/tools/web-search.ts

import { z } from "zod";

export const webSearchTool = {
  name: "web_search",
  description: "搜索互联网获取最新信息",
  parameters: z.object({
    query: z.string().describe("搜索关键词"),
    maxResults: z.number().optional().default(5),
  }),

  async execute(args: { query: string; maxResults?: number }): Promise<string> {
    // 方案 1: Tavily API (推荐，专为 AI Agent 设计)
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.TAVILY_API_KEY}`,
      },
      body: JSON.stringify({
        query: args.query,
        max_results: args.maxResults || 5,
        include_answer: true,
        include_raw_content: false,
      }),
    });

    const data = await response.json();

    // 格式化结果
    let result = `搜索结果 (${args.query}):\n\n`;

    if (data.answer) {
      result += `摘要: ${data.answer}\n\n`;
    }

    for (const item of data.results) {
      result += `- ${item.title}\n  ${item.url}\n  ${item.content.slice(0, 200)}...\n\n`;
    }

    return result;
  },
};
```

**搜索 API 选择**:

| API                 | 价格       | 特点                           | 推荐度     |
| ------------------- | ---------- | ------------------------------ | ---------- |
| **Tavily**          | $0.01/搜索 | 专为 AI Agent 设计，返回结构化 | ⭐⭐⭐⭐⭐ |
| **SerpAPI**         | $50/月起   | Google 搜索结果                | ⭐⭐⭐⭐   |
| **Bing Search API** | $7/1000次  | 微软官方                       | ⭐⭐⭐     |
| **DuckDuckGo**      | 免费       | 无需 API Key，但限制多         | ⭐⭐       |

### 4.3 网页爬取工具

```typescript
// server/_core/tools/read-webpage.ts

import { z } from "zod";
import * as cheerio from "cheerio";
import TurndownService from "turndown";

export const readWebpageTool = {
  name: "read_webpage",
  description: "读取并解析网页内容",
  parameters: z.object({
    url: z.string().describe("网页 URL"),
    selector: z.string().optional().describe("可选的 CSS 选择器"),
  }),

  async execute(args: { url: string; selector?: string }): Promise<string> {
    try {
      const response = await fetch(args.url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; DragonFlyBot/1.0)",
        },
      });

      const html = await response.text();
      const $ = cheerio.load(html);

      // 移除无用元素
      $("script, style, nav, footer, header, aside").remove();

      // 提取内容
      let content: string;
      if (args.selector) {
        content = $(args.selector).html() || "";
      } else {
        content = $("main, article, .content, body").first().html() || "";
      }

      // 转换为 Markdown
      const turndown = new TurndownService();
      const markdown = turndown.turndown(content);

      // 限制长度
      return markdown.slice(0, 10000);
    } catch (error) {
      return `读取网页失败: ${error.message}`;
    }
  },
};
```

### 4.4 Docker 代码执行沙箱

#### 4.4.1 Docker 配置

```dockerfile
# docker/python-sandbox/Dockerfile

FROM python:3.11-slim

# 安装常用库
RUN pip install --no-cache-dir \
    pandas numpy matplotlib seaborn \
    requests beautifulsoup4 lxml \
    akshare yfinance \
    openpyxl xlsxwriter \
    python-docx reportlab

# 创建非 root 用户
RUN useradd -m -s /bin/bash sandbox
USER sandbox
WORKDIR /home/sandbox

# 设置资源限制
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
```

```yaml
# docker/docker-compose.sandbox.yml

version: "3.8"
services:
  python-sandbox:
    build: ./python-sandbox
    mem_limit: 512m
    cpus: 1
    network_mode: bridge # 允许网络访问
    read_only: true
    tmpfs:
      - /tmp:size=100m
    security_opt:
      - no-new-privileges:true
```

#### 4.4.2 代码执行服务

```typescript
// server/_core/tools/code-executor.ts

import Docker from "dockerode";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import * as fs from "fs";
import * as path from "path";

const docker = new Docker();

export const codeExecutorTool = {
  name: "execute_code",
  description: "在安全沙箱中执行 Python 代码",
  parameters: z.object({
    code: z.string().describe("要执行的 Python 代码"),
    timeout: z.number().optional().default(30),
  }),

  async execute(args: { code: string; timeout?: number }): Promise<string> {
    const executionId = uuidv4();
    const tempDir = `/tmp/sandbox-${executionId}`;
    const codePath = path.join(tempDir, "script.py");

    try {
      // 1. 创建临时目录和代码文件
      fs.mkdirSync(tempDir, { recursive: true });
      fs.writeFileSync(codePath, args.code);

      // 2. 创建容器
      const container = await docker.createContainer({
        Image: "dragonfly-python-sandbox:latest",
        Cmd: ["python", "/code/script.py"],
        HostConfig: {
          Binds: [`${tempDir}:/code:ro`],
          Memory: 512 * 1024 * 1024, // 512MB
          NanoCpus: 1e9, // 1 CPU
          NetworkMode: "bridge",
          AutoRemove: true,
        },
        User: "sandbox",
      });

      // 3. 启动容器
      await container.start();

      // 4. 等待执行完成（带超时）
      const timeout = args.timeout || 30;
      const result = await Promise.race([
        container.wait(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("执行超时")), timeout * 1000)
        ),
      ]);

      // 5. 获取输出
      const logs = await container.logs({
        stdout: true,
        stderr: true,
      });

      const output = logs.toString("utf8");

      // 6. 检查是否有生成的文件
      const files = fs.readdirSync(tempDir).filter(f => f !== "script.py");

      let response = `执行结果:\n${output}`;
      if (files.length > 0) {
        response += `\n\n生成的文件: ${files.join(", ")}`;
      }

      return response;
    } catch (error) {
      return `执行失败: ${error.message}`;
    } finally {
      // 清理临时目录
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  },
};
```

#### 4.4.3 代码生成 Agent

```typescript
// server/_core/agent/agents/code-generator-agent.ts

export class CodeGeneratorAgent extends BaseAgent {
  constructor() {
    super({
      name: "CodeGenerator",
      description: "生成 Python 代码来完成数据获取和分析任务",
      systemPrompt: CODE_GENERATOR_PROMPT,
      tools: [], // 代码生成不需要工具
      temperature: 0.2,
    });
  }
}

const CODE_GENERATOR_PROMPT = `你是一个 Python 代码生成专家。

## 任务
根据用户需求生成 Python 代码。代码将在沙箱环境中执行。

## 可用库
- pandas, numpy: 数据处理
- matplotlib, seaborn: 可视化
- requests, beautifulsoup4: 网页爬取
- akshare: A股数据
- openpyxl, xlsxwriter: Excel 处理
- python-docx, reportlab: 文档生成

## 代码规范
1. 代码必须是完整可执行的
2. 使用 print() 输出结果
3. 图片保存到 /tmp/output.png
4. 处理异常情况
5. 添加中文注释

## 示例

用户需求: 获取贵州茅台最近30天的股价

\`\`\`python
import akshare as ak
import pandas as pd

try:
    # 获取贵州茅台(600519)历史数据
    df = ak.stock_zh_a_hist(symbol="600519", period="daily", adjust="qfq")
    
    # 取最近30天
    df_recent = df.tail(30)[['日期', '收盘', '成交量']]
    
    print("贵州茅台最近30天股价:")
    print(df_recent.to_string(index=False))
    
    # 计算统计信息
    print(f"\\n均价: {df_recent['收盘'].mean():.2f}")
    print(f"最高: {df_recent['收盘'].max():.2f}")
    print(f"最低: {df_recent['收盘'].min():.2f}")
    
except Exception as e:
    print(f"获取数据失败: {e}")
\`\`\`

现在，根据以下需求生成代码:
`;
```

### 4.5 工具注册中心

```typescript
// server/_core/tools/tool-registry.ts

import { z } from "zod";

export interface Tool {
  name: string;
  description: string;
  parameters: z.ZodType<any>;
  execute: (args: any) => Promise<string>;
  category?: "search" | "fetch" | "execute" | "analyze" | "business";
}

export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  register(tool: Tool): void {
    this.tools.set(tool.name, tool);
    console.log(`[ToolRegistry] Registered: ${tool.name}`);
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  list(): Tool[] {
    return Array.from(this.tools.values());
  }

  /**
   * 生成工具描述供 LLM 使用
   */
  generateToolsDescription(): string {
    const lines: string[] = [];

    for (const tool of this.tools.values()) {
      const schema = this.zodToJsonSchema(tool.parameters);
      lines.push(`### ${tool.name}`);
      lines.push(`描述: ${tool.description}`);
      lines.push(`参数: ${JSON.stringify(schema, null, 2)}`);
      lines.push("");
    }

    return lines.join("\n");
  }

  /**
   * 生成 OpenAI 格式的工具定义
   */
  generateOpenAITools(): any[] {
    return Array.from(this.tools.values()).map(tool => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: this.zodToJsonSchema(tool.parameters),
      },
    }));
  }

  private zodToJsonSchema(schema: z.ZodType<any>): any {
    // 简化实现，实际可用 zod-to-json-schema 库
    return {
      type: "object",
      properties: {}, // 需要解析 zod schema
    };
  }
}

// 全局实例
let globalToolRegistry: ToolRegistry | null = null;

export function getToolRegistry(): ToolRegistry {
  if (!globalToolRegistry) {
    globalToolRegistry = new ToolRegistry();

    // 注册核心工具
    globalToolRegistry.register(webSearchTool);
    globalToolRegistry.register(readWebpageTool);
    globalToolRegistry.register(codeExecutorTool);
  }
  return globalToolRegistry;
}
```

### 4.6 向量数据库集成 (可选)

```typescript
// server/_core/vector/chroma-store.ts

import { ChromaClient, Collection } from "chromadb";

export class VectorStore {
  private client: ChromaClient;
  private collections: Map<string, Collection> = new Map();

  constructor() {
    this.client = new ChromaClient({
      path: process.env.CHROMA_URL || "http://localhost:8000",
    });
  }

  async getOrCreateCollection(name: string): Promise<Collection> {
    if (!this.collections.has(name)) {
      const collection = await this.client.getOrCreateCollection({
        name,
        metadata: { "hnsw:space": "cosine" },
      });
      this.collections.set(name, collection);
    }
    return this.collections.get(name)!;
  }

  /**
   * 存储工具/脚本供复用
   */
  async storeScript(script: {
    id: string;
    code: string;
    description: string;
    tags: string[];
  }): Promise<void> {
    const collection = await this.getOrCreateCollection("scripts");

    await collection.add({
      ids: [script.id],
      documents: [script.description],
      metadatas: [
        {
          code: script.code,
          tags: script.tags.join(","),
          createdAt: new Date().toISOString(),
        },
      ],
    });
  }

  /**
   * 搜索相似脚本
   */
  async searchScripts(query: string, limit = 5): Promise<any[]> {
    const collection = await this.getOrCreateCollection("scripts");

    const results = await collection.query({
      queryTexts: [query],
      nResults: limit,
    });

    return results.ids[0].map((id, i) => ({
      id,
      description: results.documents[0][i],
      code: results.metadatas[0][i].code,
      tags: results.metadatas[0][i].tags.split(","),
    }));
  }

  /**
   * 存储记忆（替代 keyword 检索）
   */
  async storeMemory(memory: {
    id: string;
    content: string;
    type: string;
    stockCode?: string;
  }): Promise<void> {
    const collection = await this.getOrCreateCollection("memories");

    await collection.add({
      ids: [memory.id],
      documents: [memory.content],
      metadatas: [
        {
          type: memory.type,
          stockCode: memory.stockCode || "",
          createdAt: new Date().toISOString(),
        },
      ],
    });
  }

  /**
   * 语义检索记忆
   */
  async searchMemories(
    query: string,
    options?: {
      type?: string;
      stockCode?: string;
      limit?: number;
    }
  ): Promise<any[]> {
    const collection = await this.getOrCreateCollection("memories");

    const where: any = {};
    if (options?.type) where.type = options.type;
    if (options?.stockCode) where.stockCode = options.stockCode;

    const results = await collection.query({
      queryTexts: [query],
      nResults: options?.limit || 10,
      where: Object.keys(where).length > 0 ? where : undefined,
    });

    return results.ids[0].map((id, i) => ({
      id,
      content: results.documents[0][i],
      ...results.metadatas[0][i],
    }));
  }
}
```

---

## 五、业务场景适配

### 5.1 股票分析 Bot (当前)

```typescript
// server/_core/bots/stock-bot.ts

export function createStockBot(config: BotConfig) {
  const agent = new SmartAgent({
    ...config,
    preloadedContext: STOCK_CONTEXT,
  });

  // 注册股票专用工具
  const registry = getToolRegistry();
  registry.register(getStockQuoteTool);
  registry.register(analyzeTechnicalTool);
  registry.register(getFundFlowTool);
  registry.register(getLonghuBangTool);

  return agent;
}

const STOCK_CONTEXT = `你是一个专业的股票分析助手。

## 专长
- 技术分析：K线形态、均线、MACD等
- 资金分析：主力资金、北向资金
- 龙虎榜分析
- 短线操作建议

## 风格
- 简洁直接，不废话
- 给出明确的操作建议
- 风险提示`;
```

### 5.2 资产评估 Bot (新增)

```typescript
// server/_core/bots/valuation-bot.ts

export function createValuationBot(config: BotConfig) {
  const agent = new SmartAgent({
    ...config,
    preloadedContext: VALUATION_CONTEXT,
  });

  // 注册资产评估专用工具
  const registry = getToolRegistry();
  registry.register(getCompanyInfoTool);
  registry.register(getFinancialStatementsTool);
  registry.register(calculateDCFTool);
  registry.register(comparableCompaniesTool);
  registry.register(generateReportTool);

  return agent;
}

const VALUATION_CONTEXT = `你是一个专业的资产评估师助手。

## 专长
- 企业价值评估：DCF、市盈率法、市净率法
- 资产评估：固定资产、无形资产
- 评估报告撰写：符合《资产评估准则》

## 评估报告结构
1. 声明
2. 摘要
3. 委托人/被评估单位
4. 评估目的
5. 评估对象和范围
6. 价值类型
7. 评估基准日
8. 评估依据
9. 评估方法
10. 评估程序
11. 评估假设
12. 评估结论
13. 特别事项说明
14. 附件

## 输出格式
- 正式、专业
- 符合法规要求
- 数据有据可查`;
```

---

## 五-B、快速方案：使用 xAI 内置工具 (推荐先尝试)

既然 xAI API 已经内置了 Web Search、Code Execution 等工具，可以直接使用，无需自建：

### 5B.1 启用 xAI Server-Side Tools

xAI API 使用 OpenAI 兼容格式，tools 参数非常简单：

```typescript
// server/_core/agent/grok-native-tools.ts

import { ENV } from "../env";

/**
 * xAI Server-Side Tools 格式（来自官方文档）
 *
 * 服务端工具（自动执行）:
 *   { "type": "web_search" }
 *   { "type": "x_search" }
 *   { "type": "code_execution" }
 *
 * 客户端工具（需要你执行）:
 *   { "type": "function", "name": "...", "parameters": {...} }
 */

export async function callGrokWithTools(
  messages: any[],
  options: {
    enableWebSearch?: boolean;
    enableCodeExecution?: boolean;
    enableXSearch?: boolean;
  } = {}
): Promise<any> {
  // 构建服务端工具列表 - 格式非常简单！
  const tools: any[] = [];

  if (options.enableWebSearch) {
    tools.push({ type: "web_search" });
  }

  if (options.enableCodeExecution) {
    tools.push({ type: "code_execution" });
  }

  if (options.enableXSearch) {
    tools.push({ type: "x_search" });
  }

  const response = await fetch(`${ENV.grokApiUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ENV.grokApiKey}`,
    },
    body: JSON.stringify({
      model: "grok-4-1-fast", // 推荐用于工具调用
      messages,
      tools: tools.length > 0 ? tools : undefined,
      stream: true, // 推荐启用流式以查看工具调用过程
    }),
  });

  return response.json();
}

/**
 * 混合使用服务端工具 + 客户端工具
 *
 * 服务端工具: xAI 自动执行（web_search, code_execution）
 * 客户端工具: 返回给你执行（如调用本地股票 API）
 */
export function buildMixedTools(options: {
  enableWebSearch?: boolean;
  enableCodeExecution?: boolean;
  clientTools?: Array<{
    name: string;
    description: string;
    parameters: any;
  }>;
}): any[] {
  const tools: any[] = [];

  // 服务端工具
  if (options.enableWebSearch) {
    tools.push({ type: "web_search" });
  }
  if (options.enableCodeExecution) {
    tools.push({ type: "code_execution" });
  }

  // 客户端工具（你的业务工具）
  for (const tool of options.clientTools || []) {
    tools.push({
      type: "function",
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    });
  }

  return tools;
}
```

### 5B.1.1 使用示例 (OpenAI SDK 兼容)

```typescript
// 使用 OpenAI SDK 调用 xAI API（官方推荐方式）
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.XAI_API_KEY,
  baseURL: "https://api.x.ai/v1",
});

// 简单示例：启用 web_search 和 code_execution
const response = await client.chat.completions.create({
  model: "grok-4-1-fast",
  messages: [{ role: "user", content: "帮我查一下中际旭创最近的龙虎榜数据" }],
  tools: [
    { type: "web_search" }, // xAI 自动执行网页搜索
    { type: "code_execution" }, // xAI 自动执行 Python 代码
  ],
  stream: true,
});

// 流式处理响应
for await (const chunk of response) {
  // 查看工具调用
  if (chunk.choices[0]?.delta?.tool_calls) {
    console.log("Tool call:", chunk.choices[0].delta.tool_calls);
  }
  // 输出内容
  if (chunk.choices[0]?.delta?.content) {
    process.stdout.write(chunk.choices[0].delta.content);
  }
}
```

### 5B.2 集成到 SmartAgent

```typescript
// 修改 smart-agent.ts 的 chat 方法

async chat(userMessage: string): Promise<{
  response: string;
  toolCalls: string[];
  iterations: number;
}> {
  // ... 现有代码 ...

  // 使用 Grok 4 原生工具
  const response = await callGrokWithTools(
    [
      { role: 'system', content: this.buildSystemPrompt() },
      { role: 'user', content: enhancedMessage },
    ],
    {
      enableWebSearch: true,      // 启用网页搜索
      enableCodeExecution: true,  // 启用代码执行
    }
  );

  // 解析响应
  const content = response.choices[0].message.content;
  const toolsUsed = response.usage?.tool_invocations || [];

  return {
    response: content,
    toolCalls: toolsUsed.map((t: any) => t.tool_name),
    iterations: 1,
  };
}
```

### 5B.3 成本估算

假设每天 100 次对话，每次对话平均：

- 输入 2000 tokens, 输出 1000 tokens
- 1 次 Web Search
- 0.5 次 Code Execution

| 项目           | 单价    | 日用量 | 日成本    |
| -------------- | ------- | ------ | --------- |
| 输入 tokens    | $3/M    | 200K   | $0.60     |
| 输出 tokens    | $15/M   | 100K   | $1.50     |
| Web Search     | $5/1000 | 100次  | $0.50     |
| Code Execution | $5/1000 | 50次   | $0.25     |
| **日合计**     |         |        | **$2.85** |
| **月合计**     |         |        | **~$85**  |

### 5B.4 何时切换到自建方案

当满足以下条件时，考虑自建：

1. 月调用量 > 10000 次（工具费用 > $500/月）
2. 需要执行 xAI 不支持的 Python 库
3. 需要执行时间 > 30秒 的任务
4. 需要访问内部 API 或数据库

---

## 六、实施计划

### 推荐路径：快速验证 → 按需自建

```
Phase 0 (1-2天)     Phase 1 (1周)         Phase 2 (按需)
   ↓                    ↓                      ↓
使用 xAI 内置工具  →  验证效果和成本  →  决定是否自建
   ↓                    ↓                      ↓
grok-4 + tools     评估用户反馈       Docker沙箱/向量DB
```

### Phase 0: 快速验证 (1-2 天) ⭐ 推荐先做

| 任务              | 时间   | 产出                   |
| ----------------- | ------ | ---------------------- |
| 升级模型到 grok-4 | 2 小时 | 修改 env.ts            |
| 启用 xAI 内置工具 | 4 小时 | `grok-native-tools.ts` |
| 集成到 SmartAgent | 4 小时 | 修改 smart-agent.ts    |
| 测试验证          | 4 小时 | 验证搜索、代码执行     |

**产出**: Bot 立即具备 Web 搜索和代码执行能力，零基础设施成本。

### Phase 1: 自建核心能力 (如需) (1-2 周)

| 任务            | 时间 | 产出                            |
| --------------- | ---- | ------------------------------- |
| ReAct Loop 改造 | 3 天 | `react-loop.ts`                 |
| Web 搜索工具    | 1 天 | `web-search.ts` + Tavily 集成   |
| 网页爬取工具    | 1 天 | `read-webpage.ts`               |
| Docker 沙箱     | 2 天 | Dockerfile + `code-executor.ts` |
| 工具注册中心    | 1 天 | `tool-registry.ts`              |
| 集成测试        | 2 天 | 端到端测试                      |

### Phase 2: 增强能力 (1 周)

| 任务           | 时间 | 产出                      |
| -------------- | ---- | ------------------------- |
| 代码生成 Agent | 2 天 | `code-generator-agent.ts` |
| 脚本持久化     | 1 天 | 成功脚本保存复用          |
| Chroma 集成    | 2 天 | `chroma-store.ts`         |
| 记忆系统升级   | 2 天 | 语义检索替代关键词        |

### Phase 3: 业务扩展 (1 周)

| 任务           | 时间 | 产出                   |
| -------------- | ---- | ---------------------- |
| 资产评估工具集 | 3 天 | 财务分析、估值计算工具 |
| 报告生成工具   | 2 天 | Word/PDF 输出          |
| Bot 工厂模式   | 2 天 | 快速创建新业务 Bot     |

---

## 七、关键依赖

### 7.1 需要安装的包

```bash
# 核心依赖
pnpm add dockerode cheerio turndown

# 可选：向量数据库
pnpm add chromadb

# 可选：文档生成
pnpm add docx pdfkit
```

### 7.2 需要配置的环境变量

```bash
# .env

# 搜索 API (选一个)
TAVILY_API_KEY=tvly-xxx
# 或
SERPAPI_KEY=xxx

# 向量数据库 (可选)
CHROMA_URL=http://localhost:8000

# Docker 配置
DOCKER_HOST=unix:///var/run/docker.sock
```

### 7.3 需要构建的 Docker 镜像

```bash
# 构建 Python 沙箱镜像
docker build -t dragonfly-python-sandbox:latest ./docker/python-sandbox
```

---

## 八、风险与缓解

| 风险          | 影响       | 缓解措施               |
| ------------- | ---------- | ---------------------- |
| Docker 启动慢 | 用户体验差 | 预热容器池、考虑 E2B   |
| 代码执行安全  | 系统被攻击 | 严格资源限制、网络隔离 |
| 搜索 API 成本 | 费用增加   | 缓存结果、限制频率     |
| LLM 决策错误  | 无限循环   | 最大迭代限制、人工干预 |

---

## 九、参考资源

### 9.1 代码沙箱

- [E2B](https://e2b.dev) - 生产级 AI 代码执行
- [Modal](https://modal.com) - Serverless AI 计算
- [Daytona](https://daytona.io) - 极速沙箱

### 9.2 Agent 框架

- [LangChain](https://langchain.com) - 最大生态
- [AutoGen](https://microsoft.github.io/autogen/) - 微软多 Agent
- [CrewAI](https://crewai.com) - 简单角色化

### 9.3 搜索 API

- [Tavily](https://tavily.com) - AI 专用搜索
- [SerpAPI](https://serpapi.com) - Google 搜索

### 9.4 开源参考

- [Open Interpreter](https://github.com/openinterpreter/open-interpreter) - 本地代码执行
- [RooCode](https://marketplace.visualstudio.com/items?itemName=RooVeterinaryInc.roo-cline) - VSCode Agent

---

## 十、总结

本方案的核心思路是：

1. **保留现有架构**: 不引入重型框架，在现有 SmartAgent 基础上扩展
2. **补齐关键能力**: Web 搜索、网页爬取、代码执行
3. **改造决策逻辑**: 从预设流程改为 ReAct Loop 自主决策
4. **可选增强**: 向量数据库提升检索智能度
5. **业务复用**: 同一套核心能力，通过不同 Context 和工具集支持多业务

实施建议：

- **先做 Phase 1**，让 bot 具备基础自主能力
- **验证效果后**再做 Phase 2/3
- **向量数据库**可以后期加，不阻塞核心功能
