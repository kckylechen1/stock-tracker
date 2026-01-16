# AKShare 全面集成 - TODO 清单

## 📋 任务概述

将现有东方财富 API 全部替换为 AKShare，并创建知识库供 Grok 动态调用任意接口。

## 🎯 任务目标

1. **方案 A**：预定义高频工具（15个常用 API）
2. **方案 B**：创建 AKShare 知识库供 Grok 动态调用

## ✅ TODO 清单

### Phase 1: 环境准备 ✅ 完成

- [x] 1.1 检查 AKTools HTTP 服务状态
- [x] 1.2 确认 AKShare 版本和可用接口 (AKShare 1.18.8, AKTools 0.0.91)
- [x] 1.3 创建端口规范文档 `.agent/docs/port-specification.md`
- [x] 1.4 创建启动脚本 `scripts/start-aktools.sh`

### Phase 2: 方案 A - 高频工具封装

- [x] 2.1 扩展 `server/akshare.ts` - 添加核心 API ✅ 完成
  - [x] 2.1.1 实时行情: `stock_zh_a_spot_em`
  - [x] 2.1.2 历史K线: `stock_zh_a_hist`
  - [x] 2.1.3 分时数据: `stock_zh_a_hist_min_em`
  - [x] 2.1.4 个股资金流: `stock_individual_fund_flow`
  - [x] 2.1.5 资金流排行: `stock_individual_fund_flow_rank`
  - [x] 2.1.6 大盘资金流: `stock_market_fund_flow`
  - [x] 2.1.7 龙虎榜: `stock_lhb_detail_em`
  - [x] 2.1.8 涨停池: `stock_zt_pool_em`
  - [x] 2.1.9 概念板块: `stock_board_concept_name_em`
  - [x] 2.1.10 行业板块: `stock_board_industry_name_em`
  - [x] 2.1.11 股票热度: `stock_hot_rank_em`
  - [x] 2.1.12 个股新闻: `stock_news_em`
  - [x] 2.1.13 财经快讯: `stock_info_global_em`
  - [x] 2.1.14 北向资金: `stock_hsgt_north_net_flow_in_em`
  - [x] 2.1.15 融资融券: `stock_margin_sse`

- [ ] 2.2 更新 `stockTools.ts` - 替换工具定义 🔄 进行中
  - [ ] 2.2.1 替换 `get_stock_quote` → AKShare
  - [ ] 2.2.2 替换 `get_kline_data` → AKShare
  - [ ] 2.2.3 替换 `get_fund_flow` → AKShare
  - [ ] 2.2.4 替换 `get_fund_flow_history` → AKShare
  - [ ] 2.2.5 替换 `get_fund_flow_rank` → AKShare
  - [ ] 2.2.6 替换 `get_market_fund_flow` → AKShare
  - [ ] 2.2.7 新增 `get_zt_pool` (涨停池)
  - [ ] 2.2.8 新增 `get_concept_board` (概念板块)
  - [ ] 2.2.9 新增 `get_industry_board` (行业板块)
  - [ ] 2.2.10 新增 `get_north_flow` (北向资金)

- [ ] 2.3 测试验证
  - [ ] 2.3.1 测试每个新工具的返回数据
  - [ ] 2.3.2 与 Grok 集成测试

### Phase 3: 方案 B - AKShare 知识库

- [ ] 3.1 生成精简版 AKShare 数据字典 (Markdown)
- [ ] 3.2 添加动态调用工具 `call_akshare_api`
- [ ] 3.3 更新 Grok System Prompt 引入知识库
- [ ] 3.4 测试 Grok 动态调用能力

### Phase 4: 文档更新

- [ ] 4.1 更新 `/stock-api` workflow
- [ ] 4.2 写 AKShare 集成开发指南
- [ ] 4.3 更新 README.md

## 📦 交付物

1. `server/akshare.ts` - 扩展的 AKShare API 模块
2. `server/_core/stockTools.ts` - 更新的工具定义
3. `.agent/docs/akshare-api-guide.md` - AKShare API 知识库
4. `.agent/docs/component-guides/akshare-integration.md` - 开发指南

## ⏰ 预估时间

- Phase 1: 10 分钟
- Phase 2: 40 分钟
- Phase 3: 30 分钟
- Phase 4: 15 分钟
- **总计: ~1.5 小时**

---

_创建时间: 2026-01-10 14:38_
