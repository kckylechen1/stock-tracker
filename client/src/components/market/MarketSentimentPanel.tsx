/**
 * 市场情绪面板组件
 * 上半：宏观市场情绪（恐惧贪婪指数、市场温度、涨跌比、北向资金）
 * 下半：个股技术评分 Gauge
 */

import { trpc } from "@/lib/trpc";
import { GaugeDashboard } from "@/components/stock/GaugeDashboard";

interface MarketSentimentPanelProps {
    selectedStock?: string; // 当前选中的股票代码
}

export function MarketSentimentPanel({ selectedStock }: MarketSentimentPanelProps) {
    // 获取市场情绪数据，每30秒刷新
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

    const { marketBreadth, northboundFlow, marketTemperature, fearGreedIndex } = sentiment || {};

    // 恐惧贪婪指数的颜色
    const getFearGreedColor = (value: number) => {
        if (value <= 25) return '#2ecc71'; // 极度恐惧 - 绿色（买入机会）
        if (value <= 45) return '#27ae60'; // 恐惧
        if (value <= 55) return '#f39c12'; // 中性
        if (value <= 75) return '#e67e22'; // 贪婪
        return '#e74c3c'; // 极度贪婪 - 红色（风险）
    };

    return (
        <div className="flex-1 overflow-auto p-2 flex flex-col">
            {/* 上半：市场情绪 */}
            <div className="space-y-2 text-xs">
                {isLoading ? (
                    <div className="p-4 text-center text-muted-foreground">
                        <div className="animate-pulse">加载中...</div>
                    </div>
                ) : sentiment ? (
                    <>
                        {/* 恐惧贪婪指数 */}
                        <div className="p-2 rounded bg-card/50 border border-border/30">
                            <div className="text-muted-foreground mb-1">恐惧贪婪指数</div>
                            <div className="flex items-baseline gap-2">
                                <span
                                    className="font-bold text-xl"
                                    style={{ color: getFearGreedColor(fearGreedIndex!.value) }}
                                >
                                    {fearGreedIndex!.value}
                                </span>
                                <span
                                    className="text-xs"
                                    style={{ color: getFearGreedColor(fearGreedIndex!.value) }}
                                >
                                    {fearGreedIndex!.label}
                                </span>
                            </div>
                            <div className="w-full h-1.5 bg-gradient-to-r from-[#2ecc71] via-[#f39c12] to-[#e74c3c] rounded-full mt-1.5">
                                <div
                                    className="h-full relative"
                                    style={{ width: `${fearGreedIndex!.value}%` }}
                                >
                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full shadow"></div>
                                </div>
                            </div>
                        </div>

                        {/* 市场温度 */}
                        <div className="p-2 rounded bg-card/50 border border-border/30">
                            <div className="text-muted-foreground mb-1">市场温度</div>
                            <div className="flex items-center gap-2">
                                <span className="text-2xl">{marketTemperature!.emoji}</span>
                                <div>
                                    <div
                                        className="font-semibold"
                                        style={{
                                            color: marketTemperature!.level === 'hot' || marketTemperature!.level === 'warm'
                                                ? '#e74c3c'
                                                : marketTemperature!.level === 'cold' || marketTemperature!.level === 'cool'
                                                    ? '#3498db'
                                                    : '#f39c12'
                                        }}
                                    >
                                        {marketTemperature!.label}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 涨跌比 */}
                        <div className="p-2 rounded bg-card/50 border border-border/30">
                            <div className="text-muted-foreground mb-1">今日涨跌</div>
                            <div className="flex justify-between items-center">
                                <div className="text-center">
                                    <div className="text-[#e74c3c] font-semibold">{marketBreadth!.riseCount}</div>
                                    <div className="text-muted-foreground text-xs">上涨</div>
                                </div>
                                <div className="text-muted-foreground">:</div>
                                <div className="text-center">
                                    <div className="text-[#2ecc71] font-semibold">{marketBreadth!.fallCount}</div>
                                    <div className="text-muted-foreground text-xs">下跌</div>
                                </div>
                            </div>
                            <div className="flex h-1.5 mt-1.5 rounded-full overflow-hidden">
                                <div
                                    className="bg-[#e74c3c]"
                                    style={{ flex: marketBreadth!.riseRatio }}
                                ></div>
                                <div
                                    className="bg-[#2ecc71]"
                                    style={{ flex: 100 - marketBreadth!.riseRatio }}
                                ></div>
                            </div>
                        </div>

                        {/* 北向资金 */}
                        <div className="p-2 rounded bg-card/50 border border-border/30">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">北向资金</span>
                                <span
                                    className={northboundFlow!.netFlow >= 0 ? 'text-[#e74c3c]' : 'text-[#2ecc71]'}
                                >
                                    {northboundFlow!.netFlowFormatted}
                                </span>
                            </div>
                            <div className="flex justify-between mt-1 text-muted-foreground">
                                <span>更新时间</span>
                                <span>{northboundFlow!.lastUpdateTime || '--'}</span>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="p-4 text-center text-muted-foreground">
                        <div>⚠️ 数据获取失败</div>
                    </div>
                )}
            </div>

            {/* 分隔线 */}
            <div className="my-3 border-t border-border/50"></div>

            {/* 下半：个股技术评分 */}
            <div className="flex-1">
                <div className="text-xs text-muted-foreground mb-2">个股技术评分</div>
                {selectedStock ? (
                    <div className="p-2 rounded bg-card/50 border border-border/30">
                        <div className="text-xs text-muted-foreground mb-1">{selectedStock}</div>
                        <GaugeDashboard
                            data={gaugeScore ?? null}
                            loading={gaugeLoading}
                        />
                    </div>
                ) : (
                    <div className="p-4 text-center text-muted-foreground text-xs">
                        <div>选择股票查看技术评分</div>
                    </div>
                )}
            </div>
        </div>
    );
}

