/* =====================================================================
 * 居安智卫 —— 智能节点感知页面集（轻量化附属模块）
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
   * 施工页 1：3D 结构数字孪生（17层装配式剪力墙 · ts-screen 版式）
   * ================================================================ */
  JA.registerPage({
    id: 'site', view: 'build', group: '施工总览', name: '3D运维大厅', icon: 'site',
    render: function (el) {
      var nodes = JA.twinNodes();
      var cNormal = nodes.filter(function (n) { return n.status === 'normal'; }).length;
      var cAlarm = nodes.filter(function (n) { return n.status === 'alarm'; }).length;
      var cWarn = nodes.filter(function (n) { return n.status === 'warn'; }).length;
      var pendOrders = S().orders.filter(function (o) { return o.status !== '已闭环'; }).length;
      var doneOrders = S().orders.filter(function (o) { return o.status === '已闭环'; }).length;

      /* ---------- 小组件构建 ---------- */
      function grp(gid, icon, title, bodyHtml) {
        return '<div class="ts-grp" id="' + gid + '">' +
          '<div class="ts-grp-hd"><span class="ts-ico">' + icon + '</span><span class="ts-gt">' + title + '</span><i></i></div>' +
          '<div class="ts-grp-bd">' + bodyHtml + '</div></div>';
      }
      function infoRow(label, id, val, cls) {
        return '<div class="ts-ir ' + (cls || '') + '"><span>' + label + '</span><b' + (id ? ' id="' + id + '"' : '') + '>' + val + '</b></div>';
      }

      /* ---------- 左栏面板：节点监测（纯状态展示类） ---------- */
      function structBody(fl) {
        var list = fl < 0 ? nodes : nodes.filter(function (n) { return n.floor === fl + 1; });
        var cn = 0, ca = 0, cw = 0;
        list.forEach(function (n) {
          if (n.status === 'alarm') ca++; else if (n.status === 'warn') cw++; else cn++;
        });
        var top = list.slice().sort(function (a, b) {
          var w = { alarm: 0, warn: 1, normal: 2 };
          return (w[a.status] - w[b.status]) || (b.stress - a.stress);
        }).slice(0, 5);
        var topHtml = top.map(function (n) {
          var cls = n.status === 'alarm' ? 'r' : (n.status === 'warn' ? 'y' : 'g');
          var tag = n.status === 'alarm' ? '异常' : (n.status === 'warn' ? (n.aiResult === '整改待验收' ? '待验收' : '预警') : '正常');
          return '<div class="ts-t5 ts-t5-' + cls + '" data-node="' + n.id + '">' +
            '<span class="ts-dot ts-dot-' + cls + '"></span><b>' + n.id + '</b>' +
            '<small>' + n.floor + 'F</small><em>' + n.stress + 'MPa</em>' +
            '<i class="ts-tag-' + cls + '">' + tag + '</i></div>';
        }).join('');
        /* 各楼层节点分布统计 */
        var fm = {};
        list.forEach(function (n) {
          var k = n.floor + 'F';
          if (!fm[k]) fm[k] = { total: 0, alarm: 0, warn: 0 };
          fm[k].total++;
          if (n.status === 'alarm') fm[k].alarm++; else if (n.status === 'warn') fm[k].warn++;
        });
        var floorHtml = Object.keys(fm).sort(function (a, b) { return parseInt(a, 10) - parseInt(b, 10); }).map(function (k) {
          var d = fm[k];
          var cls = d.alarm ? 'r' : (d.warn ? 'y' : 'g');
          var tip = d.alarm ? d.alarm + '异常' : (d.warn ? d.warn + '预警' : '全部正常');
          return '<div class="ts-t5 ts-t5-' + cls + '" style="cursor:default"><b>' + k + '</b>' +
            '<small>' + d.total + ' 个节点</small><em class="ts-c-' + cls + '">' + tip + '</em></div>';
        }).join('');
        return '<div class="ts-snap">' +
            '<div><b>' + (fl < 0 ? 218 : list.length) + '</b><span>套筒总数</span></div>' +
            '<div><b class="ts-c-g">' + cn + '</b><span>正常节点</span></div>' +
            '<div><b class="ts-c-r">' + ca + '</b><span>异常节点</span></div>' +
            '<div><b class="ts-c-y">' + cw + '</b><span>待验收</span></div>' +
          '</div>' +
          '<div class="ts-t5-hd">各楼层节点分布</div><div class="ts-t5-list">' + floorHtml + '</div>' +
          '<div class="ts-t5-hd">异常节点 TOP5（应力 MPa / 限值300）</div><div class="ts-t5-list">' + topHtml + '</div>';
      }

      /* ---------- 右栏面板：结构智析（AI分析 / 评估 / 建议） ---------- */
      function aiBody(fl) {
        var list = fl < 0 ? nodes : nodes.filter(function (n) { return n.floor === fl + 1; });
        var hsum = 0;
        list.forEach(function (n) { hsum += n.health; });
        var hv = list.length ? (hsum / list.length).toFixed(1) : '—';
        var worst = list.slice().sort(function (a, b) { return a.health - b.health; })[0];
        var risk = !worst ? '—' : (worst.status === 'alarm' ? 'B级（局部高风险）' : (worst.status === 'warn' ? 'A-级（预警跟踪）' : 'A级'));
        var riskCls = worst && worst.status === 'alarm' ? 'r' : (worst && worst.status === 'warn' ? 'y' : 'g');
        return '<div class="ts-hi"><div class="ts-hi-l">结构整体健康指数综合评估' + (fl < 0 ? '' : '（' + (fl + 1) + 'F）') + '</div><div class="ts-hi-v">' + hv +
            '<small>分</small></div><div class="ts-hi-bar"><i style="width:' + (hv === '—' ? 0 : hv) + '%"></i></div></div>' +
          '<div class="ts-snap">' +
            '<div><b class="ts-c-' + riskCls + '">' + risk + '</b><span>风险等级判定</span></div>' +
            '<div><b class="ts-c-g">52</b><span>剩余寿命(年)</span></div>' +
          '</div>' +
          '<div class="ts-t5-hd">异常节点智能诊断 · AI 分级处置建议</div>' +
          '<div class="ts-adv ts-adv-r"><b>S-07 · 4F</b>应力326MPa超限：灌浆疑似不密实，建议48h内钻孔验证，必要时注浆补强</div>' +
          '<div class="ts-adv ts-adv-y"><b>S-05 · 3F</b>应力偏高：加密监测至10min/次，持续观察7天</div>' +
          '<div class="ts-adv ts-adv-g"><b>其余节点</b>应力处于安全区间，按季度例行巡检</div>';
      }

      var envBody =
        '<div class="ts-ir-grid">' +
          infoRow('实时温度', 'tsTemp', '26.4℃') +
          infoRow('相对湿度', 'tsHum', '58%') +
          infoRow('PM2.5', 'tsPm', '32 μg/m³') +
          infoRow('风速风向', null, '东南风 2.8m/s') +
        '</div>' +
        '<div class="ts-hi ts-hi-s"><div class="ts-hi-l">室外环境综合评分</div><div class="ts-hi-v ts-c-g">92.6<small>分</small></div></div>' +
        '<div class="ts-ir-grid">' +
          infoRow('施工人员', 'tsFlowP', '86 人次') +
          infoRow('当日车次', 'tsFlowC', '24 车次') +
        '</div>';

      /* ---------- 右栏面板 ---------- */
      var nodeEmptyBody = '<div class="ts-node-empty">点击 3D 模型中的套筒节点<br>查看实时状态 · 位置信息 · AI 诊断</div>';
      function nodeBody(n) {
        var pct = Math.min(100, n.stress / 300 * 100);
        var cls = n.status === 'alarm' ? 'r' : (n.status === 'warn' ? 'y' : 'g');
        return '<div class="ts-n-id"><span class="ts-dot ts-dot-' + cls + '"></span><b>' + n.id + '</b>' +
            '<i class="ts-tag-' + cls + '">' + n.aiResult + '</i></div>' +
          '<div class="ts-n-row"><span>节点类型</span><b>' + n.type + '</b></div>' +
          '<div class="ts-n-row"><span>安装位置</span><b>' + n.floor + 'F · ' + n.name + '</b></div>' +
          '<div class="ts-n-row"><span>BIM/GPS坐标</span><b>' + n.bim + '</b></div>' +
          '<div class="ts-n-row"><span>当前应力</span><b class="ts-c-' + cls + '">' + n.stress + ' MPa</b></div>' +
          '<div class="ts-bar"><i class="ts-bar-' + cls + '" style="width:' + pct + '%"></i><em>限值300 MPa</em></div>' +
          '<div class="ts-n-row"><span>健康度</span><b>' + n.health + ' 分</b></div>' +
          '<div class="ts-n-row"><span>灌浆质量</span><b>' + n.grout + '</b></div>' +
          '<div class="ts-n-ft">' +
            '<span class="btn btn-sm" data-nav="build:sleeves">套筒监测台账</span>' +
            (n.status !== 'normal' ? '<span class="btn btn-primary btn-sm" data-nav="build:build-orders">一键生成整改工单</span>' : '') +
          '</div>';
      }

      var ordersBody =
        '<div class="ts-snap">' +
          '<div><b class="ts-c-r">' + cAlarm + '</b><span>待整改</span></div>' +
          '<div><b class="ts-c-y">' + cWarn + '</b><span>待验收</span></div>' +
          '<div><b class="ts-c-g">' + doneOrders + '</b><span>已闭环</span></div>' +
        '</div>' +
        '<div class="ts-order" data-nav="build:build-orders"><span>整改工单管理</span><b class="ts-c-y">' + pendOrders + '<em>单待办</em></b><i>去处理 →</i></div>' +
        '<div class="ts-order" data-nav="build:sleeves"><span>套筒监测台账</span><b>218<em>节点</em></b><i>查看 →</i></div>';

      /* ---------- 左侧纵向导航（替代原底部横向导航） ---------- */
      function navIcon(name) {
        var P = {
          site: 'M3 21h18M5 21V7l7-4 7 4v14M9 9h2M13 9h2M9 13h2M13 13h2M9 17h2M13 17h2',
          sleeve: 'M7 3v18M17 3v18M3 8h4M3 16h4M17 8h4M17 16h4M10 12h4',
          order: 'M9 11l3 3L22 4L21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11',
          report: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM14 2v6h6M8 13h8M8 17h5',
          ai: 'M9 3h6M9 3v2H5v14h14V5h-4V3M9 11h.01M15 11h.01M8 15h8',
          setting: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19 12a7 7 0 00-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 00-2-1.2L14 3h-4l-.5 2.6a7 7 0 00-2 1.2l-2.4-1-2 3.4 2 1.6a7 7 0 000 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 002 1.2L10 21h4l.5-2.6a7 7 0 002-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z'
        };
        var p = P[name] || P.site;
        return 'background-image:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%237fb6ff\' stroke-width=\'1.7\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'' + p + '\'/%3E%3C/svg%3E")';
      }
      var navGroups = [
        ['施工总览', [['build:site', '3D数字孪生', 'site']]],
        ['结构监测', [['build:sleeves', '节点监测', 'sleeve']]],
        ['结构智析', [['build:sleeve-ai', 'AI结构健康诊断与寿命预估', 'ai']]],
        ['验收管理', [['build:build-orders', '工单与验收', 'order'], ['build:build-report', '验收报告', 'report']]],
        ['设置', [['build:build-settings', '节点系统设置', 'setting']]]
      ];
      var navSideHtml = navGroups.map(function (g) {
        return '<div class="nav-group"><div class="nav-gtitle">' + g[0] + '</div>' +
          g[1].map(function (a) {
            return '<div class="nav-item' + (a[0] === 'build:site' ? ' active' : '') + '" data-nav="' + a[0] + '">' +
              '<span class="nav-ico" style="' + navIcon(a[2]) + '"></span>' + a[1] + '</div>';
          }).join('') + '</div>';
      }).join('');

      var screen = h('div', 'ts-screen ts-screen-nonav');
      screen.innerHTML =
        '<div class="ts-top">' +
          '<div class="ts-back" id="tsBack">← 返回首页</div>' +
          '<div class="ts-title"><span class="ts-deco"></span><h1>城枢慧眼</h1>' +
            '<span class="ts-sub">基于AI感知的城市基建智慧运维与低碳能源融合管理系统</span><span class="ts-deco"></span></div>' +
          '<div class="ts-clock" id="tsClock"></div>' +
        '</div>' +
        '<div class="ts-body ts-body-4col">' +
          '<div class="ts-navside" id="tsNavSide">' + navSideHtml + '</div>' +
          '<div class="ts-side ts-struct" id="tsStruct"></div>' +
          '<div class="ts-center">' +
            '<div class="ts-tabs">' +
              '<span class="ts-tab on">智能节点感知</span>' +
              '<span class="ts-floors" id="tsFloors" style="display:inline-flex"></span>' +
            '</div>' +
            '<div class="ts-stage">' +
              '<div class="ts-view" id="tsView"></div>' +
              '<div class="ts-hint" id="tsHint"></div>' +
              '<div class="ts-legend" id="tsLegend"></div>' +
            '</div>' +
          '</div>' +
          '<div class="ts-side ts-right" id="tsRight"></div>' +
        '</div>';
      el.appendChild(screen);

      /* ---------- 时钟 & 实时微抖动 ---------- */
      var clockEl = document.getElementById('tsClock');
      function tick() {
        var d = new Date();
        function p(n) { return ('0' + n).slice(-2); }
        var wk = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
        clockEl.textContent = d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
          ' 星期' + wk + '  ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
      }
      tick();
      var clockIv = setInterval(tick, 1000);
      var liveIv = setInterval(function () {
        var j = function (base, amp, fix) { return (base + (Math.random() - .5) * amp).toFixed(fix); };
        var te = document.getElementById('tsTemp'); if (te) te.textContent = j(26.4, .5, 1) + '℃';
        var hu = document.getElementById('tsHum'); if (hu) hu.textContent = Math.round(58 + (Math.random() - .5) * 4) + '%';
        var pm = document.getElementById('tsPm'); if (pm) pm.textContent = Math.round(32 + (Math.random() - .5) * 8) + ' μg/m³';
        var fp = document.getElementById('tsFlowP'); if (fp) fp.textContent = Math.round(86 + (Math.random() - .5) * 10) + ' 人次';
        var fc = document.getElementById('tsFlowC'); if (fc) fc.textContent = Math.round(24 + (Math.random() - .5) * 6) + ' 车次';
      }, 2500);

      /* ---------- 节点 30 天应力趋势 ---------- */
      function drawTrend(n) {
        var cv = document.getElementById('tsTrend');
        if (!cv) return;
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        var w = cv.clientWidth || 260, hgt = cv.clientHeight || 52;
        cv.width = w * dpr; cv.height = hgt * dpr;
        var g = cv.getContext('2d'); g.scale(dpr, dpr);
        var seed = 0; for (var i = 0; i < n.id.length; i++) seed += n.id.charCodeAt(i);
        var pts = [];
        for (var i = 0; i < 30; i++) {
          var r = Math.sin(seed * 3.7 + i * 1.31) * 43758.5453; r = r - Math.floor(r);
          pts.push(n.stress * (0.86 + r * 0.22));
        }
        pts[29] = n.stress;
        var max = Math.max.apply(null, pts.concat([300])), min = Math.min.apply(null, pts) * .9;
        var yL = hgt - 4 - (300 - min) / (max - min) * (hgt - 10);
        g.strokeStyle = 'rgba(255,45,85,.55)'; g.setLineDash([4, 3]); g.lineWidth = 1;
        g.beginPath(); g.moveTo(0, yL); g.lineTo(w, yL); g.stroke(); g.setLineDash([]);
        var col = n.status === 'alarm' ? '#ff5d7d' : (n.status === 'warn' ? '#ffd24d' : '#2fe6a8');
        g.strokeStyle = col; g.lineWidth = 1.6; g.beginPath();
        pts.forEach(function (v, i) {
          var x = i / 29 * w, y = hgt - 4 - (v - min) / (max - min) * (hgt - 10);
          i ? g.lineTo(x, y) : g.moveTo(x, y);
        });
        g.stroke();
      }

      /* ---------- 3D 场景（17层装配式剪力墙） ---------- */
      var viewEl = document.getElementById('tsView');
      var floorsEl = document.getElementById('tsFloors');
      var hintEl = document.getElementById('tsHint');
      var legendEl = document.getElementById('tsLegend');
      var scene = null;

      var floorBtns = ['<span class="ts-fb on" data-f="-1">全部</span>']
        .concat(nodes.map(function (_, i) { return i % 8 === 0 ? ('<span class="ts-fb" data-f="' + (i / 8) + '">' + (i / 8 + 1) + 'F</span>') : null; })
          .filter(Boolean)).join('');
      floorsEl.innerHTML = floorBtns;

      var LEGEND = '<i style="background:#21e6a4"></i>正常套筒 ' + cNormal +
        '<i style="background:#ff2d55"></i>异常 ' + cAlarm +
        '<i style="background:#ffc83d"></i>整改待验收 ' + cWarn +
        '<i style="background:#4d97e0"></i>剪力墙/角柱（半透明）';

      function flashGroup(id) {
        var g0 = document.getElementById(id);
        if (!g0) return;
        g0.classList.remove('ts-flash');
        void g0.offsetWidth;
        g0.classList.add('ts-flash');
        setTimeout(function () { g0.classList.remove('ts-flash'); }, 1400);
      }

      function renderPanels(picked) {
        var structEl = document.getElementById('tsStruct');
        var rightEl = document.getElementById('tsRight');
        var fl = picked && picked.fl >= 0 ? picked.fl : -1;
        structEl.innerHTML = grp('gStruct', '⬢', '节点监测', structBody(fl));
        rightEl.innerHTML =
          grp('gNode', '●', '节点实时状态', picked && picked.n ? nodeBody(picked.n) : nodeEmptyBody) +
          grp('gAiStress', '◉', '结构智析', aiBody(fl)) +
          grp('gOrder', '✎', '整改工单', ordersBody);
        if (picked && picked.n) setTimeout(function () { drawTrend(picked.n); }, 30);
      }

      scene = new JA.TwinTower(viewEl, {
        onPickNode: function (n) {
          renderPanels({ n: n, fl: scene.getFloor ? scene.getFloor() : -1 });
          flashGroup('gNode');
        }
      });
      legendEl.innerHTML = LEGEND;
      hintEl.textContent = '17层装配式剪力墙结构 · 自动环绕 · 楼层切换 / 点击套筒查看节点详情';
      renderPanels();
      requestAnimationFrame(function () { viewEl.style.opacity = '1'; });

      /* ---------- 事件委托：楼层 / TOP5 / 导航 ---------- */
      screen.addEventListener('click', function (e) {
        var fb = e.target.closest ? e.target.closest('.ts-fb') : null;
        if (fb && scene && scene.setFloor) {
          floorsEl.querySelectorAll('.ts-fb').forEach(function (x) { x.classList.remove('on'); });
          fb.classList.add('on');
          var fl = +fb.getAttribute('data-f');
          scene.setFloor(fl);
          renderPanels({ fl: fl });
          flashGroup('gStruct');
          return;
        }
        var t5 = e.target.closest ? e.target.closest('.ts-t5') : null;
        if (t5) {
          var n = null, nid = t5.getAttribute('data-node');
          nodes.forEach(function (x) { if (x.id === nid) n = x; });
          if (!n) return;
          scene.setFloor(n.floor - 1);
          floorsEl.querySelectorAll('.ts-fb').forEach(function (x) {
            x.classList.toggle('on', +x.getAttribute('data-f') === n.floor - 1);
          });
          setTimeout(function () {
            scene.selectNode(n.id, false);
            renderPanels({ n: n, fl: n.floor - 1 });
            flashGroup('gNode');
          }, 720);
          return;
        }
        var nav = e.target.closest ? e.target.closest('[data-nav]') : null;
        if (nav) {
          var parts = nav.getAttribute('data-nav').split(':');
          JA.go(parts[0], parts[1]);
        }
      });
      document.getElementById('tsBack').onclick = function () { JA.go('ops', 'dashboard'); };

      /* ---------- 卸载清理 ---------- */
      return function () {
        clearInterval(clockIv); clearInterval(liveIv);
        if (scene) scene.dispose();
        if (screen.parentNode) screen.parentNode.removeChild(screen);
      };
    }
  });

  /* ================================================================
   * 施工页 2：套筒节点管理（波形 + 录入 + 健康评分）
   * ================================================================ */
  /* AI 结构诊断模型：风险分级 / 处置建议 / 剩余寿命（按节点状态联动） */
  var SLEEVE_AI = {
    alarm: {
      risk: '高风险', riskCls: 'sl-risk-high', life: 3, lifePct: 8,
      assess: '当前应力已超过红色限值，套筒灌浆疑似不密实，节点应力集中，处于不安全受力状态，须立即处置。',
      steps: [
        ['一级响应', 'n1', '立即停止该节点上部区域作业，划定现场警戒范围'],
        ['一级响应', 'n1', '自动派发结构整改工单，24h 内完成注浆补强施工'],
        ['一级响应', 'n1', '复检应力与灌浆密实度，验收合格后方可恢复工序']
      ]
    },
    warn: {
      risk: '中风险', riskCls: 'sl-risk-mid', life: 18, lifePct: 42,
      assess: '应力进入黄色预警区间，存在应力集中趋势，暂不影响整体承载安全，需加密观测并复核。',
      steps: [
        ['二级响应', 'n2', '加密观测频次至 20Hz，持续跟踪应力变化曲线'],
        ['二级响应', 'n2', '复核灌浆施工记录与 BIM 节点坐标，排查扰动源'],
        ['二级响应', 'n2', '48h 内现场复检，必要时复拧补浆后重新评级']
      ]
    },
    normal: {
      risk: '低风险', riskCls: 'sl-risk-low', life: 42, lifePct: 92,
      assess: '应力处于安全工作区间，灌浆饱满，节点健康状态良好，按常规频次巡检即可。',
      steps: [
        ['三级响应', 'n3', '保持 10Hz 常规自动化巡检与波形留痕'],
        ['三级响应', 'n3', '纳入月度应力历史趋势分析与结构健康度评估'],
        ['三级响应', 'n3', '无需额外处置，维持现有施工工况']
      ]
    }
  };
  /* 近30天应力历史（按节点编号确定性生成，末值=当前实测应力） */
  function sleeveHist30(sv) {
    var seed = 0, i;
    for (i = 0; i < sv.id.length; i++) seed += sv.id.charCodeAt(i);
    var arr = [], labels = [], d = new Date();
    for (i = 29; i >= 0; i--) {
      var dd = new Date(d.getTime() - i * 86400000);
      labels.push((dd.getMonth() + 1) + '-' + dd.getDate());
      var x = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453;
      var r = x - Math.floor(x);
      var ratio;
      if (sv.status === 'alarm') ratio = 0.62 + r * 0.10 + (29 - i) * 0.012;
      else if (sv.status === 'warn') ratio = 0.74 + r * 0.08 + (29 - i) * 0.004;
      else ratio = 0.56 + r * 0.13;
      arr.push(Math.round(sv.stress * ratio));
    }
    arr[29] = sv.stress;
    return { labels: labels, data: arr };
  }

  JA.registerPage({
    id: 'sleeves', view: 'build', group: '结构监测', name: '节点监测', icon: 'sleeve',
    render: function (el, param) {
      var ctx = pageCtx();
      var canEdit = JA.perm.sleeveEdit;
      el.innerHTML = pageHead('节点监测 · 套筒实时状态总览', '智能节点感知 / 结构监测 / 节点监测',
        canEdit ? '<button class="btn btn-primary btn-sm" id="svEntry">+ 录入套筒数据</button>' :
          '<span class="lock-tip">运维账号：套筒数据只读</span>');

      /* ============ 节点监测（纯状态展示类） ============ */
      var strip = h('div', 'metric-strip mb12'); el.appendChild(strip);
      var pNode = panel('节点监测 · 套筒状态统计与实时状态总览', '状态统计 / 楼层分布 / 异常TOP / 3D联动定位');
      var nodeGrid = h('div', 'grid g-21');
      var twWrap = h('div');
      var tw = h('div', 'tbl-wrap'); tw.style.maxHeight = '360px'; twWrap.appendChild(tw);
      var nrWrap = h('div');
      nodeGrid.appendChild(twWrap); nodeGrid.appendChild(nrWrap);
      pNode.bd.appendChild(nodeGrid);
      el.appendChild(pNode.el);

      var selectedId = (param && param.node) || 'S-07';
      var waveChart = null;

      function curSleeve() {
        return S().sleeves.filter(function (x) { return x.id === selectedId; })[0];
      }
      function selectNode(id) { selectedId = id; renderTable(); renderNodeRight(); }
      /* 点击节点（台账行 / 异常TOP）→ 跳转 AI结构健康诊断与寿命预估 并加载该节点 */
      function goAi(id) { JA.go('build', 'sleeve-ai', { node: id }); }

      /* ---- 顶部状态统计 ---- */
      function renderStrip() {
        var sv = S().sleeves;
        var health = Math.round(sv.reduce(function (a, x) { return a + +x.health; }, 0) / sv.length);
        var nAlarm = sv.filter(function (x) { return x.status === 'alarm'; }).length;
        var nWarn = sv.filter(function (x) { return x.status === 'warn'; }).length;
        var nNormal = sv.length - nAlarm - nWarn;
        strip.innerHTML = [
          ['套筒节点总数', '218 个', '灌浆节点全覆盖'],
          ['正常节点', nNormal + ' 个', '应力在安全区间', 'good'],
          ['黄色预警', nWarn + ' 个', '加密观测', nWarn ? 'warn' : 'good'],
          ['红色告警', nAlarm + ' 个', '超红色限值', nAlarm ? 'bad' : 'good'],
          ['平均健康评分', health + ' 分', health >= 90 ? '结构状态良好' : '需关注', health >= 90 ? 'good' : 'warn']
        ].map(function (m) {
          return '<div class="metric ' + (m[3] || '') + '"><b>' + m[1] + '</b><span>' + m[0] + ' · ' + m[2] + '</span></div>';
        }).join('');
      }
      /* ---- 节点台账 ---- */
      function renderTable() {
        tw.innerHTML = '<table class="tbl"><thead><tr><th>节点编号</th><th>位置</th><th>应力MPa</th><th>AI判定</th><th>健康分</th><th>时间</th></tr></thead><tbody>' +
          S().sleeves.map(function (x) {
            return '<tr data-id="' + x.id + '" style="cursor:pointer;background:' +
              (x.id === selectedId ? 'rgba(34,224,255,.08)' : '') + '">' +
              '<td class="num"><b>' + x.id + '</b></td><td style="font-size:11px">' + x.location + '</td>' +
              '<td class="num ' + (x.status === 'alarm' ? 'c-red' : x.status === 'warn' ? 'c-yellow' : 'c-green') + '">' + x.stress + '</td>' +
              '<td>' + sleeveTag(x.status) + '</td><td class="num">' + x.health + '</td>' +
              '<td class="fs11 muted">' + x.time.slice(5) + '</td></tr>';
          }).join('') + '</tbody></table>';
        tw.querySelectorAll('tr[data-id]').forEach(function (tr) {
          tr.onclick = function () { goAi(tr.getAttribute('data-id')); };
        });
      }
      /* ---- 右侧：异常节点TOP + 楼层分布 + 实时应力状态（状态类） ---- */
      function renderNodeRight() {
        var sv = curSleeve();
        if (!sv) return;
        var abn = S().sleeves.filter(function (x) { return x.status !== 'normal'; })
          .sort(function (a, b) { return b.stress - a.stress; }).slice(0, 5);
        /* 各楼层节点分布统计 */
        var floorMap = {};
        S().sleeves.forEach(function (x) {
          var m = x.location.match(/(\d+F|屋面)/);
          var f = m ? m[1] : '其他';
          if (!floorMap[f]) floorMap[f] = { total: 0, alarm: 0, warn: 0 };
          floorMap[f].total++;
          if (x.status === 'alarm') floorMap[f].alarm++;
          else if (x.status === 'warn') floorMap[f].warn++;
        });
        var floors = Object.keys(floorMap).sort(function (a, b) {
          return (parseInt(a, 10) || 99) - (parseInt(b, 10) || 99);
        });
        var floorHtml = floors.map(function (f) {
          var d = floorMap[f];
          var cls = d.alarm ? 'c-red' : (d.warn ? 'c-yellow' : 'c-green');
          var tip = d.alarm ? d.alarm + ' 异常' : (d.warn ? d.warn + ' 预警' : '全部正常');
          return '<div class="sl-top5" style="cursor:default"><span class="sl-top5-n">' + f + '</span>' +
            '<span class="sl-top5-l">' + d.total + ' 个节点</span>' +
            '<span class="sl-top5-s ' + cls + '">' + tip + '</span></div>';
        }).join('');
        nrWrap.innerHTML =
          '<div class="panel" style="margin-bottom:10px"><div class="panel-hd"><h3 style="font-size:12px">异常节点 TOP' + abn.length + '</h3>' +
            '<div class="hd-extra">点击联动AI诊断</div></div><div class="panel-bd" style="padding:4px 10px">' +
            abn.map(function (x) {
              return '<div class="sl-top5" data-id="' + x.id + '" style="' + (x.id === selectedId ? 'background:rgba(34,224,255,.08);border-radius:6px' : '') + '">' +
                '<span class="sl-top5-n">' + x.id + '</span><span class="sl-top5-l">' + x.location + '</span>' +
                '<span class="sl-top5-s">' + x.stress + ' MPa</span>' + sleeveTag(x.status) + '</div>';
            }).join('') + '</div></div>' +
          '<div class="panel" style="margin-bottom:10px"><div class="panel-hd"><h3 style="font-size:12px">各楼层节点分布</h3>' +
            '<div class="hd-extra">A/B座 · 按状态统计</div></div><div class="panel-bd" style="padding:4px 10px">' + floorHtml + '</div></div>' +
          '<div class="panel"><div class="panel-hd"><h3 style="font-size:12px">实时应力状态 · ' + sv.id + '</h3>' +
            '<div class="hd-extra">10Hz / 60点滚动窗</div></div>' +
            '<div class="panel-bd"><div class="grid g-3" style="gap:8px;margin-bottom:8px">' +
              '<div class="metric ' + (sv.status === 'alarm' ? 'bad' : 'good') + '"><b>' + sv.stress + '</b><span>当前应力 MPa</span></div>' +
              '<div class="metric"><b>' + S().params.sleeveLimit + '</b><span>红色限值 MPa</span></div>' +
              '<div class="metric"><b>' + S().params.sleeveWarn + '</b><span>黄色预警 MPa</span></div></div>' +
              '<div id="waveBox" class="chart" style="height:150px"></div>' +
              '<div class="flex gap8" style="margin-top:8px">' +
                (canEdit ? '<button class="btn btn-primary btn-sm" id="nEntry">录入该节点应力</button>' : '') +
                '<button class="btn btn-primary btn-sm" id="nAi">AI分析诊断</button>' +
                '<button class="btn btn-sm" id="nGo3d">3D模型定位</button></div></div></div>';
        nrWrap.querySelectorAll('.sl-top5[data-id]').forEach(function (row) {
          row.onclick = function () { goAi(row.getAttribute('data-id')); };
        });
        var neb = nrWrap.querySelector('#nEntry');
        if (neb) neb.onclick = function () { JA.openSleeveEntry(sv.id); };
        nrWrap.querySelector('#nAi').onclick = function () { goAi(sv.id); };
        nrWrap.querySelector('#nGo3d').onclick = function () {
          JA.go('build', 'site');
          setTimeout(function () { JA.Store.emit({ type: 'pickSleeve', id: sv.id }); }, 120);
        };
        if (waveChart) { waveChart.dispose(); ctx.bag.list = ctx.bag.list.filter(function (c) { return c !== waveChart; }); waveChart = null; }
        waveChart = Charts.wave(nrWrap.querySelector('#waveBox'), ctx.bag, sv.wave, S().params.sleeveLimit, S().params.sleeveWarn);
      }
      function updateWaveLive() {
        var sv = curSleeve();
        if (sv && waveChart && nrWrap.querySelector('#waveBox')) waveChart.setOption({ series: [{ data: sv.wave }] });
      }
      var eb2 = document.getElementById('svEntry');
      if (eb2) eb2.onclick = function () { JA.openSleeveEntry(selectedId); };
      renderStrip(); renderTable(); renderNodeRight();
      ctx.sub(function (evt) {
        renderStrip(); renderTable();
        if (evt.type === 'sleeve') renderNodeRight();
        else updateWaveLive();
      });
      return ctx.done();
    }
  });

  /* ================================================================
   * 施工页 2B：AI结构健康诊断与寿命预估（结构智析 · AI分析独立页）
   * ================================================================ */
  JA.registerPage({
    id: 'sleeve-ai', view: 'build', group: '结构智析', name: 'AI结构健康诊断与寿命预估', icon: 'sleeve',
    render: function (el, param) {
      var ctx = pageCtx();
      el.innerHTML = pageHead('AI结构健康诊断与寿命预估 - 结构智析', '智能节点感知 / 结构智析 / AI结构健康诊断与寿命预估',
        '<button class="btn btn-sm" id="aiBack">← 返回节点监测</button>');

      /* 上半区：左 节点健康总览 / 右 AI综合诊断结论 */
      var topGrid = h('div', 'grid g-2 mb12');
      var pOver = panel('节点健康总览', '健康分 / 风险等级 / 位置 / BIM坐标');
      var pConc = panel('AI综合诊断结论', '应力水平 / 连接刚度 / 处置方向');
      topGrid.appendChild(pOver.el); topGrid.appendChild(pConc.el);
      el.appendChild(topGrid);

      /* 下半区：纵向功能卡片 */
      var pTrend = panel('应力历史趋势与未来预测', '实测应力 / 预测应力 / 预警线 / 告警线');
      el.appendChild(pTrend.el);
      var pCause = panel('异常原因智能诊断', 'AI 归因权重分析');
      el.appendChild(pCause.el);
      var pStep = panel('AI分级处置建议', '三级响应机制');
      el.appendChild(pStep.el);
      var pLife = panel('剩余寿命预估', '疲劳累积推演 · 数据每日滚动更新');
      el.appendChild(pLife.el);

      /* 底部固定操作区 */
      var actBar = h('div', 'flex gap8');
      actBar.style.cssText = 'justify-content:center;padding:14px 0 4px;border-top:1px solid rgba(47,139,255,.18);margin-top:4px';
      actBar.innerHTML = '<button class="btn btn-primary" id="dWo">按AI建议创建整改工单</button>' +
        '<button class="btn" id="dExport">导出诊断报告</button>';
      el.appendChild(actBar);

      var selectedId = (param && param.node) || 'S-07';
      var histChart = null, lifeChart = null;

      function curSleeve() {
        return S().sleeves.filter(function (x) { return x.id === selectedId; })[0];
      }

      function renderAnalysis() {
        var sv = curSleeve();
        if (!sv) return;
        var m = SLEEVE_AI[sv.status];
        var ringCls = sv.status === 'alarm' ? 'bad' : sv.status === 'warn' ? 'warn' : 'good';
        var lineColor = sv.status === 'alarm' ? '#ff4d6a' : sv.status === 'warn' ? '#ffc83d' : '#22e0ff';
        var hist = sleeveHist30(sv);
        var curStress = sv.stress;
        var maxStress = Math.max.apply(null, hist.data);
        var peakPred = sv.status === 'alarm' ? Math.round(curStress * 1.06)
          : sv.status === 'warn' ? Math.round(curStress * 1.04) : Math.round(curStress * 1.06);
        var lastTime = sv.time || JA.Utils.ymdhm(new Date());

        /* ---- 1. 节点健康总览 ---- */
        pOver.bd.innerHTML =
          '<div class="flex aic gap12">' +
            '<div class="health-ring ' + ringCls + '" style="--p:' + sv.health + '"><b>' + sv.health + '</b></div>' +
            '<div style="flex:1">' +
              '<div class="fs20 c-cyan"><b>' + sv.id + '</b> ' + sleeveTag(sv.status) +
                (sv.status === 'alarm' ? ' <span class="blink-dot"></span>' : '') + '</div>' +
              '<div style="margin-top:6px">风险等级：<span class="sl-risk ' + m.riskCls + '">' + m.risk + '</span></div>' +
              '<div class="fs11 muted" style="margin-top:4px">位置：' + sv.location + '</div>' +
              '<div class="fs11 muted">BIM坐标：' + sv.bim.replace(/ /g, ' / ') + '</div>' +
              '<div class="fs11 muted">最近检测时间：' + lastTime + '</div>' +
            '</div>' +
            '<button class="btn btn-sm" id="dGo3d" style="align-self:flex-start">3D模型定位</button>' +
          '</div>';

        /* ---- 2. AI综合诊断结论 ---- */
        var conc = sv.status === 'alarm' ? [
            ['bad', '应力水平超限', '当前应力 ' + curStress + 'MPa 已突破红色限值 ' + S().params.sleeveLimit + 'MPa，末端持续抬升'],
            ['warn', '节点连接刚度存在下降趋势', '趋势研判为灌浆缺陷导致的应力集中（' + sv.grout + '）'],
            ['bad', '建议立即停工并启动专项评估', '按一级响应处置，48h 内钻孔验证，必要时注浆补强']
          ] : sv.status === 'warn' ? [
            ['warn', '应力水平偏高，近期波动明显', '当前应力 ' + curStress + 'MPa 接近黄色预警线 ' + S().params.sleeveWarn + 'MPa'],
            ['warn', '节点连接刚度存在下降趋势', '灌浆质量：' + sv.grout + '，需跟踪复核'],
            ['good', '建议加强监测频次并评估加固措施', '按二级响应跟踪，加密观测至 10min/次']
          ] : [
            ['good', '应力水平处于安全工作区间', '当前应力 ' + curStress + 'MPa，应力裕度充足'],
            ['good', '节点连接刚度稳定', '灌浆饱满，无明显刚度退化特征'],
            ['good', '维持常规巡检', '按三级响应执行 10Hz 常规自动化巡检']
          ];
        pConc.bd.innerHTML = conc.map(function (c) {
          return '<div class="sl-ai-step"><i class="' + (c[0] === 'bad' ? 'n1' : c[0] === 'warn' ? 'n2' : 'n3') + '">●</i>' +
            '<b>' + c[1] + '</b><span>' + c[2] + '</span></div>';
        }).join('');

        /* ---- 3. 应力历史趋势与未来预测 ---- */
        var futLabels = [], futData = [], i;
        for (i = 1; i <= 7; i++) {
          var dd = new Date(Date.now() + i * 86400000);
          futLabels.push((dd.getMonth() + 1) + '-' + dd.getDate());
          futData.push(Math.round(curStress * (sv.status === 'alarm' ? 1 + i * 0.008 : sv.status === 'warn' ? 0.99 + i * 0.007 : 1)));
        }
        pTrend.bd.innerHTML =
          '<div class="flex gap12">' +
            '<div id="histBox" class="chart" style="flex:1;height:230px"></div>' +
            '<div style="width:150px;flex:none;display:flex;flex-direction:column;gap:8px">' +
              '<div class="metric ' + (sv.status === 'alarm' ? 'bad' : sv.status === 'warn' ? 'warn' : 'good') + '"><b>' + curStress + '</b><span>当前应力 MPa</span></div>' +
              '<div class="metric"><b>' + maxStress + '</b><span>最大应力 MPa</span></div>' +
              '<div class="metric warn"><b>' + peakPred + '</b><span>预测峰值 MPa</span></div>' +
            '</div></div>';
        if (histChart) { histChart.dispose(); ctx.bag.list = ctx.bag.list.filter(function (c) { return c !== histChart; }); histChart = null; }
        histChart = Charts.line(pTrend.bd.querySelector('#histBox'), ctx.bag, {
          x: hist.labels.concat(futLabels), yName: 'MPa', top: 18, colors: ['#ff4d6a', '#ffc83d'],
          series: [
            { name: '实测应力', data: hist.data.concat([null, null, null, null, null, null, null]), areaStyle: { color: '#ff4d6a22' } },
            { name: '预测应力', data: (function () { var a = []; for (var k = 0; k < 29; k++) a.push(null); a.push(curStress); return a.concat(futData); })(), lineStyle: { type: 'dashed' } }
          ],
          yAxis: { min: 100 }, markLine: null
        });
        histChart.setOption({
          series: [{ markLine: { silent: true, symbol: 'none',
            lineStyle: { type: 'dashed', width: 1 },
            data: [
              { yAxis: S().params.sleeveWarn, lineStyle: { color: '#22e0ff' }, label: { color: '#7fd6ff', fontSize: 9, formatter: '预警线' } },
              { yAxis: S().params.sleeveLimit, lineStyle: { color: '#ff4d6a' }, label: { color: '#ff8299', fontSize: 9, formatter: '告警线' } }
            ] } }]
        });

        /* ---- 4. 异常原因智能诊断 ---- */
        var causes = sv.status === 'alarm' ? [
            ['灌浆疑似不密实（缺陷）', 46, '#ff4d6a'], ['荷载波动较大', 28, '#ffc83d'],
            ['连接刚度下降', 17, '#2f7bff'], ['温度变形影响', 9, '#21e6a4']
          ] : sv.status === 'warn' ? [
            ['荷载波动较大', 42, '#ff4d6a'], ['连接刚度下降', 31, '#ffc83d'],
            ['温度变形影响', 18, '#2f7bff'], ['初始偏差影响', 9, '#21e6a4']
          ] : [
            ['温度变形影响', 38, '#2f7bff'], ['荷载正常波动', 33, '#21e6a4'],
            ['施工活荷载扰动', 19, '#ffc83d'], ['测量噪声', 10, '#8ea6c8']
          ];
        pCause.bd.innerHTML = causes.map(function (c, idx) {
          return '<div style="margin-bottom:10px"><div class="flex aic" style="justify-content:space-between;margin-bottom:4px">' +
              '<span class="fs12">原因' + ['一', '二', '三', '四'][idx] + '：' + c[0] + '</span>' +
              '<b class="num" style="color:' + c[2] + '">权重 ' + c[1] + '%</b></div>' +
            '<div class="sl-life-b" style="height:8px"><i style="width:' + c[1] + '%;background:' + c[2] +
              ';box-shadow:0 0 8px ' + c[2] + '55"></i></div></div>';
        }).join('');

        /* ---- 5. AI分级处置建议 ---- */
        var lv = sv.status === 'alarm' ? 2 : sv.status === 'warn' ? 1 : 0;
        var resp = [
          ['黄色响应', '加密监测，每4小时采集一次', '#ffc83d'],
          ['橙色响应', '暂停相关区域施工，组织结构工程师复核', '#ff9f43'],
          ['红色响应', '立即停工，启动专项结构安全评估', '#ff4d6a']
        ];
        pStep.bd.innerHTML = '<div class="grid g-3">' + resp.map(function (r, idx) {
          var on = idx === lv;
          return '<div style="border:1px solid ' + r[2] + (on ? '' : '44') + ';border-radius:8px;padding:12px 14px;' +
            'background:' + r[2] + (on ? '1f' : '0a') + (on ? ';box-shadow:0 0 14px ' + r[2] + '33' : '') + '">' +
            '<div class="flex aic" style="gap:6px"><i style="color:' + r[2] + '">●</i><b style="color:' + r[2] + '">' + r[0] + '</b>' +
            (on ? '<span class="tag tag-yellow" style="margin-left:auto">当前建议</span>' : '') + '</div>' +
            '<div class="fs12" style="margin-top:6px;color:var(--txt2)">' + r[1] + '</div></div>';
        }).join('') + '</div>';

        /* ---- 6. 剩余寿命预估 ---- */
        var lifeYears = [];
        var design = 50, decPer = design - m.life;
        for (i = 0; i <= 10; i++) lifeYears.push(Math.round((design - decPer * Math.pow(i / 10, 1.6)) * 10) / 10);
        pLife.bd.innerHTML =
          '<div class="flex gap12">' +
            '<div style="width:220px;flex:none">' +
              '<div class="fs12 muted">剩余寿命预估</div>' +
              '<div class="num" style="font-size:34px;font-weight:700;color:' + lineColor + ';text-shadow:0 0 14px ' + lineColor + '66;margin:4px 0">' + m.life + ' <span class="fs12">年</span></div>' +
              '<div class="sl-life"><span style="width:88px;flex:none">安全服役</span>' +
                '<div class="sl-life-b"><i style="width:' + m.lifePct + '%;background:' +
                  (sv.status === 'alarm' ? 'linear-gradient(90deg,#d92f55,#ff5d7d)' : sv.status === 'warn' ? 'linear-gradient(90deg,#d99a1f,#ffd24d)' : 'linear-gradient(90deg,#1a6fd0,#22e0ff)') +
                  ';box-shadow:0 0 8px ' + lineColor + '55"></i></div></div>' +
              '<div class="fs11 muted" style="margin-top:8px">影响因素：应力幅值、疲劳次数、环境温度、连接状态</div>' +
            '</div>' +
            '<div id="lifeBox" class="chart" style="flex:1;height:170px"></div>' +
          '</div>';
        if (lifeChart) { lifeChart.dispose(); ctx.bag.list = ctx.bag.list.filter(function (c) { return c !== lifeChart; }); lifeChart = null; }
        var yrLabels = [];
        for (i = 0; i <= 10; i++) yrLabels.push('+' + i * 5 + '年');
        lifeChart = Charts.line(pLife.bd.querySelector('#lifeBox'), ctx.bag, {
          x: yrLabels, yName: '年', top: 16, colors: [lineColor],
          series: [{ name: '剩余寿命趋势', data: lifeYears, areaStyle: { color: lineColor + '22' } }],
          markLine: null
        });

        /* ---- 7. 底部操作 ---- */
        document.getElementById('dWo').onclick = function () {
          JA.openOrderCreate({ typeOptions: ['结构整改'], type: '结构整改',
            target: '套筒 ' + sv.id + ' ' + sv.location.split(' ').slice(-1)[0],
            desc: sv.location + ' 应力 ' + sv.stress + 'MPa ' + (sv.status === 'alarm' ? '超限' : '异常') + '，' + sv.grout });
        };
        document.getElementById('dExport').onclick = function () {
          JA.toast('诊断报告已导出：' + sv.id + ' AI结构健康诊断与寿命预估报告', 'success');
        };
        var g3 = pOver.bd.querySelector('#dGo3d');
        if (g3) g3.onclick = function () {
          JA.go('build', 'site');
          setTimeout(function () { JA.Store.emit({ type: 'pickSleeve', id: sv.id }); }, 120);
        };
      }
      document.getElementById('aiBack').onclick = function () {
        JA.go('build', 'sleeves', { node: selectedId });
      };
      renderAnalysis();
      ctx.sub(function (evt) { if (evt.type === 'sleeve') renderAnalysis(); });
      return ctx.done();
    }
  });

  /* ================================================================
   * 施工页 3：工单与验收（复用通用工单渲染器，结构整改过滤）
   * ================================================================ */
  JA.registerPage({
    id: 'build-orders', view: 'build', group: '验收管理', name: '工单与验收', icon: 'order',
    render: function (el) { return JA.renderOrdersPage(el, { structural: true }); }
  });
  JA.registerPage({
    id: 'build-report', view: 'build', group: '验收管理', name: '验收报告', icon: 'report',
    render: function (el) { return JA.renderReportsPage(el, { structural: true }); }
  });

  /* ================================================================
   * 施工页 5：节点系统设置（设置 · 权限管理 / 预警阈值 / 数据管理）
   * 复用智慧能源运维侧设置页排版与组件样式，业务内容为结构监测场景
   * ================================================================ */
  JA.registerPage({
    id: 'build-settings', view: 'build', group: '设置', name: '节点系统设置', icon: 'setting',
    render: function (el) {
      var ctx = pageCtx();
      el.innerHTML = pageHead('节点系统设置 · 权限管理 / 预警阈值 / 数据管理', '智能节点感知 / 设置 / 节点系统设置');

      /* ---------- 模块一：节点监测权限管理 ---------- */
      var pUser = panel('节点监测权限管理', '监测范围与操作权限按角色授权');
      var userBar = h('div', 'mb12');
      userBar.innerHTML = '<button class="btn btn-primary btn-sm" id="btnAddUser">+ 新增授权账号</button>' +
        '<span class="fs11 muted" style="margin-left:10px">角色：admin=全部权限 / accept=结构工程师·套筒可录入 / ops=运维人员·无本模块权限</span>';
      var userTbl = h('div', 'tbl-wrap');
      pUser.bd.appendChild(userBar); pUser.bd.appendChild(userTbl);
      el.appendChild(pUser.el);

      /* ---------- 模块二：结构预警阈值参数 ---------- */
      var pParam = panel('结构预警阈值参数', '保存后节点监测/结构智析全量重算健康分与预警状态');
      pParam.bd.innerHTML =
        '<div class="form-row">' +
          '<div class="form-item"><label>应力黄色预警 (MPa)</label><input class="inp" id="pmSW" type="number"></div>' +
          '<div class="form-item"><label>应力红色限值 (MPa)</label><input class="inp" id="pmSL" type="number"></div>' +
          '<div class="form-item"><label>应力日增速预警 (MPa/d)</label><input class="inp" id="pmSpd" type="number"></div>' +
        '</div><div class="form-row">' +
          '<div class="form-item"><label>健康分黄线 (分)</label><input class="inp" id="pmHW" type="number"></div>' +
          '<div class="form-item"><label>健康分红线 (分)</label><input class="inp" id="pmHL" type="number"></div>' +
          '<div class="form-item"><label>数据离线判定 (min)</label><input class="inp" id="pmOff" type="number"></div>' +
        '</div><button class="btn btn-primary" id="pmSave">保存参数并重算健康分</button>' +
        '<div class="form-hint">例如把应力红色限值调低至 280MPa，更多节点将判定为红色告警并触发一级响应建议；调高黄色预警线则预警节点相应减少。</div>';
      el.appendChild(pParam.el);

      /* ---------- 模块三：节点数据管理 ---------- */
      var sv = S().sleeves;
      var online = sv.filter(function (x) { return x.status !== 'alarm'; }).length;
      var pData = panel('节点数据管理');
      pData.bd.innerHTML =
        '<div class="grid g-3 mb12">' +
          '<div class="metric"><b>218</b><span>监测节点总数 (个)</span></div>' +
          '<div class="metric"><b>' + (218 * 8640 / 10000).toFixed(1) + ' 万条</b><span>历史监测数据量</span></div>' +
          '<div class="metric good"><b>' + (online / sv.length * 100).toFixed(1) + '%</b><span>节点数据在线率</span></div>' +
        '</div>' +
        '<div class="flex gap8 mb12">' +
          '<button class="btn btn-primary btn-sm" id="btnSync">一键同步节点基准数据</button>' +
          '<button class="btn btn-sm" id="btnExport">一键导出全部节点报告</button>' +
          '<button class="btn btn-sm" id="btnReset">一键重置演示数据</button>' +
        '</div>' +
        '<div style="display:flex;align-items:center;justify-content:center;' +
          'background:rgba(255,45,85,.14);border:1px solid rgba(255,45,85,.6);border-radius:8px;' +
          'box-shadow:inset 0 0 18px rgba(255,45,85,.22),0 0 12px rgba(255,45,85,.18);' +
          'color:#ff8fa3;font-size:15px;font-weight:700;letter-spacing:4px;padding:14px 18px">全部演示数据</div>' +
        '<div class="form-hint mt12">「一键重置」将全部节点监测演示数据恢复为初始状态，不影响页面结构与系统参数。</div>';
      el.appendChild(pData.el);

      /* ---- 权限表格渲染 ---- */
      var SCOPE = { admin: '全部节点 + 系统配置', ops: '能耗设备（无本模块）', accept: '结构节点监测 + 数据录入' };
      var OP = { admin: '读/写/配置/授权', ops: '只读', accept: '查看 + 套筒数据录入' };
      function renderUsers() {
        userTbl.innerHTML = '<table class="tbl"><thead><tr><th>账号</th><th>姓名</th><th>角色</th><th>监测范围</th><th>操作权限</th><th>状态</th><th>操作</th></tr></thead><tbody>' +
          S().users.map(function (u) {
            return '<tr><td class="num">' + u.username + '</td><td>' + u.name + '</td>' +
              '<td><span class="tag ' + (u.role === 'admin' ? 'tag-purple' : u.role === 'ops' ? 'tag-green' : 'tag-yellow') + '">' + u.roleName + '</span></td>' +
              '<td>' + (SCOPE[u.role] || u.dept) + '</td><td>' + (OP[u.role] || '只读') + '</td>' +
              '<td>' + (u.enabled ? '<span class="tag tag-green">启用</span>' : '<span class="tag tag-grey">停用</span>') + '</td>' +
              '<td style="white-space:nowrap"><button class="btn btn-sm" data-act="edit" data-u="' + u.username + '">编辑</button> ' +
              (u.username === JA.session.username ? '' : '<button class="btn btn-sm" data-act="toggle" data-u="' + u.username + '">' + (u.enabled ? '停用' : '启用') + '</button>') +
              '</td></tr>';
          }).join('') + '</tbody></table>';
        userTbl.querySelectorAll('button[data-act]').forEach(function (b) {
          b.onclick = function () {
            var u = S().users.filter(function (x) { return x.username === b.getAttribute('data-u'); })[0];
            if (b.getAttribute('data-act') === 'toggle') { JA.Store.toggleUser(u.username); JA.toast('账号状态已更新，下次登录即时生效', 'success'); }
            else userModal(u);
          };
        });
      }
      function userModal(u) {
        u = u || { username: '', name: '', role: 'accept', roleName: '工程验收', dept: '', phone: '', enabled: true };
        var html =
          '<div class="form-row"><div class="form-item"><label>登录账号</label><input class="inp" id="uName2" value="' + u.username + '" ' + (u.username ? 'disabled' : '') + '></div>' +
          '<div class="form-item"><label>姓名</label><input class="inp" id="uReal" value="' + u.name + '"></div></div>' +
          '<div class="form-row"><div class="form-item"><label>角色</label><select class="sel" id="uRole">' +
            '<option value="admin">管理员</option><option value="accept">工程验收（结构工程师）</option><option value="ops">运维人员</option></select></div>' +
          '<div class="form-item"><label>部门</label><input class="inp" id="uDept" value="' + u.dept + '"></div></div>' +
          '<div class="form-row"><div class="form-item"><label>电话</label><input class="inp" id="uPhone" value="' + u.phone + '"></div>' +
          '<div class="form-item"><label>状态</label><select class="sel" id="uEnabled"><option value="1">启用</option><option value="0">停用</option></select></div></div>';
        JA.modal({
          title: u.username ? '编辑授权账号' : '新增授权账号', width: '560px', body: html,
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
              JA.toast('授权账号已保存，对应账号登录时权限即时生效', 'success');
            } }
          ],
          onOpen: function (bd) {
            bd.querySelector('#uRole').value = u.role;
            bd.querySelector('#uEnabled').value = u.enabled ? '1' : '0';
          }
        });
      }

      /* ---- 阈值参数 ---- */
      var pmSW = document.getElementById('pmSW'), pmSL = document.getElementById('pmSL'),
          pmSpd = document.getElementById('pmSpd'), pmHW = document.getElementById('pmHW'),
          pmHL = document.getElementById('pmHL'), pmOff = document.getElementById('pmOff');
      function fillParams() {
        var p = S().params;
        pmSW.value = p.sleeveWarn; pmSL.value = p.sleeveLimit;
        pmSpd.value = p.sleeveSpeed || 8; pmHW.value = p.healthWarn || 80;
        pmHL.value = p.healthLimit || 65; pmOff.value = p.offlineMin || 30;
      }
      document.getElementById('pmSave').onclick = function () {
        JA.Store.saveParams({
          sleeveWarn: +pmSW.value, sleeveLimit: +pmSL.value,
          sleeveSpeed: +pmSpd.value, healthWarn: +pmHW.value,
          healthLimit: +pmHL.value, offlineMin: +pmOff.value
        });
        /* 按新阈值全量重算套筒状态与健康分，并广播 sleeve 事件联动两个监测页 */
        S().sleeves.forEach(function (x) {
          x.status = x.stress >= +pmSL.value ? 'alarm' : (x.stress >= +pmSW.value ? 'warn' : 'normal');
          x.aiResult = x.status === 'alarm' ? '红色告警' : (x.status === 'warn' ? '黄色预警' : '正常');
          x.health = x.status === 'alarm' ? 61 : (x.status === 'warn' ? 78 : Math.min(99, x.health));
        });
        JA.Store.emit({ type: 'sleeve' });
        JA.toast('参数已保存，节点监测/结构智析健康分与预警状态已全量重算', 'success');
      };

      /* ---- 数据管理按钮 ---- */
      document.getElementById('btnAddUser').onclick = function () { userModal(null); };
      document.getElementById('btnSync').onclick = function () {
        JA.toast('节点基准数据已与 BIM 模型台账同步完成（218 个节点）', 'success');
      };
      document.getElementById('btnExport').onclick = function () {
        JA.toast('全部节点监测报告已导出（套筒验收报告 · 共 218 个节点）', 'success');
      };
      document.getElementById('btnReset').onclick = function () {
        JA.modal({
          title: '重置演示数据', width: '420px',
          body: '<div style="padding:8px 4px;color:var(--txt2)">确认将全部节点监测演示数据恢复为初始状态？</div>',
          buttons: [
            { text: '取消' },
            { text: '确认重置', type: 'btn-danger', handler: function () { JA.Store.reset(); } }
          ]
        });
      };

      renderUsers(); fillParams();
      ctx.sub(function (evt) { if (evt.type === 'user') renderUsers(); });
      return ctx.done();
    }
  });
})();
