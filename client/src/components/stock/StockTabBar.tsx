import { X } from "lucide-react";

import { trpc } from "@/lib/trpc";

import type { MouseEvent } from "react";

interface StockTabProps {
  code: string;
  isSelected: boolean;
  onSelect: () => void;
  onClose: (event: MouseEvent<HTMLButtonElement>) => void;
}

function StockTab({ code, isSelected, onSelect, onClose }: StockTabProps) {
  const { data: detail } = trpc.stocks.getDetail.useQuery(
    { code },
    { staleTime: 60000 }
  );

  const name = detail?.quote?.name || detail?.stock?.name || code;

  return (
    <div
      onClick={onSelect}
      className={`group relative flex items-center justify-center min-w-[120px] px-6 h-full border-r border-border cursor-pointer transition-colors shrink-0 ${
        isSelected
          ? "bg-background text-foreground border-b-2 border-b-primary"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
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

export interface StockTabBarProps {
  openedTabs: string[];
  selectedStock: string | null;
  onSwitchTab: (code: string) => void;
  onCloseTab: (code: string, event: MouseEvent<HTMLButtonElement>) => void;
}

export function StockTabBar({
  openedTabs,
  selectedStock,
  onSwitchTab,
  onCloseTab,
}: StockTabBarProps) {
  if (openedTabs.length === 0) return null;

  return (
    <div className="h-9 border-b border-border flex items-center bg-card/50 overflow-x-auto">
      {openedTabs.map(tabCode => (
        <StockTab
          key={tabCode}
          code={tabCode}
          isSelected={selectedStock === tabCode}
          onSelect={() => onSwitchTab(tabCode)}
          onClose={event => onCloseTab(tabCode, event)}
        />
      ))}
    </div>
  );
}
