/**
 * 5分钟K线形态识别模块
 * 基于 stock-trading-analysis-guide.md 的三种安全回补形态
 */

import * as akshare from "../akshare";
import type { KlineData } from "../akshare";
import { SMA } from "technicalindicators";

// ==================== 形态类型 ====================

export type PatternType = "flag" | "box" | "ma_squeeze" | "none";

export interface PatternResult {
  type: PatternType;
  name: string;
  strength: number; // 1-5 星
  description: string;
  entryPrice: number;
  stopLoss: number;
  target: number;
  volume_confirmed: boolean;
}

export interface MinuteAnalysisResult {
  symbol: string;
  date: string;
  klines: {
    time: string;
    close: number;
    volume: number;
  }[];
  pattern: PatternResult | null;
  ma5: number[];
  ma10: number[];
  summary: string;
}

// ==================== 均线计算 ====================

function calculateSMA(closes: number[], period: number): number[] {
  const values = SMA.calculate({ values: closes, period });
  if (values.length === 0)
    return closes.map(() => closes[closes.length - 1] ?? 0);

  // technicalindicators 会丢弃前 period-1 个值，这里补齐以保持与 K 线长度一致
  const padLength = Math.max(0, closes.length - values.length);
  const padValue = values[0];
  return Array(padLength).fill(padValue).concat(values);
}

// ==================== 形态识别 ====================

/**
 * 识别旗形整理形态
 * 特征：高点逐步走低、低点逐步抬高，形成向下倾斜的旗形
 */
function detectFlagPattern(klines: KlineData[]): PatternResult | null {
  if (klines.length < 20) return null;

  const recent = klines.slice(-20);
  const closes = recent.map(k => k.close);
  const highs = recent.map(k => k.high);
  const lows = recent.map(k => k.low);
  const volumes = recent.map(k => k.volume);

  // 检查高点是否逐步走低
  let higherHighsCount = 0;
  let lowerLowsCount = 0;

  for (let i = 5; i < highs.length; i += 5) {
    const prevHigh = Math.max(...highs.slice(i - 5, i));
    const currHigh = Math.max(...highs.slice(i, Math.min(i + 5, highs.length)));
    if (currHigh < prevHigh) higherHighsCount++;

    const prevLow = Math.min(...lows.slice(i - 5, i));
    const currLow = Math.min(...lows.slice(i, Math.min(i + 5, lows.length)));
    if (currLow > prevLow) lowerLowsCount++;
  }

  // 成交量是否萎缩
  const avgVolFirst = volumes.slice(0, 10).reduce((a, b) => a + b, 0) / 10;
  const avgVolLast = volumes.slice(-10).reduce((a, b) => a + b, 0) / 10;
  const volumeShrinking = avgVolLast < avgVolFirst * 0.8;

  // 最后一根K线是否放量突破
  const lastClose = closes[closes.length - 1];
  const lastVolume = volumes[volumes.length - 1];
  const prevAvgClose = closes.slice(-10, -1).reduce((a, b) => a + b, 0) / 9;
  const breakout =
    lastClose > prevAvgClose * 1.02 && lastVolume > avgVolLast * 1.5;

  if (higherHighsCount >= 2 && lowerLowsCount >= 1 && volumeShrinking) {
    const flagLow = Math.min(...lows);
    const flagHigh = Math.max(...highs);

    return {
      type: "flag",
      name: "旗形整理",
      strength: breakout ? 5 : 4,
      description: breakout ? "旗形整理后放量突破" : "旗形整理中，等待突破",
      entryPrice: breakout ? lastClose : flagHigh,
      stopLoss: flagLow * 0.98,
      target: lastClose * 1.1,
      volume_confirmed: breakout,
    };
  }

  return null;
}

/**
 * 识别箱体形态
 * 特征：价格在某个区间反复震荡，多次触及下边界但没有破位
 */
