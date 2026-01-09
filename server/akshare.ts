/**
 * AKShare HTTP API 集成
 * 通过 AKTools 服务调用 AKShare 数据接口
 */

import axios from 'axios';

const AKTOOLS_BASE_URL = process.env.AKTOOLS_URL || 'http://127.0.0.1:8081';

/**
 * 调用 AKTools API
 */
async function callAKShare<T = any>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
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
