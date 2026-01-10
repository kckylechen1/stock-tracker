# 交易记忆系统 TODO (Vision 增强版)

> 目标：让用户上传成功/失败的交易案例，AI 分析并存储，当看新股票时自动匹配相似模式并提醒
> 
> **核心策略**：数值层预处理 + Vision 确认，覆盖率从 85% → 95%+

## 状态：🚧 规划中

---

## Phase 1: 基础版（MVP）→ Vision Ready

### 1.1 数据结构设计
- [ ] 定义 `TradingMemory` 接口（含 Vision 扩展字段）
```typescript
interface TradingMemory {
  id: string;
  stockCode: string;
  stockName: string;
  dateRange: { start: string; end: string };
  result: 'success' | 'failure' | 'breakeven';
  
  // 用户输入
  userNote: string;
  
  // 数值特征（Phase 1 核心）
  features: {
    entryRsi: number;
    exitRsi: number;
    macdStatus: 'golden_cross' | 'dead_cross' | 'above_zero' | 'below_zero';
    fundFlowTrend: 'strong_inflow' | 'weak_inflow' | 'outflow' | 'mixed';
    volumePattern: 'surge' | 'shrink' | 'normal' | 'divergence';
    pricePattern: string;
    keyLevels: { support: number; resistance: number };
  };
  
  // Vision 特征（Phase 2 核心）
  chartImageUrl?: string;
  visionFeatures?: {
    patterns: string[];      // ["long_upper_shadow", "fake_breakout", "dense_consolidation"]
    confidence: number;      // 0-1
    visualTraps: string[];   // ["induced_long", "shadow_rejection"]
    keyLevels?: { support: number; resistance: number };
    summary?: string;
  };
  
  // AI 生成内容
  summary: string;
  lesson: string;
  tags: string[];
  
  // 元数据
  createdAt: Date;
  profitPercent?: number;
}
```
- [ ] 创建 MySQL 表 `trading_memories`
- [ ] 创建 JSON 文件存储（备用）

### 1.2 案例上传 API
- [ ] 创建 `/api/memory/add` 接口
- [ ] 创建 `/api/memory/list` 接口
- [ ] 创建 `/api/memory/delete` 接口

### 1.3 AI 分析器（数值为主）
- [ ] 创建 `analyzeTradeCase()` 函数
  - 调用 Grok 分析 K 线数据
  - 提取结构化特征
  - 生成文字总结和教训标签

### 1.4 简单匹配逻辑
- [ ] 创建 `matchMemory()` 函数
  - 基于标签匹配
  - 基于特征相似度

### 1.5 ⭐ 新增：截图生成器预备
- [ ] 创建 `generateChartImage()` 函数
  ```typescript
  async function generateChartImage(
    stockCode: string, 
    start: string, 
    end: string
  ): Promise<string> // 返回 base64 或 URL
  ```
- [ ] 使用 Playwright + TradingView Lightweight Charts
- [ ] 固定配置：
  - 日线/周线切换
  - RSI + MACD + BOLL overlay
  - 无水印
  - 固定 zoom/颜色主题
  - 固定分辨率（1200x800）
- [ ] 输出选项：
  - base64（本地存储）
  - 上传到 Cloudinary（免费层）返回 URL
- [ ] 缓存：Redis 存 URL 7 天（可选）

---

## Phase 2: 增强版 → Vision Core

### 2.1 前端 UI（原计划）
- [ ] 交易记忆管理页面
- [ ] 案例上传表单

### 2.2 向量检索 RAG（原计划）
- [ ] 案例总结做 embedding
- [ ] Chroma 向量数据库

### 2.3 K 线形态识别（数值层）
- [ ] 经典形态自动识别
- [ ] technicalindicators 库

### 2.4 ⭐ Vision 分析器（核心新增）
- [ ] 创建 `visionAnalyze()` 函数
  ```typescript
  async function visionAnalyze(
    chartImageUrl: string
  ): Promise<VisionFeatures>
  ```
- [ ] 调用 Claude-3.5 Sonnet / Grok-4 Vision
- [ ] Prompt 模板（强制 JSON）：
  ```
  你是专业K线形态专家。分析这张固定风格的TradingView截图：
  - 识别经典/视觉形态：头肩顶/底、双顶/底、三角/旗形、缺口、长影线假突破、密集区拥挤、吞没形态等
  - 量价视觉异常：放量滞涨、缩量拉升、顶背离影线
  - 关键水平：明显支撑/阻力位
  - 潜在陷阱：诱多/诱空、假突破概率
  - 自信度：0-1

  输出严格 JSON：
  {
    "patterns": ["fake_breakout", "long_upper_shadow"],
    "visualTraps": ["induced_long"],
    "keyLevels": {"support": 120.5, "resistance": 135.0},
    "confidence": 0.92,
    "summary": "典型长上影假突破，缩量滞涨"
  }
  ```
