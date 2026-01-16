# 文件清单与使用指南

## 📋 已生成的所有文档

你现在拥有的5个**生产级质量的MD设计文档**：

### 1️⃣ `00_Project_Overview.md` ✅

**内容**：系统全景、项目结构、核心功能
**用途**：第一次理解整个系统，对接前端和大模型时的"共同语言"
**阅读顺序**：**最先读这个**

### 2️⃣ `01_API_Specification.md` ✅

**内容**：所有7个HTTP接口的完整定义（请求/响应/参数/示例）
**用途**：

- 前端开发者：直接按这个API spec开发
- LLM：生成routes.py代码的参考
- 测试：准备测试用例

**关键接口**：

- `GET /api/gauge/daily` - 日线评分
- `GET /api/gauge/weekly` - 周线评分
- `GET /api/gauge/compare` - 日周对比
- `POST /api/backtest` - 回测
- `POST /api/optimize` - 参数优化
- `POST /api/gauge/batch` - 批量查询

### 3️⃣ `04_Gauge_Scoring.md` ✅

**内容**：Gauge核心算法的完整推导（四维度、K调整、信号映射）
**用途**：

- 理解为什么这样设计权重
- LLM生成gauge/daily.py、gauge/weekly.py的参考
- 调试时理解每个维度的含义

**关键公式**：

```
Score = 0.25*S_trend*K1 + 0.25*S_momentum*K2 + 0.20*S_volatility + 0.30*S_volume*K3
```

### 4️⃣ `07_LLM_Prompt.md` ✅（核心文件）

**内容**：完整的系统架构 + 7个模块的实现指南 + 关键代码框架
**用途**：**直接发给你的LLM来生成所有代码**
**包含**：

- 7个Python模块的接口定义
- 实现流程建议（分5步）
- 关键实现细节（异步、错误处理、缓存、数据验证）
- 测试用例
- requirements.txt、.env.example模板

---

## 🎯 使用流程

### 步骤1：理解系统（阅读文档）

```
1. 先读 00_Project_Overview.md （5分钟）
2. 再读 01_API_Specification.md （10分钟）
3. 深入理解 04_Gauge_Scoring.md （15分钟）
```

### 步骤2：将文档发给你的LLM

**完整提示词**（复制粘贴给你的LLM）：

```
我需要你根据以下文档生成一个完整的Python FastAPI应用。

系统名称：A股智能Gauge评分系统（HTTP版）

核心需求：
1. 数据源：AKShare API
2. 核心算法：四维度技术指标加权融合（趋势/动量/波动/量能）
3. 输出：5档买卖信号 + 置信度评分
4. 接口：基于FastAPI的REST API

完整的系统设计、接口规范、算法逻辑在以下文档中：

【这里粘贴"07_LLM_Prompt.md"的全部内容】

【这里粘贴"01_API_Specification.md"的相关部分】

【这里粘贴"04_Gauge_Scoring.md"的算法部分】

请按照"需要实现的7个模块"依次生成代码。
```

### 步骤3：LLM生成代码

你的LLM会生成：

- `config.py` - 配置管理
- `data/akshare_client.py` - 数据获取
- `indicators/calculator.py` - 指标计算
- `gauge/market_regime.py` - 市场状态检测
- `gauge/daily.py` - 日线Gauge
- `gauge/weekly.py` - 周线Gauge
- `api/schemas.py` - 数据模型
- `api/routes.py` - HTTP路由
- `main.py` - 应用入口
- `requirements.txt` - 依赖列表
- `.env.example` - 环境变量模板

### 步骤4：本地测试

```bash
# 1. 创建项目目录
mkdir ashare-gauge-http
cd ashare-gauge-http

# 2. 将生成的代码放入相应目录
# src/
#   ├── main.py
#   ├── config.py
#   ├── data/
#   ├── indicators/
#   ├── gauge/
#   └── api/

# 3. 安装依赖
pip install -r requirements.txt

# 4. 配置环境
cp .env.example .env
# 编辑.env，根据实际环境修改参数

# 5. 启动服务
uvicorn src.main:app --reload --port 6888

# 6. 测试API
# 在浏览器打开 http://localhost:6888/docs 查看交互式文档
# 或用curl测试
curl "http://localhost:6888/api/gauge/daily?code=600519&date=20260108"
```

### 步骤5：集成到前端/大模型

