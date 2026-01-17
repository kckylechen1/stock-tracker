# TASK-005: 扩展用户画像数据模型

## 负责 Agent: 🔵 GLM (力大飞砖)
> 类型定义和数据模型改造，适合 GLM 批量处理。

## 背景 (Why)
现有的 `UserProfile` 接口过于简单，需要扩展为完整的用户画像模型，并支持多用户隔离存储。

## 目标 (Done Definition)
- [ ] 扩展 `UserProfile` 接口包含完整字段
- [ ] 迁移现有 `trading_memory.json` 到用户目录
- [ ] `loadMemory()` / `saveMemory()` 支持用户隔离
- [ ] 向后兼容（单用户场景降级到默认用户）
- [ ] CI 全绿

## 范围
**In-scope:**
- UserProfile 接口扩展
- TradingMemory 改造支持多用户
- 数据迁移逻辑

**Out-of-scope:**
- 问诊流程（TASK-006）
- 前端展示

## 契约 (Contract)

```typescript
// server/_core/types/userProfile.ts 或直接在 tradingMemory.ts 中

interface UserProfile {
  // === 基本信息 ===
  userId: string;           // UUID - 关联用户
  nickname: string;         // 昵称
  ageRange?: "18-30" | "30-45" | "45-60" | "60+";
  yearsExperience?: number;
  
  // === 财务画像 ===
  tradingCapital?: "under10k" | "10k-50k" | "50k-100k" | "100k-500k" | "500k+";
  dailyTimeHours?: number;
  tradingFrequency?: "daily" | "3-5x_week" | "weekly" | "occasional";
  
  // === 风险画像 ===
  riskTolerance: "conservative" | "moderate" | "aggressive";
  singleTradeMaxLossPct?: number;
  
  // === 心理画像 ===
  decisionStyle?: "analytical" | "intuitive" | "mixed";
  holdingTendency: "holds_too_long" | "sells_too_early" | "balanced";
  fomoLevel?: "strong" | "moderate" | "minimal";
  lossAversionScore?: number;  // 1-10
  patienceScore?: number;      // 1-10
  
  // === 技术知识 ===
  chanlunLevel?: "not_familiar" | "beginner" | "intermediate" | "advanced";
  preferredFramework?: "chanlun" | "fibonacci" | "ma" | "combined";
  
  // === 现有字段（保留兼容）===
  holdingPeriod: "short" | "medium" | "long";
  preferredIndicators: string[];
  avoidPatterns: string[];
  successPatterns: string[];
  
  // === 元数据 ===
  profileVersion: number;
  completionRate: number;     // 0-100，问诊完成度
  createdAt: string;
  updatedAt: string;
}
```

## 实施计划

1. 修改 `server/_core/tradingMemory.ts`
   - 扩展 UserProfile 接口
   - 修改文件路径从 `data/trading_memory.json` 到 `data/users/{userId}/trading_memory.json`
   - 添加 `loadMemoryForUser(userId)` 和 `saveMemoryForUser(userId, memory)`
   - 保留原有接口向后兼容（使用默认用户）

2. 创建迁移脚本（可选）
   - 检测旧文件存在时自动迁移

3. 更新测试

## 验收清单

- [ ] 类型检查通过 (`pnpm check`)
- [ ] 现有测试通过
- [ ] 旧数据可正常读取（向后兼容）

## 文件清单

| 操作 | 文件路径 |
|------|----------|
| MODIFY | `server/_core/tradingMemory.ts` |
| MODIFY | 相关测试文件 |

## 依赖

- TASK-004 必须先完成（UserStore 提供用户目录路径）

## 进度日志

| 时间 | Agent | 动作 | 产物 |
|------|-------|------|------|
| 2026-01-17 | Amp | 创建任务 | TASK-005-profile-model.md |
