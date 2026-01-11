/**
 * AKShare HTTP API 集成
 * 通过 AKTools 服务调用 AKShare 数据接口
 */

import axios from 'axios';

const AKTOOLS_BASE_URL = process.env.AKTOOLS_URL || 'http://127.0.0.1:8098';

/**
 * 调用 AKTools API
 */
export async function callAKShare<T = any>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
    try {
        const url = `${AKTOOLS_BASE_URL}/api/public/${endpoint}`;
        const response = await axios.get(url, { params, timeout: 30000 });
        return response.data;
    } catch (error: any) {
        console.error(`[AKShare] 调用 ${endpoint} 失败:`, error.message);
        throw error;
    }
}

/**
 * 获取龙虎榜详情（最近的龙虎榜数据）
 */
export async function getLongHuBangDetail(): Promise<any[]> {
    return callAKShare('stock_lhb_detail_em');
}

/**
 * 获取龙虎榜每日明细
 * @param date 日期，格式 YYYYMMDD
 */
export async function getLongHuBangDaily(date: string): Promise<any[]> {
    return callAKShare('stock_lhb_ggtj_dtl_em', { start_date: date, end_date: date });
}

/**
 * 获取新闻联播文字稿
 * @param date 日期，格式 YYYYMMDD
 */
export async function getNewsCCTV(date: string): Promise<any[]> {
    return callAKShare('news_cctv', { date });
}

/**
 * 获取东方财富财经早餐
 */
export async function getFinancialBreakfast(): Promise<any[]> {
    return callAKShare('stock_info_global_em');
}

/**
 * 获取今日重要财经资讯
 */
export async function getMarketNews(): Promise<any[]> {
    try {
        // 尝试获取全球财经资讯
        return await callAKShare('stock_info_global_em');
    } catch {
        // 降级到新闻联播
        const today = formatDateYYYYMMDD(new Date());
        return await getNewsCCTV(today);
    }
}

/**
 * 格式化日期为 YYYYMMDD
 */
function formatDateYYYYMMDD(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}

/**
 * 获取昨天的日期（YYYYMMDD）
 */
export function getYesterdayDate(): string {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return formatDateYYYYMMDD(yesterday);
}

/**
 * 检查 AKTools 服务是否可用
 */
export async function checkAKToolsHealth(): Promise<boolean> {
    try {
        const response = await axios.get(`${AKTOOLS_BASE_URL}/version`, { timeout: 5000 });
        return response.status === 200;
    } catch {
        return false;
    }
}

// ==================== 股票基础数据 ====================

export interface StockInfo {
    symbol: string;
    name: string;
    price: number;
    sector: string;
    totalValue: number;
}

export interface KlineData {
    date: string;
    open: number;
    close: number;
    high: number;
    low: number;
    volume: number;
    amount: number;
    changePct: number;
}

/**
 * 获取股票基本信息
 */
export async function getStockInfo(symbol: string): Promise<StockInfo | null> {
    try {
        const data = await callAKShare<any[]>('stock_individual_info_em', { symbol });
        if (!data || data.length === 0) return null;

        const info: Record<string, any> = {};
        for (const item of data) {
            info[item.item] = item.value;
        }

        return {
            symbol,
            name: info['股票简称'] || '',
            price: parseFloat(info['最新'] || 0),
            sector: info['行业'] || '',
            totalValue: parseFloat(info['总市值'] || 0),
        };
    } catch {
        return null;
    }
}

/**
 * 获取日K线历史数据
 * @param symbol 股票代码
 * @param period 周期: daily, weekly, monthly
 * @param count 获取数量
 */
export async function getStockHistory(
    symbol: string,
    period: 'daily' | 'weekly' | 'monthly' = 'daily',
    count: number = 120
): Promise<KlineData[]> {
    try {
        const endDate = formatDateYYYYMMDD(new Date());
        const startDate = formatDateYYYYMMDD(new Date(Date.now() - count * 2 * 24 * 60 * 60 * 1000));

        const data = await callAKShare<any[]>('stock_zh_a_hist', {
            symbol,
            period,
            start_date: startDate,
            end_date: endDate,
            adjust: 'qfq'
        });

        if (!data) return [];

        return data.slice(-count).map(item => ({
            date: String(item['日期'] || '').split('T')[0],
            open: parseFloat(item['开盘'] || 0),
            close: parseFloat(item['收盘'] || 0),
            high: parseFloat(item['最高'] || 0),
            low: parseFloat(item['最低'] || 0),
            volume: parseFloat(item['成交量'] || 0),
            amount: parseFloat(item['成交额'] || 0),
            changePct: parseFloat(item['涨跌幅'] || 0),
        }));
    } catch {
        return [];
    }
}

/**
 * 获取5分钟K线数据
 * @param symbol 股票代码
 * @param period 周期: 1, 5, 15, 30, 60 (分钟)
 */
