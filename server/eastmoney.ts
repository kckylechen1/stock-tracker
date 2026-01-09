/**
 * 东方财富API集成服务
 * 提供免费的A股行情数据
 */

import axios from 'axios';

// 请求头配置
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Referer': 'https://quote.eastmoney.com/',
};

/**
 * 将股票代码转换为东方财富格式
 * @param code 股票代码（如 600000 或 000001）
 * @returns 东方财富格式代码（如 1.600000 或 0.000001）
 */
export function convertToEastmoneyCode(code: string): string {
  // 移除可能的前缀
  const cleanCode = code.replace(/^(SH|SZ|sh|sz)/, '');

  // 判断市场：6开头是上海，0/3开头是深圳
  if (cleanCode.startsWith('6')) {
    return `1.${cleanCode}`;
  } else if (cleanCode.startsWith('0') || cleanCode.startsWith('3')) {
    return `0.${cleanCode}`;
  }

  // 默认返回深圳市场
  return `0.${cleanCode}`;
}

/**
 * 将东方财富格式代码转换为标准代码
 * @param eastmoneyCode 东方财富格式（如 1.600000）
 * @returns 标准代码（如 600000）
 */
export function convertFromEastmoneyCode(eastmoneyCode: string): string {
  return eastmoneyCode.split('.')[1] || eastmoneyCode;
}

/**
 * 获取股票实时行情
 */
export async function getStockQuote(code: string) {
  try {
    const eastmoneyCode = convertToEastmoneyCode(code);
    // 添加fields参数获取完整数据（市盈率、市净率、换手率、量比等）
    // f10=量比, f168=换手率, f169=涨速, f170=振幅
    const fields = 'f10,f43,f44,f45,f46,f47,f48,f58,f60,f116,f117,f162,f167,f168,f169,f170';
    const url = `https://push2.eastmoney.com/api/qt/stock/get?secid=${eastmoneyCode}&fields=${fields}`;

    const response = await axios.get(url, { headers: HEADERS });
    const data = response.data;

    if (!data || !data.data) {
      throw new Error('获取股票行情失败');
    }

    const stockData = data.data;

    // 计算涨跌幅
    const currentPrice = stockData.f43 / 100; // 现价
    const preClose = stockData.f60 / 100; // 昨收
    const change = currentPrice - preClose;
    const changePercent = (change / preClose) * 100;

    return {
      code: convertFromEastmoneyCode(eastmoneyCode),
      name: stockData.f58,
      price: currentPrice,
      preClose: preClose,
      change: change,
      changePercent: changePercent,
      open: stockData.f46 / 100,
      high: stockData.f44 / 100,
      low: stockData.f45 / 100,
      volume: stockData.f47, // 成交量（手）
      amount: stockData.f48, // 成交额（元）
      turnoverRate: stockData.f168 ? stockData.f168 / 100 : null, // 换手率（需要除以100）
      pe: stockData.f162 ? stockData.f162 / 100 : null, // 市盈率（需要除以100）
      pb: stockData.f167 ? stockData.f167 / 100 : null, // 市净率（需要除以100）
      marketCap: stockData.f116, // 总市值
      circulationMarketCap: stockData.f117, // 流通市值
      volumeRatio: stockData.f10 ? stockData.f10 / 100 : null, // 量比
    };
  } catch (error: any) {
    console.error(`[Eastmoney] Failed to get quote for ${code}:`, error.message);
    throw error;
  }
}

/**
 * 搜索股票
 */
export async function searchStock(keyword: string) {
  try {
    // 使用东方财富搜索API
    const url = `https://searchapi.eastmoney.com/api/suggest/get`;
    const params = {
      input: keyword,
      type: '14', // 14表示股票
      token: 'D43BF722C8E33BDC906FB84D85E326E8',
      count: 10,
    };

    const response = await axios.get(url, {
      params,
      headers: HEADERS
    });

    const data = response.data;

    if (!data || !data.QuotationCodeTable || !data.QuotationCodeTable.Data) {
      return [];
    }

    return data.QuotationCodeTable.Data.map((item: any) => ({
      code: item.Code,
      symbol: item.Code,
      name: item.Name,
      market: item.MktNum === '1' ? 'SH' : 'SZ',
      type: item.SecurityTypeName,
    }));
  } catch (error: any) {
    console.error(`[Eastmoney] Search failed for keyword "${keyword}":`, error.message);
    return [];
  }
}

/**
 * 获取K线数据
 * @param code 股票代码
 * @param period K线周期（day/week/month）
 * @param startDate 开始日期（YYYYMMDD）
 * @param endDate 结束日期（YYYYMMDD）
 */
