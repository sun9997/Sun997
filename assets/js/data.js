/* =====================================================================
 * 居安智卫 —— 统一数据中台 data.js
 * 统一管理：用户权限 / 建筑房间 / 能耗 / 环境 / 人员密度 / 设备 /
 *           AI预测 / 告警与优化方案 / 套筒节点 / 整改工单 / 系统参数
 * 采用响应式 Store：任意页面提交数据后，表格、图表、指标卡、3D模型联动刷新
 * ===================================================================== */
var JA = window.JA || {};
/* 页面注册表（页面脚本先于主框架 app.js 加载，故在此提前定义） */
JA.pages = JA.pages || [];
JA.registerPage = function (p) { JA.pages.push(p); };
(function () {
  'use strict';

  /* ---------------- 工具函数 ---------------- */
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function now() { return new Date(); }
  function hm(d) { return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function ymdhm(d) { return ymd(d) + ' ' + hm(d); }
  function uid(p) { return p + '-' + Math.random().toString(36).slice(2, 8).toUpperCase(); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function rnd(a, b) { return +(a + Math.random() * (b - a)).toFixed(1); }
  function deep(o) { return JSON.parse(JSON.stringify(o)); }
  function hourLabels(n, endHour) {
    var arr = [], d = new Date();
    d.setMinutes(0, 0, 0);
    if (typeof endHour === 'number') d.setHours(endHour);
    for (var i = n - 1; i >= 0; i--) {
      var t = new Date(d.getTime() - i * 3600000);
      arr.push(pad(t.getHours()) + ':00');
    }
    return arr;
  }

  /* ---------------- 建筑 / 楼层 / 房间（天津典型绿色办公建筑 LCA 实测工程） ---------------- */
  var buildings = [
    { id: 'B-TJ', name: '天津典型绿色办公建筑', area: 20183, floors: 17, rooms: 16, online: true, main: true,
      type: '装配式绿色办公建筑（地上17层）', gridFactor: 0.8843 }
  ];
  var floors = [
    { id: 'F1', name: '1F', label: '一层' },
    { id: 'F2', name: '2F', label: '二层' },
    { id: 'F3', name: '3F', label: '三层' },
    { id: 'F4', name: '4F', label: '四层' }
  ];

  // 房间基础信息与实时工况（内置 9 类典型模拟场景）
  var roomDefs = [
    // 一层
    ['101', 'F1', '门厅&智慧展厅', 'public', 42, 25.4, 56, 18, 'normal'],
    ['102', 'F1', '多功能厅', 'public', 58, 25.8, 58, 6, 'normal'],
    ['103', 'F1', '设备机房', 'equip', 61, 27.6, 55, 2, 'normal'],
    ['104', 'F1', '消防安防中心', 'office', 22, 25.2, 52, 5, 'normal'],
    // 二层
    ['201', 'F2', '开放办公区A', 'office', 66, 26.1, 57, 42, 'normal'],
    ['202', 'F2', '中型会议室', 'meeting', 38, 26.0, 55, 0, 'normal'],
    ['203', 'F2', '研发实验室', 'lab', 116, 24.2, 48, 15, 'surge'],        // 能耗突增场景
    ['204', 'F2', '电梯厅&走廊', 'public', 19, 26.3, 56, 8, 'normal'],
    // 三层
    ['301', 'F3', '开放办公区B', 'office', 71, 25.6, 54, 38, 'normal'],
    ['302', 'F3', '智慧指挥中心', 'office', 128, 22.8, 46, 26, 'high'],       // 高能耗异常场景
    ['303', 'F3', '资料档案室', 'store', 12, 26.8, 50, 1, 'normal'],
    ['304', 'F3', '电梯厅&走廊', 'public', 18, 26.2, 55, 7, 'normal'],
    // 四层
    ['401', 'F4', '高管办公区', 'office', 49, 25.5, 53, 12, 'normal'],
    ['402', 'F4', '大会议室', 'meeting', 63, 24.6, 51, 0, 'idle'],           // 无人空耗场景
    ['403', 'F4', '数据机房', 'equip', 88, 28.4, 43, 3, 'fault'],            // 设备故障场景
    ['404', 'F4', '屋顶设备间', 'equip', 24, 29.1, 52, 0, 'normal']
  ];
  // 真实分项结构：供暖 / 空调风机 / 照明 / 插座设备 / 电梯（插座设备集中办公区占比最高）
  var TYPE_MIX = {
    office:  { heating: .04, hvac: .30, light: .16, socket: .42, elevator: .08 },
    meeting: { heating: .04, hvac: .36, light: .24, socket: .28, elevator: .08 },
    lab:     { heating: .03, hvac: .34, light: .14, socket: .40, elevator: .09 },
    public:  { heating: .05, hvac: .34, light: .40, socket: .10, elevator: .11 },
    equip:   { heating: .02, hvac: .28, light: .08, socket: .55, elevator: .07 },
    store:   { heating: .06, hvac: .30, light: .50, socket: .05, elevator: .09 }
  };
  var GRID_FACTOR = 0.8843;   // 华北电网碳排放因子 kgCO₂/kWh
  var rooms = roomDefs.map(function (d, i) {
    var total = d[4], mix = TYPE_MIX[d[3]] || TYPE_MIX.office;
    var heating = Math.round(total * mix.heating);
    var hvac = Math.round(total * mix.hvac);
    var light = Math.round(total * mix.light);
    var elevator = Math.round(total * mix.elevator);
    var socket = total - heating - hvac - light - elevator;   // 插座设备兜底，保证合计=总能耗
    return {
      id: 'R-' + d[0], no: d[0], floor: d[1], name: d[2], type: d[3],
      heating: heating, hvac: hvac, light: light, socket: socket, elevator: elevator,
      total: total,
      temp: d[5], humidity: d[6], occupancy: d[7],
      equipStatus: d[8] === 'fault' ? 'fault' : 'running',
      scenario: d[8],
      updatedAt: ymdhm(new Date(Date.now() - rnd(0, 25) * 60000))
    };
  });

  /* ---------------- 建筑级 24h 能耗时序 ---------------- */
  function baseProfile() {
    // 典型办公建筑日负荷曲线（夜间低、白天双峰）
    return [42,38,36,35,34,36,42,58,82,108,124,118,112,115,120,116,102,86,74,68,61,55,49,45];
  }
  var histLabels = hourLabels(24);
  var prof = baseProfile();
  var series = {
    labels: histLabels,
    total: prof.slice(),
    heating: prof.map(function (v) { return Math.round(v * 0.04 + rnd(-0.5, 0.5)); }),
    hvac: prof.map(function (v) { return Math.round(v * 0.30 + rnd(-2, 2)); }),
    light: prof.map(function (v) { return Math.round(v * 0.16 + rnd(-1, 1)); }),
    socket: prof.map(function (v) { return Math.round(v * 0.42 + rnd(-2, 2)); }),
    elevator: prof.map(function (v) { return Math.round(v * 0.08 + rnd(-1, 1)); })
  };

  /* ---------------- 设备台账 ---------------- */
  var deviceDefs = [
    ['AC-201', '空调机组 AHU-201', '空调', 'R-201'], ['AC-301', '空调机组 AHU-301', '空调', 'R-301'],
    ['AC-302', '中央空调 AHU-302', '空调', 'R-302'], ['AC-203', '恒温恒湿机组', '空调', 'R-203'],
    ['AC-402', '变风量空调 VAV-402', '空调', 'R-402'], ['AC-102', '空调机组 AHU-102', '空调', 'R-102'],
    ['AC-403', '精密空调 CRAC-403', '空调', 'R-403'], ['AC-401', '多联机外机', '空调', 'R-401'],
    ['LT-201', '照明回路 L-2F东', '照明', 'R-201'], ['LT-302', '照明回路 L-指挥中心', '照明', 'R-302'],
    ['LT-402', '照明回路 L-大会议室', '照明', 'R-402'], ['LT-101', '公共照明 L-门厅', '照明', 'R-101'],
    ['LT-301', '照明回路 L-3F西', '照明', 'R-301'], ['LT-203', '实验区专用照明', '照明', 'R-203'],
    ['EL-01', '1#客梯', '电梯', 'R-204'], ['EL-02', '2#客梯(消防梯)', '电梯', 'R-304'],
    ['FA-302', '新风机组 FA-302', '新风', 'R-302'], ['FA-201', '新风机组 FA-201', '新风', 'R-201'],
    ['UPS-403', 'UPS不间断电源', '配电', 'R-403'], ['PW-103', '智能配电柜 PDU-1#', '配电', 'R-103']
  ];
  var devices = deviceDefs.map(function (d) {
    var room = rooms.filter(function (r) { return r.id === d[3]; })[0];
    var status = 'running';
    if (d[0] === 'AC-403') status = 'fault';                 // 设备故障
    return {
      id: d[0], name: d[1], type: d[2], roomId: d[3], roomName: room ? room.no + ' ' + room.name : '-',
      status: status, power: rnd(2.4, 18.5),
      mode: d[2] === '空调' ? '制冷' : (d[2] === '电梯' ? '群控' : '自动')
    };
  });

  /* ---------------- 数据采集与清洗记录 ---------------- */
  var cleaning = [];
  (function seedCleaning() {
    var srcs = [
      ['智能电表 #EM-302', '总有功功率(kW)', 132.6, 128.4, '正常归集'],
      ['温湿度传感器 #TH-403', '温度(℃)', 28.4, 28.4, '正常归集'],
      ['智能电表 #EM-203', '总有功功率(kW)', 999.9, 115.2, '异常值剔除：传感器跳变>3σ，采用相邻均值插补'],
      ['人员计数器 #PC-201', '在场人数(人)', 42, 42, '正常归集'],
      ['智能电表 #EM-402', '照明回路(kWh)', 14.8, 14.8, '正常归集'],
      ['温湿度传感器 #TH-101', '湿度(%RH)', -12, 56, '异常值剔除：负值超量程，剔除并标记重传'],
      ['空调网关 #BAC-AC302', '送风温度(℃)', 16.2, 16.2, '正常归集'],
      ['智能电表 #EM-103', '空调能耗(kWh)', 33.1, 33.1, '正常归集'],
      ['客流雷达 #MM-102', '人员密度(人/100㎡)', 6, 6, '正常归集'],
      ['电梯电表 #EL-02', '运行电流(A)', 0, 0, '零值校验：设备停运，数据有效'],
      ['光伏汇流箱 #CB-07', '直流电压(V)', 618.4, 618.4, '正常归集'],
      ['BMS电池簇 #ESS-01', '电池SOC(%)', 68, 68, '正常归集'],
      ['直流充电桩 #DC-05', '实时功率(kW)', 59.8, 59.8, '正常归集'],
      ['电能质量表 #PQ-01', '功率因数', null, 0.91, '缺失值插补：1个采样周期缺失，按前后均值补全'],
      ['组件温度传感器 #PV-T12', '光伏背板温度(℃)', 86.2, 61.5, '跳变值剔除：>3σ热斑误报，相邻均值插补']
    ];
    srcs.forEach(function (s, i) {
      cleaning.push({
        id: 'DC' + pad(10 - i), source: s[0], metric: s[1], raw: s[2], cleaned: s[3],
        note: s[4], status: s[4].indexOf('剔除') >= 0 ? '已清洗' : '已归集',
        time: ymdhm(new Date(Date.now() - (i + 1) * 7 * 60000))
      });
    });
  })();

  /* ---------------- AI 负荷预测 ---------------- */
  function computeForecast(scenario) {
    scenario = scenario || state.prediction.scenario;
    var tempFactor = 1 + clamp((scenario.temp - 26) * 0.045, -0.15, 0.3);
    var occFactor = 0.72 + 0.35 * clamp(scenario.occ / 40, 0, 1.6);
    var humFactor = 1 + clamp((scenario.hum - 55) * 0.004, -0.08, 0.1);
    var runFactor = 0.65 + 0.45 * clamp(scenario.runRate, 0, 1.4);
    var k = tempFactor * occFactor * humFactor * runFactor;
    var future = baseProfile().map(function (v, i) {
      // 只预测未来 24h（从下一小时起）
      return Math.round(v * k + rnd(-1.5, 1.5));
    });
    var band = future.map(function (v) { return Math.max(2, Math.round(v * (state.prediction.confidence))); });
    return { future: future, band: band, factor: +k.toFixed(3) };
  }

  /* ---------------- 告警（初始由场景房间生成） ---------------- */
  function seedAlerts() {
    var list = [];
    function push(a) { list.push(Object.assign({
      id: uid('AL'), time: ymdhm(new Date(Date.now() - rnd(2, 200) * 60000)),
      active: true, pushed: false, pushedTo: []
    }, a)); }
    push({ level: '告警', type: '异常能耗', roomId: 'R-302', pos: '3F 智慧指挥中心（插座设备集中办公区）',
      title: '异常能耗突增：单位面积能耗显著超标',
      desc: '当前总能耗 128 kWh，其中插座设备 54 kWh，超出红色预警阈值 90 kWh。',
      reason: '电力消耗占建筑总能耗80%以上，华北电网煤电占比超60%；大屏与办公插座设备长时间满载，传统设备能效偏低。',
      advice: '启用磁悬浮冷机+LED光感控制策略，非值守设备断电，插座设备分时供电。', expect: '综合节能10%~40%，预计降低该区域能耗约18%' });
    push({ level: '告警', type: '能耗突增', roomId: 'R-203', pos: '2F 研发实验室',
      title: '异常能耗突增：1小时内环比上升 63%',
      desc: '当前总能耗 116 kWh，恒温恒湿机组连续高负荷运行。',
      reason: '实验设备集中投运，传统机组（COP≤4.2）能效偏低，恒温设定22℃。',
      advice: '错峰投运实验设备，更换磁悬浮冷水机组（COP≥6.5，节能35%-40%），恒温上调至24℃。', expect: '预计削峰约 22 kWh/h' });
    push({ level: '预警', type: '无人空耗', roomId: 'R-402', pos: '4F 大会议室',
      title: '无人区域空耗：在场人数为0但设备运行',
      desc: '人员密度为0，空调与照明仍在运行，当前能耗 63 kWh；无人空耗占建筑能源浪费30%以上。',
      reason: '会议结束后未关闭空调 VAV-402 与照明回路，缺乏人体感应联动。',
      advice: '光感+人体感应LED智能照明（较传统照明降低40%能耗），空调延时关闭。', expect: '预计每小时节约 9 kWh' });
    push({ level: '告警', type: '设备故障', roomId: 'R-403', pos: '4F 数据机房',
      title: '设备故障：精密空调 CRAC-403 功率异常突变、设备超温',
      desc: '压缩机功率异常突变、回风温度升至 28.4℃，存在电池/设备过热风险。',
      reason: '压缩机运行异响，初判冷媒压力异常/滤网堵塞，传统设备能效偏低。',
      advice: '立即派发检修工单，启用备用空调，限制非关键机柜负载，BMS加密温度监测。', expect: '消除过热宕机风险' });
    push({ level: '预警', type: '设备运行异常', roomId: 'R-103', pos: '1F 设备机房',
      title: '设备运行异常：配电柜功率异常、功率因数偏低',
      desc: 'PDU-1# 功率因数 0.82，低于考核值 0.90。',
      reason: '轻载时段感性负载占比升高，无功补偿未投切。',
      advice: '自动投切电容补偿柜，结合储能PCS调峰调频改善电能质量。', expect: '功率因数恢复至0.93以上' });
    push({ level: '告警', type: '结构安全', nodeId: 'S-07', pos: 'A座 4F 柱纵筋套筒 #KZ4-04',
      title: '套筒应力超限：S-07（326MPa > 限值300MPa）',
      desc: '智能套筒节点实时应力 326 MPa，AI判定红色告警，GPS坐标 X=9.8 Y=5.1 Z=12.7m。',
      reason: '疑似灌浆不密实/锚固缺陷，节点应力集中。',
      advice: '停止上部作业，GPS定位节点，派发结构整改工单，复检灌浆质量并推送App。',
      expect: '复测应力回落至限值以内' });
    return list;
  }

  /* ---------------- 智能套筒节点（装配式结构监测） ---------------- */
  function wave(base, spikeAt, spikeV) {
    var arr = [];
    for (var i = 0; i < 60; i++) {
      var v = base + Math.sin(i / 4.5) * 6 + rnd(-5, 5);
      if (spikeAt && i >= spikeAt) v = spikeV + Math.sin(i / 3) * 10 + rnd(-6, 6);
      arr.push(Math.round(v * 10) / 10);
    }
    return arr;
  }
  var sleeveDefs = [
    ['S-01', 'A座 2F 柱纵筋套筒 #KZ2-07', 'X=12.4 Y=6.8 Z=6.1m', 168, '正常', null],
    ['S-02', 'A座 2F 梁节点套筒 #KL2-03', 'X=8.1 Y=6.8 Z=6.0m', 182, '正常', null],
    ['S-03', 'A座 2F 柱纵筋套筒 #KZ2-11', 'X=16.9 Y=3.2 Z=6.1m', 175, '正常', null],
    ['S-04', 'A座 3F 梁节点套筒 #KL3-05', 'X=10.6 Y=10.4 Z=9.4m', 205, '正常', null],
    ['S-05', 'A座 3F 柱纵筋套筒 #KZ3-02', 'X=5.4 Y=8.6 Z=9.5m', 262, '黄色预警', 38],
    ['S-06', 'A座 3F 梁节点套筒 #KL3-09', 'X=18.2 Y=8.6 Z=9.4m', 198, '正常', null],
    ['S-07', 'A座 4F 柱纵筋套筒 #KZ4-04', 'X=9.8 Y=5.1 Z=12.7m', 326, '红色告警', 41],
    ['S-08', 'A座 4F 梁节点套筒 #KL4-02', 'X=6.3 Y=5.1 Z=12.6m', 214, '正常', null],
    ['S-09', 'A座 4F 柱纵筋套筒 #KZ4-09', 'X=15.7 Y=10.2 Z=12.7m', 191, '正常', null],
    ['S-10', 'A座 屋面 预埋件套筒 #WM-01', 'X=12.0 Y=7.0 Z=14.8m', 156, '正常', null],
    ['S-11', 'B座 2F 梁节点套筒 #B-KL2-01', 'X=7.5 Y=4.4 Z=6.0m', 188, '正常', null],
    ['S-12', 'B座 2F 柱纵筋套筒 #B-KZ2-03', 'X=11.2 Y=4.4 Z=6.1m', 172, '正常', null]
  ];
  var sleeves = sleeveDefs.map(function (d) {
    var status = d[4] === '红色告警' ? 'alarm' : (d[4] === '黄色预警' ? 'warn' : 'normal');
    var st = d[5] != null ? d[5] : 0;
    var stress = d[3];
    return {
      id: d[0], location: d[1], bim: d[2], stress: stress,
      status: status, aiResult: d[4],
      health: status === 'alarm' ? 61 : (status === 'warn' ? 78 : rnd(92, 99)),
      grout: status === 'alarm' ? '灌浆不密实(疑似缺陷)' : '灌浆饱满',
      time: ymdhm(new Date(Date.now() - rnd(1, 90) * 60000)),
      wave: wave(stress - 10, st, stress)
    };
  });

  /* ---------------- 整改工单 / 验收 ---------------- */
  var orders = [
    { id: 'WO-20260912-01', type: '结构整改', target: '套筒 S-07 #KZ4-04', desc: '柱纵筋套筒灌浆不密实，应力超限(326MPa>300MPa)',
      owner: '王建国', phone: '138****6621', deadline: '2026-09-18', level: '紧急',
      status: '整改中', result: '', accept: '待验收', reporter: 'AI结构诊断', created: '2026-09-12 09:41' },
    { id: 'WO-20260911-02', type: '设备检修', target: '精密空调 CRAC-403', desc: '压缩机异常、机房回风温度28.4℃',
      owner: '李海涛', phone: '139****8807', deadline: '2026-09-15', level: '紧急',
      status: '待验收', result: '已补充冷媒R410A并更换滤网，试运行2h回风温度降至24.6℃', accept: '合格', reporter: '设备物联', created: '2026-09-11 14:05' },
    { id: 'WO-20260910-03', type: '节能整改', target: 'A座 4F 大会议室', desc: '无人空耗：空调照明未关',
      owner: '赵敏', phone: '137****2290', deadline: '2026-09-13', level: '一般',
      status: '已闭环', result: '加装人体感应联动，关闭闲置回路', accept: '合格', reporter: '能耗AI', created: '2026-09-10 18:22' },
    { id: 'WO-20260908-04', type: '结构整改', target: '套筒 S-05 #KZ3-02', desc: '应力262MPa达到黄色预警，持续观察',
      owner: '王建国', phone: '138****6621', deadline: '2026-09-20', level: '关注',
      status: '已闭环', result: '复拧并补浆，复测应力回落至205MPa', accept: '合格', reporter: 'AI结构诊断', created: '2026-09-08 10:15' }
  ];

  /* ---------------- 用户与系统参数 ---------------- */
  var users = [
    { username: 'admin', name: '林致远', role: 'admin', roleName: '管理员', dept: '信息中心', phone: '186****0001', enabled: true },
    { username: 'ops', name: '陈运维', role: 'ops', roleName: '运维人员', dept: '物业运维部', phone: '186****0002', enabled: true },
    { username: 'accept', name: '周验收', role: 'accept', roleName: '工程验收', dept: '工程管理部', phone: '186****0003', enabled: true },
    { username: 'viewer', name: '访客演示', role: 'ops', roleName: '运维人员(只读演示)', dept: '外部参观', phone: '186****0004', enabled: false }
  ];
  var params = {
    energyRed: 90, energyOrange: 65, idleLoad: 35,
    sleeveWarn: 250, sleeveLimit: 300,
    saveRate: 0.27, accuracy: 0.936, saveRange: [0.10, 0.40]
  };

  /* ================================================================
   * 真实实验数据（天津绿色办公建筑 LCA 测算 + 装配式光储一体化充电站实测）
   * ================================================================ */
  // 1) 建材生产阶段碳排放（tCO₂e，18类建材，合计 14965.409）
  var lcaMaterials = [
    ['混凝土', 3984.120], ['钢筋', 3680.188], ['型钢', 838.203], ['水泥', 488.430],
    ['钢混预制楼板', 518.160], ['钢混预制墙板', 562.108], ['钢混预制楼梯', 63.798], ['预拌砂浆', 1876.866],
    ['砂', 0.066], ['挤塑聚苯乙烯泡沫塑料', 57.672], ['砖', 908.020], ['12A钢铝单框双玻窗', 127.577],
    ['保温门', 2.202], ['内门', 52.528], ['陶瓷', 450.520], ['涂料', 870.561],
    ['电缆', 364.774], ['管材', 119.616]
  ].map(function (d) { return { name: d[0], v: d[1] }; });
  // 2) 建材运输阶段碳排放（tCO₂e，合计 869.619）
  var lcaTransport = [
    ['混凝土', 127.210], ['钢筋', 90.432], ['型钢', 20.379], ['水泥', 38.210],
    ['钢混预制楼板', 108.264], ['钢混预制墙板', 165.580], ['钢混预制楼梯', 15.921], ['预拌砂浆', 23.334],
    ['砂', 2.038], ['挤塑聚苯乙烯泡沫塑料', 0.217], ['砖', 225.316], ['12A钢铝单框双玻窗', 1.133],
    ['保温门', 0.079], ['内门', 1.876], ['陶瓷', 39.854], ['涂料', 7.642],
    ['电缆', 0.223], ['管材', 1.911]
  ].map(function (d) { return { name: d[0], v: d[1] }; });
  // 3) 建造 / 拆除阶段（tCO₂）
  var lcaConstruct = [
    { name: '建造阶段合计', v: 462.848, note: '含施工临时设施 9.075 tCO₂' },
    { name: '其中：施工临时设施', v: 9.075, note: '建造阶段内分项' },
    { name: '拆除阶段', v: 154.283, note: '按拆除能耗测算' }
  ];
  // 4) 绿化碳汇（tCO₂，合计 313.250，单独抵扣）
  var lcaSinks = [
    ['大小乔灌草混种区', 84.000], ['阔叶大乔木', 94.500], ['阔叶小乔木/针叶乔木', 78.750],
    ['棕榈类', 21.000], ['密植灌木', 26.250], ['多年生蔓藤', 3.500], ['草花花圃草坪', 5.250]
  ].map(function (d) { return { name: d[0], v: d[1] }; });
  // 5) 建筑运行阶段碳排放（tCO₂，合计 34356.539）
  var lcaOperation = [
    ['供暖', 33.000], ['空调风机', 1133.019], ['照明', 8435.644], ['插座设备', 16564.890],
    ['其他（电梯/排风机）', 4976.487], ['市政热力烟煤II', 2999.994], ['设备安装维护', 224.250]
  ].map(function (d) { return { name: d[0], v: d[1] }; });
  // 6) 全生命周期汇总（论文真实口径：生产+运输+建造+运营+拆除-碳汇=50495.447）
  var lcaTotals = {
    production: 14965.409, transport: 869.619, construction: 462.848, demolition: 154.283,
    sink: 313.250, operation: 34356.539, lifecycle: 50495.447, annual: 1009.909,
    perAreaAnnual: 50.04, perAreaTotal: 2501.00
  };
  var lcaPct = { production: 29.45, transport: 1.71, construction: 0.91, operation: 67.62, demolition: 0.30 };
  var lca = {
    area: 20183, floors: 17, lifeYears: 50, factor: 0.8843,
    materials: lcaMaterials, transport: lcaTransport, construct: lcaConstruct,
    sinks: lcaSinks, operation: lcaOperation, totals: lcaTotals, pct: lcaPct,
    pctCustom: false   // 用户手动修改后置 true，占比改为按数值实时重算
  };

  /* 7) 建筑供冷/供暖需求负荷（图5.3，kWh/㎡，绑定总面积20183㎡） */
  var demand = [
    { name: '围护传热', heat: -6.75, cool: 10.07 },
    { name: '室内得热', heat: 6.14, cool: 2.80 },
    { name: '窗日射', heat: 1.43, cool: 6.54 },
    { name: '新风/渗透', heat: -11.08, cool: 8.18 },
    { name: '热回收', heat: 0.00, cool: 0.00 },
    { name: '合计', heat: -12.26, cool: 33.58, total: true }
  ];

  /* 8) 建筑温控设备月负荷（图5.2，MW；1月热负荷峰值、7月冷负荷峰值） */
  var monthLoad = {
    labels: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
    series: [
      { name: '热负荷', color: '#ff4d6a', data: [2.85, 2.42, 1.62, 0.62, 0.05, 0, 0, 0, 0, 0.48, 1.68, 2.52] },
      { name: '热回收(热负荷)', color: '#21e6a4', data: [0.71, 0.60, 0.40, 0.15, 0.01, 0, 0, 0, 0, 0.12, 0.42, 0.63] },
      { name: '冷负荷', color: '#2f7bff', data: [0, 0, 0.18, 0.72, 1.32, 2.08, 2.62, 2.38, 1.68, 0.82, 0.12, 0] },
      { name: '热回收(冷负荷)', color: '#ffc83d', data: [0, 0, 0.05, 0.18, 0.33, 0.52, 0.65, 0.60, 0.42, 0.20, 0.03, 0] }
    ]
  };

  /* 9) 装配式光储一体化充电站真实参数 + 光伏25年发电量衰减（年衰减0.8%） */
  var pv = {
    storageKW: 240, storageKWh: 500, modules: 180, inverters: 1, combiners: 12, chargers: 12,
    carport: 1, monitor: 1, coverage: 0.30, genPerArea: 120, degradation: 0.008,
    nightCharge: '22:00-次日08:00 谷价时段 300kW 充电 7.5h 充满'
  };
  (function () {
    var area = 20183 * pv.coverage;            // BIPV 覆盖面积
    pv.bipvArea = Math.round(area * 10) / 10;
    pv.year1Gen = Math.round(area * pv.genPerArea);   // 首年发电量 kWh
    pv.years = [];
    var cum = 0;
    for (var y = 1; y <= 25; y++) {
      var rate = 1 - pv.degradation * (y - 1);
      var gen = Math.round(pv.year1Gen * rate);
      cum += gen;
      pv.years.push({ year: y, rate: +(rate * 100).toFixed(1), gen: gen, cum: cum, carbon: Math.round(gen * 0.8843) });
    }
  })();

  /* 10) 光储设备台账 + 电池安全监测 + GPS定位节点 */
  var pvDevices = [
    { id: 'PV-ARRAY', name: '光伏组件阵列', spec: '单晶硅光伏组件（屋顶BIPV覆盖率30%）', qty: 180, unit: '个', status: 'running', health: 98 },
    { id: 'INV-01', name: '光伏逆变器', spec: '集中式逆变器 240kW', qty: 1, unit: '台', status: 'running', health: 97 },
    { id: 'CB', name: '直流汇流箱', spec: '16路智能直流汇流箱', qty: 12, unit: '台', status: 'running', health: 96 },
    { id: 'DC', name: '直流充电桩', spec: '120kW 一体式直流充电桩', qty: 12, unit: '台', status: 'running', health: 95 },
    { id: 'CP-01', name: '车棚主体', spec: '钢结构光伏车棚', qty: 1, unit: '套', status: 'running', health: 99 },
    { id: 'MS-01', name: '监控系统', spec: '光储充一体化能量管理与安全监控平台', qty: 1, unit: '套', status: 'running', health: 99 },
    { id: 'ESS-01', name: '电池储能系统', spec: '磷酸铁锂 240kW/500kWh，PCS双向变流', qty: 1, unit: '套', status: 'running', health: 96 }
  ];
  var battery = {
    voltage: 712.4, temp: 31.2, soc: 68, soh: 96, cycles: 428,
    chargeKw: 0, dischargeKw: 86, status: '并网放电（削峰）',
    records: [
      { time: '09-15 08:00', item: '电池簇电压巡检', val: '712.4 V', res: '正常' },
      { time: '09-15 08:00', item: '最高/最低单体温差', val: '2.1 ℃', res: '正常' },
      { time: '09-14 22:00', item: '谷段充电电量', val: '2196 kWh', res: '已归档' },
      { time: '09-10 14:20', item: 'BMS绝缘电阻检测', val: '1.28 MΩ', res: '正常' },
      { time: '09-01 09:00', item: '月度容量标定(SOH)', val: '96%', res: '已归档' }
    ]
  };
  var gpsNodes = [
    { id: 'GPS-01', name: '储能集装箱 ESS-01', lng: 117.20136, lat: 39.08452, status: '在线' },
    { id: 'GPS-02', name: '直流充电桩 DC-05', lng: 117.20148, lat: 39.08441, status: '在线' },
    { id: 'GPS-03', name: '套筒监测节点 S-07', lng: 117.20152, lat: 39.08463, status: '告警' }
  ];

  /* ---------------- 状态总装 ---------------- */
  var state = {
    buildings: buildings, floors: floors, rooms: rooms, devices: devices,
    series: series, cleaning: cleaning,
    lca: lca, demand: demand, monthLoad: monthLoad, pv: pv,
    pvDevices: pvDevices, battery: battery, gpsNodes: gpsNodes,
    prediction: {
      history: prof.slice(),
      histLabels: histLabels,
      future: [], band: [], futureLabels: hourLabels(24, new Date().getHours() + 24),
      confidence: 0.08, accuracy: 0.936,
      scenario: { occ: 38, temp: 26, hum: 55, runRate: 1 },
      monthFactor: 1
    },
    alerts: seedAlerts(),
    pushLogs: [
      { time: ymdhm(new Date(Date.now() - 18 * 60000)), channel: 'App推送', to: '值班员Android终端 + 在线用户（全网广播）', content: '【居安智卫】3F智慧指挥中心异常能耗突增红色告警，请及时处置。' },
      { time: ymdhm(new Date(Date.now() - 52 * 60000)), channel: '邮件', to: 'energy@juanzhiwei.cn', content: '【异常预警日报】数据机房精密空调超温故障，已自动生成检修工单。' }
    ],
    sleeves: sleeves, orders: orders, users: users, params: params,
    control: {
      acTemp: 26, lightDim: 80, elevatorMode: '群控节能', applied: false, savedKwh: 0, cutRate: 0, savedCarbon: 0,
      strategies: { envelope: true, chiller: true, gshp: false, led: true, bipv: false, heatRec: false, digital: true },
      pv: { tracker: true, selfUse: true, nightCharge: true, peakShave: true, soc: 68 }
    },
    locateRoom: null   // 3D 定位联动
  };
  (function initForecast() {
    var r = computeForecast(state.prediction.scenario);
    state.prediction.future = r.future; state.prediction.band = r.band;
  })();

  /* ---------------- 响应式 Store ---------------- */
  var listeners = [];
  var Store = {
    state: state,
    subscribe: function (fn) { listeners.push(fn); return function () {
      listeners = listeners.filter(function (f) { return f !== fn; });
    }; },
    emit: function (evt) {
      listeners.forEach(function (fn) { try { fn(evt || { type: 'update' }); } catch (e) { console.error(e); } });
    },
    getRoom: function (id) { return state.rooms.filter(function (r) { return r.id === id; })[0]; },
    floorRooms: function (f) { return state.rooms.filter(function (r) { return r.floor === f; }); }
  };

  /* ---------------- 告警评估规则引擎 ---------------- */
  function evalRoomAlerts(room) {
    var p = state.params;
    var pos = 'A座 ' + room.no.charAt(0) + 'F ' + room.name;
    // 清除该房间已有告警（基于最新工况重新评估生成；结构类告警 nodeId 不受影响）
    state.alerts = state.alerts.filter(function (a) { return a.roomId !== room.id; });
    function add(a) {
      var exists = state.alerts.some(function (x) { return x.roomId === room.id && x.type === a.type && x.active; });
      if (!exists) state.alerts.unshift(Object.assign({
        id: uid('AL'), roomId: room.id, pos: pos, active: true, pushed: false, pushedTo: [],
        time: ymdhm(now())
      }, a));
    }
    if (room.equipStatus === 'fault') {
      add({ level: '告警', type: '设备故障', title: '设备故障：' + room.name + ' 设备上报故障',
        desc: '设备运行状态为故障，当前能耗 ' + room.total + ' kWh，环境温度 ' + room.temp + '℃。',
        reason: '关键用能设备运行异常，可能伴随温升与能耗异常。',
        advice: '立即派发检修工单并启用备用设备。', expect: '消除设备宕机与过热风险' });
    }
    if (room.total >= p.energyRed) {
      add({ level: '告警', type: '异常能耗', title: '高能耗异常：' + room.name,
        desc: '当前总能耗 ' + room.total + ' kWh，超过红色阈值 ' + p.energyRed + ' kWh。',
        reason: '空调/设备高负荷叠加，单位面积能耗显著超标。',
        advice: '上调空调温度、照明调光、错峰使用大功率设备。', expect: '预计降低该区域能耗 12%~20%' });
    } else if (room.total >= p.energyOrange) {
      add({ level: '预警', type: '能耗偏高', title: '能耗预警：' + room.name,
        desc: '当前总能耗 ' + room.total + ' kWh，超过橙色阈值 ' + p.energyOrange + ' kWh。',
        reason: '用能强度偏高，存在优化空间。',
        advice: '核查设备运行台数与设定参数。', expect: '预计降低能耗约 8%' });
    }
    if (room.occupancy === 0 && room.total >= p.idleLoad && room.equipStatus === 'running'
        && (room.type === 'meeting' || room.type === 'office' || room.type === 'public')) {
      add({ level: '预警', type: '无人空耗', title: '无人空耗：' + room.name,
        desc: '在场人数为 0，但能耗仍达 ' + room.total + ' kWh，设备处于运行状态。',
        reason: '人员离开后空调/照明未关闭。',
        advice: '远程关停空调与照明，启用人体感应联动策略。', expect: '预计每小时节约 6~10 kWh' });
    }
    if (room.temp >= 28 && room.type === 'equip') {
      add({ level: '预警', type: '设备运行异常', title: '环境过热：' + room.name + ' 温度 ' + room.temp + '℃',
        desc: '设备机房温度超过 28℃ 警戒线。',
        reason: '制冷能力不足或气流组织异常。',
        advice: '检查精密空调与风道，加大冷量。', expect: '温度回落至 26℃ 以下' });
    }
  }

  /* ---------------- 业务动作 1：交互式能耗/环境数据录入 ---------------- */
  Store.submitRoomData = function (roomId, d) {
    var room = Store.getRoom(roomId);
    if (!room) return;
    var prevTotal = room.total, prevHvac = room.hvac, prevLight = room.light,
        prevEle = room.elevator, prevHeat = room.heating, prevSock = room.socket;
    var parts = ['heating', 'hvac', 'light', 'socket', 'elevator'];
    var hasParts = parts.some(function (k) { return d[k] != null && d[k] !== ''; });
    if (hasParts) {
      parts.forEach(function (k) { if (d[k] != null && d[k] !== '') room[k] = Math.max(0, +d[k]); });
      if (d.total == null || d.total === '') {
        room.total = room.heating + room.hvac + room.light + room.socket + room.elevator; // 分项自动汇总
      }
    }
    if (d.total != null && d.total !== '') room.total = +d.total;
    if (d.temp != null && d.temp !== '') room.temp = +d.temp;
    if (d.humidity != null && d.humidity !== '') room.humidity = +d.humidity;
    if (d.occupancy != null && d.occupancy !== '') room.occupancy = +d.occupancy;
    if (d.equipStatus) {
      room.equipStatus = d.equipStatus;
      // 同步该房间设备台账
      state.devices.forEach(function (dv) {
        if (dv.roomId === room.id && d.equipStatus === 'fault' && dv.type === '空调') dv.status = 'fault';
      });
    }
    room.updatedAt = ymdhm(now());

    // 联动建筑级时序（当日当前小时增量）
    var last = state.series.total.length - 1;
    var delta = room.total - prevTotal;
    state.series.total[last] = Math.max(20, state.series.total[last] + Math.round(delta));
    if (d.hvac != null) state.series.hvac[last] = Math.max(5, state.series.hvac[last] + (room.hvac - prevHvac));
    if (d.light != null) state.series.light[last] = Math.max(3, state.series.light[last] + (room.light - prevLight));
    if (d.elevator != null) state.series.elevator[last] = Math.max(1, state.series.elevator[last] + (room.elevator - prevEle));
    if (d.heating != null) state.series.heating[last] = Math.max(0, state.series.heating[last] + (room.heating - prevHeat));
    if (d.socket != null) state.series.socket[last] = Math.max(2, state.series.socket[last] + (room.socket - prevSock));

    // 采集清洗留痕
    state.cleaning.unshift({
      id: 'DC' + pad(Math.floor(Math.random() * 90) + 10),
      source: '人工录入 / ' + room.no + ' ' + room.name, metric: '综合工况数据',
      raw: +(room.total).toFixed(1), cleaned: +(room.total).toFixed(1),
      note: d.anomalyType && d.anomalyType !== 'none' ? '人工标记异常：' + d.anomalyType + '，触发规则引擎复核' : '人工录入数据，量程校验通过',
      status: '已归集', time: ymdhm(now())
    });

    // 规则引擎重新评估告警
    evalRoomAlerts(room);

    // 重新预测
    var fc = computeForecast(state.prediction.scenario);
    state.prediction.future = fc.future; state.prediction.band = fc.band;

    Store.emit({ type: 'room-data', roomId: roomId });
  };

  /* ---------------- 业务动作 2：AI 工况调整 → 重算预测 ---------------- */
  Store.setScenario = function (sc) {
    Object.assign(state.prediction.scenario, sc);
    var fc = computeForecast(state.prediction.scenario);
    state.prediction.future = fc.future; state.prediction.band = fc.band;
    state.prediction.lastFactor = fc.factor;
    Store.emit({ type: 'scenario' });
    return fc;
  };

  /* ---------------- 业务动作 3：设备节能调控模拟 ---------------- */
  Store.toggleDevice = function (devId) {
    var dv = state.devices.filter(function (x) { return x.id === devId; })[0];
    if (!dv) return;
    if (dv.status === 'running') dv.status = 'stopped';
    else if (dv.status === 'stopped') dv.status = 'running';
    else dv.status = 'running'; // 故障复位（模拟检修完成）
    var room = Store.getRoom(dv.roomId);
    if (room) evalRoomAlerts(room);
    Store.emit({ type: 'device' });
  };
  Store.setDeviceMode = function (devId, mode) {
    var dv = state.devices.filter(function (x) { return x.id === devId; })[0];
    if (dv) { dv.mode = mode; Store.emit({ type: 'device' }); }
  };
  // 真实工程方案节能率：磁悬浮35%-40%、LED 40%、地源热泵、数字化10%-15%、BIPV绿电替代、围护结构10%
  var CONTROL_RATE = {
    envelope: { hvac: .10, heating: .10, desc: '高性能围护结构+断桥铝Low-E' },
    chiller:  { hvac: .37, desc: '磁悬浮冷水机组 COP≥6.5（较COP≤4.2节能35%-40%）' },
    gshp:     { heating: .30, desc: '地源热泵 冬COP4.0/夏EER5.2（年省47.3 tCO₂）' },
    led:      { light: .40, desc: '光感+人体感应LED（降40%）' },
    heatRec:  { heating: .15, desc: '空调冷凝热回收生活热水（节能率15%）' },
    digital:  { all: .12, desc: '分楼层能耗排名激励（节能10%-15%）' },
    bipv:     { offset: .15, desc: '屋顶BIPV覆盖率30% 年发电120kWh/㎡（绿电替代）' },
    tracker:  { pvGain: .20, desc: '视日运动轨迹追光（发电增益约20%）' }
  };
  Store.controlCut = function () {
    var s = state.control.strategies, p = state.control.pv || {};
    var c = { hvac: 0, heating: 0, light: 0, socket: 0, elevator: 0, offset: 0 };
    function add(k) {
      var r = CONTROL_RATE[k]; if (!r || !s[k]) return;
      ['hvac', 'heating', 'light', 'socket', 'elevator'].forEach(function (p2) {
        if (r[p2]) c[p2] = Math.max(c[p2], Math.min(.6, c[p2] + r[p2]));
      });
      if (r.all) ['hvac', 'heating', 'light', 'socket', 'elevator'].forEach(function (p2) { c[p2] = Math.min(.6, c[p2] + r.all); });
      if (r.offset) c.offset += r.offset;
    }
    ['envelope', 'chiller', 'gshp', 'led', 'heatRec', 'digital', 'bipv'].forEach(add);
    if (s.bipv && p.tracker) c.offset = Math.min(.25, c.offset * (1 + CONTROL_RATE.tracker.pvGain));
    return c;
  };
  Store.applyControl = function (cfg) {
    if (cfg && cfg.strategies) state.control.strategies = Object.assign({}, state.control.strategies, cfg.strategies);
    if (cfg && cfg.pv) state.control.pv = Object.assign({}, state.control.pv, cfg.pv);
    Object.assign(state.control, { acTemp: cfg && cfg.acTemp != null ? cfg.acTemp : state.control.acTemp,
      lightDim: cfg && cfg.lightDim != null ? cfg.lightDim : state.control.lightDim, applied: true });
    var c = Store.controlCut();
    var saved = 0, savedBy = { hvac: 0, heating: 0, light: 0, socket: 0, elevator: 0, offset: 0 };
    state.rooms.forEach(function (r) {
      if (r.equipStatus !== 'running') return;
      var before = r.total;
      r.heating = Math.round(r.heating * (1 - c.heating));
      r.hvac = Math.round(r.hvac * (1 - c.hvac));
      r.light = Math.round(r.light * (1 - c.light));
      r.socket = Math.round(r.socket * (1 - c.socket));
      r.elevator = Math.max(1, Math.round(r.elevator * (1 - c.elevator)));
      var subtotal = r.heating + r.hvac + r.light + r.socket + r.elevator;
      r.total = Math.round(subtotal * (1 - c.offset));
      saved += before - r.total;
      r.updatedAt = ymdhm(now());
      evalRoomAlerts(r);
    });
    state.control.savedKwh = Math.round(saved * 10) / 10;
    // 加权综合削减率（落在 10%-40% 工程区间）
    var totalBefore = 0, totalAfter = 0;
    state.rooms.forEach(function (r) { totalAfter += r.total; });
    var cut = saved > 0 ? saved / (saved + totalAfter) : 0;
    state.control.cutRate = +cut.toFixed(3);
    state.control.savedCarbon = Math.round(saved * GRID_FACTOR) / 1000; // kg→tCO₂
    state.cleaning.unshift({
      id: 'DC' + pad(Math.floor(Math.random() * 90) + 10),
      source: '节能调控引擎', metric: '建筑侧+光储侧策略下发',
      raw: '四维减碳策略 + 追光/储能/削峰填谷',
      cleaned: '策略已执行，综合削减 ' + (cut * 100).toFixed(1) + '%（工程区间10%-40%）',
      note: '调控结果已实时同步至3D模型与能耗图表', status: '已归集', time: ymdhm(now())
    });
    var fc = computeForecast(state.prediction.scenario);
    state.prediction.future = fc.future; state.prediction.band = fc.band;
    Store.emit({ type: 'control' });
    return cut;
  };

  /* ---------------- 业务动作 4：告警处置 / 推送模拟 ---------------- */
  Store.pushAlert = function (alertId, channel) {
    var a = state.alerts.filter(function (x) { return x.id === alertId; })[0];
    if (!channel) channel = 'App推送';
    if (!a) return;
    a.pushed = true;
    if (a.pushedTo.indexOf(channel) < 0) a.pushedTo.push(channel);
    var toMap = {
      '短信': '值班人员 138****6621',
      '邮件': 'energy@juanzhiwei.cn',
      'App推送': '在线用户 + Android终端App（全网广播）',
      '全网广播': '全部在线用户 / App / 短信 / 邮件'
    };
    state.pushLogs.unshift({
      time: ymdhm(now()), channel: channel, to: toMap[channel] || '在线用户',
      content: '【居安智卫】' + a.pos + '：' + a.title + '，系统已自动生成匹配减碳路径的优化方案与处置建议。'
    });
    Store.emit({ type: 'push' });
  };

  /* ---------------- 业务动作：碳排放实时计算（华北电网因子0.8843 kgCO₂/kWh） ---------------- */
  Store.roomCarbon = function (kwh) {
    return Math.round((kwh == null ? 0 : kwh) * GRID_FACTOR * 100) / 100;  // kgCO₂
  };

  /* ---------------- 业务动作：LCA真实数据手动修改 → 公式重算、图表联动 ---------------- */
  function recalcLca() {
    function sum(arr) { return Math.round(arr.reduce(function (s, x) { return s + x.v; }, 0) * 1000) / 1000; }
    var t = state.lca.totals;
    t.production = sum(state.lca.materials);
    t.transport = sum(state.lca.transport);
    t.sink = sum(state.lca.sinks);
    t.operation = sum(state.lca.operation);
    state.lca.construct.forEach(function (c) {
      if (c.name === '建造阶段合计') t.construction = c.v;
      if (c.name === '拆除阶段') t.demolition = c.v;
    });
    // 总排放 = 生产 + 运输 + 建造 + 运营 + 拆除 - 碳汇抵扣
    t.lifecycle = Math.round((t.production + t.transport + t.construction + t.operation + t.demolition - t.sink) * 1000) / 1000;
    t.annual = Math.round(t.lifecycle / state.lca.lifeYears * 1000) / 1000;
    t.perAreaAnnual = Math.round(t.annual * 1000 / state.lca.area * 100) / 100;
    t.perAreaTotal = Math.round(t.lifecycle * 1000 / state.lca.area * 100) / 100;
    var parts = { production: t.production, transport: t.transport, construction: t.construction,
      operation: t.operation, demolition: t.demolition };
    var gross = Object.keys(parts).reduce(function (s, k) { return s + parts[k]; }, 0);
    Object.keys(parts).forEach(function (k) {
      state.lca.pct[k] = Math.round(parts[k] / gross * 10000) / 100;
    });
    state.lca.pctCustom = true;
  }
  Store.updateLcaItem = function (group, name, v) {
    var map = { materials: state.lca.materials, transport: state.lca.transport, sinks: state.lca.sinks, operation: state.lca.operation };
    var arr = map[group];
    if (!arr) {
      var c = state.lca.construct.filter(function (x) { return x.name === name; })[0];
      if (c) { c.v = +v; recalcLca(); Store.emit({ type: 'lca' }); }
      return;
    }
    var item = arr.filter(function (x) { return x.name === name; })[0];
    if (item) { item.v = Math.max(0, +v); recalcLca(); Store.emit({ type: 'lca' }); }
  };

  /* ---------------- 业务动作：GPS定位节点增删改 + 电池充放电模拟 ---------------- */
  Store.addGpsNode = function (node) {
    state.gpsNodes.push(Object.assign({ id: uid('GPS'), lng: 117.2014, lat: 39.0845, status: '在线' }, node));
    Store.emit({ type: 'gps' });
  };
  Store.removeGpsNode = function (id) {
    state.gpsNodes = state.gpsNodes.filter(function (n) { return n.id !== id; });
    Store.emit({ type: 'gps' });
  };
  Store.setGpsNode = function (id, patch) {
    var n = state.gpsNodes.filter(function (x) { return x.id === id; })[0];
    if (n) { Object.assign(n, patch); Store.emit({ type: 'gps' }); }
  };
  Store.setBatteryMode = function (mode) {
    var b = state.battery;
    if (mode === 'charge') { b.status = '谷段充电（储能充电 300kW）'; b.chargeKw = 300; b.dischargeKw = 0; }
    else if (mode === 'discharge') { b.status = '高峰放电（削峰填谷 240kW）'; b.chargeKw = 0; b.dischargeKw = 240; }
    else { b.status = '待机热备（调频）'; b.chargeKw = 0; b.dischargeKw = 0; }
    Store.emit({ type: 'battery' });
  };
  Store.resolveAlert = function (alertId) {
    var a = state.alerts.filter(function (x) { return x.id === alertId; })[0];
    if (a) { a.active = false; a.resolvedAt = ymdhm(now()); Store.emit({ type: 'alert' }); }
  };

  /* ---------------- 业务动作 5：套筒应力录入 ---------------- */
  Store.submitSleeve = function (id, stress, result) {
    var s = state.sleeves.filter(function (x) { return x.id === id; })[0];
    if (!s) return;
    s.stress = +stress; s.time = ymdhm(now());
    s.aiResult = result || s.aiResult;
    s.wave.push(+stress);
    while (s.wave.length > 60) s.wave.shift();
    var p = state.params;
    var st = s.stress >= p.sleeveLimit ? 'alarm' : (s.stress >= p.sleeveWarn ? 'warn' : 'normal');
    var old = s.status;
    s.status = st;
    s.aiResult = st === 'alarm' ? '红色告警' : (st === 'warn' ? '黄色预警' : '正常');
    s.health = st === 'alarm' ? 61 : (st === 'warn' ? 78 : Math.min(99, Math.round(96 + (300 - s.stress) / 40)));
    s.grout = st === 'alarm' ? '灌浆不密实(疑似缺陷)' : '灌浆饱满';
    if (st === 'alarm' && old !== 'alarm') {
      state.alerts.unshift({
        id: uid('AL'), level: '告警', type: '结构安全', nodeId: s.id, pos: s.location,
        title: '套筒应力超限：' + s.id + '（' + s.stress + 'MPa）',
        desc: '当前应力 ' + s.stress + ' MPa，超过限值 ' + p.sleeveLimit + ' MPa，AI判定为红色告警。',
        reason: '疑似灌浆不密实/锚固缺陷，节点应力集中。',
        advice: '立即停止该区域上部作业，派发结构整改工单，复检灌浆质量。',
        expect: '复测应力回落至限值以内', active: true, pushed: false, pushedTo: [], time: ymdhm(now())
      });
    }
    Store.emit({ type: 'sleeve' });
  };

  /* ---------------- 业务动作 6：工单闭环 ---------------- */
  Store.createOrder = function (o) {
    var d = now();
    var id = 'WO-' + ymd(d).replace(/-/g, '') + '-' + pad(state.orders.length + 1).slice(-2);
    var order = Object.assign({
      id: id, status: '待整改', result: '', accept: '待验收',
      created: ymdhm(d), reporter: JA.session ? JA.session.username : '人工'
    }, o);
    state.orders.unshift(order);
    Store.emit({ type: 'order' });
    return order;
  };
  Store.updateOrder = function (id, patch) {
    var o = state.orders.filter(function (x) { return x.id === id; })[0];
    if (o) {
      Object.assign(o, patch);
      if (patch.result && o.status === '待整改') o.status = '整改中';
      if (patch.accept === '合格' || patch.accept === '不合格') o.status = '已闭环';
      Store.emit({ type: 'order' });
    }
    return o;
  };

  /* ---------------- 业务动作 7：用户管理 ---------------- */
  Store.saveUser = function (u) {
    var ex = state.users.filter(function (x) { return x.username === u.username; })[0];
    if (ex) Object.assign(ex, u); else state.users.push(u);
    Store.emit({ type: 'user' });
  };
  Store.toggleUser = function (name) {
    var u = state.users.filter(function (x) { return x.username === name; })[0];
    if (u) { u.enabled = !u.enabled; Store.emit({ type: 'user' }); }
  };
  Store.saveParams = function (p) {
    Object.assign(state.params, p);
    Store.emit({ type: 'params' });
  };
  /* 阈值变更后全量重算房间告警与能耗等级（3D/图表自动联动） */
  Store.refreshAllAlerts = function () {
    state.alerts = state.alerts.filter(function (a) { return !!a.nodeId; });
    state.rooms.forEach(function (r) { evalRoomAlerts(r); });
    var fc = computeForecast(state.prediction.scenario);
    state.prediction.future = fc.future; state.prediction.band = fc.band;
    Store.emit({ type: 'params' });
  };

  /* ---------------- KPI 指标中心（全量实时计算） ---------------- */
  Store.kpis = function () {
    var s = state;
    var totalKwh = s.rooms.reduce(function (a, r) { return a + r.total; }, 0);
    var activeAlerts = s.alerts.filter(function (a) { return a.active; });
    var pendingOrders = s.orders.filter(function (o) { return o.accept === '待验收' || o.status !== '已闭环'; });
    var deviceTotal = s.devices.length;
    var deviceFault = s.devices.filter(function (d) { return d.status === 'fault'; }).length;
    var sleeveAlarm = s.sleeves.filter(function (x) { return x.status === 'alarm'; }).length;
    var health = Math.round(
      s.sleeves.reduce(function (a, x) { return a + +x.health; }, 0) / s.sleeves.length
    );
    var energyIdx = clamp(Math.round(100 - (totalKwh / s.rooms.length - 45) * 0.8), 60, 99);
    var overallHealth = Math.round(health * 0.55 + energyIdx * 0.45);
    var nextForecast = s.prediction.future[(new Date().getHours() + 1) % 24] || s.prediction.future[0];
    return {
      buildings: s.buildings.length,
      area: s.lca.area, floors: s.lca.floors,
      rooms: s.buildings.reduce(function (a, b) { return a + b.rooms; }, 0),
      monitoredRooms: s.rooms.length,
      devices: deviceTotal, deviceFault: deviceFault,
      sleeves: s.sleeves.length, sleeveAlarm: sleeveAlarm,
      health: overallHealth, energyIdx: energyIdx,
      totalKwh: totalKwh,
      todayKwh: s.series.total.reduce(function (a, b) { return a + b; }, 0),
      forecast: nextForecast,
      alerts: activeAlerts.length,
      redAlerts: activeAlerts.filter(function (a) { return a.level === '告警'; }).length,
      orders: pendingOrders.length,
      accuracy: Math.round(s.params.accuracy * 1000) / 10,
      saveRate: Math.round(s.params.saveRate * 1000) / 10,
      saveRangeText: '10%-40%',
      yearCarbon: s.lca.totals.operation,       // 建筑运行年碳排放 34356.539 tCO₂
      lcaCarbon: s.lca.totals.lifecycle,        // 全生命周期总碳排放 50495.447 tCO₂
      occupancy: Math.round(s.rooms.reduce(function (a, r) { return a + r.occupancy; }, 0)),
      avgTemp: (s.rooms.reduce(function (a, r) { return a + r.temp; }, 0) / s.rooms.length).toFixed(1)
    };
  };

  /* ---------------- 房间能耗等级（供3D/地图着色） ---------------- */
  Store.roomLevel = function (r) {
    var p = state.params;
    if (r.equipStatus === 'fault') return 'fault';
    if (r.total >= p.energyRed) return 'high';
    if (r.total >= p.energyOrange) return 'mid';
    if (r.total >= 30) return 'normal';
    return 'low';
  };
  Store.roomHasAlert = function (r) {
    return state.alerts.some(function (a) { return a.roomId === r.id && a.active; });
  };

  /* ---------------- 数据重置（答辩演示一键还原） ---------------- */
  Store.reset = function () { location.reload(); };

  /* ---------------- 会话 ---------------- */
  JA.Store = Store;
  JA.Utils = { pad: pad, ymd: ymd, ymdhm: ymdhm, hm: hm, uid: uid, clamp: clamp, rnd: rnd, deep: deep, hourLabels: hourLabels };
})();
