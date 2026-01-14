/**
 * 牛股信号检测器 v2
 *
 * 基于技术指标和资金面分析的牛股发现系统
 * 支持全市场扫描和用户自选股池
 */

import { executeStockTool } from '../stockTools';
import { SMA, RSI, MACD, Stochastic } from 'technicalindicators';
import { EnhancedSellSignalDetector } from './enhanced-sell-signal-detector';

export interface BullStockOpportunity {
    symbol: string;
    name: string;
    launchDate: string;
    launchPrice: number;
    currentPrice: number;
    gain: number;
    totalScore: number;
    signals: string[];
    sellSignals: string[];
    riskLevel: 'low' | 'medium' | 'high' | 'extreme';
    action: 'hold' | 'reduce' | 'sell' | 'stop_loss';
    technicalScore: number;
    fundScore: number;
    patternScore: number;
    riskScore: number;
}

export interface BullStockDetectorOptions {
    maxStocks?: number;
    minScore?: number;
    scanMode?: 'full_market' | 'user_portfolio' | 'sector';
    sectorCode?: string;
    userStocks?: string[];
}

/**
 * 牛股信号检测器主类
 */
export class BullStockDetectorV2 {
    private options: Required<BullStockDetectorOptions>;
    private sellSignalDetector: EnhancedSellSignalDetector;

    constructor(options: BullStockDetectorOptions = {}) {
        this.options = {
            maxStocks: 10,
            minScore: 60,
            scanMode: 'full_market',
            sectorCode: '',
            userStocks: [],
            ...options,
        };
        this.sellSignalDetector = new EnhancedSellSignalDetector();
    }

    /**
     * 执行牛股检测
     */
    async detectBullStocks(): Promise<BullStockOpportunity[]> {
        let stockList: string[];

        // 确定扫描范围
        switch (this.options.scanMode) {
            case 'user_portfolio':
                stockList = this.options.userStocks;
                break;
            case 'sector':
                stockList = await this.getSectorStocks(this.options.sectorCode);
                break;
            case 'full_market':
            default:
                stockList = await this.getMarketStocks();
                break;
        }

        console.log(`📊 开始扫描 ${stockList.length} 只股票...`);

        // 并行分析所有股票
        const opportunities: BullStockOpportunity[] = [];

        // 限制并发数量，避免 API 限制
        const batchSize = 10;
        for (let i = 0; i < stockList.length; i += batchSize) {
            const batch = stockList.slice(i, i + batchSize);
            const batchPromises = batch.map(symbol => this.analyzeStock(symbol));
            const batchResults = await Promise.allSettled(batchPromises);

            for (const result of batchResults) {
                if (result.status === 'fulfilled' && result.value && result.value.totalScore >= this.options.minScore) {
                    opportunities.push(result.value);
                }
            }

            console.log(`✅ 已分析 ${Math.min(i + batchSize, stockList.length)}/${stockList.length} 只股票`);
        }

        // 按评分排序
        opportunities.sort((a, b) => b.totalScore - a.totalScore);

        // 限制返回数量
        const topOpportunities = opportunities.slice(0, this.options.maxStocks);

        console.log(`🎯 发现 ${topOpportunities.length} 个牛股机会`);

        return topOpportunities;
    }

    /**
     * 获取全市场股票列表
     */
    private async getMarketStocks(): Promise<string[]> {
        try {
            // 获取沪深主板股票
            const result = await executeStockTool('search_stock', { keyword: '000001' });
            // 这里需要解析实际的股票列表，暂时返回一些示例股票
            // 实际实现应该从工具获取完整的股票列表
            return [
                '000001', '000002', '600000', '600036', '000858',
                '002594', '300750', '000568', '600276', '000725',
                // 添加更多股票...
            ].slice(0, 50); // 限制测试规模
        } catch (error) {
            console.error('获取股票列表失败:', error);
            return [];
        }
    }

    /**
     * 获取板块股票
     */
    private async getSectorStocks(sectorCode: string): Promise<string[]> {
        // 实现板块股票获取逻辑
        // 这里可以调用 get_concept_board 或其他工具
        return [];
    }

