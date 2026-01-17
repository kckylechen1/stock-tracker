import { publicProcedure, router } from "../_core/trpc";
import * as eastmoney from "../eastmoney";
import { z } from "zod";

export const aiRouter = router({
  // 创建新会话
  createSession: publicProcedure
    .input(
      z.object({
        stockCode: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { getSessionStore } = await import("../_core/session");
      const sessionStore = getSessionStore();
      const session = sessionStore.createSession(input.stockCode);
      return { sessionId: session.id };
    }),

  // 获取聊天历史
  getHistory: publicProcedure
    .input(
      z
        .object({
          sessionId: z.string().optional(),
          stockCode: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const { getSessionStore } = await import("../_core/session");
      const sessionStore = getSessionStore();

      let session = input?.sessionId
        ? sessionStore.getSession(input.sessionId)
        : null;

      if (!session && input?.stockCode) {
        session =
          sessionStore.findSessionsByStock(input.stockCode)[0] || null;
      }

      if (!session) {
        return { sessionId: null, messages: [] };
      }

      const messages = session.messages
        .filter(
          msg =>
            msg.role === "system" ||
            msg.role === "user" ||
            msg.role === "assistant"
        )
        .map(msg => ({
          role: msg.role as "system" | "user" | "assistant",
          content: msg.content,
        }));

      return {
        sessionId: session.id,
        messages,
      };
    }),

  // 获取所有对话列表
  getSessions: publicProcedure
    .input(
      z
        .object({
          stockCode: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const { getSessionStore } = await import("../_core/session");
      const sessionStore = getSessionStore();
      const sessions = input?.stockCode
        ? sessionStore.findSessionsByStock(input.stockCode)
        : sessionStore.listSessions();

      return sessions.map(session => {
        const userMessages = session.messages.filter(m => m.role === "user");
        const lastUserMessage = userMessages[userMessages.length - 1];
        const stockCode = session.metadata.stockCode || "default";

        return {
          id: session.id,
          stockCode: stockCode === "default" ? "通用对话" : stockCode,
          messageCount: session.messages.length,
          lastMessage: lastUserMessage?.content?.slice(0, 50) || "暂无消息",
          lastMessageTime: session.updatedAt,
        };
      });
    }),

  // 获取当前 TODO 进度
  getActiveTodoRun: publicProcedure
    .input(
      z.object({
        sessionId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const { getSessionStore } = await import("../_core/session");
      const sessionStore = getSessionStore();
      return sessionStore.getActiveTodoRun(input.sessionId);
    }),

  // 获取最近完成的 TODO 进度
  getLatestTodoRun: publicProcedure
    .input(
      z.object({
        sessionId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const { getSessionStore } = await import("../_core/session");
      const sessionStore = getSessionStore();
      const runs = sessionStore.getTodoRuns(input.sessionId);
      return (
        [...runs].reverse().find(run => run.status !== "running") || null
      );
    }),

  // 保存聊天历史 (手动)
  saveHistory: publicProcedure
    .input(
      z.object({
        messages: z.array(
          z.object({
            role: z.enum(["system", "user", "assistant"]),
            content: z.string(),
          })
        ),
        sessionId: z.string().optional(),
        stockCode: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { getSessionStore } = await import("../_core/session");
      const sessionStore = getSessionStore();
      const session = sessionStore.getOrCreateSession(
        input.sessionId,
        input.stockCode
      );
      sessionStore.setMessages(session.id, input.messages);
      return { success: true, sessionId: session.id };
    }),

  // AI 对话
  chat: publicProcedure
    .input(
      z.object({
        messages: z.array(
          z.object({
            role: z.enum(["system", "user", "assistant"]),
            content: z.string(),
          })
        ),
        sessionId: z.string().optional(),
        stockCode: z.string().optional(),
        useThinking: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { invokeLLM } = await import("../_core/llm");
      const { getSessionStore } = await import("../_core/session");
      const sessionStore = getSessionStore();
      const session = sessionStore.getOrCreateSession(
        input.sessionId,
        input.stockCode
      );

      let stockContext = "";

      // 如果提供了股票代码，获取股票数据作为上下文
      if (input.stockCode) {
        try {
          const quote = await eastmoney.getStockQuote(input.stockCode);
          const klines = await eastmoney.getKlineData(input.stockCode, "day");
          const recentKlines = klines.slice(-10); // 最近10天的数据

          // 计算一些基础指标
          const prices = recentKlines.map((k: any) => k.close);
          const avgPrice =
            prices.reduce((a: number, b: number) => a + b, 0) / prices.length;
          const minPrice = Math.min(...prices);
          const maxPrice = Math.max(...prices);

          stockContext = `
【当前股票数据】
股票名称：${quote.name}
股票代码：${input.stockCode}
当前价格：${quote.price}元
涨跌幅：${quote.changePercent?.toFixed(2)}%
涨跌额：${quote.change?.toFixed(2)}元
今开：${quote.open}元
最高：${quote.high}元
最低：${quote.low}元
昨收：${quote.preClose}元
成交量：${(quote.volume / 10000).toFixed(2)}万手
成交额：${(quote.amount / 100000000).toFixed(2)}亿元
换手率：${quote.turnoverRate?.toFixed(2)}%
市盈率：${quote.pe?.toFixed(2)}
市净率：${quote.pb?.toFixed(2)}
总市值：${(quote.marketCap / 100000000).toFixed(2)}亿元
流通市值：${(quote.circulationMarketCap / 100000000).toFixed(2)}亿元

【近10日走势】
${recentKlines.map((k: any) => `${k.date}: 开${k.open} 高${k.high} 低${k.low} 收${k.close} 量${(k.volume / 10000).toFixed(0)}万`).join("\n")}

【统计数据】
10日均价：${avgPrice.toFixed(2)}元
10日最高：${maxPrice.toFixed(2)}元
10日最低：${minPrice.toFixed(2)}元
`;
        } catch (error) {
          console.error("获取股票数据失败:", error);
          stockContext = `【注意】无法获取股票 ${input.stockCode} 的实时数据`;
        }
      }

      // 构建系统提示词
      const systemPrompt = `你是一个专业的A股分析师助手。你的任务是帮助用户分析股票、解读技术指标、提供投资建议。

请注意：
1. 用简洁专业的语言回答问题
2. 分析要客观，结合技术面和基本面
3. 给出清晰的观点，但提醒用户自行决策
4. 不要过度乐观或悲观
${stockContext}`;

      // 替换第一条系统消息或添加
      const messagesWithContext = input.messages.map((msg, index) => {
        if (index === 0 && msg.role === "system") {
          return { ...msg, content: systemPrompt };
        }
        return msg;
      });

      // 如果没有系统消息，添加一条
      if (messagesWithContext[0]?.role !== "system") {
        messagesWithContext.unshift({
          role: "system" as const,
          content: systemPrompt,
        });
      }

      // 同步会话历史到 SessionStore
      sessionStore.setMessages(session.id, messagesWithContext);

      try {
        const response = await invokeLLM({
          messages: messagesWithContext,
          maxTokens: 2000,
          useThinking: input.useThinking,
        });

        const content = response.choices[0]?.message?.content;
        const finalContent =
          typeof content === "string"
            ? content
            : "抱歉，生成回复时出现问题。";

        sessionStore.addMessage(session.id, {
          role: "assistant",
          content: finalContent,
        });

        return {
          success: true,
          content: finalContent,
          sessionId: session.id,
        };
      } catch (error) {
        console.error("AI chat failed:", error);
        return {
          success: false,
          content: "抱歉，AI服务暂时不可用，请稍后再试。",
          sessionId: session.id,
        };
      }
    }),
});
