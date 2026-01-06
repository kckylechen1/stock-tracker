import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Search, Plus, TrendingUp, TrendingDown, Trash2 } from "lucide-react";
import { createChart, CandlestickSeries, LineSeries, CandlestickData, LineData, Time } from "lightweight-charts";
import type { IChartApi } from "lightweight-charts";

export default function Home() {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedStock, setSelectedStock] = useState<string | null>(null);
  
  // 获取观察池列表
  const { data: watchlist, isLoading, refetch } = trpc.watchlist.list.useQuery();
  
  // 搜索股票
  const searchMutation = trpc.stocks.search.useMutation();
  const [searchResults, setSearchResults] = useState<any[]>([]);
  
  // 添加到观察池
  const addMutation = trpc.watchlist.add.useMutation({
    onSuccess: () => {
      refetch();
      setSearchResults([]);
      setSearchKeyword("");
    },
  });
  
  // 删除观察池
  const deleteMutation = trpc.watchlist.remove.useMutation({
    onSuccess: () => {
      refetch();
      if (selectedStock) {
        const stillExists = watchlist?.some(item => item.stockCode === selectedStock);
        if (!stillExists) {
          setSelectedStock(null);
        }
      }
    },
  });
  
  const handleSearch = async () => {
    if (!searchKeyword.trim()) return;
    
    try {
      const results = await searchMutation.mutateAsync({ keyword: searchKeyword });
      setSearchResults(results || []);
    } catch (error) {
      console.error("Search failed:", error);
      setSearchResults([]);
    }
  };
  
  const handleAddToWatchlist = (code: string) => {
    addMutation.mutate({
      stockCode: code,
      source: "manual",
    });
  };
  
  const handleDeleteFromWatchlist = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteMutation.mutate({ id });
  };

  return (
    <div className="flex h-screen bg-background">
      {/* 左侧边栏 - 股票列表 */}
      <div className="w-80 border-r border-border flex flex-col bg-muted/30">
        {/* 搜索栏 */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 bg-background rounded-lg px-3 py-2 shadow-sm">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索股票..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="border-0 bg-transparent p-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
            />
          </div>
          
          {/* 搜索结果 */}
          {searchResults.length > 0 && (
            <div className="mt-2 bg-background rounded-lg shadow-sm border border-border overflow-hidden">
              {searchResults.map((stock: any) => (
                <div
                  key={stock.code}
                  className="flex items-center justify-between p-3 hover:bg-accent cursor-pointer border-b border-border last:border-b-0"
                  onClick={() => handleAddToWatchlist(stock.code)}
                >
                  <div>
                    <div className="font-medium text-sm">{stock.name}</div>
                    <div className="text-xs text-muted-foreground">{stock.code}</div>
                  </div>
                  <Plus className="h-4 w-4 text-muted-foreground" />
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* 股票列表 */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">加载中...</div>
          ) : watchlist && watchlist.length > 0 ? (
            <div>
              {watchlist.map((item) => (
                <StockListItem
                  key={item.id}
                  item={item}
                  isSelected={selectedStock === item.stockCode}
                  onClick={() => setSelectedStock(item.stockCode)}
                  onDelete={(e) => handleDeleteFromWatchlist(item.id, e)}
                />
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-sm text-muted-foreground">观察池为空</p>
              <p className="text-xs text-muted-foreground mt-2">
                使用上方搜索框添加股票
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* 右侧内容区 - 详情页 */}
      <div className="flex-1 overflow-hidden">
        {selectedStock ? (
          <StockDetailPanel stockCode={selectedStock} />
        ) : (
          <div className="h-full flex items-center justify-center bg-muted/10">
            <div className="text-center">
              <p className="text-lg font-medium text-muted-foreground">
                选择一只股票查看详情
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                从左侧列表中点击股票
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// 股票列表项组件
function StockListItem({ 
  item, 
  isSelected, 
  onClick,
  onDelete
}: { 
  item: any; 
  isSelected: boolean;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  // 获取实时行情
  const { data: quote } = trpc.stocks.getDetail.useQuery(
    { code: item.stockCode },
    { refetchInterval: 30000 }
  );
  
  const changePercent = quote?.quote?.changePercent || 0;
  const isPositive = changePercent >= 0;
  const currentPrice = quote?.quote?.price || 0;
  const name = quote?.quote?.name || quote?.stock?.name || "加载中...";
  
  return (
    <div
      className={`
        group p-4 border-b border-border cursor-pointer transition-all
        ${isSelected ? 'bg-accent' : 'hover:bg-accent/50'}
      `}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{item.stockCode}</span>
            <button
              onClick={onDelete}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/10 rounded"
            >
              <Trash2 className="h-3 w-3 text-destructive" />
            </button>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5 truncate">
            {name}
          </div>
        </div>
        
        <div className="text-right ml-4">
          <div className="font-semibold text-sm tabular-nums">
            {currentPrice > 0 ? currentPrice.toFixed(2) : "--"}
          </div>
          <div className={`text-xs flex items-center justify-end gap-1 tabular-nums ${
            isPositive ? 'text-green-600' : 'text-red-600'
          }`}>
            {isPositive ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {isPositive ? '+' : ''}{changePercent.toFixed(2)}%
          </div>
        </div>
      </div>
    </div>
  );
}

// 股票详情面板组件
function StockDetailPanel({ stockCode }: { stockCode: string }) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<any>(null);
  const [chartType, setChartType] = useState<'timeline' | 'day' | 'week' | 'month'>('timeline');
  
  // 获取股票详情
  const { data: detail } = trpc.stocks.getDetail.useQuery(
    { code: stockCode },
    { refetchInterval: 30000 }
  );
  
  // 获取分时数据
  const { data: timelineData } = trpc.stocks.getTimeline.useQuery(
    { code: stockCode },
    { enabled: chartType === 'timeline' }
  );
  
  // 获取K线数据
  const { data: klineData } = trpc.stocks.getKline.useQuery(
    { code: stockCode, period: chartType === 'timeline' ? 'day' : chartType, limit: 60 },
    { enabled: chartType !== 'timeline' }
  );
  
  // 初始化图表
  useEffect(() => {
    if (!chartContainerRef.current) return;
    
    // 清理旧图表
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
      seriesRef.current = null;
    }
    
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: '#ffffff' },
        textColor: '#333',
      },
      grid: {
        vertLines: { color: '#f0f0f0' },
        horzLines: { color: '#f0f0f0' },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: '#e0e0e0',
      },
      timeScale: {
        borderColor: '#e0e0e0',
        timeVisible: true,
      },
      width: chartContainerRef.current.clientWidth,
      height: 350,
    });
    
    // 根据图表类型添加不同的系列
    if (chartType === 'timeline') {
      const lineSeries = chart.addSeries(LineSeries, {
        color: '#2962FF',
        lineWidth: 2,
        priceLineVisible: true,
      });
      seriesRef.current = lineSeries;
    } else {
      const candlestickSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderVisible: false,
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350',
      });
      seriesRef.current = candlestickSeries;
    }
    
    chartRef.current = chart;
    
    // 响应式调整
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [stockCode, chartType]);
  
  // 更新分时数据
  useEffect(() => {
    if (chartType !== 'timeline' || !seriesRef.current || !timelineData?.timeline) return;
    
    const formattedData: LineData<Time>[] = timelineData.timeline.map((item: any) => {
      // 将时间转换为Unix时间戳（秒）
      const timeParts = item.time.split(' ');
      const dateStr = timeParts[0];
      const timeStr = timeParts[1] || '09:30';
      const [year, month, day] = dateStr.split('-').map(Number);
      const [hour, minute] = timeStr.split(':').map(Number);
      const date = new Date(year, month - 1, day, hour, minute);
      const timestamp = Math.floor(date.getTime() / 1000);
      
      return {
        time: timestamp as Time,
        value: item.price,
      };
    });
    
    if (formattedData.length > 0) {
      seriesRef.current.setData(formattedData);
      chartRef.current?.timeScale().fitContent();
    }
  }, [timelineData, chartType]);
  
  // 更新K线数据
  useEffect(() => {
    if (chartType === 'timeline' || !seriesRef.current || !klineData || klineData.length === 0) return;
    
    const formattedData: CandlestickData<Time>[] = klineData.map((item: any) => ({
      time: item.time as Time,
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
    }));
    
    seriesRef.current.setData(formattedData);
    chartRef.current?.timeScale().fitContent();
  }, [klineData, chartType]);
  
  const quote = detail?.quote;
  const changePercent = quote?.changePercent || 0;
  const isPositive = changePercent >= 0;
  
  return (
    <div className="h-full flex flex-col overflow-auto">
      {/* 头部信息 */}
      <div className="p-6 border-b border-border">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{stockCode}</h1>
            <p className="text-muted-foreground">{quote?.name || "加载中..."}</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold tabular-nums">
              {quote?.price ? quote.price.toFixed(2) : "--"}
            </div>
            <div className={`text-lg flex items-center justify-end gap-1 ${
              isPositive ? 'text-green-600' : 'text-red-600'
            }`}>
              {isPositive ? '+' : ''}{quote?.change?.toFixed(2) || "0.00"}
              <span className="ml-2">
                ({isPositive ? '+' : ''}{changePercent.toFixed(2)}%)
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* 周期选择 */}
      <div className="px-6 py-3 border-b border-border flex gap-2">
        {[
          { key: 'timeline', label: '分时' },
          { key: 'day', label: '日K' },
          { key: 'week', label: '周K' },
          { key: 'month', label: '月K' },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setChartType(item.key as 'timeline' | 'day' | 'week' | 'month')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              chartType === item.key
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80 text-muted-foreground'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      
      {/* 图表和基本信息并排 */}
      <div className="flex-1 flex">
        {/* 图表区域 */}
        <div className="flex-1 p-4">
          <div ref={chartContainerRef} className="w-full" />
        </div>
        
        {/* 基本信息 - 右侧 */}
        <div className="w-64 border-l border-border p-4 bg-muted/20">
          <div className="space-y-4">
            <InfoRow label="开盘" value={quote?.open?.toFixed(2)} />
            <InfoRow label="最高" value={quote?.high?.toFixed(2)} />
            <InfoRow label="最低" value={quote?.low?.toFixed(2)} />
            <InfoRow label="昨收" value={quote?.preClose?.toFixed(2)} />
            <div className="border-t border-border my-2" />
            <InfoRow label="成交量" value={formatVolume(quote?.volume)} />
            <InfoRow label="成交额" value={formatAmount(quote?.amount)} />
            <InfoRow label="换手率" value={quote?.turnoverRate ? `${quote.turnoverRate.toFixed(2)}%` : "--"} />
            <div className="border-t border-border my-2" />
            <InfoRow label="市盈率" value={quote?.pe?.toFixed(2)} />
            <InfoRow label="市净率" value={quote?.pb?.toFixed(2)} />
            <InfoRow label="总市值" value={formatMarketCap(quote?.marketCap)} />
            <InfoRow label="流通市值" value={formatMarketCap(quote?.circulationMarketCap)} />
          </div>
        </div>
      </div>
    </div>
  );
}

// 信息行组件
function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium tabular-nums">{value || "--"}</span>
    </div>
  );
}

// 格式化成交量
function formatVolume(volume?: number): string {
  if (!volume) return "--";
  if (volume >= 100000000) {
    return `${(volume / 100000000).toFixed(2)}亿手`;
  } else if (volume >= 10000) {
    return `${(volume / 10000).toFixed(2)}万手`;
  }
  return `${volume}手`;
}

// 格式化成交额
function formatAmount(amount?: number): string {
  if (!amount) return "--";
  if (amount >= 100000000) {
    return `${(amount / 100000000).toFixed(2)}亿`;
  } else if (amount >= 10000) {
    return `${(amount / 10000).toFixed(2)}万`;
  }
  return `${amount}元`;
}

// 格式化市值
function formatMarketCap(cap?: number): string {
  if (!cap) return "--";
  if (cap >= 100000000) {
    return `${(cap / 100000000).toFixed(2)}亿`;
  } else if (cap >= 10000) {
    return `${(cap / 10000).toFixed(2)}万`;
  }
  return `${cap}元`;
}