function detectBoxPattern(klines: KlineData[]): PatternResult | null {
  if (klines.length < 30) return null;

  const recent = klines.slice(-30);
  const closes = recent.map(k => k.close);
  const highs = recent.map(k => k.high);
  const lows = recent.map(k => k.low);
  const volumes = recent.map(k => k.volume);

  // 计算箱体边界
  const boxHigh = Math.max(...highs.slice(0, -5));
  const boxLow = Math.min(...lows.slice(0, -5));
  const boxRange = boxHigh - boxLow;

  // 检查价格是否在箱体内震荡
  let touchLowCount = 0;
  let touchHighCount = 0;

  for (let i = 0; i < closes.length - 5; i++) {
    if (lows[i] <= boxLow * 1.01) touchLowCount++;
    if (highs[i] >= boxHigh * 0.99) touchHighCount++;
  }

  // 最后是否突破箱体顶部
  const lastClose = closes[closes.length - 1];
  const lastVolume = volumes[volumes.length - 1];
  const avgVolume =
    volumes.slice(0, -5).reduce((a, b) => a + b, 0) / (volumes.length - 5);
  const breakout = lastClose > boxHigh && lastVolume > avgVolume * 1.3;

  if (touchLowCount >= 2 && touchHighCount >= 2 && boxRange / boxLow < 0.1) {
    return {
      type: "box",
      name: "箱体形态",
      strength: breakout ? 4 : 3,
      description: breakout ? "箱体突破，确认上涨" : "箱体整理中",
      entryPrice: breakout ? lastClose : boxHigh * 1.01,
      stopLoss: boxLow * 0.98,
      target: boxHigh + boxRange,
      volume_confirmed: breakout,
    };
  }

  return null;
}

/**
 * 识别均线粘合发散形态
 * 特征：均线系统在整理期间贴在一起，突然冲出所有均线之上
 */
function detectMASqueezePattern(klines: KlineData[]): PatternResult | null {
  if (klines.length < 20) return null;

  const closes = klines.map(k => k.close);
  const volumes = klines.map(k => k.volume);

  const ma5 = calculateSMA(closes, 5);
  const ma10 = calculateSMA(closes, 10);

  // 检查均线是否粘合
  const recentMA5 = ma5.slice(-15, -5);
  const recentMA10 = ma10.slice(-15, -5);

  let squeezeCount = 0;
  for (let i = 0; i < recentMA5.length; i++) {
    const diff = Math.abs(recentMA5[i] - recentMA10[i]) / recentMA5[i];
    if (diff < 0.01) squeezeCount++; // 差距小于1%
  }

  // 最后是否发散突破
  const lastClose = closes[closes.length - 1];
  const lastMA5 = ma5[ma5.length - 1];
  const lastMA10 = ma10[ma10.length - 1];
  const lastVolume = volumes[volumes.length - 1];
  const avgVolume = volumes.slice(-10, -1).reduce((a, b) => a + b, 0) / 9;

  const breakout =
    lastClose > lastMA5 && lastClose > lastMA10 && lastVolume > avgVolume * 1.2;

  if (squeezeCount >= 5) {
    return {
      type: "ma_squeeze",
      name: "均线粘合发散",
      strength: breakout ? 3 : 2,
      description: breakout ? "均线粘合后放量突破" : "均线粘合中，等待发散",
      entryPrice: breakout ? lastClose : Math.max(lastMA5, lastMA10),
      stopLoss: Math.min(lastMA5, lastMA10) * 0.98,
      target: lastClose * 1.08,
      volume_confirmed: breakout,
    };
  }

  return null;
}

// ==================== 主分析函数 ====================

/**
 * 分析5分钟K线形态
 * @param symbol 股票代码
 */
export async function analyzeMinutePatterns(
  symbol: string
): Promise<MinuteAnalysisResult | null> {
  try {
    // 获取5分钟K线数据
    const klines = await akshare.getStockMinuteHistory(symbol, 5);
    if (!klines || klines.length < 30) {
      return null;
    }

    // 识别形态 (优先级从高到低)
    let pattern: PatternResult | null = null;

    pattern = detectFlagPattern(klines);
    if (!pattern) pattern = detectBoxPattern(klines);
    if (!pattern) pattern = detectMASqueezePattern(klines);

    // 计算均线
    const closes = klines.map(k => k.close);
    const ma5 = calculateSMA(closes, 5);
    const ma10 = calculateSMA(closes, 10);

    // 生成摘要
    let summary = "";
    if (pattern) {
      const stars =
        "★".repeat(pattern.strength) + "☆".repeat(5 - pattern.strength);
      summary = `5分钟形态: ${pattern.name} (${stars})\n`;
      summary += `${pattern.description}\n`;
      summary += `进场价: ${pattern.entryPrice.toFixed(2)}元\n`;
      summary += `止损位: ${pattern.stopLoss.toFixed(2)}元\n`;
      summary += `目标位: ${pattern.target.toFixed(2)}元\n`;
      summary += `成交量确认: ${pattern.volume_confirmed ? "✅ 是" : "❌ 否"}`;
    } else {
      summary = "5分钟形态: 暂无明确形态，继续观察";
    }

    return {
      symbol,
      date: klines[klines.length - 1].date,
      klines: klines.slice(-20).map(k => ({
        time: k.date,
        close: k.close,
        volume: k.volume,
      })),
      pattern,
      ma5: ma5.slice(-20),
      ma10: ma10.slice(-20),
      summary,
    };
  } catch (error) {
    console.error("[analyzeMinutePatterns] Error:", error);
    return null;
  }
}

