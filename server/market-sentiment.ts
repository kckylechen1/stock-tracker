/**
 * 市场情绪数据服务
 * 提供市场涨跌家数、北向资金、市场温度等综合数据
 */

import axios from 'axios';

// 请求头配置
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Referer': 'https://quote.eastmoney.com/',
};

// 缓存配置
let sentimentCache: {
    data: MarketSentimentData | null;
    timestamp: number;
} = {
    data: null,
    timestamp: 0,
};

const CACHE_TTL = 60 * 1000; // 60秒缓存

/**
 * 市场情绪数据结构
 */
export interface MarketSentimentData {
    // 大盘指数
    indices: {
        name: string;
        code: string;
        price: number;
        change: number;
        changePercent: number;
    }[];

    // 涨跌家数
    marketBreadth: {
        riseCount: number;      // 上涨家数
        fallCount: number;      // 下跌家数
        flatCount: number;      // 平盘家数
        riseRatio: number;      // 上涨比例 (0-100)
        totalCount: number;     // 总家数
        limitUpCount?: number;  // 涨停家数
        limitDownCount?: number; // 跌停家数
    };

    // 北向资金
    northboundFlow: {
        netFlow: number;        // 净流入（万元）
        netFlowFormatted: string; // 格式化后的净流入（如 "+52.3亿"）
        hkToShanghai: number;   // 沪股通净流入
        hkToShenzhen: number;   // 深股通净流入
        lastUpdateTime: string; // 最后更新时间
    };

    // 市场温度（综合计算）
    marketTemperature: {
        value: number;          // 0-100
        level: 'cold' | 'cool' | 'neutral' | 'warm' | 'hot';
        label: string;          // "极冷" | "偏冷" | "中性" | "偏热" | "过热"
        emoji: string;
        change: number;         // 相比昨日变化
    };

    // 恐惧贪婪指数（综合计算）
    fearGreedIndex: {
        value: number;          // 0-100
        level: 'extreme_fear' | 'fear' | 'neutral' | 'greed' | 'extreme_greed';
        label: string;
    };

    // 更新时间
    updatedAt: string;
}

/**
 * 获取大盘指数和涨跌家数
 */
async function fetchMarketOverview() {
    try {
        // 并行获取多个数据源以获得更全面的市场统计
        const [indexData, breadthData] = await Promise.all([
            // 获取指数数据
            axios.get('https://push2.eastmoney.com/api/qt/ulist.np/get', {
                params: {
                    fltt: 2,
                    secids: '1.000001,0.399001,0.399006',
                    fields: 'f2,f3,f4,f12,f14,f104,f105,f106,f107',
                },
                headers: HEADERS,
                timeout: 10000,
            }),
            // 尝试获取更全面的市场统计（创业板通常包含全市场数据）
            axios.get('https://push2.eastmoney.com/api/qt/ulist.np/get', {
                params: {
                    fltt: 2,
                    secids: '0.399006', // 创业板指
                    fields: 'f2,f3,f4,f12,f14,f104,f105,f106,f107',
                },
                headers: HEADERS,
                timeout: 10000,
            }).catch(() => ({ data: { data: { diff: [] } } })) // 如果失败，使用空数据
        ]);

        const indexResponse = indexData.data?.data?.diff || [];
        const breadthResponse = breadthData.data?.data?.diff || [];

        // 解析指数数据
        const indices = indexResponse.map((item: any) => ({
            name: item.f14,
            code: item.f12,
            price: item.f2,
            change: item.f4,
            changePercent: item.f3,
        }));

        // 获取市场宽度数据
        // 优先使用创业板数据（通常更全面），然后回退到沪深合并数据
        let marketBreadthData: any = null;

        if (breadthResponse.length > 0) {
            marketBreadthData = breadthResponse[0];
        } else if (indexResponse.length > 0) {
            // 合并沪深两市数据
            const shData = indexResponse.find((item: any) => item.f12 === '000001');
            const szData = indexResponse.find((item: any) => item.f12 === '399001');

            marketBreadthData = {
                f104: (shData?.f104 || 0) + (szData?.f104 || 0),
                f105: (shData?.f105 || 0) + (szData?.f105 || 0),
                f106: (shData?.f106 || 0) + (szData?.f106 || 0),
            };
        }

        if (!marketBreadthData) {
            throw new Error('No market breadth data available');
        }

        const riseCount = marketBreadthData.f104 || 0;
        const fallCount = marketBreadthData.f105 || 0;
        const flatCount = marketBreadthData.f106 || 0;
        const total = riseCount + fallCount + flatCount;

        return {
            indices,
            marketBreadth: {
                riseCount,
                fallCount,
                flatCount,
                riseRatio: total > 0 ? Math.round((riseCount / total) * 100) : 50,
                totalCount: total,
            },
        };
    } catch (error) {
        console.error('[MarketSentiment] Failed to fetch market overview:', error);
        return null;
    }
}

/**
 * 获取北向资金数据 (API已不可用)
 */
async function fetchNorthboundFlow() {
    // 北向资金API已停止服务，返回空数据
    console.log('[MarketSentiment] 北向资金API已不可用，跳过获取');

    return {
        netFlow: 0,
        netFlowFormatted: '暂不可用',
        hkToShanghai: 0,
        hkToShenzhen: 0,
        lastUpdateTime: '--',
    };
}

/**
 * 格式化资金流向金额
 */
