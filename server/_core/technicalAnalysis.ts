/**
 * 股票技术分析模块
 * 基于 stock-trading-analysis-guide.md 的完整规则
 * 提供给 AI 工具直接调用
 */

import * as akshare from '../akshare';

// ==================== 类型定义 ====================

export interface TechnicalAnalysisResult {
    // 基本信息
    symbol: string;
    name: string;
    date: string;
    price: number;
    changePct: number;

    // 均线系统
    ma5: number;
    ma10: number;
    ma20: number;
    isMaBullish: boolean;  // MA5 > MA10 > MA20
    priceAboveMa5: boolean;
    priceAboveMa10: boolean;

    // MACD
    macdDif: number;
    macdDea: number;
    macdHistogram: number;
    macdIsRed: boolean;
    macdExpanding: boolean;
    macdCross: 'golden' | 'dead' | 'none';

    // RSI
    rsi: number;
    rsiZone: 'oversold' | 'normal' | 'overbought';

    // KDJ
    kdjK: number;
    kdjD: number;
    kdjJ: number;
    kdjCross: 'golden' | 'dead' | 'none';

    // 成交量
    volRatio: number;
    volStatus: 'shrink' | 'normal' | 'expand';

    // 综合判断
    notWeakenedScore: number;  // 0-5 分
    notWeakenedItems: string[];
    shouldHold: boolean;
    shouldSell: boolean;
    holdAdvice: 'hold' | 'cautious' | 'exit' | 'sell';

    // 止损位
    stopLossAggressive: number;  // MA5
    stopLossModerate: number;    // MA10
    stopLossConservative: number; // MA20

    // 分批进场建议
    entrySuggestions: {
        batch: number;
        position: string;
        trigger: string;
        entryPrice: number;
        stopLoss: number;
        target: number;
    }[];

    // 格式化的报告
    summary: string;
    report: string;
}

// ==================== 技术指标计算 ====================

function calculateMA(closes: number[], period: number): number[] {
    if (closes.length < period) {
        return closes.map(() => closes[closes.length - 1]);
    }

    const result: number[] = [];
    for (let i = 0; i < closes.length; i++) {
        if (i < period - 1) {
            result.push(closes.slice(0, i + 1).reduce((a, b) => a + b, 0) / (i + 1));
        } else {
            result.push(closes.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period);
        }
    }
    return result;
}

function calculateEMA(data: number[], period: number): number[] {
    if (!data.length) return [];
    const result = [data[0]];
    const multiplier = 2 / (period + 1);
    for (let i = 1; i < data.length; i++) {
        result.push((data[i] - result[i - 1]) * multiplier + result[i - 1]);
    }
    return result;
}

function calculateRSI(closes: number[], period: number = 14): number {
    if (closes.length < period + 1) return 50;

    const gains: number[] = [];
    const losses: number[] = [];

    for (let i = 1; i < closes.length; i++) {
        const change = closes[i] - closes[i - 1];
        if (change > 0) {
            gains.push(change);
            losses.push(0);
        } else {
            gains.push(0);
            losses.push(Math.abs(change));
        }
    }

    const avgGain = gains.slice(-period).reduce((a, b) => a + b, 0) / period;
    const avgLoss = losses.slice(-period).reduce((a, b) => a + b, 0) / period;

    if (avgLoss === 0) return 100;

    const rs = avgGain / avgLoss;
    return Math.round((100 - (100 / (1 + rs))) * 100) / 100;
}

function calculateMACD(closes: number[], fast = 12, slow = 26, signal = 9): {
    dif: number[];
    dea: number[];
    histogram: number[];
} {
    if (closes.length < slow) {
        return { dif: [0], dea: [0], histogram: [0] };
    }

    const emaFast = calculateEMA(closes, fast);
    const emaSlow = calculateEMA(closes, slow);

    const dif = emaFast.map((v, i) => v - emaSlow[i]);
    const dea = calculateEMA(dif, signal);
    const histogram = dif.map((v, i) => v - dea[i]);

    return { dif, dea, histogram };
}

