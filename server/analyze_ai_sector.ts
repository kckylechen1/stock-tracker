/**
 * AI应用板块股票分析
 * 基于东方财富AI应用板块数据分析
 */

import * as akshare from './akshare';
import {
    SMA,
    RSI,
    MACD,
    Stochastic,
} from 'technicalindicators';

interface KlineData {
    date: string;
    open: number;
    close: number;
    high: number;
    low: number;
    volume: number;
    changePct?: number;
}

interface IndicatorResult {
    date: string;
    price: number;
    ma5: number;
    ma10: number;
    ma20: number;
    ma60: number;
    maArrangement: string;
    macd: {
        dif: number;
        dea: number;
        histogram: number;
        signal: string;
    };
    rsi: {
        value: number;
        signal: string;
    };
    kdj: {
        k: number;
        d: number;
        j: number;
        signal: string;
    };
    volume: {
        ratio: number;
        status: string;
    };
    gaugeScore: number;
    signals: string[];
    sellSignals: string[];
    totalScore: number;
}

/**
 * 计算技术指标
 */
function calculateIndicators(
    latest: KlineData,
    closes: number[],
    highs: number[],
    lows: number[],
    volumes: number[]
): IndicatorResult {
    if (closes.length < 60) {
        throw new Error('数据不足，无法计算指标');
    }

    // 1. 均线系统
    const ma5 = SMA.calculate({ values: closes, period: 5 });
    const ma10 = SMA.calculate({ values: closes, period: 10 });
    const ma20 = SMA.calculate({ values: closes, period: 20 });
    const ma60 = SMA.calculate({ values: closes, period: 60 });

    const lastMA5 = ma5[ma5.length - 1];
    const lastMA10 = ma10[ma10.length - 1];
    const lastMA20 = ma20[ma20.length - 1];
    const lastMA60 = ma60[ma60.length - 1];

    let maArrangement = '盘整';
    if (lastMA5 > lastMA10 && lastMA10 > lastMA20 && lastMA20 > lastMA60) {
        maArrangement = '多头排列';
    } else if (lastMA5 < lastMA10 && lastMA10 < lastMA20 && lastMA20 < lastMA60) {
        maArrangement = '空头排列';
    }

    // 2. MACD
    const macdResult = MACD.calculate({
        values: closes,
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9,
        SimpleMAOscillator: false,
        SimpleMASignal: false,
    });

    const macd = macdResult[macdResult.length - 1] || { histogram: 0, signal: 0 };
    const prevMacd = macdResult[macdResult.length - 2] || { histogram: 0, signal: 0 };

    let macdSignal = '中性';
    if (macd.histogram > 0 && prevMacd.histogram <= 0) {
        macdSignal = '金叉';
    } else if (macd.histogram < 0 && prevMacd.histogram >= 0) {
        macdSignal = '死叉';
    } else if (macd.histogram > 0) {
        macdSignal = '红柱';
    } else {
        macdSignal = '绿柱';
    }

    // 3. RSI
    const rsiResult = RSI.calculate({
        values: closes,
        period: 14,
    });

    const rsiValue = rsiResult[rsiResult.length - 1] ?? 50;
    let rsiSignal = '中性';
    if (rsiValue > 80) rsiSignal = '超买';
    else if (rsiValue > 65) rsiSignal = '强势';
    else if (rsiValue > 50) rsiSignal = '偏强';
    else if (rsiValue < 30) rsiSignal = '超卖';
    else rsiSignal = '偏弱';

    // 4. KDJ
    const stochResult = Stochastic.calculate({
        high: highs,
        low: lows,
        close: closes,
        period: 9,
        signalPeriod: 3,
    });

    const stoch = stochResult[stochResult.length - 1] || { k: 50, d: 50 };
    const prevStoch = stochResult[stochResult.length - 2] || { k: 50, d: 50 };
    const kdjK = stoch.k ?? 50;
    const kdjD = stoch.d ?? 50;
    const kdjJ = 3 * kdjK - 2 * kdjD;

    let kdjSignal = '中性';
    if (kdjK > kdjD && prevStoch.k! <= prevStoch.d!) {
        kdjSignal = '金叉';
    } else if (kdjK < kdjD && prevStoch.k! >= prevStoch.d!) {
        kdjSignal = '死叉';
    } else if (kdjJ > 50) {
        kdjSignal = '强势';
    } else {
        kdjSignal = '弱势';
    }

    // 5. 成交量
    const volAvg5 = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5;
    const volAvg20 = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const volRatio = latest.volume / volAvg20;
    let volStatus = '正常';
    if (volRatio < 0.7) volStatus = '缩量';
    else if (volRatio > 1.3) volStatus = '放量';

    // 6. Gauge 评分 (针对AI板块优化)
    let score = 0;

    if (maArrangement === '多头排列') score += 25;
    else if (maArrangement === '盘整' && lastMA5 > lastMA10) score += 15;

    if (macdSignal === '金叉') score += 20;
    else if (macdSignal === '红柱' && macd.histogram > prevMacd.histogram) score += 15;

    if (rsiValue > 65 && rsiValue < 80) score += 20;
    else if (rsiValue > 50 && rsiValue <= 65) score += 15;
    else if (rsiValue < 30) score += 10;

    if (kdjSignal === '金叉') score += 20;
    else if (kdjJ > 50) score += 15;

    if (volStatus === '放量' && latest.close > latest.open) score += 20;
    else if (volStatus === '放量') score += 10;

    // AI板块特殊加分：强势突破
    if (latest.close > lastMA20 * 1.05 && volRatio > 1.5) score += 15;

    score = Math.min(100, Math.max(0, score));

    // 生成买入信号列表
    const signals: string[] = [];
    if (maArrangement === '多头排列') signals.push('✅ 均线多头排列');
    else if (lastMA5 > lastMA10) signals.push('✅ MA5 > MA10');

    if (macdSignal === '金叉') signals.push('✅ MACD 金叉');
    else if (macdSignal === '红柱') signals.push('✅ MACD 红柱');

    if (rsiValue > 65 && rsiValue < 80) signals.push('✅ RSI 强势');
    else if (rsiValue > 50 && rsiValue <= 65) signals.push('✅ RSI 偏强');
    else if (rsiValue < 30) signals.push('✅ RSI 超卖');

    if (kdjSignal === '金叉') signals.push('✅ KDJ 金叉');
    else if (kdjJ > 50) signals.push('✅ KDJ J > 50');

    if (volStatus === '放量' && latest.close > latest.open) signals.push('✅ 放量上涨');
    else if (volStatus === '放量') signals.push('⚠️ 放量下跌');

    // AI板块特殊信号
    if (latest.close > lastMA20 * 1.05 && volRatio > 1.5) signals.push('🚀 AI强势突破');

    // 生成卖出信号列表
    const sellSignals: string[] = [];
    let sellScore = 0;

    if (maArrangement === '空头排列') {
        sellSignals.push('❌ 均线空头排列');
        sellScore -= 20;
    }
    if (macdSignal === '死叉') {
        sellSignals.push('❌ MACD 死叉');
        sellScore -= 15;
    }
    if (rsiValue > 80) {
        sellSignals.push('❌ RSI 超买');
        sellScore -= 10;
    }
    if (volStatus === '缩量' && latest.close < latest.open) {
        sellSignals.push('❌ 缩量下跌');
        sellScore -= 15;
    }

    const totalScore = Math.max(0, score + sellScore);

    return {
        date: latest.date,
        price: latest.close,
        ma5: lastMA5,
        ma10: lastMA10,
        ma20: lastMA20,
        ma60: lastMA60,
        maArrangement,
        macd: {
            dif: macd.histogram,
            dea: macd.signal,
            histogram: macd.histogram,
            signal: macdSignal,
        },
        rsi: {
            value: rsiValue,
            signal: rsiSignal,
        },
        kdj: {
            k: kdjK,
            d: kdjD,
            j: kdjJ,
            signal: kdjSignal,
        },
        volume: {
            ratio: volRatio,
            status: volStatus,
        },
        gaugeScore: score,
        signals,
        sellSignals,
        totalScore,
    };
}