- [ ] Few-shot：prompt 塞 3 个手工标注示例

### 2.5 分析流程重构
- [ ] `analyzeTradeCase()` 升级：
  1. 数值层提取（RSI/MACD/量能）
  2. 生成截图 → `visionAnalyze()`
  3. 合并 `visionFeatures`
  4. Grok/Claude 最终总结（数值 + vision JSON）

### 2.6 Matcher 升级
- [ ] 匹配逻辑重构：
  1. 数值标签硬过滤
  2. Vision patterns 交集权重
  3. 返回 Top 3 相似案例
- [ ] 当前股票分析时：
  - 生成截图 + vision
  - 实时比对历史 `visionFeatures`

---

## Phase 3: 高级版

### 3.1 自动学习
- [ ] 从大量案例中学习模式
- [ ] 自动标签生成
- [ ] 胜率统计

### 3.2 Vision 核心化
- [ ] 历史案例全部 batch 生成截图 + vision 特征
- [ ] 可选：Claude Vision + 截图 embedding 做图像相似检索
- [ ] 智能提醒：
  - 自选股实时截图
  - Vision match
  - 推送"类似 2025-03 那次假突破，失败率 80%"

### 3.3 智能提醒
- [ ] 实时监控自选股
- [ ] 匹配历史模式时推送通知

---

## 技术选型

| 组件 | 选择 | 理由 |
|------|------|------|
| **截图生成** | Playwright + TradingView LC | 免费、一致性高、headless 稳定 |
| **Vision LLM** | Claude-3.5 Sonnet（首选）/ Grok-4 | Claude Vision 目前最强形态识别 |
| **存储** | MySQL + chartImageUrl | 查询快，成本低 |
| **向量检索** | Chroma + text embedding | Phase 2 够用 |
| **图片存储** | Cloudinary 免费层 | 5GB 免费 |

---

## 成本 & 风险控制

| 项目 | 成本 | 说明 |
|------|------|------|
| 数值分析 | 免费 | Grok 已有额度 |
| 截图生成 | ~0.01s | Playwright headless |
| Vision 调用 | ~800 token/次 | Claude 约 $0.003/次 |

**控制策略**：
- MVP 先关 Vision，只数值跑
- 用户案例 > 20 条再开 Vision
- **一致性关键**：所有截图 100% 相同配置（分辨率、指标、时间轴）

---

## 文件结构

```
server/
├── _core/
│   └── tradingMemory/
│       ├── index.ts           # 主入口
│       ├── analyzer.ts        # AI 案例分析（数值 + Vision）
│       ├── matcher.ts         # 模式匹配
│       ├── chartGenerator.ts  # 截图生成器
│       └── visionAnalyzer.ts  # Vision LLM 分析
├── memory/
│   └── routes.ts              # API 路由
└── data/
    └── trading_memories.json  # JSON 存储（备用）
```

---

## 经典 Vision Patterns 词库

```typescript
const VISION_PATTERNS = [
  // 顶部形态
  'head_and_shoulders',      // 头肩顶
  'double_top',              // 双顶 M 顶
  'triple_top',              // 三重顶
  'long_upper_shadow',       // 长上影线
  'evening_star',            // 黄昏星
  
  // 底部形态
  'inverse_head_shoulders',  // 头肩底
  'double_bottom',           // 双底 W 底
  'morning_star',            // 启明星
  'hammer',                  // 锤子线
  
  // 整理形态
  'triangle',                // 三角形
  'flag',                    // 旗形
  'wedge',                   // 楔形
  'dense_consolidation',     // 密集整理
  
  // 突破形态
  'breakout',                // 真突破
  'fake_breakout',           // 假突破
  'gap_up',                  // 跳空高开
  'gap_down',                // 跳空低开
  
  // 陷阱
  'induced_long',            // 诱多
  'induced_short',           // 诱空
  'shadow_rejection',        // 影线拒绝
  'volume_divergence',       // 量价背离
];
```

---

## 更新日志

- 2026-01-10: 创建 TODO
- 2026-01-10: 更新为 Vision 增强版方案
