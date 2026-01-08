# TradingView Lightweight Charts - 快速参考指南

**为LLM优化的精简版参考手册**

---

## 1. 初始化

```javascript
import { createChart, LineSeries, CandlestickSeries, AreaSeries, BarSeries, HistogramSeries, BaselineSeries } from 'lightweight-charts';

// 创建图表
const chart = createChart(document.getElementById('container'), {
  width: 800,
  height: 400,
  layout: {
    textColor: '#000000',
    background: { type: 'solid', color: '#FFFFFF' }
  }
});
```

---

## 2. 添加图表系列

```javascript
// 折线图
const line = chart.addSeries(LineSeries, { color: '#2962FF' });

// K线图
const candle = chart.addSeries(CandlestickSeries, {
  upColor: '#26a69a',
  downColor: '#ef5350'
});

// 面积图
const area = chart.addSeries(AreaSeries, {
  lineColor: '#2962FF',
  topColor: 'rgba(41, 98, 255, 0.3)',
  bottomColor: 'rgba(41, 98, 255, 0)'
});

// 直方图(成交量)
const histogram = chart.addSeries(HistogramSeries, { color: '#26a69a' });

// 柱状图
const bar = chart.addSeries(BarSeries, {
  upColor: '#26a69a',
  downColor: '#ef5350'
});
```

---

## 3. 数据设置

```javascript
// 设置初始数据(替换所有数据)
series.setData([
  { time: '2023-01-01', value: 100 },
  { time: '2023-01-02', value: 110 },
  { time: '2023-01-03', value: 105 }
]);

// K线数据
candleSeries.setData([
  { time: '2023-01-01', open: 100, high: 110, low: 95, close: 105 },
  { time: '2023-01-02', open: 105, high: 115, low: 102, close: 112 }
]);

// 更新或添加单个数据点(推荐用于实时更新)
series.update({ time: '2023-01-04', value: 120 });

// 添加新数据点
series.update({ time: '2023-01-05', value: 125 });
```

---

## 4. 时间轴操作

```javascript
const timeScale = chart.timeScale();

// 自动调整显示范围
timeScale.fitContent();

// 设置可见范围
timeScale.setVisibleRange({
  from: (new Date('2023-01-01').getTime() / 1000),
  to: (new Date('2023-01-31').getTime() / 1000)
});

// 获取可见范围
const range = timeScale.getVisibleRange();

// 订阅时间范围变化
timeScale.subscribeVisibleTimeRangeChange((newRange) => {
  console.log('时间范围变化:', newRange);
});
```

---

## 5. 价格轴操作

```javascript
const priceScale = chart.priceScale('right');

// 获取可见价格范围
const priceRange = priceScale.getVisiblePriceRange();

// 设置可见价格范围
priceScale.setVisiblePriceRange({
  minValue: 100,
  maxValue: 200
});

// 获取价格轴宽度
const width = priceScale.width();
```

---

## 6. 事件处理

```javascript
// 交叉线移动事件
chart.subscribeCrosshairMove((param) => {
  if (!param.point) return;
  
  console.log('交叉线位置:', param.point);
  console.log('时间:', param.time);
  console.log('价格:', param.price);
  console.log('所有系列的值:', param.seriesPrices);
});

// 点击事件
chart.subscribeClick((param) => {
  console.log('点击时间:', param.time);
  console.log('点击价格:', param.price);
});

// 尺寸变化事件
chart.subscribeSizeChange((size) => {
  console.log('新尺寸:', size.width, 'x', size.height);
});

// 数据变化事件
series.subscribeDataChanged(() => {
  console.log('数据已更新');
});
```

---

## 7. 样式定制

```javascript
// 应用图表级别的样式
chart.applyOptions({
  layout: {
    background: { type: 'solid', color: '#1e1e1e' },
    textColor: '#ffffff'
  },
  grid: {
    vertLines: { color: '#333333' },
    horzLines: { color: '#333333' }
  },
  watermark: {
    visible: true,
    text: 'My Chart',
    fontSize: 24,
    color: 'rgba(255, 255, 255, 0.1)'
  }
});

// 应用系列级别的样式
series.applyOptions({
  color: '#FF0000',
  lineWidth: 3,
  lineStyle: 2  // LineStyle.Dashed
});
```

---

## 8. 标记 (Markers)

```javascript
series.setMarkers([
  {
    time: '2023-01-05',
    position: 'aboveBar',
    color: '#f0ad4e',
    shape: 'circle',
    text: 'Signal',
    size: 2
  },
  {
    time: '2023-01-10',
    position: 'belowBar',
    color: '#d9534f',
    shape: 'arrowDown',
    text: 'Sell'
  }
]);
```

---

## 9. 价格线 (Price Lines)

```javascript
// 添加价格线(支撑位/阻力位)
const priceLine = series.createPriceLine({
  price: 150,
  color: '#FF0000',
  lineWidth: 2,
  lineStyle: 1,  // LineStyle.Dotted
  axisLabelVisible: true,
  title: '目标价'
});

// 移除价格线
series.removePriceLine(priceLine);
```

---

## 10. 配置常数

### LineStyle 线条样式
```
0 = Solid (实线)
1 = Dotted (点线)
2 = Dashed (虚线)
3 = LargeDashed (长虚线)
4 = SparseDotted (稀疏点线)
```

### CrosshairMode 交叉线模式
```
Normal  = 普通模式
Magnet  = 磁性模式(吸附到数据点)
Hidden  = 隐藏模式
```

