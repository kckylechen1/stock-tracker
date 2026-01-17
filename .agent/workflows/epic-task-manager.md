---
description: Epic 任务管理 - 按模块组织多 Agent 协作任务
---

# 🎯 Epic 任务管理 Skill

## 概述

这是一个通用的多 Agent 协作任务管理规范，适用于所有项目。

---

## 📁 目录结构

每个项目应该有以下结构：

```
tasks/
├── README.md           # 任务管理说明
├── today.md            # 今日待办清单
└── epics/              # 按模块组织的任务
    ├── {epic-name}/    # 每个 Epic 一个文件夹
    │   ├── README.md   # Epic 总览（必看）
    │   ├── glm/        # GLM Agent 任务
    │   ├── codex/      # Codex Agent 任务
    │   ├── amp/        # Amp Agent 任务
    │   ├── grok/       # Grok Agent 任务
    │   └── output/     # 产出物
    └── ...
```

---

## 🔄 工作流程

### 1. 用户启动任务

```
用户: "今天干 {epic-name}"
用户: "执行任务 {epic-name}"
用户: "开始做 {epic-name}"
```

### 2. Amp 读取并确认

- 读取 `tasks/epics/{epic-name}/README.md`
- 理解目标和子任务分配
- 向用户确认方案，提出问题

### 3. 用户批准

```
用户: "确认" / "开始" / "没问题"
```

### 4. Amp 分发任务

根据 README 中的分配：
- 🔵 GLM: 力大飞砖，大量代码生成
- 🟢 Codex: 前端组件、测试
- 🟡 Amp: 架构设计、AI 集成
- 🔴 Grok: 调研、API 文档

### 5. 小弟执行

每个 Agent 读取自己目录下的任务文件，产出放到 `output/`

### 6. Amp 审查

- 检查产出是否符合 Done Definition
- 签收或要求返工

---

## 📝 Epic README 模板

```markdown
# 🎯 Epic: {任务名称}

> **状态**: 🆕 新建 | ⏳ 进行中 | ✅ 完成
> **优先级**: P0/P1/P2

## 📝 简述
{一两句话描述目标}

## ✅ Done Definition
- [ ] 条件1
- [ ] 条件2
- [ ] CI 通过

## 📊 子任务分配
| 任务 | Agent | 描述 |
|------|-------|------|
| TASK-001 | 🔵 GLM | ... |
| TASK-002 | 🟢 Codex | ... |

## 🔄 执行顺序
Phase 1: ...
Phase 2: ...
```

---

## 📝 子任务模板

```markdown
# TASK-XXX: {任务标题}

## 负责 Agent: 🔵 GLM / 🟢 Codex / 🟡 Amp / 🔴 Grok

## 目标
- [ ] 目标1
- [ ] 目标2

## 契约
\`\`\`typescript
// 接口定义
\`\`\`

## 文件清单
| 操作 | 文件路径 |
|------|----------|
| CREATE | `path/to/file` |
| MODIFY | `path/to/file` |
```

---

## 💬 常用命令

| 命令 | 描述 |
|------|------|
| `今天干 {epic}` | 启动任务 |
| `查看进度` | 查看当前状态 |
| `检查 {agent} 产出` | 审查特定 Agent 的产出 |
| `完成 {epic}` | 标记任务完成 |

---

## 🎭 Agent 角色

| Agent | 擅长 | 适合任务 |
|-------|------|----------|
| 🔵 GLM | 力大飞砖、中文 | 大量后端代码、中文内容 |
| 🟢 Codex | 代码生成 | 前端组件、测试、重构 |
| 🟡 Amp | 架构思考 | 设计、审查、复杂逻辑 |
| 🔴 Grok | 实时搜索 | 调研、API 文档、对比 |

---

## 🚀 初始化新项目

在新项目中创建任务系统：

```bash
mkdir -p tasks/epics
touch tasks/README.md tasks/today.md
```

然后复制本 Skill 中的模板即可。