/**
 * 自动检测启动日 (AI板块优化)
 */
function detectLaunchDay(klines: KlineData[]): string | null {
    for (let i = 60; i < klines.length; i++) {
        const today = klines[i];
        const prev20Days = klines.slice(i - 20, i);

        if (prev20Days.length < 20) continue;

        const prev20High = Math.max(...prev20Days.map(k => k.high));
        const prev20AvgVol = prev20Days.reduce((sum, k) => sum + k.volume, 0) / 20;

        const isBreakout = today.close > prev20High * 1.03;
        const isHighVolume = today.volume > prev20AvgVol * 2;
        const isBigUp = today.close > today.open * 1.05;

        if (isBreakout && isHighVolume && isBigUp) {
            return today.date;
        }
    }
    return null;
}

/**
 * 计算年度涨幅
 */
function calculateYearGain(klines: KlineData[]): number {
    if (klines.length < 2) return 0;

    // 找2025年初的价格
    const yearStart = klines.find(k => k.date.startsWith('2025-01') || k.date.startsWith('2025-02'));
    if (!yearStart) return 0;

    const current = klines[klines.length - 1];
    return ((current.close - yearStart.close) / yearStart.close) * 100;
}

interface StockAnalysis {
    symbol: string;
    name: string;
    sector: string;
    launchDate: string | null;
    yearGain: number;
    launchScore: number | null;
    currentScore: number | null;
    currentSignals: string[];
    currentSellSignals: string[];
    recommendation: '强烈买入' | '买入' | '持有' | '观望' | '卖出';
    risk: '低' | '中' | '高';
    reason: string;
}

