# Gauge评分逻辑详细说明

## 概述

Gauge评分层是整个系统的核心。它将10+个技术指标融合成一个**-100 ~ +100 的综合分数**，再映射到5档信号。

---

## 核心原理

### 四维度体系

```
趋势维度 (Trend)              动量维度 (Momentum)
  MACD                         RSI
  EMA                          KDJ
  ↓                            ↓
权重 25%                    权重 25%
  ↓────────────┬──────────┬────↓
              综合评分
             (-100~+100)
              ↑────────────┬──────────┬────↑
波动维度 (Volatility)        量能维度 (Volume)
  BOLL                       OBV
  CCI                        VR
  ↓                          VMACD
权重 20%                     ↓
                         权重 30%（最重要）
```

### 权重设置的理由

| 维度     | 权重 | 理由                                                                                    |
| -------- | ---- | --------------------------------------------------------------------------------------- |
| **趋势** | 25%  | A股日线跟随性强，但需要量能确认。中等权重。                                             |
| **动量** | 25%  | RSI/KDJ最容易反应短期超买超卖，帮助找入场点。同等权重。                                 |
| **波动** | 20%  | BOLL/CCI防止在震荡市买到高点，过滤假信号。降低权重。                                    |
| **量能** | 30%  | **最关键**。量能背离是强预警信号，价格虚假突破通常伴随量能不配合。A股特性：量能最重要。 |

---

## 步骤1：趋势维度评分

### 公式

```
S_trend = 0.6 × MACD_signal + 0.4 × EMA_signal
范围：[-100, +100]
```

### MACD信号规则

| 条件                     | 信号值         |
| ------------------------ | -------------- |
| DIF > DEA AND DIF > 0    | +100（强多头） |
| DIF < DEA AND DIF < 0    | -100（强空头） |
| DIF > 0 BUT DIF < DEA    | +30（转弱）    |
| DIF < 0 BUT DIF > DEA    | -30（转强）    |
| 其他（DIF ≈ DEA或接近0） | 0（模糊）      |

**逻辑**：

- DIF > DEA：短期EMA已超过长期EMA，趋势向上
- DIF > 0：整体处于上升趋势（绝对水位）
- 两个条件同时满足：最强的多头信号

### EMA信号规则

| 条件                 | 信号值      |
| -------------------- | ----------- |
| EMA_short > EMA_long | +50（上升） |
| EMA_short < EMA_long | -50（下降） |
| EMA_short ≈ EMA_long | 0（缠绕）   |

**逻辑**：更简单粗暴的趋势判断，权重40%。

### Python实现逻辑

```python
def score_trend(close_data):
    # 计算EMA和MACD
    ema12 = close_data.ewm(span=12).mean()
    ema26 = close_data.ewm(span=26).mean()
    dif = ema12 - ema26
    dea = dif.ewm(span=9).mean()

    # MACD信号
    if dif.iloc[-1] > dea.iloc[-1] and dif.iloc[-1] > 0:
        macd_sig = 100
    elif dif.iloc[-1] < dea.iloc[-1] and dif.iloc[-1] < 0:
        macd_sig = -100
    else:
        macd_sig = 0

    # EMA信号
    if ema12.iloc[-1] > ema26.iloc[-1]:
        ema_sig = 50
    elif ema12.iloc[-1] < ema26.iloc[-1]:
        ema_sig = -50
    else:
        ema_sig = 0

    return 0.6 * macd_sig + 0.4 * ema_sig
```

---

## 步骤2：动量维度评分

### 公式

```
S_momentum = 0.5 × RSI_signal + 0.5 × KDJ_signal
范围：[-100, +100]
```

### RSI信号规则

| RSI值范围 | 信号值 | 含义                 |
| --------- | ------ | -------------------- |
| > 70      | -80    | 极度超买，回调风险大 |
| 50-70     | +20    | 温和多头动力         |
| 30-50     | -20    | 温和空头动力         |
| < 30      | +80    | 极度超卖，反弹概率大 |

