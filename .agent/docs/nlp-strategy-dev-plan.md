# NLP 选股策略模块 - 开发计划

**创建日期**: 2026-01-08  
**基于文档**: nlp-strategy-design.md, product-summary.md, frontend-spec.md  
**目标**: 将 NLP 选股策略功能集成到现有 Stock Tracker 系统

---

## 一、现有系统能力评估

### ✅ 已完成功能（可复用）

| 模块 | 现有能力 | 可复用于 NLP 策略 |
|------|---------|------------------|
| **AI 聊天** | 流式对话、思考模式、历史记录 | ✅ 自然语言策略输入入口 |
| **行情数据** | K线、分时、实时行情（东方财富API） | ✅ 因子计算数据源 |
| **资金指标** | 主力净流入、北向资金、换手率 | ✅ 资金因子 |
| **市场情绪** | 涨跌家数、恐惧贪婪指数 | ✅ 情绪因子 |
| **股票列表** | 自选股管理、搜索 | ✅ 候选股展示 |
| **UI 框架** | 三栏布局、深色主题、响应式 | ✅ 直接复用 |

### ⚠️ 需要扩展的功能

| 模块 | 当前状态 | 需要扩展 |
|------|---------|---------|
| **AI 分析** | 单股分析 | → 批量扫描 + 策略解析 |
| **对话系统** | 通用问答 | → 策略意图识别 + 多轮构建 |
| **数据层** | 单股查询 | → 全市场扫描 |
| **记忆系统** | 聊天历史 | → 策略偏好 + 因子使用统计 |

### ❌ 需要新建的功能

| 模块 | 说明 |
|------|------|
| **Skill 管理** | CRUD、配置存储、生命周期管理 |
| **因子引擎** | 将策略 JSON 映射为数据库查询 |
| **回测模块** | 历史数据验证、胜率计算 |
| **板块数据** | 板块分类、行业关系 |
| **新闻/公告** | 事件驱动因子数据源 |

---

## 二、技术架构整合方案

### 2.1 系统架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        前端 (React + TypeScript)                 │
├─────────────────────────────────────────────────────────────────┤
│  AI聊天面板        │  K线/分时图       │  选股结果列表           │
│  (策略输入入口)    │  (现有功能)       │  (扫描结果展示)         │
│                   │                   │                        │
│  Skill 管理面板    │  回测结果展示      │  市场情绪面板           │
│  (新建)           │  (新建)           │  (现有功能)             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        tRPC API 层                               │
├─────────────────────────────────────────────────────────────────┤
│  stocks.*          │  ai.*             │  strategy.* (新建)     │
│  market.*          │  chat.*           │  skill.* (新建)        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        业务逻辑层                                 │
├─────────────────────────────────────────────────────────────────┤
│  策略解析服务       │  因子引擎         │  回测引擎              │
│  (LLM + Prompt)    │  (数据查询)       │  (历史验证)            │
│                   │                   │                        │
│  Skill 管理服务     │  记忆服务         │  定时任务服务           │
│  (CRUD)           │  (偏好沉淀)       │  (自动扫描)            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        数据层                                    │
├─────────────────────────────────────────────────────────────────┤
│  行情数据(东方财富)  │  SQLite/Postgres  │  Redis(缓存)          │
│  板块数据(待接入)   │  Skill配置        │  因子计算结果          │
│  新闻数据(待接入)   │  回测结果         │  扫描缓存              │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 LLM 策略解析 Prompt 设计

```typescript
// 策略意图识别 Prompt
const STRATEGY_INTENT_PROMPT = `
你是一个A股选股策略解析助手。用户会用自然语言描述选股逻辑，你需要：

1. 识别意图类型：
   - CREATE_STRATEGY: 创建新的选股策略
   - RUN_SKILL: 运行已有的Skill
   - MODIFY_STRATEGY: 修改现有策略参数
   - EXPLAIN_RESULT: 解释选股结果
   - GENERAL_QA: 一般性问答

