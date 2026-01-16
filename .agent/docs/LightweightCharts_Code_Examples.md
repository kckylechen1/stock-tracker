# TradingView Lightweight Charts - 实战代码示例集

**完整的、可直接运行的代码示例合集**

---

## 示例1: 基础K线图

```javascript
import { createChart, CandlestickSeries } from "lightweight-charts";

// 创建图表
const chart = createChart(document.getElementById("container"), {
  width: 1000,
  height: 600,
  layout: {
    textColor: "#000000",
    background: { type: "solid", color: "#FFFFFF" },
  },
  timeScale: {
    timeVisible: true,
    secondsVisible: false,
  },
});

// 添加K线系列
const candleSeries = chart.addSeries(CandlestickSeries, {
  upColor: "#26a69a",
  downColor: "#ef5350",
  borderVisible: false,
  wickUpColor: "#26a69a",
  wickDownColor: "#ef5350",
});

// 设置数据
const historicalData = [
  { time: "2023-01-01", open: 100, high: 110, low: 95, close: 105 },
  { time: "2023-01-02", open: 105, high: 115, low: 102, close: 112 },
  { time: "2023-01-03", open: 112, high: 118, low: 110, close: 115 },
  { time: "2023-01-04", open: 115, high: 125, low: 108, close: 120 },
  { time: "2023-01-05", open: 120, high: 128, low: 115, close: 125 },
];

candleSeries.setData(historicalData);
chart.timeScale().fitContent();
```

---

## 示例2: K线图 + 成交量 + 移动平均线

```javascript
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
} from "lightweight-charts";

const chart = createChart(document.getElementById("container"));

// K线图
const candleSeries = chart.addSeries(CandlestickSeries, {
  upColor: "#26a69a",
  downColor: "#ef5350",
});

// 成交量(使用右侧价格轴)
const volumeSeries = chart.addSeries(HistogramSeries, {
  color: "#26a69a",
  priceScaleId: "right",
});

// 移动平均线
const maSeries = chart.addSeries(LineSeries, {
  color: "#2962FF",
  lineWidth: 2,
  title: "MA20",
});

// 设置数据
candleSeries.setData(candleData);
volumeSeries.setData(volumeData);
maSeries.setData(maData);

chart.timeScale().fitContent();
```

---

## 示例3: 实时数据更新

```javascript
import { createChart, CandlestickSeries } from "lightweight-charts";

const chart = createChart(document.getElementById("container"));
const candleSeries = chart.addSeries(CandlestickSeries, {
  upColor: "#26a69a",
  downColor: "#ef5350",
});

// 设置历史数据
candleSeries.setData(historicalData);

// 模拟实时数据流
let currentTime = new Date();

function getNextTimestamp() {
  currentTime.setMinutes(currentTime.getMinutes() + 1);
  return currentTime.toISOString().split("T")[0];
}

// 实时更新
setInterval(() => {
  const newCandle = {
    time: getNextTimestamp(),
    open: Math.random() * 100 + 100,
    high: Math.random() * 130 + 100,
    low: Math.random() * 80 + 100,
    close: Math.random() * 110 + 100,
  };

  candleSeries.update(newCandle);
}, 1000);
```

---

## 示例4: 交互式图例

```javascript
import { createChart, CandlestickSeries } from "lightweight-charts";

const chart = createChart(document.getElementById("container"));
const candleSeries = chart.addSeries(CandlestickSeries, {
  upColor: "#26a69a",
  downColor: "#ef5350",
});

candleSeries.setData(candleData);

// 创建图例
const legend = document.createElement("div");
legend.style.cssText = `
  position: absolute;
  top: 10px;
  left: 10px;
  background: rgba(255, 255, 255, 0.9);
  padding: 15px;
  border-radius: 5px;
  border: 1px solid #999;
  font-size: 14px;
  z-index: 10;
  font-family: monospace;
`;

document.body.appendChild(legend);

// 更新图例
chart.subscribeCrosshairMove(param => {
  if (!param.time || !param.point) {
    legend.innerHTML = "移动鼠标到图表查看数据";
    return;
  }

  const data = param.seriesPrices.get(candleSeries);
  if (data) {
    legend.innerHTML = `
      <div><strong>时间:</strong> ${param.time}</div>
      <div><strong>价格:</strong> ${data.toFixed(2)}</div>
    `;
  }
});
```

