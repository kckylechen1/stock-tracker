/**
 * 技术指标计算工具
 */

interface KlineData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * 计算简单移动平均线 (SMA)
 */
export function calculateSMA(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
      continue;
    }
    
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j] || 0;
    }
    result.push(sum / period);
  }
  
  return result;
}

/**
 * 计算指数移动平均线 (EMA)
 */
export function calculateEMA(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const multiplier = 2 / (period + 1);
  
  // 第一个EMA值使用SMA
  let ema = 0;
  for (let i = 0; i < period; i++) {
    if (i >= data.length) break;
    ema += data[i] || 0;
  }
  ema = ema / period;
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else if (i === period - 1) {
      result.push(ema);
    } else {
      ema = (data[i] - ema) * multiplier + ema;
      result.push(ema);
    }
  }
  
  return result;
}

/**
 * 计算MACD指标
 */
export function calculateMACD(data: KlineData[]) {
  const closes = data.map(d => d.close);
  
  // 计算12日和26日EMA
  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);
  
  // 计算DIF (MACD线)
  const dif: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (ema12[i] === null || ema26[i] === null) {
      dif.push(null);
    } else {
      dif.push((ema12[i] as number) - (ema26[i] as number));
    }
  }
  
  // 计算DEA (信号线) - DIF的9日EMA
  const difValues = dif.filter(v => v !== null) as number[];
  const dea = calculateEMA(difValues, 9);
  
  // 补齐DEA数组长度
  const deaFull: (number | null)[] = new Array(dif.length).fill(null);
  let deaIndex = 0;
  for (let i = 0; i < dif.length; i++) {
    if (dif[i] !== null) {
      deaFull[i] = dea[deaIndex] || null;
      deaIndex++;
    }
  }
  
  // 计算MACD柱 (histogram)
  const histogram: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (dif[i] === null || deaFull[i] === null) {
      histogram.push(null);
    } else {
      histogram.push(((dif[i] as number) - (deaFull[i] as number)) * 2);
    }
  }
  
  return {
    dif,
    dea: deaFull,
    histogram,
  };
}

/**
 * 计算RSI指标
 */
export function calculateRSI(data: KlineData[], period: number = 14) {
  const closes = data.map(d => d.close);
  const rsi: (number | null)[] = [];
  
  if (closes.length < period + 1) {
    return new Array(closes.length).fill(null);
  }
  
  // 计算价格变化
  const changes: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    changes.push(closes[i] - closes[i - 1]);
  }
  
  // 计算平均涨幅和跌幅
  let avgGain = 0;
  let avgLoss = 0;
  
  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) {
      avgGain += changes[i];
    } else {
      avgLoss += Math.abs(changes[i]);
    }
  }
  
  avgGain /= period;
  avgLoss /= period;
  
  // 第一个RSI值
  rsi.push(null); // 第一个数据点没有RSI
  for (let i = 0; i < period; i++) {
    rsi.push(null);
  }
  
  let rs = avgGain / (avgLoss || 1);
  rsi.push(100 - (100 / (1 + rs)));
  
  // 计算后续RSI值
  for (let i = period; i < changes.length; i++) {
    const change = changes[i];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;
    
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    
    rs = avgGain / (avgLoss || 1);
    rsi.push(100 - (100 / (1 + rs)));
  }
  
  return rsi;
}

/**
 * 计算布林带 (Bollinger Bands)
 */
export function calculateBollingerBands(data: KlineData[], period: number = 20, stdDev: number = 2) {
  const closes = data.map(d => d.close);
  const sma = calculateSMA(closes, period);
  
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];
  
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1 || sma[i] === null) {
      upper.push(null);
      lower.push(null);
      continue;
    }
    
    // 计算标准差
    let sumSquares = 0;
    for (let j = 0; j < period; j++) {
      const diff = closes[i - j] - (sma[i] as number);
      sumSquares += diff * diff;
    }
    const std = Math.sqrt(sumSquares / period);
    
    upper.push((sma[i] as number) + std * stdDev);
    lower.push((sma[i] as number) - std * stdDev);
  }
  
  return {
    upper,
    middle: sma,
    lower,
  };
}

/**
 * 分析技术指标并生成信号
 */
export function analyzeTechnicalIndicators(data: KlineData[]) {
  if (data.length < 30) {
    return {
      score: 50,
      signals: ['数据不足，无法进行技术分析'],
    };
  }
  
  const macd = calculateMACD(data);
  const rsi = calculateRSI(data, 14);
  const ma5 = calculateSMA(data.map(d => d.close), 5);
  const ma20 = calculateSMA(data.map(d => d.close), 20);
  const ma60 = calculateSMA(data.map(d => d.close), 60);
  
  const signals: string[] = [];
  let score = 50; // 基础分数
  
  // 最新数据索引
  const lastIdx = data.length - 1;
  const prevIdx = lastIdx - 1;
  
  // MACD分析
  const lastMACD = macd.histogram[lastIdx];
  const prevMACD = macd.histogram[prevIdx];
  if (lastMACD !== null && prevMACD !== null) {
    if (lastMACD > 0 && prevMACD <= 0) {
      signals.push('MACD金叉 ✅');
      score += 15;
    } else if (lastMACD < 0 && prevMACD >= 0) {
      signals.push('MACD死叉 ⚠️');
      score -= 15;
    } else if (lastMACD > 0) {
      signals.push('MACD多头 ✅');
      score += 5;
    } else {
      signals.push('MACD空头 ⚠️');
      score -= 5;
    }
  }
  
  // RSI分析
  const lastRSI = rsi[lastIdx];
  if (lastRSI !== null) {
    if (lastRSI > 70) {
      signals.push(`RSI超买 (${lastRSI.toFixed(1)}) ⚠️`);
      score -= 10;
    } else if (lastRSI < 30) {
      signals.push(`RSI超卖 (${lastRSI.toFixed(1)}) ✅`);
      score += 10;
    } else {
      signals.push(`RSI中性 (${lastRSI.toFixed(1)})`);
    }
  }
  
  // 均线分析
  const lastClose = data[lastIdx].close;
  const lastMA5 = ma5[lastIdx];
  const lastMA20 = ma20[lastIdx];
  const lastMA60 = ma60[lastIdx];
  
  if (lastMA5 !== null && lastMA20 !== null && lastMA60 !== null) {
    if (lastMA5 > lastMA20 && lastMA20 > lastMA60) {
      signals.push('均线多头排列 ✅');
      score += 15;
    } else if (lastMA5 < lastMA20 && lastMA20 < lastMA60) {
      signals.push('均线空头排列 ⚠️');
      score -= 15;
    }
    
    if (lastClose > lastMA60) {
      signals.push('突破60日均线 ✅');
      score += 10;
    } else if (lastClose < lastMA60) {
      signals.push('跌破60日均线 ⚠️');
      score -= 10;
    }
  }
  
  // 限制分数范围
  score = Math.max(0, Math.min(100, score));
  
  return {
    score: Math.round(score),
    signals,
    indicators: {
      macd: {
        dif: macd.dif[lastIdx],
        dea: macd.dea[lastIdx],
        histogram: macd.histogram[lastIdx],
      },
      rsi: lastRSI,
      ma: {
        ma5: lastMA5,
        ma20: lastMA20,
        ma60: lastMA60,
      },
    },
  };
}