/**
 * 分析单只AI股票
 */
async function analyzeAIStock(symbol: string, name: string, sector: string): Promise<StockAnalysis | null> {
    try {
        const klines = await akshare.getStockHistory(symbol, 'daily', 365);
        if (!klines || klines.length < 60) {
            console.log(`⚠️ ${name}(${symbol}): 数据不足`);
            return null;
        }

        const yearGain = calculateYearGain(klines);
        const launchDate = detectLaunchDay(klines);

        let launchScore: number | null = null;
        let currentScore: number | null = null;
        let currentSignals: string[] = [];
        let currentSellSignals: string[] = [];

        // 计算当前技术指标
        const closes = klines.map(k => k.close);
        const highs = klines.map(k => k.high);
        const lows = klines.map(k => k.low);
        const volumes = klines.map(k => k.volume);
        const latest = klines[klines.length - 1];

        const currentIndicators = calculateIndicators(latest, closes, highs, lows, volumes);
        currentScore = currentIndicators.totalScore;
        currentSignals = currentIndicators.signals;
        currentSellSignals = currentIndicators.sellSignals;

        // 计算启动日评分
        if (launchDate) {
            const launchIdx = klines.findIndex(k => k.date === launchDate);
            if (launchIdx >= 0) {
                const launchHistory = klines.slice(0, launchIdx + 1);
                const launchCloses = launchHistory.map(k => k.close);
                const launchHighs = launchHistory.map(k => k.high);
                const launchLows = launchHistory.map(k => k.low);
                const launchVolumes = launchHistory.map(k => k.volume);
                const launchLatest = launchHistory[launchHistory.length - 1];

                const launchIndicators = calculateIndicators(
                    launchLatest, launchCloses, launchHighs, launchLows, launchVolumes
                );
                launchScore = launchIndicators.totalScore;
            }
        }

        // 生成投资建议
        let recommendation: '强烈买入' | '买入' | '持有' | '观望' | '卖出' = '观望';
        let risk: '低' | '中' | '高' = '中';
        let reason = '';

        if (currentScore && currentScore >= 80) {
            recommendation = '强烈买入';
            risk = '高';
            reason = '技术指标全面向好，AI板块强势突破';
        } else if (currentScore && currentScore >= 65) {
            recommendation = '买入';
            risk = '中';
            reason = '技术指标偏强，AI板块机会显现';
        } else if (currentScore && currentScore >= 50) {
            recommendation = '持有';
            risk = '中';
            reason = '技术指标中性，可适度关注';
        } else if (currentScore && currentScore >= 30) {
            recommendation = '观望';
            risk = '低';
            reason = '技术指标偏弱，等待更好时机';
        } else {
            recommendation = '卖出';
            risk = '低';
            reason = '技术指标疲弱，建议回避';
        }

        // AI板块特殊调整
        if (sector.includes('AI') || sector.includes('芯片')) {
            if (currentScore && currentScore >= 70) {
                recommendation = recommendation === '买入' ? '强烈买入' : recommendation;
            }
        }

        return {
            symbol,
            name,
            sector,
            launchDate,
            yearGain,
            launchScore,
            currentScore,
            currentSignals,
            currentSellSignals,
            recommendation,
            risk,
            reason,
        };
    } catch (e) {
        console.log(`⚠️ ${name}(${symbol}): 分析失败 - ${e}`);
        return null;
    }
}

/**
 * 主函数 - AI应用板块分析
 */
