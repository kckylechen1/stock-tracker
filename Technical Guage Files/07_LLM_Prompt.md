# 给LLM的完整实现提示词

## 前置说明

这份文件包含了完整的系统设计、接口规范、核心算法。你的任务是用Python生成**可以直接运行的、生产级质量的代码**。

**重要**：
- 代码需要有完整的错误处理和异常捕获
- 必须包含日志记录（logging）
- 支持并发请求（asyncio/uvicorn）
- 所有第三方API调用都需要重试机制
- 代码应该有类型提示（type hints）

---

## 系统架构回顾

```
用户请求 (HTTP)
    ↓
FastAPI Web Server (端口 6888)
    ↓
Routes 层 (处理HTTP)
    ↓
API 逻辑层
    ├─ [1] AKShare 数据客户端 (获取OHLCV)
    ├─ [2] 指标计算器 (计算10+个指标)
    ├─ [3] A股Gauge评分器 (四维度融合)
    ├─ [4] 缓存层 (可选Redis/内存)
    └─ [5] 回测与优化引擎
    ↓
JSON Response
```

---

## 需要实现的7个模块

### 模块1：配置管理 (`src/config.py`)

**功能**：
- 从 `.env` 文件读取环境变量
- 定义服务器参数、AKShare参数、缓存参数
- 支持开发/测试/生产环境切换

**需要的配置项**：
```python
# API参数
AKSHARE_BASE_URL = "http://akshare.akfamily.xyz"
API_PORT = 6888
API_HOST = "0.0.0.0"
API_LOG_LEVEL = "INFO"

# 请求超时
AKSHARE_TIMEOUT = 30
MAX_RETRIES = 3

# 缓存配置
CACHE_TYPE = "memory"  # "memory" or "redis"
CACHE_TTL = 3600  # 秒
REDIS_URL = "redis://localhost:6379"

# 日线参数（A股最常用）
DAILY_PARAMS = {
    'macd_fast': 12,
    'macd_slow': 26,
    'macd_signal': 9,
    'rsi': 14,
    'kdj_period': 9,
    'kdj_smooth_k': 3,
    'kdj_smooth_d': 3,
    'boll_period': 20,
    'boll_std': 2,
    'cci_period': 14,
    'atr_period': 14,
}

# 周线参数
WEEKLY_PARAMS = {
    'macd_fast': 12,
    'macd_slow': 26,
    'macd_signal': 9,
    'rsi': 21,
    'kdj_period': 14,
    'kdj_smooth_k': 3,
    'kdj_smooth_d': 3,
    'boll_period': 20,
    'boll_std': 2,
    'cci_period': 20,
    'atr_period': 20,
}

# 默认权重
DEFAULT_WEIGHTS = {
    'trend': 0.25,
    'momentum': 0.25,
    'volatility': 0.20,
    'volume': 0.30,
}
```

### 模块2：数据获取层 (`src/data/akshare_client.py`)

**功能**：
- 包装AKShare HTTP API调用
- 获取指定股票的日线/周线OHLCV数据
- 自动重试机制
- 缓存机制

**接口**：
```python
class AKShareClient:
    async def get_stock_daily(
        code: str,
        start_date: str = None,  # YYYY-MM-DD
        end_date: str = None,
    ) -> pd.DataFrame:
        """
        获取日线数据
        返回: DataFrame with columns [date, open, high, low, close, volume]
        """
        pass
    
    async def get_stock_weekly(code: str) -> pd.DataFrame:
        """获取周线数据（从日线数据重采样）"""
        pass
    
    async def get_stock_name(code: str) -> str:
        """获取股票名称"""
        pass
```

**实现要点**：
- 使用 `aiohttp` 做异步HTTP请求
- 实现指数退避重试（Exponential Backoff）
- 数据验证（检查OHLC逻辑性、成交量>0等）
- 返回值应该是有序DataFrame，index为日期

### 模块3：指标计算器 (`src/indicators/calculator.py`)

**功能**：
- 向量化计算所有技术指标（MACD、RSI、KDJ、BOLL、CCI、ATR、OBV、VR、VMACD）
- 支持自定义参数

