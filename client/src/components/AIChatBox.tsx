import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Loader2, Send, User, Sparkles, ArrowUp, Brain, Globe, Paperclip, Mic, Copy, ThumbsUp, ThumbsDown, RotateCcw, Zap, Square } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Streamdown } from "streamdown";
import { motion, AnimatePresence } from "framer-motion";

export type Message = {
  role: "system" | "user" | "assistant";
  content: string;
  thinkingTime?: number;
};

export type AIChatBoxProps = {
  messages: Message[];
  onSendMessage: (content: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
  height?: string | number;
  emptyStateMessage?: string;
  suggestedPrompts?: string[];
  onRegenerate?: () => void;
  onStop?: () => void; // 停止 streaming 的回调
  followUpSuggestions?: string[]; // AI 回复后的 follow-up 问题
};

const TypingIndicator = () => (
  <div className="flex items-center gap-1 px-3 py-2">
    <motion.div
      className="w-1.5 h-1.5 rounded-full bg-primary/70"
      animate={{ opacity: [0.4, 1, 0.4] }}
      transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut", delay: 0 }}
    />
    <motion.div
      className="w-1.5 h-1.5 rounded-full bg-primary/70"
      animate={{ opacity: [0.4, 1, 0.4] }}
      transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
    />
    <motion.div
      className="w-1.5 h-1.5 rounded-full bg-primary/70"
      animate={{ opacity: [0.4, 1, 0.4] }}
      transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
    />
  </div>
);

// 打字光标 - streaming 时显示在内容末尾
const StreamingCursor = () => (
  <motion.span
    className="inline-block w-0.5 h-4 bg-primary ml-0.5 align-middle"
    animate={{ opacity: [1, 0] }}
    transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
  />
);

const AIAvatar = ({ isThinking = false }: { isThinking?: boolean }) => (
  <div className="relative">
    <motion.div
      className="size-9 rounded-xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent flex items-center justify-center border border-primary/20 backdrop-blur-sm"
      animate={isThinking ? {
        boxShadow: ["0 0 0 0 rgba(var(--primary), 0)", "0 0 20px 4px rgba(var(--primary), 0.3)", "0 0 0 0 rgba(var(--primary), 0)"]
      } : {}}
      transition={{ duration: 2, repeat: isThinking ? Infinity : 0 }}
    >
      <Zap className="size-4 text-primary" />
    </motion.div>
    {isThinking && (
      <motion.div
        className="absolute -inset-1 rounded-xl bg-primary/20 blur-md -z-10"
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
    )}
  </div>
);

const UserAvatar = () => (
  <div className="size-9 rounded-xl bg-gradient-to-br from-secondary via-secondary/80 to-secondary/60 flex items-center justify-center border border-border/50">
    <User className="size-4 text-secondary-foreground" />
  </div>
);

const EmptyState = ({ message, prompts, onPromptClick }: {
  message: string;
  prompts?: string[];
  onPromptClick: (prompt: string) => void;
}) => (
  <div className="flex h-full flex-col items-center justify-center p-8">
    <motion.div
      className="relative mb-8"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Animated orbital rings */}
      <motion.div
        className="absolute inset-0 w-32 h-32 -m-8 rounded-full border border-primary/10"
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute inset-0 w-24 h-24 -m-4 rounded-full border border-primary/20"
        animate={{ rotate: -360 }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
      />

      {/* Central icon */}
      <motion.div
        className="relative size-16 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent flex items-center justify-center border border-primary/30 backdrop-blur-sm"
        animate={{
          boxShadow: ["0 0 30px 0 rgba(var(--primary), 0.1)", "0 0 50px 10px rgba(var(--primary), 0.2)", "0 0 30px 0 rgba(var(--primary), 0.1)"]
        }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        <Zap className="size-7 text-primary" />
      </motion.div>
    </motion.div>

    <motion.p
      className="text-sm text-muted-foreground mb-6 text-center max-w-xs"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      {message}
    </motion.p>

    {prompts && prompts.length > 0 && (
      <motion.div
        className="flex flex-wrap justify-center gap-2 max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        {prompts.map((prompt, index) => (
          <motion.button
            key={prompt}
            onClick={() => onPromptClick(prompt)}
            className="group px-4 py-2.5 rounded-xl text-sm text-muted-foreground bg-card/50 border border-border/50 hover:border-primary/50 hover:bg-primary/5 hover:text-foreground transition-all duration-300"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 + index * 0.1 }}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="flex items-center gap-2">
              <Sparkles className="size-3.5 text-primary/60 group-hover:text-primary transition-colors" />
              {prompt}
            </span>
          </motion.button>
        ))}
      </motion.div>
    )}
  </div>
);

