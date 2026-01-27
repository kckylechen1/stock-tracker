# Stock-Tracker 证券分析框架 - SimpleMem集成版
## Model-Agnostic分析引擎 + 智能记忆管理

**设计原则**: 业务逻辑与模型完全解耦，SimpleMem负责所有状态管理

---

## 📐 核心架构

```
┌─────────────────────────────────────────────────────┐
│         业务分析层（Model-Independent）              │
│  ├─ 6步分析流程 (parseInput → review → analyze...)  │
│  ├─ 个性化提问引擎                                   │
│  ├─ 风险评估算法                                     │
│  └─ 操作建议生成器                                   │
├─────────────────────────────────────────────────────┤
│         SimpleMem记忆层（状态管理）                  │
│  ├─ AnalysisMemory: 持仓/操作/心态压缩               │
│  ├─ ContextMemory: 用户画像/偏好/历史提示词          │
│  ├─ PortfolioMemory: 持仓记忆索引                    │
│  └─ OperationMemory: 操作成功/失败模式学习           │
├─────────────────────────────────────────────────────┤
│         模型执行层（可插拔LLM接口）                  │
│  ├─ LLMProvider: 统一的模型调用接口                  │
│  ├─ ToolExecutor: 工具调用执行                      │
│  └─ DataFetcher: 实时数据获取                       │
└─────────────────────────────────────────────────────┘
```

---

## 🧠 SimpleMem记忆结构设计

### 1. AnalysisMemory (分析记忆)

```typescript
/**
 * AnalysisMemory - 证券分析核心记忆
 * 压缩持仓、操作历史、心态特征
 */

interface CompressedPortfolio {
  // 核心持仓信息
  holdings: {
    code: string;
    symbol: string;
    quantity: number;
    avgCost: number;
    currentPrice: number;
    pnl: number;
    pnlPercent: number;
    holdDays: number;
    timeframe: 'short' | 'medium' | 'long';
  }[];

  // 统计特征
  stats: {
    totalValue: number;
    totalPnl: number;
    totalPnlPercent: number;
    concentrationRatio: number; // 前3大持仓比例
    diversificationScore: number; // 0-100
  };

  // 操作模式识别（通过历史学习）
  patterns: {
    avgHoldDays: number;
    winRate: number; // 盈利交易比例
    profitFactor: number; // 平均盈利/平均亏损
    maxConsecutiveLosses: number;
    chaseHighTendency: number; // 0-1, 追高倾向指数
    pannicSellTendency: number; // 0-1, 割肉倾向指数
  };
}

interface CompressedOperations {
  // 最近30次操作快照
  recentOps: {
    stock: string;
    action: 'buy' | 'sell';
    price: number;
    date: string;
    outcome: 'profit' | 'loss' | 'pending';
    pnl: number;
  }[];

  // 周期性特征
  weeklyPattern: {
    preferredBuyDay: string; // 最常买入的星期
    preferredSellDay: string;
    bestTimeOfDay: string; // 交易时间段
  };

  // 情绪特征
  emotionalPattern: {
    hasLossAversion: boolean; // 是否有亏损厌恶
    chasingHighFrequency: number; // 追高频率
    overtradingRisk: boolean; // 过度交易倾向
    lastLossDate: string | null;
    consecutiveLossCount: number;
  };
}

interface UserMindset {
  // 心态评分
  confidence: number; // 0-100, 当前信心
  riskTolerance: number; // 0-100, 风险承受度
  timeHorizon: 'day' | 'week' | 'month' | 'quarter' | 'year';
  
  // 心理状态
  psychologicalState: {
    hasRecentLoss: boolean;
    isGreedyPhase: boolean;
    isFearPhase: boolean;
    overfitToRecentTrend: boolean;
  };

  // 决策质量指标
  decisionQuality: {
    analysisDepth: 'quick' | 'medium' | 'deep'; // 分析深度倾向
    timeSpentAnalyzing: number; // 分钟
    consultedSources: number; // 参考消息来源数
  };
}
```

### 2. ContextMemory (上下文记忆)

