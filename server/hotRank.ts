/**
 * 股吧人气排名模块
 * 数据来源：东方财富网
 *
 * 使用规则（来自 Grok）：
 * 1. 人气100外→前50 + 主力流入 → 埋伏信号
 * 2. 人气前30 + 放量突破 + 没走弱 → 加仓
 * 3. 人气前10 + 连续2天不涨/缩量 → 减仓（情绪见顶）
 * 4. 人气前20 + 资金流出 + 技术弱 → 回避（可能诱多）
 */

import { callAKShare } from "./akshare";

// 人气排名结果
export interface HotRankResult {
  symbol: string;
  rank: number; // 当前排名（1-5000）
  rankChange: number; // 排名变化（正数=上升）
  marketAllCount: number; // 市场股票总数
  calcTime: string; // 计算时间
  sentiment: "low" | "medium" | "high" | "overheated"; // 情绪分级
  sentimentText: string; // 情绪描述
}

// 人气排名历史
export interface HotRankHistory {
  time: string;
  rank: number;
}

/**
 * 获取个股人气榜最新排名
 * @param symbol 股票代码，格式如 "SZ000665" 或 "300433"
 */
export async function getStockHotRank(
  symbol: string
): Promise<HotRankResult | null> {
  try {
    // 格式化代码（AKShare 需要 SZ/SH 前缀）
    let formattedSymbol = symbol;
    if (!symbol.startsWith("SZ") && !symbol.startsWith("SH")) {
      if (symbol.startsWith("6")) {
        formattedSymbol = `SH${symbol}`;
      } else {
        formattedSymbol = `SZ${symbol}`;
      }
    }

    const data = await callAKShare("stock_hot_rank_latest_em", {
      symbol: formattedSymbol,
    });

    if (!data || !Array.isArray(data)) {
      return null;
    }

    // 解析返回数据（格式是 [{item, value}, ...]）
    const dataMap: Record<string, any> = {};
    for (const row of data) {
      dataMap[row.item] = row.value;
    }

    const rank = parseInt(dataMap.rank) || 0;
    const rankChange = parseInt(dataMap.rankChange) || 0;
    const marketAllCount = parseInt(dataMap.marketAllCount) || 5000;

    // 情绪分级
    let sentiment: HotRankResult["sentiment"];
    let sentimentText: string;

    if (rank <= 20) {
      sentiment = "overheated";
      sentimentText = "🔥 过热（前20）- 警惕情绪见顶";
    } else if (rank <= 50) {
      sentiment = "high";
      sentimentText = "🟠 高热（20-50）- 市场高度关注";
    } else if (rank <= 100) {
      sentiment = "medium";
      sentimentText = "🟡 中等（50-100）- 有一定关注";
    } else {
      sentiment = "low";
      sentimentText = "⚪ 较低（100外）- 关注度不高";
    }

    return {
      symbol: formattedSymbol,
      rank,
      rankChange,
      marketAllCount,
      calcTime: dataMap.calcTime || "",
      sentiment,
      sentimentText,
    };
  } catch (error) {
    console.error("[getStockHotRank] Error:", error);
    return null;
  }
}

/**
 * 获取个股人气榜历史趋势（10分钟级别）
 * @param symbol 股票代码
 */
export async function getStockHotRankHistory(
  symbol: string
): Promise<HotRankHistory[]> {
  try {
    // 格式化代码
    let formattedSymbol = symbol;
    if (!symbol.startsWith("SZ") && !symbol.startsWith("SH")) {
      if (symbol.startsWith("6")) {
        formattedSymbol = `SH${symbol}`;
      } else {
        formattedSymbol = `SZ${symbol}`;
      }
    }

    const data = await callAKShare("stock_hot_rank_detail_realtime_em", {
      symbol: formattedSymbol,
    });

    if (!data || !Array.isArray(data)) {
      return [];
    }

    return data.map((row: any) => ({
      time: row["时间"] || row.time || "",
      rank: parseInt(row["排名"] || row.rank) || 0,
    }));
  } catch (error) {
    console.error("[getStockHotRankHistory] Error:", error);
    return [];
  }
}

/**
 * 分析人气趋势
 * @param history 人气历史数据
 */
export function analyzeHotRankTrend(history: HotRankHistory[]): {
  trend: "rising" | "falling" | "stable";
  trendText: string;
  avgRank: number;
  bestRank: number;
  worstRank: number;
} {
  if (history.length < 5) {
    return {
      trend: "stable",
      trendText: "数据不足",
      avgRank: 0,
      bestRank: 0,
      worstRank: 0,
    };
  }

  const ranks = history.map(h => h.rank);
  const avgRank = Math.round(ranks.reduce((a, b) => a + b, 0) / ranks.length);
  const bestRank = Math.min(...ranks);
  const worstRank = Math.max(...ranks);

  // 取最近10条 vs 之前的平均
  const recentRanks = ranks.slice(-10);
  const olderRanks = ranks.slice(0, -10);

  const recentAvg = recentRanks.reduce((a, b) => a + b, 0) / recentRanks.length;
  const olderAvg =
    olderRanks.length > 0
      ? olderRanks.reduce((a, b) => a + b, 0) / olderRanks.length
      : recentAvg;

  let trend: "rising" | "falling" | "stable";
  let trendText: string;

  if (recentAvg < olderAvg * 0.8) {
    trend = "rising";
    trendText = `📈 人气上升中（排名从${Math.round(olderAvg)}升至${Math.round(recentAvg)}）`;
  } else if (recentAvg > olderAvg * 1.2) {
    trend = "falling";
    trendText = `📉 人气下降中（排名从${Math.round(olderAvg)}降至${Math.round(recentAvg)}）`;
  } else {
    trend = "stable";
    trendText = `➡️ 人气稳定（平均排名${avgRank}）`;
  }

  return {
    trend,
    trendText,
    avgRank,
    bestRank,
    worstRank,
  };
}

/**
 * 格式化人气分析报告（给AI用）
 */
export function formatHotRankForAI(
  rank: HotRankResult | null,
  history: HotRankHistory[]
): string {
  if (!rank) {
    return "⚠️ 无法获取股吧人气数据";
  }

  const trendAnalysis = analyzeHotRankTrend(history);

  let signal = "";

  // 根据 Grok 的规则生成信号
  if (rank.rank <= 10 && rank.rankChange <= 0) {
    signal = "⚠️ **警惕情绪见顶**：人气前10但排名停滞，可能是出货信号";
  } else if (rank.rank <= 20 && rank.rankChange <= 0) {
    signal = "⚠️ **谨慎持有**：人气过热区，注意资金是否配合";
  } else if (rank.rank <= 50 && rank.rankChange > 10) {
    signal = "⭐ **重点关注**：人气快速上升，可能有资金关注";
  } else if (rank.rank > 100 && rank.rankChange > 20) {
    signal = "👀 **埋伏信号**：人气从低位快速上升，需结合资金面确认";
  } else if (rank.rank <= 30 && trendAnalysis.trend === "rising") {
    signal = "✅ **情绪配合**：人气持续上升中";
  } else {
    signal = "📊 情绪正常，无特殊信号";
  }

  return `
📊 **股吧人气分析**
├─ 当前排名: 第${rank.rank}名 / ${rank.marketAllCount}只
├─ 排名变化: ${rank.rankChange > 0 ? `↑${rank.rankChange}` : rank.rankChange < 0 ? `↓${Math.abs(rank.rankChange)}` : "→持平"}
├─ 情绪等级: ${rank.sentimentText}
├─ 趋势: ${trendAnalysis.trendText}
└─ 信号: ${signal}
`.trim();
}
