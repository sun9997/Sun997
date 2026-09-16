/* =====================================================================
 * 居安智卫 —— ECharts 图表公共库（深色科技风 + 自动回收）
 * ===================================================================== */
(function () {
  'use strict';
  var C = {
    cyan: '#22e0ff', blue: '#2f7bff', purple: '#7c5bff',
    green: '#21e6a4', yellow: '#ffc83d', red: '#ff4d6a', orange: '#ff9d3d',
    txt: '#8fb2e4', grid: 'rgba(64,120,210,.25)'
  };
  var axisCommon = {
    axisLine: { lineStyle: { color: 'rgba(90,140,220,.35)' } },
    axisTick: { show: false },
    axisLabel: { color: C.txt, fontSize: 10 },
    splitLine: { lineStyle: { color: 'rgba(70,120,200,.12)', type: 'dashed' } }
  };
  function tip(extra) {
    return Object.assign({
      trigger: 'axis',
      backgroundColor: 'rgba(8,22,48,.92)',
      borderColor: 'rgba(34,224,255,.4)',
      textStyle: { color: '#d9f4ff', fontSize: 11 },
      axisPointer: { lineStyle: { color: 'rgba(34,224,255,.4)' } }
    }, extra || {});
  }
  /* 图表实例回收袋 */
  function Bag() { this.list = []; }
  Bag.prototype.add = function (chart) { this.list.push(chart); return chart; };
  Bag.prototype.dispose = function () {
    this.list.forEach(function (c) { try { c.dispose(); } catch (e) {} });
    this.list = [];
  };

  function init(el) {
    var c = echarts.init(el, null, { renderer: 'canvas' });
    return c;
  }

  /* 多序列面积折线（能耗趋势/预测） */
  function lineChart(el, bag, opt) {
    var series = (opt.series || []).map(function (s) {
      return Object.assign({
        type: 'line', smooth: true, symbol: 'circle', symbolSize: 5,
        showSymbol: !!opt.showSymbol,
        lineStyle: { width: 2.2 },
        emphasis: { focus: 'series' }
      }, s);
    });
    var chart = init(el);
    chart.setOption({
      color: opt.colors || [C.cyan, C.purple, C.green, C.yellow],
      tooltip: tip(opt.tipExtra),
      legend: Object.assign({
        top: 0, right: 6, icon: 'roundRect', itemWidth: 10, itemHeight: 6,
        textStyle: { color: C.txt, fontSize: 10 }
      }, opt.legend || {}),
      grid: { left: 40, right: 18, top: opt.top || 34, bottom: 26 },
      xAxis: Object.assign({ type: 'category', boundaryGap: false, data: opt.x,
        axisLine: axisCommon.axisLine, axisTick: axisCommon.axisTick, axisLabel: axisCommon.axisLabel },
        opt.xAxis || {}),
      yAxis: Object.assign({ type: 'value', name: opt.yName || '',
        nameTextStyle: { color: C.txt, fontSize: 10 },
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { color: C.txt, fontSize: 10 },
        splitLine: axisCommon.splitLine }, opt.yAxis || {}),
      series: series
    });
    bag.add(chart);
    return chart;
  }

  /* 柱图（楼层对比等） */
  function barChart(el, bag, opt) {
    var chart = init(el);
    chart.setOption({
      color: opt.colors || [C.blue],
      tooltip: tip({ trigger: 'axis' }),
      grid: { left: 40, right: 16, top: opt.top || 26, bottom: 26 },
      xAxis: { type: 'category', data: opt.x,
        axisLine: axisCommon.axisLine, axisTick: axisCommon.axisTick, axisLabel: axisCommon.axisLabel },
      yAxis: { type: 'value', axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { color: C.txt, fontSize: 10 }, splitLine: axisCommon.splitLine },
      series: [{
        type: 'bar', data: opt.data, barWidth: opt.barWidth || 18,
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: opt.c1 || C.cyan }, { offset: 1, color: opt.c0 || 'rgba(47,123,255,.15)' }])
        },
        label: opt.label ? { show: true, position: 'top', color: '#9fd6ff', fontSize: 10 } : undefined
      }].concat(opt.extraSeries || [])
    });
    bag.add(chart);
    return chart;
  }

  /* 多序列分组柱状图（月负荷4序列 / 冷热需求2序列，严格使用原图配色） */
  function groupedBar(el, bag, opt) {
    var chart = init(el);
    var series = (opt.series || []).map(function (s, i) {
      return {
        name: s.name, type: 'bar', data: s.data,
        barWidth: opt.barWidth || 10, barGap: '15%',
        itemStyle: {
          borderRadius: [3, 3, 0, 0],
          color: s.color
            ? new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: s.color }, { offset: 1, color: hexA(s.color, .25) }])
            : undefined
        }
      };
    });
    if (opt.overlay) {   // 叠加预测曲线（AI页对比展示）
      series.push({
        name: opt.overlay.name, type: 'line', smooth: true, data: opt.overlay.data,
        symbol: 'circle', symbolSize: 5, z: 5,
        lineStyle: { width: 2.6, color: opt.overlay.color || '#ffffff' },
        itemStyle: { color: opt.overlay.color || '#ffffff' }
      });
    }
    chart.setOption({
      color: (opt.series || []).map(function (s) { return s.color; }),
      tooltip: tip({ trigger: 'axis' }),
      legend: Object.assign({
        top: 0, right: 6, icon: 'roundRect', itemWidth: 10, itemHeight: 6,
        textStyle: { color: C.txt, fontSize: 10 }
      }, opt.legend || {}),
      grid: { left: 46, right: 18, top: opt.top || 34, bottom: 26 },
      xAxis: { type: 'category', data: opt.x,
        axisLine: axisCommon.axisLine, axisTick: axisCommon.axisTick, axisLabel: axisCommon.axisLabel },
      yAxis: Object.assign({ type: 'value', name: opt.yName || '',
        nameTextStyle: { color: C.txt, fontSize: 10 },
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { color: C.txt, fontSize: 10 }, splitLine: axisCommon.splitLine }, opt.yAxis || {}),
      series: series
    });
    if (opt.onSelect) {
      chart.off('click');
      chart.on('click', function (p) { opt.onSelect(p.name, p.seriesName, p.dataIndex, p); });
    }
    bag.add(chart);
    return chart;
  }
  function hexA(hex, a) {
    var m = /^#?([0-9a-f]{6})$/i.exec(hex);
    if (!m) return hex;
    var n = parseInt(m[1], 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  /* 环形饼图（分项占比；支持 onSelect 点击扇区跳明细） */
  function pieChart(el, bag, opt) {
    var chart = init(el);
    chart.setOption({
      color: opt.colors || [C.cyan, C.purple, C.green, C.yellow, C.orange],
      tooltip: { trigger: 'item', backgroundColor: 'rgba(8,22,48,.92)',
        borderColor: 'rgba(34,224,255,.4)', textStyle: { color: '#d9f4ff', fontSize: 11 },
        formatter: '{b}: {c} ({d}%)' },
      legend: { orient: 'vertical', right: 6, top: 'center', icon: 'circle',
        itemWidth: 8, itemHeight: 8, textStyle: { color: C.txt, fontSize: 10 } },
      series: [{
        type: 'pie', radius: ['52%', '72%'], center: ['38%', '50%'],
        avoidLabelOverlap: true,
        itemStyle: { borderColor: '#081632', borderWidth: 2 },
        label: { show: false },
        selectedMode: opt.onSelect ? 'single' : undefined,
        selectedOffset: opt.onSelect ? 8 : 0,
        data: opt.data
      }],
      graphic: opt.centerText ? [{
        type: 'text', left: '33%', top: '44%',
        style: { text: opt.centerText.v, fill: '#bdf4ff', fontSize: 17, fontWeight: 700, textAlign: 'center' }
      }, {
        type: 'text', left: '32%', top: '58%',
        style: { text: opt.centerText.t, fill: '#6f93c0', fontSize: 10, textAlign: 'center' }
      }] : []
    });
    if (opt.onSelect) {
      chart.off('click');
      chart.on('click', function (p) { opt.onSelect(p.data && p.data.key != null ? p.data.key : p.name, p); });
    }
    bag.add(chart);
    return chart;
  }

  /* 仪表盘 */
  function gauge(el, bag, value, name, opt) {
    opt = opt || {};
    var chart = init(el);
    chart.setOption({
      series: [{
        type: 'gauge', radius: '92%', center: ['50%', '62%'],
        startAngle: 210, endAngle: -30,
        min: opt.min || 0, max: opt.max || 100,
        axisLine: { lineStyle: { width: 10, color: [
          [opt.warnAt || .65, '#21e6a4'], [opt.alarmAt || .85, '#ffc83d'], [1, '#ff4d6a']
        ] } },
        pointer: { width: 4, length: '62%', itemStyle: { color: '#22e0ff' } },
        axisTick: { show: false }, splitLine: { length: 8, lineStyle: { color: 'rgba(150,200,255,.5)' } },
        axisLabel: { color: '#6f93c0', fontSize: 9, distance: 14 },
        detail: { valueAnimation: true, color: '#bdf4ff', fontSize: 20, offsetCenter: [0, '38%'],
          formatter: opt.fmt || ('{value}' + (opt.unit || '')) },
        title: { color: '#8fb2e4', fontSize: 11, offsetCenter: [0, '62%'] },
        data: [{ value: value, name: name }]
      }]
    });
    bag.add(chart);
    return chart;
  }

  /* 套筒监测波形 */
  function waveChart(el, bag, data, limit, warn) {
    var chart = init(el);
    var xs = data.map(function (_, i) { return i; });
    chart.setOption({
      tooltip: tip({ formatter: function (p) { return '采样点 ' + p[0].name + '<br/>应力 ' + p[0].value + ' MPa'; } }),
      grid: { left: 46, right: 16, top: 22, bottom: 26 },
      xAxis: { type: 'category', data: xs, axisLine: axisCommon.axisLine,
        axisTick: axisCommon.axisTick, axisLabel: { color: C.txt, fontSize: 9, interval: 9 } },
      yAxis: { type: 'value', axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { color: C.txt, fontSize: 10 }, splitLine: axisCommon.splitLine, name: 'MPa',
        nameTextStyle: { color: C.txt, fontSize: 10 } },
      series: [{
        type: 'line', data: data, smooth: true, showSymbol: false,
        lineStyle: { width: 2, color: C.cyan },
        areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(34,224,255,.35)' }, { offset: 1, color: 'rgba(34,224,255,.02)' }]) },
        markLine: { silent: true, symbol: 'none', label: { fontSize: 10 },
          data: [
            { yAxis: limit, lineStyle: { color: C.red, type: 'dashed' }, label: { color: C.red, formatter: '限值 ' + limit } },
            { yAxis: warn, lineStyle: { color: C.yellow, type: 'dashed' }, label: { color: C.yellow, formatter: '预警 ' + warn } }
          ] }
      }]
    });
    bag.add(chart);
    return chart;
  }

  /* AI 预测（历史+未来+置信带） */
  function forecastChart(el, bag, histLabels, hist, futureLabels, future, band) {
    var allX = histLabels.concat(futureLabels);
    var split = hist.length - 1;
    function full(arr, isHist) {
      var out = new Array(allX.length).fill(null);
      arr.forEach(function (v, i) {
        out[isHist ? i : hist.length + i] = v;
      });
      return out;
    }
    var upper = future.map(function (v, i) { return v + band[i]; });
    var lower = future.map(function (v, i) { return v - band[i]; });
    var bandArr = new Array(allX.length).fill(null);
    upper.concat(lower.slice().reverse()).forEach(function (v, i) {
      if (i < upper.length) bandArr[hist.length + i] = [v, lower[i]];
    });
    var chart = init(el);
    chart.setOption({
      color: [C.cyan, C.purple],
      tooltip: tip({ trigger: 'axis' }),
      legend: { top: 0, right: 10, icon: 'roundRect', itemWidth: 10, itemHeight: 6,
        textStyle: { color: C.txt, fontSize: 10 },
        data: ['历史实际负荷', 'AI预测负荷', '置信区间(±)'] },
      grid: { left: 44, right: 18, top: 34, bottom: 30 },
      xAxis: { type: 'category', data: allX, boundaryGap: false,
        axisLine: axisCommon.axisLine, axisTick: axisCommon.axisTick,
        axisLabel: { color: C.txt, fontSize: 9, interval: 5 } },
      yAxis: { type: 'value', name: 'kW', nameTextStyle: { color: C.txt, fontSize: 10 },
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { color: C.txt, fontSize: 10 }, splitLine: axisCommon.splitLine },
      series: [
        {
          name: '置信区间(±)', type: 'line', data: bandArr,
          lineStyle: { opacity: 0 }, stack: 'band', symbol: 'none',
          areaStyle: { color: 'rgba(124,91,255,.18)' }, tooltip: { show: false }, z: 1
        },
        { name: '历史实际负荷', type: 'line', data: full(hist, true), smooth: true,
          showSymbol: false, lineStyle: { width: 2.4, color: C.cyan },
          areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(34,224,255,.28)' }, { offset: 1, color: 'rgba(34,224,255,.01)' }]) }, z: 3,
          markLine: { silent: true, symbol: 'none', label: { show: false },
            data: [{ xAxis: split, lineStyle: { color: 'rgba(255,255,255,.35)', type: 'dashed' } }] }
        },
        { name: 'AI预测负荷', type: 'line', data: full(future, false), smooth: true,
          showSymbol: false, lineStyle: { width: 2.4, color: C.purple, type: 'dashed' }, z: 2 }
      ]
    });
    bag.add(chart);
    return chart;
  }

  /* 横向条形（房间排行） */
  function rankChart(el, bag, names, vals, opt) {
    opt = opt || {};
    var chart = init(el);
    chart.setOption({
      tooltip: tip({ trigger: 'axis' }),
      grid: { left: 92, right: 30, top: 8, bottom: 8 },
      xAxis: { type: 'value', show: false },
      yAxis: { type: 'category', inverse: true, data: names,
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { color: C.txt, fontSize: 10 } },
      series: [{
        type: 'bar', data: vals.map(function (v) {
          return { value: v, itemStyle: { color: v >= 90 ? C.red : (v >= 65 ? C.orange : C.cyan),
            borderRadius: [0, 4, 4, 0] } };
        }),
        barWidth: 10,
        label: { show: true, position: 'right', color: '#9fd6ff', fontSize: 10, formatter: '{c}' }
      }]
    });
    bag.add(chart);
    return chart;
  }

  JA.Charts = {
    C: C, Bag: Bag, init: init, tip: tip, axisCommon: axisCommon,
    line: lineChart, bar: barChart, groupedBar: groupedBar, pie: pieChart, gauge: gauge,
    wave: waveChart, forecast: forecastChart, rank: rankChart, hexA: hexA
  };
})();