**逻辑**：

- RSI是一个"局部状态"指标，反映过去N期涨跌比例
- RSI > 70 或 < 30 通常不是持续方向，而是需要调整的信号
- A股日线中，RSI < 30 时次日反弹率超过60%

### KDJ信号规则（最复杂，最常用）

| 条件                       | 信号值 | 含义               |
| -------------------------- | ------ | ------------------ |
| K > D AND J > 50           | +50    | 强势动力，多头状态 |
| K < D AND J < 50           | -50    | 弱势动力，空头状态 |
| K 从下穿D变为上穿D（金叉） | +30    | 动力转好，买入信号 |
| K 从上穿D变为下穿D（死叉） | -30    | 动力转坏，卖出信号 |
| 其他                       | 0      | 模糊状态           |

**逻辑**：

- K > D：当前价格处于过去N期的较高位置，多头优势
- J 是"领先指标"，J > 50 意味着RSV（原始随机值）> 50，加权后K/D还没跟上
- 金叉/死叉：反应趋势转折点，非常关键

### Python实现逻辑

```python
def score_momentum(high_data, low_data, close_data):
    # RSI计算
    delta = close_data.diff()
    gain = delta.clip(lower=0).rolling(14).mean()
    loss = -delta.clip(upper=0).rolling(14).mean()
    rs = gain / (loss + 1e-9)
    rsi = 100 - 100 / (1 + rs)

    rsi_val = rsi.iloc[-1]
    if rsi_val > 70:
        rsi_sig = -80
    elif rsi_val < 30:
        rsi_sig = 80
    elif rsi_val >= 50:
        rsi_sig = 20
    elif rsi_val <= 50 and rsi_val >= 30:
        rsi_sig = -20
    else:
        rsi_sig = 0

    # KDJ计算
    low_n = low_data.rolling(9).min()
    high_n = high_data.rolling(9).max()
    rsv = (close_data - low_n) / (high_n - low_n + 1e-9) * 100
    k = rsv.ewm(alpha=1/3).mean()
    d = k.ewm(alpha=1/3).mean()
    j = 3 * k - 2 * d

    k_val, d_val, j_val = k.iloc[-1], d.iloc[-1], j.iloc[-1]

    # KDJ信号
    if k_val > d_val and j_val > 50:
        kdj_sig = 50
    elif k_val < d_val and j_val < 50:
        kdj_sig = -50
    elif k.iloc[-2] < d.iloc[-2] and k_val > d_val:  # 金叉
        kdj_sig = 30
    elif k.iloc[-2] > d.iloc[-2] and k_val < d_val:  # 死叉
        kdj_sig = -30
    else:
        kdj_sig = 0

    return 0.5 * rsi_sig + 0.5 * kdj_sig
```

---

## 步骤3：波动维度评分

### 公式

```
S_volatility = 0.5 × BOLL_signal + 0.5 × CCI_signal
范围：[-100, +100]
```

### BOLL信号规则

| 条件         | 信号值 | 含义               |
| ------------ | ------ | ------------------ |
| 价格 > 上轨  | +40    | 突破上方，可能新高 |
| 价格 < 下轨  | -40    | 突破下方，可能新低 |
| 价格接近中轨 | 0      | 均衡位置           |

**逻辑**：

- BOLL = MA ± 2×σ（中轨±2个标准差）
- 假设价格在-2σ到+2σ之间的概率约95%
- 超过上/下轨意味着"统计意义上的极端"，可能有三种情况：
  1. 新趋势启动（配合量能确认）
  2. 虚假突破（量能不配，容易回踩）
  3. 极端回调快要结束（超卖反弹）

### CCI信号规则

| CCI值范围  | 信号值 | 含义                             |
| ---------- | ------ | -------------------------------- |
| > 100      | -60    | 异常高位，极度偏离均值，下跌风险 |
| -100 ~ 100 | 0      | 正常波动范围                     |
| < -100     | +60    | 异常低位，极度偏离均值，反弹风险 |

