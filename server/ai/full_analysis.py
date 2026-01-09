"""
完整股票技术分析系统
基于 stock-trading-analysis-guide.md 的所有规则
"""

import json
import requests
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass

AKTOOLS_URL = "http://127.0.0.1:8081/api/public"

# ==================== 数据结构 ====================

@dataclass
class AnalysisResult:
    """分析结果"""
    symbol: str
    name: str
    date: str
    
    # 基础数据
    price: float
    change_pct: float
    volume: float
    
    # 均线
    ma5: float
    ma10: float
    ma20: float
    is_ma_bullish: bool  # 多头排列 MA5>MA10>MA20
    price_above_ma5: bool
    price_above_ma10: bool
    price_above_ma20: bool
    
    # MACD
    macd_dif: float
    macd_dea: float
    macd_histogram: float
    macd_is_red: bool  # 红柱
    macd_expanding: bool  # 红柱扩大
    macd_cross: str  # 'golden' | 'dead' | 'none'
    
    # RSI
    rsi: float
    rsi_zone: str  # 'oversold' | 'normal' | 'overbought'
    
    # KDJ
    kdj_k: float
    kdj_d: float
    kdj_j: float
    kdj_cross: str  # 'golden' | 'dead' | 'none'
    
    # 成交量
    vol_ratio: float  # 量比（相对5日均量）
    vol_status: str  # 'shrink' | 'normal' | 'expand'
    
    # 综合判断
    not_weakened_score: int  # "没走弱"得分（满分5分）
    not_weakened_items: List[str]  # 满足的条件
    should_hold: bool  # 是否应该持有
    should_sell: bool  # 是否应该卖出
    
    # 止损位
    stop_loss_aggressive: float  # 激进止损（MA5）
    stop_loss_moderate: float    # 稳健止损（MA10）
    stop_loss_conservative: float  # 保守止损（MA20）
    
    # 分批进场建议
    entry_suggestions: List[Dict]

# ==================== API 调用 ====================

def call_aktools(endpoint: str, params: dict = None) -> dict:
    """调用 AKTools API"""
    try:
        url = f"{AKTOOLS_URL}/{endpoint}"
        response = requests.get(url, params=params, timeout=30)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"   [AKTools Error] {endpoint}: {e}")
        return None

def get_stock_info(symbol: str) -> dict:
    """获取股票基本信息"""
    data = call_aktools("stock_individual_info_em", {"symbol": symbol})
    if data:
        info = {}
        for item in data:
            info[item.get("item")] = item.get("value")
        return {
            "symbol": symbol,
            "name": info.get("股票简称", ""),
            "price": float(info.get("最新", 0) or 0),
            "sector": info.get("行业", ""),
        }
    return None

def get_kline_data(symbol: str, count: int = 120) -> list:
    """获取K线数据"""
    end_date = datetime.now().strftime("%Y%m%d")
    start_date = (datetime.now() - timedelta(days=count * 2)).strftime("%Y%m%d")
    
    data = call_aktools("stock_zh_a_hist", {
        "symbol": symbol,
        "period": "daily",
        "start_date": start_date,
        "end_date": end_date,
        "adjust": "qfq"
    })
    
    if data:
        klines = []
        for item in data:
            date_str = item.get("日期", "")
            if 'T' in str(date_str):
                date_str = str(date_str).split('T')[0]
            klines.append({
                "date": date_str,
                "open": float(item.get("开盘", 0)),
                "close": float(item.get("收盘", 0)),
                "high": float(item.get("最高", 0)),
                "low": float(item.get("最低", 0)),
                "volume": float(item.get("成交量", 0)),
                "amount": float(item.get("成交额", 0)),
                "change_pct": float(item.get("涨跌幅", 0)),
            })
        return klines
    return []

# ==================== 技术指标计算 ====================

def calculate_ma(closes: list, period: int) -> list:
    """计算移动平均线"""
    if len(closes) < period:
        return [closes[-1]] * len(closes)
    
    result = []
    for i in range(len(closes)):
        if i < period - 1:
            result.append(sum(closes[:i+1]) / (i+1))
        else:
            result.append(sum(closes[i-period+1:i+1]) / period)
    return result

