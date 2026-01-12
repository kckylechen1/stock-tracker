import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import * as eastmoney from './eastmoney';
import * as ifind from './ifind';
import * as fundflow from './fundflow';
import * as marketSentiment from './market-sentiment';
import { z } from 'zod';

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
          console.error('Search failed:', error);
          // 返回空数组而不是抛出错误
          return [];
        }
      }),

    // 获取股票详情
    getDetail: publicProcedure
      .input((val: unknown) => {
        if (typeof val === 'object' && val !== null && 'code' in val) {
          return val as { code: string };
        }
        throw new Error('Invalid input');
      })
      .query(async ({ input }) => {
        try {
          // 使用东方财富 API
          const [quote, stockInfo, capitalFlowData] = await Promise.all([
            eastmoney.getStockQuote(input.code),
            eastmoney.getStockInfo(input.code),
            fundflow.getStockFundFlow(input.code),
          ]);

          return {
            stock: stockInfo,
            quote: quote,
            basic: {
              pe: quote.pe,
              pb: quote.pb,
              turnoverRate: quote.turnoverRate,
              marketCap: quote.marketCap,
              circulationMarketCap: quote.circulationMarketCap,
              volumeRatio: quote.volumeRatio,
            },
            capitalFlow: capitalFlowData,
          };
        } catch (error) {
          console.error('Get detail failed:', error);
          return {
            stock: null,
            quote: null,
            basic: null,
            capitalFlow: null,
          };
        }
      }),

    // 获取分时数据
    getTimeline: publicProcedure
      .input((val: unknown) => {
        if (typeof val === 'object' && val !== null && 'code' in val) {
          return val as { code: string; days?: number };
        }
        throw new Error('Invalid input');
      })
      .query(async ({ input }) => {
        try {
          const days = input.days || 1; // 默认1日
          const data = await eastmoney.getTimelineData(input.code, days);
          return data;
        } catch (error) {
          console.error('Get timeline failed:', error);
          return { preClose: 0, timeline: [] };
        }
      }),

    // 获取K线数据
    getKline: publicProcedure
      .input((val: unknown) => {
        if (typeof val === 'object' && val !== null && 'code' in val) {
          return val as { code: string; period?: string; limit?: number };
        }
        throw new Error('Invalid input');
      })
      .query(async ({ input }) => {
        try {
          const period = (input.period || 'day') as 'day' | 'week' | 'month';
          const limit = input.limit || 60; // 减少默认K线数量从100到60

          // 使用东方财富API获取K线数据
          const klines = await eastmoney.getKlineData(input.code, period);

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
          console.error('Get kline failed:', error);
          return [];
        }
      }),

    // 获取 Gauge 技术评分
    getGaugeScore: publicProcedure
      .input((val: unknown) => {
        if (typeof val === 'object' && val !== null && 'code' in val) {
          return val as { code: string };
        }
        throw new Error('Invalid input');
      })
      .query(async ({ input }) => {
        try {
          const { calculateGaugeScore } = await import('./gauge/indicators');

          // 获取 K 线数据（需要至少 60 条）
          const klines = await eastmoney.getKlineData(input.code, 'day');
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
          console.error('Get gauge score failed:', error);
          return null;
        }
      }),

    // 获取热门股票排行榜（基于Gauge评分）
    getTopStocks: publicProcedure
      .input(z.object({
        limit: z.number().optional().default(20),
        sortBy: z.enum(['score', 'change', 'volume']).optional().default('score')
      }))
      .query(async ({ input }) => {
        try {
          const { getWatchlist } = await import('./db');
          const { calculateGaugeScore } = await import('./gauge/indicators');
          
          // 获取观察池股票
          const watchlist = await getWatchlist();
          
          // 并发获取每只股票的评分和行情
          const stocksWithScores = await Promise.all(
            watchlist.map(async (stock) => {
              try {
                // 获取K线数据
                const klines = await eastmoney.getKlineData(stock.stockCode, 'day');
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
                console.error(`Failed to get score for ${stock.stockCode}:`, error);
                return null;
              }
            })
          );
          
          // 过滤空值并排序
          const validStocks = stocksWithScores.filter(s => s !== null);
          
          // 根据排序方式排序
          validStocks.sort((a, b) => {
            if (input.sortBy === 'score') {
              return b.gaugeScore - a.gaugeScore;
            } else if (input.sortBy === 'change') {
              return b.changePercent - a.changePercent;
            } else {
              return b.volume - a.volume;
            }
          });
          
          return validStocks.slice(0, input.limit);
        } catch (error) {
          console.error('Get top stocks failed:', error);
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
        console.error('Get market sentiment failed:', error);
        return null;
      }
    }),
  }),

  // 观察池路由
  watchlist: router({
    // 获取观察池列表
    list: publicProcedure.query(async () => {
      const { getWatchlist } = await import('./db');
      return await getWatchlist();
    }),

    // 添加到观察池
    add: publicProcedure
      .input((val: unknown) => {
        if (typeof val === 'object' && val !== null && 'stockCode' in val) {
          return val as { stockCode: string; targetPrice?: string; note?: string; source?: string };
        }
        throw new Error('Invalid input');
      })
      .mutation(async ({ input }) => {
        const { addToWatchlist } = await import('./db');
        await addToWatchlist(input);
        return { success: true };
      }),

    // 从观察池删除
    remove: publicProcedure
      .input((val: unknown) => {
        if (typeof val === 'object' && val !== null && 'id' in val && typeof (val as any).id === 'number') {
          return val as { id: number };
        }
        throw new Error('Invalid input');
      })
      .mutation(async ({ input }) => {
        const { removeFromWatchlist } = await import('./db');
        await removeFromWatchlist(input.id);
        return { success: true };
      }),

    // 更新观察池项
    update: publicProcedure
      .input((val: unknown) => {
        if (typeof val === 'object' && val !== null && 'id' in val && typeof (val as any).id === 'number') {
          return val as { id: number; targetPrice?: string; note?: string };
        }
        throw new Error('Invalid input');
      })
      .mutation(async ({ input }) => {
        const { updateWatchlistItem } = await import('./db');
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
        if (typeof val === 'object' && val !== null && 'code' in val) {
          return val as { code: string };
        }
        throw new Error('Invalid input');
      })
      .query(async ({ input }) => {
        const { getAnalysisCache, saveAnalysisCache } = await import('./db');
        const { invokeLLM } = await import('./_core/llm');
        const { analyzeTechnicalIndicators } = await import('./indicators');

        // 先检查缓存
        const cached = await getAnalysisCache(input.code);
        if (cached && cached.updatedAt) {
          const cacheAge = Date.now() - new Date(cached.updatedAt).getTime();
          // 如果缓存小于1小时，直接返回
          if (cacheAge < 60 * 60 * 1000) {
            return {
              technicalScore: cached.technicalScore,
              technicalSignals: JSON.parse(cached.technicalSignals || '[]'),
              sentimentScore: cached.sentimentScore,
              sentimentData: JSON.parse(cached.sentimentData || '{}'),
              capitalScore: cached.capitalScore,
              capitalData: JSON.parse(cached.capitalData || '{}'),
              summary: cached.summary,
              updatedAt: cached.updatedAt,
            };
          }
        }

        // 获取K线数据用于技术分析 (使用东方财富)
        const klineData = await eastmoney.getKlineData(input.code, 'day');

        if (!klineData || klineData.length === 0) {
          return {
            technicalScore: 50,
            technicalSignals: ['数据不足'],
            sentimentScore: 50,
            sentimentData: {},
            capitalScore: 50,
            capitalData: {},
            summary: '数据不足，无法进行分析',
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

        const technicalAnalysis = analyzeTechnicalIndicators(formattedKlineData);

        // 使用AI生成综合分析
        try {
          const aiResponse = await invokeLLM({
            messages: [
              {
                role: 'system',
                content: '你是一个专业的A股分析师。请根据技术指标数据，生成简洁的投资建议和风险提示。',
              },
              {
                role: 'user',
                content: `请分析以下技术指标：\n\n技术面评分：${technicalAnalysis.score}/100\n技术信号：${technicalAnalysis.signals.join(', ')}\n\n请用一段话（不超过50字）给出综合建议。`,
              },
            ],
          });

          const summary = aiResponse.choices[0]?.message?.content || '技术面表现中等，建议谨慎观望。';

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
          console.error('AI analysis failed:', error);

          // AI失败时返回基础分析
          return {
            technicalScore: technicalAnalysis.score,
            technicalSignals: technicalAnalysis.signals,
            sentimentScore: 50,
            sentimentData: {},
            capitalScore: 50,
            capitalData: {},
            summary: `技术面评分${technicalAnalysis.score}/100，${technicalAnalysis.score >= 60 ? '表现良好' : '表现一般'}。`,
            updatedAt: new Date(),
          };
        }
      }),
  }),

  // AI 聊天路由
  ai: router({
    // 获取聊天历史
    getHistory: publicProcedure
      .input(z.object({
        stockCode: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        const { getChatHistory } = await import('./local_db');
        return await getChatHistory(input?.stockCode);
      }),

    // 获取所有对话列表
    getSessions: publicProcedure.query(async () => {
      const { getAllChatSessions } = await import('./local_db');
      return await getAllChatSessions();
    }),

    // 保存聊天历史 (手动)
    saveHistory: publicProcedure
      .input(z.object({
        messages: z.array(z.object({
          role: z.enum(['system', 'user', 'assistant']),
          content: z.string(),
        })),
        stockCode: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { saveChatHistory } = await import('./local_db');
        await saveChatHistory(input.messages, input.stockCode);
        return { success: true };
      }),

    // AI 对话
    chat: publicProcedure
      .input(z.object({
        messages: z.array(z.object({
          role: z.enum(['system', 'user', 'assistant']),
          content: z.string(),
        })),
        stockCode: z.string().optional(),
        useThinking: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { invokeLLM } = await import('./_core/llm');
        const { saveChatHistory } = await import('./local_db');

        let stockContext = '';

        // 如果提供了股票代码，获取股票数据作为上下文
        if (input.stockCode) {
          try {
            const quote = await eastmoney.getStockQuote(input.stockCode);
            const klines = await eastmoney.getKlineData(input.stockCode, 'day');
            const recentKlines = klines.slice(-10); // 最近10天的数据

            // 计算一些基础指标
            const prices = recentKlines.map((k: any) => k.close);
            const avgPrice = prices.reduce((a: number, b: number) => a + b, 0) / prices.length;
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
${recentKlines.map((k: any) => `${k.date}: 开${k.open} 高${k.high} 低${k.low} 收${k.close} 量${(k.volume / 10000).toFixed(0)}万`).join('\n')}

【统计数据】
10日均价：${avgPrice.toFixed(2)}元
10日最高：${maxPrice.toFixed(2)}元
10日最低：${minPrice.toFixed(2)}元
`;
          } catch (error) {
            console.error('获取股票数据失败:', error);
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
          if (index === 0 && msg.role === 'system') {
            return { ...msg, content: systemPrompt };
          }
          return msg;
        });

        // 如果没有系统消息，添加一条
        if (messagesWithContext[0]?.role !== 'system') {
          messagesWithContext.unshift({ role: 'system' as const, content: systemPrompt });
        }

        try {
          const response = await invokeLLM({
            messages: messagesWithContext,
            maxTokens: 2000,
            useThinking: input.useThinking,
          });

          const content = response.choices[0]?.message?.content;
          const finalContent = typeof content === 'string' ? content : '抱歉，生成回复时出现问题。';

          // 自动保存聊天历史 (保存用户发送的历史 + AI回复)
          try {
            const newHistory = [
              ...input.messages,
              { role: 'assistant' as const, content: finalContent }
            ];
            await saveChatHistory(newHistory);
          } catch (saveError) {
            console.error('Failed to auto-save chat history:', saveError);
          }

          return {
            success: true,
            content: finalContent,
          };
        } catch (error) {
          console.error('AI chat failed:', error);
          return {
            success: false,
            content: '抱歉，AI服务暂时不可用，请稍后再试。',
          };
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