export async function getStockMinuteHistory(
    symbol: string,
    period: 1 | 5 | 15 | 30 | 60 = 5
): Promise<KlineData[]> {
    try {
        const data = await callAKShare<any[]>('stock_zh_a_hist_min_em', {
            symbol,
            period: String(period),
            adjust: 'qfq'
        });

        if (!data) return [];

        return data.map(item => ({
            date: String(item['时间'] || ''),
            open: parseFloat(item['开盘'] || 0),
            close: parseFloat(item['收盘'] || 0),
            high: parseFloat(item['最高'] || 0),
            low: parseFloat(item['最低'] || 0),
            volume: parseFloat(item['成交量'] || 0),
            amount: parseFloat(item['成交额'] || 0),
            changePct: parseFloat(item['涨跌幅'] || 0),
        }));
    } catch {
        return [];
    }
}

// ==================== 实时行情 ====================

export interface StockQuoteAK {
    code: string;
    name: string;
    price: number;
    change: number;
    changePercent: number;
    volume: number;
    amount: number;
    open: number;
    high: number;
    low: number;
    preClose: number;
    turnoverRate: number;
    pe: number;
    pb: number;
    marketCap: number;
    circulationMarketCap: number;
    volumeRatio: number;
}

/**
 * 获取沪深A股实时行情
 * AKShare: stock_zh_a_spot_em
 */
export async function getStockSpotAll(): Promise<any[]> {
    return callAKShare('stock_zh_a_spot_em');
}

/**
 * 获取单只股票实时行情（从全量数据中筛选）
 */
export async function getStockQuote(symbol: string): Promise<StockQuoteAK | null> {
    try {
        const allSpots = await getStockSpotAll();
        const stock = allSpots.find(s => s['代码'] === symbol);
        if (!stock) return null;

        return {
            code: stock['代码'],
            name: stock['名称'],
            price: stock['最新价'],
            change: stock['涨跌额'],
            changePercent: stock['涨跌幅'],
            volume: stock['成交量'],
            amount: stock['成交额'],
            open: stock['今开'],
            high: stock['最高'],
            low: stock['最低'],
            preClose: stock['昨收'],
            turnoverRate: stock['换手率'],
            pe: stock['市盈率-动态'],
            pb: stock['市净率'],
            marketCap: stock['总市值'],
            circulationMarketCap: stock['流通市值'],
            volumeRatio: stock['量比'],
        };
    } catch {
        return null;
    }
}

// ==================== 资金流向 ====================

export interface FundFlowAK {
    code: string;
    name: string;
    date: string;
    mainNetInflow: number;          // 主力净流入
    mainNetInflowPercent: number;   // 主力净流入占比
    superLargeNetInflow: number;    // 超大单净流入
    superLargeNetInflowPercent: number;
    largeNetInflow: number;         // 大单净流入
    largeNetInflowPercent: number;
    mediumNetInflow: number;        // 中单净流入
    mediumNetInflowPercent: number;
    smallNetInflow: number;         // 小单净流入
    smallNetInflowPercent: number;
}

/**
 * 获取个股资金流向
 * AKShare: stock_individual_fund_flow
 */
export async function getStockFundFlow(symbol: string, market: 'sh' | 'sz' | 'bj' = 'sz'): Promise<FundFlowAK[]> {
    try {
        const data = await callAKShare<any[]>('stock_individual_fund_flow', {
            stock: symbol,
            market
        });

        if (!data) return [];

        return data.map(item => ({
            code: symbol,
            name: '',
            date: String(item['日期'] || '').split('T')[0],
            mainNetInflow: parseFloat(item['主力净流入-净额'] || 0),
            mainNetInflowPercent: parseFloat(item['主力净流入-净占比'] || 0),
            superLargeNetInflow: parseFloat(item['超大单净流入-净额'] || 0),
            superLargeNetInflowPercent: parseFloat(item['超大单净流入-净占比'] || 0),
            largeNetInflow: parseFloat(item['大单净流入-净额'] || 0),
            largeNetInflowPercent: parseFloat(item['大单净流入-净占比'] || 0),
            mediumNetInflow: parseFloat(item['中单净流入-净额'] || 0),
            mediumNetInflowPercent: parseFloat(item['中单净流入-净占比'] || 0),
            smallNetInflow: parseFloat(item['小单净流入-净额'] || 0),
            smallNetInflowPercent: parseFloat(item['小单净流入-净占比'] || 0),
        }));
    } catch {
        return [];
    }
}

/**
 * 获取个股资金流排行
 * AKShare: stock_individual_fund_flow_rank
 */
export async function getFundFlowRank(indicator: 'today' | '3day' | '5day' | '10day' = 'today'): Promise<any[]> {
    const indicatorMap: Record<string, string> = {
        'today': '今日',
        '3day': '3日',
        '5day': '5日',
        '10day': '10日'
    };
    return callAKShare('stock_individual_fund_flow_rank', { indicator: indicatorMap[indicator] });
}

/**
 * 获取大盘资金流向
 * AKShare: stock_market_fund_flow
 */
export async function getMarketFundFlow(): Promise<any[]> {
    return callAKShare('stock_market_fund_flow');
}

// ==================== 涨停板行情 ====================

