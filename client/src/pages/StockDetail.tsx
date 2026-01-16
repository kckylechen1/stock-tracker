import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, TrendingUp, TrendingDown } from "lucide-react";
import { useRoute, useLocation } from "wouter";
import { useEffect, useRef, useState } from "react";
import { createChart, ColorType } from "lightweight-charts";
import type { IChartApi } from "lightweight-charts";

export default function StockDetail() {
  const [, params] = useRoute("/stocks/:code");
  const [, setLocation] = useLocation();
  const code = params?.code || "";

  const { data: stockDetail, isLoading } = trpc.stocks.getDetail.useQuery(
    { code },
    { enabled: !!code }
  );

  const { data: klineData } = trpc.stocks.getKline.useQuery(
    { code, period: "day", limit: 100 },
    { enabled: !!code }
  );

  const { data: aiAnalysis, isLoading: aiLoading } =
    trpc.analysis.getAnalysis.useQuery({ code }, { enabled: !!code });

  const quote = stockDetail?.quote;
  const basic = stockDetail?.basic;
  const stock = stockDetail?.stock;
  const pctChange = quote?.changePercent || 0;
  const isUp = pctChange > 0;
  const isDown = pctChange < 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container py-4">
          <Button
            variant="ghost"
            onClick={() => setLocation("/")}
            className="mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回
          </Button>
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {stock?.name || code}
              </h1>
              <p className="text-muted-foreground">{code}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-8">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">
            加载中...
          </div>
        ) : !stockDetail || (!stockDetail.quote && !stockDetail.basic) ? (
          <div className="max-w-2xl mx-auto">
            <Card className="p-8 bg-card text-center">
              <div className="mb-4 text-4xl">⚠️</div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                数据获取失败
              </h2>
              <p className="text-muted-foreground mb-4">
                当前 Tushare API 权限不足，无法获取股票数据。
              </p>
              <div className="bg-accent/50 rounded-lg p-4 mb-4 text-left">
                <p className="text-sm text-muted-foreground mb-2">解决方案：</p>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>
                    访问{" "}
                    <a
                      href="https://tushare.pro"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline"
                    >
                      https://tushare.pro
                    </a>{" "}
                    升级账户
                  </li>
                  <li>获取完整权限后，数据将自动显示</li>
                  <li>或联系开发者配置其他数据源</li>
                </ol>
              </div>
              <Button onClick={() => setLocation("/")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                返回首页
              </Button>
            </Card>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 基本信息卡片 */}
            <Card className="p-6 bg-card">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                实时行情
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">当前价</p>
                  <p className="text-3xl font-bold text-foreground">
                    {quote?.price?.toFixed(2) || "--"}
                  </p>
                  <p
                    className="text-sm font-medium mt-1 flex items-center gap-1"
                    style={{
                      color: isUp
                        ? "var(--stock-up)"
                        : isDown
                          ? "var(--stock-down)"
                          : "var(--stock-neutral)",
                    }}
                  >
                    {isUp ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : isDown ? (
                      <TrendingDown className="h-4 w-4" />
                    ) : null}
                    {pctChange > 0 ? "+" : ""}
                    {pctChange?.toFixed(2)}%
                  </p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">开盘价</p>
                  <p className="text-2xl font-semibold text-foreground">
                    {quote?.open?.toFixed(2) || "--"}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">最高价</p>
                  <p className="text-2xl font-semibold text-foreground">
                    {quote?.high?.toFixed(2) || "--"}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">最低价</p>
                  <p className="text-2xl font-semibold text-foreground">
                    {quote?.low?.toFixed(2) || "--"}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">成交量</p>
                  <p className="text-lg font-semibold text-foreground">
                    {quote?.volume
                      ? (quote.volume / 10000).toFixed(2) + "万手"
                      : "--"}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">成交额</p>
                  <p className="text-lg font-semibold text-foreground">
                    {quote?.amount
                      ? (quote.amount / 10000).toFixed(2) + "万元"
                      : "--"}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">换手率</p>
                  <p className="text-lg font-semibold text-foreground">
                    {basic?.turnoverRate?.toFixed(2) || "--"}%
                  </p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">市盈率</p>
                  <p className="text-lg font-semibold text-foreground">
                    {basic?.pe?.toFixed(2) || "--"}
                  </p>
                </div>
              </div>
            </Card>

            {/* K线图卡片 */}
            <Card className="p-6 bg-card">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                K线图
              </h2>
              <KLineChart data={klineData || []} />
            </Card>

            {/* 技术指标卡片 */}
            <Card className="p-6 bg-card">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                技术指标
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-accent">
                  <p className="text-sm text-muted-foreground mb-2">MACD</p>
                  <p className="text-lg font-semibold text-foreground">
                    待计算
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    技术分析指标
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-accent">
                  <p className="text-sm text-muted-foreground mb-2">RSI</p>
                  <p className="text-lg font-semibold text-foreground">
                    待计算
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    相对强弱指标
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-accent">
                  <p className="text-sm text-muted-foreground mb-2">均线系统</p>
                  <p className="text-lg font-semibold text-foreground">
                    待计算
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    MA5/MA20/MA60
                  </p>
                </div>
              </div>
            </Card>

            {/* 资金流向卡片 */}
            <Card className="p-6 bg-card">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                资金流向
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-accent">
                  <p className="text-sm text-muted-foreground mb-2">主力资金</p>
                  <p className="text-lg font-semibold text-foreground">
                    待获取
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    净流入数据
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-accent">
                  <p className="text-sm text-muted-foreground mb-2">北向资金</p>
                  <p className="text-lg font-semibold text-foreground">
                    待获取
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">外资动向</p>
                </div>

                <div className="p-4 rounded-lg bg-accent">
                  <p className="text-sm text-muted-foreground mb-2">换手率</p>
                  <p className="text-lg font-semibold text-foreground">
                    {basic?.turnoverRate?.toFixed(2) || "--"}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    交易活跃度
                  </p>
                </div>
              </div>
            </Card>

            {/* AI分析卡片 */}
            <Card className="p-6 bg-card">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                AI综合分析
              </h2>
              {aiLoading ? (
                <div className="text-sm text-muted-foreground">分析中...</div>
              ) : aiAnalysis ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-accent">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-foreground">
                        技术面分析
                      </p>
                      <span
                        className="text-sm font-semibold"
                        style={{
                          color:
                            (aiAnalysis.technicalScore ?? 0) >= 60
                              ? "var(--stock-up)"
                              : (aiAnalysis.technicalScore ?? 0) <= 40
                                ? "var(--stock-down)"
                                : "var(--stock-neutral)",
                        }}
                      >
                        评分: {aiAnalysis.technicalScore ?? 0}/100
                      </span>
                    </div>
                    <div className="space-y-1">
                      {aiAnalysis.technicalSignals?.map(
                        (signal: string, idx: number) => (
                          <p
                            key={idx}
                            className="text-xs text-muted-foreground"
                          >
                            • {signal}
                          </p>
                        )
                      )}
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-accent">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-foreground">
                        情绪面分析
                      </p>
                      <span className="text-sm text-muted-foreground">
                        评分: {aiAnalysis.sentimentScore}/100
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      功能开发中...
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-accent">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-foreground">
                        资金面分析
                      </p>
                      <span className="text-sm text-muted-foreground">
                        评分: {aiAnalysis.capitalScore}/100
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      功能开发中...
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                    <p className="text-sm font-medium text-foreground mb-2">
                      ⚡ 综合建议
                    </p>
                    <p className="text-sm text-foreground">
                      {typeof aiAnalysis.summary === "string"
                        ? aiAnalysis.summary
                        : "暂无建议"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  无法获取分析数据
                </div>
              )}
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

// K线图组件
function KLineChart({ data }: { data: any[] }) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [period, setPeriod] = useState<"day" | "week" | "month">("day");

  useEffect(() => {
    if (!chartContainerRef.current || data.length === 0) return;

    // 创建图表
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#9CA3AF",
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      grid: {
        vertLines: { color: "rgba(255, 255, 255, 0.05)" },
        horzLines: { color: "rgba(255, 255, 255, 0.05)" },
      },
      timeScale: {
        borderColor: "#2B2B43",
      },
      rightPriceScale: {
        borderColor: "#2B2B43",
      },
    });

    chartRef.current = chart;

    // 添加K线系列
    const candlestickSeries = (chart as any).addCandlestickSeries({
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    // 设置数据
    const formattedData = data
      .map(item => ({
        time: item.time,
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
      }))
      .reverse();

    candlestickSeries.setData(formattedData);

    // 添加成交量系列
    const volumeSeries = (chart as any).addHistogramSeries({
      color: "#26a69a",
      priceFormat: {
        type: "volume",
      },
      priceScaleId: "",
    });

    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    const volumeData = data
      .map(item => ({
        time: item.time,
        value: item.volume,
        color: item.close >= item.open ? "#22c55e80" : "#ef444480",
      }))
      .reverse();

    volumeSeries.setData(volumeData);

    // 响应式处理
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [data]);

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <Button
          size="sm"
          variant={period === "day" ? "default" : "outline"}
          onClick={() => setPeriod("day")}
        >
          日K
        </Button>
        <Button
          size="sm"
          variant={period === "week" ? "default" : "outline"}
          onClick={() => setPeriod("week")}
        >
          周K
        </Button>
        <Button
          size="sm"
          variant={period === "month" ? "default" : "outline"}
          onClick={() => setPeriod("month")}
        >
          月K
        </Button>
      </div>
      <div ref={chartContainerRef} className="w-full" />
    </div>
  );
}
