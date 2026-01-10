/**
 * Qwen Worker Prompt - Data Fetcher
 * 
 * Worker 模式的特点：
 * - 不聊天：只执行任务，不废话
 * - 结构化输出：返回格式化数据
 * - 低温度：0.2，确保稳定输出
 * - 快速：不需要深度推理
 */

/**
 * Qwen Worker 系统提示词
 */
export const QWEN_WORKER_SYSTEM_PROMPT = `你是一个数据获取助手。你的职责是执行工具调用，返回结构化数据。

## 规则
1. 收到任务后，立即调用对应的工具
2. 不要解释、不要废话、不要总结
3. 直接返回工具执行的结果
4. 如果需要多个工具，按顺序调用

## 可用工具
- comprehensive_analysis: 综合分析（技术+资金+大盘）
- get_stock_quote: 实时行情
- get_fund_flow: 今日资金流向
- get_fund_flow_history: 历史资金流向
- get_kline_data: K线数据
- get_market_news: 最新新闻
- get_guba_hot_rank: 股吧人气排名
- analyze_minute_patterns: 分钟级形态分析
- get_market_status: 大盘状态

## 输出
直接输出工具返回的结果。`;

/**
 * 任务类型
 */
export type WorkerTaskType = 
    | 'gauge_data'      // 仪表盘数据
    | 'news_data'       // 新闻数据
    | 'quick_quote'     // 快速行情
    | 'full_analysis'   // 完整分析
    | 'fund_flow'       // 资金流向
    | 'market_status';  // 大盘状态

/**
 * 构建 Worker 任务消息
 */
export function buildWorkerTask(task: {
    type: WorkerTaskType;
    stockCode?: string;
}): string {
    const { type, stockCode } = task;

    switch (type) {
        case 'gauge_data':
            if (!stockCode) return '缺少股票代码';
            return `获取 ${stockCode} 的综合分析数据，用于填充仪表盘。
调用工具：comprehensive_analysis，参数 code="${stockCode}"`;

        case 'news_data':
            return `获取最新财经新闻。
调用工具：get_market_news`;

        case 'quick_quote':
            if (!stockCode) return '缺少股票代码';
            return `获取 ${stockCode} 的实时行情。
调用工具：get_stock_quote，参数 code="${stockCode}"`;

        case 'full_analysis':
            if (!stockCode) return '缺少股票代码';
            return `获取 ${stockCode} 的完整分析数据。
依次调用以下工具：
1. comprehensive_analysis，参数 code="${stockCode}"
2. get_fund_flow_history，参数 code="${stockCode}"，days=10
3. get_guba_hot_rank，参数 code="${stockCode}"`;

        case 'fund_flow':
            if (!stockCode) return '缺少股票代码';
            return `获取 ${stockCode} 的资金流向数据。
依次调用：
1. get_fund_flow，参数 code="${stockCode}"
2. get_fund_flow_history，参数 code="${stockCode}"，days=5`;

        case 'market_status':
            return `获取大盘状态。
调用工具：get_market_status`;

        default:
            return `获取 ${stockCode || '市场'} 的数据。`;
    }
}

/**
 * Qwen Worker 模型调用参数
 */
export const QWEN_WORKER_CONFIG = {
    model: "Qwen/Qwen3-32B",    // 32B 模型，平衡性能和成本
    temperature: 0.2,           // 低温度，确保稳定
    max_tokens: 2048,
    top_p: 0.9,
};

/**
 * Qwen 意图分类器配置
 */
export const QWEN_CLASSIFIER_CONFIG = {
    model: "Qwen/Qwen2.5-32B-Instruct",  // 指令遵循更好
    temperature: 0.1,                     // 极低温度，稳定分类
    max_tokens: 64,
    top_p: 0.9,
};
