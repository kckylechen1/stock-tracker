/**
 * 历史对话弹窗组件
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { MessageCircle, Trash2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface ChatHistoryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelectSession: (stockCode: string) => void;
}

export function ChatHistoryDialog({
    open,
    onOpenChange,
    onSelectSession
}: ChatHistoryDialogProps) {
    const { data: sessions, isLoading, refetch } = trpc.ai.getSessions.useQuery(undefined, {
        enabled: open,
    });

    const handleSelect = (sessionId: string) => {
        // sessionId 是 stockCode 或 'default'
        onSelectSession(sessionId === '通用对话' ? 'default' : sessionId);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <MessageCircle className="h-5 w-5 text-primary" />
                        历史对话
                    </DialogTitle>
                </DialogHeader>

                <div className="py-2">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                        </div>
                    ) : sessions && sessions.length > 0 ? (
                        <div className="space-y-1 max-h-[400px] overflow-y-auto">
                            {sessions.map((session) => (
                                <button
                                    key={session.id}
                                    onClick={() => handleSelect(session.id)}
                                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors text-left group"
                                >
                                    <div className="size-9 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center">
                                        <MessageCircle className="h-4 w-4 text-primary" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-sm truncate">
                                            {session.stockCode}
                                        </div>
                                        <div className="text-xs text-muted-foreground truncate">
                                            {session.lastMessage}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className="text-xs text-muted-foreground">
                                            {session.messageCount} 条
                                        </span>
                                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <MessageCircle className="h-10 w-10 opacity-30 mb-3" />
                            <p className="text-sm">暂无历史对话</p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
