---
description: 查询股票数据 API 文档和实现指南
---

# 股票数据 API 指南

## 可用的数据源

### 1. 东方财富 API (主要数据源)

**文件**: `server/eastmoney.ts`

```typescript
import { eastmoney } from "./eastmoney";

// 获取实时行情
const quote = await eastmoney.getStockQuote("300750");

// 获取 K 线数据
const klines = await eastmoney.getKlineData("300750", "day"); // day/week/month

// 搜索股票
const results = await eastmoney.searchStock("宁德");

// 获取分时数据
const minutes = await eastmoney.getMinuteData("300750");

// 获取资金流向
const fundFlow = await eastmoney.getFundFlow("300750");
```

### 2. AKShare API (专业数据)

**文件**: `server/akshare.ts`

**使用前提**: 需要启动 AKTools 服务

```bash
npm run start:all  # 会自动启动 AKTools
```

```typescript
import { callAKShare } from "./akshare";

// 龙虎榜数据
const data = await callAKShare("stock_lhb_detail_em", {
  start_date: "20260101",
  end_date: "20260115",
});

// 北向资金
const northFlow = await callAKShare("stock_hsgt_north_net_flow_in_em");

// 融资融券
const margin = await callAKShare("stock_margin_detail_szse", {
  date: "20260115",
});
```

### 3. Tushare API (备用)

**文件**: `server/tushare.ts`

**注意**: 需要 Tushare Pro 积分，免费账户有限制

## 常用接口

### 实时行情

```typescript
// 通过 tRPC 调用
const quote = trpc.stocks.getDetail.useQuery({ code: "300750" });

// 返回数据结构
{
  code: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  amount: number;
  open: number;
  high: number;
  low: number;
  preClose: number;
  turnoverRate: number;
  pe: number;
  pb: number;
}
```

### K 线数据

```typescript
// 通过 tRPC 调用
const klines = trpc.stocks.getKline.useQuery({
  code: "300750",
  period: "day", // day | week | month
});

// 返回数据结构
{
  time: string; // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
[];
```

### 市场情绪

```typescript
// 通过 tRPC 调用
const sentiment = trpc.market.sentiment.useQuery();

// 返回数据结构
{
  fearGreedIndex: number; // 恐惧贪婪指数 0-100
  marketTemperature: number; // 市场温度
  upDownRatio: number; // 涨跌比
  northFlow: number; // 北向资金净流入
}
```

## AKShare 常用端点

| 接口名称                          | 说明            | 参数                 |
| --------------------------------- | --------------- | -------------------- |
| `stock_zh_a_spot_em`              | 沪深A股实时行情 | 无                   |
| `stock_lhb_detail_em`             | 龙虎榜详情      | start_date, end_date |
| `stock_hsgt_north_net_flow_in_em` | 北向资金流入    | 无                   |
| `stock_individual_fund_flow`      | 个股资金流向    | stock, market        |
| `stock_board_industry_name_em`    | 行业板块列表    | 无                   |
| `stock_board_concept_name_em`     | 概念板块列表    | 无                   |
| `stock_zt_pool_em`                | 涨停股票池      | date                 |
| `stock_margin_detail_szse`        | 融资融券明细    | date                 |

## 数据缓存策略

| 数据类型 | TTL  | 说明             |
| -------- | ---- | ---------------- |
| 实时行情 | 5s   | 交易时间内短缓存 |
| K线数据  | 1h   | 相对稳定         |
| 市场情绪 | 5min | 中等缓存         |
| 龙虎榜   | 24h  | 每日更新         |
