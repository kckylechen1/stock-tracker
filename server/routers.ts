import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import * as eastmoney from './eastmoney';
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
          // 使用东方财富API获取股票详情
          const quote = await eastmoney.getStockQuote(input.code);
          const stockInfo = await eastmoney.getStockInfo(input.code);
          
          return {
            stock: stockInfo,
            quote: quote,
            basic: {
              pe: quote.pe,
              pb: quote.pb,
              turnoverRate: quote.turnoverRate,
              marketCap: quote.marketCap,
              circulationMarketCap: quote.circulationMarketCap,
            },
          };
        } catch (error) {
          console.error('Get detail failed:', error);
          return {
            stock: null,
            quote: null,
            basic: null,
          };
        }
      }),
    
    // 获取分时数据
    getTimeline: publicProcedure
      .input((val: unknown) => {
        if (typeof val === 'object' && val !== null && 'code' in val) {
          return val as { code: string };
        }
        throw new Error('Invalid input');
      })
      .query(async ({ input }) => {
        try {
          const data = await eastmoney.getTimelineData(input.code);
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
        const { getKlineData: getTushareKline, codeToTsCode, formatDateForTushare, formatTushareDate } = await import('./tushare');
        
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
        
        // 获取K线数据用于技术分析
        const tsCode = codeToTsCode(input.code);
        const endDate = formatDateForTushare(new Date());
        const startDate = formatDateForTushare(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)); // 90天数据
        
        const klineData = await getTushareKline(tsCode, startDate, endDate, 'D');
        
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
          time: formatTushareDate(item.trade_date),
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close,
          volume: item.vol,
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
});

export type AppRouter = typeof appRouter;
