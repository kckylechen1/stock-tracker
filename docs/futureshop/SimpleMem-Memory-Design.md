# Stock-Tracker 证券分析框架 - SimpleMem 记忆结构完整设计
## ContextMemory、PortfolioMemory、OperationMemory 详细架构

**文档目标**: 为产品和架构师提供清晰的记忆层设计蓝图，指导开发团队实现。

---

## 📋 概览

SimpleMem 集成 4 层记忆结构：

| 记忆层 | 粒度 | 生命周期 | 查询频率 | 用途 |
|--------|------|---------|---------|------|
| **AnalysisMemory** | 快照级 | 7 天 | 高 (Step 6) | 识别用户整体风险和情绪 |
| **ContextMemory** | 用户级 | 长期 | 高 (每对话) | 维护用户画像和对话上下文 |
| **PortfolioMemory** | 持仓级 | 永久 | 中 (Step 4-6) | 跟踪单支股票的完整历史 |
| **OperationMemory** | 模式级 | 长期 | 中 (Step 6) | 学习操作成功/失败特征 |

---

## 🧠 2. ContextMemory (上下文记忆) - 完整设计

### 2.1 核心职责

```
为每个用户维护：
├─ 长期用户画像（跨对话持久化）
├─ 当前对话的上下文（焦点股票、已知信息）
├─ 学习历史（错误模式、成功模式）
├─ 个性化偏好（分析深度、沟通风格）
└─ 前置知识库（避免重复提问）
```

### 2.2 UserProfile 结构

```typescript
interface UserProfile {
  // ============================================
  // 用户基本信息（稳定，低频更新）
  // ============================================
  userId: string;
  registrationDate: string;
  tradingExperience: 'beginner' | 'intermediate' | 'advanced';
  preferredStrategy: 'technical' | 'fundamental' | 'sentiment' | 'mixed';
  accountSize: 'small' | 'medium' | 'large';  // 影响仓位建议
  
  // ============================================
  // 学习历史（持久累积）
  // ============================================
  learningHistory: {
    // 用户常犯的错误（带有改进标记）
    frequentMistakes: Array<{
      mistake: string;              // e.g., "追高卖低"、"过度交易"
      frequency: number;            // 发生次数
      lastOccurrence: string;        // 最后一次发生日期
      hasBeenAddressed: boolean;     // 是否已被用户纠正过
      feedbackGiven: number;         // 我们给过多少次反馈
    }>;
    
    // 需要改进的领域
    improvementAreas: Array<{
      area: string;                 // e.g., "止损执行"、"成本基础核实"
      priority: 'high' | 'medium' | 'low';
      recentMentioned: boolean;     // 最近是否提过
    }>;
    
    // 用户成功的模式
    successfulPatterns: Array<{
      pattern: string;               // e.g., "严格遵守止损"、"等待确认后进场"
      frequency: number;             // 使用过多少次
      successRate: number;           // 0-1，成功率
    }>;
    
    // 学习曲线（用于评估用户进步）
    winRateTrend: number[];          // 最近10个月的胜率趋势
    profitFactorTrend: number[];     // 最近10个月的利润因子趋势
    improvementTrend: 'improving' | 'stable' | 'regressing';
  };

  // ============================================
  // 个性化偏好（用户配置或推断）
  // ============================================
  preferences: {
    // 分析深度
    analysisDetailLevel: 'brief' | 'standard' | 'detailed';
    
    // 提问风格
    questionStyle: 'direct' | 'socratic';       
    // direct: "我建议买入" vs socratic: "您有想过为什么要买入吗？"
    
    // 数据呈现
    dataVisualization: 'text' | 'table' | 'chart';
    
    // 建议频率
    frequencyOfQuestions: 'none' | 'few' | 'many';
    
    // 沟通风格
    useEmoji: boolean;
    preferredLanguage: string;  // 简体中文 / 繁体中文 / 英文
    responseLength: 'concise' | 'balanced' | 'detailed';
    
    // 分析工具偏好
    technicalAnalysisFocus: string[];  // e.g., ["均线", "MACD", "成交量"]
    fundamentalDataPreference: string[];  // e.g., ["财务报表", "行业对比"]
  };

  // ============================================
  // 市场观点（用户自己的看法）
  // ============================================
  marketView: {
    currentOutlook: 'bullish' | 'neutral' | 'bearish';
    favoredSectors: string[];                   // e.g., ["科技", "新能源"]
    avoidedSectors: string[];
    marketViewUpdatedDate: string;
    
    // 长期看法（更稳定）
    longTermView: 'very_bullish' | 'bullish' | 'neutral' | 'bearish' | 'very_bearish';
    reasonForView: string;                      // 用户解释他的观点
  };

  // ============================================
  // 交易约束（用户自己设定的规则）
  // ============================================
  tradingConstraints: {
    maxPositions: number;          // 最多持仓多少支股票
    maxSinglePosition: number;     // 单支股票最多占比（%）
    maxDailyTrades: number;        // 每天最多交易多少次
    minHoldingDays: number;        // 最少持有多少天（止损的除外）
    forbiddenStocks: string[];     // 明确禁止的股票
  };

  // ============================================
  // 风险承受能力评估
  // ============================================
  riskProfile: {
    baseSelfAssessedRiskTolerance: number;  // 0-100，用户自评
    behavioralRiskTolerance: number;       // 0-100，根据历史行为推断
    actualRiskTolerance: number;           // 0-100，综合评分（我们在给建议时用这个）
    lastAssessmentDate: string;
  };
}
```