    /**
     * 分析单只股票
     */
    private async analyzeStock(symbol: string): Promise<BullStockOpportunity | null> {
        try {
            // 1. 获取基本信息
            const quoteResult = await executeStockTool('get_stock_quote', { code: symbol });
            if (!quoteResult || quoteResult.includes('无法获取')) {
                return null;
            }

            // 解析报价信息（这里需要根据实际工具返回格式调整）
            const quote = this.parseQuoteResult(quoteResult);
            if (!quote) return null;

            // 2. 获取K线数据
            const klineResult = await executeStockTool('get_kline_data', {
                code: symbol,
                period: 'day',
                limit: 60 // 获取60天数据
            });

            const klineData = this.parseKlineResult(klineResult);
            if (!klineData || klineData.length < 20) {
                return null;
            }

            // 3. 获取资金流向（移除北向资金依赖）
            const fundFlowResult = await executeStockTool('get_fund_flow', { code: symbol });
            const fundFlow = this.parseFundFlowResult(fundFlowResult);

            // 注意：北向资金API已不可用，不再获取

            // 4. 计算技术指标
            const technical = this.calculateTechnicalIndicators(klineData);

            // 5. 检测买入信号
            const signals = this.detectBuySignals(technical, fundFlow, klineData);

            // 6. 确定启动日期（最近的强势信号日）
            const launchInfo = this.findLaunchDate(klineData, technical);

            // 7. 检测卖出信号（使用增强版检测器）
            const sellSignalAnalysis = await this.sellSignalDetector.analyzeSellSignals(
                symbol,
                quote.price,
                launchInfo.price, // 使用启动价格作为launchLow
                70 // 临时评分，用于sell signal检测
            );

            // 8. 计算综合评分（考虑卖出信号的影响）
            const sellSignals = sellSignalAnalysis.sellSignals.map(s => s.signal);
            const scores = this.calculateComprehensiveScore(technical, fundFlow, signals, sellSignals);

            return {
                symbol,
                name: quote.name,
                launchDate: launchInfo.date,
                launchPrice: launchInfo.price,
                currentPrice: quote.price,
                gain: ((quote.price - launchInfo.price) / launchInfo.price) * 100,
                totalScore: scores.total,
                signals,
                sellSignals,
                riskLevel: sellSignalAnalysis.riskLevel,
                action: sellSignalAnalysis.action,
                technicalScore: scores.technical,
                fundScore: scores.fund,
                patternScore: scores.pattern,
                riskScore: scores.risk,
            };

        } catch (error) {
            console.error(`分析股票 ${symbol} 失败:`, error);
            return null;
        }
    }

    /**
     * 计算技术指标
     */
    private calculateTechnicalIndicators(klineData: any[]): any {
        const closes = klineData.map(d => d.close);
        const highs = klineData.map(d => d.high);
        const lows = klineData.map(d => d.low);
        const volumes = klineData.map(d => d.volume);

        // 均线
        const ma5 = SMA.calculate({ values: closes, period: 5 });
        const ma10 = SMA.calculate({ values: closes, period: 10 });
        const ma20 = SMA.calculate({ values: closes, period: 20 });
        const ma60 = SMA.calculate({ values: closes, period: 60 });

        // MACD
        const macdResult = MACD.calculate({
            values: closes,
            fastPeriod: 12,
            slowPeriod: 26,
            signalPeriod: 9,
            SimpleMAOscillator: false,
            SimpleMASignal: false,
        });

        // RSI
        const rsiResult = RSI.calculate({ values: closes, period: 14 });

        // KDJ
        const kdjResult = Stochastic.calculate({
            high: highs,
            low: lows,
            close: closes,
            period: 14,
            signalPeriod: 3,
        });

        return {
            ma: { ma5: ma5[ma5.length - 1], ma10: ma10[ma10.length - 1], ma20: ma20[ma20.length - 1], ma60: ma60[ma60.length - 1] },
            macd: macdResult[macdResult.length - 1],
            rsi: rsiResult[rsiResult.length - 1],
            kdj: kdjResult[kdjResult.length - 1],
            volume: volumes[volumes.length - 1],
            closes,
            volumes,
        };
    }

    /**
     * 检测买入信号
     */
    private detectBuySignals(technical: any, fundFlow: any, klineData: any[]): string[] {
        const signals: string[] = [];

        // 均线多头排列
        if (technical.ma.ma5 > technical.ma.ma10 && technical.ma.ma10 > technical.ma.ma20 && technical.ma.ma20 > technical.ma.ma60) {
            signals.push('多头排列');
        }

        // MACD金叉
        if (technical.macd?.histogram > 0 && technical.macd?.MACD > technical.macd?.signal) {
            signals.push('MACD金叉');
        }

        // RSI强势
        if (technical.rsi > 50 && technical.rsi < 80) {
            signals.push('RSI强势');
        }

        // KDJ金叉
        if (technical.kdj?.k > technical.kdj?.d && technical.kdj?.k < 80) {
            signals.push('KDJ金叉');
        }

        // 资金流入
        if (fundFlow?.netInflow > 10000000) { // 1000万
            signals.push('主力资金净流入');
        }

        return signals;
    }

