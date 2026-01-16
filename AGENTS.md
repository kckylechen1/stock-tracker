# 🤖 AI Agent 行为规范

本项目由多个 AI Agent 协作开发（Claude Code、OpenCode、Cursor 等）。请遵循以下规范以保持项目整洁和可维护。

---

## 🚀 构建、测试和开发命令

### 包管理器

使用 **pnpm** 作为包管理器（已在 `packageManager` 字段指定）。

### 开发命令

```bash
# 启动开发服务器（热重载）
pnpm dev

# 启动完整服务（前端 + 后端）
pnpm start:all

# 停止 AKTools 服务
pnpm stop:aktools
```

### 构建命令

```bash
# 生产构建（前端 + 后端打包）
pnpm build

# 类型检查（不生成文件）
pnpm check
```

### 测试命令

```bash
# 运行所有测试
pnpm test

# 运行单个测试文件
pnpm vitest run server/eastmoney.test.ts

# 运行匹配名称的测试
pnpm vitest run -- -t "should convert stock code"

# 运行测试并显示覆盖率
pnpm vitest run --coverage
```

### 代码质量命令

```bash
# 格式化代码
pnpm format

# 类型检查
pnpm check
```

### 数据库命令

```bash
# 生成并运行数据库迁移
pnpm db:push
```

---

## 💅 代码风格指南

### 语言和框架

- **TypeScript**: 所有新代码必须使用 TypeScript
- **React**: 前端使用 React 19，支持 hooks 和函数组件
- **Node.js**: 后端使用 Express + tRPC
- **数据库**: Drizzle ORM + MySQL

### 格式化（Prettier 配置）

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": false,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "bracketSameLine": false,
  "arrowParens": "avoid",
  "endOfLine": "lf",
  "quoteProps": "as-needed",
  "jsxSingleQuote": false
}
```

**关键规则**:

- 使用双引号（除非 JSX 中）
- 强制分号
- 2 空格缩进
- 最大行宽 80 字符

### 导入和模块

```typescript
// 1. 第三方库导入（按字母顺序）
import axios from "axios";
import express from "express";
import { z } from "zod";

// 2. 本地模块导入（使用 @/ 路径别名）
import { appRouter } from "@/routers";
import { createContext } from "./context";

// 3. 类型导入（使用 type 关键字）
import type { Request, Response } from "express";
```

**导入分组规则**:

1. 第三方库（node_modules）
2. 本地模块（相对路径或别名）
3. 类型导入（type 关键字）

### 命名约定

#### 文件和目录

- **组件**: `PascalCase.tsx` (如 `StockChart.tsx`)
- **工具函数**: `camelCase.ts` (如 `formatPrice.ts`)
- **类型定义**: `PascalCase.ts` (如 `StockData.ts`)
- **测试文件**: `*.test.ts` 或 `*.spec.ts`
- **目录**: `kebab-case` (如 `stock-analysis/`)

#### 变量和函数

```typescript
// 常量（大写蛇形）
const API_BASE_URL = "https://api.example.com";

// 变量和函数（驼峰）
const stockData = await fetchStockData();
function calculateMovingAverage(prices: number[]) { ... }

// 布尔值（is/has/can 前缀）
const isLoading = false;
const hasData = true;
const canEdit = false;

// 事件处理器（handle 前缀）
function handleSubmit(event: FormEvent) { ... }

// React hooks（use 前缀）
function useStockData(symbol: string) { ... }
```

#### 类型和接口

```typescript
// 接口（PascalCase，I 前缀可选但推荐）
interface IStockData {
  symbol: string;
  price: number;
  volume: number;
}

// 类型别名
type StockStatus = "active" | "inactive" | "suspended";

// 泛型
type ApiResponse<T> = {
  data: T;
  error?: string;
};
```

### React 组件约定

```tsx
interface StockCardProps {
  symbol: string;
  price: number;
  change: number;
}

// 函数组件（箭头函数）
export function StockCard({ symbol, price, change }: StockCardProps) {
  // 早期返回
  if (!symbol) return null;

  // 计算逻辑
  const isPositive = change > 0;

  return (
    <div className="stock-card">
      <h3>{symbol}</h3>
      <span className={isPositive ? "positive" : "negative"}>{price}</span>
    </div>
  );
}
```

**组件规则**:

- 使用函数组件和 hooks
- Props 使用接口定义
- 早期返回避免嵌套
- 条件类名使用 clsx 或条件表达式

### 错误处理

```typescript
// 1. 异步函数使用 try/catch
async function fetchStockData(symbol: string) {
  try {
    const response = await axios.get(`/api/stocks/${symbol}`);
    return response.data;
  } catch (error) {
    console.error(`Failed to fetch stock data for ${symbol}:`, error);
    throw new Error(`Stock data fetch failed: ${error.message}`);
  }
}

