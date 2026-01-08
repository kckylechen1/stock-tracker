/**
 * Gauge 仪表盘组件 - 半圆仪表盘风格
 * 设计灵感：TradingView Summary Gauge
 * 左侧红色(强卖) → 中间灰色(中性) → 右侧绿色(强买)
 * A股规则：红涨绿跌，所以反过来
 */

import { useMemo } from 'react';

export interface GaugeScore {
    score: number; // -100 ~ +100
    signal: 'Strong Buy' | 'Buy' | 'Neutral' | 'Sell' | 'Strong Sell';
    confidence: number; // 0 ~ 1
    dimensions: {
        trend: number;
        momentum: number;
        volatility: number;
        volume: number;
    };
}

interface GaugeDashboardProps {
    data: GaugeScore | null;
    loading?: boolean;
    compact?: boolean;
}

// 信号中文 + 颜色 (A股: 红涨绿跌)
const signalConfig: Record<string, { label: string; color: string }> = {
    'Strong Buy': { label: '强买', color: '#ef4444' },  // 红色
    'Buy': { label: '买入', color: '#f87171' },         // 浅红
    'Neutral': { label: '中性', color: '#9ca3af' },     // 灰色
    'Sell': { label: '卖出', color: '#4ade80' },        // 浅绿
    'Strong Sell': { label: '强卖', color: '#22c55e' }, // 绿色
};

// 维度名称
const dimensionLabels: Record<string, string> = {
    trend: '趋势',
    momentum: '动量',
    volatility: '波动',
    volume: '量能',
};

export function GaugeDashboard({ data, loading = false, compact = false }: GaugeDashboardProps) {
    // 计算指针角度 (-100 ~ +100 映射到 0° ~ 180°)
    // -100 = 0° (左边，强卖/绿色)
    // 0 = 90° (中间，中性)
    // +100 = 180° (右边，强买/红色)
    const needleAngle = useMemo(() => {
        if (!data) return 90; // 默认中间
        return ((data.score + 100) / 200) * 180;
    }, [data]);

    const signal = data ? signalConfig[data.signal] : signalConfig['Neutral'];

    // 紧凑模式
    if (compact) {
        return (
            <div className="inline-flex items-center gap-2 font-mono">
                {loading ? (
                    <span className="text-gray-500 text-sm">--</span>
                ) : data ? (
                    <>
                        <span
                            className="text-sm font-medium"
                            style={{ color: signal.color }}
                        >
                            {data.score > 0 ? '+' : ''}{data.score.toFixed(0)}
                        </span>
                        <span
                            className="text-xs px-1.5 py-0.5 rounded"
                            style={{
                                color: signal.color,
                                backgroundColor: `${signal.color}20`
                            }}
                        >
                            {signal.label}
                        </span>
                    </>
                ) : (
                    <span className="text-gray-500 text-sm">--</span>
                )}
            </div>
        );
    }

    return (
        <div className="gauge-dashboard p-3">
            {loading ? (
                <div className="flex items-center justify-center h-32">
                    <span className="text-gray-600 text-sm">计算中...</span>
                </div>
            ) : data ? (
                <div className="flex flex-col items-center">
                    {/* 半圆仪表盘 */}
                    <div className="relative" style={{ width: 160, height: 90 }}>
                        <svg width="160" height="90" viewBox="0 0 160 90">
                            {/* 渐变定义 - A股红涨绿跌 */}
                            <defs>
                                <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#22c55e" />      {/* 强卖 绿 */}
                                    <stop offset="25%" stopColor="#4ade80" />     {/* 卖出 浅绿 */}
                                    <stop offset="50%" stopColor="#9ca3af" />     {/* 中性 灰 */}
                                    <stop offset="75%" stopColor="#f87171" />     {/* 买入 浅红 */}
                                    <stop offset="100%" stopColor="#ef4444" />    {/* 强买 红 */}
                                </linearGradient>
                            </defs>

                            {/* 半圆背景轨道 */}
                            <path
                                d="M 10 80 A 70 70 0 0 1 150 80"
                                fill="none"
                                stroke="rgba(255,255,255,0.1)"
                                strokeWidth="8"
                                strokeLinecap="round"
                            />

                            {/* 半圆渐变轨道 */}
                            <path
                                d="M 10 80 A 70 70 0 0 1 150 80"
                                fill="none"
                                stroke="url(#gaugeGradient)"
                                strokeWidth="8"
                                strokeLinecap="round"
                            />

                            {/* 指针 */}
                            <g transform={`rotate(${needleAngle - 90}, 80, 80)`}>
                                <line
                                    x1="80"
                                    y1="80"
                                    x2="80"
                                    y2="20"
                                    stroke={signal.color}
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                />
                                <circle
                                    cx="80"
                                    cy="20"
                                    r="4"
                                    fill={signal.color}
                                />
                            </g>

                            {/* 中心点 */}
                            <circle
                                cx="80"
                                cy="80"
                                r="6"
                                fill="#1f2937"
                                stroke="rgba(255,255,255,0.2)"
                                strokeWidth="2"
                            />
                        </svg>
                    </div>

                    {/* 信号标签 */}
                    <div
                        className="mt-2 px-3 py-1 rounded-full text-xs font-medium"
                        style={{
                            color: signal.color,
                            backgroundColor: `${signal.color}20`,
                            border: `1px solid ${signal.color}40`
                        }}
                    >
                        {signal.label}
                    </div>

                    {/* 四维度 */}
                    <div className="w-full mt-3 space-y-1.5 text-xs">
                        {Object.entries(data.dimensions).map(([key, value]) => (
                            <div key={key} className="flex items-center justify-between text-gray-500">
                                <span>{dimensionLabels[key]}</span>
                                <span
                                    className="font-mono"
                                    style={{ color: value > 0 ? '#ef4444' : value < 0 ? '#22c55e' : '#9ca3af' }}
                                >
                                    {value > 0 ? '+' : ''}{value.toFixed(0)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="text-center text-gray-600 py-6 text-sm">
                    暂无数据
                </div>
            )}
        </div>
    );
}

export default GaugeDashboard;
