import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Search, Plus, Trash2, X, PanelRightOpen, PanelRightClose } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

// 导入模块化组件
import { StockListItem, StockDetailPanel } from "@/components/stock";
import { AIChatPanel } from "@/components/ai";
import { MarketSentimentPanel } from "@/components/market";

// 单个股票标签组件 - 动态获取股票名称
function StockTab({
  code,
  isSelected,
  onSelect,
  onClose
}: {
  code: string;
  isSelected: boolean;
  onSelect: () => void;
  onClose: (e: React.MouseEvent) => void;
}) {
  const { data: detail } = trpc.stocks.getDetail.useQuery(
    { code },
    { staleTime: 60000 } // 缓存1分钟
  );

  const name = detail?.quote?.name || detail?.stock?.name || code;

  return (
    <div
      onClick={onSelect}
      className={`group relative flex items-center justify-center min-w-[120px] px-6 h-full border-r border-border cursor-pointer transition-colors shrink-0 ${isSelected
        ? 'bg-background text-foreground border-b-2 border-b-primary'
        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
        }`}
    >
      <span className="text-sm truncate max-w-[100px] text-center">{name}</span>
      <button
        onClick={onClose}
        className="absolute right-1.5 p-0.5 rounded hover:bg-destructive/20 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

export default function Home() {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedStock, setSelectedStock] = useState<string | null>(null);

  // 拖拽删除状态
  const [draggingStock, setDraggingStock] = useState<{ code: string, id: number } | null>(null);
  const [isOverTrash, setIsOverTrash] = useState(false);

  // 已打开的股票标签列表 (只存储 code)
  const [openedTabs, setOpenedTabs] = useState<string[]>([]);

  // 侧边栏面板显示状态（用于窄屏幕手动展开）
  const [showSidePanels, setShowSidePanels] = useState(false);

  // 获取观察池列表
  const { data: watchlist, isLoading, refetch } = trpc.watchlist.list.useQuery();

  // 搜索股票 - 使用query
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [debouncedKeyword, setDebouncedKeyword] = useState("");

  // 自动防抖搜索：输入后延迟300ms自动触发
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchKeyword.trim().length > 0) {
        setDebouncedKeyword(searchKeyword.trim());
      } else {
        setDebouncedKeyword("");
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchKeyword]);

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
      setDebouncedKeyword("");
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

  const handleAddToWatchlist = (code: string) => {
    addMutation.mutate({
      stockCode: code,
      source: "manual",
    });
  };

  const handleDeleteFromWatchlist = (id: number) => {
    deleteMutation.mutate({ id });
  };

  // 选择股票并添加到标签页
  const handleSelectStock = useCallback((code: string) => {
    setSelectedStock(code);

    // 检查是否已经在标签页中
    if (!openedTabs.includes(code)) {
      setOpenedTabs(prev => [...prev, code]);
    }
  }, [openedTabs]);

  // 关闭标签页
  const handleCloseTab = useCallback((code: string, e: React.MouseEvent) => {
    e.stopPropagation();

    setOpenedTabs(prev => {
      const newTabs = prev.filter(tab => tab !== code);

      // 如果关闭的是当前选中的标签，切换到最后一个标签
      if (selectedStock === code) {
        if (newTabs.length > 0) {
          setSelectedStock(newTabs[newTabs.length - 1]);
        } else {
          setSelectedStock(null);
        }
      }

      return newTabs;
    });
  }, [selectedStock]);

  // 切换标签页
  const handleSwitchTab = useCallback((code: string) => {
    setSelectedStock(code);
  }, []);

  return (
    <div className="flex h-screen bg-background">
      {/* 左侧边栏 - 股票列表 (固定宽度 320px) */}
      <div className="w-80 shrink-0 border-r border-border flex flex-col">
        {/* 标题栏 */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <span className="font-semibold text-foreground">自选股</span>
          <ThemeToggle />
        </div>

        {/* 搜索栏 */}
        <div className="p-3 border-b border-border">
          <div className="flex items-center gap-2 bg-input rounded-lg px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索股票代码/名称"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && searchResults.length > 0) {
                  handleAddToWatchlist(searchResults[0].code);
                }
              }}
              className="border-0 bg-transparent h-6 p-0 focus-visible:ring-0"
            />
          </div>

          {/* 搜索结果 */}
          {searchResults.length > 0 && (
            <div className="mt-2 bg-popover border border-border rounded-lg overflow-hidden">
              {searchResults.slice(0, 5).map((result) => (
                <div
                  key={result.code}
                  className="flex items-center justify-between px-3 py-2 hover:bg-accent cursor-pointer"
                  onClick={() => handleAddToWatchlist(result.code)}
                >
                  <div>
                    <div className="font-medium text-sm">{result.name}</div>
                    <div className="text-xs text-muted-foreground">{result.code}</div>
                  </div>
                  <Plus className="h-4 w-4 text-muted-foreground" />
                </div>
              ))}
            </div>
          )}
        </div>



        {/* 观察池列表 */}
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">加载中...</div>
          ) : watchlist && watchlist.length > 0 ? (
            watchlist.map((item) => (
              <div
                key={item.id}
                draggable
                onDragStart={() => setDraggingStock({ code: item.stockCode, id: item.id })}
                onDragEnd={() => {
                  if (isOverTrash && draggingStock) {
                    handleDeleteFromWatchlist(draggingStock.id);
                  }
                  setDraggingStock(null);
                  setIsOverTrash(false);
                }}
                className={`cursor-grab active:cursor-grabbing ${draggingStock?.code === item.stockCode ? 'opacity-50' : ''}`}
              >
                <StockListItem
                  item={item}
                  isSelected={selectedStock === item.stockCode}
                  isEditMode={false}
                  onClick={() => handleSelectStock(item.stockCode)}
                  onDelete={() => { }}
                />
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-muted-foreground">
              <p>暂无观察股票</p>
              <p className="text-xs text-muted-foreground mt-2">
                使用上方搜索框添加股票
              </p>
            </div>
          )}
        </div>

        {/* 底部垃圾桶区域 */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsOverTrash(true);
          }}
          onDragLeave={() => setIsOverTrash(false)}
          onDrop={() => {
            if (draggingStock) {
              handleDeleteFromWatchlist(draggingStock.id);
            }
            setDraggingStock(null);
            setIsOverTrash(false);
          }}
          className={`p-4 border-t border-border flex items-center justify-center gap-2 transition-all duration-200 ${draggingStock
            ? isOverTrash
              ? 'bg-destructive/30 text-destructive scale-105'
              : 'bg-destructive/10 text-destructive/70'
            : 'bg-transparent text-muted-foreground/30'
            }`}
        >
          <Trash2 className={`transition-transform duration-200 ${isOverTrash ? 'h-8 w-8' : 'h-5 w-5'}`} />
          {draggingStock && (
            <span className="text-sm font-medium">
              {isOverTrash ? '松开删除' : '拖到此处删除'}
            </span>
          )}
        </div>
      </div>

      {/* 中间内容区 - 左侧(K线+筹码+新闻) + 右侧(AI助手) */}
      <div className="flex-1 min-w-0 flex">
        {/* 左侧区域：K线+筹码分布 + 新闻分析 */}
        <div className="flex-1 min-w-0 flex flex-col border-r border-border">
          {/* 标签栏 */}
          {openedTabs.length > 0 && (
            <div className="h-9 border-b border-border flex items-center bg-card/50 overflow-x-auto">
              {openedTabs.map((tabCode) => (
                <StockTab
                  key={tabCode}
                  code={tabCode}
                  isSelected={selectedStock === tabCode}
                  onSelect={() => handleSwitchTab(tabCode)}
                  onClose={(e) => handleCloseTab(tabCode, e)}
                />
              ))}
            </div>
          )}

          {/* 上半部分：K线图 + 筹码分布 + 技术指标 三栏显示 (占 65%) */}
          <div className="flex-[65] min-h-0 flex">
            {/* K线图 - 在普通屏占满宽度，在宽屏(>=1600px)时占60% */}
            <div className={`flex-1 min-w-[400px] 2xl:flex-[60] relative ${showSidePanels ? 'hidden 2xl:block' : ''}`}>
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

              {/* 窄屏时显示的展开侧边栏按钮 */}
              <button
                onClick={() => setShowSidePanels(!showSidePanels)}
                className="absolute right-2 top-2 z-20 2xl:hidden p-2 rounded-lg bg-card/90 border border-border hover:bg-accent transition-colors"
                title={showSidePanels ? "收起侧边栏" : "展开筹码/情绪面板"}
              >
                {showSidePanels ? (
                  <PanelRightClose className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <PanelRightOpen className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </div>



            {/* 市场情绪 (占 20%) - 宽屏自动显示 OR 手动展开时显示 */}
            <div className={`${showSidePanels ? 'flex' : 'hidden'} 2xl:flex flex-[20] min-w-[160px] border-l border-border flex-col bg-card/30`}>
              <div className="px-3 py-2.5 border-b border-border">
                <span className="font-semibold text-foreground text-sm">市场情绪</span>
              </div>
              <MarketSentimentPanel selectedStock={selectedStock ?? undefined} />
            </div>
          </div>

          {/* 下半部分：新闻/趋势/情绪分析 (占 35%) */}
          <div className="flex-[35] min-h-[180px] border-t border-border flex flex-col bg-card/20">
            {/* 标签导航 */}
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

            {/* 内容区域 */}
            <div className="flex-1 overflow-auto p-4">
              {selectedStock ? (
                <div className="space-y-3">
                  {/* 新闻条目示例 */}
                  <div className="p-3 rounded-lg bg-card/50 border border-border/50 hover:bg-accent/30 cursor-pointer transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground line-clamp-2">新闻资讯功能即将上线...</p>
                        <p className="text-xs text-muted-foreground mt-1">实时获取股票相关新闻、公告和研报</p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">即将推出</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-card/50 border border-border/50 hover:bg-accent/30 cursor-pointer transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground line-clamp-2">趋势分析功能即将上线...</p>
                        <p className="text-xs text-muted-foreground mt-1">技术指标、形态识别和趋势预测</p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">即将推出</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-card/50 border border-border/50 hover:bg-accent/30 cursor-pointer transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground line-clamp-2">情绪分析功能即将上线...</p>
                        <p className="text-xs text-muted-foreground mt-1">市场情绪、资金流向和舆情监控</p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">即将推出</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">请先选择股票查看相关资讯</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 右侧AI聊天面板 - 响应式宽度：普通屏290px，宽屏560px */}
        <div className="w-[290px] 2xl:w-[560px] shrink-0">
          <AIChatPanel selectedStock={selectedStock} />
        </div>
      </div>
    </div>
  );
}
