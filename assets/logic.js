/* "Логіка руху ціни" — a step-by-step SMC breakdown drawn on canvas in the style of our educational videos. */
(function () {
  'use strict';
  var box = document.getElementById('logic'); if (!box) return;
  var cv = box.querySelector('canvas'), ctx = cv.getContext('2d');
  var tabs = [].slice.call(document.querySelectorAll('.lg-steps button'));
  var cap = document.getElementById('lg-cap');
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var K = [[100.6,100.98,99.83,100],[100,100.21,98.05,98.37],[98.37,98.72,96.42,96.82],[96.82,97.23,95.45,95.58],[95.58,95.89,93.62,93.96],[93.96,95.24,93.8,94.96],[94.96,96.53,94.83,96.26],[96.26,98.12,95.86,97.69],[97.69,97.98,95.91,96.11],[96.11,96.53,94.29,94.59],[94.59,94.99,92.31,92.71],[92.71,92.98,91.0,91.43],[91.43,92.62,91.17,92.31],[92.31,93.46,92.1,93.3],[93.3,94.71,93.19,94.32],[94.32,94.44,93.23,93.55],[93.55,93.75,92.91,93.2],[93.2,93.46,92.06,92.28],[92.28,92.73,91.05,91.3],[91.3,91.7,89.4,91.6],[91.6,93.35,91.45,93.1],[93.1,95.85,92.9,95.6],[95.6,96.65,95.2,96.4],[96.4,97.55,96.2,97.3],[97.3,97.55,96.7,96.9],[96.9,97.1,95.95,96.2],[96.2,96.4,95.35,95.6],[95.6,95.8,94.65,94.9],[94.9,95.1,94.15,94.4],[94.4,94.6,93.75,94.0],[94.0,94.5,93.75,94.3],[94.3,95.45,94.1,95.2],[95.2,95.51,94.78,95.0],[95.0,96.34,94.66,96.1],[96.1,97.23,95.81,97.0],[97.0,97.38,96.52,96.7],[96.7,97.97,96.49,97.8],[97.8,98.94,97.5,98.6],[98.6,98.81,98.07,98.3],[98.3,99.59,98.04,99.4],[99.4,100.36,99.08,100.2]]; // [open, high, low, close]
  var STEPS = [
    { upto: 18, cap: 'Ринок іде вниз: кожен максимум і мінімум нижчий за попередній.' },
    { upto: 19, cap: 'Під рівними мінімумами стоять стопи. Ціна знімає їх і різко повертається.' },
    { upto: 24, cap: 'Імпульс ламає останній максимум — структура змінюється на висхідну.' },
    { upto: 30, cap: 'Після імпульсу лишився імбаланс. Ціна повертається в цю зону.' },
    { upto: 40, cap: 'Вхід угору лише з підтвердженням, на час експірації. Ціль — ліквідність над максимумом. Закриття під зоною — інвалідація ідеї.' }
  ];
  var LO = 88.6, HI = 101.4, W, H, dpr, step = 0, shown = 0, target = 18, fade = 1, auto = true, pauseUntil = 0, timer = 0;

  function size() { var b = cv.getBoundingClientRect(); dpr = Math.min(2, devicePixelRatio || 1); W = Math.max(1, b.width); H = Math.max(1, b.height); cv.width = W * dpr; cv.height = H * dpr; }
  function X(i) { var L = 18, R = W - 70; return L + (i + 0.5) * (R - L) / K.length; }
  function Y(v) { var T = 22, B = H - 22; return B - (v - LO) / (HI - LO) * (B - T); }
  var Q = [];
  function pill(text, x, y, col, align) { Q.push({ t: text, x: x, y: y, c: col, al: align, a: ctx.globalAlpha }); }
  function hit(r, s) { return r.x < s.x + s.w && s.x < r.x + r.w && r.y < s.y + s.h && s.y < r.y + r.h; }
  function flushPills(boxes) {
    var placed = [];
    ctx.font = '700 ' + (W < 520 ? 11 : 12.5) + 'px Manrope, system-ui, sans-serif';
    Q.forEach(function (p) {
      var w = ctx.measureText(p.t).width + 18, h = W < 520 ? 22 : 25, x = p.x;
      if (p.al === 'r') x -= w; if (p.al === 'c') x -= w / 2;
      x = Math.max(4, Math.min(W - w - 4, x));
      var best = null, offs = [0, 12, -12, 24, -24, 36, -36, 48, -48, 62, -62];
      for (var k = 0; k < offs.length; k++) {
        var r = { x: x - 3, y: p.y + offs[k] - h / 2 - 3, w: w + 6, h: h + 6 };
        if (r.y < 2 || r.y + r.h > H - 2) continue;
        var bad = boxes.some(function (b) { return hit(r, b); }) || placed.some(function (b) { return hit(r, b); });
        if (!bad) { best = offs[k]; break; }
      }
      if (best === null) best = 0;
      var y = p.y + best; placed.push({ x: x - 3, y: y - h / 2 - 3, w: w + 6, h: h + 6 });
      ctx.save(); ctx.globalAlpha = p.a;
      ctx.fillStyle = 'rgba(13,10,31,.94)'; ctx.strokeStyle = p.c; ctx.lineWidth = 1.2;
      ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y - h / 2, w, h, 8); else ctx.rect(x, y - h / 2, w, h); ctx.fill(); ctx.stroke();
      ctx.fillStyle = p.c; ctx.textBaseline = 'middle'; ctx.fillText(p.t, x + 9, y + 0.5); ctx.restore();
    });
    Q = [];
  }
  function hline(v, i0, i1, col, dash) { ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 1.6; ctx.setLineDash(dash || []); ctx.beginPath(); ctx.moveTo(X(i0), Y(v)); ctx.lineTo(X(i1), Y(v)); ctx.stroke(); ctx.restore(); }
  function burst(x, y, a) {
    ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    for (var k = 0; k < 8; k++) { var an = k * Math.PI / 4; ctx.beginPath(); ctx.moveTo(x + Math.cos(an) * 9, y + Math.sin(an) * 9); ctx.lineTo(x + Math.cos(an) * 16, y + Math.sin(an) * 16); ctx.stroke(); }
    ctx.restore();
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    // grid
    ctx.strokeStyle = 'rgba(205,189,255,.06)'; ctx.lineWidth = 1;
    for (var g = 0; g <= 8; g++) { var gy = 22 + (H - 44) * g / 8; ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); }
    for (g = 0; g <= 12; g++) { var gx = W * g / 12; ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke(); }
    var a = Math.min(1, fade);
    // zone of interest (FVG) under the candles
    if (step >= 3) {
      ctx.save(); ctx.globalAlpha = step === 3 ? a : 1;
      var grd = ctx.createLinearGradient(X(20), 0, X(40), 0); grd.addColorStop(0, 'rgba(139,92,246,.32)'); grd.addColorStop(1, 'rgba(139,92,246,.06)');
      ctx.fillStyle = grd; ctx.fillRect(X(20), Y(95.2), X(40) - X(20), Y(93.35) - Y(95.2));
      ctx.strokeStyle = 'rgba(205,189,255,.55)'; ctx.setLineDash([5, 4]); ctx.strokeRect(X(20), Y(95.2), X(40) - X(20), Y(93.35) - Y(95.2)); ctx.restore();
    }
    if (step >= 4) {
      ctx.save(); ctx.globalAlpha = a * 0.9;
      var eg = ctx.createLinearGradient(0, 18, 0, H - 18); eg.addColorStop(0, 'rgba(205,189,255,.0)'); eg.addColorStop(0.5, 'rgba(205,189,255,.10)'); eg.addColorStop(1, 'rgba(205,189,255,.0)');
      ctx.fillStyle = eg; ctx.fillRect(X(30.5), 18, X(35.5) - X(30.5), H - 36); ctx.restore();
    }
    // candles
    var bw = Math.max(3, (W - 88) / K.length * 0.56), boxes = [];
    for (var i = 0; i < K.length; i++) {
      if (i > shown + 1) break;
      var c = K[i], up = c[3] >= c[0], col = up ? '#3fe0a0' : '#ff6b8a', x = X(i);
      var grow = Math.max(0, Math.min(1, shown - i + 1)); if (grow <= 0) continue;
      ctx.save(); ctx.globalAlpha = grow; ctx.shadowColor = col; ctx.shadowBlur = 8;
      ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(x, Y(c[1])); ctx.lineTo(x, Y(c[2])); ctx.stroke();
      var y1 = Y(Math.max(c[0], c[3])), y2 = Y(Math.min(c[0], c[3]));
      ctx.fillRect(x - bw / 2, y1, bw, Math.max(1.5, y2 - y1)); ctx.restore();
      boxes.push({ x: x - bw / 2 - 2, y: Y(c[1]) - 2, w: bw + 4, h: Y(c[2]) - Y(c[1]) + 4 });
    }
    // overlays per step
    if (step === 0 || step >= 0) {
      var sw = [[0, 100.98], [4, 93.62], [7, 98.12], [11, 91.0], [14, 94.71], [18, 91.05]];
      ctx.save(); ctx.globalAlpha = step === 0 ? a * 0.95 : 0.18; ctx.strokeStyle = '#cdbdff'; ctx.lineWidth = 2; ctx.shadowColor = '#8b5cf6'; ctx.shadowBlur = 10;
      ctx.beginPath(); sw.forEach(function (p, k) { var py = Y(p[1]) + (k % 2 ? 10 : -10); k ? ctx.lineTo(X(p[0]), py) : ctx.moveTo(X(p[0]), py); }); ctx.stroke(); ctx.restore();
      if (step === 0) { ctx.save(); ctx.globalAlpha = a; pill('LH', X(7) - 16, Y(98.12) - 26, '#cdbdff'); pill('LL', X(4) - 16, Y(93.62) + 26, '#cdbdff'); pill('LH', X(14) - 16, Y(94.71) - 26, '#cdbdff'); pill('LL', X(11) - 16, Y(91.0) + 26, '#cdbdff'); ctx.restore(); }
    }
    if (step >= 1) {
      ctx.save(); ctx.globalAlpha = step === 1 ? a : 0.45;
      hline(91.0, 10.5, 24, '#ffc85c', [6, 5]);
      if (step === 1) { pill(W < 520 ? 'стопи під мінімумами' : 'стопи під рівними мінімумами', X(3), Y(91.0) + 24, '#ffc85c'); burst(X(19), Y(89.4), a); pill('зняли ліквідність', X(19) + 14, Y(89.4) + 4, '#ffffff'); }
      ctx.restore();
    }
    if (step >= 2) {
      ctx.save(); ctx.globalAlpha = step === 2 ? a : 0.45;
      hline(94.71, 14, 25, '#cdbdff');
      if (step === 2) { burst(X(21), Y(94.71), a); pill(W < 520 ? 'злам (CHoCH)' : 'злам структури (CHoCH)', X(7), Y(94.71) - 22, '#cdbdff'); }
      ctx.restore();
    }
    if (step === 3) { ctx.save(); ctx.globalAlpha = a; pill(W < 520 ? 'імбаланс (FVG)' : 'імбаланс (FVG) — зона інтересу', X(32), Y(93.35) + 24, '#cdbdff', 'c'); ctx.restore(); }
    if (step >= 4) {
      ctx.save(); ctx.globalAlpha = a;
      hline(98.12, 23, 40.5, '#3fe0a0', [6, 5]);
      hline(93.35, 20, 40.5, '#ff6b8a', [3, 5]);
      // entry: circle on the confirmation candle + arrow up
      var ex = X(31), ey = Y(K[31][3]);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ex, ey, 8, 0, 7); ctx.stroke();
      var ly = Y(92.15); ctx.beginPath(); ctx.moveTo(ex, ly - 12); ctx.lineTo(ex, ey + 12); ctx.moveTo(ex - 5, ey + 18); ctx.lineTo(ex, ey + 12); ctx.lineTo(ex + 5, ey + 18); ctx.stroke();
      // expiration bracket under the window
      var by = Y(90.2);
      ctx.strokeStyle = '#cdbdff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(X(30.5), by - 6); ctx.lineTo(X(30.5), by); ctx.lineTo(X(35.5), by); ctx.lineTo(X(35.5), by - 6); ctx.stroke();
      pill('експірація', (X(30.5) + X(35.5)) / 2, by + 16, '#cdbdff', 'c');
      pill('вхід угору', ex, ly, '#ffffff', 'c');
      pill('ціль — ліквідність', X(23), Y(98.12) - 18, '#3fe0a0');
      pill(W < 520 ? 'інвалідація' : 'інвалідація ідеї', X(36.2), Y(93.35) + 18, '#ff6b8a');
      ctx.restore();
    }
    flushPills(boxes);
  }

  function setStep(n, user) {
    step = n; target = STEPS[n].upto; if (shown > target) shown = target; fade = 0;
    if (n === 0) shown = reduce ? target : -1;
    tabs.forEach(function (t, i) { t.setAttribute('aria-selected', i === n ? 'true' : 'false'); t.classList.toggle('done', i < n); });
    cap.textContent = STEPS[n].cap;
    if (user) { auto = false; pauseUntil = performance.now() + 20000; }
    timer = 0;
  }
  tabs.forEach(function (t, i) { t.addEventListener('click', function () { setStep(i, true); if (!running) { shown = target; fade = 1; draw(); } }); });

  var last = 0, running = false, visible = true;
  function loop(t) {
    var dt = Math.min(0.1, (t - last) / 1000 || 0); last = t;
    if (shown < target) shown = Math.min(target, shown + dt * 9); fade = Math.min(1, fade + dt * 1.6);
    if (!auto && t > pauseUntil) auto = true;
    if (auto && shown >= target) { timer += dt; if (timer > 4.2) setStep((step + 1) % STEPS.length); }
    draw();
    if (visible) requestAnimationFrame(loop); else running = false;
  }
  function start() { if (!running && !reduce) { running = true; last = performance.now(); requestAnimationFrame(loop); } }
  if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; if (visible) start(); }, { threshold: 0.25 }).observe(box);
  addEventListener('resize', function () { size(); draw(); });
  size(); setStep(0); if (reduce) { shown = target; fade = 1; } draw(); start();
})();
