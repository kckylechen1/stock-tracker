/**
 * 股票技术分析模块
 * 基于 stock-trading-analysis-guide.md 的完整规则
 * 提供给 AI 工具直接调用
 */

import * as akshare from "../akshare";
import { SMA, EMA, RSI, MACD, Stochastic } from "technicalindicators";

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
  isMaBullish: boolean; // MA5 > MA10 > MA20
  priceAboveMa5: boolean;
  priceAboveMa10: boolean;

  // MACD
  macdDif: number;
  macdDea: number;
  macdHistogram: number;
  macdIsRed: boolean;
  macdExpanding: boolean;
  macdCross: "golden" | "dead" | "none";

  // RSI
  rsi: number;
  rsiZone: "oversold" | "normal" | "overbought";

  // KDJ
  kdjK: number;
  kdjD: number;
  kdjJ: number;
  kdjCross: "golden" | "dead" | "none";

  // 成交量
  volRatio: number;
  volStatus: "shrink" | "normal" | "expand";

  // 综合判断
  notWeakenedScore: number; // 0-5 分
  notWeakenedItems: string[];
  shouldHold: boolean;
  shouldSell: boolean;
  holdAdvice: "hold" | "cautious" | "exit" | "sell";

  // 止损位
  stopLossAggressive: number; // MA5
  stopLossModerate: number; // MA10
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

// ==================== 技术指标计算 (使用 technicalindicators 库) ====================

// 库自动处理了：
// - RSI 的 Wilder's Smoothing 初始值问题
// - EMA 使用 SMA 作为 seed
// - KDJ 的标准初始化逻辑
// ==================== 核心分析函数 ====================

/**
 * 分析股票技术面
 * @param symbol 股票代码
 * @param targetDate 目标日期（可选，默认最新）
 */