### TickMarkType 刻度类型
```
Year = 0
Month = 1
DayOfMonth = 2
Time = 3
TimeWithSeconds = 4
```

### PriceScaleMode 价格轴模式
```
Normal = 正常模式
Logarithmic = 对数模式
Percentage = 百分比模式
```

---

## 11. 时间格式

```javascript
// 字符串格式(推荐)
'2023-01-15'           // YYYY-MM-DD
'2023-01-15 14:30'     // YYYY-MM-DD HH:mm

// 业务日期格式
{ year: 2023, month: 1, day: 15 }

// Unix时间戳
1673817600             // 秒级
1673817600000          // 毫秒级
```

---

## 12. 响应式设计

```javascript
// 监听窗口大小变化
window.addEventListener('resize', () => {
  const container = document.getElementById('container');
  chart.applyOptions({
    width: container.clientWidth,
    height: container.clientHeight
  });
});
```

---

## 13. 实时数据更新

```javascript
// WebSocket实时更新
const ws = new WebSocket('wss://api.example.com/feed');

ws.onmessage = (event) => {
  const tick = JSON.parse(event.data);
  
  // 更新K线(同时间戳更新同一根K线)
  candleSeries.update({
    time: tick.time,
    open: tick.o,
    high: tick.h,
    low: tick.l,
    close: tick.c
  });
};
```

---

## 14. 多系列组合

```javascript
const chart = createChart(document.getElementById('container'));

// 添加K线作为主系列
const candleSeries = chart.addSeries(CandlestickSeries);

// 添加移动平均线
const maSeries = chart.addSeries(LineSeries, { color: '#FF6B00' });

// 设置数据
candleSeries.setData(candleData);
maSeries.setData(maData);

// 同时更新
candleSeries.update(newCandle);
maSeries.update(newMA);
```

---

## 15. 导出为图片

```javascript
function exportChart() {
  const canvas = document.querySelector('canvas');
  const image = canvas.toDataURL('image/png');
  
  const link = document.createElement('a');
  link.href = image;
  link.download = 'chart.png';
  link.click();
}
```

---

## 16. 清理资源

```javascript
// 移除系列
chart.removeSeries(series);

// 移除整个图表(释放内存)
chart.remove();

// 取消事件订阅
const unsubscribe = chart.subscribeCrosshairMove(handler);
unsubscribe();
```

---

## 17. 性能优化技巧

```javascript
// 错误做法：多次调用setData
for (let i = 0; i < data.length; i++) {
  series.setData([data[i]]);  // ❌ 性能差
}

// 正确做法：一次性设置
series.setData(data);  // ✅ 高效

// 然后使用update进行实时更新
socket.on('tick', tick => {
  series.update(tick);  // ✅ 高效
});

// 大数据集优化
const MAX_POINTS = 5000;
if (data.length > MAX_POINTS) {
  data = data.slice(-MAX_POINTS);  // 只保留最近5000个点
}
series.setData(data);
```

---

## 18. 完整示例

```javascript
import { createChart, CandlestickSeries, HistogramSeries } from 'lightweight-charts';

// 1. 创建图表
const chart = createChart(document.getElementById('container'), {
  width: 1200,
  height: 600,
  layout: {
    background: { type: 'solid', color: '#ffffff' },
    textColor: '#000000'
  },
  timeScale: { timeVisible: true, secondsVisible: false }
});

// 2. 添加K线
const candleSeries = chart.addSeries(CandlestickSeries, {
  upColor: '#26a69a',
  downColor: '#ef5350'
});

// 3. 添加成交量
const volumeSeries = chart.addSeries(HistogramSeries, {
  color: '#26a69a',
  priceScaleId: 'right'
});

// 4. 设置数据
candleSeries.setData([
  { time: '2023-01-01', open: 100, high: 110, low: 95, close: 105 },
  { time: '2023-01-02', open: 105, high: 115, low: 102, close: 112 }
]);

volumeSeries.setData([
  { time: '2023-01-01', value: 1000000 },
  { time: '2023-01-02', value: 1500000 }
]);

// 5. 自动调整
chart.timeScale().fitContent();

// 6. 添加事件监听
chart.subscribeCrosshairMove(param => {
  if (param.time) {
    console.log('时间:', param.time);
    console.log('价格:', param.seriesPrices.get(candleSeries));
  }
});

// 7. 实时更新
setInterval(() => {
  const newCandle = {
    time: new Date().toISOString().split('T')[0],
    open: 108,
    high: 120,
    low: 105,
    close: 118
  };
  candleSeries.update(newCandle);
  volumeSeries.update({ time: newCandle.time, value: 2000000 });
}, 1000);
```

---

## 19. 常见错误

| 错误 | 原因 | 解决方案 |
|------|------|--------|
| 图表不显示 | 容器没有设置尺寸 | 给容器设置width和height |
| 数据不显示 | time格式不对 | 使用'YYYY-MM-DD'格式 |
| 性能差 | 频繁调用setData | 使用update()更新数据 |
| 内存泄漏 | 未清理事件监听 | 调用unsubscribe()和chart.remove() |
| 图表闪烁 | 更新太频繁 | 限制更新频率到100-500ms |

---

## 20. 浏览器兼容性

✅ Chrome 80+  
✅ Firefox 75+  
✅ Safari 13+  
✅ Edge 80+  
✅ iOS Safari  
✅ Chrome Mobile

---

**最后更新**: 2025年1月  
**库版本**: 5.0+  
**许可证**: Apache 2.0
