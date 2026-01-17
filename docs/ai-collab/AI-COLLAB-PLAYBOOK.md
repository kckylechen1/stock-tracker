# 🤖 多 AI Agent 协作开发手册 (AI-Collab Playbook)

> **项目**: DragonFly A股分析系统
> **版本**: v1.0
> **创建日期**: 2026-01-16
> **最后更新**: 2026-01-16

---

## 📋 目录

1. [总览](#1-总览)
2. [核心原则](#2-核心原则)
3. [角色矩阵](#3-角色矩阵)
4. [任务卡模板](#4-任务卡模板)
5. [架构基线](#5-架构基线)
6. [多 Agent 协作流程](#6-多-agent-协作流程)
7. [Ralph-Loop 规范](#7-ralph-loop-规范)
8. [Clawdbot 自动化](#8-clawdbot-自动化)
9. [当前任务](#9-当前任务)

---

## 1. 总览

### 1.1 目标

建立一套可复用的多 AI 协作开发流程：

- ✅ 自动化分发任务
- ✅ 监控进度
- ✅ 审查代码
- ✅ 并行加速开发

### 1.2 边界

- ❌ 不把状态放在 AI 记忆里
- ✅ 一切以 **Git / PR / Task Card** 为准
- ✅ 每次 Loop 都是全新 context，状态在文件系统

---

## 2. 核心原则

| 原则                 | 说明                                  |
| -------------------- | ------------------------------------- |
| **契约先行**   | 先定 Zod schema / 接口，再写实现      |
| **小 PR**      | 每个 PR 只做一件事，可回滚、可审查    |
| **单一事实源** | Git 是唯一状态，不依赖 AI 的"记忆"    |
| **Ralph-Loop** | 自动循环执行直到 Done Definition 满足 |
| **降级优先**   | P1/P2 必须有超时与 fallback           |

---

## 3. 角色矩阵

| 角色               | Agent                 | 擅长                               | 典型任务                     |
| ------------------ | --------------------- | ---------------------------------- | ---------------------------- |
| **总监**     | Amp (Claude Sonnet 4) | 架构设计、任务拆解、代码审查、验收 | 定义契约、分配任务、最终签收 |
| **代码苦力** | Codex                 | 代码生成、批量重构、测试修复       | 实现 PR、迁移代码、修 bug    |
| **调研员**   | Grok                  | 实时搜索、API 文档、方案对比       | 找最佳实践、对比库、查文档   |
| **中文专家** | GLM                   | 中文理解、提示词优化               | 需求澄清、AI prompt 优化     |
| **深度思考** | Claude 4.5            | 复杂推理、架构决策、风险识别       | 深度 review、疑难问题攻关    |
| **全能选手** | Gemini Pro 3          | 大上下文、多模态、跨文件一致性     | 跨模块检查、长文档分析       |

---

## 4. 任务卡模板

> 路径: `tasks/TASK-YYYYMMDD-XXX.md`

```markdown
# TASK-20260116-001: [任务标题]

## 背景 (Why)
[为什么要做这个任务]

## 目标 (Done Definition)
- [ ] 条件1（可验证）
- [ ] 条件2（可验证）
- [ ] CI 全绿

## 范围
**In-scope:**
- ...

**Out-of-scope:**
- ...

## 契约 (Contract)
```typescript
// 接口定义
interface XXX {
  ...
}
```

## 实施计划 (小步拆分)

1. PR1: [描述] → 负责人: Codex
2. PR2: [描述] → 负责人: Codex
3. PR3: [描述] → 负责人: Codex

## 验收清单

- [ ] 类型检查通过 (`pnpm check`)
- [ ] 测试通过 (`pnpm test`)
- [ ] 无行为回归
- [ ] Code review 通过

## 依赖与风险

- 风险1 → 缓解措施
- 风险2 → 缓解措施

## 进度日志

| 时间 | Agent | 动作 | 产物 |
| ---- | ----- | ---- | ---- |
| ...  | ...   | ...  | ...  |

```

---

## 5. 架构基线

### 5.1 当前架构问题（2026-01-16 评审结论）

| 问题 | 严重性 | 建议 |
|------|--------|------|
| routers.ts 过大 (880+ 行) | 高 | 按领域拆分：stocks/sessions/auth/ai |
| 数据源切换逻辑散落 | 中 | 抽取 Provider 模式 |
| 缓存逻辑耦合在业务代码 | 中 | 抽取 Cache 抽象层 |
| getDetail 阻塞太久 | 中 | 拆分为 getQuote + getEnrichment |

### 5.2 数据加载优先级

| 优先级 | 数据 | 延迟目标 | 加载策略 |
|--------|------|----------|----------|
| **P1 即时** | 价格、涨跌幅、开高低收、成交量 | <300ms | 首屏立即显示 |
| **P2 快速** | 换手率、量比、PE/PB、市值 | <500ms | 同 P1（已包含） |
| **P3 延迟** | 资金流向、人气排名、K线 | <2s | 骨架屏 → 渐显 |
| **P4 按需** | 技术评分、AI分析 | 用户触发 | 懒加载 |

### 5.3 AI 标签系统设计

```typescript
interface AIInsightTags {
  signal: {
    type: "buy" | "hold" | "sell" | "wait";
    confidence: number;  // 0-100
    reason: string;
  };
  
  sentiment: Array<{
    tag: "hot" | "cold" | "inflow" | "outflow";
    value?: number;
  }>;
  
  patterns: Array<{
    tag: "breakout" | "breakdown" | "golden_cross" | "death_cross";
    level?: number;
  }>;
  
  risks: Array<{
    tag: "high_position" | "limit_up_streak" | "earnings_warning";
    severity: "low" | "medium" | "high";
  }>;
  
  summary: string;
}
```

---

## 6. 多 Agent 协作流程

```
┌─────────────────────────────────────────────────────────────┐
│                    阶段 0: 需求澄清                          │
│                    GLM 主笔 → Amp 裁决                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    阶段 1: 契约与设计                        │
│                    Amp + Claude 4.5                         │
│                    产物: Task Card + 契约                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    阶段 2: 调研                              │
│                    Grok                                     │
│                    产物: 对比表 + 建议方案                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    阶段 3: 实现                              │
│                    Codex (Ralph-Loop)                       │
│                    产物: 小 PR                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    阶段 4: 审查                              │
│                    Claude 4.5 + Gemini → Amp 签收            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    阶段 5: 合并与回归                        │
│                    自动化 CI + Checklist                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Ralph-Loop 规范

### 7.1 核心概念

- **状态在 Git，不在 AI 脑子里** — 每次 loop 都是全新 context
- **小任务** — 每个任务必须在一个 context window 内完成
- **循环直到完成** — 自动 pick 下一个未完成的任务

### 7.2 Git 使用说明

Ralph-Loop 的 Git 使用有两种模式：

#### 模式 A: 纯本地 Git（简单快速）

```bash
# 每个任务完成后
git add -A
git commit -m "feat: 完成 XXX"
```

- 适合：个人开发、快速迭代
- 状态持久化：本地 commit history
- 回滚：`git reset --hard HEAD~1`

#### 模式 B: GitHub PR 工作流（推荐 ✅）

```bash
# 创建 feature 分支
git checkout -b feature/task-001

# 完成后推送
git push origin feature/task-001

# 创建 PR → 自动触发 CI + AI Review → Merge
```

- 适合：多人协作、需要 Code Review
- 状态持久化：PR + commit history
- 好处：可追溯、可讨论、可回滚、**自动 AI Review**

### 7.3 GitHub Actions 自动化

#### CI 检查 (已配置)

```yaml
# .github/workflows/ci.yml
- pnpm check    # 类型检查
- pnpm check:dev
```

#### AI Code Review (已配置)

```yaml
# .github/workflows/ai-review.yml
# PR 创建/更新时自动触发
# 使用智谱 GLM-4.7 审查代码
# 自动发表评论
```

**需要配置 Secret:**

```
Settings → Secrets → Actions → New secret
Name: GLM_API_KEY
Value: <你的智谱 API Key，从 https://open.bigmodel.cn 获取>
```

> 💡 GLM-4.7 是智谱最强模型，Code Review 质量高

#### 工作流程

```
Codex 完成任务
    │
    ▼
git push → 创建 PR
    │
    ├──→ CI: pnpm check ✅
    │
    └──→ AI Review: Claude 审查 → 发评论
              │
              ▼
         人工确认 → Merge

### 7.4 文件结构

```

tasks/
├── 2026-01-16/
│   ├── PRD.json              # 今日任务清单
│   ├── progress.txt          # 总进度
│   ├── codex/
│   │   ├── task.md           # Codex 的任务描述
│   │   ├── prd.json          # Codex 的 Ralph PRD
│   │   └── progress.txt      # Codex 进度
│   ├── grok/
│   │   ├── task.md           # 调研任务
│   │   └── output.md         # 调研结果
│   └── glm/
│       ├── task.md           # 提示词优化任务
│       └── output.md         # 优化后的提示词

```

### 7.5 Loop 退出条件

- ✅ 满足 Done Definition
- ✅ CI 通过
- ✅ Reviewer sign-off
- ✅ 输出 `<promise>COMPLETE</promise>`

---

## 8. Clawdbot 自动化

### 8.1 配置示例

```yaml
# ~/clawd/config.yaml
agents:
  director:           # 总监（Amp）
    workspace: ~/DragonFly
    model: claude-sonnet-4
  
  codex:              # 代码实现
    workspace: ~/DragonFly
    model: codex
  
  grok:               # 调研
    workspace: ~/DragonFly
    model: grok

cron:
  - name: "daily-planning"
    schedule: "0 9 * * *"
    session: director
    message: "读取 tasks/ 目录，生成今日任务"
  
  - name: "progress-check"
    schedule: "0 18 * * *"
    session: director
    message: "检查进度，汇总报告"
```

### 8.2 Agent 间通信

```typescript
// 总监分发任务给 Codex
sessions_send({
  target: "codex",
  message: "执行 tasks/2026-01-16/codex/task.md",
  reply_back: true  // 完成后回报
});
```

---

## 9. 当前任务 (2026-01-17)

### TASK-001: Critical Bug 修复 🔴 P0

**状态**: ⏳ 待执行

GLM 4.7 发现 6 个阻塞性问题，必须先修复：

1. StockDetailPanel.tsx 重复代码块（语法错误）
2. 时间戳 null 未处理
3. akshare.ts 并发竞争
4. ifind.ts Token 刷新竞态
5. routers.ts API 函数不存在
6. 会话状态不一致

详见: `tasks/2026-01-17/TASK-001-critical-bugs.md`

---

### TASK-002: Router 架构重构 🟡 P1

**状态**: ⏳ 等待 TASK-001

详见: `tasks/2026-01-17/TASK-002-router-refactor.md`

---

### TASK-003: High Bug 修复 🟠 P2

**状态**: ⏳ 等待 TASK-001

详见: `tasks/2026-01-17/TASK-003-high-bugs.md`

---

**进度日志:**

| 时间       | Agent | 动作        | 产物                  |
| ---------- | ----- | ----------- | --------------------- |
| 2026-01-16 | Amp   | 架构评审    | AI-COLLAB-PLAYBOOK.md |
| 2026-01-16 | GLM   | Code Review | glm4.7.md             |
| 2026-01-16 | Amp   | 创建任务    | tasks/2026-01-17/*.md |

---

## 📎 附录

### A. PR 模板

```markdown
## 改动范围
- 

## 风险
- 

## 测试证据
```bash
pnpm check  # 通过
pnpm test   # 通过
```

## 回滚方式

```

### B. Code Review Checklist

- [ ] 类型安全（无 `any`）
- [ ] 错误处理（不吞错）
- [ ] 降级策略（有 fallback）
- [ ] 日志可观测
- [ ] 无安全隐患

---

> 📌 **使用方式**: 下次对话时，先把这个文档喂给 Amp，它会按照这套流程工作。
```
