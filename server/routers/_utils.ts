/**
 * Router 公共工具函数
 * 从 routers.ts 提取的缓存和 fallback 逻辑
 */

import * as ifind from "../ifind";
import * as eastmoney from "../eastmoney";

// 全局缓存：存储人气排名数据 { symbol: { data, timestamp } }
const rankCache = new Map<
  string,
  { hotRank: any; xueqiuRank: any; timestamp: number }
>();
const RANK_CACHE_TTL = 10 * 60 * 1000; // 10分钟缓存

/**
 * 股票行情数据类型
 */
interface StockQuoteData {
  code: string;
  name: string;
  price: number;
  preClose: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  amount: number;
  turnoverRate: number | null;
  pe: number | null;
  pb: number | null;
  marketCap: number | null;
  circulationMarketCap: number | null;
  volumeRatio: number | null;
  mainNetInflow?: number | null;
  mainNetInflowRate?: number | null;
  superLargeNetInflow?: number | null;
  largeNetInflow?: number | null;
  mediumNetInflow?: number | null;
  smallNetInflow?: number | null;
  source: "ifind" | "eastmoney";
}

/**
 * 获取行情数据，iFind 优先，东方财富 fallback
 */
export async function getQuoteWithFallback(
  code: string
): Promise<StockQuoteData | null> {
  try {
    const quote = await ifind.getStockQuote(code);
    if (quote) {
      return { ...quote, source: "ifind" };
    }
  } catch (error) {
    console.warn("iFind quote failed, fallback to eastmoney");
  }

  const quote = await eastmoney.getStockQuote(code);
  return { ...quote, source: "eastmoney" };
}

/**
 * 获取缓存的排名数据
 */
export async function getCachedRankData(code: string) {
  const akshare = await import("../akshare");
  let rankData = rankCache.get(code);
  const now = Date.now();

  const fetchAndCacheRank = async () => {
    try {
      const [hr, xr] = await Promise.all([
        akshare.getHotRankLatestBySymbolEM(code).catch(() => null),
        akshare.getXueqiuRankBySymbol(code).catch(() => null),
      ]);
      if (hr || xr) {
        rankCache.set(code, {
          hotRank: hr,
          xueqiuRank: xr,
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      console.error("Background rank fetch failed:", error);
    }
  };

  if (!rankData || now - rankData.timestamp > RANK_CACHE_TTL) {
    if (!rankData) {
      await Promise.race([
        fetchAndCacheRank(),
        new Promise(resolve => setTimeout(resolve, 2000)),
      ]);
      rankData = rankCache.get(code);
    } else {
      fetchAndCacheRank();
    }
  }

  return rankData ?? null;
}
