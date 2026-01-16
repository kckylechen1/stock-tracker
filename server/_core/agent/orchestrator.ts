/**
 * AgentOrchestrator - 主控制器
 *
 * 核心功能：
 * 1. 意图识别 - 判断用户请求类型
 * 2. 任务分解 - 复杂任务拆分为子任务
 * 3. Agent 调度 - 选择合适的 Agent 执行
 * 4. 结果聚合 - 整合多个 Agent 的输出
 */

import { BaseAgent } from "./base-agent";
import { TaskRunner } from "./task-runner";
import { ResearchAgent } from "./agents/research-agent";
import { AnalysisAgent } from "./agents/analysis-agent";
import { BacktestAgent } from "./agents/backtest-agent";
import type {
  TaskDefinition,
  TaskResult,
  StreamEvent,
  ToolDefinition,
} from "./types";

export interface OrchestratorConfig {
  verbose: boolean;
  maxSubTasks: number;
  enableParallelExecution: boolean;
}

const ORCHESTRATOR_TOOLS: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "spawn_task",
      description: "派发一个子任务给专用 Agent 执行。用于复杂任务的分解。",
      parameters: {
        type: "object",
        properties: {
          task_type: {
            type: "string",
            enum: ["research", "analysis", "backtest"],
            description:
              "Agent 类型: research=研究报告, analysis=技术分析, backtest=回测",
          },
          description: {
            type: "string",
            description: "任务简要描述",
          },
          prompt: {
            type: "string",
            description: "详细的任务指令",
          },
          context: {
            type: "object",
            description: "可选的上下文数据，如股票代码、日期范围等",
          },
        },
        required: ["task_type", "description", "prompt"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "spawn_parallel_tasks",
      description: "并行派发多个独立子任务。适合多个不相互依赖的分析。",
      parameters: {
        type: "object",
        properties: {
          tasks: {
            type: "array",
            items: {
              type: "object",
            },
            description:
              "任务数组，每个任务包含 task_type, description, prompt",
          },
        },
        required: ["tasks"],
      },
    },
  },
];

const ORCHESTRATOR_SYSTEM_PROMPT = `你是一个智能任务协调器，负责理解用户请求并分配给合适的专用 Agent。

## 可用的 Agent 类型

1. **research** - 研究 Agent
   - 擅长：收集多源数据、生成研究报告、对比分析
   - 适用场景：用户要求"研究一下"、"帮我调研"、"写个报告"

2. **analysis** - 分析 Agent  
   - 擅长：技术分析、资金分析、实时行情解读
   - 适用场景：用户问"这只股票怎么样"、"能不能买"、"技术面分析"

3. **backtest** - 回测 Agent
   - 擅长：历史信号验证、策略回测、统计分析
   - 适用场景：用户要求"测试这个信号"、"回测一下"、"验证策略"

## 工作原则

1. **简单问题直接回答**：如果问题简单，不需要派发子任务
2. **复杂任务要分解**：涉及多个维度分析时，拆分为多个子任务
3. **并行优先**：独立的子任务应该并行执行
4. **结果整合**：收到子任务结果后，综合整理给用户

## 示例

用户: "帮我分析比亚迪，然后回测一下最近的信号准不准"
→ 应该派发两个任务:
  1. analysis: 分析比亚迪技术面和资金面
  2. backtest: 回测比亚迪近期信号

用户: "002594 技术面怎么看"
→ 简单问题，派发单个 analysis 任务即可
`;

export class AgentOrchestrator extends BaseAgent {
  private taskRunner: TaskRunner;
  private orchestratorConfig: OrchestratorConfig;
  private subTaskResults: Map<string, TaskResult>;

  constructor(config: Partial<OrchestratorConfig> = {}) {
    super({
      name: "Orchestrator",
      description: "主控制器 - 负责任务分解和调度",
      systemPrompt: ORCHESTRATOR_SYSTEM_PROMPT,
      tools: ORCHESTRATOR_TOOLS,
      maxIterations: 15,
      temperature: 0.3,
    });

    this.orchestratorConfig = {
      verbose: true,
      maxSubTasks: 5,
      enableParallelExecution: true,
      ...config,
    };

    this.taskRunner = new TaskRunner(type => this.createAgent(type), {
      verbose: this.orchestratorConfig.verbose,
    });

    this.subTaskResults = new Map();
    this.registerOrchestratorTools();
  }

