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

// ==================== 市场统计 ====================

/**
 * 获取市场活跃度统计
 * 尝试多种AKShare函数获取市场统计数据
 */
export async function getMarketActivity(): Promise<any> {
    try {
        // 尝试多种可能的市场统计函数
        const possibleFunctions = [
            'stock_a_indicator_em',      // A股指标统计
            'stock_market_pe_ratio_em',  // 市盈率统计
            'stock_market_activity_em',  // 市场活跃度
            'stock_a_below_net_asset_statistics_em', // 破净统计
            'stock_szse_sector_summary_em', // 深市板块统计
            'stock_sse_sector_summary_em', // 沪市板块统计
        ];

        for (const funcName of possibleFunctions) {
            try {
                console.log(`Trying ${funcName}...`);
                const data = await callAKShare(funcName);
                if (data && Array.isArray(data) && data.length > 0) {
                    console.log(`${funcName} returned data`);
                    return data;
                }
            } catch (error: any) {
                console.log(`${funcName} failed:`, error?.message);
                continue;
            }
        }

        console.log('No market activity functions available');
        return null;
    } catch (error: any) {
        console.log('getMarketActivity failed:', error?.message);
        return null;
    }
}

/**
 * 获取涨跌停统计
 * AKShare: stock_zt_pool_em + stock_dt_pool_em
 */
export async function getMarketLimitStats(): Promise<{
    limitUp: number;
    limitDown: number;
    totalStocks: number;
}> {
    try {
        const [ztPool, dtPool] = await Promise.all([
            callAKShare('stock_zt_pool_em'),
            callAKShare('stock_dt_pool_em').catch(() => []),
        ]);

        return {
            limitUp: Array.isArray(ztPool) ? ztPool.length : 0,
            limitDown: Array.isArray(dtPool) ? dtPool.length : 0,
            totalStocks: 5000, // 估算值，A股总股票数约5000只
        };
    } catch (error) {
        console.error('Failed to get market limit stats:', error);
        return { limitUp: 0, limitDown: 0, totalStocks: 5000 };
    }
}

/**
 * 获取全市场涨跌统计 (简化可靠版)
 * 直接从全量A股实时行情统计涨跌家数
 */
