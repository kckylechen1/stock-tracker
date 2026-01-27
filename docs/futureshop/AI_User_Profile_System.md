# AI交易顾问系统 - 用户Profile采集与管理文档

## 文档版本
- **版本**: 1.0
- **最后更新**: 2026年1月17日
- **目标受众**: 后端开发、AI/ML工程师、系统架构师

---

## 1. 系统概述

### 1.1 目的
构建一个完整的**用户画像系统**，通过AI驱动的问诊流程，收集、存储和管理交易者的关键特征数据，为后续的个性化交易顾问AI提供决策基础。

### 1.2 核心功能
- **自适应问诊**：AI根据用户回答动态调整后续问题
- **Profile结构化存储**：标准化用户特征数据模型
- **持续学习**：通过交易历史不断更新用户特征
- **实时决策支持**：基于Profile为用户提供个性化建议

### 1.3 业务价值
- 85%的交易失败源于心理因素，只有15%源于技术[source: trading psychology research]
- 当交易策略与交易者性格匹配时，执行率提高68%
- AI能减少40-60%的情绪化交易行为

---

## 2. 数据模型设计

### 2.1 用户Profile主体结构

```json
{
  "user_id": "string (UUID)",
  "created_at": "timestamp",
  "updated_at": "timestamp",
  "profile_version": "integer",
  
  "basic_info": {
    "name": "string",
    "nickname": "string (for addressing)",
    "age_range": "enum: 18-30, 30-45, 45-60, 60+",
    "profession": "string",
    "years_trading_experience": "integer",
    "trading_start_date": "date"
  },
  
  "financial_profile": {
    "total_trading_capital": "decimal (USD equivalent)",
    "monthly_available_amount": "decimal",
    "daily_trading_time_hours": "decimal",
    "trading_frequency": "enum: daily, 3-5x week, weekly, occasional",
    "primary_markets": ["stocks", "crypto", "futures", "forex"]
  },
  
  "risk_profile": {
    "risk_tolerance": "enum: conservative, moderate, aggressive",
    "single_trade_max_loss_pct": "decimal (e.g., 5)",
    "single_trade_max_loss_usd": "decimal",
    "daily_max_loss_pct": "decimal",
    "daily_max_loss_usd": "decimal",
    "monthly_max_loss_pct": "decimal",
    "annual_risk_budget_usd": "decimal",
    "max_position_size_pct": "decimal (e.g., 15)",
    "portfolio_concentration_tolerance": "enum: low, moderate, high"
  },
  
  "trading_goals": {
    "primary_objective": "enum: wealth_growth, income_generation, retirement_savings, risk_hedge, learning",
    "secondary_objectives": ["string"],
    "expected_holding_period": "enum: intraday, 1-7days, 1-4weeks, 1-3months, 6months+",
    "profit_taking_timeframe": "enum: quick_scalp, fast_return, patient_investor, very_long_term",
    "yearly_return_target_pct": "decimal (optional)"
  },
  
  "psychological_profile": {
    "decision_making_style": "enum: analytical, intuitive, mixed",
    "execution_style": "enum: systematic, flexible, mixed",
    "emotional_stability": "enum: low, moderate, high",
    "holding_tendency": "enum: holds_too_long, sells_too_early, balanced",
    "trend_following_tendency": "enum: strong_fomo, moderate_fomo, minimal_fomo",
    "loss_aversion_score": "decimal (1-10, 10=strongest)",
    "patience_score": "decimal (1-10, 10=most patient)",
    "overthinking_score": "decimal (1-10, 10=most overthinking)",
    "impulsivity_score": "decimal (1-10, 10=most impulsive)",
    "past_major_mistakes": [
      {
        "type": "enum: holding_too_long, selling_too_early, fomo_chasing, revenge_trading, over_leveraging",
        "frequency": "enum: rarely, sometimes, frequently, very_frequently",
        "impact": "enum: minor, moderate, significant",
        "description": "string"
      }
    ]
  },
  
  "technical_knowledge": {
    "familiarity_with_chanlun": "enum: not_familiar, beginner, intermediate, advanced, expert",
    "familiarity_with_fibonacci": "enum: not_familiar, beginner, intermediate, advanced, expert",
    "familiarity_with_ma_system": "enum: not_familiar, beginner, intermediate, advanced, expert",
    "familiarity_with_macd": "enum: not_familiar, beginner, intermediate, advanced, expert",
    "familiarity_with_rsi": "enum: not_familiar, beginner, intermediate, advanced, expert",
    "preferred_technical_framework": "enum: chanlun, fibonacci, moving_average, combined, chart_reading",
    "technical_analysis_confidence": "decimal (1-10)",
    "fundamental_analysis_usage": "enum: never, sometimes, often, primary_method"
  },
  
  "trading_constraints": {
    "geographic_restrictions": ["string (e.g., 'cannot trade US markets')"],
    "regulatory_constraints": ["string"],
    "time_zone": "string (e.g., 'Asia/Hong_Kong')",
    "trading_hours_available": {
      "monday_to_friday": {
        "start": "HH:MM",
        "end": "HH:MM",
        "timezone": "string"
      },
      "weekend": {
        "available": "boolean"
      }
    },
    "minimum_holding_period": "integer (hours, 0 for none)",
    "maximum_concurrent_positions": "integer"
  }
}
```

### 2.2 用户行为历史表

