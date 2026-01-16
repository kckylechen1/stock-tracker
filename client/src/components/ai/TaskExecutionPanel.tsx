import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Loader2,
  SkipForward,
} from "lucide-react";

interface Todo {
  id: string;
  title: string;
  status: string;
}

interface TodoRun {
  status: string;
  todos: Todo[];
}

interface TaskExecutionPanelProps {
  todoRun: TodoRun;
}

export function TaskExecutionPanel({ todoRun }: TaskExecutionPanelProps) {
  // 运行中默认展开，已完成默认收起
  const [isExpanded, setIsExpanded] = useState(todoRun.status === "running");

  const completedCount = todoRun.todos.filter(
    t => t.status === "completed"
  ).length;
  const totalCount = todoRun.todos.length;
  const currentTask = todoRun.todos.find(t => t.status === "in_progress");
  const isRunning = todoRun.status === "running";

  return (
    <div className="px-3 pt-2">
      <div
        className={`rounded-lg border transition-all duration-300 ${
          isRunning
            ? "border-primary/40 bg-primary/5"
            : "border-border/40 bg-muted/20"
        }`}
      >
        {/* 可点击的标题栏 - 始终显示 */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-3 py-2 flex items-center gap-2 text-xs hover:bg-muted/30 rounded-lg transition-colors cursor-pointer"
        >
          {/* 展开/收起图标 */}
          <span className="shrink-0 text-muted-foreground">
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </span>

          {/* 状态指示器 */}
          {isRunning ? (
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
          )}

          {/* 标题和当前任务 */}
          <span className="flex-1 text-left truncate">
            {isRunning ? (
              <span className="text-foreground font-medium">
                {currentTask
                  ? formatTodoTitle(currentTask.title)
                  : "思考规划中..."}
              </span>
            ) : (
              <span className="text-muted-foreground">执行完成</span>
            )}
          </span>

          {/* 进度指示 */}
          <span className="shrink-0 text-muted-foreground font-mono text-[10px]">
            {completedCount}/{totalCount}
          </span>

          {/* 进度条 */}
          <div className="w-12 h-1 bg-muted rounded-full overflow-hidden shrink-0">
            <div
              className={`h-full transition-all duration-500 ${
                isRunning ? "bg-primary" : "bg-emerald-500"
              }`}
              style={{
                width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%`,
              }}
            />
          </div>
        </button>

        {/* 展开后的任务列表 */}
        {isExpanded && (
          <div className="px-3 pb-2 pt-1 border-t border-border/30">
            <div className="space-y-1 pl-5">
              {todoRun.todos.map(todo => (
                <div
                  key={todo.id}
                  className={`flex items-center gap-2 py-0.5 transition-all duration-300 ${
                    todo.status === "in_progress" ? "translate-x-1" : ""
                  }`}
                >
                  <div className="shrink-0 w-4 flex justify-center">
                    {formatTodoStatusIcon(todo.status)}
                  </div>
                  <span
                    className={`truncate text-[11px] ${
                      todo.status === "in_progress"
                        ? "text-primary font-medium"
                        : todo.status === "completed"
                          ? "text-muted-foreground"
                          : todo.status === "failed"
                            ? "text-red-500 line-through opacity-80"
                            : "text-muted-foreground/60"
                    }`}
                  >
                    {formatTodoTitle(todo.title)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function formatTodoTitle(title: string) {
  if (!title) return "执行任务";
  if (title.includes("get_stock_quote")) return "📊 获取实时行情";
  if (title.includes("analyze_stock_technical")) return "📈 技术面深度扫描";
  if (title.includes("get_fund_flow_history")) return "💰 追踪资金历史趋势";
  if (title.includes("get_fund_flow")) return "💰 追踪主力资金";
  if (title.includes("get_market_status")) return "🌍 研判大盘环境";
  if (title.includes("comprehensive_analysis")) return "🏥 全方位诊断中...";
  if (title.includes("get_trading_memory")) return "🧠 回顾交易记忆";
  if (title.includes("get_guba_hot_rank")) return "🔥 监测市场热度";
  if (title.includes("get_market_news")) return "📰 收集市场资讯";
  if (title.includes("analyze_minute_patterns")) return "⏱️ 分时形态识别";
  if (title.includes("get_longhu_bang")) return "🐲 龙虎榜分析";
  if (title.includes("check_aktools_status")) return "🔌 检查服务状态";
  if (title.includes("call_akshare")) return "📡 调用数据接口";
  if (title.includes("get_akshare_endpoint_info")) return "📋 查询接口信息";

  // 生成建议等其他步骤
  if (title.includes("生成")) return "✍️ " + title;
  if (title.includes("调用工具"))
    return "🛠️ " + title.replace("调用工具: ", "");
  if (title.includes("计划工具")) return "📋 " + title.replace("计划工具:", "");

  return title;
}

function formatTodoStatusIcon(status: string) {
  switch (status) {
    case "completed":
      return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
    case "failed":
      return <XCircle className="h-3.5 w-3.5 text-red-500" />;
    case "in_progress":
      return <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />;
    case "skipped":
      return <SkipForward className="h-3.5 w-3.5 text-muted-foreground" />;
    default:
      return (
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
      );
  }
}
