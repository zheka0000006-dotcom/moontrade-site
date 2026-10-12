/* Інтерактивний прототип мода на телефоні (блок #mod). Демо: угоди не відкриваються, дані вигадані. */
(function () {
  var root = document.getElementById('mp');
  if (!root) return;
  var $ = function (s) { return root.querySelector(s); };
  var A = [ // актив, виплата
    ['EUR/USD OTC', 92], ['GBP/JPY OTC', 90], ['AUD/CAD OTC', 88], ['USD/CHF OTC', 85],
    ['EUR/JPY', 82], ['NZD/USD OTC', 79], ['USD/INR OTC', 74], ['CAD/JPY OTC', 61]
  ];
  var TF = ['M1', 'M2', 'M3', 'M5', 'M15'];
  var st = { i: 0, tf: 0, style: true, clean: true, hud: true, line: null, sent: 0 };
  function grp(p) { return p >= 86 ? 'hi' : p >= 78 ? 'md' : p >= 72 ? 'lo' : 'off'; }

  // ---- графік ----
  var cv = $('.mp-chart canvas'), cx = cv.getContext('2d');
  function rnd(seed) { return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }
  function candles() {
    var r = rnd(7 + st.i * 131 + st.tf * 17), p = 100, out = [];
    var vol = 0.6 + st.tf * 0.25;
    for (var k = 0; k < 46; k++) {
      var o = p, c = o + (r() - 0.48 + Math.sin(k / 6 + st.i) * 0.25) * vol * 2;
      var h = Math.max(o, c) + r() * vol, l = Math.min(o, c) - r() * vol;
      out.push([o, h, l, c]); p = c;
    }
    return out;
  }
  function draw() {
    var dpr = Math.min(2, window.devicePixelRatio || 1), w = cv.clientWidth, h = cv.clientHeight;
    if (!w || !h) return;
    cv.width = w * dpr; cv.height = h * dpr; cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx.clearRect(0, 0, w, h);
    var d = candles(), lo = Infinity, hi = -Infinity;
    d.forEach(function (c) { lo = Math.min(lo, c[2]); hi = Math.max(hi, c[1]); });
    var pad = 14, y = function (v) { return pad + (hi - v) / (hi - lo) * (h - pad * 2); };
    var up = st.style ? '#3fe0a0' : '#2bb673', dn = st.style ? '#ff6b8a' : '#e5484d';
    cx.strokeStyle = st.style ? 'rgba(205,189,255,.07)' : 'rgba(255,255,255,.06)'; cx.lineWidth = 1;
    for (var g = 1; g < 5; g++) { cx.beginPath(); cx.moveTo(0, h * g / 5 + .5); cx.lineTo(w, h * g / 5 + .5); cx.stroke(); }
    var x0 = 44, bw = (w - x0 - 8) / d.length;
    d.forEach(function (c, k) {
      var x = x0 + k * bw + bw / 2, col = c[3] >= c[0] ? up : dn;
      cx.strokeStyle = col; cx.beginPath(); cx.moveTo(x, y(c[1])); cx.lineTo(x, y(c[2])); cx.stroke();
      cx.fillStyle = col; var t = y(Math.max(c[0], c[3])), b = y(Math.min(c[0], c[3]));
      cx.fillRect(x - bw * 0.32, t, bw * 0.64, Math.max(1, b - t));
    });
    var last = d[d.length - 1][3];
    if (st.line !== null) {
      cx.strokeStyle = '#ffc85c'; cx.setLineDash([5, 4]); cx.beginPath(); cx.moveTo(x0, y(st.line) + .5); cx.lineTo(w, y(st.line) + .5); cx.stroke(); cx.setLineDash([]);
    }
    cx.fillStyle = st.style ? '#8b5cf6' : '#5b6170';
    cx.fillRect(w - 46, y(last) - 9, 46, 18);
    cx.fillStyle = '#fff'; cx.font = '600 10px Manrope, system-ui'; cx.textAlign = 'center';
    cx.fillText(last.toFixed(2), w - 23, y(last) + 3.5);
    st.lastPrice = last;
  }

  // ---- шапка, HUD ----
  var hudT;
  function head(showHud) {
    var a = A[st.i];
    $('.mp-asset').textContent = a[0];
    var p = $('.mp-pay'); p.textContent = a[1] + '%'; p.className = 'mp-pay ' + grp(a[1]);
    $('.mp-tf').textContent = TF[st.tf];
    if (showHud && st.hud) {
      var hd = $('.mp-hud'); hd.innerHTML = '<b>' + a[0] + '</b><span class="' + grp(a[1]) + '">' + a[1] + '%</span>';
      hd.classList.add('on'); clearTimeout(hudT); hudT = setTimeout(function () { hd.classList.remove('on'); }, 1300);
    }
  }
  function go(d) { // стрілки пропускають «червону» групу
    var n = A.length, i = st.i;
    for (var k = 0; k < n; k++) { i = (i + d + n) % n; if (grp(A[i][1]) !== 'off') break; }
    st.i = i; st.line = null; head(true); draw();
  }

  // ---- тости, картки ----
  var toastT;
  function toast(t) { var e = $('.mp-toast'); e.textContent = t; e.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(function () { e.classList.remove('on'); }, 1800); }
  function card(kind, a, extra) {
    var list = $('.mp-cards'), el = document.createElement('button');
    el.type = 'button'; el.className = 'mp-card ' + kind;
    el.innerHTML = extra;
    el.addEventListener('click', function () { st.i = a; st.line = null; head(true); draw(); });
    list.insertBefore(el, list.firstChild);
    while (list.children.length > 2) list.removeChild(list.lastChild);
    $('.mp-sig b').textContent = list.children.length;
    return el;
  }
  function closeAll() { root.querySelectorAll('.mp-pop,.mp-sheet').forEach(function (e) { e.hidden = true; }); }

  // ---- кнопки панелі ----
  $('[data-a=up]').addEventListener('click', function () { closeAll(); go(-1); });
  $('[data-a=down]').addEventListener('click', function () { closeAll(); go(1); });
  $('[data-a=more]').addEventListener('click', function () { var p = $('.mp-pop'), o = p.hidden; closeAll(); p.hidden = !o; });
  $('[data-a=send]').addEventListener('click', function () {
    closeAll(); var a = A[st.i]; st.sent++;
    card('tr', st.i, '<span class="k">📣 MoonTrader</span><span class="as">' + a[0] + ' <em class="' + grp(a[1]) + '">' + a[1] + '%</em></span><span class="lk">👍 ' + (2 + st.sent % 4) + '</span>');
    toast('Угоду надіслано команді');
  });
  $('[data-a=menu]').addEventListener('click', function () { var s = $('.mp-sheet'), o = s.hidden; closeAll(); s.hidden = !o; });
  root.querySelectorAll('.mp-pop [data-tf]').forEach(function (b) {
    b.addEventListener('click', function () {
      st.tf = +b.getAttribute('data-tf'); root.querySelectorAll('.mp-pop [data-tf]').forEach(function (x) { x.setAttribute('aria-pressed', x === b); });
      head(false); draw();
    });
  });
  $('.mp-pop [data-draw]').addEventListener('click', function () { st.line = st.lastPrice; draw(); closeAll(); toast('Горизонтальна лінія на ціні'); });
  root.querySelectorAll('.mp-sheet input').forEach(function (inp) {
    inp.addEventListener('change', function () {
      st[inp.name] = inp.checked;
      root.classList.toggle('plain', !st.style); root.classList.toggle('busy', !st.clean); draw();
    });
  });
  $('.mp-sig').addEventListener('click', function () { var l = $('.mp-cards'); l.hidden = !l.hidden; this.setAttribute('aria-expanded', !l.hidden); });
  root.querySelectorAll('.mp-trade button').forEach(function (b) { b.addEventListener('click', function () { toast('Це демо — угоди тут не відкриваються'); }); });
  $('.mp-chart').addEventListener('click', function (e) { if (!e.target.closest('.mp-panel,.mp-pop,.mp-sheet')) closeAll(); });

  // ---- сповіщення бота (демо) ----
  var botT, bi = 0;
  function bot() {
    var seq = [[2, 'PUT ↓', 'bb'], [1, 'CALL ↑', 'st'], [3, 'CALL ↑', 'bb']], s = seq[bi++ % seq.length], a = A[s[0]];
    if (s[2] === 'bb') {
      var el = card('y', s[0], '<span class="k">BB · ⚠ Можливий дотик</span><span class="as">' + a[0] + ' ' + s[1] + ' <em class="' + grp(a[1]) + '">' + a[1] + '%</em></span>');
      setTimeout(function () {
        if (!el.isConnected) return; el.className = 'mp-card g';
        el.querySelector('.k').textContent = 'BB · ✅ Перетин підтверджено';
      }, 3500);
    } else {
      card('g', s[0], '<span class="k">ST+CCI · ✅ Вхід · 2 хв</span><span class="as">' + a[0] + ' ' + s[1] + ' <em class="' + grp(a[1]) + '">' + a[1] + '%</em></span>');
    }
  }
  function loop() { bot(); botT = setTimeout(loop, 9000); }

  // ---- пункти списку праворуч запускають демо ----
  document.querySelectorAll('[data-mp]').forEach(function (b) {
    b.addEventListener('click', function () {
      var k = b.getAttribute('data-mp');
      document.querySelectorAll('[data-mp]').forEach(function (x) { x.classList.toggle('on', x === b); });
      if (k === 'arrows') go(1);
      if (k === 'more') { closeAll(); $('.mp-pop').hidden = false; }
      if (k === 'send') $('[data-a=send]').click();
      if (k === 'bot') { $('.mp-cards').hidden = false; bot(); }
      if (k === 'menu') { closeAll(); $('.mp-sheet').hidden = false; }
      var ph = $('.mp-screen'); ph.classList.remove('ping'); void ph.offsetWidth; ph.classList.add('ping');
      if (innerWidth < 900) root.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  });

  // ---- вкладки Телефон / ПК ----
  document.querySelectorAll('.mtabs button').forEach(function (b) {
    b.addEventListener('click', function () {
      var v = b.getAttribute('data-v');
      document.querySelectorAll('.mtabs button').forEach(function (x) { x.setAttribute('aria-selected', x === b); });
      document.getElementById('mod-ph').hidden = v !== 'ph';
      document.getElementById('mod-pc').hidden = v !== 'pc';
      if (v === 'ph') draw();
    });
  });

  head(false); draw();
  addEventListener('resize', draw);
  if ('IntersectionObserver' in window) {
    var started = false;
    new IntersectionObserver(function (e) { if (e[0].isIntersecting && !started) { started = true; botT = setTimeout(loop, 1500); } }).observe(root);
  } else { loop(); }
})();