**ContextMemory 的使用场景:**
- **Step 1 (parseUserInput)**: 读取 knownFacts 避免重复提问同样的成本基础
- **Step 6 (personalizedQA)**: 根据 UserProfile.learningHistory 识别用户的弱点
- **Step 6 (responseStyle)**: 根据 preferences 调整回复的详细程度和风格
- **全流程**: 根据 tradingConstraints 确保建议不违反用户的自设规则

---

### 2.3 ConversationContext 结构

```typescript
interface ConversationContext {
  // ============================================
  // 当前对话的焦点（会话级，每次新对话重置）
  // ============================================
  currentSession: {
    sessionId: string;
    startTime: string;
    endTime?: string;
    
    // 本次对话的焦点
    focusStocks: string[];                      // 本次提问涉及的股票
    mainQueries: string[];                      // 用户提出的主要问题
    
    // 本次对话中的决策
    decisionsMade: Array<{
      decision: string;                         // 用户/我们做出的决策
      stocks: string[];                         // 涉及的股票
      reasoning: string;                        // 决策理由
      timestamp: string;
      userConfidence: number;                   // 0-100，用户对此决策的信心
      ourConfidence: number;                    // 0-100，我们对此决策的信心
    }>;
    
    // 对话流程跟踪
    analysisStepCompleted: number;              // 已完成到第几步（1-6）
    userSentimentTrend: 'improving' | 'stable' | 'deteriorating';  // 用户心态变化
    
    // 对话质量指标
    userEngagementLevel: 'low' | 'medium' | 'high';  // 用户参与度
  };

  // ============================================
  // 前置知识库（避免重复提问）
  // ============================================
  knownFacts: {
    [key: string]: {
      value: string | number;
      source: 'user_input' | 'inferred' | 'calculated';
      timestamp: string;
      confidence: number;  // 0-1，数据可信度
      validityPeriod: string;  // e.g., "3_days", "forever"
    };
  };
  
  // 使用示例：
  // knownFacts['AAPL_costBasis'] = { 
  //   value: '150.5', 
  //   source: 'user_input', 
  //   timestamp: '2024-01-20T10:00:00Z',
  //   confidence: 1.0,
  //   validityPeriod: 'forever'  // 成本基础不会改变
  // }
  // knownFacts['portfolio_totalValue'] = { 
  //   value: '50000', 
  //   source: 'calculated',
  //   timestamp: '2024-01-20T10:30:00Z',
  //   confidence: 0.95,
  //   validityPeriod: '1_hour'  // 每小时需要重新计算
  // }

  // ============================================
  // 智能提问状态（避免重复提同样的问题）
  // ============================================
  questioningState: {
    // 已问过的问题及用户的回答
    questionsAsked: Array<{
      question: string;
      askedAt: string;
      userAnswer?: string;
      answerClarityScore: number;  // 0-1，用户回答的清晰度
      followUpNeeded: boolean;     // 是否需要追问
    }>;
    
    // 需要追问的问题（用户没有完全回答）
    questionsNeedFollow: Array<{
      originalQuestion: string;
      followUpQuestion: string;
      priority: 'high' | 'medium' | 'low';
      attemptCount: number;  // 已追问过几次
    }>;
    
    // 信息缺口追踪
    informationGaps: Array<{
      gap: string;                              // e.g., "持仓成本"
      severity: 'critical' | 'important' | 'optional';
      askedCount: number;                       // 已问过几次
      userRefusedToAnswer: boolean;             // 用户拒绝回答过吗
    }>;
    
    // 用户的回答习惯
    userResponseQuality: {
      avgClarityScore: number;                  // 0-1
      doesUserProvideContext: boolean;          // 用户回答是否详细
      doesUserAskFollowQuestions: boolean;      // 用户会反问吗
      typicalResponseTimeSeconds: number;      // 平均回复速度
    };
  };
}
```

