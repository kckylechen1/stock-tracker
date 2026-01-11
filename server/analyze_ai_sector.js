/**
 * AI应用板块股票分析 - JavaScript版本
 */

const akshare = require('./akshare');

/**
 * 计算年度涨幅
 */
function calculateYearGain(klines) {
    if (klines.length < 2) return 0;

    // 找2025年初的价格
    const yearStart = klines.find(k => k.date.startsWith('2025-01') || k.date.startsWith('2025-02'));
    if (!yearStart) return 0;

    const current = klines[klines.length - 1];
    return ((current.close - yearStart.close) / yearStart.close) * 100;
}

/**
 * 分析单只AI股票 - 简化版本
 */
async function analyzeAIStock(symbol, name, sector) {
    try {
        const klines = await akshare.getStockHistory(symbol, 'daily', 365);
        if (!klines || klines.length < 60) {
            console.log(`⚠️ ${name}(${symbol}): 数据不足`);
            return null;
        }

        const yearGain = calculateYearGain(klines);

        // 简单的评分逻辑
        let recommendation = '观望';
        let risk = '中';
        let reason = '';

        // 基于涨幅的简单判断
        if (yearGain > 100) {
            recommendation = '强烈买入';
            risk = '高';
            reason = '年度涨幅超过100%，AI板块强势表现';
        } else if (yearGain > 50) {
            recommendation = '买入';
            risk = '中';
            reason = '年度涨幅超过50%，AI板块机会显现';
        } else if (yearGain > 0) {
            recommendation = '持有';
            risk = '中';
            reason = '年度正增长，可适度关注';
        } else {
            recommendation = '观望';
            risk = '低';
            reason = '年度负增长，建议观望';
        }

        return {
            symbol,
            name,
            sector,
            yearGain,
            recommendation,
            risk,
            reason,
        };
    } catch (e) {
        console.log(`⚠️ ${name}(${symbol}): 分析失败 - ${e}`);
        return null;
    }
}

/**
 * 主函数 - AI应用板块分析
 */
async function main() {
    console.log('╔════════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                        AI应用板块股票投资分析                              ║');
    console.log('║              基于东方财富AI应用板块 - 简化分析版本                        ║');
    console.log('╚═════════════════════════════════════════════════════════════════════════╝\n');

    // AI应用板块股票列表 (基于东方财富板块数据)
    const aiStocks = [
        { symbol: '300502', name: '新易盛', sector: 'AI芯片存储' },
        { symbol: '301308', name: '江波龙', sector: 'AI存储芯片' },
        { symbol: '688111', name: '金山办公', sector: 'AI办公软件' },
        { symbol: '688981', name: '中芯国际', sector: 'AI芯片制造' },
        { symbol: '688008', name: '澜起科技', sector: 'AI芯片设计' },
        { symbol: '300750', name: '宁德时代', sector: 'AI新能源' },
        { symbol: '002415', name: '海康威视', sector: 'AI安防' },
        { symbol: '300274', name: '阳光电源', sector: 'AI新能源' },
        { symbol: '601138', name: '工业富联', sector: 'AI智能制造' },
        { symbol: '002594', name: '比亚迪', sector: 'AI新能源汽车' },
        { symbol: '300124', name: '汇川技术', sector: 'AI自动化' },
        { symbol: '600276', name: '恒瑞医药', sector: 'AI医疗' },
        { symbol: '300896', name: '爱美客', sector: 'AI医疗美容' },
    ];

    const results = [];
    const failed = [];

    console.log('🔍 正在分析AI应用板块股票...\n');

    for (let i = 0; i < aiStocks.length; i++) {
        const stock = aiStocks[i];
        console.log(`[${i + 1}/${aiStocks.length}] 分析 ${stock.name}(${stock.symbol}) - ${stock.sector}...`);

        const result = await analyzeAIStock(stock.symbol, stock.name, stock.sector);
        if (result) {
            results.push(result);
            const recoEmoji = {
                '强烈买入': '🚀',
                '买入': '✅',
                '持有': '⏳',
                '观望': '👀',
                '卖出': '❌'
            }[result.recommendation] || '❓';

            console.log(`  ${recoEmoji} ${result.recommendation} | 涨幅: ${result.yearGain > 0 ? '+' : ''}${result.yearGain.toFixed(2)}%`);
        } else {
            failed.push(stock);
        }

        await new Promise(resolve => setTimeout(resolve, 200)); // 增加延迟避免API限制
    }

    console.log('\n\n' + '═'.repeat(100));
    console.log('📊 AI应用板块分析结果\n');

    // 按推荐等级排序
    const recoOrder = { '强烈买入': 5, '买入': 4, '持有': 3, '观望': 2, '卖出': 1 };
    results.sort((a, b) => recoOrder[b.recommendation] - recoOrder[a.recommendation]);

    // 统计信息
    const recoStats = results.reduce((acc, r) => {
        acc[r.recommendation] = (acc[r.recommendation] || 0) + 1;
        return acc;
    }, {});

    console.log('🎯 投资建议统计:');
    Object.entries(recoStats).forEach(([reco, count]) => {
        const emoji = {
            '强烈买入': '🚀',
            '买入': '✅',
            '持有': '⏳',
            '观望': '👀',
            '卖出': '❌'
        }[reco] || '❓';
        console.log(`  ${emoji} ${reco}: ${count}只`);
    });

    const avgGain = results.reduce((sum, r) => sum + r.yearGain, 0) / results.length;
    console.log(`📈 平均涨幅: ${avgGain > 0 ? '+' : ''}${avgGain.toFixed(2)}%`);

    console.log('\n🔥 详细投资建议:\n');

    results.forEach((result, index) => {
        const recoEmoji = {
            '强烈买入': '🚀',
            '买入': '✅',
            '持有': '⏳',
            '观望': '👀',
            '卖出': '❌'
        }[result.recommendation] || '❓';

        console.log(`${index + 1}. ${recoEmoji} ${result.name}(${result.symbol})`);
        console.log(`   板块: ${result.sector}`);
        console.log(`   2025年涨幅: ${result.yearGain > 0 ? '+' : ''}${result.yearGain.toFixed(2)}%`);
        console.log(`   风险等级: ${result.risk === '高' ? '🔴' : result.risk === '中' ? '🟡' : '🟢'} ${result.risk}`);
        console.log(`   建议理由: ${result.reason}`);
        console.log('');
    });

    console.log('═'.repeat(100));
    console.log('💡 投资建议说明:');
    console.log('🚀 强烈买入: 年度涨幅超过100%，AI板块强势表现，建议积极布局');
    console.log('✅ 买入: 年度涨幅超过50%，AI板块机会显现，可适量配置');
    console.log('⏳ 持有: 年度正增长，可适度关注，等待更好时机');
    console.log('👀 观望: 年度负增长，建议观望，控制风险');
    console.log('❌ 卖出: 技术指标疲弱，建议回避或减仓');
    console.log('');
    console.log('⚠️ 风险提示: AI板块波动较大，请根据个人风险承受能力和投资经验谨慎决策。');
    console.log('📊 数据来源: 东方财富AI应用板块，基于2025年涨幅数据。');

    if (failed.length > 0) {
        console.log(`\n⚠️ 分析失败的股票: ${failed.map(f => f.name).join(', ')}`);
    }
}

// 直接运行
main().catch(console.error);</content>
<parameter name="filePath">/Users/kckylechen/Desktop/Stock Tracker/stock-tracker/server/analyze_ai_sector.js