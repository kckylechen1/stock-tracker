# Stock Tracker NLP 策略 - 数据模型设计文档

**创建日期**: 2026-01-08  
**版本**: 2.0（融合版）  
**目标**: 定义所有表结构、关系、索引和数据流

---

## 1. 数据模型架构全景

```
┌─────────────────────────────────────────────────────────────┐
│                      用户交互层                             │
│         (聊天、选股、Skill管理、回测、分析)                 │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│                    业务数据层                               │
│  ├─ 用户和权限          ├─ Skill管理      ├─ 聊天记录      │
│  ├─ 自选股和观察池      ├─ 回测结果      ├─ 记忆系统      │
│  └─ 策略配置           ├─ 执行记录      └─ 分析历史      │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│                   基础数据层（只读缓存）                     │
│  ├─ 股票基本信息        ├─ 行情K线数据      ├─ 分时数据     │
│  ├─ 板块分类           ├─ 资金流向         ├─ 新闻公告     │
│  └─ 指标计算结果       ├─ 市场情绪         └─ 历史回测数据 │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. 核心表设计（13个表）

### 分组1: 用户和权限

#### 表1: users
```sql
CREATE TABLE users (
  id VARCHAR(64) PRIMARY KEY,
  username VARCHAR(64) NOT NULL UNIQUE,
  email VARCHAR(128) UNIQUE,
  phone VARCHAR(20),
  
  -- 用户信息
  nickname VARCHAR(64),
  avatar_url VARCHAR(255),
  introduction TEXT,
  
  -- 权限和状态
  role ENUM('admin', 'user', 'read_only') DEFAULT 'user',
  status ENUM('active', 'suspended', 'deleted') DEFAULT 'active',
  
  -- 偏好设置
  preferred_sectors JSON,           -- 偏好的板块列表
  notification_enabled BOOLEAN DEFAULT true,
  theme ENUM('light', 'dark') DEFAULT 'dark',
  
  -- 时间戳
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP,
  
  KEY idx_username (username),
  KEY idx_created_at (created_at)
);
```

#### 表2: user_watchlists (用户自选股分组)
```sql
CREATE TABLE user_watchlists (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  name VARCHAR(128) NOT NULL,          -- 如"日观察池"、"持仓提醒"
  description TEXT,
  
  -- 分组类型
  type ENUM('watching', 'holding', 'completed', 'custom') DEFAULT 'custom',
  
  -- 统计信息
  stock_count INT DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id),
  KEY idx_user_type (user_id, type)
);
```

#### 表3: user_watchlist_stocks (自选股具体项)
```sql
CREATE TABLE user_watchlist_stocks (
  id VARCHAR(64) PRIMARY KEY,
  watchlist_id VARCHAR(64) NOT NULL,
  stock_code VARCHAR(10) NOT NULL,
  stock_name VARCHAR(64),
  
  -- 用户备注
  note TEXT,
  target_price DECIMAL(10, 2),        -- 目标价
  entry_price DECIMAL(10, 2),         -- 入场价
  exit_price DECIMAL(10, 2),          -- 出场价
  
  -- 监控条件
  alert_rules JSON,                   -- 触发条件，如{"condition": "price_reach", "value": 100}
  
  -- 状态
  status ENUM('watching', 'entered', 'completed', 'aborted') DEFAULT 'watching',
  reason_added VARCHAR(255),          -- 添加理由
  
  -- 时间戳
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (watchlist_id) REFERENCES user_watchlists(id),
  KEY idx_watchlist_stock (watchlist_id, stock_code),
  KEY idx_status (status)
);
```

---

### 分组2: 策略和Skill

#### 表4: strategies (用户创建的策略配置)
```sql
CREATE TABLE strategies (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  
  -- 基本信息
  name VARCHAR(255) NOT NULL,         -- 策略名称
  description TEXT,                   -- 策略说明
  user_input TEXT,                    -- 用户原始输入的自然语言
  
  -- 核心配置 (重点)
  strategy_config JSON NOT NULL,      -- 完整的策略JSON配置
  extracted_factors TEXT,             -- 提取的因子列表 (逗号分隔)
  
  -- 元数据
  creation_method ENUM('manual', 'nlp_parse', 'from_skill') DEFAULT 'nlp_parse',
  parsing_confidence DECIMAL(3, 2),   -- 解析置信度
  
  -- 统计信息
  total_runs INT DEFAULT 0,           -- 执行过多少次
  last_run_at TIMESTAMP,              -- 最后执行时间
  
  -- 状态
  status ENUM('active', 'archived', 'deleted') DEFAULT 'active',
  
  -- 时间戳
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id),
  KEY idx_user_created (user_id, created_at)
);
```

#### 表5: skills (Skill库，已沉淀的可复用策略)
```sql
CREATE TABLE skills (
  id VARCHAR(64) PRIMARY KEY,
  
  -- 基本信息
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT NOT NULL,
  
  -- 类型（区分内置和用户自定义）
  type ENUM('builtin', 'user_created', 'shared') DEFAULT 'user_created',
  creator_id VARCHAR(64),             -- 如果type='builtin'，则为'system'
  
  -- Skill配置
  strategy_config JSON NOT NULL,      -- 完整的策略配置
  tags TEXT,                          -- 标签，逗号分隔
  
  -- 回测数据（关键指标）
  backtest_config JSON,               -- 最新回测的参数
  backtest_result JSON,               -- 最新回测的结果 (包含胜率、收益等)
  backtest_run_at TIMESTAMP,          -- 最新回测时间
  
  -- 使用统计
  enabled BOOLEAN DEFAULT true,
  run_frequency INT DEFAULT 0,        -- 被运行过多少次
  last_run_at TIMESTAMP,              -- 最后一次运行时间
  user_rating DECIMAL(3, 2),          -- 用户平均评分(1-5)
  
  -- 容量和风险
  capacity_estimate_min_million INT,  -- 容量下界(百万)
  capacity_estimate_max_million INT,  -- 容量上界(百万)
  risk_level ENUM('low', 'medium', 'high') DEFAULT 'medium',
  
  -- 状态
  status ENUM('active', 'paused', 'retired') DEFAULT 'active',
  
  -- 时间戳
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  KEY idx_type (type),
  KEY idx_enabled (enabled),
  KEY idx_rating (user_rating),
  FULLTEXT INDEX ft_name_desc (name, description)
);
```

#### 表6: skill_runs (Skill执行记录)
```sql
CREATE TABLE skill_runs (
  id VARCHAR(64) PRIMARY KEY,
  skill_id VARCHAR(64) NOT NULL,
  triggered_by VARCHAR(64),           -- 触发者user_id，如果是定时任务则为'system'
  
  -- 执行信息
  result_count INT DEFAULT 0,         -- 返回多少只股票
  result_stocks JSON,                 -- 候选股列表 [{"code":"600519", "name":"...", "score":0.92}]
  execution_time_ms INT,              -- 执行耗时(毫秒)
  
  -- 状态
  status ENUM('success', 'partial_success', 'failed') DEFAULT 'success',
  error_message TEXT,
  
  -- 时间戳
  run_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (skill_id) REFERENCES skills(id),
  KEY idx_skill_date (skill_id, run_at)
);
```

#### 表7: skill_user_links (用户和Skill的关系)
```sql
CREATE TABLE skill_user_links (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  skill_id VARCHAR(64) NOT NULL,
  
  -- 用户对该Skill的操作
  enabled BOOLEAN DEFAULT true,
  is_favorite BOOLEAN DEFAULT false,
  custom_name VARCHAR(255),          -- 用户给该Skill取的别名
  custom_params JSON,                -- 用户的自定义参数覆盖
  
  -- 统计
  personal_run_count INT DEFAULT 0,
  personal_rating INT,                -- 1-5分
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (skill_id) REFERENCES skills(id),
  UNIQUE KEY unique_user_skill (user_id, skill_id),
  KEY idx_user_enabled (user_id, enabled)
);
```

---

### 分组3: 聊天和记忆

#### 表8: chat_messages (聊天记录)
```sql
CREATE TABLE chat_messages (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(64) DEFAULT 'default',
  session_id VARCHAR(64),             -- 会话ID，用于分组
  
  -- 消息内容
  role ENUM('user', 'assistant') NOT NULL,
  content TEXT NOT NULL,              -- 消息正文
  message_type ENUM('text', 'image', 'voice', 'action') DEFAULT 'text',
  
  -- 关联信息
  related_stock_code VARCHAR(10),     -- 如果消息涉及某只股票
  related_skill_id VARCHAR(64),       -- 如果消息涉及某个Skill
  
  -- 向量搜索预留
  embedding LONGBLOB,                 -- 存储向量（预留，Phase 5使用）
  embedding_model VARCHAR(50),        -- 向量模型名称
  
  -- 元数据
  metadata JSON,                      -- 任意扩展数据
  
  -- 时间戳
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  KEY idx_user_session (user_id, session_id),
  KEY idx_stock (related_stock_code),
  KEY idx_skill (related_skill_id),
  FULLTEXT INDEX ft_content (content)
);
```

#### 表9: user_memory (用户记忆库)
```sql
CREATE TABLE user_memory (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  
  -- 记忆类型
  memory_type ENUM(
    'stock_view',         -- 对某只股票的观点
    'strategy_pattern',   -- 经常使用的策略模式
    'factor_preference',  -- 喜欢使用的因子组合
    'decision_note',      -- 交易决策笔记
    'lesson_learned'      -- 吸取的教训
  ),
  
  -- 记忆内容
  content TEXT NOT NULL,
  
  -- 关联信息
  stock_code VARCHAR(10),
  skill_id VARCHAR(64),
  source_chat_id BIGINT,              -- 来自哪条聊天消息
  
  -- 记忆强度
  confidence DECIMAL(3, 2),           -- 记忆可靠度(0-1)
  frequency INT DEFAULT 1,            -- 此记忆被提及的次数
  
  -- 时间戳
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id),
  KEY idx_user_type (user_id, memory_type),
  KEY idx_stock (stock_code)
);
```

---

### 分组4: 回测和分析

#### 表10: backtest_results (回测结果记录)
```sql
CREATE TABLE backtest_results (
  id VARCHAR(64) PRIMARY KEY,
  skill_id VARCHAR(64),
  strategy_id VARCHAR(64),
  user_id VARCHAR(64) NOT NULL,
  
  -- 回测参数
  test_start_date DATE NOT NULL,
  test_end_date DATE NOT NULL,
  strategy_config JSON NOT NULL,
  
  -- 核心指标
  total_signals INT,                  -- 产生了多少个信号
  executed_trades INT,                -- 其中有多少次实际交易
  win_count INT,                      -- 盈利的次数
  loss_count INT,                     -- 亏损的次数
  
  win_rate DECIMAL(5, 4),             -- 胜率
  avg_profit_pct DECIMAL(6, 4),       -- 平均收益率
  avg_loss_pct DECIMAL(6, 4),         -- 平均亏损率
  
  total_return_pct DECIMAL(8, 4),     -- 总收益率
  annual_return_pct DECIMAL(8, 4),    -- 年化收益率
  max_drawdown_pct DECIMAL(8, 4),     -- 最大回撤
  sharpe_ratio DECIMAL(6, 4),         -- 夏普比率
  profit_factor DECIMAL(6, 4),        -- 获利因子
  
  -- 容量评估
  capacity_estimate_min_million INT,
  capacity_estimate_max_million INT,
  
  -- 图表和详情
  equity_curve_data LONGBLOB,         -- 权益曲线数据(序列化)
  trade_details JSON,                 -- 详细交易列表
  
  -- 状态
  status ENUM('success', 'partial', 'failed') DEFAULT 'success',
  
  -- 时间戳
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  KEY idx_skill_date (skill_id, created_at),
  KEY idx_user_date (user_id, created_at)
);
```

#### 表11: ai_analysis_history (AI分析历史)
```sql
CREATE TABLE ai_analysis_history (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(64),
  
  -- 分析对象
  stock_code VARCHAR(10),
  analysis_type ENUM(
    'technical',      -- 技术面分析
    'sentiment',      -- 情感面分析
    'capital',        -- 资金面分析
    'strategy_score'  -- 策略评分
  ),
  
  -- 分析内容
  title VARCHAR(255),
  summary VARCHAR(500),
  detailed_content LONGTEXT,
  
  -- 向量搜索预留
  embedding LONGBLOB,
  embedding_model VARCHAR(50),
  
  -- 元数据
  data_date DATE,
  confidence DECIMAL(3, 2),           -- 分析置信度
  
  -- 时间戳
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  KEY idx_stock_type (stock_code, analysis_type),
  KEY idx_user_date (user_id, created_at),
  FULLTEXT INDEX ft_content (title, summary, detailed_content)
);
```

---

### 分组5: 基础参考数据

#### 表12: stocks (股票基本信息)
```sql
CREATE TABLE stocks (
  id VARCHAR(64) PRIMARY KEY,
  code VARCHAR(10) NOT NULL UNIQUE,   -- 股票代码，如600519
  name VARCHAR(64) NOT NULL,          -- 股票名称
  
  -- 分类
  exchange ENUM('SH', 'SZ') NOT NULL, -- 沪深市场
  market_type ENUM('main', 'gem', 'sci') DEFAULT 'main',  -- 主板/创业板/科创板
  sector VARCHAR(64),                 -- 行业
  sub_sector VARCHAR(64),             -- 细分行业
  
  -- 基本信息
  list_date DATE,                     -- 上市日期
  ipo_price DECIMAL(10, 2),           -- IPO价格
  
  -- 实时数据（缓存）
  current_price DECIMAL(10, 2),
  market_cap_billion DECIMAL(12, 2),  -- 市值(亿元)
  
  -- 统计
  follow_count INT DEFAULT 0,         -- 被关注的人数
  
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  KEY idx_code_name (code, name),
  KEY idx_sector (sector)
);
```

#### 表13: market_sentiment (市场情绪快照)
```sql
CREATE TABLE market_sentiment (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  
  -- 时间
  date_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- 指数
  index_code VARCHAR(10),             -- 如000001(上证指数)
  index_value DECIMAL(10, 2),
  index_change_pct DECIMAL(6, 4),
  
  -- 市场情绪指标
  up_stock_count INT,                 -- 上涨家数
  down_stock_count INT,               -- 下跌家数
  limit_up_count INT,                 -- 涨停家数
  limit_down_count INT,               -- 跌停家数
  
  turnover_rate_avg DECIMAL(5, 2),    -- 平均换手率
  volume_trend VARCHAR(20),           -- 量能趋势(放大/缩小/平衡)
  
  -- 资金面
  north_fund_inflow_million INT,      -- 北向资金净流入(百万)
  main_fund_inflow_million INT,       -- 主力资金净流入(百万)
  
  -- AI情绪指标
  fear_greed_index INT,               -- 恐贪指数(0-100)
  market_sentiment ENUM('extreme_fear', 'fear', 'neutral', 'greed', 'extreme_greed'),
  
  KEY idx_datetime (date_time)
);
```

---

## 3. 关键关系和外键

```
users (用户)
  ├─ has many user_watchlists
  │  └─ contains user_watchlist_stocks
  ├─ has many strategies
  ├─ has many skill_user_links → skills
  ├─ has many chat_messages
  ├─ has many user_memory
  ├─ has many backtest_results
  └─ has many ai_analysis_history