def calculate_ema(data: list, period: int) -> list:
    """计算指数移动平均"""
    if not data:
        return []
    result = [data[0]]
    multiplier = 2 / (period + 1)
    for i in range(1, len(data)):
        result.append((data[i] - result[-1]) * multiplier + result[-1])
    return result

def calculate_rsi(closes: list, period: int = 14) -> float:
    """计算 RSI"""
    if len(closes) < period + 1:
        return 50.0
    
    gains = []
    losses = []
    
    for i in range(1, len(closes)):
        change = closes[i] - closes[i-1]
        if change > 0:
            gains.append(change)
            losses.append(0)
        else:
            gains.append(0)
            losses.append(abs(change))
    
    avg_gain = sum(gains[-period:]) / period
    avg_loss = sum(losses[-period:]) / period
    
    if avg_loss == 0:
        return 100.0
    
    rs = avg_gain / avg_loss
    return round(100 - (100 / (1 + rs)), 2)

def calculate_macd(closes: list, fast=12, slow=26, signal=9) -> Tuple[list, list, list]:
    """计算 MACD"""
    if len(closes) < slow:
        return [0], [0], [0]
    
    ema_fast = calculate_ema(closes, fast)
    ema_slow = calculate_ema(closes, slow)
    
    dif_list = [ema_fast[i] - ema_slow[i] for i in range(len(ema_slow))]
    dea_list = calculate_ema(dif_list, signal)
    histogram = [dif_list[i] - dea_list[i] for i in range(len(dea_list))]
    
    return dif_list, dea_list, histogram

def calculate_kdj(highs: list, lows: list, closes: list, n=9) -> Tuple[list, list, list]:
    """计算 KDJ"""
    if len(closes) < n:
        return [50], [50], [50]
    
    k_list = []
    d_list = []
    j_list = []
    
    for i in range(n - 1, len(closes)):
        low_n = min(lows[i - n + 1:i + 1])
        high_n = max(highs[i - n + 1:i + 1])
        
        if high_n == low_n:
            rsv = 50
        else:
            rsv = (closes[i] - low_n) / (high_n - low_n) * 100
        
        if not k_list:
            k = rsv
        else:
            k = (2/3) * k_list[-1] + (1/3) * rsv
        
        if not d_list:
            d = k
        else:
            d = (2/3) * d_list[-1] + (1/3) * k
        
        j = 3 * k - 2 * d
        
        k_list.append(k)
        d_list.append(d)
        j_list.append(j)
    
    return k_list, d_list, j_list

# ==================== 核心分析逻辑 ====================