/**
 * 格式化5分钟分析结果
 */
export function formatMinuteAnalysis(result: MinuteAnalysisResult): string {
  const klines = result.klines;

  // 分析不同时段
  const morningKlines = klines.filter(k => {
    const time = k.time.split(" ")[1] || k.time;
    return time >= "09:30" && time <= "11:30";
  });

  const afternoonKlines = klines.filter(k => {
    const time = k.time.split(" ")[1] || k.time;
    return time >= "13:00" && time <= "15:00";
  });

  // 早盘分析
  let morningAnalysis = "";
  if (morningKlines.length > 0) {
    const morningCloses = morningKlines.map(k => k.close);
    const morningVolumes = morningKlines.map(k => k.volume);
    const morningHigh = Math.max(...morningCloses);
    const morningLow = Math.min(...morningCloses);
    const morningAvgVol =
      morningVolumes.reduce((a, b) => a + b, 0) / morningVolumes.length;
    const lastMorningClose = morningCloses[morningCloses.length - 1];

    // 判断早盘是否有进场信号
    const hadMorningSignal = result.pattern && result.pattern.volume_confirmed;
    const morningTrend = lastMorningClose > morningCloses[0] ? "上涨" : "下跌";

    morningAnalysis = `
📌 **早盘(9:30-11:30)分析**
├─ 走势: ${morningTrend} (开${morningCloses[0]?.toFixed(2) || "--"} → 收${lastMorningClose?.toFixed(2) || "--"})
├─ 区间: 最高${morningHigh?.toFixed(2) || "--"} / 最低${morningLow?.toFixed(2) || "--"}
├─ 量能: 平均${(morningAvgVol / 10000).toFixed(0)}万
└─ 信号: ${hadMorningSignal ? "✅ 有进场信号" : "❌ 无明确进场信号"}`;
  } else {
    morningAnalysis = "📌 **早盘分析**: 暂无早盘数据";
  }

  // 形态分析
  let patternAnalysis = "";
  if (result.pattern) {
    const p = result.pattern;
    const stars = "★".repeat(p.strength) + "☆".repeat(5 - p.strength);
    patternAnalysis = `
📊 **识别到形态: ${p.name}** (${stars})
├─ 描述: ${p.description}
├─ 进场价: ${p.entryPrice.toFixed(2)}元
├─ 止损位: ${p.stopLoss.toFixed(2)}元
├─ 目标位: ${p.target.toFixed(2)}元
└─ 成交量确认: ${p.volume_confirmed ? "✅ 是" : "❌ 否"}`;
  } else {
    patternAnalysis = `
📊 **形态识别**: 暂无明确形态
├─ 无旗形整理
├─ 无箱体形态
└─ 无均线粘合发散`;
  }

  // 综合结论（硬编码规则）
  let conclusion = "";
  if (
    result.pattern &&
    result.pattern.volume_confirmed &&
    result.pattern.strength >= 4
  ) {
    conclusion = `✅ **建议进场**: 形态${result.pattern.name}已确认，可在${result.pattern.entryPrice.toFixed(2)}元附近进场，止损${result.pattern.stopLoss.toFixed(2)}元。`;
  } else if (result.pattern && result.pattern.strength >= 3) {
    conclusion = `⚠️ **等待确认**: 形态${result.pattern.name}正在形成，但成交量未确认。等待放量突破后再进场。`;
  } else {
    conclusion = `❌ **不建议进场**: 当前无明确形态，耐心等待。盲目进场容易被洗出去。`;
  }

  // 添加当前系统日期，确保 AI 有明确的时间感知
  const now = new Date();
  const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
  const weekdays = [
    "星期日",
    "星期一",
    "星期二",
    "星期三",
    "星期四",
    "星期五",
    "星期六",
  ];
  const weekday = weekdays[now.getDay()];

  return `【5分钟形态分析】(分析时间: ${dateStr} ${weekday})
👉 数据最后更新: ${result.date}

${morningAnalysis}

${patternAnalysis}

🎯 **综合结论**
${conclusion}`.trim();
}