---

## 示例5: 添加标记和信号

```javascript
import { createChart, CandlestickSeries } from "lightweight-charts";

const chart = createChart(document.getElementById("container"));
const candleSeries = chart.addSeries(CandlestickSeries);

candleSeries.setData(candleData);

// 添加买卖信号标记
candleSeries.setMarkers([
  {
    time: "2023-01-02",
    position: "belowBar",
    color: "#2962FF",
    shape: "arrowUp",
    text: "BUY",
  },
  {
    time: "2023-01-04",
    position: "aboveBar",
    color: "#FF0000",
    shape: "arrowDown",
    text: "SELL",
  },
]);

// 添加支撑位和阻力位
candleSeries.createPriceLine({
  price: 110,
  color: "#52B788",
  lineWidth: 2,
  lineStyle: 1,
  axisLabelVisible: true,
  title: "支撑位",
});

candleSeries.createPriceLine({
  price: 125,
  color: "#D62828",
  lineWidth: 2,
  lineStyle: 1,
  axisLabelVisible: true,
  title: "阻力位",
});
```

---

## 示例6: 黑暗主题

```javascript
import { createChart, CandlestickSeries } from "lightweight-charts";

const chart = createChart(document.getElementById("container"), {
  width: 1000,
  height: 600,
  layout: {
    background: { type: "solid", color: "#1e1e1e" },
    textColor: "#FFFFFF",
    fontSize: 12,
    fontFamily: "Arial, sans-serif",
  },
  grid: {
    vertLines: { color: "#333333" },
    horzLines: { color: "#333333" },
  },
  timeScale: {
    borderVisible: true,
  },
  rightPriceScale: {
    borderVisible: true,
  },
});

const candleSeries = chart.addSeries(CandlestickSeries, {
  upColor: "#00FF00",
  downColor: "#FF0000",
  borderUpColor: "#00FF00",
  borderDownColor: "#FF0000",
  wickUpColor: "#00FF00",
  wickDownColor: "#FF0000",
});

candleSeries.setData(candleData);
chart.timeScale().fitContent();
```

---

## 示例7: 多图表并排显示

```javascript
import { createChart, CandlestickSeries } from "lightweight-charts";

// 创建多个图表容器
const container1 = document.getElementById("chart1");
const container2 = document.getElementById("chart2");

// 创建两个图表
const chart1 = createChart(container1, { width: 500, height: 400 });
const chart2 = createChart(container2, { width: 500, height: 400 });

// 为两个图表添加系列
const series1 = chart1.addSeries(CandlestickSeries);
const series2 = chart2.addSeries(CandlestickSeries);

// 设置不同的数据
series1.setData(btcData);
series2.setData(ethData);

chart1.timeScale().fitContent();
chart2.timeScale().fitContent();

// 同步时间轴缩放
chart1.timeScale().subscribeVisibleTimeRangeChange(range => {
  if (range) {
    chart2.timeScale().setVisibleRange(range);
  }
});
```

---

## 示例8: WebSocket实时更新

```javascript
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
} from "lightweight-charts";

const chart = createChart(document.getElementById("container"));
const candleSeries = chart.addSeries(CandlestickSeries, {
  upColor: "#26a69a",
  downColor: "#ef5350",
});
const volumeSeries = chart.addSeries(HistogramSeries, {
  color: "#26a69a",
  priceScaleId: "right",
});

// 设置历史数据
candleSeries.setData(historicalCandleData);
volumeSeries.setData(historicalVolumeData);

// 连接WebSocket
const ws = new WebSocket("wss://stream.binance.com:9443/ws/btcusdt@kline_1m");

ws.onmessage = event => {
  const message = JSON.parse(event.data);
  const kline = message.k;

  // 实时更新K线
  candleSeries.update({
    time: kline.t / 1000, // 转换为秒
    open: parseFloat(kline.o),
    high: parseFloat(kline.h),
    low: parseFloat(kline.l),
    close: parseFloat(kline.c),
  });

  // 实时更新成交量
  volumeSeries.update({
    time: kline.t / 1000,
    value: parseFloat(kline.v),
    color: parseFloat(kline.c) >= parseFloat(kline.o) ? "#26a69a" : "#ef5350",
  });
};

ws.onerror = error => {
  console.error("WebSocket错误:", error);
};

ws.onclose = () => {
  console.log("WebSocket已关闭");
};
```

