/* =====================================================================
 * 城枢慧眼 —— 双视图数字孪生 3D 场景（Three.js r128 / 无新增依赖）
 *   JA.TwinCampus  运维总览：园区级蓝光玻璃建筑群（点击建筑下钻）
 *   JA.TwinTower   楼层结构：17层装配式剪力墙透明模型 + 136个嵌入式套筒
 * ===================================================================== */
(function () {
  'use strict';
  var T = window.THREE;

  /* 通用发光文字标签 */
  function sprite(text, color, scaleW) {
    var c = document.createElement('canvas');
    c.width = 320; c.height = 80;
    var g = c.getContext('2d');
    g.font = 'bold 30px Microsoft YaHei';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = color; g.shadowBlur = 14;
    g.fillStyle = color;
    g.fillText(text, 160, 40);
    var sp = new T.Sprite(new T.SpriteMaterial({
      map: new T.CanvasTexture(c), transparent: true, depthWrite: false, opacity: .95 }));
    sp.scale.set(scaleW || 4, scaleW ? scaleW * 0.25 : 1, 1);
    return sp;
  }

  /* 公共渲染器/控制器/拾取节流工厂 */
  function baseView(container, fov, camPos, target, autoRotate) {
    var scene = new T.Scene();
    scene.background = null;
    scene.fog = new T.FogExp2(0x04101f, 0.0065);
    var camera = new T.PerspectiveCamera(fov || 48, 1, 0.1, 800);
    camera.position.copy(camPos);
    var renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    container.appendChild(renderer.domElement);
    renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;cursor:grab';
    var ctrl = new T.OrbitControls(camera, renderer.domElement);
    ctrl.enableDamping = true; ctrl.dampingFactor = .08;
    ctrl.maxPolarAngle = Math.PI * .495;
    ctrl.target.copy(target);
    ctrl.autoRotate = !!autoRotate; ctrl.autoRotateSpeed = .35;
    return { scene: scene, camera: camera, renderer: renderer, ctrl: ctrl };
  }

  function bindPick(container, renderer, camera, pickMeshes, getUserKey, onPick, tipHtml, onEmpty) {
    var ray = new T.Raycaster(), mv = new T.Vector2();
    var tip = document.createElement('div');
    tip.style.cssText = 'position:absolute;pointer-events:none;z-index:20;display:none;padding:6px 10px;' +
      'font-size:12px;color:#d9f4ff;background:rgba(8,22,48,.9);border:1px solid rgba(34,224,255,.5);' +
      'border-radius:6px;white-space:nowrap;box-shadow:0 4px 16px rgba(0,0,0,.4)';
    container.appendChild(tip);
    var queued = false, lastEvt = null;
    function chainVisible(rec) {
      // intersectObjects 返回的是相交记录 {object,...}，需取其 object 沿父链判断
      var o = rec && rec.object ? rec.object : rec;
      while (o) { if (o.visible === false) return false; o = o.parent; }
      return true;
    }
    function hit(ev) {
      var rect = renderer.domElement.getBoundingClientRect();
      mv.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      mv.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      ray.setFromCamera(mv, camera);
      var hs = ray.intersectObjects(pickMeshes, false).filter(chainVisible);
      return hs.length ? hs[0] : null;
    }
    // 暴露同步拾取能力（供调试/自动化检测复用，不影响交互行为）
    tip.pickHit = function (ev) { var r = hit(ev); return r ? r.object : null; };
    renderer.domElement.addEventListener('pointermove', function (ev) {
      lastEvt = ev;
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () {
        queued = false;
        var ev2 = lastEvt; if (!ev2) return;
        var rec = hit(ev2), obj = rec ? rec.object : null, key = obj ? getUserKey(obj) : null;
        if (key) {
          renderer.domElement.style.cursor = 'pointer';
          tip.style.display = 'block';
          tip.style.left = (ev2.offsetX + 14) + 'px';
          tip.style.top = (ev2.offsetY + 14) + 'px';
          tip.innerHTML = tipHtml(key);
        } else { renderer.domElement.style.cursor = 'grab'; tip.style.display = 'none'; }
      });
    });
    var dn = null;
    renderer.domElement.onpointerdown = function (e) { dn = [e.clientX, e.clientY]; };
    renderer.domElement.onpointerup = function (e) {
      if (!dn) return;
      var moved = Math.abs(e.clientX - dn[0]) + Math.abs(e.clientY - dn[1]); dn = null;
      if (moved > 6) return;
      var rec = hit(e), obj = rec ? rec.object : null, key = obj ? getUserKey(obj) : null;
      if (key) onPick(key, obj, rec);
      else if (onEmpty) onEmpty();
    };
    return tip;
  }

  function flyTo(ctrl, camera, target, distance, duration) {
    var startT = ctrl.target.clone(), endT = target.clone();
    var dirV = camera.position.clone().sub(ctrl.target).normalize();
    var startP = camera.position.clone(), endP = target.clone().add(dirV.multiplyScalar(distance));
    var start = performance.now(), dur = duration || 700;
    function step(now) {
      var k = Math.min(1, (now - start) / dur);
      var e = 1 - Math.pow(1 - k, 3);
      camera.position.lerpVectors(startP, endP, e);
      ctrl.target.lerpVectors(startT, endT, e);
      ctrl.update();
      if (k < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ================================================================
   * 136 个套筒节点台账（17层 × 8节点/层，嵌入剪力墙连接处）
   * ================================================================ */
  var FLOORS = 17, FH = 1.05, PER = 8;
  var BW = 9, BD = 6.4;
  var POS_NAMES = ['东南角柱纵筋套筒', '西南角柱纵筋套筒', '西北角柱纵筋套筒', '东北角柱纵筋套筒',
    '核心筒东南梁节点套筒', '核心筒西南梁节点套筒', '核心筒西北梁节点套筒', '核心筒东北梁节点套筒'];
  // 8 节点平面坐标：4 外围角柱 + 4 核心筒连接
  var POS_XZ = [
    [BW / 2, BD / 2], [-BW / 2, BD / 2], [-BW / 2, -BD / 2], [BW / 2, -BD / 2],
    [0.8, 0.7], [-0.8, 0.7], [-0.8, -0.7], [0.8, -0.7]
  ];
  var NODES = null;
  function pseudo(a, b) { var x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); }
  function buildNodes() {
    if (NODES) return NODES;
    var seeds = {};
    (JA.Store.state.sleeves || []).forEach(function (s) { seeds[s.id] = s; });
    var special = { 3: { 2: 'S-07' }, 2: { 0: 'S-05' } };          // 4F红色告警 / 3F黄色预警（真实台账）
    var pending = { 5: [1], 8: [3], 11: [0], 14: [2] };             // 整改待验收节点
    NODES = [];
    for (var f = 0; f < FLOORS; f++) {
      for (var p = 0; p < PER; p++) {
        var sp = special[f] && special[f][p];
        var isPend = pending[f] && pending[f].indexOf(p) >= 0;
        var seed = sp ? seeds[sp] : null;
        var status = 'normal', stress = Math.round(148 + pseudo(f, p) * 72);
        if (seed) { status = seed.status; stress = seed.stress; }
        else if (isPend) { status = 'warn'; stress = Math.round(238 + pseudo(p, f) * 30); }
        var xz = POS_XZ[p];
        var id = seed ? seed.id : 'S-' + ('00' + (f * PER + p + 1)).slice(-3);
        NODES.push({
          id: id, floor: f + 1, posIndex: p,
          type: p < 4 ? '柱纵筋套筒' : '梁节点套筒',
          name: POS_NAMES[p] + ' #' + (sp || ('F' + (f + 1) + '-' + (p + 1))),
          bim: 'X=' + (6.2 + xz[0]).toFixed(1) + ' Y=' + (4.4 + xz[1]).toFixed(1) +
            ' Z=' + (f * FH + FH / 2).toFixed(1) + 'm',
          stress: stress,
          status: status,
          aiResult: status === 'alarm' ? '红色告警' : (status === 'warn' ? (seed ? '黄色预警' : '整改待验收') : '正常'),
          health: status === 'alarm' ? 61 : (status === 'warn' ? (seed ? 78 : 84) : Math.round(91 + pseudo(p, f) * 8)),
          grout: status === 'alarm' ? '灌浆不密实(疑似缺陷)' : (status === 'warn' ? '复检中/待验收' : '灌浆饱满'),
          time: seed ? seed.time : null,
          x: xz[0], y: f * FH + FH / 2, z: xz[1]
        });
      }
    }
    return NODES;
  }

  /* ================================================================
   * 园区总览场景
   * ================================================================ */
  function CampusScene(container, opts) {
    opts = opts || {};
    var self = this;
    var disposed = false, raf = 0;
    var base = baseView(container, 46, new T.Vector3(38, 32, 42), new T.Vector3(0, 3, 0), true);
    var scene = base.scene, camera = base.camera, renderer = base.renderer, ctrl = base.ctrl;
    ctrl.minDistance = 18; ctrl.maxDistance = 110;

    scene.add(new T.AmbientLight(0x8fb6ff, .7));
    var dir = new T.DirectionalLight(0xcfe6ff, .75);
    dir.position.set(24, 40, 18); scene.add(dir);
    var pl1 = new T.PointLight(0x22e0ff, .9, 160); pl1.position.set(-30, 16, -20); scene.add(pl1);
    var pl2 = new T.PointLight(0x4d7dff, .7, 160); pl2.position.set(30, 12, 24); scene.add(pl2);

    /* 地面 */
    var ground = new T.Mesh(new T.CircleGeometry(70, 72),
      new T.MeshStandardMaterial({ color: 0x06152e, roughness: .95, metalness: .2, transparent: true, opacity: .96 }));
    ground.rotation.x = -Math.PI / 2; scene.add(ground);
    var grid = new T.GridHelper(140, 56, 0x1f6fd0, 0x10294f);
    grid.material.transparent = true; grid.material.opacity = .22; scene.add(grid);

    var world = new T.Group(); scene.add(world);

    /* 道路（十字 + 环） */
    var roadMat = new T.MeshBasicMaterial({ color: 0x0a1d3a, transparent: true, opacity: .85 });
    function road(w, d, x, z) {
      var r = new T.Mesh(new T.PlaneGeometry(w, d), roadMat);
      r.rotation.x = -Math.PI / 2; r.position.set(x, 0.02, z); world.add(r);
    }
    road(120, 11, 0, 0); road(11, 96, 0, 0);
    var lineMat = new T.MeshBasicMaterial({ color: 0x2ad6ff, transparent: true, opacity: .55 });
    [[-5.5, 0, 120, .12], [5.5, 0, 120, .12], [0, -5.5, .12, 96], [0, 5.5, .12, 96]].forEach(function (a) {
      var e = new T.Mesh(new T.BoxGeometry(a[2], .03, a[3]), lineMat);
      e.position.set(a[0], .05, a[1]); world.add(e);
    });

    /* 绿化景观 */
    var plotMat = new T.MeshBasicMaterial({ color: 0x126b4a, transparent: true, opacity: .32, side: T.DoubleSide });
    [[-13, 4, 4.2], [11, 5, 3.4], [10, -15, 3.8], [-10, -15, 3.2], [26, 3, 2.8], [-28, 3, 3]].forEach(function (q) {
      var c = new T.Mesh(new T.CircleGeometry(q[2], 28), plotMat);
      c.rotation.x = -Math.PI / 2; c.position.set(q[0], .04, q[1]); world.add(c);
    });
    var trunkGeo = new T.CylinderGeometry(.08, .1, .7, 6);
    var trunkMat = new T.MeshStandardMaterial({ color: 0x3a5234, roughness: 1 });
    var leafGeo = new T.ConeGeometry(.55, 1.5, 7);
    var leafMat = new T.MeshStandardMaterial({ color: 0x1f9d6a, emissive: 0x0a3a26, emissiveIntensity: .5, roughness: .8 });
    for (var ti = 0; ti < 28; ti++) {
      var ang = pseudo(ti, 3) * Math.PI * 2, rad = 24 + pseudo(ti, 7) * 34;
      var tx = Math.cos(ang) * rad, tz = Math.sin(ang) * rad * .72;
      if (Math.abs(tz) < 6 || Math.abs(tx) < 6) continue;
      var tr = new T.Mesh(trunkGeo, trunkMat); tr.position.set(tx, .35, tz); world.add(tr);
      var lf = new T.Mesh(leafGeo, leafMat); lf.position.set(tx, 1.25, tz); world.add(lf);
    }

    /* 建筑群 */
    var BUILDINGS = [
      { id: 'A', name: '天津绿色办公主楼', x: -4, z: 3, w: 9, d: 7, floors: 17, main: true },
      { id: 'B', name: '研发实验楼', x: 17, z: -7, w: 7, d: 6, floors: 10 },
      { id: 'C', name: '综合服务楼', x: -19, z: -9, w: 7, d: 6, floors: 8 },
      { id: 'D', name: '数据中心', x: 18, z: 13, w: 6, d: 5, floors: 7 },
      { id: 'E', name: '会议中心', x: -18, z: 13, w: 7, d: 5.5, floors: 5 },
      { id: 'F', name: '综合能源站', x: 5, z: -20, w: 6, d: 5, floors: 4 },
      { id: 'G', name: '光储一体化充电站', x: -7, z: 20, w: 8, d: 4.5, floors: 3 }
    ];
    var pickShells = [], mainRec = null;
    BUILDINGS.forEach(function (b) {
      var H = b.floors * FH;
      var g = new T.Group(); g.position.set(b.x, 0, b.z); world.add(g); b._group = g;
      var shellMat = new T.MeshStandardMaterial({
        color: b.main ? 0x2f9bff : 0x2b7fd6, emissive: 0x0c3f78, emissiveIntensity: b.main ? .8 : .5,
        transparent: true, opacity: b.main ? .3 : .22, metalness: .65, roughness: .18, depthWrite: false
      });
      var shell = new T.Mesh(new T.BoxGeometry(b.w, H, b.d), shellMat);
      shell.position.y = H / 2; shell.userData.building = b; g.add(shell); pickShells.push(shell);
      b._shell = shell;
      var edge = new T.LineSegments(new T.EdgesGeometry(shell.geometry),
        new T.LineBasicMaterial({ color: b.main ? 0x6fe3ff : 0x3aa0e8, transparent: true, opacity: .9 }));
      edge.position.copy(shell.position); g.add(edge);
      // 内部发光楼层
      var slabGeo = new T.BoxGeometry(b.w * .96, .025, b.d * .96);
      var slabMat = new T.MeshBasicMaterial({ color: 0x35c8ff, transparent: true, opacity: .28 });
      for (var f = 1; f < b.floors; f++) {
        var sl = new T.Mesh(slabGeo, slabMat); sl.position.y = f * FH; g.add(sl);
      }
      // 立面发光点
      var pp = [];
      for (var i = 0; i < 56; i++) {
        var face = i % 2, fx, fz;
        if (face === 0) { fx = -b.w / 2 + pseudo(i, 1) * b.w; fz = b.d / 2 + .02; }
        else { fx = b.w / 2 + .02; fz = -b.d / 2 + pseudo(i, 2) * b.d; }
        pp.push(fx, FH + pseudo(i, 3) * (H - FH * 1.5), fz);
      }
      var pg = new T.BufferGeometry();
      pg.setAttribute('position', new T.Float32BufferAttribute(pp, 3));
      var pts = new T.Points(pg, new T.PointsMaterial({
        color: b.main ? 0x8ff0ff : 0x5ec8ff, size: .16, transparent: true, opacity: .8 }));
      g.add(pts); b._pts = pts;
      // 屋顶设备
      var roofMat = new T.MeshStandardMaterial({ color: 0x14508f, roughness: .5, metalness: .6, transparent: true, opacity: .8 });
      for (var u = 0; u < (b.main ? 4 : 2); u++) {
        var unit = new T.Mesh(new T.BoxGeometry(.8, .5, .7), roofMat);
        unit.position.set(-b.w / 2.8 + u * .95, H + .28, -b.d / 4); g.add(unit);
      }
      var lb = sprite(b.name, b.main ? '#9ff2ff' : '#7fc8f0', b.main ? 5.4 : 3.6);
      lb.position.set(0, H + 1.5, 0); g.add(lb);
      if (b.main) {
        var ring = new T.Mesh(new T.TorusGeometry(Math.max(b.w, b.d) * .82, .07, 8, 96),
          new T.MeshBasicMaterial({ color: 0x22e0ff, transparent: true, opacity: .55 }));
        ring.rotation.x = Math.PI / 2; ring.position.y = .06; g.add(ring);
        var beam = new T.Mesh(new T.CylinderGeometry(.25, 1.4, 26, 28, 1, true),
          new T.MeshBasicMaterial({ color: 0x2ad6ff, transparent: true, opacity: .14, side: T.DoubleSide, depthWrite: false }));
        beam.position.y = 13; g.add(beam);
        mainRec = { ring: ring, beam: beam };
      }
    });

    /* 星点 */
    var starPos = [];
    for (var s = 0; s < 220; s++)
      starPos.push((pseudo(s, 9) - .5) * 300, 20 + pseudo(s, 4) * 90, (pseudo(s, 6) - .5) * 300);
    var sg = new T.BufferGeometry();
    sg.setAttribute('position', new T.Float32BufferAttribute(starPos, 3));
    scene.add(new T.Points(sg, new T.PointsMaterial({ color: 0x8fc6ff, size: .4, transparent: true, opacity: .55 })));

    /* 建筑选中态（点击选中高亮，不跳转；点击空白取消） */
    var selectedId = null;
    BUILDINGS.forEach(function (b) { b._baseEm = b.main ? .8 : .5; });
    this.selectBuilding = function (id) {
      selectedId = id;
      BUILDINGS.forEach(function (b) {
        if (b._shell) b._shell.material.emissiveIntensity = (b.id === id) ? 1.6 : b._baseEm;
        if (b._pts) b._pts.material.size = (b.id === id) ? .26 : .16;
      });
    };
    this.getSelected = function () { return selectedId; };

    /* 楼层选择（指挥大屏楼层选择器联动：主楼 A 按层高亮，其余楼层半透明） */
    var mainB = null;
    BUILDINGS.forEach(function (b) { if (b.main) mainB = b; });
    var floorSegs = [], floorMode = 0;
    if (mainB && mainB._group) {
      var segGeo = new T.BoxGeometry(mainB.w * .98, FH * .9, mainB.d * .98);
      for (var fi = 0; fi < mainB.floors; fi++) {
        var segMat = new T.MeshStandardMaterial({
          color: 0x2f9bff, emissive: 0x1899d6, emissiveIntensity: .4,
          transparent: true, opacity: .05, roughness: .3, metalness: .4, depthWrite: false });
        var seg = new T.Mesh(segGeo, segMat);
        seg.position.set(0, fi * FH + FH / 2, 0);
        seg.visible = false;
        mainB._group.add(seg);
        floorSegs.push(seg);
      }
    }
    this.setFloor = function (fl) {
      floorMode = fl > 0 ? fl : 0;
      if (mainB && mainB._shell) mainB._shell.material.opacity = floorMode ? .05 : .3;
      floorSegs.forEach(function (seg, i) {
        seg.visible = !!floorMode;
        var on = floorMode && (i + 1 === floorMode);
        seg.material.opacity = on ? .72 : .05;
        seg.material.emissiveIntensity = on ? 1.6 : .35;
        seg.material.color.setHex(on ? 0x7fe8ff : 0x2f9bff);
      });
    };
    this.getFloor = function () { return floorMode; };

    /* 重置视角 + 异常定位（指挥大屏复用） */
    var initCamPos = new T.Vector3(38, 32, 42);
    var initTgt = new T.Vector3(0, 3, 0);
    this.resetView = function () {
      self.selectBuilding(null);
      flyTo(ctrl, camera, initTgt, 52, 600);
    };
    this.locateAlert = function () {
      // 主塔楼 A 标记为异常定位目标
      var target = BUILDINGS.filter(function (b) { return b.main; })[0] || BUILDINGS[0];
      if (!target) return null;
      self.selectBuilding(target.id);
      var tgt = new T.Vector3(target.x, target.floors * FH * 0.5, target.z);
      flyTo(ctrl, camera, tgt, 26, 600);
      return target;
    };

    bindPick(container, renderer, camera, pickShells,
      function (obj) { return obj.userData.building; },
      function (b, obj, rec) {
        self.selectBuilding(b.id);
        // 由击中点世界高度推算楼层（1 起）
        var fl = 0;
        if (rec && rec.point) fl = Math.max(1, Math.min(b.floors, Math.floor(rec.point.y / FH) + 1));
        if (opts.onPickBuilding) opts.onPickBuilding(b, fl);
      },
      function (b) { return '<b style="color:#9ff2ff">' + b.name + '</b><br>点击查看该栋能源明细 · 再点空白返回总览'; },
      function () {
        self.selectBuilding(null);
        if (opts.onPickEmpty) opts.onPickEmpty();
      });

    function resize() {
      var w = container.clientWidth || 600, h = container.clientHeight || 400;
      camera.aspect = w / h; camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    }
    var ro = new ResizeObserver(resize); ro.observe(container); resize();

    function loop(now) {
      if (disposed) return;
      raf = requestAnimationFrame(loop);
      var t = now || 0;
      if (mainRec) {
        mainRec.ring.rotation.z = t * .0006;
        var sc = 1 + Math.sin(t * .002) * .08;
        mainRec.ring.scale.set(sc, sc, 1);
        mainRec.beam.material.opacity = .1 + Math.abs(Math.sin(t * .0016)) * .12;
      }
      BUILDINGS.forEach(function (b, i) {
        if (b._pts) b._pts.material.opacity = (floorMode && b.main) ? .18 :
          .55 + Math.abs(Math.sin(t * .0012 + i)) * .35;
      });
      ctrl.update();
      renderer.render(scene, camera);
    }
    loop();

    this.dispose = function () {
      disposed = true; cancelAnimationFrame(raf); ro.disconnect();
      scene.traverse(function (o) {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          if (Array.isArray(o.material)) o.material.forEach(function (m) { if (m.map) m.map.dispose(); m.dispose(); });
          else { if (o.material.map) o.material.map.dispose(); o.material.dispose(); }
        }
      });
      renderer.dispose();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    };
  }

  /* ================================================================
   * 17层楼层结构场景
   * ================================================================ */
  function TowerScene(container, opts) {
    opts = opts || {};
    var self = this;
    var nodes = buildNodes();
    var disposed = false, raf = 0;
    var base = baseView(container, 46, new T.Vector3(15, 13.5, 17), new T.Vector3(0, 7.5, 0), true);
    var scene = base.scene, camera = base.camera, renderer = base.renderer, ctrl = base.ctrl;
    ctrl.minDistance = 6; ctrl.maxDistance = 48;
    // 用户交互时暂停自动环绕，空闲 6s 后恢复（与总览视图体验一致）
    ctrl.addEventListener('start', function () { ctrl.autoRotate = false; });
    var idleT = 0;
    ctrl.addEventListener('end', function () {
      clearTimeout(idleT);
      idleT = setTimeout(function () { ctrl.autoRotate = true; }, 6000);
    });

    scene.add(new T.AmbientLight(0x9fc0ff, .75));
    var dir = new T.DirectionalLight(0xdcebff, .8); dir.position.set(16, 30, 12); scene.add(dir);
    var pl = new T.PointLight(0x22e0ff, 1, 60); pl.position.set(-12, 10, -10); scene.add(pl);

    var ground = new T.Mesh(new T.CircleGeometry(26, 56),
      new T.MeshStandardMaterial({ color: 0x06152e, roughness: .95, transparent: true, opacity: .9 }));
    ground.rotation.x = -Math.PI / 2; scene.add(ground);
    var grid = new T.GridHelper(48, 32, 0x1f6fd0, 0x10294f);
    grid.material.transparent = true; grid.material.opacity = .25; scene.add(grid);

    var root = new T.Group(); scene.add(root);

    /* 共享材质与几何（透明剪力墙 / 楼板 / 角柱） */
    var wallMat = new T.MeshStandardMaterial({
      color: 0x2f8bff, emissive: 0x0a2f63, emissiveIntensity: .8,
      transparent: true, opacity: .17, metalness: .5, roughness: .25, depthWrite: false
    });
    var slabMat = new T.MeshStandardMaterial({
      color: 0x17468a, emissive: 0x0a2a55, transparent: true, opacity: .45,
      metalness: .5, roughness: .4, depthWrite: false
    });
    var colMat = new T.MeshStandardMaterial({
      color: 0x4d97e0, emissive: 0x123c75, emissiveIntensity: .6,
      transparent: true, opacity: .5, metalness: .6, roughness: .3
    });
    var edgeMat = new T.LineBasicMaterial({ color: 0x46b8ff, transparent: true, opacity: .55 });

    // 剪力墙段：外围 8 段（留窗洞间隙）+ 核心筒 4 段 → [w, d, x, z]
    var segW = (BD - 1.4) / 2, segD = (BW - 1.4) / 2, t = .12;
    var WALLS = [];
    // 沿 X 墙（z=±BD/2）：两段
    [BD / 2, -BD / 2].forEach(function (z) {
      WALLS.push([segD, t, -BW / 4, z], [segD, t, BW / 4, z]);
    });
    // 沿 Z 墙（x=±BW/2）：两段
    [BW / 2, -BW / 2].forEach(function (x) {
      WALLS.push([t, segW, x, -BD / 4], [t, segW, x, BD / 4]);
    });
    // 核心筒 4 段
    [[0, .78], [0, -.78]].forEach(function (a) { WALLS.push([1.5, .1, a[0], a[1]]); });
    [[.82, 0], [-.82, 0]].forEach(function (a) { WALLS.push([.1, 1.35, a[0], a[1]]); });

    var slabGeo = new T.BoxGeometry(BW + .5, .08, BD + .5);
    var colGeoOut = new T.BoxGeometry(.3, FH * .96, .3);
    var colGeoCore = new T.BoxGeometry(.22, FH * .9, .22);
    var wallGeos = {};
    function geoFor(w, d) {
      var key = w + '_' + d;
      if (!wallGeos[key]) wallGeos[key] = new T.BoxGeometry(w, FH * .92, d);
      return wallGeos[key];
    }

    var sleeveGeo = new T.CylinderGeometry(.065, .065, .52, 10);
    var STATUS_COLOR = { normal: 0x21e6a4, warn: 0xffc83d, alarm: 0xff2d55 };
    var sleeveMats = {
      normal: new T.MeshStandardMaterial({ color: 0x21e6a4, emissive: 0x21e6a4, emissiveIntensity: .9, roughness: .3 }),
      warn: new T.MeshStandardMaterial({ color: 0xffc83d, emissive: 0xffc83d, emissiveIntensity: 1, roughness: .3 }),
      alarm: new T.MeshStandardMaterial({ color: 0xff2d55, emissive: 0xff2d55, emissiveIntensity: 1.1, roughness: .3 })
    };
    var nodeMeshes = [], floorGroups = [], nodeMap = {};

    for (var f = 0; f < FLOORS; f++) {
      var fg = new T.Group(); root.add(fg); floorGroups.push(fg);
      var y0 = f * FH;
      // 楼板 + 轮廓
      var slab = new T.Mesh(slabGeo, slabMat); slab.position.y = y0; fg.add(slab);
      var se = new T.LineSegments(new T.EdgesGeometry(slabGeo), edgeMat); se.position.y = y0; fg.add(se);
      // 剪力墙
      WALLS.forEach(function (wd) {
        var wm = new T.Mesh(geoFor(wd[0], wd[1]), wallMat);
        wm.position.set(wd[2], y0 + FH / 2, wd[3]); fg.add(wm);
      });
      // 8 个连接处角柱（套筒嵌入其中）
      POS_XZ.forEach(function (xz, p) {
        var col = new T.Mesh(p < 4 ? colGeoOut : colGeoCore, colMat);
        col.position.set(xz[0], y0 + FH / 2, xz[1]); fg.add(col);
      });
      // 套筒棍
      nodes.filter(function (n) { return n.floor === f + 1; }).forEach(function (n) {
        var sm = new T.Mesh(sleeveGeo, sleeveMats[n.status]);
        sm.position.set(n.x, n.y, n.z);
        sm.userData.nodeId = n.id;
        fg.add(sm);
        nodeMeshes.push(sm);
        nodeMap[n.id] = { mesh: sm, data: n, group: fg };
      });
    }

    /* 屋顶女儿墙 + 信标 */
    var roofY = FLOORS * FH;
    var parapet = new T.Mesh(new T.BoxGeometry(BW + .6, .35, BD + .6),
      new T.MeshStandardMaterial({ color: 0x17468a, transparent: true, opacity: .6, metalness: .5 }));
    parapet.position.y = roofY + .12; root.add(parapet);
    var beacon = new T.Mesh(new T.SphereGeometry(.18, 12, 12), new T.MeshBasicMaterial({ color: 0x22e0ff }));
    beacon.position.set(0, roofY + 1.1, 0); root.add(beacon);

    /* 告警光柱 / 选中环 / 楼层标签 */
    var alarmNode = nodes.filter(function (n) { return n.status === 'alarm'; })[0];
    var beam = new T.Mesh(new T.CylinderGeometry(.12, .5, 2.4, 20, 1, true),
      new T.MeshBasicMaterial({ color: 0xff2d55, transparent: true, opacity: .3, side: T.DoubleSide, depthWrite: false }));
    beam.position.set(alarmNode.x, alarmNode.y + 1.1, alarmNode.z); root.add(beam);
    var selRing = new T.Mesh(new T.TorusGeometry(.28, .035, 8, 32),
      new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .95 }));
    selRing.rotation.x = Math.PI / 2; selRing.visible = false; root.add(selRing);
    var floorLb = sprite('全部楼层', '#9ff2ff', 2.6);
    floorLb.position.set(0, 1.4, BD / 2 + 1.4); root.add(floorLb);

    var tip = bindPick(container, renderer, camera, nodeMeshes,
      function (obj) { return obj.userData.nodeId; },
      function (id) { self.selectNode(id, true); if (opts.onPickNode) opts.onPickNode(nodeMap[id].data); },
      function (id) {
        var n = nodeMap[id].data;
        var c = n.status === 'alarm' ? '#ff7d94' : (n.status === 'warn' ? '#ffd970' : '#7ef3c8');
        return '<b style="color:' + c + '">' + n.id + '</b> ' + n.name +
          '<br>应力 ' + n.stress + ' MPa（限值300） · ' + n.aiResult;
      });

    this.selectNode = function (id, fly) {
      var rec = nodeMap[id];
      if (!rec) return;
      selRing.visible = true;
      selRing.position.set(rec.data.x, rec.data.y, rec.data.z);
      if (fly) flyTo(ctrl, camera, new T.Vector3(rec.data.x, rec.data.y, rec.data.z), 6.5, 600);
    };

    /* 楼层切换：其他楼层隐藏，相机聚焦 */
    var curFloor = -1;
    function setLabel(txt) {
      var c = document.createElement('canvas'); c.width = 320; c.height = 80;
      var g = c.getContext('2d'); g.font = 'bold 30px Microsoft YaHei'; g.textAlign = 'center';
      g.textBaseline = 'middle'; g.shadowColor = '#9ff2ff'; g.shadowBlur = 14; g.fillStyle = '#9ff2ff';
      g.fillText(txt, 160, 40);
      if (floorLb.material.map) floorLb.material.map.dispose();
      floorLb.material.map = new T.CanvasTexture(c);
      floorLb.material.needsUpdate = true;
    }
    this.setFloor = function (fl) {
      curFloor = fl;
      floorGroups.forEach(function (fg, i) { fg.visible = fl < 0 || i === fl; });
      beam.visible = fl < 0 || alarmNode.floor - 1 === fl;
      if (fl < 0) {
        setLabel('全部楼层');
        floorLb.position.set(0, 1.4, BD / 2 + 1.4);
        flyTo(ctrl, camera, new T.Vector3(0, 7.5, 0), 22, 700);
      } else {
        setLabel('装配式剪力墙结构层');
        floorLb.position.set(0, fl * FH + FH + .7, BD / 2 + 1.4);
        flyTo(ctrl, camera, new T.Vector3(0, fl * FH + FH / 2, 0), 9, 650);
      }
    };
    this.getFloor = function () { return curFloor; };

    function resize() {
      var w = container.clientWidth || 600, h = container.clientHeight || 400;
      camera.aspect = w / h; camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    }
    var ro = new ResizeObserver(resize); ro.observe(container); resize();

    function loop(now) {
      if (disposed) return;
      raf = requestAnimationFrame(loop);
      var t = now || 0;
      // 状态节点脉冲
      for (var id in nodeMap) {
        var rec = nodeMap[id], st = rec.data.status;
        if (st === 'alarm') rec.mesh.material.emissiveIntensity = 1 + Math.abs(Math.sin(t * .007)) * 1.4;
        else if (st === 'warn') rec.mesh.material.emissiveIntensity = .8 + Math.abs(Math.sin(t * .004)) * .45;
      }
      if (beam.visible) beam.material.opacity = .16 + Math.abs(Math.sin(t * .005)) * .24;
      if (selRing.visible) {
        var sc = 1 + Math.sin(t * .006) * .15;
        selRing.scale.set(sc, sc, 1);
        selRing.material.color.setHex(Math.sin(t * .006) > 0 ? 0xffffff : 0x6fe3ff);
      }
      beacon.material.color.setHex(Math.sin(t * .006) > 0 ? 0xff4d6a : 0x22e0ff);
      ctrl.update();
      renderer.render(scene, camera);
    }
    loop();

    this.dispose = function () {
      disposed = true; cancelAnimationFrame(raf); ro.disconnect(); clearTimeout(idleT);
      if (tip.parentNode) tip.parentNode.removeChild(tip);
      scene.traverse(function (o) {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          if (Array.isArray(o.material)) o.material.forEach(function (m) { if (m.map) m.map.dispose(); m.dispose(); });
          else { if (o.material.map) o.material.map.dispose(); o.material.dispose(); }
        }
      });
      renderer.dispose();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    };
  }

  JA.TwinCampus = CampusScene;
  JA.TwinTower = TowerScene;
  JA.twinNodes = buildNodes;
})();
