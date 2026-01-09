import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Loader2, Send, User, Sparkles, Plus, ArrowUp, Brain, Globe, Paperclip, Mic, Copy, ThumbsUp, ThumbsDown, RotateCcw } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Streamdown } from "streamdown";

/**
 * Message type matching server-side LLM Message interface
 */
export type Message = {
  role: "system" | "user" | "assistant";
  content: string;
  /** 思考耗时（秒），仅 assistant 消息可能有此字段 */
  thinkingTime?: number;
};

export type AIChatBoxProps = {
  /**
   * Messages array to display in the chat.
   * Should match the format used by invokeLLM on the server.
   */
  messages: Message[];

  /**
   * Callback when user sends a message.
   * Typically you'll call a tRPC mutation here to invoke the LLM.
   */
  onSendMessage: (content: string) => void;

  /**
   * Whether the AI is currently generating a response
   */
  isLoading?: boolean;

  /**
   * Placeholder text for the input field
   */
  placeholder?: string;

  /**
   * Custom className for the container
   */
  className?: string;

  /**
   * Height of the chat box (default: 600px)
   */
  height?: string | number;

  /**
   * Empty state message to display when no messages
   */
  emptyStateMessage?: string;

  /**
   * Suggested prompts to display in empty state
   * Click to send directly
   */
  suggestedPrompts?: string[];

  /**
   * Thinking mode state
   */
  thinkingMode?: boolean;

  /**
   * Callback when thinking mode changes
   */
  onThinkingModeChange?: (enabled: boolean) => void;

  /**
   * Callback to regenerate the last response
   */
  onRegenerate?: () => void;
};

/**
 * A ready-to-use AI chat box component that integrates with the LLM system.
 *
 * Features:
 * - Matches server-side Message interface for seamless integration
 * - Markdown rendering with Streamdown
 * - Auto-scrolls to latest message
 * - Loading states
 * - Uses global theme colors from index.css
 *
 * @example
 * ```tsx
 * const ChatPage = () => {
 *   const [messages, setMessages] = useState<Message[]>([
 *     { role: "system", content: "You are a helpful assistant." }
 *   ]);
 *
 *   const chatMutation = trpc.ai.chat.useMutation({
 *     onSuccess: (response) => {
 *       // Assuming your tRPC endpoint returns the AI response as a string
 *       setMessages(prev => [...prev, {
 *         role: "assistant",
 *         content: response
 *       }]);
 *     },
 *     onError: (error) => {
 *       console.error("Chat error:", error);
 *       // Optionally show error message to user
 *     }
 *   });
 *
 *   const handleSend = (content: string) => {
 *     const newMessages = [...messages, { role: "user", content }];
 *     setMessages(newMessages);
 *     chatMutation.mutate({ messages: newMessages });
 *   };
 *
 *   return (
 *     <AIChatBox
 *       messages={messages}
 *       onSendMessage={handleSend}
 *       isLoading={chatMutation.isPending}
 *       suggestedPrompts={[
 *         "Explain quantum computing",
 *         "Write a hello world in Python"
 *       ]}
 *     />
 *   );
 * };
 * ```
 */