def analyze_stock(symbol: str, target_date: str = None) -> Optional[AnalysisResult]:
    """
    完整股票分析
    基于 stock-trading-analysis-guide.md 的所有规则
    """
    
    print(f"\n{'='*60}")
    print(f"📊 分析 {symbol}")
    print(f"{'='*60}")
    
    # 获取股票信息
    print("\n🔍 获取股票信息...")
    stock_info = get_stock_info(symbol)
    if not stock_info:
        print("❌ 无法获取股票信息")
        return None
    print(f"   ✅ {stock_info['name']}({symbol})")
    
    # 获取K线数据
    print("\n🔍 获取K线数据...")
    klines = get_kline_data(symbol, count=120)
    if not klines:
        print("❌ 无法获取K线数据")
        return None
    print(f"   ✅ {len(klines)} 条K线数据")
    
    # 确定分析日期
    if target_date:
        # 找到目标日期的索引
        target_idx = None
        for i, k in enumerate(klines):
            if k['date'] == target_date:
                target_idx = i
                break
        if target_idx is None:
            print(f"❌ 未找到 {target_date} 的数据")
            return None
    else:
        target_idx = len(klines) - 1
        target_date = klines[target_idx]['date']
    
    print(f"\n📅 分析日期: {target_date}")
    
    # 使用到目标日期为止的数据
    data = klines[:target_idx + 1]
    today = klines[target_idx]
    
    closes = [k['close'] for k in data]
    highs = [k['high'] for k in data]
    lows = [k['low'] for k in data]
    volumes = [k['volume'] for k in data]
    
    # ========== 计算所有指标 ==========
    print("\n🧮 计算技术指标...")
    
    # 均线
    ma5_list = calculate_ma(closes, 5)
    ma10_list = calculate_ma(closes, 10)
    ma20_list = calculate_ma(closes, 20)
    
    ma5 = ma5_list[-1]
    ma10 = ma10_list[-1]
    ma20 = ma20_list[-1]
    
    is_ma_bullish = ma5 > ma10 > ma20
    price_above_ma5 = today['close'] > ma5
    price_above_ma10 = today['close'] > ma10
    price_above_ma20 = today['close'] > ma20
    
    print(f"   MA5={ma5:.2f}, MA10={ma10:.2f}, MA20={ma20:.2f}")
    print(f"   多头排列: {'✅ 是' if is_ma_bullish else '❌ 否'}")
    
    # MACD
    dif_list, dea_list, histogram_list = calculate_macd(closes)
    macd_dif = dif_list[-1]
    macd_dea = dea_list[-1]
    macd_histogram = histogram_list[-1]
    macd_is_red = macd_histogram > 0
    
    # MACD 红柱是否扩大
    macd_expanding = False
    if len(histogram_list) >= 2:
        macd_expanding = histogram_list[-1] > histogram_list[-2]
    
    # MACD 金叉/死叉
    macd_cross = "none"
    if len(dif_list) >= 2 and len(dea_list) >= 2:
        if dif_list[-2] < dea_list[-2] and dif_list[-1] > dea_list[-1]:
            macd_cross = "golden"
        elif dif_list[-2] > dea_list[-2] and dif_list[-1] < dea_list[-1]:
            macd_cross = "dead"
    
    print(f"   MACD: DIF={macd_dif:.4f}, DEA={macd_dea:.4f}, 柱状={macd_histogram:.4f}")
    print(f"   红柱: {'✅ 是' if macd_is_red else '❌ 否'}, 扩大: {'✅ 是' if macd_expanding else '❌ 否'}")
    if macd_cross == "golden":
        print(f"   🟢🟢🟢 MACD 金叉！")
    elif macd_cross == "dead":
        print(f"   🔴🔴🔴 MACD 死叉！")
    
    # RSI
    rsi = calculate_rsi(closes)
    if rsi < 30:
        rsi_zone = "oversold"
    elif rsi > 70:
        rsi_zone = "overbought"
    else:
        rsi_zone = "normal"
    
    print(f"   RSI(14)={rsi} ({'超卖' if rsi_zone == 'oversold' else '超买' if rsi_zone == 'overbought' else '正常'})")
    
    # KDJ
    k_list, d_list, j_list = calculate_kdj(highs, lows, closes)
    kdj_k = k_list[-1] if k_list else 50
    kdj_d = d_list[-1] if d_list else 50
    kdj_j = j_list[-1] if j_list else 50
    
    # KDJ 金叉/死叉
    kdj_cross = "none"
    if len(k_list) >= 2 and len(d_list) >= 2:
        if k_list[-2] < d_list[-2] and k_list[-1] > d_list[-1]:
            kdj_cross = "golden"
        elif k_list[-2] > d_list[-2] and k_list[-1] < d_list[-1]:
            kdj_cross = "dead"
    
    print(f"   KDJ: K={kdj_k:.1f}, D={kdj_d:.1f}, J={kdj_j:.1f}")
    if kdj_cross == "golden":
        print(f"   🟢🟢🟢 KDJ 金叉！")
    elif kdj_cross == "dead":
        print(f"   🔴🔴🔴 KDJ 死叉！")
    
    # 成交量
    vol_avg_5 = sum(volumes[-5:]) / 5 if len(volumes) >= 5 else volumes[-1]
    vol_ratio = today['volume'] / vol_avg_5 if vol_avg_5 > 0 else 1
    
    if vol_ratio < 0.7:
        vol_status = "shrink"
    elif vol_ratio > 1.5:
        vol_status = "expand"
    else:
        vol_status = "normal"
    
    print(f"   量比={vol_ratio:.2f} ({'缩量' if vol_status == 'shrink' else '放量' if vol_status == 'expand' else '正常'})")
    
    # ========== "没走弱"判定（5项检查清单）==========
    print("\n📋 '没走弱'判定清单:")
    
    not_weakened_items = []
    not_weakened_score = 0
    
    # 1. 收盘价是否在MA5之上？
    if price_above_ma5:
        not_weakened_items.append("✅ 收盘价在MA5之上")
        not_weakened_score += 1
    else:
        not_weakened_items.append("❌ 收盘价跌破MA5")
    
    # 2. 收盘价是否在MA10之上？
    if price_above_ma10:
        not_weakened_items.append("✅ 收盘价在MA10之上")
        not_weakened_score += 1
    else:
        not_weakened_items.append("❌ 收盘价跌破MA10")
    
    # 3. MACD红柱是否存在？
    if macd_is_red:
        if macd_expanding:
            not_weakened_items.append("✅ MACD红柱存在且扩大")
        else:
            not_weakened_items.append("✅ MACD红柱存在（但在缩小）")
        not_weakened_score += 1
    else:
        not_weakened_items.append("❌ MACD已转绿柱")
    
    # 4. RSI是否在30以上？
    if rsi > 30:
        not_weakened_items.append(f"✅ RSI={rsi:.0f} 在30以上")
        not_weakened_score += 1
    else:
        not_weakened_items.append(f"❌ RSI={rsi:.0f} 处于超卖区")
    
    # 5. 成交量是否正常/缩量？（缩量回调是好信号）
    if vol_status in ["shrink", "normal"]:
        not_weakened_items.append(f"✅ 成交量{vol_status}（无砸盘迹象）")
        not_weakened_score += 1
    else:
        if today['change_pct'] < 0:
            not_weakened_items.append(f"❌ 放量下跌（有资金离场）")
        else:
            not_weakened_items.append(f"✅ 放量上涨（资金进场）")
            not_weakened_score += 1
    
    for item in not_weakened_items:
        print(f"   {item}")
    
    print(f"\n   📊 得分: {not_weakened_score}/5")
    
    # 判定规则（文档第102-104行）
    if not_weakened_score >= 3:
        should_hold = True
        hold_status = "hold"  # 持有
        print("   ✅ 满足3条以上 → 应该持有/可以回补")
    elif not_weakened_score >= 2:
        should_hold = False  # 谨慎观望，不能直接持有
        hold_status = "cautious"  # 谨慎
        print("   ⚠️ 满足2条 → 谨慎观望，等更明确信号")
    else:
        should_hold = False
        hold_status = "exit"  # 离场
        print("   ❌ 满足1条或以下 → 不应该持有/不应该回补")
    
    # ========== 卖出信号判断 ==========
    print("\n🔴 卖出信号检查:")
    
    should_sell = False
    sell_signals = []
    
    # 不应该卖的情况（文档第451-463行）
    no_sell_reasons = []
    
    if vol_status == "shrink":
        no_sell_reasons.append("成交量缩小（说明没有砸盘资金）")
    
    if macd_is_red:
        no_sell_reasons.append("MACD还有红柱（多头还没转弱）")
    
    if is_ma_bullish:
        no_sell_reasons.append("均线还在多头排列")
    
    # 应该卖的情况
    if macd_cross == "dead":
        sell_signals.append("🔴 MACD死叉")
        should_sell = True
    
    if not price_above_ma10 and vol_status == "expand":
        sell_signals.append("🔴 跌破MA10且放量")
        should_sell = True
    
    if len(sell_signals) > 0:
        print("   应该卖出的信号:")
        for sig in sell_signals:
            print(f"      {sig}")
    else:
        print("   ❌ 无卖出信号")
    
    if len(no_sell_reasons) > 0:
        print("   不应该卖的理由:")
        for reason in no_sell_reasons:
            print(f"      ✅ {reason}")
    
    # ========== 止损位计算 ==========
    stop_loss_aggressive = ma5
    stop_loss_moderate = ma10
    stop_loss_conservative = ma20
    
    print(f"\n🛡️ 止损位建议:")
    print(f"   激进止损（MA5）: {stop_loss_aggressive:.2f}元")
    print(f"   稳健止损（MA10）: {stop_loss_moderate:.2f}元")
    print(f"   保守止损（MA20）: {stop_loss_conservative:.2f}元")
    
    # ========== 分批进场建议 ==========
    entry_suggestions = []
    
    if should_hold and not should_sell:
        # 第一笔：回踩MA5
        entry_suggestions.append({
            "batch": 1,
            "position": "30-40%",
            "trigger": f"回踩MA5({ma5:.2f}元)但缩量",
            "entry_price": ma5,
            "stop_loss": ma10,
            "target": today['close'] * 1.1,
        })
        
        # 第二笔：回踩MA10
        entry_suggestions.append({
            "batch": 2,
            "position": "35-40%",
            "trigger": f"回踩MA10({ma10:.2f}元)但收不破",
            "entry_price": ma10,
            "stop_loss": ma20,
            "target": today['close'] * 1.15,
        })
        
        # 第三笔：突破新高
        recent_high = max([k['high'] for k in data[-20:]])
        entry_suggestions.append({
            "batch": 3,
            "position": "20-30%",
            "trigger": f"突破近期高点({recent_high:.2f}元)",
            "entry_price": recent_high,
            "stop_loss": ma5,
            "target": recent_high * 1.1,
        })
    
    print(f"\n📈 分批进场建议:")
    if entry_suggestions:
        for e in entry_suggestions:
            print(f"   第{e['batch']}笔 ({e['position']}): {e['trigger']}")
            print(f"      进场价: {e['entry_price']:.2f}, 止损: {e['stop_loss']:.2f}, 目标: {e['target']:.2f}")
    else:
        print("   ❌ 当前不建议进场")
    
    # 构建结果
    result = AnalysisResult(
        symbol=symbol,
        name=stock_info['name'],
        date=target_date,
        price=today['close'],
        change_pct=today['change_pct'],
        volume=today['volume'],
        ma5=ma5,
        ma10=ma10,
        ma20=ma20,
        is_ma_bullish=is_ma_bullish,
        price_above_ma5=price_above_ma5,
        price_above_ma10=price_above_ma10,
        price_above_ma20=price_above_ma20,
        macd_dif=macd_dif,
        macd_dea=macd_dea,
        macd_histogram=macd_histogram,
        macd_is_red=macd_is_red,
        macd_expanding=macd_expanding,
        macd_cross=macd_cross,
        rsi=rsi,
        rsi_zone=rsi_zone,
        kdj_k=kdj_k,
        kdj_d=kdj_d,
        kdj_j=kdj_j,
        kdj_cross=kdj_cross,
        vol_ratio=vol_ratio,
        vol_status=vol_status,
        not_weakened_score=not_weakened_score,
        not_weakened_items=not_weakened_items,
        should_hold=should_hold,
        should_sell=should_sell,
        stop_loss_aggressive=stop_loss_aggressive,
        stop_loss_moderate=stop_loss_moderate,
        stop_loss_conservative=stop_loss_conservative,
        entry_suggestions=entry_suggestions,
    )
    
    return result

