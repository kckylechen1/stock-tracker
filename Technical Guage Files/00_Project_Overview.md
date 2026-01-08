# A股智能Gauge评分系统 - HTTP服务版

## 项目概览

**目标**：构建一个基于AKShare数据源的A股多维技术指标综合评分HTTP服务，通过REST API为前端与大模型提供实时的Buy/Sell信号。

**系统架构**：
```
前端/大模型
    ↓ HTTP GET/POST
    ↓
[FastAPI HTTP Server]
    ↓
[AKShare 数据层] → [技术指标计算层] → [A股Gauge评分层] → [回测/优化层]
    ↓
JSON Response
```

## 核心功能模块

### 1. 数据层（Data Layer）
- **数据源**：AKShare（akshare.akfamily.xyz）
- **获取内容**：A股日线/周线 OHLCV 数据
- **缓存机制**：Redis（可选）或内存缓存

### 2. 指标计算层（Indicator Layer）
- **技术指标**：MACD, EMA, RSI, KDJ, BOLL, CCI, ATR, OBV, VR, VMACD
- **计算方式**：pandas向量化 + numpy高效计算
- **参数化**：所有参数可配置（日线参数 vs 周线参数）

### 3. Gauge评分层（Scoring Layer）
- **四维度体系**：趋势(25%) + 动量(25%) + 波动(20%) + 量能(30%)
- **自适应权重**：根据市场状态自动调整权重
- **相关性调整**：多指标同向时提升权重(K1/K2/K3)
- **输出**：综合分数(-100~+100) + 5档信号 + 置信度(0~1)

### 4. HTTP接口层（API Layer）
- **框架**：FastAPI
- **接口**：
  - `/api/gauge/daily` - 日线Gauge评分
  - `/api/gauge/weekly` - 周线Gauge评分
  - `/api/gauge/compare` - 日周线对比信号
  - `/api/backtest` - 回测单个标的
  - `/api/optimize` - 参数优化（可选）

### 5. 回测与优化层（Backtest Layer）
- **回测**：基于历史数据验证Gauge的有效性
- **绩效指标**：收益率、最大回撤、胜率、盈亏比、夏普比率
- **参数优化**：网格搜索/贝叶斯优化权重组合

## 技术栈

| 层级 | 技术 | 版本 |
|-----|------|-----|
| Web框架 | FastAPI | ≥0.95 |
| 异步 | Uvicorn | ≥0.24 |
| 数据处理 | pandas | ≥1.5 |
| 数值计算 | numpy | ≥1.24 |
| 技术指标 | pandas_ta / TA-Lib | 可选 |
| 行情数据 | AKShare | ≥1.18 |
| 缓存 | Redis (可选) | ≥6.0 |
| 日志 | logging/loguru | 内置/可选 |

## 项目结构

```
ashare-gauge-http/
├── 00_Project_Overview.md              ← 你在这里
├── 01_API_Specification.md             ← 接口规范
├── 02_Data_Layer.md                    ← 数据获取逻辑
├── 03_Indicator_Calculation.md         ← 指标计算详细说明
├── 04_Gauge_Scoring.md                 ← Gauge评分逻辑
├── 05_Backtest_Framework.md            ← 回测框架设计
├── 06_Deployment_Guide.md              ← 部署指南
├── 07_LLM_Prompt.md                    ← 给LLM的完整提示词
│
├── src/
│   ├── main.py                         ← 应用入口（FastAPI）
│   ├── config.py                       ← 配置管理
│   ├── data/
│   │   ├── __init__.py
│   │   └── akshare_client.py          ← AKShare客户端
│   ├── indicators/
│   │   ├── __init__.py
│   │   └── calculator.py               ← 指标计算器
│   ├── gauge/
│   │   ├── __init__.py
│   │   ├── daily.py                    ← 日线Gauge
│   │   └── weekly.py                   ← 周线Gauge
│   ├── backtest/
│   │   ├── __init__.py
│   │   └── backtester.py               ← 回测引擎
│   ├── optimize/
│   │   ├── __init__.py
│   │   └── optimizer.py                ← 参数优化器
│   ├── api/
│   │   ├── __init__.py
│   │   ├── routes.py                   ← HTTP路由
│   │   ├── schemas.py                  ← Pydantic模型
│   │   └── exceptions.py               ← 异常处理
│   └── utils/
│       ├── __init__.py
│       ├── logger.py                   ← 日志工具
│       └── cache.py                    ← 缓存工具（可选）
│
├── tests/
│   ├── test_indicators.py              ← 指标计算单元测试
│   ├── test_gauge.py                   ← Gauge评分单元测试
│   └── test_backtest.py                ← 回测单元测试
│
├── requirements.txt                    ← Python依赖
├── .env.example                        ← 环境变量模板
└── docker-compose.yml                  ← Docker部署配置（可选）
```

## 快速开始（概览）