strategies (用户创建的策略)
  ├─ belongs to user
  └─ can be converted to → skills

skills (可复用的Skill)
  ├─ has many skill_runs
  ├─ has many skill_user_links → users
  └─ may have backtest_results

stocks (股票)
  ├─ appears in user_watchlist_stocks
  ├─ related to chat_messages
  └─ appears in skill_runs results

chat_messages (聊天)
  ├─ belongs to user
  ├─ may relate to stocks
  ├─ may relate to skills
  └─ sources user_memory
```

---

## 4. 重要索引设计

### 4.1 查询性能索引

```sql
-- 用户维度查询
KEY idx_user_created (user_id, created_at)      -- 常见：某用户的所有策略
KEY idx_user_enabled (user_id, enabled)         -- 常见：用户启用的Skills

-- 股票维度查询
KEY idx_stock (stock_code)                      -- 常见：查找某只股票的所有记录
KEY idx_sector (sector)                         -- 常见：按行业筛选

-- 时间维度查询
KEY idx_created_at (created_at)                 -- 常见：最近的记录
KEY idx_skill_date (skill_id, created_at)       -- 常见：某Skill的历史执行

-- 状态维度查询
KEY idx_status (status)                         -- 常见：查找活跃/归档策略
KEY idx_type (type)                             -- 常见：查找某类Skill
```

### 4.2 全文搜索索引

```sql
FULLTEXT INDEX ft_content (content)             -- 聊天消息搜索
FULLTEXT INDEX ft_name_desc (name, description) -- Skill名称和描述搜索
```

### 4.3 向量搜索预留（Phase 5）

```sql
-- 预留的embedding字段已在表中定义
-- Phase 5时可添加：
-- KEY idx_embedding (id)
-- SPATIAL INDEX idx_embedding_vector (embedding)
-- （取决于向量数据库的选择）
```

---

## 5. 数据流设计

### 5.1 创建策略的数据流

```
用户输入（聊天）
  ↓
