/**
 * Analysis Router
 * AI分析路由：技术分析、综合评分等
 */

import { publicProcedure, router } from "../_core/trpc";
import * as eastmoney from "../eastmoney";

export const analysisRouter = router({
  // 获取AI综合分析
  getAnalysis: publicProcedure
    .input((val: unknown) => {
      if (typeof val === "object" && val !== null && "code" in val) {
        return val as { code: string };
      }
      throw new Error("Invalid input");
    })
    .query(async ({ input }) => {
      const { getAnalysisCache, saveAnalysisCache } = await import("../db");
      const { invokeLLM } = await import("../_core/llm");
      const { analyzeTechnicalIndicators } = await import("../indicators");

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
});
