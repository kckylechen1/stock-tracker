import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

/**
 * 股票API测试
 */

const isOffline = process.env.TEST_OFFLINE === "true";
const describeNetwork = isOffline ? describe.skip : describe;

function createTestContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describeNetwork("stocks.search", () => {
  it("should search stocks by keyword", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    // 搜索比亚迪
    const results = await caller.stocks.search({ keyword: "比亚迪" });

    expect(Array.isArray(results)).toBe(true);
    if (results.length > 0) {
      expect(results[0]).toHaveProperty("code");
      expect(results[0]).toHaveProperty("name");
      expect(results[0]).toHaveProperty("symbol");
    }
  }, 30000); // 30秒超时，因为需要调用外部API
});

describeNetwork("stocks.getDetail", () => {
  it("should get stock detail by code", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    // 获取比亚迪详情
    const detail = await caller.stocks.getDetail({ code: "002594" });

    expect(detail).toHaveProperty("quote");
    expect(detail).toHaveProperty("basic");
  }, 30000);
});

describeNetwork("stocks.getKline", () => {
  it("should get kline data", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    // 获取K线数据
    const klineData = await caller.stocks.getKline({
      code: "002594",
      period: "day",
      limit: 10,
    });

    expect(Array.isArray(klineData)).toBe(true);
    if (klineData.length > 0) {
      expect(klineData[0]).toHaveProperty("time");
      expect(klineData[0]).toHaveProperty("open");
      expect(klineData[0]).toHaveProperty("high");
      expect(klineData[0]).toHaveProperty("low");
      expect(klineData[0]).toHaveProperty("close");
      expect(klineData[0]).toHaveProperty("volume");
    }
  }, 30000);
});

describe("watchlist", () => {
  it.skip("should add and list watchlist items", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    // 添加到观察池
    const addResult = await caller.watchlist.add({
      stockCode: "002594",
      note: "测试股票",
      source: "test",
    });

    expect(addResult).toEqual({ success: true });

    // 获取观察池列表
    const list = await caller.watchlist.list();

    expect(Array.isArray(list)).toBe(true);
    const testItem = list.find((item: any) => item.stockCode === "002594");
    expect(testItem).toBeDefined();
    if (testItem) {
      expect(testItem.note).toBe("测试股票");

      // 清理测试数据
      await caller.watchlist.remove({ id: testItem.id });
    }
  }, 30000);
});

describe("analysis.getAnalysis", () => {
  it.skip("should get AI analysis for a stock", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    // 获取AI分析
    const analysis = await caller.analysis.getAnalysis({ code: "002594" });

    expect(analysis).toHaveProperty("technicalScore");
    expect(analysis).toHaveProperty("technicalSignals");
    expect(analysis).toHaveProperty("sentimentScore");
    expect(analysis).toHaveProperty("capitalScore");
    expect(analysis).toHaveProperty("summary");

    expect(typeof analysis.technicalScore).toBe("number");
    expect(Array.isArray(analysis.technicalSignals)).toBe(true);
    expect(typeof analysis.summary).toBe("string");
  }, 60000); // 60秒超时，因为需要调用AI API
});