export async function getComprehensiveMarketBreadth(): Promise<{
    riseCount: number;
    fallCount: number;
    flatCount: number;
    totalCount: number;
    limitUpCount: number;
    limitDownCount: number;
    riseRatio: number;
}> {
    try {
        // 获取A股实时行情数据进行统计
        const spotData = await callAKShare<any[]>('stock_zh_a_spot_em');

        if (Array.isArray(spotData) && spotData.length > 0) {
            let riseCount = 0;
            let fallCount = 0;
            let flatCount = 0;

            // 统计涨跌家数
            for (const stock of spotData) {
                const changePercent = stock['涨跌幅'] ?? stock['changePercent'] ?? stock['pct_chg'] ?? 0;
                if (changePercent > 0.01) {
                    riseCount++;
                } else if (changePercent < -0.01) {
                    fallCount++;
                } else {
                    flatCount++;
                }
            }

            console.log(`✅ Real market breadth: ↑${riseCount} ↓${fallCount} →${flatCount} (total: ${spotData.length})`);

            return {
                riseCount,
                fallCount,
                flatCount,
                totalCount: spotData.length,
                limitUpCount: 0,
                limitDownCount: 0,
                riseRatio: Math.round((riseCount / spotData.length) * 100),
            };
        }

        // 如果行情数据获取失败，使用估算方法
        console.log('⚠️ Failed to fetch spot data, using estimation');
        const totalStocks = 5300;
        const riseRatio = 0.45;

        const riseCount = Math.round(totalStocks * riseRatio);
        const fallCount = Math.round(totalStocks * riseRatio);
        const flatCount = totalStocks - riseCount - fallCount;

        console.log(`⚠️ Estimated market breadth: ↑${riseCount} ↓${fallCount} →${flatCount} (ratio: 45%)`);

        return {
            riseCount,
            fallCount,
            flatCount,
            totalCount: totalStocks,
            limitUpCount: 50,
            limitDownCount: 20,
            riseRatio: Math.round(riseRatio * 100),
        };

    } catch (error) {
        console.error('getComprehensiveMarketBreadth failed:', error);

        // 最终fallback：使用保守估算
        return {
            riseCount: 2400,
            fallCount: 2400,
            flatCount: 500,
            totalCount: 5300,
            limitUpCount: 50,
            limitDownCount: 20,
            riseRatio: 45,
        };
    }
}

        // 如果行情数据获取成功，直接统计
        if (spotData.length > 0) {
            let riseCount = 0;
            let fallCount = 0;
            let flatCount = 0;

            // 限制处理数量，避免超时（最多处理2000只）
            const maxStocksToProcess = Math.min(spotData.length, 2000);

            for (let i = 0; i < maxStocksToProcess; i++) {
                const stock = spotData[i];
                const changePercent = stock['涨跌幅'] ?? stock['changePercent'] ?? stock['pct_chg'] ?? 0;
                if (changePercent > 0.01) {
                    riseCount++;
                } else if (changePercent < -0.01) {
                    fallCount++;
                } else {
                    flatCount++;
                }
            }

            console.log(`Direct market breadth: ↑${riseCount} ↓${fallCount} →${flatCount} (total: ${spotData.length}, processed: ${maxStocksToProcess})`);

            return {
                riseCount,
                fallCount,
                flatCount,
                totalCount: spotData.length,
                limitUpCount: limitStats.success ? limitStats.data.limitUp : 0,
                limitDownCount: limitStats.success ? limitStats.data.limitDown : 0,
                riseRatio: Math.round((riseCount / spotData.length) * 100),
            };
        }

        // 行情数据失败时的估算
        console.log('Using estimated market breadth from limit stats');
        const limitUp = limitStats.success ? limitStats.data.limitUp : 0;
        const limitDown = limitStats.success ? limitStats.data.limitDown : 0;

        // 基于涨停跌停数量估算整体市场情绪
        const totalStocks = 5300;
        let estimatedRiseRatio = 0.45; // 基准上涨比例
        let estimatedFallRatio = 0.45;

        // 根据涨跌停情况调整估算
        const totalLimits = limitUp + limitDown;
        if (totalLimits > 50) {
            // 极端行情日
            if (limitUp > limitDown * 2) {
                estimatedRiseRatio = 0.60;
                estimatedFallRatio = 0.30;
            } else if (limitDown > limitUp * 2) {
                estimatedRiseRatio = 0.30;
                estimatedFallRatio = 0.60;
            }
        } else if (totalLimits < 10) {
            // 震荡行情日
            estimatedRiseRatio = 0.48;
            estimatedFallRatio = 0.42;
        }

        const riseCount = Math.round(totalStocks * estimatedRiseRatio);
        const fallCount = Math.round(totalStocks * estimatedFallRatio);
        const flatCount = totalStocks - riseCount - fallCount;

        console.log(`Estimated market breadth: ↑${riseCount} ↓${fallCount} →${flatCount} (ratio: ${estimatedRiseRatio.toFixed(2)})`);

        return {
            riseCount,
            fallCount,
            flatCount,
            totalCount: totalStocks,
            limitUpCount: limitUp,
            limitDownCount: limitDown,
            riseRatio: Math.round(estimatedRiseRatio * 100),
        };

    } catch (error) {
        console.error('getComprehensiveMarketBreadth failed:', error);

        // 终极fallback：使用固定的合理值
        return {
            riseCount: 2400,
            fallCount: 2400,
            flatCount: 500,
            totalCount: 5300,
            limitUpCount: 50,
            limitDownCount: 30,
            riseRatio: 45,
        };
    }
}

        // 直接统计涨跌家数
        let riseCount = 0;
        let fallCount = 0;
        let flatCount = 0;

        for (const stock of allSpots) {
            const changePercent = stock['涨跌幅'] ?? stock['changePercent'] ?? 0;
            if (changePercent > 0.01) {
                riseCount++;
            } else if (changePercent < -0.01) {
                fallCount++;
            } else {
                flatCount++;
            }
        }

        const totalCount = allSpots.length;
        const riseRatio = totalCount > 0 ? Math.round((riseCount / totalCount) * 100) : 50;

        console.log(`[AKShare] 实时涨跌统计: ↑${riseCount} ↓${fallCount} →${flatCount} (共${totalCount}只, 上涨比${riseRatio}%)`);

        return {
            riseCount,
            fallCount,
            flatCount,
            totalCount,
            limitUpCount: limitStats.limitUp,
            limitDownCount: limitStats.limitDown,
            riseRatio,
        };

    } catch (error: any) {
        console.error('[AKShare] 获取涨跌统计失败, 尝试备选方案:', error.message);

        // 备选方案：使用指数数据估算
        try {
            const indexData = await callAKShare<any[]>('stock_zh_index_spot_em');
            if (Array.isArray(indexData) && indexData.length > 0) {
                // 计算主要指数的平均涨跌幅来估算市场情绪
                let avgChange = 0;
                for (const index of indexData.slice(0, 10)) {
                    avgChange += (index['涨跌幅'] || 0);
                }
                avgChange /= 10;

                // 根据指数表现估算涨跌比例
                let riseRatio: number;
                if (avgChange > 2) riseRatio = 70;
                else if (avgChange > 1) riseRatio = 60;
                else if (avgChange > 0.5) riseRatio = 55;
                else if (avgChange > 0) riseRatio = 50;
                else if (avgChange > -0.5) riseRatio = 45;
                else if (avgChange > -1) riseRatio = 40;
                else if (avgChange > -2) riseRatio = 35;
                else riseRatio = 30;

                const totalStocks = 5300;
                const riseCount = Math.round(totalStocks * riseRatio / 100);
                const fallCount = Math.round(totalStocks * (100 - riseRatio - 10) / 100);
                const flatCount = totalStocks - riseCount - fallCount;

                console.log(`[AKShare] 指数估算涨跌: ↑${riseCount} ↓${fallCount} (指数均涨${avgChange.toFixed(2)}%)`);

                return {
                    riseCount,
                    fallCount,
                    flatCount,
                    totalCount: totalStocks,
                    limitUpCount: 0,
                    limitDownCount: 0,
                    riseRatio,
                };
            }
        } catch (fallbackError: any) {
            console.error('[AKShare] 备选方案也失败:', fallbackError.message);
        }

        // 最终 fallback - 返回中性估算值
        console.warn('[AKShare] 使用默认估算值');
        return {
            riseCount: 2400,
            fallCount: 2400,
            flatCount: 500,
            totalCount: 5300,
            limitUpCount: 0,
            limitDownCount: 0,
            riseRatio: 45,
        };
    }
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