```typescript
/**
 * ContextMemory - 用户行为上下文
 * 维护个性化特征，指导Agent提问逻辑
 */

interface UserProfile {
  // 基本特征
  tradingExperience: 'beginner' | 'intermediate' | 'advanced';
  preferredStrategy: 'technical' | 'fundamental' | 'sentiment' | 'mixed';
  
  // 学习历史
  learningHistory: {
    frequentMistakes: string[]; // e.g., "追高卖低", "过度交易"
    improvementAreas: string[]; // 需要改进的地方
    successfulPatterns: string[]; // 成功的模式
  };

  // 个性化偏好
  preferences: {
    analysisDetailLevel: 'brief' | 'standard' | 'detailed';
    questionStyle: 'direct' | 'socratic'; // 直接建议 vs 启发式提问
    dataVisualization: 'text' | 'table' | 'chart';
    frequencyOfQuestions: 'none' | 'few' | 'many'; // 建议多少个问题
  };

  // 市场观点（用户自己的看法记忆）
  marketView: {
    currentOutlook: 'bullish' | 'neutral' | 'bearish';
    favoredSectors: string[];
    avoidedSectors: string[];
    lastUpdated: string;
  };
}

interface ConversationContext {
  // 当前对话上下文
  currentSession: {
    startTime: string;
    focusStocks: string[];
    mainQueries: string[];
    decisionsMade: {
      decision: string;
      reasoning: string;
      timestamp: string;
    }[];
  };

  // 前置知识（避免重复提问）
  knownFacts: {
    [key: string]: string; // "AAPL_costBasis" -> "150.5"
  };

  // 智能提问状态
  questioningState: {
    questionsAsked: string[];
    questionsNeedFollow: string[]; // 需要追问的问题
    informationGaps: string[];
  };
}
```

### 3. PortfolioMemory (持仓记忆)

```typescript
/**
 * PortfolioMemory - 持仓详细记忆
 * 完整的成本基础、增减仓历史、心理预期
 */

interface HoldingMemory {
  code: string;
  symbol: string;
  
  // 成本基础
  costBasis: {
    totalShares: number;
    avgPrice: number;
    totalCost: number;
    firstBuyDate: string;
    lastBuyDate: string;
  };

  // 增减仓历史
  transactionHistory: {
    date: string;
    action: 'buy' | 'sell' | 'partial_sell';
    shares: number;
    price: number;
    reason: string; // e.g., "技术面突破", "止损"
  }[];

  // 心理预期
  psychologicalExpectation: {
    targetPrice: number; // 用户的目标价
    stopLossPrice: number; // 用户的止损价
    holdingDaysExpected: number; // 计划持有天数
    worstCaseLossAcceptable: number; // 最多能承受的亏损%
  };

  // 复盘结果
  reviewResult?: {
    date: string;
    currentPrice: number;
    pnl: number;
    pnlPercent: number;
    outcome: 'achieved_target' | 'hit_stoploss' | 'pending' | 'exited_early';
    lessonsLearned: string;
  };
}
```

### 4. OperationMemory (操作记忆)

```typescript
/**
 * OperationMemory - 操作成功/失败模式学习
 * 识别什么情况下容易犯错
 */

interface OperationPattern {
  // 操作分类
  operationType: 'chaseHigh' | 'cuttingLoss' | 'longTermHold' | 'swingTrade' | 'dayTrade';
  
  // 成功率统计
  successMetrics: {
    totalAttempts: number;
    successCount: number;
    failureCount: number;
    avgReturnSuccess: number;
    avgReturnFailure: number;
    profitFactor: number;
  };

  // 触发条件
  triggerConditions: {
    marketCondition: 'strong_bull' | 'bull' | 'neutral' | 'bear' | 'strong_bear';
    volumePattern: 'volume_breakout' | 'volume_accumulation' | 'volume_decline';
    sentiment: 'extreme_greed' | 'greed' | 'neutral' | 'fear' | 'extreme_fear';
  };

  // 风险特征
  riskProfile: {
    maxDrawdown: number;
    volatility: number;
    recoveryTime: number; // 天
    blackSwanRisk: string[];
  };

  // 个人化评价
  personalReview: {
    whenUserSucceeds: string[]; // e.g., "有耐心等待确认", "严格止损"
    whenUserFails: string[]; // e.g., "追高进场", "情绪化割肉"
    recommendation: string; // 是否建议此操作类型
  };
}
```

---

