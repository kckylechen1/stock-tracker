/**
 * 交易记忆系统
 * 持久化存储用户的持仓、交易历史和教训
 */

import * as fs from "fs";
import * as path from "path";

// ==================== 数据类型 ====================

export interface Position {
  symbol: string;
  name: string;
  cost: number; // 成本价
  shares: number; // 持仓数量
  buyDate: string;
  buyReason: string;
  stockType: "value" | "momentum" | "hot_money" | "event";
  targetPrice?: number;
  stopLoss?: number;
}

export interface Trade {
  id: string;
  symbol: string;
  name: string;
  action: "buy" | "sell";
  price: number;
  shares: number;
  date: string;
  reason: string;
  technicalSignals: {
    rsi?: number;
    macd?: string;
    volume?: string;
    score?: number;
  };
  outcome?: "good" | "bad" | "neutral"; // 事后评价
  lessonsLearned?: string; // 经验教训
}

export interface TradingLesson {
  id: string;
  date: string;
  symbol: string; // 具体股票或 '*'（通用）
  lesson: string;
  signalPattern: string; // 触发信号模式
  actionToAvoid: string; // 应该避免的行为
  recommendedAction: string; // 推荐的行为
}

export interface UserProfile {
  riskTolerance: "low" | "medium" | "high";
  holdingPeriod: "short" | "medium" | "long";
  preferredIndicators: string[];
  avoidPatterns: string[]; // 避免的模式
  successPatterns: string[]; // 成功的模式
}

export interface TradingMemory {
  positions: Position[];
  trades: Trade[];
  lessons: TradingLesson[];
  profile: UserProfile | null;
  lastUpdated: string;
}

// ==================== 存储路径 ====================

const MEMORY_FILE = path.join(process.cwd(), "data", "trading_memory.json");