```json
{
  "behavior_history_id": "UUID",
  "user_id": "UUID",
  "timestamp": "timestamp",
  "session_type": "enum: questionnaire, trading_analysis, decision_query, report_review, feedback",
  "session_data": {
    "ai_questions_asked": ["string"],
    "user_responses": ["string"],
    "decisions_made": [
      {
        "ticker": "string",
        "decision": "enum: hold, sell_partial, sell_all, buy, add_position",
        "reason_stated": "string",
        "confidence_level": "decimal (1-10)",
        "emotional_state_detected": "enum: fearful, greedy, anxious, confident, calm"
      }
    ],
    "ai_recommendations": [
      {
        "recommendation": "string",
        "adopted": "boolean",
        "result": "enum: positive, neutral, negative (if known)"
      }
    ]
  }
}
```

### 2.3 持仓管理规则表

```json
{
  "position_rule_id": "UUID",
  "user_id": "UUID",
  "ticker": "string (or 'default' for all tickers)",
  "rule_type": "enum: profit_taking, stop_loss, scaling",
  "rules": {
    "profit_taking": {
      "enabled": "boolean",
      "stages": [
        {
          "profit_pct": "decimal (e.g., 20)",
          "sell_pct_of_position": "decimal (e.g., 0.33)",
          "action": "sell this amount when profit reaches this level"
        },
        {
          "profit_pct": "decimal (e.g., 50)",
          "sell_pct_of_position": "decimal (e.g., 0.33)",
          "action": "sell this amount when profit reaches this level"
        }
      ],
      "trailing_stop": {
        "enabled": "boolean",
        "trigger_profit_pct": "decimal",
        "trailing_distance_pct": "decimal"
      }
    },
    "stop_loss": {
      "enabled": "boolean",
      "fixed_loss_pct": "decimal (e.g., 7)",
      "technical_stop_price": "optional decimal",
      "enforce_strictly": "boolean (if true, AI must alert/execute)",
      "exceptions": ["string (e.g., 'only if fundamentals broken')"]
    },
    "scaling": {
      "allowed": "boolean",
      "max_additional_positions": "integer",
      "scaling_percentage": "decimal",
      "conditions": ["string"]
    }
  },
  "created_at": "timestamp",
  "last_modified": "timestamp"
}
```

---

## 3. 问诊流程设计

### 3.1 问诊架构

```
用户开始
    ↓
[初始化问诊 - 必答问题]
    ↓
[基础信息收集 - 5-7分钟]
  ├─ 称呼和年龄
  ├─ 交易经验
  ├─ 投资资金
  └─ 每天可投入时间
    ↓
[风险评估 - 7-10分钟]
  ├─ 风险承受度问题
  ├─ 历史亏损反应
  └─ 可接受的损失范围
    ↓
[交易风格分析 - 5-7分钟]
  ├─ 决策方式（分析型vs直觉型）
  ├─ 执行特点（系统化vs灵活）
  └─ 已知的心理弱点
    ↓
[技术水平评估 - 3-5分钟]
  ├─ 缠论理解
  ├─ 斐波那契理解
  └─ 其他技术指标
    ↓
[条件约束 - 2-3分钟]
  ├─ 地理/监管限制
  ├─ 时区
  └─ 最大仓位数
    ↓
[动态细化问题 - 基于回答]
  ├─ 如果选"拿不住"，追问历史案例
  ├─ 如果选"不止损"，追问恐惧类型
  └─ 如果选"追涨杀跌"，追问FOMO程度
    ↓
Profile完成 → 存储到数据库 → 显示总结 → 用户确认
```

### 3.2 AI问诊Prompt

```
你是一个资深的交易心理咨询师和风险管理专家。

你的任务是通过自然的对话方式，了解用户的交易特征。

【核心原则】
1. 对话自然流畅，像朋友聊天而非问卷填表
2. 根据用户回答动态调整后续问题（不要生硬地按顺序问）
3. 识别和深化关键的心理特征
4. 避免让用户感到被审判或评价
5. 每个回答都要简短确认，然后过渡到下一个问题

【问诊流程】
第1步：热身问候（1-2个问题）
  - "您好，请问怎么称呼您？"
  - "您从什么时候开始接触交易的？"

第2步：基础画像（5-7个问题）
  - 年龄、职业
  - 交易的主要资金规模
  - 每天能投入的时间

第3步：风险特征（6-8个问题）
  - 您对市场波动的反应？
  - 过去经历过最大的亏损是多少？那时的反应是什么？
  - 您能接受单笔交易亏损多少？

第4步：交易行为（8-10个问题）
  - 您更倾向于快速交易还是长期持仓？
  - 您经历过"拿不住"、"不割肉"、"追涨杀跌"这些情况吗？
  - 最后悔的交易是什么类型？

第5步：技术水平（4-5个问题）
  - 您对缠论的了解程度？
  - 您用过斐波那契吗？
  - 您通常用什么方法分析股票？

第6步：条件约束（2-3个问题）
  - 您所在的时区和交易时间限制？
  - 是否有地理或法律限制？

【跟进策略】
如果用户提到：
- "我总是拿不住" → 深化：具体是在涨5%、10%还是20%时就卖？有这样的记录吗？
- "我怕亏钱" → 深化：您最大能承受单笔亏损多少？那之后会不会后悔？
- "我经常后悔" → 深化：后悔卖早还是卖晚？能举个例子吗？

【数据提取】
每个用户回答后，在心里形成这样的mapping：
回答 → 对应Profile字段 → 存储的值

例如：
"我有3年经验，但最近1年才认真做"
→ years_trading_experience: 3
→ active_trading_start: 1年前

【结束】
收集完所有信息后：
"我对您有了大致的了解。让我总结一下：
- 您是一个{特征}的交易者
- 您最需要关注的是{心理弱点}
- 我会特别帮助您{具体帮助方式}

这个总结准确吗？需要调整吗？"
```

