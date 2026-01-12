/**
 * 热门股票排行榜组件 - 基于Gauge评分
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";

interface TopStocksPanelProps {
  onSelectStock?: (code: string) => void;
}

type SortBy = 'score' | 'change' | 'volume';

export function TopStocksPanel({ onSelectStock }: TopStocksPanelProps) {
  const [sortBy, setSortBy] = useState<SortBy>('score');

  const { data: topStocks, isLoading } = trpc.stocks.getTopStocks.useQuery(
    { limit: 10, sortBy },
    { refetchInterval: 60000, staleTime: 30000 }
  );

  const getSignalColor = (signal: string) => {
    switch (signal) {
      case 'Strong Buy':
        return 'text-green-500';
      case 'Buy':
        return 'text-green-400';
      case 'Neutral':
        return 'text-gray-400';
      case 'Sell':
        return 'text-red-400';
      case 'Strong Sell':
        return 'text-red-500';
      default:
        return 'text-gray-400';
    }
  };

  const getScoreColor = (score: number) => {
    if (score > 60) return 'text-green-500';
    if (score > 30) return 'text-green-400';
    if (score >= -30) return 'text-gray-400';
    if (score >= -60) return 'text-red-400';
    return 'text-red-500';
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* 排序选项卡 */}
      <div className="flex border-b border-border bg-card/30">
        <button
          onClick={() => setSortBy('score')}
          className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors relative ${sortBy === 'score'
              ? 'text-foreground'
              : 'text-muted-foreground hover:text-foreground'
            }`}
        >
          评分排行
          {sortBy === 'score' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
          )}
        </button>
        <button
          onClick={() => setSortBy('change')}
          className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors relative ${sortBy === 'change'
              ? 'text-foreground'
              : 'text-muted-foreground hover:text-foreground'
            }`}
        >
          涨跌排行
          {sortBy === 'change' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
          )}
        </button>
        <button
          onClick={() => setSortBy('volume')}
          className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors relative ${sortBy === 'volume'
              ? 'text-foreground'
              : 'text-muted-foreground hover:text-foreground'
            }`}
        >
          成交排行
          {sortBy === 'volume' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
          )}
        </button>
      </div>

      {/* 股票列表 */}
      <div className="flex-1 overflow-auto p-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : topStocks && topStocks.length > 0 ? (
          <div className="space-y-1.5">
            {topStocks.map((stock, index) => (
              <div
                key={stock.code}
                onClick={() => onSelectStock?.(stock.code)}
                className="p-2.5 rounded-xl bg-gradient-to-br from-card/80 to-card/40 border border-border/40 hover:border-border/60 transition-all duration-200 cursor-pointer"
              >
                {/* 排名和股票名称 */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold w-5 h-5 flex items-center justify-center rounded ${index < 3
                        ? 'bg-primary/20 text-primary'
                        : 'bg-muted/30 text-muted-foreground'
                      }`}>
                      {index + 1}
                    </span>
                    <div>
                      <div className="text-sm font-semibold text-foreground">{stock.name}</div>
                      <div className="text-xs text-muted-foreground">{stock.code}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold tabular-nums">{stock.price.toFixed(2)}</div>
                    <div className={`text-xs font-medium flex items-center gap-0.5 ${stock.changePercent >= 0 ? 'text-red-500' : 'text-green-500'
                      }`}>
                      {stock.changePercent >= 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                    </div>
                  </div>
                </div>

                {/* Gauge评分和信号 */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Activity className="h-3 w-3 text-primary" />
                    <span className="text-muted-foreground">评分</span>
                    <span className={`font-bold tabular-nums ${getScoreColor(stock.gaugeScore)}`}>
                      {stock.gaugeScore.toFixed(1)}
                    </span>
                  </div>
                  <div className={`px-2 py-0.5 rounded font-medium ${getSignalColor(stock.signal)} bg-current/10`}>
                    {stock.signal}
                  </div>
                </div>

                {/* 成交量和换手率 */}
                <div className="flex items-center justify-between text-xs text-muted-foreground mt-1.5 pt-1.5 border-t border-border/30">
                  <span>成交 {(stock.volume / 100000000).toFixed(2)}亿</span>
                  <span>换手 {stock.turnoverRate?.toFixed(2) ?? '0.00'}%</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            <span>暂无数据</span>
          </div>
        )}
      </div>
    </div>
  );
}
