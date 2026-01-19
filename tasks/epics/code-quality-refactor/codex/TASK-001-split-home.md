✅ 完成

# TASK-001: 拆分 Home.tsx

## 负责 Agent: 🟢 Codex

## 📋 背景

`client/src/pages/Home.tsx` 目前有 **672 行**，包含了太多逻辑：
- 状态管理
- 事件处理
- UI 渲染
- 多个内联组件

需要拆分成更小、更可维护的组件。

---

## 🎯 目标

- [ ] Home.tsx 主文件 < 300 行
- [ ] 每个拆分出的组件 < 150 行
- [ ] 所有 Props 有明确类型定义（无 `any`）
- [ ] 编译通过
- [ ] 功能不变

---

## 📁 当前文件结构

```
client/src/
├── pages/
│   └── Home.tsx          # 672 行 ← 需要拆分
├── components/
│   ├── stock/            # 已有股票相关组件
│   ├── ai/               # 已有 AI 相关组件
│   ├── market/           # 已有市场相关组件
│   └── ui/               # 基础 UI 组件
```

---

## 🔧 拆分建议

根据代码分析，建议拆分以下组件：

### 1. `StockTabBar.tsx` - 股票标签栏
```
位置: client/src/components/stock/StockTabBar.tsx
来源: Home.tsx 中的 StockTab 组件及相关逻辑
预估: ~80 行
```

### 2. `MainLayout.tsx` - 主布局容器
```
位置: client/src/components/layout/MainLayout.tsx
来源: ResizablePanelGroup 相关布局代码
预估: ~100 行
```

### 3. `SearchSection.tsx` - 搜索区域
```
位置: client/src/components/stock/SearchSection.tsx
来源: 搜索输入框、搜索结果相关代码
预估: ~80 行
```

### 4. 使用自定义 Hooks 抽取逻辑
```
位置: client/src/hooks/useWatchlist.ts
来源: watchlist 相关的 query/mutation 逻辑
预估: ~50 行
```

---

## 📝 执行步骤

### Step 1: 分析现有代码结构
```bash
# 查看 Home.tsx 的代码大纲
# 识别可以拆分的逻辑块
```

### Step 2: 创建 StockTabBar 组件
```bash
# 1. 创建文件 client/src/components/stock/StockTabBar.tsx
# 2. 移动 StockTab 组件和相关逻辑
# 3. 定义 Props 接口
# 4. 在 Home.tsx 中导入使用
# 5. 验证编译通过
```

### Step 3: 创建 SearchSection 组件
```bash
# 同上流程
```

### Step 4: 抽取自定义 Hooks
```bash
# 1. 创建 client/src/hooks/useWatchlist.ts
# 2. 移动 watchlist 相关的 query/mutation
# 3. 在 Home.tsx 中使用 hook
```

### Step 5: 验证
```bash
# 编译检查
pnpm build

# 类型检查
pnpm typecheck

# 手动测试页面功能
pnpm dev
```

### Step 6: 提交
```bash
git add -A
git commit -m "refactor(client): split Home.tsx into smaller components

- Extract StockTabBar component
- Extract SearchSection component  
- Create useWatchlist hook
- Home.tsx reduced from 672 to ~280 lines"
```

---

## ⚠️ 注意事项

1. **逐步拆分** - 每拆分一个组件就验证一次
2. **保持类型安全** - 所有 Props 都要有类型定义
3. **不改功能** - 这是纯重构，功能必须保持不变
4. **小步提交** - 每完成一个组件就 commit

---

## 📊 完成标准

| 检查项 | 要求 |
|--------|------|
| Home.tsx 行数 | < 300 行 |
| 编译 | `pnpm build` 通过 |
| 类型检查 | 无 `any` 类型警告 |
| 功能测试 | 页面正常工作 |

---

## 🔗 相关文件

- `client/src/pages/Home.tsx` - 主文件
- `client/src/components/stock/` - 股票组件目录
- `client/src/hooks/` - Hook 目录

---

## ✅ 完成后

1. 在本文件顶部标记状态为 `✅ 完成`
2. 通知 Amp 进行 Code Review (TASK-002)
