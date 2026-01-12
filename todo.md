# Stock Tracker 项目 TODO

**最后更新**: 2026-01-11 16:20  
**负责人**: Kyle + Team

---

## 🔥 本周优先 (P0)

### SmartAgent 优化

- [x] 切换到 SmartAgent 新架构
- [x] 集成到 `/api/ai/stream` 端点
- [x] 简化前端输出（移除中间过程显示）
- [x] 开放推特/X 搜索舆情能力
- [x] **并发控制** - 使用 p-limit 限制 AKShare 并发为 6，加指数退避重试
- [x] **Prompt 优化** - 多维度分析框架（技术/资金/舆情/风险）+ 工具扩展
- [x] **缓存策略** - 区分交易时段/非交易时段的 TTL

### 性能优化

- [x] 响应时间硬上限 **20秒**，超时降级到基础工具
- [x] 内存缓存实现（已存在 IntelligentCache，支持交易时段/非交易时段 TTL）
- [x] 工具预算机制：简单问题 ≤4 工具，复杂问题 ≤8 工具

---

## 📋 下周计划 (P1)

### UI 三栏布局改版

- [ ] **左栏**: AI 对话区 + 快捷工具栏 + 趋势快览
- [ ] **中间**: 趋势图/K线主画布 + 技术指标叠加层
- [ ] **右栏**: 自选股列表（280-320px 固定宽度）
- [ ] 使用 `react-resizable-panels` 实现拖拽分栏
- [ ] 使用 ECharts 替换现有图表库
- [ ] 右栏使用 `react-window` 虚拟列表优化
- [ ] 移动端响应式：底部 TabBar 切换

### 牛股信号系统

- [x] 将 `bull_stock_signal_backtest.ts` 重构为 **Skill Module**
- [x] 命名: `bull_stock_detector_v2`
- [x] 支持全市场扫描 + 用户自选股池
- [x] 输出：排序后的机会列表（评分、启动日期、当前涨幅、买卖信号）
- [x] 集成到 AI Agent：用户说"扫个牛股"触发
- [x] 移除北向资金依赖（API已不可用）
- [ ] 配置每日收盘后自动运行

### 卖出信号升级

- [x] 空头排列检测
- [x] MACD 死叉检测
- [x] RSI < 50 检测
- [x] 缩量评分扣分
- [x] 综合评分 < 30 强制清仓
- [x] 跌破启动低点强制止损
- [x] 移除北向资金依赖（API已不可用）

---

## 📅 中期规划 (P2)

### 新增分析工具

| 工具名 | 说明 | 实现方式 |
|--------|------|----------|
| `analyze_market_sentiment` | 情绪分析 | 封装 guba_hot_rank + longhu_bang + north_flow |
| `analyze_sector_correlation` | 板块联动 | concept_board + industry_board + 皮尔逊相关系数 |
| `assess_investment_risk` | 风险评估 | technicalScore + 大盘beta + 资金风险 |
| `compare_historical_patterns` | 历史对比 | K线 cosine similarity 匹配 |

### Memory 系统增强

- [ ] 向量检索替代关键词匹配 (embedding)
- [ ] 会话摘要自动生成
- [ ] 重要洞察自动提取并持久化

### 多模型路由

- [ ] 根据任务类型自动选择模型
- [ ] Grok 4.1 (主力) / GLM 4.7 (备用) 自动切换
- [ ] 模型健康检查 + 故障自动切换

---

## 🎯 长期规划 (P3)

### 高级 Agent 能力

- [ ] 自我反思：Agent 完成任务后自动评估质量
- [ ] 学习循环：从用户反馈自动优化 Prompt
- [ ] 多 Agent 协作：多个 Agent 讨论后给出最终结论

### 吉祥物 "牛牛"

- [ ] 高清化设计（找设计师）
- [ ] 动态 mascot 效果
- [ ] 作为 annotation marker 集成到 K 线图
- [ ] 移动端常驻浮动按钮

### 自动化报告

- [ ] 回测框架每周自动运行全市场验证
- [ ] 自动生成报告推送到飞书/钉钉

---

## ✅ 已完成

### 2026-01-11

- [x] 评审 Claude Code 的 SmartAgent 重构报告
- [x] 新旧架构对比测试 (100% 成功率)
- [x] 切换 API 端点到 SmartAgent
- [x] 前端简化输出（移除思考/工具调用过程）
- [x] 更新系统提示词支持推特搜索
- [x] 创建工作流文档 `daily-summary-2026-01-11.md`

---

## 📎 相关文档

- [SmartAgent 重构报告](./AI_Agent_重构报告_20260111.md)
- [工具系统优化计划 v3.0](./AI_Agent工具系统优化实施计划_v3.md)
- [牛股信号回测报告](./bull_stock_signal_backtest_report.md)
- [产品设计文档](./product-summary.md)

---

## 📊 关键指标追踪

| 指标 | 当前值 | 目标值 | 状态 |
|------|--------|--------|------|
| 响应时间 | 13.6s | ≤20s | ✅ |
| 工具调用成功率 | 100% | ≥95% | ✅ |
| 输出详细度 | 299字 | ≥300字 | ✅ |
| 缓存命中率 | - | ≥70% | ⏳ |
| 用户满意度 | - | ≥4.0 | ⏳ |

---

## 🆕 2026-01-12 新增需求

### UI优化
- [x] 修复市场情绪面板遮挡K线图问题（默认折叠，点击展开）

### Grok API配置
- [x] 配置xAI Grok API密钥和端点 (https://api.x.ai/v1/chat/completions)
- [x] 使用grok-4-1-fast-reasoning模型

### 热门股票排行榜
- [x] 基于Gauge评分系统实现热门股票排行榜
- [x] 显示评分、涨跌幅、成交量等关键指标
- [x] 支持按评分、涨跌幅、成交量排序
