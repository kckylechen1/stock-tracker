/**
 * Agent 系统类型定义
 * 参考 Claude Code / OpenCode 架构
 */

// ==================== 消息类型 ====================

export type MessageRole = "system" | "user" | "assistant" | "tool";

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface AgentMessage {
  role: MessageRole;
  content: string;
  name?: string;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
}

// ==================== 工具类型 ====================

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<
        string,
        {
          type: string;
          description?: string;
          enum?: string[];
          items?: { type: string };
        }
      >;
      required?: string[];
    };
  };
}

export type ToolExecutor = (args: Record<string, any>) => Promise<string>;

// ==================== Agent 配置 ====================

export interface AgentConfig {
  name: string;
  description: string;
  systemPrompt: string;
  tools: ToolDefinition[];
  maxIterations: number;
  maxTokens: number;
  temperature: number;
  model?: string;
  verbose?: boolean;
  parallelToolCalls?: boolean;
  toolBudget?: {
    simple: number; // 简单问题工具预算
    complex: number; // 复杂问题工具预算
  };
}

// ==================== Agent 状态 ====================

export interface AgentState {
  messages: AgentMessage[];
  iteration: number;
  isComplete: boolean;
  toolResults: Map<string, any>;
  thinking: string[];
  startTime: number;
  error?: string;
  toolsUsed: number; // 已使用的工具数量
  queryComplexity?: "simple" | "complex"; // 查询复杂度
}

// ==================== 任务类型 ====================

export interface TaskDefinition {
  id: string;
  description: string;
  prompt: string;
  agentType?: "research" | "analysis" | "backtest" | "default";
  context?: Record<string, any>;
  dependencies?: string[];
  timeout?: number;
}

export interface TaskResult {
  id: string;
  success: boolean;
  result?: string;
  error?: string;
  duration: number;
  toolsUsed: string[];
  iterations: number;
}

// ==================== 流式输出 ====================

export type StreamEventType =
  | "thinking"
  | "tool_call"
  | "tool_result"
  | "content"
  | "error"
  | "done"
  | "task_start"
  | "task_complete";

export interface StreamEvent {
  type: StreamEventType;
  data: any;
  timestamp?: number;
}

// ==================== LLM 响应 ====================

export interface LLMResponse {
  content: string;
  tool_calls?: ToolCall[];
  finish_reason?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// ==================== Session 类型 ====================

export interface Session {
  id: string;
  createdAt: string;
  updatedAt: string;
  messages: AgentMessage[];
  metadata: {
    stockCode?: string;
    taskHistory: string[];
    tokenUsage: number;
  };
}

// ==================== Memory 类型 ====================

export interface MemoryEntry {
  id: string;
  type: "fact" | "lesson" | "preference" | "trade";
  content: string;
  embedding?: number[];
  createdAt: string;
  relevanceScore?: number;
  metadata?: Record<string, any>;
}

// ==================== Skill 类型 ====================

export interface Skill {
  name: string;
  description: string;
  triggers: string[];
  instructions: string;
  tools?: string[];
  examples?: string[];
}