export async function analyzeStock(
  symbol: string,
  targetDate?: string
): Promise<TechnicalAnalysisResult | null> {
  try {
    // 获取股票信息
    const stockInfo = await akshare.getStockInfo(symbol);
    if (!stockInfo) {
      return null;
    }

    // 获取K线数据
    const klines = await akshare.getStockHistory(symbol, "daily", 120);
    if (!klines || klines.length < 30) {
      return null;
    }

    // 确定分析日期
    let targetIdx = klines.length - 1;
    if (targetDate) {
      const idx = klines.findIndex(
        k => k.date === targetDate || k.date.startsWith(targetDate)
      );
      if (idx >= 0) {
        targetIdx = idx;
      }
    }

    const data = klines.slice(0, targetIdx + 1);
    const today = klines[targetIdx];
    const actualDate = today.date.split("T")[0];

    const closes = data.map(k => k.close);
    const highs = data.map(k => k.high);
    const lows = data.map(k => k.low);
    const volumes = data.map(k => k.volume);

    // 计算指标 - 使用 technicalindicators 库
    // 库自动处理 RSI Wilder's Smoothing、EMA 初始值等标准问题

    // 均线系统
    const ma5List = SMA.calculate({ values: closes, period: 5 });
    const ma10List = SMA.calculate({ values: closes, period: 10 });
    const ma20List = SMA.calculate({ values: closes, period: 20 });

    const ma5 = ma5List[ma5List.length - 1] ?? closes[closes.length - 1];
    const ma10 = ma10List[ma10List.length - 1] ?? closes[closes.length - 1];
    const ma20 = ma20List[ma20List.length - 1] ?? closes[closes.length - 1];

    const isMaBullish = ma5 > ma10 && ma10 > ma20;
    const priceAboveMa5 = today.close > ma5;
    const priceAboveMa10 = today.close > ma10;

    // MACD - 库自动处理 EMA 初始化
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
    const macdDif = macd.MACD ?? 0;
    const macdDea = macd.signal ?? 0;
    const macdHistogram = macd.histogram ?? 0;
    const macdIsRed = macdHistogram > 0;

    // 补充柱状图扩张/萎缩判断
    let macdExpanding = false;
    let macdShrinking = false;
    if (macdResult.length >= 2) {
      const prevHistogram = macdResult[macdResult.length - 2]?.histogram ?? 0;
      macdExpanding = macdHistogram > prevHistogram;
      macdShrinking = macdHistogram < prevHistogram;
    }

    let macdCross: "golden" | "dead" | "none" = "none";
    if (macdResult.length >= 2) {
      const prevMacd = macdResult[macdResult.length - 2] || {
        MACD: 0,
        signal: 0,
      };
      const prevDif = prevMacd.MACD ?? 0;
      const prevDea = prevMacd.signal ?? 0;
      if (prevDif < prevDea && macdDif > macdDea) macdCross = "golden";
      else if (prevDif > prevDea && macdDif < macdDea) macdCross = "dead";
    }

    // RSI - 库自动使用 Wilder's Smoothing
    const rsiResult = RSI.calculate({
      values: closes,
      period: 14,
    });
    const rsi = rsiResult[rsiResult.length - 1] ?? 50;
    const rsiZone: "oversold" | "normal" | "overbought" =
      rsi < 30 ? "oversold" : rsi > 70 ? "overbought" : "normal";

    // KDJ - 使用 Stochastic 计算 K 和 D，J 手算
    const stochResult = Stochastic.calculate({
      high: highs,
      low: lows,
      close: closes,
      period: 9,
      signalPeriod: 3,
    });
    const stoch = stochResult[stochResult.length - 1] || { k: 50, d: 50 };
    const kdjK = stoch.k ?? 50;
    const kdjD = stoch.d ?? 50;
    const kdjJ = 3 * kdjK - 2 * kdjD; // J 值计算基于正确的 K/D

    let kdjCross: "golden" | "dead" | "none" = "none";
    if (stochResult.length >= 2) {
      const prevStoch = stochResult[stochResult.length - 2] || { k: 50, d: 50 };
      const prevK = prevStoch.k ?? 50;
      const prevD = prevStoch.d ?? 50;
      if (prevK < prevD && kdjK > kdjD) kdjCross = "golden";
      else if (prevK > prevD && kdjK < kdjD) kdjCross = "dead";
    }

    // 成交量 - 降低放量阈值（从 1.5 改为 1.3）
    const volAvg5 = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5;
    const volRatio = today.volume / volAvg5;
    const volStatus: "shrink" | "normal" | "expand" =
      volRatio < 0.7 ? "shrink" : volRatio > 1.3 ? "expand" : "normal";

    // "没走弱"判定（5项检查）
    const notWeakenedItems: string[] = [];
    let notWeakenedScore = 0;

    if (priceAboveMa5) {
      notWeakenedItems.push("✅ 收盘价在MA5之上");
      notWeakenedScore++;
    } else {
      notWeakenedItems.push("❌ 收盘价跌破MA5");
    }

    if (priceAboveMa10) {
      notWeakenedItems.push("✅ 收盘价在MA10之上");
      notWeakenedScore++;
    } else {
      notWeakenedItems.push("❌ 收盘价跌破MA10");
    }

    if (macdIsRed) {
      if (macdExpanding) {
        notWeakenedItems.push("✅ MACD红柱存在且扩大");
      } else if (macdShrinking) {
        notWeakenedItems.push("⚠️ MACD红柱存在但在缩小（动能减弱）");
      } else {
        notWeakenedItems.push("✅ MACD红柱存在");
      }
      notWeakenedScore++;
    } else if (macdShrinking && macdHistogram < 0) {
      // 绿柱缩小，空头动能减弱
      notWeakenedItems.push("⚠️ MACD绿柱缩小（空头动能减弱）");
    } else {
      notWeakenedItems.push("❌ MACD已转绿柱");
    }

    if (rsi > 30) {
      notWeakenedItems.push(`✅ RSI=${rsi.toFixed(0)} 在30以上`);
      notWeakenedScore++;
    } else {
      notWeakenedItems.push(`❌ RSI=${rsi.toFixed(0)} 处于超卖区`);
    }

    if (volStatus === "shrink" || volStatus === "normal") {
      notWeakenedItems.push(
        `✅ 成交量${volStatus === "shrink" ? "缩量" : "正常"}（无砸盘）`
      );
      notWeakenedScore++;
    } else if (today.changePct > 0) {
      notWeakenedItems.push("✅ 放量上涨（资金进场）");
      notWeakenedScore++;
    } else {
      notWeakenedItems.push("❌ 放量下跌（资金离场）");
    }

    // 判定建议
    let shouldHold = notWeakenedScore >= 3;
    let holdAdvice: "hold" | "cautious" | "exit" | "sell";

    if (notWeakenedScore >= 3) {
      holdAdvice = "hold";
    } else if (notWeakenedScore >= 2) {
      holdAdvice = "cautious";
    } else {
      holdAdvice = "exit";
    }

    // 卖出信号
    let shouldSell = false;
    if (macdCross === "dead") {
      shouldSell = true;
      holdAdvice = "sell";
    }
    if (!priceAboveMa10 && volStatus === "expand" && today.changePct < 0) {
      shouldSell = true;
      holdAdvice = "sell";
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
        position: "30-40%",
        trigger: `回踩MA5(${ma5.toFixed(2)}元)但缩量`,
        entryPrice: ma5,
        stopLoss: ma10,
        target: today.close * 1.1,
      });

      entrySuggestions.push({
        batch: 2,
        position: "35-40%",
        trigger: `回踩MA10(${ma10.toFixed(2)}元)但收不破`,
        entryPrice: ma10,
        stopLoss: ma20,
        target: today.close * 1.15,
      });

      entrySuggestions.push({
        batch: 3,
        position: "20-30%",
        trigger: `突破近期高点(${recentHigh.toFixed(2)}元)`,
        entryPrice: recentHigh,
        stopLoss: ma5,
        target: recentHigh * 1.1,
      });
    }

    // 生成摘要
    const adviceText = {
      hold: "✅ 应该持有",
      cautious: "⚠️ 谨慎观望",
      exit: "❌ 建议离场",
      sell: "🔴 建议卖出",
    };

    const summary = `${stockInfo.name}(${symbol}) ${actualDate} 技术分析：得分 ${notWeakenedScore}/5，${adviceText[holdAdvice]}`;

    // 生成报告
    const entryAdviceText =
      entrySuggestions.length > 0
        ? entrySuggestions
            .map(
              e =>
                `├─ 第${e.batch}批(${e.position}): ${e.trigger}，进场${e.entryPrice.toFixed(2)}元，止损${e.stopLoss.toFixed(2)}元`
            )
            .join("\n")
        : "├─ 当前不建议进场";

    // 综合结论（硬编码规则）
    let overallVerdict = "";
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
├─ 价格: ${today.close.toFixed(2)}元 (${today.changePct >= 0 ? "+" : ""}${today.changePct.toFixed(2)}%)
├─ 均线: MA5=${ma5.toFixed(2)} MA10=${ma10.toFixed(2)} MA20=${ma20.toFixed(2)}
│  ${isMaBullish ? "✅ 多头排列" : "❌ 非多头排列"}
├─ MACD: ${macdIsRed ? "🟢 红柱" : "🔴 绿柱"} ${macdCross === "golden" ? "🟢金叉" : macdCross === "dead" ? "🔴死叉" : ""}
├─ RSI: ${rsi.toFixed(1)} (${rsiZone === "overbought" ? "⚠️超买" : rsiZone === "oversold" ? "🟢超卖" : "正常"})
└─ 量比: ${volRatio.toFixed(2)} (${volStatus === "shrink" ? "📉缩量" : volStatus === "expand" ? "📈放量" : "正常"})

📋 "没走弱"判定（得分: ${notWeakenedScore}/5）
${notWeakenedItems.join("\n")}

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
    console.error("[analyzeStock] Error:", error);
    return null;
  }
}

/**
 * 格式化分析结果为 AI 友好的文本
 */
export function formatAnalysisForAI(result: TechnicalAnalysisResult): string {
  return result.report;
}
