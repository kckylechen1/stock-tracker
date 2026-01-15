import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Zap, X, SquarePen, History, Brain } from "lucide-react";
import { AIChatBox, Message } from "@/components/AIChatBox";
import { PresetPrompts } from "@/components/PresetPrompts";
import { Button } from "@/components/ui/button";
import { ChatHistoryList } from "./ChatHistoryList";

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
    const [showHistory, setShowHistory] = useState(false);
    const [followUpSuggestions, setFollowUpSuggestions] = useState<string[]>([]);
    const [thinkHard, setThinkHard] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const utils = trpc.useUtils();
    const createSessionMutation = trpc.ai.createSession.useMutation();

    // 获取当前股票信息用于显示
    const { data: stockDetail } = trpc.stocks.getDetail.useQuery(
        { code: selectedStock || "" },
        { enabled: !!selectedStock }
    );

    // 获取服务器端聊天历史
    const { data: historyData, isLoading: isHistoryLoading } = trpc.ai.getHistory.useQuery(
        {
            sessionId: sessionId || undefined,
            stockCode: selectedStock || undefined,
        },
        {
            enabled: Boolean(sessionId || selectedStock),
            refetchOnWindowFocus: false,
        }
    );

    // 当切换股票时清空 sessionId，触发重新加载
    useEffect(() => {
        setSessionId(null);
    }, [selectedStock]);

    // 当历史记录加载完成后，更新本地消息状态
    useEffect(() => {
        if (isHistoryLoading) {
            setMessages(getDefaultMessages());
            return;
        }

        if (!historyData) return;

        if (historyData.messages.length > 0) {
            setMessages(historyData.messages);
        } else {
            setMessages(getDefaultMessages());
        }

        if (historyData.sessionId && historyData.sessionId !== sessionId) {
            setSessionId(historyData.sessionId);
        } else if (!historyData.sessionId && sessionId) {
            setSessionId(null);
        }
    }, [historyData, isHistoryLoading, sessionId]);

    const { data: activeTodoRun } = trpc.ai.getActiveTodoRun.useQuery(
        { sessionId: sessionId || "" },
        {
            enabled: Boolean(sessionId),
            refetchInterval: isLoading ? 1000 : 3000,
        }
    );
    const { data: latestTodoRun } = trpc.ai.getLatestTodoRun.useQuery(
        { sessionId: sessionId || "" },
        {
            enabled: Boolean(sessionId),
        }
    );
    const todoRun = activeTodoRun ?? latestTodoRun;

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

            const lastUserMessage = [...historyMessages].reverse().find(m => m.role === "user")?.content || "";
            const requestThinkHard =
                thinkHard || /详细分析|完整版|深度分析|深度模式/.test(lastUserMessage);

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
                    thinkHard: requestThinkHard,
                    sessionId: sessionId || undefined,
                }),
                signal: abortControllerRef.current.signal,
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // 记录后端分配/确认的 sessionId
            const newSessionId = response.headers.get("X-Session-Id");
            if (newSessionId) {
                setSessionId(newSessionId);
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
                                // 检查是否包含 follow-up 建议
                                const followUpMatch = json.content.match(/<!--FOLLOWUP:(.*?)-->/);
                                if (followUpMatch) {
                                    try {
                                        const followUps = JSON.parse(followUpMatch[1]);
                                        setFollowUpSuggestions(followUps);
                                    } catch {
                                        // 解析失败就忽略
                                    }
                                    // 从内容中移除 follow-up 标记
                                    json.content = json.content.replace(/<!--FOLLOWUP:.*?-->/g, '');
                                }

                                // 首次收到非思考内容时，计算思考时间
                                if (!hasReceivedFirstContent && !json.content.startsWith('💭') && !json.content.startsWith('🔧') && !json.content.startsWith('📊') && !json.content.startsWith('🧠')) {
                                    thinkingTime = Math.round((Date.now() - startTime) / 1000);
                                    hasReceivedFirstContent = true;
                                }

                                fullContent += json.content;
                                // 更新最后一条消息（移除 follow-up 标记）
                                const cleanContent = fullContent.replace(/<!--FOLLOWUP:.*?-->/g, '').trim();
                                setMessages(prev => {
                                    const updated = [...prev];
                                    updated[updated.length - 1] = {
                                        role: "assistant",
                                        content: cleanContent,
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
            // follow-up 建议现在从 AI 流式响应中动态解析
        }
    };

    const handleSendMessage = async (content: string) => {
        // 清除之前的 follow-up 建议
        setFollowUpSuggestions([]);

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

    // 停止当前 streaming
    const handleStop = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setIsLoading(false);
    };

    // 判断是否有聊天记录（除了系统消息）
    const hasHistory = messages.length > 1;

    // 如果显示历史列表
    if (showHistory) {
        return (
            <ChatHistoryList
                stockCode={selectedStock}
                onSelectSession={async (selectedSessionId) => {
                    try {
                        const history = await utils.ai.getHistory.fetch({
                            sessionId: selectedSessionId,
                        });
                        if (history?.messages?.length > 0) {
                            setMessages(history.messages);
                        } else {
                            setMessages(getDefaultMessages());
                        }
                    } catch (error) {
                        console.error('Failed to load session:', error);
                    }
                    setSessionId(selectedSessionId);
                    setShowHistory(false);
                }}
                onBack={() => setShowHistory(false)}
            />
        );
    }

    return (
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
                    {/* 深度模式 */}
                    <Button
                        variant={thinkHard ? "secondary" : "ghost"}
                        size="sm"
                        className="h-7 px-2 shrink-0"
                        onClick={() => setThinkHard(v => !v)}
                        title="深度模式：更详细分析 + 更多工具调用"
                    >
                        <Brain className="h-4 w-4" />
                        深度
                    </Button>
                    {/* 历史对话按钮 */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 hover:bg-accent transition-colors duration-150 cursor-pointer"
                        onClick={() => setShowHistory(true)}
                        title="历史对话"
                    >
                        <History className="h-4 w-4" />
                    </Button>
                    {/* 新建对话按钮 */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 hover:bg-accent transition-colors duration-150 cursor-pointer"
                        onClick={async () => {
                            setMessages(getDefaultMessages());
                            setFollowUpSuggestions([]);
                            try {
                                const result = await createSessionMutation.mutateAsync({
                                    stockCode: selectedStock || undefined,
                                });
                                setSessionId(result.sessionId);
                            } catch (error) {
                                console.error('Failed to create session:', error);
                                setSessionId(null);
                            }
                        }}
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
                {todoRun && (
                    <div className="px-3 pt-2">
                        <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs transition-all duration-300">
                            <div className="flex items-center justify-between gap-3 mb-2">
                                <span className="font-medium text-foreground flex items-center gap-1.5">
                                    {todoRun.status === "running" ? (
                                        <>
                                            <span className="relative flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                                            </span>
                                            思考规划中...
                                        </>
                                    ) : (
                                        <>
                                            <span className="h-2 w-2 rounded-full bg-muted-foreground/30"></span>
                                            执行记录
                                        </>
                                    )}
                                </span>
                                <span className="text-muted-foreground font-mono text-[10px] opacity-70">
                                    {todoRun.status === 'completed' ? 'Tasks Done' : 'Processing'}
                                </span>
                            </div>
                            <div className="space-y-1.5 pl-1">
                                {todoRun.todos.map((todo, index) => (
                                    <div key={todo.id} className={`flex items-center gap-2 transition-all duration-500 ${todo.status === 'in_progress' ? 'translate-x-1' : ''
                                        }`}>
                                        <div className={`shrink-0 w-4 flex justify-center ${todo.status === 'in_progress' ? 'animate-spin' : ''
                                            }`}>
                                            {formatTodoStatus(todo.status)}
                                        </div>
                                        <span className={`truncate text-[11px] ${todo.status === 'in_progress'
                                            ? 'text-primary font-medium'
                                            : todo.status === 'failed'
                                                ? 'text-red-500 line-through opacity-80'
                                                : 'text-muted-foreground'
                                            }`}>
                                            {formatTodoTitle(todo.title)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
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
                        suggestedPrompts={[]}
                        onRegenerate={handleRegenerate}
                        onStop={handleStop}
                        followUpSuggestions={followUpSuggestions}
                    />
                </div>
            </div>
        </div>
    );
}


function formatTodoTitle(title: string) {
    if (!title) return "执行任务";
    if (title.includes('get_stock_quote')) return '📊 获取实时行情';
    if (title.includes('analyze_stock_technical')) return '📈 技术面深度扫描';
    if (title.includes('get_fund_flow_history')) return '💰 追踪资金历史趋势'; // 优先匹配长名称
    if (title.includes('get_fund_flow')) return '💰 追踪主力资金';
    if (title.includes('get_market_status')) return '🌍 研判大盘环境';
    if (title.includes('comprehensive_analysis')) return '🏥 全方位诊断中...';
    if (title.includes('get_trading_memory')) return '🧠 回顾交易记忆';
    if (title.includes('get_guba_hot_rank')) return '🔥 监测市场热度';
    if (title.includes('get_market_news')) return '📰 收集市场资讯';
    if (title.includes('analyze_minute_patterns')) return '⏱️ 分时形态识别';

    // 生成建议等其他步骤
    if (title.includes('生成')) return '✍️ ' + title;
    if (title.includes('调用工具')) return '🛠️ ' + title.replace('调用工具: ', '');

    return title;
}

function formatTodoStatus(status: string) {
    switch (status) {
        case "completed":
            return "✅";
        case "failed":
            return "❌";
        case "in_progress":
            return "⏳";
        case "skipped":
            return "⏭️";
        default:
            return "•";
    }
}

function formatTodoRunStatus(status: string) {
    switch (status) {
        case "completed":
            return "已完成";
        case "failed":
            return "失败";
        case "running":
            return "进行中";
        default:
            return "未知";
    }
}

function getTodoStatusClass(status: string) {
    switch (status) {
        case "completed":
            return "text-emerald-500";
        case "failed":
            return "text-red-500";
        case "in_progress":
            return "text-amber-500";
        case "skipped":
            return "text-muted-foreground";
        default:
            return "text-muted-foreground";
    }
}
