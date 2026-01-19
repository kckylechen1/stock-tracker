import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";

import type { ReactNode, RefObject } from "react";
import type { ImperativePanelHandle } from "react-resizable-panels";

export interface MainLayoutProps {
  leftPanel: ReactNode;
  rightPanel: ReactNode;
  rightPanelRef: RefObject<ImperativePanelHandle | null>;
  isRightPanelCollapsed: boolean;
  onRightPanelCollapsed: () => void;
  onRightPanelExpanded: () => void;
}

export function MainLayout({
  leftPanel,
  rightPanel,
  rightPanelRef,
  isRightPanelCollapsed,
  onRightPanelCollapsed,
  onRightPanelExpanded,
}: MainLayoutProps) {
  return (
    <ResizablePanelGroup direction="horizontal" className="flex-1 min-w-0">
      <ResizablePanel defaultSize={75} minSize={50}>
        {leftPanel}
      </ResizablePanel>

      <ResizableHandle
        withHandle
        className={isRightPanelCollapsed ? "hidden" : ""}
      />

      <ResizablePanel
        ref={rightPanelRef}
        defaultSize={25}
        minSize={20}
        maxSize={50}
        collapsible={true}
        collapsedSize={0}
        onCollapse={onRightPanelCollapsed}
        onExpand={onRightPanelExpanded}
        className={isRightPanelCollapsed ? "hidden" : ""}
      >
        <div className="h-full min-w-[280px] flex flex-col border-l border-border bg-background overflow-hidden">
          {rightPanel}
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