export async function getKlineData(
  code: string,
  period: 'day' | 'week' | 'month' = 'day',
  startDate?: string,
  endDate: string = '20500101'
) {
  try {
    const eastmoneyCode = convertToEastmoneyCode(code);

    // K线周期映射
    const periodMap = {
      day: '101',
      week: '102',
      month: '103',
    };

    const klt = periodMap[period];
    const beg = startDate || '20200101'; // 默认从2020年开始

    // 生成回调函数名（模拟JSONP）
    const timestamp = Date.now();
    const callback = `jQuery${Math.random().toString().replace('.', '')}${timestamp}`;

    const url = `https://push2his.eastmoney.com/api/qt/stock/kline/get`;
    const params = {
      cb: callback,
      secid: eastmoneyCode,
      ut: 'fa5fd1943c7b386f172d6893dbfba10b',
      fields1: 'f1,f2,f3,f4,f5,f6',
      fields2: 'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61',
      klt: klt,
      fqt: '1', // 前复权
      beg: beg,
      end: endDate,
      lmt: '800',
      _: timestamp,
    };

    const response = await axios.get(url, {
      params,
      headers: HEADERS,
    });

    // 处理JSONP响应
    let jsonpData = response.data;
    if (typeof jsonpData === 'string') {
      // 移除JSONP包装
      jsonpData = jsonpData.replace(/^[^(]+\(/, '').replace(/\);?$/, '');
      jsonpData = JSON.parse(jsonpData);
    }

    if (!jsonpData || !jsonpData.data || !jsonpData.data.klines) {
      throw new Error('K线数据为空');
    }

    // 解析K线数据
    const klines = jsonpData.data.klines.map((line: string) => {
      const parts = line.split(',');
      return {
        date: parts[0], // 日期
        open: parseFloat(parts[1]), // 开盘价
        close: parseFloat(parts[2]), // 收盘价
        high: parseFloat(parts[3]), // 最高价
        low: parseFloat(parts[4]), // 最低价
        volume: parseInt(parts[5]), // 成交量
        amount: parseFloat(parts[6]), // 成交额
        amplitude: parseFloat(parts[7]), // 振幅
        changePercent: parseFloat(parts[8]), // 涨跌幅
        change: parseFloat(parts[9]), // 涨跌额
        turnoverRate: parseFloat(parts[10]), // 换手率
      };
    });

    return klines;
  } catch (error: any) {
    console.error(`[Eastmoney] Failed to get kline data for ${code}:`, error.message);
    throw error;
  }
}

/**
 * 获取分时数据
 * @param code 股票代码
 * @param days 天数 (1, 3, 5)
 */
export async function getTimelineData(code: string, days: number = 1) {
  try {
    const eastmoneyCode = convertToEastmoneyCode(code);
    const timestamp = Date.now();
    const callback = `jQuery${Math.random().toString().replace('.', '')}${timestamp}`;

    const url = `https://push2his.eastmoney.com/api/qt/stock/trends2/get`;
    const params = {
      cb: callback,
      secid: eastmoneyCode,
      ut: 'fa5fd1943c7b386f172d6893dbfba10b',
      fields1: 'f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11,f12,f13',
      fields2: 'f51,f52,f53,f54,f55,f56,f57,f58',
      iscr: '0',
      ndays: String(days), // 支持多日分时
      _: timestamp,
    };

    const response = await axios.get(url, {
      params,
      headers: HEADERS,
    });

    // 处理JSONP响应
    let jsonpData = response.data;
    if (typeof jsonpData === 'string') {
      jsonpData = jsonpData.replace(/^[^(]+\(/, '').replace(/\);?$/, '');
      jsonpData = JSON.parse(jsonpData);
    }

    if (!jsonpData || !jsonpData.data || !jsonpData.data.trends) {
      throw new Error('分时数据为空');
    }

    const preClose = jsonpData.data.preClose; // 昨收价

    // 解析分时数据
    const timeline = jsonpData.data.trends.map((line: string) => {
      const parts = line.split(',');
      const price = parseFloat(parts[2]);
      return {
        time: parts[0], // 时间 (YYYY-MM-DD HH:mm)
        price: price, // 价格
        avgPrice: parseFloat(parts[3]), // 均价
        volume: parseInt(parts[5]), // 成交量
        amount: parseFloat(parts[6]), // 成交额
        changePercent: ((price - preClose) / preClose) * 100, // 涨跌幅
      };
    });

    return {
      preClose,
      timeline,
    };
  } catch (error: any) {
    console.error(`[Eastmoney] Failed to get timeline data for ${code}:`, error.message);
    throw error;
  }
}

/**
 * 获取股票基本信息
 */
export async function getStockInfo(code: string) {
  try {
    const quote = await getStockQuote(code);
    return {
      code: quote.code,
      name: quote.name,
      market: code.startsWith('6') ? 'SH' : 'SZ',
    };
  } catch (error: any) {
    console.error(`[Eastmoney] Failed to get stock info for ${code}:`, error.message);
    throw error;
  }
}
