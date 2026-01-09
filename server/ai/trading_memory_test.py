"""
AI 交易助手边界测试
测试 LLM 的记忆、推理和工具调用能力
"""

import json
from dataclasses import dataclass, asdict
from datetime import datetime
from typing import List, Optional, Dict

# ==================== 数据模型 ====================

@dataclass
class Position:
    """持仓记录"""
    symbol: str
    name: str
    cost: float           # 成本价
    shares: int           # 持仓数量
    buy_date: str
    buy_reason: str
    stock_type: str       # 'value' | 'momentum' | 'event' | 'hot_money'
    target_price: Optional[float] = None
    stop_loss: Optional[float] = None

@dataclass
class Trade:
    """交易记录"""
    symbol: str
    name: str
    action: str           # 'buy' | 'sell'
    price: float
    shares: int
    date: str
    reason: str
    technical_signals: Dict  # 交易时的技术信号
    outcome: Optional[str] = None  # 'good' | 'bad' | 'neutral'
    lessons_learned: Optional[str] = None

@dataclass
class TradingLesson:
    """交易教训"""
    date: str
    symbol: str
    lesson: str
    signal_pattern: str   # 触发这个教训的信号模式
    action_to_avoid: str  # 应该避免的行为
    recommended_action: str  # 推荐的行为

@dataclass
class UserProfile:
    """用户画像"""
    risk_tolerance: str   # 'low' | 'medium' | 'high'
    holding_period: str   # 'short' | 'medium' | 'long'
    preferred_indicators: List[str]
    avoid_patterns: List[str]
    success_patterns: List[str]

# ==================== 记忆存储 ====================

class TradingMemory:
    """交易记忆系统"""
    
    def __init__(self):
        self.positions: List[Position] = []
        self.trades: List[Trade] = []
        self.lessons: List[TradingLesson] = []
        self.profile: Optional[UserProfile] = None
        
    def add_position(self, position: Position):
        # 检查是否已存在
        for i, p in enumerate(self.positions):
            if p.symbol == position.symbol:
                self.positions[i] = position
                return
        self.positions.append(position)
        
    def add_trade(self, trade: Trade):
        self.trades.append(trade)
        
    def add_lesson(self, lesson: TradingLesson):
        self.lessons.append(lesson)
        
    def get_position(self, symbol: str) -> Optional[Position]:
        for p in self.positions:
            if p.symbol == symbol:
                return p
        return None
    
    def get_trades_for_symbol(self, symbol: str) -> List[Trade]:
        return [t for t in self.trades if t.symbol == symbol]
    
    def get_relevant_lessons(self, symbol: str = None, signals: Dict = None) -> List[TradingLesson]:
        """获取相关的交易教训"""
        relevant = []
        for lesson in self.lessons:
            # 按股票筛选
            if symbol and lesson.symbol != symbol and lesson.symbol != '*':
                continue
            # 按信号模式匹配
            if signals and lesson.signal_pattern:
                # 简单的模式匹配
                if 'RSI<30' in lesson.signal_pattern and signals.get('rsi', 50) < 30:
                    relevant.append(lesson)
                elif 'MACD金叉' in lesson.signal_pattern and signals.get('macd_cross') == 'golden':
                    relevant.append(lesson)
            else:
                relevant.append(lesson)
        return relevant
    
    def to_context(self, symbol: str = None, signals: Dict = None) -> str:
        """生成 System Prompt 上下文"""
        context = []
        
        # 当前持仓
        if self.positions:
            context.append("## 当前持仓")
            for p in self.positions:
                if symbol is None or p.symbol == symbol:
                    context.append(f"- {p.name}({p.symbol}): 成本{p.cost}元, {p.shares}股")
                    if p.buy_reason:
                        context.append(f"  买入理由: {p.buy_reason}")
                    if p.target_price:
                        context.append(f"  目标价: {p.target_price}元")
                    if p.stop_loss:
                        context.append(f"  止损价: {p.stop_loss}元")
                    context.append(f"  类型: {p.stock_type}")
        
        # 历史交易
        relevant_trades = self.get_trades_for_symbol(symbol) if symbol else self.trades[-10:]
        if relevant_trades:
            context.append("\n## 该股票历史交易")
            for t in relevant_trades[-5:]:  # 最近5笔
                outcome_emoji = "✅" if t.outcome == 'good' else "❌" if t.outcome == 'bad' else "➖"
                context.append(f"- {t.date}: {t.action.upper()} {t.price}元 {t.shares}股 {outcome_emoji}")
                if t.lessons_learned:
                    context.append(f"  教训: {t.lessons_learned}")
        
        # 相关教训
        relevant_lessons = self.get_relevant_lessons(symbol, signals)
        if relevant_lessons:
            context.append("\n## 历史经验教训 ⚠️")
            for lesson in relevant_lessons[-5:]:
                context.append(f"- [{lesson.date}] {lesson.lesson}")
                context.append(f"  触发信号: {lesson.signal_pattern}")
                context.append(f"  避免: {lesson.action_to_avoid}")
                context.append(f"  推荐: {lesson.recommended_action}")
        
        # 用户偏好
        if self.profile:
            context.append("\n## 用户偏好")
            context.append(f"- 风险偏好: {self.profile.risk_tolerance}")
            context.append(f"- 持仓周期: {self.profile.holding_period}")
            if self.profile.avoid_patterns:
                context.append(f"- 避免模式: {', '.join(self.profile.avoid_patterns)}")
            if self.profile.success_patterns:
                context.append(f"- 成功模式: {', '.join(self.profile.success_patterns)}")
        
        return '\n'.join(context)
    
    def save(self, filepath: str):
        """保存记忆到文件"""
        data = {
            'positions': [asdict(p) for p in self.positions],
            'trades': [asdict(t) for t in self.trades],
            'lessons': [asdict(l) for l in self.lessons],
            'profile': asdict(self.profile) if self.profile else None
        }
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    
    def load(self, filepath: str):
        """从文件加载记忆"""
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
            self.positions = [Position(**p) for p in data.get('positions', [])]
            self.trades = [Trade(**t) for t in data.get('trades', [])]
            self.lessons = [TradingLesson(**l) for l in data.get('lessons', [])]
            if data.get('profile'):
                self.profile = UserProfile(**data['profile'])
        except FileNotFoundError:
            pass

