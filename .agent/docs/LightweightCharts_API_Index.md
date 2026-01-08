# TradingView Lightweight Charts - LLM优化的API索引

**用于AI模型快速查询和代码生成**

---

## 全局函数 (Global Functions)

### createChart(container, options?)
```
功能: 创建图表实例
参数:
  - container: HTMLElement - 容器元素
  - options?: ChartOptions - 配置选项
返回: IChartApi
示例: const chart = createChart(document.getElementById('chart'), {width: 800, height: 400})
```

---

## 系列类型 (Series Types)

### LineSeries
```
添加方法: chart.addSeries(LineSeries, options?)
配置项: color, lineWidth, lineStyle, lastValueVisible, priceFormat, title
数据格式: {time, value}
使用场景: 指标、价格趋势
```

### AreaSeries
```
添加方法: chart.addSeries(AreaSeries, options?)
配置项: lineColor, topColor, bottomColor, lineWidth, lastValueVisible, title
数据格式: {time, value}
使用场景: 数据分布、填充指标
```

### BarSeries
```
添加方法: chart.addSeries(BarSeries, options?)
配置项: upColor, downColor, openVisible, thinBars, lastValueVisible, title
数据格式: {time, open, high, low, close}
使用场景: OHLC数据、期货
```

### CandlestickSeries
```
添加方法: chart.addSeries(CandlestickSeries, options?)
配置项: upColor, downColor, borderVisible, wickUpColor, wickDownColor, lastValueVisible, title
数据格式: {time, open, high, low, close}
使用场景: K线图、股票、加密货币
```

### HistogramSeries
```
添加方法: chart.addSeries(HistogramSeries, options?)
配置项: color, lastValueVisible, priceFormat, title
数据格式: {time, value, color?}
使用场景: 成交量、柱状指标
```

### BaselineSeries
```
添加方法: chart.addSeries(BaselineSeries, options?)
配置项: baseValue, topLineColor, bottomLineColor, topFillColor1, bottomFillColor1, title
数据格式: {time, value}
使用场景: 基准对比、百分比变化
```

---

## IChartApi 方法 (Chart API)

### 系列管理
```
addSeries(seriesType, options?) -> ISeriesApi
  创建并添加新系列

removeSeries(series) -> void
  移除系列

panes() -> IPaneApi[]
  获取所有窗格

createPane() -> IPaneApi
  创建新窗格(v5.0+)
```

### 轴操作
```
timeScale() -> ITimeScaleApi
  获取时间轴对象

priceScale(id?) -> IPriceScaleApi
  获取价格轴对象

leftPriceScale() -> IPriceScaleApi | undefined
  获取左侧价格轴
```

### 配置
```
applyOptions(options) -> void
  应用图表级配置

getSize() -> { width: number; height: number }
  获取图表尺寸

getVisiblePriceScaleId() -> string | undefined
  获取可见的价格轴ID
```

### 事件订阅
```
subscribeCrosshairMove(handler) -> ISubscription
  交叉线移动事件

subscribeClick(handler) -> ISubscription
  点击事件

subscribeSizeChange(handler) -> ISubscription
  尺寸变化事件

subscribeVisibleRangeChange(handler) -> ISubscription
  可见范围变化事件(已弃用)
```

### 交互控制
```
handleScroll(delta) -> void
  处理滚动

handleScale(delta, target?) -> void
  处理缩放

handleMouseEvent(event) -> void
  处理鼠标事件

unsubscribeAll() -> void
  取消所有订阅
```

### 清理
```
remove() -> void
  移除图表并释放资源
```

---

## ISeriesApi 方法 (Series API)

### 数据管理
```
setData(data) -> void
  设置初始数据(替换所有)

update(bar) -> void
  更新最后数据点或添加新数据点

dataByIndex(logicalIndex) -> SeriesDataItemType | undefined
  通过逻辑索引获取数据
```