2. 如果是 CREATE_STRATEGY，提取以下因子：
   {
     "universe": "A_SHARE" | "沪市" | "深市",
     "sectors": ["板块名称"],
     "price_conditions": {...},
     "volume_conditions": {...},
     "fund_conditions": {...},
     "event_conditions": {...},
     "time_window": "1-3天" | "1周" | "中长线",
     "sort_by": "资金强度" | "涨幅" | "换手率"
   }

输入：{user_input}
输出 JSON：
`;

// 结果解释生成 Prompt
const EXPLAIN_RESULT_PROMPT = `
根据以下选股结果，用简洁的话解释为什么这些股票被选出：

策略配置：{strategy_json}
候选股票：{stocks}

要求：
1. 每只股票1-2句话说明
2. 突出符合策略的关键点
3. 用普通投资者能理解的语言
`;
```

---

## 三、开发阶段划分

### Phase 1: 基础框架（2周）

**目标**: 打通自然语言 → 策略 JSON → 简单扫描 → 结果展示的完整链路

#### Week 1: 策略解析 + 简单扫描

| 任务 | 优先级 | 预估时间 |
|------|-------|---------|
| 策略意图识别 Prompt 开发 | P0 | 2天 |
| 策略 JSON 结构定义 | P0 | 1天 |
| 简化版因子引擎（支持价量因子） | P0 | 3天 |
| tRPC strategy.parseAndScan 接口 | P0 | 1天 |

**交付物**:
- 用户说"帮我找换手率3-10%、量比>1的股票" → 返回候选列表

#### Week 2: 前端集成 + 结果展示

| 任务 | 优先级 | 预估时间 |
|------|-------|---------|
| AI聊天面板支持策略模式 | P0 | 2天 |
| 选股结果列表组件 | P0 | 2天 |
| 点击结果 → 查看K线联动 | P1 | 1天 |

**交付物**:
- 在现有 AI 聊天框输入策略 → 返回结果列表 → 可查看详情

---

### Phase 2: Skill 系统（2周）

**目标**: 支持策略保存、复用、管理

#### Week 3: Skill CRUD + 存储

| 任务 | 优先级 | 预估时间 |
|------|-------|---------|
| Skill 数据模型设计 | P0 | 1天 |
| skill.create / skill.list / skill.delete 接口 | P0 | 2天 |
| Skill 管理面板 UI | P0 | 2天 |

#### Week 4: Skill 执行 + 定时任务

| 任务 | 优先级 | 预估时间 |
|------|-------|---------|
| skill.run 接口（手动执行） | P0 | 1天 |
| 定时任务框架（node-cron） | P1 | 2天 |
| Skill 执行历史记录 | P1 | 1天 |

**交付物**:
- 用户可保存、管理、一键运行策略
- 可选：定时自动执行

---

### Phase 3: 因子扩展（2周）

**目标**: 支持更多因子维度

#### Week 5: 资金因子 + 板块数据

| 任务 | 优先级 | 预估时间 |
|------|-------|---------|
| 板块分类数据接入 | P0 | 2天 |
| 资金因子集成（主力、北向） | P0 | 2天 |
| 板块筛选逻辑 | P0 | 1天 |

#### Week 6: 事件因子（可选）

| 任务 | 优先级 | 预估时间 |
|------|-------|---------|
| 新闻/公告数据源调研 | P2 | 1天 |
| 新闻热度因子 | P2 | 2天 |
| 事件驱动选股 | P2 | 2天 |

**交付物**:
- 支持"找半导体板块里资金净流入的股票"
- 可选：支持"最近有利好新闻的"

---

### Phase 4: 回测 + 记忆（3周）

**目标**: 验证策略有效性 + 沉淀用户偏好

#### Week 7-8: 回测引擎

| 任务 | 优先级 | 预估时间 |
|------|-------|---------|
| 历史K线数据存储策略 | P1 | 2天 |
| 回测逻辑实现 | P1 | 4天 |
| 回测结果展示 UI | P1 | 2天 |

#### Week 9: 记忆系统

| 任务 | 优先级 | 预估时间 |
|------|-------|---------|
| 用户策略使用记录 | P1 | 2天 |
| 因子使用频率统计 | P2 | 2天 |
| "推荐 Skill 化"逻辑 | P2 | 1天 |

