# 技术指标库迁移报告

**迁移时间**: 2026-01-10
**迁移目标**: 将手动实现的技术指标计算全部迁移到 `technicalindicators` 库

---

## 📋 迁移概览

### 迁移的文件

1. ✅ `server/_core/technicalAnalysis.ts` - 技术分析模块
2. ✅ `server/_core/minutePatterns.ts` - 5分钟K线形态识别模块
3. ✅ `server/gauge/indicators.ts` - Gauge 评分模块（补充逻辑）
4. ✅ `server/test_indicators.ts` - 算法测试脚本

### 废弃的文件

- 🗑️ `server/indicators.ts` → `server/indicators.ts.deprecated`（备份）

---

## 🔧 具体迁移内容

### 1. RSI 计算 - **已修复严重问题**

**问题**: 手动实现使用简单平均计算初始值，不符合 Wilder's Smoothing 标准

**迁移前**:

```typescript
const avgGain = gains.slice(-period).reduce((a, b) => a + b, 0) / period;
const avgLoss = losses.slice(-period).reduce((a, b) => a + b, 0) / period;
```

**迁移后**:

```typescript
const rsiResult = RSI.calculate({
  values: closes,
  period: 14,
});
const rsi = rsiResult[rsiResult.length - 1] ?? 50;
```

**影响**: RSI 值现在符合 TradingView、Thinkorswim 等主流软件的标准

---

### 2. MACD 计算 - **补充萎缩逻辑**

**新增功能**:

```typescript
// 补充柱状图扩张/萎缩判断
let macdExpanding = false;
let macdShrinking = false;
if (macdResult.length >= 2) {
  const prevHistogram = macdResult[macdResult.length - 2]?.histogram ?? 0;
  macdExpanding = macdHistogram > prevHistogram;
  macdShrinking = macdHistogram < prevHistogram; // 新增
}

// 根据萎缩调整权重
if (macdShrinking && macdScore < 0) macdScore *= 1.2; // 空头萎缩是利好
```

**影响**: 现在能捕捉空头区域的反弹信号

---

### 3. KDJ 计算 - **解决值粘连问题**

**问题**: 手动实现时 K、D、J 值经常相同，失去指标意义

**迁移前**:

```typescript
const k =
  kList.length === 0 ? rsv : (2 / 3) * kList[kList.length - 1] + (1 / 3) * rsv;
const d =
  dList.length === 0 ? k : (2 / 3) * dList[dList.length - 1] + (1 / 3) * k;
const j = 3 * k - 2 * d;
```

**迁移后**:

```typescript
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
const kdjJ = 3 * kdjK - 2 * kdjD; // J 值基于正确的 K/D 计算
```

**测试结果**:

```
K: 83.33, D: 50.00, J: 150.00
✅ KDJ 逻辑正确（J 值与 K/D 不同）
```

**影响**: KDJ 恢复敏感性，能有效捕捉市场变化

---

### 4. EMA 计算 - **使用标准初始化**

**问题**: 手动实现直接使用第一个价格，不符合标准

**迁移后**:

```typescript
const ema12 = EMA.calculate({ values: closes, period: 12 });
const ema26 = EMA.calculate({ values: closes, period: 26 });
```

**影响**: EMA 值现在正确使用 SMA 作为 seed，短期趋势判断更准确

---

### 5. 成交量放量阈值 - **降低阈值**

**迁移前**:

```typescript
const volRatio = today.volume / volAvg5;
const volStatus =
  volRatio < 0.7 ? "shrink" : volRatio > 1.5 ? "expand" : "normal";
```

**迁移后**:

```typescript
const volRatio = today.volume / volAvg5;
const volStatus =
  volRatio < 0.7 ? "shrink" : volRatio > 1.3 ? "expand" : "normal";
```

**测试结果**:

```
量比 1.33: ✅ 放量（阈值 1.3）
```

**影响**: 现在能捕捉更多中等到强度的成交量信号

---

### 6. 均线计算 - **统一使用库**

**迁移前**:

