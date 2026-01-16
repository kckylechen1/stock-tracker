/**
 * Grok API 连接测试
 */

import { describe, it, expect } from "vitest";
import axios from "axios";
import { ENV } from "./_core/env";

describe("Grok API Connection", () => {
  it("should successfully connect to xAI Grok API", async () => {
    if (!ENV.grokApiKey) {
      throw new Error("XAI_API_KEY is not configured");
    }

    const response = await axios.post(
      `${ENV.grokApiUrl}/chat/completions`,
      {
        model: ENV.grokModel,
        messages: [{ role: "user", content: 'Hello, respond with just "OK"' }],
        max_tokens: 10,
        temperature: 0,
      },
      {
        headers: {
          Authorization: `Bearer ${ENV.grokApiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty("choices");
    expect(response.data.choices.length).toBeGreaterThan(0);
    expect(response.data.choices[0]).toHaveProperty("message");
  }, 30000);
});
