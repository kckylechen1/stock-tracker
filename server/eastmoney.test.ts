import axios from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("axios", () => {
  return {
    default: {
      get: vi.fn(),
    },
  };
});

import * as eastmoney from "./eastmoney";

const mockAxiosGet = vi.mocked(axios.get);

beforeEach(() => {
  mockAxiosGet.mockReset();
});

describe("Eastmoney API", () => {
  it("should convert stock code to eastmoney format", () => {
    expect(eastmoney.convertToEastmoneyCode("600000")).toBe("1.600000");
    expect(eastmoney.convertToEastmoneyCode("000001")).toBe("0.000001");
    expect(eastmoney.convertToEastmoneyCode("300750")).toBe("0.300750");
  });

  it("should convert eastmoney code to standard format", () => {
    expect(eastmoney.convertFromEastmoneyCode("1.600000")).toBe("600000");
    expect(eastmoney.convertFromEastmoneyCode("0.000001")).toBe("000001");
  });

  it("should get stock quote", async () => {
    mockAxiosGet.mockImplementation(async (url: string) => {
      if (url.includes("/api/qt/stock/get")) {
        return {
          data: {
            data: {
              f43: 10000, // 现价 100.00
              f44: 10100, // 最高 101.00
              f45: 9900, // 最低 99.00
              f46: 9950, // 开盘 99.50
              f47: 123456, // 成交量
              f48: 987654321, // 成交额
              f58: "贵州茅台",
              f60: 9500, // 昨收 95.00
              f116: 123000000000, // 总市值
              f117: 120000000000, // 流通市值
              f162: 2000, // PE 20.00
              f167: 500, // PB 5.00
              f168: 1234, // 换手率 12.34
              f169: 10,
              f170: 20,
            },
          },
        } as any;
      }

      if (url.includes("/api/qt/ulist.np/get")) {
        return {
          data: {
            data: {
              diff: [{ f10: 1.23 }],
            },
          },
        } as any;
      }

      throw new Error(`Unexpected axios.get URL: ${url}`);
    });

    const quote = await eastmoney.getStockQuote("600519");

    expect(quote).toBeDefined();
    expect(quote.code).toBe("600519");
    expect(quote.name).toBe("贵州茅台");
    expect(quote.price).toBeGreaterThan(0);
    expect(quote.volumeRatio).toBe(1.23);
  });

  it("should search stocks", async () => {
    mockAxiosGet.mockResolvedValueOnce({
      data: {
        QuotationCodeTable: {
          Data: [
            {
              Code: "600519",
              Name: "贵州茅台",
              MktNum: "1",
              SecurityTypeName: "沪A",
            },
          ],
        },
      },
    } as any);

    const results = await eastmoney.searchStock("茅台");
    
    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    
    // 应该包含贵州茅台
    const maotai = results.find((stock: any) => stock.code === "600519");
    expect(maotai).toBeDefined();
  });

  it("should get kline data", async () => {
    const payload = {
      data: {
        klines: [
          "2026-01-02,100.00,101.00,102.00,99.00,12345,1000000,1.00,1.00,1.00,0.50",
          "2026-01-03,101.00,100.50,103.00,100.00,23456,2000000,2.00,-0.50,-0.50,0.60",
        ],
      },
    };
    mockAxiosGet.mockResolvedValueOnce({
      data: `jQuery12345(${JSON.stringify(payload)});`,
    } as any);

    const klines = await eastmoney.getKlineData("600519", "day");
    
    expect(klines).toBeDefined();
    expect(Array.isArray(klines)).toBe(true);
    expect(klines.length).toBeGreaterThan(0);
    
    // 检查数据结构
    const firstKline = klines[0];
    expect(firstKline).toHaveProperty("date");
    expect(firstKline).toHaveProperty("open");
    expect(firstKline).toHaveProperty("close");
    expect(firstKline).toHaveProperty("high");
    expect(firstKline).toHaveProperty("low");
    expect(firstKline).toHaveProperty("volume");
  });
});
