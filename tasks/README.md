# 📋 任务管理系统

## 📁 目录结构

```
tasks/
├── README.md           # 本文件 - 任务管理说明
├── today.md            # 今日待办清单（每日更新）
├── epics/              # 按模块组织的任务
│   ├── user-profile/   # Epic 1: 用户画像系统
│   ├── bull-signal/    # Epic 2: 牛股信号系统
│   └── ...
└── archive/            # 已完成/存档的任务
```

---

## 🔄 工作流程

```
1. 用户: "今天干 user-profile"
         ↓
2. Amp: 读取 tasks/epics/user-profile/README.md
         ↓
3. Amp: 确认方案，提出问题
         ↓
4. 用户: 确认
         ↓
5. Amp: 分发子任务给 GLM/Codex/Grok
         ↓
6. 小弟: 执行，输出到 output/ 目录
         ↓
7. Amp: 审查，签收或返工
         ↓
8. 完成: 更新 today.md 状态
```

---

## 💬 使用方式

### 启动任务
```
用户: "今天干 user-profile"
用户: "执行 epic1"
用户: "开始做用户画像系统"
```

### 查看进度
```
用户: "查看今日进度"
用户: "user-profile 进展如何"
```

### 检查产出
```
用户: "检查 GLM 的产出"
用户: "审查 TASK-004"
```

---

## 📌 Epic 列表

| ID | Epic | 状态 | 描述 |
|----|------|------|------|
| 1 | `user-profile` | 🆕 新建 | AI 用户画像系统 |
| 2 | `bull-signal` | ✅ 已完成 | 牛股信号系统 |
| 3 | `router-refactor` | ⏳ 待办 | Router 架构重构 |

---

**维护者**: Amp  
**最后更新**: 2026-01-17
