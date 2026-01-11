/**
 * AI应用板块股票分析
 * 股票：980112（港股）
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
    const ma5 = SMA.calculate({ values: closes, period: 5 });
    const ma10 = SMA.calculate({ values: closes, period: 10 });
    const ma20 = SMA.calculate({ values: closes, period: 20 });
    const ma60 = SMA.calculate({ values: closes, period: Math.min(60, closes.length) });

    const lastMA5 = ma5[ma5.length - 1] ?? latest.close;
    const lastMA10 = ma10[ma10.length - 1] ?? latest.close;
    const lastMA20 = ma20[ma20.length - 1] ?? latest.close;
    const lastMA60 = ma60.length > 0 ? ma60[ma60.length - 1] : latest.close;

    let maArrangement = '盘整';
    if (ma5.length > 0 && ma10.length > 0 && ma20.length > 0) {
        if (lastMA5 > lastMA10 && lastMA10 > lastMA20) {
            maArrangement = '短期多头';
        } else if (lastMA5 < lastMA10 && lastMA10 < lastMA20) {
            maArrangement = '短期空头';
        } else if (lastMA5 > lastMA10) {
            maArrangement = 'MA5上穿MA10';
        } else if (lastMA5 < lastMA10) {
            maArrangement = 'MA5下穿MA10';
        }
    }

    const macdResult = MACD.calculate({
        values: closes,
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9,
        SimpleMAOscillator: false,
        SimpleMASignal: false,
    });

    const macd = macdResult[macdResult.length - 1] || { MACD: 0, signal: 0, histogram: 0 };
    const prevMacd = macdResult[macdResult.length - 2] || { MACD: 0, signal: 0, histogram: 0 };

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

    const stochResult = Stochastic.calculate({
        high: highs,
        low: lows,
        close: closes,
        period: 9,
        signalPeriod: 3,
    });

    const stoch = stochResult[stochResult.length - 1] || { k: 50, d: 50 } as { k: number; d: number };
    const prevStoch = stochResult[stochResult.length - 2] || { k: 50, d: 50 };
    const kdjK = stoch.k ?? 50;
    const kdjD = stoch.d ?? 50;
    const kdjJ = 3 * kdjK - 2 * kdjD;

    let kdjSignal = '中性';
    if (stoch.k && stoch.d && prevStoch.k && prevStoch.d) {
        if (kdjK > kdjD && prevStoch.k <= prevStoch.d) {
            kdjSignal = '金叉';
        } else if (kdjK < kdjD && prevStoch.k >= prevStoch.d) {
            kdjSignal = '死叉';
        } else if (kdjJ > 50) {
            kdjSignal = '强势';
        } else {
            kdjSignal = '弱势';
        }
    }

    const volAvg5 = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5;
    const volAvg20 = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const volRatio = latest.volume / (volAvg20 || latest.volume);
    let volStatus = '正常';
    if (volRatio < 0.8) volStatus = '缩量';
    else if (volRatio > 1.5) volStatus = '放量';

    let score = 0;
    if (maArrangement === '短期多头' || (lastMA5 > lastMA10 && lastMA10 > lastMA20)) score += 20;
    else if (lastMA5 > lastMA10) score += 10;
    
    if (macdSignal === '金叉') score += 15;
    else if (macdSignal === '红柱' && macd.histogram > prevMacd.histogram) score += 10;
    
    if (rsiValue > 65 && rsiValue < 80) score += 20;
    else if (rsiValue > 50 && rsiValue <= 65) score += 15;
    else if (rsiValue < 30) score += 10;
    
    if (kdjSignal === '金叉') score += 15;
    else if (kdjJ > 50) score += 10;
    
    if (volStatus === '放量' && latest.close > latest.open) score += 15;
    else if (volStatus === '放量') score += 10;

    score = Math.min(100, Math.max(0, score));

    const signals: string[] = [];
    if (lastMA5 > lastMA10 && lastMA10 > lastMA20) signals.push('✅ 均线多头排列');
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

    const sellSignals: string[] = [];
    let sellScore = 0;
    
    if (lastMA5 < lastMA10) {
        sellSignals.push('❌ MA5 < MA10');
        sellScore -= 15;
    }
    
    if (macdSignal === '死叉') {
        sellSignals.push('❌ MACD 死叉');
        sellScore -= 15;
    } else if (macdSignal === '绿柱') {
        sellSignals.push('❌ MACD 绿柱');
        sellScore -= 10;
    }
    
    if (rsiValue < 50) {
        sellSignals.push('❌ RSI < 50');
        sellScore -= 10;
    }
    
    if (volStatus === '缩量') {
        sellSignals.push('❌ 缩量');
        sellScore -= 10;
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
            dif: macd.MACD ?? 0,
            dea: macd.signal ?? 0,
            histogram: macd.histogram ?? 0,
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
 * 自动检测启动日
 */
