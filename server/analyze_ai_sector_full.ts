/**
 * 获取东方财富AI应用板块成分股并进行牛股信号分析
 */

import * as akshare from './akshare';

interface BoardInfo {
    板块名称: string;
    板块代码: string;
    涨跌幅: string;
    总市值: string;
    换手率: string;
    [key: string]: any;
}

interface ConstituentStock {
    代码: string;
    名称: string;
    [key: string]: any;
}

/**
 * 查找AI应用相关的板块
 */
async function findAIApplicationBoards(): Promise<BoardInfo[]> {
    try {
        console.log('🔍 获取概念板块列表...');
        const boards = await akshare.getConceptBoardList();

        console.log(`📊 共找到 ${boards.length} 个概念板块`);

        // 查找AI应用相关的板块
        const aiBoards = boards.filter(board => {
            const name = board['板块名称'] || '';
            return name.includes('AI') ||
                   name.includes('人工智能') ||
                   name.includes('智能应用') ||
                   name.includes('AI应用') ||
                   name.includes('人工智能应用');
        });

        console.log(`🤖 找到 ${aiBoards.length} 个AI相关板块:`);
        aiBoards.forEach(board => {
            console.log(`  - ${board['板块名称']} (${board['板块代码']})`);
        });

        return aiBoards;
    } catch (error) {
        console.error('❌ 获取板块列表失败:', error);
        return [];
    }
}

/**
 * 获取AI应用板块的成分股
 */
async function getAIApplicationStocks(boardCode: string): Promise<ConstituentStock[]> {
    try {
        console.log(`📈 获取板块 ${boardCode} 的成分股...`);
        const stocks = await akshare.getConceptBoardConstituents(boardCode);

        console.log(`📋 板块包含 ${stocks.length} 只股票`);

        // 过滤出A股股票（排除港股、B股等）
        const aStocks = stocks.filter(stock => {
            const code = stock['代码'] || '';
            return code.startsWith('0') || code.startsWith('3') || code.startsWith('6');
        });

        console.log(`🇨🇳 筛选出 ${aStocks.length} 只A股股票`);

        return aStocks;
    } catch (error) {
        console.error('❌ 获取板块成分股失败:', error);
        return [];
    }
}

/**
 * 分析单只股票的牛股信号
 */
async function analyzeStockSignal(symbol: string, name: string) {
    try {
        const klines = await akshare.getStockHistory(symbol, 'daily', 365);
        if (!klines || klines.length < 60) {
            return null;
        }

        // 计算年度涨幅
        const yearGain = calculateYearGain(klines);

        // 检测启动日
        const launchDate = detectLaunchDay(klines);

        // 简单评分（基于之前的算法）
        let score = 0;
        let signals = [];

        if (launchDate) {
            score += 50; // 有启动日加分
            signals.push('✅ 检测到启动日');
        }

        // 涨幅评分
        if (yearGain > 100) score += 30;
        else if (yearGain > 50) score += 20;
        else if (yearGain > 0) score += 10;

        return {
            symbol,
            name,
            yearGain,
            launchDate,
            score,
            signals,
            detected: launchDate !== null
        };
    } catch (error) {
        return null;
    }
}

/**
 * 计算年度涨幅
 */
function calculateYearGain(klines: any[]): number {
    if (klines.length < 2) return 0;

    const yearStart = klines.find(k => k.date.startsWith('2025-01') || k.date.startsWith('2025-02'));
    if (!yearStart) return 0;

    const current = klines[klines.length - 1];
    return ((current.close - yearStart.close) / yearStart.close) * 100;
}

/**
 * 检测启动日
 */
function detectLaunchDay(klines: any[]): string | null {
    for (let i = 60; i < klines.length; i++) {
        const today = klines[i];
        const prev20Days = klines.slice(i - 20, i);

        if (prev20Days.length < 20) continue;

        const prev20High = Math.max(...prev20Days.map((k: any) => k.high));
        const prev20AvgVol = prev20Days.reduce((sum: number, k: any) => sum + k.volume, 0) / 20;

        const isBreakout = today.close > prev20High * 1.03;
        const isHighVolume = today.volume > prev20AvgVol * 2;
        const isBigUp = today.close > today.open * 1.05;

        if (isBreakout && isHighVolume && isBigUp) {
            return today.date;
        }
    }
    return null;
}

/**
 * 主函数
 */