---

## 示例9: 响应式设计

```javascript
import { createChart, CandlestickSeries } from "lightweight-charts";

const container = document.getElementById("container");
let chart = null;

function createResponsiveChart() {
  if (chart) {
    chart.remove();
  }

  const width = container.clientWidth;
  const height = container.clientHeight;

  chart = createChart(container, { width, height });

  const series = chart.addSeries(CandlestickSeries);
  series.setData(candleData);
  chart.timeScale().fitContent();
}

// 初始创建
createResponsiveChart();

// 监听窗口大小变化
window.addEventListener("resize", () => {
  const width = container.clientWidth;
  const height = container.clientHeight;

  chart.applyOptions({ width, height });
});

// 监听方向改变(移动设备)
window.addEventListener("orientationchange", () => {
  setTimeout(createResponsiveChart, 100);
});
```

---

## 示例10: 性能优化 - 大数据集

```javascript
import { createChart, LineSeries } from "lightweight-charts";

const chart = createChart(document.getElementById("container"));
const series = chart.addSeries(LineSeries);

// 优化方案1: 限制数据点数量
function optimizeData(data, maxPoints = 5000) {
  if (data.length <= maxPoints) {
    return data;
  }

  const step = Math.ceil(data.length / maxPoints);
  const optimized = [];

  for (let i = 0; i < data.length; i += step) {
    optimized.push(data[i]);
  }

  return optimized;
}

// 优化方案2: 分批加载
async function loadDataInBatches() {
  const batchSize = 1000;
  const allData = [];

  for (let i = 0; i < 100000; i += batchSize) {
    const batch = await fetchData(i, i + batchSize);
    allData.push(...batch);
  }

  series.setData(optimizeData(allData));
}

loadDataInBatches();

// 优化方案3: 虚拟滚动(仅显示可见部分)
chart.timeScale().subscribeVisibleLogicalRangeChange(range => {
  if (!range) return;

  // 根据可见范围加载数据
  const start = Math.max(0, Math.floor(range.from));
  const end = Math.min(allData.length, Math.ceil(range.to));

  const visibleData = allData.slice(start, end);
  console.log(`显示 ${visibleData.length} 个数据点`);
});
```

---

## 示例11: 自定义颜色和样式

```javascript
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
} from "lightweight-charts";

// 创建自定义主题
function createCustomTheme(isDark = false) {
  const colors = isDark
    ? {
        bg: "#0d1117",
        text: "#e6edf3",
        grid: "#21262d",
        upColor: "#3fb950",
        downColor: "#f85149",
      }
    : {
        bg: "#ffffff",
        text: "#24292e",
        grid: "#eaecef",
        upColor: "#28a745",
        downColor: "#d73a49",
      };

  return colors;
}

const theme = createCustomTheme(true);

const chart = createChart(document.getElementById("container"), {
  layout: {
    background: { type: "solid", color: theme.bg },
    textColor: theme.text,
  },
  grid: {
    vertLines: { color: theme.grid },
    horzLines: { color: theme.grid },
  },
});

const candleSeries = chart.addSeries(CandlestickSeries, {
  upColor: theme.upColor,
  downColor: theme.downColor,
  borderUpColor: theme.upColor,
  borderDownColor: theme.downColor,
  wickUpColor: theme.upColor,
  wickDownColor: theme.downColor,
});

candleSeries.setData(candleData);
```

---

## 示例12: 切换图表类型

```javascript
import {
  createChart,
  CandlestickSeries,
  BarSeries,
  LineSeries,
} from "lightweight-charts";

const chart = createChart(document.getElementById("container"));
let currentSeries = null;
const allData = candleData; // 假设有K线数据

function switchSeriesType(type) {
  // 移除旧系列
  if (currentSeries) {
    chart.removeSeries(currentSeries);
  }

  // 添加新系列
  if (type === "candlestick") {
    currentSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#26a69a",
      downColor: "#ef5350",
    });
  } else if (type === "bar") {
    currentSeries = chart.addSeries(BarSeries, {
      upColor: "#26a69a",
      downColor: "#ef5350",
    });
  } else if (type === "line") {
    currentSeries = chart.addSeries(LineSeries, {
      color: "#2962FF",
    });
  }

  // 设置数据
  currentSeries.setData(allData);
  chart.timeScale().fitContent();
}

// 创建切换按钮
document.getElementById("btn-candlestick").onclick = () =>
  switchSeriesType("candlestick");
document.getElementById("btn-bar").onclick = () => switchSeriesType("bar");
document.getElementById("btn-line").onclick = () => switchSeriesType("line");

// 默认显示K线
switchSeriesType("candlestick");
```

