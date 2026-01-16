/**
 * AI 模型配置中心
 *
 * 统一管理所有模型的参数配置
 */

import { ENV } from "./env";

/**
 * 模型类型
 */
export type ModelType = "grok" | "deepseek" | "qwen_worker" | "qwen_classifier";

/**
 * 模型配置接口
 */
export interface ModelConfig {
  model: string;
  apiUrl: string;
  apiKey: string;
  temperature: number;
  maxTokens: number;
  topP: number;
}

/**
 * 获取模型配置
 */
export function getModelConfig(type: ModelType): ModelConfig {
  switch (type) {
    case "grok":
      return {
        model: ENV.grokModel || "grok-4-1-fast-reasoning",
        apiUrl: `${ENV.grokApiUrl}/chat/completions`,
        apiKey: ENV.grokApiKey,
        temperature: 1.0, // 高温度，丰富的回答
        maxTokens: 4096,
        topP: 0.95,
      };

    case "deepseek":
      return {
        model: "deepseek-ai/DeepSeek-V3",
        apiUrl: `${ENV.forgeApiUrl}/v1/chat/completions`,
        apiKey: ENV.forgeApiKey,
        temperature: 0.8,
        maxTokens: 4096,
        topP: 0.9,
      };

    case "qwen_worker":
      return {
        model: "Qwen/Qwen3-32B",
        apiUrl: `${ENV.forgeApiUrl}/v1/chat/completions`,
        apiKey: ENV.forgeApiKey,
        temperature: 0.2, // 低温度，稳定输出
        maxTokens: 2048,
        topP: 0.9,
      };

    case "qwen_classifier":
      return {
        model: "Qwen/Qwen2.5-32B-Instruct",
        apiUrl: `${ENV.forgeApiUrl}/v1/chat/completions`,
        apiKey: ENV.forgeApiKey,
        temperature: 0.1, // 极低温度，稳定分类
        maxTokens: 64,
        topP: 0.9,
      };

    default:
      throw new Error(`Unknown model type: ${type}`);
  }
}

/**
 * 模型用途说明
 */
export const MODEL_USAGE = {
  grok: {
    name: "Grok 4",
    role: "Primary Analyst",
    useCases: ["复杂股票分析", "交易决策建议", "多轮对话", "策略建议"],
  },
  deepseek: {
    name: "DeepSeek V3",
    role: "Backup Analyst",
    useCases: ["备用分析模型", "切换测试", "批量任务"],
  },
  qwen_worker: {
    name: "Qwen3-32B",
    role: "Data Worker",
    useCases: ["仪表盘数据获取", "后台数据刷新", "新闻聚合", "快速行情查询"],
  },
  qwen_classifier: {
    name: "Qwen2.5-32B-Instruct",
    role: "Intent Classifier",
    useCases: ["意图分类", "规则无法匹配时的兜底分类"],
  },
};
