# TASK-008: AI 上下文注入

## 负责 Agent: 🟡 Amp (Claude Sonnet 4)
> AI 系统集成需要架构考量，适合 Amp 处理复杂逻辑。

## 背景 (Why)
SmartAgent 需要读取用户 Profile，在回答时提供个性化建议。

## 目标 (Done Definition)
- [ ] SmartAgent 初始化时加载当前用户 Profile
- [ ] `buildEnhancedMessage()` 注入 Profile 上下文
- [ ] 基于用户弱点生成针对性提示
- [ ] Session 按用户隔离
- [ ] CI 全绿

## 范围
**In-scope:**
- SmartAgent Profile 注入
- Session 用户隔离

**Out-of-scope:**
- Profile 数据结构（TASK-005）
- 问诊流程（TASK-006）

## 契约

```typescript
// 修改 SmartAgentConfig
interface SmartAgentConfig {
  sessionId?: string;
  stockCode?: string;
  useOrchestrator?: boolean;
  verbose?: boolean;
  thinkHard?: boolean;
  preloadedContext?: string;
  
  // 新增
  userId?: string;  // 如果不指定，使用当前活跃用户
}

// 修改 SmartAgent.buildEnhancedMessage 逻辑
```

## Profile 上下文注入模板

```markdown
## 用户画像

**交易者类型**: {基于 Profile 计算}
**交易经验**: {yearsExperience}年
**风险偏好**: {riskTolerance}

### ⚠️ 需要特别注意

{基于 holdingTendency 生成}
- 如果 holdingTendency == "sells_too_early":
  "这位用户倾向于过早卖出盈利的股票，请在建议中强调设定止损/止盈目标并坚持。"
  
- 如果 holdingTendency == "holds_too_long":
  "这位用户倾向于不肯止损，请在建议中重点关注风险控制和止损纪律。"

{基于 fomoLevel 生成}
- 如果 fomoLevel == "strong":
  "这位用户容易 FOMO 追高，请建议他不要追涨，等回调再考虑。"

### 用户偏好
- 避免模式: {avoidPatterns}
- 成功模式: {successPatterns}
```

## 实施计划

1. 修改 `server/_core/agent/smart-agent.ts`
   - 在构造函数中加载当前用户 Profile
   - 修改 `buildEnhancedMessage()` 注入 Profile 上下文
   - 根据用户弱点生成特定提示

2. 修改 Session 管理
   - Session 与用户关联
   - 切换用户时切换 Session

3. 测试验证

## 验收清单

- [ ] AI 回复中能体现用户特征
- [ ] 对"sells_too_early"用户有针对性提示
- [ ] 对"strong_fomo"用户有针对性提示
- [ ] 切换用户后聊天历史正确隔离

## 文件清单

| 操作 | 文件路径 |
|------|----------|
| MODIFY | `server/_core/agent/smart-agent.ts` |
| MODIFY | `server/_core/session/session-store.ts` |

## 依赖

- TASK-005 完成（Profile 数据结构）
- TASK-006 完成（Profile 数据可用）

## 进度日志

| 时间 | Agent | 动作 | 产物 |
|------|-------|------|------|
| 2026-01-17 | Amp | 创建任务 | TASK-008-ai-context.md |