**接口**：
```python
class IndicatorCalculator:
    def __init__(self, params: dict):
        """params包含所有参数（如DAILY_PARAMS）"""
        pass
    
    def calc_all(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        计算所有指标，返回添加了以下列的DataFrame：
        - DIF, DEA, MACD_HIST (MACD)
        - EMA_SHORT, EMA_LONG (指数平均)
        - RSI, K, D, J (动量)
        - BOLL_UP, BOLL_MID, BOLL_DN, CCI, ATR (波动)
        - OBV, OBV_MA10, VR, V_DIF, V_DEA (量能)
        """
        pass
    
    def validate_data(self, df: pd.DataFrame) -> bool:
        """验证输入数据的有效性"""
        pass
```

**实现要点**：
- 使用 `pandas.ewm()` 做指数加权平均（效率高）
- 使用 `numpy.sign()` 判断涨跌
- 所有计算都应该是向量化的（避免循环）
- 返回的DataFrame应该去掉NaN行（从指标稳定后开始）

### 模块4：市场状态检测 (`src/gauge/market_regime.py`)

**功能**：
- 检测当前市场状态（趋势强度、波动率、市值风格等）
- 根据市场状态返回自适应权重

**接口**：
```python
def detect_market_regime(df: pd.DataFrame) -> dict:
    """
    返回:
    {
        'regime': 'Strong_Trend' | 'Recovery' | 'Oscillation' | 'High_Volatility',
        'style': 'Large_Cap' | 'Mid_Cap' | 'Small_Cap',
        'volume_state': 'Abundant' | 'Normal' | 'Shrunk',
        'trend_strength': float,  # 0~1
        'volatility': float,
    }
    """
    pass

def get_adaptive_weights(market_state: dict) -> dict:
    """
    根据市场状态返回自适应权重，确保各维度权重之和=1
    
    返回:
    {
        'trend': 0.25,
        'momentum': 0.25,
        'volatility': 0.20,
        'volume': 0.30,
    }
    """
    pass
```

**实现要点**：
- 用EMA和ATR判断趋势强度和波动率
- 用日波幅（high-low）判断市值风格
- 用成交量MA比值判断成交量状态
- 权重调整后应该验证总和=1.0

### 模块5：Gauge评分器 (`src/gauge/daily.py` 和 `src/gauge/weekly.py`)

**功能**：
- 计算四维度评分（趋势、动量、波动、量能）
- 计算相关性调整因子（K1、K2、K3）
- 合并为综合分数和信号

**接口**：
```python
class AShareGaugeDaily:
    def __init__(self, params: dict = None, weights: dict = None):
        pass
    
    async def calc_scores(
        self,
        code: str,
        date: str = None,  # YYYYMMDD，默认今天
        market_state: dict = None,  # 自动检测或传入
    ) -> dict:
        """
        返回:
        {
            'code': '600519',
            'name': '贵州茅台',
            'date': '2026-01-08',
            'price': 2345.67,
            'score': 42.5,
            'signal': 'Buy',
            'confidence': 0.85,
            'dimensions': {
                'trend': {'score': 50, 'weight': 0.25, 'indicators': {...}},
                'momentum': {'score': 35, 'weight': 0.25, 'indicators': {...}},
                'volatility': {'score': 30, 'weight': 0.20, 'indicators': {...}},
                'volume': {'score': 55, 'weight': 0.30, 'indicators': {...}},
            },
            'market_state': {'regime': '...', 'style': '...', ...},
            'k_factors': {'K1': 1.2, 'K2': 1.15, 'K3': 1.3},
        }
        """
        pass
```

**实现要点**：
- 按 `04_Gauge_Scoring.md` 的规则计算各维度分数
- 计算K1、K2、K3相关性调整因子
- 最后综合分数 = 0.25*S_trend*K1 + 0.25*S_momentum*K2 + 0.20*S_volatility + 0.30*S_volume*K3
- 分数映射到信号：{>60: Strong Buy, 30-60: Buy, ...}
- 置信度 = (S_trend>30) + (S_momentum>30) + (S_volatility>30) + (S_volume>30) / 4

### 模块6：Pydantic数据模型 (`src/api/schemas.py`)

**功能**：
- 定义所有HTTP请求/响应的数据模型
- 自动验证和序列化

