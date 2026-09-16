/* =====================================================================
 * 居安智卫 —— 施工阶段视图页面集（轻量化附属模块）
 * ===================================================================== */
(function () {
  'use strict';
  var S = function () { return JA.Store.state; };
  var h = JA.h.h, panel = JA.h.panel, pageCtx = JA.h.ctx, pageHead = JA.h.head;
  var Charts = JA.Charts;

  function sleeveTag(st) {
    return ({ normal: '<span class="tag tag-green">正常</span>',
      warn: '<span class="tag tag-yellow">黄色预警</span>',
      alarm: '<span class="tag tag-red">红色告警</span>' })[st];
  }

  /* ---------------- 套筒应力录入面板（管理员/工程验收可录入） ---------------- */
  JA.openSleeveEntry = function (prefillId) {
    if (!JA.perm.sleeveEdit) {
      JA.modal({
        title: '权限不足', width: '420px',
        body: '<div style="padding:10px 4px;color:#ffd970;line-height:1.9">当前角色为 <b>运维人员账号</b>，套筒结构监测数据仅可查看，不能编辑。<br>请使用 <b>管理员</b> 或 <b>工程验收</b> 账号录入应力数据。</div>',
        buttons: [{ text: '知道了', primary: true }]
      });
      return;
    }
    var opts = S().sleeves.map(function (x) {
      return '<option value="' + x.id + '">' + x.id + ' · ' + x.location + '</option>';
    }).join('');
    var nowStr = new Date();
    var pad = JA.Utils.pad;
    var t = nowStr.getFullYear() + '-' + pad(nowStr.getMonth() + 1) + '-' + pad(nowStr.getDate()) + 'T' +
      pad(nowStr.getHours()) + ':' + pad(nowStr.getMinutes());
    var html =
      '<div class="form-row"><div class="form-item" style="flex:2"><label>套筒节点 <span class="req">*</span></label><select class="sel" id="slNode">' + opts + '</select></div>' +
      '<div class="form-item"><label>当前应力 (MPa)</label><input class="inp" id="slStress" type="number" step="0.1"></div></div>' +
      '<div class="form-row"><div class="form-item"><label>监测时间</label><input class="inp" id="slTime" type="datetime-local" value="' + t + '"></div>' +
      '<div class="form-item"><label>AI判定结果</label><select class="sel" id="slResult"><option value="auto">按阈值自动判定</option><option>正常</option><option>黄色预警</option><option>红色告警</option></select></div></div>' +
      '<div class="form-hint">判定阈值：≥ ' + S().params.sleeveWarn + 'MPa 黄色预警；≥ ' + S().params.sleeveLimit +
        'MPa 红色告警并自动触发3D红色光柱、波形标记与结构告警。</div>' +
      '<div class="flex gap8 mt12"><button class="btn btn-sm" id="slDemo1">模拟：正常工况 180MPa</button>' +
      '<button class="btn btn-sm" id="slDemo2">模拟：超限告警 326MPa</button></div>';
    JA.modal({
      title: '套筒节点监测数据录入', width: '600px', body: html,
      buttons: [
        { text: '取消' },
        { text: '提交应力数据', primary: true, handler: function (close, bd) {
          var id = bd.querySelector('#slNode').value;
          var v = bd.querySelector('#slStress').value;
          if (v === '') { JA.toast('请输入应力值', 'warn'); return false; }
          var result = bd.querySelector('#slResult').value;
          if (result === 'auto') result = null;
          JA.Store.submitSleeve(id, +v, result);
          var node = S().sleeves.filter(function (x) { return x.id === id; })[0];
          if (node.status === 'alarm') {
            JA.toast('应力 ' + v + 'MPa 超限！节点已转红色告警并触发3D光柱', 'error');
          } else if (node.status === 'warn') {
            JA.toast('应力 ' + v + 'MPa 达到黄色预警区间，节点已标黄', 'warn');
          } else {
            JA.toast('应力数据已提交，节点状态正常，波形已更新', 'success');
          }
        } }
      ],
      onOpen: function (bd) {
        function fill() {
          var id = bd.querySelector('#slNode').value;
          var node = S().sleeves.filter(function (x) { return x.id === id; })[0];
          bd.querySelector('#slStress').value = node.stress;
        }
        bd.querySelector('#slNode').onchange = fill;
        if (prefillId) bd.querySelector('#slNode').value = prefillId;
        fill();
        bd.querySelector('#slDemo1').onclick = function () { bd.querySelector('#slStress').value = 180; };
        bd.querySelector('#slDemo2').onclick = function () { bd.querySelector('#slStress').value = 326; };
      }
    });
  };

  /* ================================================================
   * 施工页 1：3D 工地沙盘总览
   * ================================================================ */
  JA.registerPage({
    id: 'site', view: 'build', group: '施工总览', name: '3D工地沙盘', icon: 'site',
    render: function (el) {
      var ctx = pageCtx();
      var canEdit = JA.perm.sleeveEdit;
      el.innerHTML = pageHead('施工阶段 · 装配式智慧工地沙盘', '施工阶段视图 / 3D工地沙盘',
        canEdit ? '<button class="btn btn-primary btn-sm" id="stEntry">+ 套筒应力录入</button>' :
          '<span class="lock-tip">运维账号：结构数据只读</span>');

      var strip = h('div', 'metric-strip mb12'); el.appendChild(strip);
      var layout = h('div', 'grid', '');
      layout.style.cssText = 'grid-template-columns:1fr 360px;height:calc(100vh - 200px)';
      var left = h('div');
      var right = h('div', 'flex', ''); right.style.flexDirection = 'column'; right.style.gap = '10px';
      layout.appendChild(left); layout.appendChild(right);
      el.appendChild(layout);

      var view = h('div', 'view3d');
      view.innerHTML =
        '<div class="v3d-toolbar"><span class="chip on" id="stAuto">自动环绕：开</span>' +
        '<span class="chip" id="stFocus">定位告警节点</span></div>' +
        '<div class="v3d-hint">拖拽旋转 · 滚轮缩放 · 点击彩色套筒节点查看详情</div>' +
        '<div class="legend"><div><i style="background:#21e6a4;border-radius:50%"></i>套筒正常</div>' +
        '<div><i style="background:#ffc83d;border-radius:50%"></i>黄色预警</div>' +
        '<div><i style="background:#ff4d6a;border-radius:50%"></i>红色告警（光柱）</div></div>';
      left.appendChild(view);
      var scene = new JA.SiteScene(view, { onPick: showNode });

      var pNodes = panel('套筒节点实时状态', '点击联动3D');
      var nodeWrap = h('div', 'scroll-y'); nodeWrap.style.flex = '1'; pNodes.bd.appendChild(nodeWrap);
      pNodes.bd.style.padding = '8px 10px';
      var pAl = panel('结构安全告警', '');
      var alWrap = h('div', 'scroll-y'); alWrap.style.flex = '1'; pAl.bd.appendChild(alWrap);
      pAl.bd.style.padding = '8px 10px';
      right.appendChild(pNodes.el); right.appendChild(pAl.el);

      function nodePop(sv) {
        var pop = h('div', 'room-pop');
        pop.innerHTML =
          '<div class="rp-hd"><b>' + sv.id + ' 套筒节点</b><span class="rp-x">×</span></div>' +
          '<div class="rp-bd">' +
          '<div class="rp-row"><span>位置信息</span><b style="font-size:11px">' + sv.location + '</b></div>' +
          '<div class="rp-row"><span>BIM坐标/构件</span><b style="font-size:11px">' + sv.bim + '</b></div>' +
          '<div class="rp-row"><span>当前应力</span><b class="' + (sv.status === 'alarm' ? 'c-red' : sv.status === 'warn' ? 'c-yellow' : 'c-green') + '">' + sv.stress + ' MPa</b></div>' +
          '<div class="rp-row"><span>监测时间</span><b>' + sv.time.slice(5) + '</b></div>' +
          '<div class="rp-row"><span>AI判定</span>' + sleeveTag(sv.status) + '</div>' +
          '<div class="rp-row"><span>灌浆质量</span><b style="font-size:11px">' + sv.grout + '</b></div>' +
          '<div class="rp-row"><span>健康评分</span><b>' + sv.health + ' 分</b></div></div>' +
          '<div class="rp-ft"><button class="btn btn-primary btn-sm fw" id="npWave">查看波形/录入</button>' +
          (sv.status === 'alarm' ? '<button class="btn btn-danger btn-sm" id="npWo">建工单</button>' : '') +
          '</div>';
        view.appendChild(pop);
        pop.querySelector('.rp-x').onclick = function () { pop.remove(); };
        pop.querySelector('#npWave').onclick = function () { JA.go('build', 'sleeves'); setTimeout(function () { JA.Store.emit({ type: 'pickSleeve', id: sv.id }); }, 100); };
        var wb = pop.querySelector('#npWo');
        if (wb) wb.onclick = function () {
          JA.openOrderCreate({ typeOptions: ['结构整改'], type: '结构整改',
            target: '套筒 ' + sv.id, desc: sv.location + ' 应力超限 ' + sv.stress + 'MPa，灌浆疑似不密实' });
        };
      }
      function showNode(sv) {
        var old = view.querySelector('.room-pop');
        if (old) old.remove();
        nodePop(sv);
      }

      function renderNodes() {
        nodeWrap.innerHTML = S().sleeves.map(function (sv) {
          return '<div class="lst-row" data-id="' + sv.id + '" style="cursor:pointer">' +
            '<span class="dv-dot ' + (sv.status === 'alarm' ? 'fault' : sv.status === 'warn' ? 'stopped' : 'running') + '" style="background:' +
            (sv.status === 'alarm' ? '#ff4d6a' : sv.status === 'warn' ? '#ffc83d' : '#21e6a4') + ';box-shadow:0 0 7px ' +
            (sv.status === 'alarm' ? '#ff4d6a' : sv.status === 'warn' ? '#ffc83d' : '#21e6a4') + '"></span>' +
            '<span class="lr-name">' + sv.id + ' ' + sv.location.split(' ').slice(1).join(' ') + '</span>' +
            '<span class="lr-val ' + (sv.status === 'alarm' ? 'c-red' : sv.status === 'warn' ? 'c-yellow' : 'c-green') + '">' + sv.stress + 'MPa</span></div>';
        }).join('');
        nodeWrap.querySelectorAll('.lst-row').forEach(function (r) {
          r.onclick = function () {
            var id = r.getAttribute('data-id');
            var sv = S().sleeves.filter(function (x) { return x.id === id; })[0];
            scene.selectNode(id); showNode(sv);
          };
        });
      }
      function renderAlerts() {
        var list = S().alerts.filter(function (a) { return a.type === '结构安全'; }).slice(0, 5);
        alWrap.innerHTML = list.length ? list.map(function (a) {
          return '<div class="alert-card ' + (a.level === '告警' ? 'alarm' : 'warn') + '">' +
            '<div class="ac-hd"><span class="tag tag-red"><span class="blink-dot"></span>' + a.level + '</span></div>' +
            '<div class="ac-title" style="font-size:12px">' + a.title + '</div>' +
            '<div class="ac-meta"><span>' + a.pos + '</span><span>' + a.time.slice(5) + '</span></div></div>';
        }).join('') : '<div class="muted txt-c pad12">结构安全监测无告警</div>';
      }
      function renderStrip() {
        var sv = S().sleeves;
        var health = Math.round(sv.reduce(function (a, x) { return a + +x.health; }, 0) / sv.length);
        var pending = S().orders.filter(function (o) { return o.type === '结构整改' && o.status !== '已闭环'; }).length;
        strip.innerHTML = [
          ['套筒节点总数', sv.length + ' 个', '灌浆套筒应力监测'],
          ['正常节点', sv.filter(function (x) { return x.status === 'normal'; }).length + ' 个', '', 'good'],
          ['黄色预警', sv.filter(function (x) { return x.status === 'warn'; }).length + ' 个', '≥' + S().params.sleeveWarn + 'MPa', 'warn'],
          ['红色告警', sv.filter(function (x) { return x.status === 'alarm'; }).length + ' 个', '≥' + S().params.sleeveLimit + 'MPa', 'bad'],
          ['结构健康指数', health + ' 分', 'AI综合评分', health >= 90 ? 'good' : 'warn'],
          ['待整改工单', pending + ' 单', '闭环跟踪']
        ].map(function (m) {
          return '<div class="metric ' + (m[3] || '') + '"><b>' + m[1] + '</b><span>' + m[0] + ' · ' + m[2] + '</span></div>';
        }).join('');
      }

      var autoOn = true;
      view.querySelector('#stAuto').onclick = function () {
        autoOn = !autoOn;
        this.classList.toggle('on', autoOn);
        this.textContent = '自动环绕：' + (autoOn ? '开' : '关');
        scene.setAutoRotate(autoOn);
      };
      view.querySelector('#stFocus').onclick = function () {
        var a = S().sleeves.filter(function (x) { return x.status === 'alarm'; })[0] ||
                S().sleeves.filter(function (x) { return x.status === 'warn'; })[0];
        if (a) { scene.selectNode(a.id); showNode(a); JA.toast('已聚焦节点 ' + a.id, 'warn'); }
        else JA.toast('无预警/告警节点', 'success');
      };
      var eb = document.getElementById('stEntry');
      if (eb) eb.onclick = function () { JA.openSleeveEntry(); };

      renderStrip(); renderNodes(); renderAlerts();
      ctx.sub(function () { renderStrip(); renderNodes(); renderAlerts(); });
      var offPick = JA.Store.subscribe(function (evt) {
        if (evt.type === 'pickSleeve') {
          var sv = S().sleeves.filter(function (x) { return x.id === evt.id; })[0];
          if (sv) { scene.selectNode(evt.id); showNode(sv); }
        }
      });
      return function () { offPick(); scene.dispose(); ctx.done()(); };
    }
  });

  /* ================================================================
   * 施工页 2：套筒节点管理（波形 + 录入 + 健康评分）
   * ================================================================ */
  JA.registerPage({
    id: 'sleeves', view: 'build', group: '结构监测', name: '套筒节点监测', icon: 'sleeve',
    render: function (el, param) {
      var ctx = pageCtx();
      var canEdit = JA.perm.sleeveEdit;
      el.innerHTML = pageHead('智能套筒节点监测 · 应力波形与AI诊断', '施工阶段视图 / 结构监测 / 套筒节点',
        canEdit ? '<button class="btn btn-primary btn-sm" id="svEntry">+ 录入套筒数据</button>' :
          '<span class="lock-tip">运维账号：套筒数据只读</span>');

      var strip = h('div', 'metric-strip mb12'); el.appendChild(strip);
      var layout = h('div', 'grid g-21');
      var pTbl = panel('节点台账');
      var tw = h('div', 'tbl-wrap');
      tw.style.maxHeight = 'calc(100vh - 250px)';
      pTbl.bd.appendChild(tw);
      var pDetail = panel('节点详情 · 监测波形');
      var detail = h('div'); pDetail.bd.appendChild(detail);
      layout.appendChild(pTbl.el); layout.appendChild(pDetail.el);
      el.appendChild(layout);

      var selectedId = (param && param.node) || 'S-07';
      var waveChart = null;

      function renderStrip() {
        var sv = S().sleeves;
        var health = Math.round(sv.reduce(function (a, x) { return a + +x.health; }, 0) / sv.length);
        strip.innerHTML = [
          ['监测节点', sv.length + ' 个', '覆盖率100%'],
          ['最大应力', Math.max.apply(null, sv.map(function (x) { return x.stress; })) + ' MPa', S().sleeves[6].id + ' 当前峰值', 'bad'],
          ['红色告警', sv.filter(function (x) { return x.status === 'alarm'; }).length + ' 个', '超限值', 'bad'],
          ['平均健康评分', health + ' 分', health >= 90 ? '结构状态良好' : '需关注', health >= 90 ? 'good' : 'warn'],
          ['采样频率', '10 Hz', '波形60点滚动窗']
        ].map(function (m) {
          return '<div class="metric ' + (m[3] || '') + '"><b>' + m[1] + '</b><span>' + m[0] + ' · ' + m[2] + '</span></div>';
        }).join('');
      }
      function renderTable() {
        tw.innerHTML = '<table class="tbl"><thead><tr><th>节点编号</th><th>位置</th><th>应力MPa</th><th>AI判定</th><th>健康分</th><th>时间</th><th></th></tr></thead><tbody>' +
          S().sleeves.map(function (x) {
            return '<tr data-id="' + x.id + '" style="cursor:' + (x.id === selectedId ? 'pointer' : 'pointer') + '">' +
              '<td class="num"><b>' + x.id + '</b></td><td style="font-size:11px">' + x.location + '</td>' +
              '<td class="num ' + (x.status === 'alarm' ? 'c-red' : x.status === 'warn' ? 'c-yellow' : 'c-green') + '">' + x.stress + '</td>' +
              '<td>' + sleeveTag(x.status) + '</td><td class="num">' + x.health + '</td>' +
              '<td class="fs11 muted">' + x.time.slice(5) + '</td>' +
              '<td>' + (x.id === selectedId ? '<span class="tag tag-blue">查看中</span>' : '<span class="fs11 muted">选择</span>') + '</td></tr>';
          }).join('') + '</tbody></table>';
        tw.querySelectorAll('tr[data-id]').forEach(function (tr) {
          tr.onclick = function () { selectedId = tr.getAttribute('data-id'); renderTable(); renderDetail(); };
        });
      }
      function renderDetail() {
        var sv = S().sleeves.filter(function (x) { return x.id === selectedId; })[0];
        if (!sv) return;
        var ringCls = sv.status === 'alarm' ? 'bad' : sv.status === 'warn' ? 'warn' : 'good';
        detail.innerHTML =
          '<div class="flex aic gap12 mb12">' +
            '<div class="health-ring ' + ringCls + '" style="--p:' + sv.health + '"><b>' + sv.health + '</b></div>' +
            '<div style="flex:1"><div class="fs20 c-cyan"><b>' + sv.id + '</b> ' + sleeveTag(sv.status) + (sv.status === 'alarm' ? ' <span class="blink-dot"></span>' : '') + '</div>' +
            '<div class="fs11 muted mt8">' + sv.location + '</div>' +
            '<div class="fs11 muted">BIM坐标：' + sv.bim + '</div></div></div>' +
          '<div class="grid g-3 mb12" style="gap:8px">' +
            '<div class="metric ' + (sv.status === 'alarm' ? 'bad' : 'good') + '"><b>' + sv.stress + '</b><span>当前应力 MPa</span></div>' +
            '<div class="metric"><b>' + S().params.sleeveLimit + '</b><span>红色限值 MPa</span></div>' +
            '<div class="metric"><b>' + sv.time.slice(5, 16) + '</b><span>最新监测时间</span></div></div>' +
          '<div class="panel" style="margin-bottom:10px"><div class="panel-hd"><h3>实时应力波形</h3>' +
            '<div class="hd-extra">红线限值 / 黄线预警</div></div><div class="panel-bd"><div id="waveBox" class="chart" style="height:220px"></div></div></div>' +
          '<div class="opplan"><h5>AI 综合判定</h5><p>灌浆质量：<b>' + sv.grout + '</b><br>结论：<b>' + sv.aiResult + '</b>' +
            (sv.status === 'alarm' ? '，建议立即停止上部作业并派发结构整改工单。' : (sv.status === 'warn' ? '，建议加密观测频次并复核灌浆记录。' : '，节点处于安全工作状态。')) + '</p></div>' +
          '<div class="flex gap8 mt12">' +
            (canEdit ? '<button class="btn btn-primary btn-sm" id="dEntry">录入该节点应力</button>' : '<span class="lock-tip">当前角色只读</span>') +
            (sv.status === 'alarm' ? '<button class="btn btn-danger btn-sm" id="dWo">创建整改工单</button>' : '') +
            '<button class="btn btn-sm" id="dGo3d">3D沙盘定位</button></div>';
        if (waveChart) { waveChart.dispose(); ctx.bag.list = ctx.bag.list.filter(function (c) { return c !== waveChart; }); waveChart = null; }
        waveChart = Charts.wave(detail.querySelector('#waveBox'), ctx.bag, sv.wave, S().params.sleeveLimit, S().params.sleeveWarn);
        var eb = detail.querySelector('#dEntry');
        if (eb) eb.onclick = function () { JA.openSleeveEntry(sv.id); };
        var wb = detail.querySelector('#dWo');
        if (wb) wb.onclick = function () {
          JA.openOrderCreate({ typeOptions: ['结构整改'], type: '结构整改',
            target: '套筒 ' + sv.id + ' ' + sv.location.split(' ').slice(-1)[0],
            desc: sv.location + ' 应力 ' + sv.stress + 'MPa 超限，' + sv.grout });
        };
        detail.querySelector('#dGo3d').onclick = function () {
          JA.go('build', 'site');
          setTimeout(function () { JA.Store.emit({ type: 'pickSleeve', id: sv.id }); }, 120);
        };
      }
      function updateWaveLive() {
        var sv = S().sleeves.filter(function (x) { return x.id === selectedId; })[0];
        if (sv && waveChart) {
          waveChart.setOption({ series: [{ data: sv.wave }] });
        }
      }
      var eb2 = document.getElementById('svEntry');
      if (eb2) eb2.onclick = function () { JA.openSleeveEntry(selectedId); };
      renderStrip(); renderTable(); renderDetail();
      ctx.sub(function (evt) { renderStrip(); renderTable();
        // 仅在选中节点未被重绘时做轻量波形更新
        if (evt.type === 'sleeve') { renderDetail(); }
      });
      return ctx.done();
    }
  });

  /* ================================================================
   * 施工页 3：工单与验收（复用通用工单渲染器，结构整改过滤）
   * ================================================================ */
  JA.registerPage({
    id: 'build-orders', view: 'build', group: '整改验收', name: '工单与验收', icon: 'order',
    render: function (el) { return JA.renderOrdersPage(el, { structural: true }); }
  });
  JA.registerPage({
    id: 'build-report', view: 'build', group: '整改验收', name: '验收报告', icon: 'report',
    render: function (el) { return JA.renderReportsPage(el, { structural: true }); }
  });
})();