### 3.3 问题库（标准化）

#### Category: 基础信息

```yaml
Q1_NAME:
  question: "请问怎么称呼您？"
  type: "text"
  required: true
  field_mapping: "basic_info.name"
  follow_up: "Q2_AGE"

Q2_AGE:
  question: "您大概是多少岁的年龄段？"
  type: "multiple_choice"
  options: ["18-30", "30-45", "45-60", "60+"]
  required: true
  field_mapping: "basic_info.age_range"
  follow_up: "Q3_PROFESSION"

Q3_PROFESSION:
  question: "您的职业是什么？（可选）"
  type: "text"
  required: false
  field_mapping: "basic_info.profession"
  follow_up: "Q4_TRADING_EXP"

Q4_TRADING_EXP:
  question: "您有多少年的交易经验？"
  type: "number"
  unit: "years"
  required: true
  field_mapping: "basic_info.years_trading_experience"
  follow_up: "Q5_CAPITAL"

Q5_CAPITAL:
  question: "您用于交易的总资金大概是多少？"
  type: "multiple_choice"
  options:
    - "少于$10,000"
    - "$10,000-$50,000"
    - "$50,000-$100,000"
    - "$100,000-$500,000"
    - "$500,000+"
  required: true
  field_mapping: "financial_profile.total_trading_capital"
  follow_up: "Q6_DAILY_TIME"

Q6_DAILY_TIME:
  question: "您每天平均能投入多少时间进行交易或分析？"
  type: "multiple_choice"
  options:
    - "少于1小时"
    - "1-2小时"
    - "2-4小时"
    - "4小时以上"
  required: true
  field_mapping: "financial_profile.daily_trading_time_hours"
  follow_up: "Q7_FREQUENCY"
```

#### Category: 风险评估

```yaml
R1_RISK_TOLERANCE:
  question: "如果您的投资在一个月内下跌20%，您的反应最可能是？"
  type: "multiple_choice"
  options:
    - "立即全部清仓，宁可亏损也要逃出"
    - "有点焦虑，考虑减仓或观望"
    - "相对冷静，评估是否继续持仓"
    - "很镇定，甚至考虑加仓"
  required: true
  field_mapping: "risk_profile.risk_tolerance"
  scoring: 
    option_0: "conservative"
    option_1: "moderate"
    option_2: "moderate"
    option_3: "aggressive"
  follow_up: "R2_SINGLE_LOSS"

R2_SINGLE_LOSS:
  question: "单笔交易，您能接受的最大亏损是多少？"
  type: "multiple_choice"
  options:
    - "3%以内"
    - "5%以内"
    - "7-10%"
    - "10%以上"
    - "不确定"
  required: true
  field_mapping: "risk_profile.single_trade_max_loss_pct"
  follow_up: "R3_WORST_LOSS"

R3_WORST_LOSS:
  question: "您经历过最大的单笔亏损是多少？那时您是怎么反应的？"
  type: "text"
  required: false
  field_mapping: "psychological_profile.past_major_mistakes"
  dynamic_follow_up: "If mentioned'held until -50%' → R3a_HOLDING_TENDENCY"

R3a_HOLDING_TENDENCY:
  question: "您说您曾经亏损到-50%才卖出。现在回头看，您觉得那次经历对您的影响是？"
  type: "multiple_choice"
  options:
    - "让我学到了什么是止损的重要性"
    - "让我更加谨慎了"
    - "让我很后悔，但不确定以后会不会再犯"
    - "让我觉得应该早点卖出"
    - "我想忘记这段经历"
  field_mapping: "psychological_profile.loss_aversion_score"
  follow_up: "NEXT_CATEGORY"
```

#### Category: 交易行为特征

```yaml
B1_HOLDING_PATTERN:
  question: "您是否经历过这样的情况：一只股票涨了5-10%，您就开始不安，想卖掉？"
  type: "multiple_choice"
  options:
    - "从不，我能坚持持仓"
    - "很少这样想"
    - "有时会，特别是当出现负面新闻时"
    - "经常，我总是觉得见好就收比较安心"
    - "每次都这样，我拿不住"
  required: true
  field_mapping: "psychological_profile.holding_tendency"
  follow_up: "B2_SELLING_CONSEQUENCE"

B2_SELLING_CONSEQUENCE:
  condition: "if B1 answered in [3, 4]"
  question: "后来这些股票通常会怎样？您有后悔过卖太早吗？"
  type: "multiple_choice"
  options:
    - "经常后悔，有时涨到2-3倍"
    - "有时后悔，偶尔继续涨"
    - "没太多后悔，因为至少赚了钱"
    - "经常继续跌，所以卖对了"
  field_mapping: "psychological_profile.past_major_mistakes[].type"

B3_CUTLOSS_PATTERN:
  question: "当一只股票开始亏损时，您通常的反应是？"
  type: "multiple_choice"
  options:
    - "立即止损，执行计划"
    - "犹豫一下，但一般会执行止损"
    - "经常错过止损时机，希望反弹"
    - "很难割肉，通常会死扛"
  required: true
  field_mapping: "psychological_profile.holding_tendency"
  follow_up_dynamic: "if option 3 or 4 → B3a_CUTLOSS_CONSEQUENCE"

B3a_CUTLOSS_CONSEQUENCE:
  question: "在您死扛的那些交易中，最后的结果通常是？"
  type: "multiple_choice"
  options:
    - "最终反弹了，止损没有被触发"
    - "亏损越来越大，后来被迫止损"
    - "账户受到严重损害"
  field_mapping: "psychological_profile.past_major_mistakes[].impact"

B4_FOMO_PATTERN:
  question: "您是否经历过这样的情况：看到某个股票涨势凶猛，就急着追进去？"
  type: "multiple_choice"
  options:
    - "从不，我有严格的选股标准"
    - "很少，一般不会FOMO"
    - "有时会，特别是看到大盘涨时"
    - "经常会，看到涨停就想买"
    - "总是这样，害怕错过机会"
  field_mapping: "psychological_profile.trend_following_tendency"
  follow_up_dynamic: "if option 3, 4, 5 → B4a_FOMO_RESULT"

B4a_FOMO_RESULT:
  question: "通常这些冲动购买的结果如何？"
  type: "multiple_choice"
  options:
    - "一般都亏钱"
    - "一半赚一半亏"
    - "有时赚钱，但赚得很少"
  field_mapping: "psychological_profile.past_major_mistakes[].type"
```

