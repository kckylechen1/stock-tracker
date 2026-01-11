import { useState, useEffect, useCallback, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Search, Plus, Trash2, X, PanelRightOpen, PanelRightClose, MessageCircle, ChevronLeft, TrendingUp, Activity, Lightbulb } from "lucide-react";
import type { ImperativePanelHandle } from "react-resizable-panels";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useIsLargeScreen, useIsMobileScreen } from "@/hooks";

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

  // 响应式屏幕检测
  const isLargeScreen = useIsLargeScreen();
  const isMobile = useIsMobileScreen();

  // 拖拽删除状态
  const [draggingStock, setDraggingStock] = useState<{ code: string, id: number } | null>(null);
  const [isOverTrash, setIsOverTrash] = useState(false);

  // 已打开的股票标签列表 (只存储 code)
  const [openedTabs, setOpenedTabs] = useState<string[]>([]);

  // 侧边栏面板状态（用于窄屏幕手动展开）- 大屏默认展开
  const [showSidePanels, setShowSidePanels] = useState(isLargeScreen);

  // AI 聊天面板状态 - 右侧面板折叠状态
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false);
  const rightPanelRef = useRef<ImperativePanelHandle>(null);

  // 响应式：屏幕变化时自动调整侧边栏
  useEffect(() => {
    setShowSidePanels(isLargeScreen);
  }, [isLargeScreen]);

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

      {/* 中间内容区 - 使用 ResizablePanelGroup 实现可拖拽布局 */}
      <ResizablePanelGroup direction="horizontal" className="flex-1 min-w-0">
        {/* 左侧主内容面板 */}
        <ResizablePanel defaultSize={75} minSize={50}>
          <div className="h-full flex flex-col">
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



              {/* 市场情绪 - Accordion 可折叠面板 */}
              <div className={`${showSidePanels ? 'flex' : 'hidden'} 2xl:flex flex-[20] min-w-[180px] border-l border-border flex-col bg-card/30`}>
                <Accordion type="multiple" defaultValue={["sentiment"]} className="flex-1 overflow-auto">
                  {/* 市场情绪 */}
                  <AccordionItem value="sentiment" className="border-b border-border/50">
                    <AccordionTrigger className="px-3 py-2.5 text-sm font-semibold hover:no-underline hover:bg-accent/50">
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-primary" />
                        市场情绪
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <MarketSentimentPanel selectedStock={selectedStock ?? undefined} />
                    </AccordionContent>
                  </AccordionItem>

                  {/* 资金面 (占位 - 后续填充) */}
                  <AccordionItem value="capital" className="border-b border-border/50">
                    <AccordionTrigger className="px-3 py-2.5 text-sm font-semibold hover:no-underline hover:bg-accent/50">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-500" />
                        资金面
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="px-3 py-4 text-xs text-muted-foreground text-center">
                        资金面数据已整合到 K线图下方
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* 操作建议 */}
                  <AccordionItem value="suggestion" className="border-b border-border/50">
                    <AccordionTrigger className="px-3 py-2.5 text-sm font-semibold hover:no-underline hover:bg-accent/50">
                      <div className="flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-yellow-500" />
                        操作建议
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="px-3 py-4 text-xs text-muted-foreground text-center">
                        点击 AI 助手获取操作建议
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                {/* 全部收起按钮 */}
                <div className="p-2 border-t border-border/50">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs opacity-60 hover:opacity-100"
                    onClick={() => {
                      // 触发收起所有 accordion
                      const accordionItems = document.querySelectorAll('[data-state="open"]');
                      accordionItems.forEach(item => {
                        (item as HTMLElement).click?.();
                      });
                    }}
                  >
                    全部收起
                  </Button>
                </div>
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
        </ResizablePanel>

        {/* 可拖拽分隔条 */}
        <ResizableHandle withHandle />

        {/* 右侧 AI 聊天面板 - 可折叠 */}
        <ResizablePanel
          ref={rightPanelRef}
          defaultSize={25}
          minSize={15}
          maxSize={50}
          collapsible={true}
          collapsedSize={4}
          onCollapse={() => setIsRightPanelCollapsed(true)}
          onExpand={() => setIsRightPanelCollapsed(false)}
        >
          {isRightPanelCollapsed ? (
            // 折叠状态 - 显示展开按钮
            <div className="h-full flex items-center justify-center bg-gradient-to-br from-card/50 to-card/30 border-l border-border">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => rightPanelRef.current?.expand()}
                className="h-14 w-14 rounded-full bg-primary/10 hover:bg-primary/20 hover:scale-105 transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer"
                title="展开 AI 助手"
              >
                <MessageCircle className="h-6 w-6 text-primary" />
              </Button>
            </div>
          ) : (
            // 展开状态 - 完整的 AI 聊天面板
            <div className="h-full flex flex-col border-l border-border bg-background">
              {/* 瘦标题栏：44px 高 */}
              <div className="h-11 px-4 border-b border-border/50 flex items-center justify-between shrink-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent">
                <div className="flex items-center gap-2">
                  <div className="size-6 rounded-lg bg-gradient-to-br from-primary/20 via-primary/10 to-transparent flex items-center justify-center border border-primary/20">
                    <MessageCircle className="h-3 w-3 text-primary" />
                  </div>
                  <span className="font-semibold text-sm text-foreground">AI 助手</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 hover:bg-accent transition-colors duration-150 cursor-pointer"
                  onClick={() => rightPanelRef.current?.collapse()}
                  title="收起面板"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>

              {/* 聊天内容 - 占满剩余空间 */}
              <div className="flex-1 overflow-hidden">
                <AIChatPanel selectedStock={selectedStock} />
              </div>
            </div>
          )}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
