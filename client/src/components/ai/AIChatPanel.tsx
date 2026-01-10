import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Zap } from "lucide-react";
import { AIChatBox, Message } from "@/components/AIChatBox";

export interface AIChatPanelProps {
    selectedStock: string | null;
}

// 获取默认系统消息
const getDefaultMessages = (): Message[] => [
    {
        role: "system",
        content: "你是一个专业的A股分析师助手，帮助用户分析股票、解读技术指标、提供投资建议。",
    }
];

export function AIChatPanel({ selectedStock }: AIChatPanelProps) {
    const [messages, setMessages] = useState<Message[]>(getDefaultMessages());
    const [thinkingMode, setThinkingMode] = useState(false);
    const [grokMode, setGrokMode] = useState(true);  // 默认使用 Grok
    const [isLoading, setIsLoading] = useState(false);
    const abortControllerRef = useRef<AbortController | null>(null);

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
                    useThinking: thinkingMode,
                    useGrok: grokMode,  // 使用 Grok 模型
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
                                // 首次收到内容时，计算思考时间
                                if (!hasReceivedFirstContent && thinkingMode) {
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
                                        thinkingTime: thinkingMode ? thinkingTime : undefined,
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

    // 根据选中股票生成快捷提示
    const suggestedPrompts = selectedStock ? [
        "帮我分析一下这只股票",
        "技术面怎么看",
        "现在适合买入吗",
    ] : [
        "如何选股",
        "什么是MACD",
        "如何控制风险",
    ];

    // 判断是否有聊天记录（除了系统消息）
    const hasHistory = messages.length > 1;

    return (
        <div className="h-full border-l border-border/50 flex flex-col bg-gradient-to-b from-background via-background to-background/95">
            {/* 标题栏 - 现代风格 */}
            <div className="p-4 border-b border-border/30 flex items-center gap-3 bg-gradient-to-r from-primary/5 via-transparent to-transparent">
                <div className="size-8 rounded-xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent flex items-center justify-center border border-primary/20">
                    <Zap className="h-4 w-4 text-primary" />
                </div>
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground tracking-tight">AI 助手</span>
                    {selectedStock && stockDetail?.quote?.name && (
                        <span className="text-xs text-primary/80 bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/20 font-medium">
                            {stockDetail.quote.name}
                        </span>
                    )}
                </div>
            </div>

            {/* 聊天区域 */}
            <div className="flex-1 overflow-hidden">
                <AIChatBox
                    messages={messages}
                    onSendMessage={handleSendMessage}
                    isLoading={isLoading}
                    placeholder={selectedStock ? `问问关于 ${stockDetail?.quote?.name || selectedStock} 的问题...` : "输入问题..."}
                    height="100%"
                    emptyStateMessage={
                        selectedStock
                            ? `AI 已加载 ${stockDetail?.quote?.name || selectedStock} 的实时数据，直接提问即可`
                            : "选择股票后可以进行针对性分析"
                    }
                    suggestedPrompts={hasHistory ? [] : suggestedPrompts}
                    thinkingMode={thinkingMode}
                    onThinkingModeChange={setThinkingMode}
                    grokMode={grokMode}
                    onGrokModeChange={setGrokMode}
                    onRegenerate={handleRegenerate}
                />
            </div>
        </div>
    );
}