**逻辑**：

- CCI = (Price - MA(Price)) / (0.015 × MD)
- CCI衡量的是价格相对于移动平均的标准差倍数（类似z-score）
- CCI > 100：价格严重脱离均值向上，通常在拉升到位后会回踩
- CCI < -100：价格严重脱离均值向下，通常在砸到位后会反弹

### Python实现逻辑

```python
def score_volatility(high_data, low_data, close_data):
    # BOLL计算
    ma20 = close_data.rolling(20).mean()
    std20 = close_data.rolling(20).std()
    boll_up = ma20 + 2 * std20
    boll_dn = ma20 - 2 * std20

    price = close_data.iloc[-1]
    if price > boll_up.iloc[-1]:
        boll_sig = 40
    elif price < boll_dn.iloc[-1]:
        boll_sig = -40
    else:
        boll_sig = 0

    # CCI计算
    tp = (high_data + low_data + close_data) / 3
    ma_tp = tp.rolling(14).mean()
    md = (tp - ma_tp).abs().rolling(14).mean()
    cci = (tp - ma_tp) / (0.015 * md + 1e-9)

    cci_val = cci.iloc[-1]
    if cci_val > 100:
        cci_sig = -60
    elif cci_val < -100:
        cci_sig = 60
    else:
        cci_sig = 0

    return 0.5 * boll_sig + 0.5 * cci_sig
```

---

## 步骤4：量能维度评分（最关键）

### 公式

```
S_volume = 0.4 × OBV_signal + 0.35 × VR_signal + 0.25 × VMACD_signal
范围：[-100, +100]
```

### OBV信号规则（价量关系）

| 条件                                 | 信号值 | 含义                           |
| ------------------------------------ | ------ | ------------------------------ |
| OBV > OBV_MA10 AND 价格 > 价格\_MA10 | +40    | 量价同步，强买入               |
| OBV > OBV_MA10 AND 价格 ≤ 价格\_MA10 | -20    | 底背离，机构偷偷吸筹           |
| OBV ≤ OBV_MA10 AND 价格 > 价格\_MA10 | -40    | 顶背离，机构悄悄出货（最危险） |
| OBV ≤ OBV_MA10 AND 价格 ≤ 价格\_MA10 | 0      | 双弱，无机会                   |

**逻辑**：

- OBV = cumsum(sign(ΔPrice) × Volume)，即"升日成交量 - 降日成交量"的累计
- OBV > MA10：近期成交量在增加
- 价格 > MA10：近期价格在上升
- 量价同步最安全；**量价背离最危险**（特别是顶背离，意味着价格创新高但无人跟风）

### VR信号规则（成交意愿）

| VR值范围  | 信号值 | 含义                             |
| --------- | ------ | -------------------------------- |
| > 1.3     | +30    | 上升日成交量远超下降日，买方活跃 |
| 0.8 ~ 1.2 | 0      | 成交量均衡                       |
| < 0.7     | -30    | 下降日成交量远超上升日，卖方活跃 |

**逻辑**：

- VR = sum(UpDayVolume) / sum(DownDayVolume)，即过去26天上升日的成交量占比
- VR > 1.3：多数日子在上升，且上升日的成交量更大，说明买方主动追涨
- VR < 0.7：多数日子在下跌，且下跌日的成交量更大，说明卖方主动砸盘

### VMACD信号规则（成交量趋势）

| 条件          | 信号值 | 含义             |
| ------------- | ------ | ---------------- |
| V_DIF > V_DEA | +20    | 成交量在加速上升 |
| V_DIF ≤ V_DEA | -20    | 成交量在加速下降 |

**逻辑**：

- 对成交量本身做MACD，反应成交热度的加速/减速
- V_DIF > V_DEA：短期成交量EMA > 长期，热度在上升
- 用于判断"成交量的持续性"

### Python实现逻辑

