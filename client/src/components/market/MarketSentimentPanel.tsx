/**
 * 市场情绪面板组件 - 带标签切换
 * Tab 1：市场情绪（恐惧贪婪指数、市场温度、涨跌比）
 * Tab 2：个股技术评分 Gauge
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { GaugeDashboard } from "@/components/stock/GaugeDashboard";

interface MarketSentimentPanelProps {
  selectedStock?: string;
}

type TabType = "sentiment" | "technical";

export function MarketSentimentPanel({
  selectedStock,
}: MarketSentimentPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>("sentiment");

  // 获取市场情绪数据
  const { data: sentiment, isLoading } = trpc.market.getSentiment.useQuery(
    undefined,
    { refetchInterval: 30000 }
  );

  // 获取个股 Gauge 评分
  const { data: gaugeScore, isLoading: gaugeLoading } =
    trpc.stocks.getGaugeScore.useQuery(
      { code: selectedStock! },
      {
        enabled: !!selectedStock,
        staleTime: 60000,
      }
    );

  const { marketBreadth, marketTemperature, fearGreedIndex } = sentiment || {};

  const getFearGreedColor = (value: number) => {
    if (value <= 25) return "#22c55e";
    if (value <= 45) return "#4ade80";
    if (value <= 55) return "#f59e0b";
    if (value <= 75) return "#f97316";
    return "#ef4444";
  };

  // Helper function to safely access nested properties
  const safeValue = (obj: any, path: string, defaultValue: any = 0) => {
    return obj && obj[path] !== undefined ? obj[path] : defaultValue;
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Tab 标签栏 */}
      <div className="flex border-b border-border bg-card/30">
        <button
          onClick={() => setActiveTab("sentiment")}
          className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors relative ${
            activeTab === "sentiment"
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          市场情绪
          {activeTab === "sentiment" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("technical")}
          className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors relative ${
            activeTab === "technical"
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          个股技术
          {activeTab === "technical" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
          )}
        </button>
      </div>

      {/* Tab 内容区 */}
      <div className="flex-1 overflow-auto p-2">
        {activeTab === "sentiment" ? (
          /* 市场情绪内容 */
          <div className="space-y-1.5 text-xs">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            ) : sentiment ? (
              <>
                {/* 恐惧贪婪指数 - 增强视觉层次 */}
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-card/80 to-card/40 border border-border/40 hover:border-border/60 transition-all duration-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-muted-foreground text-xs font-medium">
                      恐惧贪婪指数
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span
                        className="font-bold text-lg tabular-nums"
                        style={{
                          color: getFearGreedColor(
                            safeValue(fearGreedIndex, "value", 50)
                          ),
                        }}
                      >
                        {safeValue(fearGreedIndex, "value", 50)}
                      </span>
                      <span
                        className="text-xs font-semibold px-1.5 py-0.5 rounded"
                        style={{
                          color: getFearGreedColor(
                            safeValue(fearGreedIndex, "value", 50)
                          ),
                          backgroundColor: `${getFearGreedColor(safeValue(fearGreedIndex, "value", 50))}15`,
                        }}
                      >
                        {safeValue(fearGreedIndex, "label", "中性")}
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-gradient-to-r from-[#22c55e] via-[#f59e0b] to-[#ef4444] rounded-full shadow-inner">
                    <div
                      className="h-full relative transition-all duration-300"
                      style={{
                        width: `${safeValue(fearGreedIndex, "value", 50)}%`,
                      }}
                    >
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg border-2 border-gray-300" />
                    </div>
                  </div>
                </div>

                {/* 市场温度 - 更紧凑的设计 */}
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-card/80 to-card/40 border border-border/40 hover:border-border/60 transition-all duration-200 flex items-center justify-between">
                  <span className="text-muted-foreground text-xs font-medium">
                    市场温度
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-base">
                      {safeValue(marketTemperature, "emoji", "😐")}
                    </span>
                    <span
                      className="text-sm font-bold px-2 py-0.5 rounded"
                      style={{
                        color:
                          safeValue(marketTemperature, "level") === "hot" ||
                          safeValue(marketTemperature, "level") === "warm"
                            ? "#ef4444"
                            : safeValue(marketTemperature, "level") ===
                                  "cold" ||
                                safeValue(marketTemperature, "level") === "cool"
                              ? "#3b82f6"
                              : "#f59e0b",
                        backgroundColor:
                          safeValue(marketTemperature, "level") === "hot" ||
                          safeValue(marketTemperature, "level") === "warm"
                            ? "#ef444415"
                            : safeValue(marketTemperature, "level") ===
                                  "cold" ||
                                safeValue(marketTemperature, "level") === "cool"
                              ? "#3b82f615"
                              : "#f59e0b15",
                      }}
                    >
                      {safeValue(marketTemperature, "label", "未知")}
                    </span>
                  </div>
                </div>

                {/* 涨跌比 - 更清晰的数据展示 */}
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-card/80 to-card/40 border border-border/40 hover:border-border/60 transition-all duration-200">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-muted-foreground text-xs font-medium">
                      今日涨跌
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#ef4444] font-bold text-xs tabular-nums">
                        {safeValue(marketBreadth, "riseCount", 0)}
                      </span>
                      <span className="text-muted-foreground text-xs">:</span>
                      <span className="text-[#22c55e] font-bold text-xs tabular-nums">
                        {safeValue(marketBreadth, "fallCount", 0)}
                      </span>
                    </div>
                  </div>
                  <div className="flex h-1.5 rounded-full overflow-hidden mb-2.5 shadow-inner bg-muted/30">
                    <div
                      className="bg-gradient-to-r from-[#ef4444] to-[#f87171] transition-all duration-300"
                      style={{
                        flex: safeValue(marketBreadth, "riseRatio", 50),
                      }}
                    />
                    <div
                      className="bg-gradient-to-r from-[#4ade80] to-[#22c55e] transition-all duration-300"
                      style={{
                        flex: 100 - safeValue(marketBreadth, "riseRatio", 50),
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#ef4444]/80 font-medium">
                      涨停 {safeValue(marketBreadth, "limitUpCount", 0)}
                    </span>
                    <span className="text-[#22c55e]/80 font-medium">
                      跌停 {safeValue(marketBreadth, "limitDownCount", 0)}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <span>⚠️ 数据获取失败</span>
              </div>
            )}
          </div>
        ) : (
          /* 个股技术评分内容 */
          <div>
            {selectedStock ? (
              <div className="rounded-xl bg-card/60 border border-border/40 overflow-hidden">
                <div className="px-4 py-2.5 border-b border-border/30 bg-card/30">
                  <span className="text-base font-bold text-foreground tracking-tight">
                    {selectedStock}
                  </span>
                </div>
                <GaugeDashboard
                  data={gaugeScore ?? null}
                  loading={gaugeLoading}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <div className="w-12 h-12 rounded-full bg-muted/30 flex items-center justify-center mb-3">
                  <svg
                    className="w-6 h-6 opacity-40"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path
                      d="M3 3v18h18"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M7 12l4-4 4 4 5-5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <span className="text-sm">选择股票查看技术评分</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