## 📋 6步分析框架（Business Logic）

```typescript
/**
 * StockAnalysisFramework - 6步分析流程
 * 完全独立于模型选择，由SimpleMem驱动
 */

export class StockAnalysisFramework {
  private memory: AnalysisMemoryManager; // SimpleMem实例

  /**
   * 第一步: 读懂输入
   * 提取: 股票代码、问题类型、隐含心态
   */
  async step1_parseUserInput(
    userMessage: string,
    context: ContextMemory
  ): Promise<ParsedInput> {
    // 从SimpleMem读取已知信息
    const knownFacts = context.knownFacts;
    
    // 提取新信息
    const parsed = {
      stocks: this.extractStocks(userMessage),
      queryType: this.classifyQuery(userMessage),
      userSentiment: this.detectSentiment(userMessage),
      isFollowUp: this.isFollowUpQuestion(userMessage, context.currentSession.mainQueries),
      newInformation: this.extractNewFacts(userMessage, knownFacts),
    };

    // 更新SimpleMem
    await this.memory.updateKnownFacts(parsed.newInformation);
    
    return parsed;
  }

  /**
   * 第二步: 实时行情复盘
   * 获取: 当前价、涨跌幅、成交量、技术位置
   * 
   * ⚠️ 工具调用发生在这里
   * 但框架不关心用什么模型调用
   */
  async step2_reviewMarketStatus(
    stocks: string[],
    portfolio: PortfolioMemory[]
  ): Promise<MarketReview> {
    // 1. 从SimpleMem获取历史行情记忆
    const priceMemory = await this.memory.getHistoricalPrices(stocks);

    // 2. 调用工具获取实时数据（工具调用与模型无关）
    const realTimeData = await this.fetchRealtimeData(stocks);

    // 3. 对比历史 vs 当前
    const review = {
      currentPrices: realTimeData.prices,
      priceChanges: this.calculateChanges(priceMemory, realTimeData),
      technicalLevels: this.identifyKeyLevels(realTimeData.history),
      userCostBasis: portfolio.map(p => ({
        code: p.code,
        costPrice: p.costBasis.avgPrice,
        currentPrice: realTimeData.prices[p.code],
        profitLevel: ((realTimeData.prices[p.code] - p.costBasis.avgPrice) / p.costBasis.avgPrice) * 100,
      })),
    };

    // 4. 存入SimpleMem
    await this.memory.recordMarketSnapshot({
      timestamp: new Date(),
      data: review,
    });

    return review;
  }

  /**
   * 第三步: 多维度分析
   * 从SimpleMem读取历史数据，应用分析维度
   */
  async step3_multidimensionalAnalysis(
    stocks: string[],
    review: MarketReview,
    userProfile: UserProfile
  ): Promise<AnalysisResult> {
    const results = {
      // 技术面分析
      technical: await this.analyzeTechnical(stocks, review),
      
      // 资金面分析 (从SimpleMem读取资金流向历史)
      funding: await this.analyzeFunding(stocks),
      
      // 基本面分析
      fundamental: await this.analyzeFundamental(stocks),
      
      // 市场情绪分析
      sentiment: await this.analyzeSentiment(stocks, userProfile),
      
      // 根据用户历史操作的相关性分析
      relevantPatterns: await this.findRelevantOperationPatterns(
        stocks,
        userProfile,
        review
      ),
    };

    // 存入SimpleMem供后续参考
    await this.memory.recordAnalysisSnapshot(stocks, results);

    return results;
  }

  /**
   * 第四步: 风险收益评估
   * 计算: 浮盈亏范围、波动概率、长期空间
   * 
   * 从SimpleMem读取用户的历史风险承受测试
   */
  async step4_riskRewardAssessment(
    stocks: string[],
    analysis: AnalysisResult,
    portfolio: PortfolioMemory[],
    userMindset: UserMindset
  ): Promise<RiskRewardAssessment> {
    // 1. 计算理论风险收益
    const theoretical = {
      upside: this.calculateUpside(analysis),
      downside: this.calculateDownside(analysis),
      shortTermVolatility: this.estimateVolatility(analysis, 'short'),
      mediumTermVolatility: this.estimateVolatility(analysis, 'medium'),
    };

    // 2. 根据用户历史调整（个性化）
    const userAdjusted = {
      // 用户容易高估涨幅？降低预期
      adjustedUpside: theoretical.upside * (1 - userMindset.overfitToRecentTrend ? 0.2 : 0),
      
      // 用户容易低估风险？提高警示
      adjustedDownside: theoretical.downside * (1 + userMindset.riskTolerance < 40 ? 0.3 : 0),
      
      // 用户的承受范围
      userAcceptableDrawdown: userMindset.riskTolerance <= 40 
        ? -5 
        : userMindset.riskTolerance <= 70 
          ? -10 
          : -20,
    };

    // 3. 对比持仓成本
    const vs_costBasis = portfolio.map(p => ({
      code: p.code,
      costPrice: p.costBasis.avgPrice,
      targetBullCase: theoretical.upside,
      targetBearCase: theoretical.downside,
      probabilityBullCase: analysis.technical.bullishProbability || 0.5,
      probabilityBearCase: 1 - (analysis.technical.bullishProbability || 0.5),
    }));

    // 存入SimpleMem
    await this.memory.recordRiskAssessment(stocks, {
      theoretical,
      userAdjusted,
      vs_costBasis,
      timestamp: new Date(),
    });

    return { theoretical, userAdjusted, vs_costBasis };
  }

  /**
   * 第五步: 操作建议
   * 短/中/长线 + 具体点位
   * 
   * ⚠️ 这里是最后一步在SimpleMem前的处理
   * 之后会通过LLM生成自然语言建议
   */
  async step5_generateOperationalAdvice(
    stocks: string[],
    assessment: RiskRewardAssessment,
    portfolio: PortfolioMemory[],
    analysis: AnalysisResult,
    userProfile: UserProfile
  ): Promise<OperationalAdvice> {
    const advice = {};

    for (const stock of stocks) {
      const holding = portfolio.find(p => p.code === stock);
      const riskReward = assessment.vs_costBasis.find(p => p.code === stock);

      // 根据不同时间框架给建议
      advice[stock] = {
        // 短线(1-5天)
        shortTerm: {
          action: this.decideShortTermAction(analysis[stock], riskReward, userProfile),
          targetPrice: analysis[stock].technical.shortTermTarget,
          stopLoss: analysis[stock].technical.shortTermStopLoss,
          riskReward: Math.abs(
            (analysis[stock].technical.shortTermTarget - (holding?.costBasis.avgPrice || 0)) /
            (analysis[stock].technical.shortTermStopLoss - (holding?.costBasis.avgPrice || 0))
          ),
          confidence: analysis[stock].technical.shortTermConfidence || 0.5,
        },

        // 中线(1-4周)
        mediumTerm: {
          action: this.decideMediumTermAction(analysis[stock], riskReward, userProfile),
          targetPrice: analysis[stock].fundamental.targetPrice || analysis[stock].technical.mediumTermTarget,
          stopLoss: analysis[stock].fundamental.downside || analysis[stock].technical.mediumTermStopLoss,
          riskReward: Math.abs(
            (analysis[stock].fundamental.targetPrice - (holding?.costBasis.avgPrice || 0)) /
            (analysis[stock].fundamental.downside - (holding?.costBasis.avgPrice || 0))
          ),
          confidence: (analysis[stock].fundamental.confidence || 0.5 + analysis[stock].technical.mediumTermConfidence || 0.5) / 2,
        },

        // 长线(1个月+)
        longTerm: {
          action: this.decideLongTermAction(analysis[stock], userProfile),
          targetPrice: analysis[stock].fundamental.intrinsicValue,
          stopLoss: analysis[stock].fundamental.downside * 0.8,
          timeframe: '3-12个月',
          reasoning: analysis[stock].fundamental.reasoning,
        },

        // 持仓管理建议
        positionManagement: {
          shouldReduce: this.shouldReducePosition(analysis[stock], riskReward, holding),
          reduceReason: this.identifyReduceReason(analysis[stock], riskReward, holding),
          reduceTarget: holding ? holding.costBasis.totalShares * 0.5 : 0,
          reduceAtPrice: analysis[stock].technical.shortTermTarget || analysis[stock].technical.resistance,
        },
      };
    }

    // 存入SimpleMem用于学习
    await this.memory.recordGeneratedAdvice(stocks, advice);

    return advice;
  }

  /**
   * 第六步: 个性化调整 + 智能提问
   * 
   * 这一步最关键：
   * 1. 从SimpleMem读取用户历史
   * 2. 识别用户的错误模式
   * 3. 生成个性化问题
   * 4. 调整建议的表达方式
   */
  async step6_personalizedQAAndAdjustment(
    userMessage: string,
    advice: OperationalAdvice,
    portfolio: PortfolioMemory[],
    userMindset: UserMindset,
    userProfile: UserProfile,
    analysis: AnalysisResult,
    context: ContextMemory
  ): Promise<FinalRecommendation> {
    // 1. 读取用户历史操作模式
    const operationPatterns = await this.memory.getOperationPatterns(userProfile.tradingExperience);
    const userHistory = await this.memory.getUserOperationHistory();

    // 2. 识别当前风险 (根据历史识别用户容易犯的错)
    const riskFactors = this.identifyUserSpecificRisks({
      profile: userProfile,
      mindset: userMindset,
      history: userHistory,
      currentAdvice: advice,
      analysis,
    });

    // 3. 生成个性化问题（按优先级）
    const personalizedQuestions = this.generatePersonalizedQuestions({
      portfolio,
      userProfile,
      riskFactors,
      context,
      advice,
      existingKnowledge: context.knownFacts,
    });

    // 4. 调整建议表达方式
    const adjustedAdvice = this.adjustAdviceExpressionStyle({
      baseAdvice: advice,
      userProfile,
      userMindset,
      riskFactors,
      operationPatterns,
    });

    // 5. 组装最终建议
    const finalRecommendation = {
      baseAdvice: adjustedAdvice,
      personalizedEvaluation: {
        userStrengths: userHistory.strengths,
        userWeaknesses: userHistory.weaknesses,
        currentMindsetAssessment: this.assessCurrentMindset(userMindset, userHistory),
      },
      questionsForClarification: personalizedQuestions.slice(0, 3), // 最多3个
      warningFlags: riskFactors.filter(f => f.severity === 'high'),
      encouragement: this.generateEncouragement(userHistory, advice),
    };

    // 6. 存入SimpleMem供学习（用户实际操作后会更新结果）
    await this.memory.recordFinalRecommendation(userMessage, finalRecommendation);

    return finalRecommendation;
  }

  // ============================================================
  // 辅助方法
  // ============================================================

  /**
   * 识别用户特定的风险（基于历史）
   */
  private identifyUserSpecificRisks(params: {
    profile: UserProfile;
    mindset: UserMindset;
    history: any;
    currentAdvice: OperationalAdvice;
    analysis: AnalysisResult;
  }): RiskFactor[] {
    const risks: RiskFactor[] = [];

    // 风险1: 用户有追高历史 + 当前是突破进场
    if (params.history.patterns?.chaseHighTendency > 0.6 
        && params.currentAdvice.shortTerm?.action === 'buy'
        && params.analysis?.technical?.isBreakout) {
      risks.push({
        id: 'chase_high_pattern',
        description: '历史上您容易追高，而当前是突破进场，建议谨慎',
        severity: 'high',
        suggestion: '是否可以等待回踩后再进？',
      });
    }

    // 风险2: 用户有割肉历史 + 当前建议止损
    if (params.history.patterns?.pannicSellTendency > 0.5
        && params.mindset.consecutiveLossCount >= 2) {
      risks.push({
        id: 'panic_selling_risk',
        description: '您最近有连续亏损，要小心不要在反弹时急于割肉',
        severity: 'high',
        suggestion: '建议先梳理一遍自己的止损逻辑，确保是基于技术面而非情绪',
      });
    }

    // 风险3: 持仓集中度高
    if (params.profile.diversificationScore < 30) {
      risks.push({
        id: 'concentration_risk',
        description: '您的持仓集中度偏高，风险不够分散',
        severity: 'medium',
        suggestion: '考虑是否需要分散到其他板块',
      });
    }

    // 风险4: 过度交易倾向
    if (params.history.patterns?.overtradingRisk) {
      risks.push({
        id: 'overtrading_risk',
        description: '您的交易频率较高，成本和心理压力可能较大',
        severity: 'medium',
        suggestion: '建议设定每周最多交易次数，专注于高质量交易',
      });
    }

    return risks;
  }

  /**
   * 生成个性化问题
   */
  private generatePersonalizedQuestions(params: any): string[] {
    const questions: string[] = [];

    // 问题优先级：成本信息 > 仓位信息 > 心态确认 > 策略讨论

    // Tier 1: 成本信息（必须）
    for (const holding of params.portfolio) {
      if (!holding.costBasis?.avgPrice) {
        questions.push(`${holding.code} 的买入价是多少？`);
      }
      if (!holding.costBasis?.totalShares) {
        questions.push(`${holding.code} 的持股数量是多少？`);
      }
    }

    // Tier 2: 仓位信息
    if (params.portfolio.length > 0 && !params.existingKnowledge['total_position_percent']) {
      questions.push('您的总仓位占账户的百分之多少？');
    }

    // Tier 3: 心态确认（如果有风险因素）
    if (params.riskFactors.some(f => f.severity === 'high')) {
      const highrisk = params.riskFactors.find(f => f.severity === 'high');
      if (highrisk?.id === 'chase_high_pattern') {
        questions.push('我看您历史上容易追高。这次进场前是否已经反复思考？');
      }
      if (highrisk?.id === 'panic_selling_risk') {
        questions.push('最近有亏损，现在还有心态继续操作吗？');
      }
    }

    // Tier 4: 策略讨论
    if (params.userProfile.preferences?.questionStyle === 'socratic') {
      questions.push(
        `这个建议对应的逻辑是${params.advice.shortTerm?.confidence > 0.7 ? '相对确定的' : '概率性的'}，您的理解是一样吗？`
      );
    }

    return questions;
  }

  /**
   * 评估当前心态
   */
  private assessCurrentMindset(mindset: UserMindset, history: any): string {
    const factors = [];

    if (mindset.hasRecentLoss) {
      factors.push('最近有亏损，可能心态略差');
    }
    if (mindset.confidenceLevel < 30) {
      factors.push('信心不足');
    }
    if (mindset.riskTolerance > 80) {
      factors.push('风险偏好较高');
    }

    return factors.join('；') || '心态相对稳定';
  }

  /**
   * 生成鼓励话语
   */
  private generateEncouragement(history: any, advice: OperationalAdvice): string {
    // 如果用户最近有成功操作
    if (history.recentSuccessCount > 0) {
      return `不错！您最近${history.recentSuccessCount}次操作有成果，建议继续保持这个水准。`;
    }

    // 如果用户在改进
    if (history.improvementTrend > 0) {
      return `看得出您在进步。建议再分析一遍本次建议的逻辑，确保您完全理解。`;
    }

    // 默认鼓励
    return '建议认真思考每一步，宁可慢也不要仓促。';
  }
}
```