export function AIChatBox({
  messages,
  onSendMessage,
  isLoading = false,
  placeholder = "Type your message...",
  className,
  height = "600px",
  emptyStateMessage = "Start a conversation with AI",
  suggestedPrompts,
  onRegenerate,
  onStop,
  followUpSuggestions,
}: AIChatBoxProps) {
  const [input, setInput] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [feedbackIndex, setFeedbackIndex] = useState<{ index: number; type: 'up' | 'down' } | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputAreaRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const displayMessages = messages.filter((msg) => msg.role !== "system");

  const [minHeightForLastMessage, setMinHeightForLastMessage] = useState(0);

  useEffect(() => {
    if (containerRef.current && inputAreaRef.current) {
      const containerHeight = containerRef.current.offsetHeight;
      const inputHeight = inputAreaRef.current.offsetHeight;
      const scrollAreaHeight = containerHeight - inputHeight;
      const userMessageReservedHeight = 56;
      const calculatedHeight = scrollAreaHeight - 32 - userMessageReservedHeight;
      setMinHeightForLastMessage(Math.max(0, calculatedHeight));
    }
  }, []);

  // 自动滚动到底部 - 当消息变化时（包括 streaming 更新）
  useEffect(() => {
    if (displayMessages.length > 0) {
      scrollToBottom();
    }
  }, [displayMessages]);

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

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    scrollToBottom();
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handlePromptClick = (prompt: string) => {
    onSendMessage(prompt);
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex flex-col bg-gradient-to-b from-card via-card to-card/95 text-card-foreground rounded-2xl border border-border/50 shadow-xl overflow-hidden",
        className
      )}
      style={{ height }}
    >
      {/* Messages Area */}
      <div ref={scrollAreaRef} className="flex-1 overflow-hidden">
        {displayMessages.length === 0 ? (
          <EmptyState
            message={emptyStateMessage}
            prompts={suggestedPrompts}
            onPromptClick={handlePromptClick}
          />
        ) : (
          <ScrollArea className="h-full">
            <div className="space-y-6 p-5">
              <AnimatePresence>
                {displayMessages.map((message, index) => {
                  const isLastMessage = index === displayMessages.length - 1;
                  const isAssistantThinking = isLoading && isLastMessage && message.role === "assistant" && !message.content;
                  const shouldApplyMinHeight = index === displayMessages.length - 1;

                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
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
                        <AIAvatar isThinking={isAssistantThinking} />
                      )}

                      <div className="flex flex-col max-w-[80%] min-w-0 overflow-hidden">
                        {message.role === "assistant" && message.thinkingTime && message.thinkingTime > 0 && (
                          <motion.div
                            className="flex items-center gap-1.5 text-xs text-primary/70 mb-2 ml-1"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                          >
                            <Brain className="size-3" />
                            <span>思考了 {message.thinkingTime}s</span>
                          </motion.div>
                        )}
                        <div
                          className={cn(
                            "rounded-2xl px-4 py-3 transition-all duration-200",
                            message.role === "user"
                              ? "bg-gradient-to-br from-primary via-primary to-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
                              : "bg-muted/50 text-foreground border border-border/30 backdrop-blur-sm"
                          )}
                        >
                          {message.role === "assistant" ? (
                            isAssistantThinking ? (
                              <TypingIndicator />
                            ) : (
                              <div className="overflow-x-hidden">
                                <div className="prose prose-sm dark:prose-invert max-w-none min-w-0 [&_pre]:w-full [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:whitespace-pre-wrap [&_code]:break-words [&_pre_code]:break-words [&_p]:leading-relaxed">
                                  <Streamdown>{message.content}</Streamdown>
                                  {/* Streaming 时显示闪烁光标 */}
                                  {isLoading && isLastMessage && message.content && (
                                    <StreamingCursor />
                                  )}
                                </div>
                                {message.content && !isLoading && (
                                  <motion.div
                                    className="flex items-center gap-0.5 mt-4 pt-3 border-t border-border/30"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.2 }}
                                  >
                                    <ActionButton
                                      icon={Copy}
                                      active={copiedIndex === index}
                                      activeColor="text-emerald-500"
                                      title={copiedIndex === index ? "已复制!" : "复制"}
                                      onClick={() => {
                                        navigator.clipboard.writeText(message.content);
                                        setCopiedIndex(index);
                                        setTimeout(() => setCopiedIndex(null), 2000);
                                      }}
                                    />
                                    <ActionButton
                                      icon={ThumbsUp}
                                      active={feedbackIndex?.index === index && feedbackIndex?.type === 'up'}
                                      activeColor="text-emerald-500"
                                      title="有帮助"
                                      onClick={() => setFeedbackIndex({ index, type: 'up' })}
                                    />
                                    <ActionButton
                                      icon={ThumbsDown}
                                      active={feedbackIndex?.index === index && feedbackIndex?.type === 'down'}
                                      activeColor="text-rose-500"
                                      title="没帮助"
                                      onClick={() => setFeedbackIndex({ index, type: 'down' })}
                                    />
                                    {isLastMessage && onRegenerate && (
                                      <ActionButton
                                        icon={RotateCcw}
                                        title="重新生成"
                                        onClick={onRegenerate}
                                      />
                                    )}
                                  </motion.div>
                                )}

                                {/* Follow-up 建议 - 仅在最后一条 AI 回复后显示 */}
                                {isLastMessage && followUpSuggestions && followUpSuggestions.length > 0 && (
                                  <motion.div
                                    className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-border/20"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                  >
                                    {followUpSuggestions.slice(0, 3).map((suggestion, idx) => (
                                      <motion.button
                                        key={idx}
                                        onClick={() => onSendMessage(suggestion)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground bg-accent/30 hover:bg-accent/50 hover:text-foreground rounded-lg border border-border/30 hover:border-border/50 transition-all duration-200"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                      >
                                        <Sparkles className="size-3 text-primary/60" />
                                        <span className="truncate max-w-[180px]">{suggestion}</span>
                                      </motion.button>
                                    ))}
                                  </motion.div>
                                )}
                              </div>
                            )
                          ) : (
                            <p className="whitespace-pre-wrap text-sm leading-relaxed">
                              {message.content}
                            </p>
                          )}
                        </div>
                      </div>

                      {message.role === "user" && <UserAvatar />}
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {isLoading && displayMessages[displayMessages.length - 1]?.role === "user" && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-3"
                  style={
                    minHeightForLastMessage > 0
                      ? { minHeight: `${minHeightForLastMessage}px` }
                      : undefined
                  }
                >
                  <AIAvatar isThinking />
                  <div className="bg-muted/50 border border-border/30 rounded-2xl backdrop-blur-sm">
                    <TypingIndicator />
                  </div>
                </motion.div>
              )}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Input Area - Modern Glass Style */}
      <div className="p-4 border-t border-border/30 bg-gradient-to-t from-background/80 to-transparent backdrop-blur-sm">
        <form
          ref={inputAreaRef}
          onSubmit={handleSubmit}
          className="relative"
        >
          <div className="relative border border-border/50 rounded-2xl bg-card/80 backdrop-blur-md overflow-hidden transition-all duration-300 focus-within:border-primary/50 focus-within:shadow-lg focus-within:shadow-primary/10">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                if (textareaRef.current) {
                  textareaRef.current.style.height = 'auto';
                  textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
                }
              }}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="w-full border-0 bg-transparent px-4 pt-3.5 pb-14 resize-none min-h-[56px] max-h-[200px] focus-visible:ring-0 focus-visible:ring-offset-0 text-sm placeholder:text-muted-foreground/60"
              rows={1}
            />

            {/* Bottom Toolbar */}
            <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-3 py-2.5">
              <div className="flex items-center gap-1">
                {/* SmartAgent 标识 */}
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 text-xs font-medium">
                  <Brain className="size-3" />
                  <span>SmartAgent</span>
                </div>

                <div className="w-px h-5 bg-border/50 mx-1" />

                <ToolbarButton icon={Paperclip} title="添加附件" />
              </div>

              <div className="flex items-center gap-1.5">
                <ToolbarButton icon={Mic} title="语音输入" />

                {/* 发送/停止按钮 */}
                {isLoading && onStop ? (
                  // 停止按钮
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      type="button"
                      size="icon"
                      onClick={onStop}
                      className="shrink-0 h-9 w-9 rounded-xl bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/30"
                    >
                      <Square className="size-3.5 fill-current" />
                    </Button>
                  </motion.div>
                ) : (
                  // 发送按钮
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      type="submit"
                      size="icon"
                      disabled={!input.trim() || isLoading}
                      className={cn(
                        "shrink-0 h-9 w-9 rounded-xl transition-all duration-300",
                        input.trim() && !isLoading
                          ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      <ArrowUp className="size-4" />
                    </Button>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

const ToolbarButton = ({
  icon: Icon,
  active = false,
  activeColor = "bg-primary/20 text-primary",
  title,
  onClick
}: {
  icon: React.ElementType;
  active?: boolean;
  activeColor?: string;
  title: string;
  onClick?: () => void;
}) => (
  <motion.button
    type="button"
    onClick={onClick}
    className={cn(
      "p-2 rounded-xl transition-all duration-200",
      active
        ? activeColor
        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
    )}
    title={title}
    whileHover={{ scale: 1.1 }}
    whileTap={{ scale: 0.9 }}
  >
    <Icon className="size-4" />
  </motion.button>
);

const ActionButton = ({
  icon: Icon,
  active = false,
  activeColor = "text-primary",
  title,
  onClick
}: {
  icon: React.ElementType;
  active?: boolean;
  activeColor?: string;
  title: string;
  onClick: () => void;
}) => (
  <motion.button
    type="button"
    onClick={onClick}
    className={cn(
      "p-2 rounded-lg transition-all duration-200",
      active ? activeColor : "text-muted-foreground/70 hover:text-foreground hover:bg-accent/30"
    )}
    title={title}
    whileHover={{ scale: 1.15 }}
    whileTap={{ scale: 0.9 }}
  >
    <Icon className="size-3.5" />
  </motion.button>
);
