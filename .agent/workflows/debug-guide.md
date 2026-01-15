---
description: 调试问题时的检查清单和常见陷阱
---

# 调试指南

## 常见问题排查

### 1. 前端不显示数据

**检查顺序**：
1. 浏览器控制台是否有错误？
2. Network 标签查看 API 请求是否成功
3. 后端日志是否有报错

```bash
# 查看后端日志
tail -f docs/logs/server.log
```

### 2. API 调用失败

**可能原因**：
- AKTools 服务未启动
- API 限流
- 网络问题

**排查步骤**：
```bash
# 检查 AKTools 状态
curl http://localhost:8765/api/public/test

# 重启 AKTools
npm run stop:aktools
npm run start:all
```

### 3. TypeScript 类型错误

**常见问题**：
- 接口定义不匹配
- 可选字段未处理
- any 类型滥用

**解决方法**：
```bash
# 检查类型错误
npx tsc --noEmit

# 查看具体错误
npm run build 2>&1 | head -50
```

### 4. 构建失败

**排查步骤**：
1. 检查 import 路径是否正确
2. 检查是否有循环依赖
3. 检查 tsconfig.json 配置

```bash
# 清除缓存重新构建
rm -rf dist node_modules/.cache
npm run build
```

## API 调试技巧

### 东方财富 API
```typescript
// 测试单个接口
import { eastmoney } from './server/eastmoney';
const quote = await eastmoney.getStockQuote('300750');
console.log(quote);
```

### AKShare API
```typescript
// 测试 AKShare 接口
import { callAKShare } from './server/akshare';
const data = await callAKShare('stock_zh_a_spot_em');
console.log(data.slice(0, 5));
```

## 日志位置

| 日志类型 | 路径 |
|----------|------|
| 服务器日志 | `docs/logs/server.log` |
| AKTools日志 | `docs/logs/aktools.log` |
| Bug修复记录 | `docs/logs/BUGFIX_*.log` |

## 常见陷阱

### 1. 缓存问题
- 浏览器缓存：Cmd+Shift+R 强制刷新
- Vite 缓存：删除 `node_modules/.vite`
- API 缓存：检查 staleTime 设置

### 2. 异步问题
- 忘记 await
- Promise 链中断
- 并发请求竞争

### 3. 状态管理
- React 状态更新是异步的
- useEffect 依赖项缺失
- 闭包陷阱（获取到旧值）