---

## 🔌 模型无关的执行接口

```typescript
/**
 * LLMProvider - 统一的模型执行接口
 * 框架通过这个接口调用任何模型
 * 模型选择由model-router完成，这里只负责执行
 */

export interface LLMProvider {
  // 执行模型调用
  chat(params: {
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
    temperature?: number;
    maxTokens?: number;
    tools?: any[];
  }): Promise<{
    content: string;
    toolCalls?: any[];
  }>;

  // 流式执行
  stream(params: {
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
    onChunk: (chunk: string) => void;
  }): Promise<string>;
}

/**
 * 使用示例（框架内部）
 * 
 * // 框架不关心用什么模型
 * const llm: LLMProvider = getLLMProvider(); // 由model-router选择
 * 
 * const systemPrompt = buildAnalysisSystemPrompt(
 *   step6Result.personalizedEvaluation,
 *   userProfile
 * );
 * 
 * const response = await llm.chat({
 *   messages: [
 *     { role: 'system', content: systemPrompt },
 *     { role: 'user', content: userMessage }
 *   ]
 * });
 */
```

---

## 🧠 SimpleMem集成方式

```typescript
/**
 * AnalysisMemoryManager - SimpleMem的分析领域集成
 * 
 * 负责压缩、检索、学习用户行为
 */

export class AnalysisMemoryManager {
  private simpleMem: SimpleMem; // SimpleMem实例

  /**
   * 初始化记忆
   */
  constructor(userId: string) {
    this.simpleMem = new SimpleMem({
      userId,
      domains: {
        'portfolio': { maxSize: 1000, priority: 'high' }, // 持仓记忆
        'operations': { maxSize: 5000, priority: 'high' }, // 操作记忆
        'analysis': { maxSize: 2000, priority: 'medium' }, // 分析结果
        'context': { maxSize: 500, priority: 'high' }, // 用户上下文
        'patterns': { maxSize: 100, priority: 'medium' }, // 行为模式
      },
    });
  }

  /**
   * 记录持仓变动
   */
  async recordPortfolioChange(holding: HoldingMemory) {
    await this.simpleMem.remember({
      domain: 'portfolio',
      key: `holding_${holding.code}`,
      content: this.compressHoldingData(holding),
      timestamp: Date.now(),
      ttl: 30 * 24 * 60 * 60 * 1000, // 30天
      importance: 0.9,
    });
  }

  /**
   * 记录操作结果（用于学习）
   */
  async recordOperationResult(params: {
    stock: string;
    action: 'buy' | 'sell';
    entryPrice: number;
    exitPrice?: number;
    outcome: 'profit' | 'loss' | 'pending';
    reasoning: string;
    lessonsLearned: string;
  }) {
    await this.simpleMem.remember({
      domain: 'operations',
      key: `op_${params.stock}_${Date.now()}`,
      content: this.compressOperationData(params),
      timestamp: Date.now(),
      importance: 0.95, // 操作结果很重要，用于学习
    });

    // 触发模式学习
    await this.learnOperationPatterns(params.stock);
  }

  /**
   * 查询用户历史模式
   */
  async getOperationPatterns(experienceLevel: string): Promise<OperationPattern[]> {
    const results = await this.simpleMem.retrieve({
      domain: 'operations',
      query: `user_patterns_${experienceLevel}`,
      limit: 10,
    });

    return results.map(r => this.decompressOperationPattern(r));
  }

  /**
   * 获取用户上下文
   */
  async getUserContext(): Promise<ContextMemory> {
    const context = await this.simpleMem.retrieve({
      domain: 'context',
      query: 'user_context',
      limit: 1,
    });

    return context[0] ? this.decompressContext(context[0]) : this.createEmptyContext();
  }

  /**
   * 学习错误模式
   */
  private async learnOperationPatterns(stock: string) {
    // 从SimpleMem读取最近10次操作
    const recentOps = await this.simpleMem.retrieve({
      domain: 'operations',
      query: `operations_${stock}`,
      limit: 10,
    });

    // 计算模式
    const pattern = {
      chaseHighCount: recentOps.filter(op => op.content.action === 'buy' && op.content.entryPrice > op.prevHighPrice).length,
      cuttingLossCount: recentOps.filter(op => op.content.action === 'sell' && op.content.outcome === 'loss').length,
      successRate: recentOps.filter(op => op.content.outcome === 'profit').length / recentOps.length,
    };

    // 存入SimpleMem供未来参考
    await this.simpleMem.remember({
      domain: 'patterns',
      key: `pattern_${stock}`,
      content: pattern,
      importance: 0.8,
    });
  }

  // 数据压缩/解压缩方法
  private compressHoldingData(holding: HoldingMemory): string {
    // 只保留关键信息，压缩成JSON
    return JSON.stringify({
      code: holding.code,
      cost: holding.costBasis.avgPrice,
      shares: holding.costBasis.totalShares,
      target: holding.psychologicalExpectation.targetPrice,
      sl: holding.psychologicalExpectation.stopLossPrice,
      days: holding.costBasis.firstBuyDate,
    });
  }

  private decompressContext(data: any): ContextMemory {
    // 解压缩回完整对象
    return JSON.parse(data.content);
  }

  private createEmptyContext(): ContextMemory {
    return {
      currentSession: {
        startTime: new Date().toISOString(),
        focusStocks: [],
        mainQueries: [],
        decisionsMade: [],
      },
      knownFacts: {},
      questioningState: {
        questionsAsked: [],
        questionsNeedFollow: [],
        informationGaps: [],
      },
    };
  }
}
```

