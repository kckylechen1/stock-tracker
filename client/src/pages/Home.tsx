import { MessageCircle } from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";

import { AIChatPanel } from "@/components/ai";
import { MainLayout } from "@/components/layout/MainLayout";
import { StockWorkspace, WatchlistSidebar } from "@/components/stock";
import { useIsLargeScreen, useWatchlist } from "@/hooks";
import { trpc } from "@/lib/trpc";

import type { MouseEvent } from "react";
import type { ImperativePanelHandle } from "react-resizable-panels";
import type { SearchResultItem } from "@/components/stock";

export default function Home() {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedStock, setSelectedStock] = useState<string | null>(null);

  // 股票列表显示模式: 'percent' | 'amount' | '5day'
  const [displayMode, setDisplayMode] = useState<"percent" | "amount" | "5day">(
    "percent"
  );

  // 响应式屏幕检测
  const isLargeScreen = useIsLargeScreen();

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

  // 键盘快捷键：⌘+I 切换 AI 面板
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "i") {
        e.preventDefault();
        if (isRightPanelCollapsed) {
          rightPanelRef.current?.expand();
        } else {
          rightPanelRef.current?.collapse();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isRightPanelCollapsed]);

  // 搜索股票 - 使用query
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [debouncedKeyword, setDebouncedKeyword] = useState("");

  // 获取观察池列表
  const { watchlist, isLoading, addMutation, deleteMutation } = useWatchlist({
    selectedStock,
    onSelectedStockCleared: () => setSelectedStock(null),
    onAddSuccess: () => {
      setSearchResults([]);
      setSearchKeyword("");
      setDebouncedKeyword("");
    },
    onAddError: message => {
      alert(message || "添加失败");
    },
  });

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
  const { data: searchData } = trpc.stocks.search.useQuery(
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

  const handleAddToWatchlist = (code: string) => {
    addMutation.mutate({
      stockCode: code,
      source: "manual",
    });
  };

  const handleDeleteFromWatchlist = (id: number) => {
    deleteMutation.mutate({ id });
  };

  // 切换显示模式
  const handleToggleDisplayMode = () => {
    setDisplayMode(prev =>
      prev === "percent" ? "amount" : prev === "amount" ? "5day" : "percent"
    );
  };

  const handleToggleSidePanels = () => {
    setShowSidePanels(prev => !prev);
  };

  // 选择股票并添加到标签页
  const handleSelectStock = useCallback(
    (code: string) => {
      setSelectedStock(code);

      // 检查是否已经在标签页中
      if (!openedTabs.includes(code)) {
        setOpenedTabs(prev => [...prev, code]);
      }
    },
    [openedTabs]
  );

  // 关闭标签页
  const handleCloseTab = useCallback(
    (code: string, e: MouseEvent<HTMLButtonElement>) => {
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
    },
    [selectedStock]
  );

  // 切换标签页
  const handleSwitchTab = useCallback((code: string) => {
    setSelectedStock(code);
  }, []);

  return (
    <div className="flex h-screen bg-background">
      {/* 左侧边栏 - 股票列表 (固定宽度 320px) */}
      <WatchlistSidebar
        displayMode={displayMode}
        onToggleDisplayMode={handleToggleDisplayMode}
        searchKeyword={searchKeyword}
        searchResults={searchResults}
        onSearchKeywordChange={setSearchKeyword}
        onAddToWatchlist={handleAddToWatchlist}
        watchlist={watchlist}
        isLoading={isLoading}
        selectedStock={selectedStock}
        onSelectStock={handleSelectStock}
        onDeleteFromWatchlist={handleDeleteFromWatchlist}
      />

      {/* 中间内容区 - 使用 ResizablePanelGroup 实现可拖拽布局 */}
      <MainLayout
        leftPanel={
          <StockWorkspace
            openedTabs={openedTabs}
            selectedStock={selectedStock}
            onSwitchTab={handleSwitchTab}
            onCloseTab={handleCloseTab}
            showSidePanels={showSidePanels}
            onToggleSidePanels={handleToggleSidePanels}
            onSelectTopStock={handleSelectStock}
          />
        }
        rightPanel={
          <AIChatPanel
            selectedStock={selectedStock}
            onCollapse={() => rightPanelRef.current?.collapse()}
          />
        }
        rightPanelRef={rightPanelRef}
        isRightPanelCollapsed={isRightPanelCollapsed}
        onRightPanelCollapsed={() => setIsRightPanelCollapsed(true)}
        onRightPanelExpanded={() => setIsRightPanelCollapsed(false)}
      />

      {/* 底部浮动 AI 触发器 - 仅在面板折叠时显示 */}
      {isRightPanelCollapsed && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <button
            onClick={() => rightPanelRef.current?.expand()}
            className="group flex items-center gap-2 px-5 py-3 bg-card/90 backdrop-blur-md border border-border/60 rounded-full shadow-lg hover:shadow-xl hover:border-primary/40 hover:bg-card transition-all duration-200 cursor-pointer"
          >
            <MessageCircle className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
              向 AI 助手提问...
            </span>
            <div className="flex items-center gap-1 ml-2 text-xs text-muted-foreground/60">
              <kbd className="px-1.5 py-0.5 bg-muted/50 rounded text-[10px] font-mono">
                ⌘
              </kbd>
              <kbd className="px-1.5 py-0.5 bg-muted/50 rounded text-[10px] font-mono">
                I
              </kbd>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
