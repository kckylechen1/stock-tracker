# 🎯 Epic: 用户画像系统 (User Profile)

> **状态**: 🆕 新建  
> **优先级**: P1  
> **创建日期**: 2026-01-17  
> **最后更新**: 2026-01-18

---

## 📝 简述

构建多用户画像系统，让 AI 能够：
- 识别不同用户
- 通过 5 个核心问题收集交易特征
- 基于 Profile 提供个性化建议

---

## ✅ Done Definition

- [ ] 用户可通过按钮切换/添加用户
- [ ] 新用户触发 5 个核心问题问诊
- [ ] 每用户的 Profile 和聊天历史独立存储
- [ ] AI 回复使用 Profile 上下文
- [ ] 可选进行更深度问诊（15题）

---

## 📊 子任务分配

| 任务 | 描述 | Agent | 文件 |
|------|------|-------|------|
| TASK-004 | 用户管理 (UserStore) | 🔵 GLM | `glm/TASK-004-user-store.md` |
| TASK-005 | Profile 模型扩展 | 🔵 GLM | `glm/TASK-005-profile-model.md` |
| TASK-006 | 问诊引擎 | 🔵 GLM | `glm/TASK-006-profiling-engine.md` |
| TASK-007 | 前端 UI 组件 | 🟢 Codex | `codex/TASK-007-frontend-ui.md` |
| TASK-008 | AI 上下文注入 | 🟣 Amp | `amp/TASK-008-ai-context.md` |
| TASK-009 | 问诊问题调研 | 🟡 Grok | `grok/TASK-009-research.md` |

### Agent 符号说明

| 符号 | Agent | 模型 |
|------|-------|------|
| 🔴 | Antigravity | Claude Opus 4.5 (总监/协调) |
| 🟣 | Amp | Claude Sonnet 4.5 (审查/复杂集成) |
| 🔵 | GLM | GLM-4.7 (后端苦力) |
| 🟢 | Codex | GPT-5.2 Codex (前端/细致任务) |
| 🟡 | Grok | xAI Grok (调研) |

---

## 🔄 执行顺序

```
Phase 1 (并行): 🟡 Grok 调研 + 🔵 GLM 用户管理
Phase 2:        🔵 GLM Profile 模型
Phase 3:        🔵 GLM 问诊引擎
Phase 4 (并行): 🟢 Codex 前端 + 🟣 Amp AI 注入
Phase 5:        🟣 Amp 验收
```

---

## 💬 启动方式

```
你: "今天干 user-profile"
Antigravity: 读取此文件 → 确认方案 → 分发任务给各 Agent
```

---

## 📁 目录结构

```
user-profile/
├── README.md      # 本文件 (Epic 总览)
├── glm/           # 🔵 GLM 任务
│   ├── TASK-004-user-store.md
│   ├── TASK-005-profile-model.md
│   └── TASK-006-profiling-engine.md
├── codex/         # 🟢 Codex 任务
│   └── TASK-007-frontend-ui.md
├── amp/           # 🟣 Amp 任务
│   └── TASK-008-ai-context.md
├── grok/          # 🟡 Grok 调研
│   └── TASK-009-research.md
└── output/        # 产出物
```

---

## 📋 任务依赖图

```
TASK-009 (Grok 调研)
    │
    ▼
TASK-004 (GLM 用户管理) ─────┐
    │                        │
    ▼                        │
TASK-005 (GLM Profile) ──────┼───→ TASK-008 (Amp AI注入)
    │                        │
    ▼                        │
TASK-006 (GLM 问诊引擎) ─────┘
    │
    ▼
TASK-007 (Codex 前端)
```