function detectLaunchDay(klines: KlineData[]): string | null {
    const minDays = 20;
    
    for (let i = minDays; i < klines.length; i++) {
        const today = klines[i];
        const prev20Days = klines.slice(Math.max(0, i - 20), i);
        
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

async function main() {
    console.log('╔════════════════════════════════════════════════════════════════════════════╗');
    console.log('║   AI应用板块股票分析                                      ║');
    console.log('║   股票代码: 980112 (港股)                                   ║');
    console.log('╚═════════════════════════════════════════════════════════════════════════╝\n');

    const symbol = '980112';
    const lookbackDays = 365;

    console.log('📡 获取历史数据...');
    let klines: KlineData[];
    try {
        klines = await akshare.getStockHistory(symbol, 'daily', lookbackDays);
        console.log(`✅ 获取到 ${klines.length} 个交易日数据\n`);
    } catch (e) {
        console.log(`❌ 获取数据失败: ${e}`);
        return;
    }

    if (klines.length < 30) {
        console.log(`⚠️  数据不足（${klines.length}天），无法进行完整分析`);
        return;
    }

    const latest = klines[klines.length - 1];
    const closes = klines.map(k => k.close);
    const highs = klines.map(k => k.high);
    const lows = klines.map(k => k.low);
    const volumes = klines.map(k => k.volume);

    console.log('📊 最新行情');
    console.log(`   日期: ${latest.date}`);
    console.log(`   收盘价: ${latest.close.toFixed(2)}港元`);
    console.log(`   涨跌幅: ${((latest.close - latest.open) / latest.open * 100).toFixed(2)}%`);
    console.log('');

    console.log('🔍 检测启动日...');
    const launchDate = detectLaunchDay(klines);
    if (launchDate) {
        const launchIdx = klines.findIndex(k => k.date === launchDate);
        const launchPrice = klines[launchIdx].close;
        const gainToNow = ((latest.close - launchPrice) / launchPrice * 100);
        
        console.log(`✅ 发现启动日: ${launchDate}`);
        console.log(`   启动价格: ${launchPrice.toFixed(2)}港元`);
        console.log(`   启动后涨幅: ${gainToNow.toFixed(2)}%`);
        console.log(`   持有天数: ${klines.length - launchIdx}天\n`);
    } else {
        console.log(`❌ 未发现明显的启动日`);
        console.log(`   股票可能处于震荡期或缓慢上涨期\n`);
    }

    console.log('📈 技术指标分析...\n');

    const indicators = calculateIndicators(latest, closes, highs, lows, volumes);

    console.log('均线系统:');
    console.log(`   MA5: ${indicators.ma5.toFixed(2)}港元`);
    console.log(`   MA10: ${indicators.ma10.toFixed(2)}港元`);
    console.log(`   MA20: ${indicators.ma20.toFixed(2)}港元`);
    if (indicators.ma60 > 0) {
        console.log(`   MA60: ${indicators.ma60.toFixed(2)}港元`);
    }
    console.log(`   排列: ${indicators.maArrangement}`);
    console.log('');

    console.log('MACD指标:');
    console.log(`   DIF: ${indicators.macd.dif.toFixed(4)`);
    console.log(`   DEA: ${indicators.macd.dea.toFixed(4)}`);
    console.log(`   柱状图: ${indicators.macd.histogram.toFixed(4)}`);
    console.log(`   信号: ${indicators.macd.signal}`);
    console.log('');

    console.log('RSI指标:');
    console.log(`   值: ${indicators.rsi.value.toFixed(1)}`);
    console.log(`   信号: ${indicators.rsi.signal}`);
    console.log('');

    console.log('KDJ指标:');
    console.log(`   K: ${indicators.kdj.k.toFixed(1)}`);
    console.log(`   D: ${indicators.kdj.d.toFixed(1)}`);
    console.log(`   J: ${indicators.kdj.j.toFixed(1)}`);
    console.log(`   信号: ${indicators.kdj.signal}`);
    console.log('');

    console.log('成交量:');
    console.log(`   量比: ${indicators.volume.ratio.toFixed(2)}x`);
    console.log(`   状态: ${indicators.volume.status}`);
    console.log('');

    console.log('🎯 综合评分');
    console.log(`   买入得分: ${indicators.gaugeScore}/100`);
    console.log(`   卖出扣分: ${indicators.sellSignals.length > 0 ? indicators.sellSignals.length * -10 : 0}`);
    console.log(`   综合得分: ${indicators.totalScore}/100`);
    console.log('');

    console.log('📋 信号列表:');
    if (indicators.signals.length > 0) {
        indicators.signals.forEach(s => console.log(`  ${s}`));
    } else {
        console.log('  无买入信号');
    }
    console.log('');

    if (indicators.sellSignals.length > 0) {
        console.log('🚨 卖出信号:');
        indicators.sellSignals.forEach(s => console.log(`  ${s}`));
        console.log('');
    }

    console.log('💡 投资建议:\n');

    const strength = indicators.totalScore >= 70 ? '强烈' : 
                   indicators.totalScore >= 50 ? '明显' :
                   indicators.totalScore >= 30 ? '一般' : '微弱';

    if (indicators.totalScore >= 50) {
        console.log(`   【强烈建议】`);
        console.log(`   ✅ 综合评分 ${indicators.totalScore}/100，信号强度：${strength}`);
        console.log(`   ✅ 均线${indicators.maArrangement}，趋势向上`);
        console.log(`   ✅ MACD ${indicators.macd.signal}，动能${indicators.macd.histogram > 0 ? '向上' : '向下'}`);
        console.log(`   ✅ RSI ${indicators.rsi.signal}，处于${indicators.rsi.value > 60 ? '强势区' : '弱势区'}`);
        console.log(`   ✅ 成交量${indicators.volume.status}，资金${indicators.volume.ratio > 1.5 ? '积极' : '正常'}介入`);
        console.log('');
        console.log(`   📌 操作建议:`);
        console.log(`      1. 可以分批建仓，建议仓位: ${(indicators.totalScore / 100 * 30).toFixed(0)}%`);
        console.log(`      2. 设置止损位: ${latest.close * 0.9.toFixed(2)}港元 (-10%)`);
        console.log(`      3. 目标位: ${latest.close * 1.2.toFixed(2)}港元 (+20%)`);
        console.log(`      4. 如果评分降到30以下或跌破止损位，及时减仓`);
        console.log('');
    } else if (indicators.totalScore >= 30) {
        console.log(`   【观察建议】`);
        console.log(`   ⚠️  综合评分 ${indicators.totalScore}/100，信号强度：${strength}`);
        console.log(`   ⚠️ 均线${indicators.maArrangement}，需进一步观察`);
        console.log(`   ⚠️ MACD ${indicators.macd.signal}，动能${indicators.macd.histogram > 0 ? '向上' : '向下'}`);
        console.log(`   ⚠️ RSI ${indicators.rsi.signal}，处于${indicators.rsi.value > 60 ? '强势区' : '弱势区'}`);
        console.log(`   ⚠️ 成交量${indicators.volume.status}`);
        console.log('');
        console.log(`   📌 操作建议:`);
        console.log(`      1. 小仓位试探性建仓，建议仓位: ${(indicators.totalScore / 100 * 15).toFixed(0)}%`);
        console.log(`      2. 设置严格止损: ${latest.close * 0.95.toFixed(2)}港元 (-5%)`);
        console.log(`      3. 等待确认信号后再加仓`);
        console.log('');
    } else {
        console.log(`   【观望建议】`);
        console.log(`   ❌ 综合评分 ${indicators.totalScore}/100，信号强度：${strength}`);
        console.log(`   ❌ 缺少明确的买入信号`);
        console.log(`   ❌ 均线${indicators.maArrangement}`);
        console.log(`   ❌ MACD ${indicators.macd.signal}`);
        console.log(`   ❌ RSI ${indicators.rsi.signal}`);
        console.log(`   ❌ 成交量${indicators.volume.status}`);
        console.log('');
        console.log(`   📌 操作建议:`);
        console.log(`      1. 暂时观望，等待更明确的信号`);
        console.log(`      2. 可以设置价格提醒，关注关键点位突破`);
        console.log(`      3. 不要盲目追高`);
    }

    if (launchDate) {
        console.log('📈 启动后走势分析:\n');
        console.log(`   从启动日 ${launchDate} 到现在的走势分析:`);
        console.log(`   - 涨幅: ${((latest.close - klines[klines.findIndex(k => k.date === launchDate)].close) / klines[klines.findIndex(k => k.date === launchDate)].close * 100).toFixed(2)}%`);
        console.log(`   - 持有天数: ${klines.length - klines.findIndex(k => k.date === launchDate)}天`);
        console.log(`   - 技术面${indicators.totalScore >= 50 ? '支撑' : '背离'}启动信号`);
    }

    console.log('\n' + '═'.repeat(66));
    console.log(`⚠️  风险提示:\n`);
    console.log(`1. 港股风险:\n`);
    console.log(`   - 汇率波动风险: 港股受汇率和外资流动影响较大`);
    console.log(`   - 政策风险: 监管政策变化可能对AI应用板块产生较大影响`);
    console.log(`   - 流动性风险: AI应用概念股波动性较高，注意仓位控制`);
    console.log(`\n2. 板块风险:\n`);
    console.log(`   - 板块轮动风险: AI应用板块涨幅较大，需关注板块轮动`);
    console.log(`   - 估值风险: 高涨幅后估值回归压力增大`);
    console.log(`   - 情绪风险: 市场情绪变化可能导致快速回调`);
    console.log(`\n3. 风控建议:\n`);
    console.log(`   - 分散投资: 不要全仓单一股票`);
    console.log(`   - 严格止损: 设置止损线并严格执行`);
    console.log(`   - 动态调整: 根据技术信号及时调仓`);
    console.log(`   - 不要追涨: 避免在高位全仓买入`);
    console.log('\n' + '═'.repeat(66) + '\n');
}

main().catch(console.error);
