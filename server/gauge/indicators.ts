/**
 * 技术指标计算模块
 * 使用 technicalindicators 库计算 MACD, RSI, KDJ, BOLL 等指标
 */

import {
    MACD,
    RSI,
    Stochastic,
    BollingerBands,
    SMA,
    EMA,
    OBV,
    ATR,
    CCI,
} from 'technicalindicators';

// K线数据类型
export interface KlineData {
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

// 技术指标计算结果
export interface TechnicalIndicators {
    // MACD
    macd: {
        dif: number | null;
        dea: number | null;
        histogram: number | null;
        signal: 'bullish' | 'bearish' | 'neutral';
    };
    // RSI
    rsi: {
        value: number | null;
        signal: 'overbought' | 'oversold' | 'neutral';
    };
    // KDJ
    kdj: {
        k: number | null;
        d: number | null;
        j: number | null;
        signal: 'bullish' | 'bearish' | 'neutral';
    };
    // BOLL
    boll: {
        upper: number | null;
        middle: number | null;
        lower: number | null;
        position: 'above_upper' | 'below_lower' | 'middle';
    };
    // 移动平均线
    ma: {
        ma5: number | null;
        ma10: number | null;
        ma20: number | null;
        ma60: number | null;
    };
    // 量能指标
    obv: {
        value: number | null;
        ma10: number | null;
        signal: 'bullish' | 'bearish' | 'neutral';
    };
}

type TrendScoreBreakdown = {
    score: number;
    macdScore: number;
    emaScore: number;
};

type MomentumScoreBreakdown = {
    score: number;
    rsiScore: number;
    kdjScore: number;
};

type VolumeScoreBreakdown = {
    score: number;
    obvScore: number;
    vrScore: number;
    vmacdScore: number;
};

/**
 * 计算所有技术指标
 * @param klines K线数据数组 (至少需要60条)
 * @returns 最新的技术指标值
 */
export function calculateIndicators(klines: KlineData[]): TechnicalIndicators {
    if (klines.length < 60) {
        console.warn('[TechnicalIndicators] 数据不足60条，部分指标可能为空');
    }

    const closes = klines.map(k => k.close);
    const highs = klines.map(k => k.high);
    const lows = klines.map(k => k.low);
    const volumes = klines.map(k => k.volume);

    // 最新收盘价
    const latestClose = closes[closes.length - 1];

    // 1. MACD (12, 26, 9)
    const macdResult = MACD.calculate({
        values: closes,
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9,
        SimpleMAOscillator: false,
        SimpleMASignal: false,
    });
    const latestMacd = macdResult[macdResult.length - 1] || { MACD: undefined, signal: undefined, histogram: undefined };
    const macdValue = latestMacd.MACD ?? 0;
    const macdSignalValue = latestMacd.signal ?? 0;
    const macdSignal =
        macdValue > macdSignalValue && macdValue > 0
            ? 'bullish'
            : macdValue < macdSignalValue && macdValue < 0
                ? 'bearish'
                : 'neutral';

    // 2. RSI (14)
    const rsiResult = RSI.calculate({
        values: closes,
        period: 14,
    });
    const latestRsi = rsiResult[rsiResult.length - 1];
    const rsiSignal =
        latestRsi > 70
            ? 'overbought'
            : latestRsi < 30
                ? 'oversold'
                : 'neutral';

    // 3. KDJ (9, 3, 3) - 使用 Stochastic 近似
    const stochResult = Stochastic.calculate({
        high: highs,
        low: lows,
        close: closes,
        period: 9,
        signalPeriod: 3,
    });
    const latestStoch = stochResult[stochResult.length - 1] || { k: undefined, d: undefined };
    const k = latestStoch.k as number | undefined;
    const d = latestStoch.d as number | undefined;
    const j = k !== undefined && d !== undefined ? 3 * k - 2 * d : null;
    const kdjSignal =
        (k ?? 0) > (d ?? 0) && (j ?? 0) > 50 ? 'bullish' : (k ?? 0) < (d ?? 0) && (j ?? 0) < 50 ? 'bearish' : 'neutral';

    // 4. BOLL (20, 2)
    const bollResult = BollingerBands.calculate({
        values: closes,
        period: 20,
        stdDev: 2,
    });
    const latestBoll = bollResult[bollResult.length - 1] || { upper: undefined, middle: undefined, lower: undefined };
    const bollUpper = latestBoll.upper as number | undefined;
    const bollLower = latestBoll.lower as number | undefined;
    const bollPosition =
        latestClose > (bollUpper ?? Infinity)
            ? 'above_upper'
            : latestClose < (bollLower ?? -Infinity)
                ? 'below_lower'
                : 'middle';

    // 5. 移动平均线
    const ma5 = SMA.calculate({ values: closes, period: 5 });
    const ma10 = SMA.calculate({ values: closes, period: 10 });
    const ma20 = SMA.calculate({ values: closes, period: 20 });
    const ma60 = SMA.calculate({ values: closes, period: 60 });

    // 6. OBV
    const obvResult = OBV.calculate({
        close: closes,
        volume: volumes,
    });
    const latestObv = obvResult[obvResult.length - 1];
    const obvMa10 = SMA.calculate({ values: obvResult, period: 10 });
    const latestObvMa10 = obvMa10[obvMa10.length - 1];
    const obvSignal =
        latestObv > latestObvMa10 ? 'bullish' : latestObv < latestObvMa10 ? 'bearish' : 'neutral';

    return {
        macd: {
            dif: latestMacd.MACD ?? null,
            dea: latestMacd.signal ?? null,
            histogram: latestMacd.histogram ?? null,
            signal: macdSignal,
        },
        rsi: {
            value: latestRsi ?? null,
            signal: rsiSignal,
        },
        kdj: {
            k: k ?? null,
            d: d ?? null,
            j: j,
            signal: kdjSignal,
        },
        boll: {
            upper: bollUpper ?? null,
            middle: (latestBoll.middle as number | undefined) ?? null,
            lower: bollLower ?? null,
            position: bollPosition,
        },
        ma: {
            ma5: ma5[ma5.length - 1] ?? null,
            ma10: ma10[ma10.length - 1] ?? null,
            ma20: ma20[ma20.length - 1] ?? null,
            ma60: ma60[ma60.length - 1] ?? null,
        },
        obv: {
            value: latestObv ?? null,
            ma10: latestObvMa10 ?? null,
            signal: obvSignal,
        },
    };
}

function calculateTrendScores(klines: KlineData[]): TrendScoreBreakdown {
    const closes = klines.map(k => k.close);

    // MACD
    const macdResult = MACD.calculate({
        values: closes,
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9,
        SimpleMAOscillator: false,
        SimpleMASignal: false,
    });
    const prevMacd = macdResult[macdResult.length - 2] || {};
    const latest = macdResult[macdResult.length - 1] || {};
    const dif = latest.MACD ?? 0;
    const dea = latest.signal ?? 0;
    const histogram = latest.histogram ?? 0;
    const prevHistogram = prevMacd.histogram ?? 0;

    // FIX 3: MACD 柱状图扩张/萎缩检查
    const macdHistogramExpanding = histogram > prevHistogram;
    const macdHistogramShrinking = histogram < prevHistogram;

    // MACD 信号: -100 ~ +100
    let macdScore = 0;
    if (dif > dea && dif > 0) {
        macdScore = 100; // 强多头
    } else if (dif < dea && dif < 0) {
        macdScore = -100; // 强空头
    } else if (dif > 0 && dif < dea) {
        macdScore = 30; // 转弱
    } else if (dif < 0 && dif > dea) {
        macdScore = -30; // 转强
    }

    // FIX 3: 柱状图扩张/萎缩加权
    if (macdHistogramExpanding && macdScore > 0) macdScore *= 1.2;
    if (!macdHistogramExpanding && macdScore > 0) macdScore *= 0.8;

    // 补充萎缩逻辑：空头区域萎缩是利好
    if (macdHistogramShrinking && macdScore < 0) macdScore *= 1.2;

    // EMA 信号
    const ema12 = EMA.calculate({ values: closes, period: 12 });
    const ema26 = EMA.calculate({ values: closes, period: 26 });
    const latestEma12 = ema12[ema12.length - 1] || 0;
    const latestEma26 = ema26[ema26.length - 1] || 0;

    let emaScore = 0;
    if (latestEma12 > latestEma26) {
        emaScore = 50;
    } else if (latestEma12 < latestEma26) {
        emaScore = -50;
    }

    return {
        score: 0.6 * macdScore + 0.4 * emaScore,
        macdScore,
        emaScore,
    };
}

/**
 * 计算 Gauge 评分（趋势维度）
 * 基于 MACD 和 EMA 交叉
 */
export function scoreTrend(klines: KlineData[]): number {
    return calculateTrendScores(klines).score;
}

function calculateMomentumScores(klines: KlineData[]): MomentumScoreBreakdown {
    const closes = klines.map(k => k.close);
    const highs = klines.map(k => k.high);
    const lows = klines.map(k => k.low);

    // RSI
    const rsiResult = RSI.calculate({ values: closes, period: 14 });
    const rsi = rsiResult[rsiResult.length - 1] ?? 50;

    // FIX 1: RSI 考虑价格方向
    const priceRising = closes[closes.length - 1] > closes[closes.length - 2];
    const priceFalling = closes[closes.length - 1] < closes[closes.length - 2];

    let rsiScore = 0;
    if (rsi > 70 && priceRising) {
        rsiScore = 60; // 超买但还在涨 = 延续趋势
    } else if (rsi > 70) {
        rsiScore = -80; // 超买开始调整
    } else if (rsi < 30 && priceFalling) {
        rsiScore = -60; // 超卖还在跌 = 弱势
    } else if (rsi < 30) {
        rsiScore = 80; // 超卖企稳 = 反弹概率
    } else if (rsi >= 50) {
        rsiScore = 20;
    } else {
        rsiScore = -20;
    }

    // KDJ
    const stochResult = Stochastic.calculate({
        high: highs,
        low: lows,
        close: closes,
        period: 9,
        signalPeriod: 3,
    });

    const prevStoch = stochResult[stochResult.length - 2] || { k: undefined, d: undefined };
    const latestStoch = stochResult[stochResult.length - 1] || { k: undefined, d: undefined };

    const prevK = (prevStoch.k as number | undefined) ?? 50;
    const prevD = (prevStoch.d as number | undefined) ?? 50;
    const k = (latestStoch.k as number | undefined) ?? 50;
    const d = (latestStoch.d as number | undefined) ?? 50;
    const j = 3 * k - 2 * d;

    let kdjScore = 0;
    if (k > d && j > 50) {
        kdjScore = 50; // 强势多头
    } else if (k < d && j < 50) {
        kdjScore = -50; // 弱势空头
    } else if (prevK < prevD && k > d) {
        kdjScore = 30; // 金叉
    } else if (prevK > prevD && k < d) {
        kdjScore = -30; // 死叉
    }

    return {
        score: 0.5 * rsiScore + 0.5 * kdjScore,
        rsiScore,
        kdjScore,
    };
}

/**
 * 计算 Gauge 评分（动量维度）
 * 基于 RSI 和 KDJ
 */
export function scoreMomentum(klines: KlineData[]): number {
    return calculateMomentumScores(klines).score;
}

/**
 * 计算 Gauge 评分（波动维度）
 * 基于 BOLL 和 CCI
 */
export function scoreVolatility(klines: KlineData[]): number {
    const closes = klines.map(k => k.close);
    const highs = klines.map(k => k.high);
    const lows = klines.map(k => k.low);
    const latestClose = closes[closes.length - 1];

    // BOLL
    const bollResult = BollingerBands.calculate({
        values: closes,
        period: 20,
        stdDev: 2,
    });
    const latestBoll = bollResult[bollResult.length - 1] || { upper: undefined, lower: undefined };
    const bollUpper = latestBoll.upper as number | undefined;
    const bollLower = latestBoll.lower as number | undefined;

    let bollScore = 0;
    if (latestClose > (bollUpper ?? Infinity)) {
        bollScore = 40; // 突破上轨
    } else if (latestClose < (bollLower ?? -Infinity)) {
        bollScore = -40; // 突破下轨
    }

    // CCI
    const cciResult = CCI.calculate({
        high: highs,
        low: lows,
        close: closes,
        period: 14,
    });
    const cci = cciResult[cciResult.length - 1] ?? 0;

    let cciScore = 0;
    if (cci > 100) {
        cciScore = -60; // 异常高位
    } else if (cci < -100) {
        cciScore = 60; // 异常低位
    }

    return 0.5 * bollScore + 0.5 * cciScore;
}

/**
 * 计算 Gauge 评分（量能维度）
 * 基于 OBV、VR（26日上涨量/下跌量）和 VMACD
 * 权重：OBV 40% + VR 35% + VMACD 25%
 */
function calculateVolumeScores(klines: KlineData[]): VolumeScoreBreakdown {
    const closes = klines.map(k => k.close);
    const volumes = klines.map(k => k.volume);
    const latestClose = closes[closes.length - 1];

    // ========== 1. OBV 信号 (权重 40%) ==========
    const obvResult = OBV.calculate({
        close: closes,
        volume: volumes,
    });
    const latestObv = obvResult[obvResult.length - 1] ?? 0;
    const obvMa10 = SMA.calculate({ values: obvResult, period: 10 });
    const latestObvMa10 = obvMa10[obvMa10.length - 1] ?? 0;

    // 价格 MA10
    const priceMa10 = SMA.calculate({ values: closes, period: 10 });
    const latestPriceMa10 = priceMa10[priceMa10.length - 1] ?? latestClose;

    const obvUp = latestObv > latestObvMa10;
    const priceUp = latestClose > latestPriceMa10;

    let obvScore = 0;
    if (obvUp && priceUp) {
        obvScore = 40; // 量价同步，强买入
    } else if (obvUp && !priceUp) {
        obvScore = -20; // 底背离，机构偷偷吸筹
    } else if (!obvUp && priceUp) {
        obvScore = -40; // 顶背离，机构悄悄出货（最危险）
    }
    // 双弱 = 0

    // ========== 2. VR 信号 (权重 35%) ==========
    // VR = 26日上涨日成交量之和 / 26日下跌日成交量之和
    const period = Math.min(26, closes.length - 1);
    let upVolume = 0;
    let downVolume = 0;

    for (let i = closes.length - period; i < closes.length; i++) {
        if (i > 0) {
            if (closes[i] > closes[i - 1]) {
                upVolume += volumes[i];
            } else if (closes[i] < closes[i - 1]) {
                downVolume += volumes[i];
            }
            // 平盘不计入
        }
    }

    const vr = downVolume > 0 ? upVolume / downVolume : 1;

    let vrScore = 0;
    if (vr > 1.3) {
        vrScore = 30; // 上升日成交量远超下降日，买方活跃
    } else if (vr < 0.7) {
        vrScore = -30; // 下降日成交量远超上升日，卖方活跃
    }
    // 0.7 ~ 1.3 之间 = 0（成交量均衡）

    // ========== 3. VMACD 信号 (权重 25%) ==========
    // 对成交量做 MACD，反映成交热度的加速/减速
    const vmacdResult = MACD.calculate({
        values: volumes,
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9,
        SimpleMAOscillator: false,
        SimpleMASignal: false,
    });
    const latestVmacd = vmacdResult[vmacdResult.length - 1];

    let vmacdScore = 0;
    if (latestVmacd) {
        const vDif = latestVmacd.MACD ?? 0;
        const vDea = latestVmacd.signal ?? 0;
        vmacdScore = vDif > vDea ? 20 : -20;
    }

    return {
        score: 0.4 * obvScore + 0.35 * vrScore + 0.25 * vmacdScore,
        obvScore,
        vrScore,
        vmacdScore,
    };
}

export function scoreVolume(klines: KlineData[]): number {
    return calculateVolumeScores(klines).score;
}

/**
 * 计算综合 Gauge 评分
 * @param klines K线数据
 * @returns Gauge 评分 (-100 ~ +100) 和信号
 */
export function calculateGaugeScore(klines: KlineData[]): {
    score: number;
    signal: 'Strong Buy' | 'Buy' | 'Neutral' | 'Sell' | 'Strong Sell';
    confidence: number;
    dimensions: {
        trend: number;
        momentum: number;
        volatility: number;
        volume: number;
    };
} {
    const trendScores = calculateTrendScores(klines);
    const momentumScores = calculateMomentumScores(klines);
    const volumeScores = calculateVolumeScores(klines);

    const sTrend = trendScores.score;
    const sMomentum = momentumScores.score;
    const sVolatility = scoreVolatility(klines);
    const sVolume = volumeScores.score;

    // ========== 同维度一致性因子 ==========
    // K1：趋势一致性 (MACD vs EMA)
    const k1 = Math.sign(trendScores.macdScore) === Math.sign(trendScores.emaScore) ? 1.2 : 0.6;

    // K2：动量一致性 (RSI vs KDJ)
    const k2 = Math.sign(momentumScores.rsiScore) === Math.sign(momentumScores.kdjScore) ? 1.15 : 0.7;

    // K3：量能一致性 (OBV vs VR) - 最重要
    const k3 = Math.sign(volumeScores.obvScore) === Math.sign(volumeScores.vrScore) ? 1.3 : 0.5;

    // ========== 综合评分 ==========
    // 权重：趋势 25% + 动量 25% + 波动 20% + 量能 30%
    let score =
        0.25 * sTrend * k1 +
        0.25 * sMomentum * k2 +
        0.2 * sVolatility +
        0.3 * sVolume * k3;

    // 限制范围
    score = Math.max(-100, Math.min(100, score));

    // 信号映射
    let signal: 'Strong Buy' | 'Buy' | 'Neutral' | 'Sell' | 'Strong Sell';
    if (score > 60) {
        signal = 'Strong Buy';
    } else if (score > 30) {
        signal = 'Buy';
    } else if (score >= -30) {
        signal = 'Neutral';
    } else if (score >= -60) {
        signal = 'Sell';
    } else {
        signal = 'Strong Sell';
    }

    // FIX 4: 加权置信度（成交量权重最高）
    const confidence = (
        Math.max(0, sTrend) * 0.25 +
        Math.max(0, sMomentum) * 0.25 +
        Math.max(0, sVolatility) * 0.20 +
        Math.max(0, sVolume) * 0.30
    ) / 100;

    return {
        score: Math.round(score * 10) / 10,
        signal,
        confidence,
        dimensions: {
            trend: Math.round(sTrend * 10) / 10,
            momentum: Math.round(sMomentum * 10) / 10,
            volatility: Math.round(sVolatility * 10) / 10,
            volume: Math.round(sVolume * 10) / 10,
        },
    };
}
