# Stock Tracker NLP 策略 - 集成方案文档

**创建日期**: 2026-01-08  
**版本**: 2.0（融合版）  
**目标**: 定义Product Summary、NLP Strategy、Dev Plan 的融合集成

---

## 1. 三文档融合概览

```
product-summary.md              nlp-strategy-design.md          nlp-strategy-dev-plan.md
(产品形态)                      (NLP理论)                       (开发路线)
    │                               │                               │
    ├─ 7个核心功能模块             ├─ 自然语言→因子映射            ├─ 5个Phase
    ├─ 用户使用场景                ├─ 4维度因子设计                ├─ 技术架构
    ├─ 产品边界定义                ├─ Skill生命周期                ├─ 数据模型
    └─ 部署架构                    └─ 记忆系统设计                └─ API设计
                                         │
                                    ┌─────┴──────┬────────────┬──────────┐
                                    ↓            ↓            ↓          ↓
                            融合后的统一系统：
                    ┌─────────────────────────────────────┐
                    │ Stock Tracker NLP 选股系统           │
                    │ (聊天 + 自然语言 + Skill化 + 验证)   │
                    └─────────────────────────────────────┘
```

---

## 2. 核心融合点分析

### 融合点1: AI聊天系统 ↔ NLP策略引擎

#### product-summary的定义

```
功能1: 聊天界面
- 与AI对话讨论股票
- 支持个人使用和群组协作
- AI自动记录对话，提取关键观点
```

#### nlp-strategy-design的补充

```
在聊天中增加"策略意图识别"能力：
- 普通问答：「比亚迪怎么看?」→ 一般QA Prompt
- 选股请求：「帮我找换手高的」→ 策略解析 Prompt
- Skill执行：「跑龙头补涨」→ Skill执行 Prompt
```

#### 集成方案

```
技术实现：
1. 聊天消息到达 Mattermost
   ↓
2. Webhook触发意图识别 Prompt
   {
     "intent": "CREATE_STRATEGY" | "RUN_SKILL" | "GENERAL_QA",
     "confidence": 0.88
   }
   ↓
3. 根据intent路由到不同处理器
   CREATE_STRATEGY → 策略解析 + 因子引擎 + 结果展示
   RUN_SKILL → 直接执行 + 返回结果
   GENERAL_QA → 一般性回答
   ↓
4. AI生成自然语言回复
   ↓
5. 通过WebSocket推送给所有客户端

前端表现：
- 聊天框保持原有交互
- 聊天消息中会自动展示结构化结果面板
- 用户可从结果面板一键保存为Skill
```

---

### 融合点2: Skill体系的统一设计

#### product-summary的Skill定义

```
3个内置Skill:
- 龙头补涨监控（Builtin）
- 板块轮动监控（Builtin）
- 游资追踪（Builtin）

用户可启用/停用、调整参数
```

#### nlp-strategy-design的Skill理论

```
Skill是"已沉淀的可复用策略"：
- 来源：用户真实使用 + 回测验证
- 生命周期：发现 → 建议 → 验证 → 运行 → 评估 → 迭代 → 退役
- 可手动创建或自动发现

自动发现规则：
- 系统检测用户最近3次都用类似条件
- 建议Skill化
- 自动回测验证有效性
- 用户确认后保存
```

#### 集成方案

```
数据库设计：

skills表：
{
  id: 'SKL-001',
  type: 'builtin' | 'user_created' | 'shared',
  name: '龙头补涨监控',
  strategy_config: { ... },
  backtest_result: { win_rate: 0.64, total_return: 0.45 },
  enabled: true,
  run_frequency: 28,  // 被运行过28次
  ...
}

skill_user_links表（多对多关系）：
{
  user_id: 'user_123',
  skill_id: 'SKL-001',
  enabled: true,        // 用户是否启用
  custom_params: { ... }, // 用户的参数覆盖
  personal_rating: 4,   // 用户评分
  ...
}

功能设计：

【内置Skill】(官方提供)
├─ 龙头补涨监控 (系统内置)
│  └─ 用户可启用 → 每天14:00自动运行 → 推送TOP 5
├─ 板块轮动监控 (系统内置)
└─ 游资追踪 (系统内置)

【用户创建的Skill】
├─ 通过自然语言创建
│  步骤：输入 → AI解析 → 生成策略配置 → 执行扫描 → 保存为Skill
├─ 自动发现生成
│  步骤：检测规律 → 建议Skill化 → 自动回测 → 用户确认 → 保存
└─ 从其他用户复制修改

【Skill管理面板】
├─ 查看所有Skill（内置+自己创建+订阅的）
├─ 启用/停用某个Skill
├─ 调整参数并重新执行
├─ 查看历史运行结果
├─ 查看回测数据（胜率、收益、最大回撤等）
└─ 标记为收藏/删除
```

