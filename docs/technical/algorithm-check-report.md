# Stock Tracker 算法检查报告

**检查时间**: 2026-01-10
**检查范围**: 技术指标计算、评分逻辑、回测系统

---

## 🔴 发现的问题

### 1. 【严重】RSI计算 - 初始值问题
**文件**: `server/indicators.ts:119-128`

**问题描述**:
- 第一批RSI值的计算不正确，直接使用周期内的平均涨幅/跌幅
- 应该使用更符合行业标准的方法（Wilder's Smoothing）

**当前代码**:
```typescript
// 第一个RSI值
rsi.push(null); // 第一个数据点没有RSI
for (let i = 0; i < period; i++) {
  rsi.push(null);
}
// 然后直接用 period 天的均值计算第一个 RSI
```

**建议修复**:
- 使用 Wilder's Smoothing 方法计算初始平均涨幅和跌幅
- 或者在数据不足时返回 null

**影响**: 可能导致 RSI 值在初始阶段不准确，影响超买超卖判断

---

### 2. 【中等】KDJ计算 - 值相同问题
**文件**: `server/gauge/indicators.ts:327-335`

**问题描述**:
- K、D、J 值经常相同，失去指标意义
- 可能原因：数据序列太短或初始值计算不当

**建议修复**:
```typescript
// 初始值使用 RSV 而不是简单的平均
const k = kList.length === 0 ? rsv : (2/3) * kList[kList.length-1] + (1/3) * rsv;
// 增加 J 值的敏感性
const j = k > d ? 3 * k - 2 * d : k < d ? 3 * k - 2 * d : 50;
```

**影响**: KDJ 失去敏感性，无法有效捕捉市场变化

---

### 3. 【中等】MACD柱状图扩张判断逻辑不完整
**文件**: `server/gauge/indicators.ts:244-246`

**问题描述**:
- 只检查了是否扩张，没有检查是否萎缩
- 空头区域的萎缩信号没有被捕捉

**建议修复**:
```typescript
const macdHistogramExpanding = histogram > prevHistogram;
const macdHistogramShrinking = histogram < prevHistogram;
// 根据方向调整权重
if (macdScore > 0 && macdHistogramShrinking) macdScore *= 0.8;
if (macdScore < 0 && macdHistogramShrinking) macdScore *= 1.2;
```

**影响**: 可能错过空头区域的反弹信号

---

### 4. 【轻微】成交量放量阈值可能过严
**文件**: `server/_core/technicalAnalysis.ts:271-272`

**问题描述**:
- volRatio > 1.5 才算放量，可能漏掉一些重要的成交量信号
- 测试显示：量比 1.33 时应该被识别为放量，但未通过检查

**建议修复**:
```typescript
// 降低放量阈值
const volStatus: 'shrink' | 'normal' | 'expand' =
  volRatio < 0.7 ? 'shrink' : volRatio > 1.3 ? 'expand' : 'normal';
```

**影响**: 可能漏掉中等强度的成交量信号

---

### 5. 【轻微】EMA初始值问题
**文件**: `server/_core/technicalAnalysis.ts:94-102`

**问题描述**:
- EMA 初始值直接使用第一个价格，不符合标准计算方法
- 标准 EMA 应该先用 SMA 计算第一个值

**建议修复**:
```typescript
function calculateEMA(data: number[], period: number): number[] {
  if (!data.length || data.length < period) return [];
  // 第一个值使用 SMA
  const sma = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
  const result: number[] = new Array(period - 1).fill(null);
  result.push(sma);
  // 后续值使用 EMA 公式
  const multiplier = 2 / (period + 1);
  for (let i = period; i < data.length; i++) {
    result.push((data[i] - result[i - 1]) * multiplier + result[i - 1]);
  }
  return result;
}
```

**影响**: EMA 在初期不准确，影响短期趋势判断

---

## 🟡 设计逻辑不一致的地方

### 1. 【重复实现】存在两套指标计算逻辑

**文件位置**:
- `server/indicators.ts` (手动实现)
- `server/gauge/indicators.ts` (使用 technicalindicators 库)

**问题**:
- 计算方法不一致，可能导致结果差异
- 维护两套代码增加出错概率

**建议**:
- 统一使用一套实现（推荐使用 technicalindicators 库）
- 或保留 manual 版本作为备用，但需要明确标注用途

---

### 2. 【评分系统】Gauge评分阈值可能不合理
**文件**: `server/gauge/indicators.ts:551-560`

**问题描述**:
```
Strong Buy: score > 60
Buy: score > 30
Neutral: score >= -30
Sell: score >= -60
Strong Sell: score < -60
```

**问题**:
- Neutral 区间太宽 (-30 到 30)，可能错过中等信号
- Buy 和 Strong Buy 区间只有 30 分差距，而 Neutral 有 60 分

**建议调整**:
```typescript
if (score > 70) signal = 'Strong Buy';
else if (score > 40) signal = 'Buy';
else if (score > -40) signal = 'Neutral';
else if (score > -70) signal = 'Sell';
else signal = 'Strong Sell';
```

---

### 3. 【一致性】止损位计算逻辑不统一

**问题**:
- `technicalAnalysis.ts` 使用 MA5/MA10/MA20 作为止损位
- `minutePatterns.ts` 使用最低价的 0.98 倍作为止损位
- 两种方法差异较大，可能造成混淆

**建议**:
- 统一止损位计算方法
- 或在不同场景下明确使用不同的止损策略

---

## 🟢 算法正确的部分

✅ **MA 计算** - 逻辑正确
✅ **MACD 基本计算** - DIF/DEA/Histogram 计算正确
✅ **均线排列判断** - 多头/空头判断正确
✅ **成交量比例计算** - 基本逻辑正确
✅ **Gauge 评分基础逻辑** - 加权计算正确
✅ **边界条件检查** - 空数组、数据长度检查通过

---

## 📊 总结

### 问题统计
- 🔴 严重: 1 个
- 🟡 中等: 3 个
- 🟡 轻微: 2 个
- 🟢 正确: 6 个
- 🟡 设计不一致: 3 个

### 优先级建议

#### 高优先级
1. **修复 RSI 初始值计算问题** - 影响超买超卖判断准确性
2. **统一指标计算实现** - 避免维护两套代码导致的不一致

#### 中优先级
3. **优化成交量放量阈值** - 从 1.5 降到 1.3，捕捉更多成交量信号
4. **改进 KDJ 初始值计算** - 增加 J 值敏感性

#### 低优先级
5. **调整 Gauge 评分阈值** - 使信号分布更合理
6. **统一止损位计算方法** - 避免混淆

---

## 测试方法

运行算法测试：
```bash
cd stock-tracker
npx tsx server/test_indicators.ts
```

查看详细报告：
```bash
cd stock-tracker
npx tsx server/test_indicators_report.ts
```

---

**报告生成时间**: 2026-01-10
**下次检查建议**: 修复上述问题后重新测试
