/* =====================================================================
 * 居安智卫 —— 工单与验收 / 报告中心 / 设置
 * ===================================================================== */
(function () {
  'use strict';
  var S = function () { return JA.Store.state; };
  var h = JA.h.h, panel = JA.h.panel, pageCtx = JA.h.ctx, pageHead = JA.h.head;

  function statusTag(st) {
    return ({
      '待整改': '<span class="tag tag-red">待整改</span>',
      '整改中': '<span class="tag tag-yellow">整改中</span>',
      '待验收': '<span class="tag tag-blue">待验收</span>',
      '已闭环': '<span class="tag tag-green">已闭环</span>'
    })[st] || st;
  }
  function acceptTag(a) {
    return ({
      '待验收': '<span class="tag tag-yellow">待验收</span>',
      '合格': '<span class="tag tag-green">验收合格</span>',
      '不合格': '<span class="tag tag-red">验收不合格</span>'
    })[a] || a;
  }
  function typeTag(t) {
    var cls = t === '结构整改' ? 'tag-purple' : (t === '设备检修' ? 'tag-blue' : 'tag-green');
    return '<span class="tag ' + cls + '">' + t + '</span>';
  }

  /* 报告打印 */
  JA.printHtml = function (title, html) {
    var w = window.open('', '_blank');
    w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + title + '</title>' +
      '<style>body{font-family:"Microsoft YaHei";padding:30px;color:#1a2b44;line-height:1.8}' +
      'table{border-collapse:collapse;width:100%;margin:8px 0}td,th{border:1px solid #8fa9cf;padding:8px;font-size:13px}' +
      'h2{text-align:center;letter-spacing:3px}.sub{text-align:center;color:#6a84ab;margin-bottom:20px}' +
      '.sign{display:flex;justify-content:space-between;margin-top:36px}</style></head><body>' + html + '</body></html>');
    w.document.close();
    setTimeout(function () { w.print(); }, 300);
  };

  /* ---------------- 验收报告内容 ---------------- */
  function acceptanceReport(o) {
    var d = new Date();
    return '<div class="report-box">' +
      '<h2>装配式混凝土结构分项工程质量验收报告</h2>' +
      '<div class="rpt-sub">报告编号：' + o.id.replace('WO', 'RPT') + '　生成时间：' + JA.Utils.ymdhm(d) + '</div>' +
      '<h4>一、工程与工单信息</h4>' +
      '<table><tr><th style="width:130px">工程名称</th><td>科研办公楼A座 装配式混凝土结构工程</td>' +
      '<th style="width:130px">验收分项</th><td>钢筋套筒灌浆连接 / 节点监测</td></tr>' +
      '<tr><th>工单编号</th><td>' + o.id + '</td><th>工单类型</th><td>' + o.type + '</td></tr>' +
      '<tr><th>缺陷构件</th><td>' + o.target + '</td><th>紧急程度</th><td>' + o.level + '</td></tr>' +
      '<tr><th>责任人</th><td>' + o.owner + '（' + o.phone + '）</td><th>整改期限</th><td>' + o.deadline + '</td></tr></table>' +
      '<h4>二、缺陷描述与AI监测依据</h4>' +
      '<table><tr><th>缺陷描述</th></tr><tr><td>' + o.desc + '</td></tr>' +
      '<tr><th>智能套筒监测平台数据：应力超限节点自动红色告警，3D沙盘光柱定位，监测波形滚动留痕（阈值 ' +
      S().params.sleeveWarn + '/' + S().params.sleeveLimit + 'MPa）。</th></tr></table>' +
      '<h4>三、整改结果记录</h4>' +
      '<table><tr><th>整改完成情况</th></tr><tr><td>' + (o.result || '整改单位尚未回填结果') + '</td></tr></table>' +
      '<h4>四、验收结论</h4>' +
      '<table><tr><th style="width:130px">验收状态</th><td>' +
      (o.accept === '合格' ? '<b style="color:#0a9d6c">验收合格，同意进入下道工序</b>'
        : o.accept === '不合格' ? '<b style="color:#d12b48">验收不合格，须返工重新报验</b>'
        : '待验收') + '</td></tr>' +
      '<tr><th>验收人</th><td>' + (JA.session ? JA.session.roleName : '工程验收') + '（' + (JA.session ? JA.session.username : '') + '）</td></tr></table>' +
      '<div class="rpt-sign"><span>施工单位（签字/盖章）：__________</span><span>监理单位：__________</span><span>建设/验收单位：__________</span></div>' +
      '</div>';
  }

  function showReport(title, html) {
    JA.modal({
      title: title, width: '820px', body: html,
      buttons: [
        { text: '打印 / 导出PDF' , primary: true, handler: function () { JA.printHtml(title, html); return false; } },
        { text: '关闭' }
      ]
    });
  }

  /* ================================================================
   * 智慧能源运维 · 工单与验收 → 能源能耗管理
   * （能耗异常工单 / 能耗审计记录 / 节能优化措施 / 能耗考核指标）
   * ================================================================ */
  function eoStatusTag(st) {
    return ({
      '待处理': '<span class="tag tag-red">待处理</span>',
      '处理中': '<span class="tag tag-yellow">处理中</span>',
      '已闭环': '<span class="tag tag-green">已闭环</span>'
    })[st] || st;
  }
  function eoResultTag(r) {
    return ({
      '已优化': '<span class="tag tag-green">已优化</span>',
      '已核实': '<span class="tag tag-blue">已核实</span>',
      '已排除': '<span class="tag tag-grey">已排除</span>'
    })[r] || '<span class="muted">—</span>';
  }
  function eoTypeTag(t) {
    var cls = ({ '电': 'tag-blue', '水': 'tag-green', '气': 'tag-yellow', '冷热量': 'tag-purple' })[t] || 'tag-grey';
    return '<span class="tag ' + cls + '">' + t + '</span>';
  }
  function measureTag(st) {
    return ({
      '待实施': '<span class="tag tag-grey">待实施</span>',
      '实施中': '<span class="tag tag-yellow">实施中</span>',
      '已完成': '<span class="tag tag-green">已完成</span>'
    })[st] || st;
  }

  function renderEnergyOpsPage(el) {
    var ctx = pageCtx();
    el.innerHTML = pageHead('能耗异常工单与节能管理', '智慧能源运维 / 工单与验收',
      '<button class="btn btn-primary btn-sm" id="eoCreate">+ 创建能耗工单</button>');

    /* 顶部筛选区 */
    var pFilter = panel('筛选查询', '筛选条件实时联动下方台账与指标');
    pFilter.bd.innerHTML =
      '<div class="form-row">' +
        '<div class="form-item"><label>时间范围</label><select class="sel" id="fTime">' +
          '<option value="all">全部时间</option><option value="today">今日</option>' +
          '<option value="7">近7天</option><option value="30">近30天</option><option value="month">本月</option></select></div>' +
        '<div class="form-item"><label>能耗类型</label><select class="sel" id="fType">' +
          '<option value="all">全部</option><option>电</option><option>水</option><option>气</option><option>冷热量</option></select></div>' +
        '<div class="form-item"><label>工单状态</label><select class="sel" id="fStatus">' +
          '<option value="all">全部</option><option>待处理</option><option>处理中</option><option>已闭环</option></select></div>' +
        '<div class="form-item"><label>异常类型</label><select class="sel" id="fAnom">' +
          '<option value="all">全部</option><option>超预算</option><option>峰值异常</option>' +
          '<option>设备能耗突增</option><option>区域能耗异常</option></select></div>' +
        '<div class="form-item" style="flex:1.5"><label>区域 / 设备</label>' +
          '<input class="inp" id="fKw" placeholder="输入楼层、区域或设备名称关键词"></div>' +
      '</div>';
    el.appendChild(pFilter.el);

    /* 三类台账 Tab */
    var tabs = h('div', 'tabs mb12');
    tabs.innerHTML = ['orders', 'audits', 'measures'].map(function (t, i) {
      var name = { orders: '能耗异常工单', audits: '能耗审计记录', measures: '节能优化措施' }[t];
      return '<div class="tab ' + (i === 0 ? 'on' : '') + '" data-t="' + t + '">' + name + '</div>';
    }).join('');
    el.appendChild(tabs);
    var pTbl = panel('能耗异常工单台账（发现 → 处理 → 闭环）');
    var tw = h('div', 'tbl-wrap'); pTbl.bd.appendChild(tw); el.appendChild(pTbl.el);

    /* 能耗考核指标 */
    var pKpi = panel('能耗考核指标', '绑定建筑面积 20183㎡ · 华北电网因子 0.8843 kgCO₂/kWh 实时重算');
    var kpiGrid = h('div', 'metric-strip'); pKpi.bd.appendChild(kpiGrid); el.appendChild(pKpi.el);

    /* 底部关键指标卡片 */
    var strip = h('div', 'metric-strip mt12'); el.appendChild(strip);

    var tab = 'orders';
    function F(id) { return document.getElementById(id); }
    function inTime(dateStr) {
      var v = F('fTime').value;
      if (v === 'all') return true;
      var d = new Date(dateStr.replace(' ', 'T'));
      var nowD = new Date();
      if (v === 'today') return d.toDateString() === nowD.toDateString();
      if (v === 'month') return d.getFullYear() === nowD.getFullYear() && d.getMonth() === nowD.getMonth();
      return (nowD - d) <= (+v) * 86400000;
    }
    function kwHit(text) {
      var k = F('fKw').value.trim();
      return !k || (text || '').indexOf(k) >= 0;
    }

    function filteredOrders() {
      return S().energyOrders.filter(function (o) {
        return (F('fType').value === 'all' || o.energyType === F('fType').value) &&
          (F('fStatus').value === 'all' || o.status === F('fStatus').value) &&
          (F('fAnom').value === 'all' || o.anomalyType === F('fAnom').value) &&
          inTime(o.created) && kwHit(o.target + o.desc);
      });
    }

    function renderTable() {
      if (tab === 'orders') {
        pTbl.el.querySelector('.panel-hd h3').textContent = '能耗异常工单台账（发现 → 处理 → 闭环）';
        var rows = filteredOrders();
        tw.innerHTML = '<table class="tbl"><thead><tr>' +
          '<th>工单编号</th><th>能耗类型</th><th>异常类型</th><th>关联设备/区域</th>' +
          '<th>能耗值</th><th>基准值</th><th>偏差比例</th><th>工单状态</th><th>处理结果</th><th>操作</th>' +
          '</tr></thead><tbody>' +
          (rows.length ? rows.map(function (o) {
            var acts = '';
            if (o.status === '待处理') acts += '<button class="btn btn-sm" data-act="take">受理</button> ';
            if (o.status !== '已闭环') acts += '<button class="btn btn-success btn-sm" data-act="close">处理闭环</button>';
            return '<tr><td class="num" style="font-size:11px">' + o.id + '</td>' +
              '<td>' + eoTypeTag(o.energyType) + '</td><td>' + o.anomalyType + '</td>' +
              '<td style="font-size:11px;max-width:210px">' + o.target + '</td>' +
              '<td class="num">' + o.value + ' ' + o.unit + '</td><td class="num">' + o.base + ' ' + o.unit + '</td>' +
              '<td class="num" style="color:' + (o.dev > 20 ? '#ff4d6a' : '#ffc83d') + '">+' + o.dev.toFixed(1) + '%</td>' +
              '<td>' + eoStatusTag(o.status) + '</td><td>' + eoResultTag(o.result) + '</td>' +
              '<td style="white-space:nowrap">' + (acts || '<span class="tag tag-green">已闭环</span>') + '</td></tr>';
          }).join('') : '<tr><td colspan="10" style="text-align:center;color:var(--txt3);padding:18px">当前筛选条件下无异常工单</td></tr>') +
          '</tbody></table>';
        tw.querySelectorAll('[data-act]').forEach(function (b) {
          b.onclick = function () {
            var id = b.closest('tr').querySelector('.num').textContent;
            var o = S().energyOrders.filter(function (x) { return x.id === id; })[0];
            if (b.getAttribute('data-act') === 'take') {
              JA.Store.updateEnergyOrder(o.id, { status: '处理中' });
              JA.toast('工单 ' + o.id + ' 已受理，转入处理中', 'success');
            } else openClose(o);
          };
        });
      } else if (tab === 'audits') {
        pTbl.el.querySelector('.panel-hd h3').textContent = '能耗审计记录（基准对比 · 节能率核算）';
        var rows2 = S().energyAudits.filter(function (a) { return inTime(a.time) && kwHit(a.object + a.reason); });
        tw.innerHTML = '<table class="tbl"><thead><tr>' +
          '<th>审计编号</th><th>审计对象</th><th>对象类型</th><th>审计周期</th>' +
          '<th>基准能耗</th><th>实际能耗</th><th>节能率</th><th>异常原因分析</th><th>审计结论</th>' +
          '</tr></thead><tbody>' +
          (rows2.length ? rows2.map(function (a) {
            var ok = a.saveRate >= 0;
            return '<tr><td class="num" style="font-size:11px">' + a.id + '</td>' +
              '<td>' + a.object + '</td><td><span class="tag tag-blue">' + a.objType + '</span></td>' +
              '<td>' + a.period + '</td>' +
              '<td class="num">' + a.base + ' kWh</td><td class="num">' + a.actual + ' kWh</td>' +
              '<td class="num" style="color:' + (ok ? '#21e6a4' : '#ff4d6a') + '">' + (ok ? '' : '-') + Math.abs(a.saveRate).toFixed(1) + '%</td>' +
              '<td style="font-size:11px;max-width:230px">' + a.reason + '</td>' +
              '<td>' + (a.conclusion.indexOf('未达标') >= 0 ? '<span class="tag tag-red">' + a.conclusion + '</span>'
                : a.conclusion.indexOf('超额') >= 0 ? '<span class="tag tag-green">' + a.conclusion + '</span>'
                : '<span class="tag tag-yellow">' + a.conclusion + '</span>') + '</td></tr>';
          }).join('') : '<tr><td colspan="9" style="text-align:center;color:var(--txt3);padding:18px">当前筛选条件下无审计记录</td></tr>') +
          '</tbody></table>';
      } else {
        pTbl.el.querySelector('.panel-hd h3').textContent = '节能优化措施（措施 → 实施 → 成效登记）';
        var rows3 = S().energyMeasures.filter(function (m) { return kwHit(m.name + m.target); });
        tw.innerHTML = '<table class="tbl"><thead><tr>' +
          '<th>措施编号</th><th>措施名称</th><th>关联设备/区域</th><th>实施时间</th>' +
          '<th>预期节能率</th><th>实际节能率</th><th>状态</th><th>操作</th>' +
          '</tr></thead><tbody>' +
          (rows3.length ? rows3.map(function (m) {
            var acts = '';
            if (m.status === '待实施') acts = '<button class="btn btn-sm" data-act="start">启动实施</button>';
            else if (m.status === '实施中') acts = '<button class="btn btn-success btn-sm" data-act="done">登记成效</button>';
            return '<tr><td class="num" style="font-size:11px">' + m.id + '</td>' +
              '<td>' + m.name + '</td><td style="font-size:11px;max-width:220px">' + m.target + '</td>' +
              '<td class="fs11">' + m.startTime + '</td>' +
              '<td class="num">' + m.expectRate.toFixed(1) + '%</td>' +
              '<td class="num" style="color:#21e6a4">' + (m.actualRate == null ? '—' : m.actualRate.toFixed(1) + '%') + '</td>' +
              '<td>' + measureTag(m.status) + '</td>' +
              '<td style="white-space:nowrap">' + (acts || '<span class="tag tag-green">已完成</span>') + '</td></tr>';
          }).join('') : '<tr><td colspan="8" style="text-align:center;color:var(--txt3);padding:18px">当前筛选条件下无节能措施</td></tr>') +
          '</tbody></table>';
        tw.querySelectorAll('[data-act]').forEach(function (b) {
          b.onclick = function () {
            var id = b.closest('tr').querySelector('.num').textContent;
            var m = S().energyMeasures.filter(function (x) { return x.id === id; })[0];
            if (b.getAttribute('data-act') === 'start') {
              JA.Store.updateEnergyMeasure(m.id, { status: '实施中' });
              JA.toast('措施「' + m.name + '」已启动实施', 'success');
            } else openMeasureDone(m);
          };
        });
      }
    }

    function openClose(o) {
      JA.modal({
        title: '处理能耗异常工单 · ' + o.id, width: '560px',
        body: '<div style="line-height:1.9;font-size:12.5px;color:var(--txt2)">关联对象：<b style="color:#dff1ff">' + o.target + '</b><br>' +
          '异常类型：' + o.anomalyType + '　偏差：+' + o.dev.toFixed(1) + '%（' + o.value + ' / 基准 ' + o.base + ' ' + o.unit + '）</div>' +
          '<div class="form-item mt12"><label>处理结果 <span style="color:#ff4d6a">*</span></label><select class="sel" id="eoResult">' +
          '<option>已优化</option><option>已核实</option><option>已排除</option></select></div>',
        buttons: [
          { text: '取消' },
          { text: '提交并闭环', primary: true, handler: function (c, bd) {
            var r = bd.querySelector('#eoResult').value;
            JA.Store.updateEnergyOrder(o.id, { result: r });
            JA.toast('工单 ' + o.id + ' 已闭环（' + r + '）', 'success');
          } }
        ]
      });
    }
    function openMeasureDone(m) {
      JA.modal({
        title: '登记节能成效 · ' + m.id, width: '520px',
        body: '<div style="line-height:1.9;font-size:12.5px;color:var(--txt2)">措施：<b style="color:#dff1ff">' + m.name + '</b><br>' +
          '关联对象：' + m.target + '　预期节能率：' + m.expectRate.toFixed(1) + '%</div>' +
          '<div class="form-item mt12"><label>实际节能率 (%) <span style="color:#ff4d6a">*</span></label>' +
          '<input class="inp" id="meRate" type="number" step="0.1" min="0" max="100" placeholder="按实测能耗对比基准核算"></div>',
        buttons: [
          { text: '取消' },
          { text: '提交成效', primary: true, handler: function (c, bd) {
            var v = bd.querySelector('#meRate').value;
            if (v === '' || isNaN(+v)) { JA.toast('请填写实际节能率', 'warn'); return false; }
            JA.Store.updateEnergyMeasure(m.id, { actualRate: +v });
            JA.toast('措施「' + m.name + '」成效已登记，状态完成', 'success');
          } }
        ]
      });
    }

    /* 能耗考核指标（实时公式重算） */
    function renderKpi() {
      var k = JA.Store.kpis();
      var ek = S().energyKpi;
      var annualKwh = S().lca.totals.annual * 1000 / 0.8843;   // 年运行能耗 kWh（年碳排放/电网因子）
      var perArea = annualKwh / k.area;                        // 单位面积能耗
      var perCap = annualKwh / ek.staff;                       // 人均能耗
      var budgetRate = ek.monthActual / ek.monthBudget * 100;  // 预算完成率
      var renewRate = S().pv.year1Gen / annualKwh * 100;       // 可再生能源消纳率
      var done = S().energyMeasures.filter(function (m) { return m.actualRate != null; });
      var avgSave = done.length ? done.reduce(function (a, m) { return a + m.actualRate; }, 0) / done.length : 0;
      var targetRate = avgSave / (S().params.saveRate * 100) * 100;  // 节能目标完成率
      kpiGrid.innerHTML = [
        ['单位面积能耗', perArea.toFixed(1) + ' kWh/㎡·a', '年口径 · 按电网因子折算', 'good'],
        ['人均能耗', Math.round(perCap) + ' kWh/人·a', '核定人数 ' + ek.staff + ' 人', 'good'],
        ['能耗预算完成率', budgetRate.toFixed(1) + '%', '当月 ' + ek.monthActual + ' / 预算 ' + ek.monthBudget + ' kWh', budgetRate <= 100 ? 'good' : 'bad'],
        ['可再生能源消纳率', renewRate.toFixed(1) + '%', 'BIPV首年发电量 / 年运行能耗', 'good'],
        ['节能目标完成率', targetRate.toFixed(1) + '%', '实际节能 ' + avgSave.toFixed(1) + '% / 目标 ' + (S().params.saveRate * 100).toFixed(0) + '%', targetRate >= 80 ? 'good' : 'warn']
      ].map(function (m) {
        return '<div class="metric ' + m[3] + '"><b>' + m[1] + '</b><span>' + m[0] + ' · ' + m[2] + '</span></div>';
      }).join('');
    }

    /* 底部关键指标卡片 */
    function renderStrip() {
      var all = S().energyOrders;
      var closed = all.filter(function (o) { return o.status === '已闭环'; }).length;
      var done = S().energyMeasures.filter(function (m) { return m.actualRate != null; });
      var avgSave = done.length ? done.reduce(function (a, m) { return a + m.actualRate; }, 0) / done.length : 0;
      var ek = S().energyKpi;
      var budgetRate = ek.monthActual / ek.monthBudget * 100;
      var open = all.length - closed;
      strip.innerHTML = [
        ['能耗异常工单数', all.length + ' 单', '待处理/处理中 ' + open + ' 单', open ? 'bad' : 'good'],
        ['已闭环数', closed + ' 单', '闭环率 ' + (all.length ? Math.round(closed / all.length * 100) : 0) + '%', 'good'],
        ['平均节能率', avgSave.toFixed(1) + '%', '按已登记成效的节能措施核算', 'good'],
        ['预算完成率', budgetRate.toFixed(1) + '%', '当月累计 / 月度预算', budgetRate <= 100 ? 'good' : 'bad']
      ].map(function (m) {
        return '<div class="metric ' + m[3] + '"><b>' + m[1] + '</b><span>' + m[0] + ' · ' + m[2] + '</span></div>';
      }).join('');
    }

    document.getElementById('eoCreate').onclick = function () {
      JA.modal({
        title: '创建能耗异常工单', width: '640px',
        body: '<div class="form-row"><div class="form-item"><label>能耗类型</label><select class="sel" id="eoType">' +
            '<option>电</option><option>水</option><option>气</option><option>冷热量</option></select></div>' +
          '<div class="form-item"><label>异常类型</label><select class="sel" id="eoAnom">' +
            '<option>超预算</option><option>峰值异常</option><option>设备能耗突增</option><option>区域能耗异常</option></select></div></div>' +
          '<div class="form-item" style="flex:1;min-width:100%"><label>关联设备/区域 <span class="req">*</span></label>' +
            '<input class="inp" id="eoTarget" placeholder="如：3F 智慧指挥中心 / 精密空调 CRAC-403"></div>' +
          '<div class="form-row"><div class="form-item"><label>能耗值 <span class="req">*</span></label><input class="inp" id="eoValue" type="number" step="0.1"></div>' +
          '<div class="form-item"><label>基准值 <span class="req">*</span></label><input class="inp" id="eoBase" type="number" step="0.1"></div>' +
          '<div class="form-item"><label>单位</label><select class="sel" id="eoUnit"><option>kWh</option><option>m³</option></select></div></div>' +
          '<div class="form-item" style="flex:1;min-width:100%"><label>异常描述 <span class="req">*</span></label>' +
            '<textarea class="inp" id="eoDesc" placeholder="请描述异常现象、影响范围…"></textarea></div>',
        buttons: [
          { text: '取消' },
          { text: '创建并派发', primary: true, handler: function (c, bd) {
            var target = bd.querySelector('#eoTarget').value.trim();
            var value = +bd.querySelector('#eoValue').value;
            var base = +bd.querySelector('#eoBase').value;
            var desc = bd.querySelector('#eoDesc').value.trim();
            if (!target || !desc || !(value > 0) || !(base > 0)) { JA.toast('请完整填写对象、能耗值、基准值与描述', 'warn'); return false; }
            JA.Store.createEnergyOrder({
              energyType: bd.querySelector('#eoType').value, anomalyType: bd.querySelector('#eoAnom').value,
              target: target, value: value, base: base, unit: bd.querySelector('#eoUnit').value, desc: desc
            });
            JA.toast('能耗异常工单已创建并派发', 'success');
          } }
        ]
      });
    };

    ['fTime', 'fType', 'fStatus', 'fAnom'].forEach(function (id) { F(id).onchange = renderTable; });
    F('fKw').oninput = renderTable;
    tabs.querySelectorAll('.tab').forEach(function (t) {
      t.onclick = function () {
        tabs.querySelectorAll('.tab').forEach(function (x) { x.classList.remove('on'); });
        t.classList.add('on'); tab = t.getAttribute('data-t'); renderTable();
      };
    });
    renderStrip(); renderTable(); renderKpi();
    ctx.sub(function () { renderStrip(); renderTable(); renderKpi(); });
    return ctx.done();
  }

  /* ================================================================
   * 工单与验收（施工视图：结构整改闭环）
   * ================================================================ */
  JA.renderOrdersPage = function (el, opts) {
    opts = opts || {};
    if (!opts.structural) return renderEnergyOpsPage(el);   // 智慧能源运维：能源能耗管理
    var ctx = pageCtx();
    el.innerHTML = pageHead(opts.structural ? '结构整改工单与整改工单' : '整改工单与整改工单',
      (opts.structural ? '智能节点感知' : '智慧能源运维') + ' / 整改工单',
      '<button class="btn btn-primary btn-sm" id="woCreate">+ 创建整改工单</button>');

    var strip = h('div', 'metric-strip mb12'); el.appendChild(strip);
    var tabs = h('div', 'tabs mb12');
    tabs.innerHTML = ['all', '待整改', '整改中', '待验收', '已闭环'].map(function (t, i) {
      return '<div class="tab ' + (i === 0 ? 'on' : '') + '" data-f="' + t + '">' + (i === 0 ? '全部工单' : t) + '</div>';
    }).join('');
    el.appendChild(tabs);
    var pTbl = panel('工单台账（创建 → 整改 → 验收 → 闭环）');
    var tw = h('div', 'tbl-wrap'); pTbl.bd.appendChild(tw); el.appendChild(pTbl.el);
    var filter = 'all';

    function list() {
      return S().orders.filter(function (o) {
        return opts.structural ? (o.type === '结构整改' && (filter === 'all' || o.status === filter))
                               : (filter === 'all' || o.status === filter);
      });
    }
    function renderStrip() {
      var all = S().orders.filter(function (o) { return !opts.structural || o.type === '结构整改'; });
      function n(st) { return all.filter(function (o) { return o.status === st; }).length; }
      strip.innerHTML = [
        ['工单总数', all.length + ' 单', ''],
        ['待整改', n('待整改') + ' 单', '', n('待整改') ? 'bad' : 'good'],
        ['整改中', n('整改中') + ' 单', '', 'warn'],
        ['待验收', n('待验收') + ' 单', '验收人待处理', n('待验收') ? 'warn' : 'good'],
        ['已闭环', n('已闭环') + ' 单', '', 'good']
      ].map(function (m) {
        return '<div class="metric ' + (m[3] || '') + '"><b>' + m[1] + '</b><span>' + m[0] + (m[2] ? ' · ' + m[2] : '') + '</span></div>';
      }).join('');
    }
    function renderTable() {
      var rows = list();
      tw.innerHTML = '<table class="tbl"><thead><tr>' +
        '<th>工单编号</th><th>类型</th><th>缺陷构件/对象</th><th>缺陷描述</th><th>责任人</th><th>期限</th>' +
        '<th>等级</th><th>整改状态</th><th>验收</th><th>操作</th></tr></thead><tbody>' +
        rows.map(function (o) {
          var acts = '';
          if (o.status !== '已闭环') {
            acts += '<button class="btn btn-sm" data-act="result">录入整改</button> ';
            if (o.status === '待验收') acts += '<button class="btn btn-success btn-sm" data-act="accept">验收</button> ';
          }
          if (o.type === '结构整改') acts += '<button class="btn btn-sm" data-act="report">验收报告</button>';
          return '<tr><td class="num" style="font-size:11px">' + o.id + '</td><td>' + typeTag(o.type) + '</td>' +
            '<td>' + o.target + '</td><td style="font-size:11px;max-width:240px">' + o.desc + '</td>' +
            '<td>' + o.owner + '</td><td class="fs11">' + o.deadline + '</td>' +
            '<td>' + (o.level === '紧急' ? '<span class="tag tag-red">' : o.level === '关注' ? '<span class="tag tag-yellow">' : '<span class="tag tag-grey">') + o.level + '</span></td>' +
            '<td>' + statusTag(o.status) + '</td><td>' + acceptTag(o.accept) + '</td>' +
            '<td style="white-space:nowrap">' + (acts || '<span class="tag tag-green">已闭环</span>') + '</td></tr>';
        }).join('') + '</tbody></table>';
      tw.querySelectorAll('[data-act]').forEach(function (b) {
        b.onclick = function () {
          var id = b.closest('tr').querySelector('.num').textContent;
          var o = S().orders.filter(function (x) { return x.id === id; })[0];
          var act = b.getAttribute('data-act');
          if (act === 'result') openResult(o);
          else if (act === 'accept') openAccept(o);
          else if (act === 'report') showReport('套筒验收报告 · ' + o.id, acceptanceReport(o));
        };
      });
    }
    function openResult(o) {
      JA.modal({
        title: '记录整改结果 · ' + o.id, width: '560px',
        body: '<div class="form-item"><label>整改完成情况 <span style="color:#ff4d6a">*</span></label>' +
          '<textarea class="inp" id="orText" style="min-height:110px" placeholder="请记录整改措施、复检数据、完成时间…">' + (o.result || '') + '</textarea></div>' +
          '<div class="form-hint">提交后工单进入“待验收”状态，由工程验收账号核验并生成验收报告。</div>',
        buttons: [
          { text: '取消' },
          { text: '提交整改结果', primary: true, handler: function (c, bd) {
            var txt = bd.querySelector('#orText').value.trim();
            if (!txt) { JA.toast('请填写整改结果', 'warn'); return false; }
            JA.Store.updateOrder(o.id, { result: txt, status: '待验收' });
            JA.toast('整改结果已提交，工单流转至待验收', 'success');
          } }
        ]
      });
    }
    function openAccept(o) {
      JA.modal({
        title: '验收核验 · ' + o.id, width: '520px',
        body: '<div style="line-height:1.9;font-size:12.5px;color:var(--txt2)">缺陷对象：<b style="color:#dff1ff">' + o.target + '</b><br>' +
          '整改结果：' + (o.result || '-') + '</div>' +
          '<div class="form-item mt12"><label>验收结论</label><select class="sel" id="acResult">' +
          '<option value="合格">合格（闭环，进入下道工序）</option>' +
          '<option value="不合格">不合格（返工重新报验）</option></select></div>',
        buttons: [
          { text: '取消' },
          { text: '提交验收结论', primary: true, handler: function (c, bd) {
            var r = bd.querySelector('#acResult').value;
            JA.Store.updateOrder(o.id, { accept: r });
            JA.toast('验收结论：' + r + '，工单已闭环', r === '合格' ? 'success' : 'error');
            if (o.type === '结构整改' && r === '合格') {
              setTimeout(function () { showReport('套筒验收报告 · ' + o.id, acceptanceReport(JA.Store.state.orders.filter(function (x) { return x.id === o.id; })[0])); }, 350);
            }
          } }
        ]
      });
    }

    document.getElementById('woCreate').onclick = function () {
      JA.openOrderCreate(opts.structural
        ? { typeOptions: ['结构整改'], type: '结构整改' }
        : {});
    };
    tabs.querySelectorAll('.tab').forEach(function (t) {
      t.onclick = function () {
        tabs.querySelectorAll('.tab').forEach(function (x) { x.classList.remove('on'); });
        t.classList.add('on'); filter = t.getAttribute('data-f'); renderTable();
      };
    });
    renderStrip(); renderTable();
    ctx.sub(function () { renderStrip(); renderTable(); });
    return ctx.done();
  };

  /* 运维视图工单入口 */
  JA.registerPage({
    id: 'orders', view: 'ops', group: '预警与闭环', name: '工单与验收', icon: 'order',
    render: function (el) { return JA.renderOrdersPage(el, {}); }
  });

  /* ================================================================
   * 报告中心
   * ================================================================ */
  JA.renderReportsPage = function (el, opts) {
    opts = opts || {};
    var ctx = pageCtx();
    el.innerHTML = pageHead('报告中心 · 验收与运营报告', (opts.structural ? '智能节点感知' : '综合总览') + ' / 报告中心');
    var grid = h('div', 'grid g-3 mb12');
    var cards = [
      ['lca-op', '建筑运行碳排放分项报告', '仅运维阶段口径：按供暖/空调/照明/动力四类分类展示运行碳排放（年合计约3.44万 tCO₂）', '智能能源管理', operationReport],
      ['control', '节能优化效果评估报告', '建筑侧四维减碳+光储侧调控，综合节能效率10%-40%', '智能能源管理', savingReport],
      ['pv', '光伏充电站发电量与效益分析报告', 'BIPV覆盖率30%、储能240kW/500kWh、25年发电量衰减与减碳收益', '智能能源管理', pvReport],
      ['device-alert', '设备异常与整改工单报告', '异常能耗/无人空耗/设备故障/套筒应力超限告警与整改工单闭环记录', '安全闭环', alertOrderReport],
      ['report', '套筒验收报告', '套筒灌浆节点缺陷整改工单闭环后自动生成，含监测依据与四方签章', '结构验收', function () {
        var done = S().orders.filter(function (o) { return o.type === '结构整改'; });
        if (!done.length) { JA.toast('暂无结构整改工单', 'warn'); return; }
        var o = done[0];
        showReport('套筒验收报告 · ' + o.id, acceptanceReport(o));
      }],
      ['energy', '建筑能源运营日报', '总能耗、分项能耗、异常告警、AI预测准确率与节能成效汇总', '能源运营', energyReport],
      ['device', '设备设施运行日报', '设备在线率、故障与检修工单、调控策略执行情况', '设备设施', deviceReport]
    ].filter(function (c) { return !opts.structural || c[3] === '结构验收'; });
    grid.innerHTML = cards.map(function (c, i) {
      return '<div class="panel" style="padding:18px;cursor:pointer" data-i="' + i + '">' +
        '<div style="font-size:15px;font-weight:700;color:#dff1ff;margin-bottom:8px">' + c[1] + '</div>' +
        '<div class="fs11 muted" style="line-height:1.8;min-height:50px">' + c[2] + '</div>' +
        '<div class="flex jcb aic mt12"><span class="tag tag-blue">' + c[3] + '</span>' +
        '<span class="btn btn-primary btn-sm">生成报告</span></div></div>';
    }).join('');
    el.appendChild(grid);
    grid.querySelectorAll('[data-i]').forEach(function (c) {
      c.onclick = function () { cards[+c.getAttribute('data-i')][4](); };
    });

    var p = panel('历史报告记录');
    var stOrders = S().orders.filter(function (o) { return o.type === '结构整改'; });
    p.bd.innerHTML = '<table class="tbl"><thead><tr><th>报告编号</th><th>报告名称</th><th>关联工单</th><th>验收结论</th><th>生成时间</th><th>操作</th></tr></thead><tbody>' +
      stOrders.map(function (o) {
        return '<tr><td class="num" style="font-size:11px">' + o.id.replace('WO', 'RPT') + '</td>' +
          '<td>套筒验收报告</td><td>' + o.id + '</td><td>' + acceptTag(o.accept) + '</td>' +
          '<td class="fs11">' + o.created + '</td>' +
          '<td><button class="btn btn-sm" data-id="' + o.id + '">查看</button></td></tr>';
      }).join('') + '</tbody></table>';
    p.bd.querySelectorAll('button[data-id]').forEach(function (b) {
      b.onclick = function () {
        var o = S().orders.filter(function (x) { return x.id === b.getAttribute('data-id'); })[0];
        showReport('套筒验收报告 · ' + o.id, acceptanceReport(o));
      };
    });
    el.appendChild(p.el);
    return ctx.done();
  };

  function energyReport() {
    var k = JA.Store.kpis(), s = S();
    var tot = s.series.total.reduce(function (a, b) { return a + b; }, 0);
    var he = s.series.heating.reduce(function (a, b) { return a + b; }, 0);
    var hv = s.series.hvac.reduce(function (a, b) { return a + b; }, 0);
    var lt = s.series.light.reduce(function (a, b) { return a + b; }, 0);
    var sk = s.series.socket.reduce(function (a, b) { return a + b; }, 0);
    var ev = s.series.elevator.reduce(function (a, b) { return a + b; }, 0);
    var topRooms = s.rooms.slice().sort(function (a, b) { return b.total - a.total; }).slice(0, 5);
    var html = '<div class="report-box"><h2>建筑能源运营日报</h2>' +
      '<div class="rpt-sub">' + JA.Utils.ymd(new Date()) + ' ｜ 居安智卫 AI建筑低碳能源智慧管理平台</div>' +
      '<h4>一、总体指标</h4><table>' +
      '<tr><th>监测建筑</th><td>天津典型绿色办公建筑（20183㎡ / 17层）</td><th>监测房间</th><td>' + k.monitoredRooms + ' 间</td></tr>' +
      '<tr><th>今日累计能耗</th><td>' + tot + ' kWh</td><th>当前在场人数</th><td>' + k.occupancy + ' 人</td></tr>' +
      '<tr><th>活动告警</th><td>' + k.alerts + ' 起（红色 ' + k.redAlerts + '）</td><th>待处理工单</th><td>' + k.orders + ' 单</td></tr>' +
      '<tr><th>AI预测准确率</th><td>≥92%</td><th>综合节能效率</th><td>10%-40%</td></tr></table>' +
      '<h4>二、分项能耗（电力排放因子 0.8843 kgCO₂/kWh）</h4><table><tr><th>供暖</th><th>空调风机</th><th>照明</th><th>插座设备</th><th>电梯</th></tr><tr>' +
      '<td>' + he + ' kWh</td><td>' + hv + ' kWh</td><td>' + lt + ' kWh（' + Math.round(lt / tot * 100) + '%）</td>' +
      '<td>' + sk + ' kWh（' + Math.round(sk / tot * 100) + '%）</td><td>' + ev + ' kWh</td></tr></table>' +
      '<h4>三、能耗强度TOP5房间</h4><table><tr><th>房间</th><th>名称</th><th>总能耗kWh</th><th>态势</th></tr>' +
      topRooms.map(function (r) {
        var lv = JA.Store.roomLevel(r);
        return '<tr><td>' + r.no + '</td><td>' + r.name + '</td><td>' + r.total + '</td><td>' +
          ({ high: '高能耗红色', mid: '偏高橙色', normal: '正常绿色', low: '低载蓝色', fault: '设备故障' })[lv] + '</td></tr>';
      }).join('') + '</table>' +
      '<p style="margin-top:14px;color:#33507e">本报告由平台统一数据中台自动生成，数据经采集-校验-清洗-归集治理流程，可用于课题答辩与运营分析。</p></div>';
    showReport('建筑能源运营日报', html);
  }
  function deviceReport() {
    var s = S(), d = s.devices;
    var html = '<div class="report-box"><h2>设备设施运行日报</h2>' +
      '<div class="rpt-sub">' + JA.Utils.ymd(new Date()) + '</div>' +
      '<h4>一、运行总览</h4><table><tr><th>设备总数</th><td>' + d.length + ' 台</td>' +
      '<th>在线率</th><td>' + Math.round(d.filter(function (x) { return x.status !== 'fault'; }).length / d.length * 100) + '%</td></tr>' +
      '<tr><th>运行</th><td>' + d.filter(function (x) { return x.status === 'running'; }).length + ' 台</td>' +
      '<th>停机/故障</th><td>' + d.filter(function (x) { return x.status === 'stopped'; }).length + ' / ' +
        d.filter(function (x) { return x.status === 'fault'; }).length + ' 台</td></tr></table>' +
      '<h4>二、故障与工单</h4><table><tr><th>设备</th><th>位置</th><th>状态</th><th>关联工单</th></tr>' +
      d.filter(function (x) { return x.status === 'fault'; }).map(function (x) {
        return '<tr><td>' + x.name + '</td><td>' + x.roomName + '</td><td>故障</td><td>WO-20260911-02</td></tr>';
      }).join('') + '</table></div>';
    showReport('设备设施运行日报', html);
  }

  function rptHead(title, sub) {
    return '<div class="report-box"><h2>' + title + '</h2>' +
      '<div class="rpt-sub">' + JA.Utils.ymd(new Date()) + ' ｜ 居安智卫 AI建筑低碳能源智慧管理平台 ｜ ' + (sub || '数据来源：天津绿色办公建筑LCA测算 / 装配式光储一体化充电站实测') + '</div>';
  }
  function rptTail() {
    return '<p style="margin-top:14px;color:#33507e">本报告由统一数据中台依据真实实验数据自动生成，修改录入数据后按真实碳排放因子与衰减公式自动重算，可用于课题答辩与运营分析。</p></div>';
  }
  function matTable(arr, total, unit) {
    return '<table><tr><th>序号</th><th>名称</th><th>碳排放量（' + unit + '）</th><th>占比</th></tr>' +
      arr.map(function (m, i) {
        return '<tr><td>' + (i + 1) + '</td><td>' + m.name + '</td><td>' + m.v.toFixed(3) + '</td><td>' + (m.v / total * 100).toFixed(2) + '%</td></tr>';
      }).join('') +
      '<tr><th colspan="2">合计</th><th>' + total.toFixed(3) + '</th><th>100%</th></tr></table>';
  }
  /* 1. 建筑运行碳排放分项报告（仅运维阶段：供暖/空调/照明/动力 四类） */
  function operationReport() {
    var l = S().lca;
    var opMap = {};
    l.operation.forEach(function (m) { opMap[m.name] = m.v; });
    // 运维阶段四类口径归集（不含建材生产、运输、建造、拆除等建设期排放）
    var cats = [
      { name: '供暖碳排放', desc: '市政热力（烟煤II）+ 楼内供暖',
        items: [['供暖', opMap['供暖']], ['市政热力（烟煤II）', opMap['市政热力烟煤II']]] },
      { name: '空调碳排放', desc: '冷热源输配 + 空调机组风机用电',
        items: [['空调风机', opMap['空调风机']]] },
      { name: '照明碳排放', desc: '全楼照明回路用电',
        items: [['照明', opMap['照明']]] },
      { name: '动力碳排放', desc: '插座设备 / 电梯排风机 / 设备安装维护',
        items: [['插座设备', opMap['插座设备']], ['其他（电梯/排风机）', opMap['其他（电梯/排风机）']], ['设备安装维护', opMap['设备安装维护']]] }
    ];
    cats.forEach(function (c) {
      c.total = c.items.reduce(function (a, x) { return a + x[1]; }, 0);
    });
    var grand = cats.reduce(function (a, c) { return a + c.total; }, 0);
    var html = rptHead('建筑运行碳排放分项报告', '数据口径：仅建筑运维阶段运行碳排放（建设期排放不在统计范围）') +
      '<h4>一、建筑基础信息</h4><table><tr><th>建筑类型</th><td>天津典型绿色办公建筑</td><th>总建筑面积</th><td>20183 ㎡</td></tr>' +
      '<tr><th>地上层数</th><td>17 层</td><th>华北电网碳排放因子</th><td>0.8843 kgCO₂/kWh</td></tr></table>' +
      '<h4>二、运维阶段碳排放分类汇总（年合计 ' + grand.toFixed(3) + ' tCO₂）</h4>' +
      '<table><tr><th>排放类别</th><th>包含分项</th><th>年碳排放量（tCO₂）</th><th>占运维阶段比例</th></tr>' +
      cats.map(function (c) {
        return '<tr><td><b>' + c.name + '</b></td><td style="font-size:12px">' + c.desc + '</td>' +
          '<td class="num strong">' + c.total.toFixed(3) + '</td><td class="num muted">' + (c.total / grand * 100).toFixed(2) + '%</td></tr>';
      }).join('') +
      '<tr class="tr-sum"><td colspan="2"><b>运维阶段合计</b></td><td class="num"><b>' + grand.toFixed(3) + '</b></td><td class="num">100%</td></tr></table>' +
      '<h4>三、分类明细</h4>' +
      cats.map(function (c) {
        return '<table style="margin-top:8px"><thead><tr><th colspan="3">' + c.name + '（小计 ' + c.total.toFixed(3) + ' tCO₂）</th></tr>' +
          '<tr><th>分项</th><th>碳排放量 (tCO₂)</th><th>占该类比例</th></tr></thead><tbody>' +
          c.items.map(function (x) {
            return '<tr><td>' + x[0] + '</td><td class="num strong">' + x[1].toFixed(3) + '</td>' +
              '<td class="num muted">' + (x[1] / c.total * 100).toFixed(2) + '%</td></tr>';
          }).join('') + '</tbody></table>';
      }).join('') +
      '<h4>四、核算说明</h4><table>' +
      '<tr><th>统计口径</th><td>仅统计建筑运维阶段运行碳排放，建设期各阶段排放不在本报告统计范围内</td></tr>' +
      '<tr><th>电力排放</th><td>空调/照明/动力等用电分项按华北电网因子 0.8843 kgCO₂/kWh 折算</td></tr>' +
      '<tr><th>热力排放</th><td>供暖按市政热力（烟煤II）实测消耗量折算，并入供暖碳排放类别</td></tr>' +
      '<tr><th>最大排放类别</th><td>动力碳排放 ' + cats[3].total.toFixed(3) + ' tCO₂（' + (cats[3].total / grand * 100).toFixed(1) + '%），主要为插座设备用电</td></tr></table>' +
      rptTail();
    showReport('建筑运行碳排放分项报告', html);
  }
  /* 2. 节能优化效果评估报告 */
  function savingReport() {
    var c = S().control;
    var html = rptHead('节能优化效果评估报告') +
      '<h4>一、建筑侧四维减碳策略</h4><table><tr><th>维度</th><th>工程措施</th><th>节能效果</th></tr>' +
      '<tr><td>被动式节能</td><td>高性能围护结构、断桥铝型材+Low-E玻璃</td><td>源头降低冷热负荷约10%</td></tr>' +
      '<tr><td>设备系统升级</td><td>磁悬浮冷水机组COP≥6.5；地源热泵冬COP4.0/夏EER5.2；光感+人体感应LED</td><td>机组节能35%-40%；年省47.3 tCO₂；照明降40%</td></tr>' +
      '<tr><td>可再生能源替代</td><td>屋顶BIPV覆盖率30%、年发电120kWh/㎡；冷凝热回收生活热水</td><td>热水节能15%</td></tr>' +
      '<tr><td>数字化管理</td><td>分楼层能耗排名激励机制</td><td>节能10%-15%</td></tr></table>' +
      '<h4>二、光储侧调控策略</h4><table><tr><th>策略</th><th>参数/方式</th></tr>' +
      '<tr><td>太阳能追光</td><td>视日运动轨迹追踪，天文算法计算太阳高度角/方位角，电机闭环跟踪</td></tr>' +
      '<tr><td>储能系统</td><td>240kW/500kWh，支持调峰、调频</td></tr>' +
      '<tr><td>自发自用</td><td>白天光伏优先供本地负荷，高峰储能放电</td></tr>' +
      '<tr><td>低谷充电</td><td>22:00-次日08:00 谷价时段 300kW 充电7.5h 充满</td></tr>' +
      '<tr><td>削峰填谷</td><td>PCS双向调节，低价储存高价使用</td></tr></table>' +
      '<h4>三、本次模拟调控结果</h4><table><tr><th>策略状态</th><th>即时节电量</th><th>减排量</th><th>综合节能率</th></tr>' +
      '<tr><td>' + (c.applied ? '已下发并联动3D/图表' : '待下发') + '</td><td>' + (c.savedKwh || 0) + ' kWh</td>' +
      '<td>' + (c.savedCarbon || 0).toFixed(2) + ' tCO₂</td><td>' + ((c.cutRate || 0) * 100).toFixed(1) + '%（系统指标 10%-40%）</td></tr></table>' +
      rptTail();
    showReport('节能优化效果评估报告', html);
  }
  /* 5. 光伏充电站发电量与效益分析报告 */
  function pvReport() {
    var pv = S().pv, y1 = pv.years[0], y25 = pv.years[24];
    var cum = y25.cum, carbon = Math.round(cum * 0.8843);
    var html = rptHead('光伏充电站发电量与效益分析报告') +
      '<h4>一、光储系统真实配置</h4><table><tr><th>储能容量</th><td>' + pv.storageKW + 'kW/' + pv.storageKWh + 'kWh</td>' +
      '<th>光伏组件</th><td>' + pv.modules + ' 个</td></tr>' +
      '<tr><th>逆变器</th><td>' + pv.inverters + ' 台</td><th>直流汇流箱</th><td>' + pv.combiners + ' 台</td></tr>' +
      '<tr><th>直流充电桩</th><td>' + pv.chargers + ' 台</td><th>车棚/监控</th><td>各 ' + pv.carport + ' 套</td></tr>' +
      '<tr><th>BIPV覆盖率</th><td>' + (pv.coverage * 100) + '%（约 ' + pv.bipvArea + ' ㎡）</td><th>单位面积年发电</th><td>' + pv.genPerArea + ' kWh/㎡</td></tr></table>' +
      '<h4>二、25年发电量衰减（年衰减0.8%，因子0.8843）</h4><table><tr><th>年份</th><th>效率保持率</th><th>年发电量(kWh)</th><th>累计发电量(kWh)</th><th>年减碳量(kgCO₂)</th></tr>' +
      pv.years.filter(function (y) { return [1, 5, 10, 15, 20, 25].indexOf(y.year) >= 0; }).map(function (y) {
        return '<tr><td>第' + y.year + '年</td><td>' + y.rate + '%</td><td>' + y.gen.toLocaleString() + '</td><td>' +
          y.cum.toLocaleString() + '</td><td>' + y.carbon.toLocaleString() + '</td></tr>';
      }).join('') + '</table>' +
      '<h4>三、25年全周期效益</h4><table><tr><th>首年发电量</th><th>第25年发电量</th><th>25年累计发电</th><th>25年累计减碳</th></tr>' +
      '<tr><td>' + y1.gen.toLocaleString() + ' kWh</td><td>' + y25.gen.toLocaleString() + ' kWh</td><td>' +
      cum.toLocaleString() + ' kWh</td><td>' + carbon.toLocaleString() + ' kgCO₂</td></tr></table>' +
      '<h4>四、运营策略</h4><p style="color:#33507e;line-height:1.9">视日运动轨迹追光 + 自发自用 + 22:00-08:00谷段300kW充电7.5h + PCS削峰填谷调峰调频，实现“低价储存、高价使用”。</p>' +
      rptTail();
    showReport('光伏充电站发电量与效益分析报告', html);
  }
  /* 6. 设备异常与整改工单报告 */
  function alertOrderReport() {
    var acts = S().alerts, ords = S().orders;
    var html = rptHead('设备异常与整改工单报告', '异常预警规则引擎 + 整改工单与整改工单') +
      '<h4>一、异常告警统计</h4><table><tr><th>活动告警</th><th>红色告警</th><th>已闭环</th></tr>' +
      '<tr><td>' + acts.filter(function (a) { return a.active; }).length + ' 起</td><td>' +
      acts.filter(function (a) { return a.active && a.level === '告警'; }).length + ' 起</td><td>' +
      acts.filter(function (a) { return !a.active; }).length + ' 起</td></tr></table>' +
      '<h4>二、异常清单与原因分析</h4><table><tr><th>时间</th><th>等级</th><th>类型</th><th>位置</th><th>异常问题</th><th>建议措施</th></tr>' +
      acts.map(function (a) {
        return '<tr><td>' + a.time + '</td><td>' + a.level + '</td><td>' + a.type + '</td><td>' + (a.pos || '-') + '</td>' +
        '<td>' + a.title + '</td><td>' + a.advice + '</td></tr>';
      }).join('') + '</table>' +
      '<h4>三、整改工单与验收记录</h4><table><tr><th>工单号</th><th>类型</th><th>对象</th><th>状态</th><th>验收</th><th>创建时间</th></tr>' +
      ords.map(function (o) {
        return '<tr><td>' + o.id + '</td><td>' + o.type + '</td><td>' + o.target + '</td><td>' + o.status + '</td><td>' +
        (o.accept || '-') + '</td><td>' + o.created + '</td></tr>';
      }).join('') + '</table>' +
      '<p style="color:#33507e;line-height:1.9">异常根因覆盖：电力消耗占总能耗80%以上、电网煤电占比超60%、传统设备能效偏低、无人区域持续空耗（占建筑能源浪费30%以上）。告警触发后自动生成匹配减碳路径的优化方案，并经App/短信/邮件推送。</p>' +
      rptTail();
    showReport('设备异常与整改工单报告', html);
  }

  JA.registerPage({
    id: 'reports', view: 'ops', group: '综合总览', name: '报告中心', icon: 'report',
    render: function (el) { return JA.renderReportsPage(el, {}); }
  });

  /* ================================================================
   * 设置（管理员）
   * ================================================================ */
  JA.registerPage({
    id: 'settings', view: 'ops', group: '设置', name: '设置', icon: 'setting',
    render: function (el) {
      var ctx = pageCtx();
      var admin = JA.perm.isAdmin;
      el.innerHTML = pageHead('设置 · 用户权限 / 阈值参数 / 演示数据', '智慧能源运维 / 设置');

      if (!admin) {
        var deny = panel('权限受限');
        deny.bd.innerHTML = '<div style="padding:20px;color:#ffd970;line-height:2">当前登录角色为 <b>' +
          JA.session.roleName + '</b>，仅拥有业务查看与数据录入权限。<br>用户权限管理、系统参数配置与数据管理请使用 <b>管理员账号 admin</b> 登录。</div>';
        el.appendChild(deny.el);
        return ctx.done();
      }

      /* 用户权限管理 */
      var pUser = panel('用户与角色权限管理', '1个核心平台 + 两种用户视图');
      var userBar = h('div', 'mb12');
      userBar.innerHTML = '<button class="btn btn-primary btn-sm" id="btnAddUser">+ 新增用户</button>' +
        '<span class="fs11 muted" style="margin-left:10px">角色：admin=全部权限 / ops=运维可编辑·套筒只读 / accept=套筒可录入·能耗只读</span>';
      var userTbl = h('div', 'tbl-wrap');
      pUser.bd.appendChild(userBar); pUser.bd.appendChild(userTbl);
      el.appendChild(pUser.el);

      /* 系统参数 */
      var pParam = panel('预警阈值与考核指标参数', '保存后全量重算告警并重绘3D');
      pParam.bd.innerHTML =
        '<div class="form-row">' +
          '<div class="form-item"><label>能耗红色阈值 (kWh)</label><input class="inp" id="pmRed" type="number"></div>' +
          '<div class="form-item"><label>能耗橙色阈值 (kWh)</label><input class="inp" id="pmOrange" type="number"></div>' +
          '<div class="form-item"><label>无人空耗阈值 (kWh)</label><input class="inp" id="pmIdle" type="number"></div>' +
        '</div><div class="form-row">' +
          '<div class="form-item"><label>套筒黄色预警 (MPa)</label><input class="inp" id="pmSW" type="number"></div>' +
          '<div class="form-item"><label>套筒红色限值 (MPa)</label><input class="inp" id="pmSL" type="number"></div>' +
          '<div class="form-item"><label>节能考核指标</label><input class="inp" id="pmSave" type="number" step="0.1"></div>' +
          '<div class="form-item"><label>AI预测准确率(%)</label><input class="inp" id="pmAcc" type="number" step="0.1"></div>' +
        '</div><button class="btn btn-primary" id="pmSave">保存参数并全量重算</button>' +
        '<div class="form-hint">例如把红色阈值调低至 80kWh，将立即看到更多房间变红并触发告警；调高至 130kWh 则告警解除、3D恢复绿色。</div>';
      el.appendChild(pParam.el);

      /* 演示数据（一键重置 + 演示数据标识） */
      var pData = panel('演示数据');
      pData.bd.innerHTML =
        '<div style="display:flex;align-items:stretch;gap:16px;flex-wrap:wrap">' +
          '<button class="btn btn-primary" id="btnReset" style="padding:14px 42px;font-size:15px;letter-spacing:2px">一键重置</button>' +
          '<div style="flex:1;min-width:240px;display:flex;align-items:center;justify-content:center;' +
            'background:rgba(255,45,85,.14);border:1px solid rgba(255,45,85,.6);border-radius:8px;' +
            'box-shadow:inset 0 0 18px rgba(255,45,85,.22),0 0 12px rgba(255,45,85,.18);' +
            'color:#ff8fa3;font-size:15px;font-weight:700;letter-spacing:4px;padding:14px 18px">全部演示数据</div>' +
        '</div>' +
        '<div class="form-hint mt12">点击「一键重置」将全部演示数据恢复为初始状态，不影响页面结构与系统参数。</div>';
      el.appendChild(pData.el);

      function renderUsers() {
        userTbl.innerHTML = '<table class="tbl"><thead><tr><th>账号</th><th>姓名</th><th>角色</th><th>部门</th><th>电话</th><th>状态</th><th>操作</th></tr></thead><tbody>' +
          S().users.map(function (u) {
            return '<tr><td class="num">' + u.username + '</td><td>' + u.name + '</td>' +
              '<td><span class="tag ' + (u.role === 'admin' ? 'tag-purple' : u.role === 'ops' ? 'tag-green' : 'tag-yellow') + '">' + u.roleName + '</span></td>' +
              '<td>' + u.dept + '</td><td>' + u.phone + '</td>' +
              '<td>' + (u.enabled ? '<span class="tag tag-green">启用</span>' : '<span class="tag tag-grey">停用</span>') + '</td>' +
              '<td style="white-space:nowrap"><button class="btn btn-sm" data-act="edit" data-u="' + u.username + '">编辑</button> ' +
              (u.username === JA.session.username ? '' : '<button class="btn btn-sm" data-act="toggle" data-u="' + u.username + '">' + (u.enabled ? '停用' : '启用') + '</button>') +
              '</td></tr>';
          }).join('') + '</tbody></table>';
        userTbl.querySelectorAll('button[data-act]').forEach(function (b) {
          b.onclick = function () {
            var u = S().users.filter(function (x) { return x.username === b.getAttribute('data-u'); })[0];
            if (b.getAttribute('data-act') === 'toggle') { JA.Store.toggleUser(u.username); JA.toast('用户状态已更新', 'success'); }
            else userModal(u);
          };
        });
      }
      function userModal(u) {
        u = u || { username: '', name: '', role: 'ops', roleName: '运维人员', dept: '', phone: '', enabled: true };
        var html =
          '<div class="form-row"><div class="form-item"><label>登录账号</label><input class="inp" id="uName2" value="' + u.username + '" ' + (u.username ? 'disabled' : '') + '></div>' +
          '<div class="form-item"><label>姓名</label><input class="inp" id="uReal" value="' + u.name + '"></div></div>' +
          '<div class="form-row"><div class="form-item"><label>角色</label><select class="sel" id="uRole">' +
            '<option value="admin">管理员</option><option value="ops">运维人员</option><option value="accept">工程验收</option></select></div>' +
          '<div class="form-item"><label>部门</label><input class="inp" id="uDept" value="' + u.dept + '"></div></div>' +
          '<div class="form-row"><div class="form-item"><label>电话</label><input class="inp" id="uPhone" value="' + u.phone + '"></div>' +
          '<div class="form-item"><label>状态</label><select class="sel" id="uEnabled"><option value="1">启用</option><option value="0">停用</option></select></div></div>';
        JA.modal({
          title: u.username ? '编辑用户' : '新增用户', width: '560px', body: html,
          buttons: [
            { text: '取消' },
            { text: '保存', primary: true, handler: function (c, bd) {
              var username = bd.querySelector('#uName2').value.trim();
              if (!username) { JA.toast('请填写登录账号', 'warn'); return false; }
              var role = bd.querySelector('#uRole').value;
              JA.Store.saveUser({
                username: username,
                name: bd.querySelector('#uReal').value.trim() || username,
                role: role,
                roleName: ({ admin: '管理员', ops: '运维人员', accept: '工程验收' })[role],
                dept: bd.querySelector('#uDept').value.trim(),
                phone: bd.querySelector('#uPhone').value.trim(),
                enabled: bd.querySelector('#uEnabled').value === '1'
              });
              JA.toast('用户信息已保存', 'success');
            } }
          ],
          onOpen: function (bd) {
            bd.querySelector('#uRole').value = u.role;
            bd.querySelector('#uEnabled').value = u.enabled ? '1' : '0';
          }
        });
      }
      function fillParams() {
        var p = S().params;
        pmRed.value = p.energyRed; pmOrange.value = p.energyOrange; pmIdle.value = p.idleLoad;
        pmSW.value = p.sleeveWarn; pmSL.value = p.sleeveLimit; pmSave.value = p.saveRate * 100; pmAcc.value = p.accuracy * 100;
      }
      document.getElementById('btnAddUser').onclick = function () { userModal(null); };
      document.getElementById('btnReset').onclick = function () {
        JA.modal({
          title: '重置演示数据', width: '420px',
          body: '<div style="padding:8px 4px;color:var(--txt2)">确认将全部演示数据恢复为初始状态？</div>',
          buttons: [
            { text: '取消' },
            { text: '确认重置', type: 'btn-danger', handler: function () { JA.Store.reset(); } }
          ]
        });
      };
      document.getElementById('pmSave').onclick = function () {
        JA.Store.saveParams({
          energyRed: +pmRed.value, energyOrange: +pmOrange.value, idleLoad: +pmIdle.value,
          sleeveWarn: +pmSW.value, sleeveLimit: +pmSL.value,
          saveRate: +pmSave.value / 100, accuracy: +pmAcc.value / 100
        });
        JA.Store.refreshAllAlerts();
        JA.toast('参数已保存，告警规则与3D态势已全量重算', 'success');
      };
      renderUsers(); fillParams();
      ctx.sub(function (evt) { if (evt.type === 'user') renderUsers(); });
      return ctx.done();
    }
  });
})();