**交付物**:
- 回测某策略最近3个月的胜率
- 系统提示"这个逻辑你用了5次，是否保存为Skill？"

---

### Phase 5: 向量存储与语义搜索（2周）

**目标**: 实现对话/分析内容的语义检索，让历史洞察能被智能复用

**优先级**: P2（后期迭代，MVP 后再考虑）

#### Week 10: 数据层抽象 + 向量化准备

| 任务 | 优先级 | 预估时间 |
|------|-------|---------|
| 抽象 Repository 接口（降低迁移成本） | P1 | 1天 |
| 评估向量方案（MySQL + Embedding / ChromaDB / pgvector） | P2 | 1天 |
| 选择 Embedding 模型（OpenAI / 通义 / 本地 BGE） | P2 | 1天 |
| 数据表预留 embedding 字段 | P2 | 0.5天 |

#### Week 11: 语义搜索实现

| 任务 | 优先级 | 预估时间 |
|------|-------|---------|
| 对话内容向量化（存储时生成 Embedding） | P2 | 2天 |
| AI 分析结论向量化 | P2 | 1天 |
| 语义搜索接口（相似度检索） | P2 | 2天 |
| 选股时关联历史分析 | P2 | 1天 |

**交付物**:
- "查找和当前选股条件相似的历史分析"
- AI 生成分析时自动关联相关历史对话
- 用户可搜索"我之前怎么分析过半导体板块"

**技术选型建议**:

| 数据规模 | 推荐方案 | 说明 |
|---------|---------|------|
| < 100MB（当前） | MySQL + 应用层相似度 | 简单实现，够用 |
| 100MB - 1GB | MySQL + Embedding 字段 | 预留向量字段，批量计算 |
| > 1GB | ChromaDB / pgvector | 专业向量数据库 |

**迁移策略**:
1. 现阶段用 MySQL 全文搜索（FTS5 / LIKE）
2. 代码层抽象 `ISearchRepository` 接口
3. 后期换向量方案只需新增实现类，业务代码不改

---

## 四、数据模型设计

### 4.1 Skill 表

```sql
CREATE TABLE skills (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  strategy_config JSON NOT NULL,  -- 策略配置 JSON
  tags TEXT,                      -- 标签，逗号分隔
  created_by TEXT DEFAULT 'default',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'active',   -- active/paused/retired
  run_count INTEGER DEFAULT 0,
  last_run_at DATETIME
);
```

### 4.2 Skill 执行记录表

```sql
CREATE TABLE skill_runs (
  id TEXT PRIMARY KEY,
  skill_id TEXT NOT NULL,
  run_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  result_count INTEGER,
  result_stocks JSON,             -- 候选股票列表
  execution_time_ms INTEGER
);
```

### 4.3 策略使用记录表（用于记忆系统）