// 2. 自定义错误类
class ValidationError extends Error {
  constructor(message: string, field: string) {
    super(message);
    this.name = "ValidationError";
    this.field = field;
  }
  field: string;
}

// 3. 错误边界（React）
class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Error caught by boundary:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return <div>Something went wrong</div>;
    }
    return this.props.children;
  }
}
```

### 类型安全

```typescript
// 1. 避免 any，使用 unknown 或具体类型
function processData(data: unknown): StockData {
  if (typeof data === "object" && data !== null) {
    // 类型守卫
    if ("symbol" in data && "price" in data) {
      return data as StockData;
    }
  }
  throw new ValidationError("Invalid data format", "data");
}

// 2. 使用 Zod 进行运行时验证
import { z } from "zod";

const StockDataSchema = z.object({
  symbol: z.string().min(1),
  price: z.number().positive(),
  volume: z.number().int().positive(),
});

function validateStockData(data: unknown): StockData {
  return StockDataSchema.parse(data);
}

// 3. 泛型约束
function createApiResponse<T extends Record<string, any>>(data: T) {
  return {
    data,
    timestamp: Date.now(),
    success: true,
  };
}
```

### 测试约定

```typescript
import { describe, it, expect, vi } from "vitest";

// 1. 测试文件结构
describe("Stock API", () => {
  describe("getStockData", () => {
    it("should return stock data for valid symbol", async () => {
      // 准备
      const mockData = { symbol: "AAPL", price: 150 };
      vi.mocked(axios.get).mockResolvedValue({ data: mockData });

      // 执行
      const result = await getStockData("AAPL");

      // 断言
      expect(result).toEqual(mockData);
      expect(axios.get).toHaveBeenCalledWith("/api/stocks/AAPL");
    });

    it("should throw error for invalid symbol", async () => {
      await expect(getStockData("")).rejects.toThrow("Invalid symbol");
    });
  });
});

// 2. Mock 约定
vi.mock("axios");
const mockAxios = vi.mocked(axios);
```

### 注释规范

```typescript
// 1. 函数注释（JSDoc）
/**
 * 计算简单移动平均线
 * @param prices 价格数组
 * @param period 周期数
 * @returns 移动平均线数组
 */
function calculateSMA(prices: number[], period: number): number[] {
  // 实现逻辑
}

// 2. 复杂逻辑注释
function processStockData(data: RawStockData) {
  // 过滤无效数据点
  const validData = data.filter(point => point.price > 0);

  // 计算技术指标
  // 注意：这里使用 EMA 而非 SMA 以获得更灵敏的信号
  const ema = calculateEMA(
    validData.map(p => p.price),
    20
  );

  return { validData, ema };
}

// 3. TODO 注释
// TODO: 实现缓存机制以提升性能
// FIXME: 这个算法在极端情况下可能有精度问题
```

---

## 📁 目录结构规范

```
stock-tracker/
├── client/                 # 前端代码 (React)
├── server/                 # 后端代码 (Express + tRPC)
│   ├── _core/              # 核心模块
│   │   ├── agent/          # AI Agent 系统
│   │   ├── session/        # 会话管理
│   │   ├── memory/         # 记忆系统
│   │   └── skills/         # 技能系统
│   └── ...
├── shared/                 # 前后端共享代码
├── docs/                   # 📚 文档 (不进 git)
│   ├── reports/            # 测试报告、分析报告
│   ├── logs/               # 开发日志、会话记录
│   └── specs/              # 设计文档、规格说明
├── scripts/
│   └── tests/              # 测试脚本 (不进 git)
├── data/                   # 运行时数据 (不进 git)
└── AGENTS.md               # 本文件
```

---

## 📝 文件归档规范

### 1. 报告类文件 → `docs/reports/`

包括：

- 测试报告
- 分析报告
- 对比报告
- 回测报告

命名格式：

```
{类型}_{主题}_{日期}.md
例: AI_Agent_重构报告_20260111.md
```

### 2. 日志类文件 → `docs/logs/`

包括：

- 开发日志
- 会话记录
- 调试日志
- 回测日志

命名格式：

```
{类型}_{日期}_{主题}.md
例: 开发日志_20260111_Agent重构.md
```

### 3. 设计文档 → `docs/specs/`

包括：

- 系统设计文档
- API 规格说明
- 方法论文档
- 升级说明

命名格式：

```
{系统名}_{版本/特性}.md
例: 牛股信号分析系统_合规优化版.md
```

### 4. 测试脚本 → `scripts/tests/`

包括：

- 临时测试脚本
- 调试脚本
- 环境检查脚本

---

## ✅ 工作完成后必须做的事

每次完成一项工作后，请执行以下步骤：

### 1. 整理临时文件

```bash
# 如果在根目录创建了 .md 报告文件，移动到 docs/reports/
mv *.md docs/reports/ 2>/dev/null || true

