/**
 * 测试从启动日开始的涨幅
 * 验证信号系统检测到启动后，后续涨幅如何
 */

import * as akshare from "./akshare";
import { SMA, RSI, MACD, Stochastic } from "technicalindicators";

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

  const volAvg5 = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5;
  const volAvg20 = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
  const volRatio = latest.volume / volAvg20;
  let volStatus = "正常";
  if (volRatio < 0.7) volStatus = "缩量";
  else if (volRatio > 1.3) volStatus = "放量";

  let score = 0;
  if (maArrangement === "多头排列") score += 20;
  else if (maArrangement === "盘整" && lastMA5 > lastMA10) score += 10;
  if (macdSignal === "金叉") score += 15;
  else if (macdSignal === "红柱" && macd.histogram > prevMacd.histogram)
    score += 10;
  if (rsiValue > 65 && rsiValue < 80) score += 20;
  else if (rsiValue > 50 && rsiValue <= 65) score += 15;
  else if (rsiValue < 30) score += 10;
  if (kdjSignal === "金叉") score += 15;
  else if (kdjJ > 50) score += 10;
  if (volStatus === "放量" && latest.close > latest.open) score += 15;
  else if (volStatus === "放量") score += 10;
  score = Math.min(100, Math.max(0, score));

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

  const sellSignals: string[] = [];
  let sellScore = 0;
  if (maArrangement === "空头排列") {
    sellSignals.push("❌ 均线空头排列");
    sellScore -= 15;
  } else if (lastMA5 < lastMA10) {
    sellSignals.push("❌ MA5 < MA10");
    sellScore -= 15;
  }
  if (macdSignal === "死叉") {
    sellSignals.push("❌ MACD 死叉");
    sellScore -= 15;
  } else if (macdSignal === "绿柱") {
    sellSignals.push("❌ MACD 绿柱");
    sellScore -= 10;
  }
  if (rsiValue < 50) {
    sellSignals.push("❌ RSI < 50");
    sellScore -= 10;
  }
  if (volStatus === "缩量") {
    sellSignals.push("❌ 缩量");
    sellScore -= 10;
  }

  const totalScore = Math.max(0, score + sellScore);

  return {
    date: latest.date,
    price: latest.close,
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
 * 计算从某日到现在的涨幅
 */
function calculateGainFromDay(klines: KlineData[], startDate: string): number {
  const startIdx = klines.findIndex(k => k.date === startDate);
  if (startIdx === -1) return 0;

  const startPrice = klines[startIdx].close;
  const currentPrice = klines[klines.length - 1].close;

  return ((currentPrice - startPrice) / startPrice) * 100;
}

/**
 * 计算持有期间的最大涨幅和回撤
 */
function calculateHoldStats(
  klines: KlineData[],
  startDate: string
): {
  maxGain: number;
  maxDrawdown: number;
  days: number;
} {
  const startIdx = klines.findIndex(k => k.date === startDate);
  if (startIdx === -1) return { maxGain: 0, maxDrawdown: 0, days: 0 };

  const startPrice = klines[startIdx].close;
  let maxPrice = startPrice;
  let maxGain = 0;
  let maxDrawdown = 0;

  for (let i = startIdx; i < klines.length; i++) {
    const price = klines[i].close;

    // 更新最高价
    if (price > maxPrice) {
      maxPrice = price;
    }

    // 计算从最高价的涨幅
    const gainFromStart = ((price - startPrice) / startPrice) * 100;
    maxGain = Math.max(maxGain, gainFromStart);

    // 计算从最高价的回撤
    const drawdown = ((maxPrice - price) / maxPrice) * 100;
    maxDrawdown = Math.max(maxDrawdown, drawdown);
  }

  return {
    maxGain,
    maxDrawdown,
    days: klines.length - startIdx,
  };
}

interface TestResult {
  symbol: string;
  name: string;
  launchDate: string | null;
  launchPrice: number;
  currentPrice: number;
  yearGain: number;
  launchScore: number | null;
  launchSignals: string[];
  detected: boolean;
  // 从启动日到现在的涨幅
  launchToNowGain: number | null;
  // 持有期间统计
  holdStats: {
    maxGain: number | null;
    maxDrawdown: number | null;
    days: number | null;
  };
  // 分组统计
  groups: {
    week1: number | null;
    week2: number | null;
    week4: number | null;
    month3: number | null;
  };
}

/**
 * 测试单只股票
 */
async function testStock(
  symbol: string,
  name: string
): Promise<TestResult | null> {
  try {
    const klines = await akshare.getStockHistory(symbol, "daily", 365);
    if (!klines || klines.length < 60) {
      return null;
    }

    const yearStart = klines.find(
      k => k.date.startsWith("2025-01") || k.date.startsWith("2025-02")
    );
    const current = klines[klines.length - 1];
    const yearGain = yearStart
      ? ((current.close - yearStart.close) / yearStart.close) * 100
      : 0;

    const launchDate = detectLaunchDay(klines);

    let launchScore: number | null = null;
    let launchSignals: string[] = [];
    let launchPrice: number | null = null;

    if (launchDate) {
      const launchIdx = klines.findIndex(k => k.date === launchDate);
      if (launchIdx >= 0) {
        const launchHistory = klines.slice(0, launchIdx + 1);
        const launchLatest = launchHistory[launchHistory.length - 1];

        const closes = launchHistory.map(k => k.close);
        const highs = launchHistory.map(k => k.high);
        const lows = launchHistory.map(k => k.low);
        const volumes = launchHistory.map(k => k.volume);

        const indicators = calculateIndicators(
          launchLatest,
          closes,
          highs,
          lows,
          volumes
        );

        launchScore = indicators.totalScore;
        launchSignals = indicators.signals;
        launchPrice = launchLatest.close;
      }
    }

    const detected = launchScore !== null && launchScore >= 30;

    // 计算从启动日到现在的涨幅
    const launchToNowGain = launchDate
      ? calculateGainFromDay(klines, launchDate)
      : null;

    // 计算持有期间统计
    const holdStats = launchDate
      ? calculateHoldStats(klines, launchDate)
      : {
          maxGain: null,
          maxDrawdown: null,
          days: null,
        };

    // 计算不同时间段的涨幅
    const groups = {
      week1: null as number | null,
      week2: null as number | null,
      week4: null as number | null,
      month3: null as number | null,
    };

    if (launchDate) {
      const launchIdx = klines.findIndex(k => k.date === launchDate);

      // 1周后（5个交易日）
      const week1Idx = Math.min(klines.length - 1, launchIdx + 5);
      if (week1Idx > launchIdx) {
        groups.week1 =
          ((klines[week1Idx].close - klines[launchIdx].close) /
            klines[launchIdx].close) *
          100;
      }

      // 2周后（10个交易日）
      const week2Idx = Math.min(klines.length - 1, launchIdx + 10);
      if (week2Idx > launchIdx) {
        groups.week2 =
          ((klines[week2Idx].close - klines[launchIdx].close) /
            klines[launchIdx].close) *
          100;
      }

      // 4周后（20个交易日）
      const week4Idx = Math.min(klines.length - 1, launchIdx + 20);
      if (week4Idx > launchIdx) {
        groups.week4 =
          ((klines[week4Idx].close - klines[launchIdx].close) /
            klines[launchIdx].close) *
          100;
      }

      // 3个月后（60个交易日）
      const month3Idx = Math.min(klines.length - 1, launchIdx + 60);
      if (month3Idx > launchIdx) {
        groups.month3 =
          ((klines[month3Idx].close - klines[launchIdx].close) /
            klines[launchIdx].close) *
          100;
      }
    }

    return {
      symbol,
      name,
      launchDate,
      launchPrice: launchPrice || 0,
      currentPrice: current.close,
      yearGain,
      launchScore,
      launchSignals,
      detected,
      launchToNowGain,
      holdStats,
      groups,
    };
  } catch {
    return null;
  }
}

/**
 * 主函数
 */
async function main() {
  console.log(
    "╔════════════════════════════════════════════════════════════════════════════════╗"
  );
  console.log(
    "║   从启动日开始涨幅回测                                             ║"
  );
  console.log(
    "║   验证：检测到启动信号后，后续涨幅如何？                        ║"
  );
  console.log(
    "╚═══════════════════════════════════════════════════════════════════════╝\n"
  );

  const testCases = [
    { symbol: "300502", name: "新易盛" },
    { symbol: "301308", name: "江波龙" },
    { symbol: "300750", name: "宁德时代" },
    { symbol: "688111", name: "金山办公" },
    { symbol: "002594", name: "比亚迪" },
    { symbol: "601138", name: "工业富联" },
    { symbol: "300760", name: "迈瑞医疗" },
    { symbol: "600519", name: "贵州茅台" },
    { symbol: "600036", name: "招商银行" },
    { symbol: "601318", name: "中国平安" },
    { symbol: "601012", name: "隆基绿能" },
    { symbol: "300274", name: "阳光电源" },
    { symbol: "002415", name: "海康威视" },
    { symbol: "600900", name: "长江电力" },
    { symbol: "300124", name: "汇川技术" },
    { symbol: "600309", name: "万华化学" },
    { symbol: "601766", name: "中国中车" },
    { symbol: "600276", name: "恒瑞医药" },
    { symbol: "300896", name: "爱美客" },
    { symbol: "300015", name: "爱尔眼科" },
    { symbol: "688981", name: "中芯国际" },
    { symbol: "688008", name: "澜起科技" },
    { symbol: "600887", name: "伊利股份" },
    { symbol: "000858", name: "五粮液" },
    { symbol: "601888", name: "中国中免" },
    { symbol: "601899", name: "紫金矿业" },
    { symbol: "600489", name: "中金黄金" },
    { symbol: "000333", name: "美的集团" },
    { symbol: "000651", name: "格力电器" },
    { symbol: "002594", name: "比亚迪" },
  ];

  const results: TestResult[] = [];

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(
      `[${i + 1}/${testCases.length}] 分析 ${testCase.name}(${testCase.symbol})...`
    );

    const result = await testStock(testCase.symbol, testCase.name);
    if (result) {
      results.push(result);
    }

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log("\n\n" + "═".repeat(80));
  console.log("📊 从启动日开始的涨幅统计\n");

  // 分组统计：识别成功 vs 识别失败
  const detected = results.filter(r => r.detected);
  const undetected = results.filter(r => !r.detected);

  console.log("识别成功的股票（有启动信号）：");
  console.log(`  数量: ${detected.length}`);

  const detectedNowGains = detected
    .filter(r => r.launchToNowGain !== null)
    .map(r => r.launchToNowGain!);
  if (detectedNowGains.length > 0) {
    console.log(
      `  启动后平均涨幅: ${(detectedNowGains.reduce((a, b) => a + b, 0) / detectedNowGains.length).toFixed(2)}%`
    );
    console.log(
      `  启动后最高涨幅: ${Math.max(...detectedNowGains).toFixed(2)}%`
    );
    console.log(
      `  启动后最低涨幅: ${Math.min(...detectedNowGains).toFixed(2)}%`
    );

    const positiveCount = detectedNowGains.filter(g => g > 0).length;
    console.log(
      `  盈利比例: ${positiveCount}/${detectedNowGains.length} (${((positiveCount / detectedNowGains.length) * 100).toFixed(1)}%)`
    );
  }

  const detectedMaxGains = detected
    .filter(r => r.holdStats.maxGain !== null)
    .map(r => r.holdStats.maxGain!);
  if (detectedMaxGains.length > 0) {
    console.log(
      `  持有期间平均最大涨幅: ${(detectedMaxGains.reduce((a, b) => a + b, 0) / detectedMaxGains.length).toFixed(2)}%`
    );
  }

  console.log("\n识别失败的股票（无启动信号）：");
  console.log(`  数量: ${undetected.length}`);

  // 按时间段统计
  console.log("\n═".repeat(80));
  console.log("📈 不同时间段的涨幅表现\n");

  const timePoints = [
    { name: "1周后", key: "week1" as const },
    { name: "2周后", key: "week2" as const },
    { name: "4周后", key: "week4" as const },
    { name: "3个月后", key: "month3" as const },
  ];

  timePoints.forEach(tp => {
    const gains = detected
      .filter(r => r.groups[tp.key] !== null)
      .map(r => r.groups[tp.key]!);
    if (gains.length > 0) {
      const avg = gains.reduce((a, b) => a + b, 0) / gains.length;
      const max = Math.max(...gains);
      const min = Math.min(...gains);
      const positive = gains.filter(g => g > 0).length;

      console.log(`${tp.name}:`);
      console.log(`  平均: ${avg.toFixed(2)}%`);
      console.log(`  最高: ${max.toFixed(2)}%`);
      console.log(`  最低: ${min.toFixed(2)}%`);
      console.log(
        `  盈利比例: ${positive}/${gains.length} (${((positive / gains.length) * 100).toFixed(1)}%)`
      );
      console.log("");
    }
  });

  console.log("═".repeat(80));
  console.log("📋 详细结果（按启动后涨幅排序）\n");

  const sorted = results
    .filter(r => r.launchToNowGain !== null)
    .sort((a, b) => (b.launchToNowGain || 0) - (a.launchToNowGain || 0));

  sorted.forEach((r, idx) => {
    const status = r.detected ? "✅" : "❌";
    const gain =
      r.launchToNowGain !== null
        ? (r.launchToNowGain > 0 ? "+" : "") +
          r.launchToNowGain.toFixed(2) +
          "%"
        : "N/A";
    const maxGain =
      r.holdStats.maxGain !== null
        ? "+" + r.holdStats.maxGain.toFixed(2) + "%"
        : "N/A";
    const drawdown =
      r.holdStats.maxDrawdown !== null
        ? r.holdStats.maxDrawdown.toFixed(2) + "%"
        : "N/A";
    const days = r.holdStats.days !== null ? r.holdStats.days + "天" : "N/A";

    console.log(`${idx + 1}. ${status} ${r.name}(${r.symbol})`);
    console.log(
      `   启动日: ${r.launchDate || "N/A"} | 启动价格: ${r.launchPrice.toFixed(2)}元`
    );
    console.log(
      `   当前价格: ${r.currentPrice.toFixed(2)}元 | 启动后涨幅: ${gain}`
    );
    console.log(
      `   持有期间最高涨幅: ${maxGain} | 最大回撤: ${drawdown} | 持有天数: ${days}`
    );

    if (r.detected) {
      console.log(`   信号评分: ${r.launchScore}/100`);
    }
    console.log("");
  });

  console.log("═".repeat(80) + "\n");
}

main().catch(console.error);
