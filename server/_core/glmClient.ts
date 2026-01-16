/**
 * GLM AI 客户端
 * 使用智谱AI的 GLM-4.7 作为备用/对比分析模型
 *
 * 特点：
 * - 国产模型，响应稳定
 * - 深度分析能力强
 * - 适合生成详细的投资报告
 */

import { ENV } from "./env";

// ==================== 类型定义 ====================

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GLMResponse {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface GLMStreamChunk {
  id: string;
  choices: Array<{
    delta: {
      role?: string;
      content?: string;
    };
    finish_reason: string | null;
  }>;
}

// ==================== GLM 客户端 ====================

/**
 * 验证 API Key 是否包含非 ASCII 字符
 */
function validateApiKey(apiKey: string): void {
  const hasNonAscii = /[^\x00-\x7F]/.test(apiKey);
  if (hasNonAscii) {
    console.error("[GLM] API Key contains non-ASCII characters!");
    console.error("[GLM] First 20 chars:", apiKey.substring(0, 20));
    throw new Error("GLM API Key 包含非 ASCII 字符，请检查 .env 文件");
  }
}

/**
 * 调用 GLM API
 */
async function callGLMAPI(
  messages: ChatMessage[],
  options: {
    stream?: boolean;
    maxTokens?: number;
    temperature?: number;
  } = {}
): Promise<Response> {
  const apiKey = ENV.glmApiKey;

  // 验证 API Key
  validateApiKey(apiKey);

  const { stream = false, maxTokens = 4096, temperature = 0.7 } = options;

  const response = await fetch(`${ENV.glmApiUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: ENV.glmModel,
      messages,
      stream,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GLM API Error: ${response.status} - ${error}`);
  }

  return response;
}

/**
 * GLM 对话（非流式）
 */
export async function chatWithGLM(
  messages: ChatMessage[],
  options: {
    systemPrompt?: string;
    maxTokens?: number;
    temperature?: number;
  } = {}
): Promise<string> {
  const { systemPrompt, maxTokens = 4096, temperature = 0.7 } = options;

  const fullMessages: ChatMessage[] = systemPrompt
    ? [{ role: "system", content: systemPrompt }, ...messages]
    : messages;

  const response = await callGLMAPI(fullMessages, {
    stream: false,
    maxTokens,
    temperature,
  });
  const data: GLMResponse = await response.json();

  return data.choices[0]?.message?.content || "";
}

/**
 * GLM 流式对话
 */
export async function* streamChatWithGLM(
  messages: ChatMessage[],
  options: {
    systemPrompt?: string;
    maxTokens?: number;
    temperature?: number;
  } = {}
): AsyncGenerator<string> {
  const { systemPrompt, maxTokens = 4096, temperature = 0.7 } = options;

  const fullMessages: ChatMessage[] = systemPrompt
    ? [{ role: "system", content: systemPrompt }, ...messages]
    : messages;

  const response = await callGLMAPI(fullMessages, {
    stream: true,
    maxTokens,
    temperature,
  });
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) {
    throw new Error("No response body");
  }

  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6);
        if (data === "[DONE]") continue;

        try {
          const parsed: GLMStreamChunk = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            yield content;
          }
        } catch {
          // Ignore parse errors
        }
      }
    }
  }
}

/**
 * 使用 GLM 进行股票分析
 */
export async function analyzeStockWithGLM(
  stockName: string,
  stockData?: string
): Promise<string> {
  const now = new Date();
  const dateStr = now.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  const systemPrompt = `你是一位专业的A股投资分析师，有丰富的市场分析经验。

【当前日期】${dateStr}

【你的风格】
- 分析深入全面，有理有据
- 给出具体的投资建议和目标价位
- 提示相关风险
- 使用结构化的格式呈现分析结果

${stockData ? `【股票数据参考】\n${stockData}` : ""}

【分析框架】
1. 主营业务与行业地位
2. 竞争优势（护城河）
3. 财务分析与估值
4. 风险因素
5. 投资建议与目标价`;

  const userMessage = stockData
    ? `请分析"${stockName}"这只股票的投资价值。`
    : `请分析"${stockName}"这只股票的投资价值，包括主营业务、竞争优势、估值分析和投资建议。`;

  return chatWithGLM([{ role: "user", content: userMessage }], {
    systemPrompt,
    maxTokens: 4096,
  });
}

/**
 * 使用 GLM 生成投资报告
 */
export async function generateReportWithGLM(
  stockName: string,
  analysisData: string
): Promise<string> {
  const systemPrompt = `你是一位专业的投资研究员，擅长撰写投资研究报告。
请根据提供的数据，生成一份结构完整、逻辑清晰的投资分析报告。

【报告格式要求】
1. 投资评级（买入/增持/持有/减持/卖出）
2. 公司概况
3. 行业分析
4. 财务分析
5. 估值分析
6. 风险提示
7. 投资建议`;

  return chatWithGLM(
    [
      {
        role: "user",
        content: `请为"${stockName}"生成投资分析报告。\n\n【分析数据】\n${analysisData}`,
      },
    ],
    { systemPrompt, maxTokens: 4096 }
  );
}

/**
 * 测试 GLM 连接
 */
export async function testGLMConnection(): Promise<{
  success: boolean;
  model: string;
  message: string;
  latency?: number;
}> {
  const startTime = Date.now();

  try {
    const response = await chatWithGLM(
      [{ role: "user", content: "你好，请用一句话介绍自己。" }],
      { maxTokens: 100 }
    );

    const latency = Date.now() - startTime;

    return {
      success: true,
      model: ENV.glmModel,
      message: response.slice(0, 100),
      latency,
    };
  } catch (error: any) {
    return {
      success: false,
      model: ENV.glmModel,
      message: error.message,
    };
  }
}

/**
 * 对比 GLM 和 Grok 的分析结果
 */
export async function compareWithGrok(
  question: string,
  grokResponse: string
): Promise<{
  glmResponse: string;
  comparison: string;
}> {
  // 先获取 GLM 的回答
  const glmResponse = await chatWithGLM([{ role: "user", content: question }], {
    maxTokens: 4096,
  });

  // 让 GLM 对比两个回答
  const comparisonPrompt = `请对比以下两个AI对同一问题的回答，指出各自的优缺点：

【问题】
${question}

【Grok的回答】
${grokResponse}

【GLM的回答】
${glmResponse}

请简要对比两者的：
1. 信息准确性
2. 分析深度
3. 实用性`;

  const comparison = await chatWithGLM(
    [{ role: "user", content: comparisonPrompt }],
    { maxTokens: 1000 }
  );

  return { glmResponse, comparison };
}
