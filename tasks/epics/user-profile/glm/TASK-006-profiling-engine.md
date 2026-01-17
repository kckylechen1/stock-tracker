# TASK-006: 问诊引擎实现

## 负责 Agent: 🔵 GLM (力大飞砖 + 中文专家)
> 中文问题库设计 + 大量代码生成，GLM 最合适。

## 背景 (Why)
通过对话式问诊收集用户交易特征，5 个核心问题快速完成画像，可选扩展到 15 个问题。

## 目标 (Done Definition)
- [ ] 5 个核心问题的问题库定义
- [ ] 问诊状态机：start → question → answer → next → complete
- [ ] 问题路由逻辑（基于前序回答调整后续问题）
- [ ] Profile 字段映射（回答 → Profile 字段）
- [ ] 支持"进一步加强"扩展到 15 个问题
- [ ] tRPC 路由：startProfiling, answerQuestion, completeProfiling
- [ ] CI 全绿

## 范围
**In-scope:**
- 问题库定义（5 核心 + 10 扩展）
- 问诊状态管理
- tRPC API

**Out-of-scope:**
- 前端 UI（TASK-007）

## 契约 (Contract)

```typescript
// server/_core/profilingEngine.ts

interface ProfilingQuestion {
  id: string;
  question: string;
  type: "text" | "single_choice" | "multi_choice" | "scale";
  options?: Array<{ value: string; label: string }>;
  required: boolean;
  fieldMapping: string;  // 对应 Profile 字段路径
  category: "basic" | "risk" | "psychology" | "technical";
}

interface ProfilingSession {
  id: string;
  userId: string;
  mode: "quick" | "full";
  currentQuestionIndex: number;
  answers: Record<string, string | string[]>;
  startedAt: string;
  completedAt?: string;
}

class ProfilingEngine {
  // 开始问诊
  startSession(userId: string, mode: "quick" | "full"): ProfilingSession;
  
  // 获取当前问题
  getCurrentQuestion(sessionId: string): ProfilingQuestion | null;
  
  // 提交回答并获取下一个问题
  answerAndNext(
    sessionId: string, 
    answer: string | string[]
  ): { nextQuestion: ProfilingQuestion | null; canComplete: boolean };
  
  // 完成问诊，生成 Profile
  complete(sessionId: string): UserProfile;
  
  // 判断是否可以提前完成（核心问题答完）
  canSkipToComplete(sessionId: string): boolean;
}
```

### 5 个核心问题

```typescript
const CORE_QUESTIONS: ProfilingQuestion[] = [
  {
    id: "q1_nickname",
    question: "怎么称呼您？",
    type: "text",
    required: true,
    fieldMapping: "nickname",
    category: "basic"
  },
  {
    id: "q2_experience",
    question: "您交易股票多少年了？",
    type: "single_choice",
    options: [
      { value: "0-1", label: "不到1年" },
      { value: "1-3", label: "1-3年" },
      { value: "3-5", label: "3-5年" },
      { value: "5+", label: "5年以上" }
    ],
    required: true,
    fieldMapping: "yearsExperience",
    category: "basic"
  },
  {
    id: "q3_risk",
    question: "如果单笔交易亏损 10%，您的反应是？",
    type: "single_choice",
    options: [
      { value: "panic_sell", label: "立刻止损，宁可亏损也要出局" },
      { value: "hold_anxious", label: "拿着但很焦虑，希望反弹" },
      { value: "hold_calm", label: "相对冷静，评估后决定" },
      { value: "add_position", label: "考虑加仓摊低成本" }
    ],
    required: true,
    fieldMapping: "riskTolerance",
    category: "risk"
  },
  {
    id: "q4_holding",
    question: "您更常遇到哪种情况？",
    type: "single_choice",
    options: [
      { value: "sells_too_early", label: "涨了一点就想卖，后来后悔" },
      { value: "holds_too_long", label: "亏了死扛不卖，越亏越多" },
      { value: "both", label: "两种都有" },
      { value: "balanced", label: "都还好，比较理性" }
    ],
    required: true,
    fieldMapping: "holdingTendency",
    category: "psychology"
  },
  {
    id: "q5_fomo",
    question: "看到热门股大涨，您通常会？",
    type: "single_choice",
    options: [
      { value: "strong", label: "马上追进去，怕错过" },
      { value: "moderate", label: "观望一下，可能会追" },
      { value: "research", label: "先查资料再决定" },
      { value: "minimal", label: "无视，只做自己的" }
    ],
    required: true,
    fieldMapping: "fomoLevel",
    category: "psychology"
  }
];
```

## 实施计划

1. 创建 `server/_core/profilingEngine.ts`
   - 定义问题库（5 核心 + 10 扩展）
   - 实现 ProfilingEngine 类
   - 实现字段映射逻辑

2. 扩展 `server/routers/profile.ts`
   - 添加 startProfiling, answerQuestion, completeProfiling

3. 添加测试

## 验收清单

- [ ] 类型检查通过
- [ ] 5 个核心问题可完整走完
- [ ] 可选扩展到 15 个问题
- [ ] Profile 正确生成

## 文件清单

| 操作 | 文件路径 |
|------|----------|
| CREATE | `server/_core/profilingEngine.ts` |
| MODIFY | `server/routers/profile.ts` |
| CREATE | `server/profilingEngine.test.ts` |

## 依赖

- TASK-005 必须先完成（UserProfile 接口）

## 进度日志

| 时间 | Agent | 动作 | 产物 |
|------|-------|------|------|
| 2026-01-17 | Amp | 创建任务 | TASK-006-profiling-engine.md |
