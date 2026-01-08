/**
 * 股票分析工具 - LLM Function Calling 定义
 * 
 * 这些工具允许AI助手在对话中主动查询实时股票数据
 */

import { Tool } from './llm';
import * as eastmoney from '../eastmoney';
import * as fundflow from '../fundflow';

// ==================== 工具定义 ====================

/**
 * 可用的股票分析工具列表
 */
export const stockTools: Tool[] = [
    {
        type: "function",
        function: {
            name: "search_stock",
            description: "根据关键词搜索股票，返回匹配的股票列表。可以搜索股票代码或股票名称。",
            parameters: {
                type: "object",
                properties: {
                    keyword: {
                        type: "string",
                        description: "搜索关键词，可以是股票代码（如 600519）或股票名称（如 茅台、比亚迪）"
                    }
                },
                required: ["keyword"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_stock_quote",
            description: "获取股票的实时行情数据，包括当前价格、涨跌幅、成交量、市盈率等核心指标。",
            parameters: {
                type: "object",
                properties: {
                    code: {
                        type: "string",
                        description: "股票代码，如 600519（贵州茅台）、002594（比亚迪）、000001（平安银行）"
                    }
                },
                required: ["code"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_kline_data",
            description: "获取股票的K线数据，用于技术分析。可以获取日K、周K或月K数据。",
            parameters: {
                type: "object",
                properties: {
                    code: {
                        type: "string",
                        description: "股票代码"
                    },
                    period: {
                        type: "string",
                        enum: ["day", "week", "month"],
                        description: "K线周期：day=日K线，week=周K线，month=月K线"
                    },
                    limit: {
                        type: "number",
                        description: "获取的K线数量，默认30根"
                    }
                },
                required: ["code"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_fund_flow",
            description: "获取股票的资金流向数据，分析主力资金、散户资金的买卖情况。",
            parameters: {
                type: "object",
                properties: {
                    code: {
                        type: "string",
                        description: "股票代码"
                    }
                },
                required: ["code"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_fund_flow_history",
            description: "获取股票近期的资金流向历史数据，分析资金趋势。",
            parameters: {
                type: "object",
                properties: {
                    code: {
                        type: "string",
                        description: "股票代码"
                    },
                    days: {
                        type: "number",
                        description: "获取的天数，默认10天"
                    }
                },
                required: ["code"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_fund_flow_rank",
            description: "获取资金流入排行榜，查看哪些股票资金流入最多。",
            parameters: {
                type: "object",
                properties: {
                    type: {
                        type: "string",
                        enum: ["today", "3day", "5day", "10day"],
                        description: "排行类型：today=今日，3day=3日，5day=5日，10day=10日"
                    },
                    limit: {
                        type: "number",
                        description: "返回数量，默认10"
                    }
                }
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_market_fund_flow",
            description: "获取大盘整体的资金流向情况。",
            parameters: {
                type: "object",
                properties: {}
            }
        }
    }
];

// ==================== 工具执行器 ====================

/**
 * 执行工具调用
 * @param toolName 工具名称
 * @param args 工具参数
 * @returns 工具执行结果（字符串格式，供LLM阅读）
 */
export async function executeStockTool(toolName: string, args: Record<string, any>): Promise<string> {
    try {
        switch (toolName) {
            case "search_stock": {
                const results = await eastmoney.searchStock(args.keyword);
                if (!results || results.length === 0) {
                    return `未找到与 "${args.keyword}" 相关的股票`;
                }
                const topResults = results.slice(0, 5);
                return `搜索 "${args.keyword}" 找到以下股票：\n${topResults.map((s: any) =>
                    `- ${s.code} ${s.name} (${s.market})`
                ).join('\n')}`;
            }

            case "get_stock_quote": {
                const quote = await eastmoney.getStockQuote(args.code);
                if (!quote) {
                    return `无法获取股票 ${args.code} 的行情数据`;
                }
                return formatQuoteData(quote);
            }

            case "get_kline_data": {
                const period = args.period || 'day';
                const limit = args.limit || 30;
                const klines = await eastmoney.getKlineData(args.code, period);
                if (!klines || klines.length === 0) {
                    return `无法获取股票 ${args.code} 的K线数据`;
                }
                const recentKlines = klines.slice(-limit);
                return formatKlineData(args.code, recentKlines, period);
            }

            case "get_fund_flow": {
                const flow = await fundflow.getStockFundFlow(args.code);
                if (!flow) {
                    return `无法获取股票 ${args.code} 的资金流向数据`;
                }
                return formatFundFlowData(flow);
            }

            case "get_fund_flow_history": {
                const days = args.days || 10;
                const history = await fundflow.getStockFundFlowHistory(args.code, days);
                if (!history || history.length === 0) {
                    return `无法获取股票 ${args.code} 的资金流向历史`;
                }
                return formatFundFlowHistory(args.code, history);
            }

            case "get_fund_flow_rank": {
                const type = args.type || 'today';
                const limit = args.limit || 10;
                const rank = await fundflow.getFundFlowRank(type, limit);
                if (!rank || rank.length === 0) {
                    return `无法获取资金流入排行榜`;
                }
                return formatFundFlowRank(rank, type);
            }

            case "get_market_fund_flow": {
                const marketFlow = await fundflow.getMarketFundFlow();
                if (!marketFlow) {
                    return `无法获取大盘资金流向数据`;
                }
                return formatMarketFundFlow(marketFlow);
            }

            default:
                return `未知的工具: ${toolName}`;
        }
    } catch (error: any) {
        console.error(`[StockTools] 执行 ${toolName} 失败:`, error);
        return `执行 ${toolName} 时出错: ${error.message}`;
    }
}

// ==================== 数据格式化函数 ====================

function formatQuoteData(quote: any): string {
    const changeSign = quote.change >= 0 ? '+' : '';
    const changePercentSign = quote.changePercent >= 0 ? '+' : '';

    return `【${quote.name} (${quote.code}) 实时行情】
📊 当前价格：${quote.price} 元
${quote.changePercent >= 0 ? '📈' : '📉'} 涨跌幅：${changePercentSign}${quote.changePercent?.toFixed(2)}%
💰 涨跌额：${changeSign}${quote.change?.toFixed(2)} 元

📅 今日交易：
  今开：${quote.open} 元
  最高：${quote.high} 元
  最低：${quote.low} 元
  昨收：${quote.preClose} 元

📊 成交情况：
  成交量：${(quote.volume / 10000).toFixed(2)} 万手
  成交额：${(quote.amount / 100000000).toFixed(2)} 亿元
  换手率：${quote.turnoverRate?.toFixed(2)}%
  量比：${quote.volumeRatio?.toFixed(2)}

💹 估值指标：
  市盈率(PE)：${quote.pe?.toFixed(2)}
  市净率(PB)：${quote.pb?.toFixed(2)}
  总市值：${(quote.marketCap / 100000000).toFixed(2)} 亿元
  流通市值：${(quote.circulationMarketCap / 100000000).toFixed(2)} 亿元`;
}

function formatKlineData(code: string, klines: any[], period: string): string {
    const periodName = { day: '日', week: '周', month: '月' }[period] || '日';

    // 计算统计数据
    const closes = klines.map(k => k.close);
    const avgPrice = closes.reduce((a, b) => a + b, 0) / closes.length;
    const minPrice = Math.min(...closes);
    const maxPrice = Math.max(...closes);

    // 计算涨跌统计
    let upDays = 0, downDays = 0;
    for (let i = 1; i < klines.length; i++) {
        if (klines[i].close > klines[i - 1].close) upDays++;
        else if (klines[i].close < klines[i - 1].close) downDays++;
    }

    // 最近5根K线详情
    const recent5 = klines.slice(-5);
    const klineDetails = recent5.map(k =>
        `  ${k.date}: 开${k.open} 高${k.high} 低${k.low} 收${k.close}`
    ).join('\n');

    return `【股票 ${code} 近${klines.length}${periodName}K线数据】

📊 统计概览：
  均价：${avgPrice.toFixed(2)} 元
  最高价：${maxPrice.toFixed(2)} 元
  最低价：${minPrice.toFixed(2)} 元
  上涨天数：${upDays} 天
  下跌天数：${downDays} 天

📈 最近5${periodName}走势：
${klineDetails}`;
}

function formatFundFlowData(flow: any): string {
    const formatAmount = (val: number) => {
        if (val === null || val === undefined) return '--';
        const absVal = Math.abs(val);
        const sign = val >= 0 ? '+' : '-';
        if (absVal >= 100000000) return `${sign}${(absVal / 100000000).toFixed(2)}亿`;
        if (absVal >= 10000) return `${sign}${(absVal / 10000).toFixed(0)}万`;
        return `${sign}${absVal.toFixed(0)}`;
    };

    const mainStatus = flow.mainNetInflow >= 0 ? '🟢 净流入' : '🔴 净流出';

    return `【${flow.name} (${flow.code}) 今日资金流向】

${mainStatus}
📊 主力净流入：${formatAmount(flow.mainNetInflow)}
  ├─ 超大单：${formatAmount(flow.superLargeNetInflow)}
  └─ 大单：${formatAmount(flow.largeNetInflow)}

📊 散户资金：
  ├─ 中单：${formatAmount(flow.mediumNetInflow)}
  └─ 小单：${formatAmount(flow.smallNetInflow)}

⏰ 更新时间：${flow.time}`;
}

function formatFundFlowHistory(code: string, history: any[]): string {
    const formatAmount = (val: number) => {
        if (val === null || val === undefined) return '--';
        const absVal = Math.abs(val);
        const sign = val >= 0 ? '+' : '-';
        if (absVal >= 100000000) return `${sign}${(absVal / 100000000).toFixed(2)}亿`;
        if (absVal >= 10000) return `${sign}${(absVal / 10000).toFixed(0)}万`;
        return `${sign}${absVal.toFixed(0)}`;
    };

    // 计算统计
    let totalMainInflow = 0;
    let inflowDays = 0;
    history.forEach(h => {
        totalMainInflow += h.mainNetInflow;
        if (h.mainNetInflow > 0) inflowDays++;
    });

    const details = history.slice(-5).map(h =>
        `  ${h.date}: 主力${formatAmount(h.mainNetInflow)}`
    ).join('\n');

    return `【股票 ${code} 近${history.length}日资金流向】

📊 统计概览：
  累计主力净流入：${formatAmount(totalMainInflow)}
  主力流入天数：${inflowDays}/${history.length} 天

📈 最近5日详情：
${details}`;
}

function formatFundFlowRank(rank: any[], type: string): string {
    const typeName = {
        today: '今日',
        '3day': '3日',
        '5day': '5日',
        '10day': '10日'
    }[type] || '今日';

    const formatAmount = (val: number) => {
        if (val === null || val === undefined) return '--';
        const absVal = Math.abs(val);
        const sign = val >= 0 ? '+' : '-';
        if (absVal >= 100000000) return `${sign}${(absVal / 100000000).toFixed(2)}亿`;
        if (absVal >= 10000) return `${sign}${(absVal / 10000).toFixed(0)}万`;
        return `${sign}${absVal.toFixed(0)}`;
    };

    const details = rank.slice(0, 10).map((item, i) =>
        `  ${i + 1}. ${item.name}(${item.code}) 主力${formatAmount(item.mainNetInflow)} 涨幅${item.changePercent?.toFixed(2)}%`
    ).join('\n');

    return `【${typeName}资金流入排行榜 TOP10】

${details}`;
}

function formatMarketFundFlow(flow: any): string {
    const formatAmount = (val: number) => {
        if (val === null || val === undefined) return '--';
        const absVal = Math.abs(val);
        const sign = val >= 0 ? '+' : '-';
        if (absVal >= 100000000) return `${sign}${(absVal / 100000000).toFixed(2)}亿`;
        if (absVal >= 10000) return `${sign}${(absVal / 10000).toFixed(0)}万`;
        return `${sign}${absVal.toFixed(0)}`;
    };

    const mainStatus = flow.mainNetInflow >= 0 ? '🟢 主力净流入' : '🔴 主力净流出';

    return `【大盘今日资金流向】

${mainStatus}
📊 主力净流入：${formatAmount(flow.mainNetInflow)}
  ├─ 超大单：${formatAmount(flow.superLargeNetInflow)}
  └─ 大单：${formatAmount(flow.largeNetInflow)}

📊 散户资金：
  ├─ 中单：${formatAmount(flow.mediumNetInflow)}
  └─ 小单：${formatAmount(flow.smallNetInflow)}

⏰ 更新时间：${flow.time}`;
}