  /**
   * 创建专用 Agent
   */
  private createAgent(type: string): BaseAgent {
    switch (type) {
      case "research":
        return new ResearchAgent();
      case "analysis":
        return new AnalysisAgent();
      case "backtest":
        return new BacktestAgent();
      default:
        return new AnalysisAgent();
    }
  }

  /**
   * 注册 Orchestrator 专用工具
   */
  private registerOrchestratorTools(): void {
    this.registerTool("spawn_task", async args => {
      const task: TaskDefinition = {
        id: `task_${Date.now()}`,
        description: args.description,
        prompt: args.prompt,
        agentType: args.task_type,
        context: args.context,
      };

      const result = await this.taskRunner.runTask(task);
      this.subTaskResults.set(task.id, result);

      if (result.success) {
        return `【子任务完成: ${args.description}】\n\n${result.result}`;
      } else {
        return `【子任务失败: ${args.description}】\n错误: ${result.error}`;
      }
    });

    this.registerTool("spawn_parallel_tasks", async args => {
      const tasks: TaskDefinition[] = args.tasks.map((t: any, i: number) => ({
        id: `task_${Date.now()}_${i}`,
        description: t.description,
        prompt: t.prompt,
        agentType: t.task_type,
        context: t.context,
      }));

      if (tasks.length > this.orchestratorConfig.maxSubTasks) {
        return `任务数量超过限制 (最多 ${this.orchestratorConfig.maxSubTasks} 个)`;
      }

      const results = await this.taskRunner.runParallel(tasks);

      for (const result of results) {
        this.subTaskResults.set(result.id, result);
      }

      const output = results.map((r, i) => {
        const task = tasks[i];
        if (r.success) {
          return `### ✅ ${task.description}\n\n${r.result}`;
        } else {
          return `### ❌ ${task.description}\n\n错误: ${r.error}`;
        }
      });

      return `【并行任务完成: ${results.filter(r => r.success).length}/${results.length} 成功】\n\n${output.join("\n\n---\n\n")}`;
    });
  }

  /**
   * 流式执行（覆盖基类方法，增加子任务事件）
   */
  async *stream(userMessage: string): AsyncGenerator<StreamEvent> {
    this.state.messages.push({ role: "user", content: userMessage });
    yield { type: "thinking", data: "分析请求..." };

    while (
      this.state.iteration < (this.config as any).maxIterations &&
      !this.state.isComplete
    ) {
      this.state.iteration++;

      try {
        const response = await this.callLLM();

        if (response.tool_calls && response.tool_calls.length > 0) {
          for (const tc of response.tool_calls) {
            const args = JSON.parse(tc.function.arguments || "{}");

            if (tc.function.name === "spawn_task") {
              yield {
                type: "task_start",
                data: {
                  type: args.task_type,
                  description: args.description,
                },
              };
            } else if (tc.function.name === "spawn_parallel_tasks") {
              yield {
                type: "task_start",
                data: {
                  type: "parallel",
                  count: args.tasks?.length || 0,
                },
              };
            }

            yield { type: "tool_call", data: { name: tc.function.name } };
          }

          this.state.messages.push({
            role: "assistant",
            content: response.content || "",
            tool_calls: response.tool_calls,
          });

          for (const tc of response.tool_calls) {
            const executor = this.toolExecutors.get(tc.function.name);
            if (executor) {
              const args = JSON.parse(tc.function.arguments || "{}");
              const result = await executor(args);

              this.state.messages.push({
                role: "tool",
                tool_call_id: tc.id,
                content: result,
              });

              yield {
                type: "task_complete",
                data: { success: true, preview: result.slice(0, 200) },
              };
            }
          }

          continue;
        }

        this.state.isComplete = true;
        yield { type: "content", data: response.content };
        yield {
          type: "done",
          data: {
            iterations: this.state.iteration,
            subTasks: this.subTaskResults.size,
          },
        };
        return;
      } catch (error: any) {
        yield { type: "error", data: error.message };

        if (this.state.iteration >= (this.config as any).maxIterations) {
          yield { type: "done", data: { error: error.message } };
          return;
        }
      }
    }

    yield { type: "done", data: { timeout: true } };
  }

  /**
   * 获取子任务执行报告
   */
  getSubTaskReport(): string {
    return this.taskRunner.summarizeResults();
  }

  /**
   * 清理状态
   */
  override reset(): void {
    super.reset();
    this.taskRunner.clear();
    this.subTaskResults.clear();
  }
}
