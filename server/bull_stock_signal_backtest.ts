/**
 * 牛股信号回测验证
 * 测试前期涨幅很好的股票在启动前是否能被信号捕捉
 * 目标：发现牛股信号，用于发现和持有牛股
 */

import * as akshare from "./akshare";
import { SMA, RSI, MACD, Stochastic } from "technicalindicators";

interface KlineData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
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

interface SignalAnalysis {
  symbol: string;
  name: string;
  startDate: string;
  endDate: string;
  startPrice: number;
  endPrice: number;
  totalGain: number;

  // 启动前
  preLaunch: IndicatorResult;

  // 启动当天
  launchDay: IndicatorResult;

  // 启动后1天
  dayAfterLaunch: IndicatorResult;

  // 信号评估
  evaluation: {
    preLaunch: {
      maSignal: boolean;
      macdSignal: boolean;
      rsiSignal: boolean;
      kdjSignal: boolean;
      volumeSignal: boolean;
      overallSignal: boolean;
      strength: string;
      gaugeScore: number;
    };
    launchDay: {
      maSignal: boolean;
      macdSignal: boolean;
      rsiSignal: boolean;
      kdjSignal: boolean;
      volumeSignal: boolean;
      overallSignal: boolean;
      strength: string;
      gaugeScore: number;
    };
    dayAfterLaunch: {
      maSignal: boolean;
      macdSignal: boolean;
      rsiSignal: boolean;
      kdjSignal: boolean;
      volumeSignal: boolean;
      overallSignal: boolean;
      strength: string;
      gaugeScore: number;
    };
  };
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
  // 1. 均线系统
  const ma5 = SMA.calculate({ values: closes, period: 5 });
  const ma10 = SMA.calculate({ values: closes, period: 10 });
  const ma20 = SMA.calculate({ values: closes, period: 20 });
  const ma60 = SMA.calculate({ values: closes, period: 60 });

  const lastMA5 = ma5[ma5.length - 1] ?? latest.close;
  const lastMA10 = ma10[ma10.length - 1] ?? latest.close;
  const lastMA20 = ma20[ma20.length - 1] ?? latest.close;
  const lastMA60 = ma60[ma60.length - 1] ?? latest.close;