---

### 融合点3: 7个功能模块的完整集成

#### 现有功能 vs NLP新增功能

```
【原product-summary】
功能1: 聊天界面 ✅ 保留，但增强AI能力
功能2: 观察池 ✅ 保留，可从聊天直接添加
功能3: 交易策略库(Skill) ✅ 扩展为"内置+自创"两类
功能4: 回测工具 ✅ 保留，可在Skill详情中触发
功能5: 记忆库 ✅ 扩展为自动提取+向量搜索
功能6: 截图识别导入 ✅ 保留，后续实现
功能7: 一键发布 ✅ 保留，后续实现

【NLP新增】
✨ 自然语言选股入口
✨ 策略意图识别能力
✨ 因子映射和提取
✨ Skill自动发现
✨ 结果解释生成
```

#### 用户流程融合

**场景：用户想找"半导体板块里主力净流入的股票"**

```
Step 1: 用户在聊天框输入
"帮我找半导体板块里主力净流入的股票"

Step 2: 系统处理
├─ AI意图识别 → CREATE_STRATEGY
├─ Prompt解析 → 生成strategy_config
│  {
│    "sectors": ["半导体"],
│    "capital": { "main_fund_direction": "INFLOW" }
│  }
└─ 确认置信度 → 0.94（高）

Step 3: 执行扫描
├─ 因子引擎查询数据库
│  - 板块过滤 → 44只半导体股
│  - 资金过滤 → 主力净流入>100万的
│  - 综合排序 → 按资金强度排序
├─ 返回候选列表 (假设6只)
│  1. 中芯国际 (688981) - 主力净流入3000万 - 评分0.89
│  2. 紫光展锐 (688028) - 主力净流入1800万 - 评分0.84
│  ... 更多
└─ 计算耗时 → 230ms

Step 4: 前端展示（聊天面板中）
系统回复：
"找到6只符合条件的半导体股票：
 1️⃣ 中芯国际 - 评分0.89 ⭐⭐⭐
    理由：主力净流入3000万，持续看好
    [查看K线] [加入观察池] [为什么选这个]
 2️⃣ 紫光展锐 - 评分0.84 ⭐⭐
    ...

 💡 这个条件很不错，建议保存为Skill以后复用吗？"

Step 5: 用户交互
選項1：点击"加入观察池"
  → 直接添加到观察池
  → 设置目标价、提醒条件

選項2：点击"为什么选这个"
  → 展示详细解释
  "中芯国际被选中的原因：
   📊 板块匹配: 半导体 ✓
   💰 资金面: 主力净流入3000万 ✓
   📈 其他指标: 量比1.2, 换手率2.1%
   整体评分: 0.89/1.00"

選項3：点击"保存为Skill"
  → 系统建议: "保存为【半导体主力买入监控】?"
  → 用户确认
  → 系统自动触发回测
  → 显示回测结果: 最近3个月胜率62%
  → 保存完成，可设置定时运行

Step 6: 定时执行（如果保存为Skill）
每天14:00:
  ├─ 系统自动执行该Skill
  ├─ 生成候选列表
  ├─ 推送通知给用户
  └─ 记录到skill_runs表

Step 7: 记忆沉淀
系统记录：
  - 用户输入的自然语言
  - 解析的因子组合（"板块过滤+资金过滤"）
  - 执行结果
  - 用户后续操作（买入/卖出）

定期分析：
  "您最近30天最常用的因子组合是：
   1. 板块过滤 (使用15次)
   2. 资金强度 (使用12次)
   3. 量能确认 (使用8次)
   建议建立【我的常用因子Skill】"
```

---

## 3. 技术架构的融合集成

### 3.1 后端模块划分（融合版）

