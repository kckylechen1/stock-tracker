/**
 * 智能缓存系统
 * 
 * 特性：
 * 1. 区分交易时段/非交易时段的 TTL
 * 2. 基于数据类型的缓存策略
 * 3. 自动清理过期数据
 */

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number;
    dataType: string;
}

// 数据类型到缓存时间的映射（秒）
const CACHE_TTL_CONFIG = {
    // 交易时段（9:30-15:00）
    trading: {
        quote: 60,           // 实时行情：1分钟
        fund_flow: 120,      // 资金流向：2分钟
        technical: 300,      // 技术分析：5分钟
        kline: 300,          // K线数据：5分钟
        market_status: 60,   // 市场状态：1分钟
        default: 180,        // 默认：3分钟
    },
    // 非交易时段
    non_trading: {
        quote: 3600,         // 实时行情：1小时
        fund_flow: 3600,     // 资金流向：1小时
        technical: 7200,     // 技术分析：2小时
        kline: 86400,        // K线数据：1天
        market_status: 3600, // 市场状态：1小时
        default: 1800,       // 默认：30分钟
    },
};

/**
 * 判断当前是否为交易时段
 */
function isMarketHours(): boolean {
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const time = hour * 60 + minute;

    // 周末不是交易时段
    if (day === 0 || day === 6) return false;

    // 上午：9:30 - 11:30
    const morningStart = 9 * 60 + 30;
    const morningEnd = 11 * 60 + 30;

    // 下午：13:00 - 15:00
    const afternoonStart = 13 * 60;
    const afternoonEnd = 15 * 60;

    return (time >= morningStart && time <= morningEnd) ||
        (time >= afternoonStart && time <= afternoonEnd);
}

/**
 * 根据数据类型和当前时段获取 TTL
 */
function getTTL(dataType: string): number {
    const config = isMarketHours() ? CACHE_TTL_CONFIG.trading : CACHE_TTL_CONFIG.non_trading;
    return (config[dataType as keyof typeof config] || config.default) * 1000; // 转换为毫秒
}

/**
 * 从工具名推断数据类型
 */
function inferDataType(toolName: string): string {
    if (toolName.includes('quote')) return 'quote';
    if (toolName.includes('fund_flow')) return 'fund_flow';
    if (toolName.includes('technical') || toolName.includes('analyze')) return 'technical';
    if (toolName.includes('kline')) return 'kline';
    if (toolName.includes('market_status')) return 'market_status';
    return 'default';
}

export class IntelligentCache {
    private cache: Map<string, CacheEntry<any>> = new Map();
    private cleanupInterval: NodeJS.Timeout | null = null;

    constructor() {
        // 每 5 分钟清理一次过期缓存
        this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
    }

    /**
     * 获取或计算缓存
     */
    async getOrCompute<T>(
        key: string,
        computeFn: () => Promise<T>,
        toolName?: string
    ): Promise<T> {
        const cached = this.cache.get(key);

        if (cached && !this.isExpired(cached)) {
            return cached.data as T;
        }

        // 计算新值
        const data = await computeFn();
        const dataType = toolName ? inferDataType(toolName) : 'default';
        const ttl = getTTL(dataType);

        // 存储
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl,
            dataType,
        });

        return data;
    }

    /**
     * 直接获取缓存（如果存在且未过期）
     */
    get<T>(key: string): T | undefined {
        const cached = this.cache.get(key);
        if (cached && !this.isExpired(cached)) {
            return cached.data as T;
        }
        return undefined;
    }

    /**
     * 设置缓存
     */
    set<T>(key: string, data: T, toolName?: string): void {
        const dataType = toolName ? inferDataType(toolName) : 'default';
        const ttl = getTTL(dataType);

        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl,
            dataType,
        });
    }

    /**
     * 检查是否过期
     */
    private isExpired(entry: CacheEntry<any>): boolean {
        return Date.now() - entry.timestamp > entry.ttl;
    }

    /**
     * 清理过期缓存
     */
    private cleanup(): void {
        const now = Date.now();
        const entries = Array.from(this.cache.entries());
        for (const [key, entry] of entries) {
            if (now - entry.timestamp > entry.ttl) {
                this.cache.delete(key);
            }
        }
    }

    /**
     * 获取缓存统计
     */
    getStats(): { size: number; hitRate?: number } {
        return {
            size: this.cache.size,
        };
    }

    /**
     * 清空所有缓存
     */
    clear(): void {
        this.cache.clear();
    }

    /**
     * 销毁（停止定时清理）
     */
    destroy(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        this.cache.clear();
    }
}

// 导出单例
export const toolCache = new IntelligentCache();

// 导出辅助函数
export { isMarketHours, getTTL, inferDataType };
