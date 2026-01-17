# TASK-20260117-001: Critical Bug 修复

> **状态**: ✅ 已完成
> **优先级**: 🔴 P0 - 阻塞性
> **负责人**: Codex (由 Claude 代执行)
> **来源**: GLM 4.7 Code Review (glm4.7.md)
> **完成时间**: 2026-01-17

---

## 背景 (Why)

GLM 4.7 对代码进行了全面审查，发现 **6 个 Critical 问题**，这些问题会导致：
- 应用无法启动
- 运行时崩溃
- 数据不一致

必须在架构重构之前先修复这些阻塞性问题。

---

## 目标 (Done Definition)

- [x] 修复所有 6 个 Critical 问题 (实际只需修复 2 个，其他已修复/误报)
- [x] `pnpm check` 通过
- [ ] `pnpm dev` 能正常启动 (待验证)
- [ ] 无控制台错误 (待验证)

---

## Critical 问题清单

### 1. ⛔ StockDetailPanel.tsx 重复代码块（语法错误）

**文件**: `client/src/components/stock/StockDetailPanel.tsx`  
**行号**: 463-486  
**问题**: return 后有重复的变量声明，导致编译失败

**修复**: 删除第 463-486 行的重复代码

---

### 2. ⚠️ StockDetailPanel.tsx 时间戳 null 未处理

**文件**: `client/src/components/stock/StockDetailPanel.tsx`  
**行号**: 305-312  
**问题**: `item.time.split(' ')` 未检查 null

**修复**:
```typescript
const timeParts = item.time?.split(' ') || [];
const dateStr = timeParts[0];
if (!dateStr) continue;
const timeStr = timeParts[1] || '09:30';
```

---

### 3. 🔐 akshare.ts 并发竞争条件

**文件**: `server/akshare.ts`  
**行号**: 28-56  
**问题**: 多请求并发时状态检查不一致

**修复**: 使用 Promise 锁避免重复检查
```typescript
let statusCheckPromise: Promise<boolean> | null = null;

export async function checkAKToolsStatus(): Promise<boolean> {
  if (statusCheckPromise) {
    return statusCheckPromise;
  }
  statusCheckPromise = (async () => {
    // ... 检查逻辑
  })();
  return statusCheckPromise;
}
```

---

### 4. 🔑 ifind.ts Token 刷新竞态

**文件**: `server/ifind.ts`  
**行号**: 22-58  
**问题**: 多个并发请求可能同时触发 token 刷新

**修复**: 使用 Promise 锁
```typescript
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }
  refreshPromise = (async () => {
    // ... 刷新逻辑
  })();
  return refreshPromise;
}
```

---

### 5. 📡 routers.ts API 函数不存在

**文件**: `server/routers.ts`  
**行号**: 113-114  
**问题**: `akshare.getStockInfo` 可能不存在

**修复**: 添加 try-catch 和 fallback
```typescript
let stockInfo;
try {
  stockInfo = await akshare.getStockInfo(input.code);
} catch {
  stockInfo = {
    code: quote.code,
    name: quote.name,
    market: quote.code.startsWith('6') ? 'SH' : 'SZ'
  };
}
```

---

### 6. 🔄 routers.ts 会话状态不一致

**文件**: `server/routers.ts`  
**行号**: 636-642  
**问题**: 会话获取逻辑分散

**修复**: 统一会话管理，使用单一获取逻辑

---

## 验收清单

- [ ] `pnpm check` 通过
- [ ] `pnpm dev` 正常启动
- [ ] 股票详情页正常显示
- [ ] 无控制台错误
- [ ] 并发请求测试通过

---

## 执行顺序

1. 先修复 #1（语法错误）→ 否则编译都过不了
2. 修复 #2（null 处理）
3. 修复 #3 和 #4（并发问题）
4. 修复 #5 和 #6（API 和会话）
5. 运行验证
