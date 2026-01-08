# 同花顺 iFinD HTTP API 参考文档

> 本文档从 iFinD HTTP API 用户手册.pdf 提取整理，供开发时快速查阅

---

## 一、认证说明

### API 基础 URL
```
https://quantapi.51ifind.com
```

### 认证方式
所有请求需要在 Header 中携带 `access_token`：
```
Content-Type: application/json
access_token: <your_access_token>
```

### Token 获取
```
URL: https://quantapi.51ifind.com/api/v1/get_access_token
Method: POST
Body: {"refresh_token": "<refresh_token>"}
```

---

## 二、核心 API 接口

### 1. 实时行情 (Real Time Quotation)

```
URL: https://quantapi.51ifind.com/api/v1/real_time_quotation
Method: POST
```

**参数：**
| 参数 | 必须 | 说明 | 示例 |
|-----|------|------|------|
| codes | 是 | 股票代码，逗号分隔 | "300033.SZ,600030.SH" |
| indicators | 是 | 指标，逗号分隔 | "open,high,low,close" |

**示例：**
```json
{
  "codes": "300033.SZ,600030.SH",
  "indicators": "open,high,low,close,preClose,vol,amount"
}
```

---

### 2. 历史行情 (History)

```
URL: https://quantapi.51ifind.com/api/v1/history
Method: POST
```

**参数：**
| 参数 | 必须 | 说明 | 示例 |
|-----|------|------|------|
| codes | 是 | 股票代码 | "300033.SZ" |
| indicators | 是 | 指标 | "open,high,low,close,vol" |
| startdate | 是 | 开始日期 | "2024-01-01" |
| enddate | 是 | 结束日期 | "2024-12-31" |

**示例：**
```json
{
  "codes": "300033.SZ",
  "indicators": "open,high,low,close,vol,amount",
  "startdate": "2024-01-01",
  "enddate": "2024-12-31"
}
```

---

### 3. 日内高频数据 (High Frequency)

```
URL: https://quantapi.51ifind.com/api/v1/high_frequency
Method: POST
```

**参数：**
| 参数 | 必须 | 说明 | 示例 |
|-----|------|------|------|
| codes | 是 | 股票代码 | "300033.SZ,600030.SH" |
| indicators | 是 | 指标 | "open,high,low,close" |
| starttime | 是 | 开始时间 | "2025-08-25 09:30:00" |
| endtime | 是 | 结束时间 | "2025-08-25 15:00:00" |

**示例：**
```json
{
  "codes": "300033.SZ,600030.SH",
  "indicators": "open,high,low,close,vol",
  "starttime": "2025-08-25 09:30:00",
  "endtime": "2025-08-25 15:00:00"
}
```

---

### 4. 分时成交 (Tick)

```
URL: https://quantapi.51ifind.com/api/v1/tick
Method: POST
```

**参数：**
| 参数 | 必须 | 说明 | 示例 |
|-----|------|------|------|
| codes | 是 | 股票代码 | "300033.SZ" |
| indicators | 是 | 指标 | "time,price,vol,amount" |
| starttime | 是 | 开始时间 | "2025-08-25 09:30:00" |
| endtime | 是 | 结束时间 | "2025-08-25 15:00:00" |

---

### 5. 经济数据库 (EDB)

```
URL: https://quantapi.51ifind.com/api/v1/edb_service
Method: POST
```

**参数：**
| 参数 | 必须 | 说明 | 示例 |
|-----|------|------|------|
| indicators | 是 | 宏观指标代码 | "M001620326,M002822183" |
| startdate | 是 | 开始日期 | "2018-01-01" |
| enddate | 是 | 结束日期 | "2018-12-31" |
| functionpara | 否 | 更新时间筛选 | {"startrtime": "...", "endrtime": "..."} |

---

### 6. 专题报表 (Data Pool)

```
URL: https://quantapi.51ifind.com/api/v1/data_pool
Method: POST
```

