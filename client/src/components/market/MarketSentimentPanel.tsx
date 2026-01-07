/**
 * 市场情绪面板组件
 * 显示涨跌家数、北向资金、恐惧贪婪指数等市场情绪数据
 */

import { trpc } from "@/lib/trpc";

export function MarketSentimentPanel() {
    // 获取市场情绪数据，每30秒刷新
    const { data: sentiment, isLoading } = trpc.market.getSentiment.useQuery(
        undefined,
        { refetchInterval: 30000 }
    );

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center p-3">
                <div className="text-center text-muted-foreground">
                    <div className="text-xl mb-2 animate-pulse">📊</div>
                    <p className="text-xs">加载中...</p>
                </div>
            </div>
        );
    }

    if (!sentiment) {
        return (
            <div className="flex-1 flex items-center justify-center p-3">
                <div className="text-center text-muted-foreground">
                    <div className="text-xl mb-2">⚠️</div>
                    <p className="text-xs">数据获取失败</p>
                </div>
            </div>
        );
    }

    const { marketBreadth, northboundFlow, marketTemperature, fearGreedIndex } = sentiment;

    // 恐惧贪婪指数的颜色
    const getFearGreedColor = (value: number) => {
        if (value <= 25) return '#2ecc71'; // 极度恐惧 - 绿色（买入机会）
        if (value <= 45) return '#27ae60'; // 恐惧
        if (value <= 55) return '#f39c12'; // 中性
        if (value <= 75) return '#e67e22'; // 贪婪
        return '#e74c3c'; // 极度贪婪 - 红色（风险）
    };

    return (
        <div className="flex-1 overflow-auto p-2">
            <div className="space-y-2 text-xs">
                {/* 恐惧贪婪指数 */}
                <div className="p-2 rounded bg-card/50 border border-border/30">
                    <div className="text-muted-foreground mb-1">恐惧贪婪指数</div>
                    <div className="flex items-baseline gap-2">
                        <span
                            className="font-bold text-xl"
                            style={{ color: getFearGreedColor(fearGreedIndex.value) }}
                        >
                            {fearGreedIndex.value}
                        </span>
                        <span
                            className="text-xs"
                            style={{ color: getFearGreedColor(fearGreedIndex.value) }}
                        >
                            {fearGreedIndex.label}
                        </span>
                    </div>
                    <div className="w-full h-1.5 bg-gradient-to-r from-[#2ecc71] via-[#f39c12] to-[#e74c3c] rounded-full mt-1.5">
                        <div
                            className="h-full relative"
                            style={{ width: `${fearGreedIndex.value}%` }}
                        >
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full shadow"></div>
                        </div>
                    </div>
                </div>

                {/* 市场温度 */}
                <div className="p-2 rounded bg-card/50 border border-border/30">
                    <div className="text-muted-foreground mb-1">市场温度</div>
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">{marketTemperature.emoji}</span>
                        <div>
                            <div
                                className="font-semibold"
                                style={{
                                    color: marketTemperature.level === 'hot' || marketTemperature.level === 'warm'
                                        ? '#e74c3c'
                                        : marketTemperature.level === 'cold' || marketTemperature.level === 'cool'
                                            ? '#3498db'
                                            : '#f39c12'
                                }}
                            >
                                {marketTemperature.label}
                            </div>
                            {marketTemperature.change !== 0 && (
                                <div className="text-muted-foreground text-xs">
                                    较昨日 {marketTemperature.change > 0 ? '+' : ''}{marketTemperature.change}°
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 涨跌比 */}
                <div className="p-2 rounded bg-card/50 border border-border/30">
                    <div className="text-muted-foreground mb-1">今日涨跌</div>
                    <div className="flex justify-between items-center">
                        <div className="text-center">
                            <div className="text-[#e74c3c] font-semibold">{marketBreadth.riseCount}</div>
                            <div className="text-muted-foreground text-xs">上涨</div>
                        </div>
                        <div className="text-muted-foreground">:</div>
                        <div className="text-center">
                            <div className="text-[#2ecc71] font-semibold">{marketBreadth.fallCount}</div>
                            <div className="text-muted-foreground text-xs">下跌</div>
                        </div>
                    </div>
                    <div className="flex h-1.5 mt-1.5 rounded-full overflow-hidden">
                        <div
                            className="bg-[#e74c3c]"
                            style={{ flex: marketBreadth.riseRatio }}
                        ></div>
                        <div
                            className="bg-[#2ecc71]"
                            style={{ flex: 100 - marketBreadth.riseRatio }}
                        ></div>
                    </div>
                </div>

                {/* 北向资金 */}
                <div className="p-2 rounded bg-card/50 border border-border/30">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">北向资金</span>
                        <span
                            className={northboundFlow.netFlow >= 0 ? 'text-[#e74c3c]' : 'text-[#2ecc71]'}
                        >
                            {northboundFlow.netFlowFormatted}
                        </span>
                    </div>
                    {/* 可以添加更多资金数据 */}
                    <div className="flex justify-between mt-1 text-muted-foreground">
                        <span>更新时间</span>
                        <span>{northboundFlow.lastUpdateTime || '--'}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
