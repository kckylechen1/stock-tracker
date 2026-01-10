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

type TabType = 'sentiment' | 'technical';

export function MarketSentimentPanel({ selectedStock }: MarketSentimentPanelProps) {
    const [activeTab, setActiveTab] = useState<TabType>('sentiment');

    // 获取市场情绪数据
    const { data: sentiment, isLoading } = trpc.market.getSentiment.useQuery(
        undefined,
        { refetchInterval: 30000 }
    );

    // 获取个股 Gauge 评分
    const { data: gaugeScore, isLoading: gaugeLoading } = trpc.stocks.getGaugeScore.useQuery(
        { code: selectedStock! },
        {
            enabled: !!selectedStock,
            staleTime: 60000
        }
    );

    const { marketBreadth, marketTemperature, fearGreedIndex } = sentiment || {};

    const getFearGreedColor = (value: number) => {
        if (value <= 25) return '#22c55e';
        if (value <= 45) return '#4ade80';
        if (value <= 55) return '#f59e0b';
        if (value <= 75) return '#f97316';
        return '#ef4444';
    };

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            {/* Tab 标签栏 */}
            <div className="flex border-b border-border bg-card/30">
                <button
                    onClick={() => setActiveTab('sentiment')}
                    className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors relative ${
                        activeTab === 'sentiment'
                            ? 'text-foreground'
                            : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                    市场情绪
                    {activeTab === 'sentiment' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('technical')}
                    className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors relative ${
                        activeTab === 'technical'
                            ? 'text-foreground'
                            : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                    个股技术
                    {activeTab === 'technical' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                    )}
                </button>
            </div>

            {/* Tab 内容区 */}
            <div className="flex-1 overflow-auto p-3">
                {activeTab === 'sentiment' ? (
                    /* 市场情绪内容 */
                    <div className="space-y-2 text-xs">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                            </div>
                        ) : sentiment ? (
                            <>
                                {/* 恐惧贪婪指数 */}
                                <div className="px-3 py-2 rounded-lg bg-card/50 border border-border/30">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-muted-foreground">恐惧贪婪</span>
                                        <div className="flex items-baseline gap-1.5">
                                            <span
                                                className="font-bold text-lg tabular-nums"
                                                style={{ color: getFearGreedColor(fearGreedIndex!.value) }}
                                            >
                                                {fearGreedIndex!.value}
                                            </span>
                                            <span
                                                className="text-xs font-medium"
                                                style={{ color: getFearGreedColor(fearGreedIndex!.value) }}
                                            >
                                                {fearGreedIndex!.label}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="w-full h-1.5 bg-gradient-to-r from-[#22c55e] via-[#f59e0b] to-[#ef4444] rounded-full">
                                        <div
                                            className="h-full relative"
                                            style={{ width: `${fearGreedIndex!.value}%` }}
                                        >
                                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full shadow-md border border-gray-200" />
                                        </div>
                                    </div>
                                </div>

                                {/* 市场温度 */}
                                <div className="px-3 py-2 rounded-lg bg-card/50 border border-border/30 flex items-center justify-between">
                                    <span className="text-muted-foreground">市场温度</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">{marketTemperature!.emoji}</span>
                                        <span
                                            className="font-semibold"
                                            style={{
                                                color: marketTemperature!.level === 'hot' || marketTemperature!.level === 'warm'
                                                    ? '#ef4444'
                                                    : marketTemperature!.level === 'cold' || marketTemperature!.level === 'cool'
                                                        ? '#3b82f6'
                                                        : '#f59e0b'
                                            }}
                                        >
                                            {marketTemperature!.label}
                                        </span>
                                    </div>
                                </div>

                                {/* 涨跌比 */}
                                <div className="px-3 py-2 rounded-lg bg-card/50 border border-border/30">
                                    <div className="flex justify-between items-center mb-1.5">
                                        <span className="text-muted-foreground">今日涨跌</span>
                                        <div className="flex items-center gap-2 font-semibold">
                                            <span className="text-[#ef4444]">{marketBreadth!.riseCount}</span>
                                            <span className="text-muted-foreground">:</span>
                                            <span className="text-[#22c55e]">{marketBreadth!.fallCount}</span>
                                        </div>
                                    </div>
                                    <div className="flex h-1.5 rounded-full overflow-hidden">
                                        <div className="bg-[#ef4444]" style={{ flex: marketBreadth!.riseRatio }} />
                                        <div className="bg-[#22c55e]" style={{ flex: 100 - marketBreadth!.riseRatio }} />
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
                                    <span className="text-base font-bold text-foreground tracking-tight">{selectedStock}</span>
                                </div>
                                <GaugeDashboard
                                    data={gaugeScore ?? null}
                                    loading={gaugeLoading}
                                />
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                <div className="w-12 h-12 rounded-full bg-muted/30 flex items-center justify-center mb-3">
                                    <svg className="w-6 h-6 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <path d="M3 3v18h18" strokeLinecap="round" strokeLinejoin="round"/>
                                        <path d="M7 12l4-4 4 4 5-5" strokeLinecap="round" strokeLinejoin="round"/>
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