  let maArrangement = "盘整";
  if (lastMA5 > lastMA10 && lastMA10 > lastMA20 && lastMA20 > lastMA60) {
    maArrangement = "多头排列";
  } else if (lastMA5 < lastMA10 && lastMA10 < lastMA20 && lastMA20 < lastMA60) {
    maArrangement = "空头排列";
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

  const macd = macdResult[macdResult.length - 1] || {
    MACD: 0,
    signal: 0,
    histogram: 0,
  };
  const prevMacd = macdResult[macdResult.length - 2] || {
    MACD: 0,
    signal: 0,
    histogram: 0,
  };

  let macdSignal = "中性";
  if (macd.histogram > 0 && prevMacd.histogram <= 0) {
    macdSignal = "金叉";
  } else if (macd.histogram < 0 && prevMacd.histogram >= 0) {
    macdSignal = "死叉";
  } else if (macd.histogram > 0) {
    macdSignal = "红柱";
  } else {
    macdSignal = "绿柱";
  }

  // 3. RSI
  const rsiResult = RSI.calculate({
    values: closes,
    period: 14,
  });

  const rsiValue = rsiResult[rsiResult.length - 1] ?? 50;
  let rsiSignal = "中性";
  if (rsiValue > 80) rsiSignal = "超买";
  else if (rsiValue > 65) rsiSignal = "强势";
  else if (rsiValue > 50) rsiSignal = "偏强";
  else if (rsiValue < 30) rsiSignal = "超卖";
  else rsiSignal = "偏弱";

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

  let kdjSignal = "中性";
  if (kdjK > kdjD && prevStoch.k! <= prevStoch.d!) {
    kdjSignal = "金叉";
  } else if (kdjK < kdjD && prevStoch.k! >= prevStoch.d!) {
    kdjSignal = "死叉";
  } else if (kdjJ > 50) {
    kdjSignal = "强势";
  } else {
    kdjSignal = "弱势";
  }

  // 5. 成交量
  const volAvg5 = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5;
  const volAvg20 = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
  const volRatio = latest.volume / volAvg20;
  let volStatus = "正常";
  if (volRatio < 0.7) volStatus = "缩量";
  else if (volRatio > 1.3) volStatus = "放量";

  // 6. Gauge 评分
  let score = 0;

  // 均线信号
  if (maArrangement === "多头排列") score += 20;
  else if (maArrangement === "盘整" && lastMA5 > lastMA10) score += 10;

  // MACD 信号
  if (macdSignal === "金叉") score += 15;
  else if (macdSignal === "红柱" && macd.histogram > prevMacd.histogram)
    score += 10;

  // RSI 信号 - 对于牛股，高RSI可能是强势信号
  if (rsiValue > 65 && rsiValue < 80)
    score += 20; // 强势但不超买
  else if (rsiValue > 50 && rsiValue <= 65)
    score += 15; // 偏强
  else if (rsiValue < 30) score += 10; // 超卖反弹

  // KDJ 信号
  if (kdjSignal === "金叉") score += 15;
  else if (kdjJ > 50) score += 10;

  // 成交量信号
  if (volStatus === "放量" && latest.close > latest.open) score += 15;
  else if (volStatus === "放量") score += 10;

  score = Math.min(100, Math.max(0, score));

  // 生成买入信号列表
  const signals: string[] = [];
  if (maArrangement === "多头排列") signals.push("✅ 均线多头排列");
  else if (lastMA5 > lastMA10) signals.push("✅ MA5 > MA10");

  if (macdSignal === "金叉") signals.push("✅ MACD 金叉");
  else if (macdSignal === "红柱") signals.push("✅ MACD 红柱");

  if (rsiValue > 65 && rsiValue < 80) signals.push("✅ RSI 强势");
  else if (rsiValue > 50 && rsiValue <= 65) signals.push("✅ RSI 偏强");
  else if (rsiValue < 30) signals.push("✅ RSI 超卖");

  if (kdjSignal === "金叉") signals.push("✅ KDJ 金叉");
  else if (kdjJ > 50) signals.push("✅ KDJ J > 50");

  if (volStatus === "放量" && latest.close > latest.open)
    signals.push("✅ 放量上涨");
  else if (volStatus === "放量") signals.push("⚠️ 放量下跌");

  // 生成卖出信号列表
  const sellSignals: string[] = [];
  let sellScore = 0;

  // MA5下穿MA10 → -15分
  if (maArrangement === "空头排列") {
    sellSignals.push("❌ 均线空头排列");
    sellScore -= 15;
  } else if (lastMA5 < lastMA10) {
    sellSignals.push("❌ MA5 < MA10");
    sellScore -= 15;
  }

  // MACD死叉 → -15分
  if (macdSignal === "死叉") {
    sellSignals.push("❌ MACD 死叉");
    sellScore -= 15;
  } else if (macdSignal === "绿柱") {
    sellSignals.push("❌ MACD 绿柱");
    sellScore -= 10;
  }

  // RSI跌破50 → -10分
  if (rsiValue < 50) {
    sellSignals.push("❌ RSI < 50");
    sellScore -= 10;
  }

  // 缩量 → -10分
  if (volStatus === "缩量") {
    sellSignals.push("❌ 缩量");
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
 * 规则：
 * 1. 收盘价突破20日高点3%以上
 * 2. 成交量超过20日均值2倍以上
 * 3. 收盘价涨幅超过5%（大阳线）
 */
function detectLaunchDay(klines: KlineData[], lookback = 60): string | null {
  for (let i = lookback; i < klines.length; i++) {
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
 * 评估信号
 */
function evaluateSignals(score: number, signals: string[]): any {
  const maSignal = signals.some(s => s.includes("均线") || s.includes("MA"));
  const macdSignalFlag = signals.some(s => s.includes("MACD"));
  const rsiSignalFlag = signals.some(s => s.includes("RSI"));
  const kdjSignalFlag = signals.some(s => s.includes("KDJ"));
  const volumeSignalFlag = signals.some(s => s.includes("成交量"));

  const signalCount = [
    maSignal,
    macdSignalFlag,
    rsiSignalFlag,
    kdjSignalFlag,
    volumeSignalFlag,
  ].filter(Boolean).length;

  let strength = "无信号";
  if (signalCount >= 4) strength = "强烈";
  else if (signalCount >= 3) strength = "明显";
  else if (signalCount >= 2) strength = "一般";
  else if (signalCount >= 1) strength = "微弱";

  return {
    maSignal,
    macdSignal: macdSignalFlag,
    rsiSignal: rsiSignalFlag,
    kdjSignal: kdjSignalFlag,
    volumeSignal: volumeSignalFlag,
    overallSignal: signalCount >= 2,
    strength,
    gaugeScore: score,
  };
}

/**
 * 分析某只股票在指定时间点的技术指标
 */
async function analyzeStockAtDate(
  symbol: string,
  targetDate: string,
  lookbackDays: number = 180
): Promise<SignalAnalysis | null> {
  try {
    let stockInfo;
    try {
      stockInfo = await akshare.getStockInfo(symbol);
    } catch (e) {
      console.log(`⚠️ ${symbol}: 获取股票信息失败 - ${e}`);
      return null;
    }
    if (!stockInfo) return null;

    let klines;
    try {
      klines = await akshare.getStockHistory(symbol, "daily", lookbackDays);
    } catch (e) {
      console.log(`⚠️ ${symbol}: 获取历史数据失败 - ${e}`);
      return null;
    }
    if (!klines || klines.length < 60) {
      console.log(
        `⚠️ ${symbol}: 历史数据不足（${klines?.length ?? 0}天，需要60天）`
      );
      return null;
    }

    const targetIdx = klines.findIndex(
      k => k.date === targetDate || k.date.startsWith(targetDate.split("T")[0])
    );
    if (targetIdx < 30) {
      console.log(
        `⚠️ ${symbol}: 目标日期 ${targetDate} 数据不足（需要30天历史）`
      );
      return null;
    }

    // 计算涨幅：从目标日期到最新
    const startData = klines[targetIdx];
    const endData = klines[klines.length - 1];
    const totalGain =
      ((endData.close - startData.close) / startData.close) * 100;

    // 计算启动前的指标（目标日期前2-3天）
    const preLaunchDateIdx = Math.max(30, targetIdx - 3);
    const preLaunchHistory = klines.slice(0, preLaunchDateIdx + 1);
    const preLaunchLatest = preLaunchHistory[preLaunchHistory.length - 1];

    const preCloses = preLaunchHistory.map(k => k.close);
    const preHighs = preLaunchHistory.map(k => k.high);
    const preLows = preLaunchHistory.map(k => k.low);
    const preVolumes = preLaunchHistory.map(k => k.volume);

    // 计算启动当天的指标（目标日期）
    const launchHistory = klines.slice(0, targetIdx + 1);
    const launchLatest = launchHistory[launchHistory.length - 1];

    const launchCloses = launchHistory.map(k => k.close);
    const launchHighs = launchHistory.map(k => k.high);
    const launchLows = launchHistory.map(k => k.low);
    const launchVolumes = launchHistory.map(k => k.volume);

    // 计算启动后1天的指标（目标日期后1天）
    const dayAfterDateIdx = Math.min(klines.length - 1, targetIdx + 1);
    const dayAfterHistory = klines.slice(0, dayAfterDateIdx + 1);
    const dayAfterLatest = dayAfterHistory[dayAfterHistory.length - 1];

    const dayAfterCloses = dayAfterHistory.map(k => k.close);
    const dayAfterHighs = dayAfterHistory.map(k => k.high);
    const dayAfterLows = dayAfterHistory.map(k => k.low);
    const dayAfterVolumes = dayAfterHistory.map(k => k.volume);

    // 计算指标
    const preLaunchAnalysis = calculateIndicators(
      preLaunchLatest,
      preCloses,
      preHighs,
      preLows,
      preVolumes
    );

    const launchDayAnalysis = calculateIndicators(
      launchLatest,
      launchCloses,
      launchHighs,
      launchLows,
      launchVolumes
    );

    const dayAfterAnalysis = calculateIndicators(
      dayAfterLatest,
      dayAfterCloses,
      dayAfterHighs,
      dayAfterLows,
      dayAfterVolumes
    );

    return {
      symbol,
      name: stockInfo.name,
      startDate: startData.date,
      endDate: endData.date,
      startPrice: startData.close,
      endPrice: endData.close,
      totalGain,
      preLaunch: preLaunchAnalysis,
      launchDay: launchDayAnalysis,
      dayAfterLaunch: dayAfterAnalysis,
      evaluation: {
        preLaunch: evaluateSignals(
          preLaunchAnalysis.gaugeScore,
          preLaunchAnalysis.signals
        ),
        launchDay: evaluateSignals(
          launchDayAnalysis.gaugeScore,
          launchDayAnalysis.signals
        ),
        dayAfterLaunch: evaluateSignals(
          dayAfterAnalysis.gaugeScore,
          dayAfterAnalysis.signals
        ),
      },
    };
  } catch (error) {
    console.error(`[analyzeStockAtDate] Error for ${symbol}:`, error);
    return null;
  }
}

/**
 * 格式化分析结果
 */
function formatAnalysis(result: SignalAnalysis): string {
  const {
    symbol,
    name,
    startDate,
    endDate,
    startPrice,
    endPrice,
    totalGain,
    preLaunch,
    launchDay,
    dayAfterLaunch,
    evaluation,
  } = result;

  return `
╔════════════════════════════════════════════════════════════╗
║   ${name}(${symbol}) 牛股信号回测分析                              ║
╚═══════════════════════════════════════════════════════╝

📊 涨幅统计
  起始日期: ${startDate}
  结束日期: ${endDate}
  起始价格: ${startPrice.toFixed(2)}元
  结束价格: ${endPrice.toFixed(2)}元
  总涨幅: ${totalGain > 0 ? "+" : ""}${totalGain.toFixed(2)}%

🔍 启动前指标状态 (${preLaunch.date})

  📈 均线系统
    MA5: ${preLaunch.ma5.toFixed(2)}元
    MA10: ${preLaunch.ma10.toFixed(2)}元
    MA20: ${preLaunch.ma20.toFixed(2)}元
    MA60: ${preLaunch.ma60.toFixed(2)}元
    排列: ${preLaunch.maArrangement}
    信号: ${evaluation.preLaunch.maSignal ? "✅" : "❌"}

  📊 MACD
    DIF: ${preLaunch.macd.dif.toFixed(4)}
    DEA: ${preLaunch.macd.dea.toFixed(4)}
    柱状图: ${preLaunch.macd.histogram.toFixed(4)}
    信号: ${preLaunch.macd.signal}
    信号: ${evaluation.preLaunch.macdSignal ? "✅" : "❌"}

  📈 RSI
    值: ${preLaunch.rsi.value.toFixed(1)}
    信号: ${preLaunch.rsi.signal}
    信号: ${evaluation.preLaunch.rsiSignal ? "✅" : "❌"}

  📈 KDJ
    K: ${preLaunch.kdj.k.toFixed(1)}
    D: ${preLaunch.kdj.d.toFixed(1)}
    J: ${preLaunch.kdj.j.toFixed(1)}
    信号: ${preLaunch.kdj.signal}
    信号: ${evaluation.preLaunch.kdjSignal ? "✅" : "❌"}

  📊 成交量
    量比: ${preLaunch.volume.ratio.toFixed(2)}
    状态: ${preLaunch.volume.status}
    信号: ${evaluation.preLaunch.volumeSignal ? "✅" : "❌"}

  🎯 Gauge 评分
    得分: ${preLaunch.gaugeScore.toFixed(0)}/100
    信号强度: ${evaluation.preLaunch.strength}
    综合评估: ${evaluation.preLaunch.overallSignal ? "✅ 有效信号" : "❌ 无效信号"}

  📋 信号列表
${preLaunch.signals.map(s => `  ${s}`).join("\n")}

🚀 启动当天指标状态 (${launchDay.date})

  📈 均线系统
    MA5: ${launchDay.ma5.toFixed(2)}元
    MA10: ${launchDay.ma10.toFixed(2)}元
    MA20: ${launchDay.ma20.toFixed(2)}元
    MA60: ${launchDay.ma60.toFixed(2)}元
    排列: ${launchDay.maArrangement}
    信号: ${evaluation.launchDay.maSignal ? "✅" : "❌"}

  📊 MACD
    DIF: ${launchDay.macd.dif.toFixed(4)}
    DEA: ${launchDay.macd.dea.toFixed(4)}
    柱状图: ${launchDay.macd.histogram.toFixed(4)}
    信号: ${launchDay.macd.signal}
    信号: ${evaluation.launchDay.macdSignal ? "✅" : "❌"}

  📈 RSI
    值: ${launchDay.rsi.value.toFixed(1)}
    信号: ${launchDay.rsi.signal}
    信号: ${evaluation.launchDay.rsiSignal ? "✅" : "❌"}

  📈 KDJ
    K: ${launchDay.kdj.k.toFixed(1)}
    D: ${launchDay.kdj.d.toFixed(1)}
    J: ${launchDay.kdj.j.toFixed(1)}
    信号: ${launchDay.kdj.signal}
    信号: ${evaluation.launchDay.kdjSignal ? "✅" : "❌"}

  📊 成交量
    量比: ${launchDay.volume.ratio.toFixed(2)}
    状态: ${launchDay.volume.status}
    信号: ${evaluation.launchDay.volumeSignal ? "✅" : "❌"}

  🎯 Gauge 评分
    得分: ${launchDay.gaugeScore.toFixed(0)}/100
    信号强度: ${evaluation.launchDay.strength}
    综合评估: ${evaluation.launchDay.overallSignal ? "✅ 有效信号" : "❌ 无效信号"}

  📋 信号列表
${launchDay.signals.map(s => `  ${s}`).join("\n")}

📈 启动后1天指标状态 (${dayAfterLaunch.date})

  📈 均线系统
    MA5: ${dayAfterLaunch.ma5.toFixed(2)}元
    MA10: ${dayAfterLaunch.ma10.toFixed(2)}元
    MA20: ${dayAfterLaunch.ma20.toFixed(2)}元
    MA60: ${dayAfterLaunch.ma60.toFixed(2)}元
    排列: ${dayAfterLaunch.maArrangement}
    信号: ${evaluation.dayAfterLaunch.maSignal ? "✅" : "❌"}

  📊 MACD
    DIF: ${dayAfterLaunch.macd.dif.toFixed(4)}
    DEA: ${dayAfterLaunch.macd.dea.toFixed(4)}
    柱状图: ${dayAfterLaunch.macd.histogram.toFixed(4)}
    信号: ${dayAfterLaunch.macd.signal}
    信号: ${evaluation.dayAfterLaunch.macdSignal ? "✅" : "❌"}

  📈 RSI
    值: ${dayAfterLaunch.rsi.value.toFixed(1)}
    信号: ${dayAfterLaunch.rsi.signal}
    信号: ${evaluation.dayAfterLaunch.rsiSignal ? "✅" : "❌"}

  📈 KDJ
    K: ${dayAfterLaunch.kdj.k.toFixed(1)}
    D: ${dayAfterLaunch.kdj.d.toFixed(1)}
    J: ${dayAfterLaunch.kdj.j.toFixed(1)}
    信号: ${dayAfterLaunch.kdj.signal}
    信号: ${evaluation.dayAfterLaunch.kdjSignal ? "✅" : "❌"}

  📊 成交量
    量比: ${dayAfterLaunch.volume.ratio.toFixed(2)}
    状态: ${dayAfterLaunch.volume.status}
    信号: ${evaluation.dayAfterLaunch.volumeSignal ? "✅" : "❌"}

  🎯 Gauge 评分
    得分: ${dayAfterLaunch.gaugeScore.toFixed(0)}/100
    信号强度: ${evaluation.dayAfterLaunch.strength}
    综合评估: ${evaluation.dayAfterLaunch.overallSignal ? "✅ 有效信号" : "❌ 无效信号"}

  📋 信号列表
${dayAfterLaunch.signals.map(s => `  ${s}`).join("\n")}
`;
}

/**
 * 获取股票列表（一键扫全市场）
 */
async function getStockList(): Promise<string[]> {
  const stocks: string[] = [];
  const commonSymbols = [
    "000001",
    "000002",
    "000858",
    "002594",
    "600000",
    "600036",
    "600519",
    "601318",
    "601939",
    "601988",
    "688111",
    "300750",
    "300502",
    "301308",
  ];

  for (const symbol of commonSymbols) {
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      stocks.push(symbol);
    } catch (e) {
      console.log(`⚠️ 无法获取 ${symbol} 信息`);
    }
  }

  return stocks;
}

/**
 * 扫描市场寻找牛股机会
 */
async function scanMarketForBullStocks(symbols: string[]): Promise<any[]> {
  const opportunities: any[] = [];

  for (const symbol of symbols) {
    try {
      const klines = await akshare.getStockHistory(symbol, "daily", 180);
      if (!klines || klines.length < 60) continue;

      const launchDate = detectLaunchDay(klines);
      if (!launchDate) continue;

      const launchIdx = klines.findIndex(
        k =>
          k.date === launchDate || k.date.startsWith(launchDate.split("T")[0])
      );
      if (launchIdx < 30) continue;

      const latest = klines[klines.length - 1];
      const launchDay = klines[launchIdx];

      const closes = klines.map(k => k.close);
      const highs = klines.map(k => k.high);
      const lows = klines.map(k => k.low);
      const volumes = klines.map(k => k.volume);

      const indicators = calculateIndicators(
        latest,
        closes,
        highs,
        lows,
        volumes
      );

      const stockInfo = await akshare.getStockInfo(symbol);
      if (!stockInfo) continue;

      const currentGain =
        ((latest.close - launchDay.close) / launchDay.close) * 100;

      if (indicators.totalScore >= 40 && currentGain > 0) {
        opportunities.push({
          symbol,
          name: stockInfo.name,
          launchDate,
          launchPrice: launchDay.close,
          currentPrice: latest.close,
          gain: currentGain,
          totalScore: indicators.totalScore,
          signals: indicators.signals,
          sellSignals: indicators.sellSignals,
        });
      }
    } catch (e) {
      console.log(`⚠️ 分析 ${symbol} 失败`);
    }
  }

  return opportunities.sort((a, b) => b.totalScore - a.totalScore);
}

/**
 * 显示卖出/止损建议
 */
function displaySellAdvice(result: IndicatorResult, launchLow: number): string {
  const advice: string[] = [];

  if (result.sellSignals.length > 0) {
    advice.push("\n🚨 卖出/止损信号:");
    result.sellSignals.forEach(s => advice.push(`  ${s}`));
  }

  if (result.totalScore < 30) {
    advice.push("\n⚠️ 综合评分低于30，建议减仓或清仓");
  }

  if (result.price < launchLow) {
    advice.push("\n⚠️ 跌破启动日低点，建议清仓止损");
  }

  if (
    result.sellSignals.length === 0 &&
    result.totalScore >= 30 &&
    result.price >= launchLow
  ) {
    advice.push("\n✅ 暂无卖出信号，可继续持有");
  }

  return advice.join("");
}

/**
 * 回测主函数
 */
async function mainBacktest() {
  console.log(
    "╔════════════════════════════════════════════════════════════════════════════════╗"
  );
  console.log("║   牛股信号回测验证                                      ║");
  console.log("║   目标：发现牛股信号，用于发现和持有牛股                 ║");
  console.log(
    "╚═════════════════════════════════════════════════════════════╝\n"
  );

  const testCases = [
    {
      symbol: "300502",
      name: "新易盛",
      startDate: "2025-06-10",
    },
    {
      symbol: "301308",
      name: "江波龙",
      startDate: "2025-07-01",
    },
    {
      symbol: "688111",
      name: "金山办公",
      startDate: "2025-09-15",
    },
    {
      symbol: "300750",
      name: "宁德时代",
      startDate: "2025-08-20",
    },
    {
      symbol: "002594",
      name: "比亚迪",
      startDate: "2025-05-20",
    },
    {
      symbol: "600519",
      name: "贵州茅台",
      startDate: "2025-10-10",
    },
    {
      symbol: "300124",
      name: "汇川技术",
      startDate: "2025-08-01",
    },
    {
      symbol: "002415",
      name: "海康威视",
      startDate: "2025-07-15",
    },
    {
      symbol: "600036",
      name: "招商银行",
      startDate: "2025-09-01",
    },
    {
      symbol: "601318",
      name: "中国平安",
      startDate: "2025-08-25",
    },
  ];

  const results: SignalAnalysis[] = [];

  const failedCases: Array<{ symbol: string; name: string; error: string }> =
    [];

  for (const testCase of testCases) {
    console.log(`\n分析 ${testCase.name}(${testCase.symbol})...`);
    const result = await analyzeStockAtDate(
      testCase.symbol,
      testCase.startDate
    );
    if (result) {
      results.push(result);
      console.log(
        `✅ 分析完成 - 涨幅: ${result.totalGain > 0 ? "+" : ""}${result.totalGain.toFixed(2)}%`
      );
    } else {
      console.log(`❌ 分析失败`);
      failedCases.push({
        symbol: testCase.symbol,
        name: testCase.name,
        error: "未知错误",
      });
    }
  }

  if (failedCases.length > 0) {
    console.log("\n\n" + "═".repeat(66));
    console.log(`⚠️  分析失败的股票 (${failedCases.length}只):`);
    failedCases.forEach(f => {
      console.log(`   - ${f.name}(${f.symbol}): ${f.error}`);
    });
  }

  console.log("\n\n" + "═".repeat(66));

  // 总结统计
  const totalTests = results.length;
  const validSignalsPreLaunch = results.filter(
    r => r.evaluation.preLaunch.overallSignal
  ).length;
  const validSignalsLaunchDay = results.filter(
    r => r.evaluation.launchDay.overallSignal
  ).length;
  const validSignalsDayAfter = results.filter(
    r => r.evaluation.dayAfterLaunch.overallSignal
  ).length;
  const strongSignalsPreLaunch = results.filter(
    r =>
      r.evaluation.preLaunch.strength === "强烈" ||
      r.evaluation.preLaunch.strength === "明显"
  ).length;
  const strongSignalsLaunchDay = results.filter(
    r =>
      r.evaluation.launchDay.strength === "强烈" ||
      r.evaluation.launchDay.strength === "明显"
  ).length;
  const strongSignalsDayAfter = results.filter(
    r =>
      r.evaluation.dayAfterLaunch.strength === "强烈" ||
      r.evaluation.dayAfterLaunch.strength === "明显"
  ).length;
  const avgGain =
    results.reduce((sum, r) => sum + r.totalGain, 0) / results.length;
  const avgScorePreLaunch =
    results.reduce((sum, r) => sum + r.preLaunch.gaugeScore, 0) /
    results.length;
  const avgScoreLaunchDay =
    results.reduce((sum, r) => sum + r.launchDay.gaugeScore, 0) /
    results.length;
  const avgScoreDayAfter =
    results.reduce((sum, r) => sum + r.dayAfterLaunch.gaugeScore, 0) /
    results.length;

  console.log("\n📊 总结统计\n");
  console.log(`  测试数量: ${totalTests}`);
  console.log(`  平均涨幅: ${avgGain.toFixed(2)}%`);

  console.log("\n  启动前信号: 有效率");
  console.log(
    `  有效信号: ${validSignalsPreLaunch}/${totalTests} (${((validSignalsPreLaunch / totalTests) * 100).toFixed(0)}%)`
  );
  console.log(`  强信号数: ${strongSignalsPreLaunch}/${totalTests}`);
  console.log(`  平均评分: ${avgScorePreLaunch.toFixed(0)}/100`);

  console.log("\n  启动当天信号: 有效率");
  console.log(
    `  有效信号: ${validSignalsLaunchDay}/${totalTests} (${((validSignalsLaunchDay / totalTests) * 100).toFixed(0)}%)`
  );
  console.log(`  强信号数: ${strongSignalsLaunchDay}/${totalTests}`);
  console.log(`  平均评分: ${avgScoreLaunchDay.toFixed(0)}/100`);

  console.log("\n  启动后1天信号: 有效率");
  console.log(
    `  有效信号: ${validSignalsDayAfter}/${totalTests} (${((validSignalsDayAfter / totalTests) * 100).toFixed(0)}%)`
  );
  console.log(`  强信号数: ${strongSignalsDayAfter}/${totalTests}`);
  console.log(`  平均评分: ${avgScoreDayAfter.toFixed(0)}/100`);

  // 输出详细分析
  for (const result of results) {
    console.log(formatAnalysis(result));
  }

  // 总结牛股特征
  console.log("\n" + "═".repeat(66));

  console.log("📈 牛股信号特征总结\n");

  const highGainers = results.filter(r => r.totalGain > 50);
  if (highGainers.length > 0) {
    console.log(`🔥 高涨幅股票 (涨幅 > 50%): ${highGainers.length}只`);
    highGainers.forEach(r => {
      console.log(`   - ${r.name}(${r.symbol}): +${r.totalGain.toFixed(2)}%`);
      console.log(`     启动前评分: ${r.preLaunch.gaugeScore.toFixed(0)}/100`);
      console.log(
        `     启动当天评分: ${r.launchDay.gaugeScore.toFixed(0)}/100`
      );
      console.log(`     启动前信号强度: ${r.evaluation.preLaunch.strength}`);
      console.log(`     启动当天信号强度: ${r.evaluation.launchDay.strength}`);
    });
  }

  // 信号有效性分析
  console.log("\n📊 信号有效性分析\n");
  console.log(
    `1. 启动前有效信号率: ${((validSignalsPreLaunch / totalTests) * 100).toFixed(0)}%`
  );
  console.log(
    `2. 启动当天有效信号率: ${((validSignalsLaunchDay / totalTests) * 100).toFixed(0)}%`
  );
  console.log(
    `3. 启动后1天有效信号率: ${((validSignalsDayAfter / totalTests) * 100).toFixed(0)}%`
  );

  // 信号特征分析
  console.log("\n🔍 牛股共同特征:\n");
  const allSignalsPreLaunch: string[] = [];
  const allSignalsLaunchDay: string[] = [];

  results.forEach(r => {
    allSignalsPreLaunch.push(...r.preLaunch.signals);
    allSignalsLaunchDay.push(...r.launchDay.signals);
  });

  const signalCountPre: Record<string, number> = {};
  const signalCountLaunch: Record<string, number> = {};

  allSignalsPreLaunch.forEach(s => {
    signalCountPre[s] = (signalCountPre[s] || 0) + 1;
  });
  allSignalsLaunchDay.forEach(s => {
    signalCountLaunch[s] = (signalCountLaunch[s] || 0) + 1;
  });

  console.log("启动前高频信号:");
  Object.entries(signalCountPre)
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .forEach(([signal, count]) => {
      console.log(
        `  ${signal}: ${count}/${results.length} (${((count / results.length) * 100).toFixed(0)}%)`
      );
    });

  console.log("\n启动当天高频信号:");
  Object.entries(signalCountLaunch)
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .forEach(([signal, count]) => {
      console.log(
        `  ${signal}: ${count}/${results.length} (${((count / results.length) * 100).toFixed(0)}%)`
      );
    });

  console.log(
    "\n═════════════════════════════════════════════════════════════════════════\n"
  );
}

/**
 * 市场扫描主函数
 */
async function mainScan() {
  console.log(
    "╔════════════════════════════════════════════════════════════════════════════════╗"
  );
  console.log("║   牛股市场扫描                                        ║");
  console.log("║   自动检测启动日，扫描全市场寻找牛股机会              ║");
  console.log(
    "╚═════════════════════════════════════════════════════════════╝\n"
  );

  console.log("📡 获取股票列表...");
  const symbols = await getStockList();
  console.log(`✅ 获取到 ${symbols.length} 只股票\n`);

  console.log("🔍 扫描市场寻找牛股机会...");
  const opportunities = await scanMarketForBullStocks(symbols);

  if (opportunities.length === 0) {
    console.log("❌ 未发现符合条件的牛股机会");
    return;
  }

  console.log(`\n✅ 发现 ${opportunities.length} 个牛股机会\n`);

  console.log("═".repeat(80));
  console.log("📈 牛股机会排序（按综合评分）\n");

  opportunities.forEach((opp, idx) => {
    console.log(`${idx + 1}. ${opp.name}(${opp.symbol})`);
    console.log(`   启动日期: ${opp.launchDate}`);
    console.log(`   启动价格: ${opp.launchPrice.toFixed(2)}元`);
    console.log(`   当前价格: ${opp.currentPrice.toFixed(2)}元`);
    console.log(`   涨幅: ${opp.gain > 0 ? "+" : ""}${opp.gain.toFixed(2)}%`);
    console.log(`   综合评分: ${opp.totalScore.toFixed(0)}/100`);
    console.log("   买入信号:");
    opp.signals.forEach(s => console.log(`     ${s}`));
    if (opp.sellSignals.length > 0) {
      console.log("   卖出信号:");
      opp.sellSignals.forEach(s => console.log(`     ${s}`));
    }
    console.log("");
  });

  console.log("═".repeat(80));
  console.log(
    `📊 扫描完成，共分析 ${symbols.length} 只股票，发现 ${opportunities.length} 个机会\n`
  );
}

const mode = process.argv[2] || "backtest";

if (mode === "scan") {
  mainScan().catch(console.error);
} else if (mode === "backtest") {
  mainBacktest().catch(console.error);
} else {
  console.log("使用方法:");
  console.log(
    "  回测模式: npx tsx server/bull_stock_signal_backtest.ts backtest"
  );
  console.log("  扫描模式: npx tsx server/bull_stock_signal_backtest.ts scan");
}