```sql
CREATE TABLE strategy_usage (
  id TEXT PRIMARY KEY,
  user_prompt TEXT,               -- 用户原始输入
  parsed_config JSON,             -- 解析后的配置
  factors_used TEXT,              -- 使用的因子，逗号分隔
  result_count INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 4.4 回测结果表

```sql
CREATE TABLE backtest_results (
  id TEXT PRIMARY KEY,
  skill_id TEXT,
  strategy_config JSON,
  period_start DATE,
  period_end DATE,
  total_trades INTEGER,
  win_count INTEGER,
  win_rate REAL,
  total_return REAL,
  max_drawdown REAL,
  sharpe_ratio REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 4.5 聊天消息表（支持向量搜索）

```sql
CREATE TABLE chat_messages (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(64) DEFAULT 'default',
  session_id VARCHAR(64),
  role ENUM('user', 'assistant') NOT NULL,
  content TEXT NOT NULL,
  stock_code VARCHAR(10),           -- 关联的股票代码
  -- 向量存储预留字段（Phase 5）
  embedding BLOB,                   -- 预留：存储向量
  embedding_model VARCHAR(50),      -- 预留：记录使用的模型
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_session (user_id, session_id),
  INDEX idx_stock (stock_code),
  FULLTEXT INDEX ft_content (content)  -- 全文搜索
);
```

### 4.6 AI 分析结果表（支持向量搜索）

```sql
CREATE TABLE ai_analyses (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  stock_code VARCHAR(10) NOT NULL,
  analysis_type ENUM('technical', 'sentiment', 'capital', 'strategy') NOT NULL,
  content TEXT NOT NULL,
  summary VARCHAR(500),
  -- 向量存储预留字段（Phase 5）
  embedding BLOB,
  embedding_model VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_stock_type (stock_code, analysis_type),
  FULLTEXT INDEX ft_content (content)
);
```

---

## 五、API 接口设计

### 5.1 策略相关

```typescript
// tRPC 路由定义
strategy: {
  // 解析自然语言并执行扫描
  parseAndScan: procedure
    .input(z.object({ userPrompt: z.string() }))
    .mutation(async ({ input }) => { ... }),
  
  // 仅解析，不执行
  parse: procedure
    .input(z.object({ userPrompt: z.string() }))
    .query(async ({ input }) => { ... }),
  
  // 执行已有配置
  scan: procedure
    .input(z.object({ config: StrategyConfigSchema }))
    .query(async ({ input }) => { ... }),
}
```

### 5.2 Skill 相关

```typescript
skill: {
  // 创建 Skill
  create: procedure
    .input(SkillCreateSchema)
    .mutation(async ({ input }) => { ... }),
  
  // 列出所有 Skill
  list: procedure
    .query(async () => { ... }),
  
  // 运行 Skill
  run: procedure
    .input(z.object({ skillId: z.string() }))
    .mutation(async ({ input }) => { ... }),
  
  // 删除 Skill
  delete: procedure
    .input(z.object({ skillId: z.string() }))
    .mutation(async ({ input }) => { ... }),
}
```

### 5.3 回测相关

```typescript
backtest: {
  // 执行回测
  run: procedure
    .input(z.object({
      skillId: z.string().optional(),
      config: StrategyConfigSchema.optional(),
      periodMonths: z.number().default(3),
    }))
    .mutation(async ({ input }) => { ... }),
  
  // 获取回测结果
  getResult: procedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => { ... }),
}
```

---

## 六、MVP 范围界定

### ✅ MVP 必须包含（Phase 1-2，4周）

1. **自然语言策略输入**
   - 在 AI 聊天框输入策略描述
   - LLM 解析为结构化配置

2. **基础因子扫描**
   - 价量因子：涨跌幅、换手率、量比
   - 资金因子：主力净流入

3. **结果展示**
   - 候选股列表（带因子值）
   - 点击查看 K 线

4. **Skill 保存和运行**
   - 保存策略为 Skill
   - 一键运行 Skill

### ⏳ MVP 后迭代

- 板块筛选
- 事件驱动因子
- 回测模块
- 记忆系统
- 容量评估
- Skill 分享

---

## 七、风险和依赖

### 技术风险

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| LLM 解析不稳定 | 策略配置错误 | 增加结构化验证 + 用户确认环节 |
| 全市场扫描性能 | 响应慢 | 增量计算 + 缓存热门因子 |
| 板块数据缺失 | 板块筛选不可用 | 优先级降低，MVP 不依赖 |

### 数据依赖

| 数据 | 来源 | 状态 |
|------|------|------|
| K线/分时 | 东方财富 | ✅ 已接入 |
| 资金流向 | 东方财富 | ✅ 已接入 |
| 板块分类 | 待定 | ⚠️ 需要调研 |
| 新闻公告 | 待定 | ⏳ Phase 3 |

---

## 八、下一步行动

### 立即开始（本周）

1. [ ] 设计策略 JSON Schema
2. [ ] 编写策略解析 Prompt
3. [ ] 创建 strategy router 基础框架
4. [ ] 调研板块数据 API

### 本周产出

- 策略解析 Prompt 初版
- strategy.parseAndScan 接口 Demo
- "帮我找换手率高的股票" → 返回结果

---

**文档创建**: 2026-01-08 09:12  
**作者**: AI Assistant  
**状态**: 待评审
