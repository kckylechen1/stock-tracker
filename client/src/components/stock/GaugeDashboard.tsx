/**
 * Gauge 仪表盘组件 - 未来感数字风格
 * 设计灵感：Futuristic Digital Rating Gauge
 * 精致的半圆弧形渐变 + 优雅指针 + 信号标签
 * A股规则：红涨绿跌
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

// 信号配置 (A股: 红涨绿跌)
const signalConfig: Record<string, { label: string; labelEn: string; color: string; bgColor: string }> = {
    'Strong Buy': { label: '强买信号', labelEn: 'STRONG BUY', color: '#dc2626', bgColor: 'rgba(220, 38, 38, 0.12)' },
    'Buy': { label: '买入信号', labelEn: 'BUY SIGNAL', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.12)' },
    'Neutral': { label: '中性', labelEn: 'NEUTRAL', color: '#6b7280', bgColor: 'rgba(107, 114, 128, 0.12)' },
    'Sell': { label: '卖出信号', labelEn: 'SELL SIGNAL', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.12)' },
    'Strong Sell': { label: '强卖信号', labelEn: 'STRONG SELL', color: '#16a34a', bgColor: 'rgba(22, 163, 74, 0.12)' },
};

// 维度配置
const dimensionConfig: Record<string, { label: string; labelEn: string }> = {
    trend: { label: '趋势强度', labelEn: 'TREND' },
    momentum: { label: '动量', labelEn: 'MOMENTUM' },
    volatility: { label: '波动率', labelEn: 'VOLATILITY' },
    volume: { label: '量能', labelEn: 'VOLUME' },
};

// 获取维度信号
function getDimensionSignal(value: number): { label: string; color: string } {
    if (value >= 50) return { label: '强势', color: '#dc2626' };
    if (value >= 20) return { label: '看多', color: '#ef4444' };
    if (value > -20) return { label: '中性', color: '#6b7280' };
    if (value > -50) return { label: '看空', color: '#22c55e' };
    return { label: '弱势', color: '#16a34a' };
}

export function GaugeDashboard({ data, loading = false, compact = false }: GaugeDashboardProps) {
    // 计算指针角度 (-100 ~ +100 映射到 -90° ~ 90°)
    const needleRotation = useMemo(() => {
        if (!data) return 0;
        return (data.score / 100) * 90;
    }, [data]);

    const signal = data ? signalConfig[data.signal] : signalConfig['Neutral'];

    // 紧凑模式
    if (compact) {
        return (
            <div className="inline-flex items-center gap-2">
                {loading ? (
                    <span className="text-muted-foreground text-sm">--</span>
                ) : data ? (
                    <>
                        <span
                            className="text-base font-bold tabular-nums"
                            style={{ color: signal.color }}
                        >
                            {data.score > 0 ? '+' : ''}{data.score.toFixed(0)}
                        </span>
                        <span
                            className="text-xs font-semibold px-2 py-0.5 rounded-full"
                            style={{
                                color: signal.color,
                                backgroundColor: signal.bgColor
                            }}
                        >
                            {signal.label}
                        </span>
                    </>
                ) : (
                    <span className="text-muted-foreground text-sm">--</span>
                )}
            </div>
        );
    }

    return (
        <div className="gauge-dashboard p-3">
            {loading ? (
                <div className="flex items-center justify-center h-48">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                        <span className="text-muted-foreground text-sm font-medium">分析中...</span>
                    </div>
                </div>
            ) : data ? (
                <div className="flex flex-col items-center">
                    {/* 主仪表盘区域 */}
                    <div className="relative w-full max-w-[280px] aspect-[2/1.15]">
                        <svg 
                            className="w-full h-full" 
                            viewBox="0 0 200 115"
                            style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.08))' }}
                        >
                            <defs>
                                {/* 主渐变 - 更丰富的色彩层次 */}
                                <linearGradient id="gaugeArcGradient" x1="0%" x2="100%" y1="0%" y2="0%">
                                    <stop offset="0%" stopColor="#16a34a" />
                                    <stop offset="20%" stopColor="#22c55e" />
                                    <stop offset="40%" stopColor="#eab308" />
                                    <stop offset="50%" stopColor="#f59e0b" />
                                    <stop offset="60%" stopColor="#f97316" />
                                    <stop offset="80%" stopColor="#ef4444" />
                                    <stop offset="100%" stopColor="#dc2626" />
                                </linearGradient>
                                
                                {/* 发光效果 */}
                                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                                    <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                                    <feMerge>
                                        <feMergeNode in="coloredBlur"/>
                                        <feMergeNode in="SourceGraphic"/>
                                    </feMerge>
                                </filter>

                                {/* 指针阴影 */}
                                <filter id="needleShadow" x="-50%" y="-50%" width="200%" height="200%">
                                    <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.3"/>
                                </filter>
                            </defs>

                            {/* 背景轨道 - 更柔和 */}
                            <path
                                d="M 15 100 A 85 85 0 0 1 185 100"
                                fill="none"
                                stroke="currentColor"
                                className="text-muted/20"
                                strokeWidth="16"
                                strokeLinecap="round"
                            />

                            {/* 主渐变轨道 */}
                            <path
                                d="M 15 100 A 85 85 0 0 1 185 100"
                                fill="none"
                                stroke="url(#gaugeArcGradient)"
                                strokeWidth="16"
                                strokeLinecap="round"
                                filter="url(#glow)"
                            />

                            {/* 刻度线 */}
                            {[-90, -67.5, -45, -22.5, 0, 22.5, 45, 67.5, 90].map((angle, i) => {
                                const rad = (angle * Math.PI) / 180;
                                const innerR = 70;
                                const outerR = i % 2 === 0 ? 78 : 74;
                                const x1 = 100 + innerR * Math.cos(rad - Math.PI);
                                const y1 = 100 + innerR * Math.sin(rad - Math.PI);
                                const x2 = 100 + outerR * Math.cos(rad - Math.PI);
                                const y2 = 100 + outerR * Math.sin(rad - Math.PI);
                                return (
                                    <line
                                        key={angle}
                                        x1={x1}
                                        y1={y1}
                                        x2={x2}
                                        y2={y2}
                                        stroke="currentColor"
                                        className="text-muted-foreground/40"
                                        strokeWidth={i % 2 === 0 ? 2 : 1}
                                        strokeLinecap="round"
                                    />
                                );
                            })}

                            {/* 指针组 */}
                            <g
                                filter="url(#needleShadow)"
                                style={{ 
                                    transform: `rotate(${needleRotation}deg)`, 
                                    transformOrigin: '100px 100px',
                                    transition: 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)'
                                }}
                            >
                                {/* 指针主体 - 更优雅的锥形 */}
                                <path
                                    d="M 97 100 L 100 25 L 103 100 Z"
                                    fill="currentColor"
                                    className="text-foreground"
                                />
                                {/* 指针尖端圆点 */}
                                <circle
                                    cx="100"
                                    cy="25"
                                    r="4"
                                    fill="currentColor"
                                    className="text-foreground"
                                />
                            </g>

                            {/* 中心装饰圆 */}
                            <circle
                                cx="100"
                                cy="100"
                                r="12"
                                fill="currentColor"
                                className="text-card"
                                stroke="currentColor"
                                strokeWidth="3"
                                style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
                            />
                            <circle
                                cx="100"
                                cy="100"
                                r="6"
                                fill="currentColor"
                                className="text-foreground"
                            />
                        </svg>

                    </div>

                    {/* 信号标签 - 放在仪表盘下方，避免被指针遮挡 */}
                    <div className="mt-2 flex justify-center">
                        <div
                            className="px-5 py-2 rounded-full font-bold text-sm tracking-widest uppercase whitespace-nowrap"
                            style={{
                                color: signal.color,
                                backgroundColor: signal.bgColor,
                                border: `1.5px solid ${signal.color}30`,
                                boxShadow: `0 4px 14px ${signal.color}20`
                            }}
                        >
                            {signal.label}
                        </div>
                    </div>

                    {/* 四维度指标卡片 */}
                    <div className="w-full mt-4 pt-3 border-t border-border/60 grid grid-cols-4 gap-1">
                        {Object.entries(data.dimensions).map(([key, value]) => {
                            const dimSignal = getDimensionSignal(value);
                            const config = dimensionConfig[key];
                            return (
                                <div 
                                    key={key} 
                                    className="text-center py-1.5 rounded-lg transition-colors hover:bg-muted/30"
                                >
                                    <h4 className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-1">
                                        {config.label}
                                    </h4>
                                    <div
                                        className="text-xl font-bold leading-tight"
                                        style={{ color: dimSignal.color }}
                                    >
                                        {dimSignal.label}
                                    </div>
                                    <div className="text-xs text-muted-foreground/60 mt-0.5 font-mono tabular-nums">
                                        {value > 0 ? '+' : ''}{value.toFixed(0)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-3">
                        <svg className="w-8 h-8 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" strokeLinecap="round"/>
                        </svg>
                    </div>
                    <span className="text-sm font-medium">暂无评分数据</span>
                </div>
            )}
        </div>
    );
}

export default GaugeDashboard;