export function AIChatBox({
  messages,
  onSendMessage,
  isLoading = false,
  placeholder = "Type your message...",
  className,
  height = "600px",
  emptyStateMessage = "Start a conversation with AI",
  suggestedPrompts,
  thinkingMode = false,
  onThinkingModeChange,
  onRegenerate,
}: AIChatBoxProps) {
  const [input, setInput] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [feedbackIndex, setFeedbackIndex] = useState<{ index: number; type: 'up' | 'down' } | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputAreaRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Filter out system messages
  const displayMessages = messages.filter((msg) => msg.role !== "system");

  // Calculate min-height for last assistant message to push user message to top
  const [minHeightForLastMessage, setMinHeightForLastMessage] = useState(0);

  useEffect(() => {
    if (containerRef.current && inputAreaRef.current) {
      const containerHeight = containerRef.current.offsetHeight;
      const inputHeight = inputAreaRef.current.offsetHeight;
      const scrollAreaHeight = containerHeight - inputHeight;

      // Reserve space for:
      // - padding (p-4 = 32px top+bottom)
      // - user message: 40px (item height) + 16px (margin-top from space-y-4) = 56px
      // Note: margin-bottom is not counted because it naturally pushes the assistant message down
      const userMessageReservedHeight = 56;
      const calculatedHeight = scrollAreaHeight - 32 - userMessageReservedHeight;

      setMinHeightForLastMessage(Math.max(0, calculatedHeight));
    }
  }, []);

  // Scroll to bottom helper function with smooth animation
  const scrollToBottom = () => {
    const viewport = scrollAreaRef.current?.querySelector(
      '[data-radix-scroll-area-viewport]'
    ) as HTMLDivElement;

    if (viewport) {
      requestAnimationFrame(() => {
        viewport.scrollTo({
          top: viewport.scrollHeight,
          behavior: 'smooth'
        });
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    onSendMessage(trimmedInput);
    setInput("");

    // 重置 textarea 高度
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // Scroll immediately after sending
    scrollToBottom();

    // Keep focus on input
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex flex-col bg-card text-card-foreground rounded-lg border shadow-sm",
        className
      )}
      style={{ height }}
    >
      {/* Messages Area */}
      <div ref={scrollAreaRef} className="flex-1 overflow-hidden">
        {displayMessages.length === 0 ? (
          <div className="flex h-full flex-col p-4">
            <div className="flex flex-1 flex-col items-center justify-center gap-6 text-muted-foreground">
              <div className="flex flex-col items-center gap-3">
                <Sparkles className="size-12 opacity-20" />
                <p className="text-sm">{emptyStateMessage}</p>
              </div>

              {suggestedPrompts && suggestedPrompts.length > 0 && (
                <div className="flex max-w-2xl flex-wrap justify-center gap-2">
                  {suggestedPrompts.map((prompt, index) => (
                    <button
                      key={index}
                      onClick={() => onSendMessage(prompt)}
                      disabled={isLoading}
                      className="rounded-lg border border-border bg-card px-4 py-2 text-sm transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="flex flex-col space-y-4 p-4">
              {displayMessages.map((message, index) => {
                // Apply min-height to last message only if NOT loading (when loading, the loading indicator gets it)
                const isLastMessage = index === displayMessages.length - 1;
                const shouldApplyMinHeight =
                  isLastMessage && !isLoading && minHeightForLastMessage > 0;

                return (
                  <div
                    key={index}
                    className={cn(
                      "flex gap-3",
                      message.role === "user"
                        ? "justify-end items-start"
                        : "justify-start items-start"
                    )}
                    style={
                      shouldApplyMinHeight
                        ? { minHeight: `${minHeightForLastMessage}px` }
                        : undefined
                    }
                  >
                    {message.role === "assistant" && (
                      <div className="size-8 shrink-0 mt-1 rounded-full bg-primary/10 flex items-center justify-center">
                        <Sparkles className="size-4 text-primary" />
                      </div>
                    )}

                    <div className="flex flex-col max-w-[80%] min-w-0 overflow-hidden">
                      {/* 思考时间提示 - 仅在 assistant 消息且有 thinkingTime 时显示 */}
                      {message.role === "assistant" && message.thinkingTime && message.thinkingTime > 0 && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5 ml-1">
                          <span>💭</span>
                          <span>思考了 {message.thinkingTime}s</span>
                        </div>
                      )}
                      <div
                        className={cn(
                          "rounded-lg px-4 py-2.5",
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-foreground"
                        )}
                      >
                        {message.role === "assistant" ? (
                          <div className="overflow-x-auto">
                            <div className="prose prose-sm dark:prose-invert max-w-none [&_pre]:overflow-x-auto [&_pre]:max-w-full [&_code]:break-all">
                              <Streamdown>{message.content}</Streamdown>
                            </div>
                            {/* AI 回复操作按钮 - 只在有内容且不在加载时显示 */}
                            {message.content && !isLoading && (
                              <div className="flex items-center gap-1 mt-3 pt-2 border-t border-border/50">
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(message.content);
                                    setCopiedIndex(index);
                                    setTimeout(() => setCopiedIndex(null), 2000);
                                  }}
                                  className={`p-1.5 rounded hover:bg-accent transition-colors ${copiedIndex === index
                                    ? 'text-green-500'
                                    : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                  title={copiedIndex === index ? "已复制!" : "复制"}
                                >
                                  <Copy className="size-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setFeedbackIndex({ index, type: 'up' })}
                                  className={`p-1.5 rounded hover:bg-accent transition-colors ${feedbackIndex?.index === index && feedbackIndex?.type === 'up'
                                    ? 'text-green-500'
                                    : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                  title="有帮助"
                                >
                                  <ThumbsUp className="size-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setFeedbackIndex({ index, type: 'down' })}
                                  className={`p-1.5 rounded hover:bg-accent transition-colors ${feedbackIndex?.index === index && feedbackIndex?.type === 'down'
                                    ? 'text-red-500'
                                    : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                  title="没帮助"
                                >
                                  <ThumbsDown className="size-3.5" />
                                </button>
                                {isLastMessage && onRegenerate && (
                                  <button
                                    type="button"
                                    onClick={onRegenerate}
                                    className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                                    title="重新生成"
                                  >
                                    <RotateCcw className="size-3.5" />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap text-sm">
                            {message.content}
                          </p>
                        )}
                      </div>
                    </div>

                    {message.role === "user" && (
                      <div className="size-8 shrink-0 mt-1 rounded-full bg-secondary flex items-center justify-center">
                        <User className="size-4 text-secondary-foreground" />
                      </div>
                    )}
                  </div>
                );
              })}

              {/* 加载状态 - 三个点脉冲动画 */}
              {isLoading && displayMessages[displayMessages.length - 1]?.role === "user" && (
                <div
                  className="flex items-start gap-3"
                  style={
                    minHeightForLastMessage > 0
                      ? { minHeight: `${minHeightForLastMessage}px` }
                      : undefined
                  }
                >
                  <div className="size-8 shrink-0 mt-1 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="size-4 text-primary" />
                  </div>
                  <div className="flex items-center gap-1.5 h-8 mt-1 px-3 py-2 bg-muted rounded-lg">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Input Area - Manus Style */}
      <div className="p-4 border-t bg-background/50">
        <form
          ref={inputAreaRef}
          onSubmit={handleSubmit}
          className="relative border border-border rounded-2xl bg-card overflow-hidden focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all"
        >
          {/* Textarea */}
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              // Auto-resize
              if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
                textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full border-0 bg-transparent px-4 pt-3 pb-12 resize-none min-h-[52px] max-h-[200px] focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
            rows={1}
          />

          {/* Bottom Toolbar */}
          <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-3 py-2 bg-card">
            {/* Left Icons - 功能按钮组 */}
            <div className="flex items-center gap-0.5">
              {/* Thinking 模式开关 */}
              {onThinkingModeChange && (
                <button
                  type="button"
                  onClick={() => onThinkingModeChange(!thinkingMode)}
                  className={`p-2 rounded-lg transition-all ${thinkingMode
                    ? 'bg-primary/20 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    }`}
                  title={thinkingMode ? "深度思考模式开启" : "开启深度思考"}
                >
                  <Brain className="size-4" />
                </button>
              )}

              {/* 分隔线 */}
              {onThinkingModeChange && (
                <div className="w-px h-4 bg-border mx-1" />
              )}

              {/* 附件按钮 */}
              <button
                type="button"
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                title="添加附件"
              >
                <Paperclip className="size-4" />
              </button>
            </div>

            {/* Right Icons */}
            <div className="flex items-center gap-1">
              {/* 语音按钮 */}
              <button
                type="button"
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                title="语音输入"
              >
                <Mic className="size-4" />
              </button>

              {/* Send Button */}
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || isLoading}
                className={`shrink-0 h-8 w-8 rounded-lg transition-all ${input.trim() && !isLoading
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
                  }`}
              >
                {isLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ArrowUp className="size-4" />
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