---

## 示例13: 导出数据和图表

```javascript
import { createChart, CandlestickSeries } from "lightweight-charts";

const chart = createChart(document.getElementById("container"));
const series = chart.addSeries(CandlestickSeries);
series.setData(candleData);

// 导出图表为PNG
function exportChartAsImage() {
  const canvas = document.querySelector("canvas");
  const image = canvas.toDataURL("image/png");

  const link = document.createElement("a");
  link.href = image;
  link.download = `chart-${Date.now()}.png`;
  link.click();
}

// 导出数据为CSV
function exportDataAsCSV() {
  let csv = "时间,开盘,最高,最低,收盘\n";

  candleData.forEach(bar => {
    csv += `${bar.time},${bar.open},${bar.high},${bar.low},${bar.close}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `data-${Date.now()}.csv`;
  link.click();

  URL.revokeObjectURL(url);
}

// 添加按钮
document.getElementById("export-chart-btn").onclick = exportChartAsImage;
document.getElementById("export-data-btn").onclick = exportDataAsCSV;
```

---

## 示例14: 键盘快捷键

```javascript
import { createChart, CandlestickSeries } from "lightweight-charts";

const chart = createChart(document.getElementById("container"));
const series = chart.addSeries(CandlestickSeries);
series.setData(candleData);

// 定义快捷键
const shortcuts = {
  ArrowLeft: () => {
    const range = chart.timeScale().getVisibleRange();
    if (!range) return;

    const delta = (range.to - range.from) * 0.1;
    chart.timeScale().setVisibleRange({
      from: range.from - delta,
      to: range.to - delta,
    });
  },

  ArrowRight: () => {
    const range = chart.timeScale().getVisibleRange();
    if (!range) return;

    const delta = (range.to - range.from) * 0.1;
    chart.timeScale().setVisibleRange({
      from: range.from + delta,
      to: range.to + delta,
    });
  },

  "+": () => {
    // 放大
    const range = chart.timeScale().getVisibleRange();
    if (!range) return;

    const mid = (range.from + range.to) / 2;
    const delta = (range.to - range.from) * 0.2;
    chart.timeScale().setVisibleRange({
      from: mid - delta,
      to: mid + delta,
    });
  },

  "-": () => {
    // 缩小
    const range = chart.timeScale().getVisibleRange();
    if (!range) return;

    const mid = (range.from + range.to) / 2;
    const delta = (range.to - range.from) * 0.5;
    chart.timeScale().setVisibleRange({
      from: mid - delta,
      to: mid + delta,
    });
  },

  f: () => {
    // 适配内容
    chart.timeScale().fitContent();
  },
};

// 监听键盘事件
document.addEventListener("keydown", event => {
  const key = event.key;

  if (shortcuts[key]) {
    event.preventDefault();
    shortcuts[key]();
  }
});
```

---

## 示例15: React组件集成

```javascript
import React, { useEffect, useRef } from "react";
import { createChart, CandlestickSeries } from "lightweight-charts";

export const ChartComponent = ({ candleData, volumeData }) => {
  const containerRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // 创建图表
    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      layout: {
        textColor: "#000000",
        background: { type: "solid", color: "#FFFFFF" },
      },
    });

    chartRef.current = chart;

    // 添加系列
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#26a69a",
      downColor: "#ef5350",
    });

    // 设置数据
    candleSeries.setData(candleData);
    chart.timeScale().fitContent();

    // 处理窗口大小变化
    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener("resize", handleResize);

    // 清理
    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [candleData, volumeData]);

  return <div ref={containerRef} style={{ width: "100%", height: "600px" }} />;
};
```

---

**所有示例都可以直接复制使用，根据你的具体需求修改数据和配置。**
