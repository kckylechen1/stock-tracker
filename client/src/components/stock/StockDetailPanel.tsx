import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { createChart, CandlestickSeries, LineSeries, HistogramSeries, CandlestickData, LineData, HistogramData, Time } from "lightweight-charts";
import type { IChartApi } from "lightweight-charts";

export interface StockDetailPanelProps {
    stockCode: string;
}

export function StockDetailPanel({ stockCode }: StockDetailPanelProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const volumeContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const volumeChartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<any>(null);
    const avgSeriesRef = useRef<any>(null); // 均价线引用
    const volumeSeriesRef = useRef<any>(null);
    const priceLineRef = useRef<any>(null); // 昨收价基准线引用
    const [chartType, setChartType] = useState<'timeline' | 'day' | 'week' | 'month'>('day');

    // 悬停时显示的K线数据
    const [hoveredData, setHoveredData] = useState<{
        time: string;
        open: number;
        high: number;
        low: number;
        close: number;
        volume: number;
        change: number;
        changePercent: number;
    } | null>(null);

    // 获取股票详情
    const { data: detail } = trpc.stocks.getDetail.useQuery(
        { code: stockCode },
        { refetchInterval: 30000 }
    );

    // 获取分时数据 - 每5秒刷新一次实现实时更新
    const { data: timelineData } = trpc.stocks.getTimeline.useQuery(
        { code: stockCode },
        {
            enabled: chartType === 'timeline',
            refetchInterval: chartType === 'timeline' ? 5000 : false, // 分时图模式下每5秒刷新
        }
    );

    // 获取K线数据
    const { data: klineData } = trpc.stocks.getKline.useQuery(
        { code: stockCode, period: chartType === 'timeline' ? 'day' : chartType, limit: 60 },
        { enabled: chartType !== 'timeline' }
    );

    // 初始化图表
    useEffect(() => {
        if (!chartContainerRef.current) return;

        // 清理旧图表
        if (chartRef.current) {
            chartRef.current.remove();
            chartRef.current = null;
            seriesRef.current = null;
        }
        if (volumeChartRef.current) {
            volumeChartRef.current.remove();
            volumeChartRef.current = null;
            volumeSeriesRef.current = null;
        }

        // 深色主题配置
        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { color: 'transparent' },
                textColor: '#9ca3af',
            },
            grid: {
                vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
                horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
            },
            crosshair: {
                mode: 1,
                vertLine: {
                    color: 'rgba(255, 255, 255, 0.3)',
                    labelBackgroundColor: '#374151',
                },
                horzLine: {
                    color: 'rgba(255, 255, 255, 0.3)',
                    labelBackgroundColor: '#374151',
                },
            },
            rightPriceScale: {
                visible: true,
                borderColor: 'rgba(255, 255, 255, 0.1)',
                scaleMargins: {
                    top: 0.05,
                    bottom: 0.05,
                },
            },
            timeScale: {
                borderColor: 'rgba(255, 255, 255, 0.1)',
                timeVisible: chartType === 'timeline',
                secondsVisible: false,
                tickMarkFormatter: (time: any, tickMarkType: number) => {
                    // 分时图：显示 HH:mm 格式
                    if (chartType === 'timeline') {
                        if (typeof time === 'number') {
                            // 转换为北京时间 (UTC+8)
                            const date = new Date(time * 1000);
                            const hours = date.getUTCHours();
                            const minutes = date.getUTCMinutes();
                            return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
                        }
                        return String(time);
                    }

                    // K线图：显示日期格式
                    let month: number, day: number, year: number;

                    if (typeof time === 'string') {
                        const parts = time.split('-');
                        year = parseInt(parts[0], 10);
                        month = parseInt(parts[1], 10);
                        day = parseInt(parts[2], 10);
                    } else if (typeof time === 'number') {
                        const date = new Date(time * 1000);
                        year = date.getFullYear();
                        month = date.getMonth() + 1;
                        day = date.getDate();
                    } else {
                        return String(time);
                    }

                    // 月份变化时显示 YYYY-MM，其他只显示日
                    if (tickMarkType === 0 || tickMarkType === 1) {
                        return `${year}-${String(month).padStart(2, '0')}`;
                    }
                    return `${day}`;
                },
            },
            localization: {
                dateFormat: 'yyyy/MM/dd',
            },
            width: chartContainerRef.current.clientWidth,
            height: chartContainerRef.current.clientHeight || 300,
        });

        // 根据图表类型添加不同的系列
        if (chartType === 'timeline') {
            // 分时线（白色/灰色）
            const lineSeries = chart.addSeries(LineSeries, {
                color: '#e5e7eb', // 浅灰色分时线
                lineWidth: 2,
                priceLineVisible: false,
                lastValueVisible: true,
                crosshairMarkerVisible: true,
                crosshairMarkerRadius: 4,
            });
            seriesRef.current = lineSeries;

            // 均价线（黄色）
            const avgSeries = chart.addSeries(LineSeries, {
                color: '#f59e0b', // 黄色均价线
                lineWidth: 1,
                priceLineVisible: false,
                lastValueVisible: false,
                crosshairMarkerVisible: false,
            });
            avgSeriesRef.current = avgSeries;
        } else {
            const candlestickSeries = chart.addSeries(CandlestickSeries, {
                upColor: '#e74c3c',
                downColor: '#2ecc71',
                borderVisible: false,
                wickUpColor: '#e74c3c',
                wickDownColor: '#2ecc71',
                priceLineVisible: false,
                lastValueVisible: false,
            });
            seriesRef.current = candlestickSeries;
        }

        chartRef.current = chart;

        // 创建成交量图表
        if (volumeContainerRef.current && chartType !== 'timeline') {
            const volumeChart = createChart(volumeContainerRef.current, {
                layout: {
                    background: { color: 'transparent' },
                    textColor: '#9ca3af',
                },
                grid: {
                    vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
                    horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
                },
                rightPriceScale: {
                    visible: false,
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                },
                timeScale: {
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    visible: false,
                },
                width: volumeContainerRef.current.clientWidth,
                height: 80,
            });

            const volumeSeries = volumeChart.addSeries(HistogramSeries, {
                priceFormat: {
                    type: 'volume',
                },
                priceScaleId: '',
                priceLineVisible: false,
            });

            volumeChartRef.current = volumeChart;
            volumeSeriesRef.current = volumeSeries;

            // 同步两个图表的时间轴
            const mainTimeScale = chart.timeScale();
            const volumeTimeScale = volumeChart.timeScale();

            mainTimeScale.subscribeVisibleLogicalRangeChange((range) => {
                if (range) {
                    volumeTimeScale.setVisibleLogicalRange(range);
                }
            });

            volumeTimeScale.subscribeVisibleLogicalRangeChange((range) => {
                if (range) {
                    mainTimeScale.setVisibleLogicalRange(range);
                }
            });
        }

        // 响应式调整 - 使用 ResizeObserver 监听容器大小变化
        const handleResize = () => {
            if (chartContainerRef.current && chartRef.current) {
                chartRef.current.applyOptions({
                    width: chartContainerRef.current.clientWidth,
                    height: chartContainerRef.current.clientHeight,
                });
            }
            if (volumeContainerRef.current && volumeChartRef.current) {
                volumeChartRef.current.applyOptions({
                    width: volumeContainerRef.current.clientWidth,
                });
            }
        };

        // 使用 ResizeObserver 监听容器大小变化
        const resizeObserver = new ResizeObserver(() => {
            handleResize();
        });

        if (chartContainerRef.current) {
            resizeObserver.observe(chartContainerRef.current);
        }
        if (volumeContainerRef.current) {
            resizeObserver.observe(volumeContainerRef.current);
        }

        // 延迟触发一次 resize 以确保Flex布局完成后图表尺寸正确
        setTimeout(handleResize, 0);

        window.addEventListener('resize', handleResize);

        return () => {
            resizeObserver.disconnect();
            window.removeEventListener('resize', handleResize);
            if (chartRef.current) {
                chartRef.current.remove();
                chartRef.current = null;
            }
            if (volumeChartRef.current) {
                volumeChartRef.current.remove();
                volumeChartRef.current = null;
            }
        };
    }, [stockCode, chartType]);

    // 更新分时数据
    useEffect(() => {
        if (chartType !== 'timeline' || !seriesRef.current || !timelineData?.timeline) return;

        // 分时线数据
        const priceData: LineData<Time>[] = timelineData.timeline.map((item: any) => {
            const timeParts = item.time.split(' ');
            const dateStr = timeParts[0];
            const timeStr = timeParts[1] || '09:30';
            const [year, month, day] = dateStr.split('-').map(Number);
            const [hour, minute] = timeStr.split(':').map(Number);

            // 创建 UTC 时间戳，这样 lightweight-charts 会正确显示时间
            const timestamp = Date.UTC(year, month - 1, day, hour, minute, 0) / 1000;

            return {
                time: timestamp as Time,
                value: item.price,
            };
        });

        // 均价线数据
        const avgData: LineData<Time>[] = timelineData.timeline.map((item: any) => {
            const timeParts = item.time.split(' ');
            const dateStr = timeParts[0];
            const timeStr = timeParts[1] || '09:30';
            const [year, month, day] = dateStr.split('-').map(Number);
            const [hour, minute] = timeStr.split(':').map(Number);
            const timestamp = Date.UTC(year, month - 1, day, hour, minute, 0) / 1000;

            return {
                time: timestamp as Time,
                value: item.avgPrice,
            };
        });

        if (priceData.length > 0) {
            // 更新分时线
            seriesRef.current.setData(priceData);

            // 更新均价线
            if (avgSeriesRef.current) {
                avgSeriesRef.current.setData(avgData);
            }

            // 添加昨收价基准线（虚线）- 先移除旧的再创建新的
            if (timelineData.preClose && chartRef.current) {
                // 移除旧的基准线
                if (priceLineRef.current) {
                    try {
                        seriesRef.current.removePriceLine(priceLineRef.current);
                    } catch (e) {
                        // 忽略移除失败的情况
                    }
                }
                // 创建新的基准线（虚线样式）
                priceLineRef.current = seriesRef.current.createPriceLine({
                    price: timelineData.preClose,
                    color: 'rgba(128, 128, 128, 0.5)', // 灰色半透明
                    lineWidth: 1,
                    lineStyle: 2, // 虚线
                    axisLabelVisible: true,
                    title: '',
                });
            }

            chartRef.current?.timeScale().fitContent();
        }
    }, [timelineData, chartType]);

    // 更新K线数据
    useEffect(() => {
        if (chartType === 'timeline' || !seriesRef.current || !klineData || klineData.length === 0) return;

        const formattedData: CandlestickData<Time>[] = klineData.map((item: any) => ({
            time: item.time as Time,
            open: item.open,
            high: item.high,
            low: item.low,
            close: item.close,
        }));

        seriesRef.current.setData(formattedData);
        chartRef.current?.timeScale().fitContent();

        // 更新成交量数据
        if (volumeSeriesRef.current) {
            const volumeData: HistogramData<Time>[] = klineData.map((item: any) => ({
                time: item.time as Time,
                value: item.volume,
                color: item.close >= item.open ? '#e74c3c' : '#2ecc71',
            }));
            volumeSeriesRef.current.setData(volumeData);
            volumeChartRef.current?.timeScale().fitContent();
        }

        // 订阅十字线移动事件
        const handleCrosshairMove = (param: any) => {
            if (!param || !param.time || !param.seriesData) {
                setHoveredData(null);
                return;
            }

            const candleData = param.seriesData.get(seriesRef.current);
            if (!candleData) {
                setHoveredData(null);
                return;
            }

            // 找到对应的原始数据获取成交量
            const timeStr = param.time;
            const originalItem = klineData.find((item: any) => item.time === timeStr);
            const volume = originalItem?.volume || 0;

            // 计算涨跌
            const prevIndex = klineData.findIndex((item: any) => item.time === timeStr) - 1;
            const prevClose = prevIndex >= 0 ? klineData[prevIndex].close : candleData.open;
            const change = candleData.close - prevClose;
            const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

            setHoveredData({
                time: timeStr,
                open: candleData.open,
                high: candleData.high,
                low: candleData.low,
                close: candleData.close,
                volume,
                change,
                changePercent,
            });
        };

        chartRef.current?.subscribeCrosshairMove(handleCrosshairMove);

        return () => {
            chartRef.current?.unsubscribeCrosshairMove(handleCrosshairMove);
        };
    }, [klineData, chartType]);

    const quote = detail?.quote;
    const changePercent = quote?.changePercent || 0;
    const isPositive = changePercent > 0;
    const isNegative = changePercent < 0;
    const priceColor = isPositive ? 'text-[#e74c3c]' : isNegative ? 'text-[#2ecc71]' : 'text-foreground';

    return (
        <div className="h-full flex flex-col overflow-auto bg-background">
            {/* 头部信息 - 紧凑风格 */}
            <div className="px-4 py-2 border-b border-border">
                <div className="flex flex-col gap-1">
                    <div className="flex items-baseline gap-3">
                        <span className={`text-4xl font-bold tabular-nums ${priceColor}`}>
                            {quote?.price ? quote.price.toFixed(2) : "--"}
                        </span>
                        <span className={`text-lg tabular-nums ${priceColor}`}>
                            {isPositive ? '+' : ''}{quote?.change?.toFixed(2) || "0.00"}
                        </span>
                        <span className={`text-lg tabular-nums ${priceColor}`}>
                            {isPositive ? '+' : ''}{changePercent.toFixed(2)}%
                        </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-muted-foreground text-lg">{quote?.name || "加载中..."}</span>
                        <span className="text-muted-foreground text-base">({stockCode})</span>
                    </div>
                </div>
            </div>

            {/* 资金指标 - 紧跟股票价格 */}
            <div className="px-4 py-2 border-b border-border bg-card/20">
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-base">
                    <DataCellInline label="💰 今日资金" value="+2.35亿" isUp={true} />
                    <DataCellInline label="🏦 主力净流入" value="+1.82亿" isUp={true} />
                    <DataCellInline label="🏆 资金排名" value="#28/5000+" />
                    <DataCellInline label="🔄 5日换手" value="32.5%" />
                    <DataCellInline label="📊 量比" value="1.85" isUp={true} />
                </div>
            </div>

            {/* 基础交易数据 */}
            <div className="px-4 py-2 border-b border-border">
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-base">
                    <DataCellInline label="今开" value={quote?.open?.toFixed(2)} isUp={quote?.open && quote?.preClose ? quote.open > quote.preClose : undefined} />
                    <DataCellInline label="昨收" value={quote?.preClose?.toFixed(2)} />
                    <DataCellInline label="最高" value={quote?.high?.toFixed(2)} isUp={true} />
                    <DataCellInline label="最低" value={quote?.low?.toFixed(2)} isUp={false} />
                    <DataCellInline label="成交量" value={formatVolume(quote?.volume)} />
                    <DataCellInline label="成交额" value={formatAmount(quote?.amount)} />
                    <DataCellInline label="换手率" value={quote?.turnoverRate ? `${quote.turnoverRate.toFixed(2)}%` : "--"} />
                    <DataCellInline label="市盈率" value={quote?.pe?.toFixed(2)} />
                    <DataCellInline label="总市值" value={formatMarketCap(quote?.marketCap)} />
                    <DataCellInline label="流通市值" value={formatMarketCap(quote?.circulationMarketCap)} />
                </div>
            </div>

            {/* 周期选择 - 腾讯自选股风格 */}
            <div className="px-4 py-2 border-b border-border flex gap-1">
                {[
                    { key: 'timeline', label: '分时' },
                    { key: 'day', label: '日K' },
                    { key: 'week', label: '周K' },
                    { key: 'month', label: '月K' },
                ].map((item) => (
                    <button
                        key={item.key}
                        onClick={() => setChartType(item.key as 'timeline' | 'day' | 'week' | 'month')}
                        className={`px-4 py-1.5 text-sm font-medium transition-colors ${chartType === item.key
                            ? 'text-foreground border-b-2 border-primary'
                            : 'text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            {/* K线图 */}
            <div className="flex-1 px-4 py-2 relative">
                {/* 悬停数据面板 */}
                {hoveredData && chartType !== 'timeline' && (
                    <div className="absolute top-2 left-4 z-10 bg-card/95 border border-border rounded-lg p-3 text-xs shadow-lg backdrop-blur-sm">
                        <div className="text-muted-foreground mb-2">{hoveredData.time}</div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">开盘</span>
                                <span className="tabular-nums">{hoveredData.open.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">收盘</span>
                                <span className={`tabular-nums ${hoveredData.close >= hoveredData.open ? 'text-[#e74c3c]' : 'text-[#2ecc71]'}`}>
                                    {hoveredData.close.toFixed(2)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">最高</span>
                                <span className="tabular-nums text-[#e74c3c]">{hoveredData.high.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">最低</span>
                                <span className="tabular-nums text-[#2ecc71]">{hoveredData.low.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">涨跌幅</span>
                                <span className={`tabular-nums ${hoveredData.changePercent >= 0 ? 'text-[#e74c3c]' : 'text-[#2ecc71]'}`}>
                                    {hoveredData.changePercent >= 0 ? '+' : ''}{hoveredData.changePercent.toFixed(2)}%
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">涨跌额</span>
                                <span className={`tabular-nums ${hoveredData.change >= 0 ? 'text-[#e74c3c]' : 'text-[#2ecc71]'}`}>
                                    {hoveredData.change >= 0 ? '+' : ''}{hoveredData.change.toFixed(2)}
                                </span>
                            </div>
                            <div className="flex justify-between col-span-2">
                                <span className="text-muted-foreground">成交量</span>
                                <span className="tabular-nums">{formatVolume(hoveredData.volume)}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* 图表区域 */}
                <div className="flex flex-1 min-h-0 flex-col">
                    {/* K线图容器 - 最小高度300px确保图表可见 */}
                    <div className="flex-1 relative min-h-[300px]">
                        <div ref={chartContainerRef} className="w-full h-full" />
                    </div>

                    {/* 成交量图 */}
                    {chartType !== 'timeline' && (
                        <div className="h-20 mt-1 relative">
                            <div ref={volumeContainerRef} className="w-full h-full" />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// 紧凑内联数据单元格组件
function DataCellInline({ label, value, isUp }: { label: string; value?: string; isUp?: boolean }) {
    let valueColor = 'text-foreground';
    if (isUp === true) valueColor = 'text-[#e74c3c]';
    if (isUp === false) valueColor = 'text-[#2ecc71]';

    return (
        <span className="whitespace-nowrap">
            <span className="text-muted-foreground">{label}</span>
            <span className={`ml-1 tabular-nums ${valueColor}`}>{value || "--"}</span>
        </span>
    );
}

// 格式化成交量
function formatVolume(volume?: number): string {
    if (!volume) return "--";
    if (volume >= 100000000) {
        return `${(volume / 100000000).toFixed(2)}亿手`;
    } else if (volume >= 10000) {
        return `${(volume / 10000).toFixed(2)}万手`;
    }
    return `${volume}手`;
}

// 格式化成交额
function formatAmount(amount?: number): string {
    if (!amount) return "--";
    if (amount >= 100000000) {
        return `${(amount / 100000000).toFixed(2)}亿`;
    } else if (amount >= 10000) {
        return `${(amount / 10000).toFixed(2)}万`;
    }
    return `${amount}元`;
}

// 格式化市值
function formatMarketCap(cap?: number): string {
    if (!cap) return "--";
    if (cap >= 100000000) {
        return `${(cap / 100000000).toFixed(2)}亿`;
    } else if (cap >= 10000) {
        return `${(cap / 10000).toFixed(2)}万`;
    }
    return `${cap}元`;
}
