# AKShare 数据查询

## 描述
使用 AKShare 获取专业金融数据，包括龙虎榜、融资融券、北向资金、财务报表、行业板块、研报等 Eastmoney API 无法提供的数据。当用户需要获取专业或深度数据时使用此技能。

## 触发词
- 龙虎榜
- 融资融券
- 北向资金
- 沪深港通
- 高管持股
- 股东变动
- 财务报表
- 研报
- 行业板块
- 概念板块
- IPO
- 新股
- 宏观数据
- GDP
- CPI
- 利率
- 期货
- 基金持仓

## 指令

### 数据源优先级
1. **Eastmoney API** - 实时行情、K线、资金流向（主要数据源，无需 AKTools）
2. **AKShare/AKTools** - 龙虎榜、融资融券、财务数据等专业数据
3. **iFind** - 未来专业数据源（付费）

### 使用 AKShare 的场景
仅当 Eastmoney API 无法满足需求时使用 AKShare：

| 数据类型 | 推荐 API | AKShare 函数 |
|---------|---------|--------------|
| 实时行情 | Eastmoney ✅ | - |
| K线数据 | Eastmoney ✅ | - |
| 资金流向 | Eastmoney ✅ | - |
| 龙虎榜 | AKShare | `stock_lhb_detail_em` |
| 融资融券 | AKShare | `stock_margin_sse` |
| 北向资金 | AKShare | `stock_hsgt_hold_stock_em` |
| 高管持股 | AKShare | `stock_hold_management_detail_em` |
| 财务报表 | AKShare | `stock_financial_report_sina` |
| 行业板块 | AKShare | `stock_board_industry_name_em` |
| 概念板块 | AKShare | `stock_board_concept_name_em` |
| 研报 | AKShare | `stock_research_report_em` |

### 调用步骤
1. 判断用户需要的数据类型
2. 检查 AKTools 服务状态（调用 `check_aktools_status`）
3. 如果服务可用，使用 `call_akshare` 工具调用对应接口
4. 如果服务不可用，提示用户运行 `pnpm start:aktools`

### 常用 AKShare 接口

#### 龙虎榜数据
```
接口: stock_lhb_detail_em
描述: 龙虎榜详情数据
参数: 无
返回: 近期龙虎榜上榜股票、买卖金额、营业部信息
```

#### 融资融券余额
```
接口: stock_margin_sse
描述: 融资融券每日余额
参数: start_date, end_date (YYYYMMDD格式)
返回: 融资余额、融券余额、融资买入额
```

#### 北向资金持股
```
接口: stock_hsgt_hold_stock_em
描述: 沪深港通持股排行
参数: market (沪股通/深股通), indicator (今日/5日/10日)
返回: 持股数量、持股市值、占流通股比例
```

#### 行业板块列表
```
接口: stock_board_industry_name_em
描述: 行业板块名称和代码
参数: 无
返回: 板块代码、板块名称、涨跌幅、成交额
```

#### 概念板块列表
```
接口: stock_board_concept_name_em
描述: 概念板块名称和代码
参数: 无
返回: 板块代码、板块名称、涨跌幅、领涨股
```

#### 板块成分股
```
接口: stock_board_industry_cons_em
描述: 行业板块成分股
参数: symbol (板块代码)
返回: 成分股代码、名称、涨跌幅
```

#### 研报数据
```
接口: stock_research_report_em
描述: 个股研报列表
参数: symbol (股票代码)
返回: 研报标题、机构、评级、日期
```

#### 高管持股变动
```
接口: stock_hold_management_detail_em
描述: 董监高持股变动明细
参数: 无
返回: 变动人员、变动数量、变动价格、变动原因
```

#### 宏观数据 - 中国 GDP
```
接口: macro_china_gdp
描述: 中国 GDP 季度数据
参数: 无
返回: 季度、GDP、同比增长
```

#### 宏观数据 - 中国 CPI
```
接口: macro_china_cpi_monthly
描述: 中国 CPI 月度数据
参数: 无
返回: 月份、CPI、同比增长
```

## 工具
- check_aktools_status
- call_akshare
- get_akshare_endpoint_info

## 示例
- 用户: "查看贵州茅台的龙虎榜数据"
- 用户: "最近融资融券余额变化"
- 用户: "北向资金今天买了哪些股票"
- 用户: "帮我看看半导体板块有哪些股票"
- 用户: "这只股票最近有什么研报"
- 用户: "中国最新GDP数据是多少"

## 工作流
1. 识别用户需要的数据类型
2. 判断应该使用 Eastmoney 还是 AKShare
3. 如果需要 AKShare，检查服务状态
4. 调用对应的 AKShare 接口获取数据
5. 格式化数据并返回给用户

## 注意事项
- AKShare 需要运行 AKTools 服务（`pnpm start:aktools`）
- 如果 AKTools 不可用，优先使用 Eastmoney 替代方案
- 部分接口有频率限制，请勿频繁调用
- 数据仅供参考，不构成投资建议
