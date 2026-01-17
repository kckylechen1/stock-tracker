/**
 * 热门股票排行榜组件 - 支持股吧人气排名、主力资金流排名
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { TrendingUp, TrendingDown, Flame, DollarSign } from "lucide-react";

interface TopStocksPanelProps {
  onSelectStock?: (code: string) => void;
}

type TabType = "hotRank" | "fundFlow";
type FundFlowPeriod = "today" | "3day" | "5day" | "10day";

interface FundStockItem {
  code: string;
  name: string;
  mainNetInflow: number;
  changePercent: number;
}

export function TopStocksPanel({ onSelectStock }: TopStocksPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>("hotRank");
  const [fundFlowPeriod, setFundFlowPeriod] = useState<FundFlowPeriod>("today");

  // 股吧人气排名
  const { data: hotRankList, isLoading: hotRankLoading } =
    trpc.market.getHotRankList.useQuery(
      { limit: 15 },
      {
        enabled: activeTab === "hotRank",
        refetchInterval: 60000,
        staleTime: 30000,
      }
    );

  // 主力资金流排名
  const { data: fundFlowList, isLoading: fundFlowLoading } =
    trpc.market.getFundFlowRank.useQuery(
      { type: fundFlowPeriod, limit: 15 },
      {
        enabled: activeTab === "fundFlow",
        refetchInterval: 60000,
        staleTime: 30000,
      }
    );

  // 格式化资金金额
  const formatAmount = (value: number) => {
    if (value === null || value === undefined) return "--";
    const absValue = Math.abs(value);
    const sign = value >= 0 ? "+" : "-";
    if (absValue >= 100000000) {
      return `${sign}${(absValue / 100000000).toFixed(2)}亿`;
    } else if (absValue >= 10000) {
      return `${sign}${(absValue / 10000).toFixed(2)}万`;
    }
    return `${sign}${absValue.toFixed(0)}`;
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* 主标签切换 */}
      <div className="flex border-b border-border bg-card/30">
        <button
          onClick={() => setActiveTab("hotRank")}
          className={`flex-1 px-3 py-2 text-xs font-medium transition-colors relative flex items-center justify-center gap-1 ${
            activeTab === "hotRank"
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Flame className="h-3 w-3" />
          股吧人气
          {activeTab === "hotRank" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("fundFlow")}
          className={`flex-1 px-3 py-2 text-xs font-medium transition-colors relative flex items-center justify-center gap-1 ${
            activeTab === "fundFlow"
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <DollarSign className="h-3 w-3" />
          主力资金
          {activeTab === "fundFlow" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500" />
          )}
        </button>
      </div>

      {/* 资金流时间周期选择 */}
      {activeTab === "fundFlow" && (
        <div className="flex border-b border-border/50 bg-card/20">
          {(["today", "3day", "5day", "10day"] as FundFlowPeriod[]).map(
            period => (
              <button
                key={period}
                onClick={() => setFundFlowPeriod(period)}
                className={`flex-1 px-2 py-1.5 text-[10px] font-medium transition-colors ${
                  fundFlowPeriod === period
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {period === "today"
                  ? "今日"
                  : period === "3day"
                    ? "3日"
                    : period === "5day"
                      ? "5日"
                      : "10日"}
              </button>
            )
          )}
        </div>
      )}

      {/* 列表内容 */}
      <div className="flex-1 overflow-auto">
        {/* 股吧人气排名 */}
        {activeTab === "hotRank" && (
          <>
            {hotRankLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-5 h-5 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
              </div>
            ) : hotRankList && hotRankList.length > 0 ? (
              <div className="divide-y divide-border/30">
                {hotRankList.map((stock, index) => (
                  <div
                    key={stock.code}
                    onClick={() => onSelectStock?.(stock.code)}
                    className="px-2 py-2 hover:bg-accent/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      {/* 排名 */}
                      <span
                        className={`text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded ${
                          index < 3
                            ? "bg-orange-500/20 text-orange-400"
                            : "bg-muted/30 text-muted-foreground"
                        }`}
                      >
                        {index + 1}
                      </span>

                      {/* 股票名称和代码 */}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-foreground truncate">
                          {stock.name}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {stock.code}
                        </div>
                      </div>

                      {/* 人气变化 */}
                      <div className="text-right">
                        <div
                          className={`text-xs font-medium ${
                            stock.changePercent >= 0
                              ? "text-red-500"
                              : "text-green-500"
                          }`}
                        >
                          {stock.changePercent >= 0 ? "+" : ""}
                          {stock.changePercent?.toFixed(2)}%
                        </div>
                        <div
                          className={`text-[10px] flex items-center justify-end gap-0.5 ${
                            (stock.hotChange ?? 0) > 0
                              ? "text-green-400"
                              : (stock.hotChange ?? 0) < 0
                                ? "text-red-400"
                                : "text-muted-foreground"
                          }`}
                        >
                          {(stock.hotChange ?? 0) > 0 ? (
                            <>
                              <TrendingUp className="h-2.5 w-2.5" />↑
                              {stock.hotChange}
                            </>
                          ) : (stock.hotChange ?? 0) < 0 ? (
                            <>
                              <TrendingDown className="h-2.5 w-2.5" />↓
                              {Math.abs(stock.hotChange ?? 0)}
                            </>
                          ) : (
                            "→"
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-muted-foreground">
                暂无数据
              </div>
            )}
          </>
        )}

        {/* 主力资金流排名 */}
        {activeTab === "fundFlow" && (
          <>
            {fundFlowLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-5 h-5 border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin" />
              </div>
            ) : fundFlowList && fundFlowList.length > 0 ? (
              <div className="divide-y divide-border/30">
                {fundFlowList.map((stock: FundStockItem, index: number) => (
                  <div
                    key={stock.code}
                    onClick={() => onSelectStock?.(stock.code)}
                    className="px-2 py-2 hover:bg-accent/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      {/* 排名 */}
                      <span
                        className={`text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded ${
                          index < 3
                            ? "bg-green-500/20 text-green-400"
                            : "bg-muted/30 text-muted-foreground"
                        }`}
                      >
                        {index + 1}
                      </span>

                      {/* 股票名称和代码 */}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-foreground truncate">
                          {stock.name}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {stock.code}
                        </div>
                      </div>

                      {/* 主力净流入 */}
                      <div className="text-right">
                        <div
                          className={`text-xs font-bold tabular-nums ${
                            stock.mainNetInflow >= 0
                              ? "text-red-500"
                              : "text-green-500"
                          }`}
                        >
                          {formatAmount(stock.mainNetInflow)}
                        </div>
                        <div
                          className={`text-[10px] tabular-nums ${
                            stock.changePercent >= 0
                              ? "text-red-400"
                              : "text-green-400"
                          }`}
                        >
                          {stock.changePercent >= 0 ? "+" : ""}
                          {stock.changePercent?.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-muted-foreground">
                暂无数据
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
