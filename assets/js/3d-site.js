/* =====================================================================
 * 居安智卫 —— 低多边形 3D 施工工地沙盘（Three.js r128）
 * 在建建筑 / 塔吊 / 构件堆场 / 智能套筒节点（可点击 · 颜色状态 · 自动环绕）
 * ===================================================================== */
(function () {
  'use strict';
  var T = window.THREE;

  function spriteLabel(text, color, size) {
    var c = document.createElement('canvas');
    c.width = 256; c.height = 72;
    var g = c.getContext('2d');
    g.font = 'bold 34px Microsoft YaHei';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = color; g.shadowBlur = 12;
    g.fillStyle = color;
    g.fillText(text, 128, 36);
    var sp = new T.Sprite(new T.SpriteMaterial({
      map: new T.CanvasTexture(c), transparent: true, depthWrite: false }));
    sp.scale.set(size || 2.6, 0.75, 1);
    return sp;
  }

  function SiteScene(container, opts) {
    opts = opts || {};
    var self = this;
    this.onPick = opts.onPick || function () {};
    this.nodeMap = {};
    this.selectedId = null;
    var disposed = false, raf = 0;

    var scene = new T.Scene();
    scene.background = null;
    scene.fog = new T.FogExp2(0x071327, 0.011);

    var camera = new T.PerspectiveCamera(50, 1, 0.1, 500);
    camera.position.set(26, 19, 30);

    var renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);
    renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;cursor:grab';

    var ctrl = new T.OrbitControls(camera, renderer.domElement);
    ctrl.enableDamping = true; ctrl.dampingFactor = .08;
    ctrl.minDistance = 10; ctrl.maxDistance = 80;
    ctrl.maxPolarAngle = Math.PI * .49;
    ctrl.target.set(0, 5, 0);
    ctrl.autoRotate = true; ctrl.autoRotateSpeed = .7;
    this.setAutoRotate = function (v) { ctrl.autoRotate = !!v; };

    scene.add(new T.AmbientLight(0x9db8ee, .6));
    var sun = new T.DirectionalLight(0xdcebff, .8);
    sun.position.set(18, 30, 14); sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    scene.add(sun);
    var pl = new T.PointLight(0x22e0ff, .8, 90); pl.position.set(-20, 12, -14); scene.add(pl);

    /* 地形 */
    var ground = new T.Mesh(new T.PlaneGeometry(90, 70),
      new T.MeshStandardMaterial({ color: 0x0c1f33, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
    scene.add(ground);
    var grid = new T.GridHelper(90, 36, 0x2f7bff, 0x183358);
    grid.material.transparent = true; grid.material.opacity = .35;
    scene.add(grid);

    function box(w, h, d, color, x, y, z, mat2) {
      var m = new T.Mesh(new T.BoxGeometry(w, h, d),
        mat2 || new T.MeshStandardMaterial({ color: color, roughness: .75, metalness: .25, flatShading: true }));
      m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
      scene.add(m);
      return m;
    }

    /* ---- 在建建筑 A 座：3层框架（柱+楼板+外露钢筋） ---- */
    var frame = new T.Group(); scene.add(frame);
    var colMat = new T.MeshStandardMaterial({ color: 0x33507e, roughness: .8, flatShading: true });
    var slabMat = new T.MeshStandardMaterial({ color: 0x1d3c68, roughness: .85, flatShading: true });
    var xs = [-7, 0, 7], zs = [-4.5, 4.5], levels = [0, 3.6, 7.2, 10.8];
    // 柱
    xs.forEach(function (x) {
      zs.forEach(function (z) {
        var c = new T.Mesh(new T.BoxGeometry(.55, 10.8, .55), colMat);
        c.position.set(x, 5.4, z); c.castShadow = true; frame.add(c);
        // 顶部外露钢筋
        for (var i = 0; i < 4; i++) {
          var rebar = new T.Mesh(new T.CylinderGeometry(.045, .045, 1.4, 6),
            new T.MeshStandardMaterial({ color: 0x6f88b5, metalness: .7, roughness: .4 }));
          rebar.position.set(x + (i % 2 ? .18 : -.18), 11.5, z + (i > 1 ? .18 : -.18));
          frame.add(rebar);
        }
      });
    });
    // 梁（每层纵横）
    levels.slice(0, 3).forEach(function (y0) {
      var y = y0 + 3.2;
      [zs[0], zs[1]].forEach(function (z) {
        var bm = new T.Mesh(new T.BoxGeometry(14.6, .45, .4), colMat);
        bm.position.set(0, y, z); frame.add(bm);
      });
      xs.forEach(function (x) {
        var bm2 = new T.Mesh(new T.BoxGeometry(.4, .45, 9.4), colMat);
        bm2.position.set(x, y, 0); frame.add(bm2);
      });
    });
    // 已完成楼板（下两层） / 顶层浇筑中
    [0, 1].forEach(function (li) {
      var sl = new T.Mesh(new T.BoxGeometry(14.6, .28, 9.6), slabMat);
      sl.position.set(0, levels[li] + 3.6 - .14, 0); sl.receiveShadow = true; frame.add(sl);
    });
    var sl2 = new T.Mesh(new T.BoxGeometry(10.5, .28, 7),
      new T.MeshStandardMaterial({ color: 0x274d80, roughness: .9, flatShading: true, transparent: true, opacity: .85 }));
    sl2.position.set(-2, levels[2] + 3.46, -1); frame.add(sl2);

    // 安全围挡（顶部临边）
    var fenceMat = new T.MeshStandardMaterial({ color: 0xffc83d, roughness: .7 });
    var f1 = new T.Mesh(new T.BoxGeometry(14.6, .5, .08), fenceMat); f1.position.set(0, 11.1, 4.8); frame.add(f1);

    /* ---- 套筒节点位置（与数据中台 12 个节点对应） ---- */
    var nodePos = {
      'S-01': [-4.6, 4.0, 4.5], 'S-02': [0, 4.0, 4.5], 'S-03': [4.6, 4.0, 4.5],
      'S-04': [-3.5, 7.6, -4.5], 'S-05': [-7, 7.6, -2.2], 'S-06': [7, 7.6, -2.2],
      'S-07': [-3.5, 11.2, 2.0], 'S-08': [-7, 11.2, 2.0], 'S-09': [3.5, 11.2, -4.5],
      'S-10': [0, 12.6, 0]
    };

    var sphereGeo = new T.SphereGeometry(.34, 18, 18);
    var pickSpheres = [];
    var COLORS = { normal: 0x21e6a4, warn: 0xffc83d, alarm: 0xff4d6a };

    JA.Store.state.sleeves.forEach(function (sv) {
      var p = nodePos[sv.id];
      if (!p) {
        // B座节点放在副框架
        p = sv.id === 'S-11' ? [17.5, 4.0, -6] : [21.5, 4.0, -6];
      }
      var mat = new T.MeshStandardMaterial({
        color: COLORS[sv.status], emissive: COLORS[sv.status], emissiveIntensity: .9,
        roughness: .3, metalness: .2
      });
      var sp = new T.Mesh(sphereGeo, mat);
      sp.position.set(p[0], p[1], p[2]);
      sp.userData.nodeId = sv.id;
      frame.add(sp);
      // 外环
      var ring = new T.Mesh(new T.TorusGeometry(.55, .035, 8, 28),
        new T.MeshBasicMaterial({ color: COLORS[sv.status], transparent: true, opacity: .8 }));
      ring.rotation.x = Math.PI / 2;
      sp.add(ring);
      var lb = spriteLabel(sv.id, sv.status === 'alarm' ? '#ff7d94' : (sv.status === 'warn' ? '#ffd970' : '#7ef3c8'), 1.9);
      lb.position.set(0, .75, 0);
      sp.add(lb);
      pickSpheres.push(sp);
      self.nodeMap[sv.id] = { mesh: sp, mat: mat, ring: ring, data: sv, pos: p };
    });

    // 节点告警光柱
    var beams = {};
    function ensureBeam(id, p) {
      if (beams[id]) return beams[id];
      var b = new T.Mesh(new T.CylinderGeometry(.12, .5, 8, 20, 1, true),
        new T.MeshBasicMaterial({ color: 0xff4d6a, transparent: true, opacity: .3, side: T.DoubleSide, depthWrite: false }));
      b.position.set(p[0], p[1] + 3.4, p[2]);
      frame.add(b); beams[id] = b; return b;
    }

    /* ---- 塔吊 ---- */
    var crane = new T.Group(); scene.add(crane);
    var mastMat = new T.MeshStandardMaterial({ color: 0xd77b2f, roughness: .6, metalness: .3, flatShading: true });
    var cm = new T.Mesh(new T.BoxGeometry(.9, 22, .9), mastMat);
    cm.position.set(0, 11, -9); cm.castShadow = true; crane.add(cm);
    // 格构横杆
    for (var i = 0; i < 11; i++) {
      var bar = new T.Mesh(new T.BoxGeometry(1.25, .08, 1.25), mastMat);
      bar.position.set(0, 1 + i * 2, -9); crane.add(bar);
    }
    var head = new T.Mesh(new T.BoxGeometry(2, 1.6, 2),
      new T.MeshStandardMaterial({ color: 0xf2a23c, flatShading: true }));
    head.position.set(0, 22.4, -9); crane.add(head);

    var jib = new T.Group(); jib.position.set(0, 22, -9); crane.add(jib);
    var jb = new T.Mesh(new T.BoxGeometry(22, .35, .35), mastMat);
    jb.position.set(9, 0, 0); jib.add(jb);
    var cj = new T.Mesh(new T.BoxGeometry(7, .35, .35),
      new T.MeshStandardMaterial({ color: 0x8f9bb5, flatShading: true }));
    cj.position.set(-4.2, 0, 0); jib.add(cj);
    var cw = new T.Mesh(new T.BoxGeometry(1.6, 1.6, 1.2),
      new T.MeshStandardMaterial({ color: 0x5d6b86, flatShading: true }));
    cw.position.set(-7.2, -0.6, 0); jib.add(cw);
    // 拉杆（简化）
    var rod = new T.Mesh(new T.CylinderGeometry(.05, .05, 11, 6),
      new T.MeshBasicMaterial({ color: 0xcfd8ea }));
    rod.rotation.z = .5; rod.position.set(5.5, 1.8, 0); jib.add(rod);
    // 吊钩
    var cable = new T.Mesh(new T.CylinderGeometry(.03, .03, 5, 6),
      new T.MeshBasicMaterial({ color: 0xc8d4ec }));
    cable.position.set(17, -2.6, 0); jib.add(cable);
    var hook = new T.Mesh(new T.BoxGeometry(.7, .6, .7),
      new T.MeshStandardMaterial({ color: 0x2f3a52, metalness: .6, roughness: .4 }));
    hook.position.set(17, -5.2, 0); jib.add(hook);
    // 吊运构件
    var load = new T.Mesh(new T.BoxGeometry(3.2, .5, 1.2),
      new T.MeshStandardMaterial({ color: 0x4a6da3, flatShading: true }));
    load.position.set(17, -6, 0); jib.add(load);

    /* ---- 副框架 B 座（基础阶段） ---- */
    var b2 = box(7, .3, 5, 0x1d3c68, 19.5, .15, -6);
    [[16, -8], [23, -8], [16, -4], [23, -4]].forEach(function (p) {
      box(.5, 2.4, .5, 0x33507e, p[0], 1.2, p[1]);
    });

    /* ---- 场地小品 ---- */
    // 集装箱办公室
    box(4.5, 2.2, 2.2, 0x2e7d8c, -16, 1.1, -8);
    box(1.1, .7, .06, 0x9fe8ff, -14.4, 1.3, -9.13);
    // 构件堆场
    for (var k = 0; k < 3; k++) box(4, .3, .8, 0x465b83, -15, .25 + k * .34, 5 + k * .2);
    // 钢筋盘圆
    [[-11, 6], [-9.5, 7.2]].forEach(function (p) {
      var tor = new T.Mesh(new T.TorusGeometry(.7, .14, 10, 24),
        new T.MeshStandardMaterial({ color: 0x7086ad, metalness: .6, roughness: .5 }));
      tor.position.set(p[0], .3, p[1]); tor.rotation.x = Math.PI / 2;
      scene.add(tor);
    });
    // 围挡
    for (var n = -40; n <= 40; n += 4) {
      var fe = new T.Mesh(new T.BoxGeometry(3.8, 1.6, .12),
        new T.MeshStandardMaterial({ color: (Math.abs(n) % 8 === 0) ? 0x1d5f8a : 0x15405e, roughness: .8 }));
      fe.position.set(n, .8, -22); scene.add(fe);
    }
    // 大门与铭牌
    var sign = spriteLabel('居安智卫 · 装配式智慧工地', '#7ff0ff', 7);
    sign.position.set(0, 4.4, -21.6); scene.add(sign);

    /* ---- 交互 ---- */
    var ray = new T.Raycaster(), mv = new T.Vector2();
    var tip = document.createElement('div');
    tip.style.cssText = 'position:absolute;pointer-events:none;z-index:20;display:none;padding:6px 10px;' +
      'font-size:12px;color:#d9f4ff;background:rgba(8,22,48,.9);border:1px solid rgba(34,224,255,.5);' +
      'border-radius:6px;white-space:nowrap';
    container.appendChild(tip);

    function eventNode(ev) {
      var rect = renderer.domElement.getBoundingClientRect();
      mv.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      mv.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      ray.setFromCamera(mv, camera);
      var hits = ray.intersectObjects(pickSpheres, false);
      return hits.length ? hits[0].object.userData.nodeId : null;
    }
    renderer.domElement.addEventListener('pointermove', function (ev) {
      var id = eventNode(ev);
      if (id) {
        var sv = JA.Store.state.sleeves.filter(function (x) { return x.id === id; })[0];
        renderer.domElement.style.cursor = 'pointer';
        tip.style.display = 'block';
        tip.style.left = ev.offsetX + 14 + 'px'; tip.style.top = ev.offsetY + 14 + 'px';
        var c = sv.status === 'alarm' ? '#ff7d94' : (sv.status === 'warn' ? '#ffd970' : '#7ef3c8');
        tip.innerHTML = '<b style="color:' + c + '">' + sv.id + '</b> ' + sv.location +
          '<br>应力 ' + sv.stress + ' MPa · ' + sv.aiResult;
      } else { renderer.domElement.style.cursor = 'grab'; tip.style.display = 'none'; }
    });
    var dn = null;
    renderer.domElement.onpointerdown = function (e) { dn = [e.clientX, e.clientY]; };
    renderer.domElement.onpointerup = function (e) {
      if (!dn) return;
      var moved = Math.abs(e.clientX - dn[0]) + Math.abs(e.clientY - dn[1]); dn = null;
      if (moved > 6) return;
      var id = eventNode(e);
      if (id) { self.selectNode(id); self.onPick(JA.Store.state.sleeves.filter(function (x) { return x.id === id; })[0]); }
    };

    this.selectNode = function (id) {
      self.selectedId = id;
      Object.keys(self.nodeMap).forEach(function (k) {
        self.nodeMap[k].ring.material.color.setHex(COLORS[self.nodeMap[k].data.status]);
      });
      var nd = self.nodeMap[id];
      if (nd) nd.ring.material.color.setHex(0x22e0ff);
    };

    function resize() {
      var w = container.clientWidth || 600, h = container.clientHeight || 400;
      camera.aspect = w / h; camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    }
    this.resize = resize;
    var ro = new ResizeObserver(resize); ro.observe(container); resize();

    var clock = new T.Clock();
    function loop() {
      if (disposed) return;
      raf = requestAnimationFrame(loop);
      var t = clock.getElapsedTime() * 1000;
      // 塔吊缓慢回转 + 吊钩摆动
      jib.rotation.y = Math.sin(performance.now() * 0.00012) * .5;
      hook.rotation.z = Math.sin(performance.now() * 0.0011) * .12;
      load.rotation.z = hook.rotation.z;
      // 节点状态实时刷新
      Object.keys(self.nodeMap).forEach(function (id) {
        var rec = self.nodeMap[id], st = rec.data.status;
        var c = COLORS[st];
        if (rec.mat.color.getHex() !== c) {
          rec.mat.color.setHex(c); rec.mat.emissive.setHex(c);
          if (rec.selected !== (id === self.selectedId)) { /* ring color below */ }
        }
        rec.ring.material.color.setHex(id === self.selectedId ? 0x22e0ff : c);
        if (st === 'alarm') {
          rec.mat.emissiveIntensity = 1 + Math.abs(Math.sin(t * .008)) * 1.5;
          var b = ensureBeam(id, rec.pos);
          b.material.opacity = .16 + Math.abs(Math.sin(t * .006)) * .25;
          b.visible = true;
        } else if (st === 'warn') {
          rec.mat.emissiveIntensity = .8 + Math.abs(Math.sin(t * .005)) * .5;
        } else {
          rec.mat.emissiveIntensity = .8;
        }
        var sc = id === self.selectedId ? 1.25 + Math.sin(t * .005) * .08 : 1;
        rec.mesh.scale.setScalar(sc);
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
          if (o.material.map) o.material.map.dispose();
          o.material.dispose();
        }
      });
      renderer.dispose();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
      if (tip.parentNode) tip.parentNode.removeChild(tip);
    };
  }

  JA.SiteScene = SiteScene;
})();