---

## 📊 数据流示意

```
User Input
  ↓
┌─────────────────────────────────────┐
│ Step 1: Parse (SimpleMem: get context) │
├─────────────────────────────────────┤
│ Step 2: Review (SimpleMem: get history) │
│         ↳ 调用工具获取实时数据        │
├─────────────────────────────────────┤
│ Step 3: Analyze (SimpleMem: pattern match) │
├─────────────────────────────────────┤
│ Step 4: Assess (SimpleMem: personal risk) │
├─────────────────────────────────────┤
│ Step 5: Advise (SimpleMem: operation history) │
├─────────────────────────────────────┤
│ Step 6: Personalize (SimpleMem: full profile) │
└─────────────────────────────────────┘
  ↓
  需要LLM生成自然语言
  ↓
LLMProvider.chat() 
  ├─ 模型由ModelRouter选择
  ├─ 系统提示词包含SimpleMem的用户记忆
  └─ 输出自然语言建议
  ↓
返回给用户
  ↓
  用户操作后
  ↓
SimpleMem.recordOperationResult()
  ├─ 压缩新数据
  ├─ 学习模式
  └─ 更新用户画像
```

---

## 🎯 使用示例

```typescript
// 初始化框架
const framework = new StockAnalysisFramework();
const memory = new AnalysisMemoryManager(userId);

// 用户提问
const userMessage = "000858这只股票怎么样？我之前买的，现在想知道要不要加仓";

// 执行6步分析（完全模型无关）
const step1 = await framework.step1_parseUserInput(userMessage, userContext);
const step2 = await framework.step2_reviewMarketStatus(step1.stocks, userPortfolio);
const step3 = await framework.step3_multidimensionalAnalysis(step1.stocks, step2, userProfile);
const step4 = await framework.step4_riskRewardAssessment(step1.stocks, step3, userPortfolio, userMindset);
const step5 = await framework.step5_generateOperationalAdvice(step1.stocks, step4, userPortfolio, step3, userProfile);
const step6 = await framework.step6_personalizedQAAndAdjustment(
  userMessage,
  step5,
  userPortfolio,
  userMindset,
  userProfile,
  step3,
  userContext
);

// 现在调用LLM生成自然语言（模型由ModelRouter选择）
const llmProvider = await getOptimalLLMProvider(step1.stocks); // 这里用ModelRouter

const systemPrompt = `
你是一个专业的证券分析师。
用户的操作历史模式是: ${JSON.stringify(step6.personalizedEvaluation)}
用户当前心态: ${step6.personalizedEvaluation.currentMindsetAssessment}

