# 研究报告

## 描述
生成全面的股票研究报告，包含基本面、技术面、资金面和市场热度分析。

## 触发词
- 研究
- 研究报告
- 调研
- 深度分析
- 写个报告
- 帮我研究一下

## 指令
生成研究报告时，按照以下结构：

### 1. 公司概况
- 主营业务
- 市值规模（调用 get_stock_quote）
- 行业地位

### 2. 核心财务指标
| 指标 | 数值 | 行业均值 |
|-----|------|---------|
| PE | xx | xx |
| PB | xx | xx |
| ROE | xx | xx |

### 3. 技术面分析
- 调用 analyze_stock_technical
- 趋势判断
- 支撑/压力位

### 4. 资金面分析
- 调用 get_fund_flow + get_fund_flow_history
- 主力资金动向
- 近期资金趋势

### 5. 市场热度
- 调用 get_longhu_bang 查看龙虎榜
- 调用 get_market_news 获取相关新闻

### 6. 投资建议
- 投资评级：买入/增持/中性/减持
- 核心逻辑
- 风险提示

## 工具
- get_stock_quote
- get_kline_data
- analyze_stock_technical
- get_fund_flow
- get_fund_flow_history
- get_longhu_bang
- get_market_news

## 示例
- 用户: "帮我研究一下比亚迪"
- 用户: "写个茅台的研究报告"
- 用户: "这只股票值得投资吗？给我做个深度分析"

## 工作流
1. 获取股票基本信息和实时行情
2. 执行技术面分析
3. 获取资金流向数据
4. 查看龙虎榜和市场新闻
5. 综合分析生成报告
6. 给出投资建议和风险提示