// 确保目录存在
function ensureDataDir() {
  const dataDir = path.dirname(MEMORY_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// ==================== 核心函数 ====================

/**
 * 加载交易记忆
 */
export function loadMemory(): TradingMemory {
  ensureDataDir();

  if (!fs.existsSync(MEMORY_FILE)) {
    return {
      positions: [],
      trades: [],
      lessons: [],
      profile: null,
      lastUpdated: new Date().toISOString(),
    };
  }

  try {
    const data = fs.readFileSync(MEMORY_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("[TradingMemory] Load error:", error);
    return {
      positions: [],
      trades: [],
      lessons: [],
      profile: null,
      lastUpdated: new Date().toISOString(),
    };
  }
}

/**
 * 保存交易记忆
 */
export function saveMemory(memory: TradingMemory): boolean {
  ensureDataDir();

  try {
    memory.lastUpdated = new Date().toISOString();
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(memory, null, 2), "utf-8");
    return true;
  } catch (error) {
    console.error("[TradingMemory] Save error:", error);
    return false;
  }
}

// ==================== 持仓管理 ====================

/**
 * 添加或更新持仓
 */
export function addPosition(position: Position): boolean {
  const memory = loadMemory();

  const existingIdx = memory.positions.findIndex(
    p => p.symbol === position.symbol
  );
  if (existingIdx >= 0) {
    memory.positions[existingIdx] = position;
  } else {
    memory.positions.push(position);
  }

  return saveMemory(memory);
}

/**
 * 删除持仓
 */
export function removePosition(symbol: string): boolean {
  const memory = loadMemory();
  memory.positions = memory.positions.filter(p => p.symbol !== symbol);
  return saveMemory(memory);
}

/**
 * 获取持仓
 */
export function getPosition(symbol: string): Position | null {
  const memory = loadMemory();
  return memory.positions.find(p => p.symbol === symbol) || null;
}

/**
 * 获取所有持仓
 */
export function getAllPositions(): Position[] {
  return loadMemory().positions;
}

// ==================== 交易记录 ====================

/**
 * 添加交易记录
 */
export function addTrade(trade: Omit<Trade, "id">): string {
  const memory = loadMemory();

  const id = `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const newTrade: Trade = { ...trade, id };

  memory.trades.push(newTrade);
  saveMemory(memory);

  return id;
}

/**
 * 更新交易结果（事后评价）
 */
export function updateTradeOutcome(
  tradeId: string,
  outcome: "good" | "bad" | "neutral",
  lessonsLearned?: string
): boolean {
  const memory = loadMemory();

  const trade = memory.trades.find(t => t.id === tradeId);
  if (!trade) return false;

  trade.outcome = outcome;
  if (lessonsLearned) trade.lessonsLearned = lessonsLearned;

  return saveMemory(memory);
}

/**
 * 获取某股票的交易历史
 */
export function getTradesForSymbol(symbol: string): Trade[] {
  const memory = loadMemory();
  return memory.trades.filter(t => t.symbol === symbol);
}

// ==================== 交易教训 ====================

/**
 * 添加交易教训
 */
export function addLesson(lesson: Omit<TradingLesson, "id">): string {
  const memory = loadMemory();

  const id = `lesson_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const newLesson: TradingLesson = { ...lesson, id };

  memory.lessons.push(newLesson);
  saveMemory(memory);

  return id;
}

/**
 * 获取相关教训（按股票和信号模式匹配）
 */
export function getRelevantLessons(
  symbol?: string,
  signals?: { rsi?: number; macd?: string }
): TradingLesson[] {
  const memory = loadMemory();

  return memory.lessons.filter(lesson => {
    // 按股票筛选
    if (symbol && lesson.symbol !== symbol && lesson.symbol !== "*") {
      return false;
    }

    // 按信号模式匹配
    if (signals) {
      if (
        lesson.signalPattern.includes("RSI<30") &&
        signals.rsi &&
        signals.rsi < 30
      ) {
        return true;
      }
      if (
        lesson.signalPattern.includes("MACD金叉") &&
        signals.macd === "golden"
      ) {
        return true;
      }
      if (
        lesson.signalPattern.includes("MACD死叉") &&
        signals.macd === "dead"
      ) {
        return true;
      }
    }

    return true;
  });
}

// ==================== 用户画像 ====================

/**
 * 更新用户画像
 */
export function updateProfile(profile: UserProfile): boolean {
  const memory = loadMemory();
  memory.profile = profile;
  return saveMemory(memory);
}

/**
 * 获取用户画像
 */
export function getProfile(): UserProfile | null {
  return loadMemory().profile;
}

// ==================== 上下文生成 ====================

/**
 * 生成 AI 上下文（注入到 System Prompt）
 */
export function generateAIContext(currentSymbol?: string): string {
  const memory = loadMemory();
  const context: string[] = [];

  // 当前持仓
  if (memory.positions.length > 0) {
    context.push("## 用户当前持仓\n");
    for (const p of memory.positions) {
      if (!currentSymbol || p.symbol === currentSymbol) {
        context.push(
          `- **${p.name}(${p.symbol})**: 成本${p.cost}元, ${p.shares}股`
        );
        if (p.buyReason) context.push(`  - 买入理由: ${p.buyReason}`);
        if (p.targetPrice) context.push(`  - 目标价: ${p.targetPrice}元`);
        if (p.stopLoss) context.push(`  - 止损价: ${p.stopLoss}元`);
        context.push(`  - 类型: ${p.stockType}`);
      }
    }
  }

  // 历史交易
  const relevantTrades = currentSymbol
    ? memory.trades.filter(t => t.symbol === currentSymbol)
    : memory.trades.slice(-10);

  if (relevantTrades.length > 0) {
    context.push("\n## 历史交易\n");
    for (const t of relevantTrades.slice(-5)) {
      const emoji =
        t.outcome === "good" ? "✅" : t.outcome === "bad" ? "❌" : "➖";
      context.push(
        `- ${t.date}: ${t.action.toUpperCase()} ${t.name} ${t.price}元 ${t.shares}股 ${emoji}`
      );
      if (t.lessonsLearned) {
        context.push(`  - 教训: ${t.lessonsLearned}`);
      }
    }
  }

  // 相关教训
  const relevantLessons = getRelevantLessons(currentSymbol);
  if (relevantLessons.length > 0) {
    context.push("\n## 历史经验教训 ⚠️\n");
    for (const lesson of relevantLessons.slice(-5)) {
      context.push(`- **[${lesson.date}]** ${lesson.lesson}`);
      context.push(`  - 触发信号: ${lesson.signalPattern}`);
      context.push(`  - ❌ 避免: ${lesson.actionToAvoid}`);
      context.push(`  - ✅ 推荐: ${lesson.recommendedAction}`);
    }
  }

  // 用户偏好
  if (memory.profile) {
    context.push("\n## 用户交易偏好\n");
    context.push(`- 风险偏好: ${memory.profile.riskTolerance}`);
    context.push(`- 持仓周期: ${memory.profile.holdingPeriod}`);
    if (memory.profile.avoidPatterns.length) {
      context.push(`- ❌ 避免模式: ${memory.profile.avoidPatterns.join(", ")}`);
    }
    if (memory.profile.successPatterns.length) {
      context.push(
        `- ✅ 成功模式: ${memory.profile.successPatterns.join(", ")}`
      );
    }
  }

  return context.join("\n");
}

// ==================== 初始化示例数据 ====================

/**
 * 初始化示例记忆数据（用于测试）
 */
export function initSampleMemory(): void {
  const memory = loadMemory();

  // 只在空数据时初始化
  if (memory.positions.length > 0 || memory.trades.length > 0) {
    return;
  }

  // 添加用户画像
  memory.profile = {
    riskTolerance: "medium",
    holdingPeriod: "short",
    preferredIndicators: ["MACD", "RSI", "资金流向"],
    avoidPatterns: ["RSI<30时清仓", "追高买入", "FOMO换股"],
    successPatterns: ["分批减仓", "设置trailing stop", "资金票看资金不看PE"],
  };

  // 添加教训
  memory.lessons = [
    {
      id: "lesson_1",
      date: "2026-01-08",
      symbol: "300433",
      lesson: "在RSI超卖区(RSI<30)恐慌清仓，错过第二天反弹12%",
      signalPattern: "RSI<30 + 放量阴线",
      actionToAvoid: "在超卖区恐慌清仓",
      recommendedAction: "等待RSI回升至40以上，或分批减仓",
    },
    {
      id: "lesson_2",
      date: "2025-09-01",
      symbol: "300274",
      lesson: '因为"别的票涨了"而FOMO换股，结果换掉的票暴涨36%',
      signalPattern: "技术面5/5满分 + 当日微跌<1%",
      actionToAvoid: "看到其他票涨就FOMO换股",
      recommendedAction: '只要技术面没走弱(得分>=3/5)，就不要因为"没涨"而换股',
    },
    {
      id: "lesson_3",
      date: "*",
      symbol: "*",
      lesson: "资金票（短期靠资金炒作的股票）不需要看基本面PE/PB",
      signalPattern: "高换手率 + 主力净流入",
      actionToAvoid: "对资金票做基本面分析",
      recommendedAction: "关注资金流向和市场情绪",
    },
  ];

  saveMemory(memory);
  console.log("[TradingMemory] Sample data initialized");
}
