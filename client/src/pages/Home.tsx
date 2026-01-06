import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Search, Plus, X } from "lucide-react";
import { createChart, CandlestickSeries, LineSeries, HistogramSeries, CandlestickData, LineData, HistogramData, Time } from "lightweight-charts";
import type { IChartApi } from "lightweight-charts";

export default function Home() {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedStock, setSelectedStock] = useState<string | null>(null);
  
  // 获取观察池列表
  const { data: watchlist, isLoading, refetch } = trpc.watchlist.list.useQuery();
  
  // 搜索股票 - 使用query
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  
  // 使用tRPC query进行搜索
  const { data: searchData, isFetching: isSearching } = trpc.stocks.search.useQuery(
    { keyword: debouncedKeyword },
    { 
      enabled: debouncedKeyword.length > 0,
      staleTime: 30000,
    }
  );
  
  // 当搜索数据变化时更新结果
  useEffect(() => {
    if (searchData) {
      setSearchResults(searchData);
    }
  }, [searchData]);
  
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
  
  const handleSearch = () => {
    if (!searchKeyword.trim()) return;
    setDebouncedKeyword(searchKeyword.trim());
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
      <div className="w-80 border-r border-border flex flex-col">
        {/* 搜索栏 */}
        <div className="p-3 border-b border-border">
          <div className="flex items-center gap-2 bg-input rounded-lg px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索股票代码/名称"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="border-0 bg-transparent p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0 text-sm text-foreground placeholder:text-muted-foreground"
            />
          </div>
          
          {/* 搜索结果 */}
          {searchResults.length > 0 && (
            <div className="mt-2 bg-card rounded-lg border border-border overflow-hidden">
              {searchResults.map((stock: any) => (
                <div
                  key={stock.code}
                  className="flex items-center justify-between p-3 hover:bg-accent cursor-pointer border-b border-border last:border-b-0"
                  onClick={() => handleAddToWatchlist(stock.code)}
                >
                  <div>
                    <div className="font-medium text-sm text-foreground">{stock.name}</div>
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
          <div className="h-full flex items-center justify-center">
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

// 股票列表项组件 - 腾讯自选股风格
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
  const isPositive = changePercent > 0;
  const isNegative = changePercent < 0;
  const currentPrice = quote?.quote?.price || 0;
  const name = quote?.quote?.name || quote?.stock?.name || "加载中...";
  
  // 涨跌颜色
  const priceColor = isPositive ? 'text-[#e74c3c]' : isNegative ? 'text-[#2ecc71]' : 'text-foreground';
  const badgeColor = isPositive ? 'bg-[#e74c3c]' : isNegative ? 'bg-[#2ecc71]' : 'bg-muted';
  
  return (
    <div
      className={`
        group px-4 py-3 border-b border-border cursor-pointer transition-all
        ${isSelected ? 'bg-accent' : 'hover:bg-accent/50'}
      `}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">{name}</span>
            <button
              onClick={onDelete}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/20 rounded"
            >
              <X className="h-3 w-3 text-muted-foreground" />
            </button>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {item.stockCode}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className={`font-semibold tabular-nums ${priceColor}`}>
            {currentPrice > 0 ? currentPrice.toFixed(2) : "--"}
          </div>
          <div className={`px-2 py-1 rounded text-xs font-medium text-white tabular-nums min-w-[60px] text-center ${badgeColor}`}>
            {isPositive ? '+' : ''}{changePercent.toFixed(2)}%
          </div>
        </div>
      </div>
    </div>
  );
}

// 股票详情面板组件 - 腾讯自选股风格
function StockDetailPanel({ stockCode }: { stockCode: string }) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const volumeContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const volumeChartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);
  const [chartType, setChartType] = useState<'timeline' | 'day' | 'week' | 'month'>('day');
  
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
    if (volumeChartRef.current) {
      volumeChartRef.current.remove();
      volumeChartRef.current = null;
      volumeSeriesRef.current = null;
    }
    
    // 深色主题配置
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: 'transparent' },
        textColor: '#9ca3af',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: 'rgba(255, 255, 255, 0.3)',
          labelBackgroundColor: '#374151',
        },
        horzLine: {
          color: 'rgba(255, 255, 255, 0.3)',
          labelBackgroundColor: '#374151',
        },
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
        timeVisible: true,
      },
      width: chartContainerRef.current.clientWidth,
      height: 300,
    });
    
    // 根据图表类型添加不同的系列
    if (chartType === 'timeline') {
      const lineSeries = chart.addSeries(LineSeries, {
        color: '#3b82f6',
        lineWidth: 2,
        priceLineVisible: true,
      });
      seriesRef.current = lineSeries;
    } else {
      const candlestickSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#e74c3c',
        downColor: '#2ecc71',
        borderVisible: false,
        wickUpColor: '#e74c3c',
        wickDownColor: '#2ecc71',
      });
      seriesRef.current = candlestickSeries;
    }
    
    chartRef.current = chart;
    
    // 创建成交量图表
    if (volumeContainerRef.current && chartType !== 'timeline') {
      const volumeChart = createChart(volumeContainerRef.current, {
        layout: {
          background: { color: 'transparent' },
          textColor: '#9ca3af',
        },
        grid: {
          vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
          horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
        },
        rightPriceScale: {
          borderColor: 'rgba(255, 255, 255, 0.1)',
        },
        timeScale: {
          borderColor: 'rgba(255, 255, 255, 0.1)',
          visible: false,
        },
        width: volumeContainerRef.current.clientWidth,
        height: 80,
      });
      
      const volumeSeries = volumeChart.addSeries(HistogramSeries, {
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: '',
      });
      
      volumeChartRef.current = volumeChart;
      volumeSeriesRef.current = volumeSeries;
    }
    
    // 响应式调整
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
      if (volumeContainerRef.current && volumeChartRef.current) {
        volumeChartRef.current.applyOptions({
          width: volumeContainerRef.current.clientWidth,
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
      if (volumeChartRef.current) {
        volumeChartRef.current.remove();
        volumeChartRef.current = null;
      }
    };
  }, [stockCode, chartType]);
  
  // 更新分时数据
  useEffect(() => {
    if (chartType !== 'timeline' || !seriesRef.current || !timelineData?.timeline) return;
    
    const formattedData: LineData<Time>[] = timelineData.timeline.map((item: any) => {
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
    
    // 更新成交量数据
    if (volumeSeriesRef.current) {
      const volumeData: HistogramData<Time>[] = klineData.map((item: any) => ({
        time: item.time as Time,
        value: item.volume,
        color: item.close >= item.open ? '#e74c3c' : '#2ecc71',
      }));
      volumeSeriesRef.current.setData(volumeData);
      volumeChartRef.current?.timeScale().fitContent();
    }
  }, [klineData, chartType]);
  
  const quote = detail?.quote;
  const changePercent = quote?.changePercent || 0;
  const isPositive = changePercent > 0;
  const isNegative = changePercent < 0;
  const priceColor = isPositive ? 'text-[#e74c3c]' : isNegative ? 'text-[#2ecc71]' : 'text-foreground';
  
  return (
    <div className="h-full flex flex-col overflow-auto bg-background">
      {/* 头部信息 - 腾讯自选股风格 */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
          <span>{quote?.name || "加载中..."}</span>
          <span>({stockCode})</span>
        </div>
        <div className="flex items-baseline gap-4">
          <span className={`text-4xl font-bold tabular-nums ${priceColor}`}>
            {quote?.price ? quote.price.toFixed(2) : "--"}
          </span>
          <span className={`text-lg tabular-nums ${priceColor}`}>
            {isPositive ? '+' : ''}{quote?.change?.toFixed(2) || "0.00"}
          </span>
          <span className={`text-lg tabular-nums ${priceColor}`}>
            {isPositive ? '+' : ''}{changePercent.toFixed(2)}%
          </span>
        </div>
      </div>
      
      {/* 数据网格 - 腾讯自选股风格 */}
      <div className="px-4 py-3 border-b border-border">
        <div className="grid grid-cols-3 gap-x-6 gap-y-2 text-sm">
          <DataCell label="今开" value={quote?.open?.toFixed(2)} isUp={quote?.open && quote?.preClose ? quote.open > quote.preClose : undefined} />
          <DataCell label="最高" value={quote?.high?.toFixed(2)} isUp={true} />
          <DataCell label="成交量" value={formatVolume(quote?.volume)} />
          <DataCell label="昨收" value={quote?.preClose?.toFixed(2)} />
          <DataCell label="最低" value={quote?.low?.toFixed(2)} isUp={false} />
          <DataCell label="成交额" value={formatAmount(quote?.amount)} />
          <DataCell label="换手率" value={quote?.turnoverRate ? `${quote.turnoverRate.toFixed(2)}%` : "--"} />
          <DataCell label="市盈率" value={quote?.pe?.toFixed(2)} />
          <DataCell label="总市值" value={formatMarketCap(quote?.marketCap)} />
          <DataCell label="市净率" value={quote?.pb?.toFixed(2)} />
          <DataCell label="流通市值" value={formatMarketCap(quote?.circulationMarketCap)} />
        </div>
      </div>
      
      {/* 周期选择 - 腾讯自选股风格 */}
      <div className="px-4 py-2 border-b border-border flex gap-1">
        {[
          { key: 'timeline', label: '分时' },
          { key: 'day', label: '日K' },
          { key: 'week', label: '周K' },
          { key: 'month', label: '月K' },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setChartType(item.key as 'timeline' | 'day' | 'week' | 'month')}
            className={`px-4 py-1.5 text-sm font-medium transition-colors ${
              chartType === item.key
                ? 'text-foreground border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      
      {/* K线图 */}
      <div className="flex-1 px-4 py-2">
        <div ref={chartContainerRef} className="w-full" />
        {chartType !== 'timeline' && (
          <div ref={volumeContainerRef} className="w-full mt-1" />
        )}
      </div>
    </div>
  );
}

// 数据单元格组件
function DataCell({ label, value, isUp }: { label: string; value?: string; isUp?: boolean }) {
  let valueColor = 'text-foreground';
  if (isUp === true) valueColor = 'text-[#e74c3c]';
  if (isUp === false) valueColor = 'text-[#2ecc71]';
  
  return (
    <div className="flex justify-between items-center">
      <span className="text-muted-foreground">{label}</span>
      <span className={`tabular-nums ${valueColor}`}>{value || "--"}</span>
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
