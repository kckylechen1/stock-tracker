/**
 * 分析紫金矿业的启动特征
 * 为什么信号系统没有识别到启动日？
 */

import * as akshare from "./akshare";

interface KlineData {
  date: string;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
}

/**
 * 分析单日是否满足启动条件
 */
function checkLaunchConditions(
  day: KlineData,
  prev20Days: KlineData[]
): {
  isBreakout: boolean;
  isHighVolume: boolean;
  isBigUp: boolean;
  passAll: boolean;
} {
  const prev20High = Math.max(...prev20Days.map(k => k.high));
  const prev20AvgVol = prev20Days.reduce((sum, k) => sum + k.volume, 0) / 20;

  const isBreakout = day.close > prev20High * 1.03;
  const isHighVolume = day.volume > prev20AvgVol * 2;
  const isBigUp = day.close > day.open * 1.05;

  return {
    isBreakout,
    isHighVolume,
    isBigUp,
    passAll: isBreakout && isHighVolume && isBigUp,
  };
}

/**
 * 格式化金额
 */
function formatVolume(vol: number): string {
  if (vol >= 100000000) return (vol / 100000000).toFixed(1) + "亿";
  if (vol >= 10000) return (vol / 10000).toFixed(0) + "万";
  return vol.toFixed(0);
}

/**
 * 主函数
 */
async function main() {
  console.log(
    "╔════════════════════════════════════════════════════════════════════════════════╗"
  );
  console.log(
    "║   紫金矿业(601899)启动特征分析                                      ║"
  );
  console.log(
    "║   年度涨幅: +153.54% | 为什么信号系统未检测到？                      ║"
  );
  console.log(
    "╚═════════════════════════════════════════════════════════════════════════╝\n"
  );

  const klines = await akshare.getStockHistory("601899", "daily", 365);
  if (!klines || klines.length < 60) {
    console.log("❌ 数据不足");
    return;
  }

  // 找2025年初的价格
  const yearStart = klines.find(
    k => k.date.startsWith("2025-01") || k.date.startsWith("2025-02")
  );
  const current = klines[klines.length - 1];
  const yearGain =
    ((current.close - yearStart!.close) / yearStart!.close) * 100;

  console.log("📊 基本信息");
  console.log(`   年初价格: ${yearStart!.close.toFixed(2)}元`);
  console.log(`   当前价格: ${current.close.toFixed(2)}元`);
  console.log(`   年度涨幅: +${yearGain.toFixed(2)}%\n`);

  console.log("🔍 搜索满足启动条件的交易日...\n");

  const candidates: Array<{
    date: string;
    price: number;
    changePct: number;
    volume: number;
    conditions: {
      isBreakout: boolean;
      isHighVolume: boolean;
      isBigUp: boolean;
      passAll: boolean;
    };
    prev20High: number;
    prev20AvgVol: number;
  }> = [];

  for (let i = 60; i < klines.length; i++) {
    const day = klines[i];
    const prev20Days = klines.slice(i - 20, i);

    if (prev20Days.length < 20) continue;

    const prev20High = Math.max(...prev20Days.map(k => k.high));
    const prev20AvgVol = prev20Days.reduce((sum, k) => sum + k.volume, 0) / 20;

    const isBreakout = day.close > prev20High * 1.03;
    const isHighVolume = day.volume > prev20AvgVol * 2;
    const isBigUp = day.close > day.open * 1.05;

    const changePct = ((day.close - day.open) / day.open) * 100;

    // 如果至少满足1-2个条件，记录下来
    if (isBreakout || isHighVolume || isBigUp) {
      candidates.push({
        date: day.date,
        price: day.close,
        changePct,
        volume: day.volume,
        conditions: { isBreakout, isHighVolume, isBigUp, passAll: false },
        prev20High,
        prev20AvgVol,
      });
    }

    // 如果满足所有条件
    if (isBreakout && isHighVolume && isBigUp) {
      console.log(`✅ 发现启动日: ${day.date}`);
      console.log(
        `   收盘价: ${day.close.toFixed(2)}元 (涨幅: ${changePct.toFixed(2)}%)`
      );
      console.log(
        `   突破20日高点: ${prev20High.toFixed(2)}元 → ${day.close.toFixed(2)}元 (${((day.close / prev20High - 1) * 100).toFixed(2)}%)`
      );
      console.log(
        `   成交量: ${formatVolume(day.volume)} (${(day.volume / prev20AvgVol).toFixed(1)}x平均)`
      );
      return;
    }
  }

  console.log("❌ 没有发现完全满足启动条件的交易日\n");

  console.log("📋 接近启动条件的交易日（至少满足1-2个条件）：\n");

  // 按日期排序
  candidates.sort((a, b) => a.date.localeCompare(b.date));

  candidates.slice(-10).forEach(c => {
    const conditions = [];
    if (c.conditions.isBreakout) conditions.push("✅ 突破20日高点");
    else conditions.push("❌ 未突破");

    if (c.conditions.isHighVolume) conditions.push("✅ 放量2倍");
    else if (c.volume > c.prev20AvgVol * 1.5) conditions.push("⚠️ 放量1.5倍");
    else conditions.push("❌ 放量不足");

    if (c.conditions.isBigUp) conditions.push("✅ 涨幅>5%");
    else if (c.changePct > 3) conditions.push("⚠️ 涨幅3-5%");
    else conditions.push("❌ 涨幅不足");

    console.log(`${c.date}`);
    console.log(
      `   价格: ${c.price.toFixed(2)}元 (日涨幅: ${c.changePct > 0 ? "+" : ""}${c.changePct.toFixed(2)}%)`
    );
    console.log(`   ${conditions.join(" | ")}`);
    console.log("");
  });

  console.log(
    "═════════════════════════════════════════════════════════════════════════\n"
  );

  // 分析紫金矿业的走势特征
  console.log("📈 紫金矿业走势特征分析：\n");

  // 找涨幅最大的几个交易日
  const sortedByGain = [...klines].sort((a, b) => {
    const gainA = ((a.close - a.open) / a.open) * 100;
    const gainB = ((b.close - b.open) / b.open) * 100;
    return gainB - gainA;
  });

  console.log("涨幅最大的5个交易日：");
  sortedByGain.slice(0, 5).forEach((k, idx) => {
    const gain = ((k.close - k.open) / k.open) * 100;
    console.log(
      `  ${idx + 1}. ${k.date}: ${gain.toFixed(2)}% (${k.open.toFixed(2)} → ${k.close.toFixed(2)})`
    );
  });

  console.log("\n成交量最大的5个交易日：");
  const sortedByVol = [...klines].sort((a, b) => b.volume - a.volume);
  sortedByVol.slice(0, 5).forEach((k, idx) => {
    const gain = ((k.close - k.open) / k.open) * 100;
    console.log(
      `  ${idx + 1}. ${k.date}: ${formatVolume(k.volume)} (涨幅: ${gain.toFixed(2)}%)`
    );
  });

  console.log("\n💡 结论：\n");
  console.log('紫金矿业可能是"缓慢上涨型"股票，没有明显的"突破日"。');
  console.log("需要调整启动日检测规则，增加以下选项：");
  console.log("  1. 降低突破阈值（3% → 2%）");
  console.log("  2. 降低成交量要求（2倍 → 1.5倍）");
  console.log("  3. 增加连续多日上涨的检测");
  console.log("  4. 针对资源股添加特殊规则\n");
}

main().catch(console.error);