**需要的模型**：
```python
class GaugeResponse(BaseModel):
    code: int  # 0=成功，其他=错误
    message: str
    data: dict  # 或 Optional[dict]
    timestamp: str

class DimensionScore(BaseModel):
    score: float
    weight: float
    indicators: dict

class GaugeData(BaseModel):
    code: str
    name: str
    date: str
    price: float
    score: float
    signal: str  # Strong Buy / Buy / Neutral / Sell / Strong Sell
    confidence: float
    dimensions: dict  # {trend, momentum, volatility, volume}
    market_state: dict

class BacktestRequest(BaseModel):
    code: str
    start_date: str
    end_date: str
    initial_capital: float = 100000
    transaction_fee: float = 0.002
    weights: Optional[dict] = None

class BacktestResponse(BaseModel):
    code: str
    backtest_period: str
    performance: dict
    monthly_returns: list
    drawdown_periods: list
```

### 模块7：HTTP路由 (`src/api/routes.py`)

**功能**：
- 定义所有HTTP端点
- 请求验证
- 错误处理
- 响应格式化

**需要的端点**（见 `01_API_Specification.md`）：
```
GET /api/gauge/daily
GET /api/gauge/weekly
GET /api/gauge/compare
POST /api/backtest
POST /api/optimize
POST /api/gauge/batch
GET /health
GET /docs
```

**实现要点**：
- 所有路由都应该是 `async def`
- 使用dependency injection (FastAPI的 `Depends`)
- 统一的错误响应格式
- 添加请求日志

---

## 实现流程建议

### 第1步：基础设施
1. 创建 `config.py` - 配置管理
2. 创建 `logger.py` - 日志工具
3. 创建 `cache.py` - 缓存工具（可选）

### 第2步：数据层
4. 创建 `data/akshare_client.py` - AKShare客户端
5. 添加错误处理和重试机制

### 第3步：计算层
6. 创建 `indicators/calculator.py` - 指标计算
7. 创建 `gauge/market_regime.py` - 市场状态检测
8. 创建 `gauge/daily.py` - 日线Gauge
9. 创建 `gauge/weekly.py` - 周线Gauge

### 第4步：HTTP层
10. 创建 `api/schemas.py` - Pydantic模型
11. 创建 `api/routes.py` - 所有HTTP路由
12. 创建 `api/exceptions.py` - 异常处理

### 第5步：主应用
13. 创建 `main.py` - FastAPI app定义和启动

---

## 关键实现细节

### 异步处理
- AKShare数据获取应该是异步的（使用 `aiohttp`）
- 所有HTTP路由都应该是 `async`
- 使用 `asyncio.gather()` 并行处理多个请求

### 错误处理
```python
try:
    # 调用AKShare
    data = await akshare_client.get_stock_daily(code)
except AKShareConnectionError:
    # 重试
    pass
except Exception as e:
    # 返回500错误
    return GaugeResponse(code=500001, message=str(e))
```

### 数据验证
```python
# 股票代码格式验证（6位数字）
if not re.match(r'^\d{6}$', code):
    return GaugeResponse(code=400001, message="Invalid stock code")

# 日期格式验证
try:
    datetime.strptime(date, '%Y%m%d')
except ValueError:
    return GaugeResponse(code=400002, message="Invalid date format")
```

### 缓存策略
```python
# 日线数据缓存1小时
cache_key = f"gauge_daily_{code}_{date}"
if cache.exists(cache_key):
    return cache.get(cache_key)

result = await calculate_gauge(code, date)
cache.set(cache_key, result, ttl=3600)
return result
```

---

## 测试用例（给LLM参考）

```python
# 测试1：正常请求
GET /api/gauge/daily?code=600519&date=20260108
# 期望：200, data包含score/signal/confidence

# 测试2：无效股票代码
GET /api/gauge/daily?code=60051  # 缺一位
# 期望：400, code=400001

# 测试3：未来日期
GET /api/gauge/daily?code=600519&date=20300101
# 期望：404, code=404002

# 测试4：批量查询
POST /api/gauge/batch
{"codes": ["600519", "601988", "600000"]}
# 期望：200, data.results 包含3个标的的评分

# 测试5：回测
POST /api/backtest
{"code": "600519", "start_date": "2023-01-01", "end_date": "2025-12-31"}
# 期望：200, data包含性能指标
```

