/**
 * 增强版卖出信号检测器
 *
 * 检测多种卖出和止损信号，提供更全面的风险控制
 */

import { executeStockTool } from "../stockTools";
import { SMA, RSI, MACD } from "technicalindicators";

export interface SellSignal {
  type: "warning" | "sell" | "stop_loss";
  signal: string;
  description: string;
  scoreImpact: number; // 对综合评分的负面影响
  priority: number; // 1-5，5为最高优先级
}

export interface SellSignalAnalysis {
  symbol: string;
  currentPrice: number;
  launchLow: number; // 启动日低点
  totalScore: number; // 综合评分
  sellSignals: SellSignal[];
  riskLevel: "low" | "medium" | "high" | "extreme";
  action: "hold" | "reduce" | "sell" | "stop_loss";
  reason: string;
}

/**
 * 增强版卖出信号检测器
 */
export class EnhancedSellSignalDetector {
  /**
   * 检测卖出信号
   */
  async analyzeSellSignals(
    symbol: string,
    currentPrice: number,
    launchLow: number,
    totalScore: number
  ): Promise<SellSignalAnalysis> {
    const sellSignals: SellSignal[] = [];

    // 1. 获取技术指标数据
    const technicalData = await this.getTechnicalData(symbol);
    if (!technicalData) {
      return {
        symbol,
        currentPrice,
        launchLow,
        totalScore,
        sellSignals: [],
        riskLevel: "low",
        action: "hold",
        reason: "无法获取技术数据",
      };
    }

    // 2. 检测各项卖出信号
    sellSignals.push(...this.detectEmptyArrangement(technicalData));
    sellSignals.push(...this.detectMACDDeadCross(technicalData));
    sellSignals.push(...this.detectRSIWeakness(technicalData));
    sellSignals.push(...this.detectVolumeShrinkage(technicalData));
    sellSignals.push(...this.detectScoreBasedSignals(totalScore));
    sellSignals.push(...this.detectStopLossSignals(currentPrice, launchLow));

    // 3. 确定风险等级和行动建议
    const { riskLevel, action, reason } = this.determineAction(
      sellSignals,
      totalScore,
      currentPrice,
      launchLow
    );

    return {
      symbol,
      currentPrice,
      launchLow,
      totalScore,
      sellSignals,
      riskLevel,
      action,
      reason,
    };
  }

  /**
   * 获取技术指标数据
   */
  private async getTechnicalData(symbol: string): Promise<any | null> {
    try {
      // 获取K线数据
      const klineResult = await executeStockTool("get_kline_data", {
        code: symbol,
        period: "day",
        limit: 60,
      });

      if (!klineResult || klineResult.includes("失败")) {
        return null;
      }

      // 解析K线数据（这里需要根据实际格式实现）
      const klineData = this.parseKlineData(klineResult);
      if (!klineData || klineData.length < 20) {
        return null;
      }

      // 计算技术指标
      return this.calculateTechnicalIndicators(klineData);
    } catch (error) {
      console.error(`获取 ${symbol} 技术数据失败:`, error);
      return null;
    }
  }

  /**
   * 检测空头排列
   */
  private detectEmptyArrangement(technical: any): SellSignal[] {
    const signals: SellSignal[] = [];

    if (
      technical.ma5 < technical.ma10 &&
      technical.ma10 < technical.ma20 &&
      technical.ma20 < technical.ma60
    ) {
      signals.push({
        type: "sell",
        signal: "空头排列",
        description: "均线形成空头排列，趋势向下",
        scoreImpact: -20,
        priority: 4,
      });
    } else if (technical.ma5 < technical.ma10) {
      signals.push({
        type: "warning",
        signal: "MA5下穿MA10",
        description: "短期均线下穿中期均线，短期趋势转弱",
        scoreImpact: -15,
        priority: 3,
      });
    }

    return signals;
  }

