# API规范文档

## 概述

所有接口遵循RESTful原则，返回统一JSON格式。

```
HTTP Response Format:
{
  "code": 0,                          // 0=成功, 非0=错误码
  "message": "success",               // 状态消息
  "data": { ... },                    // 返回数据
  "timestamp": "2026-01-08T20:00:00"  // 时间戳
}
```

---

## 1. 日线Gauge评分接口

### GET /api/gauge/daily

**功能**：计算指定A股标的的日线综合评分

**参数**：
| 参数 | 类型 | 必需 | 说明 | 示例 |
|------|------|------|------|------|
| code | string | ✓ | 股票代码（6位数字） | 600519 |
| date | string | ✗ | 查询日期(YYYYMMDD)，默认为今天 | 20260108 |

**示例请求**：
```bash
GET /api/gauge/daily?code=600519&date=20260108
```

**成功响应(200)**：
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "code": "600519",
    "name": "贵州茅台",
    "date": "2026-01-08",
    "price": 2345.67,
    "score": 42.5,
    "signal": "Buy",
    "confidence": 0.85,
    "dimensions": {
      "trend": {
        "score": 50,
        "weight": 0.25,
        "indicators": {
          "macd": 15.3,
          "ema_short": 2340,
          "ema_long": 2335
        }
      },
      "momentum": {
        "score": 35,
        "weight": 0.25,
        "indicators": {
          "rsi": 45.2,
          "k": 52.1,
          "d": 48.5,
          "j": 58.9
        }
      },
      "volatility": {
        "score": 30,
        "weight": 0.20,
        "indicators": {
          "cci": -25.3,
          "boll_upper": 2380,
          "boll_mid": 2350,
          "boll_lower": 2320
        }
      },
      "volume": {
        "score": 55,
        "weight": 0.30,
        "indicators": {
          "obv": 12000000,
          "vr": 1.15,
          "v_dif": 50000
        }
      }
    },
    "market_state": {
      "regime": "Strong_Trend",
      "style": "Large_Cap",
      "volume_state": "Abundant"
    }
  },
  "timestamp": "2026-01-08T20:00:00"
}
```

**错误响应(400/404/500)**：
```json
{
  "code": 400,
  "message": "Invalid stock code format",
  "data": null,
  "timestamp": "2026-01-08T20:00:00"
}
```

---

## 2. 周线Gauge评分接口

### GET /api/gauge/weekly

**功能**：计算指定A股标的的周线综合评分（参数与日线相同）

**参数**：
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| code | string | ✓ | 股票代码（6位数字） |
| date | string | ✗ | 查询日期，默认为本周最后一个交易日 |

**示例请求**：
```bash
GET /api/gauge/weekly?code=600519
```

**响应格式**：与日线接口相同，但参数为周线长周期(EMA20/60、RSI21等)

---

## 3. 日周线对比接口

### GET /api/gauge/compare

**功能**：同时获取日线与周线评分，便于做出更稳健的决策

**参数**：
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| code | string | ✓ | 股票代码 |
| date | string | ✗ | 查询日期 |

**示例请求**：
```bash
GET /api/gauge/compare?code=600519&date=20260108
```

**成功响应(200)**：
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "code": "600519",
    "name": "贵州茅台",
    "date": "2026-01-08",
    "daily": {
      "score": 42.5,
      "signal": "Buy",
      "confidence": 0.85,
      "dimensions": { ... }
    },
    "weekly": {
      "score": 55.0,
      "signal": "Strong Buy",
      "confidence": 0.92,
      "dimensions": { ... }
    },
    "combined_signal": {
      "recommendation": "Strong Buy with Confirmation",
      "day_week_align": true,
      "risk_level": "Low"
    }
  },
  "timestamp": "2026-01-08T20:00:00"
}
```

**combined_signal说明**：
| 日线 | 周线 | recommendation | risk_level |
|------|------|---|---|
| Strong Buy | Strong Buy | Strong Buy with Confirmation | Low |
| Buy | Buy | Buy with Confirmation | Low |
| Buy | Strong Buy | Buy with Strength | Low |
| Buy | Neutral | Buy but Cautious | Medium |
| Neutral | Any | Hold or Observe | Medium |
| Sell | Sell | Sell with Confirmation | High |
| Strong Sell | Strong Sell | Strong Sell with Confirmation | High |

