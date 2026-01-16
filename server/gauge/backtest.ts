/**
 * Gauge 评分回测系统
 * 用于验证技术指标评分的有效性
 */

import { KlineData, calculateGaugeScore } from "./indicators";

export interface BacktestResult {
  symbol: string;
  startDate: string;
  endDate: string;
  totalSignals: number;
  correctPredictions: number;
  accuracy: number;
  avgReturn: number;
  maxDrawdown: number;
  signalDetails: SignalDetail[];
}

export interface SignalDetail {
  date: string;
  signal: string;
  score: number;
  priceAtSignal: number;
  priceAfter1Day: number | null;
  priceAfter5Day: number | null;
  return1Day: number | null;
  return5Day: number | null;
  isCorrect: boolean;
}

/**
 * 运行回测
 * @param klines 历史K线数据（需要足够长，建议至少 200 天）
 * @param symbol 股票代码
 * @returns 回测结果
 */
export function runBacktest(
  klines: KlineData[],
  symbol: string
): BacktestResult {
  if (klines.length < 100) {
    throw new Error("回测需要至少 100 天的历史数据");
  }

  const signalDetails: SignalDetail[] = [];
  let correctPredictions = 0;
  let totalReturn = 0;
  let maxDrawdown = 0;
  let peak = 0;

  // 从第 60 天开始回测（需要足够数据计算指标）
  for (let i = 60; i < klines.length - 5; i++) {
    // 使用到当前日期为止的数据计算评分
    const historicalData = klines.slice(0, i + 1);
    const result = calculateGaugeScore(historicalData);

    // 只记录强信号（Buy, Strong Buy, Sell, Strong Sell）
    if (result.signal === "Neutral") continue;

    const currentPrice = klines[i].close;
    const price1Day = i + 1 < klines.length ? klines[i + 1].close : null;
    const price5Day = i + 5 < klines.length ? klines[i + 5].close : null;

    const return1Day = price1Day
      ? ((price1Day - currentPrice) / currentPrice) * 100
      : null;
    const return5Day = price5Day
      ? ((price5Day - currentPrice) / currentPrice) * 100
      : null;

    // 判断预测是否正确
    // Buy/Strong Buy 信号：期望价格上涨
    // Sell/Strong Sell 信号：期望价格下跌
    const isBuySignal =
      result.signal === "Buy" || result.signal === "Strong Buy";
    const isCorrect =
      return5Day !== null &&
      ((isBuySignal && return5Day > 0) || (!isBuySignal && return5Day < 0));

    if (isCorrect) {
      correctPredictions++;
    }

    if (return5Day !== null) {
      totalReturn += isBuySignal ? return5Day : -return5Day;
    }

    // 计算最大回撤
    if (totalReturn > peak) {
      peak = totalReturn;
    }
    const drawdown = peak - totalReturn;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }

    signalDetails.push({
      date: klines[i].time,
      signal: result.signal,
      score: result.score,
      priceAtSignal: currentPrice,
      priceAfter1Day: price1Day,
      priceAfter5Day: price5Day,
      return1Day,
      return5Day,
      isCorrect,
    });
  }

  const totalSignals = signalDetails.length;
  const accuracy =
    totalSignals > 0 ? (correctPredictions / totalSignals) * 100 : 0;
  const avgReturn = totalSignals > 0 ? totalReturn / totalSignals : 0;

  return {
    symbol,
    startDate: klines[60].time,
    endDate: klines[klines.length - 6].time,
    totalSignals,
    correctPredictions,
    accuracy: Math.round(accuracy * 100) / 100,
    avgReturn: Math.round(avgReturn * 100) / 100,
    maxDrawdown: Math.round(maxDrawdown * 100) / 100,
    signalDetails,
  };
}

/**
 * 格式化回测报告
 */
export function formatBacktestReport(result: BacktestResult): string {
  const {
    symbol,
    startDate,
    endDate,
    totalSignals,
    correctPredictions,
    accuracy,
    avgReturn,
    maxDrawdown,
  } = result;

  return `
【${symbol} 回测报告】

📅 回测区间：${startDate} ~ ${endDate}

📊 信号统计
  - 总信号数：${totalSignals}
  - 正确预测：${correctPredictions}
  - 准确率：${accuracy}%

💰 收益统计
  - 平均收益：${avgReturn > 0 ? "+" : ""}${avgReturn}%
  - 最大回撤：${maxDrawdown}%

${accuracy >= 55 ? "✅ 策略有效（准确率 > 55%）" : "⚠️ 策略需要优化（准确率 < 55%）"}
`;
}
