/* =====================================================================
 * 居安智卫 —— 主框架：鉴权 / 视图路由 / 侧边导航 / 弹窗 / 通用交互面板
 * ===================================================================== */
JA.pages = JA.pages || [];

(function () {
  'use strict';

  /* ---------------- 会话与权限 ---------------- */
  var session = null;
  try { session = JSON.parse(localStorage.getItem('JA_SESSION') || 'null'); } catch (e) {}
  if (!session) { location.replace('index.html'); return; }
  JA.session = session;
  JA.role = session.role;
  JA.perm = {
    isAdmin: session.role === 'admin',
    energyEdit: session.role === 'admin' || session.role === 'ops',
    sleeveEdit: session.role === 'admin' || session.role === 'accept'
  };

  /* ---------------- 导航图标 ---------------- */
  var ICONS = {
    dashboard: "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z",
    twin: "M12 2l9 5v10l-9 5-9-5V7l9-5zM12 12l9-5M12 12v10M12 12L3 7",
    energy: "M13 2L3 14h7l-1 8 11-13h-7l1-7z",
    collect: "M4 6h16M4 12h16M4 18h10M18 15l3 3-3 3",
    env: "M12 2v4M12 18v4M4 12H2m20 0h-2M5 5l-2-2m18 18l-2-2M5 19l-2 2M19 5l2-2M12 8a4 4 0 100 8 4 4 0 000-8z",
    device: "M12 2a10 10 0 100 20 10 10 0 000-20zM12 6v6l4 2",
    ai: "M9 3h6M9 3v2H5v14h14V5h-4V3M9 11h.01M15 11h.01M8 15h8",
    control: "M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6",
    alert: "M12 3l10 18H2L12 3zM12 10v5M12 18h.01",
    order: "M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11",
    sleeve: "M7 3v18M17 3v18M3 8h4M3 16h4M17 8h4M17 16h4M10 12h4",
    site: "M3 21h18M5 21V7l7-4 7 4v14M9 9h2M13 9h2M9 13h2M13 13h2M9 17h2M13 17h2",
    report: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM14 2v6h6M8 13h8M8 17h5",
    setting: "M12 15a3 3 0 100-6 3 3 0 000 6zM19 12a7 7 0 00-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 00-2-1.2L14 3h-4l-.5 2.6a7 7 0 00-2 1.2l-2.4-1-2 3.4 2 1.6a7 7 0 000 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 002 1.2L10 21h4l.5-2.6a7 7 0 002-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z"
  };
  function iconStyle(name) {
    var p = ICONS[name] || ICONS.dashboard;
    return 'background-image:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%237fb6ff\' stroke-width=\'1.7\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'' + p + '\'/%3E%3C/svg%3E")';
  }

  /* ---------------- UI：Toast / Modal ---------------- */
  function toast(msg, type) {
    var box = document.getElementById('toastBox');
    var d = document.createElement('div');
    d.className = 'toast ' + (type || '');
    var icons = { success: '✓', error: '✕', warn: '!', info: 'ℹ' };
    d.innerHTML = '<span>' + (icons[type] || '●') + '</span><span>' + msg + '</span>';
    box.appendChild(d);
    setTimeout(function () { d.style.opacity = '0'; d.style.transition = 'opacity .4s'; }, 2600);
    setTimeout(function () { d.remove(); }, 3100);
  }
  JA.toast = toast;

  var modalMask = document.getElementById('modalMask');
  var modalTitle = document.getElementById('modalTitle');
  var modalBody = document.getElementById('modalBody');
  var modalFooter = document.getElementById('modalFooter');
  function closeModal() {
    modalMask.classList.remove('show');
    modalBody.innerHTML = ''; modalFooter.innerHTML = '';
  }
  document.getElementById('modalX').onclick = closeModal;
  modalMask.addEventListener('click', function (e) { if (e.target === modalMask) closeModal(); });

  function modal(opt) {
    modalTitle.textContent = opt.title || '';
    modalBody.innerHTML = '';
    if (typeof opt.body === 'string') modalBody.innerHTML = opt.body;
    else modalBody.appendChild(opt.body);
    document.getElementById('modalBox').style.width = opt.width || '580px';
    modalFooter.innerHTML = '';
    (opt.buttons || [{ text: '关 闭' }]).forEach(function (b) {
      var btn = document.createElement('button');
      btn.className = 'btn ' + (b.type || '') + (b.primary ? ' btn-primary' : '');
      btn.textContent = b.text;
      btn.onclick = function () {
        if (b.handler && b.handler(closeModal, modalBody) === false) return;
        if (!b.keepOpen) closeModal();
      };
      modalFooter.appendChild(btn);
    });
    modalMask.classList.add('show');
    if (opt.onOpen) opt.onOpen(modalBody);
    return { close: closeModal, body: modalBody };
  }
  JA.modal = modal;

  /* ---------------- 通用：房间能耗/环境数据录入面板 ---------------- */
  JA.openRoomEntry = function (prefillRoomId) {
    if (!JA.perm.energyEdit) {
      modal({
        title: '权限不足', width: '420px',
        body: '<div style="padding:10px 4px;color:#ffd970;line-height:1.9">当前角色为 <b>工程验收账号</b>，能耗/环境数据仅可查看，不能编辑。<br>请使用 <b>管理员</b> 或 <b>运维人员</b> 账号录入能耗数据。</div>',
        buttons: [{ text: '知道了', primary: true }]
      });
      return;
    }
    var rooms = JA.Store.state.rooms;
    var floorOpts = ['F1', 'F2', 'F3', 'F4'].map(function (f) {
      return '<option value="' + f + '">' + ({ F1: '一层', F2: '二层', F3: '三层', F4: '四层' })[f] + '</option>';
    }).join('');
    var html =
      '<div class="form-row">' +
        '<div class="form-item"><label>楼层 <span class="req">*</span></label><select class="sel" id="enFloor">' + floorOpts + '</select></div>' +
        '<div class="form-item" style="flex:2"><label>房间 <span class="req">*</span></label><select class="sel" id="enRoom"></select></div>' +
      '</div>' +
      '<div class="form-row">' +
        '<div class="form-item"><label>总能耗 (kWh，留空则分项自动汇总)</label><input class="inp" id="enTotal" type="number" step="0.1"></div>' +
        '<div class="form-item"><label>供暖能耗 (kWh)</label><input class="inp" id="enHeating" type="number" step="0.1"></div>' +
        '<div class="form-item"><label>空调风机能耗 (kWh)</label><input class="inp" id="enHvac" type="number" step="0.1"></div>' +
      '</div>' +
      '<div class="form-row">' +
        '<div class="form-item"><label>照明能耗 (kWh)</label><input class="inp" id="enLight" type="number" step="0.1"></div>' +
        '<div class="form-item"><label>插座设备能耗 (kWh)</label><input class="inp" id="enSocket" type="number" step="0.1"></div>' +
        '<div class="form-item"><label>电梯能耗 (kWh)</label><input class="inp" id="enEle" type="number" step="0.1"></div>' +
      '</div>' +
      '<div class="form-row"><div class="form-item" style="flex:1"><div class="form-hint" id="enCarbon" style="margin-top:2px">对应碳排放：按华北电网因子 0.8843 kgCO₂/kWh 实时计算</div></div></div>' +
      '<div class="form-row">' +
        '<div class="form-item"><label>环境温度 (℃)</label><input class="inp" id="enTemp" type="number" step="0.1"></div>' +
        '<div class="form-item"><label>相对湿度 (%RH)</label><input class="inp" id="enHum" type="number" step="1"></div>' +
        '<div class="form-item"><label>人员密度 (人)</label><input class="inp" id="enOcc" type="number" step="1"></div>' +
      '</div>' +
      '<div class="form-row">' +
        '<div class="form-item"><label>设备运行状态</label><select class="sel" id="enEquip">' +
          '<option value="running">运行正常</option><option value="stopped">停机</option><option value="fault">设备故障</option>' +
        '</select></div>' +
        '<div class="form-item"><label>异常标记（触发告警规则）</label><select class="sel" id="enAnomaly">' +
          '<option value="none">无异常</option><option value="异常能耗">异常能耗</option>' +
          '<option value="无人空耗">无人空耗</option>' +
          '<option value="设备故障">设备故障</option>' +
          '<option value="能耗突增">能耗突增</option>' +
          '<option value="设备运行异常">设备运行异常</option>' +
        '</select></div>' +
      '</div>' +
      '<div class="form-hint">提交后将实时联动：数据表格 · 能耗曲线 · AI预测 · 3D房间着色/闪烁 · 指标卡片 · 告警规则引擎</div>';

    modal({
      title: '交互式数据录入 · 能耗 / 环境 / 人员 / 设备',
      width: '660px', body: html,
      buttons: [
        { text: '取消' },
        { text: '提交数据并联动', primary: true, handler: function (close, bd) {
          var roomSel = bd.querySelector('#enRoom');
          var roomId = roomSel.value;
          var vals = {
            total: bd.querySelector('#enTotal').value,
            heating: bd.querySelector('#enHeating').value,
            hvac: bd.querySelector('#enHvac').value,
            light: bd.querySelector('#enLight').value,
            socket: bd.querySelector('#enSocket').value,
            elevator: bd.querySelector('#enEle').value,
            temp: bd.querySelector('#enTemp').value,
            humidity: bd.querySelector('#enHum').value,
            occupancy: bd.querySelector('#enOcc').value,
            equipStatus: bd.querySelector('#enEquip').value,
            anomalyType: bd.querySelector('#enAnomaly').value
          };
          if (vals.total === '' && vals.temp === '' && vals.occupancy === '') {
            toast('请至少填写一项要提交的数据', 'warn'); return false;
          }
          Object.keys(vals).forEach(function (k) {
            if (vals[k] !== '' && k !== 'equipStatus' && k !== 'anomalyType') vals[k] = +vals[k];
            if (vals[k] === '') delete vals[k];
          });
          JA.Store.submitRoomData(roomId, vals);
          toast('数据已提交并完成清洗归集，图表与3D模型已联动刷新', 'success');
          JA.Store.state.locateRoom = roomId;
          JA.Store.emit({ type: 'locate', roomId: roomId });
        } }
      ],
      onOpen: function (bd) {
        var floorSel = bd.querySelector('#enFloor');
        var roomSel = bd.querySelector('#enRoom');
        function fillRooms() {
          var list = JA.Store.floorRooms(floorSel.value);
          roomSel.innerHTML = list.map(function (r) {
            return '<option value="' + r.id + '">' + r.no + ' ' + r.name + '</option>';
          }).join('');
          fillVals();
        }
        function calcCarbon() {
          var ids = ['enTotal', 'enHeating', 'enHvac', 'enLight', 'enSocket', 'enEle'];
          var v = 0, has = false;
          ids.forEach(function (id) { var x = parseFloat(bd.querySelector('#' + id).value); if (!isNaN(x)) { v += x; has = true; } });
          if (!has) {
            var r0 = JA.Store.getRoom(roomSel.value);
            v = r0 ? r0.total : 0;
          }
          bd.querySelector('#enCarbon').innerHTML =
            '对应碳排放（合计 ' + Math.round(v * 100) / 100 + ' kWh × 0.8843）：<b style="color:#22e0ff">' +
            (Math.round(v * 0.8843 * 100) / 100) + ' kgCO₂</b>';
        }
        function fillVals() {
          var r = JA.Store.getRoom(roomSel.value);
          bd.querySelector('#enTotal').value = r.total;
          bd.querySelector('#enHeating').value = r.heating || 0;
          bd.querySelector('#enHvac').value = r.hvac;
          bd.querySelector('#enLight').value = r.light;
          bd.querySelector('#enSocket').value = r.socket != null ? r.socket : 0;
          bd.querySelector('#enEle').value = r.elevator;
          bd.querySelector('#enTemp').value = r.temp;
          bd.querySelector('#enHum').value = r.humidity;
          bd.querySelector('#enOcc').value = r.occupancy;
          bd.querySelector('#enEquip').value = r.equipStatus;
          bd.querySelector('#enAnomaly').value = 'none';
          calcCarbon();
        }
        ['enTotal', 'enHeating', 'enHvac', 'enLight', 'enSocket', 'enEle'].forEach(function (id) {
          bd.querySelector('#' + id).addEventListener('input', calcCarbon);
        });
        floorSel.onchange = fillRooms;
        roomSel.onchange = fillVals;
        if (prefillRoomId) {
          var pr = JA.Store.getRoom(prefillRoomId);
          if (pr) { floorSel.value = pr.floor; fillRooms(); roomSel.value = prefillRoomId; fillVals(); }
        } else fillRooms();
      }
    });
  };

  /* ---------------- 通用：创建整改工单 ---------------- */
  JA.openOrderCreate = function (preset) {
    preset = preset || {};
    var typeOpts = (preset.typeOptions || ['节能整改', '设备检修', '结构整改']).map(function (t) {
      return '<option ' + (preset.type === t ? 'selected' : '') + '>' + t + '</option>';
    }).join('');
    var html =
      '<div class="form-row"><div class="form-item"><label>工单类型</label><select class="sel" id="woType">' + typeOpts + '</select></div>' +
      '<div class="form-item" style="flex:2"><label>缺陷构件 / 对象 <span class="req">*</span></label><input class="inp" id="woTarget" value="' + (preset.target || '') + '" placeholder="如：套筒 S-07 / 精密空调 CRAC-403"></div></div>' +
      '<div class="form-item" style="flex:1;min-width:100%"><label>缺陷描述 <span class="req">*</span></label><textarea class="inp" id="woDesc" placeholder="请描述缺陷现象、严重程度…">' + (preset.desc || '') + '</textarea></div>' +
      '<div class="form-row"><div class="form-item"><label>责任人</label><input class="inp" id="woOwner" value="' + (preset.owner || '王建国') + '"></div>' +
      '<div class="form-item"><label>联系电话</label><input class="inp" id="woPhone" value="' + (preset.phone || '138****6621') + '"></div>' +
      '<div class="form-item"><label>整改期限</label><input class="inp" id="woDeadline" type="date" value="' + (preset.deadline || '2026-09-22') + '"></div>' +
      '<div class="form-item"><label>紧急程度</label><select class="sel" id="woLevel"><option>一般</option><option>关注</option><option>紧急</option></select></div></div>';
    modal({
      title: '创建整改工单', width: '640px', body: html,
      buttons: [
        { text: '取消' },
        { text: '创建并派发', primary: true, handler: function (close, bd) {
          var target = bd.querySelector('#woTarget').value.trim();
          var desc = bd.querySelector('#woDesc').value.trim();
          if (!target || !desc) { toast('请填写缺陷对象与描述', 'warn'); return false; }
          JA.Store.createOrder({
            type: bd.querySelector('#woType').value, target: target, desc: desc,
            owner: bd.querySelector('#woOwner').value, phone: bd.querySelector('#woPhone').value,
            deadline: bd.querySelector('#woDeadline').value,
            level: bd.querySelector('#woLevel').value
          });
          toast('整改工单已创建并派发至责任人', 'success');
        } }
      ]
    });
  };

  /* ---------------- 侧边导航与路由 ---------------- */
  var sidebar = document.getElementById('sidebar');
  var content = document.getElementById('content');
  var current = { dispose: null, id: null };

  function pagesOf(view) {
    return JA.pages.filter(function (p) { return p.view === view; });
  }
  function renderNav(view) {
    var groups = {};
    pagesOf(view).forEach(function (p) {
      (groups[p.group] = groups[p.group] || []).push(p);
    });
    sidebar.innerHTML = Object.keys(groups).map(function (g) {
      return '<div class="nav-group"><div class="nav-gtitle">' + g + '</div>' +
        groups[g].map(function (p) {
          return '<div class="nav-item" data-pid="' + p.id + '"><span class="nav-ico" style="' + iconStyle(p.icon) + '"></span>' + p.name + '</div>';
        }).join('') + '</div>';
    }).join('');
    sidebar.querySelectorAll('.nav-item').forEach(function (it) {
      it.onclick = function () { go(view, it.getAttribute('data-pid')); };
    });
    var act = sidebar.querySelector('.nav-item[data-pid="' + current.id + '"]');
    if (act) act.classList.add('active');
  }

  function go(view, pageId, param) {
    var all = pagesOf(view);
    var page = all.filter(function (p) { return p.id === pageId; })[0];
    if (!page) { page = all[0]; pageId = page ? page.id : null; }
    if (!page) { content.innerHTML = '<div style="padding:40px;color:#ff8299">视图「' + view + '」暂无可用页面</div>'; return; }
    // 切换视图
    document.querySelectorAll('#viewSwitch .vs-item').forEach(function (t) {
      t.classList.toggle('active', t.getAttribute('data-view') === view);
    });
    renderNav(view);
    var act = sidebar.querySelector('.nav-item[data-pid="' + pageId + '"]');
    if (act) act.classList.add('active');

    if (current.dispose) { try { current.dispose(); } catch (e) { console.error(e); } }
    content.innerHTML = '';
    var scroll = document.createElement('div');
    scroll.className = 'page-scroll';
    content.appendChild(scroll);
    var dispose = null;
    try { dispose = page.render(scroll, param || {}); } catch (e) { console.error(e); scroll.innerHTML = '<div style="padding:30px;color:#ff8299">页面渲染异常：' + e.message + '</div>'; }
    current = { dispose: dispose, id: pageId, view: view };
    window.scrollTo(0, 0);
    setTimeout(function () { window.dispatchEvent(new Event('resize')); }, 30);
    location.hash = '#/' + view + '/' + pageId;
  }
  JA.go = go;

  /* 视图切换 */
  document.querySelectorAll('#viewSwitch .vs-item').forEach(function (t) {
    t.onclick = function () {
      var v = t.getAttribute('data-view');
      go(v, v === 'ops' ? 'dashboard' : 'site');
    };
  });

  /* 3D 定位跳转（告警列表→孪生页） */
  JA.locateRoomInTwin = function (roomId) {
    go('ops', 'twin');
    setTimeout(function () { JA.Store.state.locateRoom = roomId; JA.Store.emit({ type: 'locate', roomId: roomId }); }, 120);
  };

  /* ---------------- 顶栏信息 ---------------- */
  document.getElementById('userName').textContent = session.name || session.roleName;
  document.getElementById('userRole').textContent = session.roleName + ' · ' + (session.username || '');
  document.getElementById('userAvatar').textContent = (session.name || session.roleName).charAt(0);
  document.getElementById('btnLogout').onclick = function () {
    modal({
      title: '退出登录', width: '380px',
      body: '<div style="padding:8px 4px;color:var(--txt2)">确认退出当前账号并返回登录页？</div>',
      buttons: [
        { text: '取消' },
        { text: '确认退出', type: 'btn-danger', handler: function () {
          localStorage.removeItem('JA_SESSION'); location.replace('index.html');
        } }
      ]
    });
  };
  document.getElementById('tbAlert').onclick = function () {
    var v = document.querySelector('#viewSwitch .vs-item.active').getAttribute('data-view');
    go(v === 'build' ? 'build' : 'ops', v === 'build' ? 'sleeves' : 'alerts');
  };

  function tickClock() {
    var d = new Date(), w = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
    document.getElementById('clockDate').textContent =
      d.getFullYear() + '-' + JA.Utils.pad(d.getMonth() + 1) + '-' + JA.Utils.pad(d.getDate()) + ' 星期' + w;
    document.getElementById('clockTime').textContent =
      JA.Utils.pad(d.getHours()) + ':' + JA.Utils.pad(d.getMinutes()) + ':' + JA.Utils.pad(d.getSeconds());
  }
  tickClock(); setInterval(tickClock, 1000);

  JA.Store.subscribe(function () {
    var n = JA.Store.state.alerts.filter(function (a) { return a.active; }).length;
    document.getElementById('tbAlertNum').textContent = n;
  });
  document.getElementById('tbAlertNum').textContent =
    JA.Store.state.alerts.filter(function (a) { return a.active; }).length;

  /* ---------------- 启动：按角色进入默认视图 ---------------- */
  var hash = (location.hash || '').replace(/^#\//, '');
  var parts = hash.split('/');
  var defaultView = JA.role === 'accept' ? 'build' : 'ops';
  var view = parts[0] === 'ops' || parts[0] === 'build' ? parts[0] : defaultView;
  var pageId = parts[1] || (view === 'ops' ? 'dashboard' : 'site');
  go(view, pageId);
})();
