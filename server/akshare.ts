/**
 * AKShare HTTP API 集成
 * 通过 AKTools 服务调用 AKShare 数据接口
 */

import axios from 'axios';

const AKTOOLS_BASE_URL = process.env.AKTOOLS_URL || 'http://127.0.0.1:8081';

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