#### Category: 技术知识

```yaml
T1_CHANLUN:
  question: "您对缠论（缠中说禅）的了解程度如何？"
  type: "multiple_choice"
  options:
    - "没听过"
    - "听过一些，但不太懂"
    - "有基本概念，能理解笔和线段"
    - "比较了解，能识别买卖点"
    - "非常精通，经常用在实战中"
  required: true
  field_mapping: "technical_knowledge.familiarity_with_chanlun"
  follow_up: "T2_FIBONACCI"

T2_FIBONACCI:
  question: "您使用过斐波那契比例（23.6%、38.2%、50%、61.8%等）吗？"
  type: "multiple_choice"
  options:
    - "从未使用过"
    - "听说过但没用过"
    - "用过一些，但不经常"
    - "经常用，用于设置目标位"
    - "经常用，也用于设置止损"
  field_mapping: "technical_knowledge.familiarity_with_fibonacci"
  follow_up: "T3_PREFERRED_METHOD"

T3_PREFERRED_METHOD:
  question: "您最常用的技术分析方法是什么？"
  type: "multiple_choice"
  options:
    - "均线系统（MA、EMA）"
    - "MACD指标"
    - "RSI和动量指标"
    - "K线形态"
    - "缠论"
    - "斐波那契"
    - "混合多种方法"
    - "主要看基本面，很少用技术分析"
  field_mapping: "technical_knowledge.preferred_technical_framework"
  follow_up: "NEXT_SECTION"
```

#### Category: 条件约束

```yaml
C1_TIMEZONE:
  question: "您所在的时区是？"
  type: "select"
  options: [
    "Asia/Hong_Kong (HKT)",
    "Asia/Shanghai (CST)",
    "Asia/Tokyo (JST)",
    "America/New_York (EST)",
    "America/Los_Angeles (PST)",
    "Europe/London (GMT)",
    "其他"
  ]
  required: true
  field_mapping: "trading_constraints.time_zone"
  follow_up: "C2_TRADING_HOURS"

C2_TRADING_HOURS:
  question: "您最常在什么时间段进行交易？"
  type: "time_range"
  required: false
  field_mapping: "trading_constraints.trading_hours_available"
  follow_up: "C3_MARKET_RESTRICTIONS"

C3_MARKET_RESTRICTIONS:
  question: "您是否有任何市场限制？（例如无法交易美股）"
  type: "multiple_choice"
  options:
    - "无限制，可以交易全球市场"
    - "只能交易港股和A股"
    - "可以交易美股、港股、A股"
    - "只能交易加密货币"
    - "其他限制"
  field_mapping: "trading_constraints.geographic_restrictions"
  follow_up: "QUESTIONNAIRE_COMPLETE"
```

---

## 4. 数据采集API设计

### 4.1 初始化问诊会话

**Endpoint**: `POST /api/v1/profiling/start`

**Request**:
```json
{
  "user_id": "UUID",
  "language": "zh-CN",
  "session_type": "initial_profiling" // or "update_profiling"
}
```

**Response**:
```json
{
  "session_id": "UUID",
  "status": "started",
  "first_question": {
    "question_id": "Q1_NAME",
    "question_text": "请问怎么称呼您？",
    "question_type": "text",
    "required": true
  },
  "session_metadata": {
    "estimated_duration_minutes": 25,
    "estimated_questions": 30,
    "language": "zh-CN"
  }
}
```

### 4.2 提交问答

**Endpoint**: `POST /api/v1/profiling/answer`

**Request**:
```json
{
  "session_id": "UUID",
  "question_id": "Q1_NAME",
  "answer": "张三",
  "timestamp": "2026-01-17T14:38:00Z"
}
```

**Response**:
```json
{
  "status": "answer_accepted",
  "field_mapped": "basic_info.name",
  "next_question": {
    "question_id": "Q2_AGE",
    "question_text": "您大概是多少岁的年龄段？",
    "question_type": "multiple_choice",
    "options": [
      {"value": "18-30", "display": "18-30岁"},
      {"value": "30-45", "display": "30-45岁"},
      {"value": "45-60", "display": "45-60岁"},
      {"value": "60+", "display": "60岁以上"}
    ]
  },
  "progress": {
    "questions_completed": 1,
    "total_estimated_questions": 30,
    "progress_percentage": 3.3
  }
}
```

### 4.3 完成问诊