1. **安装依赖** → `pip install -r requirements.txt`
2. **配置环境** → 复制 `.env.example` → `.env`
3. **启动服务** → `uvicorn src.main:app --host 0.0.0.0 --port 8000`
4. **调用API** → `curl http://localhost:8000/api/gauge/daily?code=600519&date=20260108`
5. **查看文档** → 访问 `http://localhost:8000/docs`（Swagger自动生成）

## 核心设计原则

### 1. 数据驱动
- 所有评分基于定量计算，非主观判断
- 参数可配置，支持A股不同板块(主板/创业板/科创板)适配

### 2. 自适应市场
- 市场状态检测：强趋势/高波动/震荡市/恢复期
- 根据市值风格（大/中/小）自动调整权重
- 根据成交量状态(充足/萎靡)调整量能权重

### 3. 多维共识
- 不依赖单一指标，采用四维度加权融合
- 维度间相关性调整(K1/K2/K3)降低虚假信号
- 置信度评分(0~1)反映多维共鸣程度

### 4. 可解释性
- 返回各维度的原始分数与权重
- 返回信号强度、置信度、关键指标值
- 支持前端展示"Gauge指针"和"维度分解图"

### 5. 可扩展
- 模块化设计，易于添加新指标
- HTTP API标准化，易于集成大模型
- 回测框架通用，支持策略优化

## 核心算法（高层逻辑）

```
输入：股票代码 + 日期 + 时间周期(日/周)
  ↓
[1] 数据获取
   从AKShare拉取OHLCV数据
  ↓
[2] 指标计算
   MACD, EMA, RSI, KDJ, BOLL, CCI, ATR, OBV, VR, VMACD
  ↓
[3] 市场状态检测
   检测：regime(趋势强度) + style(市值风格) + volume_state(成交量)
  ↓
[4] 自适应权重
   base_weights = {趋势:25%, 动量:25%, 波动:20%, 量能:30%}
   adjusted_weights = apply_adjustments(base_weights, market_state)
  ↓
[5] 四维度评分
   S_trend = 0.6*MACD_signal + 0.4*EMA_signal       ∈ [-100, +100]
   S_momentum = 0.5*RSI_signal + 0.5*KDJ_signal     ∈ [-100, +100]
   S_volatility = 0.5*BOLL_signal + 0.5*CCI_signal ∈ [-100, +100]
   S_volume = 0.4*OBV_sig + 0.35*VR_sig + 0.25*VMACD_sig ∈ [-100, +100]
  ↓
[6] 相关性调整
   K1 = 1.2 if MACD与EMA同向 else 0.6
   K2 = 1.15 if RSI与KDJ同向 else 0.7
   K3 = 1.3 if OBV与VR同向 else 0.5
  ↓
[7] 综合评分
   Score = 0.25*S_trend*K1 + 0.25*S_momentum*K2 + 0.20*S_volatility + 0.30*S_volume*K3
   Score = clip(Score, -100, +100)
  ↓
[8] 信号映射
   Score > 60  → Strong Buy
   30 < Score ≤ 60 → Buy
   -30 ≤ Score ≤ 30 → Neutral
   -60 ≤ Score < -30 → Sell
   Score < -60 → Strong Sell
  ↓
[9] 置信度计算
   consensus_count = (S_trend>30) + (S_momentum>30) + (S_volatility>30) + (S_volume>30)
   confidence = consensus_count / 4   ∈ [0, 1]
  ↓
输出：JSON {score, signal, confidence, dimensions{trend, momentum, volatility, volume}, ...}
```

## 接下来要做的事

1. **阅读** `01_API_Specification.md` - 理解所有HTTP接口
2. **阅读** `02_Data_Layer.md` - 了解数据获取
3. **阅读** `03_Indicator_Calculation.md` - 了解指标计算
4. **阅读** `04_Gauge_Scoring.md` - 了解Gauge评分逻辑
5. **阅读** `05_Backtest_Framework.md` - 了解回测设计
6. **给你的LLM输入** `07_LLM_Prompt.md` - 生成完整代码

## 常见问题

**Q: 为什么选FastAPI而不是Flask?**  
A: FastAPI自动生成OpenAPI/Swagger文档、异步支持、类型检查、性能更好。特别适合"与大模型/前端交互"的场景。

**Q: 能否不用AKShare而用其他数据源?**  
A: 可以。整个系统的数据层独立，只需修改 `data/akshare_client.py`，替换成你的API调用即可。

**Q: Gauge的参数如何调优?**  
A: 有两种方式：
  - 手工调优（在前端改参数，实时看回测结果）
  - 自动优化（用 `/api/optimize` 端点做网格搜索或贝叶斯优化）

**Q: 能否支持T+0频繁交易?**  
A: 这套系统是日线/周线中长线逻辑（每天生成一个信号）。若要分钟级/秒级，需要单独设计超短线策略。

---

**下一步**：打开 `01_API_Specification.md` 了解具体接口设计。