function formatFlowAmount(amount: number): string {
    if (amount === 0 || isNaN(amount)) return '--';

    const isPositive = amount > 0;
    const absAmount = Math.abs(amount);

    let formatted: string;
    if (absAmount >= 10000) {
        // 转换为亿（原始单位是万元）
        formatted = (absAmount / 10000).toFixed(2) + '亿';
    } else {
        formatted = absAmount.toFixed(2) + '万';
    }

    return (isPositive ? '+' : '-') + formatted;
}

/**
 * 计算市场温度
 * 基于涨跌比例、成交量等因素综合计算
 */
function calculateMarketTemperature(breadth: { riseRatio: number }) {
    const ratio = breadth.riseRatio;

    let value: number;
    let level: 'cold' | 'cool' | 'neutral' | 'warm' | 'hot';
    let label: string;
    let emoji: string;

    if (ratio <= 20) {
        value = ratio;
        level = 'cold';
        label = '极冷';
        emoji = '🥶';
    } else if (ratio <= 35) {
        value = 20 + (ratio - 20) * 1.33;
        level = 'cool';
        label = '偏冷';
        emoji = '❄️';
    } else if (ratio <= 50) {
        value = 40 + (ratio - 35) * 1.33;
        level = 'neutral';
        label = '中性';
        emoji = '😐';
    } else if (ratio <= 65) {
        value = 60 + (ratio - 50) * 1.33;
        level = 'warm';
        label = '偏热';
        emoji = '🔥';
    } else {
        value = 80 + (ratio - 65) * 0.57;
        level = 'hot';
        label = '过热';
        emoji = '🌋';
    }

    return {
        value: Math.round(Math.min(100, Math.max(0, value))),
        level,
        label,
        emoji,
        change: 0, // 需要保存历史数据才能计算
    };
}

/**
 * 计算恐惧贪婪指数
 * 基于多个市场指标的综合计算
 */
function calculateFearGreedIndex(
    breadth: { riseRatio: number; riseCount: number; fallCount: number; totalCount: number },
    indices: Array<{ changePercent: number }>
) {
    // 1. 涨跌比例得分 (40%)
    const breadthScore = Math.min(100, Math.max(0, breadth.riseRatio));

    // 2. 市场强度得分 (30%)
    // 计算上涨家数占比的强度
    const strengthScore = breadth.totalCount > 0
        ? (breadth.riseCount / breadth.totalCount) * 100
        : 50;

    // 3. 指数动量得分 (20%)
    // 计算主要指数的平均涨跌幅
    const avgIndexChange = indices.length > 0
        ? indices.reduce((sum, idx) => sum + (idx.changePercent || 0), 0) / indices.length
        : 0;
    const momentumScore = Math.min(100, Math.max(0, 50 + avgIndexChange * 10));

    // 4. 市场一致性得分 (10%)
    // 当上涨家数明显多于下跌家数时，一致性高
    const advanceDeclineRatio = breadth.fallCount > 0
        ? breadth.riseCount / breadth.fallCount
        : breadth.riseCount > 0 ? 10 : 0;
    const consistencyScore = Math.min(100, advanceDeclineRatio * 10);

    // 综合得分计算
    const value = Math.round(
        breadthScore * 0.4 +
        strengthScore * 0.3 +
        momentumScore * 0.2 +
        consistencyScore * 0.1
    );

    // 确定情绪等级
    let level: 'extreme_fear' | 'fear' | 'neutral' | 'greed' | 'extreme_greed';
    let label: string;

    if (value <= 25) {
        level = 'extreme_fear';
        label = '极度恐惧';
    } else if (value <= 45) {
        level = 'fear';
        label = '恐惧';
    } else if (value <= 55) {
        level = 'neutral';
        label = '中性';
    } else if (value <= 75) {
        level = 'greed';
        label = '贪婪';
    } else {
        level = 'extreme_greed';
        label = '极度贪婪';
    }

    return { value, level, label };
}

/**
 * 获取完整的市场情绪数据
 */
export async function getMarketSentiment(): Promise<MarketSentimentData> {
    // 检查缓存
    const now = Date.now();
    if (sentimentCache.data && now - sentimentCache.timestamp < CACHE_TTL) {
        return sentimentCache.data;
    }

    // 并行获取各项数据
    const [marketData, northboundData] = await Promise.all([
        fetchMarketOverview(),
        fetchNorthboundFlow(),
    ]);

    // 使用默认值处理失败情况
    const indices = marketData?.indices || [];
    const marketBreadth = marketData?.marketBreadth || {
        riseCount: 0,
        fallCount: 0,
        flatCount: 0,
        riseRatio: 50,
        totalCount: 0,
    };
    const northboundFlow = northboundData || {
        netFlow: 0,
        netFlowFormatted: '--',
        hkToShanghai: 0,
        hkToShenzhen: 0,
        lastUpdateTime: '--',
    };

    // 计算衍生指标
    const marketTemperature = calculateMarketTemperature(marketBreadth);
    const fearGreedIndex = calculateFearGreedIndex(marketBreadth, indices);

    const result: MarketSentimentData = {
        indices,
        marketBreadth,
        northboundFlow,
        marketTemperature,
        fearGreedIndex,
        updatedAt: new Date().toISOString(),
    };

    // 更新缓存
    sentimentCache = {
        data: result,
        timestamp: now,
    };

    return result;
}

/**
 * 清除缓存（用于测试）
 */
export function clearSentimentCache() {
    sentimentCache = { data: null, timestamp: 0 };
}
