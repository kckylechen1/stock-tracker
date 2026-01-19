export interface StockNewsPanelProps {
  selectedStock: string | null;
}

export function StockNewsPanel({ selectedStock }: StockNewsPanelProps) {
  return (
    <div className="flex-[35] min-h-[180px] border-t border-border flex flex-col bg-card/20">
      <div className="h-10 border-b border-border flex items-center gap-1 px-4 bg-card/50">
        <button className="px-4 py-1.5 text-sm font-medium rounded-md bg-primary/10 text-primary border-b-2 border-primary">
          📰 新闻资讯
        </button>
        <button className="px-4 py-1.5 text-sm font-medium rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
          📈 趋势分析
        </button>
        <button className="px-4 py-1.5 text-sm font-medium rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
          💡 情绪指标
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {selectedStock ? (
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-card/50 border border-border/50 hover:bg-accent/30 cursor-pointer transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground line-clamp-2">
                    新闻资讯功能即将上线...
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    实时获取股票相关新闻、公告和研报
                  </p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  即将推出
                </span>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-card/50 border border-border/50 hover:bg-accent/30 cursor-pointer transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground line-clamp-2">
                    趋势分析功能即将上线...
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    技术指标、形态识别和趋势预测
                  </p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  即将推出
                </span>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-card/50 border border-border/50 hover:bg-accent/30 cursor-pointer transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground line-clamp-2">
                    情绪分析功能即将上线...
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    市场情绪、资金流向和舆情监控
                  </p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  即将推出
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-muted-foreground">
              请先选择股票查看相关资讯
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
