"""
历史信号回测 - 分析周三卖出和周四买入的信号
"""

import json
import requests
from datetime import datetime, timedelta
from typing import List, Dict

AKTOOLS_URL = "http://127.0.0.1:8081/api/public"

def call_aktools(endpoint: str, params: dict = None) -> dict:
    """调用 AKTools API"""
    try:
        url = f"{AKTOOLS_URL}/{endpoint}"
        response = requests.get(url, params=params, timeout=30)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"[AKTools Error] {endpoint}: {e}")
        return None

def get_kline_data(symbol: str, count: int = 100) -> list:
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
            klines.append({
                "date": item.get("日期", ""),
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
    rsi = 100 - (100 / (1 + rs))
    return round(rsi, 2)

def calculate_macd(closes: list, fast=12, slow=26, signal=9) -> dict:
    """计算 MACD"""
    if len(closes) < slow:
        return {"dif": 0, "dea": 0, "histogram": 0, "signal": "neutral"}
    
    def ema(data, period):
        result = [data[0]]
        multiplier = 2 / (period + 1)
        for i in range(1, len(data)):
            result.append((data[i] - result[-1]) * multiplier + result[-1])
        return result
    
    ema_fast = ema(closes, fast)
    ema_slow = ema(closes, slow)
    
    dif_list = [ema_fast[i] - ema_slow[i] for i in range(len(ema_slow))]
    dea_list = ema(dif_list, signal)
    
    return dif_list, dea_list

def calculate_kdj(highs: list, lows: list, closes: list, n=9, m1=3, m2=3) -> tuple:
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

def analyze_date(klines: list, target_date: str) -> dict:
    """分析特定日期的技术信号"""
    
    # 找到目标日期的索引（处理不同日期格式）
    target_idx = None
    for i, k in enumerate(klines):
        date_str = k['date']
        # 处理 2026-01-08T00:00:00.000 格式
        if 'T' in str(date_str):
            date_str = str(date_str).split('T')[0]
        if date_str == target_date:
            target_idx = i
            break
    
    if target_idx is None:
        return None
    
    # 使用到目标日期为止的数据计算指标
    data_until_date = klines[:target_idx + 1]
    closes = [k['close'] for k in data_until_date]
    highs = [k['high'] for k in data_until_date]
    lows = [k['low'] for k in data_until_date]
    volumes = [k['volume'] for k in data_until_date]
    
    # 计算指标
    rsi = calculate_rsi(closes)
    dif_list, dea_list = calculate_macd(closes)
    k_list, d_list, j_list = calculate_kdj(highs, lows, closes)
    
    # 当日数据
    today = klines[target_idx]
    
    # 前一天数据
    prev = klines[target_idx - 1] if target_idx > 0 else None
    
    # MACD 金叉/死叉检测
    macd_cross = "none"
    if len(dif_list) >= 2 and len(dea_list) >= 2:
        prev_dif = dif_list[-2]
        prev_dea = dea_list[-2]
        curr_dif = dif_list[-1]
        curr_dea = dea_list[-1]
        
        if prev_dif < prev_dea and curr_dif > curr_dea:
            macd_cross = "golden"  # 金叉
        elif prev_dif > prev_dea and curr_dif < curr_dea:
            macd_cross = "dead"    # 死叉
    
    # KDJ 金叉/死叉检测
    kdj_cross = "none"
    if len(k_list) >= 2 and len(d_list) >= 2:
        prev_k = k_list[-2]
        prev_d = d_list[-2]
        curr_k = k_list[-1]
        curr_d = d_list[-1]
        
        if prev_k < prev_d and curr_k > curr_d:
            kdj_cross = "golden"  # 金叉
        elif prev_k > prev_d and curr_k < curr_d:
            kdj_cross = "dead"    # 死叉
    
    # 成交量变化
    vol_avg_5 = sum(volumes[-5:]) / 5 if len(volumes) >= 5 else volumes[-1]
    vol_ratio = today['volume'] / vol_avg_5 if vol_avg_5 > 0 else 1
    
    return {
        "date": target_date,
        "open": today['open'],
        "close": today['close'],
        "high": today['high'],
        "low": today['low'],
        "change_pct": today['change_pct'],
        "volume": today['volume'],
        "rsi": rsi,
        "macd_dif": round(dif_list[-1], 4) if dif_list else 0,
        "macd_dea": round(dea_list[-1], 4) if dea_list else 0,
        "macd_histogram": round(dif_list[-1] - dea_list[-1], 4) if dif_list and dea_list else 0,
        "macd_cross": macd_cross,
        "kdj_k": round(k_list[-1], 2) if k_list else 50,
        "kdj_d": round(d_list[-1], 2) if d_list else 50,
        "kdj_j": round(j_list[-1], 2) if j_list else 50,
        "kdj_cross": kdj_cross,
        "vol_ratio": round(vol_ratio, 2),
    }

def print_analysis(analysis: dict, title: str):
    """打印分析结果"""
    print(f"\n{'='*60}")
    print(f"📊 {title}")
    print(f"{'='*60}")
    
    print(f"\n📈 基本数据")
    print(f"   日期: {analysis['date']}")
    print(f"   开盘: {analysis['open']:.2f}元")
    print(f"   收盘: {analysis['close']:.2f}元")
    print(f"   最高: {analysis['high']:.2f}元")
    print(f"   最低: {analysis['low']:.2f}元")
    print(f"   涨跌幅: {analysis['change_pct']:+.2f}%")
    
    print(f"\n📉 RSI 信号")
    rsi = analysis['rsi']
    if rsi < 30:
        rsi_signal = "🟢 超卖区 - 买入信号"
    elif rsi > 70:
        rsi_signal = "🔴 超买区 - 卖出信号"
    elif rsi >= 50:
        rsi_signal = "⬆️ 偏强"
    else:
        rsi_signal = "⬇️ 偏弱"
    print(f"   RSI(14) = {rsi} {rsi_signal}")
    
    print(f"\n📊 MACD 信号")
    print(f"   DIF = {analysis['macd_dif']}")
    print(f"   DEA = {analysis['macd_dea']}")
    print(f"   柱状 = {analysis['macd_histogram']}")
    if analysis['macd_cross'] == 'golden':
        print(f"   🟢🟢🟢 MACD 金叉 - 强烈买入信号！")
    elif analysis['macd_cross'] == 'dead':
        print(f"   🔴🔴🔴 MACD 死叉 - 强烈卖出信号！")
    else:
        print(f"   无交叉")
    
    print(f"\n📈 KDJ 信号")
    print(f"   K = {analysis['kdj_k']}")
    print(f"   D = {analysis['kdj_d']}")
    print(f"   J = {analysis['kdj_j']}")
    if analysis['kdj_cross'] == 'golden':
        print(f"   🟢🟢🟢 KDJ 金叉 - 买入信号！")
    elif analysis['kdj_cross'] == 'dead':
        print(f"   🔴🔴🔴 KDJ 死叉 - 卖出信号！")
    else:
        if analysis['kdj_k'] > analysis['kdj_d']:
            print(f"   K > D - 多头趋势")
        else:
            print(f"   K < D - 空头趋势")
    
    print(f"\n📦 成交量")
    vol_ratio = analysis['vol_ratio']
    if vol_ratio > 2:
        vol_signal = "🔥 放量（量比>{:.1f}）".format(vol_ratio)
    elif vol_ratio > 1.5:
        vol_signal = "📈 温和放量"
    elif vol_ratio < 0.5:
        vol_signal = "📉 缩量"
    else:
        vol_signal = "➖ 正常"
    print(f"   量比 = {vol_ratio} {vol_signal}")

def main():
    print("\n" + "🔍 蓝思科技(300433) 周三/周四信号回测".center(60, "="))
    print(f"当前时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # 获取K线数据
    print("\n获取K线数据...")
    symbol = "300433"
    klines = get_kline_data(symbol, count=100)
    
    if not klines:
        print("❌ 无法获取K线数据")
        return
    
    print(f"✅ 获取成功: {len(klines)} 条K线数据")
    print(f"   数据范围: {klines[0]['date']} ~ {klines[-1]['date']}")
    
    # 打印最近几天的日期
    print("\n最近交易日:")
    for k in klines[-5:]:
        print(f"   {k['date']} 收盘:{k['close']:.2f} 涨跌:{k['change_pct']:+.2f}%")
    
    # 分析周三 (2026-01-08)
    wed_analysis = analyze_date(klines, "2026-01-08")
    if wed_analysis:
        print_analysis(wed_analysis, "周三 2026-01-08 收盘时信号（你清仓的那天）")
        
        print("\n" + "-"*60)
        print("📌 周三复盘总结:")
        if wed_analysis['rsi'] < 30:
            print(f"   ⚠️ RSI={wed_analysis['rsi']} 处于超卖区，不应该卖！")
        if wed_analysis['kdj_j'] < 20:
            print(f"   ⚠️ KDJ J={wed_analysis['kdj_j']:.0f} 处于超卖区，不应该卖！")
        if wed_analysis['macd_histogram'] > wed_analysis.get('prev_histogram', 0):
            print(f"   ⚠️ MACD 柱状缩短，空头动能减弱")
    else:
        print("\n❌ 未找到 2026-01-08 的数据")
    
    # 分析周四 (2026-01-09)
    thu_analysis = analyze_date(klines, "2026-01-09")
    if thu_analysis:
        print_analysis(thu_analysis, "周四 2026-01-09 收盘时信号（反弹的那天）")
        
        print("\n" + "-"*60)
        print("📌 周四复盘总结:")
        if thu_analysis['change_pct'] > 5:
            print(f"   🚀 大涨 {thu_analysis['change_pct']:+.2f}%！错过了！")
        if thu_analysis['macd_cross'] == 'golden':
            print(f"   🟢 MACD 金叉确认反转！")
        if thu_analysis['kdj_cross'] == 'golden':
            print(f"   🟢 KDJ 金叉确认反转！")
    else:
        print("\n❌ 未找到 2026-01-09 的数据")
    
    # 综合结论
    print("\n" + "="*60)
    print("📚 综合结论")
    print("="*60)
    
    if wed_analysis and thu_analysis:
        wed_close = wed_analysis['close']
        thu_close = thu_analysis['close']
        missed_return = (thu_close - wed_close) / wed_close * 100
        
        print(f"\n周三收盘: {wed_close:.2f}元")
        print(f"周四收盘: {thu_close:.2f}元")
        print(f"错过收益: {missed_return:+.2f}%")
        
        print("\n🔑 关键教训:")
        print(f"   1. 周三 RSI={wed_analysis['rsi']:.0f}，{'超卖区' if wed_analysis['rsi'] < 30 else '偏低'}，不应恐慌清仓")
        print(f"   2. 周三成交量{'放量' if wed_analysis['vol_ratio'] > 1.5 else '正常'}，可能是洗盘而非出货")
        print(f"   3. 周四{'出现技术反转信号（金叉）' if thu_analysis['macd_cross'] == 'golden' or thu_analysis['kdj_cross'] == 'golden' else '延续反弹'}")

if __name__ == "__main__":
    main()