function calculateKDJ(highs: number[], lows: number[], closes: number[], n = 9): {
    k: number[];
    d: number[];
    j: number[];
} {
    if (closes.length < n) {
        return { k: [50], d: [50], j: [50] };
    }

    const kList: number[] = [];
    const dList: number[] = [];
    const jList: number[] = [];

    for (let i = n - 1; i < closes.length; i++) {
        const lowN = Math.min(...lows.slice(i - n + 1, i + 1));
        const highN = Math.max(...highs.slice(i - n + 1, i + 1));

        const rsv = highN === lowN ? 50 : ((closes[i] - lowN) / (highN - lowN)) * 100;

        const k = kList.length === 0 ? rsv : (2 / 3) * kList[kList.length - 1] + (1 / 3) * rsv;
        const d = dList.length === 0 ? k : (2 / 3) * dList[dList.length - 1] + (1 / 3) * k;
        const j = 3 * k - 2 * d;

        kList.push(k);
        dList.push(d);
        jList.push(j);
    }

    return { k: kList, d: dList, j: jList };
}

// ==================== 核心分析函数 ====================

/**
 * 分析股票技术面
 * @param symbol 股票代码
 * @param targetDate 目标日期（可选，默认最新）
 */
export async function analyzeStock(symbol: string, targetDate?: string): Promise<TechnicalAnalysisResult | null> {
    try {
        // 获取股票信息
        const stockInfo = await akshare.getStockInfo(symbol);
        if (!stockInfo) {
            return null;
        }

        // 获取K线数据
        const klines = await akshare.getStockHistory(symbol, 'daily', 120);
        if (!klines || klines.length < 30) {
            return null;
        }

        // 确定分析日期
        let targetIdx = klines.length - 1;
        if (targetDate) {
            const idx = klines.findIndex(k => k.date === targetDate || k.date.startsWith(targetDate));
            if (idx >= 0) {
                targetIdx = idx;
            }
        }

        const data = klines.slice(0, targetIdx + 1);
        const today = klines[targetIdx];
        const actualDate = today.date.split('T')[0];

        const closes = data.map(k => k.close);
        const highs = data.map(k => k.high);
        const lows = data.map(k => k.low);
        const volumes = data.map(k => k.volume);

        // 计算指标
        const ma5List = calculateMA(closes, 5);
        const ma10List = calculateMA(closes, 10);
        const ma20List = calculateMA(closes, 20);

        const ma5 = ma5List[ma5List.length - 1];
        const ma10 = ma10List[ma10List.length - 1];
        const ma20 = ma20List[ma20List.length - 1];

        const isMaBullish = ma5 > ma10 && ma10 > ma20;
        const priceAboveMa5 = today.close > ma5;
        const priceAboveMa10 = today.close > ma10;

        // MACD
        const macd = calculateMACD(closes);
        const macdDif = macd.dif[macd.dif.length - 1];
        const macdDea = macd.dea[macd.dea.length - 1];
        const macdHistogram = macd.histogram[macd.histogram.length - 1];
        const macdIsRed = macdHistogram > 0;
        const macdExpanding = macd.histogram.length >= 2 &&
            macd.histogram[macd.histogram.length - 1] > macd.histogram[macd.histogram.length - 2];

        let macdCross: 'golden' | 'dead' | 'none' = 'none';
        if (macd.dif.length >= 2 && macd.dea.length >= 2) {
            const prevDif = macd.dif[macd.dif.length - 2];
            const prevDea = macd.dea[macd.dea.length - 2];
            if (prevDif < prevDea && macdDif > macdDea) macdCross = 'golden';
            else if (prevDif > prevDea && macdDif < macdDea) macdCross = 'dead';
        }

        // RSI
        const rsi = calculateRSI(closes);
        const rsiZone: 'oversold' | 'normal' | 'overbought' =
            rsi < 30 ? 'oversold' : rsi > 70 ? 'overbought' : 'normal';

        // KDJ
        const kdj = calculateKDJ(highs, lows, closes);
        const kdjK = kdj.k[kdj.k.length - 1];
        const kdjD = kdj.d[kdj.d.length - 1];
        const kdjJ = kdj.j[kdj.j.length - 1];

        let kdjCross: 'golden' | 'dead' | 'none' = 'none';
        if (kdj.k.length >= 2 && kdj.d.length >= 2) {
            const prevK = kdj.k[kdj.k.length - 2];
            const prevD = kdj.d[kdj.d.length - 2];
            if (prevK < prevD && kdjK > kdjD) kdjCross = 'golden';
            else if (prevK > prevD && kdjK < kdjD) kdjCross = 'dead';
        }

        // 成交量
        const volAvg5 = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5;
        const volRatio = today.volume / volAvg5;
        const volStatus: 'shrink' | 'normal' | 'expand' =
            volRatio < 0.7 ? 'shrink' : volRatio > 1.5 ? 'expand' : 'normal';

        // "没走弱"判定（5项检查）
        const notWeakenedItems: string[] = [];
        let notWeakenedScore = 0;

        if (priceAboveMa5) {
            notWeakenedItems.push('✅ 收盘价在MA5之上');
            notWeakenedScore++;
        } else {
            notWeakenedItems.push('❌ 收盘价跌破MA5');
        }

        if (priceAboveMa10) {
            notWeakenedItems.push('✅ 收盘价在MA10之上');
            notWeakenedScore++;
        } else {
            notWeakenedItems.push('❌ 收盘价跌破MA10');
        }

        if (macdIsRed) {
            notWeakenedItems.push(macdExpanding ? '✅ MACD红柱存在且扩大' : '✅ MACD红柱存在（在缩小）');
            notWeakenedScore++;
        } else {
            notWeakenedItems.push('❌ MACD已转绿柱');
        }

        if (rsi > 30) {
            notWeakenedItems.push(`✅ RSI=${rsi.toFixed(0)} 在30以上`);
            notWeakenedScore++;
        } else {
            notWeakenedItems.push(`❌ RSI=${rsi.toFixed(0)} 处于超卖区`);
        }

        if (volStatus === 'shrink' || volStatus === 'normal') {
            notWeakenedItems.push(`✅ 成交量${volStatus === 'shrink' ? '缩量' : '正常'}（无砸盘）`);
            notWeakenedScore++;
        } else if (today.changePct > 0) {
            notWeakenedItems.push('✅ 放量上涨（资金进场）');
            notWeakenedScore++;
        } else {
            notWeakenedItems.push('❌ 放量下跌（资金离场）');
        }

        // 判定建议
        let shouldHold = notWeakenedScore >= 3;
        let holdAdvice: 'hold' | 'cautious' | 'exit' | 'sell';

        if (notWeakenedScore >= 3) {
            holdAdvice = 'hold';
        } else if (notWeakenedScore >= 2) {
            holdAdvice = 'cautious';
        } else {
            holdAdvice = 'exit';
        }

        // 卖出信号
        let shouldSell = false;
        if (macdCross === 'dead') {
            shouldSell = true;
            holdAdvice = 'sell';
        }
        if (!priceAboveMa10 && volStatus === 'expand' && today.changePct < 0) {
            shouldSell = true;
            holdAdvice = 'sell';
        }

        // 止损位
        const stopLossAggressive = ma5;
        const stopLossModerate = ma10;
        const stopLossConservative = ma20;

        // 分批进场建议
        const entrySuggestions = [];
        if (shouldHold && !shouldSell) {
            const recentHigh = Math.max(...data.slice(-20).map(k => k.high));

            entrySuggestions.push({
                batch: 1,
                position: '30-40%',
                trigger: `回踩MA5(${ma5.toFixed(2)}元)但缩量`,
                entryPrice: ma5,
                stopLoss: ma10,
                target: today.close * 1.1,
            });

            entrySuggestions.push({
                batch: 2,
                position: '35-40%',
                trigger: `回踩MA10(${ma10.toFixed(2)}元)但收不破`,
                entryPrice: ma10,
                stopLoss: ma20,
                target: today.close * 1.15,
            });

            entrySuggestions.push({
                batch: 3,
                position: '20-30%',
                trigger: `突破近期高点(${recentHigh.toFixed(2)}元)`,
                entryPrice: recentHigh,
                stopLoss: ma5,
                target: recentHigh * 1.1,
            });
        }

        // 生成摘要
        const adviceText = {
            hold: '✅ 应该持有',
            cautious: '⚠️ 谨慎观望',
            exit: '❌ 建议离场',
            sell: '🔴 建议卖出',
        };

        const summary = `${stockInfo.name}(${symbol}) ${actualDate} 技术分析：得分 ${notWeakenedScore}/5，${adviceText[holdAdvice]}`;

        // 生成报告
        const entryAdviceText = entrySuggestions.length > 0
            ? entrySuggestions.map(e =>
                `├─ 第${e.batch}批(${e.position}): ${e.trigger}，进场${e.entryPrice.toFixed(2)}元，止损${e.stopLoss.toFixed(2)}元`
            ).join('\n')
            : '├─ 当前不建议进场';

        // 综合结论（硬编码规则）
        let overallVerdict = '';
        if (notWeakenedScore >= 4 && !shouldSell) {
            overallVerdict = `✅ 强势，建议持有。得分${notWeakenedScore}/5，技术面健康。若持仓可继续持有，若空仓可考虑分批建仓。`;
        } else if (notWeakenedScore >= 3 && !shouldSell) {
            overallVerdict = `✅ 尚可持有。得分${notWeakenedScore}/5，短期可能有波动但趋势未破。设好止损（${stopLossModerate.toFixed(2)}元）继续观察。`;
        } else if (notWeakenedScore === 2) {
            overallVerdict = `⚠️ 谨慎观望。得分${notWeakenedScore}/5，技术面走弱但未破位。建议减仓或观望，等待明确信号。`;
        } else if (shouldSell || notWeakenedScore <= 1) {
            overallVerdict = `❌ 建议离场。得分${notWeakenedScore}/5，技术面已破位。止损位${stopLossModerate.toFixed(2)}元，跌破应立即离场。`;
        }

        const report = `
【${actualDate}】${stockInfo.name}(${symbol}) 技术分析报告

📊 核心指标
├─ 价格: ${today.close.toFixed(2)}元 (${today.changePct >= 0 ? '+' : ''}${today.changePct.toFixed(2)}%)
├─ 均线: MA5=${ma5.toFixed(2)} MA10=${ma10.toFixed(2)} MA20=${ma20.toFixed(2)}
│  ${isMaBullish ? '✅ 多头排列' : '❌ 非多头排列'}
├─ MACD: ${macdIsRed ? '🟢 红柱' : '🔴 绿柱'} ${macdCross === 'golden' ? '🟢金叉' : macdCross === 'dead' ? '🔴死叉' : ''}
├─ RSI: ${rsi.toFixed(1)} (${rsiZone === 'overbought' ? '⚠️超买' : rsiZone === 'oversold' ? '🟢超卖' : '正常'})
└─ 量比: ${volRatio.toFixed(2)} (${volStatus === 'shrink' ? '📉缩量' : volStatus === 'expand' ? '📈放量' : '正常'})

📋 "没走弱"判定（得分: ${notWeakenedScore}/5）
${notWeakenedItems.join('\n')}

🛡️ 止损位
├─ 激进(MA5): ${stopLossAggressive.toFixed(2)}元
├─ 稳健(MA10): ${stopLossModerate.toFixed(2)}元
└─ 保守(MA20): ${stopLossConservative.toFixed(2)}元

📈 分批进场建议
${entryAdviceText}

🎯 综合结论
${overallVerdict}
`.trim();

        return {
            symbol,
            name: stockInfo.name,
            date: actualDate,
            price: today.close,
            changePct: today.changePct,
            ma5,
            ma10,
            ma20,
            isMaBullish,
            priceAboveMa5,
            priceAboveMa10,
            macdDif,
            macdDea,
            macdHistogram,
            macdIsRed,
            macdExpanding,
            macdCross,
            rsi,
            rsiZone,
            kdjK,
            kdjD,
            kdjJ,
            kdjCross,
            volRatio,
            volStatus,
            notWeakenedScore,
            notWeakenedItems,
            shouldHold,
            shouldSell,
            holdAdvice,
            stopLossAggressive,
            stopLossModerate,
            stopLossConservative,
            entrySuggestions,
            summary,
            report,
        };
    } catch (error) {
        console.error('[analyzeStock] Error:', error);
        return null;
    }
}

/**
 * 格式化分析结果为 AI 友好的文本
 */
export function formatAnalysisForAI(result: TechnicalAnalysisResult): string {
    return result.report;
}