  /**
   * 检测MACD死叉
   */
  private detectMACDDeadCross(technical: any): SellSignal[] {
    const signals: SellSignal[] = [];

    // MACD死叉
    if (
      technical.macd.histogram < 0 &&
      technical.macd.MACD < technical.macd.signal
    ) {
      signals.push({
        type: "sell",
        signal: "MACD死叉",
        description: "MACD形成死叉，动能转弱",
        scoreImpact: -15,
        priority: 4,
      });
    }
    // MACD绿柱
    else if (technical.macd.histogram < 0) {
      signals.push({
        type: "warning",
        signal: "MACD绿柱",
        description: "MACD绿柱持续，动能偏弱",
        scoreImpact: -10,
        priority: 2,
      });
    }

    return signals;
  }

  /**
   * 检测RSI弱势信号
   */
  private detectRSIWeakness(technical: any): SellSignal[] {
    const signals: SellSignal[] = [];

    if (technical.rsi < 30) {
      signals.push({
        type: "sell",
        signal: "RSI超卖",
        description: "RSI跌破30，市场情绪极度悲观",
        scoreImpact: -25,
        priority: 5,
      });
    } else if (technical.rsi < 50) {
      signals.push({
        type: "warning",
        signal: "RSI<50",
        description: "RSI跌破50，中期趋势转弱",
        scoreImpact: -10,
        priority: 3,
      });
    }

    return signals;
  }

  /**
   * 检测缩量信号
   */
  private detectVolumeShrinkage(technical: any): SellSignal[] {
    const signals: SellSignal[] = [];

    // 计算平均成交量
    const avgVolume =
      technical.volumes.reduce((a: number, b: number) => a + b, 0) /
      technical.volumes.length;
    const currentVolume = technical.volumes[technical.volumes.length - 1];
    const volumeRatio = currentVolume / avgVolume;

    if (volumeRatio < 0.3) {
      signals.push({
        type: "sell",
        signal: "严重缩量",
        description: `成交量仅为平均水平的${(volumeRatio * 100).toFixed(0)}%，交投清淡`,
        scoreImpact: -20,
        priority: 4,
      });
    } else if (volumeRatio < 0.7) {
      signals.push({
        type: "warning",
        signal: "缩量",
        description: `成交量萎缩至${(volumeRatio * 100).toFixed(0)}%，成交不活跃`,
        scoreImpact: -10,
        priority: 2,
      });
    }

    return signals;
  }

  /**
   * 基于综合评分的卖出信号
   */
  private detectScoreBasedSignals(totalScore: number): SellSignal[] {
    const signals: SellSignal[] = [];

    if (totalScore < 20) {
      signals.push({
        type: "stop_loss",
        signal: "评分过低",
        description: `综合评分仅${totalScore}分，建议立即清仓`,
        scoreImpact: -30,
        priority: 5,
      });
    } else if (totalScore < 30) {
      signals.push({
        type: "sell",
        signal: "评分偏低",
        description: `综合评分${totalScore}分，建议减仓`,
        scoreImpact: -15,
        priority: 3,
      });
    }

    return signals;
  }

  /**
   * 检测止损信号
   */
  private detectStopLossSignals(
    currentPrice: number,
    launchLow: number
  ): SellSignal[] {
    const signals: SellSignal[] = [];

    if (currentPrice < launchLow) {
      const lossPercent = ((launchLow - currentPrice) / launchLow) * 100;
      signals.push({
        type: "stop_loss",
        signal: "跌破启动低点",
        description: `价格跌破启动日低点${launchLow.toFixed(2)}元，亏损${lossPercent.toFixed(1)}%`,
        scoreImpact: -40,
        priority: 5,
      });
    } else if (currentPrice < launchLow * 1.05) {
      // 接近启动低点5%以内
      signals.push({
        type: "warning",
        signal: "接近止损线",
        description: `价格接近启动日低点，注意风险控制`,
        scoreImpact: -5,
        priority: 2,
      });
    }

    return signals;
  }