---

## 4. 回测接口

### POST /api/backtest

**功能**：对指定标的进行历史回测，验证Gauge策略的有效性

**请求体**：
```json
{
  "code": "600519",
  "start_date": "2023-01-01",
  "end_date": "2025-12-31",
  "initial_capital": 100000,
  "transaction_fee": 0.002,
  "weights": {
    "trend": 0.25,
    "momentum": 0.25,
    "volatility": 0.20,
    "volume": 0.30
  }
}
```

**参数说明**：
| 参数 | 类型 | 必需 | 说明 | 默认 |
|------|------|------|------|------|
| code | string | ✓ | 股票代码 | - |
| start_date | string | ✓ | 回测起始日期(YYYY-MM-DD) | - |
| end_date | string | ✓ | 回测结束日期 | - |
| initial_capital | number | ✗ | 初始资金（元） | 100000 |
| transaction_fee | number | ✗ | 手续费率 | 0.002 |
| weights | object | ✗ | 自定义权重 | 使用默认权重 |

**成功响应(200)**：
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "code": "600519",
    "backtest_period": "2023-01-01 ~ 2025-12-31",
    "initial_capital": 100000,
    "final_equity": 245000,
    "performance": {
      "total_return": 1.45,
      "annual_return": 0.127,
      "max_drawdown": -0.082,
      "win_rate": 0.62,
      "profit_factor": 1.85,
      "sharpe_ratio": 1.23,
      "sortino_ratio": 1.56,
      "total_trades": 48,
      "avg_hold_days": 15.2
    },
    "monthly_returns": [
      {"month": "2023-01", "return": 0.032},
      {"month": "2023-02", "return": -0.015},
      ...
    ],
    "drawdown_periods": [
      {"start": "2023-06-15", "end": "2023-07-10", "drawdown": -0.082}
    ]
  },
  "timestamp": "2026-01-08T20:00:00"
}
```

**性能指标说明**：
- **total_return**: 总收益率 (e.g., 1.45 = 145%)
- **annual_return**: 年化收益率
- **max_drawdown**: 最大回撤比例（负数）
- **win_rate**: 盈利交易占比 (0~1)
- **profit_factor**: 盈利总额/亏损总额
- **sharpe_ratio**: 夏普比率（>1.0较好）
- **sortino_ratio**: 索提诺比率（只考虑下行风险）
- **total_trades**: 总交易次数
- **avg_hold_days**: 平均持仓天数

---

## 5. 参数优化接口

### POST /api/optimize

**功能**：自动搜索最优权重组合，最大化某个目标函数

**请求体**：
```json
{
  "code": "600519",
  "start_date": "2023-01-01",
  "end_date": "2025-12-31",
  "optimize_target": "sharpe_ratio",
  "optimization_method": "grid_search",
  "max_iterations": 100,
  "constraints": {
    "trend": [0.15, 0.40],
    "momentum": [0.15, 0.40],
    "volatility": [0.10, 0.30],
    "volume": [0.20, 0.50]
  }
}
```

**参数说明**：
| 参数 | 类型 | 必需 | 说明 | 可选值 |
|------|------|------|------|------|
| code | string | ✓ | 股票代码 | - |
| start_date | string | ✓ | 优化数据起始日期 | - |
| end_date | string | ✓ | 优化数据结束日期 | - |
| optimize_target | string | ✗ | 优化目标 | sharpe_ratio, total_return, max_drawdown, profit_factor |
| optimization_method | string | ✗ | 优化方法 | grid_search, bayesian, random_search |
| max_iterations | number | ✗ | 最大迭代次数 | - |
| constraints | object | ✗ | 权重约束范围 | - |

**成功响应(200)**：
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "code": "600519",
    "optimize_target": "sharpe_ratio",
    "optimization_method": "grid_search",
    "iterations": 64,
    "optimal_weights": {
      "trend": 0.30,
      "momentum": 0.20,
      "volatility": 0.15,
      "volume": 0.35
    },
    "optimal_performance": {
      "total_return": 1.58,
      "annual_return": 0.158,
      "max_drawdown": -0.065,
      "win_rate": 0.68,
      "profit_factor": 2.12,
      "sharpe_ratio": 1.42,
      "sortino_ratio": 1.78
    },
    "weight_evolution": [
      {
        "iteration": 1,
        "weights": {...},
        "sharpe_ratio": 1.23
      },
      ...
    ]
  },
  "timestamp": "2026-01-08T20:00:00"
}
```

