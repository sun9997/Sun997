/* =====================================================================
 * 居安智卫 —— 轻量化 3D 数字孪生办公楼（Three.js r128 / 无模块依赖）
 * 能力：360°拖拽旋转 · 滚轮缩放 · 点击楼层房间 · 能耗态势着色
 *       异常房间闪烁 · 设备状态标识 · 选中定位飞行 · Hover 信息
 * ===================================================================== */
(function () {
  'use strict';
  var T = window.THREE;

  var LEVEL_COLOR = {
    high: 0xff5a2b,     // 高能耗（插座设备集中办公区）橙红
    mid: 0xffc83d,      // 中能耗（照明、空调机房）黄
    normal: 0x18c8b8,   // 常规 蓝绿
    low: 0x2f8bff,      // 低能耗（走廊、设备间）蓝绿
    fault: 0xff2d55
  };

  function makeLabel(text, color, scale) {
    var c = document.createElement('canvas');
    c.width = 256; c.height = 80;
    var g = c.getContext('2d');
    g.font = 'bold 40px Microsoft YaHei';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = color; g.shadowBlur = 14;
    g.fillStyle = color;
    g.fillText(text, 128, 40);
    var tex = new T.CanvasTexture(c);
    var mat = new T.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
    var sp = new T.Sprite(mat);
    sp.scale.set(scale || 4.2, 1.3, 1);
    return sp;
  }

  function BuildingScene(container, opts) {
    opts = opts || {};
    var self = this;
    self.container = container;
    self.onPick = opts.onPick || function () {};
    self.roomMap = {};
    self.selectedId = null;
    self._raf = null;
    self._disposed = false;

    /* 场景基础 */
    var scene = new T.Scene();
    scene.background = null;
    scene.fog = new T.FogExp2(0x04101f, 0.0085);

    var camera = new T.PerspectiveCamera(48, 1, 0.1, 600);
    camera.position.set(30, 22, 34);

    var renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;cursor:grab';

    var ctrl = new T.OrbitControls(camera, renderer.domElement);
    ctrl.enableDamping = true; ctrl.dampingFactor = 0.08;
    ctrl.minDistance = 12; ctrl.maxDistance = 90;
    ctrl.maxPolarAngle = Math.PI * 0.49;
    ctrl.target.set(0, 8, 0);

    /* 灯光 */
    scene.add(new T.AmbientLight(0x8fb6ff, 0.55));
    var dir = new T.DirectionalLight(0xcfe6ff, 0.85);
    dir.position.set(20, 35, 18); dir.castShadow = true;
    dir.shadow.mapSize.set(512, 512);
    scene.add(dir);
    var p1 = new T.PointLight(0x22e0ff, 0.9, 120); p1.position.set(-26, 14, -18); scene.add(p1);
    var p2 = new T.PointLight(0x7c5bff, 0.8, 120); p2.position.set(28, 10, 22); scene.add(p2);

    /* 地面 + 光环 + 网格 */
    var ground = new T.Mesh(
      new T.CircleGeometry(60, 64),
      new T.MeshStandardMaterial({ color: 0x06183a, roughness: 0.92, metalness: 0.3,
        transparent: true, opacity: 0.85 })
    );
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.05;
    ground.receiveShadow = true;
    scene.add(ground);

    var grid = new T.GridHelper(110, 44, 0x22e0ff, 0x16386b);
    grid.material.transparent = true; grid.material.opacity = 0.28;
    scene.add(grid);

    var ringMat = new T.MeshBasicMaterial({ color: 0x22e0ff, transparent: true, opacity: 0.5 });
    var ring1 = new T.Mesh(new T.TorusGeometry(34, 0.06, 8, 120), ringMat);
    ring1.rotation.x = Math.PI / 2; ring1.position.y = 0.02;
    scene.add(ring1);
    var ring2 = new T.Mesh(new T.TorusGeometry(42, 0.04, 8, 120),
      new T.MeshBasicMaterial({ color: 0x7c5bff, transparent: true, opacity: 0.35 }));
    ring2.rotation.x = Math.PI / 2; ring2.position.y = 0.02;
    scene.add(ring2);

    /* 建筑主体 */
    var building = new T.Group();
    scene.add(building);
    var pickMeshes = [];
    var FW = 23, FD = 16;          // 楼层宽深
    var FH = 4.2;                 // 层高
    var RW = 9.6, RD = 6.3;       // 房间宽深

    // 中央电梯/管井核心筒（全楼贯通，半透明科技感）
    var core = new T.Mesh(
      new T.BoxGeometry(2.2, FH * 4 + 0.6, 2.2),
      new T.MeshStandardMaterial({ color: 0x0d2c5e, emissive: 0x123a6b, transparent: true, opacity: 0.55,
        roughness: .4, metalness: .6 })
    );
    core.position.y = FH * 2 - 0.2;
    building.add(core);
    var coreEdges = new T.LineSegments(new T.EdgesGeometry(core.geometry),
      new T.LineBasicMaterial({ color: 0x35b8ff, transparent: true, opacity: .8 }));
    core.add(coreEdges);

    var rooms = JA.Store.state.rooms;
    rooms.forEach(function (r, i) {
      var f = Math.floor(i / 4);
      var k = i % 4;
      var col = k % 2, row = Math.floor(k / 2);
      var x = (col === 0 ? -1 : 1) * (RW / 2 + 1.7);
      var z = (row === 0 ? -1 : 1) * (RD / 2 + 1.5);
      var baseY = f * FH;

      var g = new T.Group();
      // 楼板
      var slab = new T.Mesh(
        new T.BoxGeometry(FW, 0.3, FD),
        new T.MeshStandardMaterial({ color: 0x0a1f45, roughness: .7, metalness: .45,
          transparent: true, opacity: .92 })
      );
      slab.position.y = baseY; slab.receiveShadow = true; slab.castShadow = true;
      g.add(slab);
      // 楼板轮廓
      g.add(new T.LineSegments(new T.EdgesGeometry(slab.geometry),
        new T.LineBasicMaterial({ color: 0x2f7bff, transparent: true, opacity: .55 })));

      // 房间体块
      var mat = new T.MeshStandardMaterial({
        color: 0x21e6a4, emissive: 0x0b3a2f, emissiveIntensity: .55,
        roughness: .35, metalness: .35, transparent: true, opacity: .92
      });
      var box = new T.Mesh(new T.BoxGeometry(RW, 3.1, RD), mat);
      box.position.set(x, baseY + 1.75, z);
      box.castShadow = true;
      box.userData.roomId = r.id;
      g.add(box);
      var edge = new T.LineSegments(new T.EdgesGeometry(box.geometry),
        new T.LineBasicMaterial({ color: 0x9fe8ff, transparent: true, opacity: .55 }));
      box.add(edge);
      pickMeshes.push(box);

      // 设备状态指示球（房间前角）
      var devMat = new T.MeshStandardMaterial({ color: 0x21e6a4, emissive: 0x21e6a4, emissiveIntensity: 1.4 });
      var dot = new T.Mesh(new T.SphereGeometry(0.32, 16, 16), devMat);
      dot.position.set(x - RW / 2 + 0.7, baseY + 3.55, z + RD / 2 - 0.7);
      g.add(dot);

      g.position.set(0, 0, 0);
      building.add(g);

      self.roomMap[r.id] = {
        room: r, mesh: box, mat: mat, floor: f, baseY: baseY,
        group: g, deviceDot: dot, edgeMat: edge.material
      };

      // 首层显示房间名牌；其余层悬浮在房间上沿会拥挤，仅 hover 显示
      if (f === 0) {
        var tag = makeLabel(r.no, '#bfe8ff', 2.4);
        tag.position.set(x, baseY + 0.55, z);
        g.add(tag);
      }
    });

    // 楼层标签
    for (var f = 0; f < 4; f++) {
      var lb = makeLabel(['1F 公共服务区', '2F 研发办公区', '3F 智慧指挥区', '4F 机房会议区'][f], '#7fd6ff', 3.6);
      lb.position.set(-FW / 2 - 2.6, f * FH + 2.2, -FD / 2);
      building.add(lb);
    }

    // 屋顶设备与女儿墙
    var roofY = FH * 4;
    var parapet = new T.Mesh(new T.BoxGeometry(FW, 0.5, FD),
      new T.MeshStandardMaterial({ color: 0x0b2148, roughness: .6, metalness: .5, transparent: true, opacity: .85 }));
    parapet.position.y = roofY + 0.1; building.add(parapet);
    [['-6', -6, -3], ['5', 5, 2], ['-3', -3, 3.5]].forEach(function (d) {
      var unit = new T.Mesh(new T.BoxGeometry(2.2, 1.1, 1.6),
        new T.MeshStandardMaterial({ color: 0x123b75, roughness: .5, metalness: .6 }));
      unit.position.set(d[1], roofY + 0.85, d[2]); unit.castShadow = true;
      building.add(unit);
      building.add(new T.LineSegments(new T.EdgesGeometry(unit.geometry),
        new T.LineBasicMaterial({ color: 0x2f8bff, transparent: true, opacity: .6 })));
    });
    var antenna = new T.Mesh(new T.CylinderGeometry(0.05, 0.05, 3, 8),
      new T.MeshBasicMaterial({ color: 0x22e0ff }));
    antenna.position.set(0, roofY + 1.8, 0); building.add(antenna);
    var beacon = new T.Mesh(new T.SphereGeometry(0.22, 12, 12),
      new T.MeshBasicMaterial({ color: 0xff4d6a }));
    beacon.position.set(0, roofY + 3.4, 0); building.add(beacon);

    // 星点
    var starGeo = new T.BufferGeometry();
    var starPos = [];
    for (var s = 0; s < 260; s++) {
      starPos.push((Math.random() - .5) * 260, Math.random() * 90 + 10, (Math.random() - .5) * 260);
    }
    starGeo.setAttribute('position', new T.Float32BufferAttribute(starPos, 3));
    scene.add(new T.Points(starGeo, new T.PointsMaterial({ color: 0x8fc6ff, size: .35, transparent: true, opacity: .6 })));

    /* 选中环 & 告警光柱 */
    var selectRing = new T.Mesh(new T.TorusGeometry(RW / 2 + 0.4, 0.09, 8, 64),
      new T.MeshBasicMaterial({ color: 0x22e0ff, transparent: true, opacity: .9 }));
    selectRing.rotation.x = Math.PI / 2; selectRing.visible = false;
    scene.add(selectRing);

    var beam = new T.Mesh(new T.CylinderGeometry(0.18, 0.9, 14, 24, 1, true),
      new T.MeshBasicMaterial({ color: 0xff4d6a, transparent: true, opacity: .28, side: T.DoubleSide, depthWrite: false }));
    beam.visible = false; scene.add(beam);

    /* Hover 提示 */
    var tip = document.createElement('div');
    tip.className = 'td-tooltip';
    tip.style.cssText = 'position:absolute;pointer-events:none;z-index:20;display:none;padding:6px 10px;' +
      'font-size:12px;color:#d9f4ff;background:rgba(8,22,48,.88);border:1px solid rgba(34,224,255,.5);' +
      'border-radius:6px;white-space:nowrap;box-shadow:0 4px 16px rgba(0,0,0,.4)';
    container.appendChild(tip);

    var ray = new T.Raycaster();
    var mouse = new T.Vector2();
    var hoverId = null;
    var _moveEvt = null, _moveQueued = false;

    function eventRoom(ev) {
      var rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      ray.setFromCamera(mouse, camera);
      var hits = ray.intersectObjects(pickMeshes, false);
      return hits.length ? hits[0].object.userData.roomId : null;
    }
    renderer.domElement.addEventListener('pointermove', function (ev) {
      _moveEvt = ev;
      if (!_moveQueued) {
        _moveQueued = true;
        requestAnimationFrame(function () {
          _moveQueued = false;
          var ev2 = _moveEvt; if (!ev2) return;
          var id = eventRoom(ev2);
          hoverId = id;
          if (id) {
            var r = JA.Store.getRoom(id);
            renderer.domElement.style.cursor = 'pointer';
            tip.style.display = 'block';
            tip.style.left = (ev2.offsetX + 14) + 'px';
            tip.style.top = (ev2.offsetY + 14) + 'px';
            tip.innerHTML = '<b>' + r.no + ' ' + r.name + '</b><br>总能耗 ' + r.total +
              ' kWh · ' + (r.equipStatus === 'fault' ? '<span style="color:#ff6d86">设备故障</span>' :
              (r.equipStatus === 'stopped' ? '<span style="color:#9fb3d6">设备停机</span>' : '<span style="color:#21e6a4">设备运行</span>'));
          } else {
            renderer.domElement.style.cursor = 'grab';
            tip.style.display = 'none';
          }
        });
      }
    });
    var downXY = null;
    renderer.domElement.onpointerdown = function (e) { downXY = [e.clientX, e.clientY]; };
    renderer.domElement.onpointerup = function (e) {
      if (!downXY) return;
      var moved = Math.abs(e.clientX - downXY[0]) + Math.abs(e.clientY - downXY[1]);
      downXY = null;
      if (moved > 6) return;          // 拖拽旋转不触发点击
      var id = eventRoom(e);
      if (id) { self.selectRoom(id); self.onPick(JA.Store.getRoom(id)); }
    };

    /* 选中 + 定位飞行 */
    var _flyWP = new T.Vector3();
    function roomWorldPos(id) {
      var m = self.roomMap[id];
      if (!m) return null;
      m.mesh.getWorldPosition(_flyWP);
      return _flyWP;
    }
    this.selectRoom = function (id, fly) {
      self.selectedId = id;
      var m = self.roomMap[id];
      if (m) {
        var wp = roomWorldPos(id);
        selectRing.position.set(_flyWP.x, m.baseY + 0.22, _flyWP.z);
        selectRing.visible = true;
        beam.position.set(_flyWP.x, m.baseY + 7, _flyWP.z);
        if (fly !== false) flyTo(wp);
      } else selectRing.visible = false;
    };
    this.resetView = function () {
      flyTween = null;
      camera.position.set(30, 22, 34);
      ctrl.target.set(0, 8, 0);
      self.selectRoom(null, false);
    };
    var flyTween = null;
    function flyTo(target) {
      var startT = ctrl.target.clone(), endT = target.clone();
      var dirV = camera.position.clone().sub(ctrl.target).normalize();
      var startP = camera.position.clone(), endP = target.clone().add(dirV.multiplyScalar(15));
      endP.y = Math.max(endP.y, target.y + 5);
      flyTween = { t: 0, startT: startT, endT: endT, startP: startP, endP: endP };
    }

    /* 数据同步：仅在 Store 变更时执行（避免每帧遍历全部房间） */
    var _dataDirty = true;
    var _cachedAlertRoom = null;
    var _wp1 = new T.Vector3(), _wp2 = new T.Vector3();
    function syncData() {
      _cachedAlertRoom = stateAlertRoom();
      Object.keys(self.roomMap).forEach(function (id) {
        var rec = self.roomMap[id], r = rec.room;
        var lv = JA.Store.roomLevel(r);
        var col = LEVEL_COLOR[lv];
        if (rec.mat.color.getHex() !== col) {
          rec.mat.color.setHex(col);
          rec.mat.emissive.setHex(col);
        }
        var dc = r.equipStatus === 'fault' ? 0xff2d55 : (r.equipStatus === 'stopped' ? 0x8093b5 : 0x21e6a4);
        if (rec.deviceDot.material.color.getHex() !== dc) {
          rec.deviceDot.material.color.setHex(dc);
          rec.deviceDot.material.emissive.setHex(dc);
        }
      });
    }

    /* 每帧动画：仅处理闪烁/脉冲/选中环/光柱（轻量，不调 Store） */
    function syncFromStore(t) {
      if (_dataDirty) { syncData(); _dataDirty = false; }
      var pulseVal = Math.abs(Math.sin(t * 0.006));
      Object.keys(self.roomMap).forEach(function (id) {
        var rec = self.roomMap[id];
        var hasAlert = JA.Store.roomHasAlert(rec.room);
        if (hasAlert) {
          rec.mat.emissiveIntensity = 0.45 + pulseVal * 0.9;
          rec.edgeMat.color.setHex(0xff4d6a);
          rec.edgeMat.opacity = .55 + pulseVal * .45;
        } else {
          rec.mat.emissiveIntensity = id === self.selectedId ? .8 : .4;
          rec.edgeMat.color.setHex(0x9fe8ff);
          rec.edgeMat.opacity = .5;
        }
        if (rec.room.equipStatus === 'fault')
          rec.deviceDot.material.emissiveIntensity = 1 + Math.abs(Math.sin(t * .01)) * 1.6;
      });
      if (self.selectedId) {
        var m = self.roomMap[self.selectedId];
        if (m) {
          m.mesh.getWorldPosition(_wp1);
          selectRing.position.set(_wp1.x, m.baseY + 0.22, _wp1.z);
          var selAlert = JA.Store.roomHasAlert(self.selectedId);
          selectRing.material.color.setHex(selAlert ? 0xff4d6a : 0x22e0ff);
        }
      }
      beam.visible = !!_cachedAlertRoom;
      if (_cachedAlertRoom) {
        var am2 = self.roomMap[_cachedAlertRoom];
        if (am2) {
          am2.mesh.getWorldPosition(_wp2);
          beam.position.set(_wp2.x, am2.baseY + 7, _wp2.z);
          beam.material.opacity = .16 + Math.abs(Math.sin(t * .005)) * .22;
        }
      }
      ring1.rotation.z = t * 0.00012;
      ring2.rotation.z = -t * 0.00009;
      var bc = Math.sin(t * .006) > 0 ? 0xff4d6a : 0x22e0ff;
      if (beacon.material.color.getHex() !== bc) beacon.material.color.setHex(bc);
    }
    function stateAlertRoom() {
      var al = JA.Store.state.alerts.filter(function (a) { return a.active && a.level === '告警' && a.roomId; });
      return al.length ? al[0].roomId : null;
    }

    /* 自适应尺寸 */
    function resize() {
      var w = container.clientWidth || 600, h = container.clientHeight || 400;
      camera.aspect = w / h; camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    }
    this.resize = resize;
    var ro = new ResizeObserver(resize);
    ro.observe(container);
    resize();

    /* Store 变更 → 标记需重算 */
    var _subOff = JA.Store.subscribe(function () { _dataDirty = true; });

    /* 渲染循环 */
    var clock = new T.Clock();
    function loop(t) {
      if (self._disposed) return;
      self._raf = requestAnimationFrame(loop);
      if (flyTween) {
        flyTween.t = Math.min(1, flyTween.t + 0.045);
        var e = 1 - Math.pow(1 - flyTween.t, 3);
        camera.position.lerpVectors(flyTween.startP, flyTween.endP, e);
        ctrl.target.lerpVectors(flyTween.startT, flyTween.endT, e);
        if (flyTween.t >= 1) flyTween = null;
      }
      syncFromStore(t || 0);
      ctrl.update();
      renderer.render(scene, camera);
    }
    loop();

    /* 销毁（页面切换时释放 WebGL 上下文） */
    this.dispose = function () {
      self._disposed = true;
      cancelAnimationFrame(self._raf);
      if (_subOff) _subOff();
      ro.disconnect();
      scene.traverse(function (o) {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          if (Array.isArray(o.material)) o.material.forEach(function (m) { if (m.map) m.map.dispose(); m.dispose(); });
          else { if (o.material.map) o.material.map.dispose(); o.material.dispose(); }
        }
      });
      renderer.dispose();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
      if (tip.parentNode) tip.parentNode.removeChild(tip);
    };
  }

  JA.BuildingScene = BuildingScene;
})();