**ConversationContext 的使用场景:**
- **Step 1 (parseUserInput)**: 检查 questionsAsked 避免在同一对话中重复问同样的问题
- **Step 6 (questionsForClarification)**: 生成个性化问题时，查看 knownFacts 和 informationGaps
- **Step 6 (riskWarning)**: 如果 questionsNeedFollow 还有 critical 的问题未回答，优先提问而非直接给建议

---

## 3️⃣ PortfolioMemory (持仓记忆) - 完整设计

### 3.1 核心职责

```
为每支持仓的股票维护：
├─ 成本基础（购买历史、平均成本）
├─ 增减仓历史（为什么在什么价位买卖）
├─ 心理预期（目标价、止损价）
├─ 复盘结果（是否达成预期）
└─ 当前状态（实时更新）
```

**特别说明**: 一个用户可能有多个 PortfolioMemory，每支持仓一个。

### 3.2 HoldingMemory 结构

```typescript
interface HoldingMemory {
  // ============================================
  // 标识信息
  // ============================================
  code: string;                                 // e.g., "000858"
  symbol: string;                               // e.g., "五粮液"
  exchange: string;                             // 交易所，e.g., "szse"
  industryCategory: string;                     // 行业分类，e.g., "食品饮料"
  
  // ============================================
  // 成本基础（累积购买的总成本）
  // ============================================
  costBasis: {
    totalShares: number;                        // 总持股数
    avgPrice: number;                           // 平均成本价
    totalCost: number;                          // 总投入金额
    firstBuyDate: string;                       // 首次买入日期
    lastBuyDate: string;                        // 最后一次买入日期
    
    // 成本分层（如果有多次买入）
    costLayers: Array<{
      price: number;                            // 购买价格
      shares: number;                           // 购买数量
      date: string;                             // 购买日期
      reason: string;                           // 购买理由
      // e.g., "技术面突破", "业绩超预期", "加仓补跌"
    }>;
    
    // 购买过程的费用
    totalCommission: number;                    // 总手续费
    totalTax: number;                           // 总印花税
  };

  // ============================================
  // 增减仓历史（完整的交易记录）
  // ============================================
  transactionHistory: Array<{
    date: string;
    action: 'buy' | 'sell' | 'partial_sell';
    shares: number;
    price: number;
    
    // 交易的背景和理由
    reason: string;  
    // e.g., 
    // 买入: "技术面突破", "业绩公布前建仓", "补跌"
    // 卖出: "止损", "获利回吐", "资金调配", "止盈"
    
    // 当时的市场环境
    marketContext?: {
      sentiment: 'extreme_greed' | 'greed' | 'neutral' | 'fear' | 'extreme_fear';\n      trend: 'strong_bull' | 'bull' | 'neutral' | 'bear' | 'strong_bear';\n      keyEvent?: string;  // e.g., "央行降准", "业绩发布"
    };\n    \n    // 当时的账户状态\n    portfolioStatusAtTime?: {\n      totalAccountValue: number;\n      positionSize: number;  // 该股票占账户的比例\n      totalPositions: number;  // 当时持仓数量\n    };\n  }>;\n\n  // ============================================\n  // 心理预期（用户对这支股票的目标）\n  // ============================================\n  psychologicalExpectation: {\n    // 目标和底线\n    targetPrice: number;                        // 用户的目标价\n    targetPriceReason: string;                  // 为什么设这个目标\n    stopLossPrice: number;                      // 用户的止损价\n    stopLossReason: string;                     // 为什么在这里止损\n    \n    // 时间预期\n    holdingDaysExpected: number;                // 计划持有多少天\n    timeHorizonExpectation: 'short' | 'medium' | 'long';\n    \n    // 风险偏好\n    worstCaseAcceptable: number;                // 最多能承受的亏损百分比\n    bestCaseExpectation: number;                // 最乐观的涨幅预期\n    \n    // 用户的信心和理由\n    confidenceLevel: number;                    // 0-100\n    investmentThesis: string;                   // 投资逻辑（用户自己的理由）\n    // e.g., \n    // \"长期看好消费升级\"\n    // \"技术面突破加成交量配合\"\n    // \"估值洼地，业绩增长空间\"\n    \n    updateDate: string;                         // 预期最后更新时间\n    updateFrequency: 'daily' | 'weekly' | 'monthly';  // 用户多久更新一次\n  };\n\n  // ============================================\n  // 复盘结果（交易结束后的总结）\n  // ============================================\n  reviewResult?: {\n    date: string;                               // 复盘日期\n    exitPrice: number;                          // 卖出价\n    daysHeld: number;                           // 实际持有天数\n    \n    // 本次交易的成果\n    realizedPnl: number;                        // 已实现盈亏（金额）\n    realizedPnlPercent: number;                 // 已实现盈亏（百分比）\n    \n    // 对比预期的结果\n    outcome: \n      | 'achieved_target'       // 达成了目标价\n      | 'hit_stoploss'          // 触发了止损\n      | 'partial_profit'        // 部分获利\n      | 'early_exit'            // 提前离场\n      | 'forced_exit'           // 被迫离场（e.g. 融资到期）\n      | 'pending';              // 还在持仓（不算复盘）n    achievementRatio: number;                   // 0-1，实现预期的程度\n    // 如果目标100涨，实际涨70，则为0.7\n    // 如果目标不涨50，实际涨20，则为0.4\n    \n    // 复盘总结\n    lessonsLearned: string;                     // 从这次交易学到了什么\n    successFactors: string[];                   // 成功的要素\n    // e.g., [\"耐心等待确认\", \"严格遵守止损\", \"选股准确\"]\n    failureFactors: string[];                   // 失败的要素\n    // e.g., [\"情绪化割肉\", \"追高进场\", \"信息不足\"]\n    \n    // 与我们的分析对比\n    ourForecastedPrice?: number;                // 我们当时预测的目标价\n    ourForecastAccuracy: number;                // 0-1，我们预测的准确度\n    ourRecommendationWasCorrect: boolean;       // 我们的建议是否正确\n    \n    // 用户执行的质量\n    executionQuality: 'excellent' | 'good' | 'fair' | 'poor';\n    // 用户是否按照计划执行（e.g., 是否严格止损、是否过早离场）\n  };\n\n  // ============================================\n  // 当前状态（实时维护）\n  // ============================================\n  currentStatus: {\n    isActive: boolean;                          // 是否还持仓\n    currentPrice: number;                       // 最新价格\n    currentUnrealizedPnl: number;               // 未实现盈亏（金额）\n    currentUnrealizedPnlPercent: number;        // 未实现盈亏（百分比）\n    lastUpdateTime: string;                     // 最后更新时间\n    \n    // 对目标的进度\n    progressToTarget: number;                   // 0-1，完成目标的进度\n    // 如果目标150，成本100，当前125，则为0.5\n    progressToStoploss: number;                 // 还有多少空间到止损价\n  };\n\n  // ============================================\n  // 个性化标记（用于分类和学习）\n  // ============================================\n  tags: Array<{\n    tag: string;  \n    // e.g., \"高成长\", \"价值投资\", \"失败案例\", \"成功案例\", \n    //      \"追高买入\", \"底部布局\", \"技术突破\"\n    addedDate: string;\n  }>;\n  \n  // 用户对这支股票的备注\n  userNotes: string;  // 用户可以自由记录关于这支股票的想法\n}
```

