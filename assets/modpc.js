/* Інтерактивний прототип мода на ПК (блок #mod, вкладка «ПК»). Демо: угоди не відкриваються, дані вигадані. */
(function () {
  var root = document.getElementById('mpc');
  if (!root) return;
  var $ = function (s) { return root.querySelector(s); };
  var A = [
    ['EUR/USD OTC', 92], ['GBP/JPY OTC', 90], ['AUD/CAD OTC', 88], ['USD/CHF OTC', 85], ['EUR/JPY', 82],
    ['NZD/USD OTC', 79], ['USD/INR OTC', 76], ['AUD/JPY', 73], ['CAD/JPY OTC', 61]
  ];
  var TF = { '1': 'M1', '2': 'M2', '3': 'M3', '5': 'M5', '6': 'M10', '7': 'M15' };
  var st = { i: 0, tf: '1', style: true, clean: true, sound: false, line: null, sent: 0 };
  function grp(p) { return p >= 86 ? 'hi' : p >= 78 ? 'md' : p >= 72 ? 'lo' : 'off'; }
  var GR = ['hi', 'md', 'lo'];

  // ---- графік ----
  var cv = $('canvas'), cx = cv.getContext('2d');
  function rnd(seed) { return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }
  function candles() {
    var r = rnd(11 + st.i * 97 + (+st.tf) * 23), p = 100, out = [], vol = 0.5 + (+st.tf) * 0.18;
    for (var k = 0; k < 70; k++) {
      var o = p, c = o + (r() - 0.48 + Math.sin(k / 7 + st.i) * 0.25) * vol * 2;
      out.push([o, Math.max(o, c) + r() * vol, Math.min(o, c) - r() * vol, c]); p = c;
    }
    return out;
  }
  function draw() {
    var dpr = Math.min(2, window.devicePixelRatio || 1), w = cv.clientWidth, h = cv.clientHeight;
    if (!w || !h) return;
    cv.width = w * dpr; cv.height = h * dpr; cx.setTransform(dpr, 0, 0, dpr, 0, 0); cx.clearRect(0, 0, w, h);
    var d = candles(), lo = Infinity, hi = -Infinity;
    d.forEach(function (c) { lo = Math.min(lo, c[2]); hi = Math.max(hi, c[1]); });
    var pad = 12, y = function (v) { return pad + (hi - v) / (hi - lo) * (h - pad * 2); };
    var up = st.style ? '#3fe0a0' : '#2bb673', dn = st.style ? '#ff6b8a' : '#e5484d';
    cx.strokeStyle = st.style ? 'rgba(205,189,255,.07)' : 'rgba(255,255,255,.06)'; cx.lineWidth = 1;
    for (var g = 1; g < 5; g++) { cx.beginPath(); cx.moveTo(0, h * g / 5 + .5); cx.lineTo(w, h * g / 5 + .5); cx.stroke(); }
    var bw = (w - 58) / d.length;
    d.forEach(function (c, k) {
      var x = 6 + k * bw + bw / 2, col = c[3] >= c[0] ? up : dn;
      cx.strokeStyle = col; cx.beginPath(); cx.moveTo(x, y(c[1])); cx.lineTo(x, y(c[2])); cx.stroke();
      cx.fillStyle = col; var t = y(Math.max(c[0], c[3])), b = y(Math.min(c[0], c[3]));
      cx.fillRect(x - bw * 0.32, t, bw * 0.64, Math.max(1, b - t));
    });
    var last = d[d.length - 1][3]; st.lastPrice = last;
    if (st.line !== null) { cx.strokeStyle = '#ffc85c'; cx.setLineDash([6, 4]); cx.beginPath(); cx.moveTo(0, y(st.line) + .5); cx.lineTo(w - 50, y(st.line) + .5); cx.stroke(); cx.setLineDash([]); }
    cx.fillStyle = st.style ? '#8b5cf6' : '#5b6170'; cx.fillRect(w - 50, y(last) - 9, 50, 18);
    cx.fillStyle = '#fff'; cx.font = '600 10px Manrope, system-ui'; cx.textAlign = 'center'; cx.fillText(last.toFixed(3), w - 25, y(last) + 3.5);
  }

  // ---- шапка, HUD, тост ----
  var hudT, toastT;
  function head(hud) {
    var a = A[st.i];
    $('.pc-asset').textContent = a[0];
    var p = $('.pc-pay'); p.textContent = a[1] + '%'; p.className = 'pc-pay ' + grp(a[1]);
    root.querySelectorAll('[data-tfk]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-tfk') === st.tf); });
    if (hud) {
      var e = $('.pc-hud'); e.innerHTML = '<b>' + a[0] + '</b> <span class="' + grp(a[1]) + '">' + a[1] + '%</span>';
      e.classList.add('on'); clearTimeout(hudT); hudT = setTimeout(function () { e.classList.remove('on'); }, 1200);
    }
  }
  function toast(t) { var e = $('.pc-toast'); e.textContent = t; e.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(function () { e.classList.remove('on'); }, 1800); }
  function setAsset(i) { st.i = i; st.line = null; head(true); draw(); }

  // ↑↓ — у межах групи за виплатою, ←→ — між групами; найнижчу («червону») групу пропускають
  function inGroup(d) {
    var g = grp(A[st.i][1]), idx = [];
    A.forEach(function (a, k) { if (grp(a[1]) === g) idx.push(k); });
    var pos = idx.indexOf(st.i); setAsset(idx[(pos + d + idx.length) % idx.length]);
  }
  function group(d) {
    var g = GR.indexOf(grp(A[st.i][1])), ng = (g + d + GR.length) % GR.length;
    for (var k = 0; k < A.length; k++) if (grp(A[k][1]) === GR[ng]) { setAsset(k); return; }
  }

  // ---- звук ----
  var ac;
  function beep(f) {
    if (!st.sound) return;
    try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); var o = ac.createOscillator(), g = ac.createGain();
      o.frequency.value = f || 880; o.type = 'sine'; g.gain.setValueAtTime(0.0001, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.15, ac.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.5); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + 0.5); } catch (e) {}
  }

  // ---- картки ----
  function card(box, kind, a, html) {
    var list = $(box), el = document.createElement('button');
    el.type = 'button'; el.className = 'pc-card ' + kind; el.innerHTML = html + '<i class="x" aria-hidden="true">✕</i>';
    el.addEventListener('click', function (e) { if (e.target.classList.contains('x')) { el.remove(); return; } setAsset(a); });
    list.insertBefore(el, list.firstChild);
    while (list.children.length > 3) list.removeChild(list.lastChild);
    return el;
  }
  function send() {
    var a = A[st.i]; st.sent++;
    card('.pc-tr', 'tr', st.i, '<span class="k">📣 MoonTrader</span><span class="as">' + a[0] + ' <em class="' + grp(a[1]) + '">' + a[1] + '%</em></span><span class="lk">👍 ' + (1 + st.sent % 5) + '</span>');
    toast('Угоду надіслано команді'); beep(660);
  }
  var bi = 0;
  function bot() {
    var seq = [[2, 'PUT ↓', 'bb'], [1, 'CALL ↑', 'st'], [4, 'CALL ↑', 'bb'], [3, 'PUT ↓', 'st']], s = seq[bi++ % seq.length], a = A[s[0]];
    if (s[2] === 'bb') {
      var el = card('.pc-bot', 'y', s[0], '<span class="k">BB · ⚠ Можливий дотик</span><span class="as">' + a[0] + ' ' + s[1] + ' <em class="' + grp(a[1]) + '">' + a[1] + '%</em></span>');
      beep(880);
      setTimeout(function () { if (!el.isConnected) return; el.className = 'pc-card g'; el.querySelector('.k').textContent = 'BB · ✅ Перетин підтверджено'; beep(990); }, 3500);
    } else {
      card('.pc-bot', 'g', s[0], '<span class="k">ST+CCI · ✅ Вхід · 2 хв</span><span class="as">' + a[0] + ' ' + s[1] + ' <em class="' + grp(a[1]) + '">' + a[1] + '%</em></span>');
      beep(740);
    }
  }

  // ---- клавіші ----
  function key(k) {
    if (k === 'ArrowUp') inGroup(-1);
    else if (k === 'ArrowDown') inGroup(1);
    else if (k === 'ArrowLeft') group(-1);
    else if (k === 'ArrowRight') group(1);
    else if (TF[k]) { st.tf = k; head(false); draw(); toast('Таймфрейм ' + TF[k]); }
    else if (k === 'l' || k === 'L' || k === 'д' || k === 'Д') { st.line = st.lastPrice; draw(); toast('Горизонтальна лінія'); }
    else return false;
    var kb = root.parentNode.querySelector('.pc-keys [data-k="' + (k.length === 1 ? k.toUpperCase().replace('Д', 'L') : k) + '"]');
    if (kb) { kb.classList.add('hit'); setTimeout(function () { kb.classList.remove('hit'); }, 180); }
    return true;
  }
  root.addEventListener('keydown', function (e) { if (e.ctrlKey || e.metaKey || e.altKey) return; if (key(e.key)) e.preventDefault(); });
  root.addEventListener('mousedown', function (e) { if (!e.target.closest('button,input,label')) root.focus({ preventScroll: true }); });
  root.parentNode.querySelectorAll('.pc-keys [data-k]').forEach(function (b) { b.addEventListener('click', function () { key(b.getAttribute('data-k')); root.focus({ preventScroll: true }); }); });

  // ---- кнопки ----
  $('.pc-send').addEventListener('click', send);
  $('.pc-snd').addEventListener('click', function () {
    st.sound = !st.sound; this.textContent = st.sound ? '🔊' : '🔇'; this.setAttribute('aria-pressed', st.sound);
    var c = $('.pc-sheet input[name=sound]'); if (c) c.checked = st.sound;
    toast(st.sound ? 'Звук сигналів увімкнено' : 'Звук вимкнено'); beep(880);
  });
  $('.pc-menu').addEventListener('click', function () { var s = $('.pc-sheet'); s.hidden = !s.hidden; });
  root.querySelectorAll('.pc-sheet input').forEach(function (inp) {
    inp.addEventListener('change', function () {
      if (inp.name === 'sound') { $('.pc-snd').click(); return; }
      st[inp.name] = inp.checked; root.classList.toggle('plain', !st.style); root.classList.toggle('busy', !st.clean); draw();
    });
  });
  root.querySelectorAll('[data-tfk]').forEach(function (b) { b.addEventListener('click', function () { key(b.getAttribute('data-tfk')); }); });
  $('.pc-k').addEventListener('click', function () { var v = $('.pc-sum'); v.textContent = v.textContent === '10' ? '20' : '10'; toast('Сума × 2 одним кліком'); });
  root.querySelectorAll('.pc-trade .b,.pc-trade .s').forEach(function (b) { b.addEventListener('click', function () { toast('Це демо — угоди тут не відкриваються'); }); });
  root.querySelectorAll('.pc-h').forEach(function (h) { h.addEventListener('click', function () { var l = h.nextElementSibling; l.hidden = !l.hidden; h.setAttribute('aria-expanded', !l.hidden); }); });

  // ---- пункти під екраном ----
  document.querySelectorAll('[data-mpc]').forEach(function (b) {
    b.addEventListener('click', function () {
      var k = b.getAttribute('data-mpc');
      document.querySelectorAll('[data-mpc]').forEach(function (x) { x.classList.toggle('on', x === b); });
      if (k === 'keys') { group(1); }
      if (k === 'send') send();
      if (k === 'bot') bot();
      if (k === 'ind') toast('Volume Profile з POC і імбаланс вмикаються кнопкою «Індикатори моду» над графіком');
      if (k === 'stats') { var s = $('.pc-stats'); s.classList.remove('flash'); void s.offsetWidth; s.classList.add('flash'); }
      root.focus({ preventScroll: true });
    });
  });

  // ---- запуск при першому показі вкладки ----
  var started = false;
  function start() { if (started) return; started = true; head(false); draw(); setTimeout(bot, 900); setInterval(function () { if (!root.offsetParent) return; bot(); }, 10000); }
  document.querySelectorAll('.mtabs button').forEach(function (b) { b.addEventListener('click', function () { if (b.getAttribute('data-v') === 'pc') setTimeout(function () { start(); draw(); }, 30); }); });
  addEventListener('resize', draw);
  head(false);
})();
