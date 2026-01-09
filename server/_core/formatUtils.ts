/**
 * 通用格式化工具模块
 * 统一处理金额、数量等数据的格式化显示
 */

/**
 * 智能格式化金额
 * - >= 1亿：显示 X.XX亿
 * - >= 1万 且 < 1亿：显示 X.XX万
 * - < 1万：显示原始数字
 * 
 * @param value 原始金额（单位：元）
 * @param decimals 小数位数，默认2
 * @returns 格式化后的字符串
 */
export function formatMoney(value: number | null | undefined, decimals: number = 2): string {
    if (value == null || isNaN(value)) return '--';

    const absValue = Math.abs(value);
    const sign = value < 0 ? '-' : '';

    if (absValue >= 100000000) {
        // >= 1亿
        return `${sign}${(absValue / 100000000).toFixed(decimals)}亿`;
    } else if (absValue >= 10000) {
        // >= 1万
        return `${sign}${(absValue / 10000).toFixed(decimals)}万`;
    } else {
        // < 1万，显示原始数字
        return `${sign}${absValue.toFixed(decimals)}`;
    }
}

/**
 * 格式化金额（强制亿元）
 * 无论金额大小都以亿为单位显示
 */
export function formatMoneyInYi(value: number | null | undefined, decimals: number = 2): string {
    if (value == null || isNaN(value)) return '--';

    const sign = value < 0 ? '-' : '';
    return `${sign}${(Math.abs(value) / 100000000).toFixed(decimals)}亿`;
}

/**
 * 格式化成交量
 * - >= 1亿股：显示 X.XX亿股
 * - >= 1万股：显示 X.XX万股
 * - < 1万股：显示原始数字
 */
export function formatVolume(value: number | null | undefined, decimals: number = 2): string {
    if (value == null || isNaN(value)) return '--';

    const absValue = Math.abs(value);

    if (absValue >= 100000000) {
        return `${(absValue / 100000000).toFixed(decimals)}亿股`;
    } else if (absValue >= 10000) {
        return `${(absValue / 10000).toFixed(decimals)}万股`;
    } else {
        return `${absValue.toFixed(0)}股`;
    }
}

/**
 * 格式化百分比
 */
export function formatPercent(value: number | null | undefined, decimals: number = 2): string {
    if (value == null || isNaN(value)) return '--';

    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(decimals)}%`;
}

/**
 * 格式化价格
 */
export function formatPrice(value: number | null | undefined, decimals: number = 2): string {
    if (value == null || isNaN(value)) return '--';
    return value.toFixed(decimals);
}

/**
 * 格式化日期为 YYYY-MM-DD
 */
export function formatDate(date: Date | string): string {
    if (typeof date === 'string') {
        // 处理 YYYYMMDD 格式
        if (date.length === 8 && !date.includes('-')) {
            return `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;
        }
        return date;
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * 格式化日期为 YYYYMMDD
 */
export function formatDateCompact(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}
