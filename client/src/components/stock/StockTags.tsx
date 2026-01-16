/**
 * 股票标签组件 - 显示技术选股标签
 * 数据来源：AKShare 技术选股榜单
 */

export type StockTagType =
  | "hot" // 热门
  | "rising" // 连涨
  | "falling" // 连跌
  | "volume_up" // 放量
  | "volume_down" // 缩量
  | "price_volume_up" // 量价齐升
  | "price_volume_down" // 量价齐跌
  | "new_high" // 创新高
  | "new_low" // 创新低
  | "break_up" // 突破
  | "break_down" // 跌破
  | "xueqiu_hot" // 雪球热议
  | "institution"; // 机构关注

export interface StockTag {
  type: StockTagType;
  value?: string | number; // 附加值，如连涨天数
}

interface StockTagsProps {
  tags: StockTag[];
  size?: "sm" | "md";
}

// 标签配置 (A股: 红涨绿跌)
const tagConfig: Record<
  StockTagType,
  {
    label: string;
    color: string;
    bg: string;
  }
> = {
  hot: {
    label: "热门",
    color: "#f97316", // orange-500
    bg: "rgba(249, 115, 22, 0.15)",
  },
  rising: {
    label: "连涨",
    color: "#ef4444", // red-500 (涨)
    bg: "rgba(239, 68, 68, 0.15)",
  },
  falling: {
    label: "连跌",
    color: "#22c55e", // green-500 (跌)
    bg: "rgba(34, 197, 94, 0.15)",
  },
  volume_up: {
    label: "放量",
    color: "#ef4444", // red-500
    bg: "rgba(239, 68, 68, 0.15)",
  },
  volume_down: {
    label: "缩量",
    color: "#9ca3af", // gray-400
    bg: "rgba(156, 163, 175, 0.15)",
  },
  price_volume_up: {
    label: "量价齐升",
    color: "#ef4444", // red-500 (涨)
    bg: "rgba(239, 68, 68, 0.15)",
  },
  price_volume_down: {
    label: "量价齐跌",
    color: "#22c55e", // green-500 (跌)
    bg: "rgba(34, 197, 94, 0.15)",
  },
  new_high: {
    label: "新高",
    color: "#ef4444", // red-500 (涨)
    bg: "rgba(239, 68, 68, 0.15)",
  },
  new_low: {
    label: "新低",
    color: "#22c55e", // green-500 (跌)
    bg: "rgba(34, 197, 94, 0.15)",
  },
  break_up: {
    label: "突破",
    color: "#ef4444", // red-500 (涨)
    bg: "rgba(239, 68, 68, 0.15)",
  },
  break_down: {
    label: "跌破",
    color: "#22c55e", // green-500 (跌)
    bg: "rgba(34, 197, 94, 0.15)",
  },
  xueqiu_hot: {
    label: "雪球热议",
    color: "#3b82f6", // blue-500
    bg: "rgba(59, 130, 246, 0.15)",
  },
  institution: {
    label: "机构关注",
    color: "#eab308", // yellow-500
    bg: "rgba(234, 179, 8, 0.15)",
  },
};

export function StockTags({ tags, size = "sm" }: StockTagsProps) {
  if (!tags || tags.length === 0) return null;

  const sizeClasses =
    size === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1";

  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((tag, index) => {
        const config = tagConfig[tag.type];
        if (!config) return null;

        let label = config.label;
        // 附加值处理
        if (tag.value !== undefined) {
          if (tag.type === "rising" || tag.type === "falling") {
            label = `${config.label}${tag.value}天`;
          } else if (tag.type === "new_high" || tag.type === "new_low") {
            label = `${tag.value}${config.label}`;
          }
        }

        return (
          <span
            key={`${tag.type}-${index}`}
            className={`inline-flex items-center rounded font-medium ${sizeClasses}`}
            style={{
              color: config.color,
              backgroundColor: config.bg,
            }}
          >
            {label}
          </span>
        );
      })}
    </div>
  );
}

export default StockTags;
