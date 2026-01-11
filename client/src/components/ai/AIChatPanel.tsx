import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Zap, X, SquarePen, History } from "lucide-react";
import { AIChatBox, Message } from "@/components/AIChatBox";
import { PresetPrompts } from "@/components/PresetPrompts";
import { Button } from "@/components/ui/button";
import { ChatHistoryDialog } from "./ChatHistoryDialog";

export interface AIChatPanelProps {
    selectedStock: string | null;
    onCollapse?: () => void;
}

// 获取默认系统消息
const getDefaultMessages = (): Message[] => [
    {
        role: "system",
        content: "你是一个专业的A股分析师助手，帮助用户分析股票、解读技术指标、提供投资建议。",
    }
];

export function AIChatPanel({ selectedStock, onCollapse }: AIChatPanelProps) {
    const [messages, setMessages] = useState<Message[]>(getDefaultMessages());
    const [isLoading, setIsLoading] = useState(false);
    const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
    const abortControllerRef = useRef<AbortController | null>(null);
    const utils = trpc.useUtils();

    // 获取当前股票信息用于显示
    const { data: stockDetail } = trpc.stocks.getDetail.useQuery(
        { code: selectedStock || "" },
        { enabled: !!selectedStock }
    );

    // 获取服务器端聊天历史
    const { data: historyMessages, isLoading: isHistoryLoading } = trpc.ai.getHistory.useQuery(
        { stockCode: selectedStock || undefined },
        {
            refetchOnWindowFocus: false,
        }
    );

    // 当历史记录加载完成后，更新本地消息状态
    // 当切换股票导致加载时，重置为默认消息
    useEffect(() => {
        if (isHistoryLoading) {
            setMessages(getDefaultMessages());
        } else if (historyMessages) {
            if (historyMessages.length > 0) {
                setMessages(historyMessages);
            } else {
                setMessages(getDefaultMessages());
            }
        }
    }, [historyMessages, isHistoryLoading, selectedStock]);

    // 统一的处理流式对话的函数
    const streamChatRequest = async (historyMessages: Message[]) => {
        // 取消之前的请求
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        // 记录开始时间（用于计算思考时间）
        const startTime = Date.now();
        let thinkingTime = 0;
        let hasReceivedFirstContent = false;

        // 添加空的助手消息到UI
        setMessages([...historyMessages, { role: "assistant", content: "" }]);
        setIsLoading(true);

        try {
            // 构建股票上下文数据 - 把前端已加载的数据传给 AI，避免重复查询
            const stockContext = stockDetail ? {
                quote: stockDetail.quote ? {
                    name: stockDetail.quote.name,
                    code: selectedStock,
                    price: stockDetail.quote.price,
                    change: stockDetail.quote.change,
                    changePercent: stockDetail.quote.changePercent,
                    open: stockDetail.quote.open,
                    high: stockDetail.quote.high,
                    low: stockDetail.quote.low,
                    preClose: stockDetail.quote.preClose,
                    volume: stockDetail.quote.volume,
                    amount: stockDetail.quote.amount,
                    turnoverRate: stockDetail.quote.turnoverRate,
                    pe: stockDetail.quote.pe,
                    pb: stockDetail.quote.pb,
                    marketCap: stockDetail.quote.marketCap,
                    circulationMarketCap: stockDetail.quote.circulationMarketCap,
                    volumeRatio: stockDetail.basic?.volumeRatio,
                } : null,
                capitalFlow: stockDetail.capitalFlow ? {
                    mainNetInflow: stockDetail.capitalFlow.mainNetInflow,
                    superLargeNetInflow: stockDetail.capitalFlow.superLargeNetInflow,
                    largeNetInflow: stockDetail.capitalFlow.largeNetInflow,
                    mediumNetInflow: stockDetail.capitalFlow.mediumNetInflow,
                    smallNetInflow: stockDetail.capitalFlow.smallNetInflow,
                } : null,
            } : null;

            const response = await fetch("/api/ai/stream", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    messages: historyMessages.map(m => ({
                        role: m.role,
                        content: m.content,
                    })),
                    stockCode: selectedStock || undefined,
                    stockContext, // 传递前端已加载的数据
                    useSmartAgent: true, // 使用新架构
                }),
                signal: abortControllerRef.current.signal,
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error("No reader available");
            }

            const decoder = new TextDecoder();
            let buffer = '';
            let fullContent = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6).trim();
                        if (data === '[DONE]') continue;

                        try {
                            const json = JSON.parse(data);
                            if (json.content) {
                                // 首次收到非思考内容时，计算思考时间
                                if (!hasReceivedFirstContent && !json.content.startsWith('💭') && !json.content.startsWith('🔧') && !json.content.startsWith('📊') && !json.content.startsWith('🧠')) {
                                    thinkingTime = Math.round((Date.now() - startTime) / 1000);
                                    hasReceivedFirstContent = true;
                                }

                                fullContent += json.content;
                                // 更新最后一条消息
                                setMessages(prev => {
                                    const updated = [...prev];
                                    updated[updated.length - 1] = {
                                        role: "assistant",
                                        content: fullContent,
                                        thinkingTime: thinkingTime > 0 ? thinkingTime : undefined,
                                    };
                                    return updated;
                                });
                            }
                        } catch {
                            // 忽略解析错误
                        }
                    }
                }
            }

        } catch (error: any) {
            if (error.name === 'AbortError') {
                console.log('Request aborted');
            } else {
                console.error("Stream error:", error);
                setMessages(prev => {
                    const updated = [...prev];
                    updated[updated.length - 1] = {
                        role: "assistant",
                        content: "抱歉，AI 服务暂时不可用，请稍后再试。",
                    };
                    return updated;
                });
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendMessage = async (content: string) => {
        // 添加用户消息
        const userMessage: Message = { role: "user", content };
        const newMessages = [...messages, userMessage];

        // 发起请求
        await streamChatRequest(newMessages);
    };

    // 重新生成最后一条回复
    const handleRegenerate = async () => {
        // 找到最后一条用户消息的位置
        const lastUserIndex = messages.findLastIndex(m => m.role === 'user');
        if (lastUserIndex === -1) return;

        // 保留到最后一条用户消息的所有历史（即删除了之后的助手回复）
        const historyToRegenerate = messages.slice(0, lastUserIndex + 1);

        // 发起请求
        await streamChatRequest(historyToRegenerate);
    };



    // 判断是否有聊天记录（除了系统消息）
    const hasHistory = messages.length > 1;

    return (
        <>
            <div className="h-full border-l border-border/50 flex flex-col bg-gradient-to-b from-background via-background to-background/95">
                {/* 标题栏 - 现代风格 */}
                <div className="p-3 border-b border-border/30 flex items-center justify-between gap-2 bg-gradient-to-r from-primary/5 via-transparent to-transparent shrink-0">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="size-7 shrink-0 rounded-xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent flex items-center justify-center border border-primary/20">
                            <Zap className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <span className="font-semibold text-foreground tracking-tight truncate">AI 助手</span>
                        {selectedStock && stockDetail?.quote?.name && (
                            <span className="text-xs text-primary/80 bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20 font-medium truncate max-w-[100px]">
                                {stockDetail.quote.name}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1">
                        {/* 历史对话按钮 */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0 hover:bg-accent transition-colors duration-150 cursor-pointer"
                            onClick={() => setHistoryDialogOpen(true)}
                            title="历史对话"
                        >
                            <History className="h-4 w-4" />
                        </Button>
                        {/* 新建对话按钮 */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0 hover:bg-accent transition-colors duration-150 cursor-pointer"
                            onClick={() => setMessages(getDefaultMessages())}
                            title="新建对话"
                        >
                            <SquarePen className="h-4 w-4" />
                        </Button>
                        {/* 关闭按钮 */}
                        {onCollapse && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 shrink-0 hover:bg-accent transition-colors duration-150 cursor-pointer"
                                onClick={onCollapse}
                                title="收起面板"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </div>

                {/* 聊天区域 */}
                <div className="flex-1 overflow-hidden flex flex-col">
                    {/* 预设提示按钮 - 只在没有聊天历史时显示 */}
                    {!hasHistory && (
                        <PresetPrompts onSend={handleSendMessage} />
                    )}
                    <div className="flex-1 overflow-hidden">
                        <AIChatBox
                            messages={messages}
                            onSendMessage={handleSendMessage}
                            isLoading={isLoading}
                            placeholder={selectedStock ? `问问关于 ${stockDetail?.quote?.name || selectedStock} 的问题...` : "输入问题..."}
                            height="100%"
                            emptyStateMessage={
                                selectedStock
                                    ? `🧠 SmartAgent 已就绪，直接提问即可`
                                    : "选择股票后可以进行针对性分析"
                            }
                            suggestedPrompts={[]} // 不再使用旧的建议提示
                            onRegenerate={handleRegenerate}
                        />
                    </div>
                </div>
            </div>
        </div >

            {/* 历史对话弹窗 */ }
            < ChatHistoryDialog
    open = { historyDialogOpen }
    onOpenChange = { setHistoryDialogOpen }
    onSelectSession = { async(stockCode) => {
        // 加载选中的会话历史
        try {
            const history = await utils.ai.getHistory.fetch({ stockCode });
            if (history && history.length > 0) {
                setMessages(history);
            }
        } catch (error) {
            console.error('Failed to load session:', error);
        }
    }
}
        />
        </>
    );
}