ai_parse_strategy（LLM解析）
  ↓
生成strategy_config JSON
  ↓
存储到strategies表
  ↓
执行扫描（因子引擎查询）
  ↓
获得candidate_stocks列表
  ↓
插入skill_runs表或cache
  ↓
返回给前端展示
```

### 5.2 保存为Skill的数据流

```
user选择"保存为Skill"
  ↓
系统检测该strategy_config是否已有相似Skill
  ↓
如果新建：
  strategy → skills表
  strategy_config → skills.strategy_config
  
如果已有：
  建立skill_user_links关联
  ↓
触发backtest_results计算（异步）
  ↓
更新skills表的backtest_result字段
```

### 5.3 记忆系统的数据流

```
chat_message到达
  ↓
LLM提取该消息中的key insights
  ↓
检测是否与某只股票/Skill相关
  ↓
如果是，提取为user_memory
  ↓
计算confidence分数
  ↓
定期聚合为"用户最常用的5个因子"之类的建议
```

---

## 6. 数据容量规划

假设初期用户100人，每人平均数据量：

| 表 | 行数 | 大小 |
|-----|------|------|
| users | 100 | ~50KB |
| strategies | 500 | ~1MB |
| skills | 50 | ~2MB |
| chat_messages | 50,000 | ~50MB |
| user_memory | 2,000 | ~5MB |
| skill_runs | 10,000 | ~20MB |
| backtest_results | 1,000 | ~10MB |
| **Total** | **~63,650** | **~88MB** |

扩展方案：
- 用户增长到1000: 预计~800MB
- 用户增长到10000: 预计~8GB，建议分表+分库

---

## 7. 数据备份策略

```
每日完整备份（北京时间03:00）
  ↓