---

## 部署命令

```bash
# 安装依赖
pip install -r requirements.txt

# 启动开发服务器
uvicorn src.main:app --reload --host 0.0.0.0 --port 6888

# 启动生产服务器（使用gunicorn + uvicorn workers）
gunicorn src.main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:6888

# 查看自动生成的文档
http://localhost:6888/docs  # Swagger UI
http://localhost:6888/redoc # ReDoc
```

---

## requirements.txt 内容

```
fastapi==0.95.2
uvicorn==0.24.0
pandas==1.5.3
numpy==1.24.3
aiohttp==3.8.5
akshare==1.18.8
pydantic==2.0.3
python-dotenv==1.0.0
loguru==0.7.2
pytz==2023.3
scipy==1.10.1
scikit-learn==1.2.2  # 若需要参数优化
redis==4.5.5  # 可选，若使用Redis缓存
```

---

## .env.example 内容

```
# API服务器
API_PORT=6888
API_HOST=0.0.0.0
API_LOG_LEVEL=INFO
ENV=development

# AKShare
AKSHARE_BASE_URL=http://akshare.akfamily.xyz
AKSHARE_TIMEOUT=30
MAX_RETRIES=3

# 缓存
CACHE_TYPE=memory
CACHE_TTL=3600
REDIS_URL=redis://localhost:6379

# 日志
LOG_FILE=logs/app.log
LOG_LEVEL=INFO
```

---

## 最后检查清单（LLM生成代码后）

- [ ] 所有模块都有类型提示
- [ ] 所有第三方API调用都有重试机制
- [ ] 所有HTTP端点都有异常处理
- [ ] 所有响应都遵循统一格式 `{code, message, data, timestamp}`
- [ ] 所有参数验证都符合 `01_API_Specification.md`
- [ ] 所有指标计算都符合 `04_Gauge_Scoring.md`
- [ ] 代码有完整的日志记录
- [ ] 支持异步并发请求
- [ ] 有单元测试（至少覆盖关键路径）
- [ ] 文档清晰易懂

---

## 现在，你可以直接把这份提示词送给你的LLM

**提示词模板**：

```
我需要你用Python + FastAPI生成一个A股多维技术指标综合评分HTTP服务。

系统概览：
- 数据源：AKShare
- 核心算法：四维度(趋势/动量/波动/量能)加权融合
- 输出：5档买卖信号 + 置信度评分

详细的架构设计、接口规范、算法逻辑已经在以下文件中：
- 00_Project_Overview.md（系统架构）
- 01_API_Specification.md（所有接口定义）
- 04_Gauge_Scoring.md（Gauge评分算法）

请按照"实现流程建议"的顺序，逐个生成：
1. config.py（配置管理）
2. data/akshare_client.py（数据获取）
3. indicators/calculator.py（指标计算）
4. gauge/market_regime.py（市场状态）
5. gauge/daily.py（日线Gauge）
6. gauge/weekly.py（周线Gauge）
7. api/schemas.py（数据模型）
8. api/routes.py（HTTP路由）
9. main.py（应用入口）

每个文件的需求、接口定义和实现要点已在"需要实现的7个模块"中详细说明。

最后，生成 requirements.txt 和 .env.example。

代码需要达到生产级质量：
- 完整的错误处理
- 所有API调用都有重试机制
- 完整的日志记录
- 类型提示
- 异步支持

开始吧！
```

---

好的，现在你拥有了一套完整的"设计文档 + 实现指南"。你可以直接把这些MD文件给你的LLM，它会生成完整的生产级代码。

这套文档的优势：
1. **逻辑清晰** - 每个模块的职责明确
2. **接口详细** - LLM不会瞎编接口
3. **算法详尽** - 所有公式和规则都写清楚了
4. **可测试** - 有具体的测试用例
5. **可扩展** - 模块化设计，易于后续修改

你想要我再补充：
- **部署文档**（Docker/云端部署）
- **回测框架详细说明**
- **参数优化算法详解**
- **单元测试示例代码**

其中哪个最急需？或者你现在就可以拿着这些文档去给你的LLM下达任务了？