    /**
     * 检测卖出信号（已迁移到EnhancedSellSignalDetector）
     * 此方法保留用于兼容性
     */
    private detectSellSignals(technical: any, fundFlow: any, klineData: any[]): string[] {
        // 现在由EnhancedSellSignalDetector处理
        return [];
    }

    /**
     * 计算综合评分
     */
    private calculateComprehensiveScore(technical: any, fundFlow: any, buySignals: string[], sellSignals: string[]): any {
        let technicalScore = 0;
        let fundScore = 0;
        let patternScore = 0;
        let riskScore = 0;

        // 技术评分
        if (buySignals.includes('多头排列')) technicalScore += 20;
        if (buySignals.includes('MACD金叉')) technicalScore += 15;
        if (buySignals.includes('RSI强势')) technicalScore += 10;
        if (buySignals.includes('KDJ金叉')) technicalScore += 10;

        // 资金评分（移除北向资金依赖）
        if (fundFlow?.netInflow > 20000000) fundScore += 30; // 2000万 - 提高权重
        else if (fundFlow?.netInflow > 10000000) fundScore += 20; // 1000万

        // 形态评分（简化为技术信号强度）
        patternScore = Math.min(buySignals.length * 5, 20);

        // 风险评分
        if (sellSignals.includes('MACD死叉')) riskScore -= 10;
        if (sellSignals.includes('RSI超买')) riskScore -= 5;
        if (technical.rsi > 85) riskScore -= 15;

        const total = technicalScore * 0.4 + fundScore * 0.3 + patternScore * 0.2 + riskScore * 0.1;

        return {
            technical: technicalScore,
            fund: fundScore,
            pattern: patternScore,
            risk: riskScore,
            total: Math.max(0, Math.min(100, total)),
        };
    }

    /**
     * 查找启动日期
     */
    private findLaunchDate(klineData: any[], technical: any): { date: string; price: number } {
        // 简化为返回最新数据
        const latest = klineData[klineData.length - 1];
        return {
            date: latest.date,
            price: latest.close,
        };
    }

    // 辅助解析方法（需要根据实际工具返回格式实现）
    private parseQuoteResult(result: string): any {
        // 临时实现，实际需要解析工具返回的格式
        return {
            name: '测试股票',
            price: 10.0,
        };
    }

    private parseKlineResult(result: string): any[] {
        // 临时实现
        return [];
    }

    private parseFundFlowResult(result: string): any {
        // 临时实现
        return { netInflow: 0 };
    }
}

/**
 * 快速扫描牛股
 */
export async function quickBullStockScan(options: BullStockDetectorOptions = {}): Promise<BullStockOpportunity[]> {
    const detector = new BullStockDetectorV2(options);
    return await detector.detectBullStocks();
}

/**
 * 格式化输出结果
 */
export function formatBullStockResults(opportunities: BullStockOpportunity[]): string {
    if (opportunities.length === 0) {
        return '❌ 未发现符合条件的牛股机会';
    }

    let output = `🎯 发现 ${opportunities.length} 个牛股机会\n\n`;
    output += '| 排名 | 股票代码 | 股票名称 | 启动日期 | 当前涨幅 | 综合评分 | 风险等级 | 建议行动 | 主要信号 |\n';
    output += '|-----|---------|---------|---------|---------|---------|---------|---------|---------|\n';

    opportunities.forEach((opp, idx) => {
        const signals = opp.signals.slice(0, 2).join('+');
        const riskIcon = opp.riskLevel === 'low' ? '🟢' : opp.riskLevel === 'medium' ? '🟡' : opp.riskLevel === 'high' ? '🟠' : '🔴';
        const actionIcon = opp.action === 'hold' ? '📈' : opp.action === 'reduce' ? '⚠️' : opp.action === 'sell' ? '📉' : '🛑';

        output += `| ${idx + 1} | ${opp.symbol} | ${opp.name} | ${opp.launchDate} | ${opp.gain > 0 ? '+' : ''}${opp.gain.toFixed(1)}% | ${opp.totalScore.toFixed(0)} | ${riskIcon}${opp.riskLevel} | ${actionIcon}${opp.action} | ${signals} |\n`;
    });

    output += '\n💡 评分说明：>80分强烈推荐，60-80分值得关注，<60分谨慎观察\n';
    output += '🎨 风险等级：🟢低风险 🟡中风险 🟠高风险 🔴极高风险\n';
    output += '📊 行动建议：📈继续持有 ⚠️减仓 📉卖出 🛑止损\n';

    return output;
}
