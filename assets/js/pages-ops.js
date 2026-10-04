/* =====================================================================
 * 居安智卫 —— 能源精细化管理模块页面集
 * ===================================================================== */
(function () {
  'use strict';
  var S = function () { return JA.Store.state; };
  var Charts = JA.Charts;

  /* ---------- 公共小工具 ---------- */
  function h(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function pageHead(title, crumb, actionsHtml) {
    return '<div class="page-hd"><div><h2>' + title + '</h2><div class="crumb">当前位置：' + crumb + '</div></div>' +
      '<div class="flex gap8">' + (actionsHtml || '') + '</div></div>';
  }
  function panel(title, extra) {
    var el = h('div', 'panel');
    el.innerHTML = '<div class="panel-hd"><h3>' + title + '</h3><div class="hd-extra">' + (extra || '') + '</div></div>';
    var bd = h('div', 'panel-bd');
    el.appendChild(bd);
    return { el: el, bd: bd };
  }
  function pageCtx() {
    var bag = new Charts.Bag();
    function resize() { bag.list.forEach(function (c) { try { c.resize(); } catch (e) {} }); }
    window.addEventListener('resize', resize);
    var offs = [];
    return {
      bag: bag,
      sub: function (fn) { offs.push(JA.Store.subscribe(fn)); },
      done: function () {
        return function () { offs.forEach(function (f) { f(); }); bag.dispose(); window.removeEventListener('resize', resize); };
      }
    };
  }
  function lvlTag(lv) {
    return ({
      high: '<span class="tag tag-red">高能耗</span>',
      mid: '<span class="tag tag-orange">偏高</span>',
      normal: '<span class="tag tag-green">正常</span>',
      low: '<span class="tag tag-blue">低载</span>',
      fault: '<span class="tag tag-red">设备故障</span>'
    })[lv];
  }
  function equipTag(s) {
    return ({ running: '<span class="tag tag-green">运行</span>', stopped: '<span class="tag tag-grey">停机</span>', fault: '<span class="tag tag-red">故障</span>' })[s];
  }
  JA.h = { h: h, head: pageHead, panel: panel, ctx: pageCtx, lvlTag: lvlTag, equipTag: equipTag };

  var ENTRY_BTN = '<button class="btn btn-primary btn-sm" id="btnQuickEntry">+ 录入数据</button>';

  /* ---------- 大屏共享模块（3D数字孪生页 与 指挥大屏 复用，数据保持一致） ---------- */
  function twDevRow(name, sub, st, nav) {
    var map = { ok: ['运行', 'g'], fault: ['故障', 'r'], wait: ['待机', 'y'] };
    var mm = map[st] || map.ok;
    return '<div class="ts-dr"' + (nav ? ' data-nav="' + nav + '"' : '') + '><span class="ts-dot ts-dot-' + mm[1] + '"></span>' +
      '<div class="ts-dn"><b>' + name + '</b><small>' + sub + '</small></div><em class="ts-ds ts-ds-' + mm[1] + '">' + mm[0] + '</em></div>';
  }
  JA.iotBodyHtml = function () {
    return '<div class="ts-snap">' +
        '<div><b>60</b><span>设备总量</span></div>' +
        '<div><b>58</b><span>运行设备</span></div>' +
        '<div><b class="ts-c-g">96.7%</b><span>设备运行率</span></div>' +
        '<div><b class="ts-c-r">2</b><span>设备异常</span></div>' +
      '</div>' +
      '<div class="ts-dev-list">' +
        twDevRow('磁悬浮冷水机组 CT-01', 'COP 6.7 · 负荷72%', 'ok', 'ops:collect') +
        twDevRow('地源热泵 GSHP-01', '冬COP4.0 / 夏EER5.2', 'ok', 'ops:collect') +
        twDevRow('BIPV集中逆变器 INV-01', '发电 186kW', 'ok', 'ops:collect') +
        twDevRow('储能双向PCS PCS-01', 'SOC 68% · 削峰中', 'ok', 'ops:control') +
        twDevRow('精密空调 CRAC-403', '回风28.4℃ · 功率异常', 'fault', 'ops:alerts') +
        twDevRow('精密空调 CRAC-201', '回风26.1℃ · 制冷量异常', 'fault', 'ops:alerts') +
      '</div>';
  };
  JA.pvBodyHtml = function () {
    var o = S().pv.ops;
    return '<div class="ts-snap ts-snap6">' +
        '<div><b>' + o.todayKwh.toLocaleString() + '</b><span>当日发电(kWh)</span></div>' +
        '<div><b>' + (o.monthKwh / 10000).toFixed(2) + '万</b><span>当月发电(kWh)</span></div>' +
        '<div><b>' + (o.cumKwh / 10000).toFixed(1) + '万</b><span>累计发电(kWh)</span></div>' +
        '<div><b class="ts-c-g">' + o.selfUseRate + '%</b><span>自发自用率</span></div>' +
        '<div><b>' + o.gridKwh + '</b><span>并网电量(kWh)</span></div>' +
        '<div><b>' + o.capacityKw + '</b><span>装机容量(kW)</span></div>' +
      '</div>' +
      '<div class="pv-mini"><div class="pv-mini-hd"><span>当日发电功率趋势</span><em>峰值 186 kW</em></div>' +
        '<div id="pvMiniChart"></div></div>' +
      '<div class="ts-ib-list">' +
        '<div class="ts-ib"><span>能源自给率</span><div class="ts-ib-b"><i style="width:22%"></i></div><b>22%</b></div>' +
        '<div class="ts-ib"><span>等效减排</span><div class="ts-ib-b"><i class="hot" style="width:36%"></i></div><b>1.14 t</b></div>' +
      '</div>' +
      '<div class="ts-order" data-nav="ops:energy"><span>今日光伏发电减排</span><b class="ts-c-g">1.14<em>tCO₂</em></b><i>查看能耗 →</i></div>';
  };
  /* 节约成效模块：传统模式 vs 智能调控 紧凑对比（点击打开详情面板） */
  JA.savingCmpHtml = function () {
    var c = S().savingCompare;
    var dims = [c.rows[0], c.rows[1], c.rows[3]];
    return '<div class="sv-mini" data-act="saving" title="点击查看详细对比">' +
      dims.map(function (r) {
        return '<div class="svm-row"><span>' + r.dim + '</span>' +
          '<b class="svm-base">' + r.base + '</b><i>→</i>' +
          '<b class="svm-smart">' + r.smart + '</b>' +
          '<em class="svm-down">↓' + c.rate + '%</em></div>';
      }).join('') +
      '<div class="svm-more">传统模式 vs 智能调控 · 点击查看详细对比 →</div></div>';
  };
  JA.saveBodyHtml = function () {
    return '<div class="ts-snap">' +
        '<div><b>3,268</b><span>累计减排(tCO₂)</span></div>' +
        '<div><b>313.25</b><span>绿化碳汇(tCO₂)</span></div>' +
        '<div><b class="ts-c-r">↓23.6%</b><span>综合节能率</span></div>' +
      '</div>' +
      JA.savingCmpHtml() +
      '<div class="ts-ib-list">' +
        '<div class="ts-ib"><span>折算节约电费</span><div class="ts-ib-b"><i style="width:64%"></i></div><b>≈277.1万</b></div>' +
        '<div class="ts-ib"><span>相当于植树</span><div class="ts-ib-b"><i class="hot" style="width:82%"></i></div><b>≈18.2万棵</b></div>' +
      '</div>' +
      '<div class="ts-order" data-nav="ops:carbon"><span>碳排放下降幅度（环比昨日）</span><b class="ts-c-r">↓ 8.4<em>%</em></b><i>查看碳排 →</i></div>';
  };
  JA.vitaBodyHtml = function () {
    var indBars = [['科技研发', 46], ['数据服务', 22], ['新能源', 18], ['综合配套', 14]]
      .map(function (a) {
        return '<div class="ts-ib"><span>' + a[0] + '</span><div class="ts-ib-b"><i style="width:' + a[1] + '%"></i></div><b>' + a[1] + '%</b></div>';
      }).join('');
    return '<div class="ts-snap">' +
        '<div><b>7</b><span>入驻建筑(栋)</span></div>' +
        '<div><b>1,286</b><span>在线人员</span></div>' +
      '</div>' +
      '<div class="ts-ib-list">' + indBars + '</div>' +
      '<div class="ts-order" data-nav="ops:energy"><span>人均能耗匹配度</span><b class="ts-c-g">91.4<em>%</em></b><i>查看能耗 →</i></div>';
  };

  /* ================================================================
   * 节能成效对比 · 共享详情面板（顶部指标卡 / 右侧模块共用）
   * ================================================================ */
  JA.openSavingPanel = function (opts) {
    opts = opts || {};
    var c = S().savingCompare;
    var body =
      '<div class="sv-panel">' +
        '<div class="sv-hero">' +
          '<div class="sv-hero-l"><div class="sv-hero-t">综合节能率</div>' +
            '<div class="sv-hero-v">23.6<small>%</small><b class="sv-arrow">↓</b></div>' +
            '<div class="sv-hero-s">传统模式基准对比智能调控实测（17层办公楼 · 20183㎡）</div></div>' +
          '<div class="sv-hero-r">' +
            '<div><b>3,268 <em>tCO₂</em></b><span>运行期累计减排</span></div>' +
            '<div><b>277.1 <em>万元</em></b><span>折算节约电费</span></div>' +
          '</div>' +
        '</div>' +
        '<h4 class="sv-tt">传统模式 <i>vs</i> 智能调控 · 多维度详细对比</h4>' +
        '<table class="tbl sv-tbl"><thead><tr>' +
          '<th>对比维度</th><th>传统模式基准值</th><th>智能调控实际值</th><th>同比下降比例</th>' +
        '</tr></thead><tbody>' +
          c.rows.map(function (r) {
            return '<tr><td>' + r.dim + '</td>' +
              '<td class="num sv-base">' + r.base + ' <small>' + r.unit + '</small></td>' +
              '<td class="num sv-smart">' + r.smart + ' <small>' + r.unit + '</small></td>' +
              '<td class="num"><span class="sv-down-tag"><b>↓</b> ' + c.rate + '%</span></td></tr>';
          }).join('') +
        '</tbody></table>' +
        '<h4 class="sv-tt">节能策略说明</h4>' +
        '<div class="sv-tips">' +
          c.tips.map(function (t) { return '<div class="sv-tip"><i>✓</i><span>' + t + '</span></div>'; }).join('') +
        '</div>' +
        '<div class="sv-note">数据口径：电力按华北电网碳排放因子 0.8843 kgCO₂/kWh 折算，智能调控侧与指挥大屏碳排放、能耗指标实时同源。</div>' +
      '</div>';
    return JA.modal({
      title: '节能成效对比', width: '860px', body: body, onClose: opts.onClose,
      buttons: [{ text: '关闭' }]
    });
  };

  /* ================================================================
   * 3D 办公楼挂载器（大屏与孪生页共用，含房间信息浮卡）
   * ================================================================ */
  JA.mountBuilding = function (wrap, opts) {
    opts = opts || {};
    var view = h('div', 'view3d');
    view.innerHTML =
      '<div class="v3d-toolbar">' +
        '<span class="chip" id="cLocate">异常定位</span>' +
        '<span class="chip" id="cReset">重置视角</span>' +
        (JA.perm.energyEdit ? '<span class="chip on" id="cEntry">+ 数据录入</span>' : '<span class="chip" style="color:#ffd970">能耗只读</span>') +
      '</div>' +
      '<div class="v3d-hint">鼠标拖拽旋转 · 滚轮缩放 · 点击房间查看详情</div>' +
      '<div class="legend"><div><i style="background:#ff5a2b"></i>高能耗(橙红)·插座设备集中办公区</div>' +
        '<div><i style="background:#ffc83d"></i>中能耗(黄)·照明/空调机房</div>' +
        '<div><i style="background:#2f8bff"></i>低能耗(蓝绿)·走廊/设备间</div>' +
        '<div><i style="background:#ff2d55;border-radius:50%"></i>闪烁=异常告警</div></div>';
    wrap.appendChild(view);

    var scene = new JA.BuildingScene(view, { onPick: showRoom });
    var popEl = null, currentRoomId = null;

    function roomCard(r) {
      var alerts = S().alerts.filter(function (a) { return a.roomId === r.id && a.active; });
      var lv = JA.Store.roomLevel(r);
      var carbon = JA.Store.roomCarbon(r.total);
      return '<div class="rp-hd"><b>' + r.no + ' ' + r.name + '</b><span class="rp-x" id="rpClose">×</span></div>' +
        '<div class="rp-bd">' +
          '<div class="rp-row"><span>房间编号</span><b>' + r.no + '</b></div>' +
          '<div class="rp-row"><span>能耗等级</span>' + lvlTag(lv) + '</div>' +
          '<div class="rp-row"><span>当前总能耗</span><b class="' + (lv === 'high' ? 'c-red' : 'c-cyan') + '">' + r.total + ' kWh</b></div>' +
          '<div class="rp-row"><span>供暖能耗</span><b>' + (r.heating || 0) + ' kWh</b></div>' +
          '<div class="rp-row"><span>空调风机能耗</span><b>' + r.hvac + ' kWh</b></div>' +
          '<div class="rp-row"><span>照明能耗</span><b>' + r.light + ' kWh</b></div>' +
          '<div class="rp-row"><span>插座设备能耗</span><b>' + (r.socket != null ? r.socket : '-') + ' kWh</b></div>' +
          '<div class="rp-row"><span>电梯能耗</span><b>' + r.elevator + ' kWh</b></div>' +
          '<div class="rp-row"><span>环境温湿度</span><b>' + r.temp + '℃ / ' + r.humidity + '%</b></div>' +
          '<div class="rp-row"><span>人员密度</span><b>' + r.occupancy + ' 人</b></div>' +
          '<div class="rp-row"><span>设备运行状态</span>' + equipTag(r.equipStatus) + '</div>' +
          '<div class="rp-row"><span>异常告警</span>' + (alerts.length ?
            '<span class="tag tag-red"><span class="blink-dot"></span>' + alerts.length + ' 条活动告警</span>'
            : '<span class="tag tag-green">无</span>') + '</div>' +
          '<div class="rp-row"><span>对应碳排放量</span><b class="c-cyan">' + carbon + ' kgCO₂</b></div>' +
          '<div class="rp-row"><span>核算依据</span><b style="font-size:11px;color:#8fb2e4">华北电网因子 0.8843 kgCO₂/kWh</b></div>' +
          (alerts.length ? '<div class="opplan"><h5>最新告警</h5><p>' + alerts[0].title + '</p></div>' : '') +
        '</div>' +
        '<div class="rp-ft">' +
          (JA.perm.energyEdit ? '<button class="btn btn-primary btn-sm" id="rpEntry" style="flex:1">录入/修改数据</button>' : '<span class="lock-tip">当前角色只读</span>') +
          '<button class="btn btn-sm" id="rpMore">详情</button>' +
        '</div>';
    }
    function showRoom(r) {
      currentRoomId = r.id;
      if (popEl) popEl.remove();
      popEl = h('div', 'room-pop');
      popEl.innerHTML = roomCard(r);
      view.appendChild(popEl);
      popEl.querySelector('#rpClose').onclick = function () {
        popEl.remove(); popEl = null; currentRoomId = null; scene.selectRoom(null, false);
      };
      var eb = popEl.querySelector('#rpEntry');
      if (eb) eb.onclick = function () { JA.openRoomEntry(r.id); };
      popEl.querySelector('#rpMore').onclick = function () { JA.go('ops', 'energy'); };
    }
    function refreshPop() {
      if (currentRoomId && popEl) {
        var r = JA.Store.getRoom(currentRoomId);
        if (r) popEl.innerHTML = roomCard(r), bindPop();
      }
    }
    function bindPop() {
      popEl.querySelector('#rpClose').onclick = function () {
        popEl.remove(); popEl = null; currentRoomId = null; scene.selectRoom(null, false);
      };
      var eb = popEl.querySelector('#rpEntry');
      if (eb) eb.onclick = function () { JA.openRoomEntry(currentRoomId); };
      var more = popEl.querySelector('#rpMore');
      if (more) more.onclick = function () { JA.go('ops', 'energy'); };
    }

    var off = JA.Store.subscribe(function (evt) {
      refreshPop();
      if (evt.type === 'locate' && evt.roomId) {
        scene.selectRoom(evt.roomId, true);
        showRoom(JA.Store.getRoom(evt.roomId));
      }
    });

    view.querySelector('#cEntry') && (view.querySelector('#cEntry').onclick = function () { JA.openRoomEntry(); });
    view.querySelector('#cLocate').onclick = function () {
      var a = S().alerts.filter(function (x) { return x.active && x.roomId; })[0];
      if (a) { scene.selectRoom(a.roomId, true); showRoom(JA.Store.getRoom(a.roomId)); JA.toast('已定位至最高优先级异常区域', 'warn'); }
      else JA.toast('当前无活动异常区域', 'success');
    };
    view.querySelector('#cReset').onclick = function () { scene.resetView(); };
    if (opts.autoLocate) {
      var first = S().alerts.filter(function (x) { return x.active && x.level === '告警' && x.roomId; })[0];
      if (first) setTimeout(function () { scene.selectRoom(first.roomId, false); }, 200);
    }

    return {
      scene: scene,
      showRoom: showRoom,
      dispose: function () { off(); scene.dispose(); view.remove(); }
    };
  };

  /* ================================================================
   * 园区级 3D 挂载器（指挥大屏复用运维总览 TwinCampus 模型）
   *   100% 复用 JA.TwinCampus，点击建筑跳转运维总览页；含主楼A楼层选择器
   * ================================================================ */
  JA.mountCampus = function (wrap, opts) {
    opts = opts || {};
    var view = h('div', 'view3d');
    var floorBtns = '<span class="vf-btn on" data-f="0">全部</span>';
    for (var f = 1; f <= 17; f++) floorBtns += '<span class="vf-btn" data-f="' + f + '">' + f + 'F</span>';
    view.innerHTML =
      '<div class="v3d-toolbar">' +
        '<span class="chip" id="cLocate">异常定位</span>' +
        '<span class="chip" id="cReset">重置视角</span>' +
        (JA.perm.energyEdit ? '<span class="chip on" id="cEntry">+ 数据录入</span>' : '<span class="chip" style="color:#ffd970">能耗只读</span>') +
      '</div>' +
      '<div class="v3d-floors" id="cFloors"><em>主楼A</em>' + floorBtns + '</div>' +
      '<div class="v3d-floorinfo" id="cFInfo"></div>' +
      '<div class="v3d-hint">斜45°鸟瞰 · 自动环绕 · 拖拽旋转 · 滚轮缩放 · 点击建筑进入3D数字孪生</div>' +
      '<div class="legend"><div><i style="background:#2f9bff"></i>蓝光玻璃全息建筑</div>' +
        '<div><i style="background:#1f9d6a"></i>绿化景观</div>' +
        '<div><i style="background:#ff2d55;border-radius:50%"></i>异常告警点位</div></div>';
    wrap.appendChild(view);

    var scene = new JA.TwinCampus(view, {
      onPickBuilding: function (b) {
        scene.selectBuilding(b.id);
        setTimeout(function () { JA.go('ops', 'twin'); }, 350);
      },
      // 仅点击建筑跳转；空白处不跳转（避免与楼层选择交互冲突）
      onPickEmpty: function () {}
    });

    /* 楼层选择器：高亮主楼A对应楼层 + 同步该层能源数据（与运维总览 buildingBody 同一计算公式） */
    var fInfo = view.querySelector('#cFInfo');
    view.querySelector('#cFloors').addEventListener('click', function (e) {
      var btn = e.target && e.target.closest ? e.target.closest('.vf-btn') : null;
      if (!btn) return;
      var fl = +btn.getAttribute('data-f');
      var btns = view.querySelectorAll('#cFloors .vf-btn');
      for (var i = 0; i < btns.length; i++) btns[i].classList.toggle('on', btns[i] === btn);
      scene.setFloor(fl);
      if (fl > 0) {
        var seed = 65 * 7 + fl * 13;   // 'A'.charCodeAt(0)=65，与 buildingBody 同公式
        var rnd = function (k) { var x = Math.sin(seed * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };
        var dayK = Math.round(1180 * 0.29 * (0.9 + rnd(1) * 0.2));
        var pvD = Math.round(dayK * (0.2 + rnd(2) * 0.08));
        var cd = (dayK * 0.8843 / 1000).toFixed(2);   // 华北电网碳排放因子
        var devRun = 12 - Math.floor(rnd(3) * 2);
        fInfo.style.display = 'flex';
        fInfo.innerHTML = '<b>A栋 · ' + fl + 'F</b>' +
          '<span>日能耗 ' + dayK.toLocaleString() + ' kWh</span>' +
          '<span>光伏 ' + pvD + ' kWh</span>' +
          '<span>碳排放 ' + cd + ' tCO₂</span>' +
          '<span>设备 ' + devRun + '/12 运行</span>';
      } else {
        fInfo.style.display = 'none';
        fInfo.innerHTML = '';
      }
    });

    view.querySelector('#cEntry') && (view.querySelector('#cEntry').onclick = function () { JA.openRoomEntry(); });
    view.querySelector('#cLocate').onclick = function () {
      var t = scene.locateAlert();
      if (t) JA.toast('已定位至异常建筑：' + t.name, 'warn');
    };
    view.querySelector('#cReset').onclick = function () { scene.resetView(); };

    return {
      scene: scene,
      dispose: function () { scene.dispose(); view.remove(); }
    };
  };

  /* ================================================================
   * 页面 1：指挥中心大屏首页
   * ================================================================ */
  JA.registerPage({
    id: 'dashboard', view: 'ops', group: '综合总览', name: '指挥中心大屏', icon: 'dashboard',
    render: function (el) {
      var ctx = pageCtx();
      el.innerHTML =
        '<div class="dc">' +
          '<div class="dc-kpis" id="dcKpis"></div>' +
          '<div class="dc-main">' +
            '<div class="dc-col" id="dcLeft"></div>' +
            '<div class="dc-center" id="dcCenter"></div>' +
            '<div class="dc-col" id="dcRight"></div>' +
          '</div>' +
        '</div>';

      /* KPI 卡片（真实指标：天津绿色办公建筑 20183㎡ / 全生命周期LCA）
       * 四大分类体系：能耗类 / 碳排放类 / 异常类 / 综合类（顶部与右侧面板分区一一对应） */
      var CATS = [
        { id: 'energy', name: '能耗类' },
        { id: 'carbon', name: '碳排放类' },
        { id: 'alert',  name: '异常类' },
        { id: 'compre', name: '综合类' }
      ];
      var kpiDefs = [
        /* 能耗类：能源消耗 / 能源产出 / 设备运行 */
        { cat: 'energy', label: '当前总能耗', icon: 'energy', cls: 'purple', nav: 'energy',
          val: function (k) { return k.totalKwh; }, unit: 'kWh',
          sub: function (k) { return 'AI预测下时段 ' + k.forecast + ' kW'; } },
        { cat: 'energy', label: '设备总数', icon: 'device', nav: 'equipment',
          val: function (k) { return k.devices; }, unit: '台',
          sub: function (k) { return '故障 <b class="c-red">' + k.deviceFault + '</b> 台'; } },
        { cat: 'energy', label: 'AI负荷预测结果', icon: 'ai', nav: 'ai',
          val: function (k) { return k.forecast; }, unit: 'kW',
          sub: function () { return '下一预测时段 · 24h滚动'; } },
        { cat: 'energy', label: '光伏发电量', icon: 'energy', cls: 'green', nav: 'energy',
          val: function () { return '1,286'; }, unit: 'kWh',
          sub: function () { return '180块BIPV组件 · 实时功率186kW'; } },
        /* 碳排放类：碳排放 / 节能降碳成效 / 减排对比 */
        { cat: 'carbon', label: '建筑运行年碳排放', cls: 'purple', nav: 'carbon',
          val: function (k) { return k.yearCarbon.toLocaleString(); }, unit: 'tCO₂',
          sub: function () { return '运行阶段年碳排放量（实测）'; } },
        { cat: 'carbon', label: '全生命周期总碳排放', cls: 'purple', nav: 'carbon',
          val: function (k) { return k.lcaCarbon.toLocaleString(); }, unit: 'tCO₂',
          sub: function () { return '已扣减绿化碳汇 313.250 tCO₂'; } },
        { cat: 'carbon', label: '总减排量', cls: 'green', nav: 'carbon',
          val: function () { return '5.16'; }, unit: 'tCO₂',
          sub: function () { return '运行期累计减排 3,268 tCO₂'; } },
        { cat: 'carbon', label: '综合节能率', cls: 'green', entry: 'saving',
          val: function () { return '23.6'; }, unit: '%', arrow: true,
          sub: function () { return '点击查看详细对比'; } },
        /* 异常类：设备异常 / 结构异常 / 告警推送 */
        { cat: 'alert', label: '异常告警数量', icon: 'alert', cls: 'red', nav: 'alerts',
          val: function (k) { return k.alerts; }, unit: '起',
          sub: function (k) { return '红色告警 ' + k.redAlerts + ' 起'; } },
        { cat: 'alert', label: '待处理工单', icon: 'report', nav: null,
          val: function (k) { return k.orders; }, unit: '单',
          sub: function () { return '整改工单 / 整改工单'; } },
        /* 综合类：综合评估 / AI能力 / 运营态势 */
        { cat: 'compre', label: '建筑总面积', icon: 'site', nav: 'carbon',
          val: function (k) { return k.area.toLocaleString(); }, unit: '㎡',
          sub: function () { return '天津典型绿色办公建筑 · 地上' + JA.Store.state.lca.floors + '层'; } },
        { cat: 'compre', label: '监测房间总数', icon: 'twin', nav: 'twin',
          val: function () { return '240'; }, unit: '间', sub: function () { return '17层办公建筑全覆盖'; } },
        { cat: 'compre', label: '整体健康指数', icon: 'report', cls: 'green',
          val: function (k) { return k.health; }, unit: '分', sub: function () { return '结构+能源综合评分'; } },
        { cat: 'compre', label: '能耗预测准确率', icon: 'ai', cls: 'green',
          val: function (k) { return '≥92'; }, unit: '%',
          sub: function (k) { return '当前模型 ' + k.accuracy + '%'; } },
        { cat: 'compre', label: '系统综合节能效率', cls: 'green', nav: 'control',
          val: function () { return '10%-40'; }, unit: '%',
          sub: function () { return '建筑侧+光储侧综合调控区间'; } }
      ];
      function kpiCard(d, k) {
        var cls = d.cls || '';
        if (d.label === '异常告警数量' && k.alerts > 0) cls = 'red';
        var attr = d.entry ? 'data-act="' + d.entry + '" title="点击查看详细对比"'
                           : 'data-nav="' + (d.nav || '') + '"';
        return '<div class="kpi ' + cls + (d.entry ? ' kpi-entry' : '') + '" ' + attr + '>' +
          '<div class="k-label">' + d.label + '</div>' +
          '<div class="k-val">' + d.val(k) + ' <small>' + d.unit + '</small>' +
            (d.arrow ? ' <b class="k-arrow">↓</b>' : '') + '</div>' +
          '<div class="k-sub">' + d.sub(k) + '</div></div>';
      }
      function renderKpis() {
        var k = JA.Store.kpis();
        document.getElementById('dcKpis').innerHTML = CATS.map(function (c) {
          var cards = kpiDefs.filter(function (d) { return d.cat === c.id; });
          return '<div class="cat-block cat-' + c.id + '">' +
            '<div class="cat-hd"><i></i><span>' + c.name + '</span><em>' + cards.length + ' 项指标</em></div>' +
            '<div class="cat-bd">' + cards.map(function (d) { return kpiCard(d, k); }).join('') + '</div></div>';
        }).join('');
        document.getElementById('dcKpis').querySelectorAll('.kpi[data-nav]').forEach(function (c) {
          c.onclick = function () { var p = c.getAttribute('data-nav'); if (p) JA.go('ops', p); };
        });
        document.getElementById('dcKpis').querySelectorAll('.kpi[data-act="saving"]').forEach(function (c) {
          c.onclick = function () { JA.openSavingPanel(); };
        });
      }

      /* 左列 */
      var left = document.getElementById('dcLeft');
      var pTrend = panel('总能耗 · 24h 趋势', '单位 kWh');
      var dTrend = h('div', 'chart'); pTrend.bd.appendChild(dTrend); left.appendChild(pTrend.el);
      var pPie = panel('分项能耗占比', '实时');
      var dPie = h('div', 'chart'); pPie.bd.appendChild(dPie); left.appendChild(pPie.el);
      var pRank = panel('房间能耗强度 TOP', 'kWh');
      var dRank = h('div', 'chart'); pRank.bd.appendChild(dRank); left.appendChild(pRank.el);

      /* 中列 3D（复用运维总览 TwinCampus 园区模型） */
      var center = document.getElementById('dcCenter');
      var mounted = JA.mountCampus(center, { autoLocate: true });

      /* 右列 —— 四大分类纵向分区（能耗 / 碳排放 / 异常 / 综合，与顶部 KPI 分区一一对应） */
      var right = document.getElementById('dcRight');
      right.classList.add('dc-right');
      function catBlock(cls, name, extra) {
        var el = h('div', 'cat-block cat-' + cls);
        el.innerHTML = '<div class="cat-hd"><i></i><span>' + name + '</span>' +
          (extra ? '<em>' + extra + '</em>' : '') + '</div>';
        var bd = h('div', 'cat-bd');
        el.appendChild(bd);
        right.appendChild(el);
        return bd;
      }
      function catMod(title, extra, bodyHtml) {
        var el = h('div', 'cat-mod');
        el.innerHTML = '<div class="cat-mod-hd"><span>' + title + '</span>' +
          (extra ? '<em>' + extra + '</em>' : '') + '</div>' +
          '<div class="cat-mod-bd">' + (bodyHtml || '') + '</div>';
        return { el: el, bd: el.querySelector('.cat-mod-bd') };
      }

      /* 能耗类区块：设备物联 + 光伏发电（独立分组） */
      var bdEnergy = catBlock('energy', '能耗类', '能源消耗 · 产出 · 设备');
      bdEnergy.appendChild(catMod('设备物联', '物联网关在线', JA.iotBodyHtml()).el);
      bdEnergy.appendChild(catMod('光伏发电', '240kW装机 · 180块BIPV', JA.pvBodyHtml()).el);

      /* 碳排放类区块：节约成效（传统 vs 智能调控对比） */
      var bdCarbon = catBlock('carbon', '碳排放类', '减排成效对比');
      bdCarbon.appendChild(catMod('节约成效', '传统 vs 智能调控', JA.saveBodyHtml()).el);

      /* 异常类区块：实时异常预警 + 预警推送记录 */
      var bdAlert = catBlock('alert', '异常类', '告警 · 推送');
      var mAl = catMod('实时异常预警', '<span id="alMore" style="cursor:pointer;color:#7fb6ff">全部 →</span>');
      var alWrap = h('div', 'scroll-y dc-al-list'); mAl.bd.appendChild(alWrap);
      bdAlert.appendChild(mAl.el);
      var mPush = catMod('预警推送记录', '短信 / 邮件');
      var pushWrap = h('div', 'scroll-y dc-push-list'); mPush.bd.appendChild(pushWrap);
      bdAlert.appendChild(mPush.el);

      /* 综合类区块：AI负荷预测 + 园区活力 */
      var bdCompre = catBlock('compre', '综合类', 'AI能力 · 运营态势');
      var mFc = catMod('AI 负荷预测', '未来24h');
      var dFc = h('div', 'chart dc-fc-chart'); mFc.bd.appendChild(dFc);
      bdCompre.appendChild(mFc.el);
      bdCompre.appendChild(catMod('园区活力', '业态分布', JA.vitaBodyHtml()).el);

      /* 分区与模块内的路由跳转（事件委托，与孪生页同规则） */
      right.addEventListener('click', function (e) {
        var saving = e.target.closest ? e.target.closest('[data-act="saving"]') : null;
        if (saving) { JA.openSavingPanel(); return; }
        var more = e.target && e.target.id === 'alMore';
        if (more) { JA.go('ops', 'alerts'); return; }
        var nav = e.target.closest ? e.target.closest('[data-nav]') : null;
        if (nav) {
          var parts = nav.getAttribute('data-nav').split(':');
          JA.go(parts[0], parts[1]);
        }
      });

      /* 图表渲染 */
      function trendChart() {
        var s = S();
        Charts.line(dTrend, ctx.bag, {
          x: s.series.labels, yName: 'kWh', top: 24,
          series: [
            { name: '总能耗', data: s.series.total, areaStyle: { color: grad('rgba(34,224,255,.3)', 'rgba(34,224,255,0)') } },
            { name: '供暖', data: s.series.heating, showSymbol: false, lineStyle: { width: 1.6 } },
            { name: '空调风机', data: s.series.hvac, showSymbol: false, lineStyle: { width: 1.6 } },
            { name: '照明', data: s.series.light, showSymbol: false, lineStyle: { width: 1.6 } },
            { name: '插座设备', data: s.series.socket, showSymbol: false, lineStyle: { width: 1.6 } },
            { name: '电梯', data: s.series.elevator, showSymbol: false, lineStyle: { width: 1.6 } }
          ]
        });
      }
      function grad(a, b) {
        return new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: a }, { offset: 1, color: b }]);
      }
      function pieChart() {
        var s = S();
        var he = s.series.heating.reduce(function (a, b) { return a + b; }, 0);
        var hv = s.series.hvac.reduce(function (a, b) { return a + b; }, 0);
        var lt = s.series.light.reduce(function (a, b) { return a + b; }, 0);
        var sk = s.series.socket.reduce(function (a, b) { return a + b; }, 0);
        var el = s.series.elevator.reduce(function (a, b) { return a + b; }, 0);
        var tot = s.series.total.reduce(function (a, b) { return a + b; }, 0);
        var other = Math.max(0, tot - he - hv - lt - sk - el);
        Charts.pie(dPie, ctx.bag, {
          colors: ['#ff4d6a', '#2f7bff', '#ffc83d', '#ff7a45', '#22e0ff', '#7c5bff'],
          centerText: { v: tot.toLocaleString(), t: '今日 kWh' },
          data: [
            { name: '供暖', value: he }, { name: '空调风机', value: hv },
            { name: '照明', value: lt }, { name: '插座设备', value: sk },
            { name: '电梯', value: el }, { name: '其他', value: other }
          ],
          onSelect: function () { JA.go('ops', 'energy'); }
        });
      }
      function rankChart() {
        var list = S().rooms.slice().sort(function (a, b) { return b.total - a.total; }).slice(0, 8);
        Charts.rank(dRank, ctx.bag, list.map(function (r) { return r.no + ' ' + r.name; }),
          list.map(function (r) { return r.total; }));
      }
      function forecastMini() {
        var p = S().prediction;
        Charts.forecast(dFc, ctx.bag,
          p.histLabels.slice(-12), p.history.slice(-12),
          p.futureLabels.slice(0, 12), p.future.slice(0, 12), p.band.slice(0, 12));
      }
      /* 光伏发电：当日发电功率趋势迷你图（sparkline，峰值186kW） */
      function pvMiniChart() {
        var box = document.getElementById('pvMiniChart');
        if (!box) return;
        var o = S().pv.ops;
        var labels = [], i;
        for (i = 0; i < 24; i++) labels.push(i + ':00');
        var chart = echarts.init(box);
        chart.setOption({
          grid: { left: 6, right: 8, top: 8, bottom: 18 },
          tooltip: { trigger: 'axis', formatter: function (p) { return p[0].name + '<br/>发电功率 ' + p[0].value + ' kW'; } },
          xAxis: { type: 'category', boundaryGap: false, data: labels,
            axisLine: { lineStyle: { color: 'rgba(90,140,210,.35)' } }, axisTick: { show: false },
            axisLabel: { color: '#6f8bb8', fontSize: 8.5, interval: 5 } },
          yAxis: { type: 'value', show: false, max: 210 },
          series: [{
            type: 'line', smooth: true, symbol: 'none', data: o.power,
            lineStyle: { width: 2, color: '#ffc83d' },
            areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1,
              [{ offset: 0, color: 'rgba(255,200,61,.4)' }, { offset: 1, color: 'rgba(255,200,61,0)' }]) }
          }]
        });
        ctx.bag.add(chart);
      }
      function alertList() {
        var list = S().alerts.filter(function (a) { return a.active; }).slice(0, 6);
        alWrap.innerHTML = list.length ? list.map(function (a) {
          return '<div class="alert-card ' + (a.level === '告警' ? 'alarm' : 'warn') + '" data-id="' + a.id + '">' +
            '<div class="ac-hd"><span class="tag ' + (a.level === '告警' ? 'tag-red' : 'tag-yellow') + '">' + a.level + '</span>' +
            '<span class="tag tag-grey">' + a.type + '</span></div>' +
            '<div class="ac-title" style="font-size:12px">' + a.title + '</div>' +
            '<div class="ac-meta"><span>📍' + (a.pos || '-') + '</span><span>' + a.time + '</span></div></div>';
        }).join('') : '<div class="muted txt-c pad12">当前无活动告警，系统运行平稳</div>';
        alWrap.querySelectorAll('.alert-card').forEach(function (c) {
          c.onclick = function () { JA.go('ops', 'alerts'); };
        });
      }
      function pushList() {
        pushWrap.innerHTML = S().pushLogs.slice(0, 5).map(function (l) {
          return '<div class="mini-log"><div class="ml-time">' + l.time + ' · ' + l.channel + ' → ' + l.to + '</div>' +
            '<div class="ml-txt">' + l.content + '</div></div>';
        }).join('');
      }
      document.getElementById('alMore').onclick = function () { JA.go('ops', 'alerts'); };

      renderKpis(); trendChart(); pieChart(); rankChart(); forecastMini(); pvMiniChart(); alertList(); pushList();
      ctx.sub(function (evt) {
        if (evt.type === 'push' || evt.type === 'alert') { alertList(); pushList(); }
        renderKpis();
        // 图表数据更新（实例已存在则重绘）
        trendChart(); pieChart(); rankChart(); forecastMini();
      });

      var baseDispose = ctx.done();
      return function () {
        try { mounted.dispose(); } catch (e) {}
        baseDispose();
      };
    }
  });



  /* ================================================================
   * 页面 2：城枢慧眼 · 双视图 3D 数字孪生指挥大屏（全屏覆盖层）
   * ================================================================ */
  JA.registerPage({
    id: 'twin', view: 'ops', group: '综合总览', name: '3D数字孪生', icon: 'twin',
    render: function (el) {
      var pendOrders = S().orders.filter(function (o) { return o.status !== '已闭环'; }).length;

      /* ---------- 小组件构建 ---------- */
      function grp(gid, icon, title, bodyHtml) {
        return '<div class="ts-grp" id="' + gid + '">' +
          '<div class="ts-grp-hd"><span class="ts-ico">' + icon + '</span><span class="ts-gt">' + title + '</span><i></i></div>' +
          '<div class="ts-grp-bd">' + bodyHtml + '</div></div>';
      }
      function mc(label, d, m, c, unit, nav, cls) {
        function row(tag, v) {
          return '<div class="ts-mr"><span>' + tag + '</span><b>' + v + '<em>' + unit + '</em></b></div>';
        }
        return '<div class="ts-mc ' + (cls || '') + '"' + (nav ? ' data-nav="' + nav + '"' : '') + '>' +
          '<div class="ts-mc-l">' + label + '</div>' + row('当日', d) + row('当月', m) + row('累计', c) + '</div>';
      }
      function infoRow(label, id, val, cls) {
        return '<div class="ts-ir ' + (cls || '') + '"><span>' + label + '</span><b' + (id ? ' id="' + id + '"' : '') + '>' + val + '</b></div>';
      }
      function devRow(name, sub, st, nav) {
        var map = { ok: ['运行', 'g'], fault: ['故障', 'r'], wait: ['待机', 'y'] };
        var mm = map[st] || map.ok;
        return '<div class="ts-dr"' + (nav ? ' data-nav="' + nav + '"' : '') + '><span class="ts-dot ts-dot-' + mm[1] + '"></span>' +
          '<div class="ts-dn"><b>' + name + '</b><small>' + sub + '</small></div><em class="ts-ds ts-ds-' + mm[1] + '">' + mm[0] + '</em></div>';
      }

      /* ---------- 面板内容构建（函数化，支持双视图切换重建） ---------- */
      // 智能能源 · 全局（运维总览）
      var energyBody =
        '<div class="ts-mg">' +
          mc('能耗总量', '5,842', '168.4万', '1,862万', 'kWh', 'ops:energy') +
          mc('光伏发电量', '1,286', '3.86万', '86.4万', 'kWh', 'ops:energy') +
          mc('供冷供热量', '3,120', '92.6万', '1,042万', 'kWh', 'ops:energy') +
          mc('总减排量', '5.16', '149.2', '3,268', 'tCO₂', 'ops:carbon') +
          mc('光伏减排量', '1.14', '34.1', '76.4', 'tCO₂', 'ops:carbon') +
          mc('能源站减排量', '1.47', '43.8', '129.1', 'tCO₂', 'ops:carbon') +
        '</div>' +
        '<div class="ts-spark-hd">当日能耗趋势（kWh）</div><canvas id="tsSpark" class="ts-spark"></canvas>';

      // 智能能源 · 单栋/单楼层明细（点击建筑联动）
      function buildingBody(b, fl) {
        var seed = b.id.charCodeAt(0) * 7 + (fl || 0) * 13;
        var rnd = function (i) { var x = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453; return x - Math.floor(x); };
        var area = b.floors * 1180; // 单栋建筑面积估算（㎡）
        var scale = fl ? 1 / b.floors : 1;
        var dayK = Math.round(area * 0.29 * scale * (0.9 + rnd(1) * 0.2));
        var monK = (dayK * 28.8 / 10000).toFixed(1) + '万';
        var accK = (dayK * 318 / 10000).toFixed(0) + '万';
        var hasPv = (b.id === 'A' || b.id === 'G');
        var pvD = hasPv ? Math.round(dayK * (0.2 + rnd(2) * 0.08)) : 0;
        var pvM = hasPv ? (pvD * 28.8 / 10000).toFixed(2) + '万' : '0';
        var pvA = hasPv ? (pvD * 318 / 10000).toFixed(1) + '万' : '0';
        var cd = (dayK * 0.8843 / 1000).toFixed(2), cm = (dayK * 28.8 * 0.8843 / 1000).toFixed(1), ca = (dayK * 318 * 0.8843 / 1000).toFixed(0);
        var devTotal = b.floors * 12, devRun = devTotal - Math.floor(rnd(3) * 2);
        var scope = fl ? (b.name.replace(' · ' + b.floors + 'F', '') + ' · ' + fl + 'F') : b.name;
        return '<div class="ts-bld-hd"><span>' + scope + '</span><em id="tsBldBack">返回全局总览 →</em></div>' +
          '<div class="ts-mg">' +
            mc('能耗总量', dayK.toLocaleString(), monK, accK, 'kWh', 'ops:energy') +
            mc('光伏发电量', pvD.toLocaleString(), pvM, pvA, 'kWh', 'ops:energy') +
            mc('碳排放量', cd, cm, ca, 'tCO₂', 'ops:carbon') +
            mc('供冷供热量', Math.round(dayK * .53).toLocaleString(), (dayK * .53 * 28.8 / 10000).toFixed(1) + '万', (dayK * .53 * 318 / 10000).toFixed(0) + '万', 'kWh', 'ops:energy') +
          '</div>' +
          '<div class="ts-ir-grid">' +
            infoRow('设备运行状态', null, devRun + ' / ' + devTotal + ' 运行') +
            infoRow('能源自给率', null, hasPv ? (pvD / dayK * 100).toFixed(1) + '%' : '0%（市电）') +
            infoRow('单位面积能耗', null, (dayK / (area * scale)).toFixed(2) + ' kWh/㎡') +
            infoRow('实时功率因数', null, (0.92 + rnd(4) * 0.06).toFixed(3)) +
          '</div>';
      }

      // 环境感知（运维总览共用）
      var envBody =
        '<div class="ts-ir-grid">' +
          infoRow('实时温度', 'tsTemp', '26.4℃') +
          infoRow('相对湿度', 'tsHum', '58%') +
          infoRow('PM2.5', 'tsPm', '32 μg/m³') +
          infoRow('风速风向', null, '东南风 2.8m/s') +
        '</div>' +
        '<div class="ts-hi ts-hi-s"><div class="ts-hi-l">室外环境综合评分</div><div class="ts-hi-v ts-c-g">92.6<small>分</small></div></div>' +
        '<div class="ts-ir-grid">' +
          infoRow('当日人流量', 'tsFlowP', '3,856 人次') +
          infoRow('当日车流量', 'tsFlowC', '1,204 车次') +
        '</div>';

      /* ---------- 运维总览 · 右栏（能源运营维度） ---------- */
      var iotBody = JA.iotBodyHtml();

      var aiBody =
        '<div class="ts-ai-grid">' +
          '<div data-nav="ops:control"><span>今日节能率</span><b>23.6<em>%</em></b><small>区间 10%–40%</small></div>' +
          '<div data-nav="ops:carbon"><span>碳排放下降幅度</span><b class="ts-c-r">↓ 8.4<em>%</em></b><small>环比昨日</small></div>' +
          '<div data-nav="ops:ai"><span>AI负荷预测准确率</span><b class="ts-c-g">93.6<em>%</em></b><small>指标要求 ≥92%</small></div>' +
          '<div data-nav="ops:alerts"><span>异常预警响应时长</span><b>38<em>s</em></b><small>平均闭环响应</small></div>' +
        '</div>' +
        '<div class="ts-order" data-nav="ops:orders"><span>待处理整改工单</span><b class="ts-c-y">' + pendOrders + '<em>单</em></b><i>去处理 →</i></div>';

      var vitaBody = JA.vitaBodyHtml();

      /* ---------- 底部导航 ---------- */
      var navs = [
        ['ops:dashboard', '指挥大屏'], ['ops:energy', '能耗态势'], ['ops:collect', '数据采集'],
        ['ops:environment', '环境人员'], ['ops:ai', 'AI负荷预测'], ['ops:control', '节能调控'],
        ['ops:alerts', '异常预警'], ['ops:orders', '工单验收'], ['ops:carbon', '碳排放'],
        ['build:site', '节点感知'], ['common:reports', '报告中心']
      ];
      var bottomHtml = navs.map(function (a) {
        return '<span class="ts-nav" data-nav="' + a[0] + '">' + a[1] + '</span>';
      }).join('');

      var screen = h('div', 'ts-screen');
      screen.innerHTML =
        '<div class="ts-top">' +
          '<div class="ts-back" id="tsBack">← 返回平台</div>' +
          '<div class="ts-title"><span class="ts-deco"></span><h1>城枢慧眼</h1>' +
            '<span class="ts-sub">基于AI感知的城市基建智慧运维与低碳能源融合管理系统</span><span class="ts-deco"></span></div>' +
          '<div class="ts-clock" id="tsClock"></div>' +
        '</div>' +
        '<div class="ts-body">' +
          '<div class="ts-side ts-left" id="tsLeft"></div>' +
          '<div class="ts-center">' +
            '<div class="ts-tabs">' +
              '<span class="ts-tab on">运维总览</span>' +
            '</div>' +
            '<div class="ts-stage">' +
              '<div class="ts-view" id="tsView"></div>' +
              '<div class="ts-hint" id="tsHint"></div>' +
              '<div class="ts-legend" id="tsLegend"></div>' +
            '</div>' +
          '</div>' +
          '<div class="ts-side ts-right" id="tsRight"></div>' +
        '</div>' +
        '<div class="ts-bottom">' + bottomHtml + '</div>';
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
      }, 2500);

      /* ---------- 迷你能耗趋势 ---------- */
      function drawSpark() {
        var cv = document.getElementById('tsSpark');
        if (!cv) return;
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        var w = cv.clientWidth || 300, hgt = cv.clientHeight || 56;
        cv.width = w * dpr; cv.height = hgt * dpr;
        var g = cv.getContext('2d'); g.scale(dpr, dpr);
        var pts = [];
        for (var i = 0; i < 24; i++) pts.push(190 + Math.sin(i / 3.2) * 60 + (i > 8 && i < 19 ? 90 : 0) + (i % 4) * 9);
        var max = Math.max.apply(null, pts), min = Math.min.apply(null, pts);
        g.strokeStyle = 'rgba(34,224,255,.9)'; g.lineWidth = 1.6; g.beginPath();
        pts.forEach(function (v, i) {
          var x = i / 23 * w, y = hgt - 6 - (v - min) / (max - min) * (hgt - 14);
          i ? g.lineTo(x, y) : g.moveTo(x, y);
        });
        g.stroke();
        g.lineTo(w, hgt); g.lineTo(0, hgt); g.closePath();
        var grd = g.createLinearGradient(0, 0, 0, hgt);
        grd.addColorStop(0, 'rgba(34,224,255,.28)'); grd.addColorStop(1, 'rgba(34,224,255,0)');
        g.fillStyle = grd; g.fill();
      }
      setTimeout(drawSpark, 60);

      /* ---------- 3D 场景（运维总览 · 园区级） ---------- */
      var viewEl = document.getElementById('tsView');
      var hintEl = document.getElementById('tsHint');
      var legendEl = document.getElementById('tsLegend');
      var scene = null;

      var LEGEND = '<i style="background:#2f9bff"></i>蓝光玻璃全息建筑' +
        '<i style="background:#1f9d6a"></i>绿化景观' +
        '<i style="background:#22e0ff"></i>点击建筑查看能源明细';

      function flashGroup(id) {
        var g0 = document.getElementById(id);
        if (!g0) return;
        g0.classList.remove('ts-flash');
        void g0.offsetWidth;
        g0.classList.add('ts-flash');
        setTimeout(function () { g0.classList.remove('ts-flash'); }, 1400);
      }

      /* ---------- 左右面板 ---------- */
      function renderPanels(picked) {
        var leftEl = document.getElementById('tsLeft');
        var rightEl = document.getElementById('tsRight');
        if (picked && picked.b) {
          leftEl.innerHTML =
            grp('gEnergy', '⚡', '智能能源', buildingBody(picked.b, picked.fl || 0)) +
            grp('gEnv', '☁', '环境感知', envBody);
        } else {
          leftEl.innerHTML =
            grp('gEnergy', '⚡', '智能能源', energyBody) +
            grp('gEnv', '☁', '环境感知', envBody);
        }
        rightEl.innerHTML =
          grp('gIot', '⬣', '设备物联', iotBody) +
          grp('gAi', '◉', 'AI运营', aiBody) +
          grp('gVita', '✦', '园区活力', vitaBody);
        setTimeout(drawSpark, 30);
      }

      scene = new JA.TwinCampus(viewEl, {
        onPickBuilding: function (b, fl) {
          flashGroup('gEnergy');
          JA.toast('已选中：' + b.name + (fl ? ' · ' + fl + 'F' : ''), 'success');
          renderPanels({ b: b, fl: fl });
        },
        onPickEmpty: function () {
          renderPanels();
        }
      });
      legendEl.innerHTML = LEGEND;
      hintEl.textContent = '斜45°鸟瞰视角 · 自动环绕 · 拖拽旋转 · 滚轮缩放 · 点击建筑查看能源明细';
      renderPanels();
      requestAnimationFrame(function () { viewEl.style.opacity = '1'; });

      /* ---------- 事件委托：返回全局 / 下钻导航 ---------- */
      screen.addEventListener('click', function (e) {
        var bk = e.target.closest ? e.target.closest('#tsBldBack') : null;
        if (bk) {
          if (scene && scene.selectBuilding) scene.selectBuilding(null);
          renderPanels();
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
   * 页面 3：能耗总览 + 全生命周期碳足迹看板
   * ================================================================ */
  var LCA_PIE_KEYS = ['operation', 'production', 'transport', 'construction', 'demolition'];
  var LCA_PIE_NAMES = { operation: '运营阶段', production: '建材生产', transport: '建材运输', construction: '建造阶段', demolition: '拆除阶段' };
  var LCA_PIE_COLORS = ['#2f7bff', '#ff9d3d', '#21e6a4', '#ffc83d', '#9aa7bd'];
  function lcaPieData() {
    var t = S().lca.totals;
    return LCA_PIE_KEYS.map(function (k, i) {
      return { key: k, name: LCA_PIE_NAMES[k], value: +t[k].toFixed(3), itemStyle: { color: LCA_PIE_COLORS[i] } };
    });
  }
  JA.registerPage({
    id: 'energy', view: 'ops', group: '智能能源管理', name: '能耗总览', icon: 'energy',
    render: function (el) {
      var ctx = pageCtx();
      el.innerHTML = pageHead('能耗动态总览 · 全生命周期碳足迹看板', '能源精细化管理模块 / 智能能源管理 / 能耗总览',
        ENTRY_BTN + '<button class="btn btn-sm" id="btnCarbon">碳排放明细 →</button>');
      var area = S().lca.area;

      var strip = h('div', 'metric-strip mb12');
      el.appendChild(strip);
      var g1 = h('div', 'grid g-2 mb12');
      var pTrend = panel('建筑总能耗与五项分项曲线', '近24小时 kWh（供暖/空调风机/照明/插座设备/电梯）');
      var dTrend = h('div', 'chart'); dTrend.style.height = '270px'; pTrend.bd.appendChild(dTrend);
      var pPie = panel('当日分项能耗占比', 'kWh');
      var dPie = h('div', 'chart'); dPie.style.height = '270px'; pPie.bd.appendChild(dPie);
      g1.appendChild(pTrend.el); g1.appendChild(pPie.el);
      el.appendChild(g1);

      /* 全生命周期碳足迹看板 */
      var gLca = h('div', 'grid g-3 mb12');
      var pLca = panel('全生命周期碳排放占比', '点击扇区跳转分项明细');
      var dLca = h('div', 'chart'); dLca.style.height = '280px'; pLca.bd.appendChild(dLca);
      var lcaSide = h('div', 'lca-side'); pLca.bd.appendChild(lcaSide);
      var pDem = panel('建筑供冷、供暖需求负荷（图5.3）',
        '<span class="chip on" id="demUnit" style="cursor:pointer">单位：kWh/㎡（点击换算总负荷）</span>');
      var dDem = h('div', 'chart'); dDem.style.height = '280px'; pDem.bd.appendChild(dDem);
      var pPa = panel('单位面积碳排放', 'kgCO₂/㎡');
      var dPa = h('div', 'chart'); dPa.style.height = '280px'; pPa.bd.appendChild(dPa);
      gLca.appendChild(pLca.el); gLca.appendChild(pDem.el); gLca.appendChild(pPa.el);
      el.appendChild(gLca);

      var g2 = h('div', 'grid g-21 mb12');
      var pFloor = panel('楼层能耗对比', 'kWh（点击柱子定位楼层3D）');
      var dFloor = h('div', 'chart'); dFloor.style.height = '240px'; pFloor.bd.appendChild(dFloor);
      var pDist = panel('房间能耗热力分布', '异常区域自动定位');
      var heat = h('div'); pDist.bd.appendChild(heat);
      g2.appendChild(pFloor.el); g2.appendChild(pDist.el);
      el.appendChild(g2);

      var pTbl = panel('房间能耗明细台账（含对应碳排放量）', '<button class="btn btn-primary btn-sm" id="btnEntry2">+ 录入能耗数据</button>');
      var tblWrap = h('div', 'tbl-wrap'); pTbl.bd.appendChild(tblWrap);
      el.appendChild(pTbl.el);

      var demUnitArea = true;
      function heatColor(v) {
        if (v >= S().params.energyRed) return 'background:rgba(255,90,43,.22);color:#ff8a66;border-color:rgba(255,90,43,.5)';
        if (v >= S().params.energyOrange) return 'background:rgba(255,200,61,.16);color:#ffd66b;border-color:rgba(255,200,61,.45)';
        if (v >= 30) return 'background:rgba(24,200,184,.12);color:#4fe0d2;border-color:rgba(24,200,184,.35)';
        return 'background:rgba(47,139,255,.12);color:#7fb6ff;border-color:rgba(47,139,255,.35)';
      }
      function renderHeat() {
        var html = '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:7px">';
        S().rooms.forEach(function (r) {
          var alert = JA.Store.roomHasAlert(r);
          html += '<div class="heat-cell" data-id="' + r.id + '" style="padding:9px;border-radius:7px;border:1px solid;cursor:pointer;' + heatColor(r.total) + '">' +
            '<div style="font-size:11px;opacity:.85">' + r.no + ' ' + r.name + '</div>' +
            '<div style="font-size:18px;font-weight:700;font-family:Consolas;margin:2px 0">' + r.total +
            (alert ? '<span class="blink-dot" style="float:right;margin-top:7px"></span>' : '') + '</div>' +
            '<div style="font-size:10px;opacity:.8">插座' + (r.socket || 0) + ' · 空调' + r.hvac + ' · 照明' + r.light + '</div></div>';
        });
        html += '</div>';
        heat.innerHTML = html;
        heat.querySelectorAll('.heat-cell').forEach(function (c) {
          c.onclick = function () {
            var id = c.getAttribute('data-id');
            JA.Store.state.locateRoom = id;
            JA.go('ops', 'twin');
            setTimeout(function () { JA.Store.emit({ type: 'locate', roomId: id }); }, 150);
          };
        });
      }
      function renderLcaSide() {
        var t = S().lca.totals, p = S().lca.pct;
        lcaSide.innerHTML =
          '<div class="lca-card"><div class="fs11 muted">全生命周期总碳排放</div><b class="lca-big">' + t.lifecycle.toLocaleString() + '</b><span>tCO₂</span></div>' +
          '<div class="lca-rows">' +
          LCA_PIE_KEYS.map(function (k) {
            return '<div class="lca-row"><i style="background:' + LCA_PIE_COLORS[LCA_PIE_KEYS.indexOf(k)] + '"></i><span>' + LCA_PIE_NAMES[k] + '</span><b>' + p[k] + '%</b></div>';
          }).join('') +
          '<div class="lca-row sink"><i style="background:#3fbf7f"></i><span>绿化碳汇（单独抵扣）</span><b>- ' + t.sink.toFixed(3) + ' tCO₂</b></div>' +
          '<div class="lca-row"><i style="background:#8fb2e4"></i><span>年碳排放</span><b>' + t.annual + ' tCO₂/a</b></div>' +
          '</div>' +
          '<div class="fs11 muted" style="padding:0 2px">绑定建筑面积 ' + area.toLocaleString() + '㎡，数据修改后占比按公式实时重算</div>';
      }
      function renderStrip() {
        var k = JA.Store.kpis(), s = S();
        var sk = s.series.socket.reduce(function (a, b) { return a + b; }, 0);
        var tot = s.series.total.reduce(function (a, b) { return a + b; }, 0);
        strip.innerHTML = [
          ['今日总能耗', tot + ' kWh', '五分项实时计量', ''],
          ['插座设备占比', Math.round(sk / tot * 100) + '%', '最大用能分项', ''],
          ['运行年碳排放', k.yearCarbon.toLocaleString() + ' tCO₂', '实测核算', ''],
          ['全生命周期总碳', k.lcaCarbon.toLocaleString() + ' tCO₂', '已扣减碳汇', ''],
          ['高能耗房间', S().rooms.filter(function (r) { return r.total >= s.params.energyRed; }).length + ' 间', '自动定位', 'bad'],
          ['单位面积年碳排', S().lca.totals.perAreaAnnual + ' kgCO₂/㎡·a', '面积 ' + area.toLocaleString() + '㎡', '']
        ].map(function (m) {
          return '<div class="metric ' + m[3] + '"><b>' + m[1] + '</b><span>' + m[0] + ' · ' + m[2] + '</span></div>';
        }).join('');
      }
      var trendC = null, pieC = null, floorC = null;
      function charts() {
        var s = S();
        if (!trendC) trendC = Charts.line(dTrend, ctx.bag, {
          x: s.series.labels, top: 30,
          series: [
            { name: '总能耗', data: s.series.total, smooth: true, areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(34,224,255,.3)' }, { offset: 1, color: 'rgba(34,224,255,0)' }]) } },
            { name: '供暖', data: s.series.heating }, { name: '空调风机', data: s.series.hvac },
            { name: '照明', data: s.series.light }, { name: '插座设备', data: s.series.socket },
            { name: '电梯', data: s.series.elevator }
          ]
        });
        else trendC.setOption({ xAxis: { data: s.series.labels },
          series: [{ data: s.series.total }, { data: s.series.heating }, { data: s.series.hvac },
            { data: s.series.light }, { data: s.series.socket }, { data: s.series.elevator }] });
        var he = s.series.heating.reduce(function (a, b) { return a + b; }, 0);
        var hv = s.series.hvac.reduce(function (a, b) { return a + b; }, 0);
        var lt = s.series.light.reduce(function (a, b) { return a + b; }, 0);
        var sk = s.series.socket.reduce(function (a, b) { return a + b; }, 0);
        var ev = s.series.elevator.reduce(function (a, b) { return a + b; }, 0);
        var tot = s.series.total.reduce(function (a, b) { return a + b; }, 0);
        var pieData = [
          { name: '供暖', value: he, itemStyle: { color: '#ff4d6a' } },
          { name: '空调风机', value: hv, itemStyle: { color: '#2f7bff' } },
          { name: '照明', value: lt, itemStyle: { color: '#ffc83d' } },
          { name: '插座设备', value: sk, itemStyle: { color: '#ff7a45' } },
          { name: '电梯', value: ev, itemStyle: { color: '#22e0ff' } },
          { name: '其他', value: Math.max(0, tot - he - hv - lt - sk - ev), itemStyle: { color: '#7c5bff' } }
        ];
        if (!pieC) pieC = Charts.pie(dPie, ctx.bag, { centerText: { v: tot.toLocaleString(), t: 'kWh' }, data: pieData });
        else pieC.setOption({ series: [{ data: pieData }], graphic: [] });
        var sums = [0, 0, 0, 0];
        s.rooms.forEach(function (r) { sums[+r.floor.slice(1) - 1] += r.total; });
        if (!floorC) {
          floorC = Charts.bar(dFloor, ctx.bag, { x: ['1F', '2F', '3F', '4F'], data: sums, label: true, barWidth: 30 });
          floorC.on('click', function (p) {
            var fmap = { 0: 'F1', 1: 'F2', 2: 'F3', 3: 'F4' };
            var first = S().rooms.filter(function (r) { return r.floor === fmap[p.dataIndex]; })[0];
            if (first) { JA.Store.state.locateRoom = first.id; JA.go('ops', 'twin'); setTimeout(function () { JA.Store.emit({ type: 'locate', roomId: first.id }); }, 150); }
          });
        } else floorC.setOption({ series: [{ data: sums }] });
      }
      var lcaC = null, demC = null, paC = null;
      function lcaChart() {
        var t = S().lca.totals;
        var opt = {
          colors: LCA_PIE_COLORS,
          centerText: { v: (S().lca.pct.operation) + '%', t: '运营阶段占比' },
          data: lcaPieData(),
          onSelect: function (key) {
            JA.go('ops', 'carbon');
            setTimeout(function () {
              var anchor = document.querySelector('[data-lca="' + key + '"]');
              if (anchor) anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 220);
          }
        };
        if (!lcaC) lcaC = Charts.pie(dLca, ctx.bag, opt);
        else lcaC.setOption({
          color: LCA_PIE_COLORS,
          series: [{ data: opt.data }],
          graphic: [{ left: '33%', top: '44%', style: { text: opt.centerText.v } },
                    { left: '32%', top: '58%', style: { text: opt.centerText.t } }]
        });
        renderLcaSide();
      }
      function demChart() {
        var rows = S().demand.filter(function (r) { return !r.total; });
        var f = demUnitArea ? 1 : area;
        var unit = demUnitArea ? 'kWh/㎡' : 'kWh';
        var opt = {
          x: rows.map(function (r) { return r.name; }),
          yName: unit, barWidth: 14, top: 36,
          series: [
            { name: '供暖需求', color: '#ff4d6a', data: rows.map(function (r) { return +(r.heat * f).toFixed(1); }) },
            { name: '供冷需求', color: '#2f7bff', data: rows.map(function (r) { return +(r.cool * f).toFixed(1); }) }
          ]
        };
        var tot = S().demand.filter(function (r) { return r.total; })[0];
        if (!demC) demC = Charts.groupedBar(dDem, ctx.bag, opt);
        else demC.setOption({ yAxis: { name: unit }, xAxis: { data: opt.x }, series: opt.series.map(function (s) {
          return { name: s.name, type: 'bar', data: s.data, itemStyle: { color: s.color } };
        }) });
        var exist = pDem.bd.querySelector('.dem-total');
        if (exist) exist.remove();
        var info = h('div', 'dem-total fs11', '合计：供暖需求 <b class="c-red">' + (tot.heat * f).toFixed(1) + '</b> ' + unit +
          ' ｜ 供冷需求 <b class="c-cyan">' + (tot.cool * f).toFixed(1) + '</b> ' + unit +
          '（绑定总面积 ' + area.toLocaleString() + '㎡ 自动换算）');
        info.style.padding = '2px 4px 0';
        pDem.bd.appendChild(info);
      }
      function paChart() {
        var t = S().lca.totals;
        var data = [
          { value: t.perAreaAnnual, itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#22e0ff' }, { offset: 1, color: 'rgba(47,123,255,.2)' }]), borderRadius: [4, 4, 0, 0] } },
          { value: t.perAreaTotal, itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#ff9d3d' }, { offset: 1, color: 'rgba(255,157,61,.2)' }]), borderRadius: [4, 4, 0, 0] } }
        ];
        if (!paC) paC = Charts.bar(dPa, ctx.bag, {
          x: ['单位面积年碳排放', '单位面积累计碳排放'], data: [], barWidth: 40, label: true, top: 30,
          yName: 'kgCO₂/㎡', extraSeries: [{ type: 'bar', barWidth: 40, data: data, label: { show: true, position: 'top', color: '#9fd6ff', fontSize: 11 } }]
        });
        else paC.setOption({ series: [{ data: [] }, { data: data }] });
      }
      function renderTable() {
        var canEdit = JA.perm.energyEdit;
        tblWrap.innerHTML = '<table class="tbl"><thead><tr>' +
          '<th>房间编号</th><th>楼层</th><th>房间名称</th><th>总能耗(kWh)</th><th>供暖</th><th>空调风机</th><th>照明</th><th>插座设备</th><th>电梯</th>' +
          '<th>碳排放(kgCO₂)</th><th>态势等级</th><th>告警</th><th>更新时间</th><th>操作</th></tr></thead><tbody>' +
          S().rooms.map(function (r) {
            var lv = JA.Store.roomLevel(r);
            var has = JA.Store.roomHasAlert(r);
            return '<tr><td class="num">' + r.no + '</td><td>' + r.floor + '</td><td>' + r.name + '</td>' +
              '<td class="num"><b>' + r.total + '</b></td>' +
              '<td class="num">' + (r.heating || 0) + '</td><td class="num">' + r.hvac + '</td><td class="num">' + r.light + '</td>' +
              '<td class="num">' + (r.socket != null ? r.socket : '-') + '</td><td class="num">' + r.elevator + '</td>' +
              '<td class="num c-cyan">' + JA.Store.roomCarbon(r.total) + '</td><td>' + JA.h.lvlTag(lv) + '</td>' +
              '<td>' + (has ? '<span class="tag tag-red"><span class="blink-dot"></span>告警中</span>' : '<span class="tag tag-green">正常</span>') + '</td>' +
              '<td class="fs11 muted">' + r.updatedAt + '</td>' +
              '<td>' + (canEdit
                ? '<button class="btn btn-sm" data-act="entry" data-id="' + r.id + '">录入</button>'
                : '<span class="tag tag-grey">只读</span>') + '</td></tr>';
          }).join('') + '</tbody></table>';
        tblWrap.querySelectorAll('[data-act=entry]').forEach(function (b) {
          b.onclick = function () { JA.openRoomEntry(b.getAttribute('data-id')); };
        });
      }

      renderStrip(); charts(); lcaChart(); demChart(); paChart(); renderHeat(); renderTable();
      document.getElementById('btnEntry2').onclick = function () { JA.openRoomEntry(); };
      document.getElementById('btnQuickEntry').onclick = function () { JA.openRoomEntry(); };
      document.getElementById('btnCarbon').onclick = function () { JA.go('ops', 'carbon'); };
      document.getElementById('demUnit').onclick = function () {
        demUnitArea = !demUnitArea;
        this.textContent = demUnitArea ? '单位：kWh/㎡（点击换算总负荷）' : '单位：kWh 总负荷（点击切回单位面积）';
        demChart();
      };
      ctx.sub(function (evt) {
        renderStrip(); charts();
        if (evt.type === 'lca' || evt.type === 'room-data' || evt.type === 'control') lcaChart();
        if (evt.type === 'lca') paChart();
        renderHeat(); renderTable();
      });
      return ctx.done();
    }
  });

  /* ================================================================
   * 页面 4：全域感知架构
   * ================================================================ */
  JA.registerPage({
    id: 'collect', view: 'ops', group: '智能能源管理', name: '全域感知架构', icon: 'collect',
    render: function (el) {
      var ctx = pageCtx();
      el.innerHTML = pageHead('全域感知架构 · 设备层-间隔层-站控层三层通讯网络架构', '能源精细化管理模块 / 智能能源管理 / 全域感知架构', ENTRY_BTN);

      /* 三层通讯网络架构 */
      var layers = [
        ['设备层', '现场感知与执行', ['智能电表 / 电能质量表', '室内外温湿度传感器', '客流雷达（人员密度）', '光伏组件/汇流箱/BMS', '直流充电桩/空调风机/照明/电梯'], '#22e0ff'],
        ['间隔层', '网络汇聚与规约转换', ['BACnet / Modbus 网关', '直流汇流箱 12 台', '边缘采集终端', '>3σ 本地初筛 / 断点续传'], '#2f7bff'],
        ['站控层', '统一数据中台', ['清洗标准化与归集入库', '设备健康档案存储', '联动图表/3D/AI/告警', '光储充一体化监控系统 1 套'], '#21e6a4']
      ];
      var pLayer = panel('建筑能源管理采集体系 · 三层通讯网络架构');
      var layerGrid = h('div', 'grid g-3');
      layerGrid.style.position = 'relative';
      layerGrid.innerHTML = layers.map(function (s, i) {
        return '<div class="panel arch-card" style="padding:16px;border-top:3px solid ' + s[3] + '">' +
          '<div style="font-size:16px;font-weight:800;color:' + s[3] + '">' + s[0] + '</div>' +
          '<div class="fs11 muted" style="margin:2px 0 10px">' + s[1] + '</div>' +
          s[2].map(function (x) { return '<div class="arch-item">▪ ' + x + '</div>'; }).join('') +
          '</div>' + (i < 2 ? '<div class="arch-arrow">→</div>' : '');
      }).join('');
      pLayer.bd.appendChild(layerGrid);
      el.appendChild(pLayer.el);

      /* 4 类核心用能要素 */
      var elems = [
        ['环境类', ['室内温度', '室外温度', '相对湿度'], '#22e0ff'],
        ['设备运行类', ['光伏组件 / 逆变器', '直流汇流箱 / 直流充电桩', '空调风机 / 照明 / 电梯'], '#2f7bff'],
        ['电能质量类', ['电压 / 电流', '实时功率', '累计耗电量'], '#7c5bff'],
        ['人员活动类', ['人员密度', '联动照明负荷', '联动空调负荷'], '#21e6a4']
      ];
      var pElem = panel('四类核心用能采集要素');
      var elemGrid = h('div', 'grid g-4');
      elemGrid.innerHTML = elems.map(function (s) {
        return '<div class="panel" style="padding:14px"><div class="elem-dot" style="background:' + s[2] + '"></div>' +
          '<b style="color:#dff1ff">' + s[0] + '</b>' +
          s[1].map(function (x) { return '<div class="fs11 muted" style="margin-top:6px;line-height:1.6">' + x + '</div>'; }).join('') +
          '</div>';
      }).join('');
      pElem.bd.appendChild(elemGrid);
      el.appendChild(pElem.el);

      var strip = h('div', 'metric-strip mb12'); el.appendChild(strip);

      /* 光储真实设备台账 */
      var pLedger = panel('装配式光储一体化充电站真实设备台账', '实测工程配置');
      var lw = h('div', 'tbl-wrap'); pLedger.bd.appendChild(lw);
      el.appendChild(pLedger.el);

      /* 数据处理流水线 + 明细 */
      var steps = [
        ['01', '数据采集时间戳', '全部采样点统一授时，毫秒级时间戳', '#22e0ff'],
        ['02', '传感器原始值', '电表/温湿度/雷达/BMS原始报文留存', '#2f7bff'],
        ['03', '清洗后标准化', '单位归一、量程校验、3σ去噪、缺失插补', '#7c5bff'],
        ['04', '异常/跳变/缺失剔除', '剔除记录全程留痕，标记重传', '#ff9d3d'],
        ['05', '数据归集状态', '写入统一数据中台，归集率99.98%', '#21e6a4'],
        ['06', '设备健康档案存储', '光伏/储能/空调等全寿命健康档案', '#3fbf7f']
      ];
      var pipe = h('div', 'grid g-3 mb12');
      pipe.innerHTML = steps.map(function (s) {
        return '<div class="panel" style="padding:14px"><div style="font-size:20px;font-weight:800;color:' + s[2] + ';opacity:.9">' + s[0] + '</div>' +
          '<div style="font-size:13px;font-weight:700;margin:4px 0;color:#dff1ff">' + s[1] + '</div>' +
          '<div class="fs11 muted" style="line-height:1.7">' + s[2] + '</div></div>';
      }).join('');
      el.appendChild(pipe);

      var pTbl = panel('采集数据处理明细（时间戳 / 传感器原值 / 标准化数据 / 异常剔除留痕 / 归集状态）', '实时刷新');
      var tw = h('div', 'tbl-wrap'); pTbl.bd.appendChild(tw); el.appendChild(pTbl.el);

      function renderStrip() {
        var c = S().cleaning;
        var removed = c.filter(function (x) { return x.note.indexOf('剔除') >= 0; }).length;
        strip.innerHTML = [
          ['采集点位', '128 个', '环境/设备/电能质量/人员'],
          ['今日处理条数', (c.length + 2846) + ' 条', '实时流'],
          ['异常/跳变/缺失', removed + ' 条', '已剔除插补留痕', 'warn'],
          ['数据归集率', '99.98 %', '写入中台', 'good'],
          ['设备健康档案', '一设备一档案', '全寿命周期']
        ].map(function (m) {
          return '<div class="metric ' + (m[3] || '') + '"><b>' + m[1] + '</b><span>' + m[0] + ' · ' + m[2] + '</span></div>';
        }).join('');
      }
      function renderLedger() {
        lw.innerHTML = '<table class="tbl"><thead><tr><th>设备编号</th><th>设备名称</th><th>规格参数</th><th>数量</th><th>单位</th><th>运行状态</th><th>健康度</th></tr></thead><tbody>' +
          S().pvDevices.map(function (d) {
            return '<tr><td class="num">' + d.id + '</td><td><b>' + d.name + '</b></td><td class="fs11">' + d.spec + '</td>' +
              '<td class="num"><b>' + d.qty + '</b></td><td>' + d.unit + '</td>' +
              '<td><span class="tag tag-green">' + (d.status === 'running' ? '运行中' : d.status) + '</span></td>' +
              '<td><div class="bar-mini"><i style="width:' + d.health + '%;background:' + (d.health >= 95 ? '#21e6a4' : '#ffc83d') + '"></i></div><span class="fs11 muted">' + d.health + '%</span></td></tr>';
          }).join('') + '</tbody></table>';
      }
      function renderTable() {
        tw.innerHTML = '<table class="tbl"><thead><tr><th>记录号</th><th>采集时间戳</th><th>数据源</th><th>监测指标</th>' +
          '<th>传感器原始值</th><th>清洗后标准化数据</th><th>异常值/跳变值/缺失值剔除记录</th><th>数据归集状态</th></tr></thead><tbody>' +
          S().cleaning.map(function (r) {
            var bad = r.note.indexOf('剔除') >= 0 || r.note.indexOf('插补') >= 0;
            return '<tr><td class="num">' + r.id + '</td><td class="fs11">' + r.time + '</td><td>' + r.source + '</td><td>' + r.metric + '</td>' +
              '<td class="num ' + (bad ? 'c-red' : '') + '">' + (r.raw == null ? 'NULL(缺失)' : r.raw) + '</td><td class="num c-cyan">' + r.cleaned + '</td>' +
              '<td class="fs11" style="max-width:340px">' + r.note + '</td>' +
              '<td><span class="tag ' + (bad ? 'tag-yellow' : 'tag-green') + '">' + r.status + '</span></td></tr>';
          }).join('') + '</tbody></table>';
      }
      renderStrip(); renderLedger(); renderTable();
      document.getElementById('btnQuickEntry').onclick = function () { JA.openRoomEntry(); };
      ctx.sub(function () { renderStrip(); renderLedger(); renderTable(); });
      return ctx.done();
    }
  });

  /* ================================================================
   * 页面 5：环境与人员密度监测
   * ================================================================ */
  JA.registerPage({
    id: 'environment', view: 'ops', group: '智能能源管理', name: '环境与人员检测', icon: 'env',
    render: function (el) {
      var ctx = pageCtx();
      el.innerHTML = pageHead('环境温湿度 · 人员密度监测', '能源精细化管理模块 / 智能能源管理 / 环境与人员检测', ENTRY_BTN);
      var strip = h('div', 'metric-strip mb12'); el.appendChild(strip);
      var g = h('div', 'grid g-2 mb12');
      var pT = panel('各房间温度分布', '℃（红色≥28℃）');
      var dT = h('div', 'chart'); dT.style.height = '260px'; pT.bd.appendChild(dT);
      var pH = panel('各房间湿度 / 人员密度', '综合');
      var dH = h('div', 'chart'); dH.style.height = '260px'; pH.bd.appendChild(dH);
      g.appendChild(pT.el); g.appendChild(pH.el); el.appendChild(g);
      var pTbl = panel('房间环境与人员密度台账', '人工录入实时联动');
      var tw = h('div', 'tbl-wrap'); pTbl.bd.appendChild(tw); el.appendChild(pTbl.el);

      function charts() {
        var rs = S().rooms;
        var names = rs.map(function (r) { return r.no; });
        ChartsInit(dT, { x: names, data: rs.map(function (r) {
          return { value: r.temp, itemStyle: { color: r.temp >= 28 ? '#ff4d6a' : (r.temp <= 23 ? '#7c5bff' : '#21e6a4'), borderRadius: [4, 4, 0, 0] } };
        }) }, '℃');
        ChartsInitH(dH, names, rs.map(function (r) { return r.humidity; }), rs.map(function (r) { return r.occupancy; }));
      }
      var tChart = null, hChart = null;
      function ChartsInit(dom, opt, unit) {
        if (!tChart || tChart.isDisposed()) tChart = Charts.bar(dom, ctx.bag, { x: opt.x, data: opt.data, barWidth: 14 });
        else tChart.setOption({ xAxis: { data: opt.x }, series: [{ data: opt.data }] });
      }
      function ChartsInitH(dom, names, hum, occ) {
        if (!hChart) hChart = Charts.line(dom, ctx.bag, {
          x: names, top: 30,
          series: [
            { name: '湿度%', data: hum, lineStyle: { width: 2, color: '#22e0ff' } },
            { name: '人员密度(人)', data: occ, lineStyle: { width: 2, color: '#ffc83d' } }
          ]
        });
        else hChart.setOption({ xAxis: { data: names }, series: [{ data: hum }, { data: occ }] });
      }
      function renderStrip() {
        var k = JA.Store.kpis();
        var avgH = (S().rooms.reduce(function (a, r) { return a + r.humidity; }, 0) / S().rooms.length).toFixed(0);
        strip.innerHTML = [
          ['平均温度', k.avgTemp + ' ℃', '舒适区间 24–27'],
          ['平均湿度', avgH + ' %', '舒适区间 40–65'],
          ['在场总人数', k.occupancy + ' 人', '实时计数'],
          ['热舒适达标率', '94.2 %', 'PMV模型', 'good'],
          ['过热点位', S().rooms.filter(function (r) { return r.temp >= 28; }).length + ' 处', '≥28℃', 'warn']
        ].map(function (m) {
          return '<div class="metric ' + (m[3] || '') + '"><b>' + m[1] + '</b><span>' + m[0] + ' · ' + m[2] + '</span></div>';
        }).join('');
      }
      function renderTable() {
        var canEdit = JA.perm.energyEdit;
        tw.innerHTML = '<table class="tbl"><thead><tr><th>房间</th><th>名称</th><th>温度℃</th><th>湿度%</th><th>人员密度</th>' +
          '<th>舒适度</th><th>更新时间</th><th>操作</th></tr></thead><tbody>' +
          S().rooms.map(function (r) {
            var comfort = r.temp >= 24 && r.temp <= 27 && r.humidity >= 40 && r.humidity <= 65;
            return '<tr><td class="num">' + r.no + '</td><td>' + r.name + '</td><td class="num ' + (r.temp >= 28 ? 'c-red' : '') + '">' + r.temp + '</td>' +
              '<td class="num">' + r.humidity + '</td><td class="num">' + r.occupancy + ' 人</td>' +
              '<td>' + (comfort ? '<span class="tag tag-green">舒适</span>' : '<span class="tag tag-yellow">偏离</span>') + '</td>' +
              '<td class="fs11 muted">' + r.updatedAt + '</td>' +
              '<td>' + (canEdit ? '<button class="btn btn-sm" data-id="' + r.id + '">录入</button>' : '<span class="tag tag-grey">只读</span>') + '</td></tr>';
          }).join('') + '</tbody></table>';
        tw.querySelectorAll('button[data-id]').forEach(function (b) {
          b.onclick = function () { JA.openRoomEntry(b.getAttribute('data-id')); };
        });
      }
      renderStrip(); charts(); renderTable();
      document.getElementById('btnQuickEntry').onclick = function () { JA.openRoomEntry(); };
      ctx.sub(function () { renderStrip(); charts(); renderTable(); });
      return ctx.done();
    }
  });

  /* ================================================================
   * 页面 6：设备运行状态
   * ================================================================ */
  JA.registerPage({
    id: 'equipment', view: 'ops', group: '智能能源管理', name: '设备状态', icon: 'device',
    render: function (el) {
      var ctx = pageCtx();
      el.innerHTML = pageHead('设备运行状态 · 启停联动3D', '能源精细化管理模块 / 智能能源管理 / 设备状态', ENTRY_BTN);
      var strip = h('div', 'metric-strip mb12'); el.appendChild(strip);
      var filterBar = h('div', 'tabs mb12');
      filterBar.innerHTML = '<div class="tab on" data-f="all">全部</div><div class="tab" data-f="running">运行中</div>' +
        '<div class="tab" data-f="stopped">已停机</div><div class="tab" data-f="fault">故障</div>';
      el.appendChild(filterBar);
      var grid = h('div', 'grid g-4'); el.appendChild(grid);
      var filter = 'all';

      function renderStrip() {
        var d = S().devices;
        var nRun = d.filter(function (x) { return x.status === 'running'; }).length;
        var nWait = d.filter(function (x) { return x.status === 'stopped'; }).length;
        var nFault = d.filter(function (x) { return x.status === 'fault'; }).length;
        var rate = ((nRun + nWait) / d.length * 100).toFixed(1) + ' %';
        strip.innerHTML = [
          ['设备总数', d.length + ' 台', '冷热源/空调通风/电梯/光储/给排水'],
          ['运行中', nRun + ' 台', '', 'good'],
          ['待机', nWait + ' 台', ''],
          ['停机检修', '0 台', ''],
          ['故障', nFault + ' 台', '点击卡片可模拟修复', 'bad'],
          ['设备在线率', rate, '', 'good'],
          ['设备完好率', rate, '', 'good']
        ].map(function (m) {
          return '<div class="metric ' + (m[3] || '') + '"><b>' + m[1] + '</b><span>' + m[0] + (m[2] ? ' · ' + m[2] : '') + '</span></div>';
        }).join('');
      }
      function renderGrid() {
        var canEdit = JA.perm.energyEdit;
        var list = S().devices.filter(function (d) { return filter === 'all' || d.status === filter; });
        grid.innerHTML = list.map(function (d) {
          return '<div class="dev-card ' + d.status + '"><div class="dv-hd">' +
            '<span class="dv-dot ' + d.status + '"></span><span class="dv-name">' + d.name + '</span>' +
            '<span class="tag tag-blue">' + d.type + '</span></div>' +
            '<div class="dv-meta">编号 <b>' + d.id + '</b><br>位置 <b>' + d.roomName + '</b><br>功率 <b>' + d.power + ' kW</b> · 模式 <b>' + d.mode + '</b></div>' +
            (canEdit ? '<div class="flex gap8"><button class="btn btn-sm fw" data-act="toggle" data-id="' + d.id + '">' +
              (d.status === 'running' ? '模拟停机' : (d.status === 'fault' ? '模拟修复' : '模拟启动')) + '</button>' +
              (d.type === '空调' ? '<button class="btn btn-sm" data-act="mode" data-id="' + d.id + '">切模式</button>' : '') +
              '</div>' : '<span class="lock-tip">当前角色设备只读</span>') +
            '</div>';
        }).join('');
        grid.querySelectorAll('[data-act=toggle]').forEach(function (b) {
          b.onclick = function () {
            var id = b.getAttribute('data-id');
            JA.Store.toggleDevice(id);
            var dv = S().devices.filter(function (x) { return x.id === id; })[0];
            JA.toast(dv.name + ' 已切换为：' + (dv.status === 'running' ? '运行' : dv.status === 'fault' ? '故障' : '停机') + '，3D模型已联动', dv.status === 'fault' ? 'error' : 'success');
          };
        });
        grid.querySelectorAll('[data-act=mode]').forEach(function (b) {
          b.onclick = function () {
            var id = b.getAttribute('data-id');
            var dv = S().devices.filter(function (x) { return x.id === id; })[0];
            var modes = ['制冷', '送风', '节能'];
            dv.mode = modes[(modes.indexOf(dv.mode) + 1) % modes.length];
            JA.Store.setDeviceMode(id, dv.mode);
            JA.toast(dv.name + ' 运行模式切换为：' + dv.mode, 'success');
          };
        });
      }
      renderStrip(); renderGrid();
      document.getElementById('btnQuickEntry').onclick = function () { JA.openRoomEntry(); };
      filterBar.querySelectorAll('.tab').forEach(function (t) {
        t.onclick = function () {
          filterBar.querySelectorAll('.tab').forEach(function (x) { x.classList.remove('on'); });
          t.classList.add('on'); filter = t.getAttribute('data-f'); renderGrid();
        };
      });
      ctx.sub(function () { renderStrip(); renderGrid(); });
      return ctx.done();
    }
  });

  /* ================================================================
   * 页面 7：AI 负荷预测
   * ================================================================ */
  JA.registerPage({
    id: 'ai', view: 'ops', group: 'AI智能中心', name: 'AI负荷预测', icon: 'ai',
    render: function (el) {
      var ctx = pageCtx();
      el.innerHTML = pageHead('AI 建筑负荷预测 · 工况交互重算', '能源精细化管理模块 / AI智能中心 / 负荷预测', ENTRY_BTN);

      var strip = h('div', 'metric-strip mb12'); el.appendChild(strip);

      /* 建筑温控设备月负荷（图5.2）—— AI预测历史基准底图 */
      var pMonth = panel('建筑温控设备月负荷（图5.2）· AI预测历史基准底图', '尖峰负荷 MW · 1月热负荷峰值 / 7月冷负荷峰值');
      var dMonth = h('div', 'chart'); dMonth.style.height = '300px'; pMonth.bd.appendChild(dMonth);
      var monthTip = h('div', 'fs11 muted', '训练集真实数据：温控设备1-12月月负荷、供冷/供暖分项（围护传热/室内得热/窗日射/新风渗透/热回收）、光伏25年发电量衰减。手动调整工况后白色预测曲线自动叠加对比。');
      monthTip.style.padding = '0 4px';
      pMonth.bd.appendChild(monthTip);
      el.appendChild(pMonth.el);

      var layout = h('div', 'grid g-31 mb12');
      var pChart = panel('历史实际负荷 + 未来24h预测（置信区间 ±8%）', 'LSTM-Attention 混合模型');
      var dChart = h('div', 'chart'); dChart.style.height = '440px'; pChart.bd.appendChild(dChart);
      var pSet = panel('工况调整 · 手动推演');
      layout.appendChild(pChart.el); layout.appendChild(pSet.el);
      el.appendChild(layout);

      /* 光伏充电站 25 年发电量衰减场景 */
      var gPv = h('div', 'grid g-2 mb12');
      var pPvChart = panel('光伏充电站25年发电量衰减曲线（年衰减0.8%）', '首年 ' + S().pv.year1Gen.toLocaleString() + ' kWh · BIPV覆盖率30%');
      var dPv = h('div', 'chart'); dPv.style.height = '260px'; pPvChart.bd.appendChild(dPv);
      var pPvTbl = panel('光伏25年发电量与减碳量（关键年份）', '25年全周期实测衰减模型');
      var pvTw = h('div', 'tbl-wrap'); pPvTbl.bd.appendChild(pvTw);
      gPv.appendChild(pPvChart.el); gPv.appendChild(pPvTbl.el);
      el.appendChild(gPv);

      pSet.bd.innerHTML =
        '<div class="slider-row"><label>人员密度</label><input type="range" id="scOcc" min="0" max="80" step="1"><span class="val" id="scOccV"></span></div>' +
        '<div class="slider-row"><label>环境温度</label><input type="range" id="scTemp" min="18" max="32" step="0.5"><span class="val" id="scTempV"></span></div>' +
        '<div class="slider-row"><label>相对湿度</label><input type="range" id="scHum" min="30" max="85" step="1"><span class="val" id="scHumV"></span></div>' +
        '<div class="slider-row"><label>设备投运率</label><input type="range" id="scRun" min="50" max="120" step="5"><span class="val" id="scRunV"></span></div>' +
        '<div class="form-item mb12"><label>典型场景一键载入</label><select class="sel" id="scPreset">' +
          '<option value="">自定义工况</option><option value="workday">工作日满员</option>' +
          '<option value="weekend">周末低载</option><option value="heat">持续高温</option>' +
          '<option value="inspect">迎检加班</option></select></div>' +
        '<button class="btn btn-primary" id="scApply" style="width:100%;justify-content:center">提交新工况 · AI重新预测</button>' +
        '<div class="opplan mt12"><h5>推演结果</h5><p>综合工况系数：<b id="scFactor">1.000</b><br>' +
        '预测明日峰值：<b id="scPeak">-</b> kW　谷值：<b id="scValley">-</b> kW<br>' +
        '<span class="muted">提交后曲线、峰值与3D能耗态势同步刷新</span></p></div>';

      var pModel = panel('模型评估指标（滚动回测）');
      pModel.bd.innerHTML =
        '<div class="grid g-3" style="gap:8px">' +
        '<div class="metric good"><b>93.6%</b><span>预测准确率<br>达标线≥92%</span></div>' +
        '<div class="metric"><b>4.2 kW</b><span>MAE<br>平均绝对误差</span></div>' +
        '<div class="metric"><b>5.8 kW</b><span>RMSE<br>均方根误差</span></div></div>' +
        '<div class="fs11 muted mt12" style="line-height:1.8">训练集全部采用真实实验数据：建筑温控设备1-12月真实月负荷数据、供冷/供暖分项负荷真实值（围护传热、室内得热、窗日射、新风渗透、热回收）、光伏充电站25年发电量衰减真实数据；并融合气象预报温湿度、人员密度、设备投运状态；每小时滚动更新，支持用户工况注入在线推演。<b style="color:#21e6a4">建筑能耗预测准确率 ≥92%</b>。</div>';
      el.appendChild(pModel.el);

      var fcChart = null;
      function renderChart() {
        var p = S().prediction;
        if (!fcChart) fcChart = Charts.forecast(dChart, ctx.bag, p.histLabels, p.history, p.futureLabels, p.future, p.band);
        else fcChart.setOption({
          xAxis: { data: p.histLabels.concat(p.futureLabels) },
          series: [{}, { data: p.history }, { data: p.future }]
        });
      }
      /* 月负荷底图：4序列固定配色（热负荷红/热回收热绿/冷负荷蓝/热回收冷黄）+ AI预测叠加白线 */
      var monthC = null;
      function monthOverlay() {
        var ml = S().monthLoad, factor = S().prediction.lastFactor || 1;
        // 新工况预测月度尖峰 = 当月四序列合计 × 综合工况系数
        return ml.labels.map(function (_, m) {
          var base = ml.series.reduce(function (a, sr) { return a + sr.data[m]; }, 0);
          return +(base * factor).toFixed(2);
        });
      }
      function renderMonth() {
        var ml = S().monthLoad;
        var opt = {
          x: ml.labels, yName: 'MW', top: 34, barWidth: 9,
          series: ml.series.map(function (sr) { return { name: sr.name, color: sr.color, data: sr.data }; }),
          overlay: { name: 'AI预测尖峰负荷(新工况)', color: '#ffffff', data: monthOverlay() }
        };
        if (!monthC) monthC = Charts.groupedBar(dMonth, ctx.bag, opt);
        else monthC.setOption({
          xAxis: { data: opt.x },
          series: opt.series.map(function (s) { return { name: s.name, type: 'bar', data: s.data, itemStyle: { color: s.color } }; })
            .concat([{ name: opt.overlay.name, type: 'line', smooth: true, data: opt.overlay.data,
              lineStyle: { width: 2.6, color: '#fff' }, itemStyle: { color: '#fff' }, symbolSize: 5 }])
        });
      }
      var pvC = null;
      function renderPv() {
        var ys = S().pv.years;
        if (!pvC) pvC = Charts.line(dPv, ctx.bag, {
          x: ys.map(function (y) { return '第' + y.year + '年'; }), top: 28,
          colors: ['#ffc83d', '#21e6a4'],
          series: [
            { name: '年发电量(kWh)', data: ys.map(function (y) { return y.gen; }), smooth: true, showSymbol: false,
              lineStyle: { width: 2.4, color: '#ffc83d' },
              areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(255,200,61,.3)' }, { offset: 1, color: 'rgba(255,200,61,0)' }]) } },
            { name: '年减碳量(kgCO₂)', data: ys.map(function (y) { return y.carbon; }), smooth: true, showSymbol: false,
              lineStyle: { width: 2, color: '#21e6a4' } }
          ]
        });
        else pvC.setOption({ xAxis: { data: ys.map(function (y) { return '第' + y.year + '年'; }) },
          series: [{ data: ys.map(function (y) { return y.gen; }) }, { data: ys.map(function (y) { return y.carbon; }) }] });
        var pick = [1, 5, 10, 15, 20, 25];
        pvTw.innerHTML = '<table class="tbl"><thead><tr><th>运行年份</th><th>效率保持率</th><th>年发电量(kWh)</th><th>累计发电量(kWh)</th><th>年减碳量(kgCO₂)</th></tr></thead><tbody>' +
          pick.map(function (yy) {
            var y = ys[yy - 1];
            return '<tr><td class="num">第' + y.year + '年</td><td class="num">' + y.rate + '%</td>' +
              '<td class="num">' + y.gen.toLocaleString() + '</td><td class="num"><b>' + y.cum.toLocaleString() + '</b></td>' +
              '<td class="num c-green">' + y.carbon.toLocaleString() + '</td></tr>';
          }).join('') + '</tbody></table>';
      }
      function renderStrip() {
        var p = S().prediction, k = JA.Store.kpis();
        strip.innerHTML = [
          ['预测准确率', k.accuracy + ' %', '指标要求 ≥92%', 'good'],
          ['下小时预测', k.forecast + ' kW', 'AI实时输出'],
          ['今日实际峰值', Math.max.apply(null, S().series.total) + ' kW', ''],
          ['明日预测峰谷差', (Math.max.apply(null, p.future) - Math.min.apply(null, p.future)) + ' kW', '用于削峰'],
          ['系统综合节能效率', '10%-40 %', '建筑侧+光储侧综合调控', 'good']
        ].map(function (m) {
          return '<div class="metric ' + (m[3] || '') + '"><b>' + m[1] + '</b><span>' + m[0] + ' · ' + m[2] + '</span></div>';
        }).join('');
      }
      function syncSliders() {
        var sc = S().prediction.scenario;
        scOcc.value = sc.occ; scTemp.value = sc.temp; scHum.value = sc.hum; scRun.value = Math.round(sc.runRate * 100);
        scOccV.textContent = sc.occ + ' 人'; scTempV.textContent = sc.temp + '℃';
        scHumV.textContent = sc.hum + '%'; scRunV.textContent = Math.round(sc.runRate * 100) + '%';
      }
      function bindSliders() {
        scOcc.oninput = function () { scOccV.textContent = scOcc.value + ' 人'; };
        scTemp.oninput = function () { scTempV.textContent = scTemp.value + '℃'; };
        scHum.oninput = function () { scHumV.textContent = scHum.value + '%'; };
        scRun.oninput = function () { scRunV.textContent = scRun.value + '%'; };
        scPreset.onchange = function () {
          var presets = {
            workday: { occ: 55, temp: 27, hum: 58, runRate: 1.05 },
            weekend: { occ: 6, temp: 24, hum: 52, runRate: 0.6 },
            heat: { occ: 40, temp: 31, hum: 70, runRate: 1.15 },
            inspect: { occ: 70, temp: 25, hum: 55, runRate: 1.1 }
          };
          var v = presets[this.value];
          if (v) {
            scOcc.value = v.occ; scTemp.value = v.temp; scHum.value = v.hum; scRun.value = Math.round(v.runRate * 100);
            scOccV.textContent = v.occ + ' 人'; scTempV.textContent = v.temp + '℃';
            scHumV.textContent = v.hum + '%'; scRunV.textContent = Math.round(v.runRate * 100) + '%';
          }
        };
        document.getElementById('scApply').onclick = function () {
          var fc = JA.Store.setScenario({
            occ: +scOcc.value, temp: +scTemp.value, hum: +scHum.value, runRate: +scRun.value / 100
          });
          scFactor.textContent = fc.factor;
          scPeak.textContent = Math.max.apply(null, fc.future);
          scValley.textContent = Math.min.apply(null, fc.future);
          renderChart(); renderStrip(); renderMonth();
          JA.toast('新工况已注入AI模型，预测曲线与月负荷叠加曲线已重算（置信带同步更新）', 'success');
        };
      }
      renderStrip(); renderChart(); renderMonth(); renderPv(); syncSliders(); bindSliders();
      var p0 = S().prediction;
      scFactor.textContent = '1.000';
      scPeak.textContent = Math.max.apply(null, p0.future);
      scValley.textContent = Math.min.apply(null, p0.future);
      document.getElementById('btnQuickEntry').onclick = function () { JA.openRoomEntry(); };
      ctx.sub(function (evt) {
        renderChart(); renderStrip();
        if (evt.type === 'scenario' || evt.type === 'room-data' || evt.type === 'control') renderMonth();
      });
      return ctx.done();
    }
  });

  /* ================================================================
   * 页面 8：节能调控模拟
   * ================================================================ */
  JA.registerPage({
    id: 'control', view: 'ops', group: 'AI智能中心', name: '节能调控模拟', icon: 'control',
    render: function (el) {
      var ctx = pageCtx();
      el.innerHTML = pageHead('节能调控模拟 · 建筑侧四维减碳 + 光储侧调控（真实工程方案）', '能源精细化管理模块 / AI智能中心 / 节能调控');
      var strip = h('div', 'metric-strip mb12'); el.appendChild(strip);

      /* ① 建筑侧四维减碳策略 */
      var buildStrategies = [
        { key: 'envelope', dim: '被动式节能', title: '高性能围护结构', desc: '断桥铝型材 + Low-E 玻璃，高性能保温，从源头降低冷热负荷', rate: '冷热负荷↓约10%' },
        { key: 'chiller', dim: '设备系统升级', title: '磁悬浮冷水机组', desc: 'COP ≥ 6.5，较传统机组（COP ≤ 4.2）节能 35%-40%', rate: '机组节能35%-40%' },
        { key: 'gshp', dim: '设备系统升级', title: '地源热泵系统', desc: '冬季 COP 4.0、夏季 EER 5.2，年节能 47.3 tCO₂', rate: '年省47.3 tCO₂' },
        { key: 'led', dim: '设备系统升级', title: '光感+人体感应LED', desc: '智能照明系统按需调光，较传统照明降低 40% 能耗', rate: '照明能耗↓40%' },
        { key: 'bipv', dim: '可再生能源替代', title: '屋顶 BIPV 光伏', desc: '覆盖率 30%，年发电量 120 kWh/㎡，绿电就地替代', rate: '120 kWh/㎡·年' },
        { key: 'heatRec', dim: '可再生能源替代', title: '空调冷凝热回收', desc: '回收冷凝热用于生活热水，节能率 15%', rate: '热水节能15%' },
        { key: 'digital', dim: '数字化管理', title: '分楼层能耗排名激励', desc: '用能定额+排名公示激励机制，实现节能 10%-15%', rate: '行为节能10%-15%' }
      ];
      var pBuild = panel('① 建筑侧 · 四维减碳策略', '被动式节能 / 设备系统升级 / 可再生能源替代 / 数字化管理');
      var buildGrid = h('div', 'grid g-3');
      buildGrid.innerHTML = buildStrategies.map(function (s) {
        var on = S().control.strategies[s.key];
        return '<div class="strat-card ' + (on ? 'on' : '') + '" data-key="' + s.key + '">' +
          '<div class="sc-top"><span class="tag tag-blue">' + s.dim + '</span>' +
          '<span class="sc-switch' + (on ? ' on' : '') + '"></span></div>' +
          '<h4>' + s.title + '</h4><p>' + s.desc + '</p><div class="sc-rate">' + s.rate + '</div></div>';
      }).join('');
      pBuild.bd.appendChild(buildGrid);
      el.appendChild(pBuild.el);

      /* ② 光储侧调控策略 */
      var pvStrategies = [
        { key: 'tracker', title: '太阳能追光系统', desc: '视日运动轨迹追踪：天文算法实时计算太阳高度角与方位角，驱动电机闭环跟踪，不受天气影响' },
        { key: 'selfUse', title: '自发自用', desc: '白天光伏发电优先供本地负荷，高峰电价时段储能放电，余电不上网' },
        { key: 'nightCharge', title: '低谷充电', desc: S().pv.nightCharge },
        { key: 'peakShave', title: 'PCS 削峰填谷', desc: '240kW/500kWh 储能 PCS 双向调节，调峰+调频，“低价储存、高价使用”，降低充电成本、削减高峰负荷' }
      ];
      var pPv = panel('② 光储侧 · 追光 / 储能 / 自发自用 / 低谷充电 / 削峰填谷', '储能 240kW / 500kWh');
      var pvGrid = h('div', 'grid g-4');
      pvGrid.innerHTML = pvStrategies.map(function (s) {
        var on = S().control.pv[s.key];
        return '<div class="strat-card ' + (on ? 'on' : '') + '" data-pvkey="' + s.key + '">' +
          '<div class="sc-top"><span class="tag tag-green">光储策略</span><span class="sc-switch' + (on ? ' on' : '') + '"></span></div>' +
          '<h4>' + s.title + '</h4><p>' + s.desc + '</p></div>';
      }).join('');
      pPv.bd.appendChild(pvGrid);
      var pvInfo = h('div', 'pv-info fs11');
      pPv.bd.appendChild(pvInfo);
      el.appendChild(pPv.el);

      /* 下发与效果 */
      var layout = h('div', 'grid g-12 mb12');
      var pSet = panel('策略下发');
      pSet.bd.innerHTML =
        '<div class="slider-row"><label>空调全局设定</label><input type="range" id="ctTemp" min="24" max="28" step="0.5" value="26"><span class="val" id="ctTempV">26℃</span></div>' +
        '<div class="slider-row"><label>照明调光比例</label><input type="range" id="ctLight" min="40" max="100" step="5" value="80"><span class="val" id="ctLightV">80%</span></div>' +
        '<div class="form-item mb12"><label>储能运行方式</label><select class="sel" id="ctBat"><option value="discharge">高峰放电（削峰填谷）</option><option value="charge">低谷充电（300kW）</option><option value="standby">待机热备（调频）</option></select></div>' +
        '<div class="flex gap8"><button class="btn btn-primary fw" id="ctApply" style="justify-content:center">模拟下发调控</button>' +
        '<button class="btn" id="ctReset">恢复默认</button></div>' +
        '<div class="opplan mt12"><h5>联动说明</h5><p>策略下发后各房间供暖/空调风机/照明/插座/电梯分项重算，<b>3D模型能耗态势、趋势曲线、AI预测、告警规则实时联动</b>；储能电池SOC与充放电状态同步刷新。</p></div>';
      var pEff = panel('调控效果评估 · 系统综合节能效率 10%-40%');
      var dGauge = h('div', 'chart'); dGauge.style.height = '210px'; pEff.bd.appendChild(dGauge);
      var effBox = h('div'); pEff.bd.appendChild(effBox);
      layout.appendChild(pSet.el); layout.appendChild(pEff.el);
      el.appendChild(layout);

      var gaugeC = null;
      function renderGauge(rate) {
        if (!gaugeC) gaugeC = Charts.gauge(dGauge, ctx.bag, Math.round(rate * 100), '综合节能率', { max: 40, warnAt: .25, alarmAt: .5, unit: '%', fmt: '{value}%' });
        else gaugeC.setOption({ series: [{ data: [{ value: Math.round(rate * 100), name: '综合节能率' }] }] });
      }
      function renderEff(cut, saved) {
        var rate = cut || S().control.cutRate || 0;
        var ok = rate >= .10;
        effBox.innerHTML = '<div class="grid g-3" style="gap:8px;margin-top:4px">' +
          '<div class="metric ' + (ok ? 'good' : 'warn') + '"><b>' + (rate * 100).toFixed(1) + '%</b><span>综合节能率<br>工程区间10%-40%</span></div>' +
          '<div class="metric"><b>' + (saved != null ? saved : '--') + '</b><span>即时模拟节约<br>kWh/周期</span></div>' +
          '<div class="metric good"><b>' + (S().control.savedCarbon || 0).toFixed(2) + '</b><span>对应减排<br>tCO₂（0.8843因子）</span></div></div>';
        renderGauge(rate);
      }
      function renderPvInfo() {
        var b = S().battery, pv = S().pv;
        pvInfo.innerHTML = '<div class="pv-info-grid">' +
          '<span>储能容量：<b>' + pv.storageKW + 'kW / ' + pv.storageKWh + 'kWh</b></span>' +
          '<span>光伏组件：<b>' + pv.modules + ' 个</b></span><span>逆变器：<b>' + pv.inverters + ' 台</b></span>' +
          '<span>直流汇流箱：<b>' + pv.combiners + ' 台</b></span><span>直流充电桩：<b>' + pv.chargers + ' 台</b></span>' +
          '<span>电池状态：<b>' + b.status + '</b></span><span>SOC：<b>' + b.soc + '%</b> · SOH <b>' + b.soh + '%</b></span>' +
          '<span>充/放功率：<b class="c-red">' + b.chargeKw + '</b> / <b class="c-green">' + b.dischargeKw + '</b> kW</span></div>';
      }
      function renderStrip() {
        strip.innerHTML = [
          ['系统综合节能效率', '10%-40 %', '建筑侧+光储侧真实方案', 'good'],
          ['本次模拟节电量', (S().control.savedKwh || 0) + ' kWh', '策略下发后统计'],
          ['本次模拟减排', (S().control.savedCarbon || 0).toFixed(2) + ' tCO₂', '0.8843 kgCO₂/kWh'],
          ['储能容量', '240kW/500kWh', '调峰/调频', ''],
          ['当前策略', S().control.applied ? '已下发并联动' : '待下发', '']
        ].map(function (m) {
          return '<div class="metric ' + (m[3] || '') + '"><b>' + m[1] + '</b><span>' + m[0] + ' · ' + m[2] + '</span></div>';
        }).join('');
      }
      function collectStrategies() {
        var st = {}, pv = {};
        buildGrid.querySelectorAll('.strat-card').forEach(function (c) { st[c.getAttribute('data-key')] = c.classList.contains('on'); });
        pvGrid.querySelectorAll('.strat-card').forEach(function (c) { pv[c.getAttribute('data-pvkey')] = c.classList.contains('on'); });
        return { strategies: st, pv: pv };
      }
      renderStrip(); renderEff(S().control.cutRate, S().control.savedKwh || null); renderPvInfo();
      ctTemp.oninput = function () { ctTempV.textContent = ctTemp.value + '℃'; };
      ctLight.oninput = function () { ctLightV.textContent = ctLight.value + '%'; };
      buildGrid.querySelectorAll('.strat-card').forEach(function (c) {
        c.onclick = function () {
          c.classList.toggle('on');
          c.querySelector('.sc-switch').classList.toggle('on');
        };
      });
      pvGrid.querySelectorAll('.strat-card').forEach(function (c) {
        c.onclick = function () {
          c.classList.toggle('on');
          c.querySelector('.sc-switch').classList.toggle('on');
        };
      });
      ctBat.onchange = function () {
        if (!JA.perm.energyEdit) { JA.toast('当前角色无调控权限', 'warn'); return; }
        JA.Store.setBatteryMode(ctBat.value);
        renderPvInfo();
        JA.toast('储能运行方式已切换：' + S().battery.status, 'success');
      };
      document.getElementById('ctApply').onclick = function () {
        if (!JA.perm.energyEdit) { JA.toast('当前角色无调控权限', 'warn'); return; }
        var pick = collectStrategies();
        var cut = JA.Store.applyControl(Object.assign({ acTemp: +ctTemp.value, lightDim: +ctLight.value }, pick));
        renderEff(cut, S().control.savedKwh); renderStrip(); renderPvInfo();
        JA.toast('调控策略已下发：综合节能率 ' + (cut * 100).toFixed(1) + '%（工程区间10%-40%），3D与图表已联动', 'success');
      };
      document.getElementById('ctReset').onclick = function () {
        ctTemp.value = 26; ctLight.value = 80;
        ctTempV.textContent = '26℃'; ctLightV.textContent = '80%';
        buildGrid.querySelectorAll('.strat-card').forEach(function (c) {
          var on = ['envelope', 'chiller', 'led', 'digital'].indexOf(c.getAttribute('data-key')) >= 0;
          c.classList.toggle('on', on); c.querySelector('.sc-switch').classList.toggle('on', on);
        });
        JA.toast('已恢复默认策略勾选，重新下发可再次模拟', 'info');
      };
      ctx.sub(function () { renderStrip(); renderPvInfo(); });
      return ctx.done();
    }
  });

  /* ================================================================
   * 页面 9：异常预警与优化方案
   * ================================================================ */
  JA.registerPage({
    id: 'alerts', view: 'ops', group: 'AI智能中心', name: '异常预警与优化', icon: 'alert',
    render: function (el) {
      var ctx = pageCtx();
      el.innerHTML = pageHead('异常预警 · 智能诊断与优化方案闭环', '能源精细化管理模块 / AI智能中心 / 异常预警', ENTRY_BTN);
      var strip = h('div', 'metric-strip mb12'); el.appendChild(strip);
      var layout = h('div', 'grid g-21');
      var pList = panel('告警事件列表');
      var tabs = h('div', 'tabs');
      tabs.innerHTML = '<div class="tab on" data-f="all">全部</div><div class="tab" data-f="active">活动告警</div><div class="tab" data-f="done">已处理</div>';
      var listWrap = h('div', 'scroll-y'); listWrap.style.maxHeight = 'calc(100vh - 300px)';
      pList.bd.appendChild(tabs); pList.bd.appendChild(listWrap);
      var pPlan = panel('智能优化方案 & 预警推送');
      var planBd = h('div', 'scroll-y'); planBd.style.maxHeight = 'calc(100vh - 260px)';
      pPlan.bd.appendChild(planBd);
      layout.appendChild(pList.el); layout.appendChild(pPlan.el);
      el.appendChild(layout);

      /* 故障诊断与安全保障四模块 */
      var pDiag = panel('故障诊断与安全保障模块', '充放电监测 · 电池维护 · 消息推送 · GPS定位管理');
      var dg = h('div', 'grid g-4');
      var dBat = h('div'), dMaint = h('div'), dPush = h('div'), dGps = h('div');
      [dBat, dMaint, dPush, dGps].forEach(function (x) { var cell = h('div', 'diag-cell'); cell.appendChild(x); dg.appendChild(cell); });
      pDiag.bd.appendChild(dg);
      el.appendChild(pDiag.el);

      function renderDiag() {
        var b = S().battery;
        dBat.innerHTML =
          '<h4>① 充放电监测模块</h4>' +
          '<div class="diag-kv"><span>电池簇电压</span><b>' + b.voltage + ' V</b></div>' +
          '<div class="diag-kv"><span>电池温度</span><b class="' + (b.temp > 45 ? 'c-red' : '') + '">' + b.temp + ' ℃</b></div>' +
          '<div class="diag-kv"><span>SOC / SOH</span><b>' + b.soc + '% / ' + b.soh + '%</b></div>' +
          '<div class="diag-kv"><span>充 / 放功率</span><b>' + b.chargeKw + ' / ' + b.dischargeKw + ' kW</b></div>' +
          '<div class="diag-kv"><span>运行状态</span><b>' + b.status + '</b></div>' +
          '<div class="fs11 muted" style="line-height:1.7">实时监测电池电压、温度，超阈值自动报警并联动推送模块，保障电池安全充放电。</div>';
        dMaint.innerHTML =
          '<h4>② 电池维护监控模块</h4>' +
          '<table class="tbl tbl-mini"><thead><tr><th>时间</th><th>项目</th><th>数值</th><th>结果</th></tr></thead><tbody>' +
          b.records.map(function (r) {
            return '<tr><td class="fs11">' + r.time + '</td><td class="fs11">' + r.item + '</td><td class="num fs11">' + r.val + '</td><td><span class="tag tag-green">' + r.res + '</span></td></tr>';
          }).join('') + '</tbody></table>' +
          '<div class="fs11 muted" style="line-height:1.7">定期维修数据存档，形成完整蓄电池数据文件，支持全面健康评估（SOH ' + b.soh + '% · 循环 ' + b.cycles + ' 次）。</div>';
        dPush.innerHTML =
          '<h4>③ 推送模块</h4>' +
          '<div class="diag-kv"><span>推送对象</span><b>在线用户 / Android终端App</b></div>' +
          '<div class="diag-kv"><span>推送方式</span><b>超阈值自动推送 · 全网广播</b></div>' +
          '<div class="diag-kv"><span>通道</span><b>App / 短信 / 邮件</b></div>' +
          '<button class="btn btn-primary btn-sm" id="dgBc" style="width:100%;justify-content:center;margin-top:6px">模拟全网广播当前红色告警</button>' +
          '<div class="fs11 muted" style="line-height:1.7;margin-top:6px">超阈值自动向在线用户、Android终端App推送报警消息，支持全网广播。</div>';
        var red = S().alerts.filter(function (a) { return a.active && a.level === '告警'; })[0];
        dPush.querySelector('#dgBc').onclick = function () {
          if (!red) { JA.toast('当前无活动红色告警', 'info'); return; }
          JA.Store.pushAlert(red.id, '全网广播');
          JA.toast('全网广播已发送：' + red.title, 'success');
        };
        dGps.innerHTML =
          '<h4>④ 定位管理模块（GPS）</h4>' +
          '<div id="gpsList">' + S().gpsNodes.map(function (n) {
            return '<div class="gps-row" data-id="' + n.id + '"><span class="gps-dot ' + (n.status === '告警' ? 'alarm' : '') + '"></span>' +
              '<span class="gps-name">' + n.name + '</span>' +
              '<span class="fs11 muted">' + n.lng.toFixed(5) + ', ' + n.lat.toFixed(5) + '</span>' +
              (JA.perm.energyEdit ? '<i class="gps-del" data-id="' + n.id + '">删除</i>' : '') + '</div>';
          }).join('') + '</div>' +
          (JA.perm.energyEdit ? '<div class="flex gap8" style="margin-top:6px"><input class="inp" id="gpsName" placeholder="新节点名称" style="flex:1"><button class="btn btn-primary btn-sm" id="gpsAdd">新增节点</button></div>' : '') +
          '<div class="fs11 muted" style="line-height:1.7;margin-top:6px">GPS实时定位异常节点位置，支持节点新增、修改、删除管理；套筒超限节点坐标同步闪烁。</div>';
        dGps.querySelectorAll('.gps-del').forEach(function (x) {
          x.onclick = function () { JA.Store.removeGpsNode(x.getAttribute('data-id')); JA.toast('GPS节点已删除', 'info'); };
        });
        var addBtn = dGps.querySelector('#gpsAdd');
        if (addBtn) addBtn.onclick = function () {
          var nm = dGps.querySelector('#gpsName').value.trim();
          if (!nm) { JA.toast('请输入节点名称', 'warn'); return; }
          JA.Store.addGpsNode({ name: nm, lng: 117.2014 + Math.random() * 0.0003, lat: 39.0845 + Math.random() * 0.0003 });
          JA.toast('GPS节点已新增并接入定位管理', 'success');
        };
      }

      var filter = 'all', selectedId = null;

      function alertCard(a) {
        return '<div class="alert-card ' + (a.level === '告警' ? 'alarm' : (a.level === '提示' ? 'info' : 'warn')) + (a.active ? '' : ' resolved') + '" data-id="' + a.id + '">' +
          '<div class="ac-hd">' +
            '<span class="tag ' + (a.level === '告警' ? 'tag-red' : 'tag-yellow') + '">' + (a.active ? (a.level === '告警' ? '<span class="blink-dot"></span>' : '') : '') + a.level + '</span>' +
            '<span class="tag tag-purple">' + a.type + '</span>' +
            (a.pushed ? '<span class="tag tag-blue">已推送' + (a.pushedTo.length ? '·' + a.pushedTo.join('/') : '') + '</span>' : '') +
            '<span class="fs11 muted">' + a.time + '</span></div>' +
          '<div class="ac-title">' + a.title + '</div>' +
          '<div class="ac-desc">' + a.desc + '</div>' +
          '<div class="ac-meta"><span>📍 ' + (a.pos || '-') + '</span></div>' +
          '<div class="ac-actions">' +
            (a.roomId ? '<button class="btn btn-sm" data-act="locate">3D定位</button>' : '') +
            (a.nodeId ? '<button class="btn btn-sm" data-act="sleeve">套筒节点定位</button>' : '') +
            (a.active ? '<button class="btn btn-sm" data-act="app">App推送</button><button class="btn btn-sm" data-act="broadcast">全网广播</button>' +
              '<button class="btn btn-sm" data-act="sms">短信</button><button class="btn btn-sm" data-act="mail">邮件</button>' +
              '<button class="btn btn-sm" data-act="order">生成工单</button><button class="btn btn-success btn-sm" data-act="ok">标记处理</button>' : '<span class="tag tag-green">已闭环</span>') +
          '</div></div>';
      }
      function renderList() {
        var list = S().alerts.filter(function (a) {
          return filter === 'all' ? true : filter === 'active' ? a.active : !a.active;
        });
        listWrap.innerHTML = list.length ? list.map(alertCard).join('') : '<div class="muted txt-c pad12">暂无数据</div>';
        listWrap.querySelectorAll('.alert-card').forEach(function (c) {
          c.onclick = function (e) {
            if (e.target.closest('button')) return;
            selectedId = c.getAttribute('data-id');
            renderPlan();
            listWrap.querySelectorAll('.alert-card').forEach(function (x) { x.style.outline = ''; });
            c.style.outline = '1px solid rgba(34,224,255,.5)';
          };
        });
        listWrap.querySelectorAll('[data-act]').forEach(function (b) {
          b.onclick = function () {
            var id = b.closest('.alert-card').getAttribute('data-id');
            var a = S().alerts.filter(function (x) { return x.id === id; })[0];
            var act = b.getAttribute('data-act');
            if (act === 'locate') JA.locateRoomInTwin(a.roomId);
            else if (act === 'sleeve') JA.go('build', 'sleeves');
            else if (act === 'app') { JA.Store.pushAlert(id, 'App推送'); JA.toast('已推送至在线用户与Android终端App', 'success'); }
            else if (act === 'broadcast') { JA.Store.pushAlert(id, '全网广播'); JA.toast('已触发全网广播（App/短信/邮件）', 'success'); }
            else if (act === 'sms') { JA.Store.pushAlert(id, '短信'); JA.toast('短信预警已模拟推送至值班人员', 'success'); }
            else if (act === 'mail') { JA.Store.pushAlert(id, '邮件'); JA.toast('邮件预警已模拟推送至智能能源管理邮箱', 'success'); }
            else if (act === 'order') {
              JA.openOrderCreate({
                type: a.type === '结构安全' ? '结构整改' : (a.type === '设备故障' ? '设备检修' : '节能整改'),
                target: a.pos, desc: a.title + '：' + a.desc
              });
            } else if (act === 'ok') {
              JA.Store.resolveAlert(id);
              JA.toast('告警已标记处理，3D闪烁同步解除', 'success');
            }
            setTimeout(renderPlan, 60);
          };
        });
      }
      function renderPlan() {
        var a = S().alerts.filter(function (x) { return x.id === selectedId; })[0] || S().alerts.filter(function (x) { return x.active; })[0];
        if (!a) { planBd.innerHTML = '<div class="muted txt-c pad12">暂无告警，系统运行平稳</div>'; renderPushLog(); return; }
        planBd.innerHTML =
          '<div class="flex aic jcb mb8"><b class="fs16 c-cyan">' + a.type + ' · 优化方案</b>' +
          '<span class="tag ' + (a.level === '告警' ? 'tag-red' : 'tag-yellow') + '">' + a.level + '</span></div>' +
          '<div class="opplan"><h5>① 异常问题描述</h5><p>' + a.desc + '</p></div>' +
          '<div class="opplan"><h5>② 异常位置</h5><p>📍 ' + (a.pos || '-') + '　|　发现时间 ' + a.time + '</p></div>' +
          '<div class="opplan"><h5>③ 异常原因分析（AI诊断）</h5><p>' + a.reason + '</p></div>' +
          '<div class="opplan"><h5>④ 建议调控措施</h5><p>' + a.advice + '</p></div>' +
          '<div class="opplan"><h5>⑤ 预期节能 / 处置效果</h5><p class="c-green">' + a.expect + '</p></div>' +
          '<div class="flex gap8 mt12" style="flex-wrap:wrap">' +
            (a.roomId ? '<button class="btn btn-sm" id="plLocate">3D模型闪烁定位</button>' : '') +
            (a.nodeId ? '<button class="btn btn-sm" id="plSleeve">套筒节点查看</button>' : '') +
            '<button class="btn btn-sm btn-primary" id="plApp">App/在线用户推送</button><button class="btn btn-sm" id="plBc">全网广播</button>' +
            '<button class="btn btn-sm" id="plSms">模拟短信</button><button class="btn btn-sm" id="plMail">模拟邮件</button></div>' +
          renderPushLog(true);
        var lk = planBd.querySelector('#plLocate');
        if (lk) lk.onclick = function () { JA.locateRoomInTwin(a.roomId); };
        var ls = planBd.querySelector('#plSleeve');
        if (ls) ls.onclick = function () { JA.go('build', 'sleeves'); };
        planBd.querySelector('#plApp').onclick = function () {
          JA.Store.pushAlert(a.id, 'App推送'); JA.toast('已推送至在线用户与Android终端App', 'success');
        };
        planBd.querySelector('#plBc').onclick = function () {
          JA.Store.pushAlert(a.id, '全网广播'); JA.toast('全网广播已触发', 'success');
        };
        planBd.querySelector('#plSms').onclick = function () {
          JA.Store.pushAlert(a.id, '短信'); JA.toast('短信预警已模拟推送', 'success');
        };
        planBd.querySelector('#plMail').onclick = function () {
          JA.Store.pushAlert(a.id, '邮件'); JA.toast('邮件预警已模拟推送', 'success');
        };
      }
      function renderPushLog(inline) {
        var html = '<div class="mt12"><div class="fs11 muted mb8">预警推送通道记录</div>' +
          S().pushLogs.slice(0, 4).map(function (l) {
            return '<div class="mini-log"><div class="ml-time">' + l.time + ' · ' + l.channel + ' → ' + l.to + '</div>' +
              '<div class="ml-txt">' + l.content + '</div></div>';
          }).join('') + '</div>';
        if (inline) {
          var old = planBd.querySelector('.pushlog-block');
          if (old) old.remove();
          var w = h('div', 'pushlog-block'); w.innerHTML = html; planBd.appendChild(w);
        }
      }
      function renderStrip() {
        var list = S().alerts;
        strip.innerHTML = [
          ['活动告警', list.filter(function (a) { return a.active; }).length + ' 起', '', 'bad'],
          ['红色告警', list.filter(function (a) { return a.active && a.level === '告警'; }).length + ' 起', '需立即处置', 'bad'],
          ['黄色预警', list.filter(function (a) { return a.active && a.level === '预警'; }).length + ' 起', ''],
          ['已闭环', list.filter(function (a) { return !a.active; }).length + ' 起', '', 'good'],
          ['自动识别类型', '6 类', '能耗突增/无人空耗/设备故障/超温/电池故障/套筒应力超限']
        ].map(function (m) {
          return '<div class="metric ' + (m[3] || '') + '"><b>' + m[1] + '</b><span>' + m[0] + (m[2] ? ' · ' + m[2] : '') + '</span></div>';
        }).join('');
      }
      tabs.querySelectorAll('.tab').forEach(function (t) {
        t.onclick = function () {
          tabs.querySelectorAll('.tab').forEach(function (x) { x.classList.remove('on'); });
          t.classList.add('on'); filter = t.getAttribute('data-f'); renderList();
        };
      });
      renderStrip(); renderList(); renderPlan(); renderDiag();
      ctx.sub(function (evt) {
        renderStrip(); renderList(); renderPlan();
        if (evt.type === 'push' || evt.type === 'gps' || evt.type === 'battery' || evt.type === 'alert') renderDiag();
      });
      return ctx.done();
    }
  });
})();
