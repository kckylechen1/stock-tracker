import { StockMainPanel } from "./StockMainPanel";
import { StockNewsPanel } from "./StockNewsPanel";
import { StockTabBar } from "./StockTabBar";

import type { MouseEvent } from "react";

export interface StockWorkspaceProps {
  openedTabs: string[];
  selectedStock: string | null;
  onSwitchTab: (code: string) => void;
  onCloseTab: (code: string, event: MouseEvent<HTMLButtonElement>) => void;
  showSidePanels: boolean;
  onToggleSidePanels: () => void;
  onSelectTopStock: (code: string) => void;
}

export function StockWorkspace({
  openedTabs,
  selectedStock,
  onSwitchTab,
  onCloseTab,
  showSidePanels,
  onToggleSidePanels,
  onSelectTopStock,
}: StockWorkspaceProps) {
  return (
    <div className="h-full flex items-start justify-center overflow-hidden">
      <div className="w-full max-w-[1400px] h-full flex flex-col">
        <StockTabBar
          openedTabs={openedTabs}
          selectedStock={selectedStock}
          onSwitchTab={onSwitchTab}
          onCloseTab={onCloseTab}
        />

        <StockMainPanel
          selectedStock={selectedStock}
          showSidePanels={showSidePanels}
          onToggleSidePanels={onToggleSidePanels}
          onSelectTopStock={onSelectTopStock}
        />

        <StockNewsPanel selectedStock={selectedStock} />
      </div>
    </div>
  );
}
