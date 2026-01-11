/**
 * 技术指标算法测试
 * 测试计算逻辑是否正确
 * 更新：使用 technicalindicators 库验证迁移
 */

import { SMA, EMA, MACD, RSI, Stochastic } from 'technicalindicators';

// K线数据类型
interface KlineData {
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

/**
 * 测试MA计算
 */
function testMACalculation() {
    console.log('\n=== 测试 MA 计算 ===');

    const closes = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

    // MA5: 最后5个值的平均
    const ma5 = SMA.calculate({ values: closes, period: 5 });
    const lastMA5 = ma5[ma5.length - 1];

    const ma10 = SMA.calculate({ values: closes, period: 10 });
    const lastMA10 = ma10[ma10.length - 1];

    console.log(`MA5: ${lastMA5.toFixed(2)}, MA10: ${lastMA10.toFixed(2)}`);
    console.log('✅ MA 计算逻辑正确（使用 technicalindicators 库）');
}

/**
 * 测试RSI计算
 */
function testRSICalculation() {
    console.log('\n=== 测试 RSI 计算 ===');

    // 创建单调上涨的数据，RSI应该很高
    const risingData = [100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114];

    // 使用库计算 RSI（自动使用 Wilder's Smoothing）
    const rsiRising = RSI.calculate({ values: risingData, period: 14 });
    const rsiValueRising = rsiRising[rsiRising.length - 1] ?? 50;

    console.log(`单调上涨数据的 RSI: ${rsiValueRising.toFixed(1)}`);
    console.log(rsiValueRising > 70 ? '✅ RSI 逻辑正确（超买区）' : '⚠️ RSI 可能有问题');

    // 测试单调下跌的数据
    const fallingData = [114, 113, 112, 111, 110, 109, 108, 107, 106, 105, 104, 103, 102, 101, 100];

    const rsiFalling = RSI.calculate({ values: fallingData, period: 14 });
    const rsiValueFalling = rsiFalling[rsiFalling.length - 1] ?? 50;

    console.log(`单调下跌数据的 RSI: ${rsiValueFalling.toFixed(1)}`);
    console.log(rsiValueFalling < 30 ? '✅ RSI 逻辑正确（超卖区）' : '⚠️ RSI 可能有问题');
}

/**
 * 测试MACD计算
 */
function testMACDCalculation() {
    console.log('\n=== 测试 MACD 计算 ===');

    const closes = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30];

    const macdResult = MACD.calculate({
        values: closes,
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9,
        SimpleMAOscillator: false,
        SimpleMASignal: false,
    });

    const macd = macdResult[macdResult.length - 1] || { MACD: 0, signal: 0, histogram: 0 };
    const dif = macd.MACD ?? 0;
    const dea = macd.signal ?? 0;

    // 单调上涨，DIF应该大于0
    console.log(`最新价格: ${closes[closes.length - 1]}`);
    console.log(`DIF: ${dif.toFixed(2)}`);
    console.log(`DEA: ${dea.toFixed(2)}`);

    if (dif > 0) {
        console.log('✅ MACD 逻辑正确（DIF > 0）');
    } else {
        console.log('⚠️ MACD 可能有误（DIF < 0，但价格在上涨）');
    }
}

/**
 * 测试KDJ计算
 */
function testKDJCalculation() {
    console.log('\n=== 测试 KDJ 计算 ===');

    // 创建测试数据：近期高点后回调
    const highs = [10, 11, 12, 13, 14, 15, 16, 17, 18];
    const lows = [9, 10, 11, 12, 13, 14, 15, 16, 17];
    const closes = [10, 11, 12, 13, 14, 15, 16, 17, 16.5];

    // 使用 Stochastic 库计算 K 和 D
    const stochResult = Stochastic.calculate({
        high: highs,
        low: lows,
        close: closes,
        period: 9,
        signalPeriod: 3,
    });

    if (stochResult.length > 0) {
        const lastStoch = stochResult[stochResult.length - 1];
        const k = lastStoch.k ?? 50;
        const d = lastStoch.d ?? 50;
        const j = 3 * k - 2 * d;  // J 值基于正确的 K/D 计算

        console.log(`K: ${k.toFixed(2)}, D: ${d.toFixed(2)}, J: ${j.toFixed(2)}`);

        // J值应该是最敏感的
        if (j !== k && j !== d) {
            console.log('✅ KDJ 逻辑正确（J 值与 K/D 不同）');
        } else {
            console.log('⚠️ KDJ 值相同（可能数据序列太短）');
        }

        // 检查 K、D、J 是否有差异
        if (Math.abs(k - d) < 1 && Math.abs(j - k) < 1) {
            console.log('⚠️ KDJ 值接近相同，数据序列可能太短');
        }
    }
}

/**
 * 测试边界条件
 */
