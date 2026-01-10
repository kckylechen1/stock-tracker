/**
 * 同花顺 iFinD HTTP API 接入模块
 * 文档: iFinD HTTP API 用户手册
 */

import axios from 'axios';
import { ENV } from './_core/env';

const BASE_URL = 'https://quantapi.51ifind.com';

const getHeaders = () => ({
    'Content-Type': 'application/json; charset=utf-8',
    'access_token': ENV.ifindAccessToken,
});

/**
 * 获取实时行情数据
 * @param codes 股票代码，如 "300033.SZ,600030.SH"
 * @param indicators 指标，如 "open,high,low,close,preClose,vol,amount"
 */
export async function getRealTimeQuotation(codes: string, indicators: string) {
    try {
        const response = await axios.post(
            `${BASE_URL}/api/v1/real_time_quotation`,
            {
                codes,
                indicators,
            },
            { headers: getHeaders() }
        );

        if (response.data.errorcode !== 0) {
            throw new Error(response.data.errmsg || 'iFinD API error');
        }

        return response.data;
    } catch (error: any) {
        console.error('[iFinD] getRealTimeQuotation failed:', error.message);
        throw error;
    }
}

/**
 * 获取历史行情数据
 * @param codes 股票代码
 * @param indicators 指标
 * @param startdate 开始日期 YYYY-MM-DD
 * @param enddate 结束日期 YYYY-MM-DD
 */
export async function getHistoryData(
    codes: string,
    indicators: string,
    startdate: string,
    enddate: string
) {
    try {
        const response = await axios.post(
            `${BASE_URL}/api/v1/history`,
            {
                codes,
                indicators,
                startdate,
                enddate,
            },
            { headers: getHeaders() }
        );

        if (response.data.errorcode !== 0) {
            throw new Error(response.data.errmsg || 'iFinD API error');
        }

        return response.data;
    } catch (error: any) {
        console.error('[iFinD] getHistoryData failed:', error.message);
        throw error;
    }
}

/**
 * 获取分钟级高频数据
 * @param codes 股票代码
 * @param indicators 指标
 * @param starttime 开始时间 YYYY-MM-DD HH:mm:ss
 * @param endtime 结束时间 YYYY-MM-DD HH:mm:ss
 */
export async function getHighFrequencyData(
    codes: string,
    indicators: string,
    starttime: string,
    endtime: string
) {
    try {
        const response = await axios.post(
            `${BASE_URL}/api/v1/high_frequency`,
            {
                codes,
                indicators,
                starttime,
                endtime,
            },
            { headers: getHeaders() }
        );

        if (response.data.errorcode !== 0) {
            throw new Error(response.data.errmsg || 'iFinD API error');
        }

        return response.data;
    } catch (error: any) {
        console.error('[iFinD] getHighFrequencyData failed:', error.message);
        throw error;
    }
}

/**
 * 获取分时成交数据
 * @param codes 股票代码
 * @param indicators 指标
 * @param starttime 开始时间
 * @param endtime 结束时间
 */
export async function getTickData(
    codes: string,
    indicators: string,
    starttime: string,
    endtime: string
) {
    try {
        const response = await axios.post(
            `${BASE_URL}/api/v1/tick`,
            {
                codes,
                indicators,
                starttime,
                endtime,
            },
            { headers: getHeaders() }
        );

        if (response.data.errorcode !== 0) {
            throw new Error(response.data.errmsg || 'iFinD API error');
        }

        return response.data;
    } catch (error: any) {
        console.error('[iFinD] getTickData failed:', error.message);
        throw error;
    }
}

/**
 * 转换股票代码格式: 002465 -> 002465.SZ
 */
export function convertToIfindCode(code: string): string {
    // 已经是 iFinD 格式
    if (code.includes('.')) {
        return code;
    }

    // 深圳: 0, 3开头
    // 上海: 6开头
    // 北京: 4, 8开头
    if (code.startsWith('6')) {
        return `${code}.SH`;
    } else if (code.startsWith('0') || code.startsWith('3')) {
        return `${code}.SZ`;
    } else if (code.startsWith('4') || code.startsWith('8')) {
        return `${code}.BJ`;
    }

    return `${code}.SZ`; // 默认深圳
}

/**
 * 常用指标列表
 */
export const INDICATORS = {
    // 基础行情 - iFinD 正确的指标名
    QUOTE: 'latest,open,high,low,preClose,volume,amount,change,pctChange,turnoverRatio,pe_ttm,pb,totalMarketValue,floatMarketValue,volumeRatio',

    // 资金流向 - 需要验证正确的指标名
    CAPITAL_FLOW: 'mainForce,mainForceRatio',

    // 技术指标
    TECHNICAL: 'ma5,ma10,ma20,ma60',

    // 分时数据
    TIMELINE: 'time,price,avgPrice,vol,amount',
};

// ==================== 高级封装函数 ====================

