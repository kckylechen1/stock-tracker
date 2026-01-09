"""
阳光电源 2025年9月 卖飞回测
"""

import sys
sys.path.append('.')
from full_analysis import analyze_stock, generate_report, get_kline_data
from datetime import datetime

def main():
    print("\n" + "📊 阳光电源(300274) 2025年9月 卖飞回测".center(60, "="))
    print(f"当前时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    
    symbol = "300274"
    
    # 先获取K线看看9月有哪些交易日
    print("获取K线数据...")
    klines = get_kline_data(symbol, count=200)
    
    if not klines:
        print("❌ 无法获取数据")
        return
    
    print(f"✅ 获取成功: {len(klines)} 条数据")
    
    # 找到9月的数据
    print("\n2025年9月交易日:")
    sep_dates = []
    for k in klines:
        if k['date'].startswith('2025-09'):
            sep_dates.append(k)
            print(f"   {k['date']} 收盘:{k['close']:.2f} 涨跌:{k['change_pct']:+.2f}%")
    
    if not sep_dates:
        print("❌ 未找到2025年9月的数据")
        return
    
    # 找到暴涨的日子（涨幅>5%）
    print("\n🔥 9月暴涨日:")
    surge_days = []
    for k in sep_dates:
        if k['change_pct'] > 5:
            print(f"   {k['date']} 涨幅:{k['change_pct']:+.2f}%")
            surge_days.append(k['date'])
    
    # 分析暴涨前一天的信号
    if surge_days:
        # 找到第一个暴涨日的前一个交易日
        first_surge = surge_days[0]
        surge_idx = None
        for i, k in enumerate(klines):
            if k['date'] == first_surge:
                surge_idx = i
                break
        
        if surge_idx and surge_idx > 0:
            day_before = klines[surge_idx - 1]['date']
            print(f"\n{'='*60}")
            print(f"📊 分析暴涨前一天: {day_before}")
            print(f"{'='*60}")
            
            result = analyze_stock(symbol, day_before)
            if result:
                print("\n" + generate_report(result))
            
            # 分析第一个暴涨日
            print(f"\n{'='*60}")
            print(f"📊 分析第一个暴涨日: {first_surge}")
            print(f"{'='*60}")
            
            result2 = analyze_stock(symbol, first_surge)
            if result2:
                print("\n" + generate_report(result2))
            
            # 如果有第二个暴涨日，也分析
            if len(surge_days) > 1:
                second_surge = surge_days[1]
                print(f"\n{'='*60}")
                print(f"📊 分析第二个暴涨日: {second_surge}")
                print(f"{'='*60}")
                
                result3 = analyze_stock(symbol, second_surge)
                if result3:
                    print("\n" + generate_report(result3))
    
    # 计算如果在暴涨前卖出错过了多少
    if len(surge_days) >= 2:
        # 找到暴涨前一天和最后一个暴涨日
        before_idx = None
        after_idx = None
        for i, k in enumerate(klines):
            if before_idx is None and k['date'] == surge_days[0]:
                before_idx = i - 1
            if k['date'] == surge_days[-1]:
                after_idx = i
        
        if before_idx and after_idx and before_idx >= 0:
            before_price = klines[before_idx]['close']
            after_price = klines[after_idx]['close']
            missed_return = (after_price - before_price) / before_price * 100
            
            print("\n" + "="*60)
            print("💰 卖飞损失计算")
            print("="*60)
            print(f"暴涨前价格 ({klines[before_idx]['date']}): {before_price:.2f}元")
            print(f"暴涨后价格 ({klines[after_idx]['date']}): {after_price:.2f}元")
            print(f"错过收益: {missed_return:+.2f}%")
            print("="*60)

if __name__ == "__main__":
    main()
