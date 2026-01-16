# Stock Tracker 📈

A股交易笔记工作台 - 个人交易研究助手

## 功能特性

### ✅ 已实现

#### 股票追踪

- 🔍 股票搜索和自选股管理
- 📊 实时行情数据（价格、涨跌幅、成交量）
- 📈 专业 K 线图（TradingView Lightweight Charts）
- 🔄 分时/日K/周K/月K 切换
- 💰 资金指标展示（资金流入、主力净流入、资金排名）

#### AI 分析

- 🤖 AI 聊天助手（流式响应）
- 💭 深度思考模式（显示思考时间）
- 📝 按股票分离的聊天历史

#### 界面设计

- 🎨 腾讯自选股风格深色主题
- 📱 三栏布局（自选股 + K线图区 + AI助手）
- 🏷️ 股票标签页（多股票快速切换）
- 📊 市场情绪面板（恐惧贪婪指数、涨跌比）
- 📉 筹码分布面板（占位）

### 🚧 开发中

- [ ] 筹码分布功能
- [ ] 资金指标对接真实 API
- [ ] 市场情绪指标对接
- [ ] 新闻资讯功能
- [ ] 北向资金数据

## 技术栈

- **前端**: React + TypeScript + Vite
- **UI**: Tailwind CSS + shadcn/ui
- **图表**: TradingView Lightweight Charts
- **API**: tRPC
- **数据源**: 东方财富 API

## 快速开始

```bash
# 安装 Node.js 依赖
pnpm install

# 安装 Python 依赖（AKTools - 财经数据服务）
python3 -m venv ~/.aktools-venv
source ~/.aktools-venv/bin/activate
pip install aktools

# 启动 AKTools 服务（端口 8081）
source ~/.aktools-venv/bin/activate && python -m aktools --host 0.0.0.0 --port 8081

# 启动开发服务器（新终端）
pnpm dev

# 访问
http://localhost:6888
```

## 测试

```bash
# 标准测试（需要网络 + MySQL 可用）
pnpm -s test

# 离线测试（跳过外部 API + DB 相关用例）
TEST_OFFLINE=true pnpm -s test

# Dev 脚本类型检查（非阻塞）
pnpm -s check:dev
```

### 环境变量

```bash
# .env (可选)
AKTOOLS_URL=http://127.0.0.1:8098  # AKTools 服务地址
```

## 项目结构

```
stock-tracker/
├── client/                 # 前端代码
│   ├── src/
│   │   ├── components/     # React 组件
│   │   │   ├── ai/         # AI 聊天相关
│   │   │   └── stock/      # 股票相关
│   │   └── pages/          # 页面
│   └── index.html
├── server/                 # 后端代码
│   ├── routers.ts          # tRPC 路由
│   └── _core/              # 核心服务
└── todo.md                 # 开发进度
```

## 界面预览

```
┌─────────────┬────────────────┬──────────┬──────────┬─────────────┐
│             │                │          │ 市场情绪 │             │
│             │   K线图 (60%)  │筹码分布  │- 恐惧贪婪│             │
│   自选股    │   + 资金指标   │ (20%)    │- 市场温度│   AI 助手   │
│   列表      │                │          │- 涨跌比  │   620px     │
│   320px     ├────────────────┴──────────┴──────────┤   100%高度  │
│             │     新闻/趋势/情绪分析 (35%)         │             │
└─────────────┴─────────────────────────────────────┴─────────────┘
```

## 更新日志

### 2026-01-06

- ✨ 完成主页面三栏布局重构
- ✨ 添加市场情绪面板（恐惧贪婪指数、市场温度、涨跌比）
- ✨ 添加资金指标行（今日资金、主力净流入、资金排名）
- ✨ AI 思考模式显示思考时间
- ✨ 股票标签页功能
- 🎨 AI 助手面板宽度调整为 620px

### 2026-01-05

- 🎨 切换为腾讯自选股风格深色主题
- ✨ 集成 AI 流式聊天功能
- ✨ 实现聊天历史持久化

---

_最后更新：2026-01-06_