**Endpoint**: `POST /api/v1/profiling/complete`

**Request**:
```json
{
  "session_id": "UUID",
  "confirm_data": true
}
```

**Response**:
```json
{
  "status": "profile_created",
  "profile_id": "UUID",
  "summary": {
    "user_name": "张三",
    "trading_style": "moderate_fomo_low_patience",
    "key_strengths": [
      "Has 3 years of trading experience",
      "Can tolerate moderate losses"
    ],
    "key_weaknesses": [
      "Tends to sell too early when stock rises 5-10%",
      "Often experiences FOMO and chases momentum",
      "Lacks stop-loss discipline"
    ],
    "recommended_focus_areas": [
      "Building patience with positions",
      "Implementing strict stop-loss rules",
      "Avoiding FOMO trades through pre-defined entry criteria"
    ]
  },
  "profile_data": { ...完整的JSON Profile }
}
```

### 4.4 获取用户Profile

**Endpoint**: `GET /api/v1/profiling/profile/{user_id}`

**Response**:
```json
{
  "profile": { ...完整的Profile数据结构 },
  "last_updated": "2026-01-17T14:38:00Z",
  "update_frequency_recommendation": "monthly",
  "next_scheduled_review": "2026-02-17"
}
```

### 4.5 更新用户Profile

**Endpoint**: `PATCH /api/v1/profiling/profile/{user_id}`

**Request**:
```json
{
  "fields_to_update": {
    "psychological_profile.emotional_stability": "high",
    "risk_profile.single_trade_max_loss_pct": 6,
    "trading_constraints.maximum_concurrent_positions": 5
  },
  "reason": "Based on recent trading behavior analysis"
}
```

**Response**:
```json
{
  "status": "profile_updated",
  "updated_fields": 3,
  "profile_version": 2,
  "updated_at": "2026-01-17T15:00:00Z"
}
```

---

## 5. 交易历史集成

### 5.1 记录交易决策

**Endpoint**: `POST /api/v1/profiling/record-decision`

**Request**:
```json
{
  "user_id": "UUID",
  "decision": {
    "timestamp": "2026-01-17T10:30:00Z",
    "ticker": "AAPL",
    "action": "sell_partial",
    "current_price": 195,
    "quantity": 50,
    "reason_stated": "Reached my 20% profit target",
    "ai_recommendation_given": true,
    "user_followed_ai_recommendation": true,
    "emotional_state_detected": "calm",
    "confidence_level": 8,
    "expected_outcome": "take_profit"
  }
}
```

### 5.2 记录交易结果

**Endpoint**: `POST /api/v1/profiling/record-trade-result`

**Request**:
```json
{
  "user_id": "UUID",
  "trade_result": {
    "trade_id": "UUID (from previous decision)",
    "ticker": "AAPL",
    "entry_price": 200,
    "exit_price": 195,
    "profit_loss_usd": -250,
    "profit_loss_pct": -2.5,
    "holding_duration_hours": 24,
    "exit_reason": "stop_loss_triggered",
    "outcome": "loss",
    "post_trade_sentiment": "frustrated",
    "what_would_have_happened": {
      "if_held": "stock_went_to_220 next day",
      "regret_level": 7
    }
  }
}
```

### 5.3 提取行为模式

**Endpoint**: `GET /api/v1/profiling/behavior-analysis/{user_id}`

**Query Params**:
```
?period=last_30_days
&include_metrics=true
```

**Response**:
```json
{
  "analysis_period": "2025-12-18 to 2026-01-17",
  "total_decisions_recorded": 42,
  "behavioral_patterns": {
    "selling_tendency": {
      "early_sellers": 24,
      "avg_hold_time_hours": 12,
      "typical_profit_taking": "5-10%",
      "regret_frequency": 0.57,
      "recommendation": "Increase profit targets to 15-20% to reduce early-selling regret"
    },
    "stop_loss_adherence": {
      "stop_loss_executed": 6,
      "stop_loss_ignored": 8,
      "adherence_rate": 0.43,
      "recommendation": "Implement automatic alerts for stop loss levels"
    },
    "fomo_trading": {
      "fomo_trades": 9,
      "fomo_success_rate": 0.22,
      "fomo_avg_loss_pct": -3.5,
      "recommendation": "Create a pre-trade checklist to prevent FOMO entries"
    },
    "emotional_patterns": {
      "trades_in_high_stress_times": 14,
      "success_rate_high_stress": 0.36,
      "trades_in_calm_state": 28,
      "success_rate_calm": 0.68,
      "recommendation": "Avoid trading during high-stress periods (e.g., after major losses)"
    }
  },
  "updated_profile_recommendations": {
    "psychological_profile.holding_tendency": "update from 'balanced' to 'sells_too_early'",
    "psychological_profile.loss_aversion_score": "decrease from 7 to 5",
    "psychological_profile.fomo_score": "increase from 6 to 8"
  }
}
```

---

## 6. 持仓管理规则配置

### 6.1 创建个人交易规则

**Endpoint**: `POST /api/v1/profiling/rules/create`

**Request**:
```json
{
  "user_id": "UUID",
  "ticker": "AAPL",  // or "default" for all tickers
  "rules": {
    "profit_taking": {
      "enabled": true,
      "stages": [
        {
          "profit_pct": 15,
          "sell_pct_of_position": 0.33,
          "description": "Sell 1/3 at 15% profit"
        },
        {
          "profit_pct": 30,
          "sell_pct_of_position": 0.33,
          "description": "Sell another 1/3 at 30% profit"
        }
      ],
      "trailing_stop": {
        "enabled": true,
        "trigger_profit_pct": 20,
        "trailing_distance_pct": 5
      }
    },
    "stop_loss": {
      "enabled": true,
      "fixed_loss_pct": 7,
      "enforce_strictly": true
    },
    "scaling": {
      "allowed": false,
      "max_additional_positions": 0
    }
  }
}
```

