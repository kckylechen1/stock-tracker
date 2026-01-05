import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, TrendingUp, TrendingDown, Plus } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

export default function Home() {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // 获取观察池列表
  const { data: watchlist, isLoading: watchlistLoading, refetch } = trpc.watchlist.list.useQuery();
  
  // 搜索股票mutation
  const searchMutation = trpc.stocks.search.useQuery(
    { keyword: searchKeyword },
    { enabled: false }
  );
  
  const handleSearch = async () => {
    if (!searchKeyword.trim()) return;
    
    setIsSearching(true);
    try {
      const results = await searchMutation.refetch();
      setSearchResults(results.data || []);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };
  
  // 添加到观察池
  const addToWatchlistMutation = trpc.watchlist.add.useMutation({
    onSuccess: () => {
      refetch();
      setSearchResults([]);
      setSearchKeyword("");
    },
  });
  
  const handleAddToWatchlist = (code: string) => {
    addToWatchlistMutation.mutate({ stockCode: code, source: 'manual' });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container py-6">
          <h1 className="text-3xl font-bold text-foreground">Stock Tracker</h1>
          <p className="text-muted-foreground mt-2">A股交易追踪与分析工具</p>
        </div>
      </header>

      <main className="container py-8">
        {/* Search Section */}
        <Card className="p-6 mb-8 bg-card">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索股票代码或名称..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
            <Button onClick={handleSearch} disabled={isSearching}>
              {isSearching ? '搜索中...' : '搜索'}
            </Button>
          </div>
          
          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm text-muted-foreground">搜索结果：</p>
              {searchResults.map((stock: any) => (
                <div
                  key={stock.code}
                  className="flex items-center justify-between p-3 rounded-lg bg-accent hover:bg-accent/80 transition-colors"
                >
                  <div>
                    <span className="font-medium text-foreground">{stock.name}</span>
                    <span className="ml-2 text-sm text-muted-foreground">{stock.code}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{stock.market}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAddToWatchlist(stock.code)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    添加
                  </Button>
                </div>
              ))}
            </div>
          )}
          
          {/* 搜索无结果提示 */}
          {searchKeyword && !isSearching && searchResults.length === 0 && (
            <div className="mt-4 p-4 rounded-lg bg-accent/50 border border-border">
              <p className="text-sm text-muted-foreground">
                ⚠️ 搜索功能需要Tushare API权限。请直接输入股票代码（如 002594）添加到观察池。
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-2"
                onClick={() => {
                  if (searchKeyword.match(/^\d{6}$/)) {
                    handleAddToWatchlist(searchKeyword);
                  }
                }}
                disabled={!searchKeyword.match(/^\d{6}$/)}
              >
                <Plus className="h-4 w-4 mr-1" />
                添加 {searchKeyword} 到观察池
              </Button>
            </div>
          )}
        </Card>

        {/* Watchlist Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-foreground">我的观察池</h2>
            <span className="text-sm text-muted-foreground">
              {watchlist?.length || 0} 只股票
            </span>
          </div>

          {watchlistLoading ? (
            <div className="text-center py-12 text-muted-foreground">加载中...</div>
          ) : watchlist && watchlist.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {watchlist.map((item) => (
                <WatchlistCard key={item.id} item={item} onRefetch={refetch} />
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center bg-card">
              <p className="text-muted-foreground mb-4">观察池为空</p>
              <p className="text-sm text-muted-foreground">使用上方搜索框添加股票到观察池</p>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}

// 观察池卡片组件
function WatchlistCard({ item, onRefetch }: { item: any; onRefetch: () => void }) {
  const { data: stockDetail } = trpc.stocks.getDetail.useQuery({ code: item.stockCode });
  
  const removeFromWatchlistMutation = trpc.watchlist.remove.useMutation({
    onSuccess: () => {
      onRefetch();
    },
  });
  
  const handleRemove = () => {
    removeFromWatchlistMutation.mutate({ id: item.id });
  };
  
  const quote = stockDetail?.quote;
  const pctChange = quote?.pct_chg || 0;
  const isUp = pctChange > 0;
  const isDown = pctChange < 0;
  
  return (
    <Link href={`/stocks/${item.stockCode}`}>
      <Card className="p-5 hover:shadow-lg transition-all cursor-pointer bg-card border-l-4"
        style={{
          borderLeftColor: isUp ? 'var(--stock-up)' : isDown ? 'var(--stock-down)' : 'var(--border)'
        }}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-lg font-bold text-foreground">{item.stockCode}</h3>
            <p className="text-sm text-muted-foreground">{stockDetail?.stock?.name || '加载中...'}</p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.preventDefault();
              handleRemove();
            }}
            className="text-muted-foreground hover:text-destructive"
          >
            删除
          </Button>
        </div>
        
        {quote ? (
          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-foreground">
                {quote.close?.toFixed(2) || '--'}
              </span>
              <span
                className="text-sm font-medium flex items-center gap-1"
                style={{ color: isUp ? 'var(--stock-up)' : isDown ? 'var(--stock-down)' : 'var(--stock-neutral)' }}
              >
                {isUp ? <TrendingUp className="h-4 w-4" /> : isDown ? <TrendingDown className="h-4 w-4" /> : null}
                {pctChange > 0 ? '+' : ''}{pctChange?.toFixed(2)}%
              </span>
            </div>
            
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>开: {quote.open?.toFixed(2)}</span>
              <span>高: {quote.high?.toFixed(2)}</span>
              <span>低: {quote.low?.toFixed(2)}</span>
            </div>
            
            {item.note && (
              <p className="text-xs text-muted-foreground mt-2 border-t border-border pt-2">
                备注: {item.note}
              </p>
            )}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">加载行情数据...</div>
        )}
      </Card>
    </Link>
  );
}
