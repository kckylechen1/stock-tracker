/**
 * AI应用板块股票分析 - 简化版
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

async function analyzeStock(symbol: string) {
    console.log('╔════════════════════════════════════════════════════════════════════════════╗');
    console.log(`║   AI应用板块股票分析                                       ║`);
    console.log(`║   股票代码: ${symbol} (港股)                                    ║`);
    console.log('╚═══════════════════════════════════════════════════════════════════════╝\n');

    console.log('📡 获取历史数据...');
    let klines: KlineData[] = [];
    try {
        klines = await akshare.getStockHistory(symbol, 'daily', 365);
        console.log(`✅ 获取到 ${klines.length} 个交易日数据\n`);
    } catch (e: any) {
        console.log(`❌ 获取数据失败: ${e}`);
        return;
    }

    if (klines.length < 20) {
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

    console.log('📈 技术指标分析...\n');

    // MA5, MA10, MA20
    let ma5 = 0, ma10 = 0, ma20 = 0;
    try {
        const ma5Result = SMA.calculate({ values: closes, period: 5 });
        const ma10Result = SMA.calculate({ values: closes, period: 10 });
        const ma20Result = SMA.calculate({ values: closes, period: 20 });
        if (ma5Result.length > 0) ma5 = ma5Result[ma5Result.length - 1] || latest.close;
        if (ma10Result.length > 0) ma10 = ma10Result[ma10Result.length - 1] || latest.close;
        if (ma20Result.length > 0) ma20 = ma20Result[ma20Result.length - 1] || latest.close;
    } catch (e) {
        console.log(`   ⚠️ 均线计算失败: ${e}`);
    }

    let maArrangement = '盘整';
    if (ma5 > ma10 && ma10 > ma20) maArrangement = '多头排列';
    else if (ma5 < ma10 && ma10 < ma20) maArrangement = '空头排列';
    else if (ma5 > ma10) maArrangement = 'MA5 > MA10';

    console.log('均线系统:');
    console.log(`   MA5: ${ma5.toFixed(2)}港元`);
    console.log(`   MA10: ${ma10.toFixed(2)}港元`);
    console.log(`   MA20: ${ma20.toFixed(2)}港元`);
    console.log(`   排列: ${maArrangement}`);
    console.log('');

    // MACD
    let macdDif = 0, macdDea = 0, macdHist = 0, macdSignal = '中性';
    let prevMacdHist = 0;
    try {
        const macdResult = MACD.calculate({
            values: closes,
            fastPeriod: 12,
            slowPeriod: 26,
            signalPeriod: 9,
        });
        if (macdResult.length > 0) {
            const current = macdResult[macdResult.length - 1];
            const previous = macdResult[macdResult.length - 2];
            macdDif = current.MACD || 0;
            macdDea = current.signal || 0;
            macdHist = current.histogram || 0;
            if (previous) {
                prevMacdHist = previous.histogram || 0;
            }
            if (macdHist > 0 && prevMacdHist <= 0) macdSignal = '金叉';
            else if (macdHist < 0 && prevMacdHist >= 0) macdSignal = '死叉';
            else if (macdHist > 0) macdSignal = '红柱';
            else macdSignal = '绿柱';
        }
    } catch (e) {
        console.log(`   ⚠️ MACD计算失败: ${e}`);
    }

    console.log('MACD指标:');
    console.log(`   DIF: ${macdDif.toFixed(4)}`);
    console.log(`   DEA: ${macdDea.toFixed(4)}`);
    console.log(`   柱状图: ${macdHist.toFixed(4)}`);
    console.log(`   信号: ${macdSignal}`);
    console.log('');

    // RSI
    let rsiValue = 50, rsiSignal = '中性';
    try {
        const rsiResult = RSI.calculate({
            values: closes,
            period: 14,
        });
        if (rsiResult.length > 0) {
            rsiValue = rsiResult[rsiResult.length - 1] || 50;
        }
    } catch (e) {
        console.log(`   ⚠️ RSI计算失败: ${e}`);
    }

    if (rsiValue > 80) rsiSignal = '超买';
    else if (rsiValue > 65) rsiSignal = '强势';
    else if (rsiValue > 50) rsiSignal = '偏强';
    else if (rsiValue < 30) rsiSignal = '超卖';
    else rsiSignal = '偏弱';

    console.log('RSI指标:');
    console.log(`   值: ${rsiValue.toFixed(1)}`);
    console.log(`   信号: ${rsiSignal}`);
    console.log('');

    // KDJ
    let kdjK = 50, kdjD = 50, kdjJ = 50, kdjSignal = '中性';
    let prevKdjK = 50, prevKdjD = 50;
    try {
        const stochResult = Stochastic.calculate({
            high: highs,
            low: lows,
            close: closes,
            period: 9,
            signalPeriod: 3,
        });
        if (stochResult.length > 0) {
            const current = stochResult[stochResult.length - 1];
            const previous = stochResult[stochResult.length - 2];
            kdjK = current.k || 50;
            kdjD = current.d || 50;
            kdjJ = kdjK * 3 - kdjD * 2;
            if (previous) {
                prevKdjK = previous.k || 50;
                prevKdjD = previous.d || 50;
            }
            if (kdjK > kdjD && prevKdjK <= prevKdjD) kdjSignal = '金叉';
            else if (kdjK < kdjD && prevKdjK >= prevKdjD) kdjSignal = '死叉';
            else if (kdjJ > 50) kdjSignal = '强势';
            else kdjSignal = '弱势';
        }
    } catch (e) {
        console.log(`   ⚠️ KDJ计算失败: ${e}`);
    }

    console.log('KDJ指标:');
    console.log(`   K: ${kdjK.toFixed(1)}`);
    console.log(`   D: ${kdjD.toFixed(1)}`);
    console.log(`   J: ${kdjJ.toFixed(1)}`);
    console.log(`   信号: ${kdjSignal}`);
    console.log('');

    // 成交量
    const volAvg20 = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const volRatio = latest.volume / (volAvg20 || latest.volume);
    let volStatus = '正常';
    if (volRatio < 0.8) volStatus = '缩量';
    else if (volRatio > 1.5) volStatus = '放量';

    console.log('成交量:');
    console.log(`   量比: ${volRatio.toFixed(2)}x`);
    console.log(`   状态: ${volStatus}`);
    console.log('');

    // 评分
    let score = 0;
    if (maArrangement === '多头排列') score += 20;
    else if (ma5 > ma10) score += 10;
    if (macdSignal === '金叉') score += 15;
    else if (macdSignal === '红柱') score += 10;
    if (rsiValue > 65 && rsiValue < 80) score += 20;
    else if (rsiValue > 50 && rsiValue <= 65) score += 15;
    else if (rsiValue < 30) score += 10;
    if (kdjSignal === '金叉') score += 15;
    else if (kdjJ > 50) score += 10;
    if (volStatus === '放量' && latest.close > latest.open) score += 15;
    else if (volStatus === '放量') score += 10;

    // 卖出信号
    const sellSignals: string[] = [];
    let sellScore = 0;
    
    if (ma5 < ma10) {
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

    // 信号列表
    const signals: string[] = [];
    if (ma5 > ma10 && ma10 > ma20) signals.push('✅ 均线多头排列');
    else if (ma5 > ma10) signals.push('✅ MA5 > MA10');
    if (macdSignal === '金叉') signals.push('✅ MACD 金叉');
    else if (macdSignal === '红柱') signals.push('✅ MACD 红柱');
    if (rsiValue > 65 && rsiValue < 80) signals.push('✅ RSI 强势');
    else if (rsiValue > 50 && rsiValue <= 65) signals.push('✅ RSI 偏强');
    if (kdjSignal === '金叉') signals.push('✅ KDJ 金叉');
    else if (kdjJ > 50) signals.push('✅ KDJ J > 50');
    if (volStatus === '放量' && latest.close > latest.open) signals.push('✅ 放量上涨');
    else if (volStatus === '放量') signals.push('⚠️ 放量下跌');

    console.log('🎯 综合评分');
    console.log(`   买入得分: ${score}/100`);
    if (sellSignals.length > 0) {
        console.log(`   卖出扣分: ${sellScore}`);
        console.log(`   综合得分: ${totalScore}/100`);
    } else {
        console.log(`   综合得分: ${totalScore}/100`);
    }
    console.log('');

    console.log('📋 信号列表:');
    if (signals.length > 0) {
        signals.forEach(s => console.log(`  ${s}`));
    } else {
        console.log('  无买入信号');
    }
    console.log('');

    if (sellSignals.length > 0) {
        console.log('🚨 卖出信号:');
        sellSignals.forEach(s => console.log(`  ${s}`));
        console.log('');
    }

    console.log('💡 投资建议:\n');

    const strength = totalScore >= 70 ? '强烈' : 
                   totalScore >= 50 ? '明显' :
                   totalScore >= 30 ? '一般' : '微弱';

    if (totalScore >= 50) {
        console.log(`   【强烈建议】`);
        console.log(`   ✅ 综合评分 ${totalScore}/100，信号强度：${strength}`);
        console.log(`   ✅ 均线${maArrangement}，趋势向上`);
        console.log(`   ✅ MACD ${macdSignal}，动能${macdHist > 0 ? '向上' : '向下'}`);
        console.log(`   ✅ RSI ${rsiSignal}，处于${rsiValue > 60 ? '强势区' : '弱势区'}`);
        console.log(`   ✅ 成交量${volStatus}，资金${volRatio > 1.5 ? '积极' : '正常'}介入`);
        console.log('');
        console.log(`   📌 操作建议:`);
        console.log(`      1. 可以分批建仓，建议仓位: ${(totalScore / 100 * 30).toFixed(0)}%`);
        console.log(`      2. 设置止损位: ${latest.close * 0.9.toFixed(2)}港元 (-10%)`);
        console.log(`      3. 目标位: ${latest.close * 1.2.toFixed(2)}港元 (+20%)`);
        console.log(`      4. 如果评分降到30以下或跌破止损位，及时减仓`);
        console.log('');
    } else if (totalScore >= 30) {
        console.log(`   【观察建议】`);
        console.log(`   ⚠️  综合评分 ${totalScore}/100，信号强度：${strength}`);
        console.log(`   ⚠️ 均线${maArrangement}，需进一步观察`);
        console.log(`   ⚠️ MACD ${macdSignal}，动能${macdHist > 0 ? '向上' : '向下'}`);
        console.log(`   ⚠️ RSI ${rsiSignal}，处于${rsiValue > 60 ? '强势区' : '弱势区'}`);
        console.log(`   ⚠️ 成交量${volStatus}`);
        console.log('');
        console.log(`   📌 操作建议:`);
        console.log(`      1. 小仓位试探性建仓，建议仓位: ${(totalScore / 100 * 15).toFixed(0)}%`);
        console.log(`      2. 设置严格止损: ${latest.close * 0.95.toFixed(2)}港元 (-5%)`);
        console.log(`      3. 等待确认信号后再加仓`);
        console.log('');
    } else {
        console.log(`   【观望建议】`);
        console.log(`   ❌ 综合评分 ${totalScore}/100，信号强度：${strength}`);
        console.log(`   ❌ 缺少明确的买入信号`);
        console.log(`   ❌ 均线${maArrangement}`);
        console.log(`   ❌ MACD ${macdSignal}`);
        console.log(`   ❌ RSI ${rsiSignal}`);
        console.log(`   ❌ 成交量${volStatus}`);
        console.log('');
        console.log(`   📌 操作建议:`);
        console.log(`      1. 暂时观望，等待更明确的信号`);
        console.log(`      2. 可以设置价格提醒，关注关键点位突破`);
        console.log(`      3. 不要盲目追高`);
    }

    console.log('\n' + '═'.repeat(66));
    console.log('⚠️  风险提示:\n');
    console.log('1. 港股风险:\n');
    console.log(`   - 汇率波动风险: 港股受汇率和外资流动影响较大`);
    console.log(`   - 政策风险: 港股监管政策可能与A股不同`);
    console.log('   - 流动性风险: 港股流动性可能不足`);
    console.log('2. 板块风险:\n');
    console.log(`   - 板块轮动风险: AI应用板块涨幅较大，需关注板块轮动`);
    console.log(`   - 估值回归风险: 高涨幅后估值回归压力增大`);
    console.log(`   - 情绪风险: 市场情绪变化可能导致快速回调`);
    console.log('3. 个股风险:\n');
    console.log(`   - 技术面风险: ${maArrangement !== '多头排列' ? '均线趋势不明朗' : '均线趋势向上但需持续关注'}`);
    console.log(`   - 基本面风险: 未进行基本面分析，需要关注公司财报和公告`);
    console.log(`   - 消息面风险: 注意公司公告和行业新闻`);
    console.log(`\n4. 风控建议:\n`);
    console.log(`   - 分散投资: 不要全仓单一股票`);
    console.log(`   - 严格止损: 设置止损线并严格执行`);
    console.log(`   - 动态调整: 根据技术信号及时调仓`);
    console.log(`   - 不要追涨: 避免在高位全仓买入`);
    console.log('\n' + '═'.repeat(66) + '\n');
}

analyzeStock('980112').catch(console.error);