  /**
   * 确定行动建议
   */
  private determineAction(
    sellSignals: SellSignal[],
    totalScore: number,
    currentPrice: number,
    launchLow: number
  ): {
    riskLevel: "low" | "medium" | "high" | "extreme";
    action: "hold" | "reduce" | "sell" | "stop_loss";
    reason: string;
  } {
    // 检查是否有止损信号
    const hasStopLoss = sellSignals.some(s => s.type === "stop_loss");
    if (hasStopLoss) {
      return {
        riskLevel: "extreme",
        action: "stop_loss",
        reason: "触发止损条件，建议立即清仓",
      };
    }

    // 计算风险评分
    const riskScore = sellSignals.reduce(
      (sum, signal) => sum + Math.abs(signal.scoreImpact),
      0
    );

    // 综合评分过低
    if (totalScore < 20) {
      return {
        riskLevel: "extreme",
        action: "stop_loss",
        reason: `综合评分仅${totalScore}分，风险极高`,
      };
    }

    // 多个卖出信号
    const sellCount = sellSignals.filter(s => s.type === "sell").length;
    if (sellCount >= 2) {
      return {
        riskLevel: "high",
        action: "sell",
        reason: `触发${sellCount}个卖出信号，建议卖出`,
      };
    }

    // 评分30-50分，建议减仓
    if (totalScore < 50) {
      return {
        riskLevel: "medium",
        action: "reduce",
        reason: `综合评分${totalScore}分，建议减仓`,
      };
    }

    // 有警告信号但总体可控
    if (sellSignals.length > 0) {
      return {
        riskLevel: "medium",
        action: "hold",
        reason: "有风险信号但可控，继续观察",
      };
    }

    // 无风险信号
    return {
      riskLevel: "low",
      action: "hold",
      reason: "暂无卖出信号，可继续持有",
    };
  }

  /**
   * 计算技术指标
   */
  private calculateTechnicalIndicators(klineData: any[]): any {
    const closes = klineData.map(d => d.close);
    const volumes = klineData.map(d => d.volume);

    const ma5 = SMA.calculate({ values: closes, period: 5 });
    const ma10 = SMA.calculate({ values: closes, period: 10 });
    const ma20 = SMA.calculate({ values: closes, period: 20 });
    const ma60 = SMA.calculate({ values: closes, period: 60 });

    const macdResult = MACD.calculate({
      values: closes,
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      SimpleMAOscillator: false,
      SimpleMASignal: false,
    });

    const rsiResult = RSI.calculate({ values: closes, period: 14 });

    return {
      ma5: ma5[ma5.length - 1],
      ma10: ma10[ma10.length - 1],
      ma20: ma20[ma20.length - 1],
      ma60: ma60[ma60.length - 1],
      macd: macdResult[macdResult.length - 1],
      rsi: rsiResult[rsiResult.length - 1],
      volumes,
    };
  }

  /**
   * 解析K线数据（需要根据实际工具格式实现）
   */
  private parseKlineData(result: string): any[] {
    // 临时实现，实际需要解析工具返回格式
    return [];
  }
}

/**
 * 快速检测卖出信号
 */
export async function quickSellSignalCheck(
  symbol: string,
  currentPrice: number,
  launchLow: number,
  totalScore: number
): Promise<SellSignalAnalysis> {
  const detector = new EnhancedSellSignalDetector();
  return await detector.analyzeSellSignals(
    symbol,
    currentPrice,
    launchLow,
    totalScore
  );
}

/**
 * 格式化卖出信号分析结果
 */
export function formatSellSignalAnalysis(analysis: SellSignalAnalysis): string {
  let output = `📊 ${analysis.symbol} 卖出信号分析\n\n`;

  output += `💰 当前价格: ¥${analysis.currentPrice.toFixed(2)}\n`;
  output += `🎯 启动低点: ¥${analysis.launchLow.toFixed(2)}\n`;
  output += `📈 综合评分: ${analysis.totalScore}/100\n`;
  output += `⚠️  风险等级: ${analysis.riskLevel.toUpperCase()}\n`;
  output += `🎯 建议行动: ${analysis.action.toUpperCase()}\n\n`;

  if (analysis.sellSignals.length > 0) {
    output += `🚨 检测到的信号:\n`;
    analysis.sellSignals.forEach((signal, idx) => {
      const icon =
        signal.type === "stop_loss"
          ? "🛑"
          : signal.type === "sell"
            ? "❌"
            : "⚠️";
      output += `${idx + 1}. ${icon} ${signal.signal}\n`;
      output += `   ${signal.description}\n`;
      output += `   评分影响: ${signal.scoreImpact}分 | 优先级: ${signal.priority}/5\n\n`;
    });
  } else {
    output += `✅ 未检测到卖出信号\n`;
  }

  output += `💡 ${analysis.reason}\n`;

  return output;
}
