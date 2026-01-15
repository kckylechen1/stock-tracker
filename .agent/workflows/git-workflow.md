---
description: Git 分支管理最佳实践 - 多 Agent 协作开发规范
---

# Git 工作流规范

## 开始新功能开发

// turbo-all

```bash
# 1. 确保在最新的 main 分支
git checkout main
git pull origin main

# 2. 创建功能分支（用你的功能名替换 xxx）
git checkout -b feature/xxx
```

## 开发过程中

```bash
# 查看当前状态
git status

# 查看改动
git diff

# 添加改动（交互式，只添加相关改动）
git add -p

# 或添加所有改动
git add .

# 提交（使用规范的 commit message）
git commit -m "feat: 你的功能描述"
# feat: 新功能
# fix: 修复 bug
# refactor: 重构
# docs: 文档
# style: 代码格式
# test: 测试
# chore: 构建/工具
```

## 完成开发后

```bash
# 推送到远程
git push origin feature/xxx

# 创建 Pull Request（在 GitHub 上操作）
# 或者直接合并（如果你是唯一开发者）：
git checkout main
git pull origin main
git merge --no-ff feature/xxx
git push origin main

# 删除已完成的分支
git branch -d feature/xxx
git push origin --delete feature/xxx
```

## 紧急回退

```bash
# 撤销工作区改动（未 add）
git checkout -- <file>

# 撤销已 add 的改动
git reset HEAD <file>

# 撤销最后一次 commit（保留改动）
git reset --soft HEAD^

# 完全回退到某个版本（⚠️ 谨慎使用）
git reset --hard <commit-hash>
```

## 多 Agent 协作规则

1. **每个 Agent 一个分支**：不要多个 Agent 同时修改同一个分支
2. **不要直接在 main 上开发**：所有开发都在 feature 分支进行
3. **小步提交**：每完成一个小功能就提交，不要攒着
4. **有意义的 commit message**：让别人（和未来的自己）能看懂
5. **合并前确保能构建**：`npm run build` 必须成功

## 查看历史

```bash
# 查看最近 10 条提交
git log --oneline -10

# 查看分支图
git log --oneline --graph --all -20

# 查看某个文件的修改历史
git log --oneline <file>
```