# 如果创建了测试脚本，移动到 scripts/tests/
mv test_*.ts scripts/tests/ 2>/dev/null || true

# 清理日志文件
mv *.log docs/logs/ 2>/dev/null || true
```

### 2. 记录工作日志

在 `docs/logs/` 创建工作日志，格式如下：

```markdown
# 开发日志 - {主题}

**日期**: YYYY-MM-DD  
**开发者**: {你的名字}  
**耗时**: ~X 小时

## 📋 任务

{任务描述}

## ✅ 完成的工作

- [ ] 工作1
- [ ] 工作2

## 📁 新增/修改的文件

- `path/to/file.ts` - 说明

## 🧪 测试验证

{如何验证工作成果}

## 📝 后续 TODO

- [ ] 待办1
- [ ] 待办2
```

### 3. 更新 TODO

如果有未完成的工作，更新 `todo.md`。

---

## 🚫 禁止事项

1. **不要在根目录堆积文件**
   - 报告、日志、测试脚本必须放到对应目录

2. **不要提交敏感信息**
   - API Key、Token 等放在 `.env`
   - `.env` 已在 `.gitignore` 中

3. **不要提交大文件**
   - `docs/reports/`、`docs/logs/` 已在 `.gitignore` 中
   - 如需保留重要报告，手动 `git add -f`

4. **不要修改他人正在编辑的文件**
   - 先检查最近的开发日志
   - 避免冲突

---

## 🔧 常用命令

### 开发

```bash
# 启动开发服务器
pnpm dev

# 类型检查
pnpm tsc --noEmit

# 格式化代码
pnpm prettier --write .
```

### 测试

```bash
# 测试 SmartAgent
npx tsx server/test_smart_agent.ts

# 测试模型对比
npx tsx server/test_model_comparison.ts

# 运行回测
npx tsx server/bull_stock_signal_backtest.ts
```

### 整理

```bash
# 移动报告文件
mv *.md docs/reports/

# 移动日志文件
mv *.log docs/logs/

# 清理临时文件
rm -f *.pid *.bak
```

---

## 📊 模型使用建议

本项目配置了两个 AI 模型：

| 模型            | 用途               | 优势             |
| --------------- | ------------------ | ---------------- |
| **Grok** (默认) | 实时分析、工具调用 | 速度快、稳定性好 |
| **GLM** (备用)  | 深度分析、报告生成 | 中文理解好       |

配置位置: `server/_core/env.ts`

---

## 🏗️ Agent 系统架构

```
SmartAgent (入口)
    │
    ├── Orchestrator (任务编排)
    │       └── TaskRunner (并行执行)
    │               ├── AnalysisAgent (技术分析)
    │               ├── ResearchAgent (研究报告)
    │               └── BacktestAgent (回测分析)
    │
    ├── SessionStore (会话管理)
    │
    ├── MemoryStore (记忆系统)
    │
    └── SkillRegistry (技能系统)
```

核心文件:

- `server/_core/agent/smart-agent.ts` - 主入口
- `server/_core/agent/orchestrator.ts` - 任务编排
- `server/_core/session/session-store.ts` - 会话管理
- `server/_core/memory/memory-store.ts` - 记忆系统
- `server/_core/skills/skill-registry.ts` - 技能系统

---

## 📞 协作规范

### 交接工作时

1. 在 `docs/logs/` 留下工作日志
2. 说明完成了什么、还剩什么
3. 列出相关文件路径

### 接手工作时

1. 先读 `docs/logs/` 最新日志
2. 读 `todo.md` 了解待办
3. 检查相关代码的注释

### 遇到问题时

1. 记录在 `docs/logs/` 中
2. 标注 `⚠️ 问题` 或 `❓ 待确认`
3. 提供复现步骤

---

## 📅 版本记录

| 日期       | 更新内容                        | 作者         |
| ---------- | ------------------------------- | ------------ |
| 2026-01-11 | 创建 AGENTS.md，建立目录规范    | Claude (Amp) |
| 2026-01-11 | Agent 系统重构                  | Claude (Amp) |
| 2026-01-11 | 添加构建/测试命令和代码风格指南 | Claude (Amp) |