**PortfolioMemory 的使用场景:**
- **Step 4 (riskAssessment)**: 读取 costBasis.avgPrice，对标当前价格计算浮盈亏
- **Step 5 (operationalAdvice)**: 读取 psychologicalExpectation，对标我们的分析结果
- **Step 6 (personalization)**: 读取 reviewResult，识别用户是否容易"过早止盈"或"延迟止损"
- **全流程**: 用户更新持仓时，更新 currentStatus

---

## 4️⃣ OperationMemory (操作记忆) - 完整设计

### 4.1 核心职责

```
为每类操作类型维护统计：
├─ 用户历史上这类操作的成功率
├─ 什么条件下用户这类操作成功率最高
├─ 这类操作有什么典型风险
├─ 用户在这类操作上相比市场平均的表现
└─ 是否建议用户继续做这类操作
```

**特别说明**: 这不是按单笔操作存储，而是按操作"类型"进行 aggregation。

### 4.2 OperationPattern 结构

```typescript
interface OperationPattern {
  // ============================================
  // 操作分类
  // ============================================
  patternId: string;                            
  // e.g., "chaseHigh_veryShortTerm", "technicalBreakout_shortTerm"
  
  operationType: 
    | 'chaseHigh'               // 追高进场\n    | 'cuttingLoss'             // 割肉离场\n    | 'technicalBreakout'       // 技术面突破进场\n    | 'fundamentalPick'         // 基本面选股\n    | 'swingTrade'              // 短线操作（1-5天）\n    | 'positionBuilding'        // 逐步建仓\n    | 'reversal'                // 反转操作（追底）\n    | 'earningsPlay'            // 业绩前后交易;\n  \n  timeframeCategory: 'very_short' | 'short' | 'medium' | 'long';\n  \n  // ============================================\n  // 成功率统计（基于历史数据聚合）\n  // ============================================\n  successMetrics: {\n    totalAttempts: number;                      // 历史上做过多少次\n    successCount: number;                       // 其中赚钱的次数\n    failureCount: number;                       // 亏钱的次数\n    pendingCount: number;                       // 还在持仓中的次数\n    \n    // 胜率\n    successRate: number;                        // 0-1\n    confidenceInterval: {\n      lower: number;  // 95% 置信区间下界\n      upper: number;  // 95% 置信区间上界\n    };\n    \n    // 收益分析\n    avgReturnSuccess: number;                   // 赚钱时的平均涨幅（%）\n    avgReturnFailure: number;                   // 亏钱时的平均跌幅（%）\n    profitFactor: number;                       // 平均盈利 / 平均亏损\n    \n    // 风险调整后的收益\n    sharpeRatio?: number;                       // 夏普比率\n    sortinoRatio?: number;                      // 索蒂诺比率\n    maxDrawdown: number;                        // 最大回撤（%）\n    \n    // 时间统计\n    avgHoldingDays: number;                     // 平均持有多久\n    medianHoldingDays: number;                  // 中位数持有天数\n    quickestProfit: number;                     // 最快多久获利\n    slowestProfit: number;                      // 最慢多久获利\n  };\n\n  // ============================================\n  // 触发条件（什么情况下用户做这类操作）\n  // ============================================\n  triggerConditions: {\n    // 市场宏观条件\n    marketCondition: Array<'strong_bull' | 'bull' | 'neutral' | 'bear' | 'strong_bear'>;\n    // 这类操作在什么市场环境下容易发生\n    // 如果只包含 'strong_bull'，说明用户只在疯牛中追高\n    \n    // 技术面信号\n    technicalSignals: Array<{\n      signal: string;           // e.g., \"volume_breakout\", \"gap_up\", \"touch_ma20\"\n      frequency: number;        // 0-1，这类操作中多少%伴随这个信号\n    }>;\n    \n    // 情绪面触发\n    sentimentContext: Array<{\n      sentiment: 'extreme_greed' | 'greed' | 'neutral' | 'fear' | 'extreme_fear';\n      frequency: number;\n    }>;\n    \n    // 时间周期性\n    seasonality: Array<{\n      timePattern: string;      // e.g., \"周一\", \"月初\", \"财报前\"\n      frequency: number;\n    }>;\n    \n    // 用户的心理状态\n    userEmotionalState: Array<{\n      state: string;  \n      // e.g., \"after_loss\" (亏损后), \"greed_phase\" (贪婪期), \"fomo\" (害怕错过)\n      frequency: number;\n    }>;\n  };\n\n  // ============================================\n  // 风险特征（这类操作通常怎么亏钱）\n  // ============================================\n  riskProfile: {\n    volatilityProfile: 'low' | 'medium' | 'high';\n    // 这类操作涉及的股票通常波动性如何\n    \n    maxConsecutiveLosses: number;               // 最多连续亏损过多少次\n    avgRecoveryTime: number;                    // 从亏损恢复的平均时间（天）\n    \n    // 黑天鹅风险（突发风险）\n    blackSwanRisks: Array<{\n      riskType: string;                         // e.g., \"利空突发\", \"流动性危机\"\n      frequency: number;                        // 0-1，发生过几次\n      severity: number;                         // 0-1，平均亏损幅度\n      exampleDates: string[];                   // 历史上哪些日期发生过\n    }>;\n    \n    // 对账户的影响\n    avgPositionSize: number;                    // 这类操作平均占账户多少\n    portfolioDrawdownContribution: number;      // 这类操作对账户最大回撤的贡献\n    \n    // 时间风险\n    avgTimeToRecover: number;                   // 亏损后平均多久恢复（天）\n    percentStillUnrecovered: number;            // 0-1，还没恢复的亏损占比\n  };\n\n  // ============================================\n  // 个性化评价（用户在这类操作上的表现）\n  // ============================================\n  personalReview: {\n    // 相对于市场平均的表现\n    userSuccessRateVsMarketAverage: number;     \n    // 1.0 = 与平均相同, 1.2 = 比平均好20%, 0.8 = 比平均差20%\n    userIsNaturalAtThisPattern: boolean;        // 用户天生擅长这类操作吗\n    \n    // 用户成功和失败的要素\n    whenUserSucceeds: string[];                 \n    // e.g., [\"有耐心等待确认\", \"严格止损\", \"选股细致\"]\n    \n    whenUserFails: string[];                    \n    // e.g., [\"追高进场\", \"情绪化割肉\", \"不止损\"]\n    \n    // 建议（最关键）\n    recommendation: \n      | 'highly_encouraged'      // 强烈建议继续\n      | 'encouraged'             // 建议继续\n      | 'neutral'                // 中立\n      | 'discouraged'            // 建议避免\n      | 'highly_discouraged';    // 强烈建议避免\n    \n    reason: string;              // 为什么这样建议\n    // e.g., \"您的追高成功率只有30%，远低于平均，建议改进选股逻辑\"\n    \n    // 改进建议\n    successTips: string[];       // 如果要做这类操作，如何提高成功率\n    // e.g., [\"等待3根K线确认\", \"在关键支撑位设置止损\", \"限制单次操作规模\"]\n    \n    riskMitigation: string[];    // 如何规避风险\n    // e.g., [\"避免在极度贪婪时操作\", \"不在重要数据前操作\"]\n  };\n\n  // ============================================\n  // 演变趋势（用户在改进吗）\n  // ============================================\n  trendAnalysis: {\n    successRateTrend: 'improving' | 'stable' | 'deteriorating';\n    recentSuccessRate: number;                  // 最近3个月的成功率\n    historicalSuccessRate: number;              // 历史平均成功率\n    performanceImprovement: number;             // -1到+1，改进程度\n    \n    // 如果在恶化，我们需要警告\n    isUserRegressionAlert: boolean;             // 用户最近表现变差吗\n  };\n\n  // ============================================\n  // 元数据\n  // ============================================\n  metadata: {\n    createdDate: string;\n    lastUpdatedDate: string;\n    sampleSize: number;                         // 统计基于多少笔操作\n    dataReliability: number;                    // 0-1，数据质量分数\n    // 样本数少 → 可靠性低\n    // 最近更新 → 可靠性高\n    // 这个值用于调整建议的强度\n  };\n}\n```\n\n### 4.3 OperationLog (单笔操作日志)\n\n```typescript\ninterface OperationLog {\n  // 唯一标识\n  id: string;\n  userId: string;\n  \n  // 操作信息\n  stock: string;\n  action: 'buy' | 'sell';\n  executionPrice: number;\n  executionTime: string;\n  shares: number;\n  \n  // 用户当时的状态\n  userMindsetAtExecution: {\n    confidence: number;  // 0-100\n    emotion: 'greed' | 'fear' | 'neutral';\n    marketOutlook: string;  // 用户当时怎么看市场\n    consecutiveLossesAtTime: number;  // 操作前连续亏损了几次\n  };\n  \n  // 我们当时的建议（如果有的话）\n  ourRecommendationAtTime?: {\n    recommendation: 'buy' | 'hold' | 'sell';\n    confidence: number;  // 0-100\n    targetPrice: number;\n  };\n  \n  // 操作结果（稍后填充）\n  result?: {\n    exitPrice?: number;\n    exitTime?: string;\n    daysHeld: number;\n    pnl: number;\n    pnlPercent: number;\n    outcome: 'profit' | 'loss' | 'pending';\n  };\n  \n  // 自动分类\n  classifiedAs?: string;  // 对标OperationPattern的patternId\n}\n```\n\n**OperationMemory 的使用场景:**\n- **Step 6 (personalRisk)**: 读取 triggerConditions，识别"当前是否是用户容易犯错的情况"\n- **Step 6 (questioning)**: 根据 personalReview.whenUserFails 生成警告性问题\n- **Step 6 (advice)**: 根据 recommendation 决定是否鼓励/劝阻这类操作\n- **学习反馈**: 每当操作完成后，更新相应的 OperationPattern\n\n---\n\n## 📊 四层记忆的更新流程\n\n### 流程 1: 用户首次提问某支股票\n\n```\n1. 检查 ContextMemory.knownFacts\n   ├─ 有成本基础信息吗？\n   └─ 如果没有，这是新股票\n\n2. 如果是新股票，创建 PortfolioMemory\n   ├─ 根据用户的回答初始化 costBasis 和 psychologicalExpectation\n   └─ currentStatus.isActive = true\n\n3. 执行 6 步分析\n   ├─ 每一步都查询相关的 Memory\n   └─ Step 6 高频查询 AnalysisMemory 和 OperationMemory\n\n4. 生成个性化建议\n   ├─ 根据 ContextMemory 调整建议风格\n   ├─ 根据 PortfolioMemory 对标成本\n   └─ 根据 OperationMemory 识别风险\n\n5. 保存结果\n   ├─ 更新 ContextMemory.knownFacts 记录新信息\n   ├─ 更新 ContextMemory.currentSession\n   └─ 如果是新持仓，创建 PortfolioMemory 的初始版本\n```\n\n### 流程 2: 用户操作完成后复盘\n\n```\n1. 用户通知系统: \"我在XX价卖出了YY股\"\n\n2. 更新 PortfolioMemory\n   ├─ transactionHistory 添加 sell 记录\n   ├─ 计算 realizedPnl 和 realizedPnlPercent\n   ├─ 填充 reviewResult\n   └─ currentStatus.isActive = false\n\n3. 创建 OperationLog\n   ├─ 记录操作的完整信息\n   └─ 待后续聚合时分类\n\n4. 定期聚合（每天或每周一次）\n   ├─ 读取最近的 OperationLog\n   ├─ 按 operationType 分组\n   ├─ 重新计算 OperationPattern 的 successMetrics\n   └─ 更新 trendAnalysis\n\n5. 更新 AnalysisMemory\n   ├─ 重新计算 CompressedPortfolio.stats\n   ├─ 重新计算 patterns\n   └─ 更新 emotionalPattern 标记（例如：有连续亏损）\n\n6. 更新 ContextMemory\n   └─ learningHistory 添加成功/失败案例\n```\n\n---\n\n## 🔑 设计要点总结\n\n| 层级 | 职责 | 粒度 | 生命周期 | 优先级 |\n|------|------|------|---------|--------|\n| **AnalysisMemory** | 快照：当前心态、操作模式 | 账户级 | 7 天 | HIGH |\n| **ContextMemory** | 长期：用户画像、对话状态 | 用户级 | 长期 | HIGH |\n| **PortfolioMemory** | 详情：单支股票的完整历史 | 持仓级 | 永久 | HIGH |\n| **OperationMemory** | 统计：操作类型的成功特征 | 模式级 | 长期 | MEDIUM |\n\n---\n\n**此文档为产品和架构师提供了清晰的数据结构设计蓝图。开发团队应基于此设计进行详细的 API 设计和数据库 Schema 设计。** 🚀"