**Response**:
```json
{
  "status": "rules_created",
  "rule_id": "UUID",
  "ticker": "AAPL",
  "rules_summary": {
    "profit_taking_enabled": true,
    "num_profit_stages": 2,
    "stop_loss_enabled": true,
    "stop_loss_pct": 7,
    "scaling_allowed": false
  }
}
```

### 6.2 获取用户的所有交易规则

**Endpoint**: `GET /api/v1/profiling/rules/{user_id}`

**Response**:
```json
{
  "default_rules": { ...全局默认规则 },
  "ticker_specific_rules": [
    {
      "rule_id": "UUID",
      "ticker": "AAPL",
      "rules": { ...AAPL特定规则 }
    },
    {
      "rule_id": "UUID",
      "ticker": "TSLA",
      "rules": { ...TSLA特定规则 }
    }
  ]
}
```

---

## 7. Profile数据库Schema

### 7.1 用户Profile表

```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  profile_version INT DEFAULT 1,
  
  -- Basic Info
  name VARCHAR(255),
  nickname VARCHAR(255),
  age_range ENUM('18-30', '30-45', '45-60', '60+'),
  profession VARCHAR(255),
  
  -- Financial Profile
  total_trading_capital DECIMAL(15, 2),
  monthly_available_amount DECIMAL(15, 2),
  daily_trading_time_hours DECIMAL(5, 2),
  trading_frequency ENUM('daily', '3-5x week', 'weekly', 'occasional'),
  primary_markets JSON,
  
  -- Risk Profile
  risk_tolerance ENUM('conservative', 'moderate', 'aggressive'),
  single_trade_max_loss_pct DECIMAL(5, 2),
  single_trade_max_loss_usd DECIMAL(15, 2),
  daily_max_loss_pct DECIMAL(5, 2),
  daily_max_loss_usd DECIMAL(15, 2),
  monthly_max_loss_pct DECIMAL(5, 2),
  annual_risk_budget_usd DECIMAL(15, 2),
  max_position_size_pct DECIMAL(5, 2),
  portfolio_concentration_tolerance ENUM('low', 'moderate', 'high'),
  
  -- Trading Goals
  primary_objective ENUM(...),
  secondary_objectives JSON,
  expected_holding_period ENUM(...),
  profit_taking_timeframe ENUM(...),
  yearly_return_target_pct DECIMAL(5, 2),
  
  -- Psychological Profile
  decision_making_style ENUM('analytical', 'intuitive', 'mixed'),
  execution_style ENUM('systematic', 'flexible', 'mixed'),
  emotional_stability ENUM('low', 'moderate', 'high'),
  holding_tendency ENUM('holds_too_long', 'sells_too_early', 'balanced'),
  trend_following_tendency ENUM('strong_fomo', 'moderate_fomo', 'minimal_fomo'),
  loss_aversion_score DECIMAL(3, 1),
  patience_score DECIMAL(3, 1),
  overthinking_score DECIMAL(3, 1),
  impulsivity_score DECIMAL(3, 1),
  past_major_mistakes JSON,
  
  -- Technical Knowledge
  familiarity_with_chanlun ENUM('not_familiar', 'beginner', 'intermediate', 'advanced', 'expert'),
  familiarity_with_fibonacci ENUM(...),
  familiarity_with_ma_system ENUM(...),
  familiarity_with_macd ENUM(...),
  familiarity_with_rsi ENUM(...),
  preferred_technical_framework ENUM(...),
  technical_analysis_confidence DECIMAL(3, 1),
  fundamental_analysis_usage ENUM(...),
  
  -- Constraints
  geographic_restrictions JSON,
  regulatory_constraints JSON,
  time_zone VARCHAR(50),
  trading_hours_available JSON,
  minimum_holding_period INT,
  maximum_concurrent_positions INT,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW() ON UPDATE NOW(),
  created_by_session_id UUID,
  last_updated_reason VARCHAR(255),
  
  INDEX idx_user_id (user_id),
  INDEX idx_updated_at (updated_at)
);
```

### 7.2 行为历史表

```sql
CREATE TABLE user_behavior_history (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  session_type ENUM('questionnaire', 'trading_analysis', 'decision_query', 'report_review', 'feedback'),
  session_timestamp TIMESTAMP DEFAULT NOW(),
  
  ai_questions JSON,
  user_responses JSON,
  decisions_made JSON,
  ai_recommendations JSON,
  
  emotional_state_detected VARCHAR(50),
  session_duration_seconds INT,
  
  INDEX idx_user_id (user_id),
  INDEX idx_session_timestamp (session_timestamp),
  FOREIGN KEY (user_id) REFERENCES user_profiles(user_id)
);
```

### 7.3 交易规则表