```
后端组件（15个核心模块）：

【数据获取层】
├─ data/market_data.py - 行情数据（东方财富API）
├─ data/factor_calculator.py - 因子计算（价、量、资金、事件）
└─ data/cache_manager.py - Redis缓存管理

【AI和策略层】
├─ ai/llm_service.py - LLM调用（意图识别、结果解释）
├─ strategy/intent_recognition.py - 意图识别Prompt
├─ strategy/parser.py - 自然语言→JSON解析
├─ strategy/executor.py - 策略执行和扫描
└─ strategy/backtester.py - 回测引擎

【业务逻辑层】
├─ skill/manager.py - Skill CRUD和生命周期
├─ skill/scheduler.py - 定时任务调度
├─ memory/extractor.py - 从聊天提取记忆
├─ analysis/reporter.py - 分析报告生成
└─ export/publisher.py - 飞书/Notion发布

【聊天集成层】
├─ mattermost/webhook_handler.py - Webhook处理
└─ mattermost/api_client.py - Mattermost API

【通用层】
├─ config/settings.py - 配置管理
└─ utils/database.py - 数据库操作
```

### 3.2 数据流集成

```
【完整数据流】

用户输入
  ├─ 方式1: 聊天框 → Mattermost WebSocket
  └─ 方式2: Skill管理面板 → API调用

↓

意图识别 (AI Layer)
├─ LLM分析意图类型
├─ 计算置信度
└─ 返回结构化意图对象

↓

意图路由
├─ CREATE_STRATEGY → 策略解析模块
├─ RUN_SKILL → Skill执行模块
├─ BACKTEST → 回测模块
├─ EXPLAIN_RESULT → 解释生成模块
└─ GENERAL_QA → 一般QA模块

↓

核心处理
├─ 策略解析
│  ├─ 自然语言 → strategy_config JSON
│  ├─ 提取因子维度
│  └─ 计算置信度
│
├─ 因子计算和扫描
│  ├─ 查询市场数据表 (stocks)
│  ├─ 计算各维度因子
│  ├─ 应用筛选条件
│  └─ 综合评分排序
│
├─ Skill执行
│  ├─ 查询skills表
│  ├─ 应用用户自定义参数
│  ├─ 执行扫描
│  └─ 记录到skill_runs表
│
└─ 回测执行
   ├─ 读取历史K线数据
   ├─ 模拟交易
   └─ 计算回测指标

↓

结果处理和展示
├─ 生成结果列表
├─ AI生成解释文本
└─ 返回给前端（聊天或面板）

↓

记忆沉淀
├─ 存储到chat_messages表
├─ 提取关键信息 → user_memory表
└─ 更新用户因子偏好统计

↓

定时任务（如果是Skill）
└─ 定期执行该Skill
   ├─ 查询skills表
   ├─ 获取user自定义参数
   ├─ 执行扫描
   └─ 插入skill_runs记录
```

---

## 4. 前端集成（三栏布局优化）

### 4.1 现有三栏布局

```
┌─────────────────────────────────────────────────────────────┐
│                       Header (顶部)                          │
├─────────────────┬──────────────────────┬────────────────────┤
│                 │                      │                    │
│  左栏            │      中栏            │     右栏           │
│  自选股列表      │   K线/分时图        │   AI聊天助手       │
│  (Product)      │   (Product)         │   (Product)        │
│                 │                      │                    │
└─────────────────┴──────────────────────┴────────────────────┘
```

### 4.2 NLP增强后的优化

