---
description: 开发前必读 - 文档管理和开发流程规范
---

# 开发工作流规范

## 开工检查清单

1. **确认当前分支**

```bash
git branch  # 确认不在 main，应该在 feature/xxx 分支
git status  # 确认工作区干净
```

2. **拉取最新代码**

```bash
git checkout main
git pull origin main
git checkout -b feature/今日任务名称
```

3. **确认项目可运行**

```bash
npm run dev  # 确保项目能正常启动
```

## 开发过程

### 小步提交

- 每完成一个小功能就提交
- 不要攒着几个功能一起提交
- Commit message 用中文清晰描述

### 提交规范

```
feat: 新增功能
fix: 修复bug
refactor: 重构（不改变功能）
docs: 文档更新
style: 代码格式
test: 测试相关
chore: 构建/工具
```

### 开发命令

```bash
# 启动开发服务器
cd stock-tracker && npm run dev

# 启动全部服务（包括 AKTools）
cd stock-tracker && npm run start:all

# 构建检查
npm run build

# 停止 AKTools
npm run stop:aktools
```

## 收工流程

1. **确保可构建**

```bash
npm run build
```

2. **提交代码**

```bash
git add .
git commit -m "feat: 今日完成的功能"
git push origin feature/xxx
```

3. **合并到 main（如果功能完成）**

```bash
git checkout main
git pull origin main
git merge --no-ff feature/xxx
git push origin main
git branch -d feature/xxx
```

4. **生成工作总结**

- 说"收工"或"总结一下今天的工作"触发

## 项目关键路径

| 模块     | 路径                                       |
| -------- | ------------------------------------------ |
| 前端入口 | `client/src/main.tsx`                      |
| 主页面   | `client/src/pages/Home.tsx`                |
| AI 聊天  | `client/src/components/ai/AIChatPanel.tsx` |
| 后端路由 | `server/routers.ts`                        |
| AI 核心  | `server/_core/`                            |
| 股票API  | `server/eastmoney.ts`                      |
| AKShare  | `server/akshare.ts`                        |
