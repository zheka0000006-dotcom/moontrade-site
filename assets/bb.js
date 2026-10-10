/* Bollinger bot demo: one clear example, played on a loop.
   Price drifts towards the upper band -> "Можливий дотик" (a potential situation, no touch yet)
   -> the next candle closes touching the band -> "Перетин підтверджено". */
(function () {
  'use strict';
  var box = document.getElementById('bb-demo'); if (!box) return;
  var cv = box.querySelector('canvas'), ctx = cv.getContext('2d'), toast = box.querySelector('.bb-toast');
  var steps = [].slice.call(document.querySelectorAll('.bb-steps li'));
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var seed = 21; function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }

  var N = 20, M = 2, T = 60, WARN = 56, HIT = 57, VIEW = 18;
  var O = [], Hh = [], L = [], C = [], p = 100, k;
  for (k = 0; k < T; k++) {
    var drift = (100 + Math.sin(k / 2.6) * 0.35 - p) * 0.45 + (k >= 53 && k < WARN ? 0.12 : 0);
    var o = p, c = p + drift + (rnd() - 0.5) * 0.22;
    O.push(o); C.push(c); Hh.push(Math.max(o, c) + rnd() * 0.14); L.push(Math.min(o, c) - rnd() * 0.14); p = c;
  }
  function band(i) {
    var s = 0, q = 0, j; for (j = i - N + 1; j <= i; j++) s += C[j]; var m = s / N;
    for (j = i - N + 1; j <= i; j++) q += (C[j] - m) * (C[j] - m); var sd = Math.sqrt(q / N);
    return [m, m + M * sd, m - M * sd];
  }
  // keep every earlier candle clearly inside the bands
  for (var pass = 0; pass < 4; pass++) {
    for (k = N; k < WARN; k++) {
      var bb = band(k), w = bb[1] - bb[2], top = bb[1] - w * 0.14, bot = bb[2] + w * 0.14, sh = 0;
      if (Hh[k] > top) sh = top - Hh[k]; else if (L[k] < bot) sh = bot - L[k];
      if (sh) { O[k] += sh; C[k] += sh; Hh[k] += sh; L[k] += sh; if (k + 1 < T) O[k + 1] = C[k]; }
    }
  }
  // shape the two key candles against the real band values
  for (var it = 0; it < 6; it++) {
    var b56 = band(WARN); O[WARN] = C[WARN - 1]; C[WARN] = b56[1] - (b56[1] - b56[0]) * 0.34; Hh[WARN] = b56[1] - (b56[1] - b56[0]) * 0.16; L[WARN] = Math.min(O[WARN], C[WARN]) - 0.05;
    var b57 = band(HIT); O[HIT] = C[WARN]; C[HIT] = b57[1] + (b57[1] - b57[0]) * 0.06; Hh[HIT] = C[HIT] + 0.06; L[HIT] = O[HIT] - 0.04;
  }
  for (k = HIT + 1; k < T; k++) { O[k] = C[k - 1]; C[k] = O[k] - 0.12 - rnd() * 0.12; Hh[k] = O[k] + 0.05; L[k] = C[k] - 0.06; }

  var W, H, dpr, head = 0, t = 0, phase = 'play', hold = 0;
  var START = HIT - 11, END = HIT + 2;
  function size() { var b = box.getBoundingClientRect(); dpr = Math.min(2, devicePixelRatio || 1); W = Math.max(1, b.width); H = Math.max(1, b.height); cv.width = W * dpr; cv.height = H * dpr; }
  function setStep(n) { steps.forEach(function (li, i) { li.classList.toggle('on', i === n); }); }
  function showToast(kind) {
    if (!kind) { toast.className = 'bb-toast'; return; }
    toast.className = 'bb-toast show ' + kind;
    toast.innerHTML = kind === 'warn' ? '<b>Можливий дотик</b><span>Потенційна ситуація: ціна біля смуги</span>' : '<b>Перетин підтверджено</b><span>Свічка закрилася з дотиком</span>';
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    var last = Math.min(END, Math.floor(head)), from = last - (VIEW - 6) + 1, lo = 1e9, hi = -1e9, i, b;
    for (i = HIT - 13; i <= HIT; i++) { b = band(i); lo = Math.min(lo, L[i], b[2]); hi = Math.max(hi, Hh[i], b[1]); }
    var pad = (hi - lo) * 0.14; lo -= pad; hi += pad;
    var Lx = 16, Rx = W - 16, Ty = 18, By = H - 18, cw = (Rx - Lx) / VIEW;
    function X(i) { return Lx + (i - from + 0.5) * cw; }
    function Y(v) { return By - (v - lo) / (hi - lo) * (By - Ty); }
    ctx.strokeStyle = 'rgba(205,189,255,.07)'; ctx.lineWidth = 1;
    for (i = 1; i < 6; i++) { ctx.beginPath(); ctx.moveTo(Lx, Ty + (By - Ty) * i / 6); ctx.lineTo(Rx, Ty + (By - Ty) * i / 6); ctx.stroke(); }
    // bands
    ctx.beginPath(); for (i = from; i <= last; i++) { b = band(i); i === from ? ctx.moveTo(X(i), Y(b[1])) : ctx.lineTo(X(i), Y(b[1])); }
    for (i = last; i >= from; i--) { b = band(i); ctx.lineTo(X(i), Y(b[2])); }
    ctx.closePath(); ctx.fillStyle = 'rgba(139,92,246,.10)'; ctx.fill();
    [[1, '#b9a4ff', 2], [2, '#b9a4ff', 2], [0, 'rgba(205,189,255,.4)', 1.2]].forEach(function (q) {
      ctx.beginPath(); for (i = from; i <= last; i++) { b = band(i); i === from ? ctx.moveTo(X(i), Y(b[q[0]])) : ctx.lineTo(X(i), Y(b[q[0]])); }
      ctx.strokeStyle = q[1]; ctx.lineWidth = q[2]; ctx.setLineDash(q[0] ? [] : [4, 4]); ctx.stroke(); ctx.setLineDash([]);
    });
    // candles (the newest one grows in)
    var bw = Math.max(4, cw * 0.56), frac = head - Math.floor(head);
    for (i = from; i <= last; i++) {
      var up = C[i] >= O[i], col = up ? '#3fe0a0' : '#ff6b8a', x = X(i), g = (i === last && phase === 'play') ? Math.min(1, frac * 1.6 + 0.2) : 1;
      ctx.save(); ctx.globalAlpha = g; ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(x, Y(Hh[i])); ctx.lineTo(x, Y(L[i])); ctx.stroke();
      var y1 = Y(Math.max(O[i], C[i])), y2 = Y(Math.min(O[i], C[i])); ctx.fillRect(x - bw / 2, y1, bw, Math.max(2, y2 - y1)); ctx.restore();
    }
    // markers
    if (last >= WARN) { b = band(WARN); ctx.save(); ctx.strokeStyle = '#ffc85c'; ctx.setLineDash([3, 3]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(X(WARN), Y(Hh[WARN]) - 4); ctx.lineTo(X(WARN), Y(b[1]) + 2); ctx.stroke(); ctx.restore(); }
    if (last >= HIT) { ctx.save(); ctx.strokeStyle = '#3fe0a0'; ctx.lineWidth = 2.2; ctx.shadowColor = '#3fe0a0'; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(X(HIT), Y(C[HIT]), 10, 0, 7); ctx.stroke(); ctx.restore(); }
  }

  function reset() { head = START; phase = 'play'; hold = 0; showToast(null); setStep(-1); }
  var last = 0, running = false, visible = true;
  function loop(now) {
    var dt = Math.min(0.1, (now - last) / 1000 || 0); last = now;
    if (phase === 'play') {
      var speed = head >= WARN - 1 ? 0.7 : 2.2;
      head += dt * speed;
      if (head >= WARN && head < WARN + 1) { showToast('warn'); setStep(0); }
      if (head >= HIT) { head = HIT + 0.999; phase = 'hit'; hold = 0; showToast('ok'); setStep(1); }
    } else if (phase === 'hit') { hold += dt; if (hold > 2.2) { phase = 'check'; hold = 0; setStep(2); } }
    else if (phase === 'check') { hold += dt; if (hold > 2.8) reset(); }
    draw();
    if (visible) requestAnimationFrame(loop); else running = false;
  }
  function start() { if (!running && !reduce) { running = true; last = performance.now(); requestAnimationFrame(loop); } }
  if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; if (visible) start(); }, { threshold: 0.3 }).observe(box);
  addEventListener('resize', function () { size(); draw(); });
  size(); reset();
  if (reduce) { head = HIT + 0.999; phase = 'hit'; showToast('ok'); setStep(1); }
  draw(); start();
})();
