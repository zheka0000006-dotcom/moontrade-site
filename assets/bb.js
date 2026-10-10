/* Bollinger demo: candles stream across a tilted chart, the bands follow, and the bot raises an alert when a candle closes beyond a band. */
(function () {
  'use strict';
  var box = document.getElementById('bb-demo'); if (!box) return;
  var cv = box.querySelector('canvas'), ctx = cv.getContext('2d'), toast = box.querySelector('.bb-toast');
  var steps = [].slice.call(document.querySelectorAll('.bb-steps li'));
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var seed = 11; function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }

  // price path: calm drift with a sharp push every so often so the band gets touched
  var closes = [], opens = [], highs = [], lows = [], p = 100, k;
  for (k = 0; k < 600; k++) {
    var push = (k % 47 === 30) ? 1.9 : (k % 47 === 31 ? 1.4 : 0), side = (Math.floor(k / 47) % 2) ? -1 : 1;
    var o = p, c = p + (rnd() - 0.5) * 0.9 + push * side - (p - 100) * 0.04;
    opens.push(o); closes.push(c);
    highs.push(Math.max(o, c) + rnd() * 0.45); lows.push(Math.min(o, c) - rnd() * 0.45); p = c;
  }
  var N = 20, MULT = 2;
  function band(i) {
    var s = 0, q = 0, j; for (j = i - N + 1; j <= i; j++) s += closes[j]; var m = s / N;
    for (j = i - N + 1; j <= i; j++) q += (closes[j] - m) * (closes[j] - m); var sd = Math.sqrt(q / N);
    return [m, m + MULT * sd, m - MULT * sd];
  }

  var W, H, dpr, view = 46, head = N + view, t0 = 0, phase = 0, lastStep = -1;
  function size() {
    var b = box.getBoundingClientRect(); dpr = Math.min(2, window.devicePixelRatio || 1);
    W = Math.max(1, b.width); H = Math.max(1, b.height); cv.width = W * dpr; cv.height = H * dpr;
  }
  function setStep(n) { if (n === lastStep) return; lastStep = n; steps.forEach(function (li, i) { li.classList.toggle('on', i === n); }); }

  function draw(frac) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    var from = head - view, lo = 1e9, hi = -1e9, i, b;
    for (i = from; i <= head; i++) { b = band(i); lo = Math.min(lo, lows[i], b[2]); hi = Math.max(hi, highs[i], b[1]); }
    var pad = (hi - lo) * 0.12; lo -= pad; hi += pad;
    var L = 14, R = W - 14, T = 16, B = H - 16, cw = (R - L) / (view + 1);
    function X(i) { return L + (i - from + 0.5 - frac) * cw; }
    function Y(v) { return B - (v - lo) / (hi - lo) * (B - T); }
    // grid
    ctx.strokeStyle = 'rgba(205,189,255,.07)'; ctx.lineWidth = 1;
    for (i = 1; i < 5; i++) { ctx.beginPath(); ctx.moveTo(L, T + (B - T) * i / 5); ctx.lineTo(R, T + (B - T) * i / 5); ctx.stroke(); }
    // band fill + lines
    ctx.beginPath(); for (i = from; i <= head; i++) { b = band(i); i === from ? ctx.moveTo(X(i), Y(b[1])) : ctx.lineTo(X(i), Y(b[1])); }
    for (i = head; i >= from; i--) { b = band(i); ctx.lineTo(X(i), Y(b[2])); }
    ctx.closePath(); ctx.fillStyle = 'rgba(139,92,246,.10)'; ctx.fill();
    [[1, '#b9a4ff'], [2, '#b9a4ff'], [0, 'rgba(205,189,255,.45)']].forEach(function (a) {
      ctx.beginPath(); for (i = from; i <= head; i++) { b = band(i); i === from ? ctx.moveTo(X(i), Y(b[a[0]])) : ctx.lineTo(X(i), Y(b[a[0]])); }
      ctx.strokeStyle = a[1]; ctx.lineWidth = a[0] ? 2 : 1.2; ctx.setLineDash(a[0] ? [] : [4, 4]); ctx.stroke(); ctx.setLineDash([]);
    });
    // candles
    var bw = Math.max(3, cw * 0.58);
    for (i = from; i <= head; i++) {
      var up = closes[i] >= opens[i], col = up ? '#3fe0a0' : '#ff6b8a', x = X(i);
      b = band(i); var hit = closes[i] > b[1] || closes[i] < b[2];
      ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(x, Y(highs[i])); ctx.lineTo(x, Y(lows[i])); ctx.stroke();
      var y1 = Y(Math.max(opens[i], closes[i])), y2 = Y(Math.min(opens[i], closes[i]));
      ctx.fillRect(x - bw / 2, y1, bw, Math.max(1.5, y2 - y1));
      if (hit && i > head - 12) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, closes[i] > b[1] ? y1 - 12 : y2 + 12, 7, 0, 7); ctx.stroke(); }
    }
    // alert state for the newest closed candle
    b = band(head); var near = highs[head] > b[1] - (b[1] - b[0]) * 0.08 || lows[head] < b[2] + (b[0] - b[2]) * 0.08;
    var crossed = closes[head] > b[1] || closes[head] < b[2];
    if (crossed) { toast.className = 'bb-toast ok show'; toast.innerHTML = '<b>Перетин підтверджено</b><span>Свічка закрилася за смугою</span>'; setStep(1); phase = 2.4; }
    else if (near && phase <= 0) { toast.className = 'bb-toast warn show'; toast.innerHTML = '<b>Можливий дотик</b><span>Ціна біля краю смуги</span>'; setStep(0); }
    else if (phase > 0) { setStep(phase > 1.2 ? 1 : 2); }
    else { toast.className = 'bb-toast'; setStep(-1); }
  }

  var last = 0, acc = 0, running = false, visible = true;
  function loop(t) {
    var dt = Math.min(0.1, (t - last) / 1000 || 0); last = t; acc += dt; if (phase > 0) phase -= dt;
    var speed = phase > 0 ? 0.9 : 0.42;
    if (acc > speed) { acc = 0; head++; if (head >= closes.length - 1) head = N + view; }
    draw(0);
    if (visible) requestAnimationFrame(loop); else running = false;
  }
  function start() { if (!running && !reduce) { running = true; last = performance.now(); requestAnimationFrame(loop); } }
  if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; if (visible) start(); }).observe(box);
  window.addEventListener('resize', function () { size(); draw(0); });
  size();
  // first frame: show a confirmed touch so the picture makes sense even without motion
  for (k = head; k < closes.length - 1; k++) { var bb = band(k); if (closes[k] > bb[1] || closes[k] < bb[2]) { head = k; break; } }
  draw(0); start();
})();