def generate_report(result: AnalysisResult) -> str:
    """生成标准分析报告"""
    
    report = f"""
{'━'*60}
【日期】{result.date}
【股票】{result.name} {result.symbol}
{'━'*60}

一、日K面技术面评估

1.1 趋势判定
├─ MA系统：MA5({result.ma5:.2f}) {'>' if result.is_ma_bullish else '<'} MA10({result.ma10:.2f}) {'>' if result.ma10 > result.ma20 else '<'} MA20({result.ma20:.2f})
│  → {'✅ 多头排列' if result.is_ma_bullish else '❌ 非多头排列'}
├─ 收盘价位置：{result.price:.2f}元
│  → 在MA5 {'上方' if result.price_above_ma5 else '下方'} | 在MA10 {'上方' if result.price_above_ma10 else '下方'}
├─ MACD状态：{'🟢 红柱' if result.macd_is_red else '🔴 绿柱'} {'扩大中' if result.macd_expanding else '缩小中'}
│  → DIF={result.macd_dif:.4f}, DEA={result.macd_dea:.4f}
└─ 结论：{'✅ 没走弱，可考虑持有/回补' if result.should_hold else '❌ 有走弱信号，谨慎'}

1.2 支撑压力位
├─ 激进止损位（MA5）：{result.stop_loss_aggressive:.2f}元
├─ 稳健止损位（MA10）：{result.stop_loss_moderate:.2f}元
└─ 保守止损位（MA20）：{result.stop_loss_conservative:.2f}元

1.3 成交量分析
├─ 量比：{result.vol_ratio:.2f}
└─ 评价：{'📉 缩量' if result.vol_status == 'shrink' else '📈 放量' if result.vol_status == 'expand' else '➖ 正常'}

{'━'*60}

二、动能指标评估

2.1 RSI(14)
└─ 当前值：{result.rsi:.1f} ({'⚠️ 超买区' if result.rsi_zone == 'overbought' else '🟢 超卖区' if result.rsi_zone == 'oversold' else '正常区'})

2.2 MACD
├─ DIF：{result.macd_dif:.4f}
├─ DEA：{result.macd_dea:.4f}
├─ 柱状：{result.macd_histogram:.4f}
└─ 交叉：{'🟢 金叉' if result.macd_cross == 'golden' else '🔴 死叉' if result.macd_cross == 'dead' else '无交叉'}

2.3 KDJ
├─ K={result.kdj_k:.1f}, D={result.kdj_d:.1f}, J={result.kdj_j:.1f}
└─ 交叉：{'🟢 金叉' if result.kdj_cross == 'golden' else '🔴 死叉' if result.kdj_cross == 'dead' else '无交叉'}

{'━'*60}

三、"没走弱"综合判定

得分：{result.not_weakened_score}/5

"""
    for item in result.not_weakened_items:
        report += f"{item}\n"
    
    report += f"""
判定结果：{'✅ 满足条件，应该持有' if result.should_hold else '❌ 不满足条件，谨慎/离场'}
是否有卖出信号：{'🔴 是' if result.should_sell else '✅ 否'}

{'━'*60}

四、操作建议

"""
    
    if result.entry_suggestions:
        for e in result.entry_suggestions:
            report += f"""第{e['batch']}笔 ({e['position']})
├─ 触发条件：{e['trigger']}
├─ 进场价：{e['entry_price']:.2f}元
├─ 止损位：{e['stop_loss']:.2f}元
└─ 目标位：{e['target']:.2f}元

"""
    else:
        report += "当前不建议进场，等待更清晰信号。\n"
    
    report += f"""
{'━'*60}

风险提示：
⚠️ 投资有风险，以上分析仅供参考，不构成投资建议
⚠️ 如果跌破止损位，应严格执行止损
⚠️ 关注大盘整体走势，大盘大跌时个股难独善其身

{'━'*60}
"""
    
    return report

# ==================== 主程序 ====================

def main():
    print("\n" + "📊 完整股票技术分析系统".center(60, "="))
    print(f"当前时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("基于 stock-trading-analysis-guide.md 的所有规则\n")
    
    # 分析蓝思科技 - 周三（1月8日）
    print("\n" + "="*60)
    print("🔍 案例1: 蓝思科技(300433) 周三 2026-01-08")
    print("="*60)
    result1 = analyze_stock("300433", "2026-01-08")
    if result1:
        print("\n" + generate_report(result1))
    
    # 分析蓝思科技 - 周四（1月9日）
    print("\n" + "="*60)
    print("🔍 案例2: 蓝思科技(300433) 周四 2026-01-09")
    print("="*60)
    result2 = analyze_stock("300433", "2026-01-09")
    if result2:
        print("\n" + generate_report(result2))

if __name__ == "__main__":
    main()
