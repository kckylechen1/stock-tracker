/**
 * 获取2025年涨幅最大的30只股票（市值>200亿）
 * 用于验证牛股信号系统的准确性
 */

import * as akshare from "./akshare";

interface StockWithYearGain {
  symbol: string;
  name: string;
  marketCap: number;
  yearStartPrice: number;
  currentPrice: number;
  yearGain: number;
}

/**
 * 获取2025年1月1日（或第一个交易日）的收盘价
 */
async function getYearStartPrice(symbol: string): Promise<number> {
  try {
    const history = await akshare.getStockHistory(symbol, "daily", 365);
    if (!history || history.length === 0) return 0;

    // 找2025年第一个交易日（大概是2025-01-02）
    const yearStart = history.find(
      k => k.date.startsWith("2025-01") || k.date.startsWith("2025-02")
    );

    return yearStart?.close || 0;
  } catch {
    return 0;
  }
}

/**
 * 获取2025年涨幅最大的30只股票（市值>200亿）
 */
async function getTopGainers(): Promise<StockWithYearGain[]> {
  console.log("📊 获取股票数据...\n");

  // 获取所有A股实时行情
  const allSpots = await akshare.getStockSpotAll();
  console.log(`✅ 获取到 ${allSpots.length} 只股票\n`);

  // 筛选市值>200亿的股票
  const largeCaps = allSpots.filter(s => {
    const marketCap = parseFloat(s["总市值"] || 0);
    return marketCap >= 200000000000; // 200亿
  });

  console.log(`✅ 筛选出 ${largeCaps.length} 只市值>200亿的股票\n`);

  const results: StockWithYearGain[] = [];

  for (let i = 0; i < largeCaps.length; i++) {
    const stock = largeCaps[i];
    const symbol = stock["代码"];
    const name = stock["名称"];
    const marketCap = parseFloat(stock["总市值"] || 0);
    const currentPrice = parseFloat(stock["最新价"] || 0);

    if (currentPrice <= 0) continue;

    // 获取年初价格
    const yearStartPrice = await getYearStartPrice(symbol);
    if (yearStartPrice <= 0) continue;

    // 计算年度涨幅
    const yearGain = ((currentPrice - yearStartPrice) / yearStartPrice) * 100;

    results.push({
      symbol,
      name,
      marketCap,
      yearStartPrice,
      currentPrice,
      yearGain,
    });

    // 显示进度
    if ((i + 1) % 50 === 0) {
      console.log(`进度: ${i + 1}/${largeCaps.length}...`);
    }

    // 避免请求过快
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  // 按涨幅降序排序
  results.sort((a, b) => b.yearGain - a.yearGain);

  // 取前30只
  const top30 = results.slice(0, 30);

  return top30;
}

/**
 * 格式化市值
 */
function formatMarketCap(cap: number): string {
  if (cap >= 100000000000) {
    return (cap / 100000000000).toFixed(1) + "千亿";
  }
  return (cap / 100000000).toFixed(1) + "亿";
}

/**
 * 主函数
 */
async function main() {
  console.log(
    "╔════════════════════════════════════════════════════════════════════════════════╗"
  );
  console.log(
    "║   2025年涨幅最大的30只股票（市值>200亿）                               ║"
  );
  console.log(
    "╚═══════════════════════════════════════════════════════════════════════════╝\n"
  );

  const top30 = await getTopGainers();

  console.log(
    "\n═══════════════════════════════════════════════════════════════════════════"
  );
  console.log("📈 2025年涨幅TOP30（市值>200亿）\n");

  top30.forEach((stock, idx) => {
    console.log(
      `${(idx + 1).toString().padStart(2)}. ${stock.name}(${stock.symbol})`
    );
    console.log(`   市值: ${formatMarketCap(stock.marketCap)}`);
    console.log(`   年初价格: ${stock.yearStartPrice.toFixed(2)}元`);
    console.log(`   当前价格: ${stock.currentPrice.toFixed(2)}元`);
    console.log(
      `   年度涨幅: ${stock.yearGain > 0 ? "+" : ""}${stock.yearGain.toFixed(2)}%\n`
    );
  });

  console.log(
    "═══════════════════════════════════════════════════════════════════════════\n"
  );

  // 生成用于回测的股票列表
  console.log("📋 用于回测的股票列表（复制到回测脚本）:\n");
  console.log("const testCases = [");
  top30.forEach(stock => {
    console.log(`    {`);
    console.log(`        symbol: '${stock.symbol}',`);
    console.log(`        name: '${stock.name}',`);
    console.log(`        yearGain: ${stock.yearGain.toFixed(2)},`);
    console.log(`        marketCap: ${stock.marketCap},`);
    console.log(`    },`);
  });
  console.log("];\n");

  // 统计信息
  const avgGain = top30.reduce((sum, s) => sum + s.yearGain, 0) / top30.length;
  const maxGain = Math.max(...top30.map(s => s.yearGain));
  const minGain = Math.min(...top30.map(s => s.yearGain));

  console.log("📊 统计信息");
  console.log(`   平均涨幅: ${avgGain.toFixed(2)}%`);
  console.log(`   最高涨幅: ${maxGain.toFixed(2)}%`);
  console.log(`   最低涨幅: ${minGain.toFixed(2)}%`);
  console.log(`   总市值: ${top30.reduce((sum, s) => sum + s.marketCap, 0)}\n`);
}

main().catch(console.error);