```sql
CREATE TABLE position_management_rules (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  ticker VARCHAR(20),  -- NULL means default for all tickers
  
  profit_taking_enabled BOOLEAN,
  profit_taking_stages JSON,
  trailing_stop_enabled BOOLEAN,
  trailing_stop_trigger_pct DECIMAL(5, 2),
  trailing_stop_distance_pct DECIMAL(5, 2),
  
  stop_loss_enabled BOOLEAN,
  stop_loss_fixed_pct DECIMAL(5, 2),
  stop_loss_technical_price DECIMAL(15, 2),
  stop_loss_enforce_strictly BOOLEAN,
  
  scaling_allowed BOOLEAN,
  scaling_max_positions INT,
  scaling_percentage DECIMAL(5, 2),
  
  created_at TIMESTAMP DEFAULT NOW(),
  last_modified TIMESTAMP DEFAULT NOW() ON UPDATE NOW(),
  
  UNIQUE KEY unique_user_ticker (user_id, ticker),
  INDEX idx_user_id (user_id),
  FOREIGN KEY (user_id) REFERENCES user_profiles(user_id)
);
```

---

## 8. AI集成接口

### 8.1 获取用户Profile用于AI决策

**Endpoint**: `GET /api/v1/profiling/profile/{user_id}/for-ai`

**Response**:
```json
{
  "user_profile_summary": {
    "user_id": "UUID",
    "name": "张三",
    "trading_style": "early_seller_with_fomo_tendency",
    "key_weaknesses": [
      "Sells positions too early when up 5-10%",
      "Frequently FOMO-chases momentum",
      "Lacks strict stop-loss discipline"
    ],
    "key_strengths": [
      "3 years of trading experience",
      "Can tolerate moderate losses",
      "Willing to follow AI recommendations"
    ],
    "special_considerations": [
      "Tends to trade emotionally after big losses, suggest cooling-off period",
      "Responds well to structured decision frameworks",
      "Prefers Fibonacci analysis over Chanlun theory"
    ]
  },
  "position_rules": {
    "default": { ...default rules },
    "AAPL": { ...AAPL-specific rules }
  },
  "recent_behavior": {
    "last_7_days_decisions": 12,
    "emotional_state_trend": "improving",
    "adherence_to_rules": 0.67,
    "recent_regrets": ["Sold MSFT at $370, now $420"]
  }
}
```

### 8.2 AI使用Profile进行决策

将Profile作为Context注入到AI的System Prompt中：

```
用户Profile信息（来自API）：
{
  "name": "张三",
  "trading_style": "early_seller_with_fomo_tendency",
  "key_weaknesses": [
    "Sells positions too early when up 5-10%",
    "Frequently FOMO-chases momentum",
    "Lacks strict stop-loss discipline"
  ],
  "position_rules": {
    "AAPL": {
      "profit_taking_stages": [
        {"profit_pct": 15, "sell_pct": 0.33},
        {"profit_pct": 30, "sell_pct": 0.33}
      ],
      "stop_loss_pct": 7
    }
  }
}

---

用户提问："我的AAPL股票涨了8%，现在有点不安，想卖掉。"

AI的决策过程：
1. 识别用户特征：这是"early_seller"类型
2. 查看规则：AAPL的止盈目标是15%和30%，用户现在只涨8%
3. 识别心理状态：用户不安，可能是在情绪驱动下
4. 特别提醒：根据历史，这种情况下卖出通常会后悔

AI回答：
"张三，我看到您现在有点不安。让我帮您分析一下：

【您的规则】
  您为AAPL设定的目标是：
  - 15%利润时卖出1/3
  - 30%利润时再卖出1/3
  
  现在只涨了8%，还没到第一个目标。

【您的历史】
  过去30天，您有8次在5-10%盈利时卖出，后来有6次后悔了。
  这一次的概率也很高。

【建议】
  坚持您的规则。在15%时再卖。
  如果现在不安，可以减少关注，明天再看。
  
  记住：计划优于感觉。"
```

---

## 9. 数据隐私和安全

### 9.1 数据分类

```
Top Secret (TSEC):
- 用户的具体持仓信息
- 账户余额
- 交易历史和性能数据

Confidential (CONF):
- 用户的心理特征分析
- 用户的弱点和行为模式
- 个人偏好和约束

Internal (INT):
- Profile版本信息
- 系统生成的推荐
- 行为统计数据
```

### 9.2 访问控制

```
用户本人：
  ✓ 可以查看和编辑自己的完整Profile
  ✓ 可以导出自己的Profile数据
  ✓ 可以删除自己的账户数据

AI推荐系统：
  ✓ 可以访问Profile用于决策
  ✗ 不能修改Profile
  ✗ 不能访问账户余额（如果适用）

分析系统：
  ✓ 可以访问聚合的（去匿名化）Profile数据
  ✗ 不能访问个人身份信息
  ✗ 不能推导个人账户信息
```

### 9.3 数据加密

```
传输层：
- 所有API调用使用HTTPS TLS 1.3
- API Key通过Authorization header传输

存储层：
- 敏感字段（如account balance）加密存储
- 使用AES-256加密
- 密钥通过Key Management Service (KMS)管理

日志层：
- 不记录完整的Profile数据到日志
- 只记录Profile ID和操作类型
- 日志存储3个月后自动删除
```

---

## 10. 部署和监控

### 10.1 环境配置

```yaml
development:
  database: postgres://localhost/trading_ai_dev
  cache: redis://localhost:6379/0
  api_rate_limit: 1000 req/min per user
  profiling_timeout: 30 minutes

staging:
  database: postgres://staging-db.internal/trading_ai_staging
  cache: redis://staging-cache.internal:6379/1
  api_rate_limit: 5000 req/min per user
  profiling_timeout: 45 minutes

production:
  database: postgres://prod-db.internal/trading_ai_prod
  cache: redis-cluster://prod-cache-1,2,3:6379/0
  api_rate_limit: 10000 req/min per user
  profiling_timeout: 60 minutes
  backup_frequency: daily
  backup_retention: 90 days
```