# ==================== 测试用例 ====================

def create_test_memory() -> TradingMemory:
    """创建测试数据"""
    memory = TradingMemory()
    
    # 用户画像
    memory.profile = UserProfile(
        risk_tolerance='medium',
        holding_period='short',
        preferred_indicators=['MACD', 'RSI', '资金流向'],
        avoid_patterns=['RSI<30时清仓', '追高买入'],
        success_patterns=['分批减仓', '设置trailing stop', '资金票看资金不看PE']
    )
    
    # 当前持仓
    memory.add_position(Position(
        symbol='300433',
        name='蓝思科技',
        cost=25.5,
        shares=1000,
        buy_date='2026-01-02',
        buy_reason='苹果产业链龙头，消费电子复苏',
        stock_type='hot_money',
        target_price=35.0,
        stop_loss=22.0
    ))
    
    # 历史交易
    memory.add_trade(Trade(
        symbol='300433',
        name='蓝思科技',
        action='buy',
        price=25.5,
        shares=1000,
        date='2026-01-02',
        reason='苹果产业链龙头，消费电子复苏预期',
        technical_signals={'rsi': 45, 'macd': 'bullish', 'volume': 'normal'},
        outcome='good',
        lessons_learned=None
    ))
    
    memory.add_trade(Trade(
        symbol='300433',
        name='蓝思科技',
        action='sell',
        price=24.8,
        shares=1000,
        date='2026-01-08',
        reason='恐慌清仓，怕继续跌',
        technical_signals={'rsi': 25, 'macd': 'bearish', 'volume': 'high'},
        outcome='bad',
        lessons_learned='在RSI超卖区清仓，错过反弹10%'
    ))
    
    # 交易教训
    memory.add_lesson(TradingLesson(
        date='2026-01-08',
        symbol='300433',
        lesson='在RSI超卖区(RSI<30)恐慌清仓，错过第二天反弹10%',
        signal_pattern='RSI<30 + 放量阴线',
        action_to_avoid='在超卖区恐慌清仓',
        recommended_action='等待RSI回升至40以上，或分批减仓'
    ))
    
    memory.add_lesson(TradingLesson(
        date='2026-01-06',
        symbol='*',  # 通用教训
        lesson='资金票（短期靠资金炒作的股票）不需要看基本面PE/PB',
        signal_pattern='高换手率 + 主力净流入',
        action_to_avoid='对资金票做基本面分析',
        recommended_action='关注资金流向和市场情绪'
    ))
    
    return memory

def generate_system_prompt(memory: TradingMemory, current_symbol: str = None, current_signals: Dict = None) -> str:
    """生成完整的系统提示词"""
    base_prompt = """你是一个专业的A股交易助手。你的任务是帮助用户分析股票和做出交易决策。

## 你的工作流程

1. **获取实时数据**: 使用工具获取股票的实时行情、资金流向、技术指标
2. **检索历史记忆**: 查看用户在该股票上的历史操作和教训
3. **综合分析**: 结合实时数据和历史经验进行分析
4. **给出建议**: 提供具体的操作建议，包括买卖点位和仓位

## 重要规则

1. 在给出建议前，必须先调用工具获取实时数据
2. 如果用户持有该股票，必须考虑其成本价和止盈止损位
3. 必须参考"历史经验教训"中的模式，避免重蹈覆辙
4. 对于资金票，重点关注资金流向而非基本面

## 输出格式

当用户询问是否应该卖出时，你的回答应包含：

### 📊 实时数据
- 当前价格、涨跌幅
- 技术指标（RSI、MACD、KDJ）
- 资金流向

### 📈 技术信号
- 买入/卖出信号
- 支撑/压力位

### 📚 历史经验
- 相关的历史教训
- 过去类似情况的结果

### 💡 建议
- 具体操作建议
- 理由
- 风险提示

"""
    
    # 添加用户特定的上下文
    user_context = memory.to_context(current_symbol, current_signals)
    if user_context:
        base_prompt += f"\n## 用户上下文\n\n{user_context}\n"
    
    return base_prompt

# ==================== 主程序 ====================

if __name__ == '__main__':
    # 创建测试记忆
    memory = create_test_memory()
    
    # 模拟当前信号（假设当前RSI=28，接近超卖区）
    current_signals = {
        'rsi': 28,
        'macd': 'bearish',
        'macd_cross': None,
        'volume': 'high'
    }
    
    # 生成系统提示词
    system_prompt = generate_system_prompt(
        memory, 
        current_symbol='300433',
        current_signals=current_signals
    )
    
    print("=" * 80)
    print("生成的系统提示词:")
    print("=" * 80)
    print(system_prompt)
    print("=" * 80)
    
    # 保存记忆到文件
    memory.save('trading_memory.json')
    print("\n记忆已保存到 trading_memory.json")
    
    # 打印上下文（这是会注入到每次对话的内容）
    print("\n" + "=" * 80)
    print("用户上下文（每次对话都会注入）:")
    print("=" * 80)
    print(memory.to_context('300433', current_signals))