基于以下数据，给出专业建议:
${JSON.stringify(step6.baseAdvice, null, 2)}

同时回答这些问题（如有）:
${step6.questionsForClarification.join('\n')}

警告: ${step6.warningFlags.map(f => f.description).join('\n')}
`;

const response = await llmProvider.chat({
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage }
  ]
});

// 存储结果供下次参考
await memory.recordOperationResult({
  stock: step1.stocks[0],
  action: 'considering',
  reasoning: step5[step1.stocks[0]].mediumTerm.reasoning,
});
```

---

## 🔑 关键优势

✅ **完全解耦**: 业务逻辑与模型选择完全独立  
✅ **SimpleMem驱动**: 所有用户信息压缩管理，避免上下文爆炸  
✅ **可学习**: 记录每次操作结果，识别用户模式  
✅ **个性化**: 基于SimpleMem的用户画像，个性化问题和建议  
✅ **可扩展**: 轻松支持新的分析维度、新的模型、新的工具  
✅ **模型灵活**: 今天用Grok，明天用GLM，逻辑完全不变  

---

## 📦 集成检查清单

- [ ] 创建 `StockAnalysisFramework` 类
- [ ] 创建 `AnalysisMemoryManager` 类 (SimpleMem集成)
- [ ] 设计6个Interface (ParsedInput, MarketReview, AnalysisResult等)
- [ ] 实现SimpleMem的compress/decompress逻辑
- [ ] 在SmartAgent中调用框架的6步流程
- [ ] 将ModelRouter的选择传给LLMProvider
- [ ] 测试: 验证SimpleMem是否正确记录和检索用户信息
- [ ] 测试: 验证同一用户第二次提问时，能否读取上次的记忆

**这就是您的模型无关、SimpleMem驱动的分析框架！** 🚀