---

## 6. 批量查询接口

### POST /api/gauge/batch

**功能**：批量查询多个标的的日线Gauge评分（减少HTTP往返）

**请求体**：
```json
{
  "codes": ["600519", "601988", "600000"],
  "date": "20260108"
}
```

**成功响应(200)**：
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "date": "2026-01-08",
    "results": [
      {
        "code": "600519",
        "name": "贵州茅台",
        "score": 42.5,
        "signal": "Buy",
        "confidence": 0.85
      },
      {
        "code": "601988",
        "name": "中国银行",
        "score": -35.2,
        "signal": "Sell",
        "confidence": 0.78
      },
      ...
    ]
  },
  "timestamp": "2026-01-08T20:00:00"
}
```

---

## 7. 健康检查接口

### GET /health

**功能**：检查服务是否正常运行

**响应(200)**：
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "akshare_connected": true,
  "cache_status": "operational",
  "timestamp": "2026-01-08T20:00:00"
}
```

---

## HTTP状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 400 | 参数错误（如无效股票代码、日期格式错误） |
| 404 | 资源不存在（如股票代码不存在或指定日期无数据） |
| 429 | 请求过于频繁（限流） |
| 500 | 服务器错误（AKShare连接失败、计算异常） |

---

## 错误代码映射

| 错误码 | 说明 | HTTP状态 |
|--------|------|---------|
| 0 | 成功 | 200 |
| 400001 | 无效股票代码 | 400 |
| 400002 | 无效日期格式 | 400 |
| 400003 | 权重配置错误 | 400 |
| 404001 | 股票数据不存在 | 404 |
| 404002 | 指定日期无数据 | 404 |
| 429001 | API请求限流 | 429 |
| 500001 | AKShare连接失败 | 500 |
| 500002 | 指标计算异常 | 500 |
| 500003 | 回测引擎异常 | 500 |

---

## 使用示例

### 前端调用（JavaScript/Fetch）

```javascript
// 获取日线评分
fetch('/api/gauge/daily?code=600519&date=20260108')
  .then(r => r.json())
  .then(data => {
    if (data.code === 0) {
      console.log('Signal:', data.data.signal);
      console.log('Score:', data.data.score);
    } else {
      console.error('Error:', data.message);
    }
  });

// 回测
fetch('/api/backtest', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    code: '600519',
    start_date: '2023-01-01',
    end_date: '2025-12-31'
  })
})
.then(r => r.json())
.then(data => {
  console.log('Total Return:', data.data.performance.total_return);
});
```

### LLM提示词集成

```
用户要求：查询贵州茅台的日线和周线Gauge信号，并根据对比结果给出建议。

1. 调用 GET /api/gauge/compare?code=600519&date=20260108
2. 解析返回的daily/weekly/combined_signal
3. 基于风险等级和信号一致性，生成投资建议
4. 将关键数据可视化（Score仪表盘、维度分解图、收益预期）
```

---

## 性能与限制

| 指标 | 限制 |
|-----|------|
| 单次请求超时 | 30秒 |
| 批量查询最多代码数 | 100个 |
| 日线/周线缓存时效 | 1小时 |
| 回测数据范围 | 2年以内（更长数据可联系管理员） |
| QPS（每秒请求数） | 100（超过触发限流） |

---

## API文档自动生成

服务启动后，访问以下URL查看完整交互文档：

- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`
- **OpenAPI JSON**: `http://localhost:8000/openapi.json`