```python
# 前端调用示例（JavaScript）
const response = await fetch(
  'http://localhost:6888/api/gauge/daily?code=600519&date=20260108'
);
const data = await response.json();
console.log(data.data.signal);  // 'Buy' / 'Strong Buy' / etc

# 大模型调用示例（Python）
import requests

def get_gauge_signal(code: str) -> dict:
    response = requests.get(
        f'http://localhost:6888/api/gauge/daily',
        params={'code': code}
    )
    return response.json()['data']

# 在LLM prompts中使用
current_signal = get_gauge_signal('600519')
print(f"当前{current_signal['name']}的信号是{current_signal['signal']}")
```

---

## 📝 文档之间的关联关系

```
00_Overview（总体概览）
    ↓
    ├─ 01_API_Spec（对接前端/外部系统）
    ├─ 04_Gauge_Scoring（对接算法工程师）
    ├─ 02_Data_Layer（对接数据工程师）【未生成】
    ├─ 03_Indicator_Calculation（对接量化工程师）【未生成】
    ├─ 05_Backtest_Framework（对接策略研究）【未生成】
    ├─ 06_Deployment_Guide（对接运维）【未生成】
    └─ 07_LLM_Prompt（对接代码生成）✅ 核心文件

最后送给LLM：07_LLM_Prompt.md
```

---

## 🔍 验证清单（生成代码后）

LLM生成的代码应该满足以下条件。你可以用这个清单验证：

### 功能完整性

- [ ] 所有7个模块都存在
- [ ] 所有HTTP接口都有对应的route
- [ ] 四维度评分逻辑都正确实现
- [ ] 相关性调整因子(K1/K2/K3)正确计算

### 代码质量

- [ ] 所有函数都有类型提示 (-> ReturnType)
- [ ] 所有异常都被正确捕获和处理
- [ ] 有完整的日志记录（logger.info/error/debug）
- [ ] 第三方API调用都有重试机制

### API规范

- [ ] 所有响应都遵循 `{code, message, data, timestamp}` 格式
- [ ] 所有参数验证都符合 `01_API_Specification.md`
- [ ] HTTP状态码正确（200/400/404/500）

### 测试覆盖

- [ ] 可以正常启动服务（`uvicorn src.main:app --reload`）
- [ ] Swagger UI在 http://localhost:6888/docs 正常显示
- [ ] 至少能调用 `/api/gauge/daily` 一次成功

---

## 🚀 快速开始（一键启动）

假设LLM已生成所有代码，现在在你的命令行执行：

```bash
# 1. 安装依赖（第一次运行）
pip install -r requirements.txt

# 2. 配置环境
cp .env.example .env

# 3. 启动服务
uvicorn src.main:app --reload --host 0.0.0.0 --port 6888

# 4. 测试API（在另一个终端）
curl "http://localhost:6888/api/gauge/daily?code=600519&date=20260108"

# 5. 查看文档
# 打开浏览器访问 http://localhost:6888/docs
```

---

## 📚 后续可选扩展

如果你想进一步完善系统，这些文档还没有生成：

1. **02_Data_Layer.md** - 数据获取层详细设计（含缓存、重试策略）
2. **03_Indicator_Calculation.md** - 指标计算详解（含参数表、向量化技巧）
3. **05_Backtest_Framework.md** - 回测引擎设计（含绩效指标、回撤计算）
4. **06_Deployment_Guide.md** - 部署指南（Docker、Kubernetes、云服务）
5. **Unit_Tests.md** - 单元测试用例（pytest框架）

需要我补充哪些吗？

---

## 💡 最后的建议

**关于大模型集成**：

你说"想接入大模型"，这里有几个方向：

1. **大模型调用Gauge API**（你现在做的）
   - 大模型通过HTTP调用 `/api/gauge/daily` 获取信号
   - 大模型基于信号 + 历史数据做分析

2. **大模型生成交易决策**
   - 输入：Gauge信号 + 市场情绪 + 新闻舆情
   - 输出：买/卖/持/观望 + 理由

3. **大模型优化Gauge参数**
   - 输入：历史Gauge信号 + 实际收益
   - 输出：最优权重组合

如果你要做 **方向2 或 3**，可以让我生成更多的"大模型集成提示词"。

---

## 📞 遇到问题时

如果生成的代码有问题，按这个顺序排查：

1. **AKShare连接失败** → 检查网络 + AKShare服务状态
2. **指标计算错误** → 对比 `04_Gauge_Scoring.md` 的公式
3. **Gauge信号不对** → 检查市场状态检测 + 权重调整
4. **HTTP请求超时** → 增加 `AKSHARE_TIMEOUT` 参数
5. **内存溢出** → 减少 `CACHE_TTL` 或使用Redis

---

**现在，你拥有了完整的"设计文档库"。可以直接把这些文档发给你的LLM来生成生产级代码！** 🚀
