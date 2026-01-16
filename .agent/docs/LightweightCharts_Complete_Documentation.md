# TradingView Lightweight Charts 完整技术文档

**版本号**: 5.0+  
**最后更新**: 2025年1月  
**适用于LLM集成**: 是

---

## 目录

1. [简介](#简介)
2. [快速开始](#快速开始)
3. [核心概念](#核心概念)
4. [API参考](#api参考)
5. [数据格式](#数据格式)
6. [图表类型](#图表类型)
7. [配置选项](#配置选项)
8. [事件系统](#事件系统)
9. [高级功能](#高级功能)
10. [性能优化](#性能优化)
11. [常见问题](#常见问题)

---

## 简介

### 什么是Lightweight Charts？

Lightweight Charts™ 是由TradingView开发的一个轻量级、高性能的金融图表库。它基于HTML5 Canvas技术构建，专为在Web应用中展示金融数据而设计。

**主要特性**:

- **超小体积**: 仅约45KB，接近静态图像大小
- **高性能**: 使用Canvas硬件加速，支持大量数据点
- **开源免费**: Apache 2.0许可证
- **完全交互**: 支持缩放、平移、交叉线等交互功能
- **多种图表类型**: 支持折线图、面积图、柱状图、K线图等
- **高度可定制**: 丰富的样式和配置选项
- **跨平台**: 支持Web、React、Vue、iOS、Android等

### 系统要求

- **浏览器**: 支持ES2020的现代浏览器
- **环境**: Node.js 14+ (用于开发)
- **JavaScript**: ES6+ 模块或通过CDN引入

---

## 快速开始

### 安装

#### 通过NPM安装

```bash
npm install --save lightweight-charts
```

#### 通过CDN引入

```html
<script src="https://unpkg.com/lightweight-charts/dist/lightweight-charts.standalone.production.js"></script>
```

### 创建第一个图表

#### 使用ES6模块

```javascript
import { createChart, LineSeries } from "lightweight-charts";

// 创建图表
const chart = createChart(document.getElementById("container"), {
  width: 800,
  height: 400,
  layout: {
    textColor: "#000000",
    background: { type: "solid", color: "#FFFFFF" },
  },
});

// 添加折线图系列
const lineSeries = chart.addSeries(LineSeries, {
  color: "#2962FF",
  lineWidth: 2,
});

// 设置数据
lineSeries.setData([
  { time: "2023-01-01", value: 100 },
  { time: "2023-01-02", value: 110 },
  { time: "2023-01-03", value: 105 },
  { time: "2023-01-04", value: 120 },
]);

// 自动调整时间轴
chart.timeScale().fitContent();
```

#### 使用CDN (IIFE方式)

```html
<!DOCTYPE html>
<html>
  <head>
    <script src="https://unpkg.com/lightweight-charts/dist/lightweight-charts.standalone.production.js"></script>
  </head>
  <body>
    <div id="chart" style="width: 800px; height: 400px;"></div>

    <script>
      const chart = LightweightCharts.createChart(
        document.getElementById("chart"),
        { width: 800, height: 400 }
      );

      const lineSeries = chart.addSeries(LightweightCharts.LineSeries);
      lineSeries.setData([
        { time: "2023-01-01", value: 100 },
        { time: "2023-01-02", value: 110 },
      ]);
    </script>
  </body>
</html>
```

---

## 核心概念

### 图表架构

Lightweight Charts采用分层架构:

```
图表容器 (IChartApi)
├── 时间轴 (ITimeScaleApi)
├── 价格轴 (IPriceScaleApi)
├── 多个窗格 (IPaneApi)
│   ├── 系列 (ISeriesApi)
│   ├── 原始图形 (IPrimitive)
│   └── 自定义插件
└── 配置选项
```

### 核心对象

#### IChartApi - 图表对象

主要方法:

- `addSeries(seriesType, options?)` - 添加数据系列
- `removeSeries(series)` - 移除数据系列
- `timeScale()` - 获取时间轴对象
- `priceScale(priceScaleId?)` - 获取价格轴对象
- `panes()` - 获取所有窗格
- `applyOptions(options)` - 应用图表配置
- `getSize()` - 获取图表尺寸
- `handleScroll(delta)` - 处理滚动事件
- `handleScale(delta, target?)` - 处理缩放事件

#### ISeriesApi - 数据系列对象

主要方法:

- `setData(data)` - 设置初始数据
- `update(data)` - 更新或添加数据点
- `applyOptions(options)` - 应用系列配置
- `setMarkers(markers)` - 设置标记
- `attachPrimitive(primitive)` - 附加原始图形
- `detachPrimitive(primitive)` - 分离原始图形

#### ITimeScaleApi - 时间轴对象

主要方法:

- `fitContent()` - 自动调整内容到可见区域
- `setVisibleRange(range)` - 设置可见时间范围
- `getVisibleRange()` - 获取可见时间范围
- `getVisibleLogicalRange()` - 获取可见逻辑范围
- `scrollToPosition(position)` - 滚动到指定位置
- `subscribeCrosshairMove(handler)` - 订阅交叉线移动事件

#### IPriceScaleApi - 价格轴对象

主要方法:

- `width()` - 获取价格轴宽度
- `getVisiblePriceRange()` - 获取可见价格范围
- `setVisiblePriceRange(range)` - 设置可见价格范围

---

## API参考

### 枚举类型 (Enumerations)

#### CrosshairMode - 交叉线模式

```javascript
CrosshairMode.Normal; // 普通模式
CrosshairMode.Magnet; // 磁性模式(吸附到数据点)
CrosshairMode.Hidden; // 隐藏模式
```

#### LineStyle - 线条样式

```javascript
LineStyle.Solid; // 实线
LineStyle.Dotted; // 点线
LineStyle.Dashed; // 虚线
LineStyle.LargeDashed; // 长虚线
LineStyle.SparseDotted; // 稀疏点线
```

#### LineType - 线条类型

```javascript
LineType.Solid; // 实线
LineType.ThinBody; // 细体
LineType.WithSteps; // 带步长
```

#### PriceScaleMode - 价格轴模式

```javascript
PriceScaleMode.Normal; // 正常模式
PriceScaleMode.Logarithmic; // 对数模式
PriceScaleMode.Percentage; // 百分比模式
```

#### TickMarkType - 刻度类型

```javascript
TickMarkType.Year; // 年
TickMarkType.Month; // 月
TickMarkType.DayOfMonth; // 月日
TickMarkType.Time; // 时间
TickMarkType.TimeWithSeconds; // 带秒的时间
```

#### ColorType - 颜色类型

```javascript
ColorType.Solid; // 纯色
ColorType.VerticalGradient; // 竖直渐变
```

### 主要接口 (Interfaces)

#### ChartOptions - 图表配置

```javascript
{
  // 尺寸配置
  width?: number;           // 宽度(像素)，默认600
  height?: number;          // 高度(像素)，默认300

  // 布局配置
  layout?: {
    background?: {
      type: 'solid' | 'gradient';
      color: string;         // 十六进制颜色或rgba
    };
    textColor?: string;       // 文本颜色
    fontFamily?: string;      // 字体家族
    fontSize?: number;        // 字体大小
  };

  // 网格配置
  grid?: {
    vertLines?: {
      color?: string;
      style?: LineStyle;
      visible?: boolean;
    };
    horzLines?: {
      color?: string;
      style?: LineStyle;
      visible?: boolean;
    };
  };

  // 时间轴配置
  timeScale?: {
    timeVisible?: boolean;     // 显示时间
    secondsVisible?: boolean;  // 显示秒
    borderVisible?: boolean;   // 显示边框
    rightOffset?: number;      // 右偏移
    lockRange?: boolean;       // 锁定范围
    shiftVisibleRangeOnNewBar?: boolean;
    allowShiftVisibleRangeOnWhitespaceReplacement?: boolean;
    fixLeftEdge?: boolean;
    fixRightEdge?: boolean;
    tickMarkFormatter?: (time: Time, tickMarkType: TickMarkType) => string;
  };

  // 价格轴配置
  rightPriceScale?: {
    visible?: boolean;
    borderVisible?: boolean;
    autoScale?: boolean;
    mode?: PriceScaleMode;
    invertScale?: boolean;
    alignLabels?: boolean;
    isLog?: boolean;
    scaleMargins?: {
      top?: number;
      bottom?: number;
    };
  };

  // 本地化配置
  localization?: {
    locale?: string;
    priceFormatter?: (price: number) => string;
    timeFormatter?: (businessDay: BusinessDay) => string;
  };

  // 其他配置
  watermark?: {
    visible?: boolean;
    fontSize?: number;
    horzAlign?: 'left' | 'center' | 'right';
    vertAlign?: 'top' | 'center' | 'bottom';
    color?: string;
    text?: string;
  };
}
```

#### AreaData - 面积图数据

```javascript
{
  time: Time; // 时间(字符串或时间戳)
  value: number; // 值
}
```

#### BarData - 柱状图数据

```javascript
{
  time: Time;
  open: number; // 开盘价
  high: number; // 最高价
  low: number; // 最低价
  close: number; // 收盘价
}
```

#### CandlestickData - K线图数据

```javascript
{
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
}
```

#### HistogramData - 直方图数据

```javascript
{
  time: Time;
  value: number;
  color?: string;             // 可选的柱子颜色
}
```

#### LineData - 折线图数据

```javascript
{
  time: Time;
  value: number;
}
```

#### WhitespaceData - 空白数据(用于数据间隙)

```javascript
{
  time: Time;
}
```

### 系列类型 (Series Types)

#### LineSeries - 折线图

```javascript
const lineSeries = chart.addSeries(LineSeries, {
  color: "#2962FF", // 线条颜色
  lineWidth: 2, // 线条宽度
  lineStyle: LineStyle.Solid, // 线条样式
  lineType: LineType.Solid, // 线条类型
  priceFormat: {
    type: "price",
    precision: 2,
    minMove: 0.01,
  },
  lastValueVisible: true, // 显示最后值
  title: "Line Series", // 标题
});
```

#### AreaSeries - 面积图

```javascript
const areaSeries = chart.addSeries(AreaSeries, {
  lineColor: "#2962FF", // 线条颜色
  topColor: "rgba(41, 98, 255, 0.3)",
  bottomColor: "rgba(41, 98, 255, 0)",
  lineWidth: 2,
  lastValueVisible: true,
  title: "Area Series",
});
```

#### BarSeries - 柱状图

```javascript
const barSeries = chart.addSeries(BarSeries, {
  upColor: "#26a69a", // 上升颜色
  downColor: "#ef5350", // 下降颜色
  openVisible: true, // 显示开盘价
  thinBars: false,
  lastValueVisible: true,
  title: "Bar Series",
});
```

#### CandlestickSeries - K线图

```javascript
const candleSeries = chart.addSeries(CandlestickSeries, {
  upColor: "#26a69a",
  downColor: "#ef5350",
  borderVisible: true, // 显示边框
  wickUpColor: "#26a69a", // 上影线颜色
  wickDownColor: "#ef5350", // 下影线颜色
  borderUpColor: "#26a69a",
  borderDownColor: "#ef5350",
  lastValueVisible: true,
  title: "Candlestick Series",
});
```

#### BaselineSeries - 基线图

```javascript
const baselineSeries = chart.addSeries(BaselineSeries, {
  baseValue: {
    type: "price",
    price: 0,
  },
  topLineColor: "rgba(38, 166, 154, 0.3)",
  bottomLineColor: "rgba(239, 83, 80, 0.3)",
  topFillColor1: "rgba(38, 166, 154, 0.28)",
  topFillColor2: "rgba(38, 166, 154, 0.05)",
  bottomFillColor1: "rgba(239, 83, 80, 0.05)",
  bottomFillColor2: "rgba(239, 83, 80, 0.28)",
  lastValueVisible: true,
  title: "Baseline Series",
});
```

#### HistogramSeries - 直方图

```javascript
const histogramSeries = chart.addSeries(HistogramSeries, {
  color: "#26a69a", // 柱子颜色
  lastValueVisible: true,
  priceFormat: {
    type: "price",
    precision: 2,
    minMove: 0.01,
  },
  title: "Histogram Series",
});
```

---

## 数据格式

### 时间格式 (Time)

时间可以以三种格式表示:

#### 1. 字符串格式

```javascript
"2023-01-15"; // YYYY-MM-DD (推荐)
"2023-01-15 14:30"; // YYYY-MM-DD HH:mm
"2023-01-15 14:30:45"; // YYYY-MM-DD HH:mm:ss
```

#### 2. 业务日期格式

```javascript
{
  year: 2023,
  month: 1,
  day: 15
}
```

#### 3. Unix时间戳格式

```javascript
1673817600; // 秒级时间戳
1673817600000; // 毫秒级时间戳(会自动转换为秒)
```

### 数据设置方法

#### setData() - 设置初始数据

```javascript
// 设置历史数据
lineSeries.setData([
  { time: "2023-01-01", value: 100 },
  { time: "2023-01-02", value: 110 },
  { time: "2023-01-03", value: 105 },
]);

// 替换所有数据
lineSeries.setData(newDataArray);
```

**注意**: `setData()` 会替换所有现有数据，不推荐频繁调用，因为会影响性能。

#### update() - 更新或添加数据

```javascript
// 更新最后一个数据点
lineSeries.update({ time: "2023-01-03", value: 115 });

// 添加新数据点
lineSeries.update({ time: "2023-01-04", value: 120 });

// K线图更新
candleSeries.update({
  time: "2023-01-04",
  open: 110,
  high: 125,
  low: 108,
  close: 120,
});
```

**优势**: `update()` 只修改单个数据点，性能更优。

### 批量数据处理

```javascript
// 推荐做法：批量设置数据
const allData = generateHistoricalData(); // 获取历史数据
lineSeries.setData(allData);

// 然后实时更新
socket.on("newData", tick => {
  lineSeries.update(tick);
});

// 大数据量优化
const largeDataset = [];
for (let i = 0; i < 100000; i++) {
  largeDataset.push({
    time: new Date(2023, 0, 1 + i).toISOString().split("T")[0],
    value: Math.random() * 1000,
  });
}
lineSeries.setData(largeDataset);
```

---

## 图表类型

### 图表类型对比

| 类型        | 用途             | 数据字段                     | 最佳应用             |
| ----------- | ---------------- | ---------------------------- | -------------------- |
| Line        | 连续数据趋势     | time, value                  | 指标、价格趋势       |
| Area        | 带填充的趋势     | time, value                  | 数据分布、累积指标   |
| Bar         | OHLC数据         | time, open, high, low, close | 期货、股票           |
| Candlestick | K线图            | time, open, high, low, close | 股票、加密货币       |
| Baseline    | 基于基准线的对比 | time, value                  | 百分比变化、相对比较 |
| Histogram   | 柱状分布         | time, value                  | 成交量、指标分布     |

### 多系列组合示例

```javascript
const chart = createChart(document.getElementById("container"));

// 添加K线图
const candleSeries = chart.addSeries(CandlestickSeries, {
  upColor: "#26a69a",
  downColor: "#ef5350",
});

// 添加成交量直方图(在同一图表)
const volumeSeries = chart.addSeries(HistogramSeries, {
  color: "#26a69a",
  priceScaleId: "right", // 使用右侧价格轴
});

// 添加移动平均线
const maSeries = chart.addSeries(LineSeries, {
  color: "#2962FF",
  lineWidth: 1,
});

// 设置数据
candleSeries.setData(candleData);
volumeSeries.setData(volumeData);
maSeries.setData(maData);
```

---

## 配置选项

### 布局配置 (Layout)

```javascript
const chartOptions = {
  layout: {
    // 背景配置
    background: {
      type: "solid", // 'solid' | 'gradient'
      color: "#FFFFFF", // 十六进制或rgba
    },

    // 文本样式
    textColor: "#000000",
    fontFamily: "Arial, sans-serif",
    fontSize: 12,

    // 属性页(如果使用Advanced Charts)
    attributionLogo: true, // 显示TradingView标志
  },
};

chart.applyOptions(chartOptions);
```

### 时间轴配置 (TimeScale)

```javascript
const timeScaleOptions = {
  timeScale: {
    // 时间显示
    rightOffset: 10, // 右侧偏移
    timeVisible: true, // 显示时间
    secondsVisible: false, // 显示秒

    // 外观
    borderVisible: true, // 显示边框

    // 行为
    lockRange: false, // 锁定范围，防止缩放
    rightOffsetLastCandle: true,

    // 刻度格式化
    tickMarkFormatter: (time, tickMarkType) => {
      if (tickMarkType === TickMarkType.Year) {
        return new Date(time.year, 0).getFullYear().toString();
      }
      return "";
    },
  },
};
```

### 价格轴配置 (PriceScale)

```javascript
const priceScaleOptions = {
  rightPriceScale: {
    visible: true,
    borderVisible: true,
    autoScale: true, // 自动缩放
    mode: PriceScaleMode.Normal,
    invertScale: false, // 倒序显示
    alignLabels: true, // 对齐标签
    scaleMargins: {
      top: 0.1, // 顶部边距(比例)
      bottom: 0.1, // 底部边距(比例)
    },
    textColor: "#000000",
  },
};
```

### 交叉线配置 (Crosshair)

```javascript
const crosshairOptions = {
  crosshair: {
    mode: CrosshairMode.Normal, // Normal | Magnet | Hidden
    vertLine: {
      color: "#6A5ACD",
      width: 8,
      style: LineStyle.Dashed,
      visible: true,
    },
    horzLine: {
      color: "#6A5ACD",
      width: 8,
      style: LineStyle.Dashed,
      visible: true,
    },
  },
};
```

### 网格配置 (Grid)

```javascript
const gridOptions = {
  grid: {
    vertLines: {
      color: "#E0E0E0",
      style: LineStyle.Solid,
      visible: true,
    },
    horzLines: {
      color: "#E0E0E0",
      style: LineStyle.Solid,
      visible: true,
    },
  },
};
```

### 价格线配置 (Price Lines)

```javascript
// 添加价格线
const priceLine = lineSeries.createPriceLine({
  price: 150,
  color: "#FF0000",
  lineWidth: 2,
  lineStyle: LineStyle.Dashed,
  axisLabelVisible: true,
  title: "目标价格",
});

// 移除价格线
lineSeries.removePriceLine(priceLine);
```

---

## 事件系统

### 订阅事件方法

#### 交叉线移动事件

```javascript
// 订阅交叉线移动
const unsubscribe = chart.subscribeCrosshairMove(param => {
  if (!param.point) {
    console.log("交叉线已移出图表");
    return;
  }

  console.log("坐标:", {
    x: param.point.x,
    y: param.point.y,
  });

  // 获取时间轴上的值
  const time = param.time;
  console.log("时间:", time);

  // 获取各系列在交叉线处的值
  console.log("价格:", param.seriesPrices);
});

// 取消订阅
unsubscribe();
```

#### 点击事件

```javascript
// 处理鼠标事件
chart.subscribeClick(param => {
  console.log("点击位置:", param.point);
  console.log("点击时间:", param.time);
  console.log("点击价格:", param.price);
  console.log("系列:", param.seriesData);
});
```

#### 时间范围变化事件

```javascript
chart.timeScale().subscribeVisibleTimeRangeChange(range => {
  if (range) {
    console.log("可见时间范围:", {
      from: range.from,
      to: range.to,
    });
  }
});
```

#### 逻辑范围变化事件

```javascript
chart.timeScale().subscribeVisibleLogicalRangeChange(range => {
  if (range) {
    console.log("逻辑范围:", {
      from: range.from,
      to: range.to,
    });
  }
});
```

#### 图表尺寸变化事件

```javascript
chart.subscribeSizeChange(size => {
  console.log("新尺寸:", {
    width: size.width,
    height: size.height,
  });
});
```

#### 数据变化事件

```javascript
lineSeries.subscribeDataChanged(() => {
  console.log("数据已改变");
});
```

### 鼠标事件处理

```javascript
// MouseEventParams 结构
const handleMouseMove = param => {
  const params = {
    point: param.point, // { x, y } 像素坐标
    time: param.time, // 时间
    price: param.price, // 价格
    seriesPrices: param.seriesPrices, // Map<series, price>
  };

  // 处理各种鼠标事件
  switch (param.type) {
    case "mousemove":
      console.log("鼠标移动");
      break;
    case "click":
      console.log("点击");
      break;
    case "dblclick":
      console.log("双击");
      break;
  }
};
```

---

## 高级功能

### 1. 自定义标记 (Series Markers)

```javascript
const markers = [
  {
    time: "2023-01-05",
    position: "aboveBar", // 'aboveBar' | 'belowBar' | 'inBar'
    color: "#f0ad4e",
    shape: "circle", // 'circle' | 'square' | 'arrowUp' | 'arrowDown'
    text: "Buy Signal",
    size: 2,
  },
  {
    time: "2023-01-10",
    position: "belowBar",
    color: "#d9534f",
    shape: "arrowDown",
    text: "Sell Signal",
  },
];

lineSeries.setMarkers(markers);
```

### 2. 多窗格 (Panes)

```javascript
// 5.0版本支持多窗格
const mainPane = chart.panes()[0];
const subPane = chart.createPane();

// 在主窗格添加K线
const candleSeries = chart.addSeries(CandlestickSeries, {
  pane: 0, // 指定窗格
});

// 在副窗格添加成交量
const volumeSeries = chart.addSeries(HistogramSeries, {
  pane: 1, // 指定窗格
});
```

### 3. 自定义时间尺度 (Custom Time Scale)

```javascript
// 自定义刻度格式化
chart.applyOptions({
  timeScale: {
    tickMarkFormatter: (time, tickMarkType) => {
      const date = new Date(time.year, time.month - 1, time.day);

      if (tickMarkType === TickMarkType.Year) {
        return date.getFullYear().toString();
      } else if (tickMarkType === TickMarkType.Month) {
        return (date.getMonth() + 1).toString();
      } else if (tickMarkType === TickMarkType.DayOfMonth) {
        return date.getDate().toString();
      }

      return "";
    },
  },
});
```

### 4. 图例 (Legend)

```javascript
// 创建自定义图例
const legend = document.createElement("div");
legend.style.cssText = `
  position: absolute;
  top: 10px;
  left: 10px;
  background: rgba(255, 255, 255, 0.9);
  padding: 10px;
  border-radius: 5px;
  z-index: 10;
`;

chart.subscribeCrosshairMove(param => {
  if (!param.point) {
    legend.innerHTML = "";
    return;
  }

  let text = "";
  param.seriesPrices.forEach((price, series) => {
    text += `${series.title}: ${price.toFixed(2)}<br>`;
  });

  legend.innerHTML = text;
});

document.body.appendChild(legend);
```

### 5. 水印 (Watermark)

```javascript
chart.applyOptions({
  watermark: {
    visible: true,
    fontSize: 24,
    horzAlign: "right",
    vertAlign: "bottom",
    color: "rgba(0, 0, 0, 0.1)",
    text: "TradingView",
  },
});
```

### 6. 价格线 (Price Lines)

```javascript
// 添加支撑位和阻力位
const supportLine = lineSeries.createPriceLine({
  price: 100,
  color: "#52B788",
  lineWidth: 2,
  lineStyle: LineStyle.Dashed,
  axisLabelVisible: true,
  title: "支撑位",
});

const resistanceLine = lineSeries.createPriceLine({
  price: 150,
  color: "#D62828",
  lineWidth: 2,
  lineStyle: LineStyle.Dashed,
  axisLabelVisible: true,
  title: "阻力位",
});
```

### 7. 自定义序列类型 (Custom Series)

```javascript
// 实现自定义序列(高级功能)
class CustomHeatmapSeries {
  constructor(options) {
    this.options = options;
  }

  priceValueBuilder(builder) {
    builder(this.data.map(d => d.value));
  }

  isWhitespace(data) {
    return !data.value;
  }
}

// 添加自定义序列
const customSeries = chart.addCustomSeries(new CustomHeatmapSeries({}), {
  customOption: 10,
});

customSeries.setData(customData);
```

### 8. 实时数据更新

```javascript
// 创建WebSocket连接获取实时数据
const socket = new WebSocket("wss://api.example.com/chart-data");

socket.onmessage = event => {
  const tick = JSON.parse(event.data);

  // 更新K线数据
  candleSeries.update({
    time: tick.time,
    open: tick.o,
    high: tick.h,
    low: tick.l,
    close: tick.c,
  });

  // 更新成交量
  volumeSeries.update({
    time: tick.time,
    value: tick.volume,
    color: tick.c >= tick.o ? "#26a69a" : "#ef5350",
  });
};
```

---

## 性能优化

### 1. 大数据量处理

```javascript
// 优化原则：不要调用setData多次
// 推荐做法：
const allData = [];
for (let i = 0; i < 100000; i++) {
  allData.push({
    time: getTime(i),
    value: getValue(i),
  });
}

// 一次性设置
lineSeries.setData(allData);

// 然后使用update更新
socket.on("tick", tick => {
  lineSeries.update(tick);
});
```

### 2. 内存优化

```javascript
// 限制保留的数据点数量
const MAX_DATA_POINTS = 5000;

function addDataPoint(newData) {
  const currentData = lineSeries.data();

  if (currentData.length >= MAX_DATA_POINTS) {
    // 移除最旧的数据，添加新数据
    const slicedData = currentData.slice(1);
    slicedData.push(newData);
    lineSeries.setData(slicedData);
  } else {
    lineSeries.update(newData);
  }
}
```

### 3. 渲染优化

```javascript
// 暂停渲染
chart.startScale();

// 进行多个数据更新
for (let i = 0; i < 1000; i++) {
  series.update(dataPoints[i]);
}

// 恢复渲染
chart.endScale();
```

### 4. 响应式设计

```javascript
// 监听窗口大小变化
window.addEventListener("resize", () => {
  const container = document.getElementById("container");
  const width = container.clientWidth;
  const height = container.clientHeight;

  chart.applyOptions({
    width: width,
    height: height,
  });
});
```

---

## 常见问题

### Q: 如何处理实时K线更新?

**A**: 使用 `update()` 方法更新最后一根K线:

```javascript
// 同一时间戳的多次update会更新同一根K线
candleSeries.update({
  time: "2023-01-04",
  open: 110,
  high: 125,
  low: 108,
  close: 120, // 会持续更新close值
});

// 当时间改变时自动创建新K线
candleSeries.update({
  time: "2023-01-05", // 新时间
  open: 120,
  high: 130,
  low: 118,
  close: 128,
});
```

### Q: 如何在同一图表显示多个时间周期?

**A**: 不同周期数据分别设置到不同系列:

```javascript
// 日线K线
const dailyCandle = chart.addSeries(CandlestickSeries);
dailyCandle.setData(dailyData);

// 小时线(用不同颜色的线标记)
const hourlyLine = chart.addSeries(LineSeries, {
  color: "#FF0000",
});
hourlyLine.setData(hourlyData);
```

### Q: 图表闪烁或性能不佳?

**A**: 检查数据更新频率:

```javascript
// 不要过频繁更新
const updateInterval = setInterval(() => {
  // 每500ms更新一次
  series.update(newData);
}, 500);

// 或者合并多个更新
let pendingUpdates = [];
socket.on("tick", tick => {
  pendingUpdates.push(tick);
});

setInterval(() => {
  pendingUpdates.forEach(tick => {
    series.update(tick);
  });
  pendingUpdates = [];
}, 100);
```

### Q: 如何自定义颜色和样式?

**A**: 使用 `applyOptions()` 方法:

```javascript
// 系列样式
lineSeries.applyOptions({
  color: "#FF0000",
  lineWidth: 3,
  lineStyle: LineStyle.Dashed,
});

// 图表样式
chart.applyOptions({
  layout: {
    background: { type: "solid", color: "#222222" },
    textColor: "#FFFFFF",
  },
  grid: {
    vertLines: { color: "#444444" },
    horzLines: { color: "#444444" },
  },
});
```

### Q: 如何导出图表为图片?

**A**: 使用Canvas API:

```javascript
function exportChartAsImage() {
  // 获取canvas元素
  const canvas = document.querySelector("canvas");

  // 转换为图片
  const image = canvas.toDataURL("image/png");

  // 下载
  const link = document.createElement("a");
  link.href = image;
  link.download = "chart.png";
  link.click();
}
```

### Q: 支持哪些浏览器?

**A**: 支持所有现代浏览器:

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+
- 移动浏览器(iOS Safari, Chrome Mobile等)

### Q: 如何处理缺失数据?

**A**: 使用空白数据 `WhitespaceData`:

```javascript
const dataWithGaps = [
  { time: "2023-01-01", value: 100 },
  { time: "2023-01-02", value: 110 },
  { time: "2023-01-03" }, // 空白(没有value)
  { time: "2023-01-04", value: 105 },
  { time: "2023-01-05", value: 115 },
];

lineSeries.setData(dataWithGaps);
```

---

## 类型定义 (TypeScript)

如果使用TypeScript，库提供完整的类型定义:

```typescript
import {
  createChart,
  CandlestickSeries,
  AreaSeries,
  LineSeries,
  HistogramSeries,
  BarSeries,
  BaselineSeries,
  CrosshairMode,
  LineStyle,
  LineType,
  PriceScaleMode,
  TickMarkType,
} from "lightweight-charts";

import type {
  IChartApi,
  ISeriesApi,
  CandlestickData,
  ChartOptions,
  LineStyleOptions,
  SeriesMarker,
} from "lightweight-charts";

// 创建图表
const chart: IChartApi = createChart(document.getElementById("container")!, {
  width: 800,
  height: 400,
});

// 创建K线系列
const candlestickSeries: ISeriesApi<typeof CandlestickSeries> = chart.addSeries(
  CandlestickSeries,
  {
    upColor: "#26a69a",
    downColor: "#ef5350",
  }
);

// 设置数据
const candleData: CandlestickData[] = [
  {
    time: "2023-01-01",
    open: 100,
    high: 110,
    low: 95,
    close: 105,
  },
];

candlestickSeries.setData(candleData);
```

---

## 框架集成

### React集成示例

```jsx
import React, { useEffect, useRef } from "react";
import { createChart } from "lightweight-charts";

export const ChartComponent = ({ data }) => {
  const containerRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // 创建图表
    const chart = createChart(containerRef.current, {
      width: 800,
      height: 400,
    });

    chartRef.current = chart;

    // 添加系列和设置数据
    const series = chart.addSeries(LineSeries);
    series.setData(data);

    // 清理
    return () => {
      chart.remove();
    };
  }, [data]);

  return <div ref={containerRef} />;
};
```

### Vue.js集成示例

```vue
<template>
  <div ref="chartContainer" style="width: 100%; height: 400px;"></div>
</template>

<script>
import { createChart } from "lightweight-charts";

export default {
  props: ["data"],

  data() {
    return {
      chart: null,
    };
  },

  mounted() {
    this.chart = createChart(this.$refs.chartContainer, {
      width: this.$refs.chartContainer.clientWidth,
      height: 400,
    });

    const series = this.chart.addSeries(LineSeries);
    series.setData(this.data);
  },

  beforeDestroy() {
    if (this.chart) {
      this.chart.remove();
    }
  },
};
</script>
```

---

## 许可证和归属

Lightweight Charts™ 采用Apache License 2.0许可证。

**重要**: 你必须在你的网站或应用中添加归属声明:

```html
<!-- 添加TradingView链接 -->
<a href="https://www.tradingview.com/">Lightweight Charts™ by TradingView</a>

<!-- 或使用图表内置属性 -->
<script>
  chart.applyOptions({
    attributionLogo: true, // 显示TradingView标志
  });
</script>
```

---

## 资源链接

- **官方文档**: https://tradingview.github.io/lightweight-charts/
- **GitHub仓库**: https://github.com/tradingview/lightweight-charts
- **NPM包**: https://www.npmjs.com/package/lightweight-charts
- **示例代码**: https://tradingview.github.io/lightweight-charts/plugins/
- **讨论**: https://github.com/tradingview/lightweight-charts/discussions

---

## 版本历史

### v5.0 (2024年)

- 引入多窗格支持
- 减少bundle大小
- 新的API统一(所有系列通过addSeries创建)
- 改进的性能

### v4.x (2023年)

- 稳定版本
- 支持addCandlestickSeries等方法

---

**文档编辑时间**: 2025年1月
**适配版本**: 5.0+
**建议使用用途**: LLM集成、自动代码生成、API文档参考