/**
 * 获取涨停股池
 * AKShare: stock_zt_pool_em
 */
export async function getZTPool(date?: string): Promise<any[]> {
    const d = date || formatDateYYYYMMDD(new Date());
    return callAKShare('stock_zt_pool_em', { date: d });
}

/**
 * 获取跌停股池
 * AKShare: stock_zt_pool_dtgc_em
 */
export async function getDTPool(date?: string): Promise<any[]> {
    const d = date || formatDateYYYYMMDD(new Date());
    return callAKShare('stock_zt_pool_dtgc_em', { date: d });
}

/**
 * 获取昨日涨停股今日表现
 * AKShare: stock_zt_pool_previous_em
 */
export async function getZTPoolPrevious(date?: string): Promise<any[]> {
    const d = date || formatDateYYYYMMDD(new Date());
    return callAKShare('stock_zt_pool_previous_em', { date: d });
}

/**
 * 获取强势股池
 * AKShare: stock_zt_pool_strong_em
 */
export async function getStrongPool(date?: string): Promise<any[]> {
    const d = date || formatDateYYYYMMDD(new Date());
    return callAKShare('stock_zt_pool_strong_em', { date: d });
}

// ==================== 板块行情 ====================

/**
 * 获取概念板块列表
 * AKShare: stock_board_concept_name_em
 */
export async function getConceptBoardList(): Promise<any[]> {
    return callAKShare('stock_board_concept_name_em');
}

/**
 * 获取行业板块列表
 * AKShare: stock_board_industry_name_em
 */
export async function getIndustryBoardList(): Promise<any[]> {
    return callAKShare('stock_board_industry_name_em');
}

/**
 * 获取概念板块成份股
 * AKShare: stock_board_concept_cons_em
 */
export async function getConceptBoardConstituents(symbol: string): Promise<any[]> {
    return callAKShare('stock_board_concept_cons_em', { symbol });
}

/**
 * 获取行业板块成份股
 * AKShare: stock_board_industry_cons_em
 */
export async function getIndustryBoardConstituents(symbol: string): Promise<any[]> {
    return callAKShare('stock_board_industry_cons_em', { symbol });
}

// ==================== 股票热度 ====================

/**
 * 获取东财股票热度排名
 * AKShare: stock_hot_rank_em
 */
export async function getHotRankEM(): Promise<any[]> {
    return callAKShare('stock_hot_rank_em');
}

/**
 * 获取东财个股人气榜-最新排名
 * AKShare: stock_hot_rank_latest_em
 */
export async function getHotRankLatestEM(): Promise<any[]> {
    return callAKShare('stock_hot_rank_latest_em');
}

/**
 * 获取个股历史热度趋势
 * AKShare: stock_hot_rank_detail_em
 */
export async function getHotRankDetailEM(symbol: string): Promise<any[]> {
    return callAKShare('stock_hot_rank_detail_em', { symbol });
}

// ==================== 北向资金 ====================

/**
 * 获取北向资金净流入
 * AKShare: stock_hsgt_north_net_flow_in_em
 */
export async function getNorthFlowIn(indicator: 'north' | 'south' = 'north'): Promise<any[]> {
    if (indicator === 'north') {
        return callAKShare('stock_hsgt_north_net_flow_in_em');
    }
    return callAKShare('stock_hsgt_south_net_flow_in_em');
}

/**
 * 获取北向资金持股排行
 * AKShare: stock_hsgt_hold_stock_em
 */
export async function getNorthHoldStock(market: '沪股通' | '深股通' = '沪股通'): Promise<any[]> {
    return callAKShare('stock_hsgt_hold_stock_em', { market, indicator: '今日排行' });
}

// ==================== 财经资讯 ====================

/**
 * 获取个股新闻
 * AKShare: stock_news_em
 */
export async function getStockNewsEM(symbol: string): Promise<any[]> {
    return callAKShare('stock_news_em', { symbol });
}

/**
 * 获取财联社电报
 * AKShare: stock_telegraph_cls
 */
export async function getTelegraphCLS(): Promise<any[]> {
    return callAKShare('stock_telegraph_cls');
}

// ==================== 融资融券 ====================

/**
 * 获取融资融券余额（深交所）
 * AKShare: stock_margin_sse
 */
export async function getMarginSSE(date?: string): Promise<any[]> {
    const d = date || formatDateYYYYMMDD(new Date());
    return callAKShare('stock_margin_sse', { start_date: d, end_date: d });
}

// ==================== 通用动态调用 ====================

/**
 * 动态调用任意 AKShare 接口
 * 供 Grok 根据知识库调用
 */
export async function callAKShareDynamic(
    functionName: string,
    params: Record<string, any> = {}
): Promise<any> {
    console.log(`[AKShare] 动态调用: ${functionName}`, params);
    return callAKShare(functionName, params);
}

/**
 * 获取当前日期（YYYY-MM-DD 格式）
 */
export function getCurrentDate(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * 获取当前日期时间（YYYY-MM-DD HH:MM:SS 格式）
 */
export function getCurrentDateTime(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