### 10.2 关键指标监控

```
API Performance:
- API latency (p50, p95, p99)
- Error rate by endpoint
- Cache hit rate
- Database query performance

Data Quality:
- Profile completion rate
- Data validation error rate
- Missing critical fields %
- Profile update frequency

User Engagement:
- New profile creation rate
- Profile update rate
- Session completion rate
- Questionnaire dropout rate

System Health:
- Database connection pool utilization
- Cache memory usage
- API server CPU/memory
- Disk space usage
```

### 10.3 告警规则

```
Critical:
- API error rate > 5% for 5 minutes
- Database connection pool exhausted
- Disk space < 10%
- Profile creation taking > 2 minutes

Warning:
- API latency p95 > 500ms
- Profile completion rate < 70%
- Cache hit rate < 80%
- Database query time > 100ms for key endpoints

Info:
- Daily profile creation count
- Weekly active users
- Average session duration
```

---

## 11. 实现路线图

### Phase 1 (Week 1-2): MVP
- [ ] 设计和部署基础数据模型
- [ ] 实现20个核心问诊问题
- [ ] 构建API骨架
- [ ] 创建单一的Profile对象和CRUD操作

### Phase 2 (Week 3-4): 核心功能
- [ ] 完整的40个问诊问题库
- [ ] 动态问题逻辑引擎
- [ ] 用户行为历史记录
- [ ] Profile版本控制

### Phase 3 (Week 5-6): 集成与优化
- [ ] AI系统集成
- [ ] 持仓管理规则引擎
- [ ] 行为分析和模式识别
- [ ] 数据导出功能

### Phase 4 (Week 7-8): 生产就绪
- [ ] 安全加固和审计
- [ ] 性能优化
- [ ] 监控和告警系统
- [ ] 文档和培训

---

## 12. 开发清单

### 数据库层
- [ ] 创建user_profiles表
- [ ] 创建user_behavior_history表
- [ ] 创建position_management_rules表
- [ ] 创建索引和外键约束
- [ ] 设置数据备份和恢复流程

### API层
- [ ] POST /api/v1/profiling/start
- [ ] POST /api/v1/profiling/answer
- [ ] POST /api/v1/profiling/complete
- [ ] GET /api/v1/profiling/profile/{user_id}
- [ ] PATCH /api/v1/profiling/profile/{user_id}
- [ ] POST /api/v1/profiling/record-decision
- [ ] POST /api/v1/profiling/record-trade-result
- [ ] GET /api/v1/profiling/behavior-analysis/{user_id}
- [ ] POST /api/v1/profiling/rules/create
- [ ] GET /api/v1/profiling/rules/{user_id}
- [ ] GET /api/v1/profiling/profile/{user_id}/for-ai

### AI集成层
- [ ] 实现问诊Prompt引擎
- [ ] 实现情绪识别模块
- [ ] 实现决策历史分析
- [ ] 实现Profile更新推荐

### 前端/UI层 (Optional)
- [ ] 问诊对话界面
- [ ] Profile可视化展示
- [ ] 持仓规则配置界面
- [ ] 行为分析仪表板

---

## 13. 参考资源

### 交易心理学
- "Trading in the Zone" by Mark Douglas
- "The Psychology of Risk" by Jeff Stryker
- Academic papers on trader behavior biases

### 技术标准
- JSON Schema规范
- OpenAPI 3.1规范
- PostgreSQL最佳实践
- RESTful API设计指南

### 相关论文
- "Emotional Engagement and Trading Performance" (Management Science, 2023)
- "Performance and Risk of an AI-Driven Trading Framework" (2025)
- "AI Agents and Trading Psychology" (LuxAlgo Research, 2025)

---

## 14. 常见问题 (FAQ)

**Q: Profile更新的频率应该是多少？**
A: 建议每月进行一次主动更新，或在发生重大交易事件（如大额亏损、连续赢利）后立即更新。系统应该基于行为数据自动推荐更新。

**Q: 如果用户在问诊中给出矛盾的答案怎么办？**
A: 这很正常。系统应该：
1. 标记为"需要澄清"
2. 在后续问题中再次验证
3. 在Profile完成时告知用户矛盾之处
4. 让用户选择最准确的答案

**Q: 数据能否用于训练模型？**
A: 可以，但必须：
1. 获得用户明确同意
2. 对数据进行完全去匿名化
3. 使用federated learning或differential privacy技术
4. 符合当地法规（GDPR、CCPA等）

**Q: 如何处理用户改变交易风格的情况？**
A: 系统应该：
1. 定期（至少每季度）提醒用户更新Profile
2. 基于行为数据自动检测变化
3. 当检测到显著变化时，建议进行快速更新（5-10个关键问题）
4. 保留历史版本供追踪

**Q: 如果用户没有任何交易历史怎么办？**
A: 这很常见。系统应该：
1. 完全依赖问诊答案构建初始Profile
2. 在AI建议中使用更保守的假设
3. 持续更新，因为实际交易会快速改变初始Profile
4. 在前5笔交易后进行一次快速Profile更新

---

## 15. 版本历史

| 版本 | 日期 | 主要变更 |
|------|------|--------|
| 1.0 | 2026-01-17 | 初始版本发布，包含完整的系统设计和实现指南 |

---

**文档所有权**: Trading AI Team
**最后审查**: 2026年1月17日
**审查者**: Architecture Team
**下一次审查日期**: 2026年2月17日