**参数：**
| 参数 | 必须 | 说明 | 示例 |
|-----|------|------|------|
| reportname | 是 | 报表编码 | "p03341" |
| functionpara | 是 | 报表参数 | {"sdate": "20210421", ...} |
| outputpara | 是 | 输出字段控制 | "p03341_f001:Y,p03341_f002:Y" |

---

### 7. 组合管理 (Portfolio Manage)

```
URL: https://quantapi.51ifind.com/api/v1/portfolio_manage
Method: POST
```

**功能：**
- `newportf` - 新建组合
- `importf` - 模板导入
- `fileimport` - 文件导入
- `cashacs` - 现金存取

---

## 三、常用指标列表

### 基础行情指标
| 指标 | 说明 |
|-----|------|
| open | 开盘价 |
| high | 最高价 |
| low | 最低价 |
| close | 收盘价 |
| preClose | 昨收价 |
| vol | 成交量 |
| amount | 成交额 |
| change | 涨跌额 |
| pctChange | 涨跌幅 |
| turnoverRate | 换手率 |
| pe | 市盈率 |
| pb | 市净率 |
| marketValue | 总市值 |
| floatMarketValue | 流通市值 |

### 资金流向指标
| 指标 | 说明 |
|-----|------|
| mainNetInflow | 主力净流入 |
| mainNetInflowRate | 主力净流入率 |
| superLargeNetInflow | 超大单净流入 |
| largeNetInflow | 大单净流入 |
| mediumNetInflow | 中单净流入 |
| smallNetInflow | 小单净流入 |

### 技术指标
| 指标 | 说明 |
|-----|------|
| ma5, ma10, ma20, ma60 | 移动平均线 |
| macd, dif, dea | MACD |
| rsi6, rsi12, rsi24 | RSI |
| kdj_k, kdj_d, kdj_j | KDJ |

---

## 四、股票代码格式

| 市场 | 后缀 | 示例 |
|-----|------|------|
| 上海 | .SH | 600000.SH |
| 深圳 | .SZ | 000001.SZ |
| 创业板 | .SZ | 300033.SZ |
| 科创板 | .SH | 688001.SH |
| 北交所 | .BJ | 430047.BJ |

---

## 五、返回格式

所有 API 返回 JSON 格式：

```json
{
  "errorcode": 0,
  "errmsg": "",
  "tables": [...],
  "datatype": {...},
  "inputParams": {...},
  "perf": 123,
  "dataVol": 100
}
```

| 字段 | 说明 |
|-----|------|
| errorcode | 错误码，0=成功 |
| errmsg | 错误信息 |
| tables | 数据内容 |
| perf | 处理时间(ms) |
| dataVol | 数据量 |

---

## 六、错误码速查

| 错误码 | 说明 |
|-------|------|
| 0 | 成功 |
| -1003 | access_token 为空 |
| -1005 | 用户验证错误 |
| -1302 | access_token 过期 |
| -4001 | 数据为空 |
| -4206 | 错误的股票代码 |
| -4400 | 每分钟最多600次请求 |
| -4301 | 基础数据每周超过500万条 |
| -4302 | 报价数据每周超过1.5亿条 |

---

## 七、使用限制

- **免费账号**：单次最多提取 10 万条数据
- **请求频率**：每分钟最多 600 次请求
- **数据量限制**：
  - 基础数据：每周 500 万条
  - 报价数据：每周 1.5 亿条
  - EDB 数据：每周 500 万条

---

## 八、项目中的实现

本项目的同花顺 API 封装文件：`server/ifind.ts`

```typescript
import * as ifind from './ifind';

// 获取实时行情
const quote = await ifind.getRealTimeQuotation(
  '300033.SZ', 
  'open,high,low,close,vol'
);

// 获取历史数据
const history = await ifind.getHistoryData(
  '300033.SZ',
  'open,high,low,close,vol',
  '2024-01-01',
  '2024-12-31'
);
```

---

**文档版本**: 1.0  
**最后更新**: 2026-01-08  
**来源**: iFinD HTTP API 用户手册.pdf