/**
 * 获取股票实时行情（封装版）
 * 返回格式与东方财富 API 兼容
 */
export async function getStockQuote(code: string) {
    try {
        const ifindCode = convertToIfindCode(code);
        const indicators = INDICATORS.QUOTE;

        const response = await getRealTimeQuotation(ifindCode, indicators);

        if (!response.tables || response.tables.length === 0) {
            throw new Error('No data returned');
        }

        const data = response.tables[0];
        const table = data.table || {};

        // 获取第一行数据（iFinD 返回的是数组）
        const getValue = (key: string, index = 0) => {
            return table[key]?.[index] ?? null;
        };

        // 计算涨跌幅（如果 API 没返回）
        const price = getValue('latest');
        const preClose = getValue('preClose');
        const change = getValue('change') ?? (price && preClose ? price - preClose : null);
        const pctChange = getValue('pctChange') ?? (change && preClose ? (change / preClose) * 100 : null);

        return {
            code: code,
            name: data.thscode?.split('.')[0] || code,
            price: price,
            preClose: preClose,
            change: change,
            changePercent: pctChange,
            open: getValue('open'),
            high: getValue('high'),
            low: getValue('low'),
            volume: getValue('volume'),
            amount: getValue('amount'),
            turnoverRate: getValue('turnoverRatio'),
            pe: getValue('pe_ttm'),
            pb: getValue('pb'),
            marketCap: getValue('totalMarketValue'),
            circulationMarketCap: getValue('floatMarketValue'),
            volumeRatio: getValue('volumeRatio'),
            // 资金流向暂时不可用，返回 null
            mainNetInflow: null,
            mainNetInflowRate: null,
            superLargeNetInflow: null,
            largeNetInflow: null,
            mediumNetInflow: null,
            smallNetInflow: null,
        };
    } catch (error: any) {
        console.error('[iFinD] getStockQuote failed:', error.message);
        throw error;
    }
}

/**
 * 获取K线数据
 * @param code 股票代码
 * @param period 周期: day, week, month
 * @param count 数量
 */
export async function getKlineData(code: string, period: string = 'day', count: number = 120) {
    try {
        const ifindCode = convertToIfindCode(code);
        const endDate = new Date();
        const startDate = new Date();

        // 根据周期计算开始日期
        if (period === 'week') {
            startDate.setDate(startDate.getDate() - count * 7);
        } else if (period === 'month') {
            startDate.setMonth(startDate.getMonth() - count);
        } else {
            startDate.setDate(startDate.getDate() - count * 1.5); // 考虑非交易日
        }

        const formatDate = (d: Date) => d.toISOString().split('T')[0];

        const response = await getHistoryData(
            ifindCode,
            'open,high,low,close,vol,amount,preClose',
            formatDate(startDate),
            formatDate(endDate)
        );

        if (!response.tables || response.tables.length === 0) {
            return [];
        }

        const data = response.tables[0];
        const table = data.table || {};
        const times = table.time || [];

        return times.map((time: string, i: number) => ({
            time: time,
            open: table.open?.[i],
            high: table.high?.[i],
            low: table.low?.[i],
            close: table.close?.[i],
            volume: table.vol?.[i],
            amount: table.amount?.[i],
            preClose: table.preClose?.[i],
        }));
    } catch (error: any) {
        console.error('[iFinD] getKlineData failed:', error.message);
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
        const ifindCode = convertToIfindCode(code);
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days - 2); // 多取几天确保有数据

        const formatDateTime = (d: Date, time: string) =>
            `${d.toISOString().split('T')[0]} ${time}`;

        const response = await getHighFrequencyData(
            ifindCode,
            'open,high,low,close,vol,amount',
            formatDateTime(startDate, '09:30:00'),
            formatDateTime(endDate, '15:00:00')
        );

        if (!response.tables || response.tables.length === 0) {
            return { timeline: [], preClose: null };
        }

        const data = response.tables[0];
        const table = data.table || {};
        const times = table.time || [];

        const timeline = times.map((time: string, i: number) => ({
            time: time,
            price: table.close?.[i],
            avgPrice: table.close?.[i], // 高频数据可能没有均价
            volume: table.vol?.[i],
            amount: table.amount?.[i],
        }));

        // 获取昨收价
        let preClose = null;
        if (timeline.length > 0) {
            // 简单处理：用第一个数据点的开盘价近似
            preClose = table.open?.[0];
        }

        return {
            timeline,
            preClose,
        };
    } catch (error: any) {
        console.error('[iFinD] getTimelineData failed:', error.message);
        throw error;
    }
}

/**
 * 股票搜索
 * 注：iFinD 暂无搜索接口，返回空数组，可降级到东方财富
 */
export async function searchStock(keyword: string) {
    // iFinD 没有搜索接口，返回空
    console.log('[iFinD] searchStock not supported, use eastmoney instead');
    return [];
}

