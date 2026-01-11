/**
 * 股票分析工具 - LLM Function Calling 定义
 * 
 * 这些工具允许AI助手在对话中主动查询实时股票数据
 */

import { Tool } from './llm';
import * as eastmoney from '../eastmoney';
import * as fundflow from '../fundflow';
import * as akshare from '../akshare';
import { formatMoney, formatPercent, formatDate } from './formatUtils';
import { analyzeStock, formatAnalysisForAI } from './technicalAnalysis';
import { analyzeMinutePatterns, formatMinuteAnalysis } from './minutePatterns';
import * as tradingMemory from './tradingMemory';

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
    },
    {
        type: "function",
        function: {
            name: "get_current_datetime",
            description: "获取当前的日期和时间。当用户询问'今天'、'现在'、'当前日期'等时，必须先调用此工具获取准确的日期时间。",
            parameters: {
                type: "object",
                properties: {}
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_longhu_bang",
            description: "获取龙虎榜数据，包括上榜股票、机构买卖情况、游资动向等。适合分析短线热点和资金动向。",
            parameters: {
                type: "object",
                properties: {
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
            name: "get_market_news",
            description: "获取最新财经资讯和市场新闻。盘前可用于了解当日重要消息和政策动向。",
            parameters: {
                type: "object",
                properties: {}
            }
        }
    },
    {
        type: "function",
        function: {
            name: "analyze_stock_technical",
            description: "对股票进行完整的技术分析，基于'没走弱'5项检查清单判断是否应该持有。返回均线状态、MACD、RSI、KDJ、成交量分析，以及分批进场建议和止损位。这是最重要的分析工具，当用户问'能不能卖'、'应该持有吗'、'技术面怎么样'时必须调用。",
            parameters: {
                type: "object",
                properties: {
                    code: {
                        type: "string",
                        description: "股票代码，如 300433（蓝思科技）、300274（阳光电源）"
                    },
                    date: {
                        type: "string",
                        description: "可选，分析的目标日期，格式 YYYY-MM-DD。不填则分析最新数据。用于回测历史信号。"
                    }
                },
                required: ["code"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "analyze_minute_patterns",
            description: "分析股票的5分钟K线形态，识别旗形、箱体、均线粘合等安全回补形态。当用户问'什么时候进场'、'有没有买点'时调用。",
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
            name: "get_trading_memory",
            description: "获取用户的交易记忆，包括持仓、历史交易、交易教训。分析股票前应先调用此工具了解用户的历史操作和教训。",
            parameters: {
                type: "object",
                properties: {
                    symbol: {
                        type: "string",
                        description: "可选，指定股票代码则只返回该股票相关的记忆"
                    }
                }
            }
        }
    },
    {
        type: "function",
        function: {
            name: "add_trading_lesson",
            description: "记录用户的交易教训。当用户分享失败的交易经验或总结教训时调用。",
            parameters: {
                type: "object",
                properties: {
                    symbol: {
                        type: "string",
                        description: "股票代码，通用教训用 '*'"
                    },
                    lesson: {
                        type: "string",
                        description: "教训内容"
                    },
                    signalPattern: {
                        type: "string",
                        description: "触发信号模式，如'RSI<30 + 放量阴线'"
                    },
                    actionToAvoid: {
                        type: "string",
                        description: "应该避免的行为"
                    },
                    recommendedAction: {
                        type: "string",
                        description: "推荐的正确做法"
                    }
                },
                required: ["symbol", "lesson", "signalPattern", "actionToAvoid", "recommendedAction"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_market_status",
            description: "获取大盘整体状态，包括上证指数、深证成指、创业板指的涨跌情况。分析个股走势前应先了解大盘环境。当用户问'今天大盘怎么样'、'市场行情如何'、分析走势时调用。",
            parameters: {
                type: "object",
                properties: {}
            }
        }
    },
    {
        type: "function",
        function: {
            name: "comprehensive_analysis",
            description: "对股票进行多维度综合分析，包括技术面、资金面、大盘环境。当用户问'走势怎么样'、'分析一下'、'能不能买/卖'时，优先调用此工具获得全面分析。",
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
            name: "get_guba_hot_rank",
            description: "获取股票的股吧人气排名和情绪分析。人气排名是散户关注度的实时反映，可用于判断市场情绪。当用户问'人气怎么样'、'关注度'、'情绪'、或需要分析短线题材股时调用。",
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
    // ==================== AKShare 新增工具 ====================
    {
        type: "function",
        function: {
            name: "get_zt_pool",
            description: "获取今日涨停股池，包括涨停时间、连板数、封单金额等信息。适合分析市场热点和龙头股。当用户问'今天涨停的有哪些'、'涨停板'、'连板股'时调用。",
            parameters: {
                type: "object",
                properties: {
                    date: {
                        type: "string",
                        description: "可选，日期格式 YYYYMMDD，默认今天"
                    }
                }
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_dt_pool",
            description: "获取今日跌停股池。当用户问'跌停的有哪些'、'哪些股票跌停了'时调用。",
            parameters: {
                type: "object",
                properties: {
                    date: {
                        type: "string",
                        description: "可选，日期格式 YYYYMMDD，默认今天"
                    }
                }
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_concept_board",
            description: "获取概念板块列表和涨跌情况。当用户问'今天哪个概念火'、'热门板块'、'题材'时调用。",
            parameters: {
                type: "object",
                properties: {}
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_industry_board",
            description: "获取行业板块列表和涨跌情况。当用户问'哪个行业涨得好'、'行业板块'时调用。",
            parameters: {
                type: "object",
                properties: {}
            }
        }
    },

    {
        type: "function",
        function: {
            name: "get_telegraph",
            description: "获取财联社电报，最新的财经快讯。当用户问'有什么新闻'、'最新消息'、'财经资讯'时调用。",
            parameters: {
                type: "object",
                properties: {}
            }
        }
    },
    {
        type: "function",
        function: {
            name: "call_akshare",
            description: "动态调用任意 AKShare 接口。当需要调用其他未预定义的 AKShare 接口时使用。参考 AKShare 文档：https://akshare.akfamily.xyz/",
            parameters: {
                type: "object",
                properties: {
                    function_name: {
                        type: "string",
                        description: "AKShare 函数名，如 stock_zh_a_spot_em、stock_zt_pool_em"
                    },
                    params: {
                        type: "object",
                        description: "函数参数，如 { symbol: '300308', period: 'daily' }"
                    }
                },
                required: ["function_name"]
            }
        }
    }
];

// ==================== 工具执行器 ====================

import { toolCache } from './cache';

// 需要缓存的工具列表（排除写入操作和实时性要求极高的工具）
const CACHEABLE_TOOLS = new Set([
    'get_stock_quote',
    'get_kline_data',
    'get_fund_flow',
    'get_fund_flow_history',
    'get_fund_flow_rank',
    'get_market_fund_flow',
    'get_longhu_bang',
    'analyze_stock_technical',
    'get_market_status',
    'get_guba_hot_rank',
    'get_zt_pool',
    'get_dt_pool',
    'get_concept_board',
    'get_industry_board',
    'comprehensive_analysis',
    // 'get_north_flow', // 北向资金API已不可用，移除缓存
]);

/**
 * 执行工具调用（带智能缓存）
 * @param toolName 工具名称
 * @param args 工具参数
 * @returns 工具执行结果（字符串格式，供LLM阅读）
 */
export async function executeStockTool(toolName: string, args: Record<string, any>): Promise<string> {
    // 生成缓存键
    const cacheKey = `${toolName}:${JSON.stringify(args)}`;

    // 检查是否可缓存且有缓存
    if (CACHEABLE_TOOLS.has(toolName)) {
        const cached = toolCache.get<string>(cacheKey);
        if (cached) {
            return cached;
        }
    }

    // 执行工具
    const result = await executeStockToolInternal(toolName, args);

    // 缓存结果（仅缓存成功的结果）
    if (CACHEABLE_TOOLS.has(toolName) && !result.includes('失败') && !result.includes('无法获取')) {
        toolCache.set(cacheKey, result, toolName);
    }

    return result;
}

/**
 * 内部工具执行（无缓存）
 */
async function executeStockToolInternal(toolName: string, args: Record<string, any>): Promise<string> {
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

            case "get_current_datetime": {
                const now = new Date();
                const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
                const year = now.getFullYear();
                const month = now.getMonth() + 1;
                const day = now.getDate();
                const weekday = weekdays[now.getDay()];
                const hours = now.getHours().toString().padStart(2, '0');
                const minutes = now.getMinutes().toString().padStart(2, '0');

                // 判断是否为交易日和交易时间
                const isWeekend = now.getDay() === 0 || now.getDay() === 6;
                const currentMinutes = now.getHours() * 60 + now.getMinutes();
                const morningOpen = 9 * 60 + 30;  // 9:30
                const morningClose = 11 * 60 + 30; // 11:30
                const afternoonOpen = 13 * 60;     // 13:00
                const afternoonClose = 15 * 60;    // 15:00

                let tradingStatus = '';
                if (isWeekend) {
                    tradingStatus = '（周末休市）';
                } else if (currentMinutes < morningOpen) {
                    tradingStatus = '（盘前，未开盘）';
                } else if (currentMinutes >= morningOpen && currentMinutes < morningClose) {
                    tradingStatus = '（早盘交易中）';
                } else if (currentMinutes >= morningClose && currentMinutes < afternoonOpen) {
                    tradingStatus = '（午间休市）';
                } else if (currentMinutes >= afternoonOpen && currentMinutes < afternoonClose) {
                    tradingStatus = '（午盘交易中）';
                } else {
                    tradingStatus = '（收盘）';
                }

                return `当前时间：${year}年${month}月${day}日 ${weekday} ${hours}:${minutes} ${tradingStatus}`;
            }

            case "get_longhu_bang": {
                const limit = args.limit || 10;
                const data = await akshare.getLongHuBangDetail();
                if (!data || data.length === 0) {
                    return `暂无龙虎榜数据`;
                }
                return formatLongHuBang(data.slice(0, limit));
            }

            case "get_market_news": {
                try {
                    const data = await akshare.getMarketNews();
                    if (!data || data.length === 0) {
                        return `暂无市场资讯`;
                    }
                    return formatMarketNews(data.slice(0, 10));
                } catch (error) {
                    return `获取市场资讯失败，请稍后重试`;
                }
            }

            case "analyze_stock_technical": {
                const code = args.code;
                const date = args.date;

                if (!code) {
                    return `请提供股票代码`;
                }

                const result = await analyzeStock(code, date);
                if (!result) {
                    return `无法分析股票 ${code}，请检查代码是否正确`;
                }

                return formatAnalysisForAI(result);
            }

            case "analyze_minute_patterns": {
                const code = args.code;

                if (!code) {
                    return `请提供股票代码`;
                }

                const result = await analyzeMinutePatterns(code);
                if (!result) {
                    return `无法获取 ${code} 的5分钟K线数据`;
                }

                return formatMinuteAnalysis(result);
            }

            case "get_trading_memory": {
                const symbol = args.symbol;

                // 初始化示例数据（如果是空的）
                tradingMemory.initSampleMemory();

                const context = tradingMemory.generateAIContext(symbol);
                if (!context || context.trim() === '') {
                    return `暂无交易记忆数据`;
                }

                return context;
            }

            case "add_trading_lesson": {
                const { symbol, lesson, signalPattern, actionToAvoid, recommendedAction } = args;

                if (!symbol || !lesson || !signalPattern || !actionToAvoid || !recommendedAction) {
                    return `缺少必要参数`;
                }

                const lessonId = tradingMemory.addLesson({
                    date: new Date().toISOString().split('T')[0],
                    symbol,
                    lesson,
                    signalPattern,
                    actionToAvoid,
                    recommendedAction,
                });

                return `✅ 已记录交易教训 (ID: ${lessonId})\n\n教训内容: ${lesson}\n触发信号: ${signalPattern}\n❌ 避免: ${actionToAvoid}\n✅ 推荐: ${recommendedAction}`;
            }

            case "get_market_status": {
                console.log(`[StreamChat] 执行工具: get_market_status`);

                try {
                    // 获取三大指数行情
                    const [shangzheng, shenzhen, chuangye] = await Promise.all([
                        eastmoney.getStockQuote('000001').catch(() => null), // 上证指数
                        eastmoney.getStockQuote('399001').catch(() => null), // 深证成指
                        eastmoney.getStockQuote('399006').catch(() => null), // 创业板指
                    ]);

                    const formatIndex = (data: any, name: string) => {
                        if (!data) return `${name}: 数据获取失败`;
                        const sign = data.changePercent >= 0 ? '📈' : '📉';
                        const changeSign = data.changePercent >= 0 ? '+' : '';
                        return `${sign} ${name}: ${data.price?.toFixed(2) ?? '--'} (${changeSign}${data.changePercent?.toFixed(2) ?? '--'}%)`;
                    };

                    // 判断大盘整体状态
                    const avgChange = [shangzheng?.changePercent, shenzhen?.changePercent, chuangye?.changePercent]
                        .filter(v => v !== null && v !== undefined)
                        .reduce((a: number, b: number) => a + b, 0) / 3;

                    let marketStatus = '';
                    if (avgChange > 1.5) {
                        marketStatus = '🟢 **强势上涨** - 大盘环境极佳，个股操作可激进';
                    } else if (avgChange > 0.3) {
                        marketStatus = '🟢 **温和上涨** - 大盘环境良好，正常操作';
                    } else if (avgChange > -0.3) {
                        marketStatus = '🟡 **震荡整理** - 大盘走平，个股需精选';
                    } else if (avgChange > -1.5) {
                        marketStatus = '🟠 **温和下跌** - 需谨慎，控制仓位';
                    } else {
                        marketStatus = '🔴 **大幅下跌** - 建议规避，即使技术面好也可能被带崩';
                    }

                    return `【大盘今日状态】

${formatIndex(shangzheng, '上证指数')}
${formatIndex(shenzhen, '深证成指')}
${formatIndex(chuangye, '创业板指')}

📊 综合判断：${marketStatus}

💡 操作建议：
${avgChange > 0.3 ? '✅ 大盘配合，可正常执行个股操作策略' : avgChange > -0.3 ? '⚠️ 大盘震荡，个股操作需更加精选确认信号' : '❌ 大盘弱势，即使个股技术面好也建议减半仓位或观望'}`;
                } catch (error: any) {
                    return `获取大盘数据失败: ${error.message}`;
                }
            }

            case "comprehensive_analysis": {
                console.log(`[StreamChat] 执行工具: comprehensive_analysis { code: '${args.code}' }`);

                const code = args.code;
                if (!code) {
                    return `股票代码不能为空`;
                }

                try {
                    // 并行获取所有数据
                    const [techResult, fundFlow, historyFlow, marketStatus] = await Promise.all([
                        analyzeStock(code).catch(() => null),
                        fundflow.getStockFundFlow(code).catch(() => null),
                        fundflow.getStockFundFlowHistory(code, 5).catch(() => []),
                        // 获取大盘状态
                        Promise.all([
                            eastmoney.getStockQuote('000001').catch(() => null),
                            eastmoney.getStockQuote('399006').catch(() => null),
                        ])
                    ]);

                    // 技术分析部分
                    let techSection = '';
                    if (!techResult) {
                        techSection = `⚠️ 技术分析数据获取失败`;
                    } else {
                        techSection = formatAnalysisForAI(techResult);
                    }

                    // 资金分析部分
                    let fundSection = '';
                    if (fundFlow) {
                        const mainFlow = fundFlow.mainNetInflow || 0;
                        const flowStatus = mainFlow >= 0 ? '🟢 主力净流入' : '🔴 主力净流出';
                        fundSection = `\n━━━━━━━━━━━━━━━━━━━━━━━━

📍 **资金面分析**

${flowStatus}: ${(Math.abs(mainFlow) / 100000000).toFixed(2)}亿
  ├─ 超大单: ${((fundFlow.superLargeNetInflow || 0) / 100000000).toFixed(2)}亿
  └─ 大单: ${((fundFlow.largeNetInflow || 0) / 100000000).toFixed(2)}亿`;

                        // 添加历史趋势
                        if (historyFlow && historyFlow.length > 0) {
                            const flowTrend = historyFlow.map((f: any) => {
                                const val = f.mainNetInflow || f['主力净流入-净额'] || 0;
                                const sign = val >= 0 ? '+' : '';
                                return `${f.date || f['日期'] || '--'}: ${sign}${(val / 100000000).toFixed(2)}亿`;
                            }).join('\n  ');
                            fundSection += `\n\n📊 近5日趋势:\n  ${flowTrend}`;
                        }
                    }

                    // 大盘环境部分
                    let marketSection = '';
                    const [shangzheng, chuangye] = marketStatus;
                    if (shangzheng || chuangye) {
                        const avgChange = ((shangzheng?.changePercent || 0) + (chuangye?.changePercent || 0)) / 2;
                        let envStatus = '';
                        if (avgChange > 1) {
                            envStatus = '🟢 大盘强势，环境配合';
                        } else if (avgChange > -0.5) {
                            envStatus = '🟡 大盘平稳，正常操作';
                        } else {
                            envStatus = '🔴 大盘走弱，需谨慎';
                        }
                        marketSection = `\n━━━━━━━━━━━━━━━━━━━━━━━━

📍 **大盘环境**

上证: ${shangzheng?.changePercent?.toFixed(2) || '--'}%  创业板: ${chuangye?.changePercent?.toFixed(2) || '--'}%
判断: ${envStatus}`;
                    }

                    // 综合建议部分
                    let conclusionSection = '\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎯 **综合建议**\n\n';

                    if (techResult) {
                        const score = techResult.notWeakenedScore;
                        const mainFlow = fundFlow?.mainNetInflow || 0;
                        const marketAvg = ((shangzheng?.changePercent || 0) + (chuangye?.changePercent || 0)) / 2;

                        // 综合评分
                        let advice = '';
                        if (score >= 4 && mainFlow > 0 && marketAvg > -0.5) {
                            advice = '✅ **建议持有/加仓** - 技术面强(' + score + '/5)、资金流入、大盘配合';
                        } else if (score >= 3 && mainFlow > 0) {
                            advice = '✅ **可持有** - 技术面尚可(' + score + '/5)、资金支撑';
                        } else if (score >= 3) {
                            advice = '⚠️ **谨慎持有** - 技术面OK但资金或大盘不配合';
                        } else if (score >= 2) {
                            advice = '⚠️ **观望为主** - 技术面走弱(' + score + '/5)，等待明确信号';
                        } else {
                            advice = '❌ **建议规避** - 技术面已破位(' + score + '/5)，风险大于收益';
                        }

                        conclusionSection += advice;

                        // 添加止损提醒
                        if (techResult.stopLossAggressive) {
                            conclusionSection += `\n\n💰 止损参考:\n  激进: ${techResult.stopLossAggressive.toFixed(2)}元\n  稳健: ${techResult.stopLossModerate.toFixed(2)}元`;
                        }
                    } else {
                        conclusionSection += '⚠️ 无法获取技术分析数据，请稍后再试';
                    }

                    return `【${code} 综合分析报告】

${techSection}${fundSection}${marketSection}${conclusionSection}`;

                } catch (error: any) {
                    console.error('[ComprehensiveAnalysis] 失败:', error);
                    return `综合分析失败: ${error.message}`;
                }
            }

            case "get_guba_hot_rank": {
                const code = args.code;
                if (!code) {
                    return `股票代码不能为空`;
                }

                try {
                    // 动态导入避免循环依赖
                    const hotRank = await import('../hotRank');

                    const [rank, history] = await Promise.all([
                        hotRank.getStockHotRank(code),
                        hotRank.getStockHotRankHistory(code),
                    ]);

                    return hotRank.formatHotRankForAI(rank, history);
                } catch (error: any) {
                    console.error('[GetGubaHotRank] 失败:', error);
                    return `获取股吧人气排名失败: ${error.message}`;
                }
            }

            // ==================== AKShare 新增工具执行 ====================

            case "get_zt_pool": {
                try {
                    const data = await akshare.getZTPool(args.date);
                    if (!data || data.length === 0) {
                        return `今日暂无涨停股数据`;
                    }

                    const top10 = data.slice(0, 15);
                    const result = top10.map((s: any, i: number) => {
                        const lbCount = s['连板数'] || 1;
                        const lbEmoji = lbCount >= 3 ? '🔥' : lbCount >= 2 ? '⭐' : '';
                        return `${i + 1}. ${lbEmoji}${s['名称']}(${s['代码']}) - ${lbCount}连板 | 涨停时间: ${s['首次涨停时间'] || '--'} | 封单: ${((s['封单额'] || 0) / 100000000).toFixed(2)}亿`;
                    }).join('\n');

                    return `【今日涨停股池】共 ${data.length} 只\n\n${result}\n\n💡 提示：连板数越多，龙头属性越强`;
                } catch (error: any) {
                    return `获取涨停池失败: ${error.message}`;
                }
            }

            case "get_dt_pool": {
                try {
                    const data = await akshare.getDTPool(args.date);
                    if (!data || data.length === 0) {
                        return `今日暂无跌停股数据`;
                    }

                    const top10 = data.slice(0, 10);
                    const result = top10.map((s: any, i: number) =>
                        `${i + 1}. ${s['名称']}(${s['代码']}) | 跌停时间: ${s['最后跌停时间'] || '--'}`
                    ).join('\n');

                    return `【今日跌停股池】共 ${data.length} 只\n\n${result}`;
                } catch (error: any) {
                    return `获取跌停池失败: ${error.message}`;
                }
            }

            case "get_concept_board": {
                try {
                    const data = await akshare.getConceptBoardList();
                    if (!data || data.length === 0) {
                        return `暂无概念板块数据`;
                    }

                    // 按涨跌幅排序
                    const sorted = [...data].sort((a: any, b: any) => (b['涨跌幅'] || 0) - (a['涨跌幅'] || 0));
                    const top10 = sorted.slice(0, 10);
                    const bottom5 = sorted.slice(-5).reverse();

                    const topResult = top10.map((s: any, i: number) => {
                        const change = s['涨跌幅'] || 0;
                        const emoji = change > 3 ? '🔥' : change > 1 ? '📈' : '';
                        return `${i + 1}. ${emoji}${s['板块名称']} +${change.toFixed(2)}%`;
                    }).join('\n');

                    const bottomResult = bottom5.map((s: any, i: number) =>
                        `${i + 1}. ${s['板块名称']} ${(s['涨跌幅'] || 0).toFixed(2)}%`
                    ).join('\n');

                    return `【概念板块涨幅榜】\n${topResult}\n\n【概念板块跌幅榜】\n${bottomResult}`;
                } catch (error: any) {
                    return `获取概念板块失败: ${error.message}`;
                }
            }

            case "get_industry_board": {
                try {
                    const data = await akshare.getIndustryBoardList();
                    if (!data || data.length === 0) {
                        return `暂无行业板块数据`;
                    }

                    const sorted = [...data].sort((a: any, b: any) => (b['涨跌幅'] || 0) - (a['涨跌幅'] || 0));
                    const top10 = sorted.slice(0, 10);

                    const result = top10.map((s: any, i: number) => {
                        const change = s['涨跌幅'] || 0;
                        const emoji = change > 2 ? '🔥' : change > 0 ? '📈' : '📉';
                        return `${i + 1}. ${emoji}${s['板块名称']} ${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
                    }).join('\n');

                    return `【行业板块涨幅榜】\n${result}`;
                } catch (error: any) {
                    return `获取行业板块失败: ${error.message}`;
                }
            }

            case "get_north_flow": {
                return `⚠️ 北向资金数据目前不可用。北向资金API已停止服务，无法获取相关数据。`;
            }

            case "get_telegraph": {
                try {
                    const data = await akshare.getTelegraphCLS();
                    if (!data || data.length === 0) {
                        return `暂无财经快讯`;
                    }

                    const recent = data.slice(0, 10);
                    const result = recent.map((n: any, i: number) =>
                        `${i + 1}. [${n['发布时间'] || n['时间'] || '--'}] ${n['标题'] || n['内容'] || '--'}`
                    ).join('\n\n');

                    return `【财联社电报 - 最新快讯】\n\n${result}`;
                } catch (error: any) {
                    return `获取财经快讯失败: ${error.message}`;
                }
            }

            case "call_akshare": {
                const funcName = args.function_name;
                const params = args.params || {};

                if (!funcName) {
                    return `请提供 AKShare 函数名`;
                }

                try {
                    console.log(`[AKShare] 动态调用: ${funcName}`, params);
                    const data = await akshare.callAKShareDynamic(funcName, params);

                    if (!data) {
                        return `调用 ${funcName} 返回空数据`;
                    }

                    // 如果是数组，格式化输出
                    if (Array.isArray(data)) {
                        if (data.length === 0) {
                            return `调用 ${funcName} 返回空列表`;
                        }
                        // 只返回前10条
                        const preview = data.slice(0, 10);
                        return `【${funcName} 返回数据】共 ${data.length} 条，预览前10条:\n\n${JSON.stringify(preview, null, 2)}`;
                    }

                    return `【${funcName} 返回数据】\n${JSON.stringify(data, null, 2)}`;
                } catch (error: any) {
                    return `调用 ${funcName} 失败: ${error.message}`;
                }
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
📊 当前价格：${quote.price ?? '--'} 元
${quote.changePercent >= 0 ? '📈' : '📉'} 涨跌幅：${changePercentSign}${quote.changePercent?.toFixed(2) ?? '--'}%
💰 涨跌额：${changeSign}${quote.change?.toFixed(2) ?? '--'} 元

📅 今日交易：
  今开：${quote.open ?? '--'} 元
  最高：${quote.high ?? '--'} 元
  最低：${quote.low ?? '--'} 元
  昨收：${quote.preClose ?? '--'} 元

📊 成交情况：
  成交量：${quote.volume != null ? (quote.volume / 10000).toFixed(2) : '--'} 万手
  成交额：${quote.amount != null ? (quote.amount / 100000000).toFixed(2) : '--'} 亿元
  换手率：${quote.turnoverRate?.toFixed(2) ?? '--'}%
  量比：${quote.volumeRatio?.toFixed(2) ?? '--'}

💹 估值指标：
  市盈率(PE)：${quote.pe?.toFixed(2) ?? '--'}
  市净率(PB)：${quote.pb?.toFixed(2) ?? '--'}
  总市值：${quote.marketCap != null ? (quote.marketCap / 100000000).toFixed(2) : '--'} 亿元
  流通市值：${quote.circulationMarketCap != null ? (quote.circulationMarketCap / 100000000).toFixed(2) : '--'} 亿元`;
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
        return `${sign}${(absVal / 100000000).toFixed(2)}亿`;
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
        return `${sign}${(absVal / 100000000).toFixed(2)}亿`;
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
        return `${sign}${(absVal / 100000000).toFixed(2)}亿`;
    };

    const details = rank.map((item, i) =>
        `  ${i + 1}. ${item.name}(${item.code}) 主力${formatAmount(item.mainNetInflow)} 涨幅${item.changePercent?.toFixed(2) ?? '--'}%`
    ).join('\n');

    return `【${typeName}资金流入排行榜 TOP${rank.length}】

${details}`;
}

function formatMarketFundFlow(flow: any): string {
    const formatAmount = (val: number) => {
        if (val === null || val === undefined) return '--';
        const absVal = Math.abs(val);
        const sign = val >= 0 ? '+' : '-';
        return `${sign}${(absVal / 100000000).toFixed(2)}亿`;
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

function formatLongHuBang(data: any[]): string {
    const items = data.map((item, i) => {
        const netBuy = formatMoney(item['龙虎榜净买额']);
        const buyAmount = formatMoney(item['龙虎榜买入额']);
        const sellAmount = formatMoney(item['龙虎榜卖出额']);
        const changePercent = item['涨跌幅']?.toFixed(2) ?? '--';
        const date = formatDate(item['上榜日'] || '');

        return `${i + 1}. ${item['名称']}(${item['代码']})
   📅 上榜日：${date}
   📈 涨跌幅：${changePercent}%
   💰 净买额：${netBuy}（买入${buyAmount} / 卖出${sellAmount}）
   📝 原因：${item['上榜原因'] || '--'}
   💡 解读：${item['解读'] || '--'}`;
    });

    return `【龙虎榜数据】\n\n${items.join('\n\n')}`;
}

function formatMarketNews(data: any[]): string {
    const items = data.map((item, i) => {
        const title = item['title'] || item['标题'] || item['content']?.slice(0, 50) || '--';
        const date = item['date'] || item['日期'] || '';
        return `${i + 1}. ${title}${date ? ` (${formatDate(date)})` : ''}`;
    });

    return `【今日财经资讯】\n\n${items.join('\n')}`;
}
