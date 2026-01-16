/**
 * ResearchAgent - 研究报告专用 Agent
 *
 * 擅长：
 * - 多源数据收集
 * - 研究报告生成
 * - 行业对比分析
 * - 热点追踪
 */

import { BaseAgent } from "../base-agent";
import { executeStockTool, stockTools } from "../../stockTools";
import type { ToolDefinition } from "../types";

const RESEARCH_SYSTEM_PROMPT = `你是一个专业的A股研究员，擅长收集多源数据并生成深度研究报告。

## 研究框架

1. **基本面研究**
   - 公司主营业务
   - 财务指标（PE、PB、ROE）
   - 行业地位

2. **市场热度**
   - 龙虎榜数据
   - 板块热度
   - 资金关注度

3. **新闻事件**
   - 近期公告
   - 行业政策
   - 突发事件

4. **技术面概览**
   - 趋势方向
   - 关键价位
   - 成交量变化

## 输出格式

生成的研究报告应包含：

# {股票名称} 研究报告

## 1. 公司概况
- 主营业务
- 市值规模
- 行业地位

## 2. 核心数据
| 指标 | 数值 | 行业均值 |
|-----|------|---------|
| PE | xx | xx |
| PB | xx | xx |

## 3. 近期动态
- 龙虎榜情况
- 资金流向趋势
- 重要新闻

## 4. 技术面概览
- 趋势判断
- 支撑/压力位

## 5. 研究结论
- 投资评级：买入/增持/中性/减持
- 核心逻辑
- 风险提示

## 原则

1. 报告要全面，但重点突出
2. 数据必须真实，无法获取则标注
3. 结论要有明确的逻辑链
4. 风险提示要具体
`;

const RESEARCH_TOOLS: ToolDefinition[] = stockTools.filter(t =>
  [
    "get_stock_quote",
    "get_kline_data",
    "get_fund_flow",
    "get_fund_flow_history",
    "get_fund_flow_rank",
    "get_longhu_bang",
    "get_market_news",
    "analyze_stock_technical",
    "get_market_fund_flow",
    "get_current_datetime",
    "search_stock",
    "get_concept_board",
    "get_zt_pool",
  ].includes(t.function.name)
) as ToolDefinition[];

export class ResearchAgent extends BaseAgent {
  constructor() {
    super({
      name: "ResearchAgent",
      description: "研究报告专家",
      systemPrompt: RESEARCH_SYSTEM_PROMPT,
      tools: RESEARCH_TOOLS,
      maxIterations: 12,
      maxTokens: 8000,
      temperature: 0.4,
      parallelToolCalls: true,
    });

    this.registerResearchTools();
  }

  private registerResearchTools(): void {
    const toolNames = RESEARCH_TOOLS.map(t => t.function.name);

    for (const name of toolNames) {
      this.registerTool(name, async args => {
        return executeStockTool(name, args);
      });
    }
  }
}
