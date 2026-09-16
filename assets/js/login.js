/* 居安智卫 登录页脚本 */
(function () {
  'use strict';
  var USERS = {
    admin:  { pwd: 'admin123',  role: 'admin',  roleName: '管理员' },
    ops:    { pwd: 'ops123',    role: 'ops',    roleName: '运维人员' },
    accept: { pwd: 'accept123', role: 'accept', roleName: '工程验收' }
  };

  /* ---------- 背景粒子 ---------- */
  var canvas = document.getElementById('particles');
  var ctx = canvas.getContext('2d');
  var W, H, pts = [];
  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
    pts = [];
    var n = Math.min(90, Math.floor(W * H / 18000));
    for (var i = 0; i < n; i++) {
      pts.push({ x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - .5) * .35, vy: (Math.random() - .5) * .35,
        r: Math.random() * 1.8 + .4 });
    }
  }
  window.addEventListener('resize', resize); resize();
  function tick() {
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i];
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > W) p.vx *= -1;
      if (p.y < 0 || p.y > H) p.vy *= -1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(90,190,255,.55)';
      ctx.fill();
      for (var j = i + 1; j < pts.length; j++) {
        var q = pts[j], dx = p.x - q.x, dy = p.y - q.y, d2 = dx * dx + dy * dy;
        if (d2 < 13000) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
          ctx.strokeStyle = 'rgba(70,150,255,' + (0.10 * (1 - d2 / 13000)) + ')';
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(tick);
  }
  tick();

  /* ---------- 登录逻辑 ---------- */
  var role = 'admin';
  var tabs = document.querySelectorAll('.role-tab');
  tabs.forEach(function (t) {
    t.addEventListener('click', function () {
      tabs.forEach(function (x) { x.classList.remove('active'); });
      t.classList.add('active');
      role = t.getAttribute('data-role');
      var u = document.getElementById('username');
      if (!u.value || USERS[u.value]) u.value = role;
      document.getElementById('password').value = USERS[role].pwd;
      msg('');
    });
  });

  document.querySelectorAll('.ta-item').forEach(function (it) {
    it.addEventListener('click', function () {
      var u = it.getAttribute('data-u'), p = it.getAttribute('data-p');
      document.getElementById('username').value = u;
      document.getElementById('password').value = p;
      tabs.forEach(function (x) { x.classList.toggle('active', x.getAttribute('data-role') === u); });
      role = u; msg('');
    });
  });

  // 已登录则直接跳转
  try {
    if (localStorage.getItem('JA_SESSION')) { location.replace('app.html'); return; }
  } catch (e) {}

  var form = document.getElementById('loginForm');
  var msgEl = document.getElementById('loginMsg');
  function msg(t, ok) {
    msgEl.textContent = t;
    msgEl.style.color = ok ? '#21e6a4' : '#ff4d6a';
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var u = document.getElementById('username').value.trim();
    var p = document.getElementById('password').value;
    if (!u || !p) { msg('请输入账号和密码'); return; }
    var acc = USERS[u];
    if (!acc || acc.pwd !== p) { msg('账号或密码错误，请使用内置测试账号'); return; }
    if (role !== u) {
      // 以账号真实角色为准
      role = acc.role;
    }
    var session = { username: u, role: acc.role, roleName: acc.roleName, loginAt: Date.now() };
    try { localStorage.setItem('JA_SESSION', JSON.stringify(session)); } catch (e) {}
    msg('身份认证成功，正在进入系统…', true);
    setTimeout(function () { location.href = 'app.html'; }, 450);
  });
})();