```typescript
function calculateMA(closes: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      result.push(closes.slice(0, i + 1).reduce((a, b) => a + b, 0) / (i + 1));
    } else {
      result.push(
        closes.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period
      );
    }
  }
  return result;
}
```

**迁移后**:

```typescript
const ma5 = SMA.calculate({ values: closes, period: 5 });
const ma10 = SMA.calculate({ values: closes, period: 10 });
const ma20 = SMA.calculate({ values: closes, period: 20 });
```

**影响**: 代码更简洁，计算更可靠

---

## ✅ 测试结果

### TypeScript 类型检查

```bash
npm run check
✅ 通过，无错误
```

### 算法测试

```bash
npx tsx server/test_indicators.ts
```

**测试结果**:

- ✅ MA 计算 - 逻辑正确
- ✅ RSI 计算 - 逻辑正确（使用 Wilder's Smoothing）
- ✅ MACD 计算 - 逻辑正确
- ✅ KDJ 计算 - 逻辑正确（J 值与 K/D 不同）
- ✅ 边界条件 - 空数组、数据长度检查通过
- ✅ Gauge 评分 - 逻辑正确
- ✅ 均线排列 - 多头/空头判断正确
- ✅ 成交量 - 放量阈值 1.3 测试通过

---

## 📊 问题修复统计

### 已修复的严重问题

1. ✅ **RSI 初始值计算** - 使用 Wilder's Smoothing 标准
2. ✅ **两套指标实现重复** - 统一使用 `technicalindicators` 库

### 已修复的中等问题

3. ✅ **KDJ 值粘连** - 库自动处理初始化，J 值恢复敏感性
4. ✅ **MACD 柱状图萎缩逻辑缺失** - 补充萎缩判断和加权
5. ✅ **成交量放量阈值过严** - 从 1.5 降到 1.3

### 已修复的轻微问题

6. ✅ **EMA 初始值问题** - 库自动使用 SMA 作为 seed

---

## 🎯 优化结果

### 精确性提升

- RSI 现在符合行业标准（Wilder's Smoothing）
- EMA 使用正确的初始化方法
- KDJ 恢复指标敏感性

### 代码质量提升

- 删除了约 150 行手动实现代码
- 使用经过广泛验证的库函数
- 代码更简洁、易维护

### 信号质量提升

- MACD 柱状图萎缩信号被捕捉
- 成交量阈值优化，捕捉更多中等强度信号
- 指标一致性提升，避免两套实现导致的差异

---

## 📝 后续建议

### 已完成

- ✅ 迁移到 `technicalindicators` 库
- ✅ 修复所有算法问题
- ✅ 通过所有测试
- ✅ 更新测试脚本

### 可选优化

1. **动态成交量阈值** - 根据股票波动性调整放量阈值（低波股票放宽到 1.4）
2. **Gauge 评分阈值优化** - 当前 -30~30 的 Neutral 区间过宽，建议对称化：
   - Strong Buy: score > 70
   - Buy: score > 40
   - Neutral: -40 ~ 40
   - Sell: score < -40
   - Strong Sell: score < -70
3. **止损位计算统一** - 当前有两种方法，建议明确使用场景

### 技术栈演进

- 当前：技术指标 → 硬编码评分 → 信号
- 未来：标准化指标 → LLM 解读 → 执行建议

---

## 🚀 使用方法

### 开发环境

```bash
cd stock-tracker
npm run check  # 类型检查
npx tsx server/test_indicators.ts  # 运行算法测试
```

### 生产环境

所有 API 端点已自动使用新的库实现，无需额外配置。

---

## 📚 参考

### technicalindicators 库文档

- GitHub: https://github.com/anandanuj84/technicalindicators
- 文档: https://github.com/anandanuj84/technicalindicators/tree/main/documentation

### 技术指标标准

- RSI: Wilder's Smoothing (J. Welles Wilder, 1978)
- EMA: Standard EMA with SMA seed
- MACD: Gerald Appel (1979)
- Stochastic (KDJ): George Lane (1950s)

---

**迁移完成时间**: 2026-01-10
**迁移人**: opencode + Grok（专家点评）
**状态**: ✅ 已完成并验证