```python
def score_volume(close_data, volume_data):
    # OBV信号
    obv = (np.sign(close_data.diff()).fillna(0) * volume_data).cumsum()
    obv_ma10 = obv.rolling(10).mean()
    price_ma10 = close_data.rolling(10).mean()

    obv_up = obv.iloc[-1] > obv_ma10.iloc[-1]
    price_up = close_data.iloc[-1] > price_ma10.iloc[-1]

    if obv_up and price_up:
        obv_sig = 40
    elif obv_up and not price_up:
        obv_sig = -20  # 底背离
    elif not obv_up and price_up:
        obv_sig = -40  # 顶背离（最危险）
    else:
        obv_sig = 0

    # VR信号
    up_vol = volume_data.where(close_data > close_data.shift(), 0.0)
    dn_vol = volume_data.where(close_data < close_data.shift(), 0.0)
    vr = (up_vol.rolling(26).sum() + 1e-9) / (dn_vol.rolling(26).sum() + 1e-9)

    vr_val = vr.iloc[-1]
    if vr_val > 1.3:
        vr_sig = 30
    elif vr_val < 0.7:
        vr_sig = -30
    else:
        vr_sig = 0

    # VMACD信号
    v_ema12 = volume_data.ewm(span=12).mean()
    v_ema26 = volume_data.ewm(span=26).mean()
    v_dif = v_ema12 - v_ema26
    v_dea = v_dif.ewm(span=9).mean()

    if v_dif.iloc[-1] > v_dea.iloc[-1]:
        vmacd_sig = 20
    else:
        vmacd_sig = -20

    return 0.4 * obv_sig + 0.35 * vr_sig + 0.25 * vmacd_sig
```

---

## 步骤5：相关性调整（K1、K2、K3）

### 核心思想

**当多个独立指标同向时，信号更可靠。**

```python
# K1：趋势一致性
if sign(MACD) == sign(EMA):
    K1 = 1.2  # 两个趋势指标同向，加强
else:
    K1 = 0.6  # 两个趋势指标反向，减弱

# K2：动量一致性
if sign(RSI) == sign(KDJ):
    K2 = 1.15
else:
    K2 = 0.7

# K3：量能一致性
if sign(OBV) == sign(VR):
    K3 = 1.3   # 最强调：量能是最后防线
else:
    K3 = 0.5
```

### 直观理解

| 场景               | K值     | 含义                               |
| ------------------ | ------- | ---------------------------------- |
| MACD多头 + EMA多头 | K1=1.2  | 双重确认，趋势可靠性高             |
| MACD多头 + EMA空头 | K1=0.6  | 分歧，警惕虚假突破                 |
| RSI多头 + KDJ多头  | K2=1.15 | 双重确认，动量可靠性高             |
| OBV增加 + VR>1.3   | K3=1.3  | 双重确认，成交热度真实，**最信任** |
| OBV增加 + VR<0.7   | K3=0.5  | 分歧，可能虚假成交，**高风险**     |

---

## 步骤6：综合评分

### 公式

```
Score = 0.25 × S_trend × K1 +
        0.25 × S_momentum × K2 +
        0.20 × S_volatility +
        0.30 × S_volume × K3

Score ∈ [-100, +100]
```

### 示例计算

假设某日的指标值为：

```
S_trend = 50      (弱多头)
S_momentum = 35   (温和多头)
S_volatility = 30 (BOLL接近上轨，CCI接近0)
S_volume = 55     (量能温和增加)

K1 = 1.2  (MACD与EMA同向)
K2 = 1.15 (RSI与KDJ同向)
K3 = 1.3  (OBV与VR同向，最优)

Score = 0.25×50×1.2 + 0.25×35×1.15 + 0.20×30 + 0.30×55×1.3
      = 15 + 10.06 + 6 + 21.45
      = 52.51
```

---

## 步骤7：信号映射

### 映射规则

