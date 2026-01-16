import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import * as eastmoney from "./eastmoney";
import * as ifind from "./ifind";
import * as fundflow from "./fundflow";
import * as marketSentiment from "./market-sentiment";
import { z } from "zod";

// 全局缓存：存储人气排名数据 { symbol: { data, timestamp } }
const rankCache = new Map<
  string,
  { hotRank: any; xueqiuRank: any; timestamp: number }
>();
const RANK_CACHE_TTL = 10 * 60 * 1000; // 10分钟缓存

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // 股票相关路由
  stocks: router({
    // 搜索股票
    search: publicProcedure
      .input(z.object({ keyword: z.string() }))
      .query(async ({ input }) => {
        try {
          // 使用东方财富API搜索股票
          return await eastmoney.searchStock(input.keyword);
        } catch (error) {
          console.error("Search failed:", error);
          // 返回空数组而不是抛出错误
          return [];
        }
      }),

    // 获取股票详情（包含行情、资金流、排名）
    getDetail: publicProcedure
      .input((val: unknown) => {
        if (typeof val === "object" && val !== null && "code" in val) {
          return val as { code: string };
        }
        throw new Error("Invalid input");
      })
      .query(async ({ input }) => {
        // 并行获取数据
        const akshare = await import("./akshare");

        // 1. 获取基础行情（优先 iFind）
        let quotePromise = (async () => {
          try {
            const q = await ifind.getStockQuote(input.code);
            return q ? { ...q, source: "ifind" } : null;
          } catch (e) {
            console.warn("iFind quote failed, fallback to eastmoney");
            return null;
          }
        })();

        // 2. 排名数据（带缓存策略）
        // 策略：有缓存且未过期->直接用；无缓存->异步获取(为了不阻塞行情，本次可能返回null，或者如果这是第一次请求，可以稍微在这个Promise上等一小会)
        // 为了极致体验，我们采用：总是尝试返回缓存。如果过期，后台触发更新。
        let rankData = rankCache.get(input.code);
        const now = Date.now();

        const fetchAndCacheRank = async () => {
          try {
            const [hr, xr] = await Promise.all([
              akshare.getHotRankLatestBySymbolEM(input.code).catch(e => null),
              akshare.getXueqiuRankBySymbol(input.code).catch(e => null),
            ]);
            if (hr || xr) {
              rankCache.set(input.code, {
                hotRank: hr,
                xueqiuRank: xr,
                timestamp: Date.now(),
              });
            }
          } catch (e) {
            console.error("Background rank fetch failed:", e);
          }
        };

        if (!rankData || now - rankData.timestamp > RANK_CACHE_TTL) {
          // 如果没有缓存，或者缓存过期，触发异步更新
          // 注意：这里不await，让它在后台跑，除非这是第一次且我们希望用户看到数据
          // 为了“刷新的不傻逼”，第一次加载最好稍微等一下（设置个短超时），后续刷新直接用缓存
          if (!rankData) {
            // 无缓存，尝试等待最多 2秒，拿不到就算了，让下一次刷新显示
            await Promise.race([
              fetchAndCacheRank(),
              new Promise(resolve => setTimeout(resolve, 2000)),
            ]);
            rankData = rankCache.get(input.code); // 再次尝试获取
          } else {
            // 有旧缓存但过期了 -> 返回旧数据，后台更新
            fetchAndCacheRank();
          }
        }

        const quote =
          (await quotePromise) || (await eastmoney.getStockQuote(input.code)); // Changed getQuote to getStockQuote to match existing eastmoney API
        const stockInfo = await akshare.getStockInfo(input.code); // Assuming akshare has getStockInfo

        // 获取资金流向
        const capitalFlowData = await fundflow.getStockFundFlow(input.code); // Changed eastmoney.getCapitalFlow to fundflow.getStockFundFlow to match existing fundflow API

        return {
          stock: stockInfo,
          quote: quote,
          basic: null,
          capitalFlow: capitalFlowData,
          hotRank: rankData?.hotRank || null,
          xueqiuRank: rankData?.xueqiuRank || null,
        };
      }),

    // 获取单只股票的人气排名（保留接口以备不时之需，但主要通过 getDetail 获取）
    getHotRank: publicProcedure
      .input((val: unknown) => {
        if (typeof val === "object" && val !== null && "code" in val) {
          return val as { code: string };
        }
        throw new Error("Invalid input");
      })
      .query(async ({ input }) => {
        // 不捕获错误，让 TRPC 抛出异常，触发前端重试机制
        const akshare = await import("./akshare");
        const [hotRank, xueqiuRank] = await Promise.all([
          akshare.getHotRankLatestBySymbolEM(input.code),
          akshare.getXueqiuRankBySymbol(input.code),
        ]);
        return { hotRank, xueqiuRank };
      }),

    // 获取分时数据
    getTimeline: publicProcedure
      .input((val: unknown) => {
        if (typeof val === "object" && val !== null && "code" in val) {
          return val as { code: string; days?: number };
        }
        throw new Error("Invalid input");
      })
      .query(async ({ input }) => {
        try {
          const days = input.days || 1; // 默认1日
          // 分时图仍使用东方财富（iFind 的分时数据封装尚需优化，暂不作为主力）
          const data = await eastmoney.getTimelineData(input.code, days);
          return data;
        } catch (error) {
          console.error("Get timeline failed:", error);
          return { preClose: 0, timeline: [] };
        }
      }),

    // 获取K线数据
    getKline: publicProcedure
      .input((val: unknown) => {
        if (typeof val === "object" && val !== null && "code" in val) {
          return val as { code: string; period?: string; limit?: number };
        }
        throw new Error("Invalid input");
      })
      .query(async ({ input }) => {
        try {
          const period = (input.period || "day") as "day" | "week" | "month";
          const limit = input.limit || 60;

          // 主数据源：iFind，备用：东方财富
          let klines;
          try {
            klines = await ifind.getKlineData(input.code, period, limit);
          } catch (ifindError) {
            console.warn(
              "[getKline] iFind failed, falling back to eastmoney:",
              ifindError
            );
            const eastmoneyKlines = await eastmoney.getKlineData(
              input.code,
              period
            );
            klines = eastmoneyKlines.slice(-limit);
          }

          // 限制返回数量
          const limitedKlines = klines.slice(-limit);

          // 转换为前端需要的格式
          return limitedKlines.map((item: any) => ({
            time: item.date,
            open: item.open,
            high: item.high,
            low: item.low,
            close: item.close,
            volume: item.volume,
          }));
        } catch (error) {
          console.error("Get kline failed:", error);
          return [];
        }
      }),

    // 获取 Gauge 技术评分
    getGaugeScore: publicProcedure
      .input((val: unknown) => {
        if (typeof val === "object" && val !== null && "code" in val) {
          return val as { code: string };
        }
        throw new Error("Invalid input");
      })
      .query(async ({ input }) => {
        try {
          const { calculateGaugeScore } = await import("./gauge/indicators");

          // 获取 K 线数据（需要至少 60 条）
          const klines = await eastmoney.getKlineData(input.code, "day");
          const recentKlines = klines.slice(-80);

          if (recentKlines.length < 30) {
            return null;
          }

          // 转换格式
          const formattedKlines = recentKlines.map((item: any) => ({
            time: item.date,
            open: item.open,
            high: item.high,
            low: item.low,
            close: item.close,
            volume: item.volume,
          }));

          // 计算 Gauge 评分
          return calculateGaugeScore(formattedKlines);
        } catch (error) {
          console.error("Get gauge score failed:", error);
          return null;
        }
      }),

    // 获取热门股票排行榜（基于Gauge评分）
    getTopStocks: publicProcedure
      .input(
        z.object({
          limit: z.number().optional().default(20),
          sortBy: z
            .enum(["score", "change", "volume"])
            .optional()
            .default("score"),
        })
      )
      .query(async ({ input }) => {
        try {
          const { getWatchlist } = await import("./db");
          const { calculateGaugeScore } = await import("./gauge/indicators");

          // 获取观察池股票
          const watchlist = await getWatchlist();

          // 并发获取每只股票的评分和行情
          const stocksWithScores = await Promise.all(
            watchlist.map(async stock => {
              try {
                // 获取K线数据
                const klines = await eastmoney.getKlineData(
                  stock.stockCode,
                  "day"
                );
                const recentKlines = klines.slice(-80);

                if (recentKlines.length < 30) {
                  return null;
                }

                // 转换格式
                const formattedKlines = recentKlines.map((item: any) => ({
                  time: item.time,
                  open: item.open,
                  high: item.high,
                  low: item.low,
                  close: item.close,
                  volume: item.volume,
                }));

                // 计算Gauge评分
                const gaugeScore = calculateGaugeScore(formattedKlines);

                // 获取实时行情
                const quote = await eastmoney.getStockQuote(stock.stockCode);

                return {
                  code: stock.stockCode,
                  name: quote.name,
                  price: quote.price,
                  change: quote.change,
                  changePercent: quote.changePercent,
                  volume: quote.volume,
                  amount: quote.amount,
                  turnoverRate: quote.turnoverRate,
                  gaugeScore: gaugeScore.score,
                  signal: gaugeScore.signal,
                  confidence: gaugeScore.confidence,
                };
              } catch (error) {
                console.error(
                  `Failed to get score for ${stock.stockCode}:`,
                  error
                );
                return null;
              }
            })
          );

          // 过滤空值并排序
          const validStocks = stocksWithScores.filter(s => s !== null);

          // 根据排序方式排序
          validStocks.sort((a, b) => {
            if (input.sortBy === "score") {
              return b.gaugeScore - a.gaugeScore;
            } else if (input.sortBy === "change") {
              return b.changePercent - a.changePercent;
            } else {
              return b.volume - a.volume;
            }
          });

          return validStocks.slice(0, input.limit);
        } catch (error) {
          console.error("Get top stocks failed:", error);
          return [];
        }
      }),
  }),

  // 市场情绪路由
  market: router({
    // 获取市场情绪综合数据
    getSentiment: publicProcedure.query(async () => {
      try {
        return await marketSentiment.getMarketSentiment();
      } catch (error) {
        console.error("Get market sentiment failed:", error);
        return null;
      }
    }),

    // 获取股吧人气排名榜
    getHotRankList: publicProcedure
      .input(z.object({ limit: z.number().optional().default(20) }))
      .query(async ({ input }) => {
        try {
          const akshare = await import("./akshare");
          const data = await akshare.getHotRankEM();
          if (!Array.isArray(data)) return [];

          // AKShare返回的字段: 当前排名, 代码(带SH/SZ前缀), 股票名称, 最新价, 涨跌额, 涨跌幅
          return data.slice(0, input.limit).map((item: any) => ({
            rank: item["当前排名"] || 0,
            code: item["代码"]?.replace(/^(SH|SZ)/, "") || "",
            name: item["股票名称"] || "",
            price: item["最新价"] || 0,
            changePercent: item["涨跌幅"] || 0,
            hotRank: item["当前排名"] || 0,
            hotChange: 0, // 此接口不返回排名变化，需要另一个接口
          }));
        } catch (error) {
          console.error("Get hot rank list failed:", error);
          return [];
        }
      }),

    // 获取主力资金流排名榜
    getFundFlowRank: publicProcedure
      .input(
        z.object({
          type: z
            .enum(["today", "3day", "5day", "10day"])
            .optional()
            .default("today"),
          limit: z.number().optional().default(20),
        })
      )
      .query(async ({ input }) => {
        try {
          const data = await fundflow.getFundFlowRank(input.type, input.limit);
          return data;
        } catch (error) {
          console.error("Get fund flow rank failed:", error);
          return [];
        }
      }),
  }),

  // 观察池路由
  watchlist: router({
    // 获取观察池列表
    list: publicProcedure.query(async () => {
      const { getWatchlist } = await import("./db");
      return await getWatchlist();
    }),

    // 添加到观察池
    add: publicProcedure
      .input((val: unknown) => {
        if (typeof val === "object" && val !== null && "stockCode" in val) {
          return val as {
            stockCode: string;
            targetPrice?: string;
            note?: string;
            source?: string;
          };
        }
        throw new Error("Invalid input");
      })
      .mutation(async ({ input }) => {
        const { addToWatchlist, getWatchlist } = await import("./db");

        // 检查是否已存在
        const existingList = await getWatchlist();
        const alreadyExists = existingList.some(
          item => item.stockCode === input.stockCode
        );

        if (alreadyExists) {
          return { success: false, error: "该股票已在观察池中" };
        }

        await addToWatchlist(input);
        return { success: true };
      }),

    // 从观察池删除
    remove: publicProcedure
      .input((val: unknown) => {
        if (
          typeof val === "object" &&
          val !== null &&
          "id" in val &&
          typeof (val as any).id === "number"
        ) {
          return val as { id: number };
        }
        throw new Error("Invalid input");
      })
      .mutation(async ({ input }) => {
        const { removeFromWatchlist } = await import("./db");
        await removeFromWatchlist(input.id);
        return { success: true };
      }),

    // 更新观察池项
    update: publicProcedure
      .input((val: unknown) => {
        if (
          typeof val === "object" &&
          val !== null &&
          "id" in val &&
          typeof (val as any).id === "number"
        ) {
          return val as { id: number; targetPrice?: string; note?: string };
        }
        throw new Error("Invalid input");
      })
      .mutation(async ({ input }) => {
        const { updateWatchlistItem } = await import("./db");
        const { id, ...data } = input;
        await updateWatchlistItem(id, data);
        return { success: true };
      }),
  }),

  // AI分析路由
  analysis: router({
    // 获取AI综合分析
    getAnalysis: publicProcedure
      .input((val: unknown) => {
        if (typeof val === "object" && val !== null && "code" in val) {
          return val as { code: string };
        }
        throw new Error("Invalid input");
      })
      .query(async ({ input }) => {
        const { getAnalysisCache, saveAnalysisCache } = await import("./db");
        const { invokeLLM } = await import("./_core/llm");
        const { analyzeTechnicalIndicators } = await import("./indicators");

        // 先检查缓存
        const cached = await getAnalysisCache(input.code);
        if (cached && cached.updatedAt) {
          const cacheAge = Date.now() - new Date(cached.updatedAt).getTime();
          // 如果缓存小于1小时，直接返回
          if (cacheAge < 60 * 60 * 1000) {
            return {
              technicalScore: cached.technicalScore,
              technicalSignals: JSON.parse(cached.technicalSignals || "[]"),
              sentimentScore: cached.sentimentScore,
              sentimentData: JSON.parse(cached.sentimentData || "{}"),
              capitalScore: cached.capitalScore,
              capitalData: JSON.parse(cached.capitalData || "{}"),
              summary: cached.summary,
              updatedAt: cached.updatedAt,
            };
          }
        }

        // 获取K线数据用于技术分析 (使用东方财富)
        const klineData = await eastmoney.getKlineData(input.code, "day");

        if (!klineData || klineData.length === 0) {
          return {
            technicalScore: 50,
            technicalSignals: ["数据不足"],
            sentimentScore: 50,
            sentimentData: {},
            capitalScore: 50,
            capitalData: {},
            summary: "数据不足，无法进行分析",
            updatedAt: new Date(),
          };
        }

        // 技术面分析
        const formattedKlineData = klineData.map((item: any) => ({
          time: item.date,
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close,
          volume: item.volume,
        }));

        const technicalAnalysis =
          analyzeTechnicalIndicators(formattedKlineData);

        // 使用AI生成综合分析
        try {
          const aiResponse = await invokeLLM({
            messages: [
              {
                role: "system",
                content:
                  "你是一个专业的A股分析师。请根据技术指标数据，生成简洁的投资建议和风险提示。",
              },
              {
                role: "user",
                content: `请分析以下技术指标：\n\n技术面评分：${technicalAnalysis.score}/100\n技术信号：${technicalAnalysis.signals.join(", ")}\n\n请用一段话（不超过50字）给出综合建议。`,
              },
            ],
          });

          const summary =
            aiResponse.choices[0]?.message?.content ||
            "技术面表现中等，建议谨慎观望。";

          // 保存到缓存
          const analysisData = {
            technicalScore: technicalAnalysis.score,
            technicalSignals: JSON.stringify(technicalAnalysis.signals),
            sentimentScore: 50, // 暂时默认值
            sentimentData: JSON.stringify({}),
            capitalScore: 50, // 暂时默认值
            capitalData: JSON.stringify({}),
            summary,
          };

          await saveAnalysisCache(input.code, analysisData);

          return {
            ...analysisData,
            technicalSignals: technicalAnalysis.signals,
            sentimentData: {},
            capitalData: {},
            updatedAt: new Date(),
          };
        } catch (error) {
          console.error("AI analysis failed:", error);

          // AI失败时返回基础分析
          return {
            technicalScore: technicalAnalysis.score,
            technicalSignals: technicalAnalysis.signals,
            sentimentScore: 50,
            sentimentData: {},
            capitalScore: 50,
            capitalData: {},
            summary: `技术面评分${technicalAnalysis.score}/100，${technicalAnalysis.score >= 60 ? "表现良好" : "表现一般"}。`,
            updatedAt: new Date(),
          };
        }
      }),
  }),

  // AI 聊天路由
  ai: router({
    // 创建新会话
    createSession: publicProcedure
      .input(
        z.object({
          stockCode: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { getSessionStore } = await import("./_core/session");
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
        const { getSessionStore } = await import("./_core/session");
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
        const { getSessionStore } = await import("./_core/session");
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
        const { getSessionStore } = await import("./_core/session");
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
        const { getSessionStore } = await import("./_core/session");
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
        const { getSessionStore } = await import("./_core/session");
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
        const { invokeLLM } = await import("./_core/llm");
        const { getSessionStore } = await import("./_core/session");
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
  }),
});

export type AppRouter = typeof appRouter;
