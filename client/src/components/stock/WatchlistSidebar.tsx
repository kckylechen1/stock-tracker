import { useState } from "react";
import { Trash2 } from "lucide-react";

import { ThemeToggle } from "@/components/ThemeToggle";
import { SearchSection } from "./SearchSection";
import { StockListItem } from "./StockListItem";

import type { SearchResultItem } from "./SearchSection";

interface DraggingStock {
  code: string;
  id: number;
}

export interface WatchlistItem {
  id: number;
  stockCode: string;
}

export interface WatchlistSidebarProps {
  displayMode: "percent" | "amount" | "5day";
  onToggleDisplayMode: () => void;
  searchKeyword: string;
  searchResults: SearchResultItem[];
  onSearchKeywordChange: (value: string) => void;
  onAddToWatchlist: (code: string) => void;
  watchlist?: WatchlistItem[];
  isLoading: boolean;
  selectedStock: string | null;
  onSelectStock: (code: string) => void;
  onDeleteFromWatchlist: (id: number) => void;
}

export function WatchlistSidebar({
  displayMode,
  onToggleDisplayMode,
  searchKeyword,
  searchResults,
  onSearchKeywordChange,
  onAddToWatchlist,
  watchlist,
  isLoading,
  selectedStock,
  onSelectStock,
  onDeleteFromWatchlist,
}: WatchlistSidebarProps) {
  const [draggingStock, setDraggingStock] = useState<DraggingStock | null>(
    null
  );
  const [isOverTrash, setIsOverTrash] = useState(false);

  return (
    <div className="w-80 shrink-0 border-r border-border flex flex-col">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground">自选股</span>
          <span className="text-xs text-muted-foreground">
            {displayMode === "percent"
              ? "涨跌幅"
              : displayMode === "amount"
                ? "涨跌额"
                : "5日涨幅"}
          </span>
        </div>
        <ThemeToggle />
      </div>

      <SearchSection
        searchKeyword={searchKeyword}
        searchResults={searchResults}
        onSearchKeywordChange={onSearchKeywordChange}
        onSelectResult={onAddToWatchlist}
      />

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-4 text-center text-muted-foreground">加载中...</div>
        ) : watchlist && watchlist.length > 0 ? (
          watchlist.map(item => (
            <div
              key={item.id}
              draggable
              onDragStart={() =>
                setDraggingStock({ code: item.stockCode, id: item.id })
              }
              onDragEnd={() => {
                if (isOverTrash && draggingStock) {
                  onDeleteFromWatchlist(draggingStock.id);
                }
                setDraggingStock(null);
                setIsOverTrash(false);
              }}
              className={`cursor-grab active:cursor-grabbing ${draggingStock?.code === item.stockCode ? "opacity-50" : ""}`}
            >
              <StockListItem
                item={item}
                isSelected={selectedStock === item.stockCode}
                isEditMode={false}
                onClick={() => onSelectStock(item.stockCode)}
                onDelete={() => {}}
                displayMode={displayMode}
                onToggleDisplayMode={onToggleDisplayMode}
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

      <div
        onDragOver={event => {
          event.preventDefault();
          setIsOverTrash(true);
        }}
        onDragLeave={() => setIsOverTrash(false)}
        onDrop={() => {
          if (draggingStock) {
            onDeleteFromWatchlist(draggingStock.id);
          }
          setDraggingStock(null);
          setIsOverTrash(false);
        }}
        className={`p-4 border-t border-border flex items-center justify-center gap-2 transition-all duration-200 ${
          draggingStock
            ? isOverTrash
              ? "bg-destructive/30 text-destructive scale-105"
              : "bg-destructive/10 text-destructive/70"
            : "bg-transparent text-muted-foreground/30"
        }`}
      >
        <Trash2
          className={`transition-transform duration-200 ${isOverTrash ? "h-8 w-8" : "h-5 w-5"}`}
        />
        {draggingStock && (
          <span className="text-sm font-medium">
            {isOverTrash ? "松开删除" : "拖到此处删除"}
          </span>
        )}
      </div>
    </div>
  );
}