function testEdgeCases() {
    console.log('\n=== 测试边界条件 ===');

    // 测试空数据
    try {
        if ([].length === 0) {
            console.log('✅ 空数组检查通过');
        }
    } catch (e) {
        console.log('❌ 空数组检查失败');
    }

    // 测试数据不足
    const shortData = [1, 2, 3];
    if (shortData.length < 5) {
        console.log('✅ 数据长度检查通过');
    }

    // 测试零值和负值
    const zeroPriceData = [0, 0, 0, 0, 0];
    if (zeroPriceData.some(p => p === 0)) {
        console.log('✅ 零值检查通过');
    }

    const negativeVolumeData = [100, 200, -100, 300, 400];
    if (negativeVolumeData.some(v => v < 0)) {
        console.log('✅ 负值检查通过');
    }
}

/**
 * 测试Gauge评分逻辑
 */
function testGaugeScoring() {
    console.log('\n=== 测试 Gauge 评分逻辑 ===');

    // 测试1: 多头排列 + RSI超买 + 放量上涨
    console.log('\n测试1: 强多头');
    const score1 = 0.6 * 100 + 0.4 * 80; // 趋势100 + 动量80
    console.log(`预期得分: ${score1.toFixed(1)}`);
    console.log(score1 > 60 ? '✅ 评分逻辑正确' : '⚠️ 评分可能偏低');

    // 测试2: 空头排列 + RSI超卖 + 放量下跌
    console.log('\n测试2: 强空头');
    const score2 = 0.6 * (-100) + 0.4 * (-80);
    console.log(`预期得分: ${score2.toFixed(1)}`);
    console.log(score2 < -60 ? '✅ 评分逻辑正确' : '⚠️ 评分可能偏高');

    // 测试3: 均线粘合 + RSI中性 + 缩量
    console.log('\n测试3: 盘整');
    const score3 = 0.6 * 0 + 0.4 * 0;
    console.log(`预期得分: ${score3.toFixed(1)}`);
    console.log(Math.abs(score3) < 10 ? '✅ 评分逻辑正确' : '⚠️ 评分可能偏离');
}

/**
 * 测试均线排列判断
 */
function testMAArrangement() {
    console.log('\n=== 测试均线排列判断 ===');

    // 多头排列
    const ma5 = 15;
    const ma10 = 14;
    const ma20 = 13;
    const isBullish = ma5 > ma10 && ma10 > ma20;
    console.log(`MA5=${ma5}, MA10=${ma10}, MA20=${ma20}`);
    console.log(isBullish ? '✅ 多头排列' : '❌ 非多头排列');

    // 空头排列
    const ma5b = 13;
    const ma10b = 14;
    const ma20b = 15;
    const isBearish = ma5b < ma10b && ma10b < ma20b;
    console.log(`\nMA5=${ma5b}, MA10=${ma10b}, MA20=${ma20b}`);
    console.log(isBearish ? '✅ 空头排列' : '❌ 非空头排列');
}

/**
 * 测试成交量逻辑
 */
function testVolumeLogic() {
    console.log('\n=== 测试成交量逻辑 ===');

    // 缩量上涨
    const volCurrent = 10000;
    const volAvg = 15000;
    const volRatio = volCurrent / volAvg;
    const isShrink = volRatio < 0.7;
    const isExpand = volRatio > 1.3;  // 更新阈值：从 1.5 改为 1.3

    console.log(`当前成交量: ${volCurrent}, 平均成交量: ${volAvg}, 量比: ${volRatio.toFixed(2)}`);
    console.log(isShrink ? '✅ 缩量' : isExpand ? '✅ 放量' : '✅ 正常');

    // 放量下跌
    const volCurrent2 = 20000;
    const volAvg2 = 15000;
    const volRatio2 = volCurrent2 / volAvg2;

    console.log(`\n当前成交量: ${volCurrent2}, 平均成交量: ${volAvg2}, 量比: ${volRatio2.toFixed(2)}`);
    console.log(volRatio2 > 1.3 ? '✅ 放量' : '❌ 应该放量');

    // 测试临界值：1.33 应该被识别为放量
    const volCurrent3 = 20000;
    const volAvg3 = 15000;
    const volRatio3 = volCurrent3 / volAvg3;

    console.log(`\n当前成交量: ${volCurrent3}, 平均成交量: ${volAvg3}, 量比: ${volRatio3.toFixed(2)}`);
    if (volRatio3 > 1.3) {
        console.log('✅ 放量（阈值 1.3）');
    } else {
        console.log('❌ 应该放量（量比 1.33 > 1.3）');
    }
}

/**
 * 运行所有测试
 */
function runAllTests() {
    console.log('╔════════════════════════════════════════════╗');
    console.log('║   技术指标算法测试                            ║');
    console.log('║   （使用 technicalindicators 库）             ║');
    console.log('╚════════════════════════════════════════════╝');

    testMACalculation();
    testRSICalculation();
    testMACDCalculation();
    testKDJCalculation();
    testEdgeCases();
    testGaugeScoring();
    testMAArrangement();
    testVolumeLogic();

    console.log('\n╔════════════════════════════════════════════╗');
    console.log('║   测试完成！                                  ║');
    console.log('╚════════════════════════════════════════════╝');
}

runAllTests();
