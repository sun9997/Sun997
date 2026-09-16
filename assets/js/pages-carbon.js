/* =====================================================================
 * 居安智卫 —— 全生命周期碳排放数据页（天津绿色办公建筑 LCA 真实实验数据）
 * 7 类真实明细表 + LCA 占比饼图（扇区跳明细）+ 手动修改按公式实时重算
 * ===================================================================== */
(function () {
  'use strict';
  var S = function () { return JA.Store.state; };
  var Charts = JA.Charts;
  var hh = JA.h, h = hh.h, panel = hh.panel, pageCtx = hh.ctx;

  var KEYS = ['operation', 'production', 'transport', 'construction', 'demolition'];
  var NAMES = { operation: '运营阶段', production: '建材生产阶段', transport: '建材运输阶段', construction: '建造阶段', demolition: '拆除阶段' };
  var COLORS = ['#2f7bff', '#ff9d3d', '#21e6a4', '#ffc83d', '#9aa7bd'];

  function pageHead(title, crumb, actionsHtml) {
    return '<div class="page-hd"><div><h2>' + title + '</h2><div class="crumb">当前位置：' + crumb + '</div></div>' +
      '<div class="flex gap8">' + (actionsHtml || '') + '</div></div>';
  }

  /* 可编辑数值单元格（能耗编辑权限） */
  function editCell(group, name, v, digits, extra) {
    var canEdit = JA.perm.energyEdit;
    if (!canEdit) return '<span>' + (+v).toFixed(digits == null ? 3 : digits) + '</span>';
    return '<span class="edit-num" title="点击修改并按公式自动重算">' + (+v).toFixed(digits == null ? 3 : digits) +
      '<i class="edit-ico" data-group="' + group + '" data-name="' + encodeURIComponent(name) +
      '" data-digits="' + (digits == null ? 3 : digits) + '"' + (extra ? ' data-extra="' + extra + '"' : '') + '>✎</i></span>';
  }

  function tableWrap() { var w = h('div', 'tbl-wrap'); return w; }

  JA.registerPage({
    id: 'carbon', view: 'ops', group: '低碳分析', name: '碳排放数据', icon: 'energy',
    render: function (el) {
      var ctx = pageCtx();
      el.innerHTML = pageHead('全生命周期碳排放数据中台 · 天津典型绿色办公建筑 LCA 实测',
        '低碳分析 / 碳排放数据',
        '<button class="btn btn-sm" id="btnGoReport">碳足迹报告 →</button>');

      var strip = h('div', 'metric-strip mb12'); el.appendChild(strip);

      /* 汇总看板 */
      var gTop = h('div', 'grid g-2 mb12');
      var pPie = panel('全生命周期碳排放量占比', '点击扇区查看对应分项明细');
      var dPie = h('div', 'chart'); dPie.style.height = '300px'; pPie.bd.appendChild(dPie);
      var pPa = panel('单位面积碳排放指标', 'kgCO₂/㎡');
      var dPa = h('div', 'chart'); dPa.style.height = '300px'; pPa.bd.appendChild(dPa);
      gTop.appendChild(pPie.el); gTop.appendChild(pPa.el);
      el.appendChild(gTop);

      var blocks = h('div');
      el.appendChild(blocks);

      function block(anchor, title, extra) {
        var p = panel(title, extra || (JA.perm.energyEdit ? '点击 ✎ 可手动修改，系统按真实公式自动重算' : '只读视图'));
        p.el.setAttribute('data-lca', anchor);
        var w = tableWrap();
        p.bd.appendChild(w);
        blocks.appendChild(p.el);
        return w;
      }

      function renderStrip() {
        var t = S().lca.totals;
        strip.innerHTML = [
          ['全生命周期总碳排放', t.lifecycle.toLocaleString() + ' tCO₂', '生产+运输+建造+运营+拆除−碳汇'],
          ['年碳排放', t.annual + ' tCO₂/a', '按50年生命周期分摊'],
          ['单位面积年碳排', t.perAreaAnnual + ' kgCO₂/㎡·a', '面积 ' + S().lca.area.toLocaleString() + '㎡'],
          ['单位面积累计碳排', t.perAreaTotal.toLocaleString() + ' kgCO₂/㎡', '全生命周期累计'],
          ['绿化碳汇抵扣', t.sink.toFixed(3) + ' tCO₂', '单独标注，不进占比饼图'],
          ['华北电网碳排放因子', S().lca.factor + ' kgCO₂/kWh', '运行电力碳排放核算']
        ].map(function (m) {
          return '<div class="metric"><b>' + m[1] + '</b><span>' + m[0] + ' · ' + m[2] + '</span></div>';
        }).join('');
      }

      function pieData() {
        var t = S().lca.totals;
        return KEYS.map(function (k, i) {
          return { key: k, name: NAMES[k], value: +t[k].toFixed(3), itemStyle: { color: COLORS[i] } };
        });
      }
      var pieC = null, paC = null;
      function renderCharts() {
        var t = S().lca.totals;
        if (!pieC) pieC = Charts.pie(dPie, ctx.bag, {
          colors: COLORS, centerText: { v: t.lifecycle.toLocaleString(), t: 'tCO₂ 总排放' },
          data: pieData(),
          onSelect: function (key) {
            var anchor = document.querySelector('[data-lca="' + key + '"]');
            if (anchor) anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        });
        else pieC.setOption({ color: COLORS, series: [{ data: pieData() }], graphic: [] });

        var data = [
          { value: t.perAreaAnnual, itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#22e0ff' }, { offset: 1, color: 'rgba(47,123,255,.2)' }]), borderRadius: [4, 4, 0, 0] } },
          { value: t.perAreaTotal, itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#ff9d3d' }, { offset: 1, color: 'rgba(255,157,61,.2)' }]), borderRadius: [4, 4, 0, 0] } }
        ];
        if (!paC) paC = Charts.bar(dPa, ctx.bag, {
          x: ['单位面积年碳排放 (kgCO₂/㎡·a)', '单位面积累计碳排放 (kgCO₂/㎡)'], data: [],
          barWidth: 46, label: true, top: 24,
          extraSeries: [{ type: 'bar', barWidth: 46, data: data, label: { show: true, position: 'top', color: '#9fd6ff', fontSize: 12, formatter: '{c}' } }]
        });
        else paC.setOption({ series: [{ data: [] }, { data: data }] });
      }

      function renderTables() {
        blocks.innerHTML = '';
        var lca = S().lca, t = lca.totals;

        /* 1. 建材生产阶段 */
        var w1 = block('production', '一、建材生产阶段碳排放明细表', '18类建材 · 合计 ' + t.production.toFixed(3) + ' tCO₂e');
        var totP = t.production;
        w1.innerHTML = '<table class="tbl"><thead><tr><th>序号</th><th>建材名称</th><th>碳排放量 (tCO₂e)</th><th>占生产阶段比例</th></tr></thead><tbody>' +
          lca.materials.map(function (m, i) {
            return '<tr><td class="num">' + (i + 1) + '</td><td>' + m.name + '</td>' +
              '<td class="num strong">' + editCell('materials', m.name, m.v) + '</td>' +
              '<td class="num muted">' + (m.v / totP * 100).toFixed(2) + '%</td></tr>';
          }).join('') +
          '<tr class="tr-sum"><td colspan="2">合计</td><td class="num"><b>' + totP.toFixed(3) + '</b></td><td class="num">100%</td></tr>' +
          '</tbody></table>';

        /* 2. 建材运输阶段 */
        var w2 = block('transport', '二、建材运输阶段碳排放明细表', '18类建材 · 合计 ' + t.transport.toFixed(3) + ' tCO₂e');
        var totT = t.transport;
        w2.innerHTML = '<table class="tbl"><thead><tr><th>序号</th><th>建材名称</th><th>运输碳排放量 (tCO₂e)</th><th>占运输阶段比例</th></tr></thead><tbody>' +
          lca.transport.map(function (m, i) {
            return '<tr><td class="num">' + (i + 1) + '</td><td>' + m.name + '</td>' +
              '<td class="num strong">' + editCell('transport', m.name, m.v) + '</td>' +
              '<td class="num muted">' + (m.v / totT * 100).toFixed(2) + '%</td></tr>';
          }).join('') +
          '<tr class="tr-sum"><td colspan="2">合计</td><td class="num"><b>' + totT.toFixed(3) + '</b></td><td class="num">100%</td></tr>' +
          '</tbody></table>';

        /* 3. 建造/拆除对照表 */
        var w3 = block('construction', '三、建筑建造与拆除阶段碳排放对照表', '建造 ' + t.construction.toFixed(3) + ' tCO₂ · 拆除 ' + t.demolition.toFixed(3) + ' tCO₂');
        w3.innerHTML = '<table class="tbl"><thead><tr><th>阶段</th><th>碳排放量 (tCO₂)</th><th>说明</th></tr></thead><tbody>' +
          lca.construct.map(function (c) {
            return '<tr><td>' + c.name + '</td><td class="num strong">' + editCell('construct', c.name, c.v, 3, 'construct') + '</td>' +
              '<td class="fs11 muted">' + c.note + '</td></tr>';
          }).join('') + '</tbody></table>';

        /* 4. 绿化碳汇核算 */
        var w4 = block('sinks', '四、绿化碳汇核算表（碳汇单独标注抵扣量）', '合计 ' + t.sink.toFixed(3) + ' tCO₂');
        var totS = t.sink;
        w4.innerHTML = '<table class="tbl"><thead><tr><th>序号</th><th>绿化类型</th><th>碳汇量 (tCO₂)</th><th>占碳汇比例</th></tr></thead><tbody>' +
          lca.sinks.map(function (m, i) {
            return '<tr><td class="num">' + (i + 1) + '</td><td>' + m.name + '</td>' +
              '<td class="num strong c-green">' + editCell('sinks', m.name, m.v) + '</td>' +
              '<td class="num muted">' + (m.v / totS * 100).toFixed(2) + '%</td></tr>';
          }).join('') +
          '<tr class="tr-sum"><td colspan="2">碳汇合计（抵扣）</td><td class="num"><b class="c-green">-' + totS.toFixed(3) + '</b></td><td class="num">100%</td></tr>' +
          '</tbody></table>';

        /* 5. 建筑运行分项 */
        var w5 = block('operation', '五、建筑运行阶段碳排放分项表', '运行年碳排放合计 ' + t.operation.toFixed(3) + ' tCO₂');
        var totO = t.operation;
        w5.innerHTML = '<table class="tbl"><thead><tr><th>序号</th><th>用能/排放分项</th><th>碳排放量 (tCO₂)</th><th>占运行阶段比例</th></tr></thead><tbody>' +
          lca.operation.map(function (m, i) {
            return '<tr><td class="num">' + (i + 1) + '</td><td>' + m.name + '</td>' +
              '<td class="num strong">' + editCell('operation', m.name, m.v) + '</td>' +
              '<td class="num muted">' + (m.v / totO * 100).toFixed(2) + '%</td></tr>';
          }).join('') +
          '<tr class="tr-sum"><td colspan="2">建筑运行碳排放合计</td><td class="num"><b>' + totO.toFixed(3) + '</b></td><td class="num">100%</td></tr>' +
          '</tbody></table>';

        /* 6. 全生命周期汇总表 */
        var w6 = block('demolition', '六、全生命周期碳排放汇总表（单位面积指标 + 总排放量）',
          '总排放 ' + t.lifecycle.toLocaleString() + ' tCO₂ · 年排放 ' + t.annual + ' tCO₂/a');
        var rows = KEYS.map(function (k) {
          return '<tr data-lca-row="' + k + '"><td>' + NAMES[k] + '</td>' +
            '<td class="num">' + t[k].toFixed(3) + '</td><td class="num">' + lca.pct[k] + '%</td></tr>';
        }).join('');
        w6.innerHTML = '<table class="tbl"><thead><tr><th>生命周期阶段</th><th>碳排放量 (tCO₂)</th><th>占总排放比例</th></tr></thead><tbody>' +
          rows +
          '<tr class="tr-sink"><td>绿化碳汇（抵扣）</td>< class="num c-green">-' + t.sink.toFixed(3) + '</td><td class="num muted">单独标注</td></tr>' +
          '<tr class="tr-sum"><td><b>全生命周期总碳排放</b></td><td class="num"><b>' + t.lifecycle.toLocaleString() + '</b></td><td class="num"><b>100%</b></td></tr>' +
          '<tr><td>年碳排放</td><td class="num">' + t.annual + ' tCO₂/a</td><td class="num muted">总排放/' + lca.lifeYears + '年</td></tr>' +
          '<tr><td>单位面积年碳排放</td><td class="num">' + t.perAreaAnnual + ' kgCO₂/㎡·a</td><td class="num muted">面积 ' + lca.area.toLocaleString() + '㎡</td></tr>' +
          '<tr><td>单位面积总累计碳排放</td><td class="num">' + t.perAreaTotal.toLocaleString() + ' kgCO₂/㎡</td><td class="num muted">全生命周期</td></tr>' +
          '</tbody></table>';

        blocks.querySelectorAll('.edit-ico').forEach(function (ico) {
          ico.onclick = function (e) {
            e.stopPropagation();
            var group = ico.getAttribute('data-group');
            var name = decodeURIComponent(ico.getAttribute('data-name'));
            var digits = +ico.getAttribute('data-digits');
            var cur = ico.parentNode.firstChild.textContent.trim();
            var v = window.prompt('修改「' + name + '」碳排放量（提交后按真实公式自动重算并联动所有图表）', cur);
            if (v == null || isNaN(+v) || +v < 0) return;
            JA.Store.updateLcaItem(group, name, +(+v).toFixed(digits));
            JA.toast('已按真实碳排放公式重算，饼图/占比/单位面积指标已联动刷新', 'success');
          };
        });
      }

      renderStrip(); renderCharts(); renderTables();
      document.getElementById('btnGoReport').onclick = function () { JA.go('common', 'reports'); };
      ctx.sub(function (evt) {
        renderStrip();
        if (evt.type === 'lca') { renderCharts(); renderTables(); }
      });
      return ctx.done();
    }
  });
})();
