import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, TrendingUp, TrendingDown } from "lucide-react";
import { useLocation } from "wouter";

export default function Home() {
  const [, setLocation] = useLocation();
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
  
  const handleStockClick = (code: string) => {
    setLocation(`/stocks/${code}`);
  };

  return (
    <div className="flex h-screen bg-background">
      {/* 左侧边栏 - 股票列表 */}
      <div className="w-80 border-r border-border flex flex-col">
        {/* 搜索栏 */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Stocks"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="border-0 bg-transparent p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
          
          {/* 搜索结果 */}
          {searchResults.length > 0 && (
            <div className="mt-2 space-y-1">
              {searchResults.map((stock: any) => (
                <div
                  key={stock.code}
                  className="flex items-center justify-between p-2 rounded-md hover:bg-accent cursor-pointer"
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
                  onNavigate={() => handleStockClick(item.stockCode)}
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
      <div className="flex-1 flex items-center justify-center bg-muted/20">
        {selectedStock ? (
          <div className="text-center">
            <p className="text-muted-foreground mb-4">点击查看详情</p>
            <Button onClick={() => handleStockClick(selectedStock)}>
              查看 {selectedStock} 详情
            </Button>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-lg font-medium text-muted-foreground">
              选择一只股票查看详情
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              从左侧列表中点击股票
            </p>
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
  onNavigate 
}: { 
  item: any; 
  isSelected: boolean;
  onClick: () => void;
  onNavigate: () => void;
}) {
  // 获取实时行情
  const { data: quote } = trpc.stocks.getDetail.useQuery(
    { code: item.stockCode },
    { refetchInterval: 30000 } // 每30秒刷新一次
  );
  
  const changePercent = quote?.quote?.changePercent || 0;
  const isPositive = changePercent >= 0;
  const currentPrice = quote?.quote?.price || 0;
  const name = quote?.quote?.name || quote?.stock?.name || "加载中...";
  
  return (
    <div
      className={`
        p-4 border-b border-border cursor-pointer transition-colors
        ${isSelected ? 'bg-accent' : 'hover:bg-accent/50'}
      `}
      onClick={onClick}
      onDoubleClick={onNavigate}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="font-medium text-sm">{item.stockCode}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {name}
          </div>
        </div>
        
        <div className="text-right">
          <div className="font-medium text-sm">
            {currentPrice > 0 ? currentPrice.toFixed(2) : "--"}
          </div>
          <div className={`text-xs flex items-center justify-end gap-1 ${
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
      
      {item.note && (
        <div className="text-xs text-muted-foreground mt-2 truncate">
          {item.note}
        </div>
      )}
    </div>
  );
}