### 配置
```
applyOptions(options) -> void
  应用系列配置

priceFormatter() -> IPriceFormatter
  获取价格格式化器
```

### 标记与线
```
setMarkers(markers) -> void
  设置标记

markers() -> SeriesMarker[]
  获取所有标记

createPriceLine(options) -> IPriceLine
  创建价格线

removePriceLine(priceLine) -> void
  移除价格线

priceLines() -> IPriceLine[]
  获取所有价格线
```

### 原始图形(Primitives)
```
attachPrimitive(primitive) -> void
  附加原始图形到系列

detachPrimitive(primitive) -> void
  从系列分离原始图形
```

### 查询
```
pane() -> IPaneApi
  获取所在的窗格

priceScale() -> IPriceScaleApi
  获取关联的价格轴
```

---

## ITimeScaleApi 方法 (Time Scale API)

### 范围管理
```
fitContent() -> void
  自动调整范围以显示所有数据

setVisibleRange(range: {from, to}) -> void
  设置可见时间范围

getVisibleRange() -> IRange | null
  获取可见时间范围

getVisibleLogicalRange() -> LogicalRange | null
  获取可见逻辑范围

scrollToPosition(position, animated?) -> void
  滚动到指定位置
```

### 行为配置
```
applyOptions(options) -> void
  应用时间轴配置

options() -> TimeScaleOptions
  获取当前配置
```

### 事件订阅
```
subscribeVisibleTimeRangeChange(handler) -> ISubscription
  订阅可见时间范围变化

subscribeVisibleLogicalRangeChange(handler) -> ISubscription
  订阅可见逻辑范围变化
```

---

## IPriceScaleApi 方法 (Price Scale API)

### 范围管理
```
setVisiblePriceRange(range: {minValue, maxValue}) -> void
  设置可见价格范围

getVisiblePriceRange() -> PriceRange | null
  获取可见价格范围

applyOptions(options) -> void
  应用价格轴配置
```

### 查询
```
width() -> number
  获取价格轴宽度

mode() -> PriceScaleMode
  获取价格轴模式
```

---

## 数据格式 (Data Formats)

### 时间格式
```
字符串: '2023-01-15' (YYYY-MM-DD)
业务日期: {year: 2023, month: 1, day: 15}
时间戳: 1673817600 (秒) 或 1673817600000 (毫秒)
```

### 单值数据
```
LineData: {time, value}
HistogramData: {time, value, color?}
```

### OHLC数据
```
CandlestickData: {time, open, high, low, close}
BarData: {time, open, high, low, close}
```

### 特殊数据
```
WhitespaceData: {time}  // 用于表示数据间隙
```

---

## 配置选项 (Options)

### ChartOptions
```
width?: number (默认600)
height?: number (默认300)
layout?: {
  background?: {type: 'solid'|'gradient', color: string}
  textColor?: string
  fontFamily?: string
  fontSize?: number
}
grid?: {vertLines, horzLines}
timeScale?: {timeVisible, secondsVisible, borderVisible, ...}
rightPriceScale?: {visible, borderVisible, autoScale, mode, invertScale, ...}
leftPriceScale?: {visible, ...}
watermark?: {visible, fontSize, horzAlign, vertAlign, color, text}
crosshair?: {mode, vertLine, horzLine}
localization?: {locale, priceFormatter, timeFormatter}
```

### SeriesOptions(通用)
```
lastValueVisible?: boolean
title?: string
priceFormat?: {
  type: 'price'|'volume'|'percent'
  precision?: number
  minMove?: number
}
priceScaleId?: string
pane?: number
```

### 线条样式 (LineStyle)
```
0 = Solid (实线)
1 = Dotted (点线)
2 = Dashed (虚线)
3 = LargeDashed (长虚线)
4 = SparseDotted (稀疏点线)
```

### 交叉线模式 (CrosshairMode)
```
'Normal' = 普通模式
'Magnet' = 磁性模式(吸附到数据点)
'Hidden' = 隐藏模式
```

