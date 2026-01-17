import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import * as fundflow from "../fundflow";
import * as marketSentiment from "../market-sentiment";

export const marketRouter = router({
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
        const akshare = await import("../akshare");
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
});