```
┌─────────────────────────────────────────────────────────────┐
│                       Header (顶部导航)                      │
├────────────────┬───────────────────────┬───────────────────┤
│                │                       │                   │
│  左栏           │      中栏             │    右栏            │
│ ┌────────────┐ │ ┌─────────────────┐ │ ┌───────────────┐ │
│ │ 自选股列表  │ │ │   K线/分时图    │ │ │ AI聊天面板     │ │
│ │(Product)  │ │ │  (Product)      │ │ │ (Product增强) │ │
│ │            │ │ │                 │ │ │               │ │
│ │ 或          │ │ │ +               │ │ │ 输入框：      │ │
│ │ Skill列表   │ │ │ 策略结果面板    │ │ │ "帮我找..."   │ │
│ │ (NLP新增)   │ │ │ (NLP新增)       │ │ │               │ │
│ │            │ │ │                 │ │ │ 消息流：      │ │
│ │ 或          │ │ │ ├─ 候选股列表   │ │ │ - 聊天消息   │ │
│ │ 记忆/因子   │ │ │ ├─ 详细评分    │ │ │ - 结构化结果 │ │
│ │ (NLP新增)   │ │ │ └─ 操作按钮    │ │ │ - 操作建议   │ │
│ │            │ │ │                 │ │ │               │ │
│ └────────────┘ │ └─────────────────┘ │ │ 快速操作：    │ │
│                │                       │ │ [加入观察池]  │ │
│  标签Tab：     │                       │ │ [保存为Skill] │ │
│ - 自选股       │                       │ │ [查看回测]    │ │
│ - Skill库      │                       │ │               │ │
│ - 记忆          │                       │ │ 历史快捷：    │ │
│ - 回测结果      │                       │ │ [上次查询]    │ │
│ - 分析文章      │                       │ │ [常用Skill]   │ │
│                │                       │ │               │ │
└────────────────┴───────────────────────┴───────────────────┘
```

### 4.3 新增组件

```typescript
// 左栏新增组件
<SkillManagementPanel />      // Skill库管理
<MemoryFactorPanel />          // 记忆和因子展示
<BacktestResultPanel />        // 回测结果查看

// 中栏新增组件
<StrategyResultPanel />        // 策略结果展示
├─ <CandidateStockList />      // 候选股列表
├─ <StockScoreDetail />        // 详细评分
└─ <ActionButtons />           // 快速操作按钮

// 右栏增强
<ChatPanel /> (增强版)
├─ AI意图感知
├─ 结构化结果展示
└─ 快速操作推荐
```

---

## 5. 开发时间表融合（8周MVP）

```
【Phase 1: 基础框架】(第1-2周)
├─ Week 1:
│  ├─ Prompt开发（意图识别+解析）
│  ├─ 数据库表设计 (核心13个表)
│  ├─ API路由基础 (tRPC定义)
│  └─ 聊天Webhook集成
│
└─ Week 2:
   ├─ 因子引擎基础版（价量因子）
   ├─ 策略执行接口
   ├─ 结果展示面板（React组件）
   └─ E2E测试："帮我找换手高的" → 返回结果

【Phase 2: Skill系统】(第3-4周)
├─ Week 3:
│  ├─ Skill表CRUD (skill.create/list/delete)
│  ├─ Skill管理UI面板
│  └─ 策略→Skill转换逻辑
│
└─ Week 4:
   ├─ Skill执行接口 (skill.run)
   ├─ 定时任务框架 (node-cron)
   ├─ skill_runs记录和查询
   └─ E2E测试：保存Skill → 一键运行

【Phase 3: 因子扩展】(第5-6周)
├─ Week 5:
│  ├─ 板块数据接入
│  ├─ 资金因子（主力+北向）
│  └─ 事件因子基础
│
└─ Week 6:
   ├─ 因子组合和权重调整
   ├─ 结果排序和评分
   └─ E2E测试：复杂策略执行

【Phase 4: 高级功能】(第7-8周)
├─ Week 7:
│  ├─ 回测引擎实现
│  ├─ 记忆系统（对话提取）
│  └─ Skill自动发现逻辑
│
└─ Week 8:
   ├─ 飞书/Notion发布接口
   ├─ 完整E2E测试
   └─ MVP发布
```

---

## 6. API接口设计融合

### 6.1 tRPC 路由统一

```typescript
// 策略相关
strategy: {
  // 解析自然语言并执行扫描
  parseAndScan: .mutation({
    input: z.object({ userPrompt: z.string() }),
    output: {
      intent,
      confidence,
      strategy_config,
      results
    }
  }),

  // 仅解析不执行
  parse: .query({
    input: z.object({ userPrompt: z.string() }),
    output: { strategy_config, confidence }
  })
}

// Skill相关
skill: {
  create: .mutation({ ... }),
  list: .query({ ... }),
  run: .mutation({ ... }),
  delete: .mutation({ ... })
}

// 回测相关
backtest: {
  run: .mutation({
    input: z.object({
      skillId: z.string().optional(),
      config: StrategyConfigSchema.optional(),
      periodMonths: z.number()
    }),
    output: backtest_results
  })
}

// 聊天相关（现有）
chat: {
  send: .mutation({ ... }),
  history: .query({ ... })
}
```

