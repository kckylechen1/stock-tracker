/**
 * 资金流向 API 模块
 * 直接调用东方财富 HTTP API
 */

import axios from "axios";

/**
 * 获取个股资金流向 (今日，非交易时间返回上个交易日数据)
 * @param code 股票代码
 */
export async function getStockFundFlow(code: string) {
  try {
    // 判断市场: 6开头是上海(1), 其他是深圳(0)
    const market = code.startsWith("6") ? 1 : 0;
    const secid = `${market}.${code}`;

    const response = await axios.get(
      "https://push2.eastmoney.com/api/qt/stock/fflow/kline/get",
      {
        params: {
          secid,
          fields1: "f1,f2,f3,f7",
          fields2: "f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61,f62,f63",
          klt: 1, // 1=今日
          lmt: 1,
        },
        timeout: 10000,
      }
    );

    const data = response.data?.data;
    if (!data || !data.klines || data.klines.length === 0) {
      // 非交易时间: 尝试获取历史数据
      return await getLastTradingDayFundFlow(code);
    }

    // 解析 klines 数据
    // 格式: "2026-01-08 15:00,主力净流入,超大单净流入,大单净流入,中单净流入,小单净流入"
    const lastKline = data.klines[data.klines.length - 1];
    const parts = lastKline.split(",");

    return {
      code: data.code,
      name: data.name,
      time: parts[0],
      mainNetInflow: parseFloat(parts[1]) || 0, // 主力净流入
      superLargeNetInflow: parseFloat(parts[2]) || 0, // 超大单净流入
      largeNetInflow: parseFloat(parts[3]) || 0, // 大单净流入
      mediumNetInflow: parseFloat(parts[4]) || 0, // 中单净流入
      smallNetInflow: parseFloat(parts[5]) || 0, // 小单净流入
      isNonTradingHours: false,
    };
  } catch (error: any) {
    console.error("[FundFlow] getStockFundFlow failed:", error.message);
    // 出错时也尝试获取历史数据
    return await getLastTradingDayFundFlow(code);
  }
}

/**
 * 获取上个交易日的资金流向（用于非交易时间显示）
 */
async function getLastTradingDayFundFlow(code: string) {
  try {
    const history = await getStockFundFlowHistory(code, 1);
    if (history && history.length > 0) {
      const last = history[history.length - 1];
      return {
        code: code,
        name: "",
        time: last.date,
        mainNetInflow: last.mainNetInflow || 0,
        superLargeNetInflow: last.superLargeNetInflow || 0,
        largeNetInflow: last.largeNetInflow || 0,
        mediumNetInflow: last.mediumNetInflow || 0,
        smallNetInflow: last.smallNetInflow || 0,
        isNonTradingHours: true,
      };
    }
  } catch (e) {
    // 静默失败
  }
  return null;
}

/**
 * 获取个股资金流向历史 (最近N天)
 * @param code 股票代码
 * @param days 天数
 */
export async function getStockFundFlowHistory(code: string, days: number = 10) {
  try {
    const market = code.startsWith("6") ? 1 : 0;
    const secid = `${market}.${code}`;

    const response = await axios.get(
      "https://push2his.eastmoney.com/api/qt/stock/fflow/daykline/get",
      {
        params: {
          secid,
          fields1: "f1,f2,f3,f7",
          fields2: "f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61,f62,f63,f64",
          lmt: days,
        },
        timeout: 10000,
      }
    );

    const data = response.data?.data;
    if (!data || !data.klines) {
      return [];
    }

    return data.klines.map((kline: string) => {
      const parts = kline.split(",");
      return {
        date: parts[0],
        mainNetInflow: parseFloat(parts[1]) || 0,
        smallNetInflow: parseFloat(parts[2]) || 0,
        mediumNetInflow: parseFloat(parts[3]) || 0,
        largeNetInflow: parseFloat(parts[4]) || 0,
        superLargeNetInflow: parseFloat(parts[5]) || 0,
        mainNetInflowRate: parseFloat(parts[6]) || 0,
      };
    });
  } catch (error: any) {
    console.error("[FundFlow] getStockFundFlowHistory failed:", error.message);
    return [];
  }
}

/**
 * 获取大盘资金流向
 */
export async function getMarketFundFlow() {
  try {
    const response = await axios.get(
      "https://push2.eastmoney.com/api/qt/stock/fflow/kline/get",
      {
        params: {
          secid: "1.000001", // 上证指数
          fields1: "f1,f2,f3,f7",
          fields2: "f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61,f62,f63",
          klt: 1,
          lmt: 1,
        },
        timeout: 10000,
      }
    );

    const data = response.data?.data;
    if (!data || !data.klines || data.klines.length === 0) {
      return null;
    }

    const lastKline = data.klines[data.klines.length - 1];
    const parts = lastKline.split(",");

    return {
      time: parts[0],
      mainNetInflow: parseFloat(parts[1]) || 0,
      superLargeNetInflow: parseFloat(parts[2]) || 0,
      largeNetInflow: parseFloat(parts[3]) || 0,
      mediumNetInflow: parseFloat(parts[4]) || 0,
      smallNetInflow: parseFloat(parts[5]) || 0,
    };
  } catch (error: any) {
    console.error("[FundFlow] getMarketFundFlow failed:", error.message);
    return null;
  }
}

/**
 * 获取资金流排行
 * @param type 排行类型: 'today' | '3day' | '5day' | '10day'
 * @param limit 数量
 */
export async function getFundFlowRank(
  type: "today" | "3day" | "5day" | "10day" = "today",
  limit: number = 50
) {
  try {
    const dayMap: Record<string, string> = {
      today: "f62",
      "3day": "f267",
      "5day": "f164",
      "10day": "f174",
    };
    const sortField = dayMap[type] || "f62";

    const response = await axios.get(
      "https://push2.eastmoney.com/api/qt/clist/get",
      {
        params: {
          pn: 1,
          pz: limit,
          po: 1,
          np: 1,
          fltt: 2,
          invt: 2,
          fid: sortField,
          fs: "m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23,m:0+t:81+s:2048",
          fields: `f2,f3,f12,f14,f62,f184,f66,f69,f72,f75,f78,f81,f84,f87,${sortField}`,
        },
        timeout: 10000,
      }
    );

    const data = response.data?.data;
    if (!data || !data.diff) {
      return [];
    }

    return data.diff.map((item: any) => ({
      code: item.f12,
      name: item.f14,
      price: item.f2, // fltt:2 时已是实际值，不需要 /100
      changePercent: item.f3, // fltt:2 时已是实际值，不需要 /100
      mainNetInflow: item.f62,
      mainNetInflowRate: item.f184, // fltt:2 时已是实际值，不需要 /100
      superLargeNetInflow: item.f66,
      largeNetInflow: item.f72,
      mediumNetInflow: item.f78,
      smallNetInflow: item.f84,
    }));
  } catch (error: any) {
    console.error("[FundFlow] getFundFlowRank failed:", error.message);
    return [];
  }
}

/**
 * 格式化资金金额
 */
export function formatFundAmount(value: number): string {
  if (value === null || value === undefined || isNaN(value)) return "--";

  const absValue = Math.abs(value);
  const sign = value >= 0 ? "+" : "-";

  if (absValue >= 100000000) {
    return `${sign}${(absValue / 100000000).toFixed(2)}亿`;
  } else if (absValue >= 10000) {
    return `${sign}${(absValue / 10000).toFixed(0)}万`;
  }
  return `${sign}${absValue.toFixed(0)}`;
}
