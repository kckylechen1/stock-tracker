# AKShare 集成开发指南

## 概述

Stock Tracker 使用 AKShare 作为核心数据源，通过 AKTools HTTP API 服务 (端口 8098) 进行调用。

**状态**: ✅ 已完成 (2026-01-10)

## 文件结构

```
server/
├── akshare.ts          # AKShare API 封装模块 (主)
├── eastmoney.ts        # 东方财富直接调用 (备用)
├── fundflow.ts         # 资金流向模块 (备用)
└── _core/
    └── stockTools.ts   # Grok 工具定义
```

## 服务端口

| 服务 | 端口 | 说明 |
|------|------|------|
| AKTools HTTP API | **8098** | AKShare 数据接口 |
| 主服务器 | 6888 | Stock Tracker Web |
| MySQL | 3306 | 数据库 |

## 启动 AKTools

```bash
# 方式一：使用脚本
./scripts/start-aktools.sh

# 方式二：手动启动
cd "/Users/kckylechen/Desktop/Stock Tracker"
./pdfenv/bin/python -m aktools -P 8098
```

## API 接口列表

### 实时行情
| 函数 | AKShare 接口 | 说明 |
|------|-------------|------|
| `getStockSpotAll()` | `stock_zh_a_spot_em` | 沪深A股全量行情 |
| `getStockQuote(symbol)` | - | 单只股票行情 |

### K线数据
| 函数 | AKShare 接口 | 说明 |
|------|-------------|------|
| `getStockHistory(symbol, period)` | `stock_zh_a_hist` | 日/周/月K线 |
| `getStockMinuteHistory(symbol, period)` | `stock_zh_a_hist_min_em` | 分钟K线 |

### 资金流向
| 函数 | AKShare 接口 | 说明 |
|------|-------------|------|
| `getStockFundFlow(symbol, market)` | `stock_individual_fund_flow` | 个股资金流 |
| `getFundFlowRank(indicator)` | `stock_individual_fund_flow_rank` | 资金流排行 |
| `getMarketFundFlow()` | `stock_market_fund_flow` | 大盘资金流 |

### 涨停板行情
| 函数 | AKShare 接口 | 说明 |
|------|-------------|------|
| `getZTPool(date)` | `stock_zt_pool_em` | 涨停股池 |
| `getDTPool(date)` | `stock_zt_pool_dtgc_em` | 跌停股池 |
| `getZTPoolPrevious(date)` | `stock_zt_pool_previous_em` | 昨涨停今表现 |
| `getStrongPool(date)` | `stock_zt_pool_strong_em` | 强势股池 |

### 板块行情
| 函数 | AKShare 接口 | 说明 |
|------|-------------|------|
| `getConceptBoardList()` | `stock_board_concept_name_em` | 概念板块列表 |
| `getIndustryBoardList()` | `stock_board_industry_name_em` | 行业板块列表 |
| `getConceptBoardConstituents(symbol)` | `stock_board_concept_cons_em` | 概念成份股 |
| `getIndustryBoardConstituents(symbol)` | `stock_board_industry_cons_em` | 行业成份股 |

### 股票热度
| 函数 | AKShare 接口 | 说明 |
|------|-------------|------|
| `getHotRankEM()` | `stock_hot_rank_em` | 热度排名 |
| `getHotRankLatestEM()` | `stock_hot_rank_latest_em` | 最新人气榜 |
| `getHotRankDetailEM(symbol)` | `stock_hot_rank_detail_em` | 个股热度趋势 |

### 北向资金
| 函数 | AKShare 接口 | 说明 |
|------|-------------|------|
| `getNorthFlowIn(indicator)` | `stock_hsgt_north_net_flow_in_em` | 北向净流入 |
| `getNorthHoldStock(market)` | `stock_hsgt_hold_stock_em` | 北向持股排行 |

### 财经资讯
| 函数 | AKShare 接口 | 说明 |
|------|-------------|------|
| `getMarketNews()` | `stock_info_global_em` | 全球财经资讯 |
| `getLongHuBangDetail()` | `stock_lhb_detail_em` | 龙虎榜详情 |
| `getStockNewsEM(symbol)` | `stock_news_em` | 个股新闻 |
| `getTelegraphCLS()` | `stock_telegraph_cls` | 财联社电报 |

### 动态调用
| 函数 | 说明 |
|------|------|
| `callAKShareDynamic(functionName, params)` | Grok 动态调用任意接口 |

## 使用示例

```typescript
import * as akshare from '../akshare';

// 获取单只股票行情
const quote = await akshare.getStockQuote('300308');

// 获取资金流向
const fundFlow = await akshare.getStockFundFlow('300308', 'sz');

// 获取涨停股池
const ztPool = await akshare.getZTPool();

// 动态调用（供 Grok 使用）
const data = await akshare.callAKShareDynamic('stock_zt_pool_em', { date: '20260110' });
```

## 错误处理

所有函数在调用失败时：
- 返回 `null`（单对象）或 `[]`（数组）
- 不抛出异常，便于调用方处理

## 常见问题

### Q: AKTools 连接失败
**A:** 检查服务是否启动：
```bash
curl http://127.0.0.1:8098/version
```

### Q: 实时行情太慢
**A:** `getStockSpotAll()` 获取全量5000+股票，考虑缓存或用其他接口

### Q: 资金流向无数据
**A:** 检查 `market` 参数，深市用 `'sz'`，沪市用 `'sh'`

## 更新日志

- **2026-01-10**: 初始版本
  - 扩展 15+ AKShare API
  - 添加动态调用接口
  - 端口统一为 8098

---
*维护者: Antigravity AI*
