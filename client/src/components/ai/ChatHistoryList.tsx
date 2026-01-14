/**
 * 历史对话列表组件 - 内嵌在 AI 面板中
 */
import { trpc } from "@/lib/trpc";
import { MessageCircle, ChevronRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatHistoryListProps {
    onSelectSession: (sessionId: string) => void;
    onBack: () => void;
    stockCode: string | null;
}

export function ChatHistoryList({ onSelectSession, onBack, stockCode }: ChatHistoryListProps) {
    const { data: sessions, isLoading } = trpc.ai.getSessions.useQuery({
        stockCode: stockCode || undefined,
    });

    const handleSelect = (sessionId: string) => {
        onSelectSession(sessionId);
    };

    return (
        <div className="h-full flex flex-col bg-background">
            {/* 标题栏 */}
            <div className="p-3 border-b border-border/30 flex items-center gap-2 shrink-0">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 hover:bg-accent transition-colors"
                    onClick={onBack}
                >
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <span className="font-semibold text-foreground">历史对话</span>
            </div>

            {/* 列表区域 */}
            <div className="flex-1 overflow-y-auto p-2">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    </div>
                ) : sessions && sessions.length > 0 ? (
                    <div className="space-y-1">
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
                                    <div className="font-medium text-sm text-foreground truncate">
                                        {session.stockCode}
                                    </div>
                                    <div className="text-xs text-muted-foreground truncate">
                                        {session.lastMessage}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-xs text-muted-foreground tabular-nums">
                                        {session.messageCount} 条
                                    </span>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                        <MessageCircle className="h-12 w-12 opacity-20 mb-3" />
                        <p className="text-sm">暂无历史对话</p>
                        <p className="text-xs mt-1 opacity-60">开始对话后会自动保存</p>
                    </div>
                )}
            </div>
        </div>
    );
}