async function main() {
    console.log('╔════════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                        AI应用板块股票投资分析                              ║');
    console.log('║              基于东方财富AI应用板块 - 技术指标与投资建议                  ║');
    console.log('╚═════════════════════════════════════════════════════════════════════════╝\n');

    // AI应用板块股票列表 (基于东方财富板块数据)
    const aiStocks = [
        { symbol: '300502', name: '新易盛', sector: 'AI芯片/存储' },
        { symbol: '301308', name: '江波龙', sector: 'AI存储芯片' },
        { symbol: '688111', name: '金山办公', sector: 'AI办公软件' },
        { symbol: '688981', name: '中芯国际', sector: 'AI芯片制造' },
        { symbol: '688008', name: '澜起科技', sector: 'AI芯片设计' },
        { symbol: '300750', name: '宁德时代', sector: 'AI新能源' },
        { symbol: '002415', name: '海康威视', sector: 'AI安防' },
        { symbol: '300274', name: '阳光电源', sector: 'AI新能源' },
        { symbol: '601138', name: '工业富联', sector: 'AI智能制造' },
        { symbol: '002594', name: '比亚迪', sector: 'AI新能源汽车' },
        { symbol: '300124', name: '汇川技术', sector: 'AI自动化' },
        { symbol: '600276', name: '恒瑞医药', sector: 'AI医疗' },
        { symbol: '300896', name: '爱美客', sector: 'AI医疗美容' },
    ];

    const results: StockAnalysis[] = [];
    const failed: Array<{ symbol: string; name: string }> = [];

    console.log('🔍 正在分析AI应用板块股票...\n');

    for (let i = 0; i < aiStocks.length; i++) {
        const stock = aiStocks[i];
        console.log(`[${i + 1}/${aiStocks.length}] 分析 ${stock.name}(${stock.symbol}) - ${stock.sector}...`);

        const result = await analyzeAIStock(stock.symbol, stock.name, stock.sector);
        if (result) {
            results.push(result);
            const recoEmoji = {
                '强烈买入': '🚀',
                '买入': '✅',
                '持有': '⏳',
                '观望': '👀',
                '卖出': '❌'
            }[result.recommendation] || '❓';

            console.log(`  ${recoEmoji} ${result.recommendation} | 涨幅: ${result.yearGain > 0 ? '+' : ''}${result.yearGain.toFixed(2)}% | 当前评分: ${result.currentScore ?? 'N/A'}`);
        } else {
            failed.push(stock);
        }

        await new Promise(resolve => setTimeout(resolve, 200)); // 增加延迟避免API限制
    }

    console.log('\n\n' + '═'.repeat(100));
    console.log('📊 AI应用板块分析结果\n');

    // 按推荐等级排序
    const recoOrder = { '强烈买入': 5, '买入': 4, '持有': 3, '观望': 2, '卖出': 1 };
    results.sort((a, b) => recoOrder[b.recommendation] - recoOrder[a.recommendation]);

    // 统计信息
    const recoStats = results.reduce((acc, r) => {
        acc[r.recommendation] = (acc[r.recommendation] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    console.log('🎯 投资建议统计:');
    Object.entries(recoStats).forEach(([reco, count]) => {
        const emoji = {
            '强烈买入': '🚀',
            '买入': '✅',
            '持有': '⏳',
            '观望': '👀',
            '卖出': '❌'
        }[reco] || '❓';
        console.log(`  ${emoji} ${reco}: ${count}只`);
    });

    const avgGain = results.reduce((sum, r) => sum + r.yearGain, 0) / results.length;
    console.log(`📈 平均涨幅: ${avgGain > 0 ? '+' : ''}${avgGain.toFixed(2)}%`);

    console.log('\n🔥 详细投资建议:\n');

    results.forEach((result, index) => {
        const recoEmoji = {
            '强烈买入': '🚀',
            '买入': '✅',
            '持有': '⏳',
            '观望': '👀',
            '卖出': '❌'
        }[result.recommendation] || '❓';

        console.log(`${index + 1}. ${recoEmoji} ${result.name}(${result.symbol})`);
        console.log(`   板块: ${result.sector}`);
        console.log(`   2025年涨幅: ${result.yearGain > 0 ? '+' : ''}${result.yearGain.toFixed(2)}%`);
        console.log(`   当前评分: ${result.currentScore ?? 'N/A'}/100`);
        console.log(`   风险等级: ${result.risk === '高' ? '🔴' : result.risk === '中' ? '🟡' : '🟢'} ${result.risk}`);
        console.log(`   建议理由: ${result.reason}`);

        if (result.currentSignals.length > 0) {
            console.log(`   💡 买入信号: ${result.currentSignals.join(', ')}`);
        }
        if (result.currentSellSignals.length > 0) {
            console.log(`   ⚠️ 卖出信号: ${result.currentSellSignals.join(', ')}`);
        }
        console.log('');
    });

    console.log('═'.repeat(100));
    console.log('💡 投资建议说明:');
    console.log('🚀 强烈买入: 技术指标全面向好，AI板块强势突破，建议积极布局');
    console.log('✅ 买入: 技术指标偏强，AI板块机会显现，可适量配置');
    console.log('⏳ 持有: 技术指标中性，可适度关注，等待更好时机');
    console.log('👀 观望: 技术指标偏弱，建议观望，控制风险');
    console.log('❌ 卖出: 技术指标疲弱，建议回避或减仓');
    console.log('');
    console.log('⚠️ 风险提示: AI板块波动较大，请根据个人风险承受能力和投资经验谨慎决策。');
    console.log('📊 数据来源: 东方财富AI应用板块，技术指标基于历史数据计算。');

    if (failed.length > 0) {
        console.log(`\n⚠️ 分析失败的股票: ${failed.map(f => f.name).join(', ')}`);
    }
}

// 直接运行
main().catch(console.error);</content>
<parameter name="filePath">/Users/kckylechen/Desktop/Stock Tracker/stock-tracker/server/analyze_ai_sector.ts