### 6.2 API规范统一

所有API响应遵循统一格式：

```json
{
  "code": 200,                          // HTTP状态码
  "message": "成功" | "错误信息",       // 消息
  "data": { ... },                      // 业务数据
  "timestamp": "2026-01-08T21:30:00Z"   // 时间戳
}
```

---

## 7. 部署和运维融合

### 7.1 Docker Compose 配置

```yaml
version: "3.8"
services:
  # 聊天系统（product-summary）
  mattermost:
    image: mattermost/mattermost-team-edition:latest
    ports:
      - "8065:8065"
    environment:
      - DB_HOST=postgres
      - REDIS_HOST=redis
    depends_on:
      - postgres
      - redis

  # 后端应用（NLP + Skill + 数据处理）
  backend:
    build: ./backend
    ports:
      - "3001:3001"
    environment:
      - DATABASE_URL=postgresql://...
      - REDIS_URL=redis://redis:6379
      - LLM_API_KEY=...
    depends_on:
      - postgres
      - redis
      - mattermost

  # 前端应用
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - REACT_APP_API_URL=http://localhost:3001
      - REACT_APP_WS_URL=ws://localhost:8065

  # 数据库
  postgres:
    image: postgres:14
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=stock_tracker
      - POSTGRES_PASSWORD=password

  # 缓存
  redis:
    image: redis:7
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

### 7.2 定时任务配置

```javascript
// Skill自动执行（node-cron）
cron.schedule("0 14 * * 1-5", async () => {
  // 每个交易日下午2点
  const skills = await db.skills.findMany({
    enabled: true,
  });

  for (const skill of skills) {
    await skillExecutor.run(skill.id);
  }
});

// 每日数据更新
cron.schedule("0 3 * * *", async () => {
  // 每晚3点更新历史数据
  await dataUpdater.updateHistoricalData();
});

// 定期回测更新
cron.schedule("0 2 * * 0", async () => {
  // 每周日凌晨2点
  const skills = await db.skills.findMany();
  for (const skill of skills) {
    await backtester.run(skill.id);
  }
});
```

---

## 8. 风险评估和缓解方案

| 风险         | 概率 | 影响 | 缓解方案                    |
| ------------ | ---- | ---- | --------------------------- |
| LLM解析不准  | 中   | 高   | 增加结构化验证+用户确认环节 |
| 扫描性能慢   | 低   | 中   | 增量计算+Redis缓存热因子    |
| 板块数据缺失 | 低   | 中   | MVP降低优先级，先做价量因子 |
| 并发问题     | 中   | 中   | 使用消息队列缓冲+分布式锁   |
| 数据一致性   | 低   | 高   | 完整事务+定期数据验证       |

---

## 9. 集成验收清单

### Phase 1验收

- [ ] 聊天系统Webhook正常工作
- [ ] 能识别意图（CREATE vs RUN vs QA）
- [ ] 能生成strategy_config JSON
- [ ] 因子引擎能扫描和排序
- [ ] 前端能展示结果

### Phase 2验收

- [ ] Skill能保存和加载
- [ ] Skill能手动执行
- [ ] Skill管理面板正常
- [ ] skill_runs记录完整

### Phase 3验收

- [ ] 资金因子正确计算
- [ ] 板块过滤正常工作
- [ ] 综合评分合理

### Phase 4验收

- [ ] 回测能在1分钟内完成
- [ ] 回测结果准确
- [ ] 记忆系统能提取关键信息
- [ ] Skill自动发现逻辑有效

---

## 10. 下一步行动

### 本周（1月8-12日）

1. [ ] 技术方案评审
2. [ ] 数据库初始化脚本
3. [ ] Prompt初版测试
4. [ ] 开发环境搭建

### 下周（1月15-19日）

1. [ ] Phase 1实现和测试
2. [ ] 内部测试版本发布
3. [ ] 用户反馈收集

### 第三周（1月22-26日）

1. [ ] Phase 2-3实现
2. [ ] 完整功能集成
3. [ ] 性能优化

---

**更新日期**: 2026-01-08  
**版本**: 2.0  
**维护者**: 架构和产品团队
