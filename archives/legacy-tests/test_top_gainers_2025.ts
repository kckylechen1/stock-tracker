/**
 * 回测2025年涨幅最大的30只股票（市值>200亿）
 * 验证牛股信号系统的准确性
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
  const yearStart = klines.find(
    k => k.date.startsWith("2025-01") || k.date.startsWith("2025-02")
  );
  if (!yearStart) return 0;

  const current = klines[klines.length - 1];
  return ((current.close - yearStart.close) / yearStart.close) * 100;
}

interface TestResult {
  symbol: string;
  name: string;
  launchDate: string | null;
  yearGain: number;
  launchScore: number | null;
  launchSignals: string[];
  launchSellSignals: string[];
  detected: boolean;
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
      console.log(`⚠️ ${name}(${symbol}): 数据不足`);
      return null;
    }

    const yearGain = calculateYearGain(klines);
    const launchDate = detectLaunchDay(klines);

    let launchScore: number | null = null;
    let launchSignals: string[] = [];
    let launchSellSignals: string[] = [];

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
        launchSellSignals = indicators.sellSignals;
      }
    }

    const detected = launchScore !== null && launchScore >= 30;

    return {
      symbol,
      name,
      launchDate,
      yearGain,
      launchScore,
      launchSignals,
      launchSellSignals,
      detected,
    };
  } catch (e) {
    console.log(`⚠️ ${name}(${symbol}): 分析失败 - ${e}`);
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
    "║   2025年涨幅最大的30只股票（市值>200亿）牛股信号回测              ║"
  );
  console.log(
    "║   目标：验证信号系统能否识别这些牛股的启动点                    ║"
  );
  console.log(
    "╚═════════════════════════════════════════════════════════════════════════╝\n"
  );

  // 2025年涨幅较大的大盘股（基于已知数据）
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
    { symbol: "601138", name: "三一重工" },
    { symbol: "000651", name: "格力电器" },
  ];

  const results: TestResult[] = [];
  const failed: Array<{ symbol: string; name: string }> = [];

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(
      `[${i + 1}/${testCases.length}] 分析 ${testCase.name}(${testCase.symbol})...`
    );

    const result = await testStock(testCase.symbol, testCase.name);
    if (result) {
      results.push(result);
      const status = result.detected ? "✅" : "❌";
      const score = result.launchScore ?? "N/A";
      const gain = result.yearGain > 0 ? "+" : "";
      console.log(
        `  ${status} 年度涨幅: ${gain}${result.yearGain.toFixed(2)}% | 启动评分: ${score}`
      );
    } else {
      failed.push(testCase);
    }

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log("\n\n" + "═".repeat(80));
  console.log("📊 统计结果\n");

  const total = results.length;
  const detected = results.filter(r => r.detected).length;
  const avgGain = results.reduce((sum, r) => sum + r.yearGain, 0) / total;
  const avgScore =
    results
      .filter(r => r.launchScore !== null)
      .reduce((sum, r) => sum + (r.launchScore ?? 0), 0) / total;

  const detectedResults = results.filter(r => r.detected);
  const avgGainDetected =
    detectedResults.length > 0
      ? detectedResults.reduce((sum, r) => sum + r.yearGain, 0) /
        detectedResults.length
      : 0;

  const undetectedResults = results.filter(r => !r.detected);
  const avgGainUndetected =
    undetectedResults.length > 0
      ? undetectedResults.reduce((sum, r) => sum + r.yearGain, 0) /
        undetectedResults.length
      : 0;

  console.log(`总测试数: ${total}`);
  console.log(
    `成功识别: ${detected} (${((detected / total) * 100).toFixed(1)}%)`
  );
  console.log(`识别失败: ${total - detected}`);
  console.log(`数据获取失败: ${failed.length}\n`);

  console.log(`平均年度涨幅: ${avgGain.toFixed(2)}%`);
  console.log(`识别股票平均涨幅: ${avgGainDetected.toFixed(2)}%`);
  console.log(`未识别股票平均涨幅: ${avgGainUndetected.toFixed(2)}%`);
  console.log(`平均启动评分: ${avgScore.toFixed(1)}/100\n`);

  console.log("═".repeat(80));
  console.log("📋 详细结果\n");

  // 按涨幅排序
  results.sort((a, b) => b.yearGain - a.yearGain);

  results.forEach((r, idx) => {
    const status = r.detected ? "✅" : "❌";
    const score = r.launchScore !== null ? r.launchScore.toFixed(0) : "N/A";
    const launch = r.launchDate || "N/A";
    const gain = r.yearGain > 0 ? "+" : "";

    console.log(`${idx + 1}. ${status} ${r.name}(${r.symbol})`);
    console.log(
      `   年度涨幅: ${gain}${r.yearGain.toFixed(2)}% | 启动日期: ${launch} | 启动评分: ${score}`
    );

    if (r.launchScore !== null && r.launchSignals.length > 0) {
      console.log(`   买入信号: ${r.launchSignals.join(", ")}`);
    }
    if (r.launchScore !== null && r.launchSellSignals.length > 0) {
      console.log(`   卖出信号: ${r.launchSellSignals.join(", ")}`);
    }
    console.log("");
  });

  if (failed.length > 0) {
    console.log("═".repeat(80));
    console.log("❌ 失败案例:\n");
    failed.forEach(f => {
      console.log(`   - ${f.name}(${f.symbol})`);
    });
    console.log("");
  }

  console.log("═".repeat(80) + "\n");
}

main().catch(console.error);
