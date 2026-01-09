"""
多股票回测测试
"""

import sys
sys.path.append('.')
from full_analysis import analyze_stock, generate_report

def main():
    print("\n" + "📊 多股票技术分析回测".center(60, "="))
    
    # 测试股票列表（可以修改）
    stocks = [
        # (代码, 名称, 分析日期)
        ("300433", "蓝思科技", None),      # 最新数据
        ("000625", "长安汽车", None),      # 汽车
        ("002594", "比亚迪", None),        # 新能源
        ("600519", "贵州茅台", None),      # 白酒
        ("300750", "宁德时代", None),      # 电池
    ]
    
    results = []
    
    for symbol, name, date in stocks:
        print(f"\n{'='*60}")
        print(f"分析: {name}({symbol})")
        print(f"{'='*60}")
        
        result = analyze_stock(symbol, date)
        if result:
            results.append(result)
            print(generate_report(result))
    
    # 汇总
    print("\n" + "="*60)
    print("📋 分析汇总")
    print("="*60)
    
    print(f"\n{'股票':<12} {'日期':<12} {'价格':<8} {'得分':<6} {'建议':<12}")
    print("-"*60)
    
    for r in results:
        if r.not_weakened_score >= 3:
            advice = "✅ 持有"
        elif r.not_weakened_score >= 2:
            advice = "⚠️ 谨慎"
        else:
            advice = "❌ 离场"
        
        if r.should_sell:
            advice = "🔴 卖出"
        
        print(f"{r.name:<10} {r.date:<12} {r.price:<8.2f} {r.not_weakened_score}/5   {advice:<12}")
    
    print("\n" + "="*60)

if __name__ == "__main__":
    main()