async function main() {
    console.log('🚀 开始AI应用板块成分股分析\n');

    // 1. 查找AI应用板块
    const aiBoards = await findAIApplicationBoards();

    if (aiBoards.length === 0) {
        console.log('❌ 未找到AI应用板块');
        return;
    }

    // 2. 选择第一个AI应用板块进行分析
    const targetBoard = aiBoards[0];
    console.log(`\n🎯 选择分析板块: ${targetBoard['板块名称']} (${targetBoard['板块代码']})\n`);

    // 3. 获取板块成分股
    const aiStocks = await getAIApplicationStocks(targetBoard['板块代码']);

    if (aiStocks.length === 0) {
        console.log('❌ 未获取到板块成分股');
        return;
    }

    // 4. 分析每只股票的牛股信号
    console.log('📊 开始分析股票信号...\n');

    const results = [];
    const failed = [];

    for (let i = 0; i < aiStocks.length; i++) {
        const stock = aiStocks[i];
        const symbol = stock['代码'];
        const name = stock['名称'];

        console.log(`[${i + 1}/${aiStocks.length}] 分析 ${name}(${symbol})...`);

        const result = await analyzeStockSignal(symbol, name);
        if (result) {
            results.push(result);
            const status = result.detected ? '✅' : '❌';
            console.log(`  ${status} 年度涨幅: ${result.yearGain > 0 ? '+' : ''}${result.yearGain.toFixed(2)}%`);
        } else {
            failed.push({ symbol, name });
        }

        // 避免API限制
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    // 5. 生成分析报告
    console.log('\n\n' + '='.repeat(100));
    console.log(`📊 ${targetBoard['板块名称']}板块分析结果`);
    console.log('='.repeat(100));

    const total = results.length;
    const detected = results.filter(r => r.detected).length;
    const avgGain = results.reduce((sum, r) => sum + r.yearGain, 0) / total;

    console.log(`\n🎯 分析概况:`);
    console.log(`  板块名称: ${targetBoard['板块名称']}`);
    console.log(`  板块代码: ${targetBoard['板块代码']}`);
    console.log(`  成分股数: ${aiStocks.length}只`);
    console.log(`  成功分析: ${total}只`);
    console.log(`  信号识别: ${detected}只 (${(detected/total*100).toFixed(1)}%)`);
    console.log(`  平均涨幅: ${avgGain > 0 ? '+' : ''}${avgGain.toFixed(2)}%`);

    // 涨幅TOP10
    const topGainers = results
        .sort((a, b) => b.yearGain - a.yearGain)
        .slice(0, 10);

    console.log(`\n🚀 涨幅TOP10:`);
    topGainers.forEach((stock, index) => {
        const status = stock.detected ? '✅' : '❌';
        console.log(`  ${index + 1}. ${status} ${stock.name}(${stock.symbol}): ${stock.yearGain > 0 ? '+' : ''}${stock.yearGain.toFixed(2)}%`);
    });

    // 信号识别股票
    const signalStocks = results.filter(r => r.detected);
    if (signalStocks.length > 0) {
        console.log(`\n🎯 检测到牛股信号的股票:`);
        signalStocks.forEach(stock => {
            console.log(`  ✅ ${stock.name}(${stock.symbol}): +${stock.yearGain.toFixed(2)}% | 启动日: ${stock.launchDate}`);
        });
    }

    console.log(`\n⚠️  分析失败的股票: ${failed.length}只`);
    if (failed.length > 0) {
        failed.forEach(stock => {
            console.log(`  - ${stock.name}(${stock.symbol})`);
        });
    }

    console.log('\n' + '='.repeat(100));
    console.log('💡 投资建议:');
    console.log('1. 优先关注信号识别且涨幅靠前的股票');
    console.log('2. AI板块波动较大，注意风险控制');
    console.log('3. 结合基本面分析，谨慎投资');

    // 保存结果到文件
    const reportData = {
        boardInfo: targetBoard,
        totalStocks: aiStocks.length,
        analyzedStocks: total,
        detectedStocks: detected,
        averageGain: avgGain,
        topGainers: topGainers.slice(0, 5),
        signalStocks: signalStocks,
        failedStocks: failed,
        analysisTime: new Date().toISOString()
    };

    console.log(`\n💾 分析结果已保存到: ai_sector_full_analysis_${Date.now()}.json`);
}

// 直接运行
main().catch(console.error);