### 价格轴模式 (PriceScaleMode)
```
'Normal' = 正常线性
'Logarithmic' = 对数
'Percentage' = 百分比
```

---

## 标记配置 (SeriesMarker)

```
{
  time: Time
  position: 'aboveBar'|'belowBar'|'inBar'
  color: string
  shape: 'circle'|'square'|'arrowUp'|'arrowDown'
  text: string
  size: number
  id?: string
}
```

---

## 价格线配置 (PriceLineOptions)

```
{
  price: number
  color?: string
  lineWidth?: number
  lineStyle?: LineStyle
  axisLabelVisible?: boolean
  title?: string
}
```

---

## 事件处理 (Events)

### MouseEventParams
```
{
  point?: {x: number, y: number}
  time?: Time
  price?: number
  seriesPrices?: Map<ISeriesApi, number>
  isBarSelected?: boolean
}
```

### SizeChangeEventParams
```
{
  width: number
  height: number
}
```

### TimeRangeChangeParams
```
{
  from: number
  to: number
}
```

### LogicalRangeChangeParams
```
{
  from: number | null
  to: number | null
}
```

---

## 常用操作组合 (Common Patterns)

### 创建完整的K线图
```javascript
const chart = createChart(container);
const candleSeries = chart.addSeries(CandlestickSeries, {upColor: '#26a69a', downColor: '#ef5350'});
const volumeSeries = chart.addSeries(HistogramSeries, {color: '#26a69a'});
candleSeries.setData(candleData);
volumeSeries.setData(volumeData);
chart.timeScale().fitContent();
```

### 实时数据更新
```javascript
socket.on('tick', (tick) => {
  candleSeries.update({time: tick.time, open: tick.o, high: tick.h, low: tick.l, close: tick.c});
});
```

### 跟踪交叉线
```javascript
chart.subscribeCrosshairMove((param) => {
  if (param.time) {
    updateLegend(param.time, param.seriesPrices);
  }
});
```

### 订阅时间范围变化
```javascript
chart.timeScale().subscribeVisibleTimeRangeChange((range) => {
  if (range) loadMoreData(range.from, range.to);
});
```

### 添加标记和价格线
```javascript
series.setMarkers([{time: '2023-01-05', position: 'aboveBar', color: '#f0ad4e'}]);
series.createPriceLine({price: 150, color: '#FF0000', title: 'Target'});
```

---

## 性能优化建议 (Performance Tips)

1. **使用update()而不是setData()** - 仅更新单个数据点
2. **限制数据点数量** - 保留最近5000个点
3. **延迟渲染** - 对多个更新使用批处理
4. **避免频繁事件** - 限制事件处理函数的执行频率
5. **取消订阅** - 不需要时及时取消事件订阅
6. **清理资源** - 卸载时调用chart.remove()

---

## 错误排查 (Troubleshooting)

| 问题 | 原因 | 解决方案 |
|------|------|--------|
| 图表为空 | 容器无尺寸或数据为空 | 设置container尺寸，检查数据格式 |
| 数据不显示 | time格式错误 | 使用'YYYY-MM-DD'格式 |
| 性能差 | setData()调用过频繁 | 改用update() |
| 内存泄漏 | 未取消订阅 | 调用unsubscribe()和chart.remove() |
| 事件未触发 | 未正确订阅 | 检查订阅参数和事件名称 |

---

## 版本兼容性

**v5.0+**: 推荐使用 - addSeries()统一API
**v4.x**: 旧版本 - addCandlestickSeries()等单独方法
**迁移**: 改为使用chart.addSeries(CandlestickSeries, options)

---

## 许可和归属

- 许可证: Apache 2.0
- 必须添加: TradingView归属链接
- 官网: https://www.tradingview.com/

---

**文档版本**: 2.0  
**库版本**: 5.0+  
**最后更新**: 2025年1月  
**优化用途**: LLM代码生成和快速查询
