/**
 * 测试市场宽度数据获取的准确性
 * 直接调用相关函数查看实际返回值
 */

import { getComprehensiveMarketBreadth } from "./akshare";

async function testMarketBreadth() {
  console.log("=== 开始测试市场宽度数据获取 ===");
  console.log("");

  console.log("1. 测试 getComprehensiveMarketBreadth()...");
  const breadth = await getComprehensiveMarketBreadth();

  console.log("");
  console.log("2. 返回数据:");
  console.log(JSON.stringify(breadth, null, 2));
  console.log("");

  console.log("3. 数据验证:");
  console.log(`   上涨家数: ${breadth.riseCount}`);
  console.log(`   下跌家数: ${breadth.fallCount}`);
  console.log(`   平盘家数: ${breadth.flatCount}`);
  console.log(`   总股票数: ${breadth.totalCount}`);
  console.log(`   上涨比例: ${breadth.riseRatio}%`);
  console.log("");
  console.log("4. 数据合理性检查:");
  console.log(
    `   总数 = 上涨+下跌+平盘: ${breadth.riseCount + breadth.fallCount + breadth.flatCount}`
  );
  console.log(
    `   是否一致: ${breadth.riseCount + breadth.fallCount + breadth.flatCount === breadth.totalCount ? "✅ 是" : "❌ 否"}`
  );
  console.log(
    `   上涨比例是否合理: ${breadth.riseRatio > 0 && breadth.riseRatio < 100 ? "✅ 是" : "❌ 否"}`
  );
}

testMarketBreadth()
  .then(() => {
    console.log("");
    console.log("=== 测试完成 ===");
    process.exit(0);
  })
  .catch(error => {
    console.error("测试失败:", error);
    process.exit(1);
  });