每小时增量备份（binlog）
  ↓
保留策略：
  - 最近30天完整备份
  - 最近7天每小时备份
  - 定期异地备份（阿里云OSS）
```

---

## 8. 数据一致性和事务

### 8.1 关键事务

```
创建Skill时的事务：
BEGIN TRANSACTION
  INSERT INTO skills (...)
  INSERT INTO skill_user_links (...)
  COMMIT
```

### 8.2 并发控制

```
strategies表和skill_runs表的并发读：
  使用MVCC（MySQL默认的READ COMMITTED隔离级别）

user_watchlist_stocks的更新：
  使用行级锁防止并发修改

chat_messages的插入：
  高并发，使用分区表或消息队列缓冲
```

---

## 9. 数据安全和隐私

### 9.1 敏感字段加密

```sql
-- 用户隐私信息加密存储
-- 可用mysql的AES_ENCRYPT()或在应用层加密

UPDATE users SET
  phone = AES_ENCRYPT(phone, 'secret_key'),
  email = AES_ENCRYPT(email, 'secret_key')
  WHERE id = '...';
```

### 9.2 审计日志

```sql
CREATE TABLE audit_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(64),
  action VARCHAR(50),          -- 'CREATE_STRATEGY', 'DELETE_SKILL'等
  resource_type VARCHAR(50),   -- 'strategy', 'skill', 'watchlist'
  resource_id VARCHAR(64),
  changes JSON,                -- 变更前后对比
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 10. SQL 快速参考

### 常用查询

```sql
-- 1. 查找某用户的所有活跃策略
SELECT * FROM strategies 
WHERE user_id = 'user_123' AND status = 'active'
ORDER BY created_at DESC;

-- 2. 查找某个Skill的最近3次执行记录及结果
SELECT * FROM skill_runs 
WHERE skill_id = 'SKL-001' 
ORDER BY run_at DESC 
LIMIT 3;

-- 3. 查找用户关注最多的股票
SELECT stock_code, COUNT(*) as count
FROM user_watchlist_stocks
WHERE user_id = 'user_123'
GROUP BY stock_code
ORDER BY count DESC
LIMIT 10;

-- 4. 查找该用户对某只股票的所有历史观点
SELECT * FROM user_memory
WHERE user_id = 'user_123' AND stock_code = '600519'
ORDER BY created_at DESC;

-- 5. 查找所有启用的Skill及其最新回测结果
SELECT s.*, sr.total_return_pct, sr.win_rate
FROM skills s
LEFT JOIN backtest_results sr ON s.id = sr.skill_id
WHERE s.enabled = true
ORDER BY s.run_frequency DESC;
```

---

**更新日期**: 2026-01-08  
**版本**: 2.0  
**维护者**: 数据库设计团队