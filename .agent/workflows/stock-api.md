---
description: 查询股票数据 API 文档和实现指南
---

# 股票数据 API 查询指南

当遇到股票数据 API 相关问题时，按以下顺序查阅：

## 1. 东方财富 API（当前主要使用）

**实现文件：**
- `server/eastmoney.ts` - 基础行情 API
- `server/fundflow.ts` - 资金流向 API ⭐新增

**常用接口：**
- `getStockQuote()` - 实时行情
- `getTimelineData()` - 分时数据
- `getKlineData()` - K线数据
- `searchStock()` - 股票搜索

**资金流向接口：**
- `getStockFundFlow()` - 个股今日资金流向
- `getStockFundFlowHistory()` - 个股资金流向历史
- `getMarketFundFlow()` - 大盘资金流向
- `getFundFlowRank()` - 资金流排行

## 2. 同花顺 iFinD API（备用）

**参考文档：**
- `.agent/docs/iFinD_API_Reference.md` - 完整 API 参考

**实现文件：**
- `server/ifind.ts` - API 封装模块

**认证信息：**
- refresh_token 和 access_token 已配置
- 免费账户部分指标不可用

## 3. AKShare（参考）

**文档：** https://akshare.akfamily.xyz/
**用途：** Python 量化数据库，本项目使用其底层数据源（东方财富）

## 切换 API 注意事项

1. 修改 `server/routers.ts` 中的路由调用
2. 确保数据格式转换正确
3. 处理好错误情况和降级逻辑

## 3. AI 助手工具调用（Function Calling）

**实现文件：**
- `server/_core/stockTools.ts` - 工具定义和执行器
- `server/_core/streamChat.ts` - 流式聊天（支持工具调用）

**可用工具：**
| 工具名称 | 功能描述 |
|---------|---------|
| `search_stock` | 根据关键词搜索股票 |
| `get_stock_quote` | 获取股票实时行情 |
| `get_kline_data` | 获取K线数据 |
| `get_fund_flow` | 获取今日资金流向 |
| `get_fund_flow_history` | 获取历史资金流向 |
| `get_fund_flow_rank` | 获取资金流入排行榜 |
| `get_market_fund_flow` | 获取大盘资金流向 |

**工作原理：**
1. 用户提问 → LLM 识别需要查询数据
2. LLM 调用工具 → 执行 API 获取真实数据
3. 数据返回给 LLM → LLM 基于真实数据生成回答
4. 支持多轮工具调用（最多5轮）

**模型说明：**
- 普通模式使用 `DeepSeek-V3`（支持工具调用）
- 思考模式使用 `DeepSeek-R1`（不支持工具调用，但推理更强）