| Score范围 | 信号            | 行动             |
| --------- | --------------- | ---------------- |
| > 60      | **Strong Buy**  | 激进加仓或开新仓 |
| 30 ~ 60   | **Buy**         | 谨慎加仓或试仓   |
| -30 ~ 30  | **Neutral**     | 观望或小额持仓   |
| -60 ~ -30 | **Sell**        | 减仓或试空       |
| < -60     | **Strong Sell** | 激进减仓或开空仓 |

---

## 步骤8：置信度计算

### 公式

```
consensus_count = (S_trend > 30) + (S_momentum > 30) + (S_volatility > 30) + (S_volume > 30)
confidence = consensus_count / 4

confidence ∈ [0, 1]
```

### 含义

| 置信度     | 含义                                          |
| ---------- | --------------------------------------------- |
| 1.0 (4/4)  | 四维度全部向上，高度一致，**最高置信度**      |
| 0.75 (3/4) | 三维度向上，一个维度模糊/反向，**较高置信度** |
| 0.5 (2/4)  | 两维度向上，两维度向下，**中等置信度**，谨慎  |
| 0.25 (1/4) | 仅一维度向上，**低置信度**，多观望            |
| 0 (0/4)    | 四维度全部向下，虽然是卖出信号但反向逻辑      |

### 使用建议

```
if score > 30 and confidence > 0.75:
    执行买入信号  # 可靠
elif score > 30 and confidence > 0.5:
    考虑买入      # 谨慎
elif score > 30 and confidence <= 0.5:
    观望          # 等待更多确认
```

---

## 完整Python实现

```python
class AShareGaugeDaily:
    def calc_scores(self, df):
        """计算完整的Gauge评分"""

        # 1. 计算各维度分数
        df['S_trend'] = df.apply(self.score_trend, axis=1)
        df['S_momentum'] = df.apply(self.score_momentum, axis=1)
        df['S_volatility'] = df.apply(self.score_volatility, axis=1)
        df['S_volume'] = df.apply(self.score_volume, axis=1)

        # 2. 计算相关性调整因子
        df['K1'] = np.where(
            np.sign(df['DIF'] - df['DEA']) == np.sign(df['EMA_SHORT'] - df['EMA_LONG']),
            1.2, 0.6
        )
        df['K2'] = np.where(
            (df['RSI'] > 50) == (df['K'] > df['D']),
            1.15, 0.7
        )
        df['K3'] = np.where(
            (df['OBV'] > df['OBV_MA10']) == (df['VR'] > 1),
            1.3, 0.5
        )

        # 3. 获取自适应权重（根据市场状态）
        market_state = detect_market_regime(df)
        weights = get_adaptive_weights(market_state)

        # 4. 综合评分
        df['Score'] = (
            weights['trend'] * df['S_trend'] * df['K1'] +
            weights['momentum'] * df['S_momentum'] * df['K2'] +
            weights['volatility'] * df['S_volatility'] +
            weights['volume'] * df['S_volume'] * df['K3']
        ).clip(-100, 100)

        # 5. 信号映射
        bins = [-101, -60, -30, 30, 60, 101]
        labels = ['Strong Sell', 'Sell', 'Neutral', 'Buy', 'Strong Buy']
        df['Signal'] = pd.cut(df['Score'], bins=bins, labels=labels)

        # 6. 置信度
        consensus = (
            (df['S_trend'] > 30).astype(int) +
            (df['S_momentum'] > 30).astype(int) +
            (df['S_volatility'] > 30).astype(int) +
            (df['S_volume'] > 30).astype(int)
        )
        df['Confidence'] = consensus / 4

        return df
```

---

## 调试建议

当Gauge信号与实际行情不符时，排查顺序：

1. **检查数据完整性** - 是否有NaN/异常值
2. **检查指标计算** - 参数是否正确（参考日线vs周线参数表）
3. **检查维度权重** - 是否需要根据市场状态调整
4. **检查相关性调整** - K值是否应该调整阈值
5. **用历史数据回测** - 看这个信号在历史上的表现如何
